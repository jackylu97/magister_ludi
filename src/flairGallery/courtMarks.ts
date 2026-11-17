/**
 * The court marks (batch SS6): the envelope, the crossed blades and the arrow
 * of the diplomacy sheet and the deal notice, asked of the module that draws
 * them (`src/art/courtMarks.ts`) and shown as masks, as the game shows them.
 *
 * Its own section at the end of the cabinet, so a new section elsewhere on the
 * page never touches it.
 */
import { COURT_MARK_IDS, COURT_MARKS, courtMarkDataUri } from '../art/courtMarks';
import { block, markCell, markGrid } from './sheet';

export function drawCourtMarks(into: HTMLElement): void {
  const grid = markGrid(
    block(
      into,
      'Court marks — src/art/courtMarks.ts',
      'Drawn on the approved diplomacy board, each in its own small box and stroke. The game prints them at that size, 9 to 16 px, in the ink of the text beside them: the envelope in rubric, the blades in war red.',
    ),
  );
  for (const id of COURT_MARK_IDS) markCell(grid, id, courtMarkDataUri(id), COURT_MARKS[id].note);
}
