/**
 * **What is in force for a seat, as the In play screen lays it out** (stage 3
 * of the Council and In play board,
 * `docs/plans/mockups/scholars-study/council-and-in-play/council-and-in-play.html`,
 * frames I1 to I5). No DOM here: this module lists the pieces and reads their
 * figures, and `inPlayScreen.ts` draws them.
 *
 * The pieces come from the same records the rules' walk reads
 * (`liveEffects` in `src/sim/statecraft/evaluator.ts`), source by source:
 *
 *   - **the council**: the government and its Doctrines (drawn in the
 *     government column), then one edge for each chair: the Order seated
 *     there, the malice that holds it, or an empty chair. A malice with no
 *     chair follows the chairs;
 *   - Wonders, empire buildings and buildings that grant council chairs.
 *     Each building appears once because its empire effect applies once.
 *   - **Beliefs**: the pantheon's gods, and for each religion whose holy city
 *     the seat holds, its enhancer beliefs and the founder's share (the "holy
 *     city" piece). A follower belief pays the towns that follow it, so it is
 *     not a piece here;
 *   - **Legacies**: the great people spent and not revoked, the lasting
 *     reward of a fulfilled commission, and a bead's cap;
 *   - **Temporary**: every timed effect in force, on the seat, on one of its
 *     towns or on one of its pieces, with the turn it ends on;
 *   - **the crest**: the leader's two abilities.
 *
 * Technologies are never pieces (the user: "Resources and technologies should
 * definitely not be cards"). They are rows in the breakdown sheet only.
 *
 * `test/ui/inPlayPieces.test.ts` holds every entry of the walk to a piece on
 * this screen or to a technology, so a new source in the walk fails a test
 * until this module places it.
 *
 * The figures
 * -----------
 * Every figure is one reading by the card stamp's method (`cardImpact.ts`): the
 * books with the piece, less the books without it. A stack's total is the set
 * of its pieces (`{ kind: 'pieces' }`), and the screen's totals line is the set
 * of every piece on the screen, crest included: the books with everything in
 * force, less the books with none of it. A piece's figure is rounded as the
 * Council screen rounds a plate (`councilPlate`): what its stack's total loses
 * without it. So the council's figures here are the Council screen's own.
 */

import type { CardImpactSubject, InPlayPiece, TimedHolder } from '../sim/cardImpact';
import { cardImpactWorlds } from '../sim/cardImpact';
import { beadCapEffects } from '../sim/beads';
import { type LedgerClass, LEDGER_CLASSES } from '../sim/ledgerClass';
import { explainLedger } from '../sim/ledgerFold';
import { authorityOf, explainAuthority, explainHappiness, happinessOf } from '../sim/meters';
import { readEmpire } from '../sim/readings';
import { explainRenown, renownPerTurn } from '../sim/renown';
import { roundYield } from '../sim/yieldFormat';
import { buildingDef, type BuildingId, isEmpireBuilding } from '../sim/buildingData';
import { tileOwnerCityId } from '../sim/cities';
import { FAMILIES, type Family, greatPersonDef, type GreatPersonId } from '../sim/greatPeopleData';
import { leaderDef } from '../sim/leaderData';
import { isMaliceId, maliceDef, type MaliceId } from '../sim/maliceData';
import { beliefDef, type BeliefId, isRiteId } from '../sim/religionData';
import { type GameState, cityById, playerById } from '../sim/state';
import { anyCardDef, buildingOpensChairs, EMPIRE_BUILDING_WORDS, heldReligions, oneOfAKind } from '../sim/statecraft';
import {
  type CardId,
  type DoctrineId,
  type GovernmentId,
  type OrderId,
  doctrineDef,
  governmentDef,
  isDoctrineId,
  isOrderId,
  orderDef,
} from '../sim/statecraftData';
import { unitDef } from '../sim/unitData';
import { COUNCIL_VOICES, type CouncilFigures, type CouncilVoice } from './councilTotals';
import type { PlateFigure } from './orderFace';

/** The five stacks, left to right. */
export const IN_PLAY_STACKS = ['council', 'wonders', 'beliefs', 'legacies', 'temporary'] as const;
export type InPlayStackId = (typeof IN_PLAY_STACKS)[number];

/** The screen's words, in one table. Plain, and no number inside a sentence. */
export const IN_PLAY_WORDS = {
  title: 'In play',
  stacks: {
    council: 'The council',
    wonders: 'Wonders',
    beliefs: 'Beliefs',
    legacies: 'Legacies',
    temporary: 'Temporary',
  } satisfies Record<InPlayStackId, string>,
  government: 'Government',
  doctrineCount: (count: number) => `${count} Doctrine${count === 1 ? '' : 's'}`,
  emptyChair: 'an empty chair',
  noChair: 'no chair',
  noneYet: 'None yet',
  pantheon: 'pantheon',
  holyCity: (town: string) => `Holy city: ${town}`,
  holyCityNoTown: 'The holy city',
  withTown: (town: string) => `with ${town}`,
  legacy: 'legacy',
  bead: 'bead',
  commission: 'commission',
  malice: 'malice',
  endsTurn: 'ends turn',
  onSeat: 'your realm',
  more: (count: number) => `${count} more`,
  moreHint: 'click to open the stack',
  readOnly: 'you cannot move anything here',
  toCouncil: 'Council',
  door: 'In play',
  doorTitle:
    'Everything in force: your council, wonders and empire buildings, beliefs, legacies and what is temporary. I opens it too.',
  totalsLabel: 'What everything in force pays each turn',
  totalsTitle:
    'What everything on this screen pays each turn: your books with all of it, less your books with none of it. Click a figure to see where it comes from.',
  expanded: (stack: string) => `${stack}, open`,
  trayHint: 'Click a piece to go to it. Click the cloth or press Esc to close the stack.',
  trayHintCouncil: 'Click a card to go to its chair on the Council screen. You cannot move a card here.',
} as const;

/** Where a piece takes the player when it is clicked. */
export type InPlayLink =
  | { kind: 'council'; card: OrderId | null }
  | { kind: 'city'; cityId: number }
  | { kind: 'faith'; cityId: number | null }
  | { kind: 'reliquary'; person: GreatPersonId | null }
  | { kind: 'leader' }
  | null;

/** The drawn form of a piece: its top form in a stack, or its edge. */
export type InPlayForm =
  | 'government'
  | 'doctrine'
  | 'order'
  | 'malice'
  | 'chair'
  | 'wonder'
  | 'belief'
  | 'holyCity'
  | 'legacy'
  | 'bead'
  | 'commission'
  | 'timed'
  | 'ability';

/** One piece on the screen. */
export interface InPlayEntry {
  /** Stable across draws: the arrival's glow and the focus find a piece by it. */
  key: string;
  stack: InPlayStackId | 'crest';
  form: InPlayForm;
  /** The piece's own name, from its data row. */
  name: string;
  /** The small line under the name: its town, its pantheon, its holder. */
  sub: string | null;
  /** The card row whose text the piece shows, or null (a chair, a holy city). */
  card: CardId | null;
  /** How the board without it is built, or null for an empty chair. */
  piece: InPlayPiece | null;
  /** The figure's reading, or null for an empty chair. */
  subject: CardImpactSubject | null;
  /** A temporary piece's last turn: it is in force until this turn begins. */
  endsTurn?: number;
  /** A council edge's chair, counted from nought. */
  chair?: number;
  /** A wonder's town, for its picture window and its link. */
  cityId?: number;
  link: InPlayLink;
}

export interface InPlayStack {
  id: InPlayStackId;
  name: string;
  /** In drawing order: the top piece first. */
  entries: InPlayEntry[];
  /** How many pieces the head counts (an empty chair is not one). */
  count: number;
}

export interface InPlayLayout {
  /** The government column: the government, then its Doctrines. */
  government: InPlayEntry[];
  stacks: InPlayStack[];
  /** The leader's abilities, for the crest. */
  crest: InPlayEntry[];
  /** The leader's name, or null for a seat with no leader. */
  leader: string | null;
  /**
   * Pieces read into the totals and drawn nowhere: the leader's own line (the
   * effects of the unique piece, which ride the leader's law).
   */
  hidden: InPlayPiece[];
}

/** A piece's reading by the stamp of one piece. */
function single(piece: InPlayPiece): CardImpactSubject {
  return { kind: 'pieces', pieces: [piece] };
}

/** The town that holds a holy site's hex, by name, or null. */
function holyTownName(state: GameState, col: number, row: number): string | null {
  const id = tileOwnerCityId(state, col, row);
  return id === null ? null : (cityById(state, id)?.name ?? null);
}

/**
 * **Every piece in force for this seat**, laid out in stacks. No readings: the
 * door's count and the arrival read this, so it is cheap.
 */
export function inPlayLayout(state: GameState, seat: number): InPlayLayout {
  const player = playerById(state, seat);
  const empty: InPlayLayout = {
    government: [],
    stacks: IN_PLAY_STACKS.map((id) => ({ id, name: IN_PLAY_WORDS.stacks[id], entries: [], count: 0 })),
    crest: [],
    leader: null,
    hidden: [],
  };
  if (!player) return empty;
  const sc = player.statecraft;

  // The government column: the law, then its Doctrines in the order taken.
  const government: InPlayEntry[] = [
    {
      key: `government:${sc.government}`,
      stack: 'council',
      form: 'government',
      name: governmentDef(sc.government as GovernmentId).name,
      sub: null,
      card: sc.government,
      piece: { kind: 'government' },
      subject: { kind: 'government', id: sc.government as GovernmentId },
      link: { kind: 'council', card: null },
    },
  ];
  for (const id of sc.doctrines) {
    if (!isDoctrineId(id)) continue;
    government.push({
      key: `doctrine:${id}`,
      stack: 'council',
      form: 'doctrine',
      name: doctrineDef(id).name,
      sub: null,
      card: id,
      piece: { kind: 'doctrine', id: id as DoctrineId },
      subject: { kind: 'doctrine', id: id as DoctrineId },
      link: { kind: 'council', card: null },
    });
  }

  // The council: one edge a chair, in chair order, then a malice with no chair.
  const council: InPlayEntry[] = [];
  const maliceAt = new Map<number, MaliceId>();
  const loose: MaliceId[] = [];
  for (const held of player.malices) {
    if (!isMaliceId(held.id)) continue;
    if (held.chair === undefined) loose.push(held.id);
    else maliceAt.set(held.chair, held.id);
  }
  const maliceEntry = (id: MaliceId, chair: number | undefined, index: number): InPlayEntry => ({
    key: `malice:${id}:${chair ?? `loose${index}`}`,
    stack: 'council',
    form: 'malice',
    name: maliceDef(id).name,
    sub: IN_PLAY_WORDS.malice,
    card: id,
    piece: { kind: 'malice', id },
    subject: single({ kind: 'malice', id }),
    ...(chair === undefined ? {} : { chair }),
    link: { kind: 'council', card: null },
  });
  sc.slots.forEach((slot, chair) => {
    const malice = maliceAt.get(chair);
    if (malice !== undefined) {
      council.push(maliceEntry(malice, chair, 0));
      return;
    }
    if (slot !== null && isOrderId(slot.card)) {
      const id = slot.card;
      council.push({
        key: `order:${id}`,
        stack: 'council',
        form: 'order',
        name: orderDef(id).name,
        sub: null,
        card: id,
        piece: { kind: 'order', chair },
        subject: { kind: 'order', id },
        chair,
        link: { kind: 'council', card: id },
      });
      return;
    }
    council.push({
      key: `chair:${chair}`,
      stack: 'council',
      form: 'chair',
      name: IN_PLAY_WORDS.emptyChair,
      sub: null,
      card: null,
      piece: null,
      subject: null,
      chair,
      link: { kind: 'council', card: null },
    });
  });
  loose.forEach((id, index) => council.push(maliceEntry(id, undefined, index)));

  // Buildings with an empire effect share a stack. The newest claimed wonder comes first.
  const claimed = new Map<BuildingId, number>();
  for (const claim of state.wonders) claimed.set(claim.building, claim.turn);
  const wonders: InPlayEntry[] = [];
  const seen = new Set<BuildingId>();
  for (const city of state.cities) {
    if (city.ownerId !== seat) continue;
    for (const id of city.buildings) {
      if (seen.has(id) || (!oneOfAKind(id) && !buildingOpensChairs(id))) continue;
      seen.add(id);
      wonders.push({
        key: `wonder:${id}`,
        stack: 'wonders',
        form: 'wonder',
        name: buildingDef(id).name,
        // An empire building shares the stack and says which it is.
        sub: isEmpireBuilding(id) ? EMPIRE_BUILDING_WORDS.inTown(city.name) : IN_PLAY_WORDS.withTown(city.name),
        card: id,
        piece: { kind: 'wonder', id },
        subject: single({ kind: 'wonder', id }),
        cityId: city.id,
        link: { kind: 'city', cityId: city.id },
      });
    }
  }
  const walkOrder = new Map(wonders.map((entry, index) => [entry.key, index]));
  wonders.sort((a, b) => {
    const at = claimed.get(a.card as BuildingId) ?? -1;
    const bt = claimed.get(b.card as BuildingId) ?? -1;
    return bt - at || walkOrder.get(a.key)! - walkOrder.get(b.key)!;
  });

  // Beliefs: the walk's order is the pantheon, then each held religion's
  // enhancers and its share. The newest belief is on top, so the beliefs are
  // reversed, and the holy city's share, which is not a belief, goes last.
  const beliefs: InPlayEntry[] = [];
  const shares: InPlayEntry[] = [];
  const beliefEntry = (id: BeliefId, sub: string): InPlayEntry => ({
    key: `belief:${id}`,
    stack: 'beliefs',
    form: 'belief',
    name: beliefDef(id).name,
    sub,
    card: id,
    piece: { kind: 'belief', id },
    subject: single({ kind: 'belief', id }),
    link: { kind: 'faith', cityId: null },
  });
  for (const id of player.pantheon.beliefs) beliefs.push(beliefEntry(id, IN_PLAY_WORDS.pantheon));
  for (const faith of heldReligions(state, seat)) {
    for (const id of faith.enhancer) beliefs.push(beliefEntry(id, faith.name));
    const site = faith.holySite;
    const town = site === undefined ? null : holyTownName(state, site.col, site.row);
    shares.push({
      key: `holyCity:${faith.id}`,
      stack: 'beliefs',
      form: 'holyCity',
      name: town === null ? IN_PLAY_WORDS.holyCityNoTown : IN_PLAY_WORDS.holyCity(town),
      sub: faith.name,
      card: null,
      piece: { kind: 'holyCity', religion: faith.id },
      subject: single({ kind: 'holyCity', religion: faith.id }),
      link: { kind: 'faith', cityId: null },
    });
  }
  beliefs.reverse();
  beliefs.push(...shares);

  // Legacies: the great people spent, newest first, then the lasting rewards
  // and the beads' caps, as the walk reads them.
  const legacies: InPlayEntry[] = [];
  for (const held of [...player.legacies].reverse()) {
    if (held.revoked === true) continue;
    const person = greatPersonDef(held.id);
    if (person.onSpend && person.legacy.length === 0) continue;
    legacies.push({
      key: `legacy:${held.id}`,
      stack: 'legacies',
      form: 'legacy',
      name: person.name,
      sub: IN_PLAY_WORDS.legacy,
      card: held.id,
      piece: { kind: 'legacy', id: held.id },
      subject: single({ kind: 'legacy', id: held.id }),
      link: { kind: 'reliquary', person: held.id },
    });
  }
  for (const met of [...(sc.commissionsFulfilled ?? [])].reverse()) {
    if (!isOrderId(met.card)) continue;
    const lasting = (orderDef(met.card).commission?.reward ?? []).some((reward) => (reward.lasting?.length ?? 0) > 0);
    if (!lasting) continue;
    legacies.push({
      key: `commission:${met.card}`,
      stack: 'legacies',
      form: 'commission',
      name: orderDef(met.card).name,
      sub: IN_PLAY_WORDS.commission,
      card: met.card,
      piece: { kind: 'commission', card: met.card },
      subject: single({ kind: 'commission', card: met.card }),
      link: { kind: 'council', card: null },
    });
  }
  const beads = beadCapEffects(player);
  for (const held of [...beads].reverse()) {
    legacies.push({
      key: `bead:${held.id}`,
      stack: 'legacies',
      form: 'bead',
      name: held.name,
      sub: IN_PLAY_WORDS.bead,
      card: held.id,
      piece: { kind: 'bead', id: held.id },
      subject: single({ kind: 'bead', id: held.id }),
      link: null,
    });
  }

  // Temporary: every timed effect in force, one piece for each card on each
  // holder, the one that ends first on top.
  const temporary: InPlayEntry[] = [];
  const addTimed = (
    entries: readonly { card: CardId; expiresTurn: number }[] | undefined,
    holder: TimedHolder,
    sub: string,
    link: InPlayLink,
  ): void => {
    const ends = new Map<CardId, number>();
    for (const entry of entries ?? []) {
      if (state.turn >= entry.expiresTurn) continue;
      ends.set(entry.card, Math.max(ends.get(entry.card) ?? 0, entry.expiresTurn));
    }
    for (const [card, endsTurn] of ends) {
      const where = holder.kind === 'seat' ? 'seat' : `${holder.kind}${holder.id}`;
      temporary.push({
        key: `timed:${card}:${where}`,
        stack: 'temporary',
        form: 'timed',
        name: anyCardDef(card).name,
        sub,
        card,
        piece: { kind: 'timed', card, holder },
        subject: { kind: 'timed', card, holder },
        endsTurn,
        link,
      });
    }
  };
  addTimed(player.timed, { kind: 'seat' }, IN_PLAY_WORDS.onSeat, null);
  for (const city of state.cities) {
    if (city.ownerId !== seat || !city.timed?.length) continue;
    const rite = city.timed.some((entry) => isRiteId(entry.card));
    addTimed(city.timed, { kind: 'city', id: city.id }, city.name, rite ? { kind: 'faith', cityId: city.id } : { kind: 'city', cityId: city.id });
  }
  for (const unit of state.units) {
    if (unit.ownerId !== seat || !unit.timed?.length) continue;
    addTimed(unit.timed, { kind: 'unit', id: unit.id }, unitDef(unit.type).name, null);
  }
  temporary.sort((a, b) => a.endsTurn! - b.endsTurn! || a.name.localeCompare(b.name));

  // The crest: the leader's two abilities, and the leader's own line hidden.
  const crest: InPlayEntry[] = [];
  const hidden: InPlayPiece[] = [];
  let leader: string | null = null;
  if (player.leader !== undefined) {
    const def = leaderDef(player.leader);
    leader = def.name;
    for (const ability of def.abilities) {
      crest.push({
        key: `ability:${ability.id}`,
        stack: 'crest',
        form: 'ability',
        name: ability.name,
        sub: null,
        card: ability.id,
        piece: { kind: 'ability', id: ability.id },
        subject: single({ kind: 'ability', id: ability.id }),
        link: { kind: 'leader' },
      });
    }
    if ((unitDef(def.unit).effects?.length ?? 0) > 0) hidden.push({ kind: 'ability', id: player.leader });
  }

  const count = (entries: readonly InPlayEntry[]): number => entries.filter((entry) => entry.piece !== null).length;
  const stacks: InPlayStack[] = [
    { id: 'council', name: IN_PLAY_WORDS.stacks.council, entries: council, count: count(council) },
    { id: 'wonders', name: IN_PLAY_WORDS.stacks.wonders, entries: wonders, count: wonders.length },
    { id: 'beliefs', name: IN_PLAY_WORDS.stacks.beliefs, entries: beliefs, count: beliefs.length },
    { id: 'legacies', name: IN_PLAY_WORDS.stacks.legacies, entries: legacies, count: legacies.length },
    { id: 'temporary', name: IN_PLAY_WORDS.stacks.temporary, entries: temporary, count: temporary.length },
  ];
  return { government, stacks, crest, leader, hidden };
}

/**
 * **What arrived since the seat last looked** (frames A2 and A3): the keys of
 * the wonders and beliefs that are new in force. Not state: a fact about what
 * this screen has shown, kept per seat for hot-seat, and empty after a load.
 *
 * `note` is asked after every change of the board with the seat's layout. The
 * first call for a seat only learns what is there, so nothing already in force
 * arrives. A wonder or a belief that is new after that is an arrival until the
 * seat opens In play and closes it again (`seen`).
 */
export interface InPlayArrivals {
  /** Learns the seat's pieces, and returns the keys that arrived just now. */
  note(seat: number, layout: InPlayLayout): string[];
  /** The arrivals not yet seen, top of their stacks on the next open. */
  fresh(seat: number): ReadonlySet<string>;
  /** The seat has seen them: the glow and the door's dot go. */
  seen(seat: number): void;
  /** Forgets everything: a new game or a load. */
  reset(): void;
}

/** The forms that arrive: a wonder finished, a belief chosen. */
const ARRIVING: readonly InPlayForm[] = ['wonder', 'belief'];

export function createInPlayArrivals(): InPlayArrivals {
  const known = new Map<number, Set<string>>();
  const fresh = new Map<number, Set<string>>();
  return {
    note(seat, layout) {
      const now = new Set<string>();
      for (const stack of layout.stacks) for (const entry of stack.entries) if (ARRIVING.includes(entry.form)) now.add(entry.key);
      const before = known.get(seat);
      known.set(seat, now);
      if (before === undefined) return [];
      const arrived = [...now].filter((key) => !before.has(key));
      if (arrived.length > 0) {
        const mine = fresh.get(seat) ?? new Set<string>();
        for (const key of arrived) mine.add(key);
        fresh.set(seat, mine);
      }
      // A piece that left (a wonder lost with its town) is no longer new.
      const mine = fresh.get(seat);
      if (mine !== undefined) for (const key of [...mine]) if (!now.has(key)) mine.delete(key);
      return arrived;
    },
    fresh(seat) {
      return fresh.get(seat) ?? new Set();
    },
    seen(seat) {
      fresh.delete(seat);
    },
    reset() {
      known.clear();
      fresh.clear();
    },
  };
}

/**
 * The stack's entries with the arrivals on top, in the order they arrived
 * (frame A3: "the wonder is on top of its stack with a glow").
 */
export function arrivalsOnTop(entries: readonly InPlayEntry[], fresh: ReadonlySet<string>): InPlayEntry[] {
  if (fresh.size === 0) return [...entries];
  const top = entries.filter((entry) => fresh.has(entry.key));
  return [...top, ...entries.filter((entry) => !fresh.has(entry.key))];
}

/** How many pieces the door counts: every piece in the five stacks. */
export function inPlayCount(layout: InPlayLayout): number {
  return layout.stacks.reduce((sum, stack) => sum + stack.count, 0);
}

/** The pieces a stack's total is read over. The council's include the government column. */
export function stackPieces(layout: InPlayLayout, stack: InPlayStackId): InPlayPiece[] {
  const own = layout.stacks.find((entry) => entry.id === stack)?.entries ?? [];
  const column = stack === 'council' ? layout.government : [];
  return [...column, ...own].flatMap((entry) => (entry.piece === null ? [] : [entry.piece]));
}

/** Every piece the screen's totals line is read over: the five stacks, the crest and the leader's own line. */
export function allPieces(layout: InPlayLayout): InPlayPiece[] {
  return [
    ...IN_PLAY_STACKS.flatMap((stack) => stackPieces(layout, stack)),
    ...layout.crest.flatMap((entry) => (entry.piece === null ? [] : [entry.piece])),
    ...layout.hidden,
  ];
}

/**
 * **The books on a board**: the six yields as the turn banks them
 * (`readEmpire`), the two meters (`happinessOf`, `authorityOf`), and renown
 * each turn (`renownPerTurn`, the fold of `explainRenown`'s recurring half,
 * summed over every family; stage 7). The bots read the same nine channels
 * (`deckReading`, `src/ai/value.ts`).
 *
 * A figure here is the books on the stamp's two boards (`cardImpactWorlds`),
 * one less the other. That is the fold of the card stamp's own list
 * (`explainCardImpact`) without the labels: the bots price a card the same way
 * and `test/sim/aiCardStamp.slow.test.ts` holds the two equal, and
 * `test/ui/inPlayPieces.test.ts` holds it for the In play subjects. The labelled
 * list costs some twenty times as much at a late game, and this screen prints
 * figures only.
 */
export function booksOf(board: GameState, seat: number): CouncilFigures {
  const totals = readEmpire(board, seat).totals;
  return {
    food: totals.food,
    production: totals.production,
    gold: totals.gold,
    science: totals.science,
    culture: totals.culture,
    faith: totals.faith,
    happiness: happinessOf(board, seat),
    authority: authorityOf(board, seat),
    renown: renownPerTurn(board, seat),
  };
}

/** What a subject pays: the books with it, less the books without it. Zero where it has no pair. */
export function piecesFigures(state: GameState, seat: number, subject: CardImpactSubject, real?: CouncilFigures): CouncilFigures {
  const worlds = cardImpactWorlds(state, seat, subject);
  const out = {} as CouncilFigures;
  if (worlds === null) {
    for (const voice of COUNCIL_VOICES) out[voice] = 0;
    return out;
  }
  const after = worlds.with === state && real !== undefined ? real : booksOf(worlds.with, seat);
  const before = worlds.without === state && real !== undefined ? real : booksOf(worlds.without, seat);
  for (const voice of COUNCIL_VOICES) out[voice] = after[voice] - before[voice];
  return out;
}

/** A piece's plate: its figures rounded as the Council screen rounds them, against its stack's total. */
export function plateAgainst(reference: Readonly<CouncilFigures>, own: Readonly<CouncilFigures>): PlateFigure[] {
  const out: PlateFigure[] = [];
  for (const voice of COUNCIL_VOICES) {
    const amount = roundYield(reference[voice]) - roundYield(reference[voice] - own[voice]);
    if (amount !== 0) out.push({ voice, amount });
  }
  return out;
}

/** The figures the screen draws: the totals, each stack's total, and each piece's plate. */
export interface InPlayReading {
  /** The screen's totals line, exact (the books with everything in force, less with none). */
  total: CouncilFigures;
  /** Each stack's total, exact. */
  stacks: Record<InPlayStackId, CouncilFigures>;
  /** The crest's total, exact: the rounding reference of the abilities' plates. */
  crest: CouncilFigures;
  /** Each piece's figures, exact, by key. */
  figures: Map<string, CouncilFigures>;
  /** Each piece's plate, by key: what its stack's total loses without it. Empty for a rule. */
  plates: Map<string, PlateFigure[]>;
  /** The Council screen's own totals line, exact: the rounding reference of the council's cards. */
  council: CouncilFigures;
  /** The books on the real board, exact: the empire's own figures. */
  books: CouncilFigures;
  /** False while some pieces' figures are still to read (`continueInPlayReading`). */
  done: boolean;
  /** How long the reading has taken so far, in milliseconds (the late-game measure). */
  ms: number;
}

/** A reading in progress: the figures so far, and the pieces still to read. */
interface ReadingInProgress {
  revision: number;
  reading: InPlayReading;
  queue: { entry: InPlayEntry; reference: CouncilFigures }[];
}

/** One reading per board and seat, until the board's revision moves. */
const READINGS = new WeakMap<GameState, Map<number, ReadingInProgress>>();

/**
 * **The screen's totals and each stack's total, read now; each piece's figure
 * read after.** A late game holds some seventy pieces and each is one board,
 * so the sheet opens on the totals and fills the pieces in short turns
 * (`continueInPlayReading`). The reading is kept until the board's revision
 * moves, so a second open in the same turn reads nothing. The sheet asks on
 * open and on a change of state, never on a frame.
 */
export function beginInPlayReading(state: GameState, seat: number, layout: InPlayLayout): InPlayReading {
  const memo = READINGS.get(state)?.get(seat);
  if (memo !== undefined && memo.revision === state.revision) return memo.reading;
  const started = performance.now();
  const books = booksOf(state, seat);
  const read = (subject: CardImpactSubject): CouncilFigures => piecesFigures(state, seat, subject, books);
  const stacks = {} as Record<InPlayStackId, CouncilFigures>;
  for (const stack of IN_PLAY_STACKS) stacks[stack] = read({ kind: 'pieces', pieces: stackPieces(layout, stack) });
  const crestPieces = layout.crest.flatMap((entry) => (entry.piece === null ? [] : [entry.piece]));
  const crest = read({ kind: 'pieces', pieces: crestPieces });
  const total = read({ kind: 'pieces', pieces: allPieces(layout) });
  // The government, the Doctrines and the seated Orders round against the
  // Council screen's own totals line, so a card shows the same figure on both
  // screens. A malice is not on that line (stage 2), so it rounds against the
  // council stack's total, which counts it.
  const council = read({ kind: 'council' });
  const queue: ReadingInProgress['queue'] = [];
  const add = (entry: InPlayEntry, reference: CouncilFigures): void => {
    if (entry.subject !== null) queue.push({ entry, reference });
  };
  for (const stack of layout.stacks) {
    for (const entry of stack.entries) add(entry, stack.id === 'council' && entry.form !== 'malice' ? council : stacks[stack.id]);
  }
  for (const entry of layout.government) add(entry, council);
  for (const entry of layout.crest) add(entry, crest);
  const reading: InPlayReading = {
    total,
    stacks,
    crest,
    council,
    books,
    figures: new Map(),
    plates: new Map(),
    done: queue.length === 0,
    ms: performance.now() - started,
  };
  const seats = READINGS.get(state) ?? new Map<number, ReadingInProgress>();
  seats.set(seat, { revision: state.revision, reading, queue });
  READINGS.set(state, seats);
  return reading;
}

/**
 * Reads pieces' figures off the queue for up to `budgetMs`, and answers
 * whether the reading is whole. Nothing to do once the board has moved on.
 */
export function continueInPlayReading(state: GameState, seat: number, budgetMs: number): boolean {
  const memo = READINGS.get(state)?.get(seat);
  if (memo === undefined || memo.revision !== state.revision) return true;
  const started = performance.now();
  const { reading, queue } = memo;
  while (queue.length > 0) {
    const { entry, reference } = queue.shift()!;
    const own = piecesFigures(state, seat, entry.subject!, reading.books);
    reading.figures.set(entry.key, own);
    reading.plates.set(entry.key, plateAgainst(reference, own));
    if (performance.now() - started >= budgetMs) break;
  }
  reading.ms += performance.now() - started;
  reading.done = queue.length === 0;
  return reading.done;
}

/** **Every figure on the screen, read at once**: the tests' and the probes' reading. */
export function readInPlay(state: GameState, seat: number, layout: InPlayLayout = inPlayLayout(state, seat)): InPlayReading {
  const reading = beginInPlayReading(state, seat, layout);
  continueInPlayReading(state, seat, Number.POSITIVE_INFINITY);
  return reading;
}

// --- a total clicked (frame IH) ----------------------------------------------

/** One row of the breakdown sheet. */
export interface BreakdownRow {
  label: string;
  /** A small word after the label: the piece's town, its pantheon, its holder. */
  note?: string;
  /** Rounded so the sheet's summed rows add up to the empire's own figure. */
  amount: number;
  /** A piece alone, under the line for everything in play: not added in. */
  alone?: true;
}

export interface BreakdownSection {
  heading: string;
  /** A line under the heading, for a section whose rows are not added in. */
  note?: string;
  rows: BreakdownRow[];
}

/** The plain sheet a clicked total opens: every source of one voice. */
export interface InPlayBreakdown {
  voice: CouncilVoice;
  /** The empire's own figure for the voice, as the top bar shows it. */
  empire: number;
  sections: BreakdownSection[];
  /** The keys of the pieces that pay or cost the voice: they stay lit. */
  lit: ReadonlySet<string>;
}

/** The sheet's words. */
export const BREAKDOWN_WORDS = {
  heading: (voice: string) => `Where your ${voice} comes from`,
  inPlay: 'In play',
  together: 'Everything in play, together',
  aloneNote: 'Each piece alone. Pieces that work together pay more together, so these need not add up to the line above.',
  notCards: 'Not cards',
  peopleAsk: 'What your people ask',
  realmAsks: 'What your realm asks',
  ledger: 'Open the Ledger',
  /** Renown each turn, by the family of great people it favours (stage 7). */
  byFamily: 'By family',
  byFamilyNote: 'All your renown each turn, split by the great people it favours. Not added in again.',
  favouring: {
    scholar: 'Favouring scholars',
    artist: 'Favouring artists',
    engineer: 'Favouring engineers',
    merchant: 'Favouring merchants',
    general: 'Favouring generals',
  } satisfies Record<Family, string>,
  favouringNone: 'Favouring no family',
  close: 'Close',
  ledgerClass: {
    tiles: 'The land and its resources',
    buildings: 'Buildings',
    deck: 'Cards off their chairs',
    religion: 'Your towns’ faith',
    people: 'Great people’s works',
    trade: 'Trade',
    wonders: 'Wonders',
    other: 'Technologies and the rest',
  } satisfies Record<LedgerClass, string>,
} as const;

/** The voice's plain name, for the sheet's heading. */
export const VOICE_WORDS: Readonly<Record<CouncilVoice, string>> = {
  food: 'food',
  production: 'production',
  gold: 'gold',
  science: 'science',
  culture: 'culture',
  faith: 'faith',
  happiness: 'happiness',
  authority: 'authority',
  renown: 'renown',
};

/**
 * Rounds a list of exact amounts so the rounded list adds up to `target`: each
 * is floored, and what is left goes one at a time to the largest fractions
 * first. So the sheet adds up to the figure the top bar shows.
 */
export function roundToTotal(amounts: readonly number[], target: number): number[] {
  const out = amounts.map((amount) => Math.floor(amount));
  let rest = target - out.reduce((sum, value) => sum + value, 0);
  if (out.length === 0) return out;
  const order = amounts
    .map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((a, b) => b.fraction - a.fraction);
  let at = 0;
  while (rest !== 0) {
    const step = rest > 0 ? 1 : -1;
    const pick = step > 0 ? order[at % order.length]! : order[order.length - 1 - (at % order.length)]!;
    out[pick.index]! += step;
    rest -= step;
    at += 1;
  }
  return out;
}

/**
 * Renown each turn on a board, summed by the family of great people each line
 * favours: the recurring half of `explainRenown`, in `FAMILIES` order, then the
 * lines that favour none. A family that earns nothing is left out.
 */
function renownByFamily(board: GameState, seat: number): [string, number][] {
  const sums = new Map<Family | null, number>();
  for (const line of explainRenown(board, seat)) {
    if (!line.perTurn) continue;
    sums.set(line.family, (sums.get(line.family) ?? 0) + line.amount);
  }
  const rows: [string, number][] = [];
  for (const family of FAMILIES) {
    const amount = sums.get(family) ?? 0;
    if (Math.abs(amount) >= 1e-9) rows.push([BREAKDOWN_WORDS.favouring[family], amount]);
  }
  const none = sums.get(null) ?? 0;
  if (Math.abs(none) >= 1e-9) rows.push([BREAKDOWN_WORDS.favouringNone, none]);
  return rows;
}

/**
 * **Every source of one voice** (frame IH): the pieces in play that pay or cost
 * it, then what does not come from In play, so the sheet adds up to the
 * empire's figure.
 *
 * What does not come from In play is read on the board with none of it (the
 * "without" board of the totals line): the Ledger's classes for a yield
 * (`explainLedger`), the meter's own lines for happiness and authority
 * (`explainHappiness`, `explainAuthority`), and for renown the recurring half
 * of `explainRenown`, summed by the family each line favours (stage 7). For
 * renown a last section splits the whole figure by family, which is where a
 * card that moves renown from one family to another shows. Those rows and the line for
 * everything in play add up to the empire's figure, because the totals line is
 * the books with everything less the books with none.
 */
export function inPlayBreakdown(
  state: GameState,
  seat: number,
  layout: InPlayLayout,
  reading: InPlayReading,
  voice: CouncilVoice,
): InPlayBreakdown {
  const lit = new Set<string>();
  const pieceRows: BreakdownRow[] = [];
  const entries = [
    ...layout.government,
    ...layout.stacks.flatMap((stack) => stack.entries),
    ...layout.crest,
  ];
  for (const entry of entries) {
    const figure = reading.plates.get(entry.key)?.find((plate) => plate.voice === voice);
    if (figure === undefined) continue;
    lit.add(entry.key);
    pieceRows.push({ label: entry.name, ...(entry.sub === null ? {} : { note: entry.sub }), amount: figure.amount, alone: true });
  }

  // The board with none of it in force, and what it reads for this voice.
  const worlds = cardImpactWorlds(state, seat, { kind: 'pieces', pieces: allPieces(layout) });
  const none = worlds?.without ?? state;
  const rest: { asks: boolean; label: string; amount: number }[] = [];
  if (voice === 'renown') {
    for (const [label, amount] of renownByFamily(none, seat)) rest.push({ asks: false, label, amount });
  } else if (voice === 'happiness' || voice === 'authority') {
    const lines = voice === 'happiness' ? explainHappiness(none, seat) : explainAuthority(none, seat);
    for (const line of lines) {
      if (line.value === 0) continue;
      rest.push({ asks: line.part === 'cost', label: line.source, amount: line.value });
    }
  } else {
    const ledger = explainLedger(none, seat).find((row) => row.key === voice);
    for (const cls of LEDGER_CLASSES) {
      const amount = ledger?.byClass[cls] ?? 0;
      if (Math.abs(amount) < 1e-9) continue;
      rest.push({ asks: false, label: BREAKDOWN_WORDS.ledgerClass[cls], amount });
    }
  }

  // Round the summed rows (everything in play, and the rest) to the empire's figure.
  const empire = roundYield(reading.books[voice]);
  const rounded = roundToTotal([reading.total[voice], ...rest.map((row) => row.amount)], empire);
  const sections: BreakdownSection[] = [
    { heading: BREAKDOWN_WORDS.inPlay, rows: [{ label: BREAKDOWN_WORDS.together, amount: rounded[0]! }, ...pieceRows] },
  ];
  const notCards: BreakdownRow[] = [];
  const asks: BreakdownRow[] = [];
  rest.forEach((row, index) => (row.asks ? asks : notCards).push({ label: row.label, amount: rounded[index + 1]! }));
  if (notCards.length > 0) sections.push({ heading: BREAKDOWN_WORDS.notCards, rows: notCards });
  if (asks.length > 0) {
    sections.push({ heading: voice === 'authority' ? BREAKDOWN_WORDS.realmAsks : BREAKDOWN_WORDS.peopleAsk, rows: asks });
  }
  // Renown's family split, over everything: the rows are another way of
  // cutting the same figure, so they are not added in again.
  if (voice === 'renown') {
    const families = renownByFamily(state, seat);
    const split = roundToTotal(families.map(([, amount]) => amount), empire);
    const rows: BreakdownRow[] = families.map(([label], index) => ({ label, amount: split[index]!, alone: true }));
    if (rows.length > 0) sections.push({ heading: BREAKDOWN_WORDS.byFamily, note: BREAKDOWN_WORDS.byFamilyNote, rows });
  }
  return { voice, empire, sections, lit };
}
