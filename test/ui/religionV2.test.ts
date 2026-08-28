/**
 * The interface's half of Religion v2 (`docs/religion-v2.md`, "What the
 * interface needs"): the Religion sheet's right pane, the prophet's four
 * ministries, the followers on a city sheet, the four toasts, and the
 * Compendium's new rows.
 *
 * Two kinds of test, and the split is this suite's usual one (`greatPeople.test.ts`).
 * Everything that is a **fold over the state** — what the pane reads, what a
 * town believes, what a seat is told — is pure and is driven for real. Everything
 * that lives in browser-only code (`unitPanel.ts` renders a sheet, `controls.ts`
 * needs a renderer) is asserted by **reading the source**, because the failure
 * mode of each is a surface that quietly asks the *wrong function*: a greyed row
 * whose sentence is not the reducer's, a count composed by hand beside the one
 * the simulation folds. Neither is visible in a rendered output; both are visible
 * in which name the file imported.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import {
  type GameState,
  type Religion,
  createUnit,
  newGame,
} from '../../src/sim/state';
import {
  enhanceReligionError,
  foundReligion,
  plantHolySiteError,
  proclaimError,
  redraftError,
} from '../../src/sim/religion';
import {
  ALL_BELIEF_IDS,
  BELIEF_IDS,
  ENHANCER_BELIEF_IDS,
  FOLLOWER_BELIEF_IDS,
  beliefPoolOf,
} from '../../src/sim/religionData';
import { RULES } from '../../src/sim/rulesData';
import { resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { cityFaithRows } from '../../src/ui/cityPanel';
import { compendiumSections } from '../../src/ui/compendium';
import { CONCEPT_ENTRIES } from '../../src/ui/compendiumText';
import { createReligionWatcher } from '../../src/ui/notifications';
import {
  POOL_WORD,
  beliefOfferEyebrow,
  poolTechName,
  pressureLedgerText,
  religionReading,
} from '../../src/ui/religionScreen';

const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** One file's source with its comments taken out. `seatRoster.test.ts`'s. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceOf(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(SOURCE[key!]!);
}

/** The body of one top-level `function name(` in a module, braces balanced. */
function fn(file: string, name: string): string {
  const text = sourceOf(file);
  const at = text.indexOf(`function ${name}(`);
  expect(`${file}:${name}`).toBe(at < 0 ? `${file}: no ${name}` : `${file}:${name}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`${file}'s ${name} never closes`);
}

// --- a world ----------------------------------------------------------------

/**
 * Three seats on flat grassland, one town each for the first two.
 *
 * Three rather than two because `maxReligions` is two thirds of the *real*
 * seats, rounded up (`realPlayers` — the wild is a seat and never a nation), and
 * a pane that prints "of N religions" has to be pinned against a table rather
 * than against a number written here.
 */
function world(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Azure', color: '#2a4d8f', isHuman: true },
      { name: 'Crimson', color: '#8f2a2a', isHuman: false },
      { name: 'Verdant', color: '#2a8f4d', isHuman: false },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
  state.cities[0]!.name = 'Uruk';
  foundCityAt(state, 1, getTileAt(state.map, 10, 6)!);
  state.cities[1]!.name = 'Lagash';
  return state;
}

/** Founds a faith for one seat, out of one god, the way the verb does. */
function found(state: GameState, seat: number): Religion {
  const player = state.players[seat]!;
  player.pantheon.beliefs.push(BELIEF_IDS[0]!);
  return foundReligion(state, player);
}

// --- the pane ---------------------------------------------------------------

describe('the Religion sheet’s right pane, before a religion exists', () => {
  it('says how many religions the world holds against the cap it will ever hold', () => {
    const state = world();
    const reading = religionReading(state, 0);
    expect(reading.religion).toBeNull();
    // Two thirds of three seats, rounded up. Counted here off the same two
    // integers the rule is written as, so a retuned table moves both.
    const share = RULES.religion.maxReligions;
    const cap = Math.ceil((3 * share.numerator) / share.denominator);
    expect(reading.count).toBe(`0 of ${cap} religions founded`);
  });

  it('says how one is founded — a prophet, and the node that teaches one', () => {
    const state = world();
    const found = religionReading(state, 0).found!;
    expect(found.how).toContain('prophet');
    expect(found.how).toContain('holy site');
    // The technology is named off the roster's own gate, never spelled here.
    expect(found.how).toContain(poolTechName('follower'));
  });

  it('carries the reducer’s own refusal for a realm with no gods', () => {
    const state = world();
    // `foundReligionError`'s first clause: identity is the pantheon.
    expect(religionReading(state, 0).found!.blocker).toBe(
      'You have no gods to found a religion on',
    );
  });

  it('has no houses, no trickle and no congregation to show', () => {
    const reading = religionReading(world(), 0);
    expect(reading.houses).toEqual([]);
    expect(reading.trickle).toEqual([]);
    expect(reading.following).toEqual([]);
  });
});

describe('the Religion sheet’s right pane, once a religion is founded', () => {
  it('prints the generated name and stops offering to found one', () => {
    const state = world();
    const religion = found(state, 0);
    const reading = religionReading(state, 0);
    expect(reading.religion?.name).toBe(religion.name);
    expect(reading.found).toBeNull();
    // The generated names all begin with an article (`religion.json`'s three
    // patterns), which is what the possessive in a toast has to strip.
    expect(religion.name.startsWith('the ')).toBe(true);
  });

  it('opens a house for each drawable pool, and says what fills an empty one', () => {
    const state = world();
    found(state, 0);
    const houses = religionReading(state, 0).houses;
    expect(houses.map((house) => house.pool)).toEqual(['follower', 'enhancer']);
    for (const house of houses) {
      expect(house.held).toEqual([]);
      expect(house.empty).toBe(house.slots);
      // A prophet's charge, and the node that opens the pool — named off the
      // data rather than written into the sentence.
      expect(house.fills).toContain("a prophet's charge");
      expect(house.fills).toContain(poolTechName(house.pool));
    }
  });

  it('shows a drafted belief in its own house', () => {
    const state = world();
    const religion = found(state, 0);
    religion.follower.push(FOLLOWER_BELIEF_IDS[0]!);
    religion.enhancer.push(ENHANCER_BELIEF_IDS[0]!);
    const houses = religionReading(state, 0).houses;
    expect(houses[0]!.held).toEqual([FOLLOWER_BELIEF_IDS[0]]);
    expect(houses[0]!.empty).toBe(houses[0]!.slots - 1);
    expect(houses[1]!.held).toEqual([ENHANCER_BELIEF_IDS[0]]);
  });

  it('lists a following city of its own and of a rival’s, ours first', () => {
    const state = world();
    const religion = found(state, 0);
    // Lagash is Crimson's and follows Azure's faith outright; Uruk is Azure's
    // own and is split, which is the case the count has to survive.
    state.cities[1]!.followers = { [religion.id]: state.cities[1]!.population };
    state.cities[0]!.population = 3;
    state.cities[0]!.followers = { [religion.id]: 1 };
    const following = religionReading(state, 0).following;
    // Named through `cityDisplayName`, so each keeps its own capital star.
    expect(following.map((town) => town.name)).toEqual(['Uruk ✶', 'Lagash ✶']);
    expect(following[0]!.ours).toBe(true);
    expect(following[1]!.ours).toBe(false);
    // A foreign town is named with whose it is, in that seat's own ink.
    expect(following[1]!.ownerName).toBe('Crimson');
    expect(following[1]!.ownerColor).toBe('#8f2a2a');
    // Population following, of the whole town.
    expect(following[1]!.following).toBe(state.cities[1]!.population);
    expect(following[1]!.population).toBe(state.cities[1]!.population);
    // And which of them actually flies the banner.
    expect(following[1]!.majority).toBe(true);
    expect(following[0]!.majority).toBe(false);
  });

  it('hands each town `explainPressure`’s own lines, this religion’s only', () => {
    const state = world();
    const religion = found(state, 0);
    const other = found(state, 1);
    state.cities[0]!.followers = { [religion.id]: 1 };
    // A holy site of Azure's beside Uruk, so there is a line to read.
    getTileAt(state.map, 4, 5)!.improvement = 'holySite';
    const town = religionReading(state, 0).following[0]!;
    expect(town.ledger.every((line) => line.religion === religion.id)).toBe(true);
    expect(town.ledger.some((line) => line.source === 'Holy site')).toBe(true);
    // And nothing of the rival's faith leaks into this seat's pane.
    expect(town.ledger.some((line) => line.religion === other.id)).toBe(false);
  });

  it('reads the founder’s trickle off the empire’s own banked lines', () => {
    const state = world();
    const religion = found(state, 0);
    // A foreign town that follows is what the trickle counts
    // (`followingForeign`), so this is the smallest world that pays anything.
    state.cities[1]!.followers = { [religion.id]: state.cities[1]!.population };
    const trickle = religionReading(state, 0).trickle;
    expect(trickle.length).toBeGreaterThan(0);
    // Every line is labelled with this faith and nobody else's, and every one of
    // them pays something — a zero line is a row the fold would have dropped.
    for (const line of trickle) {
      expect(line.source.startsWith(`Religion · ${religion.name}`)).toBe(true);
    }
    const faith = trickle.reduce((sum, line) => sum + line.faith, 0);
    expect(faith).toBeGreaterThan(0);
  });
});

describe('the pressure ledger a hover prints', () => {
  it('sums to the figure the bank receives', () => {
    const lines = [
      { religion: 0, source: 'Holy site', amount: 6 },
      { religion: 0, source: 'Road', amount: 4 },
      { religion: 0, source: 'Temple', amount: -5 },
    ];
    expect(pressureLedgerText(lines)).toBe(
      'Holy site +6 · Road +4 · Temple -5 — 5 a turn',
    );
  });

  it('says so plainly when nothing is pressing', () => {
    expect(pressureLedgerText([])).toBe('Nothing presses here.');
  });
});

// --- the prophet's sheet ----------------------------------------------------

describe('the prophet’s four ministries', () => {
  const rows = fn('controls.ts', 'prophetRows');

  it('greys each row with the reducer’s own gate and no other sentence', () => {
    // The whole contract of this sheet: an offered row is a command `commit`
    // will have taken, and a greyed one carries the sentence the reducer would
    // have refused with. A row whose blocker were composed here would be the
    // interface writing a second rulebook.
    for (const gate of [
      'plantHolySiteError(state, localPlayerId, unit.id)',
      'enhanceReligionError(state, localPlayerId, unit.id)',
      'proclaimError(state, localPlayerId, unit.id)',
      'redraftError(state, localPlayerId, unit.id, pool)',
    ]) {
      expect(`${gate}: ${rows.includes(gate)}`).toBe(`${gate}: true`);
    }
  });

  it('asks the seat’s own question in front of every one of them', () => {
    // `chopBlocker`'s split: this client's question first, the act's delegated
    // whole. Four rows, four `ended ??`.
    expect(rows.match(/ended \?\?/g) ?? []).toHaveLength(5);
  });

  it('is offered only to a prophet, and asked of the marker rather than the name', () => {
    expect(rows).toContain('!isProphet(unit)');
    expect(sourceOf('controls.ts')).not.toContain("'prophet'");
  });

  it('says the first planting founds the religion, and only while none exists', () => {
    // The verb is one verb and two acts (`plantHolySiteAt`), so the row is one
    // row whose sentence changes — two rows for one command would be the
    // interface inventing a verb.
    expect(rows).toContain('found your religion here');
    expect(rows).toContain('mine === undefined');
    expect((rows.match(/verb: 'plantHolySite'/g) ?? []).length).toBe(1);
  });

  it('names itself “Found religion” before there is one to plant a site for', () => {
    // The user only realised planting founds after asking (2026-08-28): a
    // prophet's first row read "Plant Holy Site" whether or not the empire
    // had a religion yet, and nothing on the sheet said the charge would
    // found one. The row's own name now carries that, not only its `says`
    // line — pinned as the exact strings a player reads.
    expect(rows).toContain("name: mine === undefined ? 'Found religion' : 'Plant holy site',");
  });

  it('gives Redraft one sub-row per pool, each with its own refusal', () => {
    expect(rows).toContain('RELIGION_BELIEF_POOLS.map');
    expect(rows).toContain('POOL_WORD[pool].name');
  });

  it('is the sim’s own refusal a prophet with no religion reads', () => {
    // Driven for real, so the sentences the rows carry are pinned as sentences
    // rather than only as call sites.
    const state = world();
    const prophet = createUnit(state, 0, 'prophet', 4, 4);
    expect(enhanceReligionError(state, 0, prophet.id)).toBe(
      'You have founded no religion to enhance',
    );
    expect(proclaimError(state, 0, prophet.id)).toBe('You have founded no religion to proclaim');
    expect(redraftError(state, 0, prophet.id, 'follower')).toBe(
      'You have founded no religion to redraft',
    );
    // And planting reaches the founding refusals, which is the design: all three
    // meet the player at the ground rather than in a gate nothing asks.
    expect(plantHolySiteError(state, 0, prophet.id)).toBe(
      'You have no gods to found a religion on',
    );
  });

  it('names the enhancer pool’s gate the same way the reducer refuses it', () => {
    // The one technology literal in `religionScreen.ts` (`ENHANCER_TECH`), read
    // back out of the sim's own sentence so a moved gate fails here rather than
    // quietly printing the wrong node in an empty house.
    const state = world();
    found(state, 0);
    const prophet = createUnit(state, 0, 'prophet', 4, 4);
    const refusal = enhanceReligionError(state, 0, prophet.id);
    expect(refusal).toBe(`Enhancing a religion needs ${poolTechName('enhancer')}`);
  });

  it('is the panel’s own list, drawn as rows and greyed with what it carries', () => {
    const sheet = fn('unitPanel.ts', 'actionsFor');
    expect(sheet).toContain('isProphet(unit)');
    expect(sheet).toContain('prophetRows()');
    expect(sheet).toContain('blocked: pool.blocked');
    expect(sheet).toContain('blocked: row.blocked');
    // And a prophet is excused the worker's six improvement rows and the axe:
    // `plantingHandOf` gives it the holy site and nothing else.
    expect(sheet).toContain('isBuilder(unit) && !person && !isProphet(unit)');
  });

  it('shows a prophet’s charges the way the augur’s rites are shown', () => {
    const sheet = sourceOf('unitPanel.ts');
    expect(sheet).toContain('const ministry = isProphet(unit);');
    expect(sheet).toContain("ministry ? 'Ministry' : 'Charges'");
  });
});

describe('the belief offer’s eyebrow', () => {
  it('says which of the three bags the cards came out of', () => {
    expect(beliefOfferEyebrow(undefined)).toContain('a god');
    expect(beliefOfferEyebrow('follower')).toContain('follower belief');
    expect(beliefOfferEyebrow('enhancer')).toContain('enhancer belief');
  });

  it('is what the offer card actually prints, rather than a literal in main.ts', () => {
    const main = sourceOf('main.ts');
    expect(main).toContain('eyebrow: beliefOfferEyebrow(offer.pool)');
    expect(main).not.toContain("eyebrow: 'a god · permanent");
  });

  it('reads a pooled pick back off the shelf it landed on', () => {
    // `settleBeliefChoice` puts a pooled pick on the religion and a god on the
    // pantheon; a chronicle line that only ever read the pantheon would say
    // nothing at all for two drafts in three.
    const main = sourceOf('main.ts');
    expect(main).toContain('mine?.follower.slice(-1)[0]');
    expect(main).toContain('mine?.enhancer');
  });
});

// --- the city sheet ---------------------------------------------------------

describe('the followers on a city sheet', () => {
  it('lists nothing at all in a world with no religion', () => {
    const state = world();
    expect(cityFaithRows(state, state.cities[0]!, 0)).toEqual([]);
  });

  it('counts the citizens who follow, of the whole town', () => {
    const state = world();
    const religion = found(state, 0);
    state.cities[0]!.population = 5;
    state.cities[0]!.followers = { [religion.id]: 3 };
    const rows = cityFaithRows(state, state.cities[0]!, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe(religion.name);
    expect(rows[0]!.following).toBe(3);
    expect(rows[0]!.population).toBe(5);
    // Three of five is more than half, which is the whole of "the town follows".
    expect(rows[0]!.majority).toBe(true);
  });

  it('marks no majority while the town is split', () => {
    const state = world();
    const mine = found(state, 0);
    const theirs = found(state, 1);
    state.cities[0]!.population = 4;
    state.cities[0]!.followers = { [mine.id]: 2, [theirs.id]: 2 };
    const rows = cityFaithRows(state, state.cities[0]!, 0);
    expect(rows.map((row) => row.majority)).toEqual([false, false]);
    // In founding order, which is an order the state carries.
    expect(rows.map((row) => row.religion)).toEqual([mine.id, theirs.id]);
  });

  it('names a foreign faith with whose it is, in that seat’s ink', () => {
    const state = world();
    const theirs = found(state, 1);
    state.cities[0]!.followers = { [theirs.id]: 1 };
    const row = cityFaithRows(state, state.cities[0]!, 0)[0]!;
    expect(row.ours).toBe(false);
    expect(row.founderName).toBe('Crimson');
    expect(row.founderColor).toBe('#8f2a2a');
  });

  it('shows a faith that is only pressing, before anybody has turned', () => {
    // The row that matters most: a player watching a rival's site work on their
    // capital, with nothing converted yet. A list that waited for a follower
    // would be a banner changing with no warning at all.
    const state = world();
    const theirs = found(state, 1);
    getTileAt(state.map, 4, 5)!.improvement = 'holySite';
    const rows = cityFaithRows(state, state.cities[0]!, 0);
    // Crimson's site stands on Azure's ground, so it presses for nobody; the
    // bank is what proves the union is three-way rather than only followers.
    state.cities[0]!.pressureBank = { [theirs.id]: 4 };
    const banked = cityFaithRows(state, state.cities[0]!, 0);
    expect(rows.length).toBeGreaterThanOrEqual(0);
    expect(banked).toHaveLength(1);
    expect(banked[0]!.banked).toBe(4);
    expect(banked[0]!.perConvert).toBe(
      Math.max(1, Math.floor(RULES.religion.pressurePerConvert)),
    );
  });

  it('is drawn under the citizens’ row and hovered with the ledger', () => {
    const panel = sourceOf('cityPanel.ts');
    expect(panel).toContain('renderFollowers(city)');
    expect(panel).toContain('pressureLedgerText(row.ledger)');
    expect(panel).toContain('unconvertedCitizens(city)');
    // Order in the source is order in the DOM here: every one of these is an
    // `append` onto the container built above it.
    const render = fn('cityPanel.ts', 'render');
    expect(render.indexOf('renderFollowers(city)')).toBeGreaterThan(
      render.indexOf('renderCitizenFocus(city)'),
    );
    expect(render.indexOf('renderFollowers(city)')).toBeLessThan(
      render.indexOf('renderGrowth(city)'),
    );
  });
});

// --- the toasts -------------------------------------------------------------

describe('what a seat is told about a faith', () => {
  it('says nothing about a world it has just sat down in', () => {
    // The seat-switch rule: a chair a player takes has not just *discovered* that
    // a rival founded a religion forty turns ago.
    const state = world();
    found(state, 1);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('announces your own founding in the first person', () => {
    const state = world();
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    const religion = found(state, 0);
    expect(watcher.poll(state, 0).map((news) => news.text)).toEqual([
      `You founded ${religion.name}`,
    ]);
  });

  it('announces a rival’s founding by name, because a religion is public', () => {
    const state = world();
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    const religion = found(state, 1);
    expect(watcher.poll(state, 0).map((news) => news.text)).toEqual([
      `Crimson founded ${religion.name}`,
    ]);
  });

  it('announces a founding exactly once, however often it is polled', () => {
    const state = world();
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    found(state, 0);
    expect(watcher.poll(state, 0)).toHaveLength(1);
    expect(watcher.poll(state, 0)).toEqual([]);
  });

  it('announces one of your towns changing its banner, and names the faith', () => {
    const state = world();
    const religion = found(state, 0);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    state.cities[0]!.population = 3;
    state.cities[0]!.followers = { [religion.id]: 2 };
    const news = watcher.poll(state, 0);
    expect(news.map((one) => one.text)).toEqual([`Uruk now follows ${religion.name}`]);
    expect(news[0]!.kind).toBe('converted');
    expect(news[0]!.cell).toEqual({ col: 4, row: 4 });
  });

  it('names the rival when the faith a town of yours took is theirs', () => {
    const state = world();
    const theirs = found(state, 1);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    state.cities[0]!.population = 3;
    state.cities[0]!.followers = { [theirs.id]: 2 };
    // The article is what the possessive strips: "Crimson's the Way of the Reed"
    // is not English.
    expect(watcher.poll(state, 0)[0]!.text).toBe(
      `Uruk now follows Crimson's ${theirs.name.replace(/^the /, '')}`,
    );
  });

  it('says nothing about a rival’s town changing hands of faith', () => {
    const state = world();
    const religion = found(state, 0);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    state.cities[1]!.population = 3;
    state.cities[1]!.followers = { [religion.id]: 2 };
    // It is news that they *follow* — which the Religion sheet lists — but not a
    // toast: a seat is told about its own towns.
    expect(watcher.poll(state, 0).filter((one) => one.kind === 'converted')).toEqual([]);
  });

  it('announces a town turning **again**, because a re-conversion is real news', () => {
    // The reason conversions are a snapshot rather than a told-set: a told-set
    // would announce the Hearth Cult once and stay silent the turn a rival took
    // the town and the turn it came back.
    const state = world();
    const mine = found(state, 0);
    const theirs = found(state, 1);
    state.cities[0]!.population = 3;
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    state.cities[0]!.followers = { [mine.id]: 2 };
    expect(watcher.poll(state, 0)).toHaveLength(1);
    state.cities[0]!.followers = { [theirs.id]: 2 };
    expect(watcher.poll(state, 0)).toHaveLength(1);
    state.cities[0]!.followers = { [mine.id]: 2 };
    expect(watcher.poll(state, 0).map((one) => one.text)).toEqual([
      `Uruk now follows ${mine.name}`,
    ]);
  });

  it('announces a proclamation of your own, with the hex to fly to', () => {
    const state = world();
    const religion = found(state, 0);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    religion.pulses.push({
      col: 6,
      row: 6,
      strength: 12,
      range: 10,
      startTurn: state.turn,
      expiresTurn: state.turn + 10,
    });
    const news = watcher.poll(state, 0);
    expect(news[0]!.kind).toBe('proclaimed');
    expect(news[0]!.text).toBe(`Your prophet proclaims ${religion.name} here`);
    expect(news[0]!.cell).toEqual({ col: 6, row: 6 });
  });

  it('keeps a rival’s proclamation to hexes the seat can actually see', () => {
    // The camp's rule: a proclamation is an occupation of a hex, and remembered
    // ground says nothing about whether anybody is still preaching on it.
    const state = world();
    const theirs = found(state, 1);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    theirs.pulses.push({
      col: 14,
      row: 10,
      strength: 12,
      range: 10,
      startTurn: state.turn,
      expiresTurn: state.turn + 10,
    });
    expect(watcher.poll(state, 0).filter((one) => one.kind === 'proclaimed')).toEqual([]);
  });

  it('announces an enhancement, and names the belief when it is yours', () => {
    const state = world();
    const religion = found(state, 0);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    religion.enhancer.push(ENHANCER_BELIEF_IDS[0]!);
    const news = watcher.poll(state, 0);
    expect(news[0]!.kind).toBe('enhanced');
    expect(news[0]!.text.startsWith(`${religion.name} is enhanced — `)).toBe(true);
  });

  it('announces a rival’s enhancement without naming their card', () => {
    const state = world();
    const theirs = found(state, 1);
    const watcher = createReligionWatcher();
    watcher.baseline(state, 0);
    theirs.enhancer.push(ENHANCER_BELIEF_IDS[0]!);
    expect(watcher.poll(state, 0)[0]!.text).toBe(
      `Crimson enhanced ${theirs.name.replace(/^the /, '')}`,
    );
  });

  it('is polled from the one funnel every accepted command goes through', () => {
    const commit = fn('controls.ts', 'commit');
    expect(commit).toContain('reportReligion()');
    // Beside the sighting poll, and inside the `result.ok` guard: a refused
    // command left the state byte-identical, so there is nothing to report.
    expect(commit.indexOf('reportReligion()')).toBeGreaterThan(commit.indexOf('if (result.ok)'));
    const controls = sourceOf('controls.ts');
    expect(controls).toContain('religionNews.baseline(getGame().state, localPlayerId)');
    expect(controls).toContain('religionNews.reset()');
  });
});

// --- the Compendium ---------------------------------------------------------

describe('the Compendium’s religion rows', () => {
  const BOOK = compendiumSections();
  const shelf = (id: string): { id: string; entries: { id: string }[] } =>
    BOOK.find((section) => section.id === id)!;
  const entry = (id: string) => BOOK.flatMap((s) => s.entries).find((e) => e.id === id);

  it('carries the prophet, the holy site, The High Temple and The Preaching', () => {
    // All four come off the tables the shelves are generated from, so what is
    // pinned is that the rows are *reachable* at their stable addresses — the
    // ids the rest of the interface will link with.
    expect(entry('unit:prophet')).toBeDefined();
    expect(entry('improvement:holySite')).toBeDefined();
    expect(entry('tech:theHighTemple')).toBeDefined();
    expect(shelf('rite').entries.some((row) => row.id.endsWith(':thePreaching'))).toBe(true);
  });

  it('says what a prophet’s charges do, and never that they dig', () => {
    const clauses = entry('unit:prophet')!.clauses.map((clause) => clause.text);
    expect(clauses.some((text) => text.includes('holy site'))).toBe(true);
    expect(clauses.some((text) => text.includes('founds your religion'))).toBe(true);
    // The worker's sentence would otherwise fire on a piece with charges and no
    // other marker.
    expect(clauses.some((text) => text.includes('work charge'))).toBe(false);
  });

  it('says a holy site is planted by a prophet, not by a great person', () => {
    const clauses = entry('improvement:holySite')!.clauses.map((clause) => clause.text);
    expect(clauses.some((text) => text.includes('Only a prophet can plant this'))).toBe(true);
    expect(clauses.some((text) => text.includes('great person'))).toBe(false);
  });

  it('shelves all three belief pools, each under its own eyebrow', () => {
    const beliefs = shelf('belief').entries.filter((row) => row.id !== 'belief:about');
    expect(beliefs).toHaveLength(ALL_BELIEF_IDS.length);
    for (const row of beliefs) {
      const id = row.id.split(':')[1]! as (typeof ALL_BELIEF_IDS)[number];
      const pool = beliefPoolOf(id);
      const card = entry(row.id)!;
      // The 2026-08-28 ruling, printed: a follower belief is city-local and an
      // enhancer is what pays the holy city.
      if (pool === 'follower') expect(card.eyebrow).toContain('every city that follows');
      else if (pool === 'enhancer') expect(card.eyebrow).toContain('enhancer belief');
      else expect(card.eyebrow).toContain('a god');
    }
  });

  it('keeps a deferred half struck through rather than claimed', () => {
    // Five follower rows ship deferred (`docs/religion-v2.md`); `describeCard`
    // is what marks them, and the shelf only has to carry the flag through.
    const deferred = shelf('belief')
      .entries.flatMap((row) => entry(row.id)!.clauses)
      .filter((clause) => clause.deferred === true);
    expect(deferred.length).toBeGreaterThan(0);
  });
});

describe('the Faith concept’s prose', () => {
  const faith = CONCEPT_ENTRIES.find((entry) => entry.id === 'concept:religion')!;
  const prose = faith.clauses.map((clause) => clause.text);

  it('no longer says prophets and religions are unbuilt', () => {
    // The stale sentence this pass exists to delete.
    expect(prose.join(' ')).not.toContain('not yet built');
  });

  it('says what a religion is, how it spreads, and what the founder gets', () => {
    const all = prose.join(' ');
    expect(all).toContain('A religion is a faith of your own');
    expect(all).toContain('spreads to people, not to places');
    expect(all).toContain('more than half its citizens');
    expect(all).toContain('follower belief');
    expect(all).toContain('enhancer belief');
  });

  it('names all four of a prophet’s charges', () => {
    const all = prose.join(' ');
    for (const act of ['plants a holy site', 'draws a belief', 'proclaims', 'gives a pool']) {
      expect(`${act}: ${all.includes(act)}`).toBe(`${act}: true`);
    }
  });

  it('puts Details last, and nowhere else', () => {
    const marked = prose.map((text) => text.startsWith('Details:'));
    expect(marked.filter(Boolean)).toHaveLength(1);
    expect(marked[marked.length - 1]).toBe(true);
  });

  it('has no digit anywhere in it', () => {
    // The written shelves' rule: a figure in prose is a figure that goes stale.
    for (const text of [faith.name, faith.eyebrow, ...prose]) {
      expect(`${text}: ${/\d/.test(text)}`).toBe(`${text}: false`);
    }
  });
});

// --- the faith lens ---------------------------------------------------------

describe('the faith lens', () => {
  it('is a row of the one list the lens menu and the digit keys both read', () => {
    const main = sourceOf('main.ts');
    // A `LensOption` record rather than the tuple the rack started with — the
    // row carries a legend (see `LENS_OPTIONS`), and `lensOrder` still reads its
    // `mode` so the digit hotkeys have one source of order.
    expect(main).toContain("mode: 'faith',");
    expect(main).toContain("label: 'Faith',");
    expect(main).toContain('lensOrder: LENS_OPTIONS.map((option) => option.mode)');
  });

  /**
   * **Superseded, and deliberately rewritten rather than deleted.** This used to
   * assert that nothing raised the faith lens: the other two modes were
   * questions a *piece* asked and faith was a question the world asked, so it
   * was reachable from the menu alone. The 2026-08-28 ruling reversed that half
   * — a prophet and an augur each raise it, because carrying one *is* the asking
   * — and `lensForSelection` is where the whole precedence table now lives
   * (pinned in `faithLens.test.ts`).
   *
   * What survives is the other half, and it is the one this file still holds:
   * a **manual** faith lens beats every piece rule, and it beats them *first*.
   */
  it('is never taken away by picking a piece up, once the player has chosen it', () => {
    const lens = fn('controls.ts', 'lensForSelection');
    expect(lens).toContain("manual === 'faith'");
    expect(lens.indexOf("manual === 'faith'")).toBeLessThan(lens.indexOf('def.foundsCity'));
    // And `effectiveLens` asks that one function rather than keeping a second
    // copy of the ladder.
    expect(fn('controls.ts', 'effectiveLens')).toContain('lensForSelection(def, manualLens)');
  });

  it('is raised by the two religious pieces, off their markers and not their names', () => {
    const lens = fn('controls.ts', 'lensForSelection');
    expect(lens).toContain("def.prophesies === true || def.consecrates === true");
    expect(lens).not.toContain("'prophet'");
    expect(lens).not.toContain("'augur'");
  });
});

describe('the pool words the two screens share', () => {
  it('is one table, read by the sheet and by the prophet’s Redraft rows', () => {
    expect(POOL_WORD.follower.name).toBe('follower belief');
    expect(POOL_WORD.enhancer.name).toBe('enhancer belief');
    expect(sourceOf('controls.ts')).toContain("import { POOL_WORD } from './religionScreen'");
  });
});
