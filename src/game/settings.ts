import { useEffect, useState } from "react";

/** A single on-screen action button on touch devices. Position is stored as a
 *  normalized coordinate (0..1 of the viewport) so the layout survives screen
 *  rotation / different device sizes. */
export type MobileActionId =
  | "fire"
  | "reload"
  | "skill"
  | "weapon"
  | "gadget1"
  | "gadget2"
  | "gadget3";

export interface MobileButtonCfg {
  id: MobileActionId;
  label: string;
  /** normalized x within the viewport (0 = left, 1 = right) */
  nx: number;
  /** normalized y within the viewport (0 = top, 1 = bottom) */
  ny: number;
  visible: boolean;
}

export interface GameSettings {
  /** master volume 0..1 */
  volume: number;
  muted: boolean;
  /** target frame rate; 0 = uncapped (follow the display refresh) */
  fps: number;
  /** show real-time FPS counter in HUD */
  showFps: boolean;
  /** show comprehensive performance monitoring (FPS, CPU sim time, GPU render time, Memory) in HUD */
  perfMonitor: boolean;
  /** bot AI decision frequency in *decisions per second*. Decoupled from the
   *  render frame rate — this is the single "step" knob that controls bot
   *  strength: higher Hz = bots re-decide more often (smarter, but more CPU). */
  botAiHz: number;
  /** graphics quality: low (dpr=1, no shadows/particles), medium, high */
  quality: "low" | "medium" | "high";
  /** CRT scanlines retro arcade filter overlay */
  crt: boolean;
  /** kill score panel UI style: standard (battlefield popups & details) or compact (minimalist unobtrusive HUD) */
  scorePanelStyle: "standard" | "compact";
  /** on-screen mobile control buttons */
  mobile: MobileButtonCfg[];
}

const STORAGE_KEY = "dm_settings_v2";

/** Metadata + factory defaults for the mobile on-screen buttons. The layout
 *  below is a sensible starting point: fire bottom-right, reload next to it,
 *  skill / weapon-switch low-left, and the three gadgets along the bottom. */
const MOBILE_DEFAULTS: MobileButtonCfg[] = [
  { id: "fire", label: "开火", nx: 0.86, ny: 0.66, visible: true },
  { id: "reload", label: "换弹", nx: 0.84, ny: 0.86, visible: true },
  { id: "skill", label: "技能", nx: 0.14, ny: 0.82, visible: true },
  { id: "weapon", label: "切枪", nx: 0.3, ny: 0.9, visible: true },
  { id: "gadget1", label: "道具1", nx: 0.46, ny: 0.92, visible: true },
  { id: "gadget2", label: "道具2", nx: 0.6, ny: 0.92, visible: true },
  { id: "gadget3", label: "道具3", nx: 0.74, ny: 0.92, visible: true },
];

export function defaultMobileLayout(): MobileButtonCfg[] {
  return MOBILE_DEFAULTS.map((b) => ({ ...b }));
}

function defaultSettings(): GameSettings {
  return {
    volume: 0.5,
    muted: false,
    fps: 60,
    showFps: false,
    perfMonitor: false,
    botAiHz: 16,
    quality: "high",
    crt: true,
    scorePanelStyle: "standard",
    mobile: defaultMobileLayout(),
  };
}

function load(): GameSettings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const showFpsVal = typeof parsed.showFps === "boolean" ? parsed.showFps : base.showFps;
    const perfMonVal = typeof parsed.perfMonitor === "boolean" ? parsed.perfMonitor : showFpsVal;
    return {
      volume:
        typeof parsed.volume === "number"
          ? Math.min(1, Math.max(0, parsed.volume))
          : base.volume,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : base.muted,
      fps: typeof parsed.fps === "number" ? parsed.fps : base.fps,
      showFps: perfMonVal,
      perfMonitor: perfMonVal,
      botAiHz:
        typeof parsed.botAiHz === "number"
          ? Math.min(120, Math.max(2, parsed.botAiHz))
          : base.botAiHz,
      quality:
        typeof parsed.quality === "string" && ["low", "medium", "high"].includes(parsed.quality)
          ? (parsed.quality as "low" | "medium" | "high")
          : base.quality,
      crt: typeof parsed.crt === "boolean" ? parsed.crt : base.crt,
      scorePanelStyle:
        parsed.scorePanelStyle === "compact" || parsed.scorePanelStyle === "standard"
          ? parsed.scorePanelStyle
          : base.scorePanelStyle,
      mobile: base.mobile.map((def) => {
        const saved = (parsed.mobile ?? []).find((m) => m.id === def.id);
        return saved ? { ...def, ...saved } : def;
      }),
    };
  } catch {
    return base;
  }
}

let state: GameSettings = load();
const listeners = new Set<(s: GameSettings) => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / SSR) — keep in-memory only */
  }
}

function emit() {
  for (const l of listeners) l(state);
}

export function getSettings(): GameSettings {
  return state;
}

export function subscribe(fn: (s: GameSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateSettings(patch: Partial<GameSettings>): void {
  state = { ...state, ...patch };
  persist();
  emit();
}

export function resetMobileLayout(): void {
  state = { ...state, mobile: defaultMobileLayout() };
  persist();
  emit();
}

/** React hook that re-renders the caller whenever the settings change. */
export function useSettings(): GameSettings {
  const [s, setS] = useState(state);
  useEffect(() => subscribe(setS), []);
  return s;
}
