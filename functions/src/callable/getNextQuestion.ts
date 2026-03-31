/**
 * getNextQuestion — Returns the next adaptive question for the patient.
 *
 * V2 Algorithm:
 *   1. Fetch the last 5 results from the denormalized `last5Results` field on user doc
 *   2. Run computeNextDifficultyComposite() to get the new tier + explanation
 *      (composite of accuracy 60%, latency 25%, consistency 15%)
 *   3. Update session difficultyLevel in Firestore
 *   4. Build patientContext from session state and domain accuracy history
 *   5. Call generateQuestion() to get a fresh LLM-generated question
 *      (falls back to static bank if Claude API is unavailable)
 */

import * as functions from 'firebase-functions';
import { db, getSession, getUser } from '../utils/firestore';
import { computeNextDifficultyComposite } from '../engines/questionEngine';
import { generateQuestion, PatientContext } from './generateQuestion';
import { QuestionCategory } from '../models/types';

const TOTAL_QUESTIONS_PER_SESSION = 10;

// Rotate through domains across a session to ensure coverage of all four
// cognitive domains (orientation, recall, attention, language)
const DOMAIN_ROTATION: QuestionCategory[] = [
  'orientation',
  'short_term_recall',
  'attention_memory',
  'language_naming',
];

export const getNextQuestion = functions.https.onCall(
  async (data: { userId: string; sessionId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { userId, sessionId } = data;

    const [user, session] = await Promise.all([
      getUser(userId),
      getSession(userId, sessionId),
    ]);

    if (!user) throw new functions.https.HttpsError('not-found', 'User not found.');
    if (!session) throw new functions.https.HttpsError('not-found', 'Session not found.');

    // Use denormalized last5Results from user doc (avoids collection group query)
    const last5 = user.last5Results ?? [];

    // Run composite adaptive algorithm (accuracy + latency + consistency)
    const { newDifficulty, explanation } = computeNextDifficultyComposite(
      last5,
      session.difficultyLevel
    );

    const questionIndex = session.totalQuestions; // 0-indexed: 0=Q1, 1=Q2, ... 9=Q10

    // ── Step 1: Try the pre-generated queue (fast path) ────────────────────
    // startSession pre-generates all 10 questions in background.
    // If the queue slot for this question is ready, serve it immediately.
    const queuedQuestion = session.questionQueue?.[questionIndex];
    if (queuedQuestion) {
      // Difficulty may have shifted since pre-generation — update tier in session
      // but serve the pre-generated question as-is (tier recorded on question)
      await db()
        .collection('users')
        .doc(userId)
        .collection('sessions')
        .doc(sessionId)
        .update({ difficultyLevel: newDifficulty });

      functions.logger.info(
        `getNextQuestion: serving Q${questionIndex + 1} from pre-generated queue (source=${queuedQuestion.source})`
      );

      return {
        question: queuedQuestion,
        difficultyLevel: newDifficulty,
        difficultyExplanation: explanation,
        questionNumber: questionIndex + 1,
        totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
      };
    }

    // ── Step 2: Queue not ready — generate on-demand (slow path fallback) ──
    functions.logger.info(
      `getNextQuestion: Q${questionIndex + 1} not in queue yet, generating on-demand`
    );

    // Update session difficulty in Firestore
    await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .update({ difficultyLevel: newDifficulty });

    const domain = DOMAIN_ROTATION[questionIndex % DOMAIN_ROTATION.length];
    const patientContext: PatientContext = {
      recentDomainAccuracy: {},
      sessionQuestionsAsked: session.totalQuestions,
    };

    const question = await generateQuestionInternal(
      sessionId,
      domain,
      newDifficulty,
      patientContext,
      session.answeredQuestionIds
    );

    return {
      question,
      difficultyLevel: newDifficulty,
      difficultyExplanation: explanation,
      questionNumber: questionIndex + 1,
      totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
    };
  }
);

// Re-export generateQuestion so it's registered in index.ts
export { generateQuestion };

// Internal helper to avoid double-wrapping callable context
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { getQuestionsByTier } from '../utils/firestore';
import { DifficultyTier, QuestionDoc } from '../models/types';
import { buildQuestionPrompt } from '../engines/questionPreGenerator';

function validateLLMResponse(obj: unknown): obj is { text: string; options: string[]; correctAnswer: string } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.text !== 'string' || o.text.length < 10) return false;
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (o.options.some((opt: unknown) => typeof opt !== 'string' || (opt as string).length === 0)) return false;
  if (typeof o.correctAnswer !== 'string') return false;
  if (!(o.options as string[]).includes(o.correctAnswer as string)) return false;
  return true;
}

async function generateQuestionInternal(
  sessionId: string,
  domain: QuestionCategory,
  tier: DifficultyTier,
  patientContext: PatientContext,
  excludeIds: string[]
): Promise<QuestionDoc> {
  // Include sessionId so each session gets a unique cache slot — prevents cross-session repetition
  const keyPayload = `${sessionId}|${domain}|${tier}|${patientContext.sessionQuestionsAsked}`;
  const key = crypto.createHash('sha256').update(keyPayload).digest('hex').slice(0, 16);
  const cacheRef = db().collection('generatedQuestions').doc(key);

  // Cache check (24h)
  const cached = await cacheRef.get();
  if (cached.exists) {
    const cachedData = cached.data() as QuestionDoc & { generatedAt: number };
    if (Date.now() - cachedData.generatedAt < 24 * 60 * 60 * 1000 && !excludeIds.includes(cachedData.questionId)) {
      return cachedData;
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildQuestionPrompt(domain, tier, patientContext.sessionQuestionsAsked) }],
      });

      const rawText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed: unknown = JSON.parse(jsonText);

      if (validateLLMResponse(parsed)) {
        const questionId = `gen_${key}_${Date.now()}`;
        const now = Date.now();
        const questionDoc: QuestionDoc = {
          questionId,
          text: parsed.text,
          options: parsed.options as [string, string, string, string],
          correctAnswer: parsed.correctAnswer,
          difficultyTier: tier,
          category: domain,
          source: 'ai_generated',
          generatedAt: now,
        };
        await cacheRef.set({ ...questionDoc, generatedAt: now });
        return questionDoc;
      }
      functions.logger.warn('getNextQuestion: LLM response failed validation', { rawText });
    } catch (err) {
      functions.logger.error('getNextQuestion: Claude API error, falling back to static bank', err);
    }
  }

  // Fallback to static bank — pass domain to get domain-appropriate questions
  const available = await getQuestionsByTier(tier, excludeIds, domain);
  if (available.length > 0) {
    const q = available[Math.floor(Math.random() * available.length)];
    return { ...q, source: 'static_bank' };
  }

  const fallback = await getQuestionsByTier(tier === 1 ? 2 : 1, excludeIds, domain);
  if (fallback.length > 0) {
    const q = fallback[Math.floor(Math.random() * fallback.length)];
    return { ...q, source: 'static_bank' };
  }

  throw new functions.https.HttpsError('resource-exhausted', 'No more available questions. Please end the session.');
}
