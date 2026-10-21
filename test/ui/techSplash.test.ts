/**
 * **The technology splash, for a charter technology** (Scientific batch S10,
 * the approved prototype `docs/plans/mockups/charter-ux.html` step 5).
 *
 * The splash is the one every technology gets. A charter technology adds one
 * eyebrow line, "your charter technology", and the trait tally rides beside
 * the upgrade tally, because both answer one question: what did this
 * technology do to my army?
 */

import { describe, expect, it } from 'vitest';

import type { ResearchReport } from '../../src/sim/tech';
import { CHARTER_SPLASH_EYEBROW, techSplashReading } from '../../src/ui/turnSplash';
import { braceBody, uiSource } from './sourceHelpers';

function report(overrides: Partial<ResearchReport>): ResearchReport {
  return { techs: [], upgrades: [], traits: [], ...overrides };
}

describe('techSplashReading', () => {
  it('has nothing to say when the resolution completed no technology', () => {
    expect(techSplashReading(report({}))).toBeNull();
  });

  it('names an ordinary technology with no eyebrow', () => {
    const reading = techSplashReading(report({ techs: ['mathematics'] }));
    expect(reading).toEqual({ name: 'Mathematics', notes: [], eyebrow: null });
  });

  it('wears the eyebrow for a charter technology, and lists the trait tally after the upgrades', () => {
    const reading = techSplashReading(
      report({
        techs: ['mechanics'],
        upgrades: [{ from: 'warrior', to: 'swordsman', count: 2 }],
        traits: [
          { type: 'catapult', trait: 'Onager', tech: 'mechanics', count: 3 },
          { type: 'compositeBowman', trait: 'Repeating Crossbow', tech: 'mechanics', count: 1 },
        ],
      }),
    );
    expect(reading?.eyebrow).toBe(CHARTER_SPLASH_EYEBROW);
    expect(CHARTER_SPLASH_EYEBROW).toBe('your charter technology');
    expect(reading?.name).toBe('Mechanics');
    expect(reading?.notes).toEqual([
      '2 warriors became swordsmen',
      '3 catapults gained Onager',
      '1 composite bowman gained Repeating Crossbow',
    ]);
  });
});

describe('the splash and the hand-over', () => {
  it('draws the eyebrow over the name, as data and never as markup', () => {
    const body = braceBody(uiSource('turnSplash.ts'), 'function announceTech(');
    expect(body).toContain("over.className = 'turn-splash-eyebrow';");
    expect(body).toContain('over.textContent = eyebrow;');
    expect(body).not.toContain('innerHTML');
  });

  it('is fed by the one reading in main.ts', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('const discovery = techSplashReading(research);');
    expect(main).toContain('splash.announceTech(discovery.name, discovery.notes, discovery.eyebrow);');
  });

  it('glows the pieces that gained a trait and pans a toast to them, after the marches', () => {
    const controls = uiSource('controls.ts');
    const handOver = braceBody(controls, 'function scheduleHandOver(');
    expect(handOver).toContain('reportTraitGains(research, gains);');
    const gains = braceBody(controls, 'function reportTraitGains(');
    expect(gains).toContain('renderer.glowUnits?.(gains.map((gain) => gain.unitId));');
    expect(gains).toContain('describeTraitGain(tally)');
    expect(gains).toContain('{ cell: { col: first.col, row: first.row } }');
  });
});
