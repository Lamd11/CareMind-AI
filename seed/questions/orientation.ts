// Orientation domain: Awareness of time, date, place, and personal context
// Tier 1 — Direct recall, single-step (10 questions)
// Tier 2 — Mild inference or recent memory (10 questions)
// Tier 3 — Multi-step temporal reasoning or abstraction (10 questions)

import { QuestionDoc } from '../types';

export const orientationQuestions: Omit<QuestionDoc, 'questionId'>[] = [
  // ── TIER 1: Direct recall ───────────────────────────────────────────────
  {
    text: 'What season comes after summer?',
    options: ['Winter', 'Spring', 'Autumn', 'Monsoon'],
    correctAnswer: 'Autumn',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'How many months are in a year?',
    options: ['10', '11', '12', '13'],
    correctAnswer: '12',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'Which season has the longest days?',
    options: ['Spring', 'Summer', 'Autumn', 'Winter'],
    correctAnswer: 'Summer',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'How many days are in a week?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'Which month comes after March?',
    options: ['February', 'April', 'May', 'June'],
    correctAnswer: 'April',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'What is the first month of the year?',
    options: ['December', 'February', 'January', 'March'],
    correctAnswer: 'January',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'Which season comes before spring?',
    options: ['Summer', 'Autumn', 'Winter', 'Monsoon'],
    correctAnswer: 'Winter',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'How many days are in the month of June?',
    options: ['28', '29', '30', '31'],
    correctAnswer: '30',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'What day comes after Wednesday?',
    options: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    correctAnswer: 'Thursday',
    difficultyTier: 1,
    category: 'orientation',
  },
  {
    text: 'Which month has the fewest days?',
    options: ['January', 'February', 'March', 'April'],
    correctAnswer: 'February',
    difficultyTier: 1,
    category: 'orientation',
  },

  // ── TIER 2: Mild inference or recent memory ─────────────────────────────
  {
    text: 'If today is Tuesday, what day was it two days ago?',
    options: ['Friday', 'Saturday', 'Sunday', 'Monday'],
    correctAnswer: 'Sunday',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If this month is October, what month comes in two months?',
    options: ['November', 'December', 'January', 'February'],
    correctAnswer: 'December',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'Which season would it most likely be if the trees have no leaves?',
    options: ['Spring', 'Summer', 'Autumn', 'Winter'],
    correctAnswer: 'Winter',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If today is Friday, what day will it be in three days?',
    options: ['Saturday', 'Sunday', 'Monday', 'Tuesday'],
    correctAnswer: 'Monday',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If this month is March, which season is it?',
    options: ['Summer', 'Autumn', 'Winter', 'Spring'],
    correctAnswer: 'Spring',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If today is the 1st of the month, what date will it be in a week?',
    options: ['6th', '7th', '8th', '9th'],
    correctAnswer: '8th',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If today is Monday, how many days until Friday?',
    options: ['2', '3', '4', '5'],
    correctAnswer: '4',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'Which month is three months before December?',
    options: ['August', 'September', 'October', 'November'],
    correctAnswer: 'September',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If this year is 2025, what year was it five years ago?',
    options: ['2018', '2019', '2020', '2021'],
    correctAnswer: '2020',
    difficultyTier: 2,
    category: 'orientation',
  },
  {
    text: 'If Christmas is December 25th, how many months away is it from September 25th?',
    options: ['1', '2', '3', '4'],
    correctAnswer: '3',
    difficultyTier: 2,
    category: 'orientation',
  },

  // ── TIER 3: Multi-step reasoning or abstraction ─────────────────────────
  {
    text: 'Today is Wednesday the 10th. Your appointment is in 4 days. What day and date is your appointment?',
    options: ['Friday the 12th', 'Saturday the 13th', 'Sunday the 14th', 'Monday the 15th'],
    correctAnswer: 'Sunday the 14th',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'It is currently late November. Counting from now, how many months until the start of summer in June?',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'Your birthday is on the 15th. Today is the 3rd of the same month. How many days until your birthday?',
    options: ['10', '11', '12', '13'],
    correctAnswer: '12',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'A doctor\'s appointment was booked 3 weeks ago today. If today is Thursday, what day of the week was it booked?',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    correctAnswer: 'Thursday',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'If a season lasts 3 months and spring starts in March, in which month does summer end?',
    options: ['July', 'August', 'September', 'October'],
    correctAnswer: 'August',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'Today is the 28th of February in a non-leap year. What is the date in 3 days?',
    options: ['March 1st', 'March 2nd', 'March 3rd', 'March 4th'],
    correctAnswer: 'March 3rd',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'If your weekly medication is taken every Monday and Wednesday, and today is Saturday, how many days until your next dose?',
    options: ['1', '2', '3', '4'],
    correctAnswer: '2',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'A phone bill arrives on the 1st of every month. The last one arrived 25 days ago. How many days until the next bill arrives?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '5',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'If you were born in 1955 and the current year is 2025, how old are you this year?',
    options: ['68', '69', '70', '71'],
    correctAnswer: '70',
    difficultyTier: 3,
    category: 'orientation',
  },
  {
    text: 'There are 4 weeks in a month. If a visitor comes every 2 weeks starting the first week of January, how many visits happen by end of February?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    difficultyTier: 3,
    category: 'orientation',
  },
];
