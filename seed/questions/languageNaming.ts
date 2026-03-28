// Language & Naming domain: Word retrieval and object recognition
// Questions use verbal descriptions (no images in prototype).
// Future enhancement: replace text descriptions with photographs.
//
// Tier 1 — Common, high-frequency objects (10 questions)
// Tier 2 — Category identification and word association (10 questions)
// Tier 3 — Abstract naming, semantic similarity, word retrieval from clues (10 questions)

import { QuestionDoc } from '../types';

export const languageNamingQuestions: Omit<QuestionDoc, 'questionId'>[] = [
  // ── TIER 1: Common object naming ─────────────────────────────────────────
  {
    text: 'What do you call the device you use to tell the time, worn on your wrist?',
    options: ['Necklace', 'Watch', 'Ring', 'Bracelet'],
    correctAnswer: 'Watch',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What do you call the tool used to brush your teeth?',
    options: ['Comb', 'Toothbrush', 'Razor', 'Floss'],
    correctAnswer: 'Toothbrush',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What is the name of the round fruit that is red or green on the outside?',
    options: ['Pear', 'Apple', 'Orange', 'Grape'],
    correctAnswer: 'Apple',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What do you call the piece of furniture you sleep on?',
    options: ['Chair', 'Sofa', 'Bed', 'Bench'],
    correctAnswer: 'Bed',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What do you call the object you use to unlock a door?',
    options: ['Handle', 'Key', 'Knob', 'Hinge'],
    correctAnswer: 'Key',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What is the name of the liquid you drink most often to stay hydrated?',
    options: ['Juice', 'Milk', 'Water', 'Tea'],
    correctAnswer: 'Water',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What do you call the device used to make phone calls that you carry in your pocket?',
    options: ['Radio', 'Television', 'Mobile phone', 'Camera'],
    correctAnswer: 'Mobile phone',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What is the name of the large hot star in the sky that provides daylight?',
    options: ['Moon', 'Star', 'Sun', 'Planet'],
    correctAnswer: 'Sun',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What do you call the object you use to write on paper, filled with ink?',
    options: ['Pencil', 'Pen', 'Marker', 'Crayon'],
    correctAnswer: 'Pen',
    difficultyTier: 1,
    category: 'language_naming',
  },
  {
    text: 'What is the name of the vehicle with two wheels that you pedal with your feet?',
    options: ['Motorcycle', 'Scooter', 'Bicycle', 'Tricycle'],
    correctAnswer: 'Bicycle',
    difficultyTier: 1,
    category: 'language_naming',
  },

  // ── TIER 2: Category identification and word association ─────────────────
  {
    text: 'Which of the following does NOT belong in the category of "kitchen utensils"?',
    options: ['Spatula', 'Whisk', 'Ladle', 'Hammer'],
    correctAnswer: 'Hammer',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'A "stethoscope" is an instrument used by which profession?',
    options: ['Teacher', 'Doctor', 'Lawyer', 'Chef'],
    correctAnswer: 'Doctor',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'Which word is the opposite of "ancient"?',
    options: ['Old', 'Antique', 'Modern', 'Aged'],
    correctAnswer: 'Modern',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'What category do ROSE, LILY, and DAISY all belong to?',
    options: ['Trees', 'Vegetables', 'Flowers', 'Herbs'],
    correctAnswer: 'Flowers',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'Which word has a similar meaning to "happy"?',
    options: ['Angry', 'Sad', 'Joyful', 'Tired'],
    correctAnswer: 'Joyful',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'Which of the following is a "mammal"?',
    options: ['Salmon', 'Eagle', 'Whale', 'Frog'],
    correctAnswer: 'Whale',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'The word "library" is associated with which objects?',
    options: ['Pots and pans', 'Books and shelves', 'Cars and engines', 'Paint and brushes'],
    correctAnswer: 'Books and shelves',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'Which of these words is a synonym for "large"?',
    options: ['Tiny', 'Narrow', 'Huge', 'Slim'],
    correctAnswer: 'Huge',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'Which word does NOT belong: Cat, Dog, Goldfish, Lion?',
    options: ['Cat', 'Dog', 'Goldfish', 'Lion'],
    correctAnswer: 'Goldfish',
    difficultyTier: 2,
    category: 'language_naming',
  },
  {
    text: 'What single word connects: "rain", "sun", "snow", and "wind"?',
    options: ['Season', 'Weather', 'Climate', 'Temperature'],
    correctAnswer: 'Weather',
    difficultyTier: 2,
    category: 'language_naming',
  },

  // ── TIER 3: Abstract naming and complex word retrieval ───────────────────
  {
    text: 'What word describes the fear of open or crowded spaces?',
    options: ['Claustrophobia', 'Agoraphobia', 'Acrophobia', 'Arachnophobia'],
    correctAnswer: 'Agoraphobia',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'The word "nocturnal" best describes an animal that is active during which time?',
    options: ['Early morning', 'Afternoon', 'Evening', 'Night'],
    correctAnswer: 'Night',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'Which word completes the analogy: "Hot is to Cold as Day is to ___"?',
    options: ['Noon', 'Dusk', 'Night', 'Dawn'],
    correctAnswer: 'Night',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'What is the term for a doctor who specialises in caring for elderly patients?',
    options: ['Neurologist', 'Geriatrician', 'Cardiologist', 'Oncologist'],
    correctAnswer: 'Geriatrician',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'The medical term "hypertension" refers to which condition?',
    options: ['Low blood sugar', 'High blood pressure', 'Low blood pressure', 'High blood sugar'],
    correctAnswer: 'High blood pressure',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'What word describes the process by which plants make food using sunlight?',
    options: ['Respiration', 'Fermentation', 'Photosynthesis', 'Osmosis'],
    correctAnswer: 'Photosynthesis',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'Which word completes: "Pen is to Writer as Scalpel is to ___"?',
    options: ['Nurse', 'Surgeon', 'Pharmacist', 'Dentist'],
    correctAnswer: 'Surgeon',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'What is the word for a person\'s inability to fall or stay asleep?',
    options: ['Narcolepsy', 'Insomnia', 'Apnoea', 'Hypersomnia'],
    correctAnswer: 'Insomnia',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'Which word means the same as "transparent"?',
    options: ['Opaque', 'Translucent', 'Clear', 'Matte'],
    correctAnswer: 'Clear',
    difficultyTier: 3,
    category: 'language_naming',
  },
  {
    text: 'The term "bilateral" means relating to how many sides?',
    options: ['One', 'Two', 'Three', 'Four'],
    correctAnswer: 'Two',
    difficultyTier: 3,
    category: 'language_naming',
  },
];
