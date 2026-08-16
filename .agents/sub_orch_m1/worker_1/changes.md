# Changes Made — Milestone 1: Pixel Viewport & Rendering Pipeline

## 1. New File: `src/game/viewport.ts`
- **Purpose**: Implement the fixed-resolution pixel viewport, integer nearest-neighbor scaling, letterbox/pillarbox positioning, 2-stage coordinate transformations, and integer camera snapping (F01–F04).
- **Key Details**:
  - `PixelViewport`: Manages a fixed 480×270 virtual buffer canvas and handles nearest-neighbor scaling to the display canvas.
  - Scale computation: $S = \max(1, \lfloor\min(W / 480, H / 270)\rfloor)$ with centered offsets $O_x = \lfloor(W - 480 \cdot S)/2\rfloor$ and $O_y = \lfloor(H - 270 \cdot S)/2\rfloor$.
  - 2-Stage coordinate mappings:
    - Stage 1: `screenToVirtual(sx, sy)` & `virtualToScreen(vx, vy)`
    - Stage 2: `virtualToWorld(vx, vy, camX, camY)` & `worldToVirtual(wx, wy, camX, camY)`
    - Direct helpers: `screenToWorld(sx, sy, camX, camY)`, `worldToScreen(wx, wy, camX, camY)`, `screenDeltaToVirtual(dx, dy)`.
  - Camera snapping: `snapCamera(camX, camY)` producing rounded integer coords `{ x: Math.round(camX), y: Math.round(camY) }` to prevent pixel jitter / subpixel bleeding.
  - Frustum calculation: `getVisibleBounds(camX, camY, margin)`.
  - Headless guard: `createPixelViewport()` detects non-DOM Node environments (`typeof document === "undefined"`), avoids allocating canvas elements, and makes `beginFrame()` / `endFrame()` safe no-ops.

## 2. New File: `src/game/renderQueue.ts`
- **Purpose**: Zero-GC, pre-allocated Y-sorted render queue with 6 semantic layers and depth sorting (F05–F07).
- **Key Details**:
  - `RenderLayer` enum:
    - Layer 0 (`Ground`): Floor tiles, decorations, base plates, arena borders, ground effects.
    - Layer 1 (`Shadow`): Ground shadows for entities and walls.
    - Layer 2 (`YSorted`): Depth-sorted world entities (walls front faces, players, enemies, deployables, pickups, train).
    - Layer 3 (`Overhead`): Rooftops, tree canopies, tall structures above characters.
    - Layer 4 (`AirborneFX`): Bullets, missiles, flying particles, grenade arcs, beams, flames.
    - Layer 5 (`ScreenUI`): Weather overlays, crosshair, health bars, vignette, HUD.
  - Zero-GC pool: Pre-allocates 2048 reusable `RenderItem` instances, dynamically doubles capacity if exceeded, and resets indices via `clear()` with zero heap allocations per frame.
  - In-place hybrid sorting: For `YSorted` layer, uses InsertionSort for small arrays ($N \le 16$) and 3-way partition QuickSort for larger arrays ($N > 16$), utilizing `sortY` as primary key and `tieBreaker` as secondary key.
  - Headless guard: `flush()`, `flushWorld()`, `flushScreenUI()` accept `CanvasRenderingContext2D | null` and gracefully clear queue without throwing in headless environments.

## 3. Modified File: `src/game/engine.ts`
- **Purpose**: Integrate `PixelViewport` and `RenderQueue` into the core game loop.
- **Key Details**:
  - Imported `PixelViewport`, `createPixelViewport`, `RenderQueue`, and `RenderLayer`.
  - Initialized `viewport` (fixed 480×270) and `renderQueue` in `GameEngine` constructor.
  - Updated `resize()`: Calculates integer scale and offsets via `viewport.resize(screenW, screenH)`. Sets `this.W = 480` and `this.H = 270`.
  - Updated mouse handling (`onMouseMove`, `onMouseDown`, `update()`): Uses `this.viewport.screenToVirtual()` and `this.viewport.virtualToWorld()` for accurate cursor aim in world coordinates.
  - Refactored `render()` and `renderNet()`:
    - Clears render queue at frame start.
    - Submits scene elements into their respective semantic `RenderLayer`s.
    - Walls front faces and entities submitted with `sortY = footY` for 3/4 perspective depth ordering.
    - Transforms world canvas with integer-snapped camera (`snapCam`).
    - Flushes world layers, draws ScreenUI layer, and blits virtual buffer to the main display canvas via `viewport.endFrame(ctx)`.
  - Extracted modular draw helpers: `drawSingleWall`, `drawSingleDeployable`, `drawSinglePickup`, `drawSingleEnemy`, `drawSingleCombatant`, `drawSingleFoe`.
  - Updated `inView()` culling to use snapped camera bounds.

## 4. New File: `tests/unit_m1_viewport_renderqueue.mjs`
- **Purpose**: Unit and integration test suite verifying F01 through F07.
- **Key Details**:
  - Test 1: Headless engine instantiation and viewport configuration.
  - Test 2: Viewport integer scaling and letterbox/pillarbox calculation across 1080p, 1440p, 4K, 1366x768, and 21:9 ultrawide.
  - Test 3: Bidirectional 2-stage coordinate transformations and delta conversions.
  - Test 4: Integer camera snapping and visible frustum bounds calculation.
  - Test 5: Zero-GC RenderQueue 6-layer execution and 3/4 perspective Y-sorting.
  - Test 6: Large-scale 3-way QuickSort stability with tie-breaker keys.
  - Test 7: Headless null context safety checks.

## 5. Modified File: `scripts/smoke-ws.mjs`
- **Purpose**: Modernize the multiplayer WebSocket smoke test to match the authoritative room lobby protocol (`createRoom`, `joinRoom`, `setReady`, `startMatch`).
