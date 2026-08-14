import type { CharacterDef, OutfitDef, GunDef, HatType, GadgetDef } from "./types";
import { drawPixelWeapon, drawPixelWeaponIcon } from "./pixelWeapons";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export const DARK = "#05060f";
const STEEL = "#475569";
const STEEL_D = "#0f172a";
const STEEL_L = "#94a3b8";
const STEEL_X = "#cbd5e1";
const WOOD = "#d97706";
const WOOD_D = "#92400e";

// ---------------------------------------------------------------------------
// Cached radial-glow gradients. Created at the ORIGIN (0,0,r) so callers can
// translate before filling and reuse one object across every instance instead
// of rebuilding it every frame — a major win on integrated GPUs.
// ---------------------------------------------------------------------------
const glowCache = new Map<string, CanvasGradient>();
function glow(ctx: CanvasRenderingContext2D, r: number, key: string, stops: [number, string][]): CanvasGradient {
  const g = glowCache.get(key);
  if (g) return g;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [o, c] of stops) grad.addColorStop(o, c);
  glowCache.set(key, grad);
  return grad;
}

// ---------------------------------------------------------------------------
// Weapon drawing — drawn pointing along +x (grip at origin).
// Each weapon gets its own detailed silhouette.
// `swing` (0..1) drives melee swing animation: rotates the whole weapon arc.
// ---------------------------------------------------------------------------
export function drawWeapon(
  ctx: CanvasRenderingContext2D,
  gun: GunDef,
  accent: string,
  t = 0,
  swing = 0
) {
  drawPixelWeapon(ctx, gun, accent, t, swing);
}

// ---------------------------------------------------------------------------
// Hat drawing (forward = +x)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Hat drawing (forward = +x) — 16-bit pixelated hats
// ---------------------------------------------------------------------------
function drawHat(
  ctx: CanvasRenderingContext2D,
  hat: HatType,
  accent: string,
  r: number
) {
  ctx.save();
  if (hat === "helmet") {
    // Pixel Tactical Combat Helmet
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(-r * 0.5), Math.round(-r * 0.55), Math.round(r * 1.05), Math.round(r * 1.1));
    ctx.strokeStyle = "rgba(8,10,25,0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.round(-r * 0.5), Math.round(-r * 0.55), Math.round(r * 1.05), Math.round(r * 1.1));
    // Visor brow strip
    ctx.fillStyle = "rgba(190,230,255,0.9)";
    ctx.fillRect(Math.round(r * 0.2), Math.round(-r * 0.45), Math.round(r * 0.42), Math.round(r * 0.9));
  } else if (hat === "cap") {
    // Pixel Forward Cap
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(-r * 0.45), Math.round(-r * 0.5), Math.round(r * 0.9), Math.round(r * 1.0));
    ctx.strokeStyle = "rgba(8,10,25,0.7)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(Math.round(-r * 0.45), Math.round(-r * 0.5), Math.round(r * 0.9), Math.round(r * 1.0));
    // Peak / Visor
    ctx.fillStyle = shade(accent, -0.2);
    ctx.fillRect(Math.round(r * 0.45), Math.round(-r * 0.35), Math.round(r * 0.5), Math.round(r * 0.7));
  } else if (hat === "hood") {
    // Pixel Assassin Hood
    ctx.fillStyle = shade(accent, -0.12);
    ctx.fillRect(Math.round(-r * 0.6), Math.round(-r * 0.6), Math.round(r * 1.2), Math.round(r * 1.2));
    ctx.strokeStyle = "rgba(8,10,25,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.round(-r * 0.6), Math.round(-r * 0.6), Math.round(r * 1.2), Math.round(r * 1.2));
  } else if (hat === "visor") {
    // Pixel Cyber Visor
    ctx.fillStyle = "rgba(8,12,30,0.92)";
    ctx.fillRect(Math.round(-r * 0.35), Math.round(-r * 0.5), Math.round(r * 0.75), Math.round(r * 1.0));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.round(-r * 0.35), Math.round(-r * 0.5), Math.round(r * 0.75), Math.round(r * 1.0));
    // Glowing neon visor line
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(r * 0.15), Math.round(-r * 0.45), Math.round(r * 0.35), Math.round(r * 0.9));
  } else if (hat === "alien") {
    // Pixel Alien head with square eyes & stepped antennae
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(Math.round(r * 0.1), Math.round(-r * 0.4), Math.round(r * 0.4), Math.round(r * 0.28));
    ctx.fillRect(Math.round(r * 0.1), Math.round(r * 0.12), Math.round(r * 0.4), Math.round(r * 0.28));
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(r * 0.25), Math.round(-r * 0.3), 3, 3);
    ctx.fillRect(Math.round(r * 0.25), Math.round(r * 0.2), 3, 3);
    // Antennae pixels
    for (const sy of [-1, 1]) {
      const ay = sy > 0 ? Math.round(r * 0.55) : Math.round(-r * 0.75);
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(-r * 0.2), ay, 4, 4);
      ctx.fillRect(Math.round(-r * 0.4), sy > 0 ? ay + 3 : ay - 3, 4, 4);
    }
  } else if (hat === "monkey") {
    // Pixel Monkey Ears & Muzzle
    ctx.fillStyle = shade(accent, -0.1);
    ctx.fillRect(Math.round(-r * 0.2), Math.round(-r * 0.8), Math.round(r * 0.4), Math.round(r * 0.35));
    ctx.fillRect(Math.round(-r * 0.2), Math.round(r * 0.45), Math.round(r * 0.4), Math.round(r * 0.35));
    // Muzzle
    ctx.fillStyle = "#e8c79a";
    ctx.fillRect(Math.round(r * 0.2), Math.round(-r * 0.25), Math.round(r * 0.45), Math.round(r * 0.5));
    ctx.fillStyle = "rgba(40,25,15,0.8)";
    ctx.fillRect(Math.round(r * 0.45), -2, 2, 2);
    ctx.fillRect(Math.round(r * 0.45), 1, 2, 2);
  } else if (hat === "tycoon") {
    // Pixel Top Hat 🎩 with gold band
    ctx.fillStyle = "#0b0c22";
    // Brim
    ctx.fillRect(Math.round(-r * 0.7), Math.round(-r * 0.65), Math.round(r * 1.4), Math.round(r * 1.3));
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(-r * 0.7), Math.round(-r * 0.65), Math.round(r * 1.4), Math.round(r * 1.3));
    // Crown
    ctx.fillStyle = "#111827";
    ctx.fillRect(Math.round(-r * 0.45), Math.round(-r * 0.45), Math.round(r * 0.9), Math.round(r * 0.9));
    // Gold band
    ctx.fillStyle = accent;
    ctx.fillRect(Math.round(-r * 0.45), Math.round(-r * 0.08), Math.round(r * 0.9), 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Character drawing — top-down, forward = +x (rotate the context to the aim)
// 16-bit Neo-Retro Pixel Character Rendering with Zero-GC overhead
// ---------------------------------------------------------------------------
export interface DrawCharOpts {
  x: number;
  y: number;
  angle: number;
  character: CharacterDef;
  outfit: OutfitDef;
  size: number;
  t?: number;
  flash?: number;
  glow?: string;
  gun?: GunDef;
  gadget?: GadgetDef;
  /** melee swing progress 0..1 (drives weapon rotation) */
  meleeSwing?: number;
  /** lunge offset along aim direction (for spear dash) */
  lunge?: number;
  isCloaked?: boolean;
  cloakAlpha?: number;
  /** thrust longsword charging status */
  thrustCharging?: boolean;
  thrustCharge?: number;
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  opts: DrawCharOpts
) {
  const { x, y, angle, character, outfit, size, flash = 0 } = opts;
  const t = opts.t ?? 0;
  const isMoving = (opts.speed ?? 0) > 10;
  // 4-frame discrete idle cycle (0, 1, 2, 3)
  const idleFrame = Math.floor((t * 4) % 4);
  const idleBob = (idleFrame === 1 || idleFrame === 2) ? 1 : 0;
  // 6-frame discrete running cycle (0..5)
  const runFrame = Math.floor((t * 9) % 6);
  const bootOffL = isMoving
    ? (runFrame === 0 ? 3 : runFrame === 1 ? 4 : runFrame === 2 ? 1 : runFrame === 3 ? -3 : runFrame === 4 ? -4 : -1)
    : 0;
  const bootOffR = isMoving ? -bootOffL : 0;
  const bodyBob = isMoving ? ((runFrame === 1 || runFrame === 4) ? 1 : 0) : idleBob;

  ctx.save();
  if (opts.isCloaked) {
    ctx.globalAlpha = opts.cloakAlpha ?? 0.15;
  }

  // 1. Stepped Pixel Shadow (dithered pixel shadow)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  const sy = Math.round(y + size * 0.74);
  const sw = Math.round(size * 0.9);
  ctx.fillRect(Math.round(x - sw), sy - 3, sw * 2, 6);
  ctx.fillRect(Math.round(x - sw * 0.75), sy - 6, Math.round(sw * 1.5), 12);
  ctx.fillRect(Math.round(x - sw * 0.4), sy - 8, Math.round(sw * 0.8), 16);
  ctx.restore();

  ctx.save();
  ctx.translate(
    Math.round(x + Math.cos(angle) * (opts.lunge ?? 0)),
    Math.round(y + Math.sin(angle) * (opts.lunge ?? 0))
  );
  ctx.rotate(angle);

  const r = Math.round(size);
  const suit = outfit.suit;
  const suitDark = outfit.suitDark;
  const isFlash = flash > 0;

  // 2. Chunky Pixel Boots (with 6-frame run stepping)
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, -0.22);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1.8;
  for (const bsy of [-1, 1]) {
    const isLeft = bsy < 0;
    const bOff = isLeft ? bootOffL : bootOffR;
    const by = bsy > 0 ? Math.round(r * 0.26) : Math.round(-r * 0.6);
    ctx.fillRect(Math.round(-r * 1.15 + bOff), by, Math.round(r * 0.52), Math.round(r * 0.34));
    ctx.strokeRect(Math.round(-r * 1.15 + bOff), by, Math.round(r * 0.52), Math.round(r * 0.34));
  }

  // 3. Chunky Pixel Tactical Backpack / Rig (with 4/6-frame bob)
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, -0.16);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1.8;
  const packW = Math.round(r * 0.5);
  const packH = Math.round(r * 0.96);
  const packX = Math.round(-r * 1.12 + bodyBob);
  const packY = Math.round(-packH / 2);
  ctx.fillRect(packX, packY, packW, packH);
  ctx.strokeRect(packX, packY, packW, packH);
  // Backpack vibrant accent stripe
  ctx.fillStyle = outfit.accent;
  ctx.fillRect(packX + 2, packY + 2, 3, packH - 4);

  // 4. Chunky Pixel Torso (Bold solid pixel block + frame bob)
  ctx.fillStyle = isFlash ? "#ffffff" : suit;
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 2.2;
  const torsoW = Math.round(r * 1.5);
  const torsoH = Math.round(r * 1.3);
  const torsoX = Math.round(-r * 0.72 + bodyBob);
  const torsoY = Math.round(-torsoH / 2);
  const c = Math.max(3, Math.round(r * 0.28));

  ctx.beginPath();
  ctx.moveTo(torsoX + c, torsoY);
  ctx.lineTo(torsoX + torsoW - c, torsoY);
  ctx.lineTo(torsoX + torsoW, torsoY + c);
  ctx.lineTo(torsoX + torsoW, torsoY + torsoH - c);
  ctx.lineTo(torsoX + torsoW - c, torsoY + torsoH);
  ctx.lineTo(torsoX + c, torsoY + torsoH);
  ctx.lineTo(torsoX, torsoY + torsoH - c);
  ctx.lineTo(torsoX, torsoY + c);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. High-Saturation Chest Armor Plate & Insignia
  if (!isFlash) {
    ctx.fillStyle = character.bodyColor;
    const plateW = Math.round(r * 0.65);
    const plateH = Math.round(r * 0.72);
    const plateX = Math.round(torsoX + torsoW * 0.42);
    const plateY = Math.round(-plateH / 2);
    ctx.fillRect(plateX, plateY, plateW, plateH);
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(plateX, plateY, plateW, plateH);

    // Accent insignia center dot (large 4x4 block)
    ctx.fillStyle = character.accent;
    ctx.fillRect(plateX + Math.round(plateW / 2) - 3, plateY + Math.round(plateH / 2) - 3, 6, 6);

    // Utility belt pouches (solid chunky pixel squares)
    ctx.fillStyle = shade(suit, -0.32);
    for (const py of [-r * 0.48, -r * 0.16, r * 0.16, r * 0.48]) {
      ctx.fillRect(Math.round(torsoX + 2), Math.round(py - 3), 5, 6);
    }
  }

  // 6. Shoulders + Arms
  const swing = opts.meleeSwing ?? 0;
  const lean = swing > 0 ? Math.sin(swing * Math.PI) * r * 0.24 : 0;
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, -0.06);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1.8;

  // Shoulder blocks
  for (const sy of [-1, 1]) {
    const shX = Math.round(r * (0.2 + lean) - r * 0.22);
    const shY = Math.round(sy * r * 0.62 - r * 0.22);
    const shSz = Math.round(r * 0.46);
    ctx.fillRect(shX, shY, shSz, shSz);
    ctx.strokeRect(shX, shY, shSz, shSz);
  }

  // Left arm (resting)
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, -0.06);
  ctx.fillRect(Math.round(-r * 0.14), Math.round(-r * 0.86), Math.round(r * 0.36), Math.round(r * 0.32));
  ctx.strokeRect(Math.round(-r * 0.14), Math.round(-r * 0.86), Math.round(r * 0.36), Math.round(r * 0.32));

  // Left hand (solid pixel block)
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, 0.2);
  ctx.fillRect(Math.round(-r * 0.22), Math.round(-r * 0.96), Math.round(r * 0.26), Math.round(r * 0.26));
  ctx.strokeRect(Math.round(-r * 0.22), Math.round(-r * 0.96), Math.round(r * 0.26), Math.round(r * 0.26));

  // Right arm & hand (weapon side)
  const isCharging = opts.thrustCharging ?? false;
  const chargeVal = opts.thrustCharge ?? 0;
  const chargePct = isCharging ? Math.min(1, chargeVal / 0.5) : 0;
  const chargeBack = chargePct * r * 0.75;
  const weaponHandX = Math.round(isCharging ? r * 0.55 - chargeBack : r * 0.55);
  const weaponHandY = Math.round(isCharging ? r * 0.62 - chargePct * r * 0.15 : r * 0.62);

  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, -0.06);
  ctx.fillRect(Math.round(r * 0.14), Math.round(r * 0.44), Math.round(r * 0.36), Math.round(r * 0.32));
  ctx.strokeRect(Math.round(r * 0.14), Math.round(r * 0.44), Math.round(r * 0.36), Math.round(r * 0.32));

  // Right hand (weapon grip block)
  ctx.fillStyle = isFlash ? "#ffffff" : shade(suit, 0.2);
  ctx.fillRect(weaponHandX - 4, weaponHandY - 4, 8, 8);
  ctx.strokeRect(weaponHandX - 4, weaponHandY - 4, 8, 8);

  // 7. Chunky Pixel Head & Helmet / Visor (forward, +x)
  const headX = Math.round(r * 0.18);
  const headW = Math.round(r * 0.84);
  const headH = Math.round(r * 0.84);
  const headLeft = Math.round(headX - headW / 2);
  const headTop = Math.round(-headH / 2);

  ctx.fillStyle = isFlash ? "#ffffff" : (outfit.skin ?? character.skin);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1.8;
  ctx.fillRect(headLeft, headTop, headW, headH);
  ctx.strokeRect(headLeft, headTop, headW, headH);

  if (!isFlash) {
    // Twin Chunky Isaac/Gungeon-Style Eyes (Black socket + White shiny glint + Color pupil)
    const eyeX = Math.round(headLeft + headW * 0.66);
    const eyeSz = Math.max(3, Math.round(r * 0.2));
    // Top eye
    ctx.fillStyle = "#09090b";
    ctx.fillRect(eyeX - 1, Math.round(-r * 0.26) - 1, eyeSz + 2, eyeSz + 2);
    ctx.fillStyle = character.accent;
    ctx.fillRect(eyeX, Math.round(-r * 0.26), eyeSz, eyeSz);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(eyeX + 1, Math.round(-r * 0.26), 1, 1);

    // Bottom eye
    ctx.fillStyle = "#09090b";
    ctx.fillRect(eyeX - 1, Math.round(r * 0.08) - 1, eyeSz + 2, eyeSz + 2);
    ctx.fillStyle = character.accent;
    ctx.fillRect(eyeX, Math.round(r * 0.08), eyeSz, eyeSz);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(eyeX + 1, Math.round(r * 0.08), 1, 1);
  }

  // 8. Pixel Hat
  ctx.save();
  ctx.translate(headX, 0);
  drawHat(ctx, outfit.hat, outfit.suit, r * 0.62);
  ctx.restore();

  // 9. Held Weapon / Gadget
  if (opts.gadget) {
    ctx.save();
    ctx.translate(weaponHandX, weaponHandY);
    ctx.scale(0.8, 0.8);
    drawGadgetModel(ctx, opts.gadget.kind, opts.gadget.color, t);
    ctx.restore();
  } else if (opts.gun) {
    ctx.save();
    const vibr = (isCharging && chargePct >= 1) ? (Math.random() - 0.5) * 2 : 0;
    ctx.translate(weaponHandX + vibr, weaponHandY + vibr);
    if (isCharging && chargePct > 0) {
      ctx.rotate(-Math.PI * 0.38 * chargePct);
    }
    drawWeapon(ctx, opts.gun, outfit.accent, t, swing);
    ctx.restore();
  }

  // 10. Front Pixel Highlight rim
  if (!isFlash) {
    ctx.fillStyle = outfit.accent;
    ctx.fillRect(torsoX + torsoW - 2, torsoY + 2, 3, torsoH - 4);
  }

  ctx.restore();
  ctx.restore();

  // Cloaked effect (pixel dither shimmer)
  if (opts.isCloaked) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.fillStyle = rgba("#00f0ff", 0.25 + 0.2 * pulse);
    // 4 micro corner shimmer pixels
    const cs = Math.round(size * 0.85);
    ctx.fillRect(Math.round(x - cs), Math.round(y - cs), 3, 3);
    ctx.fillRect(Math.round(x + cs - 3), Math.round(y - cs), 3, 3);
    ctx.fillRect(Math.round(x - cs), Math.round(y + cs - 3), 3, 3);
    ctx.fillRect(Math.round(x + cs - 3), Math.round(y + cs - 3), 3, 3);
    ctx.restore();
  }
}

// ===========================================================================
// MONSTER DRAWING — biohazard (生化危机) bestiary silhouettes.
// Drawn centered at the origin, facing +x (the engine rotates by `angle`).
// `size` is the monster's collision radius in world pixels.
// ===========================================================================
export interface DrawMonsterOpts {
  behavior: string;
  size: number;
  color: string;
  glow: string;
  angle: number;
  t: number;
  flash?: number;
  poison?: boolean;
  buffed?: boolean;
  charging?: boolean;
}

export function drawMonster(ctx: CanvasRenderingContext2D, opts: DrawMonsterOpts) {
  const { behavior, size, color, glow, angle, t } = opts;
  const flash = opts.flash ?? 0;
  const poison = opts.poison ?? false;
  const buffed = opts.buffed ?? false;
  const charging = opts.charging ?? false;
  const s = Math.round(size);
  const bodyCol = flash > 0.05 ? "#ffffff" : color;
  const dark = DARK;

  ctx.save();
  ctx.rotate(angle);

  // Buff aura (pixel spark nodes)
  if (buffed) {
    ctx.save();
    const a = 0.45 + Math.sin(t * 8) * 0.2;
    ctx.fillStyle = rgba("#f43f5e", a);
    for (let i = 0; i < 4; i++) {
      const ang = t * 4 + (i * Math.PI) / 2;
      const px = Math.round(Math.cos(ang) * (s + 6));
      const py = Math.round(Math.sin(ang) * (s + 6));
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    ctx.restore();
  }

  const fillBlock = (x: number, y: number, w: number, h: number, c: string = bodyCol) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const pixelEye = (x: number, y: number, sz = Math.max(3, Math.round(s * 0.22))) => {
    ctx.fillStyle = glow;
    ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
  };

  switch (behavior) {
    // 行尸 (Walker) — pixel hunchback, forward pixel arms
    case "walker": {
      fillBlock(-s * 0.6, s * 0.25, s * 0.5, s * 0.3);
      fillBlock(-s * 0.6, -s * 0.55, s * 0.5, s * 0.3);
      fillBlock(-s * 0.4, -s * 0.45, s * 0.85, s * 0.9);
      fillBlock(s * 0.35, s * 0.2, s * 0.6, s * 0.25);
      fillBlock(s * 0.35, -s * 0.45, s * 0.6, s * 0.25);
      fillBlock(s * 0.45, -s * 0.3, s * 0.5, s * 0.6);
      pixelEye(s * 0.75, -s * 0.18);
      pixelEye(s * 0.75, s * 0.08);
      break;
    }
    // 奔尸 (Runner) — elongated lunging pixel body
    case "runner": {
      if (charging) ctx.scale(1.15, 0.9);
      fillBlock(-s * 0.55, s * 0.2, s * 0.45, s * 0.25);
      fillBlock(-s * 0.55, -s * 0.45, s * 0.45, s * 0.25);
      fillBlock(-s * 0.35, -s * 0.35, s * 0.95, s * 0.7);
      fillBlock(s * 0.5, -s * 0.25, s * 0.5, s * 0.5);
      pixelEye(s * 0.85, -s * 0.15);
      pixelEye(s * 0.85, s * 0.05);
      break;
    }
    // 巨尸 (Brute) — huge hulking pixel tank
    case "brute": {
      fillBlock(-s * 0.65, -s * 0.65, s * 1.3, s * 1.3);
      fillBlock(-s * 0.3, -s * 0.95, s * 0.6, s * 0.35, shade(color, 0.15));
      fillBlock(-s * 0.3, s * 0.6, s * 0.6, s * 0.35, shade(color, 0.15));
      fillBlock(s * 0.45, -s * 0.35, s * 0.5, s * 0.7);
      pixelEye(s * 0.75, -s * 0.18, Math.max(3, Math.round(s * 0.2)));
      pixelEye(s * 0.75, s * 0.08, Math.max(3, Math.round(s * 0.2)));
      break;
    }
    // 吐酸者 (Spitter) — blocky acid sac + forward snout
    case "spitter": {
      fillBlock(-s * 0.55, -s * 0.5, s * 1.0, s * 1.0);
      fillBlock(s * 0.4, -s * 0.25, s * 0.6, s * 0.5, glow);
      pixelEye(s * 0.2, -s * 0.3);
      pixelEye(s * 0.2, s * 0.18);
      break;
    }
    // 母体 (Abomination) — boss block with glowing center pixel core
    case "abomination": {
      fillBlock(-s * 0.75, -s * 0.75, s * 1.5, s * 1.5);
      ctx.fillStyle = glow;
      ctx.fillRect(Math.round(-s * 0.35), Math.round(-s * 0.35), Math.round(s * 0.7), Math.round(s * 0.7));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(-s * 0.15), Math.round(-s * 0.15), Math.round(s * 0.3), Math.round(s * 0.3));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + t * 0.5;
        fillBlock(Math.cos(a) * s * 0.7 - 4, Math.sin(a) * s * 0.7 - 4, 8, 8, dark);
      }
      break;
    }
    // 爬虫 (Crawler) — flat scuttler
    case "crawler": {
      fillBlock(-s * 0.6, -s * 0.35, s * 1.2, s * 0.7);
      fillBlock(s * 0.55, -s * 0.22, s * 0.4, s * 0.44);
      pixelEye(s * 0.8, -s * 0.12);
      pixelEye(s * 0.8, s * 0.06);
      break;
    }
    // 毒爆体 (Bloater) — pulsating pixel cube
    case "bloater": {
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      const bs = s * pulse;
      fillBlock(-bs * 0.65, -bs * 0.65, bs * 1.3, bs * 1.3);
      ctx.fillStyle = rgba("#bef264", 0.7);
      ctx.fillRect(Math.round(-bs * 0.3), Math.round(-bs * 0.3), Math.round(bs * 0.6), Math.round(bs * 0.6));
      pixelEye(s * 0.45, -s * 0.2);
      pixelEye(s * 0.45, s * 0.1);
      break;
    }
    // 尖啸者 (Screamer)
    case "screamer": {
      fillBlock(-s * 0.4, -s * 0.7, s * 0.8, s * 1.4);
      fillBlock(s * 0.35, -s * 0.3, s * 0.45, s * 0.6, "#1a0a1a");
      pixelEye(s * 0.15, -s * 0.35);
      pixelEye(s * 0.15, s * 0.25);
      break;
    }
    // 孢子怪 (Spore)
    case "spore": {
      fillBlock(-s * 0.5, -s * 0.5, s * 1.0, s * 1.0);
      for (let i = -1; i <= 1; i++) {
        fillBlock(i * s * 0.35 - 4, -s * 0.7, 8, 6, shade(color, 0.2));
      }
      pixelEye(s * 0.35, -s * 0.15);
      pixelEye(s * 0.35, s * 0.1);
      break;
    }
    default: {
      fillBlock(-s * 0.5, -s * 0.5, s * 1.0, s * 1.0);
    }
  }

  // Poison speckle (square pixel dots)
  if (poison) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 1.5;
      ctx.fillStyle = "#a3e635";
      ctx.fillRect(Math.round(Math.cos(a) * s * 0.5), Math.round(Math.sin(a) * s * 0.5), 3, 3);
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 16-Bit Pixel Rounded / Chamfered Rectangle Helper
// ---------------------------------------------------------------------------
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (r <= 1 || w < 6 || h < 6) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    return;
  }
  // Stepped chamfer corners for authentic 16-bit pixel aesthetics & speed
  const step = Math.min(Math.floor(r), 4);
  ctx.beginPath();
  ctx.moveTo(x + step, y);
  ctx.lineTo(x + w - step, y);
  ctx.lineTo(x + w, y + step);
  ctx.lineTo(x + w, y + h - step);
  ctx.lineTo(x + w - step, y + h);
  ctx.lineTo(x + step, y + h);
  ctx.lineTo(x, y + h - step);
  ctx.closePath();
}

// ===========================================================================
// VECTOR ICON RENDERING — replaces emoji with crisp canvas silhouettes.
// Draws into a square region centered at (cx, cy) with given half-size `s`.
// ===========================================================================
export function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  iconShape: string,
  cx: number,
  cy: number,
  s: number,
  glow: string,
  gun?: GunDef
) {
  drawPixelWeaponIcon(ctx, iconShape, cx, cy, s * 2, glow, gun);
}

export function drawGadgetIcon(
  ctx: CanvasRenderingContext2D,
  gadget: GadgetDef,
  cx: number,
  cy: number,
  s: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = s / 16;
  ctx.scale(sc, sc);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const G = gadget.color;

  /** Draw the main white body with a colored glow outline. */
  const body = (p: () => void) => {
    ctx.save();
    ctx.shadowColor = rgba(G, 0.65);
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = G;
    ctx.lineWidth = 1.8;
    p();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  /** Erase details from the white body, leaving transparent cutouts. */
  const cutout = (p: () => void, lw = 1.1) => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = lw;
    p();
    ctx.restore();
  };

  switch (gadget.iconShape) {
    case "turret_mg":
      body(() => {
        ctx.beginPath();
        // Tripod base
        ctx.moveTo(-6, 7);
        ctx.lineTo(0, 2);
        ctx.lineTo(6, 7);
        ctx.lineTo(1.5, 3.5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-1.5, 3.5);
        ctx.closePath();

        // Receiver
        ctx.rect(-3.5, -4, 7, 6);
        // Barrel sleeve
        ctx.rect(-1.2, -10, 2.4, 6);
      });
      cutout(() => {
        ctx.beginPath();
        // Cooling slots on barrel sleeve
        ctx.rect(-0.4, -9.2, 0.8, 1.8);
        ctx.rect(-0.4, -6.8, 0.8, 1.8);
        ctx.fill();
        // Vent lines on receiver
        ctx.moveTo(-2, -2);
        ctx.lineTo(2, -2);
        ctx.moveTo(-2, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();
      });
      break;

    case "turret_cannon":
      body(() => {
        ctx.beginPath();
        // Heavy base
        ctx.rect(-8, 4.5, 16, 3);
        // Swivel neck
        ctx.rect(-3, 1.5, 6, 3);
        // Cannon turret dome
        ctx.arc(0, -1, 5.5, Math.PI, 0);
        // Massive barrel
        ctx.rect(-1.6, -11, 3.2, 7.5);
        // Muzzle brake
        ctx.rect(-2.6, -12.5, 5.2, 1.5);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Hatch lines
        ctx.arc(0, -1, 3.5, Math.PI, 0);
        ctx.stroke();
        // Barrel vents
        ctx.rect(-1.8, -12, 1, 0.8);
        ctx.rect(0.8, -12, 1, 0.8);
        ctx.fill();
      });
      break;

    case "mine_explosive":
      body(() => {
        ctx.beginPath();
        // Flat base
        ctx.ellipse(0, 3.5, 9, 3.8, 0, 0, Math.PI * 2);
        // Dome top
        ctx.ellipse(0, 1.5, 6, 2.6, 0, 0, Math.PI * 2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Concentric dome lines
        ctx.ellipse(0, 1.5, 4, 1.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Center sensor light
        ctx.arc(0, 1.5, 1, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case "mine_poison": // Gas Mine (图2毒气地雷): flat cylinder, segmented radial dome, tag with skull
      body(() => {
        ctx.beginPath();
        // Flat base
        ctx.ellipse(0, 3.2, 9.5, 4.2, 0, 0, Math.PI * 2);
        // Dome top
        ctx.ellipse(0, 1.2, 7, 3, 0, 0, Math.PI * 2);
        // Safety pin ring on left
        ctx.arc(-8.2, 4.5, 1.6, 0, Math.PI * 2);
        // Round tag hanging down
        ctx.arc(-10.2, 7.2, 1.8, 0, Math.PI * 2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Center cap
        ctx.ellipse(0, 1.2, 2.5, 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Radial segments (8 division lines)
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.moveTo(Math.cos(angle) * 2.5, 1.2 + Math.sin(angle) * 1.1);
          ctx.lineTo(Math.cos(angle) * 7, 1.2 + Math.sin(angle) * 3);
        }
        ctx.stroke();

        // Ring hole
        ctx.arc(-8.2, 4.5, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Skull detail on the tag (head and jaw)
        ctx.arc(-10.2, 6.8, 0.6, 0, Math.PI * 2);
        ctx.rect(-10.5, 7.2, 0.6, 0.5);
        ctx.fill();
      });
      // Draw eyes on skull
      cutout(() => {
        ctx.beginPath();
        ctx.arc(-10.4, 6.8, 0.15, 0, Math.PI * 2);
        ctx.arc(-10.0, 6.8, 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case "mine_fire": // Fire Mine (图3火焰地雷): flat cylinder, smooth top, tag with fire flame
      body(() => {
        ctx.beginPath();
        // Flat base
        ctx.ellipse(0, 3.2, 9.5, 4.2, 0, 0, Math.PI * 2);
        // Metallic dome
        ctx.ellipse(0, 1.2, 7.5, 3.2, 0, 0, Math.PI * 2);
        // Safety pin ring on left
        ctx.arc(-8.2, 4.5, 1.6, 0, Math.PI * 2);
        // Round tag hanging down
        ctx.arc(-10.2, 7.2, 1.8, 0, Math.PI * 2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Inner smooth dome outline
        ctx.ellipse(0, 1.2, 5, 2.1, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Ring hole
        ctx.arc(-8.2, 4.5, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Flame shape cutout on tag
        ctx.moveTo(-10.2, 8.2);
        ctx.quadraticCurveTo(-11.2, 7.2, -10.2, 6.4);
        ctx.quadraticCurveTo(-9.8, 7.2, -10.2, 8.2);
        ctx.fill();
      });
      break;

    case "glue_grenade":
      body(() => {
        ctx.beginPath();
        // Spherical bumpy body
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const r = 5.2 + (i % 2 === 0 ? 1.2 : 0);
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        // Pin & trigger cap
        ctx.rect(-1.2, -8, 2.4, 3);
        ctx.arc(2, -7.5, 1.5, 0, Math.PI * 2);
      });
      cutout(() => {
        ctx.beginPath();
        // Pin hole
        ctx.arc(2, -7.5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Inner sticky grid lines
        ctx.moveTo(-3, -2);
        ctx.lineTo(3, 2);
        ctx.moveTo(-3, 2);
        ctx.lineTo(3, -2);
        ctx.stroke();
      });
      break;

    case "fire_grenade": // Molotov Cocktail (图5燃烧瓶): bottle with burning cloth rag
      body(() => {
        ctx.beginPath();
        // Bottle base
        ctx.moveTo(-3.2, 1.5);
        ctx.lineTo(3.2, 1.5);
        ctx.lineTo(3.2, 7.5);
        ctx.quadraticCurveTo(3.2, 9, 1.8, 9);
        ctx.lineTo(-1.8, 9);
        ctx.quadraticCurveTo(-3.2, 9, -3.2, 7.5);
        ctx.closePath();

        // Neck
        ctx.rect(-1.2, -4.5, 2.4, 6);
        // Rim lip
        ctx.rect(-1.6, -5.2, 3.2, 1.2);

        // Cloth rag hanging out of neck
        ctx.moveTo(-1, -4.5);
        ctx.lineTo(-4.5, -7.5);
        ctx.lineTo(-2.5, -9);
        ctx.lineTo(0.5, -5.5);
        ctx.closePath();

        // Flame shape at tip of rag
        ctx.moveTo(-3.5, -8.2);
        ctx.quadraticCurveTo(-6.5, -12, -2.5, -13);
        ctx.quadraticCurveTo(-1.5, -11, -2.5, -9.5);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Horizontal liquid level inside bottle
        ctx.moveTo(-3, 4.5);
        ctx.lineTo(3, 4.5);
        // Bottle label box
        ctx.rect(-2, 5.2, 4, 2.2);
        ctx.stroke();
      });
      break;

    case "healing_station":
      body(() => {
        ctx.beginPath();
        // Medical station console box
        ctx.moveTo(-7.5, 7.5);
        ctx.lineTo(7.5, 7.5);
        ctx.lineTo(6.5, -2);
        ctx.quadraticCurveTo(5, -6.5, 0, -6.5);
        ctx.quadraticCurveTo(-5, -6.5, -6.5, -2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Large medical cross cutout
        ctx.rect(-1.4, -3.5, 2.8, 7);
        ctx.rect(-3.5, -1.4, 7, 2.8);
        ctx.fill();
        // Indicators
        ctx.rect(-4, 4.5, 2, 1);
        ctx.rect(2, 4.5, 2, 1);
        ctx.fill();
      });
      break;

    case "poison_grenade": // Gas Grenade (图4毒气手雷): chemical canister, pin ring, skull warning tag
      body(() => {
        ctx.beginPath();
        // Canister body
        ctx.moveTo(-3.5, -3);
        ctx.lineTo(3.5, -3);
        ctx.lineTo(3.5, 7.5);
        ctx.quadraticCurveTo(3.5, 8.5, 2.5, 8.5);
        ctx.lineTo(-2.5, 8.5);
        ctx.quadraticCurveTo(-3.5, 8.5, -3.5, 7.5);
        ctx.closePath();

        // Neck cap
        ctx.rect(-2, -4.5, 4, 1.5);
        // Safety lever spoon on right
        ctx.moveTo(1.2, -4);
        ctx.lineTo(4.8, -3.5);
        ctx.lineTo(4.8, 4.5);
        ctx.lineTo(2.8, 4.8);
        ctx.closePath();

        // Pin ring on left
        ctx.arc(-3.5, -5.5, 2, 0, Math.PI * 2);
        // Round warning tag hanging down
        ctx.arc(-6.5, -2.5, 1.8, 0, Math.PI * 2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Ring hole
        ctx.arc(-3.5, -5.5, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Skull warning icon on tag
        ctx.arc(-6.5, -2.9, 0.6, 0, Math.PI * 2);
        ctx.rect(-6.8, -2.5, 0.6, 0.5);
        ctx.fill();

        // Canister ridges / warning lines
        ctx.rect(-2, -1, 4, 1.2);
        ctx.rect(-2, 2.2, 4, 1.2);
        ctx.rect(-2, 5.4, 4, 1.2);
        ctx.fill();
      });
      break;

    default:
      body(() => {
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.closePath();
      });
  }
  ctx.restore();
}

export function drawGadgetModel(
  ctx: CanvasRenderingContext2D,
  kind: string,
  color: string,
  t: number = 0
) {
  ctx.lineJoin = "miter";
  ctx.lineCap = "square";

  const pblock = (x: number, y: number, w: number, h: number, c: string, darkBorder = true) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    ctx.fillStyle = c;
    ctx.fillRect(rx, ry, rw, rh);
    if (darkBorder) {
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(rx, ry, rw, rh);
    }
  };

  switch (kind) {
    case "turret_mg":
    case "turret_cannon":
    case "turret_sniper": {
      // 16-bit Pixel Turret Base
      pblock(-7, -7, 14, 14, STEEL_D);
      pblock(-5, -5, 10, 10, STEEL);
      pblock(-3, -3, 6, 6, color);
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(-5, -5, 10, 2);

      if (kind === "turret_mg") {
        // Double pixel barrel
        pblock(2, -4, 12, 3, STEEL_X);
        pblock(2, 1, 12, 3, STEEL_X);
        pblock(12, -4, 2, 3, STEEL_D, false);
        pblock(12, 1, 2, 3, STEEL_D, false);
      } else if (kind === "turret_cannon") {
        // Heavy chunky barrel with muzzle brake
        pblock(2, -3, 14, 6, STEEL_L);
        pblock(14, -5, 4, 10, STEEL_D);
        pblock(4, -2, 8, 4, color);
      } else {
        // Long sniper barrel + scope
        pblock(2, -2, 18, 4, STEEL_L);
        pblock(18, -3, 3, 6, STEEL_D);
        pblock(0, -6, 8, 3, STEEL_D);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(6, -5, 2, 1);
      }
      break;
    }
    case "mine_explosive":
    case "mine_poison":
    case "mine_fire":
    case "mine_stun": {
      // 16-bit Stepped Octagon Pixel Mine
      pblock(-6, -6, 12, 12, STEEL_D);
      pblock(-4, -4, 8, 8, STEEL);
      pblock(-2, -2, 4, 4, color);

      // Blinking center indicator pixel
      const blink = Math.floor(t * 6) % 2 === 0;
      ctx.fillStyle = blink ? "#ffffff" : color;
      ctx.fillRect(-1, -1, 2, 2);

      // 4 Corner pixel sensors
      ctx.fillStyle = STEEL_X;
      ctx.fillRect(-6, -6, 2, 2);
      ctx.fillRect(4, -6, 2, 2);
      ctx.fillRect(-6, 4, 2, 2);
      ctx.fillRect(4, 4, 2, 2);
      break;
    }
    case "healing_station": {
      // 16-bit Medical Nanite Hub
      pblock(-8, -8, 16, 16, "#f8fafc");
      pblock(-6, -6, 12, 12, "#e2e8f0");
      // Green/Cyan pixel cross
      ctx.fillStyle = color;
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-5, -2, 10, 4);
      // White highlight on cross
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1, -4, 2, 8);
      ctx.fillRect(-4, -1, 8, 2);
      break;
    }
    case "glue_grenade":
    case "fire_grenade":
    case "poison_grenade":
    case "cluster_grenade":
    default: {
      // 16-bit Pixel Canister Grenade
      pblock(-5, -6, 10, 12, color);
      pblock(-3, -8, 6, 3, STEEL_D);
      // Top pin / lever
      ctx.fillStyle = STEEL_X;
      ctx.fillRect(1, -9, 3, 2);
      ctx.fillRect(3, -7, 2, 5);
      // Center hazard band
      ctx.fillStyle = shade(color, -0.35);
      ctx.fillRect(-5, -2, 10, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-4, -5, 2, 2);
      break;
    }
  }
}

/** Draws a weapon using its actual detailed in-game model, centered and scaled for UI. */
export function drawWeaponModel(
  ctx: CanvasRenderingContext2D,
  gun: GunDef,
  cx: number,
  cy: number,
  size: number
) {
  drawPixelWeaponIcon(ctx, gun.iconShape || gun.shape || gun.id, cx, cy, size, gun.glow, gun);
}