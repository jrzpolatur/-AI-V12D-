import { useSettings, updateSettings } from "../game/settings";

/** Bot AI strength presets. `hz` is the *unified step variable* (decisions per
 *  second), decoupled from the render frame rate: higher Hz = bots re-decide
 *  more often (smarter, but more CPU). */
const OPTIONS = [
  { label: "弱", hz: 8, desc: "省电 / 老设备" },
  { label: "中", hz: 16, desc: "默认" },
  { label: "强", hz: 30, desc: "更聪明" },
  { label: "极限", hz: 60, desc: "几乎每帧" },
];

/** Reusable bot-strength selector, shared by the main-menu and in-game settings. */
export default function BotStrengthControl() {
  const s = useSettings();
  const active =
    OPTIONS.reduce(
      (best, o) =>
        Math.abs(o.hz - s.botAiHz) < Math.abs(best.hz - s.botAiHz) ? o : best,
      OPTIONS[1]
    ).hz === s.botAiHz
      ? s.botAiHz
      : -1;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">人机强度</span>
        <span className="text-[10px] text-slate-500">{s.botAiHz}Hz</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.label}
            onClick={() => updateSettings({ botAiHz: o.hz })}
            title={o.desc}
            className={
              "rounded-lg border py-2 text-sm font-bold transition " +
              (active === o.hz
                ? "border-cyan-300/60 bg-cyan-500/20 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
