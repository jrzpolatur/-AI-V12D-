/**
 * src/game/sprites.ts
 *
 * Milestone 2 — Features F08, F09, F10
 * 3/4 Perspective Procedural Pixel Sprite Sheet Generator & Animation System
 *
 * Generates chunky retro pixel art character sprites on offscreen canvases:
 *  - Player characters with outfit/hat variations (F08, F10)
 *  - Monster archetypes (F09)
 *  - 4 animation states: idle (4f), run (6f), hurt (2f), death (4f)
 *  - Left/right facing via horizontal mirror
 *  - Sprite origin at feet (bottom-center) for Y-sort compatibility
 */

import type { CharacterDef, OutfitDef, MonsterDef, HatType } from "./types";
import { shade } from "./draw";

// ---------------------------------------------------------------------------
// Public interfaces (matching PROJECT.md contract)
// ---------------------------------------------------------------------------

export type AnimState = "idle" | "run" | "hurt" | "death";
export type FacingDir = "left" | "right";

export interface SpriteFrame {
  /** Offscreen canvas containing this single frame. */
  canvas: HTMLCanvasElement;
  /** Pivot X within the canvas (center of character). */
  originX: number;
  /** Pivot Y within the canvas (feet position / bottom). */
  originY: number;
  /** Canvas width. */
  width: number;
  /** Canvas height. */
  height: number;
}

export interface EntitySpriteSheet {
  /** Get the appropriate frame for the given state, direction, and animation time. */
  getFrame(state: AnimState, dir: FacingDir, frameTime: number): SpriteFrame;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base sprite dimensions (1x pixel scale). */
const SPRITE_W = 24;
const SPRITE_H = 32;
const FRAME_COUNTS: Record<AnimState, number> = {
  idle: 4,
  run: 6,
  hurt: 2,
  death: 4,
};

const OUTLINE = "#0a0a14";

// ---------------------------------------------------------------------------
// Headless guard
// ---------------------------------------------------------------------------

function canCreateCanvas(): boolean {
  return typeof document !== "undefined" && typeof document.createElement === "function";
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (!canCreateCanvas()) return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function getCtx(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = c.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return ctx;
}

// ---------------------------------------------------------------------------
// Pixel drawing helpers
// ---------------------------------------------------------------------------

/** Fill a pixel-aligned rectangle. */
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Draw a 1px outline rectangle. */
function pxOutline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
}

// ---------------------------------------------------------------------------
// Character frame renderer
// ---------------------------------------------------------------------------

/**
 * Draws a single character frame onto the provided context.
 * The character faces RIGHT (+x). Mirror horizontally for left-facing.
 *
 * Frame layout (24w x 32h):
 *   Row  0- 3: hat (optional)
 *   Row  4-11: head (8px tall)
 *   Row 12-22: torso (11px tall)
 *   Row 23-31: legs/boots (9px tall)
 *   Origin: bottom-center (12, 32)
 */
function drawCharFrame(
  ctx: CanvasRenderingContext2D,
  char: CharacterDef,
  outfit: OutfitDef,
  state: AnimState,
  frame: number
): void {
  const h = SPRITE_H;
  const suit = outfit.suit;
  const suitDk = outfit.suitDark || shade(suit, -0.15);
  const skin = outfit.skin || char.skin;
  const bodyColor = char.bodyColor;
  const accent = char.accent;
  const hat = outfit.hat;

  // Animation offsets
  const isIdle = state === "idle";
  const isRun = state === "run";
  const isHurt = state === "hurt";
  const isDeath = state === "death";

  // Idle bob: frames 1,2 shift body up 1px
  const idleBob = isIdle && (frame === 1 || frame === 2) ? -1 : 0;

  // Run leg offsets: 6-frame cycle
  let legLOff = 0, legROff = 0;
  if (isRun) {
    const legTable = [3, 4, 1, -3, -4, -1];
    legLOff = legTable[frame % 6];
    legROff = -legLOff;
  }

  // Body bob during run
  const bodyBob = isRun ? ((frame === 1 || frame === 4) ? -1 : 0) : idleBob;

  // Death: progressive collapse
  const deathShrink = isDeath ? Math.min(frame, 3) : 0;

  // Hurt: white flash on frame 0
  const flash = isHurt && frame === 0;
  const fCol = (c: string) => flash ? "#ffffff" : c;

  // Opacity for death fade
  if (isDeath && frame >= 3) {
    ctx.globalAlpha = 0.5;
  }

  const baseY = bodyBob - deathShrink * 2;

  // --- SHADOW ---
  px(ctx, 6, h - 2, 12, 2, "rgba(0,0,0,0.3)");
  px(ctx, 4, h - 1, 16, 1, "rgba(0,0,0,0.15)");

  // --- BOOTS (Layer 1) ---
  const bootColor = fCol(shade(suit, -0.22));
  const bootY = 24 + baseY;
  // Left boot
  px(ctx, 7 + legLOff, bootY, 4, 6, bootColor);
  pxOutline(ctx, 7 + legLOff, bootY, 4, 6, OUTLINE);
  // Right boot
  px(ctx, 13 + legROff, bootY, 4, 6, bootColor);
  pxOutline(ctx, 13 + legROff, bootY, 4, 6, OUTLINE);

  // --- TORSO (Layer 2) ---
  const torsoY = 12 + baseY;
  const torsoH = 12 - deathShrink;
  // Main body
  px(ctx, 6, torsoY, 12, torsoH, fCol(suit));
  pxOutline(ctx, 6, torsoY, 12, torsoH, OUTLINE);

  // Chest plate
  if (!flash) {
    px(ctx, 10, torsoY + 2, 6, torsoH - 4, bodyColor);
    pxOutline(ctx, 10, torsoY + 2, 6, torsoH - 4, OUTLINE);
    // Accent dot (insignia)
    px(ctx, 12, torsoY + Math.round(torsoH / 2) - 1, 2, 2, accent);
  }

  // Belt
  px(ctx, 6, torsoY + torsoH - 2, 12, 2, fCol(shade(suit, -0.3)));

  // Backpack (left side)
  px(ctx, 3, torsoY + 1, 3, torsoH - 2, fCol(suitDk));
  pxOutline(ctx, 3, torsoY + 1, 3, torsoH - 2, OUTLINE);
  // Backpack accent stripe
  if (!flash) {
    px(ctx, 4, torsoY + 2, 1, torsoH - 4, outfit.accent);
  }

  // --- HEAD (Layer 3) ---
  const headY = 4 + baseY;
  const headH = 8;
  // Skin base
  px(ctx, 8, headY, 8, headH, fCol(skin));
  pxOutline(ctx, 8, headY, 8, headH, OUTLINE);

  // Face details (only if not flash)
  if (!flash && !isDeath) {
    // Eyes (2px dots)
    px(ctx, 13, headY + 3, 2, 2, "#111111");
    // Eye highlight
    px(ctx, 14, headY + 3, 1, 1, "#ffffff");
    // Mouth
    px(ctx, 13, headY + 6, 2, 1, shade(skin, -0.2));
  }

  // --- HAT (Layer 4) ---
  if (hat !== "none" && !isDeath) {
    drawHatSprite(ctx, hat, outfit, char, headY, flash);
  }

  // --- ARM (visible right arm holding weapon, drawn last for depth) ---
  const armY = torsoY + 2;
  px(ctx, 17, armY, 3, 5, fCol(skin));
  pxOutline(ctx, 17, armY, 3, 5, OUTLINE);

  ctx.globalAlpha = 1;
}

/**
 * Draws a hat on the character head in sprite space.
 */
function drawHatSprite(
  ctx: CanvasRenderingContext2D,
  hat: HatType,
  outfit: OutfitDef,
  char: CharacterDef,
  headY: number,
  flash: boolean
): void {
  const fCol = (c: string) => flash ? "#ffffff" : c;

  switch (hat) {
    case "cap":
      px(ctx, 7, headY - 2, 10, 3, fCol(outfit.accent));
      px(ctx, 14, headY - 1, 4, 2, fCol(shade(outfit.accent, -0.15)));
      pxOutline(ctx, 7, headY - 2, 10, 3, OUTLINE);
      break;

    case "helmet":
      px(ctx, 7, headY - 3, 10, 5, fCol("#556677"));
      pxOutline(ctx, 7, headY - 3, 10, 5, OUTLINE);
      // Visor slit
      px(ctx, 13, headY - 1, 3, 2, "rgba(100,200,255,0.6)");
      break;

    case "hood":
      px(ctx, 6, headY - 2, 12, 6, fCol(outfit.suit));
      pxOutline(ctx, 6, headY - 2, 12, 6, OUTLINE);
      // Shadow under hood
      px(ctx, 8, headY + 2, 8, 2, "rgba(0,0,0,0.3)");
      break;

    case "visor":
      px(ctx, 8, headY + 2, 8, 3, fCol("#22ccff"));
      px(ctx, 9, headY + 2, 6, 1, "#aaeeff");
      pxOutline(ctx, 8, headY + 2, 8, 3, OUTLINE);
      break;

    case "alien":
      // Alien dome
      px(ctx, 6, headY - 4, 12, 5, fCol("#88cc88"));
      pxOutline(ctx, 6, headY - 4, 12, 5, OUTLINE);
      // Big eyes
      px(ctx, 10, headY + 2, 3, 3, "#111111");
      px(ctx, 11, headY + 2, 1, 1, "#44ff44");
      break;

    case "monkey":
      // Ears
      px(ctx, 6, headY, 2, 4, fCol(shade(char.bodyColor, -0.1)));
      px(ctx, 16, headY, 2, 4, fCol(shade(char.bodyColor, -0.1)));
      // Muzzle
      px(ctx, 13, headY + 4, 4, 3, "#e8c79a");
      px(ctx, 15, headY + 5, 1, 1, "#3a2510");
      px(ctx, 15, headY + 6, 1, 1, "#3a2510");
      break;

    case "tycoon":
      // Top hat
      px(ctx, 7, headY - 6, 10, 3, fCol("#0b0c22"));
      pxOutline(ctx, 7, headY - 6, 10, 3, OUTLINE);
      px(ctx, 9, headY - 3, 6, 4, fCol("#111827"));
      pxOutline(ctx, 9, headY - 3, 6, 4, OUTLINE);
      // Gold band
      px(ctx, 9, headY - 2, 6, 1, outfit.accent);
      break;
  }
}

// ---------------------------------------------------------------------------
// Monster frame renderer
// ---------------------------------------------------------------------------

function drawMonsterFrame(
  ctx: CanvasRenderingContext2D,
  monster: MonsterDef,
  state: AnimState,
  frame: number
): void {
  const h = SPRITE_H;
  const color = monster.color;
  const glow = monster.glow;
  const behavior = monster.behavior;
  const isDeath = state === "death";
  const isHurt = state === "hurt";
  const isRun = state === "run";
  const flash = isHurt && frame === 0;
  const fCol = (c: string) => flash ? "#ffffff" : c;

  const bob = (state === "idle" && (frame === 1 || frame === 2)) ? -1 : 0;
  const deathShrink = isDeath ? Math.min(frame, 3) * 2 : 0;
  const baseY = bob;

  if (isDeath && frame >= 3) ctx.globalAlpha = 0.4;

  // Shadow
  px(ctx, 6, h - 2, 12, 2, "rgba(0,0,0,0.3)");

  // Leg animation for runners
  let legL = 0, legR = 0;
  if (isRun) {
    const t = [2, 3, 1, -2, -3, -1];
    legL = t[frame % 6];
    legR = -legL;
  }

  switch (behavior) {
    case "walker":
    case "runner":
      // Humanoid zombie shape
      // Legs
      px(ctx, 8 + legL, 24 + baseY - deathShrink, 3, 6, fCol(shade(color, -0.2)));
      px(ctx, 13 + legR, 24 + baseY - deathShrink, 3, 6, fCol(shade(color, -0.2)));
      // Body
      px(ctx, 7, 13 + baseY, 10, 11 - deathShrink, fCol(color));
      pxOutline(ctx, 7, 13 + baseY, 10, 11 - deathShrink, OUTLINE);
      // Head
      px(ctx, 8, 5 + baseY, 8, 8, fCol(shade(color, 0.1)));
      pxOutline(ctx, 8, 5 + baseY, 8, 8, OUTLINE);
      // Glowing eyes
      if (!flash && !isDeath) {
        px(ctx, 13, 8 + baseY, 2, 2, glow);
      }
      // Runner has torn clothes detail
      if (behavior === "runner" && !flash) {
        px(ctx, 7, 18 + baseY, 2, 1, shade(color, -0.3));
        px(ctx, 15, 20 + baseY, 2, 1, shade(color, -0.3));
      }
      break;

    case "brute":
      // Huge body
      px(ctx, 5, 14 + baseY, 14, 14 - deathShrink, fCol(color));
      pxOutline(ctx, 5, 14 + baseY, 14, 14 - deathShrink, OUTLINE);
      // Big head
      px(ctx, 6, 4 + baseY, 12, 10, fCol(shade(color, 0.08)));
      pxOutline(ctx, 6, 4 + baseY, 12, 10, OUTLINE);
      if (!flash && !isDeath) {
        px(ctx, 14, 8 + baseY, 3, 2, glow);
      }
      // Arms
      px(ctx, 3, 16 + baseY, 3, 8, fCol(shade(color, -0.1)));
      px(ctx, 18, 16 + baseY, 3, 8, fCol(shade(color, -0.1)));
      break;

    case "spitter":
      // Ranged zombie, thinner
      px(ctx, 8 + legL, 24 + baseY, 3, 6, fCol(shade(color, -0.2)));
      px(ctx, 13 + legR, 24 + baseY, 3, 6, fCol(shade(color, -0.2)));
      px(ctx, 8, 14 + baseY, 8, 10 - deathShrink, fCol(color));
      pxOutline(ctx, 8, 14 + baseY, 8, 10 - deathShrink, OUTLINE);
      // Distended head/mouth
      px(ctx, 7, 5 + baseY, 10, 9, fCol(shade(color, 0.1)));
      pxOutline(ctx, 7, 5 + baseY, 10, 9, OUTLINE);
      if (!flash && !isDeath) {
        px(ctx, 14, 10 + baseY, 3, 3, glow); // open maw glow
      }
      break;

    case "crawler":
      // Tiny, flat bug-like
      const cY = 20 + baseY;
      px(ctx, 6, cY, 12, 6 - deathShrink, fCol(color));
      pxOutline(ctx, 6, cY, 12, 6 - deathShrink, OUTLINE);
      // Legs (many)
      for (let i = 0; i < 3; i++) {
        const off = isRun ? ((frame + i) % 3 - 1) : 0;
        px(ctx, 5 + i * 4, cY + 5 + off, 2, 3, fCol(shade(color, -0.2)));
        px(ctx, 5 + i * 4, cY - 1 + off, 2, 2, fCol(shade(color, -0.2)));
      }
      if (!flash && !isDeath) {
        px(ctx, 15, cY + 1, 2, 1, glow);
      }
      break;

    case "bloater":
      // Fat, round body
      px(ctx, 4, 10 + baseY, 16, 16 - deathShrink, fCol(color));
      pxOutline(ctx, 4, 10 + baseY, 16, 16 - deathShrink, OUTLINE);
      // Small head
      px(ctx, 8, 4 + baseY, 8, 7, fCol(shade(color, 0.12)));
      pxOutline(ctx, 8, 4 + baseY, 8, 7, OUTLINE);
      // Pulsing glow patches
      if (!flash && !isDeath) {
        px(ctx, 8, 16 + baseY, 3, 3, glow);
        px(ctx, 14, 18 + baseY, 2, 2, glow);
      }
      break;

    case "screamer":
      // Tall, thin
      px(ctx, 9 + legL, 24 + baseY, 3, 6, fCol(shade(color, -0.2)));
      px(ctx, 12 + legR, 24 + baseY, 3, 6, fCol(shade(color, -0.2)));
      px(ctx, 9, 10 + baseY, 6, 14 - deathShrink, fCol(color));
      pxOutline(ctx, 9, 10 + baseY, 6, 14 - deathShrink, OUTLINE);
      // Wide screaming head
      px(ctx, 6, 3 + baseY, 12, 7, fCol(shade(color, 0.15)));
      pxOutline(ctx, 6, 3 + baseY, 12, 7, OUTLINE);
      if (!flash && !isDeath) {
        px(ctx, 14, 6 + baseY, 3, 3, glow); // open mouth
      }
      break;

    case "spore":
      // Mushroom-like
      // Stem
      px(ctx, 9, 16 + baseY, 6, 12 - deathShrink, fCol(shade(color, -0.15)));
      pxOutline(ctx, 9, 16 + baseY, 6, 12 - deathShrink, OUTLINE);
      // Cap
      px(ctx, 5, 6 + baseY, 14, 10, fCol(color));
      pxOutline(ctx, 5, 6 + baseY, 14, 10, OUTLINE);
      // Spore spots
      if (!flash) {
        px(ctx, 8, 8 + baseY, 2, 2, glow);
        px(ctx, 13, 10 + baseY, 2, 2, glow);
        px(ctx, 10, 12 + baseY, 2, 2, glow);
      }
      break;

    case "abomination":
      // Boss: massive body
      px(ctx, 2, 8 + baseY, 20, 20 - deathShrink, fCol(color));
      pxOutline(ctx, 2, 8 + baseY, 20, 20 - deathShrink, OUTLINE);
      // Multi-eye head
      px(ctx, 5, 2 + baseY, 14, 8, fCol(shade(color, 0.1)));
      pxOutline(ctx, 5, 2 + baseY, 14, 8, OUTLINE);
      if (!flash && !isDeath) {
        px(ctx, 8, 4 + baseY, 2, 2, glow);
        px(ctx, 12, 3 + baseY, 2, 2, glow);
        px(ctx, 15, 5 + baseY, 2, 2, glow);
      }
      // Tentacle arms
      px(ctx, 0, 14 + baseY, 3, 10, fCol(shade(color, -0.1)));
      px(ctx, 21, 14 + baseY, 3, 10, fCol(shade(color, -0.1)));
      break;

    default:
      // Fallback generic
      px(ctx, 7, 13 + baseY, 10, 15 - deathShrink, fCol(color));
      pxOutline(ctx, 7, 13 + baseY, 10, 15 - deathShrink, OUTLINE);
      px(ctx, 8, 5 + baseY, 8, 8, fCol(shade(color, 0.1)));
      pxOutline(ctx, 8, 5 + baseY, 8, 8, OUTLINE);
      break;
  }

  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// SpriteSheet implementation
// ---------------------------------------------------------------------------

type FrameMap = Map<string, SpriteFrame>;

class ProceduralSpriteSheet implements EntitySpriteSheet {
  private frames: FrameMap = new Map();

  constructor(
    renderer: (ctx: CanvasRenderingContext2D, state: AnimState, frame: number) => void
  ) {
    if (!canCreateCanvas()) return;

    for (const state of ["idle", "run", "hurt", "death"] as AnimState[]) {
      const count = FRAME_COUNTS[state];
      for (let f = 0; f < count; f++) {
        // Generate right-facing frame
        const canvas = makeCanvas(SPRITE_W, SPRITE_H);
        if (!canvas) continue;
        const ctx = getCtx(canvas);
        if (!ctx) continue;

        ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
        renderer(ctx, state, f);

        const rightFrame: SpriteFrame = {
          canvas,
          originX: Math.round(SPRITE_W / 2),
          originY: SPRITE_H,
          width: SPRITE_W,
          height: SPRITE_H,
        };
        this.frames.set(`${state}_right_${f}`, rightFrame);

        // Generate left-facing frame (horizontal mirror)
        const mirrorCanvas = makeCanvas(SPRITE_W, SPRITE_H);
        if (!mirrorCanvas) continue;
        const mCtx = getCtx(mirrorCanvas);
        if (!mCtx) continue;

        mCtx.translate(SPRITE_W, 0);
        mCtx.scale(-1, 1);
        mCtx.drawImage(canvas, 0, 0);

        const leftFrame: SpriteFrame = {
          canvas: mirrorCanvas,
          originX: Math.round(SPRITE_W / 2),
          originY: SPRITE_H,
          width: SPRITE_W,
          height: SPRITE_H,
        };
        this.frames.set(`${state}_left_${f}`, leftFrame);
      }
    }
  }

  getFrame(state: AnimState, dir: FacingDir, frameTime: number): SpriteFrame {
    const count = FRAME_COUNTS[state] ?? 4;
    let frameIdx: number;

    if (state === "death") {
      // Death plays once, sticks on last frame
      frameIdx = Math.min(Math.floor(frameTime * 6), count - 1);
    } else if (state === "hurt") {
      // Hurt alternates frames 0,1
      frameIdx = Math.floor(frameTime * 8) % count;
    } else if (state === "run") {
      // Run: 6-frame cycle at ~9 fps
      frameIdx = Math.floor(frameTime * 9) % count;
    } else {
      // Idle: 4-frame cycle at ~4 fps
      frameIdx = Math.floor(frameTime * 4) % count;
    }

    const key = `${state}_${dir}_${frameIdx}`;
    const frame = this.frames.get(key);
    if (frame) return frame;

    // Fallback: first idle right frame
    const fallback = this.frames.get("idle_right_0");
    if (fallback) return fallback;

    // Ultimate fallback for headless
    return {
      canvas: null as unknown as HTMLCanvasElement,
      originX: Math.round(SPRITE_W / 2),
      originY: SPRITE_H,
      width: SPRITE_W,
      height: SPRITE_H,
    };
  }
}

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

const _charSpriteCache = new Map<string, EntitySpriteSheet>();
const _monsterSpriteCache = new Map<string, EntitySpriteSheet>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a sprite sheet for a player character + outfit combination.
 * Generated procedurally on offscreen canvases.
 */
export function createEntitySpriteSheet(
  character: CharacterDef,
  outfit: OutfitDef
): EntitySpriteSheet {
  return new ProceduralSpriteSheet((ctx, state, frame) => {
    drawCharFrame(ctx, character, outfit, state, frame);
  });
}

/**
 * Get (or create and cache) a sprite sheet by character and outfit ID.
 * Requires `getCharacter` and `getOutfit` from content.ts to be available,
 * but we accept the defs directly to avoid circular imports.
 */
export function getSpriteSheet(char: CharacterDef, outfit: OutfitDef): EntitySpriteSheet {
  const key = `${char.id}_${outfit.id}`;
  let sheet = _charSpriteCache.get(key);
  if (!sheet) {
    sheet = createEntitySpriteSheet(char, outfit);
    _charSpriteCache.set(key, sheet);
  }
  return sheet;
}

/**
 * Create a sprite sheet for a monster archetype.
 */
export function createMonsterSpriteSheet(monster: MonsterDef): EntitySpriteSheet {
  return new ProceduralSpriteSheet((ctx, state, frame) => {
    drawMonsterFrame(ctx, monster, state, frame);
  });
}

/**
 * Get (or create and cache) a monster sprite sheet by monster ID.
 */
export function getMonsterSpriteSheet(monster: MonsterDef): EntitySpriteSheet {
  const key = monster.id;
  let sheet = _monsterSpriteCache.get(key);
  if (!sheet) {
    sheet = createMonsterSpriteSheet(monster);
    _monsterSpriteCache.set(key, sheet);
  }
  return sheet;
}

/**
 * Draw a sprite frame at world position with the origin at feet.
 * This is the primary entry point for rendering entities using the new sprite system.
 *
 * @param ctx    Canvas rendering context
 * @param sheet  Entity sprite sheet
 * @param x      World X (center of character)
 * @param y      World Y (feet / ground contact point)
 * @param state  Animation state
 * @param dir    Facing direction
 * @param time   Animation time accumulator
 * @param scale  Optional render scale (default 1)
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: EntitySpriteSheet,
  x: number,
  y: number,
  state: AnimState,
  dir: FacingDir,
  time: number,
  scale = 1
): void {
  if (!ctx) return;

  const frame = sheet.getFrame(state, dir, time);
  if (!frame || !frame.canvas) return;

  const drawX = Math.round(x - frame.originX * scale);
  const drawY = Math.round(y - frame.originY * scale);
  const drawW = Math.round(frame.width * scale);
  const drawH = Math.round(frame.height * scale);

  ctx.drawImage(frame.canvas, drawX, drawY, drawW, drawH);
}

/**
 * Clear all cached sprite sheets (useful for hot-reload or memory cleanup).
 */
export function clearSpriteCache(): void {
  _charSpriteCache.clear();
  _monsterSpriteCache.clear();
}
