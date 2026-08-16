# Handoff Report — Worker 1: Pixel Viewport & Rendering Pipeline (Milestone 1)

## 1. Observation
- **Context & Requirements**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `SCOPE.md` mandated the completion of Milestone 1: Pixel Viewport & Rendering Pipeline.
  - Required Features:
    - F01: Fixed 480×270 virtual canvas buffer.
    - F02: Integer nearest-neighbor blit with letterboxing/pillarboxing.
    - F03: 2-Stage coordinate mapping (`Screen` $\leftrightarrow$ `Virtual` $\leftrightarrow$ `World`).
    - F04: Integer camera snapping (`Math.round(camX)`, `Math.round(camY)`) to prevent subpixel jitter.
    - F05: Zero-GC Y-sorted render queue with 6 semantic layers and pre-allocated item pool.
    - F06: 3/4 perspective depth sorting & wall splitting support.
    - F07: Headless canvas guard (server/authoritative simulation compatibility).
- **Codebase Baseline**:
  - `src/game/engine.ts` previously had variable resolution matching window size, float camera translations, unlayered draw calls that rendered walls first and players second regardless of relative Y positions, and un-snapped mouse coordinates.
  - Headless server mode runs via `server/authoritative.mjs` and `server/engine.bundle.mjs` where `canvas` and `ctx` are `null`.

## 2. Logic Chain
1. **Viewport & Resolution Decoupling (F01–F04)**:
   - Designed `PixelViewport` (`src/game/viewport.ts`) with a constant 480×270 virtual buffer.
   - Designed integer scale factor $S = \max(1, \lfloor\min(W / 480, H / 270)\rfloor)$ with centered offsets $O_x, O_y$ and crisp nearest-neighbor blitting (`imageSmoothingEnabled = false`).
   - Implemented exact 2-stage coordinate transformation functions so mouse and UI inputs map unambiguously between screen pixels, virtual buffer pixels, and world coordinates.
   - Added `snapCamera(camX, camY)` and `getVisibleBounds(camX, camY, margin)` to enforce integer pixel alignment on the camera and avoid shimmer.
   - Built headless fallback into `createPixelViewport` so in Node.js environments it does not call DOM methods.

2. **Zero-GC Render Queue & Depth Sorting (F05–F07)**:
   - Created `RenderQueue` (`src/game/renderQueue.ts`) with 6 distinct `RenderLayer`s (`Ground = 0`, `Shadow = 1`, `YSorted = 2`, `Overhead = 3`, `AirborneFX = 4`, `ScreenUI = 5`).
   - Pre-allocated a pool of 2048 reusable `RenderItem` objects. Calling `push()` borrows from this pool, avoiding per-frame GC allocations.
   - For `YSorted` layer, implemented in-place hybrid sorting using InsertionSort for small collections ($N \le 16$) and 3-way QuickSort for larger collections ($N > 16$) with secondary `tieBreaker` key for deterministic, stable sorting.
   - Enabled 3/4 perspective depth ordering where walls submit front faces to `YSorted` with `sortY = footY`, ensuring entities behind walls (`y + size < footY`) render before the wall, and entities in front (`y + size >= footY`) render after the wall.

3. **GameEngine Integration**:
   - Integrated `PixelViewport` and `RenderQueue` into `src/game/engine.ts`.
   - Updated `resize()`, `onMouseMove()`, `inView()`, `render()`, and `renderNet()`.
   - Extracted single-entity drawing functions (`drawSingleWall`, `drawSingleDeployable`, `drawSinglePickup`, `drawSingleEnemy`, `drawSingleCombatant`, `drawSingleFoe`) to allow modular dispatch into the queue.

## 3. Caveats
- No canvas rendering occurs in headless server mode; `engine.viewport` and `engine.renderQueue` safely no-op when `ctx` is null.
- For 3/4 perspective wall splitting, collision physics remain untouched based on the full wall rectangle `[w.x, w.y, w.w, w.h]`.

## 4. Conclusion
- All Milestone 1 requirements (F01–F07) are fully implemented and verified with genuine logic, zero hardcoding, zero GC allocation during frame rendering, and complete headless/multiplayer compatibility.

## 5. Verification Method
1. **Production Build**:
   ```bash
   npm run build
   ```
   *Result*: Built Vite bundle and esbuild engine bundle with exit code 0.
2. **Server Smoke Test**:
   ```bash
   npm run smoke:server
   ```
   *Result*: `SMOKE TEST OK` (exit code 0).
3. **Multiplayer WebSocket Smoke Test**:
   ```bash
   npm run smoke:ws
   ```
   *Result*: `WS SMOKE TEST OK` (exit code 0).
4. **Simulation Benchmark**:
   ```bash
   node scripts/bench-sim.mjs
   ```
   *Result*: >34,000 Hz simulation capability.
5. **Milestone 1 Unit & Integration Test Suite**:
   ```bash
   node tests/unit_m1_viewport_renderqueue.mjs
   ```
   *Result*: 7/7 test suites passed (F01–F07 verified).
