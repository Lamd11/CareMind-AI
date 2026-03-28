// Minimal type definitions for seed scripts (mirrors functions/src/models/types.ts)

export type DifficultyTier = 1 | 2 | 3;

export type QuestionCategory =
  | 'orientation'
  | 'short_term_recall'
  | 'attention_memory'
  | 'language_naming';

export interface QuestionDoc {
  questionId: string;
  text: string;
  options: [string, string, string, string];
  correctAnswer: string;
  difficultyTier: DifficultyTier;
  category: QuestionCategory;
}
