/**
 * Environment label colors — ported from Dockhand's own
 * `src/lib/utils/label-colors.ts` (`hashString` + `LABEL_COLORS`/
 * `LABEL_BG_COLORS`) so a label renders with the same color here as it does
 * in Dockhand's own UI, rather than a plain neutral pill.
 *
 * Dockhand also supports a per-label custom-color override
 * (`customColors: Record<string, string>`), but that mapping isn't exposed
 * by any ha-dockhand entity — only the plain `labels` array attribute is —
 * so this only reproduces the deterministic hash-based default. If a label
 * has a custom color set in Dockhand, this card has no way to know that and
 * will still show the hashed color.
 */

/** How many label colors Dockhand cycles through. The colors themselves
 * are the `--dockhand-label-1-color` … `--dockhand-label-12-color` custom
 * properties (environment card styles.ts), defaulting to Dockhand's own
 * palette in Dockhand's order: red, orange, yellow, green, teal, blue,
 * violet, pink, cyan, lime, indigo, fuchsia. */
export const LABEL_COLOR_COUNT = 12;

/** Same hash Dockhand uses (a 32-bit string hash, absolute value) — must
 * match exactly, not just be "a" hash, or colors would disagree with
 * Dockhand's own UI for the same label. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/** The label's color for its text and background, as CSS values. The text
 * is the color mixed halfway toward the theme's text color so it's readable
 * on the pill (the palette is Dockhand's, not Home Assistant's); the
 * background is the color at 15%, as in Dockhand. */
export function getLabelColors(label: string): { color: string; bgColor: string } {
  const property = `--dockhand-label-${(hashString(label) % LABEL_COLOR_COUNT) + 1}-color`;
  return {
    color: `color-mix(in srgb, var(${property}) 50%, var(--primary-text-color))`,
    bgColor: `rgb(from var(${property}) r g b / 0.15)`
  };
}
