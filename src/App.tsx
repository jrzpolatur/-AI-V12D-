import { useEffect, useState } from "react";
import LoadoutScreen from "./components/LoadoutScreen";
import MultiplayerLobby from "./components/MultiplayerLobby";
import RoomScreen from "./components/RoomScreen";
import MainMenuExtras from "./components/MainMenuExtras";
import { Net } from "./net/Net";
import type { NetMode, RoomState } from "./net/protocol";
import type { Loadout } from "./game/engine";
import { useOnlineCount } from "./hooks/useOnlineCount";
import { tabLock } from "./utils/tabLock";
import GameScreen from "./components/GameScreen";
import { getCharacter, getGun, getSkill } from "./game/content";

const homeBg = "home-bg.png";

type Screen = "menu" | "loadout" | "multiplayer_lobby" | "room" | "game";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<NetMode>("local");
  const [net, setNet] = useState<Net | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [youPid, setYouPid] = useState<number>(1);
  const [loadout, setLoadout] = useState<Loadout>({
    characterId: "raider",
    outfitId: "tactical",
    gunId: "smg",
    gunIds: ["smg", "sniper"],
    skillId: "dash",
    gadgetIds: ["turret_mg", "turret_cannon", "mine_explosive"],
    gameMode: "deathmatch",
    dmPlayerCount: 8,
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return (
      localStorage.getItem("dm_player_name") ||
      `特工_${Math.floor(1000 + Math.random() * 9000)}`
    );
  });
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  useEffect(() => {
    localStorage.setItem("dm_player_name", playerName);
  }, [playerName]);

  const onlineCount = useOnlineCount();

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
        .then((d) => {
          if (d && typeof d.text === "string") apply(d.text);
        })
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
        } catch {
          /* ignore malformed frame */
        }
      };
    } catch {
      /* EventSource unsupported — fallback to polling */
    }
    const id = setInterval(load, 30000);
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
          if (mode === "guest" || mode === "host" || net?.isAuthoritative) {
            setScreen("multiplayer_lobby");
          } else {
            setScreen("menu");
          }
        }}
      />
    );
  }

  if (screen === "room" && roomState && net) {
    return (
      <RoomScreen
        net={net}
        initialRoomState={roomState}
        youPid={youPid}
        loadout={loadout}
        onChangeLoadout={(newLo) => setLoadout(newLo)}
        onStartGame={() => {
          setMode(net.playerMode);
          setScreen("game");
        }}
        onLeaveRoom={() => {
          setRoomState(null);
          setScreen("multiplayer_lobby");
        }}
      />
    );
  }

  if (screen === "multiplayer_lobby") {
    return (
      <MultiplayerLobby
        loadout={loadout}
        onBack={() => {
          tabLock.release();
          setScreen("menu");
        }}
        onEnterRoom={(rState, pid, netInstance) => {
          setNet(netInstance);
          setRoomState(rState);
          setYouPid(pid);
          setScreen("room");
        }}
      />
    );
  }

  if (screen === "loadout") {
    return (
      <LoadoutScreen
        onConfirm={(l, m, n) => {
          setLoadout(l);
          setMode(m);
          setNet(n);
          setScreen("game");
        }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  const curChar = getCharacter(loadout.characterId);
  const curGun = getGun(loadout.gunId);
  const curSkill = getSkill(loadout.skillId);

  return (
    <div className="relative min-h-screen w-full select-none overflow-x-hidden overflow-y-auto bg-[#070814] text-white pt-safe pb-safe pl-safe pr-safe">
      {/* 首页全景背景图 */}
      <img
        src={homeBg}
        alt="Cyber Arena Background"
        className="fixed inset-0 h-full w-full object-cover object-center pointer-events-none brightness-90"
        draggable={false}
      />

      {/* 渐变遮罩层，提升UI层次与文字可读性 */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-[#070814]/95 via-[#070814]/50 to-[#070814]/70" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#070814]/30 to-[#070814]/90" />

      {/* 顶部战术导航栏 */}
      <header className="relative z-30 flex w-full items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        {/* 左侧品牌标签 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-950/40 px-3 py-1.5 backdrop-blur-md">
            <span className="text-sm sm:text-base">⚔️</span>
            <span className="text-xs font-black tracking-widest uppercase text-cyan-300">
              PIXEL VANGUARD
            </span>
            <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
              v2.0
            </span>
          </div>

          {/* 实时在线状态指示器 */}
          {onlineCount !== null && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-live-pulse" />
              <span className="text-xs font-bold text-emerald-200">
                联机在线: {onlineCount} 人
              </span>
            </div>
          )}
        </div>

        {/* 右侧：玩家昵称 + 公告与设置 */}
        <div className="flex items-center gap-2">
          {/* 自定义昵称组件 */}
          <div className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-950/40 px-2.5 py-1.5 backdrop-blur-md shadow-lg shadow-violet-950/20">
            <span className="text-xs">🎖️</span>
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={12}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = tempName.trim();
                      if (v) setPlayerName(v);
                      setEditingName(false);
                    } else if (e.key === "Escape") {
                      setTempName(playerName);
                      setEditingName(false);
                    }
                  }}
                  autoFocus
                  placeholder="输入昵称"
                  className="w-20 sm:w-28 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white outline-none border border-cyan-400 placeholder:text-slate-500"
                />
                <button
                  onClick={() => {
                    const v = tempName.trim();
                    if (v) setPlayerName(v);
                    setEditingName(false);
                  }}
                  className="rounded bg-cyan-500/30 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500 hover:text-black transition"
                  title="确认保存"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setTempName(playerName);
                    setEditingName(false);
                  }}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-white/20 transition"
                  title="取消"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempName(playerName);
                  setEditingName(true);
                }}
                className="group flex items-center gap-1.5 text-xs font-bold text-violet-200 hover:text-white transition-colors"
                title="点击修改特工昵称"
              >
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{playerName}</span>
                <span className="text-[10px] text-violet-400 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition">✏️</span>
              </button>
            )}
          </div>

          {onlineCount !== null && (
            <div className="flex sm:hidden items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-2 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
              <span className="text-[11px] font-bold text-emerald-200">
                {onlineCount} 人在线
              </span>
            </div>
          )}
          <MainMenuExtras announce={announce} />
        </div>
      </header>

      {/* 公告横幅（若有公告） */}
      {announce.trim() && (
        <div className="relative z-20 mx-auto mb-2 max-w-2xl px-4">
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-950/60 px-4 py-2 text-xs font-medium text-amber-200 backdrop-blur-md shadow-lg shadow-amber-950/30">
            <span className="text-sm">📢</span>
            <span className="font-bold text-amber-300 whitespace-nowrap">[最新公告]</span>
            <span className="truncate">{announce}</span>
          </div>
        </div>
      )}

      {/* 主界面内容区 */}
      <main className="relative z-20 mx-auto flex min-h-[calc(100vh-140px)] max-w-5xl flex-col items-center justify-center px-4 py-4 sm:py-8">
        {/* 游戏大标题与视觉 Logo */}
        <div className="mb-6 sm:mb-10 text-center animate-card-pop">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-950/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-indigo-300 backdrop-blur-md mb-3 shadow-inner">
            <span>⚡ 战术俯视角像素对决 · 8人实时死斗</span>
          </div>

          <h1 className="hud-skew text-5xl font-black italic tracking-wider sm:text-7xl lg:text-8xl animate-title-glow bg-gradient-to-br from-white via-cyan-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-2xl">
            CYBER ARENA
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-semibold tracking-wide text-slate-300/90 sm:tracking-widest">
            赛 博 竞 技 场 · FAST-PACED 2D SHOOTER
          </p>
        </div>

        {/* 核心游戏模式操作卡片矩阵 */}
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          {/* 卡片 1: 多人联机对战（主推模式） */}
          <button
            onClick={() => setScreen("multiplayer_lobby")}
            className="cyber-card-glow group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-950/85 via-purple-950/75 to-slate-950/90 p-5 sm:p-6 text-left shadow-2xl backdrop-blur-xl transition active:scale-[0.98]"
          >
            {/* 卡片发光装饰 */}
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl group-hover:bg-indigo-500/35 transition-all" />
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/25 border border-indigo-400/30 text-lg">
                    🔥
                  </span>
                  <span className="rounded-md bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-200">
                    8人实时联机
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-300 group-hover:text-white transition-colors">
                  LIVE PVP
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-white group-hover:text-cyan-200 transition-colors">
                多人联机对战
              </h2>
              <p className="mt-1 text-xs text-indigo-100/70 leading-relaxed">
                实时房间死斗 · 满 2 人可直接开战 · 真人自动顶替 AI
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs font-semibold text-slate-300">
                进入大厅 / 创建房间
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-200 group-hover:translate-x-1 group-hover:bg-indigo-500 transition-all">
                ➔
              </span>
            </div>
          </button>

          {/* 卡片 2: 单人游戏 & 生化挑战 */}
          <button
            onClick={() => {
              setMode("local");
              setScreen("loadout");
            }}
            className="cyber-card-glow group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/80 via-slate-900/85 to-slate-950/90 p-5 sm:p-6 text-left shadow-2xl backdrop-blur-xl transition active:scale-[0.98]"
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/15 blur-2xl group-hover:bg-cyan-500/30 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/25 border border-cyan-400/30 text-lg">
                    ⚡
                  </span>
                  <span className="rounded-md bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-200">
                    单人 & 生化
                  </span>
                </div>
                <span className="text-xs font-bold text-cyan-300 group-hover:text-white transition-colors">
                  SOLO / PVE
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-white group-hover:text-cyan-200 transition-colors">
                单人与闯关模式
              </h2>
              <p className="mt-1 text-xs text-cyan-100/70 leading-relaxed">
                人机自由对战 · 生化危机尸潮生存 · 自定义地图打靶
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs font-semibold text-slate-300">
                选择模式 & 出发
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/30 text-cyan-200 group-hover:translate-x-1 group-hover:bg-cyan-500 transition-all">
                ➔
              </span>
            </div>
          </button>
        </div>

        {/* 底部快速配装预览卡片 */}
        <div className="mt-4 w-full max-w-3xl rounded-2xl border border-white/15 bg-black/60 p-3.5 sm:p-4 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* 当前出装概要 */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl">
                🛡️
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  当前出装 LOADOUT
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="text-cyan-300">{curChar.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-amber-300">{curGun.name}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-purple-300">{curSkill.name}</span>
                </div>
              </div>
            </div>

            {/* 进入配装按钮 */}
            <button
              onClick={() => {
                setMode("local");
                setScreen("loadout");
              }}
              className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>⚙️ 调整军械与技能</span>
            </button>
          </div>
        </div>
      </main>

      {/* 底部版权与制作信息 */}
      <footer className="relative z-20 pb-4 text-center text-xs text-white/60">
        <p style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          AI 协同开发 · 战术竞技 2D 射击 · 策划 @Zpolatur
        </p>
      </footer>
    </div>
  );
}
