# Scope: E2E Testing Track

## Architecture & Approach
The E2E test track has built an independent, opaque-box test harness that runs natively via `node tests/e2e/runner.mjs`.
Tests evaluate all 36 features (F01..F36) described in `PROJECT.md` and `TEST_INFRA.md`.
The test suite consists of:
1. **Tier 1 - Feature Coverage**: Direct requirement verification for each feature in isolation (170 tests across F01–F34).
2. **Tier 2 - Boundary & Corner Cases**: Edge values, max ammo, zero health, boundaries, extreme angles, coordinate clipping (170 tests across F01–F34).
3. **Tier 3 - Pairwise Combinations**: Cross-system interactions (e.g. Weapon swap + dash + walls; Airdrop + monster swarm + mortar lob; Y-sort with 4-player overlapping + deployables) (42 tests).
4. **Tier 4 - Real-World Workloads**: Full match simulations (Biohazard wave survival 1–10, 8-player FFA with bots, Base defense, Reconnect grace period, 18,000-tick Endurance) (19 tests).

## Milestones
| # | Name | Scope | Dependencies | Status | Key Deliverables |
|---|------|-------|-------------|--------|------------------|
| TM1 | Test Infrastructure & Runner | `tests/e2e/runner.mjs`, `tests/e2e/harness.mjs` test harness, assertion library, reporting format | None | DONE | `runner.mjs`, `harness.mjs` |
| TM2 | Tier 1 Feature Coverage Suite | `tests/e2e/tier1_features.test.mjs` (F01..F34 5 tests each) | TM1 | DONE | 170 tests passing |
| TM3 | Tier 2 Boundary & Corner Suite | `tests/e2e/tier2_boundaries.test.mjs` (F01..F34 5 tests each) | TM1 | DONE | 170 tests passing |
| TM4 | Tier 3 Cross-Feature Suite | `tests/e2e/tier3_combinations.test.mjs` (42 pairwise tests) | TM1 | DONE | 42 tests passing |
| TM5 | Tier 4 Real-World Workload Suite | `tests/e2e/tier4_workloads.test.mjs` (19 full-match scenarios) | TM1 | DONE | 19 tests passing |
| TM6 | E2E Suite Verification & TEST_READY | Full execution, review, challenger stress-testing, audit verification, publication of `TEST_READY.md` | TM1-TM5 | DONE | `TEST_READY.md` published |
