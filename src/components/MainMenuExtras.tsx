import { useEffect, useState } from "react";
import { useSettings, updateSettings } from "../game/settings";
import { isTouchDevice } from "../utils/device";
import MobileKeybindEditor from "./MobileKeybindEditor";
import BotStrengthControl from "./BotStrengthControl";
import { useServerConfig } from "../utils/serverConfig";
import ServerSelectModal from "./ServerSelectModal";

const FPS_OPTIONS = [
  { label: "不限制", value: 0 },
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "90", value: 90 },
];

/** Top-right menu button on the main screen. Clicking it opens a dropdown that
 *  shows the full announcement text and the settings panel (audio / fps /
 *  fullscreen / mobile keybindings) — reusing the same settings store as the
 *  in-game overlay, but without the "exit / resume" game buttons. */
export default function MainMenuExtras({ announce }: { announce: string }) {
  const [open, setOpen] = useState(false);
  const [editingKeys, setEditingKeys] = useState(false);
  const { config, updateConfig, modeLabel } = useServerConfig();
  const [showServerModal, setShowServerModal] = useState(false);
  const s = useSettings();
  const isTouch = isTouchDevice();
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onCh = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onCh);
    return () => document.removeEventListener("fullscreenchange", onCh);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const setVolume = (v: number) => {
    updateSettings({ volume: v, muted: v === 0 ? s.muted : false });
  };

  // Mobile keybind editor is its own full-screen view.
  if (editingKeys) {
    return <MobileKeybindEditor onDone={() => setEditingKeys(false)} />;
  }

  const hasAnnounce = announce.trim().length > 0;

  return (
    <div className="fixed right-4 top-4 z-40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-black/40 text-xl text-white backdrop-blur transition hover:bg-white/10"
        title="菜单 / 公告 / 设置"
      >
        ☰
        {hasAnnounce && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
            !
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away backdrop closes the panel */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-14 z-40 max-h-[82vh] w-[min(88vw,340px)] overflow-y-auto rounded-2xl border border-white/15 bg-[#15163a]/95 p-5 shadow-2xl backdrop-blur-md">
            {/* ---- Announcement (full text on demand) ---- */}
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wider text-amber-300">
                  公告
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              {hasAnnounce ? (
                <p className="whitespace-pre-wrap break-words rounded-lg border border-amber-300/20 bg-black/30 p-3 text-sm leading-relaxed text-amber-50">
                  {announce}
                </p>
              ) : (
                <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
                  暂无公告
                </p>
              )}
            </section>

            {/* ---- Quick start guide ---- */}
            <section className="mb-5">
              <h3 className="mb-2 text-sm font-bold tracking-wider text-cyan-300">
                操作指南
              </h3>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-300">
                <li><b className="text-slate-100">移动/瞄准</b>：WASD 移动 · 鼠标瞄准</li>
                <li><b className="text-slate-100">射击/近战</b>：左键射击 · 右键近战/格挡/突刺</li>
                <li><b className="text-slate-100">技能/翻滚</b>：Q 释放特工技能</li>
                <li><b className="text-slate-100">切换/装填</b>：E 或 滚轮切枪 · R 换弹</li>
                <li><b className="text-slate-100">战术道具</b>：1/2/3 选道具 · 左键部署</li>
                <li><b className="text-slate-100">菜单/指南</b>：Esc 设置 · H 键帮助</li>
              </ul>
            </section>

            <div className="mb-4 h-px bg-white/10" />

            {/* ---- Settings ---- */}
            <section>
              <h3 className="mb-3 text-sm font-bold tracking-wider text-slate-200">
                设置
              </h3>

              {/* Audio */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    音频
                  </span>
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
              </div>

              {/* Frame rate & Performance monitor */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      性能监测与帧率
                    </span>
                    <span className="text-[10px] text-slate-400">实时显示 FPS、CPU/GPU 耗时与内存</span>
                  </div>
                  <button
                    onClick={() => updateSettings({ perfMonitor: !s.perfMonitor, showFps: !s.perfMonitor })}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 " +
                      (s.perfMonitor
                        ? "border-cyan-400/50 bg-cyan-500/25 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200")
                    }
                  >
                    <span className={s.perfMonitor ? "h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" : "h-1.5 w-1.5 rounded-full bg-slate-500"} />
                    <span>{s.perfMonitor ? "性能监测: 开启" : "性能监测: 关闭"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
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
              </div>

              {/* Bot strength (AI step, decoupled from frame rate) */}
              <BotStrengthControl />

              {/* CRT Scanlines */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    CRT 扫描线
                  </span>
                  <button
                    onClick={() => updateSettings({ crt: !s.crt })}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-semibold " +
                      (s.crt
                        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                        : "border-white/10 bg-white/5 text-slate-400")
                    }
                  >
                    {s.crt ? "已开启" : "已关闭"}
                  </button>
                </div>
              </div>

              {/* Display */}
              <div className="mb-4">
                <span className="mb-2 block text-xs font-semibold text-slate-300">
                  显示
                </span>
                <button
                  onClick={toggleFullscreen}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {isFull ? "退出全屏" : "进入全屏"}
                </button>
              </div>

              {/* Mobile keybindings */}
              {isTouch && (
                <div className="mb-4">
                  <span className="mb-2 block text-xs font-semibold text-slate-300">
                    自定义键位
                  </span>
                  <button
                    onClick={() => setEditingKeys(true)}
                    className="w-full rounded-lg border border-violet-400/30 bg-violet-500/10 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-500/20"
                  >
                    编辑手机端按键布局
                  </button>
                </div>
              )}

              {/* 联机服务器设置 */}
              <div className="pt-2 border-t border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    联机服务器节点
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${modeLabel.color}`}>
                    {modeLabel.tag}
                  </span>
                </div>
                <button
                  onClick={() => setShowServerModal(true)}
                  className="w-full rounded-lg border border-indigo-500/30 bg-indigo-500/15 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/25 transition flex items-center justify-center gap-1.5"
                >
                  <span>🌐</span>
                  <span>配置服务器 (本地/Render)</span>
                </button>
              </div>
            </section>
          </div>
        </>
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
