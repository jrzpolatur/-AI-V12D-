import { useEffect, useState } from "react";
import LoadoutScreen from "./components/LoadoutScreen";
import LobbyScreen from "./components/LobbyScreen";
import MainMenuExtras from "./components/MainMenuExtras";
import { Net } from "./net/Net";
import type { NetMode } from "./net/protocol";
import type { Loadout } from "./game/engine";
import { useOnlineCount } from "./hooks/useOnlineCount";
// Background image lives in /public and is referenced by a plain (relative)
// path string so Vite does NOT run it through the asset pipeline. Going through
// `import homeBg from "./assets/..."` + a relative `base` makes Vite emit
// `import.meta.url`, which the file://-safe build turns into a classic <script>
// — and `import.meta` is a SyntaxError in classic scripts, breaking the whole
// app (React never mounts → stuck on the loading splash).
const homeBg = "home-bg.png";

import { tabLock } from "./utils/tabLock";

import GameScreen from "./components/GameScreen";

type Screen = "menu" | "loadout" | "lobby" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<NetMode>("local");
  const [net, setNet] = useState<Net | null>(null);
  const [loadout, setLoadout] = useState<Loadout>({
    characterId: "raider",
    outfitId: "tactical",
    gunId: "smg",
    gunIds: ["smg", "sniper"],
    skillId: "dash",
    gadgetIds: ["turret_mg", "turret_cannon", "mine_explosive"],
  });

  const onlineCount = useOnlineCount();

  // 主界面公告 / 消息：从同一服务器拉取（连接服务器的玩家都能看到）。
  // 实时同步：用 EventSource 订阅 SSE 流，管理员一发布，在线玩家秒级刷新；
  // 同时保留首屏 GET 拉取 + 兜底轮询（防 SSE 被代理/网络中断时长期不更新）。
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    let alive = true;
    const apply = (text: string) => {
      if (!alive) return;
      setAnnounce(typeof text === "string" && text.trim() ? text : "");
    };
    const load = () => {
      fetch("/api/announcements")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d && typeof d.text === "string") apply(d.text); })
        .catch(() => {});
    };
    load();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/announcements/stream");
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d && "text" in d) apply(d.text);
        } catch { /* ignore malformed frame */ }
      };
      // EventSource auto-reconnects on error; nothing to do here.
    } catch { /* EventSource unsupported (e.g. file://) — rely on polling */ }
    const id = setInterval(load, 30000); // fallback if SSE drops
    return () => {
      alive = false;
      clearInterval(id);
      if (es) es.close();
    };
  }, []);

  if (screen === "game") {
    return (
      <GameScreen
        loadout={loadout}
        mode={mode}
        net={mode === "local" ? null : net}
        onExit={() => {
          tabLock.release();
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "lobby") {
    return (
      <LobbyScreen
        onReady={(m, n) => {
          setMode(m);
          setNet(n);
          setScreen("loadout");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "loadout") {
    return (
      <LoadoutScreen
        isMultiplayer={mode !== "local"}
        onConfirm={(l) => {
          setLoadout(l);
          setScreen("game");
        }}
        onBack={() => setScreen(mode === "local" ? "menu" : "lobby")}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0c22]">
      {/* 首页背景图（不叠加暗化遮罩，保持原图亮度） */}
      <img
        src={homeBg}
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
        draggable={false}
      />

      {/* 右上角：菜单按钮（公告 + 设置） */}
      <MainMenuExtras announce={announce} />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center px-6 pt-16 sm:pt-24">
        {/* 进入游戏方块（靠上方） */}
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => {
                setMode("local");
                setScreen("loadout");
              }}
              className="rounded-xl border border-white/20 bg-white/10 py-5 text-lg font-bold text-white transition hover:bg-white/20 active:scale-95"
            >
              单人游戏
            </button>
            <button
              onClick={() => setScreen("lobby")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-500/20 py-5 text-lg font-bold text-cyan-100 transition hover:scale-[1.02] hover:bg-cyan-500/30 active:scale-95"
            >
              联机对战
            </button>
          </div>
          {onlineCount !== null && (
            <div className="mt-4 text-center text-sm font-medium text-cyan-200/80">
              当前在线人数: {onlineCount}
            </div>
          )}
        </div>

        {/* 底部小字 */}
        <p
          className="mt-auto pb-6 text-center text-xs text-white/80"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
        >
          本游戏由人工智能生成，能工智人@Zpolatur负责策划和Prompt
        </p>
      </div>
    </div>
  );
}
