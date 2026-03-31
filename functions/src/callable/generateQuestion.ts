/**
 * generateQuestion.ts
 *
 * Cloud Function (callable) that generates a dementia-assessment question
 * at runtime using the Anthropic Claude API. This is the V2 replacement for
 * the static question bank approach used in V1.
 *
 * Academic rationale:
 *   Intelligent Tutoring Systems (Anderson et al., 1995; VanLehn, 2011) define
 *   content adaptation as generating items based on the learner's current
 *   knowledge state. A fixed bank is not adaptive — it repeats regardless of
 *   what the patient has already seen. LLM-parameterised generation ensures
 *   every session provides fresh, contextually appropriate content.
 *
 *   The black-box concern (Rudin, 2019) does NOT apply here: the LLM is used
 *   only for content production, not for clinical decisions. Difficulty tier,
 *   domain selection, and the alert/escalation logic remain entirely rule-based
 *   and transparent.
 *
 * Architecture:
 *   1. Build a structured prompt from { domain, tier, patientContext }
 *   2. Call Claude API (claude-sonnet-4-6, latest model)
 *   3. Parse and validate the JSON response
 *   4. Cache in Firestore /generatedQuestions/{hash} (prevents re-generation
 *      of identical parameterisation within 24 hours)
 *   5. Return a QuestionDoc in the same shape used throughout the system
 *   6. On any Claude API error, fall back to static bank (fail-safe)
 *
 * Environment variable required:
 *   ANTHROPIC_API_KEY — set via Firebase Functions config or Secret Manager
 */

import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { db, getQuestionsByTier } from '../utils/firestore';
import { QuestionCategory, DifficultyTier, QuestionDoc } from '../models/types';

// ── Patient context passed by the caller ─────────────────────────────────────

export interface PatientContext {
  recentDomainAccuracy: Partial<Record<QuestionCategory, number>>; // 0–1 per domain
  sessionQuestionsAsked: number;    // how many questions served this session
  coveredTopics?: string[];         // brief descriptors of already-covered content
}

export interface GenerateQuestionInput {
  userId: string;
  sessionId: string;
  domain: QuestionCategory;
  tier: DifficultyTier;
  patientContext: PatientContext;
  excludeQuestionIds?: string[];    // already answered in this session
}

// ── Domain display labels for the prompt ─────────────────────────────────────

const DOMAIN_LABELS: Record<QuestionCategory, string> = {
  orientation: 'Orientation (time, date, day of week, season)',
  short_term_recall: 'Short-Term Recall (remember and retrieve items shown earlier)',
  attention_memory: 'Attention & Working Memory (sequences, counting, arithmetic)',
  language_naming: 'Language & Naming (word retrieval, object description, semantic categories)',
};

const TIER_LABELS: Record<DifficultyTier, string> = {
  1: 'Tier 1 (Easy) — single-step recall, common vocabulary, no calculation',
  2: 'Tier 2 (Medium) — mild inference, simple comparison, basic arithmetic',
  3: 'Tier 3 (Hard) — multi-step reasoning, working memory load, less common vocabulary',
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(domain: QuestionCategory, tier: DifficultyTier, context: PatientContext): string {
  const domainAcc = context.recentDomainAccuracy[domain];
  const accNote = domainAcc !== undefined
    ? `The patient's recent accuracy in this domain is ${Math.round(domainAcc * 100)}%.`
    : 'No prior accuracy data for this domain in this session.';

  const topicsNote = context.coveredTopics && context.coveredTopics.length > 0
    ? `Topics already covered this session (do NOT repeat): ${context.coveredTopics.join(', ')}.`
    : '';

  return `You are generating a multiple-choice cognitive assessment question for an elderly patient being assessed for dementia. The question will be used in a clinical monitoring application (CareMind AI) and must be:

- Respectful, non-threatening, and appropriate for older adults
- Free of cultural assumptions or ambiguous references
- Clinically grounded in standard dementia assessment (MMSE, CST protocols)

Domain: ${DOMAIN_LABELS[domain]}
Difficulty: ${TIER_LABELS[tier]}

Patient context:
- ${accNote}
${topicsNote ? `- ${topicsNote}` : ''}
- Question ${context.sessionQuestionsAsked + 1} of 10 in the current session

Generate exactly ONE question. Return ONLY valid JSON — no markdown, no explanation, no extra text.

JSON schema:
{
  "text": "<the question text>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctAnswer": "<must exactly match one of the options>",
  "rationale": "<one sentence explaining why this tests the specified domain and tier>"
}

Requirements:
- options array must have exactly 4 strings
- correctAnswer must be an exact copy of one of the options
- For Short-Term Recall questions, phrase the stem as: "At the start of this session you were shown: [ITEM]. [question about that item]"
- Distractors must be plausible but unambiguously wrong
- Question text must be a complete sentence ending with a question mark`;
}

// ── Cache key ─────────────────────────────────────────────────────────────────

function cacheKey(domain: QuestionCategory, tier: DifficultyTier, context: PatientContext): string {
  const payload = `${domain}|${tier}|${JSON.stringify(context.recentDomainAccuracy)}|${context.sessionQuestionsAsked}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

// ── Validate LLM response shape ───────────────────────────────────────────────

function validateLLMResponse(obj: unknown): obj is { text: string; options: string[]; correctAnswer: string } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.text !== 'string' || o.text.length < 10) return false;
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (o.options.some((opt) => typeof opt !== 'string' || opt.length === 0)) return false;
  if (typeof o.correctAnswer !== 'string') return false;
  if (!o.options.includes(o.correctAnswer)) return false;
  return true;
}

// ── Main callable function ────────────────────────────────────────────────────

export const generateQuestion = functions.https.onCall(
  async (data: GenerateQuestionInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { domain, tier, patientContext, excludeQuestionIds = [] } = data;

    // Check cache first (24-hour window to prevent identical regeneration)
    const key = cacheKey(domain, tier, patientContext);
    const cacheRef = db().collection('generatedQuestions').doc(key);
    const cached = await cacheRef.get();

    if (cached.exists) {
      const cachedData = cached.data() as QuestionDoc & { generatedAt: number };
      const AGE_MS = Date.now() - cachedData.generatedAt;
      if (AGE_MS < 24 * 60 * 60 * 1000 && !excludeQuestionIds.includes(cachedData.questionId)) {
        return cachedData;
      }
    }

    // Try Claude API generation
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      try {
        const anthropic = new Anthropic({ apiKey });
        const prompt = buildPrompt(domain, tier, patientContext);

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        });

        const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

        // Strip markdown code fences if present
        const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed: unknown = JSON.parse(jsonText);

        if (validateLLMResponse(parsed)) {
          const questionId = `gen_${key}_${Date.now()}`;
          const questionDoc: QuestionDoc = {
            questionId,
            text: parsed.text,
            options: parsed.options as [string, string, string, string],
            correctAnswer: parsed.correctAnswer,
            difficultyTier: tier,
            category: domain,
          };

          // Cache for 24 hours
          await cacheRef.set({ ...questionDoc, generatedAt: Date.now() });
          return questionDoc;
        }

        functions.logger.warn('generateQuestion: LLM response failed validation', { rawText });
      } catch (err) {
        functions.logger.error('generateQuestion: Claude API error, falling back to static bank', err);
      }
    } else {
      functions.logger.warn('generateQuestion: ANTHROPIC_API_KEY not set, using static bank');
    }

    // Fallback: static question bank
    const available = await getQuestionsByTier(tier, excludeQuestionIds);
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Last resort: any tier
    const any = await getQuestionsByTier(tier === 1 ? 2 : 1, excludeQuestionIds);
    if (any.length > 0) {
      return any[Math.floor(Math.random() * any.length)];
    }

    throw new functions.https.HttpsError('resource-exhausted', 'No questions available.');
  }
);
