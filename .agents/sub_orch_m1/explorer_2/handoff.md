# Handoff Report: Milestone 1 — Pixel Viewport & Rendering Pipeline (F01–F04)

**Agent**: Explorer 2 (`.agents/sub_orch_m1/explorer_2`)  
**Recipient**: Parent Sub-Orchestrator M1 (`.agents/sub_orch_m1`)  
**Date**: 2026-08-15  
**Handoff Type**: Hard (Task complete)

---

## 1. Observation

1. **Existing Engine Sizing and Input**:
   - In `src/game/engine.ts:2775-2792`, the viewport resizing currently queries `getBoundingClientRect()` and directly assigns `this.W = this.screenW; this.H = this.screenH;` with variable screen dimensions rather than a fixed virtual buffer.
   - In `src/game/engine.ts:2900-2917`, mouse coordinate tracking computes raw unscaled coordinates (`scaleX = this.W / Math.max(1, rect.width)`) directly coupled with display canvas dimensions.
   - In `src/game/engine.ts:3462-3474`, camera position is continuously smoothed with floating-point lerp (`this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);`), and in `src/game/systems/Renderer.ts:262`, `ctx.translate(-this.engine.camX, -this.engine.camY)` translates by un-rounded floats, causing subpixel rasterization jitter.
2. **Architecture & Contract Specifications**:
   - `PROJECT.md:4` specifies: "Internal virtual pixel buffer (480×270 virtual canvas with 16:9 aspect ratio) scaled using integer nearest-neighbor filtering (`imageSmoothingEnabled = false`, `image-rendering: pixelated`) to the display canvas with letterboxing/pillarboxing."
   - `PROJECT.md:74-96` and `SCOPE.md:20-26` define the `PixelViewport` interface with `resize`, `screenToVirtual`, `virtualToWorld`, `worldToVirtual`, `screenToWorld`, `worldToScreen`, `beginFrame`, and `endFrame`.
3. **Headless Node.js Bundling**:
   - `build-engine.cjs:3-7` bundles `src/game/engine.ts` for Node.js (`platform: "node"` into `server/engine.bundle.mjs`), requiring that `src/game/viewport.ts` must not execute top-level browser DOM APIs and must safely handle `typeof document === 'undefined'`.

---

## 2. Logic Chain

1. **Fixed 480×270 Buffer (F01)**:
   - A single offscreen canvas initialized to $480 \times 270$ gives standard $16:9$ retro granularity with zero runtime GC allocation on resize.
   - Guarding canvas creation behind `typeof document !== 'undefined'` ensures seamless compatibility with the headless Node.js server bundle.
2. **Integer Scaling & Centered Letterbox/Pillarbox (F02)**:
   - Calculating $S = \max\left(1, \lfloor \min\left(W_d / 480, H_d / 270\right) \rfloor\right)$ guarantees crisp non-distorted integer pixel magnification (e.g. $4\times$ on 1080p, $8\times$ on 4K).
   - Centering offsets $O_x = \lfloor (W_d - 480 \cdot S) / 2 \rfloor$ and $O_y = \lfloor (H_d - 270 \cdot S) / 2 \rfloor$ accurately establish pillarbox / letterbox margins.
   - Setting `imageSmoothingEnabled = false` on both virtual and display contexts produces razor-sharp pixel blits.
3. **2-Stage Coordinate Mapping (F03)**:
   - Stage 1 transforms screen client coordinates $(X_s, Y_s)$ to virtual pixel space $(V_x, V_y)$ via $V = (X_s - O) / S$.
   - Stage 2 transforms virtual pixel coordinates $(V_x, V_y)$ to world simulation space $(X_w, Y_w)$ via $W = V + C_{\text{snap}}$.
   - Inverse mappings allow exact world-to-screen projection for canvas and DOM UI overlays.
   - Pointer-lock deltas scale cleanly by $1 / S$.
4. **Integer Camera Snapping (F04)**:
   - Rounding camera positions ($C_{\text{snap}} = \text{Math.round}(C)$) before translating the virtual rendering context prevents fractional subpixel anti-aliasing artifacts, eliminating vibrating tile seams and sprite shimmering while preserving floating-point smooth simulation physics.

---

## 3. Caveats

- **CSS Letterboxing vs Canvas Letterboxing**: The implementation fills the letterbox/pillarbox bars directly on the display canvas using black `fillRect`, ensuring visual consistency even if the container element has custom styling.
- **Aspect Ratios Below 1.0 (Portrait Mode)**: On vertical mobile devices (e.g. 390x844), integer scale defaults to $S = 1$ with significant vertical letterboxing. A future milestone can evaluate optional non-integer crisp scaling if portrait mobile support is prioritized.

---

## 4. Conclusion

The specification for `src/game/viewport.ts` covers all requirements for Features F01, F02, F03, and F04. The module blueprint in `analysis.md` provides:
1. Pure TypeScript interface definitions matching `PROJECT.md` and `SCOPE.md`.
2. Headless-safe `PixelViewportImpl` class and `createPixelViewport` factory.
3. Fast numerical coordinate transformation routines.
4. Clean integer camera snapping and frustum AABB calculation.

The implementer can directly translate this blueprint into `src/game/viewport.ts`.

---

## 5. Verification Method

To independently verify the viewport design:
1. Inspect `src/game/viewport.ts` against the type definitions and formulas in `analysis.md`.
2. Unit verification:
   - Initialize `createPixelViewport({ virtualW: 480, virtualH: 270 })`.
   - Call `resize(1920, 1080)`: verify `scale === 4`, `offsetX === 0`, `offsetY === 0`, `scaledW === 1920`, `scaledH === 1080`.
   - Call `resize(1366, 768)`: verify `scale === 2`, `offsetX === 203`, `offsetY === 114`, `scaledW === 960`, `scaledH === 540`.
   - Call `screenToWorld(203 + 240 * 2, 114 + 135 * 2, 100.4, 200.6)`: verify result equals `{ x: 340, y: 336 }`.
3. Headless check:
   - In Node.js environment, `createPixelViewport()` must instantiate without throwing and return `virtualCanvas === null`, `virtualCtx === null`.
