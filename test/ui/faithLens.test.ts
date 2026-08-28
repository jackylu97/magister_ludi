/**
 * The faith lens's two halves, ruled on 2026-08-28: **a religious piece raises
 * it**, and **hovering a town under it prints that town's pressure ledger**.
 *
 * Two kinds of test, this suite's usual split (`religionV2.test.ts`). The rule
 * that decides a lens and the reading that decides what a seat may know are
 * pure, exported, and driven for real against a world with two faiths in it;
 * the *wiring* — a renderer, a pointer, an `infoCard` — is asserted by reading
 * the source, because its failure mode is a surface asking the wrong function
 * and that is visible in which name a file called, never in a rendered output.
 *
 * The claim worth the most here is the **leak**. `explainPressure` is omniscient
 * and a hover card is not: a town the seat has sighted and cannot currently see
 * must not report its congregation, its banner, or any faith but the seat's own.
 * That is one filter in one function, it is silent when it is wrong, and no
 * behavioural test in this repo would notice — so it is pinned three ways here,
 * on a fixture built by driving visibility rather than by writing grids.
 *
 * That fixture now lives in `faithHelpers.ts`, because the lens grew a second
 * surface (`faithPlates.test.ts`, the standing plates) and the claim worth the
 * most about the pair is that they cannot disagree about a town — which they can
 * only be held to against **one** world.
 */

import { describe, expect, it } from 'vitest';

import { explainPressure } from '../../src/sim/religion';
import { unitDef } from '../../src/sim/unitData';
import { lensForSelection } from '../../src/ui/controls';
import { faithHoverReading, faithHoverText } from '../../src/ui/faithHover';
import { faithWorld, fn, sourceOf } from './faithHelpers';

// --- which lens a piece raises ----------------------------------------------

describe('lensForSelection', () => {
  /**
   * The ruling's own three cases, plus the one it implies. Asked of the roster's
   * markers so a second prophet or a second augur inherits the lens with its
   * data row — which is the whole reason the rule reads `prophesies` and
   * `consecrates` rather than two names.
   */
  it('raises the faith lens for a prophet', () => {
    expect(unitDef('prophet').prophesies).toBe(true);
    expect(lensForSelection(unitDef('prophet'), 'none')).toBe('faith');
  });

  it('raises it for an augur too — the Preaching is a pulse laid on the board', () => {
    expect(unitDef('augur').consecrates).toBe(true);
    expect(lensForSelection(unitDef('augur'), 'none')).toBe('faith');
  });

  /**
   * A warrior raises **no faith lens**. It raises the explorer lens, which is
   * the rule that predates this ruling and is untouched by it — "→ none" in the
   * ruling means "nothing religious", and asserting both halves is what keeps a
   * future edit from buying one at the cost of the other.
   */
  it('raises nothing religious for a fighting piece', () => {
    expect(lensForSelection(unitDef('warrior'), 'none')).not.toBe('faith');
    expect(lensForSelection(unitDef('warrior'), 'none')).toBe('explorer');
  });

  /** And a piece that asks no question of its own leaves the player's choice. */
  it('leaves an ordinary civilian alone', () => {
    expect(lensForSelection(unitDef('worker'), 'none')).toBe('none');
    expect(lensForSelection(unitDef('worker'), 'explorer')).toBe('explorer');
  });

  it('is the settler lens for a settler, which still wins', () => {
    expect(lensForSelection(unitDef('settler'), 'none')).toBe('settler');
  });

  /**
   * The half of the old "faith is never auto-raised" note that survives: a
   * player who went to the menu for it has not stopped asking because they
   * clicked a warrior. It is a rule about the *manual* lens alone, so dropping
   * the piece puts the automatic set straight back.
   */
  it('lets a manual faith lens beat every piece', () => {
    for (const type of ['warrior', 'settler', 'worker', 'prophet'] as const) {
      expect(lensForSelection(unitDef(type), 'faith')).toBe('faith');
    }
    expect(lensForSelection(null, 'faith')).toBe('faith');
    // And it is the manual lens that is beaten back, never overwritten: with the
    // menu on `none`, the piece rules answer as they always did.
    expect(lensForSelection(unitDef('settler'), 'none')).toBe('settler');
  });
});

describe('the fixture itself', () => {
  it('is watched, watched and remembered — the three readings the card has', () => {
    const { state } = faithWorld();
    expect(faithHoverReading(state, state.cities[0]!, 0)?.knowledge).toBe('watched');
    expect(faithHoverReading(state, state.cities[1]!, 0)?.knowledge).toBe('watched');
    expect(faithHoverReading(state, state.cities[2]!, 0)?.knowledge).toBe('remembered');
  });
});

// --- what the card says ------------------------------------------------------

describe('faithHoverText, on the seat’s own town', () => {
  it('names the town, its size, its banner, and every faith with a claim', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[0]!, 0);
    expect(text.split('\n')).toEqual([
      'Uruk ✶ · Azure · 5 citizens · follows the Grain Cult',
      'the Grain Cult · 3 of 5 — Holy site +6 · Your capital +4 — 10 a turn',
      // A faith with followers and no pressure — the tide carried it here and
      // has since receded. Not "Nothing presses here.", which is the *card's*
      // sentence for a town nothing has reached.
      'the Way of the Hearth · 1 of 5 — nothing presses',
      '1 of 5 follow the old gods.',
    ]);
  });
});

describe('faithHoverText, on a foreign town the seat can see', () => {
  it('reports the whole tide, its own faith and the rival’s alike', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[1]!, 0);
    expect(text.split('\n')).toEqual([
      'Lagash ✶ · Crimson · 4 citizens · follows the Way of the Hearth',
      // Founding order, `state.religions`' own — never "mine first". A faith
      // with no followers here and real pressure is exactly the reading a
      // player raises this lens to get.
      'the Grain Cult · 0 of 4 — Holy site +6 — 6 a turn',
      'the Way of the Hearth · 3 of 4 — Your capital +4 — 4 a turn',
      '1 of 4 follow the old gods.',
    ]);
  });
});

describe('faithHoverText, on a foreign town the seat only remembers', () => {
  /**
   * **The leak test.** A sighting is a name, an owner and a position
   * (`CitySighting`) — nothing about belief — so the card prints the one half
   * the seat genuinely owns: what its *own* faith presses there.
   */
  it('says only what the seat’s own faith presses, and says it is a memory', () => {
    const { state } = faithWorld();
    const text = faithHoverText(state, state.cities[2]!, 0);
    expect(text.split('\n')).toEqual([
      'Nippur · Crimson · last seen',
      // No count, because a sighting holds none. No banner, for the same
      // reason. And no rival faith at all — see below.
      'the Grain Cult — Trade route +3 — 3 a turn',
    ]);
  });

  it('leaks no congregation, no banner and no rival faith', () => {
    const { state, theirs } = faithWorld();
    // The rival genuinely presses here — this is a filter doing work, not a
    // world in which there was nothing to leak.
    expect(
      explainPressure(state, state.cities[2]!).some((line) => line.religion === theirs.id),
    ).toBe(true);
    const reading = faithHoverReading(state, state.cities[2]!, 0)!;
    expect(reading.population).toBeNull();
    expect(reading.majority).toBeNull();
    expect(reading.unconverted).toBeNull();
    expect(reading.faiths.map((faith) => faith.religion)).not.toContain(theirs.id);
    for (const faith of reading.faiths) expect(faith.following).toBeNull();
  });

  /**
   * And no temple line. It is a percentage taken because *that town* built a
   * temple, and which way the multiplier falls turns on the banner the town
   * currently flies — both of them facts a seat who cannot see the place does
   * not have. Dropping the line rather than the ledger keeps rule 5 intact: the
   * total printed is the fold of the lines printed.
   */
  it('drops the temple’s line, which is a fact about the town', () => {
    const { state } = faithWorld();
    state.cities[2]!.buildings.push('temple');
    const reading = faithHoverReading(state, state.cities[2]!, 0)!;
    for (const faith of reading.faiths) {
      expect(faith.ledger.map((line) => line.source)).not.toContain('Temple');
    }
    // Still the fold of what it shows.
    expect(faithHoverText(state, state.cities[2]!, 0)).toContain('Trade route +3 — 3 a turn');
  });

  it('has nothing to say when the seat has founded no faith at all', () => {
    const { state } = faithWorld();
    // Seat 2 has walked nowhere, so it may not read the town at all…
    expect(faithHoverReading(state, state.cities[2]!, 2)).toBeNull();
    // …and a seat that remembers it but keeps no faith says exactly that.
    state.visibility[2] = state.visibility[0]!.slice();
    const reading = faithHoverReading(state, state.cities[2]!, 2);
    expect(reading).toBeNull();
  });
});

describe('faithHoverReading, on ground nobody has walked', () => {
  it('is null — the readout’s own Terra Incognita rule', () => {
    const { state } = faithWorld();
    // Seat 1 has never seen Uruk: no card, not an empty one.
    expect(faithHoverReading(state, state.cities[0]!, 1)).toBeNull();
  });
});

// --- the wiring --------------------------------------------------------------

describe('the card is the faith lens’s and nothing else’s', () => {
  const main = sourceOf('main.ts');

  const card = fn('main.ts', 'updateFaithCard');

  it('is raised only while the faith lens is the one on the board', () => {
    expect(card).toContain("controls.boardLens() !== 'faith'");
  });

  /**
   * `boardLens`, never `lens()`. The menu's answer is what the player *chose*;
   * a prophet raises the lens without the menu, and a card that read the menu
   * would go dark in exactly the case this pass exists for.
   */
  it('asks the board’s lens rather than the menu’s', () => {
    expect(sourceOf('controls.ts')).toContain('boardLens: () => effectiveLens().mode');
    expect(card).not.toContain('controls.lens()');
  });

  it('is the shared hover card, non-sticky, anchored to the hex', () => {
    expect(main).toContain("createInfoCard({ className: 'info-card is-board' })");
    expect(main).not.toContain("className: 'info-card is-board', sticky");
    // Anchored through the renderer's own projection, which is the inverse of
    // picking — the city banners' mechanism, one card over.
    expect(card).toContain('renderer.projectCell?.(city.col, city.row)');
    expect(card).toContain('faithInfo.showAt(');
  });

  /**
   * The tile readout is untouched. The two **stack**: the readout is pinned to
   * its corner and the card is anchored to the hex, so a player under the faith
   * lens still reads the terrain, the yields and what is standing there.
   */
  it('does not replace the ordinary tile readout', () => {
    const context = main.slice(
      main.indexOf('function updateContext('),
      main.indexOf('function updateFaithCard('),
    );
    for (const row of ['infoTerrain', 'infoFeature', 'infoUnit', 'infoImprovement']) {
      expect(context).toContain(row);
    }
    expect(context).toContain('updateFaithCard(hover, true)');
  });

  it('rides the renderer’s frame beat, so a pan moves it with its hex', () => {
    const beat = main.slice(main.indexOf('renderer.setFrameListener?.('));
    expect(beat.slice(0, 600)).toContain('updateFaithCard(renderer.getHover(), false)');
  });
});

describe('the faith lens’s rack row', () => {
  const main = sourceOf('main.ts');

  /**
   * It looks like the other two: a name and a tick. The `tail` clause was the
   * one thing making it odd, and it is gone from the record as well as from the
   * row — an optional field with no reader is an invitation to make one row
   * strange again (user, 2026-08-28).
   */
  it('is label-only, with no tail clause on it or in the record', () => {
    expect(main).not.toContain('tail:');
    expect(main).not.toContain('lens-option-tail');
    const rack = main.slice(main.indexOf('interface LensOption'), main.indexOf('const LENS_OPTIONS'));
    expect(rack).not.toContain('tail');
  });

  it('still carries the key to its three marks, and now the gesture too', () => {
    expect(main).toContain('wash = the founder’s ink, darker is stronger; tight ring = holy site;');
    expect(main).toContain('hover a city for its pressure');
  });
});
