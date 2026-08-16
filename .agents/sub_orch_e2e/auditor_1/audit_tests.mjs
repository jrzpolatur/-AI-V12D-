import fs from "fs";
import path from "path";

const rootDir = "c:/Users/86139/Documents/2d-shooter-for-claudeorgemini";
const testFiles = [
  "tests/e2e/tier1_features.test.mjs",
  "tests/e2e/tier2_boundaries.test.mjs",
  "tests/e2e/tier3_combinations.test.mjs",
  "tests/e2e/tier4_workloads.test.mjs"
];

let totalTests = 0;
let emptyTests = [];
let skippedTests = [];
let assertionCounts = [];
let testInventory = [];

for (const relPath of testFiles) {
  const fullPath = path.resolve(rootDir, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  
  // Find all test blocks: runner.test( ... )
  const lines = content.split("\n");
  let inTest = false;
  let currentTestName = "";
  let currentTestBody = [];
  let braceDepth = 0;
  let fileTestCount = 0;

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    
    if (!inTest && /runner\.(test|it)\(/.test(line)) {
      inTest = true;
      const nameMatch = line.match(/runner\.(?:test|it)\(\s*["'`]?([^"'`]+)["'`]?/);
      currentTestName = nameMatch ? nameMatch[1] : `Unknown test at line ${lineNo + 1}`;
      currentTestBody = [line];
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0 && line.includes("}")) {
        // Single-line test
        inTest = false;
        fileTestCount++;
        totalTests++;
        const bodyStr = currentTestBody.join("\n");
        const asserts = (bodyStr.match(/assert|expect/g) || []).length;
        if (asserts === 0) {
          emptyTests.push({ file: relPath, testName: currentTestName, line: lineNo + 1 });
        }
        testInventory.push({ file: relPath, name: currentTestName, asserts });
      }
      continue;
    }

    if (inTest) {
      currentTestBody.push(line);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        inTest = false;
        fileTestCount++;
        totalTests++;
        const bodyStr = currentTestBody.join("\n");
        const asserts = (bodyStr.match(/assert|expect/g) || []).length;
        if (asserts === 0) {
          emptyTests.push({ file: relPath, testName: currentTestName, line: lineNo + 1 });
        }
        if (bodyStr.includes("skip: true") || bodyStr.includes("skip:true")) {
          skippedTests.push({ file: relPath, testName: currentTestName });
        }
        testInventory.push({ file: relPath, name: currentTestName, asserts });
      }
    }
  }

  console.log(`${relPath}: ${fileTestCount} tests parsed.`);
}

console.log(`\nTotal tests parsed: ${totalTests}`);
console.log(`Tests without assertions: ${emptyTests.length}`);
if (emptyTests.length > 0) {
  console.log("Empty tests:", JSON.stringify(emptyTests, null, 2));
}
console.log(`Skipped tests: ${skippedTests.length}`);
if (skippedTests.length > 0) {
  console.log("Skipped tests:", JSON.stringify(skippedTests, null, 2));
}

// Summary of assertion density
const totalAsserts = testInventory.reduce((acc, t) => acc + t.asserts, 0);
console.log(`Total assertion statements across all tests: ${totalAsserts}`);
console.log(`Average assertions per test: ${(totalAsserts / totalTests).toFixed(2)}`);
