/**
 * **The charter shelf and its tab** (Scientific batch S10, the approved
 * prototype `docs/plans/mockups/charter-ux.html` step 3; the rulings are
 * `docs/plans/scientific-themes.md` section 12).
 *
 * The user's ruling, 2026-10-21: *"only show if drafted. Also, if no charters
 * have been drafted, don't show the section. There should be some indicator
 * that it's there for screens that aren't wide enough."* This file checks the
 * three halves of that:
 *
 *   - the shelf holds the drafted charter technologies only, and nothing
 *     before the first charter (`shelfTechs`);
 *   - the shelf packs as a second field under the sky, and a chart with no
 *     shelf is the sky alone, to the pixel (`packShelf`, `stackFields`);
 *   - the tab shows only while no charter node is in view, on the side of the
 *     nearest one, with the count and an arrow (`shelfTab`).
 *
 * There is no DOM in this suite, so what the star chart draws is pinned from
 * its source, the way `techChart.test.ts` pins the plan strip.
 */

import { describe, expect, it } from 'vitest';

import { playerById } from '../../src/sim/state';
import { CHARTER_TECH_IDS, type TechId, TECH_IDS } from '../../src/sim/techData';
import {
  SHELF_TAB_MIN_SEEN,
  type StageBox,
  chartLead,
  leadFigureOf,
  shelfTab,
  shelfTabLabel,
  shelfTechs,
  wearsLeadCorner,
} from '../../src/ui/charterTech';
import { techLead } from '../../src/sim/rivals';
import {
  PACK_GAP_MAX,
  SHELF_BAND,
  type PackCard,
  packChart,
  packShelf,
  stackFields,
} from '../../src/ui/techFit';
import { researchingGame } from '../sim/techHelpers';
import { braceBody, uiSource } from './sourceHelpers';

function chartFunction(declaration: string): string {
  return braceBody(uiSource('techTree.ts'), declaration);
}

describe('the shelf holds drafted charter technologies only', () => {
  it('is empty before the first charter', () => {
    const g = researchingGame();
    expect(shelfTechs(playerById(g.state, 0))).toEqual([]);
    expect(shelfTechs(undefined)).toEqual([]);
  });

  it('holds what this seat drafted, in the rows’ order, and nothing a rival drafted', () => {
    const g = researchingGame();
    // Drafted out of order on purpose: the shelf follows the file, never the
    // order the seat happened to draft in.
    playerById(g.state, 0)!.charteredTechs.push('mechanics', 'casting');
    playerById(g.state, 1)!.charteredTechs.push('optics');
    expect(shelfTechs(playerById(g.state, 0))).toEqual(['casting', 'mechanics']);
    expect(shelfTechs(playerById(g.state, 1))).toEqual(['optics']);
    // Every shelf node is a charter row, never a star of the sky.
    for (const id of shelfTechs(playerById(g.state, 0))) {
      expect(CHARTER_TECH_IDS).toContain(id);
      expect(TECH_IDS).not.toContain(id);
    }
  });
});

describe('the shelf packs as a second field', () => {
  const GEOMETRY = { columnWidth: 214, columnGap: 52 };

  it('is the sky alone, to the pixel, when the shelf is empty', () => {
    expect(stackFields(524, null)).toEqual({ shelfTop: 524, ruleTop: 524, height: 524 });
    expect(stackFields(524, packShelf([], PACK_GAP_MAX))).toEqual({
      shelfTop: 524,
      ruleTop: 524,
      height: 524,
    });
  });

  it('hangs the shelf from its rule: top-aligned, in authored order, at the gap', () => {
    const cards: PackCard[] = [
      { id: 'b', column: 4, order: 1, height: 70 },
      { id: 'a', column: 4, order: 0, height: 60 },
      { id: 'c', column: 8, order: 0, height: 90 },
    ];
    const shelf = packShelf(cards, 10);
    expect(shelf.tops.get('a')).toBe(0);
    expect(shelf.tops.get('b')).toBe(70);
    expect(shelf.tops.get('c')).toBe(0);
    // The tallest column: 60 + 10 + 70.
    expect(shelf.height).toBe(140);
    const fields = stackFields(500, shelf);
    expect(fields.shelfTop).toBe(500 + SHELF_BAND);
    expect(fields.height).toBe(500 + SHELF_BAND + 140);
    // The rule sits in the band, between the sky and the shelf.
    expect(fields.ruleTop).toBeGreaterThan(500);
    expect(fields.ruleTop).toBeLessThan(fields.shelfTop);
  });

  it('leaves the sky’s own pack untouched, because the sky is packed alone', () => {
    // The same cards and edges with and without a shelf beside them: the sky is
    // `packChart` of the sky's cards only, so its pins in `techChart.test.ts`
    // cannot move when a seat drafts a charter.
    const sky: PackCard[] = [
      { id: 'x', column: 0, order: 0, height: 50 },
      { id: 'y', column: 1, order: 0, height: 50 },
    ];
    const alone = packChart(sky, [['x', 'y']], PACK_GAP_MAX, GEOMETRY);
    const body = chartFunction('function layoutField(');
    expect(body).toContain('packChart(measured, edges, gap, geometry)');
    expect(body).toContain('packShelf(shelved, gap)');
    expect(body).toContain('stackFields(packed.sky.height, packed.shelved)');
    expect(alone.height).toBe(50);
  });

  it('builds no shelf, rule or label before the first charter', () => {
    const body = chartFunction('function renderChart(');
    expect(body).toContain('shelf = shelfTechs(passNow().player);');
    expect(body).toContain('if (shelf.length > 0) {');
    expect(body.indexOf("element('div', 'tech-shelf-rule')")).toBeGreaterThan(
      body.indexOf('if (shelf.length > 0) {'),
    );
  });

  it('draws a dotted sepia line from each shelf node’s parent', () => {
    const body = chartFunction('function drawLines(');
    expect(body).toContain('for (const id of drawnIds())');
    expect(body).toContain("isCharterTech(id) ? 'tech-line is-charter'");
    expect(uiSource('style.css')).toContain('.tech-line.is-charter {');
  });

  it('builds the chart again when a new charter joins the shelf while it is up', () => {
    const body = chartFunction('  function render(): void {');
    expect(body).toContain('!sameShelf(shelfTechs(passNow().player), shelf)');
    // Still one build site, behind the one condition.
    expect(body).toContain('if (field === null) {');
  });
});

describe('the out-of-view tab', () => {
  const FRAME: StageBox = { left: 0, top: 0, width: 340, height: 420 };
  const box = (left: number, top: number): StageBox => ({ left, top, width: 214, height: 90 });

  it('says nothing for an empty shelf', () => {
    expect(shelfTab(FRAME, [])).toBeNull();
  });

  it('goes as soon as a real piece of one charter node is in view', () => {
    const nodes = [
      { id: 'casting' as TechId, box: box(-900, 600) },
      { id: 'mechanics' as TechId, box: box(100, 300) },
    ];
    expect(shelfTab(FRAME, nodes)).toBeNull();
  });

  it('stays while only a sliver of a node shows at the edge', () => {
    const sliver = { id: 'mechanics' as TechId, box: box(100, FRAME.height - (SHELF_TAB_MIN_SEEN - 1)) };
    const tab = shelfTab(FRAME, [sliver]);
    expect(tab).not.toBeNull();
    expect(tab!.target).toBe('mechanics');
  });

  it('points down from the middle at a shelf below the fold', () => {
    const tab = shelfTab(FRAME, [{ id: 'mechanics', box: box(60, 700) }]);
    expect(tab).toEqual({ side: 'centre', arrow: '↓', target: 'mechanics', count: 1 });
  });

  it('sits on the side of the nearest node, with the count of the whole shelf', () => {
    const tab = shelfTab(FRAME, [
      { id: 'casting', box: box(-1400, 700) },
      { id: 'mechanics', box: box(900, 700) },
    ]);
    expect(tab).toEqual({ side: 'right', arrow: '↘', target: 'mechanics', count: 2 });
    const left = shelfTab(FRAME, [{ id: 'casting', box: box(-600, 200) }]);
    expect(left).toEqual({ side: 'left', arrow: '←', target: 'casting', count: 1 });
  });

  it('breaks a tie by the shelf’s own order', () => {
    const tab = shelfTab(FRAME, [
      { id: 'casting', box: box(-400, 600) },
      { id: 'mechanics', box: box(526, 600) },
    ]);
    expect(tab?.target).toBe('casting');
  });

  it('tells a screen reader what is out of view and where a click goes', () => {
    expect(shelfTabLabel({ side: 'centre', arrow: '↓', target: 'mechanics', count: 1 })).toBe(
      'Your charter technology is out of view. Scroll to Mechanics.',
    );
    expect(shelfTabLabel({ side: 'right', arrow: '→', target: 'casting', count: 3 })).toBe(
      'Your charter technologies are out of view. Scroll to Casting.',
    );
  });

  it('is measured in the stage’s frame, follows its scroll, and travels on a click', () => {
    const tree = uiSource('techTree.ts');
    const update = chartFunction('function updateTab(');
    expect(update).toContain('shelfTab({ left: 0, top: 0, width: chart.clientWidth, height: chart.clientHeight }, nodes)');
    expect(update).toContain('if (!open || shelf.length === 0)');
    expect(tree).toContain("chart.addEventListener('scroll', () => updateTab(), { passive: true });");
    const click = tree.slice(tree.indexOf("tab.addEventListener('click'"));
    expect(click.slice(0, 220)).toContain('centreOn(card, true);');
    expect(click.slice(0, 220)).toContain('ringNode(card);');
    // The tab is beside the stage, not inside it, so it never scrolls away.
    expect(tree).toContain('chart.after(tab);');
  });
});

describe('the status line', () => {
  it('counts the sky in both figures, so a charter technology cannot make it 51/50', () => {
    const body = chartFunction('function renderStatus(');
    expect(body).toContain('`${skyKnown(player)}/${TECH_IDS.length} ✦`');
    expect(chartFunction('function skyKnown(')).toContain('!isCharterTech(id)');
  });

  it('wears the seal beside a charter technology’s name, in the drawer and the plan', () => {
    expect(chartFunction('function renderStatus(')).toContain(
      'if (isCharterTech(current)) statusName.append(charterSealNode());',
    );
    const strip = chartFunction('function renderPlanStrip(');
    expect(strip).toContain('if (isCharterTech(step.techId)) {');
    expect(strip).toContain('chip.append(charterSealNode());');
  });
});

describe('the lead (feature B, batch S3)', () => {
  /** Seat 0 has met seat 1, and knows two technologies seat 1 does not. */
  function metGame() {
    const g = researchingGame();
    const me = playerById(g.state, 0)!;
    const rival = playerById(g.state, 1)!;
    me.metSeats.push(1);
    rival.metSeats.push(0);
    me.techsResearched.push('earthenware', 'mining');
    rival.techsResearched.push('mining');
    return g;
  }

  it('shows no figure and no corner to a seat that has met no rival', () => {
    const g = researchingGame();
    playerById(g.state, 0)!.techsResearched.push('earthenware');
    expect(chartLead(g.state, 0)).toBeNull();
    expect(leadFigureOf(chartLead(g.state, 0))).toBeNull();
    for (const id of [...TECH_IDS, ...CHARTER_TECH_IDS]) {
      expect(wearsLeadCorner(chartLead(g.state, 0), id), id).toBe(false);
    }
  });

  it('shows a seat with a lead the figure, and a corner on each node in it and no other', () => {
    const g = metGame();
    const lead = chartLead(g.state, 0);
    expect(lead).toEqual(techLead(g.state, 0));
    expect(lead).toContain('earthenware');
    expect(lead).not.toContain('mining');
    const figure = leadFigureOf(lead);
    expect(figure?.count).toBe(lead!.length);
    expect(figure?.title).toContain('Pottery');
    for (const id of [...TECH_IDS, ...CHARTER_TECH_IDS]) {
      expect(wearsLeadCorner(lead, id), id).toBe(lead!.includes(id));
    }
    expect(wearsLeadCorner(lead, 'earthenware')).toBe(true);
    expect(wearsLeadCorner(lead, 'mining')).toBe(false);
  });

  it('keeps a charter technology in the lead, because no other empire may learn it', () => {
    const g = metGame();
    playerById(g.state, 0)!.techsResearched.push('casting');
    expect(wearsLeadCorner(chartLead(g.state, 0), 'casting')).toBe(true);
  });

  it('shows the figure at nought once a rival is met and knows all this seat knows', () => {
    const g = metGame();
    const rival = playerById(g.state, 1)!;
    rival.techsResearched = [...playerById(g.state, 0)!.techsResearched];
    expect(chartLead(g.state, 0)).toEqual([]);
    const figure = leadFigureOf(chartLead(g.state, 0));
    expect(figure).toEqual({
      count: 0,
      title: 'Technologies you know that no empire you have met knows: none yet',
    });
  });

  it('is what the chart draws: one reading a render, the figure in the head, the corner on the node', () => {
    expect(chartFunction('function beginPass(')).toContain('lead: chartLead(state, playerId)');
    expect(chartFunction('function paintNode(')).toContain(
      "card.classList.toggle('is-lead', wearsLeadCorner(lead, id));",
    );
    const paint = chartFunction('function paintLead(');
    expect(paint).toContain('const figure = leadFigureOf(passNow().lead);');
    expect(paint).toContain('leadFigure.hidden = figure === null;');
    expect(uiSource('style.css')).toContain('.tech-node.is-lead::after {');
  });
});
