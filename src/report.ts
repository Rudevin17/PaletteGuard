import { PREVALENCE } from "./vision.js";
import type { Finding, Report } from "./check.js";
import type { Verdict } from "./thresholds.js";

/**
 * All terminal styling goes through here so that `--no-color` (and any
 * non-TTY pipe) produces genuinely clean text, not text with the escape codes
 * half-stripped.
 */
interface Style {
  dim: (s: string) => string;
  bold: (s: string) => string;
  /**
   * A solid block in the given colour. Purely decorative — every status is also
   * carried by a symbol and a word, because a tool about colour-blind readers
   * that signalled pass/fail with red and green would deserve everything it got.
   */
  swatch: (hex: string) => string;
  /** Trailing space after a swatch, only when swatches are actually drawn. */
  gap: string;
}

const plain: Style = {
  dim: (s) => s,
  bold: (s) => s,
  swatch: () => "",
  gap: "",
};

const fancy: Style = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  swatch: (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`;
  },
  gap: " ",
};

const styleFor = (colour: boolean): Style => (colour ? fancy : plain);

const MARK: Record<Verdict, string> = {
  fail: "✗ FAIL",
  warn: "! WARN",
  pass: "✓ pass",
};

function describe(f: Finding, s: Style): string[] {
  const { label, rare } = PREVALENCE[f.condition];

  const head =
    `  ${MARK[f.verdict]}  ` +
    `${s.swatch(f.a.hex)}${s.gap}${f.a.name} ` +
    `${s.dim("vs")} ` +
    `${s.swatch(f.b.hex)}${s.gap}${f.b.name}`;

  const cond =
    `         ${f.condition} (${label})` + (rare ? ` ${s.dim("— rare")}` : "");

  const seen =
    `         ${s.dim("seen as")} ` +
    `${s.swatch(f.seen.a)}${s.gap}${f.seen.a} ${s.dim("·")} ` +
    `${s.swatch(f.seen.b)}${s.gap}${f.seen.b}`;

  const nums =
    `         ${s.dim("distance")} ${s.bold(f.distance.toFixed(2))}` +
    `  ${s.dim(`·  needs ${f.passFloor.toFixed(2)}`)}`;

  return [head, cond, seen, nums, ""];
}

export interface RenderOptions {
  colour: boolean;
  /** Show passing pairs too, not just problems. */
  verbose: boolean;
}

export function render(report: Report, opts: RenderOptions): string {
  const { swatches, findings, counts, verdict } = report;
  const s = styleFor(opts.colour);
  const lines: string[] = [];

  lines.push("");
  lines.push(
    `  ${s.bold("paletteguard")} ` +
      s.dim(`— ${swatches.length} colours, ${findings.length} comparisons`),
  );
  lines.push("");
  lines.push(
    "  " +
      swatches.map((c) => `${s.swatch(c.hex)}${s.gap}${c.name}`).join("   "),
  );
  lines.push("");

  const shown = opts.verbose
    ? findings
    : findings.filter((f) => f.verdict !== "pass");

  if (shown.length === 0) {
    lines.push(`  ${MARK.pass}  every pair is distinguishable under all three`);
    lines.push("          conditions checked.");
    lines.push("");
  } else {
    for (const f of shown) lines.push(...describe(f, s));
  }

  lines.push(`  ${s.dim("─".repeat(56))}`);
  lines.push(
    `  ${counts.fail} fail ${s.dim("·")} ${counts.warn} warn ` +
      `${s.dim("·")} ${counts.pass} pass` +
      (opts.verbose || shown.length === 0
        ? ""
        : `   ${s.dim("(--verbose to see all)")}`),
  );

  if (verdict === "fail") {
    lines.push("");
    lines.push(
      s.dim(
        "  Colours below the floor are hard to tell apart for readers with",
      ),
    );
    lines.push(
      s.dim("  that condition. Red-green deficiency affects ~1 in 12 men."),
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function renderJson(report: Report): string {
  return JSON.stringify(
    {
      verdict: report.verdict,
      counts: report.counts,
      palette: report.swatches,
      findings: report.findings.map((f) => ({
        a: f.a,
        b: f.b,
        condition: f.condition,
        distance: Number(f.distance.toFixed(4)),
        seen: f.seen,
        verdict: f.verdict,
        passFloor: Number(f.passFloor.toFixed(4)),
        failFloor: Number(f.failFloor.toFixed(4)),
      })),
    },
    null,
    2,
  );
}
