# Analysis Report: Pixel Viewport & Rendering Pipeline (F01-F04)

**Agent**: Explorer 2 (Milestone 1)  
**Date**: 2026-08-15  
**Target Module**: `src/game/viewport.ts`  
**Parent Sub-Orchestrator**: `sub_orch_m1`

---

## 1. Executive Summary

Milestone 1 establishes the foundational pixel-perfect rendering pipeline for *FIRING STICKERS*' 16-bit / 32-bit pixel dungeon shooter aesthetic. This investigation details the architectural design, mathematical derivations, type definitions, and implementation algorithms for Features F01 through F04:
- **F01 (Fixed Virtual Viewport Buffer)**: A fixed $480 \times 270$ (16:9) virtual canvas buffer that eliminates resolution-dependent physics/field-of-view discrepancies and maintains crisp pixel granularity.
- **F02 (Integer Nearest-Neighbor Blit & Letterboxing)**: High-performance integer-scaled blitting with `imageSmoothingEnabled = false`, pixelated CSS, and centered letterboxing/pillarboxing with proper black bar padding.
- **F03 (2-Stage Coordinate Mapping)**: Robust bidirectional coordinate transformations between Display Screen $\leftrightarrow$ Virtual Pixel $\leftrightarrow$ World Simulation spaces for mouse, touch, pointer lock, and UI overlays.
- **F04 (Integer Camera Snapping)**: Sub-pixel anti-shimmer camera snapping (`Math.round`) and viewport frustum culling to eliminate texture bleeding and floating-point edge vibration.

---

## 2. Deep-Dive Requirements & Technical Analysis

### 2.1 F01: Fixed 480×270 Virtual Viewport Buffer

#### Resolution Rationale
- **Base Dimensions**: $W_v = 480$, $H_v = 270$.
- **Aspect Ratio**: Exact $16:9$ ($480 / 270 = 16 / 9 \approx 1.77778$).
- **Scaling Symmetry**:
  - $1\times$: $480 \times 270$
  - $2\times$: $960 \times 540$ (qHD)
  - $3\times$: $1440 \times 810$
  - $4\times$: $1920 \times 1080$ (1080p FHD — exact integer match!)
  - $5\times$: $2400 \times 1350$
  - $6\times$: $2880 \times 1620$ (QHD+)
  - $8\times$: $3840 \times 2160$ (4K UHD — exact integer match!)

#### Virtual Buffer Lifecycle & Zero-GC Reallocation
- The virtual buffer canvas is allocated **once** during viewport instantiation (`createPixelViewport`).
- It has fixed internal dimensions (`virtualCanvas.width = 480`, `virtualCanvas.height = 270`).
- **Never resize or reallocate** the virtual buffer on window resize events. Window resize events only recalculate the display scaling and letterbox offsets.
- Rendering context configuration:
  - `virtualCtx.imageSmoothingEnabled = false`
  - Vendor prefixes: `(virtualCtx as any).webkitImageSmoothingEnabled = false; (virtualCtx as any).mozImageSmoothingEnabled = false; (virtualCtx as any).msImageSmoothingEnabled = false;`

#### Headless Mode Compatibility (Node.js Server)
- When executing in headless Node.js (for `server/authoritative.mjs` and `server/engine.bundle.mjs`), `typeof document === 'undefined'`.
- The viewport must detect headless environments:
  - `virtualCanvas` and `virtualCtx` are initialized to `null`.
  - `beginFrame()` returns `null` safely.
  - `endFrame()` no-ops safely.
  - All coordinate mapping and camera snapping functions remain 100% active and purely mathematical.

---

### 2.2 F02: Integer Nearest-Neighbor Blit & Letterboxing/Pillarboxing

#### Scaling & Offset Formulas
Given display canvas dimensions $W_d \ge 1$ and $H_d \ge 1$:

1. **Integer Scale Factor ($S$)**:
   $$S = \max\left(1, \lfloor \min\left(\frac{W_d}{W_v}, \frac{H_d}{H_v}\right) \rfloor\right)$$
   *(Note: Optional support for non-integer crisp scaling when configured, but integer scaling is the default for retro pixel fidelity).*

2. **Scaled Dimensions on Display Canvas ($W_s, H_s$)**:
   $$W_s = W_v \times S$$
   $$H_s = H_v \times S$$

3. **Centering Offsets ($O_x, O_y$)**:
   $$O_x = \lfloor \frac{W_d - W_s}{2} \rfloor$$
   $$O_y = \lfloor \frac{H_d - H_s}{2} \rfloor$$

4. **Aspect Ratio Scenarios**:
   - **Widescreen / Ultra-wide ($W_d / H_d > 16/9$)**: $O_x > 0, O_y = 0 \implies$ **Pillarboxing** (black bars on left and right).
   - **Narrow / Mobile Portrait ($W_d / H_d < 16/9$)**: $O_x = 0, O_y > 0 \implies$ **Letterboxing** (black bars on top and bottom).
   - **Exact 16:9 ($W_d / H_d = 16/9$)**: $O_x = 0, O_y = 0 \implies$ **Full Coverage**.

#### Blit Execution (`endFrame`)
```ts
public endFrame(displayCtx: CanvasRenderingContext2D | null): void {
  if (!displayCtx || !this.virtualCanvas) return;

  // 1. Enforce nearest-neighbor scaling on the display context
  displayCtx.imageSmoothingEnabled = false;
  (displayCtx as any).webkitImageSmoothingEnabled = false;
  (displayCtx as any).mozImageSmoothingEnabled = false;
  (displayCtx as any).msImageSmoothingEnabled = false;

  // 2. Clear entire display canvas to solid black for clean letterbox bars
  displayCtx.fillStyle = "#000000";
  displayCtx.fillRect(0, 0, this.displayW, this.displayH);

  // 3. Crisp integer nearest-neighbor blit
  displayCtx.drawImage(
    this.virtualCanvas,
    0, 0, this.virtualW, this.virtualH,
    this.offsetX, this.offsetY, this.scaledW, this.scaledH
  );
}
```

#### CSS Properties
Display canvas element style attributes:
```css
image-rendering: -moz-crisp-edges;
image-rendering: -webkit-crisp-edges;
image-rendering: pixelated;
image-rendering: crisp-edges;
```

---

### 2.3 F03: 2-Stage Coordinate Mapping System

Input events (mouse move, mouse down, touch gestures) arrive in screen/client coordinates $(X_s, Y_s)$. Game entities and physics live in continuous world space $(X_w, Y_w)$. A direct single transformation couples display layout to simulation logic. The 2-stage architecture cleanly separates screen presentation from world physics.

```
[Screen Space (Xs, Ys)]
        │
        ▼ (Stage 1: screenToVirtual)
[Virtual Pixel Space (Vx, Vy)]  <-- [0..480, 0..270]
        │
        ▼ (Stage 2: virtualToWorld)
[World Space (Xw, Yw)]
```

#### Mathematical Formulations

1. **Stage 1: Screen $\to$ Virtual Pixel**:
   $$V_x = \frac{X_s - O_x}{S}$$
   $$V_y = \frac{Y_s - O_y}{S}$$
   With clamping (optional parameter `clamp = true`):
   $$V_x = \max\left(0, \min\left(W_v, V_x\right)\right)$$
   $$V_y = \max\left(0, \min\left(H_v, V_y\right)\right)$$

2. **Stage 1 Inverse: Virtual Pixel $\to$ Screen**:
   $$X_s = O_x + V_x \times S$$
   $$Y_s = O_y + V_y \times S$$

3. **Stage 2: Virtual Pixel $\to$ World**:
   Using integer-snapped camera position $C_{x,\text{snap}} = \text{Math.round}(C_x)$, $C_{y,\text{snap}} = \text{Math.round}(C_y)$:
   $$X_w = V_x + C_{x,\text{snap}}$$
   $$Y_w = V_y + C_{y,\text{snap}}$$

4. **Stage 2 Inverse: World $\to$ Virtual Pixel**:
   $$V_x = X_w - C_{x,\text{snap}}$$
   $$V_y = Y_w - C_{y,\text{snap}}$$

5. **Direct Composites**:
   - `screenToWorld(Xs, Ys, camX, camY, clamp)`:
     $$X_w = \frac{X_s - O_x}{S} + \text{Math.round}(C_x)$$
     $$Y_w = \frac{Y_s - O_y}{S} + \text{Math.round}(C_y)$$
   - `worldToScreen(Xw, Yw, camX, camY)`:
     $$X_s = O_x + (X_w - \text{Math.round}(C_x)) \times S$$
     $$Y_s = O_y + (Y_w - \text{Math.round}(C_y)) \times S$$

6. **Pointer Lock Movement Deltas**:
   When mouse is pointer-locked, raw `movementX`, `movementY` arrive in display pixels:
   $$\Delta V_x = \frac{\text{movementX}}{S}$$
   $$\Delta V_y = \frac{\text{movementY}}{S}$$

---

### 2.4 F04: Integer Camera Snapping & Jitter Elimination

#### Root Cause of Sub-Pixel Shimmer
In 2D canvas pixel-art rendering, translating the context by floating-point offsets (e.g. `ctx.translate(-312.45, -120.73)`) causes the 2D canvas rasterizer to perform fractional anti-aliasing interpolation on pixel boundaries. This results in:
1. Shimmering edges on tile boundaries and wall faces.
2. 1px line thickness vibration during smooth camera following.
3. Bleeding artifacts between adjacent atlas sprites.

#### Camera Snapping Algorithm
- **Simulation Camera**: High-precision floating-point coordinates ($C_x^{\text{sim}}, C_y^{\text{sim}}$) are retained in physics simulation and client prediction to preserve smooth motion damping.
- **Rendering Camera**: Context translation uses rounded integers:
  $$C_{x,\text{render}} = \text{Math.round}(C_x^{\text{sim}})$$
  $$C_{y,\text{render}} = \text{Math.round}(C_y^{\text{sim}})$$
- **Camera Shake Snapping**:
  If trauma/shake is applied with intensity $K_{\text{shake}}$:
  $$S_x = \text{Math.round}((\text{Math.random}() - 0.5) \times 2 \times K_{\text{shake}})$$
  $$S_y = \text{Math.round}((\text{Math.random}() - 0.5) \times 2 \times K_{\text{shake}})$$
  $$C_{x,\text{render}} = \text{Math.round}(C_x^{\text{sim}}) + S_x$$
  $$C_{y,\text{render}} = \text{Math.round}(C_y^{\text{sim}}) + S_y$$

#### Frustum Culling AABB Bounds
To skip entities outside the visible screen:
$$\text{minX} = C_{x,\text{render}} - \text{margin}$$
$$\text{maxX} = C_{x,\text{render}} + W_v + \text{margin}$$
$$\text{minY} = C_{y,\text{render}} - \text{margin}$$
$$\text{maxY} = C_{y,\text{render}} + H_v + \text{margin}$$
(Recommended default `margin = 32` to accommodate entity sprite bounds).

---

## 3. Concrete Specifications for `src/game/viewport.ts`

### 3.1 Type Definitions

```ts
/**
 * Viewport configuration parameters.
 */
export interface PixelViewportConfig {
  /** Virtual buffer resolution width in pixels. Defaults to 480. */
  virtualW?: number;
  /** Virtual buffer resolution height in pixels. Defaults to 270. */
  virtualH?: number;
  /** Whether to enforce integer scale factors. Defaults to true. */
  integerScale?: boolean;
}

/**
 * 2D Point structure.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Camera position structure.
 */
export interface Camera {
  x: number;
  y: number;
}

/**
 * Axis-aligned bounding box for viewport culling.
 */
export interface ViewportAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Full interface contract for PixelViewport.
 */
export interface PixelViewport {
  readonly virtualW: number;
  readonly virtualH: number;
  readonly displayW: number;
  readonly displayH: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scaledW: number;
  readonly scaledH: number;
  readonly virtualCanvas: HTMLCanvasElement | null;
  readonly virtualCtx: CanvasRenderingContext2D | null;

  resize(displayW: number, displayH: number): void;
  screenToVirtual(screenX: number, screenY: number, clamp?: boolean): Point2D;
  virtualToScreen(vx: number, vy: number): Point2D;
  virtualToWorld(vx: number, vy: number, camX: number, camY: number): Point2D;
  worldToVirtual(wx: number, wy: number, camX: number, camY: number): Point2D;
  screenToWorld(screenX: number, screenY: number, camX: number, camY: number, clamp?: boolean): Point2D;
  worldToScreen(wx: number, wy: number, camX: number, camY: number): Point2D;
  screenDeltaToVirtual(movementX: number, movementY: number): Point2D;
  snapCamera(camX: number, camY: number): Camera;
  getVisibleBounds(camX: number, camY: number, margin?: number): ViewportAABB;
  beginFrame(): CanvasRenderingContext2D | null;
  endFrame(displayCtx: CanvasRenderingContext2D | null): void;
  clear(color?: string): void;
}
```

### 3.2 Implementation Class Blueprint

```ts
export class PixelViewportImpl implements PixelViewport {
  public readonly virtualW: number;
  public readonly virtualH: number;
  public readonly integerScale: boolean;

  public displayW: number = 480;
  public displayH: number = 270;
  public scale: number = 1;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public scaledW: number = 480;
  public scaledH: number = 270;

  public readonly virtualCanvas: HTMLCanvasElement | null = null;
  public readonly virtualCtx: CanvasRenderingContext2D | null = null;

  constructor(config?: PixelViewportConfig) {
    this.virtualW = config?.virtualW ?? 480;
    this.virtualH = config?.virtualH ?? 270;
    this.integerScale = config?.integerScale ?? true;

    // Headless-safe canvas instantiation
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      this.virtualCanvas = document.createElement("canvas");
      this.virtualCanvas.width = this.virtualW;
      this.virtualCanvas.height = this.virtualH;

      const ctx = this.virtualCanvas.getContext("2d", { alpha: false });
      if (ctx) {
        this.virtualCtx = ctx;
        this.applyPixelSmoothing(ctx, false);
      }
    }

    this.resize(this.virtualW, this.virtualH);
  }

  private applyPixelSmoothing(ctx: CanvasRenderingContext2D, enabled: boolean): void {
    ctx.imageSmoothingEnabled = enabled;
    const c = ctx as any;
    c.webkitImageSmoothingEnabled = enabled;
    c.mozImageSmoothingEnabled = enabled;
    c.msImageSmoothingEnabled = enabled;
  }

  public resize(displayW: number, displayH: number): void {
    this.displayW = Math.max(1, displayW);
    this.displayH = Math.max(1, displayH);

    if (this.integerScale) {
      this.scale = Math.max(
        1,
        Math.floor(Math.min(this.displayW / this.virtualW, this.displayH / this.virtualH))
      );
    } else {
      this.scale = Math.max(
        0.001,
        Math.min(this.displayW / this.virtualW, this.displayH / this.virtualH)
      );
    }

    this.scaledW = Math.round(this.virtualW * this.scale);
    this.scaledH = Math.round(this.virtualH * this.scale);
    this.offsetX = Math.floor((this.displayW - this.scaledW) / 2);
    this.offsetY = Math.floor((this.displayH - this.scaledH) / 2);
  }

  public screenToVirtual(screenX: number, screenY: number, clamp = false): Point2D {
    let vx = (screenX - this.offsetX) / this.scale;
    let vy = (screenY - this.offsetY) / this.scale;
    if (clamp) {
      vx = Math.max(0, Math.min(this.virtualW, vx));
      vy = Math.max(0, Math.min(this.virtualH, vy));
    }
    return { x: vx, y: vy };
  }

  public virtualToScreen(vx: number, vy: number): Point2D {
    return {
      x: this.offsetX + vx * this.scale,
      y: this.offsetY + vy * this.scale,
    };
  }

  public virtualToWorld(vx: number, vy: number, camX: number, camY: number): Point2D {
    const snapCamX = Math.round(camX);
    const snapCamY = Math.round(camY);
    return {
      x: vx + snapCamX,
      y: vy + snapCamY,
    };
  }

  public worldToVirtual(wx: number, wy: number, camX: number, camY: number): Point2D {
    const snapCamX = Math.round(camX);
    const snapCamY = Math.round(camY);
    return {
      x: wx - snapCamX,
      y: wy - snapCamY,
    };
  }

  public screenToWorld(
    screenX: number,
    screenY: number,
    camX: number,
    camY: number,
    clamp = false
  ): Point2D {
    const v = this.screenToVirtual(screenX, screenY, clamp);
    return this.virtualToWorld(v.x, v.y, camX, camY);
  }

  public worldToScreen(
    wx: number,
    wy: number,
    camX: number,
    camY: number
  ): Point2D {
    const v = this.worldToVirtual(wx, wy, camX, camY);
    return this.virtualToScreen(v.x, v.y);
  }

  public screenDeltaToVirtual(movementX: number, movementY: number): Point2D {
    return {
      x: movementX / this.scale,
      y: movementY / this.scale,
    };
  }

  public snapCamera(camX: number, camY: number): Camera {
    return {
      x: Math.round(camX),
      y: Math.round(camY),
    };
  }

  public getVisibleBounds(camX: number, camY: number, margin = 32): ViewportAABB {
    const snap = this.snapCamera(camX, camY);
    return {
      minX: snap.x - margin,
      minY: snap.y - margin,
      maxX: snap.x + this.virtualW + margin,
      maxY: snap.y + this.virtualH + margin,
    };
  }

  public beginFrame(): CanvasRenderingContext2D | null {
    if (!this.virtualCtx) return null;
    this.virtualCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.applyPixelSmoothing(this.virtualCtx, false);
    this.virtualCtx.clearRect(0, 0, this.virtualW, this.virtualH);
    return this.virtualCtx;
  }

  public endFrame(displayCtx: CanvasRenderingContext2D | null): void {
    if (!displayCtx || !this.virtualCanvas) return;
    this.applyPixelSmoothing(displayCtx, false);

    // Letterbox/pillarbox background clear
    displayCtx.fillStyle = "#000000";
    displayCtx.fillRect(0, 0, this.displayW, this.displayH);

    // Blit virtual canvas
    displayCtx.drawImage(
      this.virtualCanvas,
      0,
      0,
      this.virtualW,
      this.virtualH,
      this.offsetX,
      this.offsetY,
      this.scaledW,
      this.scaledH
    );
  }

  public clear(color = "#000000"): void {
    if (!this.virtualCtx) return;
    this.virtualCtx.fillStyle = color;
    this.virtualCtx.fillRect(0, 0, this.virtualW, this.virtualH);
  }
}

export function createPixelViewport(config?: PixelViewportConfig): PixelViewport {
  return new PixelViewportImpl(config);
}
```

---

## 4. Integration Blueprint with Existing Engine Architecture

### 4.1 Integration with `src/game/engine.ts`
- **Instance Holder**: `engine.viewport = createPixelViewport({ virtualW: 480, virtualH: 270 });`
- **Resize Handler**:
  ```ts
  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dW = Math.max(320, Math.floor(rect.width));
    const dH = Math.max(240, Math.floor(rect.height));

    this.canvas.width = dW;
    this.canvas.height = dH;

    this.viewport.resize(dW, dH);
    this.W = this.viewport.virtualW; // 480
    this.H = this.viewport.virtualH; // 270
  }
  ```
- **Input Handling (`onMouseMove`)**:
  ```ts
  private onMouseMove(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (this.pointerLocked) {
      const delta = this.viewport.screenDeltaToVirtual(e.movementX, e.movementY);
      this.cursorScreen.x += delta.x;
      this.cursorScreen.y += delta.y;
    } else {
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const v = this.viewport.screenToVirtual(clientX, clientY, true);
      this.cursorScreen.x = v.x;
      this.cursorScreen.y = v.y;
    }
    this.cursorScreen.x = Math.max(0, Math.min(this.viewport.virtualW, this.cursorScreen.x));
    this.cursorScreen.y = Math.max(0, Math.min(this.viewport.virtualH, this.cursorScreen.y));

    const snapCam = this.viewport.snapCamera(this.camX, this.camY);
    this.mouse.x = this.cursorScreen.x + snapCam.x;
    this.mouse.y = this.cursorScreen.y + snapCam.y;
  }
  ```
- **Frame Render Loop**:
  ```ts
  // In renderer:
  const vCtx = this.viewport.beginFrame();
  if (vCtx) {
    // translate virtual context with integer snapped camera & shake
    const snap = this.viewport.snapCamera(this.camX, this.camY);
    vCtx.save();
    vCtx.translate(-snap.x, -snap.y);
    // Draw world layers...
    vCtx.restore();

    // Draw UI / HUD on top in virtual pixel space (no camera translation)
    // ...

    // Blit to display canvas
    this.viewport.endFrame(this.displayCtx);
  }
  ```

---

## 5. Verification & Edge Case Analysis

1. **Fractional Display Sizes & Non-16:9 Ratios**:
   - `480x270` scaling on a $1920 \times 1080$ display gives exact $4\times$ scale with $O_x = 0, O_y = 0$.
   - On a $1366 \times 768$ display, scale is $\lfloor \min(1366/480, 768/270) \rfloor = \lfloor 2.844 \rfloor = 2\times$. Scaled size is $960 \times 540$, $O_x = 203, O_y = 114$ with clean black pillarbox/letterbox.
   - On ultrawide $2560 \times 1080$, scale is $\lfloor \min(5.33, 4.0) \rfloor = 4\times$. Scaled size is $1920 \times 1080$, $O_x = 320, O_y = 0$ (pillarbox).
2. **Headless Execution Verification**:
   - Running under Node.js (`typeof document === 'undefined'`) initializes `virtualCanvas = null, virtualCtx = null` without throwing exceptions.
   - `screenToWorld` / `worldToScreen` formulas remain functional for unit tests and headless server bot navigation.
3. **Sub-Pixel Jitter Verification**:
   - `snapCamera` enforces exact integer alignment so tile maps and character sprite sheets rasterize at exact 1:1 texel-to-virtual-pixel mapping.

---
