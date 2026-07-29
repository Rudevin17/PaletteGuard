import type { Swatch } from "./check.js";
import { normaliseHex } from "./vision.js";

const HEX_ANYWHERE = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const CSS_CUSTOM_PROP = /--([\w-]+)\s*:\s*(#(?:[0-9a-f]{3}|[0-9a-f]{6}))\b/gi;

/**
 * Accepts the shapes people already have, rather than asking anyone to write a
 * new file format:
 *
 *   ["#e69f00", "#56b4e9"]                  → positional names
 *   { "revenue": "#e69f00", ... }           → named, and far better output
 *   --chart-1: #e69f00;                     → CSS custom properties
 *   #e69f00 #56b4e9                         → bare hex, whitespace separated
 *
 * Named input is strongly preferred: "revenue and expenses are indistinguishable"
 * is actionable in a way that "#e69f00 and #56b4e9" is not.
 */
export interface ParseOptions {
  /**
   * Only keep CSS custom properties whose name contains this string.
   *
   * This matters more than it looks. A stylesheet is *not* a categorical
   * palette: `--surface-raised` and `--surface-overlay` are meant to be nearly
   * identical, and so are `--accent` and `--accent-hover`. Comparing every
   * custom property against every other reproduces exactly the false-positive
   * problem that made a general design-token checker unworkable. The prefix is
   * how the caller says "these specific colours form one palette".
   */
  prefix?: string;
}

/** Set when a whole stylesheet was scanned without a prefix to narrow it. */
export interface ParseResult {
  swatches: Swatch[];
  unfiltered: boolean;
}

export function parsePalette(raw: string, opts: ParseOptions = {}): Swatch[] {
  return parsePaletteDetailed(raw, opts).swatches;
}

export function parsePaletteDetailed(
  raw: string,
  opts: ParseOptions = {},
): ParseResult {
  // Strip a UTF-8 BOM before anything else. Windows editors and PowerShell
  // redirection both write one by default, and it would otherwise sink
  // JSON.parse for the people most likely to be running this on a theme file.
  const text = raw.replace(/^﻿/, "").trim();
  if (!text) throw new Error("No input. Pass a file, or pipe colours on stdin.");

  const json = tryJson(text);
  if (json) return { swatches: canonical(json), unfiltered: false };

  const css = [...text.matchAll(CSS_CUSTOM_PROP)];
  if (css.length > 0) {
    const all = css.map((m) => ({ name: m[1], hex: m[2] }));
    const kept = opts.prefix
      ? all.filter((s) => s.name.includes(opts.prefix!))
      : all;

    if (kept.length === 0) {
      throw new Error(
        `No custom properties matched "${opts.prefix}". ` +
          `Found: ${all.map((s) => `--${s.name}`).join(", ")}`,
      );
    }

    return { swatches: canonical(kept), unfiltered: !opts.prefix };
  }

  const bare = [...text.matchAll(HEX_ANYWHERE)];
  if (bare.length > 0) {
    return {
      swatches: canonical(
        bare.map((m, i) => ({ name: `colour ${i + 1}`, hex: m[0] })),
      ),
      unfiltered: false,
    };
  }

  throw new Error("Found no colours in the input.");
}

/** Every parser path returns canonical `#rrggbb`, so callers never have to. */
function canonical(swatches: Swatch[]): Swatch[] {
  return swatches.map((s) => ({ name: s.name, hex: normaliseHex(s.hex) }));
}

function tryJson(text: string): Swatch[] | null {
  if (!/^[[{]/.test(text)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    const out: Swatch[] = [];
    parsed.forEach((entry, i) => {
      if (typeof entry === "string") {
        out.push({ name: `colour ${i + 1}`, hex: entry });
      } else if (isRecord(entry)) {
        // e.g. [{ name: "revenue", color: "#e69f00" }]
        const hex = pickString(entry, ["hex", "color", "colour", "value"]);
        const name = pickString(entry, ["name", "label", "key", "id"]);
        if (hex) out.push({ name: name ?? `colour ${i + 1}`, hex });
      }
    });
    if (out.length) return out;
    return null;
  }

  if (isRecord(parsed)) {
    const out: Swatch[] = [];
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === "string" && /^#?[0-9a-f]{3,6}$/i.test(value.trim())) {
        out.push({ name, hex: value });
      }
    }
    if (out.length) return out;
  }

  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}
