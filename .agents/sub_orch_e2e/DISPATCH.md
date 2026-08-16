## 2026-08-15T11:59:42Z
You are the E2E Testing Track Sub-Orchestrator for FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter Refactor.
Your working directory for metadata is: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e
Project root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
User Request file: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
Project specification: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
Test specification: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\TEST_INFRA.md

Your Task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and TEST_INFRA.md.
2. Build the complete, independent, opaque-box E2E test suite covering all 36 features across 4 tiers:
   - Tier 1: Feature Coverage (>=5 tests per feature, happy path in isolation)
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature, limits, zero/max ammo, boundary collisions, overflow)
   - Tier 3: Cross-Feature Combinations (>=36 pairwise tests, weapon swap + dash + walls, airdrop + monsters + explosions, etc.)
   - Tier 4: Real-World Workload Scenarios (>=18 full-match workloads, Biohazard wave survival, 8-player deathmatch with bots, base defense, reconnect grace period)
3. Implement the standalone E2E test runner at `tests/e2e/runner.mjs` (executable via `node tests/e2e/runner.mjs`, exiting with code 0 on pass, non-zero on failure).
4. You can dispatch Workers/Test Writers (`teamwork_preview_test_writer` or `teamwork_preview_worker`) and Reviewers to implement and verify the test suite.
5. When complete and verified, publish `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\TEST_READY.md` following the exact template in PROJECT.md / TEST_INFRA.md.
6. Write your handoff report to `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\handoff.md` and send a message back to parent.
