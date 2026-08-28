/**
 * The interface's half of great people, renown and Triumphs
 * (`docs/great-people.md`): the HUD figure, the checklist, the blocker, the
 * offer's tier accent, the unit sheet's two verbs and the news.
 *
 * Two kinds of test, and the split is the one this suite always makes. The
 * *decision* — is this seat blocked, and by what — is a fold over the state and
 * is driven for real. Everything else lives in browser-only code (`topBar.ts`
 * builds DOM, `main.ts` composes an offer card, `unitPanel.ts` renders a sheet)
 * and there is no jsdom here, so those are asserted by **reading the source**,
 * the way `seatRoster.test.ts` and `cities.test.ts` do.
 *
 * That is not a weaker test for what it covers. The failure mode of every one of
 * these is a surface that quietly asks the *wrong function*: a figure composed
 * by hand instead of through `poolFigure`, a checklist that lists the rows
 * somebody remembered instead of the table, a greyed button whose sentence is
 * not the reducer's. None of those is visible in a rendered output — they are
 * visible in which name the file imported.
 */

import { describe, expect, it } from 'vitest';

import { drawGreatPersonOffer } from '../../src/sim/greatPeople';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameState, newGame } from '../../src/sim/state';
import { TRIUMPH_IDS, triumphDef } from '../../src/sim/triumphData';
import { poolFigure } from '../../src/ui/figures';
import { firstBlocker } from '../../src/ui/turnBlockers';

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

/** The stylesheet, for the classes the surfaces above set. */
const STYLE = Object.values(
  import.meta.glob('../../src/style.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0] ?? '';

/** One file's source with its comments taken out. `seatRoster.test.ts`'s. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceOf(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(SOURCE[key!]!);
}

/** A two-seat board, which is every test below's starting point. */
function twoSeats(): GameState {
  return newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
}

describe('the renown figure', () => {
  it('is `poolFigure` with a rung on it — pool over threshold, rate in parens', () => {
    expect(poolFigure(24, 3, 40)).toBe('24/40 (+3)');
    expect(poolFigure(0, 0, 40)).toBe('0/40 (0)');
    // The rung is optional and its absence is byte-identical to what the two
    // banked yields have always printed: gold and faith did not change.
    expect(poolFigure(132, 4)).toBe('132 (+4)');
  });

  it('is composed by the top bar through that one function, never by hand', () => {
    const source = sourceOf('topBar.ts');
    expect(source).toContain('poolFigure(player.renownPool');
    expect(source).toContain('renownThreshold(player)');
    expect(source).toContain('renownPerTurn(state, playerId)');
    // The failure this pins: a chip that added its own `/` and its own parens
    // would drift from gold's the first time either was touched.
    expect(source).not.toMatch(/renownPool\s*\}\s*\/\s*\$\{/);
  });
});

describe("the renown hover's Triumph checklist", () => {
  it('walks the whole table rather than a list somebody remembered', () => {
    const source = sourceOf('topBar.ts');
    expect(source).toContain('for (const id of TRIUMPH_IDS)');
    // Name, what it pays and how often — the three things the row prints.
    expect(source).toContain('TRIUMPH_SCOPE_WORD[def.scope]');
    expect(source).toContain('signedFigure(def.pays)');
  });

  it('has a word for every scope the table can name', () => {
    const source = sourceOf('topBar.ts');
    for (const scope of new Set(TRIUMPH_IDS.map((id) => triumphDef(id).scope))) {
      expect(source).toContain(`${scope}:`);
    }
  });

  it('greys the earned and the unbuilt differently, and both are reachable', () => {
    const source = sourceOf('topBar.ts');
    expect(source).toContain("row.classList.add('is-unbuilt')");
    expect(source).toContain("row.classList.add('is-earned')");
    // Both states exist in the shipped table, so neither branch is dead code.
    const deferred = TRIUMPH_IDS.filter((id) => triumphDef(id).deferred !== undefined);
    const live = TRIUMPH_IDS.filter((id) => triumphDef(id).deferred === undefined);
    expect(deferred.length).toBeGreaterThan(0);
    expect(live.length).toBeGreaterThan(0);
  });

  it('is styled — both greyings have a rule, or the checklist reads as one list', () => {
    // The other half of the class assertion above: a class the stylesheet has
    // never heard of is a class that does nothing, and the two greyings are
    // *different* on purpose (struck through says "you had it"; faint and
    // italic says "the game has not built it").
    expect(STYLE).toContain('.renown-triumphs .meter-line.is-earned');
    expect(STYLE).toContain('.renown-triumphs .meter-line.is-unbuilt');
    expect(STYLE).toContain('.offer-clause.is-deferred');
    expect(STYLE).toContain('.offer-footnote');
    expect(STYLE).toContain('.unit-epigram');
  });
});

describe('the great-person blocker', () => {
  it('stops End Turn once a name is on offer, and names itself', () => {
    const state = twoSeats();
    const player = state.players[0]!;
    expect(firstBlocker(state, 0)?.kind).not.toBe('greatPerson');
    player.greatPersonOffer = drawGreatPersonOffer(state, player);
    expect(player.greatPersonOffer.options.length).toBeGreaterThan(0);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'greatPerson' });
  });

  it('does not block on an empty offer — a spent roster is not a decision', () => {
    const state = twoSeats();
    state.players[0]!.greatPersonOffer = { options: [] };
    expect(firstBlocker(state, 0)?.kind).not.toBe('greatPerson');
  });

  it('is answered by an action kind the interface handles and a label it prints', () => {
    const controls = sourceOf('controls.ts');
    expect(controls).toContain("case 'greatPerson': {");
    expect(controls).toContain('onOfferGreatPerson?.();');
    expect(controls).toContain("entry.action = { kind: 'openGreatPerson' };");

    const main = sourceOf('main.ts');
    // `runAction` is exhaustive against a `never`, so an unhandled kind would
    // not compile — this pins that the arm actually opens the card rather than
    // being satisfied with a no-op.
    expect(main).toContain("case 'openGreatPerson':");
    expect(main).toContain('showGreatPersonOffer();');
    // And the End Turn button has a word for it.
    expect(main).toMatch(/greatPerson: '[^']+',/);
  });
});

describe('the great-person offer card', () => {
  it('is a tarot face carrying the tier as its accent', () => {
    const main = sourceOf('main.ts');
    // The accent is the tier and the emblem is the family — the two are
    // different questions and the card answers both.
    expect(main).toContain('line: TIER_ACCENT[def.tier]');
    expect(main).toContain('emblem: cardLineMarkUrl(FAMILY_EMBLEM[def.family])');
    // An emblem is what makes `offerCard.ts` deal a tarot face at all.
    expect(sourceOf('offerCard.ts')).toContain("option.emblem !== undefined");
  });

  it('names an accent for every tier the roster uses', () => {
    const main = sourceOf('main.ts');
    for (const tier of new Set(GREAT_PERSON_IDS.map((id) => greatPersonDef(id).tier))) {
      expect(main).toMatch(new RegExp(`${tier}: '[a-z]+',`));
    }
  });

  it('prints the clauses as a list, so a deferred half can be struck through', () => {
    const main = sourceOf('main.ts');
    expect(main).toContain('notes: describeCard(id).map');
    expect(main).toContain('deferred: true');
    const card = sourceOf('offerCard.ts');
    expect(card).toContain("clause.deferred ? 'offer-clause is-deferred' : 'offer-clause'");
    // The kernel, under the epigram and quieter than it.
    expect(main).toContain('footnote: def.kernel');
    expect(card).toContain("element('span', 'offer-footnote', option.footnote)");
  });

  it('dispatches by index, never by id — the offer doctrine', () => {
    const main = sourceOf('main.ts');
    expect(main).toContain("type: 'chooseGreatPerson', playerId: seat, optionIndex: index");
  });
});

describe("the unit sheet's two verbs", () => {
  it('greys each through the reducer’s own error function', () => {
    const controls = sourceOf('controls.ts');
    expect(controls).toContain('greatPersonActError(state, localPlayerId, unit.id)');
    expect(controls).toContain('greatPersonWorkError(state, localPlayerId, unit.id)');
    const panel = sourceOf('unitPanel.ts');
    expect(panel).toContain('blocked: person.act.blocked');
    expect(panel).toContain('blocked: person.work.blocked');
    // Two words and no more — the simulation names no verb per family, and the
    // sheet does not invent five.
    expect(panel).toContain("label: 'Act'");
    expect(panel).toContain("label: 'Work'");
  });

  it('names the town an act pays into, from the same function the act uses', () => {
    const controls = sourceOf('controls.ts');
    expect(controls).toContain('actCityFor(state, unit)');
    // The figures are the rules', not the panel's.
    expect(controls).toContain('RULES.greatPeople');
  });

  it('carries the legacy on both hovers — it attaches whichever verb is taken', () => {
    const panel = sourceOf('unitPanel.ts');
    expect(panel).toContain('for (const clause of view.legacy)');
    expect(panel).toContain('title: verbTitle(person, person.act');
    expect(panel).toContain('title: verbTitle(person, person.work');
  });

  it('shows the person rather than the piece type in the header', () => {
    const panel = sourceOf('unitPanel.ts');
    expect(panel).toContain('person ? person.name : def.name');
    // The epigram is *labelled* flavour since the copy pass (2026-08-28), for
    // the Compendium's reason: the Act and Work rows below it are two exact
    // promises, and an unlabelled sentence above them reads as a third.
    expect(panel).toContain("element('p', 'unit-epigram')");
    expect(panel).toContain("element('span', 'flavor-label', 'Flavour')");
    expect(panel).toContain('document.createTextNode(person.epigram)');
  });
});

describe('the news', () => {
  it('announces a Triumph off the reducer’s report, on both result paths', () => {
    const controls = sourceOf('controls.ts');
    // One funnel: `commit` runs it for every accepted command, and `endTurn`'s
    // own result carries `TurnReport.triumphs` — so a triumph earned inside a
    // command and one earned during a resolution reach the same line.
    expect(controls).toContain('function reportTriumphs(result: CommandResult)');
    expect(controls).toContain('reportTriumphs(result);');
    expect(controls).toContain('result.triumphs');
    expect(controls).toMatch(/Triumph — \$\{triumph\.name\}/);
    // Filtered by seat, unlike a wonder: a triumph is one empire's claim.
    expect(controls).toContain('triumph.playerId !== localPlayerId');
  });

  it('announces the recruit in the sim’s plain voice, with a pan to the piece', () => {
    const main = sourceOf('main.ts');
    expect(main).toMatch(/\$\{def\.name\} has been recruited/);
    expect(main).toContain('personOf(unit) === id');
    expect(main).toContain('cell: { col: piece.col, row: piece.row }');
  });

  it('announces what an act or a work did, and the legacy that stays', () => {
    const controls = sourceOf('controls.ts');
    expect(controls).toMatch(/\$\{view\.name\} — \$\{said\}/);
    expect(controls).toMatch(/legacy stands with your government/);
  });

  it('says once, on the rising edge, that a name is waiting', () => {
    const controls = sourceOf('controls.ts');
    expect(controls).toContain('function checkGreatPersonOffer()');
    expect(controls).toContain('hasGreatPersonOffer(player)');
    expect(controls).toContain('greatPersonOfferOutstanding = waiting;');
    expect(controls).toContain('checkGreatPersonOffer();');
  });
});
