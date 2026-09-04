/**
 * The Reliquary — the honored dead, and what they still pay.
 *
 * `docs/doctrine-ideas.md`, "The Reliquary is a SCREEN" (2026-09-03). Two kinds
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
  RELIQUARY_EMPTY,
  REVOKED_BAND,
  reliquaryCount,
  reliquaryRoll,
  reliquaryStep,
} from '../../src/ui/reliquaryScreen';
import {
  FAMILY_EMBLEM,
  FOREVER,
  TIER_ACCENT,
  TIER_MARK,
  deedFootnote,
  greatPersonFace,
  legacyHeadline,
  legacyIsSilent,
} from '../../src/ui/greatPersonFace';
import { GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameState, newGame } from '../../src/sim/state';

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
  return state;
}

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
    // The two rows this is actually for, both of which carry deferred prose and
    // an empty `legacy` (the ceremony promotes their deed instead).
    for (const id of ['heroOfAlexandria', 'yiSunSin'] as const) {
      expect(greatPersonDef(id).legacy.length, id).toBe(0);
    }
  });

  it('says what the charge was spent on without inventing which verb was taken', () => {
    // Nothing in the state records the verb (either one spends the piece and
    // leaves the same legacy), so the footnote names the family's two, and the
    // work by the improvement row's own name.
    expect(deedFootnote('scholar')).toBe('Spent as a scholar — the act, or the Academy.');
    expect(deedFootnote('general')).toContain('Spent as a general — the act, or the ');
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

// --- the screen -------------------------------------------------------------

describe('the Reliquary screen', () => {
  const SCREEN = source('reliquaryScreen.ts');

  it('draws the offer card’s own tarot face, so a card kept is the card dealt', () => {
    expect(SCREEN).toContain("element('div', 'offer-options rel-face')");
    expect(SCREEN).toContain("host.dataset.face = 'tarot'");
    expect(SCREEN).toContain("'offer-option rel-card'");
    expect(SCREEN).toContain("element('span', 'offer-emblem')");
    expect(SCREEN).toContain("element('span', 'offer-option-title', face.name)");
  });

  it('prints every clause through the descriptor renderer — never raw', () => {
    // The ruling's sweep: a raw `[[` on any surface is a bug, and the only way
    // this screen can produce one is by writing `clause.text` somewhere else.
    expect(SCREEN).toContain('setDescriptorText(line, clause.text, { linked })');
    expect(SCREEN).toContain('keywordsAllowedIn(article)');
    expect(SCREEN).not.toMatch(/textContent = clause\.text/);
    // And nothing this screen writes contains a mark of its own.
    expect(RELIQUARY_EMPTY).not.toContain('[[');
    expect(REVOKED_BAND).not.toContain('[[');
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
    expect(SCREEN).toContain("card.revoked ? 'offer-option rel-card is-revoked' : 'offer-option rel-card'");
    expect(SCREEN).toContain("element('span', 'rel-revoked-band', REVOKED_BAND)");
    expect(STYLE).toContain('.rel-card.is-revoked');
    expect(STYLE).toContain('.rel-revoked-band');
    expect(STYLE).toContain('.card-stamp.is-struck');
  });

  it('omits the lifetime tally entirely rather than printing a dash for it', () => {
    // Phase 2, and it needs a schema field (`docs/doctrine-ideas.md`). A dash
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
    expect(SCREEN).toContain("if (event.key === 'Escape')");
    expect(SCREEN).toContain("if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return");
    expect(SCREEN).toContain("step(event.key === 'ArrowLeft' ? -1 : 1)");
    // Claimed only while it is up — the board reads the arrows too.
    expect(SCREEN).toMatch(/function onKeyDown\(event: KeyboardEvent\): void \{\s*if \(!isOpen\(\)\) return;/);
    expect(SCREEN).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(SCREEN).toContain("window.removeEventListener('keydown', onKeyDown, true)");
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
    expect(main).toContain('reliquary?.close();');
    expect(main).toContain('(reliquary?.isOpen ?? false)');
  });

  it('narrows the paper it borrows', () => {
    // The capped-overlay rule's membership is pinned in `religionScreen.test.ts`
    // (all seven ids, one rule). What is this file's is what the Reliquary does
    // *with* it: one card, so ~30rem rather than the family's 1240px.
    // Said through the overlay's id, because what it narrows is
    // `#reliquary-overlay .statecraft-sheet` — an id in the selector, and a bare
    // class beside it would lose the cascade silently.
    expect(STYLE).toMatch(/#reliquary-overlay \.reliquary-sheet \{\s*width: min\(30rem, 100%\);/);
    expect(STYLE).toContain('#reliquary-overlay .reliquary-body {');
    // And the stack under the card, which is what makes the pile a pile.
    expect(STYLE).toContain('.rel-under-1');
    expect(STYLE).toContain('.rel-under-2');
    expect(STYLE).toContain('@keyframes rel-flip');
  });

  it('does not dress a standing card as one that can be picked', () => {
    // The face is a `<button>`'s on the offer sheet; here it is an `<article>`
    // and it must not wear the pointer or rise to a hover.
    expect(SCREEN).toContain("document.createElement('article')");
    expect(STYLE).toMatch(/\.rel-card,\n\.gp-ceremony-card \{\s*cursor: default;/);
  });
});

// --- the door ---------------------------------------------------------------

describe('the renown chip is the door', () => {
  const BAR = source('topBar.ts');

  it('makes the chip a button in the strip’s existing idiom, keyboard and all', () => {
    expect(BAR).toContain('if (onOpenReliquary) {');
    expect(BAR).toContain("renownItem.classList.add('civ-yield-clickable')");
    expect(BAR).toContain("renownItem.setAttribute('role', 'button')");
    expect(BAR).toContain("renownItem.addEventListener('click', () => onOpenReliquary())");
    expect(BAR).toMatch(/renownItem\.addEventListener\('keydown'[\s\S]{0,200}Enter/);
    // A page that wires no door leaves the chip exactly as it was.
    expect(BAR).toContain("renownItem.setAttribute('aria-label', 'renown')");
  });

  it('hands the chip out by name so the ceremony can aim at it', () => {
    expect(BAR).toContain('renownChip: renownItem,');
    expect(source('main.ts')).toContain('target: () => civYields.renownChip,');
  });

  it('opens the sheet through main’s one-screen-at-a-time door', () => {
    const main = source('main.ts');
    expect(main).toContain('onOpenReliquary: () => {');
    expect(main).toContain('reliquary?.open();');
  });
});
