## 2026-08-15T12:24:04Z
You are Worker 1 for the E2E Testing Track of FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter Refactor.
Your working directory is: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\worker_fix_1\

Please read:
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\TEST_INFRA.md
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\challenger_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
Address the issue identified by Challenger 2:
1. In `src/game/engine.ts`, fix `exitMouseLock()` and `toggleMouseLock()` (around lines 2885-2900) by adding `typeof document !== 'undefined'` guards so that invoking `endGame()` in headless Node.js environments does not throw `ReferenceError: document is not defined`.
   ```ts
   exitMouseLock() {
     if (typeof document !== 'undefined' && document.pointerLockElement) {
       try {
         document.exitPointerLock();
       } catch {
       }
     }
   }

   toggleMouseLock() {
     if (typeof document !== 'undefined' && document.pointerLockElement === this.canvas) {
       this.exitMouseLock();
     } else {
       this.requestMouseLock();
     }
   }
   ```
2. In `tests/e2e/tier4_workloads.test.mjs`, update test `W14` so that it steps a full match duration reaching `this.time >= MATCH_DURATION` (or full 18,000 ticks) and verifies that `eng.endGame()` executes cleanly without throwing any `ReferenceError` or crashes.
3. Rebuild the engine bundle and client: `cmd /c npm run build`.
4. Verify by running:
   - `node scripts/stress-e2e-challenger.mjs`
   - `node tests/e2e/runner.mjs`
   Both must pass cleanly with exit code 0.

Write your report to `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\worker_fix_1\handoff.md` and send a message when done.
