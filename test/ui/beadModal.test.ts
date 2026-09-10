/**
 * The Bead Race's two announcements: **a bead landed on your wire**, and **an
 * age opened and here is what it is worth winning.**
 *
 * The Bead Race is the game's one victory condition (design ledger Entry VI)
 * and until this pass a bead was a toast — the same volume as a caravan coming
 * home. The sheet (`beadModal.ts`) is the Triumph sheet one system over; the age
 * opening was the Beads table wearing a banner until batch G2 and is the
 * **wager's deal sheet** now (`docs/wager.md` §5/§11).
 *
 * Five of the promises cannot be kept by any one module alone, and every one of
 * them fails *silently*:
 *
 *   1. **Every bead path raises the sheet.** A bead earned inside a command and
 *      a bead earned in a resolution both ride `reportBeads`, which is the one
 *      funnel — a new seam that awarded a bead somewhere else would announce
 *      nothing.
 *   2. **Local seat only.** A rival's bead is a chronicle line, exactly as a
 *      rival's Triumph is.
 *   3. **After the turn card, never over the marches** (CLAUDE.md's three
 *      beats), and behind a Triumph sheet earned in the same resolution.
 *   4. **Reduced motion collapses the clack** to the settled rod.
 *   5. **The age opening is raised from `beadAgeOpened`** and from nothing else
 *      — never from a before-and-after of `state.beads.worldAge`.
 *
 * No jsdom in this suite (`controls.test.ts`'s note), so the faces carry
 * everything that can be quietly wrong and the rest is read off the sources
 * through Vite's raw glob — `triumphModal.test.ts`'s instrument, and the right
 * one here for the same reason: every failure above is an ordering or a filter
 * that throws nothing.
 */

import { describe, expect, it } from 'vitest';

import { type BeadNews, beadAwardFace, beadRodsFor } from '../../src/ui/beadModal';
import { BEAD_RULES } from '../../src/sim/beadData';
import type { EarnedBead } from '../../src/sim/state';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/beadModal.ts',
    '../../src/ui/beadsScreen.ts',
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

/** A rod of `count` beads, all of one family. The rod is what the sheet draws. */
function rod(count: number): EarnedBead[] {
  const beads: EarnedBead[] = [];
  for (let i = 0; i < count; i++) {
    beads.push({ id: 'theRoadBuilder', kind: 'quest', family: 'economic', turn: 10 + i });
  }
  return beads;
}

function news(over: Partial<BeadNews> = {}): BeadNews {
  return {
    id: 'theRoadBuilder',
    name: 'The Road-Builder',
    kind: 'quest',
    family: 'economic',
    boon: ['a die of the Magister'],
    rod: rod(3),
    ...over,
  };
}

describe('beadAwardFace', () => {
  it('says what class of card it was, from which deck, in which family', () => {
    // All three off the row itself, through the Beads screen's own face
    // builder: one row, one set of sentences, whichever surface prints them.
    const face = beadAwardFace(news(), 1);
    expect(face.name).toBe('The Road-Builder');
    // The Æra is `deckEraWord`'s, which is the screen's own numeral for a deck
    // key — one list of era words for the table and the sheet, whatever that
    // helper decides it is.
    expect(face.line).toBe('quest · Æra III · economic');
    expect(face.eyebrow).toBe('a bead');
  });

  it('calls a reckoning a reckoning', () => {
    // It is a bead on your rod like any other and gets a sheet, but it is not
    // something you *did* — it is the age taking a measurement.
    const face = beadAwardFace(news({ id: 'theMostCities', kind: 'reckoning' }), 1);
    expect(face.eyebrow).toBe('a reckoning');
  });

  it('says what the deed asked, in the row’s own words', () => {
    const face = beadAwardFace(news(), 1);
    expect(face.deed.length).toBeGreaterThan(0);
    expect(face.deed).not.toBe(face.name);
  });

  it('prints the boon the settlement paid, and never re-derives it', () => {
    // `BeadAward.boon` is the settlement's own list, banked and stripped by
    // `payBoon` before this sheet ever saw it.
    expect(beadAwardFace(news(), 1).boon).toEqual(['a die of the Magister']);
    expect(beadAwardFace(news({ boon: [] }), 1).boon).toEqual([]);
  });

  it('draws the whole rod, threshold-long, with the golden slot on the end', () => {
    // A rod is "how far to a win", not a tally: it is as long as the threshold
    // whatever the seat has earned, and the last slot is the golden one.
    const face = beadAwardFace(news(), 1);
    expect(face.slots).toHaveLength(BEAD_RULES.threshold);
    expect(face.slots[face.slots.length - 1]!.kind).toBe('golden');
    expect(face.slots.filter((slot) => slot.kind === 'bead')).toHaveLength(3);
  });

  it('counts the rod as it now stands', () => {
    expect(beadAwardFace(news(), 1).tally).toBe(`3 of ${BEAD_RULES.threshold} beads`);
    expect(beadAwardFace(news({ rod: rod(1) }), 1).tally).toBe(
      `1 of ${BEAD_RULES.threshold} beads`,
    );
  });

  it('lands the arriving bead on the slot the bead just took', () => {
    // The last bead on the rod, because the rod handed in is the rod *the
    // instant this bead landed* — see `beadRodsFor`.
    expect(beadAwardFace(news({ rod: rod(1) }), 1).arriving).toBe(0);
    expect(beadAwardFace(news(), 1).arriving).toBe(2);
    expect(beadAwardFace(news({ rod: rod(BEAD_RULES.threshold - 1) }), 1).arriving).toBe(
      BEAD_RULES.threshold - 2,
    );
  });

  it('animates nothing once the rod is past the door', () => {
    // A rod is threshold-long and its last slot is the **golden** one, which
    // only the Magnum Opus mints — so a seat holding as many ordinary beads as
    // the threshold has slots has run off the end of the drawing. It matters at
    // the figure batch Q1 cut (`docs/wager.md` §5): a bench leader ends an age-IV
    // game holding more beads than the door asks. The face says so by refusing
    // the animation rather than marking the golden slot, which is the one slot
    // nothing may ever be drawn in.
    expect(beadAwardFace(news({ rod: rod(BEAD_RULES.threshold) }), 1).arriving).toBeNull();
    expect(beadAwardFace(news({ rod: rod(BEAD_RULES.threshold + 3) }), 1).arriving).toBeNull();
  });

  it('collapses to the settled rod for a reader who wants less motion', () => {
    // Promise 4, and the whole of it: nothing is marked as arriving, so the
    // same render draws the rod as it stands with no animation to run. Not a
    // second render path — the beads are all still there.
    const face = beadAwardFace(news(), 1, { still: true });
    expect(face.arriving).toBeNull();
    expect(face.slots.filter((slot) => slot.kind === 'bead')).toHaveLength(3);
    expect(face.tally).toBe(`3 of ${BEAD_RULES.threshold} beads`);
  });

  it('animates nothing when the bead landed past the last drawn slot', () => {
    // A rod at the threshold has won the game; there is no slot for a bead
    // beyond the golden one, and marking one would be a class on nothing.
    expect(beadAwardFace(news({ rod: rod(BEAD_RULES.threshold + 2) }), 1).arriving).toBeNull();
  });

  it('counts the queue only when there is something behind this sheet', () => {
    expect(beadAwardFace(news(), 1).counter).toBeNull();
    expect(beadAwardFace(news(), 3).counter).toBe('1 of 3');
  });
});

describe('beadRodsFor', () => {
  it('gives one sheet the rod it landed on', () => {
    const rods = beadRodsFor([{}], rod(4));
    expect(rods).toHaveLength(1);
    expect(rods[0]).toHaveLength(4);
  });

  it('walks a batch one bead at a time', () => {
    // Two beads in one resolution: the first sheet shows the rod one bead
    // shorter. Draw both on the final rod and the first sheet animates a bead
    // it did not earn.
    const rods = beadRodsFor([{}, {}], rod(5));
    expect(rods.map((one) => one.length)).toEqual([4, 5]);
  });

  it('never runs past the rod it was handed', () => {
    // Defensive: a batch longer than the rod (which the append-only list makes
    // impossible) still answers prefixes of the rod rather than undefined.
    const rods = beadRodsFor([{}, {}, {}], rod(2));
    expect(rods.map((one) => one.length)).toEqual([1, 2, 2]);
  });
});

describe('the age-opening list, retired', () => {
  const screen = source('beadsScreen.ts');

  it('no longer raises itself on the age', () => {
    // Batch G2 (`docs/wager.md` §5/§11): what an age asks of everybody is the
    // three bars it sets, so the **wager's deal sheet** is the age's sheet now
    // and two full-screen sheets on one turn is one too many. The banner, its
    // two pure builders and the raising that put it there all went together.
    expect(screen).not.toContain('announceAge');
    expect(screen).not.toContain('drawBanner');
    expect(screen).not.toContain('ageOpeningGroups');
  });

  it('leaves a ledger where the table was, behind the same three doors', () => {
    // **Re-aimed by batch Q1.** The banner was an index over cards the sheet
    // drew, and the cards themselves are retired now — so what the sheet keeps
    // is the ledger: the rods, the rows that still pay a bead, and the Opus's
    // line. The three ordinary doors are unchanged.
    expect(screen).not.toContain('function drawAge(');
    expect(screen).not.toContain('function drawFeats(');
    expect(screen).not.toContain('function drawReckonings(');
    expect(screen).toContain('function drawGrants(');
    expect(screen).toContain('function drawRods(');
  });
});

describe('the sheet itself', () => {
  const modal = source('beadModal.ts');

  it('shows one at a time and takes them in order', () => {
    // A queue, not a stack — `triumphModal.ts`'s contract, and a `pop` here
    // would show the last bead of a resolution first.
    expect(modal).toContain('queue.push(...awards)');
    expect(modal).toContain('queue.shift()');
    expect(modal).not.toContain('queue.pop()');
  });

  it('is answered by Enter and by Escape, and by nothing else', () => {
    const keys = modal.slice(modal.indexOf('function onKeyDown'));
    const body = keys.slice(0, keys.indexOf('window.addEventListener'));
    expect(body).toContain("event.key !== 'Enter' && event.key !== 'Escape'");
    expect(body).toContain('proceed()');
    expect(keys).toContain('onKeyDown, true');
  });

  it('asks the reader’s motion preference at the moment it draws', () => {
    // Read per render rather than cached: the setting can change while the page
    // is open, and the face is what carries the answer into the drawing.
    expect(modal).toContain('still: prefersReducedMotion()');
    // The query itself is `ui/motion.ts`'s, since batch H5 folded eight copies
    // of it into one — so what this file must show is that it *asks*, and that
    // the thing it asks is the shared reader rather than a fourth local copy.
    expect(modal).toContain("import { prefersReducedMotion } from './motion';");
    expect(modal).not.toContain('matchMedia');
  });

  it('marks the arriving chip off the face and never works it out itself', () => {
    // The face decides which slot moves; a loop that re-derived "the last bead"
    // here would be the second implementation this split exists to prevent.
    expect(modal).toContain("if (index === face.arriving) chip.classList.add('is-arriving')");
  });

  it('draws the rod with the Beads screen’s own bead, not a second one', () => {
    expect(modal).toContain("from './beadsScreen'");
    expect(modal).toContain('beadChipNode(');
    expect(modal).toContain('abacusRodSlots(');
  });

  it('tells whoever is holding news that the screen is clear', () => {
    // The queue discipline above `beadModal.ts` hangs off this: `main.ts` waits
    // for it before raising the age's table.
    expect(modal).toContain('options.onClosed?.()');
  });
});

describe('the clack', () => {
  const css = source('style.css');

  it('is one animation on one chip', () => {
    expect(css).toContain('@keyframes bead-clack');
    expect(css).toContain('.bead-chip.is-arriving');
    expect(css).toMatch(/\.bead-chip\.is-arriving \{\s*animation: bead-clack/);
  });

  it('slides down the wire and settles rather than fading in', () => {
    const frames = css.slice(css.indexOf('@keyframes bead-clack'));
    const body = frames.slice(0, frames.indexOf('.bead-chip.is-arriving'));
    // It comes in from the empty end of the wire…
    expect(body).toMatch(/0% \{\s*transform: translateX\(6\d+px\)/);
    // …overshoots its slot, which is the settle bounce…
    expect(body).toContain('translateX(-3px)');
    // …and ends exactly on it.
    expect(body).toMatch(/100% \{\s*transform: translateX\(0\)/);
  });

  it('is off for a reader who has asked for less motion', () => {
    // The brace to the module's belt: the class is never added under the
    // preference, and if the preference changes under a standing sheet this
    // stops the animation anyway.
    const reduced = css.slice(css.indexOf('.bead-chip.is-arriving'));
    const rule = reduced.slice(0, reduced.indexOf('/* --- the age-opening banner'));
    expect(rule).toContain('@media (prefers-reduced-motion: reduce)');
    expect(rule).toMatch(/prefers-reduced-motion[\s\S]*\.bead-chip\.is-arriving \{\s*animation: none/);
  });
});

describe('where the sheet is raised from', () => {
  const controls = source('controls.ts');

  it('is raised from the bead report, which is the one funnel', () => {
    // Promise 1. A bead earned inside a command rides that command's
    // `CommandResult.beads` and a bead earned in a resolution rides `endTurn`'s
    // — `reportBeads` covers both with no second call site, so a new seam that
    // awards a bead cannot skip the sheet.
    const report = controls.slice(controls.indexOf('function reportBeads'));
    const body = report.slice(0, report.indexOf('function reportAgeOpened'));
    expect(body).toContain('onBeadAwards?.(mine)');
    expect(body).toContain('heldBeadNews.awards.push(...mine)');
    expect(controls).toContain('reportBeads(result);');
  });

  it('shows a sheet for this seat’s beads only', () => {
    // Promise 2. The chronicle keeps both voices — a rival's bead is news —
    // but the sheet is the moment, and the moment is the empire's it happened
    // to. `reportTriumphs`' filter, one system over.
    const report = controls.slice(controls.indexOf('function reportBeads'));
    const body = report.slice(0, report.indexOf('function reportAgeOpened'));
    expect(body).toContain('if (award.playerId === localPlayerId) mine.push(award)');
  });

  it('holds a resolution’s beads for the hand-over, behind the turn card', () => {
    // Promise 3, and CLAUDE.md's three beats: dropping a sheet over pieces that
    // are still walking is what `onTurnResolved`/`onTurnHandedOver` were split
    // apart to prevent. The card first, then the Triumph sheet, then this.
    const hand = controls.slice(controls.indexOf('function scheduleHandOver'));
    const body = hand.slice(0, hand.indexOf('// --- unfinished business'));
    const card = body.indexOf('onTurnHandedOver?.(');
    const triumph = body.indexOf('onTriumphs?.(triumphs)');
    const beads = body.indexOf('onBeadAwards?.(beadNews.awards)');
    const age = body.indexOf('onBeadAgeOpened?.(beadNews.ageOpened)');
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(triumph);
    expect(triumph).toBeLessThan(beads);
    expect(beads).toBeLessThan(age);
  });

  it('shows a bead earned mid-turn at once, with nothing to wait for', () => {
    // The `null`/value distinction is the whole of "is this a resolution", and
    // the holder is emptied on both branches — a bead nobody was shown is the
    // one thing in this game a player is actually playing for.
    expect(controls).toContain('heldBeadNews = { awards: [], ageOpened: null, census: null };');
    expect(controls).toContain('heldBeadNews = null;');
    const end = controls.slice(controls.indexOf('const beadNews = heldBeadNews'));
    expect(end).toContain('if (beadNews.awards.length > 0) onBeadAwards?.(beadNews.awards);');
  });

  it('raises the age’s table off the reducer’s report and nothing else', () => {
    // Promise 5. `CommandResult.beadAgeOpened`, ridden out of `TurnReport` —
    // never a before-and-after of `state.beads.worldAge`, which is a second
    // implementation of "did it move".
    const report = controls.slice(controls.indexOf('function reportAgeOpened'));
    const body = report.slice(0, report.indexOf('let heldTriumphs'));
    expect(body).toContain('result.beadAgeOpened === undefined');
    expect(body).toContain('onBeadAgeOpened?.(age)');
    expect(body).toContain('heldBeadNews.ageOpened = age');
    expect(body).not.toContain('worldAge');
  });
});

describe('the queue above the sheets', () => {
  const main = source('main.ts');
  const html = source('index.html');

  it('has a shell of its own on the page', () => {
    expect(html).toContain('id="bead-overlay"');
    expect(main).toContain("requireElement<HTMLElement>('bead-overlay')");
  });

  it('raises one surface at a time, awards before the table', () => {
    // Three sheets landing on one another say less than any one of them. Awards
    // first — a bead is yours and the table is the world's.
    const pump = main.slice(main.indexOf('function pumpBeadNews'));
    const body = pump.slice(0, pump.indexOf('\n  }\n'));
    expect(body).toContain('if (newsBlocked()) return;');
    const awards = body.indexOf('beadSheet.show(news)');
    // The second surface is the **wager's deal sheet** since batch G2: what an
    // age asks of everybody is the three bars it sets, and the deed table is one
    // press away all game.
    const table = body.indexOf('wagerSheet.open()');
    expect(awards).toBeGreaterThan(-1);
    expect(awards).toBeLessThan(table);
  });

  it('pumps again the moment a sheet comes down', () => {
    // Announced, never polled: a poll would have to run on a frame, and this
    // happens a few dozen times in a game.
    expect(main).toContain('onClosed: () => pumpBeadNews()');
    expect(source('triumphModal.ts')).toContain('options.onClosed?.()');
  });

  it('snapshots each sheet’s rod when the award is reported, not when it is shown', () => {
    // A batch held behind an offer card while a second resolution pays another
    // bead would otherwise draw both sheets on the rod as it stands now.
    const listener = main.slice(main.indexOf('onBeadAwards: (awards)'));
    const body = listener.slice(0, listener.indexOf('onBeadAgeOpened:'));
    expect(body).toContain('beadRodsFor(awards, rod)');
    expect(body).toContain('pendingBeadNews.push(');
  });

  it('blocks news behind a sheet but never behind a screen', () => {
    // `newsBlocked` is deliberately narrower than `isInputBlocked`: a player
    // reading the Beads table when their bead arrives should get the sheet.
    const blocked = main.slice(main.indexOf('function newsBlocked'));
    const body = blocked.slice(0, blocked.indexOf('\n  }\n'));
    expect(body).toContain('offerCard.isOpen');
    expect(body).toContain('triumphSheet?.isOpen');
    expect(body).not.toContain('techTree?.isOpen');
    expect(body).not.toContain('beads?.isOpen');
  });

  it('drops the queue with the game it belonged to', () => {
    expect(main).toContain('function clearBeadNews');
    const clear = main.slice(main.indexOf('function clearBeadNews'));
    const body = clear.slice(0, clear.indexOf('\n}\n'));
    expect(body).toContain('pendingBeadNews = []');
    expect(body).toContain('pendingBeadAge = null');
    expect(body).toContain('beadSheet?.clear()');
  });

  it('blocks the board’s hotkeys while a sheet stands', () => {
    const guard = main.slice(main.indexOf('function isInputBlocked'));
    const body = guard.slice(0, guard.indexOf('function newsBlocked'));
    expect(body).toContain('beadSheet?.isOpen');
  });
});

