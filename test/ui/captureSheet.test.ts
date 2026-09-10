/**
 * The capture sheet — the question a conquest puts (`src/ui/captureSheet.ts`,
 * the user's ruling of 2026-09-09; `docs/flags.md` (hhh) 4).
 *
 * Two kinds of test, the split this suite always makes. The **figures** and the
 * **three answers** are pure functions over a real captured town and are driven
 * for real: what the sheet is most exposed to is a number composed here instead
 * of asked for, and that is visible in whether the value moves when the meter
 * moves. Everything that needs a DOM — the shell, the buttons, the wiring — is
 * asserted by reading the source, because there is no jsdom in this tier.
 *
 * The one property worth stating out loud: **closing is the puppet answer.**
 * There is no `puppetCity` command and there must never be one, so "the sheet
 * sends nothing" is not an omission to be tested around — it is the rule.
 */

import { describe, expect, it } from 'vitest';

import { CAPTURE_CHOICES, captureFace, captureFigures } from '../../src/ui/captureSheet';
import { applyCombat } from '../../src/sim/combat';
import { applyCommand } from '../../src/sim/commands';
import { explainAuthority, explainHappiness } from '../../src/sim/meters';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { openWar } from '../../src/sim/wars';
import { resetVisibility } from '../../src/sim/visibility';
import { uiSource } from './sourceHelpers';

const source = uiSource;

/** A flat two-seat board with nothing on it. `war.test.ts`'s fixture. */
function flatState(width = 16, height = 10): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`no tile at ${col},${row}`);
  return tile;
}

/** Seat 0 storms seat 1's town. It arrives a puppet — the rules' own default. */
function capture(): { state: GameState; city: City } {
  const state = flatState();
  // Both seats keep a home of their own, so the town that falls is nobody's
  // seat of government: `razeCityError` refuses a captor's capital *and* a town
  // that was the loser's (`City.wasCapital`, written by `handOverCity`), and a
  // fixture that stormed a capital would only ever test the refusal.
  foundCityAt(state, 0, at(state.map, 2, 4));
  foundCityAt(state, 1, at(state.map, 12, 7));
  const city = foundCityAt(state, 1, at(state.map, 6, 4));
  city.population = 4;
  city.hp = 1;
  openWar(state, 0, 1);
  const raider = createUnit(state, 0, 'warrior', 5, 4);
  expect(applyCombat(state, raider.id, { col: 6, row: 4 }).ok).toBe(true);
  expect(city.ownerId).toBe(0);
  expect(city.puppet).toBe(true);
  return { state, city };
}

/** One town's whole share of a meter, folded — the reading the sheet prints. */
function foldTown(list: readonly { source: string; value: number }[], name: string): number {
  let sum = 0;
  for (const line of list) {
    if (line.source === name || line.source.startsWith(`${name} `)) sum += line.value;
  }
  return sum;
}

describe('the figures beside each answer', () => {
  /**
   * The whole cost, not a line out of the list: what a player is choosing
   * between is two prices, and each of them is the fold of everything the meter
   * says about this town on the realm that holds it that way.
   */
  it('folds the town’s whole share of both meters, on the realm that annexed it', () => {
    const { state, city } = capture();
    const figures = captureFigures(state, 0, city);
    // The real board still holds it as a puppet, so the *puppet* pair is the
    // fold of the live meters and can be checked against them directly.
    expect(figures.puppetAuthority).toBeCloseTo(foldTown(explainAuthority(state, 0), city.name), 6);
    expect(figures.puppetHappiness).toBeCloseTo(foldTown(explainHappiness(state, 0), city.name), 6);
    // Both are costs: a captured town of four asks for more than it supplies.
    expect(figures.puppetAuthority).toBeLessThan(0);
    expect(figures.puppetHappiness).toBeLessThan(0);
  });

  /**
   * The pin the ruling asks for: annexing costs the relief on **both** meters,
   * and the sheet's own two folds are exactly that far apart — which is only
   * true if each of them was taken on its own outcome rather than shared.
   */
  it('prices annexation above the puppet by the relief, on both meters', () => {
    const { state, city } = capture();
    city.population = 8;
    const figures = captureFigures(state, 0, city);
    expect(figures.annexAuthority).toBeLessThan(figures.puppetAuthority);
    expect(figures.annexHappiness).toBeLessThan(figures.puppetHappiness);
    // Authority: the relief the rules name, exactly (`rules.war`).
    expect(figures.puppetAuthority - figures.annexAuthority).toBeCloseTo(
      RULES.war.puppetAuthorityRelief,
      6,
    );
    // Happiness: the share of its citizens' demand a puppet is forgiven — the
    // meter's own gain line, and the sheet never types the percentage.
    const relief = explainHappiness(state, 0).find((row) => row.source === `${city.name} · puppet`);
    expect(relief, 'the meter draws a puppet relief').toBeDefined();
    expect(figures.puppetHappiness - figures.annexHappiness).toBeCloseTo(relief!.value, 6);
  });

  /**
   * The what-if is a ghost. Nothing about the real board moves, and the slate's
   * remembered readings are neither read nor poisoned — a fold before and a fold
   * after are the same number.
   */
  it('leaves the board byte-identical, and the memo unpoisoned', () => {
    const { state, city } = capture();
    const before = JSON.stringify(state);
    const authorityBefore = foldTown(explainAuthority(state, 0), city.name);
    const happinessBefore = foldTown(explainHappiness(state, 0), city.name);

    captureFigures(state, 0, city);

    expect(JSON.stringify(state)).toBe(before);
    expect(city.puppet).toBe(true);
    expect(foldTown(explainAuthority(state, 0), city.name)).toBeCloseTo(authorityBefore, 6);
    expect(foldTown(explainHappiness(state, 0), city.name)).toBeCloseTo(happinessBefore, 6);
  });

  it('counts the citizens and the ground, which is what razing takes', () => {
    const { state, city } = capture();
    const figures = captureFigures(state, 0, city);
    expect(figures.population).toBe(city.population);
    expect(figures.hexes).toBe(state.tileOwner.filter((owner) => owner === city.id).length);
    expect(figures.hexes).toBeGreaterThan(0);
  });

  it('moves with the meter — a bigger town costs more, held either way', () => {
    const { state, city } = capture();
    const small = captureFigures(state, 0, city);
    city.population = 9;
    const large = captureFigures(state, 0, city);
    expect(large.annexHappiness).toBeLessThan(small.annexHappiness);
    expect(large.puppetHappiness).toBeLessThan(small.puppetHappiness);
  });
});

describe('the three answers', () => {
  it('offers annex, puppet and raze, in that order, each with a verb and figures', () => {
    const { state, city } = capture();
    const face = captureFace(state, 0, city);
    expect(face.options.map((option) => option.choice)).toEqual([...CAPTURE_CHOICES]);
    expect(face.title).toContain(city.name);
    for (const option of face.options) {
      expect(option.label.length, option.choice).toBeGreaterThan(0);
      expect(option.body.length, option.choice).toBeGreaterThan(0);
      expect(option.figures.length, option.choice).toBeGreaterThan(0);
      // Plain prose: no identifier, and never a bare `[[` mark on a surface.
      expect(option.body, option.choice).not.toContain('[[');
    }
  });

  /**
   * The two words, and the three prices. Every option prints both meters in the
   * player's own vocabulary (`docs/flags.md` (ppp) 7), each as a cost under that
   * outcome — and razing, which takes the town out of the realm entirely, prints
   * nought on both rather than leaving them off.
   */
  it('prints both meters on every answer, and nought on the raze', () => {
    const { state, city } = capture();
    const face = captureFace(state, 0, city);
    const valueOf = (choice: string, label: string): string =>
      face.options.find((option) => option.choice === choice)!.figures
        .find((line) => line.label === label)!.value;
    for (const choice of ['annex', 'puppet', 'raze']) {
      expect(valueOf(choice, 'Authority'), choice).toContain('⚜');
      expect(valueOf(choice, 'Happiness'), choice).toContain('☺');
    }
    expect(valueOf('annex', 'Authority').startsWith('−')).toBe(true);
    expect(valueOf('annex', 'Happiness').startsWith('−')).toBe(true);
    expect(valueOf('puppet', 'Authority').startsWith('−')).toBe(true);
    expect(valueOf('puppet', 'Happiness').startsWith('−')).toBe(true);
    expect(valueOf('raze', 'Authority')).toBe('0⚜');
    expect(valueOf('raze', 'Happiness')).toBe('0☺');
    // Neither retired word survives anywhere on the face.
    const printed = JSON.stringify(face);
    expect(/\bwrits?\b/i.test(printed)).toBe(false);
    expect(/\bcontentment\b|\bcheer(s|ful)?\b/i.test(printed)).toBe(false);
  });

  /** What razing releases, said as the verb performs it: the ground goes unowned. */
  it('says what razing releases, in hexes', () => {
    const { state, city } = capture();
    const raze = captureFace(state, 0, city).options.find((row) => row.choice === 'raze')!;
    const ground = raze.figures.find((line) => line.label === 'Territory released');
    expect(ground, 'the raze names the ground it releases').toBeDefined();
    const held = state.tileOwner.filter((owner) => owner === city.id).length;
    expect(ground!.value).toBe(`${held}⬡`);
    expect(raze.figures.find((line) => line.label === 'Citizens')!.value).toBe(
      String(city.population),
    );
  });

  it('greys razing with the reducer’s own sentence, and never hides it', () => {
    const { state, city } = capture();
    // A seat of government cannot be pulled down (`razeCityError`).
    city.wasCapital = true;
    const face = captureFace(state, 0, city);
    const raze = face.options.find((option) => option.choice === 'raze')!;
    expect(raze.blocked).toContain('seat of government');
    // Still offered — a verb that vanished is one a player never learns exists.
    expect(face.options).toHaveLength(3);
  });

  it('lets an ordinary town be pulled down', () => {
    const { state, city } = capture();
    const raze = captureFace(state, 0, city).options.find((row) => row.choice === 'raze')!;
    expect(raze.blocked).toBeNull();
  });

  /**
   * Annex and raze are commands the log already carries; the sheet only names
   * them. Driven for real so the two the sheet offers are the two that work.
   */
  it('names two commands the reducer accepts, and no third', () => {
    const annexed = capture();
    expect(
      applyCommand(annexed.state, {
        type: 'annexCity',
        playerId: 0,
        cityId: annexed.city.id,
      }).ok,
    ).toBe(true);
    expect(annexed.city.puppet).toBeUndefined();

    const razed = capture();
    expect(
      applyCommand(razed.state, { type: 'razeCity', playerId: 0, cityId: razed.city.id }).ok,
    ).toBe(true);
    expect(razed.state.cities.find((row) => row.id === razed.city.id)).toBeUndefined();
  });
});

describe('the sheet itself', () => {
  it('is the ninth on the parchment frame, with every door of it', () => {
    const sheet = source('captureSheet.ts');
    expect(sheet).toContain('createModalShell({');
    // No bar control opens a conquest, so there is nothing to hand the keyboard
    // back to — the one way this sheet differs from the other eight.
    expect(sheet).toContain('trigger: null');
    const html = source('index.html');
    expect(html).toContain('id="capture-overlay"');
    expect(html).toContain('class="statecraft-overlay"');
    expect(html).toContain('id="capture-close"');
    expect(html).toContain('id="capture-body"');
  });

  it('closes as a puppet — the answer that sends nothing', () => {
    const sheet = source('captureSheet.ts');
    // The gate is in `answer`: the sheet comes down, and only the two real
    // commands go on to `decide`.
    expect(sheet).toContain("if (choice === 'puppet') return;");
    // And the shell's own way out is the same one: `onClose` forgets the town,
    // and nothing on that path reaches `decide`.
    expect(sheet).toContain('onClose: () => {');
  });

  it('is raised on this seat’s own capture and never on a bot’s', () => {
    const controls = source('controls.ts');
    // Measured across the dispatch, the way the "· Uruk taken!" notice is.
    expect(controls).toContain('const cityHeldBy = cityBefore?.ownerId ?? null;');
    expect(controls).toContain('cityHeldBy !== localPlayerId');
    expect(controls).toContain('cityBefore.ownerId === localPlayerId');
    expect(controls).toContain('cityBefore.puppet === true');
    expect(controls).toContain('onCityCaptured?.(cityBefore.id);');
    const main = source('main.ts');
    expect(main).toContain('capture?.open(cityId);');
  });

  it('sends both verbs through the ordinary funnel, so a raze gets its toast', () => {
    const controls = source('controls.ts');
    expect(controls).toContain("commit({ type, playerId: localPlayerId, cityId })");
    expect(controls).toContain("decideCapturedCity('annexCity', cityId)");
    expect(controls).toContain("decideCapturedCity('razeCity', cityId)");
  });

  it('reads every figure off the simulation and types none of its own', () => {
    const sheet = source('captureSheet.ts');
    // Both meters, on both ghosts — four folds and no fifth reading.
    expect(sheet).toContain('explainAuthority(annexed, playerId)');
    expect(sheet).toContain('explainHappiness(annexed, playerId)');
    expect(sheet).toContain('explainAuthority(held, playerId)');
    expect(sheet).toContain('explainHappiness(held, playerId)');
    expect(sheet).toContain('razeCityError(state, playerId, city.id)');
    // No rules field is read here any more: the relief the sheet used to print
    // is the *difference* between two folds, and it comes out of the subtraction.
    expect(sheet).not.toContain('RULES.war');
  });

  /**
   * **The what-if writes nothing.** `cities` is replaced rather than pushed to
   * and the one town is copied out of it, so the real board is unreachable
   * through the ghost — `cardImpact.ts`'s rule, read off this file's own source.
   */
  it('builds its what-if as a ghost and never writes the board', () => {
    const sheet = source('captureSheet.ts');
    expect(sheet).toContain('cities: state.cities.map(');
    expect(sheet).toContain('const copy: City = { ...row };');
    // Nothing in the file assigns through the live state.
    expect(sheet).not.toContain('city.puppet =');
    expect(sheet).not.toContain('state.cities[');
  });

  it('draws every number in the tabular mono the specimen asks for', () => {
    const css = source('style.css');
    expect(css).toContain('.capture-figure-value');
    const rule = css.slice(css.indexOf('.capture-figure-value'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('font-variant-numeric: tabular-nums');
  });
});
