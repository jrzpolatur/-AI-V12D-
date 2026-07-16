import { useEffect, useRef, useState } from "react";
import { Net, type NetStatus } from "../net/Net";

export default function LobbyScreen({
  onReady,
  onBack,
}: {
  onReady: (mode: "host" | "guest", net: Net) => void;
  onBack: () => void;
}) {
  // Default relay URL: when served over HTTPS (deployed), use wss:// on the
  // same host (the combined prod server). For local dev, point at ws://localhost:8080.
  const defaultUrl = () => {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return `wss://${window.location.host}`;
    }
    return "ws://localhost:8080";
  };
  const [url, setUrl] = useState(defaultUrl);
  const [name, setName] = useState("玩家");
  const [room, setRoom] = useState("");
  const [mode, setMode] = useState<"host" | "guest" | null>(null);
  const [status, setStatus] = useState<NetStatus>("idle");
  const [info, setInfo] = useState<string>("");
  const [peerName, setPeerName] = useState("");

  const netRef = useRef<Net | null>(null);
  if (!netRef.current) {
    netRef.current = new Net({
      onStatus: (s, i) => {
        setStatus(s);
        if (i) setInfo(i);
      },
      onPeer: (_pid, n) => setPeerName(n),
      onStart: () => setStatus("ready"),
      onPeerLeft: () => setStatus("waiting", "对手已离开，等待重连…"),
    });
  }
  const net = netRef.current;

  // Auto-connect on mount so the lobby is ready by the time the user interacts.
  // Any failure surfaces immediately as an error instead of a silent "idle".
  useEffect(() => {
    net.connect(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = () => {
    net.disconnect();
    net.connect(url);
  };

  const doCreate = () => {
    setMode("host");
    net.create(name);
  };

  const doJoin = () => {
    if (room.trim().length < 3) return;
    setMode("guest");
    net.join(room, name);
  };

  const ready = status === "ready";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0f1030] via-[#13143a] to-[#0b0c22] text-slate-100">
      <div className="mx-auto max-w-lg px-5 py-12">
        <h1 className="mb-1 text-center text-3xl font-black tracking-tight text-transparent bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text">
          联机对战
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          1v1 竞技 + 合作守基地 · 与好友跨网络连接
        </p>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="block text-xs text-slate-400">中转服务器地址</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
            placeholder="ws://你的服务器:8080"
          />
          <label className="block text-xs text-slate-400">你的昵称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
            maxLength={16}
          />
          <button
            onClick={connect}
            className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-sm font-semibold hover:bg-white/10"
          >
            连接服务器
          </button>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={doCreate}
              className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-3 text-base font-bold text-cyan-200 hover:scale-[1.02] active:scale-95"
            >
              创建房间（主机）
            </button>
            <div className="flex flex-col gap-2">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-center text-sm uppercase tracking-widest outline-none focus:border-fuchsia-400/60"
                placeholder="房间码"
                maxLength={4}
              />
              <button
                onClick={doJoin}
                className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 py-2 text-sm font-bold text-fuchsia-200 hover:scale-[1.02] active:scale-95"
              >
                加入房间（客户端）
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
          {status === "idle" && <p className="text-slate-400">尚未连接。</p>}
          {status === "connecting" && <p className="text-amber-300">正在连接服务器…</p>}
          {status === "connected" && <p className="text-emerald-300">已连接服务器，可以创建或加入房间了。</p>}
          {status === "waiting" && (
            <div className="space-y-1">
              <p className="text-amber-300">{info}</p>
              {mode === "host" && (
                <p className="text-cyan-300">
                  把房间码 <span className="font-mono text-lg font-bold tracking-widest">{net.roomCode}</span> 发给好友，让他用「加入房间」输入。
                </p>
              )}
            </div>
          )}
          {status === "ready" && (
            <p className="text-emerald-300">
              已与 <span className="font-bold">{peerName || "对手"}</span> 连接！可以开始了。
            </p>
          )}
          {status === "error" && <p className="text-rose-400">错误：{info}</p>}

          {peerName && status !== "ready" && (
            <p className="mt-1 text-slate-400">对手：{peerName}</p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            ← 返回
          </button>
          <button
            disabled={!ready}
            onClick={() => mode && onReady(mode, net)}
            className={
              "flex-1 rounded-lg py-2 text-base font-bold transition " +
              (ready
                ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:scale-[1.01] active:scale-95"
                : "cursor-not-allowed bg-white/5 text-slate-500")
            }
          >
            进入装配 →
          </button>
        </div>
      </div>
    </div>
  );
}
