/**
 * The 3D Abacus on the bead sheet (2026-11-18, `docs/flags.md`, "Age turn-over:
 * a missing plate, the abacus motion, and a faster clock").
 *
 * The user saw the 2D rod at an age turn-over and asked for the 3D frame. The
 * sheet now mounts the frame the Abacus screen and the Opus close use, and the
 * new bead slides onto the reader's rod.
 *
 * Two halves are checked here:
 * - `frameSeeds`, the pure part: what each rod stands at when the sheet rises,
 *   and which bead slides. A wrong answer shows a bead twice or not at all, and
 *   throws nothing.
 * - The wiring, read off the sources: the one switch, the 2D fallback, the
 *   frame given back when the sheet moves on, and `main.ts` handing the sheet
 *   the table. This suite has no WebGL, so the stage itself is not built here.
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import type { BeadCardId } from '../../src/sim/beadData';
import { opusBuildingId } from '../../src/sim/score';
import type { EarnedBead } from '../../src/sim/state';
import type { AbacusRow } from '../../src/ui/abacusScreen';
import { type BeadTable, frameGround, frameSeeds } from '../../src/ui/beadAwardFrame';
import { cssHex } from '../../src/render3d/abacus3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { beadPraise } from '../../src/ui/beadModal';
import { BEAD_GRANT_IDS } from '../../src/sim/beadData';
import { braceBody, uiSource } from './sourceHelpers';

const PER_ROD = 13;

function bead(family: EarnedBead['family'], turn: number): EarnedBead {
  return { id: 'theWagerOfArms', kind: 'grant', family, turn };
}

function goldenBead(turn: number): EarnedBead {
  const grant = (buildingDef(opusBuildingId()!).onComplete ?? []).find((entry) => entry.grant === 'bead');
  if (grant === undefined || grant.grant !== 'bead') throw new Error('the Opus mints no bead');
  return { id: grant.bead as BeadCardId, kind: 'grant', family: 'culture', turn };
}

function row(playerId: number, beads: EarnedBead[]): AbacusRow {
  return { playerId, name: `Seat ${playerId}`, color: 0x336699, beads };
}

/** Three seats. The reader is seat 1, and its rod is handed over separately. */
function table(): BeadTable {
  return {
    rows: [row(0, [bead('science', 40)]), row(1, []), row(2, [bead('culture', 30), bead('economic', 50)])],
    seat: 1,
  };
}

describe('frameSeeds', () => {
  it('stands every other rod as it is, and slides the new bead onto the reader’s', () => {
    const rod = [bead('culture', 60), bead('domination', 70)];
    const plan = frameSeeds(table(), rod, true, PER_ROD);
    expect(plan.mine).toBe(1);
    expect(plan.seeds[0]).toEqual(['philosophy']);
    expect(plan.seeds[2]).toEqual(['culture', 'commerce']);
    // The reader's rod starts without the new bead, and the new bead slides.
    expect(plan.seeds[1]).toEqual(['culture']);
    expect(plan.arriving).toBe('conquest');
  });

  it('reads the reader’s rod off the award, not off the table', () => {
    // The table is asked when the sheet is drawn, and a second sheet in the
    // queue would otherwise draw beads this award did not bring.
    const later = table();
    later.rows = later.rows.map((one) =>
      one.playerId === 1 ? row(1, [bead('culture', 60), bead('domination', 70), bead('science', 71)]) : one,
    );
    const plan = frameSeeds(later, [bead('culture', 60), bead('domination', 70)], true, PER_ROD);
    expect(plan.seeds[1]).toEqual(['culture']);
    expect(plan.arriving).toBe('conquest');
  });

  it('shows the rod as it stands, with no slide, when the sheet asks for none', () => {
    // Reduced motion, or a bead the 2D rod would not animate either.
    const plan = frameSeeds(table(), [bead('culture', 60), bead('domination', 70)], false, PER_ROD);
    expect(plan.seeds[1]).toEqual(['culture', 'conquest']);
    expect(plan.arriving).toBeNull();
  });

  it('never slides the golden bead, which the frame leaves off', () => {
    const plan = frameSeeds(table(), [bead('culture', 60), goldenBead(90)], true, PER_ROD);
    expect(plan.seeds[1]).toEqual(['culture']);
    expect(plan.arriving).toBeNull();
  });

  it('slides nothing once the rod is longer than the frame is cut for', () => {
    const long = Array.from({ length: PER_ROD + 1 }, (_, at) => bead('science', at));
    const plan = frameSeeds(table(), long, true, PER_ROD);
    expect(plan.seeds[1]).toHaveLength(PER_ROD);
    expect(plan.arriving).toBeNull();
  });

  it('slides nothing for a reader with no rod at the table', () => {
    const plan = frameSeeds({ ...table(), seat: 9 }, [bead('culture', 60)], true, PER_ROD);
    expect(plan.mine).toBe(-1);
    expect(plan.arriving).toBeNull();
  });
});

describe('the line that congratulates (2026-11-18)', () => {
  it('says a kept wager was kept', () => {
    expect(beadPraise('theWagerOfThePurse' as BeadCardId, 'grant')).toBe('You kept this wager. A bead is yours.');
    expect(beadPraise('theWagerOfArms' as BeadCardId, 'grant')).toBe('You kept this wager. A bead is yours.');
  });

  it('names a grant’s source in its own plain words', () => {
    expect(beadPraise('theStarChart' as BeadCardId, 'grant')).toBe('A bead is yours, for raising Chart the Stars.');
    expect(beadPraise('theClosingWork' as BeadCardId, 'grant')).toBe(
      'A bead is yours, for completing Alchemy, the last technology of the age.',
    );
  });

  it('says only that the bead is yours when the award carries no source', () => {
    expect(beadPraise('theRoadBuilder' as BeadCardId, 'quest')).toBe('A bead is yours.');
  });

  it('writes no figure into any line a grant can raise', () => {
    for (const id of BEAD_GRANT_IDS) expect(beadPraise(id, 'grant'), id).not.toMatch(/\d/);
  });

  it('stands under the name on the page, and the frame is fitted clear of both', () => {
    const modal = uiSource('beadModal.ts');
    const page = braceBody(modal, 'function renderPage(');
    expect(page).toContain("element('p', 'bead-page-praise', face.praise)");
    expect(page).toContain('{ above: head, below: tally }');
    const frame = uiSource('beadAwardFrame.ts');
    expect(frame).toContain('stage.setClearBands(top, bottom);');
  });
});

describe('the sheet’s wiring', () => {
  const modal = uiSource('beadModal.ts');
  const frame = uiSource('beadAwardFrame.ts');

  it('has one switch, and it is on', () => {
    expect(modal).toContain('export const BEAD_SHEET_FRAME_3D = true;');
    expect(modal).toContain('const table = BEAD_SHEET_FRAME_3D ? (options.table?.() ?? null) : null;');
  });

  it('draws the old sheet with the 2D rod with no table, and when the frame cannot be built', () => {
    const render = braceBody(modal, 'function render(): void');
    expect(render).toContain('if (table !== null && renderPage(news, face, table)) return;');
    expect(render).toContain('renderSheet(face);');
    expect(braceBody(modal, 'function renderSheet(')).toContain('abacus.append(drawWire(face));');
    const page = braceBody(modal, 'function renderPage(');
    expect(page).toContain('if (frame === null) {');
    expect(page).toContain('return false;');
    // The frame is built after the page is on screen: the stage measures its box.
    expect(page.indexOf('container.hidden = false;')).toBeLessThan(page.indexOf('mountBeadAwardFrame('));
  });

  it('is a full-screen page with the name, the frame, the count line and Proceed, and no other text', () => {
    // The user, 2026-11-18: "too much text in this description, and the purple
    // dot on the top feels amateurish. Let's just have the title ... and the
    // abacus, full screen with the animation."
    const page = braceBody(modal, 'function renderPage(');
    expect(page).toContain("container.classList.add('is-bead-page');");
    expect(page).toContain("element('h2', 'bead-page-title', face.name)");
    expect(page).toContain("element('figcaption', 'bead-award-tally', face.tally)");
    expect(page).toContain('footOf(face)');
    for (const gone of ['bead-award-crest', 'beadChipNode(', 'face.line', 'face.deed', 'face.boon']) {
      expect(page, gone).not.toContain(gone);
    }
    const css = uiSource('style.css');
    const overlay = css.slice(css.indexOf('.triumph-overlay.is-bead-page {'));
    expect(overlay.slice(0, overlay.indexOf('}'))).toContain('padding: 0;');
    // The frame fills the window, as the Opus close's page does.
    expect(css).toMatch(/\.bead-page-abacus \{\s*position: absolute;\s*inset: 0;/);
    expect(css).toMatch(/\.bead-award-stage \{\s*position: absolute;\s*inset: 0;\s*\}/);
  });

  it('slides the bead only where the 2D rod would have animated it', () => {
    expect(modal).toContain('mountBeadAwardFrame(abacus, table, news.rod, face.arriving !== null, ');
  });

  it('leaves the page’s text where the player can still read it', () => {
    // The chronicle's line names the bead, its family and what it paid, and the
    // bead ledger prints each bead row's text (its "What pays a bead" list).
    const controls = uiSource('controls.ts');
    expect(controls).toContain('announce(`A bead: ${award.name} (${family})${paid}`');
    const ledger = uiSource('beadsScreen.ts');
    expect(braceBody(ledger, 'function drawGrants(')).toContain('setDescriptorText(deed, face.deed');
  });

  it('gives the WebGL context back when the sheet moves on or closes', () => {
    expect(braceBody(modal, 'function render(): void')).toContain('dropFrame();');
    expect(braceBody(modal, 'function clear(): void')).toContain('dropFrame();');
    const dispose = braceBody(frame, 'dispose(): void {');
    expect(dispose).toContain('stage.dispose();');
    expect(dispose).toContain("window.removeEventListener('resize', onResize);");
  });

  it('is the Abacus’s own stage and slide, not a second drawing', () => {
    expect(frame).toContain("from '../render3d/abacus3d'");
    expect(frame).toContain('new AbacusStage(');
    expect(frame).toContain('stage.earn(plan.mine, family)');
    expect(frame).toContain("from './abacusScreen'");
  });

  it('is handed the Abacus screen’s own rows, the local seat and the world’s age by the page', () => {
    // Look B (2026-11-19): the age is the plaque's numeral, as the top bar prints it.
    const main = uiSource('main.ts');
    const sheet = main.slice(main.indexOf('beadSheet = createBeadModal('));
    expect(sheet.slice(0, sheet.indexOf('});'))).toContain(
      'table: () => ({ rows: abacusRows(), seat: controls.localPlayerId(), age: shownAge(game.state).age }),',
    );
    expect(frame).toContain('{ age: table.age ?? null }');
  });
});

describe('the ground under the frame (look B, 2026-11-19)', () => {
  it('is the colour at the edge of the abacus’s own ground, so no seam shows between canvas and page', () => {
    expect(frameGround()).toBe(cssHex(VIEW3D.abacus.ground.edgeColor));
  });

  it('is the background of the bead page and of the Opus close’s page', () => {
    expect(braceBody(uiSource('beadModal.ts'), 'function renderPage(')).toContain('page.style.background = frameGround();');
    expect(uiSource('opusClose.ts')).toContain('page.style.background = frameGround();');
  });
});
