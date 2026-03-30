# CareMind AI — Question Bank Taxonomy

This document classifies all 120 questions in the CareMind AI question bank by cognitive domain and difficulty tier. It serves as the content model appendix for the thesis Results chapter.

**Total questions:** 120
**Domains:** 4
**Tiers per domain:** 3
**Questions per tier:** 10

---

## Domain Classification Rationale

The four cognitive domains are grounded in established dementia assessment frameworks, particularly the Mini-Mental State Examination (MMSE, Folstein et al., 1975) and Cognitive Stimulation Therapy (CST) protocols (Spector et al., 2003; Woods et al., 2012).

### Domain 1: Orientation

**What it tests:** Awareness of time (day, date, month, year, season), place, and personal context.

**Clinical relevance:** Temporal disorientation is one of the earliest and most consistent markers of dementia progression. The MMSE dedicates 10/30 points to orientation questions. Deficits in orientation are strongly correlated with hippocampal atrophy (Maguire et al., 2006).

**Question taxonomy:**

| Tier | Cognitive Load | Design Pattern | Example |
|------|---------------|----------------|---------|
| 1 (Easy) | Direct single-step recall from long-term semantic memory | "What is X?" | "What day comes after Wednesday?" |
| 2 (Medium) | Mild calculation or inference from known facts | "If X, then Y?" | "If today is Tuesday, what day was it two days ago?" |
| 3 (Hard) | Multi-step temporal arithmetic; requires holding intermediate values in working memory | "Given X and Y, compute Z" | "Today is Wednesday the 10th. Your appointment is in 4 days. What day and date is it?" |

---

### Domain 2: Short-Term Recall

**What it tests:** Ability to encode, retain, and retrieve recently presented information over a delay of seconds to minutes.

**Clinical relevance:** Short-term recall (also called episodic memory) is the most commonly impaired cognitive function in Alzheimer's disease. The MMSE three-word recall task (registration → distraction → recall) is the gold-standard clinical screen. CareMind adapts this to a multiple-choice format, eliminating free-recall demands that are impractical in a mobile app.

**Prototype note:** In the prototype, the "item shown earlier" is embedded in the question text (e.g., "At the start of this session you were shown the word: APPLE"). A full implementation would present items on a dedicated memorization screen with a delay interval before the recall question.

**Question taxonomy:**

| Tier | Cognitive Load | Design Pattern | Example |
|------|---------------|----------------|---------|
| 1 (Easy) | Single item recall; no delay or distraction | Identify 1 presented word/item | "At the start of this session you were shown: APPLE. What was that word?" |
| 2 (Medium) | Two items; requires comparison or selection; mild semantic processing | Choose between 2 items or apply a property | "Two words were shown: RIVER and MOUNTAIN. Which was NOT shown?" |
| 3 (Hard) | Three items; requires categorisation, property matching, or arithmetic across all items | Multi-item semantic reasoning | "Three animals were shown: OWL, PENGUIN, KANGAROO. Which one lives in Australia?" |

---

### Domain 3: Attention & Working Memory

**What it tests:** Ability to hold information in mind and manipulate it — the central executive component of working memory (Baddeley, 1992).

**Clinical relevance:** Working memory deficits are present across all dementia subtypes and are directly linked to functional independence. Serial subtraction (count backwards by 7 from 100) is a standard clinical attention test. This domain also captures processing speed via `responseTimeMs` (stored on every QuestionResultDoc for future enhancement).

**Question taxonomy:**

| Tier | Cognitive Load | Design Pattern | Example |
|------|---------------|----------------|---------|
| 1 (Easy) | Simple sequence continuation; single arithmetic step; no memory delay | "What comes next in X, Y, Z, ___?" | "2, 4, 6, 8, ___?" |
| 2 (Medium) | Multi-step calculation; sequence identification with a pattern transformation; moderate working memory load | Two-operation arithmetic or sequence with a rule | "Count backwards from 20 by 2s: 20, 18, 16, ___?" |
| 3 (Hard) | Serial subtraction (7s); multi-step word problems; abstract pattern recognition | Three or more operations; delayed result calculation | "Starting at 100, subtract 7 three times. What is the result?" |

---

### Domain 4: Language & Naming

**What it tests:** Word retrieval ability (verbal fluency), semantic category knowledge, and object identification — core components of expressive language.

**Clinical relevance:** Anomia (word-finding difficulty) is an early symptom of Alzheimer's disease and progresses in parallel with disease severity. The Boston Naming Test (Kaplan et al., 1983) is the standard clinical measure. CareMind uses verbal descriptions instead of images (prototype constraint), consistent with the verbal naming subtests used in many adapted dementia assessments.

**Prototype note:** Language/Naming Tier 1 questions use text descriptions of objects (e.g., "What do you call the device worn on your wrist to tell the time?"). A future version would replace descriptions with photographs, consistent with standard naming tests.

**Question taxonomy:**

| Tier | Cognitive Load | Design Pattern | Example |
|------|---------------|----------------|---------|
| 1 (Easy) | High-frequency concrete objects; common semantic categories; direct naming from description | "What do you call [common object]?" | "What do you call the object you use to unlock a door?" |
| 2 (Medium) | Category identification; synonym/antonym retrieval; semantic category membership | "Which of these belongs to / does not belong to category X?" | "Which word does NOT belong: Cat, Dog, Goldfish, Lion?" |
| 3 (Hard) | Low-frequency or medical vocabulary; abstract semantic analogies; multi-step semantic reasoning | Analogical reasoning; medical terminology; vocabulary | "Which word completes: Pen is to Writer as Scalpel is to ___?" |

---

## Difficulty Tier Rationale

The three-tier system was designed to balance three competing constraints:

1. **Predictability:** Tier labels must produce consistent cognitive load estimates across questions. This enables the algorithm to make reliable predictions about patient capability.

2. **Testability:** With only 3 tiers, every difficulty transition is observable within a small number of answers. A 10-level scale would require hundreds of sessions to generate meaningful signal.

3. **Alignment with clinical instruments:** Three-level severity classifications (mild/moderate/severe) are standard in dementia assessment (CDR scale, Allen et al., 2003) and intuitively interpretable by clinicians.

### Cognitive Load Classification Criteria

A question is classified at Tier 3 if it requires ANY of:
- Holding three or more intermediate values in working memory simultaneously
- Performing two or more sequential arithmetic or logical operations
- Resolving a temporal reference chain of three or more steps
- Accessing low-frequency vocabulary (< 1 per million word frequency)

A question is classified at Tier 1 if:
- The answer can be retrieved from long-term semantic memory in a single lookup
- No calculation or inference is required
- The item is among the most common vocabulary (top 3,000 words)

All other questions are Tier 2.

---

## Summary Table

| Domain | Tier 1 (n=10) | Tier 2 (n=10) | Tier 3 (n=10) | Total |
|--------|---------------|---------------|---------------|-------|
| Orientation | Direct temporal facts | Mild temporal calculation | Multi-step temporal reasoning | 30 |
| Short-Term Recall | Single item recall | Two-item comparison | Three-item reasoning | 30 |
| Attention & Memory | Simple sequences | Multi-step arithmetic | Serial subtraction, abstract patterns | 30 |
| Language & Naming | Common object naming | Category membership | Analogies, medical vocabulary | 30 |
| **Total** | **40** | **40** | **40** | **120** |

---

## References

- Baddeley, A. (1992). Working memory. *Science, 255*(5044), 556–559.
- Folstein, M.F., Folstein, S.E., & McHugh, P.R. (1975). Mini-mental state: A practical method for grading the cognitive state of patients. *Journal of Psychiatric Research, 12*(3), 189–198.
- Kaplan, E.F., Goodglass, H., & Weintraub, S. (1983). *The Boston Naming Test* (2nd ed.). Lea & Febiger.
- Spector, A., Thorgrimsen, L., Woods, B., Royan, L., Davies, S., Butterworth, M., & Orrell, M. (2003). Efficacy of an evidence-based cognitive stimulation therapy programme for people with dementia. *British Journal of Psychiatry, 183*(3), 248–254.
- Woods, B., Aguirre, E., Spector, A.E., & Orrell, M. (2012). Cognitive stimulation to improve cognitive functioning in people with dementia. *Cochrane Database of Systematic Reviews*, (2).
