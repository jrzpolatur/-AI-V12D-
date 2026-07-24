// Shared networking types for 1v1 deathmatch PvP + co-op.
// Kept free of engine imports so both client and (future) tooling can use them.

export type NetMode = "local" | "host" | "guest" | "server";

/** Control messages exchanged with the relay server. */
export type RelayIn =
  | { t: "create"; name?: string }
  | { t: "join"; room: string; name?: string }
  | { t: "find"; name?: string } // quick-match: pair with next waiting player
  | { t: "rejoin"; room: string; pid: number; name?: string; loadout?: unknown } // resume a matched room after a transient disconnect
  | { t: "msg"; data: GameMsg };

export type RelayOut =
  | { t: "created"; room: string; pid: number }
  | { t: "joined"; room: string; pid: number }
  | { t: "queued" } // find() accepted, waiting for an opponent
  | { t: "peer"; pid: number; name: string; host: boolean }
  | { t: "start"; youPid?: number }
  | { t: "msg"; data: GameMsg }
  | { t: "peerGone" } // opponent transiently disconnected (rejoin possible)
  | { t: "peerBack" } // opponent reconnected
  | { t: "peerLeft" } // opponent permanently left (room closing)
  | { t: "error"; msg: string };

/** Per-frame input sent by a guest to the host. */
export interface InputFrame {
  keys: string[]; // held key codes (movement + actions)
  mx: number; // aim world X
  my: number; // aim world Y
  vmx: number; // virtual move X (on-screen joystick, -1..1)
  vmy: number; // virtual move Y (on-screen joystick, -1..1)
  firing: boolean;
  gadget: number; // -1 none, else 0..2 deploy request (one-shot)
  weaponSwitch: boolean; // E pressed (one-shot)
  skill: boolean; // Q pressed (one-shot)
  reload: boolean; // R pressed (one-shot)
  secondaryFiring?: boolean;
}

/** Compact player state for snapshots. */
export interface SnapPlayer {
  id: number;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  gunIndex: number;
  character: string;
  outfit: string;
  skillId: string;
  dashCharges: number;
  maxDashCharges: number;
  shieldHp: number | null;
  shieldMaxHp: number | null;
  gadgets: { id: string; ready: boolean; cdPct: number; deployed: number }[];
  /** live magazine ammo (null for weapons without a magazine) */
  ammo: number | null;
  /** magazine capacity (null for weapons without a magazine) */
  magazine: number | null;
  isCloaked?: boolean;
  cloakAlpha?: number;
  skillEnergy?: number;
  winchActive?: boolean;
  winchX?: number;
  winchY?: number;
  isChargingSlam?: boolean;
  chargeSlamTime?: number;
  /** >0 = electrified by a lightsaber hit (guest renders crackling arcs) */
  electrified: number;
  electrifiedGlow: string;
}

export interface SnapEnemy {
  id: number;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  character: string;
  outfit: string;
  elite: boolean;
  size: number;
}

export interface SnapBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glow: string;
  kind: string;
  owner: "self" | "foe" | "enemy" | "player";
}

/** A thrown grenade (mirrored so the guest can render it mid-flight). */
export interface SnapGrenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fuse: number;
  kind: "frag" | "glue" | "fire" | "poison";
}

/** A deployed gadget (turret / mine / healing station) mirrored to the guest. */
export interface SnapDeployable {
  kind: string; // GadgetKind
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  life: number;
  armed: number;
  radius: number;
  color: string;
  size: number;
}

/** Terrain cover walls (indestructible pillars + destructible cover). Sent every
 *  snapshot so the guest mirrors exactly which cover still stands — including
 *  destruction — instead of showing a stale/ghost wall. */
export interface SnapWall {
  x: number;
  y: number;
  w: number;
  h: number;
  /** live hp for destructible walls; -1 for indestructible (pillars) */
  hp: number;
  maxHp: number;
  destructible: boolean;
  glue: boolean;
  /** true when this wall is a building (tower slab) rather than plain cover */
  building?: boolean;
  /** deterministic seed used for building decoration */
  seed?: number;
}

/** Full world snapshot sent by the host to the guest. */
export interface Snapshot {
  time: number;
  /** index into SCENES[] — chosen by the host (authoritative) so both sides load the same map */
  scene: number;
  /** true when the host has paused the match (authoritative; guest mirrors this) */
  paused: boolean;
  players: SnapPlayer[]; // both players (host + guest)
  enemies: SnapEnemy[];
  bullets: SnapBullet[]; // all bullets (player + ai)
  /** terrain cover walls (indestructible pillars + destructible cover) */
  walls?: SnapWall[];
  /** host-simulated visual effects mirrored to the guest (explosions, sweeps, ...) */
  effects: SnapEffect[];
  /** thrown grenades mirrored to the guest so they render mid-flight */
  grenades: SnapGrenade[];
  /** deployed gadgets (turrets / mines / healing stations) mirrored to the guest */
  deployables: SnapDeployable[];
  /** host's OWN base (bottom of the arena) */
  hostBaseHp: number;
  hostBaseMaxHp: number;
  /** guest's OWN base (top of the arena) */
  guestBaseHp: number;
  guestBaseMaxHp: number;
  wave: number;
  enemiesLeft: number;
  score: number;
  kills: number;
  gold: number;
  gameOver: boolean;
  gameOverReason: string;
  dmKills?: number[];
  dmTarget?: number;
}

/** Compact effect payload so guest / authoritative clients can mirror the
 *  host's visual effects (explosions, shockwaves, melee sweeps, ...). */
export interface SnapEffect {
  /** stable id assigned by the host (so the guest can keep animating it across snapshots) */
  id: number;
  type: string;
  x: number;
  y: number;
  /** elapsed time on the host; the guest continues aging it by real frame dt */
  t: number;
  duration: number;
  radius: number;
  color: string;
  angle?: number;
  arc?: number;
  range?: number;
  style?: string;
  dirX?: number;
  dirY?: number;
}

/** Peer-to-peer game payloads (wrapped in RelayIn/RelayOut `msg`). */
export type GameMsg =
  | { t: "hello"; name: string; loadout: unknown }
  | { t: "inp"; input: InputFrame }
  | { t: "snap"; snap: Snapshot };
