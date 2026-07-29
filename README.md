# paletteguard

**Find chart colours your colourblind users can't tell apart. In CI, before they ship.**

Your revenue line is green. Your expenses line is amber. It looks fine.

To roughly **1 in 12 men**, those two lines are the same colour.

You will never get a bug report about it. People squint, guess, misread the
chart, and quietly trust your product a little less.

```
$ npx paletteguard chart-colors.json

  paletteguard — 4 colours, 18 comparisons

  ✗ FAIL  accent vs danger
         deuteranopia (green-blind)
         seen as #a7a788 · #9b9b5d
         distance 8.96  ·  needs 12.19

  ✗ FAIL  accent vs amber
         protanopia (red-blind)
         seen as #c1c185 · #bbbb41
         distance 9.87  ·  needs 13.38

  ────────────────────────────────────────────
  2 fail · 1 warn · 15 pass
```

Exit code `1`. The build stops.

## This is not a hypothetical

I pointed it at the default palettes shipped by the major charting libraries.
**Every one of them has pairs colourblind readers cannot reliably distinguish.**

| Palette | Breaks at |
|---|---|
| d3 `schemeCategory10` | **3 series** |
| Chart.js defaults | **4 series** |
| d3 `schemeTableau10` | **5 series** |
| d3 `schemeObservable10` | **5 series** |

Three bars on a chart is enough to hit it with d3's default scheme. Try it:

```bash
echo '["#1f77b4","#ff7f0e","#2ca02c"]' | npx paletteguard
```

**[Full audit, with controls and limitations →](docs/audit.md)**

## Why this exists

I built an app, cared about accessibility, did the contrast maths, and shipped a
dashboard where **success-green and error-red are nearly identical** to the most
common form of colourblindness. Two people looked at it. Neither saw anything
wrong — because you can't. You have to compute it.

Every existing colourblindness tool is a web page you paste colours into. That
only helps when a human remembers to check. This is a build step, so it catches
the problem when nobody remembers.

## Install

```bash
npx paletteguard palette.json     # no install
npm install -D paletteguard       # or keep it around
```

## Input

Whatever shape you already have:

```bash
paletteguard palette.json                  # ["#e69f00", "#56b4e9"]
paletteguard palette.json                  # { "revenue": "#e69f00", ... }
paletteguard theme.css --prefix chart      # --chart-1: #e69f00;
echo '["#e69f00","#56b4e9"]' | paletteguard
```

**Name your colours if you can.** `revenue and expenses are indistinguishable`
is actionable; `#e69f00 and #56b4e9 are indistinguishable` is a puzzle.

### One palette, not a whole stylesheet

Give it the colours that identify **series in a chart**.

A stylesheet is not a categorical palette — `--surface-raised` and
`--surface-overlay` are *meant* to look alike, and so are `--accent` and
`--accent-hover`. Comparing everything against everything reports failures that
aren't real. Narrow it with `--prefix chart`.

## How the threshold is set

Not invented. **Measured.**

[Bang Wong's palette](https://www.nature.com/articles/nmeth.1618) (*Nature
Methods*, 2011) was published specifically as a categorical palette that survives
colour vision deficiency. paletteguard computes the smallest gap Wong itself
achieves under each condition, and holds your palette to that same bar:

```
$ npx paletteguard --thresholds

  condition       fail below    pass at or above
  ────────────────────────────────────────────────
  protanopia          10.04               13.38
  deuteranopia         9.14               12.19
  tritanopia           7.34                9.79
```

Distances are **CIEDE2000**. The pass floor is derived at runtime, so it can
never drift out of step with the simulation model. The fail floor is 0.75 of it —
the one judgement call in the tool, deliberately kept visible.

Note the floors differ per condition. A single flat threshold would be wrong:
Wong is weakest under tritanopia, which is also by far the rarest condition.
Red-green deficiency is ~99% of cases and is scored more strictly.

## Options

| Flag | |
|---|---|
| `--prefix <s>` | only CSS custom properties whose name contains `<s>` |
| `--json` | machine-readable output |
| `--verbose` | show passing pairs too |
| `--no-color` | disable terminal colour |
| `--thresholds` | print the calibrated floors and exit |

**Exit codes:** `0` pass or warn · `1` something failed · `2` bad input

## GitHub Actions

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npx paletteguard src/theme.css --prefix chart
```

## As a library

```ts
import { checkPalette } from "paletteguard";

const report = checkPalette([
  { name: "revenue", hex: "#3ddc84" },
  { name: "expenses", hex: "#ff6961" },
]);

report.verdict; // "fail"
report.findings[0].distance; // 8.96
```

The check is importable on purpose. If a larger linter wants this capability,
depending on this module should be the easiest path available.

## What this does not do

- **It does not check WCAG contrast.** That is a different failure mode and it is
  well covered by existing tools. This checks *distinguishability*.
- **It does not claim WCAG compliance.** WCAG 1.4.1 requires that colour is not
  the *only* means of conveying information — its remedy is labels and patterns,
  not merely better colours. Fixing your palette is necessary, not sufficient.
- **It does not suggest replacement colours.** Generating accessible palettes is
  a harder problem and other tools already do it.

## Prior art

- [`@bjornlu/colorblind`](https://github.com/bluwy/colorblind) — the CVD
  simulation this is built on
- [`colorblindcheck`](https://jakubnowosad.com/colorblindcheck/) — the same idea
  in R, and the closest thing that existed before this
- [Viz Palette](https://projects.susielu.com/viz-palette), Color Oracle — good
  interactive checkers, but only when a human remembers to open them

## Licence

MIT
