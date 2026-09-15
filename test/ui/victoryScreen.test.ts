/**
 * **The victory sheet, and the standings** — `docs/flags.md` item (uuuuu).
 *
 * No jsdom in this suite (`controls.test.ts`'s note), which is exactly why the
 * page is a pure fold above the DOM: what can be quietly wrong here is which
 * seat leads, whether a row lines up with the reading it came from, what the
 * masthead says, and whether the two doors at the foot are the journeys the
 * game already has. Every one of those is a value or a line of source.
 *
 * The two cases about the *old* victory modal moved here with it
 * (`beadsScreen.test.ts` had them): the winner is named on this sheet's masthead
 * now, and the modal it replaced is gone from the tree.
 */

import { describe, expect, it } from 'vitest';

import { explainScore, foldScore } from '../../src/sim/score';
import { RULES } from '../../src/sim/rulesData';
import { seatName } from '../../src/sim/leaderData';
import { bumpRevision, playerById, realPlayers } from '../../src/sim/state';
import {
  deckWords,
  opusName,
  victoryHead,
  victoryPage,
} from '../../src/ui/victoryScreen';
import { found, game } from '../sim/statecraftHelpers';
import { uiSource } from './sourceHelpers';

function bench() {
  const { state } = game();
  found(state, 0);
  bumpRevision(state);
  return state;
}

describe('the standings page', () => {
  it('gives every row of every column one line of the reading', () => {
    const state = bench();
    const page = victoryPage(state, 0);
    expect(page.columns).toHaveLength(realPlayers(state).length);
    const reading = explainScore(state, 0);
    // The rows *are* the reading's lines: same labels, same order, same weights.
    expect(page.labels).toEqual(reading.map((line) => line.label));
    expect(page.weights).toEqual(reading.map((line) => line.weight));
    for (const column of page.columns) {
      expect(column.lines.map((line) => line.label)).toEqual(page.labels);
      // And the foot is the fold of the column above it, never a second sum.
      expect(column.total).toBe(foldScore(column.lines));
    }
  });

  it('reads the weights off the sheet rather than out of the drawing', () => {
    const state = bench();
    const page = victoryPage(state, 0);
    const at = page.labels.indexOf('Towns held');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(page.weights[at]).toBe(RULES.score.perTown);
  });

  it('orders the columns by their own fold, and marks the local seat', () => {
    const state = bench();
    const page = victoryPage(state, 0);
    for (let at = 1; at < page.columns.length; at += 1) {
      expect(page.columns[at - 1]!.total).toBeGreaterThanOrEqual(page.columns[at]!.total);
    }
    expect(page.columns.filter((column) => column.you)).toHaveLength(1);
    expect(page.columns.find((column) => column.you)!.playerId).toBe(0);
    // The wild never has a column — `realPlayers` is the register for who counts.
    for (const column of page.columns) {
      expect(playerById(state, column.playerId)!.barbarian).toBe(false);
    }
  });

  it('says where the world stands until somebody has won', () => {
    const state = bench();
    const head = victoryHead(state, 0);
    expect(head.won).toBe(false);
    expect(head.headline).toContain(opusName());
    // No masthead name until there is a winner to put in it: the sheet already
    // wears its title in its own header.
    expect(head.name).toBe('');
  });

  it('names the winner the same way on every screen, and marks the column', () => {
    const state = bench();
    state.winnerId = 1;
    bumpRevision(state);
    const mine = victoryHead(state, 1);
    const theirs = victoryHead(state, 0);
    expect(mine.won).toBe(true);
    expect(mine.headline).toBe(`${seatName(state, 1)} has finished ${opusName()}.`);
    // The world's announcement is one sentence; only the line under it is about
    // the reader.
    expect(theirs.headline).toBe(mine.headline);
    expect(theirs.text).not.toBe(mine.text);
    expect(theirs.eyebrow).not.toBe(mine.eyebrow);

    const page = victoryPage(state, 0);
    expect(page.columns.filter((column) => column.winner)).toHaveLength(1);
    expect(page.columns.find((column) => column.winner)!.playerId).toBe(1);
  });

  it('writes the deck’s line off the reading’s own marked lines', () => {
    const state = bench();
    const lines = explainScore(state, 0);
    const words = deckWords(lines);
    if (lines.every((line) => line.voice === undefined || line.count === 0)) {
      expect(words).toBe('nothing yet');
    } else {
      expect(words.length).toBeGreaterThan(0);
    }
    // A deck paying nothing says so in words rather than printing noughts.
    expect(deckWords([])).toBe('nothing yet');
  });
});

describe('the sheet itself', () => {
  const screen = uiSource('victoryScreen.ts');

  it('is on the shared frame, with no copy of the contract', () => {
    expect(screen).toContain('createModalShell({');
    expect(screen).not.toContain("window.addEventListener('keydown'");
    // The keyboard goes back to the door that opened it.
    expect(screen).toContain('trigger');
  });

  it('carries both journeys, and neither is a second one of its own', () => {
    // Continue playing is the shell's own close: one door, four ways in.
    expect(screen).toContain("stay.textContent = 'Continue playing';");
    expect(screen).toContain('stay.addEventListener(\'click\', () => shell.close());');
    expect(screen).toContain("title.textContent = 'Back to the title';");
    expect(screen).toContain('options.toTitle();');
    const main = uiSource('main.ts');
    expect(main).toContain('toTitle: () => showLanding(),');
  });

  it('is raised by the decided game and by the dock’s own door', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('victory = createVictoryScreen({');
    expect(main).toContain('trigger: hudDock.standingsButton,');
    expect(main).toContain('victory?.open();');
    expect(main).toContain(
      "hudDock.standingsButton.addEventListener('click', () => {\n    openScreen(() => victory?.open());\n  });",
    );
  });

  it('has replaced the modal it was written to replace', () => {
    // The module is gone from the tree, its markup with it, and nothing still
    // calls the news shape it took.
    expect(() => uiSource('victoryModal.ts')).toThrow();
    const main = uiSource('main.ts');
    expect(main).not.toContain('createVictoryModal');
    expect(main).not.toContain('victory?.show({');
    const html = uiSource('index.html');
    expect(html).toContain('id="victory-body"');
    expect(html).toContain('id="victory-close"');
    // And it wears the cap rule's own class, like every other sheet on the
    // frame (CLAUDE.md's H5 rule).
    const overlay = html.slice(html.indexOf('id="victory-overlay"'));
    expect(overlay.slice(0, 200)).toContain('class="statecraft-overlay"');
  });
});
