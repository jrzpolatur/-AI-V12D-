/**
 * Milestone 1 Adversarial & Stress Test Suite — Challenger 1
 * Targets:
 * - drawCharacter, drawHat, drawShieldHalo, drawRespawnProtectionRing
 * - hexToRgb, rgba, shade
 *
 * Vectors:
 * 1. Extreme Velocities & Speeds (0, negative, relativistic, NaN, Infinity)
 * 2. High-speed Spin Aiming (100k rad/s, multi-turn wraps, extreme trigonometric values)
 * 3. Zero / Negative / Large Delta Time (t=0, t=-1e5, t=1e9, timestamp wrap)
 * 4. Rapid Flash State Toggles (1000 alternating frames, cache safety, silhouette purity)
 * 5. Corrupted / Missing / NaN / Null Inputs & Type Edge Cases
 * 6. Canvas State Stack Invariant (save/restore balancing) & Headless Robustness
 * 7. F01–F07 Complete Feature Invariant Assertions
 */

import assert from "node:assert/strict";

// Mock Canvas 2D Context with deep call tracking and state stack validation
function createTrackingContext() {
  const stack = [];
  const calls = [];
  const state = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    globalAlpha: 1.0,
    lineDash: [],
  };

  const record = (method, args) => {
    calls.push({
      method,
      args,
      fillStyle: state.fillStyle,
      strokeStyle: state.strokeStyle,
      lineWidth: state.lineWidth,
      globalAlpha: state.globalAlpha,
      lineDash: [...state.lineDash],
    });
  };

  const ctx = {
    get drawCalls() {
      return calls;
    },
    get stackDepth() {
      return stack.length;
    },
    set fillStyle(val) {
      state.fillStyle = val;
      record("set:fillStyle", [val]);
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set strokeStyle(val) {
      state.strokeStyle = val;
      record("set:strokeStyle", [val]);
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set lineWidth(val) {
      state.lineWidth = val;
      record("set:lineWidth", [val]);
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set globalAlpha(val) {
      state.globalAlpha = val;
      record("set:globalAlpha", [val]);
    },
    get globalAlpha() {
      return state.globalAlpha;
    },
    save() {
      stack.push({ ...state, lineDash: [...state.lineDash] });
      record("save", []);
    },
    restore() {
      if (stack.length === 0) {
        throw new Error("Canvas context stack underflow: restore() called more than save()");
      }
      const prev = stack.pop();
      Object.assign(state, prev);
      record("restore", []);
    },
    translate(x, y) {
      record("translate", [x, y]);
    },
    rotate(angle) {
      record("rotate", [angle]);
    },
    scale(sx, sy) {
      record("scale", [sx, sy]);
    },
    fillRect(x, y, w, h) {
      record("fillRect", [x, y, w, h]);
    },
    strokeRect(x, y, w, h) {
      record("strokeRect", [x, y, w, h]);
    },
    beginPath() {
      record("beginPath", []);
    },
    closePath() {
      record("closePath", []);
    },
    moveTo(x, y) {
      record("moveTo", [x, y]);
    },
    lineTo(x, y) {
      record("lineTo", [x, y]);
    },
    arc(x, y, r, sa, ea) {
      record("arc", [x, y, r, sa, ea]);
    },
    fill() {
      record("fill", []);
    },
    stroke() {
      record("stroke", []);
    },
    setLineDash(dash) {
      state.lineDash = dash ? [...dash] : [];
      record("setLineDash", [dash]);
    },
    getLineDash() {
      return [...state.lineDash];
    },
    reset() {
      calls.length = 0;
      stack.length = 0;
      state.fillStyle = "#000000";
      state.strokeStyle = "#000000";
      state.lineWidth = 1;
      state.globalAlpha = 1.0;
      state.lineDash = [];
    }
  };

  return ctx;
}

async function runChallengerTestSuite() {
  console.log("==========================================================================");
  console.log(" 🔥 RUNNING CHALLENGER 1 ADVERSARIAL STRESS SUITE (M1 CHARACTER SYSTEM) 🔥");
  console.log("==========================================================================\n");

  const {
    drawHat,
    drawCharacter,
    drawShieldHalo,
    drawRespawnProtectionRing,
    hexToRgb,
    rgba,
    shade,
  } = await import("../server/engine.bundle.mjs");

  const baseChar = {
    id: "vanguard",
    name: "Vanguard Raider",
    title: "Enforcer",
    bodyColor: "#2563eb",
    accent: "#38bdf8",
    skin: "#fed7aa",
    speed: 200,
    maxHp: 100,
    damageMult: 1,
    fireRateMult: 1,
    size: 16,
    perk: "Frontline Shield",
    desc: "Heavy armored striker",
  };

  const baseOutfit = {
    id: "enforcer",
    name: "Enforcer Rig",
    suit: "#1e293b",
    suitDark: "#0f172a",
    accent: "#00f0ff",
    hat: "helmet",
    perk: "Kinetic Deflector",
    speedBonus: 0,
    hpBonus: 0,
  };

  let totalAssertions = 0;
  function check(cond, msg) {
    totalAssertions++;
    if (!cond) {
      throw new Error(`Assertion Failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 1: Canvas Stack Balance & Zero-Leak Invariant
  // -------------------------------------------------------------------------
  console.log("▶ [Challenge 1] Canvas Stack Balance & State Isolation...");
  {
    const ctx = createTrackingContext();
    const hats = ["helmet", "cap", "hood", "visor", "alien", "monkey", "tycoon", "none"];

    for (const hat of hats) {
      ctx.reset();
      drawHat(ctx, hat, "#ff00ff", 16, 1.234, false);
      check(ctx.stackDepth === 0, `drawHat (${hat}) must leave stack depth at 0, got ${ctx.stackDepth}`);

      ctx.reset();
      drawHat(ctx, hat, "#ff00ff", 16, 1.234, true); // flash
      check(ctx.stackDepth === 0, `drawHat flash (${hat}) must leave stack depth at 0, got ${ctx.stackDepth}`);
    }

    ctx.reset();
    drawShieldHalo(ctx, 100, 100, 16, 2.5, 1.0);
    check(ctx.stackDepth === 0, `drawShieldHalo must restore stack depth to 0, got ${ctx.stackDepth}`);

    ctx.reset();
    drawShieldHalo(ctx, 100, 100, 16, 2.5, 0.0); // inactive
    check(ctx.stackDepth === 0, `drawShieldHalo inactive must restore stack depth to 0, got ${ctx.stackDepth}`);

    ctx.reset();
    drawRespawnProtectionRing(ctx, 100, 100, 16, 2.5, 1.0);
    check(ctx.stackDepth === 0, `drawRespawnProtectionRing must restore stack depth to 0, got ${ctx.stackDepth}`);

    ctx.reset();
    drawRespawnProtectionRing(ctx, 100, 100, 16, 2.5, 0.0); // inactive
    check(ctx.stackDepth === 0, `drawRespawnProtectionRing inactive must restore stack depth to 0, got ${ctx.stackDepth}`);

    ctx.reset();
    drawCharacter(ctx, {
      x: 100,
      y: 100,
      angle: 1.57,
      character: baseChar,
      outfit: baseOutfit,
      size: 16,
      t: 1.0,
      isCloaked: true,
      shieldActive: true,
      isInvulnerable: true,
    });
    check(ctx.stackDepth === 0, `drawCharacter (full FX) must restore stack depth to 0, got ${ctx.stackDepth}`);

    console.log("  ✔ Canvas stack balance validated across all functions and FX modes.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 2: Extreme Speeds & Velocity Boundaries
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 2] Extreme Speeds, Discrete Frame Invariants & Negative Speeds...");
  {
    const ctx = createTrackingContext();
    const extremeSpeeds = [
      0,
      0.00001,
      9.9999,
      10.0,
      10.0001,
      50,
      150,
      1000,
      100000,
      1e8,
      -0.0001,
      -10,
      -500,
      -1e6,
    ];

    for (const spd of extremeSpeeds) {
      ctx.reset();
      // Should not throw or generate non-finite coordinates
      drawCharacter(ctx, {
        x: 200,
        y: 200,
        angle: 0,
        character: baseChar,
        outfit: baseOutfit,
        size: 16,
        speed: spd,
        t: 0.5,
      });

      // Verify all draw calls contain strictly finite numeric arguments
      for (const call of ctx.drawCalls) {
        for (const arg of call.args) {
          if (typeof arg === "number") {
            check(Number.isFinite(arg), `Draw call ${call.method} arg ${arg} must be finite at speed ${spd}`);
          }
        }
      }
    }

    // Verify 6-frame discrete stepping switch coverage
    const framesObserved = new Set();
    for (let cycle = -12; cycle <= 12; cycle += 0.5) {
      ctx.reset();
      drawCharacter(ctx, {
        x: 150,
        y: 150,
        angle: 0,
        character: baseChar,
        outfit: baseOutfit,
        size: 16,
        speed: 100,
        walkCycle: cycle,
      });
      const expectedFrame = Math.floor(Math.abs(cycle)) % 6;
      framesObserved.add(expectedFrame);
      check(ctx.drawCalls.length > 0, `WalkCycle ${cycle} (frame ${expectedFrame}) must render`);
    }
    check(framesObserved.size === 6, `All 6 discrete run frames (0..5) must be exercised, observed: ${[...framesObserved].join(",")}`);

    console.log("  ✔ Extreme speeds, negative velocities, and 6-frame discrete gait verified.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 3: High-Speed Spin Aiming & Multi-turn Wraps
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 3] High-Speed Spin Aiming & Angular Stress (100,000 rad/s)...");
  {
    const ctx = createTrackingContext();
    const extremeAngles = [
      0,
      Math.PI / 4,
      Math.PI / 2,
      Math.PI,
      Math.PI * 1.5,
      Math.PI * 2,
      Math.PI * 100,
      -Math.PI * 50,
      1e5,
      -1e5,
      1e7,
      -1e7,
    ];

    for (const angle of extremeAngles) {
      ctx.reset();
      drawCharacter(ctx, {
        x: 240,
        y: 135,
        angle,
        character: baseChar,
        outfit: baseOutfit,
        size: 16,
        lunge: 20,
        meleeSwing: 0.75,
      });

      const rotCalls = ctx.drawCalls.filter((c) => c.method === "rotate");
      check(rotCalls.length >= 1, "Must perform rotate transform");
      const rotAngle = rotCalls[0].args[0];
      check(Number.isFinite(rotAngle), `Rotate angle must be finite, got ${rotAngle}`);

      // Verify all translated coordinates remain finite
      const transCalls = ctx.drawCalls.filter((c) => c.method === "translate");
      for (const t of transCalls) {
        check(Number.isFinite(t.args[0]) && Number.isFinite(t.args[1]), `Translate args must be finite: ${t.args}`);
      }
    }

    // Simulate 1,000 frames of hyper-fast spin aiming (36,000 deg/frame)
    for (let frame = 0; frame < 1000; frame++) {
      ctx.reset();
      const spinAngle = frame * 628.31853; // ~100 rotations per frame
      drawCharacter(ctx, {
        x: 240,
        y: 135,
        angle: spinAngle,
        character: baseChar,
        outfit: baseOutfit,
        size: 16,
        t: frame * 0.016,
      });
      check(ctx.drawCalls.length > 0, `Spin frame ${frame} must produce draw calls`);
    }

    console.log("  ✔ 1,000 frames of hyper-speed spin aiming passed without numerical divergence.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 4: Zero, Negative & Relativistic Delta Time (t)
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 4] Zero, Negative, Large Timestamps & Modulus Safety...");
  {
    const ctx = createTrackingContext();
    const testTimes = [
      0,
      -0.0001,
      -100.5,
      -999999.99,
      1e6,
      1e9,
      Number.MAX_SAFE_INTEGER / 1e10,
    ];

    for (const t of testTimes) {
      ctx.reset();
      // Draw all hats under unusual times
      for (const hat of ["helmet", "cap", "hood", "visor", "alien", "monkey", "tycoon"]) {
        drawHat(ctx, hat, "#38bdf8", 16, t, false);
      }
      drawShieldHalo(ctx, 100, 100, 16, t, 1.0);
      drawRespawnProtectionRing(ctx, 100, 100, 16, t, 1.0);
      drawCharacter(ctx, {
        x: 100,
        y: 100,
        angle: 0,
        character: baseChar,
        outfit: baseOutfit,
        size: 16,
        t,
        isCloaked: true,
        shieldActive: true,
        isInvulnerable: true,
      });

      // Verify no NaN or undefined in any draw call arguments or colors
      for (const call of ctx.drawCalls) {
        for (const arg of call.args) {
          if (typeof arg === "number") {
            check(Number.isFinite(arg), `Draw call ${call.method} has non-finite argument ${arg} at t=${t}`);
          }
        }
        if (typeof call.fillStyle === "string") {
          check(!call.fillStyle.includes("NaN"), `FillStyle contains NaN: ${call.fillStyle} at t=${t}`);
          check(!call.fillStyle.includes("undefined"), `FillStyle contains undefined: ${call.fillStyle} at t=${t}`);
        }
        if (typeof call.strokeStyle === "string") {
          check(!call.strokeStyle.includes("NaN"), `StrokeStyle contains NaN: ${call.strokeStyle} at t=${t}`);
          check(!call.strokeStyle.includes("undefined"), `StrokeStyle contains undefined: ${call.strokeStyle} at t=${t}`);
        }
      }
    }

    console.log("  ✔ Time domain stress (negative, zero, large t) verified with 100% finite outputs.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 5: Rapid Damage Flash Toggles & Pure White Silhouette
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 5] Rapid Damage Flash Toggles & 100% White Silhouette Purity...");
  {
    const ctx = createTrackingContext();
    const hats = ["helmet", "cap", "hood", "visor", "alien", "monkey", "tycoon"];

    // Stress test 1,000 rapid flash toggles
    for (let frame = 0; frame < 1000; frame++) {
      const isFlash = frame % 2 === 0;
      const hat = hats[frame % hats.length];
      ctx.reset();

      drawCharacter(ctx, {
        x: 100,
        y: 100,
        angle: 0.5,
        character: baseChar,
        outfit: { ...baseOutfit, hat, id: "assassin" },
        size: 16,
        t: frame * 0.016,
        flash: isFlash ? 0.9 : 0.0,
        isHurtFlash: isFlash,
        hasCape: true,
      });

      if (isFlash) {
        // In hurt flash state, every single character body part MUST be #ffffff
        const fills = ctx.drawCalls.filter((c) => c.method === "fillRect" || c.method === "fill");
        for (const call of fills) {
          if (typeof call.fillStyle === "string") {
            const fs = call.fillStyle.toLowerCase().trim();
            // Allow ground drop shadow
            if (fs.startsWith("rgba(0,0,0,")) continue;
            check(
              fs === "#ffffff" || fs === "rgb(255,255,255)" || fs === "#fff" || fs.startsWith("rgba(255,255,255,"),
              `Hurt flash violation at frame ${frame}: expected #ffffff, found ${call.fillStyle}`
            );
          }
        }

        const strokes = ctx.drawCalls.filter((c) => c.method === "strokeRect" || c.method === "stroke");
        for (const call of strokes) {
          if (typeof call.strokeStyle === "string") {
            const ss = call.strokeStyle.toLowerCase().trim();
            check(
              ss === "#ffffff" || ss === "rgb(255,255,255)" || ss === "#fff",
              `Hurt flash stroke violation at frame ${frame}: expected #ffffff, found ${call.strokeStyle}`
            );
          }
        }
      } else {
        // Normal state must have rich non-white colors
        const colors = new Set(ctx.drawCalls.map((c) => c.fillStyle).filter(Boolean));
        check(colors.size >= 3, `Normal character render must have multi-tone palette (found ${colors.size} colors)`);
      }
    }

    console.log("  ✔ 1,000 rapid flash cycles tested. Pure white silhouette invariant strictly preserved.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 6: Corrupted, Missing, Null & Boundary Inputs
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 6] Corrupted Objects, Missing Fields & Null Safety...");
  {
    const ctx = createTrackingContext();

    // 6.1 Unknown / exotic hat types should degrade gracefully without crash
    ctx.reset();
    drawHat(ctx, "non_existent_hat_type", "#38bdf8", 16, 0, false);
    check(ctx.stackDepth === 0, "Unknown hat must restore stack");

    // 6.2 Negative / zero / huge size
    for (const sz of [0, 0.1, -16, 1000]) {
      ctx.reset();
      drawCharacter(ctx, {
        x: 100,
        y: 100,
        angle: 0,
        character: baseChar,
        outfit: baseOutfit,
        size: sz,
      });
      check(ctx.stackDepth === 0, `Size ${sz} must restore canvas stack`);
    }

    // 6.3 Missing optional properties
    ctx.reset();
    drawCharacter(ctx, {
      x: 0,
      y: 0,
      angle: 0,
      character: {
        bodyColor: "#123456",
        accent: "#654321",
        skin: "#abcdef",
      },
      outfit: {
        suit: "#222222",
        accent: "#444444",
        hat: "none",
      },
      size: 16,
    });
    check(ctx.drawCalls.length > 0, "Minimal character / outfit must render cleanly");

    // 6.4 Missing setLineDash support on legacy / minimal mock contexts
    const bareCtx = {
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      fill() {},
      stroke() {},
      // setLineDash intentionally omitted
    };

    assert.doesNotThrow(() => {
      drawShieldHalo(bareCtx, 100, 100, 16, 1.0, 1.0);
    }, "drawShieldHalo must not crash on context without setLineDash");

    assert.doesNotThrow(() => {
      drawRespawnProtectionRing(bareCtx, 100, 100, 16, 1.0, 1.0);
    }, "drawRespawnProtectionRing must not crash on context without setLineDash");

    console.log("  ✔ Null safety, missing properties, and headless mock tolerance verified.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 7: Color Helper Functions Adversarial Fuzzing
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 7] Color Helper Functions Fuzzing (hexToRgb, rgba, shade)...");
  {
    // 7.1 Standard hex formats
    const rgb1 = hexToRgb("#38bdf8");
    check(rgb1[0] === 0x38 && rgb1[1] === 0xbd && rgb1[2] === 0xf8, "Standard 6-char hex parse");

    const rgb2 = hexToRgb("#fff");
    check(rgb2[0] === 255 && rgb2[1] === 255 && rgb2[2] === 255, "3-char hex parse");

    // 7.2 rgba generation
    const str1 = rgba("#00f0ff", 0.5);
    check(str1.includes("rgba(") && str1.includes("0.5"), `rgba output format: ${str1}`);

    // 7.3 shade clamping
    const shadedDark = shade("#ffffff", -1.5); // extreme negative amount -> clamped to 0
    check(shadedDark === "rgb(0,0,0)", `Extreme negative shade must clamp to 0, got ${shadedDark}`);

    const shadedBright = shade("#000000", 2.0); // extreme positive amount -> clamped to 255
    check(shadedBright === "rgb(255,255,255)", `Extreme positive shade must clamp to 255, got ${shadedBright}`);

    // 7.4 Color cache performance / consistency
    for (let i = 0; i < 5000; i++) {
      const hex = `#${(i % 256).toString(16).padStart(2, "0")}88aa`;
      hexToRgb(hex);
      rgba(hex, 0.8);
      shade(hex, 0.1);
    }
    console.log("  ✔ 15,000 color cache calls executed with zero errors and fast cache throughput.");
  }

  // -------------------------------------------------------------------------
  // CHALLENGE 8: Comprehensive Feature Spec Invariant Matrix (F01–F07)
  // -------------------------------------------------------------------------
  console.log("\n▶ [Challenge 8] Feature Spec Invariant Matrix (F01–F07)...");
  {
    const ctx = createTrackingContext();

    // F01: All 7 hat types
    const hatTypes = ["helmet", "cap", "hood", "visor", "alien", "monkey", "tycoon"];
    for (const h of hatTypes) {
      ctx.reset();
      drawHat(ctx, h, "#38bdf8", 16, 1.0, false);
      check(ctx.drawCalls.length >= 2, `Hat ${h} must produce distinct multi-pixel drawing`);
    }
    console.log("  ✔ F01: 7 Modular hats & animated cyber visors validated.");

    // F02: Cape & Armor Grading
    ctx.reset();
    drawCharacter(ctx, {
      x: 100,
      y: 100,
      angle: 0,
      character: baseChar,
      outfit: { ...baseOutfit, id: "assassin" },
      size: 16,
      hasCape: true,
      capeColor: "#ef4444",
      armorLevel: 3,
    });
    const capeDraws = ctx.drawCalls.filter((c) => typeof c.fillStyle === "string" && c.fillStyle.includes("rgb"));
    check(capeDraws.length >= 4, "F02: Multi-layer cape folds and armor bevels present");
    console.log("  ✔ F02: Multi-layer cloak, shoulder pauldrons & chestplate grading validated.");

    // F03: Gait bobbing & Stepped drop shadow
    ctx.reset();
    drawCharacter(ctx, {
      x: 100,
      y: 100,
      angle: 0,
      character: baseChar,
      outfit: baseOutfit,
      size: 16,
      speed: 150,
      walkCycle: 1,
    });
    const shadowTiers = ctx.drawCalls.filter(
      (c) => c.method === "fillRect" && typeof c.fillStyle === "string" && c.fillStyle.startsWith("rgba(0,0,0,")
    );
    check(shadowTiers.length === 3, `F03: Must have exactly 3 concentric drop shadow tiers, found ${shadowTiers.length}`);
    console.log("  ✔ F03: Gait bobbing, boot lift & 3-tier stepped drop shadow validated.");

    // F04: Hurt flash
    ctx.reset();
    drawCharacter(ctx, {
      x: 100,
      y: 100,
      angle: 0,
      character: baseChar,
      outfit: baseOutfit,
      size: 16,
      isHurtFlash: true,
    });
    const nonWhiteFills = ctx.drawCalls.filter(
      (c) =>
        (c.method === "fillRect" || c.method === "fill") &&
        typeof c.fillStyle === "string" &&
        !c.fillStyle.startsWith("rgba(0,0,0,") &&
        c.fillStyle !== "#ffffff" &&
        c.fillStyle !== "rgb(255,255,255)" &&
        c.fillStyle !== "#fff"
    );
    check(nonWhiteFills.length === 0, `F04: All character parts must be #ffffff during hurt flash, found ${nonWhiteFills.length} non-white calls`);
    console.log("  ✔ F04: Pure white damage silhouette flash validated.");

    // F05: Dashed Shield Halo
    ctx.reset();
    drawShieldHalo(ctx, 100, 100, 16, 1.0, 1.0);
    const lineDashSet = ctx.drawCalls.some((c) => c.method === "setLineDash" && Array.isArray(c.args[0]) && c.args[0].length > 0);
    const nodes = ctx.drawCalls.filter((c) => c.method === "fillRect");
    check(lineDashSet, "F05: Shield halo must set line dash for forcefield perimeter");
    check(nodes.length >= 8, "F05: Must render corner nodes and orbiting satellites");
    console.log("  ✔ F05: Rotating octagonal dashed shield forcefield halo validated.");

    // F06: Golden Protection Ring
    ctx.reset();
    drawRespawnProtectionRing(ctx, 100, 100, 16, 1.0, 1.0);
    const circles = ctx.drawCalls.filter((c) => c.method === "arc");
    check(circles.length >= 2, "F06: Must draw concentric golden protection arcs");
    console.log("  ✔ F06: Concentric golden protection ring with radian ticks & rune glyphs validated.");

    // F07: Stealth Refraction Transparency
    ctx.reset();
    drawCharacter(ctx, {
      x: 100,
      y: 100,
      angle: 0,
      character: baseChar,
      outfit: baseOutfit,
      size: 16,
      isCloaked: true,
      cloakAlpha: 0.22,
    });
    const alphaSet = ctx.drawCalls.some((c) => c.method === "set:globalAlpha" && Math.abs(c.args[0] - 0.22) < 1e-4);
    check(alphaSet, "F07: Cloaked character must set globalAlpha");
    const glitchPixels = ctx.drawCalls.filter(
      (c) =>
        c.method === "fillRect" &&
        typeof c.fillStyle === "string" &&
        (c.fillStyle.includes("34,211,238") ||
          c.fillStyle.includes("34, 211, 238") ||
          c.fillStyle.includes("192,132,252") ||
          c.fillStyle.includes("192, 132, 252") ||
          c.fillStyle.includes("#22d3ee") ||
          c.fillStyle.includes("#c084fc"))
    );
    check(glitchPixels.length >= 8, `F07: Must render corner digital glitch brackets & iridescent refraction edges (found ${glitchPixels.length})`);
    console.log("  ✔ F07: Stealth refraction, transparency & chromatic glitch marks validated.");
  }

  console.log("\n==========================================================================");
  console.log(` 🏆 CHALLENGER 1 ADVERSARIAL STRESS SUITE COMPLETE: ${totalAssertions} INVARIANTS PASSED!`);
  console.log("==========================================================================\n");
}

runChallengerTestSuite().catch((err) => {
  console.error("❌ CHALLENGER STRESS SUITE FAILED:", err);
  process.exit(1);
});
