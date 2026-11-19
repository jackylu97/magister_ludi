/**
 * **The Opus close** (batch SS7, `src/ui/opusClose.ts`): the painted ending
 * page, then the full-screen page with the 3D Abacus, raised when the Magnum
 * Opus is finished.
 *
 * No jsdom and no WebGL in this suite, so the words, the painting, the doors
 * and the beat schedule are pure readings, and the wiring is pinned by reading
 * the source: the close is news, it is raised only for a game the Opus closed,
 * it opens on the ending page and waits for a door, each door leads where the
 * spec says, the Abacus page hands over to the standings, reduced motion drops
 * the camera move and the turn, and both sweeps take it down.
 */

import { describe, expect, it } from 'vitest';

import { opusBuildingId } from '../../src/sim/score';
import { buildingDef } from '../../src/sim/buildingData';
import type { BeadCardId } from '../../src/sim/beadData';
import { bumpRevision, realPlayers } from '../../src/sim/state';
import { seatName } from '../../src/sim/leaderData';
import type { AbacusRow } from '../../src/ui/abacusScreen';
import { frameBeads } from '../../src/ui/abacusScreen';
import { endingPaintingUrl } from '../../src/ui/endingPaintings';
import {
  OPUS_CLOSE_TIMING,
  OPUS_ENDING_DOORS,
  OPUS_ENDING_PRIMARY,
  OPUS_ENDING_WORDS,
  opusCloseReading,
  opusCloseSchedule,
  opusEndingDoorForKey,
} from '../../src/ui/opusClose';
import { headText, opusName, seatTitle, victoryHead } from '../../src/ui/victoryScreen';
import { shownAge } from '../../src/ui/topBar';
import { found, game } from '../sim/statecraftHelpers';
import { braceBody, uiSource } from './sourceHelpers';

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

describe('the ending page, as data', () => {
  it('gives the winner the win painting, and every other seat the loss painting', () => {
    const { state, rows } = closed();
    const winner = opusCloseReading(state, rows, 1);
    expect(winner.win).toBe(true);
    expect(winner.painting).toBe(endingPaintingUrl(true));
    expect(winner.painting).toBe('/art/splash/endings/win.jpg');
    const other = opusCloseReading(state, rows, 0);
    expect(other.win).toBe(false);
    expect(other.painting).toBe(endingPaintingUrl(false));
    expect(other.painting).toBe('/art/splash/endings/loss.jpg');
  });

  it('names the winner before "wins" on both pages', () => {
    const { state, rows } = closed();
    expect(opusCloseReading(state, rows, 1).winner).toBe(seatName(state, 1));
    expect(opusCloseReading(state, rows, 0).winner).toBe(seatName(state, 1));
    expect(OPUS_ENDING_WORDS.wins).toBe('wins');
    expect(OPUS_ENDING_WORDS.closed).toBe('The Great Work is closed');
  });

  it('tells the winner "You closed ... The game is yours."', () => {
    const { state, town, rows } = closed();
    expect(opusCloseReading(state, rows, 1).line).toBe(
      `You closed ${opusName()} in ${town.name}. The game is yours.`,
    );
  });

  it('tells every other seat who closed it and where: "... closed ... The game is theirs."', () => {
    const { state, town, rows } = closed();
    expect(opusCloseReading(state, rows, 0).line).toBe(
      `${seatTitle(state, 1)} closed ${opusName()} in ${town.name}. The game is theirs.`,
    );
  });

  it('takes its sentence from the standings’ own line, so the two pages cannot disagree', () => {
    const { state, rows } = closed();
    for (const seat of [0, 1]) {
      const line = opusCloseReading(state, rows, seat).line;
      expect(line).toBe(headText(victoryHead(state, seat, 'closed')));
      // Only the verb differs from the standings.
      expect(line).toBe(headText(victoryHead(state, seat)).replace(' finished ', ' closed '));
    }
  });

  it('writes words only, with no figure and no "he" or "she" (hard rule 7)', () => {
    const { state, rows } = closed();
    for (const seat of [0, 1]) {
      const read = opusCloseReading(state, rows, seat);
      for (const words of [read.winner, read.line, OPUS_ENDING_WORDS.closed, OPUS_ENDING_WORDS.wins]) {
        expect(words).not.toMatch(/\d/);
        expect(words).not.toMatch(/\b(he|she|his|her)\b/i);
      }
    }
  });

  it('has three doors, left to right, with "See the Abacus" the primary', () => {
    expect(OPUS_ENDING_DOORS.map((entry) => entry.label)).toEqual([
      'Back to the title',
      'Look at the board',
      'See the Abacus',
    ]);
    expect(OPUS_ENDING_DOORS.map((entry) => entry.door)).toEqual(['title', 'board', 'abacus']);
    expect(OPUS_ENDING_PRIMARY).toBe('abacus');
  });

  it('takes the primary door on Enter or Space, and looks at the board on Escape', () => {
    expect(opusEndingDoorForKey('Enter')).toBe('abacus');
    expect(opusEndingDoorForKey(' ')).toBe('abacus');
    expect(opusEndingDoorForKey('Escape')).toBe('board');
    expect(opusEndingDoorForKey('a')).toBeNull();
    expect(opusEndingDoorForKey('Tab')).toBeNull();
  });
});

describe('the Abacus page, as data', () => {
  it('finds the winner’s rod and puts the world’s age on the plaque (look B, 2026-11-19)', () => {
    const { state, rows } = closed();
    const close = opusCloseReading(state, rows, 0);
    expect(rows[close.winnerRod]?.playerId).toBe(1);
    expect(close.age).toBe(shownAge(state).age);
    expect(uiSource('opusClose.ts')).toContain('{ age: read.age },');
  });

  it('leaves the golden bead off the frame until the close lights it', () => {
    const { rows } = closed();
    const winner = rows.find((row) => row.playerId === 1)!;
    expect(winner.beads.length).toBe(1);
    expect(frameBeads(winner.beads, 13)).toEqual([]);
  });

  it('keeps the board’s beat lengths, about three and a half seconds from the press', () => {
    const t = OPUS_CLOSE_TIMING;
    expect([t.pageMs, t.lightMs, t.slideMs, t.turnMs]).toEqual([400, 600, 500, 2000]);
    const full = opusCloseSchedule(false);
    expect(full.light).toBe(t.pageMs);
    expect(full.finish).toBe(3500);
    // In order, one after another.
    const order = [full.light, full.slide, full.turn, full.finish];
    for (let at = 1; at < order.length; at += 1) expect(order[at]!).toBeGreaterThan(order[at - 1]!);
    // Reduced motion has no turn: a short hold stands in its place.
    const still = opusCloseSchedule(true);
    expect(still.finish - still.turn).toBe(t.stillMs);
    expect(still.finish).toBeLessThan(full.finish);
    // The slide stays under reduced motion, because the slide is the event.
    expect(still.turn - still.slide).toBe(t.slideMs);
  });

  it('builds the stage behind the ending page only after its arrival is over', () => {
    // The stylesheet's arrival ends at 1300 ms + 400 ms.
    expect(OPUS_CLOSE_TIMING.buildMs).toBeGreaterThanOrEqual(1700);
  });
});

describe('the Opus close, wired', () => {
  const main = uiSource('main.ts');
  const close = uiSource('opusClose.ts');
  const css = uiSource('opusClose.css');

  it('is raised for a game the Opus closed, as the local seat reads it, and hands over to the standings', () => {
    const victory = main.slice(main.indexOf('onVictory: (playerId) => {'));
    const body = victory.slice(0, victory.indexOf('\n    },'));
    expect(body).toContain('if (opusClose && wonByOpus(game.state)) {');
    expect(body).toContain('opusClose.play(opusCloseReading(game.state, abacusRows(), controls.localPlayerId()));');
    // Any other win keeps the card and the sheet.
    expect(body).toContain('splash.announceVictory(');
    expect(body).toContain('victory?.open();');
    expect(main).toContain('onFinished: () => victory?.open(),');
    expect(main).toContain("onOpen: () => screens.opening('opusClose'),");
  });

  it('opens on the ending page, which waits for a door rather than a clock', () => {
    const play = braceBody(close, 'function play(read: OpusCloseReading): void {');
    expect(play).toContain("phase = 'ending';");
    expect(play).not.toContain('openAbacus(');
    expect(play).not.toContain('finish(');
    // The Abacus page's beats start only from its door.
    expect(braceBody(close, 'function openAbacus(): void {')).toContain("overlay.classList.add('is-page');");
  });

  it('sends each door where the spec says', () => {
    const doors = braceBody(close, 'function takeDoor(door: OpusEndingDoor): void {');
    // "See the Abacus": the Abacus page as it is today, then the standings.
    expect(doors).toMatch(/case 'abacus':\s+openAbacus\(\);/);
    // "Look at the board": the whole close comes down, and the standings do not rise.
    expect(doors).toMatch(/case 'board':[\s\S]*?leave\(null\);/);
    // "Back to the title": the standings' own path to the landing.
    expect(doors).toMatch(/case 'title':[\s\S]*?clear\(\);\s+options\.toTitle\(\);/);
    expect(braceBody(close, 'function finish(): void {')).toContain('leave(options.onFinished);');
    // Both sheets hand down the same path.
    const wiring = main.slice(main.indexOf('opusClose = createOpusClose({'));
    expect(wiring.slice(0, wiring.indexOf('});'))).toContain('toTitle: () => showLanding(),');
    const standings = main.slice(main.indexOf('victory = createVictoryScreen({'));
    expect(standings.slice(0, standings.indexOf('});'))).toContain('toTitle: () => showLanding(),');
  });

  it('draws the doors in the kit’s buttons: the plates’ gilt outline and the cinnabar primary', () => {
    const page = braceBody(close, 'function endingPage(read: OpusCloseReading): HTMLElement {');
    expect(page).toContain("door === OPUS_ENDING_PRIMARY ? 'btn btn-primary' : 'age-plate-continue'");
    expect(page).toContain('button.addEventListener(\'click\', () => takeDoor(door));');
    expect(close).toContain("import './agePlate.css';");
  });

  it('answers keys by page: doors on the ending page, the standings on the Abacus page', () => {
    const onKey = braceBody(close, 'function onKeyDown(event: KeyboardEvent): void {');
    expect(onKey).toContain('opusEndingDoorForKey(event.key)');
    expect(onKey).toContain('focusedDoor()');
    expect(onKey).toContain('finish();');
    // A press on the ending page's ground does nothing; on the Abacus page it goes on.
    expect(braceBody(close, 'function onPress(event: PointerEvent): void {')).toContain("phase !== 'abacus'");
    expect(close).toContain("window.addEventListener('keydown', onKeyDown, true);");
    expect(close).toContain("window.removeEventListener('keydown', onKeyDown, true);");
    expect(close).toContain("overlay.addEventListener('pointerdown', onPress);");
    expect(close).toContain("overlay.removeEventListener('pointerdown', onPress);");
    expect(close).toContain("window.removeEventListener('resize', onResize);");
    // The Abacus page takes no press until it opens, so the doors under it can be pressed.
    const page = braceBody(css, '\n.opus-page {');
    expect(page).toContain('pointer-events: none;');
  });

  it('shows the painting’s ground when the file fails to load: lapis for a win, the dark cloth for a loss', () => {
    const page = braceBody(close, 'function endingPage(read: OpusCloseReading): HTMLElement {');
    expect(page).toContain("painting.addEventListener('error', () => page.classList.add('is-unpainted'), { once: true });");
    expect(page).toContain("read.win ? 'is-win' : 'is-loss'");
    expect(braceBody(css, '.opus-ending.is-unpainted .opus-ending-painting {')).toContain('display: none;');
    expect(braceBody(css, '\n.opus-ending {')).toContain('background: var(--lampblack);');
    expect(braceBody(css, '\n.opus-ending.is-win {')).toContain('background: var(--deep-lapis);');
  });

  it('covers the window with the painting, cut from its centre', () => {
    const painting = braceBody(css, '\n.opus-ending-painting {');
    expect(painting).toContain('object-fit: cover;');
    expect(painting).toContain('object-position: center;');
  });

  it('marks a win with the sun and a loss with the moon, the wonder plate’s own marks', () => {
    expect(close).toContain("mark.style.setProperty('--wp-sun', `url(\"${orderFaceMarkUri('sun')}\")`);");
    expect(close).toContain("mark.style.setProperty('--wp-moon', `url(\"${orderFaceMarkUri('moon')}\")`);");
    expect(braceBody(css, '.opus-ending.is-win .opus-ending-mark {')).toContain('var(--wp-sun)');
    expect(braceBody(css, '.opus-ending.is-loss .opus-ending-mark {')).toContain('var(--wp-moon)');
  });

  it('fades the painting in slowly, then the words and doors, and shows all at once under reduced motion', () => {
    expect(braceBody(css, '\n.opus-ending {')).toContain('transition: opacity 900ms');
    expect(braceBody(css, '.opus-close.is-ending .opus-ending-words {')).toContain('400ms');
    expect(braceBody(css, '.opus-close.is-ending .opus-ending-words {')).toContain('1300ms both');
    expect(braceBody(css, '.opus-close.is-ending .opus-ending-doors {')).toContain('1300ms both');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.opus-ending {\n    transition: none;');
    expect(reduced).toMatch(/\.opus-ending-words,\s+\.opus-close\.is-ending \.opus-ending-doors \{\s+animation: none;/);
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

  it('drops the camera move and the turn under reduced motion, and keeps the slide', () => {
    expect(close).toContain('if (!reduced) stage.focusRod(read.winnerRod, 1,');
    expect(close).toContain('if (!stage || reduced) return;');
    expect(close).toContain('stage.setSway(!prefersReducedMotion());');
    expect(close).toContain('() => stage?.slideGolden()');
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
