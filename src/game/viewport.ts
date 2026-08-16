/**
 * src/game/viewport.ts
 *
 * Milestone 1: Pixel Viewport & Rendering Pipeline
 * Features:
 * - F01: Fixed 480x270 virtual canvas buffer
 * - F02: Integer nearest-neighbor blit with letterboxing/pillarboxing
 * - F03: 2-Stage coordinate mapping (Screen <-> Virtual <-> World)
 * - F04: Integer camera snapping and viewport culling bounds
 * - F07: Headless environment safe (Node.js authoritative server support)
 */

export interface PixelViewportConfig {
  /** Virtual buffer resolution width in pixels. Defaults to 960. */
  virtualW?: number;
  /** Virtual buffer resolution height in pixels. Defaults to 540. */
  virtualH?: number;
  /** Whether to enforce integer scale factors. Defaults to true. */
  integerScale?: boolean;
  /** Dynamic fullscreen mode: adapts virtual resolution to display aspect ratio without black borders. Defaults to true. */
  dynamic?: boolean;
}

export type ViewportConfig = PixelViewportConfig;

export interface Point2D {
  x: number;
  y: number;
  // Aliases for compatibility with both naming conventions
  vx?: number;
  vy?: number;
  wx?: number;
  wy?: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface ViewportAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

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
  readonly dynamic: boolean;

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
  render(displayCtx: CanvasRenderingContext2D | null): void;
  clear(color?: string): void;
}

export type Viewport = PixelViewport;

export class PixelViewportImpl implements PixelViewport {
  public virtualW: number;
  public virtualH: number;
  public readonly integerScale: boolean;
  public readonly dynamic: boolean;
  private readonly baseVirtualW: number;
  private readonly baseVirtualH: number;

  public displayW: number = 960;
  public displayH: number = 540;
  public scale: number = 1;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public scaledW: number = 960;
  public scaledH: number = 540;

  public readonly virtualCanvas: HTMLCanvasElement | null = null;
  public readonly virtualCtx: CanvasRenderingContext2D | null = null;

  constructor(config?: PixelViewportConfig) {
    this.baseVirtualW = config?.virtualW ?? 960;
    this.baseVirtualH = config?.virtualH ?? 540;
    this.virtualW = this.baseVirtualW;
    this.virtualH = this.baseVirtualH;
    this.integerScale = config?.integerScale ?? true;
    this.dynamic = config?.dynamic ?? false;

    // Headless-safe canvas instantiation (Node.js guard)
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = this.virtualW;
        canvas.height = this.virtualH;
        this.virtualCanvas = canvas;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          this.virtualCtx = ctx;
          this.applyPixelSmoothing(ctx, false);
        }
      } catch {
        // Fallback for non-standard DOM environments
        this.virtualCanvas = null;
        this.virtualCtx = null;
      }
    }

    this.resize(this.virtualW, this.virtualH);
  }

  private applyPixelSmoothing(ctx: CanvasRenderingContext2D, enabled: boolean): void {
    ctx.imageSmoothingEnabled = enabled;
    const c = ctx as any;
    if (typeof c.webkitImageSmoothingEnabled !== "undefined") c.webkitImageSmoothingEnabled = enabled;
    if (typeof c.mozImageSmoothingEnabled !== "undefined") c.mozImageSmoothingEnabled = enabled;
    if (typeof c.msImageSmoothingEnabled !== "undefined") c.msImageSmoothingEnabled = enabled;
  }

  /**
   * Recalculates integer scale factor S and letterbox centering offsets (Ox, Oy).
   */
  public resize(displayW: number, displayH: number): void {
    this.displayW = Math.max(1, Math.floor(displayW));
    this.displayH = Math.max(1, Math.floor(displayH));

    if (this.dynamic) {
      const baseW = this.baseVirtualW || 960;
      const baseH = this.baseVirtualH || 540;
      const s = this.integerScale
        ? Math.max(1, Math.floor(Math.min(this.displayW / baseW, this.displayH / baseH)))
        : Math.max(0.001, Math.min(this.displayW / baseW, this.displayH / baseH));
      this.scale = Math.max(1, s);
      this.virtualW = Math.max(1, Math.ceil(this.displayW / this.scale));
      this.virtualH = Math.max(1, Math.ceil(this.displayH / this.scale));
      this.scaledW = this.displayW;
      this.scaledH = this.displayH;
      this.offsetX = 0;
      this.offsetY = 0;

      if (this.virtualCanvas) {
        if (this.virtualCanvas.width !== this.virtualW) this.virtualCanvas.width = this.virtualW;
        if (this.virtualCanvas.height !== this.virtualH) this.virtualCanvas.height = this.virtualH;
        if (this.virtualCtx) this.applyPixelSmoothing(this.virtualCtx, false);
      }
    } else {
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
  }

  /**
   * Stage 1: Converts screen/client coordinates (Xs, Ys) to virtual buffer coordinates (Vx, Vy).
   */
  public screenToVirtual(screenX: number, screenY: number, clamp = false): Point2D {
    let vx = (screenX - this.offsetX) / this.scale;
    let vy = (screenY - this.offsetY) / this.scale;
    if (clamp) {
      vx = Math.max(0, Math.min(this.virtualW, vx));
      vy = Math.max(0, Math.min(this.virtualH, vy));
    }
    return { x: vx, y: vy, vx, vy };
  }

  /**
   * Stage 1 Inverse: Converts virtual buffer coordinates (Vx, Vy) to screen/display coordinates (Xs, Ys).
   */
  public virtualToScreen(vx: number, vy: number): Point2D {
    const x = this.offsetX + vx * this.scale;
    const y = this.offsetY + vy * this.scale;
    return { x, y, vx, vy };
  }

  /**
   * Stage 2: Converts virtual buffer coordinates (Vx, Vy) to world coordinates (Xw, Yw).
   */
  public virtualToWorld(vx: number, vy: number, camX: number, camY: number): Point2D {
    const safeCamX = Number.isFinite(camX) ? camX : 0;
    const safeCamY = Number.isFinite(camY) ? camY : 0;
    const safeVx = Number.isFinite(vx) ? vx : 0;
    const safeVy = Number.isFinite(vy) ? vy : 0;
    const snapCamX = Math.round(safeCamX);
    const snapCamY = Math.round(safeCamY);
    const x = safeVx + snapCamX;
    const y = safeVy + snapCamY;
    return { x, y, wx: x, wy: y, vx: safeVx, vy: safeVy };
  }

  /**
   * Stage 2 Inverse: Converts world coordinates (Xw, Yw) to virtual buffer coordinates (Vx, Vy).
   */
  public worldToVirtual(wx: number, wy: number, camX: number, camY: number): Point2D {
    const safeCamX = Number.isFinite(camX) ? camX : 0;
    const safeCamY = Number.isFinite(camY) ? camY : 0;
    const safeWx = Number.isFinite(wx) ? wx : 0;
    const safeWy = Number.isFinite(wy) ? wy : 0;
    const snapCamX = Math.round(safeCamX);
    const snapCamY = Math.round(safeCamY);
    const vx = safeWx - snapCamX;
    const vy = safeWy - snapCamY;
    return { x: vx, y: vy, vx, vy, wx: safeWx, wy: safeWy };
  }

  /**
   * End-to-End: Converts screen coordinates directly to world coordinates.
   */
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

  /**
   * End-to-End: Converts world coordinates directly to screen coordinates.
   */
  public worldToScreen(
    wx: number,
    wy: number,
    camX: number,
    camY: number
  ): Point2D {
    const v = this.worldToVirtual(wx, wy, camX, camY);
    return this.virtualToScreen(v.x, v.y);
  }

  /**
   * Converts mouse movement delta (movementX, movementY) to virtual delta.
   */
  public screenDeltaToVirtual(movementX: number, movementY: number): Point2D {
    const safeScale = this.scale > 0 ? this.scale : 1;
    const dx = (Number.isFinite(movementX) ? movementX : 0) / safeScale;
    const dy = (Number.isFinite(movementY) ? movementY : 0) / safeScale;
    return { x: dx, y: dy, vx: dx, vy: dy };
  }

  /**
   * Anti-jitter integer camera snapping. Safe against NaN/Infinity values.
   */
  public snapCamera(camX: number, camY: number): Camera {
    return {
      x: Number.isFinite(camX) ? Math.round(camX) : 0,
      y: Number.isFinite(camY) ? Math.round(camY) : 0,
    };
  }

  /**
   * Calculates visible world AABB bounding box for frustum culling.
   */
  public getVisibleBounds(camX: number, camY: number, margin = 32): ViewportAABB {
    const snap = this.snapCamera(camX, camY);
    return {
      minX: snap.x - margin,
      minY: snap.y - margin,
      maxX: snap.x + this.virtualW + margin,
      maxY: snap.y + this.virtualH + margin,
    };
  }

  /**
   * Begins frame rendering on virtual buffer: resets transform matrix and clears buffer.
   */
  public beginFrame(): CanvasRenderingContext2D | null {
    if (!this.virtualCtx) return null;
    this.virtualCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.applyPixelSmoothing(this.virtualCtx, false);
    this.virtualCtx.clearRect(0, 0, this.virtualW, this.virtualH);
    return this.virtualCtx;
  }

  /**
   * Ends frame rendering: clears display canvas with letterboxing and blits virtual buffer with nearest-neighbor scaling.
   */
  public endFrame(displayCtx: CanvasRenderingContext2D | null): void {
    if (!displayCtx || !this.virtualCanvas) return;
    this.applyPixelSmoothing(displayCtx, false);

    // Letterbox/pillarbox fill
    displayCtx.fillStyle = "#000000";
    displayCtx.fillRect(0, 0, this.displayW, this.displayH);

    // Crisp nearest-neighbor integer blit
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

  /**
   * Render alias matching SCOPE.md contract.
   */
  public render(displayCtx: CanvasRenderingContext2D | null): void {
    this.endFrame(displayCtx);
  }

  /**
   * Solid color clear on virtual canvas buffer.
   */
  public clear(color = "#000000"): void {
    if (!this.virtualCtx) return;
    this.virtualCtx.fillStyle = color;
    this.virtualCtx.fillRect(0, 0, this.virtualW, this.virtualH);
  }
}

export function createPixelViewport(config?: PixelViewportConfig): PixelViewport {
  return new PixelViewportImpl(config);
}

export function createViewport(config?: PixelViewportConfig): PixelViewport {
  return new PixelViewportImpl(config);
}
