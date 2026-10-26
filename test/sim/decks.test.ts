/**
 * **The decks rework, D1a — the structure, pinned** (`docs/plans/decks-rework.md`
 * "D1a", its "Pins" line; the design of record is `docs/six-decks-first-cut.md`
 * — "The structure", "Leader pools", "Availability and offer rules", "Doctrine
 * reward hands"; ruled `docs/flags.md` (iiiiii)).
 *
 * What is pinned, in the plan's own order: the seat pool for a two-deck leader
 * and for the rainbow; the bands gated on the ladder tier **and** the research
 * age; the draw's positions and cadence over twenty seeded hands; the
 * rarity-first odds within tolerance; a charter pick that grants and seats
 * nothing; the Doctrine offer that replaced the reward hands (batch C3); the
 * retired rows in no pool;
 * a replayed log byte-identical; and the design doc's structure paragraphs
 * sync-tested where they state a number (chairs, counts, probabilities, the
 * leader pools).
 *
 * **The shelf is stocked by the bench** (`stockStandardDecks`): every
 * pre-rework row is `retired: true`, and the claims about the *draw* — its
 * positions, its cadence, its odds, its bands — want a shelf whose shape the
 * test chose, so the bench un-retires rows of the table into decks for the
 * file's lifetime and puts them back after. **D1b's rows stand behind that
 * stocking** now rather than instead of it: the deck files carry a hundred and
 * forty-three live rows, so the bench's sixty are a known part of a larger
 * shelf and every count here is folded off the shelf rather than typed.
 *
 * The one describe that runs *unstocked* was "the honest state of D1a — every
 * shelf empty", and D1b replaced the claim it was making: the pool is no longer
 * empty, so what is pinned there now is **the rows in no pool** — the retired
 * shelf and the deferred halves — and the exhausted arm reached the honest way.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { LEADER_IDS, leaderDecks, leaderDef } from '../../src/sim/leaderData';
import { RITE_IDS, riteAbility } from '../../src/sim/religionData';
import {
  type GameState,
  type Player,
  SCHEMA_VERSION,
  playerById,
} from '../../src/sim/state';
import {
  HAND_POSITIONS,
  type HandPosition,
  adoptGovernmentAt,
  chairMisfitRefusal,
  currentBandOf,
  deckPoolOf,
  draftExhausted,
  drawOrderOffer,
  drawOrderOptions,
  drawRarityFirst,
  eligibleFor,
  expectedHandBags,
  isRainbowSeat,
  newPlayerStatecraft,
  positionBag,
  rarityFirstOdds,
  rarityOdds,
  researchAgeOf,
  settleDraft,
  slotOrderError,
  slotTypesOf,
  statecraftBlocker,
  thirdPositionOf,
} from '../../src/sim/statecraft';
import {
  type DeckId,
  type DoctrineId,
  BANDS,
  DECK_FILES,
  DECK_FILE_DOCTRINES,
  DECK_FILE_ORDERS,
  DECK_IDS,
  DECK_WORDS,
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  STATECRAFT,
  TIER_LADDER,
  bandTierAt,
  chairsAtTier,
  doctrineDef,
  governmentTierForDoctrineBand,
  governmentDef,
  governmentsAtTier,
  isDeckId,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  ordersForDecks,
  slotCount,
  slotLayout,
} from '../../src/sim/statecraftData';
import { hasAbility, isUnlocked, researchError } from '../../src/sim/tech';
import { TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { BUILDING_IDS } from '../../src/sim/buildingData';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import { stockDecks, stockStandardDecks, stockedShelf } from './statecraftHelpers';
import { createGame, newGame } from './newGameHelpers';

// --- the design doc, read ------------------------------------------------------

const docFiles = import.meta.glob('../../docs/six-decks-first-cut.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const DOC = Object.values(docFiles)[0] as string;

/** The Doctrines plan, whose rulings fix how government tiers pair with Doctrine tiers. */
const PLAN = Object.values(
  import.meta.glob('../../docs/plans/doctrines-governments-chairs.md', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
)[0] as string;

/** The rows of the first table under a heading, cells trimmed, header and rule skipped. */
function docTable(heading: string): string[][] {
  const start = DOC.indexOf(heading);
  expect(start, heading).toBeGreaterThanOrEqual(0);
  const lines = DOC.slice(start).split('\n').slice(1);
  const rows: string[][] = [];
  let inTable = false;
  for (const line of lines) {
    if (!line.startsWith('|')) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows.slice(1);
}

// --- fixtures -------------------------------------------------------------------

/** A two-seat duel: seat 0 under a two-deck figure, seat 1 under the rainbow. */
function seated(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'pachacuti' },
      { name: 'Bors', color: '#3a7fe8', leader: 'ibnBattutaOfTangier' },
    ],
  });
}

/**
 * Two Dominion seats (Taizong, Dominion and Magisterial; Modu, Dominion and
 * Devotion): the only deck with a Doctrine in the data so far (batch C3), so an
 * adoption here opens a Doctrine offer.
 */
function dominionSeats(seed = 11): Game {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true, leader: 'taizong' },
      { name: 'Bors', color: '#3a7fe8', leader: 'modu' },
    ],
  });
}

/** Fills the meter and deals a draft to this seat; answers what it dealt. */
function dealTo(state: GameState, player: Player) {
  player.culturePool = 10_000;
  return settleDraft(state, player);
}

/**
 * Puts every card the seat can be dealt now into its collection. Repeated
 * until the bag is empty, because holding a charter that opens tended land
 * makes the cards marked "Needs tended land" dealable on the next reading.
 */
function holdEverythingDealt(state: GameState, player: Player): void {
  for (let pass = 0; pass < 5; pass++) {
    const left = eligibleFor(state, player);
    if (left.length === 0) return;
    player.statecraft.orders.push(...left);
  }
  expect(eligibleFor(state, player)).toEqual([]);
}

/** A technology of this age, to show that the research age does not gate a band. */
function techOfAge(age: 1 | 2 | 3 | 4): TechId {
  const id = TECH_IDS.find((tech) => techDef(tech).age === age);
  expect(id, `a technology of age ${age}`).toBeDefined();
  return id!;
}

/**
 * **The retired shelf** — every Order the design withdrew, kept for saves and
 * the Compendium — and **the deck rows** D1b wrote beside it. The split is the
 * file a row lives in, which is exactly what `DECK_FILE_ORDERS` names, so the
 * two halves below never have to be listed by hand.
 */
const DECK_ROWS = new Set(DECK_FILES.flatMap((file) => [...DECK_FILE_ORDERS[file]]));
const SHELF_ROWS = ORDER_IDS.filter((id) => !DECK_ROWS.has(id));

/**
 * The Doctrines in the deck files that are retired. The Servian Reforms left
 * the Dominion sheet by the user's edit, and Dominion batch D9 retired its row
 * (`docs/plans/dominion-themes-triage.md`, reading 7).
 */
const RETIRED_DECK_DOCTRINES: readonly DoctrineId[] = ['theServianReforms'];

describe('the schema, as landed', () => {
  it('gives every Order and Doctrine row a deck list and a band', () => {
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      expect(Array.isArray(def.decks), id).toBe(true);
      expect(def.decks.length, id).toBeLessThanOrEqual(2);
      expect(new Set(def.decks).size, id).toBe(def.decks.length);
      for (const deck of def.decks) expect(isDeckId(deck), `${id}: ${deck}`).toBe(true);
      expect(BANDS, id).toContain(def.band);
    }
    // The Doctrines split along the file a row lives in, as the Orders do
    // below. The rows in `data/statecraft.json` are the old ones, all retired
    // and kept for saves. The rows in the deck files (batch C3) are live: each
    // names its decks and a sheet tier from I to IV, and is offered with the
    // government tier that pairs with it.
    const deckDoctrines = new Set<DoctrineId>(Object.values(DECK_FILE_DOCTRINES).flat());
    expect(deckDoctrines.size).toBeGreaterThan(0);
    for (const id of DOCTRINE_IDS) {
      const def = doctrineDef(id);
      expect(Array.isArray(def.decks), id).toBe(true);
      expect(BANDS, id).toContain(def.band);
      if (!deckDoctrines.has(id)) {
        expect(def.retired, id).toBe(true);
        continue;
      }
      // A deck may retire one of its own Doctrines, as it retires an Order.
      // The row keeps its decks, tier and effects, because a save may hold it.
      if (RETIRED_DECK_DOCTRINES.includes(id)) expect(def.retired, id).toBe(true);
      else expect(def.retired, id).toBeUndefined();
      expect(def.decks.length, id).toBeGreaterThan(0);
      for (const deck of def.decks) expect(isDeckId(deck), `${id}: ${deck}`).toBe(true);
      expect([1, 2, 3, 4], id).toContain(def.band);
      expect(def.tier, id).toBe(governmentTierForDoctrineBand(def.band));
    }
  });

  /**
   * **D1b replaced D1a's "every row retired" claim.** D1a retired the whole
   * table because there was nothing else to deal; D1b wrote three hundred and
   * ninety-nine rows into the seven deck files, of which a hundred and
   * forty-four are live. So the claim splits in two along the file a row lives
   * in, and neither half is the old blanket one: the **shelf** is retired and
   * dealt by nobody, the **decks** carry no `retired` at all and are dealt
   * exactly when `orderIsDealt` says — live (effects) or deferred (a sentence
   * and nothing to slot).
   */
  it('retires the whole shelf and only the decks’ own cuts, and deals each by its own rule', () => {
    expect(SHELF_ROWS.length).toBeGreaterThan(200);
    for (const id of SHELF_ROWS) {
      const def = orderDef(id);
      expect(def.retired, id).toBe(true);
      expect(orderIsDealt(id), id).toBe(false);
    }
    let live = 0;
    for (const id of DECK_ROWS) {
      const def = orderDef(id);
      // A deck may retire its own cuts (the deck implementation batches,
      // `docs/plans/deck-implementation.md`): a retired deck row is dealt by
      // nobody, exactly like a shelf row.
      if (def.retired === true) {
        expect(orderIsDealt(id), id).toBe(false);
        continue;
      }
      // Live or deferred, never both ways round: a row with effects is dealt, a
      // row with a `deferred` sentence and nothing to slot is not.
      // A commission (batch C) is dealt for its goal and reward, with no effects,
      // and a charter whose grant exists (the Expansionist tended-work unlocks,
      // the Commerce batch's Plantation House and Numidian Cavalry, The Fast's
      // rite) is dealt for the grant.
      // A grant on the draft (Dominion batch D5's The Sword of State and The
      // Cleruchy) is dealt for the grant, as a charter is.
      const dealt =
        def.effects.length > 0 ||
        def.commission !== undefined ||
        def.onDraft !== undefined ||
        (def.charter !== undefined && def.deferred === undefined);
      expect(orderIsDealt(id), id).toBe(dealt);
      if (dealt) expect(def.deferred, `${id} is dealt`).toBeUndefined();
      else expect(def.deferred, `${id} is in no pool`).toBeDefined();
      if (dealt) live += 1;
    }
    // **D2a moved this** (`docs/plans/decks-shape-audit.md`, "D2a — predicates"):
    // five new members on unions the evaluator already walked — a threshold on a
    // shelf of buildings, a worked improvement, a worked great person's work, a
    // marvel standing in the town, the negations those wanted, and the ring of
    // six on a hex condition — un-deferred thirty-two rows across five files.
    //
    // **And D2b moved it again** ("counts and reach"): counts and ceilings on the
    // five effects that had none, a scope on the renown trickle and on the
    // purchase rider, the empire-building selector, a per-town writ price and
    // four distinct-kind counts — twenty-seven more rows, across all seven.
    //
    // **And D2c a third time** ("occasions"): three moments a growing card may
    // count (a kill, a unit trained, a camp burnt out), a windfall grant that is
    // a share of what the occasion itself measured, the world's ledger of what
    // was done first, and a once-a-turn stamp on a rider — fifteen more rows,
    // across six of the seven.
    //
    // **And D2d a fourth time** ("the age stamp"): a building, a great person's
    // work and a trade route each remember the turn they were placed, read as
    // "at least this many turns old" by three city scopes, one hex condition and
    // the route `pays` — six more rows, in two of the seven. The Woodland line's
    // maturity is deliberately not among them: a wood nobody planted has stood
    // since the world was made, so that word belongs to the planting system and
    // not to a stamp.
    //
    // **And C1 a fifth time** (the Commerce deck, read against the user's own
    // sheet): no new predicate at all for fifteen of its sixteen, only a
    // re-triage — most of D1b's deferral notes predate the four passes above and
    // were out of date — plus the eleven rows the sheet adds and one field, a
    // **movement** mark a card may write on a piece at its birth, which
    // `UnitStamp` has carried since the Levée and only a muster could write.
    // Sixteen more rows, in one of the seven.
    //
    // **And C2 a sixth time** (the cheap Commerce members): a count of the
    // hexes inside a realm's borders that answer a tile condition, a count of
    // the empires a seat has met, a divisor on the per-neighbour hex reading,
    // and two named rules at the purchase counter — the capital's exemption
    // from the one-a-turn limit and a waiver of a unit's strategic resource.
    // Six new rows plus four that were waiting on them, in two of the seven.
    // Frontier Investment needed nothing new at all: a route share already
    // takes a destination scope and a crossing.
    //
    // **And C3 a seventh time** (the Commerce cards that lift a rule of the
    // simulation, ruled in `docs/flags.md` item (pppppp)): two named rules at
    // refusals that already had a lift beside them — gold may buy a wonder, and
    // gold may pay for a redraw — a percentage on how long a trade route runs,
    // a route narrowing on how far apart its two towns are, a draft narrowed to
    // one great-person family, and a filter saying an occasion was about a
    // building at all. Three deferred rows came live, one brand-new row was
    // written (A Court of Merchants), and Civic Receipts was reworked in place.
    // Four more live rows, all in the Commerce file.
    //
    // **And C4 an eighth time**: the marker that says a building is one of the
    // realm's single great houses, read in two more places and from the side
    // that names the *ordinary* shelves (The Merchant Works, Private Patronage),
    // one more named rule at a refusal that already had one — the border freeze
    // lifted for the tile counter (Purchased Prosperity) — and a timed grant
    // that renews its window instead of stacking a second. Two deferred rows
    // came live and three brand-new rows were written, one of them live.
    // Three more live rows, all in the Commerce file.
    //
    // **And C5 a ninth time**: a card may now count the trade routes meeting a
    // town, by direction and by whose town sits at the far end, and a counted
    // renown trickle may carry a ceiling per town rather than one over the whole
    // realm. Four more live rows — The Home Market, The League of Cities, The
    // Chartered Metropolis and the shared Cosmopolitan Court.
    //
    // **And C6 a tenth time** ("the bilateral grant and the trading post"): a
    // town now records which empires keep a trading post in it, and a card may
    // pay an empire that is not the one holding it — on the town a caravan
    // reaches, or on a foreign town holding your post. Three deferred Commerce
    // rows came live (The Common Road, The Foreign Factor, The Merchant
    // Commonwealth) and one brand-new live row was written (Entrenched
    // Interests, which the user's sheet listed and the data had never carried).
    // Four more live rows, all in the Commerce file.
    //
    // **And C7 an eleventh time** ("the six one-blocker Commerce rows"), which
    // opened five seams: a route's pay may be narrowed by the medium it takes,
    // how far a caravan may be sent by sea joined the figures a law may move, a
    // named rule waives that reach between two towns holding your post, a
    // purchase rider may ride on hiring a caravan, and `BuildingDef`'s
    // one-to-a-realm marker was split into the limit and the class so a card can
    // lift the first without touching the second. Five deferred Commerce rows
    // came live — The Admiralty of Trade, The Harbour Chain, The Factors'
    // Houses, Caravanserai Cities and Strategic Exports. Five more live rows,
    // all in the Commerce file.
    //
    // **And C8 a twelfth time** ("faith on routes, copies and provenance"),
    // which opened four seams: a trade route may carry faith (it paid five
    // voices and now pays six), a route line may name a condition satisfied by
    // *either* of its two towns, a town may be asked what the far end of the
    // routes reaching it holds, and a building records which bank paid for it
    // beside the turn it went up. Four more live rows — Pilgrim Markets and The
    // Grain Exchange in the shared file, The Endowment freed in Commerce, and
    // Royal Assays written there for the first time.
    //
    // **And batch L** (levies): a town may spend a citizen on what a card
    // names. Five more live rows, all Expansionist — Levy of the Land, The
    // Muster of the Fields and Seasonal Levies freed, The Corvée and The
    // General Levy written for the first time.
    // **And batch C** (commissions): three rows live with a goal and a reward
    // and no effects — Commission: Clear the Frontier in Dominion, Corner the
    // Market and The Strongroom in Commerce.
    // **The Dominion batch** (D2 of the deck implementation plan) moved it by
    // minus five (61 live Dominion rows before, 56 after); **batch D3** (the
    // Expansionist sheet) by plus 32 (the four tended-work charters, three
    // commissions and twenty-eight cards with effects, less three live rows
    // retired); and **the Commerce batch** by plus six (twenty-four in, eighteen
    // live rows retired as its proposed cuts).
    // **And the Devotion deck batch**: thirty-three more. The sheet's
    // fifty-two cards stand at fifty live (The Interdict and Consecrated
    // Ground wait), against eighteen live rows before, The Holy Army included
    // in both counts; the twenty-five cuts are retired.
    // **And batch S** (the shared cards between two approved decks): ten more.
    // Three deferred shared rows came live (Rites of Passage, The Sacred Host,
    // The Crusader Orders), eight new live rows were written (The Barbarian
    // Frontier, The Oriflamme, The Flood Festival, The Road Garrisons, Convert
    // It or Tax It, War Bonds, Professional Soldiers and The Chartered
    // Company's charter), and Frontier Garrisons was retired. The Holy Army
    // moved from the Devotion file to the shared one and is live in both counts.
    // **And Dominion batch D0** (the cards that needed no new shape): eleven
    // more. Thirteen new Dominion rows and Carried-Off Scholars in the shared
    // file came live, and the sheet's three cuts (Defensive Lines, Arsenals and
    // Naval Supremacy) were retired.
    // **And Dominion batch D1** (ranks: earning them): nine more. Nine new
    // Dominion rows came live; The Training Cadre and Honours of the Legion
    // took over two rows that were already live (Drill Manuals and The War
    // Hall Schools), so they add nothing to the count.
    // **And Dominion batch D2** (ranks read, and combat rules): seven more.
    // Seven new Dominion rows came live; The Soldiers' Purse was reworked and
    // The Marching Camps took over March Discipline's row, both already live.
    // **And Dominion batch D3** (pillage and grant delivery): eight more.
    // Eight new Dominion rows came live; Armoury Guilds was reworked in place
    // and was already live.
    // **And Expansionist batch E0** (the types, and the cards that need no new
    // shape): twenty-seven more. Twenty-seven new Expansionist rows came live,
    // and two deferred rows were freed (The Rope Stretchers, and Garden Cities
    // in the shared file); the user's two cuts, The Forest Gardens and
    // Daughter Towns, were live and are retired.
    // **And Dominion batch D4** (unrest, authority, and "this game" counts):
    // nine more. Nine new Dominion Orders came live. The Proconsuls was
    // reworked in place and was already live. Its two Doctrines are not
    // Orders, so they add nothing here.
    // **And Expansionist batch E1** (the levies): ten more. Ten new
    // Expansionist rows came live; Seasonal Levies and The General Levy were
    // changed in place and were already live.
    // **And Dominion batch D5** (units gained and new moments): twelve more.
    // Nine new Dominion Orders and three new shared rows came live. Its two
    // Doctrines are not Orders.
    // **And Dominion batch D6** (captures, commissions and the end of a war):
    // five more. Two new Dominion rows (Danegeld, Vae Victis) and one new
    // shared row (Looted Art) came live, and two deferred rows were freed (War
    // Reparations, Commission: A Victor's Peace). Six more were reworked in
    // place and were already live.
    // **And Expansionist batch E2** (moments, records and counts): nine more.
    // Nine new Expansionist rows came live; The Land's Great Work was changed
    // in place and was already live.
    // **And Expansionist batch E3** (the land): seven more. Five new
    // Expansionist rows came live, and two deferred rows were freed (The Common
    // Domain and The Raising of the Land); The Prospectors, The Watercourses
    // and The Landscape Garden were changed in place and were already live.
    // **And Expansionist batch E4** (works, claims and borders): eight more.
    // Three new Expansionist rows came live (The Keeps, The Garden Frontier,
    // The Staked Claims), and five deferred rows were freed (Outposts, The
    // Polders, Migration, The Great Migration, The Encroaching Fields); The Fish
    // Traps and The Wide Country were changed in place and were already live.
    // **And Dominion batch D7** (economy rules and Double Time): ten more.
    // Eight new Dominion Orders and one new shared row (The Farming
    // Garrisons) came live, and one deferred row was freed (The Legions'
    // Labour). Its three Doctrines are not Orders.
    // **And Expansionist batch E5** (meters, commissions and the shared
    // militia): six more. Four new Expansionist rows came live (The Burhs,
    // Commission: Break the Sod, The Sovereign Writ, The Imperial Roads), one
    // new shared row (The Frontier Militia), and one deferred row was freed
    // (The Heartland); The Domesday Survey and The Master of Works were changed
    // in place and were already live.
    // **And Expansionist batch E6** (the two cards that waited for D7): two
    // more. Two deferred rows were freed (The Breadbasket, Veteran Colonies).
    // **And Scientific batch S0** (the charter technologies): two more. Two
    // new Scientific rows came live (The Commonplace Book, The Patent Office).
    // **And Scientific batch S1** (the line traits): three more. Three
    // deferred charters were freed (the Bronze-Founders', the Mechanists' and
    // the Naval Gunners').
    // **And Scientific batch S1b** (the sheet and the types): eleven fewer.
    // Field Notebooks and the ten live rows the Scientific sheet cut on
    // 2026-10-06 were retired.
    // **And Dominion batch D9** (the themes pass): nine fewer. The ten cut
    // Dominion rows were live and are retired, and one new Dominion row came
    // live (The Champion's Portion). Four rows were changed in place and were
    // already live.
    // **And Scientific batches S2 and S3** (the guildsmen and the readings of
    // rivals): eight more. Seven new Scientific rows came live (The Scholars'
    // Guild, The Secret Arts, The Edge of the Sword, The Translation Movement,
    // The Great Designs, Greek Fire, The Proving Ground), and one new shared
    // row (Books from the Ships).
    // **And Dominion batch D10** (the data-only cards of Tiers I to III): nine
    // more. Nine new Dominion rows came live. The Acropolis and Take the City
    // were changed in place and were already live.
    // **And Scientific batch S4** (the building charters): eight more. Eight
    // deferred charters were freed (the Herbalists', Glassmakers',
    // Librarians', Paper-Makers', Physicians', Printers', Gunfounders' and
    // Military Engineers').
    // **And Dominion batch D11** (the commissions): five more. Five new
    // Dominion rows came live. The Captured Marvel was changed in place and
    // was already live.
    // **And Dominion batch D12** (five small automatic rules): two more.
    // Commission: Harry the Border and Rally to the Standard came live. The
    // Gathering Host, The Soldier-Farmers and The Marshalate were changed in
    // place and were already live.
    // **And Scientific batch S5** (the learned land): nine more. Six new
    // Scientific rows came live (The Prospectors' Notes, The Founding Gift,
    // The Latin Quarter, The Studium Generale, The Nizamiyya, The Republic of
    // Letters), and three deferred rows were freed (the Surveyors' and the
    // Alchemists' Charters, and The School of Mines). The Long Inheritance was
    // changed in place, and The Assay moved to common.json; both were already
    // live.
    // **And Dominion batch D13** (The Limitanei): one more. One new Dominion
    // row came live.
    // **And Dominion batches D14 and D15** (the three drafts and The
    // Upstarts): three more. The Relay Stations and Circumvallation left
    // `deferred`, and The Upstarts is a new row. The Longships took over the
    // row `marineDrill`, which was already live.
    // **And Scientific batch S6** (the research record): eleven more. Eleven
    // new Scientific rows came live, one of them a commission (The Royal
    // Charter Commission).
    // **And Scientific batch S7** (the data-only cards of Tiers 0 to II):
    // nine more. Nine new Scientific rows came live. Learned Foundations
    // (the row `learnedCommissions`), Enduring Institutions and The Quiet
    // Faculties were changed in place and were already live.
    // **And Scientific batch S8** (great people and the great houses): eleven
    // more. Ten new Scientific rows came live, one of them a commission (The
    // Lynx-Eyed Academy), and The Second Seat left `deferred`.
    // **And Expansionist batch E7** (the themes sheet): fourteen fewer. The
    // fourteen live Expansionist rows the themes pass cut are retired (the
    // fifteenth, Public Works, was deferred and never counted). Ten rows were
    // changed in place and were already live.
    // **And Expansionist batch E8** (the new data-only cards): five more. Five
    // new Expansionist rows came live (The Founding Furrow, The Horrea, The
    // Land Hunger, The Many Hands, The Capitolia).
    // **And Scientific batch S9** (the army and the Opus): ten more. Nine new
    // Scientific rows came live, one of them a commission (The Great
    // Instrument), and one shared row (The Soldier-Scholars, Dominion and
    // Scientific).
    // **And Expansionist batch E9** (the land): two more. The Marl Pits is a
    // new row, and The Two Harvests left `deferred`. The Burning Season,
    // Commission: Break the Sod and The Mountain Schools were changed in place
    // and were already live.
    // **And Expansionist batch E10** (the militia and the trades): two more.
    // Watch and Ward and The Burghers are new rows. Veteran Colonies was
    // changed in place and was already live.
    // **And Expansionist batch E11** (public works and empire buildings): two
    // more. The Aediles and The Public Good are new rows. The Topping Out was
    // changed in place and was already live.
    // **And Expansionist batch E12** (The Cura Aquarum): one more, a new row.
    // **And Commerce batch T1** (the sheet of record): eight fewer. The eight
    // live Commerce rows the themes pass cut are retired. The four rows moved
    // to common.json stay live, and fifteen rows changed in place were
    // already live.
    // **And Commerce batch T2** (the new data-only cards): eight more. The
    // eight are new Commerce rows. Merchant Scholars changed in place and was
    // already live.
    // **And Commerce batch T7** (the pair cards): one more. The Art Dealers is
    // a new shared row. The Standing Army moved from the Dominion file to the
    // shared file and was already live.
    // **And Commerce batch T3** (routes and posts): four more. The Fondaci,
    // The Champagne Fairs and The Lingua Franca are new Commerce rows, and The
    // Return Leg left `deferred`. The Foreign Factor and The Admiralty of
    // Trade changed in place and were already live.
    // **And Commerce batch T4** (the trade commissions): one more.
    // Commission: The Great Fair is a new Commerce row. The World's Fair
    // changed in place and was already live.
    // **And Commerce batch T5** (goods and deals): five more. The Commenda,
    // The Capitulations and The Casa da Índia are new Commerce rows, and
    // Export Guilds and The Treaty Ports left `deferred`. Land Speculation
    // changed in place and was already live.
    // **And Commerce batch T6** (the purse and the hoard): four more. Letters
    // of Credit, The Strongbox and The Merchant Guilds are new Commerce rows,
    // and the shared Mercenary Contracts left `deferred`.
    // **And batch R1** (the review comments of 2026-10-23 and 2026-10-25):
    // three fewer. The Cattle Raid, The Defiant Kingdom and the shared
    // Copying the Enemy were live and are retired.
    // **And Devotion batch DV1** (the sheet of record): three fewer. Pastoral
    // Shrines, The Consolation and The Alms Roads were live and are retired.
    // The seven rows moved to common.json stay live, and the five rows
    // changed in place were already live.
    // **And Magisterial batch MG1** (the sheet of record): 51 fewer. The 50
    // live Magisterial rows the themes pass cut and the shared The Imperial
    // Examinations are retired. The four cards changed in place were already
    // live, and the three deferred rows that took new text stay deferred.
    // DV1 and MG1 ran in parallel and merged, so the count drops by 54 in all.
    // **And Devotion batch DV2** (the new data-only cards): eleven more. Seven
    // new Devotion rows, the new shared The Shrine Guards, The Blessed Forges
    // and The Schoolmen's Charter, and the shared The Monastery Libraries,
    // which left `deferred`.
    // **And Magisterial batch MG2** (the data-only cards of Tiers 0 and I):
    // fourteen more, all new Magisterial rows.
    // **And Devotion batch DV3** (the engine's shapes): five more. The Gifts
    // of the Faithful, The Sacred Precincts, The Book of Life and The Offering
    // Chests are new Devotion rows, and The Rising Nave is a new shared row.
    // **And Magisterial batch MG3** (the data-only cards of Tiers II to IV):
    // thirteen more. Eleven are new Magisterial rows, and The Golden Age and
    // The Magister's Court left `deferred`.
    // **And Devotion batch DV4** (rites are seasons): three more. The
    // Rogations, the charter The Sabbath Laws and The Psalter are new
    // Devotion rows. The Founding Vows counts fewer rites and was already live.
    // **And Magisterial batch MG4** (the collection and the wonder
    // commissions): five more. Commission: The Eighth Wonder, Commission: The
    // Roll of the Senate, Commission: The Wonder of the Age, The Universal
    // Library and The Polymath's Study are new Magisterial rows. Travelling
    // Players has new text and was already live.
    // **And Devotion batch DV5** (the faith's reach): three more. The
    // Parishes, Commission: The State Church and The Confessors are new
    // Devotion rows.
    // **And Magisterial batch MG5** (the draft's price): three more. The Open
    // Door, The Accessions Register and The Unwritten Chapter are new
    // Magisterial rows.
    // **And Devotion batch DV6** (a conversion as a moment): two more.
    // Pentecost and The Mass Baptisms are new Devotion rows.
    // **And Magisterial batch MG6** (the hand): three more. The Wandering
    // Muse, Officials by Merit and The Hall of Wonders are new Magisterial
    // rows.
    // **And Devotion batch DV7** (the holy sites, the Opus and the authority
    // capstone): four more. The Anchorites, The Caliphate and The Abbeys are
    // new Devotion rows, and The Interdict left `deferred`.
    // **And Magisterial batch MG7** (the council's moments): three more. The
    // Sed Festival, The Pandects and Commission: The Golden Bull are new
    // Magisterial rows.
    expect(live).toBe(594);
    expect(ORDER_IDS.filter((id) => orderIsDealt(id))).toHaveLength(594);
  });

  /**
   * **A deferred charter is in no pool** (the D1b audit, "A deferred charter is
   * still dealt"). A charter's grant is the whole of the card, so a charter with
   * no effects is dealt — but a charter whose building, technology or rites have
   * not been drawn up yet carries a `deferred` sentence instead of a grant that
   * names anything, and dealing it would seat nothing and write a dead id onto
   * the seat. Two D1b agents worked around it by marking those rows `retired`,
   * which said the design had withdrawn them when it is waiting on them; the
   * clause in `orderIsDealt` is the fix, and this is its register.
   */
  it('deals no charter whose grant names a thing that does not exist yet', () => {
    // A charter whose grant exists is dealt like any card (the Expansionist
    // tended-work unlocks; the Commerce batch's Plantation House and Numidian
    // Cavalry; The Fast's rite); its grant must name a real row. The rest wait.
    for (const id of DECK_ROWS) {
      const def = orderDef(id);
      if (def.charter === undefined || def.deferred !== undefined || def.retired === true) continue;
      const unlocks = def.charter.unlocks;
      if (unlocks.building !== undefined) expect(BUILDING_IDS, id).toContain(unlocks.building);
      if (unlocks.unit !== undefined) expect(UNIT_TYPE_IDS, id).toContain(unlocks.unit);
      for (const rite of unlocks.rites ?? []) expect(RITE_IDS, id).toContain(rite);
      expect(orderIsDealt(id), `${id} is a live charter`).toBe(true);
    }
    // A retired charter (a sheet's Proposed cut, such as The Purple Works) is
    // left out: it is withdrawn, not waiting.
    const charters = [...DECK_ROWS].filter(
      (id) =>
        orderDef(id).charter !== undefined &&
        orderDef(id).deferred !== undefined &&
        orderDef(id).retired !== true,
    );
    // **No charter is deferred since Scientific batch S5**, which built the
    // last two gifts. The clause is still held, and it is about the deferral
    // rather than about charters: a live charter given a deferred sentence
    // for the length of the check leaves the pool, and the shelf takes it
    // back the turn the sentence goes.
    expect(charters).toEqual([]);
    const live = [...DECK_ROWS].find(
      (id) => orderDef(id).charter !== undefined && orderDef(id).retired !== true,
    );
    expect(live).toBeDefined();
    const liveDef = orderDef(live!);
    liveDef.deferred = ['a gift still to be drawn up'];
    try {
      expect(orderIsDealt(live!), `${live} is deferred and still dealt`).toBe(false);
    } finally {
      delete liveDef.deferred;
    }
    expect(orderIsDealt(live!), live).toBe(true);
    for (const id of charters) {
      const def = orderDef(id);
      // A deferred charter is never retired: the row says "waiting", not
      // "withdrawn".
      expect(def.retired, id).toBeUndefined();
      expect(def.deferred, id).toBeDefined();
      expect(def.effects, id).toEqual([]);
      expect(orderIsDealt(id), `${id} is a deferred charter and still dealt`).toBe(false);
      expect(ordersForDecks(DECK_IDS), id).not.toContain(id);
    }
  });

  it('leaves the old pool and office fields on the retired shelf, and asks them of no deck row', () => {
    // D1b replaced D1a's "every row carries pool and slot": the fields are the
    // *shelf's* history — the government pool a card was drawn from and the
    // M/E/W office it sat in — and a deck row, written after both were retired,
    // has neither to carry.
    for (const id of SHELF_ROWS) {
      expect(orderDef(id).pool, id).toBeDefined();
      expect(orderDef(id).slot, id).toBeDefined();
    }
    for (const id of DECK_ROWS) {
      expect(orderDef(id).pool, id).toBeUndefined();
      expect(orderDef(id).slot, id).toBeUndefined();
    }
    // The register: nothing under `src/sim/statecraft/` reads `.pool` or `.slot`
    // to deal a card. Seating reads a card's `type` since batch C2
    // (`orderFitsSlot`), and the Compendium prints a retired row's old office.
    const sources = import.meta.glob('../../src/sim/statecraft/draft.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    });
    const draft = Object.values(sources)[0] as string;
    expect(draft).not.toMatch(/orderDef\([^)]*\)\.pool\b/);
    expect(draft).not.toMatch(/poolOfGovernment\(/);
  });

  it('is a five-rung ladder, and every government carries its rung’s count', () => {
    // Chairs 3 / 5 / 8 / 11 are the user's ruling (docs/decks/deck-design.md
    // "More chairs"). Since the user's ruling of 2026-10-17 (docs/flags.md
    // (ccccccc)) the rungs are the government tiers, so the tier-10 rung keeps
    // the five chairs of the rung below it. Tier IV and its governments moved
    // from 29 to 26 the same day (docs/flags.md (ddddddd)). The tier-38
    // governments were retired in batch C2 and their rows still carry the top
    // rung's count; which type each chair is, is `statecraft.test.ts`' and
    // `typedChairs.test.ts`'.
    expect(TIER_LADDER.map((rung) => rung.drafts)).toEqual([0, 4, 10, 18, 26]);
    expect(TIER_LADDER.map((rung) => rung.chairs)).toEqual([3, 5, 5, 8, 11]);
    expect(TIER_LADDER).toHaveLength(BANDS.length);
    // The later rungs banked a reward hand until batch C3 removed the reward
    // hands. What pairs with a government tier now is a Doctrine tier, one to
    // one: Tier I with tier 4, II with 10, III with 18 and IV with 26.
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual([4, 10, 18, 26]);
    expect(governmentTierForDoctrineBand(5)).toBe(0);
    for (const id of GOVERNMENT_IDS) {
      const def = governmentDef(id);
      expect(def.chairs, id).toBe(chairsAtTier(def.tier));
      expect(slotCount(id), id).toBe(def.chairs);
    }
    // The tier-10 rung has its own row, and the retired tier 38 keeps the top
    // rung's count.
    expect(chairsAtTier(10)).toBe(5);
    expect(chairsAtTier(38)).toBe(11);
    expect(bandTierAt(0)).toBe(0);
    expect(bandTierAt(3)).toBe(0);
    expect(bandTierAt(4)).toBe(1);
    expect(bandTierAt(9)).toBe(1);
    expect(bandTierAt(10)).toBe(2);
    expect(bandTierAt(17)).toBe(2);
    expect(bandTierAt(18)).toBe(3);
    expect(bandTierAt(25)).toBe(3);
    expect(bandTierAt(26)).toBe(4);
    // The old rungs at 29, 38 and 45 are now simply past the last one.
    expect(bandTierAt(29)).toBe(4);
    expect(bandTierAt(38)).toBe(4);
    expect(bandTierAt(45)).toBe(4);
    expect(bandTierAt(400)).toBe(4);
  });

  it('draws rarity first at 60 / 30 / 10, and a pass moves points out of common', () => {
    expect(STATECRAFT.rarityOdds).toEqual({ common: 60, uncommon: 30, rare: 10 });
    expect('rarityWeights' in STATECRAFT).toBe(false);
    const plain = rarityOdds(0);
    expect(plain.common + plain.uncommon + plain.rare).toBe(100);
    const once = rarityOdds(1);
    expect(once.common).toBeLessThan(plain.common);
    expect(once.uncommon).toBeGreaterThan(plain.uncommon);
    expect(once.rare).toBeGreaterThan(plain.rare);
    expect(once.common + once.uncommon + once.rare).toBeCloseTo(100, 6);
    // The floor: however many passes, common never goes negative and the three
    // still sum to the table.
    const many = rarityOdds(50);
    expect(many.common).toBe(0);
    expect(many.common + many.uncommon + many.rare).toBeCloseTo(100, 6);
  });

  it('opens every council with the chiefdom’s three typed chairs, and the Guest’s with a fourth', () => {
    const fresh = newPlayerStatecraft();
    expect(fresh.slots).toHaveLength(3);
    // No reward hands since batch C3: the two fields are gone from the seat.
    expect(fresh).not.toHaveProperty('rewardHands');
    expect(fresh).not.toHaveProperty('pendingReward');
    // **Typed again since batch C2** (the user, 2026-10-16: *"lets revert
    // chiefdom yeah"*): one Military, one Economic and one Wildcard chair,
    // where the decks rework had made all three universal.
    expect(slotTypesOf(fresh)).toEqual(['military', 'economic', 'wildcard']);
    const g = seated();
    expect(playerById(g.state, 0)!.statecraft.slots).toHaveLength(3);
    // A Guest at Every Court: one more chair, additive on top of the count, and
    // a Wildcard chair like every chair beyond a government's mix.
    const guest = playerById(g.state, 1)!.statecraft;
    expect(guest.slots).toHaveLength(4);
    expect(slotTypesOf(guest)).toEqual(['military', 'economic', 'wildcard', 'wildcard']);
  });

  it('bumps the schema: a pre-rework save is refused, and the seat carries the four new fields', () => {
    // 123 since C8: a town records which bank paid for each of its buildings
    // (`City.buildingBanks`), so a v122 log would answer "nobody bought this"
    // to The Endowment for ever. A bump within the branch, which migrates
    // nothing either way — 122 was C6's trading post, and 121 D2d's, where a
    // town, a hex and a route each learnt to remember when they were placed.
    // 124 since the current-band ruling of 2026-10-13: a hand is dealt only from
    // the seat's current band, so a v123 log would pick from different hands.
    // 125 since WC1: a town taken by force enters unrest, so a v124 log's
    // captured towns would bank hammers, beakers and culture this build withholds.
    // 126 since WC2: a war's losses are recorded and cost happiness, so a v125
    // log's losing empires would grow on turns this build holds them back.
    // 127 since WC3: units earn ranks in combat, so a v126 log's veterans
    // would fight weaker than this build makes them.
    // 128 since D0: fourteen Dominion cards join the decks and three are
    // retired, so a v127 log's picks name cards this build never dealt.
    // 129 since C2a: chairs have types again, adoption re-seats the council,
    // and the tier-38 governments are retired, so a v128 log can seat a card
    // where this build refuses it.
    // 130 since D1: eleven Dominion cards that give units experience or pay
    // when a unit earns a rank, a new end-of-turn phase and a new record, so
    // a v129 log's picks name cards this build never dealt.
    // 131 since C3: the reward hands go and an adoption opens a Doctrine
    // offer, so a v130 seat carries fields this build no longer reads.
    // 132 since D2: nine Dominion cards that read a unit's rank or change a
    // rule of combat, and a new unit field, so a v131 log's picks name cards
    // this build never dealt.
    // 133 since D3: nine Dominion cards about pillaging and where a grant
    // lands, and a new record, so a v132 log's picks name cards this build
    // never dealt.
    // 134 since E0: the Expansionist deck is typed and its cards that need
    // no new shape are built, so a v133 log's picks and seatings name cards
    // and chairs this build deals and fits differently.
    // 135 since D4: twelve Dominion cards about unrest, the writ and the game's
    // records, and a new record, so a v134 log's picks name cards this build
    // never dealt.
    // 136 since E1: the Expansionist levy cards, three new fields and a new
    // end-of-turn phase, so a v135 log's picks name cards this build deals
    // differently and its resolutions run one phase fewer.
    // 137 since D5: fourteen Dominion cards that raise units or pay on new
    // moments, and a new record, so a v136 log's picks name cards this build
    // never dealt.
    // 138 since D6: eleven Dominion cards about captures, commissions and the
    // end of a war, and new records on wars, towns and seats, so a v137 log's
    // picks name cards this build never dealt.
    // 139 since E2: ten Expansionist cards about moments, records and counts,
    // two new town fields and a new end-of-turn phase, so a v138 log's picks
    // name cards this build deals differently and its resolutions run one
    // phase fewer.
    // 140 since E3: ten Expansionist cards about the land and two new tile
    // fields, so a v139 log's picks name cards this build deals differently.
    // 141 since E4: ten Expansionist cards about works, claims and borders,
    // and two new end-of-turn phases, so a v140 log's picks name cards this
    // build deals differently and its resolutions run two phases fewer.
    // 142 since D7: thirteen Dominion cards about economy rules and Double
    // Time, and a fourteenth step in a town's yields, so a v141 log's picks
    // name cards this build never dealt.
    // 143 since E5: eight cards about meters, commissions and the shared
    // militia, and a new town field, so a v142 log's picks name cards this
    // build deals differently.
    // 144 since the lake fix (L1): a lake is water like the coast, so pieces
    // path across lakes and a v143 log's moves meet a different board.
    // 145 since D8: the last eight Dominion Doctrines and a record of the
    // attacks made this turn, so a v144 log's Doctrine offers hold cards
    // this build deals differently.
    // 146 since E6: The Breadbasket and Veteran Colonies come live, so a v145
    // log's picks name cards this build deals differently.
    // 147 since the movement fixes (flags item xxxxxx): a landing is planned
    // only where the piece may stop, and a blocked march goes round, so a
    // v146 log's marches would walk different routes.
    // 148 since the take (flags item aaaaaaa): a pin may take a hex from
    // another town of the empire, so a v147 log is judged by a new rule.
    // 149 since the rung fix: the Order tiers open at the government tiers
    // (4, 10, 18 and 29 drafts), so a v148 log's hands from draft 10 on
    // come from a different tier.
    // 150 since Tier IV moved to 26 drafts (flags item ddddddd), with the
    // tier-29 governments, so a v149 log's drafts 26 to 28 deal differently.
    // 151 since the Order tiers open at their draft rung alone (flags item
    // eeeeeee), so a v150 log's hands from a seat ahead of its research age
    // come from a later tier.
    // 152 since the charter technologies (Scientific batch S0): thirteen
    // technologies join the tree and two Scientific cards come live, so a
    // v151 log's research and drafts meet a different tree and deck.
    // 153 since the line traits (Scientific batch S1): three Scientific
    // charters are dealt, so a v152 log's hands differ from the first draft.
    // 154 since the Scientific types and retirements (batch S1b): a
    // Scientific seat's pool loses eleven cards, and typed chairs refuse some
    // seat commands a v153 log holds.
    // 155 since Dominion batch D9: ten Dominion Orders and one Doctrine are
    // retired and one Order comes live, so a v154 log's Dominion hands and
    // Doctrine offers hold different cards.
    // 156 since Scientific batches S2 and S3 (the guildsmen, and readings
    // against the empires a seat has met): eight Orders come live, so a v155
    // log's Scientific and Commerce hands hold different cards.
    // 157 since Dominion batch D10: nine Dominion Orders come live and two
    // change, so a v156 log's Dominion hands hold different cards.
    // 158 since Scientific batch S4 (the building charters): eight Scientific
    // charters are dealt, and five buildings and the Physic Garden join the
    // tables, so a v157 log's Scientific hands hold different cards.
    // 159 since Dominion batches D11 and D12, which landed together. D11:
    // five Dominion Orders come live and one changes. D12: two Dominion
    // Orders come live, three change, and resource lines read the sight gate.
    // So a v158 log's Dominion hands hold different cards.
    // 160 since Scientific batch S5 (the learned land): the Surveyors' and
    // the Alchemists' Charters are dealt, eight more Scientific Orders come
    // live and The Assay is shared with Expansionist, so a v159 log's
    // Scientific and Expansionist hands hold different cards.
    // 161 since Dominion batches D13, D14 and D15, which landed together. D13:
    // The Limitanei comes live. D14 and D15: The Relay Stations,
    // Circumvallation and The Upstarts come live and Marine Drill becomes The
    // Longships. So a v160 log's Dominion hands hold different cards.
    // 162 since Scientific batch S6 (the research record): eleven more
    // Scientific Orders come live, so a v161 log's Scientific hands hold
    // different cards.
    // 163 since Scientific batch S7 (the data-only cards of Tiers 0 to II):
    // nine more Scientific Orders come live and three change, so a v162
    // log's Scientific hands hold different cards.
    // 164 since Scientific batch S8 (great people and the great houses):
    // eleven more Scientific Orders come live, so a v163 log's Scientific
    // hands hold different cards.
    // 165 since Expansionist batches E7 and E8, which landed together. E7
    // (the themes sheet): fifteen Expansionist rows are retired, ten change in
    // place and five change type. E8 (five new data-only cards): five more
    // Expansionist Orders come live. So a v164 log's Expansionist hands and
    // chairs hold different cards.
    // 166 since Scientific batch S9 (the army and the Opus): nine more
    // Scientific Orders and the shared The Soldier-Scholars come live, so a
    // v165 log's Scientific and Dominion hands hold different cards.
    // 167 since Expansionist batches E9 and E10, which landed together. E9
    // (the land): two more Expansionist Orders come live and a worker's burn
    // may mark an improved hex. E10 (the militia and the trades): two more
    // Expansionist Orders come live and a retired soldier pays a citizen. So a
    // v166 log's Expansionist hands, land and towns differ.
    // 168 since Expansionist batches E11 and E12, which landed together. E11
    // (public works and empire buildings): two more Expansionist Orders come
    // live and The Topping Out pays every town for an empire building. E12
    // (The Cura Aquarum): one more Expansionist Order comes live. So a v167
    // log's Expansionist hands and towns differ.
    // 169 since Commerce batch T1 (the sheet of record): eleven Commerce rows
    // are retired, four move to the shared file, fifteen change in place, and
    // every listed Commerce row carries a type. So a v168 log's Commerce hands
    // and chairs hold different cards.
    // 170 since Commerce batch T2 (the new data-only cards): eight new
    // Commerce cards are dealt, and the shared Merchant Scholars moves to
    // Tier III with new text. So a v169 log's Commerce and Scientific hands
    // hold different cards.
    // 171 since Commerce batch T7 (the pair cards): the shared The Art Dealers
    // is dealt and pays on a card drafted, and The Standing Army moves to the
    // shared file for Dominion and Commerce. So a v170 log's Commerce,
    // Magisterial and Dominion hands hold different cards.
    // 172 since Commerce batch T3 (routes and posts): four Commerce cards come
    // live, a post established is a new moment, a home route may pay its
    // origin, and The Admiralty of Trade's waiver widens. So a v171 log's
    // Commerce hands hold different cards.
    // 173 since Commerce batch T4 (the trade commissions): Commission: The
    // Great Fair is a new Commerce card, and The World's Fair has a new goal
    // and a reward that writes posts. So a v172 log's Commerce hands hold
    // different cards.
    // 174 since Commerce batch T5 (goods and deals): two counts read the
    // deal register, a lent luxury may still count for its lender, a
    // foreign post may lend a luxury, and five more Commerce cards are
    // dealt. So a v173 log's Commerce hands hold different cards.
    // 175 since Commerce batch T6 (the purse and the hoard): purchases may
    // go into debt under a credit line, a turn's end is a tally moment, a
    // bought unit may carry an upkeep waiver, and four more cards are dealt.
    // So a v174 log's Commerce hands hold different cards.
    // 177 since Magisterial batch MG1 (the sheet of record): the deck's
    // rows carry types, 64 rows are retired and four cards change in
    // place. Devotion batch DV1 took 176 for its own sheet of record. So a
    // v175 log's Devotion and Magisterial hands hold different cards.
    // 178 since Devotion batch DV2 (the new data-only cards): seven Devotion
    // cards and four shared cards are dealt, and the charter technology
    // Scholasticism opens the Cathedral and the Apostle early. So a v177
    // log's Devotion, Dominion and Scientific hands hold different cards.
    // 179 since Magisterial batch MG2 (the data-only cards of Tiers 0 and
    // I): fourteen Magisterial cards are dealt. So a v178 log's Magisterial
    // hands hold different cards.
    // 180 since Devotion batch DV3 (the engine's shapes): `Player.faithSpent`
    // joins the state, four Devotion cards and the shared The Rising Nave are
    // dealt, and The Creed counts gods. So a v179 log's Devotion and
    // Magisterial hands hold different cards.
    // 181 since Magisterial batch MG3 (the data-only cards of Tiers II to
    // IV): eleven Magisterial cards are new and dealt, and The Golden Age
    // and The Magister's Court leave `deferred`. So a v180 log's Magisterial
    // hands hold different cards.
    // 182 since Devotion batch DV4 (rites are seasons): a rite that acts at
    // once no longer counts as a rite started, a prophet's rite counts once
    // in each town it reaches, the Rite of the Sabbath is new, and three
    // Devotion cards are dealt. So a v181 log's Devotion hands hold
    // different cards.
    // 183 since Magisterial batch MG4 (the collection and the wonder
    // commissions): two counts, a commission figure and two tally occasions
    // are new, five Magisterial cards are dealt, and Travelling Players pays
    // for each deck among the seated cards. So a v182 log's Magisterial hands
    // hold different cards.
    // 184 since Devotion batch DV5 (the faith's reach): a founding can press
    // a lump of the founder's religion, The Confessors' sight rule and the
    // commission goal's `every` switch are new, and three Devotion cards
    // are dealt. So a v183 log's Devotion hands hold different cards.
    // 185 since Magisterial batch MG5 (the draft's price): an Order hand
    // keeps the culture it cost, the two draft moments carry that price, the
    // discount rule is new, and three Magisterial cards are dealt. So a v184
    // log's Magisterial hands hold different cards.
    // 186 since Devotion batch DV6 (a conversion as a moment): a foreign
    // town that turns pays a new moment, queued and paid when the pressing
    // ends, a town keeps the turn it last turned to each religion, and two
    // Devotion cards are dealt. So a v185 log's Devotion hands hold
    // different cards.
    // 187 since Magisterial batch MG6 (the hand): a card may refuse an Order
    // reroll, an offer rider may be counted, an Order may hand over a great
    // person when it is drafted, and three Magisterial cards are dealt. So a
    // v186 log's Magisterial hands hold different cards.
    // 188 since Devotion batch DV7 (the holy sites, the Opus and the
    // authority capstone): a card may set the price of an act of the clergy,
    // an apostle may raise a holy site, a rival's town that follows a
    // religion may stop its Opus, and four Devotion cards are dealt. So a
    // v187 log's Devotion hands hold different cards.
    // 189 since Magisterial batch MG7 (the council's moments): adopting a
    // government is a moment the cards pay on, a card may count the Doctrines
    // held, a commission may ask for a council in order and offer a Doctrine,
    // and three Magisterial cards are dealt. So a v188 log's Magisterial
    // hands hold different cards.
    expect(SCHEMA_VERSION).toBe(189);
    const g = seated();
    const seat = playerById(g.state, 0)!;
    expect(seat.decks).toEqual(['expansionist', 'commerce']);
    expect(seat.charteredTechs).toEqual([]);
    expect(seat.charteredBuildings).toEqual([]);
    expect(seat.charteredRites).toEqual([]);
    // The wild, where a board seats one, holds nothing.
    const wild = g.state.players.find((p) => p.barbarian);
    if (wild !== undefined) expect(wild.decks).toEqual([]);
  });
});

describe('the leader pools', () => {
  it('gives every figure two distinct decks, or the rainbow — Ibn Battuta', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      if (def.rainbow === true) {
        expect(id).toBe('ibnBattutaOfTangier');
        expect(def.decks).toBeUndefined();
        expect(leaderDecks(id)).toEqual([...DECK_IDS]);
        continue;
      }
      expect(def.decks, id).toHaveLength(2);
      expect(def.decks![0]).not.toBe(def.decks![1]);
      expect(leaderDecks(id)).toEqual([...def.decks!]);
    }
    // A seat under nobody holds every deck — the harness seat, stated in
    // `leaderDecks`.
    expect(leaderDecks(undefined)).toEqual([...DECK_IDS]);
  });

  it('mirrors the design doc’s "Leader pools" table, figure for figure', () => {
    const rows = docTable('## Leader pools');
    expect(rows.length).toBe(LEADER_IDS.length);
    const wordToDeck = new Map(DECK_IDS.map((deck) => [DECK_WORDS[deck], deck] as const));
    for (const [name, decks] of rows) {
      // The doc's table says "Taizong" where the sheet says "Emperor Taizong",
      // "Mithridates" for "Mithridates VI" — the figure's name contains the
      // table's word, and exactly one figure's does.
      const matches = LEADER_IDS.filter((id) => leaderDef(id).name.includes(name!));
      expect(matches, `the doc names "${name}"`).toHaveLength(1);
      const id = matches[0];
      if (decks!.startsWith('Rainbow')) {
        expect(leaderDef(id!).rainbow, name).toBe(true);
        continue;
      }
      const wanted = decks!.split('+').map((word) => wordToDeck.get(word.trim()));
      expect(wanted, `${name}: ${decks}`).not.toContain(undefined);
      expect(leaderDecks(id!), name).toEqual(wanted);
    }
  });

  it('writes the config’s own decks onto the seat when it names them, and refuses a bad list', () => {
    const made = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', leader: 'pachacuti', decks: ['devotion', 'magisterial'] },
        { name: 'B', color: '#00a' },
      ],
    });
    expect(playerById(made, 0)!.decks).toEqual(['devotion', 'magisterial']);
    expect(playerById(made, 1)!.decks).toEqual([...DECK_IDS]);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: ['devotion', 'devotion'] }] }),
    ).toThrow(/twice/);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: ['tarot' as DeckId] }] }),
    ).toThrow(/Unknown deck/);
    expect(() =>
      newGame({ seed: 3, sizeName: 'duel', players: [{ name: 'A', color: '#a00', decks: [] }] }),
    ).toThrow(/no deck/);
  });
});

describe('the design doc’s numbers', () => {
  it('bands: the five rungs, their draft counts and their chairs are the ladder', () => {
    const rows = docTable('### Five content bands, independent of government form');
    expect(rows.length).toBe(TIER_LADDER.length);
    rows.forEach((row, index) => {
      const unlock = row[2]!;
      const drafts = unlock === 'Start' ? 0 : Number(/Regular draft count (\d+)/.exec(unlock)?.[1]);
      expect(drafts, unlock).toBe(TIER_LADDER[index]!.drafts);
      expect(Number(row[3]), row[0]).toBe(TIER_LADDER[index]!.chairs);
    });
  });

  it('rarity: the 60 / 30 / 10 of rule 1 is the table', () => {
    const match = /(\d+)% C \/ (\d+)% U \/ (\d+)% R/.exec(DOC);
    expect(match).not.toBeNull();
    expect(STATECRAFT.rarityOdds).toEqual({
      common: Number(match![1]),
      uncommon: Number(match![2]),
      rare: Number(match![3]),
    });
  });

  it('Doctrines: the pairing the user ruled is the one the offer deals by', () => {
    // The reward hands this test used to sync against the design doc's
    // milestones went in batch C3 (the user, 2026-10-16: a new government
    // brings only its Doctrine offer). What stands in their place is the
    // ruled pairing of government tiers with Doctrine tiers, read off the plan
    // doc's sentence.
    const match =
      /tier (\d+) offers the Tier I Doctrines, tier (\d+) Tier II, tier (\d+) Tier III and tier (\d+) Tier IV/.exec(
        PLAN,
      );
    expect(match).not.toBeNull();
    expect([1, 2, 3, 4].map(governmentTierForDoctrineBand)).toEqual(match!.slice(1).map(Number));
  });

  it('the cadence of rule 2 — generic, cross-type, generic, single-type — is the third position’s', () => {
    expect(DOC).toContain('**generic, cross-type, generic, single-type**');
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((n) => thirdPositionOf(n).turn)).toEqual([
      'generic', 'cross', 'generic', 'single', 'generic', 'cross', 'generic', 'single',
    ]);
    expect(thirdPositionOf(4).single).toBe(0);
    expect(thirdPositionOf(8).single).toBe(1);
    expect(thirdPositionOf(12).single).toBe(2);
  });
});

/**
 * **D1b replaced D1a's "every shelf empty".** D1a's honest state was that no
 * seat could be dealt anything at all, because the whole table was retired and
 * the decks were empty files; the describe that stated it ran unstocked so the
 * claim could not be faked by the bench. D1b filled the decks, so the emptiness
 * is gone and the claim that replaces it is the one that survived it: **the
 * rows in no pool are still in no pool**, and a seat whose pool *is* exhausted
 * is still charged nothing.
 *
 * Unstocked, for D1a's reason exactly — the subject is the live catalogue, and
 * a bench that un-retired rows into it would be answering its own question.
 */
describe('the rows in no pool — the retired shelf and the deferred halves', () => {
  it('keeps every retired and every deferred row out of both seats’ pools, and deals the rest', () => {
    const g = seated();
    for (const seat of [0, 1]) {
      const player = playerById(g.state, seat)!;
      const pool = deckPoolOf(g.state, player);
      // D1b: no longer empty. The pool is exactly the dealt rows this seat's
      // decks name, and nothing the shelf or a deferral holds.
      expect(pool.length).toBeGreaterThan(0);
      expect(pool).toEqual(ordersForDecks(player.decks));
      for (const id of pool) {
        expect(orderIsDealt(id), id).toBe(true);
        expect(SHELF_ROWS, `${id} is a retired shelf row`).not.toContain(id);
      }
      for (const id of SHELF_ROWS) expect(pool, id).not.toContain(id);
      for (const id of DECK_ROWS) {
        if (orderIsDealt(id)) continue;
        expect(pool, `${id} is deferred`).not.toContain(id);
      }
      // And the deferred half is the bulk of the catalogue, not a rounding.
      // **C1 took five off it** — five Commerce rows whose deferral notes were
      // written before D2a–D2d landed and had simply gone stale — while adding
      // eleven new live rows, which are not deferred and so are not counted
      // here.
      //
      // **C2 took four more** — Travellers' Letters and The Customs Houses in
      // the Commerce file, Letters of Marque and The Exchange of Discoveries in
      // the shared one — while adding six new live rows, which are likewise not
      // counted here.
      //
      // **C3 took three more**, all Commerce: The Gilded Scaffold, The Brokers'
      // Redraw and Venture Routes. Its fourth and fifth cards move nothing here
      // — Civic Receipts was already live and was reworked, and A Court of
      // Merchants is a new live row.
      // **C5 took four more**: the three Commerce rows that count trade routes
      // arriving at or leaving a town, and the shared Cosmopolitan Court.
      //
      // **C6 took three more**, all Commerce: The Common Road, The Foreign
      // Factor and The Merchant Commonwealth, freed by the trading post and the
      // grant that pays another empire. Its fourth card, Entrenched Interests,
      // is a new live row and so moves nothing here.
      //
      // **C7 took five more**, all Commerce: The Admiralty of Trade, The
      // Harbour Chain, The Factors' Houses, Caravanserai Cities and Strategic
      // Exports. Its sixth row, The Exchange, stays deferred with the
      // measurement written down — it wants a third place a card may name a
      // payee, which is neither of the two that exist.
      //
      // **C8 took three more**: Pilgrim Markets and The Grain Exchange out of
      // the shared file, freed by faith on a route and by a town being able to
      // ask what the far end of its roads holds, and The Endowment out of
      // Commerce, freed by a building remembering which bank paid for it. Its
      // fourth live card, Royal Assays, is a new row and so moves nothing here.
      // Two Commerce rows stay deferred with their reasons re-cut: The Exchange
      // (a card is never consulted about a road that arrives, and the sender is
      // a third kind of payee) and The Warehouses (the doubling names one good,
      // where every dial turns a class).
      //
      // **Batch L took three more**, all Expansionist: Levy of the Land, The
      // Muster of the Fields and Seasonal Levies, freed by the levy command.
      // The Corvée and The General Levy are new live rows and move nothing here.
      //
      // **The Dominion batch** retired fifty rows (the sheet's cuts) and left
      // five deferred (145 − 25 + 5); **batch D3** retired thirty-one more
      // (twenty-eight of them deferred), brought four deferred rows live and
      // wrote twelve new deferred ones (− 28 − 4 + 12); **the Commerce batch**
      // retired twenty-three (five of them deferred), wrote The Embargo deferred
      // and brought two deferred rows live (− 5 + 1 − 2); **the Devotion batch**
      // retired its twenty-five cuts and left two rows waiting. The retired deck
      // rows are counted apart. **Batch S** took three deferred shared rows live
      // (Rites of Passage, The Sacred Host, The Crusader Orders), retired a
      // fourth (Harvest Offerings, cut by both its sheets) and wrote Mercenary
      // Contracts deferred (− 3 − 1 + 1); it retired Frontier Garrisons and
      // Harvest Offerings (+ 2 retired).
      // **Dominion batch D0** retired the sheet's three cuts (+ 3 retired).
      // **Expansionist batch E0** freed two deferred rows (The Rope
      // Stretchers, Garden Cities: − 2) and retired the user's two cuts
      // (+ 2 retired).
      // **Dominion batch D6** freed two deferred rows (War Reparations,
      // Commission: A Victor's Peace: − 2).
      // **Expansionist batch E3** freed two more (The Common Domain and The
      // Raising of the Land: − 2).
      // **Expansionist batch E4** freed five more (Outposts, The Polders,
      // Migration, The Great Migration, The Encroaching Fields: − 5).
      // **Dominion batch D7** freed one (The Legions' Labour: − 1).
      // **Expansionist batch E5** freed one more (The Heartland: − 1).
      // **Expansionist batch E6** freed two more (The Breadbasket, Veteran
      // Colonies: − 2).
      // **Scientific batch S0** wrote ten new charter rows deferred (+ 10) and
      // retired two deferred charters, the Metallurgists' and the Naturalists'
      // (− 2, and + 2 retired).
      // **Scientific batch S1** freed three charters (the Bronze-Founders',
      // the Mechanists' and the Naval Gunners': − 3).
      // **Scientific batch S1b** retired thirteen deferred Scientific rows and
      // the shared The Hydraulic Commonwealth (− 14), and eleven live
      // Scientific rows (+ 25 retired in all).
      // **Dominion batch D9** retired the themes pass's ten cuts, all live
      // (+ 10 retired).
      // **Scientific batch S4** freed eight charters (the building charters:
      // − 8).
      // **Scientific batch S5** freed the last two Scientific charters and
      // The School of Mines (− 3).
      // **Dominion batch D14** freed two (The Relay Stations and
      // Circumvallation: − 2).
      // **Scientific batch S8** freed The Second Seat, the last deferred
      // Scientific row (− 1).
      // **Expansionist batch E7** retired the themes pass's fifteen cuts:
      // fourteen live rows and the deferred Public Works (− 1, and + 15
      // retired).
      // **Expansionist batch E9** freed The Two Harvests (− 1).
      // **Commerce batch T1** retired the themes pass's eleven cuts: eight
      // live rows and three deferred ones, The Consulate, The Post Riders and
      // The Embargo (− 3, and + 11 retired).
      // **Commerce batch T3** freed The Return Leg (− 1).
      // **Commerce batch T5** freed Export Guilds and The Treaty Ports (− 2).
      // **Commerce batch T6** freed Mercenary Contracts (− 1).
      // **Batch R1** retired three live rows: The Cattle Raid, The Defiant
      // Kingdom and the shared Copying the Enemy (+ 3 retired).
      // **Devotion batch DV1** retired the themes pass's four cuts: three live
      // rows and the deferred Consecrated Ground (− 1, and + 4 retired).
      // **Magisterial batch MG1** retired the themes pass's 64 cuts: 50 live
      // Magisterial rows, twelve deferred ones, the shared The Imperial
      // Examinations (live) and the shared Triumphal Arches (deferred)
      // (− 13, and + 64 retired).
      // **Devotion batch DV2** freed the shared The Monastery Libraries (− 1).
      // **Magisterial batch MG3** freed The Golden Age and The Magister's
      // Court (− 2).
      // **Devotion batch DV7** freed The Interdict (− 1).
      expect(
        [...DECK_ROWS].filter((id) => !orderIsDealt(id) && orderDef(id).retired !== true),
      ).toHaveLength(7);
      expect([...DECK_ROWS].filter((id) => orderDef(id).retired === true)).toHaveLength(270);
    }
  });

  it('charges a seat nothing when its own pool runs out: no draft, no count, no blocker', () => {
    // The half of D1a's claim that outlived the empty shelf. Reached the only
    // honest way now — the seat holds every card it is eligible for — so the
    // exhausted arm is still walked, and still byte-identical.
    const g = seated();
    for (const seat of [0, 1]) {
      const player = playerById(g.state, seat)!;
      player.statecraft.orders.push(...eligibleFor(g.state, player));
      expect(eligibleFor(g.state, player)).toEqual([]);
      player.culturePool = 500;
      const before = snapshotState(g.state);
      expect(settleDraft(g.state, player)).toBeNull();
      expect(snapshotState(g.state)).toBe(before);
      expect(player.culturePool).toBe(500);
      expect(player.statecraft.drafts).toBe(0);
      expect(player.statecraft.pendingOrder).toBeUndefined();
      expect(draftExhausted(g.state, player)).toBe(true);
      expect(statecraftBlocker(player)).toBeNull();
    }
    // And the bot's plan reads the same emptiness: no bags, nothing to weigh.
    expect(expectedHandBags(g.state, playerById(g.state, 0)!)).toEqual([]);
  });
});

describe('with the shelf stocked', () => {
  let restore: () => void = () => {};
  beforeAll(() => {
    restore = stockStandardDecks();
  });
  afterAll(() => restore());

  it('a two-deck seat’s pool is exactly its two decks, the commons and the either-type crosses', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const pool = new Set(deckPoolOf(g.state, ada));
    const shelf = stockedShelf();
    for (const { deck, id } of shelf) {
      const home = orderDef(id).decks;
      const shelfOf: string = deck;
      const wanted =
        shelfOf === 'generic' ||
        (shelfOf === 'cross' && home.some((d) => ada.decks.includes(d))) ||
        (shelfOf !== 'cross' && shelfOf !== 'generic' && ada.decks.includes(deck as DeckId));
      expect(pool.has(id), `${id} (${deck})`).toBe(wanted);
    }
    // Exactly: nothing in the pool is off the shelf.
    for (const id of pool) expect(shelf.some((row) => row.id === id), id).toBe(true);
    // **D1b replaced D1a's count.** D1a's shelf was the bench's sixty rows and
    // nothing else, so the seat's share of it could be written out — two decks
    // of eight, the three crosses naming either, six generic. The live decks
    // now stand behind the bench's stocking, so the number is folded off the
    // shelf rather than typed: what is claimed is still the *share*, which is
    // the rule the old literal was standing in for.
    const mine = shelf.filter(
      ({ deck }) =>
        deck === 'generic' ||
        (deck === 'cross' ? true : ada.decks.includes(deck as DeckId)),
    ).filter(({ deck, id }) =>
      deck !== 'cross' || orderDef(id).decks.some((d) => ada.decks.includes(d)),
    );
    expect(pool.size).toBe(mine.length);
    // And the bench's own sixty are all still in it: eight a deck for the two
    // the seat holds, the three crosses that name either, six generic.
    expect(mine.length).toBeGreaterThanOrEqual(8 + 8 + 3 + 6);
  });

  it('the rainbow seat’s pool is everything dealt', () => {
    const g = seated();
    const bors = playerById(g.state, 1)!;
    expect(isRainbowSeat(bors)).toBe(true);
    expect(deckPoolOf(g.state, bors)).toEqual(ordersForDecks(DECK_IDS));
    expect(deckPoolOf(g.state, bors)).toHaveLength(stockedShelf().length);
  });

  // **The draft rung alone opens a band** (the user's ruling of 2026-10-17,
  // `docs/flags.md` (eeeeeee): "lets remove the research age altogether").
  // Until then each band also needed the research age one above it (the rule
  // of 2026-09-16), so a seat at four drafts in age one was still dealt Tier 0.
  // The tests below hold the deal to the draft count in every research age.

  it('deals Tier I from draft 4 while the seat is still in research age 1', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    expect(researchAgeOf(ada)).toBe(1);
    // Three drafts taken: the fourth draft reaches Tier I's rung. It is dealt
    // through the real draft, and the seat is still in age one.
    sc.drafts = 3;
    ada.culturePool = 10_000;
    const dealt = settleDraft(g.state, ada);
    expect(dealt).not.toBeNull();
    expect(sc.drafts).toBe(4);
    expect(researchAgeOf(ada)).toBe(1);
    expect(currentBandOf(ada)).toBe(1);
    expect(dealt!.offer.options.length).toBeGreaterThan(0);
    for (const id of dealt!.offer.options) expect(orderDef(id).band, id).toBe(1);
  });

  // One test per tier: at its rung, in each research age, the bag is that
  // tier alone and twenty seeded hands deal nothing else. The draft before the
  // rung is still the tier below.
  for (const [band, rung] of [
    [1, 4],
    [2, 10],
    [3, 18],
    [4, 26],
  ] as const) {
    it(`deals Tier ${['0', 'I', 'II', 'III', 'IV'][band]} from draft ${rung} in every research age`, () => {
      expect(TIER_LADDER[band]!.drafts).toBe(rung);
      for (const age of [1, 2, 3, 4] as const) {
        const g = seated();
        const ada = playerById(g.state, 0)!;
        if (age > 1) ada.techsResearched.push(techOfAge(age));
        expect(researchAgeOf(ada)).toBe(age);
        expect(currentBandOf(ada, rung - 1), `age ${age}`).toBe(band - 1);
        expect(currentBandOf(ada, rung), `age ${age}`).toBe(band);
        ada.statecraft.drafts = rung;
        const bag = eligibleFor(g.state, ada);
        expect(bag.length, `age ${age}`).toBeGreaterThan(0);
        for (const id of bag) expect(orderDef(id).band <= band && band <= (orderDef(id).lastBand ?? orderDef(id).band), id).toBe(true);
        for (let n = 0; n < 20; n++) {
          delete ada.statecraft.pendingOrder;
          for (const id of drawOrderOffer(g.state, ada).options) {
            const def = orderDef(id);
            expect(def.band <= band && band <= (def.lastBand ?? def.band), `age ${age}, ${id}`).toBe(true);
          }
        }
      }
    });
  }

  it('names the current band from the draft count alone, whatever the research age', () => {
    for (const age of [1, 2, 3, 4] as const) {
      const g = seated();
      const ada = playerById(g.state, 0)!;
      if (age > 1) ada.techsResearched.push(techOfAge(age));
      for (let drafts = 0; drafts <= 40; drafts++) {
        expect(currentBandOf(ada, drafts), `age ${age}, drafts ${drafts}`).toBe(bandTierAt(drafts));
      }
      // The seat's own count is the default.
      ada.statecraft.drafts = 18;
      expect(currentBandOf(ada)).toBe(3);
    }
    // A few rows written out, so a reader can see the rule without the loop.
    const g = seated();
    const ada = playerById(g.state, 0)!;
    expect(currentBandOf(ada, 0)).toBe(0);
    expect(currentBandOf(ada, 3)).toBe(0);
    expect(currentBandOf(ada, 4)).toBe(1);
    expect(currentBandOf(ada, 9)).toBe(1);
    expect(currentBandOf(ada, 10)).toBe(2);
    expect(currentBandOf(ada, 17)).toBe(2);
    expect(currentBandOf(ada, 18)).toBe(3);
    expect(currentBandOf(ada, 25)).toBe(3);
    expect(currentBandOf(ada, 26)).toBe(4);
  });

  it('steps the bag one band at a time as the draft count climbs, in research age 1', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    // Only one band is dealt at a time (the user, 2026-10-13): an earlier band
    // leaves the bag when a later one opens. The seat never leaves age one.
    const bandsOf = (): number[] => [...new Set(eligibleFor(g.state, ada).map((id) => orderDef(id).band))].sort();
    expect(bandsOf()).toEqual([0]);
    ada.statecraft.drafts = 4;
    expect(bandsOf()).toEqual([1]);
    ada.statecraft.drafts = 10;
    expect(bandsOf()).toEqual([2]);
    // Double Time is dealt in Tiers II and III (`lastBand`), so the Tier III
    // bag may hold a Tier II row that names Tier III as its last band.
    ada.statecraft.drafts = 18;
    for (const id of eligibleFor(g.state, ada)) expect((orderDef(id).lastBand ?? orderDef(id).band), id).toBe(3);
    ada.statecraft.drafts = 26;
    expect(bandsOf()).toEqual([4]);
    expect(researchAgeOf(ada)).toBe(1);
  });

  it('deals a seat at band 2 no card of band 0 or band 1', () => {
    const g = seated();
    for (const seat of [0, 1]) {
      const player = playerById(g.state, seat)!;
      player.statecraft.drafts = 10;
      expect(currentBandOf(player)).toBe(2);
      const bag = eligibleFor(g.state, player);
      expect(bag.length).toBeGreaterThan(0);
      for (const id of bag) expect(orderDef(id).band, id).toBe(2);
      // Twenty seeded hands: every card dealt is band 2.
      for (let n = 0; n < 20; n++) {
        delete player.statecraft.pendingOrder;
        for (const id of drawOrderOffer(g.state, player).options) expect(orderDef(id).band, id).toBe(2);
      }
    }
  });

  it('keeps every card of an earlier band that the seat already holds, seated or not', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    // Take two band-0 cards: one seated, one only held.
    const opening = eligibleFor(g.state, ada).filter((id) => orderDef(id).charter === undefined);
    const [seatedCard, keptCard] = opening;
    expect(seatedCard).toBeDefined();
    expect(keptCard).toBeDefined();
    sc.orders.push(seatedCard!, keptCard!);
    expect(applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: seatedCard!, slotIndex: 0 }).ok).toBe(true);
    // Band 1 opens. Neither card is dealt again, and both stay held; the seated
    // one stays in its chair.
    sc.drafts = 4;
    expect(currentBandOf(ada)).toBe(1);
    expect(eligibleFor(g.state, ada)).not.toContain(keptCard);
    expect(dealTo(g.state, ada)).not.toBeNull();
    expect(applyCommand(g.state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
    expect(sc.orders).toContain(seatedCard);
    expect(sc.orders).toContain(keptCard);
    expect(sc.slots[0]?.card).toBe(seatedCard);
  });

  it('charges nothing when the current band is empty, even with an earlier band unspent', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    sc.drafts = 4;
    // Hold every band-1 card. Band 0 still has cards the seat does not hold.
    holdEverythingDealt(g.state, ada);
    const earlier = deckPoolOf(g.state, ada).filter((id) => orderDef(id).band === 0 && !sc.orders.includes(id));
    expect(earlier.length).toBeGreaterThan(0);
    // The draft is not dealt from band 0 instead: nothing is charged or written.
    ada.culturePool = 10_000;
    const before = snapshotState(g.state);
    expect(draftExhausted(g.state, ada)).toBe(true);
    expect(settleDraft(g.state, ada)).toBeNull();
    expect(snapshotState(g.state)).toBe(before);
    expect(expectedHandBags(g.state, ada)).toEqual([]);
    expect(eligibleFor(g.state, ada).filter((id) => orderDef(id).rarity === 'rare')).toEqual([]);
  });

  it('reads the waiting draft at its own count, so the draft that reaches a rung is dealt from the new band', () => {
    // Band 0 is spent at three drafts. The fourth draft reaches band 1's rung,
    // so it is dealt from band 1 rather than refused as exhausted.
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    sc.drafts = 3;
    holdEverythingDealt(g.state, ada);
    ada.culturePool = 10_000;
    expect(draftExhausted(g.state, ada)).toBe(false);
    for (const bag of expectedHandBags(g.state, ada)) {
      for (const id of bag) expect(orderDef(id).band, id).toBe(1);
    }
    const dealt = settleDraft(g.state, ada);
    expect(dealt).not.toBeNull();
    expect(sc.drafts).toBe(4);
    expect(dealt!.offer.options.length).toBeGreaterThan(0);
    for (const id of dealt!.offer.options) expect(orderDef(id).band, id).toBe(1);
  });

  it('deals two positions from the seat’s decks and the third by the cadence, over twenty seeded hands', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    const cadence: string[] = [];
    for (let n = 1; n <= 20; n++) {
      sc.drafts = n;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, ada);
      expect(offer.positions).toHaveLength(HAND_POSITIONS);
      expect(offer.options).toHaveLength(HAND_POSITIONS);
      const [first, second, third] = offer.positions as HandPosition[];
      expect(first).toEqual({ kind: 'deck', deck: 'expansionist' });
      expect(second).toEqual({ kind: 'deck', deck: 'commerce' });
      const turn = thirdPositionOf(n);
      if (turn.turn === 'generic') expect(third).toEqual({ kind: 'generic' });
      else if (turn.turn === 'cross') expect(third).toEqual({ kind: 'cross' });
      else expect(third).toEqual({ kind: 'deck', deck: ada.decks[turn.single % 2] });
      // Each dealt card answers its position's ask (the bag is never empty on
      // this shelf, so the fallback is never taken).
      const eligible = eligibleFor(g.state, ada);
      offer.options.forEach((id, index) => {
        expect(positionBag(eligible, offer.positions![index]!, ada.decks), `${n}:${index}`).toContain(id);
      });
      expect(new Set(offer.options).size).toBe(offer.options.length);
      cadence.push(third!.kind === 'deck' ? `single:${third!.deck}` : third!.kind);
    }
    expect(cadence).toEqual([
      'generic', 'cross', 'generic', 'single:expansionist',
      'generic', 'cross', 'generic', 'single:commerce',
      'generic', 'cross', 'generic', 'single:expansionist',
      'generic', 'cross', 'generic', 'single:commerce',
      'generic', 'cross', 'generic', 'single:expansionist',
    ]);
  });

  it('samples the rainbow two distinct decks a hand, and a third deck on the single turn', () => {
    const g = seated();
    const bors = playerById(g.state, 1)!;
    const sc = bors.statecraft;
    const seen = new Set<DeckId>();
    for (let n = 1; n <= 40; n++) {
      sc.drafts = n;
      delete sc.pendingOrder;
      const offer = drawOrderOffer(g.state, bors);
      const [first, second, third] = offer.positions as HandPosition[];
      expect(first!.kind).toBe('deck');
      expect(second!.kind).toBe('deck');
      expect((first as { deck: DeckId }).deck).not.toBe((second as { deck: DeckId }).deck);
      seen.add((first as { deck: DeckId }).deck);
      seen.add((second as { deck: DeckId }).deck);
      if (thirdPositionOf(n).turn === 'single') {
        expect(third!.kind).toBe('deck');
        expect([(first as { deck: DeckId }).deck, (second as { deck: DeckId }).deck]).not.toContain(
          (third as { deck: DeckId }).deck,
        );
      }
    }
    expect(seen.size).toBe(DECK_IDS.length);
  });

  it('draws rarity first at the table’s odds, within tolerance, and the pity shifts them', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bag = eligibleFor(g.state, ada).filter((id) => orderDef(id).decks[0] === 'expansionist' && orderDef(id).decks.length === 1);
    expect(bag.length).toBeGreaterThanOrEqual(3);
    const tally = (skips: number, draws: number) => {
      const counts = { common: 0, uncommon: 0, rare: 0 };
      for (let i = 0; i < draws; i++) counts[orderDef(drawRarityFirst(g.state, bag, skips)!).rarity] += 1;
      return counts;
    };
    const plain = tally(0, 4000);
    expect(plain.rare / 4000).toBeGreaterThan(0.07);
    expect(plain.rare / 4000).toBeLessThan(0.13);
    expect(plain.uncommon / 4000).toBeGreaterThan(0.26);
    expect(plain.uncommon / 4000).toBeLessThan(0.34);
    const pitied = tally(2, 4000);
    expect(pitied.common / 4000).toBeLessThan(plain.common / 4000 - 0.15);
    expect(pitied.rare / 4000).toBeGreaterThan(plain.rare / 4000 + 0.05);
    // The written distribution agrees with the sampled one: per rung, the
    // odds sum to the rung's renormalised share.
    const odds = rarityFirstOdds(bag, 0);
    const share = (rarity: string) => odds.filter(({ id }) => orderDef(id).rarity === rarity).reduce((s, o) => s + o.chance, 0);
    expect(share('common')).toBeCloseTo(0.6, 6);
    expect(share('uncommon')).toBeCloseTo(0.3, 6);
    expect(share('rare')).toBeCloseTo(0.1, 6);
    expect(odds.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 6);
  });

  it('renormalises over the rungs present when one is absent, and spends one roll a card', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const noRares = eligibleFor(g.state, ada).filter((id) => orderDef(id).rarity !== 'rare');
    const odds = rarityFirstOdds(noRares, 0);
    const share = (rarity: string) => odds.filter(({ id }) => orderDef(id).rarity === rarity).reduce((s, o) => s + o.chance, 0);
    expect(share('common')).toBeCloseTo(60 / 90, 6);
    expect(share('uncommon')).toBeCloseTo(30 / 90, 6);
    const before = g.state.rng.state;
    drawRarityFirst(g.state, noRares, 0);
    const afterOne = g.state.rng.state;
    expect(afterOne).not.toBe(before);
    // An empty bag spends nothing.
    expect(drawRarityFirst(g.state, [], 0)).toBeUndefined();
    expect(g.state.rng.state).toBe(afterOne);
  });

  it('excludes the held and the hand, falls back to the union, deals a smaller hand, and charges nothing when dry', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    // Hold every expansionist single: the first position falls back to the union.
    const expansionist = eligibleFor(g.state, ada).filter((id) => orderDef(id).decks.length === 1 && orderDef(id).decks[0] === 'expansionist');
    sc.orders.push(...expansionist);
    sc.drafts = 1;
    const offer = drawOrderOffer(g.state, ada);
    expect(offer.options).toHaveLength(3);
    for (const id of offer.options) expect(sc.orders).not.toContain(id);
    expect(new Set(offer.options).size).toBe(3);
    // Hold everything but two: the hand is two.
    const left = eligibleFor(g.state, ada);
    sc.orders.push(...left.slice(2));
    delete sc.pendingOrder;
    expect(drawOrderOffer(g.state, ada).options).toHaveLength(2);
    // Hold the last two: exhausted — no draft, no charge, no count.
    sc.orders.push(...left.slice(0, 2));
    delete sc.pendingOrder;
    expect(eligibleFor(g.state, ada)).toEqual([]);
    ada.culturePool = 1000;
    const before = snapshotState(g.state);
    expect(settleDraft(g.state, ada)).toBeNull();
    expect(snapshotState(g.state)).toBe(before);
    expect(draftExhausted(g.state, ada)).toBe(true);
  });

  it('adds a rider’s extra cards after the base hand, from the union, distinct', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const eligible = eligibleFor(g.state, ada);
    const positions: HandPosition[] = [
      { kind: 'deck', deck: 'expansionist' },
      { kind: 'deck', deck: 'commerce' },
      { kind: 'generic' },
    ];
    const hand = drawOrderOptions(g.state, eligible, positions, 5, 0, ada.decks);
    expect(hand).toHaveLength(5);
    expect(new Set(hand).size).toBe(5);
    expect(orderDef(hand[0]!).decks).toEqual(['expansionist']);
    expect(orderDef(hand[1]!).decks).toEqual(['commerce']);
    expect(orderDef(hand[2]!).decks).toEqual([]);
  });

  it('keeps a redraw in the hand’s own positions, and deals the same hand from the same state', () => {
    const a = seated();
    const b = seated();
    for (const g of [a, b]) {
      const bors = playerById(g.state, 1)!;
      bors.statecraft.drafts = 1;
    }
    const first = drawOrderOffer(a.state, playerById(a.state, 1)!);
    const twin = drawOrderOffer(b.state, playerById(b.state, 1)!);
    expect(twin).toEqual(first);
    // A redraw over the standing hand keeps its rainbow decks (rule 6).
    const bors = playerById(a.state, 1)!;
    bors.statecraft.pendingOrder = first;
    const again = drawOrderOffer(a.state, bors);
    expect(again.positions).toEqual(first.positions);
  });

  it('opens a Doctrine offer on adoption from the seat’s own decks, and none where its decks have no Doctrine of the tier', () => {
    // Batch C3: the reward hands are gone, and an adoption brings the Doctrine
    // offer instead. Only Dominion has a Doctrine in the data so far (The
    // Steppe Confederacy, Tier I), so Ada (Expansionist and Commerce) is
    // offered nothing at tier 4 and a Dominion seat is offered it.
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    sc.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    expect(adoptGovernmentAt(g.state, ada, 0)?.doctrines).toBeNull();
    expect(sc.pendingDoctrine).toBeUndefined();
    expect(statecraftBlocker(ada)).toBeNull();

    const d = dominionSeats();
    const taizong = playerById(d.state, 0)!;
    taizong.statecraft.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    const adopted = adoptGovernmentAt(d.state, taizong, 0)!;
    // Since Dominion batch D9 Dominion has four Tier I Doctrines (D8's The
    // Soldiers' Share joined the three of D4 and D7, and D9 retired The
    // Servian Reforms), so the offer holds three of the four, each once.
    const offered = adopted.doctrines?.options ?? [];
    expect(offered).toHaveLength(3);
    expect(new Set(offered).size).toBe(3);
    const tierOne = ['theConsularRoads', 'theMarianReforms', 'theSoldiersShare', 'theSteppeConfederacy'];
    for (const id of offered) expect(tierOne, id).toContain(id);
    expect(taizong.statecraft.pendingDoctrine?.options).toEqual(offered);
    // It blocks the turn until it is answered, as a draft does.
    expect(statecraftBlocker(taizong)).toBe('a Doctrine offer is waiting');
    expect(applyCommand(d.state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    expect(taizong.statecraft.doctrines).toEqual([offered[0]]);
    expect(taizong.statecraft.pendingDoctrine).toBeUndefined();
  });

  it('passes a Doctrine offer for nothing, and refuses both verbs with nothing on the table', () => {
    const d = dominionSeats();
    const seat = playerById(d.state, 0)!;
    const sc = seat.statecraft;
    for (const command of [
      { type: 'chooseDoctrine' as const, playerId: 0, optionIndex: 0 },
      { type: 'skipDoctrineOffer' as const, playerId: 0 },
    ]) {
      const before = snapshotState(d.state);
      expect(applyCommand(d.state, command).ok, command.type).toBe(false);
      expect(snapshotState(d.state), command.type).toBe(before);
    }
    sc.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    adoptGovernmentAt(d.state, seat, 0);
    const skipsBefore = sc.orderSkips;
    expect(applyCommand(d.state, { type: 'skipDoctrineOffer', playerId: 0 }).ok).toBe(true);
    expect(sc.pendingDoctrine).toBeUndefined();
    expect(sc.doctrines).toEqual([]);
    // No pity moves: a Doctrine offer is not a draft.
    expect(sc.orderSkips).toBe(skipsBefore);
  });

  it('seats a hand’s card in every chair it fits and refuses the rest, and adoption widens the council to its tier’s count', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const sc = ada.statecraft;
    const dealt = dealTo(g.state, ada)!;
    const id = dealt.offer.options[0]!;
    expect(applyCommand(g.state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    // **Typed chairs** (batch C2; the decks rework had made every chair
    // universal): the fit rule decides chair by chair, a misfit is refused in
    // the reducer's own sentence, and the Wildcard chair takes anything.
    const chairs = slotTypesOf(sc);
    for (let chair = 0; chair < sc.slots.length; chair++) {
      const error = slotOrderError(g.state, 0, id, chair);
      if (orderFitsSlot(id, chairs[chair]!)) expect(error, `chair ${chair}`).toBeNull();
      else expect(error, `chair ${chair}`).toBe(chairMisfitRefusal(id, chair, chairs[chair]!));
    }
    expect(slotOrderError(g.state, 0, id, chairs.indexOf('wildcard'))).toBeNull();
    sc.pendingGovernment = { tier: 4, options: governmentsAtTier(4) };
    adoptGovernmentAt(g.state, ada, 0);
    expect(sc.slots).toHaveLength(chairsAtTier(4));
    expect(sc.slots).toHaveLength(5);
    expect(slotTypesOf(sc)).toEqual(slotLayout(governmentsAtTier(4)[0]!));
  });

  it('replays a sequence of drafts, an adoption, a Doctrine taken and a Doctrine passed, byte for byte', () => {
    // `statecraft.slow.test.ts`'s shape: the same script on two fresh games
    // — culture the duel would never earn written in at the same points, every
    // decision a dispatched command — and the two boards compared byte for
    // byte. Two Dominion seats draft to the first rung, adopt the first
    // government on offer, and answer the Doctrine offer that follows: the
    // first seat takes it and the second passes. (Until batch C3 this script
    // opened, took and passed reward hands.)
    const play = () => {
      const g = dominionSeats(5);
      const seats = [playerById(g.state, 0)!, playerById(g.state, 1)!];
      for (let turn = 0; turn < 8; turn++) {
        for (const seat of seats) seat.culturePool += 10_000;
        expect(dispatch(g, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
        expect(dispatch(g, { type: 'endTurn', playerId: 1 }).ok).toBe(true);
        for (const seat of seats) {
          if (seat.statecraft.pendingOrder !== undefined) {
            expect(dispatch(g, { type: 'chooseOrder', playerId: seat.id, optionIndex: 0 }).ok).toBe(true);
          }
          if (seat.statecraft.pendingGovernment !== undefined) {
            expect(dispatch(g, { type: 'adoptGovernment', playerId: seat.id, choiceIndex: 0 }).ok).toBe(true);
          }
          if (seat.statecraft.pendingDoctrine !== undefined) {
            const command =
              seat.id === 0
                ? { type: 'chooseDoctrine' as const, playerId: seat.id, optionIndex: 0 }
                : { type: 'skipDoctrineOffer' as const, playerId: seat.id };
            expect(dispatch(g, command).ok).toBe(true);
          }
        }
      }
      return { snapshot: snapshotState(g.state), log: g.log, drafts: seats[0]!.statecraft.drafts };
    };
    const a = play();
    const b = play();
    expect(b.snapshot).toBe(a.snapshot);
    expect(a.drafts).toBeGreaterThanOrEqual(4);
    expect(a.log.filter((command) => command.type === 'adoptGovernment').length).toBeGreaterThanOrEqual(2);
    expect(a.log.filter((command) => command.type === 'chooseDoctrine').length).toBeGreaterThanOrEqual(1);
    expect(a.log.filter((command) => command.type === 'skipDoctrineOffer').length).toBeGreaterThanOrEqual(1);
  });

  it('reads the bot’s expectation off the deal’s own bags', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bags = expectedHandBags(g.state, ada);
    expect(bags).toHaveLength(3);
    const eligible = eligibleFor(g.state, ada);
    expect(bags[0]).toEqual(positionBag(eligible, { kind: 'deck', deck: 'expansionist' }, ada.decks));
    expect(bags[1]).toEqual(positionBag(eligible, { kind: 'deck', deck: 'commerce' }, ada.decks));
    expect(bags[2]).toEqual(positionBag(eligible, { kind: 'generic' }, ada.decks));
  });
});

describe('the eight files', () => {
  /**
   * **The decks' own files** (the orchestrator's structural addition to D1a):
   * a live Order lives in `data/decks/<deck>.json`, the generic and cross-type
   * rows in `data/decks/common.json`, the retired shelf in `statecraft.json`.
   * Read here **off the raw files**, not the fold, so a collision the loader
   * would throw on has a name in the register first.
   */
  const rawDecks = import.meta.glob('../../data/decks/*.json', { eager: true, import: 'default' }) as Record<
    string,
    { orders: Record<string, { decks?: unknown }> }
  >;
  const rawShelf = import.meta.glob('../../data/statecraft.json', { eager: true, import: 'default' }) as Record<
    string,
    { orders: Record<string, unknown> }
  >;

  it('are the retired shelf and the seven deck files, each starting as an orders map', () => {
    const names = Object.keys(rawDecks).map((path) => path.split('/').pop()!.replace('.json', '')).sort();
    expect(names).toEqual([...DECK_FILES].sort());
    for (const [path, file] of Object.entries(rawDecks)) {
      expect(typeof file.orders, path).toBe('object');
    }
    expect(Object.keys(rawShelf)).toHaveLength(1);
  });

  it('never write one id twice across the eight, and the fold carries every row once', () => {
    const seen = new Map<string, string>();
    const files: [string, Record<string, unknown>][] = [
      ['statecraft.json', Object.values(rawShelf)[0]!.orders],
      ...Object.entries(rawDecks).map(([path, file]) => [path.split('/').pop()!, file.orders] as [string, Record<string, unknown>]),
    ];
    let total = 0;
    for (const [name, orders] of files) {
      for (const id of Object.keys(orders)) {
        expect(seen.has(id), `"${id}" is written in ${seen.get(id)} and in ${name}`).toBe(false);
        seen.set(id, name);
        total += 1;
      }
    }
    expect(ORDER_IDS).toHaveLength(total);
    for (const id of seen.keys()) expect(ORDER_IDS, id).toContain(id);
  });

  it('keep every row of a deck file in that deck, and a common row in none or two', () => {
    for (const file of DECK_FILES) {
      for (const id of DECK_FILE_ORDERS[file]) {
        const home = orderDef(id).decks;
        if (file === 'common') {
          expect([0, 2], `${id} in common.json names ${home.length} deck(s)`).toContain(home.length);
        } else {
          expect(home, `${id} in ${file}.json`).toContain(file);
        }
      }
    }
    // The retired shelf's rows are in no deck file.
    for (const id of Object.keys(Object.values(rawShelf)[0]!.orders)) {
      for (const file of DECK_FILES) expect(DECK_FILE_ORDERS[file], `${id} in ${file}.json`).not.toContain(id);
    }
  });
});

describe('a charter', () => {
  let restore: () => void = () => {};
  const CHARTER_ROW = 'bloodedSpears';
  const CHARTERED_TECH = 'siegecraft';
  const CHARTERED_BUILDING = 'gildedHall';
  const CHARTERED_RITE = RITE_IDS[0]!;
  beforeAll(() => {
    restore = stockDecks({
      [CHARTER_ROW]: {
        decks: ['expansionist'],
        band: 0,
        rarity: 'rare',
        charter: { unlocks: { tech: CHARTERED_TECH, building: CHARTERED_BUILDING, rites: [CHARTERED_RITE] } },
      },
    });
  });
  afterAll(() => restore());

  it('applies its grant on the pick — the tech researchable, the building open, the rite known — and never sits', () => {
    const g = seated();
    const ada = playerById(g.state, 0)!;
    const bors = playerById(g.state, 1)!;
    // Shut to everybody until drafted.
    expect(researchError(g.state, 0, CHARTERED_TECH)).toMatch(/charter/);
    expect(isUnlocked(g.state, 0, 'building', CHARTERED_BUILDING)).toBe(false);
    expect(hasAbility(g.state, 0, riteAbility(CHARTERED_RITE))).toBe(false);

    // **D1b replaced D1a's one-card shelf.** D1a stocked this charter alone and
    // the hand could be nothing else; the live decks now stand behind it, so
    // the seat is brought to the same place the honest way — holding every
    // other card it is eligible for, the hand is the charter and nothing else.
    ada.statecraft.orders.push(...eligibleFor(g.state, ada).filter((id) => id !== CHARTER_ROW));
    const dealt = dealTo(g.state, ada)!;
    expect(dealt.offer.options).toEqual([CHARTER_ROW]);
    const result = applyCommand(g.state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 });
    expect(result.ok).toBe(true);
    expect(ada.statecraft.orders).toContain(CHARTER_ROW);
    expect(ada.charteredTechs).toEqual([CHARTERED_TECH]);
    expect(ada.charteredBuildings).toEqual([CHARTERED_BUILDING]);
    expect(ada.charteredRites).toEqual([CHARTERED_RITE]);
    expect(researchError(g.state, 0, CHARTERED_TECH)).toBeNull();
    expect(isUnlocked(g.state, 0, 'building', CHARTERED_BUILDING)).toBe(true);
    expect(hasAbility(g.state, 0, riteAbility(CHARTERED_RITE))).toBe(true);
    // The other seat is where it was.
    expect(researchError(g.state, 1, CHARTERED_TECH)).toMatch(/charter/);
    expect(isUnlocked(g.state, 1, 'building', CHARTERED_BUILDING)).toBe(false);
    expect(bors.charteredTechs).toEqual([]);
    // Never seated.
    expect(slotOrderError(g.state, 0, CHARTER_ROW, 0)).toMatch(/charter/);
    const before = snapshotState(g.state);
    expect(applyCommand(g.state, { type: 'slotOrder', playerId: 0, cardId: CHARTER_ROW, slotIndex: 0 }).ok).toBe(false);
    expect(snapshotState(g.state)).toBe(before);
  });
});
