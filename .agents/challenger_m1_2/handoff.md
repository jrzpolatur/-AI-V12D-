# Milestone 1 Challenger 2 Empirical Review & Benchmark Report

## 1. Observation

### Observation 1.1: Unbounded Heap Memory Growth in `_rgbaCache`
- **File**: `src/game/draw.ts`, lines 26–35
```typescript
const _rgbaCache = new Map<string, string>();
export function rgba(hex: string, a: number): string {
  const key = `${hex}_${a}`;
  const cached = _rgbaCache.get(key);
  if (cached) return cached;
  const [r, g, b] = hexToRgb(hex);
  const res = `rgba(${r},${g},${b},${a})`;
  _rgbaCache.set(key, res);
  return res;
}
```
- **Benchmark Command**: `node --expose-gc tests/stress_m1_character_draw_benchmark.mjs`
- **Measured Result**:
  - 100,000 `rgba(hex, 0.5 + 0.5 * Math.sin(t))` calls produced **+27.52 MB** heap growth.
  - In a 10,000-frame multi-entity continuous simulation (16 players with oscillating visors, beacon pulses, and shield/respawn rings), `_rgbaCache` retained tens of thousands of unique IEEE-754 floating-point string keys (e.g. `"#38bdf8_0.8193817491028347"`), causing an unbounded memory leak.

### Observation 1.2: Direct Invocation of Character Draw Functions with `null` Context Crashes
- **File**: `src/game/draw.ts`, lines 78–89, 305–315, 386–396, 511–545, 873–884
- **Invocation & Verbatim Error**:
  - `drawCharacter(null, { ... })` -> `TypeError: Cannot read properties of null (reading 'save')`
  - `drawHat(null, 'helmet', '#38bdf8', 16, 0, false)` -> `TypeError: Cannot read properties of null (reading 'save')`
  - `drawShieldHalo(null, 0, 0, 16, 1.0, 1.0)` -> `TypeError: Cannot read properties of null (reading 'save')`
  - `drawRespawnProtectionRing(null, 0, 0, 16, 1.0, 1.0)` -> `TypeError: Cannot read properties of null (reading 'save')`
  - `drawMonster(null, { ... })` -> `TypeError: Cannot read properties of null (reading 'save')`
- **Cause**: None of these functions contain defensive `if (!ctx) return;` entry guards.

### Observation 1.3: High-Throughput Performance under Dummy/Mock Context
- **Benchmark Run**: 10,000 continuous frames with 16 simultaneous players (160,000 total character draw calls + 17,579,682 dummy canvas operations).
- **Execution Time**: 1,814.12 ms total (~0.181 ms per 16-entity frame).
- **Effective Throughput**: 88,197 `drawCharacter` calls/sec.
- **Sub-routines**: `drawHat` (80,000 calls across all 8 hat styles), `drawShieldHalo` (10,000 calls), `drawRespawnProtectionRing` (10,000 calls), `drawMonster` (90,000 calls across 9 archetypes), and `drawGadgetModel` (80,000 calls) completed in <0.5s per 10k calls without arithmetic or NaN bugs.

---

## 2. Logic Chain

1. **Step 1 (Memory Leak Mechanics)**: Character animation features (F01 glowing visors, F05 shield halo pulse, F06 golden protection ring pulse, F07 cloak refraction) calculate alpha values dynamically using sinusoidal functions of continuous time `t` (e.g. `0.75 + 0.25 * Math.sin(t * 8)`).
2. **Step 2 (Cache Key Non-Convergence)**: `rgba()` creates cache keys with `${hex}_${a}` without quantizing `a`. Because `t` progresses continuously, `a` yields a distinct float on virtually every frame, producing a 0% cache hit rate and generating unbounded entries in `_rgbaCache`.
3. **Step 3 (Heap Impact)**: Because `_rgbaCache` is a module-level `Map` with no maximum size or eviction policy, all generated string keys and values remain referenced indefinitely in the heap, causing linear memory expansion (~27.5 MB per 100k calls).
4. **Step 4 (Headless Robustness)**: In headless servers, workers, or edge tests where a Canvas context may be null or omitted, standalone draw routines (`drawCharacter`, `drawHat`, etc.) directly access `ctx.save()` without checking `if (!ctx) return;`, triggering unhandled `TypeError` exceptions.
5. **Step 5 (Conclusion)**: Although rendering throughput on valid mock contexts is exceptional (88,000+ draws/sec), the unbounded cache memory leak and missing null guards violate the zero-GC and headless server safety acceptance criteria.

---

## 3. Caveats

- In browser runtime when `GameEngine.prototype.render()` is called, `GameEngine` has an outer guard `if (!this.ctx) return;`, which protects the engine loop from passing `null` directly. However, individual draw helper calls, isolated tests, and worker routines remain unprotected.
- The `_shadeCache` Map does not leak significantly because `amt` values passed in code are fixed constants (e.g., `0.2`, `-0.22`, `-0.38`), resulting in a small bounded set of keys.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

### Required Modifications:
1. **Quantize Alpha in `rgba()` or Cap `_rgbaCache` (`src/game/draw.ts`)**:
   Quantize the alpha value to 2 decimal places to restrict cache size to at most 101 entries per color:
   ```typescript
   export function rgba(hex: string, a: number): string {
     const qa = Math.round(a * 100) / 100;
     const key = `${hex}_${qa}`;
     const cached = _rgbaCache.get(key);
     if (cached) return cached;
     const [r, g, b] = hexToRgb(hex);
     const res = `rgba(${r},${g},${b},${qa})`;
     _rgbaCache.set(key, res);
     return res;
   }
   ```
2. **Add Defensive `if (!ctx) return;` Entry Guards (`src/game/draw.ts`)**:
   Add `if (!ctx) return;` at the beginning of `drawCharacter`, `drawHat`, `drawShieldHalo`, `drawRespawnProtectionRing`, `drawMonster`, `drawGadgetModel`, `drawWeapon`, `drawGadgetIcon`, and `roundRect`.

---

## 5. Verification Method

To verify these findings or validate subsequent fixes:

```bash
# 1. Run the empirical draw benchmark & headless stress test
node --expose-gc tests/stress_m1_character_draw_benchmark.mjs

# 2. Run unit and integration tests
node tests/unit_m1_character_animation.mjs
node tests/stress_m1_renderqueue_headless.mjs

# 3. Run full E2E test suite (Tiers 1-4)
node tests/e2e/runner.mjs

# 4. Build Vite production bundle
node ./node_modules/vite/bin/vite.js build
```

**Invalidation Conditions**:
- If `rgba()` quantizes alpha such that 100,000 continuous float calls result in `<0.5 MB` heap growth and `_rgbaCache.size <= 500`.
- If `drawCharacter(null, ...)` and all draw helper functions return safely without throwing `TypeError`.
