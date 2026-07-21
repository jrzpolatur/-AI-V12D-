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

export type HatType =
  | "none"
  | "cap"
  | "helmet"
  | "hood"
  | "visor"
  | "alien"
  | "monkey"
  | "tycoon";

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
  /** optional skin tone override (used by the alien / monkey skins) */
  skin?: string;
}

export type ProjectileKind =
  | "bullet"
  | "rocket"
  | "pellet"
  | "tracer"
  | "flame"
  | "ion"
  | "grenade";

export type WeaponClass =
  | "ranged"
  | "melee"
  | "beam"
  | "flamethrower"
  | "poison_mist"
  | "sentry"
  | "bow"
  | "shield";

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
  /** side-by-side parallel shot count (e.g. 2 = twin barrels). Shots spawn
   *  parallel to the aim line and drift apart over flight (see `drift`).
   *  Only used when > 1; otherwise the normal `spread` fan logic applies. */
  parallel?: number;
  /** initial sideways gap between parallel shots (px) */
  parallelGap?: number;
  /** sideways drift speed applied to each parallel shot so they fan out (px/s) */
  drift?: number;
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

  // ---- dual blades (双刃) combo + reflect ----
  /** per-step damage for a combo weapon, e.g. dual blades [55,55,70,70,200] */
  comboDamage?: number[];
  /** reflect enemy bullets within this range while blades are raised (right-click held) */
  reflectRange?: number;
  /** fraction of a reflected bullet's damage the blademaster still takes (e.g. 0.05) */
  reflectSelfDamage?: number;

  // ---- thrust longsword (突刺长剑) charge dash ----
  /** minimum charge time (seconds) before the dash can release */
  chargeMin?: number;
  /** damage dealt to enemies inside the dash corridor */
  chargeDashDamage?: number;
  /** dash distance in px (released after charge) */
  chargeDashDist?: number;
  /** half-width of the dash hit corridor in px */
  chargeDashRange?: number;

  // ---- lightning whip (闪电鞭) ----
  /** if true, the melee swing alternates left/right and slows hit enemies */
  whip?: boolean;
  /** slow duration (seconds) applied to enemies/opponents on a whip hit */
  slowOnHit?: number;

  // ---- range tier label for display ----
  rangeTier?: "近" | "中" | "远";

  // ---- aim indicator (投射榴弹炮) ----
  /** if true, draw a deployable-style targeting marker while this gun is active */
  aimIndicator?: boolean;
  /** max lob / throw range in px (mortar, etc.); falls back to bulletSpeed*life when absent */
  range?: number;

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

  // ---- gatling / spin-up system ----
  /** seconds of continuous fire to reach full fire rate (spool-up) */
  spinup?: number;
  /** seconds to spin back down to zero when not firing */
  spinDown?: number;
  /** damage multiplier at zero spin (ramps to 1 at full spin) */
  spinMinMult?: number;

  // ---- burst fire (e.g. plasma rifle 3-round burst) ----
  /** rounds fired per trigger pull (semi-auto fires the whole burst at once) */
  burst?: number;
  /** angular spread between burst rounds in radians */
  burstSpread?: number;

  // ---- wall piercing (e.g. plasma rifle) ----
  /** 0..1 chance each individual bullet ignores walls (passes through) */
  wallPierceChance?: number;
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
  | "fire_grenade"
  | "poison_grenade"
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
  /** max placement/throw distance from the player (px). Defaults per kind. */
  range?: number;
}

// ---------------------------------------------------------------------------
// MONSTERS — biohazard (生化危机) PvE bestiary. The "old" human-enemy system
// is kept for the defend-base mode; this is the dedicated zombie/creature
// roster used by the biohazard single-player mode.
// ---------------------------------------------------------------------------
export type MonsterBehavior =
  | "walker" // 行尸 — slow melee grunt
  | "runner" // 奔尸 — fast melee, periodic lunge
  | "brute" // 巨尸 — huge HP, very slow, heavy hit
  | "spitter" // 吐酸者 — ranged poison spit
  | "abomination" // 母体 — boss, slam AOE + death blast
  | "crawler" // 爬虫 — tiny, very fast swarmer
  | "bloater" // 毒爆体 — bursts into a poison cloud on death
  | "screamer" // 尖啸者 — buffs nearby monsters, staggers player
  | "spore"; // 孢子怪 — emits lingering poison clouds

export interface MonsterDef {
  id: string;
  name: string;
  behavior: MonsterBehavior;
  desc: string;
  hp: number;
  speed: number;
  damage: number;
  size: number;
  color: string;
  glow: string;
  score: number;
  ranged?: boolean;
  /** spit range / damage for spitter */
  rangedRange?: number;
  rangedDamage?: number;
  /** bloater death explosion */
  explodeRadius?: number;
  explodeDamage?: number;
  /** screamer buff radius */
  buffRadius?: number;
  /** spore cloud radius / damage */
  cloudRadius?: number;
  cloudDamage?: number;
  /** relative spawn weight (scaled by wave) */
  weight?: number;
  /** earliest wave this monster can appear */
  minWave?: number;
}
