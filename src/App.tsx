import { useEffect, useState } from "react";
import LoadoutScreen from "./components/LoadoutScreen";
import GameScreen from "./components/GameScreen";
import LobbyScreen from "./components/LobbyScreen";
import { Net } from "./net/Net";
import type { NetMode } from "./net/protocol";
import type { Loadout } from "./game/engine";
import { useOnlineCount } from "./hooks/useOnlineCount";
import homeBg from "./assets/home-bg.png";

import { tabLock } from "./utils/tabLock";

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
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/announcements")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d && typeof d.text === "string" && d.text.trim()) {
            setAnnounce(d.text);
          }
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 20000); // 管理员发布后自动刷新
    return () => {
      alive = false;
      clearInterval(id);
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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 首页背景图（不叠加暗化遮罩，保持原图亮度） */}
      <img
        src={homeBg}
        alt=""
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
        draggable={false}
      />

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

        {/* 公告 / 消息（连接服务器后自动显示） */}
        {announce && (
          <div
            className="w-full max-w-md rounded-2xl border border-amber-300/30 bg-black/35 p-4 text-center shadow-lg backdrop-blur-md"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}
          >
            <div className="mb-1 text-xs font-bold tracking-[0.3em] text-amber-300/90">
              📢 公告
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-50">
              {announce}
            </p>
          </div>
        )}

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
