import { GUNS, GADGETS, MONSTERS, getCharacter, getOutfit, getSkill, SCENES, CHARACTERS, OUTFITS, SKILLS } from "./content";
import type { GunDef, SkillDef, WeaponClass, GadgetDef, GadgetKind, CharacterDef, OutfitDef } from "./types";
import { drawCharacter, drawMonster, rgba, shade, roundRect, DARK, drawGadgetIcon } from "./draw";
import { sound } from "./sound";
import { RUNTIME } from "./runtimeConfig";
import type { NetMode, InputFrame, Snapshot, SnapPlayer, SnapEffect } from "../net/protocol";
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
  gameMode?: "biohazard" | "deathmatch" | "cashout";
  /** number of players in deathmatch (4, 6, 8) */
  dmPlayerCount?: 4 | 6 | 8;
}

/** One row of the deathmatch leaderboard. */
export interface DmEntry {
  id: number;
  name: string;
  kills: number;
  color: string;
  /** true for the local human player */
  you: boolean;
  /** currently downed (waiting to respawn) */
  dead: boolean;
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
  mode: "biohazard" | "deathmatch" | "cashout";
  /** deathmatch leaderboard (4 combatants). Absent in other modes. */
  dm?: DmEntry[];
  /** kill target to win the deathmatch */
  dmTarget?: number;
  // ---- Ranked Cashout mode fields ----
  teamCash?: number[];
  cashoutTimeLeft?: number;
  isOvertime?: boolean;
  combatantsData?: { id: number; name: string; hp: number; maxHp: number; teamId: number; coins: number; dead: boolean }[];
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
  killFeed: { id: number; type: "kill" | "event"; text?: string; teamColor?: string; killerName?: string; victimName?: string; weaponIconShape?: string; weaponGlow?: string }[];
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
  /** deathmatch combatant id this Player belongs to (for kill credit) */
  cid?: number;
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
  score: number;
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
  // ---- Ranked Cashout mode properties ----
  teamId?: number;
  coins?: number;
  deadTimer?: number;
  respawnTimer?: number;
  respawnCoins?: number;
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
  owner?: "self" | "foe" | "enemy";
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
  type: "explosion" | "shock" | "spawn" | "slash" | "slam" | "debris" | "coinburst" | "poisoncloud" | "firefield" | "flamecone" | "glue" | "saberswing" | "whip" | "skillcast";
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
  kind: "frag" | "glue" | "fire" | "poison";
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
// grenade throw range: +125% (280 * 2.25) per request.
const GADGET_THROW_DIST = 630;
/** Perf caps for client-side visual entities (local PvE, no network cost). */
const MAX_PARTICLES = 700;
const MAX_EFFECTS = 240;
/** Broad-phase spatial grid cell size (px). */
const GRID_CELL = 220;
/** Bot AI re-decides this often (seconds) instead of every frame. */
const BOT_THINK_INTERVAL = 0.12;
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
};
/** PvP: seconds a downed player waits before respawning */
const RESPAWN_TIME = 4;

export interface Vault {
  id: number;
  x: number;
  y: number;
  size: number;
  state: "preheat" | "idle" | "unlocking" | "unlocked";
  timer: number;       // preheat timer (15s) or unlock timer (20s)
  unlockingTeamId: number | null; // which team is currently unlocking it
}

export interface CashBox {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  value: number;       // $10000, $15000, or $22000
  carriedByCid: number | null; // cid of player/bot holding it
  throwTimer: number;   // brief grace period after throw so thrower doesn't instantly pick it back up
  thrownByCid: number | null;
}

export interface Statue {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  carriedByCid: number | null;
  throwTimer: number;
  thrownByCid: number | null;
  deadCid: number;
  teamId: number;
  reviveProgress: number; // 0 to 5 seconds
}

export interface CashoutStation {
  id: number;
  x: number;
  y: number;
  size: number;
  state: "idle" | "cashout" | "stealing" | "settled";
  cash: number;        // current accumulated cash
  timer: number;       // remaining cashout time (max 120s)
  ownerTeamId: number | null; // current owner team (0..3)
  stealerCid: number | null;  // combatant cid stealing it
  stealTimer: number;         // current steal progress (max 7s)
  boxCount: number;           // number of boxes inserted (1 or 2)
  challengerTeamId: number | null; // Double Jeopardy challenger team
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null;
  private loadout: Loadout;
  private onHud: (h: HudState) => void;

  private W = 800;
  private H = 600;
  /** world dimensions (larger than viewport) */
  private worldW = RUNTIME.worldW;
  private worldH = RUNTIME.worldH;
  private camX = 0;
  private camY = 0;
  private raf = 0;
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
  private gameMode: "biohazard" | "deathmatch" | "cashout" = "biohazard";
  // ---- Ranked Cashout state variables ----
  private vaults: Vault[] = [];
  private cashBoxes: CashBox[] = [];
  private statues: Statue[] = [];
  private cashoutStations: CashoutStation[] = [];
  private teamCash: number[] = [0, 0, 0, 0]; // cash assets for Team 0, 1, 2, 3
  private cashBoxCount = 0;                  // how many cash boxes have spawned overall
  private cashoutTimeLeft = 480;             // 8 minutes time limit
  private isOvertime = false;
  private vaultSeq = 1;
  private boxSeq = 1;
  private stationSeq = 1;
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
  public killFeed: { id: number; type: "kill" | "event"; text?: string; teamColor?: string; killerName?: string; victimName?: string; weaponIconShape?: string; weaponGlow?: string; timer: number }[] = [];
  private nextScoreFeedId = 0;
  private nextKillFeedId = 0;

  public activeScoreFeed: { totalScore: number; timer: number; events: { id: number; text: string; victimName?: string; subScore: number }[]; totalKills: number } | null = null;
  private nextScoreFeedEventId = 0;

  addScoreFeed(text: string, score: number, victimName?: string, subScore?: number, totalKills?: number) {
    if (this.gameMode === "biohazard") return;
    
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
      id: this.nextKillFeedId++,
      killerName,
      victimName,
      weaponIconShape: iconShape,
      weaponGlow: glow,
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
  /** kills needed to win the deathmatch */
  private dmKillLimit = 15;
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
  private firing = false;
  private secondaryFiring = false;
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

  private resetState() {
    this.resize();
    this.sceneIndex = Math.floor(Math.random() * SCENES.length);
    this.sceneTheme = SCENES[this.sceneIndex];

    if (this.gameMode === "deathmatch") {
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
    this.pickups = [];
    this.grenades = [];
    this.deployables = [];
    this.walls = this.buildWalls();
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
      text: this.gameMode === "biohazard" ? "生化危机 · 活下去！" : "死亡竞赛 · 先杀 15 人获胜！",
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

    // ---- deathmatch & cashout: build combatants ----
    if (this.gameMode === "cashout") {
      this.isDM = true;
      this.base.hp = Infinity;
      this.base.maxHp = Infinity;
      this.enemyBase.hp = Infinity;
      this.enemyBase.maxHp = Infinity;

      // 12 spawn points distributed in circles
      this.dmSpawns = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 350 + Math.random() * 180;
        this.dmSpawns.push({
          x: this.worldW * 0.5 + Math.cos(angle) * dist,
          y: this.worldH * 0.5 + Math.sin(angle) * dist,
        });
      }

      // Human player (cid 0, team 0)
      this.player.x = this.dmSpawns[0].x;
      this.player.y = this.dmSpawns[0].y;
      const human: Combatant = {
        id: 0, isBot: false, name: "你", color: "#38bdf8",
        player: this.player,
        character: this.character, outfit: this.outfit, skill: this.skill,
        guns: this.guns, gunIndex: this.gunIndex,
        weaponStates: this.weaponStates, gadgets: this.gadgets,
        selectedGadget: this.selectedGadget,
        skillCd: this.skillCd, dashCharges: this.dashCharges,
        dashRecharge: this.dashRecharge, gadgetCd: this.gadgetCd,
        lastGadget: this.lastGadget, kills: 0, score: 0,
        wander: 0, strafeDir: 1, strafeTimer: 0,
        teamId: 0, coins: 2, deadTimer: 0, respawnTimer: 0
      };
      this.combatants = [human];
      this.player.cid = 0;

      // Setup 11 bots (2 allies, 9 enemies in 3 teams)
      const teamColors = ["#38bdf8", "#ef4444", "#f59e0b", "#ec4899"];
      const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
      const picks = this.rollBotLoadouts(11);

      for (let i = 1; i < 12; i++) {
        const teamId = Math.floor(i / 3);
        const memberIndex = i % 3;
        const name = teamId === 0 ? `队友${memberIndex}` : `${teamNames[teamId]}·成员${memberIndex + 1}`;
        const color = teamColors[teamId];
        const sp = this.dmSpawns[i];
        const bot = this.makeBot(i, picks[i - 1], name, color, sp.x, sp.y);
        bot.teamId = teamId;
        bot.coins = 2;
        bot.deadTimer = 0;
        bot.respawnTimer = 0;
        this.combatants.push(bot);
      }

      // Initialize Ranked Cashout state
      this.vaults = [];
      this.cashBoxes = [];
      this.cashoutStations = [];
      this.teamCash = [0, 0, 0, 0];
      this.cashBoxCount = 0;
      this.cashoutTimeLeft = 480; // 8 minutes
      this.isOvertime = false;

      // Spawn 2 initial vaults and stations
      this.spawnVault();
      this.spawnVault();
      this.spawnCashoutStation();
      this.spawnCashoutStation();

      this.banner = { text: "排位提现 · 夺取现金盒进行提现！", t: 2.8 };
      this.activeId = 0;
    } else if (this.gameMode === "deathmatch") {
      this.isDM = true;
      const pCount = this.loadout.dmPlayerCount || 4;
      this.dmKillLimit = this.mode === "local" ? (pCount === 4 ? 15 : pCount === 6 ? 18 : 24) : 8;
      this.base.hp = Infinity;
      this.base.maxHp = Infinity;
      this.enemyBase.hp = Infinity;
      this.enemyBase.maxHp = Infinity;
      
      this.dmSpawns = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 350 + Math.random() * 180;
        this.dmSpawns.push({
          x: this.worldW * 0.5 + Math.cos(angle) * dist,
          y: this.worldH * 0.5 + Math.sin(angle) * dist,
        });
      }

      if (this.mode === "local") {
        const human: Combatant = {
          id: 0, isBot: false, name: "你", color: "#38bdf8",
          player: this.player,
          character: this.character, outfit: this.outfit, skill: this.skill,
          guns: this.guns, gunIndex: this.gunIndex,
          weaponStates: this.weaponStates, gadgets: this.gadgets,
          selectedGadget: this.selectedGadget,
          skillCd: this.skillCd, dashCharges: this.dashCharges,
          dashRecharge: this.dashRecharge, gadgetCd: this.gadgetCd,
          lastGadget: this.lastGadget, kills: 0, score: 0,
          wander: 0, strafeDir: 1, strafeTimer: 0,
        };
        this.combatants = [human];
        this.player.cid = 0;
        const botColors = ["#f472b6", "#a3e635", "#fbbf24", "#e879f9", "#34d399", "#60a5fa", "#f87171", "#c084fc"];
        const botNames = ["阿尔法", "贝塔", "伽马", "德尔塔", "艾普西龙", "泽塔", "伊塔", "西塔"];
        const botCount = pCount - 1;
        const picks = this.rollBotLoadouts(botCount);
        for (let i = 0; i < botCount; i++) {
          const sp = this.dmSpawns[i + 1];
          this.combatants.push(this.makeBot(i + 1, picks[i], botNames[i], botColors[i], sp.x, sp.y));
        }
        this.banner = { text: `死亡竞赛 · 先杀 ${this.dmKillLimit} 人获胜！`, t: 2.4 };
      } else {
        this.combatants = [];
        this.banner = { text: "死亡竞赛 · 先杀 8 人获胜！", t: 2.4 };
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

      if (this.gameMode === "deathmatch") {
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
    const gunPool = GUNS.filter(
      (g) => (g.weaponClass === "ranged" || g.weaponClass === "bow") && !g.semiAuto
    );
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
    
    // sync deathmatch peer combatant
    if (this.gameMode === "deathmatch" && this.combatants.length > 0) {
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
    const walls: Wall[] = [];
    const pillar = (x: number, y: number) =>
      walls.push({
        x: x - 20,
        y: y - 20,
        w: 40,
        h: 40,
        hp: Infinity,
        maxHp: Infinity,
        destructible: false,
      });
    const cover = (x: number, y: number, w: number, h: number) =>
      walls.push({
        x: x - w / 2,
        y: y - h / 2,
        w,
        h,
        hp: 150,
        maxHp: 150,
        destructible: true,
      });
    // Solid buildings — large, textured, tower-like cover. They block movement
    // and bullets like cover walls, but are tougher and only the 大锤 (hammer)
    // can damage them with a melee swing (see meleeLight). `seed` drives the
    // deterministic texture so each building looks distinct; the *style* of the
    // texture is chosen by the map (this.sceneIndex) in drawBuilding.
    let buildingSeed = 1;
    const building = (x: number, y: number, w: number, h: number, hp = 420) =>
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

    // Each map (scene) gets its own layout of cover + buildings, and its own
    // building art style (see drawBuilding). All layouts keep wide lanes
    // (≥ ~90 px between obstacles / to the bases) so players and monsters can
    // always move through. The central plaza around (cx,cy) is left open.
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
      default:
        this.layoutNeon(building, cover, pillar, cx, cy);
        break;
    }

    if (this.gameMode === "deathmatch" || this.gameMode === "cashout") {
      const baseArea = 2400 * 1200;
      const currentArea = this.worldW * this.worldH;
      const extraRatio = (currentArea / baseArea) - 1;
      if (extraRatio > 0.5) {
        // Scatter additional cover and buildings proportionately
        const numExtra = Math.floor(extraRatio * 20);
        for (let i = 0; i < numExtra; i++) {
          const rx = 200 + Math.random() * (this.worldW - 400);
          const ry = 200 + Math.random() * (this.worldH - 400);
          
          // Keep center relatively clear
          if (Math.hypot(rx - cx, ry - cy) < 600) continue;
          
          if (Math.random() > 0.5) {
            building(rx, ry, 150 + Math.random() * 150, 150 + Math.random() * 100);
          } else {
            cover(rx, ry, 100 + Math.random() * 100, 50 + Math.random() * 50);
          }
        }
      }
    }

    // ---- invisible boundary "air walls" ----
    // These solid (non-glue) walls sit just outside the playfield. They block
    // the player, monsters and bullets from ever leaving the arena, so nothing
    // can escape the map boundary (works in every mode). They are never drawn.
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
  // World is 2400×1200; bases sit at (cx, baseY=worldH-120) and (cx, 120) with
  // radius 48, so mid-field anchors are kept a safe gap above/below them.
  // ---------------------------------------------------------------------------

  /** 霓虹都市 — four large corner towers, four mid-field anchors, central pillar ring. */
  private layoutNeon(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    _c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(430, 320, 230, 180);
    b(1970, 320, 230, 180);
    b(430, 880, 230, 180);
    b(1970, 880, 230, 180);
    b(cx, 270, 220, 90); // top-center (clear of enemy base)
    b(cx, 930, 220, 90); // bottom-center (clear of base)
    b(170, cy, 120, 200); // left-mid
    b(2230, cy, 120, 200); // right-mid
    p(cx - 200, cy - 150);
    p(cx + 200, cy - 150);
    p(cx - 200, cy + 150);
    p(cx + 200, cy + 150);
    p(cx, cy);
  }

  /** 沙漠废墟 — adobe compounds in the corners, a central alley of cover, scattered ruins. */
  private layoutDesert(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(400, 260, 180, 150);
    b(2000, 260, 180, 150);
    b(400, 940, 180, 150);
    b(2000, 940, 180, 150);
    b(150, cy, 120, 180); // left-mid ruin
    b(2250, cy, 120, 180); // right-mid ruin
    b(cx, 270, 200, 90); // top-center
    b(cx, 930, 200, 90); // bottom-center
    // central adobe alley — a cross of low cover walls with an open middle
    c(cx, cy - 170, 180, 28);
    c(cx, cy + 170, 180, 28);
    c(cx - 170, cy, 28, 180);
    c(cx + 170, cy, 28, 180);
    p(cx, cy);
  }

  /** 冰原基地 — frozen bunkers in the corners + sides, a long central ice cross. */
  private layoutArctic(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(450, 300, 190, 150);
    b(1950, 300, 190, 150);
    b(450, 900, 190, 150);
    b(1950, 900, 190, 150);
    b(760, cy, 130, 190); // left-mid bunker
    b(1640, cy, 130, 190); // right-mid bunker
    b(cx, 270, 200, 90); // top-center
    b(cx, 930, 200, 90); // bottom-center
    c(cx, cy - 150, 230, 26);
    c(cx, cy + 150, 230, 26);
    c(cx - 150, cy, 26, 230);
    c(cx + 150, cy, 26, 230);
    p(cx, cy);
  }

  /** 末日废墟 — broken city blocks clustered in the corners, scattered rubble pillars. */
  private layoutRuin(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    _c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    // TL cluster
    b(380, 250, 170, 150);
    b(640, 430, 150, 170);
    // TR cluster (mirror)
    b(2020, 250, 170, 150);
    b(1760, 430, 150, 170);
    // BL cluster (mirror)
    b(380, 950, 170, 150);
    b(640, 770, 150, 170);
    // BR cluster (mirror)
    b(2020, 950, 170, 150);
    b(1760, 770, 150, 170);
    b(cx, 260, 210, 80); // top-center
    b(cx, 930, 210, 80); // bottom-center
    b(150, cy, 120, 190); // left-mid
    b(2250, cy, 120, 190); // right-mid
    p(cx - 160, cy - 130);
    p(cx + 160, cy - 130);
    p(cx - 160, cy + 130);
    p(cx + 160, cy + 130);
    p(cx, cy);
  }

  /** 赛博都市 — tall vertical strips in the corners + mid, neon arches at center. */
  private layoutCyber(
    b: (x: number, y: number, w: number, h: number, hp?: number) => void,
    c: (x: number, y: number, w: number, h: number) => void,
    p: (x: number, y: number) => void,
    cx: number,
    cy: number,
  ) {
    b(420, 360, 160, 320); // TL tower
    b(1980, 360, 160, 320); // TR tower
    b(420, 840, 160, 320); // BL tower
    b(1980, 840, 160, 320); // BR tower
    b(760, cy, 120, 240); // left-mid tower
    b(1640, cy, 120, 240); // right-mid tower
    b(cx, 280, 200, 100); // top-center
    b(cx, 920, 200, 100); // bottom-center
    c(cx, cy - 160, 170, 26); // top neon arch
    c(cx, cy + 160, 170, 26); // bottom neon arch
    p(cx - 220, cy);
    p(cx + 220, cy);
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
    window.removeEventListener("blur", this.boundBlur);
    window.removeEventListener("resize", this.boundResize);
  }

  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.W = Math.max(320, rect.width);
    this.H = Math.max(240, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Window resize handler: refresh the canvas size. World bounds are fixed
   *  (every mode uses the expanded RUNTIME world), so there is nothing to
   *  re-sync here — the camera simply keeps following the player. */
  private onResize() {
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

  private onMouseMove(e: MouseEvent) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left + this.camX;
    this.mouse.y = e.clientY - rect.top + this.camY;
  }

  private onMouseDown(e: MouseEvent) {
    sound.ensure();
    if (e.button === 0) {
      // If a gadget is selected, left-click deploys it at the aimed location
      // (instead of firing). Clicking again after deploying returns to firing.
      if (this.selectedGadget >= 0 && !this.gameOver && !this.paused) {
        const idx = this.selectedGadget;
        const g = this.gadgets[idx];
        if (g) {
          if (this.mode === "guest") {
            // host will deploy at our aim position (sent via next input frame)
            this.pendGadget = idx;
            // local visual cooldown so the HUD shows the gadget on CD
            this.gadgetCd.set(g.id, g.cooldown);
          } else if ((this.gadgetCd.get(g.id) ?? 0) <= 0) {
            this.deployGadget(idx, this.mouse.x, this.mouse.y);
          }
          this.selectedGadget = -1;
          e.preventDefault();
          return;
        }
      }
      this.firing = true;
      this.semiAutoLatch = false; // fresh trigger pull allows a semi-auto shot
    }
    if (e.button === 2) {
      this.secondaryFiring = true;
      // guest only records intent; host simulates the skill/shield/slam
      if (this.mode === "guest") {
        this.pendSkill = true;
        this.localSkillCooldown();
        e.preventDefault();
        return;
      }
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
    this.hudAccum += dt;
    if (this.hudAccum > 0.06) {
      this.hudAccum = 0;
      this.emit(false);
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
      if (!p.deadTimer || p.deadTimer <= 0) {
        if (p.dashTime > 0) {
          p.dashTime -= dt;
          p.x += p.dashVx * dt;
          p.y += p.dashVy * dt;
        } else {
          const slow = (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) * (p.slowT && p.slowT > 0 ? 0.5 : 1);
          p.x += dx * p.speed * slow * RUNTIME.playerSpeedMult * dt;
          p.y += dy * p.speed * slow * RUNTIME.playerSpeedMult * dt;
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
        const selfC = this.combatants.find(c => c.id === 0);
        if (this.gameMode === "cashout" && selfC && (selfC.coins ?? 0) > 0) {
          this.banner = { text: `你被击败！${Math.ceil(this.player.deadTimer)} 秒后复活 (复活币: ${selfC.coins})`, t: 0.4 };
        } else {
          this.banner = { text: `你被击败！${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
        }
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
      if (!p.deadTimer || p.deadTimer <= 0) {
        if (p.dashTime > 0) {
          p.dashTime -= dt;
          p.x += p.dashVx * dt;
          p.y += p.dashVy * dt;
        } else {
          const slow = (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) * (p.slowT && p.slowT > 0 ? 0.5 : 1);
          p.x += dx * p.speed * slow * RUNTIME.playerSpeedMult * dt;
          p.y += dy * p.speed * slow * RUNTIME.playerSpeedMult * dt;
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
        const selfC = this.combatants.find(c => c.id === 0);
        if (this.gameMode === "cashout" && selfC && (selfC.coins ?? 0) > 0) {
          this.banner = { text: `你被击败！${Math.ceil(this.player.deadTimer)} 秒后复活 (复活币: ${selfC.coins})`, t: 0.4 };
        } else {
          this.banner = { text: `你被击败！${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
        }
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
        this.banner = { text: `你被击败！${Math.ceil(this.player.deadTimer)} 秒后复活`, t: 0.4 };
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
        this.endGame("基地失守，你输了！");
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
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) p.comboStep = 0;
    }
    if (p.lunge > 0) p.lunge = Math.max(0, p.lunge - dt * 120);
    if (p.electrifiedTime && p.electrifiedTime > 0) p.electrifiedTime -= dt;

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
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      this.spawnParticles(p.x, p.y, this.character.bodyColor, 2, 60);
    } else {
      const slow =
        (p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1) *
        (p.slowT && p.slowT > 0 ? 0.5 : 1);
      p.x += dx * p.speed * slow * RUNTIME.playerSpeedMult * dt;
      p.y += dy * p.speed * slow * RUNTIME.playerSpeedMult * dt;
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

    // Ranked Cashout carried box / statue throwing & block fire
    const carriedBox = this.gameMode === "cashout" ? this.cashBoxes.find(b => b.carriedByCid === this.activeId) : null;
    const carriedStatue = this.gameMode === "cashout" ? this.statues.find(s => s.carriedByCid === this.activeId) : null;
    const carriedItem = carriedBox || carriedStatue;
    
    if (carriedItem) {
      if (this.firing) { // Left click: Throw
        carriedItem.carriedByCid = null;
        carriedItem.throwTimer = 0.8;
        carriedItem.thrownByCid = this.activeId;
        carriedItem.vx = Math.cos(p.angle) * 480;
        carriedItem.vy = Math.sin(p.angle) * 480;
        carriedItem.x = p.x + Math.cos(p.angle) * (p.size + 15);
        carriedItem.y = p.y + Math.sin(p.angle) * (p.size + 15);
        this.spawnParticles(carriedItem.x, carriedItem.y, carriedBox ? "#fbbf24" : "#cbd5e1", 8, 80, 0.3);
      } else if (this.secondaryFiring) { // Right click: Drop
        carriedItem.carriedByCid = null;
        carriedItem.throwTimer = 0.8;
        carriedItem.thrownByCid = this.activeId;
        carriedItem.vx = Math.cos(p.angle) * 50; // Gentle drop
        carriedItem.vy = Math.sin(p.angle) * 50;
        carriedItem.x = p.x + Math.cos(p.angle) * (p.size + 15);
        carriedItem.y = p.y + Math.sin(p.angle) * (p.size + 15);
      }
      this.firing = false;
      this.secondaryFiring = false;
      this.beamActive = false;
      this.flameActive = false;
      return;
    }

    // weapon handling
    p.fireTimer -= dt;
    const ws = this.weaponStates.get(g.id)!;
    const fr =
      g.fireRate *
      this.character.fireRateMult *
      (1 + (this.outfit.fireRateBonus ?? 0)) *
      (p.overdriveTime > 0 ? 1.7 : 1);

    // gatling spin-up: spool the barrel while firing, decay when not
    let spun = true;
    if (g.spinup) {
      if (this.firing)
        ws.spin = Math.min(1, (ws.spin ?? 0) + dt / g.spinup);
      else ws.spin = Math.max(0, (ws.spin ?? 0) - dt / (g.spinDown ?? 0.8));
      spun = (ws.spin ?? 0) > 0.12;
    }

    if (g.weaponClass === "beam") {
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
        const sp = g.bulletSpeed * (0.92 + Math.random() * 0.12);
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
    sound.shoot(g.id);
    this.spawnParticles(
      p.x + Math.cos(base) * (p.size + g.barrel),
      p.y + Math.sin(base) * (p.size + g.barrel),
      g.glow,
      g.pellets > 1 ? 6 : 3,
      140,
      0.25
    );
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
    const dmg = g.damage * this.character.damageMult;
    const isSpear = g.id === "spear";
    const isSaber = g.id === "lightsaber";
    const isWhip = !!g.whip;
    const slowOnHit = g.slowOnHit ?? 0;
    sound.swing();
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

    const dmgMult = isSpear ? 1 + p.comboStep * 0.35 : 1;
    this.effects.push({
      type: isWhip ? "whip" : isSaber ? "saberswing" : "slash",
      x: p.x,
      y: p.y,
      angle: swingAngle,
      arc: isWhip ? this.whipToggle ? 0.6 : -0.6 : arc,
      range,
      t: 0,
      duration: isWhip ? 0.18 : isSaber ? 0.32 : 0.22,
      radius: range,
      color: g.glow,
    });
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + e.size) {
        const ang = Math.atan2(dy, dx);
        if (Math.abs(this.angleDiff(ang, swingAngle)) <= arc / 2) {
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
    }
    // player-vs-player melee (now that AI is gone)
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0)) {
      const dx = opp.x - p.x;
      const dy = opp.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + opp.size) {
        const ang = Math.atan2(dy, dx);
        if (Math.abs(this.angleDiff(ang, swingAngle)) <= arc / 2) {
          const kx = 0;
          const ky = 0;
          this.damagePlayerEntity(opp, dmg * dmgMult, undefined, kx, ky, this.activeId);
          if (isSaber) {
            opp.electrifiedTime = 0.7;
            opp.electrifiedGlow = g.glow;
          }
          if (isWhip && slowOnHit > 0) {
            opp.slowT = Math.max(opp.slowT ?? 0, slowOnHit);
          }
        }
      }
    }
    for (const w of this.walls) {
      if (!w.destructible) continue;
      // buildings can only be struck by the 大锤 (hammer) in melee — all other
      // melee weapons (sword/bat/spear/whip/etc.) deal no damage to buildings.
      if (w.building && g.id !== "hammer") continue;
      const cx = Math.max(w.x, Math.min(p.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(p.y, w.y + w.h));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d <= range) {
        const ang = Math.atan2(cy - p.y, cx - p.x);
        if (Math.abs(this.angleDiff(ang, p.angle)) <= arc / 2) {
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
        this.damagePlayerEntity(opp, dmg * (0.55 + fall * 0.5), undefined, 0, 0, this.activeId);
      }
    }
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.destructible && this.rectCircleOverlap(w, p.x, p.y, radius)) {
        this.breakWall(w, i);
      }
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
        this.damagePlayerEntity(hit.combatant, g.damage * this.character.damageMult * dt, undefined, 0, 0, this.activeId);
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
            e.burnT = Math.max(e.burnT, 1.2);
            e.burnDps = Math.max(e.burnDps, dps * 0.25);
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
              this.damagePlayerEntity(q, dps * dt * (0.4 + fall * 0.6), undefined, 0, 0, this.activeId);
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
      }
      if (this.flameSndCd <= 0) {
        sound.shoot("rocket");
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
  private updatePoisonMist(dt: number, firing: boolean, ws: WeaponState) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.4) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      const cone = g.flameCone ?? 0.34;
      const range = g.flameRange ?? 130;
      const dps = g.damage;
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
              this.damagePlayerEntity(q, dps * dt * 0.5, undefined, 0, 0, this.activeId);
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
        sound.shoot("rocket");
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
    const sp = g.bulletSpeed * speedMult;
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
    sound.shoot("sniper");
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
          this.explode(b.lobTx ?? b.x, b.lobTy ?? b.y, b.explosionRadius, b.damage, b.glow, "mortar");
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
      if (b.trail && Math.random() < 0.7) {
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
        b.x < -40 ||
        b.x > this.worldW + 40 ||
        b.y < -40 ||
        b.y > this.worldH + 40
      )
        dead = true;

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
            this.spawnParticles(b.x, b.y, b.glow, 4, 100, 0.2);
          } else if (b.explosive && b.bounced) {
            // MGL32: explode on second wall hit
            this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
            dead = true;
          } else {
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
            else this.spawnParticles(b.x, b.y, b.glow, 4, 120, 0.22);
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
              this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
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
              { weapon: b.weapon ?? "bullet", dx: Math.cos(Math.atan2(b.vy, b.vx)), dy: Math.sin(Math.atan2(b.vy, b.vx)) }
            );
            if (b.pierce <= 0) {
              dead = true;
              break;
            }
            b.pierce -= 1;
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
            if (it.ownerId === oid) continue;
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
        this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
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
            radius: 92,
            color: "#84cc16",
            dps: 60,
            slow: 0.5,
            tickT: 0,
            ownerId: gr.ownerId,
          });
          this.spawnParticles(gr.x, gr.y, "#84cc16", 20, 200, 0.5);
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
    if (k === "glue_grenade" || k === "fire_grenade" || k === "poison_grenade")
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
      if (d.kind === "turret_mg" || d.kind === "turret_cannon") {
        d.timer -= dt;
        let target: { x: number; y: number } | null = null;
        let bestD = d.radius;
        if (this.isDM) {
          // deathmatch: acquire the nearest OTHER combatant (not the owner)
          for (const c of this.combatants) {
            if (c.id === (d.ownerId ?? -1)) continue;
            const q = c.player;
            if (q.deadTimer && q.deadTimer > 0) continue;
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
      if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
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
              radius: d.radius,
              color: d.color,
              dps: 60,
              slow: 0.5,
              tickT: 0,
            });
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
          const cr = e.cloudRadius ?? 95;
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
              this.applyPoison(e, ((fx.dps ?? 20) * 0.25) * 0.8);
              e.slowT = Math.max(e.slowT, 0.3);
            } else {
              this.damageEnemy(e, (fx.dps ?? 20) * 0.25, 0, 0, true);
              e.burnT = Math.max(e.burnT, 1);
              e.burnDps = Math.max(e.burnDps, 20);
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
              this.damagePlayerEntity(q, (fx.dps ?? 20) * 0.25, undefined, 0, 0, fx.ownerId ?? -1);
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
    src?: { weapon: string; dx?: number; dy?: number }
  ) {
    if (e.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    e.hp -= dmg;
    if (!silent) e.hitFlash = 1;
    if (!silent && this.hitSndCd <= 0) {
      sound.hit();
      this.hitSndCd = 0.04;
    }
    const kbScale = 0.045 / (e.type === "boss" ? 6 : 1);
    e.x += kbx * kbScale;
    e.y += kby * kbScale;
    if (src) e.lastSrc = { weapon: src.weapon, dx: src.dx ?? 0, dy: src.dy ?? 0 };
    this.spawnParticles(
      e.x,
      e.y,
      e.glow,
      4,
      120,
      0.3,
      e.x - kbx * 0.1,
      e.y - kby * 0.1
    );
    if (e.hp <= 0) this.killEnemy(e);
  }

  /** Apply (and ramp) poison on an enemy. The longer it stays in gas, the
   *  higher its poison dps climbs — so lingering hurts more and more. */
  private applyPoison(e: Enemy, ramp: number) {
    if (e.hp <= 0) return;
    e.poisonT = Math.max(e.poisonT ?? 0, 0.9);
    e.poisonDps = Math.min(260, (e.poisonDps ?? 0) + ramp);
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

  private killEnemy(e: Enemy) {
    this.score += e.score;
    this.kills += 1;
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
    p.flash = 1;
    p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    this.shake = Math.min(16, this.shake + dmg * 0.4);
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    if (p.hp <= 0) {
      p.hp = 0;
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
        this.banner = { text: `你被击败！${RESPAWN_TIME} 秒后复活`, t: 1.6 };
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
      this.endGame("摧毁敌方基地！胜利！");
    }
  }

  private endGame(reason: string) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverReason = reason;
    this.spawnParticles(this.player.x, this.player.y, this.character.bodyColor, 40, 220, 0.8);
    this.emit(true);
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

  /** Damage an arbitrary player (local or foe); death starts a 4s respawn timer. */
  private damagePlayerEntity(
    p: Player,
    dmg: number,
    _b?: Bullet,
    knockX = 0,
    knockY = 0,
    attackerId?: number
  ) {
    // already downed and waiting to respawn -> ignore further hits
    if (p.deadTimer && p.deadTimer > 0) return;
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
        const isLocalVictimShield = (p === this.localPlayer) || (p.cid !== undefined && ((this.mode === "local" && p.cid === 0) || (this.mode !== "local" && p.cid === this.selfPid)));
        if (isLocalVictimShield) this.shake = 12;
        sound.explosion();
      }
      // Track score for shield damage
      const shieldDiff = prevShield - p.shieldHp;
      if (shieldDiff > 0 && this.gameMode !== "biohazard") {
        const scoreGained = Math.round(shieldDiff);
        if (scoreGained > 0 && attackerId !== undefined && attackerId >= 0) {
          const killerC = this.combatants.find((c) => c.id === attackerId);
          if (killerC) killerC.score += scoreGained;
          else this.score += scoreGained;
          const isLocalAttacker = (this.mode === "local" && attackerId === 0) || (this.mode !== "local" && attackerId === this.selfPid);
          if (isLocalAttacker) this.addScoreFeed("伤害击中", scoreGained);
        }
      }
      return;
    }
    p.hp -= dmg;
    p.flash = 1;
    // In deathmatch (human-vs-bots) DON'T grant post-hit invulnerability, so
    // damage lands continuously — otherwise every combatant is immune for
    // 0.45s after each hit and feels far thicker than its 250 HP suggests.
    // Other modes (PvP / PvE) keep the short iframe to avoid burst instakills.
    // Dash / skill i-frames (set elsewhere) still apply via the check above.
    if (!this.isDM) p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    // Only shake screen when the LOCAL player is hit
    const isLocalVictim = (p === this.localPlayer) || (p.cid !== undefined && ((this.mode === "local" && p.cid === 0) || (this.mode !== "local" && p.cid === this.selfPid)));
    if (isLocalVictim) {
      this.shake = Math.min(16, this.shake + dmg * 0.4);
    }
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    // apply knockback (melee); clamp to world bounds
    if (knockX || knockY) {
      p.x = Math.max(p.size, Math.min(this.worldW - p.size, p.x + knockX));
      p.y = Math.max(p.size, Math.min(this.worldH - p.size, p.y + knockY));
    }

    // Track score for health damage
    const hpDiff = prevHp - p.hp;
    if (hpDiff > 0 && this.gameMode !== "biohazard") {
      const scoreGained = Math.round(hpDiff);
      if (scoreGained > 0 && attackerId !== undefined && attackerId >= 0) {
        const killerC = this.combatants.find((c) => c.id === attackerId);
        if (killerC) killerC.score += scoreGained;
        else this.score += scoreGained;
        const isLocalAttacker = (this.mode === "local" && attackerId === 0) || (this.mode !== "local" && attackerId === this.selfPid);
        if (isLocalAttacker) this.addScoreFeed("伤害击中", scoreGained);
      }
    }

    if (p.hp <= 0) {
      p.hp = 0;
      p.deadTimer = RESPAWN_TIME;
      p.bowDrawing = false;
      this.spawnParticles(p.x, p.y, "#f472b6", 30, 200, 0.6);
      
      if (this.gameMode === "cashout") {
        const c = this.combatants.find(comb => comb.id === p.cid);
        if (c) {
          c.player.deadTimer = 20;
          this.statues.push({
            id: Math.random() * 1000000 | 0,
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            size: 15,
            carriedByCid: null,
            throwTimer: 1.0,
            thrownByCid: null,
            deadCid: c.id,
            teamId: c.teamId ?? 0,
            reviveProgress: 0,
          });
        }
      }

      // coin burst on every non-biohazard enemy death (deathmatch bots / PvP foe)
      if (this.gameMode !== "biohazard") {
        const killer =
          attackerId !== undefined && attackerId >= 0
            ? this.combatants.find((c) => c.id === attackerId)?.player ?? null
            : null;
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
        const victim =
          this.combatants.find((c) => c.id === (p.cid ?? 0)) ?? null;
        const killer =
          attackerId !== undefined && attackerId >= 0
            ? this.combatants.find((c) => c.id === attackerId) ?? undefined
            : undefined;
        if (killer && victim && killer.id !== victim.id) {
          killer.kills += 1;
          killer.score += 250;
          if (this.gameMode === "cashout") {
            this.teamCash[killer.teamId] += 500;
          }
          const kName = killer.id === this.selfPid ? "你" : killer.name;
          const vName = victim.id === this.selfPid ? "你" : victim.name;
          
          this.addKillFeed(kName, vName, _b?.weapon, killer);
          if (killer.id === this.selfPid || (this.mode === "local" && killer.id === 0)) {
            this.addScoreFeed("淘汰", 250, vName, 250, killer.kills);
            if (this.gameMode === "cashout") {
              this.addScoreFeed("淘汰赏金", 500); // UI feedback for the cash
            }
          }

          if (killer.id === this.selfPid || (this.mode === "local" && killer.id === 0)) {
            this.banner = { text: `击杀 ${vName}！`, t: 1.6 };
          } else if (victim.id === this.selfPid || (this.mode === "local" && victim.id === 0)) {
            this.banner = { text: `你被 ${kName} 击败！`, t: 1.6 };
          }

          if (killer.kills >= this.dmKillLimit && !this.gameOver) {
            this.endGame(killer.id === this.selfPid || (this.mode === "local" && killer.id === 0) ? "你赢了！" : `${kName} 获胜！`);
          }
        } else if (victim && (victim.id === this.selfPid || (this.mode === "local" && victim.id === 0))) {
          this.banner = { text: `你被击败！${RESPAWN_TIME} 秒后复活`, t: 1.6 };
        }
      } else if (p === this.foe) {
        // you downed the opponent
        this.kills += 1;
        this.score += 250;
        this.addKillFeed("你", this.peerName || "对手", _b?.weapon);
        this.addScoreFeed("淘汰", 250, this.peerName || "对手", 250, this.kills);
        this.banner = { text: `击杀 ${this.peerName || "对手"}！`, t: 1.6 };
      } else {
        this.banner = { text: `你被击败！${RESPAWN_TIME} 秒后复活`, t: 1.6 };
      }
    }
  }

  /** Count down downed avatars and revive them after RESPAWN_TIME. */
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
        // Fully random respawn mode: pick any DM spawn point at random (the
        // player may even come back near an enemy — that's the intent).
        const pool = this.dmSpawns;
        const sp = pool.length
          ? pool[Math.floor(Math.random() * pool.length)]
          : { x: this.worldW / 2, y: this.worldH / 2 };
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
    if (inp.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
    if (inp.skill) this.activateSkill();
    if (inp.reload) this.reloadCurrent();
    if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
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
    // restore the host's own joystick vector
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
    this.simulatingOther = false;
  }

  // ------------------------------------------------------ deathmatch AI bots
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
    // throttle AI decisions: run the heavy brain (botThink) at a low rate and
    // replay only the cached MOVEMENT intent between decisions. AIM + FIRE are
    // recomputed EVERY frame by `botAimFire` so bots stay aggressive and never
    // hesitate when an enemy appears between decisions.
    const decide = (c.aiTimer ?? 0) <= 0;
    if (decide) {
      this.keys = new Set();
      this.mouse = { x: c.player.x, y: c.player.y - 1 };
      this.virtualMove = { x: 0, y: 0 };
      this.firing = false;
      const intent = this.botThink(c, dt);
      c.aiTimer = BOT_THINK_INTERVAL;
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
      this.botAimFire(c);
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
    this.simulatingOther = false;
  }

  /** Effective engagement range of a gun (px), used by bot target-range logic. */
  private gunEffRange(g: GunDef): number {
    if (g.weaponClass === "beam") return g.beamRange ?? 600;
    if (g.weaponClass === "flamethrower") return g.flameRange ?? 260;
    if (g.weaponClass === "poison_mist") return 320;
    if (g.weaponClass === "melee" || g.weaponClass === "shield")
      return (g.meleeRange ?? 64) + 12;
    // bow / ranged: travel = speed * lifetime
    return (g.bulletSpeed ?? 700) * (g.life ?? 1);
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
    // pick the nearest living opponent (ignore teammates in Cashout mode)
    let target: Player | null = null;
    let bestD = Infinity;
    for (const o of this.combatants) {
      if (o.id === c.id) continue;
      if (this.gameMode === "cashout" && o.teamId === c.teamId) continue;
      const q = o.player;
      if (q.deadTimer && q.deadTimer > 0) continue;
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) { bestD = d; target = q; }
    }

    // Cashout mode objective decision (Vault, Cash Box, Cashout Station)
    let objX: number | null = null;
    let objY: number | null = null;
    let isInsertingBox = false;

    if (this.gameMode === "cashout") {
      const carriedBox = this.cashBoxes.find(b => b.carriedByCid === c.id);
      if (carriedBox) {
        let bestStDist = Infinity;
        for (const st of this.cashoutStations) {
          const d = Math.hypot(st.x - p.x, st.y - p.y);
          if (d < bestStDist) {
            bestStDist = d;
            objX = st.x;
            objY = st.y;
          }
        }
        if (bestStDist < 120) {
          isInsertingBox = true;
        }
      } else {
        // Find loose cashbox
        let bestBoxDist = Infinity;
        for (const box of this.cashBoxes) {
          if (box.carriedByCid === null && box.throwTimer <= 0) {
            const d = Math.hypot(box.x - p.x, box.y - p.y);
            if (d < bestBoxDist) {
              bestBoxDist = d;
              objX = box.x;
              objY = box.y;
            }
          }
        }
        // If no loose box, find active vault
        if (objX === null) {
          let bestVaultDist = Infinity;
          for (const v of this.vaults) {
            if (v.state === "idle" || v.state === "unlocking") {
              const d = Math.hypot(v.x - p.x, v.y - p.y);
              if (d < bestVaultDist) {
                bestVaultDist = d;
                objX = v.x;
                objY = v.y;
              }
            }
          }
        }
        // If no vault, find station to steal/defend
        if (objX === null) {
          let bestStDist = Infinity;
          for (const st of this.cashoutStations) {
            if (st.state === "cashout" || st.state === "stealing") {
              const d = Math.hypot(st.x - p.x, st.y - p.y);
              if (d < bestStDist) {
                bestStDist = d;
                objX = st.x;
                objY = st.y;
              }
            }
          }
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
    } else if (objX !== null && objY !== null) {
      this.mouse.x = objX;
      this.mouse.y = objY;
    }

    // ---- movement: navigate to objective or combat strafe ----
    if (objX !== null && objY !== null && (!target || dist > 250)) {
      const objAng = Math.atan2(objY - p.y, objX - p.x);
      this.virtualMove.x = Math.cos(objAng);
      this.virtualMove.y = Math.sin(objAng);
    } else if (target) {
      c.strafeTimer = (c.strafeTimer ?? 0) - dt;
      if (c.strafeTimer <= 0) {
        c.strafeTimer = 0.6 + Math.random() * 1.0;
        const r = Math.random();
        if (r < 0.5) c.strafeDir = c.strafeDir === 1 ? -1 : 1;
        else if (r < 0.82) c.strafeDir = 0;
        else c.strafeDir = 2;
      }
      let mvx = 0, mvy = 0;
      if (c.strafeDir === 0) {
        mvx = Math.cos(ang); mvy = Math.sin(ang);
        if (dist < 150) { mvx = 0; mvy = 0; }
      } else if (c.strafeDir === 2) {
        mvx = -Math.cos(ang); mvy = -Math.sin(ang);
      } else {
        const sa = ang + (c.strafeDir ?? 1) * Math.PI / 2;
        mvx = Math.cos(sa); mvy = Math.sin(sa);
      }
      this.virtualMove.x = mvx;
      this.virtualMove.y = mvy;
    }

    if (isInsertingBox) {
      this.firing = true; // throw cash box at station!
    }

    // ---- fire aggressively: anything we can see, within this gun's range ----
    let los = false;
    let inRange = false;
    if (target) {
      los = this.botLOS(p.x, p.y, target.x, target.y);
      inRange = dist < this.gunEffRange(g) + 40;
      const facing = Math.abs(this.angleDiff(ang, p.angle));
      this.firing = los && inRange && facing < 1.2;
    } else if (!isInsertingBox) {
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
    if (c.gadgets.length && (c.gadgetTimer ?? 0) <= 0) {
      for (const gd of c.gadgets) {
        if ((c.gadgetCd.get(gd.id) ?? 0) > 0) continue;
        let deploy = false;
        let tx = target ? target.x : p.x, ty = target ? target.y : p.y;
        switch (gd.kind) {
          case "healing_station":
            deploy = p.hp < p.maxHp * 0.7;
            tx = p.x; ty = p.y; // stand in it
            break;
          case "turret_mg":
          case "turret_cannon":
            deploy = target ? dist > 180 && los : false; // add ranged suppression
            tx = p.x + Math.cos(ang) * 130;
            ty = p.y + Math.sin(ang) * 130;
            break;
          case "mine_explosive":
          case "mine_poison":
          case "mine_fire":
            deploy = target ? dist < 220 : false; // trap a closing foe
            tx = p.x + Math.cos(ang) * 90;
            ty = p.y + Math.sin(ang) * 90;
            break;
          case "glue_grenade":
          case "fire_grenade":
          case "poison_grenade":
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
    if (g.magazine !== undefined && ws.ammo <= 0 && ws.reload <= 0) {
      if (c.guns.length > 1) {
        const alt = c.guns.findIndex(
          (gg, i) => i !== this.gunIndex && ((this.weaponStates.get(gg.id)?.ammo ?? 0) > 0 || gg.magazine === undefined)
        );
        if (alt >= 0) this.gunIndex = alt; // switch to a loaded gun
        else intent.reload = true;
      } else intent.reload = true;
    }
    return intent;
  }

  /** Cheap, per-frame aim + fire control for a bot. The heavy movement/weapon/
   *  gadget brain (`botThink`) is throttled, but AIM + FIRE must stay responsive
   *  or bots look braindead (the original throttle cached firing and bots would
   *  stand there not shooting when an enemy entered view between decisions).
   *  Only does a nearest-target scan (O(combatants)) + a single LOS ray, then
   *  mirrors `botThink`'s fire gate (LOS && inRange && facing). */
  private botAimFire(c: Combatant) {
    const p = c.player;
    let target: Player | null = null;
    let bestD = Infinity;
    for (const o of this.combatants) {
      if (o.id === c.id) continue;
      if (this.gameMode === "cashout" && o.teamId === c.teamId) continue;
      const q = o.player;
      if (q.deadTimer && q.deadTimer > 0) continue;
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bestD) { bestD = d; target = q; }
    }
    if (!target) {
      this.firing = false;
      // cashout: keep throwing the carried box at the nearest station
      if (this.gameMode === "cashout") {
        const carried = this.cashBoxes.find((b) => b.carriedByCid === c.id);
        if (carried) {
          let bestSt = Infinity, sx = p.x, sy = p.y;
          for (const st of this.cashoutStations) {
            const d = Math.hypot(st.x - p.x, st.y - p.y);
            if (d < bestSt) { bestSt = d; sx = st.x; sy = st.y; }
          }
          if (bestSt < 120) {
            this.mouse.x = sx;
            this.mouse.y = sy;
            this.firing = true;
          }
        }
      }
      return;
    }
    const g = this.gun;
    const dist = Math.sqrt(bestD);
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    // light target leading so moving foes still get hit
    const lead = g.bulletSpeed ? Math.min(dist / g.bulletSpeed, 0.4) : 0;
    this.mouse.x = target.x + target.vx * lead;
    this.mouse.y = target.y + target.vy * lead;
    const los = this.botLOS(p.x, p.y, target.x, target.y);
    const inRange = dist < this.gunEffRange(g) + 40;
    const facing = Math.abs(this.angleDiff(ang, p.angle));
    this.firing = los && inRange && facing < 1.2;
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
        this.toSnapPlayer(this.foe!, this.foeChar!, this.foeOutfit!, this.foeGadgets, this.foeGadgetCd),
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
      dmKills: this.isDM ? [
        this.combatants.find(c => c.id === 1)?.kills ?? 0,
        this.combatants.find(c => c.id === 2)?.kills ?? 0
      ] : undefined,
      dmTarget: this.isDM ? this.dmKillLimit : undefined,
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
    if (inp.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
    if (inp.skill) this.activateSkill();
    if (inp.reload) this.reloadCurrent();
    if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
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
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
  }

  /** Advance the shared world state (entities, bullets, waves, respawns). */
  private simulateWorld(dt: number) {
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
    this.tickRespawns(dt);
    if (this.gameMode === "cashout") {
      this.updateCashoutMode(dt);
    }
    if (this.matchLive && this.gameMode !== "cashout") this.updateWaves(dt);
    // online PvP time limit — end the match at MATCH_DURATION seconds
    if (this.mode !== "local" && this.matchLive && !this.gameOver && this.time >= MATCH_DURATION) {
      this.endGame("时间到！");
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
    if (this.gameMode !== "biohazard" && !this.isDM && !this.gameOver) {
      // In PvP the match ends when EITHER base is destroyed — the base owner
      // loses. The previous check only tested `this.base` (pid 1 / creator), so
      // if the joiner's (pid 2) base fell the game would never end.
      if (this.base.hp <= 0) this.endGame("基地失守，你输了！");
      else if (this.enemyBase.hp <= 0) this.endGame("敌方基地已摧毁，你赢了！");
    }
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

    if (this.gameMode === "deathmatch") {
      this.player.cid = this.selfPid;
      this.foe.cid = this.peerPid;

      this.dmSpawns = [
        { x: this.worldW * 0.5, y: this.worldH - 200 },
        { x: this.worldW * 0.15, y: this.worldH * 0.2 },
        { x: this.worldW * 0.85, y: this.worldH * 0.2 },
        { x: this.worldW * 0.5, y: this.worldH * 0.16 },
      ];

      const hostSpawn = this.dmSpawns[0];
      const guestSpawn = this.dmSpawns[1];
      this.player.x = hostSpawn.x;
      this.player.y = hostSpawn.y;
      this.foe.x = guestSpawn.x;
      this.foe.y = guestSpawn.y;

      const c1: Combatant = {
        id: 1, isBot: false, name: "玩家1", color: "#38bdf8",
        player: this.player,
        character: this.character, outfit: this.outfit, skill: this.skill,
        guns: this.guns, gunIndex: this.gunIndex,
        weaponStates: this.weaponStates, gadgets: this.gadgets,
        selectedGadget: this.selectedGadget,
        skillCd: this.skillCd, dashCharges: this.dashCharges,
        dashRecharge: this.dashRecharge, gadgetCd: this.gadgetCd,
        lastGadget: this.lastGadget, kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0
      };

      const c2: Combatant = {
        id: 2, isBot: false, name: "玩家2", color: "#f472b6",
        player: this.foe,
        character: this.foeChar!,
        outfit: this.foeOutfit!,
        skill: getSkill(loadoutB.skillId ?? "dash"),
        guns: this.foeGuns,
        gunIndex: 0,
        weaponStates: new Map(),
        gadgets: this.foeGadgets,
        selectedGadget: -1,
        skillCd: 0,
        dashCharges: MAX_DASH_CHARGES,
        dashRecharge: 0,
        gadgetCd: new Map(),
        lastGadget: 0,
        kills: 0, score: 0, wander: 0, strafeDir: 1, strafeTimer: 0
      };

      this.combatants = [c1, c2];
    }

    this.peerLoadout = loadoutB;
    this.applyPeerLoadout();
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
    this.score = s.score;
    this.kills = s.kills;
    this.gold = s.gold;

    // Trigger local score feedback for guest client
    if (this.mode === "guest" && this.score > oldScore) {
      const diff = this.score - oldScore;
      if (this.kills > oldKills) {
        this.addScoreFeed("淘汰", diff, this.peerName || "对手", diff, this.kills);
      } else {
        this.addScoreFeed(diff >= 200 ? "金币收集" : "伤害击中", diff);
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
      const hostC = this.combatants.find(c => c.id === 1);
      const guestC = this.combatants.find(c => c.id === 2);
      const oldHostKills = hostC?.kills ?? 0;
      const oldGuestKills = guestC?.kills ?? 0;
      
      const newHostKills = s.dmKills[0];
      const newGuestKills = s.dmKills[1];
      
      if (hostC) hostC.kills = newHostKills;
      if (guestC) guestC.kills = newGuestKills;

      // Local kill feed updates for DM on guest/client
      if (this.mode === "guest") {
        if (newHostKills > oldHostKills) {
          const isMe = this.selfPid === 1;
          const kName = isMe ? "你" : (this.peerName || "对手");
          const vName = isMe ? (this.peerName || "对手") : "你";
          const gun = isMe ? this.gun : (this.foeGuns[this.foe?.gunIndex ?? 0] ?? GUNS[0]);
          this.killFeed.push({
            id: this.kfSeq++,
            killerName: kName,
            victimName: vName,
            weaponIconShape: gun.iconShape,
            weaponGlow: gun.glow,
            timer: 4.2
          });
        }
        if (newGuestKills > oldGuestKills) {
          const isMe = this.selfPid === 2;
          const kName = isMe ? "你" : (this.peerName || "对手");
          const vName = isMe ? (this.peerName || "对手") : "你";
          const gun = isMe ? this.gun : (this.foeGuns[this.foe?.gunIndex ?? 0] ?? GUNS[0]);
          this.killFeed.push({
            id: this.kfSeq++,
            killerName: kName,
            victimName: vName,
            weaponIconShape: gun.iconShape,
            weaponGlow: gun.glow,
            timer: 4.2
          });
        }
      }
    }
    if (s.gameOver && !this.gameOver) {
      // The host's gameOverReason is from the host's POV; derive the guest's
      // outcome from the base HPs relative to THIS client's role.
      const iAmJoiner = this.mode === "guest";
      let reason: string;
      if (this.isDM && s.dmKills) {
        const hostKills = s.dmKills[0];
        const guestKills = s.dmKills[1];
        const target = s.dmTarget ?? 8;
        if (iAmJoiner) {
          if (guestKills >= target) reason = "胜利！你击败了对手";
          else reason = "失败，对手击败了你";
        } else {
          if (hostKills >= target) reason = "胜利！你击败了对手";
          else reason = "失败，对手击败了你";
        }
      } else if (iAmJoiner) {
        if (s.guestBaseHp <= 0) reason = "失败，基地失守";
        else if (s.hostBaseHp <= 0) reason = "胜利！敌方基地已摧毁";
        else reason = "胜利！对手已被击败";
      } else {
        if (s.hostBaseHp <= 0) reason = "失败，基地失守";
        else if (s.guestBaseHp <= 0) reason = "胜利！敌方基地已摧毁";
        else reason = "胜利！对手已被击败";
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
    size: number
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
    });
    // hp bar
    const w = 32;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - w / 2, y - 24, w, 4);
    ctx.fillStyle = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171";
    ctx.fillRect(x - w / 2, y - 24, w * Math.max(0, hpPct), 4);
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
    for (const e of s.enemies) {
      const r = ease(e.id, e.x, e.y);
      const c = getCharacter(e.character);
      ctx.fillStyle = c?.bodyColor ?? "#f87171";
      ctx.beginPath();
      ctx.arc(r.x, r.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2, 3);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2 * (e.hp / e.maxHp), 3);
      }
    }
    for (const p of s.players) {
      if (p.hp <= 0) continue; // downed players are hidden until they respawn
      const isMe = p.id === this.selfPid;
      const r = isMe ? { x: this.player.x, y: this.player.y } : ease(p.id, p.x, p.y);
      const gunList = isMe ? this.guns : this.foeGuns;
      const size = isMe ? this.player.size : getCharacter(p.character).size;
      this.drawNetCharacter(
        ctx,
        r.x,
        r.y,
        p.angle,
        p.character,
        p.outfit,
        p.gunIndex ?? 0,
        gunList,
        isMe ? this.character.name : this.peerName || "对手",
        p.hp / p.maxHp,
        this.time,
        size
      );
      if (p.electrified > 0) {
        this.drawElectricArcs(ctx, r.x, r.y, size, p.electrifiedGlow, this.time);
      }
    }
    // local gadget aiming preview (selection highlight + throw/deploy hint)
    this.drawAimPreview(ctx);
    // glowing bullets with a short trail (弹道) instead of bare lines
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of s.bullets) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const tx = b.x - (b.vx / sp) * b.size * 4;
      const ty = b.y - (b.vy / sp) * b.size * 4;
      ctx.strokeStyle = rgba(b.glow, 0.5);
      ctx.lineWidth = Math.max(1, b.size * 0.9);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 3.4);
      rg.addColorStop(0, rgba(b.glow, 0.85));
      rg.addColorStop(1, rgba(b.glow, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  private explode(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color: string,
    srcWpn?: string,
    ownerId?: number
  ) {
    this.effects.push({
      type: "explosion",
      x,
      y,
      t: 0,
      duration: 0.45,
      radius,
      color,
    });
    this.effects.push({
      type: "shock",
      x,
      y,
      t: 0,
      duration: 0.4,
      radius,
      color,
    });
    // shake only when player is hit
    // if (!this.simulatingOther) this.shake = Math.min(20, this.shake + 8);
    sound.explosion();
    this.spawnParticles(x, y, color, 26, 260, 0.55);
    this.spawnParticles(x, y, "#fde68a", 14, 200, 0.4);
    if (damage > 0) {
      this.buildGrid();
      const cand = this.queryGrid(x, y, radius);
      for (const it of cand) {
        if (it.kind !== "enemy") continue;
        const e = it.ref as Enemy;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < radius + e.size) {
          const fall = 1 - d / (radius + e.size);
          const a = Math.atan2(e.y - y, e.x - x);
          this.damageEnemy(
            e,
            damage * (0.5 + fall * 0.5),
            Math.cos(a) * 260 * fall,
            Math.sin(a) * 260 * fall,
            false,
            { weapon: srcWpn ?? "explosive", dx: Math.cos(a), dy: Math.sin(a) }
          );
        }
      }
      if (this.isDM) {
        // splash also hits other combatants (not the owner)
        for (const it of cand) {
          if (it.kind !== "player") continue;
          if (it.ownerId === (ownerId ?? -1)) continue;
          const q = it.ref as Player;
          if (q.deadTimer && q.deadTimer > 0) continue;
          const d = Math.hypot(q.x - x, q.y - y);
          if (d < radius + q.size) {
            const fall = 1 - d / (radius + q.size);
            const a = Math.atan2(q.y - y, q.x - x);
            this.damagePlayerEntity(
              q,
              damage * (0.5 + fall * 0.5),
              undefined,
              0,
              0,
              ownerId
            );
          }
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
      this.banner = { text: `第 ${this.wave} 阶段 · 敌人增强`, t: 2.0 };
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
        // throw range +125%: 420 -> 945
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 945,
          vy: Math.sin(a) * 945,
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
      teamCash: this.gameMode === "cashout" ? this.teamCash : undefined,
      cashoutTimeLeft: this.gameMode === "cashout" ? this.cashoutTimeLeft : undefined,
      isOvertime: this.gameMode === "cashout" ? this.isOvertime : undefined,
      combatantsData: this.gameMode === "cashout" ? this.combatants.map(c => ({
        id: c.id,
        name: c.name,
        hp: c.player.hp,
        maxHp: c.player.maxHp,
        teamId: c.teamId ?? 0,
        coins: c.coins ?? 0,
        dead: !!(c.player.deadTimer && c.player.deadTimer > 0)
      })) : undefined,
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
      killFeed: this.killFeed.map(f => ({ id: f.id, type: f.type, text: f.text, teamColor: f.teamColor, killerName: f.killerName, victimName: f.victimName, weaponIconShape: f.weaponIconShape, weaponGlow: f.weaponGlow })),
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
            }))
        : undefined,
      dmTarget: this.isDM ? this.dmKillLimit : undefined,
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

    this.drawWalls(ctx);
    this.drawDeployables(ctx);
    if (this.gameMode === "cashout") {
      this.drawCashoutElements(ctx);
    }
    if (this.gameMode !== "biohazard" && this.gameMode !== "cashout" && !this.isDM) {
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
    if (this.isDM) {
      // draw every combatant (you + 3 bots) with its name + hp bar
      for (const c of this.combatants) {
        const q = c.player;
        if (q.deadTimer && q.deadTimer > 0) continue;
        
        // Draw carried pickables (cash box or statue)
        const hasBox = this.gameMode === "cashout" ? this.cashBoxes.find(b => b.carriedByCid === c.id) : null;
        const hasStatue = this.gameMode === "cashout" ? this.statues.find(s => s.carriedByCid === c.id) : null;
        
        if (hasBox || hasStatue) {
          ctx.save();
          ctx.translate(q.x, q.y - q.size - 10);
          
          if (hasBox) {
            ctx.fillStyle = "#fbbf24";
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(-6, -4, 12, 8);
            ctx.fill();
            ctx.stroke();
          } else if (hasStatue) {
            const teamColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
            const tColor = teamColors[hasStatue.teamId] || "#cbd5e1";
            ctx.fillStyle = "#1e293b";
            ctx.strokeStyle = tColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-3, 4);
            ctx.lineTo(-3, -1);
            ctx.lineTo(-5, -1);
            ctx.lineTo(-5, -3);
            ctx.lineTo(-3, -3);
            ctx.lineTo(-3, -6);
            ctx.arc(0, -6, 3, Math.PI, 0);
            ctx.lineTo(3, -3);
            ctx.lineTo(5, -3);
            ctx.lineTo(5, -1);
            ctx.lineTo(3, -1);
            ctx.lineTo(3, 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          
          ctx.restore();
        }

        this.drawNetCharacter(
          ctx,
          q.x,
          q.y,
          q.angle,
          c.character.id,
          c.outfit.id,
          c.gunIndex,
          c.guns,
          c.name,
          q.hp / q.maxHp,
          this.time,
          q.size
        );
        if (q.electrifiedTime && q.electrifiedTime > 0) {
          this.drawElectricArcs(ctx, q.x, q.y, q.size, q.electrifiedGlow ?? "#38bdf8", this.time);
        }
        if (q.iframes > 0 && q.dashTime <= 0) {
          ctx.save();
          ctx.globalAlpha = 0.35 + Math.sin(this.time * 20) * 0.15;
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size + 4, 0, Math.PI * 2);
          ctx.stroke();
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
          this.foe.size
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
    this.drawEffects(ctx);

    ctx.restore();

    this.drawCrosshair(ctx);
    this.drawOverlays(ctx);
  }

  private cityBg: HTMLCanvasElement | null = null;
  private cityBgKey = "";

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.sceneTheme;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

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
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, this.W * 0.4);
        rg.addColorStop(0, rgba(col, 0.18));
        rg.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }

    // floor — cyber city blits a cached, world-sized neon backdrop (one
    // drawImage per frame instead of hundreds of fills); other scenes a grid
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
      ctx.strokeStyle = theme.gridColor ?? "rgba(130,150,220,0.07)";
      ctx.lineWidth = 1;
      const step = 48;
      const offX = -this.camX % step;
      const offY = -this.camY % step;
      ctx.beginPath();
      for (let x = offX; x <= this.W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.H);
      }
      for (let y = offY; y <= this.H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(this.W, y);
      }
      ctx.stroke();
    }

    // vignette
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

  private drawArenaBorder(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = rgba(this.sceneTheme.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.worldW - 4, this.worldH - 4);
  }

  private drawCashoutElements(ctx: CanvasRenderingContext2D) {
    // Draw Vaults
    for (const v of this.vaults) {
      ctx.save();
      ctx.translate(v.x, v.y);
      
      // Base shape
      ctx.fillStyle = "#334155";
      ctx.fillRect(-20, -20, 40, 40);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(-20, -20, 40, 40);
      
      // Inner glowing panel based on state
      ctx.fillStyle = v.state === "idle" ? "#eab308" : v.state === "unlocking" ? "#f97316" : "#22c55e";
      ctx.fillRect(-10, -10, 20, 20);
      
      // Progress bar if unlocking
      if (v.state === "unlocking") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-20, 25, 40, 6);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-20, 25, 40 * v.progress, 6);
      }
      
      ctx.restore();
    }

    // Draw Cashout Stations
    for (const st of this.cashoutStations) {
      ctx.save();
      ctx.translate(st.x, st.y);
      
      // Base shape
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-25, -25, 50, 50);
      
      // Team color indicator
      let teamColor = "#94a3b8"; // Default neutral
      if (st.ownerTeam === 0) teamColor = "#3b82f6"; // Blue
      else if (st.ownerTeam === 1) teamColor = "#ef4444"; // Red
      else if (st.ownerTeam === 2) teamColor = "#10b981"; // Green
      else if (st.ownerTeam === 3) teamColor = "#f59e0b"; // Yellow
      
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(-25, -25, 50, 50);
      
      // Core state
      ctx.fillStyle = st.state === "idle" ? "#475569" : teamColor;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Cashout progress bar
      if (st.state === "cashout" || st.state === "stealing") {
        // Main cashout progress ring
        ctx.beginPath();
        ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.cashoutProgress);
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Steal progress bar
      if (st.state === "stealing") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-25, 30, 50, 6);
        ctx.fillStyle = "#a855f7"; // Steal color
        ctx.fillRect(-25, 30, 50 * st.stealProgress, 6);
      }
      
      ctx.restore();
    }

    // Draw Cash Boxes (when dropped)
    for (const box of this.cashBoxes) {
      if (box.carriedByCid !== null) continue; // drawn on the player
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-8, -6, 16, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      ctx.restore();
    }

    // Draw Statues (when dropped)
    for (const st of this.statues) {
      if (st.carriedByCid !== null) continue; // drawn on the player
      ctx.save();
      ctx.translate(st.x, st.y);
      
      const teamColors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
      const tColor = teamColors[st.teamId] || "#cbd5e1";

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = tColor;
      ctx.lineWidth = 2;
      
      // Draw statue shape (a tombstone or cross)
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(-6, -2);
      ctx.lineTo(-10, -2);
      ctx.lineTo(-10, -6);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, -12);
      ctx.arc(0, -12, 6, Math.PI, 0);
      ctx.lineTo(6, -6);
      ctx.lineTo(10, -6);
      ctx.lineTo(10, -2);
      ctx.lineTo(6, -2);
      ctx.lineTo(6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Revive progress
      if (st.reviveProgress > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-10, 12, 20, 4);
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(-10, 12, 20 * (st.reviveProgress / 5.0), 4);
      }
      
      ctx.restore();
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D) {
    for (const w of this.walls) {
      if (w.invisible) continue;
      ctx.save();
      if (w.building) {
        this.drawBuilding(ctx, w);
      } else if (w.glue) {
        // glue wall — translucent cyan gel
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, rgba("#22d3ee", 0.5));
        g.addColorStop(1, rgba("#0891b2", 0.4));
        ctx.fillStyle = g;
        roundRect(ctx, w.x, w.y, w.w, w.h, 8);
        ctx.fill();
        ctx.strokeStyle = rgba("#67e8f9", 0.7);
        ctx.lineWidth = 2;
        ctx.stroke();
        // bubbles
        ctx.fillStyle = rgba("#cffafe", 0.4);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(
            w.x + 10 + i * (w.w / 4),
            w.y + w.h / 2 + Math.sin(this.time * 2 + i) * 4,
            2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        const frac = Math.max(0, w.hp / w.maxHp);
        if (frac < 1) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
          ctx.fillStyle = rgba("#22d3ee", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
        }
      } else if (w.destructible) {
        const frac = Math.max(0, w.hp / w.maxHp);
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#c9a36a");
        g.addColorStop(1, "#8a6a3c");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(20,14,6,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(60,40,20,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const horiz = w.w >= w.h;
        if (horiz) {
          for (let i = 1; i < Math.floor(w.w / 16); i++) {
            ctx.moveTo(w.x + i * 16, w.y);
            ctx.lineTo(w.x + i * 16, w.y + w.h);
          }
        } else {
          for (let i = 1; i < Math.floor(w.h / 16); i++) {
            ctx.moveTo(w.x, w.y + i * 16);
            ctx.lineTo(w.x + w.w, w.y + i * 16);
          }
        }
        ctx.stroke();
        if (frac < 0.6) {
          ctx.strokeStyle = rgba("#1a120a", 0.7);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(w.x + w.w * 0.3, w.y + w.h * 0.5);
          ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.2);
          ctx.lineTo(w.x + w.w * 0.7, w.y + w.h * 0.6);
          ctx.stroke();
        }
        if (frac < 1) {
          const pw = w.w - 8;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw, 3);
          ctx.fillStyle = rgba("#fbbf24", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw * frac, 3);
        }
      } else {
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#5b6478");
        g.addColorStop(1, "#2a3140");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(10,12,28,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = "rgba(180,190,210,0.5)";
        const r = 1.6;
        for (const [rx, ry] of [
          [w.x + 5, w.y + 5],
          [w.x + w.w - 5, w.y + 5],
          [w.x + 5, w.y + w.h - 5],
          [w.x + w.w - 5, w.y + w.h - 5],
        ]) {
          ctx.beginPath();
          ctx.arc(rx, ry, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w.x, w.y, w.w, 3);
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
    ctx.beginPath();
    ctx.ellipse(w.x + w.w / 2, w.y + w.h + 6, w.w / 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
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

  /** Base concrete slab (gradient wallColor→wallDark) shared by every style. */
  private bldSlab(ctx: CanvasRenderingContext2D, w: Wall) {
    const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
    g.addColorStop(0, this.sceneTheme.wallColor || "#5b6478");
    g.addColorStop(1, this.sceneTheme.wallDark || "#2a3140");
    ctx.fillStyle = g;
    roundRect(ctx, w.x, w.y, w.w, w.h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(8,10,18,0.85)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, w.x, w.y, w.w, w.h, 10);
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

  /** 霓虹都市 — glass tower: neon inner trim + dense lit windows + rooftop hatch. */
  private bldNeon(ctx: CanvasRenderingContext2D, w: Wall) {
    const accent = this.sceneTheme.accent;
    this.bldSlab(ctx, w);
    ctx.strokeStyle = rgba(accent, 0.55);
    ctx.lineWidth = 2.5;
    roundRect(ctx, w.x + 3, w.y + 3, w.w - 6, w.h - 6, 9);
    ctx.stroke();
    this.bldWindows(ctx, w, w.seed ?? 1, accent, 22, 0.55, 0.5);
    const hw = Math.min(w.w, w.h) * 0.32;
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    roundRect(ctx, w.x + w.w / 2 - hw / 2, w.y + w.h / 2 - hw / 2, hw, hw, 4);
    ctx.fill();
    ctx.strokeStyle = rgba(accent, 0.4);
    ctx.lineWidth = 1;
    roundRect(ctx, w.x + w.w / 2 - hw / 2, w.y + w.h / 2 - hw / 2, hw, hw, 4);
    ctx.stroke();
  }

  /** 沙漠废墟 — adobe block: pale roof parapet, sparse warm windows, door arch. */
  private bldDesert(ctx: CanvasRenderingContext2D, w: Wall) {
    this.bldSlab(ctx, w);
    // flat roof parapet (lighter strip on top)
    ctx.fillStyle = "rgba(255,240,210,0.22)";
    roundRect(ctx, w.x + 2, w.y + 2, w.w - 4, Math.max(8, w.h * 0.1), 6);
    ctx.fill();
    // sparse, mostly-dark windows with the odd warm glow
    this.bldWindows(ctx, w, w.seed ?? 1, "#f59e0b", 30, 0.82, 0.5);
    // door arch at the bottom centre
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(ctx, w.x + w.w / 2 - 12, w.y + w.h - 22, 24, 22, 4);
    ctx.fill();
  }

  /** 冰原基地 — frozen bunker: snow cap, panel lines, icy windows, light rim. */
  private bldArctic(ctx: CanvasRenderingContext2D, w: Wall) {
    const accent = this.sceneTheme.accent;
    this.bldSlab(ctx, w);
    // snow cap
    ctx.fillStyle = "rgba(236,246,255,0.9)";
    roundRect(ctx, w.x + 2, w.y + 2, w.w - 4, Math.max(8, w.h * 0.14), 6);
    ctx.fill();
    // panel seams
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      const yy = w.y + (k * w.h) / 4;
      ctx.beginPath();
      ctx.moveTo(w.x, yy);
      ctx.lineTo(w.x + w.w, yy - 10);
      ctx.stroke();
    }
    this.bldWindows(ctx, w, w.seed ?? 1, accent, 24, 0.6, 0.5);
    // light icy rim
    ctx.strokeStyle = rgba(accent, 0.4);
    ctx.lineWidth = 1.5;
    roundRect(ctx, w.x + 3, w.y + 3, w.w - 6, w.h - 6, 9);
    ctx.stroke();
  }

  /** 末日废墟 — broken concrete: cracks, mostly-dark windows, rubble at the base. */
  private bldRuin(ctx: CanvasRenderingContext2D, w: Wall) {
    this.bldSlab(ctx, w);
    // deterministic cracks
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1.5;
    const seed = w.seed ?? 1;
    for (let n = 0; n < 3; n++) {
      const hh = Math.abs(Math.sin((seed * 12.9898 + n * 53.7) * 43758.5453));
      let x = w.x + (hh - Math.floor(hh)) * w.w;
      let y = w.y;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (y < w.y + w.h) {
        y += 14;
        x += ((Math.sin(y * 0.7 + n * 3 + seed) * 7) | 0);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // broken windows — almost all dark, rare dim red glow
    this.bldWindows(ctx, w, seed, "#ef4444", 26, 0.86, 0.3);
    // rubble at the base
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (let r = 0; r < 5; r++) {
      const hh = Math.abs(Math.sin((seed * 7.13 + r * 19.1) * 43758.5453));
      const rx = w.x + 6 + ((hh - Math.floor(hh)) * (w.w - 12));
      ctx.beginPath();
      ctx.arc(rx, w.y + w.h - 3, 2 + (r % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 赛博都市 — dark tower: neon grid overlay, bright vertical strips, hot windows. */
  private bldCyber(ctx: CanvasRenderingContext2D, w: Wall) {
    const accent = this.sceneTheme.accent;
    this.bldSlab(ctx, w);
    // neon grid overlay
    ctx.save();
    roundRect(ctx, w.x + 1, w.y + 1, w.w - 2, w.h - 2, 9);
    ctx.clip();
    ctx.strokeStyle = rgba(accent, 0.12);
    ctx.lineWidth = 1;
    for (let gx = w.x; gx < w.x + w.w; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, w.y);
      ctx.lineTo(gx, w.y + w.h);
      ctx.stroke();
    }
    for (let gy = w.y; gy < w.y + w.h; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(w.x, gy);
      ctx.lineTo(w.x + w.w, gy);
      ctx.stroke();
    }
    ctx.restore();
    // bright vertical neon strips
    ctx.fillStyle = rgba(accent, 0.35);
    ctx.fillRect(w.x + 6, w.y + 6, 4, w.h - 12);
    ctx.fillRect(w.x + w.w - 10, w.y + 6, 4, w.h - 12);
    this.bldWindows(ctx, w, w.seed ?? 1, accent, 20, 0.45, 0.6);
    // inner neon edge
    ctx.strokeStyle = rgba(accent, 0.5);
    ctx.lineWidth = 2;
    roundRect(ctx, w.x + 3, w.y + 3, w.w - 6, w.h - 6, 9);
    ctx.stroke();
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

  private drawDeployables(ctx: CanvasRenderingContext2D) {
    for (const d of this.deployables) {
      if (!this.inView(d.x, d.y, d.size + 40)) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, d.size * 0.7, d.size * 0.8, d.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // range indicator for turrets (faint)
      if (d.kind === "turret_mg" || d.kind === "turret_cannon") {
        ctx.strokeStyle = rgba(d.color, 0.12);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (d.kind === "turret_mg") {
        ctx.rotate(d.angle + Math.PI / 2);
        drawGadgetIcon(ctx, { iconShape: "turret_mg", color: d.color } as never, 0, 0, d.size * 2);
      } else if (d.kind === "turret_cannon") {
        ctx.rotate(d.angle + Math.PI / 2);
        drawGadgetIcon(ctx, { iconShape: "turret_cannon", color: d.color } as never, 0, 0, d.size * 2);
      } else if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
        // Mine blink animation
        const blink = d.armed <= 0 ? (Math.floor(this.time * 4) % 2 === 0 ? 1 : 0.4) : 0.5;
        const colorWithBlink = rgba(d.color, blink);
        drawGadgetIcon(ctx, { iconShape: d.kind, color: colorWithBlink } as never, 0, 0, d.size * 2.2);

        // Pulse ring when armed
        if (d.armed <= 0) {
          ctx.strokeStyle = rgba(d.color, 0.3);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 + (this.time * 20) % 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (d.kind === "healing_station") {
        // Range indicator
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Pulsing aura
        const pulse = 0.5 + Math.sin(this.time * 3) * 0.2;
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size * 2);
        rg.addColorStop(0, rgba(d.color, pulse * 0.5));
        rg.addColorStop(1, rgba(d.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Render station icon
        drawGadgetIcon(ctx, { iconShape: "healing_station", color: d.color } as never, 0, 0, d.size * 2);
      }
      ctx.restore();

      // hp bar for turrets & healing station
      if ((d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "healing_station") && d.hp < d.maxHp) {
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
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        rg.addColorStop(0, rgba(e.color, 0.35 * k));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        // floating bubbles
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.time;
          ctx.fillStyle = rgba(e.color, 0.4 * k);
          ctx.beginPath();
          ctx.arc(
            e.x + Math.cos(a) * e.radius * 0.6,
            e.y + Math.sin(a) * e.radius * 0.6 - (this.time * 20) % e.radius,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === "firefield") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        rg.addColorStop(0, rgba("#fde68a", 0.4 * k));
        rg.addColorStop(0.5, rgba(e.color, 0.35 * k));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawBase(ctx: CanvasRenderingContext2D, b: Base, mine: boolean) {
    const isEnemy = !mine;
    ctx.save();
    ctx.translate(b.x, b.y);
    const frac = b.hp / b.maxHp;
    const col = isEnemy
      ? (frac > 0.5 ? "#f87171" : frac > 0.25 ? "#fb923c" : "#ef4444")
      : (frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#f87171");

    ctx.save();
    ctx.rotate(b.t * 0.6);
    ctx.strokeStyle = rgba("#60a5fa", 0.25);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();

    const halo = ctx.createRadialGradient(0, 0, b.radius * 0.3, 0, 0, b.radius * 2);
    halo.addColorStop(0, rgba(col, 0.35));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(b.t * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * b.radius;
      const py = Math.sin(a) * b.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, b.radius);
    cg.addColorStop(0, b.flash > 0 ? "#ffffff" : "#dbeafe");
    cg.addColorStop(0.6, col);
    cg.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = "rgba(8,10,25,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.rotate(-b.t * 1.5);
    ctx.strokeStyle = rgba("#ffffff", 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * b.radius * 0.45;
      const py = Math.sin(a) * b.radius * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // on-map label so it's unambiguous which base is yours
    ctx.fillStyle = mine ? "rgba(186,230,253,0.95)" : "rgba(254,202,202,0.95)";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mine ? "己方基地" : "敌方基地", 0, b.radius + 40);

    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const pk of this.pickups) {
      if (!this.inView(pk.x, pk.y, 30)) continue;
      const y = pk.y + Math.sin(pk.bob) * 3;
      const blink = pk.life < 3 && Math.floor(pk.life * 6) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(pk.x, y);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      rg.addColorStop(0, rgba("#4ade80", 0.5));
      rg.addColorStop(1, rgba("#4ade80", 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bbf7d0";
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-7, -7, 14, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#065f46";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (!this.inView(p.x, p.y, p.size + 6)) continue;
      const a = Math.max(0, p.life / p.maxLife);
      if (p.coin) {
        // spinning coin — ellipse simulates rotation; once landed it lies flat
        // and stays put, fading only in its final 0.3s on the ground.
        const flightA = Math.min(1, Math.max(0, p.life / 0.3));
        const w = p.landed
          ? p.size * 1.3
          : Math.abs(Math.cos(p.spin ?? 0)) * p.size + 1;
        const h = p.landed ? p.size * 0.5 : p.size;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(p.color, Math.min(1, a * 1.5) * flightA);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba("#92400e", a * flightA);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
      } else {
        const sz = p.shrink ? p.size * a : p.size;
        ctx.fillStyle = rgba(p.color, a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
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
      drawGadgetIcon(ctx, { iconShape: gr.kind + "_grenade", color: color } as never, 0, 0, 15);
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
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.5);
        rg.addColorStop(0, rgba("#fb7185", 0.25));
        rg.addColorStop(1, rgba("#fb7185", 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
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
        // fallback simple circle
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        const body = e.hitFlash > 0.05 ? "#ffffff" : e.color;
        ctx.fillStyle = body;
        ctx.strokeStyle = shade(e.glow, -0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(e.size * 0.45, -e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.arc(e.size * 0.45, e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // poison cloud
      if (e.slowT > 0) {
        ctx.save();
        ctx.fillStyle = rgba("#84cc16", 0.2);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // active poison damage aura
      if ((e.poisonT ?? 0) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba("#a3e635", 0.22);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // hp bar
      if (e.hp < e.maxHp) {
        const w = Math.max(24, e.size * 2);
        const hpx = e.x - w / 2;
        const hpy = e.y - e.size - 12;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(hpx - 1, hpy - 1, w + 2, 6);
        ctx.fillStyle = rgba(e.glow, 0.9);
        ctx.fillRect(hpx, hpy, w * (e.hp / e.maxHp), 4);
      }

      // electric arcs from a lightsaber hit
      if (e.electrifiedTime && e.electrifiedTime > 0) {
        this.drawElectricArcs(ctx, e.x, e.y, e.size, e.electrifiedGlow ?? "#38bdf8", this.time);
      }
    }
  }

  private drawEnemyBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.enemyBullets) {
      if (!this.inView(b.x, b.y, b.size * 3 + 6)) continue;
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 3);
      rg.addColorStop(0, rgba(b.color, 0.9));
      rg.addColorStop(1, rgba(b.color, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBeam(ctx: CanvasRenderingContext2D) {
    if (!this.beamActive || !this.beamHit) return;
    const p = this.player;
    const g = this.gun;
    const ox = p.x + Math.cos(p.angle) * (p.size + 6);
    const oy = p.y + Math.sin(p.angle) * (p.size + 6);
    const ex = this.beamHit.point.x;
    const ey = this.beamHit.point.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 0.8 + Math.random() * 0.2;
    ctx.strokeStyle = rgba(g.glow, 0.22 * flick);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = rgba(g.glow, 0.5 * flick);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", 0.9 * flick);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 14);
    rg.addColorStop(0, rgba("#ffffff", 0.8));
    rg.addColorStop(0.5, rgba(g.glow, 0.7));
    rg.addColorStop(1, rgba(g.glow, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(ex, ey, 14, 0, Math.PI * 2);
    ctx.fill();
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
    const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, range);
    rg.addColorStop(0, rgba("#fde68a", 0.5));
    rg.addColorStop(0.4, rgba(g.glow, 0.35));
    rg.addColorStop(1, rgba(g.glow, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, range, p.angle - cone, p.angle + cone);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (p.shieldTime > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(this.time * 8) * 0.04;
      const rr = p.size * 2.1 * pulse;
      const alpha = Math.min(1, p.shieldTime / 0.6) * 0.7;
      ctx.strokeStyle = rgba("#60a5fa", alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba("#dbeafe", alpha * 0.6);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = this.time * 2 + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, rr, a, a + 0.5);
        ctx.stroke();
      }
      const rg = ctx.createRadialGradient(0, 0, rr * 0.6, 0, 0, rr);
      rg.addColorStop(0, rgba("#60a5fa", 0));
      rg.addColorStop(1, rgba("#60a5fa", alpha * 0.25));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // riot shield raised visual
    if (p.shieldBlockTime > 0 && this.gun.weaponClass === "shield") {
      const arc = this.gun.shieldArc ?? 0.7;
      const sr = p.size + 22;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = "lighter";
      const sg = ctx.createRadialGradient(0, 0, sr * 0.3, 0, 0, sr);
      sg.addColorStop(0, rgba("#3b82f6", 0.15));
      sg.addColorStop(1, rgba("#3b82f6", 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba("#60a5fa", 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.stroke();
      ctx.restore();
    }

    // bow draw visual — string pulled back
    if (p.bowDrawing && this.gun.weaponClass === "bow") {
      const maxT = this.gun.maxChargeTime ?? 1.2;
      const pct = Math.min(1, p.bowCharge / maxT);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = rgba(this.gun.glow, 0.5 * pct);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.size + 4, -8);
      ctx.lineTo(p.size + 4 - pct * 10, 0);
      ctx.lineTo(p.size + 4, 8);
      ctx.stroke();
      // charge glow
      if (pct > 0.1) {
        const cg = ctx.createRadialGradient(p.size + 4, 0, 0, p.size + 4, 0, 8 + pct * 6);
        cg.addColorStop(0, rgba(this.gun.glow, pct * 0.8));
        cg.addColorStop(1, rgba(this.gun.glow, 0));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.size + 4, 0, 8 + pct * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

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
      meleeSwing: swing,
      lunge: p.lunge,
    });

    // electric arcs from a lightsaber hit
    if (p.electrifiedTime && p.electrifiedTime > 0) {
      this.drawElectricArcs(ctx, p.x, p.y, p.size, p.electrifiedGlow ?? "#38bdf8", this.time);
    }

    if (p.iframes > 0 && p.dashTime <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 20) * 0.15;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Jagged, flickering ring used for explosive coin-bursts. */
  private drawJaggedRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
    lw: number
  ) {
    const n = 30;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const jr =
        r * (1 + Math.sin(a * 5 + this.time * 12) * 0.07 + (Math.random() - 0.5) * 0.06);
      const px = x + Math.cos(a) * jr;
      const py = y + Math.sin(a) * jr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  /** A single animated, forked lightning bolt drawn along +x from the origin.
   *  Uses this.time + per-frame jitter so it crackles like a living whip. */
  private drawBolt(
    ctx: CanvasRenderingContext2D,
    len: number,
    lateral: number,
    color: string,
    core: string,
    life: number,
    seed: number
  ) {
    const segs = 8;
    const jag = (1 - life) * 13 + 3;
    const tip = lateral + Math.sin(this.time * 24 + seed) * 7 * (1 - life);
    const yAt = (f: number) =>
      lateral * (1 - f) +
      tip * f +
      Math.sin(f * 8 + this.time * 20 + seed) * jag * Math.sin(f * Math.PI) +
      (Math.random() - 0.5) * (1 - life) * 6;
    const path = (col: string, lw: number) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(0, lateral * 0.25);
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        ctx.lineTo(len * f, yAt(f));
      }
      ctx.stroke();
    };
    path(rgba(color, (1 - life) * 0.7), 4 * (1 - life) + 1.5);
    path(rgba(core, (1 - life) * 0.95), 1.6 * (1 - life) + 0.6);
    // a forking branch partway down the bolt
    const fk = 0.55;
    const bx = len * fk;
    const by = yAt(fk);
    ctx.strokeStyle = rgba(core, (1 - life) * 0.5);
    ctx.lineWidth = 1 + (1 - life);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + len * 0.22, by + (lateral >= 0 ? 1 : -1) * (14 + Math.random() * 10));
    ctx.stroke();
  }

  private drawBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.bullets) {
      if (!this.inView(b.x, b.y - (b.z ?? 0), b.size * 3.4 + 6)) continue;
      if (b.z && b.z > 1) {
        // ground shadow at the (current) landing-projected position
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.size * 1.5, b.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // shell raised by its arc height (z-axis)
        ctx.globalCompositeOperation = "lighter";
        const rg0 = ctx.createRadialGradient(b.x, b.y - b.z, 0, b.x, b.y - b.z, b.size * 3);
        rg0.addColorStop(0, rgba(b.glow, 0.9));
        rg0.addColorStop(1, rgba(b.glow, 0));
        ctx.fillStyle = rg0;
        ctx.beginPath();
        ctx.arc(b.x, b.y - b.z, b.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y - b.z, b.size, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 3.4);
      rg.addColorStop(0, rgba(b.glow, 0.85));
      rg.addColorStop(1, rgba(b.glow, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Crackling electric arcs that cling to an electrified avatar/enemy. */
  private drawElectricArcs(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    color: string,
    time: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const bolts = 6;
    for (let i = 0; i < bolts; i++) {
      const a0 = (i / bolts) * Math.PI * 2 + time * 4;
      const a1 = a0 + 1.1 + Math.sin(time * 9 + i * 1.7) * 0.5;
      ctx.beginPath();
      let ang = a0;
      let rad = r * 0.55;
      ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      const segs = 4;
      for (let s = 1; s <= segs; s++) {
        ang = a0 + (a1 - a0) * (s / segs) + (Math.random() - 0.5) * 0.6;
        rad = r * 0.55 + r * 1.15 * (s / segs);
        ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      // outer colored bolt
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // inner white-hot core
      ctx.strokeStyle = rgba("#ffffff", 0.7);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // thin charged ring
    ctx.strokeStyle = rgba(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawEffects(ctx: CanvasRenderingContext2D, list: Effect[] = this.effects) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of list) {
      const k = e.t / e.duration;
      if (e.type === "explosion") {
        const r = e.radius * (0.3 + k * 0.9);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.9));
        rg.addColorStop(0.4, rgba(e.color, (1 - k) * 0.7));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "shock") {
        const r = e.radius * (0.5 + k * 0.8);
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "spawn") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * k, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "debris") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "coinburst") {
        // expanding shockwave — tinted by kill style, biased by bullet direction
        const style = e.style ?? "bullet";
        const c1 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[0];
        const c2 = (COIN_STYLE[style] ?? COIN_STYLE.bullet)[1] ?? "#fbbf24";
        const r = e.radius * (0.3 + k * 1.25);
        if (style === "explosive") {
          // aggressive jagged double ring
          this.drawJaggedRing(ctx, e.x, e.y, r, c1, (1 - k) * 0.95, 7 * (1 - k) + 2);
          this.drawJaggedRing(ctx, e.x, e.y, r * 0.66, c2, (1 - k) * 0.7, 3.5 * (1 - k) + 1);
        } else {
          ctx.strokeStyle = rgba(c1, (1 - k) * 0.95);
          ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = rgba(c2, (1 - k) * 0.6);
          ctx.lineWidth = 3 * (1 - k) + 0.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
        // bright flash core
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.5));
        rg.addColorStop(0.5, rgba(c1, (1 - k) * 0.3));
        rg.addColorStop(1, rgba(c2, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        // directional leading crescent — coins spray with the bullet's travel
        const dx = e.dirX ?? 0, dy = e.dirY ?? 0;
        const dl = Math.hypot(dx, dy);
        if (dl > 0.01) {
          const ang = Math.atan2(dy, dx);
          ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
          ctx.lineWidth = 5 * (1 - k) + 1.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.92, ang - 0.9, ang + 0.9);
          ctx.stroke();
          ctx.strokeStyle = rgba(c1, (1 - k) * 0.8);
          ctx.lineWidth = 9 * (1 - k) + 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, r * 0.92, ang - 0.5, ang + 0.5);
          ctx.stroke();
        }
      } else if (e.type === "slash") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        const arc = e.arc ?? 2;
        const range = e.range ?? 60;
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.5 + k * 0.6), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * (0.6 + k * 0.5), -arc / 2, arc / 2);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === "saberswing") {
        // bright energy sweep of the blade, fading as it completes
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const arc = e.arc ?? 2.5;
        const range = e.range ?? 80;
        // soft outer glow wedge
        const rg = ctx.createRadialGradient(0, 0, range * 0.15, 0, 0, range * 1.05);
        rg.addColorStop(0, rgba(e.color, (1 - k) * 0.45));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.85 + k * 0.2), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        // white-hot outer edge of the blade sweep
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        // colored energy core
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.95);
        ctx.lineWidth = 9 * (1 - k) + 2;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        // leading bright tip
        const tipA = -arc / 2 + arc * k;
        ctx.fillStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(tipA) * range * 0.92, Math.sin(tipA) * range * 0.92, 3 * (1 - k) + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.type === "whip") {
        // living, crackling energy whip — several forking bolts + glow halo
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const range = e.range ?? 90;
        const life = e.t / e.duration;
        const seed = (e.arc ?? 0) * 17.3;
        // soft glow halo trailing the whip stroke
        const halo = ctx.createRadialGradient(range * 0.4, 0, 0, range * 0.4, 0, range * 0.6);
        halo.addColorStop(0, rgba(e.color, (1 - life) * 0.22));
        halo.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(range * 0.4, 0, range * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // multiple forking bolts so it reads as a thrashing whip, not a stiff line
        const bolts = 3;
        for (let bi = 0; bi < bolts; bi++) {
          const lateral = (bi - (bolts - 1) / 2) * 8;
          this.drawBolt(ctx, range, lateral, e.color, "#ffffff", life, seed + bi * 6.1);
        }
        ctx.restore();
      } else if (e.type === "slam") {
        const r = e.radius * (0.3 + k);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.8));
        rg.addColorStop(0.5, rgba(e.color, (1 - k) * 0.6));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.7), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "flamecone") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, e.range ?? 150, -(e.arc ?? 0.4), e.arc ?? 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (e.type === "glue") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "skillcast") {
        // bright expanding ring + core flash when a skill is cast
        const r = e.radius * (0.4 + k * 1.1);
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
        ctx.lineWidth = 4 * (1 - k) + 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.6));
        rg.addColorStop(0.5, rgba(e.color, (1 - k) * 0.35));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
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
    ctx.moveTo(x, y);
    const steps = Math.round(sim.fuse * 60);
    for (let i = 0; i < steps; i++) {
      x += vx * dt;
      y += vy * dt;
      vx *= r;
      vy *= r;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // landing marker
    ctx.fillStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.9);
    ctx.beginPath();
    ctx.arc(sim.landX, sim.landY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
    ctx.save();
    // line from player to target
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.25)" : rgba(def.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range ring around the player
    ctx.strokeStyle = rgba(def.color, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, this.gadgetRange(def), 0, Math.PI * 2);
    ctx.stroke();
    // ghost coverage + marker at the target
    ctx.globalAlpha = blocked ? 0.35 : 0.6;
    ctx.fillStyle = rgba(def.color, 0.22);
    ctx.beginPath();
    ctx.arc(tx, ty, coverage, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.45)" : rgba(def.color, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Deployable-style targeting marker for the 投射榴弹炮. Mirrors drawPlaceMarker:
   *  a dashed line from the player to the (clamped) landing point, a max-range
   *  ring drawn around the player, and a coverage circle sized to the blast
   *  radius. The landing marker is clamped to the ring, so when the cursor is
   *  past max range the shell lands on the ring edge — never at the raw mouse. */
  private drawLauncherIndicator(ctx: CanvasRenderingContext2D) {
    if (this.gameOver || this.paused) return;
    const p = this.player;
    const g = this.gun;
    const radius = g.explosionRadius ?? 60;
    const tgt = this.mortarTarget(g);
    const tx = tgt.x;
    const ty = tgt.y;
    const col = g.glow;
    const cx = p.x - this.camX;
    const cy = p.y - this.camY;
    const sx = tx - this.camX;
    const sy = ty - this.camY;
    ctx.save();
    // dashed line from player to (clamped) landing point
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = tgt.beyond ? rgba(col, 0.3) : rgba(col, 0.55);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    // max-range ring around the player (like deployable placement)
    ctx.strokeStyle = rgba(col, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, tgt.maxD, 0, Math.PI * 2);
    ctx.stroke();
    // ghost blast coverage at the landing point
    ctx.globalAlpha = tgt.beyond ? 0.35 : 0.6;
    ctx.fillStyle = rgba(col, 0.22);
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // landing marker ring
    ctx.strokeStyle = rgba(col, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.stroke();
    // center dot
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    // hide the mouse reticle on touch devices (aim is handled by aim assist)
    if (this.touchMode) return;
    const { x, y } = this.mouse;
    const sx = x - this.camX;
    const sy = y - this.camY;
    ctx.save();
    ctx.strokeStyle = rgba("#e2e8f0", 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.moveTo(sx - 14, sy);
    ctx.lineTo(sx - 5, sy);
    ctx.moveTo(sx + 5, sy);
    ctx.lineTo(sx + 14, sy);
    ctx.moveTo(sx, sy - 14);
    ctx.lineTo(sx, sy - 5);
    ctx.moveTo(sx, sy + 5);
    ctx.lineTo(sx, sy + 14);
    ctx.stroke();
    ctx.fillStyle = rgba(this.gun.glow, 0.9);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawOverlays(ctx: CanvasRenderingContext2D) {
    if (this.timewarp > 0) {
      ctx.fillStyle = rgba("#a855f7", 0.1);
      ctx.fillRect(0, 0, this.W, this.H);
    }
    
    // Draw interaction progress bar
    if (this.gameMode === "cashout" && this.humanInteractProgress > 0) {
      const cx = this.W / 2;
      const cy = this.H / 2 + 55;
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - 70, cy - 8, 140, 16);
      ctx.strokeRect(cx - 70, cy - 8, 140, 16);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(cx - 68, cy - 6, 136 * this.humanInteractProgress, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.humanInteractLabel, cx, cy - 14);
    }
    const p = this.player;
    const hpFrac = p.hp / p.maxHp;
    if (hpFrac < 0.35 && !this.gameOver) {
      const pulse = 0.25 + Math.sin(this.time * 6) * 0.12;
      const rg = ctx.createRadialGradient(
        this.W / 2,
        this.H / 2,
        this.H * 0.3,
        this.W / 2,
        this.H / 2,
        this.H * 0.8
      );
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, rgba("#ef4444", pulse * (1 - hpFrac)));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    const bf = this.base.hp / this.base.maxHp;
    if (bf < 0.3 && !this.gameOver) {
      const pulse = 0.2 + Math.sin(this.time * 5) * 0.1;
      ctx.fillStyle = rgba("#ef4444", pulse * (0.3 - bf));
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  // ---- Ranked Cashout mode helper methods ----
  public humanInteractProgress = 0;
  public humanInteractLabel = "";

  private spawnVault() {
    if (this.vaults.length >= 2) return;
    const padding = 200;
    const x = padding + Math.random() * (this.worldW - padding * 2);
    const y = padding + Math.random() * (this.worldH - padding * 2);
    const id = this.vaultSeq++;
    this.vaults.push({
      id,
      x,
      y,
      size: 16,
      state: "preheat",
      timer: 15,
      unlockingTeamId: null,
    });
  }

  private spawnCashoutStation() {
    if (this.cashoutStations.length >= 2) return;
    const padding = 200;
    const x = padding + Math.random() * (this.worldW - padding * 2);
    const y = padding + Math.random() * (this.worldH - padding * 2);
    const id = this.stationSeq++;
    this.cashoutStations.push({
      id,
      x,
      y,
      size: 20,
      state: "idle",
      cash: 0,
      timer: 0,
      ownerTeamId: null,
      stealerCid: null,
      stealTimer: 0,
      boxCount: 0,
      challengerTeamId: null,
    });
  }

  private unlockVault(v: Vault) {
    const id = this.boxSeq++;
    this.cashBoxCount++;
    let value = 10000;
    if (this.cashBoxCount > 4) value = 22000;
    else if (this.cashBoxCount > 2) value = 15000;

    this.cashBoxes.push({
      id,
      x: v.x,
      y: v.y,
      vx: 0,
      vy: 0,
      size: 10,
      value,
      carriedByCid: null,
      throwTimer: 0,
      thrownByCid: null,
    });

    if (v.unlockingTeamId !== null) {
      this.teamCash[v.unlockingTeamId] += 1000;
      const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
      this.addScoreFeed(v.unlockingTeamId === 0 ? "我方解锁保险箱！" : `${teamNames[v.unlockingTeamId]} 解锁了保险箱！`, 1000);
      this.banner = { text: v.unlockingTeamId === 0 ? "已获得保险箱现金盒！" : "警告：敌方解锁了保险箱！", t: 2.0 };
    }

    this.vaults = this.vaults.filter((val) => val.id !== v.id);
  }

  private endCashoutMatch() {
    this.gameOver = true;
    this.running = false;
    
    // Sort teams by cash
    const rank = [0, 1, 2, 3].sort((a, b) => this.teamCash[b] - this.teamCash[a]);
    const isWin = rank[0] === 0 || rank[1] === 0; // Top 2 win
    
    const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
    const results = rank.map((tid, idx) => `${idx + 1}. ${teamNames[tid]} ($${this.teamCash[tid]})`).join("\n");
    const endMsg = isWin
      ? `恭喜获胜晋级！\n\n对局排名结算：\n${results}`
      : `淘汰！未能进入前二。\n\n对局排名结算：\n${results}`;
      
    this.endGame(endMsg);
  }

  private collideBoxWithWalls(box: { x: number; y: number; vx: number; vy: number; size: number }) {
    const r = box.size;
    for (const w of this.walls) {
      if (w.hp <= 0) continue;
      if (
        box.x + r > w.x &&
        box.x - r < w.x + w.w &&
        box.y + r > w.y &&
        box.y - r < w.y + w.h
      ) {
        if (Math.abs(box.vx) > Math.abs(box.vy)) {
          box.vx *= -0.5;
          if (box.vx > 0) box.x = w.x + w.w + r;
          else box.x = w.x - r;
        } else {
          box.vy *= -0.5;
          if (box.vy > 0) box.y = w.y + w.h + r;
          else box.y = w.y - r;
        }
      }
    }
  }

  private isInteracting(c: Combatant, tx: number, ty: number, dist: number): boolean {
    const d = Math.hypot(c.player.x - tx, c.player.y - ty);
    if (d > dist) return false;
    if (c.id === 0) return this.keys.has("KeyF");
    return true; // bots automatically maintain interaction
  }

  private reviveCombatant(c: Combatant, safeSpawn = false) {
    c.player.hp = c.player.maxHp;
    c.player.deadTimer = 0;
    c.respawnTimer = 0;
    if (safeSpawn) {
      const padding = 200;
      let rx = padding + Math.random() * (this.worldW - padding * 2);
      let ry = padding + Math.random() * (this.worldH - padding * 2);
      c.player.x = rx;
      c.player.y = ry;
    }
    this.spawnParticles(c.player.x, c.player.y, "#22c55e", 20, 150, 0.5);
  }

  private updateCashoutMode(dt: number) {
    if (this.gameOver) return;

    // 1. Tick match timer
    this.cashoutTimeLeft -= dt;
    if (this.cashoutTimeLeft <= 0) {
      this.cashoutTimeLeft = 0;
      const activeCashout = this.cashoutStations.some(st => st.state === "cashout" || st.state === "stealing");
      if (activeCashout && !this.isOvertime) {
        this.isOvertime = true;
        this.banner = { text: "加时赛开始！(最多 1 分钟)", t: 3.0 };
      }
      
      if (this.isOvertime) {
        if (Math.abs(this.cashoutTimeLeft) >= 60 || !activeCashout) {
          this.endCashoutMatch();
        }
      } else {
        this.endCashoutMatch();
      }
    }

    // 2. Tick Vault preheating
    for (const v of this.vaults) {
      if (v.state === "preheat") {
        v.timer -= dt;
        if (v.timer <= 0) {
          v.state = "idle";
          v.timer = 0;
          this.addScoreFeed("保险箱已就绪", 0);
        }
      }
    }

    // 3. Tick Cash Boxes physics and carrying
    for (const box of this.cashBoxes) {
      if (box.carriedByCid !== null) {
        const carrier = this.combatants.find(c => c.id === box.carriedByCid);
        if (carrier && carrier.player.hp > 0) {
          box.x = carrier.player.x;
          box.y = carrier.player.y - 15;
          box.vx = 0;
          box.vy = 0;
        } else {
          box.carriedByCid = null;
          box.throwTimer = 1.0;
        }
      } else {
        if (box.throwTimer > 0) {
          box.throwTimer -= dt;
        }
        
        // Auto-attract to cashout stations
        let attracted = false;
        for (const st of this.cashoutStations) {
          const d = Math.hypot(st.x - box.x, st.y - box.y);
          if (d < 250) {
            // Apply strong acceleration towards station
            const angle = Math.atan2(st.y - box.y, st.x - box.x);
            box.vx += Math.cos(angle) * 1500 * dt;
            box.vy += Math.sin(angle) * 1500 * dt;
            attracted = true;
            break;
          }
        }
        
        box.x += box.vx * dt;
        box.y += box.vy * dt;
        if (!attracted) {
          box.vx *= Math.pow(0.1, dt);
          box.vy *= Math.pow(0.1, dt);
        } else {
          // Less friction during attract so it snaps quickly
          box.vx *= Math.pow(0.5, dt);
          box.vy *= Math.pow(0.5, dt);
        }
        
        const margin = box.size;
        if (box.x < margin) { box.x = margin; box.vx *= -0.5; }
        if (box.x > this.worldW - margin) { box.x = this.worldW - margin; box.vx *= -0.5; }
        if (box.y < margin) { box.y = margin; box.vy *= -0.5; }
        if (box.y > this.worldH - margin) { box.y = this.worldH - margin; box.vy *= -0.5; }

        this.collideBoxWithWalls(box);

        const speed = Math.hypot(box.vx, box.vy);
        if (speed > 120) {
          for (const c of this.combatants) {
            if (c.player.hp > 0 && c.id !== box.thrownByCid) {
              const d = Math.hypot(c.player.x - box.x, c.player.y - box.y);
              if (d < c.player.size + box.size) {
                this.damagePlayerEntity(c.player, 50, undefined, 0, 0, box.thrownByCid ?? undefined);
                box.vx = 0;
                box.vy = 0;
                box.thrownByCid = null;
                this.spawnParticles(box.x, box.y, "#fbbf24", 15, 100, 0.4);
                break;
              }
            }
          }
        } else {
          for (const c of this.combatants) {
            if (c.player.hp > 0 && box.throwTimer <= 0) {
              const d = Math.hypot(c.player.x - box.x, c.player.y - box.y);
              if (d < c.player.size + box.size + 10) {
                box.carriedByCid = c.id;
                box.vx = 0;
                box.vy = 0;
                box.throwTimer = 0;
                box.thrownByCid = null;
                c.selectedGadget = -1;
                this.addScoreFeed(c.id === 0 ? "你拾取了现金盒" : `${c.name} 拾取了现金盒`, 0);
                break;
              }
            }
          }
        }

        // Check insertion into Cashout Stations
        for (const st of this.cashoutStations) {
          const d = Math.hypot(st.x - box.x, st.y - box.y);
          if (d < st.size + box.size + 15) {
            const inserterCid = box.thrownByCid !== null ? box.thrownByCid : 0;
            const inserterTeam = this.combatants.find(c => c.id === inserterCid)?.teamId ?? 0;
            
            this.cashBoxes = this.cashBoxes.filter(b => b.id !== box.id);
            
            const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
            const instantReward = Math.round(box.value * 0.2);
            this.teamCash[inserterTeam] += instantReward;
            
            st.cash += box.value;
            st.timer = 120;
            st.ownerTeamId = inserterTeam;
            st.boxCount++;
            st.state = "cashout";
            
            this.addScoreFeed(`${teamNames[inserterTeam]} 塞入现金盒，即时获得 $${instantReward}`, instantReward);
            this.banner = { text: inserterTeam === 0 ? "提现已启动！保护提现站！" : "警告：敌方启动了提现站！", t: 2.5 };
            
            if (st.boxCount === 2) {
              st.challengerTeamId = inserterTeam;
              this.addScoreFeed(`🚨 ${teamNames[inserterTeam]} 触发了双重危机！`, 0);
              this.banner = { text: "双重危机！最终结算若不属于该队，将扣除 50% 资产！", t: 3.5 };
            }
            break;
          }
        }
      }
    }

    // 3b. Tick Statues physics, carrying, and reviving
    for (const st of this.statues) {
      if (st.carriedByCid !== null) {
        const carrier = this.combatants.find(c => c.id === st.carriedByCid);
        if (carrier && carrier.player.hp > 0) {
          st.x = carrier.player.x;
          st.y = carrier.player.y - 15;
          st.vx = 0;
          st.vy = 0;
        } else {
          st.carriedByCid = null;
          st.throwTimer = 1.0;
        }
      } else {
        if (st.throwTimer > 0) {
          st.throwTimer -= dt;
        }
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        st.vx *= Math.pow(0.1, dt);
        st.vy *= Math.pow(0.1, dt);
        
        const margin = st.size;
        if (st.x < margin) { st.x = margin; st.vx *= -0.5; }
        if (st.x > this.worldW - margin) { st.x = this.worldW - margin; st.vx *= -0.5; }
        if (st.y < margin) { st.y = margin; st.vy *= -0.5; }
        if (st.y > this.worldH - margin) { st.y = this.worldH - margin; st.vy *= -0.5; }

        this.collideBoxWithWalls(st);

        // Check if players want to pick up the statue
        if (st.throwTimer <= 0) {
          for (const c of this.combatants) {
            if (c.player.hp > 0) {
              const d = Math.hypot(c.player.x - st.x, c.player.y - st.y);
              if (d < c.player.size + st.size + 10 && this.isInteracting(c, st.x, st.y, c.player.size + st.size + 20)) {
                // Wait, F picks it up, but the prompt says: "long press V to revive for 5s".
                // We'll let pickup happen if they interact and aren't holding V.
                // But how to differentiate F and V? Right now `isInteracting` checks F.
                // I will add V button logic later. For now, F picks up.
                const isHoldingV = c.id === 0 ? this.keys.has("KeyV") : false; // For now bots don't use V
                if (!isHoldingV) {
                  st.carriedByCid = c.id;
                  st.vx = 0;
                  st.vy = 0;
                  st.throwTimer = 0;
                  st.thrownByCid = null;
                  c.selectedGadget = -1;
                  break;
                }
              }
            }
          }
        }

        // Revive logic (V key)
        let isBeingRevived = false;
        for (const c of this.combatants) {
          if (c.player.hp > 0 && c.teamId === st.teamId && c.id !== st.deadCid) {
            const d = Math.hypot(c.player.x - st.x, c.player.y - st.y);
            const isHoldingV = c.id === 0 ? this.keys.has("KeyV") : false; // Bots don't revive yet
            if (d < c.player.size + st.size + 30 && isHoldingV) {
              isBeingRevived = true;
              break;
            }
          }
        }
        
        if (isBeingRevived) {
          st.reviveProgress += dt;
          if (st.reviveProgress >= 5.0) {
            // Revive!
            const deadC = this.combatants.find(c => c.id === st.deadCid);
            if (deadC && deadC.player.hp <= 0) {
              deadC.player.hp = deadC.player.maxHp;
              deadC.player.x = st.x;
              deadC.player.y = st.y;
              deadC.deadTimer = 0;
              deadC.respawnTimer = 0;
              this.statues = this.statues.filter(s => s.id !== st.id);
              this.addScoreFeed(deadC.id === 0 ? "你已被复活" : `${deadC.name} 已被复活`, 0);
            }
          }
        } else {
          st.reviveProgress = 0;
        }
      }
    }

    // 4. Tick Cashout Stations
    for (let i = this.cashoutStations.length - 1; i >= 0; i--) {
      const st = this.cashoutStations[i];
      if (st.state === "cashout" || st.state === "stealing") {
        st.timer -= dt;
        
        if (st.state === "stealing" && st.stealerCid !== null) {
          const stealer = this.combatants.find(c => c.id === st.stealerCid);
          if (stealer && stealer.player.hp > 0 && this.isInteracting(stealer, st.x, st.y, 60)) {
            st.stealTimer += dt;
            if (st.stealTimer >= 7) {
              const oldOwner = st.ownerTeamId;
              st.ownerTeamId = stealer.teamId ?? 0;
              st.state = "cashout";
              st.stealerCid = null;
              st.stealTimer = 0;
              
              this.teamCash[st.ownerTeamId] += 1000;
              
              const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
              this.addScoreFeed(st.ownerTeamId === 0 ? "提现站已被我方偷取！" : `提现站已被 ${teamNames[st.ownerTeamId]} 偷取！`, 1000);
              this.banner = { text: st.ownerTeamId === 0 ? "提现站已归我方所有！" : "警告：提现站已被敌方偷取！", t: 2.0 };
            }
          } else {
            st.state = "cashout";
            st.stealerCid = null;
            st.stealTimer = 0;
          }
        }

        if (st.timer <= 0) {
          st.state = "settled";
          const winningTeam = st.ownerTeamId ?? 0;
          const cashReward = st.cash;
          
          this.teamCash[winningTeam] += cashReward;
          
          if (st.challengerTeamId !== null && st.challengerTeamId !== winningTeam) {
            const penalisedTeam = st.challengerTeamId;
            const lostCash = Math.round(this.teamCash[penalisedTeam] * 0.5);
            this.teamCash[penalisedTeam] -= lostCash;
            const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
            this.addScoreFeed(`${teamNames[penalisedTeam]} 双重危机挑战失败！扣除资产 $${lostCash}`, 0);
          }

          const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
          this.addScoreFeed(`${teamNames[winningTeam]} 提现结算完成！获得 $${cashReward}`, cashReward);
          
          this.spawnCoinBurstFX(st.x, st.y, st.size * 2, false, false, "", 0, -50);

          this.cashoutStations = this.cashoutStations.filter(s => s.id !== st.id);
          this.spawnVault();
          this.spawnCashoutStation();
        }
      }
    }

    // 5. Teammate Revives & General Interaction Logic
    this.humanInteractProgress = 0;
    this.humanInteractLabel = "";

    for (const c of this.combatants) {
      if (c.player.hp <= 0) {
        if (c.deadTimer && c.deadTimer > 0) {
          c.deadTimer -= dt;
          if (c.deadTimer <= 0) {
            c.deadTimer = 0;
            if (c.coins && c.coins > 0) {
              c.coins--;
              this.reviveCombatant(c);
              this.addScoreFeed(c.id === 0 ? "你已自主复活" : `${c.name} 已使用复活币复活`, 0);
            }
          }
        }
        continue; 
      }

      const wantsInteract = c.id === 0 ? this.keys.has("KeyF") : true;

      // A. Revive teammate
      let revivingTeammate = false;
      for (const t of this.combatants) {
        if (t.teamId === c.teamId && t.id !== c.id && t.player.hp <= 0) {
          const d = Math.hypot(t.player.x - c.player.x, t.player.y - c.player.y);
          if (d < 50 && wantsInteract) {
            t.deadTimer = (t.deadTimer ?? 0) - dt;
            if (!t.deadTimer || t.deadTimer > 4) t.deadTimer = 4;
            t.deadTimer -= dt * 2.0;
            
            if (c.id === 0) {
              this.humanInteractProgress = Math.max(0, Math.min(1, 1 - (t.deadTimer / 4)));
              this.humanInteractLabel = `正在复活队友: ${t.name}`;
            }

            if (t.deadTimer <= 0) {
              this.reviveCombatant(t);
              this.addScoreFeed(c.id === 0 ? `你复活了队友: ${t.name}` : `${c.name} 复活了队友: ${t.name}`, 0);
            }
            revivingTeammate = true;
            break;
          }
        }
      }
      if (revivingTeammate) continue;

      // B. Vault unlocking
      for (const v of this.vaults) {
        if (v.state === "idle" || (v.state === "unlocking" && v.unlockingTeamId === c.teamId)) {
          const d = Math.hypot(v.x - c.player.x, v.y - c.player.y);
          if (d < 50 && wantsInteract) {
            v.state = "unlocking";
            v.unlockingTeamId = c.teamId ?? 0;
            v.timer += dt;
            
            if (c.id === 0) {
              this.humanInteractProgress = Math.max(0, Math.min(1, v.timer / 20));
              this.humanInteractLabel = "正在解锁保险箱...";
            }

            if (v.timer >= 20) {
              this.unlockVault(v);
            }
            break;
          }
        } else if (v.state === "unlocking" && v.unlockingTeamId !== c.teamId) {
          const d = Math.hypot(v.x - c.player.x, v.y - c.player.y);
          if (d < 50 && wantsInteract) {
            v.unlockingTeamId = c.teamId ?? 0;
            v.timer = 0.5;
            this.addScoreFeed(c.id === 0 ? "你正在接管保险箱！" : `${c.name} 正在接管保险箱！`, 0);
            break;
          }
        }
      }

      // C. Cashout Station steal
      for (const st of this.cashoutStations) {
        if ((st.state === "cashout" || st.state === "stealing") && st.ownerTeamId !== c.teamId) {
          const d = Math.hypot(st.x - c.player.x, st.y - c.player.y);
          if (d < 50 && wantsInteract) {
            st.state = "stealing";
            st.stealerCid = c.id;
            if (c.id === 0) {
              this.humanInteractProgress = Math.max(0, Math.min(1, st.stealTimer / 7));
              this.humanInteractLabel = "正在偷取提现站...";
            }
            break;
          }
        }
      }
    }

    // 6. Check Team Wipes
    const activeTeams = [0, 1, 2, 3];
    for (const teamId of activeTeams) {
      const members = this.combatants.filter(c => c.teamId === teamId);
      const allDead = members.every(c => c.player.hp <= 0);
      if (allDead) {
        const anyWipeActive = members.some(c => (c.respawnTimer ?? 0) > 0);
        if (!anyWipeActive) {
          const currentCash = this.teamCash[teamId];
          const lostAmount = Math.round(currentCash * 0.15);
          this.teamCash[teamId] -= lostAmount;
          
          const teamNames = ["玩家小队", "太阳小队", "闪电小队", "暗影小队"];
          this.addScoreFeed(teamId === 0 ? `我方队伍团灭！扣除 $${lostAmount}` : `${teamNames[teamId]} 团灭！扣除 $${lostAmount}`, 0);
          
          this.statues = this.statues.filter(s => s.teamId !== teamId);

          for (const m of members) {
            m.respawnTimer = 17;
            m.player.deadTimer = 17;
          }
        } else {
          for (const m of members) {
            if (m.respawnTimer && m.respawnTimer > 0) {
              m.respawnTimer -= dt;
              m.player.deadTimer = m.respawnTimer;
              if (m.respawnTimer <= 0) {
                m.respawnTimer = 0;
                m.player.deadTimer = 0;
                this.reviveCombatant(m, true);
                if (m.id === 0) {
                  this.addScoreFeed("队伍强制复活已完成", 0);
                }
              }
            }
          }
        }
      }
    }
  }
}
