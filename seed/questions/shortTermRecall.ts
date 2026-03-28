// Short-Term Recall domain: Retain and retrieve recently presented information
// For the prototype, the "item shown earlier" is embedded in the question text.
// In a full deployment, items would be shown on a dedicated "memorization" screen.
//
// Tier 1 — Single item, immediate recall (10 questions)
// Tier 2 — Two items or short delay implied (10 questions)
// Tier 3 — Three or more items, interference, or multi-step recall (10 questions)

import { QuestionDoc } from '../types';

export const shortTermRecallQuestions: Omit<QuestionDoc, 'questionId'>[] = [
  // ── TIER 1: Single item, direct recall ─────────────────────────────────
  {
    text: 'At the start of this session you were shown the word: APPLE. What was that word?',
    options: ['Orange', 'Apple', 'Banana', 'Mango'],
    correctAnswer: 'Apple',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'A moment ago you were shown the colour: BLUE. What colour was it?',
    options: ['Red', 'Green', 'Blue', 'Yellow'],
    correctAnswer: 'Blue',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown the name of an animal: CAT. What animal was shown?',
    options: ['Dog', 'Cat', 'Bird', 'Fish'],
    correctAnswer: 'Cat',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'Earlier in this session the number 7 was displayed. What number was shown?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown the name of a city: LONDON. What city was shown?',
    options: ['Paris', 'London', 'Rome', 'Berlin'],
    correctAnswer: 'London',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'A shape was shown to you: CIRCLE. What was the shape?',
    options: ['Square', 'Triangle', 'Circle', 'Star'],
    correctAnswer: 'Circle',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'At the beginning of the exercise you saw the word: TABLE. What was the word?',
    options: ['Chair', 'Desk', 'Table', 'Shelf'],
    correctAnswer: 'Table',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown the name of a season: WINTER. Which season was shown?',
    options: ['Spring', 'Summer', 'Autumn', 'Winter'],
    correctAnswer: 'Winter',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'A day of the week was shown: FRIDAY. What day was it?',
    options: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    correctAnswer: 'Friday',
    difficultyTier: 1,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown the name of a fruit: STRAWBERRY. What fruit was it?',
    options: ['Raspberry', 'Strawberry', 'Blueberry', 'Cherry'],
    correctAnswer: 'Strawberry',
    difficultyTier: 1,
    category: 'short_term_recall',
  },

  // ── TIER 2: Two items or additional challenge ───────────────────────────
  {
    text: 'Two words were shown: RIVER and MOUNTAIN. Which of the following was NOT shown?',
    options: ['River', 'Mountain', 'Valley', 'Both were shown'],
    correctAnswer: 'Valley',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown two colours earlier: RED and GREEN. Which of these was also shown?',
    options: ['Blue', 'Red', 'Yellow', 'Purple'],
    correctAnswer: 'Red',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'Two numbers were shown: 4 and 9. What is the sum of those two numbers?',
    options: ['11', '12', '13', '14'],
    correctAnswer: '13',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'At the start you saw two objects: LAMP and BOOK. Which came first in the list?',
    options: ['Book', 'Lamp', 'Both at once', 'Neither'],
    correctAnswer: 'Lamp',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown: PIANO and VIOLIN. Which of these is a string instrument?',
    options: ['Piano', 'Violin', 'Both', 'Neither'],
    correctAnswer: 'Violin',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'Two animals were shown: EAGLE and DOLPHIN. Which one can fly?',
    options: ['Dolphin', 'Eagle', 'Both', 'Neither'],
    correctAnswer: 'Eagle',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown the words SUNRISE and MOON. Which one is associated with the morning?',
    options: ['Moon', 'Sunrise', 'Both', 'Neither'],
    correctAnswer: 'Sunrise',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'Earlier you saw: FORK and SPOON. Which of these is typically used to eat soup?',
    options: ['Fork', 'Spoon', 'Both equally', 'Neither'],
    correctAnswer: 'Spoon',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'Two words were shown: NORTH and EAST. If you combine the directions, which compass direction do you get?',
    options: ['Northwest', 'Southeast', 'Northeast', 'Southwest'],
    correctAnswer: 'Northeast',
    difficultyTier: 2,
    category: 'short_term_recall',
  },
  {
    text: 'You saw the numbers 3 and 8 displayed. What is the difference between the larger and smaller number?',
    options: ['4', '5', '6', '7'],
    correctAnswer: '5',
    difficultyTier: 2,
    category: 'short_term_recall',
  },

  // ── TIER 3: Three items or complex recall ───────────────────────────────
  {
    text: 'Three words were shown in order: CLOUD, RAIN, UMBRELLA. What was the second word?',
    options: ['Cloud', 'Rain', 'Umbrella', 'Thunder'],
    correctAnswer: 'Rain',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown three colours: PURPLE, ORANGE, and TEAL. Which colour was NOT in the list?',
    options: ['Purple', 'Orange', 'Teal', 'Indigo'],
    correctAnswer: 'Indigo',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'Three numbers appeared earlier: 2, 5, and 9. What is their total sum?',
    options: ['14', '15', '16', '17'],
    correctAnswer: '16',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'Three animals were shown: OWL, PENGUIN, KANGAROO. Which one lives in Australia?',
    options: ['Owl', 'Penguin', 'Kangaroo', 'All three'],
    correctAnswer: 'Kangaroo',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'You saw three items: HAMMER, PAINTBRUSH, SCISSORS. Which item is used primarily for building?',
    options: ['Paintbrush', 'Scissors', 'Hammer', 'All equally'],
    correctAnswer: 'Hammer',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'Three cities were displayed: TOKYO, SYDNEY, CAIRO. Which city is in Africa?',
    options: ['Tokyo', 'Sydney', 'Cairo', 'None of them'],
    correctAnswer: 'Cairo',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'You were shown three words: RIVER, LAKE, OCEAN. Which is the largest body of water?',
    options: ['River', 'Lake', 'Ocean', 'They are all equal'],
    correctAnswer: 'Ocean',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'Three items were listed: BREAD, BUTTER, JAM. If you remove the item that is a spread, which two remain?',
    options: ['Bread and Butter', 'Bread and Jam', 'Butter and Jam', 'All three remain'],
    correctAnswer: 'Bread and Butter',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'You saw three words: PIANO, GUITAR, TRUMPET. How many of these are string instruments?',
    options: ['0', '1', '2', '3'],
    correctAnswer: '2',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
  {
    text: 'Three colours were shown: RED, BLUE, YELLOW. If you mix all three together as paint, what colour do you approximately get?',
    options: ['Green', 'Purple', 'Brown', 'Orange'],
    correctAnswer: 'Brown',
    difficultyTier: 3,
    category: 'short_term_recall',
  },
];
