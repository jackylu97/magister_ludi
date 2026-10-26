/**
 * The Faith sheet's Bonuses tab (batch UX10): everything your religion pays,
 * as cards on shelves, under a two-panel headline.
 *
 * The spec is `docs/plans/faith-screen-f1.md`, Tab 2, with the user's answers
 * of 2026-10-15 (`docs/flags.md` (ssssss) 4):
 *
 *   - 4.1: the cards are dealt every time the tab opens, and a figure counts up
 *     only if it changed since the player last looked; otherwise it lands.
 *   - 4.2: a god or belief card wears the Ledger's figure (its share of the
 *     Religion slice), not what giving it up would cost.
 *   - 4.3: no Order cards here. The headline still adds up to the top bar's
 *     faith, with everything the Statecraft cards pay as one slice that says
 *     where to see them.
 *
 * What is on it
 * -------------
 *   - **The headline.** Left: faith a turn, the top bar's figure, with a bar
 *     whose slices are the Ledger's faith row with the Religion class opened
 *     into its sources (`explainFaithLedger`). Right: what the religion pays a
 *     turn, voice by voice, which is the Ledger's Religion slice
 *     (`foldReligionLedger`).
 *   - **The shelves**, each with its total: your gods (and the empty places,
 *     each saying what it waits for); your religion's follower and enhancer
 *     beliefs (and the empty places, as dashed outlines); the holy cities you
 *     hold, cathedral patrons and the rites your towns keep (a plaque per holy
 *     city, a wide card per rite with its towns and their turns); and, when
 *     your towns follow another religion, that religion's follower beliefs,
 *     which pay you in those towns.
 *
 * Every Religion source the Ledger names is on exactly one card, so the cards
 * add up to the right-hand headline and to their slices of the bar. A card that
 * pays no yield this turn keeps its place and wears the flourish, because its
 * clause may be a happiness, a combat strength or a building it opens, which a
 * yield figure cannot show. A belief that opens a building (Temple Spires opens
 * the Wat) never carries a figure of its own: the Ledger counts the building's
 * yield with buildings, so the card says where the building stands instead.
 *
 * Every figure is the simulation's: `explainReligionLedgerByPlace` (the
 * Ledger's attribution, split town by town for the hover cards),
 * `explainFaithLedger`, `describeCard` and `describeEffects` for the clauses,
 * `cityRites` and `cityRiteTurnsLeft` for the rites' towns, `explainNextRung` for
 * the next god. The tab sends no command.
 *
 * How it is split
 * ---------------
 * `bonusesTabModel` is pure and is what the tests read. `drawBonusesTab` builds
 * the elements and plays the opening through the scheduler the sheet hands in,
 * so the sheet can cancel all of it on its next paint or when it closes.
 */

import { buildingDef } from '../sim/buildingData';
import type { BuildingId } from '../sim/buildingData';
import { type CityYields, emptyCityYields, tileOwnerCityId } from '../sim/cities';
import {
  type ReligionLedgerPlaces,
  type ReligionLedgerSource,
  explainFaithLedger,
  explainReligionLedgerByPlace,
  foldFaithLedger,
  foldReligionLedger,
} from '../sim/ledgerFold';
import type { LedgerClass } from '../sim/ledgerClass';
import { seatName } from '../sim/leaderData';
import { readEmpire } from '../sim/readings';
import {
  cityRiteTurnsLeft,
  cityRites,
  explainNextRung,
  holySites,
  nextRungWords,
  pantheonPlaces,
  poolHeld,
  poolSlots,
  riteTurnsFor,
} from '../sim/religion';
import {
  type BeliefAxis,
  type BeliefId,
  type ReligionBeliefPool,
  RELIGION,
  RELIGION_BELIEF_POOLS,
  RITE_IDS,
  beliefDef,
  isBeliefId,
  isConsecrationId,
  riteDef,
} from '../sim/religionData';
import { CITY_YIELD_KEYS } from '../sim/resourceData';
import { RULES } from '../sim/rulesData';
import {
  type City,
  type GameState,
  type Religion,
  cityReligion,
  foundedReligion,
  playerById,
} from '../sim/state';
import {
  type CardClause,
  anyCardDef,
  cardPressureRule,
  describeCard,
  describeEffects,
  heldReligions,
  religionFounder,
} from '../sim/statecraft';
import { hasTech } from '../sim/tech';
import { techDef } from '../sim/techData';
import { yieldShows } from '../sim/yieldFormat';
import {
  type StampReading,
  cardStampNode,
  holdCardStamp,
  landCardStamp,
  playCardStamp,
  stampFigures,
  stampIsEmpty,
  stampOfYields,
  stampText,
} from './cardStamp';
import { dealCard, dealtAt, settleDealtCard } from './cardDeal';
import { cityDisplayName } from './cityDisplay';
import { element, withArticle } from './dom';
import { AXIS_MARK, POOL_WORD, SLOT_GLYPH, beliefCardType, listWords, poolTech, poolTechName } from './faithReading';
import { YIELD_GLYPH, netFigure, signedFigure } from './figures';
import { keywordsAllowedIn, setDescriptorText } from './keywords';
import { ledgerInk } from './ledgerInk';
import { LEDGER_CLASS_NAME } from './ledgerScreen';
import { setYieldText } from './yieldMark';

// --- the model ----------------------------------------------------------------------

/** What kind of source a card stands for. */
export type BonusKind =
  | 'god'
  | 'follower'
  | 'enhancer'
  | 'holyCity'
  | 'consecration'
  | 'rite'
  | 'otherFaith';

/** One chip on a card: a town it pays in, or a town keeping its rite. */
export interface BonusChip {
  label: string;
  /** For a rite: the turns its town has left, and the length of a fresh one. */
  turnsLeft?: number;
  turnsTotal?: number;
}

/** One line of a card's hover card: a town, or the empire's own lines. */
export interface BonusPart {
  label: string;
  paid: CityYields;
}

/** One card on a shelf. */
export interface BonusCard {
  /**
   * The card's key, shared with its slice of the faith bar and with the sheet's
   * memory of what the player last saw: "card:sacredFire", "founderShare:2".
   */
  key: string;
  kind: BonusKind;
  /** The small line above the name: "a god", "a rite · kept in 3 towns". */
  eyebrow: string;
  name: string;
  /** The belief's axis, which picks the card's accent ink. */
  axis: BeliefAxis | null;
  /** The describer's clauses, keyword marks kept for the drawing. */
  clauses: CardClause[];
  /** Plain lines under the clauses: whose holy city works an enhancer, the holy site's reach. */
  notes: string[];
  /** The towns it pays in, or for a rite the towns keeping it. */
  chips: BonusChip[];
  /** Words after the chips, or in their place: "follow by majority", "no Wat bought yet". */
  where: string | null;
  /** What the foot says beside the flourish when the card pays no yield: "pays once a Wat stands". */
  quiet: string | null;
  /** The Ledger's figure for this source this turn. */
  paid: CityYields;
  /** The same figure by place, for the hover card. */
  parts: BonusPart[];
  /** Drawn two columns wide: a holy city's plaque and a rite. */
  wide: boolean;
}

/** An empty place on a shelf, drawn as a dashed outline. */
export interface BonusGhost {
  key: string;
  title: string;
  text: string;
  /** How close the bank is to the next god, from 0 to 1, for the first open place. */
  progress: number | null;
}

export type BonusShelfId = 'gods' | 'beliefs' | 'holy' | 'otherFaiths';

export interface BonusShelf {
  id: BonusShelfId;
  title: string;
  note: string;
  /** What the shelf says when it has no card and no empty place. */
  empty: string;
  /** The shelf's cards' figures, added up. */
  total: CityYields;
  cards: BonusCard[];
  ghosts: BonusGhost[];
}

/** One slice of the faith bar. */
export interface FaithSlice {
  /** A religion source's card key, or "class:<class>" for a Ledger class kept whole. */
  key: string;
  label: string;
  faith: number;
  /** The Ledger class whose ink a whole-class slice wears. */
  ledgerClass: LedgerClass | null;
  /** The axis whose ink a belief's slice wears. */
  axis: BeliefAxis | null;
}

/** Everything the Bonuses tab shows. Pure, and the whole of what a test can pin. */
export interface BonusesModel {
  seat: number;
  bank: number;
  /** Faith a turn, the top bar's figure, and the slices it is made of. */
  faith: { total: number; slices: FaithSlice[] };
  /** What the religion pays a turn, voice by voice: the Ledger's Religion slice. */
  religion: CityYields;
  shelves: BonusShelf[];
}

/** A Religion source's key: the card it names, or the religion whose founder's share it is. */
export function bonusSourceKey(source: ReligionLedgerSource): string {
  return source.kind === 'card' ? `card:${source.card}` : `founderShare:${source.religion}`;
}

/** The six voices of several figures, added up. */
function addUp(figures: readonly CityYields[]): CityYields {
  const total = emptyCityYields();
  for (const paid of figures) for (const key of CITY_YIELD_KEYS) total[key] += paid[key];
  return total;
}

/** True when a figure has anything worth printing in it. */
function pays(paid: CityYields): boolean {
  return CITY_YIELD_KEYS.some((key) => yieldShows(paid[key]));
}

/** "1 town", "3 towns". */
function towns(count: number): string {
  return `${count} ${count === 1 ? 'town' : 'towns'}`;
}

/** A town's name by id, with the capital's star, or the empire for the empire's own lines. */
function placeName(state: GameState, cityId: number | null): string {
  if (cityId === null) return 'your empire as a whole';
  const city = state.cities.find((one) => one.id === cityId);
  return city === undefined ? 'a town' : cityDisplayName(state, city);
}

/** A religion by id. */
function religionById(state: GameState, id: number): Religion | undefined {
  return state.religions.find((one) => one.id === id);
}

/** A source's parts as hover lines and as chips: the places it paid anything in. */
function placesOf(
  state: GameState,
  entry: ReligionLedgerPlaces | undefined,
): { parts: BonusPart[]; chips: BonusChip[] } {
  const parts: BonusPart[] = [];
  const chips: BonusChip[] = [];
  for (const part of entry?.parts ?? []) {
    if (!pays(part.paid)) continue;
    const label = placeName(state, part.cityId);
    parts.push({ label, paid: part.paid });
    // The empire's own lines are a line of the hover card, not a place to point at.
    if (part.cityId !== null) chips.push({ label });
  }
  return { parts, chips };
}

/**
 * The buildings a belief opens (`unlocksBuilding`). Read here for one reason: a
 * card whose only gift is a building never carries a figure, because the Ledger
 * counts the building's yield with buildings, and the card should say so rather
 * than look idle.
 */
function opensBuildings(id: BeliefId): BuildingId[] {
  const out: BuildingId[] = [];
  for (const effect of beliefDef(id).effects) {
    if (effect.kind === 'unlocksBuilding') out.push(effect.building);
  }
  return out;
}

/**
 * The pressure a religion's holy site sends out a turn, and how far, as
 * `explainPressure` asks it of whoever holds the faith's seat.
 */
function siteReach(state: GameState, religion: Religion): { strength: number; range: number } {
  const holder = religionFounder(state, religion);
  const rules = RULES.religion;
  return {
    strength: rules.siteStrength + cardPressureRule(state, holder, 'siteStrength'),
    range: rules.siteRange + cardPressureRule(state, holder, 'siteRange'),
  };
}

/**
 * Everything the Bonuses tab shows, for one seat.
 *
 * The cards are built from what the seat holds (its gods, its religion's
 * beliefs, the holy cities it holds, the rites its towns keep, the beliefs of
 * the other faiths its towns follow) and each wears its Religion source's figure
 * from the Ledger. A source left over after that (a cathedral's patron, or
 * anything new) gets a card of its own, so every source is on exactly one card.
 */
export function bonusesTabModel(state: GameState, seat: number): BonusesModel {
  const player = playerById(state, seat);
  const ledger = explainReligionLedgerByPlace(state, seat);
  const byKey = new Map<string, ReligionLedgerPlaces>();
  for (const entry of ledger) byKey.set(bonusSourceKey(entry.source), entry);
  const used = new Set<string>();
  const take = (key: string): ReligionLedgerPlaces | undefined => {
    used.add(key);
    return byKey.get(key);
  };
  const mine = foundedReligion(state, seat) ?? null;
  const ours = state.cities.filter((city) => city.ownerId === seat);
  const sites = holySites(state);

  /**
   * One belief's card. `keptIn` is the towns the belief is kept in, which is
   * where a building it opens may stand.
   */
  const beliefCard = (
    id: BeliefId,
    kind: BonusKind,
    eyebrow: string,
    keptIn: readonly City[],
  ): BonusCard => {
    const key = `card:${id}`;
    const entry = take(key);
    const { parts, chips } = placesOf(state, entry);
    const paid = entry?.paid ?? emptyCityYields();
    const card: BonusCard = {
      key,
      kind,
      eyebrow,
      name: beliefDef(id).name,
      axis: beliefDef(id).axis,
      clauses: describeCard(id),
      notes: [],
      chips,
      where: null,
      quiet: null,
      paid,
      parts,
      wide: false,
    };
    const buildings = opensBuildings(id);
    if (!pays(paid) && buildings.length > 0) {
      const names = listWords(buildings.map((building) => buildingDef(building).name));
      const standing = keptIn.filter((city) => buildings.some((building) => city.buildings.includes(building)));
      if (standing.length === 0) {
        card.where = `no ${names} bought yet`;
        card.quiet = `pays once ${withArticle(names)} stands`;
      } else {
        card.chips = standing.map((city) => ({ label: cityDisplayName(state, city) }));
        card.where = standing.length === 1 ? `has ${withArticle(names)}` : `have ${withArticle(names)}`;
        card.quiet = `the ${names}’s yield is counted with buildings`;
      }
    }
    return card;
  };

  // Your gods, in the pantheon's own order, and the places still empty.
  const gods: BonusCard[] = (player?.pantheon.beliefs ?? []).map((id) =>
    beliefCard(id, 'god', beliefCardType(undefined), ours),
  );

  // Your religion's follower and enhancer beliefs, and their empty places.
  const beliefs: BonusCard[] = [];
  const beliefGhosts: BonusGhost[] = [];
  if (mine !== null) {
    const following = ours.filter((city) => cityReligion(city) === mine.id);
    const holder = religionFounder(state, mine);
    for (const pool of RELIGION_BELIEF_POOLS) {
      const held = pool === 'follower' ? mine.follower : mine.enhancer;
      for (const id of held) {
        const card = beliefCard(id, pool, beliefCardType(pool), following);
        // An enhancer works for whoever holds the holy city, which after a
        // conquest is not the founder.
        if (pool === 'enhancer' && holder !== seat) {
          card.notes.push(`Your holy city is held by ${seatName(state, holder)}, so this belief works for them.`);
        }
        beliefs.push(card);
      }
      const slots = poolSlots(pool);
      const filled = poolHeld(mine, pool);
      if (filled < slots) beliefGhosts.push(houseGhost(state, seat, pool, filled, slots));
    }
  }

  // The holy cities you hold, then the rites your towns keep. Every rite row is
  // asked, a withdrawn one included, because a town may still be keeping one
  // from before it was withdrawn.
  const holy: BonusCard[] = [];
  for (const religion of heldReligions(state, seat)) {
    holy.push(plaqueCard(state, seat, religion, sites, take(`founderShare:${religion.id}`)));
  }
  for (const rite of RITE_IDS) {
    // Every rite a town keeps, so a town keeping two under The Double Feast
    // (Devotion batch DV8) is a chip on both cards.
    const keeping = ours.filter((city) => cityRites(state, city).includes(rite));
    const key = `card:${rite}`;
    if (keeping.length === 0 && !byKey.has(key)) continue;
    const entry = take(key);
    const fresh = riteTurnsFor(state, seat, rite) ?? 1;
    holy.push({
      key,
      kind: 'rite',
      eyebrow: `a rite · kept in ${towns(keeping.length)}`,
      name: riteDef(rite).name,
      axis: null,
      clauses: describeCard(rite),
      notes: [],
      chips: keeping.map((city) => {
        const left = cityRiteTurnsLeft(state, city, rite);
        return { label: cityDisplayName(state, city), turnsLeft: left, turnsTotal: Math.max(left, fresh, 1) };
      }),
      where: null,
      quiet: null,
      paid: entry?.paid ?? emptyCityYields(),
      parts: placesOf(state, entry).parts,
      wide: true,
    });
  }

  // Other faiths: the follower beliefs of any religion your towns follow, which
  // pay you in those towns because a follower belief pays whoever owns the town.
  const others: BonusCard[] = [];
  for (const religion of state.religions) {
    if (mine !== null && religion.id === mine.id) continue;
    const keeping = ours.filter((city) => cityReligion(city) === religion.id);
    if (keeping.length === 0) continue;
    for (const id of religion.follower) {
      if (used.has(`card:${id}`)) continue;
      const card = beliefCard(id, 'otherFaith', `a follower belief of ${religion.name}`, keeping);
      if (card.chips.length === 0 && card.where === null) {
        card.where = `kept in ${listWords(keeping.map((city) => cityDisplayName(state, city)))}`;
      }
      others.push(card);
    }
  }

  // Whatever the Ledger names that no card has taken yet: a cathedral's patron
  // joins the holy shelf, and anything else the other faiths' shelf.
  for (const entry of ledger) {
    const key = bonusSourceKey(entry.source);
    if (used.has(key)) continue;
    used.add(key);
    const source = entry.source;
    if (source.kind === 'founderShare') {
      const religion = religionById(state, source.religion);
      if (religion !== undefined) holy.push(plaqueCard(state, seat, religion, sites, entry));
      continue;
    }
    const { parts, chips } = placesOf(state, entry);
    const id = source.card;
    const base: BonusCard = {
      key,
      kind: 'otherFaith',
      eyebrow: 'from another faith',
      name: anyCardDef(id).name,
      axis: isBeliefId(id) ? beliefDef(id).axis : null,
      clauses: describeCard(id),
      notes: [],
      chips,
      where: null,
      quiet: null,
      paid: entry.paid,
      parts,
      wide: false,
    };
    if (isConsecrationId(id)) {
      holy.push({ ...base, kind: 'consecration', eyebrow: 'a cathedral’s patron' });
      continue;
    }
    const faith = isBeliefId(id)
      ? state.religions.find((one) => one.follower.includes(id) || one.enhancer.includes(id))
      : undefined;
    others.push(faith === undefined ? base : { ...base, eyebrow: `a belief of ${faith.name}` });
  }

  const places = pantheonPlaces(state, seat);
  const named = places.filter((place) => place.belief !== null).length;
  const shelves: BonusShelf[] = [
    {
      id: 'gods',
      title: 'Your gods',
      note: `the pantheon · ${named} of ${places.length} places · every town of yours`,
      empty: 'No god is named yet.',
      total: addUp(gods.map((card) => card.paid)),
      cards: gods,
      ghosts: godGhosts(state, seat),
    },
    {
      id: 'beliefs',
      title: 'Your religion’s beliefs',
      note: mine === null ? 'follower and enhancer beliefs' : followerNote(state, seat, mine),
      empty: 'You have founded no religion, so no follower or enhancer belief pays yet.',
      total: addUp(beliefs.map((card) => card.paid)),
      cards: beliefs,
      ghosts: beliefGhosts,
    },
    {
      id: 'holy',
      title: 'Holy cities and rites',
      note: 'what holding a faith’s seat pays, and the rites your towns are keeping',
      empty: 'You hold no holy city, and no town of yours is keeping a rite.',
      total: addUp(holy.map((card) => card.paid)),
      cards: holy,
      ghosts: [],
    },
  ];
  if (others.length > 0) {
    shelves.push({
      id: 'otherFaiths',
      title: 'From other faiths',
      note: 'beliefs of other religions, paying you in your towns that follow them',
      empty: '',
      total: addUp(others.map((card) => card.paid)),
      cards: others,
      ghosts: [],
    });
  }

  // The headline: the Ledger's faith row, with the Religion class opened up.
  const faithLines = explainFaithLedger(state, seat);
  const slices: FaithSlice[] = faithLines.map((line) => {
    if (line.kind === 'class') {
      return {
        key: `class:${line.class}`,
        // Order cards are on the Statecraft sheet only (ruling 4.3), so their
        // faith is one slice that says where to look.
        label: line.class === 'deck' ? 'Statecraft cards (see the Statecraft sheet)' : LEDGER_CLASS_NAME[line.class],
        faith: line.faith,
        ledgerClass: line.class,
        axis: null,
      };
    }
    const source = line.source;
    if (source.kind === 'founderShare') {
      const religion = religionById(state, source.religion);
      return {
        key: bonusSourceKey(source),
        label: religion === undefined ? 'founder’s share' : `founder’s share · ${religion.name}`,
        faith: line.faith,
        ledgerClass: null,
        axis: null,
      };
    }
    return {
      key: bonusSourceKey(source),
      label: anyCardDef(source.card).name,
      faith: line.faith,
      ledgerClass: null,
      axis: isBeliefId(source.card) ? beliefDef(source.card).axis : null,
    };
  });

  return {
    seat,
    bank: player?.faithPool ?? 0,
    faith: { total: foldFaithLedger(faithLines), slices },
    religion: foldReligionLedger(ledger),
    shelves,
  };
}

/**
 * The outline for each empty place at the fire, saying what it waits for: a
 * place a technology has not opened names the technology; the first open place
 * prints the ladder's own sentence (`nextRungWords`) with the bank against the
 * price as a bar; a further open place waits for the one before it.
 */
function godGhosts(state: GameState, seat: number): BonusGhost[] {
  const ghosts: BonusGhost[] = [];
  const rung = explainNextRung(state, seat, readEmpire(state, seat).totals.faith);
  let first = true;
  pantheonPlaces(state, seat).forEach((place, index) => {
    if (place.belief !== null) return;
    const key = `ghost:god:${index}`;
    const title = 'A god not yet named';
    if (place.awaits !== null) {
      ghosts.push({ key, title, text: `${techDef(place.awaits).name} opens this place`, progress: null });
      return;
    }
    if (first && (rung.kind === 'open' || rung.kind === 'waiting')) {
      const progress = rung.kind === 'open' ? (rung.cost <= 0 ? 1 : Math.min(1, rung.banked / rung.cost)) : null;
      ghosts.push({ key, title, text: nextRungWords(rung), progress });
    } else {
      ghosts.push({ key, title, text: 'named after the place before it', progress: null });
    }
    first = false;
  });
  return ghosts;
}

/** The dashed outline for a religion's empty belief places. */
function houseGhost(
  state: GameState,
  seat: number,
  pool: ReligionBeliefPool,
  held: number,
  slots: number,
): BonusGhost {
  const tech = poolTech(pool);
  const known = tech === null || hasTech(state, seat, tech);
  return {
    key: `ghost:${pool}`,
    title: `${POOL_WORD[pool].name}s · ${held} of ${slots}`,
    text: known ? 'a prophet’s charge draws one' : `a prophet’s charge, once you have ${poolTechName(pool)}`,
    progress: null,
  };
}

/** The beliefs shelf's note: how many of your towns follow, and how many abroad. */
function followerNote(state: GameState, seat: number, mine: Religion): string {
  let home = 0;
  let abroad = 0;
  for (const city of state.cities) {
    if (cityReligion(city) !== mine.id) continue;
    if (city.ownerId === seat) home += 1;
    else abroad += 1;
  }
  const yours =
    home === 0
      ? 'no town of yours follows your faith yet, so follower beliefs pay you nothing'
      : `follower beliefs pay in your ${towns(home)} that follow`;
  return abroad === 0
    ? yours
    : `${yours} · also kept in ${abroad} foreign ${abroad === 1 ? 'town' : 'towns'}, which pay their own owners`;
}

/**
 * A holy city's plaque: what holding the faith's seat pays (the founder's
 * share), the foreign towns that pay it (those following by majority), and the
 * holy site's pressure when one stands.
 */
function plaqueCard(
  state: GameState,
  seat: number,
  religion: Religion,
  sites: ReturnType<typeof holySites>,
  entry: ReligionLedgerPlaces | undefined,
): BonusCard {
  const site = religion.holySite;
  const cityId = site === undefined ? null : tileOwnerCityId(state, site.col, site.row);
  const city = cityId === null ? undefined : state.cities.find((one) => one.id === cityId);
  const followers = state.cities.filter((one) => one.ownerId !== seat && cityReligion(one) === religion.id);
  const notes: string[] = [];
  if (sites.some((one) => one.religion === religion.id)) {
    const reach = siteReach(state, religion);
    notes.push(`The holy site presses ${signedFigure(reach.strength)} a turn on every town within ${reach.range} hexes.`);
  }
  return {
    key: `founderShare:${religion.id}`,
    kind: 'holyCity',
    eyebrow: `holy city · ${religion.name}`,
    name: city === undefined ? religion.name : cityDisplayName(state, city),
    axis: null,
    clauses: describeEffects(RELIGION.founderTrickle),
    notes,
    chips: followers.map((one) => ({ label: one.name })),
    where: followers.length === 0 ? 'no foreign town follows by majority yet' : 'follow by majority',
    quiet: null,
    paid: entry?.paid ?? emptyCityYields(),
    parts: placesOf(state, entry).parts,
    wide: true,
  };
}

// --- the memory of what was last seen ---------------------------------------------------

/**
 * Each figure on the tab as the words it prints, by its key: what the sheet
 * remembers between two looks, so a figure counts up only when it changed
 * (ruling 4.1). The headline's two figures are "headline:faith" and
 * "headline:religion".
 */
export function bonusFigures(model: BonusesModel): Map<string, string> {
  const figures = new Map<string, string>();
  figures.set('headline:faith', `${signedFigure(model.faith.total)}${YIELD_GLYPH.faith}`);
  figures.set('headline:religion', paidText(model.religion));
  for (const shelf of model.shelves) {
    for (const card of shelf.cards) figures.set(card.key, paidText(card.paid));
  }
  return figures;
}

/** True when a figure counts up: it has never been seen, or it changed since. */
export function figureChanged(seen: ReadonlyMap<string, string> | undefined, key: string, now: string): boolean {
  return seen?.get(key) !== now;
}

/** "+3🕯 +1💰": a figure's voices in words, for a shelf's total and a hover line. */
export function paidText(paid: CityYields): string {
  return stampText(stampFigures(stampOfYields(paid)));
}

// --- the drawing -----------------------------------------------------------------------

/** How the tab moves this paint. The sheet owns the timers, so it can cancel them. */
export interface BonusesMotion {
  /** True when the tab has just opened and motion is allowed: deal, grow and count. */
  opening: boolean;
  /** Whether a figure counts up this opening (it changed since the player last looked). */
  counts(key: string): boolean;
  /** Runs `run` after `ms` milliseconds, unless the sheet repaints or closes first. */
  later(ms: number, run: () => void): void;
  /** Keeps a stamp's canceller, so the sheet can stop a count on its next paint. */
  keep(cancel: () => void): void;
}

/** What the drawing calls out to. */
export interface BonusesHandlers {
  /** Raises a hover card beside a card (`infoCard.ts`). Without it, there is none. */
  hover?: (anchor: HTMLElement, build: () => Node) => void;
}

/** How far apart the faith bar's slices start to grow, in milliseconds. */
export const SLICE_STAGGER_MS = 90;

/** How many town chips a narrow card shows before "+N more"; the hover card lists them all. */
export const CHIP_LIMIT = 6;

/**
 * A stamp: held, counted or landed, as this paint's motion says. On an opening
 * a changed figure starts at zero and counts once its card has come round; an
 * unchanged one is there from the start and lands. A plain repaint holds every
 * figure still.
 */
function seatStamp(stamp: HTMLElement, reading: StampReading, key: string, motion: BonusesMotion, at: number): void {
  if (!motion.opening) {
    holdCardStamp(stamp, reading, 'figure');
    return;
  }
  const counts = motion.counts(key);
  holdCardStamp(stamp, reading, counts ? 'zero' : 'figure');
  motion.later(at, () => {
    if (counts) motion.keep(playCardStamp(stamp, reading));
    else landCardStamp(stamp, reading);
  });
}

/** The hover card's content: the card's figure, place by place, and its total. */
function hoverNode(card: BonusCard): Node {
  const box = element('div', 'faith-hover');
  const head = element('div', 'info-card-head');
  head.append(element('span', 'info-card-name', card.name));
  head.append(element('span', 'info-card-kind', card.eyebrow));
  box.append(head);
  if (card.parts.length === 0) {
    const said = card.quiet === null ? 'Pays no yield this turn.' : `Pays no yield this turn: it ${card.quiet}.`;
    box.append(element('p', 'info-card-note', said));
    return box;
  }
  box.append(element('p', 'info-card-heading', 'Where it pays this turn'));
  const list = element('ul', 'meter-lines ledger');
  for (const part of card.parts) {
    const row = element('li', 'meter-line');
    row.append(element('span', 'meter-line-source', part.label));
    const value = element('span', 'meter-line-value');
    setYieldText(value, paidText(part.paid));
    row.append(value);
    list.append(row);
  }
  box.append(list);
  const total = element('div', 'meter-total ledger-total');
  total.append(element('span', 'meter-line-source', 'In all'));
  const value = element('span', 'meter-line-value');
  setYieldText(value, paidText(card.paid));
  total.append(value);
  box.append(total);
  return box;
}

/** A card's clauses. Keywords are links unless the host is itself a control. */
function drawClauses(into: HTMLElement, clauses: readonly CardClause[]): void {
  const linked = keywordsAllowedIn(into);
  for (const clause of clauses) {
    const item = element('li', 'sc-clause');
    setDescriptorText(item, clause.text, { linked });
    into.append(item);
  }
}

/** The town chips under a card, and the words after them. */
function drawWhere(card: BonusCard): HTMLElement | null {
  if (card.chips.length === 0 && card.where === null) return null;
  const where = element('div', 'faith-card-where');
  const shown = card.wide ? card.chips : card.chips.slice(0, CHIP_LIMIT);
  for (const chip of shown) {
    const node = element('span', chip.turnsLeft === undefined ? 'faith-chip' : 'faith-chip is-kept');
    node.append(element('span', 'faith-chip-name', chip.label));
    if (chip.turnsLeft !== undefined && chip.turnsTotal !== undefined) {
      const bar = element('i', 'faith-chip-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = element('b', 'faith-chip-fill');
      fill.style.width = `${Math.round((Math.min(chip.turnsLeft, chip.turnsTotal) / chip.turnsTotal) * 100)}%`;
      bar.append(fill);
      node.append(bar);
      node.append(element('span', 'faith-chip-left', `${chip.turnsLeft}t`));
      node.title = `${chip.label}: ${chip.turnsLeft} ${chip.turnsLeft === 1 ? 'turn' : 'turns'} left`;
    }
    where.append(node);
  }
  const more = card.chips.length - shown.length;
  if (more > 0) where.append(element('span', 'faith-chip is-more', `+${more} more`));
  if (card.where !== null) where.append(element('span', 'faith-card-where-words', card.where));
  return where;
}

/** The glyph in a card's emblem chip. */
function emblemGlyph(card: BonusCard): string {
  if (card.axis !== null) return AXIS_MARK[card.axis].glyph;
  if (card.kind === 'rite') return '❂';
  if (card.kind === 'consecration') return '✚';
  return '✶';
}

/**
 * One card's face: the Statecraft card's frame, inner rule, mono eyebrow and
 * name (`.sc-card`), an emblem chip, the clauses, the towns, and the figure at
 * the foot. An `article`, not a button: nothing happens when it is pressed, so
 * its keywords stay links.
 */
function drawCard(card: BonusCard): { face: HTMLElement; stamp: HTMLElement } {
  const classes = ['sc-card', 'faith-card', `is-${card.kind}`];
  if (card.wide) classes.push('is-wide');
  const face = element('article', classes.join(' '));
  face.dataset.src = card.key;
  if (card.axis !== null) face.dataset.axis = card.axis;
  face.tabIndex = 0;
  const head = element('div', 'sc-card-head');
  const emblem = element('span', 'faith-card-emblem', emblemGlyph(card));
  emblem.setAttribute('aria-hidden', 'true');
  head.append(emblem);
  head.append(element('span', 'sc-card-type', card.eyebrow));
  face.append(head);
  face.append(element('h4', 'sc-card-name', card.name));
  if (card.clauses.length > 0) {
    const list = element('ul', 'sc-clauses');
    drawClauses(list, card.clauses);
    face.append(list);
  }
  for (const note of card.notes) face.append(element('p', 'faith-card-note', note));
  const where = drawWhere(card);
  if (where !== null) face.append(where);
  const foot = element('div', 'faith-card-foot');
  const stamp = cardStampNode();
  foot.append(stamp);
  if (card.quiet !== null) foot.append(element('span', 'faith-card-quiet', card.quiet));
  face.append(foot);
  return { face, stamp };
}

/** One empty place, as a dashed outline. */
function drawGhost(ghost: BonusGhost): HTMLElement {
  const face = element('article', 'faith-card is-ghost');
  face.dataset.src = ghost.key;
  const glyph = element('span', 'faith-ghost-glyph', SLOT_GLYPH);
  glyph.setAttribute('aria-hidden', 'true');
  face.append(glyph);
  face.append(element('b', 'faith-ghost-title', ghost.title));
  face.append(element('span', 'faith-ghost-text', ghost.text));
  if (ghost.progress !== null) {
    const bar = element('span', 'faith-ghost-bar');
    bar.setAttribute('aria-hidden', 'true');
    const fill = element('span', 'faith-ghost-fill');
    fill.style.width = `${Math.round(ghost.progress * 100)}%`;
    bar.append(fill);
    face.append(bar);
  }
  return face;
}

/** The ink a slice of the bar wears: its Ledger class's, its belief's axis, or faith's. */
function sliceInk(slice: FaithSlice): string {
  if (slice.ledgerClass !== null) return ledgerInk(slice.ledgerClass);
  // A belief's slice wears its axis through `[data-axis]`, as its card's frame does.
  if (slice.axis !== null) return 'var(--line-ink)';
  return 'var(--y-faith)';
}

/** The left half of the headline: faith a turn, the bar of slices, and its key. */
function drawFaithHead(
  model: BonusesModel,
  motion: BonusesMotion,
  slices: Map<string, HTMLElement>,
): { panel: HTMLElement; bar: HTMLElement } {
  const panel = element('section', 'faith-head-card');
  panel.append(element('p', 'eyebrow sc-eyebrow', 'faith a turn · the top bar’s figure'));
  const row = element('div', 'faith-head-figure');
  const reading = stampOfYields({ ...emptyCityYields(), faith: model.faith.total });
  if (stampIsEmpty(reading)) {
    row.append(element('span', 'faith-head-none', 'none'));
  } else {
    const stamp = cardStampNode();
    row.append(stamp);
    seatStamp(stamp, reading, 'headline:faith', motion, 0);
  }
  row.append(element('small', 'faith-head-bank', `a turn, into a bank of ${netFigure(model.bank)}`));
  panel.append(row);

  // The bar draws what adds; the key lists every slice, a cost included, so the
  // key's figures add up to the headline.
  const bar = element('div', 'faith-bar');
  bar.setAttribute('aria-hidden', 'true');
  const key = element('ul', 'faith-key');
  const positive = model.faith.slices.reduce((sum, slice) => sum + Math.max(0, slice.faith), 0);
  let grown = 0;
  for (const slice of model.faith.slices) {
    const ink = sliceInk(slice);
    if (slice.faith > 0 && positive > 0) {
      const node = element('span', 'faith-slice');
      node.dataset.src = slice.key;
      if (slice.axis !== null) node.dataset.axis = slice.axis;
      node.style.setProperty('--slice-ink', ink);
      node.title = `${slice.label} ${signedFigure(slice.faith)}`;
      const width = `${((slice.faith / positive) * 100).toFixed(2)}%`;
      if (motion.opening) {
        // Drawn empty, then given its width a beat later so the transition
        // runs; each slice starts `SLICE_STAGGER_MS` after the one before.
        node.style.width = '0%';
        node.style.setProperty('--slice-delay', `${grown * SLICE_STAGGER_MS}ms`);
        motion.later(30, () => {
          node.style.width = width;
        });
      } else {
        node.style.width = width;
      }
      grown += 1;
      bar.append(node);
      slices.set(slice.key, node);
    }
    const item = element('li', slice.faith < 0 ? 'faith-key-item is-cost' : 'faith-key-item');
    item.dataset.src = slice.key;
    const swatch = element('span', 'faith-key-swatch');
    swatch.setAttribute('aria-hidden', 'true');
    if (slice.axis !== null) swatch.dataset.axis = slice.axis;
    swatch.style.setProperty('--slice-ink', ink);
    item.append(swatch);
    item.append(element('span', 'faith-key-name', slice.label));
    item.append(element('b', 'faith-key-figure', signedFigure(slice.faith)));
    key.append(item);
  }
  if (model.faith.slices.length === 0) key.append(element('li', 'faith-key-item is-none', 'Nothing pays faith yet.'));
  panel.append(bar);
  panel.append(key);
  return { panel, bar };
}

/** The right half of the headline: what the religion pays, voice by voice. */
function drawReligionHead(model: BonusesModel, motion: BonusesMotion): HTMLElement {
  const panel = element('section', 'faith-head-card');
  panel.append(element('p', 'eyebrow sc-eyebrow', 'what your religion pays a turn'));
  const row = element('div', 'faith-head-figure is-voices');
  const reading = stampOfYields(model.religion);
  if (stampIsEmpty(reading)) {
    row.append(element('span', 'faith-head-none', 'nothing yet'));
  } else {
    const stamp = cardStampNode();
    row.append(stamp);
    seatStamp(stamp, reading, 'headline:religion', motion, 0);
  }
  panel.append(row);
  panel.append(element('p', 'faith-head-match', 'The Ledger’s Religion slice, voice by voice.'));
  panel.append(
    element(
      'p',
      'faith-head-note',
      'Gods, beliefs, holy cities, cathedrals and rites. What your Statecraft cards pay is counted with Statecraft, as the Ledger counts it.',
    ),
  );
  return panel;
}

/**
 * The Bonuses tab, drawn and set moving.
 *
 * On an opening (`motion.opening`): the faith bar's slices grow left to right,
 * `SLICE_STAGGER_MS` apart, and the headline's figures count up or land; every
 * card on the shelves is dealt face down and turned over in order
 * (`cardDeal.ts`), and its figure then counts up (hold, count, land with the
 * overshoot and glow) or simply lands. A plain repaint moves nothing, and
 * neither does anything under reduced motion: the sheet never asks for an
 * opening then.
 *
 * Hover: a card lifts and lights its slice of the bar while the other slices
 * dim, and a slice lights its card. Each card's hover card lists its figure
 * place by place.
 */
export function drawBonusesTab(model: BonusesModel, motion: BonusesMotion, handlers: BonusesHandlers): HTMLElement {
  const tab = element('section', 'faith-bonuses');
  const slices = new Map<string, HTMLElement>();
  const cards = new Map<string, HTMLElement>();

  const headline = element('div', 'faith-headline');
  const { panel, bar } = drawFaithHead(model, motion, slices);
  headline.append(panel);
  headline.append(drawReligionHead(model, motion));
  tab.append(headline);

  let dealt = 0;
  for (const shelf of model.shelves) {
    const block = element('section', `faith-shelf is-${shelf.id}`);
    const head = element('div', 'faith-shelf-head');
    head.append(element('h5', 'faith-shelf-title', shelf.title));
    head.append(element('span', 'faith-shelf-note', shelf.note));
    const total = element('span', 'faith-shelf-total');
    if (pays(shelf.total)) setYieldText(total, paidText(shelf.total));
    head.append(total);
    block.append(head);
    const grid = element('div', 'faith-cards');
    if (shelf.cards.length === 0 && shelf.ghosts.length === 0) {
      grid.append(element('p', 'faith-shelf-empty', shelf.empty));
    }
    for (const card of shelf.cards) {
      const { face, stamp } = drawCard(card);
      const reading = stampOfYields(card.paid);
      const index = dealt;
      if (!stampIsEmpty(reading)) seatStamp(stamp, reading, card.key, motion, motion.opening ? dealtAt(index) : 0);
      if (motion.opening) {
        dealCard(face, index);
        motion.later(dealtAt(index), () => settleDealtCard(face));
      }
      handlers.hover?.(face, () => hoverNode(card));
      cards.set(card.key, face);
      grid.append(face);
      dealt += 1;
    }
    // The empty places are outlines, not cards, so nothing deals them.
    for (const ghost of shelf.ghosts) grid.append(drawGhost(ghost));
    block.append(grid);
    tab.append(block);
  }

  // A card and its slice of the bar light each other.
  const light = (src: string, on: boolean): void => {
    const slice = slices.get(src);
    bar.classList.toggle('is-dim', on && slice !== undefined);
    slice?.classList.toggle('is-lit', on);
    cards.get(src)?.classList.toggle('is-lit', on);
  };
  for (const [src, face] of cards) {
    face.addEventListener('pointerenter', () => light(src, true));
    face.addEventListener('pointerleave', () => light(src, false));
    face.addEventListener('focus', () => light(src, true));
    face.addEventListener('blur', () => light(src, false));
  }
  for (const [src, slice] of slices) {
    slice.addEventListener('pointerenter', () => light(src, true));
    slice.addEventListener('pointerleave', () => light(src, false));
  }
  return tab;
}
