// Attention & Working Memory domain: Hold and manipulate information mentally
// Tier 1 — Simple sequences, single-step arithmetic (10 questions)
// Tier 2 — Counting tasks, digit spans, moderate manipulation (10 questions)
// Tier 3 — Serial subtraction, multi-step reasoning, reverse sequences (10 questions)

import { QuestionDoc } from '../types';

export const attentionMemoryQuestions: Omit<QuestionDoc, 'questionId'>[] = [
  // ── TIER 1: Simple sequences and basic attention ─────────────────────────
  {
    text: 'What is the next number in this sequence: 2, 4, 6, 8, ___?',
    options: ['9', '10', '11', '12'],
    correctAnswer: '10',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What comes next: Monday, Tuesday, Wednesday, ___?',
    options: ['Friday', 'Thursday', 'Saturday', 'Sunday'],
    correctAnswer: 'Thursday',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'Continue the pattern: A, B, C, D, ___?',
    options: ['E', 'F', 'G', 'H'],
    correctAnswer: 'E',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What is 5 plus 3?',
    options: ['6', '7', '8', '9'],
    correctAnswer: '8',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What is the next number: 10, 20, 30, 40, ___?',
    options: ['45', '50', '55', '60'],
    correctAnswer: '50',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'If you have 10 apples and eat 3, how many are left?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What number comes before 15?',
    options: ['12', '13', '14', '16'],
    correctAnswer: '14',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'Continue: January, February, March, ___?',
    options: ['May', 'April', 'June', 'July'],
    correctAnswer: 'April',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What is 9 minus 4?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '5',
    difficultyTier: 1,
    category: 'attention_memory',
  },
  {
    text: 'What is the next number in the sequence: 1, 3, 5, 7, ___?',
    options: ['8', '9', '10', '11'],
    correctAnswer: '9',
    difficultyTier: 1,
    category: 'attention_memory',
  },

  // ── TIER 2: Moderate manipulation and digit span ─────────────────────────
  {
    text: 'Count backwards from 20. Which number comes after 20, 18, 16, ___?',
    options: ['12', '13', '14', '15'],
    correctAnswer: '14',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'Repeat this sequence in reverse order: 3, 7, 2. What is the reversed sequence?',
    options: ['2, 7, 3', '7, 3, 2', '3, 2, 7', '2, 3, 7'],
    correctAnswer: '2, 7, 3',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'If you count by 3s starting from 3, which number comes 4th? (3, 6, 9, ___)',
    options: ['10', '11', '12', '13'],
    correctAnswer: '12',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'What is 14 minus 7, then add 4?',
    options: ['9', '10', '11', '12'],
    correctAnswer: '11',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'A sequence goes: 100, 90, 80, 70. What comes next?',
    options: ['55', '60', '65', '70'],
    correctAnswer: '60',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'If the days of the week were numbered (Mon=1, Tue=2, ... Sun=7), what number is Thursday?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'You are asked to tap every time you hear an odd number: 1, 4, 7, 2, 9. How many taps?',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'Start at 50, subtract 6, then add 3. What is the result?',
    options: ['45', '46', '47', '48'],
    correctAnswer: '47',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'A pattern alternates: circle, square, circle, square, ___. What comes next?',
    options: ['Triangle', 'Circle', 'Square', 'Diamond'],
    correctAnswer: 'Circle',
    difficultyTier: 2,
    category: 'attention_memory',
  },
  {
    text: 'If A=1, B=2, C=3 ... what is the value of the word "CAB"?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '6',
    difficultyTier: 2,
    category: 'attention_memory',
  },

  // ── TIER 3: Serial subtraction and multi-step reasoning ──────────────────
  {
    text: 'Starting from 100, subtract 7 repeatedly. What is the third result? (100, 93, 86, ___)',
    options: ['79', '80', '81', '82'],
    correctAnswer: '79',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'I am thinking of a number. If I double it and subtract 5, I get 11. What is my number?',
    options: ['6', '7', '8', '9'],
    correctAnswer: '8',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'Count backwards from 30 by 4s. What is the fourth number? (30, 26, 22, ___)',
    options: ['16', '17', '18', '19'],
    correctAnswer: '18',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'You spend $12 on Monday, $8 on Wednesday, and $15 on Friday. You started with $50. How much is left?',
    options: ['$13', '$14', '$15', '$16'],
    correctAnswer: '$15',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'What are the missing numbers: 2, 4, 8, 16, ___, 64?',
    options: ['24', '28', '32', '36'],
    correctAnswer: '32',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'If you reverse the digits of 47 and multiply by 2, what do you get?',
    options: ['142', '148', '152', '156'],
    correctAnswer: '148',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'Starting at 1000, subtract 93 twice. What number do you arrive at?',
    options: ['810', '814', '818', '820'],
    correctAnswer: '814',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'A sequence triples each time: 1, 3, 9, 27, ___. What comes next?',
    options: ['54', '72', '81', '90'],
    correctAnswer: '81',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'If you count every letter in "WEDNESDAY" that comes after M in the alphabet, how many are there?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '5',
    difficultyTier: 3,
    category: 'attention_memory',
  },
  {
    text: 'You take a pill at 8am, 2pm, and 8pm every day. How many pills do you take in 3 days?',
    options: ['6', '7', '8', '9'],
    correctAnswer: '9',
    difficultyTier: 3,
    category: 'attention_memory',
  },
];
