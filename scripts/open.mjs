// Open the built game in the default browser.
import { exec } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, "../dist/index.html");

const platform = process.platform;
let cmd;
if (platform === "win32") {
  cmd = `start "" "${target}"`;
} else if (platform === "darwin") {
  cmd = `open "${target}"`;
} else {
  cmd = `xdg-open "${target}"`;
}

exec(cmd, (err) => {
  if (err) {
    console.error("[open] Failed to launch browser:", err.message);
    console.error(`[open] Open manually: ${target}`);
    process.exit(1);
  }
  console.log(`[open] Launched: ${target}`);
});
