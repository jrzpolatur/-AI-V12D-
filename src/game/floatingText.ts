/**
 * src/game/floatingText.ts
 *
 * Milestone 4 — Feature F26
 * Canvas-Based Floating Combat Text System
 *
 * Pool-based, zero-GC floating damage/heal/shield numbers with:
 *  - Pop-in scale animation (1.0 → 1.3 → 1.0)
 *  - Upward drift with gravity deceleration
 *  - Alpha fade-out in final 30% of lifetime
 *  - Color coding: damage white, critical red/orange, heal green, shield blue
 *  - Retro pixel font rendering
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloatingTextEntry {
  x: number;
  y: number;
  text: string;
  color: string;
  outlineColor: string;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
  vx: number;
  /** Pop-in scale factor (animates 1.0 → 1.3 → 1.0). */
  scale: number;
  /** Whether this slot is in use. */
  active: boolean;
  /** If true, apply a brief horizontal shake on spawn. */
  critical: boolean;
}

export interface FloatingTextSpawnOpts {
  color?: string;
  size?: number;
  /** Duration in seconds. Default 0.8. */
  duration?: number;
  /** Critical hit: larger, red/orange, with shake. */
  critical?: boolean;
  /** Healing: green with + prefix. */
  heal?: boolean;
  /** Shield: blue/cyan. */
  shield?: boolean;
  /** Score/gold: golden yellow. */
  gold?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 0.8;
const DEFAULT_SIZE = 8;
const DRIFT_SPEED = -30; // upward px/s
const POP_DURATION = 0.1; // seconds for pop-in animation
const POP_SCALE = 1.35;
const FADE_START = 0.3; // fade begins at this fraction of remaining life

// Colors
const COLOR_DAMAGE = "#ffffff";
const COLOR_CRIT = "#ff6622";
const COLOR_HEAL = "#44ee66";
const COLOR_SHIELD = "#44bbff";
const COLOR_GOLD = "#ffd700";
const OUTLINE_DARK = "#0a0a14";

// ---------------------------------------------------------------------------
// FloatingTextSystem
// ---------------------------------------------------------------------------

export class FloatingTextSystem {
  private pool: FloatingTextEntry[];
  private count: number;

  constructor(maxEntries = 64) {
    this.pool = new Array(maxEntries);
    this.count = maxEntries;
    for (let i = 0; i < maxEntries; i++) {
      this.pool[i] = {
        x: 0, y: 0,
        text: "",
        color: COLOR_DAMAGE,
        outlineColor: OUTLINE_DARK,
        size: DEFAULT_SIZE,
        life: 0, maxLife: 0,
        vy: DRIFT_SPEED,
        vx: 0,
        scale: 1,
        active: false,
        critical: false,
      };
    }
  }

  /** Acquire a slot from the pool (oldest-first eviction if full). */
  private acquire(): FloatingTextEntry {
    // Find first inactive
    for (let i = 0; i < this.count; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        return this.pool[i];
      }
    }
    // Evict oldest (smallest remaining life)
    let oldest = 0;
    let minLife = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.pool[i].life < minLife) {
        minLife = this.pool[i].life;
        oldest = i;
      }
    }
    this.pool[oldest].active = true;
    return this.pool[oldest];
  }

  /**
   * Spawn a new floating text entry at world position (x, y).
   */
  spawn(x: number, y: number, text: string, opts?: FloatingTextSpawnOpts): void {
    const e = this.acquire();
    const duration = opts?.duration ?? DEFAULT_DURATION;

    e.x = x + (Math.random() - 0.5) * 8; // slight random offset
    e.y = y;
    e.life = duration;
    e.maxLife = duration;
    e.vy = DRIFT_SPEED;
    e.vx = 0;
    e.scale = POP_SCALE; // start popped up
    e.critical = false;

    if (opts?.critical) {
      e.text = text;
      e.color = opts.color ?? COLOR_CRIT;
      e.size = (opts.size ?? DEFAULT_SIZE) + 3;
      e.critical = true;
      e.vx = (Math.random() - 0.5) * 20; // shake offset
    } else if (opts?.heal) {
      e.text = `+${text}`;
      e.color = opts.color ?? COLOR_HEAL;
      e.size = opts.size ?? DEFAULT_SIZE;
    } else if (opts?.shield) {
      e.text = text;
      e.color = opts.color ?? COLOR_SHIELD;
      e.size = opts.size ?? DEFAULT_SIZE;
    } else if (opts?.gold) {
      e.text = `+${text}`;
      e.color = opts.color ?? COLOR_GOLD;
      e.size = (opts.size ?? DEFAULT_SIZE) + 1;
    } else {
      e.text = text;
      e.color = opts?.color ?? COLOR_DAMAGE;
      e.size = opts?.size ?? DEFAULT_SIZE;
    }

    e.outlineColor = OUTLINE_DARK;
  }

  /** Advance all active entries by dt seconds. */
  update(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      const e = this.pool[i];
      if (!e.active) continue;

      e.life -= dt;
      if (e.life <= 0) {
        e.active = false;
        continue;
      }

      // Upward drift with slight deceleration
      e.y += e.vy * dt;
      e.vy *= 0.98;

      // Horizontal shake decay
      if (e.vx !== 0) {
        e.x += e.vx * dt;
        e.vx *= 0.85;
      }

      // Pop-in scale animation: POP_SCALE → 1.0 over POP_DURATION
      const elapsed = e.maxLife - e.life;
      if (elapsed < POP_DURATION) {
        const t = elapsed / POP_DURATION;
        e.scale = POP_SCALE + (1.0 - POP_SCALE) * t;
      } else {
        e.scale = 1.0;
      }
    }
  }

  /** Render all active floating texts onto the provided canvas context. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;

    for (let i = 0; i < this.count; i++) {
      const e = this.pool[i];
      if (!e.active) continue;

      // Alpha fade in final portion of life
      const lifeFrac = e.life / e.maxLife;
      const alpha = lifeFrac < FADE_START ? lifeFrac / FADE_START : 1.0;

      const drawX = Math.round(e.x);
      const drawY = Math.round(e.y);
      const fontSize = Math.round(e.size * e.scale);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Pixel outline (4-directional offset)
      ctx.fillStyle = e.outlineColor;
      ctx.fillText(e.text, drawX + 1, drawY);
      ctx.fillText(e.text, drawX - 1, drawY);
      ctx.fillText(e.text, drawX, drawY + 1);
      ctx.fillText(e.text, drawX, drawY - 1);

      // Main text
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, drawX, drawY);

      ctx.restore();
    }
  }

  /** Deactivate all entries. */
  clear(): void {
    for (let i = 0; i < this.count; i++) {
      this.pool[i].active = false;
    }
  }

  /** Number of currently active entries. */
  getActiveCount(): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.pool[i].active) n++;
    }
    return n;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Create a new FloatingTextSystem instance. */
export function createFloatingTextSystem(maxEntries = 64): FloatingTextSystem {
  return new FloatingTextSystem(maxEntries);
}
