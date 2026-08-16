# FIRING STICKERS · Rendering Architecture & Build System Survey Report (R1 Focus)

## 1. Executive Summary

This report provides an in-depth survey of the current rendering architecture, coordinate systems, viewport scaling, layer ordering, and build system of **FIRING STICKERS**, and details the technical requirements for **Requirement 1 (R1: Pixel Viewport & Rendering Pipeline)** to transform the game into a 16-bit / 32-bit pixel dungeon shooter (inspired by *Enter the Gungeon* and *Soul Knight*).

### Core Findings
1. **Current Rendering Paradigm**: The game currently renders procedural vector-style pixel approximations directly onto a dynamic, full-resolution `<canvas>` (`canvas.width = screenW`, `canvas.height = screenH`). On high-DPI displays (e.g. 1080p, 1440p, 4K), this results in non-uniform pixel sizing ("mixels"), varying FOV between players, and sub-pixel edge artifacts.
2. **Missing Y-Sort Depth Occlusion**: Rendering is currently structured in rigid, hardcoded type-based batches (all walls → all deployables → all enemies → all players → all bullets → all effects). There is no Y-sorting based on foot/ground contact points, causing visual occlusion anomalies in 3/4 perspective (e.g. entities cannot stand behind or in front of walls/props correctly).
3. **Engine-Server Shared Codebase**: `src/game/engine.ts` (13,000+ LOC) is compiled both for the client (via Vite + React) and for the authoritative multiplayer server via `build-engine.cjs` (esbuild bundling `engine.ts` to `server/engine.bundle.mjs`). Any rendering refactoring must maintain headless/server compatibility (`canvas === null` / `ctx === null`).
4. **Clean Build Pipeline**: The project builds cleanly with `vite build` + `viteSingleFile` + `build-engine.cjs`. Strict TypeScript settings are enforced.

---

## 2. Current Codebase & Architecture Analysis

### 2.1 Canvas Mounting & Component Lifecycle

- **Mount Point (`src/components/GameScreen.tsx:339-342`)**:
  ```tsx
  <canvas
    ref={canvasRef}
    className="absolute inset-0 h-full w-full cursor-none touch-none"
  />
  ```
- **Engine Initialization (`src/components/GameScreen.tsx:254-273`)**:
  ```tsx
  const canvas = canvasRef.current!;
  const engine = new GameEngine(canvas, loadout, setHud, { mode, net });
  engineRef.current = engine;
  engine.start();
  ```
- **Context Creation (`src/game/engine.ts:1354-1363`)**:
  ```ts
  this.canvas = canvas;
  this.ctx = canvas ? canvas.getContext("2d") : null;
  ```

### 2.2 Resolution & Resizing Mechanism

- **Current Implementation (`src/game/engine.ts:2775-2792`)**:
  ```ts
  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.screenW = Math.max(320, rect.width);
    this.screenH = Math.max(240, rect.height);

    this.W = this.screenW;
    this.H = this.screenH;

    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx?.setTransform(1, 0, 0, 1, 0, 0);

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = !this.pixel;
    }
  }
  ```
- **Architectural Gaps**:
  - The viewport dimension (`W`, `H`) directly equals the browser window physical pixels.
  - A player with a 2560x1440 screen sees 2.37x more world area than a player on 1080p, creating an unfair FOV advantage in multiplayer.
  - Pixel sprites rendered with procedural rectangles scale unpredictably across screen densities.

### 2.3 Camera & Coordinate Systems

- **Coordinate Spaces**:
  1. **World Space**: Floating-point continuous coordinates `(0, 0)` to `(worldW, worldH)` where default `worldW = 6000`, `worldH = 3000`.
  2. **Screen Space**: Viewport pixel coordinates `(0, 0)` to `(W, H)`.
  3. **Canvas / Display Space**: Physical DOM element coordinates mapped via CSS.
- **Camera Follow Logic (`src/game/engine.ts:3462-3474`)**:
  ```ts
  const targetCamX = isFinite(this.player.x) ? this.player.x - this.W / 2 : 0;
  const targetCamY = isFinite(this.player.y) ? this.player.y - this.H / 2 : 0;
  if (isFinite(targetCamX) && isFinite(this.camX)) {
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);
  } else {
    this.camX = targetCamX;
  }
  ```
- **Mouse & Pointer Lock Conversion (`src/game/engine.ts:2900-2917`)**:
  ```ts
  const rect = this.canvas.getBoundingClientRect();
  const scaleX = this.W / Math.max(1, rect.width);
  const scaleY = this.H / Math.max(1, rect.height);
  if (this.pointerLocked) {
    this.cursorScreen.x += e.movementX * scaleX;
    this.cursorScreen.y += e.movementY * scaleY;
  } else {
    this.cursorScreen.x = (e.clientX - rect.left) * scaleX;
    this.cursorScreen.y = (e.clientY - rect.top) * scaleY;
  }
  this.mouse.x = this.cursorScreen.x + this.camX;
  this.mouse.y = this.cursorScreen.y + this.camY;
  ```

### 2.4 Rendering Draw Calls & Layer Hierarchy

#### Local / Host Mode Render Sequence (`src/game/engine.ts:10399-10530`):
| Layer Order | Draw Call | Coordinate Space | Description |
|:---|:---|:---|:---|
| 0 | `drawBackground(ctx)` | Screen & World | Gradient background, neon cyber backdrop / floor grid, base glow blobs, screen vignette |
| 1 | `ctx.translate(-camX, -camY)` | World Space | Applies camera offset & screen shake |
| 2 | `drawDecorations(ctx)` | World Space | Bamboo, sakura trees, pine trees, bushes |
| 3 | `drawWalls(ctx)` | World Space | Static walls, destructible wooden covers, glue walls, building structures |
| 4 | `drawDeployables(ctx)` | World Space | Sentry turrets, explosive/poison/fire mines, healing stations |
| 5 | `drawBase(ctx)` | World Space | Team bases (friendly & enemy bases) |
| 6 | `drawArenaBorder(ctx)` | World Space | Outer perimeter boundary |
| 7 | `drawFieldEffects(ctx)` | World Space | Poison clouds, fire fields |
| 8 | `drawPickups(ctx)` | World Space | Health kits, ammo boxes |
| 9 | `drawParticles(ctx)` | World Space | Sparks, smoke, spinning gold coins |
| 10 | `drawGrenades(ctx)` | World Space | Thrown bouncing grenades |
| 11 | `drawEnemies(ctx)` | World Space | Biohazard zombies / monsters, elite variants |
| 12 | `drawEnemyBullets(ctx)` | World Space | Enemy projectile glow & cores |
| 13 | `drawBeam(ctx)` / `drawFlameCone(ctx)` | World Space | Continuous lasers and flamethrower fire cones |
| 14 | `drawPixelTrain(ctx)` | World Space | Moving train hazard on tracks |
| 15 | `drawPlayer(ctx)` / `drawNetCharacter(ctx)` | World Space | Player, teammate, enemy combatants, HP bars, names |
| 16 | `drawAimPreview(ctx)` / `drawLauncherIndicator` | World Space | Trajectory arcs, placement rings, target reticles |
| 17 | `drawBullets(ctx)` | World Space | Player projectiles, shells with parabolic Z-arc and shadows |
| 18 | `drawEffects(ctx)` | World Space | Explosions, slashes, sweeps, saber trails, shockwaves |
| 19 | `ctx.restore()` | Screen Space | Return to screen coordinates |
| 20 | `drawCrosshair(ctx)` | Screen Space | Custom mouse cursor reticle |
| 21 | `drawOverlays(ctx)` | Screen Space | Timewarp purple tint, low-HP pulsating red vignette |

#### Guest / Snapshot Mode Render Sequence (`src/game/engine.ts:9256-9380`):
- Mirrored rendering directly from `SnapState` with position easing (`netRender.get(id)`).
- Suffers from the same rigid layer batching as host mode.

---

## 3. Detailed Requirements for R1: Pixel Viewport & Rendering Pipeline

### 3.1 Fixed Internal Virtual Resolution
To achieve an authentic 16/32-bit retro pixel arcade aesthetic (Enter the Gungeon / Soul Knight):
1. **Target Internal Resolutions**:
   - **Option A (Recommended: 480 × 270)**:
     - 16:9 native aspect ratio.
     - Exactly **4× integer scale** on 1080p (1920×1080).
     - Exactly **3× integer scale** on 720p (1280×720 / 1440×810).
     - Exactly **2× integer scale** on 540p (960×540).
     - Perfectly balances high pixel detail with chunky retro readability.
   - **Option B (Alternative: 640 × 360)**:
     - 16:9 native aspect ratio.
     - Exactly **3× integer scale** on 1080p, **4× integer scale** on 1440p (2560×1440), **6× integer scale** on 4K (3840×2160).
     - Wider FOV, suitable for extreme fast-paced multiplayer arenas.
2. **Dual-Canvas / Offscreen Buffer Architecture**:
   - **Internal Virtual Canvas (`virtualCanvas`)**: Sized strictly to `RENDER_W × RENDER_H` (e.g. 480×270). All gameplay entities, tilemaps, lights, and in-world particles are rendered to this buffer.
   - **Display Canvas (`displayCanvas`)**: Mounted in the DOM, sized to the viewport/window.
   - **Blit Pass**: The virtual buffer is scaled and drawn onto the display canvas using `ctx.drawImage` with integer scaling factor and letterboxing offsets.

### 3.2 Integer Nearest-Neighbor Scaling & Letterboxing / Viewport Management
- **Scale Calculation**:
  ```ts
  const scale = Math.max(1, Math.floor(Math.min(windowW / RENDER_W, windowH / RENDER_H)));
  const displayW = RENDER_W * scale;
  const displayH = RENDER_H * scale;
  const offsetX = Math.floor((windowW - displayW) / 2);
  const offsetY = Math.floor((windowH - displayH) / 2);
  ```
- **Crisp Pixel Filtering**:
  - Virtual Context: `ctx.imageSmoothingEnabled = false;`
  - Display Context: `displayCtx.imageSmoothingEnabled = false;`
  - CSS styling:
    ```css
    canvas {
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
    ```
- **Letterbox & Pillarbox Bars**:
  - If screen aspect ratio is wider or taller than 16:9, black bars (`#000000` or stylized retro arcade bezel) pad the outer margins.
  - The viewport is strictly centered.
- **Input Coordinate Transformation**:
  - Mouse / touch screen-to-world mapping must be updated:
    ```ts
    const virtualX = (clientX - rect.left - offsetX) / scale;
    const virtualY = (clientY - rect.top - offsetY) / scale;
    // Clamp to virtual screen boundaries
    cursorVirtualX = Math.max(0, Math.min(RENDER_W, virtualX));
    cursorVirtualY = Math.max(0, Math.min(RENDER_H, virtualY));
    mouseWorldX = cursorVirtualX + Math.round(camX);
    mouseWorldY = cursorVirtualY + Math.round(camY);
    ```

### 3.3 3/4 Perspective Y-Sort Depth Occlusion Architecture

#### Understanding 3/4 Perspective Depth:
In a 2.5D / 3/4 perspective top-down game:
- The screen `Y` coordinate represents both the vertical plane and depth in the world.
- Entities positioned further north (smaller `Y`) are located behind entities positioned further south (larger `Y`).
- Every entity has a **Ground Foot Position (`footY`)** and a **Height (`height`)**.
  - Visual Top: `renderY = footY - height`
  - Ground Base: `footY = worldY` (the bottom edge of its collision footprint).

#### Y-Sorted Rendering Pipeline:
```
┌─────────────────────────────────────────────────────────────┐
│ Layer 0: Ground Tiles, Floor Decals, Bloodstains, Base Pads │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Ground Shadows (Entity/Prop/Projectile Shadows)    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Y-SORTED WORLD OBJECTS                             │
│   Sorted by `sortY = entity.footY`:                         │
│   - Wall Front Faces & Pillars                              │
│   - Destructible Props & Crates                             │
│   - Cashout Vaults & Airdrop Crates                         │
│   - Characters (Player, Bots, Enemies, Bosses)              │
│   - Deployables (Turrets, Mines, Healing Stations)          │
│   - Dropped Pickups & Weapons                               │
│   - Ground Projectiles & Melee Slashes                      │
│   - Dead Bodies / Corpses                                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Overhead Layer (Wall Tops, Roof Canopy, Overhangs) │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Airborne & FX (Z-Air Projectiles, Sparks, Smoke)   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Screen-Space Retro Arcade HUD, Floating Text, UI   │
└─────────────────────────────────────────────────────────────┘
```

#### Zero-GC Y-Sort Implementation Details:
- To maintain a stable 60 FPS without Garbage Collection pauses, the rendering system must avoid allocating new arrays or lambda objects every frame.
- **Render Queue Structure**:
  ```ts
  export interface RenderableItem {
    sortY: number;
    layer: number; // 0: ground shadow, 1: y-sort, 2: overhead
    draw: (ctx: CanvasRenderingContext2D) => void;
  }
  ```
- Preallocate a fixed pool of `RenderableItem` objects (e.g. 500–1000 items) and perform an in-place sort using TimSort or numeric comparison (`a.sortY - b.sortY`).

### 3.4 Pixel-Grid Snapping & Sub-Pixel Anti-Jitter

- In low-resolution pixel games, continuous floating-point camera positions cause "pixel swimming" (where edges jitter between adjacent pixels).
- **Camera Snapping Rule**:
  - The camera position `camX`, `camY` is updated in continuous floating-point physics for smooth interpolation.
  - When rendering to the internal canvas, the viewport offset is snapped to integers:
    ```ts
    const renderCamX = Math.round(this.camX);
    const renderCamY = Math.round(this.camY);
    ctx.translate(-renderCamX, -renderCamY);
    ```
  - All sprite draw operations align coordinates to integer pixels: `Math.round(x)`, `Math.round(y)`.

---

## 4. Build System & Toolchain Analysis

### 4.1 Configuration Files
1. **`package.json`**:
   - Dependencies: `react@19.2.6`, `react-dom@19.2.6`, `ws@8.18.0`, `clsx@2.1.1`, `tailwind-merge@3.4.0`.
   - Dev Dependencies: `vite@7.3.2`, `vite-plugin-singlefile@2.3.0`, `typescript@5.9.3`, `@tailwindcss/vite@4.1.17`, `playwright@1.61.1`.
2. **`vite.config.ts`**:
   - Plugins: `react()`, `tailwindcss()`, `viteSingleFile()`.
   - Path alias: `@/*` mapped to `src/*`.
   - Dev proxy: `/api` and `/admin` forwarded to `http://localhost:8080`.
3. **`tsconfig.json`**:
   - Strict mode: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
   - Module resolution: `bundler`, `allowImportingTsExtensions: true`, `resolveJsonModule: true`, `noEmit: true`.

### 4.2 Build & Execution Scripts
- `npm run build`: Executes `vite build && node scripts/fix-file-protocol.mjs && npm run build:engine`.
  - Produces a single-file bundle `dist/index.html` (742 kB raw, 205 kB gzip) that can run directly from `file://` or any web host.
- `build-engine.cjs`: Uses `esbuild` to bundle `src/game/engine.ts` with worker stubs into `server/engine.bundle.mjs`.
- **Verified Build Status**: `npm run build` completed with Exit Code 0 in ~1.26s.

### 4.3 Architecture Boundary Constraint (Browser vs Server)
- Because `engine.ts` is imported by `server/authoritative.mjs` (Node.js runtime), it cannot access DOM/Canvas objects at load time.
- All canvas creation, document queries, and rendering calls in `engine.ts` must remain guarded behind `if (this.ctx)` or isolated in client-only modules.

---

## 5. Comparison: Current Architecture vs R1 Pixel Architecture

| Dimension | Current Architecture | R1 Target Pixel Architecture |
|:---|:---|:---|
| **Internal Resolution** | Dynamic (`window.innerWidth` × `window.innerHeight`, e.g. 1920×1080) | Fixed Virtual Resolution (e.g. 480×270 or 640×360) |
| **Scaling Algorithm** | Browser default bilinear/native scaling | Integer Nearest-Neighbor (`imageSmoothingEnabled = false`, `image-rendering: pixelated`) |
| **Viewport Alignment** | Fullscreen stretch with variable FOV | Centered 16:9 viewport with integer scale letterboxing / pillarboxing |
| **Depth / Layering** | Hardcoded batch ordering by entity type | 3/4 Perspective Y-Sort depth occlusion for all entities, props, walls, projectiles |
| **Pixel Grid Alignment** | Continuous sub-pixel coordinates (edge shimmering) | Snapped integer grid coordinates (`Math.round(x)`, `Math.round(y)`) |
| **Coordinate Conversion** | Simple window client offset | Two-stage transform: Screen → Letterbox offset → Virtual Pixel → World Coordinate |
| **Server Compatibility** | Node.js headless compatibility via `build-engine.cjs` | Preserved clean separation: headless simulation on server, pixel pipeline on client |

---

## 6. Recommendations for Implementation Roadmap

1. **Step 1: Create Viewport & Virtual Buffer Module**
   - Implement `PixelViewport` manager handling internal `480×270` virtual canvas, integer scaling calculations, letterboxing, and mouse/touch coordinate mapping.
2. **Step 2: Implement Zero-GC Y-Sort Render Queue**
   - Build a high-performance, object-pooled `RenderQueue` that collects world render calls and executes them in ascending `sortY` order.
3. **Step 3: Refactor Entity & Wall Drawing to Support 3/4 Perspective**
   - Split wall rendering into: Floor collision footprint, Wall front face (Y-sorted), and Wall top cap (overhead).
   - Give characters, monsters, props, and deployables clear `footY` anchor points.
4. **Step 4: Update Camera Snapping**
   - Snap camera render coordinates to integer pixels before world rendering.
5. **Step 5: Verify Build & Headless Server**
   - Run `npm run build` and `npm run smoke:server` to guarantee zero regressions.
