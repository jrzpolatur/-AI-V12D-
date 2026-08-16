// tests/e2e/harness.mjs
// E2E Test Harness & Micro-Assertion Framework for FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter

import { performance } from "perf_hooks";

// ANSI Color Codes
export const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

// ---------------------------------------------------------------------------
// Assertion Library
// ---------------------------------------------------------------------------
export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message || "Assertion Failed");
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

export function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message || "Expected condition to be truthy", condition, true);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`,
      actual,
      expected
    );
  }
}

export function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(actual)} NOT to equal ${JSON.stringify(expected)}`,
      actual,
      expected
    );
  }
}

export function assertApprox(actual, expected, epsilon = 1e-4, message) {
  const diff = Math.abs(actual - expected);
  if (isNaN(diff) || diff > epsilon) {
    throw new AssertionError(
      message || `Expected ${actual} to approximate ${expected} within ±${epsilon} (diff: ${diff})`,
      actual,
      expected
    );
  }
}

export function assertInRange(val, min, max, message) {
  if (val < min || val > max) {
    throw new AssertionError(
      message || `Expected ${val} to be in range [${min}, ${max}]`,
      val,
      `[${min}, ${max}]`
    );
  }
}

export function assertDeepEqual(actual, expected, message) {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    throw new AssertionError(
      message || `Deep equality mismatch:\nActual:   ${aStr}\nExpected: ${eStr}`,
      actual,
      expected
    );
  }
}

export function assertIncludes(haystack, needle, message) {
  if (typeof haystack === "string") {
    if (!haystack.includes(needle)) {
      throw new AssertionError(
        message || `Expected string "${haystack}" to include "${needle}"`,
        haystack,
        needle
      );
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      throw new AssertionError(
        message || `Expected array to include ${JSON.stringify(needle)}`,
        haystack,
        needle
      );
    }
  } else {
    throw new AssertionError("assertIncludes requires string or array", haystack, needle);
  }
}

export function assertThrows(fn, expectedError, message) {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new AssertionError(message || "Expected function to throw an exception", null, "Exception");
  }
  if (expectedError) {
    if (expectedError instanceof RegExp) {
      if (!expectedError.test(String(thrownError))) {
        throw new AssertionError(
          message || `Expected thrown error ${thrownError} to match regex ${expectedError}`,
          String(thrownError),
          String(expectedError)
        );
      }
    } else if (typeof expectedError === "function") {
      if (!(thrownError instanceof expectedError)) {
        throw new AssertionError(
          message || `Expected thrown error to be instance of ${expectedError.name}`,
          thrownError?.constructor?.name,
          expectedError.name
        );
      }
    }
  }
}

// Fluent expect interface
export function expect(actual) {
  return {
    toBe(expected) {
      assertEqual(actual, expected);
    },
    toEqual(expected) {
      assertDeepEqual(actual, expected);
    },
    toBeCloseTo(expected, numDigits = 2) {
      const eps = Math.pow(10, -numDigits) / 2;
      assertApprox(actual, expected, eps);
    },
    toBeGreaterThan(expected) {
      assert(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      assert(actual >= expected, `Expected ${actual} >= ${expected}`);
    },
    toBeLessThan(expected) {
      assert(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      assert(actual <= expected, `Expected ${actual} <= ${expected}`);
    },
    toBeTruthy() {
      assert(Boolean(actual), `Expected ${actual} to be truthy`);
    },
    toBeFalsy() {
      assert(!actual, `Expected ${actual} to be falsy`);
    },
    toBeNull() {
      assertEqual(actual, null);
    },
    toBeDefined() {
      assert(actual !== undefined, `Expected value to be defined`);
    },
    toBeUndefined() {
      assertEqual(actual, undefined);
    },
    toContain(item) {
      assertIncludes(actual, item);
    },
    toThrow(regexOrClass) {
      assertThrows(actual, regexOrClass);
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Canvas 2D & Context Infrastructure for Node.js E2E Visual Testing
// ---------------------------------------------------------------------------
export function createMockContext2D(width = 480, height = 270) {
  const drawCalls = [];
  const stateStack = [];

  const ctx = {
    canvas: null,
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    globalAlpha: 1.0,
    globalCompositeOperation: "source-over",
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    // Transform matrix tracking: [a, b, c, d, e, f]
    matrix: [1, 0, 0, 1, 0, 0],

    // Log / Inspection
    drawCalls,

    save() {
      stateStack.push({
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        fillStyle: this.fillStyle,
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
        globalAlpha: this.globalAlpha,
        globalCompositeOperation: this.globalCompositeOperation,
        font: this.font,
        textAlign: this.textAlign,
        textBaseline: this.textBaseline,
        matrix: [...this.matrix],
      });
      drawCalls.push({ method: "save" });
    },

    restore() {
      if (stateStack.length > 0) {
        const s = stateStack.pop();
        this.imageSmoothingEnabled = s.imageSmoothingEnabled;
        this.fillStyle = s.fillStyle;
        this.strokeStyle = s.strokeStyle;
        this.lineWidth = s.lineWidth;
        this.globalAlpha = s.globalAlpha;
        this.globalCompositeOperation = s.globalCompositeOperation;
        this.font = s.font;
        this.textAlign = s.textAlign;
        this.textBaseline = s.textBaseline;
        this.matrix = [...s.matrix];
      }
      drawCalls.push({ method: "restore" });
    },

    translate(x, y) {
      this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
      this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;
      drawCalls.push({ method: "translate", x, y });
    },

    rotate(angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const a = this.matrix[0];
      const b = this.matrix[1];
      const c = this.matrix[2];
      const d = this.matrix[3];
      this.matrix[0] = a * cos + c * sin;
      this.matrix[1] = b * cos + d * sin;
      this.matrix[2] = -a * sin + c * cos;
      this.matrix[3] = -b * sin + d * cos;
      drawCalls.push({ method: "rotate", angle });
    },

    scale(sx, sy) {
      this.matrix[0] *= sx;
      this.matrix[1] *= sx;
      this.matrix[2] *= sy;
      this.matrix[3] *= sy;
      drawCalls.push({ method: "scale", sx, sy });
    },

    setTransform(a, b, c, d, e, f) {
      this.matrix = [a, b, c, d, e, f];
      drawCalls.push({ method: "setTransform", a, b, c, d, e, f });
    },

    resetTransform() {
      this.matrix = [1, 0, 0, 1, 0, 0];
      drawCalls.push({ method: "resetTransform" });
    },

    fillRect(x, y, w, h) {
      drawCalls.push({ method: "fillRect", x, y, w, h, fillStyle: this.fillStyle, alpha: this.globalAlpha });
    },

    strokeRect(x, y, w, h) {
      drawCalls.push({ method: "strokeRect", x, y, w, h, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth });
    },

    clearRect(x, y, w, h) {
      drawCalls.push({ method: "clearRect", x, y, w, h });
    },

    beginPath() {
      drawCalls.push({ method: "beginPath" });
    },

    closePath() {
      drawCalls.push({ method: "closePath" });
    },

    moveTo(x, y) {
      drawCalls.push({ method: "moveTo", x, y });
    },

    lineTo(x, y) {
      drawCalls.push({ method: "lineTo", x, y });
    },

    arc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
      drawCalls.push({ method: "arc", x, y, radius, startAngle, endAngle, counterclockwise });
    },

    fill() {
      drawCalls.push({ method: "fill", fillStyle: this.fillStyle });
    },

    stroke() {
      drawCalls.push({ method: "stroke", strokeStyle: this.strokeStyle });
    },

    fillText(text, x, y, maxWidth) {
      drawCalls.push({ method: "fillText", text, x, y, maxWidth, fillStyle: this.fillStyle, font: this.font });
    },

    strokeText(text, x, y, maxWidth) {
      drawCalls.push({ method: "strokeText", text, x, y, maxWidth, strokeStyle: this.strokeStyle });
    },

    measureText(text) {
      return { width: (text ? text.length * 6 : 0), actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 };
    },

    drawImage(image, ...args) {
      drawCalls.push({ method: "drawImage", args });
    },

    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      const stops = [];
      return {
        addColorStop(offset, color) {
          stops.push({ offset, color });
        },
        _x0: x0,
        _y0: y0,
        _r0: r0,
        _x1: x1,
        _y1: y1,
        _r1: r1,
        _stops: stops,
      };
    },

    createLinearGradient(x0, y0, x1, y1) {
      const stops = [];
      return {
        addColorStop(offset, color) {
          stops.push({ offset, color });
        },
        _x0: x0,
        _y0: y0,
        _x1: x1,
        _y1: y1,
        _stops: stops,
      };
    },

    roundRect(x, y, w, h, radii) {
      drawCalls.push({ method: "roundRect", x, y, w, h, radii });
    },
  };

  const canvas = {
    width,
    height,
    getContext(type) {
      if (type === "2d") return ctx;
      return null;
    },
  };
  ctx.canvas = canvas;
  return { canvas, ctx };
}

// ---------------------------------------------------------------------------
// Suite & Runner Core
// ---------------------------------------------------------------------------
export class TestRunner {
  constructor() {
    this.suites = []; // Array of Suite objects
    this.currentSuite = null;
    this.results = {
      tiers: {},
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDurationMs: 0,
    };
  }

  describe(name, fn, meta = {}) {
    const suite = {
      name,
      tier: meta.tier || 1,
      featureId: meta.featureId || "F00",
      category: meta.category || "General",
      tests: [],
      beforeAllFns: [],
      afterAllFns: [],
      beforeEachFns: [],
      afterEachFns: [],
    };

    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    this.suites.push(suite);

    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn, meta = {}) {
    if (!this.currentSuite) {
      this.describe("Default Suite", () => {
        this.test(name, fn, meta);
      });
      return;
    }
    this.currentSuite.tests.push({
      name,
      fn,
      skip: Boolean(meta.skip),
      meta,
    });
  }

  it(name, fn, meta = {}) {
    this.test(name, fn, meta);
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllFns.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllFns.push(fn);
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachFns.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachFns.push(fn);
  }

  async runTier(tierNumber) {
    const suitesForTier = this.suites.filter((s) => s.tier === tierNumber);
    const tierStats = {
      tier: tierNumber,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      featureStats: {},
      failures: [],
    };

    const tierStart = performance.now();

    for (const suite of suitesForTier) {
      const featKey = suite.featureId || "General";
      if (!tierStats.featureStats[featKey]) {
        tierStats.featureStats[featKey] = {
          featureId: featKey,
          category: suite.category,
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          durationMs: 0,
        };
      }
      const featStat = tierStats.featureStats[featKey];

      // Run beforeAll hooks
      for (const bAll of suite.beforeAllFns) {
        await bAll();
      }

      for (const t of suite.tests) {
        tierStats.total++;
        featStat.total++;

        if (t.skip) {
          tierStats.skipped++;
          featStat.skipped++;
          continue;
        }

        // Run beforeEach hooks
        for (const bEach of suite.beforeEachFns) {
          await bEach();
        }

        const tStart = performance.now();
        let pass = false;
        let error = null;

        try {
          await t.fn();
          pass = true;
        } catch (err) {
          error = err;
        }

        const tEnd = performance.now();
        const dur = tEnd - tStart;
        featStat.durationMs += dur;

        if (pass) {
          tierStats.passed++;
          featStat.passed++;
        } else {
          tierStats.failed++;
          featStat.failed++;
          tierStats.failures.push({
            suiteName: suite.name,
            testName: t.name,
            featureId: suite.featureId,
            error,
            durationMs: dur,
          });
        }

        // Run afterEach hooks
        for (const aEach of suite.afterEachFns) {
          try {
            await aEach();
          } catch (e) {
            console.error("Error in afterEach hook:", e);
          }
        }
      }

      // Run afterAll hooks
      for (const aAll of suite.afterAllFns) {
        try {
          await aAll();
        } catch (e) {
          console.error("Error in afterAll hook:", e);
        }
      }
    }

    tierStats.durationMs = performance.now() - tierStart;
    this.results.tiers[tierNumber] = tierStats;
    this.results.totalTests += tierStats.total;
    this.results.totalPassed += tierStats.passed;
    this.results.totalFailed += tierStats.failed;
    this.results.totalSkipped += tierStats.skipped;
    this.results.totalDurationMs += tierStats.durationMs;

    return {
      success: tierStats.failed === 0,
      stats: tierStats,
    };
  }
}

export function createRunner() {
  return new TestRunner();
}
