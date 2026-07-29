#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkPalette } from "./check.js";
import { parsePaletteDetailed } from "./parse.js";
import { render, renderJson } from "./report.js";
import { PASS_FLOOR, FAIL_FLOOR, FAIL_RATIO } from "./thresholds.js";
import { CONDITIONS } from "./vision.js";

const HELP = `
  paletteguard — find chart colours your colourblind users can't tell apart

  Usage
    paletteguard <file>
    cat palette.json | paletteguard

  Options
    --prefix <s>  only CSS custom properties whose name contains <s>
    --json        machine-readable output
    --verbose     show passing pairs too
    --no-color    disable terminal colour
    --thresholds  print the calibrated floors and exit
    --help        this

  Input
    JSON array    ["#e69f00", "#56b4e9"]
    JSON object   { "revenue": "#e69f00", "costs": "#56b4e9" }
    CSS           --chart-1: #e69f00;
    bare hex      #e69f00 #56b4e9

  Note
    Give it one categorical palette — the colours that identify series in a
    chart. A whole stylesheet is not a palette: surfaces and hover states are
    meant to look alike, so scanning everything reports failures that are not
    real. Narrow a stylesheet with --prefix chart.

  Exit codes
    0  pass or warn
    1  at least one pair failed
    2  bad input
`;

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function showThresholds(): void {
  const out: string[] = ["", "  Calibrated from the Wong palette (Nature Methods, 2011).", ""];
  out.push("  condition       fail below    pass at or above");
  out.push("  " + "─".repeat(48));
  for (const c of CONDITIONS) {
    out.push(
      `  ${c.padEnd(16)}${FAIL_FLOOR[c].toFixed(2).padStart(9)}` +
        `${PASS_FLOOR[c].toFixed(2).padStart(20)}`,
    );
  }
  out.push("");
  out.push(`  Pass floor is the smallest gap the Wong palette itself achieves.`);
  out.push(`  Fail floor is ${FAIL_RATIO} of that. Distances are CIEDE2000.`);
  out.push("");
  console.log(out.join("\n"));
}

function main(): number {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    return 0;
  }

  if (argv.includes("--thresholds")) {
    showThresholds();
    return 0;
  }

  const asJson = argv.includes("--json");
  const verbose = argv.includes("--verbose");
  const colour =
    !argv.includes("--no-color") && !process.env.NO_COLOR && process.stdout.isTTY;

  const prefixAt = argv.indexOf("--prefix");
  const prefix = prefixAt >= 0 ? argv[prefixAt + 1] : undefined;
  if (prefixAt >= 0 && (!prefix || prefix.startsWith("-"))) {
    console.error("  --prefix needs a value, e.g. --prefix chart");
    return 2;
  }

  // The prefix *value* is a bare word too, so it must not be mistaken for the
  // input path. Guard on prefixAt >= 0 — otherwise -1 + 1 excludes argv[0].
  const file = argv.find(
    (a, i) => !a.startsWith("-") && !(prefixAt >= 0 && i === prefixAt + 1),
  );

  let raw: string;
  try {
    raw = file ? readFileSync(file, "utf8") : readStdin();
  } catch (err) {
    console.error(`  Could not read ${file}: ${(err as Error).message}`);
    return 2;
  }

  let report;
  let unfiltered = false;
  try {
    const parsed = parsePaletteDetailed(raw, { prefix });
    unfiltered = parsed.unfiltered;
    report = checkPalette(parsed.swatches);
  } catch (err) {
    console.error(`  ${(err as Error).message}`);
    if (!file && !raw.trim()) console.error(HELP);
    return 2;
  }

  if (unfiltered && !asJson) {
    console.error(
      `  Note: read all ${report.swatches.length} custom properties in this file.\n` +
        `  A stylesheet is not a categorical palette — surfaces and hover states\n` +
        `  are meant to look alike. Narrow it with --prefix chart.\n`,
    );
  }

  console.log(asJson ? renderJson(report) : render(report, { colour, verbose }));

  return report.verdict === "fail" ? 1 : 0;
}

process.exit(main());
