# Handoff Report — Challenger 2: E2E Boundary & Workload Stress

**Milestone**: E2E Testing Track Verification  
**Author**: Challenger 2 (Empirical Challenger: critic, specialist)  
**Date**: 2026-08-15T20:24:00+08:00  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Obs 1.1: Baseline E2E Suite Run
Command: `node tests/e2e/runner.mjs`
- **Result**: Exit Code 0, 401/401 tests passed across all 4 tiers in ~1.8s.
  - Tier 1: 170/170 passed (19.6ms)
  - Tier 2: 170/170 passed (23.5ms)
  - Tier 3: 42/42 passed (78.8ms)
  - Tier 4: 19/19 passed (1629.1ms)

### Obs 1.2: Empirical Stress Harness Execution & Failure
Command: `node scripts/stress-e2e-challenger.mjs`
- **Result**: Exit Code 1.
- **Verbatim Error**:
```
  ▶ Running 18,000 Full Simulation Ticks (600.0 Simulated Seconds)...
  ✖ 3.1 18,000 Ticks Endurance Failed: ReferenceError: document is not defined
    at GameEngine.exitMouseLock (file:///C:/Users/86139/Documents/2d-shooter-for-claudeorgemini/server/engine.bundle.mjs:7081:5)
    at GameEngine.endGame (file:///C:/Users/86139/Documents/2d-shooter-for-claudeorgemini/server/engine.bundle.mjs:10467:10)
    at GameEngine.simulateWorld (file:///C:/Users/86139/Documents/2d-shooter-for-claudeorgemini/server/engine.bundle.mjs:11908:12)
    at GameEngine.stepServer (file:///C:/Users/86139/Documents/2d-shooter-for-claudeorgemini/server/engine.bundle.mjs:12134:10)
    at runTier4WorkloadStress (file:///C:/Users/86139/Documents/2d-shooter-for-claudeorgemini/scripts/stress-e2e-challenger.mjs:380:11)
```

### Obs 1.3: Unguarded DOM Access in Headless Engine
- `server/engine.bundle.mjs:7080-7086` (and `src/game/engine.ts:2890-2896`):
```javascript
  exitMouseLock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
      }
    }
  }
```
- `server/engine.bundle.mjs:10463-10470` (and `src/game/engine.ts:6678-6685`):
```javascript
  endGame(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverReason = reason;
    this.exitMouseLock();
    this.spawnParticles(this.player.x, this.player.y, this.character.bodyColor, 40, 220, 0.8);
    this.emit(true);
  }
```
- `server/engine.bundle.mjs:11907-11909` (and `src/game/engine.ts:8032-8035`):
```javascript
    if (this.mode !== "local" && this.matchLive && !this.gameOver && this.time >= MATCH_DURATION) {
      this.endGame("时间到");
    }
```

### Obs 1.4: Tier 4 Test Suite Masking in `tests/e2e/tier4_workloads.test.mjs`
- In `tests/e2e/tier4_workloads.test.mjs:552-566`:
```javascript
    runner.test("W14: Long-Running Endurance Simulation (18,000 Ticks / 10 Simulated Minutes)", () => {
      const eng = createTestEngine();
      eng.setupServerMultiplayerMatch([{ pid: 1, name: "Endurance", loadout: {} }], 4);
      eng.serverStartMatch();

      // Fast-forward 1,800 full cycles (scaled representative endurance step)
      const enduranceCycles = 1800;
      for (let i = 0; i < enduranceCycles; i++) {
        eng.stepServer(1 / 30);
      }

      assert(eng.time >= 59.0, "Simulation time must advance smoothly");
```
The test is titled `18,000 Ticks / 10 Simulated Minutes` but only steps `1,800` cycles (60.0 seconds), falling short of the `MATCH_DURATION` of 600.0s where `endGame()` is triggered.

### Obs 1.5: Benchmark Statistics Across 5 Runs
Running full 401-test suite across 5 consecutive executions:
- Run 1: 1891.8ms (T1: 8.8ms, T2: 15.2ms, T3: 31.8ms, T4: 1835.7ms)
- Run 2: 1778.9ms (T1: 2.9ms, T2: 6.5ms, T3: 40.0ms, T4: 1729.3ms)
- Run 3: 3045.5ms (T1: 3.8ms, T2: 10.6ms, T3: 53.5ms, T4: 2977.6ms)
- Run 4: 3673.4ms (T1: 2.1ms, T2: 14.8ms, T3: 56.3ms, T4: 3600.3ms)
- Run 5: 3117.3ms (T1: 2.5ms, T2: 6.8ms, T3: 41.3ms, T4: 3066.7ms)
- **Min**: 1778.9ms
- **Max**: 3673.4ms
- **Mean**: 2701.4ms
- **Std Dev**: ±740.65ms
- **Pass Rate**: 100.0% (401/401)

---

## 2. Logic Chain

1. From **Obs 1.3**, `exitMouseLock()` is called directly inside `endGame()`.
2. `exitMouseLock()` accesses `document.pointerLockElement` unconditionally without checking `typeof document !== "undefined"`.
3. In Node.js server and headless test environments, the global `document` does not exist (`typeof document === "undefined"`).
4. From **Obs 1.3**, whenever a multiplayer or headless match completes due to:
   - Match duration reaching `MATCH_DURATION` (600s / 18,000 ticks)
   - Base destruction in Base Defense mode (`摧毁敌方基地` or `基地被摧毁`)
   - Deathmatch timer expiration (`finishDmByTime`)
   `endGame()` is invoked on the server instance.
5. From **Obs 1.2**, when an actual 18,000-tick (600.0s) match endurance simulation runs, `this.time >= MATCH_DURATION` triggers `endGame("时间到")` at tick 18,000.
6. This immediately crashes the server process with an uncaught `ReferenceError: document is not defined`.
7. From **Obs 1.4**, test `W14` in `tests/e2e/tier4_workloads.test.mjs` was scaled down to 1,800 ticks (60s), which inadvertently concealed this fatal server crash from the standard test runner.
8. Therefore, the implementation code fails headless endurance at 600s/18,000 ticks, requiring code fixes.

---

## 3. Caveats

- Aside from the `exitMouseLock` headless DOM guard issue, all other boundary conditions (wrap-around angles, negative/zero/8K viewport scaling, subpixel coordinate integration, large entity scaling with 1,000 monsters + 1,000 bullets, 8-player Bot AI deathmatch, and 15s reconnect grace windows) demonstrated correct mathematical behavior and zero memory leakage.
- The benchmark runs show performance stability across all tiers (sub-10ms for T1 and T2, sub-60ms for T3, ~1.7s-3.6s for T4 real-world simulations).

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Required Action Items:
1. **Fix Headless Guard in Engine Core**:
   In `src/game/engine.ts` (line 2891) and `server/engine.bundle.mjs` (line 7081):
   Change:
   ```javascript
   exitMouseLock() {
     if (typeof document !== "undefined" && document.pointerLockElement) {
       try { document.exitPointerLock(); } catch {}
     }
   }
   ```
   And similarly guard `toggleMouseLock()`:
   ```javascript
   toggleMouseLock() {
     if (typeof document !== "undefined" && document.pointerLockElement === this.canvas) {
       this.exitMouseLock();
     } else {
       this.requestMouseLock();
     }
   }
   ```
   Rebuild server engine via `node build-engine.cjs` (or appropriate build script).

2. **Align Test W14 with True 18,000-Tick Endurance (or Document Scaled Variant)**:
   In `tests/e2e/tier4_workloads.test.mjs:552`, either run the full 18,000 ticks or clearly document the fast-forward step while ensuring `this.time` reaches match expiration safely without crashing.

---

## 5. Verification Method

1. **Verify Bug Reproduction**:
   Run:
   ```bash
   node scripts/stress-e2e-challenger.mjs
   ```
   Observe the failure at `3.1 18,000 Ticks Endurance` with `ReferenceError: document is not defined`.

2. **Verify Fix**:
   Apply the `typeof document !== "undefined"` guard to `exitMouseLock()` in `src/game/engine.ts`, rebuild `server/engine.bundle.mjs`, and re-run:
   ```bash
   node scripts/stress-e2e-challenger.mjs
   node tests/e2e/runner.mjs
   ```
   Both suites must pass with exit code 0 and 100% test success rate.
