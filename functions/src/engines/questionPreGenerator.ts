/**
 * questionPreGenerator.ts
 *
 * Generates a full 10-question session queue at session start using Claude API.
 * Questions are stored in the session document as `questionQueue` and served
 * immediately by getNextQuestion — no Claude latency during the session.
 *
 * Called as fire-and-forget from startSession (does not block the session start).
 * getNextQuestion checks the queue first; falls back to on-demand generation
 * if a slot isn't ready yet (graceful degradation).
 *
 * Domain distribution across 10 questions:
 *   Q1:  Orientation    Tier N
 *   Q2:  Recall         Tier N
 *   Q3:  Attention      Tier N
 *   Q4:  Language       Tier N
 *   Q5:  Orientation    Tier N   (second pass — may adapt if scores come in)
 *   Q6:  Recall         Tier N
 *   Q7:  Attention      Tier N
 *   Q8:  Language       Tier N
 *   Q9:  Orientation    Tier N
 *   Q10: Attention      Tier N
 *
 * This ensures all four cognitive domains are represented every session,
 * consistent with standard multi-domain dementia batteries.
 */

import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { db, getQuestionsByTier } from '../utils/firestore';
import { DifficultyTier, QuestionCategory, QuestionDoc } from '../models/types';

const DOMAIN_SEQUENCE: QuestionCategory[] = [
  'orientation',
  'short_term_recall',
  'attention_memory',
  'language_naming',
  'orientation',
  'short_term_recall',
  'attention_memory',
  'language_naming',
  'orientation',
  'attention_memory',
];

const TIER_GUIDANCE: Record<DifficultyTier, string> = {
  1: `Tier 1 — Easy. Answerable in under 5 seconds by a cognitively intact older adult. Single-step recall or recognition only. Concrete, unambiguous stimuli. Example difficulty: identifying the current season, naming a common large object, or recalling one item shown 30 seconds ago.`,
  2: `Tier 2 — Medium. Requires ~10 seconds of cognitive effort. Two-step retrieval, mild inference, or simple arithmetic. Example difficulty: identifying month AND year together, recalling two details from a short scenario, or counting backward by 2s from 20.`,
  3: `Tier 3 — Hard. Requires 15+ seconds and working memory load. Multi-step reasoning, semantic retrieval under competition, or complex arithmetic. Example difficulty: recalling three details after a distracting interval, naming items from a specific subcategory, or serial arithmetic with non-standard numbers.`,
};

const DOMAIN_GUIDANCE: Record<QuestionCategory, string> = {
  orientation: `ORIENTATION — Assesses awareness of time, place, and situational context.
Rotate across these angles — do NOT always ask about the year or season:
  • Time: specific year, month, day of week, approximate time of day, current season
  • Place: type of building, city, floor or room type, geographic region
  • Situational: what type of activity the patient is currently doing, why they are here
Each question should probe a DIFFERENT temporal or spatial reference.`,

  short_term_recall: `SHORT-TERM RECALL — Assesses encoding and retrieval of new information after a brief delay.
Present a novel piece of information in the question stem, then ask for one specific detail.
Vary the type of information each time:
  • A short fictional address (e.g. "42 Elm Street, Apartment 3B")
  • A person's name + one attribute (e.g. "Maria, a retired teacher from Lisbon")
  • A brief event (e.g. "A library book is due back on Thursday")
  • An object + colour + location (e.g. "A blue umbrella near the front door")
The three distractors must come from the SAME semantic category as the correct answer.`,

  attention_memory: `ATTENTION & WORKING MEMORY — Assesses holding and manipulating information in mind.
Use tasks requiring active mental work, not passive recall:
  • Digit span forward or backward (e.g. "What is 7-4-2 backwards?")
  • Counting under a rule (e.g. "Which number comes third if you count by 3s starting from 6?")
  • Sequential arithmetic (e.g. "Start at 24, subtract 3 twice — what do you get?")
  • Letter-number sequencing (e.g. "Put A2 B1 C3 in number order — which letter is first?")
AVOID the standard "count back from 100 by 7s". Use creative, novel variants each time.`,

  language_naming: `LANGUAGE & NAMING — Assesses word retrieval, semantic knowledge, and verbal expression.
Rotate across these task types:
  • Object naming from a functional description (e.g. "What do you call the device that measures temperature?")
  • Semantic category membership (e.g. "Which of these is NOT a type of tree?")
  • Verbal analogy (e.g. "Finger is to hand as toe is to ___?")
  • Category probe (e.g. "Which TWO of these belong in a kitchen?")
  • Word definition (e.g. "Which word means 'to say something is not true'?")
Distractors must come from the same broad semantic field as the correct answer.`,
};

export function buildQuestionPrompt(domain: QuestionCategory, tier: DifficultyTier, questionIndex: number): string {
  return `You are a clinical neuropsychologist creating a novel multiple-choice cognitive assessment question for CareMind AI, a dementia monitoring system used in real clinical settings. The patient is an older adult with possible early-to-moderate dementia.

━━ COGNITIVE DOMAIN ━━
${DOMAIN_GUIDANCE[domain]}

━━ DIFFICULTY ━━
${TIER_GUIDANCE[tier]}

━━ REQUIREMENTS ━━
1. NOVEL — Do NOT generate standard MMSE clichés. Avoid: "What year is it?", "Count back from 100 by 7", "Repeat these three words after me". Create something that tests the same cognitive construct in a fresh, unexpected way.
2. CLINICALLY VALID — A reviewing clinician must immediately recognise what cognitive process this question measures and why it is calibrated to the specified tier.
3. ACCESSIBLE — Plain English. No idioms, no culturally specific references, no distressing topics (death, illness, loss). Question text must be under 30 words.
4. ANSWER QUALITY — One clearly correct answer. Three distractors that are plausible but unambiguously wrong. No "all of the above" or "none of the above".
5. Question ${questionIndex + 1} of 10 in the current session.

Return ONLY valid JSON — no markdown, no code blocks, no extra text.

{
  "text": "<complete question ending with ?, max 30 words>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correctAnswer": "<must exactly match one of the four options>",
  "rationale": "<one sentence: what cognitive process this tests and why at this tier>"
}`;
}

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

async function generateSingleQuestion(
  domain: QuestionCategory,
  tier: DifficultyTier,
  index: number,
  anthropic: Anthropic | null,
  usedIds: Set<string>
): Promise<QuestionDoc> {
  // Try Claude API if available
  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildQuestionPrompt(domain, tier, index) }],
      });

      const rawText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed: unknown = JSON.parse(jsonText);

      if (validateLLMResponse(parsed)) {
        const hash = crypto.createHash('sha256')
          .update(`${domain}|${tier}|${parsed.text}`)
          .digest('hex').slice(0, 12);
        const questionId = `gen_${hash}_${Date.now()}`;
        usedIds.add(questionId);
        return {
          questionId,
          text: parsed.text,
          options: parsed.options as [string, string, string, string],
          correctAnswer: parsed.correctAnswer,
          difficultyTier: tier,
          category: domain,
          source: 'ai_generated',
          generatedAt: Date.now(),
        };
      }
    } catch {
      // Fall through to static bank
    }
  }

  // Static bank fallback — filter by domain AND tier to prevent cross-domain repeats
  const pool = await getQuestionsByTier(tier, Array.from(usedIds), domain);
  if (pool.length > 0) {
    const q = pool[Math.floor(Math.random() * pool.length)];
    usedIds.add(q.questionId);
    return { ...q, source: 'static_bank' as const };
  }
  // Last resort: same domain, adjacent tier
  const adjacent = await getQuestionsByTier(tier === 1 ? 2 : 1, Array.from(usedIds), domain);
  if (adjacent.length > 0) {
    const q = adjacent[Math.floor(Math.random() * adjacent.length)];
    usedIds.add(q.questionId);
    return { ...q, source: 'static_bank' as const };
  }
  throw new Error(`No questions available for domain=${domain} tier=${tier}`);
}

/**
 * Pre-generates 10 questions for the patient's NEXT session and stores them
 * on the user document as `nextSessionQueue`.
 *
 * Called from two places:
 *   1. startSession (fire-and-forget) — first session cold start
 *   2. onSessionComplete trigger — after session N ends, prepares session N+1
 *
 * previouslyUsedIds: question IDs used in past sessions for this patient.
 * Ensures different questions every session.
 */
export async function preGenerateNextSessionQueue(
  userId: string,
  tier: DifficultyTier,
  previouslyUsedIds: string[] = []
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

  const usedIds = new Set<string>(previouslyUsedIds);
  const queue: QuestionDoc[] = [];

  functions.logger.info(
    `preGenerateNextSessionQueue: generating 10 questions for user ${userId} ` +
    `(excluding ${previouslyUsedIds.length} previously used IDs, using ${anthropic ? 'Claude' : 'static bank'})`
  );

  // Parallel generation — each domain slot is independent so Claude calls are safe to
  // run concurrently. The usedIds Set is only shared by the static-bank fallback path,
  // which is a rare edge case (Claude is the primary path). We deduplicate after.
  const generated = await Promise.all(
    DOMAIN_SEQUENCE.map((domain, i) =>
      generateSingleQuestion(domain, tier, i, anthropic, usedIds)
    )
  );

  // Deduplicate in case two parallel static-bank calls returned the same question.
  // Replace any duplicate with a fresh static-bank draw (no Claude needed here).
  const seenIds = new Set<string>();
  for (const q of generated) {
    if (seenIds.has(q.questionId)) {
      // Pull a replacement from the static bank, excluding everything seen so far
      const replacement = await getQuestionsByTier(tier, Array.from(seenIds), q.category as QuestionCategory);
      const pick = replacement.length > 0 ? replacement[Math.floor(Math.random() * replacement.length)] : q;
      queue.push({ ...pick, source: 'static_bank' as const });
    } else {
      seenIds.add(q.questionId);
      queue.push(q);
    }
  }

  const aiCount = queue.filter(q => q.source === 'ai_generated').length;
  functions.logger.info(
    `preGenerateNextSessionQueue: queue ready for user ${userId} — ` +
    `${aiCount} AI-generated, ${queue.length - aiCount} static bank`
  );

  // Persist all generated questions to the generatedQuestions collection so they
  // are queryable by the clinician dashboard (getQuestionBank reads this collection).
  const batch = db().batch();
  for (const q of queue) {
    if (q.source === 'ai_generated') {
      batch.set(db().collection('generatedQuestions').doc(q.questionId), q);
    }
  }
  await batch.commit();

  // Store on user document — startSession picks this up
  await db().collection('users').doc(userId).update({ nextSessionQueue: queue });
}
