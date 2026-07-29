import {
  CONDITIONS,
  normaliseHex,
  seenAs,
  type Condition,
} from "./vision.js";
import {
  distance,
  FAIL_FLOOR,
  PASS_FLOOR,
  verdictFor,
  type Verdict,
} from "./thresholds.js";

export interface Swatch {
  name: string;
  hex: string;
}

export interface Finding {
  a: Swatch;
  b: Swatch;
  condition: Condition;
  /** CIEDE2000 distance between the two colours *as seen under `condition`*. */
  distance: number;
  /** How the pair appears under that condition. */
  seen: { a: string; b: string };
  verdict: Verdict;
  passFloor: number;
  failFloor: number;
}

export interface Report {
  verdict: Verdict;
  swatches: Swatch[];
  /** Every pair × condition combination, worst first. */
  findings: Finding[];
  counts: Record<Verdict, number>;
}

/**
 * Checks every pair of colours under every condition.
 *
 * All-pairs is correct here specifically because a categorical palette *is* a
 * set of colours intended to be mutually distinguishable — unlike a general
 * design-token file, where two tokens may never appear together and comparing
 * them would be noise.
 */
export function checkPalette(input: Swatch[]): Report {
  const swatches = input.map((s) => ({
    name: s.name,
    hex: normaliseHex(s.hex),
  }));

  if (swatches.length < 2) {
    throw new Error("A palette needs at least two colours to compare.");
  }

  const findings: Finding[] = [];

  for (let i = 0; i < swatches.length; i++) {
    for (let j = i + 1; j < swatches.length; j++) {
      for (const condition of CONDITIONS) {
        const seenA = seenAs(swatches[i].hex, condition);
        const seenB = seenAs(swatches[j].hex, condition);
        const d = distance(seenA, seenB);
        findings.push({
          a: swatches[i],
          b: swatches[j],
          condition,
          distance: d,
          seen: { a: seenA, b: seenB },
          verdict: verdictFor(d, condition),
          passFloor: PASS_FLOOR[condition],
          failFloor: FAIL_FLOOR[condition],
        });
      }
    }
  }

  // Worst first: the point of the report is the problem, not the inventory.
  findings.sort((x, y) => x.distance / x.passFloor - y.distance / y.passFloor);

  const counts: Record<Verdict, number> = { pass: 0, warn: 0, fail: 0 };
  for (const f of findings) counts[f.verdict]++;

  const verdict: Verdict =
    counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";

  return { verdict, swatches, findings, counts };
}
