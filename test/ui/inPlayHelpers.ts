/**
 * **The In play screen's boards and checks** (stage 3 of the Council and In
 * play board), shared by both tiers of `inPlayPieces`. A helper module and not
 * a test file, so importing it registers no test (CLAUDE.md, "Commands & test
 * discipline").
 *
 * The rules the checks hold:
 *
 *   - **nothing in force is missing**: every entry of the rules' walk
 *     (`liveEffects`) for the seat belongs to a piece on the screen, to the
 *     crest, or to a technology, which is never a piece;
 *   - **one reading**: a piece's figure on the books (`piecesFigures`) is the
 *     fold of its card stamp (`explainCardImpact`), and the screen's totals on
 *     the board without a piece are the totals less that piece's figure;
 *   - **the sheet adds up**: a clicked total's rows sum to the empire's figure.
 */

import { driveBots } from '../../src/ai/driver';
import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import { type CardImpactSubject, cardImpactWorlds, explainCardImpact } from '../../src/sim/cardImpact';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { MALICE_IDS } from '../../src/sim/maliceData';
import { BELIEF_IDS, RITE_IDS, beliefPoolOf } from '../../src/sim/religionData';
import type { GameState } from '../../src/sim/state';
import { liveEffects } from '../../src/sim/statecraft';
import { doctrineDef, isDoctrineId } from '../../src/sim/statecraftData';
import { isTechId } from '../../src/sim/techData';
import { COUNCIL_VOICES, type CouncilFigures, foldImpactVoices } from '../../src/ui/councilTotals';
import {
  type InPlayLayout,
  allPieces,
  inPlayBreakdown,
  inPlayLayout,
  piecesFigures,
  readInPlay,
} from '../../src/ui/inPlayPieces';
import { createGame } from '../sim/newGameHelpers';

const kept = new Map<number, GameState>();

/** A two-seat duel with leaders, played by the bots to `turns`, once per worker. Read only. */
export function inPlayGame(turns: number): GameState {
  const known = kept.get(turns);
  if (known !== undefined) return known;
  const game = createGame({
    seed: 20261119,
    sizeName: 'duel',
    players: [
      { name: 'Pachacuti', color: '#d4502e', leader: 'pachacuti' },
      { name: 'Taizong', color: '#3a7fe8', leader: 'taizong' },
    ],
    barbarians: true,
  });
  while (game.state.turn <= turns) driveBots(game, { warn: () => {} });
  kept.set(turns, game.state);
  return game.state;
}

/**
 * **A board with one of every piece**: the played board, and on seat 0 a
 * wonder in its first town, a pantheon god, a legacy, a malice with no chair,
 * and a timed effect on the seat and on its first town. Shallow copies: the
 * played board is not changed.
 */
export function dressedBoard(base: GameState): GameState {
  const seat = base.players[0]!;
  const town = base.cities.findIndex((city) => city.ownerId === 0);
  const held = new Set(base.cities.flatMap((city) => city.buildings));
  const wonder = BUILDING_IDS.find((id) => isWonder(id) && !held.has(id))!;
  const god = BELIEF_IDS.find((id) => beliefPoolOf(id) === null && !seat.pantheon.beliefs.includes(id))!;
  const person = GREAT_PERSON_IDS.find((id) => greatPersonDef(id).legacy.length > 0 && !seat.legacies.some((held) => held.id === id))!;
  const rite = RITE_IDS[0]!;
  const timed = { card: rite, effect: { kind: 'pays', where: 'city', science: 2 }, expiresTurn: base.turn + 6 } as never;
  const cities = base.cities.slice();
  if (town >= 0) {
    const city = cities[town]!;
    cities[town] = {
      ...city,
      buildings: [...city.buildings, wonder],
      timed: [...(city.timed ?? []), { card: rite, effect: { kind: 'pays', where: 'city', culture: 1 }, expiresTurn: base.turn + 3 } as never],
    };
  }
  const players = base.players.map((player) =>
    player.id !== 0
      ? player
      : {
          ...player,
          pantheon: { ...player.pantheon, beliefs: [...player.pantheon.beliefs, god] },
          legacies: [...player.legacies, { id: person, age: 1 }],
          malices: [...player.malices, { id: MALICE_IDS[0]!, untilAge: 9 }],
          timed: [...(player.timed ?? []), timed],
        },
  );
  return { ...base, cities, players };
}

/** The walk's entries for the seat that belong to no piece on the screen and are no technology. */
export function missingFromInPlay(state: GameState, seat: number, layout: InPlayLayout = inPlayLayout(state, seat)): string[] {
  const cards = new Set<string>();
  const shares = new Set<number>();
  const entries = [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)];
  for (const entry of entries) {
    if (entry.card !== null) cards.add(entry.card);
    if (entry.piece?.kind === 'holyCity') shares.add(entry.piece.religion);
  }
  for (const piece of layout.hidden) if (piece.kind === 'ability') cards.add(piece.id);
  const doctrines = new Set(
    layout.government.flatMap((entry) => (entry.card !== null && isDoctrineId(entry.card) ? [doctrineDef(entry.card).name] : [])),
  );
  const missing: string[] = [];
  for (const entry of liveEffects(state, seat)) {
    if (entry.founderShare !== undefined) {
      if (!shares.has(entry.founderShare)) missing.push(entry.source);
      continue;
    }
    if (isTechId(entry.card)) continue;
    if (cards.has(entry.card)) continue;
    // A rule of a Doctrine on the screen reads these: an Order off its chair
    // (Scutage) and a government of the tier (The Union of Lublin). Their
    // figures are that Doctrine's.
    if (entry.source.startsWith('Order off its chair')) continue;
    const parts = entry.source.split(' · ');
    if (parts.length === 3 && parts[0] === 'Government' && doctrines.has(parts[2]!)) continue;
    missing.push(entry.source);
  }
  return [...new Set(missing)];
}

/** The largest gap, over the eight voices. */
export function largestGap(a: Readonly<CouncilFigures>, b: Readonly<CouncilFigures>): number {
  return Math.max(...COUNCIL_VOICES.map((voice) => Math.abs(a[voice] - b[voice])));
}

/** The books method against the card stamp's own fold, for one subject. */
export function booksAgainstStamp(state: GameState, seat: number, subject: CardImpactSubject): number {
  return largestGap(piecesFigures(state, seat, subject), foldImpactVoices(explainCardImpact(state, seat, subject)));
}

/**
 * The screen's totals on the board without one piece, against the totals
 * less that piece's figure. Zero when the reading is one.
 */
export function totalsWithoutGap(state: GameState, seat: number, key: string): number {
  const layout = inPlayLayout(state, seat);
  const reading = readInPlay(state, seat, layout);
  const entry = [...layout.government, ...layout.crest, ...layout.stacks.flatMap((stack) => stack.entries)].find(
    (each) => each.key === key,
  );
  if (entry?.piece === null || entry?.piece === undefined) return 0;
  const one = { kind: 'pieces', pieces: [entry.piece] } as const;
  const without = cardImpactWorlds(state, seat, one)!.without;
  const after = piecesFigures(without, seat, { kind: 'pieces', pieces: allPieces(inPlayLayout(without, seat)) });
  const own = piecesFigures(state, seat, one);
  const expected = {} as CouncilFigures;
  for (const voice of COUNCIL_VOICES) expected[voice] = reading.total[voice] - own[voice];
  return largestGap(after, expected);
}

/** Each voice's sheet: the empire's figure, and the sum of the rows that add up. */
export function sheetSums(state: GameState, seat: number): { voice: string; empire: number; rows: number }[] {
  const layout = inPlayLayout(state, seat);
  const reading = readInPlay(state, seat, layout);
  return COUNCIL_VOICES.map((voice) => {
    const sheet = inPlayBreakdown(state, seat, layout, reading, voice);
    const rows = sheet.sections.flatMap((section) => section.rows).filter((row) => row.alone !== true);
    return { voice, empire: sheet.empire, rows: rows.reduce((sum, row) => sum + row.amount, 0) };
  });
}
