# Handoff Report — Challenger 1: Milestone 1 Adversarial Review

**Verdict**: **APPROVE**  
**Role**: Empirical Challenger (critic, specialist)  
**Target Files**: `src/game/viewport.ts`, `src/game/renderQueue.ts`, `src/game/engine.ts`  
**Test Artifact**: `tests/adversarial_m1_viewport.mjs`

---

## 1. Observation
- Implemented and executed a dedicated adversarial test suite `tests/adversarial_m1_viewport.mjs` covering 6 attack dimensions:
  - **Extreme aspect ratios & resolutions**: 32:9 ultra-wide (5120x1440, 7680x2160), 9:16 portrait (1080x1920, 360x640), 8K UHD (7680x4320), tiny displays (100x100, 1x1), degenerate/negative (0x0, -500x-300), and fractional floats (1920.73x1080.29).
  - **Negative & out-of-bounds coordinates**: Mouse clicks in letterbox margins, negative screen inputs (-400, -200), and clamped vs unclamped transformations.
  - **Sub-pixel camera values & anti-jitter**: Camera positions `100.1`, `100.499`, `-0.4`, `-100.5`, `999999.4` and sub-pixel incremental sweeps verifying zero drift on rendered entities.
  - **Round-trip bijective invariance fuzzing**: Over 100,000 randomized points verifying `worldToScreen(screenToWorld(p))` and `screenToVirtual(virtualToScreen(p))` maintain precision within $10^{-9}$.
  - **Frustum & visible bounds culling accuracy**: 10,000 random world objects verified for exact equivalence between world-space AABB and virtual-space bounds with margin.
  - **RenderQueue stress**: 5,000-item auto-expansion, 1,000 identical `sortY` collisions, extreme floats ($-10^9$ to $+10^9$), and headless `null` context flushes.
- **Test execution results**:
  - `node tests/adversarial_m1_viewport.mjs` -> 23/23 tests passed (exit code 0).
  - `npm.cmd run build` -> Built Vite & esbuild bundles successfully (exit code 0).
  - `node scripts/smoke-server.mjs` -> Passed (exit code 0).
  - `node scripts/smoke-ws.mjs` -> Passed (exit code 0).
  - `node tests/unit_m1_viewport_renderqueue.mjs` -> 7/7 suites passed (exit code 0).
  - `node scripts/bench-sim.mjs` -> >31,000 Hz simulation capability (exit code 0).

---

## 2. Logic Chain
1. **Resolution Bounds (Observation 1.1–1.9)**: `PixelViewportImpl.resize()` enforces integer floors and clamping $\ge 1$ on display dimensions and scale factor $S = \max(1, \lfloor\min(W/480, H/270)\rfloor)$. This guarantees letterbox offsets $O_x, O_y$ remain integer pixel aligned and never produce division by zero, negative scale, or blurry non-integer pixel blits.
2. **Bijective Invertibility (Observation 4.1–4.3)**: Transformation formulas $V_x = (S_x - O_x)/S$ and $S_x = O_x + V_x \cdot S$ form an exact linear bijection. Across 100,000 fuzzed iterations, the composition $\text{Inverse} \circ \text{Forward}$ returned the original values within float error $< 10^{-9}$.
3. **Sub-Pixel Camera Snapping (Observation 3.1–3.2)**: Snapping $camX, camY$ via `Math.round()` across all transformations guarantees that static world objects do not jitter or wobble when camera velocity creates fractional subpixel offsets.
4. **Frustum Bounds Culling (Observation 5.1–5.2)**: `getVisibleBounds()` directly matches the projected virtual viewport with margin, ensuring culling rejects all out-of-screen objects without clipping partially visible edge entities.
5. **RenderQueue Robustness (Observation 6.1–6.4)**: Dynamic pool resizing, stable QuickSort with tie-breakers, and graceful handling of `null` canvas contexts guarantee high stability under high entity loads and headless server execution.

---

## 3. Caveats
- Clamping (`clamp = true`) in `screenToVirtual` should be used specifically for UI/aim cursor bounds when the cursor leaves the active viewport letterbox area. Unclamped transformations accurately project out-of-bounds clicks linearly into virtual/world space.
- No other caveats identified; the implementation satisfies all mathematical and architectural criteria.

---

## 4. Conclusion
- **Verdict**: **APPROVE**
- Milestone 1 Viewport and Rendering Pipeline features (F01–F07) are mathematically verified, robust against adversarial edge cases, and ready for Milestone 2.

---

## 5. Verification Method
To independently reproduce and verify:
```bash
# Run Adversarial Test Suite
node tests/adversarial_m1_viewport.mjs

# Run Milestone 1 Unit Tests
node tests/unit_m1_viewport_renderqueue.mjs

# Verify Server & WebSocket Smoke Tests
node scripts/smoke-server.mjs
node scripts/smoke-ws.mjs

# Verify Production Build
npm.cmd run build
```
