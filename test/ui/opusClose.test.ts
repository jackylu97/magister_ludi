/**
 * **The Opus close** (batch SS7, `src/ui/opusClose.ts`): nigredo, albedo and the
 * full-screen page with the 3D Abacus, raised when the Magnum Opus is finished.
 *
 * No jsdom and no WebGL in this suite, so the words and the beat schedule are
 * pure readings, and the wiring is pinned by reading the source: the close is
 * news, it is raised only for a game the Opus closed, it hands over to the
 * standings, any key goes straight there, reduced motion drops the camera move
 * and the turn, and both sweeps take it down.
 */

import { describe, expect, it } from 'vitest';

import { opusBuildingId } from '../../src/sim/score';
import { buildingDef } from '../../src/sim/buildingData';
import type { BeadCardId } from '../../src/sim/beadData';
import { bumpRevision, realPlayers } from '../../src/sim/state';
import { seatName } from '../../src/sim/leaderData';
import type { AbacusRow } from '../../src/ui/abacusScreen';
import { frameBeads } from '../../src/ui/abacusScreen';
import { OPUS_CLOSE_TIMING, opusCloseReading, opusCloseSchedule } from '../../src/ui/opusClose';
import { opusName, seatTitle } from '../../src/ui/victoryScreen';
import { found, game } from '../sim/statecraftHelpers';
import { uiSource } from './sourceHelpers';

/** The close's own stylesheet, which the shared source glob does not cover. */
const CLOSE_CSS = import.meta.glob('../../src/ui/opusClose.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function goldenBeadId(): BeadCardId {
  const grant = (buildingDef(opusBuildingId()!).onComplete ?? []).find((entry) => entry.grant === 'bead');
  if (grant === undefined || grant.grant !== 'bead') throw new Error('the Opus mints no bead');
  return grant.bead;
}

/** A game the second seat has closed with the Opus, in a town of its own. */
function closed() {
  const { state } = game();
  found(state, 0);
  const town = found(state, 1);
  town.buildings.push(opusBuildingId()!);
  state.players[1]!.beads.push({ id: goldenBeadId(), kind: 'grant', family: 'culture', turn: state.turn });
  state.winnerId = 1;
  bumpRevision(state);
  const rows: AbacusRow[] = realPlayers(state).map((player) => ({
    playerId: player.id,
    name: seatName(state, player.id),
    color: 0x112233,
    beads: player.beads,
  }));
  return { state, town, rows };
}

describe('the Opus close, as data', () => {
  it('names the work and its town, then the builder, from the game’s own readings', () => {
    const { state, town, rows } = closed();
    const close = opusCloseReading(state, rows);
    expect(close.nigredo).toBe(`${opusName()} is finished in ${town.name}.`);
    expect(close.builder).toBe(seatTitle(state, 1));
    expect(close.albedo).toBe(`${seatName(state, 1)} has finished ${opusName()}.`);
    expect(rows[close.winnerRod]?.playerId).toBe(1);
    // Words only (hard rule 7).
    for (const line of [close.nigredo, close.builder, close.albedo]) expect(line).not.toMatch(/\d/);
  });

  it('leaves the golden bead off the frame until the close lights it', () => {
    const { rows } = closed();
    const winner = rows.find((row) => row.playerId === 1)!;
    expect(winner.beads.length).toBe(1);
    expect(frameBeads(winner.beads, 13)).toEqual([]);
  });

  it('keeps the board’s beat lengths, about six seconds in all', () => {
    const t = OPUS_CLOSE_TIMING;
    expect([t.nigredoMs, t.albedoMs, t.pageMs, t.lightMs, t.slideMs, t.turnMs]).toEqual([
      1200, 1200, 400, 600, 500, 2000,
    ]);
    const full = opusCloseSchedule(false);
    expect(full.finish).toBeGreaterThanOrEqual(5500);
    expect(full.finish).toBeLessThanOrEqual(6500);
    // In order, one after another.
    const order = [full.albedo, full.page, full.light, full.slide, full.turn, full.finish];
    for (let at = 1; at < order.length; at += 1) expect(order[at]!).toBeGreaterThan(order[at - 1]!);
    // Reduced motion has no turn: a short hold stands in its place.
    const still = opusCloseSchedule(true);
    expect(still.finish - still.turn).toBe(t.stillMs);
    expect(still.finish).toBeLessThan(full.finish);
    // The slide stays under reduced motion, because the slide is the event.
    expect(still.turn - still.slide).toBe(t.slideMs);
  });
});

describe('the Opus close, wired', () => {
  const main = uiSource('main.ts');
  const close = uiSource('opusClose.ts');

  it('is raised for a game the Opus closed, and hands over to the standings', () => {
    const victory = main.slice(main.indexOf('onVictory: (playerId) => {'));
    const body = victory.slice(0, victory.indexOf('\n    },'));
    expect(body).toContain('if (opusClose && wonByOpus(game.state)) {');
    expect(body).toContain('opusClose.play(opusCloseReading(game.state, abacusRows()));');
    // Any other win keeps the card and the sheet.
    expect(body).toContain('splash.announceVictory(');
    expect(body).toContain('victory?.open();');
    expect(main).toContain('onFinished: () => victory?.open(),');
    expect(main).toContain("onOpen: () => screens.opening('opusClose'),");
  });

  it('strings the same rods as the Abacus screen', () => {
    expect(main).toContain('rows: abacusRows,');
    expect(close).toContain('frameBeads(row.beads, perRod)');
    // The one translation of the bead families stays in the Abacus screen.
    expect(close).not.toContain('STAGE_FAMILY');
  });

  it('mounts the existing renderer, and gives its WebGL context back', () => {
    expect(close).toContain('new AbacusStage(');
    expect(close).toContain('stage?.dispose();');
    // A measured stage, like the Abacus screen and the star chart: not on the sheet frame.
    expect(close).not.toContain('createModalShell(');
  });

  it('goes straight to the standings on any key or press, and unbinds what it binds', () => {
    expect(close).toContain("window.addEventListener('keydown', onKeyDown, true);");
    expect(close).toContain("window.removeEventListener('keydown', onKeyDown, true);");
    expect(close).toContain("overlay.addEventListener('pointerdown', onPress);");
    expect(close).toContain("overlay.removeEventListener('pointerdown', onPress);");
    expect(close).toContain("window.removeEventListener('resize', onResize);");
    const onKey = close.slice(close.indexOf('function onKeyDown('));
    expect(onKey.slice(0, onKey.indexOf('\n  }'))).toContain('finish();');
  });

  it('drops the camera move and the turn under reduced motion, and keeps the slide', () => {
    expect(close).toContain('if (!reduced) stage.focusRod(read.winnerRod, 1,');
    expect(close).toContain('if (!stage || reduced) return;');
    expect(close).toContain('stage.setSway(!prefersReducedMotion());');
    expect(close).toContain('() => stage?.slideGolden()');
    const css = Object.values(CLOSE_CSS)[0]!;
    const reducedBlock = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducedBlock).toContain('opus-fade');
  });

  it('is news, blocks the news behind it, and is torn down by both sweeps', () => {
    expect(main).toContain('(opusClose?.isOpen ?? false) ||');
    expect(main).toContain('gameDisposers.push(() => opusClose?.dispose());');
    const suspend = main.slice(main.indexOf('suspendGame = () => {')).split('\n  };')[0]!;
    expect(suspend).toContain('opusClose?.clear();');
  });

  it('is the golden bead’s announcement, so the bead sheet does not tell it again', () => {
    const awards = main.slice(main.indexOf('onBeadAwards: (awards) => {'));
    expect(awards.slice(0, awards.indexOf('pumpBeadNews();'))).toContain('if (isGoldenBead(award)) return;');
  });
});
