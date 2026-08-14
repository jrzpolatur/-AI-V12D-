import { GUNS, GADGETS, MONSTERS, getCharacter, getOutfit, getSkill, SCENES, CHARACTERS, OUTFITS, SKILLS } from "./content";
import type { GunDef, SkillDef, WeaponClass, GadgetDef, GadgetKind, CharacterDef, OutfitDef } from "./types";
import { drawCharacter, drawMonster, rgba, shade, roundRect, DARK, drawGadgetIcon, drawGadgetModel } from "./draw";
import {
  drawPixelBamboo,
  drawPixelSakuraTree,
  drawPixelPineTree,
  drawPixelLushTree,
  drawPixelBushWithFlowers,
  drawPixelParkBench,
  drawPixelPicnicTable,
  drawPixelStreetLantern,
  drawPixelPond,
  drawPixelStoneRuins,
  drawPixelCabinShop,
  drawPixelCritters,
  drawPixelSnowDrift,
  drawPixelRailwayTrack,
  drawPixelTrain,
  drawPixelMuzzleFlash,
  drawPixelSaloon,
  drawPixelCyberRooftop,
  drawPixelDesertFort,
  drawPixelWesternHouse,
  drawPixelCactus,
  drawPixelJungleTemple,
  drawPixelArcticBunker,
  drawPixelRuinFactory,
} from "./pixelSprites";
import { sound } from "./sound";
import { RUNTIME } from "./runtimeConfig";
// @ts-ignore
import AiWorker from './ai.worker.ts?worker&inline';
import type { NetMode, InputFrame, Snapshot, SnapPlayer, SnapEffect, SnapFeedEvent } from "../net/protocol";
import type { Net } from "../net/Net";

/** Coin-burst palettes keyed by kill style (drives ring tint + coin colors). */
const COIN_STYLE: Record<string, string[]> = {
  whip: ["#7dd3fc", "#e0f2fe", "#a5f3fc", "#fbbf24"],
  saber: ["#a5b4fc", "#c7d2fe", "#fde68a", "#ffffff"],
  explosive: ["#fb923c", "#fca5a5", "#fbbf24", "#fde68a"],
  fire: ["#fb923c", "#f97316", "#fde68a", "#fbbf24"],
  poison: ["#a3e635", "#84cc16", "#bef264", "#fde68a"],
  pierce: ["#fbbf24", "#fde68a", "#fcd34d"],
  rapid: ["#fde68a", "#fbbf24", "#fcd34d"],
  bullet: ["#fbbf24", "#fde68a"],
};

/** Map a weapon id to a coin-burst kill style. */
function killStyleOf(w: string): string {
  if (!w) return "bullet";
  if (w === "lightning_whip") return "whip";
  if (w === "lightsaber") return "saber";
  if (w === "rocket" || w === "mgl32" || w === "grenade" || w.startsWith("explosive") || w === "mortar") return "explosive";
  if (w === "flamethrower" || w === "fire_grenade" || w === "mine_fire") return "fire";
  if (w === "poison_mist" || w === "mine_poison") return "poison";
  if (w === "recurve_bow" || w === "drone" || w === "spear") return "pierce";
  if (
    w === "gatling" || w === "pulse" || w === "akm" || w === "fcar" ||
    w === "shak50" || w === "sa1216" || w === "mac11" || w === "mp5" || w === "silenced_pistol" ||
    w === "r357" || w === "gold_barrett"
  ) return "rapid";
  return "bullet";
}

/* ------------------------------------------------------------------ 8-bit
 * Retro pixel-art palette + lookup. We draw the whole world as usual, then
 * posterize every non-transparent pixel to the nearest entry in this small
 * palette (hard flat colour bands, no anti-aliased smearing). A prebuilt
 * 32x32x32 lookup table makes the per-pixel mapping a single array index, so
 * the pass is cheap even when run every frame on the (already downscaled)
 * backing buffer. */
const PIXEL_PALETTE: number[] = [
  0x000000, 0x111111, 0x222222, 0x333333, 0x444444, 0x555555,
  0x666666, 0x777777, 0x888888, 0x999999, 0xaaaaaa, 0xbbbbbb,
  0xcccccc, 0xdddddd, 0xeeeeee, 0xffffff,
  0x20204a, 0x30306a, 0x40408a, 0x5050aa, 0x7070ca, 0x9090ea,
  0x2a0f0a, 0x4a1f14, 0x6a301e, 0x8a4028, 0xaa5032, 0xca603c,
  0xb04028, 0xd8543a, 0xf06a48, 0xff8a62,
  0x0a2a0a, 0x1a4a1a, 0x2a6a2a, 0x3a8a3a, 0x4aaa4a, 0x6aca6a,
  0x0e2e0e, 0x1a5016, 0x2f7a1f, 0x4caf1c, 0x6bdc02, 0x8ffc3c,
  0x0a1a2a, 0x10304a, 0x16526a, 0x1c6e8a, 0x2686aa, 0x30a2ca,
  0x22d0f0, 0x58f0f0, 0x8af0f0,
  0x100a2a, 0x2a1450, 0x3c1f78, 0x4a2a96, 0x5a35b2, 0x7a55d2,
  0x9a5ee0, 0xba7ee8, 0xd0a0f0,
  0x2a2a0a, 0x4a4a14, 0x6a6a1e, 0x8a8a28, 0xaaaa32, 0xcaca3c,
  0xe8b020, 0xfea818, 0xfecc44, 0xfee876,
];

/** 32x32x32 (r>>3, g>>3, b>>3) -> nearest palette index. */
let PIXEL_LUT: Uint8Array | null = null;
function pixelLUT(): Uint8Array {
  if (PIXEL_LUT) return PIXEL_LUT;
  const lut = new Uint8Array(32 * 32 * 32);
  const pal = PIXEL_PALETTE;
  for (let rI = 0; rI < 32; rI++) {
    const r = rI * 8 + 4;
    for (let gI = 0; gI < 32; gI++) {
      const g = gI * 8 + 4;
      for (let bI = 0; bI < 32; bI++) {
        const b = bI * 8 + 4;
        let best = 0, bestD = Infinity;
        for (let k = 0; k < pal.length; k++) {
          const c = pal[k];
          const dr = r - ((c >> 16) & 255);
          const dg = g - ((c >> 8) & 255);
          const db = b - (c & 255);
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; best = k; }
        }
        lut[(rI << 10) | (gI << 5) | bI] = best;
      }
    }
  }
  PIXEL_LUT = lut;
  return lut;
}

export interface CustomMapConfig {
  /** Scene theme id: 'random' | 'neon' | 'desert' | 'arctic' | 'ruin' | 'cyber' | 'wild_west' | 'jungle' | 'arctic_zone' */
  themeId?: string;
  /** Layout pattern: 'default' | 'open' | 'maze' | 'fortress' | 'scattered' */
  layoutStyle?: "default" | "open" | "maze" | "fortress" | "scattered";
  /** Wall / cover density: 'sparse' | 'normal' | 'dense' */
  density?: "sparse" | "normal" | "dense";
  /** Train hazard enabled: 'auto' | 'always' | 'never' */
  trainMode?: "auto" | "always" | "never";
  /** Ambient decorations enabled */
  decorations?: boolean;
}

export interface Loadout {
  characterId: string;
  outfitId: string;
  gunId: string;
  gunIds: string[];
  skillId: string;
  /** carried gadgets (max 3). Empty -> first 3 GADGETS. */
  gadgetIds?: string[];
  /** single-player sub-mode: biohazard survival, or offline deathmatch
   *  (you + 3 AI bots, first to 15 kills wins) */
  gameMode?: "biohazard" | "deathmatch" | "team_deathmatch";
  /** number of players in deathmatch (4, 6, 8) */
  dmPlayerCount?: 4 | 6 | 8 | 10;
  /** manually selected weather system */
  weatherOverride?: string;
  /** custom map parameters (advanced settings) */
  customMap?: CustomMapConfig;
}

/** One row of the deathmatch / team-mode leaderboard. */
export interface DmEntry {
  id: number;
  name: string;
  kills: number;
  color: string;
  /** true for the local human player */
  you: boolean;
  /** currently downed (waiting to respawn) */
  dead: boolean;
  /** team id this combatant belongs to (team modes only) */
  teamId?: number;
  deaths?: number;
  score?: number;
}

export interface ActiveEffect {
  id: string;
  name: string;
  icon: string;
  color: string;
  time: number;
  duration: number;
}

export interface GadgetHud {
  id: string;
  kind: GadgetKind;
  name: string;
  iconShape: string;
  color: string;
  cooldownPct: number;
  ready: boolean;
  deployed: number;
  maxStack: number;
  /** true if this slot is currently selected (highlighted, awaiting left-click deploy) */
  selected: boolean;
}

export interface DamageEvent {
  id: number;
  timestamp: number;
  amount: number;
  weapon: string;
  targetName: string;
  sourceName: string;
  isDealtByMe: boolean;
}

export interface PlayerSummaryStat {
  id: number;
  name: string;
  isLocal: boolean;
  score: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  isMvp: boolean;
  color?: string;
  characterName?: string;
}

export interface HudState {
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  enemiesLeft: number;
  gunId: string;
  guns: { id: string; name: string; iconShape: string; weaponClass: WeaponClass }[];
  gunIndex: number;
  weaponClass: WeaponClass;
  ammo: number | null;
  magazine: number | null;
  reloading: boolean;
  reloadPct: number;
  heat: number;
  overheated: boolean;
  /** gatling spin-up 0..1 (0 = cold, 1 = full fire rate) */
  warmup: number;
  /** single-player sub-mode */
  mode: "biohazard" | "deathmatch" | "team_deathmatch";
  /** deathmatch leaderboard (4 combatants). Absent in other modes. */
  dm?: DmEntry[];
  /** kill target to win the deathmatch */
  dmTarget?: number;
  /** seconds left in a local deathmatch / team_deathmatch (null when no timer) */
  dmTimeLeft?: number | null;
  /** per-team scoreboard (team_deathmatch) */
  teamScores?: { teamId: number; name: string; color: string; kills: number; score: number; alive: number; members: number; isMine: boolean }[];
  skillId: string;
  skillName: string;
  skillIcon: string;
  skillCooldownPct: number;
  skillReady: boolean;
  /** dash charge segments (0..3) */
  dashCharges: number;
  maxDashCharges: number;
  dashChargePct: number;
  effects: ActiveEffect[];
  gadgets: GadgetHud[];
  baseHp: number;
  baseMaxHp: number;
  enemyBaseHp: number;
  enemyBaseMaxHp: number;
  gameOver: boolean;
  gameOverReason: string;
  paused: boolean;
  /** net: peer handshake not yet complete (waiting for opponent to connect/sync) */
  connecting: boolean;
  banner: string | null;
  kills: number;
  gold: number;
  activeScoreFeed: { totalScore: number; timer: number; events: { id: number; text: string; victimName?: string; subScore: number }[]; totalKills: number } | null;
  killFeed: { id: number; type: "kill" | "event"; text?: string; teamColor?: string; killerName?: string; victimName?: string; weaponIconShape?: string; weaponGlow?: string; weaponId?: string }[];
  /** bow charge 0..1 (0 when not drawing) */
  bowChargePct: number;
  /** shield HP (null if not a shield weapon) */
  shieldHp: number | null;
  shieldMaxHp: number | null;
  /** shield raise active */
  shieldActive: boolean;
  /** shield recharge pct 0..1 (1 = ready) */
  shieldCdPct: number;
  /** hit flash 0..1 (decays; triggers HUD shake) */
  hitFlash: number;
  /** net: opponent transiently disconnected; show "reconnecting" overlay */
  reconnecting: boolean;
  /** true when playing an online match (host/guest) */
  isNet: boolean;
  /** seconds remaining in an online match (null in single-player) */
  matchTimeLeft: number | null;
  /** player dead timer (seconds left until respawn) */
  deadTimer?: number;
  /** name of opponent or monster that eliminated local player */
  eliminatedBy?: string;
  /** recent damage events for death HUD */
  damageLogs?: DamageEvent[];

  /** end game player summary statistics */
  postGameStats?: PlayerSummaryStat[];
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  size: number;
  speed: number;
  fireTimer: number;
  iframes: number;
  flash: number;
  dashVx: number;
  dashVy: number;
  dashTime: number;
  shieldTime: number;
  overdriveTime: number;
  slamCd: number;
  t: number;
  /** melee swing animation timer (counts down from swingDur) */
  swingTimer: number;
  swingDur: number;
  /** spear combo step */
  comboStep: number;
  comboTimer: number;
  /** lunge visual offset */
  lunge: number;
  gadgetHeat?: number;
  stunTime?: number;
  /** bow charge time (0..maxChargeTime) */
  bowCharge: number;
  /** whether bow is currently being drawn */
  bowDrawing: boolean;
  /** shield raise time remaining */
  shieldBlockTime: number;
  /** current shield HP */
  shieldHp: number;
  /** shield recharge timer (counts down; shield available at 0) */
  shieldCd: number;
  /** time of last damage taken (for out-of-combat regen) */
  lastHitTime: number;
  // ---- multiplayer per-player state (so host can simulate both avatars) ----
  gunIndex?: number;
  skillCd?: number;
  dashCharges?: number;
  dashRecharge?: number;
  lastGadget?: number;
  /** >0 means the avatar is down and counting toward respawn (PvP) */
  deadTimer?: number;
  /** >0 = currently electrified by a lightsaber hit (renders crackling arcs) */
  electrifiedTime?: number;
  /** glow color of the electrifying weapon */
  electrifiedGlow?: string;
  /** slow debuff (from a lightning whip hit); time remaining */
  slowT?: number;
  /** burn debuff (from incendiary/flame damage); time remaining (max 1.5s) */
  burnT?: number;
  burnDps?: number;
  burnOwnerId?: number;
  burnWeapon?: string;
  /** deathmatch combatant id this Player belongs to (for kill credit) */
  cid?: number;
  // ---- dual blades (双刃): raise state + reflect params ----
  /** right-click held -> blades raised: reflect bullets + 15% slow */
  bladeRaising?: boolean;
  bladeReflectRange?: number;
  bladeReflectSelf?: number;
  bladeReflectGlow?: string;
  // ---- thrust longsword (突刺长剑): charge dash ----
  /** right-click held -> charging the dash */
  thrustCharging?: boolean;
  /** accumulated charge time in seconds */
  thrustCharge?: number;
  /** dash currently travelling (deals damage along the path) */
  thrustDashActive?: boolean;
  /** enemy/player ids already hit by the current dash */
  thrustHitIds?: Set<number>;
  /** dash travel velocity (px/s) */
  thrustDashVx?: number;
  thrustDashVy?: number;
  /** remaining dash distance (px) */
  thrustDashLeft?: number;
  /** dash direction (radians) */
  thrustDashAngle?: number;
  /** damage applied per enemy hit during the dash */
  thrustDashDmg?: number;
  // ---- new active-skill runtime state (declared so TS build is clean) ----
  /** combatant id mirror (used for bullet/effect ownership) */
  id?: number;
  /** remaining seconds of the active skill's energy/charge */
  skillEnergy?: number;
  /** cloak skill: avatar hidden from enemies */
  isCloaked?: boolean;
  /** winch claw skill: a claw is attached to a target */
  winchActive?: boolean;
  /** winch claw attach point */
  winchX?: number;
  winchY?: number;
  /** winch claw pull velocity */
  winchVx?: number;
  winchVy?: number;
  /** charge-slam skill: dash window active, AOE pending on end */
  isChargingSlam?: boolean;
  /** entity IDs hit during current charge-slam dash (ensures fixed 120 damage per target per dash) */
  slamHitIds?: Set<number | string>;
  // ---- throwing knife (飞刀): charge throw ----
  /** right-click held -> charging a charged throw */
  knifeCharging?: boolean;
  /** accumulated knife charge time (seconds) */
  knifeCharge?: number;
}

/** Floating score / heal number shown above a unit (gadget heal system). */
interface ScorePopup {
  x: number;
  y: number;
  t: number;
  score: string;
  color: string;
}

/** A deathmatch combatant: a human or an AI bot, each carrying its own
 *  character / loadout / weapon states so it can be simulated through the
 *  SAME per-player combat code (movement, firing, skills, gadgets) via
 *  context-switching (see `simulateBot`). Combatant 0 is always the
 *  local human; 1..3 are AI bots. */
interface Combatant {
  id: number;
  isBot: boolean;
  name: string;
  /** tag / name color */
  color: string;
  player: Player;
  character: CharacterDef;
  outfit: OutfitDef;
  skill: SkillDef;
  guns: GunDef[];
  gunIndex: number;
  weaponStates: Map<string, WeaponState>;
  gadgets: GadgetDef[];
  selectedGadget: number;
  skillCd: number;
  dashCharges: number;
  dashRecharge: number;
  gadgetCd: Map<string, number>;
  lastGadget: number;
  kills: number;
  deaths?: number;
  damageDealt?: number;
  damageTaken?: number;
  score: number;
  /** fractional score accumulator so continuous/DoT damage isn't rounded away */
  scoreAcc?: number;
  // ---- bot brain state ----
  wander?: number;
  strafeDir?: number;
  strafeTimer?: number;
  /** hysteresis timer so weapon switches don't flip-flop every frame */
  weaponCd?: number;
  /** spacing timer between gadget deployments */
  gadgetTimer?: number;
  // ---- bot AI throttle state (decision caching) ----
  aiTimer?: number;
  // Only MOVEMENT intent is cached between decisions; AIM + FIRE are recomputed
  // every frame by `botAimFire` so bots stay aggressive (cached firing caused the
  // "see an enemy but don't shoot" regression).
  aiMvx?: number;
  aiMvy?: number;
  pathfindingReqId?: number;
  pathDir?: { x: number; y: number };
  lastX?: number;
  lastY?: number;
  stuckTimer?: number;
  /** LOS cache for the per-frame aim/fire pass: reuses the expensive ray-vs-wall
   *  test for a short window (~0.1s) while the nearest target is unchanged, so
   *  the replay branch (which runs every render frame) doesn't re-cast it. */
  losTarget?: Player | null;
  losResult?: boolean;
  losTtl?: number;
  // ---- team mode property ----
  teamId?: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  size: number;
  color: string;
  glow: string;
  pierce: number;
  knockback: number;
  explosive: boolean;
  explosionRadius: number;
  kind: string;
  hit: Set<number>;
  trail?: boolean;
  /** remaining bounces */
  bounces?: number;
  /** ignores walls (ion) */
  ignoreWalls?: boolean;
  /** whether it has already bounced once (MGL32 explodes on 2nd) */
  bounced?: boolean;
  /** who fired this bullet (for PvP ownership) */
  owner?: "self" | "foe" | "enemy" | "player";
  /** combatant id that fired this bullet (deathmatch 4-way; overrides `owner`) */
  ownerId?: number;
  /** sideways drift velocity so parallel shots fan apart over flight (px/s) */
  driftX?: number;
  driftY?: number;
  /** weapon id that fired this bullet (for styled coin-burst kill FX) */
  weapon?: string;
  /** mortar lob: when set, the bullet arcs (z-axis) from (lobSx,lobSy) to
   *  (lobTx,lobTy) over lobDur seconds and explodes at the landing point,
   *  instead of travelling in a straight line. */
  lobSx?: number;
  lobSy?: number;
  lobTx?: number;
  lobTy?: number;
  lobDur?: number;
  lobT?: number;
  lobPeak?: number;
  /** current height above ground for the z-axis arc (drawing only) */
  z?: number;
  /** already reflected by a blade (so it won't be re-reflected) */
  reflected?: boolean;
  /** stun duration (seconds) applied to the victim on hit (stun gun) */
  stunDuration?: number;
  /** boomerang projectile: flies out then homes back to its owner */
  boomerang?: boolean;
  /** total distance to travel before returning */
  outDist?: number;
  /** true once the boomerang is heading back to the owner */
  returning?: boolean;
  /** distance travelled so far in the out phase */
  traveled?: number;
  /** constant travel speed used while steering the boomerang */
  boomSpeed?: number;
}

interface Enemy {
  id: number;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  size: number;
  speed: number;
  damage: number;
  color: string;
  glow: string;
  score: number;
  ranged: boolean;
  shootTimer: number;
  attackTimer: number;
  angle: number;
  hitFlash: number;
  spawnT: number;
  /** slow factor from poison/glue, time remaining */
  slowT: number;
  /** burn dot time remaining */
  burnT: number;
  burnDps: number;
  /** character + weapon for role-based enemies */
  character?: CharacterDef;
  outfit?: OutfitDef;
  gun?: GunDef;
  /** bow charge for bow enemies */
  bowCharge?: number;
  /** >0 = currently electrified by a lightsaber hit */
  electrifiedTime?: number;
  electrifiedGlow?: string;
  // ---- biohazard monster fields ----
  /** monster behavior archetype (biohazard mode) */
  behavior?: string;
  /** poison damage-over-time status */
  poisonT?: number;
  poisonDps?: number;
  /** speed buff remaining (from a screamer) */
  buffT?: number;
  /** screamer / spore ability timers */
  screamT?: number;
  cloudT?: number;
  /** runner charge lunge timer */
  chargeT?: number;
  /** bloater / abomination death explosion */
  explosiveDeath?: boolean;
  explodeRadius?: number;
  explodeDamage?: number;
  /** spitter ranged params */
  rangedRange?: number;
  rangedDamage?: number;
  /** screamer buff radius */
  buffRadius?: number;
  /** spore cloud params */
  cloudRadius?: number;
  cloudDamage?: number;
  /** what landed the killing blow — used to style the coin-burst FX (non-biohazard) */
  lastSrc?: { weapon: string; dx: number; dy: number };
  name?: string;
  burnOwnerId?: number;
  poisonOwnerId?: number;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  size: number;
  color: string;
  /** spitter poison glob (visual + slow on hit) */
  poison?: boolean;
}

export interface MeleeTrail {
  x: number;
  y: number;
  angle: number;
  weapon: string;
  life: number;
  maxLife: number;
  arc?: number;
  range?: number;
  length?: number;
}

export type WeatherType = "clear" | "fog" | "overcast" | "rain" | "snow" | "sandstorm";
export type TimeOfDay = "morning" | "afternoon" | "night";

export interface Raindrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shrink: boolean;
  /** Custom flag for pixelated / square particles (like RPG explosions) */
  square?: boolean;
  /** gravity for coin-like arcs */
  gravity?: number;
  /** whether this particle renders as a spinning coin */
  coin?: boolean;
  spin?: number;
  /** remaining flight time before the coin "lands" on the ground */
  flight?: number;
  /** remaining time the landed coin lingers on the ground */
  rest?: number;
  /** true once the coin has landed and is resting */
  landed?: boolean;
}

interface Effect {
  type: "explosion" | "shock" | "spawn" | "slash" | "slam" | "debris" | "coinburst" | "poisoncloud" | "firefield" | "flamecone" | "glue" | "saberswing" | "whip" | "skillcast" | "dual_slash" | "heal_beam" | "beam" | "lightning" | "dash";
  x: number;
  y: number;
  t: number;
  duration: number;
  radius: number;
  color: string;
  angle?: number;
  arc?: number;
  range?: number;
  /** for fields that deal continuous damage */
  dps?: number;
  slow?: number;
  /** enemies already inside (for field effects) */
  tickT?: number;
  /** styled coin-burst FX: kill style (whip/saber/explosive/...) + bullet direction */
  style?: string;
  dirX?: number;
  dirY?: number;
  ownerId?: number;
  weapon?: string;
  /** target unit id for beam-style effects (heal beam / lightning) */
  targetId?: number;
}

interface Pickup {
  x: number;
  y: number;
  type: "health" | "gold";
  life: number;
  bob: number;
  value?: number;
}

interface Grenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fuse: number;
  kind: "frag" | "glue" | "fire" | "poison" | "cluster";
  ownerId?: number;
}

interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  destructible: boolean;
  /** glue walls slow enemies passing through */
  glue?: boolean;
  slow?: number;
  /** invisible boundary "air walls" — collide but are never drawn */
  invisible?: boolean;
  /** solid building (textured, tower-like cover). Only the 大锤 (hammer) may
   *  damage buildings with a melee swing; other melee weapons pass through. */
  building?: boolean;
  /** deterministic per-building seed for the procedural rooftop texture */
  seed?: number;
}

interface Base {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  flash: number;
  t: number;
}

interface WeaponState {
  ammo: number;
  reload: number;
  heat: number;
  overheated: boolean;
  /** gatling spin-up 0..1 */
  spin?: number;
}

interface BeamHit {
  point: { x: number; y: number };
  enemy: Enemy | null;
  wall: Wall | null;
  combatant?: Player | null;
  deployable?: Deployable | null;
}

// ---------------------------------------------------------------------------
// Deployable gadgets
// ---------------------------------------------------------------------------
interface Deployable {
  kind: GadgetKind;
  x: number;
  y: number;
  /** angle for turrets */
  angle: number;
  hp: number;
  maxHp: number;
  /** fire timer */
  timer: number;
  /** lifetime (mines last until triggered; turrets decay) */
  life: number;
  /** mines: armed delay */
  armed: number;
  /** poison/fire field data */
  radius: number;
  color: string;
  size: number;
  /** for cannon turret bomb travel */
  targets: number[];
  /** who deployed this gadget (for multiplayer PvP ownership / targeting) */
  owner?: "self" | "foe";
  /** combatant id that deployed this gadget (deathmatch) */
  ownerId?: number;
}

const KEYS_MOVE = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const MAX_DASH_CHARGES = 3;
const DASH_RECHARGE = 5; // seconds per charge
// gadget aiming: how far a placement (turret/mine/station) or a thrown
// grenade may be placed/lobbed from the player.
const GADGET_DEPLOY_DIST = 240;
// grenade throw range: +125% (280 * 2.25) per request, then +20% on request.
const GADGET_THROW_DIST = 756;
/** Perf caps for client-side visual entities (local PvE, no network cost). */
const MAX_PARTICLES = 700;
const MAX_EFFECTS = 240;
/** Broad-phase spatial grid cell size (px). */
const GRID_CELL = 220;
/** Default bot AI decision frequency, in *decisions per second* — deliberately
 *  decoupled from the render frame rate. The live value is owned by the engine
 *  (`botAiHz`) and sourced from settings via `setBotAiHz`, so a higher Hz makes
 *  bots smarter (re-decide more often) at the cost of more CPU, and vice-versa.
 *  The per-decision interval is `aiStep = 1 / botAiHz`. */
const DEFAULT_BOT_AI_HZ = 16;
/** Spatial-grid item used for broad-phase collision/damage queries. */
type GridItem = {
  kind: "enemy" | "player" | "deployable";
  idx: number;
  x: number;
  y: number;
  size: number;
  ref: any;
  ownerId?: number;
};
/** Online PvP match time limit (seconds). The host ends the match at this point. */
const MATCH_DURATION = 175;
/** A neutral input frame used when a peer hasn't sent one yet (stand still). */
const EMPTY_FRAME: InputFrame = {
  keys: [],
  mx: 0,
  my: 0,
  vmx: 0,
  vmy: 0,
  firing: false,
  gadget: -1,
  weaponSwitch: false,
  skill: false,
  reload: false,
  secondaryFiring: false,
};
/** PvP/PvE: seconds a downed player waits before respawning */
export const RESPAWN_TIME = 4;
/** Seconds of damage history window tracked for death HUD */
export const DAMAGE_LOG_WINDOW = 10;


export class GameEngine {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;
  private loadout: Loadout;
  private onHud: (h: HudState) => void;
  private quality: "low" | "medium" | "high" = "high";
  /** retro pixel-art density (1 = off). Populated from settings on start. */
  private pixelSize: number = 1;

  private W = 800;
  private H = 600;
  /** world dimensions (larger than viewport) */
  private worldW = RUNTIME.worldW;
  private worldH = RUNTIME.worldH;
  private camX = 0;
  private camY = 0;
  private raf = 0;
  /** Cached radial gradients for glows, keyed by radius+color. Canvas gradients
   *  are bound to the user-space at paint time, so we create them centred at the
   *  origin (0,0,r) and let callers translate before filling — this lets bullets,
   *  enemy bullets, etc. reuse one gradient object instead of rebuilding it every
   *  frame (the single biggest render cost on the integrated GPU). */
  private glowCache = new Map<string, CanvasGradient>();
  /** Offscreen cache for the static background (linear gradient + vignette). */
  private bgCache?: HTMLCanvasElement;
  private bgCacheKey = "";
  private sceneTheme = SCENES[0];
  /** index into SCENES[] chosen by the host (authoritative); synced to the guest */
  private sceneIndex = 0;
  private last = 0;
  private running = false;
  /** guest-side interpolation state for smooth rendering between 30Hz snapshots */
  private gx = 0;
  private gy = 0;
  private gxInit = false;
  private netRender = new Map<number, { x: number; y: number }>();
  /** host-authored effects mirrored from the latest snapshot (guest/authoritative) */
  private netEffects: SnapEffect[] = [];
  private netFxPrev = 0;
  /** host-authored grenades + deployables mirrored so the guest can render them */
  private netGrenades: Grenade[] = [];
  private netDeployables: Deployable[] = [];
  /** host clock (from the latest snapshot) so the guest can show match time left */
  private lastSnapTime = 0;
  /** stable ids for effects so the guest can keep animating them across snapshots */
  private fxIds = new WeakMap<object, number>();
  private fxSeq = 1;
  /**
   * Peer handshake flag. Host sets it when the guest's `hello` arrives; the
   * guest sets it once it receives the first world snapshot. Until both sides
   * are confirmed present, the match must not advance (no enemy spawns), so a
   * late-joining player never lands in a half-played, desynced world.
   */
  private peerReady = false;
  /** opponent transiently disconnected; HUD shows a "reconnecting" overlay */
  private reconnecting = false;
  /** Gameplay (waves / enemy spawns) may advance. Gated on `peerReady` for net. */
  private matchLive = false;

  private character = getCharacter("raider");
  private outfit = getOutfit("tactical");
  private skill: SkillDef = getSkill("dash");

  private player!: Player;
  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private effects: Effect[] = [];
  public meleeTrails: MeleeTrail[] = [];
  public raindrops: Raindrop[] = [];
  public weather: WeatherType = "clear";
  public timeOfDay: TimeOfDay = "morning";
  /** floating score / heal number popups (declared since the gadget heal
   *  system pushes into it — previously missing, causing a runtime crash). */
  private scorePopups: ScorePopup[] = [];
  private pickups: Pickup[] = [];
  private grenades: Grenade[] = [];
  // spatial hash grid for broad-phase collision/damage queries (perf)
  private grid = new Map<string, GridItem[]>();
  private gridMaxR = 0;
  private particlePool: Particle[] = [];
  private walls: Wall[] = [];
  private deployables: Deployable[] = [];
  private base!: Base;
  private enemyBase!: Base;
  private weaponStates = new Map<string, WeaponState>();

  // Arctic Railway & Express Train Hazard System
  private trainTimer = 18;
  private trainWarning = false;
  private trainActive = false;
  private trainX = -900;
  private trainDir = 1;
  private trainSpeed = 850;
  private trainTotalLen = 650;
  private trainTrackY = 0;
  private trainHitCooldown = new Map<number, number>();

  private guns = GUNS;
  private gunIndex = 0;
  /** gadgets the player is carrying this run (max 3) */
  private gadgets: GadgetDef[] = [];
  /** currently selected (highlighted) gadget; -1 = none. Selecting does NOT deploy. */
  private selectedGadget = -1;
  /** index of last gadget used via scroll, for wheel cycling */
  private lastGadget = 0;
  /** semi-auto latch: blocks re-fire until the trigger is released */
  private semiAutoLatch = false;

  // ---- multiplayer ----
  private mode: NetMode = "local";
  /** true when playing through the authoritative server: BOTH clients only
   *  send input + mirror the server snapshot (no local world simulation). */
  private authoritative = false;
  private net: Net | null = null;
  /** single-player sub-mode */
  private gameMode: "biohazard" | "deathmatch" | "team_deathmatch" = "biohazard";
  private selfPid = 0;
  private peerPid = 0;
  private peerName = "";
  /** caller-requested pids (authoritative-client thin mode); overrides role default */
  private reqSelfPid?: number;
  private reqPeerPid?: number;
  private peerLoadout: Loadout | null = null;
  private remoteInput: InputFrame | null = null;
  private lastSnap: Snapshot | null = null;
  private seenFx = new Set<number>();
  private newSnapArrived = false;
  private snapAccum = 0;
  private inpAccum = 0;
  /** the opponent avatar (simulated on host, mirrored on guest) */
  private foe: Player | null = null;
  private foeChar: CharacterDef | null = null;
  private foeOutfit: OutfitDef | null = null;
  /** the opponent's own weapon list (from their loadout, mirrored via "hello") */
  private foeGuns: GunDef[] = [];
  /** the opponent's own gadget list (from their loadout, mirrored via "hello") */
  private foeGadgets: GadgetDef[] = [];
  /** the opponent's per-gadget cooldown timers (separate from the host's own) */
  private foeGadgetCd = new Map<string, number>();
  private foeWeaponStates = new Map<string, WeaponState>();
  private wallsDirty = true;
  /** the host's own avatar; never swapped while simulating the foe */
  private localPlayer: Player = null as unknown as Player;
  // one-shot action intents captured on the guest, sent with the next input
  private pendGadget = -1;
  private pendSkill = false;
  private pendReload = false;
  private pendWeapon = false;
  /** authoritative-server mode: latest InputFrame received from each peer (pid -> frame) */
  private peerInput = new Map<number, InputFrame>();
  /** latched one-shot actions so a discrete input (weapon switch / skill / reload /
   *  gadget) is never dropped just because a later no-op frame overwrote the latest
   *  frame before the authoritative tick consumed it. */
  private peerLatch = new Map<number, { weaponSwitch: boolean; skill: boolean; reload: boolean; gadget: number }>();
  /** enemies still queued to spawn this wave (local/host HUD; mirrored value on guest) */
  private spawnQueue = 0;
  /** total remaining enemies shown in the HUD (live for host, mirrored for guest) */
  private enemiesLeft = 0;
  /** last snapshot's enemy positions — used by the guest-side mobile aim assist */
  private snapEnemies: { x: number; y: number }[] = [];

  private enemyId = 1;
  private score = 0;
  private kills = 0;
  private gold = 0;
  private wave = 0;
  private waveTimer = 0;
  private spawnTimer = 0;
  // removed old scoreFeed array
  public killFeed: { id: number; type: "kill" | "event"; text?: string; teamColor?: string; killerName?: string; victimName?: string; weaponIconShape?: string; weaponGlow?: string; weaponId?: string; timer: number }[] = [];
  private nextScoreFeedId = 0;
  private nextKillFeedId = 0;

  public activeScoreFeed: { totalScore: number; timer: number; events: { id: number; text: string; victimName?: string; subScore: number }[]; totalKills: number } | null = null;
  private nextScoreFeedEventId = 0;
  /** fractional score accumulator for the local (non-combatant) player */
  private localScoreAcc = 0;
  /** per-attacker fractional damage-score accumulators for remote,
   *  non-combatant attackers (host / authoritative server only) */
  private pidScoreAcc = new Map<number, number>();
  // --- score/kill feed events mirrored to clients over snapshots ---
  private feedSeq = 1;
  private feedBuf: SnapFeedEvent[] = [];
  /** watermark of snapshot feed events already consumed; -1 = uninitialised */
  private lastFeedId = -1;

  addScoreFeed(text: string, score: number, victimName?: string, subScore?: number, totalKills?: number) {
    if (this.gameMode === "biohazard" && text === "伤害击中") return;
    
    if (!this.activeScoreFeed || this.activeScoreFeed.timer <= 0) {
      this.activeScoreFeed = {
        totalScore: score,
        timer: 5.0,
        events: [{ id: this.nextScoreFeedEventId++, text, victimName, subScore: subScore || score }],
        totalKills: totalKills || 0
      };
    } else {
      this.activeScoreFeed.totalScore += score;
      this.activeScoreFeed.timer = 5.0; // Reset to 5s
      if (totalKills) this.activeScoreFeed.totalKills = totalKills;
      
      // Combine identical text events if victim is the same
      const existingEvent = this.activeScoreFeed.events.find(e => e.text === text && e.victimName === victimName);
      if (existingEvent) {
        existingEvent.subScore += (subScore || score);
      } else {
        this.activeScoreFeed.events.unshift({ id: this.nextScoreFeedEventId++, text, victimName, subScore: subScore || score });
      }
      
      // Keep only up to 5 recent events in the list
      if (this.activeScoreFeed.events.length > 5) {
        this.activeScoreFeed.events.pop();
      }
    }
    
    this.emit(true);
  }

  /**
   * Award score equal to the ACTUAL damage dealt. Damage is accumulated as a
   * float and flushed to the integer score feed only once it reaches >= 1, so
   * continuous / damage-over-time weapons (beam, flame, poison, ...) no longer
   * lose their per-frame fractional damage to Math.round() and end up scoring
   * almost nothing despite dealing real damage.
   */
  private awardDamageScore(attackerId: number | undefined, dealt: number) {
    if (this.gameMode === "biohazard") return;
    if (dealt <= 0) return;
    const localId = this.mode === "local" ? 0 : this.selfPid;
    const finalAttackerId = (attackerId !== undefined && attackerId >= 0) ? attackerId : localId;
    const isLocal = finalAttackerId === localId;

    const killerC = this.combatants.find((c) => c.id === finalAttackerId);
    let acc: number;
    if (killerC) {
      killerC.scoreAcc = (killerC.scoreAcc ?? 0) + dealt;
      acc = killerC.scoreAcc;
    } else if (isLocal) {
      this.localScoreAcc += dealt;
      acc = this.localScoreAcc;
    } else {
      // remote non-combatant attacker (e.g. co-op teammate on the host/server):
      // accumulate per-pid so their fractional damage isn't credited to us
      acc = (this.pidScoreAcc.get(finalAttackerId) ?? 0) + dealt;
      this.pidScoreAcc.set(finalAttackerId, acc);
    }
    if (acc >= 1) {
      const whole = Math.floor(acc);
      if (killerC) {
        killerC.score += whole;
        killerC.scoreAcc = acc - whole;
        if (isLocal) {
          this.score += whole;
        }
      } else if (isLocal) {
        this.score += whole;
        this.localScoreAcc = acc - whole;
      } else {
        this.pidScoreAcc.set(finalAttackerId, acc - whole);
      }
      if (isLocal) this.addScoreFeed("伤害击中", whole);
      // mirror to clients so THEY can show their own damage-score popups
      this.pushFeedEvent({ kind: "damage", pid: finalAttackerId, amount: whole });
    }
  }

  /** Record a score/kill event for clients (host & authoritative server only).
   *  Clients consume unseen ids from Snapshot.feed in consumeFeedEvent(). */
  private pushFeedEvent(ev: Omit<SnapFeedEvent, "id">) {
    if (this.mode !== "host" && this.mode !== "server") return;
    this.feedBuf.push({ id: this.feedSeq++, ...ev });
    if (this.feedBuf.length > 24) this.feedBuf.shift();
  }

  /** Apply one host/server feed event on a client: mirrors per-combatant
   *  score/kills and shows the HUD feeds from THIS client's perspective. */
  private consumeFeedEvent(ev: SnapFeedEvent) {
    const isMe = ev.pid === this.selfPid;
    const c = this.combatants.find((cb) => cb.id === ev.pid);
    if (c) {
      c.score += ev.amount;
      if (ev.kind === "kill" && ev.kills !== undefined && ev.kills > c.kills) c.kills = ev.kills;
    }
    const nameFor = (pid: number | undefined, fallback?: string) =>
      pid === this.selfPid ? "你"
      : pid === this.peerPid ? (this.peerName || fallback || "对手")
      : (fallback || "敌人");
    if (ev.kind === "damage") {
      if (isMe) {
        this.score += ev.amount;
        this.addScoreFeed("伤害击中", ev.amount);
      }
      return;
    }
    // kill → top kill feed for everyone, centre feed/banner/sound if involved
    const kName = nameFor(ev.pid, ev.killerName);
    const vName = ev.victimPid === -1 ? (ev.victimName || "敌人") : nameFor(ev.victimPid, ev.victimName);
    this.addKillFeed(kName, vName, ev.weaponId, c);
    if (isMe) {
      this.kills += 1;
      this.score += ev.amount;
      this.addScoreFeed("淘汰", ev.amount, vName, ev.amount, ev.kills ?? this.kills);
      this.banner = { text: `击杀 ${vName}`, t: 1.6 };
      sound.playKillConfirm();
    } else if (ev.victimPid !== undefined && ev.victimPid === this.selfPid) {
      this.banner = { text: `你被 ${kName} 击败`, t: 1.6 };
    }
  }

  addKillFeed(killerName: string, victimName: string, weaponId?: string, killerC?: Combatant) {
    if (this.gameMode === "biohazard") return;
    let iconShape = "pistol";
    let glow = "#ef4444";
    const wId = weaponId || (killerC ? killerC.guns[killerC.gunIndex]?.id : undefined);
    if (wId) {
      const g = GUNS.find(gn => gn.id === wId);
      if (g) {
        iconShape = g.iconShape;
        glow = g.color;
      }
    }
    this.killFeed.push({
    type: "kill",
      id: this.nextKillFeedId++,
      killerName,
      victimName,
      weaponIconShape: iconShape,
      weaponGlow: glow,
      weaponId: wId,
      timer: 4.0,
    });
    if (this.killFeed.length > 5) {
      this.killFeed.shift();
    }
    this.emit(true);
  }

  public addEventMessage(text: string, teamColor?: string) {
    this.killFeed.push({
      id: this.nextKillFeedId++,
      type: "event",
      text,
      teamColor,
      timer: 8,
    });
    if (this.killFeed.length > 5) {
      this.killFeed.shift();
    }
    this.emit(true);
  }

  private maxConcurrent = 10;
  private intermission = 0;
  private banner: { text: string; t: number } | null = null;

  private skillCd = 0;
  private timewarp = 0;
  private hitSndCd = 0;
  private beamSndCd = 0;
  private flameSndCd = 0;
  private shake = 0;
  private whipToggle = false;
  private time = 0;
  private gameOver = false;
  private gameOverReason = "";
  private paused = false;
  /** frame-rate cap: seconds per allowed frame (0 = uncapped / follow display). */
  private fpsInterval = 1 / 60;
  /** accumulator used to throttle the simulation+render to `fpsInterval`. */
  private acc = 0;
  /** called when the player presses the pause/settings hotkey (ESC or P). The
   *  React layer wires this up to open the in-game settings overlay. */
  onPauseRequest?: () => void;
  /** called when the OS pointer lock state changes (desktop aim-lock feature) */
  onPointerLock?: (locked: boolean) => void;

  // ---- deathmatch (offline PvP vs AI bots) ----
  /** true when the active sub-mode is deathmatch */
  private isDM = false;
  /** all combatants: [0]=human, [1..3]=AI bots */
  private combatants: Combatant[] = [];
  /** combatant id whose context is currently "live" (so bullets/melee/beam
   *  credit the right attacker). 0 = human. */
  private activeId = 0;
  /** true while we're temporarily swapping the simulation context onto a bot /
   *  remote foe (inside `simulateBot` / `simulateRemote`). Used to suppress HUD
   *  emits so the player's own HUD never flickers to an opponent's state. */
  private simulatingOther = false;
  // ---- damage logging & statistics ----
  private damageLogs: DamageEvent[] = [];
  private nextDamageLogId = 1;
  private playerDamageDealt = 0;
  private playerDamageTaken = 0;
  private playerDeaths = 0;
  private eliminatedBy = "";


  /** Record or merge damage logs from the same weapon/attacker */
  private recordDamageLog(
    amount: number,
    weapon: string,
    targetName: string,
    sourceName: string,
    isDealtByMe: boolean
  ) {
    if (amount <= 0) return;

    // Search for existing entry of same weapon, target, source and direction
    const existing = this.damageLogs.find(
      (l) =>
        l.isDealtByMe === isDealtByMe &&
        l.weapon === weapon &&
        l.targetName === targetName &&
        l.sourceName === sourceName
    );

    if (existing) {
      existing.amount += amount;
      existing.timestamp = this.time;
    } else {
      this.damageLogs.push({
        id: this.nextDamageLogId++,
        timestamp: this.time,
        amount,
        weapon,
        targetName,
        sourceName,
        isDealtByMe,
      });
    }
  }

  /** Get the weapon ID of a combatant's currently equipped gun */
  private getAttackerWeaponId(c?: Combatant): string | undefined {
    if (!c) return undefined;
    return c.guns?.[c.gunIndex]?.id;
  }


  /** bot AI decision frequency (Hz), decoupled from the render frame rate.
   *  Sourced from settings; higher = smarter but more CPU. */
  private botAiHz = DEFAULT_BOT_AI_HZ;
  private get aiStep() {
    return 1 / this.botAiHz;
  }
  /** kills needed to win the deathmatch */
  private dmKillLimit = 15;
  /** seconds left in a local deathmatch / team_deathmatch match (0 = no timer) */
  private dmTimeLeft = 0;
  /** respawn anchor points (one per combatant) */
  private dmSpawns: { x: number; y: number }[] = [];

  // dash charge system
  private dashCharges = MAX_DASH_CHARGES;
  private dashRecharge = 0; // progress toward next charge (0..DASH_RECHARGE)

  // gadget cooldowns
  private gadgetCd = new Map<string, number>();

  // beam state
  private beamActive = false;
  private beamHit: BeamHit | null = null;
  // flamethrower state
  private flameActive = false;

  private keys = new Set<string>();
  private mouse = { x: 400, y: 300 };
  /** screen-space cursor position relative to the canvas top-left (accumulated while pointer is locked) */
  private cursorScreen = { x: 0, y: 0 };
  /** true when the OS pointer lock is currently active (desktop only) */
  private pointerLocked = false;
  private firing = false;
  private secondaryFiring = false;
  /** when true, fireGun spawns the charged (85 dmg) knife pair instead of the 65 pair */
  private knifeChargingActive = false;
  /** virtual movement vector from the on-screen joystick (-1..1 each axis) */
  private virtualMove = { x: 0, y: 0 };
  /** touch device: enables the mobile on-screen controls + mobile-only aim assist */
  private touchMode = false;

  private hudAccum = 0;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundBlur: () => void;
  private boundResize: () => void;
  private boundContext: (e: Event) => void;
  private boundLockChange: () => void;

  private aiWorker: Worker | null = null;
  private pathReqId = 0;

  constructor(
    canvas: HTMLCanvasElement | null,
    loadout: Loadout,
    onHud: (h: HudState) => void,
    opts: { mode?: NetMode; net?: Net | null; selfPid?: number; peerPid?: number } = {}
  ) {
    this.canvas = canvas;
    // In server-authoritative mode the engine runs headless in Node with no
    // canvas — all rendering is skipped and only the simulation runs.
    this.ctx = canvas ? canvas.getContext("2d") : null;
    if (this.ctx) this.ctx.imageSmoothingEnabled = this.pixelSize <= 1;
    this.loadout = loadout;
    this.onHud = onHud;
    this.mode = opts.mode ?? "local";
    this.net = opts.net ?? null;
    this.reqSelfPid = opts.selfPid;
    this.reqPeerPid = opts.peerPid;
    this.character = getCharacter(loadout.characterId);
    this.outfit = getOutfit(loadout.outfitId);
    this.skill = getSkill(loadout.skillId);
    this.gameMode = loadout.gameMode ?? "biohazard";
    // Every player (single-player AND multiplayer) uses only the two weapons
    // chosen in their loadout. In multiplayer the host also tracks the foe's
    // own weapon list (this.foeGuns) so both avatars respect their own picks.
    this.guns =
      loadout.gunIds && loadout.gunIds.length > 0
        ? loadout.gunIds
            .map((id) => GUNS.find((g) => g.id === id) ?? GUNS[0])
            .slice(0, 2)
        : [GUNS.find((g) => g.id === loadout.gunId) ?? GUNS[0]];
    // carried gadgets: from loadout (max 3), else first 3 available gadgets
    const chosen = (loadout.gadgetIds ?? [])
      .map((id) => GADGETS.find((g) => g.id === id))
      .filter((g): g is GadgetDef => !!g)
      .slice(0, 3);
    this.gadgets = chosen.length > 0 ? chosen : GADGETS.slice(0, 3);
    this.gunIndex = Math.max(
      0,
      this.guns.findIndex((g) => g.id === loadout.gunId)
    );

    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.keys.delete(e.code);
    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseDown = (e) => this.onMouseDown(e);
    this.boundMouseUp = (e) => this.onMouseUp(e);
    this.boundWheel = (e) => this.onWheel(e);
    this.boundBlur = () => {
      this.keys.clear();
      this.firing = false;
      this.semiAutoLatch = false;
    };
    this.boundResize = () => this.onResize();
    this.boundContext = (e) => e.preventDefault();
    this.boundLockChange = () => this.onPointerLockChange();

    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        this.aiWorker = new AiWorker();
        this.aiWorker.onmessage = (e) => this.onWorkerMessage(e);
      } catch (e) {
        console.warn("Failed to initialize aiWorker", e);
      }
    }
  }

  private syncWorker() {
    if (this.aiWorker) {
      this.aiWorker.postMessage({
        type: "init",
        walls: this.walls,
        worldW: this.worldW,
        worldH: this.worldH
      });
    }
  }

  private onWorkerMessage(e: MessageEvent) {
    const msg = e.data;
    if (msg.type === "pathRes") {
      const c = this.combatants.find(cb => cb.id === msg.botId);
      if (c && c.pathfindingReqId === msg.reqId) {
        c.pathDir = { x: msg.dx, y: msg.dy };
        c.pathfindingReqId = undefined; // Mark as fulfilled
      }
    }
  }

  private getAsyncPath(c: Combatant, targetX: number, targetY: number): { x: number; y: number } {
    if (!this.aiWorker) {
      return this.findBotPath(c.player.x, c.player.y, targetX, targetY, c.player.size);
    }
    if (c.pathfindingReqId === undefined) {
      c.pathfindingReqId = ++this.pathReqId;
      this.aiWorker.postMessage({
        type: "path",
        reqId: c.pathfindingReqId,
        botId: c.id,
        startX: c.player.x,
        startY: c.player.y,
        targetX,
        targetY,
        pSize: c.player.size
      });
    }
    return c.pathDir ?? { x: 0, y: 0 };
  }

  // ---------------------------------------------------------------- lifecycle
  start() {
    this.resize();
    this.resetState();
    this.attach();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    // expose the engine instance for debugging / automated tests
    (window as unknown as { __game?: unknown }).__game = this;
    this.emit(true);
  }

  /**
   * Headless boot used by the authoritative server (Node). Skips all DOM /
   * canvas / rAF setup and only prepares the simulation state. The server
   * drives the simulation via `stepServer(dt)` on its own loop.
   */
  startHeadless() {
    this.resetState();
    this.emit(true);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.detach();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.last = performance.now();
    this.emit(true);
  }

  /** Enable server-authoritative client mode (both peers send input + mirror). */
  setAuthoritative(v: boolean) {
    this.authoritative = v;
  }

  // --------------------------------------------------- touch / mobile controls
  /** Called by the React layer when a touch device is detected. Enables the
   *  on-screen joystick/fire button and the mobile-only aim assist. */
  setTouchMode(on: boolean) {
    this.touchMode = on;
  }

  /** Virtual movement vector from the on-screen joystick (-1..1 each axis). */
  setVirtualMove(x: number, y: number) {
    this.virtualMove.x = x;
    this.virtualMove.y = y;
  }

  /** Virtual fire button (on-screen). Drives the same `firing` flag as the mouse. */
  setVirtualFiring(on: boolean) {
    this.firing = on;
    if (on) this.semiAutoLatch = false; // fresh trigger pull for semi-auto
  }

  selectGun(i: number) {
    if (i >= 0 && i < this.guns.length) {
      this.gunIndex = i;
      this.beamActive = false;
      this.flameActive = false;
      this.player.bowCharge = 0;
      this.player.bowDrawing = false;
      this.player.shieldBlockTime = 0;
      // set shield HP to max when switching to a shield weapon
      if (this.gun.shieldMaxHp && this.player.shieldHp <= 0 && this.player.shieldCd <= 0) {
        this.player.shieldHp = this.gun.shieldMaxHp;
      }
      // sync to local combatant in deathmatch
      const localPid = this.mode === "local" ? 0 : this.selfPid;
      const localC = this.combatants.find((c) => c.id === localPid);
      if (localC) {
        localC.gunIndex = i;
      }
      this.emit(true);
    }
  }

  /** Cycle to the next carried weapon (used by the mobile "切枪" button). */
  cycleWeapon() {
    if (this.guns.length <= 1) return;
    if (this.mode === "guest" || this.authoritative) {
      this.pendWeapon = true;
      return;
    }
    this.selectGun((this.gunIndex + 1) % this.guns.length);
  }

  triggerSkill() {
    if (this.mode === "guest" || this.authoritative) {
      this.pendSkill = true;
      this.localSkillCooldown();
      return;
    }
    this.activateSkill();
  }

  /**
   * Select (highlight) a carried gadget without deploying it. Pressing the
   * already-selected slot again toggles the selection off. This is what the
   * number keys / wheel now do — deployment happens on left-click.
   */
  selectGadget(index: number) {
    if (this.gameOver || this.paused) return;
    if (index < 0 || index >= this.gadgets.length) return;
    this.selectedGadget = this.selectedGadget === index ? -1 : index;
  }

  /** Cancel the current gadget selection (e.g. when switching weapons). */
  clearGadgetSelection() {
    this.selectedGadget = -1;
  }

  /** Deploy a carried gadget by index (0-based). tx/ty = aimed world position. */
  deployGadget(index: number, tx?: number, ty?: number) {
    if (this.gameOver || this.paused) return;
    if (index < 0 || index >= this.gadgets.length) return;
    const def = this.gadgets[index];
    
    if (this.mode === "guest" || this.authoritative) {
      this.pendGadget = index;
      this.gadgetCd.set(def.id, def.cooldown);
      sound.skill();
      this.emit(true);
      return;
    }

    const cd = this.gadgetCd.get(def.id) ?? 0;
    if (cd > 0) return;
    // count deployed of this kind
    const deployed = this.deployables.filter((d) => d.kind === def.kind).length;
    if (def.maxStack && deployed >= def.maxStack) {
      // remove oldest of same kind
      const idx = this.deployables.findIndex((d) => d.kind === def.kind);
      if (idx >= 0) this.deployables.splice(idx, 1);
    }
    this.gadgetCd.set(def.id, def.cooldown);
    this.doDeploy(def, tx, ty);
    sound.skill();
    this.emit(true);
  }

  reloadCurrent() {
    if (this.mode === "guest" || this.authoritative) {
      this.pendReload = true;
      return;
    }
    const g = this.gun;
    const ws = this.weaponStates.get(g.id);
    if (g.magazine && ws && ws.reload <= 0 && ws.ammo < g.magazine) {
      ws.reload = g.reloadTime ?? 1.5;
      sound.reload();
    }
  }

  restart() {
    this.resetState();
    this.gameOver = false;
    this.paused = false;
    this.last = performance.now();
    this.emit(true);
  }

  private pickWeather() {
    let weathers: WeatherType[] = ["clear", "fog", "overcast", "rain"];
    const times: TimeOfDay[] = ["morning", "afternoon", "night"];

    if (this.sceneTheme) {
      if (this.sceneTheme.id === "glacier" || this.sceneTheme.name.includes("冰")) {
        weathers = ["clear", "fog", "overcast", "snow"];
      } else if (this.sceneTheme.id === "desert" || this.sceneTheme.id === "western" || this.sceneTheme.name.includes("沙") || this.sceneTheme.name.includes("西部")) {
        weathers = ["clear", "fog", "overcast", "sandstorm"];
      }
    }

    if (this.loadout && this.loadout.weatherOverride && this.loadout.weatherOverride !== "random") {
      this.weather = this.loadout.weatherOverride as WeatherType;
    } else {
      this.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }
    
    this.timeOfDay = times[Math.floor(Math.random() * times.length)];
    
    // adjust valid combinations based on prompt requirements
    if (this.weather === "fog") {
      this.timeOfDay = Math.random() > 0.5 ? "afternoon" : "night";
    } else if (this.weather === "overcast") {
      this.timeOfDay = "afternoon";
    } else if (this.weather === "rain" || this.weather === "snow" || this.weather === "sandstorm") {
      this.timeOfDay = Math.random() > 0.5 ? "afternoon" : "night";
    } else if (this.weather === "clear") {
      this.timeOfDay = Math.random() > 0.5 ? "morning" : "night";
    }
  }

  private resetState() {
    this.resize();
    const customThemeId = this.loadout?.customMap?.themeId;
    if (customThemeId && customThemeId !== "random") {
      const idx = SCENES.findIndex((s) => s.id === customThemeId);
      if (idx >= 0) {
        this.sceneIndex = idx;
        this.sceneTheme = SCENES[idx];
      } else {
        this.sceneIndex = Math.floor(Math.random() * SCENES.length);
        this.sceneTheme = SCENES[this.sceneIndex];
      }
    } else {
      this.sceneIndex = Math.floor(Math.random() * SCENES.length);
      this.sceneTheme = SCENES[this.sceneIndex];
    }
    this.pickWeather();

    if (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") {
      const pCount = this.loadout.dmPlayerCount || 4;
      const scale = pCount === 4 ? 1 : pCount === 6 ? 1.2 : 1.5;
      this.worldW = RUNTIME.worldW * scale;
      this.worldH = RUNTIME.worldH * scale;
    } else {
      this.worldW = RUNTIME.worldW;
      this.worldH = RUNTIME.worldH;
    }
    // Every mode now uses the (expanded) world bounds from RUNTIME so the
    // camera can scroll and follow the player — including biohazard, which is
    // no longer a fixed single-screen arena but a larger roaming survival map.
    this.gx = 0;
    this.gy = 0;
    this.gxInit = false;
    this.netRender.clear();
    // local play is live immediately; net modes wait for the peer handshake
    this.peerReady = this.mode === "local";
    this.matchLive = this.mode === "local";
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.effects = [];
    this.meleeTrails = [];
    this.raindrops = [];
    this.pickups = [];
    this.grenades = [];
    this.deployables = [];
    this.walls = this.buildWalls();
    this.syncWorker();
    this.base = {
      x: this.worldW / 2,
      y: this.worldH - 120,
      radius: 48,
      hp: RUNTIME.baseHp,
      maxHp: RUNTIME.baseHp,
      flash: 0,
      t: 0,
    };
    this.enemyBase = {
      x: this.worldW / 2,
      y: 120,
      radius: 48,
      hp: RUNTIME.enemyBaseHp,
      maxHp: RUNTIME.enemyBaseHp,
      flash: 0,
      t: 0,
    };
    // biohazard has no bases to defend — neutralise them so they never
    // trigger a loss and aren't targeted by monsters.
    if (this.gameMode === "biohazard") {
      this.base.hp = Infinity;
      this.base.maxHp = Infinity;
      this.enemyBase.hp = Infinity;
      this.enemyBase.maxHp = Infinity;
    }
    this.weaponStates = new Map();
    for (const g of this.guns) {
      this.weaponStates.set(g.id, {
        ammo: g.magazine ?? 0,
        reload: 0,
        heat: 0,
        overheated: false,
      });
    }
    this.foeWeaponStates = new Map();
    this.wallsDirty = true;
    this.score = 0;
    this.kills = 0;
    this.localScoreAcc = 0;
    this.pidScoreAcc.clear();
    this.feedBuf = [];
    this.feedSeq = 1;
    this.lastFeedId = -1;
    this.killFeed = [];
    this.activeScoreFeed = null;
    this.gold = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 1;
    this.maxConcurrent = this.gameMode === "biohazard" ? 14 : 8;
    this.intermission = 3;
    this.skillCd = 0;
    this.timewarp = 0;
    this.shake = 0;
    this.time = 0;
    this.beamActive = false;
    this.beamHit = null;
    this.flameActive = false;
    this.banner = {
      text: this.gameMode === "biohazard" ? "生存模式 · 抵御尸潮" : "死亡竞赛 · 先达目标击杀",
      t: 2.2,
    };
    this.enemyId = 1;
    this.gunIndex = 0; // start with first selected weapon
    this.lastGadget = 0;
    this.selectedGadget = -1;
    this.dashCharges = MAX_DASH_CHARGES;
    this.dashRecharge = 0;
    this.gadgetCd = new Map();

    const c = this.character;
    const o = this.outfit;
    const maxHp =
      RUNTIME.playerBaseHp > 0
        ? RUNTIME.playerBaseHp
        : Math.round(c.maxHp + o.hpBonus);
    const speed = c.speed * (1 + o.speedBonus);
    this.player = {
      x: this.worldW / 2,
      y: this.worldH - 200,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: maxHp,
      maxHp,
      size: c.size,
      speed,
      fireTimer: 0,
      iframes: 0,
      flash: 0,
      dashVx: 0,
      dashVy: 0,
      dashTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      slamCd: 0,
      t: 0,
      swingTimer: 0,
      swingDur: 0.22,
      comboStep: 0,
      comboTimer: 0,
      lunge: 0,
      bowCharge: 0,
      bowDrawing: false,
      shieldBlockTime: 0,
      shieldHp: 0,
      shieldCd: 0,
      lastHitTime: 0,
    };
    this.localPlayer = this.player;
    // biohazard: drop the player into the centre of the (now scrolling) arena
    if (this.gameMode === "biohazard") {
      this.player.x = this.worldW / 2;
      this.player.y = this.worldH / 2;
    }
    // shield weapon init (after player exists)
    this.player.shieldHp = this.gun.shieldMaxHp ?? 0;
    this.applyRuntime();

    // ---- deathmatch & team_deathmatch: build combatants ----
    if (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") {
      this.isDM = true;
      const isTeam = this.gameMode === "team_deathmatch";
      const pCount = this.loadout.dmPlayerCount || 4;
      this.dmKillLimit = this.mode === "local" ? (isTeam ? (pCount === 4 ? 20 : pCount === 6 ? 30 : pCount === 10 ? 30 : 40) : (pCount === 4 ? 15 : pCount === 6 ? 18 : 24)) : (isTeam ? 20 : 8);
      this.base.hp = Infinity;
      this.base.maxHp = Infinity;
      this.enemyBase.hp = Infinity;
      this.enemyBase.maxHp = Infinity;
      // Spread combatants across the whole arena so spawns and respawns are
      // never concentrated in a single spot (avoids spawn-camping and
      // everyone piling onto one point).
      this.dmSpawns = this.generateCombatSpawns(pCount);
      this.dmTimeLeft = 300; // 5 minutes, then the leader wins

      if (this.mode === "local") {
        this.player.x = this.dmSpawns[0].x;
        this.player.y = this.dmSpawns[0].y;
        const human: Combatant = {
          id: 0, isBot: false, name: "你", color: isTeam ? "#38bdf8" : "#38bdf8",
          player: this.player,
          character: this.character, outfit: this.outfit, skill: this.skill,
          guns: this.guns, gunIndex: this.gunIndex,
          weaponStates: this.weaponStates, gadgets: this.gadgets,
          selectedGadget: this.selectedGadget,
          skillCd: this.skillCd, dashCharges: this.dashCharges,
          dashRecharge: this.dashRecharge, gadgetCd: this.gadgetCd,
          lastGadget: this.lastGadget, kills: 0, score: 0,
          wander: 0, strafeDir: 1, strafeTimer: 0,
          teamId: isTeam ? 0 : undefined
        };
        this.combatants = [human];
        this.player.cid = 0;
        
        if (isTeam) {
          if (pCount === 10) {
            // 5v5: two teams of five — 你 + 4 名队友(蓝队) vs 5 名敌人(红队)
            const picks = this.rollBotLoadouts(9);
            let botIdx = 0;
            for (let teamId = 0; teamId < 2; teamId++) {
              const members = teamId === 0 ? 4 : 5;
              for (let m = 0; m < members; m++) {
                const sp = this.dmSpawns[botIdx + 1];
                const name = teamId === 0 ? `队友${m + 1}` : `敌人${m + 1}`;
                const bot = this.makeBot(botIdx + 1, picks[botIdx], name, teamId === 0 ? "#38bdf8" : "#ef4444", sp.x, sp.y);
                bot.teamId = teamId;
                this.combatants.push(bot);
                botIdx++;
              }
            }
            this.banner = { text: `5v5 团队死斗 · 先达 ${this.dmKillLimit} 击杀`, t: 2.8 };
          } else {
            const botColors = ["#38bdf8", "#ef4444", "#f59e0b", "#ec4899"];
            const botNames = ["阿法", "贝塔", "伽马", "德塔", "艾普", "泽塔", "伊塔", "西塔"];
            const numTeams = pCount / 2;
            const picks = this.rollBotLoadouts(pCount - 1);
            let botIdx = 0;
            for (let teamId = 0; teamId < numTeams; teamId++) {
              const playersInTeam = teamId === 0 ? 1 : 2;
              for (let pIdx = 0; pIdx < playersInTeam; pIdx++) {
                const sp = this.dmSpawns[botIdx + 1];
                const name = teamId === 0 ? "队友" : botNames[botIdx];
                const bot = this.makeBot(botIdx + 1, picks[botIdx], name, botColors[teamId], sp.x, sp.y);
                bot.teamId = teamId;
                this.combatants.push(bot);
                botIdx++;
              }
            }
            this.banner = { text: `团队死斗 · 先达 ${this.dmKillLimit} 击杀`, t: 2.8 };
          }
        } else {
          const botColors = ["#f472b6", "#a3e635", "#fbbf24", "#e879f9", "#34d399", "#60a5fa", "#f87171", "#c084fc"];
          const botNames = ["阿尔法", "贝塔", "伽马", "德尔塔", "艾普西龙", "泽塔", "伊塔", "西塔"];
          // FFA supports up to 8 bots; guard against a stale 5v5 (10) selection
          const botCount = Math.min(pCount - 1, 8);
          const picks = this.rollBotLoadouts(botCount);
          for (let i = 0; i < botCount; i++) {
            const sp = this.dmSpawns[i + 1];
            const bot = this.makeBot(i + 1, picks[i], botNames[i], botColors[i], sp.x, sp.y);
            this.combatants.push(bot);
          }
          this.banner = { text: `死亡竞赛 · 先达 ${this.dmKillLimit} 击杀`, t: 2.4 };
        }
      } else {
        this.combatants = [];
        this.banner = { text: isTeam ? `团队死斗 · 先达 ${this.dmKillLimit} 击杀` : `死亡竞赛 · 先达 ${this.dmKillLimit} 击杀`, t: 2.4 };
      }
      this.activeId = 0;
    } else {
      this.isDM = false;
      this.combatants = [];
    }

    // ---- multiplayer bootstrapping ----
    if (this.mode !== "local" && this.net) {
      this.authoritative = this.net.isAuthoritative;
      // Use role-based ids (host=1, guest=2) instead of the relay's global pid
      // counter. The server's pid is NOT guaranteed to be 1/2 (it increments
      // across all rooms), so relying on it silently swapped "me"/"foe" in some
      // sessions -> the player mirrored the opponent and could not move.
      this.selfPid = this.reqSelfPid ?? (this.net.youPid || (this.mode === "host" ? 1 : 2));
      this.peerPid = this.reqPeerPid ?? (this.net.peerPid || (this.selfPid === 1 ? 2 : 1));
      this.foeGuns = this.guns.slice();
      this.gunIndex = Math.max(0, this.guns.findIndex((g) => g.id === this.loadout.gunId));
      this.player.gunIndex = this.gunIndex;
      this.player.skillCd = 0;
      this.player.dashCharges = MAX_DASH_CHARGES;
      this.player.dashRecharge = 0;
      this.player.lastGadget = 0;
      this.foe = this.makeFoe();
      this.net.sendGame({ t: "hello", name: this.character.name, loadout: this.loadout });

      if (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") {
        this.player.cid = this.selfPid;
        this.foe.cid = this.peerPid;

        const hostSpawn = this.dmSpawns[0];
        const guestSpawn = this.dmSpawns[1];
        if (this.mode === "host") {
          this.player.x = hostSpawn.x;
          this.player.y = hostSpawn.y;
          this.foe.x = guestSpawn.x;
          this.foe.y = guestSpawn.y;
        } else {
          this.player.x = guestSpawn.x;
          this.player.y = guestSpawn.y;
          this.foe.x = hostSpawn.x;
          this.foe.y = hostSpawn.y;
        }

        const c1: Combatant = {
          id: 1, isBot: false, name: this.mode === "host" ? "你" : (this.peerName || "对手"), color: "#38bdf8",
          player: this.mode === "host" ? this.player : this.foe,
          character: this.mode === "host" ? this.character : this.foeChar!,
          outfit: this.mode === "host" ? this.outfit : this.foeOutfit!,
          skill: this.mode === "host" ? this.skill : getSkill(this.peerLoadout?.skillId ?? "dash"),
          guns: this.mode === "host" ? this.guns : this.foeGuns,
          gunIndex: this.mode === "host" ? this.gunIndex : (this.foe.gunIndex ?? 0),
          weaponStates: this.mode === "host" ? this.weaponStates : this.foeWeaponStates,
          gadgets: this.mode === "host" ? this.gadgets : this.foeGadgets,
          selectedGadget: this.mode === "host" ? this.selectedGadget : -1,
          skillCd: this.mode === "host" ? this.skillCd : 0,
          dashCharges: this.mode === "host" ? this.dashCharges : MAX_DASH_CHARGES,
          dashRecharge: this.mode === "host" ? this.dashRecharge : 0,
          gadgetCd: this.mode === "host" ? this.gadgetCd : new Map(),
          lastGadget: this.mode === "host" ? this.lastGadget : 0,
          kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0
        };

        const c2: Combatant = {
          id: 2, isBot: false, name: this.mode === "guest" ? "你" : (this.peerName || "对手"), color: "#f472b6",
          player: this.mode === "guest" ? this.player : this.foe,
          character: this.mode === "guest" ? this.character : this.foeChar!,
          outfit: this.mode === "guest" ? this.outfit : this.foeOutfit!,
          skill: this.mode === "guest" ? this.skill : getSkill(this.peerLoadout?.skillId ?? "dash"),
          guns: this.mode === "guest" ? this.guns : this.foeGuns,
          gunIndex: this.mode === "guest" ? this.gunIndex : (this.foe.gunIndex ?? 0),
          weaponStates: this.mode === "guest" ? this.weaponStates : this.foeWeaponStates,
          gadgets: this.mode === "guest" ? this.gadgets : this.foeGadgets,
          selectedGadget: this.mode === "guest" ? this.selectedGadget : -1,
          skillCd: this.mode === "guest" ? this.skillCd : 0,
          dashCharges: this.mode === "guest" ? this.dashCharges : MAX_DASH_CHARGES,
          dashRecharge: this.mode === "guest" ? this.dashRecharge : 0,
          gadgetCd: this.mode === "guest" ? this.gadgetCd : new Map(),
          lastGadget: this.mode === "guest" ? this.lastGadget : 0,
          kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0
        };

        this.combatants = [c1, c2];
      }
    }
  }

  private makeFoe(): Player {
    const c = getCharacter("raider");
    const o = getOutfit("tactical");
    // opponents also use the unified player HP override (so every player = 250)
    const maxHp =
      RUNTIME.playerBaseHp > 0
        ? RUNTIME.playerBaseHp
        : Math.round(c.maxHp + o.hpBonus);
    this.foeChar = c;
    this.foeOutfit = o;
    return {
      x: this.worldW / 2,
      y: 200,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      hp: maxHp,
      maxHp,
      size: c.size,
      speed: c.speed * (1 + o.speedBonus),
      fireTimer: 0,
      iframes: 0,
      flash: 0,
      dashVx: 0,
      dashVy: 0,
      dashTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      slamCd: 0,
      t: 0,
      swingTimer: 0,
      swingDur: 0.22,
      comboStep: 0,
      comboTimer: 0,
      lunge: 0,
      bowCharge: 0,
      bowDrawing: false,
      shieldBlockTime: 0,
      shieldHp: 0,
      shieldCd: 0,
      lastHitTime: 0,
      gunIndex: 0,
      skillCd: 0,
      dashCharges: MAX_DASH_CHARGES,
      dashRecharge: 0,
        lastGadget: 0,
      };
  }

  /** Roll `n` randomised bot loadouts (ranged / bow weapons only, no
   *  semi-auto so the per-combatant fire-latch stays correct). Bots get
   *  DISTINCT characters / skills and a far+near gun pairing so they play
   *  differently and actually exercise the in-match weapon switching. */
  private rollBotLoadouts(n: number): Loadout[] {
    const out: Loadout[] = [];
    const skillIds = SKILLS.filter((s) => s.id !== "timewarp").map((s) => s.id);
    const gunPool = GUNS;
    // split by effective range so each bot carries one long-range + one
    // short-range tool (bulletSpeed * lifetime ≈ max travel distance)
    const eff = (g: GunDef) => (g.bulletSpeed ?? 700) * (g.life ?? 1);
    const farGuns = gunPool.filter((g) => eff(g) >= 620);
    const nearGuns = gunPool.filter((g) => eff(g) < 620);
    const gadPool = GADGETS.slice();
    const shuffle = <T,>(a: T[]): T[] => {
      const r = a.slice();
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
    const chars = shuffle(CHARACTERS.map((c) => c.id));
    const skills = shuffle(skillIds);
    for (let i = 0; i < n; i++) {
      const cId =
        chars[i] ?? CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      const o = OUTFITS[Math.floor(Math.random() * OUTFITS.length)];
      // one long-range, one short-range (fallback to any if a bucket is empty)
      const far = farGuns.length
        ? farGuns[Math.floor(Math.random() * farGuns.length)]
        : gunPool[Math.floor(Math.random() * gunPool.length)];
      const nearPool = nearGuns.length ? nearGuns : gunPool;
      let near = nearPool[Math.floor(Math.random() * nearPool.length)];
      if (near.id === far.id) near = nearPool[(nearPool.indexOf(near) + 1) % nearPool.length];
      const sk = skills[i] ?? skillIds[Math.floor(Math.random() * skillIds.length)];
      // 2–3 gadgets, varied per bot, biased to include a pressure tool
      const gs: string[] = [];
      const pool = gadPool.slice();
      const want = 2 + (i % 2);
      for (let k = 0; k < want && pool.length; k++) {
        gs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
      }
      out.push({
        characterId: cId,
        outfitId: o.id,
        gunId: far.id,
        gunIds: [far.id, near.id],
        skillId: sk,
        gadgetIds: gs,
        gameMode: "deathmatch",
      });
    }
    return out;
  }

  /** Build an AI bot combatant with its own character / loadout / weapon states. */
  private makeBot(
    id: number,
    lo: Loadout,
    name: string,
    color: string,
    x: number,
    y: number
  ): Combatant {
    const c = getCharacter(lo.characterId);
    const o = getOutfit(lo.outfitId);
    const maxHp =
      RUNTIME.playerBaseHp > 0
        ? RUNTIME.playerBaseHp
        : Math.round(c.maxHp + o.hpBonus);
    const guns = (lo.gunIds ?? [])
      .map((gid) => GUNS.find((g) => g.id === gid) ?? GUNS[0])
      .slice(0, 2);
    const gad = (lo.gadgetIds ?? [])
      .map((gid) => GADGETS.find((g) => g.id === gid))
      .filter((g): g is GadgetDef => !!g)
      .slice(0, 3);
    const skill = getSkill(lo.skillId);
    const p: Player = {
      x, y, vx: 0, vy: 0, angle: Math.PI, hp: maxHp, maxHp, size: c.size,
      speed: c.speed * (1 + o.speedBonus), fireTimer: 0, iframes: 0, flash: 0,
      dashVx: 0, dashVy: 0, dashTime: 0, shieldTime: 0, overdriveTime: 0, slamCd: 0,
      t: 0, swingTimer: 0, swingDur: 0.22, comboStep: 0, comboTimer: 0, lunge: 0,
      bowCharge: 0, bowDrawing: false, shieldBlockTime: 0, shieldHp: 0, shieldCd: 0,
      lastHitTime: 0, cid: id, gunIndex: 0, skillCd: 0,
      dashCharges: MAX_DASH_CHARGES, dashRecharge: 0, lastGadget: 0,
    };
    const ws = new Map<string, WeaponState>();
    for (const g of guns) ws.set(g.id, { ammo: g.magazine ?? 0, reload: 0, heat: 0, overheated: false });
    const gc = new Map<string, number>();
    for (const g of gad) gc.set(g.id, 0);
    return {
      id, isBot: true, name, color, player: p, character: c, outfit: o, skill,
      guns, gunIndex: 0, weaponStates: ws, gadgets: gad, selectedGadget: -1,
      skillCd: 0, dashCharges: MAX_DASH_CHARGES, dashRecharge: 0, gadgetCd: gc,
      lastGadget: 0, kills: 0, score: 0,
      wander: Math.random() * Math.PI * 2,
      strafeDir: Math.random() < 0.5 ? 1 : -1, strafeTimer: 0,
    };
  }

  /** Make sure every gun in the list has a WeaponState entry (host simulates foe guns too). */
  private ensureWeaponStates(guns: GunDef[], targetMap: Map<string, WeaponState> = this.weaponStates) {
    for (const g of guns) {
      if (!targetMap.has(g.id)) {
        targetMap.set(g.id, {
          ammo: g.magazine ?? 0,
          reload: 0,
          heat: 0,
          overheated: false,
        });
      }
    }
  }

  private applyPeerLoadout() {
    const pl = this.peerLoadout;
    if (!pl) return;
    this.foeChar = getCharacter(pl.characterId);
    this.foeOutfit = getOutfit(pl.outfitId);
    // adopt the opponent's own weapon picks so the host simulates them correctly
    this.foeGuns =
      pl.gunIds && pl.gunIds.length > 0
        ? pl.gunIds
            .map((id) => GUNS.find((g) => g.id === id) ?? GUNS[0])
            .slice(0, 2)
        : [GUNS.find((g) => g.id === pl.gunId) ?? GUNS[0]];
    this.ensureWeaponStates(this.foeGuns, this.foeWeaponStates);
    // adopt the opponent's own gadget picks (in their loadout order) so the
    // host resolves the foe's gadget slot index correctly when deploying
    const chosen = (pl.gadgetIds ?? [])
      .map((id) => GADGETS.find((g) => g.id === id))
      .filter((g): g is GadgetDef => !!g);
    this.foeGadgets = chosen.length > 0 ? chosen : GADGETS.slice(0, 3);
    if (this.foe) {
      const c = this.foeChar;
      const o = this.foeOutfit;
      this.foe.maxHp =
        RUNTIME.playerBaseHp > 0
          ? RUNTIME.playerBaseHp
          : Math.round(c.maxHp + o.hpBonus);
      if (this.foe.hp > this.foe.maxHp) this.foe.hp = this.foe.maxHp;
      this.foe.speed = c.speed * (1 + o.speedBonus);
      this.foe.size = c.size;
    }
    
    // sync deathmatch / team_deathmatch peer combatant
    if ((this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") && this.combatants.length > 0) {
      const peerC = this.combatants.find((c) => c.id === this.peerPid);
      if (peerC) {
        peerC.name = this.peerName || "对手";
        peerC.character = this.foeChar!;
        peerC.outfit = this.foeOutfit!;
        peerC.skill = getSkill(pl.skillId ?? "dash");
        peerC.guns = this.foeGuns;
        peerC.weaponStates = this.foeWeaponStates;
        peerC.gadgets = this.foeGadgets;
      }
    }
  }

  /** Sync world / base tunables from RUNTIME into the live engine. */
  applyRuntime() {
    this.worldW = RUNTIME.worldW;
    this.worldH = RUNTIME.worldH;
    if (this.base) {
      this.base.x = this.worldW / 2;
      this.base.y = this.worldH - 120;
      this.base.maxHp = RUNTIME.baseHp;
      if (this.base.hp > this.base.maxHp) this.base.hp = this.base.maxHp;
    }
    if (this.enemyBase) {
      this.enemyBase.x = this.worldW / 2;
      this.enemyBase.y = 120;
      this.enemyBase.maxHp = RUNTIME.enemyBaseHp;
      if (this.enemyBase.hp > this.enemyBase.maxHp)
        this.enemyBase.hp = this.enemyBase.maxHp;
    }
  }

  /** Recompute the player's maxHp / speed / size from the current character+outfit. */
  refreshPlayerStats() {
    if (!this.player) return;
    const c = this.character;
    const o = this.outfit;
    const maxHp =
      RUNTIME.playerBaseHp > 0
        ? RUNTIME.playerBaseHp
        : Math.round(c.maxHp + o.hpBonus);
    const ratio = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    this.player.maxHp = maxHp;
    this.player.hp = Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio)));
    this.player.speed = c.speed * (1 + o.speedBonus);
    this.player.size = c.size;
    this.emit(true);
  }

  /** Directly set the live player's max HP and full HP (console health editor). */
  setPlayerHp(v: number) {
    if (!this.player) return;
    this.player.maxHp = v;
    this.player.hp = v;
    this.emit(true);
  }

  /** Directly set every live enemy's max HP and full HP (console health editor). */
  setAllEnemyHp(v: number) {
    for (const e of this.enemies) {
      e.maxHp = v;
      e.hp = v;
    }
    this.emit(true);
  }

  private buildWalls(): Wall[] {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    this.trainTrackY = cy;
    const walls: Wall[] = [];

    // Helper: Verify bounding box intersection to 100% prevent any clipping/overlap
    const collidesWithAny = (x: number, y: number, w: number, h: number, pad = 24) => {
      const left = x - w / 2 - pad;
      const right = x + w / 2 + pad;
      const top = y - h / 2 - pad;
      const bottom = y + h / 2 + pad;
      for (const wall of walls) {
        if (right > wall.x && left < wall.x + wall.w && bottom > wall.y && top < wall.y + wall.h) {
          return true;
        }
      }
      // On snow/arctic maps, keep central railway corridor [cy - 50, cy + 50] 100% clear of solid obstacles
      if ((this.sceneIndex === 2 || this.sceneIndex === 7) && Math.abs(y - cy) < 55) {
        return true;
      }
      // Keep base spawn areas clear
      if (Math.hypot(x - cx, y - 120) < 180 || Math.hypot(x - cx, y - (this.worldH - 120)) < 180) {
        return true;
      }
      return false;
    };

    const pillar = (x: number, y: number) => {
      if (collidesWithAny(x, y, 40, 40, 16)) return;
      walls.push({
        x: x - 20,
        y: y - 20,
        w: 40,
        h: 40,
        hp: Infinity,
        maxHp: Infinity,
        destructible: false,
      });
    };
    const cover = (x: number, y: number, w: number, h: number) => {
      if (collidesWithAny(x, y, w, h, 20)) return;
      walls.push({
        x: x - w / 2,
        y: y - h / 2,
        w,
        h,
        hp: 150,
        maxHp: 150,
        destructible: true,
      });
    };
    // Solid buildings — large, textured, tower-like cover.
    let buildingSeed = 1;
    const building = (x: number, y: number, w: number, h: number, hp = 420) => {
      if (collidesWithAny(x, y, w, h, 24)) return;
      walls.push({
        x: x - w / 2,
        y: y - h / 2,
        w,
        h,
        hp,
        maxHp: hp,
        destructible: true,
        building: true,
        seed: buildingSeed++,
      });
    };

    // Check custom map layout style (Advanced Settings)
    const layoutStyle = this.loadout?.customMap?.layoutStyle || "default";
    if (layoutStyle === "open") {
      this.layoutOpen(building, cover, pillar, cx, cy);
    } else if (layoutStyle === "maze") {
      this.layoutMaze(building, cover, pillar, cx, cy);
    } else if (layoutStyle === "fortress") {
      this.layoutFortress(building, cover, pillar, cx, cy);
    } else if (layoutStyle === "scattered") {
      this.layoutScattered(building, cover, pillar, cx, cy);
    } else {
      // Default per-theme layout
      switch (this.sceneIndex) {
        case 1:
          this.layoutDesert(building, cover, pillar, cx, cy);
          break;
        case 2:
          this.layoutArctic(building, cover, pillar, cx, cy);
          break;
        case 3:
          this.layoutRuin(building, cover, pillar, cx, cy);
          break;
        case 4:
          this.layoutCyber(building, cover, pillar, cx, cy);
          break;
        case 5:
          this.layoutWildWest(building, cover, pillar, cx, cy);
          break;
        case 6:
          this.layoutJungle(building, cover, pillar, cx, cy);
          break;
        case 7:
          this.layoutArcticZone(building, cover, pillar, cx, cy);
          break;
        default:
          this.layoutNeon(building, cover, pillar, cx, cy);
          break;
      }
    }

    // Cover density modifier
    const density = this.loadout?.customMap?.density || "normal";
    if (density === "dense") {
      cover(cx - 380, cy - 80, 110, 24);
      cover(cx + 380, cy + 80, 110, 24);
      cover(cx - 180, cy - 240, 24, 110);
      cover(cx + 180, cy + 240, 24, 110);
    }

    if (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") {
      const baseArea = 2400 * 1200;
      const currentArea = this.worldW * this.worldH;
      const extraRatio = (currentArea / baseArea) - 1;
      if (extraRatio > 0.5) {
        // Scatter additional cover and buildings proportionately with strict collision checks
        const numExtra = Math.floor(extraRatio * 20);
        for (let i = 0; i < numExtra; i++) {
          const rx = 200 + Math.random() * (this.worldW - 400);
          const ry = 200 + Math.random() * (this.worldH - 400);
          
          // Keep center relatively clear
          if (Math.hypot(rx - cx, ry - cy) < 600) continue;
          
          if (Math.random() > 0.5) {
            const bw = 140 + Math.random() * 80;
            const bh = 120 + Math.random() * 60;
            if (!collidesWithAny(rx, ry, bw, bh, 36)) {
              building(rx, ry, bw, bh);
            }
          } else {
            const cw = 90 + Math.random() * 60;
            const ch = 40 + Math.random() * 30;
            if (!collidesWithAny(rx, ry, cw, ch, 30)) {
              cover(rx, ry, cw, ch);
            }
          }
        }
      }
    }

    // ---- invisible boundary "air walls" ----
    const TH = 80;
    const air = (x: number, y: number, w: number, h: number) =>
      walls.push({
        x,
        y,
        w,
        h,
        hp: Infinity,
        maxHp: Infinity,
        destructible: false,
        invisible: true,
      });
    air(-TH, -TH, TH, this.worldH + TH * 2); // left
    air(this.worldW, -TH, TH, this.worldH + TH * 2); // right
    air(-TH, -TH, this.worldW + TH * 2, TH); // top
    air(-TH, this.worldH, this.worldW + TH * 2, TH); // bottom

    return walls;
  }

  // ---------------------------------------------------------------------------
  // Per-map layout builders. `b` = building, `c` = cover wall, `p` = pillar.
  // ---------------------------------------------------------------------------

  /** 霓虹都市 — four corner towers, mid-field anchors, central pillar ring with balanced cover walls. */
  private layoutNeon(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(430, 320, 210, 160);
    b(1970, 320, 210, 160);
    b(430, 880, 210, 160);
    b(1970, 880, 210, 160);
    b(cx, 270, 200, 80); // top-center
    b(cx, 930, 200, 80); // bottom-center
    b(170, cy, 110, 180); // left-mid
    b(2230, cy, 110, 180); // right-mid
    c(cx - 350, cy - 130, 140, 26);
    c(cx + 350, cy + 130, 140, 26);
    p(cx - 180, cy - 120);
    p(cx + 180, cy - 120);
    p(cx - 180, cy + 120);
    p(cx + 180, cy + 120);
    p(cx, cy);
  }

  /** 沙漠废墟 — adobe compounds in the corners, a central alley of cover, diagonal sandbag walls. */
  private layoutDesert(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(400, 270, 180, 140);
    b(2000, 270, 180, 140);
    b(400, 930, 180, 140);
    b(2000, 930, 180, 140);
    b(160, cy, 110, 160); // left-mid ruin
    b(2240, cy, 110, 160); // right-mid ruin
    b(cx, 270, 190, 80); // top-center
    b(cx, 930, 190, 80); // bottom-center
    c(cx - 300, cy - 140, 140, 28);
    c(cx + 300, cy + 140, 140, 28);
    c(cx, cy - 170, 160, 28);
    c(cx, cy + 170, 160, 28);
    c(cx - 170, cy, 28, 160);
    c(cx + 170, cy, 28, 160);
    p(cx - 200, cy);
    p(cx + 200, cy);
    p(cx, cy);
  }

  /** 冰原基地 — Bunkers and research outposts safely clustered above and below the central railway. */
  private layoutArctic(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    // Corner Bunkers
    b(450, 260, 180, 140);
    b(1950, 260, 180, 140);
    b(450, 940, 180, 140);
    b(1950, 940, 180, 140);
    // North & South Station Outposts (clear of railway at cy!)
    b(740, cy - 180, 140, 130);
    b(1660, cy - 180, 140, 130);
    b(740, cy + 180, 140, 130);
    b(1660, cy + 180, 140, 130);
    // Base cover
    b(cx, 260, 190, 80);
    b(cx, 940, 190, 80);
    // Track crossing barrier walls
    c(cx - 240, cy - 80, 150, 26);
    c(cx + 240, cy + 80, 150, 26);
    c(cx, cy - 160, 190, 26);
    c(cx, cy + 160, 190, 26);
    p(cx - 180, cy - 120);
    p(cx + 180, cy + 120);
  }

  /** 末日废墟 — broken city blocks in the corners, scattered barrier walls & rubble pillars. */
  private layoutRuin(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(380, 260, 160, 140);
    b(640, 420, 140, 150);
    b(2020, 260, 160, 140);
    b(1760, 420, 140, 150);
    b(380, 940, 160, 140);
    b(640, 780, 140, 150);
    b(2020, 940, 160, 140);
    b(1760, 780, 140, 150);
    b(cx, 260, 190, 80); // top-center
    b(cx, 930, 190, 80); // bottom-center
    b(160, cy, 110, 170); // left-mid
    b(2240, cy, 110, 170); // right-mid
    c(cx - 280, cy - 140, 130, 26);
    c(cx + 280, cy + 140, 130, 26);
    p(cx - 160, cy - 120);
    p(cx + 160, cy - 120);
    p(cx - 160, cy + 120);
    p(cx + 160, cy + 120);
    p(cx, cy);
  }

  /** 赛博都市 — vertical towers, neon arches at center, balanced server nodes. */
  private layoutCyber(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(420, 340, 150, 260); // TL tower
    b(1980, 340, 150, 260); // TR tower
    b(420, 860, 150, 260); // BL tower
    b(1980, 860, 150, 260); // BR tower
    b(720, cy, 110, 200); // left-mid tower
    b(1680, cy, 110, 200); // right-mid tower
    b(cx, 270, 190, 90); // top-center
    b(cx, 930, 190, 90); // bottom-center
    c(cx, cy - 160, 170, 26); // top neon arch
    c(cx, cy + 160, 170, 26); // bottom neon arch
    p(cx - 220, cy);
    p(cx + 220, cy);
    p(cx, cy);
  }

  /** 西部牛仔 — Frontier town with saloon structures, central well, crate barriers. */
  private layoutWildWest(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(400, 270, 190, 140); // Saloon TL
    b(2000, 270, 190, 140); // Bank TR
    b(400, 930, 190, 140); // Sheriff BL
    b(2000, 930, 190, 140); // Hotel BR
    b(cx, 260, 180, 80); // Top storehouse
    b(cx, 940, 180, 80); // Bottom storehouse
    b(160, cy, 110, 170); // Left outpost
    b(2240, cy, 110, 170); // Right outpost
    // Wooden crate cover walls along the main street
    c(cx - 280, cy - 130, 130, 28);
    c(cx + 280, cy + 130, 130, 28);
    c(cx - 150, cy, 28, 140);
    c(cx + 150, cy, 28, 140);
    p(cx, cy); // Central well
    p(cx - 180, cy + 140);
    p(cx + 180, cy - 140);
  }

  /** 幽静丛林 — Overgrown stone temple ruins with mossy walls & ancient obelisks. */
  private layoutJungle(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(420, 280, 180, 150); // TL temple
    b(1980, 280, 180, 150); // TR temple
    b(420, 920, 180, 150); // BL temple
    b(1980, 920, 180, 150); // BR temple
    b(180, cy, 120, 170); // Left shrine
    b(2220, cy, 120, 170); // Right shrine
    b(cx, 260, 190, 80); // Top altar
    b(cx, 940, 190, 80); // Bottom altar
    // Mossy ruin walls
    c(cx - 260, cy - 150, 140, 28);
    c(cx + 260, cy + 150, 140, 28);
    c(cx, cy - 160, 180, 26);
    c(cx, cy + 160, 180, 26);
    p(cx - 200, cy - 120);
    p(cx + 200, cy - 120);
    p(cx - 200, cy + 120);
    p(cx + 200, cy + 120);
    p(cx, cy); // Central obelisk
  }

  /** 极寒地带 — Glacial research stations & shelters flanking the central railway. */
  private layoutArcticZone(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(430, 260, 180, 140); // TL ice shelter
    b(1970, 260, 180, 140); // TR ice shelter
    b(430, 940, 180, 140); // BL ice shelter
    b(1970, 940, 180, 140); // BR ice shelter
    b(750, cy - 180, 130, 130); // Left research node
    b(1650, cy - 180, 130, 130); // Right research node
    b(750, cy + 180, 130, 130); // Left lower shelter
    b(1650, cy + 180, 130, 130); // Right lower shelter
    b(cx, 260, 190, 80); // Top barrier
    b(cx, 940, 190, 80); // Bottom barrier
    c(cx - 280, cy - 80, 150, 26);
    c(cx + 280, cy + 80, 150, 26);
    c(cx, cy - 160, 180, 26);
    c(cx, cy + 160, 180, 26);
    p(cx - 180, cy - 120);
    p(cx + 180, cy + 120);
  }

  /** 自定义布局 — 开放竞技场 (Open Arena) */
  private layoutOpen(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number
  ) {
    b(420, 280, 160, 140);
    b(2000, 280, 160, 140);
    b(420, 920, 160, 140);
    b(2000, 920, 160, 140);
    c(cx - 240, cy - 120, 120, 26);
    c(cx + 240, cy + 120, 120, 26);
    p(cx - 150, cy);
    p(cx + 150, cy);
  }

  /** 自定义布局 — 迷宫巷战 (Labyrinth Maze Alley) */
  private layoutMaze(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number
  ) {
    b(450, 300, 150, 130);
    b(1950, 300, 150, 130);
    b(450, 900, 150, 130);
    b(1950, 900, 150, 130);
    b(820, 380, 140, 120);
    b(1580, 380, 140, 120);
    b(820, 820, 140, 120);
    b(1580, 820, 140, 120);
    c(cx - 220, cy - 140, 180, 26);
    c(cx + 220, cy + 140, 180, 26);
    c(cx - 140, cy + 80, 26, 160);
    c(cx + 140, cy - 80, 26, 160);
    c(cx, cy - 180, 140, 26);
    c(cx, cy + 180, 140, 26);
    p(cx, cy);
  }

  /** 自定义布局 — 堡垒要塞 (Fortress Stronghold) */
  private layoutFortress(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number
  ) {
    b(380, 270, 180, 150);
    b(2020, 270, 180, 150);
    b(380, 930, 180, 150);
    b(2020, 930, 180, 150);
    b(cx - 200, cy, 140, 160);
    b(cx + 200, cy, 140, 160);
    b(cx, 260, 200, 80);
    b(cx, 940, 200, 80);
    c(cx, cy - 140, 180, 28);
    c(cx, cy + 140, 180, 28);
    p(cx - 100, cy - 80);
    p(cx + 100, cy + 80);
  }

  /** 自定义布局 — 战术废墟 (Scattered Rubble) */
  private layoutScattered(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number
  ) {
    b(420, 290, 150, 130);
    b(1980, 290, 150, 130);
    b(420, 910, 150, 130);
    b(1980, 910, 150, 130);
    b(750, cy, 110, 150);
    b(1650, cy, 110, 150);
    c(cx - 300, cy - 120, 130, 26);
    c(cx + 300, cy + 120, 130, 26);
    c(cx - 150, cy + 130, 26, 130);
    c(cx + 150, cy - 130, 26, 130);
    p(cx - 180, cy);
    p(cx + 180, cy);
    p(cx, cy);
  }

  private attach() {
    if (!this.canvas) return;
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("wheel", this.boundWheel, {
      passive: false,
    });
    this.canvas.addEventListener("contextmenu", this.boundContext);
    document.addEventListener("pointerlockchange", this.boundLockChange);
    window.addEventListener("blur", this.boundBlur);
    window.addEventListener("resize", this.boundResize);
  }

  private detach() {
    if (!this.canvas) return;
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("wheel", this.boundWheel);
    this.canvas.removeEventListener("contextmenu", this.boundContext);
    document.removeEventListener("pointerlockchange", this.boundLockChange);
    window.removeEventListener("blur", this.boundBlur);
    window.removeEventListener("resize", this.boundResize);
  }

  private screenW = 1920;
  private screenH = 1080;

  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.screenW = Math.max(320, rect.width);
    this.screenH = Math.max(240, rect.height);

    // True Retro Low-Res Viewport (The Binding of Isaac / Enter the Gungeon / Nuclear Throne)
    // Scale factor: default 3.0 gives chunky retro pixels (~640x360), 4.0 gives super chunky (~480x270)
    const px = Math.max(1, this.pixelSize || 3);
    this.W = Math.max(320, Math.floor(this.screenW / px));
    this.H = Math.max(240, Math.floor(this.screenH / px));

    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx?.setTransform(1, 0, 0, 1, 0, 0);

    // Disable browser image smoothing so GPU upscales with nearest-neighbor crispness
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /** Window resize handler: refresh the canvas size. World bounds are fixed
   *  (every mode uses the expanded RUNTIME world), so there is nothing to
   *  re-sync here — the camera simply keeps following the player. */
  private onResize() {
    this.resize();
  }

  /** Retro pixel-art density: 1 = crisp/off, >1 = chunky pixel look. */
  public setPixelSize(sz: number) {
    const px = Math.max(1, Math.min(6, Math.floor(sz)));
    if (this.pixelSize === px) return;
    this.pixelSize = px;
    this.resize();
  }

  /** Retro pixel-art viewport is already scaled via low-res canvas buffer (W, H)
   *  with imageSmoothingEnabled = false and CSS image-rendering: pixelated.
   *  Bypassing synchronous CPU getImageData/putImageData eliminates frame stalls
   *  on low-end devices while preserving authentic crisp chunky pixels. */
  private pixelate() {
    // Hardware nearest-neighbor upscaling handles pixelation at full 60 FPS
  }

  public setQuality(q: "low" | "medium" | "high") {
    if (this.quality === q) return;
    this.quality = q;
    this.resize();
  }

  // ----------------------------------------------------------------- input
  private onKeyDown(e: KeyboardEvent) {
    sound.ensure();
    // ignore game hotkeys while typing in the dev console
    const ae = document.activeElement as HTMLElement | null;
    if (
      ae &&
      (ae.tagName === "INPUT" ||
        ae.tagName === "TEXTAREA" ||
        ae.tagName === "SELECT" ||
        ae.isContentEditable)
    )
      return;
    if (e.code === "KeyP" || e.code === "Escape") {
      // Pause / settings is a single-player convenience only. In multiplayer the
      // host is authoritative and the guest is a dumb mirror, so pausing would
      // just freeze both sides (and could desync). Keep it local-only.
      // We don't pause directly here — instead we ask the React layer to open the
      // in-game settings overlay, which then pauses the sim while it's open.
      if (this.mode === "local" && !this.gameOver) this.onPauseRequest?.();
      // 打开设置面板时退出鼠标锁定，否则菜单无法点击（Esc 浏览器也会自动退锁）
      if (this.pointerLocked) this.exitMouseLock();
      e.preventDefault();
      return;
    }
    // 桌面端：U 切换鼠标锁定（显示 / 隐藏光标）
    if (e.code === "KeyU" && !this.touchMode && !this.gameOver) {
      this.toggleMouseLock();
      e.preventDefault();
      return;
    }
    if (this.gameOver || this.paused) return;
    if (KEYS_MOVE.has(e.code) || e.code === "KeyF" || e.code === "KeyV") this.keys.add(e.code);

    // ---- guest: record intents, the host simulates them ----
    if (this.mode === "guest") {
      if (e.code === "KeyQ" || e.code === "Space") {
        this.pendSkill = true;
        this.localSkillCooldown();
        e.preventDefault();
      } else if (e.code === "KeyR") {
        this.pendReload = true;
      } else if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= this.gadgets.length) {
          // selecting only highlights the gadget; the host deploys on click
          this.selectGadget(n - 1);
          e.preventDefault();
        }
      } else if (e.code === "KeyE") {
        this.clearGadgetSelection();
        this.pendWeapon = true;
        e.preventDefault();
      }
      return;
    }

    if (e.code === "KeyQ" || e.code === "Space") {
      this.activateSkill();
      e.preventDefault();
    }
    if (e.code === "KeyR") this.reloadCurrent();
    // number keys 1/2/3 select (highlight) a carried gadget — deployment is on left-click
    if (e.code.startsWith("Digit")) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= this.gadgets.length) {
        this.selectGadget(n - 1);
        e.preventDefault();
      }
    }
    // E cycles weapons (and clears any selected gadget)
    if (e.code === "KeyE") {
      this.clearGadgetSelection();
      this.selectGun((this.gunIndex + 1) % this.guns.length);
      e.preventDefault();
    }
  }

  // ---- pointer lock (desktop aim-lock) ----
  requestMouseLock() {
    if (!this.touchMode && this.canvas && (this.canvas as any).requestPointerLock) {
      try { (this.canvas as any).requestPointerLock(); } catch {}
    }
  }
  exitMouseLock() {
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch {} }
  }
  toggleMouseLock() {
    if (document.pointerLockElement === this.canvas) this.exitMouseLock();
    else this.requestMouseLock();
  }
  isPointerLocked() { return this.pointerLocked; }
  private onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    if (this.pointerLocked && this.canvas) {
      // 进入锁定时从低分辨率画布中心开始，避免从旧的绝对坐标跳变
      this.cursorScreen.x = this.W / 2;
      this.cursorScreen.y = this.H / 2;
    }
    this.onPointerLock?.(this.pointerLocked);
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.W / Math.max(1, rect.width);
    const scaleY = this.H / Math.max(1, rect.height);
    if (this.pointerLocked) {
      // 锁定模式下增量累加
      this.cursorScreen.x += e.movementX * scaleX;
      this.cursorScreen.y += e.movementY * scaleY;
    } else {
      this.cursorScreen.x = (e.clientX - rect.left) * scaleX;
      this.cursorScreen.y = (e.clientY - rect.top) * scaleY;
    }
    this.cursorScreen.x = Math.max(0, Math.min(this.W, this.cursorScreen.x));
    this.cursorScreen.y = Math.max(0, Math.min(this.H, this.cursorScreen.y));
    this.mouse.x = this.cursorScreen.x + this.camX;
    this.mouse.y = this.cursorScreen.y + this.camY;
  }

  private onMouseDown(e: MouseEvent) {
    sound.ensure();
    // 桌面端：游玩时点击画面即把鼠标锁定在画面内（按 U / Esc 解除）
    if (!this.touchMode && !this.pointerLocked && document.pointerLockElement !== this.canvas) {
      this.requestMouseLock();
    }
    if (e.button === 0) {
      // If a gadget is selected, left-click deploys it at the aimed location
      // (instead of firing). Clicking again after deploying returns to firing.
      if (this.selectedGadget >= 0 && !this.gameOver && !this.paused) {
        const idx = this.selectedGadget;
        const g = this.gadgets[idx];
        if (g) {
          if (g.kind === "healing_beam" || g.kind === "rpg" || g.kind === "stun_gun") {
            // Weapon-like gadget, do NOT deploy or deselect immediately.
            // Let the firing logic in updatePlayer handle it.
            this.firing = true;
          } else {
            if (this.mode === "guest") {
              this.pendGadget = idx;
              this.gadgetCd.set(g.id, g.cooldown);
            } else if ((this.gadgetCd.get(g.id) ?? 0) <= 0) {
              this.deployGadget(idx, this.mouse.x, this.mouse.y);
            }
            this.selectedGadget = -1;
            e.preventDefault();
            return;
          }
        }
      }
      this.firing = true;
      this.semiAutoLatch = false; // fresh trigger pull allows a semi-auto shot
    }
    if (e.button === 2) {
      this.secondaryFiring = true;
      // ---- new melee weapons: custom right-click behaviors ----
      if (this.gun.id === "dual_blades" && !this.paused && !this.gameOver) {
        const p = this.player;
        const g = this.gun;
        p.bladeRaising = true;
        p.bladeReflectRange = g.reflectRange ?? 96;
        p.bladeReflectSelf = g.reflectSelfDamage ?? 0.05;
        p.bladeReflectGlow = g.glow;
        sound.swing(g.id);
        e.preventDefault();
        return;
      }
      if (this.gun.id === "thrust_sword" && !this.paused && !this.gameOver) {
        const p = this.player;
        p.thrustCharging = true;
        p.thrustCharge = 0;
        e.preventDefault();
        return;
      }
      if (this.gun.id === "throwing_knife" && !this.paused && !this.gameOver) {
        const p = this.player;
        p.knifeCharging = true;
        p.knifeCharge = 0;
        e.preventDefault();
        return;
      }
      // guest only records intent; host simulates the skill/shield/slam
      if (this.mode === "guest") {
        this.pendSkill = true;
        this.localSkillCooldown();
        e.preventDefault();
        return;
      }
      // ---- default right-click behaviors ----
      if (this.gun.id === "hammer" &&
        this.player.slamCd <= 0 &&
        !this.paused &&
        !this.gameOver
      ) {
        this.meleeSlam();
      } else if (this.gun.weaponClass === "shield" && !this.paused && !this.gameOver) {
        this.raiseShield();
      } else {
        this.activateSkill();
      }
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.firing = false;
      this.semiAutoLatch = false;
    } else if (e.button === 2) {
      this.secondaryFiring = false;
      // release the thrust longsword dash (if it was charging)
      if (this.player.thrustCharging) this.thrustRelease();
      // release the throwing knife charged throw (if it was charging)
      if (this.player.knifeCharging) this.knifeRelease();
      // lower the dual blades
      this.player.bladeRaising = false;
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const n = this.gadgets.length;
    if (n === 0) return;
    // scroll cycles the *selected* gadget (highlight only — no deploy)
    const cur = this.selectedGadget < 0 ? this.lastGadget : this.selectedGadget;
    const next = ((cur + dir) % n + n) % n;
    this.lastGadget = next;
    this.selectGadget(next);
  }

  // ------------------------------------------------------------------ loop
  private loop = (now: number) => {
    if (!this.running) return;
    const elapsed = (now - this.last) / 1000;
    this.last = now;
    // ---- optional frame-rate cap ----
    // Accumulate real elapsed time and only run a simulation+render step once
    // `fpsInterval` worth of time has built up. This caps CPU/GPU work on
    // high-refresh displays (e.g. 144Hz) down to the player's chosen 30/60/90.
    this.acc += elapsed;
    if (this.acc < this.fpsInterval) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    let dt = this.acc;
    if (dt > 0.1) dt = 0.1; // clamp so a backgrounded tab doesn't fast-forward
    this.acc = 0;
    if (!this.gameOver) this.update(dt);
    this.render();
    this.pixelate();
    this.hudAccum += dt;
    if (this.hudAccum > 0.06) {
      this.hudAccum = 0;
      this.emit(false);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].t += dt;
      if (this.effects[i].t > this.effects[i].duration) {
        this.effects.splice(i, 1);
      }
    }
    for (let i = this.meleeTrails.length - 1; i >= 0; i--) {
      this.meleeTrails[i].life -= dt;
      if (this.meleeTrails[i].life <= 0) {
        this.meleeTrails.splice(i, 1);
      }
    }
    
    if ((this.weather === "rain" || this.weather === "snow" || this.weather === "sandstorm") && Math.random() < 0.6) {
      for (let i = 0; i < (this.quality === "high" ? 4 : 2); i++) {
        const rx = this.localPlayer ? this.localPlayer.x + (Math.random() - 0.5) * 1800 : Math.random() * this.W;
        const ry = this.localPlayer ? this.localPlayer.y + (Math.random() - 0.5) * 1400 : Math.random() * this.H;
        let vx = 0, vy = 0, life = 1;
        if (this.weather === "rain") {
          vx = -300 - Math.random() * 100;
          vy = 800 + Math.random() * 200;
          life = 0.6;
        } else if (this.weather === "snow") {
          vx = (Math.random() - 0.5) * 150;
          vy = 150 + Math.random() * 100;
          life = 3.0;
        } else if (this.weather === "sandstorm") {
          vx = 900 + Math.random() * 500;
          vy = (Math.random() - 0.5) * 100;
          life = 1.2;
        }
        this.raindrops.push({ x: rx, y: ry, vx, vy, life, maxLife: life });
      }
    }
    for (let i = this.raindrops.length - 1; i >= 0; i--) {
      this.raindrops[i].x += this.raindrops[i].vx * dt;
      this.raindrops[i].y += this.raindrops[i].vy * dt;
      this.raindrops[i].life -= dt;
      if (this.raindrops[i].life <= 0) {
        this.raindrops.splice(i, 1);
      }
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  /** Set the target frame rate. Pass 0 to follow the display's refresh rate. */
  setTargetFps(fps: number) {
    this.fpsInterval = fps > 0 ? 1 / fps : 0;
    this.acc = 0;
  }

  // ---------------------------------------------------------------- update
  private update(dt: number) {
    if (this.damageLogs.length > 0 && !(this.player.deadTimer && this.player.deadTimer > 0)) {
      this.damageLogs = this.damageLogs.filter(l => this.time - l.timestamp <= DAMAGE_LOG_WINDOW);
    }
    let feedDirty = false;

    if (this.activeScoreFeed) {
      this.activeScoreFeed.timer -= dt;
      if (this.activeScoreFeed.timer <= 0) {
        this.activeScoreFeed = null;
        feedDirty = true;
      }
    }
    for (let i = this.killFeed.length - 1; i >= 0; i--) {
      this.killFeed[i].timer -= dt;
      if (this.killFeed[i].timer <= 0) {
        this.killFeed.splice(i, 1);
        feedDirty = true;
      }
    }
    if (feedDirty) {
      this.emit(true);
    }

    // ---- multiplayer: pump peer messages ----
    if (this.mode !== "local" && this.net) this.pumpNet();

    // ---- server-authoritative: both peers are thin input senders + snapshot
    // mirrors. No local world simulation runs here (the server is authoritative),
    // which keeps the client light and in lock-step with the server's view.
    if (this.authoritative) {
      if (this.newSnapArrived) {
        this.applySnapshot();
        this.newSnapArrived = false;
      }
      
      // Client-side prediction for local player movement in authoritative client
      let dx = 0;
      let dy = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      dx += this.virtualMove.x;
      dy += this.virtualMove.y;
      const vlen = Math.hypot(dx, dy) || 1;
      dx /= vlen;
      dy /= vlen;

      const p = this.player;
      // 冲撞转向：冲刺途中始终跟随鼠标方向实时改变冲刺方向（可自由转弯）
      if (p.isChargingSlam) {
        const speed = Math.hypot(p.dashVx, p.dashVy) || 800;
        const cur = Math.atan2(p.dashVy, p.dashVx);
        const desired = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
        let diff = desired - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-12 * dt, Math.min(12 * dt, diff)); // 转向速率 12 rad/s
        const na = cur + turn;
        p.dashVx = Math.cos(na) * speed;
        p.dashVy = Math.sin(na) * speed;
        // 不覆盖 p.angle：冲刺时枪口继续跟随鼠标，便于边冲边瞄准
      }
      if (p.thrustCharging) p.thrustCharge = (p.thrustCharge ?? 0) + dt;
      if (!p.deadTimer || p.deadTimer <= 0) {
        if (p.dashTime > 0) {
          p.dashTime -= dt;
          p.x += p.dashVx * dt;
          p.y += p.dashVy * dt;
        } else if (p.thrustDashActive) {
          this.stepThrustDash(dt);
        } else {
          const meleeMoveMult =
            (this.gun.weaponClass === "melee" ? 1.23 : 1) *
            (p.bladeRaising ? 0.85 : 1);
          const slow = (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) * (p.slowT && p.slowT > 0 ? 0.5 : 1);
          p.x += dx * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
          p.y += dy * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
        }
        const m = p.size;
        p.x = Math.max(m, Math.min(this.worldW - m, p.x));
        p.y = Math.max(m, Math.min(this.worldH - m, p.y));
        this.collideWalls(p, p.size);
        this.collideBase(p, p.size);
        this.collideBase(p, p.size, this.enemyBase);
      }

      this.gx = this.player.x;
      this.gy = this.player.y;
      this.gxInit = true;

      // local respawn countdown (server is authoritative on hp; we only display it)
      if (this.player.hp <= 0) {
        if (!this.player.deadTimer || this.player.deadTimer <= 0) this.player.deadTimer = RESPAWN_TIME;
        this.player.deadTimer = Math.max(0, this.player.deadTimer - dt);
        this.banner = { text: `你被击败 ${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
      } else {
        this.player.deadTimer = 0;
      }
      this.inpAccum += dt;
      if (this.inpAccum >= 1 / 30) {
        this.inpAccum = 0;
        this.sendInput();
      }
      this.camX = this.player.x - this.W / 2;
      this.camY = this.player.y - this.H / 2;
      this.updateParticles(dt);
      this.emit(false);
      return;
    }

    // ---- paused: freeze the simulation, but keep the network in sync ----
    // The host keeps streaming snapshots (so the guest sees the pause + can request
    // unpause); the guest keeps mirroring (so it notices when the host unpauses).
    if (this.paused) {
      if (this.mode === "host" && this.net) {
        this.snapAccum += dt;
        if (this.snapAccum >= 1 / 20) {
          this.snapAccum = 0;
          this.sendSnapshot();
        }
      } else if (this.mode === "guest") {
        if (this.newSnapArrived) {
          this.applySnapshot();
          this.newSnapArrived = false;
        }
      }
      return;
    }

    // ---- guest: no local simulation, just mirror the host snapshot ----
    if (this.mode === "guest") {
      if (this.newSnapArrived) {
        this.applySnapshot();
        this.newSnapArrived = false;
      }
      
      // Client-side prediction for local player movement
      let dx = 0;
      let dy = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      dx += this.virtualMove.x;
      dy += this.virtualMove.y;
      const vlen = Math.hypot(dx, dy) || 1;
      dx /= vlen;
      dy /= vlen;

      const p = this.player;
      // 冲撞转向：冲刺途中始终跟随鼠标方向实时改变冲刺方向（可自由转弯）
      if (p.isChargingSlam) {
        const speed = Math.hypot(p.dashVx, p.dashVy) || 800;
        const cur = Math.atan2(p.dashVy, p.dashVx);
        const desired = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
        let diff = desired - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-12 * dt, Math.min(12 * dt, diff)); // 转向速率 12 rad/s
        const na = cur + turn;
        p.dashVx = Math.cos(na) * speed;
        p.dashVy = Math.sin(na) * speed;
        // 不覆盖 p.angle：冲刺时枪口继续跟随鼠标，便于边冲边瞄准
      }
      if (p.thrustCharging) p.thrustCharge = (p.thrustCharge ?? 0) + dt;
      if (!p.deadTimer || p.deadTimer <= 0) {
        if (p.dashTime > 0) {
          p.dashTime -= dt;
          p.x += p.dashVx * dt;
          p.y += p.dashVy * dt;
        } else if (p.thrustDashActive) {
          this.stepThrustDash(dt);
        } else {
          const meleeMoveMult =
            (this.gun.weaponClass === "melee" ? 1.23 : 1) *
            (p.bladeRaising ? 0.85 : 1);
          const slow = (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) * (p.slowT && p.slowT > 0 ? 0.5 : 1);
          p.x += dx * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
          p.y += dy * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
        }
        const m = p.size;
        p.x = Math.max(m, Math.min(this.worldW - m, p.x));
        p.y = Math.max(m, Math.min(this.worldH - m, p.y));
        this.collideWalls(p, p.size);
        this.collideBase(p, p.size);
        this.collideBase(p, p.size, this.enemyBase);
      }

      this.gx = this.player.x;
      this.gy = this.player.y;
      this.gxInit = true;

      // mobile aim assist (guest + touch only): point the avatar at the nearest
      // threat so the on-screen fire button hits without a separate aim input.
      // The chosen world point is sent to the host as the aim (mx/my).
      if (this.touchMode) {
        const tgt = this.findAimTarget(this.player);
        if (tgt) {
          this.mouse.x = tgt.x;
          this.mouse.y = tgt.y;
        }
      }
      // local respawn countdown (host is authoritative on hp; we only display it)
      if (this.player.hp <= 0) {
        if (!this.player.deadTimer || this.player.deadTimer <= 0) this.player.deadTimer = RESPAWN_TIME;
        this.player.deadTimer = Math.max(0, this.player.deadTimer - dt);
        this.banner = { text: `你被击败 ${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
      } else {
        this.player.deadTimer = 0;
      }
      this.inpAccum += dt;
      if (this.inpAccum >= 1 / 30) {
        this.inpAccum = 0;
        this.sendInput();
      }
      this.camX = this.player.x - this.W / 2;
      this.camY = this.player.y - this.H / 2;
      this.updateParticles(dt);
      // tick local cooldown read-outs so the HUD shows gadget/skill/dash CD
      // correctly (the guest runs no world sim, so it must age these itself)
      for (const [k, v] of this.gadgetCd) {
        if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
      }
      if (this.skillCd > 0) this.skillCd -= dt;
      if (this.dashCharges < MAX_DASH_CHARGES) {
        this.dashRecharge += dt;
        if (this.dashRecharge >= DASH_RECHARGE) {
          this.dashRecharge = 0;
          this.dashCharges = Math.min(MAX_DASH_CHARGES, this.dashCharges + 1);
        }
      } else {
        this.dashRecharge = 0;
      }
      // emit(false): let the loop's ~16Hz throttle handle HUD updates (see above)
      this.emit(false);
      return;
    }

    // ---- deathmatch: simulate the human + 3 AI bots through the
    // same per-player combat code (context-switching in `simulateBot`) ----
    sound.setListenerPos(this.player.x, this.player.y);
    if (this.isDM) {
      this.activeId = this.mode === "local" ? 0 : this.selfPid;
      this.updatePlayer(dt);
      for (const c of this.combatants) if (c.isBot) this.simulateBot(c, dt);
    } else {
      this.updatePlayer(dt);
    }
    this.simulateWorld(dt);

    // ---- host: simulate the remote avatar + stream snapshots ----
    if (this.mode === "host") {
      this.tickRespawns(dt);
      // keep a live respawn banner up for the local (host) player while downed
      if (this.player.deadTimer && this.player.deadTimer > 0) {
        this.banner = { text: `你被击败 ${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
      }
      this.simulateRemote(dt);
      this.snapAccum += dt;
      if (this.snapAccum >= 1 / 20) {
        this.snapAccum = 0;
        this.sendSnapshot();
      }
      if (
        this.gameMode !== "biohazard" &&
        this.base.hp <= 0 &&
        !this.gameOver
      )
        this.endGame("基地失守");
    }

    // dash charge recharge
    if (this.dashCharges < MAX_DASH_CHARGES) {
      this.dashRecharge += dt;
      if (this.dashRecharge >= DASH_RECHARGE) {
        this.dashRecharge = 0;
        this.dashCharges = Math.min(MAX_DASH_CHARGES, this.dashCharges + 1);
      }
    } else {
      this.dashRecharge = 0;
    }

    // gadget cooldowns
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }

    if (this.skillCd > 0) this.skillCd -= dt;
    if (this.timewarp > 0) this.timewarp -= dt;
    if (this.hitSndCd > 0) this.hitSndCd -= dt;
    if (this.beamSndCd > 0) this.beamSndCd -= dt;
    if (this.flameSndCd > 0) this.flameSndCd -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }

    // ---- camera follows player ----
    const targetCamX = this.player.x - this.W / 2;
    const targetCamY = this.player.y - this.H / 2;
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 8);
    // Unclamped camera for strict following
    // this.camX = Math.max(0, Math.min(this.worldW - this.W, this.camX));
    // this.camY = Math.max(0, Math.min(this.worldH - this.H, this.camY));
  }

  private get gun(): GunDef {
    return this.guns[this.gunIndex];
  }

  private updateWeaponStates(dt: number) {
    for (const [id, s] of this.weaponStates) {
      const g = GUNS.find((x) => x.id === id);
      if (!g) continue;
      if (g.magazine && s.reload > 0) {
        s.reload -= dt;
        if (s.reload <= 0) {
          s.reload = 0;
          s.ammo = g.magazine;
          sound.reloadDone();
        }
      }
      // heat cooldown for beam, flamethrower & poison mist
      if (
        (g.weaponClass === "beam" ||
          g.weaponClass === "flamethrower" ||
          g.weaponClass === "poison_mist") &&
        s.heat > 0
      ) {
        const cool = s.overheated ? (g.coolRate ?? 0.5) * 0.85 : g.coolRate ?? 0.5;
        s.heat = Math.max(0, s.heat - cool * dt);
        if (s.overheated && s.heat < 0.3) s.overheated = false;
      }
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const g = this.gun;
    // 对手（机器人 / 远程玩家）行动时，其武器音效整体降低 20%，让玩家更清楚听见自己的
    sound.setEnemyDampen(this.simulatingOther);
    p.t += dt;
    // downed avatar waiting to respawn: freeze it (no movement / firing)
    if (p.deadTimer && p.deadTimer > 0) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    if (p.iframes > 0) p.iframes -= dt;
    if (p.flash > 0) p.flash -= dt * 3;
    if (p.shieldTime > 0) p.shieldTime -= dt;
    if (p.overdriveTime > 0) p.overdriveTime -= dt;
    if (p.slamCd > 0) p.slamCd -= dt;
    if (p.swingTimer > 0) p.swingTimer -= dt;
    if (p.slowT && p.slowT > 0) p.slowT -= dt;
    if (p.burnT && p.burnT > 0) {
      p.burnT -= dt;
      this.damagePlayerEntity(p, (p.burnDps ?? 30) * dt, undefined, 0, 0, p.burnOwnerId ?? -1, p.burnWeapon);
      if (Math.random() < 0.3) {
        this.spawnParticles(p.x, p.y, "#fb923c", 1, 50, 0.2);
      }
    }
    if (p.stunTime && p.stunTime > 0) p.stunTime -= dt;
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) p.comboStep = 0;
    }
    if (p.lunge > 0) p.lunge = Math.max(0, p.lunge - dt * 120);
    if (p.electrifiedTime && p.electrifiedTime > 0) p.electrifiedTime -= dt;
    if (p.skillEnergy !== undefined && p.skillEnergy > 0) {
      p.skillEnergy -= dt;
      if (p.skillEnergy <= 0) {
        p.isCloaked = false;
        p.winchActive = false;
        if (p.isChargingSlam) {
          p.isChargingSlam = false;
          this.triggerChargeSlamAOE(p, this.activeId);
        }
      }
    }
    
    // charge-slam dash (冲撞): deal fixed 120 contact damage to anything the player
    // overlaps while dashing forward (each entity is hit once per charge).
    if (p.isChargingSlam) {
      if (!p.slamHitIds) p.slamHitIds = new Set();
      const hitR = p.size + 12;
      this.buildGrid();
      const cand = this.queryGrid(p.x, p.y, hitR + this.gridMaxR + 4);
      for (const it of cand) {
        if (it.kind === "enemy") {
          const e = it.ref as Enemy;
          if (!p.slamHitIds.has(e.id)) {
            if (Math.hypot(e.x - p.x, e.y - p.y) < hitR + e.size) {
              p.slamHitIds.add(e.id);
              this.damageEnemy(e, 120, p.dashVx * 0.4, p.dashVy * 0.4, false, undefined, p.cid ?? this.activeId);
              this.screenshake(5);
              this.addExplosionEffect(e.x, e.y, 22, "#fb923c");
              sound.playHit();
            }
          }
        } else if (this.isDM && it.kind === "player" && it.ownerId !== (p.cid ?? this.activeId)) {
          const q = it.ref as Player;
          const targetId = it.ownerId ?? q.cid ?? -1;
          if (!this.isTeammate(p.cid ?? this.activeId, targetId) && (!q.deadTimer || q.deadTimer <= 0)) {
            if (!p.slamHitIds.has(`p_${targetId}`)) {
              if (Math.hypot(q.x - p.x, q.y - p.y) < hitR + q.size) {
                p.slamHitIds.add(`p_${targetId}`);
                this.damagePlayerEntity(q, 120, undefined, p.dashVx * 0.4, p.dashVy * 0.4, p.cid ?? this.activeId, "charge_slam");
                this.screenshake(5);
                this.addExplosionEffect(q.x, q.y, 24, "#fb923c");
                sound.playHit();
              }
            }
          }
        }
      }
    }

    // winch claw physical pull logic
    if (p.winchActive && p.winchX !== undefined && p.winchY !== undefined) {
      p.winchX += (p.winchVx ?? 0) * dt;
      p.winchY += (p.winchVy ?? 0) * dt;
      // return phase
      if ((p.skillEnergy ?? 0) <= this.getSkill("winch_claw").duration / 2) {
        const dx = p.x - p.winchX;
        const dy = p.y - p.winchY;
        const dist = Math.hypot(dx, dy) || 1;
        p.winchVx = (dx / dist) * 1200;
        p.winchVy = (dy / dist) * 1200;
      }
      
      // pull targets hit
      if ((p.skillEnergy ?? 0) > this.getSkill("winch_claw").duration / 2) {
        const enemies = this.queryGrid(p.winchX, p.winchY, 30);
        for (const it of enemies) {
          if (it.kind === "enemy") {
            const e = it.ref;
            if (!e.isBoss) {
               e.x = p.winchX;
               e.y = p.winchY;
            }
          } else if (it.kind === "player" && it.ownerId !== (p.cid ?? 1)) {
            const op = it.ref;
            op.x = p.winchX;
            op.y = p.winchY;
          }
        }
      } else {
        // pull back phase, we could also move caught targets back, but keeping it simple for now (they are dragged to player by the winch coordinates matching them).
        const enemies = this.queryGrid(p.winchX, p.winchY, 40);
        for (const it of enemies) {
          if (it.kind === "enemy") {
            const e = it.ref;
            if (!e.isBoss) {
               e.x = p.winchX;
               e.y = p.winchY;
            }
          } else if (it.kind === "player" && it.ownerId !== (p.cid ?? 1)) {
            const op = it.ref;
            op.x = p.winchX;
            op.y = p.winchY;
          }
        }
      }
    }
    // thrust longsword charge / release management
    if (this.gun.id === "thrust_sword") {
      if (this.secondaryFiring && !p.thrustDashActive) {
        if (!p.thrustCharging) {
          p.thrustCharging = true;
          p.thrustCharge = 0;
        }
      } else {
        if (p.thrustCharging) {
          this.thrustRelease();
        }
      }
    } else {
      p.thrustCharging = false;
    }

    if (p.thrustCharging) p.thrustCharge = (p.thrustCharge ?? 0) + dt;

    // throwing knife: charge while right-click held, throw on release
    if (this.gun.id === "throwing_knife") {
      if (this.secondaryFiring) {
        if (!p.knifeCharging) {
          p.knifeCharging = true;
          p.knifeCharge = 0;
        }
      } else if (p.knifeCharging) {
        this.knifeRelease();
      }
      if (p.knifeCharging) p.knifeCharge = (p.knifeCharge ?? 0) + dt;
    } else {
      p.knifeCharging = false;
    }

    // dual blades parry / reflect management
    if (this.gun.id === "dual_blades") {
      if (this.secondaryFiring) {
        if (!p.bladeRaising) {
          p.bladeRaising = true;
          p.bladeReflectRange = this.gun.reflectRange ?? 96;
          p.bladeReflectSelf = this.gun.reflectSelfDamage ?? 0.05;
          p.bladeReflectGlow = this.gun.glow;
        }
      } else {
        p.bladeRaising = false;
      }
    } else {
      p.bladeRaising = false;
    }

    let dx = 0;
    let dy = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // on-screen joystick (mobile) — combined with keyboard WASD (desktop)
    dx += this.virtualMove.x;
    dy += this.virtualMove.y;
    const vlen = Math.hypot(dx, dy) || 1;
    dx /= vlen;
    dy /= vlen;

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      if (p.isChargingSlam && (dx !== 0 || dy !== 0)) {
        const curAng = Math.atan2(p.dashVy, p.dashVx);
        const targetAng = Math.atan2(dy, dx);
        const diff = this.angleDiff(targetAng, curAng);
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 8 * dt);
        const newAng = curAng + step;
        const sp = Math.hypot(p.dashVx, p.dashVy) || 800;
        p.dashVx = Math.cos(newAng) * sp;
        p.dashVy = Math.sin(newAng) * sp;
        p.angle = newAng;
      }
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      this.spawnParticles(p.x, p.y, this.character.bodyColor, 2, 60);
    } else if (p.thrustDashActive) {
      this.stepThrustDash(dt);
    } else {
      // melee weapons get +23% move speed; raising the dual blades costs -15%
      const meleeMoveMult =
        (this.gun.weaponClass === "melee" ? 1.23 : 1) *
        (p.bladeRaising ? 0.85 : 1);
      const slow =
        (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) *
        (p.slowT && p.slowT > 0 ? 0.5 : 1);
      p.x += dx * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
      p.y += dy * p.speed * slow * meleeMoveMult * RUNTIME.playerSpeedMult * dt;
    }

    const m = p.size;
    p.x = Math.max(m, Math.min(this.worldW - m, p.x));
    p.y = Math.max(m, Math.min(this.worldH - m, p.y));
    this.collideWalls(p, p.size);
    this.collideBase(p, p.size);
    this.collideBase(p, p.size, this.enemyBase);
    p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

    // mobile aim assist (touch only): auto-lock onto the nearest threat so the
    // player can move with the joystick and fire with the on-screen button
    // without needing a separate aim input. Desktop never uses this.
    if (this.touchMode) {
      const tgt = this.findAimTarget(p);
      if (tgt) p.angle = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    }

    // weapon handling
    p.fireTimer -= dt;
    
    // Check if we have a weapon-gadget equipped
    let usingGadgetWeapon = false;
    if (this.selectedGadget >= 0) {
      const gDef = this.gadgets[this.selectedGadget];
      if (gDef && (gDef.kind === "healing_beam" || gDef.kind === "rpg" || gDef.kind === "stun_gun")) {
        usingGadgetWeapon = true;
        this.updateGadgetWeapon(dt, gDef, this.firing && !this.paused);
      }
    }
    
    const ws = this.weaponStates.get(g.id)!;
    const fr =
      g.fireRate *
      this.character.fireRateMult *
      (1 + (this.outfit.fireRateBonus ?? 0)) *
      (p.overdriveTime > 0 ? 1.7 : 1);

    // gatling spin-up: spool the barrel while firing, decay when not
    let spun = true;
    if (g.spinup) {
      if (this.firing && !usingGadgetWeapon)
        ws.spin = Math.min(1, (ws.spin ?? 0) + dt / g.spinup);
      else ws.spin = Math.max(0, (ws.spin ?? 0) - dt / (g.spinDown ?? 0.8));
      spun = (ws.spin ?? 0) > 0.12;
    }

    if (usingGadgetWeapon) {
      // normal weapon handling bypassed
    } else if (g.weaponClass === "beam") {
      this.updateBeam(dt, this.firing && !this.paused, ws);
    } else if (g.weaponClass === "flamethrower") {
      this.updateFlamethrower(dt, this.firing && !this.paused, ws);
    } else if (g.weaponClass === "poison_mist") {
      this.updatePoisonMist(dt, this.firing && !this.paused, ws);
    } else {
      const blocked =
        (g.magazine !== undefined && (ws.reload > 0 || ws.ammo <= 0)) ||
        false;

      if (g.weaponClass === "bow") {
        this.updateBow(dt, this.firing, ws);
      } else if (g.weaponClass === "shield") {
        this.updateShield(dt);
        // left-click melee swing
        if (this.firing && p.fireTimer <= 0 && p.shieldBlockTime <= 0) {
          this.meleeLight();
          p.fireTimer = 1 / fr;
        }
      } else if (
        this.firing &&
        p.fireTimer <= 0 &&
        !blocked &&
        (!g.semiAuto || !this.semiAutoLatch) &&
        spun
      ) {
        if (g.weaponClass === "ranged") this.fireGun(ws);
        else this.meleeLight();
        // gatling spins up over time — effective fire rate scales with spin
        const effFr = g.spinup ? fr * (ws.spin ?? 0) : fr;
        p.fireTimer = 1 / Math.max(0.0001, effFr);
        if (g.semiAuto) this.semiAutoLatch = true;
      }
      if (g.magazine !== undefined && ws.ammo <= 0 && ws.reload <= 0) {
        ws.reload = g.reloadTime ?? 1.5;
        sound.reload();
      }
    }

    // ---- out-of-compass regen (breathing heal) ----
    if (
      p.hp > 0 &&
      p.hp < p.maxHp &&
      this.time - p.lastHitTime > RUNTIME.breathingDelay
    ) {
      p.hp = Math.min(p.maxHp, p.hp + RUNTIME.breathingRate * dt);
    }
  }

  private fireGun(ws: WeaponState) {
    const p = this.player;
    const g = this.gun;
    if (p.isCloaked) p.isCloaked = false; // 开火自动破隐
    // gatling: damage ramps with spin-up (weak until the barrel is spooled)
    const spinMult = g.spinup
      ? (g.spinMinMult ?? 0.2) + (1 - (g.spinMinMult ?? 0.2)) * (ws.spin ?? 0)
      : 1;
    const dmg = g.damage * this.character.damageMult * spinMult;
    const base = p.angle;
    const perp = base + Math.PI / 2;
    const useParallel = (g.parallel ?? 1) > 1;
    const gap = g.parallelGap ?? 8;
    const drift = g.drift ?? 0;
    // burst fire: a semi-auto weapon with `burst` fires that many rounds per
    // trigger pull (e.g. the plasma rifle's 3-round burst), fanned slightly.
    const burstCount = g.burst ?? 1;
    for (let bI = 0; bI < burstCount; bI++) {
      const burstSpread =
        burstCount > 1 ? (bI - (burstCount - 1) / 2) * (g.burstSpread ?? 0.06) : 0;
      for (let i = 0; i < g.pellets; i++) {
        let a: number;
        let bx: number;
        let by: number;
        let driftX = 0;
        let driftY = 0;
        if (useParallel) {
          // parallel side-by-side shots that drift apart as they travel
          const off = i - (g.pellets - 1) / 2;
          const lateral = off * gap;
          bx = p.x + Math.cos(base) * (p.size + g.barrel) + Math.cos(perp) * lateral;
          by = p.y + Math.sin(base) * (p.size + g.barrel) + Math.sin(perp) * lateral;
          a = base;
          const sign = off === 0 ? (i % 2 ? 1 : -1) : Math.sign(off);
          driftX = Math.cos(perp) * drift * sign;
          driftY = Math.sin(perp) * drift * sign;
        } else if (g.pellets > 1) {
          const off = (i / (g.pellets - 1) - 0.5) * 2 * g.spread;
          a = base + off + (Math.random() - 0.5) * g.spread * 0.35 + burstSpread;
          bx = p.x + Math.cos(a) * (p.size + g.barrel);
          by = p.y + Math.sin(a) * (p.size + g.barrel);
        } else {
          a = base + (Math.random() - 0.5) * g.spread + burstSpread;
          bx = p.x + Math.cos(a) * (p.size + g.barrel);
          by = p.y + Math.sin(a) * (p.size + g.barrel);
        }
        // 投射榴弹炮：不发射平行弹药，而是向瞄准落点抛射（z 轴抛物线），落地爆炸
        if (g.id === "mortar") {
          const tgt = this.mortarTarget(g);
          const dist = Math.hypot(tgt.x - bx, tgt.y - by);
          const dur = 0.5 + Math.min(0.9, dist / 1400);
          this.bullets.push({
            x: bx, y: by, vx: 0, vy: 0,
            life: dur + 0.2,
            damage: dmg,
            size: (g.bulletSize ?? 8) + 2,
            color: g.color, glow: g.glow,
            pierce: 0, knockback: g.knockback,
            explosive: false,
            explosionRadius: g.explosionRadius ?? 70,
            kind: "mortar",
            hit: new Set<number>(),
            owner: this.player === this.foe ? "foe" : "self",
          ownerId: this.activeId,
            trail: false,
            lobSx: bx, lobSy: by, lobTx: tgt.x, lobTy: tgt.y,
            lobDur: dur, lobT: 0, lobPeak: 50 + dist * 0.18,
            weapon: g.id,
          });
          continue;
        }
        if (g.kind === "boomerang") {
      // cap simultaneous live boomerangs owned by this player at 3
      const liveBoom = this.bullets.reduce(
        (n, b) => n + (b.kind === "boomerang" && b.ownerId === this.activeId && (b.life ?? 0) > 0 ? 1 : 0),
        0
      );
      if (liveBoom >= 3) continue;
      const bsp = g.bulletSpeed * 1.2 * (0.92 + Math.random() * 0.12);
      const outDist = g.range ?? 240;
      this.bullets.push({
        x: bx, y: by,
        vx: Math.cos(base) * bsp, vy: Math.sin(base) * bsp,
        life: g.life,
        damage: dmg,
        size: g.bulletSize ?? 11,
        color: g.color, glow: g.glow,
        pierce: 999, knockback: g.knockback ?? 0,
        explosive: false, explosionRadius: 0,
        kind: "boomerang",
        hit: new Set(),
        owner: this.player === this.foe ? "foe" : "self",
        ownerId: this.activeId,
        trail: false, ignoreWalls: true, weapon: g.id,
        boomerang: true, outDist, returning: false, traveled: 0, boomSpeed: bsp,
      });
      continue;
    }
      if (g.kind === "knife") {
        const kdmg = (this.knifeChargingActive ? Math.round(g.damage * 1.3) : g.damage) * this.character.damageMult * spinMult;
        for (let k = 0; k < 2; k++) {
          const ka = base + (k === 0 ? -0.035 : 0.035) + (Math.random() - 0.5) * g.spread;
          const kx = p.x + Math.cos(ka) * (p.size + g.barrel);
          const ky = p.y + Math.sin(ka) * (p.size + g.barrel);
          const ksp = g.bulletSpeed * 1.2 * (0.92 + Math.random() * 0.12);
          this.bullets.push({
            x: kx, y: ky,
            vx: Math.cos(ka) * ksp, vy: Math.sin(ka) * ksp,
            life: g.life, damage: kdmg, size: g.bulletSize,
            color: g.color, glow: g.glow, pierce: g.pierce, knockback: g.knockback,
            explosive: false, explosionRadius: 0, kind: "knife",
            hit: new Set(), owner: this.player === this.foe ? "foe" : "self",
            ownerId: this.activeId, trail: true, weapon: g.id,
          });
        }
        continue;
      }
    const sp = g.bulletSpeed * 1.2 * (0.92 + Math.random() * 0.12);
        this.bullets.push({
          x: bx,
          y: by,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          driftX,
          driftY,
          life: g.life,
          damage: dmg,
          size: g.bulletSize,
          color: g.color,
          glow: g.glow,
          pierce: g.pierce,
          knockback: g.knockback,
          explosive: !!g.explosive,
          explosionRadius: g.explosionRadius ?? 0,
          kind: g.kind,
          hit: new Set(),
          owner: this.player === this.foe ? "foe" : "self",
          ownerId: this.activeId,
          trail: g.kind === "tracer",
          bounces: g.bounces,
          // wall-piercing chance (plasma rifle): each bullet may pass through walls
          ignoreWalls: g.wallPierceChance ? Math.random() < g.wallPierceChance : g.ignoreWalls,
          weapon: g.id,
        });
      }
      if (g.magazine !== undefined) ws.ammo -= 1;
    }
    sound.shoot(g.id, p.x, p.y);
    this.spawnParticles(
      p.x + Math.cos(base) * (p.size + g.barrel),
      p.y + Math.sin(base) * (p.size + g.barrel),
      g.glow,
      g.pellets > 1 ? 6 : 3,
      140,
      0.25
    );
    if (this.quality === "high") {
      const bx = p.x + Math.cos(base) * (p.size + g.barrel);
      const by = p.y + Math.sin(base) * (p.size + g.barrel);
      for (let k = 0; k < 3; k++) {
        const flashAng = base + (Math.random() - 0.5) * 0.45;
        const spd = 100 + Math.random() * 120;
        this.particles.push({
          x: bx, y: by,
          vx: Math.cos(flashAng) * spd,
          vy: Math.sin(flashAng) * spd,
          life: 0.12, maxLife: 0.12,
          size: 2.5 + Math.random() * 3,
          color: "#ffffff",
          shape: "circle",
        });
      }
    }
    if (g.id === "rocket" || g.id === "sniper" || g.id === "fcar" || g.id === "sa1216" || g.id === "mgl32" || g.id === "mortar") {
      p.x -= Math.cos(base) * 3;
      p.y -= Math.sin(base) * 3;
      // shake only when player is hit (per user request)
      // if (!this.simulatingOther) this.shake = Math.min(14, this.shake + (g.id === "rocket" || g.id === "mgl32" ? 7 : 4));
    }
    // point-blank "swat" — a monster clinging to the avatar (e.g. the biohazard
    // crawler that rushes the face) overlaps the player, so a normally-spawned
    // bullet starts at the muzzle already outside its hitbox and can never
    // connect. Firing still deals this damage so such attackers stay killable.
    this.swatPointBlank(g.damage * this.character.damageMult, g.knockback ?? 0);
  }

  /** Point-blank "swat": deal damage to any enemy whose body overlaps the player.
   *  See the call site in fireGun for why this is needed. Also used by the bow. */
  private swatPointBlank(dmg: number, knockback: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.spawnT < 1) continue;
      const rr = e.size + p.size + 5;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy <= rr * rr) {
        const ang = Math.atan2(dy, dx) || p.angle;
        this.damageEnemy(
          e,
          dmg,
          Math.cos(ang) * knockback,
          Math.sin(ang) * knockback,
          false,
          { weapon: "swat", dx: Math.cos(ang), dy: Math.sin(ang) }
        );
      }
    }
  }

  /** Clamped mortar landing point. The landing is the aim point clamped to the
   *  weapon's max lob range (g.range) around the firing player, then kept inside
   *  the world. Shared by firing and the deployable-style aim indicator so the
   *  shell always lands where the marker shows — never at the raw mouse when the
   *  cursor is past the max-range ring. */
  private mortarTarget(g: GunDef): { x: number; y: number; maxD: number; beyond: boolean } {
    const p = this.player;
    const maxD = g.range ?? (g.bulletSpeed ?? 500) * (g.life ?? 2) * 0.9;
    let dx = this.mouse.x - p.x;
    let dy = this.mouse.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const beyond = d > maxD;
    if (beyond) {
      dx = (dx / d) * maxD;
      dy = (dy / d) * maxD;
    }
    return {
      x: Math.max(20, Math.min(this.worldW - 20, p.x + dx)),
      y: Math.max(20, Math.min(this.worldH - 20, p.y + dy)),
      maxD,
      beyond,
    };
  }

  // ------------------------------------------------------------- melee
  /** The human opponent of whoever is currently `this.player` (the melee attacker). */
  /** Geometrically test whether a circle (cx, cy, r) intersects a 2D sector area wedge
   *  centered at (px, py) with radius R, direction angle `dirAngle`, and sweep arc `arc`. */
  private sectorIntersectsCircle(
    px: number, py: number,
    cx: number, cy: number, r: number,
    R: number, dirAngle: number, arc: number,
    pSize: number
  ): boolean {
    const dx = cx - px;
    const dy = cy - py;
    const distSq = dx * dx + dy * dy;
    const maxDist = R + r;
    if (distSq > maxDist * maxDist) return false;

    const dist = Math.sqrt(distSq);
    // 1. Point-blank / body touch check (if enemy overlaps player, always hit!)
    if (dist <= r + pSize * 0.8) return true;

    // 2. Sector interior angle test (center inside the wedge)
    const centerAng = Math.atan2(dy, dx);
    const diff = Math.abs(this.angleDiff(centerAng, dirAngle));
    if (diff <= arc / 2) return true;

    // 3. Boundary rays intersection test (distance from circle center to sector edge rays)
    const halfArc = arc / 2;
    const rayAngles = [dirAngle - halfArc, dirAngle + halfArc];
    for (const a of rayAngles) {
      const rx = Math.cos(a);
      const ry = Math.sin(a);
      const proj = dx * rx + dy * ry;
      if (proj >= 0 && proj <= R) {
        const perpDistSq = distSq - proj * proj;
        if (perpDistSq <= r * r) return true;
      }
    }
    return false;
  }

  private meleeOpponent(): Player | null {
    if (this.isDM) {
      let best: Player | null = null;
      let bestD = Infinity;
      for (const c of this.combatants) {
        if (c.id === this.activeId) continue;
        const q = c.player;
        if (q.deadTimer && q.deadTimer > 0) continue;
        const d = (q.x - this.player.x) ** 2 + (q.y - this.player.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
      return best;
    }
    if (!this.foe || !this.localPlayer) return null;
    // during host simulation this.player === this.foe (we're simulating the foe),
    // so the target is the host's own avatar
    if (this.player === this.foe) return this.localPlayer;
    return this.foe;
  }

  private meleeLight() {
    const g = this.gun;
    const p = this.player;
    const range = g.meleeRange ?? 60;
    const arc = g.meleeArc ?? 2;
    let dmg = g.damage * this.character.damageMult;
    const isSpear = g.id === "spear";
    const isSaber = g.id === "lightsaber";
    const isWhip = !!g.whip;
    const isDual = g.id === "dual_blades";
    const slowOnHit = g.slowOnHit ?? 0;
    sound.swing(g.id);
    p.swingTimer = p.swingDur;

    // lightning whip: alternate the swing side left/right so it reads as a
    // fast slashing whip. The hit arc stays wide so coverage is consistent.
    let swingAngle = p.angle;
    if (isWhip) {
      this.whipToggle = !this.whipToggle;
      swingAngle = p.angle + (this.whipToggle ? 0.55 : -0.55);
    }

    // spear combo: each step lunges forward and narrows arc into a thrust
    if (isSpear) {
      p.comboStep = (p.comboStep + 1) % (g.comboLength ?? 3);
      p.comboTimer = 1.2;
      // lunge forward
      const lungeDist = 46 + p.comboStep * 18;
      p.x += Math.cos(p.angle) * lungeDist;
      p.y += Math.sin(p.angle) * lungeDist;
      p.x = Math.max(p.size, Math.min(this.W - p.size, p.x));
      p.y = Math.max(p.size, Math.min(this.H - p.size, p.y));
      p.lunge = 14;
      p.iframes = Math.max(p.iframes, 0.12);
    }

    // dual blades combo: flashy flurry with segmented damage per step
    // (steps: 1-2 = 55, 3-4 = 70, 5 = 200). Alternates swing side for flair.
    if (isDual) {
      p.comboStep += 1;
      if (p.comboStep > (g.comboLength ?? 5)) p.comboStep = 1;
      p.comboTimer = 1.0;
      const arr = g.comboDamage ?? [g.damage];
      const step = Math.min(p.comboStep, arr.length);
      dmg = arr[step - 1] * this.character.damageMult;
      this.whipToggle = !this.whipToggle;
      swingAngle = p.angle + (this.whipToggle ? 0.5 : -0.5);
      // visual lunge on the heavy finisher
      if (p.comboStep >= (g.comboLength ?? 5)) {
        p.lunge = 16;
      }
    }

    const dmgMult = isSpear ? 1 + p.comboStep * 0.35 : 1;
    const hitRange = (range + p.size) * (isDual && p.comboStep === 5 ? 1.35 : 1.0);
    const hitArc = Math.max(arc, 2.3);

    this.effects.push({
      type: isWhip ? "whip" : isSaber ? "saberswing" : isDual ? "dual_slash" : "slash",
      x: p.x,
      y: p.y,
      angle: swingAngle,
      arc: isWhip ? this.whipToggle ? 0.6 : -0.6 : arc,
      range: range * (isDual && p.comboStep === 5 ? 1.3 : 1.0),
      t: 0,
      duration: isWhip ? 0.08 : 0.12,
      color: g.glow || g.color,
      radius: range * (isDual && p.comboStep === 5 ? 1.3 : 1.0),
    });

    if (isSaber || g.id === "thrust_sword") {
      this.meleeTrails.push({
        x: p.x, y: p.y, angle: swingAngle, weapon: g.id,
        life: 0.25, maxLife: 0.25, arc: isWhip ? (this.whipToggle ? 0.6 : -0.6) : arc, range: range * (isDual && p.comboStep === 5 ? 1.3 : 1.0)
      });
    }

    for (const e of this.enemies) {
      if (this.sectorIntersectsCircle(p.x, p.y, e.x, e.y, e.size, hitRange, swingAngle, hitArc, p.size)) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const ang = Math.atan2(dy, dx);
        this.damageEnemy(e, dmg * dmgMult, 0, 0, false, { weapon: g.id, dx: Math.cos(ang), dy: Math.sin(ang) });
        if (isSaber) {
          e.electrifiedTime = 0.7;
          e.electrifiedGlow = g.glow;
        }
        if (isWhip && slowOnHit > 0) {
          e.slowT = Math.max(e.slowT, slowOnHit);
        }
      }
    }
    // player-vs-player / bot melee
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0)) {
      if (this.sectorIntersectsCircle(p.x, p.y, opp.x, opp.y, opp.size, hitRange, swingAngle, hitArc, p.size)) {
        this.damagePlayerEntity(opp, dmg * dmgMult, undefined, 0, 0, this.activeId, g.id);
        if (isSaber) {
          opp.electrifiedTime = 0.7;
          opp.electrifiedGlow = g.glow;
        }
        if (isWhip && slowOnHit > 0) {
          opp.slowT = Math.max(opp.slowT ?? 0, slowOnHit);
        }
      }
    }
    // deployables (turrets / mines / stations) melee hit check
    const candDeployables = this.queryGrid(p.x, p.y, hitRange + this.gridMaxR + 4)
      .filter((it) => it.kind === "deployable");
    for (const it of candDeployables) {
      const d = it.ref as Deployable;
      if (this.isTeammate(this.activeId, d.ownerId)) continue;
      if (this.sectorIntersectsCircle(p.x, p.y, d.x, d.y, d.size, hitRange, swingAngle, hitArc, p.size)) {
        this.damageDeployable(d, dmg * dmgMult, this.activeId);
      }
    }
    for (const w of this.walls) {
      if (!w.destructible) continue;
      if (w.building && g.id !== "hammer") continue;
      const cx = Math.max(w.x, Math.min(p.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(p.y, w.y + w.h));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d <= hitRange) {
        const ang = Math.atan2(cy - p.y, cx - p.x);
        if (Math.abs(this.angleDiff(ang, p.angle)) <= hitArc / 2) {
          this.damageWall(w, g.id === "hammer" ? 40 : 16);
        }
      }
    }
  }

  private meleeSlam() {
    const g = this.gun;
    const p = this.player;
    const radius = g.explosionRadius ?? 90;
    const dmg = (g.slamDamage ?? 110) * this.character.damageMult;
    p.slamCd = 1.4;
    this.effects.push({
      type: "slam",
      x: p.x,
      y: p.y,
      t: 0,
      duration: 0.45,
      radius,
      color: g.glow,
    });
    // shake only when player is hit
    // if (!this.simulatingOther) this.shake = 17;
    sound.slam();
    this.spawnParticles(p.x, p.y, g.glow, 28, 280, 0.5);
    this.spawnParticles(p.x, p.y, "#fde68a", 16, 200, 0.4);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= radius + e.size) {
        const fall = 1 - d / (radius + e.size);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, dmg * (0.55 + fall * 0.5), 0, 0, false, { weapon: g.id, dx: Math.cos(a), dy: Math.sin(a) });
      }
    }
    // player-vs-player slam (hammer)
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0)) {
      const d = Math.hypot(opp.x - p.x, opp.y - p.y);
      if (d <= radius + opp.size) {
        const fall = 1 - d / (radius + opp.size);
        this.damagePlayerEntity(opp, dmg * (0.55 + fall * 0.5), undefined, 0, 0, this.activeId, g.id);
      }
    }
    // deployable slam damage
    const candDeployables = this.queryGrid(p.x, p.y, radius + this.gridMaxR + 4)
      .filter((it) => it.kind === "deployable");
    for (const it of candDeployables) {
      const d = it.ref as Deployable;
      if (this.isTeammate(this.activeId, d.ownerId)) continue;
      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (dist <= radius + d.size) {
        const fall = 1 - dist / (radius + d.size);
        this.damageDeployable(d, dmg * (0.55 + fall * 0.5), this.activeId);
      }
    }
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.destructible && this.rectCircleOverlap(w, p.x, p.y, radius)) {
        this.breakWall(w, i);
      }
    }
  }

  // ------------------------------------------------------------- thrust longsword (突刺长剑)
  /** Release the charged dash for the thrust sword (called on right-click up). */
  private thrustRelease() {
    const p = this.player;
    const g = this.gun;
    p.thrustCharging = false;
    const charge = p.thrustCharge ?? 0;
    p.thrustCharge = 0;
    if (g.id !== "thrust_sword") return;
    // require at least chargeMin seconds of charge before the dash can fire
    if (charge < (g.chargeMin ?? 0.5)) return;
    const ang = p.angle;
    const dist = g.chargeDashDist ?? 200;
    const dmg = (g.chargeDashDamage ?? 140) * this.character.damageMult;
    const sp = 900; // dash speed (px/s)
    p.thrustDashActive = true;
    p.thrustDashAngle = ang;
    p.thrustDashLeft = dist;
    p.thrustDashVx = Math.cos(ang) * sp;
    p.thrustDashVy = Math.sin(ang) * sp;
    p.thrustDashDmg = dmg;
    p.thrustHitIds = new Set();
    p.iframes = Math.max(p.iframes, 0.18);
    sound.swing(g.id);
    this.spawnParticles(p.x, p.y, g.glow, 14, 280, 0.4);
    this.effects.push({
      type: "slash",
      x: p.x,
      y: p.y,
      angle: ang,
      arc: 0.5,
      range: g.chargeDashRange ?? 34,
      duration: 0.18,
      radius: g.chargeDashRange ?? 34,
      color: g.glow,
    });
    this.effects.push({
      type: "dash",
      x: p.x,
      y: p.y,
      angle: ang,
      arc: 0,
      range: dist,
      t: 0,
      duration: 0.15,
      radius: g.chargeDashRange ?? 34,
    });
    this.meleeTrails.push({
      x: p.x, y: p.y, angle: ang, weapon: g.id,
      life: 0.35, maxLife: 0.35, length: dist
    });
  }

  /** Release the charged throw for the throwing knife (called on right-click up). */
  private knifeRelease() {
    const p = this.player;
    const g = this.gun;
    if (g.kind !== "knife") return;
    if (!p.knifeCharging) return; // guard against double release
    const charge = p.knifeCharge ?? 0;
    p.knifeCharging = false;
    p.knifeCharge = 0;
    if (charge < (g.chargeMin ?? 0.15)) return; // not charged enough -> no throw
    const ws = this.weaponStates.get(g.id);
    if (!ws) return;
    this.knifeChargingActive = true;
    this.fireGun(ws);
    this.knifeChargingActive = false;
  }

  /** Advance the thrust-sword dash each frame, hitting enemies along the path. */
  private stepThrustDash(dt: number) {
    const p = this.player;
    const g = this.gun;
    const ang = p.thrustDashAngle ?? p.angle;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const step = Math.hypot(p.thrustDashVx ?? 0, p.thrustDashVy ?? 0) * dt;
    p.x += (p.thrustDashVx ?? 0) * dt;
    p.y += (p.thrustDashVy ?? 0) * dt;
    p.thrustDashLeft = (p.thrustDashLeft ?? 0) - step;
    const range = g.chargeDashRange ?? 34;
    const dmg = p.thrustDashDmg ?? 0;
    // damage enemies inside the dash corridor
    for (const e of this.enemies) {
      if (p.thrustHitIds?.has(e.id)) continue;
      const rx = e.x - p.x;
      const ry = e.y - p.y;
      const d = Math.hypot(rx, ry);
      const fwd = rx * ca + ry * sa;
      if (d <= range + e.size && fwd > -range) {
        p.thrustHitIds?.add(e.id);
        this.damageEnemy(e, dmg, 0, 0, false, { weapon: "thrust_sword", dx: ca, dy: sa });
      }
    }
    // player-vs-player dash
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0) && !p.thrustHitIds?.has(opp.cid)) {
      const rx = opp.x - p.x;
      const ry = opp.y - p.y;
      const d = Math.hypot(rx, ry);
      const fwd = rx * ca + ry * sa;
      if (d <= range + opp.size && fwd > -range) {
        p.thrustHitIds?.add(opp.cid);
        this.damagePlayerEntity(opp, dmg, undefined, ca * 240, sa * 240, this.activeId, g.id);
      }
    }
    // deployable dash damage
    const candDeployables = this.queryGrid(p.x, p.y, range + this.gridMaxR + 4)
      .filter((it) => it.kind === "deployable");
    for (const it of candDeployables) {
      const d = it.ref as Deployable;
      const dKey = -d.id - 1000;
      if (p.thrustHitIds?.has(dKey) || this.isTeammate(this.activeId, d.ownerId)) continue;
      const rx = d.x - p.x;
      const ry = d.y - p.y;
      const dist = Math.hypot(rx, ry);
      const fwd = rx * ca + ry * sa;
      if (dist <= range + d.size && fwd > -range) {
        p.thrustHitIds?.add(dKey);
        this.damageDeployable(d, dmg, this.activeId);
      }
    }
    this.spawnParticles(p.x, p.y, g.glow, 2, 140, 0.2);
    if (p.thrustDashLeft <= 0) {
      p.thrustDashActive = false;
      p.thrustDashLeft = 0;
    }
  }

  // ------------------------------------------------------------- beam
  private updateBeam(dt: number, firing: boolean, ws: WeaponState) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.6) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      this.beamActive = true;
      const hit = this.castBeam();
      this.beamHit = hit;
      if (hit.enemy) {
        this.damageEnemy(
          hit.enemy,
          g.damage * this.character.damageMult * dt,
          0,
          0,
          false,
          { weapon: g.id, dx: Math.cos(this.player.angle), dy: Math.sin(this.player.angle) }
        );
        if (Math.random() < 0.7)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 2, 120, 0.22);
      } else if (hit.wall && hit.wall.destructible) {
        this.damageWall(hit.wall, g.damage * 0.5 * dt);
        if (Math.random() < 0.5)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 1, 90, 0.2);
      } else if (hit.combatant) {
        this.damagePlayerEntity(hit.combatant, g.damage * this.character.damageMult * dt, undefined, 0, 0, this.activeId, g.id);
        if (Math.random() < 0.7)
          this.spawnParticles(hit.combatant.x, hit.combatant.y, g.glow, 2, 120, 0.22);
      } else if (hit.deployable) {
        this.damageDeployable(hit.deployable, g.damage * this.character.damageMult * dt, this.activeId);
        if (Math.random() < 0.7)
          this.spawnParticles(hit.deployable.x, hit.deployable.y, g.glow, 2, 120, 0.22);
      }
      if (this.beamSndCd <= 0) {
        sound.shoot("pulse");
        this.beamSndCd = 0.07;
      }
    } else {
      this.beamActive = false;
      this.beamHit = null;
    }
  }

  private castBeam(): BeamHit {
    const p = this.player;
    const g = this.gun;
    const ox = p.x + Math.cos(p.angle) * (p.size + 6);
    const oy = p.y + Math.sin(p.angle) * (p.size + 6);
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    const range = g.beamRange ?? 700;
    let best = range;
    let hitEnemy: Enemy | null = null;
    let hitWall: Wall | null = null;
    let hitCombatant: Player | null = null;
    let hitDeployable: Deployable | null = null;
    for (const e of this.enemies) {
      const t = this.rayCircle(ox, oy, dx, dy, e.x, e.y, e.size);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = e;
        hitWall = null;
        hitCombatant = null;
      }
    }
    if (this.isDM) {
      for (const c of this.combatants) {
        if (c.id === this.activeId) continue;
        const q = c.player;
        if (q.deadTimer && q.deadTimer > 0) continue;
        const t = this.rayCircle(ox, oy, dx, dy, q.x, q.y, q.size);
        if (t >= 0 && t < best) {
          best = t;
          hitCombatant = q;
          hitEnemy = null;
          hitWall = null;
        }
      }
    }
    const maxRx = Math.max(ox, ox + dx * best);
    const minRx = Math.min(ox, ox + dx * best);
    const maxRy = Math.max(oy, oy + dy * best);
    const minRy = Math.min(oy, oy + dy * best);
    for (const w of this.walls) {
      if (w.x + w.w < minRx || w.x > maxRx || w.y + w.h < minRy || w.y > maxRy) continue;
      const t = this.rayAabb(ox, oy, dx, dy, w);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = null;
        hitCombatant = null;
        hitWall = w;
      }
    }
    // deployed turrets / stations / mines are solid & destructible — the beam
    // stops at them. An owner never hits their own turret/station (the beam
    // passes through), but mines can always be shot (incl. your own).
    for (const d of this.deployables) {
      const isMine =
        d.kind === "mine_explosive" ||
        d.kind === "mine_poison" ||
        d.kind === "mine_fire";
      if (!isMine && (d.ownerId ?? -1) === this.activeId) continue;
      const t = this.rayCircle(ox, oy, dx, dy, d.x, d.y, d.size);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = null;
        hitCombatant = null;
        hitWall = null;
        hitDeployable = d;
      }
    }
    return {
      point: { x: ox + dx * best, y: oy + dy * best },
      enemy: hitEnemy,
      combatant: hitCombatant,
      wall: hitWall,
      deployable: hitDeployable,
    };
  }

  // ------------------------------------------------------- flamethrower
  private updateFlamethrower(dt: number, firing: boolean, ws: WeaponState) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.35) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      this.flameActive = true;
      const cone = g.flameCone ?? 0.4;
      const range = g.flameRange ?? 150;
      const dps = g.damage * this.character.damageMult;
      // damage enemies in cone
      for (const e of this.enemies) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d <= range + e.size) {
          const ang = Math.atan2(dy, dx);
          // a monster overlapping the player is at the muzzle origin (angle
          // undefined) — always burn it rather than requiring a perfect aim.
          if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone || d <= e.size + this.player.size) {
            const fall = 1 - d / (range + e.size);
            this.damageEnemy(e, dps * dt * (0.4 + fall * 0.6), 0, 0, false, { weapon: g.id, dx: Math.cos(this.player.angle), dy: Math.sin(this.player.angle) });
            e.burnT = Math.max(e.burnT, 1.5);
            e.burnDps = Math.max(e.burnDps, dps * 0.45);
          }
        }
      }
      // deathmatch: torch any OTHER combatant caught in the flame cone
      if (this.isDM) {
        for (const c of this.combatants) {
          if (c.id === this.activeId) continue;
          const q = c.player;
          if (q.deadTimer && q.deadTimer > 0) continue;
          const ddx = q.x - this.player.x;
          const ddy = q.y - this.player.y;
          const d = Math.hypot(ddx, ddy);
          if (d <= range + q.size) {
            const ang = Math.atan2(ddy, ddx);
            if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone) {
              const fall = 1 - d / (range + q.size);
              this.damagePlayerEntity(q, dps * dt * (0.4 + fall * 0.6), undefined, 0, 0, this.activeId, g.id);
              q.burnT = Math.max(q.burnT ?? 0, 1.5);
              q.burnDps = Math.max(q.burnDps ?? 0, dps * 0.45);
              q.burnOwnerId = this.activeId;
              q.burnWeapon = g.id;
            }
          }
        }
      }
      // spawn flame particles
      const ox = this.player.x + Math.cos(this.player.angle) * (this.player.size + g.barrel);
      const oy = this.player.y + Math.sin(this.player.angle) * (this.player.size + g.barrel);
      for (let i = 0; i < 4; i++) {
        const a = this.player.angle + (Math.random() - 0.5) * cone * 2;
        const sp = range * (1.5 + Math.random() * 1.5);
        const cols = ["#fde68a", "#fb923c", "#f97316", "#ef4444"];
        this.particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.5,
          color: cols[Math.floor(Math.random() * cols.length)],
          size: 4 + Math.random() * 5,
          shrink: true,
        });

        // High quality smoke clouds
        if (this.quality === "high" && Math.random() > 0.5) {
          const sa = this.player.angle + (Math.random() - 0.5) * cone * 4;
          const ssp = range * (0.8 + Math.random() * 1.0);
          this.particles.push({
            x: ox,
            y: oy,
            vx: Math.cos(sa) * ssp,
            vy: Math.sin(sa) * ssp,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 1.0,
            color: "rgba(80, 80, 80, 0.4)",
            size: 10 + Math.random() * 10,
          });
        }
      }
      if (this.flameSndCd <= 0) {
        sound.shoot("flamethrower");
        this.flameSndCd = 0.12;
      }
      // cone visual effect
      this.effects.push({
        type: "flamecone",
        x: this.player.x,
        y: this.player.y,
        angle: this.player.angle,
        arc: cone,
        range,
        t: 0,
        duration: 0.08,
        radius: range,
        color: g.glow,
      });
    } else {
      this.flameActive = false;
    }
  }

  // --------------------------------------------------- poison mist sprayer
  private updateGadgetWeapon(dt: number, g: GadgetDef, firing: boolean) {
    const p = this.player;
    let cd = this.gadgetCd.get(g.id) ?? 0;
    
    if (g.kind === "healing_beam") {
      // Overheat mechanics mapped into gadgetCd:
      // cd > 0 means overheated (cooling down).
      // If not overheated, we store heat in p.gadgetHeat (temporary state on player)
      if (p.gadgetHeat === undefined) p.gadgetHeat = 0;
      
      if (cd > 0) {
        // Overheated!
        cd -= dt;
        if (cd <= 0) {
          cd = 0;
          p.gadgetHeat = 0;
        }
        this.gadgetCd.set(g.id, cd);
      } else {
        if (firing) {
          p.gadgetHeat += (g.heatPerSecond ?? 0.2) * dt;
          if (p.gadgetHeat >= 1) {
            cd = 1 / (g.coolRate ?? 0.25); // Set cooldown to full cooling duration
            this.gadgetCd.set(g.id, cd);
            sound.error(); // Overheat sound
          } else {
            // Firing logic! Find nearest teammate
            let bestTgt = null;
            let bestDist = 400 * 400; // max range 400
            const myTeam = this.combatants.find((c) => c.id === this.activeId)?.teamId;
            for (const c of this.combatants) {
              if (c.id === this.activeId) continue;
              if (c.teamId === myTeam) {
                const q = c.player;
                if (q.hp >= q.maxHp) continue; // Only heal injured
                if (q.deadTimer && q.deadTimer > 0) continue;
                const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
                if (d < bestDist) {
                  bestDist = d;
                  bestTgt = q;
                }
              }
            }
            if (bestTgt) {
              bestTgt.hp = Math.min(bestTgt.maxHp, bestTgt.hp + (g.healPerSecond ?? 50) * dt);
              this.effects.push({ type: "heal_beam", x: p.x, y: p.y, targetId: bestTgt.cid, t: 0, duration: 0.1, radius: 2, color: g.color });
              // Also add green numbers occasionally
              if (Math.random() < dt * 4) {
                this.scorePopups.push({ x: bestTgt.x, y: bestTgt.y - 20, t: 1.0, score: `+${Math.round(g.healPerSecond ?? 50)}`, color: "#4ade80" });
              }
            } else {
              // Just draw beam into air
              this.effects.push({ type: "beam", x: p.x, y: p.y, angle: p.angle, range: 200, duration: 0.1, t: 0, color: g.color, radius: 2 });
            }
          }
        } else {
          // Cooling down while not firing
          p.gadgetHeat = Math.max(0, p.gadgetHeat - (g.coolRate ?? 0.25) * dt);
        }
        
        // Pass heat to HUD via cdPct (we can hack it into gadgetCd map)
        if (cd <= 0) {
           this.gadgetCd.set(g.id, p.gadgetHeat * -1); // negative means heat!
        }
      }
    } else if (g.kind === "rpg") {
      if (cd > 0) {
        cd = Math.max(0, cd - dt);
        this.gadgetCd.set(g.id, cd);
      }
      if (firing && cd <= 0 && p.fireTimer <= 0) {
        // Fire RPG!
        this.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(p.angle) * (g.projectileSpeed ?? 800),
          vy: Math.sin(p.angle) * (g.projectileSpeed ?? 800),
          size: 6,
          color: g.color,
          glow: "#f87171",
          life: 2.0,
          kind: "rocket",
          ownerId: p.cid ?? this.activeId,
          damage: g.projectileDamage ?? 140,
          explosive: true,
          explosionRadius: g.explosionRadius ?? 150,
          pierce: 0,
          bounces: 0,
          knockback: 0,
          hit: new Set<number>(),
        });
        sound.shoot("rpg", p.x, p.y);
        p.fireTimer = 1.0;
        this.gadgetCd.set(g.id, g.cooldown);
        this.clearGadgetSelection(); // Put it away after firing
      }
    } else if (g.kind === "stun_gun") {
      if (cd > 0) {
        cd = Math.max(0, cd - dt);
        this.gadgetCd.set(g.id, cd);
      }
      if (firing && cd <= 0 && p.fireTimer <= 0) {
        // Fire Stun Gun!
        this.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(p.angle) * (g.projectileSpeed ?? 1000),
          vy: Math.sin(p.angle) * (g.projectileSpeed ?? 1000),
          size: 4,
          color: g.color,
          glow: "#fef08a",
          life: 0.5,
          kind: "bullet", // basic projectile
          ownerId: p.cid ?? this.activeId,
          damage: g.projectileDamage ?? 20,
          pierce: 0,
          knockback: 0,
          hit: new Set<number>(),
          bounces: 0,
          explosive: false,
          explosionRadius: 0,
          stunDuration: g.ccDuration ?? 3.0 // special property we'll check on hit
        });
        sound.shoot("stun_gun", p.x, p.y);
        p.fireTimer = 0.5;
        this.gadgetCd.set(g.id, g.cooldown);
        this.clearGadgetSelection(); // Put it away after firing
      }
    }
  }

  private updatePoisonMist(dt: number, firing: boolean, ws: WeaponState) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.4) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      const cone = g.flameCone ?? 0.34;
      const range = g.flameRange ?? 130;
      const dps = g.damage * this.character.damageMult;
      // spawn a short-lived lingering poison cloud in front of the muzzle
      const cx = this.player.x + Math.cos(this.player.angle) * range * 0.55;
      const cy = this.player.y + Math.sin(this.player.angle) * range * 0.55;
      this.effects.push({
        type: "poisoncloud",
        x: cx,
        y: cy,
        t: 0,
        duration: 0.5,
        radius: range * 0.7,
        color: g.glow,
        dps,
        slow: 0.5,
        ownerId: this.activeId,
        weapon: g.id,
      });
      // directly ramp poison on enemies caught in the forward cone, so the
      // longer they linger the more damage they take (matches poison gas mine)
      for (const e of this.enemies) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d <= range + e.size) {
          const ang = Math.atan2(dy, dx);
          // a monster overlapping the player is at the muzzle origin (angle
          // undefined) — always gas it rather than requiring a perfect aim.
          if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone || d <= e.size + this.player.size) {
            this.applyPoison(e, dps * dt * 0.5);
          }
        }
      }
      // deathmatch: gas any OTHER combatant caught in the forward cone
      if (this.isDM) {
        for (const c of this.combatants) {
          if (c.id === this.activeId) continue;
          const q = c.player;
          if (q.deadTimer && q.deadTimer > 0) continue;
          const ddx = q.x - this.player.x;
          const ddy = q.y - this.player.y;
          const d = Math.hypot(ddx, ddy);
          if (d <= range + q.size) {
            const ang = Math.atan2(ddy, ddx);
            if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone) {
              this.damagePlayerEntity(q, dps * dt * 0.5, undefined, 0, 0, this.activeId, g.id);
            }
          }
        }
      }
      // green mist particles
      const ox = this.player.x + Math.cos(this.player.angle) * (this.player.size + g.barrel);
      const oy = this.player.y + Math.sin(this.player.angle) * (this.player.size + g.barrel);
      for (let i = 0; i < 4; i++) {
        const a = this.player.angle + (Math.random() - 0.5) * cone * 2;
        const sp = range * (0.8 + Math.random() * 1.2);
        this.particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          color: ["#a3e635", "#bef264", "#84cc16", "#a3e635"][
            Math.floor(Math.random() * 4)
          ],
          size: 4 + Math.random() * 5,
          shrink: true,
        });
      }
      if (this.flameSndCd <= 0) {
        sound.shoot("flamethrower");
        this.flameSndCd = 0.14;
      }
    }
  }

  // ------------------------------------------------------------- bow (recurve)
  private updateBow(dt: number, firing: boolean, _ws: WeaponState) {
    const p = this.player;
    const g = this.gun;
    const maxT = g.maxChargeTime ?? 1.2;
    if (firing) {
      p.bowDrawing = true;
      p.bowCharge = Math.min(maxT, p.bowCharge + dt);
    } else if (p.bowDrawing) {
      // released — fire arrow
      this.fireArrow();
      p.bowCharge = 0;
      p.bowDrawing = false;
    }
    void _ws;
  }

  private fireArrow() {
    const p = this.player;
    const g = this.gun;
    const maxT = g.maxChargeTime ?? 1.2;
    const chargePct = Math.min(1, p.bowCharge / maxT);
    const minMult = g.minChargeMult ?? 0.6;
    const maxMult = g.maxChargeMult ?? 2;
    const dmgMult = minMult + (maxMult - minMult) * chargePct;
    const speedMult = 1 + chargePct * ((g.maxChargeSpeedMult ?? 2) - 1);
    const dmg = g.damage * dmgMult * this.character.damageMult;
    const sp = g.bulletSpeed * speedMult * 1.2;
    const a = p.angle + (Math.random() - 0.5) * g.spread;
    const bx = p.x + Math.cos(a) * (p.size + g.barrel);
    const by = p.y + Math.sin(a) * (p.size + g.barrel);
    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: g.life,
      damage: dmg,
      size: g.bulletSize * (1 + chargePct * 0.6),
      color: g.color,
      glow: g.glow,
      pierce: chargePct >= 0.9 ? 2 : 0,
      knockback: g.knockback * dmgMult,
      explosive: false,
      explosionRadius: 0,
      kind: g.kind,
      hit: new Set(),
      trail: true,
      weapon: g.id,
    });
    // point-blank "swat": a crawler clinging to the face is behind the arrow's
    // spawn point too, so fire still hits it.
    this.swatPointBlank(dmg, g.knockback * dmgMult);
    sound.shoot(g.id); // 弓的释放声（recurve_bow 专用音效）
    this.spawnParticles(bx, by, g.glow, 4, 120, 0.25);
    if (chargePct >= 0.85) {
      // shake only when player is hit
      // if (!this.simulatingOther) this.shake = Math.min(10, this.shake + 4);
    }
  }

  // ------------------------------------------------------------- riot shield
  private updateShield(dt: number) {
    const p = this.player;
    const g = this.gun;
    if (p.shieldBlockTime > 0) {
      p.shieldBlockTime -= dt;
    }
    // recharge shield HP if not blocking and cd elapsed
    if (p.shieldCd > 0) {
      p.shieldCd -= dt;
      if (p.shieldCd <= 0) {
        p.shieldHp = g.shieldMaxHp ?? 0;
      }
    }
    // block enemy bullets in arc
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      const arc = g.shieldArc ?? 0.7;
      const blockR = p.size + 30;
      const next: EnemyBullet[] = [];
      for (const b of this.enemyBullets) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d <= blockR + b.size) {
          const ang = Math.atan2(dy, dx);
          if (Math.abs(this.angleDiff(ang, p.angle)) <= arc) {
            p.shieldHp -= b.damage;
            this.spawnParticles(b.x, b.y, "#60a5fa", 4, 100, 0.25);
            if (p.shieldHp <= 0) {
              p.shieldHp = 0;
              p.shieldBlockTime = 0;
              p.shieldCd = g.shieldRechargeTime ?? 8;
              if (!this.simulatingOther) this.shake = 10;
              sound.explosion();
            }
            continue; // bullet absorbed
          }
        }
        next.push(b);
      }
      this.enemyBullets = next;
    }
  }

  private raiseShield() {
    const p = this.player;
    const g = this.gun;
    if (p.shieldHp <= 0 || p.shieldCd > 0) return;
    if (p.shieldBlockTime > 0) return;
    p.shieldBlockTime = g.shieldDuration ?? 3;
    sound.skill();
    this.spawnParticles(p.x, p.y, "#60a5fa", 8, 120, 0.3);
  }


  private angleDiff(a: number, b: number): number {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  private collideWalls(ent: { x: number; y: number }, size: number) {
    for (const w of this.walls) {
      if (w.glue) continue; // glue walls don't block, they slow
      if (ent.x + size < w.x || ent.x - size > w.x + w.w || ent.y + size < w.y || ent.y - size > w.y + w.h) continue;
      const cx = Math.max(w.x, Math.min(ent.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(ent.y, w.y + w.h));
      let dx = ent.x - cx;
      let dy = ent.y - cy;
      let d = Math.hypot(dx, dy);
      if (d < size) {
        if (d < 0.0001) {
          const left = ent.x - w.x;
          const right = w.x + w.w - ent.x;
          const top = ent.y - w.y;
          const bottom = w.y + w.h - ent.y;
          const mn = Math.min(left, right, top, bottom);
          if (mn === left) ent.x = w.x - size;
          else if (mn === right) ent.x = w.x + w.w + size;
          else if (mn === top) ent.y = w.y - size;
          else ent.y = w.y + w.h + size;
        } else {
          const push = size - d;
          ent.x += (dx / d) * push;
          ent.y += (dy / d) * push;
        }
      }
    }
  }

  private collideBase(ent: { x: number; y: number }, size: number, b: Base = this.base) {
    const dx = ent.x - b.x;
    const dy = ent.y - b.y;
    const d = Math.hypot(dx, dy);
    const min = b.radius + size;
    if (d < min && d > 0.0001) {
      const push = min - d;
      ent.x += (dx / d) * push;
      ent.y += (dy / d) * push;
    }
  }

  private pointInWall(x: number, y: number, size: number): Wall | null {
    for (const w of this.walls) {
      if (w.glue || w.invisible) continue;
      if (x + size < w.x || x - size > w.x + w.w || y + size < w.y || y - size > w.y + w.h) continue;
      if (
        x > w.x - size &&
        x < w.x + w.w + size &&
        y > w.y - size &&
        y < w.y + w.h + size
      )
        return w;
    }
    return null;
  }

  private rectCircleOverlap(
    w: Wall,
    cx: number,
    cy: number,
    cr: number
  ): boolean {
    const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
    const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
    return (cx - nx) ** 2 + (cy - ny) ** 2 <= cr * cr;
  }

  private rayCircle(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    cx: number,
    cy: number,
    r: number
  ): number {
    const ex = ox - cx;
    const ey = oy - cy;
    const b = ex * dx + ey * dy;
    const c = ex * ex + ey * ey - r * r;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t1 = -b - sq;
    if (t1 >= 0) return t1;
    const t2 = -b + sq;
    return t2 >= 0 ? t2 : -1;
  }

  private rayAabb(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    w: Wall
  ): number {
    let tmin = 0;
    let tmax = Infinity;
    if (Math.abs(dx) < 1e-9) {
      if (ox < w.x || ox > w.x + w.w) return -1;
    } else {
      const t1 = (w.x - ox) / dx;
      const t2 = (w.x + w.w - ox) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (Math.abs(dy) < 1e-9) {
      if (oy < w.y || oy > w.y + w.h) return -1;
    } else {
      const t1 = (w.y - oy) / dy;
      const t2 = (w.y + w.h - oy) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (tmax >= tmin && tmax >= 0) return tmin >= 0 ? tmin : tmax;
    return -1;
  }

  // ------------------------------------------------------- bullets
  private updateBullets(dt: number) {
    const next: Bullet[] = [];
    this.buildGrid();
    for (const b of this.bullets) {
      // ---- mortar lob: arc (z-axis) to the landing point, explode on arrival ----
      if (b.lobTx !== undefined) {
        b.lobT = (b.lobT ?? 0) + dt;
        const prog = Math.min(1, b.lobT / (b.lobDur ?? 1));
        b.x = (b.lobSx ?? b.x) + ((b.lobTx ?? b.x) - (b.lobSx ?? b.x)) * prog;
        b.y = (b.lobSy ?? b.y) + ((b.lobTy ?? b.y) - (b.lobSy ?? b.y)) * prog;
        b.z = (b.lobPeak ?? 0) * Math.sin(prog * Math.PI);
        if (prog >= 1) {
          this.explode(b.lobTx ?? b.x, b.lobTy ?? b.y, b.explosionRadius, b.damage, b.glow, "mortar", b.ownerId);
          continue; // landed → dead, not carried forward
        }
        next.push(b);
        continue;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.x += (b.driftX ?? 0) * dt;
      b.y += (b.driftY ?? 0) * dt;
      b.life -= dt;
      if (this.quality !== "low" && b.trail && Math.random() < 0.7) {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: 0,
          vy: 0,
          life: 0.18,
          maxLife: 0.18,
          color: b.glow,
          size: b.size * 0.9,
          shrink: true,
        });
      }
      let dead = b.life <= 0;
      if (
        !b.boomerang &&
        (b.x < -40 ||
        b.x > this.worldW + 40 ||
        b.y < -40 ||
        b.y > this.worldH + 40)
      )
        dead = true;

      // ---- boomerang: 飞出后回旋归来，沿途留下火焰 ----
      if (b.boomerang) {
        const bs = b.boomSpeed ?? 500;
        if (!b.returning) {
          b.traveled = (b.traveled ?? 0) + bs * dt;
          if ((b.traveled ?? 0) >= (b.outDist ?? 240)) {
            b.returning = true;
            b.hit.clear(); // 回程可再次命中同一目标
          }
        } else {
          const o = this.ownerPos(b);
          const ang = Math.atan2(o.y - b.y, o.x - b.x);
          b.vx = Math.cos(ang) * bs;
          b.vy = Math.sin(ang) * bs;
          if (Math.hypot(o.x - b.x, o.y - b.y) < b.size + 22) dead = true; // 被主人接住
        }
        if (Math.random() < 0.85) {
          this.particles.push({
            x: b.x, y: b.y, vx: 0, vy: 0,
            life: 0.22, maxLife: 0.22, color: b.glow, size: b.size * 1.3, shrink: true,
          });
        }
      }

      // wall collision / bounce
      if (!dead && !b.ignoreWalls) {
        const w = this.pointInWall(b.x, b.y, b.size);
        if (w) {
          if (b.bounces !== undefined && b.bounces > 0) {
            // bounce: reflect velocity roughly
            const nx = b.x - (w.x + w.w / 2);
            const ny = b.y - (w.y + w.h / 2);
            const nlen = Math.hypot(nx, ny) || 1;
            const nnx = nx / nlen;
            const nny = ny / nlen;
            const dot = b.vx * nnx + b.vy * nny;
            b.vx -= 2 * dot * nnx;
            b.vy -= 2 * dot * nny;
            b.bounces -= 1;
            b.bounced = true;
            this.spawnParticles(b.x, b.y, "#9ca3af", 3, 100, 0.2); // dust
            this.spawnParticles(b.x, b.y, "#fbbf24", 2, 140, 0.25); // sparks
          } else if (b.explosive && b.bounced) {
            // MGL32: explode on second wall hit
            this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow, b.weapon, b.ownerId);
            dead = true;
          } else {
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow, b.weapon, b.ownerId);
            else {
              this.spawnParticles(b.x, b.y, "#9ca3af", 3, 100, 0.2);
              this.spawnParticles(b.x, b.y, "#fbbf24", 2, 140, 0.25);
            }
            dead = true;
          }
        }
      }

      // arena bounce for ion (ignores walls but bounces off arena edges)
      if (!dead && b.ignoreWalls && b.bounces !== undefined) {
        let bounced = false;
        if (b.x < b.size) { b.vx = Math.abs(b.vx); bounced = true; }
        else if (b.x > this.worldW - b.size) { b.vx = -Math.abs(b.vx); bounced = true; }
        if (b.y < b.size) { b.vy = Math.abs(b.vy); bounced = true; }
        else if (b.y > this.worldH - b.size) { b.vy = -Math.abs(b.vy); bounced = true; }
        if (bounced) {
          b.bounces -= 1;
          if (b.bounces < 0) {
            this.spawnParticles(b.x, b.y, b.glow, 10, 160, 0.3);
            dead = true;
          } else {
            this.spawnParticles(b.x, b.y, b.glow, 4, 90, 0.2);
          }
        }
      }

      if (!dead && !this.isDM && b.owner !== "foe") {
        const enemies = this.queryGrid(b.x, b.y, b.size + this.gridMaxR + 2)
          .filter((it) => it.kind === "enemy")
          .sort((a, b2) => a.idx - b2.idx);
        for (const it of enemies) {
          const e = it.ref as Enemy;
          if (b.hit.has(e.id)) continue;
          const rr = e.size + b.size + 2;
          const ddx = e.x - b.x;
          const ddy = e.y - b.y;
          if (ddx * ddx + ddy * ddy <= rr * rr) {
            b.hit.add(e.id);
            if (b.explosive) {
              this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow, b.weapon, b.ownerId);
              dead = true;
              break;
            }
            // ion: passes through enemies (high pierce), doesn't explode
            this.damageEnemy(
              e,
              b.damage,
              0,
              0,
              false,
              { weapon: b.weapon ?? "bullet", dx: Math.cos(Math.atan2(b.vy, b.vx)), dy: Math.sin(Math.atan2(b.vy, b.vx)) },
              b.ownerId
            );
            if (b.weapon === "dragon_breath" || b.weapon === "flamethrower") {
              e.burnT = Math.max(e.burnT, 1.5);
              e.burnDps = Math.max(e.burnDps, b.damage * 2.5 * 0.45);
              e.burnOwnerId = b.ownerId;
            }
            if (b.pierce <= 0) {
              dead = true;
              break;
            }
            b.pierce -= 1;
          }
        }
      }

      // ---- dual blades reflect: raised blades bounce nearby incoming bullets ----
      if (!dead && b.owner !== "player" && !b.reflected) {
        const reflectors =
          this.combatants.length > 0
            ? this.combatants
                .map((c) => c.player)
                .filter((q) => q && !(q.deadTimer && q.deadTimer > 0) && q.bladeRaising)
            : this.player.bladeRaising &&
              !(this.player.deadTimer && this.player.deadTimer > 0)
            ? [this.player]
            : [];
        for (const q of reflectors) {
          const rr = (q.bladeReflectRange ?? 96) + b.size;
          const rdx = b.x - q.x;
          const rdy = b.y - q.y;
          if (rdx * rdx + rdy * rdy <= rr * rr) {
            // parrying a bullet still costs 5% of its damage to the blademaster
            const selfDmg = b.damage * (q.bladeReflectSelf ?? 0.05);
            if (selfDmg > 0)
              this.damagePlayerEntity(q, selfDmg, undefined, 0, 0, b.ownerId ?? 2, b.weapon);
            // bounce the bullet back and re-own it to the reflector
            b.vx = -b.vx;
            b.vy = -b.vy;
            b.owner = "player";
            b.ownerId = this.combatants.length > 0 ? q.cid ?? 1 : this.activeId;
            b.reflected = true;
            b.hit.clear();
            this.spawnParticles(b.x, b.y, q.bladeReflectGlow ?? "#22d3ee", 6, 160, 0.25);
            sound.swing(this.gun.id);
            break;
          }
        }
      }

      // ---- combatant-vs-combatant ownership (deathmatch 4-way + legacy PvP) ----
      if (!dead) {
        if (this.combatants.length > 0) {
          const oid = b.ownerId ?? (b.owner === "foe" ? 2 : 1);
          const players = this.queryGrid(b.x, b.y, b.size + this.gridMaxR + 2)
            .filter((it) => it.kind === "player")
            .sort((a, b2) => a.idx - b2.idx);
          for (const it of players) {
            if (it.ownerId === oid || this.isTeammate(oid, it.ownerId)) continue;
            const q = it.ref as Player;
            if (q.deadTimer && q.deadTimer > 0) continue;
            if (this.hitsPlayer(b, q)) {
              this.damagePlayerEntity(q, b.damage, b, 0, 0, oid);
              if (b.explosive)
                this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow, b.weapon, oid);
              dead = true;
              break;
            }
          }
        } else if (b.owner === "foe") {
          const oid = b.ownerId ?? 2;
          if (!(this.player.deadTimer && this.player.deadTimer > 0) && this.hitsPlayer(b, this.player)) {
            this.damagePlayerEntity(this.player, b.damage, b, 0, 0, oid);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow, b.weapon, oid);
            dead = true;
          } else {
            const bb = this.base;
            const rr = bb.radius + b.size;
            if ((bb.x - b.x) ** 2 + (bb.y - b.y) ** 2 <= rr * rr) {
              this.damageBase(b.damage);
              if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow, b.weapon, oid);
              dead = true;
            }
          }
        } else {
          const oid = b.ownerId ?? 1;
          // enemy base (foe's base)
          const eb = this.enemyBase;
          const rr = eb.radius + b.size;
          if ((eb.x - b.x) ** 2 + (eb.y - b.y) ** 2 <= rr * rr) {
            this.damageEnemyBase(b.damage);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow, b.weapon, oid);
            dead = true;
          } else if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0) && this.hitsPlayer(b, this.foe)) {
            this.damagePlayerEntity(this.foe, b.damage, b, 0, 0, oid);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow, b.weapon, oid);
            dead = true;
          }
        }
      }

      // ---- deployed turrets / stations / mines are solid & destructible ----
      if (!dead) {
        const deployables = this.queryGrid(b.x, b.y, b.size + this.gridMaxR + 2)
          .filter((it) => it.kind === "deployable")
          .sort((a, b2) => a.idx - b2.idx);
        for (const it of deployables) {
          const d = it.ref as Deployable;
          const isMine =
            d.kind === "mine_explosive" ||
            d.kind === "mine_poison" ||
            d.kind === "mine_fire";
          const rr = d.size + b.size + 2;
          const ddx = d.x - b.x;
          const ddy = d.y - b.y;
          if (ddx * ddx + ddy * ddy <= rr * rr) {
            // an owner never hurts their own turret/station (bullets pass
            // through); mines can always be shot — including your own, so you
            // can clear a misplaced one.
            if (!isMine && (d.ownerId ?? -1) === (b.ownerId ?? -1)) continue;
            if (b.explosive) {
              this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow, b.weapon, b.ownerId);
              dead = true;
              break;
            }
            this.damageDeployable(d, b.damage, b.ownerId);
            dead = true;
            break;
          }
        }
      }

      if (dead && b.explosive && b.life <= 0 && b.hit.size === 0 && !b.bounced) {
        this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow, b.weapon, b.ownerId);
      }
      if (!dead) next.push(b);
    }
    this.bullets = next;
  }

  private updateGrenades(dt: number) {
    const next: Grenade[] = [];
    for (const gr of this.grenades) {
      gr.life -= dt;
      gr.x += gr.vx * dt;
      gr.y += gr.vy * dt;
      gr.vx *= 0.96;
      gr.vy *= 0.96;
      if (Math.random() < 0.5)
        this.spawnParticles(gr.x, gr.y, "#fbbf24", 1, 30, 0.3);
      if (gr.life <= 0) {
        if (gr.kind === "glue") {
          this.spawnGlueWall(gr.x, gr.y);
        } else if (gr.kind === "fire") {
          // ignite a lingering fire field (same as the fire mine)
          this.effects.push({
            type: "firefield",
            x: gr.x,
            y: gr.y,
            t: 0,
            duration: 5,
            radius: 92,
            color: "#fb923c",
            dps: 90,
            tickT: 0,
            ownerId: gr.ownerId,
            weapon: "fire_grenade",
          });
          this.spawnParticles(gr.x, gr.y, "#fb923c", 20, 200, 0.5);
        } else if (gr.kind === "poison") {
          // release a lingering poison cloud (same as the poison mine)
          this.effects.push({
            type: "poisoncloud",
            x: gr.x,
            y: gr.y,
            t: 0,
            duration: 5,
            radius: 200,
            color: "#84cc16",
            dps: 60,
            slow: 0.5,
            tickT: 0,
            ownerId: gr.ownerId,
            weapon: "poison_grenade",
          });
          this.spawnParticles(gr.x, gr.y, "#84cc16", 20, 200, 0.5);
        } else if (gr.kind === "cluster") {
          this.explode(gr.x, gr.y, 40, 0, "#f97316", undefined, gr.ownerId);
          for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + Math.random() * 0.5;
            this.deployables.push({
              kind: "mine_explosive",
              x: gr.x + Math.cos(a) * 45,
              y: gr.y + Math.sin(a) * 45,
              angle: 0,
              hp: 20, maxHp: 20,
              life: 25, timer: 0, armed: 0.6,
              radius: 48, size: 12,
              color: "#f87171",
              targets: [],
              owner: "self", // Fallback, not strictly critical
              ownerId: gr.ownerId,
            });
          }
        } else {
          this.explode(gr.x, gr.y, 120, 180, "#fb923c", undefined, gr.ownerId);
        }
      } else next.push(gr);
    }
    this.grenades = next;
  }

  // ------------------------------------------------------- deployables
  /** Max distance from the player a gadget may be placed / thrown. */
  private gadgetRange(def: GadgetDef): number {
    if (def.range) return def.range;
    const k = def.kind;
    if (k === "glue_grenade" || k === "fire_grenade" || k === "poison_grenade" || k === "cluster_grenade")
      return GADGET_THROW_DIST;
    return GADGET_DEPLOY_DIST;
  }

  /**
   * Compute a lobbed-grenade velocity so it lands roughly on (tx,ty) under the
   * same per-frame drag the live grenades use (see updateGrenades). Returns the
   * initial velocity, fuse and the predicted landing point.
   */
  private simulateThrow(
    px: number,
    py: number,
    tx: number,
    ty: number
  ): { vx: number; vy: number; fuse: number; landX: number; landY: number } {
    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.hypot(dx, dy);
    const dirx = dist > 0 ? dx / dist : 1;
    const diry = dist > 0 ? dy / dist : 0;
    const D = Math.min(dist, GADGET_THROW_DIST);
    const fuse = Math.max(0.35, Math.min(0.9, D / 520));
    const r = 0.96; // matches updateGrenades drag
    const n = Math.max(1, Math.round(fuse * 60));
    const dt = 1 / 60;
    // sum of vx*dt over n frames with drag r  => D ; solve for initial speed
    const S = (D * (1 - r)) / (dt * (1 - Math.pow(r, n)));
    return {
      vx: dirx * S,
      vy: diry * S,
      fuse,
      landX: px + dirx * D,
      landY: py + diry * D,
    };
  }

  private doDeploy(def: GadgetDef, tx?: number, ty?: number) {
    const p = this.player;
    const maxD = this.gadgetRange(def);
    let px: number, py: number;
    if (tx !== undefined && ty !== undefined) {
      // aim: clamp to max range from the player and to world bounds
      let dx = tx - p.x;
      let dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > maxD) {
        tx = p.x + (dx / d) * maxD;
        ty = p.y + (dy / d) * maxD;
      }
      px = Math.max(40, Math.min(this.worldW - 40, tx));
      py = Math.max(40, Math.min(this.worldH - 40, ty));
    } else {
      // fallback: a little in front of the player
      const ang = p.angle;
      px = Math.max(40, Math.min(this.worldW - 40, p.x + Math.cos(ang) * 50));
      py = Math.max(40, Math.min(this.worldH - 40, p.y + Math.sin(ang) * 50));
    }

    const base = {
      kind: def.kind,
      x: px,
      y: py,
      angle: 0,
      hp: 100,
      maxHp: 100,
      timer: 0,
      life: 30,
      armed: 0.6,
      radius: 0,
      color: def.color,
      size: 16,
      targets: [],
      // multiplayer: remember who deployed this so it attacks the right side
      owner: (this.player === this.foe ? "foe" : "self") as "self" | "foe",
      // deathmatch: combatant id that deployed this (so turrets/mines target
      // everyone EXCEPT the owner, and splash kill-credit is correct)
      ownerId: this.activeId,
    };

    switch (def.kind) {
      case "turret_mg":
        // permanent: no lifetime decay (life = Infinity); HP pulled from def.hp
        this.deployables.push({
          ...base,
          hp: def.hp ?? 160,
          maxHp: def.hp ?? 160,
          life: Infinity,
          radius: 260,
          timer: 0.15,
        });
        break;
      case "turret_cannon":
        // permanent: no lifetime decay (life = Infinity); HP pulled from def.hp
        this.deployables.push({
          ...base,
          hp: def.hp ?? 200,
          maxHp: def.hp ?? 200,
          life: Infinity,
          radius: 200,
          timer: 1.2,
          size: 18,
        });
      case "turret_sniper":
        this.deployables.push({
          ...base,
          hp: def.hp ?? 120,
          maxHp: def.hp ?? 120,
          life: Infinity,
          radius: 400,
          timer: 2.5,
        });
        break;
      case "mine_explosive":
        this.deployables.push({ ...base, hp: 30, maxHp: 30, life: 60, radius: 56, armed: 0.8 });
        break;
      case "mine_poison":
        this.deployables.push({ ...base, hp: 30, maxHp: 30, life: 60, radius: 70, armed: 0.8 });
        break;
      case "mine_fire":
        this.deployables.push({ ...base, hp: 30, maxHp: 30, life: 60, radius: 70, armed: 0.8 });
        break;
      case "mine_stun":
        this.deployables.push({ ...base, hp: 30, maxHp: 30, life: 60, radius: 65, armed: 0.8 });
        break;
      case "glue_grenade": {
        // throw a grenade that lands and forms a glue wall
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "glue",
          ownerId: this.activeId,
        });
        break;
      }
      case "fire_grenade": {
        // throw a grenade that lands and ignites a fire field
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "fire",
          ownerId: this.activeId,
        });
        break;
      }
      case "poison_grenade": {
        // throw a grenade that lands and releases a lingering poison cloud
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "poison",
          ownerId: this.activeId,
        });
        break;
      }
      case "cluster_grenade": {
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "cluster",
          ownerId: this.activeId,
        });
        break;
      }
      case "healing_station":
        this.deployables.push({ ...base, hp: def.hp ?? 80, maxHp: def.hp ?? 80, life: 20, radius: 90, size: 14 });
        break;
    }
    this.spawnParticles(px, py, def.color, 12, 120, 0.4);
    this.effects.push({
      type: "spawn",
      x: px,
      y: py,
      t: 0,
      duration: 0.4,
      radius: 32,
      color: def.color,
    });
  }

  private spawnGlueWall(x: number, y: number) {
    const w = 80;
    const h = 22;
    this.walls.push({
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      hp: 200,
      maxHp: 200,
      destructible: true,
      glue: true,
      slow: 0.45,
    });
    this.effects.push({
      type: "glue",
      x,
      y,
      t: 0,
      duration: 0.5,
      radius: 40,
      color: "#22d3ee",
    });
    this.spawnParticles(x, y, "#22d3ee", 16, 140, 0.5);
  }

  private updateDeployables(dt: number) {
    const next: Deployable[] = [];
    for (const d of this.deployables) {
      d.life -= dt;
      d.armed -= dt;
      // find nearest enemy in range for turrets
      if (d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "turret_sniper") {
        d.timer -= dt;
        let target: { x: number; y: number } | null = null;
        let bestD = d.radius;
        if (this.isDM) {
          // deathmatch: acquire the nearest OTHER combatant (not the owner)
          for (const c of this.combatants) {
            if (c.id === (d.ownerId ?? -1)) continue;
            const q = c.player;
            if (q.deadTimer && q.deadTimer > 0) continue;
            if (q.isCloaked) continue; // 隐身玩家对炮塔不可见
            const dist = Math.hypot(q.x - d.x, q.y - d.y);
            if (dist < bestD) {
              bestD = dist;
              target = q;
            }
          }
        } else if (this.mode === "local") {
          // single-player: acquire the nearest monster
          for (const e of this.enemies) {
            const dist = Math.hypot(e.x - d.x, e.y - d.y);
            if (dist < bestD) {
              bestD = dist;
              target = e;
            }
          }
        } else {
          // multiplayer PvP: there are no AI bots — target the opposing player.
          // A turret owned by "self" fires at the foe; one owned by "foe" fires
          // at the host's own player. (simulateWorld always runs with this.player
          // = local and this.foe = opponent, so this resolves correctly.)
          const foe = d.owner === "foe" ? this.player : this.foe;
          if (foe && !(foe.deadTimer && foe.deadTimer > 0)) {
            const dist = Math.hypot(foe.x - d.x, foe.y - d.y);
            if (dist < bestD) {
              bestD = dist;
              target = foe;
            }
          }
        }
        if (target) {
          d.angle = Math.atan2(target.y - d.y, target.x - d.x);
          if (d.timer <= 0) {
            if (d.kind === "turret_mg") {
              d.timer = 0.12;
              const sp = 900;
              this.bullets.push({
                x: d.x + Math.cos(d.angle) * 14,
                y: d.y + Math.sin(d.angle) * 14,
                vx: Math.cos(d.angle) * sp,
                vy: Math.sin(d.angle) * sp,
                life: 0.6,
                // 14% damage reduction (see task)
                damage: 28 * 0.86,
                size: 4,
                color: "#bae6fd",
                glow: d.color,
                pierce: 0,
                knockback: 40,
                explosive: false,
                explosionRadius: 0,
                kind: "bullet",
                hit: new Set(),
                owner: d.owner,
                ownerId: d.ownerId,
                weapon: "turret_mg",
              });
              this.spawnParticles(d.x + Math.cos(d.angle) * 14, d.y + Math.sin(d.angle) * 14, d.color, 2, 80, 0.15);
            } else if (d.kind === "turret_sniper") {
              d.timer = 2.5;
              const sp = 2000;
              this.bullets.push({
                x: d.x + Math.cos(d.angle) * 16,
                y: d.y + Math.sin(d.angle) * 16,
                vx: Math.cos(d.angle) * sp,
                vy: Math.sin(d.angle) * sp,
                life: 1.0,
                damage: 180,
                size: 7,
                color: "#fecdd3",
                glow: d.color,
                pierce: 99,
                knockback: 100,
                explosive: false,
                explosionRadius: 0,
                kind: "tracer",
                hit: new Set(),
                owner: d.owner,
                ownerId: d.ownerId,
                weapon: "turret_sniper",
              });
              this.spawnParticles(d.x + Math.cos(d.angle) * 16, d.y + Math.sin(d.angle) * 16, d.color, 4, 150, 0.2);
            } else {
              // cannon: lob an AOE bomb
              d.timer = 1.1;
              const sp = 360;
              this.bullets.push({
                x: d.x,
                y: d.y,
                vx: Math.cos(d.angle) * sp,
                vy: Math.sin(d.angle) * sp,
                life: 1.2,
                // 14% damage reduction (see task)
                damage: 44 * 0.86,
                size: 7,
                color: "#ddd6fe",
                glow: d.color,
                pierce: 0,
                knockback: 120,
                explosive: true,
                explosionRadius: 56,
                kind: "grenade",
                hit: new Set(),
                owner: d.owner,
                ownerId: d.ownerId,
                weapon: "turret_cannon",
              });
            }
          }
        }
        // turrets can be damaged on contact — by monsters (PvE), the opposing
        // player (PvP), or another combatant (deathmatch). The owner never
        // damages their own turret.
        for (const e of this.enemies) {
          if (Math.hypot(e.x - d.x, e.y - d.y) < e.size + d.size) {
            d.hp -= 75 * dt;
          }
        }
        if (this.isDM) {
          for (const c of this.combatants) {
            if (c.id === (d.ownerId ?? -1)) continue;
            const q = c.player;
            if (Math.hypot(q.x - d.x, q.y - d.y) < q.size + d.size) d.hp -= 75 * dt;
          }
        } else if (this.mode !== "local" && d.owner) {
          const foe = d.owner === "foe" ? this.player : this.foe;
          if (foe && Math.hypot(foe.x - d.x, foe.y - d.y) < foe.size + d.size) {
            d.hp -= 75 * dt;
          }
        }
        if (d.hp > 0 && d.life > 0) next.push(d);
        else {
          this.explode(d.x, d.y, 40, 0, d.color);
        }
        continue;
      }
      // mines
      if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire" || d.kind === "mine_stun") {
        // a mine destroyed by gunfire / explosions also goes off (triggered)
        let triggered = d.hp <= 0;
        if (d.armed <= 0) {
          const tryTrigger = (cx: number, cy: number, cs: number) =>
            Math.hypot(cx - d.x, cy - d.y) < cs + 24;
          let prox = false;
          if (this.isDM) {
            for (const c of this.combatants) {
              if (c.id === (d.ownerId ?? -1)) continue;
              const q = c.player;
              if (q.deadTimer && q.deadTimer > 0) continue;
              if (tryTrigger(q.x, q.y, q.size)) { prox = true; break; }
            }
          } else {
            for (const e of this.enemies) {
              if (tryTrigger(e.x, e.y, e.size)) { prox = true; break; }
            }
          }
          if (prox) triggered = true;
        }
        if (triggered) {
          if (d.kind === "mine_explosive") {
            this.explode(d.x, d.y, d.radius, 160, d.color, undefined, d.ownerId);
          } else if (d.kind === "mine_poison") {
            this.effects.push({
              type: "poisoncloud",
              x: d.x,
              y: d.y,
              t: 0,
              duration: 5,
              radius: d.radius * 2.5,
              color: d.color,
              dps: 60,
              slow: 0.5,
              tickT: 0,
              ownerId: d.ownerId,
              weapon: "mine_poison",
            });
          } else if (d.kind === "mine_stun") {
            this.spawnParticles(d.x, d.y, "#fde047", 30, 250, 0.5);
            const r = d.radius;
            for (const e of this.enemies) {
              if (Math.hypot(e.x - d.x, e.y - d.y) < r + e.size) e.ccTimer = 3.5;
            }
            if (this.isDM) {
              for (const c of this.combatants) {
                if (c.id === (d.ownerId ?? -1)) continue;
                const q = c.player;
                if (Math.hypot(q.x - d.x, q.y - d.y) < r + q.size) q.ccTimer = 3.5;
              }
            } else if (this.mode !== "local" && d.owner) {
              const foe = d.owner === "foe" ? this.player : this.foe;
              if (foe && Math.hypot(foe.x - d.x, foe.y - d.y) < r + foe.size) foe.ccTimer = 3.5;
            }
          } else {
            this.effects.push({
              type: "firefield",
              x: d.x,
              y: d.y,
              t: 0,
              duration: 5,
              radius: d.radius,
              color: d.color,
              dps: 90,
              tickT: 0,
              ownerId: d.ownerId,
              weapon: "mine_fire",
            });
          }
          d.life = 0;
        }
        if (d.life > 0 && d.hp > 0) next.push(d);
        continue;
      }
      // healing station
      if (d.kind === "healing_station") {
        const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
        if (dist < d.radius + this.player.size && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45 * dt);
          if (Math.random() < 0.3)
            this.spawnParticles(this.player.x, this.player.y, "#4ade80", 1, 50, 0.3);
        }
        if (d.life > 0 && d.hp > 0) next.push(d);
        continue;
      }
      if (d.life > 0 && d.hp > 0) next.push(d);
    }
    this.deployables = next;
  }

  private updateEnemyBullets(dt: number) {
    const p = this.player;
    const next: EnemyBullet[] = [];
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.x < -20 || b.x > this.worldW + 20 || b.y < -20 || b.y > this.worldH + 20)
        continue;
      if (this.pointInWall(b.x, b.y, b.size)) {
        this.spawnParticles(b.x, b.y, b.color, 3, 90, 0.2);
        continue;
      }
      const rr = p.size + b.size;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= rr * rr) {
        if (b.poison) this.spawnParticles(b.x, b.y, "#a3e635", 6, 120, 0.4);
        this.damagePlayer(b.damage);
        continue;
      }
      // opponent (foe) can also be hit by enemy fire in multiplayer
      if (this.foe) {
        const fr = this.foe.size + b.size;
        if ((this.foe.x - b.x) ** 2 + (this.foe.y - b.y) ** 2 <= fr * fr) {
          this.damagePlayerEntity(this.foe, b.damage);
          continue;
        }
      }
      const brr = this.base.radius + b.size;
      if (
        (this.base.x - b.x) ** 2 + (this.base.y - b.y) ** 2 <=
        brr * brr
      ) {
        this.damageBase(b.damage);
        continue;
      }
      if (this.foe) {
        const fbr = this.enemyBase.radius + b.size;
        if (
          (this.enemyBase.x - b.x) ** 2 + (this.enemyBase.y - b.y) ** 2 <=
          fbr * fbr
        ) {
          this.damageEnemyBase(b.damage);
          continue;
        }
      }
      // enemy fire can also destroy deployed turrets / stations / mines
      let hitDep = false;
      for (const d of this.deployables) {
        const rr = d.size + b.size + 2;
        if ((d.x - b.x) ** 2 + (d.y - b.y) ** 2 <= rr * rr) {
          this.damageDeployable(d, b.damage, undefined);
          hitDep = true;
          break;
        }
      }
      if (hitDep) continue;
      next.push(b);
    }
    this.enemyBullets = next;
  }

  private updateEnemies(dt: number) {
    const ts = this.timewarp > 0 ? 0.32 : 1;
    const p = this.player;
    const next: Enemy[] = [];
    for (const e of this.enemies) {
      e.spawnT = Math.min(1, e.spawnT + dt * 4);
      if (e.hitFlash > 0) e.hitFlash -= dt * 4;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.electrifiedTime && e.electrifiedTime > 0) e.electrifiedTime -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damageEnemy(e, e.burnDps * dt, 0, 0, true);
        if (Math.random() < 0.3)
          this.spawnParticles(e.x, e.y, "#fb923c", 1, 50, 0.2);
      }
      // poison damage-over-time: the longer an enemy stays poisoned, the
      // higher the dps — enemies lingering in gas take ever more damage.
      if (e.poisonT && e.poisonT > 0) {
        e.poisonT -= dt;
        this.damageEnemy(e, (e.poisonDps ?? 0) * dt, 0, 0, true);
        e.poisonDps = Math.max(0, (e.poisonDps ?? 0) - 22 * dt);
        if (Math.random() < 0.25)
          this.spawnParticles(e.x, e.y, "#a3e635", 1, 50, 0.2);
      }
      const slowMult = e.slowT > 0 ? 0.5 : 1;
      const buffMult = e.buffT && e.buffT > 0 ? 1.8 : 1;
      if (e.buffT && e.buffT > 0) e.buffT -= dt;

      // movement target: biohazard monsters swarm the player; defense monsters
      // besiege the base (and the player if close enough).
      const bio = this.gameMode === "biohazard";
      let tbx: number;
      let tby: number;
      let tbaseR: number;
      if (bio) {
        tbx = p.x;
        tby = p.y;
        tbaseR = p.size;
      } else {
        const b = this.mode !== "local" ? this.nearestBase(e.x, e.y) : this.base;
        tbx = b.x;
        tby = b.y;
        tbaseR = b.radius;
      }

      const dbx = tbx - e.x;
      const dby = tby - e.y;
      const dbase = Math.hypot(dbx, dby) || 1;
      const dpx = p.x - e.x;
      const dpy = p.y - e.y;
      const dpl = Math.hypot(dpx, dpy) || 1;

      const beh = e.behavior ?? "soldier";

      if (e.ranged) {
        const tx = tbx;
        const ty = tby;
        e.angle = Math.atan2(ty - e.y, tx - e.x);
        const preferred = 250;
        let mvx = 0;
        let mvy = 0;
        if (dbase > preferred + 30) {
          mvx = dbx / dbase;
          mvy = dby / dbase;
        } else if (dbase < preferred - 40) {
          mvx = -dbx / dbase;
          mvy = -dby / dbase;
        } else {
          mvx = -dby / dbase;
          mvy = dbx / dbase;
        }
        e.x += mvx * e.speed * buffMult * dt * ts * slowMult;
        e.y += mvy * e.speed * buffMult * dt * ts * slowMult;
        // ranged spit (spitter) — lobs a poison glob at the player
        e.shootTimer -= dt * ts;
        if (e.shootTimer <= 0 && dpl < (e.rangedRange ?? 380) && e.spawnT >= 1) {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          e.shootTimer = 1.6 + Math.random() * 0.6;
          const dmg = e.rangedDamage ?? 14;
          this.enemyBullets.push({
            x: e.x + Math.cos(a) * e.size,
            y: e.y + Math.sin(a) * e.size,
            vx: Math.cos(a) * 300,
            vy: Math.sin(a) * 300,
            life: 2.4,
            damage: Math.round(dmg),
            size: 6,
            color: e.glow,
            poison: true,
          });
        }
      } else {
        e.angle = Math.atan2(dby, dbx);
        let sp = e.speed * buffMult * ts * slowMult;
        // runner: periodic lunge (dash) toward the player
        if (beh === "runner" && (e.chargeT ?? 0) <= 0 && dpl < 320 && e.spawnT >= 1) {
          e.chargeT = 0.45;
        }
        if (beh === "runner" && (e.chargeT ?? 0) > 0) {
          e.chargeT = (e.chargeT ?? 0) - dt;
          sp *= 2.4;
        }
        e.x += (dbx / dbase) * sp * dt;
        e.y += (dby / dbase) * sp * dt;
      }

      // screamer: periodic shriek that buffs nearby monsters + staggers player
      if (beh === "screamer") {
        e.screamT = (e.screamT ?? 3) - dt;
        if (e.screamT <= 0 && e.spawnT >= 1) {
          e.screamT = 5 + Math.random() * 2;
          const br = e.buffRadius ?? 260;
          this.effects.push({ type: "shock", x: e.x, y: e.y, t: 0, duration: 0.5, radius: br, color: "#f0abfc" });
          for (const o of this.enemies) {
            if (Math.hypot(o.x - e.x, o.y - e.y) < br) o.buffT = 3;
          }
          if (dpl < br) {
            this.player.flash = Math.max(this.player.flash, 0.5);
            // shake only when player is hit
            // this.shake = Math.min(10, this.shake + 4);
          }
        }
      }

      // spore: periodically emit a lingering poison cloud
      if (beh === "spore") {
        e.cloudT = (e.cloudT ?? 1.5) - dt;
        if (e.cloudT <= 0 && e.spawnT >= 1) {
          e.cloudT = 2.2 + Math.random();
          const cr = e.cloudRadius ?? 160;
          this.effects.push({
            type: "poisoncloud",
            x: e.x,
            y: e.y,
            t: 0,
            duration: 2.4,
            radius: cr,
            color: e.glow,
            dps: e.cloudDamage ?? 42,
            slow: 0.5,
          });
        }
      }

      // glue wall slow
      for (const w of this.walls) {
        if (w.glue && this.rectCircleOverlap(w, e.x, e.y, e.size)) {
          e.slowT = Math.max(e.slowT, 0.3);
        }
      }

      // separation
      for (const o of this.enemies) {
        if (o.id === e.id) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const od = Math.hypot(ox, oy);
        const min = e.size + o.size;
        if (od > 0 && od < min) {
          const push = (min - od) * 0.5;
          e.x += (ox / od) * push;
          e.y += (oy / od) * push;
        }
      }

      this.collideWalls(e, e.size);
      if (!bio) {
        this.collideBase(e, e.size);
        this.collideBase(e, e.size, this.enemyBase);
      }

      if (e.spawnT >= 1 && e.hp > 0) {
        e.attackTimer -= dt;
        if (bio) {
          // biohazard: monsters only attack the player
          if (dpl <= e.size + p.size && e.attackTimer <= 0) {
            this.damagePlayer(e.damage);
            e.attackTimer = beh === "crawler" ? 0.45 : 0.6;
          }
        } else {
          if (dbase <= tbaseR + e.size && e.attackTimer <= 0) {
            this.damageBase(e.damage);
            e.attackTimer = 0.7;
          }
          if (dpl <= e.size + p.size && e.attackTimer <= 0) {
            this.damagePlayer(e.damage);
            e.attackTimer = 0.65;
          }
          if (
            this.foe &&
            e.attackTimer <= 0 &&
            Math.hypot(e.x - this.foe.x, e.y - this.foe.y) <= e.size + this.foe.size
          ) {
            this.damagePlayerEntity(this.foe, e.damage);
            e.attackTimer = 0.65;
          }
        }
      }

      // MAP BOUNDARY — keep monsters inside the (now scrolling) world so they
      // can never escape the arena entirely, even in biohazard.
      if (bio) {
        const m = e.size;
        e.x = Math.max(m, Math.min(this.worldW - m, e.x));
        e.y = Math.max(m, Math.min(this.worldH - m, e.y));
      }

      if (e.hp > 0) next.push(e);
    }
    this.enemies = next;

    // field effects (poison cloud, fire field) damage enemies inside
    this.buildGrid();
    for (const fx of this.effects) {
      if (fx.type !== "poisoncloud" && fx.type !== "firefield") continue;
      if (fx.tickT === undefined) fx.tickT = 0;
      fx.tickT -= dt;
      if (fx.tickT <= 0) {
        fx.tickT = 0.25;
        const fcand = this.queryGrid(fx.x, fx.y, fx.radius);
        for (const it of fcand) {
          if (it.kind !== "enemy") continue;
          const e = it.ref as Enemy;
          if ((e.x - fx.x) ** 2 + (e.y - fx.y) ** 2 < (fx.radius + e.size) ** 2) {
            if (fx.type === "poisoncloud") {
              // ramp poison so lingering enemies take ever-increasing damage
              this.applyPoison(e, ((fx.dps ?? 20) * 0.25) * 0.8, fx.ownerId);
              e.slowT = Math.max(e.slowT, 0.3);
            } else {
              this.damageEnemy(e, (fx.dps ?? 20) * 0.25, 0, 0, true, undefined, fx.ownerId);
              e.burnT = Math.max(e.burnT, 1.5);
              e.burnDps = Math.max(e.burnDps, (fx.dps ?? 20) * 0.45);
              e.burnOwnerId = fx.ownerId;
            }
          }
        }
        if (this.isDM) {
          for (const it of fcand) {
            if (it.kind !== "player") continue;
            const q = it.ref as Player;
            if (q.deadTimer && q.deadTimer > 0) continue;
            if ((q.x - fx.x) ** 2 + (q.y - fx.y) ** 2 < (fx.radius + q.size) ** 2) {
              // pass the effect ownerId (if any) so kills are properly credited
              this.damagePlayerEntity(q, (fx.dps ?? 20) * 0.25, undefined, 0, 0, fx.ownerId ?? -1, fx.weapon);
              if (fx.type === "firefield") {
                q.burnT = Math.max(q.burnT ?? 0, 1.5);
                q.burnDps = Math.max(q.burnDps ?? 0, (fx.dps ?? 80) * 0.45);
                q.burnOwnerId = fx.ownerId;
                q.burnWeapon = fx.weapon;
              }
            }
          }
        }
      }
    }
  }

  private damageEnemy(
    e: Enemy,
    dmg: number,
    kbx: number,
    kby: number,
    silent = false,
    src?: { weapon: string; dx?: number; dy?: number },
    attackerId?: number
  ) {
    if (e.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    const before = e.hp;
    e.hp -= dmg;
    // score reflects the ACTUAL damage dealt (overkill is capped to remaining hp)
    const dealt = before - Math.max(e.hp, 0);
    const localId = this.mode === "local" ? 0 : this.selfPid;
    const finalAttackerId = (attackerId !== undefined && attackerId >= 0) ? attackerId : (this.activeId ?? localId);
    const isLocalAttacker = finalAttackerId === localId;

    if (dealt > 0) {
      this.awardDamageScore(finalAttackerId, dealt);
      if (isLocalAttacker) {
        this.playerDamageDealt += dealt;
        this.recordDamageLog(
          dealt,
          src?.weapon || this.gun.id,
          e.name || (e.type === "monster" ? "怪物" : "敌人"),
          "你",
          true
        );
      }
    }

    if (!silent) e.hitFlash = 1;
    if (!silent && this.hitSndCd <= 0) {
      // 本地玩家命中敌人：清脆的提示音；其余情况用通用受击声
      if (isLocalAttacker) sound.hitConfirm();
      else sound.hit();
      this.hitSndCd = 0.04;
    }
    const kbScale = 0.045 / (e.type === "boss" ? 6 : 1);
    e.x += kbx * kbScale;
    e.y += kby * kbScale;
    if (src) e.lastSrc = { weapon: src.weapon, dx: src.dx ?? 0, dy: src.dy ?? 0 };
    this.spawnParticles(
      e.x,
      e.y,
      e.type === "monster" || e.type === "boss" ? e.glow : "#ef4444", // red blood for humans
      5,
      140,
      0.35,
      e.x - kbx * 0.1,
      e.y - kby * 0.1
    );
    if (e.hp <= 0) this.killEnemy(e, finalAttackerId);
  }

  /** Apply (and ramp) poison on an enemy. The longer it stays in gas, the
   *  higher its poison dps climbs — so lingering hurts more and more. */
  private applyPoison(e: Enemy, ramp: number, ownerId?: number) {
    if (e.hp <= 0) return;
    e.poisonT = Math.max(e.poisonT ?? 0, 0.9);
    e.poisonDps = Math.min(260, (e.poisonDps ?? 0) + ramp);
    if (ownerId !== undefined) e.poisonOwnerId = ownerId;
  }

  /** Enhanced, weapon- & direction-aware coin burst FX (everywhere except
   *  biohazard). Reused for enemy kills AND deathmatch/PvP combatant kills so
   *  every non-biohazard enemy explodes into coins on death.
   *  `weapon` selects the palette/flourish; `rawDx`/`rawDy` bias the spray. */
  private spawnCoinBurstFX(
    x: number,
    y: number,
    size: number,
    big: boolean,
    med: boolean,
    weapon: string,
    rawDx = 0,
    rawDy = 0
  ) {
    const style = killStyleOf(weapon);
    let dx = rawDx;
    let dy = rawDy;
    const dl = Math.hypot(dx, dy);
    if (dl > 0.001) { dx /= dl; dy /= dl; } else { dx = 0; dy = 0; }

    const pal = COIN_STYLE[style] ?? COIN_STYLE.bullet;
    const ringR = size * (big ? 4 : style === "explosive" ? 3.4 : 3);
    this.effects.push({ type: "coinburst", x, y, t: 0, duration: big ? 0.72 : 0.55, radius: ringR, color: pal[0], style, dirX: dx, dirY: dy });
    this.effects.push({ type: "shock", x, y, t: 0, duration: 0.42, radius: ringR * 0.82, color: pal[1] });
    // shake only when player is hit
    // if (!this.simulatingOther) this.shake = Math.min(26, this.shake + (big ? 22 : med ? 12 : 7));
    const coinCount = big ? 64 : med ? 32 : 18;
    for (let i = 0; i < coinCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 140 + Math.random() * 320;
      let vx = Math.cos(a) * sp;
      let vy = Math.sin(a) * sp - 120;
      if (dx !== 0 || dy !== 0) {
        vx = vx * 0.35 + dx * sp;
        vy = vy * 0.35 + dy * sp - 60;
      }
      const flight = 0.35 + Math.random() * 0.15;
      this.particles.push({
        x, y, vx, vy,
        life: flight + 1.0, maxLife: flight + 1.0,
        color: pal[(Math.random() * pal.length) | 0],
        size: 2.5 + Math.random() * 3, shrink: false,
        gravity: 540, coin: true, spin: Math.random() * Math.PI * 2,
        flight, rest: 1.0, landed: false,
      });
    }
    if (style === "explosive") {
      this.effects.push({ type: "coinburst", x, y, t: 0, duration: 0.85, radius: ringR * 1.5, color: "#fb923c", style: "explosive", dirX: dx, dirY: dy });
      this.spawnParticles(x, y, "#fb923c", big ? 22 : 12, 330, 0.6);
    } else if (style === "whip") {
      this.effects.push({ type: "whip", x, y, t: 0, duration: 0.22, range: size * 3, radius: size * 3, color: "#7dd3fc", angle: dx !== 0 || dy !== 0 ? Math.atan2(dy, dx) : 0, arc: 0 });
      this.spawnParticles(x, y, "#7dd3fc", 14, 280, 0.5);
      this.spawnParticles(x, y, "#e0f2fe", 8, 200, 0.4);
    } else if (style === "saber") {
      this.spawnParticles(x, y, "#a5b4fc", 12, 260, 0.5);
    } else if (style === "fire") {
      this.spawnParticles(x, y, "#fb923c", 16, 240, 0.6);
      this.spawnParticles(x, y, "#fde68a", 8, 160, 0.4);
    } else if (style === "poison") {
      this.spawnParticles(x, y, "#a3e635", 16, 240, 0.6);
    }
  }

  private killEnemy(e: Enemy, attackerId?: number) {
    const localId = this.mode === "local" ? 0 : this.selfPid;
    const finalAttackerId = (attackerId !== undefined && attackerId >= 0) ? attackerId : localId;
    const isLocal = finalAttackerId === localId;

    const killerC = this.combatants.find(c => c.id === finalAttackerId);
    if (killerC) {
      killerC.kills += 1;
      killerC.score += e.score;
    }

    if (isLocal) {
      this.score += e.score;
      this.kills += 1;
    }

    // Determine killer identity
    let killerName = "未知";
    if (isLocal) {
      killerName = "你";
    } else if (finalAttackerId === this.peerPid) {
      killerName = this.peerName || "队友";
    } else if (killerC) {
      killerName = killerC.name;
    } else {
      killerName = "队友";
    }

    const victimName = e.name || (e.type === "monster" ? "怪物" : "敌人");

    // Add to kill feed
    this.addKillFeed(killerName, victimName, e.lastSrc?.weapon, killerC);
    // mirror to clients (co-op AI kill)
    this.pushFeedEvent({
      kind: "kill",
      pid: finalAttackerId,
      victimPid: -1,
      killerName: killerC?.name,
      victimName,
      weaponId: e.lastSrc?.weapon,
      amount: e.score,
      kills: killerC?.kills,
    });

    // Trigger local score feedback & banner if the local player is the killer
    if (isLocal) {
      this.addScoreFeed("淘汰", e.score, victimName, e.score, this.kills);
      this.banner = { text: `击杀 ${victimName}`, t: 1.6 };
      sound.playKillConfirm();
    }

    // ============ IMPACTFUL COIN BURST ============
    const big = e.type === "boss" || e.behavior === "abomination";
    const med = e.type === "tank" || e.behavior === "brute" || e.behavior === "bloater";
    const goldAmount = big ? 80 : med ? 18 : e.type === "shooter" || e.behavior === "spitter" ? 10 : 6;
    this.gold += goldAmount;

    // what landed the killing blow (weapon id + bullet direction)
    const ksrc = e.lastSrc;
    const bio = this.gameMode === "biohazard";
    if (bio) {
      // biohazard keeps the classic simple radial burst
      this.effects.push({ type: "coinburst", x: e.x, y: e.y, t: 0, duration: 0.5, radius: e.size * 3, color: "#fbbf24" });
      this.effects.push({ type: "shock", x: e.x, y: e.y, t: 0, duration: 0.35, radius: e.size * 2.4, color: "#fde68a" });
      // shake only when player is hit
      // this.shake = Math.min(22, this.shake + (big ? 20 : med ? 10 : 5));
      const coinCount = big ? 54 : med ? 26 : 14;
      for (let i = 0; i < coinCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 120 + Math.random() * 280;
        const flight = 0.35 + Math.random() * 0.15;
        this.particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
          life: flight + 1.0, maxLife: flight + 1.0,
          color: Math.random() < 0.5 ? "#fbbf24" : "#fde68a",
          size: 2.5 + Math.random() * 2.5, shrink: false,
          gravity: 520, coin: true, spin: Math.random() * Math.PI * 2,
          flight, rest: 1.0, landed: false,
        });
      }
    } else {
      // enhanced, weapon- & direction-aware burst (everywhere except biohazard)
      this.spawnCoinBurstFX(e.x, e.y, e.size, big, med, ksrc?.weapon ?? "", ksrc?.dx ?? 0, ksrc?.dy ?? 0);
    }

    // body debris particles
    this.spawnParticles(e.x, e.y, e.glow, big ? 30 : 12, 220, 0.5);
    this.spawnParticles(e.x, e.y, e.color, big ? 20 : 6, 160, 0.4);

    if (big) {
      this.explode(e.x, e.y, e.size * 2.2, 0, e.glow);
    }
    // bloater: bursts into a wide poison cloud on death
    if (e.explosiveDeath) {
      const r = e.explodeRadius ?? 120;
      const dmg = e.explodeDamage ?? 60;
      this.effects.push({ type: "poisoncloud", x: e.x, y: e.y, t: 0, duration: 2.6, radius: r, color: e.glow, dps: dmg, slow: 0.5 });
      this.spawnParticles(e.x, e.y, "#a3e635", 30, 320, 0.6);
      const pd = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (pd < r + this.player.size)
        this.damagePlayer(Math.round(dmg * (1 - pd / (r + this.player.size))));
      // shake only when player is hit
      // this.shake = Math.min(16, this.shake + 8);
    }
    // score popup as gold pickup
    const dropChance = big ? 1 : med ? 0.32 : 0.12;
    if (Math.random() < dropChance) {
      this.pickups.push({
        x: e.x,
        y: e.y,
        type: "health",
        life: 12,
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

  private damagePlayer(dmg: number) {
    const p = this.player;
    if (p.iframes > 0 || p.shieldTime > 0) {
      if (p.shieldTime > 0) {
        this.spawnParticles(p.x, p.y, "#60a5fa", 4, 90, 0.3);
      }
      return;
    }
    // riot shield block
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      p.shieldHp -= dmg;
      this.spawnParticles(p.x, p.y, "#60a5fa", 5, 100, 0.3);
      if (p.shieldHp <= 0) {
        p.shieldHp = 0;
        p.shieldBlockTime = 0;
        p.shieldCd = this.gun.shieldRechargeTime ?? 8;
        this.shake = 12;
        sound.explosion();
      }
      return;
    }
    p.hp -= dmg;
    this.playerDamageTaken += dmg;
    this.recordDamageLog(dmg, "enemy_attack", "你", "敌人", false);
    p.flash = 1;
    p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    this.shake = Math.min(16, this.shake + dmg * 0.4);
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    if (p.hp <= 0) {
      p.hp = 0;
      this.playerDeaths++;
      this.eliminatedBy = "敌人";
      sound.playDeath();
      if (this.mode === "local") {
        this.endGame("你倒下了");
      } else {
        // Multiplayer: a downed player respawns after RESPAWN_TIME instead of
        // ending the match. Ending the game here would freeze the host's whole
        // simulation (no more snapshots) and lock the opponent out completely.
        // The match only ends when a base is destroyed.
        p.deadTimer = RESPAWN_TIME;
        p.bowDrawing = false;
        this.firing = false;
        this.beamActive = false;
        this.flameActive = false;
        this.banner = { text: `你被击败 ${RESPAWN_TIME} 秒后复活`, t: 1.6 };
      }
    }

  }

  private damageBase(dmg: number) {
    if (this.base.hp <= 0) return;
    if (this.gameMode === "biohazard") return; // no bases in biohazard
    this.base.hp -= dmg;
    this.base.flash = 1;
    // shake only when player is hit
    // this.shake = Math.min(12, this.shake + dmg * 0.25);
    const a = Math.random() * Math.PI * 2;
    this.spawnParticles(
      this.base.x + Math.cos(a) * this.base.radius,
      this.base.y + Math.sin(a) * this.base.radius,
      "#f87171",
      5,
      120,
      0.4
    );
    if (this.base.hp <= 0) {
      this.base.hp = 0;
      this.explode(this.base.x, this.base.y, this.base.radius * 2, 0, "#fb7185");
      this.endGame("基地失守，你输了！");
    }
  }

  private damageEnemyBase(dmg: number) {
    if (this.enemyBase.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    this.enemyBase.hp -= dmg;
    this.enemyBase.flash = 1;
    // shake only when player is hit
    // this.shake = Math.min(8, this.shake + dmg * 0.08);
    const a = Math.random() * Math.PI * 2;
    this.spawnParticles(
      this.enemyBase.x + Math.cos(a) * this.enemyBase.radius,
      this.enemyBase.y + Math.sin(a) * this.enemyBase.radius,
      "#f87171",
      4,
      100,
      0.3
    );
    if (this.enemyBase.hp <= 0) {
      this.enemyBase.hp = 0;
      this.explode(this.enemyBase.x, this.enemyBase.y, this.enemyBase.radius * 2, 0, "#fbbf24");
      this.endGame("摧毁敌方基地");
    }
  }

  private endGame(reason: string) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverReason = reason;
    this.exitMouseLock();
    this.spawnParticles(this.player.x, this.player.y, this.character.bodyColor, 40, 220, 0.8);
    this.emit(true);
  }

  /** Deathmatch / team-deathmatch match timer expired: the current leader wins. */
  private finishDmByTime() {
    if (this.gameOver) return;
    if (this.gameMode === "team_deathmatch") {
      let bestTeam = -1;
      let bestKills = -1;
      for (const c of this.combatants) {
        if (c.teamId === undefined) continue;
        const teamKills = this.combatants
          .filter(x => x.teamId === c.teamId)
          .reduce((sum, x) => sum + x.kills, 0);
        if (teamKills > bestKills) { bestKills = teamKills; bestTeam = c.teamId; }
      }
      if (bestTeam === 0) {
        this.endGame("时间到 · 你的队伍获胜");
      } else if (bestTeam >= 0) {
        this.endGame("时间到 · 其他队伍获胜");
      } else {
        this.endGame("时间到 · 平局");
      }
      return;
    }
    let best: Combatant | undefined;
    for (const c of this.combatants) {
      if (!best || c.kills > best.kills) best = c;
    }
    const localId = this.mode === "local" ? 0 : this.selfPid;
    if (!best || best.kills === 0) {
      this.endGame("时间到 · 平局");
    } else if (best.id === localId) {
      this.endGame("时间到 · 你赢了");
    } else {
      this.endGame(`时间到 · ${best.name} 获胜`);
    }
  }

  /** Per-team scoreboard rows for the HUD (team_deathmatch). */
  private buildTeamScores(): HudState["teamScores"] {
    if (this.gameMode !== "team_deathmatch") {
      return undefined;
    }
    const is5v5 = this.loadout.dmPlayerCount === 10;
    const defaultNames = is5v5 ? ["蓝队", "红队"] : ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
    const teams = new Map<number, { kills: number; score: number; alive: number; members: number; color?: string }>();
    for (const c of this.combatants) {
      if (c.teamId === undefined) continue;
      let t = teams.get(c.teamId);
      if (!t) {
        t = { kills: 0, score: 0, alive: 0, members: 0 };
        teams.set(c.teamId, t);
      }
      t.kills += c.kills;
      t.score += c.score;
      t.members += 1;
      if (!(c.player.deadTimer && c.player.deadTimer > 0)) t.alive += 1;
      if (!t.color) t.color = c.color;
    }
    const localId = this.mode === "local" ? 0 : this.selfPid;
    const localCombatant = this.combatants.find(c => c.id === localId);
    return [...teams.entries()]
      .sort((a, b) => b[1].kills - a[1].kills)
      .map(([teamId, t]) => ({
        teamId,
        name: is5v5 ? (teamId === 0 ? "你的队伍" : "敌方队伍") : (teamId === 0 ? "你的队伍" : (defaultNames[teamId] ?? `第${teamId}队`)),
        color: t.color ?? (teamId === 0 ? "#38bdf8" : "#ef4444"),
        kills: t.kills,
        score: t.score,
        alive: t.alive,
        members: t.members,
        isMine: localCombatant?.teamId === teamId,
      }));
  }

  // ==================================================== MULTIPLAYER HELPERS
  private nearestBase(x: number, y: number): Base {
    const d1 = (this.base.x - x) ** 2 + (this.base.y - y) ** 2;
    const d2 = (this.enemyBase.x - x) ** 2 + (this.enemyBase.y - y) ** 2;
    return d1 <= d2 ? this.base : this.enemyBase;
  }

  private hitsPlayer(b: Bullet, p: Player): boolean {
    const rr = p.size + b.size;
    return (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= rr * rr;
  }

  /** Helper to check if two combatant IDs are on the same team (no friendly fire in team modes) */
  private isTeammate(cid1: number | undefined, cid2: number | undefined): boolean {
    if (cid1 === undefined || cid2 === undefined || cid1 < 0 || cid2 < 0) return false;
    if (cid1 === cid2) return true; // Self is always on same team
    if (this.gameMode !== "team_deathmatch") return false;
    const c1 = this.combatants.find((c) => c.id === cid1);
    const c2 = this.combatants.find((c) => c.id === cid2);
    if (c1 && c2 && c1.teamId !== undefined && c2.teamId !== undefined) {
      return c1.teamId === c2.teamId;
    }
    return false;
  }

  /** Damage an arbitrary player (local or foe); death starts a 4s respawn timer. */
  private damagePlayerEntity(
    p: Player,
    dmg: number,
    _b?: Bullet,
    knockX = 0,
    knockY = 0,
    attackerId?: number,
    weaponHint?: string
  ) {
    // already downed and waiting to respawn -> ignore further hits
    if (p.deadTimer && p.deadTimer > 0) return;

    const localId = this.mode === "local" ? 0 : this.selfPid;
    const finalAttackerId = (attackerId !== undefined && attackerId >= 0) ? attackerId : (this.activeId ?? localId);
    const victimC = this.combatants.find(c => c.player === p || (p.cid !== undefined && c.id === p.cid));
    const victimCid = victimC ? victimC.id : (p.cid ?? -1);

    // Block friendly fire in all team modes (team_deathmatch)
    if (this.isTeammate(finalAttackerId, victimCid) && finalAttackerId !== victimCid) {
      return;
    }

    // 冲撞 (charge_slam) 进行中：所受伤害降低 35%
    if (p.isChargingSlam) dmg *= 0.65;
    if (p.isCloaked) p.isCloaked = false; // 受击自动破隐

    const prevHp = p.hp;
    const prevShield = p.shieldHp ?? 0;

    if (p.iframes > 0 || p.shieldTime > 0) {
      if (p.shieldTime > 0) this.spawnParticles(p.x, p.y, "#60a5fa", 4, 90, 0.3);
      return;
    }
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      p.shieldHp -= dmg;
      this.spawnParticles(p.x, p.y, "#60a5fa", 5, 100, 0.3);
      if (p.shieldHp <= 0) {
        p.shieldHp = 0;
        p.shieldBlockTime = 0;
        p.shieldCd = this.gun.shieldRechargeTime ?? 8;
        const isLocalVictimShield = (p === this.localPlayer) || (p.cid !== undefined && p.cid === localId);
        if (isLocalVictimShield) this.shake = 12;
        sound.explosion();
      }
      // Track score for shield damage (actual absorbed damage)
      const shieldDiff = prevShield - p.shieldHp;
      this.awardDamageScore(finalAttackerId, shieldDiff);
      return;
    }
    p.hp -= dmg;
    p.flash = 1;
    if (_b && _b.stunDuration && _b.stunDuration > 0) {
      p.stunTime = Math.max(p.stunTime ?? 0, _b.stunDuration);
      this.effects.push({ type: "lightning", x: p.x, y: p.y, r: p.size, duration: _b.stunDuration, color: "#fef08a" });
    }
    // In deathmatch (human-vs-bots) DON'T grant post-hit invulnerability, so
    // damage lands continuously — otherwise every combatant is immune for
    // 0.45s after each hit and feels far thicker than its 250 HP suggests.
    // Other modes (PvP / PvE) keep the short iframe to avoid burst instakills.
    // Dash / skill i-frames (set elsewhere) still apply via the check above.
    if (!this.isDM) p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    // Only shake screen when the LOCAL player is hit
    const isLocalVictim = (p === this.localPlayer) || (p.cid !== undefined && p.cid === localId);
    if (isLocalVictim) {
      this.shake = Math.min(16, this.shake + dmg * 0.4);
    }
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    // apply knockback (melee); clamp to world bounds
    if (knockX || knockY) {
      p.x = Math.max(p.size, Math.min(this.worldW - p.size, p.x + knockX));
      p.y = Math.max(p.size, Math.min(this.worldH - p.size, p.y + knockY));
    }

    // Track score for health damage (actual damage dealt)
    const hpDiff = prevHp - p.hp;
    this.awardDamageScore(finalAttackerId, hpDiff);

    const attackerC = this.combatants.find(c => c.id === finalAttackerId);

    if (victimC) victimC.damageTaken = (victimC.damageTaken ?? 0) + hpDiff;
    if (attackerC) attackerC.damageDealt = (attackerC.damageDealt ?? 0) + hpDiff;

    const isLocalAttacker = finalAttackerId === localId;

    if (hpDiff > 0) {
      if (isLocalAttacker && !isLocalVictim) {
        this.playerDamageDealt += hpDiff;
        this.recordDamageLog(
          hpDiff,
          _b?.weapon || weaponHint || this.gun.id,
          victimC ? victimC.name : "对手",
          "你",
          true
        );
      } else if (isLocalVictim && !isLocalAttacker) {
        this.playerDamageTaken += hpDiff;
        this.recordDamageLog(
          hpDiff,
          _b?.weapon || weaponHint || this.getAttackerWeaponId(attackerC) || "combatant_attack",
          "你",
          attackerC ? attackerC.name : "对手",
          false
        );
      }
    }

    if (p.hp <= 0) {
      p.hp = 0;
      p.deadTimer = RESPAWN_TIME;
      p.bowDrawing = false;
      if (victimC) victimC.deaths = (victimC.deaths ?? 0) + 1;
      this.spawnParticles(p.x, p.y, "#f472b6", 30, 200, 0.6);
      
      if (isLocalVictim) {
        this.playerDeaths++;
        this.eliminatedBy = weaponHint === "train" ? "极地特快列车" : attackerC ? attackerC.name : "对手";
        sound.playDeath();
      }

      // coin burst on every non-biohazard enemy death (deathmatch bots / PvP foe)
      if (this.gameMode !== "biohazard") {
        const killer = attackerC ? attackerC.player : null;
        const kdx = killer ? p.x - killer.x : 0;
        const kdy = killer ? p.y - killer.y : 0;
        this.spawnCoinBurstFX(p.x, p.y, p.size, false, true, "", kdx, kdy);
      }
      if (p === this.player) {
        // stop any continuous fire so no beam/flame lingers on the corpse
        this.firing = false;
        this.beamActive = false;
        this.flameActive = false;
      }
      if (this.isDM) {
        const victim = victimC ?? (this.combatants.find((c) => c.id === (p.cid ?? 0)) ?? null);
        const killer = attackerC ?? (this.combatants.find((c) => c.id === finalAttackerId) ?? undefined);
        if (killer && victim && killer.id !== victim.id) {
          killer.kills += 1;
          killer.score += 250;
          const kName = killer.id === localId ? "你" : killer.name;
          const vName = victim.id === localId ? "你" : victim.name;
          
          this.addKillFeed(kName, vName, _b?.weapon || weaponHint, killer);
          // mirror to clients (deathmatch PvP/bot kill)
          this.pushFeedEvent({
            kind: "kill",
            pid: killer.id,
            victimPid: victim.id,
            killerName: killer.name,
            victimName: victim.name,
            weaponId: _b?.weapon || weaponHint,
            amount: 250,
            kills: killer.kills,
          });
          if (killer.id === localId) {
            this.kills += 1;
            this.score += 250;
            this.addScoreFeed("淘汰", 250, vName, 250, killer.kills);
            sound.playKillConfirm();
            this.banner = { text: `击杀 ${vName}`, t: 1.6 };
          } else if (victim.id === localId) {
            this.banner = { text: `你被 ${kName} 击败`, t: 1.6 };
          }

          let teamKills = killer.kills;
          if (this.gameMode === "team_deathmatch" && killer.teamId !== undefined) {
             teamKills = this.combatants.filter(c => c.teamId === killer.teamId).reduce((sum, c) => sum + c.kills, 0);
          }
          if (teamKills >= this.dmKillLimit && !this.gameOver) {
             if (this.gameMode === "team_deathmatch") {
                 const isMyTeam = (killer.teamId === 0);
                 this.endGame(isMyTeam ? "你的队伍获胜" : "其他队伍率先达到目标");
             } else {
                 this.endGame(killer.id === this.selfPid || (this.mode === "local" && killer.id === 0) ? "你赢了" : `${kName} 获胜`);
             }
          }
        } else if (victim && (victim.id === this.selfPid || (this.mode === "local" && victim.id === 0))) {
          this.banner = { text: `你被击败 ${RESPAWN_TIME} 秒后复活`, t: 1.6 };
        }
      } else if (p === this.foe) {
        // you downed the opponent
        this.kills += 1;
        this.score += 250;
        this.addKillFeed("你", this.peerName || "对手", _b?.weapon || weaponHint);
        this.addScoreFeed("淘汰", 250, this.peerName || "对手", 250, this.kills);
        // mirror to the guest (host downed the opponent in base-battle PvP)
        this.pushFeedEvent({
          kind: "kill",
          pid: this.selfPid,
          victimPid: this.peerPid,
          victimName: this.peerName || "对手",
          weaponId: _b?.weapon || weaponHint,
          amount: 250,
          kills: this.kills,
        });
        this.banner = { text: `击杀 ${this.peerName || "对手"}`, t: 1.6 };
        sound.playKillConfirm();
      } else {
        this.banner = { text: `你被击败 ${RESPAWN_TIME} 秒后复活`, t: 1.6 };
      }
    }
  }

  /** Generate well-distributed spawn points across the entire map, avoiding building walls. */
  private generateDistributedSpawns(): { x: number; y: number }[] {
    const spawns: { x: number; y: number }[] = [];
    const marginX = Math.min(240, this.worldW * 0.1);
    const marginY = Math.min(160, this.worldH * 0.14);
    const useW = this.worldW - marginX * 2;
    const useH = this.worldH - marginY * 2;

    const cols = 5;
    const rows = 4;
    const stepX = useW / (cols - 1);
    const stepY = useH / (rows - 1);

    const isInsideBuilding = (x: number, y: number) => {
      for (const w of this.walls) {
        if (w.invisible) continue;
        if (x >= w.x - 30 && x <= w.x + w.w + 30 && y >= w.y - 30 && y <= w.y + w.h + 30) {
          return true;
        }
      }
      return false;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let x = marginX + c * stepX + Math.sin(r * 2.5 + c * 3.7) * 35;
        let y = marginY + r * stepY + Math.cos(r * 4.1 + c * 1.9) * 25;

        x = Math.max(100, Math.min(this.worldW - 100, x));
        y = Math.max(80, Math.min(this.worldH - 80, y));

        if (isInsideBuilding(x, y)) {
          x += 50;
          y += 50;
        }
        spawns.push({ x: Math.round(x), y: Math.round(y) });
      }
    }
    return spawns;
  }

  /** Generate N spawn points spread evenly across the WHOLE arena (never
   *  clustered in one spot). Uses a jittered grid with wall avoidance and a
   *  shuffle so consecutive indices (teams) are not assigned adjacent cells. */
  private generateCombatSpawns(count: number): { x: number; y: number }[] {
    const marginX = Math.min(220, this.worldW * 0.09);
    const marginY = Math.min(150, this.worldH * 0.12);
    const useW = this.worldW - marginX * 2;
    const useH = this.worldH - marginY * 2;

    const isInsideBuilding = (x: number, y: number) => {
      for (const w of this.walls) {
        if (w.invisible) continue;
        if (x >= w.x - 30 && x <= w.x + w.w + 30 && y >= w.y - 30 && y <= w.y + w.h + 30) {
          return true;
        }
      }
      return false;
    };

    // Pick a grid large enough to hold `count` cells with slack so we can
    // shuffle and slice while keeping points well separated.
    const cols = Math.max(2, Math.ceil(Math.sqrt(count * 1.6)));
    const rows = Math.max(2, Math.ceil(count / cols));
    const stepX = useW / Math.max(1, cols - 1);
    const stepY = useH / Math.max(1, rows - 1);
    const jitterX = stepX * 0.26;
    const jitterY = stepY * 0.26;

    const candidates: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let x = marginX + c * stepX + (Math.random() - 0.5) * jitterX;
        let y = marginY + r * stepY + (Math.random() - 0.5) * jitterY;
        x = Math.max(90, Math.min(this.worldW - 90, x));
        y = Math.max(80, Math.min(this.worldH - 80, y));
        if (isInsideBuilding(x, y)) {
          x = Math.max(90, Math.min(this.worldW - 90, x + 60));
          y = Math.max(80, Math.min(this.worldH - 80, y + 60));
        }
        candidates.push({ x: Math.round(x), y: Math.round(y) });
      }
    }

    // Shuffle so the player (index 0) and each team's members don't always get
    // the same cells, further reducing the chance of clustered spawns.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, count);
  }

  /** Pick the spawn point from dmSpawns that is furthest from active enemies,
   *  then nudge it slightly so consecutive respawns never land on the exact
   *  same pixel (reduces spawn-camping / pile-ups). */
  private getSafestSpawnPoint(teamId?: number, selfCid?: number): { x: number; y: number } {
    if (!this.dmSpawns || this.dmSpawns.length === 0) {
      this.dmSpawns = this.generateDistributedSpawns();
    }
    const pool = this.dmSpawns;

    // Collect positions of living enemies
    const enemyPositions: { x: number; y: number }[] = [];
    if (this.isDM) {
      for (const c of this.combatants) {
        if (c.id === selfCid) continue;
        if (teamId !== undefined && c.teamId === teamId) continue;
        const q = c.player;
        if (q && (!q.deadTimer || q.deadTimer <= 0)) {
          enemyPositions.push({ x: q.x, y: q.y });
        }
      }
    } else if (this.foe && (!this.foe.deadTimer || this.foe.deadTimer <= 0)) {
      enemyPositions.push({ x: this.foe.x, y: this.foe.y });
    }

    let picked = pool[0];
    if (enemyPositions.length === 0) {
      picked = pool[Math.floor(Math.random() * pool.length)];
    } else {
      let maxMinDistSq = -1;
      for (const sp of pool) {
        let minDistSq = Infinity;
        for (const ep of enemyPositions) {
          const d2 = (sp.x - ep.x) ** 2 + (sp.y - ep.y) ** 2;
          if (d2 < minDistSq) minDistSq = d2;
        }
        if (minDistSq > maxMinDistSq) {
          maxMinDistSq = minDistSq;
          picked = sp;
        }
      }
    }

    // Small random offset (±20px) so repeated respawns aren't pixel-identical.
    const jx = picked.x + (Math.random() - 0.5) * 40;
    const jy = picked.y + (Math.random() - 0.5) * 40;
    return {
      x: Math.max(80, Math.min(this.worldW - 80, Math.round(jx))),
      y: Math.max(70, Math.min(this.worldH - 70, Math.round(jy))),
    };
  }

  /** Pick a random respawn point for the PvE foe that is well away from the
   *  player, so it doesn't keep coming back at the same center-top spot and
   *  face-hug the player. Uses squared distance for the min-distance check. */
  private randomFoeSpawn(): { x: number; y: number } {
    const minDist = Math.max(320, Math.min(this.worldW, this.worldH) * 0.34);
    const minD2 = minDist * minDist;
    const margin = 60;
    const px = this.player.x, py = this.player.y;
    let best = { x: this.worldW / 2, y: 220 };
    let bestD2 = -1;
    for (let i = 0; i < 16; i++) {
      const x = margin + Math.random() * (this.worldW - margin * 2);
      const y = margin + Math.random() * (this.worldH - margin * 2);
      const d2 = (x - px) ** 2 + (y - py) ** 2;
      if (d2 >= minD2) return { x, y };
      if (d2 > bestD2) { bestD2 = d2; best = { x, y }; }
    }
    return best;
  }

  private tickRespawns(dt: number) {
    if (this.isDM) {
      for (const c of this.combatants) {
        const p = c.player;
        if (!p.deadTimer || p.deadTimer <= 0) continue; // alive, nothing to do
        if (p.deadTimer > dt) {
          // still counting down this frame — no spawn calculation needed, just
          // keep the revive timer ticking (reviveIfReady won't fire yet).
          this.reviveIfReady(p, p.x, p.y, dt, c.guns, c.weaponStates);
          continue;
        }
        // Dynamically select the safest spawn point furthest from active enemies
        const sp = this.getSafestSpawnPoint(c.teamId, c.id);
        this.reviveIfReady(p, sp.x, sp.y, dt, c.guns, c.weaponStates);
      }
      return;
    }
    this.reviveIfReady(this.player, this.worldW / 2, this.worldH - 200, dt, this.guns, this.weaponStates);
    // PvE foe: respawn at a RANDOM spot away from the player (not the fixed
    // center-top), so it doesn't pile up in the middle and face-hug. Compute
    // the random point only on the revive frame (like the DM branch).
    if (this.foe) {
      const foe = this.foe;
      if (foe.deadTimer && foe.deadTimer > 0) {
        if (foe.deadTimer <= dt) {
          const sp = this.randomFoeSpawn();
          this.reviveIfReady(foe, sp.x, sp.y, dt);
        } else {
          this.reviveIfReady(foe, foe.x, foe.y, dt);
        }
      }
    }
  }

  private reviveIfReady(
    p: Player,
    spawnX: number,
    spawnY: number,
    dt: number,
    guns?: GunDef[],
    weaponStates?: Map<string, WeaponState>
  ) {
    if (!p.deadTimer || p.deadTimer <= 0) return;
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) {
      p.deadTimer = 0;
      p.hp = p.maxHp;
      p.x = spawnX;
      p.y = spawnY;
      p.vx = 0;
      p.vy = 0;
      p.iframes = 2;
      p.dashVx = 0;
      p.dashVy = 0;
      p.dashTime = 0;
      // respawn with every weapon fully loaded so the player never has to
      // reload immediately after reviving.
      if (guns && weaponStates) {
        for (const g of guns) {
          const ws = weaponStates.get(g.id);
          if (ws) {
            ws.ammo = g.magazine ?? 0;
            ws.reload = 0;
            ws.heat = 0;
            ws.overheated = false;
          }
        }
      }
      this.spawnParticles(p.x, p.y, "#4ade80", 24, 200, 0.6);
    }
  }

  // ---- host: pull peer messages, simulate remote, stream snapshots ----
  private pumpNet() {
    if (!this.net) return;
    for (const m of this.net.drainGameMsgs()) {
      if (m.t === "inp") this.remoteInput = m.input;
      else if (m.t === "snap") {
        this.lastSnap = m.snap;
        this.newSnapArrived = true;
      }
      else if (m.t === "hello") {
        this.peerName = m.name;
        this.peerLoadout = m.loadout as Loadout;
        this.applyPeerLoadout();
        // The host only begins the match once the guest is actually present.
        if (this.mode === "host") {
          this.peerReady = true;
          this.matchLive = true;
        }
      }
    }
  }

  private simulateRemote(dt: number) {
    const foe = this.foe;
    const inp = this.remoteInput;
    if (!foe || !inp) return;
    this.simulatingOther = true;
    // downed opponent: no movement / firing until it respawns
    if (foe.deadTimer && foe.deadTimer > 0) return;
    const sp = this.player,
      sg = this.gunIndex,
      sk = this.keys,
      sm = this.mouse,
      sf = this.firing,
      sGuns = this.guns,
      sGadgets = this.gadgets,
      sGadgetCd = this.gadgetCd;
    const sSkill = this.skillCd,
      sDash = this.dashCharges,
      sDashR = this.dashRecharge,
      sLastG = this.lastGadget,
      sSemi = this.semiAutoLatch,
      sActive = this.activeId,
      sWs = this.weaponStates;
    const sSec = this.secondaryFiring;
    // save the host's own joystick vector so it can be restored after simulating
    const svmx = this.virtualMove.x;
    const svmy = this.virtualMove.y;
    // load foe state into the engine's single-player simulation context
    this.player = foe;
    this.guns = this.foeGuns.length ? this.foeGuns : this.guns;
    this.gunIndex = Math.min(foe.gunIndex ?? 0, this.guns.length - 1);
    this.keys = new Set(inp.keys);
    this.mouse = { x: inp.mx, y: inp.my };
    // adopt the GUEST's joystick vector so the host simulates the foe's movement
    this.virtualMove.x = inp.vmx;
    this.virtualMove.y = inp.vmy;
    this.firing = inp.firing;
    this.skillCd = foe.skillCd ?? 0;
    this.dashCharges = foe.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = foe.dashRecharge ?? 0;
    this.lastGadget = foe.lastGadget ?? 0;
    // adopt the GUEST's own gadget list so slot indices resolve to THEIR gadget
    this.gadgets = this.foeGadgets.length ? this.foeGadgets : this.gadgets;
    this.gadgetCd = this.foeGadgetCd;
    this.activeId = this.peerPid;
    this.weaponStates = this.foeWeaponStates;
    // decay the foe's gadget cooldowns
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    this.semiAutoLatch = false;
    this.updatePlayer(dt);
    if (!this.player.stunTime || this.player.stunTime <= 0) {
      if (inp.weaponSwitch) {
        this.clearGadgetSelection();
        this.gunIndex = (this.gunIndex + 1) % this.guns.length;
      }
      if (inp.skill) {
        // 用 guest 自己的技能定义驱动激活，否则会误用 host 的技能，
        // 导致 guest 的隐身等技能不在 host 端 this.foe 上生效（快照看不到、人机照瞄）
        const prevSkill = this.skill;
        this.skill = getSkill(this.peerLoadout?.skillId ?? "dash");
        this.activateSkill();
        this.skill = prevSkill;
      }
      if (inp.reload) this.reloadCurrent();
      if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
    }
    // write foe state back
    foe.gunIndex = this.gunIndex;
    foe.skillCd = this.skillCd;
    foe.dashCharges = this.dashCharges;
    foe.dashRecharge = this.dashRecharge;
    foe.lastGadget = this.lastGadget;
    // persist the foe's (possibly updated) gadget cooldowns
    this.foeGadgetCd = this.gadgetCd;
    this.foeWeaponStates = this.weaponStates;
    // restore local context
    this.player = sp;
    this.guns = sGuns;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.gadgets = sGadgets;
    this.gadgetCd = sGadgetCd;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
    this.activeId = sActive;
    this.weaponStates = sWs;
    this.secondaryFiring = sSec;
    // restore the host's own joystick vector
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
    this.simulatingOther = false;
  }

  // ------------------------------------------------------ deathmatch AI bots
  /** Set the bot AI decision frequency (Hz). Higher = bots re-decide more often
   *  (smarter, more CPU). Clamped to a sane range. */
  setBotAiHz(hz: number) {
    this.botAiHz = Math.min(120, Math.max(2, hz));
  }

  /** Simulate one AI bot through the SAME per-player combat code by swapping the
   *  engine's single simulation context onto the bot, running its brain
   *  (`botThink`) + `updatePlayer`, then restoring the human's context. */
  private simulateBot(c: Combatant, dt: number) {
    if (c.player.deadTimer && c.player.deadTimer > 0) return;
    this.simulatingOther = true;
    // save the human's (combatant 0) single-simulation context
    const sp = this.player, sg = this.gunIndex, sk = this.keys, sm = this.mouse,
      sf = this.firing, sGuns = this.guns, sGadgets = this.gadgets,
      sGadgetCd = this.gadgetCd, sWs = this.weaponStates;
    const sSkill = this.skillCd, sDash = this.dashCharges, sDashR = this.dashRecharge,
      sLastG = this.lastGadget, sSemi = this.semiAutoLatch, sChar = this.character,
      sOut = this.outfit, sSkillDef = this.skill, sActive = this.activeId;
    const sSec = this.secondaryFiring;
    const svmx = this.virtualMove.x, svmy = this.virtualMove.y;
    // load bot context
    this.player = c.player;
    this.guns = c.guns;
    this.gunIndex = Math.min(c.gunIndex ?? 0, this.guns.length - 1);
    this.character = c.character;
    this.outfit = c.outfit;
    this.skill = c.skill;
    this.skillCd = c.skillCd ?? 0;
    this.dashCharges = c.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = c.dashRecharge ?? 0;
    this.lastGadget = c.lastGadget ?? 0;
    this.gadgets = c.gadgets;
    this.gadgetCd = c.gadgetCd;
    this.weaponStates = c.weaponStates;
    this.semiAutoLatch = false;
    this.activeId = c.id;
    // throttle AI decisions: run the heavy brain (botThink) at a fixed rate
    // (`aiStep`, decoupled from the render frame rate) and replay only the cached
    // MOVEMENT intent between decisions. AIM + FIRE are recomputed EVERY frame by
    // `botAimFire` so bots stay aggressive and never hesitate when an enemy appears
    // between decisions. The decision interval = 1 / botAiHz and can be tuned live
    // from settings (higher Hz = smarter but more CPU).
    const decide = (c.aiTimer ?? 0) <= 0;
    if (decide) {
      this.keys = new Set();
      this.mouse = { x: c.player.x, y: c.player.y - 1 };
      this.virtualMove = { x: 0, y: 0 };
      this.firing = false;
      const intent = this.botThink(c, dt);
      c.aiTimer = this.aiStep;
      this.botAimFire(c, dt);
      c.aiMvx = this.virtualMove.x;
      c.aiMvy = this.virtualMove.y;
      this.updatePlayer(dt);
      if (intent.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
      if (intent.skill) this.activateSkill();
      if (intent.reload) this.reloadCurrent();
      if (intent.gadget >= 0)
        this.deployGadget(intent.gadget, intent.gadgetX ?? this.mouse.x, intent.gadgetY ?? this.mouse.y);
    } else {
      c.aiTimer = (c.aiTimer ?? 0) - dt;
      this.keys = new Set();
      // IMPORTANT: give `this.mouse` a FRESH object here (like the decide branch).
      // `sm` is a *reference* to the human's real mouse; without this, botAimFire
      // would mutate the human's mouse coords directly -> crosshair goes crazy.
      this.mouse = { x: c.player.x, y: c.player.y - 1 };
      // replay cached movement, but recompute aim + fire responsively
      this.virtualMove = { x: c.aiMvx ?? 0, y: c.aiMvy ?? 0 };
      this.botAimFire(c, dt);
      this.updatePlayer(dt);
    }
    // age the bot's OWN cooldowns so it can actually re-use skills / gadgets /
    // dashes. (The human's cooldowns are aged in `update()`; the bot context is
    // only live inside this function, so it must age them here or they'd stay
    // stuck at their post-use value forever.)
    if (this.skillCd > 0) this.skillCd -= dt;
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    if (this.dashCharges < MAX_DASH_CHARGES) {
      this.dashRecharge += dt;
      if (this.dashRecharge >= DASH_RECHARGE) {
        this.dashRecharge = 0;
        this.dashCharges = Math.min(MAX_DASH_CHARGES, this.dashCharges + 1);
      }
    } else {
      this.dashRecharge = 0;
    }
    // write bot state back
    c.gunIndex = this.gunIndex;
    c.skillCd = this.skillCd;
    c.dashCharges = this.dashCharges;
    c.dashRecharge = this.dashRecharge;
    c.lastGadget = this.lastGadget;
    // c.gadgetCd is the SAME Map reference as this.gadgetCd (mutated in place)
    // restore human context
    this.player = sp;
    this.guns = sGuns;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.gadgets = sGadgets;
    this.gadgetCd = sGadgetCd;
    this.weaponStates = sWs;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
    this.character = sChar;
    this.outfit = sOut;
    this.skill = sSkillDef;
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
    this.activeId = sActive;
    this.secondaryFiring = sSec;
    this.simulatingOther = false;
  }

  /** Effective engagement range of a gun (px), used by bot target-range logic. */
  private gunEffRange(g: GunDef): number {
    if (g.weaponClass === "beam") return g.beamRange ?? 600;
    if (g.weaponClass === "flamethrower") return g.flameRange ?? 260;
    if (g.weaponClass === "poison_mist") return 320;
    if (g.weaponClass === "melee" || g.weaponClass === "shield")
      return (g.meleeRange ?? 64) + 24;
    return Math.max(1000, (g.bulletSpeed ?? 700) * (g.life ?? 1.5));
  }

  /** Simple & fast A* pathfinding for bot navigation around obstacles */
  private findBotPath(startX: number, startY: number, targetX: number, targetY: number, pSize = 24): { x: number; y: number } {
    if (this.botLOS(startX, startY, targetX, targetY)) {
      const ang = Math.atan2(targetY - startY, targetX - startX);
      return { x: Math.cos(ang), y: Math.sin(ang) };
    }

    const CELL = 60;
    const cols = Math.ceil(this.worldW / CELL);
    const rows = Math.ceil(this.worldH / CELL);

    const startCol = Math.max(0, Math.min(cols - 1, Math.floor(startX / CELL)));
    const startRow = Math.max(0, Math.min(rows - 1, Math.floor(startY / CELL)));
    const targetCol = Math.max(0, Math.min(cols - 1, Math.floor(targetX / CELL)));
    const targetRow = Math.max(0, Math.min(rows - 1, Math.floor(targetY / CELL)));

    if (startCol === targetCol && startRow === targetRow) {
      const ang = Math.atan2(targetY - startY, targetX - startX);
      return { x: Math.cos(ang), y: Math.sin(ang) };
    }

    const isCellBlocked = (c: number, r: number): boolean => {
      if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
      const cx = (c + 0.5) * CELL;
      const cy = (r + 0.5) * CELL;
      return this.pointInWall(cx, cy, pSize + 10);
    };

    const totalCells = cols * rows;
    const openSet: number[] = [];
    const gScore = new Float32Array(totalCells).fill(Infinity);
    const fScore = new Float32Array(totalCells).fill(Infinity);
    const cameFrom = new Int32Array(totalCells).fill(-1);
    const inOpen = new Uint8Array(totalCells);

    const startIdx = startRow * cols + startCol;
    const targetIdx = targetRow * cols + targetCol;

    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(startCol - targetCol, startRow - targetRow);
    openSet.push(startIdx);
    inOpen[startIdx] = 1;

    let steps = 0;
    const maxSteps = 250;

    while (openSet.length > 0 && steps++ < maxSteps) {
      let bestIdx = 0;
      let minF = fScore[openSet[0]];
      for (let i = 1; i < openSet.length; i++) {
        if (fScore[openSet[i]] < minF) {
          minF = fScore[openSet[i]];
          bestIdx = i;
        }
      }

      const current = openSet[bestIdx];
      if (current === targetIdx) break;

      openSet[bestIdx] = openSet[openSet.length - 1];
      openSet.pop();
      inOpen[current] = 0;

      const curR = Math.floor(current / cols);
      const curC = current % cols;

      const neighbors = [
        [curC + 1, curR, 1], [curC - 1, curR, 1],
        [curC, curR + 1, 1], [curC, curR - 1, 1],
        [curC + 1, curR + 1, 1.414], [curC - 1, curR + 1, 1.414],
        [curC + 1, curR - 1, 1.414], [curC - 1, curR - 1, 1.414]
      ];

      for (const [nc, nr, dist] of neighbors) {
        if (isCellBlocked(nc, nr)) continue;
        const nIdx = nr * cols + nc;
        const tentativeG = gScore[current] + dist;

        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(nc - targetCol, nr - targetRow);
          if (!inOpen[nIdx]) {
            openSet.push(nIdx);
            inOpen[nIdx] = 1;
          }
        }
      }
    }

    let curr = targetIdx;
    if (cameFrom[curr] === -1 && curr !== startIdx) {
      let closestIdx = startIdx;
      let minH = Infinity;
      for (let i = 0; i < totalCells; i++) {
        if (gScore[i] < Infinity && fScore[i] < minH) {
          minH = fScore[i];
          closestIdx = i;
        }
      }
      curr = closestIdx;
    }

    if (curr === startIdx) {
      const ang = Math.atan2(targetY - startY, targetX - startX);
      return { x: Math.cos(ang), y: Math.sin(ang) };
    }

    while (cameFrom[curr] !== -1 && cameFrom[curr] !== startIdx) {
      curr = cameFrom[curr];
    }

    const wayR = Math.floor(curr / cols);
    const wayC = curr % cols;
    const wayX = (wayC + 0.5) * CELL;
    const wayY = (wayR + 0.5) * CELL;

    const ang = Math.atan2(wayY - startY, wayX - startX);
    return { x: Math.cos(ang), y: Math.sin(ang) };
  }

  /** Wall avoidance helper to steer bot velocity vector away from obstacle collisions */
  private botAvoidWalls(p: Player, vx: number, vy: number): { x: number; y: number } {
    if (vx === 0 && vy === 0) return { x: 0, y: 0 };
    const speed = Math.hypot(vx, vy);
    const ang = Math.atan2(vy, vx);
    const checkDist = p.size + 50;
    // Treat the arena border like a wall too: a bot that retreats all the way to
    // the world edge gets clamped against it and appears to hover "in the sky"
    // above the arena (its feet never on the playable ground).
    const inWorld = (px: number, py: number) =>
      px >= p.size && px <= this.worldW - p.size && py >= p.size && py <= this.worldH - p.size;
    const blocked = (px: number, py: number) =>
      !inWorld(px, py) || this.pointInWall(px, py, p.size);
    const tx = p.x + Math.cos(ang) * checkDist;
    const ty = p.y + Math.sin(ang) * checkDist;
    if (!blocked(tx, ty)) {
      return { x: vx, y: vy };
    }
    const angles = [
      ang + Math.PI / 4, ang - Math.PI / 4,
      ang + Math.PI / 2, ang - Math.PI / 2,
      ang + (3 * Math.PI) / 4, ang - (3 * Math.PI) / 4,
      ang + Math.PI
    ];
    for (const a of angles) {
      const cx = p.x + Math.cos(a) * checkDist;
      const cy = p.y + Math.sin(a) * checkDist;
      if (!blocked(cx, cy)) {
        return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
      }
    }
    // Fully boxed in: steer back toward the arena center rather than jamming in place.
    const toCenter = Math.atan2(this.worldH / 2 - p.y, this.worldW / 2 - p.x);
    return { x: Math.cos(toCenter) * speed, y: Math.sin(toCenter) * speed };
  }

  /** Bot decision-making: pick a target, lead-aim, pick the best weapon for the
   *  distance, strafe/approach/retreat, fire aggressively on line-of-sight, and
   *  use skills / deploy gadgets situationally. Returns one-shot actions. */
  private botThink(
    c: Combatant,
    dt: number
  ): { weaponSwitch: boolean; skill: boolean; reload: boolean; gadget: number; gadgetX?: number; gadgetY?: number } {
    const p = c.player;
    const intent = { weaponSwitch: false, skill: false, reload: false, gadget: -1 } as {
      weaponSwitch: boolean; skill: boolean; reload: boolean; gadget: number;
      gadgetX?: number; gadgetY?: number;
    };
    // 1. Pick the nearest living opponent player or AI bot
    let target: Player | null = null;
    let bestD = Infinity;
    for (const o of this.combatants) {
      if (o.id === c.id || this.isTeammate(c.id, o.id)) continue;
      const q = o.player;
      if (q.deadTimer && q.deadTimer > 0) continue;
      if (q.isCloaked) continue;
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) { bestD = d; target = q; }
    }

    // 2. If no enemy combatant found or in biohazard mode, target PvE monsters (enemies)
    if (!target || this.gameMode === "biohazard") {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          target = { x: e.x, y: e.y, vx: e.vx ?? 0, vy: e.vy ?? 0, hp: e.hp, maxHp: e.maxHp, deadTimer: 0 } as any;
        }
      }
    }

    // Objective navigation targets
    let objX: number | null = null;
    let objY: number | null = null;

    // Teammate Healing Check: deploy healing station / support for injured teammates
    const injuredAlly = this.combatants.find(o => this.isTeammate(c.id, o.id) && o.player.hp < o.player.maxHp * 0.75 && (!o.player.deadTimer || o.player.deadTimer <= 0));
    if (injuredAlly && c.gadgets.length && (c.gadgetTimer ?? 0) <= 0) {
      const healGadgetIdx = c.gadgets.findIndex(g => g.kind === "healing_station" && (c.gadgetCd.get(g.id) ?? 0) <= 0);
      if (healGadgetIdx >= 0) {
        intent.gadget = healGadgetIdx;
        intent.gadgetX = injuredAlly.player.x;
        intent.gadgetY = injuredAlly.player.y;
        c.gadgetTimer = 3;
      }
    }

    // 5. Squad Formation: Follow nearby teammate if out of combat and no objective
    if (!target && objX === null && objY === null) {
      const ally = this.combatants.find(o => o.id !== c.id && this.isTeammate(c.id, o.id) && (!o.player.deadTimer || o.player.deadTimer <= 0));
      if (ally) {
        const ad = Math.hypot(ally.player.x - p.x, ally.player.y - p.y);
        if (ad > 180) {
          objX = ally.player.x;
          objY = ally.player.y;
        }
      }
    }

    if (!target && objX === null && objY === null) {
      this.firing = false;
      this.virtualMove.x = 0;
      this.virtualMove.y = 0;
      return intent;
    }

    const dist = target ? Math.sqrt(bestD) : 0;
    const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : 0;

    // ---- smart weapon selection by distance (with hysteresis) ----
    c.weaponCd = (c.weaponCd ?? 0) - dt;
    if (target && c.guns.length > 1 && (c.weaponCd ?? 0) <= 0) {
      let best = c.gunIndex;
      let bestScore = -Infinity;
      for (let i = 0; i < c.guns.length; i++) {
        const gg = c.guns[i];
        const r = this.gunEffRange(gg);
        const dps = gg.damage * gg.fireRate * (gg.pellets ?? 1) * (gg.parallel ?? 1);
        let score: number;
        if (dist <= r * 1.05) {
          const util = 1 - Math.abs(dist - r * 0.6) / (r + 1);
          score = dps * (0.5 + Math.max(0, util));
        } else {
          score = dps * 0.05 - (dist - r);
        }
        if (dist < 120 && (gg.weaponClass === "melee" || gg.weaponClass === "shield" || (gg.pellets ?? 1) > 1)) {
          score += 5000;
        }
        if (score > bestScore) { bestScore = score; best = i; }
      }
      if (best !== c.gunIndex) {
        this.gunIndex = best;
        c.weaponCd = 1.2;
      }
    }
    const g = this.gun;

    // ---- aim with light target leading so moving foes get hit ----
    if (target) {
      const lead = g.bulletSpeed ? Math.min(dist / g.bulletSpeed, 0.4) : 0;
      this.mouse.x = target.x + target.vx * lead;
      this.mouse.y = target.y + target.vy * lead;
      p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    } else if (objX !== null && objY !== null) {
      this.mouse.x = objX;
      this.mouse.y = objY;
      p.angle = Math.atan2(objY - p.y, objX - p.x);
    }

    // ---- clamp objective coordinates to map boundaries to prevent A* / movement twitching ----
    if (objX !== null) objX = Math.max(30, Math.min(this.worldW - 30, objX));
    if (objY !== null) objY = Math.max(30, Math.min(this.worldH - 30, objY));

    // ---- movement: navigate to objective / teammate using A* pathfinding or combat strafe ----
    let rawMvx = 0, rawMvy = 0;
    if (objX !== null && objY !== null && (!target || dist > 250)) {
      const pathDir = this.getAsyncPath(c, objX, objY);
      rawMvx = pathDir.x;
      rawMvy = pathDir.y;
    } else if (target) {
      // If LOS to target is blocked, use A* pathfinding to reach LOS
      if (!this.botLOS(p.x, p.y, target.x, target.y)) {
        const pathDir = this.getAsyncPath(c, target.x, target.y);
        rawMvx = pathDir.x;
        rawMvy = pathDir.y;
      } else {
        c.pathfindingReqId = undefined; // clear request
        c.strafeTimer = (c.strafeTimer ?? 0) - dt;
        if (c.strafeTimer <= 0) {
          c.strafeTimer = 0.8 + Math.random() * 1.2;
          const r = Math.random();
          if (r < 0.5) c.strafeDir = c.strafeDir === 1 ? -1 : 1;
          else if (r < 0.8) c.strafeDir = 0;
          else c.strafeDir = 2;
        }

        // --- FIX: Override strafe logic at extremely close range to prevent orbital jitter ---
        let effectiveStrafe = c.strafeDir;
        if (dist < 45) {
           const isMelee = g.weaponClass === "melee" || g.weaponClass === "shield";
           effectiveStrafe = isMelee ? 0 : 2; // melee approach, ranged retreat
        }

        if (effectiveStrafe === 0) {
          rawMvx = Math.cos(ang); rawMvy = Math.sin(ang);
          const stopDist = (g.weaponClass === "melee" || g.weaponClass === "shield") ? ((g.meleeRange ?? 64) * 0.5) : 140;
          if (dist < stopDist) { rawMvx = 0; rawMvy = 0; }
        } else if (effectiveStrafe === 2) {
          rawMvx = -Math.cos(ang); rawMvy = -Math.sin(ang);
        } else {
          const sa = ang + (effectiveStrafe ?? 1) * Math.PI / 2;
          rawMvx = Math.cos(sa); rawMvy = Math.sin(sa);
        }
      }
    }

    let steer = this.botAvoidWalls(p, rawMvx, rawMvy);

    // Stuck position tracking & random angle deflection
    if (rawMvx !== 0 || rawMvy !== 0) {
      const movedDist = Math.hypot(p.x - (c.lastX ?? p.x), p.y - (c.lastY ?? p.y));
      if (movedDist < 12 * dt * 60) {
        c.stuckTimer = (c.stuckTimer ?? 0) + dt;
        if (c.stuckTimer > 0.8) {
          c.pathfindingReqId = undefined; // force fresh A* path recalculation
          c.stuckTimer = 0;
          const defAng = (Math.random() - 0.5) * Math.PI;
          const curAng = Math.atan2(steer.y, steer.x);
          steer.x = Math.cos(curAng + defAng);
          steer.y = Math.sin(curAng + defAng);
        }
      } else {
        c.stuckTimer = 0;
        c.lastX = p.x;
        c.lastY = p.y;
      }
    }

    c.aiMvx = (c.aiMvx ?? 0) * 0.65 + steer.x * 0.35;
    c.aiMvy = (c.aiMvy ?? 0) * 0.65 + steer.y * 0.35;
    this.virtualMove.x = c.aiMvx;
    this.virtualMove.y = c.aiMvy;

    // ---- fire aggressively: anything we can see, within this gun's range ----
    let los = false;
    let inRange = false;
    if (target) {
      los = this.botLOS(p.x, p.y, target.x, target.y);
      inRange = dist < this.gunEffRange(g) + 60;
      const close = dist < 140 || p.isChargingSlam === true;
      const shouldFire = (los || close) && inRange;
      if (shouldFire && g.semiAuto && this.semiAutoLatch) {
        this.firing = Math.random() > 0.3; // artificially release trigger briefly
      } else {
        this.firing = shouldFire;
      }
    } else {
      this.firing = false;
    }

    // ---- skill usage: dash to dodge / escape, others offensively or when hurt ----
    if (c.skillCd <= 0) {
      const lowHp = p.hp < p.maxHp * 0.45;
      if (c.skill.id === "dash") {
        if (target && (dist < 220 || lowHp) && Math.random() < 0.6) intent.skill = true;
      } else if ((inRange && los) || lowHp) {
        if (Math.random() < 0.25) intent.skill = true;
      }
    }

    // ---- gadget usage: situational, spaced out so bots don't spam ----
    c.gadgetTimer = (c.gadgetTimer ?? 0) - dt;
    if (c.gadgets.length && (c.gadgetTimer ?? 0) <= 0 && intent.gadget < 0) {
      for (const gd of c.gadgets) {
        if ((c.gadgetCd.get(gd.id) ?? 0) > 0) continue;
        let deploy = false;
        let tx = target ? target.x : p.x, ty = target ? target.y : p.y;
        switch (gd.kind) {
          case "healing_station":
            deploy = p.hp < p.maxHp * 0.7;
            tx = p.x; ty = p.y;
            break;
          case "turret_mg":
          case "turret_cannon":
          case "turret_sniper":
            deploy = target ? dist > 180 && los : false;
            tx = p.x + Math.cos(ang) * 130;
            ty = p.y + Math.sin(ang) * 130;
            break;
          case "mine_explosive":
          case "mine_poison":
          case "mine_fire":
          case "mine_stun":
            deploy = target ? dist < 220 : false;
            tx = p.x + Math.cos(ang) * 90;
            ty = p.y + Math.sin(ang) * 90;
            break;
          case "glue_grenade":
          case "fire_grenade":
          case "poison_grenade":
          case "cluster_grenade":
            deploy = target ? dist < 360 && los : false;
            tx = target ? target.x : p.x; ty = target ? target.y : p.y;
            break;
          default:
            deploy = target ? los && dist < 360 : false;
            tx = target ? target.x : p.x; ty = target ? target.y : p.y;
        }
        if (deploy && Math.random() < 0.6) {
          intent.gadget = c.gadgets.indexOf(gd);
          intent.gadgetX = tx;
          intent.gadgetY = ty;
          c.gadgetTimer = 2.5 + Math.random() * 2;
          break;
        }
      }
    }

    // ---- reload / swap if the current mag is dry ----
    const ws = this.weaponStates.get(g.id)!;
    if (g.magazine !== undefined && ws && ws.ammo <= 0 && ws.reload <= 0) {
      if (c.guns.length > 1) {
        const alt = c.guns.findIndex(
          (gg, i) => i !== this.gunIndex && ((this.weaponStates.get(gg.id)?.ammo ?? 0) > 0 || gg.magazine === undefined)
        );
        if (alt >= 0) this.gunIndex = alt;
        else intent.reload = true;
      } else intent.reload = true;
    }
    return intent;
  }

  /** Cheap, per-frame aim + fire control for a bot. */
  private botAimFire(c: Combatant, dt: number) {
    const p = c.player;
    let target: Player | null = null;
    let bestD = Infinity;
    for (const o of this.combatants) {
      if (o.id === c.id || this.isTeammate(c.id, o.id)) continue;
      const q = o.player;
      if (q.deadTimer && q.deadTimer > 0) continue;
      if (q.isCloaked) continue;
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) { bestD = d; target = q; }
    }
    // Also scan PvE enemies if no combatant target found or biohazard mode
    if (!target || this.gameMode === "biohazard") {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          target = { x: e.x, y: e.y, vx: e.vx ?? 0, vy: e.vy ?? 0, hp: e.hp, maxHp: e.maxHp, deadTimer: 0 } as any;
        }
      }
    }
    if (!target) {
      this.firing = false;
      return;
    }
    const g = this.gun;
    const dist = Math.sqrt(bestD);
    const lead = g.bulletSpeed ? Math.min(dist / g.bulletSpeed, 0.4) : 0;
    this.mouse.x = target.x + target.vx * lead;
    this.mouse.y = target.y + target.vy * lead;
    if (dist > 5) {
      p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    }

    let los: boolean;
    if ((c.losTtl ?? 0) > 0 && c.losTarget === target) {
      los = c.losResult ?? true;
    } else {
      los = this.botLOS(p.x, p.y, target.x, target.y);
      c.losTarget = target;
      c.losResult = los;
      c.losTtl = 0.1;
    }
    c.losTtl = Math.max(0, (c.losTtl ?? 0) - dt);
    const inRange = dist < this.gunEffRange(g) + 60;
    const close = dist < 140 || p.isChargingSlam === true;
    
    // release trigger for semi-auto guns during cooldown so they can fire again (prevents "stops firing" bug)
    const wState = c.weaponStates[this.gunIndex];
    if (g.semiAuto && wState && wState.cd > 0) {
      this.firing = false;
    } else {
      const shouldFire = (los || close) && inRange;
      if (shouldFire && g.semiAuto && this.semiAutoLatch) {
        this.firing = Math.random() > 0.3;
      } else {
        this.firing = shouldFire;
      }
    }
  }

  /** Line-of-sight test: true if the segment (x0,y0)->(x1,y1) is not blocked by a wall. */
  private botLOS(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const nx = dx / dist, ny = dy / dist;
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (const w of this.walls) {
      if (w.x + w.w < minX || w.x > maxX || w.y + w.h < minY || w.y > maxY) continue;
      const t = this.rayAabb(x0, y0, nx, ny, w);
      if (t >= 0 && t <= dist) return false;
    }
    return true;
  }

  private toSnapPlayer(
    p: Player,
    c: CharacterDef,
    o: OutfitDef,
    gadgets: GadgetDef[] = this.gadgets,
    gadgetCd: Map<string, number> = this.gadgetCd
  ): SnapPlayer {
    return {
      id: p === this.player ? this.selfPid : this.peerPid,
      x: p.x,
      y: p.y,
      angle: p.angle,
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      gunIndex: p.gunIndex ?? this.gunIndex,
      character: c.id,
      outfit: o.id,
      skillId: this.skill.id,
      dashCharges: p.dashCharges ?? this.dashCharges,
      maxDashCharges: MAX_DASH_CHARGES,
      shieldHp: p.shieldHp ?? null,
      shieldMaxHp: this.gun.shieldMaxHp ?? null,
      // each player's OWN gadget list + cooldown (not the host's)
      gadgets: gadgets.map((g) => ({
        id: g.id,
        ready: (gadgetCd.get(g.id) ?? 0) <= 0,
        cdPct: Math.min(1, (gadgetCd.get(g.id) ?? 0) / g.cooldown),
        deployed: 0,
      })),
      ammo: this.gun.magazine !== undefined ? this.weaponStates.get(this.gun.id)?.ammo ?? null : null,
      magazine: this.gun.magazine ?? null,
      electrified: p.electrifiedTime ?? 0,
      electrifiedGlow: p.electrifiedGlow ?? "#38bdf8",
      isCloaked: p.isCloaked ?? false,
      skillEnergy: p.skillEnergy,
    };
  }

  /** Build the full world snapshot (used by the host relay AND the authoritative server). */
  buildSnapshot(): Snapshot {
    const snapWalls = this.wallsDirty
      ? this.walls
          .filter((w) => !w.invisible)
          .map((w) => ({
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            hp: w.destructible ? Math.max(0, Math.round(w.hp)) : -1,
            maxHp: w.destructible ? w.maxHp : -1,
            destructible: w.destructible,
            glue: !!w.glue,
            building: !!w.building,
            seed: w.seed,
          }))
      : undefined;

    this.wallsDirty = false;

    return {
      time: this.time,
      scene: this.sceneIndex,
      paused: this.paused,
      players: [
        this.toSnapPlayer(this.player, this.character, this.outfit, this.gadgets, this.gadgetCd),
        ...(this.foe ? [this.toSnapPlayer(this.foe, this.foeChar!, this.foeOutfit!, this.foeGadgets, this.foeGadgetCd)] : [])
      ],
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        angle: e.angle,
        hp: e.hp,
        maxHp: e.maxHp,
        character: e.character?.id ?? "raider",
        outfit: e.outfit?.id ?? "tactical",
        elite: e.type === "elite",
        size: e.size,
      })),
      bullets: this.bullets.map((b) => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        size: b.size,
        color: b.color,
        glow: b.glow,
        kind: b.kind,
        owner: b.owner ?? "self",
      })),
      walls: snapWalls,
      effects: this.effects.map((e) => {
        let id = this.fxIds.get(e);
        if (id === undefined) {
          id = this.fxSeq++;
          this.fxIds.set(e, id);
        }
        return {
          id,
          type: e.type,
          x: e.x,
          y: e.y,
          t: e.t,
          duration: e.duration,
          radius: e.radius,
          color: e.color,
          angle: e.angle,
          arc: e.arc,
          range: e.range,
          style: e.style,
          dirX: e.dirX,
          dirY: e.dirY,
        } satisfies SnapEffect;
      }),
      grenades: this.grenades.map((gr) => ({
        x: gr.x,
        y: gr.y,
        vx: gr.vx,
        vy: gr.vy,
        life: gr.life,
        fuse: gr.fuse,
        kind: gr.kind,
      })),
      deployables: this.deployables.map((d) => ({
        kind: d.kind,
        x: d.x,
        y: d.y,
        angle: d.angle,
        hp: d.hp,
        maxHp: d.maxHp,
        life: d.life,
        armed: d.armed,
        radius: d.radius,
        color: d.color,
        size: d.size,
      })),
      hostBaseHp: Math.max(0, Math.round(this.base.hp)),
      hostBaseMaxHp: this.base.maxHp,
      guestBaseHp: Math.max(0, Math.round(this.enemyBase.hp)),
      guestBaseMaxHp: this.enemyBase.maxHp,
      wave: this.wave,
      enemiesLeft: this.enemies.length,
      score: this.score,
      kills: this.kills,
      gold: this.gold,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      dmKills: this.isDM 
        ? (this.gameMode === "team_deathmatch"
          ? [0, 1, 2, 3].map(t => this.combatants.filter(c => c.teamId === t).reduce((sum, c) => sum + c.kills, 0)).filter((_, i, arr) => i === 0 || arr[i] > 0 || this.combatants.some(c => c.teamId === i))
          : [this.combatants.find(c => c.id === 1)?.kills ?? 0, this.combatants.find(c => c.id === 2)?.kills ?? 0])
        : undefined,
      dmTarget: this.isDM ? this.dmKillLimit : undefined,
      // always present (even when empty) so clients can initialise their
      // feed watermark on the FIRST snapshot and never swallow the first kill
      feed: this.feedBuf.slice(),
    };
  }

  /** Host relay path: send the snapshot to the guest over the existing Net. */
  private sendSnapshot() {
    if (!this.net || !this.foe) return;
    this.net.sendGame({ t: "snap", snap: this.buildSnapshot() });
  }

  // ---------------------------------------------------- authoritative server
  /** Feed a peer's latest input frame (called by the Node server for each socket). */
  setPeerInput(pid: number, frame: InputFrame) {
    this.peerInput.set(pid, frame);
    let l = this.peerLatch.get(pid);
    if (!l) {
      l = { weaponSwitch: false, skill: false, reload: false, gadget: -1 };
      this.peerLatch.set(pid, l);
    }
    if (frame.weaponSwitch) l.weaponSwitch = true;
    if (frame.skill) l.skill = true;
    if (frame.reload) l.reload = true;
    if (typeof frame.gadget === "number" && frame.gadget >= 0) l.gadget = frame.gadget;
  }

  /** Merge the latest continuous frame with any latched one-shot actions, then
   *  clear the latch so each discrete input fires exactly once. */
  private takePeerFrame(pid: number): InputFrame {
    const base = this.peerInput.get(pid) ?? EMPTY_FRAME;
    const l = this.peerLatch.get(pid);
    if (!l) return base;
    const merged: InputFrame = {
      ...base,
      weaponSwitch: base.weaponSwitch || l.weaponSwitch,
      skill: base.skill || l.skill,
      reload: base.reload || l.reload,
      gadget: l.gadget >= 0 ? l.gadget : base.gadget,
    };
    l.weaponSwitch = false;
    l.skill = false;
    l.reload = false;
    l.gadget = -1;
    return merged;
  }

  /**
   * Simulate a single peer (host OR foe) from an InputFrame by temporarily
   * swapping the engine's single simulation context onto that player. This is
   * the shared body used by both the browser host (foe only) and the
   * authoritative server (both peers).
   */
  private simulatePeer(
    player: Player,
    inp: InputFrame,
    guns: GunDef[],
    gadgets: GadgetDef[],
    gadgetCd: Map<string, number>,
    dt: number
  ) {
    if (!player || !inp) return;
    // downed player: no movement / firing until it respawns
    if (player.deadTimer && player.deadTimer > 0) return;
    const sp = this.player,
      sg = this.gunIndex,
      sk = this.keys,
      sm = this.mouse,
      sf = this.firing,
      sGuns = this.guns,
      sGadgets = this.gadgets,
      sGadgetCd = this.gadgetCd;
    const sSkill = this.skillCd,
      sDash = this.dashCharges,
      sDashR = this.dashRecharge,
      sLastG = this.lastGadget,
      sSemi = this.semiAutoLatch,
      sActive = this.activeId,
      sWs = this.weaponStates;
    const sSec = this.secondaryFiring;
    const svmx = this.virtualMove.x;
    const svmy = this.virtualMove.y;
    // load this peer's state into the engine's single simulation context
    this.player = player;
    this.guns = guns.length ? guns : this.guns;
    this.gunIndex = Math.min(player.gunIndex ?? 0, this.guns.length - 1);
    this.keys = new Set(inp.keys);
    this.mouse = { x: inp.mx, y: inp.my };
    this.virtualMove.x = inp.vmx;
    this.virtualMove.y = inp.vmy;
    this.firing = inp.firing;
    this.secondaryFiring = !!inp.secondaryFiring;
    this.skillCd = player.skillCd ?? 0;
    this.dashCharges = player.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = player.dashRecharge ?? 0;
    this.lastGadget = player.lastGadget ?? 0;
    this.gadgets = gadgets.length ? gadgets : this.gadgets;
    this.gadgetCd = gadgetCd;
    this.activeId = player === sp ? this.selfPid : this.peerPid;
    this.weaponStates = player === sp ? sWs : this.foeWeaponStates;
    // decay this peer's gadget cooldowns
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    this.semiAutoLatch = false;
    this.updatePlayer(dt);
    if (!this.player.stunTime || this.player.stunTime <= 0) {
      if (inp.weaponSwitch) {
        this.clearGadgetSelection();
        this.gunIndex = (this.gunIndex + 1) % this.guns.length;
      }
      if (inp.skill) this.activateSkill();
      if (inp.reload) this.reloadCurrent();
      if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
    }
    // write peer state back
    player.gunIndex = this.gunIndex;
    player.skillCd = this.skillCd;
    player.dashCharges = this.dashCharges;
    player.dashRecharge = this.dashRecharge;
    player.lastGadget = this.lastGadget;
    if (player === this.foe) {
      this.foeWeaponStates = this.weaponStates;
    }
    // restore the engine's main (player-A) context
    this.player = sp;
    this.guns = sGuns;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.gadgets = sGadgets;
    this.gadgetCd = sGadgetCd;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
    this.activeId = sActive;
    this.weaponStates = sWs;
    this.secondaryFiring = sSec;
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
  }

  /** Advance the shared world state (entities, bullets, waves, respawns). */
  private simulateWorld(dt: number) {
    // 世界阶段用玩家自身音量（命中/受击/爆炸都按玩家音量播放）
    sound.setEnemyDampen(false);
    this.time += dt;
    this.base.t += dt;
    if (this.base.flash > 0) this.base.flash -= dt * 3;
    this.enemyBase.t += dt;
    if (this.enemyBase.flash > 0) this.enemyBase.flash -= dt * 3;
    this.updateWeaponStates(dt);
    this.updateBullets(dt);
    this.updateGrenades(dt);
    this.updateDeployables(dt);
    this.updateEnemyBullets(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updatePickups(dt);
    this.updateTrain(dt);
    this.tickRespawns(dt);
    if (this.mode === "local" && this.isDM && this.matchLive && !this.gameOver) {
      // Local deathmatch / team-deathmatch: count down a match timer so the
      // game doesn't run forever if no one reaches the kill limit. When it
      // expires the current leader(s) win.
      this.dmTimeLeft -= dt;
      if (this.dmTimeLeft <= 0) {
        this.dmTimeLeft = 0;
        this.finishDmByTime();
      }
    }
    if (this.matchLive) this.updateWaves(dt);
    // online PvP time limit — end the match at MATCH_DURATION seconds
    if (this.mode !== "local" && this.matchLive && !this.gameOver && this.time >= MATCH_DURATION) {
      this.endGame("时间到");
    }
  }

  /**
   * 🚂 极地铁路与定时特快列车模拟系统 (Arctic Train Hazard System)
   * 每隔约 25 秒呼啸穿过极地地图中央铁路，对任何被撞击的实体造成 150 伤害与强力击飞
   */
  private updateTrain(dt: number) {
    const trainMode = this.loadout?.customMap?.trainMode ?? "auto";
    const isArctic = this.sceneIndex === 2 || this.sceneIndex === 7;
    const shouldRunTrain = trainMode === "always" || (trainMode === "auto" && isArctic);
    if (!shouldRunTrain) {
      this.trainActive = false;
      this.trainWarning = false;
      return;
    }

    this.trainTrackY = Math.round(this.worldH / 2);

    if (!this.trainActive) {
      this.trainTimer -= dt;
      if (this.trainTimer <= 3.5) {
        this.trainWarning = true;
        // 低频轨道震颤
        if (this.inView(this.worldW / 2, this.trainTrackY, 400)) {
          this.shake = Math.max(this.shake, 1.8);
        }
      }
      if (this.trainTimer <= 0) {
        // 火车呼啸驶入
        this.trainActive = true;
        this.trainWarning = false;
        this.trainDir = Math.random() > 0.5 ? 1 : -1;
        this.trainX = this.trainDir === 1 ? -120 : this.worldW + 120;
        sound.explosion();
        this.shake = 10;
      }
    } else {
      // 推进列车位置
      this.trainX += this.trainDir * this.trainSpeed * dt;

      // 靠近玩家视野时产生剧烈轨道震动
      if (this.inView(this.trainX, this.trainTrackY, 600)) {
        this.shake = Math.max(this.shake, 5);
      }

      // 判断整列火车是否完全驶出地图边界
      const minX = Math.min(this.trainX, this.trainX - this.trainDir * this.trainTotalLen);
      const maxX = Math.max(this.trainX, this.trainX - this.trainDir * this.trainTotalLen);
      if ((this.trainDir === 1 && minX > this.worldW + 150) || (this.trainDir === -1 && maxX < -150)) {
        this.trainActive = false;
        this.trainWarning = false;
        this.trainTimer = 24 + Math.random() * 6; // 24~30 秒后下一趟
      }

      // 列车包围盒 (Y 轴为中心轨道前后各 26px)
      const trainMinY = this.trainTrackY - 26;
      const trainMaxY = this.trainTrackY + 26;

      // 判定被撞击玩家 (造成 150 伤害与强力上下推开)
      const checkTarget = (p: Player, cid: number, name: string) => {
        if (!p || (p.deadTimer && p.deadTimer > 0)) return;
        const pMinX = p.x - p.size;
        const pMaxX = p.x + p.size;
        const pMinY = p.y - p.size;
        const pMaxY = p.y + p.size;

        if (pMaxX > minX && pMinX < maxX && pMaxY > trainMinY && pMinY < trainMaxY) {
          const lastHit = this.trainHitCooldown.get(cid) ?? -999;
          if (this.time - lastHit > 1.2) {
            this.trainHitCooldown.set(cid, this.time);
            const knockY = p.y < this.trainTrackY ? -70 : 70;
            const knockX = this.trainDir * 40;
            this.damagePlayerEntity(p, 150, undefined, knockX, knockY, -1, "train");
            this.effects.push({
              type: "explosion",
              x: p.x,
              y: p.y,
              r: 45,
              duration: 0.35,
              color: "#f59e0b"
            });
            this.spawnParticles(p.x, p.y, "#facc15", 14, 180, 0.4);
            this.shake = 16;
            sound.explosion();
            if (p.hp <= 0) {
              this.eliminatedBy = "极地特快列车";
              this.banner = { text: `${name} 被极地特快列车撞飞!`, t: 2.2 };
            }
          }
        }
      };

      // 检查本端玩家
      checkTarget(this.player, 0, "你");
      // 检查多人模式/机器人战斗实体
      for (const c of this.combatants) {
        if (c.player && c.player !== this.player) {
          checkTarget(c.player, c.id, c.name);
        }
      }
      if (this.foe && this.foe !== this.player) {
        checkTarget(this.foe, 1, "对手");
      }
      // 检查怪物/生化丧尸
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (e.x + e.size > minX && e.x - e.size < maxX && e.y + e.size > trainMinY && e.y - e.size < trainMaxY) {
          const knockY = e.y < this.trainTrackY ? -60 : 60;
          this.damageEnemy(e, 150, this.trainDir * 40, knockY);
          this.effects.push({
            type: "explosion",
            x: e.x,
            y: e.y,
            r: 40,
            duration: 0.3,
            color: "#f59e0b"
          });
          this.spawnParticles(e.x, e.y, "#ef4444", 10, 160, 0.4);
        }
      }
    }
  }

  /**
   * Authoritative fixed-step update driven by the Node server. Both peers are
   * simulated from their network input frames; the world is then advanced and a
   * snapshot is produced (the caller broadcasts it to both clients).
   */
  stepServer(dt: number) {
    if (this.paused || !this.matchLive) {
      // keep streaming a (frozen) snapshot so clients stay in sync / see the pause
      this.snapAccum += dt;
      if (this.snapAccum >= 1 / 30) {
        this.snapAccum = 0;
      }
      return;
    }
    const fA = this.takePeerFrame(this.selfPid);
    const fB = this.takePeerFrame(this.peerPid);
    if (this.player)
      this.simulatePeer(this.player, fA, this.guns, this.gadgets, this.gadgetCd, dt);
    if (this.foe)
      this.simulatePeer(this.foe, fB, this.foeGuns, this.foeGadgets, this.foeGadgetCd, dt);
    this.simulateWorld(dt);
  }

  /** Server: begin the match once both peers are present. */
  serverStartMatch() {
    this.peerReady = true;
    this.matchLive = true;
  }

  /** Net: toggle the "opponent reconnecting" overlay (driven by peerGone/peerBack). */
  setReconnecting(v: boolean) {
    if (this.reconnecting === v) return;
    this.reconnecting = v;
    this.emit(true);
  }

  /**
   * Server: register peer B (the second socket) from their loadout and assign
   * the two role pids. Peer A is the engine's own player (constructed with its
   * loadout). Call this once both sockets are connected, before stepServer().
   */
  setupServerMatch(loadoutB: Loadout, pidA: number, pidB: number) {
    this.selfPid = pidA;
    this.peerPid = pidB;
    // reset the per-player input buffers so a stale frame can't leak across matches
    this.peerInput.clear();
    this.peerLatch.clear();
    this.foe = this.makeFoe();

    this.peerLoadout = loadoutB;
    this.applyPeerLoadout();

    if (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") {
      const isTeam = this.gameMode === "team_deathmatch";
      const pCount = this.loadout.dmPlayerCount || 4;
      this.player.cid = this.selfPid;
      this.foe.cid = this.peerPid;

      this.dmSpawns = this.generateDistributedSpawns();

      const hostSpawn = this.dmSpawns[0];
      const guestSpawn = this.dmSpawns[1];
      this.player.x = hostSpawn.x;
      this.player.y = hostSpawn.y;
      this.foe.x = guestSpawn.x;
      this.foe.y = guestSpawn.y;

      const c1: Combatant = {
        id: 1, isBot: false, name: "玩家1", color: isTeam ? "#8b5cf6" : "#38bdf8",
        player: this.player,
        character: this.character, outfit: this.outfit, skill: this.skill,
        guns: this.guns, gunIndex: this.gunIndex,
        weaponStates: this.weaponStates, gadgets: this.gadgets,
        selectedGadget: this.selectedGadget,
        skillCd: this.skillCd, dashCharges: this.dashCharges,
        dashRecharge: this.dashRecharge, gadgetCd: this.gadgetCd,
        lastGadget: this.lastGadget, kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0,
        teamId: isTeam ? 0 : undefined
      };

      const c2: Combatant = {
        id: 2, isBot: false, name: this.peerName || "玩家2", color: isTeam ? "#8b5cf6" : "#f472b6",
        player: this.foe,
        character: this.foeChar!,
        outfit: this.foeOutfit!,
        skill: getSkill(loadoutB.skillId ?? "dash"),
        guns: this.foeGuns,
        gunIndex: 0,
        weaponStates: this.foeWeaponStates,
        gadgets: this.foeGadgets,
        selectedGadget: -1,
        skillCd: 0,
        dashCharges: MAX_DASH_CHARGES,
        dashRecharge: 0,
        gadgetCd: new Map(),
        lastGadget: 0,
        kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0,
        teamId: isTeam ? (this.gameMode === "team_deathmatch" ? 0 : 1) : undefined
      };

      this.combatants = [c1, c2];

      if (this.gameMode === "team_deathmatch") {
        const botColors = ["#8b5cf6", "#f472b6", "#a3e635", "#fbbf24"];
        const botNames = ["阿法", "贝塔", "伽马", "德塔", "艾普", "泽塔", "伊塔", "西塔"];
        const numTeams = pCount / 2;
        const picks = this.rollBotLoadouts(pCount - 2); // 2 humans already
        let botIdx = 0;
        // start from team 1 because team 0 is full (2 humans)
        for (let teamId = 1; teamId < numTeams; teamId++) {
          for (let pIdx = 0; pIdx < 2; pIdx++) {
            const sp = this.dmSpawns[botIdx + 2];
            const name = botNames[botIdx];
            const bot = this.makeBot(botIdx + 3, picks[botIdx], name, botColors[teamId], sp.x, sp.y);
            bot.teamId = teamId;
            this.combatants.push(bot);
            botIdx++;
          }
        }
      } else if (this.gameMode === "deathmatch") {
        const botColors = ["#f472b6", "#a3e635", "#fbbf24", "#e879f9", "#34d399", "#60a5fa", "#f87171", "#c084fc"];
        const botNames = ["阿尔法", "贝塔", "伽马", "德尔塔", "艾普西龙", "泽塔", "伊塔", "西塔"];
        const botCount = pCount - 2;
        const picks = this.rollBotLoadouts(botCount);
        for (let i = 0; i < botCount; i++) {
          const sp = this.dmSpawns[i + 2];
          this.combatants.push(this.makeBot(i + 3, picks[i], botNames[i], botColors[i], sp.x, sp.y));
        }
      }
    }

    this.foe.gunIndex = 0;
    this.foe.skillCd = 0;
    this.foe.dashCharges = MAX_DASH_CHARGES;
    this.foe.dashRecharge = 0;
    this.foe.lastGadget = 0;
  }

  // ---- guest: send input, mirror snapshot ----
  private sendInput() {
    if (!this.net) return;
    const inp: InputFrame = {
      keys: [...this.keys],
      mx: this.mouse.x,
      my: this.mouse.y,
      vmx: this.virtualMove.x,
      vmy: this.virtualMove.y,
      firing: this.firing,
      gadget: this.pendGadget,
      skill: this.pendSkill,
      reload: this.pendReload,
      weaponSwitch: this.pendWeapon,
      secondaryFiring: this.secondaryFiring,
    };
    this.pendGadget = -1;
    this.pendSkill = false;
    this.pendReload = false;
    this.pendWeapon = false;
    this.net.sendGame({ t: "inp", input: inp });
  }

  private applySnapshot() {
    const s = this.lastSnap;
    if (!s) return;
    // adopt the host-authoritative scene + pause state
    this.sceneTheme = SCENES[s.scene] ?? SCENES[0];
    this.sceneIndex = s.scene ?? 0; // keeps per-map building art in sync with the host
    // pause is a single-player-only feature; ignore any stale `paused` flag from the wire
    if (this.mode === "local") this.paused = s.paused;
    const me = s.players.find((p) => p.id === this.selfPid) ?? s.players[0];
    const foe = s.players.find((p) => p.id !== me.id) ?? s.players[1];
    
    const oldScore = this.score;
    const oldKills = this.kills;
    
    if (me) {
      if (this.mode === "guest" || this.authoritative) {
        // Client-side prediction position reconciliation
        const distSq = (this.player.x - me.x) ** 2 + (this.player.y - me.y) ** 2;
        if (distSq > 120 * 120) {
          this.player.x = me.x;
          this.player.y = me.y;
        } else {
          this.player.x += (me.x - this.player.x) * 0.25;
          this.player.y += (me.y - this.player.y) * 0.25;
        }
      } else {
        this.player.x = me.x;
        this.player.y = me.y;
      }
      this.player.angle = me.angle;
      this.player.hp = me.hp;
      this.player.maxHp = me.maxHp;
      this.player.gunIndex = me.gunIndex;
      // keep the guest's HUD/crosshair weapon in sync with what the host simulates
      if (me.gunIndex != null && me.gunIndex >= 0 && me.gunIndex < this.guns.length) {
        this.gunIndex = me.gunIndex;
      }
      // keep the guest's ammo read-out in sync with the host's authoritative value
      if (me.ammo !== null && me.ammo !== undefined) {
        const w = this.weaponStates.get(this.gun.id);
        if (w) w.ammo = me.ammo;
      }
      this.player.electrifiedTime = me.electrified;
      this.player.electrifiedGlow = me.electrifiedGlow;
    }
    if (foe) {
      if (!this.foe) this.foe = this.makeFoe();
      const fp = this.foe;
      fp.x = foe.x;
      fp.y = foe.y;
      fp.angle = foe.angle;
      fp.hp = foe.hp;
      fp.maxHp = foe.maxHp;
      fp.gunIndex = foe.gunIndex;
      fp.electrifiedTime = foe.electrified;
      fp.electrifiedGlow = foe.electrifiedGlow;
      this.foeChar = getCharacter(foe.character);
      this.foeOutfit = getOutfit(foe.outfit);
    }
    this.wave = s.wave;
    this.enemiesLeft = s.enemiesLeft;
    // mirror enemy positions so the guest-side mobile aim assist can lock on
    this.snapEnemies = s.enemies.map((e) => ({ x: e.x, y: e.y }));
    this.gold = s.gold;

    // Score/kill feed: prefer the explicit event stream from the host/server
    // (reliable per-player attribution). The snapshot's aggregate score/kills
    // only reflect the SIMULATING side's own player, so when feed events are
    // available each client accumulates its OWN score/kills from them instead.
    if (s.feed) {
      if (this.lastFeedId < 0) {
        // first snapshot after (re)joining: fast-forward past history so we
        // don't replay kills/damage that happened before we joined
        this.lastFeedId = 0;
        for (const ev of s.feed) if (ev.id > this.lastFeedId) this.lastFeedId = ev.id;
      } else {
        for (const ev of s.feed) {
          if (ev.id <= this.lastFeedId) continue;
          this.lastFeedId = ev.id;
          this.consumeFeedEvent(ev);
        }
      }
    } else {
      // legacy host without feed events: mirror aggregates and guess (old path)
      this.score = s.score;
      this.kills = s.kills;
      if (this.mode === "guest" && this.score > oldScore) {
        const diff = this.score - oldScore;
        if (this.kills > oldKills) {
          this.addScoreFeed("淘汰", diff, this.peerName || "对手", diff, this.kills);
          sound.playKillConfirm();
        } else {
          this.addScoreFeed(diff >= 200 ? "金币收集" : "伤害击中", diff);
        }
      }
    }

    // Guest now has the host's world — handshake complete.
    this.peerReady = true;
    
    // Spawn local coin particles on the guest when new coinburst effects are received
    if (this.mode === "guest" && s.effects) {
      for (const e of s.effects) {
        if (!this.seenFx.has(e.id)) {
          this.seenFx.add(e.id);
          if (this.seenFx.size > 1000) {
            const oldest = this.seenFx.keys().next().value;
            if (oldest !== undefined) this.seenFx.delete(oldest);
          }
          if (e.type === "coinburst") {
            const style = e.style ?? "bullet";
            const pal = COIN_STYLE[style] ?? COIN_STYLE.bullet;
            const coinCount = e.radius > 60 ? 48 : 24;
            const dx = e.dirX ?? 0;
            const dy = e.dirY ?? 0;
            for (let i = 0; i < coinCount; i++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 140 + Math.random() * 320;
              let vx = Math.cos(a) * sp;
              let vy = Math.sin(a) * sp - 120;
              if (dx !== 0 || dy !== 0) {
                vx = vx * 0.35 + dx * sp;
                vy = vy * 0.35 + dy * sp - 60;
              }
              const flight = 0.35 + Math.random() * 0.15;
              this.particles.push({
                x: e.x, y: e.y, vx, vy,
                life: flight + 1.0, maxLife: flight + 1.0,
                color: pal[Math.floor(Math.random() * pal.length)],
                size: 2.5 + Math.random() * 2,
                gravity: 280,
                bounce: 0.3,
                style: "coin",
                ground: e.y + (Math.random() - 0.5) * 20 + 30,
              });
            }
          }
        }
      }
    }

    // mirror the host's visual effects so explosions / sweeps / shockwaves show
    // on the guest side too (the guest runs no world simulation of its own).
    this.netEffects = s.effects ? s.effects.map((e) => ({ ...e })) : [];
    // mirror thrown grenades + deployed gadgets so the guest can render them
    this.netGrenades = s.grenades ? s.grenades.map((g) => ({ ...g }) as Grenade) : [];
    this.netDeployables = s.deployables
      ? s.deployables.map((d) => ({ ...d, targets: [] }) as unknown as Deployable)
      : [];
    this.lastSnapTime = s.time;
    // Map the two world bases to OUR perspective:
    //   host's base (bottom) is the OPPONENT from the guest's side
    //   guest's base (top)   is OUR OWN base
    this.base.hp = s.hostBaseHp;
    this.base.maxHp = s.hostBaseMaxHp;
    this.enemyBase.hp = s.guestBaseHp;
    this.enemyBase.maxHp = s.guestBaseMaxHp;
    // mirror the terrain so cover walls (including destruction) match the server
    if (s.walls) {
      this.walls = s.walls.map((sw) => ({
        x: sw.x,
        y: sw.y,
        w: sw.w,
        h: sw.h,
        hp: sw.destructible ? sw.hp : Infinity,
        maxHp: sw.destructible ? sw.maxHp : Infinity,
        destructible: sw.destructible,
        glue: sw.glue,
        building: sw.building,
        seed: sw.seed,
      }));
    }
    if (s.dmKills && this.isDM && this.combatants.length > 0) {
      if (this.gameMode === "team_deathmatch") {
        // For team deathmatch, dmKills is an array of team kills
        // We only use this for HUD updates, not updating individual combatant kills
      } else {
        const hostC = this.combatants.find(c => c.id === 1);
        const guestC = this.combatants.find(c => c.id === 2);
        const oldHostKills = hostC?.kills ?? 0;
        const oldGuestKills = guestC?.kills ?? 0;
        
        const newHostKills = s.dmKills[0];
        const newGuestKills = s.dmKills[1];
        
        if (hostC) hostC.kills = newHostKills;
        if (guestC) guestC.kills = newGuestKills;

        // legacy hosts only — when feed events are present they already
        // produced properly attributed kill-feed entries in consumeFeedEvent()
        if (this.mode === "guest" && !s.feed) {
          if (newHostKills > oldHostKills) {
            const isMe = this.selfPid === 1;
            const kName = isMe ? "你" : (this.peerName || "对手");
            const vName = isMe ? (this.peerName || "对手") : "你";
            const gun = isMe ? this.gun : (this.foeGuns[this.foe?.gunIndex ?? 0] ?? GUNS[0]);
            this.killFeed.push({ id: this.nextKillFeedId++, type: "kill", killerName: kName, victimName: vName, weaponIconShape: gun.iconShape, weaponGlow: gun.glow, weaponId: gun.id, timer: 4.2 });
          }
          if (newGuestKills > oldGuestKills) {
            const isMe = this.selfPid === 2;
            const kName = isMe ? "你" : (this.peerName || "对手");
            const vName = isMe ? (this.peerName || "对手") : "你";
            const gun = isMe ? this.gun : (this.foeGuns[this.foe?.gunIndex ?? 0] ?? GUNS[0]);
            this.killFeed.push({ id: this.nextKillFeedId++, type: "kill", killerName: kName, victimName: vName, weaponIconShape: gun.iconShape, weaponGlow: gun.glow, weaponId: gun.id, timer: 4.2 });
          }
          if (this.killFeed.length > 5) this.killFeed.splice(0, this.killFeed.length - 5);
        }
      }
    }
    if (s.gameOver && !this.gameOver) {
      // The host's gameOverReason is from the host's POV; derive the guest's
      // outcome from the base HPs relative to THIS client's role.
      const iAmJoiner = this.mode === "guest";
      let reason: string;
      if (this.isDM && s.dmKills) {
        if (this.gameMode === "team_deathmatch") {
          const myTeamId = 0; // Both humans are in team 0
          const myTeamKills = s.dmKills[myTeamId] ?? 0;
          let enemyTeamKills = 0;
          for (let i = 1; i < s.dmKills.length; i++) {
            if (s.dmKills[i] > enemyTeamKills) enemyTeamKills = s.dmKills[i];
          }
          const target = s.dmTarget ?? 20;
          if (myTeamKills >= target) reason = "你的队伍获胜";
          else reason = "其他队伍率先达到目标";
        } else {
          const hostKills = s.dmKills[0];
          const guestKills = s.dmKills[1];
          const target = s.dmTarget ?? 8;
          if (iAmJoiner) {
            if (guestKills >= target) reason = "你击败了对手";
            else reason = "失败，对手击败了你";
          } else {
            if (hostKills >= target) reason = "你击败了对手";
            else reason = "失败，对手击败了你";
          }
        }
      } else if (iAmJoiner) {
        if (s.guestBaseHp <= 0) reason = "失败，基地失守";
        else if (s.hostBaseHp <= 0) reason = "敌方基地已摧毁";
        else reason = "对手已被击败";
      } else {
        if (s.hostBaseHp <= 0) reason = "失败，基地失守";
        else if (s.guestBaseHp <= 0) reason = "敌方基地已摧毁";
        else reason = "对手已被击败";
      }
      this.endGame(reason);
    }
  }

  /** Draw a networked player (me or foe) with the full character silhouette —
   *  including the held weapon, skin/outfit + hat — instead of the crude circle.
   *  Resolves the gun def from the player's own weapon list via `gunList`. */
  private drawNetCharacter(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    charId: string,
    outfitId: string,
    gunIndex: number,
    gunList: GunDef[],
    name: string,
    hpPct: number,
    t: number,
    size: number,
    gadget?: GadgetDef,
    isCloaked?: boolean,
    cloakAlpha?: number,
    nameColor?: string,
    teammate?: boolean,
    barColor?: string,
    barHeight?: number
  ) {
    const char = getCharacter(charId);
    const outfit = getOutfit(outfitId);
    const gun = gunList[gunIndex] ?? gunList[0];
    drawCharacter(ctx, {
      x,
      y,
      angle,
      character: char,
      outfit,
      size,
      t,
      gun,
      gadget,
      isCloaked,
      cloakAlpha,
    });
    if (isCloaked && (cloakAlpha ?? 0.15) < 0.2) return;
    // hp bar — self green, teammates blue, enemies red & thicker
    const bw = 32;
    const bh = barHeight ?? 4;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - bw / 2, y - 24, bw, bh);
    ctx.fillStyle = barColor ?? (hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171");
    ctx.fillRect(x - bw / 2, y - 24, bw * Math.max(0, hpPct), bh);
    // name
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - 28);
  }

  /** Guest-side renderer: draws the world straight from the host snapshot. */
  private renderNet(ctx: CanvasRenderingContext2D) {
    const s = this.lastSnap;
    if (!s) return;
    ctx.save();
    if (this.shake > 0.2) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.translate(-this.camX, -this.camY);

    this.drawDecorations(ctx);

    // age the mirrored effects by real frame time so they animate smoothly
    // between 30Hz snapshots (the host sends their current elapsed `t`).
    {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const dtfx = this.netFxPrev ? Math.min(0.05, (now - this.netFxPrev) / 1000) : 0;
      this.netFxPrev = now;
      if (dtfx > 0 && this.netEffects.length) {
        for (const e of this.netEffects) e.t += dtfx;
        this.netEffects = this.netEffects.filter((e) => e.t < e.duration);
      }
    }

    // ease a network entity toward its latest snapshot position so 30Hz updates look smooth
    const ease = (id: number, x: number, y: number) => {
      const prev = this.netRender.get(id);
      if (!prev) {
        const cur = { x, y };
        this.netRender.set(id, cur);
        return cur;
      }
      prev.x += (x - prev.x) * 0.4;
      prev.y += (y - prev.y) * 0.4;
      return prev;
    };

    // Each side renders ITS OWN base at the bottom of its own screen. The
    // joiner (pid 2) defends the world's top base (this.enemyBase); the creator
    // (pid 1) defends the bottom one (this.base). Use selfPid so the
    // authoritative path (both peers run as "guest") orients correctly.
    if (this.gameMode !== "biohazard") {
      const ownBase = this.mode === "guest" ? this.enemyBase : this.base;
      const foeBase = this.mode === "guest" ? this.base : this.enemyBase;
      this.drawBase(ctx, ownBase, true);
      this.drawBase(ctx, foeBase, false);
    }
    // terrain cover walls + arena border (mirrored from the snapshot)
    this.drawWalls(ctx);
    this.drawArenaBorder(ctx);
    // mirror the host's thrown grenades + deployed gadgets (the guest runs no sim)
    {
      const rg = this.grenades;
      const rd = this.deployables;
      this.grenades = this.netGrenades;
      this.deployables = this.netDeployables;
      this.drawGrenades(ctx);
      this.drawDeployables(ctx);
      this.grenades = rg;
      this.deployables = rd;
    }
    if (this.trainActive) {
      drawPixelTrain(ctx, this.trainX, this.trainTrackY, this.trainDir, this.time, this.trainWarning);
    }
    for (const e of s.enemies) {
      const r = ease(e.id, e.x, e.y);
      const rx = Math.round(r.x);
      const ry = Math.round(r.y);
      const sz = Math.round(e.size);
      const c = getCharacter(e.character);
      // Pixel monster/character body
      ctx.fillStyle = "#09090b";
      ctx.fillRect(rx - sz - 1, ry - sz - 1, sz * 2 + 2, sz * 2 + 2);
      ctx.fillStyle = c?.bodyColor ?? "#f87171";
      ctx.fillRect(rx - sz, ry - sz, sz * 2, sz * 2);
      // Pixel eyes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(rx + Math.round(sz * 0.3), ry - Math.round(sz * 0.3), 3, 3);
      ctx.fillRect(rx + Math.round(sz * 0.3), ry + Math.round(sz * 0.1), 3, 3);

      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(rx - sz, ry - sz - 7, sz * 2, 5);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(rx - sz, ry - sz - 7, sz * 2 * (e.hp / e.maxHp), 5);
      }
    }
    for (const p of s.players) {
      if (p.hp <= 0) continue; // downed players are hidden until they respawn
      const isMe = p.id === this.selfPid;
      const r = isMe ? { x: this.player.x, y: this.player.y } : ease(p.id, p.x, p.y);
      const gunList = isMe ? this.guns : this.foeGuns;
      const size = isMe ? this.player.size : getCharacter(p.character).size;
      if (isMe) {
        this.drawThrustSwordChargeIndicator(ctx, this.player);
      }
      this.drawNetCharacter(
        ctx,
        Math.round(r.x),
        Math.round(r.y),
        p.angle,
        p.character,
        p.outfit,
        p.gunIndex ?? 0,
        gunList,
        isMe ? this.character.name : this.peerName || "对手",
        p.hp / p.maxHp,
        this.time,
        size,
        p.selectedGadget !== undefined && p.selectedGadget >= 0 ? (isMe ? this.gadgets[p.selectedGadget] : GADGETS[p.selectedGadget]) : undefined,
        undefined,
        undefined,
        isMe ? "#ffffff" : "#fca5a5",
        false,
        isMe ? "#22c55e" : "#ef4444",
        isMe ? 4 : 7
      );
      if (p.electrified > 0) {
        this.drawElectricArcs(ctx, r.x, r.y, size, p.electrifiedGlow, this.time);
      }
    }
    // local gadget aiming preview (selection highlight + throw/deploy hint)
    this.drawAimPreview(ctx);
    // 16-bit retro pixel projectile rendering
    for (const b of s.bullets) {
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      const bw = Math.max(5, Math.round(b.size * 2.2));
      const bh = Math.max(3, Math.round(b.size * 1.3));
      // Outer dark pixel outline
      ctx.fillStyle = "#09090b";
      ctx.fillRect(Math.round(-bw / 2) - 1, Math.round(-bh / 2) - 1, bw + 2, bh + 2);
      // Bright bullet body
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(-bw / 2), Math.round(-bh / 2), bw, bh);
      // White hot core pixel strip
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(-bw / 2) + 1, Math.round(-bh / 2) + 1, Math.max(2, bw - 2), Math.max(1, bh - 2));
      ctx.restore();
    }
    // draw particles
    this.drawParticles(ctx);
    // mirrored host effects (explosions, sweeps, shockwaves, ...)
    if (this.netEffects.length) this.drawEffects(ctx, this.netEffects as unknown as Effect[]);
    ctx.restore();
  }

  private damageWall(w: Wall, dmg: number) {
    if (!w.destructible) return;
    w.hp -= dmg;
    this.wallsDirty = true;
    this.spawnParticles(
      w.x + w.w / 2,
      w.y + w.h / 2,
      w.glue ? "#22d3ee" : "#d6b27a",
      3,
      100,
      0.3
    );
    if (w.hp <= 0) {
      const i = this.walls.indexOf(w);
      if (i >= 0) this.breakWall(w, i);
    }
  }

  private breakWall(w: Wall, i: number) {
    this.walls.splice(i, 1);
    this.wallsDirty = true;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    this.spawnParticles(cx, cy, w.glue ? "#22d3ee" : "#d6b27a", 18, 220, 0.6);
    this.spawnParticles(cx, cy, "#9a7b4a", 12, 160, 0.5);
    this.effects.push({
      type: "debris",
      x: cx,
      y: cy,
      t: 0,
      duration: 0.4,
      radius: Math.max(w.w, w.h),
      color: w.glue ? "#22d3ee" : "#d6b27a",
    });
    // shake only when player is hit
    // this.shake = Math.min(14, this.shake + 5);
  }

  private damageDeployable(d: Deployable, dmg: number, _ownerId?: number) {
    d.hp -= dmg;
    // small spark so the player can tell the structure is taking fire
    if (Math.random() < 0.8)
      this.spawnParticles(d.x, d.y, d.color, 4, 120, 0.25);
    // removal + death FX (explosion) happen in `updateDeployables` once hp <= 0
  }

  /** Rebuild the broad-phase spatial grid from current targets. Called once
   *  per collision pass; positions are fresh enough for a single frame. */
  private buildGrid() {
    this.grid.clear();
    let maxR = 0;
    const cs = GRID_CELL;
    const put = (it: GridItem) => {
      if (it.size > maxR) maxR = it.size;
      const cx = Math.floor(it.x / cs);
      const cy = Math.floor(it.y / cs);
      const k = cx + "|" + cy;
      let arr = this.grid.get(k);
      if (!arr) {
        arr = [];
        this.grid.set(k, arr);
      }
      arr.push(it);
    };
    this.enemies.forEach((e, i) =>
      put({ kind: "enemy", idx: i, x: e.x, y: e.y, size: e.size, ref: e })
    );
    if (this.isDM) {
      this.combatants.forEach((c, i) =>
        put({ kind: "player", idx: i, x: c.player.x, y: c.player.y, size: c.player.size, ref: c.player, ownerId: c.id })
      );
    } else if (this.foe) {
      put({ kind: "player", idx: 0, x: this.player.x, y: this.player.y, size: this.player.size, ref: this.player, ownerId: this.activeId });
      put({ kind: "player", idx: 1, x: this.foe.x, y: this.foe.y, size: this.foe.size, ref: this.foe, ownerId: this.peerPid });
    } else {
      put({ kind: "player", idx: 0, x: this.player.x, y: this.player.y, size: this.player.size, ref: this.player, ownerId: this.activeId });
    }
    this.deployables.forEach((d, i) =>
      put({ kind: "deployable", idx: i, x: d.x, y: d.y, size: d.size, ref: d, ownerId: d.ownerId })
    );
    this.gridMaxR = maxR;
  }

  /** Return all grid items whose cell overlaps the (x,y,r) disc. Callers still
   *  apply the exact distance test, so results are identical to brute force. */
  private queryGrid(x: number, y: number, r: number): GridItem[] {
    const cs = GRID_CELL;
    const cx0 = Math.floor((x - r) / cs);
    const cx1 = Math.floor((x + r) / cs);
    const cy0 = Math.floor((y - r) / cs);
    const cy1 = Math.floor((y + r) / cs);
    const out: GridItem[] = [];
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const arr = this.grid.get(cx + "|" + cy);
        if (arr) for (const it of arr) out.push(it);
      }
    }
    return out;
  }

  /** Charge-slam AOE burst fired when the charge_slam skill's dash window ends.
   *  Was previously called but never defined, which crashed the game whenever a
   *  player or bot used the skill. */
  private triggerChargeSlamAOE(p: Player, ownerId?: number) {
    const radius = 180;
    const damage = 40; // high AOE burst damage
    const oid = ownerId ?? (p.cid ?? this.activeId ?? 1);

    this.buildGrid();
    const cand = this.queryGrid(p.x, p.y, radius + this.gridMaxR + 2);

    // hit enemies
    for (const it of cand) {
      if (it.kind !== "enemy") continue;
      const e = it.ref as Enemy;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < radius + e.size) {
        this.damageEnemy(e, damage, 0, 0, false, undefined, oid);
      }
    }

    // hit rival players (DM / PvP) — never the owner or teammates
    if (this.isDM) {
      const attackerC = this.combatants.find((c) => c.id === oid);
      for (const it of cand) {
        if (it.kind !== "player") continue;
        if (it.ownerId === oid) continue;
        const victimC = this.combatants.find((c) => c.id === it.ownerId);
        if (
          attackerC &&
          victimC &&
          attackerC.teamId !== undefined &&
          attackerC.teamId === victimC.teamId
        )
          continue;
        const q = it.ref as Player;
        if (q.deadTimer && q.deadTimer > 0) continue;
        const dist = Math.hypot(q.x - p.x, q.y - p.y);
        if (dist < radius + q.size) {
          this.damagePlayerEntity(q, damage, undefined, 0, 0, oid);
        }
      }
    } else if (oid === 2) {
      // bot slam in PvE-style modes can still hurt the human player
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < radius + this.player.size) {
        this.damagePlayerEntity(this.player, damage, undefined, 0, 0, 2);
      }
    }

    this.effects.push({
      type: "shock",
      x: p.x,
      y: p.y,
      t: 0,
      duration: 0.4,
      radius,
      color: "#ef4444",
    });
    this.spawnParticles(p.x, p.y, "#ef4444", 40, 250, 0.6);
    this.pushSkillCast(p.x, p.y, "#ef4444", 0);
    sound.explosion();
  }

  private explode(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color: string,
    srcWpn?: string,
    ownerId?: number
  ) {
    let r = radius * 1.15; // 15% increase in explosion radius
    let glowColor = color;
    let particleCount = 26;
    let particleSize = 260;
    let addSquareParticles = false;

    if (srcWpn === "rpg") {
      glowColor = "#f59e0b"; // orange-yellow
      particleCount = 40;
      particleSize = 320;
      addSquareParticles = true;
      r *= 1.2; // RPG explosion is even larger
    }

    this.effects.push({
      type: "explosion",
      x,
      y,
      t: 0,
      duration: 0.45,
      radius: r,
      color: glowColor,
    });
    this.effects.push({
      type: "shock",
      x,
      y,
      t: 0,
      duration: 0.4,
      radius: r,
      color: glowColor,
    });
    // shake only when player is hit
    sound.explosion(x, y);
    this.spawnParticles(x, y, glowColor, particleCount, particleSize, 0.55);
    this.spawnParticles(x, y, "#fde68a", Math.floor(particleCount * 0.6), particleSize * 0.8, 0.4);
    
    if (addSquareParticles) {
      // Add pixelated square particles for RPG
      for (let i = 0; i < 15; i++) {
        this.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 400,
          vy: (Math.random() - 0.5) * 400,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          color: Math.random() > 0.5 ? "#f59e0b" : "#fbbf24",
          size: 6 + Math.random() * 8, // larger square blocks
          shrink: true,
          square: true // custom property to draw as square if supported, or we can just rely on size
        });
      }
    }
    if (damage > 0) {
      this.buildGrid();
      const cand = this.queryGrid(x, y, r);
      for (const it of cand) {
        if (it.kind !== "enemy") continue;
        const e = it.ref as Enemy;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < r + e.size) {
          const fall = 1 - d / (r + e.size); // 1.0 at center, 0.0 at edge
          const a = Math.atan2(e.y - y, e.x - x);
          this.damageEnemy(
            e,
            damage * fall,
            Math.cos(a) * 260 * fall,
            Math.sin(a) * 260 * fall,
            false,
            { weapon: srcWpn ?? "explosive", dx: Math.cos(a), dy: Math.sin(a) },
            ownerId
          );
        }
      }
      if (this.isDM) {
        // splash also hits other combatants (not the owner)
        for (const it of cand) {
          if (it.kind !== "player") continue;
          if (it.ownerId === (ownerId ?? -1) || this.isTeammate(ownerId, it.ownerId)) continue;
          const q = it.ref as Player;
          if (q.deadTimer && q.deadTimer > 0) continue;
          const d = Math.hypot(q.x - x, q.y - y);
          if (d < r + q.size) {
            const fall = 1 - d / (r + q.size); // linear falloff to 0
            const a = Math.atan2(q.y - y, q.x - x);
            this.damagePlayerEntity(
              q,
              damage * fall,
              undefined,
              0,
              0,
              ownerId,
              srcWpn
            );
          }
        }
      }
      
      // non-DM mode local player splash
      if (!this.isDM) {
        const d = Math.hypot(this.player.x - x, this.player.y - y);
        if (d < r + this.player.size) {
          const fall = 1 - d / (r + this.player.size);
          this.damagePlayerEntity(
            this.player,
            damage * fall,
            undefined,
            0,
            0,
            ownerId,
            srcWpn
          );
        }
      }
      
      // splash also damages deployed turrets / stations / mines — but never the
      // owner's own turret/station (mines can always be caught in a blast).
      for (const it of cand) {
        if (it.kind !== "deployable") continue;
        const d = it.ref as Deployable;
        const isMine =
          d.kind === "mine_explosive" ||
          d.kind === "mine_poison" ||
          d.kind === "mine_fire";
        if (!isMine) {
          if (
            d.kind !== "turret_mg" &&
            d.kind !== "turret_cannon" &&
            d.kind !== "healing_station"
          )
            continue;
          if ((d.ownerId ?? -1) === (ownerId ?? -1)) continue;
        }
        const d2 = Math.hypot(d.x - x, d.y - y);
        if (d2 < radius + d.size) {
          const fall = 1 - d2 / (radius + d.size);
          this.damageDeployable(d, damage * (0.5 + fall * 0.5), ownerId);
        }
      }
    }
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.destructible && this.rectCircleOverlap(w, x, y, radius)) {
        w.hp -= damage > 0 ? 120 : 200;
        if (w.hp <= 0) this.breakWall(w, i);
      }
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    life = 0.5,
    ox?: number,
    oy?: number
  ) {
    if (this.quality === "low") return;
    if (this.quality === "medium") count = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break; // pool saturated: drop
      const p = this.particlePool.pop() ?? ({} as Particle);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      p.x = ox ?? x;
      p.y = oy ?? y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = life * (0.6 + Math.random() * 0.8);
      p.maxLife = life;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.shrink = true;
      // reset optional fields so a recycled particle doesn't keep stale state
      p.gravity = undefined;
      p.coin = undefined;
      p.spin = undefined;
      p.flight = undefined;
      p.rest = undefined;
      p.landed = undefined;
      this.particles.push(p);
    }
  }

  private updateParticles(dt: number) {
    const next: Particle[] = [];
    for (const p of this.particles) {
      let alive = false;
      if (p.coin) {
        // coins arc briefly, then land and linger on the ground for ~1s
        if (!p.landed) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.gravity) p.vy += p.gravity * dt;
          p.flight = (p.flight ?? 0) - dt;
          if (p.flight <= 0) {
            p.landed = true;
            p.vx = 0;
            p.vy = 0;
          }
        }
        if (p.spin !== undefined) p.spin += dt * 12;
        p.life -= dt;
        alive = p.life > 0;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
        else {
          p.vx *= 0.92;
          p.vy *= 0.92;
        }
        if (p.spin !== undefined) p.spin += dt * 12;
        p.life -= dt;
        alive = p.life > 0;
      }
      if (alive) next.push(p);
      else if (this.particlePool.length < MAX_PARTICLES) this.particlePool.push(p);
    }
    this.particles = next;
  }

  private updateEffects(dt: number) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.duration);
    // hard cap so a flood of fields/explosions can't grow the array without bound
    if (this.effects.length > MAX_EFFECTS) {
      this.effects.splice(0, this.effects.length - MAX_EFFECTS);
    }
  }

  private updatePickups(dt: number) {
    const p = this.player;
    const next: Pickup[] = [];
    for (const pk of this.pickups) {
      pk.life -= dt;
      pk.bob += dt * 4;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < p.size + 16) {
        if (pk.type === "health") {
          p.hp = Math.min(p.maxHp, p.hp + 24);
        }
        sound.pickup();
        this.spawnParticles(pk.x, pk.y, "#4ade80", 12, 120, 0.5);
        continue;
      }
      if (pk.life > 0) next.push(pk);
    }
    this.pickups = next;
  }

  // ----------------------------------------------------------------- waves
  private updateWaves(dt: number) {
    // Deathmatch is pure 1v1v1v1 — no AI monsters are spawned.
    if (this.isDM) return;
    // Multiplayer is pure 1v1 PvP — no AI bots are ever spawned.
    if (this.mode !== "local") return;
    // continuous spawning — no more wave system
    if (this.intermission > 0) {
      this.intermission -= dt;
      return;
    }
    // spawn enemies at a steady rate, capped by maxConcurrent
    if (this.enemies.length < this.maxConcurrent) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(
        RUNTIME.spawnIntervalMin,
        RUNTIME.spawnIntervalMax - this.wave * RUNTIME.spawnIntervalPerWave
      );
        this.spawnEnemy();
      }
    }
    // difficulty ramps over time
    this.waveTimer += dt;
    if (this.waveTimer > RUNTIME.waveDuration) {
      this.waveTimer = 0;
      this.wave += 1;
      this.maxConcurrent = Math.min(
        RUNTIME.maxConcurrentCap,
        RUNTIME.maxConcurrentBase + this.wave * RUNTIME.maxConcurrentPerWave
      );
      this.banner = { text: `波次 ${this.wave} · 敌人增强`, t: 2.0 };
    }
  }

  private spawnEnemy() {
    if (this.gameMode === "biohazard") {
      this.spawnMonster();
      return;
    }
    // pick a random character + outfit + gun for this enemy
    const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    const outfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)];
    const gun = GUNS[Math.floor(Math.random() * GUNS.length)];
    const isRanged = gun.weaponClass === "ranged" || gun.weaponClass === "beam" || gun.weaponClass === "bow";
    const isElite = Math.random() < RUNTIME.enemyEliteChance;

    const n = this.wave || 1;
    const hpScale = 1 + (n - 1) * RUNTIME.enemyHpScalePerWave;
    const dmgScale = 1 + (n - 1) * RUNTIME.enemyDmgScalePerWave;

    const baseHp =
      RUNTIME.enemyHp > 0 ? RUNTIME.enemyHp : char.maxHp + outfit.hpBonus;
    const maxHp = Math.round(
      baseHp * hpScale * (isElite ? RUNTIME.enemyEliteHpMult : 1)
    );
    const speed = char.speed * (1 + outfit.speedBonus) * RUNTIME.enemySpeedMult;
    const dmg = Math.round(
      RUNTIME.enemyBaseDamage * dmgScale * (isElite ? RUNTIME.enemyEliteDmgMult : 1)
    );

    const pos = this.enemySpawnPos();
    this.enemies.push({
      id: this.enemyId++,
      type: isElite ? "elite" : "grunt",
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      size: char.size,
      speed,
      damage: dmg,
      color: "#f87171",
      glow: isElite ? "#fb7185" : "#ef4444",
      score: isElite ? 50 : 15,
      ranged: isRanged,
      shootTimer: 1.2 + Math.random(),
      attackTimer: 0,
      angle: Math.PI / 2,
      hitFlash: 0,
      spawnT: 0,
      slowT: 0,
      burnT: 0,
      burnDps: 0,
      character: char,
      outfit,
      gun,
      bowCharge: 0,
      name: (isElite ? "精英 " : "") + char.name,
    });
    this.effects.push({
      type: "spawn",
      x: pos.x,
      y: pos.y,
      t: 0,
      duration: 0.4,
      radius: char.size * 2,
      color: isElite ? "#fb7185" : "#ef4444",
    });
  }

  private enemySpawnPos(): { x: number; y: number } {
    // spawn near enemy base with some spread
    const eb = this.enemyBase;
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 80;
    return {
      x: Math.max(20, Math.min(this.worldW - 20, eb.x + Math.cos(a) * r)),
      y: Math.max(20, Math.min(this.worldH - 20, eb.y + Math.sin(a) * r + 40)),
    };
  }

  /** Spawn a biohazard monster at a random edge of the (single-screen) arena. */
  private spawnMonster() {
    const n = this.wave || 1;
    // weighted pick — only monsters whose minWave has been reached
    const pool = MONSTERS.filter((m) => (m.minWave ?? 1) <= n);
    let total = 0;
    for (const m of pool) total += m.weight ?? 1;
    let pick = Math.random() * total;
    let def = pool[0];
    for (const m of pool) {
      pick -= m.weight ?? 1;
      if (pick <= 0) {
        def = m;
        break;
      }
    }

    const hpScale = 1 + (n - 1) * 0.12;
    const dmgScale = 1 + (n - 1) * 0.05;
    const maxHp = Math.round(def.hp * hpScale);
    const speed = def.speed * RUNTIME.enemySpeedMult;
    const dmg = Math.round(def.damage * dmgScale);

    // Spawn just outside the player's current view (screen edges) so monsters
    // still swarm in from off-screen even though the arena is now a large,
    // scrolling world the camera follows. Clamp into the world bounds.
    const m = def.size + 6;
    const halfW = this.W / 2;
    const halfH = this.H / 2;
    const left = this.player.x - halfW;
    const right = this.player.x + halfW;
    const top = this.player.y - halfH;
    const bottom = this.player.y + halfH;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = left + m;
      y = top + m + Math.random() * Math.max(1, bottom - top - 2 * m);
    } else if (edge === 1) {
      x = right - m;
      y = top + m + Math.random() * Math.max(1, bottom - top - 2 * m);
    } else if (edge === 2) {
      x = left + m + Math.random() * Math.max(1, right - left - 2 * m);
      y = top + m;
    } else {
      x = left + m + Math.random() * Math.max(1, right - left - 2 * m);
      y = bottom - m;
    }
    x = Math.max(m, Math.min(this.worldW - m, x));
    y = Math.max(m, Math.min(this.worldH - m, y));

    const e: Enemy = {
      id: this.enemyId++,
      type: "monster",
      behavior: def.behavior,
      name: def.name,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      size: def.size,
      speed,
      damage: dmg,
      color: def.color,
      glow: def.glow,
      score: def.score,
      ranged: !!def.ranged,
      shootTimer: 1 + Math.random(),
      attackTimer: 0,
      angle: Math.PI / 2,
      hitFlash: 0,
      spawnT: 0,
      slowT: 0,
      burnT: 0,
      burnDps: 0,
      poisonT: 0,
      poisonDps: 0,
      // monster-specific params
      screamT: 3 + Math.random() * 2,
      cloudT: 1.5 + Math.random(),
      chargeT: 0,
      buffT: 0,
      explosiveDeath: def.behavior === "bloater",
      explodeRadius: def.explodeRadius,
      explodeDamage: def.explodeDamage,
      rangedRange: def.rangedRange,
      rangedDamage: def.rangedDamage,
      buffRadius: def.buffRadius,
      cloudRadius: def.cloudRadius,
      cloudDamage: def.cloudDamage,
    };
    this.enemies.push(e);
    this.effects.push({
      type: "spawn",
      x,
      y,
      t: 0,
      duration: 0.4,
      radius: def.size * 2,
      color: def.glow,
    });
  }

  // ---------------------------------------------------------------- skills
  private activateSkill() {
    if (this.gameOver || this.paused) return;
    const p = this.player;
    const s = this.skill;

    // dash uses charge system instead of cooldown
    if (s.id === "dash") {
      if (this.dashCharges <= 0) return;
      this.dashCharges -= 1;
      let dx = 0;
      let dy = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      } else {
        const l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
      }
      const sp = 760;
      p.dashVx = dx * sp;
      p.dashVy = dy * sp;
      p.dashTime = s.duration;
      p.iframes = Math.max(p.iframes, s.duration + 0.12);
      this.spawnParticles(p.x, p.y, s.color, 18, 200, 0.4);
      this.pushSkillCast(p.x, p.y, s.color, p.angle);
      sound.skill();
      this.emit(true);
      return;
    }

    // charge_slam：冲刺途中再次按下技能键，立即结束冲刺并提前发动砸击
    if (p.isChargingSlam) {
      p.isChargingSlam = false;
      p.dashTime = 0;
      p.skillEnergy = 0;
      this.triggerChargeSlamAOE(p, this.activeId);
      return;
    }

    if (this.skillCd > 0) return;
    this.skillCd = s.cooldown;
    sound.skill();

    switch (s.id) {
      case "shield": {
        p.shieldTime = s.duration;
        break;
      }
      case "timewarp": {
        this.timewarp = s.duration;
        break;
      }
      case "grenade": {
        const a = p.angle;
        // throw range +125%: 420 -> 945, then +20% on request: 945 -> 1134
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 1134,
          vy: Math.sin(a) * 1134,
          life: 0.55,
          fuse: 0.55,
          kind: "frag",
          ownerId: this.activeId,
        });
        break;
      }
      case "overdrive": {
        p.overdriveTime = s.duration;
        this.spawnParticles(p.x, p.y, s.color, 20, 180, 0.5);
        break;
      }
      case "cloak": {
        p.isCloaked = true;
        p.skillEnergy = s.duration;
        this.spawnParticles(p.x, p.y, s.color, 15, 120, 0.4);
        break;
      }
      case "winch_claw": {
        p.winchActive = true;
        p.skillEnergy = s.duration;
        const speed = 900;
        p.winchVx = Math.cos(p.angle) * speed;
        p.winchVy = Math.sin(p.angle) * speed;
        p.winchX = p.x;
        p.winchY = p.y;
        this.spawnParticles(p.x, p.y, s.color, 15, 120, 0.4);
        break;
      }
      case "charge_slam": {
        p.isChargingSlam = true;
        p.slamHitIds = new Set();
        p.skillEnergy = s.duration;
        const speed = 800;
        p.dashVx = Math.cos(p.angle) * speed;
        p.dashVy = Math.sin(p.angle) * speed;
        p.dashTime = s.duration;
        this.spawnParticles(p.x, p.y, s.color, 15, 120, 0.4);
        break;
      }
    }
    this.pushSkillCast(p.x, p.y, s.color, p.angle);
    this.emit(true);
  }

  /** Push a one-shot burst effect so a skill cast is visibly telegraphed
   *  (rendered locally AND mirrored to the guest via the effects snapshot). */
  private pushSkillCast(x: number, y: number, color: string, angle: number) {
    this.effects.push({ type: "skillcast", x, y, t: 0, duration: 0.5, radius: 64, color, angle });
  }

  /** Guest-side mirror of the skill cooldown so the HUD shows the skill/CD state
   *  (the host is authoritative and actually runs the skill; we only age it here). */
  private localSkillCooldown() {
    if (this.skill.id === "dash") {
      if (this.dashCharges > 0) this.dashCharges -= 1;
    } else {
      this.skillCd = this.skill.cooldown;
    }
  }

  // ----------------------------------------------------------------- HUD
  private getEffects(): ActiveEffect[] {
    const p = this.player;
    const out: ActiveEffect[] = [];
    if (p.shieldTime > 0)
      out.push({
        id: "shield",
        name: "护盾",
        icon: "🛡️",
        color: "#60a5fa",
        time: p.shieldTime,
        duration: this.getSkill("shield").duration,
      });
    if (p.overdriveTime > 0)
      out.push({
        id: "overdrive",
        name: "过载",
        icon: "🔥",
        color: "#fbbf24",
        time: p.overdriveTime,
        duration: this.getSkill("overdrive").duration,
      });
    if (this.timewarp > 0)
      out.push({
        id: "timewarp",
        name: "时间扭曲",
        icon: "⏳",
        color: "#c084fc",
        time: this.timewarp,
        duration: this.getSkill("timewarp").duration,
      });
    if (p.iframes > 0 && p.dashTime <= 0)
      out.push({
        id: "iframe",
        name: "无敌",
        icon: "✨",
        color: "#22d3ee",
        time: p.iframes,
        duration: 0.45,
      });
    return out;
  }

  private getSkill(id: string): SkillDef {
    return getSkill(id);
  }

  private lastHudEmit = 0;
    private emit(immediate = false) {
    // While simulating a bot / remote foe we swap the engine's single context
    // onto them; any emit() here would push THEIR state into the player's HUD
    // and cause a brief flicker (e.g. the bot uses a skill). Skip it — the
    // per-frame HUD refresh in `loop()` still runs with the human's context.
    if (this.simulatingOther) return;
    // Rate-limit non-immediate HUD pushes to ~20Hz. The main loop already
    // throttles to ~16Hz, but the multiplayer update path used to call
    // emit(true) every frame, forcing a React re-render 60x/sec and tanking
    // the frame rate in online matches. This floor is a safety net so ANY
    // emit(false) can never become a per-frame re-render.
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!immediate && now - this.lastHudEmit < 50) return;
    this.lastHudEmit = now;
    void immediate;
    const p = this.player;
    const s = this.skill;
    const g = this.gun;
    const ws = this.weaponStates.get(g.id)!;
    const cdPct = this.skillCd <= 0 ? 1 : 1 - this.skillCd / s.cooldown;
    const dashChargePct =
      this.dashCharges >= MAX_DASH_CHARGES
        ? 1
        : this.dashRecharge / DASH_RECHARGE;
    const gadgets: GadgetHud[] = this.gadgets.map((gd, i) => {
      const cd = this.gadgetCd.get(gd.id) ?? 0;
      const deployed = this.deployables.filter((d) => d.kind === gd.kind).length;
      return {
        id: gd.id,
        kind: gd.kind,
        name: gd.name,
        iconShape: gd.iconShape,
        color: gd.color,
        cooldownPct: cd <= 0 ? 1 : 1 - cd / gd.cooldown,
        ready: cd <= 0,
        deployed,
        maxStack: gd.maxStack ?? 1,
        selected: this.selectedGadget === i,
      };
    });
    const hud: HudState = {
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      score: this.isDM ? (this.mode === "local" ? this.combatants[0]?.score ?? 0 : this.combatants.find(c => c.id === this.selfPid)?.score ?? 0) : this.score,
      wave: this.wave,
      enemiesLeft:
        this.mode === "guest" ? this.enemiesLeft : this.enemies.length + this.spawnQueue,
      gunId: g.id,
      guns: this.guns.map((gn) => ({
        id: gn.id,
        name: gn.name,
        iconShape: gn.iconShape,
        weaponClass: gn.weaponClass,
      })),
      gunIndex: this.gunIndex,
      weaponClass: g.weaponClass,
      ammo: g.magazine !== undefined ? ws.ammo : null,
      magazine: g.magazine ?? null,
      reloading: g.magazine !== undefined && ws.reload > 0,
      reloadPct:
        g.reloadTime && ws.reload > 0 ? 1 - ws.reload / g.reloadTime : 0,
      heat: ws.heat,
      overheated: ws.overheated,
      warmup: g.spinup ? ws.spin ?? 0 : 0,
      mode: this.gameMode,
      skillId: s.id,
      skillName: s.name,
      skillIcon: s.icon,
      skillCooldownPct: Math.max(0, Math.min(1, cdPct)),
      skillReady: this.skillCd <= 0,
      dashCharges: this.dashCharges,
      maxDashCharges: MAX_DASH_CHARGES,
      dashChargePct: dashChargePct,
      effects: this.getEffects(),
      gadgets,
      // Each side shows ITS OWN base as "己方基地". The joiner (pid 2) defends
      // the top base (this.enemyBase); the creator (pid 1) defends the bottom
      // one (this.base). Use selfPid (not mode) so the authoritative path — where
      // BOTH peers run as "guest" — still orients each client correctly.
      baseHp: this.base ? Math.max(0, Math.round(this.mode === "guest" ? this.enemyBase.hp : this.base.hp)) : 0,
      baseMaxHp: this.base ? (this.mode === "guest" ? this.enemyBase.maxHp : this.base.maxHp) : 0,
      enemyBaseHp: this.base ? Math.max(0, Math.round(this.mode === "guest" ? this.base.hp : this.enemyBase.hp)) : 0,
      enemyBaseMaxHp: this.base ? (this.mode === "guest" ? this.base.maxHp : this.enemyBase.maxHp) : 0,
      dmTimeLeft: this.mode === "local" && this.isDM && (this.gameMode === "deathmatch" || this.gameMode === "team_deathmatch") ? this.dmTimeLeft : undefined,
      teamScores: this.mode === "local" && this.isDM ? this.buildTeamScores() : undefined,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      paused: this.paused,
      connecting: this.mode !== "local" && !this.peerReady,
      reconnecting: this.reconnecting,
      banner: this.banner ? this.banner.text : null,
      kills: this.isDM ? (this.mode === "local" ? this.combatants[0]?.kills ?? 0 : this.combatants.find(c => c.id === this.selfPid)?.kills ?? 0) : this.kills,
      gold: this.gold,
      activeScoreFeed: this.activeScoreFeed ? {
        totalScore: this.activeScoreFeed.totalScore,
        timer: this.activeScoreFeed.timer,
        events: this.activeScoreFeed.events.map(e => ({ id: e.id, text: e.text, victimName: e.victimName, subScore: e.subScore })),
        totalKills: this.activeScoreFeed.totalKills
      } : null,
      killFeed: this.killFeed.map(f => ({ id: f.id, type: f.type, text: f.text, teamColor: f.teamColor, killerName: f.killerName, victimName: f.victimName, weaponIconShape: f.weaponIconShape, weaponGlow: f.weaponGlow, weaponId: f.weaponId })),
      bowChargePct: p.bowDrawing ? Math.min(1, p.bowCharge / (this.gun.maxChargeTime ?? 1)) : 0,
      shieldHp: this.gun.shieldMaxHp ? Math.max(0, Math.round(p.shieldHp)) : null,
      shieldMaxHp: this.gun.shieldMaxHp ?? null,
      shieldActive: p.shieldBlockTime > 0,
      shieldCdPct: p.shieldCd > 0 ? 1 - p.shieldCd / (this.gun.shieldRechargeTime ?? 8) : 1,
      hitFlash: p.flash,
      isNet: this.mode !== "local",
      matchTimeLeft:
        this.mode === "local"
          ? null
          : Math.max(0, MATCH_DURATION - (this.mode === "guest" ? this.lastSnapTime : this.time)),
      dm: this.isDM
        ? this.combatants
            .slice()
            .sort((a, b) => b.kills - a.kills)
            .map((c) => ({
              id: c.id,
              name: c.name,
              kills: c.kills,
              color: c.color,
              you: this.mode === "local" ? c.id === 0 : c.id === this.selfPid,
              dead: !!(c.player.deadTimer && c.player.deadTimer > 0),
              teamId: c.teamId,
              deaths: c.deaths ?? 0,
              score: c.score,
            }))
        : undefined,
      dmTarget: this.isDM ? this.dmKillLimit : undefined,
      deadTimer: p.deadTimer ?? 0,
      eliminatedBy: this.eliminatedBy,
      damageLogs: this.damageLogs.map(l => ({ ...l, amount: Math.round(l.amount) })),
      postGameStats: this.gameOver ? (
        this.combatants && this.combatants.length > 0 ? (
          (() => {
            let maxScore = -1;
            this.combatants.forEach(c => { if (c.score > maxScore) maxScore = c.score; });
            return this.combatants.map(c => ({
              id: c.id,
              name: c.name,
              isLocal: this.mode === "local" ? c.id === 0 : c.id === this.selfPid,
              score: c.score,
              kills: c.kills,
              deaths: c.deaths ?? 0,
              damageDealt: Math.round(c.damageDealt ?? 0),
              damageTaken: Math.round(c.damageTaken ?? 0),
              isMvp: c.score === maxScore && maxScore > 0,
              color: c.color,
              characterName: c.character?.name
            })).sort((a, b) => b.score - a.score);
          })()
        ) : [{
          id: 0,
          name: this.character?.name || "玩家",
          isLocal: true,
          score: this.score,
          kills: this.kills,
          deaths: this.playerDeaths,
          damageDealt: Math.round(this.playerDamageDealt),
          damageTaken: Math.round(this.playerDamageTaken),
          isMvp: true,
          color: "#38bdf8",
          characterName: this.character?.name
        }]
      ) : undefined,
    };
    this.onHud(hud);
  }

  // ---------------------------------------------------------------- render
  private render() {
    const ctx = this.ctx;
    // headless / server mode: no canvas, simulation only
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawBackground(ctx);

    // guest / authoritative-server clients render the world straight from the snapshot
    if (this.mode === "guest" || this.authoritative) {
      this.renderNet(ctx);
      this.drawCrosshair(ctx);
      this.drawOverlays(ctx);
      return;
    }

    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }
    // camera offset for world-space rendering
    ctx.translate(-this.camX, -this.camY);

    this.drawDecorations(ctx);
    this.drawWalls(ctx);
    this.drawDeployables(ctx);
    if (this.gameMode !== "biohazard" && !this.isDM) {
      this.drawBase(ctx, this.enemyBase, false);
      this.drawBase(ctx, this.base, true);
    }
    this.drawArenaBorder(ctx);
    this.drawFieldEffects(ctx);
    this.drawPickups(ctx);
    this.drawParticles(ctx);
    this.drawGrenades(ctx);
    this.drawEnemies(ctx);
    this.drawEnemyBullets(ctx);
    this.drawBeam(ctx);
    this.drawFlameCone(ctx);
    if (this.trainActive) {
      drawPixelTrain(ctx, this.trainX, this.trainTrackY, this.trainDir, this.time, this.trainWarning);
    }
    if (this.isDM) {
      // draw every combatant (you + 3 bots) with its name + hp bar
      for (const c of this.combatants) {
        const q = c.player;
        if (q.deadTimer && q.deadTimer > 0) continue;

        const isLocalC = this.mode === "local" ? c.id === 0 : c.id === this.selfPid;
        if (isLocalC) {
          this.drawThrustSwordChargeIndicator(ctx, q);
        }

        const isTeammate = this.isTeammate(this.activeId, c.id);
        const cloakAlpha = isLocalC ? 0.15 : isTeammate ? 0.35 : 0.08;
        const nameColor = isLocalC ? "#ffffff" : isTeammate ? "#7dd3fc" : "#fca5a5";
        const hpBarColor = isLocalC ? "#22c55e" : isTeammate ? "#38bdf8" : "#ef4444";
        const hpBarHeight = isLocalC || isTeammate ? 4 : 7;

        this.drawNetCharacter(
          ctx,
          q.x,
          q.y,
          q.angle,
          c.character.id,
          c.outfit.id,
          q.gunIndex ?? c.gunIndex ?? 0,
          c.guns,
          c.name,
          q.hp / q.maxHp,
          this.time,
          q.size,
          c.selectedGadget >= 0 ? c.gadgets[c.selectedGadget] : undefined,
          q.isCloaked,
          cloakAlpha,
          nameColor,
          this.gameMode === "team_deathmatch" && isTeammate,
          hpBarColor,
          hpBarHeight
        );
        if (q.electrifiedTime && q.electrifiedTime > 0) {
          this.drawElectricArcs(ctx, q.x, q.y, q.size, q.electrifiedGlow ?? "#38bdf8", this.time);
        }
        if (q.iframes > 0 && q.dashTime <= 0) {
          ctx.save();
          ctx.globalAlpha = 0.4 + Math.sin(this.time * 20) * 0.2;
          ctx.fillStyle = "#e0f2fe";
          for (let i = 0; i < 4; i++) {
            const a = this.time * 4 + (i * Math.PI) / 2;
            const nx = Math.round(q.x + Math.cos(a) * (q.size + 4));
            const ny = Math.round(q.y + Math.sin(a) * (q.size + 4));
            ctx.fillRect(nx - 1, ny - 1, 3, 3);
          }
          ctx.restore();
        }
      }
    } else {
      if (!(this.player.deadTimer && this.player.deadTimer > 0)) this.drawPlayer(ctx);
      if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0)) {
        this.drawNetCharacter(
          ctx,
          this.foe.x,
          this.foe.y,
          this.foe.angle,
          this.foeChar?.id ?? "raider",
          this.foeOutfit?.id ?? "tactical",
          this.foe.gunIndex ?? 0,
          this.foeGuns,
          this.peerName || "对手",
          this.foe.hp / this.foe.maxHp,
          this.time,
          this.foe.size,
          this.foe.selectedGadget !== undefined && this.foe.selectedGadget >= 0 ? (this.foeGadgets?.[this.foe.selectedGadget] ?? GADGETS[this.foe.selectedGadget]) : undefined,
          this.foe.isCloaked,
          0.08,
          "#fca5a5",
          false,
          "#ef4444",
          7
        );
        if (this.foe.electrifiedTime && this.foe.electrifiedTime > 0) {
          this.drawElectricArcs(ctx, this.foe.x, this.foe.y, this.foe.size, this.foe.electrifiedGlow ?? "#38bdf8", this.time);
        }
      }
    }
    // gadget aiming preview (selection highlight + throw/deploy hint)
    this.drawAimPreview(ctx);
    // weapon aim indicator (投射榴弹炮 — deployable-style target marker)
    if (this.gun.aimIndicator) this.drawLauncherIndicator(ctx);
    this.drawBullets(ctx);
    this.drawMeleeTrails(ctx);
    this.drawEffects(ctx);
    this.drawWeather(ctx);

    ctx.restore();

    this.drawCrosshair(ctx);
    this.drawOverlays(ctx);
  }

  private cityBg: HTMLCanvasElement | null = null;
  private cityBgKey = "";
  private groundBg: HTMLCanvasElement | null = null;
  private groundBgKey = "";

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.sceneTheme;
    // static layer (scene gradient + vignette) is cached offscreen — avoids two
    // fullscreen gradient fills every frame
    const bgc = this.getBgCache();
    if (bgc) {
      ctx.drawImage(bgc, 0, 0);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, theme.bgTop);
      g.addColorStop(1, theme.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // blobs at base positions (in world space, but we draw in screen space)
    // own base glows blue, opponent's glows red — for both host and guest
    if (!this.isDM && this.gameMode !== "biohazard") {
      const myBase = this.mode === "guest" ? this.enemyBase : this.base;
      const foeBase = this.mode === "guest" ? this.base : this.enemyBase;
      const blobs: [number, number, string][] = [
        [foeBase.x - this.camX, foeBase.y - this.camY, "#dc2626"],
        [myBase.x - this.camX, myBase.y - this.camY, "#1d4ed8"],
      ];
      for (const [bx, by, col] of blobs) {
        const rg = this.radialGlow(ctx, this.W * 0.4, `blob|${col}|${this.W}`, [[0, rgba(col, 0.18)], [1, rgba(col, 0)]]);
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = rg;
        ctx.fillRect(-bx, -by, this.W, this.H);
        ctx.restore();
      }
    }

    // 16-bit RPG Floor — Blits a cached, world-sized detailed pixel ground (1 drawImage per frame)
    if (theme.style === "city") {
      ctx.save();
      ctx.translate(-this.camX, -this.camY);
      const bg = this.getCityBg();
      if (bg) ctx.drawImage(bg, 0, 0);
      else this.drawCityBackdrop(ctx, theme);
      ctx.restore();
      // animated magenta sweep (per-frame, screen space)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const sweep = (this.time * 0.05) % 1;
      const sg = ctx.createLinearGradient(0, 0, this.W, 0);
      const p = sweep * this.W;
      sg.addColorStop(0, "rgba(217,70,239,0)");
      sg.addColorStop(Math.min(1, p / this.W), "rgba(217,70,239,0.05)");
      sg.addColorStop(1, "rgba(217,70,239,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(-this.camX, -this.camY);
      const bg = this.getGroundBg();
      if (bg) ctx.drawImage(bg, 0, 0);
      else this.drawOrganicGround(ctx, theme);

      // Draw railway track & signals when train is active on the map
      const trainMode = this.loadout?.customMap?.trainMode ?? "auto";
      const isArctic = this.sceneIndex === 2 || this.sceneIndex === 7;
      const shouldRunTrain = trainMode === "always" || (trainMode === "auto" && isArctic);
      if (shouldRunTrain) {
        drawPixelRailwayTrack(ctx, this.worldW, this.trainTrackY, this.time, this.trainWarning);
      }
      ctx.restore();
    }

    // vignette (already baked into the cached background when available)
    if (!bgc) {
      const vg = ctx.createRadialGradient(
        this.W / 2,
        this.H / 2,
        this.H * 0.35,
        this.W / 2,
        this.H / 2,
        this.H * 0.85
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  /**
   * Top-down cyber-city floor: neon "road" grid + glowing building rooftops
   * with lit windows. Drawn at WORLD coordinates (no camera offset) so it can
   * be rendered once into an offscreen canvas (getCityBg) and blitted per frame.
   * Building positions are hashed from world-cell coords so the skyline is stable.
   */
  private drawCityBackdrop(
    ctx: CanvasRenderingContext2D,
    theme: { accent: string; wallDark: string; gridColor?: string }
  ) {
    // road grid (neon lines, at world coords)
    ctx.strokeStyle = theme.gridColor ?? "rgba(34,211,238,0.10)";
    ctx.lineWidth = 1.5;
    const gstep = 64;
    ctx.beginPath();
    for (let x = 0; x <= this.worldW; x += gstep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldH);
    }
    for (let y = 0; y <= this.worldH; y += gstep) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldW, y);
    }
    ctx.stroke();

    // building blocks — kept subtle so the arena reads as a faint neon-city floor
    const block = 150;
    for (let wx = 0; wx <= this.worldW; wx += block) {
      for (let wy = 0; wy <= this.worldH; wy += block) {
        const h = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
        const f = h - Math.floor(h); // pseudo-random 0..1
        const f2 = (h * 1.7) % 1;
        const pad = 24 + Math.floor(f * 22);
        const bw = block - pad * 2 - Math.floor(f2 * 20);
        const bh = block - pad * 2 - Math.floor((1 - f2) * 16);
        const bx = wx + pad;
        const by = wy + pad;

        // rooftop slab (low alpha so the floor stays in the background)
        ctx.fillStyle = rgba(theme.wallDark, 0.26);
        roundRect(ctx, bx, by, bw, bh, 7);
        ctx.fill();
        // neon edge (thin, soft)
        ctx.strokeStyle = rgba(theme.accent, 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        // inner glow line
        ctx.strokeStyle = rgba(theme.accent, 0.08);
        ctx.lineWidth = 1;
        roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 5);
        ctx.stroke();

        // lit windows (a few small squares)
        const cols = Math.max(2, Math.floor(bw / 26));
        const rows = Math.max(2, Math.floor(bh / 26));
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const lit = ((i * 7 + j * 13 + Math.floor(f * 31)) % 5) === 0;
            if (!lit) continue;
            ctx.fillStyle = rgba(theme.accent, 0.32);
            ctx.fillRect(bx + 8 + i * 22, by + 8 + j * 22, 5, 5);
          }
        }
      }
    }
  }

  /**
   * 🌲 16-Bit RPG Organic Ground (Dirt Paths, Stepped Grass Fringe, Cobblestones, Wildflowers)
   * Rendered once into an offscreen canvas (getGroundBg) and blitted per frame.
   */
  private drawOrganicGround(
    ctx: CanvasRenderingContext2D,
    theme: { accent: string; wallDark: string; gridColor?: string; wallColor?: string }
  ) {
    const isWest = this.sceneIndex === 5;
    const isDesert = this.sceneIndex === 1;
    const isSnow = this.sceneIndex === 2 || this.sceneIndex === 7;

    const dirtColor = isSnow ? "rgba(186,230,253,0.3)" : isDesert ? "rgba(180,83,9,0.38)" : isWest ? "rgba(180,83,9,0.35)" : "rgba(120,53,15,0.42)";
    const pathHighlight = isSnow ? "rgba(255,255,255,0.5)" : isDesert ? "rgba(251,191,36,0.32)" : isWest ? "rgba(245,158,11,0.3)" : "rgba(217,119,6,0.32)";
    const fringeColor = isSnow ? "#e0f2fe" : isDesert ? "#d97706" : isWest ? "#b45309" : "#1e4d2b";

    // 1. Main cross paths (horizontal & vertical dirt avenues cutting across the map)
    const midX = Math.round(this.worldW / 2);
    const midY = Math.round(this.worldH / 2);
    const pathW = 96;

    // Horizontal dirt path
    ctx.fillStyle = dirtColor;
    ctx.fillRect(0, midY - pathW / 2, this.worldW, pathW);
    // Vertical dirt path
    ctx.fillRect(midX - pathW / 2, 0, pathW, this.worldH);

    // Path center highlight strip
    ctx.fillStyle = pathHighlight;
    ctx.fillRect(0, midY - 6, this.worldW, 12);
    ctx.fillRect(midX - 6, 0, 12, this.worldH);

    // 2. Jagged stepped grass fringes along path borders
    ctx.fillStyle = fringeColor;
    const toothStep = 16;
    // Horizontal path top & bottom fringes
    for (let x = 0; x < this.worldW; x += toothStep) {
      const h1 = ((x * 13) % 7) * 2;
      const h2 = ((x * 17) % 7) * 2;
      ctx.fillRect(x, midY - pathW / 2 - h1, toothStep, h1 + 2);
      ctx.fillRect(x, midY + pathW / 2 - 2, toothStep, h2 + 2);
    }
    // Vertical path left & right fringes
    for (let y = 0; y < this.worldH; y += toothStep) {
      const w1 = ((y * 11) % 7) * 2;
      const w2 = ((y * 19) % 7) * 2;
      ctx.fillRect(midX - pathW / 2 - w1, y, w1 + 2, toothStep);
      ctx.fillRect(midX + pathW / 2 - 2, y, w2 + 2, toothStep);
    }

    // 3. Central plaza cobblestones (Only on non-snow maps so railway can cross smoothly)
    if (!isSnow) {
      const plazaR = 110;
      ctx.fillStyle = "rgba(71,85,105,0.35)";
      ctx.fillRect(midX - plazaR, midY - plazaR, plazaR * 2, plazaR * 2);
      ctx.strokeStyle = "rgba(148,163,184,0.4)";
      ctx.lineWidth = 1.5;
      const stoneSize = 24;
      for (let x = midX - plazaR; x < midX + plazaR; x += stoneSize) {
        for (let y = midY - plazaR; y < midY + plazaR; y += stoneSize) {
          ctx.strokeRect(x + 2, y + 2, stoneSize - 4, stoneSize - 4);
        }
      }
    } else {
      // 冰雪地图：横向铺设极地铁道床与散落雪堆
      drawPixelRailwayTrack(ctx, this.worldW, midY, 0, false);
      for (let sx = 100; sx < this.worldW - 100; sx += 220) {
        const sy1 = ((sx * 7) % (midY - 120)) + 60;
        const sy2 = midY + 70 + ((sx * 11) % (midY - 140));
        drawPixelSnowDrift(ctx, sx, sy1, 2);
        drawPixelSnowDrift(ctx, sx + 90, sy2, 2);
      }
    }

    // 4. Wildflower and grass tuft specks
    const flCols = isSnow ? ["#ffffff", "#93c5fd"] : isDesert ? ["#fde047", "#fb923c"] : ["#f472b6", "#fde047", "#ffffff", "#4ade80"];
    const numTufts = 80;
    for (let i = 0; i < numTufts; i++) {
      const tx = ((i * 1973 + 241) % (this.worldW - 100)) + 50;
      const ty = ((i * 3821 + 839) % (this.worldH - 100)) + 50;
      if (Math.abs(tx - midX) < pathW / 2 - 10 || Math.abs(ty - midY) < pathW / 2 - 10) continue;

      const col = flCols[i % flCols.length];
      ctx.fillStyle = col;
      ctx.fillRect(tx, ty, 3, 3);
      ctx.fillRect(tx + 2, ty - 2, 2, 2);
    }

    // Subtle 48px tile grid overlay
    ctx.strokeStyle = theme.gridColor ?? "rgba(130,150,220,0.06)";
    ctx.lineWidth = 1;
    const step = 48;
    ctx.beginPath();
    for (let x = 0; x <= this.worldW; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldH);
    }
    for (let y = 0; y <= this.worldH; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldW, y);
    }
    ctx.stroke();
  }

  /** Build (once) an offscreen, world-sized canvas of the static city floor and
   *  cache it by scene + world size. Blitting it each frame is a single
   *  drawImage instead of hundreds of fills/strokes — a big per-frame win. */
  private getCityBg(): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null;
    const key = `${this.sceneIndex}|${Math.ceil(this.worldW)}|${Math.ceil(this.worldH)}`;
    if (this.cityBg && this.cityBgKey === key) return this.cityBg;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(this.worldW));
    c.height = Math.max(1, Math.ceil(this.worldH));
    const b = c.getContext("2d");
    if (!b) return null;
    this.drawCityBackdrop(b, this.sceneTheme);
    this.cityBg = c;
    this.cityBgKey = key;
    return c;
  }

  /** Build (once) an offscreen, world-sized canvas of the static organic RPG ground and
   *  cache it by scene + world size. */
  private getGroundBg(): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null;
    const key = `ground_${this.sceneIndex}|${Math.ceil(this.worldW)}|${Math.ceil(this.worldH)}`;
    if (this.groundBg && this.groundBgKey === key) return this.groundBg;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(this.worldW));
    c.height = Math.max(1, Math.ceil(this.worldH));
    const b = c.getContext("2d");
    if (!b) return null;
    this.drawOrganicGround(b, this.sceneTheme);
    this.groundBg = c;
    this.groundBgKey = key;
    return c;
  }

  private drawArenaBorder(ctx: CanvasRenderingContext2D) {
    const acc = this.sceneTheme.accent;
    ctx.strokeStyle = rgba(acc, 0.4);
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, this.worldW - 4, this.worldH - 4);
    // Pixel hazard corner accents
    const cLen = 28;
    ctx.fillStyle = acc;
    // Top-left
    ctx.fillRect(0, 0, cLen, 3);
    ctx.fillRect(0, 0, 3, cLen);
    // Top-right
    ctx.fillRect(this.worldW - cLen, 0, cLen, 3);
    ctx.fillRect(this.worldW - 3, 0, 3, cLen);
    // Bottom-left
    ctx.fillRect(0, this.worldH - 3, cLen, 3);
    ctx.fillRect(0, this.worldH - cLen, 3, cLen);
    // Bottom-right
    ctx.fillRect(this.worldW - cLen, this.worldH - 3, cLen, 3);
    ctx.fillRect(this.worldW - 3, this.worldH - cLen, 3, cLen);
  }

  private drawWalls(ctx: CanvasRenderingContext2D) {
    for (const w of this.walls) {
      if (w.invisible) continue;
      ctx.save();
      if (w.building) {
        this.drawBuilding(ctx, w);
      } else if (w.glue) {
        // Glue Wall — 16-bit pixel gel block with floating pixel bubbles
        ctx.fillStyle = "rgba(34,211,238,0.45)";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(w.x, w.y, w.w, 1);
        ctx.strokeStyle = "#0891b2";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        // Floating pixel bubbles
        ctx.fillStyle = "#cffafe";
        for (let i = 0; i < 4; i++) {
          const bx = Math.round(w.x + 8 + i * (w.w / 4));
          const by = Math.round(w.y + w.h / 2 + Math.sin(this.time * 3 + i * 2) * 4);
          ctx.fillRect(bx, by, 3, 3);
        }
        const frac = Math.max(0, w.hp / w.maxHp);
        if (frac < 1) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
          ctx.fillStyle = "#22d3ee";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
        }
      } else if (w.destructible) {
        // Destructible Wooden Wall / Crate — 16-bit pixel cross-brace crate
        const frac = Math.max(0, w.hp / w.maxHp);
        // Main wooden body
        ctx.fillStyle = "#8a6a3c";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        // Top/left highlight
        ctx.fillStyle = "#c9a36a";
        ctx.fillRect(w.x, w.y, w.w, 2);
        ctx.fillRect(w.x, w.y, 2, w.h);
        // Dark inner bevel
        ctx.fillStyle = "#5c4020";
        ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
        ctx.fillRect(w.x, w.y + w.h - 2, w.w, 2);
        // Outer dark frame
        ctx.strokeStyle = "#2e1e0e";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x, w.y, w.w, w.h);

        // Pixel Cross-bracing & planks
        ctx.strokeStyle = "rgba(46,30,14,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Diagonal cross
        ctx.moveTo(w.x + 3, w.y + 3);
        ctx.lineTo(w.x + w.w - 3, w.y + w.h - 3);
        ctx.moveTo(w.x + w.w - 3, w.y + 3);
        ctx.lineTo(w.x + 3, w.y + w.h - 3);
        ctx.stroke();

        // 4 Corner pixel nails
        ctx.fillStyle = "#d4b07b";
        ctx.fillRect(w.x + 3, w.y + 3, 2, 2);
        ctx.fillRect(w.x + w.w - 5, w.y + 3, 2, 2);
        ctx.fillRect(w.x + 3, w.y + w.h - 5, 2, 2);
        ctx.fillRect(w.x + w.w - 5, w.y + w.h - 5, 2, 2);

        // Damage cracks if low HP
        if (frac < 0.6) {
          ctx.fillStyle = "#1a120a";
          ctx.fillRect(Math.round(w.x + w.w * 0.4), Math.round(w.y + w.h * 0.3), 4, 2);
          ctx.fillRect(Math.round(w.x + w.w * 0.5), Math.round(w.y + w.h * 0.4), 2, 6);
          ctx.fillRect(Math.round(w.x + w.w * 0.6), Math.round(w.y + w.h * 0.6), 5, 2);
        }

        if (frac < 1) {
          const pw = w.w - 8;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw, 3);
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw * frac, 3);
        }
      } else {
        // Solid Alloy Cover Wall — 16-bit Steel Plate with Rivets
        ctx.fillStyle = "#3a4254";
        ctx.fillRect(w.x, w.y, w.w, w.h);
        // Top & Left 1px pixel highlight
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(w.x, w.y, w.w, 1);
        ctx.fillRect(w.x, w.y, 1, w.h);
        // Bottom & Right 1px dark bevel
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(w.x, w.y + w.h - 1, w.w, 1);
        ctx.fillRect(w.x + w.w - 1, w.y, 1, w.h);
        // Dark outline
        ctx.strokeStyle = "rgba(10,12,28,0.9)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        // 4 Corner Square Rivets
        ctx.fillStyle = "#727d93";
        for (const [rx, ry] of [
          [w.x + 4, w.y + 4],
          [w.x + w.w - 7, w.y + 4],
          [w.x + 4, w.y + w.h - 7],
          [w.x + w.w - 7, w.y + w.h - 7],
        ]) {
          ctx.fillRect(rx, ry, 3, 3);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillRect(rx, ry, 1, 1);
          ctx.fillStyle = "#727d93";
        }
      }
      ctx.restore();
    }
  }

  /** Render a solid building: a tower-like rooftop slab with neon trim, a seeded
   *  window grid and a central rooftop unit. Drawn at world coords (the caller
   *  has already applied the camera transform). */
  /** Render a solid building. The slab colour follows the map palette
   *  (sceneTheme.wallColor → wallDark); the *structure* drawn on top depends on
   *  the map (this.sceneIndex) so every map has its own building style. */


  private drawBuilding(ctx: CanvasRenderingContext2D, w: Wall) {
    // ground shadow so the slab reads as a raised structure
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(w.x - 2, w.y + w.h + 2, w.w + 4, 8);
    switch (this.sceneIndex) {
      case 1:
        this.bldDesert(ctx, w);
        break;
      case 2:
        this.bldArctic(ctx, w);
        break;
      case 3:
        this.bldRuin(ctx, w);
        break;
      case 4:
        this.bldCyber(ctx, w);
        break;
      case 5:
        this.bldWildWest(ctx, w);
        break;
      case 6:
        this.bldJungle(ctx, w);
        break;
      case 7:
        this.bldArcticZone(ctx, w);
        break;
      default:
        this.bldNeon(ctx, w);
        break;
    }
    // hp bar when damaged
    const frac = Math.max(0, w.hp / w.maxHp);
    if (frac < 1) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
      ctx.fillStyle = rgba("#fbbf24", 0.9);
      ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
    }
  }

  /** Base concrete slab (wallColor) with 1px pixel highlight & hard outline. */
  private bldSlab(ctx: CanvasRenderingContext2D, w: Wall) {
    const col = this.sceneTheme.wallColor || "#5b6478";
    ctx.fillStyle = col;
    roundRect(ctx, w.x, w.y, w.w, w.h, 6);
    ctx.fill();
    // 1px pixel highlight on top
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(w.x + 2, w.y + 1, w.w - 4, 1);
    ctx.strokeStyle = "rgba(8,10,18,0.9)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, w.x, w.y, w.w, w.h, 6);
    ctx.stroke();
  }

  /** Seeded lit/dark window grid. `thr` raises the lit-window rarity; `cell`
   *  sets the grid pitch; `alpha` the glow strength. */
  private bldWindows(
    ctx: CanvasRenderingContext2D,
    w: Wall,
    seed: number,
    accent: string,
    cell: number,
    thr: number,
    alpha: number,
  ) {
    const padX = 12;
    const padY = 12;
    const cols = Math.max(2, Math.floor((w.w - padX * 2) / cell));
    const rows = Math.max(2, Math.floor((w.h - padY * 2) / cell));
    const stepX = (w.w - padX * 2) / cols;
    const stepY = (w.h - padY * 2) / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const hh = Math.abs(Math.sin((seed * 12.9898 + i * 78.233 + j * 37.719) * 43758.5453));
        const lit = hh - Math.floor(hh) > thr;
        const wx = w.x + padX + i * stepX;
        const wy = w.y + padY + j * stepY;
        ctx.fillStyle = lit ? rgba(accent, alpha) : "rgba(120,130,150,0.16)";
        ctx.fillRect(wx, wy, stepX - 6, stepY - 6);
      }
    }
  }

  /** 霓虹都市 — Pixel Cyber Tower */
  private bldNeon(ctx: CanvasRenderingContext2D, w: Wall) {
    drawPixelCyberRooftop(ctx, w.x, w.y, w.w, w.h, this.time, this.sceneTheme.accent || "#818cf8");
  }

  /** 沙漠废墟 / 西部沙漠 — Pixel Western Saloon, Wooden House, Cabin Shop & Adobe Fort */
  private bldDesert(ctx: CanvasRenderingContext2D, w: Wall) {
    const seed = Math.abs(Math.round(w.x * 17 + w.y * 31));
    if (w.w >= 170 && w.h >= 120) {
      if (seed % 2 === 0) {
        drawPixelSaloon(ctx, w.x, w.y, w.w, w.h, this.time);
      } else {
        drawPixelWesternHouse(ctx, w.x, w.y, w.w, w.h, this.time);
      }
    } else if (w.w >= 150) {
      drawPixelCabinShop(ctx, w.x, w.y, w.w, w.h, this.time);
    } else if (w.w >= 100 && w.h >= 140) {
      drawPixelDesertFort(ctx, w.x, w.y, w.w, w.h, this.time);
    } else {
      drawPixelWesternHouse(ctx, w.x, w.y, w.w, w.h, this.time);
    }
  }

  /** 冰原基地 — Pixel Arctic Research Bunker */
  private bldArctic(ctx: CanvasRenderingContext2D, w: Wall) {
    drawPixelArcticBunker(ctx, w.x, w.y, w.w, w.h, this.time, this.sceneTheme.accent || "#38bdf8");
  }

  /** 末日废墟 — Ancient Stone Ruins with Climbing Ivy or Ruined Factory */
  private bldRuin(ctx: CanvasRenderingContext2D, w: Wall) {
    if (w.w < 110) {
      drawPixelStoneRuins(ctx, w.x, w.y, w.w, w.h);
    } else {
      drawPixelRuinFactory(ctx, w.x, w.y, w.w, w.h, this.time);
    }
  }

  /** 赛博都市 — Pixel Cyber Tower */
  private bldCyber(ctx: CanvasRenderingContext2D, w: Wall) {
    drawPixelCyberRooftop(ctx, w.x, w.y, w.w, w.h, this.time, this.sceneTheme.accent || "#00f0ff");
  }

  /** 西部牛仔 / 边境小镇 — Pixel Western Saloon, Wooden Houses & Cabin Shops */
  private bldWildWest(ctx: CanvasRenderingContext2D, w: Wall) {
    const seed = Math.abs(Math.round(w.x * 17 + w.y * 31));
    if (w.w >= 170 && w.h >= 120) {
      if (seed % 2 === 0) {
        drawPixelSaloon(ctx, w.x, w.y, w.w, w.h, this.time);
      } else {
        drawPixelWesternHouse(ctx, w.x, w.y, w.w, w.h, this.time);
      }
    } else if (w.w >= 140) {
      drawPixelCabinShop(ctx, w.x, w.y, w.w, w.h, this.time);
    } else {
      drawPixelWesternHouse(ctx, w.x, w.y, w.w, w.h, this.time);
    }
  }

  /** 幽静丛林 / 森林小镇 — Charming Wooden Cabin Shop or Ancient Stone Temple */
  private bldJungle(ctx: CanvasRenderingContext2D, w: Wall) {
    if (w.w > 120) {
      drawPixelCabinShop(ctx, w.x, w.y, w.w, w.h, this.time);
    } else if (w.w < 90) {
      drawPixelStoneRuins(ctx, w.x, w.y, w.w, w.h);
    } else {
      drawPixelJungleTemple(ctx, w.x, w.y, w.w, w.h, this.time);
    }
  }

  /** 极寒地带 — Glacial Ice Bunker */
  private bldArcticZone(ctx: CanvasRenderingContext2D, w: Wall) {
    drawPixelArcticBunker(ctx, w.x, w.y, w.w, w.h, this.time, this.sceneTheme.accent || "#0284c7");
  }

  // ---------------------------------------------------------------------------
  // Map Decorations System (Pure cosmetic non-colliding visual objects)
  // ---------------------------------------------------------------------------
  private mapDecorations: { x: number; y: number; kind: string; scale: number; angle: number }[] = [];
  private mapDecorationsKey = "";

  private getMapDecorations() {
    if (this.loadout?.customMap?.decorations === false) {
      return [];
    }
    const key = `${this.sceneIndex}_${Math.ceil(this.worldW)}_${Math.ceil(this.worldH)}`;
    if (this.mapDecorationsKey === key && this.mapDecorations.length > 0) {
      return this.mapDecorations;
    }
    const decs: { x: number; y: number; kind: string; scale: number; angle: number }[] = [];
    let seed = (this.sceneIndex + 1) * 12345;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = 55;
    const margin = 120;

    const isInsideWall = (x: number, y: number) => {
      for (const w of this.walls) {
        if (x >= w.x - 35 && x <= w.x + w.w + 35 && y >= w.y - 35 && y <= w.y + w.h + 35) {
          return true;
        }
      }
      // On snow/arctic maps, keep railway corridor clear of decorations
      if ((this.sceneIndex === 2 || this.sceneIndex === 7) && Math.abs(y - this.worldH / 2) < 45) {
        return true;
      }
      return false;
    };

    let kinds: string[] = [];
    switch (this.sceneIndex) {
      case 1:
        kinds = ["cactus", "cactus", "cactus", "skull", "rock", "crack", "critter_bird", "lantern"];
        break;
      case 2:
        kinds = ["pine", "ice_crystal", "snow_drift", "rock", "lantern", "critter_bird"];
        break;
      case 3:
        kinds = ["ruins", "lush_tree", "flower_bush", "bench", "lantern", "rock", "crack", "critter_bird"];
        break;
      case 4:
        kinds = ["sakura", "bamboo", "bench", "lantern", "cable", "neon_arrow", "critter_cat", "critter_bird"];
        break;
      case 5:
        kinds = ["cactus", "cactus", "cactus", "fence", "barrel", "wagon_wheel", "bench", "picnic_table", "lantern", "critter_bird", "critter_cat"];
        break;
      case 6:
        kinds = [
          "lush_tree",
          "flower_bush",
          "bench",
          "picnic_table",
          "lantern",
          "pond",
          "critter_bird",
          "critter_frog",
          "critter_cat",
          "critter_butterfly",
          "glowing_mushroom",
          "stone_tile",
          "bamboo",
          "sakura"
        ];
        break;
      case 7:
        kinds = ["pine", "ice_crystal", "snow_drift", "rock", "lantern", "critter_bird"];
        break;
      default:
        kinds = ["lush_tree", "flower_bush", "sakura", "bamboo", "bench", "lantern", "critter_bird", "critter_cat", "cable"];
        break;
    }

    for (let i = 0; i < count; i++) {
      const rx = margin + rnd() * (this.worldW - margin * 2);
      const ry = margin + rnd() * (this.worldH - margin * 2);
      if (isInsideWall(rx, ry)) continue;

      const kind = kinds[Math.floor(rnd() * kinds.length)];
      const scale = 0.85 + rnd() * 0.4;
      const angle = (rnd() - 0.5) * 0.08;
      decs.push({ x: rx, y: ry, kind, scale, angle });
    }

    this.mapDecorations = decs;
    this.mapDecorationsKey = key;
    return decs;
  }

  private drawDecorations(ctx: CanvasRenderingContext2D) {
    const decs = this.getMapDecorations();
    for (const d of decs) {
      if (!this.inView(d.x, d.y, 90)) continue;
      ctx.save();
      ctx.translate(Math.round(d.x), Math.round(d.y));
      ctx.rotate(d.angle);

      switch (d.kind) {
        case "lush_tree": {
          drawPixelLushTree(ctx, 0, 0, this.time, Math.max(1, Math.round(1.7 * d.scale)));
          break;
        }
        case "flower_bush": {
          const cols = ["#f472b6", "#fde047", "#ffffff", "#60a5fa"];
          const fCol = cols[Math.floor(Math.abs(d.x * 7 + d.y)) % cols.length];
          drawPixelBushWithFlowers(ctx, 0, 0, fCol, Math.max(1, Math.round(1.8 * d.scale)));
          break;
        }
        case "bench": {
          drawPixelParkBench(ctx, 0, 0, Math.max(1, Math.round(1.5 * d.scale)));
          break;
        }
        case "picnic_table": {
          drawPixelPicnicTable(ctx, 0, 0, Math.max(1, Math.round(1.5 * d.scale)));
          break;
        }
        case "lantern": {
          drawPixelStreetLantern(ctx, 0, 0, this.time, Math.max(1, Math.round(1.5 * d.scale)));
          break;
        }
        case "pond": {
          drawPixelPond(ctx, -50, -30, 100, 60, this.time);
          break;
        }
        case "ruins": {
          drawPixelStoneRuins(ctx, -35, -25, 70, 50);
          break;
        }
        case "critter_bird": {
          drawPixelCritters(ctx, 0, 0, this.time + d.x * 0.1, "bird", 2);
          break;
        }
        case "critter_frog": {
          drawPixelCritters(ctx, 0, 0, this.time + d.x * 0.1, "frog", 2);
          break;
        }
        case "critter_cat": {
          drawPixelCritters(ctx, 0, 0, this.time + d.x * 0.1, "cat", 2);
          break;
        }
        case "critter_butterfly": {
          drawPixelCritters(ctx, 0, 0, this.time + d.x * 0.1, "butterfly", 2);
          break;
        }
        case "bamboo": {
          drawPixelBamboo(ctx, 0, 0, Math.round(75 * d.scale), this.time, 2);
          break;
        }
        case "sakura":
        case "tree": {
          drawPixelSakuraTree(ctx, 0, 0, this.time, Math.max(1, Math.round(1.8 * d.scale)));
          break;
        }
        case "pine": {
          drawPixelPineTree(ctx, 0, 0, this.time, Math.max(1, Math.round(1.8 * d.scale)), this.sceneIndex === 2 || this.sceneIndex === 7);
          break;
        }
        case "fence": {
          // Pixel Wooden Fence
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(-22, 4, 44, 4);
          ctx.fillStyle = "#78350f";
          ctx.fillRect(-20, -14, 6, 20);
          ctx.fillRect(14, -14, 6, 20);
          ctx.fillStyle = "#b45309";
          ctx.fillRect(-22, -10, 44, 4);
          ctx.fillRect(-22, -2, 44, 4);
          ctx.strokeStyle = "#451a03";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-20, -14, 6, 20);
          ctx.strokeRect(14, -14, 6, 20);
          ctx.strokeRect(-22, -10, 44, 4);
          ctx.strokeRect(-22, -2, 44, 4);
          break;
        }
        case "barrel": {
          // Pixel Wooden Barrel
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(-10, 6, 20, 4);
          ctx.fillStyle = "#8a5829";
          ctx.fillRect(-10, -10, 20, 18);
          // Metal bands
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(-10, -7, 20, 3);
          ctx.fillRect(-10, 2, 20, 3);
          ctx.strokeStyle = "#3e1f07";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-10, -10, 20, 18);
          break;
        }
        case "wagon_wheel": {
          // Pixel Wagon Wheel
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(-12, 6, 24, 4);
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 2;
          ctx.strokeRect(-10, -10, 20, 20);
          ctx.fillStyle = "#451a03";
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = "#b45309";
          ctx.fillRect(-9, -1, 18, 2);
          ctx.fillRect(-1, -9, 2, 18);
          break;
        }
        case "cactus": {
          const varIdx = ((Math.abs(Math.round(d.x * 7 + d.y * 13))) % 3) as 0 | 1 | 2;
          drawPixelCactus(ctx, 0, 0, this.time, varIdx, 1.25);
          break;
        }
        case "skull": {
          // Pixel Animal Skull
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(-6, 3, 12, 3);
          ctx.fillStyle = "#fef3c7";
          ctx.fillRect(-6, -6, 12, 10);
          ctx.fillRect(-4, 4, 8, 4);
          ctx.fillStyle = "#451a03";
          ctx.fillRect(-4, -2, 3, 3);
          ctx.fillRect(1, -2, 3, 3);
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 1;
          ctx.strokeRect(-6, -6, 12, 10);
          break;
        }
        case "rock": {
          // Pixel Boulders
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(-10, 4, 20, 4);
          ctx.fillStyle = "#78716c";
          ctx.fillRect(-10, -6, 12, 10);
          ctx.fillRect(0, -4, 10, 8);
          ctx.fillStyle = "#a8a29e";
          ctx.fillRect(-8, -5, 6, 2);
          ctx.fillRect(2, -3, 5, 2);
          ctx.strokeStyle = "#292524";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-10, -6, 12, 10);
          ctx.strokeRect(0, -4, 10, 8);
          break;
        }
        case "ice_crystal": {
          // Pixel Ice Crystal Cluster
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(-8, 4, 16, 3);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(-3, -16, 6, 20);
          ctx.fillRect(-9, -8, 6, 12);
          ctx.fillRect(3, -10, 6, 14);
          ctx.fillStyle = "#e0f2fe";
          ctx.fillRect(-2, -14, 2, 16);
          ctx.fillRect(-8, -6, 2, 8);
          ctx.fillRect(4, -8, 2, 10);
          ctx.strokeStyle = "#0284c7";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-3, -16, 6, 20);
          break;
        }
        case "snow_drift": {
          drawPixelSnowDrift(ctx, 0, 0, Math.max(1, Math.round(1.8 * d.scale)));
          break;
        }
        case "glowing_mushroom": {
          // Pixel Bioluminescent Mushroom
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(-4, 4, 8, 3);
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(-2, -4, 4, 8);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(-8, -10, 16, 6);
          ctx.fillRect(-6, -12, 12, 3);
          ctx.fillStyle = "#86efac";
          ctx.fillRect(-6, -9, 3, 2);
          ctx.fillRect(2, -9, 3, 2);
          ctx.strokeStyle = "#14532d";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-8, -10, 16, 6);
          break;
        }
        case "stone_tile": {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(-16, -12, 32, 24);
          ctx.fillStyle = "rgba(100,116,139,0.35)";
          ctx.fillRect(-15, -11, 30, 22);
          ctx.strokeStyle = "rgba(148,163,184,0.5)";
          ctx.lineWidth = 1;
          ctx.strokeRect(-15, -11, 30, 22);
          // Pixel moss specks
          ctx.fillStyle = "#15803d";
          ctx.fillRect(-10, -6, 4, 3);
          ctx.fillRect(8, 3, 5, 4);
          break;
        }
        case "cable": {
          // Pixel Data Cable
          ctx.strokeStyle = "rgba(0,240,255,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(-18, -6, 36, 12);
          ctx.fillStyle = "#00f0ff";
          ctx.fillRect(-4, -4, 8, 8);
          break;
        }
        case "neon_arrow": {
          // Pixel Neon Arrow
          ctx.fillStyle = "#f43f5e";
          ctx.fillRect(-10, -4, 12, 8);
          ctx.fillRect(2, -8, 6, 16);
          ctx.fillRect(8, -4, 4, 8);
          ctx.strokeStyle = "#881337";
          ctx.lineWidth = 1;
          ctx.strokeRect(-10, -4, 12, 8);
          break;
        }
        case "crack": {
          // Pixel Ground Cracks
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(-14, -8, 6, 2);
          ctx.fillRect(-8, -6, 4, 4);
          ctx.fillRect(-4, -2, 6, 3);
          ctx.fillRect(2, 1, 6, 3);
          ctx.fillRect(8, 4, 6, 2);
          break;
        }
        default: {
          break;
        }
      }
      ctx.restore();
    }
  }

  /** Is (x,y) within the camera viewport (plus margin)? Used to skip drawing\n   *  entities that are fully off-screen (cheap perf win when the world is large\n   *  but the viewport is small). */
  private inView(x: number, y: number, margin = 0): boolean {
    return (
      x >= this.camX - margin &&
      x <= this.camX + this.W + margin &&
      y >= this.camY - margin &&
      y <= this.camY + this.H + margin
    );
  }

  /** Returns a radial gradient centred at the origin with radius `r`, cached by
   *  `key`. Because gradient coordinates are resolved in the user space at paint
   *  time, callers should `ctx.translate(x, y)` before using it to position the
   *  glow anywhere — so the cached object is reusable across every instance. */
  private radialGlow(ctx: CanvasRenderingContext2D, r: number, key: string, stops: [number, string][]): CanvasGradient {
    const cached = this.glowCache.get(key);
    if (cached) return cached;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    this.glowCache.set(key, g);
    return g;
  }

  /** Draw a cached radial glow as a filled disc at world (x, y). `alpha` fades
   *  time-varying glows without rebuilding the gradient. */
  private fillGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, key: string, stops: [number, string][], alpha = 1) {
    const g = this.radialGlow(ctx, r, key, stops);
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Build (and cache) the static background layer (scene gradient + vignette)
   *  into an offscreen canvas. Avoids two fullscreen gradient fills every frame. */
  private getBgCache(): HTMLCanvasElement | null {
    const t = this.sceneTheme;
    const key = `${this.W}x${this.H}|${t.bgTop}|${t.bgBottom}`;
    if (this.bgCache && this.bgCacheKey === key) return this.bgCache;
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = Math.max(1, this.W);
    c.height = Math.max(1, this.H);
    const b = c.getContext("2d");
    if (!b) return null;
    const bg = b.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, t.bgTop);
    bg.addColorStop(1, t.bgBottom);
    b.fillStyle = bg;
    b.fillRect(0, 0, this.W, this.H);
    const vg = b.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.85);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    b.fillStyle = vg;
    b.fillRect(0, 0, this.W, this.H);
    this.bgCache = c;
    this.bgCacheKey = key;
    return c;
  }

  private drawDeployables(ctx: CanvasRenderingContext2D) {
    for (const d of this.deployables) {
      if (!this.inView(d.x, d.y, d.size + 40)) continue;
      ctx.save();
      const dx = Math.round(d.x);
      const dy = Math.round(d.y);
      ctx.translate(dx, dy);
      // shadow (pixel box)
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(-Math.round(d.size * 0.8), Math.round(d.size * 0.5), Math.round(d.size * 1.6), 4);

      // range indicator for turrets (stepped pixel dashed diamond)
      if (d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "turret_sniper") {
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const dr = Math.round(d.radius);
        ctx.strokeRect(-dr, -dr, dr * 2, dr * 2);
        ctx.setLineDash([]);
      }

      if (d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "turret_sniper") {
        ctx.rotate(d.angle + Math.PI / 2);
        ctx.scale(1.5, 1.5);
        drawGadgetModel(ctx, d.kind, d.color, this.time);
      } else if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire" || d.kind === "mine_stun") {
        // Mine blink animation
        const blink = d.armed <= 0 ? (Math.floor(this.time * 4) % 2 === 0 ? 1 : 0.4) : 0.5;
        const colorWithBlink = rgba(d.color, blink);
        ctx.scale(1.2, 1.2);
        drawGadgetModel(ctx, d.kind, colorWithBlink, this.time);

        // Pulse ring when armed (stepped pixel diamond)
        if (d.armed <= 0) {
          ctx.strokeStyle = rgba(d.color, 0.35);
          ctx.lineWidth = 1.5;
          const pr = Math.round(8 + (this.time * 20) % 16);
          ctx.strokeRect(-pr, -pr, pr * 2, pr * 2);
        }
      } else if (d.kind === "healing_station") {
        // Range indicator
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const dr = Math.round(d.radius);
        ctx.strokeRect(-dr, -dr, dr * 2, dr * 2);
        ctx.setLineDash([]);
        // Pulsing pixel aura
        const pulse = 0.5 + Math.sin(this.time * 3) * 0.2;
        const hsz = Math.round(d.size * 1.5 * pulse);
        ctx.fillStyle = rgba(d.color, 0.15);
        ctx.fillRect(-hsz, -hsz, hsz * 2, hsz * 2);

        // Render station model
        ctx.scale(1.2, 1.2);
        drawGadgetModel(ctx, d.kind, d.color, this.time);
      }
      ctx.restore();

      // hp bar for turrets & healing station
      if ((d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "turret_sniper" || d.kind === "healing_station") && d.hp < d.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28, 4);
        ctx.fillStyle = rgba(d.color, 0.9);
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28 * (d.hp / d.maxHp), 4);
      }
    }
  }

  private drawFieldEffects(ctx: CanvasRenderingContext2D) {
    for (const e of this.effects) {
      if (!this.inView(e.x, e.y, e.radius + 20)) continue;
      if (e.type === "poisoncloud") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const er = Math.round(e.radius);
        const ex = Math.round(e.x);
        const ey = Math.round(e.y);
        // Stepped toxic cloud pixel clusters
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.time * 0.4;
          const dist = (0.2 + ((i * 3) % 5) * 0.15) * er;
          const bx = Math.round(ex + Math.cos(a) * dist);
          const by = Math.round(ey + Math.sin(a) * dist);
          const sz = Math.max(4, Math.round(er * 0.45));
          ctx.fillStyle = rgba(e.color, 0.18 * k);
          ctx.fillRect(bx - sz / 2, by - sz / 2, sz, sz);
        }
        // Floating pixel bubbles
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.time * 1.5;
          const bubX = Math.round(ex + Math.cos(a) * er * 0.55);
          const bubY = Math.round(ey + Math.sin(a) * er * 0.55 - (this.time * 24 + i * 8) % er);
          ctx.fillStyle = rgba("#a3e635", 0.7 * k);
          ctx.fillRect(bubX - 2, bubY - 2, 4, 4);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(bubX - 1, bubY - 1, 2, 2);
        }
        ctx.restore();
      } else if (e.type === "firefield") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const er = Math.round(e.radius);
        const ex = Math.round(ex);
        const ey = Math.round(ey);
        // Ground ember pixel patches
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + this.time * 0.6;
          const dist = (0.15 + ((i * 4) % 6) * 0.14) * er;
          const fx = Math.round(ex + Math.cos(a) * dist);
          const fy = Math.round(ey + Math.sin(a) * dist);
          const sz = Math.max(4, Math.round(er * 0.4));
          ctx.fillStyle = rgba(i % 2 === 0 ? "#f97316" : "#facc15", 0.22 * k);
          ctx.fillRect(fx - sz / 2, fy - sz / 2, sz, sz);
        }
        // Rising pixel flame embers
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const embX = Math.round(ex + Math.cos(a) * er * 0.5 + Math.sin(this.time * 8 + i) * 6);
          const embY = Math.round(ey + Math.sin(a) * er * 0.35 - (this.time * 36 + i * 10) % (er * 0.8));
          ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#ef4444";
          ctx.fillRect(embX - 1, embY - 1, 3, 3);
        }
        ctx.restore();
      }
    }
  }

  private drawBase(ctx: CanvasRenderingContext2D, b: Base, mine: boolean) {
    const isEnemy = !mine;
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    const frac = b.hp / b.maxHp;
    const col = isEnemy
      ? (frac > 0.5 ? "#f87171" : frac > 0.25 ? "#fb923c" : "#ef4444")
      : (frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#f87171");

    // 1. Outer Pixel Defense Orbit (Stepped pixel dash ring)
    ctx.save();
    const rot = Math.floor((b.t * 30) % 360) * (Math.PI / 180);
    ctx.rotate(rot);
    const orbitR = Math.round(b.radius + 18);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.round(Math.cos(a) * orbitR);
      const py = Math.round(Math.sin(a) * orbitR);
      ctx.fillStyle = rgba(mine ? "#38bdf8" : "#f87171", 0.55);
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
    ctx.restore();

    // 2. Base HP Bar (Segmented pixel ring)
    const numSegs = 16;
    const filledSegs = Math.round(frac * numSegs);
    for (let i = 0; i < numSegs; i++) {
      const a = -Math.PI / 2 + (i / numSegs) * Math.PI * 2;
      const segR = Math.round(b.radius + 9);
      const sx = Math.round(Math.cos(a) * segR);
      const sy = Math.round(Math.sin(a) * segR);
      ctx.fillStyle = i < filledSegs ? col : "rgba(0,0,0,0.5)";
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }

    // 3. Central 16-Bit Pixel Crystal/Core (Stepped Octagon)
    const r = Math.round(b.radius);
    ctx.fillStyle = b.flash > 0 ? "#ffffff" : col;
    ctx.beginPath();
    const step = Math.round(r * 0.35);
    ctx.moveTo(-r + step, -r);
    ctx.lineTo(r - step, -r);
    ctx.lineTo(r, -r + step);
    ctx.lineTo(r, r - step);
    ctx.lineTo(r - step, r);
    ctx.lineTo(-r + step, r);
    ctx.lineTo(-r, r - step);
    ctx.lineTo(-r, -r + step);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,15,30,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top/left pixel facet highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(-r + step + 2, -r + 2, (r - step) * 2 - 4, 3);
    ctx.fillRect(-r + 2, -r + step + 2, 3, (r - step) * 2 - 4);

    // Inner rotating pixel gem
    ctx.save();
    ctx.rotate(-rot * 1.5);
    ctx.fillStyle = "#ffffff";
    const innerSz = Math.max(4, Math.round(r * 0.3));
    ctx.fillRect(-innerSz / 2, -innerSz / 2, innerSz, innerSz);
    ctx.restore();

    // on-map label so it's unambiguous which base is yours
    ctx.fillStyle = mine ? "#bae6fd" : "#fecaca";
    ctx.font = "bold 12px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mine ? "【己方基地】" : "【敌方基地】", 0, b.radius + 36);

    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const pk of this.pickups) {
      if (!this.inView(pk.x, pk.y, 30)) continue;
      const px = Math.round(pk.x);
      const py = Math.round(pk.y + Math.sin(pk.bob) * 3);
      const blink = pk.life < 3 && Math.floor(pk.life * 6) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(px, py);

      // Pixel shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(-7, 9, 14, 3);

      // 16-bit First Aid Kit Body
      ctx.fillStyle = "#09090b";
      ctx.fillRect(-8, -7, 16, 14);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-7, -6, 14, 12);

      // Green medical cross
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(-2, -4, 4, 8);
      ctx.fillRect(-4, -2, 8, 4);

      // Top handle
      ctx.fillStyle = "#334155";
      ctx.fillRect(-3, -9, 6, 2);

      // Highlight pixel
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-6, -5, 2, 2);

      // Blinking sparkle star
      const spark = Math.floor(this.time * 4) % 4;
      if (spark === 0) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(8, -8, 2, 2);
      } else if (spark === 2) {
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(-9, -6, 2, 2);
      }

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (!this.inView(p.x, p.y, p.size + 6)) continue;
      const a = Math.max(0, p.life / p.maxLife);
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      if (p.coin) {
        // 16-bit stepped spinning pixel gold coin
        const flightA = Math.min(1, Math.max(0, p.life / 0.3));
        const rotPhase = Math.floor((Math.abs(p.spin ?? 0) * 4)) % 4;
        const cw = rotPhase === 0 || rotPhase === 2 ? 6 : rotPhase === 1 ? 4 : 2;
        const ch = 6;
        ctx.fillStyle = rgba("#78350f", flightA);
        ctx.fillRect(px - Math.round(cw / 2) - 1, py - Math.round(ch / 2) - 1, cw + 2, ch + 2);
        ctx.fillStyle = rgba(p.color || "#facc15", flightA);
        ctx.fillRect(px - Math.round(cw / 2), py - Math.round(ch / 2), cw, ch);
        if (cw >= 4) {
          ctx.fillStyle = rgba("#ffffff", flightA * 0.8);
          ctx.fillRect(px - Math.round(cw / 2) + 1, py - Math.round(ch / 2) + 1, 1, 2);
        }
      } else {
        const rawSz = p.shrink ? p.size * a : p.size;
        const sz = Math.max(2, Math.round(rawSz));
        ctx.fillStyle = rgba(p.color, a * 0.9);
        ctx.fillRect(px - Math.round(sz / 2), py - Math.round(sz / 2), sz, sz);
      }
    }
    ctx.restore();
  }

  private drawGrenades(ctx: CanvasRenderingContext2D) {
    for (const gr of this.grenades) {
      if (!this.inView(gr.x, gr.y, 20)) continue;
      ctx.save();
      ctx.translate(gr.x, gr.y);
      const color = gr.kind === "fire" ? "#f97316" : gr.kind === "glue" ? "#06b6d4" : gr.kind === "poison" ? "#22c55e" : "#fbbf24";
      // Spinning rotation effect for throwing grenades
      ctx.rotate(this.time * 6);
      drawGadgetModel(ctx, gr.kind + "_grenade", color, this.time);
      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (!this.inView(e.x, e.y, e.size * 2.5 + 30)) continue;
      const scale = e.spawnT;
      // shadow
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.size * 0.7, e.size * 0.9, e.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // enemy glow (red aura)
      if (e.type === "elite") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        this.fillGlow(ctx, e.x, e.y, e.size * 2.5, `elite`, [[0, rgba("#fb7185", 0.25)], [1, rgba("#fb7185", 0)]]);
        ctx.restore();
      }

      // biohazard monsters get a dedicated, detailed silhouette
      if (e.behavior) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        drawMonster(ctx, {
          behavior: e.behavior,
          size: e.size,
          color: e.color,
          glow: e.glow,
          angle: e.angle,
          t: this.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          poison: (e.poisonT ?? 0) > 0,
          buffed: (e.buffT ?? 0) > 0,
          charging: (e.chargeT ?? 0) > 0,
        });
        ctx.restore();
      } else if (e.character && e.outfit) {
        // tint enemy red-ish by overriding colors
        const enemyChar: CharacterDef = {
          ...e.character,
          bodyColor: e.type === "elite" ? "#fb7185" : "#f87171",
          accent: "#dc2626",
        };
        const enemyOutfit: OutfitDef = {
          ...e.outfit,
          suit: e.type === "elite" ? "#9f1239" : "#991b1b",
          suitDark: e.type === "elite" ? "#881337" : "#7f1d1d",
          accent: "#fca5a5",
        };
        ctx.save();
        ctx.scale(scale, scale);
        drawCharacter(ctx, {
          x: e.x / scale,
          y: e.y / scale,
          angle: e.angle,
          character: enemyChar,
          outfit: enemyOutfit,
          size: e.size,
          t: this.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          gun: e.gun,
        });
        ctx.restore();
      } else {
        // fallback pixel character block
        ctx.save();
        ctx.translate(Math.round(e.x), Math.round(e.y));
        ctx.scale(scale, scale);
        const sz = Math.round(e.size);
        const body = e.hitFlash > 0.05 ? "#ffffff" : e.color;
        // Dark outline
        ctx.fillStyle = shade(e.glow, -0.4);
        ctx.fillRect(-sz - 1, -sz - 1, sz * 2 + 2, sz * 2 + 2);
        // Body
        ctx.fillStyle = body;
        ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round(sz * 0.3), -Math.round(sz * 0.3), 3, 3);
        ctx.fillRect(Math.round(sz * 0.3), Math.round(sz * 0.1), 3, 3);
        ctx.restore();
      }

      // poison cloud / slow
      if (e.slowT > 0) {
        ctx.save();
        ctx.fillStyle = rgba("#84cc16", 0.45);
        ctx.fillRect(Math.round(e.x - 4), Math.round(e.y + e.size * 0.4), 8, 3);
        ctx.restore();
      }

      // active poison damage aura
      if ((e.poisonT ?? 0) > 0) {
        ctx.save();
        ctx.fillStyle = rgba("#a3e635", 0.6);
        for (let i = 0; i < 3; i++) {
          const px = Math.round(e.x + Math.sin(this.time * 6 + i * 2) * (e.size * 0.7));
          const py = Math.round(e.y - (this.time * 15 + i * 8) % (e.size * 1.3));
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        ctx.restore();
      }

      // hp bar (enemies: red & thicker)
      if (e.hp < e.maxHp) {
        const w = Math.max(24, e.size * 2);
        const hpx = e.x - w / 2;
        const hpy = e.y - e.size - 12;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(hpx - 1, hpy - 1, w + 2, 7);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(hpx, hpy, w * (e.hp / e.maxHp), 5);
      }

      // electric arcs from a lightsaber hit
      if (e.electrifiedTime && e.electrifiedTime > 0) {
        this.drawElectricArcs(ctx, e.x, e.y, e.size, e.electrifiedGlow ?? "#38bdf8", this.time);
      }
    }
  }

  private drawEnemyBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const b of this.enemyBullets) {
      if (!this.inView(b.x, b.y, b.size * 3 + 6)) continue;
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      const sz = Math.max(4, Math.round(b.size * 1.6));
      // Outer dark pixel outline
      ctx.fillStyle = "#3b0764";
      ctx.fillRect(bx - Math.round(sz / 2) - 1, by - Math.round(sz / 2) - 1, sz + 2, sz + 2);
      // Bright enemy bullet core
      ctx.fillStyle = b.color || "#f43f5e";
      ctx.fillRect(bx - Math.round(sz / 2), by - Math.round(sz / 2), sz, sz);
      // White hot center pixel
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx - 1, by - 1, 2, 2);
    }
    ctx.restore();
  }

  private drawBeam(ctx: CanvasRenderingContext2D) {
    if (!this.beamActive || !this.beamHit) return;
    const p = this.player;
    const g = this.gun;
    const ox = Math.round(p.x + Math.cos(p.angle) * (p.size + 6));
    const oy = Math.round(p.y + Math.sin(p.angle) * (p.size + 6));
    const ex = Math.round(this.beamHit.point.x);
    const ey = Math.round(this.beamHit.point.y);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 0.8 + Math.random() * 0.2;
    // Outer colored pixel beam
    ctx.strokeStyle = rgba(g.glow, 0.6 * flick);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Inner white-hot pixel core
    ctx.strokeStyle = rgba("#ffffff", 0.95 * flick);
    ctx.lineWidth = 2;
    ctx.stroke();
    // 4-point pixel spark star at hit point
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ex - 2, ey - 2, 4, 4);
    ctx.fillStyle = rgba(g.glow, 0.85);
    ctx.fillRect(ex - 6, ey - 1, 12, 2);
    ctx.fillRect(ex - 1, ey - 6, 2, 12);
    ctx.restore();
  }

  private drawFlameCone(ctx: CanvasRenderingContext2D) {
    if (!this.flameActive) return;
    const p = this.player;
    const g = this.gun;
    const cone = g.flameCone ?? 0.4;
    const range = g.flameRange ?? 150;
    const ox = p.x + Math.cos(p.angle) * (p.size + g.barrel);
    const oy = p.y + Math.sin(p.angle) * (p.size + g.barrel);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const numP = 14;
    for (let i = 0; i < numP; i++) {
      const dist = (0.2 + (i / numP) * 0.8) * range;
      const spread = (Math.sin(this.time * 25 + i * 2.1)) * cone * (dist / range);
      const fx = Math.round(ox + Math.cos(p.angle + spread) * dist);
      const fy = Math.round(oy + Math.sin(p.angle + spread) * dist);
      const sz = Math.max(3, Math.round(4 + (dist / range) * 8));
      const col = dist < range * 0.35 ? "#ffffff" : dist < range * 0.7 ? "#fde047" : "#ea580c";
      ctx.fillStyle = rgba(col, 0.75 - (dist / range) * 0.35);
      ctx.fillRect(fx - Math.round(sz / 2), fy - Math.round(sz / 2), sz, sz);
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (p.shieldTime > 0) {
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      const pulse = 1 + Math.sin(this.time * 8) * 0.04;
      const rr = Math.round(p.size * 1.8 * pulse);
      const alpha = Math.min(1, p.shieldTime / 0.6) * 0.7;
      // 16-bit Stepped Pixel Forcefield Octagon Nodes
      ctx.fillStyle = rgba("#60a5fa", alpha);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const nx = Math.round(Math.cos(a) * rr);
        const ny = Math.round(Math.sin(a) * rr);
        ctx.fillRect(nx - 2, ny - 2, 4, 4);
      }
      // 4 rotating corner pixel nodes
      for (let i = 0; i < 4; i++) {
        const a = this.time * 3 + (i * Math.PI) / 2;
        const nx = Math.round(Math.cos(a) * (rr + 4));
        const ny = Math.round(Math.sin(a) * (rr + 4));
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(nx - 2, ny - 2, 4, 4);
      }
      ctx.restore();
    }

    // riot shield raised visual
    if (p.shieldBlockTime > 0 && this.gun.weaponClass === "shield") {
      const arc = this.gun.shieldArc ?? 0.7;
      const sr = Math.round(p.size + 18);
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.angle);
      // Stepped chunky pixel barrier
      ctx.fillStyle = "rgba(59,130,246,0.3)";
      ctx.fillRect(sr - 4, -Math.round(sr * arc), 8, Math.round(sr * arc * 2));
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2;
      ctx.strokeRect(sr - 4, -Math.round(sr * arc), 8, Math.round(sr * arc * 2));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sr - 2, -Math.round(sr * arc) + 2, 4, Math.round(sr * arc * 2) - 4);
      ctx.restore();
    }

    // bow draw visual — string pulled back
    if (p.bowDrawing && this.gun.weaponClass === "bow") {
      const maxT = this.gun.maxChargeTime ?? 1.2;
      const pct = Math.min(1, p.bowCharge / maxT);
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.angle);
      ctx.strokeStyle = rgba(this.gun.glow, 0.7 * pct);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.size + 4, -8);
      ctx.lineTo(p.size + 4 - pct * 10, 0);
      ctx.lineTo(p.size + 4, 8);
      ctx.stroke();
      // charge spark pixel
      if (pct > 0.1) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(p.size + 2, -2, 4, 4);
        ctx.fillStyle = this.gun.glow;
        ctx.fillRect(p.size, -1, 8, 2);
      }
      ctx.restore();
    }

    // thrust longsword: dash distance + hit-range indicator + charge status while charging
    this.drawThrustSwordChargeIndicator(ctx, p);

    const glow =
      p.overdriveTime > 0
        ? "#fbbf24"
        : p.dashTime > 0
        ? "#22d3ee"
        : undefined;

    // melee swing progress 0..1
    const swing = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDur : 0;

    drawCharacter(ctx, {
      x: p.x,
      y: p.y,
      angle: p.angle,
      character: this.character,
      outfit: this.outfit,
      size: p.size,
      t: p.t,
      flash: p.flash > 0 ? Math.min(1, p.flash) : 0,
      glow,
      gun: this.gun,
      gadget: this.selectedGadget >= 0 ? this.gadgets[this.selectedGadget] : undefined,
      meleeSwing: swing,
      lunge: p.lunge,
      thrustCharging: p.thrustCharging,
      thrustCharge: p.thrustCharge,
      isCloaked: p.isCloaked,
      cloakAlpha: 0.15,
    });

    // electric arcs from a lightsaber hit
    if (p.electrifiedTime && p.electrifiedTime > 0) {
      this.drawElectricArcs(ctx, p.x, p.y, p.size, p.electrifiedGlow ?? "#38bdf8", this.time);
    }

    if (p.iframes > 0 && p.dashTime <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 20) * 0.2;
      ctx.fillStyle = "#e0f2fe";
      for (let i = 0; i < 4; i++) {
        const a = this.time * 4 + (i * Math.PI) / 2;
        const nx = Math.round(p.x + Math.cos(a) * (p.size + 4));
        const ny = Math.round(p.y + Math.sin(a) * (p.size + 4));
        ctx.fillRect(nx - 1, ny - 1, 3, 3);
      }
      ctx.restore();
    }
  }

  private drawThrustSwordChargeIndicator(ctx: CanvasRenderingContext2D, p: Player) {
    if (this.gun.id !== "thrust_sword" || !p.thrustCharging) return;
    const g = this.gun;
    const dist = g.chargeDashDist ?? 200;
    const rng = g.chargeDashRange ?? 34;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 12);
    const charge = p.thrustCharge ?? 0;
    const minCharge = g.chargeMin ?? 0.5;
    const pct = Math.min(1, charge / minCharge);
    const isReady = pct >= 1;

    // 1. Draw dash range corridors in world coordinates
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    // hit corridor (width = 2 * range) along the aim direction
    ctx.fillStyle = rgba(g.glow, 0.12 + 0.06 * pulse);
    ctx.fillRect(0, -rng, dist, rng * 2);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.85 : 0.45);
    ctx.lineWidth = isReady ? 2.0 : 1.2;
    ctx.strokeRect(0, -rng, dist, rng * 2);
    ctx.setLineDash([]);
    
    // center guide line (the dash trajectory)
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.95 : 0.65);
    ctx.lineWidth = isReady ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dist, 0);
    ctx.stroke();
    
    // endpoint hit marker (stepped pixel diamond)
    ctx.fillStyle = rgba(g.glow, 0.18 + 0.1 * pulse);
    const or = Math.round(rng);
    ctx.fillRect(dist - or, -or, or * 2, or * 2);
    ctx.strokeStyle = rgba(g.glow, isReady ? 0.95 : 0.65);
    ctx.lineWidth = isReady ? 2.0 : 1.2;
    ctx.strokeRect(dist - or, -or, or * 2, or * 2);
    
    // arrowhead marking the dash endpoint (pixel block arrow)
    ctx.fillStyle = rgba(g.glow, isReady ? 1.0 : 0.7);
    ctx.fillRect(dist + 2, -2, 6, 4);
    ctx.fillRect(dist + 8, -4, 4, 8);
    ctx.fillRect(dist + 12, -2, 3, 4);
    
    ctx.restore();

    // 2. Draw charge status bar above player's head
    ctx.save();
    const barW = 44;
    const barH = 6;
    const bx = Math.round(p.x - barW / 2);
    const by = Math.round(p.y - p.size - 26); // above the head
    
    // Background bar
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    
    // Filled bar
    ctx.fillStyle = isReady ? "#22c55e" : "#eab308"; // green if ready, yellow if charging
    ctx.fillRect(bx, by, Math.round(barW * pct), barH);
    
    // Border
    ctx.strokeStyle = isReady ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
    
    // Text label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(isReady ? "RELEASE TO DASH" : "CHARGING", p.x, by - 4);
    ctx.restore();
  }

  /** Stepped pixel ring used for explosive coin-bursts. */
  private drawJaggedRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
    lw: number
  ) {
    const ir = Math.round(r);
    const ix = Math.round(x);
    const iy = Math.round(y);
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = Math.max(2, Math.round(lw));
    ctx.strokeRect(ix - ir, iy - ir, ir * 2, ir * 2);
  }

  /** A single animated, 16-bit stepped pixel lightning bolt drawn along +x from the origin. */
  private drawBolt(
    ctx: CanvasRenderingContext2D,
    len: number,
    lateral: number,
    color: string,
    core: string,
    life: number,
    seed: number
  ) {
    const segs = 6;
    const jag = (1 - life) * 10 + 2;
    const tip = lateral + Math.sin(this.time * 24 + seed) * 6 * (1 - life);
    const yAt = (f: number) =>
      lateral * (1 - f) +
      tip * f +
      Math.sin(f * 8 + this.time * 20 + seed) * jag * Math.sin(f * Math.PI);
    
    for (let i = 0; i < segs; i++) {
      const f0 = i / segs;
      const f1 = (i + 1) / segs;
      const x0 = Math.round(len * f0);
      const y0 = Math.round(yAt(f0));
      const x1 = Math.round(len * f1);
      const y1 = Math.round(yAt(f1));

      // Outer colored pixel step
      ctx.fillStyle = rgba(color, (1 - life) * 0.8);
      ctx.fillRect(x0, Math.min(y0, y1) - 1, Math.max(3, x1 - x0), Math.abs(y1 - y0) + 3);
      // Inner white core pixel
      ctx.fillStyle = rgba(core, (1 - life) * 0.95);
      ctx.fillRect(x0 + 1, Math.min(y0, y1), Math.max(1, x1 - x0 - 2), Math.abs(y1 - y0) + 1);
    }
  }

  /** Resolve the current world position of a projectile's owner (for returning boomerangs). */
  private ownerPos(b: Bullet): { x: number; y: number } {
    if (this.combatants.length > 0) {
      const c = this.combatants.find((c) => c.cid === b.ownerId);
      if (c && c.player) return { x: c.player.x, y: c.player.y };
    }
    if (b.owner === "foe" && this.foe) return { x: this.foe.x, y: this.foe.y };
    return { x: this.player.x, y: this.player.y };
  }

  private drawBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const b of this.bullets) {
      if (!this.inView(b.x, b.y - (b.z ?? 0), b.size * 3.4 + 6)) continue;
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      const bz = Math.round(b.z ?? 0);

      if (bz > 1) {
        // Pixel ground shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(bx - 3, by - 1, 6, 3);
        // Raised mortar/grenade projectile (Chunky 6x6 pixel shell)
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(bx - 3, by - bz - 3, 6, 6);
        ctx.fillStyle = b.color;
        ctx.fillRect(bx - 2, by - bz - 2, 4, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx - 1, by - bz - 1, 2, 2);
        continue;
      }
      if (b.kind === "boomerang") {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(this.time * 12);
        // Chunky Wooden Boomerang
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillStyle = b.color;
        ctx.fillRect(-4, -1, 8, 2);
        ctx.fillRect(-1, -4, 2, 8);
        ctx.restore();
        continue;
      }
      if (b.kind === "knife") {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        // Chunky Throwing Knife
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(-2, -1, 8, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -1, 4, 1);
        ctx.restore();
        continue;
      }

      // Standard / Laser / Rapid pixel projectile
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      const bw = Math.max(5, Math.round(b.size * 2.2));
      const bh = Math.max(3, Math.round(b.size * 1.3));
      // Outer dark pixel outline
      ctx.fillStyle = "#09090b";
      ctx.fillRect(Math.round(-bw / 2) - 1, Math.round(-bh / 2) - 1, bw + 2, bh + 2);
      // Bright bullet body
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(-bw / 2), Math.round(-bh / 2), bw, bh);
      // White hot core pixel strip
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(-bw / 2) + 1, Math.round(-bh / 2) + 1, Math.max(2, bw - 2), Math.max(1, bh - 2));
      ctx.restore();
    }
    ctx.restore();
  }

  /** Crackling 16-bit pixel electric arcs that cling to an electrified avatar/enemy. */
  private drawElectricArcs(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    time: number
  ) {
    ctx.save();
    const ix = Math.round(x);
    const iy = Math.round(y);
    ctx.translate(ix, iy);
    ctx.globalCompositeOperation = "lighter";
    const bolts = 4;
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * Math.PI * 2 + time * 6;
      const rad = Math.round(r * 1.1 + Math.sin(time * 12 + i) * 3);
      const px = Math.round(Math.cos(a) * rad);
      const py = Math.round(Math.sin(a) * rad);
      // Outer colored pixel spark
      ctx.fillStyle = rgba(color, 0.85);
      ctx.fillRect(px - 2, py - 2, 4, 4);
      // White hot center pixel
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    // Charged stepped pixel diamond
    const dr = Math.round(r * 1.2);
    ctx.strokeStyle = rgba(color, 0.5);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-dr, -dr, dr * 2, dr * 2);
    ctx.restore();
  }

  private drawWeather(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Draw pixel raindrops / snowflakes / dust
    if (this.raindrops.length > 0) {
      if (this.weather === "rain") {
        ctx.fillStyle = "rgba(180, 210, 240, 0.65)";
        for (const r of this.raindrops) {
          ctx.fillRect(Math.round(r.x), Math.round(r.y), 2, 5);
        }
      } else if (this.weather === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        for (const r of this.raindrops) {
          ctx.fillRect(Math.round(r.x), Math.round(r.y), 3, 3);
        }
      } else if (this.weather === "sandstorm") {
        ctx.fillStyle = "rgba(234, 179, 8, 0.65)";
        for (const r of this.raindrops) {
          ctx.fillRect(Math.round(r.x), Math.round(r.y), 3, 2);
        }
      }
    }
    
    // Global tint / overlays
    ctx.globalCompositeOperation = "source-over";
    
    // Time of day tint
    if (this.timeOfDay === "morning") {
      ctx.fillStyle = "rgba(255, 240, 200, 0.08)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.timeOfDay === "afternoon") {
      ctx.fillStyle = "rgba(255, 180, 100, 0.04)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.timeOfDay === "night") {
      ctx.fillStyle = "rgba(10, 15, 35, 0.35)";
      ctx.fillRect(0, 0, this.W, this.H);
    }
    
    // Weather overlay
    if (this.weather === "fog") {
      ctx.fillStyle = "rgba(200, 210, 220, 0.25)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.weather === "overcast") {
      ctx.fillStyle = "rgba(120, 130, 140, 0.15)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.weather === "rain") {
      ctx.fillStyle = "rgba(90, 100, 110, 0.2)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.weather === "snow") {
      ctx.fillStyle = "rgba(220, 240, 255, 0.15)";
      ctx.fillRect(0, 0, this.W, this.H);
    } else if (this.weather === "sandstorm") {
      ctx.fillStyle = "rgba(180, 130, 70, 0.35)";
      ctx.fillRect(0, 0, this.W, this.H);
    }
    
    ctx.restore();
  }

  private drawMeleeTrails(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const trail of this.meleeTrails) {
      const alpha = Math.max(0, trail.life / trail.maxLife);
      if (trail.weapon === "thrust_sword" && trail.length) {
        ctx.fillStyle = rgba("#f472b6", alpha * 0.9);
        const tx = Math.round(trail.x);
        const ty = Math.round(trail.y);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(trail.angle);
        ctx.fillRect(0, -4, Math.round(trail.length), 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, -1, Math.round(trail.length), 2);
        ctx.restore();
      } else if (trail.arc && trail.range) {
        const tx = Math.round(trail.x);
        const ty = Math.round(trail.y);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(trail.angle);
        const numSteps = 6;
        for (let i = 0; i < numSteps; i++) {
          const stepA = -trail.arc + (i / numSteps) * (trail.arc * 2);
          const px = Math.round(Math.cos(stepA) * trail.range * 0.9);
          const py = Math.round(Math.sin(stepA) * trail.range * 0.9);
          ctx.fillStyle = rgba(trail.weapon === "lightsaber" ? "#38bdf8" : "#ffffff", alpha * 0.7);
          ctx.fillRect(px - 3, py - 3, 6, 6);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawEffects(ctx: CanvasRenderingContext2D, list: Effect[] = this.effects) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of list) {
      if (!this.inView(e.x, e.y, (e.radius ?? 40) + 40)) continue;
      const k = e.t / e.duration;
      const ex = Math.round(e.x);
      const ey = Math.round(e.y);

      if (e.type === "explosion") {
        const r = Math.round(e.radius * (0.35 + k * 0.85));
        const alpha = Math.max(0, 1 - k);
        // 1. 16-bit Expanding Multi-Tier Pixel Explosion Cluster
        // Core white-hot pixel block
        const coreSz = Math.max(4, Math.round(r * (0.5 - k * 0.3)));
        ctx.fillStyle = rgba("#ffffff", alpha);
        ctx.fillRect(ex - Math.round(coreSz / 2), ey - Math.round(coreSz / 2), coreSz, coreSz);

        // Mid fireball pixel squares (8-direction cluster)
        const numP = 8;
        for (let i = 0; i < numP; i++) {
          const a = (i / numP) * Math.PI * 2 + k * 1.5;
          const dist = Math.round(r * 0.6 * (0.4 + k * 0.6));
          const px = Math.round(ex + Math.cos(a) * dist);
          const py = Math.round(ey + Math.sin(a) * dist);
          const bSz = Math.max(3, Math.round(r * 0.35 * (1 - k * 0.5)));
          ctx.fillStyle = rgba(i % 2 === 0 ? "#fde047" : (e.color || "#f97316"), alpha * 0.85);
          ctx.fillRect(px - Math.round(bSz / 2), py - Math.round(bSz / 2), bSz, bSz);
        }

        // Outer flying spark pixels
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + i * 1.2;
          const dist = Math.round(r * 0.95);
          const spkX = Math.round(ex + Math.cos(a) * dist);
          const spkY = Math.round(ey + Math.sin(a) * dist);
          ctx.fillStyle = rgba("#fef08a", alpha * 0.9);
          ctx.fillRect(spkX - 1, spkY - 1, 3, 3);
        }
      } else if (e.type === "shock") {
        const r = Math.round(e.radius * (0.4 + k * 0.8));
        const alpha = Math.max(0, (1 - k) * 0.85);
        ctx.strokeStyle = rgba(e.color, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
        // 4 corner bracket pixels
        ctx.fillStyle = rgba("#ffffff", alpha);
        ctx.fillRect(ex - r - 1, ey - r - 1, 3, 3);
        ctx.fillRect(ex + r - 2, ey - r - 1, 3, 3);
        ctx.fillRect(ex - r - 1, ey + r - 2, 3, 3);
        ctx.fillRect(ex + r - 2, ey + r - 2, 3, 3);
      } else if (e.type === "spawn") {
        const r = Math.round(e.radius * k);
        const alpha = Math.max(0, (1 - k) * 0.85);
        ctx.strokeStyle = rgba(e.color, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
        // Vertical spawn scanlines
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = rgba("#ffffff", alpha * 0.7);
          ctx.fillRect(ex + i * 4, ey - r, 2, r * 2);
        }
      } else if (e.type === "debris") {
        const dist = Math.round(e.radius * (0.3 + k * 0.7));
        const alpha = Math.max(0, (1 - k) * 0.75);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k * 4;
          const px = Math.round(ex + Math.cos(a) * dist);
          const py = Math.round(ey + Math.sin(a) * dist);
          ctx.fillStyle = rgba(e.color, alpha);
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      } else if (e.type === "coinburst") {
        const r = Math.round(e.radius * (0.3 + k * 1.1));
        const alpha = Math.max(0, (1 - k) * 0.95);
        const style = e.style ?? "bullet";
        const c1 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[0];
        const c2 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[1] ?? "#fbbf24";
        // Expanding pixel shock square
        ctx.strokeStyle = rgba(c1, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
        // Center flash pixel block
        ctx.fillStyle = rgba("#ffffff", alpha * 0.6);
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
        // Bursting coin sparks
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k * 2;
          const cx = Math.round(ex + Math.cos(a) * r * 0.85);
          const cy = Math.round(ey + Math.sin(a) * r * 0.85);
          ctx.fillStyle = rgba(c2, alpha);
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
        }
      } else if (e.type === "slash") {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(e.angle ?? 0);
        const arc = e.arc ?? 2;
        const range = Math.round(e.range ?? 60);
        const alpha = Math.max(0, 1 - k);
        // 16-bit Stepped Pixel Crescent Slash
        const numSteps = 8;
        for (let i = 0; i < numSteps; i++) {
          const a = -arc / 2 + (i / numSteps) * arc;
          const rDist = Math.round(range * (0.7 + k * 0.3));
          const px = Math.round(Math.cos(a) * rDist);
          const py = Math.round(Math.sin(a) * rDist);
          // Colored blade body pixel block
          ctx.fillStyle = rgba(e.color, alpha * 0.85);
          ctx.fillRect(px - 3, py - 3, 6, 6);
          // Bright white cutting edge
          ctx.fillStyle = rgba("#ffffff", alpha * 0.95);
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        ctx.restore();
      } else if (e.type === "dual_slash") {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const comboStep = parseInt(e.style ?? "1", 10);
        const swingDir = e.dirX ?? 1;
        const arc = e.arc ?? 2.0;
        const range = Math.round(e.range ?? 78);
        const alpha = Math.max(0, 1 - k);

        if (comboStep === 5) {
          // Double crossing slash finisher (X shape pixel blocks)
          const numSteps = 10;
          for (let i = 0; i < numSteps; i++) {
            const f = (i / numSteps) * 2 - 1;
            const px1 = Math.round(f * range * 0.8);
            const py1 = Math.round(f * range * 0.5);
            const px2 = Math.round(f * range * 0.8);
            const py2 = Math.round(-f * range * 0.5);

            ctx.fillStyle = rgba(e.color, alpha * 0.85);
            ctx.fillRect(px1 - 3, py1 - 3, 6, 6);
            ctx.fillRect(px2 - 3, py2 - 3, 6, 6);
            ctx.fillStyle = rgba("#ffffff", alpha * 0.95);
            ctx.fillRect(px1 - 1, py1 - 1, 3, 3);
            ctx.fillRect(px2 - 1, py2 - 1, 3, 3);
          }
          // Center burst spark
          ctx.fillStyle = rgba("#ffffff", alpha);
          ctx.fillRect(-4, -4, 8, 8);
        } else {
          // Stepped arcade pixel slash arc
          const numSteps = 8;
          for (let i = 0; i < numSteps; i++) {
            const a = swingDir === 1 ? -arc / 2 + (i / numSteps) * arc : arc / 2 - (i / numSteps) * arc;
            const rDist = Math.round(range * (0.8 + 0.15 * Math.sin(k * Math.PI)));
            const px = Math.round(Math.cos(a) * rDist);
            const py = Math.round(Math.sin(a) * rDist);
            ctx.fillStyle = rgba(e.color, alpha * 0.85);
            ctx.fillRect(px - 3, py - 3, 6, 6);
            ctx.fillStyle = rgba("#ffffff", alpha * 0.95);
            ctx.fillRect(px - 1, py - 1, 3, 3);
          }
        }
        ctx.restore();
      } else if (e.type === "saberswing") {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const arc = e.arc ?? 2.5;
        const range = Math.round(e.range ?? 80);
        const alpha = Math.max(0, 1 - k);
        const numSteps = 10;
        for (let i = 0; i < numSteps; i++) {
          const a = -arc / 2 + (i / numSteps) * arc;
          const rDist = Math.round(range * 0.9);
          const px = Math.round(Math.cos(a) * rDist);
          const py = Math.round(Math.sin(a) * rDist);
          ctx.fillStyle = rgba(e.color, alpha * 0.85);
          ctx.fillRect(px - 4, py - 4, 8, 8);
          ctx.fillStyle = rgba("#ffffff", alpha * 0.95);
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        ctx.restore();
      } else if (e.type === "whip") {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const range = e.range ?? 90;
        const life = e.t / e.duration;
        const seed = (e.arc ?? 0) * 17.3;
        const bolts = 3;
        for (let bi = 0; bi < bolts; bi++) {
          const lateral = (bi - (bolts - 1) / 2) * 8;
          this.drawBolt(ctx, range, lateral, e.color, "#ffffff", life, seed + bi * 6.1);
        }
        ctx.restore();
      } else if (e.type === "slam") {
        const r = Math.round(e.radius * (0.3 + k));
        const alpha = Math.max(0, (1 - k) * 0.85);
        // 4-direction pixel ground fissure cracks
        ctx.fillStyle = rgba("#f59e0b", alpha);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          for (let step = 1; step <= 4; step++) {
            const dist = Math.round((step / 4) * r);
            const fx = Math.round(ex + Math.cos(a) * dist + (step % 2 === 0 ? 2 : -2));
            const fy = Math.round(ey + Math.sin(a) * dist);
            ctx.fillRect(fx - 2, fy - 2, 4, 4);
          }
        }
        // Stepped shock ring
        ctx.strokeStyle = rgba(e.color, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
      } else if (e.type === "flamecone") {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(e.angle ?? 0);
        const range = e.range ?? 150;
        const cone = e.arc ?? 0.4;
        const numP = 10;
        for (let i = 0; i < numP; i++) {
          const dist = (0.3 + (i / numP) * 0.7) * range;
          const spread = Math.sin(this.time * 20 + i) * cone;
          const fx = Math.round(Math.cos(spread) * dist);
          const fy = Math.round(Math.sin(spread) * dist);
          const sz = Math.max(3, Math.round(5 + (dist / range) * 6));
          ctx.fillStyle = rgba(dist < range * 0.5 ? "#fde047" : (e.color || "#f97316"), (1 - k) * 0.75);
          ctx.fillRect(fx - sz / 2, fy - sz / 2, sz, sz);
        }
        ctx.restore();
      } else if (e.type === "glue") {
        const r = Math.round(e.radius * (0.4 + k * 0.7));
        const alpha = Math.max(0, (1 - k) * 0.7);
        ctx.fillStyle = rgba(e.color, alpha * 0.35);
        ctx.fillRect(ex - r, ey - r, r * 2, r * 2);
        ctx.strokeStyle = rgba(e.color, alpha);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
      } else if (e.type === "skillcast") {
        const r = Math.round(e.radius * (0.4 + k * 1.0));
        const alpha = Math.max(0, (1 - k) * 0.9);
        ctx.strokeStyle = rgba(e.color, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(ex - r, ey - r, r * 2, r * 2);
        ctx.fillStyle = rgba("#ffffff", alpha * 0.8);
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
      } else if (e.type === "heal_beam") {
        const tgt = this.combatants.find((c) => c.id === e.targetId);
        if (tgt && !(tgt.player.deadTimer && tgt.player.deadTimer > 0)) {
          const tx = Math.round(tgt.player.x);
          const ty = Math.round(tgt.player.y);
          const pulse = 0.7 + Math.sin(this.time * 12) * 0.3;
          ctx.strokeStyle = rgba(e.color, (1 - k) * 0.7 * pulse);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9 * pulse);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Hit target 4-point pixel spark
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(tx - 3, ty - 3, 6, 6);
          ctx.fillStyle = e.color;
          ctx.fillRect(tx - 6, ty - 1, 12, 2);
          ctx.fillRect(tx - 1, ty - 6, 2, 12);
        }
      } else if (e.type === "beam") {
        const range = e.range ?? 200;
        const angle = e.angle ?? 0;
        const tx = Math.round(e.x + Math.cos(angle) * range);
        const ty = Math.round(e.y + Math.sin(angle) * range);
        const pulse = 0.7 + Math.sin(this.time * 10) * 0.3;
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6 * pulse);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.85 * pulse);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      }
    }
    ctx.restore();
  }

  /** Nearest living enemy (or foe, in versus mode) within range — used by the
   *  mobile-only aim assist to auto-point the player at the closest threat.
   *  On the guest (who has no local enemy simulation) the targets come from the
   *  last host snapshot; otherwise they come from the local enemy list. */
  private findAimTarget(p: Player): { x: number; y: number } | null {
    const RANGE = 640;
    let best: { x: number; y: number } | null = null;
    let bestD = RANGE * RANGE;
    const list: { x: number; y: number; hp?: number }[] =
      this.mode === "guest" ? this.snapEnemies : (this.enemies as unknown as { x: number; y: number; hp?: number }[]);
    for (const e of list) {
      if (e.hp !== undefined && e.hp <= 0) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0)) {
      const d = (this.foe.x - p.x) ** 2 + (this.foe.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = this.foe;
      }
    }
    return best;
  }

  // --------------------------------------------------- gadget aim preview
  /** Renders the aiming hint for the currently selected (highlighted) gadget. */
  private drawAimPreview(ctx: CanvasRenderingContext2D) {
    if (this.selectedGadget < 0) return;
    if (this.gameOver || this.paused) return;
    const def = this.gadgets[this.selectedGadget];
    if (!def) return;
    const p = this.player;
    const maxD = this.gadgetRange(def);
    const cd = this.gadgetCd.get(def.id) ?? 0;
    const blocked = cd > 0;

    // clamp the aim point to the gadget's max range from the player + world bounds
    let dx = this.mouse.x - p.x;
    let dy = this.mouse.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > maxD) {
      dx = (dx / d) * maxD;
      dy = (dy / d) * maxD;
    }
    let tx = Math.max(20, Math.min(this.worldW - 20, p.x + dx));
    let ty = Math.max(20, Math.min(this.worldH - 20, p.y + dy));

    if (def.kind === "glue_grenade" || def.kind === "fire_grenade") {
      const sim = this.simulateThrow(p.x, p.y, tx, ty);
      this.drawThrowArc(ctx, p.x, p.y, sim, def.color, blocked);
    } else {
      this.drawPlaceMarker(ctx, p.x, p.y, tx, ty, def, blocked);
    }
  }

  /** Dotted lob trajectory + landing marker for thrown gadgets. */
  private drawThrowArc(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    sim: { vx: number; vy: number; fuse: number; landX: number; landY: number },
    color: string,
    blocked: boolean
  ) {
    const r = 0.96; // matches updateGrenades drag
    const dt = 1 / 60;
    let x = px;
    let y = py;
    let vx = sim.vx;
    let vy = sim.vy;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.85);
    ctx.beginPath();
    ctx.moveTo(Math.round(x), Math.round(y));
    const steps = Math.round(sim.fuse * 60);
    for (let i = 0; i < steps; i++) {
      x += vx * dt;
      y += vy * dt;
      vx *= r;
      vy *= r;
      ctx.lineTo(Math.round(x), Math.round(y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // landing marker (pixel diamond box)
    const lx = Math.round(sim.landX);
    const ly = Math.round(sim.landY);
    ctx.fillStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.9);
    ctx.fillRect(lx - 3, ly - 3, 6, 6);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(lx - 3, ly - 3, 6, 6);
    ctx.restore();
  }

  /** Placement marker, max-range ring and coverage preview for deployables. */
  private drawPlaceMarker(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    tx: number,
    ty: number,
    def: GadgetDef,
    blocked: boolean
  ) {
    const coverage =
      def.kind === "turret_mg"
        ? 260
        : def.kind === "turret_cannon"
        ? 200
        : def.kind === "mine_explosive"
        ? 56
        : def.kind === "mine_poison"
        ? 70
        : def.kind === "mine_fire"
        ? 70
        : def.kind === "healing_station"
        ? 90
        : 60;
    const ipx = Math.round(px);
    const ipy = Math.round(py);
    const itx = Math.round(tx);
    const ity = Math.round(ty);
    const cov = Math.round(coverage);
    ctx.save();
    // line from player to target
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.25)" : rgba(def.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(ipx, ipy);
    ctx.lineTo(itx, ity);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range bounds around the player
    const rng = Math.round(this.gadgetRange(def));
    ctx.strokeStyle = rgba(def.color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ipx - rng, ipy - rng, rng * 2, rng * 2);
    // ghost coverage diamond at the target
    ctx.globalAlpha = blocked ? 0.25 : 0.45;
    ctx.fillStyle = rgba(def.color, 0.25);
    ctx.fillRect(itx - cov, ity - cov, cov * 2, cov * 2);
    ctx.globalAlpha = 1;
    // target reticle brackets [ + ]
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.45)" : rgba(def.color, 0.95);
    ctx.lineWidth = 2;
    ctx.strokeRect(itx - 8, ity - 8, 16, 16);
    ctx.fillStyle = blocked ? "rgba(255,255,255,0.7)" : def.color;
    ctx.fillRect(itx - 1, ity - 1, 2, 2);
    ctx.restore();
  }

  /** Deployable-style targeting marker for the 投射榴弹炮. */
  private drawLauncherIndicator(ctx: CanvasRenderingContext2D) {
    if (this.gameOver || this.paused) return;
    const p = this.player;
    const g = this.gun;
    const radius = Math.round(g.explosionRadius ?? 60);
    const tgt = this.mortarTarget(g);
    const tx = tgt.x;
    const ty = tgt.y;
    const col = g.glow;
    const cx = Math.round(p.x - this.camX);
    const cy = Math.round(p.y - this.camY);
    const sx = Math.round(tx - this.camX);
    const sy = Math.round(ty - this.camY);
    ctx.save();
    // dashed line from player to (clamped) landing point
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = tgt.beyond ? rgba(col, 0.3) : rgba(col, 0.55);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range diamond bounds around the player
    const maxD = Math.round(tgt.maxD);
    ctx.strokeStyle = rgba(col, 0.2);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - maxD, cy - maxD, maxD * 2, maxD * 2);
    // ghost blast coverage at the landing point
    ctx.globalAlpha = tgt.beyond ? 0.25 : 0.45;
    ctx.fillStyle = rgba(col, 0.22);
    ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
    // landing marker box + reticle
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 8, sy - 8, 16, 16);
    // center pixel dot
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    // hide the mouse reticle on touch devices (aim is handled by aim assist)
    if (this.touchMode) return;
    const sx = Math.round(this.mouse.x - this.camX);
    const sy = Math.round(this.mouse.y - this.camY);
    ctx.save();
    // Dark outline for pixel reticle
    ctx.fillStyle = "#09090b";
    // Horizontal bar
    ctx.fillRect(sx - 9, sy - 1, 18, 3);
    // Vertical bar
    ctx.fillRect(sx - 1, sy - 9, 3, 18);
    // 4-corner bracket nodes
    ctx.fillRect(sx - 6, sy - 6, 3, 3);
    ctx.fillRect(sx + 4, sy - 6, 3, 3);
    ctx.fillRect(sx - 6, sy + 4, 3, 3);
    ctx.fillRect(sx + 4, sy + 4, 3, 3);

    // Bright weapon-colored inner reticle
    ctx.fillStyle = this.gun.glow || "#38bdf8";
    ctx.fillRect(sx - 8, sy, 16, 1);
    ctx.fillRect(sx, sy - 8, 1, 16);
    // Center white dot
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
    ctx.restore();
  }

  private drawOverlays(ctx: CanvasRenderingContext2D) {
    if (this.timewarp > 0) {
      ctx.fillStyle = rgba("#a855f7", 0.1);
      ctx.fillRect(0, 0, this.W, this.H);
    }

    const p = this.player;
    const hpFrac = p.hp / p.maxHp;
    if (hpFrac < 0.35 && !this.gameOver) {
      const pulse = 0.25 + Math.sin(this.time * 6) * 0.12;
      ctx.fillStyle = rgba("#ef4444", pulse * (1 - hpFrac) * 0.35);
      // Top / bottom / left / right danger border strips
      const bw = 12;
      ctx.fillRect(0, 0, this.W, bw);
      ctx.fillRect(0, this.H - bw, this.W, bw);
      ctx.fillRect(0, 0, bw, this.H);
      ctx.fillRect(this.W - bw, 0, bw, this.H);
    }
    const bf = this.base.hp / this.base.maxHp;
    if (bf < 0.3 && !this.gameOver) {
      const pulse = 0.2 + Math.sin(this.time * 5) * 0.1;
      ctx.fillStyle = rgba("#ef4444", pulse * (0.3 - bf));
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

}
