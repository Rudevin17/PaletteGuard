import { describe, expect, it } from "vitest";
import { checkPalette } from "../src/check.js";
import { parsePalette, parsePaletteDetailed } from "../src/parse.js";
import {
  PASS_FLOOR,
  FAIL_FLOOR,
  FAIL_RATIO,
  WONG,
  distance,
} from "../src/thresholds.js";
import { CONDITIONS, seenAs } from "../src/vision.js";

/**
 * The two fixtures that define correctness for this tool. If either of these
 * stops holding, the thresholds are wrong and nothing else matters.
 */

const WONG_NAMED = [
  { name: "black", hex: "#000000" },
  { name: "orange", hex: "#e69f00" },
  { name: "skyBlue", hex: "#56b4e9" },
  { name: "bluishGreen", hex: "#009e73" },
  { name: "yellow", hex: "#f0e442" },
  { name: "blue", hex: "#0072b2" },
  { name: "vermillion", hex: "#d55e00" },
  { name: "reddishPurple", hex: "#cc79a7" },
];

/** Real values from RudeSync's src/app.css. Known bad. */
const RUDESYNC = [
  { name: "accent", hex: "#3ddc84" },
  { name: "amber", hex: "#e3b341" },
  { name: "danger", hex: "#ff6961" },
  { name: "blue", hex: "#6ba7f5" },
];

describe("calibration", () => {
  it("derives a pass floor for every condition", () => {
    for (const c of CONDITIONS) {
      expect(PASS_FLOOR[c]).toBeGreaterThan(0);
      expect(FAIL_FLOOR[c]).toBeLessThan(PASS_FLOOR[c]);
    }
  });

  it("puts red-green floors above the blue-yellow one", () => {
    // Wong is weakest under tritanopia; that is what makes a single flat
    // threshold wrong, and this test pins the reason down.
    expect(PASS_FLOOR.protanopia).toBeGreaterThan(PASS_FLOOR.tritanopia);
    expect(PASS_FLOOR.deuteranopia).toBeGreaterThan(PASS_FLOOR.tritanopia);
  });
});

describe("FAIL_RATIO sensitivity", () => {
  // The constant is a judgement call, so pin the window it has to sit inside.
  // Measured across six palettes: below 0.75 the known-bad fixture stops
  // failing entirely, which would make the tool useless; the reference palette
  // stays clean all the way up to 0.90.
  const countFails = (hexes: string[], ratio: number): number => {
    let n = 0;
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        for (const c of CONDITIONS) {
          const d = distance(seenAs(hexes[i], c), seenAs(hexes[j], c));
          if (d < PASS_FLOOR[c] * ratio) n++;
        }
      }
    }
    return n;
  };

  const wong = WONG_NAMED.map((s) => s.hex);
  const bad = RUDESYNC.map((s) => s.hex);

  it("is set at the lenient edge of the usable window, not below it", () => {
    expect(FAIL_RATIO).toBe(0.75);
    expect(countFails(bad, 0.7)).toBe(0); // too lenient — known-bad escapes
    expect(countFails(bad, FAIL_RATIO)).toBeGreaterThan(0);
  });

  it("keeps the reference palette clean across the whole window", () => {
    for (const ratio of [0.75, 0.8, 0.85, 0.9]) {
      expect(countFails(wong, ratio)).toBe(0);
    }
  });
});

describe("Wong palette — the known-good fixture", () => {
  const report = checkPalette(WONG_NAMED);

  it("never fails", () => {
    expect(report.counts.fail).toBe(0);
  });

  it("checks every pair under every condition", () => {
    const pairs = (WONG.length * (WONG.length - 1)) / 2;
    expect(report.findings).toHaveLength(pairs * CONDITIONS.length);
  });
});

describe("RudeSync palette — the known-bad fixture", () => {
  const report = checkPalette(RUDESYNC);

  it("fails overall", () => {
    expect(report.verdict).toBe("fail");
  });

  it("flags success-green against error-red under deuteranopia", () => {
    const hit = report.findings.find(
      (f) =>
        f.condition === "deuteranopia" &&
        [f.a.name, f.b.name].includes("accent") &&
        [f.a.name, f.b.name].includes("danger"),
    );
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("fail");
    expect(hit!.distance).toBeLessThan(10);
  });

  it("flags green against amber under protanopia", () => {
    const hit = report.findings.find(
      (f) =>
        f.condition === "protanopia" &&
        [f.a.name, f.b.name].includes("accent") &&
        [f.a.name, f.b.name].includes("amber"),
    );
    expect(hit).toBeDefined();
    expect(hit!.verdict).toBe("fail");
  });

  it("does NOT flag green against amber under deuteranopia", () => {
    // The workspace notes recorded this pair as failing under deuteranopia at
    // "dE 7.2". It does not — it fails under protanopia. Pinned so the wrong
    // figure cannot quietly return.
    const hit = report.findings.find(
      (f) =>
        f.condition === "deuteranopia" &&
        [f.a.name, f.b.name].includes("accent") &&
        [f.a.name, f.b.name].includes("amber"),
    );
    expect(hit!.verdict).not.toBe("fail");
  });

  it("reports the worst problem first", () => {
    expect(report.findings[0].verdict).toBe("fail");
  });
});

describe("parsing", () => {
  it("reads a JSON array", () => {
    expect(parsePalette('["#e69f00", "#56b4e9"]')).toHaveLength(2);
  });

  it("reads a named JSON object and keeps the names", () => {
    const p = parsePalette('{ "revenue": "#e69f00", "costs": "#56b4e9" }');
    expect(p.map((s) => s.name)).toEqual(["revenue", "costs"]);
  });

  it("reads CSS custom properties", () => {
    const p = parsePalette(`
      :root {
        --chart-1: #e69f00;
        --chart-2: #56b4e9;
        --radius: 4px;
      }
    `);
    expect(p).toEqual([
      { name: "chart-1", hex: "#e69f00" },
      { name: "chart-2", hex: "#56b4e9" },
    ]);
  });

  it("reads bare hex", () => {
    expect(parsePalette("#e69f00 #56b4e9 #009e73")).toHaveLength(3);
  });

  it("narrows a stylesheet with a prefix", () => {
    // The whole reason --prefix exists: surfaces are meant to look alike, so
    // scanning a stylesheet wholesale manufactures failures that are not real.
    const css = `
      --chart-1: #e69f00;
      --chart-2: #56b4e9;
      --surface: #0d1712;
      --surface-raised: #142019;
    `;
    expect(parsePalette(css)).toHaveLength(4);
    expect(parsePalette(css, { prefix: "chart" }).map((s) => s.name)).toEqual([
      "chart-1",
      "chart-2",
    ]);
  });

  it("flags when a stylesheet was read unfiltered", () => {
    const css = "--chart-1: #e69f00; --surface: #0d1712;";
    expect(parsePaletteDetailed(css).unfiltered).toBe(true);
    expect(parsePaletteDetailed(css, { prefix: "chart" }).unfiltered).toBe(false);
  });

  it("does not flag JSON input as unfiltered", () => {
    expect(parsePaletteDetailed('["#e69f00","#56b4e9"]').unfiltered).toBe(false);
  });

  it("errors when a prefix matches nothing, and says what was there", () => {
    expect(() =>
      parsePalette("--surface: #0d1712;", { prefix: "chart" }),
    ).toThrow(/--surface/);
  });

  it("expands shorthand hex", () => {
    const [only] = parsePalette('["#abc"]');
    expect(only.hex).toBe("#aabbcc");
  });

  it("survives a UTF-8 BOM", () => {
    // PowerShell redirection and several Windows editors add one by default.
    const p = parsePalette('﻿{ "revenue": "#e69f00", "costs": "#56b4e9" }');
    expect(p.map((s) => s.name)).toEqual(["revenue", "costs"]);
  });

  it("rejects input with no colours", () => {
    expect(() => parsePalette("nothing here")).toThrow();
  });

  it("rejects a palette of one", () => {
    expect(() => checkPalette([{ name: "a", hex: "#000000" }])).toThrow();
  });
});
