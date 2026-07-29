# Default chart palettes under colour vision deficiency

**Every mainstream categorical palette tested has pairs that colourblind readers
cannot reliably tell apart. The most widely used one fails at three series.**

Measured 29 July 2026. Everything here is reproducible in about a minute —
instructions at the bottom.

---

## The headline

Charting libraries hand out colours in order. A three-series chart gets colours
1, 2 and 3. So the question that matters is not *"does this 10-colour palette
have a bad pair somewhere"* — it is **"how many series before something breaks?"**

| Palette | Breaks at | The pair |
|---|---|---|
| **d3 `schemeCategory10`** | **3 series** | `#ff7f0e` orange vs `#2ca02c` green — ΔE 4.69 under protanopia |
| **Chart.js defaults** | **4 series** | `#ff9f40` vs `#ffcd56` — ΔE 7.57 under deuteranopia |
| **d3 `schemeTableau10`** | **5 series** | `#e15759` red vs `#59a14f` green — ΔE 2.26 under deuteranopia |
| **d3 `schemeObservable10`** | **5 series** | `#e15759`-adjacent pair — ΔE 6.01 under protanopia |
| Wong (reference) | **never** | — |

`schemeCategory10` is the default categorical scheme in d3 and, downstream, in a
large share of the dataviz ecosystem. **Three bars on a chart is enough.**

## Full results

Distances are CIEDE2000 between colours *as simulated under each condition*.
Higher is easier to tell apart.

Each pair is checked under three conditions, so one bad pair can produce up to
three findings. **Distinct failing pairs** is the honest number; it is given
alongside the total so nothing is inflated.

| Palette | n | Failing pairs | of total pairs | Worst pair |
|---|---|---|---|---|
| Wong (reference) | 8 | **0** | 28 | 12.19 (deuteranopia) |
| d3 `schemeCategory10` | 10 | **8** | 45 | **2.84** (protanopia) |
| d3 `schemeTableau10` | 10 | **12** | 45 | **1.12** (protanopia) |
| d3 `schemeObservable10` | 10 | **9** | 45 | **3.84** (deuteranopia) |
| Chart.js defaults | 7 | **3** | 21 | **3.05** (deuteranopia) |

So roughly **a quarter of all colour pairs** in `schemeTableau10` are ones a
colourblind reader cannot reliably separate.

The single closest pair found anywhere: **`schemeTableau10` `#ff9da7` against
`#bab0ab`, ΔE 1.12 under protanopia.** They simulate to `#aeaea7` and `#b2b2ab`.
For practical purposes that is the same colour.

Some other pairs worth naming, because they are the ones that carry meaning:

- `schemeTableau10` — red `#e15759` vs green `#59a14f`, **ΔE 2.26** under
  deuteranopia. Red and green. The canonical case.
- `schemeCategory10` — blue `#1f77b4` vs purple `#9467bd`, **ΔE 2.84** under
  protanopia.
- Chart.js — blue `#36a2eb` vs purple `#9966ff`, **ΔE 3.05** under deuteranopia.

## Does this survive scrutiny?

Three obvious objections, tested rather than argued.

### "Wong passes because Wong sets the threshold"

True, and a fair hit. paletteguard derives its floor from the Wong palette, so
Wong passing is partly circular.

**So ignore the thresholds entirely** and read the raw minimum distances:

| Palette | Min distance (full) | Min distance (first 8) |
|---|---|---|
| Wong | **12.19** | **12.19** |
| `schemeCategory10` | 2.84 | 2.84 |
| `schemeTableau10` | 1.12 | 2.26 |
| `schemeObservable10` | 3.84 | 3.32 |
| Chart.js | 3.05 | 3.05 |

A **3× to 10× gap**, with no threshold involved. Put the line anywhere
reasonable and the ordering does not change.

### "Wong has 8 colours, the d3 schemes have 10 — more pairs is harder"

Also fair. Truncating everything to its first 8, so every palette is judged on
the same 28 pairs:

| Palette | fail findings | warn | Min distance |
|---|---|---|---|
| Wong | **0** | **0** | 12.19 |
| `schemeCategory10` | 6 | 5 | 2.84 |
| `schemeTableau10` | 7 | 4 | 2.26 |
| `schemeObservable10` | 5 | 4 | 3.32 |
| Chart.js (7 colours) | 3 | 4 | 3.05 |

Unchanged. It is not a size artefact.

### "Wong is a CVD-optimised palette — that is an unfair bar"

**This one I cannot fully rebut, and it is the strongest objection here.**

Wong was designed for scientific figures where distinguishability outranks
everything. `schemeTableau10` and friends balance distinguishability against
aesthetics, brand fit and legibility for normal vision. Holding the second group
to the first group's standard is a **value judgement, not a measurement**, and
the word "fail" in this document carries that judgement.

What survives regardless of where the bar sits: a pair at **ΔE 1.12** is not
marginally short of a strict standard, it is the same colour. The same goes for
red against green at 2.26. Those are bad under any threshold anyone would defend.

Read the strict verdicts as *"this palette is not CVD-safe by the standard of a
palette built to be CVD-safe"* — which is true, useful, and narrower than
"this palette is bad".

### "Maybe these are marginal failures"

The worst pair in each palette, as a percentage of the distance it would need:

| Palette | Worst pair |
|---|---|
| Wong | 100% |
| `schemeObservable10` | **32%** |
| Chart.js | **25%** |
| `schemeCategory10` | **21%** |
| `schemeTableau10` | **8%** |

A failure at 95% of the floor would be arguable. These are at 8–32%.

## Honest limitations

**The simulation models complete dichromacy.** Protanopia, deuteranopia and
tritanopia are the severe forms. The commoner conditions — protanomaly and
deuteranomaly — are *anomalous trichromacy*, which is milder. **These results are
a worst case**, not what every colourblind reader experiences.

That does not make them academic: dichromacy affects a real and substantial
population, and a palette that collapses for them is still a palette that
collapses.

**A failing pair is not automatically a broken chart.** If series are directly
labelled, patterned, or separated by position, colour is no longer carrying the
information alone — which is exactly what WCAG 1.4.1 asks for. This audit
measures the colours, not the whole chart.

**None of this is a criticism of the maintainers.** These palettes were chosen
for balance, aesthetics and legibility, mostly before automated CVD checking was
practical. `schemeCategory10` dates back to the origins of the ecosystem. The
point is not that anyone was careless — it is that **this failure mode is
invisible without computing it**, which is the entire argument for checking it
in a build rather than by eye.

## Reproduce it

```bash
npm install d3-scale-chromatic
npx paletteguard --thresholds   # see the derived floors

# the three-series failure, directly
echo '["#1f77b4","#ff7f0e","#2ca02c"]' | npx paletteguard
```

Palette values were read from the published packages
(`d3-scale-chromatic`, `chart.js` v4 `dist/chart.js` `BORDER_COLORS`), not
transcribed by hand.

ECharts was excluded: v6 does not ship its default palette as a literal array,
and guessing at it would have been worse than omitting it.

## If you maintain one of these

The check is one line, and the tool exists:

```bash
npx paletteguard your-palette.json
```

Issues and fixes welcome. If a suggested replacement palette would help, that is
a reasonable thing to ask for.
