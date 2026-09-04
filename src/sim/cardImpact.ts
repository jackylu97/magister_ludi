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
 * day it is added, because the thing being diffed is `cityYields`,
 * `explainEmpireCardYields`, `explainEmpireGold` and `empireResourceYields`
 * themselves. That is the same bargain the build screen's preview struck, and it
 * is the only one worth striking: a stamp computed beside the rules is a stamp
 * that disagrees with the turn a player ends.
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
 *   3. **the realm** — the empire-scale card lines, the treasury's four lines
 *      and the luxuries' empire signatures, each diffed under its own label;
 *   4. **the knock-ons** — what the card did to the empire's *meters*, and
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
  cityContext,
  cityQuote,
  cityYields,
  emptyCityYields,
  empirePercents,
  explainEmpireCardYields,
  explainTileYield,
} from './cities';
import { type GameState, type Player, playerById } from './state';
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
import { type BeliefId, beliefDef } from './religionData';
import {
  cardCityYields,
  occasionWords,
  orderEffectsAtLevel,
  orderLevel,
  slotOf,
  slotTypesOf,
} from './statecraft';
import { CITY_YIELD_KEYS, type CityYieldKey } from './resourceData';
import { type GreatPersonId, greatPersonDef } from './greatPeopleData';
import { empireResourceYields } from './resourceEffects';
import { explainEmpireGold } from './empireGold';
import { getTileAt } from './map';
import { highestAge } from './techData';
import type { City } from './state';
import type { MeterId } from './meters';

/**
 * Which register a line belongs to — the four the module docblock lists.
 *
 * `'knockOn'` is the one the interface treats differently rather than merely
 * labels: it is the *consequence* of the card rather than the card's own
 * payment, and a stamp that folded the two into one figure with one voice would
 * be claiming an Order pays science when what it pays is contentment.
 */
export type CardImpactKind = 'city' | 'empire' | 'knockOn' | 'occasion';

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
  /** The meter that moved. Set on `'knockOn'` lines and nowhere else. */
  meter?: MeterId;
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
 * amnesty is what adoption is), a belief joins the pantheon, and a legacy joins
 * the honoured dead. `level` is the draft's deepen face — ask at level 3 and the
 * diff is the increment, which is exactly what the offer's before/after wants.
 */
export type CardImpactSubject =
  | { kind: 'order'; id: OrderId; level?: number }
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
      const held = orderLevel(sc, subject.id);
      const level = subject.level ?? (held > 0 ? held : 1);
      const at = slotOf(sc, subject.id);
      if (at >= 0 && level === held) {
        // In force. The reading is what taking it out of its office would cost,
        // which is the same figure with the same sign — `isSlotted` is the whole
        // of the test, because an Order pays from a slot and nowhere else.
        return backward({
          ...player,
          statecraft: { ...sc, slots: sc.slots.map((slot, index) => (index === at ? null : slot)) },
        });
      }
      const orders =
        held > 0
          ? sc.orders.map((owned) => (owned.id === subject.id ? { id: owned.id, level } : owned))
          : [...sc.orders, { id: subject.id, level }];
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

/** The card's own effects, at the level being asked about. */
function subjectEffects(subject: CardImpactSubject): readonly CardEffect[] {
  switch (subject.kind) {
    case 'order':
      return isOrderId(subject.id) ? orderEffectsAtLevel(subject.id, subject.level ?? 1) : [];
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
 * The three empire-scale folds `collectYields` banks beside the towns' — the
 * card lines, the luxuries' empire signatures and the treasury's four lines —
 * summed by the label a player reads.
 *
 * All three, because all three read this empire's cards (`cardAmplifier` reaches
 * into the luxuries and into the connections' gold), and a stamp that quoted
 * only the towns would be a figure the turn resolution disagrees with — the
 * claim the top bar's headline makes about itself, one question over.
 */
function empireLinesOf(state: GameState, playerId: number): Map<string, CityYields> {
  const map = new Map<string, CityYields>();
  const record = (source: string, values: Partial<CityYields>): void => {
    let sum = map.get(source);
    if (!sum) {
      sum = emptyCityYields();
      map.set(source, sum);
    }
    for (const key of CITY_YIELD_KEYS) sum[key] += values[key] ?? 0;
  };
  for (const line of explainEmpireCardYields(state, playerId)) {
    record(line.source.replace(/ · ×\d+$/, ''), line);
  }
  for (const line of empireResourceYields(state, playerId)) record(line.source, line);
  for (const line of explainEmpireGold(state, playerId)) {
    // Keyed on the head of the label — everything before the ` · count` tail —
    // which is the only handle `TradeGoldLine` offers and the same key the top
    // bar's ledger uses to join the two halves of that line.
    record(line.source.split(' · ')[0] ?? line.source, { gold: line.gold });
  }
  return map;
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
    { meter: 'happiness', source: 'Happiness', percents: swap(['happiness']) },
    { meter: 'authority', source: 'Authority', percents: swap(['happiness', 'authority']) },
    { meter: null, source: 'Treasury in debt', percents: ahead },
  ];
}

/**
 * What this card would change about the empire's per-turn ledger, as the
 * ordered labelled list the stamp is the fold of.
 *
 * See the module docblock for the method and for what each `kind` means. An
 * empire that does not exist answers the empty list, and so does a card with
 * nothing to say — which the interface draws as the card's own small flourish
 * rather than as a nought.
 */
export function explainCardImpact(
  state: GameState,
  playerId: number,
  subject: CardImpactSubject,
): CardImpactLine[] {
  const player = playerById(state, playerId);
  if (!player) return [];
  const pair = ghostPair(state, player, subject);
  const without = pair?.without;
  const held = pair?.with;
  if (!pair || !without || !held) return occasionLines(subject);

  // The meters as the realm reads them **without** the card. Lent to both sides
  // of the direct diff so the card's own arithmetic cannot borrow the tier it
  // caused — see the module docblock, and `empirePercents` for why lending a
  // reading to a ghost is exact rather than approximate.
  const base = empirePercents(without, playerId);
  const ahead = empirePercents(held, playerId);

  const lines: CardImpactLine[] = [];

  // 1. The towns, named. The flat card lines that woke up, then the ground —
  //    a `tileYield` whose scope the card opened, summed over the hexes this
  //    empire actually works, because that is the only place a tile line
  //    becomes a yield.
  const towns = new Bucket();
  const ground = new Bucket();
  for (const city of without.cities) {
    if (city.ownerId !== playerId) continue;
    const was = cityCardSums(without, city);
    for (const [source, now] of cityCardSums(held, city)) {
      const before = was.get(source);
      for (const key of CITY_YIELD_KEYS) {
        towns.add(source, 'city', key, now[key] - (before?.[key] ?? 0));
      }
    }
    const groundBefore = cityContext(without, city);
    const groundAfter = cityContext(held, city);
    for (const cell of city.workedTiles) {
      const tile = getTileAt(without.map, cell.col, cell.row);
      if (!tile) continue;
      // Only `add` entries can differ: terrain, features and resources do not
      // care what law the empire keeps, which is what makes a diff by source
      // exact rather than approximate (`explainBuildingPreview`'s ground pass,
      // one scale out).
      const old = new Map<string, CityYields>();
      for (const entry of explainTileYield(tile, groundBefore)) {
        if (entry.kind !== 'add') continue;
        let sum = old.get(entry.source);
        if (!sum) {
          sum = emptyCityYields();
          old.set(entry.source, sum);
        }
        for (const key of CITY_YIELD_KEYS) sum[key] += entry[key];
      }
      for (const entry of explainTileYield(tile, groundAfter)) {
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
  const rest = emptyLine(subjectName(subject), 'city');
  const named = foldCardImpact(lines);
  for (const key of CITY_YIELD_KEYS) {
    rest[key] = townsThen[key] - townsNow[key] - named[key];
  }
  if (pays(rest)) lines.push(rest);

  // 3. The realm: the empire-scale card lines, the luxuries' empire signatures
  //    and the treasury's four lines, each under its own label. `collectYields`
  //    banks all three beside the towns' and a stamp that left them out would
  //    be a figure the turn resolution disagrees with.
  const realm = new Bucket();
  const empireWas = empireLinesOf(without, playerId);
  const empireNow = empireLinesOf(held, playerId);
  for (const [source, now] of empireNow) {
    const before = empireWas.get(source);
    for (const key of CITY_YIELD_KEYS) realm.add(source, 'empire', key, now[key] - (before?.[key] ?? 0));
  }
  // A line the card **removed** entirely is a change too — a charter's amnesty
  // takes a slotted Order's empire payout away with it, and a diff that only
  // walked the new list would print the gain and hide the loss.
  for (const [source, before] of empireWas) {
    if (empireNow.has(source)) continue;
    for (const key of CITY_YIELD_KEYS) realm.add(source, 'empire', key, -before[key]);
  }
  lines.push(...realm.lines());

  // 4. The knock-ons: what the card did to the meters, and through them to every
  //    town. Sequential deltas as each meter's new reading is let in, so two
  //    tiers flipping at once are two lines rather than one lump — and the last
  //    step's reading is the true one, which is what makes the whole list fold
  //    to `cityYields(ghost) − cityYields(state)` exactly.
  let running = townsThen;
  for (const step of knockOnLadder(base, ahead)) {
    const next = townsTotal(held, playerId, step.percents);
    const line = emptyLine(step.source, 'knockOn');
    if (step.meter !== null) line.meter = step.meter;
    for (const key of CITY_YIELD_KEYS) line[key] = next[key] - running[key];
    if (pays(line)) lines.push(line);
    running = next;
  }

  // 5. The occasions, which a diff can never see. See `occasionLines`.
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
