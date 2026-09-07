/**
 * The top bar's headline and the phase that actually banks the gold read one
 * list.
 *
 * Bug report, 2026-08-29: The Great Litany's culture (`rateConversion`, +1
 * culture per 3 faith gained per turn) banked into `player.culturePool` every
 * turn — `collectYields` folds `explainEmpireCardYields` — but the strip's
 * `civYields` summed only city yields, the luxury signatures and the four
 * trade-gold lines, so the printed per-turn culture was short by exactly the
 * card lines while the pool filled by the true amount. What matters is not
 * this one card: it is that the headline and the resolution can no longer
 * drift, because they are now the same call.
 */

import { describe, expect, it } from 'vitest';

import { foldCardYields } from '../../src/sim/statecraft';
import {
  empirePercents,
  emptyCityYields,
  explainEmpireCardYields,
  stageEmpireFold,
} from '../../src/sim/cities';
import { civYields } from '../../src/ui/topBar';
import { game, found } from '../sim/statecraftHelpers';

const SOURCES = import.meta.glob(
  ['../../src/sim/cities.ts', '../../src/sim/readings.ts', '../../src/ui/topBar.ts'],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

describe('civYields carries the empire-scale card lines', () => {
  it('The Great Litany’s culture is in the headline, not only in the pool', () => {
    const g = game();
    const city = found(g.state, 0);
    // Two faith buildings, three faith a turn — enough for one helping of the
    // Litany's "+1 culture per 3 faith gained per turn".
    city.buildings.push('shrine', 'temple');
    g.state.players[0]!.statecraft.doctrines.push('greatLitany');

    const cardCulture = foldCardYields(explainEmpireCardYields(g.state, 0)).culture;
    expect(cardCulture).toBeGreaterThan(0);
    // **Staged, since batch H19** (`docs/flags.md` oo): the empire's additive
    // lines fold and the meters multiply that fold once, so what the headline
    // gains is the card's line through the empire stage — this bench sits a
    // contentment tier up, and the culture it banks is the tenth more. Read
    // through the simulation's own multiplication rather than restated here.
    const banked = stageEmpireFold(
      { ...emptyCityYields(), culture: cardCulture },
      empirePercents(g.state, 0),
    ).culture;
    expect(banked).toBeGreaterThan(cardCulture);

    // The headline moves by exactly the card fold when the doctrine is the
    // only thing that changes — a fresh, otherwise-identical game rather than
    // mutating this one and re-reading, so the comparison cannot be fooled by
    // a stale cache.
    const withoutDoctrine = (() => {
      const bare = game();
      const c = found(bare.state, 0);
      c.buildings.push('shrine', 'temple');
      return civYields(bare.state, 0).culture;
    })();
    expect(civYields(g.state, 0).culture - withoutDoctrine).toBe(banked);
  });

  it('reads the same helper `collectYields` banks with, by source', () => {
    // **One list since batch H19**, and the same one on both sides: the four
    // folds `collectYields` used to bank one loop at a time are
    // `explainEmpireLines`, the card lines among them, and the headline reads
    // that list rather than a fold of its own.
    // The phase's own call, inside `collectYields`.
    expect(source('cities.ts')).toMatch(/explainEmpireLines\(state, player\.id\)/);
    expect(source('cities.ts')).toMatch(/foldEmpireLines\(lines\)/);
    // The headline's call, inside `civYields` — through `readEmpire` since batch
    // E2, which is the same list taken once for the whole revision and shared
    // with the Ledger, the panel and the bot. The claim is unchanged and is
    // stronger: the strip does not merely call the same helper, it reads the
    // very object the other surfaces read.
    expect(source('topBar.ts')).toMatch(/readEmpire\(state, playerId\)\.totals/);
    expect(source('readings.ts')).toMatch(/explainEmpireLines\(state, playerId, empire\)/);
    expect(source('readings.ts')).toMatch(/foldEmpireLines\(lines\)/);
  });
});
