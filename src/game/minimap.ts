/**
 * src/game/minimap.ts
 *
 * Milestone 4 — Feature F27
 * Retro Pixel Radar Minimap Renderer
 *
 * Draws a compact pixel radar in the top-right corner showing:
 *  - Arena boundary
 *  - Wall/obstacle outlines
 *  - Player position (green blip)
 *  - Enemy/monster positions (red blips)
 *  - Teammate positions (blue blips)
 *  - Cashout vault / airdrop markers (golden blip)
 *  - Sweep line radar animation
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface MinimapConfig {
  /** Minimap display size in virtual pixels (default 56). */
  size?: number;
  /** Margin from screen edges (default 4). */
  margin?: number;
  /** Background opacity (default 0.6). */
  bgAlpha?: number;
  /** Radar sweep speed in radians/second (default 3). */
  sweepSpeed?: number;
}

export interface MinimapBlip {
  x: number;
  y: number;
  color: string;
  /** Blip size in minimap pixels (default 2). */
  size?: number;
  /** If true, blip pulses/blinks. */
  pulse?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SIZE = 56;
const DEFAULT_MARGIN = 4;
const BORDER_COLOR = "#334455";
const SWEEP_COLOR = "rgba(80,255,120,0.12)";
const GRID_COLOR = "rgba(60,80,100,0.2)";

// ---------------------------------------------------------------------------
// PixelMinimap
// ---------------------------------------------------------------------------

export class PixelMinimap {
  public readonly size: number;
  public readonly margin: number;
  private _bgAlpha: number;
  private sweepAngle: number;
  private sweepSpeed: number;

  constructor(config?: MinimapConfig) {
    this.size = config?.size ?? DEFAULT_SIZE;
    this.margin = config?.margin ?? DEFAULT_MARGIN;
    this._bgAlpha = config?.bgAlpha ?? 0.65;
    this.sweepAngle = 0;
    this.sweepSpeed = config?.sweepSpeed ?? 3;
  }

  /** Advance sweep animation. */
  update(dt: number): void {
    this.sweepAngle = (this.sweepAngle + this.sweepSpeed * dt) % (Math.PI * 2);
  }

  /**
   * Draw the minimap in the top-right corner of the viewport.
   *
   * @param ctx      Virtual viewport canvas context
   * @param viewW    Viewport width (480)
   * @param viewH    Viewport height (270)
   * @param arenaW   World arena width
   * @param arenaH   World arena height
   * @param walls    Wall rectangles for outline rendering
   * @param blips    Entity blips to plot
   * @param playerX  Player world X
   * @param playerY  Player world Y
   */
  draw(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    _viewH: number,
    arenaW: number,
    arenaH: number,
    walls: Array<{ x: number; y: number; w: number; h: number; invisible?: boolean }>,
    blips: MinimapBlip[],
    playerX: number,
    playerY: number
  ): void {
    if (!ctx) return;

    const s = this.size;
    const m = this.margin;
    const ox = Math.round(viewW - s - m);
    const oy = Math.round(m);

    // Scale factor: world → minimap
    const scaleX = (s - 4) / Math.max(1, arenaW);
    const scaleY = (s - 4) / Math.max(1, arenaH);

    ctx.save();

    // --- Background ---
    ctx.fillStyle = `rgba(8,10,20,${this._bgAlpha})`;
    ctx.fillRect(ox, oy, s, s);

    // --- Border ---
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, s - 1, s - 1);

    // --- Grid lines ---
    ctx.fillStyle = GRID_COLOR;
    const gridStep = Math.round(s / 4);
    for (let g = gridStep; g < s; g += gridStep) {
      ctx.fillRect(ox + g, oy + 1, 1, s - 2);
      ctx.fillRect(ox + 1, oy + g, s - 2, 1);
    }

    // --- Radar sweep ---
    ctx.save();
    const cx = ox + s / 2;
    const cy = oy + s / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, s * 0.7, this.sweepAngle, this.sweepAngle + 0.6);
    ctx.closePath();
    ctx.fillStyle = SWEEP_COLOR;
    ctx.fill();
    ctx.restore();

    // --- Walls ---
    ctx.fillStyle = "rgba(100,110,130,0.6)";
    for (const w of walls) {
      if (w.invisible) continue;
      const wx = Math.round(ox + 2 + w.x * scaleX);
      const wy = Math.round(oy + 2 + w.y * scaleY);
      const ww = Math.max(1, Math.round(w.w * scaleX));
      const wh = Math.max(1, Math.round(w.h * scaleY));
      ctx.fillRect(wx, wy, ww, wh);
    }

    // --- Blips ---
    const time = Date.now() / 1000;
    for (const b of blips) {
      const bx = Math.round(ox + 2 + b.x * scaleX);
      const by = Math.round(oy + 2 + b.y * scaleY);
      const bs = b.size ?? 2;

      // Skip if outside minimap bounds
      if (bx < ox || bx > ox + s || by < oy || by > oy + s) continue;

      // Pulse effect
      if (b.pulse && Math.floor(time * 3) % 2 === 0) continue;

      ctx.fillStyle = b.color;
      ctx.fillRect(bx - Math.floor(bs / 2), by - Math.floor(bs / 2), bs, bs);
    }

    // --- Player blip (always on top, bright green) ---
    const px = Math.round(ox + 2 + playerX * scaleX);
    const py = Math.round(oy + 2 + playerY * scaleY);
    // Outer glow
    ctx.fillStyle = "rgba(80,255,120,0.4)";
    ctx.fillRect(px - 2, py - 2, 5, 5);
    // Core
    ctx.fillStyle = "#44ff66";
    ctx.fillRect(px - 1, py - 1, 3, 3);
    // Center dot
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px, py, 1, 1);

    // --- Corner brackets (retro frame decoration) ---
    ctx.fillStyle = "#667788";
    const bl = 4; // bracket length
    // Top-left
    ctx.fillRect(ox, oy, bl, 1);
    ctx.fillRect(ox, oy, 1, bl);
    // Top-right
    ctx.fillRect(ox + s - bl, oy, bl, 1);
    ctx.fillRect(ox + s - 1, oy, 1, bl);
    // Bottom-left
    ctx.fillRect(ox, oy + s - 1, bl, 1);
    ctx.fillRect(ox, oy + s - bl, 1, bl);
    // Bottom-right
    ctx.fillRect(ox + s - bl, oy + s - 1, bl, 1);
    ctx.fillRect(ox + s - 1, oy + s - bl, 1, bl);

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new PixelMinimap instance. */
export function createPixelMinimap(config?: MinimapConfig): PixelMinimap {
  return new PixelMinimap(config);
}
