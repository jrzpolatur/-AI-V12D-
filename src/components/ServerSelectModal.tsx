import { useState } from "react";
import {
  type ServerConfig,
  type ServerMode,
  DEFAULT_RENDER_HOST,
  DEFAULT_LOCAL_WS,
  getServerWsUrl,
} from "../utils/serverConfig";

interface ServerSelectModalProps {
  currentConfig: ServerConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newConfig: ServerConfig) => void;
}

export default function ServerSelectModal({
  currentConfig,
  isOpen,
  onClose,
  onSave,
}: ServerSelectModalProps) {
  const [selectedMode, setSelectedMode] = useState<ServerMode>(currentConfig.mode);
  const [renderHostInput, setRenderHostInput] = useState(
    currentConfig.renderHost || DEFAULT_RENDER_HOST
  );
  const [customUrlInput, setCustomUrlInput] = useState(
    currentConfig.customUrl || DEFAULT_LOCAL_WS
  );

  if (!isOpen) return null;

  const handleSave = () => {
    const newCfg: ServerConfig = {
      mode: selectedMode,
      renderHost: renderHostInput.trim() || DEFAULT_RENDER_HOST,
      customUrl: customUrlInput.trim() || DEFAULT_LOCAL_WS,
    };
    onSave(newCfg);
    onClose();
  };

  const previewWsUrl = getServerWsUrl({
    mode: selectedMode,
    renderHost: renderHostInput.trim() || DEFAULT_RENDER_HOST,
    customUrl: customUrlInput.trim() || DEFAULT_LOCAL_WS,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-[#0f1129] p-6 shadow-2xl text-white">
        {/* 头部标题 */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌐</span>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                联机服务器节点选择
              </h3>
              <p className="text-xs text-slate-400">
                切换本地自建服、Render 云端服务器或局域网节点
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* 模式选择列表 */}
        <div className="space-y-3">
          {/* 1. 本地运行 */}
          <div
            onClick={() => setSelectedMode("local")}
            className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col gap-1.5 ${
              selectedMode === "local"
                ? "border-emerald-400/60 bg-emerald-950/30 shadow-lg shadow-emerald-950/40"
                : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💻</span>
                <span className="text-sm font-bold text-white">
                  本地运行服务器 (Localhost)
                </span>
              </div>
              <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                ws://localhost:8080
              </span>
            </div>
            <p className="text-xs text-slate-400 pl-6">
              本机双击 <code className="text-cyan-300 font-mono">启动联机服务器.bat</code> 或运行 <code className="text-cyan-300 font-mono">npm start</code> 即可自建服，延迟 &lt; 1ms。
            </p>
          </div>

          {/* 2. Render 远程云端 */}
          <div
            onClick={() => setSelectedMode("render")}
            className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col gap-2 ${
              selectedMode === "render"
                ? "border-purple-400/60 bg-purple-950/30 shadow-lg shadow-purple-950/40"
                : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">☁️</span>
                <span className="text-sm font-bold text-white">
                  Render 远程云端服务器 (Render Cloud)
                </span>
              </div>
              <span className="rounded bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                WSS 云端公服
              </span>
            </div>

            <p className="text-xs text-slate-400 pl-6 leading-relaxed">
              部署在 Render 上的云端服务，无需公网 IP 即可跨互联网联机。
            </p>

            {/* 输入 Render 域名 */}
            {selectedMode === "render" && (
              <div className="mt-1 pl-6">
                <label className="text-[11px] font-semibold text-purple-200 block mb-1">
                  Render 域名 / 实例地址:
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">wss://</span>
                  <input
                    type="text"
                    value={renderHostInput}
                    onChange={(e) => setRenderHostInput(e.target.value)}
                    placeholder="例如 your-app.onrender.com"
                    className="flex-1 rounded-lg bg-black/50 border border-purple-400/40 px-2.5 py-1.5 text-xs text-white font-mono focus:border-purple-300 focus:outline-none"
                  />
                </div>

                {/* 唤醒说明贴士 */}
                <div className="mt-2.5 rounded-lg bg-purple-900/30 border border-purple-500/30 p-2.5 text-[11px] text-purple-200/90 leading-relaxed">
                  <span className="font-bold text-amber-300">💡 自动唤醒机制：</span>
                  Render 免费服务在无连接时会休眠。在本地连接时将<b>自动触发唤醒</b>（无需在 Render 网页端手动开启），冷启动耗时约 <b>30~50 秒</b>，请在连接时稍作等待。
                </div>
              </div>
            )}
          </div>

          {/* 3. 局域网 / 自定义 WebSocket */}
          <div
            onClick={() => setSelectedMode("custom")}
            className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col gap-2 ${
              selectedMode === "custom"
                ? "border-amber-400/60 bg-amber-950/30 shadow-lg shadow-amber-950/40"
                : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span className="text-sm font-bold text-white">
                  自定义 / 局域网服务器 (Custom WS)
                </span>
              </div>
              <span className="rounded bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                自定义 IP/端口
              </span>
            </div>

            <p className="text-xs text-slate-400 pl-6">
              支持局域网 IP (如 <code className="text-amber-300 font-mono">ws://192.168.1.5:8080</code>) 或内网穿透域名。
            </p>

            {selectedMode === "custom" && (
              <div className="mt-1 pl-6">
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="ws://192.168.1.100:8080 或 wss://..."
                  className="w-full rounded-lg bg-black/50 border border-amber-400/40 px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 4. 自动检测 */}
          <div
            onClick={() => setSelectedMode("auto")}
            className={`cursor-pointer rounded-xl border p-3 transition flex items-center justify-between ${
              selectedMode === "auto"
                ? "border-cyan-400/60 bg-cyan-950/30"
                : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <div>
                <span className="text-xs font-bold text-white">
                  自动探测 (跟随当前网页 Host)
                </span>
                <p className="text-[11px] text-slate-400">
                  若在 Render 网页端打开则自动连 Render，本地打开自动连本地。
                </p>
              </div>
            </div>
            <span className="text-[10px] text-cyan-300 font-bold">推荐在线版</span>
          </div>
        </div>

        {/* 当前生效 WebSocket 地址预览 */}
        <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">将要连接的地址:</span>
          <span className="text-xs font-mono font-bold text-cyan-300 truncate max-w-[260px]">
            {previewWsUrl}
          </span>
        </div>

        {/* 底部按钮 */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            保存并连接
          </button>
        </div>
      </div>
    </div>
  );
}
