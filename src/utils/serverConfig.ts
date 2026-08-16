/**
 * Server Configuration & WebSocket Address Resolver.
 * Supports Localhost, Render Cloud Hosting, Custom LAN/WAN WebSocket servers, and Auto-detection.
 */

import { useState, useEffect } from "react";

export type ServerMode = "local" | "render" | "custom" | "auto";

export interface ServerConfig {
  mode: ServerMode;
  renderHost: string; // e.g. "neon-strike.onrender.com"
  customUrl: string;  // e.g. "ws://192.168.1.100:8080"
}

const STORAGE_KEY = "dm_server_config";
const CONFIG_CHANGE_EVENT = "dm_server_config_changed";

export const DEFAULT_RENDER_HOST = "neon-strike.onrender.com";
export const DEFAULT_LOCAL_WS = "ws://localhost:8080";

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  mode: "auto",
  renderHost: DEFAULT_RENDER_HOST,
  customUrl: DEFAULT_LOCAL_WS,
};

/** Normalizes a Render host/url string into a clean hostname or wss url */
export function formatRenderWsUrl(renderHostInput: string): string {
  let clean = renderHostInput.trim();
  if (!clean) clean = DEFAULT_RENDER_HOST;
  // Remove protocol prefixes if user typed them
  clean = clean.replace(/^https?:\/\//i, "").replace(/^wss?:\/\//i, "");
  // Remove trailing slashes and paths
  clean = clean.split("/")[0];
  return `wss://${clean}`;
}

/** Normalizes a Custom WebSocket URL */
export function formatCustomWsUrl(customInput: string): string {
  let clean = customInput.trim();
  if (!clean) return DEFAULT_LOCAL_WS;
  if (!clean.startsWith("ws://") && !clean.startsWith("wss://")) {
    if (clean.startsWith("http://")) clean = "ws://" + clean.slice(7);
    else if (clean.startsWith("https://")) clean = "wss://" + clean.slice(8);
    else clean = `ws://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}

/** Get auto-detected WebSocket URL based on current browser window location */
export function getAutoWsUrl(): string {
  if (typeof window === "undefined") return DEFAULT_LOCAL_WS;
  const isHttps = window.location.protocol === "https:";
  const isFile = window.location.protocol.startsWith("file");
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0";

  if (isFile) return DEFAULT_LOCAL_WS;
  if (isLocalhost) return DEFAULT_LOCAL_WS;

  const host = window.location.host;
  return isHttps ? `wss://${host}` : `ws://${host}`;
}

/** Reads stored config or defaults */
export function getServerConfig(): ServerConfig {
  if (typeof window === "undefined") return DEFAULT_SERVER_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SERVER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode || DEFAULT_SERVER_CONFIG.mode,
      renderHost: parsed.renderHost || DEFAULT_SERVER_CONFIG.renderHost,
      customUrl: parsed.customUrl || DEFAULT_SERVER_CONFIG.customUrl,
    };
  } catch {
    return DEFAULT_SERVER_CONFIG;
  }
}

/** Saves configuration and broadcasts change event */
export function saveServerConfig(cfg: Partial<ServerConfig>): ServerConfig {
  const current = getServerConfig();
  const next: ServerConfig = {
    ...current,
    ...cfg,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CONFIG_CHANGE_EVENT, { detail: next }));
  } catch {
    /* ignore storage errors */
  }
  return next;
}

/** Computes the active WebSocket URL from a given or current ServerConfig */
export function getServerWsUrl(config?: ServerConfig): string {
  const cfg = config || getServerConfig();
  switch (cfg.mode) {
    case "local":
      return DEFAULT_LOCAL_WS;
    case "render":
      return formatRenderWsUrl(cfg.renderHost);
    case "custom":
      return formatCustomWsUrl(cfg.customUrl);
    case "auto":
    default:
      return getAutoWsUrl();
  }
}

/** Computes matching HTTP base URL (for API calls like /api/online) */
export function getServerHttpUrl(config?: ServerConfig): string {
  const wsUrl = getServerWsUrl(config);
  if (wsUrl.startsWith("wss://")) {
    return "https://" + wsUrl.slice(6);
  }
  if (wsUrl.startsWith("ws://")) {
    return "http://" + wsUrl.slice(5);
  }
  return "";
}

/** Get human-readable description of the current server mode */
export function getServerModeLabel(cfg: ServerConfig): { label: string; tag: string; color: string } {
  switch (cfg.mode) {
    case "local":
      return { label: "本地运行服务器", tag: "LOCAL", color: "text-emerald-400 border-emerald-400/40 bg-emerald-500/10" };
    case "render":
      return { label: `Render云端 (${cfg.renderHost || DEFAULT_RENDER_HOST})`, tag: "RENDER", color: "text-purple-400 border-purple-400/40 bg-purple-500/10" };
    case "custom":
      return { label: `自定义 (${cfg.customUrl})`, tag: "CUSTOM", color: "text-amber-400 border-amber-400/40 bg-amber-500/10" };
    case "auto":
    default:
      return { label: "自动检测 (跟随网页)", tag: "AUTO", color: "text-cyan-400 border-cyan-400/40 bg-cyan-500/10" };
  }
}

/** React hook to reactively consume and update server configuration */
export function useServerConfig() {
  const [config, setConfigState] = useState<ServerConfig>(() => getServerConfig());

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ServerConfig>;
      if (customEvent.detail) {
        setConfigState(customEvent.detail);
      } else {
        setConfigState(getServerConfig());
      }
    };
    window.addEventListener(CONFIG_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CONFIG_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const updateConfig = (newCfg: Partial<ServerConfig>) => {
    const next = saveServerConfig(newCfg);
    setConfigState(next);
    return next;
  };

  const wsUrl = getServerWsUrl(config);

  return {
    config,
    updateConfig,
    wsUrl,
    modeLabel: getServerModeLabel(config),
  };
}
