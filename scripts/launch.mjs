// One-click game launcher.
//
// Usage:
//   node scripts/launch.mjs            → full rebuild of dist + auto-open in browser
//   node scripts/launch.mjs dev        → live dev server (HMR) + auto-open localhost
//
// Why this exists: the browser game is built from the TypeScript sources into
// dist/. Simply double-clicking an OLD dist/index.html shows stale content.
// This script guarantees a fresh build every time, so you always play the
// latest code. Run it after any change (or just use it instead of opening
// dist manually).
//
// It calls the binaries directly via `node` so it works even when `npm`
// scripts are blocked by PowerShell's execution policy.

import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Resolve binary entry points (forward slashes work on Windows too).
const viteBin = resolve(root, "node_modules/vite/bin/vite.js").replace(/\\/g, "/");
const esbuildBin = resolve(root, "node_modules/esbuild/bin/esbuild").replace(/\\/g, "/");
const fixScript = resolve(root, "scripts/fix-file-protocol.mjs").replace(/\\/g, "/");

const mode = process.argv[2] === "dev" ? "dev" : "build";

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(`node ${cmd}`, { cwd: root, stdio: "inherit" });
}

function open(target) {
  const t = String(target).replace(/\\/g, "/");
  let cmd;
  if (platform === "win32") cmd = `start "" "${t}"`;
  else if (platform === "darwin") cmd = `open "${t}"`;
  else cmd = `xdg-open "${t}"`;
  try {
    execSync(cmd, { stdio: "ignore" });
    console.log(`\nOpened: ${t}`);
  } catch (e) {
    console.error(`\nCould not auto-open. Open manually:\n  ${t}`);
  }
}

if (mode === "dev") {
  console.log("=== Launching Vite dev server (live reload) ===");
  // Start the dev server in the background, then open the localhost URL.
  const { spawn } = await import("child_process");
  const child = spawn("node", [viteBin, "dev"], {
    cwd: root,
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, BROWSER: "none" },
  });
  let url = "http://localhost:5173/";
  child.stdout.on("data", (buf) => {
    const s = buf.toString();
    const m = s.match(/https?:\/\/\S+:\d+\//);
    if (m) url = m[0];
  });
  // Give Vite a moment to boot, then open the browser.
  setTimeout(() => open(url), 2500);
  console.log("\nDev server running. Press Ctrl+C here to stop it.");
} else {
  console.log("=== Building fresh dist ===");
  // Keep the authoritative-server bundle in sync with the TS sources.
  run(`${esbuildBin} src/game/engine.ts --bundle --format=esm --platform=node --outfile=server/engine.bundle.mjs`);
  // Build the browser game.
  run(`${viteBin} build`);
  // Make the single-file build openable via file:// (double-click).
  run(`${fixScript}`);
  // Open the freshly built game.
  open(resolve(root, "dist/index.html"));
  console.log("\nDone. dist/index.html is now up to date and open in your browser.");
}
