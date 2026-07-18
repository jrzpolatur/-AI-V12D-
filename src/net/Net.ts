// Thin WebSocket client for the relay server.
// Responsibilities: connect, create/join a room, exchange opaque game
// messages with the peer, and surface lobby/control events to the UI.

import type { GameMsg, RelayIn, RelayOut } from "./protocol";

export type NetStatus =
  | "idle"
  | "connecting"
  | "connected" // socket open, ready to create/join
  | "waiting" // created/joined, waiting for opponent
  | "ready" // both players present
  | "error";

export interface NetEvents {
  onStatus?: (s: NetStatus, info?: string) => void;
  onPeer?: (pid: number, name: string, host: boolean) => void;
  onStart?: () => void;
  onPeerLeft?: () => void;
  onPeerGone?: () => void;
  onPeerBack?: () => void;
  onGameMsg?: (m: GameMsg) => void;
}

export class Net {
  private ws: WebSocket | null = null;
  private url = "";
  private room = "";
  private pid = 0;
  /** name used for the last create/join/find — reused on rejoin */
  private name = "玩家";
  /** last loadout we sent in `hello` — reused on rejoin so the match resumes */
  private lastLoadout: unknown = null;
  private mode: "host" | "guest" = "guest";
  status: NetStatus = "idle";
  peerName = "";
  /** the pid assigned to THIS client by the (authoritative) server */
  youPid = 0;
  /** buffered game messages received from the peer (drained by the engine) */
  private inbox: GameMsg[] = [];
  private autoReconnect = false;
  private pendingFind: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** dynamic listeners (used by GameScreen, which doesn't own the Net instance) */
  private peerGoneCbs: (() => void)[] = [];
  private peerBackCbs: (() => void)[] = [];
  private peerLeftCbs: (() => void)[] = [];

  onPeerGone(cb: () => void) {
    this.peerGoneCbs.push(cb);
  }
  onPeerBack(cb: () => void) {
    this.peerBackCbs.push(cb);
  }
  onPeerLeft(cb: () => void) {
    this.peerLeftCbs.push(cb);
  }

  constructor(private events: NetEvents = {}) {}

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  get roomCode() {
    return this.room;
  }
  get selfPid() {
    return this.pid;
  }
  get playerMode(): "host" | "guest" {
    return this.mode;
  }

  connect(url: string, autoReconnect = false) {
    this.autoReconnect = autoReconnect;
    this.url = url.trim();
    this.openSocket();
  }

  private openSocket() {
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      this.setStatus("error", String(e));
      return;
    }
    this.ws.onopen = () => {
      this.setStatus("connected");
      // A transient reconnect: if we were already in a matched room, rejoin the
      // SAME room instead of re-matching from scratch. Otherwise re-issue a
      // pending quick-match request.
      if (this.room && this.pid) this.rejoin(this.name, this.lastLoadout);
      else if (this.pendingFind) this.find(this.pendingFind);
    };
    this.ws.onerror = () => this.setStatus("error", "无法连接服务器");
    this.ws.onclose = () => {
      if (this.autoReconnect) {
        // Transparently retry so the lobby never appears "dead".
        this.setStatus("connecting");
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.openSocket(), 1500);
      } else if (this.status !== "error") {
        this.setStatus("idle", "连接已断开");
      }
    };
    this.ws.onmessage = (ev) => {
      let msg: RelayOut;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.handle(msg);
    };
  }

  create(name: string) {
    this.name = name;
    this.send({ t: "create", name });
    this.setStatus("waiting", "房间已创建，等待好友加入…");
  }

  join(room: string, name: string) {
    this.name = name;
    this.room = room.toUpperCase();
    this.send({ t: "join", room: this.room, name });
    this.setStatus("waiting", "正在加入房间…");
  }

  /** Resume a previously-matched room after a transient disconnect. */
  rejoin(name: string, loadout: unknown) {
    if (!this.room || !this.pid) return;
    this.send({ t: "rejoin", room: this.room, pid: this.pid, name, loadout });
    this.setStatus("waiting", "正在恢复对局…");
  }

  /** Quick match: server pairs us with the next waiting player. */
  find(name: string) {
    this.name = name;
    this.pendingFind = name;
    this.send({ t: "find", name });
    this.setStatus("waiting", "匹配中，等待对手…");
  }

  /** Send an opaque game payload to the peer (via relay). */
  sendGame(m: GameMsg) {
    // remember the loadout we advertised so a later rejoin can resume the match
    if (m.t === "hello") this.lastLoadout = m.loadout;
    this.send({ t: "msg", data: m });
  }

  /** Pull and clear all game messages received since the last call. */
  drainGameMsgs(): GameMsg[] {
    const m = this.inbox;
    this.inbox = [];
    return m;
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.autoReconnect = false;
    this.pendingFind = null;
    this.ws?.close();
    this.ws = null;
    this.status = "idle";
  }

  private send(m: RelayIn) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  private handle(m: RelayOut) {
    switch (m.t) {
      case "created":
        this.room = m.room!;
        this.pid = m.pid!;
        this.mode = "host";
        break;
      case "joined":
        this.room = m.room!;
        this.pid = m.pid!;
        this.mode = "guest";
        break;
      case "queued":
        this.setStatus("waiting", "匹配中，等待对手加入…");
        break;
      case "peer":
        this.peerName = m.name;
        this.events.onPeer?.(m.pid, m.name, !!m.host);
        break;
      case "start":
        this.pendingFind = null;
        // The authoritative server sends an explicit `youPid` (1/2). The relay
        // server does NOT, so fall back to the role derived from playerMode:
        // host = creator = pid 1, guest = joiner = pid 2. Without this, relay
        // clients kept youPid = 0, so the engine's selfPid became 0 and the
        // guest could never locate its own avatar in the snapshot.
        this.youPid =
          (m as { youPid?: number }).youPid ?? (this.mode === "host" ? 1 : 2);
        this.setStatus("ready");
        this.events.onStart?.();
        break;
      case "msg":
        this.inbox.push(m.data as GameMsg);
        this.events.onGameMsg?.(m.data as GameMsg);
        break;
      case "peerGone":
        this.events.onPeerGone?.();
        this.peerGoneCbs.forEach((c) => c());
        break;
      case "peerBack":
        this.events.onPeerBack?.();
        this.peerBackCbs.forEach((c) => c());
        break;
      case "peerLeft":
        this.events.onPeerLeft?.();
        this.peerLeftCbs.forEach((c) => c());
        break;
      case "error":
        // a "room expired" error means our previous match is gone: forget it so
        // the UI lets the player re-match instead of looping on a dead room.
        if (m.msg.includes("重新匹配") || m.msg.includes("失效")) {
          this.room = "";
          this.pid = 0;
          this.pendingFind = null;
        }
        this.setStatus("error", m.msg);
        break;
    }
  }

  private setStatus(s: NetStatus, info?: string) {
    this.status = s;
    this.events.onStatus?.(s, info);
  }
}
