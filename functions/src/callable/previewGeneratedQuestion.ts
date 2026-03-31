/**
 * previewGeneratedQuestion — On-demand question generation for the developer/thesis view.
 *
 * Called by the "Generate Now" button in the clinician dashboard Questions tab.
 * Forces a fresh Claude API call (bypasses cache) to demonstrate live generation.
 * Returns the question plus metadata about how it was generated.
 *
 * This function is explicitly for proof-of-concept demonstration in the thesis prototype.
 */

import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import { db, getQuestionsByTier } from '../utils/firestore';
import { QuestionCategory, DifficultyTier, QuestionDoc } from '../models/types';

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

export interface PreviewInput {
  domain: QuestionCategory;
  tier: DifficultyTier;
}

export interface PreviewOutput {
  question: QuestionDoc;
  source: 'ai_generated' | 'static_bank';
  generationMs?: number;     // how long Claude took to respond
  promptUsed?: string;       // the exact prompt sent to Claude (for transparency)
  rationale?: string;        // Claude's rationale for the question
  staticComparison?: QuestionDoc; // a static question from same domain+tier for comparison
}

function buildPrompt(domain: QuestionCategory, tier: DifficultyTier): string {
  return `You are generating a multiple-choice cognitive assessment question for an elderly patient being assessed for dementia. The question will be used in a clinical monitoring application (CareMind AI) and must be:

- Respectful, non-threatening, and appropriate for older adults
- Free of cultural assumptions or ambiguous references
- Clinically grounded in standard dementia assessment (MMSE, CST protocols)

Domain: ${DOMAIN_LABELS[domain]}
Difficulty: ${TIER_LABELS[tier]}

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

function validateLLMResponse(
  obj: unknown
): obj is { text: string; options: string[]; correctAnswer: string; rationale?: string } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.text !== 'string' || o.text.length < 10) return false;
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (o.options.some((opt: unknown) => typeof opt !== 'string' || (opt as string).length === 0)) return false;
  if (typeof o.correctAnswer !== 'string') return false;
  if (!(o.options as string[]).includes(o.correctAnswer as string)) return false;
  return true;
}

export const previewGeneratedQuestion = functions.https.onCall(
  async (data: PreviewInput, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { domain, tier } = data;
    const prompt = buildPrompt(domain, tier);

    // Always fetch a static comparison question regardless of source
    const staticPool = await getQuestionsByTier(tier);
    const staticComparison = staticPool.length > 0
      ? { ...staticPool[Math.floor(Math.random() * staticPool.length)], source: 'static_bank' as const }
      : undefined;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No API key — return static with note
      if (!staticComparison) {
        throw new functions.https.HttpsError('not-found', 'No questions available.');
      }
      return {
        question: staticComparison,
        source: 'static_bank',
        staticComparison,
      } as PreviewOutput;
    }

    try {
      const anthropic = new Anthropic({ apiKey });
      const startMs = Date.now();

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const generationMs = Date.now() - startMs;
      const rawText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed: unknown = JSON.parse(jsonText);

      if (validateLLMResponse(parsed)) {
        const questionDoc: QuestionDoc = {
          questionId: `preview_${domain}_${tier}_${Date.now()}`,
          text: parsed.text,
          options: parsed.options as [string, string, string, string],
          correctAnswer: parsed.correctAnswer,
          difficultyTier: tier,
          category: domain,
          source: 'ai_generated',
          generatedAt: Date.now(),
        };

        // Log to generatedQuestions collection for history
        await db().collection('generatedQuestions').add({
          ...questionDoc,
          previewMode: true,
        });

        return {
          question: questionDoc,
          source: 'ai_generated',
          generationMs,
          promptUsed: prompt,
          rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
          staticComparison,
        } as PreviewOutput;
      }

      throw new Error(`LLM response failed validation: ${rawText}`);
    } catch (err) {
      functions.logger.error('previewGeneratedQuestion: Claude API error', err);

      // Return static as fallback
      if (staticComparison) {
        return {
          question: staticComparison,
          source: 'static_bank',
          staticComparison,
        } as PreviewOutput;
      }
      throw new functions.https.HttpsError('internal', 'Question generation failed.');
    }
  }
);
