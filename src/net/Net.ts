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
  onGameMsg?: (m: GameMsg) => void;
}

export class Net {
  private ws: WebSocket | null = null;
  private url = "";
  private room = "";
  private pid = 0;
  private mode: "host" | "guest" = "guest";
  status: NetStatus = "idle";
  peerName = "";
  /** buffered game messages received from the peer (drained by the engine) */
  private inbox: GameMsg[] = [];
  private autoReconnect = false;
  private pendingFind: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
      // Re-issue a pending match request after a reconnect.
      if (this.pendingFind) this.find(this.pendingFind);
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
    this.send({ t: "create", name });
    this.setStatus("waiting", "房间已创建，等待好友加入…");
  }

  join(room: string, name: string) {
    this.room = room.toUpperCase();
    this.send({ t: "join", room: this.room, name });
    this.setStatus("waiting", "正在加入房间…");
  }

  /** Quick match: server pairs us with the next waiting player. */
  find(name: string) {
    this.pendingFind = name;
    this.send({ t: "find", name });
    this.setStatus("waiting", "匹配中，等待对手…");
  }

  /** Send an opaque game payload to the peer (via relay). */
  sendGame(m: GameMsg) {
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
        this.setStatus("ready");
        this.events.onStart?.();
        break;
      case "msg":
        this.inbox.push(m.data as GameMsg);
        this.events.onGameMsg?.(m.data as GameMsg);
        break;
      case "peerLeft":
        this.events.onPeerLeft?.();
        break;
      case "error":
        this.setStatus("error", m.msg);
        break;
    }
  }

  private setStatus(s: NetStatus, info?: string) {
    this.status = s;
    this.events.onStatus?.(s, info);
  }
}
