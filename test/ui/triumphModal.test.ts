/**
 * The Triumph sheet: what it says, and — the half that is much easier to get
 * wrong — *when* it is allowed to say it.
 *
 * The user asked for "a modal that describes the achieved triumph, the amount of
 * renown awarded, and a proceed button" (playtest, 2026-08-27). Four of its five
 * promises cannot be kept by `triumphModal.ts` alone:
 *
 *   1. **Only this seat's Triumphs.** A rival's third city is not news you are
 *      shown a sheet about. `controls.ts` filters, and the sheet trusts it.
 *   2. **After the turn card, before the camera.** A resolution's Triumphs wait
 *      for the hand-over (CLAUDE.md's three beats: marches → card → beat →
 *      camera), and a Triumph earned by a command the player just issued is
 *      raised at once. The failure is silent in both directions — a sheet over
 *      pieces that are still walking, or a sheet that never comes.
 *   3. **A queue, not a stack.** One resolution can pay several.
 *   4. **Enter and Escape both proceed**, because there is no second answer.
 *   5. **The art plate is a slot, hidden until a row names one.**
 *
 * No jsdom in this suite (`controls.test.ts`'s note), so `triumphFace` carries
 * everything about the sheet that can be *quietly* wrong and the rest is read
 * off the sources through Vite's raw glob — the instrument `seatRoster.test.ts`
 * and `religionScreen.test.ts` use, and the right one here, because every
 * failure above is an ordering or a filter that throws nothing.
 */

import { describe, expect, it } from 'vitest';

import { triumphFace } from '../../src/ui/triumphModal';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/triumphModal.ts',
    '../../src/ui/controls.ts',
    '../../src/main.ts',
    '../../src/style.css',
    '../../index.html',
  ],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

const NEWS = {
  name: 'The Third Hearth',
  text: 'You found your third city.',
  epigram: 'Three fires, and the road between them.',
  pays: 10,
};

describe('triumphFace', () => {
  it('says what was achieved, in the row’s own words', () => {
    const face = triumphFace(NEWS, 1);
    expect(face.name).toBe('The Third Hearth');
    expect(face.epigram).toBe('Three fires, and the road between them.');
  });

  it('says what *caused* it, which is the half a title cannot carry', () => {
    // The user's complaint (2026-08-28): a Triumph arrived named and
    // unexplained. `TriumphDef.text` is the cause, and it is a different string
    // from the epigram — a sheet that printed the poem in this slot would be
    // the version that shipped.
    const face = triumphFace(NEWS, 1);
    expect(face.text).toBe('You found your third city.');
    expect(face.text).not.toBe(face.epigram);
  });

  it('prints the renown as a signed figure', () => {
    // Signed and positive: nothing in the game takes renown away, and "+10"
    // reads as a payment where "10" reads as a total.
    expect(triumphFace(NEWS, 1).pays).toBe('+10');
    expect(triumphFace({ ...NEWS, pays: 25 }, 1).pays).toBe('+25');
  });

  it('hides the art plate on every row that names no art', () => {
    // Which is every row today. The slot is in the tree and empty; the picture
    // the user has asked for later lands in it with nothing here to change.
    expect(triumphFace(NEWS, 1).plate).toBeNull();
    expect(triumphFace({ ...NEWS, art: null }, 1).plate).toBeNull();
    // An empty string is not art either — an empty frame is worse than no frame.
    expect(triumphFace({ ...NEWS, art: '' }, 1).plate).toBeNull();
  });

  it('shows the plate the moment a row does name one', () => {
    expect(triumphFace({ ...NEWS, art: '/art/third-hearth.png' }, 1).plate).toBe(
      '/art/third-hearth.png',
    );
  });

  it('counts the queue only when there is something behind this sheet', () => {
    expect(triumphFace(NEWS, 1).counter).toBeNull();
    expect(triumphFace(NEWS, 2).counter).toBe('1 of 2');
    expect(triumphFace(NEWS, 3).counter).toBe('1 of 3');
  });
});

describe('the sheet itself', () => {
  const modal = source('triumphModal.ts');

  it('shows one at a time and takes them in order', () => {
    // A queue, not a stack: `show` appends and Proceed takes the head off the
    // front. A `pop` here would show the last Triumph earned first.
    expect(modal).toContain('queue.push(...awards)');
    expect(modal).toContain('queue.shift()');
    expect(modal).not.toContain('queue.pop()');
  });

  it('is answered by Enter and by Escape, and by nothing else', () => {
    const keys = modal.slice(modal.indexOf('function onKeyDown'));
    const body = keys.slice(0, keys.indexOf('window.addEventListener'));
    expect(body).toContain("event.key !== 'Enter' && event.key !== 'Escape'");
    expect(body).toContain('proceed()');
    // Capturing, so a key answered here never also reaches the board.
    expect(modal).toContain("window.addEventListener('keydown', onKeyDown, true)");
  });

  it('is not dismissed by a stray click, the way the turn splash is', () => {
    // `turnSplash.ts` binds `pointerdown` on the window precisely so anything at
    // all takes it down. This sheet has a button; a card that vanished under the
    // click that was reaching for it would be the opposite of an announcement.
    expect(modal).not.toContain("'pointerdown'");
  });

  it('prints the cause under the name, and labels the epigram as flavour', () => {
    // The order is the ruling's: what you did, then the poem — and the poem
    // wears the Flavour label the Compendium and the offer cards wear, because
    // a sentence in that voice under a rule reads as a second rule.
    const name = modal.indexOf("'triumph-name'");
    const text = modal.indexOf("'triumph-text'");
    const flavor = modal.indexOf("'flavor-label', 'Flavour'");
    expect(name).toBeGreaterThan(-1);
    expect(text).toBeGreaterThan(name);
    expect(flavor).toBeGreaterThan(text);
  });

  it('draws the reserved plate as a <figure>, hidden rather than absent', () => {
    expect(modal).toContain("element('figure', 'triumph-plate')");
    expect(modal).toContain('plate.hidden = true');
  });

  it('never lets a string become markup', () => {
    // `turnSplash.ts`'s rule: a Triumph's name and epigram are data.
    expect(modal).not.toContain('innerHTML');
  });
});

describe('when the sheet is raised', () => {
  const controls = source('controls.ts');
  const report = controls.slice(controls.indexOf('function reportTriumphs'));
  const reportBody = report.slice(0, report.indexOf('let heldTriumphs'));

  it('shows this seat’s Triumphs and no other seat’s', () => {
    expect(reportBody).toContain('if (triumph.playerId !== localPlayerId) continue;');
  });

  it('keeps the chronicle line as well as the sheet', () => {
    // The log is the record. A player who proceeded past a sheet while looking
    // at the board has to be able to find the line again.
    expect(reportBody).toContain('announce(`✦ Triumph — ');
  });

  it('raises a mid-turn Triumph on the spot', () => {
    // A founding, a capture, a wonder: nothing is walking, so nothing is waited
    // for. `heldTriumphs === null` is the whole of "this is not a resolution".
    expect(reportBody).toContain('if (heldTriumphs === null) onTriumphs?.(mine);');
  });

  it('holds a resolution’s Triumphs for the hand-over, and always empties the hold', () => {
    const endTurn = controls.slice(controls.indexOf('const asleep = sleepingSnapshot'));
    const body = endTurn.slice(0, endTurn.indexOf('const next = nextOpenSeat'));
    // Set before the dispatch and cleared straight after it, so a Triumph can
    // never be stranded in the hold by an early return.
    expect(body.indexOf('heldTriumphs = [];')).toBeLessThan(
      body.indexOf("const result = commit({ type: 'endTurn'"),
    );
    expect(body).toContain('const earned = heldTriumphs;');
    expect(body).toContain('heldTriumphs = null;');
    expect(body).toContain('scheduleHandOver(report, deficitLines(meters), earned);');
    // The turn that did not resolve has no hand-over to wait for.
    expect(body).toContain('if (earned.length > 0) onTriumphs?.(earned);');
  });

  it('puts the sheet after the turn card and before the camera', () => {
    const hand = controls.slice(controls.indexOf('function scheduleHandOver'));
    const body = hand.slice(0, hand.indexOf('// --- unfinished business'));
    const card = body.indexOf('onTurnHandedOver?.(');
    const sheet = body.indexOf('if (triumphs.length > 0) onTriumphs?.(triumphs);');
    const camera = body.indexOf('afterBeat(prefersReducedMotion()');
    expect(card).toBeGreaterThan(-1);
    expect(sheet).toBeGreaterThan(card);
    expect(camera).toBeGreaterThan(sheet);
  });
});

describe('the page it lives on', () => {
  const html = source('index.html');
  const main = source('main.ts');
  const css = source('style.css');

  it('has a shell of its own, hidden and announced as a dialog', () => {
    expect(html).toContain('id="triumph-overlay"');
    expect(html).toContain('aria-modal="true"');
  });

  it('is built once and held where the pre-boot helpers can find it', () => {
    expect(main).toContain('triumphSheet = createTriumphModal(triumphOverlayEl)');
    // The other hotkeys have no business firing under a sheet nobody has
    // proceeded past — `H`, `T`, End Turn.
    expect(main).toContain('(triumphSheet?.isOpen ?? false)');
    // And a sheet must not survive into the landing screen.
    expect(main).toContain('triumphSheet?.clear();');
  });

  it('reads the words off the one place a Triumph’s words live', () => {
    // `TriumphAward` carries what happened; `data/triumphs.json` carries what it
    // is called. A hard-coded epigram here would be a second table.
    expect(main).toContain('triumphDef(award.id)');
    // And the cause line comes off the same row, for the same reason.
    expect(main).toContain('text: row.text,');
  });

  it('wears the proclamation dress and hides the empty plate', () => {
    expect(css).toContain('.triumph-plate[hidden]');
    // The gilt double rule is the class, not a copy of the recipe.
    expect(source('triumphModal.ts')).toContain("'triumph-sheet gilt-frame'");
  });

  it('drops the entrance for a reader who has asked for less motion', () => {
    const reduced = css.slice(css.lastIndexOf('.triumph-overlay,'));
    expect(reduced).toContain('animation: none');
  });
});
