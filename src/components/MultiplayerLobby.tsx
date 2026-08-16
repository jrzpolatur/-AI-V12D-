import { useState, useEffect, useRef } from "react";
import { Net } from "../net/Net";
import type { RoomState, RoomSummary } from "../net/protocol";
import type { Loadout } from "../game/engine";
import { tabLock } from "../utils/tabLock";
import { useServerConfig } from "../utils/serverConfig";
import ServerSelectModal from "./ServerSelectModal";

interface MultiplayerLobbyProps {
  loadout: Loadout;
  onBack: () => void;
  onEnterRoom: (roomState: RoomState, youPid: number, net: Net) => void;
}

export default function MultiplayerLobby({
  loadout,
  onBack,
  onEnterRoom,
}: MultiplayerLobbyProps) {
  const { config, updateConfig, wsUrl, modeLabel } = useServerConfig();
  const [showServerModal, setShowServerModal] = useState(false);

  const [net, setNet] = useState<Net | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [playerName, setPlayerName] = useState(() => {
    return (
      localStorage.getItem("dm_player_name") ||
      `玩家_${Math.floor(1000 + Math.random() * 9000)}`
    );
  });
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectingElapsed, setConnectingElapsed] = useState(0);

  const connectStartTimeRef = useRef(Date.now());

  useEffect(() => {
    localStorage.setItem("dm_player_name", playerName);
  }, [playerName]);

  // Connect or reconnect when wsUrl changes
  useEffect(() => {
    setIsConnected(false);
    setErrorMsg("");
    setConnectingElapsed(0);
    connectStartTimeRef.current = Date.now();

    const timer = setInterval(() => {
      setConnectingElapsed(Math.floor((Date.now() - connectStartTimeRef.current) / 1000));
    }, 1000);

    const netInstance = new Net({
      onStatus: (s, info) => {
        const connected = s === "connected" || s === "waiting" || s === "ready";
        setIsConnected(connected);
        if (connected) {
          setErrorMsg("");
        }
        if (s === "error") {
          setIsConnected(false);
          if (info) setErrorMsg(info);
        }
      },
      onRoomList: (list) => {
        setRooms(list);
      },
      onRoomState: (state, youPid) => {
        onEnterRoom(state, youPid, netInstance);
      },
    });

    netInstance.connect(wsUrl, true);
    setNet(netInstance);

    // Initial fetch + periodic poll for room list
    const pollId = setInterval(() => {
      if (netInstance.isConnected) {
        netInstance.fetchRoomList();
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(pollId);
      netInstance.disconnect();
    };
  }, [wsUrl, onEnterRoom]);

  const handleReconnect = () => {
    if (net) {
      setIsConnected(false);
      setErrorMsg("");
      setConnectingElapsed(0);
      connectStartTimeRef.current = Date.now();
      net.connect(wsUrl, true);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!net || !net.isConnected) {
      setErrorMsg("正在连接服务器，请稍候…");
      return;
    }
    const rName = roomNameInput.trim() || `${playerName}的房间`;
    net.createRoom(rName, playerName, loadout, "deathmatch");
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!net || !net.isConnected) {
      setErrorMsg("正在连接服务器，请稍候…");
      return;
    }
    const code = roomCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      setErrorMsg("请输入正确的 4 位房间号");
      return;
    }
    net.joinRoom(code, playerName, loadout);
  };

  const handleJoinDirect = (code: string) => {
    if (!net || !net.isConnected) {
      setErrorMsg("正在连接服务器，请稍候…");
      return;
    }
    net.joinRoom(code, playerName, loadout);
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#0b0c22] text-white p-4 sm:p-8">
      {/* 顶部背景装饰 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-900/20 via-purple-950/10 to-transparent pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl flex flex-col gap-6">
        {/* 顶部标题与服务器控制栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-slate-300 transition hover:bg-white/20 hover:text-white active:scale-95"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                多人联机大厅 (8人死斗)
              </h1>
              <p className="text-xs text-slate-400">
                满 2 人即可开局 · 真人自动顶替 AI 机器人 · 权威服务器计算
              </p>
            </div>
          </div>

          {/* 服务器节点切换与状态徽章 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 服务器选择按钮 */}
            <button
              onClick={() => setShowServerModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-950/40 hover:bg-indigo-900/60 px-3 py-1.5 backdrop-blur-md text-xs font-semibold text-indigo-200 transition active:scale-95 shadow-md"
              title="点击切换联机服务器 (本地 / Render 云端 / 自定义)"
            >
              <span>🌐</span>
              <span className="font-bold text-white">
                {config.mode === "local"
                  ? "💻 本地服务器"
                  : config.mode === "render"
                  ? "☁️ Render 云端"
                  : config.mode === "custom"
                  ? "⚡ 自定义节点"
                  : "🎯 自动节点"}
              </span>
              <span className="text-[10px] text-indigo-300 underline ml-0.5">切换</span>
            </button>

            {/* 状态徽章 */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected
                    ? "bg-emerald-400 shadow-emerald-400/50 shadow-md animate-pulse"
                    : "bg-rose-500 animate-pulse"
                }`}
              />
              <span className="text-xs font-semibold text-slate-300">
                {isConnected ? "已连通" : "连接中…"}
              </span>
            </div>

            {/* 若未连接提供刷新重连按钮 */}
            {!isConnected && (
              <button
                onClick={handleReconnect}
                className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/20 transition active:scale-95"
                title="重新连接当前服务器"
              >
                🔄 重连
              </button>
            )}
          </div>
        </div>

        {/* 唤醒中 / 连接中详细提示 (针对 Render 远程或正在连接) */}
        {!isConnected && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3.5 backdrop-blur-md flex items-start gap-3 text-xs text-indigo-200 animate-fade-in">
            <span className="text-base animate-spin">⏳</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  正在连接服务器: <code className="font-mono text-cyan-300">{wsUrl}</code>
                </span>
                <span className="text-[11px] text-slate-400">已耗时 {connectingElapsed}s</span>
              </div>
              <p className="mt-1 text-slate-300 leading-relaxed">
                {config.mode === "render" || wsUrl.includes("onrender.com") ? (
                  <>
                    💡 <b className="text-amber-300">Render 云端自动唤醒中：</b>
                    Render 免费服务休眠时会在收到连接后<b>自动唤醒</b>（无需在网页端后台操作）。初次启动耗时约 30~50 秒，连接建立后将保持畅玩。
                  </>
                ) : config.mode === "local" ? (
                  <>
                    💡 <b className="text-emerald-300">本地服务器提示：</b>
                    请确保本地已启动服务端（可在项目根目录双击 <code className="text-emerald-300 font-mono">启动联机服务器.bat</code> 或运行 <code className="text-emerald-300 font-mono">npm start</code>）。
                  </>
                ) : (
                  <>正在建立 WebSocket 握手，请稍候…</>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowServerModal(true)}
              className="rounded-lg bg-indigo-500/30 border border-indigo-400/40 px-2.5 py-1 text-[11px] font-bold text-indigo-200 hover:bg-indigo-500 hover:text-white transition whitespace-nowrap"
            >
              更换服务器
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center justify-between rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2.5 text-xs text-rose-300 animate-fade-in">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => setErrorMsg("")}
              className="text-rose-400 hover:text-rose-200 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 玩家昵称与快捷操作区 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 昵称设置卡片 */}
          <div className="rounded-2xl border border-white/10 bg-[#121433]/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                你的战斗昵称
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm font-semibold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="输入昵称"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              进入房间后其他玩家与击杀榜将显示此名称
            </p>
          </div>

          {/* 房间码加入卡片 */}
          <form
            onSubmit={handleJoinByCode}
            className="rounded-2xl border border-white/10 bg-[#121433]/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                输入房间号加入
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm font-bold text-center tracking-widest text-amber-300 uppercase focus:border-amber-400 focus:outline-none"
                  placeholder="4位房间码 (如 K8F2)"
                />
                <button
                  type="submit"
                  disabled={!roomCodeInput.trim() || !isConnected}
                  className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500 hover:text-black active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  加入
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              输入好友分享的 4 位房间邀请码直达房间
            </p>
          </form>

          {/* 创建房间按钮卡片 */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-900/80 p-4 shadow-xl backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  8人死斗房间
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  满2人可开
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">
                创建专属对局，空位自动补足 6~7 个人机
              </p>
            </div>
            <button
              onClick={() => {
                setRoomNameInput(`${playerName}的房间`);
                setShowCreateModal(true);
              }}
              disabled={!isConnected}
              className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              + 创建新房间
            </button>
          </div>
        </div>

        {/* 公共房间列表区 */}
        <div className="rounded-2xl border border-white/10 bg-[#121433]/70 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                开放房间列表 ({rooms.length})
              </h2>
              <span className="text-xs text-slate-500">· 自动实时刷新</span>
            </div>
            <button
              onClick={() => net?.fetchRoomList()}
              className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/15 transition active:scale-95"
            >
              🔄 刷新
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
              <span className="text-3xl mb-2">🏜️</span>
              <p className="text-sm font-semibold text-slate-300">
                当前暂无公开等待中的房间
              </p>
              <p className="text-xs text-slate-500 mt-1">
                点击右上角“创建新房间”，邀请好友或等待其他玩家加入
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map((r) => (
                <div
                  key={r.code}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 transition hover:border-indigo-400/50 hover:bg-indigo-950/20"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">
                        {r.name}
                      </span>
                      <span className="rounded bg-indigo-500/20 border border-indigo-400/30 px-1.5 py-0.2 text-[10px] font-mono text-indigo-300">
                        #{r.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>房主: {r.hostName}</span>
                      <span>•</span>
                      <span className="text-cyan-300 font-medium">8人死斗</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        {r.count} / {r.max} 人
                      </span>
                      <p className="text-[10px] text-slate-500">
                        {r.state === "in_game" ? "战斗中" : "等待中"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleJoinDirect(r.code)}
                      disabled={r.count >= r.max || r.state === "in_game" || !isConnected}
                      className="rounded-xl bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/50 text-indigo-200 hover:text-white px-4 py-1.5 text-xs font-bold transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {r.state === "in_game" ? "进行中" : "加入"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建房间弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/30 bg-[#121433] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">创建死斗房间</h3>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  房间名称
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  placeholder="输入房间名称"
                />
              </div>

              <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>对战模式:</span>
                  <span className="text-cyan-300 font-semibold">8人自由死斗 (FFA)</span>
                </div>
                <div className="flex justify-between">
                  <span>开局条件:</span>
                  <span className="text-amber-300 font-semibold">满 2 人且准备后房主可开局</span>
                </div>
                <div className="flex justify-between">
                  <span>机器人补位:</span>
                  <span className="text-emerald-300 font-semibold">自动补满至 8 人</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 服务器选择弹窗 */}
      <ServerSelectModal
        isOpen={showServerModal}
        currentConfig={config}
        onClose={() => setShowServerModal(false)}
        onSave={(newCfg) => {
          updateConfig(newCfg);
        }}
      />
    </div>
  );
}
