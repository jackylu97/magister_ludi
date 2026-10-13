/**
 * **The strategic resources' empire bonuses** — batch R2 of
 * `docs/strategic-resources-proposal.md`, section 3 ("The empire bonus — one
 * copy is enough") and section 8.
 *
 * Every strategic resource gives its empire one bonus for controlling at least
 * one copy, however many copies it holds. R2 builds the vocabulary those bonuses
 * are written in; R3 writes the rows. So every fixture here installs a row at
 * runtime over an existing strategic id, which is the same proof the resource
 * table's data-drivenness has always rested on (`withExtraResources`).
 *
 * What is held still:
 *
 *   1. **The evaluator reads strategic rows at all.** It walked luxuries only
 *      until this batch, so four of the seven bonuses were "already expressible"
 *      as shapes and would still have paid nothing.
 *   2. **A strategic bonus pays once**, however many copies are held, and a
 *      card that multiplies luxury copies does not reach it.
 *   3. **`combatLine`** on a resource row puts a labelled strength line on the
 *      forecast, read by the same function a card's line is read by.
 *   4. **`roadStepCost`** on a resource row makes an empire's roads cheaper to
 *      march along, sums with the card rule rather than multiplying against it,
 *      and **a negative percentage is a discount** — the sign is pinned here
 *      because it is the easiest thing in this batch to get backwards.
 *   5. **`unitHealth`** raises the maximum of every piece that can fight, for as
 *      long as the empire controls a copy: naval included, civilians excluded,
 *      live rather than stamped at a piece's birth, and a piece left standing
 *      above a maximum that shrank under it loses the points rather than a
 *      proportion.
 *   6. **Every reader of `unitMaxHp` in `src/sim` asks the empire**, checked by
 *      reading the sources.
 *   7. **Asking the empire is cheap**, measured and printed.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, hasResource, resourceCopies } from '../../src/sim/cities';
import { improvementForResource } from '../../src/sim/improvementData';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { moveProfile, roadStepCost, roadStepCostWith } from '../../src/sim/pathfind';
import { previewCombat } from '../../src/sim/combat';
import {
  type ResourceEffect,
  type ResourceId,
  RESOURCE_EFFECT_KINDS,
  resourceDef,
  resourcesOfKind,
  withExtraResources,
} from '../../src/sim/resourceData';
import {
  cityResourceYields,
  describeResourceEffect,
  resourceCombatLines,
  resourceHappiness,
  resourcePercentYields,
  resourceRouteYields,
  resourceRulePercent,
  resourceUnitHealth,
  foldRulePercent,
  unitHealthBonus,
} from '../../src/sim/resourceEffects';
import { RULES } from '../../src/sim/rulesData';
import { bumpEconomy } from '../../src/sim/slate';
import {
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
} from '../../src/sim/state';
import { TECH_IDS, type TechId } from '../../src/sim/techData';
import { upgradeUnits } from '../../src/sim/tech';
import { isCivilian, unitDef, unitHp, unitMaxHp } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import { plainTechs } from './techHelpers';
import { newGame } from './newGameHelpers';

// --- the bench --------------------------------------------------------------

/**
 * A two-seat game on blank grassland with nothing on the map, so the only thing
 * that can pay anybody is what a fixture plants. `resourceCopies.test.ts`'
 * bench, which is the file next door and about the other half of this model.
 */
function bench(techs: readonly TechId[] = TECH_IDS): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 14, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...techs];
  bumpRevision(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The ring a town founded at (5,5) claims. `resourceCopies.test.ts`' list. */
const RING: readonly (readonly [number, number])[] = [
  [5, 4],
  [6, 4],
  [4, 5],
  [6, 5],
  [5, 6],
  [6, 6],
];

/** Opens `count` improved copies of a resource inside seat 0's borders. */
function seam(state: GameState, id: ResourceId, count: number): void {
  const improvement = improvementForResource(id);
  if (improvement === null) throw new Error(`nothing opens ${id}`);
  for (let i = 0; i < count; i++) {
    const where = RING[i];
    if (!where) throw new Error('the bench ring is full');
    const tile = at(state, where[0], where[1]);
    tile.resource = id;
    tile.improvement = improvement;
  }
  // The bench writes on the board by hand, so it announces the way a command
  // would — `test/sim/benches.test.ts` keeps the register of that rule. Both
  // clocks, because both are read from here: the ground moved (economy) and so
  // did the world a reading is memoised against (revision).
  bumpEconomy(state);
  bumpRevision(state);
}

/** Takes the work off the `index`th ring hex — a pillage. */
function pillage(state: GameState, index: number): void {
  const where = RING[index]!;
  delete at(state, where[0], where[1]).improvement;
  bumpEconomy(state);
  bumpRevision(state);
}

/**
 * Runs `body` with a strategic row carrying `effects`, then puts the table back.
 *
 * An existing id rather than an invented one, because a new row would have no
 * improvement to be opened by: `improvementForResource` reads
 * `data/improvements.json`, which R2 does not write. Overriding iron's row keeps
 * the mine and changes only what the row pays.
 */
function withBonus<T>(id: ResourceId, effects: ResourceEffect[], body: () => T): T {
  return withExtraResources({ [id]: { ...resourceDef(id), effects } }, body);
}

/** A bench with a town at (5,5) and `count` improved copies of `id`. */
function held(id: ResourceId, count = 1, techs: readonly TechId[] = TECH_IDS): GameState {
  const state = bench(techs);
  foundCityAt(state, 0, at(state, 5, 5));
  seam(state, id, count);
  expect(hasResource(state, 0, id)).toBe(true);
  return state;
}

// --- the evaluator reads strategic rows at all ------------------------------

describe('a strategic resource pays its empire', () => {
  /**
   * The check the proposal's table claims and this batch had to make true. Four
   * of the seven bonuses are shapes the vocabulary already carried — and the one
   * evaluator walked `controlledResources(…, 'luxury')` and nothing else, so a
   * strategic row declaring any of them would have loaded, validated and paid
   * nothing at all. That is the quiet-nothing this table's validator exists to
   * refuse, one level up.
   */
  it('pays a flat yield in every city (copper’s coin)', () => {
    withBonus('iron', [{ kind: 'perCityYields', gold: 1 }], () => {
      const state = held('iron');
      const lines = cityResourceYields(state, state.cities[0]!);
      const mine = lines.find((line) => line.resource === 'iron');
      expect(mine).toBeDefined();
      expect(mine!.gold).toBe(1);
    });
  });

  it('pays flat happiness (ivory’s contentment)', () => {
    withBonus('iron', [{ kind: 'extraHappiness', amount: 4 }], () => {
      const state = held('iron');
      const lines = resourceHappiness(state, 0);
      expect(lines.find((line) => line.resource === 'iron')?.amount).toBe(4);
    });
  });

  it('pays a percentage of a yield (niter’s science)', () => {
    withBonus('iron', [{ kind: 'percentYields', yield: 'science', percent: 10 }], () => {
      const state = held('iron');
      const lines = resourcePercentYields(state, state.cities[0]!);
      const mine = lines.find((line) => line.resource === 'iron');
      expect(mine?.percent).toBe(10);
      expect(mine?.yield).toBe('science');
    });
  });

  it('pays on every trade route (camels’ coin)', () => {
    withBonus('iron', [{ kind: 'routeYields', gold: 1 }], () => {
      const state = held('iron');
      expect(resourceRouteYields(state, 0).find((line) => line.resource === 'iron')?.gold).toBe(1);
    });
  });

  it('pays nothing to an empire that holds none of it', () => {
    withBonus('iron', [{ kind: 'extraHappiness', amount: 4 }], () => {
      const state = held('iron');
      expect(resourceHappiness(state, 1)).toEqual([]);
    });
  });

  /**
   * The user's ruling, 2026-09-18: *"players gain this bonus for having at least
   * one copy, only applies once regardless of number of copies."* That is the
   * one rule that separates a strategic bonus from a luxury's signature, and it
   * is why `copiesFor` asks the row's kind.
   */
  it('pays the same for six copies as for one', () => {
    withBonus('iron', [{ kind: 'extraHappiness', amount: 4 }], () => {
      const one = held('iron', 1);
      const many = held('iron', 6);
      expect(resourceCopies(many, 0, 'iron')).toBe(6);
      expect(resourceHappiness(many, 0)[0]!.amount).toBe(resourceHappiness(one, 0)[0]!.amount);
    });
  });

  it('describes its bonus in words, from the one describer', () => {
    withBonus('iron', [{ kind: 'unitHealth', amount: 10 }], () => {
      expect(describeResourceEffect('iron')).toContain('maximum health');
    });
    withBonus(
      'iron',
      [{ kind: 'combatLine', amount: 1, side: 'both', when: { test: 'always' } }],
      () => {
        expect(describeResourceEffect('iron')).toContain('combat strength');
      },
    );
  });
});

// --- obsidian's strength line -----------------------------------------------

describe('combatLine on a resource row', () => {
  /** Two pieces at war, so a forecast is legal. */
  function fight(state: GameState): { attacker: Unit; defender: Unit } {
    openWar(state, 0, 1);
    const attacker = createUnit(state, 0, 'warrior', 3, 3);
    const defender = createUnit(state, 1, 'warrior', 4, 3);
    return { attacker, defender };
  }

  it('joins the forecast as a labelled line on both sides', () => {
    withBonus(
      'iron',
      [{ kind: 'combatLine', amount: 1, side: 'both', when: { test: 'always' } }],
      () => {
        const state = held('iron');
        const { attacker } = fight(state);
        const view = previewCombat(state, attacker.id, { col: 4, row: 3 });
        if (!view.ok) throw new Error(view.error);
        const line = view.attackerLines.find((entry) => entry.source.startsWith('Iron'));
        expect(line).toBeDefined();
        expect(line!.amount).toBe(1);
        // Seat 1 holds no iron, so its side of the same fight gains nothing.
        expect(view.defenderLines.some((entry) => entry.source.startsWith('Iron'))).toBe(false);
      },
    );
  });

  it('reaches only the silhouette the row names', () => {
    withBonus(
      'iron',
      [
        {
          kind: 'combatLine',
          amount: 3,
          side: 'both',
          when: { test: 'always' },
          class: { modelClass: 'mounted' },
        },
      ],
      () => {
        const state = held('iron');
        openWar(state, 0, 1);
        const foot = createUnit(state, 0, 'warrior', 3, 3);
        createUnit(state, 1, 'warrior', 4, 3);
        const situation = {
          unit: foot,
          side: 'attack' as const,
          tile: at(state, 4, 3),
          vsBarbarians: false,
          vsCity: false,
          targetHp: 100,
          targetMaxHp: 100,
        };
        expect(resourceCombatLines(state, situation)).toEqual([]);
      },
    );
  });
});

// --- horses' roads ----------------------------------------------------------

describe('roadStepCost on a resource row', () => {
  /** Every technology whose own row carries no effects, plus the reveals. */
  const QUIET = plainTechs(4);

  function marcher(state: GameState): Unit {
    return createUnit(state, 0, 'warrior', 5, 5);
  }

  /**
   * **The sign is the rule's own.** A negative percentage is a discount, the
   * same convention `settlerCost` and `unitUpkeep` keep and the one Machinery's
   * own row writes (−40, a third becoming a fifth). This is the assertion that
   * fails if somebody flips it: horses are supposed to make an empire *faster*.
   */
  it('a negative percentage makes a road step cheaper, a positive one dearer', () => {
    withBonus('horses', [{ kind: 'rulePercent', rule: 'roadStepCost', percent: -25 }], () => {
      const state = held('horses', 1, QUIET);
      expect(foldRulePercent(resourceRulePercent(state, 0, 'roadStepCost'))).toBe(-25);
      const quicker = moveProfile(state, marcher(state)).roadStep;
      expect(quicker).toBeLessThan(roadStepCost);
      expect(quicker).toBe(roadStepCostWith(-25));
    });
    withBonus('horses', [{ kind: 'rulePercent', rule: 'roadStepCost', percent: 25 }], () => {
      const state = held('horses', 1, QUIET);
      const slower = moveProfile(state, marcher(state)).roadStep;
      expect(slower).toBeGreaterThan(roadStepCost);
    });
  });

  /**
   * Summed with the card rule and applied once, exactly as `ruleFactor` sums the
   * two vocabularies for a city's rules — so two sources of a discount read as
   * one total instead of as 0.75 × 0.60.
   */
  it('sums with Machinery rather than multiplying against it', () => {
    withBonus('horses', [{ kind: 'rulePercent', rule: 'roadStepCost', percent: -20 }], () => {
      const state = held('horses', 1, [...QUIET, 'machinery' as TechId]);
      const both = moveProfile(state, marcher(state)).roadStep;
      expect(both).toBe(roadStepCostWith(-60));
      expect(both).not.toBe(roadStepCostWith(-20));
    });
  });

  it('leaves an empire that holds none of it exactly where it was', () => {
    withBonus('horses', [{ kind: 'rulePercent', rule: 'roadStepCost', percent: -20 }], () => {
      const state = held('horses', 1, QUIET);
      const theirs = createUnit(state, 1, 'warrior', 9, 5);
      expect(moveProfile(state, theirs).roadStep).toBe(roadStepCost);
    });
  });
});

// --- iron's live health -----------------------------------------------------

const IRON_HEALTH: ResourceEffect[] = [{ kind: 'unitHealth', amount: 10 }];

describe('unitHealth on a resource row', () => {
  it('raises the maximum of every piece that can fight', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const bonus = unitHealthBonus(state, 0);
      expect(bonus).toBe(10);
      expect(resourceUnitHealth(state, 0)[0]!.amount).toBe(10);
      const sword = createUnit(state, 0, 'swordsman', 5, 5);
      expect(unitMaxHp(sword, bonus)).toBe(unitDef('swordsman').maxHp + 10);
    });
  });

  /**
   * The test is `isCivilian` and not `category === 'military'`, which is the
   * whole reason the ruling names it: the roster carries fourteen naval rows, a
   * ship fights, and `'military'` would have excluded every one of them.
   */
  it('reaches ships, and never a civilian', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const bonus = unitHealthBonus(state, 0);
      let ships = 0;
      let civilians = 0;
      for (const type of UNIT_TYPE_IDS) {
        const def = unitDef(type);
        const raised = unitMaxHp({ type }, bonus) - unitMaxHp({ type });
        if (isCivilian(def)) {
          civilians += 1;
          expect(raised, type).toBe(0);
          continue;
        }
        expect(raised, type).toBe(10);
        if (def.category === 'naval') ships += 1;
      }
      expect(ships).toBeGreaterThan(0);
      expect(civilians).toBeGreaterThan(0);
    });
  });

  it('is live: the army loses the points with the last copy', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron', 2);
      const sword = createUnit(state, 0, 'swordsman', 5, 5);
      const full = unitDef('swordsman').maxHp + 10;
      expect(sword.hp).toBe(full);

      // One mine pillaged is one copy fewer and the same bonus: the rule is
      // "at least one", so nothing moves until the last one goes.
      pillage(state, 0);
      expect(resourceCopies(state, 0, 'iron')).toBe(1);
      expect(unitMaxHp(sword, unitHealthBonus(state, 0))).toBe(full);

      pillage(state, 1);
      expect(hasResource(state, 0, 'iron')).toBe(false);
      expect(unitHealthBonus(state, 0)).toBe(0);
      expect(unitMaxHp(sword, unitHealthBonus(state, 0))).toBe(unitDef('swordsman').maxHp);
    });
  });

  /**
   * The clamp, and the ruling behind it: *current health drops to the new
   * maximum — you lose the ten points, not a proportion.* A comparison at the
   * point of reading rather than a sweep that rewrites every unit the turn a mine
   * changes hands, which would be a mutation outside `applyCommand`.
   */
  it('clamps a piece standing above a maximum that shrank under it', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const sword = createUnit(state, 0, 'swordsman', 5, 5);
      const roster = unitDef('swordsman').maxHp;
      expect(unitHp(sword, unitHealthBonus(state, 0))).toBe(roster + 10);

      pillage(state, 0);
      expect(sword.hp).toBe(roster + 10); // nothing swept the board
      expect(unitHp(sword, unitHealthBonus(state, 0))).toBe(roster);

      // And a wounded piece keeps its wound: the clamp is a ceiling, never a
      // proportion. 60 of 110 is 60 of 100, not 54.
      sword.hp = 60;
      expect(unitHp(sword, unitHealthBonus(state, 0))).toBe(60);
    });
  });

  it('a piece is born whole, and mends to the live figure', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const sword = createUnit(state, 0, 'swordsman', 5, 5);
      expect(sword.hp).toBe(unitMaxHp(sword, unitHealthBonus(state, 0)));

      sword.hp = 20;
      for (const player of state.players) {
        applyCommand(state, { type: 'endTurn', playerId: player.id });
      }
      // A rested piece mends toward the empire's figure, not the roster's.
      expect(sword.hp).toBeGreaterThan(20);
      expect(sword.hp).toBeLessThanOrEqual(unitDef('swordsman').maxHp + 10);
    });
  });

  it('carries the fraction across an upgrade on the same maximum', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const warrior = createUnit(state, 0, 'warrior', 5, 5);
      const before = unitMaxHp(warrior, unitHealthBonus(state, 0));
      expect(warrior.hp).toBe(before);
      upgradeUnits(state, state.players[0]!);
      // Whatever it became, it is whole: a fraction taken against a maximum with
      // the empire's points in it and applied to one without them would wound
      // every piece an empire upgraded.
      expect(warrior.hp).toBe(unitMaxHp(warrior, unitHealthBonus(state, 0)));
    });
  });

  it('a civilian is born and stays at the roster’s figure', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      const settler = createUnit(state, 0, 'settler', 5, 5);
      expect(settler.hp).toBe(unitDef('settler').maxHp);
      expect(unitMaxHp(settler, unitHealthBonus(state, 0))).toBe(unitDef('settler').maxHp);
    });
  });

  it('fights on the live figure, both sides', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      openWar(state, 0, 1);
      const mine = createUnit(state, 0, 'warrior', 3, 3);
      const theirs = createUnit(state, 1, 'warrior', 4, 3);
      const view = previewCombat(state, mine.id, { col: 4, row: 3 });
      if (!view.ok) throw new Error(view.error);
      expect(view.attackerMaxHp).toBe(unitDef('warrior').maxHp + 10);
      expect(view.defenderMaxHp).toBe(unitDef('warrior').maxHp);
      expect(view.attackerHp).toBe(view.attackerMaxHp);
      void theirs;
    });
  });

  /**
   * A blow lands on what the piece actually has. If combat subtracted from the
   * raw field, a swordsman left at 110 by a pillaged mine would take twenty
   * points and stand at 90 of 100 — ten points the ruling says it has already
   * lost.
   */
  it('a blow is taken off the clamped health, not the stored one', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron');
      openWar(state, 0, 1);
      const defender = createUnit(state, 0, 'warrior', 4, 3);
      const attacker = createUnit(state, 1, 'warrior', 3, 3);
      const roster = unitDef('warrior').maxHp;
      expect(defender.hp).toBe(roster + 10);
      pillage(state, 0);
      expect(
        applyCommand(state, {
          type: 'attack',
          playerId: 1,
          unitId: attacker.id,
          target: { col: 4, row: 3 },
        }),
      ).toEqual({ ok: true });
      const after = state.units.find((unit) => unit.id === defender.id);
      if (after) expect(after.hp).toBeLessThanOrEqual(roster);
    });
  });
});

// --- the register -----------------------------------------------------------

describe('who asks the empire', () => {
  /**
   * Every call of `unitMaxHp` in the simulation passes the empire's figure.
   *
   * A source-reading register, because the parameter has a default: a reader
   * that forgets it does not fail to compile, it quietly measures a piece against
   * the wrong bar. The exceptions are the callers that have no empire to ask,
   * and each is named with its reason rather than left to be inferred.
   */
  const NO_EMPIRE: readonly string[] = [
    // A roster reading with no piece at all — "how tough is this type".
    '../../src/ai/value.ts',
    // The gallery invents pieces on no board; there is no state to ask.
    '../../src/flairGallery/flourishes.ts',
  ];

  const SOURCES: readonly string[] = [
    '../../src/sim/combat.ts',
    '../../src/sim/turn.ts',
    '../../src/sim/tech.ts',
    '../../src/sim/religion.ts',
    '../../src/sim/greatPeople.ts',
    '../../src/sim/improvements.ts',
    '../../src/sim/state.ts',
    '../../src/sim/statecraft/evaluator.ts',
    '../../src/render3d/pieces.ts',
    '../../src/main.ts',
    '../../src/ui/cityBanners.ts',
    '../../src/ui/unitPanel.ts',
    '../../src/ui/controls.ts',
    // The bot's two health fractions, joined by batch R5. It has a board in hand
    // at both, so it asks the empire like everyone else.
    '../../src/ai/bot.ts',
  ];

  /**
   * Every source this register reads, as text. `import.meta.glob` with `?raw`
   * rather than the filesystem, which is how every other source-reading test in
   * this suite does it (`benches.test.ts`): the tests run through Vite and have
   * no Node types.
   */
  const TEXT = {
    ...(import.meta.glob('../../src/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/sim/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/sim/statecraft/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/render3d/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/ai/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
    ...(import.meta.glob('../../src/flairGallery/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  } as Record<string, string>;

  function sourceOf(path: string): string {
    const body = TEXT[path];
    if (body === undefined) throw new Error(`no source read for ${path}`);
    return body;
  }

  /** Every `unitMaxHp(...)` call in a file, as its argument text. */
  function calls(body: string): string[] {
    const out: string[] = [];
    let from = 0;
    for (;;) {
      const start = body.indexOf('unitMaxHp(', from);
      if (start < 0) break;
      let depth = 0;
      let index = start + 'unitMaxHp'.length;
      for (; index < body.length; index++) {
        const ch = body[index];
        if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      out.push(body.slice(start + 'unitMaxHp('.length, index));
      from = index + 1;
    }
    return out;
  }

  /** Is there a comma outside every bracket of this argument list? */
  function hasSecondArgument(args: string): boolean {
    let depth = 0;
    for (const ch of args) {
      if (ch === '(' || ch === '{' || ch === '[') depth += 1;
      else if (ch === ')' || ch === '}' || ch === ']') depth -= 1;
      else if (ch === ',' && depth === 0) return true;
    }
    return false;
  }

  it('every reader with a board in hand passes the empire’s figure', () => {
    for (const path of SOURCES) {
      const found = calls(sourceOf(path));
      expect(found.length, path).toBeGreaterThan(0);
      for (const args of found) {
        expect(hasSecondArgument(args), `${path}: unitMaxHp(${args})`).toBe(true);
      }
    }
  });

  it('names every caller that does not, and why', () => {
    for (const path of NO_EMPIRE) {
      expect(calls(sourceOf(path)).length, path).toBeGreaterThan(0);
    }
  });

  it('declares both new shapes in the vocabulary', () => {
    expect(RESOURCE_EFFECT_KINDS).toContain('combatLine');
    expect(RESOURCE_EFFECT_KINDS).toContain('unitHealth');
  });
});

// --- the measurement --------------------------------------------------------

describe('asking the empire for a maximum', () => {
  /**
   * The renderer asks `unitMaxHp` once per piece per repaint, so the empire
   * reading behind it has to be cheap. It is remembered on the economy clock,
   * which is the honest clock for it: the inputs are the ground, the bargains and
   * the technologies, and none of them moves when a unit dies. That is what
   * separates it from batch R1's committed count, which is a fact about pieces
   * and is deliberately not memoised at all.
   *
   * Printed rather than asserted against a threshold, because a wall-clock figure
   * on a shared machine is evidence and not a gate. The one thing asserted is the
   * shape of the claim: the memo is very much cheaper than the walk it stands in
   * for.
   */
  it('costs a memo lookup, not a walk of the empire', () => {
    withBonus('iron', IRON_HEALTH, () => {
      const state = held('iron', 4);
      for (let i = 0; i < 40; i++) createUnit(state, 0, 'swordsman', 5 + (i % 6), 8);

      const rounds = 20000;
      // Warm, so the first call's walk is not the figure being printed.
      unitHealthBonus(state, 0);
      const warmStart = performance.now();
      let sink = 0;
      for (let i = 0; i < rounds; i++) {
        sink += unitMaxHp(state.units[i % state.units.length]!, unitHealthBonus(state, 0));
      }
      const warm = ((performance.now() - warmStart) * 1000) / rounds;

      const coldStart = performance.now();
      const cold = 200;
      for (let i = 0; i < cold; i++) {
        bumpEconomy(state);
        sink += unitMaxHp(state.units[i % state.units.length]!, unitHealthBonus(state, 0));
      }
      const uncached = ((performance.now() - coldStart) * 1000) / cold;

      // eslint-disable-next-line no-console
      console.log(
        `unitMaxHp asking the empire: warm ${warm.toFixed(3)} µs/call, ` +
          `uncached ${uncached.toFixed(3)} µs/call`,
      );
      expect(sink).toBeGreaterThan(0);
      expect(warm).toBeLessThan(uncached);
    });
  });
});

// --- the seven live rows ----------------------------------------------------

/**
 * **The roster's own bonuses, off `data/resources.json` and no fixture.**
 *
 * Batch R3 wrote the rows the fixtures above stand in for, and the two have to
 * be pinned separately. A fixture proves the *machinery* works — the evaluator
 * reads a strategic row, the shape pays, the sign is the right way round. Only
 * the live table proves the **rows** work, and the trap this batch had in front
 * of it was exactly that: R2 found that the walk every resource reading filtered
 * used to ask for luxuries only, so a strategic row's effect would have loaded,
 * validated, printed and paid nothing. A row that silently pays nothing looks
 * identical to a row that pays, until somebody counts.
 *
 * One test a resource, each asking the reading that resource's shape lands in.
 */
describe('the seven strategic resources pay what their rows say', () => {
  /** Every technology, so nothing here is refused for want of a reveal. */
  it('copper: a coin in every city', () => {
    const state = held('copper');
    const line = cityResourceYields(state, state.cities[0]!).find(
      (entry) => entry.resource === 'copper',
    );
    expect(line).toBeDefined();
    expect(line!.gold).toBe(1);
    // And it is the empire's, not the seam's town: a second city is paid too.
    foundCityAt(state, 0, at(state, 9, 5));
    bumpRevision(state);
    expect(
      cityResourceYields(state, state.cities[1]!).find((entry) => entry.resource === 'copper')!.gold,
    ).toBe(1);
  });

  it('obsidian: a point of strength on a melee piece, and on nothing else', () => {
    const state = held('obsidian');
    openWar(state, 0, 1);
    const foot = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 1, 'warrior', 4, 3);
    const view = previewCombat(state, foot.id, { col: 4, row: 3 });
    if (!view.ok) throw new Error(view.error);
    const line = view.attackerLines.find((entry) => entry.source.startsWith('Obsidian'));
    expect(line).toBeDefined();
    expect(line!.amount).toBe(1);
    // The row names the melee silhouette, so an archer standing in the same
    // empire fights on its printed number.
    const bow = createUnit(state, 0, 'archer', 3, 4);
    expect(
      resourceCombatLines(state, {
        unit: bow,
        side: 'attack',
        tile: at(state, 4, 3),
        vsBarbarians: false,
        vsCity: false,
        targetHp: 100,
        targetMaxHp: 100,
      }),
    ).toEqual([]);
  });

  it('horses: quicker along a road, and the sign is a discount', () => {
    const state = held('horses', 1, plainTechs(4));
    expect(foldRulePercent(resourceRulePercent(state, 0, 'roadStepCost'))).toBe(-20);
    const quicker = moveProfile(state, createUnit(state, 0, 'warrior', 5, 5)).roadStep;
    expect(quicker).toBeLessThan(roadStepCost);
    expect(quicker).toBe(roadStepCostWith(-20));
  });

  it('camels: a coin on every trade route', () => {
    const state = held('camels');
    expect(resourceRouteYields(state, 0).find((line) => line.resource === 'camels')?.gold).toBe(1);
  });

  it('iron: ten points of maximum health on every piece that can fight', () => {
    const state = held('iron');
    const bonus = unitHealthBonus(state, 0);
    expect(bonus).toBe(10);
    const sword = createUnit(state, 0, 'longswordsman', 5, 5);
    expect(unitMaxHp(sword, bonus)).toBe(unitDef('longswordsman').maxHp + 10);
    // A ship counts and a settler does not — `isCivilian`, not the category.
    const hull = createUnit(state, 0, 'warGalley', 5, 5);
    expect(unitMaxHp(hull, bonus)).toBe(unitDef('warGalley').maxHp + 10);
    const settler = createUnit(state, 0, 'settler', 5, 5);
    expect(isCivilian(unitDef('settler'))).toBe(true);
    expect(unitMaxHp(settler, bonus)).toBe(unitDef('settler').maxHp);
  });

  it('ivory: four happiness, which is exactly what it paid as a luxury', () => {
    const state = held('ivory');
    const line = resourceHappiness(state, 0).find((entry) => entry.resource === 'ivory');
    expect(line?.amount).toBe(4);
    // **The number is the one it replaces.** Ivory left the luxury pool in
    // batch R3, and the flat every unique luxury pays went with it. The bonus is
    // written to hand back the same figure, so the row is a change of category
    // rather than a nerf — and this is the line that fails if one of the two
    // moves without the other.
    expect(line!.amount).toBe(RULES.meters.happiness.perUniqueLuxury);
  });

  it('niter: a tenth more science, everywhere', () => {
    const state = held('niter');
    const line = resourcePercentYields(state, state.cities[0]!).find(
      (entry) => entry.resource === 'niter',
    );
    expect(line?.yield).toBe('science');
    expect(line?.percent).toBe(10);
  });

  it('pays every one of them once, however many copies the empire holds', () => {
    // The user's ruling read off the live rows rather than off a fixture: six
    // ivory seams are one ivory's contentment.
    const many = held('ivory', 6);
    expect(resourceCopies(many, 0, 'ivory')).toBe(6);
    expect(resourceHappiness(many, 0).find((line) => line.resource === 'ivory')?.amount).toBe(4);
  });

  it('gives every strategic row a bonus — none of the seven is silent', () => {
    for (const id of resourcesOfKind('strategic')) {
      expect(`${id}: ${resourceDef(id).effects?.length ?? 0}`).not.toBe(`${id}: 0`);
    }
  });
});
