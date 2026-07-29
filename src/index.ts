/**
 * Library entry point.
 *
 * The check is deliberately importable rather than locked inside the CLI: if a
 * larger linter wants this capability, depending on this module should be the
 * easiest path available.
 */
export { checkPalette } from "./check.js";
export type { Swatch, Finding, Report } from "./check.js";

export { parsePalette } from "./parse.js";
export { render, renderJson } from "./report.js";
export type { RenderOptions } from "./report.js";

export {
  distance,
  referenceFloors,
  verdictFor,
  PASS_FLOOR,
  FAIL_FLOOR,
  FAIL_RATIO,
  WONG,
} from "./thresholds.js";
export type { Verdict } from "./thresholds.js";

export {
  seenAs,
  normaliseHex,
  CONDITIONS,
  PREVALENCE,
} from "./vision.js";
export type { Condition } from "./vision.js";
