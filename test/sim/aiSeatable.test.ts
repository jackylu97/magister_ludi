/**
 * **Batch BP2 of bot pass 3, B5: the bot names only cards that can sit.** The
 * spec is `docs/flags.md` item (ooooooo), entry B5; the audit is
 * `docs/audit/bot-pass-3-card-values.md` fault 5 and "Rule faults seen in play".
 *
 * A Boon, a charter and a fulfilled commission never take a chair: the reducer
 * refuses them (`slotOrderError`, whose card half is `neverSeatedError`). The
 * re-seat arm used to name such a card as the one that should take a chair, so
 * it emptied the chair and the old card went straight back. The scarcity count
 * and a new government's chairs counted the same cards.
 *
 * Pinned here, for each of the three kinds of card:
 *
 *   - the sim's card gate refuses it, and `slotOrderError` gives the same words;
 *   - the slot arm's scarcity count leaves it out;
 *   - the re-seat arm never names it for a chair;
 *   - `adoptionTable` never puts it in a new government's chair.
 */
import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { adoptionTable, explainCard, reslotDecision, slottingDecision } from '../../src/ai/council';
import type { ValueTerm } from '../../src/ai/decision';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { neverSeatedError, slotOrderError, slotTypesOf } from '../../src/sim/statecraft';
import {
  type GovernmentId,
  type OrderId,
  ORDER_IDS,
  isBoon,
  isCharter,
  orderDef,
  orderType,
} from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);
const isCommission = (id: OrderId): boolean => orderDef(id).commission !== undefined;
const BOON = LIVE.find(isBoon)!;
const CHARTER = LIVE.find(isCharter)!;
const COMMISSION = LIVE.find(isCommission)!;
const NEVER = [BOON, CHARTER, COMMISSION];

/** Plain cards that pay a flat yield in every town: seatable, and worth something. */
const PLAIN = LIVE.filter(
  (id) =>
    !isBoon(id) &&
    !isCharter(id) &&
    !isCommission(id) &&
    orderType(id) !== 'wildcard' &&
    orderDef(id).effects.length === 1 &&
    orderDef(id).effects.every((effect) => effect.kind === 'pays'),
);

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** One grown town for seat 0 on a blank board, under the opening government. */
function bench(): { state: GameState; player: Player } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 14).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.turn = 30;
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 5;
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  const player = playerById(state, 0)!;
  // The commission has paid its reward: it is met.
  player.statecraft.commissionsFulfilled = [{ card: COMMISSION, turn: 20 }];
  bumpRevision(state);
  return { state, player };
}

/** Every label in a term tree. */
function labels(terms: readonly ValueTerm[]): string[] {
  return terms.flatMap((term) => [term.label, ...labels(term.parts ?? [])]);
}

const name = (id: OrderId): string => orderDef(id).name;

describe('the cards that never sit', () => {
  it('are refused by the sim’s card gate, in the words the reducer uses', () => {
    const { state, player } = bench();
    player.statecraft.orders = [...NEVER, PLAIN[0]!];
    bumpRevision(state);
    for (const id of NEVER) {
      const never = neverSeatedError(player.statecraft, id);
      expect(never).not.toBeNull();
      expect(slotOrderError(state, 0, id, 0)).toBe(never);
    }
    expect(neverSeatedError(player.statecraft, PLAIN[0]!)).toBeNull();
    expect(slotOrderError(state, 0, PLAIN[0]!, 0)).toBeNull();
  });

  it('are left out of the slot arm’s scarcity count', () => {
    const { state, player } = bench();
    const sc = player.statecraft;
    // The opening chairs are Wildcard chairs, which every card fits.
    expect(slotTypesOf(sc).every((type) => type === 'wildcard')).toBe(true);
    sc.orders = [...NEVER, PLAIN[0]!];
    bumpRevision(state);
    const decision = slottingDecision(state, player)!;
    expect(decision.command).toMatchObject({ type: 'slotOrder', cardId: PLAIN[0] });
    const chosen = decision.candidates.find((row) => row.chosen)!;
    const scarcity = chosen.terms.find((term) => term.op === 'div')!;
    // One card could fill the chair, not four.
    expect(scarcity.value).toBe(1);
    for (const id of NEVER) {
      for (const row of decision.candidates.filter((candidate) => candidate.label.startsWith(name(id)))) {
        expect(row.rejected).toBe(neverSeatedError(sc, id));
      }
    }
  });

  it('are never named by the re-seat arm for a chair', () => {
    const { state, player } = bench();
    const sc = player.statecraft;
    // Rank the plain cards by the seat's own appraisal: the weakest sits in the
    // open chair and the strongest waits on the bench beside the three that
    // never sit, so the arm has one real swap to make.
    const ctx = valueContext(state, player);
    const ranked = [...PLAIN].sort(
      (x, y) => explainCard(player, y, ctx).total - explainCard(player, x, ctx).total || (x < y ? -1 : 1),
    );
    const strong = ranked[0]!;
    const weak = ranked[ranked.length - 1]!;
    const [a, b] = ranked.slice(1, 3);
    expect(explainCard(player, strong, ctx).total).toBeGreaterThan(explainCard(player, weak, ctx).total);
    sc.orders = [weak, a!, b!, strong, ...NEVER];
    // Chair 1 holds the weak card out of its seal; the other two are sealed.
    sc.slots = [
      { card: weak, sealedUntil: 0 },
      { card: a!, sealedUntil: state.turn + 99 },
      { card: b!, sealedUntil: state.turn + 99 },
    ];
    bumpRevision(state);
    const decision = reslotDecision(state, player)!;
    expect(decision.command).toMatchObject({ type: 'unslotOrder', slotIndex: 0 });
    expect(decision.candidates.find((row) => row.chosen)!.label).toBe(
      `${name(strong)} takes slot 1 from ${name(weak)}`,
    );
    // No row of the table names a card that cannot sit.
    for (const id of NEVER) {
      for (const row of decision.candidates) expect(row.label.startsWith(`${name(id)} takes slot`)).toBe(false);
    }
  });

  it('are never put in a new government’s chairs', () => {
    const { state, player } = bench();
    player.statecraft.orders = [...NEVER];
    bumpRevision(state);
    const options: GovernmentId[] = ['councilOfElders', 'warChief', 'priestKing'] as GovernmentId[];
    const table = adoptionTable(state, player, options);
    for (const candidate of table.candidates) {
      const printed = labels(candidate.terms).join(' | ');
      for (const id of NEVER) expect(printed).not.toContain(`which ${name(id)} would fill`);
      expect(printed).toMatch(/with nothing held that fits it/);
    }
  });
});
