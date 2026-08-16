/**
 * src/game/pixelParticles.ts
 *
 * Milestone 2 — Features F13, F14, F15, F16, F17
 * Retro Pixel Particle Engine with 2.5D Shell Casing Physics
 *
 * Pool-based, zero-GC particle system supporting:
 *  - Directional muzzle flashes (F13)
 *  - 2.5D bouncing shell casings with gravity & restitution (F14)
 *  - Bullet trails & impact sparks (F15)
 *  - Blood/acid splatters & debris chunks (F16)
 *  - Stepped pixel explosion shockwaves (F17)
 *  - Coin sparkles, poison clouds, flame embers
 */

import type { GunDef } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParticleKind =
  | "muzzle_flash"
  | "shell_casing"
  | "bullet_trail"
  | "blood_splat"
  | "explosion_spark"
  | "explosion_smoke"
  | "debris_chunk"
  | "coin_sparkle"
  | "poison_cloud"
  | "flame_ember";

export interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Height above ground (2.5D z-axis). */
  z: number;
  /** Vertical velocity (2.5D). */
  vz: number;
  life: number;
  maxLife: number;
  /** Rendered pixel size (2-6). */
  size: number;
  color: string;
  kind: ParticleKind;
  /** Downward acceleration on z-axis. */
  gravity: number;
  /** Floor bounce restitution coefficient (0-1). */
  bounciness: number;
  /** Visual rotation in radians. */
  rotation: number;
  /** Rotation speed (rad/s). */
  rotSpeed: number;
  /** Number of floor bounces remaining. */
  bouncesLeft: number;
  /** Active flag for pool reuse. */
  active: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rng(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function rngInt(min: number, max: number): number {
  return Math.floor(rng(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

const MUZZLE_COLORS = ["#ffffff", "#fff7a0", "#ffcc33", "#ff8800"];
const SPARK_COLORS = ["#ffffff", "#ffee55", "#ff9900", "#ff5500"];
const SMOKE_COLORS = ["#555555", "#444444", "#333333", "#222222"];
const BLOOD_COLORS = ["#cc0000", "#aa0000", "#880000", "#660000"];
const ACID_COLORS = ["#33cc33", "#22aa22", "#118811", "#006600"];
const WOOD_COLORS = ["#c4883a", "#a0722e", "#8b6914", "#6b4e0a"];
const STONE_COLORS = ["#999999", "#888888", "#777777", "#666666"];
const METAL_COLORS = ["#aabbcc", "#8899aa", "#667788", "#556677"];
const COIN_COLORS = ["#ffd700", "#ffee44", "#ffcc00", "#ffffff"];
const POISON_COLORS = ["#44cc44", "#33aa33", "#55ee55"];
const FLAME_COLORS = ["#ff4400", "#ff6600", "#ff8800", "#ffaa00", "#ffcc44"];
const SHELL_COLOR = "#d4aa44";
const SHELL_DARK = "#8a6e22";

// ---------------------------------------------------------------------------
// PixelParticleSystem
// ---------------------------------------------------------------------------

export class PixelParticleSystem {
  private pool: PixelParticle[];
  private count: number;

  constructor(maxParticles = 512) {
    this.pool = new Array(maxParticles);
    this.count = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = this.createEmpty();
    }
  }

  private createEmpty(): PixelParticle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      z: 0, vz: 0,
      life: 0, maxLife: 0,
      size: 2, color: "#ffffff",
      kind: "muzzle_flash",
      gravity: 0, bounciness: 0,
      rotation: 0, rotSpeed: 0,
      bouncesLeft: 0,
      active: false,
    };
  }

  /** Acquire a particle from the pool, or expand if needed. */
  private acquire(): PixelParticle {
    for (let i = 0; i < this.count; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        return this.pool[i];
      }
    }
    // Expand pool (doubling)
    const newCap = this.count * 2;
    for (let i = this.count; i < newCap; i++) {
      this.pool[i] = this.createEmpty();
    }
    const p = this.pool[this.count];
    p.active = true;
    this.count = newCap;
    return p;
  }

  /** Init a particle with common defaults. */
  private init(
    p: PixelParticle,
    kind: ParticleKind,
    x: number, y: number,
    vx: number, vy: number,
    life: number,
    size: number,
    color: string
  ): PixelParticle {
    p.kind = kind;
    p.x = x; p.y = y;
    p.vx = vx; p.vy = vy;
    p.z = 0; p.vz = 0;
    p.life = life; p.maxLife = life;
    p.size = size;
    p.color = color;
    p.gravity = 0; p.bounciness = 0;
    p.rotation = 0; p.rotSpeed = 0;
    p.bouncesLeft = 0;
    return p;
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /** Advance all active particles. Call once per frame. */
  update(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      // Motion
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 2.5D gravity & bounce
      if (p.gravity !== 0) {
        p.vz -= p.gravity * dt;
        p.z += p.vz * dt;

        if (p.z <= 0) {
          p.z = 0;
          if (p.bouncesLeft > 0 && Math.abs(p.vz) > 10) {
            p.vz = -p.vz * p.bounciness;
            p.vx *= 0.7;
            p.vy *= 0.7;
            p.bouncesLeft--;
          } else {
            // Come to rest
            p.vz = 0;
            p.gravity = 0;
            p.vx *= 0.92;
            p.vy *= 0.92;
            // Ground decals fade quickly
            if (p.kind === "shell_casing") {
              p.life = Math.min(p.life, 3.0);
            }
          }
        }
      }

      // Rotation
      if (p.rotSpeed !== 0) {
        p.rotation += p.rotSpeed * dt;
      }

      // Smoke expansion
      if (p.kind === "explosion_smoke") {
        p.size += dt * 12;
        p.vy -= dt * 15; // rise
      }

      // Poison cloud drift
      if (p.kind === "poison_cloud") {
        p.size += dt * 3;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Draw
  // -----------------------------------------------------------------------

  /** Render all active particles. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!ctx) return;

    for (let i = 0; i < this.count; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      const drawY = Math.round(p.y - p.z);
      const drawX = Math.round(p.x);
      const sz = Math.round(p.size);

      switch (p.kind) {
        case "shell_casing":
          this.drawShellCasing(ctx, p, drawX, drawY, alpha);
          break;

        case "muzzle_flash":
          ctx.globalAlpha = Math.min(1, p.life / p.maxLife);
          ctx.fillStyle = p.color;
          ctx.fillRect(drawX - sz, drawY - sz, sz * 2, sz * 2);
          ctx.globalAlpha = 1;
          break;

        case "explosion_smoke":
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = p.color;
          ctx.fillRect(drawX - Math.round(sz / 2), drawY - Math.round(sz / 2), sz, sz);
          ctx.globalAlpha = 1;
          break;

        case "poison_cloud":
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = p.color;
          ctx.fillRect(drawX - Math.round(sz / 2), drawY - Math.round(sz / 2), sz, sz);
          ctx.globalAlpha = 1;
          break;

        default:
          // Generic pixel dot
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(drawX - Math.floor(sz / 2), drawY - Math.floor(sz / 2), sz, sz);
          ctx.globalAlpha = 1;
          break;
      }
    }
  }

  private drawShellCasing(
    ctx: CanvasRenderingContext2D,
    p: PixelParticle,
    dx: number,
    dy: number,
    alpha: number
  ): void {
    // Ground shadow
    if (p.z > 1) {
      ctx.globalAlpha = 0.3 * alpha;
      ctx.fillStyle = "#000000";
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 2);
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(p.rotation);

    // Shell body (4x2 golden rect)
    ctx.fillStyle = SHELL_COLOR;
    ctx.fillRect(-2, -1, 4, 2);
    // Dark edge
    ctx.fillStyle = SHELL_DARK;
    ctx.fillRect(-2, -1, 1, 2);
    // Bright rim
    ctx.fillStyle = "#f0d060";
    ctx.fillRect(1, -1, 1, 1);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // -----------------------------------------------------------------------
  // Emitters
  // -----------------------------------------------------------------------

  /** Directional muzzle flash — bright pixel starburst along fire direction. */
  emitMuzzleFlash(x: number, y: number, angle: number, color: string, count = 5): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const spread = rng(-0.4, 0.4);
      const speed = rng(60, 180);
      const ca = Math.cos(angle + spread);
      const sa = Math.sin(angle + spread);

      this.init(p, "muzzle_flash",
        x + cos * rng(0, 4), y + sin * rng(0, 4),
        ca * speed, sa * speed,
        rng(0.04, 0.1),
        rngInt(2, 4),
        i === 0 ? "#ffffff" : (color || pick(MUZZLE_COLORS))
      );
    }
  }

  /** 2.5D shell casing ejection with gravity, bounce, and spin. */
  emitShellCasing(x: number, y: number, angle: number, _gunDef?: GunDef): void {
    const p = this.acquire();
    // Eject perpendicular to aim (upward when facing right)
    const perpAngle = angle - Math.PI * 0.5;
    const ejectSpeed = rng(30, 80);

    this.init(p, "shell_casing",
      x, y,
      Math.cos(perpAngle) * ejectSpeed + rng(-10, 10),
      Math.sin(perpAngle) * ejectSpeed + rng(-10, 10),
      5.0, // long life for ground decal persistence
      3,
      SHELL_COLOR
    );
    p.z = rng(4, 8);
    p.vz = rng(80, 130);
    p.gravity = rng(350, 450);
    p.bounciness = rng(0.3, 0.5);
    p.bouncesLeft = rngInt(2, 3);
    p.rotation = rng(0, Math.PI * 2);
    p.rotSpeed = rng(-12, 12);
  }

  /** Fading smoke puff along bullet trajectory. */
  emitBulletTrail(x: number, y: number, color: string): void {
    const p = this.acquire();
    this.init(p, "bullet_trail",
      x + rng(-1, 1), y + rng(-1, 1),
      rng(-5, 5), rng(-8, -2),
      rng(0.15, 0.35),
      rngInt(1, 2),
      color || "#aaaaaa"
    );
  }

  /** Directional blood/acid splatter on character hit. */
  emitBloodSplat(x: number, y: number, angle: number, color?: string): void {
    const palette = color === "acid" ? ACID_COLORS : BLOOD_COLORS;
    const count = rngInt(4, 8);
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const spread = rng(-0.8, 0.8);
      const speed = rng(40, 120);
      const a = angle + spread;
      this.init(p, "blood_splat",
        x, y,
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.2, 0.5),
        rngInt(1, 3),
        pick(palette)
      );
      p.gravity = rng(100, 200);
      p.vz = rng(10, 40);
    }
  }

  /** Multi-phase pixel explosion — sparks, smoke, and debris. */
  emitExplosion(x: number, y: number, radius: number, _color?: string): void {
    const sparkCount = Math.round(radius * 0.15);
    const smokeCount = Math.round(radius * 0.08);

    // Phase 1: Sparks
    for (let i = 0; i < sparkCount; i++) {
      const p = this.acquire();
      const a = rng(0, Math.PI * 2);
      const speed = rng(80, 200);
      this.init(p, "explosion_spark",
        x + rng(-4, 4), y + rng(-4, 4),
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.1, 0.35),
        rngInt(2, 3),
        pick(SPARK_COLORS)
      );
      p.gravity = rng(150, 300);
      p.vz = rng(30, 80);
    }

    // Phase 2: Smoke puffs
    for (let i = 0; i < smokeCount; i++) {
      const p = this.acquire();
      const a = rng(0, Math.PI * 2);
      const speed = rng(10, 40);
      this.init(p, "explosion_smoke",
        x + rng(-6, 6), y + rng(-6, 6),
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.3, 0.6),
        rngInt(4, 8),
        pick(SMOKE_COLORS)
      );
    }
  }

  /** Debris chunks from destroyed props. */
  emitDebris(x: number, y: number, material: "wood" | "stone" | "metal", count = 6): void {
    const palette = material === "wood" ? WOOD_COLORS
      : material === "stone" ? STONE_COLORS
      : METAL_COLORS;

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const a = rng(0, Math.PI * 2);
      const speed = rng(50, 140);
      this.init(p, "debris_chunk",
        x + rng(-4, 4), y + rng(-4, 4),
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.4, 0.8),
        rngInt(2, 4),
        pick(palette)
      );
      p.gravity = rng(200, 400);
      p.vz = rng(50, 120);
      p.bounciness = material === "metal" ? 0.4 : 0.2;
      p.bouncesLeft = rngInt(1, 2);
      p.rotation = rng(0, Math.PI * 2);
      p.rotSpeed = rng(-8, 8);
    }
  }

  /** Golden sparkle particles from Cashout Vault interactions. */
  emitCoinSparkle(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const a = rng(0, Math.PI * 2);
      const speed = rng(20, 60);
      this.init(p, "coin_sparkle",
        x + rng(-6, 6), y + rng(-6, 6),
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.3, 0.7),
        rngInt(1, 2),
        pick(COIN_COLORS)
      );
      p.gravity = rng(40, 80);
      p.vz = rng(30, 70);
    }
  }

  /** Lingering green poison mist cloud. */
  emitPoisonCloud(x: number, y: number, radius: number): void {
    const count = Math.round(radius * 0.1);
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const a = rng(0, Math.PI * 2);
      const dist = rng(0, radius * 0.5);
      this.init(p, "poison_cloud",
        x + Math.cos(a) * dist, y + Math.sin(a) * dist,
        rng(-8, 8), rng(-8, 8),
        rng(1.5, 3.0),
        rngInt(6, 12),
        pick(POISON_COLORS)
      );
    }
  }

  /** Fire ember particles for flamethrower / fire grenades. */
  emitFlameEmber(x: number, y: number, angle: number, count = 3): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      const spread = rng(-0.5, 0.5);
      const speed = rng(40, 100);
      const a = angle + spread;
      this.init(p, "flame_ember",
        x, y,
        Math.cos(a) * speed, Math.sin(a) * speed,
        rng(0.2, 0.5),
        rngInt(2, 3),
        pick(FLAME_COLORS)
      );
      p.gravity = rng(20, 60);
      p.vz = rng(5, 20);
    }
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  /** Remove all active particles. */
  clear(): void {
    for (let i = 0; i < this.count; i++) {
      this.pool[i].active = false;
    }
  }

  /** Number of currently active particles. */
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

/** Create a new PixelParticleSystem instance. */
export function createPixelParticleSystem(maxParticles = 512): PixelParticleSystem {
  return new PixelParticleSystem(maxParticles);
}
