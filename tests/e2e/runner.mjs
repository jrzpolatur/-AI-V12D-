// tests/e2e/runner.mjs
// Standalone E2E Test Suite Runner for FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";
import { createRunner, COLORS } from "./harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const runner = createRunner();
  const startTime = performance.now();

  console.log(`${COLORS.bold}${COLORS.cyan}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.yellow} 🎮 FIRING STICKERS: 16/32-BIT PIXEL DUNGEON SHOOTER — E2E TEST RUNNER 🎮${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}========================================================================${COLORS.reset}\n`);

  // Parse CLI args for optional tier filtering, e.g. --tier=1,2 or --tier 1
  const args = process.argv.slice(2);
  let requestedTiers = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--tier=")) {
      requestedTiers = args[i].split("=")[1].split(",").map(Number);
    } else if (args[i] === "--tier" || args[i] === "-t") {
      if (args[i + 1]) requestedTiers = args[i + 1].split(",").map(Number);
    }
  }

  const tierDefinitions = [
    {
      tier: 1,
      name: "Tier 1: Feature Coverage (Happy Path Isolation)",
      file: "tier1_features.test.mjs",
      required: true,
    },
    {
      tier: 2,
      name: "Tier 2: Boundary & Corner Cases (Edge Invariants)",
      file: "tier2_boundaries.test.mjs",
      required: true,
    },
    {
      tier: 3,
      name: "Tier 3: Pairwise Cross-Feature Interactions",
      file: "tier3_combinations.test.mjs",
      required: false,
    },
    {
      tier: 4,
      name: "Tier 4: Real-World Match Workload Scenarios",
      file: "tier4_workloads.test.mjs",
      required: false,
    },
  ].filter((t) => !requestedTiers || requestedTiers.includes(t.tier));

  let overallSuccess = true;
  const executedTiers = [];

  for (const tierDef of tierDefinitions) {
    const fullPath = path.resolve(__dirname, tierDef.file);
    if (!fs.existsSync(fullPath)) {
      if (tierDef.required) {
        console.error(`${COLORS.red}✖ Required test suite file not found: ${tierDef.file}${COLORS.reset}`);
        overallSuccess = false;
      } else {
        console.log(`${COLORS.dim}⊘ Skipping optional suite (not yet created): ${tierDef.name}${COLORS.reset}`);
      }
      continue;
    }

    console.log(`\n${COLORS.bold}${COLORS.blue}▶ Executing ${tierDef.name}...${COLORS.reset}`);
    try {
      const suiteModule = await import(`file://${fullPath}`);
      if (typeof suiteModule.registerTests === "function") {
        suiteModule.registerTests(runner);
      } else if (typeof suiteModule.default === "function") {
        suiteModule.default(runner);
      }

      const result = await runner.runTier(tierDef.tier);
      executedTiers.push({
        ...tierDef,
        stats: result.stats,
      });

      if (!result.success) {
        overallSuccess = false;
      }

      // Feature breakdown preview
      const feats = Object.values(result.stats.featureStats);
      if (feats.length > 0) {
        console.log(`  ${COLORS.dim}Per-Feature Summary (${feats.length} features):${COLORS.reset}`);
        for (const feat of feats) {
          const statusIcon = feat.failed === 0 ? `${COLORS.green}✔` : `${COLORS.red}✖`;
          const featLabel = `${feat.featureId}`.padEnd(8);
          const countLabel = `[${feat.passed}/${feat.total} passed]`.padEnd(16);
          const timeLabel = `(${feat.durationMs.toFixed(1)}ms)`;
          console.log(`    ${statusIcon} ${COLORS.bold}${featLabel}${COLORS.reset} ${countLabel} ${COLORS.dim}${timeLabel}${COLORS.reset}`);
        }
      }

      const tierStatus = result.success
        ? `${COLORS.green}${COLORS.bold}PASSED${COLORS.reset}`
        : `${COLORS.red}${COLORS.bold}FAILED (${result.stats.failed} failures)${COLORS.reset}`;
      console.log(`  ➔ Tier Status: ${tierStatus} (${result.stats.passed}/${result.stats.total} in ${result.stats.durationMs.toFixed(1)}ms)`);

    } catch (err) {
      console.error(`${COLORS.red}✖ Error executing ${tierDef.name}:${COLORS.reset}`, err);
      overallSuccess = false;
      executedTiers.push({
        ...tierDef,
        stats: {
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          durationMs: 0,
          failures: [{ testName: "Suite Execution", error: err }],
        },
      });
    }
  }

  const totalDuration = performance.now() - startTime;

  // ---------------------------------------------------------------------------
  // ANSI Color Summary Matrix Table
  // ---------------------------------------------------------------------------
  console.log(`\n\n${COLORS.bold}${COLORS.cyan}========================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.white}                       E2E TEST EXECUTION MATRIX                        ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}========================================================================${COLORS.reset}`);
  console.log(
    `${COLORS.bold}${"TIER".padEnd(8)} | ${"NAME".padEnd(42)} | ${"TOTAL".padStart(6)} | ${"PASS".padStart(6)} | ${"FAIL".padStart(6)} | ${"TIME".padStart(10)}${COLORS.reset}`
  );
  console.log(`${COLORS.dim}---------+--------------------------------------------+--------+--------+--------+-----------${COLORS.reset}`);

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  for (const t of executedTiers) {
    const s = t.stats || { total: 0, passed: 0, failed: 0, durationMs: 0 };
    grandTotal += s.total;
    grandPassed += s.passed;
    grandFailed += s.failed;

    const tierCode = `Tier ${t.tier}`.padEnd(8);
    const tierName = t.name.length > 42 ? t.name.substring(0, 39) + "..." : t.name.padEnd(42);
    const totStr = String(s.total).padStart(6);
    const passStr = `${COLORS.green}${String(s.passed).padStart(6)}${COLORS.reset}`;
    const failStr = s.failed > 0 ? `${COLORS.red}${String(s.failed).padStart(6)}${COLORS.reset}` : String(s.failed).padStart(6);
    const timeStr = `${s.durationMs.toFixed(1)}ms`.padStart(10);

    console.log(`${tierCode} | ${tierName} | ${totStr} | ${passStr} | ${failStr} | ${timeStr}`);
  }

  console.log(`${COLORS.dim}---------+--------------------------------------------+--------+--------+--------+-----------${COLORS.reset}`);
  const gTotStr = String(grandTotal).padStart(6);
  const gPassStr = `${COLORS.green}${String(grandPassed).padStart(6)}${COLORS.reset}`;
  const gFailStr = grandFailed > 0 ? `${COLORS.red}${String(grandFailed).padStart(6)}${COLORS.reset}` : String(grandFailed).padStart(6);
  const gTimeStr = `${totalDuration.toFixed(1)}ms`.padStart(10);
  console.log(`${COLORS.bold}${"TOTAL".padEnd(8)} | ${"All Executed Test Suites".padEnd(42)} | ${gTotStr} | ${gPassStr} | ${gFailStr} | ${gTimeStr}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}========================================================================${COLORS.reset}`);

  // Print failure details if any
  let failureIndex = 0;
  for (const t of executedTiers) {
    if (t.stats && t.stats.failures && t.stats.failures.length > 0) {
      console.log(`\n${COLORS.bold}${COLORS.red}FAILED TESTS IN TIER ${t.tier}:${COLORS.reset}`);
      for (const fail of t.stats.failures) {
        failureIndex++;
        console.log(`\n  ${COLORS.bold}${failureIndex}) [${fail.featureId || "General"}] ${fail.suiteName || ""} ➔ ${fail.testName}${COLORS.reset}`);
        if (fail.error) {
          console.log(`     ${COLORS.red}${fail.error.message || fail.error}${COLORS.reset}`);
          if (fail.error.stack) {
            const stackLines = fail.error.stack.split("\n").slice(1, 4).join("\n     ");
            console.log(`     ${COLORS.dim}${stackLines}${COLORS.reset}`);
          }
        }
      }
    }
  }

  if (overallSuccess && grandTotal > 0 && grandFailed === 0) {
    console.log(`\n${COLORS.bgGreen}${COLORS.white}${COLORS.bold} ✔ ALL TESTS PASSED SUCCESSFULLY! (${grandPassed}/${grandTotal} passed in ${totalDuration.toFixed(1)}ms) ${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${COLORS.bgRed}${COLORS.white}${COLORS.bold} ✖ TEST SUITE FAILED! (${grandFailed} failures detected) ${COLORS.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
