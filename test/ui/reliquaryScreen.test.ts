/**
 * The Reliquary — the honored dead, and what they still pay.
 *
 * `docs/history/doctrine-ideas.md`, "The Reliquary is a SCREEN" (2026-09-03). Two kinds
 * of test, and the split is the one this suite always makes (`greatPeople.test.ts`
 * says why): the **roll** — who is in the pile, in what order, and what each card
 * says — is a fold over the state and is driven for real; the *drawing* lives in
 * browser-only code and there is no jsdom here, so it is asserted by reading the
 * source and the stylesheet.
 *
 * What the source half is guarding is not cosmetic. A screen that stopped asking
 * `explainCardImpact` and composed a figure beside it, a card face that stopped
 * being the offer card's own, a `keydown` that was never unbound between games,
 * a sheet that quietly grew its own capped-overlay block — every one of those
 * renders perfectly and is wrong.
 */

import { describe, expect, it } from 'vitest';

import {
  FAMILY_PLURAL,
  RELIQUARY_EMPTY,
  REVOKED_BAND,
  reliquaryCalls,
  reliquaryCount,
  reliquaryFamilies,
  reliquaryFamilyCount,
  reliquaryFan,
  reliquaryOfFamily,
  reliquaryRoll,
  reliquaryStamped,
  reliquaryStep,
  reliquarySubtitle,
} from '../../src/ui/reliquaryScreen';
import {
  greatPersonOfferBank,
  greatPersonOfferPrice,
  greatPersonPurchaseError,
} from '../../src/sim/greatPeople';
import { YIELD_GLYPH } from '../../src/ui/figures';
import {
  FAMILY_EMBLEM,
  FOREVER,
  TIER_ACCENT,
  TIER_MARK,
  deedFootnote,
  greatPersonCard,
  greatPersonFace,
  legacyHeadline,
  legacyIsSilent,
} from '../../src/ui/greatPersonFace';
import { FAMILIES, GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameState, bumpRevision } from '../../src/sim/state';
import { newGame } from '../sim/newGameHelpers';

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
  ...(import.meta.glob('../../index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

const STYLE = Object.values(
  import.meta.glob('../../src/style.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0] ?? '';

function raw(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return SOURCE[key!]!;
}

/** One file's source with its comments taken out — the prose explains the rules. */
function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function twoSeats(): GameState {
  return newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
}

/** Three spent people on seat 0, the middle one struck. Spend order, oldest first. */
function withLegacies(): GameState {
  const state = twoSeats();
  state.players[0]!.legacies = [
    { id: 'imhotep', age: 2 },
    { id: 'ahmes', age: 2, revoked: true },
    { id: 'kidinnu', age: 3 },
  ];
  bumpRevision(state);
  return state;
}

// --- the full sheet: families, fan and line (batch SS3) ----------------------

describe('the families rail', () => {
  it('lists the families that have cards, the most first, then the ones with none', () => {
    const roll = reliquaryRoll(withLegacies(), 0);
    const rows = reliquaryFamilies(roll);
    // Every family once, so a family with no card still has its dashed row.
    expect(rows.map((row) => row.family).sort()).toEqual([...FAMILIES].sort());
    const counts = rows.map((row) => row.count);
    const held = counts.filter((count) => count > 0);
    expect(held.reduce((a, b) => a + b, 0)).toBe(roll.length);
    // The held ones come first, the most first; the empty ones after, in the
    // roster's own order.
    expect(counts.slice(0, held.length)).toEqual([...held].sort((a, b) => b - a));
    const empty = rows.slice(held.length).map((row) => row.family);
    expect(empty).toEqual(FAMILIES.filter((family) => empty.includes(family)));
    for (const row of rows) expect(row.label).toBe(FAMILY_PLURAL[row.family]);
  });

  it('shows one family’s cards, or the whole deck for no family', () => {
    const roll = reliquaryRoll(withLegacies(), 0);
    expect(reliquaryOfFamily(roll, null)).toEqual(roll);
    const family = roll[0]!.face.family;
    const one = reliquaryOfFamily(roll, family);
    expect(one.length).toBeGreaterThan(0);
    expect(one.every((card) => card.face.family === family)).toBe(true);
    expect(reliquaryFamilyCount(0, one.length, family)).toBe(
      `1 of ${one.length} · ${FAMILY_PLURAL[family].toLowerCase()}`,
    );
  });
});

describe('the fan and the line beside the title', () => {
  it('fans the cards under the top one, in the order the arrows turn them up', () => {
    const roll = reliquaryRoll(withLegacies(), 0);
    expect(reliquaryFan(roll, 0, 5).map((row) => row.index)).toEqual([1, 2]);
    expect(reliquaryFan(roll, 1, 5).map((row) => row.index)).toEqual([2, 0]);
    expect(reliquaryFan(roll, 0, 1).map((row) => row.index)).toEqual([1]);
    // A deck of one has nothing under it, and an empty deck nothing at all.
    expect(reliquaryFan(roll.slice(0, 1), 0, 5)).toEqual([]);
    expect(reliquaryFan([], 0, 5)).toEqual([]);
  });

  it('names the seat and counts the legacies still in force, in words', () => {
    const roll = reliquaryRoll(withLegacies(), 0);
    // Three cards, one struck: two in force.
    expect(reliquarySubtitle('Mansa Musa', roll)).toBe('Mansa Musa · two legacies in force');
    expect(reliquarySubtitle('Mansa Musa', roll.slice(0, 1))).toBe('Mansa Musa · one legacy in force');
    expect(reliquarySubtitle('Mansa Musa', [])).toBe('Mansa Musa · no one called yet');
    expect(reliquarySubtitle('Mansa Musa', [roll[1]!])).toBe('Mansa Musa · no legacy in force');
  });
});

describe('the families rail’s marks and the screen it sits on', () => {
  const SCREEN = source('reliquaryScreen.ts');

  it('marks each family with the game’s own family emblem, Generals and Engineers included', () => {
    expect(SCREEN).toContain("cardLineMarkUrl(FAMILY_EMBLEM[which])");
    for (const family of FAMILIES) expect(FAMILY_EMBLEM[family]).toBeTruthy();
  });

  it('is the ninth sheet’s furniture: the modal shell, the cap rule, and the one close', () => {
    expect(SCREEN).toContain('const shell = createModalShell({');
    const html = raw('index.html');
    const sheet = html.slice(html.indexOf('id="reliquary-overlay"'), html.indexOf('id="reliquary-body"'));
    expect(sheet).toContain('class="statecraft-overlay"');
    expect(sheet).toContain('class="rel-subtitle"');
    expect(sheet).toContain('id="reliquary-close"');
  });
});

// --- the roll ---------------------------------------------------------------

describe('the roll', () => {
  it('is newest first — the person just spent is the card the player came for', () => {
    const roll = reliquaryRoll(withLegacies(), 0);
    expect(roll.map((card) => card.face.id)).toEqual(['kidinnu', 'ahmes', 'imhotep']);
  });

  it('keeps a revoked record in the pile, marked — history, never deletion', () => {
    // The ruling (`LegacyRecord.revoked`, `state.ts`): the record stays in spend
    // order and only `liveEffects` stops reading it. A card the player cannot
    // find any more is a card they will believe is still paying.
    const roll = reliquaryRoll(withLegacies(), 0);
    expect(roll.map((card) => card.revoked)).toEqual([false, true, false]);
    // And the record's own age stamp rides along, never re-derived.
    expect(roll.map((card) => card.age)).toEqual([3, 2, 2]);
  });

  it('is empty for an empire that has spent nobody, and for a seat that is not there', () => {
    expect(reliquaryRoll(twoSeats(), 0)).toEqual([]);
    expect(reliquaryRoll(twoSeats(), 99)).toEqual([]);
  });

  it('skips a name no roster knows — a hand-edited save, not a crash', () => {
    const state = twoSeats();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.players[0]!.legacies = [{ id: 'nobody' as any, age: 2 }, { id: 'imhotep', age: 2 }];
    bumpRevision(state);
    expect(reliquaryRoll(state, 0).map((card) => card.face.id)).toEqual(['imhotep']);
  });

  it('reads every card off the sim, never off a copy the screen keeps', () => {
    const state = withLegacies();
    const [top] = reliquaryRoll(state, 0);
    const def = greatPersonDef('kidinnu');
    expect(top!.face.name).toBe(def.name);
    expect(top!.face.flavor).toBe(def.epigram);
    expect(top!.face.tier).toBe(def.tier);
    expect(top!.face.line).toBe(TIER_ACCENT[def.tier]);
    expect(top!.face.tierMark).toBe(TIER_MARK[def.tier]);
    expect(top!.face.emblem).toContain('url(');
  });
});

// --- the count line and the arrows ------------------------------------------

describe('the pile', () => {
  it('counts as the mock does — one-based, with what the pile is', () => {
    expect(reliquaryCount(0, 3)).toBe('1 of 3 · the legacies in force');
    expect(reliquaryCount(2, 3)).toBe('3 of 3 · the legacies in force');
    // Out of range is clamped rather than printed: a "4 of 3" is a bug on screen.
    expect(reliquaryCount(9, 3)).toBe('3 of 3 · the legacies in force');
    expect(reliquaryCount(0, 0)).toBe('');
  });

  it('wraps at both ends — a pile has no first card and no last', () => {
    expect(reliquaryStep(0, 3, -1)).toBe(2);
    expect(reliquaryStep(2, 3, 1)).toBe(0);
    expect(reliquaryStep(1, 3, 1)).toBe(2);
    expect(reliquaryStep(0, 0, 1)).toBe(0);
  });
});

// --- what a card says -------------------------------------------------------

describe('the legacy is the headline', () => {
  it('puts the forever word on the first live clause and on no other', () => {
    const said = legacyHeadline([{ text: 'A' }, { text: 'B' }]);
    expect(said.map((clause) => clause.text)).toEqual([`${FOREVER} A`, 'B']);
  });

  it('never claims a deferred half — a promise not made is not forever', () => {
    const said = legacyHeadline([{ text: 'not built', deferred: true }, { text: 'A' }]);
    expect(said[0]).toEqual({ text: 'not built', deferred: true });
    expect(said[1]!.text).toBe(`${FOREVER} A`);
  });

  it('calls a legacy silent when nothing on it is built', () => {
    expect(legacyIsSilent([])).toBe(true);
    expect(legacyIsSilent([{ text: 'x', deferred: true }])).toBe(true);
    expect(legacyIsSilent([{ text: 'x' }])).toBe(false);
    // Every person has a standing effect, a one-time grant or a description of a missing rule.
    for (const id of GREAT_PERSON_IDS) {
      const def = greatPersonDef(id);
      expect(def.legacy.length + Number(def.onSpend !== undefined) + (def.deferred ?? []).length, id).toBeGreaterThan(0);
    }
  });

  it('says what the charge was spent on without inventing which verb was taken', () => {
    // Nothing in the state records the verb (either one spends the piece and
    // leaves the same legacy), so the footnote names the family's two — and
    // since the user's ruling of 2026-09-09 it names them in the family's own
    // words, off the same data row the unit sheet's two buttons read.
    expect(deedFootnote('scholar')).toBe(
      'Spent as a scholar: Write a Treatise, or Found an Academy.',
    );
    expect(deedFootnote('general')).toBe('Spent as a general: Rally the Army, or Raise a Citadel.');
    // The Platonic Academy (batch DT16): the work is the Academy, and the act stays the family's.
    expect(deedFootnote('general', 'scholar')).toBe('Spent as a general: Rally the Army, or Found an Academy.');
    // Never the mark: this file composes clauses and prints none, so it takes
    // the unmarked reading rather than reaching for a printer.
    for (const family of Object.keys(FAMILY_EMBLEM) as (keyof typeof FAMILY_EMBLEM)[]) {
      expect(deedFootnote(family), family).not.toContain('[[');
    }
    // And it carries no figure — rule 7: numbers never appear in written prose.
    for (const family of Object.keys(FAMILY_EMBLEM) as (keyof typeof FAMILY_EMBLEM)[]) {
      expect(deedFootnote(family), family).not.toMatch(/\d/);
    }
  });

  it('asks the ghost-diff for the figure and prints nothing when it has nothing', () => {
    const state = withLegacies();
    // Kidinnu is +15% science in the capital, and this seat has no capital yet —
    // so the honest reading at turn one is *no figure*, and the flourish stands
    // rather than a nought.
    const face = greatPersonFace(state, 0, 'kidinnu');
    expect(face.stamp === null || face.stamp.figures.length > 0).toBe(true);
  });

  it('gives every roster row a face that can be drawn', () => {
    // The sweep that catches a row added without an accent, an emblem or a mark.
    const state = twoSeats();
    for (const id of GREAT_PERSON_IDS) {
      const face = greatPersonFace(state, 0, id);
      expect(face.line, id).toBe(TIER_ACCENT[greatPersonDef(id).tier]);
      expect(face.emblem, id).toContain('url(');
      expect(face.eyebrow, id).toContain(greatPersonDef(id).family);
      expect(face.deed, id).toContain('Spent as a');
    }
  });
});


// --- the one figure ---------------------------------------------------------

/**
 * **The pile asks the ledger once, for the card that is face up** (batch H18).
 *
 * `greatPersonFace` asks `explainCardImpact` — a ghost-diff that prices every
 * town in the empire twice — and the roll used to ask it for every legacy in the
 * pile, on every open and on every press of an arrow, to print one number. Six
 * legacies on a late board measured 81ms a draw; the roll is now 0.07ms and the
 * one face-up card pays the reading. What is under test is that the split did
 * not quietly lose the figure, and that a struck record is never priced at all.
 */
describe('the figure, asked for the card that is face up', () => {
  it('builds the roll with no figure on any card', () => {
    // `stamp: null` on a card in the roll means *not asked* — see
    // `ReliquaryCard.face`. Every card, including the one that will be drawn.
    for (const card of reliquaryRoll(withLegacies(), 0)) {
      expect(card.face.stamp, card.face.id).toBeNull();
    }
  });

  it('asks for it when the card is turned over, and answers the whole face', () => {
    const state = withLegacies();
    const roll = reliquaryRoll(state, 0);
    const top = roll[0]!;
    const shown = reliquaryStamped(state, 0, top);
    // Everything the cheap half said is still said, and the figure is the one
    // the full face would have carried — the same function, asked once.
    expect(shown.face.name).toBe(top.face.name);
    expect(shown.face.legacy).toEqual(top.face.legacy);
    expect(shown.face.stamp).toEqual(greatPersonFace(state, 0, top.face.id).stamp);
  });

  it('never prices a struck legacy — it wears the flourish', () => {
    // The screen draws a revoked card with the struck flourish and no figure
    // (`drawReliquaryCard`), so the ghost-diff was work done for a number that
    // was thrown away. The card comes back untouched.
    const state = withLegacies();
    const struck = reliquaryRoll(state, 0).find((card) => card.revoked)!;
    expect(reliquaryStamped(state, 0, struck)).toBe(struck);
  });

  it('gives the cheap half of every roster row a face that can be drawn', () => {
    // `greatPersonCard`'s own sweep: a row added without an accent, an emblem or
    // a mark fails here as it does for the full face, and nothing in it asks the
    // simulation anything.
    for (const id of GREAT_PERSON_IDS) {
      const face = greatPersonCard(id);
      expect(face.line, id).toBe(TIER_ACCENT[greatPersonDef(id).tier]);
      expect(face.emblem, id).toContain('url(');
      expect(face.deed, id).toContain('Spent as a');
      expect(face.stamp, id).toBeNull();
    }
  });
});

// --- the screen -------------------------------------------------------------

describe('the Reliquary screen', () => {
  const SCREEN = source('reliquaryScreen.ts');
  /** The frame the eight parchment sheets share. See `src/ui/modalShell.ts`. */
  const SHELL = source('modalShell.ts');

  it('draws the great person card the offer deals, so a card kept is the card dealt', () => {
    // Quiet Table, build stage 2 (the third pass's frame c4: "Great").
    expect(SCREEN).toContain("element('div', 'rel-face')");
    expect(SCREEN).toContain('const { card: article, seat } = greatPersonCardNode(face);');
    expect(SCREEN).toContain("article.classList.add('rel-card');");
    // The fan's small cards are the same card, as thumbnails.
    expect(SCREEN).toContain('greatPersonCardNode(face, { mini: true, inControl: true }).card');
    // And the offer draws it through the same builder.
    expect(source('offerFaces.ts')).toContain('dressGreatPersonCard(face, greatPersonCard(id), {');
  });

  it('prints every clause through the descriptor renderer — never raw', () => {
    // The ruling's sweep: a raw `[[` on any surface is a bug. The card prints
    // the legacy (`greatPersonCard.ts`), and links its keywords where it is not
    // inside a control.
    const card = source('greatPersonCard.ts');
    expect(card).toContain('setDescriptorText(line, clause.text, { linked });');
    expect(card).toContain('const linked = options.inControl === true ? false : keywordsAllowedIn(host);');
    expect(SCREEN).not.toMatch(/textContent = clause\.text/);
    // And nothing this screen writes contains a mark of its own.
    expect(RELIQUARY_EMPTY).not.toContain('[[');
    expect(REVOKED_BAND).not.toContain('[[');
  });

  it('asks the ghost-diff for one card, and remembers it under the log', () => {
    // The pin on batch H18's two halves. The roll is built from the cheap face
    // (`greatPersonCard`), so a draw of a pile of any size is a table lookup;
    // the figure is asked for the one card the draw actually turns over, and it
    // is remembered under `(the state object, the revision, the seat)` — the
    // house key, which changes on exactly the occasions the answer can. A screen
    // that went back to `greatPersonFace` inside the roll would be a screen
    // paying a ghost-diff per legacy on every arrow press again.
    expect(SCREEN).toContain('face: greatPersonCard(record.id)');
    expect(SCREEN).not.toContain('greatPersonFace(');
    expect(SCREEN).toContain('const top = withFigure(state, playerId, deck[at]!);');
    expect(SCREEN).toContain('const card = drawReliquaryCard(top);');
    expect(SCREEN).toContain('stampedState !== state || stampedAt !== revision || stampedSeat !== playerId');
    expect(SCREEN).toContain('getRevision?.()');
    // And the game is where the revision comes from — `state.revision` since
    // batch E2, never a clock and never a counter this file keeps. It was
    // `game.log.length`, which was the right idea read one layer too high: the
    // simulation's own phases move the state without moving the log, so the
    // counter now lives on the state and is the same integer every memo in the
    // game is keyed on.
    expect(source('main.ts')).toContain('getRevision: () => game.state.revision');
  });

  it('writes the figure at rest and never replays the count', () => {
    // `landCardStamp`'s second caller and its whole reason: a screen that
    // replayed the count on every arrow press would be a screen celebrating
    // itself. `playCardStamp` belongs to the ceremony, not here.
    expect(SCREEN).toContain('landCardStamp(stamp, face.stamp)');
    expect(SCREEN).not.toContain('playCardStamp');
  });

  it('gives a struck legacy the flourish back, not a figure it no longer pays', () => {
    // A revoked record contributes nothing to any ledger, so `explainCardImpact`
    // prices it as a card *not held* — which is what it is. Printing that would
    // be printing what the legacy would pay if it came back, and it never will.
    const branch = SCREEN.slice(SCREEN.indexOf('if (card.revoked) {'));
    expect(branch).toContain("stamp.classList.add('is-struck')");
    expect(branch.indexOf("stamp.classList.add('is-struck')")).toBeLessThan(
      branch.indexOf('landCardStamp('),
    );
    // And the band and the grey are both drawn off the record's own mark.
    expect(SCREEN).toContain("if (card.revoked) article.classList.add('is-revoked');");
    // The struck flourish and the landed figure both sit in the card's seat.
    expect(SCREEN).toContain('seat.append(stamp);');
    expect(SCREEN).toContain("element('span', 'rel-revoked-band', REVOKED_BAND)");
    expect(STYLE).toContain('.rel-card.is-revoked');
    expect(STYLE).toContain('.rel-revoked-band');
    expect(STYLE).toContain('.card-stamp.is-struck');
  });

  it('omits the lifetime tally entirely rather than printing a dash for it', () => {
    // Phase 2, and it needs a schema field (`docs/history/doctrine-ideas.md`). A dash
    // standing in for a number the screen does not have is a number, printed as
    // though it did.
    expect(SCREEN).not.toContain('has produced');
    expect(SCREEN).not.toContain('STAMP_LIFETIME_LABEL');
  });

  it('says something in the specimen’s voice when nobody has served yet', () => {
    expect(RELIQUARY_EMPTY.length).toBeGreaterThan(20);
    expect(RELIQUARY_EMPTY).not.toMatch(/\d/);
    expect(SCREEN).toContain("element('p', 'rel-empty', RELIQUARY_EMPTY)");
  });

  it('keeps the sheet family’s keyboard contract, and adds the pile’s two keys', () => {
    // Escape and the capturing window listener are the shell's since batch H5 —
    // one binding for all eight sheets (`modalShell.ts`) — and this screen is
    // the shell's only user of `onKey`, which is where the pile's arrows live.
    expect(SHELL).toContain("if (event.key !== 'Escape') return;");
    expect(SHELL).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(SHELL).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    // Claimed only while it is up — the board reads the arrows too, and the
    // shell hands a key on only after checking that the sheet is showing.
    expect(SHELL).toMatch(
      /function onKeyDown\(event: KeyboardEvent\): void \{\s*if \(!isOpen\(\) \|\| event\.defaultPrevented\) return;\s*if \(options\.onKey/,
    );
    expect(SCREEN).toContain("if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;");
    expect(SCREEN).toContain("step(event.key === 'ArrowLeft' ? -1 : 1)");
    // And the arrows are real buttons, not decorated spans.
    expect(SCREEN).toContain("back.className = 'rel-arrow'");
    expect(SCREEN).toContain("forward.className = 'rel-arrow'");
    expect(SCREEN).toContain("back.setAttribute('aria-label', 'The card before')");
  });

  it('is mounted in the sheet family and swept with it', () => {
    const html = raw('index.html');
    expect(html).toContain('id="reliquary-overlay"');
    expect(html).toContain('class="statecraft-overlay"');
    expect(html).toContain('id="reliquary-body"');
    expect(html).toContain('id="reliquary-close"');
    const main = source('main.ts');
    expect(main).toContain('reliquary = createReliquaryScreen({');
    expect(main).toContain('gameDisposers.push(() => reliquary?.dispose());');
    // Swept through the screen registry (batch UX2): registered once, it is
    // closed by the sweep and blocks the hotkeys while it is up.
    expect(main).toContain("screens.register(held('reliquary', 'screen', () => reliquary));");
  });

  it('is a full sheet now: the paper’s own width, three columns and a foot', () => {
    // Batch SS3 (the user: "lets have that be its own screen instead of a small
    // popover"). The capped-overlay rule's membership is pinned in
    // `religionScreen.test.ts`; the Reliquary no longer narrows it.
    expect(STYLE).not.toMatch(/#reliquary-overlay \.reliquary-sheet \{[^}]*width:/);
    expect(STYLE).not.toContain('width: min(30rem, 100%);');
    // The board's three columns, and the desk in the middle.
    expect(STYLE).toContain('grid-template-columns: 286px minmax(0, 1fr) 300px;');
    expect(SCREEN).toContain('grid.append(drawLeft(roll, deck), drawDesk(state, playerId, deck, flip), drawRenown());');
    expect(STYLE).toContain('.rel-desk {');
    // And the stack under the card, which is what makes the pile a pile: up to
    // four edges, 6 px apart.
    for (const edge of [1, 2, 3, 4]) expect(STYLE).toContain(`.rel-under-${edge} { --edge-n: ${edge}; }`);
    expect(SCREEN).toContain('for (let edge = Math.min(4, deck.length - 1); edge >= 1; edge -= 1)');
    expect(STYLE).toContain('@keyframes rel-flip');
  });

  it('flips with a short move, and with a 120 ms fade under reduced motion', () => {
    expect(STYLE).toContain('animation: rel-flip 280ms');
    const reduced = STYLE.slice(STYLE.indexOf("/* The Reliquary's flip: a fade of 120 ms with no slide (the board). */"));
    expect(reduced).toContain('animation: rel-flip-fade 120ms linear both;');
    expect(STYLE).toContain('@keyframes rel-flip-fade {');
  });

  it('holds the place of an empty deck with a dashed outline, and still draws renown and the calls', () => {
    const desk = SCREEN.slice(SCREEN.indexOf('function drawDesk('));
    expect(desk).toContain("const place = element('div', 'rel-place');");
    expect(STYLE).toMatch(/\.rel-place \{[^}]*border: 1\.5px dashed/);
    // `draw` builds the renown column and the calls whatever the deck holds.
    const draw = SCREEN.slice(SCREEN.indexOf('function draw(flip: boolean): void {'), SCREEN.indexOf('function drawLeft('));
    expect(draw).toContain('drawRenown()');
    expect(draw).toContain('drawCalls();');
    expect(draw).not.toContain('return;\n');
  });

  it('does not dress a standing card as one that can be picked', () => {
    // The face sits in a `<button>` on the offer sheet; here it is an
    // `<article>` and it must not wear the pointer.
    expect(source('greatPersonCard.ts')).toContain("const card = element('article');");
    expect(STYLE).toMatch(/\.rel-card,\n\.gp-ceremony-card \{\s*cursor: default;/);
  });
});

// --- the door ---------------------------------------------------------------

describe('the renown figure is the door', () => {
  const BAR = source('topBar.ts');

  it('is a real button in the bar’s left group, so the keyboard needs no wiring of its own', () => {
    // Batch UX1 moved renown off the yield strip onto the top bar's Standings
    // tab, and batch SS2b into the left group with the beads when the tabs
    // left the bar. The figure is a `<button>`, so Enter and Space press it
    // natively; the old chip needed a role and a keydown handler to fake that.
    expect(BAR).toContain(
      "const renownItem = sheetButton('topbar-bank is-renown', 'reliquary-overlay');",
    );
    expect(BAR).toContain(
      "if (onOpenReliquary) renownItem.addEventListener('click', () => onOpenReliquary());",
    );
    expect(BAR).not.toMatch(/renownItem\.addEventListener\('keydown'/);
    // Its accessible name carries the figure in full and says where it leads.
    expect(BAR).toContain("renownItem.setAttribute('aria-label', figures.renownSpoken);");
  });

  it('hands the chip out by name so the ceremony can aim at it', () => {
    expect(BAR).toContain('renownChip: renownItem,');
    expect(source('main.ts')).toContain('target: () => civYields.renownChip,');
  });

  it('opens the sheet through main’s one-screen-at-a-time door', () => {
    // The door opens the sheet, and the sheet's opening tells the screen
    // registry, which closes whatever else is up (batch UX2).
    const main = source('main.ts');
    expect(main).toContain('onOpenReliquary: () => reliquary?.open(),');
    expect(main).toContain("onOpen: () => screens.opening('reliquary'),");
  });
});

// --- the calls at the foot ---------------------------------------------------

/**
 * **The draft three signature clauses promised and no screen offered** (batch
 * H3, `docs/audit/orchestrator.md` — "What surprised me":
 * `purchaseGreatPersonOffer` was fully built in the simulation and constructed
 * by nothing in `src/ui/` or `main.ts`).
 *
 * Two halves again, and the split is this file's own. Which controls an empire
 * is offered, what they cost and what a refused one says are a fold over the
 * state and are driven for real; that the rail is drawn on an empty screen, that
 * the screen dispatches nothing itself and that `main.ts` checks the result are
 * read from the source.
 */
describe('the calls at the foot', () => {
  function commonwealth(): GameState {
    const state = withLegacies();
    state.players[0]!.statecraft.government = 'theCommonwealth';
    state.players[0]!.techsResearched.push('epicPoetry');
    bumpRevision(state);
    state.players[0]!.gold = 10_000;
    return state;
  }

  it('shows why Merchant Princes must wait for recruitment', () => {
    const state = twoSeats();
    const player = state.players[0]!;
    player.gold = 10_000;
    player.statecraft.slots.push({ card: 'merchantPrinces', sealedUntil: state.turn });
    bumpRevision(state);
    const [call] = reliquaryCalls(state, 0);
    expect(call!.purchase).toBe('gold');
    expect(call!.disabled).toBe(true);
    expect(call!.note).toBe(greatPersonPurchaseError(state, 0, 'gold'));
    expect(call!.note).toContain('Epic Poetry');
    player.techsResearched.push('epicPoetry');
    bumpRevision(state);
    expect(reliquaryCalls(state, 0)[0]!.disabled).toBe(false);
  });

  it('draws nothing at all under a law that opens no purchase', () => {
    // The ordinary empire sees the screen it always saw. A control for a rule
    // nobody has met is a question that cannot be answered.
    expect(reliquaryCalls(withLegacies(), 0)).toEqual([]);
  });

  it('offers one control per open purchase, priced and banked by the simulation', () => {
    const state = commonwealth();
    const calls = reliquaryCalls(state, 0);
    expect(calls.map((call) => call.purchase)).toEqual(['gold']);
    const call = calls[0]!;
    expect(call.disabled).toBe(false);
    // The figure is `greatPersonOfferPrice`'s and the coin is
    // `greatPersonOfferBank`'s — never a number written on this side of the
    // wall. It is its own field since ruling (r) gave the calls the offer
    // sheet's decorated face, where the words and the figure are two lines.
    expect(call.label).not.toMatch(/\d/);
    expect(call.figure).toContain(String(greatPersonOfferPrice(state, 0, 'gold')));
    expect(call.figure).toContain(YIELD_GLYPH[greatPersonOfferBank('gold')]);
    expect(call.priceBreakdown).toContain('renown ×');
    // And the note is the interface's plain words, with no figure in them.
    expect(call.note).not.toMatch(/\d/);
  });

  it('offers The Academy’s scholars on the same rail, out of the faith bank', () => {
    const state = withLegacies();
    state.players[0]!.statecraft.doctrines.push('theAcademyOfDeeds' as never);
    bumpRevision(state);
    state.players[0]!.faithPool = 10_000;
    const calls = reliquaryCalls(state, 0);
    expect(calls.map((call) => call.purchase)).toEqual(['scholarDraft']);
    expect(calls[0]!.figure).toContain(YIELD_GLYPH.faith);
    expect(calls[0]!.disabled).toBe(false);
  });

  it('greys a call the bank cannot cover, carrying the reducer’s own sentence', () => {
    const state = commonwealth();
    state.players[0]!.gold = greatPersonOfferPrice(state, 0, 'gold') - 1;
    const call = reliquaryCalls(state, 0)[0]!;
    expect(call.disabled).toBe(true);
    // Not a sentence composed here: the string the command would have failed with.
    expect(call.note).toBe(greatPersonPurchaseError(state, 0, 'gold'));
    // The price is still on the button — a mechanism nobody can see is a
    // mechanism nobody can plan around.
    expect(call.figure).toContain(String(greatPersonOfferPrice(state, 0, 'gold')));
  });

  it('greys it again while a hand is already waiting, rather than dealing a second', () => {
    const state = commonwealth();
    state.players[0]!.greatPersonOffer = { options: ['imhotep'] };
    const call = reliquaryCalls(state, 0)[0]!;
    expect(call.disabled).toBe(true);
    expect(call.note).toContain('already has');
  });

  it('draws the rail on the empty screen too — the clause a new adopter has', () => {
    const screen = source('reliquaryScreen.ts');
    // `draw` has one arm since batch SS3: the desk draws the empty deck's
    // outline, and the calls are drawn after it whatever the deck holds. The
    // empire that has spent nobody is exactly the one whose whole signature
    // clause lives on this rail.
    const draw = screen.slice(screen.indexOf('function draw(flip: boolean): void {'), screen.indexOf('function drawLeft('));
    expect(draw.match(/drawCalls\(\);/g)?.length).toBe(1);
    expect(draw.indexOf('drawCalls();')).toBeGreaterThan(draw.indexOf('body.append(grid);'));
    expect(screen).toContain("place.append(element('p', 'rel-empty', RELIQUARY_EMPTY));");
  });

  it('wears the offer sheet’s own answer rather than a button of its own', () => {
    const screen = source('reliquaryScreen.ts');
    // Re-aimed with ruling (r) (batch H14): the offer sheet's reroll and pass
    // became the house's decorated `.btn`, and the rail followed them — which is
    // the face this screen's own docblock has claimed since H3.
    expect(screen).toContain(
      "button.className = 'btn offer-answer offer-answer-reroll rel-call';",
    );
    expect(screen).toContain('button.disabled = call.disabled;');
    expect(STYLE).toContain('.rel-calls {');
    expect(STYLE).toContain('.rel-call-note {');
  });

  it('dispatches nothing itself — the screen names the verb, main makes the command', () => {
    const screen = source('reliquaryScreen.ts');
    expect(screen).toContain('options.onCall?.(call.purchase)');
    expect(screen).not.toContain('dispatch(');
    const main = source('main.ts');
    const site = main.indexOf("type: 'purchaseGreatPersonOffer'");
    expect(site).toBeGreaterThan(-1);
    const around = main.slice(site - 400, site + 400);
    // Through the page's one door since `docs/flags.md` (mmmmmm) — a call
    // bought at the ladder is a command like any other, and it is reported.
    expect(around).toContain('const result = send(');
    expect(around).toContain('if (!result.ok) controls.guide(');
  });

  it('hands the bought hand straight to the tarot offer', () => {
    // What a call buys is a decision the game is now owed, so the pile gets out
    // of the way and the offer comes up exactly as a trickle's would.
    const main = source('main.ts');
    const site = main.indexOf('onCall: (purchase) => {');
    expect(site).toBeGreaterThan(-1);
    const arm = main.slice(site, main.indexOf('\n    },', site));
    expect(arm).toContain('reliquary?.close();');
    expect(arm).toContain('showGreatPersonOffer();');
  });
});
