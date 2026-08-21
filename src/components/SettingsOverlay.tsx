import { useState } from "react";
import { useSettings, updateSettings } from "../game/settings";
import MobileKeybindEditor from "./MobileKeybindEditor";
import BotStrengthControl from "./BotStrengthControl";

const FPS_OPTIONS = [
  { label: "不限制", value: 0 },
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "90", value: 90 },
];

export default function SettingsOverlay({
  isTouch,
  isFull,
  onToggleFullscreen,
  onExit,
  onResume,
}: {
  isTouch: boolean;
  isFull: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
  onResume: () => void;
}) {
  const s = useSettings();
  const [editingKeys, setEditingKeys] = useState(false);

  if (editingKeys) {
    return <MobileKeybindEditor onDone={() => setEditingKeys(false)} />;
  }

  const setVolume = (v: number) => {
    updateSettings({ volume: v, muted: v === 0 ? s.muted : false });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-[#15163a]/95 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">设置</h2>
          <button
            onClick={onResume}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* ---- Audio ---- */}
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">音频</h3>
            <button
              onClick={() => updateSettings({ muted: !s.muted })}
              className={
                "rounded-full border px-3 py-1 text-xs font-semibold " +
                (s.muted
                  ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
                  : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200")
              }
            >
              {s.muted ? "已静音" : "开启"}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            className="w-full accent-cyan-400"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>静音</span>
            <span>{Math.round(s.volume * 100)}%</span>
            <span>最大</span>
          </div>
        </section>

        {/* ---- 性能监测与帧率控制 ---- */}
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">性能监测与帧率</h3>
              <p className="text-[10px] text-slate-400">实时显示 FPS、CPU 模拟、GPU 渲染及内存利用率</p>
            </div>
            <button
              onClick={() => updateSettings({ perfMonitor: !s.perfMonitor, showFps: !s.perfMonitor })}
              className={
                "rounded-full border px-3 py-1 text-xs font-bold transition flex items-center gap-1.5 " +
                (s.perfMonitor
                  ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-200 shadow-md shadow-cyan-950/40"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200")
              }
              title="在游戏画面顶部 HUD 实时显示 FPS、CPU、GPU 及内存监控"
            >
              <span className={s.perfMonitor ? "h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" : "h-1.5 w-1.5 rounded-full bg-slate-500"} />
              <span>{s.perfMonitor ? "性能监测: 开启" : "性能监测: 关闭"}</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {FPS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => updateSettings({ fps: o.value })}
                className={
                  "rounded-lg border py-2 text-sm font-bold transition " +
                  (s.fps === o.value
                    ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* ---- Graphics Quality ---- */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">画面质量 (性能优化)</h3>
            <span className="text-[11px] text-cyan-300">保持 100% 完整全景视野</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "低 (极速流畅)", value: "low", desc: "精简光影/满帧" },
              { label: "中 (平衡模式)", value: "medium", desc: "适中画质" },
              { label: "高 (全景特效)", value: "high", desc: "完整特效" },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => updateSettings({ quality: o.value as any })}
                className={
                  "rounded-xl border py-2 px-1 text-center transition flex flex-col items-center justify-center " +
                  (s.quality === o.value
                    ? "border-violet-300/60 bg-violet-500/20 text-violet-100 shadow-md shadow-violet-950/40"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
                }
              >
                <span className="text-xs font-bold">{o.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{o.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- CRT Scanlines ---- */}
        <section className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">CRT 扫描线效果</h3>
              <p className="text-[11px] text-slate-400">复古街机微光与扫描线滤镜</p>
            </div>
            <button
              onClick={() => updateSettings({ crt: !s.crt })}
              className={
                "rounded-full border px-3.5 py-1 text-xs font-bold transition " +
                (s.crt
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-950/40"
                  : "border-white/10 bg-white/5 text-slate-400")
              }
            >
              {s.crt ? "已开启" : "已关闭"}
            </button>
          </div>
        </section>

        {/* ---- 击杀得分面板 UI ---- */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">击杀得分面板 UI</h3>
              <p className="text-[11px] text-slate-400">设置击杀飘字反馈与计分面板的呈现样式</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "标准版 (战地风)", value: "standard", desc: "华丽动效 · 详细分项" },
              { label: "简洁版 (极简)", value: "compact", desc: "清爽胶囊 · 视野开阔" },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => updateSettings({ scorePanelStyle: o.value as any })}
                className={
                  "rounded-xl border py-2 px-2 text-center transition flex flex-col items-center justify-center " +
                  (s.scorePanelStyle === o.value
                    ? "border-amber-300/60 bg-amber-500/20 text-amber-100 shadow-md shadow-amber-950/40"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
                }
              >
                <span className="text-xs font-bold">{o.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{o.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- Bot strength (AI step, decoupled from frame rate) ---- */}
        <section className="mb-5">
          <BotStrengthControl />
        </section>

        {/* ---- Display ---- */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">显示</h3>
          <button
            onClick={onToggleFullscreen}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            {isFull ? "退出全屏" : "进入全屏"}
          </button>
        </section>

        {/* ---- Mobile keybindings ---- */}
        {isTouch && (
          <section className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">
              自定义键位
            </h3>
            <button
              onClick={() => setEditingKeys(true)}
              className="w-full rounded-lg border border-violet-400/30 bg-violet-500/10 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-500/20"
            >
              编辑手机端按键布局
            </button>
          </section>
        )}

        {/* ---- Exit / resume ---- */}
        <div className="space-y-2">
          <button
            onClick={onExit}
            className="w-full rounded-full border border-rose-400/40 bg-rose-500/10 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
          >
            退出游戏
          </button>
          <button
            onClick={onResume}
            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 font-bold text-slate-900 transition hover:scale-[1.01]"
          >
            继续战斗
          </button>
        </div>
      </div>
    </div>
  );
}
