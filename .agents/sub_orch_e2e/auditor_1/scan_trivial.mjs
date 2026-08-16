import fs from "fs";
import path from "path";

const rootDir = "c:/Users/86139/Documents/2d-shooter-for-claudeorgemini";
const testFiles = [
  "tests/e2e/tier1_features.test.mjs",
  "tests/e2e/tier2_boundaries.test.mjs",
  "tests/e2e/tier3_combinations.test.mjs",
  "tests/e2e/tier4_workloads.test.mjs"
];

const trivialPatterns = [
  /assertEqual\s*\(\s*1\s*,\s*1\s*\)/,
  /assertEqual\s*\(\s*true\s*,\s*true\s*\)/,
  /assertEqual\s*\(\s*0\s*,\s*0\s*\)/,
  /assertEqual\s*\(\s*(['"]).*\1\s*,\s*\1.*\1\s*\)/, // literal string equals same literal string
  /assert\s*\(\s*true\s*\)/,
  /expect\s*\(\s*true\s*\)\.toBe\s*\(\s*true\s*\)/,
  /expect\s*\(\s*1\s*\)\.toBe\s*\(\s*1\s*\)/
];

let suspiciousTests = [];

for (const relPath of testFiles) {
  const fullPath = path.resolve(rootDir, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  let inTest = false;
  let currentTestName = "";
  let currentTestBody = [];
  let braceDepth = 0;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inTest && /runner\.(test|it)\(/.test(line)) {
      inTest = true;
      startLine = i + 1;
      const m = line.match(/runner\.(?:test|it)\(\s*["'`]?([^"'`]+)["'`]?/);
      currentTestName = m ? m[1] : `Test at line ${i+1}`;
      currentTestBody = [line];
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0 && line.includes("}")) {
        inTest = false;
        checkTest(relPath, currentTestName, currentTestBody.join("\n"), startLine);
      }
      continue;
    }

    if (inTest) {
      currentTestBody.push(line);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        inTest = false;
        checkTest(relPath, currentTestName, currentTestBody.join("\n"), startLine);
      }
    }
  }
}

function checkTest(file, name, body, line) {
  // Check for trivial assertions
  for (const pat of trivialPatterns) {
    if (pat.test(body)) {
      suspiciousTests.push({ file, name, line, pattern: String(pat), reason: "Trivial literal assertion" });
    }
  }
}

console.log(`Suspicious trivial assertions found: ${suspiciousTests.length}`);
if (suspiciousTests.length > 0) {
  console.log(JSON.stringify(suspiciousTests, null, 2));
}
