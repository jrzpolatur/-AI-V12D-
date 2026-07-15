// Core type definitions for the 2D shooter prototype.

export interface Vec2 {
  x: number;
  y: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  /** base body / silhouette tint */
  bodyColor: string;
  /** secondary accent color */
  accent: string;
  /** skin tone for the head */
  skin: string;
  /** movement speed in px/second */
  speed: number;
  maxHp: number;
  damageMult: number;
  fireRateMult: number;
  /** collision radius */
  size: number;
  perk: string;
  desc: string;
}

export type HatType = "none" | "cap" | "helmet" | "hood" | "visor";

export interface OutfitDef {
  id: string;
  name: string;
  /** main suit color */
  suit: string;
  /** darker shade for outline / depth */
  suitDark: string;
  accent: string;
  hat: HatType;
  perk: string;
  speedBonus: number;
  hpBonus: number;
  fireRateBonus?: number;
}

export type ProjectileKind =
  | "bullet"
  | "rocket"
  | "pellet"
  | "tracer"
  | "flame"
  | "ion"
  | "grenade";

export type WeaponClass = "ranged" | "melee" | "beam" | "flamethrower" | "sentry" | "bow" | "shield";

export interface GunDef {
  id: string;
  name: string;
  desc: string;
  weaponClass: WeaponClass;
  /** drawing key */
  shape: string;
  damage: number;
  /** shots per second (ranged) or swings per second (melee) */
  fireRate: number;
  bulletSpeed: number;
  bulletSize: number;
  /** spread in radians */
  spread: number;
  pellets: number;
  pierce: number;
  /** bullet lifetime in seconds */
  life: number;
  knockback: number;
  color: string;
  glow: string;
  explosive?: boolean;
  explosionRadius?: number;
  kind: ProjectileKind;
  /** if true, one shot per trigger pull (requires mouse release between shots) */
  semiAuto?: boolean;
  /** visual barrel length */
  barrel: number;
  /** icon shape key used by drawWeaponIcon (vector silhouette) */
  iconShape: string;

  // ---- magazine / reload system (ranged) ----
  magazine?: number;
  reloadTime?: number;

  // ---- beam / overheat system (pulse) ----
  beamRange?: number;
  /** heat added per second of firing */
  heatPerShot?: number;
  /** heat removed per second */
  coolRate?: number;

  // ---- melee system ----
  meleeRange?: number;
  /** sweep arc in radians */
  meleeArc?: number;
  /** heavy ground-slam damage (hammer right-click) */
  slamDamage?: number;

  // ---- flamethrower system ----
  /** flame cone half-angle in radians */
  flameCone?: number;
  /** flame reach in px */
  flameRange?: number;

  // ---- bouncy projectiles (MGL32 / ion) ----
  /** number of bounces before disappearing/exploding */
  bounces?: number;
  /** whether projectile ignores walls (ion drifts through) */
  ignoreWalls?: boolean;

  // ---- combo melee (spear) ----
  /** combo chain length for spear */
  comboLength?: number;

  // ---- range tier label for display ----
  rangeTier?: "近" | "中" | "远";

  // ---- bow system (recurve bow) ----
  /** max charge time in seconds */
  maxChargeTime?: number;
  /** damage multiplier at zero charge (0..1) */
  minChargeMult?: number;
  /** damage multiplier at full charge (1+) */
  maxChargeMult?: number;
  /** bullet speed multiplier at full charge */
  maxChargeSpeedMult?: number;
  /** movement speed multiplier while drawing */
  drawSlowMult?: number;

  // ---- shield system (riot shield) ----
  /** shield HP (absorbs bullets) */
  shieldHp?: number;
  /** max shield HP */
  shieldMaxHp?: number;
  /** shield block arc in radians (half-angle) */
  shieldArc?: number;
  /** shield duration in seconds when raised */
  shieldDuration?: number;
  /** shield recharge cooldown after breaking */
  shieldRechargeTime?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  cooldown: number;
  duration: number;
  color: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// GADGETS — deployable items with cooldowns, activated via number-row / wheel.
// ---------------------------------------------------------------------------
export type GadgetKind =
  | "turret_mg"
  | "turret_cannon"
  | "mine_explosive"
  | "mine_poison"
  | "mine_fire"
  | "glue_grenade"
  | "healing_station";

export interface GadgetDef {
  id: string;
  kind: GadgetKind;
  name: string;
  desc: string;
  /** cooldown in seconds */
  cooldown: number;
  /** icon shape key for vector silhouette */
  iconShape: string;
  color: string;
  /** max simultaneous deployed instances */
  maxStack?: number;
  /** deployable max HP (turrets / healing station). 0 / undefined = built-in default. */
  hp?: number;
}
