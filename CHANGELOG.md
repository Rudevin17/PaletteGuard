# Changelog

## 0.1.0 — unreleased

First release.

- Checks every pair in a categorical palette under protanopia, deuteranopia and
  tritanopia, using CIEDE2000 distance on simulated colours.
- Pass floors are **derived at load** from the Wong palette (*Nature Methods*,
  2011) rather than hardcoded, so they cannot drift out of step with the
  simulation model. Floors differ per condition: Wong is weakest under
  tritanopia, which is also the rarest deficiency.
- Three-band verdicts — `pass` / `warn` / `fail`. Only `fail` exits non-zero.
- Input as JSON array, JSON object, CSS custom properties, or bare hex, from a
  file or stdin. UTF-8 BOMs are tolerated.
- `--prefix` narrows a stylesheet to one palette, with a warning when a whole
  file is scanned unfiltered — a stylesheet is not a categorical palette, and
  scanning everything manufactures failures that are not real.
- `--json` for pipelines, `--thresholds` to print the derived floors,
  `--verbose`, `--no-color`.
- Importable core, so a larger linter can depend on this rather than reimplement
  it.
- Terminal output never signals status by colour alone.
- `docs/audit.md` — every mainstream charting default tested; d3
  `schemeCategory10` fails at three series.
