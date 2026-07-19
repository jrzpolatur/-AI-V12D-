import { useEffect, useState } from "react";
import LoadoutScreen from "./components/LoadoutScreen";
import GameScreen from "./components/GameScreen";
import LobbyScreen from "./components/LobbyScreen";
import { Net } from "./net/Net";
import type { NetMode } from "./net/protocol";
import type { Loadout } from "./game/engine";

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

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  if (screen === "game") {
    return (
      <GameScreen
        loadout={loadout}
        mode={mode}
        net={mode === "local" ? null : net}
        onExit={() => setScreen("menu")}
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
        initialLoadout={loadout}
        onChange={setLoadout}
        onConfirm={(l) => {
          setLoadout(l);
          setScreen("game");
        }}
        onBack={() => setScreen(mode === "local" ? "menu" : "lobby")}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#0f1030] via-[#13143a] to-[#0b0c22] text-slate-100">
      <button
        onClick={toggleFullscreen}
        className="absolute right-4 top-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
      >
        {fullscreen ? "退出全屏" : "全屏"}
      </button>
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          NEON STRIKE
        </h1>
        <p className="mt-2 text-sm text-slate-400">2D 俯视角射击 · 守护基地</p>
      </div>
      <div className="flex w-72 flex-col gap-3">
        <button
          onClick={() => {
            setMode("local");
            setScreen("loadout");
          }}
          className="rounded-xl border border-white/15 bg-white/5 py-4 text-lg font-bold hover:bg-white/10"
        >
          单人游戏
        </button>
        <button
          onClick={() => setScreen("lobby")}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-4 text-lg font-bold text-cyan-200 hover:scale-[1.02] active:scale-95"
        >
          联机对战
        </button>
      </div>
      <p className="max-w-sm text-center text-xs text-slate-500">
        联机需先运行中转服务器（<span className="font-mono">npm run server</span>），
        或连接到部署好的服务器地址。
      </p>
    </div>
  );
}
