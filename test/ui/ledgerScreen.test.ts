/**
 * The Ledger — where this turn's yield comes from, and where the curve goes.
 *
 * `docs/history/loop-review.md` §3, bands 1 and 2 (band 3 is a labelled hole until the
 * lifetime tally has a schema field). Three kinds of test, and the split is this
 * suite's usual one (`reliquaryScreen.test.ts` says why): the **reading** is a
 * fold over the state and is driven for real, the **register** is a walk over
 * every id the game can hand a breakdown line, and the drawing lives in
 * browser-only code with no jsdom here, so it is asserted by reading the source
 * and the stylesheet.
 *
 * What is guarded here is not cosmetic. Four things render perfectly and are
 * wrong:
 *
 *   1. **The bands disagreeing with the chip that opened them.** The sheet is
 *      reached from the yield strip, so a total that is not `readEmpire`' total
 *      is a sheet contradicting the number the player clicked. Pinned voice by
 *      voice on a real bench.
 *   2. **A source quietly falling to "other".** A card class nobody classified,
 *      or a maintenance label the simulation renamed, does not throw — it grows
 *      the grey slice and tells nobody. So every id in every table is walked,
 *      and every label `explainEmpireGold` can emit is read out of its own
 *      source.
 *   3. **A summand added to `explainCity` and not classed.** The mirror is gone
 *      (batch E2): the town publishes its own labelled list and every line
 *      carries the class its source belongs to, so this is now pinned by folding
 *      the classified bag and comparing against `CityReading.flats` itself — a
 *      line that reached the list without a class would fail here.
 *   4. **A leaked window listener, or a curve carried into the next game.**
 *      Entry LVII's bug in a new costume, and the ring buffer's own version of
 *      it.
 *   5. **A card paying a figure the sheet credits to somebody else.** The
 *      bands added up perfectly while a card that paid only a *percentage*, and
 *      every late Order that pays on *ground*, showed as nothing in "your
 *      cards" — the whole of ruling jj (2026-09-07). So the crediting is pinned
 *      twice: on the arithmetic (`shareGain`'s same-sign rule, `classifyPercent`
 *      over every handle a percentage can carry) and on the **seams**, by
 *      reading `statecraft.ts` and `cities.ts` for the card id being handed on.
 *      A dropped id is not an error — it is a slice landing in the grey bar and
 *      nobody hearing about it.
 */

import { describe, expect, it } from 'vitest';

import {
  EMPIRE_GOLD_CLASS,
  LEDGER_BAND3_EYEBROW,
  LEDGER_BAND3_NOTE,
  LEDGER_CLASSES,
  LEDGER_CLASS_NAME,
  LEDGER_CURVE_FOOTNOTE,
  LEDGER_HISTORY_CAP,
  type LedgerClass,
  type LedgerSample,
  classifyCard,
  classifyEmpireGold,
  classifyEmpireLine,
  classifyPercent,
  createLedgerHistory,
  flatsByClass,
  foldLedgerBag,
  ledgerCaption,
  explainLedger,
  ledgerSample,
  netFigure,
  percentWeights,
  shareGain,
  shareOut,
  sparkPoints,
} from '../../src/ui/ledgerScreen';
import { readEmpire } from '../../src/sim/readings';
import { readCity } from '../../src/sim/readings';
import {
  foundCityAt,
} from '../../src/sim/cities';
import {
  explainCardBuildingYields,
  explainCity,
  foldCity,
} from '../../src/sim/yields/town';
import {
  collectYields,
  explainEmpireLines,
} from '../../src/sim/yields/empire';
import { applyCommand } from '../../src/sim/commands';
import { foldRouteYield, senderRouteYields } from '../../src/sim/trade';
import { createUnit } from '../../src/sim/state';
import { at, bareState } from '../sim/improvementHelpers';
import type { CardEffect, CardId } from '../../src/sim/statecraftData';
import { orderDef } from '../../src/sim/statecraftData';
import { DOCTRINE_IDS, GOVERNMENT_IDS, ORDER_IDS } from '../../src/sim/statecraftData';
import { ALL_BELIEF_IDS, CONSECRATION_IDS, RITE_IDS } from '../../src/sim/religionData';
import { GREAT_PERSON_IDS } from '../../src/sim/greatPeopleData';
import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import { TECH_IDS } from '../../src/sim/techData';
import {
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_GRANT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
} from '../../src/sim/beadData';
import type { City, GameState } from '../../src/sim/state';
import { bumpRevision, playerById } from '../../src/sim/state';
import { found, game } from '../sim/statecraftHelpers';

const SOURCES = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/{main.ts,style.css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  // The layers by name since batch E3b: the evaluator's own file, the town's
  // percent list and the hex's breakdown are three files now, and each register
  // below reads the one that owns its claim.
  ...(import.meta.glob(
    '../../src/sim/{empireGold.ts,statecraft/evaluator.ts,cities.ts,yields/town.ts,yields/hex.ts}',
    {
      query: '?raw',
      import: 'default',
      eager: true,
    },
  ) as Record<string, string>),
  ...(import.meta.glob('../../index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

function raw(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  if (key === undefined) throw new Error(`${file} was not globbed`);
  return SOURCES[key]!;
}

/** One file's source with its comments taken out — the prose explains the rules. */
function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * One function's body, between two anchors that are themselves the register: a
 * renamed neighbour fails here rather than silently widening the window.
 */
function region(text: string, from: string, to: string): string {
  const start = text.indexOf(from);
  expect(start, from).toBeGreaterThan(-1);
  const end = text.indexOf(to, start + from.length);
  expect(end, to).toBeGreaterThan(start);
  return text.slice(start, end);
}

/**
 * A seat with a town, a market, a wonder, a slotted Order and a belief — one of
 * every class the bands split on, so "the parts sum to the total" is a claim
 * about a bar with something in every slice rather than about an empty one.
 */
function bench(): { state: GameState; playerId: number } {
  const made = game();
  const state = made.state;
  const city = found(state, 0);
  // **Odd on purpose.** The two `sciencePerPop` terms are exact since batch X —
  // half a beaker a citizen from the rules and half again from the library — and
  // the mirror that floored them read the same as the fold on every even town,
  // and this bench is why nobody saw it. The mirror is gone (batch E2); the
  // bench stays, because the class of a line is still a claim about a figure.
  city.population = 5;
  city.buildings.push('monument', 'library');
  bumpRevision(state);
  const wonder = BUILDING_IDS.find((id) => isWonder(id));
  if (wonder) city.buildings.push(wonder);
  bumpRevision(state);
  const player = playerById(state, 0)!;
  const sc = player.statecraft;
  // An Order that pays a yield in every town — the point of the bench is a bar
  // with something in the deck's slice, not a bar with a war bonus in it.
  const order = 'weightsAndMeasures' as (typeof ORDER_IDS)[number];
  if (!sc.orders.includes(order)) sc.orders.push(order);
  sc.slots.push({ card: order, sealedUntil: state.turn });
  bumpRevision(state);
  // **And one of the seven `buildingYieldPercent` Orders**, over the library the
  // bench just built. `explainCardBuildingYields` is the eleventh summand of
  // `explainCity` and the mirror below simply did not walk it; a bench with no
  // such card in it is a bench that cannot tell.
  const scrivened = 'theScriveners' as (typeof ORDER_IDS)[number];
  if (!sc.orders.includes(scrivened)) sc.orders.push(scrivened);
  sc.slots.push({ card: scrivened, sealedUntil: state.turn });
  bumpRevision(state);
  // **And a card that pays nothing but a percentage** (The Lamp Kept Lit, a
  // quarter more science in the capital). The ruling of 2026-09-07: until it
  // landed, this card printed a figure on its own face and added nothing at all
  // to "your cards", because a town's multiplied gain was credited to whoever
  // had put the base flats there. A bench with no such card in it cannot tell.
  const lamp = 'theLampKeptLit' as (typeof ORDER_IDS)[number];
  if (!sc.orders.includes(lamp)) sc.orders.push(lamp);
  sc.slots.push({ card: lamp, sealedUntil: state.turn });
  bumpRevision(state);
  player.pantheon = { beliefs: [ALL_BELIEF_IDS[0]!], rungs: 1 };
  bumpRevision(state);
  return { state, playerId: 0 };
}

/**
 * A town whose worked hexes are **dressed by cards** — three hills an Order
 * pays on and a desert a belief pays on.
 *
 * The tile half of the same ruling, and it needs a hand-built board rather than
 * the duel bench: what has to be shown is a card paying on ground the town
 * actually works, and a generated map's start is whatever the seed made of it.
 *
 * The later Order pools lean on `tileYield` where the early ones lean on
 * `cityYields` (the user, 2026-09-07: *"I think it may just be that the age 3
 * and onwards orders are not being counted in the display total"*), so this is
 * the bench that says whether a late deck reads as a deck at all.
 */
function tileCardBench(): { state: GameState; city: City; playerId: number } {
  const state = bareState(16, 9);
  state.wars = [];
  const city = foundCityAt(state, 0, at(state, 4, 4));
  const hills = [at(state, 4, 3), at(state, 5, 4)];
  for (const tile of hills) tile.hills = true;
  const desert = at(state, 3, 4);
  desert.terrain = 'desert';
  city.population = 3;
  city.workedTiles = [...hills, desert].map((tile) => ({ col: tile.col, row: tile.row }));
  const player = playerById(state, 0)!;
  const sc = player.statecraft;
  // +2🌾 on every hills hex — a card whose whole payment is on the ground.
  const terraces = 'terracedHillsides' as (typeof ORDER_IDS)[number];
  if (!sc.orders.includes(terraces)) sc.orders.push(terraces);
  sc.slots.push({ card: terraces, sealedUntil: state.turn });
  bumpRevision(state);
  // And a belief that pays on ground too, so "a card's line" is not quietly
  // read as "the deck's line": the Desert Fathers' faith is religion's.
  player.pantheon = { beliefs: ['desertFathers' as (typeof ALL_BELIEF_IDS)[number]], rungs: 1 };
  bumpRevision(state);
  return { state, city, playerId: 0 };
}

/**
 * A seat whose caravan is abroad — the empire-scale half of a route, which
 * belongs to no town and is banked once a turn on the luxuries' own seam.
 *
 * Two seats at peace who have met, a market in the sending town, and a route
 * running from it to the neighbour's. Built on `bareState` rather than on the
 * duel game above because what is wanted is a *known* foreign route and nothing
 * else: the point of the bench is that a figure the phase banks reaches the two
 * surfaces, and a world with no route at all would pin nothing.
 */
function foreignRouteBench(): { state: GameState; playerId: number } {
  const state = bareState(16, 9);
  // At peace, and no truce: `bareState` seats the war register full.
  state.wars = [];
  const home = foundCityAt(state, 0, at(state, 3, 4));
  const partner = foundCityAt(state, 1, at(state, 10, 4));
  home.buildings.push('market', 'library');
  bumpRevision(state);
  home.population = 5;
  partner.population = 4;
  const trader = createUnit(state, 0, 'trader', 3, 4);
  // Met, by the clause that needs no paper: a piece of theirs where this seat
  // can see it.
  createUnit(state, 1, 'worker', 3, 3);
  const sent = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: trader.id,
    fromCityId: home.id,
    toCityId: partner.id,
  });
  expect(sent.ok).toBe(true);
  return { state, playerId: 0 };
}

// --- band 1: the fold -------------------------------------------------------

describe('the reading', () => {
  it('adds up, voice by voice, to the very figure the chip beside it prints', () => {
    // The whole bargain of the sheet: it is `readEmpire`' summands, never a
    // second derivation of `readEmpire`. A band that disagreed with the top bar
    // would be a band contradicting the number the player clicked to open it.
    const { state, playerId } = bench();
    const headline = readEmpire(state, playerId).totals;
    for (const voice of explainLedger(state, playerId)) {
      expect(voice.total, voice.key).toBe(headline[voice.key]);
      let parts = 0;
      for (const cls of LEDGER_CLASSES) parts += voice.byClass[cls];
      expect(parts, `${voice.key} parts`).toBe(voice.total);
    }
  });

  /**
   * **A board where the empire stage is actually standing** (batch H19). The
   * benches above sit under water — a town of five citizens asks for more than
   * the palace supplies — so neither of them carries a positive tier, and a
   * sheet that dropped the empire's multiplication would agree with a top bar
   * that had dropped it too. This one is a single-citizen capital over the first
   * contentment tier with an Order paying the realm three beakers: the stage
   * pays 0.3 of them, the sheet has to carry it, and the bank has to agree.
   */
  it('carries the empire stage, into “other”, and still agrees with the bank', () => {
    const held = orderDef('waysideShrines').effects;
    try {
      (orderDef('waysideShrines') as { effects: CardEffect[] }).effects = [
        { kind: 'pays', where: 'empire', science: 3 },
      ];
      const g = game();
      found(g.state, 0);
      const sc = playerById(g.state, 0)!.statecraft;
      sc.orders.push('waysideShrines');
      sc.slots[0] = { card: 'waysideShrines', sealedUntil: g.state.turn };
      bumpRevision(g.state);

      const stage = explainEmpireLines(g.state, 0).filter((line) => line.origin === 'stage');
      expect(stage.length, 'the tier is standing').toBeGreaterThan(0);

      const headline = readEmpire(g.state, 0).totals;
      const reading = explainLedger(g.state, 0);
      for (const voice of reading) {
        expect(voice.total, voice.key).toBe(headline[voice.key]);
        let parts = 0;
        for (const cls of LEDGER_CLASSES) parts += voice.byClass[cls];
        expect(parts, `${voice.key} parts`).toBe(voice.total);
      }
      // And the money: the pools move by the headline the sheet is a split of.
      const player = playerById(g.state, 0)!;
      const opened = player.sciencePool;
      collectYields(g.state);
      expect(player.sciencePool - opened).toBeCloseTo(headline.science, 10);
    } finally {
      (orderDef('waysideShrines') as { effects: CardEffect[] }).effects = held as CardEffect[];
    }
  });

  it('is what the resolution actually banks, not merely what the strip says', () => {
    // **The pin that was missing.** Until 2026-09-06 the only guard compared the
    // two surfaces to *each other*, so when both left out the sender's foreign
    // routes they were wrong together and agreed about it. The honest reading is
    // the bank: run the phase and watch the pools move.
    //
    // The four banked voices only — food goes to a basket and hammers to
    // another, and neither is a pool a player can spend.
    const { state, playerId } = foreignRouteBench();
    // A route that actually pays, or the fixture proves nothing.
    const abroad = foldRouteYield(senderRouteYields(state, playerId));
    expect(abroad.gold).toBeGreaterThan(0);

    // One resolution first, so the citizens are seated where the *next* one will
    // find them: `collectYields` re-seats before it prices, and a headline read
    // against an older assignment would differ for a reason that is not the
    // subject here.
    collectYields(state);
    const purse = (): Record<string, number> => {
      const player = playerById(state, playerId)!;
      return {
        gold: player.gold,
        science: player.sciencePool,
        culture: player.culturePool,
        faith: player.faithPool,
      };
    };
    const opened = purse();
    const headline = readEmpire(state, playerId).totals;
    const reading = explainLedger(state, playerId);
    collectYields(state);
    const closed = purse();

    for (const key of ['gold', 'science', 'culture', 'faith'] as const) {
      expect(closed[key]! - opened[key]!, `${key} banked`).toBe(headline[key]);
      // And the sheet agrees with the strip it was opened from, on the same
      // bench — the older claim, kept, now that both are pinned to the money.
      expect(reading.find((voice) => voice.key === key)!.total, `${key} sheet`).toBe(headline[key]);
    }
  });

  it('mirrors `explainCity`’s own flats, summand for summand', () => {
    // The eight classes are a partition of the town's own list now (batch E2),
    // so this is the partition's own guard: a line reaching `explainCity` without
    // a class, or a class the bag has no bucket for, would not throw — it would
    // quietly drop a summand out of the sheet while the totals still added up.
    const { state } = bench();
    // The bench has to carry the two things the mirror was blind to, or this is
    // a guard that passes on the tree it was meant to catch: a card taking a
    // share of a building's yield, and a town whose population is odd.
    const town = state.cities.find((city) => city.ownerId === 0)!;
    expect(explainCardBuildingYields(state, town).length).toBeGreaterThan(0);
    expect(town.population % 2).toBe(1);

    for (const city of state.cities) {
      if (city.ownerId !== 0) continue;
      const flats = foldLedgerBag(flatsByClass(readCity(state, city).lines));
      const quote = explainCity(state, city);
      for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
        expect(flats[key], `${city.name} ${key}`).toBe(quote.flats[key]);
      }
    }
  });

  it('puts the deck’s share of a building in the deck’s own slice', () => {
    // The eleventh summand is not merely *counted* now, it is classified: a
    // card's half again on a library is the card's, and folding it into
    // "buildings" would have made the sheet answer its own question wrongly
    // while still adding up.
    const { state } = bench();
    const town = state.cities.find((city) => city.ownerId === 0)!;
    const shares = explainCardBuildingYields(state, town);
    const paid = shares.reduce((sum, line) => sum + line.science, 0);
    expect(paid).toBeGreaterThan(0);
    // Every such line names the card that spoke, which is what the classifier
    // reads — a line with no card would land in "buildings" by the fallback.
    expect(shares.every((line) => line.card !== undefined)).toBe(true);

    const held = flatsByClass(readCity(state, town).lines).deck.science;
    // Take the card out of the slot and the deck's slice falls by exactly what
    // the card was paying, with nothing appearing anywhere else.
    const sc = playerById(state, 0)!.statecraft;
    sc.slots = sc.slots.filter((entry) => entry?.card !== 'theScriveners');
    // **The world moved** (batch E2): a card taken out of a chair by hand is what
    // `unslotOrder` does through the reducer, and every reading on this sheet is
    // remembered under `state.revision`. A bench that mutates by hand says so the
    // way a command does — `GameState.revision`'s stated contract.
    bumpRevision(state);
    expect(explainCardBuildingYields(state, town)).toEqual([]);
    expect(held - flatsByClass(readCity(state, town).lines).deck.science).toBe(paid);
  });

  it('finds the deck’s own slice, and says so in the caption’s words', () => {
    const { state, playerId } = bench();
    const reading = explainLedger(state, playerId);
    // Something, somewhere, is the deck's: the bench slots an Order and swears a
    // government, and a government always pays *something*.
    const deck = reading.reduce((sum, voice) => sum + voice.byClass.deck, 0);
    expect(deck).not.toBe(0);
    const science = reading.find((voice) => voice.key === 'science')!;
    const caption = ledgerCaption(science);
    expect(caption.startsWith('your deck makes')).toBe(true);
    expect(caption.endsWith('science')).toBe(true);
  });

  it('says “no science yet” rather than “0 of 0” for an empire with nothing', () => {
    const empty = { key: 'science' as const, total: 0, byClass: emptyClasses() };
    expect(ledgerCaption(empty)).toBe('your deck makes no science yet');
    const noDeck = { key: 'gold' as const, total: 9, byClass: { ...emptyClasses(), tiles: 9 } };
    expect(ledgerCaption(noDeck)).toBe('your deck makes none of your 9 gold');
    // A treasury in arrears keeps its sign: `figure` prints a magnitude, and an
    // empire paying twelve gold a turn more than it earns must not read as one
    // earning twelve.
    const owing = { key: 'gold' as const, total: -12, byClass: { ...emptyClasses(), other: -12 } };
    expect(netFigure(-12)).toBe('\u221212');
    expect(ledgerCaption(owing)).toContain('\u221212 gold');
  });
});

// --- band 1: who earned the multiplied gain ---------------------------------

/** The gain a town banked over its own flats, on one voice. */
function gainOf(state: GameState, city: City, key: 'science' | 'production' | 'faith'): number {
  const quote = explainCity(state, city);
  const banked = foldCity(state, city, [], city.queue[0], quote);
  return banked[key] - foldLedgerBag(flatsByClass(readCity(state, city).lines))[key];
}

describe('the gain, and who supplied it', () => {
  it('classifies a percentage by what put it there, never by its words', () => {
    // The four handles a percentage can carry. A building's own `percentYields`
    // clause reaches the list as a **card** (`cityBuildingEffects` is one of
    // `liveEffects`' sources), so the stones are split by `isWonder` inside
    // `classifyCard` and no arm here has to know one from the other.
    const percent = { source: 'x', yield: 'science' as const, percent: 10, stage: 'city' as const };
    expect(classifyPercent({ ...percent, card: 'theLampKeptLit' as CardId })).toBe('deck');
    expect(classifyPercent({ ...percent, card: 'forum' as CardId })).toBe('buildings');
    expect(classifyPercent({ ...percent, card: 'machuPicchu' as CardId })).toBe('wonders');
    expect(classifyPercent({ ...percent, card: 'desertFathers' as CardId })).toBe('religion');
    expect(classifyPercent({ ...percent, resource: 'gems' })).toBe('tiles');
    // A meter tier is the empire's mood and the arrears are its debts: neither
    // is a thing a player built, and `other` is the class that means that.
    expect(classifyPercent({ ...percent, meter: 'happiness' })).toBe('other');
    expect(classifyPercent({ source: 'Treasury in debt', yield: 'science', percent: -25, stage: 'empire' })).toBe('other');
    // And the hammers behind a build, which never pass the card evaluator.
    expect(classifyPercent({ source: 'Barracks', percent: 10, stage: 'city', building: 'barracks' })).toBe('buildings');
    expect(classifyPercent({ source: 'Marble', percent: 15, stage: 'city', resource: 'marble' })).toBe('tiles');
  });

  it('shares a gain in proportion, and never credits a penalty with one', () => {
    // Weighted by magnitude among the lines pushing the *same way* the town
    // moved. A +20 beside a +10 takes two thirds.
    const both = shareGain(30, [
      { into: 'deck', percent: 20 },
      { into: 'buildings', percent: 10 },
    ]);
    expect(both.deck).toBe(20);
    expect(both.buildings).toBe(10);
    // The same-sign rule: arrears took nothing *away* from a town that went up,
    // so arrears earn none of the rise. Weighting by magnitude alone would have
    // made a penalty look like a source of science.
    const mixed = shareGain(10, [
      { into: 'deck', percent: 25 },
      { into: 'other', percent: -25 },
    ]);
    expect(mixed.deck).toBe(10);
    expect(mixed.other).toBe(0);
    // And the other way: a loss is shared among the lines that took it.
    const loss = shareGain(-8, [
      { into: 'deck', percent: 25 },
      { into: 'other', percent: -25 },
    ]);
    expect(loss.other).toBe(-8);
    expect(loss.deck).toBe(0);
  });

  it('hands a gain nobody supplied to “other”, and always adds up', () => {
    expect(shareGain(5, []).other).toBe(5);
    // Every share carries the sign of the total it is part of — a stacked bar
    // whose parts point both ways is not a reading of anything.
    expect(shareGain(5, [{ into: 'deck', percent: -10 }]).other).toBe(5);
    for (const gain of [0, 7, -13, 1001]) {
      const shares = shareGain(gain, [
        { into: 'deck', percent: 25 },
        { into: 'buildings', percent: 10 },
        { into: 'other', percent: -25 },
      ]);
      let sum = 0;
      for (const cls of LEDGER_CLASSES) sum += shares[cls];
      expect(sum, `gain ${gain}`).toBeCloseTo(gain, 9);
    }
  });

  it('gives a card that pays only a percentage a slice of its own', () => {
    // The ruling, end to end (`docs/flags.md`, jj). The Lamp Kept Lit pays no
    // flats at all — a quarter more science in the capital and nothing else —
    // so under the old reading its whole worth was credited to the library and
    // the citizens whose beakers it multiplied.
    const { state, playerId } = bench();
    const town = state.cities.find((city) => city.ownerId === playerId)!;
    const sc = playerById(state, playerId)!.statecraft;
    const deckOf = (): number =>
      explainLedger(state, playerId).find((voice) => voice.key === 'science')!.byClass.deck;
    const totalOf = (): number =>
      explainLedger(state, playerId).find((voice) => voice.key === 'science')!.total;

    const held = deckOf();
    const raised = totalOf();
    const gain = gainOf(state, town, 'science');
    expect(gain).toBeGreaterThan(0);
    // The card is the only thing multiplying this town's science, so the whole
    // of the gain is its own.
    const weights = percentWeights(state, town, explainCity(state, town), 'science');
    expect(weights).toContainEqual({ into: 'deck', percent: 25 });
    expect(weights.filter((weight) => weight.percent > 0)).toHaveLength(1);

    // Whose gain it is, before any rounding: the whole of it, and nobody
    // else's. The rounding to whole slices is `shareOut`'s and pinned there.
    const shares = shareGain(gain, weights);
    expect(shares.deck).toBeCloseTo(gain, 9);
    for (const cls of LEDGER_CLASSES) {
      if (cls !== 'deck') expect(shares[cls], cls).toBe(0);
    }

    sc.slots = sc.slots.filter((entry) => entry?.card !== 'theLampKeptLit');
    bumpRevision(state);
    expect(gainOf(state, town, 'science')).toBe(0);
    // Taking the card out costs the empire the gain, and the deck's slice falls
    // with it — under the old reading it did not move at all.
    expect(raised - totalOf()).toBeCloseTo(gain, 9);
    expect(held - deckOf()).toBeGreaterThan(0);
  });

  it('leaves a building’s own percentage in the buildings’ bar', () => {
    const { state, playerId } = bench();
    const town = state.cities.find((city) => city.ownerId === playerId)!;
    const wasGain = gainOf(state, town, 'science');
    // A Forum: a tenth more science in the town that holds one, written on the
    // building's own row and reaching the percent list as a **card** — which is
    // why no arm of `classifyPercent` has to know a Forum from an Order.
    town.buildings.push('forum');
    bumpRevision(state);
    const weights = percentWeights(state, town, explainCity(state, town), 'science');
    expect(weights).toContainEqual({ into: 'buildings', percent: 10 });
    const gain = gainOf(state, town, 'science');
    expect(gain).toBeGreaterThan(wasGain);
    // The two percentages split the rise between them, ten parts to
    // twenty-five, and the stones' ten stay the stones'.
    const shares = shareGain(gain, weights);
    expect(shares.buildings).toBeGreaterThan(0);
    expect(shares.deck / shares.buildings).toBeCloseTo(2.5, 9);
    expect(shares.buildings + shares.deck).toBeCloseTo(gain, 9);
  });

  it('leaves the empire’s own thumb — a meter, the arrears — in “other”', () => {
    // Arrears is the one percentage a test can force from outside: a treasury
    // under water costs the empire a quarter of its science, at the empire
    // stage, and the loss belongs to nobody a player could have built.
    const { state, playerId } = bench();
    const town = state.cities.find((city) => city.ownerId === playerId)!;
    const player = playerById(state, playerId)!;
    const solvent = explainLedger(state, playerId).find((voice) => voice.key === 'science')!;
    player.gold = -40;
    bumpRevision(state);
    const owing = explainLedger(state, playerId).find((voice) => voice.key === 'science')!;
    const weights = percentWeights(state, town, explainCity(state, town), 'science');
    expect(weights).toContainEqual({ into: 'other', percent: -25 });
    // The empire makes less science than it did, and the town now banks less
    // than its own flats — a **negative** gain, which the same-sign rule hands
    // whole to the line that took it. The deck's +25% earns none of a loss.
    expect(owing.total).toBeLessThan(solvent.total);
    const gain = gainOf(state, town, 'science');
    expect(gain).toBeLessThan(0);
    const shares = shareGain(gain, weights);
    expect(shares.other).toBeCloseTo(gain, 9);
    expect(shares.deck).toBe(0);
    let parts = 0;
    for (const cls of LEDGER_CLASSES) parts += owing.byClass[cls];
    expect(parts).toBe(owing.total);
  });

  it('shares the hammers behind a build to the stones that put them there', () => {
    // Production's city stage carries `productionModifiers` as well as the
    // percent list (`foldCityStages`), so a barracks town building a unit has a
    // gain no percentage on the yield can explain. Left out of the weights, the
    // whole of it would fall to "other".
    const { state, playerId } = bench();
    const town = state.cities.find((city) => city.ownerId === playerId)!;
    town.buildings.push('barracks');
    bumpRevision(state);
    town.queue = [{ kind: 'unit', id: 'warrior' }];
    const weights = percentWeights(state, town, explainCity(state, town), 'production');
    expect(weights).toContainEqual({ into: 'buildings', percent: 25 });
    const gain = gainOf(state, town, 'production');
    expect(gain).toBeGreaterThan(0);
    expect(shareGain(gain, weights).buildings).toBeGreaterThan(0);
    // And nothing but production carries them: the hammers behind a build are a
    // fact about the pair (town, item), never about the town's science.
    expect(percentWeights(state, town, explainCity(state, town), 'science')).not.toContainEqual({
      into: 'buildings',
      percent: 25,
    });
    const hammers = explainLedger(state, playerId).find((voice) => voice.key === 'production')!;
    let parts = 0;
    for (const cls of LEDGER_CLASSES) parts += hammers.byClass[cls];
    expect(parts).toBe(hammers.total);
  });
});

// --- band 1: a card's line on the ground ------------------------------------

describe('a card that pays on the ground', () => {
  it('is the deck’s, not the land’s — and a belief’s is religion’s', () => {
    // The user's follow-up, and the half of the ruling the percentages do not
    // reach: the later Order pools pay through `tileYield`, which lands in the
    // hex's own breakdown, and every worked hex used to be filed whole under
    // "the land".
    const { state, city, playerId } = tileCardBench();
    const flats = flatsByClass(readCity(state, city).lines);
    // Two hills at +2🌾 each, from an Order the seat has slotted.
    expect(flats.deck.food).toBe(4);
    // And a desert at +1☥, from the pantheon.
    expect(flats.religion.faith).toBe(1);
    // The land keeps the ground itself, and keeps it whole: the hills' own
    // hammers are still the land's.
    expect(flats.tiles.production).toBeGreaterThan(0);
    expect(flats.tiles.food).toBeGreaterThan(0);

    // Unslot the Order and the food moves back to nobody — the hex pays it no
    // longer, so the deck's slice falls and the land's does not rise.
    const wasLand = flats.tiles.food;
    const sc = playerById(state, playerId)!.statecraft;
    sc.slots = sc.slots.filter((entry) => entry?.card !== 'terracedHillsides');
    bumpRevision(state);
    const after = flatsByClass(readCity(state, city).lines);
    expect(after.deck.food).toBe(0);
    expect(after.tiles.food).toBe(wasLand);
  });

  it('still mirrors `explainCity`’s flats exactly, hex by hex', () => {
    // The split must not lose or invent a point: the fold of the eight classes
    // is still the town's own flats, which is the guard the whole mirror rests
    // on and the one a subtraction could quietly break.
    const { state, city } = tileCardBench();
    const flats = foldLedgerBag(flatsByClass(readCity(state, city).lines));
    const quote = explainCity(state, city);
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(flats[key], key).toBe(quote.flats[key]);
    }
  });

  it('reaches the aggregate the ceremony counts up', () => {
    const { state, playerId } = tileCardBench();
    const food = explainLedger(state, playerId).find((voice) => voice.key === 'food')!;
    expect(food.byClass.deck).toBeGreaterThan(0);
    let parts = 0;
    for (const cls of LEDGER_CLASSES) parts += food.byClass[cls];
    expect(parts).toBe(food.total);
  });
});

function emptyClasses(): Record<LedgerClass, number> {
  const bag = {} as Record<LedgerClass, number>;
  for (const cls of LEDGER_CLASSES) bag[cls] = 0;
  return bag;
}

// --- the register -----------------------------------------------------------

/**
 * **Every class of card, and where its slice lands.**
 *
 * The classification is by id and never by label (see the module docblock), so
 * this is a walk over the id tables themselves rather than over a run: a row
 * added to `data/statecraft.json` is classified the day it is added, and a
 * *class* added to `CardId` is a compile-time change that this list will not
 * cover — which is exactly the moment somebody has to decide which bar it
 * belongs in.
 */
/**
 * The ids two tables share, and which bar each resolves to.
 *
 * `CardId`'s docblock says the ten id spaces are disjoint and for four rows they
 * are not: three Doctrines carry the same name as a bead, and one building does
 * (`data/statecraft.json`, `data/beads.json`, `data/buildings.json`). Nothing
 * downstream can tell a breakdown line carrying one of them apart, so what
 * matters is that this file resolves it **the way `anyCardDef` already does** —
 * same arms, same order — or a figure would land in one bar with its name in
 * another. Held as a list so that the day the data is disentangled, this is the
 * test that points at it.
 */
const SHARED_IDS: readonly [string, LedgerClass][] = [
  // Doctrine vs bead endeavour, and Doctrine vs bead quest: the deck is asked
  // first in both files, so the deck wins.
  ['theEncyclopaedia', 'deck'],
  ['theTithe', 'deck'],
  ['theStandingArmy', 'deck'],
  // Building vs bead grant: the bead arm is asked before the building arm in
  // both files, so the bead wins — and a bead is "other".
  ['theTurningHeavens', 'other'],
];

const notShared = (id: string): boolean => !SHARED_IDS.some(([shared]) => shared === id);

const CARD_CLASSES: readonly [string, readonly string[], LedgerClass][] = [
  ['governments', GOVERNMENT_IDS, 'deck'],
  ['doctrines', DOCTRINE_IDS, 'deck'],
  ['orders', ORDER_IDS, 'deck'],
  ['beliefs', ALL_BELIEF_IDS, 'religion'],
  ['rites', RITE_IDS, 'religion'],
  ['consecrations', CONSECRATION_IDS, 'religion'],
  ['great people', GREAT_PERSON_IDS, 'people'],
  ['technologies', TECH_IDS, 'other'],
  ['bead feats', BEAD_FEAT_IDS.filter(notShared), 'other'],
  // Three bead rows share a name with a Doctrine (see `SHARED_IDS` below), so
  // they are lifted out of these rows rather than papered over: they are the
  // subject of their own test, and the day the collision is fixed that test is
  // what points at it.
  ['bead endeavours', BEAD_ENDEAVOUR_IDS.filter(notShared), 'other'],
  ['bead quests', BEAD_QUEST_IDS.filter(notShared), 'other'],
  ['bead reckonings', BEAD_RECKONING_IDS.filter(notShared), 'other'],
  ['bead grants', BEAD_GRANT_IDS.filter(notShared), 'other'],
];

/**
 * The two classes that land in **"other"** on purpose, written down rather than
 * discovered: a technology's card effects and a bead's cap. Neither is a source
 * a player goes looking for on this sheet — a technology is not a thing you
 * built and a bead is not a thing you own — and a ninth bar for two rows would
 * be a bar that is empty in nine games out of ten.
 */
const DELIBERATE_OTHERS: readonly string[] = ['technologies', 'beads'];

describe('the source register', () => {
  it('classifies every card in every table, and never by its spelling', () => {
    for (const [what, ids, expected] of CARD_CLASSES) {
      for (const id of ids) {
        expect(classifyCard(id as CardId), `${what} · ${id}`).toBe(expected);
      }
    }
  });

  it('resolves the ids two tables share exactly as `anyCardDef` does', () => {
    // Three tables, as plain strings — the point is which *names* two of them
    // both use, and a typed id would refuse to be compared across spaces that
    // are supposed to be disjoint.
    const tables: readonly string[][] = [
      [
        ...BEAD_FEAT_IDS,
        ...BEAD_ENDEAVOUR_IDS,
        ...BEAD_QUEST_IDS,
        ...BEAD_RECKONING_IDS,
        ...BEAD_GRANT_IDS,
      ],
      [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS],
      [...BUILDING_IDS],
    ];
    // The list is closed: a fifth collision is a data change nobody meant to
    // make, and it should be read here before it is read as a wrong slice.
    const everything = tables.flat();
    const collisions = [...new Set(everything)].filter(
      (id) => tables.filter((table) => table.includes(id)).length > 1,
    );
    expect(collisions.sort()).toEqual(SHARED_IDS.map(([id]) => id).sort());
    for (const [id, expected] of SHARED_IDS) {
      expect(classifyCard(id as CardId), id).toBe(expected);
    }
  });

  it('splits the stones: a wonder is its own bar, an ordinary building is not', () => {
    for (const id of BUILDING_IDS.filter(notShared)) {
      expect(classifyCard(id as CardId), id).toBe(isWonder(id) ? 'wonders' : 'buildings');
    }
  });

  it('names the classes that fall to “other” deliberately', () => {
    // The list is the point of the test: an "other" nobody wrote down is a slice
    // that grows as the game does and tells nobody.
    expect(DELIBERATE_OTHERS).toEqual(['technologies', 'beads']);
    for (const [what, , expected] of CARD_CLASSES) {
      if (expected !== 'other') continue;
      expect(DELIBERATE_OTHERS.some((name) => what.startsWith(name.slice(0, 4)))).toBe(true);
    }
  });

  it('gives every empire-gold line the simulation emits a bar of its own', () => {
    // `TradeGoldLine` offers no handle but its label, so the map is keyed on the
    // head of it — everything before the ` · count` tail, exactly as
    // `empireGoldDetail` in `topBar.ts` keys its hover detail. The heads are read
    // out of `empireGold.ts` itself so a rename there fails here rather than
    // silently moving a bill into "the land".
    const emitted = new Set<string>();
    for (const match of source('empireGold.ts').matchAll(/source: `([^`·]+?)(?: ·|`)/g)) {
      emitted.add(match[1]!.trim());
    }
    expect(emitted.size).toBeGreaterThan(0);
    for (const head of emitted) {
      expect(Object.keys(EMPIRE_GOLD_CLASS), head).toContain(head);
    }
    // And the fallback is the land, because the one line with no fixed head is a
    // luxury's share of the connection gold.
    expect(classifyEmpireGold('Spices · city connections')).toBe('tiles');
    expect(classifyEmpireGold('Unit maintenance · 7 units')).toBe('other');
  });

  /**
   * **The empire's own lines, filed by where they came from** (batch H19). The
   * empire stage is a line of that list now, and it lands in `other` — which is
   * the town half's own answer: `classifyPercent` files a meter tier and the
   * arrears there, so sharing the empire's gain over those weights would hand
   * the whole of it to `other` in any case.
   */
  it('files each empire-scale line by its origin, the stage into “other”', () => {
    const { state, playerId } = bench();
    const lines = explainEmpireLines(state, playerId);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const into = classifyEmpireLine(line);
      if (line.origin === 'resource') expect(into).toBe('tiles');
      if (line.origin === 'route') expect(into).toBe('trade');
      if (line.origin === 'gold') expect(into).toBe(classifyEmpireGold(line.source));
      if (line.origin === 'stage') expect(into).toBe('other');
    }
    // A stage line with a card's markers on it would be a line crediting a
    // meter to a card: the reconciliation carries neither.
    for (const line of lines) {
      if (line.origin !== 'stage') continue;
      expect(line.card).toBeUndefined();
      expect(line.resource).toBeUndefined();
    }
  });

  it('emits every percentage from one function, and every one names its card', () => {
    // **The register that keeps the ruling true.** A percentage line that could
    // not name its card was the whole of the bug: it could only be credited to
    // whoever had put the base flats under it. So there is one emitter, and a
    // second one — a new function handing back the same shape — fails here
    // rather than fails quietly on the sheet.
    const sc = source('statecraft/evaluator.ts');
    expect(sc.split('): CardPercentLine[] {')).toHaveLength(2);
    const body = region(sc, 'export function explainCardPercentYields', 'export interface CardProductionLine');
    const pushes = [...body.matchAll(/list\.push\(\{[\s\S]*?\}\);/g)];
    expect(pushes).toHaveLength(2);
    for (const [push] of pushes) expect(push).toContain('card');
    // The hammers behind a build travel the same seam, in one emitter of their
    // own — and `CardProductionLine.card` is required, so a push that dropped
    // it would not compile.
    expect(sc.split('): CardProductionLine[] {')).toHaveLength(2);
  });

  it('builds every tile line with its card, in the two places one is built', () => {
    // A card's line on the ground is the other half of the ruling: seven
    // producers, but only two literals — `tileLinesFrom`, which every producer
    // but one funnels through, and the amplifier's own helping.
    const sc = source('statecraft/evaluator.ts');
    const built = [...sc.matchAll(/const line: CardTileLine = \{[\s\S]*?\n {6}\};/g)];
    expect(built).toHaveLength(1);
    for (const [literal] of built) expect(literal).toContain('card');
    const funnel = region(sc, 'function tileLinesFrom', 'export interface CardPercentLine');
    expect(funnel).toContain('const { source, card, effect } of found');
    expect(funnel).toMatch(/const line: CardTileLine = \{\n\s*source,\n\s*card,/);
  });

  it('hands the card on at every seam between the evaluator and this sheet', () => {
    // Three propagations in the yields layer, and each is a place the id was
    // being dropped on the floor before 2026-09-07. A dropped id is not an
    // error — it is a slice landing in "the land" and nobody hearing about it.
    // Two of them are the town's file since batch E3b, the third the hex's.
    const ct = source('yields/town.ts');
    expect(region(ct, 'export function cityYieldPercents', 'export function foldCityStages')).toContain(
      'card: line.card',
    );
    expect(region(ct, 'export function productionModifiers', 'export function modifierPercent')).toContain(
      'card: line.card',
    );
    // And the hex's own breakdown: the card lines, and the two percentage
    // shares at the foot, which carry a card only when they have exactly one.
    const tile = region(source('yields/hex.ts'), 'const sourceIndex = new Map<string, number>()', 'export function foldTileLines');
    expect(tile).toContain('card: line.card');
    expect(tile.split('card: soleCard(')).toHaveLength(3);
  });

  it('gives every class a plain name, with no identifier in it', () => {
    for (const cls of LEDGER_CLASSES) {
      const name = LEDGER_CLASS_NAME[cls];
      expect(name.length, cls).toBeGreaterThan(0);
      expect(name, cls).toBe(name.toLowerCase());
    }
    expect(LEDGER_CLASS_NAME.deck).toBe('your deck');
  });
});

// --- the arithmetic ---------------------------------------------------------

describe('sharing a multiplied total back out', () => {
  it('always hands out exactly the total, however the rounding falls', () => {
    for (const total of [0, 1, 7, 96, -12, 1001]) {
      for (const weights of [[1, 1, 1], [3, 0, 1], [7, 11, 13, 17], [1]]) {
        const shares = shareOut(total, weights);
        expect(shares.reduce((sum, part) => sum + part, 0), `${total} over ${weights}`).toBe(total);
      }
    }
  });

  it('hands a weightless basket’s figure to the last slot', () => {
    // Which callers make `other` — a number with no earner is what that class is
    // for, and dropping it would make the parts stop summing to the total.
    expect(shareOut(5, [0, 0, 0])).toEqual([0, 0, 5]);
    expect(shareOut(0, [])).toEqual([]);
  });

  it('keeps a share roughly proportional to what earned it', () => {
    expect(shareOut(100, [1, 3])).toEqual([25, 75]);
  });
});

describe('the sparkline', () => {
  it('spans the box, first sample at the left and last at the right', () => {
    const points = sparkPoints([0, 5, 10], 100, 40, 0, 10);
    expect(points[0]).toEqual([0, 40]);
    expect(points[2]).toEqual([100, 0]);
  });

  it('draws one sample as a reading, not as a dot in the corner', () => {
    expect(sparkPoints([4], 100, 40, 0, 10)).toEqual([[100, 24]]);
  });
});

// --- band 2: the session's curve --------------------------------------------

function sample(turn: number): LedgerSample {
  const zero = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  return { turn, age: 1, totals: { ...zero }, deck: { ...zero } };
}

describe('the curve’s ring buffer', () => {
  it('keeps the newest turns and drops the oldest, at the cap', () => {
    const history = createLedgerHistory(4);
    for (let turn = 1; turn <= 9; turn += 1) history.push(sample(turn));
    expect(history.samples().map((entry) => entry.turn)).toEqual([6, 7, 8, 9]);
  });

  it('caps at a figure the module names, not one a screen made up', () => {
    expect(LEDGER_HISTORY_CAP).toBe(400);
    const history = createLedgerHistory();
    expect(history.cap).toBe(LEDGER_HISTORY_CAP);
  });

  it('empties on a new game — a curve belongs to the game that drew it', () => {
    const history = createLedgerHistory(4);
    history.push(sample(1));
    history.clear();
    expect(history.samples()).toEqual([]);
  });

  it('samples the six totals and the deck’s share of each', () => {
    const { state, playerId } = bench();
    const taken = ledgerSample(state, playerId);
    expect(taken.turn).toBe(state.turn);
    expect(taken.age).toBeGreaterThanOrEqual(1);
    const headline = readEmpire(state, playerId).totals;
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(taken.totals[key], key).toBe(headline[key]);
      expect(taken.deck[key], `deck ${key}`).toBeTypeOf('number');
    }
  });

  it('says out loud that the curve is the session’s and not the save’s', () => {
    expect(LEDGER_CURVE_FOOTNOTE).toContain('this page is open');
    expect(LEDGER_CURVE_FOOTNOTE).toContain('save');
    expect(LEDGER_CURVE_FOOTNOTE).not.toMatch(/\d/);
  });
});

// --- band 3: the labelled hole ----------------------------------------------

describe('the band that is not built yet', () => {
  it('carries the eyebrow the doc of record names', () => {
    expect(LEDGER_BAND3_EYEBROW).toBe('what the deck has produced');
    expect(source('ledgerScreen.ts')).toContain('LEDGER_BAND3_EYEBROW');
  });

  it('says the lifetime figures are not kept, and prints no number standing in', () => {
    // The Reliquary's ruling one screen over: an em dash where a figure should
    // be is a number the screen does not have, printed as though it did.
    expect(LEDGER_BAND3_NOTE).toContain('not kept yet');
    expect(LEDGER_BAND3_NOTE).not.toMatch(/\d/);
    expect(LEDGER_BAND3_NOTE).not.toContain('—');
  });
});

// --- the sheet, and the door ------------------------------------------------

describe('the eighth parchment sheet', () => {
  it('joins the one capped-overlay rule rather than growing a block of its own', () => {
    // Batch H5: the cap used to name the eight overlay ids in five places, and
    // now belongs to the paper — `.statecraft-overlay` is what a sheet wears to
    // borrow this furniture, and the cap is part of what it is borrowing. So
    // what this sheet has to show is that it wears the class and says nothing
    // about the cap of its own.
    const css = raw('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const capped = css.match(/\.statecraft-overlay \{[^}]*overflow: hidden;/);
    expect(capped, 'the capped-overlay rule').not.toBeNull();
    const sheets = css.match(/\.statecraft-overlay \.statecraft-sheet \{[\s\S]*?max-height: 100%/);
    expect(sheets, 'the capped sheet rule').not.toBeNull();
    expect(raw('index.html')).toMatch(/id="ledger-overlay"\s*\n\s*class="statecraft-overlay"/);
    // And it names itself in no cap rule of its own. One would be the sheet
    // growing a block that agreed with the shared one today.
    expect(css).not.toContain('#ledger-overlay .statecraft-sheet');
  });

  it('stacks its bands at the breakpoint the other sheets share', () => {
    const css = raw('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const queries = [...css.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)].filter(
      ([, , body]) => body.includes('.statecraft-overlay'),
    );
    expect(queries).toHaveLength(1);
    expect(Number(queries[0]![1])).toBe(860);
    expect(queries[0]![2]).toContain('.ldg-sparks');
  });

  it('is a dialog on the page, with a close button the screen can focus', () => {
    const html = raw('index.html');
    expect(html).toContain('id="ledger-overlay"');
    expect(html).toContain('id="ledger-body"');
    expect(html).toContain('id="ledger-close"');
  });
});

describe('the door in the yield strip', () => {
  it('makes a yield chip a button, with the strip’s own four lines', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain('onOpenLedger?: (key: YieldKey) => void;');
    // The affordance, the role, the click and the key — the culture chip's own
    // four, said again. A `role` without the class is a button that does not
    // look like one; the class without the keydown is a button a keyboard
    // cannot press.
    const at = bar.indexOf('onOpenLedger(key)');
    expect(at).toBeGreaterThan(-1);
    const window = bar.slice(Math.max(0, at - 800), at + 200);
    expect(window).toContain("classList.add('civ-yield-clickable')");
    expect(window).toContain("setAttribute('role', 'button')");
    expect(window).toContain('open the Ledger');
  });

  it('is wired from main, and hands the chip’s own voice through', () => {
    const main = source('main.ts');
    expect(main).toContain('onOpenLedger: (key) => {');
    expect(main).toContain('ledger?.open(key);');
  });

  it('pushes its disposer into the register every per-game screen joins', () => {
    // Entry LVII: the Ledger binds a capturing `keydown` on the window like
    // every other parchment sheet, so a leaked one would answer Escape for a
    // game that is over.
    expect(source('main.ts')).toContain('gameDisposers.push(() => ledger?.dispose());');
    // The listener itself is the shell's since batch H5 — one binding for all
    // eight sheets, unbound by the `dispose` the register above holds.
    const shell = source('modalShell.ts');
    expect(shell).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(shell).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source('ledgerScreen.ts')).toContain('const shell = createModalShell({');
  });

  it('samples the curve at the one clean moment, and empties it on a new game', () => {
    const main = source('main.ts');
    const at = main.indexOf('onTurnResolved: () => {');
    expect(at).toBeGreaterThan(-1);
    expect(main.slice(at, at + 900)).toContain('ledgerHistory.push(ledgerSample(');
    expect(main).toContain('ledgerHistory.clear();');
  });

  it('takes its turn in the one-sheet-at-a-time rule, both ways', () => {
    const main = source('main.ts');
    expect(main).toContain('(ledger?.isOpen ?? false)');
    expect(main).toContain('ledger?.close();');
    // The way out is the register's, not a call in `showLanding`: `boot` sweeps
    // the same list, so a save loaded without visiting the landing is covered.
    expect(main).toContain('gameDisposers.push(() => ledger?.dispose());');
  });
});
