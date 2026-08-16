import { useState, useEffect, useRef } from "react";
import { Net } from "../net/Net";
import type { RoomState, RoomPeerInfo } from "../net/protocol";
import type { Loadout } from "../game/engine";
import {
  CHARACTERS,
  GUNS,
  OUTFITS,
  SKILLS,
  GADGETS,
  getGun,
  getCharacter,
  getOutfit,
  getSkill,
} from "../game/content";
import { drawCharacter } from "../game/draw";

interface RoomScreenProps {
  net: Net;
  initialRoomState: RoomState;
  youPid: number;
  loadout: Loadout;
  onChangeLoadout: (newLoadout: Loadout) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

function PlayerSlotPreview({
  peer,
  isMe,
  localLoadout,
}: {
  peer: RoomPeerInfo;
  isMe: boolean;
  localLoadout: Loadout;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lo = (isMe ? localLoadout : peer.loadout) || localLoadout;
  const charDef = getCharacter(lo.characterId ?? "raider");
  const outfitDef = getOutfit(lo.outfitId ?? "tactical");
  const gunDef = getGun(lo.gunIds?.[0] ?? lo.gunId ?? "mac11");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2 + 10);
      ctx.scale(1, 0.42);
      ctx.strokeStyle = "rgba(148,163,184,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const angle = Math.sin(t * 1.2) * 0.4 - Math.PI / 2;
      drawCharacter(ctx, {
        x: w / 2,
        y: h / 2,
        angle,
        character: charDef,
        outfit: outfitDef,
        size: 20,
        t,
        gun: gunDef,
      });
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [charDef, outfitDef, gunDef]);

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-black/40 p-3 shadow-lg backdrop-blur-md transition-all hover:border-indigo-400/50">
      {/* 顶部标签 */}
      <div className="flex w-full items-center justify-between">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            peer.isHost
              ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
              : peer.ready
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
          }`}
        >
          {peer.isHost ? "👑 房主" : peer.ready ? "✅ 已就绪" : "⏳ 准备中"}
        </span>
        {isMe && (
          <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
            你
          </span>
        )}
      </div>

      {/* 角色与武器动画预览 */}
      <div className="my-1 h-20 w-20 flex items-center justify-center">
        <canvas ref={canvasRef} className="h-20 w-20" />
      </div>

      {/* 玩家名称与配装小字 */}
      <div className="w-full text-center">
        <h4 className="truncate text-xs font-bold text-slate-100">
          {peer.name || `玩家${peer.pid}`}
        </h4>
        <p className="truncate text-[10px] text-indigo-300">
          {charDef.name} · {gunDef.name}
        </p>
      </div>
    </div>
  );
}

function BotSlotPlaceholder({ index }: { index: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-3 text-center text-slate-500 transition hover:border-white/25">
      <span className="text-2xl opacity-60">🤖</span>
      <h4 className="mt-1.5 text-xs font-semibold text-slate-400">
        AI 智械 #{index + 1}
      </h4>
      <p className="text-[10px] text-slate-500">开局自动补位</p>
    </div>
  );
}

export default function RoomScreen({
  net,
  initialRoomState,
  youPid,
  loadout,
  onChangeLoadout,
  onStartGame,
  onLeaveRoom,
}: RoomScreenProps) {
  const [roomState, setRoomState] = useState<RoomState>(initialRoomState);
  const [copiedToast, setCopiedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showLoadoutModal, setShowLoadoutModal] = useState(false);

  // Live room state updates and match start trigger
  useEffect(() => {
    net.events.onRoomState = (state) => {
      setRoomState(state);
    };
    net.events.onMatchStart = () => {
      onStartGame();
    };
    net.events.onStatus = (status, info) => {
      if (status === "error" && info) setErrorMsg(info);
    };
  }, [net, onStartGame]);

  const me = roomState.peers.find((p) => p.pid === youPid);
  const isHost = me?.isHost ?? (roomState.hostPid === youPid);
  const isReady = me?.ready ?? false;
  const humanCount = roomState.peers.length;
  const botCount = Math.max(0, 8 - humanCount);

  // All guests ready check
  const allGuestsReady = roomState.peers
    .filter((p) => !p.isHost)
    .every((p) => p.ready);

  const canStart = isHost && humanCount >= 2 && allGuestsReady;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomState.code);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const toggleReady = () => {
    net.setReady(!isReady);
  };

  const handleStartMatch = () => {
    if (!canStart) return;
    net.startMatch();
  };

  const handleUpdateLoadout = (newLo: Loadout) => {
    onChangeLoadout(newLo);
    net.updateRoomLoadout(newLo);
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-[#0b0c22] text-white p-4 sm:p-8 flex flex-col justify-between">
      {/* 顶部房间信息栏 */}
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                net.leaveRoom();
                onLeaveRoom();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-slate-300 transition hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-300 active:scale-95"
              title="退出房间"
            >
              ←
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  {roomState.name}
                </h1>
                <span className="rounded-md bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 text-xs font-mono font-bold text-indigo-300">
                  #{roomState.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[11px] text-slate-300 transition active:scale-95"
                >
                  {copiedToast ? "✅ 已复制" : "📋 复制房间号"}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                🔥 8人自由死斗 · 满 2 人可开局 · 当前真人{" "}
                <span className="text-emerald-400 font-bold">{humanCount}</span>/8 人（将自动补齐{" "}
                <span className="text-amber-400 font-bold">{botCount}</span> 个人机）
              </p>
            </div>
          </div>

          {/* 右侧配装按钮 */}
          <button
            onClick={() => setShowLoadoutModal(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/40 px-4 py-2 text-xs font-bold text-indigo-200 transition hover:bg-indigo-600 hover:text-white active:scale-95 shadow-md shadow-indigo-950/50"
          >
            ⚙️ 调整装备配装
          </button>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-500/20 border border-rose-500/40 px-4 py-2 text-xs text-rose-300">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* 8-槽位 网格展示 */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            参战者槽位 (8人满员)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* 真实玩家槽位 */}
            {roomState.peers.map((p) => (
              <PlayerSlotPreview
                key={p.pid}
                peer={p}
                isMe={p.pid === youPid}
                localLoadout={loadout}
              />
            ))}

            {/* AI 补位占位槽位 */}
            {Array.from({ length: botCount }).map((_, i) => (
              <BotSlotPlaceholder key={`bot-${i}`} index={humanCount + i} />
            ))}
          </div>
        </div>
      </div>

      {/* 底部操作与控制条 */}
      <div className="mx-auto w-full max-w-5xl border-t border-white/10 pt-4 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isHost
                ? humanCount < 2
                  ? "等待至少 1 名其他玩家加入…"
                  : !allGuestsReady
                  ? "等待其他玩家点击准备就绪…"
                  : "全员已就绪，房主可点击开始游戏！"
                : isReady
                ? "你已就绪，等待房主开局…"
                : "请调整配装并点击准备就绪"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                net.leaveRoom();
                onLeaveRoom();
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-300 transition active:scale-95"
            >
              退出房间
            </button>

            {isHost ? (
              <button
                onClick={handleStartMatch}
                disabled={!canStart}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                🚀 开始对战 (真人 {humanCount} + 人机 {botCount})
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg transition active:scale-95 ${
                  isReady
                    ? "bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-500/40"
                    : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30 border border-indigo-400/40"
                }`}
              >
                {isReady ? "取消准备" : "✅ 准备就绪"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 调整配装简易弹窗 */}
      {showLoadoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-indigo-500/30 bg-[#121433] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">调整武器与角色配装</h3>
              <button
                onClick={() => setShowLoadoutModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* 角色选择 */}
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                选择角色
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const newLo = { ...loadout, characterId: c.id };
                      handleUpdateLoadout(newLo);
                    }}
                    className={`rounded-xl p-2 text-left border transition ${
                      loadout.characterId === c.id
                        ? "bg-indigo-600/30 border-indigo-400 text-white"
                        : "bg-black/30 border-white/10 text-slate-400 hover:border-white/30"
                    }`}
                  >
                    <div className="font-bold text-xs">{c.name}</div>
                    <div className="text-[10px] opacity-70">HP: {c.maxHp}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 主副武器选择 */}
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                武器装备 (最多选择 2 把)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GUNS.map((g) => {
                  const isSelected = (loadout.gunIds ?? [loadout.gunId]).includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        let newGunIds = loadout.gunIds ? [...loadout.gunIds] : [loadout.gunId];
                        if (isSelected) {
                          if (newGunIds.length > 1) {
                            newGunIds = newGunIds.filter((id) => id !== g.id);
                          }
                        } else {
                          if (newGunIds.length >= 2) newGunIds = [newGunIds[1], g.id];
                          else newGunIds.push(g.id);
                        }
                        const newLo = { ...loadout, gunIds: newGunIds, gunId: newGunIds[0] };
                        handleUpdateLoadout(newLo);
                      }}
                      className={`rounded-xl p-2 text-left border transition ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-400 text-amber-200"
                          : "bg-black/30 border-white/10 text-slate-400 hover:border-white/30"
                      }`}
                    >
                      <div className="font-bold text-xs">{g.name}</div>
                      <div className="text-[10px] opacity-70">{g.desc || "战术枪械"}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 战术技能选择 */}
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                战术技能
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SKILLS.map((sk) => (
                  <button
                    key={sk.id}
                    onClick={() => {
                      const newLo = { ...loadout, skillId: sk.id };
                      handleUpdateLoadout(newLo);
                    }}
                    className={`rounded-xl p-2 text-left border transition ${
                      loadout.skillId === sk.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-black/30 border-white/10 text-slate-400 hover:border-white/30"
                    }`}
                  >
                    <div className="font-bold text-xs">{sk.name}</div>
                    <div className="text-[10px] opacity-70">CD: {sk.cooldown}s</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setShowLoadoutModal(false)}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
