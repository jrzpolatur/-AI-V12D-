// Post-build fix: make the single-file build work under file:// (double-click).
//
// Two problems need fixing:
//   1. ES module scripts are blocked by CORS under file:// even when inlined.
//      → Strip `type="module"` so the browser treats it as a classic script.
//   2. The inlined <script> lives in <head> (where Vite emits it). Classic
//      scripts execute immediately when reached, so `getElementById("root")`
//      returns null → React throws error #299. `defer` won't help because it
//      only applies to scripts with a `src` attribute, not inline scripts.
//      → Move the entire <script> block to just before </body> so the DOM is
//      fully parsed by the time it runs.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, "../dist/index.html");

let html = readFileSync(distPath, "utf-8");

// Extract the inlined module script, strip type="module"/crossorigin.
// Use a non-greedy match up to the FIRST </script> after the opening tag.
const scriptRe = /<script\s+type="module"\s+crossorigin>([\s\S]*?)<\/script>/;
const match = html.match(scriptRe);

if (!match) {
  console.log("[fix-file-protocol] No inline module script found — already fixed or pattern changed.");
} else {
  const fullMatch = match[0]; // entire <script ...>...</script>
  const scriptContent = match[1]; // inner JS only
  const plainScript = `<script>${scriptContent}</script>`;

  // Remove the original script from <head>.
  html = html.replace(fullMatch, "");

  // Insert the plain script just before the real </body> tag.
  // We must only replace the actual HTML closing tag, not the string "</body>"
  // that may appear inside the JS code. The real tag is the LAST one in the
  // document, so we split from the right.
  const bodyCloseIdx = html.lastIndexOf("</body>");
  if (bodyCloseIdx === -1) {
    throw new Error("[fix-file-protocol] Could not find </body> tag.");
  }
  html = html.slice(0, bodyCloseIdx) + plainScript + "\n  " + html.slice(bodyCloseIdx);

  console.log('[fix-file-protocol] Moved inline script to </body> and stripped type="module".');
}

writeFileSync(distPath, html, "utf-8");
console.log("[fix-file-protocol] dist/index.html is now file://-safe.");
