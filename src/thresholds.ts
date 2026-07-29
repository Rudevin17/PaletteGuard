import { differenceCiede2000 } from "culori";
import { CONDITIONS, seenAs, type Condition } from "./vision.js";

const ciede2000 = differenceCiede2000();

/** Perceptual distance between two hex colours, CIEDE2000. Range ~0–100. */
export function distance(a: string, b: string): number {
  return ciede2000(a, b);
}

/**
 * Bang Wong, "Points of view: Color blindness", Nature Methods 8, 441 (2011).
 * Published specifically as a categorical palette that survives colour vision
 * deficiency, which is what makes it usable as a calibration reference rather
 * than just another nice palette.
 */
export const WONG: readonly string[] = [
  "#000000", // black
  "#e69f00", // orange
  "#56b4e9", // sky blue
  "#009e73", // bluish green
  "#f0e442", // yellow
  "#0072b2", // blue
  "#d55e00", // vermillion
  "#cc79a7", // reddish purple
];

/**
 * The smallest gap between any two Wong colours, per condition. This is the
 * whole basis for the thresholds: rather than inventing a number, we measure
 * what a palette the field already accepts as safe actually achieves, and hold
 * everything else to that same bar.
 *
 * Computed at load — 28 pairs across 3 conditions is trivial, and deriving it
 * means the figure can never drift out of step with the simulation model.
 */
export function referenceFloors(): Record<Condition, number> {
  const floors = {} as Record<Condition, number>;
  for (const condition of CONDITIONS) {
    let min = Infinity;
    for (let i = 0; i < WONG.length; i++) {
      for (let j = i + 1; j < WONG.length; j++) {
        const d = distance(
          seenAs(WONG[i], condition),
          seenAs(WONG[j], condition),
        );
        if (d < min) min = d;
      }
    }
    floors[condition] = min;
  }
  return floors;
}

export const PASS_FLOOR: Record<Condition, number> = referenceFloors();

/**
 * Below this fraction of the reference floor, two colours are not merely
 * "tighter than ideal" — they are genuinely hard to tell apart.
 *
 * 0.75 is a judgement call, and the only one in the tool. It is set here so it
 * is visible and arguable rather than buried: at this value the three known-bad
 * pairs in the test fixtures fail, and the reference palette itself passes every
 * condition by construction. Anything between roughly 0.7 and 0.8 behaves the
 * same way on the fixtures we have.
 */
export const FAIL_RATIO = 0.75;

export const FAIL_FLOOR: Record<Condition, number> = Object.fromEntries(
  CONDITIONS.map((c) => [c, PASS_FLOOR[c] * FAIL_RATIO]),
) as Record<Condition, number>;

export type Verdict = "pass" | "warn" | "fail";

export function verdictFor(d: number, condition: Condition): Verdict {
  if (d < FAIL_FLOOR[condition]) return "fail";
  if (d < PASS_FLOOR[condition]) return "warn";
  return "pass";
}
