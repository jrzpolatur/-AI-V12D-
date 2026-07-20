import { useEffect, useState } from "react";
import { useSettings, updateSettings } from "../game/settings";
import { isTouchDevice } from "../utils/device";
import MobileKeybindEditor from "./MobileKeybindEditor";
import BotStrengthControl from "./BotStrengthControl";

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
                  📢 公告
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

            <div className="mb-4 h-px bg-white/10" />

            {/* ---- Settings ---- */}
            <section>
              <h3 className="mb-3 text-sm font-bold tracking-wider text-slate-200">
                ⚙ 设置
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
                    {s.muted ? "🔇 已静音" : "🔊 开启"}
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

              {/* Frame rate */}
              <div className="mb-4">
                <span className="mb-2 block text-xs font-semibold text-slate-300">
                  帧率
                </span>
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
                <div>
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
            </section>
          </div>
        </>
      )}
    </div>
  );
}
