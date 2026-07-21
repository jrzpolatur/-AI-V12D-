import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // IMPORTANT: do NOT use the plugin's default "inline EVERYTHING" build
    // config. The default forces assetsInlineLimit=()=>true, which base64-inlines
    // the 5.5MB home-bg.png straight into the HTML. That made first load
    // download+parse a multi-megabyte file and showed a long black screen
    // (body background is #0b0c22 and #root had no loading fallback).
    // Instead we keep JS/CSS inlined into one file, but let large assets
    // (the background image) be emitted as separate, cacheable files.
    viteSingleFile({ useRecommendedBuildConfig: false }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  build: {
    assetsInlineLimit: 8192, // only inline tiny assets (<8KB); big PNG stays a file
    assetsDir: "",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
  // Dev-only: forward the announcement API + admin page to the running game
  // server (relay/prod/authoritative on :8080) so the notice board shows up
  // during `npm run dev` too. In production the server serves both the app and
  // /api from the same origin, so no proxy is needed.
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/admin": "http://localhost:8080",
    },
  },
});
