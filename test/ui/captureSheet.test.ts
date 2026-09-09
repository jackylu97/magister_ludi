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

describe('the figures beside each answer', () => {
  it('reads the writ off the authority meter’s own line for this town', () => {
    const { state, city } = capture();
    const line = explainAuthority(state, 0).find((row) => row.source === `${city.name} · puppet`);
    expect(line, 'the meter draws a puppet line').toBeDefined();
    expect(captureFigures(state, 0, city).puppetWrit).toBe(Math.abs(line!.value));
  });

  it('reads the contentment off the happiness meter’s own relief line', () => {
    const { state, city } = capture();
    const line = explainHappiness(state, 0).find((row) => row.source === `${city.name} · puppet`);
    expect(line, 'the meter draws a puppet relief').toBeDefined();
    expect(line!.part).toBe('gain');
    expect(captureFigures(state, 0, city).puppetRelief).toBeCloseTo(Math.abs(line!.value), 6);
  });

  /**
   * The one figure that is a rules field rather than a meter line, and the
   * module docblock says why: the annexed town's writ line does not exist while
   * the town is a puppet, because `cityCosts` is module-private in `meters.ts`.
   */
  it('prices the annexation at the relief a puppet is given', () => {
    const { state, city } = capture();
    expect(captureFigures(state, 0, city).annexWrit).toBe(RULES.war.puppetAuthorityRelief);
  });

  it('counts the citizens and the ground, which is what razing takes', () => {
    const { state, city } = capture();
    const figures = captureFigures(state, 0, city);
    expect(figures.population).toBe(city.population);
    expect(figures.hexes).toBe(state.tileOwner.filter((owner) => owner === city.id).length);
    expect(figures.hexes).toBeGreaterThan(0);
  });

  it('moves with the meter — a bigger town asks for more', () => {
    const { state, city } = capture();
    const small = captureFigures(state, 0, city);
    city.population = 9;
    const large = captureFigures(state, 0, city);
    expect(large.demand).toBeGreaterThan(small.demand);
    expect(large.puppetRelief).toBeGreaterThan(small.puppetRelief);
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

  /** The figures are the meter's, so each one prints in the meter's own voice. */
  it('prints the writ each way round — annex costs it, razing hands it back', () => {
    const { state, city } = capture();
    const face = captureFace(state, 0, city);
    const writOf = (choice: string): string =>
      face.options.find((option) => option.choice === choice)!.figures
        .find((line) => line.label === 'Writ')!.value;
    expect(writOf('annex').startsWith('−')).toBe(true);
    expect(writOf('puppet').startsWith('−')).toBe(true);
    expect(writOf('raze').startsWith('+')).toBe(true);
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
    expect(sheet).toContain('explainAuthority(state, playerId)');
    expect(sheet).toContain('explainHappiness(state, playerId)');
    expect(sheet).toContain('razeCityError(state, playerId, city.id)');
    expect(sheet).toContain('RULES.war.puppetAuthorityRelief');
  });

  it('draws every number in the tabular mono the specimen asks for', () => {
    const css = source('style.css');
    expect(css).toContain('.capture-figure-value');
    const rule = css.slice(css.indexOf('.capture-figure-value'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('font-variant-numeric: tabular-nums');
  });
});
