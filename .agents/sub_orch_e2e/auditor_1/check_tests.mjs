// .agents/sub_orch_e2e/auditor_1/check_tests.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRunner } from "../../../tests/e2e/harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const e2eDir = path.resolve(__dirname, "../../../tests/e2e");

async function auditSuite() {
  console.log("=== STATIC & RUNTIME INTEGRITY AUDIT OF TEST SUITES ===");

  const runner = createRunner();

  // Load all 4 tier modules
  const t1 = await import(`file://${path.join(e2eDir, "tier1_features.test.mjs")}`);
  const t2 = await import(`file://${path.join(e2eDir, "tier2_boundaries.test.mjs")}`);
  const t3 = await import(`file://${path.join(e2eDir, "tier3_combinations.test.mjs")}`);
  const t4 = await import(`file://${path.join(e2eDir, "tier4_workloads.test.mjs")}`);

  t1.registerTests(runner);
  t2.registerTests(runner);
  t3.registerTests(runner);
  t4.registerTests(runner);

  console.log(`Total suites registered: ${runner.suites.length}`);
  let totalTests = 0;
  const testsByTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const testsByFeature = {};

  for (const suite of runner.suites) {
    testsByTier[suite.tier] = (testsByTier[suite.tier] || 0) + suite.tests.length;
    for (const test of suite.tests) {
      totalTests++;
      const feat = suite.featureId || "General";
      testsByFeature[feat] = (testsByFeature[feat] || 0) + 1;

      // Check if test function is empty or has no content
      const fnStr = test.fn.toString();
      const cleanBody = fnStr
        .replace(/^[^{]*{\s*/, "")
        .replace(/\s*}[^}]*$/, "")
        .trim();

      if (!cleanBody) {
        console.error(`[VIOLATION] Empty test function in suite '${suite.name}' -> test '${test.name}'`);
      }

      // Check for presence of assertions
      const hasAssert = /assert|expect/i.test(cleanBody);
      if (!hasAssert) {
        console.warn(`[WARNING] No explicit assertion found in '${suite.name}' -> '${test.name}'\nBody:\n${cleanBody}`);
      }

      // Check for trivial assertions: assert(true), expect(true).toBe(true), etc.
      if (/assert\(\s*true\s*\)/i.test(cleanBody) || /expect\(\s*true\s*\)\.toBe\(\s*true\s*\)/i.test(cleanBody)) {
        console.error(`[VIOLATION] Trivial assertion in '${suite.name}' -> '${test.name}'`);
      }
    }
  }

  console.log(`Total registered tests: ${totalTests}`);
  console.log(`Tests by tier:`, testsByTier);
  console.log(`Features tested: ${Object.keys(testsByFeature).length}`);

  // Check coverage requirement from TEST_INFRA.md
  // Tier 1: >= 170 (34 features * 5)
  // Tier 2: >= 170 (34 features * 5)
  // Tier 3: >= 36
  // Tier 4: >= 18
  // Total >= 400
  console.log("\nCoverage Requirements Check:");
  console.log(`Tier 1 (req >= 170): ${testsByTier[1]} -> ${testsByTier[1] >= 170 ? 'PASS' : 'FAIL'}`);
  console.log(`Tier 2 (req >= 170): ${testsByTier[2]} -> ${testsByTier[2] >= 170 ? 'PASS' : 'FAIL'}`);
  console.log(`Tier 3 (req >= 36): ${testsByTier[3]} -> ${testsByTier[3] >= 36 ? 'PASS' : 'FAIL'}`);
  console.log(`Tier 4 (req >= 18): ${testsByTier[4]} -> ${testsByTier[4] >= 18 ? 'PASS' : 'FAIL'}`);
  console.log(`Total (req >= 400): ${totalTests} -> ${totalTests >= 400 ? 'PASS' : 'FAIL'}`);
}

auditSuite().catch(console.error);
