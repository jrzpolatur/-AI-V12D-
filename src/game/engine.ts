import { GUNS, GADGETS, getCharacter, getOutfit, getSkill, SCENES, CHARACTERS, OUTFITS } from "./content";
import type { GunDef, SkillDef, WeaponClass, GadgetDef, GadgetKind, CharacterDef, OutfitDef } from "./types";
import { drawCharacter, drawWeaponIcon, drawGadgetIcon, rgba, shade, roundRect, DARK } from "./draw";
import { sound } from "./sound";
import { RUNTIME } from "./runtimeConfig";
import type { NetMode, InputFrame, Snapshot, SnapPlayer, SnapEnemy, SnapBullet } from "../net/protocol";
import type { Net } from "../net/Net";

export interface Loadout {
  characterId: string;
  outfitId: string;
  gunId: string;
  gunIds: string[];
  skillId: string;
  /** carried gadgets (max 3). Empty -> first 3 GADGETS. */
  gadgetIds?: string[];
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
  banner: string | null;
  kills: number;
  gold: number;
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
}

interface Effect {
  type: "explosion" | "shock" | "spawn" | "slash" | "slam" | "debris" | "coinburst" | "poisoncloud" | "firefield" | "flamecone" | "glue";
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
  kind: "frag" | "glue";
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
}

interface BeamHit {
  point: { x: number; y: number };
  enemy: Enemy | null;
  wall: Wall | null;
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

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
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
  private last = 0;
  private running = false;

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
  private walls: Wall[] = [];
  private deployables: Deployable[] = [];
  private base!: Base;
  private enemyBase!: Base;
  private weaponStates = new Map<string, WeaponState>();

  private guns = GUNS;
  private gunIndex = 0;
  /** gadgets the player is carrying this run (max 3) */
  private gadgets: GadgetDef[] = [];
  /** index of last gadget used via scroll, for wheel cycling */
  private lastGadget = 0;
  /** semi-auto latch: blocks re-fire until the trigger is released */
  private semiAutoLatch = false;

  // ---- multiplayer ----
  private mode: NetMode = "local";
  private net: Net | null = null;
  private selfPid = 0;
  private peerPid = 0;
  private peerName = "";
  private peerLoadout: Loadout | null = null;
  private remoteInput: InputFrame | null = null;
  private lastSnap: Snapshot | null = null;
  private snapAccum = 0;
  private inpAccum = 0;
  /** the opponent avatar (simulated on host, mirrored on guest) */
  private foe: Player | null = null;
  private foeChar: CharacterDef | null = null;
  private foeOutfit: OutfitDef | null = null;
  // one-shot action intents captured on the guest, sent with the next input
  private pendGadget = -1;
  private pendSkill = false;
  private pendReload = false;
  private pendWeapon = false;

  private enemyId = 1;
  private score = 0;
  private kills = 0;
  private gold = 0;
  private wave = 0;
  private waveTimer = 0;
  private spawnTimer = 0;
  private maxConcurrent = 10;
  private intermission = 0;
  private banner: { text: string; t: number } | null = null;

  private skillCd = 0;
  private timewarp = 0;
  private hitSndCd = 0;
  private beamSndCd = 0;
  private flameSndCd = 0;
  private shake = 0;
  private time = 0;
  private gameOver = false;
  private gameOverReason = "";
  private paused = false;

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

  private hudAccum = 0;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundBlur: () => void;
  private boundResize: () => void;
  private boundContext: (e: Event) => void;

  constructor(
    canvas: HTMLCanvasElement,
    loadout: Loadout,
    onHud: (h: HudState) => void,
    opts: { mode?: NetMode; net?: Net | null } = {}
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.loadout = loadout;
    this.onHud = onHud;
    this.mode = opts.mode ?? "local";
    this.net = opts.net ?? null;
    this.character = getCharacter(loadout.characterId);
    this.outfit = getOutfit(loadout.outfitId);
    this.skill = getSkill(loadout.skillId);
    // In multiplayer both players share the full weapon list so gun indices
    // line up between host and guest; in single-player we respect the loadout.
    this.guns =
      this.mode === "local" && loadout.gunIds && loadout.gunIds.length > 0
        ? loadout.gunIds
            .map((id) => GUNS.find((g) => g.id === id) ?? GUNS[0])
            .slice(0, 2)
        : GUNS;
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
    this.boundResize = () => this.resize();
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

  triggerSkill() {
    this.activateSkill();
  }

  /** Deploy a carried gadget by index (0-based). */
  deployGadget(index: number) {
    if (this.gameOver || this.paused) return;
    if (index < 0 || index >= this.gadgets.length) return;
    const def = this.gadgets[index];
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
    this.doDeploy(def);
    sound.skill();
    this.emit(true);
  }

  reloadCurrent() {
    const g = this.gun;
    const ws = this.weaponStates.get(g.id);
    if (g.magazine && ws && ws.reload <= 0 && ws.ammo < g.magazine) {
      ws.reload = g.reloadTime ?? 1.5;
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
    this.sceneTheme = SCENES[Math.floor(Math.random() * SCENES.length)];
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
    this.weaponStates = new Map();
    for (const g of this.guns) {
      this.weaponStates.set(g.id, {
        ammo: g.magazine ?? 0,
        reload: 0,
        heat: 0,
        overheated: false,
      });
    }
    this.score = 0;
    this.kills = 0;
    this.gold = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 1;
    this.maxConcurrent = 8;
    this.intermission = 3;
    this.skillCd = 0;
    this.timewarp = 0;
    this.shake = 0;
    this.time = 0;
    this.beamActive = false;
    this.beamHit = null;
    this.flameActive = false;
    this.banner = { text: "守护基地！", t: 2.2 };
    this.enemyId = 1;
    this.gunIndex = 0; // start with first selected weapon
    this.lastGadget = 0;
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
    // shield weapon init (after player exists)
    this.player.shieldHp = this.gun.shieldMaxHp ?? 0;
    this.applyRuntime();

    // ---- multiplayer bootstrapping ----
    if (this.mode !== "local" && this.net) {
      this.selfPid = this.net.selfPid || 1;
      this.peerPid = this.selfPid === 1 ? 2 : 1;
      this.gunIndex = Math.max(0, this.guns.findIndex((g) => g.id === this.loadout.gunId));
      this.player.gunIndex = this.gunIndex;
      this.player.skillCd = 0;
      this.player.dashCharges = MAX_DASH_CHARGES;
      this.player.dashRecharge = 0;
      this.player.lastGadget = 0;
      this.foe = this.makeFoe();
      this.net.sendGame({ t: "hello", name: this.character.name, loadout: this.loadout });
    }
  }

  private makeFoe(): Player {
    const c = getCharacter("raider");
    const o = getOutfit("tactical");
    const maxHp = Math.round(c.maxHp + o.hpBonus);
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

  private applyPeerLoadout() {
    if (!this.peerLoadout) return;
    this.foeChar = getCharacter(this.peerLoadout.characterId);
    this.foeOutfit = getOutfit(this.peerLoadout.outfitId);
    if (this.foe) {
      const c = this.foeChar;
      const o = this.foeOutfit;
      this.foe.maxHp = Math.round(c.maxHp + o.hpBonus);
      if (this.foe.hp > this.foe.maxHp) this.foe.hp = this.foe.maxHp;
      this.foe.speed = c.speed * (1 + o.speedBonus);
      this.foe.size = c.size;
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

    // central pillars
    pillar(cx - 200, cy - 150);
    pillar(cx + 200, cy - 150);
    pillar(cx - 200, cy + 150);
    pillar(cx + 200, cy + 150);
    pillar(cx, cy);

    // cover walls — mid-field
    cover(cx, cy - 200, 160, 30);
    cover(cx, cy + 200, 160, 30);
    cover(cx - 250, cy, 30, 160);
    cover(cx + 250, cy, 30, 160);
    cover(cx - 150, cy - 100, 100, 28);
    cover(cx + 150, cy + 100, 100, 28);
    cover(cx - 350, cy - 200, 90, 26);
    cover(cx + 350, cy + 200, 90, 26);
    cover(cx - 400, cy + 150, 90, 26);
    cover(cx + 400, cy - 150, 90, 26);

    return walls;
  }

  private attach() {
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
    const rect = this.canvas.getBoundingClientRect();
    this.W = Math.max(320, rect.width);
    this.H = Math.max(240, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      if (!this.gameOver) this.setPaused(!this.paused);
      e.preventDefault();
      return;
    }
    if (this.gameOver || this.paused) return;
    if (KEYS_MOVE.has(e.code)) this.keys.add(e.code);

    // ---- guest: record intents, the host simulates them ----
    if (this.mode === "guest") {
      if (e.code === "KeyQ" || e.code === "Space") {
        this.pendSkill = true;
        e.preventDefault();
      } else if (e.code === "KeyR") {
        this.pendReload = true;
      } else if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= this.gadgets.length) {
          this.pendGadget = n - 1;
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
    // number keys 1/2/3 deploy carried gadgets
    if (e.code.startsWith("Digit")) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= this.gadgets.length) {
        this.deployGadget(n - 1);
        e.preventDefault();
      }
    }
    // E cycles weapons
    if (e.code === "KeyE") {
      this.selectGun((this.gunIndex + 1) % this.guns.length);
      e.preventDefault();
    }
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left + this.camX;
    this.mouse.y = e.clientY - rect.top + this.camY;
  }

  private onMouseDown(e: MouseEvent) {
    sound.ensure();
    if (e.button === 0) {
      this.firing = true;
      this.semiAutoLatch = false; // fresh trigger pull allows a semi-auto shot
    }
    if (e.button === 2) {
      // guest only records intent; host simulates the skill/shield/slam
      if (this.mode === "guest") {
        this.pendSkill = true;
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
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    // guest records a gadget-cycle intent instead of deploying locally
    if (this.mode === "guest") {
      const n = this.gadgets.length;
      if (n === 0) return;
      this.pendGadget = ((this.pendGadget < 0 ? this.gunIndex : this.pendGadget) + dir + n) % n;
      return;
    }
    // scroll cycles through carried gadgets (deploys the next/prev one)
    const n = this.gadgets.length;
    if (n === 0) return;
    const next = ((this.lastGadget + dir) % n + n) % n;
    this.lastGadget = next;
    this.deployGadget(next);
  }

  // ------------------------------------------------------------------ loop
  private loop = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (!this.paused && !this.gameOver) this.update(dt);
    this.render();
    this.hudAccum += dt;
    if (this.hudAccum > 0.06) {
      this.hudAccum = 0;
      this.emit(false);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  // ---------------------------------------------------------------- update
  private update(dt: number) {
    // ---- multiplayer: pump peer messages ----
    if (this.mode !== "local" && this.net) this.pumpNet();

    // ---- guest: no local simulation, just mirror the host snapshot ----
    if (this.mode === "guest") {
      this.applySnapshot();
      this.inpAccum += dt;
      if (this.inpAccum >= 1 / 30) {
        this.inpAccum = 0;
        this.sendInput();
      }
      this.camX = Math.max(0, Math.min(this.worldW - this.W, this.player.x - this.W / 2));
      this.camY = Math.max(0, Math.min(this.worldH - this.H, this.player.y - this.H / 2));
      this.emit(true);
      return;
    }

    this.time += dt;
    this.base.t += dt;
    if (this.base.flash > 0) this.base.flash -= dt * 3;
    this.enemyBase.t += dt;
    if (this.enemyBase.flash > 0) this.enemyBase.flash -= dt * 3;
    this.updateWeaponStates(dt);
    this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateGrenades(dt);
    this.updateDeployables(dt);
    this.updateEnemyBullets(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updatePickups(dt);
    this.updateWaves(dt);

    // ---- host: simulate the remote avatar + stream snapshots ----
    if (this.mode === "host") {
      this.simulateRemote(dt);
      this.snapAccum += dt;
      if (this.snapAccum >= 1 / 20) {
        this.snapAccum = 0;
        this.sendSnapshot();
      }
      if (this.base.hp <= 0 && !this.gameOver) this.endGame("基地失守，你输了！");
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
    this.camX = Math.max(0, Math.min(this.worldW - this.W, this.camX));
    this.camY = Math.max(0, Math.min(this.worldH - this.H, this.camY));
  }

  private get gun(): GunDef {
    return this.guns[this.gunIndex];
  }

  private updateWeaponStates(dt: number) {
    for (const g of this.guns) {
      const s = this.weaponStates.get(g.id)!;
      if (g.magazine && s.reload > 0) {
        s.reload -= dt;
        if (s.reload <= 0) {
          s.reload = 0;
          s.ammo = g.magazine;
        }
      }
      // heat cooldown for beam & flamethrower
      if ((g.weaponClass === "beam" || g.weaponClass === "flamethrower") && s.heat > 0) {
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
    if (p.iframes > 0) p.iframes -= dt;
    if (p.flash > 0) p.flash -= dt * 3;
    if (p.shieldTime > 0) p.shieldTime -= dt;
    if (p.overdriveTime > 0) p.overdriveTime -= dt;
    if (p.slamCd > 0) p.slamCd -= dt;
    if (p.swingTimer > 0) p.swingTimer -= dt;
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) p.comboStep = 0;
    }
    if (p.lunge > 0) p.lunge = Math.max(0, p.lunge - dt * 120);

    let dx = 0;
    let dy = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      this.spawnParticles(p.x, p.y, this.character.bodyColor, 2, 60);
    } else {
      const slow = p.bowDrawing ? (this.gun.drawSlowMult ?? 1) : 1;
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

    // weapon handling
    p.fireTimer -= dt;
    const ws = this.weaponStates.get(g.id)!;
    const fr =
      g.fireRate *
      this.character.fireRateMult *
      (1 + (this.outfit.fireRateBonus ?? 0)) *
      (p.overdriveTime > 0 ? 1.7 : 1);

    if (g.weaponClass === "beam") {
      this.updateBeam(dt, this.firing && !this.paused, ws);
    } else if (g.weaponClass === "flamethrower") {
      this.updateFlamethrower(dt, this.firing && !this.paused, ws);
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
        (!g.semiAuto || !this.semiAutoLatch)
      ) {
        if (g.weaponClass === "ranged") this.fireGun(ws);
        else this.meleeLight();
        p.fireTimer = 1 / fr;
        if (g.semiAuto) this.semiAutoLatch = true;
      }
      if (g.magazine !== undefined && ws.ammo <= 0 && ws.reload <= 0) {
        ws.reload = g.reloadTime ?? 1.5;
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
    const dmg = g.damage * this.character.damageMult;
    const base = p.angle;
    for (let i = 0; i < g.pellets; i++) {
      let a: number;
      if (g.pellets > 1) {
        const off = (i / (g.pellets - 1) - 0.5) * 2 * g.spread;
        a = base + off + (Math.random() - 0.5) * g.spread * 0.35;
      } else {
        a = base + (Math.random() - 0.5) * g.spread;
      }
      const sp = g.bulletSpeed * (0.92 + Math.random() * 0.12);
      const bx = p.x + Math.cos(a) * (p.size + g.barrel);
      const by = p.y + Math.sin(a) * (p.size + g.barrel);
      this.bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
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
        trail: g.kind === "tracer",
        bounces: g.bounces,
        ignoreWalls: g.ignoreWalls,
      });
    }
    if (g.magazine !== undefined) ws.ammo -= 1;
    sound.shoot(g.id);
    this.spawnParticles(
      p.x + Math.cos(base) * (p.size + g.barrel),
      p.y + Math.sin(base) * (p.size + g.barrel),
      g.glow,
      g.pellets > 1 ? 6 : 3,
      140,
      0.25
    );
    if (g.id === "rocket" || g.id === "sniper" || g.id === "fcar" || g.id === "sa1216" || g.id === "mgl32") {
      p.x -= Math.cos(base) * 3;
      p.y -= Math.sin(base) * 3;
      this.shake = Math.min(14, this.shake + (g.id === "rocket" || g.id === "mgl32" ? 7 : 4));
    }
  }

  // ------------------------------------------------------------- melee
  private meleeLight() {
    const g = this.gun;
    const p = this.player;
    const range = g.meleeRange ?? 60;
    const arc = g.meleeArc ?? 2;
    const dmg = g.damage * this.character.damageMult;
    sound.swing();
    p.swingTimer = p.swingDur;

    // spear combo: each step lunges forward and narrows arc into a thrust
    const isSpear = g.id === "spear";
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
      type: "slash",
      x: p.x,
      y: p.y,
      angle: p.angle,
      arc,
      range,
      t: 0,
      duration: 0.22,
      radius: range,
      color: g.glow,
    });
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + e.size) {
        const ang = Math.atan2(dy, dx);
        if (Math.abs(this.angleDiff(ang, p.angle)) <= arc / 2) {
          this.damageEnemy(e, dmg * dmgMult, Math.cos(ang) * g.knockback, Math.sin(ang) * g.knockback);
        }
      }
    }
    for (const w of this.walls) {
      if (!w.destructible) continue;
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
    this.shake = 17;
    sound.slam();
    this.spawnParticles(p.x, p.y, g.glow, 28, 280, 0.5);
    this.spawnParticles(p.x, p.y, "#fde68a", 16, 200, 0.4);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= radius + e.size) {
        const fall = 1 - d / (radius + e.size);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, dmg * (0.55 + fall * 0.5), Math.cos(a) * 420, Math.sin(a) * 420);
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
          0
        );
        if (Math.random() < 0.7)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 2, 120, 0.22);
      } else if (hit.wall && hit.wall.destructible) {
        this.damageWall(hit.wall, g.damage * 0.5 * dt);
        if (Math.random() < 0.5)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 1, 90, 0.2);
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
    for (const e of this.enemies) {
      const t = this.rayCircle(ox, oy, dx, dy, e.x, e.y, e.size);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = e;
        hitWall = null;
      }
    }
    for (const w of this.walls) {
      const t = this.rayAabb(ox, oy, dx, dy, w);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = null;
        hitWall = w;
      }
    }
    return {
      point: { x: ox + dx * best, y: oy + dy * best },
      enemy: hitEnemy,
      wall: hitWall,
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
          if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone) {
            const fall = 1 - d / (range + e.size);
            this.damageEnemy(e, dps * dt * (0.4 + fall * 0.6), 0, 0);
            e.burnT = Math.max(e.burnT, 1.2);
            e.burnDps = Math.max(e.burnDps, dps * 0.25);
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
    });
    sound.shoot("sniper");
    this.spawnParticles(bx, by, g.glow, 4, 120, 0.25);
    if (chargePct >= 0.85) {
      this.shake = Math.min(10, this.shake + 4);
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
              this.shake = 10;
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
      if (w.glue) continue;
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
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
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

      if (!dead && b.owner !== "foe") {
        for (const e of this.enemies) {
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
              Math.cos(Math.atan2(b.vy, b.vx)) * b.knockback,
              Math.sin(Math.atan2(b.vy, b.vx)) * b.knockback
            );
            if (b.pierce <= 0) {
              dead = true;
              break;
            }
            b.pierce -= 1;
          }
        }
      }

      // ---- PvP ownership ----
      // self bullets: damage foe base (enemyBase) + foe player
      // foe bullets: damage local base + local player
      if (!dead) {
        if (b.owner === "foe") {
          if (this.hitsPlayer(b, this.player)) {
            this.damagePlayerEntity(this.player, b.damage, b);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
          } else {
            const bb = this.base;
            const rr = bb.radius + b.size;
            if ((bb.x - b.x) ** 2 + (bb.y - b.y) ** 2 <= rr * rr) {
              this.damageBase(b.damage);
              if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
              dead = true;
            }
          }
        } else {
          // enemy base (foe's base)
          const eb = this.enemyBase;
          const rr = eb.radius + b.size;
          if ((eb.x - b.x) ** 2 + (eb.y - b.y) ** 2 <= rr * rr) {
            this.damageEnemyBase(b.damage);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
          } else if (this.foe && this.hitsPlayer(b, this.foe)) {
            this.damagePlayerEntity(this.foe, b.damage, b);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
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
        } else {
          this.explode(gr.x, gr.y, 120, 90, "#fb923c");
        }
      } else next.push(gr);
    }
    this.grenades = next;
  }

  // ------------------------------------------------------- deployables
  private doDeploy(def: GadgetDef) {
    const p = this.player;
    const ang = p.angle;
    // deploy a bit in front of the player
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = Math.max(40, Math.min(this.worldW - 40, p.x + dx * 50));
    const py = Math.max(40, Math.min(this.worldH - 40, p.y + dy * 50));

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
        this.deployables.push({ ...base, life: 60, radius: 56, armed: 0.8 });
        break;
      case "mine_poison":
        this.deployables.push({ ...base, life: 60, radius: 70, armed: 0.8 });
        break;
      case "mine_fire":
        this.deployables.push({ ...base, life: 60, radius: 70, armed: 0.8 });
        break;
      case "glue_grenade":
        // throw a grenade that lands and forms a glue wall
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: dx * 420,
          vy: dy * 420,
          life: 0.55,
          fuse: 0.55,
          kind: "glue",
        });
        break;
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
        let target: Enemy | null = null;
        let bestD = d.radius;
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - d.x, e.y - d.y);
          if (dist < bestD) {
            bestD = dist;
            target = e;
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
                damage: 14,
                size: 4,
                color: "#bae6fd",
                glow: d.color,
                pierce: 0,
                knockback: 40,
                explosive: false,
                explosionRadius: 0,
                kind: "bullet",
                hit: new Set(),
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
                damage: 22,
                size: 7,
                color: "#ddd6fe",
                glow: d.color,
                pierce: 0,
                knockback: 120,
                explosive: true,
                explosionRadius: 56,
                kind: "grenade",
                hit: new Set(),
              });
            }
          }
        }
        // turrets can be damaged by enemies on contact
        for (const e of this.enemies) {
          if (Math.hypot(e.x - d.x, e.y - d.y) < e.size + d.size) {
            d.hp -= 30 * dt;
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
        if (d.armed <= 0) {
          for (const e of this.enemies) {
            if (Math.hypot(e.x - d.x, e.y - d.y) < e.size + 24) {
              // triggered
              if (d.kind === "mine_explosive") {
                this.explode(d.x, d.y, d.radius, 80, d.color);
              } else if (d.kind === "mine_poison") {
                this.effects.push({
                  type: "poisoncloud",
                  x: d.x,
                  y: d.y,
                  t: 0,
                  duration: 5,
                  radius: d.radius,
                  color: d.color,
                  dps: 30,
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
                  dps: 45,
                  tickT: 0,
                });
              }
              d.life = 0;
              break;
            }
          }
        }
        if (d.life > 0) next.push(d);
        continue;
      }
      // healing station
      if (d.kind === "healing_station") {
        const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
        if (dist < d.radius + this.player.size && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 18 * dt);
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
      next.push(b);
    }
    this.enemyBullets = next;
  }

  private updateEnemies(dt: number) {
    const ts = this.timewarp > 0 ? 0.32 : 1;
    const p = this.player;
    let base = this.base;
    const next: Enemy[] = [];
    for (const e of this.enemies) {
      e.spawnT = Math.min(1, e.spawnT + dt * 4);
      if (e.hitFlash > 0) e.hitFlash -= dt * 4;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damageEnemy(e, e.burnDps * dt, 0, 0);
        if (Math.random() < 0.3)
          this.spawnParticles(e.x, e.y, "#fb923c", 1, 50, 0.2);
      }
      const slowMult = e.slowT > 0 ? 0.5 : 1;

      if (this.mode !== "local") base = this.nearestBase(e.x, e.y);

      const dbx = base.x - e.x;
      const dby = base.y - e.y;
      const dbase = Math.hypot(dbx, dby) || 1;
      const dpx = p.x - e.x;
      const dpy = p.y - e.y;
      const dpl = Math.hypot(dpx, dpy) || 1;

      if (e.ranged) {
        const targetPlayer = dpl < 440;
        const tx = targetPlayer ? p.x : base.x;
        const ty = targetPlayer ? p.y : base.y;
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
        e.x += mvx * e.speed * dt * ts * slowMult;
        e.y += mvy * e.speed * dt * ts * slowMult;
        e.shootTimer -= dt * ts;
        if (e.shootTimer <= 0 && dbase < 700 && e.spawnT >= 1) {
          const eg = e.gun;
          const fireRate = eg ? eg.fireRate : 1.5;
          e.shootTimer = 1 / fireRate + Math.random() * 0.5;
          const a = Math.atan2(ty - e.y, tx - e.x);
          const bulletSpeed = eg ? eg.bulletSpeed * 0.7 : 270;
          const bulletDmg = eg ? Math.max(6, eg.damage * 0.4) : 8;
          const bulletSize = eg ? Math.max(4, eg.bulletSize) : 5;
          const shots = e.type === "elite" ? 3 : 1;
          for (let i = 0; i < shots; i++) {
            const aa = a + (shots > 1 ? (i / (shots - 1) - 0.5) * 0.5 : 0);
            this.enemyBullets.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(aa) * bulletSpeed,
              vy: Math.sin(aa) * bulletSpeed,
              life: 3,
              damage: Math.round(bulletDmg * (e.type === "elite" ? 1.5 : 1)),
              size: bulletSize,
              color: e.glow,
            });
          }
        }
      } else {
        e.angle = Math.atan2(dby, dbx);
        e.x += (dbx / dbase) * e.speed * dt * ts * slowMult;
        e.y += (dby / dbase) * e.speed * dt * ts * slowMult;
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
      this.collideBase(e, e.size);
      this.collideBase(e, e.size, this.enemyBase);

      if (e.spawnT >= 1 && e.hp > 0) {
        e.attackTimer -= dt;
        if (dbase <= base.radius + e.size && e.attackTimer <= 0) {
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

      if (e.hp > 0) next.push(e);
    }
    this.enemies = next;

    // field effects (poison cloud, fire field) damage enemies inside
    for (const fx of this.effects) {
      if (fx.type !== "poisoncloud" && fx.type !== "firefield") continue;
      if (fx.tickT === undefined) fx.tickT = 0;
      fx.tickT -= dt;
      if (fx.tickT <= 0) {
        fx.tickT = 0.25;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - fx.x, e.y - fx.y) < fx.radius + e.size) {
            this.damageEnemy(e, (fx.dps ?? 20) * 0.25, 0, 0);
            if (fx.type === "poisoncloud") e.slowT = Math.max(e.slowT, 0.3);
            if (fx.type === "firefield") {
              e.burnT = Math.max(e.burnT, 1);
              e.burnDps = Math.max(e.burnDps, 20);
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
    kby: number
  ) {
    if (e.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    e.hp -= dmg;
    e.hitFlash = 1;
    if (this.hitSndCd <= 0) {
      sound.hit();
      this.hitSndCd = 0.04;
    }
    const kbScale = 0.045 / (e.type === "boss" ? 6 : 1);
    e.x += kbx * kbScale;
    e.y += kby * kbScale;
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

  private killEnemy(e: Enemy) {
    this.score += e.score;
    this.kills += 1;
    // ============ IMPACTFUL COIN BURST ============
    const goldAmount = e.type === "boss" ? 80 : e.type === "tank" ? 18 : e.type === "shooter" ? 10 : 6;
    this.gold += goldAmount;
    // shockwave ring
    this.effects.push({
      type: "coinburst",
      x: e.x,
      y: e.y,
      t: 0,
      duration: 0.5,
      radius: e.size * 3,
      color: "#fbbf24",
    });
    this.effects.push({
      type: "shock",
      x: e.x,
      y: e.y,
      t: 0,
      duration: 0.35,
      radius: e.size * 2.4,
      color: "#fde68a",
    });
    // big screen shake for impactful kills
    this.shake = Math.min(22, this.shake + (e.type === "boss" ? 20 : e.type === "tank" ? 10 : 5));
    // coin particles — spinning, gravity-affected
    const coinCount = e.type === "boss" ? 40 : e.type === "tank" ? 18 : 10;
    for (let i = 0; i < coinCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 280;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        color: Math.random() < 0.5 ? "#fbbf24" : "#fde68a",
        size: 2.5 + Math.random() * 2.5,
        shrink: false,
        gravity: 520,
        coin: true,
        spin: Math.random() * Math.PI * 2,
      });
    }
    // body debris particles
    this.spawnParticles(e.x, e.y, e.glow, e.type === "boss" ? 30 : 12, 220, 0.5);
    this.spawnParticles(e.x, e.y, e.color, e.type === "boss" ? 20 : 6, 160, 0.4);

    if (e.type === "boss") {
      this.explode(e.x, e.y, e.size * 2.2, 0, e.glow);
    }
    // score popup as gold pickup
    const dropChance = e.type === "boss" ? 1 : e.type === "tank" ? 0.32 : 0.12;
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
      this.endGame("你倒下了");
    }
  }

  private damageBase(dmg: number) {
    if (this.base.hp <= 0) return;
    this.base.hp -= dmg;
    this.base.flash = 1;
    this.shake = Math.min(12, this.shake + dmg * 0.25);
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
      this.endGame("基地被摧毁");
    }
  }

  private damageEnemyBase(dmg: number) {
    if (this.enemyBase.hp <= 0) return;
    this.enemyBase.hp -= dmg;
    this.enemyBase.flash = 1;
    this.shake = Math.min(8, this.shake + dmg * 0.08);
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

  /** Damage an arbitrary player (local or foe); foe death respawns. */
  private damagePlayerEntity(p: Player, dmg: number, _b?: Bullet) {
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
      if (p === this.player) this.endGame("你倒下了");
      else if (p === this.foe) this.respawnFoe();
    }
  }

  private respawnFoe() {
    if (!this.foe) return;
    this.kills += 1;
    this.score += 250;
    this.spawnParticles(this.foe.x, this.foe.y, "#f472b6", 30, 200, 0.6);
    this.foe.x = this.worldW / 2;
    this.foe.y = 220;
    this.foe.hp = this.foe.maxHp;
    this.foe.iframes = 1.5;
    this.banner = { text: `击杀 ${this.peerName || "对手"}！`, t: 1.6 };
  }

  // ---- host: pull peer messages, simulate remote, stream snapshots ----
  private pumpNet() {
    if (!this.net) return;
    for (const m of this.net.drainGameMsgs()) {
      if (m.t === "inp") this.remoteInput = m.input;
      else if (m.t === "snap") this.lastSnap = m.snap;
      else if (m.t === "hello") {
        this.peerName = m.name;
        this.peerLoadout = m.loadout as Loadout;
        this.applyPeerLoadout();
      }
    }
  }

  private simulateRemote(dt: number) {
    const foe = this.foe;
    const inp = this.remoteInput;
    if (!foe || !inp) return;
    const sp = this.player,
      sg = this.gunIndex,
      sk = this.keys,
      sm = this.mouse,
      sf = this.firing;
    const sSkill = this.skillCd,
      sDash = this.dashCharges,
      sDashR = this.dashRecharge,
      sLastG = this.lastGadget,
      sSemi = this.semiAutoLatch;
    // load foe state into the engine's single-player simulation context
    this.player = foe;
    this.gunIndex = foe.gunIndex ?? 0;
    this.keys = new Set(inp.keys);
    this.mouse = { x: inp.mx, y: inp.my };
    this.firing = inp.firing;
    this.skillCd = foe.skillCd ?? 0;
    this.dashCharges = foe.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = foe.dashRecharge ?? 0;
    this.lastGadget = foe.lastGadget ?? 0;
    this.semiAutoLatch = false;
    this.updatePlayer(dt);
    if (inp.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
    if (inp.skill) this.activateSkill();
    if (inp.reload) this.reloadCurrent();
    if (inp.gadget >= 0) this.deployGadget(inp.gadget);
    // write foe state back
    foe.gunIndex = this.gunIndex;
    foe.skillCd = this.skillCd;
    foe.dashCharges = this.dashCharges;
    foe.dashRecharge = this.dashRecharge;
    foe.lastGadget = this.lastGadget;
    // restore local context
    this.player = sp;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
  }

  private toSnapPlayer(p: Player, c: CharacterDef, o: OutfitDef): SnapPlayer {
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
      gadgets: this.gadgets.map((g) => ({
        id: g.id,
        ready: (this.gadgetCd.get(g.id) ?? 0) <= 0,
        cdPct: Math.min(1, (this.gadgetCd.get(g.id) ?? 0) / g.cooldown),
        deployed: 0,
      })),
    };
  }

  private sendSnapshot() {
    if (!this.net || !this.foe) return;
    const snap: Snapshot = {
      time: this.time,
      players: [
        this.toSnapPlayer(this.player, this.character, this.outfit),
        this.toSnapPlayer(this.foe, this.foeChar!, this.foeOutfit!),
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
      baseHp: Math.max(0, Math.round(this.base.hp)),
      baseMaxHp: this.base.maxHp,
      enemyBaseHp: Math.max(0, Math.round(this.enemyBase.hp)),
      enemyBaseMaxHp: this.enemyBase.maxHp,
      wave: this.wave,
      enemiesLeft: this.enemies.length,
      score: this.score,
      kills: this.kills,
      gold: this.gold,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
    };
    this.net.sendGame({ t: "snap", snap });
  }

  // ---- guest: send input, mirror snapshot ----
  private sendInput() {
    if (!this.net) return;
    const inp: InputFrame = {
      keys: [...this.keys],
      mx: this.mouse.x,
      my: this.mouse.y,
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
    const me = s.players.find((p) => p.id === this.selfPid) ?? s.players[0];
    const foe = s.players.find((p) => p.id !== this.selfPid) ?? s.players[1];
    if (me) {
      this.player.x = me.x;
      this.player.y = me.y;
      this.player.angle = me.angle;
      this.player.hp = me.hp;
      this.player.maxHp = me.maxHp;
      this.player.gunIndex = me.gunIndex;
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
      this.foeChar = getCharacter(foe.character);
      this.foeOutfit = getOutfit(foe.outfit);
    }
    this.wave = s.wave;
    this.enemiesLeft = s.enemiesLeft;
    this.score = s.score;
    this.kills = s.kills;
    this.gold = s.gold;
    this.base.hp = s.baseHp;
    this.base.maxHp = s.baseMaxHp;
    this.enemyBase.hp = s.enemyBaseHp;
    this.enemyBase.maxHp = s.enemyBaseMaxHp;
    if (s.gameOver && !this.gameOver) {
      const win = this.base.hp > 0;
      this.endGame(win ? "胜利！敌方基地已摧毁" : "失败，基地失守");
    }
  }

  /** Draw a player avatar as a colored circle + barrel (used for the foe / net). */
  private drawNetPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    name: string,
    hpPct: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    // body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // barrel
    ctx.rotate(angle);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(8, -2.5, 16, 5);
    ctx.restore();
    // hp bar
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - 16, y - 24, 32, 4);
    ctx.fillStyle = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171";
    ctx.fillRect(x - 16, y - 24, 32 * Math.max(0, hpPct), 4);
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
    this.drawBase(ctx, this.enemyBase);
    this.drawBase(ctx, this.base);
    for (const e of s.enemies) {
      const c = getCharacter(e.character);
      ctx.fillStyle = c?.bodyColor ?? "#f87171";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2, 3);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(e.x - e.size, e.y - e.size - 6, e.size * 2 * (e.hp / e.maxHp), 3);
      }
    }
    for (const p of s.players) {
      const isMe = p.id === this.selfPid;
      const col = isMe ? this.character.bodyColor : this.foeChar?.bodyColor ?? "#f472b6";
      this.drawNetPlayer(
        ctx,
        p.x,
        p.y,
        p.angle,
        col,
        isMe ? this.character.name : this.peerName || "对手",
        p.hp / p.maxHp
      );
    }
    for (const b of s.bullets) {
      ctx.strokeStyle = b.glow;
      ctx.lineWidth = Math.max(1, b.size * 0.7);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }

  private damageWall(w: Wall, dmg: number) {
    if (!w.destructible) return;
    w.hp -= dmg;
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
    this.shake = Math.min(14, this.shake + 5);
  }

  private explode(
    x: number,
    y: number,
    radius: number,
    damage: number,
    color: string
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
    this.shake = Math.min(20, this.shake + 8);
    sound.explosion();
    this.spawnParticles(x, y, color, 26, 260, 0.55);
    this.spawnParticles(x, y, "#fde68a", 14, 200, 0.4);
    if (damage > 0) {
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < radius + e.size) {
          const fall = 1 - d / (radius + e.size);
          const a = Math.atan2(e.y - y, e.x - x);
          this.damageEnemy(
            e,
            damage * (0.5 + fall * 0.5),
            Math.cos(a) * 260 * fall,
            Math.sin(a) * 260 * fall
          );
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
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x: ox ?? x,
        y: oy ?? y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.8),
        maxLife: life,
        color,
        size: 2 + Math.random() * 3,
        shrink: true,
      });
    }
    if (this.particles.length > 900) {
      this.particles.splice(0, this.particles.length - 900);
    }
  }

  private updateParticles(dt: number) {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      else {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
      if (p.spin !== undefined) p.spin += dt * 12;
      p.life -= dt;
      if (p.life > 0) next.push(p);
    }
    this.particles = next;
  }

  private updateEffects(dt: number) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.duration);
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
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 420,
          vy: Math.sin(a) * 420,
          life: 0.55,
          fuse: 0.55,
          kind: "frag",
        });
        break;
      }
      case "overdrive": {
        p.overdriveTime = s.duration;
        this.spawnParticles(p.x, p.y, s.color, 20, 180, 0.5);
        break;
      }
    }
    this.emit(true);
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

  private emit(immediate = false) {
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
    const gadgets: GadgetHud[] = GADGETS.map((gd) => {
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
      };
    });
    const hud: HudState = {
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      score: this.score,
      wave: this.wave,
      enemiesLeft: this.enemies.length + this.spawnQueue,
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
      baseHp: Math.max(0, Math.round(this.base.hp)),
      baseMaxHp: this.base.maxHp,
      enemyBaseHp: Math.max(0, Math.round(this.enemyBase.hp)),
      enemyBaseMaxHp: this.enemyBase.maxHp,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      paused: this.paused,
      banner: this.banner ? this.banner.text : null,
      kills: this.kills,
      gold: this.gold,
      bowChargePct: p.bowDrawing ? Math.min(1, p.bowCharge / (this.gun.maxChargeTime ?? 1)) : 0,
      shieldHp: this.gun.shieldMaxHp ? Math.max(0, Math.round(p.shieldHp)) : null,
      shieldMaxHp: this.gun.shieldMaxHp ?? null,
      shieldActive: p.shieldBlockTime > 0,
      shieldCdPct: p.shieldCd > 0 ? 1 - p.shieldCd / (this.gun.shieldRechargeTime ?? 8) : 1,
      hitFlash: p.flash,
    };
    this.onHud(hud);
  }

  // ---------------------------------------------------------------- render
  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawBackground(ctx);

    // guest renders the world straight from the host snapshot
    if (this.mode === "guest") {
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
    this.drawBase(ctx, this.enemyBase);
    this.drawBase(ctx, this.base);
    this.drawArenaBorder(ctx);
    this.drawFieldEffects(ctx);
    this.drawPickups(ctx);
    this.drawParticles(ctx);
    this.drawGrenades(ctx);
    this.drawEnemies(ctx);
    this.drawEnemyBullets(ctx);
    this.drawBeam(ctx);
    this.drawFlameCone(ctx);
    this.drawPlayer(ctx);
    if (this.foe) {
      this.drawNetPlayer(
        ctx,
        this.foe.x,
        this.foe.y,
        this.foe.angle,
        this.foeChar?.bodyColor ?? "#f472b6",
        this.peerName || "对手",
        this.foe.hp / this.foe.maxHp
      );
    }
    this.drawBullets(ctx);
    this.drawEffects(ctx);

    ctx.restore();

    this.drawCrosshair(ctx);
    this.drawOverlays(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const theme = this.sceneTheme;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

    // blobs at base positions (in world space, but we draw in screen space)
    const blobs: [number, number, string][] = [
      [this.enemyBase.x - this.camX, this.enemyBase.y - this.camY, "#dc2626"],
      [this.base.x - this.camX, this.base.y - this.camY, "#1d4ed8"],
    ];
    for (const [bx, by, col] of blobs) {
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, this.W * 0.4);
      rg.addColorStop(0, rgba(col, 0.18));
      rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // grid (scrolls with camera)
    ctx.strokeStyle = "rgba(130,150,220,0.07)";
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

  private drawArenaBorder(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = rgba(this.sceneTheme.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.worldW - 4, this.worldH - 4);
  }

  private drawWalls(ctx: CanvasRenderingContext2D) {
    for (const w of this.walls) {
      ctx.save();
      if (w.glue) {
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

  private drawDeployables(ctx: CanvasRenderingContext2D) {
    for (const d of this.deployables) {
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
        // base
        ctx.fillStyle = "#334155";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // rotating barrel
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        roundRect(ctx, 0, -3, d.size + 6, 6, 2);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 1;
        ctx.stroke();
        // core
        ctx.fillStyle = rgba(d.color, 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "turret_cannon") {
        ctx.fillStyle = "#3b3366";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        roundRect(ctx, 0, -5, d.size + 8, 10, 3);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.stroke();
        ctx.fillStyle = rgba(d.color, 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
        // mine body
        const blink = d.armed <= 0 ? (Math.floor(this.time * 4) % 2 === 0 ? 1 : 0.4) : 0.5;
        ctx.fillStyle = rgba(d.color, blink);
        ctx.strokeStyle = shade(d.color, -0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // spike on top
        ctx.fillStyle = shade(d.color, -0.2);
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(4, -6);
        ctx.closePath();
        ctx.fill();
        // pulse ring when armed
        if (d.armed <= 0) {
          ctx.strokeStyle = rgba(d.color, 0.3);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 + (this.time * 20) % 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (d.kind === "healing_station") {
        // range indicator
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // pulsing aura
        const pulse = 0.5 + Math.sin(this.time * 3) * 0.2;
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size * 2);
        rg.addColorStop(0, rgba(d.color, pulse * 0.5));
        rg.addColorStop(1, rgba(d.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 2, 0, Math.PI * 2);
        ctx.fill();
        // body — white cross on green
        ctx.fillStyle = "#15803d";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#bbf7d0";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.5, 0);
        ctx.lineTo(d.size * 0.5, 0);
        ctx.moveTo(0, -d.size * 0.5);
        ctx.lineTo(0, d.size * 0.5);
        ctx.stroke();
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

  private drawBase(ctx: CanvasRenderingContext2D, b: Base) {
    const isEnemy = b === this.enemyBase;
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

    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    for (const pk of this.pickups) {
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
      const a = Math.max(0, p.life / p.maxLife);
      if (p.coin) {
        // spinning coin — draw as ellipse to simulate rotation
        const w = Math.abs(Math.cos(p.spin ?? 0)) * p.size + 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(p.color, Math.min(1, a * 1.5));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba("#92400e", a);
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
      ctx.save();
      ctx.translate(gr.x, gr.y);
      ctx.fillStyle = gr.kind === "glue" ? "#0e7490" : "#1f2937";
      ctx.strokeStyle = gr.kind === "glue" ? "#22d3ee" : "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = gr.kind === "glue" ? "#22d3ee" : "#f97316";
      ctx.fillRect(-2, -9, 4, 4);
      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
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

      // use drawCharacter if enemy has a character definition
      if (e.character && e.outfit) {
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
    }
  }

  private drawEnemyBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.enemyBullets) {
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

  private drawBullets(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.bullets) {
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

  private drawEffects(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.effects) {
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
        // expanding golden shockwave — high impact
        const r = e.radius * (0.3 + k * 1.2);
        ctx.strokeStyle = rgba("#fde68a", (1 - k) * 0.95);
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba("#fbbf24", (1 - k) * 0.6);
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        // bright flash
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.5));
        rg.addColorStop(0.5, rgba("#fde68a", (1 - k) * 0.3));
        rg.addColorStop(1, rgba("#fbbf24", 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
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
      }
    }
    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
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
}
