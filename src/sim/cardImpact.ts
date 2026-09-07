/**
 * What a card would be **worth** — the empire's own ledger, read twice.
 *
 * The stamp on a tarot face (the deckbuilder mock, 2026-09-03) prints one
 * figure: what this Order, Doctrine, charter, belief or legacy changes about
 * what the realm makes every turn. This module is where that figure comes from,
 * and the whole of its method is `explainBuildingPreview`'s one scale out — a
 * **ghost**, never a mutation:
 *
 *   · a shallow copy of the seat with the card held and slotted, dropped into a
 *     shallow copy of the state, and
 *   · the difference between the two readings of the very evaluators the turn
 *     resolution banks from.
 *
 * Nothing in `state` is touched, nothing is cloned deeply, and **no rule is
 * reimplemented**. A card shape that does not exist yet is stamped correctly the
 * day it is added, because the thing being diffed is `cityYields` and
 * `explainEmpireLines` themselves. That is the same bargain the build screen's
 * preview struck, and it is the only one worth striking: a stamp computed beside
 * the rules is a stamp that disagrees with the turn a player ends.
 *
 * Rule 5, at the scale of a card
 * ------------------------------
 * The impact is an ordered, **labelled** list and the stamp's figure is its
 * fold. Never the other way round: nothing here computes a total and then looks
 * for reasons. The list, in the order a player reads it:
 *
 *   1. **the towns** — one line per source whose flat city payout woke up, and
 *      one line per source whose *ground* lines changed what the worked hexes
 *      pay, summed over every town this empire holds;
 *   2. **one reconciliation line**, when the arithmetic needs it — Entry XVII's
 *      two multiplications working on the new flats, a `yieldConversion`'s
 *      share, and every floor on the way. `applyRiders`' idiom, exactly as the
 *      building preview's: a line of the list carrying *the difference it makes
 *      to the running figure*, never a multiplication performed afterwards;
 *   3. **the realm** — the empire-scale card lines, the luxuries' empire
 *      signatures, the caravans abroad, the treasury's ledger and the empire
 *      stage over the additive fold of them, each diffed under its own label;
 *   4. **the meters themselves** — what the card pays into happiness and
 *      authority *in its own hand*. Festival Days pays four contentment and not
 *      one yield; Provincial Governors pays three writ. Those are the card's
 *      whole sentence, and for as long as this list carried only the six yields
 *      the stamp on such a card was either blank or — worse — a beaker it never
 *      paid, borrowed from the tier its contentment happened to flip (user,
 *      2026-09-03: "we should have happiness and authority be yields that appear
 *      in the preview numbers, its confusing when they aren't shown"). So a
 *      meter movement is a line of its own (`kind: 'meter'`, carrying the meter
 *      and the points), read as a diff of `happinessOf`/`authorityOf` across the
 *      same two ghosts — the meters' own evaluators, no rule reimplemented;
 *   5. **the knock-ons** — what the card did to the empire's *meters*, and
 *      through them to every town. A card paying three contentment can flip a
 *      tier and hand the realm a percentage on science and culture, and that
 *      science is not the card's own line: it is what the card *unlocked*. So a
 *      cascade is its own
 *      `kind` and carries the meter that moved. Nothing is drawn for it on a
 *      card face — the number stands alone (the no-popup ruling) — but the
 *      hover breakdown leans on the label, and a stamp that folded a cascade in
 *      silently would be claiming an Order pays science when what it pays is
 *      contentment.
 *
 * Four and five are the same meter twice and are held apart on purpose: line 4
 * is the *points the card pays* and is a figure on its face; line 5 is the yield
 * a tier those points crossed unlocked, and is the hover's business only.
 *
 * Held apart by construction, not by taste: lines 1–3 are read with the
 * **empire's meters held at the reading they have today**, so the card's own
 * arithmetic cannot borrow the tier it caused. The knock-on lines are then the
 * sequential deltas as each meter's new reading is let in — happiness, then
 * authority, then arrears — which is `applyRiders`' ordered fold again and is
 * exact rather than approximate, floors and all.
 *
 * A card with no per-turn footprint
 * ---------------------------------
 * Some cards pay nothing standing and everything on an **occasion** — culture on
 * a kill, faith on a chop, a turn of science on a technology. A ghost-diff of
 * those is honestly zero, and a zero on a stamp is a lie about a card that is
 * often the best in the hand. So an occasion rider is reported in its own form
 * (`kind: 'occasion'`): the grant read off the row, in the occasion's own words
 * (`occasionWords`' table, through `describeCard`'s vocabulary). The interface
 * stamps those with a thunk rather than a count-up. A card that is both gets
 * both, and a card that is neither — a pure behaviour rule — reports **nothing
 * at all**, which is the honest answer and is what the flourish is for.
 *
 * Pure, and it means it
 * ---------------------
 * `explainCardImpact` mutates nothing, rolls nothing, and is a function of
 * `(state, playerId, subject)` alone — ask it twice and get the same list, ask
 * it and the state is byte-identical afterwards. `test/sim/cardImpact.test.ts`
 * pins both.
 */

import {
  type CityYields,
  type EmpirePercents,
  type TileYieldContext,
  type TileYieldContribution,
  cityContext,
  cityQuote,
  cityYields,
  emptyCityYields,
  empirePercents,
  explainEmpireLines,
  explainTileYield,
  foldEmpireLines,
} from './cities';
import { type GameState, type Player, foundedReligion, playerById } from './state';
import {
  type CardEffect,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  doctrineDef,
  governmentDef,
  isOrderId,
  orderDef,
  orderFitsSlot,
  slotLayout,
} from './statecraftData';
import { type BeliefId, beliefDef, beliefPoolOf } from './religionData';
import {
  cardCityYields,
  describeEffects,
  occasionWords,
  holdsOrder,
  slotOf,
  slotTypesOf,
  stripRefs,
} from './statecraft';
import { CITY_YIELD_KEYS, type CityYieldKey } from './resourceData';
import { type GreatPersonId, greatPersonDef } from './greatPeopleData';
import { type MeterId, authorityOf, happinessOf } from './meters';
import { getTileAt } from './map';
import type { Tile } from './map';
import { highestAge } from './techData';
import type { City } from './state';

/**
 * Which register a line belongs to — the registers the module docblock lists.
 *
 * `'knockOn'` is the one the interface treats differently rather than merely
 * labels: it is the *consequence* of the card rather than the card's own
 * payment, and a stamp that folded the two into one figure with one voice would
 * be claiming an Order pays science when what it pays is contentment.
 *
 * `'meter'` is the other half of that same distinction and pays in no yield at
 * all: it is what the card puts into happiness or authority itself, in points,
 * and it is a figure on the card's face beside the yields.
 */
export type CardImpactKind = 'city' | 'empire' | 'meter' | 'knockOn' | 'occasion';

/**
 * One reason a card changes what the realm makes — the shape the stamp is the
 * fold of.
 *
 * `BuildingPreviewLine`'s sibling one scale out, and deliberately the same six
 * voices in the same order: a card and a barracks are two answers to one
 * question ("what would change here"), and two shapes for it is how the two
 * surfaces come to disagree about what a line is.
 */
export interface CardImpactLine {
  /** Display label: "The Ballad-Weavers", "Happiness", "City connections". */
  source: string;
  kind: CardImpactKind;
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
  /** The meter that moved. Set on `'meter'` and `'knockOn'` lines, nowhere else. */
  meter?: MeterId;
  /**
   * The meter movement itself, in points — a card's own `+4` contentment or
   * `+3` writ. `'meter'` only, and never one of the six voices: a meter is not
   * a yield, nothing banks it, and folding it into `foldCardImpact` would put
   * contentment into the treasury.
   */
  amount?: number;
  /** The occasion's own words — "killing a barbarian unit". `'occasion'` only. */
  occasion?: string;
  /**
   * A rider that scales *the occasion's own* payout rather than adding to it,
   * in whole percent. `'occasion'` only, and never printed as a yield.
   */
  percent?: number;
  /**
   * A grant with no figure in any of the six voices — a heal, a gifted piece,
   * a turn of a rate. Said in words rather than dropped, because a rider that
   * paid nothing printable is still a rider.
   */
  note?: string;
}

/**
 * The card an impact is being asked about, and the state it would be held in.
 *
 * A tagged union rather than a bare `CardId` because the *ghost* differs per
 * class and the difference is the whole of the answer: an Order is held **and
 * slotted**, a Doctrine is simply held, a charter empties every office (the
 * amnesty is what adoption is), a belief joins the pantheon or the religion's
 * own shelf (`beliefPoolOf` decides which), and a legacy joins
 * the honoured dead. A card has one face since the levelling ruling of
 * 2026-09-04, so an Order is named by its id alone — there is no level left to
 * ask about.
 */
export type CardImpactSubject =
  | { kind: 'order'; id: OrderId }
  | { kind: 'doctrine'; id: DoctrineId }
  | { kind: 'government'; id: GovernmentId }
  | { kind: 'belief'; id: BeliefId }
  | { kind: 'legacy'; id: GreatPersonId };

/** A line paying nothing in any voice, before the occasion fields are read. */
function emptyLine(source: string, kind: CardImpactKind): CardImpactLine {
  return { source, kind, food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
}

/** True when a line moves at least one voice. Such lines are never in a list. */
function pays(line: CardImpactLine): boolean {
  return CITY_YIELD_KEYS.some((key) => line[key] !== 0);
}

/**
 * The stamp's figure: **every standing line summed**, occasions excluded.
 *
 * The only place an impact's total is computed. Occasions are left out because
 * they are not a rate — "+4 culture a kill" added to a per-turn figure would be
 * a number that is true on no turn at all — and the interface stamps them with
 * their own gesture.
 */
export function foldCardImpact(lines: readonly CardImpactLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) {
    if (line.kind === 'occasion') continue;
    for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  }
  return total;
}

/** The occasion half of the same list, folded the same way. Never mixed in. */
export function foldCardOccasions(lines: readonly CardImpactLine[]): CityYields {
  const total = emptyCityYields();
  for (const line of lines) {
    if (line.kind !== 'occasion') continue;
    for (const key of CITY_YIELD_KEYS) total[key] += line[key];
  }
  return total;
}

/** Does this card change anything the realm banks every turn? */
export function hasPerTurnImpact(lines: readonly CardImpactLine[]): boolean {
  return lines.some((line) => line.kind !== 'occasion');
}

/**
 * The two worlds the stamp is the difference between: the realm **without** the
 * card, and the realm **with** it.
 *
 * A pair rather than one ghost, because the question is asked from both sides
 * and the answer must be the same number either way. On the draft's face the
 * card is not held, so the real state is the *without* and the ghost is the
 * *with*; on the Statecraft screen a card already in a slot is in force, so the
 * ghost is the state with it taken out and the real state is the *with*. One
 * subtraction, one sign, and a slotted card's stamp reads as what it is paying
 * rather than as a row of noughts.
 *
 * Both ghosts are **shallow**, exactly as `explainBuildingPreview`'s is: every
 * field not named is shared with the real seat, and every array that is named is
 * *replaced* rather than pushed to, so nothing downstream can write through a
 * ghost into `state`.
 *
 * `null` for a card this module cannot place — an id that names nothing, or a
 * charter the empire has already sworn (adoption is not a thing that can be
 * undone, so there is no *without* to read).
 */
function ghostPair(
  state: GameState,
  player: Player,
  subject: CardImpactSubject,
): { without: GameState; with: GameState } | null {
  const sc = player.statecraft;
  const swap = (seat: Player): GameState => ({
    ...state,
    players: state.players.map((other) => (other.id === seat.id ? seat : other)),
  });
  const forward = (seat: Player): { without: GameState; with: GameState } => ({
    without: state,
    with: swap(seat),
  });
  const backward = (seat: Player): { without: GameState; with: GameState } => ({
    without: swap(seat),
    with: state,
  });

  switch (subject.kind) {
    case 'order': {
      if (!isOrderId(subject.id)) return null;
      const held = holdsOrder(sc, subject.id);
      const at = slotOf(sc, subject.id);
      if (at >= 0) {
        // In force. The reading is what taking it out of its office would cost,
        // which is the same figure with the same sign — `isSlotted` is the whole
        // of the test, because an Order pays from a slot and nowhere else.
        return backward({
          ...player,
          statecraft: { ...sc, slots: sc.slots.map((slot, index) => (index === at ? null : slot)) },
        });
      }
      const orders = held ? sc.orders : [...sc.orders, subject.id];
      let slots = sc.slots;
      if (at < 0) {
        // The first office that is empty and admits it. A hand with no such
        // office gets one appended, and that is the deliberate reading: the
        // stamp answers *what this card is worth*, not what displacing another
        // card would cost — the office a player would empty to make room is a
        // second question, and a stamp that guessed at it would be answering a
        // question nobody asked.
        const layout = slotTypesOf(sc);
        const entry = { card: subject.id, sealedUntil: state.turn };
        let free = -1;
        for (let index = 0; index < slots.length; index++) {
          if (slots[index] === null && orderFitsSlot(subject.id, layout[index] ?? 'wildcard')) {
            free = index;
            break;
          }
        }
        slots =
          free >= 0 ? slots.map((slot, index) => (index === free ? entry : slot)) : [...slots, entry];
      }
      return forward({ ...player, statecraft: { ...sc, orders, slots } });
    }
    case 'doctrine': {
      if (sc.doctrines.includes(subject.id)) {
        return backward({
          ...player,
          statecraft: { ...sc, doctrines: sc.doctrines.filter((id) => id !== subject.id) },
        });
      }
      return forward({ ...player, statecraft: { ...sc, doctrines: [...sc.doctrines, subject.id] } });
    }
    case 'government': {
      // **The amnesty is the adoption** (`adoptGovernmentAt`): the new layout's
      // offices are not the old one's, so every card comes out. Mirrored here
      // rather than approximated, because a charter's stamp that quietly kept
      // the old law slotted would be the one number on the sheet that lies
      // about the most expensive decision in the game.
      if (sc.government === subject.id) return null;
      return forward({
        ...player,
        statecraft: {
          ...sc,
          government: subject.id,
          slots: slotLayout(subject.id).map(() => null),
        },
      });
    }
    case 'belief': {
      // **Which shelf a belief sits on decides which ghost it needs.** Three
      // pools share one id space (`beliefPoolOf`) and three different evaluators
      // read them: a pantheon god is the seat's own (`liveEffects` walks
      // `Player.pantheon.beliefs`), a follower belief is read city-locally off
      // the faith each town follows (`followerBeliefEffects`), and an enhancer
      // belief pays whoever holds the holy site. A ghost that put all three in
      // the pantheon stamped a follower belief as though every town this empire
      // owns kept the faith — which is the one thing that pool never promises.
      const pool = beliefPoolOf(subject.id);
      if (pool !== null) {
        const mine = foundedReligion(state, player.id);
        // No faith, no shelf, and therefore no reading — the `null` a charter
        // already sworn answers with, for the same reason: there is no other
        // world to diff against.
        if (mine === undefined) return null;
        const shelf = pool === 'follower' ? mine.follower : mine.enhancer;
        // The religion is swapped whole, shallowly, exactly as the seat is: the
        // named array is *replaced* rather than pushed to, so nothing downstream
        // can write through a ghost into `state`.
        const swapReligion = (held: BeliefId[]): GameState => ({
          ...state,
          religions: state.religions.map((faith) =>
            faith.id !== mine.id
              ? faith
              : pool === 'follower'
                ? { ...faith, follower: held }
                : { ...faith, enhancer: held },
          ),
        });
        if (shelf.includes(subject.id)) {
          return { without: swapReligion(shelf.filter((id) => id !== subject.id)), with: state };
        }
        return { without: state, with: swapReligion([...shelf, subject.id]) };
      }
      const pantheon = player.pantheon;
      if (pantheon.beliefs.includes(subject.id)) {
        return backward({
          ...player,
          pantheon: { ...pantheon, beliefs: pantheon.beliefs.filter((id) => id !== subject.id) },
        });
      }
      return forward({
        ...player,
        pantheon: { ...pantheon, beliefs: [...pantheon.beliefs, subject.id] },
      });
    }
    case 'legacy': {
      // A legacy reaches every ledger through `Player.legacies` and nothing
      // else (`liveEffects`' sixth source), so the ghost is the record the
      // spend would push — or, for one already honoured, the record removed. A
      // **revoked** record contributes nothing either way and is left alone.
      const honoured = player.legacies.some(
        (held) => held.id === subject.id && held.revoked !== true,
      );
      if (honoured) {
        return backward({
          ...player,
          legacies: player.legacies.filter(
            (held) => !(held.id === subject.id && held.revoked !== true),
          ),
        });
      }
      return forward({
        ...player,
        legacies: [...player.legacies, { id: subject.id, age: highestAge(player.techsResearched) }],
      });
    }
  }
}

/** The card's own effects. One row, one face. */
function subjectEffects(subject: CardImpactSubject): readonly CardEffect[] {
  switch (subject.kind) {
    case 'order':
      return isOrderId(subject.id) ? orderDef(subject.id).effects : [];
    case 'doctrine':
      return doctrineDef(subject.id).effects;
    case 'government':
      return governmentDef(subject.id).effects;
    case 'belief':
      return beliefDef(subject.id).effects;
    case 'legacy':
      return greatPersonDef(subject.id).legacy;
  }
}

/** The card's display name, for the labels the diff cannot name itself. */
function subjectName(subject: CardImpactSubject): string {
  switch (subject.kind) {
    case 'order':
      return orderDef(subject.id).name;
    case 'doctrine':
      return doctrineDef(subject.id).name;
    case 'government':
      return governmentDef(subject.id).name;
    case 'belief':
      return beliefDef(subject.id).name;
    case 'legacy':
      return greatPersonDef(subject.id).name;
  }
}

/**
 * A `(source → line)` accumulator that keeps **first-seen order**, which is the
 * evaluator's own order and therefore the order a player already reads these
 * names in on the city panel.
 */
class Bucket {
  private readonly map = new Map<string, CardImpactLine>();
  private readonly order: string[] = [];

  add(source: string, kind: CardImpactKind, key: CityYieldKey, amount: number): void {
    if (amount === 0) return;
    let line = this.map.get(source);
    if (!line) {
      line = emptyLine(source, kind);
      this.map.set(source, line);
      this.order.push(source);
    }
    line[key] += amount;
  }

  lines(): CardImpactLine[] {
    const list: CardImpactLine[] = [];
    for (const source of this.order) {
      const line = this.map.get(source)!;
      if (pays(line)) list.push(line);
    }
    return list;
  }
}

/** Every yield-bearing line one empire's cards pay one town, keyed by source. */
function cityCardSums(state: GameState, city: City): Map<string, CityYields> {
  const map = new Map<string, CityYields>();
  for (const line of cardCityYields(state, city)) {
    // The `×N` tail is stripped from the **key** and kept on the label, for
    // `explainBuildingPreview`'s reason exactly: a `countScaled` line re-labels
    // the very line the card changes, and keyed raw the two halves of the diff
    // never meet.
    const key = line.source.replace(/ · ×\d+$/, '');
    let sum = map.get(key);
    if (!sum) {
      sum = emptyCityYields();
      map.set(key, sum);
    }
    for (const voice of CITY_YIELD_KEYS) sum[voice] += line[voice];
  }
  return map;
}

/**
 * What every town this empire holds makes, under a stated meter reading.
 *
 * The empire's half of the percentages is handed **in** rather than taken, which
 * is the whole of how the direct lines and the knock-on lines are held apart:
 * ask twice with the same `empire` and the difference is the card's own
 * arithmetic; ask again with the card's own meter reading and the further
 * difference is what the card *unlocked*. `cityQuote`'s parameter, used for the
 * purpose its docblock names.
 */
function townsTotal(state: GameState, playerId: number, empire: EmpirePercents): CityYields {
  const total = emptyCityYields();
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    const yields = cityYields(
      state,
      city,
      [],
      city.queue[0],
      cityQuote(state, city, [], empire),
    );
    for (const key of CITY_YIELD_KEYS) total[key] += yields[key];
  }
  return total;
}

/**
 * Everything `collectYields` banks beside the towns — the luxuries' empire
 * signatures, the caravans abroad, the treasury's ledger, the cards' empire
 * payouts and the empire stage over the additive fold of them — summed by the
 * label a player reads.
 *
 * All of it, because all of it reads this empire's cards (`cardAmplifier`
 * reaches into the luxuries and into the connections' gold), and a stamp that
 * quoted only the towns would be a figure the turn resolution disagrees with —
 * the claim the top bar's headline makes about itself, one question over.
 *
 * **The meters are handed in** (batch H19), for the reason `townsTotal` beside
 * it takes them: the empire's lines take the empire stage now, so a diff that
 * let each ghost read its own tier would let the card's own arithmetic borrow
 * the tier it caused. Lend both sides the reading the realm has today and the
 * difference is the card's; the ladder in `explainCardImpact` then lets the new
 * reading in a rung at a time, which is where a tier the card flipped belongs.
 */
function empireLinesOf(
  state: GameState,
  playerId: number,
  empire: EmpirePercents,
): Map<string, CityYields> {
  const map = new Map<string, CityYields>();
  const record = (source: string, values: Partial<CityYields>): void => {
    let sum = map.get(source);
    if (!sum) {
      sum = emptyCityYields();
      map.set(source, sum);
    }
    for (const key of CITY_YIELD_KEYS) sum[key] += values[key] ?? 0;
  };
  for (const line of explainEmpireLines(state, playerId, empire)) {
    // A treasury line is keyed on the **head** of its label — everything before
    // the ` · count` tail — which is the handle every reader of one uses, and
    // which keeps "Unit maintenance · 7 units" and "· 8 units" the same row of
    // the diff. Every other line keeps its whole label, less the `· ×2` an
    // amplifier hangs on a card's, so a doubled payout stays one row too.
    const key =
      line.origin === 'gold'
        ? (line.source.split(' · ')[0] ?? line.source)
        : line.source.replace(/ · ×\d+$/, '');
    record(key, line);
  }
  return map;
}

/**
 * The empire's own lines as one figure per voice, under a stated meter reading —
 * `townsTotal`'s twin, and the half of the ladder that moved in batch H19.
 *
 * A tier the card flipped multiplies the empire's lines exactly as it multiplies
 * every town's basket, so the knock-on rungs have to price both or the last rung
 * would not be the true reading and the list would no longer fold to the diff.
 */
function empireTotal(state: GameState, playerId: number, empire: EmpirePercents): CityYields {
  return foldEmpireLines(explainEmpireLines(state, playerId, empire));
}

/**
 * The **cumulative** ladder from the empire's reading today to its reading with
 * the card in force: happiness let in, then authority, then the treasury.
 *
 * The knock-on split's instrument, and cumulative rather than one-at-a-time for
 * `applyRiders`' reason — each line of an ordered list carries *the difference
 * it makes to the running figure*, so the last rung is `ahead` itself and the
 * whole list therefore folds to the true diff, floors and all. Every entry of
 * `EmpirePercents` carries the meter that made it and every one lands in the
 * same empire-stage sum (`applyStages`), so swapping one meter's entries
 * wholesale is exact: a sum is a sum whichever order it is built in.
 *
 * The labels are `empirePercents`' own — no wording is invented here that a
 * player does not already read on the city panel's percentage lines.
 */
/**
 * What each meter is called on a line of this list — used by the meter lines and
 * by the cascade ladder below, so the two readings of one meter cannot come to
 * be labelled two different ways.
 *
 * The words are the top bar's own; nothing is invented here that a player does
 * not already read on the chip.
 */
const METER_WORD: Record<MeterId, string> = {
  happiness: 'Happiness',
  authority: 'Authority',
};

/** The two meters, in the order the top bar's chips stand and this list reads. */
const METER_ORDER: readonly MeterId[] = ['happiness', 'authority'];

/** One meter's total, through the meter's own fold and nothing else. */
function meterTotal(state: GameState, playerId: number, meter: MeterId): number {
  return meter === 'happiness' ? happinessOf(state, playerId) : authorityOf(state, playerId);
}

/**
 * A meter movement, **at the precision a meter is read at**: one tenth, which is
 * `signedFigure`'s rule on the top bar's own chips.
 *
 * Not fastidiousness. Happiness folds a list carrying fractional terms — the
 * crowding curve, a demand line multiplied by a `meterRule` factor — so the
 * difference between two folds is subject to IEEE addition, and Festival Days'
 * four contentment arrives here as `3.9999999999999996`. Rounded at the reading
 * rather than at the printer because a card's stamp is not the only thing that
 * will ever ask this list what a card pays, and a figure that is four everywhere
 * but in one caller's string is the drift that costs an afternoon.
 */
function meterMoved(from: number, to: number): number {
  return Math.round((to - from) * 10) / 10;
}

/**
 * True when the empire's percentages read **exactly the same** with the card and
 * without it — the card moved neither meter's tier and put the treasury neither
 * into debt nor out of it.
 *
 * The overwhelmingly common case, and the whole of what the ladder below costs
 * when it holds: every rung of it prices every town in the empire again, three
 * more sweeps on top of the two the direct diff already took, to report three
 * lines that are nought (batch H18 measured the ladder at three of the seven
 * town sweeps one stamp pays for).
 *
 * It is a **proof and not a hope** that skipping it prints the same list. Two of
 * the three rungs are the same percentages in the same order as `townsThen`'s —
 * every meter line carries a `meter`, so `swap(['happiness','authority'])` keeps
 * none of the base list and takes all of the ahead one, and the last rung is
 * `ahead` itself. The first rung is those same lines re-ordered, and a
 * re-ordering is only safe to call equal because `foldStages` sums the
 * percentages and nothing else reads them: a sum of **whole** numbers is the
 * same figure in any order, which is why the whole-number test is part of the
 * question rather than an assumption about the data. A fractional percentage
 * ever landing here falls through and the ladder is walked as it always was.
 */
function metersUnmoved(base: EmpirePercents, ahead: EmpirePercents): boolean {
  const same = (
    was: readonly EmpirePercents['meters'][number][],
    now: readonly EmpirePercents['meters'][number][],
  ): boolean => {
    if (was.length !== now.length) return false;
    for (let at = 0; at < was.length; at++) {
      const a = was[at]!;
      const b = now[at]!;
      if (!Number.isInteger(a.percent)) return false;
      if (
        a.percent !== b.percent ||
        a.yield !== b.yield ||
        a.stage !== b.stage ||
        a.source !== b.source ||
        a.meter !== b.meter
      ) {
        return false;
      }
    }
    return true;
  };
  return same(base.meters, ahead.meters) && same(base.arrears, ahead.arrears);
}

function knockOnLadder(
  base: EmpirePercents,
  ahead: EmpirePercents,
): { meter: MeterId | null; source: string; percents: EmpirePercents }[] {
  const swap = (meters: readonly MeterId[]): EmpirePercents => ({
    meters: [
      ...base.meters.filter((line) => line.meter === undefined || !meters.includes(line.meter)),
      ...ahead.meters.filter((line) => line.meter !== undefined && meters.includes(line.meter)),
    ],
    arrears: base.arrears,
  });
  return [
    { meter: 'happiness', source: METER_WORD.happiness, percents: swap(['happiness']) },
    {
      meter: 'authority',
      source: METER_WORD.authority,
      percents: swap(['happiness', 'authority']),
    },
    { meter: null, source: 'Treasury in debt', percents: ahead },
  ];
}

/**
 * **The readings of the real board that every card on one screen shares** —
 * fold once, ghost N times (batch H18).
 *
 * A screen of cards is N ghost-diffs, and exactly half of each of them is a
 * reading of the board as it actually stands: one side of every pair is `state`
 * itself (a slotted Order, an adopted Doctrine, an honoured legacy price
 * *backward*, so the ghost is the world without them and the real state is the
 * world with). The Statecraft sheet was taking that same half nine times over,
 * and the empire fold inside it prices every town in the realm.
 *
 * So a screen takes one sheet at the top of its draw, hands it to every card,
 * and drops it. What it holds is not a shortcut anywhere: every entry is the
 * very function's own answer for the very state object it is keyed to, taken
 * once instead of nine times. `test/sim/cardImpact.test.ts` pins that a card
 * stamped with a sheet reads identically to a card stamped without one.
 *
 * **Its lifetime is one draw** — `cityQuote`'s rule and `zocField`'s, and for
 * their reason: `GameState` is mutated in place by the reducer, so a sheet kept
 * past the command that follows it would answer with a board the game has moved
 * on from. Take one, spend it, let it go. Nothing stores one.
 */
export interface CardImpactSheet {
  /** The board these readings belong to. Compared by identity, never trusted past it. */
  readonly state: GameState;
  readonly playerId: number;
  readonly percents: () => EmpirePercents;
  readonly empireLines: () => Map<string, CityYields>;
  readonly meter: (meter: MeterId) => number;
  readonly cardSums: (city: City) => Map<string, CityYields>;
  readonly context: (city: City) => TileYieldContext | undefined;
  readonly tileAdds: (city: City, tile: Tile) => readonly TileYieldContribution[];
}

export function cardImpactSheet(state: GameState, playerId: number): CardImpactSheet {
  let percents: EmpirePercents | undefined;
  let empireLines: Map<string, CityYields> | undefined;
  const meters = new Map<MeterId, number>();
  const sums = new Map<number, Map<string, CityYields>>();
  const contexts = new Map<number, TileYieldContext | undefined>();
  const tiles = new Map<string, readonly TileYieldContribution[]>();

  const context = (city: City): TileYieldContext | undefined => {
    if (!contexts.has(city.id)) contexts.set(city.id, cityContext(state, city));
    return contexts.get(city.id);
  };

  return {
    state,
    playerId,
    percents: () => (percents ??= empirePercents(state, playerId)),
    empireLines: () => {
      percents ??= empirePercents(state, playerId);
      return (empireLines ??= empireLinesOf(state, playerId, percents));
    },
    meter: (meter) => {
      let held = meters.get(meter);
      if (held === undefined) {
        held = meterTotal(state, playerId, meter);
        meters.set(meter, held);
      }
      return held;
    },
    cardSums: (city) => {
      let held = sums.get(city.id);
      if (!held) {
        held = cityCardSums(state, city);
        sums.set(city.id, held);
      }
      return held;
    },
    context,
    tileAdds: (city, tile) => {
      const key = `${city.id}:${tile.col}:${tile.row}`;
      let held = tiles.get(key);
      if (!held) {
        held = explainTileYield(tile, context(city));
        tiles.set(key, held);
      }
      return held;
    },
  };
}

/**
 * What this card would change about the empire's per-turn ledger, as the
 * ordered labelled list the stamp is the fold of.
 *
 * See the module docblock for the method and for what each `kind` means. An
 * empire that does not exist answers the empty list, and so does a card with
 * nothing to say — which the interface draws as the card's own small flourish
 * rather than as a nought.
 *
 * `sheet` is the screen's shared half — see `CardImpactSheet`. It changes no
 * figure: it is consulted only for readings of the very state object it was
 * taken from, and every one of them is that reading's own function.
 */
export function explainCardImpact(
  state: GameState,
  playerId: number,
  subject: CardImpactSubject,
  sheet?: CardImpactSheet,
): CardImpactLine[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const pair = ghostPair(state, player, subject);
  const without = pair?.without;
  const held = pair?.with;
  if (!pair || !without || !held) return occasionLines(subject);

  /** The sheet, iff it is a sheet about *this* board and this seat. */
  const shared = sheet && sheet.state === state && sheet.playerId === playerId ? sheet : undefined;
  /** True for the side of the pair that is the real board — the shared half. */
  const isReal = (which: GameState): boolean => shared !== undefined && which === state;

  // The meters as the realm reads them **without** the card. Lent to both sides
  // of the direct diff so the card's own arithmetic cannot borrow the tier it
  // caused — see the module docblock, and `empirePercents` for why lending a
  // reading to a ghost is exact rather than approximate.
  const base = isReal(without) ? shared!.percents() : empirePercents(without, playerId);
  const ahead = isReal(held) ? shared!.percents() : empirePercents(held, playerId);

  const lines: CardImpactLine[] = [];

  // 1. The towns, named. The flat card lines that woke up, then the ground —
  //    a `tileYield` whose scope the card opened, summed over the hexes this
  //    empire actually works, because that is the only place a tile line
  //    becomes a yield.
  const towns = new Bucket();
  const ground = new Bucket();
  for (const city of without.cities) {
    if (city.ownerId !== playerId) continue;
    const was = isReal(without) ? shared!.cardSums(city) : cityCardSums(without, city);
    const now = isReal(held) ? shared!.cardSums(city) : cityCardSums(held, city);
    for (const [source, sum] of now) {
      const before = was.get(source);
      for (const key of CITY_YIELD_KEYS) {
        towns.add(source, 'city', key, sum[key] - (before?.[key] ?? 0));
      }
    }
    const groundBefore = isReal(without) ? shared!.context(city) : cityContext(without, city);
    const groundAfter = isReal(held) ? shared!.context(city) : cityContext(held, city);
    for (const cell of city.workedTiles) {
      const tile = getTileAt(without.map, cell.col, cell.row);
      if (!tile) continue;
      // Only `add` entries can differ: terrain, features and resources do not
      // care what law the empire keeps, which is what makes a diff by source
      // exact rather than approximate (`explainBuildingPreview`'s ground pass,
      // one scale out).
      const old = new Map<string, CityYields>();
      const wasLines = isReal(without)
        ? shared!.tileAdds(city, tile)
        : explainTileYield(tile, groundBefore);
      for (const entry of wasLines) {
        if (entry.kind !== 'add') continue;
        let sum = old.get(entry.source);
        if (!sum) {
          sum = emptyCityYields();
          old.set(entry.source, sum);
        }
        for (const key of CITY_YIELD_KEYS) sum[key] += entry[key];
      }
      const nowLines = isReal(held)
        ? shared!.tileAdds(city, tile)
        : explainTileYield(tile, groundAfter);
      for (const entry of nowLines) {
        if (entry.kind !== 'add') continue;
        const before = old.get(entry.source);
        for (const key of CITY_YIELD_KEYS) {
          ground.add(entry.source, 'city', key, entry[key] - (before?.[key] ?? 0));
        }
      }
    }
  }
  lines.push(...towns.lines(), ...ground.lines());

  // 2. The reconciliation. Everything the labelled lines above cannot name:
  //    Entry XVII's two multiplications on the new flats, a `yieldConversion`'s
  //    share of a fold, a percentage the card itself put on a voice, and every
  //    floor on the way. Named for the card, because by construction the card
  //    is the only thing that changed.
  const townsNow = townsTotal(without, playerId, base);
  const townsThen = townsTotal(held, playerId, base);
  // The empire's own lines under the same held reading — the other half of what
  // a tier moves, and the figure the knock-on ladder walks from (batch H19).
  const realmThen = empireTotal(held, playerId, base);
  const rest = emptyLine(subjectName(subject), 'city');
  const named = foldCardImpact(lines);
  for (const key of CITY_YIELD_KEYS) {
    rest[key] = townsThen[key] - townsNow[key] - named[key];
  }
  if (pays(rest)) lines.push(rest);

  // 3. The realm: the empire-scale card lines, the luxuries' empire signatures,
  //    the caravans abroad, the treasury's ledger and the empire stage over the
  //    fold of them, each under its own label. `collectYields` banks all of it
  //    beside the towns' and a stamp that left it out would be a figure the turn
  //    resolution disagrees with. Both sides are read at the realm's **current**
  //    meters (`base`), exactly as the towns above are, so a tier this card
  //    flipped is the ladder's business and not this diff's.
  const realm = new Bucket();
  //
  //    The shared sheet is lent to a side only where its own reading is the one
  //    being asked for: it holds the **real** board's lines at the real board's
  //    meters, which is `base` when the ghost is the held side, and is `base`
  //    on the other side only when the card moved neither meter (batch H18's
  //    memo, batch H19's parameter — the guard is a proof, not a shortcut).
  const empireWas = isReal(without)
    ? shared!.empireLines()
    : empireLinesOf(without, playerId, base);
  const empireNow =
    isReal(held) && metersUnmoved(base, ahead)
      ? shared!.empireLines()
      : empireLinesOf(held, playerId, base);
  for (const [source, now] of empireNow) {
    const before = empireWas.get(source);
    for (const key of CITY_YIELD_KEYS) {
      realm.add(source, 'empire', key, now[key] - (before?.[key] ?? 0));
    }
  }
  // A line the card **removed** entirely is a change too — a charter's amnesty
  // takes a slotted Order's empire payout away with it, and a diff that only
  // walked the new list would print the gain and hide the loss.
  for (const [source, before] of empireWas) {
    if (empireNow.has(source)) continue;
    for (const key of CITY_YIELD_KEYS) realm.add(source, 'empire', key, -before[key]);
  }
  lines.push(...realm.lines());

  // 4. The meters, in the card's own hand: the points it pays into contentment
  //    and into the writ. A diff of the meters' own folds across the same two
  //    ghosts — so a card that supplies happiness per city, or a charter whose
  //    amnesty takes a slotted Order's writ away with it, is priced by
  //    `explainHappiness`/`explainAuthority` rather than by a second reading of
  //    the rows. These pay in no voice; they are the stamp's other figures.
  for (const meter of METER_ORDER) {
    const moved = meterMoved(
      isReal(without) ? shared!.meter(meter) : meterTotal(without, playerId, meter),
      isReal(held) ? shared!.meter(meter) : meterTotal(held, playerId, meter),
    );
    if (moved === 0) continue;
    const line = emptyLine(METER_WORD[meter], 'meter');
    line.meter = meter;
    line.amount = moved;
    lines.push(line);
  }

  // 5. The knock-ons: what the card did to the meters, and through them to every
  //    town. Sequential deltas as each meter's new reading is let in, so two
  //    tiers flipping at once are two lines rather than one lump — and the last
  //    step's reading is the true one, which is what makes the whole list fold
  //    to `cityYields(ghost) − cityYields(state)` exactly.
  //
  //    A card that moved neither meter has no ladder to walk and the three rungs
  //    are three empire-wide sweeps reporting nought — see `metersUnmoved`,
  //    which is why the guard is a proof rather than a shortcut.
  //
  //    **The empire's own lines walk the ladder too** (batch H19): a tier
  //    multiplies the luxuries' signatures, the caravans abroad, the roads'
  //    coin and the cards' empire payouts exactly as it multiplies a town's
  //    basket, so a rung that priced only the towns would leave that gain
  //    unnamed and the list would stop folding to the true difference.
  if (!metersUnmoved(base, ahead)) {
    let running = emptyCityYields();
    for (const key of CITY_YIELD_KEYS) running[key] = townsThen[key] + realmThen[key];
    for (const step of knockOnLadder(base, ahead)) {
      const towns = townsTotal(held, playerId, step.percents);
      const realmNext = empireTotal(held, playerId, step.percents);
      const next = emptyCityYields();
      for (const key of CITY_YIELD_KEYS) next[key] = towns[key] + realmNext[key];
      const line = emptyLine(step.source, 'knockOn');
      if (step.meter !== null) line.meter = step.meter;
      for (const key of CITY_YIELD_KEYS) line[key] = next[key] - running[key];
      if (pays(line)) lines.push(line);
      running = next;
    }
  }

  // 6. The occasions, which a diff can never see. See `occasionLines`.
  lines.push(...occasionLines(subject));

  return lines;
}

/**
 * The card's riders, in their per-occasion form: what is granted, and the moment
 * it is granted on.
 *
 * Read off the row rather than diffed, because a rider pays on a *moment* and a
 * ghost of a turn has no moments in it — see the module docblock on why a zero
 * here would be a lie about the card. A grant with no printable figure (a heal,
 * a gifted piece, a turn of a rate) is said in words rather than dropped: a
 * rider that paid nothing a stamp can count is still a rider.
 */
function occasionLines(subject: CardImpactSubject): CardImpactLine[] {
  const lines: CardImpactLine[] = [];
  const name = subjectName(subject);
  for (const effect of subjectEffects(subject)) {
    // **The calendar's own occasion** (`CardPeriodicEffect`), which a diff can
    // never see for the reason every occasion is here: it pays on a turn rather
    // than every turn, so there is no per-turn ledger for a ghost to differ in.
    // A flat boon prints its figure; a counted one prints a note, because what
    // it pays is a fact about the board rather than a number on the row.
    if (effect.kind === 'periodic') {
      const line = emptyLine(name, 'occasion');
      line.occasion = `every ${Math.max(2, Math.floor(effect.everyTurns))} turns`;
      if (effect.count === undefined && effect.pays !== 'renown') {
        line[effect.pays] = Math.floor(effect.amount ?? 0);
      } else {
        line.note = stripRefs(
          describeEffects([effect])
            .map((clause) => clause.text)
            .join('; '),
        );
      }
      if (pays(line) || line.note !== undefined) lines.push(line);
      continue;
    }
    if (effect.kind !== 'windfallRider') continue;
    const line = emptyLine(name, 'occasion');
    line.occasion = occasionWords(
      effect.occasion,
      effect.vsBarbarians === true,
      effect.capturedWonder === true,
    );
    const grant = effect.grant;
    if (grant?.yield !== undefined && grant.amount !== undefined && grant.fromRate === undefined) {
      line[grant.yield] = grant.amount;
    } else if (grant?.fromRate !== undefined && grant.amount !== undefined) {
      line.note = `${String(grant.amount)} turn${grant.amount === 1 ? '' : 's'} of the rate`;
    } else if (grant?.heal !== undefined) {
      line.note = `heals ${String(grant.heal)}`;
    } else if (grant?.healAll === true) {
      line.note = 'heals every piece';
    } else if (grant?.unit !== undefined) {
      line.note = 'gifts a piece';
    }
    if (effect.percent !== undefined && effect.percent !== 0) line.percent = effect.percent;
    if (pays(line) || line.percent !== undefined || line.note !== undefined) lines.push(line);
  }
  return lines;
}
