/**
 * **The charter technologies** (Scientific batch S0,
 * `docs/plans/scientific-build-triage.md`, the S0 section and readings 1, 13,
 * 14, 16, 19, 20 and 21).
 *
 * Thirteen technology rows that only a seat holding the charter may research.
 * What this file pins:
 *
 *   - the register: the rows marked `TechDef.charter` are exactly the
 *     technologies the charter cards name, and every one has its card;
 *   - the placement: one ordinary parent, one column right of it, inside its
 *     own age (reading 19), and the sky the user drew does not move;
 *   - the price: the column price, the premium and the cards' percentages,
 *     added together and floored once (readings 13 and 14);
 *   - the rules a charter row is kept out of: the age (reading 1), the world
 *     firsts (reading 16), the research list of a seat without the charter, and
 *     the bots' research goals.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { bestTechGoal } from '../../src/ai/bot';
import { gameProgress } from '../../src/sim/cities';
import { dispatch } from '../../src/sim/game';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { describeCard, stripRefs } from '../../src/sim/statecraft';
import {
  DECK_FILE_ORDERS,
  type OrderId,
  charteredTechIds,
  isCharter,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import {
  availableTechs,
  explainTechCost,
  foldTechCost,
  queueTurns,
  researchError,
  settleResearch,
  techsShutByCharter,
  turnsToTech,
} from '../../src/sim/tech';
import {
  ALL_TECH_IDS,
  CHARTER_TECH_IDS,
  TECH_IDS,
  type TechId,
  highestAge,
  techAgeBands,
  techChartLayout,
  techColumn,
  techColumnCount,
  techDataProblems,
  techDef,
  techRowCount,
} from '../../src/sim/techData';
import { RULES } from '../../src/sim/rulesData';
import { choose, researchingGame } from './techHelpers';

/** The column prices of the sky, `tech.test.ts`'s `COLUMN_COSTS`. */
const COLUMN_COSTS = [5, 11, 24, 50, 100, 190, 360, 650, 1150, 1960, 3250, 5150, 8000];

/**
 * The placeholder placement table of the triage, row for row: the technology,
 * its age, its one parent, its column and its price with the premium.
 */
const PLACEMENT: readonly [TechId, number, TechId, number, number][] = [
  ['herbals', 1, 'earthenware', 2, 36],
  ['casting', 1, 'bronzeWorking', 3, 75],
  ['surveying', 2, 'theWheel', 4, 150],
  ['cataloguing', 2, 'letters', 4, 150],
  ['optics', 2, 'theLongCount', 5, 285],
  ['medicine', 3, 'theHighTemple', 6, 540],
  ['papermaking', 3, 'philosophy', 7, 975],
  ['printing', 3, 'philosophy', 7, 975],
  ['mechanics', 3, 'mathematics', 8, 1725],
  ['gunfounding', 4, 'machinery', 10, 4875],
  ['chemistry', 4, 'prospecting', 10, 4875],
  ['militaryArchitecture', 4, 'feudalism', 11, 7725],
  ['navalGunnery', 4, 'theAstrolabe', 12, 12000],
];

/** The charter card that names each technology, by the triage's names. */
const CHARTER_OF: Record<string, OrderId> = {
  herbals: 'theHerbalistsCharter',
  casting: 'theBronzeFoundersCharter',
  surveying: 'theSurveyorsCharter',
  cataloguing: 'theLibrariansCharter',
  optics: 'theGlassmakersCharter',
  medicine: 'thePhysiciansCharter',
  papermaking: 'thePaperMakersCharter',
  printing: 'thePrintersCharter',
  mechanics: 'theMechanistsCharter',
  gunfounding: 'theGunfoundersCharter',
  chemistry: 'theAlchemistsCharter',
  militaryArchitecture: 'theMilitaryEngineersCharter',
  navalGunnery: 'theNavalGunnersCharter',
};

/** Seats a card the way the deck tests do. */
function seat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** What a technology costs seat 0. */
function price(state: GameState, tech: TechId): number {
  return foldTechCost(explainTechCost(state, playerById(state, 0)!, tech));
}

// The memoised depths and age bands are computed before any test below edits
// a row for a moment, so an edit can never be what they remember.
beforeAll(() => {
  techColumn('agriculture');
  techAgeBands();
});

describe('the register', () => {
  it('marks exactly the technologies the charter cards name', () => {
    expect(CHARTER_TECH_IDS).toHaveLength(13);
    expect(new Set(CHARTER_TECH_IDS)).toEqual(new Set(charteredTechIds()));
    expect(charteredTechIds()).toHaveLength(CHARTER_TECH_IDS.length);
    expect(CHARTER_TECH_IDS).toEqual(PLACEMENT.map(([id]) => id));
  });

  it('keeps the sky its fifty rows, and every row in the full list', () => {
    expect(TECH_IDS).toHaveLength(50);
    expect(ALL_TECH_IDS).toHaveLength(63);
    for (const id of CHARTER_TECH_IDS) expect(TECH_IDS, id).not.toContain(id);
    expect([...TECH_IDS, ...CHARTER_TECH_IDS]).toEqual(ALL_TECH_IDS);
  });

  it('gives every charter technology one Scientific charter card, deferred until its gift is built', () => {
    const deck = DECK_FILE_ORDERS.scientific;
    // Batch S1 built the line traits, so these three charters' whole gifts
    // exist and they are dealt. Every other charter is still deferred.
    const dealt = new Set<OrderId>(['theBronzeFoundersCharter', 'theMechanistsCharter', 'theNavalGunnersCharter']);
    for (const tech of CHARTER_TECH_IDS) {
      const card = CHARTER_OF[tech]!;
      expect(deck, card).toContain(card);
      const def = orderDef(card);
      expect(isCharter(card), card).toBe(true);
      expect(def.charter!.unlocks.tech, card).toBe(tech);
      expect(def.retired, card).toBeUndefined();
      expect(def.effects, card).toEqual([]);
      // Reading 21: not dealt until the whole gift is built.
      expect(def.deferred === undefined, card).toBe(dealt.has(card));
      expect(orderIsDealt(card), card).toBe(dealt.has(card));
    }
  });

  it('retires the two cut charters, and names none of their technologies', () => {
    for (const card of ['theMetallurgistsCharter', 'theNaturalistsCharter'] as OrderId[]) {
      expect(orderDef(card).retired, card).toBe(true);
      expect(orderIsDealt(card), card).toBe(false);
    }
    expect(charteredTechIds()).not.toContain('alloys');
    expect(charteredTechIds()).not.toContain('taxonomy');
  });

  it('gives each charter row a distinct glyph, none the sky already uses', () => {
    const glyphs = ALL_TECH_IDS.map((id) => techDef(id).glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});

describe('the placement (reading 19)', () => {
  it('sits each row one column right of its one ordinary parent, at its column price', () => {
    for (const [id, age, parent, column] of PLACEMENT) {
      const def = techDef(id);
      expect(def.age, id).toBe(age);
      expect(def.prereqs, id).toEqual([parent]);
      expect(techDef(parent).charter, id).toBeUndefined();
      expect(techColumn(id), id).toBe(column);
      expect(techColumn(id), id).toBe(techColumn(parent) + 1);
      // A column is a price for a charter row too: the premium is a line.
      expect(def.cost, id).toBe(COLUMN_COSTS[column]);
      const band = techAgeBands().find((entry) => entry.age === age)!;
      expect(column, id).toBeGreaterThanOrEqual(band.from);
      expect(column, id).toBeLessThanOrEqual(band.to);
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('leaves the sky the user drew exactly as it was', () => {
    expect(techColumnCount()).toBe(13);
    expect(techRowCount()).toBe(8);
    expect(techAgeBands()).toEqual([
      { age: 1, from: 0, to: 3 },
      { age: 2, from: 4, to: 5 },
      { age: 3, from: 6, to: 8 },
      { age: 4, from: 9, to: 12 },
    ]);
    const layout = techChartLayout();
    expect(layout.cells.size).toBe(50);
    for (const id of CHARTER_TECH_IDS) expect(layout.cells.has(id), id).toBe(false);
    // No ordinary row stands behind a charter row.
    for (const id of TECH_IDS) {
      for (const prereq of techDef(id).prereqs) {
        expect(CHARTER_TECH_IDS, `${prereq} → ${id}`).not.toContain(prereq);
      }
    }
  });

  it('reports a charter row with two parents, outside its age, or sharing a shelf cell', () => {
    const herbals = techDef('herbals');
    const prereqs = herbals.prereqs;
    const age = herbals.age;
    try {
      herbals.prereqs = ['earthenware', 'mining'];
      expect(techDataProblems()).toContain(
        'charter technology "herbals" has 2 parents; it needs exactly one',
      );
      herbals.prereqs = prereqs;
      herbals.age = 2;
      expect(techDataProblems()).toContain(
        'charter technology "herbals" sits in column 2, outside the columns of age 2',
      );
    } finally {
      herbals.prereqs = prereqs;
      herbals.age = age;
    }
    const cataloguing = techDef('cataloguing');
    const lane = cataloguing.row;
    try {
      cataloguing.row = techDef('surveying').row;
      expect(techDataProblems()).toContain(
        'techs "surveying" and "cataloguing" both sit at chart cell (4,0)',
      );
      // The shelf has no lane budget of its own: a deep lane is not a fault.
      cataloguing.row = 9;
      expect(techDataProblems()).toEqual([]);
    } finally {
      cataloguing.row = lane;
    }
    expect(techDataProblems()).toEqual([]);
  });

  it('reports an ordinary row that stands behind a charter row', () => {
    const stonecraft = techDef('stonecraft');
    const prereqs = stonecraft.prereqs;
    try {
      stonecraft.prereqs = [...prereqs, 'herbals'];
      expect(techDataProblems()).toContain('tech "stonecraft" requires the charter technology "herbals"');
    } finally {
      stonecraft.prereqs = prereqs;
    }
    expect(techDataProblems()).toEqual([]);
  });
});

describe('the price (readings 13 and 14)', () => {
  it('is the column price alone for an ordinary technology', () => {
    const g = researchingGame();
    for (const id of TECH_IDS) {
      const lines = explainTechCost(g.state, playerById(g.state, 0)!, id);
      expect(lines, id).toEqual([{ source: `Column ${techColumn(id)}`, amount: techDef(id).cost }]);
      expect(price(g.state, id), id).toBe(techDef(id).cost);
    }
  });

  it('adds the premium to a charter technology, at the triage table’s figures', () => {
    const g = researchingGame();
    expect(RULES.research.charterPremiumPercent).toBe(50);
    for (const [id, , , column, priced] of PLACEMENT) {
      const lines = explainTechCost(g.state, playerById(g.state, 0)!, id);
      expect(lines, id).toEqual([
        { source: `Column ${column}`, amount: COLUMN_COSTS[column] },
        { source: 'Charter +50%', amount: priced - COLUMN_COSTS[column]! },
      ]);
      expect(foldTechCost(lines), id).toBe(priced);
    }
  });

  it('takes The Commonplace Book’s 15% off the whole charter price, floored once', () => {
    const g = researchingGame();
    seat(g.state, 0, 'theCommonplaceBook');
    const lines = explainTechCost(g.state, playerById(g.state, 0)!, 'mechanics');
    expect(lines.map((line) => line.amount)).toEqual([1150, 575, 1466 - 1725]);
    expect(lines[2]!.source).toContain('The Commonplace Book');
    expect(lines[2]!.source).toContain('-15%');
    // The mockup's own figure: 1150 × 1.5 × 0.85 = 1466.25, floored once.
    expect(foldTechCost(lines)).toBe(1466);
    for (const [id, , , , priced] of PLACEMENT) {
      expect(price(g.state, id), id).toBe(Math.floor((priced * 85) / 100));
    }
    // An ordinary technology is not a charter technology.
    expect(price(g.state, 'mathematics')).toBe(techDef('mathematics').cost);
    // And the other seat holds no card.
    expect(foldTechCost(explainTechCost(g.state, playerById(g.state, 1)!, 'mechanics'))).toBe(1725);
  });

  it('drops the premium line under The Patent Office, and costs 85% of the column under both', () => {
    const g = researchingGame();
    seat(g.state, 0, 'thePatentOffice');
    for (const [id, , , column] of PLACEMENT) {
      expect(explainTechCost(g.state, playerById(g.state, 0)!, id), id).toEqual([
        { source: `Column ${column}`, amount: COLUMN_COSTS[column] },
      ]);
    }
    seat(g.state, 0, 'theCommonplaceBook');
    for (const [id, , , column] of PLACEMENT) {
      const lines = explainTechCost(g.state, playerById(g.state, 0)!, id);
      expect(lines, id).toHaveLength(2);
      expect(foldTechCost(lines), id).toBe(Math.floor((COLUMN_COSTS[column]! * 85) / 100));
    }
  });

  it('is the price the turns are quoted at', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    player.techsResearched.push('earthenware');
    player.charteredTechs.push('herbals');
    expect(turnsToTech(g.state, 0, 'herbals', 6)).toBe(Math.ceil(36 / 6));
    expect(dispatch(g, choose(0, 'herbals')).ok).toBe(true);
    expect(queueTurns(g.state, 0, 6)).toEqual([{ techId: 'herbals', turns: Math.ceil(36 / 6) }]);
  });
});

describe('who may research one (reading 20)', () => {
  it('leaves an undrafted charter technology out of the research list, and lists it once drafted', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    player.techsResearched.push('earthenware');
    expect(techsShutByCharter(player)).toEqual(charteredTechIds());
    expect(availableTechs(g.state, 0)).not.toContain('herbals');
    expect(researchError(g.state, 0, 'herbals')).toMatch(/charter/);
    player.charteredTechs.push('herbals');
    expect(availableTechs(g.state, 0)).toContain('herbals');
    expect(researchError(g.state, 0, 'herbals')).toBeNull();
    // The other seat is where it was: a seat's charters are its own.
    playerById(g.state, 1)!.techsResearched.push('earthenware');
    expect(availableTechs(g.state, 1)).not.toContain('herbals');
  });

  it('offers exactly the nodes the reducer accepts', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    player.techsResearched = [...TECH_IDS];
    player.researching = null;
    delete player.researchQueue;
    expect(availableTechs(g.state, 0)).toEqual([]);
    for (const id of CHARTER_TECH_IDS) expect(researchError(g.state, 0, id), id).toMatch(/charter/);
    player.charteredTechs.push('optics', 'navalGunnery');
    expect(availableTechs(g.state, 0)).toEqual(['optics', 'navalGunnery']);
    for (const id of availableTechs(g.state, 0)) expect(researchError(g.state, 0, id), id).toBeNull();
  });

  it('never sets a bot on a charter technology it has not drafted', () => {
    const g = researchingGame();
    const player = playerById(g.state, 1)!;
    player.techsResearched = [...TECH_IDS];
    player.researching = null;
    delete player.researchQueue;
    expect(bestTechGoal(g.state, player)).toBeNull();
    player.charteredTechs.push('optics');
    expect(bestTechGoal(g.state, player)).toBe('optics');
  });
});

describe('what completing one does not do', () => {
  it('charges the folded price, marks no world first and moves no age (readings 1 and 16)', () => {
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    player.techsResearched.push('earthenware');
    player.charteredTechs.push('herbals');
    expect(dispatch(g, choose(0, 'herbals')).ok).toBe(true);
    player.sciencePool = 24;
    // The column price alone does not cover it: the premium is charged.
    expect(settleResearch(g.state, player)).toBeNull();
    player.sciencePool = 40;
    const done = settleResearch(g.state, player)!;
    expect(done.techId).toBe('herbals');
    expect(done.cost).toBe(36);
    expect(player.sciencePool).toBe(4);
    expect(player.techsResearched).toContain('herbals');
    expect(g.state.firsts.some((record) => record.key === 'herbals')).toBe(false);
  });

  it('leaves the age and the share of the tree where they were', () => {
    expect(highestAge(['agriculture', 'gunfounding', 'navalGunnery'])).toBe(1);
    expect(highestAge(['agriculture', 'theWheel', 'surveying'])).toBe(1);
    expect(highestAge(['agriculture', 'theWheel', 'currency', 'surveying'])).toBe(2);
    const g = researchingGame();
    const player = playerById(g.state, 0)!;
    player.techsResearched = ['agriculture', 'earthenware'];
    const before = gameProgress(g.state, 0);
    player.techsResearched.push('herbals');
    expect(gameProgress(g.state, 0)).toBe(before);
    expect(before).toBe(2 / TECH_IDS.length);
  });
});

describe('the two cards', () => {
  it('print their rules through the describers', () => {
    const words = (id: OrderId) => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words('theCommonplaceBook')).toEqual(['charter technologies cost you 15% less research']);
    expect(words('thePatentOffice')).toEqual([
      'charter technologies cost you no more research than ordinary technologies at the same point in the tree',
    ]);
    expect(orderDef('theCommonplaceBook').band).toBe(1);
    expect(orderDef('thePatentOffice').band).toBe(4);
    expect(orderIsDealt('theCommonplaceBook')).toBe(true);
    expect(orderIsDealt('thePatentOffice')).toBe(true);
  });
});
