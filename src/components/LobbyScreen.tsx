import { useEffect, useRef, useState } from "react";
import { Net, type NetStatus } from "../net/Net";
import { useOnlineCount } from "../hooks/useOnlineCount";

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
  const [status, setStatus] = useState<NetStatus>("idle");
  const [info, setInfo] = useState<string>("");
  const [peerName, setPeerName] = useState("");
  const onlineCount = useOnlineCount();

  const netRef = useRef<Net | null>(null);
  const advanced = useRef(false);
  if (!netRef.current) {
    netRef.current = new Net({
      onStatus: (s, i) => {
        setStatus(s);
        if (i) setInfo(i);
      },
      onPeer: (_pid, n) => setPeerName(n),
      onStart: () => {
        setStatus("ready");
        // Once matched (or re-matched after a transient reconnect) go straight
        // to the loadout screen — no extra "进入装配" click, and never a forced
        // re-match. Guarded so a later rejoin (while already in-game) can't kick
        // the player back to the lobby.
        if (!advanced.current) {
          advanced.current = true;
          onReady(net.playerMode, net);
        }
      },
      onPeerGone: () => {
        setInfo("对手掉线，正在等待重连…");
      },
      onPeerBack: () => {
        setInfo("");
        setStatus("ready");
      },
      onPeerLeft: () => {
        advanced.current = false;
        setStatus("waiting");
        setInfo("对手已离开，正在重新匹配…");
      },
    });
  }
  const net = netRef.current;

  // Auto-connect on mount with auto-reconnect so a flaky link (e.g. free-tier
  // cold starts) recovers transparently instead of flipping colours.
  useEffect(() => {
    net.connect(url, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doFind = () => net.find(name);

  const ready = status === "ready";
  const canFind = status === "connected" || status === "idle" || status === "error";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0f1030] via-[#13143a] to-[#0b0c22] text-slate-100">
      <div className="mx-auto max-w-lg px-5 py-12">
        <h1 className="mb-1 text-center text-3xl font-black tracking-tight text-transparent bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text">
          联机对战
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          1v1 竞技 (死亡竞赛) · 点一下自动匹配对手
        </p>

        {onlineCount !== null && (
          <div className="mb-4 text-center text-xs font-medium text-cyan-400/80">
            当前服务器在线: {onlineCount}
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="block text-xs text-slate-400">你的昵称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
            maxLength={16}
          />

          <button
            onClick={doFind}
            disabled={!canFind}
            className={
              "w-full rounded-xl py-4 text-lg font-black transition " +
              (canFind
                ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:scale-[1.01] active:scale-95"
                : "cursor-not-allowed bg-white/5 text-slate-500")
            }
          >
            {ready ? "已匹配，进入装配 →" : status === "waiting" ? "匹配中…" : "快速匹配"}
          </button>

          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer select-none">高级：手动服务器地址</summary>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
              placeholder="ws://你的服务器:8080"
            />
          </details>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
          {status === "idle" && <p className="text-slate-400">尚未连接。</p>}
          {status === "connecting" && <p className="text-amber-300">正在连接服务器…（会自动重试）</p>}
          {status === "connected" && <p className="text-emerald-300">已连接服务器，点「快速匹配」开始。</p>}
          {status === "waiting" && <p className="text-amber-300">{info}</p>}
          {status === "ready" && (
            <p className="text-emerald-300">
              已与 <span className="font-bold">{peerName || "对手"}</span> 连接！可以开始了。
            </p>
          )}
          {status === "error" && <p className="text-rose-400">错误：{info}（正在自动重连…）</p>}

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
            onClick={() => onReady(net.playerMode, net)}
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
