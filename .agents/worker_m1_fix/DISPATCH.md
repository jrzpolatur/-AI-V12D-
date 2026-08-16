## 2026-08-16T08:33:02Z
You are the Worker for Milestone 1 Iteration 2 (Remediation of _rgbaCache Memory Leak and Null Context Guards).

Your Working Directory: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\worker_m1_fix
Project Root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
User Request Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\ORIGINAL_REQUEST.md
Project Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
Reviewer Feedback Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\reviewer_m1_2\handoff.md
Challenger Feedback Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\challenger_m1_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task.

Scope & Required Changes in `src/game/draw.ts`:
1. **Fix Unbounded `_rgbaCache` Growth**:
   In `src/game/draw.ts:27-35`:
   Quantize the alpha value to 2 decimal places: `const aQ = Math.round(a * 100) / 100; const key = `${hex}_${aQ}`;`.
   Add a cache size guard if size exceeds 2048: `if (_rgbaCache.size > 2048) _rgbaCache.clear();`.
2. **Defensive Null Context Guards**:
   Add `if (!ctx) return;` at the entry of all public/exported draw functions in `src/game/draw.ts` (`drawCharacter`, `drawHat`, `drawShieldHalo`, `drawRespawnProtectionRing`, `drawMonster`, etc.) so that headless or uninitialized calls safely no-op without throwing.

Verification Requirements:
1. Run `node tests/stress_m1_character_draw_benchmark.mjs` (must pass with `heapDiffMB < 30 MB` and 0 errors).
2. Run `node build-engine.cjs`.
3. Run `node node_modules/vite/bin/vite.js build`.
4. Run `node tests/e2e/runner.mjs` (401/401 tests pass).
5. Run `node tests/stress_m1_challenger_character.mjs`.

Write your handoff to `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\worker_m1_fix\handoff.md` and report back.
