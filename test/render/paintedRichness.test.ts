/**
 * Yields on the board (`src/render3d/paintedRichness.ts`, `docs/flags.md` item
 * (nnnnnnn), "Yields on the board"): how a hex's yield becomes a step of
 * richness and a kind of scenery.
 */
import { describe, expect, it } from 'vitest';

import { VIEW3D } from '../../src/render3d/lookData';
import { richestKind, richnessStep } from '../../src/render3d/paintedRichness';

describe('richness steps', () => {
  it('counts the steps a yield reaches', () => {
    expect(richnessStep(1, [2, 3, 4])).toBe(0);
    expect(richnessStep(2, [2, 3, 4])).toBe(1);
    expect(richnessStep(3.5, [2, 3, 4])).toBe(2);
    expect(richnessStep(9, [2, 3, 4])).toBe(3);
  });

  it('gives a poor hex nothing', () => {
    expect(richestKind({ food: 0, production: 0, gold: 0 })).toBeNull();
  });

  it('picks the kind with the highest step', () => {
    const steps = VIEW3D.visualTest.richness.steps;
    const rich = richestKind({ food: steps.food[0]!, production: steps.production[2]!, gold: 0 });
    expect(rich).toEqual({ kind: 'production', step: 3, share: 1 });
  });

  it('has three rising steps for each kind', () => {
    for (const steps of Object.values(VIEW3D.visualTest.richness.steps)) {
      expect(steps).toHaveLength(3);
      expect(steps[0]!).toBeLessThan(steps[1]!);
      expect(steps[1]!).toBeLessThan(steps[2]!);
    }
  });
});
