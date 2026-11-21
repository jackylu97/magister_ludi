/**
 * The advice panel's words (`advicePanel.ts`), the reasons it prints for a
 * city site (`siteReasons`, `tileReadout.ts`), and worker advice
 * (`workerAdvice.ts`, a wrapper over the bots' plan).
 *
 * The claims:
 *   1. A site prints at most three reasons, and no figure (rule 7).
 *   2. A worker's hex prints the improvement as a noun, and its yield change
 *      as signed whole figures with a loss marked.
 *   3. `siteReasons` answers only on a hex the board recommends, and
 *      `recommendedSiteRow` is the same clauses in one sentence.
 *   4. `workerAdvice` names nothing for a piece that builds nothing, names
 *      each hex once, and stays inside its limits.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { emptyTileYield } from '../../src/sim/terrainData';
import { getTileAt } from '../../src/sim/map';
import { readSites } from '../../src/sim/readings';
import { SITE_REASON_LIMIT, adviceFigures, adviceText } from '../../src/ui/advicePanel';
import { recommendedSiteRow, siteReasons } from '../../src/ui/tileReadout';
import { workerAdvice } from '../../src/ui/workerAdvice';
import { newGame } from '../sim/newGameHelpers';

describe('the advice panel\'s words', () => {
  it('prints at most three reasons for a city site', () => {
    const text = adviceText({ kind: 'site', reasons: ['fresh water', 'Wine in reach', 'a harbour on the sea', 'hills to quarry'] });
    expect(text).toBe('We recommend a city here: fresh water, Wine in reach, a harbour on the sea');
    expect(SITE_REASON_LIMIT).toBe(3);
    expect(adviceText({ kind: 'site', reasons: [] })).toBe('We recommend a city here');
    expect(text).not.toMatch(/\d/);
  });

  it('prints a worker\'s job as a noun, and its yield change as signed figures', () => {
    const change = { ...emptyTileYield(), food: 2, gold: 1, culture: -2 };
    expect(adviceText({ kind: 'work', phrase: 'a camp', change })).toBe('Advice: build a camp here');
    expect(adviceFigures(change)).toEqual([
      { key: 'food', text: '+2', loss: false },
      { key: 'gold', text: '+1', loss: false },
      { key: 'culture', text: '−2', loss: true },
    ]);
    expect(adviceFigures(emptyTileYield())).toEqual([]);
  });
});

describe('the reasons for a city site', () => {
  it('answers only on a recommended hex, and the readout sentence is the same clauses', () => {
    const state = newGame({ seed: 11, sizeName: 'duel', players: [{ name: 'A', color: '#a00', isHuman: true }] });
    const sites = readSites(state, 0);
    for (const site of sites) {
      const tile = getTileAt(state.map, site.col, site.row)!;
      const reasons = siteReasons(state, 0, tile);
      expect(reasons).not.toBeNull();
      const row = recommendedSiteRow(state, 0, tile)!;
      for (const reason of reasons!) expect(row).toContain(reason.split(' (')[0]!);
    }
    const marked = new Set(sites.map((site) => `${site.col},${site.row}`));
    const plain = state.map.tiles.find((tile) => !marked.has(`${tile.col},${tile.row}`))!;
    expect(siteReasons(state, 0, plain)).toBeNull();
    expect(recommendedSiteRow(state, 0, plain)).toBeNull();
  });
});

describe('worker advice', () => {
  it('names nothing for a piece that builds nothing', () => {
    const state = newGame({ seed: 11, sizeName: 'duel', players: [{ name: 'A', color: '#a00', isHuman: true }] });
    const soldier = state.units.find((unit) => unit.ownerId === 0 && unit.type !== 'settler' && unit.type !== 'worker');
    if (soldier) expect(workerAdvice(state, 0, soldier.id)).toEqual([]);
    expect(workerAdvice(state, 0, -1)).toEqual([]);
  });

  it('names each hex once, best first, inside its limits', () => {
    const state = newGame({ seed: 11, sizeName: 'duel', players: [{ name: 'A', color: '#a00', isHuman: true }] });
    const settler = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'settler')!;
    expect(applyCommand(state, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id }).ok).toBe(true);
    const city = state.cities.find((town) => town.ownerId === 0)!;
    expect(applyCommand(state, { type: 'spawnUnit', playerId: 0, ownerId: 0, unitType: 'worker', at: { col: city.col, row: city.row } }).ok).toBe(true);
    const worker = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'worker')!;
    const limits = { count: 3, walk: 4, near: 0.6 };
    const list = workerAdvice(state, 0, worker.id, limits);
    expect(list.length).toBeLessThanOrEqual(limits.count);
    expect(new Set(list.map((job) => `${job.col},${job.row}`)).size).toBe(list.length);
    for (const [i, job] of list.entries()) {
      expect(job.distance).toBeLessThanOrEqual(limits.walk);
      expect(job.phrase.length).toBeGreaterThan(0);
      if (i > 0) {
        expect(job.score).toBeLessThanOrEqual(list[i - 1]!.score);
        expect(job.score).toBeGreaterThanOrEqual(list[0]!.score * limits.near);
      }
    }
    // The same question asked twice has the same answer, and asking changes nothing.
    expect(workerAdvice(state, 0, worker.id, limits)).toEqual(list);
  });
});
