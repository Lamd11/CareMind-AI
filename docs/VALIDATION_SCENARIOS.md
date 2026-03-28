# CareMind AI — Validation Scenarios

This document describes the five validation scenarios used to evaluate the Analytics Engine against the thesis metrics:

- **Alert Precision > 90%**: Proportion of generated alerts that are true positive decline events
- **Alert Recall > 85%**: Proportion of real decline events that triggered an alert
- **Adaptation Responsiveness ≤ 3 sessions**: Number of sessions until difficulty adjusts to performance

Run scenarios via: `npx ts-node seed/runScenario.ts --scenario=N`

---

## Scenario 1: Stable Performance

**Purpose:** Validates Alert Precision — a stable patient generates zero alerts (no false positives).

**Input (15 sessions):**
```
Session: 1    2    3    4    5    6    7    8    9    10   11   12   13   14   15
Score:  70%  75%  72%  68%  74%  71%  73%  70%  72%  74%  71%  75%  73%  70%  72%
```

**System state:**
- Baseline = mean(sessions 1–5) = (0.70 + 0.75 + 0.72 + 0.68 + 0.74) / 5 = **71.8%**
- Low threshold = 71.8% × 85% = **61.0%**
- Sudden drop threshold = 71.8% × 70% = **50.3%**
- All 15 sessions above low threshold (61.0%) → no alert conditions met

**Expected outcome:** `null` — no alert generated

**Actual outcome:** ✅ No alert. System correctly identifies stable performance.

**Thesis significance:** This scenario provides the primary evidence for Alert Precision. Zero false-positive alerts across 15 stable sessions means the algorithm does not over-alert on natural performance variability.

---

## Scenario 2: Gradual Decline

**Purpose:** Validates Alert Recall — gradual decline is detected and escalated correctly.

**Input (15 sessions):**
```
Session: 1    2    3    4    5    6    7    8    9    10   11   12   13   14   15
Score:  70%  72%  74%  72%  70%  68%  55%  53%  51%  49%  47%  45%  43%  41%  39%
```

**System state:**
- Baseline = 71.6%
- Low threshold = 60.9%
- Session 7 (55%) and Session 8 (53%): 2 consecutive below 60.9% → **MEDIUM alert**
- Session 7, 8, 9 (55%, 53%, 51%): 3 consecutive below 60.9% → **HIGH alert** (overrides MEDIUM)
- Gradual slope also negative (< -0.02/session in window of 7)

**Expected outcome:** HIGH alert (sustained_decline) after session 9

**Actual outcome:** ✅ HIGH alert generated with explanation citing actual scores and thresholds.

**Sample explanation generated:**
> "Last 3 session scores all below low threshold 61% (85% of baseline 72%): 55%, 53%, 51%. Sustained decline over 3+ sessions indicates a clinically significant trend."

**Thesis significance:** Demonstrates Alert Recall — the analytics engine detects this as a true decline event. The explanation text contains actual numeric values (satisfying explainability requirement).

---

## Scenario 3: Sudden Drop

**Purpose:** Validates instantaneous change-point detection (Basseville & Nikiforov, 1993).

**Input (6 sessions):**
```
Session: 1    2    3    4    5    6
Score:  75%  76%  74%  75%  75%  20%
```

**System state:**
- Baseline = mean(sessions 1–5) = 75.0%
- Sudden drop threshold = 75.0% × 70% = 52.5%
- Session 6 (20%) < 52.5% → **HIGH alert (sudden_drop)**

**Expected outcome:** HIGH alert with type `sudden_drop`

**Actual outcome:** ✅ HIGH alert generated immediately after session 6.

**Sample explanation generated:**
> "Session score 20% is 73% below baseline 75% (threshold: scores below 70% of baseline trigger HIGH alert). This may indicate acute cognitive change."

**Thesis significance:** Single-session change-point detection. This mirrors acute cognitive events (e.g., post-hospital episode, medication change) that require immediate clinical attention.

---

## Scenario 4: Recovery After Decline

**Purpose:** Validates that the alert system does not continue alerting once performance recovers. Tests false-positive suppression during recovery.

**Input (12 sessions):**
```
Session: 1    2    3    4    5    6    7    8    9    10   11   12
Score:  72%  72%  72%  72%  72%  59%  57%  55%  70%  72%  74%  71%
```

**System state:**
- Baseline = 72.0% (locked after session 5)
- Low threshold = 61.2%
- Sessions 6, 7, 8 below threshold → HIGH alert generated (see Scenario 2 logic)
- Sessions 9–12 all above threshold (70%, 72%, 74%, 71%) → no new alert at session 12
- At session 12: last 3 sessions are 74%, 71%, all above 61.2% → sustained decline condition not met

**Expected outcome after recovery:** `null` — no new alert after session 12

**Actual outcome:** ✅ No alert at session 12. System correctly identifies that the decline trigger condition is no longer met.

**Thesis significance:** Demonstrates that alerts are event-driven (not continuous) — once the pattern resolves, alerting stops automatically. Supports the human-in-the-loop design: clinician acts once, system re-evaluates fresh.

---

## Scenario 5: Rate Limit Enforcement

**Purpose:** Validates the rate limiter prevents alert fatigue per Ancker et al. (2017).

**Input:** Same patient, 8 sessions all completing within a short window at 0.10 score.

**System state:**
- Baseline established at ~75%
- Session 6 at 10% → sudden drop → HIGH alert generated and written
- Session 7 at 10% → sudden drop again → rate limiter queries Firestore
  - Finds existing HIGH alert with `triggeredAt` within last 12 hours
  - Returns `{ allowed: false, suppressReason: "..." }`
  - Alert written to Firestore with `suppressed: true` (audit log preserved)
  - FCM push NOT sent

**Expected outcome:** 1 active HIGH alert, subsequent alerts have `suppressed: true`

**Actual outcome:** ✅ Rate limiter correctly suppresses duplicate alerts within 12-hour window.

**Sample suppressReason field in Firestore:**
> "A HIGH alert was already sent at 2026-03-28T10:23:41.000Z. Rate limit: max 1 HIGH alert per 12 hours. This alert is suppressed to prevent alert fatigue (Ancker et al., 2017)."

**Thesis significance:** Directly implements the clinical design principle from Ancker et al. (2017) — over-alerting leads to alert fatigue and clinician override. The suppress reason is stored verbatim, providing an auditable trail that satisfies explainability requirements.

---

## Metric Summary

| Metric | Target | Evidence |
|--------|--------|----------|
| Alert Precision | > 90% | Scenario 1: 0 false positives across 15 stable sessions |
| Alert Recall | > 85% | Scenarios 2, 3, 4: 3/3 decline events triggered alerts = 100% recall |
| Adaptation Responsiveness | ≤ 3 sessions | Difficulty adjusts within 5 consecutive answers = within 1 session |
| Rate limit effectiveness | Max 1 HIGH/12h | Scenario 5: duplicate alerts correctly suppressed |

### Adaptation Responsiveness Detail

The rolling window is 5 answers (not sessions). A patient answering 5 consecutive questions correctly triggers a difficulty increase within a single 10-question session. This is documented in `questionEngine.test.ts`:

```
test: "uses only the last 5 results from a longer array"
→ After 5 consecutive correct answers, difficulty increases immediately
→ Adaptation responsiveness = 5 answers = 1 session ≤ threshold of 3 sessions ✅
```

---

## How to Reproduce

```bash
# Start Firebase emulators
firebase emulators:start

# Seed questions and users (from /seed directory)
npx ts-node seedQuestions.ts
npx ts-node seedTestUsers.ts

# Run individual scenarios
npx ts-node runScenario.ts --scenario=1   # Stable → no alert
npx ts-node runScenario.ts --scenario=2   # Gradual decline → HIGH alert
npx ts-node runScenario.ts --scenario=3   # Sudden drop → HIGH alert
npx ts-node runScenario.ts --scenario=4   # Recovery → no alert after recovery
npx ts-node runScenario.ts --scenario=all # Run all 5 consecutively

# Run unit tests (covers all scenario logic as pure functions)
cd functions && npx jest
```
