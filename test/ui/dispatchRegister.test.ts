/**
 * **Every command a surface sends leaves through a door that reports it** —
 * `docs/flags.md` (mmmmmm), the hole the victory ruling (llllll) walked into.
 *
 * The bug this file exists to make un-diggable: a dozen surfaces on the page
 * sent their commands with a bare `dispatch` and then repainted with
 * `controls.refresh()`, reaching **neither** of the two reporters. A command
 * issued there produced no shared news at all — the raid, the plundered
 * caravan, the route that ended, the pillage, the wonder somebody else
 * finished, the grants that ride with it, the war declared, and last and
 * loudest the end of the game. The silence used to be deferred (the next
 * *reported* command said it late); the victory sheet's once-guard turned it
 * permanent.
 *
 * And the same calls abused a second contract: `refresh` means "the game object
 * was replaced", so a player picking a card was quietly seated back in the
 * first chair, with the skip set emptied and every once-guard re-baselined
 * underneath them.
 *
 * Both halves are **structural** facts about which function calls which, which
 * is what a register test is for and what this suite can read: there is no
 * jsdom here (`controls.test.ts`'s docblock), so the page's closures are read
 * as text exactly as `seatRoster.test.ts` and `civilianCapture.test.ts` read
 * theirs. The one thing that can be *driven* is driven: a faith purchase off
 * the religion sheet really can end the game, and the road from that result to
 * the sheet is then walked a link at a time.
 */

import { describe, expect, it } from 'vitest';

import { braceBody, uiSource } from './sourceHelpers';

import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { BEAD_RULES } from '../../src/sim/beadData';
import { buildingProductionCost, foundCityAt } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { dispatch } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { game } from '../sim/purchaseHelpers';

const MAIN = uiSource('main.ts');
const CONTROLS = uiSource('controls.ts');

/** Every module under `src/ui/`, by file name, so the sweep needs no list. */
const UI_SOURCES = import.meta.glob('../../src/ui/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// --- one door ---------------------------------------------------------------

describe('the page dispatches in exactly one place', () => {
  /**
   * The claim the whole batch rests on. Thirteen call sites became one, and the
   * day a fourteenth sheet is written this is the test that fails.
   */
  it('calls `dispatch` once, and the call is `send`\'s', () => {
    const calls = MAIN.match(/\bdispatch\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(braceBody(MAIN, 'function send(command: Command): CommandResult')).toContain(
      'dispatch(game, command)',
    );
  });

  /**
   * And the door does both jobs. `reportCommand` rather than `commit` is
   * deliberate and `reportCommand`'s own docblock says why: the funnel's list
   * would re-run the sighting poll and a dozen other readings for one command,
   * and two of the things on it raise a modal — from inside the callback of the
   * modal that is raising the next one itself.
   *
   * The repaint is `controls.repaint()`, on acceptance alone: a refused command
   * changes nothing (hard rule 1), so there is nothing to tell and nothing to
   * redraw.
   */
  it('hands every result to the reporter and repaints only on acceptance', () => {
    const body = braceBody(MAIN, 'function send(command: Command): CommandResult');
    expect(body).toContain('controls.reportCommand(command, result)');
    expect(body).toContain('if (result.ok) controls.repaint()');
    expect(body).not.toContain('controls.refresh');
  });

  /**
   * The register of command types that leave through it — the thirteen sites
   * the sweep found, of which the ruling had named four. A sheet added to the
   * page joins this list in the pass that ships it, or the count above fails
   * first.
   */
  it('sends the whole register of the page\'s own commands', () => {
    const types = [...MAIN.matchAll(/\bsend\(\s*\{\s*type: '(\w+)'/g)].map((m) => m[1]).sort();
    expect(types).toEqual(
      [
        // The three hands an offer card answers, and the pass beside the first.
        'chooseOrder',
        'skipOrderOffer',
        'adoptGovernment',
        'chooseDoctrine',
        // The ruin or the village, and the belief a prophet bought.
        'chooseDiscovery',
        'chooseBelief',
        // The tarot, the rail at the foot of the Reliquary, and the reroll that
        // re-deals whichever of these is on the table.
        'chooseGreatPerson',
        'purchaseGreatPersonOffer',
        'rerollOffer',
        // The religion sheet's faith purchase.
        'purchaseItem',
        // The two sheets the End Turn blocker raises.
        'chooseWager',
        'dismissCensus',
      ].sort(),
    );
    // The thirteenth is a whole class rather than one verb: the reward sheet
    // hands its command down already built, so the page sends it unopened.
    expect(MAIN).toContain('const result = send(command)');
  });

  /**
   * Nothing else on the page or under `src/ui/` keeps a dispatcher of its own.
   *
   * Three modules do, each for a stated reason of its own, and each reports
   * through `controls.reportCommand`: the board's funnel, the star chart and
   * the city panel. A fourth is a design decision and this is where it is made.
   */
  it('leaves exactly three screens dispatching for themselves, all reporting', () => {
    const dispatchers = Object.entries(UI_SOURCES)
      .filter(([, text]) => /\bdispatch\(/.test(text))
      .map(([path]) => path.slice(path.lastIndexOf('/') + 1))
      .sort();
    expect(dispatchers).toEqual(['cityPanel.ts', 'controls.ts', 'techTree.ts']);
    // The two that are not the funnel report through the seam the funnel ends
    // on, and `main.ts` is what hands it to them.
    for (const name of ['cityPanel.ts', 'techTree.ts']) {
      const text = Object.entries(UI_SOURCES).find(([path]) => path.endsWith(`/${name}`))![1];
      expect(text).toContain('onCommitted');
    }
    expect([...MAIN.matchAll(/onCommitted: \(command, result\) => controls\.reportCommand\(/g)])
      .toHaveLength(2);
  });
});

// --- one road to the news ---------------------------------------------------

describe('the shared news has one road into it', () => {
  /**
   * `commit` and `reportCommand` are the two ways a command reaches the player,
   * and the second is inside the first — so there is exactly one call of
   * `reportSharedNews` in the file, and a third way to be told would have to
   * add one.
   */
  it('is reached from `reportCommand` alone, which `commit` ends on', () => {
    const calls = [...CONTROLS.matchAll(/reportSharedNews\(/g)];
    // The declaration and its one call.
    expect(calls).toHaveLength(2);
    expect(
      braceBody(CONTROLS, 'function reportCommand(command: Command, result: CommandResult): void'),
    ).toContain('reportSharedNews(result)');
    expect(braceBody(CONTROLS, 'function commit(command: Command): CommandResult')).toContain(
      'reportCommand(command, result)',
    );
  });

  /**
   * The register itself, in the order the file folds it. The victory sheet is
   * last for `scheduleHandOver`'s reason: the marvel that closed the age is
   * announced before the age closing.
   */
  it('is the eight reporters the ruling named, in that order', () => {
    const body = braceBody(CONTROLS, 'function reportSharedNews(result: CommandResult): void');
    expect([...body.matchAll(/^\s{4}(report\w+)\(/gm)].map((m) => m[1])).toEqual([
      'reportRaids',
      'reportTraderLosses',
      'reportRoutes',
      'reportPillages',
      'reportWonders',
      'reportGrants',
      'reportDiplomacy',
      'reportVictory',
    ]);
  });
});

// --- the chair --------------------------------------------------------------

describe('a command never moves the player to another chair', () => {
  /**
   * `refresh`'s contract is obeyed rather than widened: it still means "the
   * game object was replaced", and it still seats the client. What was wrong
   * was the calling, not the contract.
   */
  it('keeps `refresh` the seat-taking one', () => {
    expect(braceBody(CONTROLS, 'refresh: (seatId = 0) => {')).toContain('localPlayerId = seatId');
  });

  /** And its mid-game twin touches nothing about who is sitting down. */
  it('gives `repaint` no opinion about the seat', () => {
    const body = braceBody(CONTROLS, 'function repaint(): void');
    expect(body).not.toContain('localPlayerId');
    expect(body).not.toContain('sightings');
    expect(body).not.toContain('Announced');
    // What it does do: the lens, the board, the overlays, the HUD — once each.
    expect(body).toContain('renderer.noteStateChanged?.()');
    expect(body).toContain('refreshOverlays()');
    expect(body).toContain('onUpdate(selectedUnit()');
  });

  /**
   * The page calls `refresh` at the two seams a game object is actually
   * replaced at — a restart and a boot — and nowhere else. Both name the seat
   * a loaded save implies, which is the whole reason the argument exists.
   */
  it('refreshes only where the game object is replaced', () => {
    const calls = [...MAIN.matchAll(/controls\.refresh\(([^;]*)\)/g)].map((m) => m[1]!);
    expect(calls).toHaveLength(2);
    for (const argument of calls) expect(argument).toContain('resumeSeat(game.state)');
    // The zero-argument form — "seat the client at the first chair" — is the
    // one this batch deleted from every mid-game path.
    expect(MAIN).not.toContain('controls.refresh()');
  });

  /**
   * The diplomacy rail was the other half of the same abuse: it reported
   * correctly (every verb on it goes through `controls`, and so through the
   * board's own funnel) but repainted with `refresh`, which emptied the skip
   * set and dropped the selection on a press of Declare War.
   */
  it('repaints the diplomacy rail without re-seating it', () => {
    for (const verb of [
      'controls.declareWarOn(targetId);',
      'controls.offerPeaceTo(targetId, standing, offered);',
      'controls.proposeDealWith(targetId, give, take);',
      'controls.answerDealOf(dealId, accept);',
      'controls.declinePeaceFrom(targetId);',
      'controls.withdrawDealOf(dealId);',
    ]) {
      const at = MAIN.indexOf(verb);
      expect(at).toBeGreaterThan(0);
      expect(MAIN.slice(at, at + verb.length + 40)).toContain('controls.repaint()');
    }
  });
});

// --- and the loudest line of all --------------------------------------------

/** The one row in the table that ends the game. Found by its marker, never named. */
const OPUS = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;
/** The technology the world must reach before anybody may begin it. */
const CLOSER = buildingDef(OPUS).worldUnlockTech!;

/** A seat holding the closer, with its rod full and a town to build in. */
function ready() {
  const g = game();
  const state: GameState = g.state;
  const player = playerById(state, 0)!;
  if (!player.techsResearched.includes(CLOSER as never)) {
    player.techsResearched.push(CLOSER as never);
  }
  while (player.beads.length < BEAD_RULES.threshold) {
    player.beads.push({ id: 'theFounder', kind: 'quest', family: 'economic', turn: state.turn });
  }
  bumpRevision(state);
  const unit = state.units.find((u) => u.ownerId === 0)!;
  const town = foundCityAt(state, 0, getTileAt(state.map, unit.col, unit.row)!);
  town.queue.length = 0;
  town.queue.push({ kind: 'building', id: OPUS });
  town.hammerBasket = 0;
  return { g, state, town, player };
}

describe('a purchase off the faith sheet can win the game, and now says so', () => {
  /**
   * The sim half is pinned in `test/sim/endgame.test.ts`; what is pinned here is
   * that the *page's* faith purchase is the same command, and that the state it
   * leaves behind is the one `reportVictory` reads.
   *
   * The religion sheet's `buy` is the road the ruling calls the user's most
   * likely one, and until this batch it was the road with no reporter on it at
   * all.
   */
  it('leaves a winner on the state, which is what the sheet is raised off', () => {
    const { g, state, town, player } = ready();
    player.gold = buildingProductionCost(OPUS, state, 0) * RULES.production.goldPerHammer;
    expect(state.winnerId).toBeNull();

    const result = dispatch(g, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: town.id,
      item: { kind: 'building', id: OPUS },
      currency: 'gold',
    } as Command);

    expect(result.ok).toBe(true);
    expect(state.winnerId).toBe(0);
    // `reportVictory` is a reading of the board rather than of the result —
    // which is exactly why it had to be inside a reporter something calls.
    expect(braceBody(CONTROLS, 'function reportVictory(): void')).toContain(
      'getGame().state.winnerId',
    );
  });

  /**
   * And the page's own purchase is spelt the same way, through `send`. Read as
   * text because the religion screen's `buy` lives in a closure this suite
   * cannot mount.
   */
  it('is sent through the one door like everything else', () => {
    const at = MAIN.indexOf("buy: (cityId, item, currency) => {");
    expect(at).toBeGreaterThan(0);
    const body = MAIN.slice(at, at + 400);
    expect(body).toContain('send({');
    expect(body).toContain("type: 'purchaseItem'");
    expect(body).not.toContain('controls.refresh');
  });
});
