/**
 * **The new-game flow in three screens** — batch L7, `docs/flags.md` (yyyy), the
 * mockup redrawn at `mockups/new-game-flow.html`.
 *
 * The landing was one leaf and is three screens: the title, which owns
 * everything that is not a decision about a new world; the world; and the civ.
 * The thing that can go wrong quietly here is not a colour — it is that a screen
 * that *looks* right starts a different game: a hot-seat switch that writes
 * somewhere `currentConfig` does not read, a Back that loses the seed, a Random
 * that rolls rather than deals, a Continue that names one save and loads
 * another. So the pins are the folds — `landingFlow.ts`'s step walk, its words,
 * its keys, `dealtLeader`'s arithmetic — and, for the half that is a document,
 * the sources the wiring is written in (this suite's discipline, since there is
 * no jsdom here: `sourceHelpers.ts`).
 *
 * The claims, one section each:
 *
 *   · the three screens are **one `#landing`** with a `data-step`, and the
 *     masthead is the title screen's alone;
 *   · the title screen's menu, its four keys and its shelf of recent worlds;
 *   · the world step: the switch writes the hot-seat checkbox, the summary strip
 *     reads the controls, Back keeps the seed by never touching it;
 *   · the civ step: Random deals by the seed, Begin's label follows the pick,
 *     and the roster still names no figure anywhere on the page;
 *   · the leaf disposes nothing per game, and prints no raw `[[`.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef } from '../../src/sim/leaderData';
import {
  FIRST_STEP,
  LANDING_STEPS,
  STEP_CRUMB,
  keyIsThePage,
  landingKeyAction,
  stepAfter,
  stepBefore,
  summaryStrip,
} from '../../src/ui/landingFlow';
import { dealtLeader, leaderFaces, leaderFirstCities, leaderIdentity } from '../../src/ui/leaderSelect';
import { relativeWhen } from '../../src/ui/savesPanel';
import { DEFAULT_SEATS, DEFAULT_SIZE } from '../../src/ui/gameSetup';
import { uiSource } from './sourceHelpers';

const INDEX = uiSource('index.html');
const MAIN = uiSource('main.ts');
const CSS = uiSource('style.css');
const FLOW = uiSource('landingFlow.ts');

describe('the three screens are one screen', () => {
  it('walks title → world → civ and back again, and ends at both ends', () => {
    expect([...LANDING_STEPS]).toEqual(['title', 'world', 'civ']);
    expect(FIRST_STEP).toBe('title');
    expect(stepAfter('title')).toBe('world');
    expect(stepAfter('world')).toBe('civ');
    expect(stepAfter('civ')).toBeNull();
    expect(stepBefore('civ')).toBe('world');
    expect(stepBefore('world')).toBe('title');
    expect(stepBefore('title')).toBeNull();
  });

  it('keeps one #landing and says which step it is on with one attribute', () => {
    // One element, one attribute. Nothing routes, and — the whole reason — no
    // form field is rebuilt between steps, so `currentConfig` reads the same
    // controls it has always read.
    expect(INDEX).toContain('<div id="landing" data-step="title">');
    expect(INDEX.match(/id="landing"/g)).toHaveLength(1);
    for (const step of LANDING_STEPS) {
      expect(INDEX, step).toContain(`data-step-for="${step}"`);
    }
    // The stylesheet is what shows one and hides the others.
    expect(CSS).toContain('#landing > .landing-stage > .landing-step');
    for (const step of LANDING_STEPS) {
      expect(CSS, step).toContain(`#landing[data-step='${step}']`);
    }
    // And `landingFlow.ts` is what writes it — nowhere else.
    expect(FLOW).toContain('root.dataset.step = next');
    expect(MAIN).not.toContain('dataset.step');
  });

  it('gives the rules that show a step and hide a row enough weight to win', () => {
    // Four of the five defects found on screen were one shape: a rule of this
    // block quietly beaten by a heavier one — `.hud-card.landing-card`'s block,
    // `.hud-card .row`'s flex over the UA's `[hidden]`, `.double-rule`'s 58%
    // measure, `.btn`'s `flex: 1`. Each fix is a selector that names enough, and
    // each is pinned here because no other test in the tree can see a cascade.
    expect(CSS).toContain('> .landing-step.landing-title-grid {');
    expect(CSS).toContain('.landing-card .row.field[hidden],');
    expect(CSS).toContain('.landing-card .row.check[hidden]');
    expect(CSS).toContain('.hud-card.landing-menu {');
    expect(CSS).toContain('.landing-menu > .landing-menu-rule {');
    expect(CSS).toContain('.landing-foot > .btn,');
    expect(CSS).toContain('.btn.landing-next {');
  });

  it('shows the poster once, on the title step, and a breadcrumb after it', () => {
    // The ruling's own words: the poster lives on the title screen alone and
    // never again on the way into a game.
    const poster = INDEX.slice(INDEX.indexOf('<header class="marquee'));
    expect(poster.slice(0, poster.indexOf('>'))).toContain('data-step-for="title"');
    expect(STEP_CRUMB.title).toBe('');
    expect(STEP_CRUMB.world).toBe('new game · step one of two');
    expect(STEP_CRUMB.civ).toBe('new game · step two of two');
    // Each breadcrumb is written from that one table rather than typed twice.
    expect(MAIN).toContain('crumbWorldEl.textContent = STEP_CRUMB.world');
    expect(MAIN).toContain('crumb: STEP_CRUMB.civ');
    expect(INDEX).not.toContain('step one of two');
  });

  it('opens on the title step whenever the landing comes back', () => {
    // A restart is a player leaving a game, and the screen they arrive at is the
    // one where Continue names the game they just left.
    const showLanding = MAIN.slice(MAIN.indexOf('function showLanding()'));
    expect(showLanding.slice(0, showLanding.indexOf('\n}\n'))).toContain("landing.go('title')");
  });
});

describe('the title screen', () => {
  it('carries the menu the ruling lists, with the two unbuilt rows dark', () => {
    for (const id of [
      'continue-game',
      'landing-new',
      'landing-load',
      'landing-multiplayer',
      'landing-compendium',
      'landing-settings',
    ]) {
      expect(INDEX, id).toContain(`id="${id}"`);
    }
    // Multiplayer comes after the playable core; there is no settings screen
    // yet. Both say so rather than being missing, and neither is pressable.
    expect(INDEX).toMatch(/id="landing-multiplayer"[^>]*disabled/);
    expect(INDEX).toMatch(/id="landing-settings"[^>]*disabled/);
    expect(INDEX).toContain('coming after the playable core');
  });

  it('answers four keys, and only on the title step', () => {
    expect(landingKeyAction('Enter')).toBe('continue');
    expect(landingKeyAction('n')).toBe('new');
    expect(landingKeyAction('N')).toBe('new');
    expect(landingKeyAction('l')).toBe('load');
    expect(landingKeyAction('?')).toBe('book');
    expect(landingKeyAction('x')).toBeNull();
    expect(landingKeyAction('Escape')).toBeNull();
    // The keys printed on the menu are the keys the mapping answers.
    for (const key of ['Enter', 'N', 'L', '?']) {
      expect(INDEX, key).toContain(`<span class="landing-key">${key}</span>`);
    }
    // One guarded document listener, refused on the other two steps and while a
    // surface is standing over the landing.
    expect(FLOW).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(FLOW).toContain("if (root.hidden || step !== 'title') return");
    expect(FLOW).toContain('options.busy?.() === true');
    expect(MAIN).toContain('busy: () => savesPanel.isOpen || compendium.isOpen');
  });

  it('leaves a keystroke inside a control to that control', () => {
    // Two different refusals. A **text control** keeps every key — `n` in the
    // seed field is a seed — while a **button** keeps only the key that presses
    // it. The title screen opens with a menu button focused, so a blanket
    // refusal for buttons was a keyboard that answered nothing at all (found on
    // screen, 2026-09-14). The reading is duck-typed, since this suite has no
    // document to build an element in.
    expect(keyIsThePage('n', null)).toBe(true);
    for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA']) {
      expect(keyIsThePage('n', { tagName } as unknown as EventTarget), tagName).toBe(false);
      expect(keyIsThePage('Enter', { tagName } as unknown as EventTarget), tagName).toBe(false);
    }
    const button = { tagName: 'BUTTON' } as unknown as EventTarget;
    expect(keyIsThePage('n', button)).toBe(true);
    expect(keyIsThePage('?', button)).toBe(true);
    expect(keyIsThePage('Enter', button)).toBe(false);
    expect(keyIsThePage(' ', button)).toBe(false);
    expect(keyIsThePage('n', { tagName: 'DIV' } as unknown as EventTarget)).toBe(true);
    expect(
      keyIsThePage('n', { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget),
    ).toBe(false);
  });

  it('names the newest world on Continue and lists the shelf newest first', () => {
    // Both readings come out of one walk of the shelf, so the button and the
    // rows cannot disagree about which world is newest.
    expect(MAIN).toContain('const worlds = recentWorlds(saveStorage)');
    expect(MAIN).toContain('const newest = worlds[0]');
    expect(MAIN).toContain('continueButton.hidden = newest === undefined');
    expect(MAIN).toContain('`${newest.figure} · seed ${newest.slot.seed} · turn ${newest.slot.turn}`');
    // A row is a button and it loads that world, through the same funnel
    // Continue uses.
    expect(MAIN).toContain("row.className = 'landing-shelf-row'");
    expect(MAIN).toContain('loadSlotId(world.slot.id)');
    expect(MAIN).toContain('loadSlotId(newestSlot(saveStorage)?.id ?? null)');
    // `listSaves` is already sorted newest first (`saves.ts`), and the shelf
    // takes it in that order rather than sorting a second time.
    expect(uiSource('savesPanel.ts')).toContain('return listSaves(storage)');
  });

  it('says how long ago in words, and hands back to the date past a fortnight', () => {
    const day = 86_400_000;
    const now = new Date('2026-09-14T12:00:00').getTime();
    expect(relativeWhen(now - 60_000, now)).toBe('today');
    expect(relativeWhen(now - day, now)).toBe('yesterday');
    expect(relativeWhen(now - 3 * day, now)).toBe('3 days ago');
    expect(relativeWhen(now - 9 * day, now)).toBe('last week');
    expect(relativeWhen(now - 40 * day, now)).not.toContain('ago');
    // A save with no clock on it says so rather than claiming 1970.
    expect(relativeWhen(0, now)).toBe('—');
  });
});

describe('the world step', () => {
  it('makes the mode a switch that writes the one checkbox', () => {
    // The checkbox stays in the document, hidden: `currentConfig` reads
    // `hotSeatToggle.checked` exactly as it always did, so a game set up through
    // the switch and one set up through the old checkbox are the same config.
    expect(INDEX).toContain('id="hot-seat"');
    expect(INDEX).toMatch(/class="row check landing-hotseat" hidden/);
    expect(INDEX).not.toMatch(/id="hot-seat"[^>]*checked/);
    for (const id of ['mode-single', 'mode-hotseat', 'mode-online']) {
      expect(INDEX, id).toContain(`id="${id}"`);
    }
    expect(INDEX).toMatch(/id="mode-online"[^>]*disabled/);
    expect(MAIN).toContain('hotSeatToggle.checked = hotSeat');
    expect(MAIN).toContain(
      'rosterFor(seatCount(), { persona: personaSelect.value, hotSeat: hotSeatToggle.checked })',
    );
  });

  it('builds none of the four rows the game does not have', () => {
    // The mockup greys rivals, pace, the wild and difficulty. The ruling: not
    // built, and no placeholder either.
    for (const absent of ['Rivals', 'Pace', 'The wild', 'Difficulty']) {
      expect(INDEX, absent).not.toContain(`<label>${absent}</label>`);
    }
    expect(INDEX).not.toContain('Journeyman');
  });

  it('reads the controls into the summary strip, and nothing else', () => {
    expect(summaryStrip({ size: DEFAULT_SIZE, seats: DEFAULT_SEATS, seed: 1, hotSeat: false })).toBe(
      'standard · 6 seats · seed 1',
    );
    expect(summaryStrip({ size: 'duel', seats: 1, seed: 7, hotSeat: false })).toBe(
      'duel · 1 seat · seed 7',
    );
    // Hot-seat leads, because it is the one choice on the step that changes who
    // is at the table rather than what the table is dealt.
    expect(summaryStrip({ size: 'large', seats: 4, seed: 2, hotSeat: true })).toBe(
      'hot-seat · large · 4 seats · seed 2',
    );
    // It is a reading of the card: the size word is the picker's own value and
    // the seed is the field's, parsed the one way this page parses a seed.
    expect(MAIN).toContain('size: sizeSelect.value,');
    expect(MAIN).toContain('seats: seatCount(),');
    expect(MAIN).toContain('seed: parseSeed(seedInput.value),');
  });

  it('walks on with Enter and with the button, and back to the title', () => {
    // Enter in the seed field is "choose your civ", never "begin": the form
    // spans two steps and submission means the way on from where the player is.
    expect(MAIN).toContain("if (landing.step === 'world') {");
    expect(MAIN).toContain("toCivButton.addEventListener('click', () => landing.go('civ'))");
    // Both Backs walk the graph rather than naming a step, so `stepBefore` is
    // the one answer to "where does Back go" on either step.
    expect(MAIN).toContain("backToTitleButton.addEventListener('click', () => landing.back())");
    expect(MAIN).toContain("backToWorldButton.addEventListener('click', () => landing.back())");
    // Back keeps the seed by construction: nothing in the walk writes a field,
    // and the fields are never rebuilt.
    expect(FLOW).not.toContain('value =');
    expect(FLOW).not.toContain('reset()');
  });
});

describe('the civ step', () => {
  it('deals Random by the seed, and the same seed deals the same figure', () => {
    expect(dealtLeader(1)).toBe(dealtLeader(1));
    expect(LEADER_IDS).toContain(dealtLeader(1));
    // Not a promise that every pair of seeds differs — a promise that the seed
    // is read at all, so a deal that ignored it would fail here rather than
    // dealing the first figure forever.
    const dealt = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => dealtLeader(seed)));
    expect(dealt.size).toBeGreaterThan(1);
    // A negative seed is a seed — `hash3` may answer negative, and a modulo of a
    // negative is not an index.
    expect(LEADER_IDS).toContain(dealtLeader(-7));
    expect(LEADER_IDS).toContain(dealtLeader(0));
    // The interface's own arithmetic, never the sim's seeded stream.
    const source = uiSource('leaderSelect.ts');
    expect(source).toContain('hash3');
    expect(source).not.toContain('Math.random');
  });

  it('opens the whole of a figure beside the roster, in the game own words', () => {
    for (const face of leaderFaces()) {
      // The identity line is the two inks and nothing invented: there is no
      // family field on a leader row (`docs/flags.md` (dddd)).
      expect(leaderIdentity(face)).toBe(face.colorWords.join(' · '));
      for (const word of face.colorWords) expect(leaderIdentity(face)).toContain(word);
      // The first towns, in the figure's own order.
      const cities = leaderFirstCities(face.id);
      expect(cities.length).toBeGreaterThan(0);
      expect(cities).toEqual(leaderDef(face.id).cities.slice(0, cities.length));
    }
  });

  it('keeps Begin outside the card that is redrawn, and names the pick', () => {
    // The detail card is wiped on every pick, so a button inside it would be a
    // button that stopped existing between renders.
    const civ = INDEX.slice(INDEX.indexOf('data-step-for="civ"'));
    const detail = civ.indexOf('id="landing-detail"');
    const begin = civ.indexOf('id="start-game"');
    expect(detail).toBeGreaterThan(-1);
    expect(begin).toBeGreaterThan(detail);
    expect(civ.slice(detail, begin)).toContain('class="landing-begin"');
    expect(INDEX).toContain('form="landing-setup"');
    expect(MAIN).toContain('? `Begin as ${leaderDef(chosen).name}`');
    expect(MAIN).toContain("    : 'Begin';");
  });

  it('still names no figure in the page, the stylesheet or the picker', () => {
    // The arena panel's rule: a fourteenth figure appears with no page edit,
    // which is only true while nothing on the page holds a name. (The whole-word
    // test is `leaderScreens.test.ts`'s; this is the same claim over the three
    // files L7 rewrote.)
    const names = (source: string, word: string): boolean =>
      new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(source);
    for (const name of ['index.html', 'style.css', 'leaderSelect.ts', 'landingFlow.ts']) {
      const source = uiSource(name);
      for (const id of LEADER_IDS) {
        expect(names(source, id), `${name} names ${id}`).toBe(false);
        expect(names(source, leaderDef(id).name), `${name} names a figure`).toBe(false);
      }
    }
  });
});

describe('the leaf itself', () => {
  it('disposes nothing per game: the landing is the page own first surface', () => {
    // It is not a per-game screen — it comes back *over* a finished game — so it
    // binds its one listener once and registers nothing in `gameDisposers`. A
    // listener added on every showing is the leak that register exists to stop.
    expect(MAIN).not.toContain('gameDisposers.push(() => landing');
    expect(MAIN.match(/createLandingFlow\(/g)).toHaveLength(1);
    // The one listener it does bind has a way off it all the same.
    expect(FLOW).toContain("document.removeEventListener('keydown', onKeyDown)");
  });

  it('prints no raw keyword marker on any of the three screens', () => {
    expect(INDEX).not.toContain('[[');
    expect(FLOW).not.toContain('[[');
    // Every clause the civ step prints goes through the descriptor writer.
    expect(uiSource('leaderSelect.ts')).toContain('setDescriptorText(item, clause.text)');
  });

  it('is described as three steps in the briefing', () => {
    const readme = Object.values(
      import.meta.glob('../../docs/README.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    expect(readme).toContain('data-step');
    expect(readme).toContain('title');
  });
});
