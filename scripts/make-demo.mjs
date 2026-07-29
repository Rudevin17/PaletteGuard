/**
 * Generates docs/demo.svg — the same chart twice, as normal vision sees it and
 * as a reader with deuteranopia does.
 *
 * The simulated colours are computed by the library, not chosen by eye. That is
 * the whole point: if this image were hand-tinted it would be an illustration,
 * and what makes it worth showing is that it is a measurement.
 *
 *   node scripts/make-demo.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { seenAs } from "../dist/vision.js";
import { distance } from "../dist/thresholds.js";

// d3 schemeCategory10, first three — what a three-series chart gets by default.
const SERIES = [
  { name: "Revenue", hex: "#1f77b4" },
  { name: "Costs", hex: "#ff7f0e" },
  { name: "Profit", hex: "#2ca02c" },
];

// Protanopia, specifically. Under deuteranopia these same three colours measure
// ΔE 17.62 and pass comfortably — the three-series failure is a protan one. Any
// hand-picked condition here would have illustrated the wrong thing.
const CONDITION = "protanopia";
const VALUES = [
  [42, 58, 71, 65, 84, 96],
  [38, 51, 63, 60, 74, 82],
  [30, 44, 55, 49, 68, 79],
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const W = 380;
const H = 210;
const PAD = { t: 38, r: 14, b: 28, l: 34 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;
const MAX = 100;

const x = (i) => PAD.l + (plotW / (MONTHS.length - 1)) * i;
const y = (v) => PAD.t + plotH - (v / MAX) * plotH;

function panel(title, colours, note) {
  const lines = VALUES.map((row, s) => {
    const d = row.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
    return `<path d="${d}" fill="none" stroke="${colours[s]}" stroke-width="2.6"
      stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("\n      ");

  const dots = VALUES.map((row, s) =>
    row.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${colours[s]}"/>`).join(""),
  ).join("");

  const legend = SERIES.map((s, i) => {
    const lx = PAD.l + i * 92;
    return `<rect x="${lx}" y="${H - 14}" width="9" height="9" rx="2" fill="${colours[i]}"/>
      <text x="${lx + 14}" y="${H - 6}" class="lg">${s.name}</text>`;
  }).join("\n      ");

  const grid = [0, 25, 50, 75, 100]
    .map((v) => `<line x1="${PAD.l}" y1="${y(v)}" x2="${W - PAD.r}" y2="${y(v)}" class="grid"/>`)
    .join("");

  return `<g>
      <text x="${PAD.l}" y="18" class="ti">${title}</text>
      <text x="${PAD.l}" y="31" class="su">${note}</text>
      ${grid}
      ${lines}
      ${dots}
      ${legend}
    </g>`;
}

const normal = SERIES.map((s) => s.hex);
const simulated = SERIES.map((s) => seenAs(s.hex, CONDITION));

const dCosts = distance(simulated[1], simulated[2]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2 + 24}" height="${H + 34}"
  viewBox="0 0 ${W * 2 + 24} ${H + 34}" role="img"
  aria-label="The same three-series chart shown twice: as normal vision sees it, and as a reader with protanopia does, where the Costs and Profit lines become nearly identical.">
  <style>
    text { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .ti { font-size: 13px; font-weight: 600; fill: #111827; }
    .su { font-size: 10px; fill: #6b7280; }
    .lg { font-size: 10px; fill: #374151; }
    .grid { stroke: #e5e7eb; stroke-width: 1; }
    .cap { font-size: 11px; fill: #374151; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; fill: #6b7280; }
    @media (prefers-color-scheme: dark) {
      .ti { fill: #f3f4f6; } .su, .mono { fill: #9ca3af; }
      .lg, .cap { fill: #d1d5db; } .grid { stroke: #374151; }
    }
  </style>
  ${panel("Normal vision", normal, "d3 schemeCategory10 — the default")}
  <g transform="translate(${W + 24},0)">
    ${panel("Protanopia", simulated, "the same chart, ~1 in 12 men")}
  </g>
  <text x="0" y="${H + 28}" class="cap">
    Costs and Profit measure ΔE ${dCosts.toFixed(2)} apart under protanopia — 13.38 is needed. Three series is enough.
  </text>
</svg>
`;

mkdirSync(new URL("../docs", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/demo.svg", import.meta.url), svg);

console.log("wrote docs/demo.svg");
console.log(`  normal    : ${normal.join("  ")}`);
console.log(`  simulated : ${simulated.join("  ")}`);
console.log(`  Costs vs Profit under ${CONDITION}: ΔE ${dCosts.toFixed(2)}`);
