// ---------------------------------------------------------------------------
// extract-guns.mjs — one-shot extractor that turns the GUNS array currently
// defined in src/game/content.ts into a standalone data file (data/guns.json).
//
// content.ts only imports *types* (erased at build) so it can be bundled and
// imported directly in Node to read the real runtime objects — no hand-copying,
// no drift. Run once to bootstrap the single source of truth:
//     node scripts/extract-guns.mjs
// ---------------------------------------------------------------------------
import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { pathToFileURL, fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(root, ".tmp-extract");
const tmpFile = path.join(tmpDir, "content.mjs");

mkdirSync(tmpDir, { recursive: true });

await build({
  entryPoints: [path.join(root, "src/game/content.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: tmpFile,
  logLevel: "warning",
});

const mod = await import(pathToFileURL(tmpFile).href + "?t=" + Date.now());

if (!Array.isArray(mod.GUNS)) {
  throw new Error("content.ts did not export a GUNS array");
}

mkdirSync(path.join(root, "data"), { recursive: true });
writeFileSync(
  path.join(root, "data/guns.json"),
  JSON.stringify(mod.GUNS, null, 2) + "\n",
  "utf8"
);

rmSync(tmpDir, { recursive: true, force: true });
console.log(`[extract-guns] wrote data/guns.json (${mod.GUNS.length} weapons)`);
