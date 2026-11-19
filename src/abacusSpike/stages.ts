/**
 * The Abacus at its three stages, for the styling pass of 2026-11-18.
 *
 * `abacus-stages.html` mounts the game's own bead page (`beadModal.ts`),
 * Abacus screen (`abacusScreen.ts`) and Opus close (`opusClose.ts`) with a
 * made-up table of three seats. Nothing here is game code: the three pages are
 * the real ones, and only the table is invented. The style option comes from
 * `?look=` (`src/render3d/abacusLooks.ts`).
 *
 * Remove this file and `abacus-stages.html` when the style is chosen.
 */

import '../style.css';

import { VIEW3D } from '../render3d/lookData';
import type { EarnedBead } from '../sim/state';
import { type AbacusRow, createAbacusScreen } from '../ui/abacusScreen';
import { createBeadModal } from '../ui/beadModal';
import { OPUS_CLOSE_TIMING, createOpusClose, opusCloseSchedule } from '../ui/opusClose';
import { requireElement } from '../ui/dom';

const params = new URLSearchParams(location.search);
const stage = params.get('stage') ?? 'bead';

function bead(family: EarnedBead['family'], turn: number): EarnedBead {
  return { id: 'theRoadBuilder', kind: 'grant', family, turn };
}

const ROWS: AbacusRow[] = [
  {
    playerId: 0,
    name: 'Pachacuti',
    color: VIEW3D.palette.crimson!,
    beads: [bead('economic', 40), bead('science', 61), bead('domination', 88), bead('culture', 104)],
  },
  { playerId: 1, name: 'Hypatia', color: VIEW3D.palette.bone!, beads: [bead('science', 52), bead('culture', 97)] },
  {
    playerId: 2,
    name: 'Joan of Arc',
    color: VIEW3D.palette.lapis!,
    beads: [
      bead('domination', 33),
      bead('domination', 47),
      bead('economic', 70),
      bead('science', 91),
      bead('culture', 110),
    ],
  },
];

if (stage === 'screen') {
  const screen = createAbacusScreen({
    overlay: requireElement('abacus-overlay'),
    stage: requireElement('abacus-stage'),
    register: requireElement('abacus-register'),
    closeButton: requireElement('abacus-close'),
    trigger: requireElement('abacus-trigger'),
    rows: () => ROWS,
    wagers: () => [],
    census: () => null,
  });
  screen.open();
} else if (stage === 'close') {
  const close = createOpusClose({
    overlay: requireElement('opus-close-overlay'),
    onFinished: () => undefined,
  });
  close.play({
    nigredo: 'The Magnum Opus is finished in Cusco.',
    builder: 'Pachacuti of the Inca',
    albedo: 'Pachacuti has finished The Magnum Opus.',
    rows: ROWS,
    winnerRod: 0,
  });
  if (params.has('hold')) {
    // Stop the page's clock just after the golden bead has landed, so the
    // picture is the frame with the golden bead home and the camera still in.
    const at = opusCloseSchedule(false);
    const land = at.slide + OPUS_CLOSE_TIMING.slideMs + 350;
    window.setTimeout(() => {
      const highest = window.setTimeout(() => undefined, 0);
      for (let id = 0; id <= highest; id++) window.clearTimeout(id);
      document.documentElement.dataset.held = '1';
    }, land);
  }
} else {
  const modal = createBeadModal(requireElement('bead-overlay'), {
    table: () => ({ rows: ROWS, seat: 0 }),
  });
  const mine = ROWS[0]!.beads;
  modal.show([
    {
      id: 'theRoadBuilder',
      name: 'The Wager of the Purse',
      kind: 'grant',
      family: 'culture',
      boon: [],
      rod: mine,
    },
  ]);
}
