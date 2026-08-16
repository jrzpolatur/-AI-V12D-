import { GunDef } from "./types";

// ============================================================================
// 16-Bit / 32-Bit Master Pixel Weapon Art Library
// Inspired by iconic retro arcade & RPG pixel firearms with:
// - Sharp dark pixel outlines (#0f172a / #020617)
// - 3~4 step shading palettes (steel, walnut wood, gold/brass, desert tan, plasma)
// - Precise mechanical detailing (banana mags, carry handles, scopes, fluted barrels)
// ============================================================================

// --- Color Palettes ---
const C = {
  OUTLINE: "#0f172a",
  OUTLINE_SOFT: "#1e293b",
  DARK_BG: "#020617",

  // Gunmetal Steel
  STEEL_HI: "#cbd5e1",
  STEEL_LT: "#94a3b8",
  STEEL_MD: "#475569",
  STEEL_DK: "#334155",
  STEEL_DP: "#1e293b",

  // Tactical Black
  BLACK_HI: "#475569",
  BLACK_MD: "#1e293b",
  BLACK_DK: "#0f172a",

  // Walnut & Mahogany Wood
  WOOD_HI: "#d97706",
  WOOD_LT: "#b45309",
  WOOD_MD: "#92400e",
  WOOD_DK: "#78350f",
  WOOD_DP: "#451a03",

  // Brass & Gold
  GOLD_HI: "#fef08a",
  GOLD_LT: "#fde047",
  GOLD_MD: "#eab308",
  GOLD_DK: "#ca8a04",
  GOLD_DP: "#854d0e",

  // Desert Tan / FDE
  TAN_HI: "#fef3c7",
  TAN_LT: "#fde68a",
  TAN_MD: "#d97706",
  TAN_DK: "#b45309",
  TAN_DP: "#78350f",

  // Olive Green / Camo
  GREEN_HI: "#86efac",
  GREEN_LT: "#22c55e",
  GREEN_MD: "#166534",
  GREEN_DK: "#14532d",

  // Ivory / Pearl
  IVORY_HI: "#ffffff",
  IVORY_MD: "#f1f5f9",
  IVORY_DK: "#cbd5e1",

  // Cyber / Plasma Glow
  CYAN_CORE: "#ffffff",
  CYAN_LT: "#7dd3fc",
  CYAN_MD: "#38bdf8",
  CYAN_DK: "#0284c7",

  PURPLE_CORE: "#ffffff",
  PURPLE_LT: "#f0abfc",
  PURPLE_MD: "#c084fc",
  PURPLE_DK: "#9333ea",

  FIRE_CORE: "#ffffff",
  FIRE_LT: "#fef08a",
  FIRE_MD: "#fb923c",
  FIRE_DK: "#ea580c",
  FIRE_DP: "#991b1b",

  // Bio Green Glow
  BIO_CORE: "#ffffff",
  BIO_LT: "#86efac",
  BIO_MD: "#22c55e",
  BIO_DK: "#15803d",
  BIO_DP: "#14532d",
};

// --- Low-level Pixel Drawing Helpers ---

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke = C.OUTLINE
) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.max(1, Math.round(w));
  const ih = Math.max(1, Math.round(h));

  ctx.fillStyle = fill;
  ctx.fillRect(ix, iy, iw, ih);

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ix, iy, iw, ih);
  }
}

function pxShaded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hi: string,
  mid: string,
  dk: string,
  stroke = C.OUTLINE
) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.max(1, Math.round(w));
  const ih = Math.max(1, Math.round(h));

  ctx.fillStyle = mid;
  ctx.fillRect(ix, iy, iw, ih);

  if (ih >= 3) {
    ctx.fillStyle = hi;
    ctx.fillRect(ix, iy, iw, Math.max(1, Math.floor(ih * 0.3)));
    ctx.fillStyle = dk;
    ctx.fillRect(ix, iy + Math.floor(ih * 0.7), iw, Math.ceil(ih * 0.3));
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ix, iy, iw, ih);
  }
}

function pxGlowCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  coreColor: string,
  haloColor: string
) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const iw = Math.max(1, Math.round(w));
  const ih = Math.max(1, Math.round(h));

  ctx.fillStyle = haloColor;
  ctx.fillRect(ix - 1, iy - 1, iw + 2, ih + 2);
  ctx.fillStyle = coreColor;
  ctx.fillRect(ix, iy, iw, ih);
}

// ============================================================================
// 16-Bit Weapon Pixel Art Definitions
// (Drawn facing rightwards along +X, with player hand pivot around origin (0,0))
// ============================================================================

export function drawPixelWeapon(
  ctx: CanvasRenderingContext2D,
  gun: GunDef,
  accent: string,
  t = 0,
  swing = 0
) {
  if (!ctx) return;
  ctx.save();
  ctx.lineJoin = "miter";
  ctx.lineCap = "square";

  // Melee attack arc rotation
  if (gun.weaponClass === "melee") {
    if (swing > 0) {
      const full = gun.meleeArc ?? 2.4;
      ctx.rotate(-full / 2 + swing * full);
      ctx.translate(Math.sin(swing * Math.PI) * 14, 0);
    }
  }

  const shape = gun.shape || gun.id;
  const glow = gun.glow || accent || "#38bdf8";

  switch (shape) {
    // ------------------------------------------------------------------------
    // 1. SILENCED PISTOL (消音战术手枪)
    // ------------------------------------------------------------------------
    case "pistol":
    case "silenced_pistol": {
      // Grip & Magazine
      pxShaded(ctx, -6, 0, 5, 8, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -5, 8, 4, 2, C.STEEL_MD); // Mag floorplate
      // Trigger guard & trigger
      px(ctx, -2, 2, 4, 4, C.BLACK_DK);
      px(ctx, -1, 3, 2, 2, C.STEEL_LT); // Trigger
      // Slide & Receiver
      pxShaded(ctx, -7, -4, 15, 5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      // Slide Serrations
      px(ctx, -6, -3, 1, 3, C.STEEL_DK, "");
      px(ctx, -4, -3, 1, 3, C.STEEL_DK, "");
      px(ctx, -2, -3, 1, 3, C.STEEL_DK, "");
      // Ejection port
      px(ctx, 1, -4, 3, 2, C.STEEL_DP, "");
      // Front & Rear Sights
      px(ctx, -6, -6, 2, 2, C.BLACK_DK);
      px(ctx, 6, -6, 2, 2, C.BLACK_DK);
      // Long Silencer / Suppressor
      pxShaded(ctx, 8, -3.5, 12, 4, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, 10, -3.5, 1, 4, C.STEEL_MD, "");
      px(ctx, 14, -3.5, 1, 4, C.STEEL_MD, "");
      px(ctx, 18, -3.5, 1, 4, C.STEEL_MD, "");
      // Underbarrel Laser Sight
      px(ctx, 0, 1, 6, 2, C.STEEL_DK);
      pxGlowCore(ctx, 5, 1, 2, 2, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 2. HEAVY REVOLVER (.357 象牙左轮手枪 - 如参考图)
    // ------------------------------------------------------------------------
    case "r357":
    case "revolver": {
      // Pearl / Ivory white grip
      pxShaded(ctx, -7, 0, 5, 9, C.IVORY_HI, C.IVORY_MD, C.IVORY_DK);
      px(ctx, -5, 3, 2, 2, C.GOLD_MD); // Brass grip medallion
      // Brass / Gold frame
      pxShaded(ctx, -4, -3, 9, 6, C.GOLD_HI, C.GOLD_MD, C.GOLD_DK);
      px(ctx, -2, 2, 4, 4, C.GOLD_DK); // Trigger guard
      px(ctx, -1, 3, 2, 2, C.STEEL_HI); // Trigger
      // Hammer spur
      px(ctx, -6, -4, 3, 2, C.STEEL_MD);
      // Fluted Blued-Steel Cylinder (6 chambers)
      pxShaded(ctx, -1, -3, 7, 5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, 1, -2, 3, 1, C.STEEL_DP, "");
      px(ctx, 1, 0, 3, 1, C.STEEL_DP, "");
      // Long Vented-Rib Barrel
      pxShaded(ctx, 6, -3, 14, 4, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, 7, -4.5, 12, 1.5, C.STEEL_MD); // Top rib
      px(ctx, 9, -4.5, 2, 1, C.STEEL_DP, "");
      px(ctx, 13, -4.5, 2, 1, C.STEEL_DP, "");
      px(ctx, 19, -5.5, 2, 2, C.GOLD_HI); // High front sight blade
      break;
    }

    // ------------------------------------------------------------------------
    // 3. MAC11 (微型冲锋枪)
    // ------------------------------------------------------------------------
    case "mac11": {
      // Square box receiver
      pxShaded(ctx, -6, -4, 15, 6, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -2, -5.5, 3, 2, C.STEEL_HI); // Top cocking knob
      // Pistol grip & extended straight box mag
      pxShaded(ctx, -2, 1, 4, 6, C.BLACK_MD, C.BLACK_DK, C.BLACK_DK);
      pxShaded(ctx, -1.5, 7, 3, 8, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP); // Extended mag
      // Trigger guard
      px(ctx, 2, 2, 3, 3, C.BLACK_DK);
      // Suppressor / Silencer
      pxShaded(ctx, 9, -3.5, 11, 4.5, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 11, -3.5, 1, 4.5, C.STEEL_HI, "");
      px(ctx, 15, -3.5, 1, 4.5, C.STEEL_HI, "");
      // Wire folding stock
      px(ctx, -10, -2, 4, 2, C.STEEL_DK);
      px(ctx, -10, -2, 2, 6, C.STEEL_DK);
      break;
    }

    // ------------------------------------------------------------------------
    // 4. MP5 (战术冲锋枪)
    // ------------------------------------------------------------------------
    case "mp5": {
      // Fixed black polymer stock
      pxShaded(ctx, -14, -2.5, 7, 5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      // Receiver
      pxShaded(ctx, -7, -4, 15, 6, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      // Curved 9mm Magazine
      ctx.save();
      ctx.translate(1, 2);
      ctx.rotate(0.35);
      pxShaded(ctx, 0, 0, 3.5, 10, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      ctx.restore();
      // Ribbed Handguard
      pxShaded(ctx, 3, -3.5, 9, 5.5, C.STEEL_DK, C.BLACK_MD, C.BLACK_DK);
      px(ctx, 5, -3.5, 1, 5.5, C.BLACK_DK, "");
      px(ctx, 8, -3.5, 1, 5.5, C.BLACK_DK, "");
      // Barrel & Front Sight Ring
      pxShaded(ctx, 12, -2, 5, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 14, -4.5, 2, 3, C.STEEL_DK); // Hooded front sight
      // Rear rotary sight
      px(ctx, -5, -5.5, 2.5, 2, C.STEEL_DK);
      break;
    }

    // ------------------------------------------------------------------------
    // 5. AKM / AK-47 (经典突击步枪 - 如参考图)
    // ------------------------------------------------------------------------
    case "akm": {
      // Wood Stock with metal buttplate
      pxShaded(ctx, -15, -2.5, 9, 5.5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      px(ctx, -15, -3, 1.5, 6.5, C.STEEL_DK); // Buttplate
      // Steel Receiver with Top Dust Cover
      pxShaded(ctx, -6, -4, 14, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -5, 1, 4, 6, C.WOOD_MD); // Wood pistol grip
      // Curved Banana Magazine (7.62mm)
      ctx.save();
      ctx.translate(2, 2);
      ctx.rotate(0.42);
      pxShaded(ctx, 0, 0, 4.5, 12, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 1, 2, 2.5, 2, C.STEEL_HI, "");
      px(ctx, 1, 6, 2.5, 2, C.STEEL_HI, "");
      ctx.restore();
      // Wood Handguard & Gas Tube
      pxShaded(ctx, 8, -3.5, 8, 5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      pxShaded(ctx, 8, -5, 7, 2, C.WOOD_MD, C.WOOD_DK, C.WOOD_DP); // Upper handguard
      // Barrel, Gas Block & Slanted Muzzle
      pxShaded(ctx, 16, -2, 9, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 17, -4.5, 3, 3, C.STEEL_DK); // Gas block
      px(ctx, 22, -4.5, 2, 3, C.STEEL_DK); // Hooded front sight post
      px(ctx, 25, -2, 2, 2.5, C.STEEL_MD); // Slant muzzle
      break;
    }

    // ------------------------------------------------------------------------
    // 6. RIFLE / M4 CARBINE (M4 战术卡宾枪 - 如参考图)
    // ------------------------------------------------------------------------
    case "rifle": {
      // 6-Position Collapsible Crane Stock
      pxShaded(ctx, -15, -2.5, 8, 5.5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -16, -3, 1.5, 6.5, C.STEEL_DK); // Rubber buttpad
      px(ctx, -7, -1, 3, 2, C.STEEL_MD); // Buffer tube
      // Upper & Lower Receiver
      pxShaded(ctx, -5, -4, 13, 6, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -4, 1, 4, 6, C.BLACK_DK); // Textured A2 pistol grip
      // STANAG 30-round curved magazine
      ctx.save();
      ctx.translate(2, 2);
      ctx.rotate(0.3);
      pxShaded(ctx, 0, 0, 4, 11, C.STEEL_MD, C.STEEL_DK, C.BLACK_DK);
      ctx.restore();
      // Carry Handle / Iron Sight Scope
      px(ctx, -4, -6.5, 8, 3, C.BLACK_MD);
      px(ctx, -1, -5.5, 2, 1, C.BLACK_DK, ""); // Sight aperture hole
      // Quad-Rail Handguard with Ribs
      pxShaded(ctx, 8, -3.5, 10, 5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, 10, -3.5, 1, 5, C.STEEL_MD, "");
      px(ctx, 13, -3.5, 1, 5, C.STEEL_MD, "");
      px(ctx, 16, -3.5, 1, 5, C.STEEL_MD, "");
      // Barrel, A2 Triangle Front Sight & Birdcage Flash Hider
      pxShaded(ctx, 18, -2, 8, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 20, -5.5, 2.5, 4, C.BLACK_DK); // Triangle front sight
      px(ctx, 25, -2.5, 3, 3.5, C.STEEL_DK); // Flash hider
      break;
    }

    // ------------------------------------------------------------------------
    // 7. FCAR / FN SCAR (重型突击步枪 - 经典双色沙色 FDE)
    // ------------------------------------------------------------------------
    case "fcar": {
      // FDE Tan Folding UGG Boot Stock
      pxShaded(ctx, -15, -2.5, 9, 6, C.TAN_HI, C.TAN_MD, C.TAN_DK);
      px(ctx, -11, -4, 4, 2, C.TAN_DK); // Adjustable cheek rest
      // Monolithic FDE Upper Receiver
      pxShaded(ctx, -6, -5, 17, 7, C.TAN_HI, C.TAN_MD, C.TAN_DK);
      px(ctx, -4, 2, 4, 6, C.TAN_DK); // Pistol grip
      // Heavy 7.62 Box Magazine
      pxShaded(ctx, 1, 2, 5, 9, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      // Top Picatinny Rail & Holographic Optic
      px(ctx, -6, -6.5, 17, 1.5, C.BLACK_DK);
      px(ctx, -1, -8.5, 6, 2.5, C.BLACK_MD); // Holo sight housing
      pxGlowCore(ctx, 1, -7.5, 2, 1, "#ffffff", glow);
      // Fluted Barrel & Slotted Muzzle Brake
      pxShaded(ctx, 11, -2, 10, 3, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 19, -3, 3, 5, C.BLACK_DK); // Heavy muzzle brake
      break;
    }

    // ------------------------------------------------------------------------
    // 8. WINCHESTER M1887 (杠杆霰弹枪 - 黄铜与胡桃木，如参考图)
    // ------------------------------------------------------------------------
    case "m1887": {
      // Walnut Wood Stock
      pxShaded(ctx, -16, -2, 10, 5.5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      px(ctx, -16, -2.5, 1.5, 6.5, C.GOLD_MD); // Brass buttplate
      // Golden Brass Receiver
      pxShaded(ctx, -6, -4, 11, 7, C.GOLD_HI, C.GOLD_MD, C.GOLD_DK);
      // Lever Loop under grip
      px(ctx, -4, 3, 5, 4, C.GOLD_DK);
      px(ctx, -3, 4, 3, 2, C.DARK_BG, ""); // Loop cutout
      // Walnut Wood Fore-end
      pxShaded(ctx, 5, -2, 7, 4.5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      // Blued Steel Double Barrels (Barrel + Tube)
      pxShaded(ctx, 5, -4, 16, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP); // Top barrel
      pxShaded(ctx, 12, -1.5, 8, 2, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP); // Bottom tube
      // Brass Barrel Bands
      px(ctx, 8, -4.5, 1.5, 5.5, C.GOLD_HI);
      px(ctx, 15, -4.5, 1.5, 5.5, C.GOLD_HI);
      px(ctx, 20, -5, 1.5, 2, C.GOLD_HI); // Bead sight
      break;
    }

    // ------------------------------------------------------------------------
    // 9. SHOTGUN / PUMP ACTION (经典泵动霰弹枪)
    // ------------------------------------------------------------------------
    case "shotgun": {
      // Wood Stock
      pxShaded(ctx, -14, -2.5, 9, 5.5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      // Steel Receiver
      pxShaded(ctx, -5, -4, 11, 7, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, 1, -3, 3, 2, C.STEEL_DK, ""); // Ejection port
      // Ribbed Wood Pump Forearm Slider
      pxShaded(ctx, 6, -1, 7, 5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      px(ctx, 8, -1, 1, 5, C.WOOD_DP, "");
      px(ctx, 10, -1, 1, 5, C.WOOD_DP, "");
      // Dual Steel Barrel & Tube
      pxShaded(ctx, 6, -4, 16, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      pxShaded(ctx, 13, -1.5, 7, 2, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 21, -5, 1.5, 2, C.GOLD_HI); // Front bead
      break;
    }

    // ------------------------------------------------------------------------
    // 10. SA1216 (回转式弹仓霰弹枪)
    // ------------------------------------------------------------------------
    case "sa1216": {
      // Bullpup stock & frame
      pxShaded(ctx, -13, -3, 8, 6, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      pxShaded(ctx, -5, -4.5, 15, 7, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      // 4-Tube Rotary Magazine cluster
      pxShaded(ctx, 1, 2.5, 11, 5, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 3, 3, 2, 4, C.STEEL_HI, "");
      px(ctx, 7, 3, 2, 4, C.STEEL_HI, "");
      // Barrel & Rail
      pxShaded(ctx, 10, -3, 10, 3, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      pxGlowCore(ctx, 18, -2, 2, 2, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 11. SNIPER RIFLE (战术狙击枪)
    // ------------------------------------------------------------------------
    case "sniper":
    case "scout": {
      // Polymer Stock with adjustable cheek pad
      pxShaded(ctx, -16, -2.5, 10, 5.5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -12, -4.5, 5, 2, C.STEEL_MD); // Cheek riser
      // Bolt Action Receiver
      pxShaded(ctx, -6, -4, 13, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -4, 2, 3.5, 5, C.BLACK_DK); // Grip
      px(ctx, 0, 2, 4, 4, C.STEEL_DK); // Box mag
      // High-Power Optical Sniper Scope
      pxShaded(ctx, -4, -8, 14, 3.5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -5, -8.5, 2, 4.5, C.STEEL_DK); // Rear eyepiece
      px(ctx, 8, -9, 3, 5.5, C.STEEL_DK); // Front sunshade
      pxGlowCore(ctx, 9, -7.5, 2, 2, "#ffffff", glow); // Lens glint
      // Long Match-Grade Fluted Barrel
      pxShaded(ctx, 7, -2, 22, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 11, -1.5, 12, 1, C.STEEL_DP, ""); // Barrel flute
      // Heavy Muzzle Brake
      px(ctx, 28, -3, 4, 4.5, C.BLACK_DK);
      // Folded Bipod legs
      px(ctx, 18, 1, 5, 2, C.STEEL_DK);
      px(ctx, 22, 1, 2, 6, C.STEEL_MD);
      break;
    }

    // ------------------------------------------------------------------------
    // 12. GOLD BARRETT (.50 黄金巴雷特反器材狙击枪)
    // ------------------------------------------------------------------------
    case "gold_barrett": {
      // Golden Heavy Stock
      pxShaded(ctx, -17, -3, 11, 6, C.GOLD_HI, C.GOLD_MD, C.GOLD_DK);
      px(ctx, -17, -3.5, 2, 7, C.BLACK_DK); // Rubber recoil pad
      // Massive Golden Receiver
      pxShaded(ctx, -6, -5, 16, 7.5, C.GOLD_HI, C.GOLD_MD, C.GOLD_DK);
      px(ctx, -4, 2.5, 4, 6, C.BLACK_DK); // Grip
      pxShaded(ctx, 1, 2.5, 6, 8, C.BLACK_MD, C.BLACK_DK, C.BLACK_DK); // Huge .50 BMG mag
      // Monster Sniper Scope
      pxShaded(ctx, -5, -9.5, 16, 4, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, -6, -10, 2, 5, C.GOLD_MD);
      px(ctx, 9, -10.5, 3, 6, C.GOLD_MD);
      pxGlowCore(ctx, 10, -8.5, 2, 2, "#ffffff", C.GOLD_LT);
      // Long Heavy Barrel & Arrowhead Muzzle Brake
      pxShaded(ctx, 10, -2.5, 22, 3.5, C.GOLD_HI, C.GOLD_MD, C.GOLD_DK);
      px(ctx, 31, -4.5, 5, 7.5, C.BLACK_DK); // Giant .50 brake
      px(ctx, 32, -3.5, 3, 2, C.GOLD_HI, "");
      px(ctx, 32, 0.5, 3, 2, C.GOLD_HI, "");
      break;
    }

    // ------------------------------------------------------------------------
    // 13. SHAK-50 (重突击步枪 / 俄罗斯重型大口径步枪)
    // ------------------------------------------------------------------------
    case "shak50": {
      // Massive Bullpup Chassis
      pxShaded(ctx, -14, -4.5, 14, 8, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      pxShaded(ctx, -10, 3.5, 5, 8, C.STEEL_MD, C.STEEL_DK, C.BLACK_DK); // Rear mag
      px(ctx, -2, 2, 4, 5, C.BLACK_DK); // Forward grip
      // Upper Picatinny Bridge & Sight
      px(ctx, -10, -6.5, 18, 2, C.BLACK_DK);
      px(ctx, -2, -8.5, 6, 2.5, C.BLACK_MD);
      pxGlowCore(ctx, 0, -7.5, 2, 1, "#ffffff", glow);
      // Giant Cylindrical Suppressor
      pxShaded(ctx, 0, -3.5, 18, 5.5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      px(ctx, 4, -3.5, 1, 5.5, C.STEEL_MD, "");
      px(ctx, 9, -3.5, 1, 5.5, C.STEEL_MD, "");
      px(ctx, 14, -3.5, 1, 5.5, C.STEEL_MD, "");
      break;
    }

    // ------------------------------------------------------------------------
    // 14. GATLING / MINIGUN (加特林机枪)
    // ------------------------------------------------------------------------
    case "gatling": {
      // Motor housing & spade grip
      pxShaded(ctx, -12, -5.5, 13, 11, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, -16, -2, 5, 4, C.BLACK_DK); // Rear grip
      px(ctx, -8, -8, 6, 2.5, C.BLACK_DK); // Top handle
      // Golden Ammo Link Belt
      px(ctx, -7, 5.5, 3, 2, C.GOLD_HI);
      px(ctx, -5, 7.5, 3, 2, C.GOLD_MD);
      px(ctx, -3, 9.5, 3, 2, C.GOLD_DK);
      // Rotating 6-Barrel Cluster
      ctx.save();
      ctx.translate(1, 0);
      ctx.rotate(t * 14);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const by = Math.sin(a) * 4;
        pxShaded(ctx, 0, by - 1.2, 18, 2.4, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      }
      ctx.restore();
      // Barrel Clamp Rings
      px(ctx, 7, -5.5, 2, 11, C.BLACK_DK);
      px(ctx, 16, -5.5, 2, 11, C.BLACK_DK);
      break;
    }

    // ------------------------------------------------------------------------
    // 15. LEWIS GUN (路易斯机枪 - 顶部圆盘弹鼓)
    // ------------------------------------------------------------------------
    case "lewis": {
      // Wood Stock
      pxShaded(ctx, -15, -2, 9, 5.5, C.WOOD_HI, C.WOOD_MD, C.WOOD_DK);
      // Receiver
      pxShaded(ctx, -6, -4, 13, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -4, 2, 3.5, 5, C.WOOD_MD);
      // Iconic Top Flat Pan Drum Magazine
      pxShaded(ctx, -3, -8.5, 11, 4.5, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 2, -7, 2, 2, C.STEEL_HI);
      // Thick Aluminum Cooling Shroud
      pxShaded(ctx, 7, -3.5, 15, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 9, -3.5, 1, 6, C.STEEL_DP, "");
      px(ctx, 13, -3.5, 1, 6, C.STEEL_DP, "");
      px(ctx, 17, -3.5, 1, 6, C.STEEL_DP, "");
      px(ctx, 21, -4.5, 2, 2, C.STEEL_HI); // Front sight
      break;
    }

    // ------------------------------------------------------------------------
    // 16. MORTAR / MGL32 (榴弹炮与转轮发射器)
    // ------------------------------------------------------------------------
    case "mortar":
    case "mgl32": {
      // Stock & Receiver
      pxShaded(ctx, -12, -2.5, 7, 5, C.BLACK_HI, C.BLACK_MD, C.BLACK_DK);
      pxShaded(ctx, -5, -4, 10, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -3, 2, 3.5, 5, C.BLACK_DK);
      // 6-Round Revolving Cylinder
      pxShaded(ctx, 1, -6, 9, 12, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 3, -4, 2.5, 2.5, C.BLACK_DK);
      px(ctx, 3, 1.5, 2.5, 2.5, C.BLACK_DK);
      px(ctx, 6, -1.5, 2.5, 2.5, C.BLACK_DK);
      // Wide Launcher Barrel with Yellow Hazard Warning Stripes
      pxShaded(ctx, 10, -4.5, 12, 9, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 12, -4.5, 2, 9, C.GOLD_HI, ""); // Yellow hazard stripe
      px(ctx, 16, -4.5, 2, 9, C.GOLD_HI, ""); // Yellow hazard stripe
      px(ctx, 21, -5.5, 2, 11, C.BLACK_DK); // Flared muzzle ring
      break;
    }

    // ------------------------------------------------------------------------
    // 17. ROCKET LAUNCHER (RPG 肩射火箭筒)
    // ------------------------------------------------------------------------
    case "rocket": {
      // Olive Green Launcher Tube
      pxShaded(ctx, -14, -5, 24, 10, C.GREEN_HI, C.GREEN_MD, C.GREEN_DK);
      px(ctx, -14, -6, 3, 12, C.BLACK_DK); // Rear bell
      px(ctx, -1, 5, 3.5, 5, C.WOOD_MD); // Grip
      px(ctx, 6, 5, 3.5, 5, C.WOOD_MD); // Foregrip
      // Optical Sight
      px(ctx, 2, -7.5, 5, 2.5, C.STEEL_DK);
      pxGlowCore(ctx, 5, -6.5, 1.5, 1.5, "#ffffff", glow);
      // Exposed Warhead at Muzzle Tip
      pxShaded(ctx, 10, -4, 5, 8, C.BLACK_MD, C.BLACK_DK, C.BLACK_DK);
      // Warhead cone
      ctx.fillStyle = C.GREEN_MD;
      ctx.beginPath();
      ctx.moveTo(15, -6);
      ctx.lineTo(24, 0);
      ctx.lineTo(15, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      pxGlowCore(ctx, 22, -1, 2, 2, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 18. PULSE / CYBER ENERGY BLASTER (赛博能量脉冲枪 - 如参考图左下)
    // ------------------------------------------------------------------------
    case "pulse": {
      // Futuristic Sky-Blue Plated Chassis
      pxShaded(ctx, -14, -4.5, 24, 10, C.CYAN_LT, C.CYAN_MD, C.CYAN_DK);
      // Thumbhole stock cutout
      px(ctx, -10, 0, 5, 3, C.DARK_BG, "");
      px(ctx, 2, 1, 4, 3, C.DARK_BG, ""); // Trigger gap
      // Glowing Purple Energy Core in glass chamber (as shown in reference image 1)
      pxGlowCore(ctx, -2, -3.5, 7, 5, C.PURPLE_CORE, C.PURPLE_MD);
      px(ctx, -2, -3.5, 7, 5, "", C.CYAN_DK);
      // Stepped Cooling Fins & Barrel Emitter
      pxShaded(ctx, 10, -3.5, 10, 7, C.CYAN_LT, C.CYAN_MD, C.CYAN_DK);
      pxGlowCore(ctx, 12, -2, 6, 1.5, "#ffffff", C.CYAN_MD);
      pxGlowCore(ctx, 12, 1, 6, 1.5, "#ffffff", C.CYAN_MD);
      // Muzzle focus ring
      px(ctx, 19, -4.5, 2.5, 9, C.STEEL_HI);
      break;
    }

    // ------------------------------------------------------------------------
    // 19. PLASMA REPEATER / CANNON (电浆连发重炮 - 如参考图左上)
    // ------------------------------------------------------------------------
    case "plasma_repeater":
    case "plasma_rifle": {
      // Chunky Orange/Red Armor Shell
      pxShaded(ctx, -14, -5.5, 22, 11, C.FIRE_LT, C.FIRE_MD, C.FIRE_DK);
      px(ctx, -8, 2, 4, 6, C.BLACK_DK); // Pistol grip
      // Multiple Glowing Amber/Yellow Energy Windows (as in reference image 1)
      pxGlowCore(ctx, -6, -4, 4, 4, C.FIRE_CORE, C.FIRE_LT);
      pxGlowCore(ctx, 0, -4.5, 6, 5.5, C.FIRE_CORE, C.FIRE_LT);
      // Lower Heat Sink Grate
      px(ctx, -2, 2.5, 8, 2.5, C.FIRE_DP);
      px(ctx, 0, 2.5, 1, 2.5, C.FIRE_LT, "");
      px(ctx, 3, 2.5, 1, 2.5, C.FIRE_LT, "");
      // Stepped Triple Projector Muzzle
      pxShaded(ctx, 8, -4.5, 8, 9, C.FIRE_LT, C.FIRE_MD, C.FIRE_DK);
      pxGlowCore(ctx, 13, -2, 5, 4, C.FIRE_CORE, C.FIRE_LT);
      break;
    }

    // ------------------------------------------------------------------------
    // 20. RAILGUN (电磁轨道炮)
    // ------------------------------------------------------------------------
    case "railgun": {
      // Heavy Chassis
      pxShaded(ctx, -12, -4.5, 14, 9, C.STEEL_HI, C.STEEL_MD, C.BLACK_DK);
      px(ctx, -5, 2, 4, 5, C.BLACK_DK);
      // Twin Parallel Rail Accelerators
      pxShaded(ctx, 2, -4.5, 20, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      pxShaded(ctx, 2, 2, 20, 2.5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      // Glowing Central Energy Channel
      pxGlowCore(ctx, 4, -1, 16, 2, "#ffffff", glow);
      // Capacitor Blocks
      px(ctx, 6, -5.5, 3, 11, C.CYAN_DK);
      px(ctx, 13, -5.5, 3, 11, C.CYAN_DK);
      break;
    }

    // ------------------------------------------------------------------------
    // 21. FLAMETHROWER (重型喷火器)
    // ------------------------------------------------------------------------
    case "flamethrower": {
      // Receiver & Handle
      pxShaded(ctx, -8, -4, 12, 8, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -11, -1, 4, 4, C.BLACK_DK);
      // Red Gas Pressure Cylinder under barrel
      pxShaded(ctx, -3, 3, 11, 6, C.FIRE_LT, C.FIRE_DK, C.FIRE_DP);
      px(ctx, -3, 3, 1.5, 6, C.GOLD_MD); // Brass clamp
      px(ctx, 6, 3, 1.5, 6, C.GOLD_MD); // Brass clamp
      // Nozzle & Pilot Flame
      pxShaded(ctx, 4, -3, 12, 6, C.STEEL_MD, C.STEEL_DK, C.STEEL_DP);
      px(ctx, 14, -4, 2, 8, C.BLACK_DK);
      pxGlowCore(ctx, 16, -1.5, 4, 3, C.FIRE_CORE, C.FIRE_MD);
      break;
    }

    // ------------------------------------------------------------------------
    // 22. POISON MIST / CHEMICAL SPRAYER (生化毒雾枪)
    // ------------------------------------------------------------------------
    case "poison_mist":
    case "chemical_sprayer": {
      pxShaded(ctx, -8, -4, 12, 8, C.STEEL_MD, C.STEEL_DK, C.BLACK_DK);
      // Dual Glowing Toxic Green Chemical Vials
      pxGlowCore(ctx, -4, -7.5, 4, 4, C.BIO_CORE, C.BIO_MD);
      pxGlowCore(ctx, 1, -7.5, 4, 4, C.BIO_CORE, C.BIO_MD);
      // Brass Pressure Gauge
      px(ctx, -5, -4, 3, 3, C.GOLD_HI);
      // Conical Mist Dispersion Nozzle
      pxShaded(ctx, 4, -3.5, 10, 7, C.STEEL_HI, C.STEEL_MD, C.STEEL_DK);
      px(ctx, 12, -5, 3, 10, C.BIO_DK);
      break;
    }

    // ------------------------------------------------------------------------
    // 23. DRAGON'S BREATH (龙息霰弹枪)
    // ------------------------------------------------------------------------
    case "dragon_breath": {
      pxShaded(ctx, -14, -2.5, 9, 5.5, C.WOOD_MD, C.WOOD_DK, C.WOOD_DP);
      pxShaded(ctx, -5, -4.5, 12, 8, C.GOLD_MD, C.GOLD_DK, C.GOLD_DP);
      // Dragon Horn Front Sight
      px(ctx, 18, -6, 3, 4, C.FIRE_MD);
      // Glowing Fire Vents along Barrel
      pxShaded(ctx, 7, -3.5, 13, 5, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      pxGlowCore(ctx, 9, -2, 2, 2, C.FIRE_CORE, C.FIRE_MD);
      pxGlowCore(ctx, 13, -2, 2, 2, C.FIRE_CORE, C.FIRE_MD);
      break;
    }

    // ------------------------------------------------------------------------
    // 24. RECURVE BOW (复合反曲弓)
    // ------------------------------------------------------------------------
    case "recurve_bow": {
      const pull = swing * 6;
      // Riser grip
      px(ctx, -2, -3, 4, 6, C.BLACK_DK);
      // Limbs
      ctx.strokeStyle = C.BLACK_MD;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(8 - pull * 0.2, -14);
      ctx.lineTo(2 - pull * 0.5, -24);
      ctx.moveTo(0, 3);
      ctx.lineTo(8 - pull * 0.2, 14);
      ctx.lineTo(2 - pull * 0.5, 24);
      ctx.stroke();
      // Bowstring
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2 - pull * 0.5, -24);
      ctx.lineTo(-pull, 0);
      ctx.lineTo(2 - pull * 0.5, 24);
      ctx.stroke();
      // Arrow
      px(ctx, -pull, -0.5, 18, 1.5, C.WOOD_HI);
      pxGlowCore(ctx, 18 - pull, -2, 4, 4, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 25. THRUST SWORD / RAPIER (突刺细剑 / 圣剑 - 如参考图)
    // ------------------------------------------------------------------------
    case "thrust_sword": {
      const len = (gun.meleeRange ?? 88) * 0.85;
      // Golden Cup Guard & Pommel
      px(ctx, -12, -2.5, 2.5, 5, C.GOLD_HI); // Pommel
      px(ctx, -10, -1.8, 6, 3.6, C.WOOD_DK); // Leather grip wrap
      px(ctx, -4, -6, 3, 12, C.GOLD_HI); // Swept basket guard
      // Slender Tempered Steel Blade with central fuller reflection
      pxShaded(ctx, -1, -2, len, 4, C.STEEL_HI, C.STEEL_LT, C.STEEL_MD);
      px(ctx, len - 1, -1, 3, 2, C.STEEL_HI); // Needle point
      pxGlowCore(ctx, 2, -0.5, len - 6, 1, "#ffffff", glow); // Fuller line
      break;
    }

    // ------------------------------------------------------------------------
    // 26. LIGHTSABER (激光剑)
    // ------------------------------------------------------------------------
    case "lightsaber": {
      const bladeLen = (gun.meleeRange ?? 60) * 0.72;
      // Machined Aluminum Hilt
      pxShaded(ctx, -9, -3, 15, 6, C.STEEL_HI, C.STEEL_MD, C.BLACK_DK);
      px(ctx, -7, -2.5, 2, 5, C.BLACK_DK, "");
      px(ctx, -3, -2.5, 2, 5, C.BLACK_DK, "");
      px(ctx, 1, -2.5, 2, 5, C.BLACK_DK, "");
      px(ctx, -5, -4, 1.5, 1.5, "#ef4444"); // Red activation button
      // Glowing Plasma Blade
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const flick = 1 + Math.sin(t * 30) * 0.05;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 8 * flick;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6 + bladeLen, 0); ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3 * flick;
      ctx.stroke();
      ctx.restore();
      break;
    }

    // ------------------------------------------------------------------------
    // 27. HAMMER (雷神之锤)
    // ------------------------------------------------------------------------
    case "hammer": {
      // Wood shaft handle with steel caps
      pxShaded(ctx, -2, -2, 22, 4, C.WOOD_MD, C.WOOD_DK, C.WOOD_DP);
      px(ctx, -4, -2.5, 2.5, 5, C.STEEL_HI); // Pommel ring
      // Massive Forged Runic War Hammer Head
      pxShaded(ctx, 18, -9, 14, 18, C.STEEL_HI, C.STEEL_MD, C.BLACK_DK);
      pxGlowCore(ctx, 23, -3, 4, 6, "#ffffff", glow); // Lightning rune
      break;
    }

    // ------------------------------------------------------------------------
    // 28. SPEAR (战术长矛)
    // ------------------------------------------------------------------------
    case "spear": {
      const len = (gun.meleeRange ?? 90) * 0.9;
      px(ctx, -6, -1.5, len - 12, 3, C.WOOD_DK);
      px(ctx, 10, -2, 6, 4, "#dc2626"); // Red grip wrap
      px(ctx, 30, -2, 6, 4, "#dc2626"); // Red grip wrap
      // Winged Spearhead
      ctx.fillStyle = C.STEEL_HI;
      ctx.beginPath();
      ctx.moveTo(len - 14, -5);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      pxGlowCore(ctx, len - 4, -1, 2, 2, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 29. DUAL BLADES (双刃弯刀)
    // ------------------------------------------------------------------------
    case "dual_blades": {
      const len = (gun.meleeRange ?? 78) * 0.52;
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.rotate(dir * 0.55);
        px(ctx, -4, -2, 6, 4, C.BLACK_DK);
        px(ctx, -5, -3, 1.5, 6, C.GOLD_MD);
        ctx.strokeStyle = C.STEEL_HI;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.quadraticCurveTo(len * 0.6, dir * -len * 0.2, len, dir * -len * 0.05);
        ctx.stroke();
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = glow;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        ctx.restore();
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 30. COMBAT KNIFE / THROWING KNIFE (战术格斗匕首 - 如参考图)
    // ------------------------------------------------------------------------
    case "knife":
    case "throwing_knife": {
      pxShaded(ctx, -8, -2, 6, 4, C.BLACK_MD, C.BLACK_DK, C.BLACK_DK); // Ribbed grip
      px(ctx, -2, -3.5, 2, 7, C.STEEL_MD); // Guard
      // Bowie Blade with Sawback
      ctx.fillStyle = C.STEEL_HI;
      ctx.beginPath();
      ctx.moveTo(0, -2.5);
      ctx.lineTo(12, -2.5);
      ctx.lineTo(16, 0);
      ctx.lineTo(11, 2.5);
      ctx.lineTo(0, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.OUTLINE;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      px(ctx, 3, -2.5, 1, 1, C.STEEL_DP, ""); // Sawback serrations
      px(ctx, 6, -2.5, 1, 1, C.STEEL_DP, "");
      px(ctx, 9, -2.5, 1, 1, C.STEEL_DP, "");
      break;
    }

    // ------------------------------------------------------------------------
    // 31. SHURIKEN (忍者手里剑)
    // ------------------------------------------------------------------------
    case "shuriken": {
      ctx.save();
      ctx.rotate(t * 12);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = C.STEEL_HI;
        ctx.beginPath();
        ctx.moveTo(-3, -3);
        ctx.lineTo(0, -10);
        ctx.lineTo(3, -3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C.OUTLINE;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      px(ctx, -2.5, -2.5, 5, 5, C.STEEL_DP);
      px(ctx, -1, -1, 2, 2, C.DARK_BG, ""); // Center hole
      ctx.restore();
      break;
    }

    // ------------------------------------------------------------------------
    // 32. FLAME BOOMERANG (火焰回旋镖)
    // ------------------------------------------------------------------------
    case "boomerang":
    case "flame_boomerang": {
      ctx.save();
      ctx.rotate(t * 10);
      ctx.strokeStyle = C.WOOD_MD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-9, 7);
      ctx.quadraticCurveTo(0, -9, 9, 7);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      break;
    }

    // ------------------------------------------------------------------------
    // 33. GREATSWORD (破阵大剑)
    // ------------------------------------------------------------------------
    case "sword": {
      const len = (gun.meleeRange ?? 55) * 0.9;
      px(ctx, -10, -2, 7, 4, C.WOOD_DK);
      px(ctx, -12, -2.5, 2.5, 5, C.GOLD_MD); // Pommel
      px(ctx, -3, -6, 3, 12, C.STEEL_HI); // Broad crossguard
      pxShaded(ctx, 0, -3.5, len, 7, C.STEEL_HI, C.STEEL_LT, C.STEEL_DK);
      px(ctx, len, -1.5, 3, 3, C.STEEL_HI);
      break;
    }

    // ------------------------------------------------------------------------
    // 34. CHAINSAW (动力电锯)
    // ------------------------------------------------------------------------
    case "chainsaw": {
      // Motor Body
      pxShaded(ctx, -10, -5, 12, 10, "#ea580c", "#c2410c", "#9a3412");
      px(ctx, -13, -2, 4, 4, C.BLACK_DK);
      // Guide Bar
      pxShaded(ctx, 2, -3, 16, 6, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      // Moving Saw Teeth
      const shift = (t * 40) % 4;
      for (let i = 0; i < 14; i += 4) {
        px(ctx, 3 + i + shift, -4.5, 2, 1.5, C.STEEL_HI);
        px(ctx, 3 + i + shift, 3, 2, 1.5, C.STEEL_HI);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // 35. BALLISTIC RIOT SHIELD (防暴重盾)
    // ------------------------------------------------------------------------
    case "riot_shield": {
      pxShaded(ctx, -4, -15, 15, 30, "#1e3a8a", "#1d4ed8", "#172554");
      px(ctx, -4, -15, 15, 30, "", "#3b82f6");
      // Bulletproof Glass Visor
      pxGlowCore(ctx, 1, -4, 8, 8, "#ffffff", "#38bdf8");
      break;
    }

    // ------------------------------------------------------------------------
    // 36. AUTONOMOUS COMBAT DRONE (浮游飞炮)
    // ------------------------------------------------------------------------
    case "drone": {
      pxShaded(ctx, -6, -6, 12, 12, C.STEEL_MD, C.STEEL_DK, C.BLACK_DK);
      // Thruster wings
      px(ctx, -8, -10, 4, 4, C.BLACK_DK);
      px(ctx, -8, 6, 4, 4, C.BLACK_DK);
      // Visor Eye
      pxGlowCore(ctx, 1, -2, 5, 4, "#ffffff", glow);
      break;
    }

    // ------------------------------------------------------------------------
    // 37. LIGHTNING WHIP (闪电能量鞭)
    // ------------------------------------------------------------------------
    case "lightning_whip": {
      pxShaded(ctx, -8, -2, 10, 4, C.WOOD_MD, C.WOOD_DK, C.WOOD_DP);
      px(ctx, 2, -2.5, 2.5, 5, C.GOLD_MD);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const len = (gun.meleeRange ?? 90) * 0.95;
      const flick = 1 + Math.sin(t * 24) * 0.15;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2.4 * flick;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      for (let i = 1; i <= 6; i++) {
        const f = i / 6;
        const nx = 4 + len * f;
        const ny = (Math.sin(f * Math.PI * 3 + t * 9) * (8 * (1 - f)) + (Math.random() - 0.5) * 3) * flick;
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();
      ctx.restore();
      break;
    }

    // ------------------------------------------------------------------------
    // Default fallback: heavy tactical weapon
    // ------------------------------------------------------------------------
    default: {
      const bLen = gun.barrel ?? 16;
      pxShaded(ctx, -8, -4, bLen + 8, 8, C.STEEL_HI, C.STEEL_MD, C.STEEL_DP);
      px(ctx, -4, 2, 4, 5, C.BLACK_DK);
      pxGlowCore(ctx, bLen - 2, -1, 3, 2, "#ffffff", glow);
      break;
    }
  }

  ctx.restore();
}

// ============================================================================
// UI & HUD Weapon Model / Icon Renderer
// (Centers, scales and renders the full pixel art weapon onto any size canvas)
// ============================================================================

export function drawPixelWeaponIcon(
  ctx: CanvasRenderingContext2D,
  iconShape: string,
  cx: number,
  cy: number,
  size: number,
  glow: string,
  gun?: GunDef
) {
  if (!ctx) return;
  ctx.save();
  ctx.translate(cx, cy);

  // Normalize scale: weapon lengths range ~25-35px, standard icon canvas is `size`
  const targetScale = (size * 0.9) / 36;
  ctx.scale(targetScale, targetScale);

  // Offset centering: grip is at (0,0), barrel points along +x (avg center around x=3, y=0)
  ctx.translate(-2, 0);

  const fallbackGun: GunDef = gun || ({
    id: iconShape,
    name: iconShape,
    desc: "",
    weaponClass: "ranged",
    shape: iconShape,
    iconShape: iconShape,
    damage: 20,
    fireRate: 10,
    bulletSpeed: 2000,
    bulletSize: 5,
    spread: 0.05,
    pellets: 1,
    pierce: 0,
    life: 1,
    knockback: 100,
    color: "#ffffff",
    glow: glow || "#38bdf8",
    kind: "bullet",
    barrel: 18,
  } as GunDef);

  drawPixelWeapon(ctx, fallbackGun, glow || fallbackGun.glow || "#38bdf8", 0, 0);

  ctx.restore();
}
