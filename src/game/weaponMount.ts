/**
 * src/game/weaponMount.ts
 *
 * Milestone 2 — Feature F11, F12
 * 360° Orbital Weapon Mounting, Dynamic Flipping & Recoil System
 *
 * Computes the render transform for a weapon orbiting a character's hand
 * anchor in 3/4 perspective. Handles:
 *  - Orbital position around body center
 *  - Aim-angle rotation
 *  - Horizontal flip when aiming left
 *  - Depth sorting (behind body when aiming up)
 *  - Recoil impulse with exponential decay
 *  - Barrel tip & eject port world positions for particle spawning
 */

import type { GunDef } from "./types";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Computed per-frame weapon rendering transform in world space. */
export interface WeaponMountTransform {
  /** Weapon draw position X (world space, pixel-snapped). */
  renderX: number;
  /** Weapon draw position Y (world space, pixel-snapped). */
  renderY: number;
  /** Weapon rotation in radians (matches aim angle). */
  rotation: number;
  /** True when aiming left — flip weapon sprite vertically (scaleY = -1). */
  flipY: boolean;
  /** True when aiming upward — draw weapon behind the character body. */
  drawBehindBody: boolean;
  /** Muzzle flash spawn point X (world space). */
  barrelTipX: number;
  /** Muzzle flash spawn point Y (world space). */
  barrelTipY: number;
  /** Shell casing ejection point X (world space). */
  ejectPortX: number;
  /** Shell casing ejection point Y (world space). */
  ejectPortY: number;
}

/** Mutable per-entity recoil state. */
export interface RecoilState {
  /** Current backwards offset distance along aim axis (px). */
  distance: number;
  /** Random angular jitter (radians) applied to weapon rotation. */
  angularJitter: number;
}

// ---------------------------------------------------------------------------
// Reusable result object — avoids per-frame allocations
// ---------------------------------------------------------------------------
const _result: WeaponMountTransform = {
  renderX: 0,
  renderY: 0,
  rotation: 0,
  flipY: false,
  drawBehindBody: false,
  barrelTipX: 0,
  barrelTipY: 0,
  ejectPortX: 0,
  ejectPortY: 0,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance from body center to hand anchor point (px in virtual space). */
const HAND_ORBIT_RADIUS = 10;

/** Angle threshold: weapon drawn behind body when aim is in this upper arc. */
const BEHIND_THRESHOLD_MIN = -Math.PI * 0.85;
const BEHIND_THRESHOLD_MAX = -Math.PI * 0.15;

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

/**
 * Computes the full weapon mount transform for rendering.
 *
 * @param bodyX    Character center X (world space)
 * @param bodyY    Character center Y (world space)
 * @param aimAngle Aim direction in radians (0 = right, PI/2 = down)
 * @param recoilDist Current recoil offset distance (px)
 * @param gunDef   Weapon definition (for barrel length etc.)
 * @returns Reused WeaponMountTransform object — do NOT cache the reference.
 */
export function computeWeaponMount(
  bodyX: number,
  bodyY: number,
  aimAngle: number,
  recoilDist: number,
  gunDef: GunDef
): WeaponMountTransform {
  const cos = Math.cos(aimAngle);
  const sin = Math.sin(aimAngle);

  // Hand anchor orbits around the body at a fixed radius
  const handX = bodyX + cos * HAND_ORBIT_RADIUS;
  const handY = bodyY + sin * HAND_ORBIT_RADIUS;

  // Apply recoil: push weapon backwards along aim axis
  const rx = handX - cos * recoilDist;
  const ry = handY - sin * recoilDist;

  // Flip when aiming left (absolute angle > PI/2)
  const absAngle = Math.abs(aimAngle);
  const flipY = absAngle > Math.PI * 0.5;

  // Draw behind body when aiming into the upper arc
  const drawBehindBody =
    aimAngle > BEHIND_THRESHOLD_MIN && aimAngle < BEHIND_THRESHOLD_MAX;

  // Barrel tip: extends from hand along aim direction by barrel length
  const barrelLen = gunDef.barrel ?? 20;
  const tipX = rx + cos * barrelLen;
  const tipY = ry + sin * barrelLen;

  // Eject port: 60% along barrel, perpendicular to aim (upward when facing right)
  const ejectDist = barrelLen * 0.6;
  const perpX = -sin; // perpendicular direction
  const perpY = cos;
  const ejectSign = flipY ? -1 : 1;
  const ejectBaseX = rx + cos * ejectDist;
  const ejectBaseY = ry + sin * ejectDist;

  _result.renderX = Math.round(rx);
  _result.renderY = Math.round(ry);
  _result.rotation = aimAngle;
  _result.flipY = flipY;
  _result.drawBehindBody = drawBehindBody;
  _result.barrelTipX = Math.round(tipX);
  _result.barrelTipY = Math.round(tipY);
  _result.ejectPortX = Math.round(ejectBaseX + perpX * 4 * ejectSign);
  _result.ejectPortY = Math.round(ejectBaseY + perpY * 4 * ejectSign);

  return _result;
}

// ---------------------------------------------------------------------------
// Recoil state management
// ---------------------------------------------------------------------------

/** Creates a fresh zero-recoil state. */
export function createRecoilState(): RecoilState {
  return { distance: 0, angularJitter: 0 };
}

/**
 * Apply an instantaneous recoil impulse when the weapon fires.
 * @param state  Mutable recoil state
 * @param gunDef Weapon def — uses knockback to scale impulse magnitude
 */
export function applyRecoilImpulse(state: RecoilState, gunDef: GunDef): void {
  const kb = gunDef.knockback ?? 0;
  // Heavier knockback = more visual recoil, capped for sanity
  state.distance = Math.min(8, kb * 0.35 + 1.5);
  // Random angular jitter ±0.08 rad
  state.angularJitter = (Math.random() - 0.5) * 0.16;
}

/**
 * Tick recoil decay. Call once per frame.
 * @param state Mutable recoil state
 * @param dt    Frame delta time in seconds
 */
export function updateRecoil(state: RecoilState, dt: number): void {
  // Exponential decay — frame-rate independent via dt-scaled factor
  const decayFactor = Math.pow(0.0001, dt); // very fast decay (~85% per 16ms)
  state.distance *= decayFactor;
  state.angularJitter *= decayFactor;

  // Snap to zero below threshold to avoid floating-point drift
  if (state.distance < 0.05) state.distance = 0;
  if (Math.abs(state.angularJitter) < 0.001) state.angularJitter = 0;
}

// ---------------------------------------------------------------------------
// Weapon Sprite Cache (procedural pixel weapon sprites on offscreen canvas)
// ---------------------------------------------------------------------------

const _weaponSpriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Returns a cached offscreen canvas containing the pixel weapon sprite
 * for the given gun definition and accent color.
 *
 * @param gunDef       Weapon definition
 * @param accentColor  Outfit/character accent color for tinting
 * @returns Offscreen HTMLCanvasElement, or null in headless environments
 */
export function getWeaponSprite(
  gunDef: GunDef,
  accentColor: string
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const key = `${gunDef.shape}_${accentColor}`;
  const cached = _weaponSpriteCache.get(key);
  if (cached) return cached;

  // Generate a simple pixel weapon sprite
  const w = Math.round(Math.max(24, (gunDef.barrel ?? 20) + 8));
  const h = 12;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const shape = gunDef.shape ?? "pistol";
  const color = gunDef.color ?? "#888888";
  const midY = Math.round(h / 2);

  // Common: grip (back portion)
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(0, midY - 3, 6, 6);

  // Barrel body
  ctx.fillStyle = color;
  const barrelW = w - 6;
  ctx.fillRect(6, midY - 2, barrelW, 4);

  // Dark outline
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(6, midY - 3, barrelW, 1);
  ctx.fillRect(6, midY + 2, barrelW, 1);

  // Muzzle tip highlight
  ctx.fillStyle = "#ccccdd";
  ctx.fillRect(w - 2, midY - 1, 2, 2);

  // Accent stripe
  ctx.fillStyle = accentColor;
  ctx.fillRect(8, midY - 1, Math.min(6, barrelW - 4), 2);

  // Shape-specific details
  if (shape === "shotgun" || shape === "pump") {
    // Pump grip
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(Math.round(w * 0.4), midY - 3, 4, 6);
  } else if (shape === "sniper" || shape === "scout") {
    // Scope
    ctx.fillStyle = "#334455";
    ctx.fillRect(Math.round(w * 0.35), midY - 5, 6, 3);
    ctx.fillStyle = "#66aaff";
    ctx.fillRect(Math.round(w * 0.35) + 1, midY - 4, 4, 1);
  } else if (shape === "rpg" || shape === "launcher") {
    // Wide tube
    ctx.fillStyle = "#556644";
    ctx.fillRect(6, midY - 3, barrelW, 6);
    ctx.fillStyle = accentColor;
    ctx.fillRect(8, midY + 2, barrelW - 4, 1);
  } else if (shape === "gatling" || shape === "minigun") {
    // Multi-barrel
    ctx.fillRect(6, midY - 4, barrelW, 1);
    ctx.fillRect(6, midY + 3, barrelW, 1);
  } else if (shape === "sword" || shape === "blade" || shape === "katana") {
    // Melee blade
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ccd8e8";
    ctx.fillRect(4, midY - 1, w - 6, 2);
    ctx.fillStyle = "#e8eef5";
    ctx.fillRect(4, midY - 1, w - 6, 1);
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, midY - 3, 5, 6);
    ctx.fillStyle = accentColor;
    ctx.fillRect(4, midY - 2, 2, 4);
  }

  _weaponSpriteCache.set(key, canvas);
  return canvas;
}

/**
 * Draw a weapon sprite at the computed mount transform position.
 * Handles rotation, flip, and pixel-snapping.
 */
export function drawMountedWeapon(
  ctx: CanvasRenderingContext2D,
  mount: WeaponMountTransform,
  weaponCanvas: HTMLCanvasElement | null,
  recoilJitter: number
): void {
  if (!ctx || !weaponCanvas) return;

  ctx.save();
  ctx.translate(mount.renderX, mount.renderY);
  ctx.rotate(mount.rotation + recoilJitter);
  if (mount.flipY) {
    ctx.scale(1, -1);
  }
  // Draw weapon with grip at origin, extending along +x
  ctx.drawImage(
    weaponCanvas,
    0,
    Math.round(-weaponCanvas.height / 2),
    weaponCanvas.width,
    weaponCanvas.height
  );
  ctx.restore();
}
