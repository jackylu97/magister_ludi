/**
 * The Diplomacy screen: every empire, where this seat stands with each, and the
 * two verbs that change it.
 *
 * `test/sim/war.test.ts` covers the rules; this covers the surface, and what a
 * surface can be *quietly* wrong about is its own:
 *
 *   1. **Which relation a row claims.** Peace, war and truce are exclusive and
 *      each has one sentence, so a row that said "at peace" through a truce
 *      would be offering a button the reducer refuses.
 *   2. **Which verb it offers, and why it is greyed.** Both come out of the
 *      simulation's own gates (`declareWarError`, `proposePeaceError`,
 *      `withdrawPeaceError`), so an offered button is a command the reducer
 *      takes — this interface's bargain everywhere a gate exists.
 *   3. **What the offer line says.** The peace mechanism has one surprising
 *      half — an offer stands and nothing happens until both do — and this is
 *      the one place the screen has to *explain* rather than report.
 *   4. **Who is on the sheet at all**: `diplomaticSeats`, so the wild and the
 *      fallen are not, and this file has no roster filter of its own.
 *   5. **Who you have met.** The user's ruling of 2026-09-03: an empire appears
 *      only once you have seen its land, its town or its pieces — or signed
 *      something with it; and, since 2026-09-04, a meeting is **permanent**
 *      (`Player.metSeats`, written the first time a seat is seen). The reading
 *      is `hasMetSeat` (`src/sim/diplomacy.ts`) — the register first, then the
 *      four board clauses that backfill it — and the sheet applies it through
 *      `metDiplomacyRows`. A gate this quiet is exactly the kind a surface can
 *      be wrong about in both directions: an empire nobody has met on the sheet
 *      is a leak, and an empire that has declared war left off it is a peace a
 *      player cannot sue for.
 *
 *   6. **The strip of courts and the drawer** (layout B, Quiet Table fourth
 *      pass): the strip lists exactly the other real players, choosing a
 *      court changes the desk, the arrow keys move between met courts, and the
 *      "Standing and deals" drawer lists only what `standingAndDeals` returns.
 *      Every action still sends the same command.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sheet itself is not
 * rendered: what is covered is the pure half — every decision above is a
 * function — and, through the source exactly as `seatRoster.test.ts` reads its
 * rule, the wirings that span files.
 */

import { describe, expect, it } from 'vitest';
import { braceBody, uiSource } from './sourceHelpers';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt } from '../../src/sim/cities';
import { bordersOpenTo } from '../../src/sim/deals';
import { hasMetSeat } from '../../src/sim/diplomacy';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type City, type GameState, createUnit, bumpRevision, realPlayers } from '../../src/sim/state';
import { closeWar, openWar } from '../../src/sim/wars';
import {
  EXPLORED,
  isVisibleTo,
  recomputeVisibility,
  resetVisibility,
} from '../../src/sim/visibility';
import { RULES } from '../../src/sim/rulesData';
import {
  DRAWER_WORDS,
  STRIP_WORDS,
  WAR_CONFIRM_WORDS,
  chosenCourt,
  courtStrip,
  courtsMetLine,
  dealPanel,
  declareConfirm,
  diplomacyRows,
  metDiplomacyRows,
  peaceButtonLabel,
  relationSentence,
  rosterNote,
  standingAndDeals,
  stripStep,
  wearinessLine,
} from '../../src/ui/diplomacyScreen';
import { recordWarLoss, wearinessBetween } from '../../src/sim/weariness';
import { newGame } from '../sim/newGameHelpers';

function bench(seats = 2, wild = false): GameState {
  const colors = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: ['Ada', 'Bors', 'Cyra'][index]!,
      color: colors[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(12 * 8).fill(null);
  state.units = [];
  state.cities = [];
  return state;
}

describe('the sheet’s rows', () => {
  it('lists every other real empire and nobody else', () => {
    const state = bench(3, true);
    const rows = diplomacyRows(state, 0);
    expect(rows.map((row) => row.playerId)).toEqual([1, 2]);
    // The wild has no seat at any table and never appears.
    expect(rows.some((row) => row.name === 'Barbarians')).toBe(false);
  });

  it('drops an empire that is gone', () => {
    const state = bench(3);
    state.players[2]!.eliminated = true;
    expect(diplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });

  it('reads peace, war and truce as three exclusive relations', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.relation).toBe('peace');
    expect(diplomacyRows(state, 0)[0]!.status).toBe('At peace');

    state.turn = 41;
    openWar(state, 0, 1);
    const atWarRow = diplomacyRows(state, 0)[0]!;
    expect(atWarRow.relation).toBe('war');
    expect(atWarRow.since).toBe(41);
    expect(atWarRow.status).toContain('41');

    closeWar(state, 0, 1);
    const truced = diplomacyRows(state, 0)[0]!;
    expect(truced.relation).toBe('truce');
    expect(truced.truceLeft).toBe(RULES.war.truceTurns);
    expect(truced.status).toContain(String(RULES.war.truceTurns));
  });

  it('greys the declare button with the reducer’s own sentence', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.declareError).toBeNull();
    openWar(state, 0, 1);
    expect(diplomacyRows(state, 0)[0]!.declareError).toContain('already at war');
    closeWar(state, 0, 1);
    expect(diplomacyRows(state, 0)[0]!.declareError).toContain('holds');
  });

  it('offers no peace where there is no war to sue over', () => {
    const state = bench();
    expect(diplomacyRows(state, 0)[0]!.peaceError).toContain('not at war');
  });

  it('shows both sides’ offers, and flips its own button to a withdrawal', () => {
    const state = bench();
    openWar(state, 0, 1);
    expect(peaceButtonLabel(diplomacyRows(state, 0)[0]!)).toBe('Offer peace');

    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const theirs = diplomacyRows(state, 0)[0]!;
    expect(theirs.theyOffered).toBe(true);
    expect(theirs.weOffered).toBe(false);
    // The one face that matters: their offer standing makes this the button
    // that ends the war, and it says so.
    expect(peaceButtonLabel(theirs)).toBe('Accept peace');

    // Answering it ends the war inside that command (§12), so the row this
    // sheet draws next is a truce and not a war with two flags on it.
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    const after = diplomacyRows(state, 0)[0]!;
    expect(after.relation).toBe('truce');
  });

  it('draws our own standing offer, and the war it has not ended yet', () => {
    const state = bench();
    openWar(state, 0, 1);
    applyCommand(state, { type: 'proposePeace', playerId: 0, targetId: 1 });
    const mine = diplomacyRows(state, 0)[0]!;
    expect(mine.weOffered).toBe(true);
    expect(mine.theyOffered).toBe(false);
    expect(peaceButtonLabel(mine)).toBe('Withdraw offer');
    // And the button is still offered, because withdrawing is legal.
    expect(mine.peaceError).toBeNull();
  });
});

describe('the war weariness line (batch WC2)', () => {
  it('carries the happiness your losses to them cost, and says nothing when they cost none', () => {
    const state = bench();
    openWar(state, 0, 1);
    expect(diplomacyRows(state, 0)[0]!.weariness).toBe(0);
    expect(wearinessLine(diplomacyRows(state, 0)[0]!)).toBeNull();

    recordWarLoss(state, 0, 1, 'town');
    const row = diplomacyRows(state, 0)[0]!;
    // The same figure the happiness breakdown prints on their line.
    expect(row.weariness).toBe(wearinessBetween(state, 0, 1).happiness);
    expect(row.weariness).toBeGreaterThan(0);
    expect(wearinessLine(row)).toBe(`War weariness −${row.weariness} happiness`);
    // A war the other side is losing costs them, and costs us nothing.
    expect(diplomacyRows(state, 1)[0]!.weariness).toBe(0);
  });

  it('keeps the line through a peace, because a peace does not erase recent losses', () => {
    const state = bench();
    openWar(state, 0, 1);
    recordWarLoss(state, 0, 1, 'unit');
    closeWar(state, 0, 1);
    const row = diplomacyRows(state, 0)[0]!;
    expect(row.relation).toBe('truce');
    expect(wearinessLine(row)).not.toBeNull();
  });

  it('lists the line under where you stand, in the Standing and deals drawer', () => {
    const state = bench();
    openWar(state, 0, 1);
    recordWarLoss(state, 0, 1, 'town');
    const row = diplomacyRows(state, 0)[0]!;
    const read = standingAndDeals(state, 0, row, dealPanel(state, 0, 1));
    expect(read.weariness).toBe(wearinessLine(row));
    expect(read.weariness).not.toBeNull();
    const screen = uiSource('diplomacyScreen.ts');
    expect(braceBody(screen, 'function standingAndDeals(')).toContain('weariness: wearinessLine(row)');
    expect(braceBody(screen, '  function drawDrawer(')).toContain(
      "if (read.weariness !== null) drawer.append(element('p', 'dp-weary', read.weariness));",
    );
  });
});

describe('the met gate', () => {
  function town(state: GameState, seat: number, col: number, row: number): City {
    const tile = getTileAt(state.map, col, row);
    if (!tile) throw new Error('no tile');
    return foundCityAt(state, seat, tile);
  }

  /** One of that empire's owned hexes that is not the town square itself. */
  function ownedTileOf(state: GameState, city: City): number {
    const centre = tileIndex(state.map, city.col, city.row);
    const index = state.tileOwner.findIndex(
      (owner, at) => owner === city.id && at !== centre,
    );
    if (index < 0) throw new Error('the town claimed nothing');
    return index;
  }

  it('leaves an empire nobody has seen off the sheet, while the world still knows it', () => {
    const state = bench();
    town(state, 1, 10, 4);
    // The world's own list is unchanged — the gate is a *reading* of it, so a
    // test, a spectator or a bot can still ask about a relation nobody has met.
    expect(diplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
    expect(diplomacyRows(state, 0)[0]!.met).toBe(false);
    expect(metDiplomacyRows(state, 0)).toEqual([]);
    expect(hasMetSeat(state, 0, 1)).toBe(false);
  });

  it('meets an empire whose land is on your chart', () => {
    const state = bench();
    const theirs = town(state, 1, 10, 4);
    const index = ownedTileOf(state, theirs);
    state.visibility[0]![index] = EXPLORED;
    // Remembered ground, not watched ground: the territory layer draws the
    // current owner on any explored hex, so this is what the player can see.
    expect(hasMetSeat(state, 0, 1)).toBe(true);
    expect(metDiplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });

  it('meets an empire whose town you remember, and keeps it after the scout goes home', () => {
    const state = bench();
    town(state, 1, 10, 4);
    createUnit(state, 0, 'warrior', 9, 4);
    recomputeVisibility(state, 0);
    expect(state.citySightings[0]!.some((sighting) => sighting.ownerId === 1)).toBe(true);

    // The scout is recalled and every hex it lit is forgotten — the memory of
    // the town is the one thing that survives, and it is enough.
    state.units = [];
    recomputeVisibility(state, 0);
    state.visibility[0] = state.visibility[0]!.map(() => 0);
    expect(hasMetSeat(state, 0, 1)).toBe(true);
  });

  it('meets an empire whose piece is under your eye — and keeps it when it goes', () => {
    const state = bench();
    createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    recomputeVisibility(state, 0);
    expect(hasMetSeat(state, 0, 1)).toBe(true);

    // The gap this docblock used to name is **closed** (user, 2026-09-04; schema
    // 64): the sighting is written into `Player.metSeats` the turn it happens,
    // so a column that walked past and walked away is still an introduction.
    // The sim's own pins are `test/sim/visibility.test.ts`; this one is the
    // screen's, because the roster is what the ruling was about.
    theirs.col = 11;
    recomputeVisibility(state, 0);
    expect(isVisibleTo(state, 0, theirs.col, theirs.row)).toBe(false);
    expect(hasMetSeat(state, 0, 1)).toBe(true);
    expect(metDiplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });

  it('meets an empire that has declared war, so the peace can be sued for', () => {
    const state = bench();
    // Nothing seen, nothing owned: only the war row stands between them.
    openWar(state, 1, 0);
    const rows = metDiplomacyRows(state, 0);
    expect(rows.map((row) => row.playerId)).toEqual([1]);
    expect(rows[0]!.relation).toBe('war');
    expect(rows[0]!.peaceError).toBeNull();
  });

  it('meets an empire that has put a paper on the table', () => {
    const state = bench();
    town(state, 0, 3, 4);
    town(state, 1, 10, 4);
    expect(metDiplomacyRows(state, 0)).toEqual([]);
    state.players[1]!.gold = 50;
    bumpRevision(state);
    applyCommand(state, {
      type: 'proposeDeal',
      playerId: 1,
      targetId: 0,
      give: { gold: 20 },
      take: {},
    } as never);
    expect(state.dealProposals).toHaveLength(1);
    expect(metDiplomacyRows(state, 0).map((row) => row.playerId)).toEqual([1]);
  });
});

describe('the roster’s second line', () => {
  it('says the one thing that must not need a click, and never a figure', () => {
    const state = bench();
    openWar(state, 0, 1);
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const row = diplomacyRows(state, 0)[0]!;
    expect(rosterNote(row)).toBe('They have offered peace.');
    // Counts are marks beside the name, never words in a sentence (rule 7).
    expect(/\d/.test(rosterNote(row) ?? '')).toBe(false);
  });

  it('says nothing at all about a quiet peace', () => {
    const state = bench();
    expect(rosterNote(diplomacyRows(state, 0)[0]!)).toBeNull();
  });
});

describe('the sentences', () => {
  it('names the turn a war opened, and never prints a bare "at war" with one', () => {
    expect(relationSentence('war', 41, 0)).toBe('At war since turn 41');
    expect(relationSentence('war', null, 0)).toBe('At war');
  });

  it('says "one turn" rather than a figure of one', () => {
    expect(relationSentence('truce', null, 1)).toBe('Truce — one turn left');
    expect(relationSentence('truce', null, 4)).toContain('4');
  });

  it('asks the confirm card a question with a verb on it, never "OK"', () => {
    const request = declareConfirm('Bors', { deals: 2, proposals: 0, routes: 1 });
    expect(request.title).toContain('Bors');
    expect(request.confirmLabel).toBe('Declare war');
    // Escape and Cancel mean no, so the harmless answer says what it protects.
    expect(request.cancelLabel).toBe('Keep the peace');
    // No numbers in player prose (hard rule 7): the truce's length is on the
    // row's own countdown, not in a sentence.
    expect(/\d/.test(request.body)).toBe(false);
    // Version A (Quiet Table, build stage 1): what follows, read off the sim,
    // one line each and only what applies; a grave card, so Enter does not confirm.
    expect(request.tone).toBe('war');
    expect(request.points).toEqual([
      WAR_CONFIRM_WORDS.deals,
      WAR_CONFIRM_WORDS.routes,
      WAR_CONFIRM_WORDS.borders,
      WAR_CONFIRM_WORDS.peace,
    ]);
    for (const point of request.points ?? []) expect(/\d/.test(point), point).toBe(false);
    expect(declareConfirm('Bors', { deals: 0, proposals: 1, routes: 0 }).points).toEqual([
      WAR_CONFIRM_WORDS.proposals,
      WAR_CONFIRM_WORDS.borders,
      WAR_CONFIRM_WORDS.peace,
    ]);
  });
});

describe('the wiring that spans files', () => {
  // The sources come from the suite's shared glob (`sourceHelpers.ts`).
  const source = uiSource;

  it('gives the sheet one door: the Diplomacy mark in the corner panel', () => {
    // The dock's third door until batch UX1, the first of the bar's three tabs
    // until batch SS2b, and the corner panel's first mark since. The mark is
    // markup, so it cannot be built and never mounted.
    const html = source('index.html');
    const quick = html.slice(html.indexOf('id="empire-quick"'), html.indexOf('id="empire-drawer"'));
    expect(quick).toContain('id="quick-diplomacy" class="quick-button is-diplomacy"');
    expect(quick).toContain('aria-controls="diplomacy-overlay"');
    expect(source('topBar.ts')).not.toContain('diplomacyTab');
    // The dock is gone (batch UX3), and the open card's rows carry no second door.
    expect(html).not.toMatch(/id="(hud-dock|drawer)-diplomacy"/);
  });

  it('opens the sheet from that mark, through the same door `W` uses', () => {
    const main = source('main.ts');
    // The mark and `W` open the sheet, and the sheet's own opening closes
    // whatever else is up (the screen registry, batch UX2).
    expect(main).toContain('diplomacy: () => diplomacy?.open(),');
    expect(main).toContain('case \'w\': diplomacy?.open();');
    expect(main).toContain("onOpen: () => screens.opening('diplomacy'),");
    // The sheet gives the keyboard back to the mark.
    expect(main).toContain('trigger: quickDiplomacyButton,');
  });

  it('sends every write as a command, and never touches the state itself', () => {
    const screen = source('diplomacyScreen.ts');
    expect(screen).not.toContain('applyCommand');
    expect(screen).not.toContain('dispatch(');
    // And never the platform's own dialog — `confirmCard.ts`'s standing rule,
    // which `confirmCard.test.ts` pins across the whole of `src/ui`. The
    // confirm step is handed in as `askConfirm`, so this file has no opinion
    // about where the card lives.
    // `row.people` and not `row.name`: a war is declared on a *country*
    // (`seatPeople`, `docs/flags.md` (ppppp)), and the card reads "the Inca".
    expect(screen).toContain('askConfirm(declareConfirm(row.people, row.war)');
    // What follows comes from the sim's own reading, never a guess here.
    expect(screen).toContain('war: warConsequences(state, seat, id),');
  });

  it('asks the audience through an option, and never imports the bot', () => {
    const screen = source('diplomacyScreen.ts');
    // §12's whole seam: the answer is the empire's own command, dispatched by
    // `main.ts` through the driver's funnel, and what crosses into this file is
    // a sentence. A screen that reached for the AI itself would be a screen that
    // could answer for a seat nobody asked.
    expect(screen).not.toContain("from '../ai/");
    expect(screen).toContain('askAudience');
    expect(screen).toContain('askCounter');
    const main = source('main.ts');
    // On this thread when there is no bot worker, and through the worker's
    // client otherwise, which falls back to the same call (`botTwin.ts`).
    expect(main).toContain('answerAudience(game, options)');
    expect(main).toContain('botTwin.audience(() => game, options)');
    expect(main).toContain('counterTerms(game.state, targetId, asker, give, take, ctx)');
  });

  it('closes every other surface when it opens, and is closed by the sweep', () => {
    // Both halves are the screen registry's (batch UX2): the sheet tells it
    // when it opens, and its registration is what the sweep closes.
    const main = source('main.ts');
    expect(main).toContain("onOpen: () => screens.opening('diplomacy'),");
    expect(main).toContain("screens.register(held('diplomacy', 'screen', () => diplomacy));");
    expect(main).toContain('gameDisposers.push(() => diplomacy?.dispose());');
  });
});

describe('the sheet\'s frame (layout B with the strip of courts)', () => {
  const css = Object.values(
    import.meta.glob('../../src/ui/diplomacyScreen.css', { eager: true, query: '?raw', import: 'default' }),
  )[0] as string;
  /** The text of one `@container` block, brace-matched. */
  const block = (query: string): string => {
    const at = css.indexOf(query);
    expect(at, query).toBeGreaterThan(-1);
    let depth = 0;
    for (let i = css.indexOf('{', at); i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) return css.slice(at, i + 1);
    }
    return '';
  };

  it('sizes the sheet by the board\'s rule on its own class, and leaves the shared cap alone', () => {
    expect(css).toContain('width: min(calc(100vw - 56px), 1180px);');
    expect(css).toContain('height: min(calc(100vh - 90px), 860px);');
    expect(css).toContain('container: dp-sheet / size;');
    expect(css).not.toMatch(/\.statecraft-sheet \{/);
    expect(uiSource('index.html')).toContain('<div class="statecraft-sheet dp-sheet">');
  });

  it('lays the strip, the 3:4 portrait and the desk side by side, the portrait sized by the sheet', () => {
    expect(css).toContain('grid-template-columns: 44px var(--dp-pw) minmax(0, 1fr);');
    expect(css).toContain('grid-template-rows: minmax(0, 1fr);');
    // As tall as the room allows at 3:4, capped by the sheet's width.
    expect(css).toContain('--dp-pw: min(calc((100cqh - 80px - 32px) * 0.75), 38cqw);');
    expect(css).toMatch(/\.dp-figure \{[^}]*aspect-ratio: 3 \/ 4;/);
    // The strip scrolls when the courts outgrow the sheet.
    expect(css).toMatch(/\.dp-strip \{[^}]*overflow-y: auto;/);
  });

  it('sets the denser rows and the short head on a sheet under 720 px high', () => {
    const short = block('@container dp-sheet (max-height: 719px)');
    expect(short).toContain('height: 56px;');
    expect(short).toMatch(/\.dp-chip \{[^}]*height: 24px;/);
    expect(short).toContain('--dp-pw: min(calc((100cqh - 56px - 24px) * 0.75), 36cqw);');
  });

  it('wears the Quiet Table kit and adds no second set of button rules', () => {
    const screen = uiSource('diplomacyScreen.ts');
    // The kit's classes: plain, primary (cinnabar) and the solid war red.
    expect(screen).toContain("button('btn btn-primary dp-send', dealButtonLabel(model, empty))");
    expect(screen).toContain("button('btn is-war-solid dp-war', '')");
    expect(screen).not.toContain('dp-btn');
    // No rule in this sheet's stylesheet restyles the kit's button classes.
    expect(css).not.toMatch(/(^|\n)\.btn(-primary|-quiet)?\s*[,{]/);
    // The head's × is the kit's.
    expect(uiSource('index.html')).toContain('<button id="diplomacy-close" class="statecraft-close"');
    // Every figure the sheet prints is tabular mono.
    expect(css).toMatch(/\.dp-fig \{[^}]*var\(--face-num\);[^}]*font-variant-numeric: tabular-nums;/);
  });

  it('shuts the drawer on Escape before it shuts the sheet', () => {
    const screen = uiSource('diplomacyScreen.ts');
    expect(screen).toContain("if (event.key === 'Escape' && drawerOpen) {\n        closeDrawer();");
  });
});

// --- layout B: the strip of courts and the drawer ---------------------------

/** A full lobby is twelve seats (`RULES.game.maxPlayers`), so eleven courts. */
const INKS = ['#a00', '#00a', '#0a0', '#a60', '#606', '#066', '#660', '#600', '#006', '#060', '#333', '#963'];

function table(seats: number, wild = false): GameState {
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    ...(wild ? { barbarians: true } : {}),
    players: Array.from({ length: seats }, (_unused, index) => ({
      name: `Seat ${index}`,
      color: INKS[index]!,
      isHuman: true,
    })),
  });
  state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(12 * 8).fill(null);
  state.units = [];
  state.cities = [];
  return state;
}

/** Seat 0 has met exactly these seats (the stored register `hasMetSeat` reads first). */
function meet(state: GameState, ids: number[]): void {
  state.players[0]!.metSeats = [...ids].sort((a, b) => a - b);
}

describe('the strip of courts', () => {
  it('lists exactly the other real players, in seat order, and never the wild', () => {
    const state = table(3, true);
    const others = (seat: number): number[] =>
      realPlayers(state).filter((player) => player.id !== seat).map((player) => player.id);
    expect(courtStrip(state, 0).map((court) => court.playerId)).toEqual(others(0));
    expect(courtStrip(state, 1).map((court) => court.playerId)).toEqual(others(1));
    const wild = state.players.find((player) => player.barbarian)!;
    expect(courtStrip(state, 0).some((court) => court.playerId === wild.id)).toBe(false);
    // A fallen empire has no court to treat with (`diplomaticSeats`).
    state.players[2]!.eliminated = true;
    expect(courtStrip(state, 0).map((court) => court.playerId)).toEqual([1]);
  });

  it('holds eleven courts at a full table, each once', () => {
    const state = table(12);
    const ids = courtStrip(state, 0).map((court) => court.playerId);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(new Set(ids).size).toBe(11);
  });

  it('draws a court not yet met as a blank mark that says nothing about who it is', () => {
    const state = table(3);
    const strip = courtStrip(state, 0);
    expect(strip.map((court) => court.row)).toEqual([null, null]);
    for (const court of strip) {
      expect(court.label).toBe(STRIP_WORDS.unmet);
      expect(court.label).not.toContain('Seat');
    }
    expect(chosenCourt(strip, 1)).toBeNull();
    expect(courtsMetLine(strip)).toEqual({ met: 0, of: 2 });
    // A war is a meeting (the relation clause), and the mark says so.
    state.turn = 41;
    openWar(state, 1, 0);
    const after = courtStrip(state, 0);
    expect(after[0]!.row?.playerId).toBe(1);
    expect(after[0]!.label).toBe(`${after[0]!.row!.name} · at war since turn 41`);
    expect(after[1]!.row).toBeNull();
    expect(courtsMetLine(after)).toEqual({ met: 1, of: 2 });
  });

  it('draws an unmet court as a mark that cannot be chosen, and a met one as an option', () => {
    const screen = uiSource('diplomacyScreen.ts');
    const court = braceBody(screen, '  function drawCourt(');
    const blank = court.slice(court.indexOf('if (row === null) {'), court.indexOf('const active ='));
    expect(blank).toContain("element('span', 'dp-court is-unmet')");
    expect(blank).toContain("blank.setAttribute('aria-disabled', 'true');");
    expect(blank).not.toContain('click');
    expect(court).toContain("node.setAttribute('role', 'option');");
    expect(court).toContain('node.tabIndex = active ? 0 : -1;');
    expect(court).toContain("node.addEventListener('click', () => choose(row.playerId));");
    // War and an offer that waits are marks on the court, as the board draws them.
    expect(court).toContain("if (row.relation !== 'peace') node.append(element('i', `dp-court-dot is-${row.relation}`));");
    expect(court).toContain("if (row.waiting > 0) node.append(element('i', 'dp-court-dot is-offer'));");
    const strip = braceBody(screen, '  function drawStrip(');
    expect(strip).toContain("list.setAttribute('role', 'listbox');");
    expect(strip).toContain("list.setAttribute('aria-orientation', 'vertical');");
  });

  it('changes the desk when a court is chosen', () => {
    const state = table(3);
    meet(state, [1, 2]);
    openWar(state, 0, 2);
    const strip = courtStrip(state, 0);
    // The chosen court, or the first met court when the choice is not one.
    expect(chosenCourt(strip, 2)?.playerId).toBe(2);
    expect(chosenCourt(strip, 1)?.playerId).toBe(1);
    expect(chosenCourt(strip, null)?.playerId).toBe(1);
    expect(chosenCourt(strip, 99)?.playerId).toBe(1);
    // The desk is that court's table: an exchange at peace, the peace terms at war.
    expect(dealPanel(state, 0, chosenCourt(strip, 1)!.playerId).peace).toBe(false);
    expect(dealPanel(state, 0, chosenCourt(strip, 2)!.playerId).peace).toBe(true);
    // And the sheet draws the figure and the desk from the chosen court.
    const screen = uiSource('diplomacyScreen.ts');
    expect(braceBody(screen, '  function choose(')).toContain('selectedId = playerId;');
    const draw = braceBody(screen, '  function draw(');
    expect(draw).toContain('const chosen = chosenCourt(strip, selectedId);');
    expect(draw).toContain('room.append(drawFigure(state, chosen, model, offer !== null));');
    expect(draw).toContain('room.append(drawDesk(state, chosen, model, offer ?? draft, offer !== null));');
  });

  it('moves the keyboard between met courts with the arrow keys, and only Enter chooses', () => {
    const state = table(5);
    meet(state, [1, 3, 4]);
    const strip = courtStrip(state, 0);
    expect(strip.map((court) => court.row !== null)).toEqual([true, false, true, true]);
    // Down skips the court not yet met; the strip does not wrap round.
    expect(stripStep(strip, 1, 'ArrowDown')).toBe(3);
    expect(stripStep(strip, 3, 'ArrowRight')).toBe(4);
    expect(stripStep(strip, 4, 'ArrowDown')).toBe(4);
    expect(stripStep(strip, 3, 'ArrowUp')).toBe(1);
    expect(stripStep(strip, 1, 'ArrowLeft')).toBe(1);
    expect(stripStep(strip, 3, 'Home')).toBe(1);
    expect(stripStep(strip, 1, 'End')).toBe(4);
    // Enter is the mark's own press (a button), so the strip does not take it.
    expect(stripStep(strip, 1, 'Enter')).toBeNull();
    expect(stripStep(strip, 1, 'a')).toBeNull();
    expect(stripStep(courtStrip(table(3), 0), 1, 'ArrowDown')).toBeNull();
    const screen = uiSource('diplomacyScreen.ts');
    expect(screen).toContain('if (stepStrip(event)) return true;');
    expect(braceBody(screen, '  function stepStrip(')).toContain(
      'const next = stripStep(strip, Number(active.dataset.court), event.key);',
    );
  });
});

describe('the Standing and deals drawer', () => {
  function pair(): GameState {
    const state = table(2);
    foundCityAt(state, 0, getTileAt(state.map, 2, 4)!);
    foundCityAt(state, 1, getTileAt(state.map, 9, 4)!);
    state.players[0]!.gold = 200;
    state.players[1]!.gold = 200;
    bumpRevision(state);
    return state;
  }

  it('lists where you stand and the deals in force, each from a reading the game has', () => {
    const state = pair();
    state.deals.push({ id: 901, a: 0, b: 1, terms: { a: { goldPerTurn: 4 }, b: { openBorders: true } }, untilTurn: state.turn + 14 });
    bumpRevision(state);
    const row = diplomacyRows(state, 0)[0]!;
    const model = dealPanel(state, 0, 1);
    const read = standingAndDeals(state, 0, row, model);
    expect(read.standing).toEqual([
      { label: 'Relation', value: row.status, relation: row.relation },
      { label: 'Their borders', value: bordersOpenTo(state, 1, 0) ? 'Open to you' : 'Closed to you' },
      { label: 'Your borders', value: bordersOpenTo(state, 0, 1) ? 'Open to them' : 'Closed to them' },
    ]);
    expect(read.standing[1]!.value).toBe('Open to you');
    expect(read.inForce).toEqual(model.active);
    expect(read.inForce).toHaveLength(1);
    expect(read.weariness).toBeNull();
    expect(read.waiting).toEqual([]);
    expect(read.mine).toEqual([]);
    // The drawer's words carry no figure (hard rule 7).
    for (const words of Object.values(DRAWER_WORDS)) expect(words).not.toMatch(/\d/);
  });

  it('lists an offer waiting for your answer and your own offer, with the button each needs', () => {
    const state = pair();
    expect(applyCommand(state, { type: 'proposeDeal', playerId: 1, targetId: 0, give: { gold: 20 }, take: {} } as never).ok).toBe(true);
    const id = state.dealProposals[0]!.id;
    const theirs = standingAndDeals(state, 0, diplomacyRows(state, 0)[0]!, dealPanel(state, 0, 1));
    expect(theirs.waiting.map((item) => item.paper)).toEqual([id]);
    expect(theirs.waiting[0]!.head).toBe(dealPanel(state, 0, 1).proposals[0]!.heading);
    expect(theirs.mine).toEqual([]);
    const mine = standingAndDeals(state, 1, diplomacyRows(state, 1)[0]!, dealPanel(state, 1, 0));
    expect(mine.waiting).toEqual([]);
    expect(mine.mine.map((item) => [item.paper, item.action, item.error])).toEqual([[id, DRAWER_WORDS.withdraw, null]]);
  });

  it('lists a peace offer, theirs to answer and yours to take back', () => {
    const state = pair();
    openWar(state, 0, 1);
    applyCommand(state, { type: 'proposePeace', playerId: 1, targetId: 0 });
    const theirs = standingAndDeals(state, 0, diplomacyRows(state, 0)[0]!, dealPanel(state, 0, 1));
    expect(theirs.waiting.map((item) => item.paper)).toEqual(['peace']);
    const row = diplomacyRows(state, 1)[0]!;
    const mine = standingAndDeals(state, 1, row, dealPanel(state, 1, 0));
    expect(mine.mine.map((item) => [item.paper, item.action])).toEqual([['peace', peaceButtonLabel(row)]]);
  });

  it('opens over the desk from its button, and closes back to the trays', () => {
    const screen = uiSource('diplomacyScreen.ts');
    const button = braceBody(screen, '  function dealsButton(');
    expect(button).toContain('drawerOpen = !drawerOpen;');
    expect(button).toContain("focusAfter = drawerOpen ? 'drawer-close' : 'drawer';");
    // The count is the deals in force; the dot is an offer that waits.
    expect(button).toContain("element('b', 'dp-fig', figure(model.active.length))");
    expect(button).toContain('if (row.waiting > 0) {');
    const close = braceBody(screen, '  function closeDrawer(');
    expect(close).toContain('drawerOpen = false;');
    expect(close).toContain("focusAfter = 'drawer';");
    expect(braceBody(screen, '  function drawDesk(')).toContain('if (drawerOpen) desk.append(drawDrawer(state, row, model));');
    // Reading an offer closes the drawer and opens the offer on the table.
    const drawer = braceBody(screen, '  function drawDrawer(');
    expect(drawer).toContain("shut.addEventListener('click', closeDrawer);");
    expect(drawer).toContain('reading = { seatId: row.playerId, paper: item.paper };\n        drawerOpen = false;');
  });

  it('draws only what the reading returns, and reads nothing of its own', () => {
    const screen = uiSource('diplomacyScreen.ts');
    const drawer = braceBody(screen, '  function drawDrawer(');
    expect(drawer).toContain('const read = standingAndDeals(state, options.getPlayerId(), row, model);');
    for (const reading of ['bordersOpenTo(', 'dealsBetween(', 'wearinessLine(', 'model.proposals', 'model.active']) {
      expect(drawer, reading).not.toContain(reading);
    }
  });
});

describe('every action sends the same command as before', () => {
  const screen = uiSource('diplomacyScreen.ts');

  it('keeps the handed-in verbs, with the same shapes', () => {
    const shape = braceBody(screen, 'interface DiplomacyScreenOptions');
    expect(shape).toContain('declareWar: (targetId: number) => void;');
    expect(shape).toContain('proposeDeal: (targetId: number, give: DealTerms, take: DealTerms) => void;');
    expect(shape).toContain('answerDeal: (dealId: number, accept: boolean) => void;');
    expect(shape).toContain('declinePeace: (targetId: number) => void;');
    expect(shape).toContain('withdrawDeal: (dealId: number) => void;');
    expect(shape).toContain(
      'offerPeace: (\n    targetId: number,\n    standing: boolean,\n    offered?: { give: DealTerms; take: DealTerms },\n  ) => void;',
    );
  });

  it('sends each command from the action that sent it before, and from nowhere else', () => {
    // Declare war, after the confirm card.
    const declare = braceBody(screen, '  function declareButton(');
    expect(declare).toContain('options.askConfirm(declareConfirm(row.people, row.war), () => {\n          options.declareWar(row.playerId);');
    // Propose: the exchange, or the peace with its terms.
    const table = braceBody(screen, '  function drawTable(');
    expect(table).toContain('if (model.peace) options.offerPeace(row.playerId, true, { give: draft.give, take: draft.take });');
    expect(table).toContain('else options.proposeDeal(row.playerId, draft.give, draft.take);');
    // Their offer on the table: accept or decline it; sign or refuse their peace.
    const offer = braceBody(screen, '  function drawOffer(');
    expect(offer).toContain('options.offerPeace(row.playerId, true);');
    expect(offer).toContain('options.declinePeace(row.playerId);');
    expect(offer).toContain('options.answerDeal(proposal.id, true);');
    expect(offer).toContain('options.answerDeal(proposal.id, false);');
    // Your own offers, in the drawer: take back the peace, withdraw a bargain.
    const drawer = braceBody(screen, '  function drawDrawer(');
    expect(drawer).toContain('options.offerPeace(row.playerId, false);');
    expect(drawer).toContain('options.withdrawDeal(paper);');
    // No other place sends a command.
    const count = (verb: string): number => screen.split(`options.${verb}(`).length - 1;
    expect(count('declareWar')).toBe(1);
    expect(count('proposeDeal')).toBe(1);
    expect(count('answerDeal')).toBe(2);
    expect(count('declinePeace')).toBe(1);
    expect(count('withdrawDeal')).toBe(1);
    expect(count('offerPeace')).toBe(3);
  });
});
