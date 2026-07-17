// Shared networking types for 1v1 co-op-base-defense + PvP.
// Kept free of engine imports so both client and (future) tooling can use them.

export type NetMode = "local" | "host" | "guest" | "server";

/** Control messages exchanged with the relay server. */
export type RelayIn =
  | { t: "create"; name?: string }
  | { t: "join"; room: string; name?: string }
  | { t: "find"; name?: string } // quick-match: pair with next waiting player
  | { t: "msg"; data: GameMsg };

export type RelayOut =
  | { t: "created"; room: string; pid: number }
  | { t: "joined"; room: string; pid: number }
  | { t: "queued" } // find() accepted, waiting for an opponent
  | { t: "peer"; pid: number; name: string; host: boolean }
  | { t: "start"; youPid?: number }
  | { t: "msg"; data: GameMsg }
  | { t: "peerLeft" }
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
  owner: "self" | "foe" | "enemy";
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
}

/** Peer-to-peer game payloads (wrapped in RelayIn/RelayOut `msg`). */
export type GameMsg =
  | { t: "hello"; name: string; loadout: unknown }
  | { t: "inp"; input: InputFrame }
  | { t: "snap"; snap: Snapshot };
