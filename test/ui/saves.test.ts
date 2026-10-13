/**
 * The save shelf, and the gate every file has to come through to become a game.
 *
 * This suite exists because save/load is the one feature whose failure mode is
 * silent: a loader that accepted a file it half-understood would produce a game
 * that looks completely normal and is not the one the player saved. So the
 * assertions here are mostly refusals — a wrong version, a truncated log, a
 * command the rules no longer take — and the one positive claim is the strongest
 * one available, which is that the loaded state is byte-identical to the state
 * that was saved (`snapshotState` on both, compared as strings).
 *
 * `src/ui/saves.ts` takes its storage as an interface for exactly this reason:
 * everything below runs in the node environment the rest of the suite uses, with
 * a `Map` standing in for `localStorage`. The parts that genuinely need a
 * browser — a file picker, a download — are in `savesPanel.ts` and are not here.
 */

import { describe, expect, it } from 'vitest';
import { type Game, dispatch, snapshotState } from '../../src/sim/game';
import { type GameConfig, SCHEMA_VERSION, hasEndedTurn } from '../../src/sim/state';
import {
  AUTOSAVE_SLOT,
  MAX_SAVE_CHARS,
  QUICKSAVE_SLOT,
  SAVE_FORMAT_VERSION,
  SAVE_KEY_PREFIX,
  SAVE_META_PREFIX,
  SAVE_PACK_PREFIX,
  type SavePayload,
  type SaveStorage,
  createAutosaver,
  deleteSave,
  exportFilename,
  listSaves,
  loadSave,
  loadSlot,
  makeSavePayload,
  memorySaveStorage,
  metaKey,
  namedSlotId,
  newestSlot,
  readSaveText,
  readSlot,
  resumeSeat,
  slotSummary,
  slugify,
  storageKey,
  unpackSave,
  writeSave,
} from '../../src/ui/saves';
import { createGame, newGame } from '../sim/newGameHelpers';

/**
 * `localStorage` in eleven lines. The real one satisfies `SaveStorage`
 * structurally, so this is the same object the browser hands `main.ts`.
 */
function fakeStorage(): SaveStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** A storage that refuses every write, the way a private window or a full quota does. */
function refusingStorage(): SaveStorage {
  const inner = fakeStorage();
  return {
    ...inner,
    get length() {
      return inner.length;
    },
    setItem() {
      throw new DOMException('QuotaExceededError');
    },
  };
}

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 31337,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
    ...overrides,
  };
}

/**
 * Plays whole turns: every seat that still owes one ends it, in player order.
 * The already-ended seats are skipped rather than commanded — the wild and an
 * eliminated player are auto-ended every turn and would refuse the command.
 */
function endTurns(game: Game, count: number): void {
  for (let i = 0; i < count; i++) {
    for (const player of game.state.players) {
      if (hasEndedTurn(game.state, player.id)) continue;
      expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
    }
  }
}

/**
 * Letters that gzip cannot shrink much (xorshift32), for a save that has to be
 * over the cap after packing. A repeated letter would pack to almost nothing.
 */
function noise(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const out: string[] = [];
  let x = 2463534242;
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out.push(alphabet[(x >>> 0) % alphabet.length]!);
  }
  return out.join('');
}

/** A game a few turns in, with a log worth replaying. */
function playedGame(overrides: Partial<GameConfig> = {}): Game {
  const game = createGame(config(overrides));
  endTurns(game, 4);
  return game;
}

describe('makeSavePayload', () => {
  it('carries both versions, the clock, and the sim’s own {config, log}', async () => {
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 1_700_000_000_000);
    expect(payload.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION);
    expect(payload.savedAt).toBe(1_700_000_000_000);
    expect(payload.name).toBe('Rome');
    expect(payload.turn).toBe(game.state.turn);
    expect(payload.config).toEqual(game.config);
    expect(payload.log).toEqual(game.log);
  });

  it('is still {config, log} sized — the map is nowhere in it', async () => {
    const game = playedGame();
    // The claim the whole format rests on, restated where a save can break it:
    // a duel map is a hundred kilobytes of tiles and the file is a fraction of
    // that. The envelope adds a shelf label, not a snapshot.
    expect(JSON.stringify(makeSavePayload(game, 'Rome', 0)).length).toBeLessThan(2000);
    expect(snapshotState(game.state).length).toBeGreaterThan(50_000);
  });
});

describe('slot keys and names', () => {
  it('namespaces every key it owns', async () => {
    expect(storageKey(AUTOSAVE_SLOT)).toBe(`${SAVE_KEY_PREFIX}autosave`);
    expect(storageKey(QUICKSAVE_SLOT)).toBe(`${SAVE_KEY_PREFIX}quicksave`);
    expect(storageKey(namedSlotId('Rome'))).toBe(`${SAVE_KEY_PREFIX}named:rome`);
  });

  it('folds a name to a slug, so saving the same name twice is one slot', async () => {
    expect(namedSlotId('Rome')).toBe(namedSlotId('  rome!  '));
    expect(slugify('The Long March of Ur')).toBe('the-long-march-of-ur');
    expect(slugify('')).toBe('untitled');
    expect(slugify('!!!')).toBe('untitled');
  });

  it('cannot let a name claim the two fixed slots', async () => {
    // A save called "Autosave" is `named:autosave`, not the rolling slot.
    expect(namedSlotId('Autosave')).not.toBe(AUTOSAVE_SLOT);
    expect(namedSlotId('quicksave')).not.toBe(QUICKSAVE_SLOT);
  });

  it('names the exported file after the save and the turn', async () => {
    const payload = makeSavePayload(playedGame(), 'The Long March', 0);
    expect(exportFilename(payload)).toBe(`the-long-march-turn-${payload.turn}.json`);
  });
});

describe('slotSummary', () => {
  it('says how far along and which world, in that order', async () => {
    const storage = fakeStorage();
    await writeSave(
      storage,
      namedSlotId('Rome'),
      makeSavePayload(playedGame({ seed: 42 }), 'Rome', 0),
    );
    const slot = readSlot(storage, namedSlotId('Rome'))!;
    expect(slotSummary(slot)).toBe(`Turn ${slot.turn} · duel · 2 seats · seed 42`);
  });

  it('calls a one-seat game solo rather than "1 seats"', async () => {
    const storage = fakeStorage();
    const game = createGame(config({ players: [{ name: 'Ada', color: '#e8503a', isHuman: true }] }));
    await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 0));
    expect(slotSummary(readSlot(storage, QUICKSAVE_SLOT)!)).toMatch(/· solo ·/);
  });
});

describe('memorySaveStorage', () => {
  it('is an ordinary shelf, so the private-window path is the tested one', async () => {
    // The fallback a browser that refuses `localStorage` gets. Nothing
    // downstream branches on it, which is only safe because it behaves exactly
    // like the real thing for everything except outliving the tab.
    const storage = memorySaveStorage();
    const game = playedGame();
    expect((await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 5))).ok).toBe(true);
    expect(listSaves(storage).map((s) => s.id)).toEqual([QUICKSAVE_SLOT]);
    const result = await loadSlot(storage, QUICKSAVE_SLOT);
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
    deleteSave(storage, QUICKSAVE_SLOT);
    expect(listSaves(storage)).toEqual([]);
  });
});

describe('writeSave', () => {
  it('stores the payload under its namespaced key', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    const result = await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 5));
    expect(result.ok).toBe(true);
    const stored = storage.map.get(`${SAVE_KEY_PREFIX}named:rome`);
    expect(stored).toBeDefined();
    expect((JSON.parse(await unpackSave(stored!)) as SavePayload).name).toBe('Rome');
  });

  it('stores the slot packed, and unpacks to exactly the JSON of the payload', async () => {
    // What is saved does not change, only how it is stored: the unpacked text
    // is character for character the JSON the slot used to hold.
    const storage = fakeStorage();
    const payload = makeSavePayload(playedGame(), 'Rome', 5);
    await writeSave(storage, namedSlotId('Rome'), payload);
    const stored = storage.map.get(storageKey(namedSlotId('Rome')))!;
    expect(stored.startsWith(SAVE_PACK_PREFIX)).toBe(true);
    expect(await unpackSave(stored)).toBe(JSON.stringify(payload));
    expect(await readSaveText(storage, namedSlotId('Rome'))).toBe(JSON.stringify(payload));
    // Plain JSON passes through, so an older slot or an imported file reads.
    expect(await unpackSave(JSON.stringify(payload))).toBe(JSON.stringify(payload));
  });

  it('takes the JSON when called, so a game that moves on during packing does not change the save', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 5);
    const expected = JSON.stringify(payload);
    const writing = writeSave(storage, namedSlotId('Rome'), payload);
    endTurns(game, 1);
    await writing;
    expect(await readSaveText(storage, namedSlotId('Rome'))).toBe(expected);
  });

  it('degrades to a sentence when the browser refuses to store anything', async () => {
    const result = await writeSave(refusingStorage(), AUTOSAVE_SLOT, makeSavePayload(playedGame(), 'A', 0));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/storage may be full or blocked/);
  });

  it('refuses a payload over the size cap rather than filling the shelf with it', async () => {
    const storage = fakeStorage();
    const payload = makeSavePayload(playedGame(), 'Huge', 0);
    // A save long past anything a real game produces. The guard is about a
    // runaway, so the test makes one. The cap is on the packed text, so the
    // filler is noise that gzip cannot shrink (a repeated letter would pack
    // to almost nothing).
    payload.name = noise(MAX_SAVE_CHARS * 1.5);
    const result = await writeSave(storage, AUTOSAVE_SLOT, payload);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/too large/);
    expect(result.ok === false && result.reason).toBe('size');
    expect(storage.map.size).toBe(0);
  });

  it('leaves neither key behind when the label record cannot be written', async () => {
    // A packed slot with no label could not be listed, so a half-written pair
    // is removed whole and reported as a storage failure.
    const inner = fakeStorage();
    const storage: SaveStorage = {
      ...inner,
      get length() {
        return inner.length;
      },
      setItem(key, value) {
        if (key.startsWith(SAVE_META_PREFIX)) throw new DOMException('QuotaExceededError');
        inner.setItem(key, value);
      },
    };
    const result = await writeSave(storage, AUTOSAVE_SLOT, makeSavePayload(playedGame(), 'A', 0));
    expect(result.ok === false && result.reason).toBe('storage');
    expect(inner.map.size).toBe(0);
  });
});

describe('readSlot / listSaves', () => {
  it('derives the shelf label without replaying the game', async () => {
    const storage = fakeStorage();
    const game = playedGame({ seed: 99, sizeName: 'duel' });
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 1234));
    const slot = readSlot(storage, namedSlotId('Rome'));
    expect(slot).toEqual({
      id: 'named:rome',
      kind: 'named',
      name: 'Rome',
      turn: game.state.turn,
      savedAt: 1234,
      seed: 99,
      sizeName: 'duel',
      seats: 2,
    });
  });

  it('knows which of the three kinds of slot a row came off', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    await writeSave(storage, AUTOSAVE_SLOT, makeSavePayload(game, 'Autosave', 1));
    await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 2));
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 3));
    const kinds = Object.fromEntries(listSaves(storage).map((s) => [s.id, s.kind]));
    expect(kinds).toEqual({
      autosave: 'auto',
      quicksave: 'quick',
      'named:rome': 'named',
    });
  });

  it('lists newest first, and breaks a tie by slot id so the order is stable', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    await writeSave(storage, namedSlotId('older'), makeSavePayload(game, 'older', 100));
    await writeSave(storage, namedSlotId('newest'), makeSavePayload(game, 'newest', 300));
    await writeSave(storage, namedSlotId('middle'), makeSavePayload(game, 'middle', 200));
    expect(listSaves(storage).map((s) => s.name)).toEqual(['newest', 'middle', 'older']);

    // Two saves stamped the same millisecond order by id, not by insertion.
    const tied = fakeStorage();
    await writeSave(tied, namedSlotId('zeta'), makeSavePayload(game, 'zeta', 7));
    await writeSave(tied, namedSlotId('alpha'), makeSavePayload(game, 'alpha', 7));
    expect(listSaves(tied).map((s) => s.name)).toEqual(['alpha', 'zeta']);
  });

  it('ignores keys that are not its own', async () => {
    const storage = fakeStorage();
    storage.setItem('someone-elses-key', 'nonsense');
    storage.setItem('magisterludi:settings', '{}');
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(playedGame(), 'Rome', 1));
    expect(listSaves(storage).map((s) => s.id)).toEqual(['named:rome']);
  });

  it('leaves an undescribable slot off the list rather than arguing with it', async () => {
    // The list is not the place a version refusal is worth reading — that is
    // `loadSave`, when the player picks one. A row it cannot label is no row.
    const storage = fakeStorage();
    storage.setItem(storageKey('broken'), '{ not json');
    storage.setItem(storageKey('ancient'), JSON.stringify({ formatVersion: 0, config: {} }));
    storage.setItem(
      storageKey('other-rules'),
      JSON.stringify({ formatVersion: SAVE_FORMAT_VERSION, schemaVersion: -1, config: {} }),
    );
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(playedGame(), 'Rome', 1));
    expect(listSaves(storage).map((s) => s.id)).toEqual(['named:rome']);
    expect(readSlot(storage, 'broken')).toBeNull();
    expect(readSlot(storage, 'nothing-here')).toBeNull();
  });

  it('answers Continue with the newest save of any kind', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    expect(newestSlot(storage)).toBeNull();
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 100));
    await writeSave(storage, AUTOSAVE_SLOT, makeSavePayload(game, 'Autosave', 200));
    expect(newestSlot(storage)?.id).toBe(AUTOSAVE_SLOT);
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 300));
    expect(newestSlot(storage)?.id).toBe('named:rome');
  });

  it('deletes a slot and nothing else', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 1));
    await writeSave(storage, namedSlotId('Ur'), makeSavePayload(game, 'Ur', 2));
    deleteSave(storage, namedSlotId('Rome'));
    expect(listSaves(storage).map((s) => s.id)).toEqual(['named:ur']);
    // Its label record goes with it.
    expect(storage.map.has(metaKey(namedSlotId('Rome')))).toBe(false);
    expect(storage.map.has(metaKey(namedSlotId('Ur')))).toBe(true);
  });

  it('lists the shelf from the label records without reading a single save', async () => {
    // Finding 10 of the browser performance audit: the landing used to parse
    // every save whole to print four labels. Now no slot key is read at all.
    const storage = fakeStorage();
    const game = playedGame({ players: [{ name: 'Ada', color: '#e8503a', leader: 'pachacuti' }] });
    await writeSave(storage, AUTOSAVE_SLOT, makeSavePayload(game, 'Autosave', 2));
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(game, 'Rome', 1));
    const read: string[] = [];
    const counting: SaveStorage = {
      ...storage,
      get length() {
        return storage.length;
      },
      getItem(key) {
        read.push(key);
        return storage.getItem(key);
      },
    };
    const slots = listSaves(counting);
    expect(slots.map((s) => s.id)).toEqual([AUTOSAVE_SLOT, 'named:rome']);
    expect(slots[0]!.leader).toBe('pachacuti');
    expect(slots[0]!.turn).toBe(game.state.turn);
    expect(read.filter((key) => key.startsWith(SAVE_KEY_PREFIX))).toEqual([]);
    expect(read.every((key) => key.startsWith(SAVE_META_PREFIX))).toBe(true);
  });

  it('still lists a plain JSON slot left by an older build with no label record', async () => {
    const storage = fakeStorage();
    const game = playedGame({ seed: 99, players: [{ name: 'Ada', color: '#e8503a', leader: 'pachacuti' }] });
    const payload = makeSavePayload(game, 'Old Rome', 1234);
    storage.setItem(storageKey(namedSlotId('Old Rome')), JSON.stringify(payload));
    expect(readSlot(storage, namedSlotId('Old Rome'))).toEqual({
      id: 'named:old-rome',
      kind: 'named',
      name: 'Old Rome',
      turn: game.state.turn,
      savedAt: 1234,
      seed: 99,
      sizeName: 'duel',
      seats: 1,
      leader: 'pachacuti',
    });
    const loaded = await loadSlot(storage, namedSlotId('Old Rome'));
    if (loaded === null || !loaded.ok) throw new Error('expected the old slot to load');
    expect(snapshotState(loaded.game.state)).toBe(snapshotState(game.state));
  });

  it('gives a label record and a parsed save the same row', async () => {
    const storage = fakeStorage();
    const game = playedGame({ seed: 7 });
    const payload = makeSavePayload(game, 'Rome', 99);
    await writeSave(storage, namedSlotId('Rome'), payload);
    const legacy = fakeStorage();
    legacy.setItem(storageKey(namedSlotId('Rome')), JSON.stringify(payload));
    expect(readSlot(storage, namedSlotId('Rome'))).toEqual(readSlot(legacy, namedSlotId('Rome')));
  });

  it('never lists a label record whose slot has gone', async () => {
    const storage = fakeStorage();
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(playedGame(), 'Rome', 1));
    storage.removeItem(storageKey(namedSlotId('Rome')));
    expect(listSaves(storage)).toEqual([]);
  });

  it('refuses a label record from other rules, as it refuses the save', async () => {
    const storage = fakeStorage();
    await writeSave(storage, namedSlotId('Rome'), makeSavePayload(playedGame(), 'Rome', 1));
    const meta = JSON.parse(storage.getItem(metaKey(namedSlotId('Rome')))!) as Record<string, unknown>;
    storage.setItem(metaKey(namedSlotId('Rome')), JSON.stringify({ ...meta, schemaVersion: -1 }));
    expect(listSaves(storage)).toEqual([]);
  });
});

describe('loadSave', () => {
  it('round-trips to a byte-identical state that keeps playing in lockstep', async () => {
    const game = playedGame();
    const json = JSON.stringify(makeSavePayload(game, 'Rome', 42));

    const result = loadSave(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The claim: not "equal-looking", but the same bytes out of the same
    // serializer the determinism guard uses.
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
    expect(result.game.config).toEqual(game.config);
    expect(result.game.log).toEqual(game.log);

    // And it is a live game, not a picture of one: both sides play on and stay
    // identical, which is what would break if the log had been trimmed.
    endTurns(result.game, 3);
    endTurns(game, 3);
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
  });

  it('round-trips a game with the wild in it, and with a mapgen override sheet', async () => {
    // Both of the config's optional fields, because both change the world the
    // seed produces and both normalise away when absent.
    const game = playedGame({
      barbarians: true,
      mapgenOverrides: { elevation: { mountainShare: 0.2 } },
    });
    const result = loadSave(JSON.stringify(makeSavePayload(game, 'Wild', 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
    expect(result.game.config.barbarians).toBe(true);
  });

  it('reports the turn the replay reached, never the number on the label', async () => {
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 0);
    payload.turn = 400; // a hand-edited shelf label
    const result = loadSave(JSON.stringify(payload));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.turn).toBe(game.state.turn);
    expect(result.game.state.turn).toBe(game.state.turn);
  });

  it('refuses a file that is not JSON, and one that is not an object', async () => {
    expect(loadSave('{ not json').ok).toBe(false);
    expect(loadSave('{ not json')).toMatchObject({ error: /not even JSON/ });
    expect(loadSave('42')).toMatchObject({ ok: false, error: /not a save/ });
    expect(loadSave('null')).toMatchObject({ ok: false, error: /not a save/ });
    expect(loadSave('[]')).toMatchObject({ ok: false, error: /not a save/ });
  });

  it('refuses either version mismatch, and says there are no migrations', async () => {
    const game = playedGame();
    const older = { ...makeSavePayload(game, 'Rome', 0), formatVersion: 0 };
    const format = loadSave(JSON.stringify(older));
    expect(format.ok).toBe(false);
    expect(format.ok === false && format.error).toMatch(/format 0/);
    expect(format.ok === false && format.error).toMatch(/not migrated/);

    const rules = loadSave(
      JSON.stringify({ ...makeSavePayload(game, 'Rome', 0), schemaVersion: SCHEMA_VERSION + 1 }),
    );
    expect(rules.ok).toBe(false);
    expect(rules.ok === false && rules.error).toMatch(
      new RegExp(`rules version ${SCHEMA_VERSION + 1}`),
    );
    expect(rules.ok === false && rules.error).toMatch(/not migrated/);
  });

  it('refuses a file with no config and one with no log', async () => {
    const game = playedGame();
    const { config: _c, ...noConfig } = makeSavePayload(game, 'Rome', 0);
    expect(loadSave(JSON.stringify(noConfig))).toMatchObject({ ok: false, error: /no game setup/ });
    const { log: _l, ...noLog } = makeSavePayload(game, 'Rome', 0);
    expect(loadSave(JSON.stringify(noLog))).toMatchObject({ ok: false, error: /no command log/ });
  });

  it('lets the simulation’s own config validation refuse a setup it cannot build', async () => {
    // Not a copy of `validateConfig` living in the loader: the sentence in the
    // refusal is the sim's, which is how a new rule about configs reaches the
    // load path for free.
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 0);
    const bad = { ...payload, config: { ...payload.config, sizeName: 'gargantuan' } };
    const result = loadSave(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/setup is not one this build can play/);
    // The sim named the thing it did not know.
    expect(result.ok === false && result.error).toMatch(/gargantuan/);
    expect(() => newGame(bad.config as GameConfig)).toThrow();
  });

  it('aborts on a command the rules will not take, and reports where', async () => {
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 0);
    // A command naming a unit that has never existed: rejected by the reducer,
    // exactly as a save from a build with different rules would be.
    const log = [...payload.log];
    log.splice(2, 0, { type: 'moveUnit', playerId: 0, unitId: 9999, target: { col: 1, row: 1 } });
    const result = loadSave(JSON.stringify({ ...payload, log }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(
      'That save is corrupt or from an incompatible build.',
    );
    // The index is for the console, and it is the index of the command that
    // actually failed rather than of the end of the log.
    expect(result.ok === false && result.detail).toMatch(/command 2 \(moveUnit\)/);
  });

  it('never hands back a half-loaded game', async () => {
    // The property that matters more than any single refusal: on every rejected
    // file there is no `game` on the result at all, so a caller cannot reach one
    // by ignoring `ok`. A partial load is not something the shape allows.
    const game = playedGame();
    const payload = makeSavePayload(game, 'Rome', 0);
    const broken = [
      '{ not json',
      '42',
      JSON.stringify({ ...payload, formatVersion: 0 }),
      JSON.stringify({ ...payload, schemaVersion: -1 }),
      JSON.stringify({ ...payload, config: null }),
      JSON.stringify({ ...payload, log: 'not a log' }),
      JSON.stringify({ ...payload, log: [...payload.log, { type: 'notACommand', playerId: 0 }] }),
    ];
    for (const json of broken) {
      const result = loadSave(json);
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty('game');
    }
  });

  it('reads a slot straight off the shelf, and says nothing about an empty one', async () => {
    const storage = fakeStorage();
    const game = playedGame();
    expect(await loadSlot(storage, QUICKSAVE_SLOT)).toBeNull();
    await writeSave(storage, QUICKSAVE_SLOT, makeSavePayload(game, 'Quick Save', 0));
    const result = await loadSlot(storage, QUICKSAVE_SLOT);
    expect(result?.ok).toBe(true);
    if (!result?.ok) return;
    expect(snapshotState(result.game.state)).toBe(snapshotState(game.state));
  });
});

describe('resumeSeat', () => {
  it('sits a solo game down at seat 0', async () => {
    const game = createGame(config({ players: [{ name: 'Ada', color: '#e8503a', isHuman: true }] }));
    expect(resumeSeat(game.state)).toBe(0);
    endTurns(game, 3);
    expect(resumeSeat(game.state)).toBe(0);
  });

  it('resumes the harness at the first seat that has not ended the turn', async () => {
    const game = createGame(config());
    expect(resumeSeat(game.state)).toBe(0);
    expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    // Seat 0 is finished and seat 1 is the one the tester is now sitting in —
    // the same seat `endTurn` would have handed them.
    expect(resumeSeat(game.state)).toBe(1);
    expect(dispatch(game, { type: 'endTurn', playerId: 1 }).ok).toBe(true);
    // The turn resolved, the flags cleared, and the table opens again at 0.
    expect(game.state.turn).toBe(2);
    expect(resumeSeat(game.state)).toBe(0);
  });

  it('never seats the player as the wild', async () => {
    const game = createGame(config({ barbarians: true }));
    const wild = game.state.players.find((p) => p.barbarian);
    expect(wild).toBeDefined();
    // The wild is auto-ended every turn, so it can never be "first unfinished";
    // and with every real seat finished the answer is still a real seat.
    expect(resumeSeat(game.state)).toBe(0);
    for (const player of game.state.players) {
      game.state.turnEnded[player.id] = true;
    }
    expect(resumeSeat(game.state)).toBe(0);
    expect(resumeSeat(game.state)).not.toBe(wild!.id);
  });
});

describe('createAutosaver', () => {
  /** A defer the test drives by hand, so "later" is a line of the test. */
  function manualDefer(): { defer: (task: () => void) => void; run: () => void; waiting: () => number } {
    const tasks: Array<() => void> = [];
    return {
      defer: (task) => void tasks.push(task),
      run: () => tasks.splice(0).forEach((task) => task()),
      waiting: () => tasks.length,
    };
  }

  /** Lets the queued promise chain reach its next defer. */
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  it('writes the rolling slot once per turn, overwriting the last one', async () => {
    const storage = fakeStorage();
    const warnings: string[] = [];
    const auto = createAutosaver({ storage, onWarn: (m) => warnings.push(m), checkpoints: null });
    const game = playedGame();

    auto.save(game, 1000);
    // Called twice for the same turn — the hook fires once per resolution, but
    // rewriting the same save is pure cost, so the second call is a no-op.
    auto.save(game, 2000);
    await auto.flush();
    expect(readSlot(storage, AUTOSAVE_SLOT)?.savedAt).toBe(1000);
    // The slot and its label record.
    expect(storage.map.size).toBe(2);

    endTurns(game, 1);
    auto.save(game, 3000);
    await auto.flush();
    const slot = readSlot(storage, AUTOSAVE_SLOT);
    expect(slot?.savedAt).toBe(3000);
    expect(slot?.turn).toBe(game.state.turn);
    // One slot, still: it rolls rather than accumulating.
    expect(storage.map.size).toBe(2);
    expect(warnings).toEqual([]);
  });

  it('does no saving inside the call, only in the deferred task', async () => {
    // Finding 6 of the browser performance audit: the autosave stringified the
    // whole log and wrote it inside the End Turn task.
    const storage = fakeStorage();
    const later = manualDefer();
    const saved: number[] = [];
    const auto = createAutosaver({
      storage,
      onWarn: () => undefined,
      onSaved: () => saved.push(1),
      checkpoints: null,
      defer: later.defer,
    });
    auto.save(playedGame(), 1000);
    await settle();
    expect(storage.map.size).toBe(0);
    expect(later.waiting()).toBe(1);
    later.run();
    await auto.flush();
    expect(readSlot(storage, AUTOSAVE_SLOT)?.savedAt).toBe(1000);
    expect(saved).toEqual([1]);
  });

  it('saves the game as it was at the end of the turn, even if it moves on before the write', async () => {
    const storage = fakeStorage();
    const later = manualDefer();
    const auto = createAutosaver({ storage, onWarn: () => undefined, checkpoints: null, defer: later.defer });
    const game = playedGame();
    const expected = JSON.stringify(makeSavePayload(game, 'Autosave', 1000));
    auto.save(game, 1000);
    endTurns(game, 2);
    await settle();
    later.run();
    await auto.flush();
    expect(await readSaveText(storage, AUTOSAVE_SLOT)).toBe(expected);
  });

  it('reset lets a replacement game autosave at a turn number already written', async () => {
    const storage = fakeStorage();
    const auto = createAutosaver({ storage, onWarn: () => undefined, checkpoints: null });
    const first = playedGame();
    auto.save(first, 1000);
    const second = playedGame({ seed: 7 });
    // Same turn number, different game — without the reset the new game's first
    // autosave would be swallowed by the old one's turn guard.
    auto.reset();
    auto.save(second, 2000);
    await auto.flush();
    expect(readSlot(storage, AUTOSAVE_SLOT)?.savedAt).toBe(2000);
    expect(readSlot(storage, AUTOSAVE_SLOT)?.seed).toBe(7);
  });

  it('warns once and then stays quiet when the browser refuses storage', async () => {
    const warnings: string[] = [];
    const auto = createAutosaver({
      storage: refusingStorage(),
      onWarn: (m) => warnings.push(m),
      checkpoints: null,
    });
    const game = playedGame();
    auto.save(game, 1000);
    endTurns(game, 1);
    auto.save(game, 2000);
    endTurns(game, 1);
    auto.save(game, 3000);
    await auto.flush();
    // Three failed turns, one sentence: a warning per turn would be the crash
    // loop the graceful degradation was supposed to avoid.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^Autosave failed\./);
  });

  it('stops building saves after one is too large, until reset', async () => {
    // A log only grows, so a save over the cap will be over it next turn too;
    // before this guard the autosaver stringified the whole log every turn to
    // fail again. A refused quota is different: the player can free space.
    const storage = fakeStorage();
    let stringified = 0;
    const auto = createAutosaver({ storage, onWarn: () => undefined, checkpoints: null });
    const game = playedGame();
    // A name past the cap makes this game's save too large.
    const realStringify = JSON.stringify;
    const huge = noise(MAX_SAVE_CHARS * 1.5);
    JSON.stringify = ((value: unknown, ...rest: unknown[]) => {
      if (typeof value === 'object' && value !== null && 'log' in value) {
        stringified++;
        return realStringify({ ...(value as object), name: huge });
      }
      return realStringify(value, ...(rest as []));
    }) as typeof JSON.stringify;
    try {
      auto.save(game, 1000);
      await auto.flush();
      endTurns(game, 1);
      auto.save(game, 2000);
      await auto.flush();
      expect(stringified).toBe(1);
      auto.reset();
      auto.save(game, 3000);
      await auto.flush();
      expect(stringified).toBe(2);
    } finally {
      JSON.stringify = realStringify;
    }
    expect(storage.map.size).toBe(0);
  });
});

