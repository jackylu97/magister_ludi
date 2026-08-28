/**
 * The faith lens's **standing** half: a plate on every town the seat knows.
 *
 * `faithLens.test.ts` pins the hover card, which answers the whole question for
 * the one town the pointer is on. The user's ruling of 2026-08-28 said that was
 * not enough — *"It's very unclear which cities are following my religion"* — and
 * the answer is a caption on every hex at once, which is what this suite is
 * about.
 *
 * Two kinds of test, the suite's usual split. The **words** are driven for real
 * against the shared world (`faithHelpers.ts` — deliberately the same world the
 * card is tested against, because the claim worth the most here is that the two
 * surfaces cannot disagree about a town), and the **wiring** — a renderer, a
 * lens, a plate layer — is read out of the source, because its failure mode is a
 * surface asking the wrong function and that is visible in which name a file
 * called, never in a rendered output.
 */

import { describe, expect, it } from 'vitest';

import { getTileAt } from '../../src/sim/map';
import { cityFaithHeadline } from '../../src/ui/cityPanel';
import { faithPlates, religionDevice } from '../../src/ui/faithPlates';
import { religionReading } from '../../src/ui/religionScreen';
import type { MapPlate } from '../../src/ui/tilePriceTags';
import { faithWorld, fn, sourceOf } from './faithHelpers';

/** The plate on one hex, or `undefined`. What every case below asks for. */
function plateAt(plates: readonly MapPlate[], col: number, row: number): MapPlate | undefined {
  return plates.find((plate) => plate.col === col && plate.row === row);
}

// --- the device --------------------------------------------------------------

describe('religionDevice', () => {
  /**
   * Every generated name begins with "the" (`religion.json`'s three patterns),
   * so the article is what goes — a board of Ts would be no mark at all.
   */
  it('is the initial of the word that distinguishes one faith from another', () => {
    expect(religionDevice('the Grain Cult')).toBe('G');
    expect(religionDevice('the Way of the Hearth')).toBe('W');
    expect(religionDevice('the Children of Sky and Stone')).toBe('C');
  });

  it('survives a rename to anything at all', () => {
    expect(religionDevice('ash')).toBe('A');
    expect(religionDevice('  «quiet»  ')).toBe('Q');
  });
});

// --- the three cases the ruling names -----------------------------------------

describe('the plate on a town that follows you', () => {
  /**
   * The device in the founder's ink, the ✶ because the town flies it, the count
   * the ruling asked for, and the tide. No banner clause: a town flying *your*
   * banner has no contrast to draw.
   */
  it('is the device, the banner mark, the congregation and the tide', () => {
    const { state } = faithWorld();
    const plate = plateAt(faithPlates(state, 0), 4, 4)!;
    expect(plate.text).toBe('G ✶ 3 of 5 · +10 a turn');
    // Azure's ink — the founder's, which is how every other surface colours a
    // faith (`cityFaithRows.founderColor`).
    expect(plate.ink).toBe('#2a4d8f');
    expect(plate.spoken).toBe(
      'Uruk follows the Grain Cult · 3 of 5 citizens · the Grain Cult presses +10 a turn',
    );
    // A caption, never a button: `inert` is what makes the hover card underneath
    // still reachable.
    expect(plate.inert).toBe(true);
    expect(plate.disabled).toBe(false);
    expect(plate.className).toBe('faith-plate');
  });

  /**
   * A **foreign** town that follows you is the same plate, and deliberately: the
   * question the lens answers is "who follows me", not "which of my towns", and
   * a rival's capital keeping your faith is the most interesting answer it has.
   */
  it('reads the same on a rival’s town that keeps your faith', () => {
    const { state, ours } = faithWorld();
    state.cities[1]!.followers = { [ours.id]: 3 };
    const plate = plateAt(faithPlates(state, 0), 10, 6)!;
    expect(plate.text).toBe('G ✶ 3 of 4 · +6 a turn');
    expect(plate.ink).toBe('#2a4d8f');
    expect(plate.spoken).toContain('Lagash follows the Grain Cult');
  });

  /**
   * And a town you are *working on* — pressure, no converts yet — carries both
   * figures: yours, and the banner it is still flying. That contrast is the whole
   * of what the plate is for, and it is the state a player checks most.
   */
  it('carries the banner it is still flying when that is not yours', () => {
    const { state } = faithWorld();
    const plate = plateAt(faithPlates(state, 0), 10, 6)!;
    expect(plate.text).toBe('G 0 of 4 · +6 a turn · W ✶ 3 of 4');
    // The count is said in words, and the ✶ never is — a screen reader announces
    // its Unicode name in the middle of the sentence (`figures.ts`' register).
    expect(plate.spoken).toBe(
      'Lagash · 0 of 4 citizens follow the Grain Cult · the Grain Cult presses +6 a turn · ' +
        '3 of 4 citizens follow the Way of the Hearth',
    );
    expect(plate.spoken).not.toContain('✶');
  });
});

describe('the plate on a town your faith has not reached', () => {
  /**
   * Not blank. "This one is not mine, and here is whose it is" is half the answer
   * to the question the lens was raised to ask — so it names the congregations the
   * seat can see, in the banner's ink, and says in words why it is neutral.
   */
  it('names whose it is, in that founder’s ink, and says yours does not reach', () => {
    const { state } = faithWorld();
    // Take the anchor away: with no holy site in range, nothing of Azure's
    // reaches Lagash at all.
    getTileAt(state.map, 5, 4)!.improvement = undefined;
    const plate = plateAt(faithPlates(state, 0), 10, 6)!;
    expect(plate.text).toBe('W ✶ 3 of 4');
    // Crimson's, because the banner is the one that answers "whose town is this".
    expect(plate.ink).toBe('#8f2a2a');
    expect(plate.spoken).toBe(
      'Lagash · 3 of 4 citizens follow the Way of the Hearth · the Grain Cult does not reach it',
    );
  });

  it('says so plainly for a seat that has founded no religion at all', () => {
    const { state } = faithWorld();
    // Seat 2 has walked nowhere, so it may read nothing — give it Azure's fog and
    // ask again, and it is a seat with sight and no faith.
    state.visibility[2] = state.visibility[0]!.slice();
    const plate = plateAt(faithPlates(state, 2), 10, 6)!;
    expect(plate.text).toBe('W ✶ 3 of 4');
    expect(plate.spoken).toContain('you have founded no religion');
  });
});

describe('the plate on a town the seat only remembers', () => {
  /**
   * **The leak, one surface over.** A sighting is a name, an owner and a position
   * — nothing about belief — so the plate prints no count at all, and only the
   * seat's own faith. It is `faithHoverReading`'s filter doing the work, which is
   * exactly why this module folds that reading rather than `explainPressure`.
   */
  it('prints the seat’s own tide, no congregation, and says it is a memory', () => {
    const { state, theirs } = faithWorld();
    const plate = plateAt(faithPlates(state, 0), 13, 9)!;
    expect(plate.text).toBe('G +3 a turn · last seen');
    expect(plate.spoken).toBe('Nippur · last seen · the Grain Cult presses +3 a turn');
    // The rival genuinely presses there — a filter doing work, not a world with
    // nothing in it to leak.
    expect(plate.text).not.toContain(religionDevice(theirs.name));
    expect(plate.text).not.toContain(' of ');
  });

  it('is the bare memory when nothing of yours reaches it', () => {
    const { state } = faithWorld();
    // Azure's caravan is what carries its faith out there; without it there is
    // nothing of the seat's own on that town's ledger.
    state.units = state.units.filter((unit) => unit.trade === undefined || unit.ownerId !== 0);
    const plate = plateAt(faithPlates(state, 0), 13, 9)!;
    expect(plate.text).toBe('last seen');
    expect(plate.spoken).toBe('Nippur · last seen · nothing of yours presses here');
  });

  it('has no plate at all on a town the seat has never sighted', () => {
    const { state } = faithWorld();
    // Seat 1 has never seen Uruk: no plate, not an empty one — the readout's own
    // Terra Incognita rule.
    expect(plateAt(faithPlates(state, 1), 4, 4)).toBeUndefined();
  });
});

// --- the holy site -----------------------------------------------------------

describe('the holy site’s own plate', () => {
  /**
   * "How much pressure is given off by each city / holy site" — a site has no
   * followers, so it says what it projects and how far. The figures are asked the
   * way `explainPressure` asks them, so the number on the anchor is the number
   * the towns in its ring receive.
   */
  it('says what it projects and how far, in its religion’s ink', () => {
    const { state } = faithWorld();
    const plate = plateAt(faithPlates(state, 0), 5, 4)!;
    expect(plate.text).toBe('Holy site · +6 · range 6');
    expect(plate.spoken).toBe(
      'A holy site of the Grain Cult · presses +6 a turn on every city within 6 hexes',
    );
    expect(plate.ink).toBe('#2a4d8f');
    expect(plate.inert).toBe(true);
  });

  /**
   * The **improvement** rule, not the camp's: a site is a building standing on
   * ground, and this codebase draws remembered improvements on remembered hexes.
   * Seat 1 has never walked near Uruk, so it sees no anchor there.
   */
  it('is drawn on explored ground and nowhere else', () => {
    const { state } = faithWorld();
    expect(plateAt(faithPlates(state, 1), 5, 4)).toBeUndefined();
  });

  /**
   * And a hex carrying both a town and a site gets **one** plate with both
   * clauses. `createMapPlates` keys a plate by its hex, so two plates on one hex
   * would silently be one plate showing whichever supplier ran last — a site on a
   * town's own centre would have deleted that town's followers from the chart.
   */
  it('merges with a town standing on the same hex rather than replacing it', () => {
    const { state } = faithWorld();
    getTileAt(state.map, 4, 4)!.improvement = 'holySite';
    const here = faithPlates(state, 0).filter((plate) => plate.col === 4 && plate.row === 4);
    expect(here).toHaveLength(1);
    expect(here[0]!.text).toBe('G ✶ 3 of 5 · +16 a turn · Holy site · +6 · range 6');
  });
});

// --- the world with no religions in it ---------------------------------------

describe('a world nobody has founded a faith in', () => {
  it('draws nothing at all', () => {
    const { state } = faithWorld();
    state.religions = [];
    expect(faithPlates(state, 0)).toEqual([]);
  });
});

// --- the city screen’s header line -------------------------------------------

describe('cityFaithHeadline', () => {
  it('names the faith, the banner mark, the congregation and the tide', () => {
    const { state } = faithWorld();
    const head = cityFaithHeadline(state, state.cities[0]!, 0)!;
    expect(head.text).toBe('Following the Grain Cult ✶ · 3 of 5 citizens · +10 a turn');
    expect(head.majority).toBe(true);
    expect(head.founderColor).toBe('#2a4d8f');
  });

  /**
   * The second state the ruling names: pressed but following nobody. The seat's
   * own faith is named first when it has a claim, because the reader is the one
   * deciding whether to press harder.
   */
  it('says who is pressing when the town follows nobody', () => {
    const { state } = faithWorld();
    // Nobody flies a banner in Uruk: five citizens, two of them converted.
    state.cities[0]!.followers = { 0: 1, 1: 1 };
    const head = cityFaithHeadline(state, state.cities[0]!, 0)!;
    expect(head.text).toBe('Follows no religion · the Grain Cult presses +10 a turn');
    expect(head.majority).toBe(false);
    expect(head.pressure).toBe(10);
  });

  it('is the bare sentence when nothing at all is pulling', () => {
    const { state } = faithWorld();
    // A town nobody has reached: no congregation, and the two caravans that
    // carried a faith out to it taken off the board.
    state.units = state.units.filter((unit) => unit.trade === undefined);
    state.cities[2]!.followers = {};
    const head = cityFaithHeadline(state, state.cities[2]!, 0)!;
    expect(head.text).toBe('Follows no religion');
    expect(head.religion).toBeNull();
    expect(head.pressure).toBe(0);
  });

  it('is null before anybody has founded anything', () => {
    const { state } = faithWorld();
    state.religions = [];
    expect(cityFaithHeadline(state, state.cities[0]!, 0)).toBeNull();
  });

  /** And the header actually prints it, beside the name rather than under it. */
  it('is drawn in the city header, in the same voice as Size and hp', () => {
    const panel = sourceOf('cityPanel.ts');
    expect(panel).toContain('const belief = renderFaithHeadline(city);');
    expect(panel).toContain("if (belief) title.append(belief);");
    // And the block under the citizens keeps every word it had.
    expect(panel).toContain('function renderFollowers(');
  });
});

// --- the Religion sheet’s following list --------------------------------------

describe('the following-cities list', () => {
  /**
   * The pressure figure on each row (item 3 of the ruling): "how many follow me
   * here" and "am I still gaining here" are two different questions, and the row
   * used to answer only the first.
   */
  it('carries each town’s pressure per turn, folded from its own ledger', () => {
    const { state } = faithWorld();
    const rows = religionReading(state, 0).following;
    const uruk = rows.find((row) => row.name.startsWith('Uruk'))!;
    expect(uruk.pressure).toBe(10);
    expect(uruk.pressure).toBe(uruk.ledger.reduce((sum, line) => sum + line.amount, 0));
    // Only towns that actually hold a follower are listed, which is the pane's
    // own rule and is why Nippur — pressed, unconverted — is not on it.
    expect(rows.map((row) => row.name)).not.toContain('Nippur');
  });

  it('prints it on the row, and never as “+0 a turn”', () => {
    const screen = sourceOf('religionScreen.ts');
    expect(screen).toContain("'rel-town-press'");
    expect(screen).toContain('if (town.pressure > 0)');
  });
});

// --- the wiring ---------------------------------------------------------------

describe('the plates are the faith lens’s and nothing else’s', () => {
  const main = sourceOf('main.ts');

  it('draws nothing unless the faith lens is the one on the board', () => {
    expect(main).toContain("controls.boardLens() === 'faith'");
    expect(main).toContain('faithPlates(game.state, controls.localPlayerId())');
  });

  /**
   * `boardLens`, never `lens()` — the menu's answer is what the player *chose*,
   * and a prophet raises the lens without the menu. The card makes the same claim
   * one surface over.
   */
  it('asks the board’s lens rather than the menu’s', () => {
    const layer = main.slice(main.indexOf('const faithMarks'), main.indexOf('renderer.setFrameListener'));
    expect(layer).not.toContain('controls.lens()');
  });

  /** One layer, two suppliers — never a second `<div>`-over-the-canvas overlay. */
  it('is the price plates’ own layer with a second supplier', () => {
    expect(main).toContain('createMapPlates({');
    expect(main).toContain('container: bannersEl,');
  });

  it('rides the frame beat and the panel refresh, like the price plates', () => {
    const beat = main.slice(main.indexOf('renderer.setFrameListener?.('));
    expect(beat.slice(0, 600)).toContain('faithMarks.reposition()');
    expect(fn('main.ts', 'updatePanel')).toContain('faithMarks.refresh()');
  });
});

describe('a plate never takes the pointer', () => {
  it('is inert on every plate this module makes', () => {
    const { state } = faithWorld();
    for (const plate of faithPlates(state, 0)) {
      expect(plate.inert).toBe(true);
      expect(plate.disabled).toBe(false);
    }
  });

  /**
   * And the layer honours it: an inert plate is `disabled` as well as
   * pointer-transparent, because the stylesheet is a thing a gallery could
   * photograph without and the property is the rule.
   */
  it('is disabled by the plate layer, not only by the stylesheet', () => {
    expect(fn('tilePriceTags.ts', 'refresh')).toContain("plate.inert === true");
    expect(sourceOf('tilePriceTags.ts')).toContain('--seat-ink');
  });
});

describe('one reading, two surfaces', () => {
  /**
   * The load-bearing claim of the module: every figure is the hover card's, so
   * the fog rule that stops the leak is written once. A plate layer that folded
   * `explainPressure` for itself would be a second reading of exactly the rule
   * that is silent when it is wrong.
   */
  it('folds the hover card’s reading and never explains a pressure itself', () => {
    const plates = sourceOf('faithPlates.ts');
    expect(plates).toContain('faithHoverReading(state, city, seat)');
    expect(plates).not.toContain('explainPressure');
  });

  /** And there is no proclamation plate: a lump leaves nothing standing. */
  it('has no proclamation to draw', () => {
    const plates = sourceOf('faithPlates.ts');
    expect(plates).not.toContain('pulses');
    expect(plates).not.toContain('Proclamation');
  });
});
