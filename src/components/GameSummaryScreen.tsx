import React from "react";
import type { PlayerSummaryStat } from "../game/engine";

interface GameSummaryScreenProps {
  reason: string;
  stats?: PlayerSummaryStat[];
  onRestart: () => void;
  onExit: () => void;
}

export const GameSummaryScreen: React.FC<GameSummaryScreenProps> = ({
  reason,
  stats = [],
  onRestart,
  onExit,
}) => {
  const isVictory =
    reason.includes("获胜") ||
    reason.includes("赢") ||
    reason.includes("摧毁") ||
    reason.includes("通关");

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between bg-[#0a0c16]/95 p-6 backdrop-blur-md text-slate-100 select-none overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-500/30">
              Match Summary
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              总览 THE BOUNDLESS
            </h1>
          </div>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            {reason}
          </p>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-black ${isVictory ? "text-amber-400" : "text-rose-400"} tracking-wide uppercase`}>
            {isVictory ? "比赛胜利者" : "战败"}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-widest font-mono mt-0.5">
            SUMMARY RESULT
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="my-auto py-6 flex flex-wrap items-center justify-center gap-6">
        {stats.map((player, idx) => (
          <div
            key={player.id || idx}
            style={{ animationDelay: `${idx * 100}ms` }}
            className={`relative w-72 rounded-2xl border ${
              player.isMvp
                ? "border-amber-400/60 bg-gradient-to-b from-amber-950/40 via-[#16172e] to-[#0f1024] shadow-[0_0_30px_rgba(251,191,36,0.15)]"
                : player.isLocal
                ? "border-cyan-400/40 bg-gradient-to-b from-cyan-950/30 via-[#14162e] to-[#0d0e20]"
                : "border-white/10 bg-gradient-to-b from-slate-900/60 via-[#14152a] to-[#0b0c1b]"
            } p-5 transition-all duration-300 hover:scale-105 animate-card-pop`}
          >
            {/* MVP Badge */}
            {player.isMvp && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-0.5 text-xs font-black text-slate-950 shadow-md tracking-wider flex items-center gap-1">
                ★ MVP 杰出选手
              </div>
            )}

            {/* Rank / Identity Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 mt-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm text-slate-900"
                  style={{ backgroundColor: player.color || "#64748b" }}
                >
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    {player.name}
                    {player.isLocal && (
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300">
                        你
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {player.characterName || "参赛者"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-400">LVL</div>
                <div className="text-sm font-black text-white">{player.score > 0 ? Math.min(99, Math.ceil(player.score / 100)) : 1}</div>
              </div>
            </div>

            {/* Main Score Display */}
            <div className="rounded-xl bg-black/30 p-3 mb-4 text-center border border-white/5">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">战斗得分 / TOTAL SCORE</div>
              <div className="text-3xl font-black text-amber-300 tracking-tight">
                {player.score.toLocaleString()}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">淘汰 (Kills)</span>
                <span className="font-bold text-emerald-400">{player.kills}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">阵亡 (Deaths)</span>
                <span className="font-bold text-rose-400">{player.deaths}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">造成伤害 (Dealt)</span>
                <span className="font-bold text-cyan-400">{player.damageDealt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">承受伤害 (Taken)</span>
                <span className="font-bold text-amber-400/90">{player.damageTaken.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="text-xs text-slate-500">
          按按钮继续与队友并肩作战或返回装配大厅
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="rounded-xl border border-white/15 px-6 py-2.5 font-bold text-slate-300 transition hover:bg-white/10"
          >
            返回主菜单
          </button>
          <button
            onClick={onRestart}
            className="rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-8 py-2.5 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-105 hover:brightness-110 active:scale-95"
          >
            ↻ 再来一局 (AGAIN)
          </button>
        </div>
      </div>
    </div>
  );
};
