import { describe, it, expect } from 'vitest';
import { getLabelColors } from './label-colors';

describe('getLabelColors', () => {
  it('is deterministic for the same label', () => {
    expect(getLabelColors('backend')).toEqual(getLabelColors('backend'));
  });

  it('matches Dockhand\u2019s own hash for known labels, so colors agree with Dockhand\u2019s UI', () => {
    // Palette positions computed directly from Dockhand's hashString()/LABEL_COLORS
    // (label-colors.ts) rather than asserted against this port's own
    // output -- a hash that's merely internally consistent but disagrees
    // with Dockhand would defeat the point of porting it at all.
    expect(getLabelColors('backend').color).toContain('var(--dockhand-label-9-color)'); // cyan
    expect(getLabelColors('frontend').color).toContain('var(--dockhand-label-7-color)'); // violet
    expect(getLabelColors('critical').color).toContain('var(--dockhand-label-12-color)'); // fuchsia
  });

  it('pairs each color with its matching background at the same palette index', () => {
    expect(getLabelColors('backend')).toEqual({
      color: 'color-mix(in srgb, var(--dockhand-label-9-color) 50%, var(--primary-text-color))',
      bgColor: 'rgb(from var(--dockhand-label-9-color) r g b / 0.15)'
    });
  });

  it('differs across different labels (not a constant fallback)', () => {
    expect(getLabelColors('backend').color).not.toBe(getLabelColors('frontend').color);
  });

  it('handles the empty string without throwing', () => {
    expect(() => getLabelColors('')).not.toThrow();
  });
});
