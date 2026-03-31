/**
 * refreshQuestionPool — Generates a fresh set of AI questions across all
 * difficulty tiers and cognitive domains for the clinician dashboard.
 *
 * Generates 1 question per tier (1, 2, 3) × domain (4) = 12 questions in parallel.
 * All questions are stored in the `generatedQuestions` collection so
 * getQuestionBank can find them.
 *
 * Called automatically by the QuestionsTab when no AI questions exist yet.
 * Can also be called manually to refresh the pool.
 */

import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { db } from '../utils/firestore';
import { DifficultyTier, QuestionCategory, QuestionDoc } from '../models/types';
import { buildQuestionPrompt } from '../engines/questionPreGenerator';

const ALL_TIERS: DifficultyTier[] = [1, 2, 3];
const ALL_DOMAINS: QuestionCategory[] = [
  'orientation',
  'short_term_recall',
  'attention_memory',
  'language_naming',
];

function validateLLMResponse(
  obj: unknown
): obj is { text: string; options: string[]; correctAnswer: string } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.text !== 'string' || o.text.length < 10) return false;
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (o.options.some((opt: unknown) => typeof opt !== 'string')) return false;
  if (typeof o.correctAnswer !== 'string') return false;
  if (!(o.options as string[]).includes(o.correctAnswer)) return false;
  return true;
}

async function generateOne(
  anthropic: Anthropic,
  domain: QuestionCategory,
  tier: DifficultyTier
): Promise<QuestionDoc | null> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: buildQuestionPrompt(domain, tier, 0) }],
    });

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed: unknown = JSON.parse(jsonText);

    if (!validateLLMResponse(parsed)) return null;

    const hash = crypto
      .createHash('sha256')
      .update(`pool|${domain}|${tier}|${parsed.text}|${Date.now()}`)
      .digest('hex')
      .slice(0, 16);

    const now = Date.now();
    return {
      questionId: `pool_${hash}`,
      text: parsed.text,
      options: parsed.options as [string, string, string, string],
      correctAnswer: parsed.correctAnswer,
      difficultyTier: tier,
      category: domain,
      source: 'ai_generated',
      generatedAt: now,
    };
  } catch {
    return null;
  }
}

export const refreshQuestionPool = functions.https.onCall(
  async (_data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'ANTHROPIC_API_KEY is not configured.'
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Generate 1 question per tier × domain in parallel (12 total)
    const tasks: Array<{ domain: QuestionCategory; tier: DifficultyTier }> = [];
    for (const tier of ALL_TIERS) {
      for (const domain of ALL_DOMAINS) {
        tasks.push({ domain, tier });
      }
    }

    const results = await Promise.all(
      tasks.map(({ domain, tier }) => generateOne(anthropic, domain, tier))
    );

    const questions = results.filter((q): q is QuestionDoc => q !== null);

    // Batch write to generatedQuestions collection
    if (questions.length > 0) {
      const batch = db().batch();
      for (const q of questions) {
        batch.set(db().collection('generatedQuestions').doc(q.questionId), q);
      }
      await batch.commit();
    }

    functions.logger.info(
      `refreshQuestionPool: generated ${questions.length}/${tasks.length} AI questions`
    );

    return { generated: questions.length };
  }
);
