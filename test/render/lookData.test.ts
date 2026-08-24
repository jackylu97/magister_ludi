/**
 * The player ink table — the one piece of `data/view3d.json` whose failure mode
 * is invisible rather than loud.
 *
 * A flag painted in a board ink is not an error anybody can see in a stack
 * trace: it draws, it is the right size, it is in the right place, and it is the
 * colour of the ground it stands on. That is exactly what happened to seats 3
 * and 4 on the mapgen page, whose capitals were founded, reported and drawn, and
 * read as bare poles because `players.fallbackOrder` seated them on `pine` and
 * `wheat` — `featureColor.forest` and `terrainColor.plains`. So the rule is
 * written down as a test rather than as a comment on a JSON array.
 */

import { describe, expect, it } from 'vitest';

import viewJson from '../../data/view3d.json';
import { RULES } from '../../src/sim/rulesData';
import { playerPieceColor } from '../../src/render3d/lookData';
import { newGame } from '../../src/sim/state';

const PLAYERS = viewJson.players as {
  byColor: Record<string, string>;
  fallbackOrder: string[];
};
const PALETTE = viewJson.palette as Record<string, string>;

/** Every ink the *board* itself is painted in: terrain, then features. */
const GROUND_INKS = new Set<string>([
  ...Object.values(viewJson.terrainColor as Record<string, string>),
  ...Object.values(viewJson.featureColor as Record<string, string>),
]);

describe('player inks', () => {
  it('names only palette entries', () => {
    for (const name of PLAYERS.fallbackOrder) {
      expect(`fallbackOrder ${name}: ${name in PALETTE}`).toBe(`fallbackOrder ${name}: true`);
    }
    for (const [css, name] of Object.entries(PLAYERS.byColor)) {
      expect(`byColor ${css}: ${name in PALETTE}`).toBe(`byColor ${css}: true`);
    }
  });

  it('seats the whole roster without repeating a flag', () => {
    // Short of `maxPlayers` the order wraps, and two capitals on a crowded map
    // wear the same colours — which is a thing the mapgen page exists to ask
    // about and therefore must not itself introduce.
    expect(PLAYERS.fallbackOrder.length).toBeGreaterThanOrEqual(RULES.game.maxPlayers);
    expect(new Set(PLAYERS.fallbackOrder).size).toBe(PLAYERS.fallbackOrder.length);
  });

  it('never paints a flag in an ink the board is painted in', () => {
    // The whole of the "only two of four capitals appear" bug: a flag the
    // colour of the grass under it is a flag nobody can see.
    for (const name of PLAYERS.fallbackOrder) {
      expect(`${name}: ${GROUND_INKS.has(name) ? 'is a ground ink' : 'ok'}`).toBe(`${name}: ok`);
    }
    for (const name of Object.values(PLAYERS.byColor)) {
      expect(`${name}: ${GROUND_INKS.has(name) ? 'is a ground ink' : 'ok'}`).toBe(`${name}: ok`);
    }
  });

  it('gives every seat of a full roster a distinct ink', () => {
    const inks = new Set<number>();
    for (let seat = 0; seat < RULES.game.maxPlayers; seat++) {
      inks.add(playerPieceColor('', seat));
    }
    expect(inks.size).toBe(RULES.game.maxPlayers);
  });

  it('gives the wild an ink of its own, distinct from every seat', () => {
    // The barbarians are a *player* (ledger Entry XX), so they are painted by
    // the same function every empire is — and the one thing that must be true of
    // their ink is that nobody mistakes a raider for a rival's warrior. It is in
    // `byColor` and deliberately **not** in `fallbackOrder`: the fallback seats
    // real empires, and a wild that could be dealt a seat's colour by index is
    // exactly the confusion this checks for.
    const wild = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#d4502e', isHuman: true }],
      barbarians: true,
    }).players.find((player) => player.barbarian)!;

    const raven = playerPieceColor(wild.color, wild.id);
    expect(PLAYERS.byColor[wild.color.toLowerCase()]).toBe('raven');
    expect(PLAYERS.fallbackOrder).not.toContain('raven');
    for (let seat = 0; seat < RULES.game.maxPlayers; seat++) {
      expect(`seat ${seat}`).toBe(playerPieceColor('', seat) === raven ? 'clashes' : `seat ${seat}`);
    }
    // And it is not a ground ink either, for the reason every other flag is not.
    expect(GROUND_INKS.has('raven')).toBe(false);
  });

  it('prefers the explicit table over the fallback, and wraps rather than throwing', () => {
    const [css, name] = Object.entries(PLAYERS.byColor)[0]!;
    expect(playerPieceColor(css.toUpperCase(), 7)).toBe(
      Number.parseInt(PALETTE[name]!.slice(1), 16),
    );
    const order = PLAYERS.fallbackOrder;
    expect(playerPieceColor('', order.length)).toBe(playerPieceColor('', 0));
    expect(playerPieceColor('', -1)).toBe(playerPieceColor('', order.length - 1));
  });
});
