import type { CharacterDef, OutfitDef, GunDef, HatType, GadgetDef } from "./types";

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

export const DARK = "rgba(8,10,25,0.85)";
const STEEL = "#3a4254";
const STEEL_D = "#232938";
const STEEL_L = "#5a6478";
const STEEL_X = "#727d93";
const WOOD = "#a9743a";
const WOOD_D = "#6e4a24";

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
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const body = (
    x: number,
    y: number,
    w: number,
    h: number,
    c1: string,
    c2: string,
    r = 2
  ) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  const block = (x: number, y: number, w: number, h: number, c: string, r = 2) => {
    ctx.fillStyle = c;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // For melee weapons, animate the grip swinging around the player's hand.
  // The caller already translates to the hand position; we add a rotation
  // that sweeps the blade through an arc based on `swing` (0..1).
  if (gun.weaponClass === "melee") {
    const swingArc = (gun.meleeArc ?? 2) * 0.8;
    ctx.rotate(-swingArc / 2 + swing * swingArc);
  }

  switch (gun.shape) {
    // ---------------- PISTOL ----------------
    case "pistol": {
      body(-4, -4, 16, 8, STEEL_X, STEEL, 2.5);
      body(10, -2, 6, 4, STEEL_L, STEEL_D, 1.5); // barrel
      block(-7, -1.6, 3.5, 3.4, STEEL_D, 1); // rear
      block(4, -5, 2, 1.6, STEEL_D, 0.5); // sight
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 15.5, -1.4, 2.6, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- MAC11 ----------------
    case "mac11": {
      body(-6, -4, 18, 8, STEEL_X, STEEL, 2.5);
      body(10, -1.8, 7, 3.6, STEEL_L, STEEL_D, 1.5); // barrel
      block(-11, -2.4, 6, 4.8, STEEL_D, 1.5); // stock
      ctx.save();
      ctx.translate(2, 3);
      ctx.rotate(0.5);
      block(-1.6, 0, 4, 11, STEEL_D, 1.5); // magazine
      ctx.restore();
      block(5, -5, 3, 1.6, STEEL_D, 0.5); // sight
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16, -1.2, 2.4, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- MP5 ----------------
    case "mp5": {
      body(-6, -4, 18, 8, STEEL_X, STEEL, 2.5);
      body(10, -1.8, 8, 3.6, STEEL_L, STEEL_D, 1.5); // longer barrel
      block(-11, -2.4, 6, 4.8, STEEL_D, 1.5); // stock
      ctx.save();
      ctx.translate(2, 3);
      ctx.rotate(0.5);
      block(-1.6, 0, 4, 12, STEEL_D, 1.5); // magazine
      ctx.restore();
      block(5, -5, 3, 1.6, STEEL_D, 0.5); // sight
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 17, -1.2, 2.4, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- MORTAR (投射榴弹炮) ----------------
    case "mortar": {
      block(-3, -3, 8, 6, STEEL_D, 2); // breech
      body(2, -3.2, 20, 6.4, STEEL_X, STEEL, 2.5); // long launch tube
      body(20, -3.6, 3, 7.2, STEEL_L, STEEL_D, 1.5); // muzzle ring
      block(-9, -2, 6, 4, STEEL_D, 1.5); // grip/stock
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 21, -2, 2.4, 4, 1);
      ctx.fill();
      break;
    }
    // ---------------- SHOTGUN ----------------
    case "shotgun": {
      body(-4, -4, 11, 8, STEEL_X, STEEL, 2);
      block(-11, -2.6, 7, 5.2, WOOD, 1.5); // wooden stock
      body(2, -3.2, 15, 2.4, STEEL_L, STEEL_D, 1); // barrel top
      body(2, 0.8, 15, 2.4, STEEL_L, STEEL_D, 1); // barrel bottom
      block(6, -4.2, 6, 8.4, WOOD_D, 1.5); // pump
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16.5, -2.6, 2.4, 5.2, 1);
      ctx.fill();
      break;
    }
    // ---------------- RIFLE ----------------
    case "rifle": {
      body(-6, -4, 22, 8, STEEL_X, STEEL, 2.5);
      body(14, -1.8, 11, 3.6, STEEL_L, STEEL_D, 1.5); // barrel
      block(6, -3.4, 9, 6.8, STEEL_D, 1.5); // handguard
      block(2, -5.6, 8, 1.6, STEEL_D, 0.6); // rail
      block(-12, -2.4, 7, 4.8, STEEL_D, 1.5); // stock
      ctx.save();
      ctx.translate(0, 3);
      ctx.rotate(0.42);
      block(-2, 0, 5, 10, STEEL_D, 2); // magazine
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 24, -1.2, 2.6, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- SNIPER ----------------
    case "sniper": {
      body(-6, -4, 15, 8, STEEL_X, STEEL, 2.5);
      body(7, -2, 22, 4, STEEL_L, STEEL_D, 1.5); // long barrel
      block(-13, -2.6, 7, 5.2, WOOD, 1.5); // stock
      // scope
      ctx.fillStyle = STEEL_D;
      roundRect(ctx, -4, -7.6, 9, 2.2, 1);
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.5, -6.4, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(0.5, -6.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // bipod
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(25, 7);
      ctx.moveTo(22, 2);
      ctx.lineTo(25, -3);
      ctx.stroke();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 28, -1.2, 2.6, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- ROCKET LAUNCHER ----------------
    case "rocket": {
      body(-7, -5.5, 22, 11, STEEL_X, STEEL, 3); // tube
      // warhead
      ctx.fillStyle = STEEL_L;
      ctx.beginPath();
      ctx.moveTo(15, -4);
      ctx.lineTo(24, 0);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // rear fins
      ctx.fillStyle = STEEL_D;
      ctx.beginPath();
      ctx.moveTo(-7, -5.5);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-7, -2.5);
      ctx.closePath();
      ctx.moveTo(-7, 5.5);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-7, 2.5);
      ctx.closePath();
      ctx.fill();
      // muzzle glow
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(19, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ---------------- AKM ----------------
    case "akm": {
      body(-4, -4, 17, 8, STEEL_X, STEEL, 2); // receiver
      block(8, -3.4, 9, 6.8, WOOD, 1.5); // wooden handguard
      body(14, -1.4, 8, 2.8, STEEL_L, STEEL_D, 1); // barrel
      block(8, -4.6, 11, 1.8, STEEL_D, 0.6); // gas tube
      block(-11, -2.6, 7, 5.2, WOOD, 1.5); // wooden stock
      // curved magazine
      ctx.save();
      ctx.translate(1.5, 3);
      ctx.rotate(0.4);
      block(-2, 0, 4.6, 11, WOOD_D, 1.5);
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 21, -1, 2.4, 2, 0.8);
      ctx.fill();
      break;
    }
    // ---------------- FCAR (heavy) ----------------
    case "fcar": {
      body(-5, -5, 19, 10, STEEL, STEEL_D, 2.5); // bulky receiver
      body(13, -2.4, 10, 4.8, STEEL_L, STEEL_D, 1.5); // barrel
      block(-12, -3, 7, 6, STEEL_D, 1.5); // stock
      block(-1, 3, 6, 9, STEEL_D, 1.5); // box magazine
      block(2, -6.4, 9, 1.8, STEEL_D, 0.6); // top rail
      // accent glow line
      ctx.fillStyle = rgba(gun.glow, 0.55);
      roundRect(ctx, -3, -1, 15, 1.4, 0.6);
      ctx.fill();
      // compensator vents
      ctx.fillStyle = STEEL_D;
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, 18 + i * 2, -2.2, 1.1, 4.4, 0.4);
        ctx.fill();
      }
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 25, -1.4, 2.4, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- PULSE (beam emitter) ----------------
    case "pulse": {
      body(-5, -4.5, 16, 9, "#2c3350", "#1a1f33", 3);
      block(-9, -2.6, 4.5, 5.2, "#15192a", 1); // grip
      // energy cells
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 0, -5.8, 3, 2, 0.6);
      roundRect(ctx, 5, -5.8, 3, 2, 0.6);
      ctx.fill();
      // glowing core
      const cg = ctx.createRadialGradient(1, 0, 0, 1, 0, 5.5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(gun.glow, 0.9));
      cg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      // emitter ring (pulsing)
      ctx.strokeStyle = rgba(gun.glow, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(13, 0, 3 + Math.sin(t * 12) * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(15.5, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ---------------- LIGHTSABER ----------------
    case "lightsaber": {
      const bladeLen = (gun.meleeRange ?? 60) * 0.62;
      // hilt
      body(-7, -3, 14, 6, STEEL_X, STEEL_D, 2);
      block(-5, -2.4, 2, 4.8, STEEL_D, 0.5);
      block(-1, -2.4, 2, 4.8, STEEL_D, 0.5);
      block(3, -2.4, 2, 4.8, STEEL_D, 0.5);
      // emitter
      block(7, -2.6, 3, 5.2, STEEL_L, 1);
      // blade glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const flick = 1 + Math.sin(t * 30) * 0.05;
      ctx.strokeStyle = rgba(gun.glow, 0.22);
      ctx.lineWidth = 9 * flick;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(10 + bladeLen, 0);
      ctx.stroke();
      ctx.strokeStyle = rgba(gun.glow, 0.5);
      ctx.lineWidth = 5 * flick;
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.4 * flick;
      ctx.stroke();
      ctx.restore();
      break;
    }
    // ---------------- HAMMER ----------------
    case "hammer": {
      // handle
      body(-1, -2, 21, 4, WOOD_D, "#4a3318", 1.5);
      // grip wrap
      block(-1, -2.4, 3, 4.8, STEEL_D, 0.6);
      block(3, -2.4, 2, 4.8, STEEL_D, 0.4);
      // head
      body(19, -8, 13, 16, STEEL_X, STEEL, 3);
      block(20, -7, 3, 14, STEEL_L, 1); // highlight
      block(28, -6, 3, 12, STEEL_D, 1); // shadow edge
      // glowing rune
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 22, -1.4, 7, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- FLAMETHROWER ----------------
    case "flamethrower": {
      body(-6, -5, 18, 10, STEEL_X, STEEL_D, 2.5); // body
      block(-10, -2.4, 5, 4.8, STEEL_D, 1.2); // grip
      // fuel tank (top)
      block(0, -8, 12, 4, "#7f1d1d", 1.5);
      block(2, -7.4, 8, 1, "#fca5a5", 0.5);
      // nozzle
      body(12, -3, 9, 6, STEEL_L, STEEL_D, 1.5);
      block(20, -4.5, 3, 9, STEEL_D, 1); // flare tip
      // pilot flame
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fg = ctx.createRadialGradient(22, 0, 0, 22, 0, 5);
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.4, rgba(gun.glow, 0.9));
      fg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(22, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    // ---------------- SA1216 (auto shotgun) ----------------
    case "sa1216": {
      body(-5, -4.5, 16, 9, STEEL_X, STEEL, 2.5);
      body(10, -2, 10, 4, STEEL_L, STEEL_D, 1.5); // barrel
      block(-11, -2.8, 6, 5.6, WOOD, 1.5); // stock
      // rotary magazine (4 tubes)
      ctx.save();
      ctx.translate(2, 3.5);
      ctx.rotate(0.3);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.fillStyle = i === 0 ? STEEL_L : STEEL_D;
        roundRect(ctx, -1.5 + Math.cos(a) * 3, Math.sin(a) * 3 - 4, 3, 10, 1);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 19, -1.6, 2.4, 3.2, 1);
      ctx.fill();
      break;
    }
    // ---------------- MGL32 (grenade revolver) ----------------
    case "mgl32": {
      body(-6, -4, 14, 8, STEEL_X, STEEL, 2); // receiver
      block(-11, -2.6, 6, 5.2, STEEL_D, 1.5); // stock
      body(8, -2.5, 10, 5, STEEL_L, STEEL_D, 1.5); // barrel
      // revolving cylinder
      ctx.save();
      ctx.translate(4, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? STEEL_L : STEEL_D;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.fillStyle = rgba(gun.glow, 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // front sight
      block(17, -4.5, 2, 2, STEEL_D, 0.5);
      break;
    }
    // ---------------- SPEAR ----------------
    case "spear": {
      const len = (gun.meleeRange ?? 90) * 0.85;
      // shaft
      ctx.strokeStyle = WOOD_D;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(len - 14, 0);
      ctx.stroke();
      ctx.strokeStyle = "#4a3318";
      ctx.lineWidth = 1;
      ctx.stroke();
      // grip wrap
      ctx.fillStyle = STEEL_D;
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, -2 + i * 3, -2.4, 2, 4.8, 0.4);
        ctx.fill();
      }
      // spearhead
      ctx.fillStyle = STEEL_X;
      ctx.beginPath();
      ctx.moveTo(len - 14, -5);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // glow edge
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(gun.glow, 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(len - 12, -3.5);
      ctx.lineTo(len - 1, 0);
      ctx.lineTo(len - 12, 3.5);
      ctx.stroke();
      ctx.restore();
      break;
    }
    // ---------------- DRONE (浮游炮) ----------------
    case "drone": {
      // The weapon is the drone itself, hovering beside the player.
      // Body
      body(-6, -4, 12, 8, "#2c3350", "#1a1f33", 3);
      // thrusters
      ctx.fillStyle = rgba(gun.glow, 0.8);
      ctx.beginPath();
      ctx.arc(-6, -5, 2, 0, Math.PI * 2);
      ctx.arc(6, -5, 2, 0, Math.PI * 2);
      ctx.arc(-6, 5, 2, 0, Math.PI * 2);
      ctx.arc(6, 5, 2, 0, Math.PI * 2);
      ctx.fill();
      // core
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(gun.glow, 0.9));
      cg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // emitter
      ctx.strokeStyle = rgba(gun.glow, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(8, 0, 2.5 + Math.sin(t * 10) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    // ---------------- LIGHTNING WHIP (闪电鞭) ----------------
    case "lightning_whip": {
      // short handle
      body(-8, -2.4, 12, 4.8, STEEL_X, STEEL_D, 1.5);
      block(-8, -2.4, 4, 4.8, STEEL_D, 1); // grip
      block(2, -2.6, 2, 5.2, STEEL_L, 0.8); // emitter
      // crackling energy tail that flickers like a whip
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const len = (gun.meleeRange ?? 90) * 0.9;
      const flick = 1 + Math.sin(t * 22) * 0.12;
      const tail = (w: number, col: string) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        let x = 4;
        let y = 0;
        const segs = 5;
        for (let i = 1; i <= segs; i++) {
          const f = i / segs;
          const nx = 4 + len * f;
          const ny =
            Math.sin(f * Math.PI * 2.5 + t * 6) * (10 * (1 - f)) * flick;
          ctx.lineTo(nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
        return { x, y };
      };
      tail(8 * flick, rgba(gun.glow, 0.28));
      tail(3 * flick, rgba("#ffffff", 0.9));
      ctx.restore();
      break;
    }
    // ---------------- RECURVE BOW ----------------
    case "recurve_bow": {
      // grip
      block(-2, -2, 4, 4, WOOD_D, 1);
      // upper limb
      ctx.strokeStyle = WOOD;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(14, -18, 2, -26);
      ctx.stroke();
      // lower limb
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(14, 18, 2, 26);
      ctx.stroke();
      // recurve tips
      ctx.strokeStyle = WOOD_D;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.lineTo(-3, -29);
      ctx.moveTo(2, 26);
      ctx.lineTo(-3, 29);
      ctx.stroke();
      // string (drawn back slightly at full charge via accent tint)
      ctx.strokeStyle = "rgba(240,240,255,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.lineTo(2, 26);
      ctx.stroke();
      // arrow rest glow
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 6, -1, 4, 2, 0.5);
      ctx.fill();
      break;
    }
    // ---------------- RIOT SHIELD ----------------
    case "riot_shield": {
      // shield body (translucent)
      const sg = ctx.createLinearGradient(-2, -14, -2, 14);
      sg.addColorStop(0, "#60a5fa");
      sg.addColorStop(0.5, "#3b82f6");
      sg.addColorStop(1, "#1d4ed8");
      ctx.fillStyle = sg;
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -13);
      ctx.lineTo(8, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 16);
      ctx.lineTo(-4, 13);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // viewport slit
      ctx.fillStyle = rgba("#dbeafe", 0.6);
      roundRect(ctx, -1, -4, 9, 8, 2);
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1;
      ctx.stroke();
      // glow edge
      ctx.strokeStyle = rgba(gun.glow, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 16);
      ctx.stroke();
      break;
    }
    // ---------------- SHAK-50 ----------------
    case "shak50": {
      body(-5, -3.5, 15, 7, STEEL_X, STEEL, 2.5);
      body(9, -1.5, 8, 3, STEEL_L, STEEL_D, 1); // barrel
      block(-10, -2, 5, 4.5, WOOD, 1.5); // stock
      block(-1, -4.5, 8, 1.5, STEEL_D, 0.5); // top rail
      ctx.save();
      ctx.translate(0, 2.5);
      ctx.rotate(0.38);
      block(-2, 0, 4.5, 9, STEEL_D, 1.5); // magazine
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16, -1, 2.2, 2, 0.8);
      ctx.fill();
      break;
    }
    // ---------------- GATLING ----------------
    case "gatling": {
      body(-7, -5, 13, 10, STEEL_X, STEEL, 2.5); // receiver
      block(-12, -3, 6, 6, STEEL_D, 1.5); // grip/stock
      ctx.save();
      ctx.translate(8, 0);
      block(-4, -5, 13, 10, STEEL, 2); // barrel housing
      // spinning multi-barrel cluster (visual spin while firing)
      ctx.rotate(t * 9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const bx = Math.cos(a) * 3.2;
        const by = Math.sin(a) * 3.2;
        ctx.fillStyle = i % 2 ? STEEL_X : STEEL_L;
        roundRect(ctx, 2 + bx - 1.3, by - 1.6, 11, 3.2, 1);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 23, -2, 2.4, 4, 1);
      ctx.fill();
      break;
    }
    // ---------------- POISON MIST ----------------
    case "poison_mist": {
      body(-7, -5, 16, 10, STEEL_X, STEEL_D, 2.5); // body
      block(-11, -2.6, 5, 5.2, STEEL_D, 1.2); // grip
      block(0, -8, 11, 4, "#4d7c0f", 1.5); // toxin tank
      block(2, -7.4, 7, 1, "#bef264", 0.5); // tank highlight
      body(9, -3, 8, 6, STEEL_L, STEEL_D, 1.5); // nozzle housing
      block(16, -4.5, 3, 9, STEEL_D, 1); // muzzle
      // drifting mist puff
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const ph = (t * 1.4 + i * 0.4) % 1;
        const rr = 3 + ph * 8;
        const px = 19 + ph * 11;
        ctx.fillStyle = rgba("#a3e635", 0.32 * (1 - ph));
        ctx.beginPath();
        ctx.arc(px, Math.sin(i * 2 + t * 2) * 4, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    // ---------------- LEWIS MACHINE GUN ----------------
    case "lewis": {
      body(-9, -4.5, 20, 9, STEEL_X, STEEL, 2.5); // receiver
      body(9, -2, 14, 4, STEEL_L, STEEL_D, 1.5); // long barrel
      block(11, -4, 10, 2, STEEL_D, 1); // cooling shroud
      block(-4, -6.5, 9, 5, STEEL_D, 1.5); // pan magazine (top)
      block(-13, -2.4, 7, 4.8, STEEL_D, 1.5); // stock
      ctx.save();
      ctx.translate(0, 3);
      ctx.rotate(0.42);
      block(-2, 0, 5, 10, STEEL_D, 2); // magazine well
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 24, -1, 2.6, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- PLASMA RIFLE ----------------
    case "plasma_rifle": {
      body(-6, -4.5, 18, 9, STEEL_X, STEEL, 2.5); // body
      body(10, -2.4, 12, 4.8, STEEL_L, STEEL_D, 1.5); // barrel housing
      block(3, -7, 10, 3, "#6d28d9", 1.5); // energy cell
      block(5, -6.4, 6, 1, "#c4b5fd", 0.5); // cell highlight
      block(-12, -2.4, 7, 4.8, STEEL_D, 1.5); // stock
      ctx.save();
      ctx.translate(0, 3);
      ctx.rotate(0.42);
      block(-2, 0, 5, 9, STEEL_D, 2);
      ctx.restore();
      // glowing plasma muzzle
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(23, 0, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    default: {
      body(-4, -4.5, gun.barrel + 6, 9, STEEL, STEEL_D, 3);
    }
  }
  void accent;
}

// ---------------------------------------------------------------------------
// Hat drawing (forward = +x)
// ---------------------------------------------------------------------------
function drawHat(
  ctx: CanvasRenderingContext2D,
  hat: HatType,
  accent: string,
  r: number
) {
  ctx.save();
  if (hat === "helmet") {
    ctx.fillStyle = accent;
    ctx.strokeStyle = "rgba(8,10,25,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(190,230,255,0.85)";
    ctx.fillRect(r * 0.2, -r * 0.55, r * 0.7, r * 0.3);
  } else if (hat === "cap") {
    ctx.fillStyle = accent;
    ctx.strokeStyle = "rgba(8,10,25,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.05);
    ctx.lineTo(r * 1.5, r * 0.1);
    ctx.lineTo(r * 1.5, r * 0.4);
    ctx.lineTo(0, r * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (hat === "hood") {
    ctx.fillStyle = shade(accent, -0.12);
    ctx.strokeStyle = "rgba(8,10,25,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, Math.PI * 0.78, Math.PI * 2.22);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
  } else if (hat === "visor") {
    ctx.fillStyle = "rgba(8,12,30,0.92)";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.0, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.42);
    ctx.lineTo(r * 0.85, -r * 0.3);
    ctx.stroke();
  } else if (hat === "alien") {
    // big black almond eyes + a pair of curved antennae
    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.ellipse(r * 0.22, -r * 0.28, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.22, r * 0.28, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(accent, 0.9);
    ctx.beginPath();
    ctx.arc(r * 0.22, -r * 0.28, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.22, r * 0.28, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // antennae
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, sy * r * 0.4);
      ctx.quadraticCurveTo(r * -0.2, sy * r * 0.9, r * -0.35, sy * r * 1.1);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(r * -0.35, sy * r * 1.1, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hat === "monkey") {
    // round ears + a muzzle with nostrils
    ctx.fillStyle = shade(accent, -0.1);
    ctx.strokeStyle = "rgba(40,25,15,0.5)";
    ctx.lineWidth = 1.2;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-r * 0.1, sy * r * 0.62, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#caa072";
      ctx.beginPath();
      ctx.arc(-r * 0.1, sy * r * 0.62, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(accent, -0.1);
    }
    // muzzle
    ctx.fillStyle = "#e8c79a";
    ctx.beginPath();
    ctx.ellipse(r * 0.32, 0, r * 0.34, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(40,25,15,0.6)";
    ctx.beginPath();
    ctx.arc(r * 0.5, -r * 0.08, r * 0.05, 0, Math.PI * 2);
    ctx.arc(r * 0.5, r * 0.08, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "tycoon") {
    // black top hat 🎩 with a gold band
    ctx.fillStyle = "#0b0c22";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    // brim
    roundRect(ctx, -r * 1.1, -r * 0.18, r * 2.2, r * 0.34, r * 0.12);
    ctx.fill();
    ctx.stroke();
    // crown
    roundRect(ctx, -r * 0.62, -r * 1.3, r * 1.24, r * 1.2, r * 0.1);
    ctx.fill();
    ctx.stroke();
    // gold band
    ctx.fillStyle = accent;
    roundRect(ctx, -r * 0.62, -r * 0.34, r * 1.24, r * 0.2, 0);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Character drawing — top-down, forward = +x (rotate the context to the aim)
// `meleeSwing` (0..1) is forwarded to drawWeapon for melee swing animation.
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
  /** melee swing progress 0..1 (drives weapon rotation) */
  meleeSwing?: number;
  /** lunge offset along aim direction (for spear dash) */
  lunge?: number;
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  opts: DrawCharOpts
) {
  const { x, y, angle, character, outfit, size, flash = 0 } = opts;
  const t = opts.t ?? 0;
  const breath = 1 + Math.sin(t * 3) * 0.03;

  // shadow
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.78, size * 0.95, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x + Math.cos(angle) * (opts.lunge ?? 0), y + Math.sin(angle) * (opts.lunge ?? 0));
  ctx.rotate(angle);

  if (opts.glow) {
    const g = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 2.2);
    g.addColorStop(0, rgba(opts.glow, 0.35));
    g.addColorStop(1, rgba(opts.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const r = size * breath;
  const suit = outfit.suit;
  const suitDark = outfit.suitDark;

  // boots (behind the body, pointing back -x)
  ctx.fillStyle = shade(suit, -0.2);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.4;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-r * 0.72, sy * r * 0.42, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // backpack / tactical rig (behind the torso)
  ctx.fillStyle = shade(suit, -0.12);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.4;
  roundRect(ctx, -r * 1.02, -r * 0.5, r * 0.5, r * 1.0, r * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba(outfit.accent, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.4);
  ctx.lineTo(-r * 0.85, r * 0.4);
  ctx.stroke();

  // torso (egg-shaped, slightly taller than wide)
  ctx.fillStyle = suit;
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // chest emblem in the character's signature color (front / +x side)
  ctx.fillStyle = rgba(character.bodyColor, 0.92);
  ctx.beginPath();
  ctx.arc(r * 0.22, 0, r * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();
  ctx.strokeStyle = rgba(character.accent, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(r * 0.12, 0, r * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  // utility belt
  ctx.strokeStyle = shade(suit, -0.25);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();

  // shoulders + arms — lean into the swing for melee weapons
  const swing = opts.meleeSwing ?? 0;
  const lean = swing > 0 ? Math.sin(swing * Math.PI) * r * 0.18 : 0;
  ctx.fillStyle = shade(suit, -0.06);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.5;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * (0.28 + lean), sy * r * 0.66, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // left arm (resting, -y side) — tapered limb
  ctx.strokeStyle = shade(suit, -0.06);
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.5);
  ctx.lineTo(-r * 0.1, -r * 0.85);
  ctx.stroke();
  // right arm (weapon side, +y) reaching forward
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.5);
  ctx.lineTo(r * 0.55, r * 0.62);
  ctx.stroke();
  ctx.lineCap = "butt";

  // hands
  ctx.fillStyle = shade(suit, 0.1);
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.85, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.55, r * 0.62, r * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // head (forward, +x) with forward-looking eyes
  const headX = r * 0.18;
  ctx.fillStyle = flash > 0 ? "#ffffff" : (outfit.skin ?? character.skin);
  ctx.strokeStyle = "rgba(40,25,15,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(headX, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = character.accent;
  ctx.beginPath();
  ctx.arc(headX + r * 0.32, -r * 0.18, r * 0.1, 0, Math.PI * 2);
  ctx.arc(headX + r * 0.32, r * 0.18, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // chin shadow
  ctx.fillStyle = "rgba(40,25,15,0.18)";
  ctx.beginPath();
  ctx.arc(headX - r * 0.1, 0, r * 0.5, Math.PI * 0.35, Math.PI * 0.65);
  ctx.fill();

  ctx.save();
  ctx.translate(headX, 0);
  drawHat(ctx, outfit.hat, outfit.suit, r * 0.62);
  ctx.restore();

  // weapon held forward by the right hand
  if (opts.gun) {
    ctx.save();
    ctx.translate(r * 0.55, r * 0.62);
    drawWeapon(ctx, opts.gun, outfit.accent, t, swing);
    ctx.restore();
  }

  // rim light on the front edge
  ctx.strokeStyle = rgba(outfit.accent, 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.02, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,80,80,${flash * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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
  const s = size;
  const bodyCol = flash > 0.05 ? "#ffffff" : color;
  const dark = shade(color, -0.34);

  ctx.save();
  ctx.rotate(angle);

  // buff aura (screamer)
  if (buffed) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const a = 0.22 + Math.sin(t * 8) * 0.12;
    ctx.strokeStyle = rgba("#e879f9", a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const fillPath = (p: () => void, c: string = bodyCol) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    p();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  const eye = (x: number, y: number, r = s * 0.13) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const limbLine = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    ctx.strokeStyle = dark;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  switch (behavior) {
    // 行尸 — hunched shambler, arms reaching forward
    case "walker": {
      fillPath(() => ctx.ellipse(-s * 0.5, s * 0.32, s * 0.28, s * 0.16, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.5, -s * 0.32, s * 0.28, s * 0.16, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.05, 0, s * 0.6, s * 0.54, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.5, s * 0.3, s * 0.46, s * 0.15, -0.2, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.5, -s * 0.3, s * 0.46, s * 0.15, 0.2, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.58, 0, s * 0.32, 0, Math.PI * 2));
      eye(s * 0.7, -s * 0.12);
      eye(s * 0.7, s * 0.12);
      break;
    }
    // 奔尸 — lean, lunging (stretches forward when charging)
    case "runner": {
      if (charging) ctx.scale(1.12, 0.92);
      fillPath(() => ctx.ellipse(-s * 0.5, s * 0.3, s * 0.24, s * 0.13, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.5, -s * 0.3, s * 0.24, s * 0.13, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(0, 0, s * 0.78, s * 0.4, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.4, s * 0.28, s * 0.4, s * 0.12, 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.4, -s * 0.28, s * 0.4, s * 0.12, -0.4, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.78, 0, s * 0.3, 0, Math.PI * 2));
      eye(s * 0.92, -s * 0.1);
      eye(s * 0.92, s * 0.1);
      break;
    }
    // 巨尸 — huge hulking brute
    case "brute": {
      fillPath(() => ctx.ellipse(-s * 0.1, 0, s * 0.82, s * 0.78, 0, 0, Math.PI * 2));
      fillPath(() => ctx.arc(-s * 0.1, -s * 0.7, s * 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.arc(-s * 0.1, s * 0.7, s * 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.1, -s * 0.62, s * 0.5, s * 0.22, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.1, s * 0.62, s * 0.5, s * 0.22, 0, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.7, 0, s * 0.26, 0, Math.PI * 2));
      eye(s * 0.82, -s * 0.1);
      eye(s * 0.82, s * 0.1);
      break;
    }
    // 吐酸者 — bulbous body, snout/muzzle forward
    case "spitter": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.66, s * 0.6, 0, 0, Math.PI * 2));
      fillPath(() => {
        ctx.moveTo(s * 0.5, -s * 0.3);
        ctx.lineTo(s * 1.05, 0);
        ctx.lineTo(s * 0.5, s * 0.3);
        ctx.closePath();
      }, glow);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(glow, 0.85);
      ctx.beginPath();
      ctx.arc(s * 0.7, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      eye(s * 0.2, -s * 0.22);
      eye(s * 0.2, s * 0.22);
      break;
    }
    // 母体 — boss with glowing core + tentacle limbs + jaw
    case "abomination": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.85, s * 0.8, 0, 0, Math.PI * 2));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(glow, 0.9));
      cg.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.4;
        limbLine(0, 0, Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95, s * 0.18);
      }
      fillPath(() => {
        ctx.moveTo(s * 0.55, -s * 0.35);
        ctx.lineTo(s * 1.0, 0);
        ctx.lineTo(s * 0.55, s * 0.35);
        ctx.closePath();
      }, shade(color, 0.1));
      break;
    }
    // 爬虫 — tiny, low, scuttling legs
    case "crawler": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.8, s * 0.42, 0, 0, Math.PI * 2));
      const lp = Math.sin(t * 12) * s * 0.12;
      for (let i = 0; i < 3; i++) {
        const bx = -s * 0.3 + i * s * 0.35;
        limbLine(bx, -s * 0.3, bx - s * 0.2, -s * 0.7 + lp, s * 0.1);
        limbLine(bx, s * 0.3, bx - s * 0.2, s * 0.7 - lp, s * 0.1);
      }
      fillPath(() => ctx.arc(s * 0.75, 0, s * 0.3, 0, Math.PI * 2));
      eye(s * 0.9, -s * 0.1);
      eye(s * 0.9, s * 0.1);
      break;
    }
    // 毒爆体 — swollen pulsing sac with veins
    case "bloater": {
      const pulse = 1 + Math.sin(t * 3) * 0.04;
      fillPath(() => ctx.ellipse(0, 0, s * 0.8 * pulse, s * 0.72 * pulse, 0, 0, Math.PI * 2));
      ctx.strokeStyle = rgba("#bef264", 0.6);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.64);
        ctx.stroke();
      }
      fillPath(() => ctx.ellipse(-s * 0.3, s * 0.6, s * 0.22, s * 0.14, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.3, -s * 0.6, s * 0.22, s * 0.14, 0, 0, Math.PI * 2));
      eye(s * 0.4, -s * 0.22);
      eye(s * 0.4, s * 0.22);
      break;
    }
    // 尖啸者 — tall thin, open maw, sonic rings
    case "screamer": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.5, s * 0.82, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.2, -s * 0.6, s * 0.4, s * 0.14, 0.5, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.2, s * 0.6, s * 0.4, s * 0.14, -0.5, 0, Math.PI * 2));
      ctx.fillStyle = "#1a0a1a";
      ctx.beginPath();
      ctx.ellipse(s * 0.5, 0, s * 0.32, s * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(glow, 0.5 + Math.sin(t * 10) * 0.25);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const rr = s * (0.9 + i * 0.4 + (t % 1) * 0.4);
        ctx.beginPath();
        ctx.arc(s * 0.4, 0, rr, -0.7, 0.7);
        ctx.stroke();
      }
      ctx.restore();
      eye(s * 0.18, -s * 0.3);
      eye(s * 0.18, s * 0.3);
      break;
    }
    // 孢子怪 — body with mushroom caps + drifting spores
    case "spore": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.62, s * 0.56, 0, 0, Math.PI * 2));
      ctx.fillStyle = shade(color, 0.15);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * s * 0.34, -s * 0.45, s * 0.3, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.6;
        const rr = s * 0.7 + Math.sin(t * 2 + i) * s * 0.2;
        ctx.fillStyle = rgba(glow, 0.55);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      eye(s * 0.35, -s * 0.18);
      eye(s * 0.35, s * 0.18);
      break;
    }
    default: {
      fillPath(() => ctx.arc(0, 0, s, 0, Math.PI * 2));
    }
  }

  // poison-speckle overlay (applied by the engine's active poison aura)
  if (poison) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 1.5;
      const px = Math.cos(a) * s * 0.5;
      const py = Math.sin(a) * s * 0.5;
      ctx.fillStyle = rgba("#a3e635", 0.5);
      ctx.beginPath();
      ctx.arc(px, py, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Rounded rectangle helper
// ---------------------------------------------------------------------------
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
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
  glow: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  const sc = s / 16;
  ctx.scale(sc, sc);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  /** Draw the main white body with a glow outline. */
  const body = (p: () => void) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.6;
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

  switch (iconShape) {
    case "pistol":
      body(() => {
        ctx.beginPath();
        ctx.moveTo(-6, -2.2);
        ctx.lineTo(6, -2.2);
        ctx.lineTo(6.6, -1);
        ctx.lineTo(6.6, 0.2);
        ctx.lineTo(-6.4, 0.2);
        ctx.lineTo(-6.4, -2.2);
        ctx.closePath();

        // Grip
        ctx.moveTo(-5.4, 0.2);
        ctx.lineTo(-1.6, 0.2);
        ctx.lineTo(-3.4, 6.8);
        ctx.lineTo(-6.8, 6.8);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.moveTo(-1.6, 1.9);
        ctx.lineTo(-1.6, 4);
        ctx.lineTo(0.6, 4);
        ctx.lineTo(0.6, 1.9);
        ctx.closePath();
        ctx.fill();

        // Slide serrations
        ctx.moveTo(-5.2, -1.6);
        ctx.lineTo(-5.2, -0.4);
        ctx.moveTo(-4.2, -1.6);
        ctx.lineTo(-4.2, -0.4);
        ctx.moveTo(-3.2, -1.6);
        ctx.lineTo(-3.2, -0.4);
        ctx.stroke();

        // Laser sight chamber line
        ctx.rect(1.2, 0.5, 4.2, 1.2);
        ctx.fill();
      });
      break;

    case "mac11":
      body(() => {
        ctx.beginPath();
        ctx.moveTo(-8.5, -2.2);
        ctx.lineTo(6, -2.2);
        ctx.lineTo(6, 1.8);
        ctx.lineTo(-8.5, 1.8);
        ctx.closePath();

        // Grip
        ctx.rect(-1.5, 1.8, 3.5, 5.2);
        // Magazine
        ctx.rect(-0.8, 7, 2, 4.5);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard hole
        ctx.rect(-1.2, 2.2, 2.4, 2.4);
        ctx.fill();
        // Separator lines
        ctx.moveTo(-1.5, 1.8);
        ctx.lineTo(2, 1.8);
        ctx.moveTo(-0.8, 7);
        ctx.lineTo(1.2, 7);
        ctx.stroke();
      });
      break;

    case "mp5":
      body(() => {
        ctx.beginPath();
        ctx.moveTo(-8.5, -2.2);
        ctx.lineTo(3, -2.2);
        ctx.lineTo(3, 1.8);
        ctx.lineTo(-8.5, 1.8);
        ctx.closePath();

        // Ribbed handguard
        ctx.rect(3, -2.4, 4.5, 3.2);
        // Curved magazine
        ctx.moveTo(1.5, 1.8);
        ctx.quadraticCurveTo(2.4, 4.5, 1.2, 7.2);
        ctx.lineTo(-0.6, 7.2);
        ctx.quadraticCurveTo(0.6, 4.5, -0.7, 1.8);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard hole
        ctx.rect(-1.2, 2.2, 2.4, 2.6);
        ctx.fill();
        // Ribbed lines on handguard
        ctx.moveTo(4, -2.4);
        ctx.lineTo(4, 0.8);
        ctx.moveTo(5, -2.4);
        ctx.lineTo(5, 0.8);
        ctx.moveTo(6, -2.4);
        ctx.lineTo(6, 0.8);
        ctx.stroke();
      });
      break;

    case "mortar":
      body(() => {
        ctx.beginPath();
        // Base plate
        ctx.rect(-8, 3.5, 5, 2.5);
        // Swivel stem
        ctx.rect(-3.5, 1.5, 3, 3.5);
      });
      ctx.save();
      ctx.rotate(-Math.PI / 6);
      body(() => {
        ctx.beginPath();
        ctx.rect(-3, -2.2, 12, 4.4);
      });
      ctx.restore();
      body(() => {
        ctx.beginPath();
        // Bipod legs
        ctx.moveTo(-1, 2.5);
        ctx.lineTo(2.5, 6);
        ctx.lineTo(5.5, 2.5);
      });
      cutout(() => {
        ctx.beginPath();
        // Center tripod gap
        ctx.moveTo(-0.2, 2.8);
        ctx.lineTo(2.5, 5.5);
        ctx.lineTo(4.8, 2.8);
        ctx.closePath();
        ctx.fill();
      });
      break;

    case "shotgun":
      body(() => {
        ctx.beginPath();
        // Wooden stock
        ctx.moveTo(-10.5, -0.4);
        ctx.lineTo(-4.5, -0.4);
        ctx.lineTo(-4.5, 2.2);
        ctx.lineTo(-7.5, 5.5);
        ctx.lineTo(-10.5, 5.5);
        ctx.closePath();

        // Receiver
        ctx.rect(-4.5, -1.8, 7, 3);
        // Pump foregrip
        ctx.rect(3.5, 0.4, 4, 1.8);
        // Long double barrel
        ctx.rect(2.5, -1.2, 9, 1.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-2.8, 1.2, 2, 2);
        ctx.fill();
        // Barrel separation line
        ctx.moveTo(2.5, -0.3);
        ctx.lineTo(11.5, -0.3);
        // Pump grooves
        ctx.moveTo(4.5, 0.4);
        ctx.lineTo(4.5, 2.2);
        ctx.moveTo(5.5, 0.4);
        ctx.lineTo(5.5, 2.2);
        ctx.moveTo(6.5, 0.4);
        ctx.lineTo(6.5, 2.2);
        ctx.stroke();
      });
      break;

    case "rifle":
      body(() => {
        ctx.beginPath();
        // Stock
        ctx.moveTo(-10, -0.4);
        ctx.lineTo(-4.5, -0.4);
        ctx.lineTo(-4.5, 2.2);
        ctx.lineTo(-7.5, 5.5);
        ctx.lineTo(-10, 5.5);
        ctx.closePath();

        // Receiver
        ctx.rect(-4.5, -2, 6, 3.5);
        // Curved magazine
        ctx.moveTo(0.5, 1.5);
        ctx.quadraticCurveTo(2.4, 4.2, 1.2, 6.8);
        ctx.lineTo(-0.6, 6.8);
        ctx.quadraticCurveTo(0.6, 4.2, -0.7, 1.5);
        ctx.closePath();

        // Handguard & barrel
        ctx.rect(1.5, -2, 4.5, 2.6);
        ctx.rect(6, -0.8, 5.5, 1.2);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-2, 1.5, 1.8, 1.8);
        ctx.fill();
        // Stock thumbhole
        ctx.arc(-7.5, 2.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        // Magazine grooves
        ctx.moveTo(0.2, 3);
        ctx.lineTo(1.1, 3);
        ctx.moveTo(-0.1, 4.5);
        ctx.lineTo(0.8, 4.5);
        ctx.stroke();
      });
      break;

    case "sniper":
      body(() => {
        ctx.beginPath();
        // Stock
        ctx.moveTo(-11, -1.4);
        ctx.lineTo(4, -1.4);
        ctx.lineTo(4, 1.4);
        ctx.lineTo(-11, 1.4);
        ctx.closePath();
        // Buttstock lower
        ctx.moveTo(-11, -0.5);
        ctx.lineTo(-5.5, -0.5);
        ctx.lineTo(-7.5, 5);
        ctx.lineTo(-11, 5);
        ctx.closePath();

        // Scope
        ctx.rect(-3, -4.6, 6, 2.4);
        // Barrel
        ctx.rect(4, -0.8, 9.5, 1.2);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-1, 1.4, 2, 2);
        // Thumbhole in stock
        ctx.ellipse(-7.5, 2.2, 1.8, 0.8, 0, 0, Math.PI * 2);
        // Scope mounts (erase center)
        ctx.rect(-1.2, -2.2, 2.4, 1);
        ctx.fill();
        // Scope lens division
        ctx.moveTo(-3, -3.4);
        ctx.lineTo(3, -3.4);
        ctx.stroke();
      });
      break;

    case "rocket":
      body(() => {
        ctx.beginPath();
        // Launch tube
        ctx.rect(-10, -2.8, 16, 5.6);
        // Shield
        ctx.rect(-5, -3.2, 5.5, 6.4);
        // Warhead
        ctx.moveTo(6, -1.8);
        ctx.lineTo(8.5, -3.5);
        ctx.lineTo(12, 0);
        ctx.lineTo(8.5, 3.5);
        ctx.lineTo(6, 1.8);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Shield banding lines
        ctx.moveTo(-4, -3.2);
        ctx.lineTo(-4, 3.2);
        ctx.moveTo(-1, -3.2);
        ctx.lineTo(-1, 3.2);
        // Rocket warhead separator lines
        ctx.moveTo(6, -1.8);
        ctx.lineTo(6, 1.8);
        ctx.moveTo(8.5, -3.5);
        ctx.lineTo(8.5, 3.5);
        ctx.stroke();
      });
      break;

    case "akm":
      body(() => {
        ctx.beginPath();
        // Reddish-brown wood stock
        ctx.moveTo(-11.5, -0.8);
        ctx.lineTo(-5.5, -0.8);
        ctx.lineTo(-5.5, 2.2);
        ctx.lineTo(-8.5, 5.2);
        ctx.lineTo(-11.5, 5.2);
        ctx.closePath();

        // Receiver
        ctx.rect(-5.5, -2.2, 7, 3.7);
        // Banana mag
        ctx.moveTo(0.2, 1.5);
        ctx.quadraticCurveTo(2.8, 4.4, 1.4, 7.5);
        ctx.lineTo(-0.8, 7.5);
        ctx.quadraticCurveTo(0.6, 4.4, -0.8, 1.5);
        ctx.closePath();

        // Handguard
        ctx.rect(1.5, -2, 4.5, 2.5);
        // Barrel
        ctx.rect(6, -1, 6.5, 0.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-2.4, 1.5, 1.8, 1.8);
        ctx.fill();
        // Stock separation gap
        ctx.moveTo(-5.5, -0.8);
        ctx.lineTo(-5.5, 2.2);
        // Banana mag slots
        ctx.moveTo(0.1, 3.2);
        ctx.lineTo(1.2, 3.2);
        ctx.moveTo(-0.1, 4.8);
        ctx.lineTo(0.8, 4.8);
        ctx.stroke();
      });
      break;

    case "fcar":
      body(() => {
        ctx.beginPath();
        // Upper & lower receiver
        ctx.rect(-9.5, -2.6, 18, 4);
        // Holographic scope
        ctx.rect(-2, -4.5, 4, 1.9);
        // Tan mag
        ctx.rect(-1.5, 1.4, 2.5, 4.4);
        // Tactical foregrip
        ctx.rect(3, 1.4, 1.8, 3.2);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(0, 1.4, 1.8, 2.0);
        // Holographic lens window
        ctx.rect(-1, -3.9, 2, 1.1);
        ctx.fill();
        // Mag separators
        ctx.moveTo(-1.5, 1.4);
        ctx.lineTo(1, 1.4);
        ctx.stroke();
      });
      break;

    case "pulse":
      body(() => {
        ctx.beginPath();
        // Sleek chassis
        ctx.moveTo(-9.5, -3);
        ctx.lineTo(6.5, -3);
        ctx.lineTo(8.5, 0);
        ctx.lineTo(6.5, 3);
        ctx.lineTo(-9.5, 3);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Giant circular core cutout
        ctx.arc(-0.5, 0, 2.4, 0, Math.PI * 2);
        // Trigger guard
        ctx.rect(-6, 0.8, 2, 2.2);
        ctx.fill();
        // Circuit lines
        ctx.moveTo(-7.5, -1.5);
        ctx.lineTo(-3.5, -1.5);
        ctx.moveTo(-7.5, 1.5);
        ctx.lineTo(-3.5, 1.5);
        ctx.stroke();
      });
      break;

    case "lightsaber":
      body(() => {
        ctx.beginPath();
        // Chrome hilt
        ctx.rect(-8.5, -1.6, 11, 3.2);
        // Emitter base ring
        ctx.rect(1.5, -2.2, 1, 4.4);
        // Blade
        ctx.rect(2.5, -1.2, 11, 2.4);
      });
      cutout(() => {
        ctx.beginPath();
        // Hilt ribs (vertical grooves)
        ctx.moveTo(-6.5, -1.6);
        ctx.lineTo(-6.5, 1.6);
        ctx.moveTo(-4.5, -1.6);
        ctx.lineTo(-4.5, 1.6);
        ctx.moveTo(-2.5, -1.6);
        ctx.lineTo(-2.5, 1.6);
        ctx.moveTo(-0.5, -1.6);
        ctx.lineTo(-0.5, 1.6);
        ctx.stroke();
      });
      break;

    case "hammer":
      body(() => {
        ctx.beginPath();
        // Handle
        ctx.rect(-9.5, -1, 13, 2);
        // Massive head
        ctx.rect(3.5, -5.5, 7, 11);
      });
      cutout(() => {
        ctx.beginPath();
        // Volcanic lava crack paths
        ctx.moveTo(4.5, -3);
        ctx.lineTo(6.5, 0);
        ctx.lineTo(5.5, 3.5);
        ctx.moveTo(9.5, -4);
        ctx.lineTo(7.8, -1.5);
        ctx.lineTo(9, 2.5);
        // Handle wrap lines
        ctx.moveTo(-7.5, -1);
        ctx.lineTo(-6.5, 1);
        ctx.moveTo(-5.5, -1);
        ctx.lineTo(-4.5, 1);
        ctx.moveTo(-3.5, -1);
        ctx.lineTo(-2.5, 1);
        ctx.stroke();
      });
      break;

    case "flamethrower":
      body(() => {
        ctx.beginPath();
        // Brass fuel tank
        ctx.ellipse(-4, 3, 3, 4.4, 0, 0, Math.PI * 2);
        // Main body
        ctx.rect(-9.5, -3, 16, 4.2);
        // Nozzle
        ctx.rect(6.5, -1.8, 3, 1.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Tank connecting band lines
        ctx.moveTo(-6.5, 1);
        ctx.lineTo(-1.5, 1);
        // Chassis cooling slots
        ctx.rect(-8, -1.8, 1.5, 1.5);
        ctx.rect(-5, -1.8, 1.5, 1.5);
        ctx.rect(-2, -1.8, 1.5, 1.5);
        ctx.fill();
      });
      break;

    case "sa1216":
      body(() => {
        ctx.beginPath();
        // Upper receiver
        ctx.rect(-9, -2.4, 10.5, 3.6);
        // Quad magazine rotating cylinders
        ctx.rect(1.5, 0.4, 6.2, 3.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-4, 1.2, 2, 2);
        ctx.fill();
        // Quad tube division lines
        ctx.moveTo(1.5, 1.4);
        ctx.lineTo(7.7, 1.4);
        ctx.moveTo(1.5, 2.3);
        ctx.lineTo(7.7, 2.3);
        ctx.moveTo(1.5, 3.2);
        ctx.lineTo(7.7, 3.2);
        ctx.stroke();
      });
      break;

    case "mgl32":
      body(() => {
        ctx.beginPath();
        // Launcher frame
        ctx.rect(-9.5, -2, 18.5, 4);
        // Swivel Stock
        ctx.moveTo(-9.5, -1);
        ctx.lineTo(-13, 3.5);
        ctx.lineTo(-9.5, 3.5);
        ctx.closePath();

        // Giant revolving cylinder
        ctx.ellipse(0, 0, 3.5, 4.4, 0, 0, Math.PI * 2);
      });
      cutout(() => {
        ctx.beginPath();
        // Cylinder chambers slots (3-4 oval holes)
        ctx.ellipse(-1.5, -1.8, 0.6, 1.2, -Math.PI/6, 0, Math.PI * 2);
        ctx.ellipse(-1.5, 1.8, 0.6, 1.2, Math.PI/6, 0, Math.PI * 2);
        ctx.ellipse(1.5, 0, 0.6, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Trigger guard
        ctx.rect(-5, 2, 1.8, 1.8);
        ctx.fill();
      });
      break;

    case "spear":
      body(() => {
        ctx.beginPath();
        // Shaft
        ctx.rect(-12.5, -0.8, 17, 1.6);
        // Spearhead
        ctx.moveTo(4.5, -3.2);
        ctx.lineTo(13.5, 0);
        ctx.lineTo(4.5, 3.2);
        ctx.lineTo(6.2, 0);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Fuller groove in spearhead center
        ctx.moveTo(5.5, 0);
        ctx.lineTo(11, 0);
        ctx.stroke();
      });
      break;

    case "drone":
      body(() => {
        ctx.beginPath();
        // Quadrotor frame
        ctx.moveTo(-5, -1);
        ctx.lineTo(-3, -5.5);
        ctx.lineTo(3, -5.5);
        ctx.lineTo(5, -1);
        ctx.lineTo(3, 4.5);
        ctx.lineTo(-3, 4.5);
        ctx.closePath();

        // Rotor caps
        ctx.rect(-5.2, -6.2, 1.4, 1.4);
        ctx.rect(3.8, -6.2, 1.4, 1.4);
        ctx.rect(-5.2, 3.8, 1.4, 1.4);
        ctx.rect(3.8, 3.8, 1.4, 1.4);
      });
      cutout(() => {
        ctx.beginPath();
        // Frame gaps (make it lightweight skeleton)
        ctx.rect(-2.2, -3.8, 4.4, 2.2);
        ctx.rect(-2.2, 0.8, 4.4, 2.2);
        // Center camera eye hole
        ctx.arc(0, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case "recurve_bow":
      body(() => {
        ctx.beginPath();
        // Golden limbs
        ctx.moveTo(1, -9.5);
        ctx.quadraticCurveTo(8.5, -4.5, 4, 0);
        ctx.quadraticCurveTo(8.5, 4.5, 1, 9.5);
        ctx.lineTo(2.2, 8.5);
        ctx.quadraticCurveTo(7.2, 4.5, 4.8, 0);
        ctx.quadraticCurveTo(7.2, -4.5, 2.2, -8.5);
        ctx.closePath();

        // Arrow
        ctx.rect(-11, -0.6, 16.5, 1.2);
        ctx.moveTo(5.5, -2);
        ctx.lineTo(9.5, 0);
        ctx.lineTo(5.5, 2);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Gap near string
        ctx.moveTo(1, -8.5);
        ctx.lineTo(1, 8.5);
        ctx.stroke();
      });
      break;

    case "riot_shield":
      body(() => {
        ctx.beginPath();
        // Heavy shield
        ctx.moveTo(-8.5, -7.5);
        ctx.lineTo(4.5, -9.5);
        ctx.lineTo(8, 0);
        ctx.lineTo(4.5, 9.5);
        ctx.lineTo(-8.5, 7.5);
        ctx.closePath();
      });
      cutout(() => {
        ctx.beginPath();
        // Viewport window
        ctx.rect(-3, -6.5, 6, 2.6);
        ctx.fill();
        // Energy cross lines
        ctx.moveTo(-6, -1);
        ctx.lineTo(6, -1);
        ctx.moveTo(-6, 2);
        ctx.lineTo(6, 2);
        ctx.moveTo(-1, -4);
        ctx.lineTo(-1, 6);
        ctx.stroke();
      });
      break;

    case "shak50": // Shak-50 from reference image (Image 1)
      body(() => {
        ctx.beginPath();
        // Chassis & stock
        ctx.moveTo(-9.5, -2.8);
        ctx.lineTo(6.5, -2.8);
        ctx.lineTo(6.5, -0.5);
        ctx.lineTo(9.5, -0.5); // barrel extension
        ctx.lineTo(9.5, 0.5);
        ctx.lineTo(6.5, 0.5);
        ctx.lineTo(6.5, 2.4);
        ctx.lineTo(3.2, 2.4);
        ctx.lineTo(2.2, 7.5); // pistol grip
        ctx.lineTo(-0.2, 7.5);
        ctx.lineTo(-0.2, 2.4);
        // bullpup magazine behind grip
        ctx.lineTo(-4.5, 2.4);
        ctx.lineTo(-5.2, 7.5);
        ctx.lineTo(-8.2, 7.5);
        ctx.lineTo(-7.5, 2.4);
        ctx.lineTo(-9.5, 2.4);
        ctx.closePath();

        // Carry handle
        ctx.rect(-3.5, -5.2, 7.5, 2.4);
      });
      cutout(() => {
        ctx.beginPath();
        // Carry handle slot
        ctx.rect(-2.5, -4.5, 5.5, 1.7);
        // Trigger guard hole
        ctx.arc(1.5, 2.5, 1.0, 0, Math.PI * 2);
        // Thumbhole in stock
        ctx.moveTo(-5.5, -0.5);
        ctx.lineTo(-8.5, -0.5);
        ctx.lineTo(-8.5, 1.8);
        ctx.lineTo(-5.5, 1.8);
        ctx.closePath();
        // Handguard vents (3 small circles)
        ctx.arc(1.8, -1.2, 0.4, 0, Math.PI * 2);
        ctx.arc(3.4, -1.2, 0.4, 0, Math.PI * 2);
        ctx.arc(5.0, -1.2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle brake holes (2 vertical slots)
        ctx.moveTo(8.0, -0.5);
        ctx.lineTo(8.0, 0.5);
        ctx.moveTo(8.8, -0.5);
        ctx.lineTo(8.8, 0.5);
        ctx.stroke();
      });
      break;

    case "gatling":
      body(() => {
        ctx.beginPath();
        // Barrels
        ctx.rect(2.5, -1.8, 10, 0.8);
        ctx.rect(2.5, -0.6, 10, 0.8);
        ctx.rect(2.5, 0.6, 10, 0.8);
        // Receiver
        ctx.rect(-9, -2.4, 11.5, 4.8);
        // Bullet ammo belt
        ctx.rect(-2.5, 2.4, 3.5, 4.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Bullet links
        ctx.moveTo(-1.5, 2.4);
        ctx.lineTo(-1.5, 7.2);
        ctx.moveTo(-0.5, 2.4);
        ctx.lineTo(-0.5, 7.2);
        ctx.stroke();
      });
      break;

    case "poison_mist":
      body(() => {
        ctx.beginPath();
        // Canister on top
        ctx.rect(-4.5, -6.5, 7, 5);
        // Chassis below
        ctx.rect(-8.5, -1.5, 15, 4);
      });
      cutout(() => {
        ctx.beginPath();
        // Liquid level line
        ctx.moveTo(-4.5, -3.5);
        ctx.lineTo(2.5, -3.5);
        // Canister lid line
        ctx.moveTo(-4.5, -5.5);
        ctx.lineTo(2.5, -5.5);
        // Trigger guard
        ctx.rect(-2, 2.5, 1.8, 1.8);
        ctx.fill();
        ctx.stroke();
      });
      break;

    case "lewis":
      body(() => {
        ctx.beginPath();
        // Coolant barrel shroud
        ctx.rect(3.5, -2, 8, 3.2);
        // Pan magazine
        ctx.ellipse(0, -4.6, 3.8, 1.8, 0, 0, Math.PI * 2);
        // Receiver
        ctx.rect(-9, -2.4, 12.5, 4.8);
      });
      cutout(() => {
        ctx.beginPath();
        // Trigger guard
        ctx.rect(-4.5, 2.4, 1.8, 2);
        ctx.fill();
        // Pan magazine radial slots
        ctx.moveTo(-2, -4.6);
        ctx.lineTo(2, -4.6);
        ctx.moveTo(0, -5.8);
        ctx.lineTo(0, -3.4);
        ctx.stroke();
      });
      break;

    case "plasma_rifle":
      body(() => {
        ctx.beginPath();
        // Body
        ctx.rect(-8, -2.2, 15, 4.4);
      });
      cutout(() => {
        ctx.beginPath();
        // Battery cells (3 vertical rectangular slots)
        ctx.rect(-2.5, -1.2, 1.2, 2.4);
        ctx.rect(-0.2, -1.2, 1.2, 2.4);
        ctx.rect(2.1, -1.2, 1.2, 2.4);
        // Trigger guard
        ctx.rect(-6, 2.2, 1.8, 1.8);
        ctx.fill();
      });
      break;

    case "lightning_whip":
      body(() => {
        ctx.beginPath();
        // Handle
        ctx.rect(-8.5, -1.6, 9.5, 3.2);
        // Whip bolt segments
        ctx.moveTo(1, 0);
        ctx.lineTo(3.5, -3.2);
        ctx.lineTo(6.5, 2.5);
        ctx.lineTo(9, -2.5);
        ctx.lineTo(11, 2.5);
        ctx.lineTo(13.5, 0.2);
      });
      cutout(() => {
        ctx.beginPath();
        // Handle ribs
        ctx.moveTo(-6.5, -1.6);
        ctx.lineTo(-6.5, 1.6);
        ctx.moveTo(-4.5, -1.6);
        ctx.lineTo(-4.5, 1.6);
        ctx.moveTo(-2.5, -1.6);
        ctx.lineTo(-2.5, 1.6);
        ctx.stroke();
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