# Handoff Report: Milestone 1 — Pixel Viewport & Rendering Pipeline

## 1. Observation
- **Codebase & Entry Points**:
  - `src/game/engine.ts` (13,030 lines) contains the primary simulation loop and canvas rendering methods.
  - `build-engine.cjs` bundles `src/game/engine.ts` via `esbuild` into `server/engine.bundle.mjs` (Node ESM).
  - `server/authoritative.mjs` runs headless simulation using `new GameEngine(null, hostLoadout, () => {}, { mode: "server" })`.
- **Canvas & Headless Handling**:
  - `engine.ts:1359-1363`: `this.ctx = canvas ? canvas.getContext("2d") : null;`
  - `engine.ts:1480-1483`: `startHeadless()` skips all DOM/rAF setup.
  - `engine.ts:10400-10402`: `render()` begins with `const ctx = this.ctx; if (!ctx) return;`.
- **Current Viewport & Scaling**:
  - `engine.ts:2775-2792`: `resize()` sets `this.W = rect.width; this.H = rect.height;` resizing canvas directly to display dimensions without fixed aspect ratio or virtual pixel buffer.
  - `engine.ts:2900-2917`: `onMouseMove()` uses `scaleX = this.W / rect.width`, mapping mouse to world as `this.mouse.x = cursorScreen.x + this.camX`.
  - `engine.ts:3462-3475`: Camera follows player with floating-point target `player.x - this.W / 2`, causing sub-pixel shimmer when moving.
- **Current Rendering Sequence**:
  - `engine.ts:10399-10546`: `render()` draws world elements in hardcoded order: Background -> Walls -> Deployables -> Pickups -> Particles -> Enemies -> Bullets -> Combatants/Player -> Overlays. No dynamic Y-sorting exists, leading to depth inversion between characters, props, and walls.
- **Verification Commands Executed**:
  - `npm.cmd run smoke:server`: exited code 0, player moved, 11 bullets spawned, snapshot verified.
  - `node scripts/bench-sim.mjs`: exited code 0, simulation running at ~29,400 Hz.
  - `npm.cmd run build`: exited code 0, Vite build + fix-file-protocol + build:engine succeeded.

---

## 2. Logic Chain
1. **From Observation on Dual Execution (Browser vs Node)**:
   Because `GameEngine` is bundled via esbuild and executed in Node.js for authoritative server multiplayer (`server/authoritative.mjs`) and smoke tests (`smoke-server.mjs`), all new rendering modules (`src/game/viewport.ts` and `src/game/renderQueue.ts`) must be safe in environments where `document`, `window`, and `HTMLCanvasElement` do not exist.
2. **From Observation on Viewport Scaling (F01-F03)**:
   The current dynamic `this.W` and `this.H` based on window size prevents authentic 16-bit retro pixel rendering and makes pixel art look stretched or inconsistent. Implementing `PixelViewport` with internal 480×270 virtual canvas buffer and integer nearest-neighbor blit (`imageSmoothingEnabled = false`) with letterboxing/pillarboxing ensures integer scaling on any monitor (1080p -> 4x, 1440p -> 5x, 4K -> 8x).
3. **From Observation on Coordinate Mapping (F03)**:
   Because the display canvas contains letterbox/pillarbox bars (`offsetX`, `offsetY`) and integer scale factor (`scale`), mouse/touch coordinates from DOM events cannot simply divide by window width. They must undergo 2-stage transformation: `(Screen -> Virtual Pixel -> World)` and inverse `(World -> Virtual Pixel -> Screen)`.
4. **From Observation on Sub-Pixel Shimmer (F04)**:
   Camera coordinates currently float smoothly as real numbers, causing fractional pixel offsets during canvas drawing. Using `Math.round(camX)` and `Math.round(camY)` for all render transformations eliminates edge jitter while allowing smooth 60fps simulation physics.
5. **From Observation on Rendering Order & Depth (F05, F06)**:
   The current sequential draw calls cannot handle 3/4 perspective occlusion where characters need to be behind walls when north of the wall base, but in front of walls when south of the wall base. A pre-allocated, zero-GC layered render queue sorting world entities by `footY` ground anchor (`RenderLayer.YSorted`) resolves all depth sorting without per-frame garbage collection.

---

## 3. Caveats
- **React UI Overlay in `GameScreen.tsx`**: React HUD components are currently rendered over the full-screen canvas. When letterbox/pillarbox is active, HUD elements can either sit over the game viewport or within the screen bounds. In Milestone 1, the canvas handles its own letterboxing; Milestone 4 will build the dedicated retro pixel arcade HUD.
- **Multiplayer Guest Rendering (`renderNet`)**: In multiplayer mode, guest clients render from snapshots (`engine.ts:9257`). The same `renderQueue` and `viewport` transformations must be used in `renderNet()` so that multiplayer depth sorting is identical to singleplayer.

---

## 4. Conclusion
Milestone 1 is ready for implementation:
1. Create `src/game/viewport.ts` implementing `PixelViewport` (480×270 virtual canvas, integer scaling, letterbox blitting, 2-stage coordinate transformation, headless-safe guard).
2. Create `src/game/renderQueue.ts` implementing `RenderQueue` (zero-GC pre-allocated pool, 6 render layers, `footY` sorting, headless-safe guard).
3. Integrate `PixelViewport` and `RenderQueue` into `src/game/engine.ts` across `constructor`, `resize()`, `onMouseMove()`, `render()`, and `renderNet()`.
4. Ensure all tests (`npm.cmd run smoke:server`, `node scripts/bench-sim.mjs`, `npm.cmd run build`) continue to pass with zero regressions.

---

## 5. Verification Method
1. **Type & Build Check**:
   ```powershell
   npm.cmd run build
   ```
   Must compile TypeScript without errors, produce `dist/index.html`, and build `server/engine.bundle.mjs`.
2. **Headless Server Simulation Check**:
   ```powershell
   npm.cmd run smoke:server
   ```
   Must execute without DOM/canvas runtime errors and output `SMOKE TEST OK`.
3. **Simulation Performance Benchmark**:
   ```powershell
   node scripts/bench-sim.mjs
   ```
   Must achieve > 10,000 Hz simulation rate in Node.js headless mode.
4. **Coordinate Transformation Accuracy**:
   Inspect `src/game/viewport.ts` unit tests verifying:
   - `screenToVirtual(offsetX, offsetY) === (0, 0)`
   - `virtualToWorld(240, 135, camX, camY) === (camX + 240, camY + 135)`
   - `worldToVirtual(wx, wy, camX, camY) === (wx - camX, wy - camY)`
