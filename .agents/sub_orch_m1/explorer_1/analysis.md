# Codebase & Architecture Analysis: Milestone 1 — Pixel Viewport & Rendering Pipeline

## 1. Executive Summary
Milestone 1 establishes the foundational 16/32-bit pixel rendering pipeline for FIRING STICKERS. This includes:
1. **Fixed Virtual Viewport Buffer (480×270)** with integer nearest-neighbor scaling and letterboxing/pillarboxing (`src/game/viewport.ts`).
2. **2-Stage Coordinate Transformation** (`Screen -> Virtual Pixel -> World`) for mouse, touch, and UI interaction.
3. **Integer Camera Snapping** (`Math.round`) to eliminate sub-pixel jitter and edge tearing.
4. **Zero-GC Y-Sorted Render Queue** (`src/game/renderQueue.ts`) for correct 3/4 perspective depth occlusion (`footY` ground anchor sorting, separating Ground -> Shadow -> YSorted -> Overhead -> AirborneFX -> ScreenUI).
5. **Headless Canvas Guard** enabling seamless dual-execution (browser 60 FPS client and Node.js 30Hz authoritative simulation without DOM/canvas dependencies).

---

## 2. Current Codebase & Architecture Analysis

### 2.1 Game Engine Structure (`src/game/engine.ts`)
- **Total Lines**: ~13,030 lines.
- **Core Loop & Tick**:
  - `start()` sets up the animation frame loop `loop(now: number)`.
  - Fixed / clamped simulation step: `update(dt: number)` (dt clamped to $\le 0.1$s).
  - Rendering pass: `render()` followed by legacy `pixelate()` pass.
- **Canvas & Context Initialization** (`engine.ts:1353`):
  ```ts
  this.canvas = canvas;
  this.ctx = canvas ? canvas.getContext("2d") : null;
  if (this.ctx) this.ctx.imageSmoothingEnabled = this.pixelSize <= 1;
  ```
  - When `canvas` is `null` (server authoritative mode), `this.ctx` is `null`.
- **Resize Handling** (`engine.ts:2775`):
  - Currently sets `this.W = rect.width`, `this.H = rect.height`, resizing the canvas directly to full window dimensions.
  - Camera follows player using floating-point coordinates `this.camX` and `this.camY` centered at `this.W / 2`, `this.H / 2`.
- **Current Rendering Sequence** (`engine.ts:10399`):
  - `render()` directly calls draw functions in fixed order:
    1. `drawBackground(ctx)`
    2. `ctx.translate(-this.camX, -this.camY)`
    3. `drawDecorations(ctx)`
    4. `drawWalls(ctx)`
    5. `drawDeployables(ctx)`
    6. `drawBase(ctx, ...)`
    7. `drawArenaBorder(ctx)`
    8. `drawFieldEffects(ctx)`
    9. `drawPickups(ctx)`
    10. `drawParticles(ctx)`
    11. `drawGrenades(ctx)`
    12. `drawEnemies(ctx)`
    13. `drawEnemyBullets(ctx)`
    14. `drawBeam(ctx)` / `drawFlameCone(ctx)` / `drawPixelTrain(...)`
    15. `combatants` / `drawPlayer(ctx)` / `foe`
    16. `drawAimPreview(ctx)` / `drawLauncherIndicator(ctx)`
    17. `drawBullets(ctx)` / `drawMeleeTrails(ctx)` / `drawEffects(ctx)` / `drawWeatherParticles(ctx)`
    18. `ctx.restore()`
    19. Screen overlays: `drawWeatherOverlays(ctx)`, `drawCrosshair(ctx)`, `drawOverlays(ctx)`
- **Current Limitation**:
  - Objects are rendered sequentially, causing depth inversion bugs (e.g. characters walk behind a wall when standing at its front base, or monsters clip incorrectly through props and other combatants).
  - Canvas scales arbitrarily with window size, lacking a locked pixel grid and creating non-uniform pixel aspect ratios.

---

## 3. Headless Mode & Build System Analysis

### 3.1 Headless Build & Execution
- **Bundling** (`build-engine.cjs`):
  - Uses `esbuild` to compile `src/game/engine.ts` into `server/engine.bundle.mjs` (Node.js ESM target).
  - Stubs `ai.worker.ts` with a dummy class.
- **Authoritative Server** (`server/authoritative.mjs`):
  - Imports `GameEngine` from `./engine.bundle.mjs`.
  - Instantiates `new GameEngine(null, hostLoadout, () => {}, { mode: "server" })`.
  - Calls `eng.startHeadless()`, `eng.setupServerMatch(...)`, `eng.serverStartMatch()`.
  - Drives simulation via `eng.setPeerInput(...)` and `eng.stepServer(1 / 30)`.
- **Smoke Tests** (`scripts/smoke-server.mjs`):
  - Runs headless engine in Node without DOM / canvas.
  - Exits with code 0 if simulation advances and snapshots are produced.
- **Crucial Requirement**:
  - Any new modules (`viewport.ts`, `renderQueue.ts`) MUST NOT access global `window`, `document`, `HTMLCanvasElement`, or `Image` at module top-level scope or in headless mode.
  - All DOM/Canvas calls must be guarded behind `typeof document !== 'undefined'` and null checks on `canvas` / `ctx`.

---

## 4. Feature Specifications & Integration Blueprint

### 4.1 F01 & F02: Fixed Virtual Viewport Buffer & Integer Nearest-Neighbor Blit
- **Location**: `src/game/viewport.ts`
- **Specification**:
  - Fixed internal virtual resolution: `VIRTUAL_W = 480`, `VIRTUAL_H = 270` (16:9).
  - Internal virtual buffer: `virtualCanvas` (480×270) with `virtualCtx`.
  - `resize(displayW: number, displayH: number)`:
    - `scale = Math.max(1, Math.floor(Math.min(displayW / 480, displayH / 270)))`
    - `destW = 480 * scale`, `destH = 270 * scale`
    - `offsetX = Math.floor((displayW - destW) / 2)`
    - `offsetY = Math.floor((displayH - destH) / 2)`
  - `beginFrame()`:
    - Clears virtual canvas: `virtualCtx.clearRect(0, 0, 480, 270)`.
    - Resets transform: `virtualCtx.setTransform(1, 0, 0, 1, 0, 0)`.
  - `endFrame(displayCtx: CanvasRenderingContext2D)`:
    - `displayCtx.setTransform(1, 0, 0, 1, 0, 0)`.
    - `displayCtx.imageSmoothingEnabled = false`.
    - Fills letterbox/pillarbox background with `#000000`.
    - Nearest-neighbor blit: `displayCtx.drawImage(virtualCanvas, 0, 0, 480, 270, offsetX, offsetY, destW, destH)`.

### 4.2 F03: 2-Stage Coordinate Mapping
- **Location**: `src/game/viewport.ts`
- **Formulas**:
  1. **Screen to Virtual**:
     $$\begin{aligned}
     vx &= \text{clamp}\left(\frac{\text{screenX} - \text{offsetX}}{\text{scale}}, 0, 480\right) \\
     vy &= \text{clamp}\left(\frac{\text{screenY} - \text{offsetY}}{\text{scale}}, 0, 270\right)
     \end{aligned}$$
  2. **Virtual to World**:
     $$\begin{aligned}
     wx &= vx + \text{camX} \\
     wy &= vy + \text{camY}
     \end{aligned}$$
  3. **World to Virtual**:
     $$\begin{aligned}
     vx &= wx - \text{camX} \\
     vy &= wy - \text{camY}
     \end{aligned}$$
  4. **World to Screen**:
     $$\begin{aligned}
     \text{screenX} &= \text{offsetX} + (wx - \text{camX}) \cdot \text{scale} \\
     \text{screenY} &= \text{offsetY} + (wy - \text{camY}) \cdot \text{scale}
     \end{aligned}$$

### 4.3 F04: Integer Camera Snapping
- **Location**: `src/game/engine.ts`
- **Camera Target Calculation**:
  - Target centered on virtual screen:
    $$\begin{aligned}
    \text{targetCamX} &= \text{player.x} - 240 \\
    \text{targetCamY} &= \text{player.y} - 135
    \end{aligned}$$
  - Smooth simulation smoothing: $\text{camX} \mathrel{+}= (\text{targetCamX} - \text{camX}) \cdot \min(1, 8 \cdot dt)$.
  - Rendering integer snapping:
    $$\begin{aligned}
    \text{renderCamX} &= \text{Math.round}(\text{camX}) \\
    \text{renderCamY} &= \text{Math.round}(\text{camY})
    \end{aligned}$$
  - All world rendering translates by $(-\text{renderCamX}, -\text{renderCamY})$.

### 4.4 F05: Zero-GC Y-Sorted Render Queue
- **Location**: `src/game/renderQueue.ts`
- **Layers**:
  ```ts
  export const enum RenderLayer {
    Ground = 0,     // Floor tiles, decals, bloodstains, tracks
    Shadow = 1,     // Drop shadows under characters, walls, props
    YSorted = 2,    // Wall front faces, props, characters, enemies, deployables, pickups, melee slashes
    Overhead = 3,   // Wall top faces, canopy, roofs
    AirborneFX = 4, // Flying shells, lobbed projectiles, floating sparks, smoke puffs
    ScreenUI = 5,   // Floating combat text, minimap, HUD overlays
  }
  ```
- **Zero-GC Pool Design**:
  - Pre-allocated `RenderItem[]` array (initial capacity 2048).
  - Pre-allocated index array `int32[]` for sorting without object churn.
  - Sorting criteria:
    1. Primary key: `layer` (ascending 0..5).
    2. Secondary key for `YSorted` (Layer 2): `sortY` (ascending foot coordinate).
    3. Stable tie-breaker: `id` (insertion order) to prevent flickering between overlapping items at same Y.
  - `flush(ctx: CanvasRenderingContext2D)`:
    - Iterates through sorted items, invokes `item.draw(ctx)`.
    - Resets `itemCount = 0` (zero allocations per frame).

### 4.5 F06: 3/4 Perspective Wall Split
- **Wall Splitting**:
  - Base footprint (physics & collision): rectangle at `(w.x, w.y, w.w, w.h)`.
  - Top Face (roof slab): pushed to `RenderLayer.Overhead` (or static backdrop).
  - Front Face (vertical facade): pushed to `RenderLayer.YSorted` with `sortY = w.y + w.h`.
  - Shadow: pushed to `RenderLayer.Shadow` with `w.y + w.h`.

### 4.6 F07: Headless Canvas Guard
- In `src/game/viewport.ts`:
  - `createViewport(config?: PixelViewportConfig): PixelViewport` checks `typeof document !== 'undefined'`.
  - Returns headless-safe implementation if `document` is missing or `canvas` is null.
- In `src/game/renderQueue.ts`:
  - `createRenderQueue(capacity?: number): RenderQueue` does not require canvas on creation.
  - `flush(ctx)` early returns when `!ctx`.

---

## 5. Touchpoint Mapping in `src/game/engine.ts`

| Line Range | Current Logic | Proposed Milestone 1 Refactoring |
|---|---|---|
| ~1350-1370 | Constructor assigns `this.canvas`, `this.ctx` | Initialize `this.viewport = createViewport({ virtualW: 480, virtualH: 270 })`, `this.renderQueue = createRenderQueue(2048)`. |
| ~2775-2795 | `resize()` sets `this.W = rect.width`, `this.H = rect.height` | `this.W = 480; this.H = 270;` `this.viewport.resize(rect.width, rect.height);` `this.canvas.width = rect.width; this.canvas.height = rect.height;` |
| ~2900-2917 | `onMouseMove(e)` maps mouse coordinates | Use `this.viewport.screenToVirtual(e.clientX - rect.left, e.clientY - rect.top)` and convert to world coordinates using snapped camera. |
| ~3462-3478 | Camera target centering `player.x - this.W / 2` | Set camera target based on fixed `480 / 2 = 240` and `270 / 2 = 135`. |
| ~10399-10546 | `render()` monolithic draw routine | 1. `if (!this.ctx) return;`<br>2. `this.viewport.beginFrame()` -> `vCtx = this.viewport.virtualCtx`<br>3. `this.renderQueue.clear()`<br>4. Queue world drawables into `renderQueue` with proper layers and `sortY`<br>5. `vCtx.translate(-renderCamX, -renderCamY)`<br>6. `this.renderQueue.flush(vCtx)`<br>7. `this.viewport.endFrame(this.ctx)` |
| ~9257-9406 | `renderNet(ctx)` multiplayer mirror | Utilize same `viewport` and `renderQueue` pipeline to guarantee identical depth sorting in multiplayer. |

---

## 6. Verification and Invalidation Criteria
- **Build Verification**: `npm.cmd run build` and `npm.cmd run build:engine` must pass with zero TypeScript / bundling errors.
- **Headless Verification**: `npm.cmd run smoke:server` and `node scripts/bench-sim.mjs` must succeed with zero canvas / DOM crashes.
- **Multiplayer Compatibility**: Authoritative server snapshot and simulation must remain 100% compatible.
