import { simulate } from "@bjornlu/colorblind";

/**
 * The three dichromacies. Achromatopsia is deliberately excluded from v1 — it is
 * vanishingly rare and collapses every hue, so it would fail almost any palette
 * and drown the useful signal.
 */
export type Condition = "protanopia" | "deuteranopia" | "tritanopia";

export const CONDITIONS: Condition[] = [
  "protanopia",
  "deuteranopia",
  "tritanopia",
];

/**
 * Roughly how much of the population each condition affects. Used to order
 * output and to mark rare conditions, never to suppress them: a failure is a
 * failure, but a red-green failure affects far more readers than a blue-yellow
 * one and should be read first.
 *
 * Red-green deficiency (protan + deutan) is ~99% of all cases.
 */
export const PREVALENCE: Record<Condition, { label: string; rare: boolean }> = {
  deuteranopia: { label: "green-blind", rare: false },
  protanopia: { label: "red-blind", rare: false },
  tritanopia: { label: "blue-blind", rare: true },
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalises `abc`, `#abc`, `aabbcc`, `#AABBCC` to `#aabbcc`. */
export function normaliseHex(input: string): string {
  const raw = input.trim();
  if (!HEX.test(raw)) throw new Error(`Not a hex colour: "${input}"`);
  let body = raw.replace("#", "").toLowerCase();
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  return `#${body}`;
}

function toRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

/** How `hex` appears to someone with `condition`. */
export function seenAs(hex: string, condition: Condition): string {
  return toHex(simulate(toRgb(hex), condition));
}
