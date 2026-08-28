/**
 * How big an offer is: one evaluator, four drafts, and the riders that widen
 * them (user, 2026-08-27 — "the trickiest part of the great-people
 * implementation is the bonus for additional selections in drafts").
 *
 * The claim under test is rule 5's, applied to a *count* rather than to a yield:
 * `explainOfferSize` is the ordered list, `offerSize` is its fold, and **every**
 * generator draws to that number — the Statecraft draft, the Doctrine triple at
 * adoption, a consecration and a claimed ruin. What that buys is the thing the
 * great-people pass needs and the wonders table already wants: The Oracle (+1
 * card in every Statecraft draft) and the Leaning Tower (+1 in every draft of
 * every kind) are **JSON rows**, read out of whichever of the five `liveEffects`
 * sources they happen to sit on, with no generator knowing what a wonder is.
 *
 * Which is why several tests here **patch a data row** — an Order's effects, a
 * belief's, the wonder's — and put it back afterwards. That is not a shortcut
 * around a fixture: it is the assertion. The table today carries exactly one
 * widening rider (The Oracle's), and a test that only ever exercised that row
 * could not tell "the evaluator reads any rider from any source" from "the
 * evaluator knows about The Oracle". Patching the row is how the source is
 * varied while the code is held still.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { foundCityAt } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { applyCommand } from '../../src/sim/commands';
import { claimDiscoveryAt } from '../../src/sim/discoveries';
import { createGame, dispatch, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { drawBeliefOffer } from '../../src/sim/religion';
import { BELIEF_IDS, beliefDef } from '../../src/sim/religionData';
import { RULES } from '../../src/sim/rulesData';
import {
  type OfferKind,
  drawDoctrineOffer,
  drawOrderOffer,
  explainOfferSize,
  livePool,
  offerSize,
} from '../../src/sim/statecraft';
import {
  type CardEffect,
  type CardOfferRiderEffect,
  GOVERNMENT_TIERS,
  ORDER_IDS,
  orderDef,
} from '../../src/sim/statecraftData';
import { type GameState, claimWonder, newGame } from '../../src/sim/state';
import { game, found } from './statecraftHelpers';

const KINDS: OfferKind[] = ['order', 'doctrine', 'belief', 'discovery', 'greatPerson'];

/** The whole vocabulary of this pass, as a row a card could carry. */
function rider(
  offer: CardOfferRiderEffect['offer'],
  extra?: number,
): CardOfferRiderEffect {
  const effect: CardOfferRiderEffect = { kind: 'offerRider', offer };
  if (extra !== undefined) effect.extra = extra;
  return effect;
}

/**
 * Runs `body` with one data row's effects replaced, and puts the row back
 * whatever happens.
 *
 * The tables are module-level singletons shared by every test in the process, so
 * the restore is not politeness — a leaked rider is a card that quietly widens
 * every draft in every other file.
 */
function withEffects(def: { effects?: readonly CardEffect[] }, effects: CardEffect[], body: () => void): void {
  const before = def.effects;
  (def as { effects?: readonly CardEffect[] }).effects = effects;
  try {
    body();
  } finally {
    (def as { effects?: readonly CardEffect[] }).effects = before;
  }
}

/** A city of this seat with the wonder standing in it, claim register included. */
function raiseOracle(state: GameState, playerId: number): void {
  const city = state.cities.find((c) => c.ownerId === playerId) ?? found(state, playerId);
  city.buildings.push('theOracle');
  claimWonder(state, 'theOracle', city);
}

// --- the base ---------------------------------------------------------------

describe('the base', () => {
  it('is the rules table, one line, for every kind of offer', () => {
    const g = game();
    for (const kind of KINDS) {
      const lines = explainOfferSize(g.state, 0, kind);
      expect(lines, kind).toHaveLength(1);
      expect(lines[0]!.delta, kind).toBe(RULES.offers[kind]);
      expect(offerSize(g.state, 0, kind), kind).toBe(RULES.offers[kind]);
    }
  });

  it('is three today, which is what every generator has always dealt', () => {
    // The numbers this pass moved into `rules.offers` are the ones the three
    // data files carried before it. If a retune ever changes them, this is the
    // line that says so out loud rather than a dozen `toHaveLength(3)`s.
    expect(RULES.offers).toEqual({
      order: 3,
      doctrine: 3,
      belief: 3,
      discovery: 3,
      greatPerson: 3,
      max: 5,
    });
  });

  it('is the fold of its own list and nothing else', () => {
    const g = game();
    raiseOracle(g.state, 0);
    const lines = explainOfferSize(g.state, 0, 'order');
    let sum = 0;
    for (const line of lines) sum += line.delta;
    expect(offerSize(g.state, 0, 'order')).toBe(sum);
  });
});

// --- the riders -------------------------------------------------------------

describe('a rider widens the offer it names', () => {
  it('reads one off a wonder standing in a city — The Oracle, end to end', () => {
    const g = game();
    expect(offerSize(g.state, 0, 'order')).toBe(3);
    raiseOracle(g.state, 0);
    const lines = explainOfferSize(g.state, 0, 'order');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toEqual({ source: 'Wonder · The Oracle', delta: 1 });
    expect(offerSize(g.state, 0, 'order')).toBe(4);
    // And only the draft it names.
    expect(offerSize(g.state, 0, 'belief')).toBe(3);
    expect(offerSize(g.state, 0, 'discovery')).toBe(3);
    // Nobody else's, either: a wonder pays the empire it stands in.
    expect(offerSize(g.state, 1, 'order')).toBe(3);
  });

  it('reads one off an Order, and deepens with the holding', () => {
    const g = game();
    const id = ORDER_IDS[0]!;
    withEffects(orderDef(id), [rider('belief', 1)], () => {
      const sc = g.state.players[0]!.statecraft;
      sc.orders.push({ id, level: 1 });
      sc.slots[0] = { card: id, sealedUntil: 0 };
      expect(offerSize(g.state, 0, 'belief')).toBe(4);
      // A level is a figure scaled like every other figure in the vocabulary.
      sc.orders[0]!.level = 2;
      expect(offerSize(g.state, 0, 'belief')).toBe(5);
    });
  });

  it('reads one off a belief', () => {
    const g = game();
    const id = BELIEF_IDS[0]!;
    withEffects(beliefDef(id), [rider('discovery')], () => {
      g.state.players[0]!.pantheon.beliefs.push(id);
      // No `extra` on the row: a rider with no figure deals the ordinary card.
      const lines = explainOfferSize(g.state, 0, 'discovery');
      expect(lines[lines.length - 1]!.delta).toBe(1);
      expect(offerSize(g.state, 0, 'discovery')).toBe(4);
    });
  });

  it("'all' widens every kind of draft at once", () => {
    const g = game();
    withEffects(buildingDef('theOracle'), [rider('all')], () => {
      raiseOracle(g.state, 0);
      for (const kind of KINDS) expect(offerSize(g.state, 0, kind), kind).toBe(4);
    });
  });

  it('sums two riders from two different sources', () => {
    const g = game();
    const id = ORDER_IDS[0]!;
    withEffects(buildingDef('theOracle'), [rider('all')], () => {
      withEffects(orderDef(id), [rider('order')], () => {
        raiseOracle(g.state, 0);
        const sc = g.state.players[0]!.statecraft;
        sc.orders.push({ id, level: 1 });
        sc.slots[0] = { card: id, sealedUntil: 0 };
        expect(offerSize(g.state, 0, 'order')).toBe(5);
        expect(offerSize(g.state, 0, 'belief')).toBe(4);
      });
    });
  });
});

// --- the cap ----------------------------------------------------------------

describe('the cap', () => {
  it('trims the total to rules.offers.max, and says that it did', () => {
    const g = game();
    withEffects(buildingDef('theOracle'), [rider('order', 9)], () => {
      raiseOracle(g.state, 0);
      const lines = explainOfferSize(g.state, 0, 'order');
      expect(lines).toHaveLength(3);
      expect(lines[2]!.delta).toBe(RULES.offers.max - (3 + 9));
      expect(lines[2]!.source).toContain(String(RULES.offers.max));
      expect(offerSize(g.state, 0, 'order')).toBe(RULES.offers.max);
    });
  });

  it('says nothing when nothing was trimmed', () => {
    const g = game();
    raiseOracle(g.state, 0);
    for (const line of explainOfferSize(g.state, 0, 'order')) {
      expect(line.source).not.toContain('limit');
    }
  });
});

// --- what every generator draws ---------------------------------------------

describe('every generator draws offerSize cards', () => {
  it('the Statecraft draft — the rider adds to the new cards, never to the face', () => {
    const g = game(23);
    const player = g.state.players[0]!;
    // One card held, so there is something to deepen and the upgrade face is
    // rolled: the question stays "one of these, or deepen that one".
    player.statecraft.orders.push({ id: 'firstRites', level: 1 });
    expect(drawOrderOffer(g.state, player).options).toHaveLength(3);
    raiseOracle(g.state, 0);
    const wide = drawOrderOffer(g.state, player);
    expect(wide.options).toHaveLength(4);
    expect(wide.upgrade).toBe('firstRites');
  });

  it('the Doctrine triple at adoption', () => {
    const g = game(29);
    const player = g.state.players[0]!;
    // The **first rung** of the government ladder, read off the rows rather than
    // written here: a Doctrine pool is keyed to an adoption tier and the ladder
    // is a pacing dial (4/10/18 since 2026-08-27).
    const rung = GOVERNMENT_TIERS[0]!;
    expect(drawDoctrineOffer(g.state, player, rung).options).toHaveLength(3);
    withEffects(buildingDef('theOracle'), [rider('doctrine')], () => {
      raiseOracle(g.state, 0);
      expect(drawDoctrineOffer(g.state, player, rung).options).toHaveLength(4);
    });
  });

  it('the consecration', () => {
    const g = game(31);
    const player = g.state.players[0]!;
    expect(drawBeliefOffer(g.state, player).options).toHaveLength(3);
    withEffects(buildingDef('theOracle'), [rider('belief', 2)], () => {
      raiseOracle(g.state, 0);
      expect(drawBeliefOffer(g.state, player).options).toHaveLength(5);
    });
  });

  it('the claimed ruin', () => {
    const g = game(37);
    const unit = g.state.units.find((u) => u.ownerId === 0)!;
    const tile = getTileAt(g.state.map, unit.col, unit.row)!;
    tile.discovery = 'ruins';
    expect(claimDiscoveryAt(g.state, unit, tile)!.options).toHaveLength(3);

    withEffects(buildingDef('theOracle'), [rider('all')], () => {
      raiseOracle(g.state, 0);
      delete g.state.players[0]!.pendingDiscovery;
      tile.discovery = 'village';
      expect(claimDiscoveryAt(g.state, unit, tile)!.options).toHaveLength(4);
    });
  });
});

// --- a pool that cannot fill the hand ---------------------------------------

describe('a pool shorter than the offer', () => {
  it('deals what it has rather than blocking', () => {
    const g = game();
    const player = g.state.players[0]!;
    // Every god but two is held, so a four-card consecration deals two.
    player.pantheon.beliefs.push(...BELIEF_IDS.slice(0, BELIEF_IDS.length - 2));
    withEffects(buildingDef('theOracle'), [rider('belief')], () => {
      raiseOracle(g.state, 0);
      expect(offerSize(g.state, 0, 'belief')).toBe(4);
      expect(drawBeliefOffer(g.state, player).options).toHaveLength(2);
    });
  });

  it('deals nothing at all from an empty pool, and still returns an offer', () => {
    const g = game();
    const player = g.state.players[0]!;
    for (const id of ORDER_IDS.filter((id) => orderDef(id).pool === 'chiefdom')) {
      player.statecraft.orders.push({ id, level: 1 });
    }
    raiseOracle(g.state, 0);
    expect(livePool(player.statecraft)).toEqual([]);
    expect(drawOrderOffer(g.state, player).options).toEqual([]);
  });
});

// --- determinism ------------------------------------------------------------

describe('determinism', () => {
  it('deals the same widened hand from the same generator state', () => {
    const a = game(41);
    const b = game(41);
    raiseOracle(a.state, 0);
    raiseOracle(b.state, 0);
    expect(drawOrderOffer(a.state, a.state.players[0]!)).toEqual(
      drawOrderOffer(b.state, b.state.players[0]!),
    );
  });

  it('replays byte-identically through a four-card pick', () => {
    /**
     * The rider and the culture are put on by hand, in **one** function applied
     * to both sides at the same point — `statecraft.test.ts`'s save round-trip
     * does the same and for the same reason: raising a wonder through the queue
     * would be forty turns of fixture to test an arithmetic this size. What is
     * on trial is the claim that matters: given the same state and the same log,
     * a widened draw deals the same four cards and `optionIndex: 3` spends the
     * same one, byte for byte.
     */
    const config = {
      seed: 53,
      sizeName: 'duel' as const,
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    };
    const prepare = (state: GameState): void => {
      const unit = state.units.find((u) => u.ownerId === 0)!;
      foundCityAt(state, 0, getTileAt(state.map, unit.col, unit.row)!);
      raiseOracle(state, 0);
      state.players[0]!.culturePool = 999;
    };

    const live = createGame(config);
    prepare(live.state);
    dispatch(live, { type: 'endTurn', playerId: 0 });
    dispatch(live, { type: 'endTurn', playerId: 1 });
    const offer = live.state.players[0]!.statecraft.pendingOrder!;
    // The wonder is why there are four: the pick below could not be made at the
    // base size, which is what makes this a test of the widened path.
    expect(offer.options).toHaveLength(4);
    dispatch(live, { type: 'chooseOrder', playerId: 0, optionIndex: 3 } as Command);

    const replayed = newGame(live.config);
    prepare(replayed);
    for (const command of live.log) {
      const result = applyCommand(replayed, command);
      expect(result.ok, JSON.stringify(command)).toBe(true);
    }
    expect(snapshotState(replayed)).toBe(snapshotState(live.state));
  });
});

// --- the register -----------------------------------------------------------

/**
 * The source of every simulation module, read raw. `test/ui/seatRoster.test.ts`'s
 * glob, for its reason: this project has no node typings and a source assertion
 * is not worth a dependency.
 */
const SIM_SOURCE = import.meta.glob('../../src/sim/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * One file's source with its comments taken out.
 *
 * `test/ui/seatRoster.test.ts`'s stripper, and its reason: comments are where a
 * rule is *explained*, and the files below explain themselves by naming the very
 * thing they no longer do. Matching them would make the docblocks unwritable.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceOf(file: string): string {
  const path = Object.keys(SIM_SOURCE).find((key) => key.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(path === undefined ? `${file} missing` : `${file} readable`);
  return code(SIM_SOURCE[path!]!);
}

describe('the register', () => {
  it('reads offerRider in exactly one place', () => {
    // The claim `statecraft.ts` makes for every `CardEffect.kind`, checked for
    // the one this pass added a half to. `statecraftData.ts` *declares* the
    // shape, so it names it; anything else naming it is a second evaluator.
    const offenders = Object.keys(SIM_SOURCE)
      .filter((path) => code(SIM_SOURCE[path]!).includes('offerRider'))
      .map((path) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    expect(offenders).toEqual(['statecraft.ts', 'statecraftData.ts']);
  });

  it('leaves every generator asking offerSize rather than a table of its own', () => {
    // A generator that reached for its own number again is the drift this
    // evaluator exists to prevent — three data files said "3" before it, and
    // each of those readings is now a line of one fold.
    expect(sourceOf('religion.ts')).not.toContain('RELIGION.pantheon.offerOptions');
    expect(sourceOf('discoveries.ts')).not.toContain('DISCOVERY_DATA.offerSize');
    expect(sourceOf('statecraft.ts')).not.toContain('STATECRAFT.offer.');
    for (const file of ['religion.ts', 'discoveries.ts', 'statecraft.ts']) {
      expect(sourceOf(file), file).toContain('offerSize(');
    }
  });
});
