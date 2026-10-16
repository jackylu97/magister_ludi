/**
 * The two lines `statecraft.test.ts` and `statecraft.slow.test.ts` both open
 * with.
 *
 * The concern's two long replays — sixty turns of slotting and unslotting, and
 * forty turns of reaching a draft the honest way — are slow-tier by shape and
 * live in the sibling file. They start from the same duel game and found a city
 * the same way as every other test here, so the fixture lives in a plain module:
 * importing a `.test.ts` from a `.test.ts` re-registers its tests and the suite
 * would count them twice.
 */
import { foundCityAt } from '../../src/sim/cities';
import { type Game, dispatch, restoreState, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { isPassable } from '../../src/sim/pathfind';
import { type GameConfig, type GameState, bumpRevision } from '../../src/sim/state';
import {
  type Band,
  type CharterSpec,
  type DeckId,
  type DoctrineId,
  type OrderId,
  type OrderRarity,
  DECK_IDS,
  ORDER_IDS,
  doctrineDef,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import { ABILITY_TECH } from '../../src/sim/techData';
import { createGame, forgetBuiltGames } from './newGameHelpers';

/**
 * The bench, generated once a seed and handed out as a private copy.
 *
 * Ten files open on this line and `statecraft.test.ts` alone asks for it two
 * hundred and sixty times; generating a duel map, placing its starts and
 * shuffling four bead decks is the same pure function of the same seed every
 * one of those times, bought at full price. `test/mapgen/fixtures.ts` made the
 * same bargain for the map generator and its docblock states the contract —
 * this is that contract one scale out, and it is a *snapshot* cache rather than
 * an object cache because a `GameState` is mutable by nature and every caller
 * here pokes the one it is given. What each caller gets is a JSON round trip of
 * a fresh `createGame` instead of a generation, which is what `restoreState`
 * exists for: the state is plain data (`Rng` is a number in a box), so the
 * restored board is the board `createGame` would have returned.
 *
 * The cache lives as long as the worker rather than as long as the file, which
 * is the whole win: `poolOptions.forks.isolate` is off (see `vite.config.ts`),
 * so a fork keeps its module graph from one test file to the next and the
 * second file to ask for seed 7 is handed the first file's generation.
 */
interface Bench {
  config: GameConfig;
  /** `snapshotState` of the board, parsed afresh for every caller. */
  state: string;
  /** The log as JSON, for the same reason. */
  log: string;
}

const benches = new Map<number, Bench>();

export function game(seed = 7): Game {
  let bench = benches.get(seed);
  if (bench === undefined) {
    const made = createGame({
      seed,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    // The two seats are at war from the first turn (schema 56). Several files
    // sharing this bench ask what a card, a legacy or a Triumph is worth *in a
    // fight*, and since the war ruling a blow between two empires at peace is
    // refused before a strength is folded.
    //
    // **Dispatched, not written.** This bench is handed to tests that replay
    // `{config, log}` and compare snapshots (`guilds.test.ts`), so a war written
    // straight into the register would be a fact the log does not carry and the
    // replay would part company with the game on the first byte. A declaration
    // rolls no dice, so it costs the seeded world nothing.
    dispatch(made, { type: 'declareWar', playerId: 0, targetId: 1 });
    bench = {
      config: made.config,
      state: snapshotState(made.state),
      log: JSON.stringify(made.log),
    };
    benches.set(seed, bench);
  }
  return {
    config: JSON.parse(JSON.stringify(bench.config)) as GameConfig,
    state: restoreState(bench.state),
    log: JSON.parse(bench.log) as Command[],
  };
}

/**
 * Puts the **ancestor rites** in every seat's hand — the gate a great-person
 * offer opens behind since the tree pass of 2026-08-30.
 *
 * Renown gathers from turn one and nobody answers it until an empire has
 * researched Ancestor Rites, so any test that is about what renown is *worth*,
 * what a legacy pays or what a Triumph mints has to get past the gate first.
 * The gate itself has its own test in `renown.test.ts`.
 *
 * Written directly onto the seat rather than through a command, exactly as the
 * other fixtures here reach for `foundCityAt`: it is scenery, not the subject.
 * It is therefore **not** for a test that replays a log — grant the technology
 * inside the log for those.
 *
 * Read through `ABILITY_TECH` so that moving the gate to another node moves this
 * with it, and never leaves it naming a technology that opens nothing.
 *
 * **It announces itself** (batch E3a). A technology is the tenth source of
 * `liveEffects` and every reading in the game is remembered on
 * `GameState.revision`, so a bench that writes one onto a seat is a writer and
 * says so exactly as `applyCommand` does. See `test/sim/benches.test.ts`.
 */
export function keepTheRites(state: GameState): void {
  const gate = ABILITY_TECH.get('ancestorRites');
  if (gate === undefined) return;
  for (const player of state.players) {
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  }
  bumpRevision(state);
}

/**
 * A city for a player, on the tile their first unit is standing on.
 *
 * `foundCityAt` is the sim's own seam and not a command, so the bench moves the
 * revision on its behalf — the same announcement `keepTheRites` makes.
 */
export function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  const city = foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
  bumpRevision(state);
  return city;
}

/**
 * Walks every piece off a town's own hex — "move it first", done by the bench.
 *
 * Since item (hhhh) a **bought** unit stands on the city hex or is not sold, and
 * a bench town founded under the seat's escort therefore refuses every purchase.
 * A test whose subject is a *card* firing on a purchase says this first, so the
 * refusal it is not about cannot swallow the one thing it is.
 *
 * Additive on purpose: `found` is unchanged, because a town with its escort
 * still standing in it is the honest board for everything else in this bench.
 */
export function marchOut(state: GameState, city: { col: number; row: number }): void {
  for (const piece of state.units) {
    if (piece.col !== city.col || piece.row !== city.row) continue;
    const out = neighborTiles(state.map, tileHex(getTileAt(state.map, city.col, city.row)!)).find(
      (tile) => isPassable(tile),
    )!;
    piece.col = out.col;
    piece.row = out.row;
  }
  bumpRevision(state);
}

// --- the stocked decks --------------------------------------------------------

/**
 * **A shelf to draw from, in a build whose every row is retired** (the decks
 * rework, D1a: *"with every old row retired and no new rows yet, the pool is
 * EMPTY in D1a"*). D1b fills the decks with rows of their own; until then a
 * test about the *draw* — its positions, its cadence, its odds, its bands —
 * has nothing to deal unless the bench stocks the shelf itself.
 *
 * It does so by **un-retiring rows the table already has** and stamping the
 * deck, band and rarity the test wants onto them, which is deliberately not a
 * second card table: the rows keep their names, their effects and their
 * describers, so a stocked card slots, pays and prints exactly as a dealt card
 * will. The retired flag is read live by `orderIsDealt`, and the three fields
 * are read live by the draw, so nothing here needs a rebuild of `ORDER_IDS`.
 *
 * **Restore is mandatory.** `poolOptions.forks.isolate` is off (see `game`'s
 * docblock), so the module graph — and the mutated rows — outlive the file.
 * Every stocking answers with the function that puts the rows back exactly as
 * they were, and a suite calls it in `afterAll`.
 */
export interface StockedRow {
  decks: DeckId[];
  band: Band;
  rarity?: OrderRarity;
  charter?: CharterSpec;
}

export function stockDecks(rows: Readonly<Record<string, StockedRow>>): () => void {
  // A game built before the rows changed is not the game `newGame` builds now.
  forgetBuiltGames();
  const undo: (() => void)[] = [];
  for (const [id, row] of Object.entries(rows)) {
    if (!ORDER_IDS.includes(id as OrderId)) throw new Error(`stockDecks: "${id}" is no Order`);
    const def = orderDef(id as OrderId);
    const before = {
      retired: def.retired,
      decks: def.decks,
      band: def.band,
      rarity: def.rarity,
      charter: def.charter,
    };
    delete def.retired;
    def.decks = [...row.decks];
    def.band = row.band;
    if (row.rarity !== undefined) def.rarity = row.rarity;
    if (row.charter !== undefined) def.charter = row.charter;
    undo.push(() => {
      if (before.retired === undefined) delete def.retired;
      else def.retired = before.retired;
      def.decks = before.decks;
      def.band = before.band;
      def.rarity = before.rarity;
      if (before.charter === undefined) delete def.charter;
      else def.charter = before.charter;
    });
  }
  return () => {
    for (const step of undo.reverse()) step();
    forgetBuiltGames();
  };
}

/**
 * **The standard stocking**: eight rows a deck across the four bands and three
 * rungs, six cross-type rows (each deck paired with the next), six generic
 * rows — sixty rows off the table in file order, skipping rows that carry a
 * slot grant or an age gate of their own. Deterministic, so a hand dealt from
 * it at a seed is the same hand in every file that asks.
 *
 * Per deck, the eight are, in order: common · common · uncommon · rare at band
 * 0; common · uncommon at band 1; common at band 2; rare at band 3 — so every
 * deck has a rare on the opening shelf (the reward hands' pin until batch C3
 * removed them) and something behind every band gate (the band pin).
 */
export function stockStandardDecks(): () => void {
  // **Only rows D1a retired**, never a row the design withdrew before it: every
  // pre-rework withdrawal wrote a `note` saying so ("Retired …"), and D1a's
  // blanket retirement wrote none — so a note is the mark of a row that must
  // stay off the shelf, and the tests that pin those withdrawals keep reading
  // what they read. A hundred and thirty-seven rows qualify; sixty are used.
  const candidates = ORDER_IDS.filter((id) => {
    const def = orderDef(id);
    return (
      def.effects.length > 0 &&
      def.onSlot === undefined &&
      def.fromAge === undefined &&
      def.note === undefined
    );
  });
  const rows: Record<string, StockedRow> = {};
  // **A row keeps its own rarity.** The shape below asks for a rung, and the
  // next unused candidate *of that rung* is taken, in file order — so no row's
  // `rarity` is ever re-stamped, and a test that pins a row's mark against the
  // worksheet reads the data whether or not the bench stocked the row. The
  // table holds fifty-four commons, fifty-nine uncommons and twenty-four rares
  // among the candidates; the shape wants thirty-four, thirteen and thirteen.
  const used = new Set<OrderId>();
  const take = (rarity: OrderRarity): OrderId => {
    const id = candidates.find((row) => !used.has(row) && orderDef(row).rarity === rarity);
    if (id === undefined) throw new Error(`stockStandardDecks: the table ran out of ${rarity} rows`);
    used.add(id);
    return id;
  };
  const SHAPE: readonly { band: Band; rarity: OrderRarity }[] = [
    { band: 0, rarity: 'common' },
    { band: 0, rarity: 'common' },
    { band: 0, rarity: 'uncommon' },
    { band: 0, rarity: 'rare' },
    { band: 1, rarity: 'common' },
    { band: 1, rarity: 'uncommon' },
    { band: 2, rarity: 'common' },
    { band: 3, rarity: 'rare' },
  ];
  for (const deck of DECK_IDS) {
    for (const shape of SHAPE) rows[take(shape.rarity)] = { decks: [deck], band: shape.band };
  }
  DECK_IDS.forEach((deck, index) => {
    rows[take('common')] = { decks: [deck, DECK_IDS[(index + 1) % DECK_IDS.length]!], band: 0 };
  });
  const GENERIC: readonly OrderRarity[] = ['common', 'common', 'common', 'common', 'uncommon', 'rare'];
  for (const rarity of GENERIC) rows[take(rarity)] = { decks: [], band: 0 };
  return stockDecks(rows);
}

/**
 * **Gives every pre-rework row its old office as a card type**, for a file's
 * lifetime (batch C2).
 *
 * A pre-rework row carries an office (`OrderDef.slot`: military, economic or
 * wildcard) and no `type`, so in the game it is unsorted and the cards that
 * count the council by type count it as the chair it sits in
 * (`countedTypeOf`). The legacy tests of those count shapes were written
 * against the card's own office ("The Guild Charter counts economic cards, and
 * counts itself"), and stamping the office as the type keeps them testing what
 * a card's own type does. A row that already has a type keeps it. Restore is
 * mandatory, for `stockDecks`' reason.
 */
export function typeRowsByOldOffice(): () => void {
  forgetBuiltGames();
  const undo: (() => void)[] = [];
  for (const id of ORDER_IDS) {
    const def = orderDef(id);
    if (def.slot === undefined || def.type !== undefined) continue;
    def.type = def.slot;
    undo.push(() => {
      delete def.type;
    });
  }
  return () => {
    for (const step of undo.reverse()) step();
    forgetBuiltGames();
  };
}

/**
 * **Un-retires Doctrine rows for a file's lifetime** — `stockDecks`' twin for
 * the other retired class. Every pre-rework Doctrine row is `retired: true`
 * since D1a, and the deck files hold only one live Doctrine so far (batch C3,
 * The Steppe Confederacy), so a test about a *shape* that deals a Doctrine
 * offer (a wonder's completion grant, a widening rider) needs a tier with rows
 * on it.
 *
 * Since batch C3 a seat is offered only the Doctrines of its own decks, and a
 * pre-rework row names none, so a stocked row with no deck is lent `decks`
 * (every deck unless the caller names some). The rows keep everything else;
 * restore is mandatory for `stockDecks`' reason.
 */
export function stockDoctrines(
  ids: readonly DoctrineId[],
  decks: readonly DeckId[] = DECK_IDS,
): () => void {
  forgetBuiltGames();
  const undo: (() => void)[] = [];
  for (const id of ids) {
    const def = doctrineDef(id);
    const before = def.retired;
    const beforeDecks = def.decks;
    delete def.retired;
    if (def.decks.length === 0) def.decks = [...decks];
    undo.push(() => {
      if (before === undefined) delete def.retired;
      else def.retired = before;
      def.decks = beforeDecks;
    });
  }
  return () => {
    for (const step of undo.reverse()) step();
    forgetBuiltGames();
  };
}

/**
 * **Every row any seat could be dealt**, grouped by the shelf it sits on — the
 * bench's stocking *and* D1b's live rows, which is the honest whole once the
 * decks carry cards of their own.
 *
 * Filtered by **`orderIsDealt`**, not by `retired` alone (D1b). D1b added
 * three hundred and ninety-nine rows of which two hundred and fifty-five are
 * `deferred` — in the data, in the Compendium, in no pool — and none of them
 * carries `retired`, so the older reading swept every one of them onto a shelf
 * no draw would ever deal from. `orderIsDealt` is the sim's own answer to "is
 * this row on any shelf at all", and asking it here keeps the bench and the
 * draw reading one rule.
 */
export function stockedShelf(): { deck: DeckId | 'cross' | 'generic'; id: OrderId }[] {
  const out: { deck: DeckId | 'cross' | 'generic'; id: OrderId }[] = [];
  for (const id of ORDER_IDS) {
    if (!orderIsDealt(id)) continue;
    const def = orderDef(id);
    out.push({ deck: def.decks.length === 0 ? 'generic' : def.decks.length === 2 ? 'cross' : def.decks[0]!, id });
  }
  return out;
}
