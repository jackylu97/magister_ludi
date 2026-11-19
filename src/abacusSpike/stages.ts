/**
 * The Abacus where the player meets it: `abacus.html?stage=bead`,
 * `?stage=screen` or `?stage=close`.
 *
 * This mounts the game's own bead page (`beadModal.ts`), Abacus screen
 * (`abacusScreen.ts`) and Opus close (`opusClose.ts`) with a made-up table of
 * three seats. Nothing here is game code: the three pages are the real ones, and
 * only the table and the age are invented. It replaced the separate
 * `abacus-stages.html` of the styling pass (2026-11-18), so the look-dev page
 * stays one page.
 *
 * - `?abacusAge=3` sets the age on the plaque (default 2).
 * - `?hold=1` stops the Opus close just after the golden bead lands, with the
 *   camera still in, for a still picture.
 */

import '../style.css';

import { VIEW3D } from '../render3d/lookData';
import type { EarnedBead } from '../sim/state';
import { type AbacusRow, createAbacusScreen } from '../ui/abacusScreen';
import { createBeadModal } from '../ui/beadModal';
import { requireElement } from '../ui/dom';
import { OPUS_CLOSE_TIMING, createOpusClose, opusCloseSchedule } from '../ui/opusClose';

const params = new URLSearchParams(location.search);

/** The age on the plaque: `?abacusAge=`, or the second age. */
const AGE = Math.max(1, Math.round(Number(params.get('abacusAge') ?? '2')) || 2);

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

/** The overlays the three pages are built into, as the game's page has them. */
const OVERLAYS = `
  <div id="bead-overlay" class="triumph-overlay" role="dialog" aria-modal="true" aria-label="A bead" hidden></div>
  <div id="opus-close-overlay" class="opus-close" role="dialog" aria-modal="true"
       aria-label="The Magnum Opus is finished" tabindex="-1" hidden></div>
  <button id="abacus-trigger" type="button" hidden>Abacus</button>
  <div id="abacus-overlay" class="abacus-overlay" role="dialog" aria-modal="true" aria-label="The Abacus" hidden>
    <div class="abacus-sheet">
      <header class="abacus-head">
        <div class="abacus-head-titles"><h2 class="abacus-title">The Abacus</h2></div>
        <button id="abacus-close" class="abacus-close" type="button" aria-label="Close">×</button>
      </header>
      <div id="abacus-stage" class="abacus-stage"></div>
      <div id="abacus-register" class="abacus-register"></div>
    </div>
  </div>`;

export function mountStage(stage: 'bead' | 'screen' | 'close'): void {
  // The bench's own elements leave: this mode is the game's pages alone.
  document.body.innerHTML = OVERLAYS;

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
      age: () => AGE,
    });
    screen.open();
    return;
  }

  if (stage === 'close') {
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
      age: AGE,
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
    return;
  }

  const modal = createBeadModal(requireElement('bead-overlay'), {
    table: () => ({ rows: ROWS, seat: 0, age: AGE }),
  });
  modal.show([
    {
      id: 'theRoadBuilder',
      name: 'The Wager of the Purse',
      kind: 'grant',
      family: 'culture',
      boon: [],
      rod: ROWS[0]!.beads,
    },
  ]);
}
