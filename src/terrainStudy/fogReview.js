/**
 * The fog review: `/terrain-study.html?review=fog`.
 *
 * One frontier on the production board rather than on a staged fixture —
 * `buildPaintedBoard` with the study's own materials, so what is on screen is
 * the same terrain, the same painterly light and the same fog texture the
 * game's `?art=painted` look uses. Only the *levels* are staged: a visible
 * bubble, a remembered ring around it and uncharted beyond, written straight
 * into the fog with no simulation and no seat.
 *
 * The centre is chosen on a coast so that one frame carries both frontiers — a
 * land edge where the relief stops, and a sea edge where the chart's margin
 * begins — which is the composition the user's plate is drawn from
 * (`mockups/fog-study/three-registers.png`, shown beside the sliders).
 *
 * The page began as a four-way comparison (wash · drawn · shadowed · bleed) and
 * is now a dial: the user chose shadowed off the plate, the other three were
 * deleted with their knobs, and what is left is the one treatment with every
 * number it reads on a slider. See `docs/plans/painted-fog-study.md`.
 *
 * Nothing here belongs to the game: it is a review harness, and it holds the
 * only DOM in the study that the study's own panel does not own.
 */

import { buildPaintedBoard } from '../render3d/paintedBoard.js';
import { offsetToAxial } from '../sim/map';
import { hexDistance } from '../sim/hex';
import { centre, isWater } from './surface.js';

const PLATE = '/mockups/fog-study/three-registers.png';

/** The two frames, in world units across. A hex is √3 wide. */
const GAME_WIDTH = 34, CLOSE_WIDTH = 14;

/** The review's own furniture, injected rather than added to the page's sheet. */
const STYLE = `
.fog-panel{position:fixed;top:64px;right:16px;z-index:5;width:250px;padding:12px;
  background:#f7f2e1ed;border:2px solid #1d1a20;box-shadow:4px 4px 0 #1d1a20;
  font:12px system-ui;color:#303b37;max-height:calc(100vh - 64px);overflow-y:auto}
.fog-panel h2{font:20px Georgia;margin:0 0 6px}
.fog-panel label{display:block;margin:5px 0}
.fog-panel input[type=range]{width:100%}
.fog-note{font-size:11px;line-height:1.45;color:#5c5545;margin:7px 0}
.fog-buttons{display:flex;flex-wrap:wrap;gap:3px;margin-top:8px}
.fog-buttons button{padding:5px 7px;background:#f7f2e1;border:1px solid #777;color:#303b37;font:11px system-ui;cursor:pointer}
.fog-plate{margin:10px 0 0}
.fog-plate img{width:100%;display:block;border:1px solid #1d1a20}
.fog-plate figcaption{font:10px monospace;color:#6b6353;margin-top:3px}
`;

/** The staged levels: 2 inside the bubble, 1 out to the ring, 0 past it. */
function stageLevels(map, centreTile, visible, remembered, shift = 0) {
  const origin = offsetToAxial(centreTile.col + shift, centreTile.row);
  const levels = new Array(map.tiles.length).fill(0);
  for (const tile of map.tiles) {
    const distance = hexDistance(origin, offsetToAxial(tile.col, tile.row));
    levels[tile.row * map.width + tile.col] = distance <= visible ? 2 : distance <= remembered ? 1 : 0;
  }
  return levels;
}

/**
 * A coast with land behind it and open water in front: the frame that shows a
 * relief frontier and a paper-margin frontier at once. Scored rather than
 * searched for exactly, so every seed has an answer.
 */
function frontierTile(map) {
  const reach = 7;
  let best = null, bestScore = -Infinity;
  for (const tile of map.tiles) {
    if (isWater(tile) || tile.terrain === 'mountain') continue;
    const middle = Math.hypot(tile.col - map.width / 2, tile.row - map.height / 2);
    if (middle > Math.min(map.width, map.height) * .35) continue;
    let water = 0, land = 0;
    for (let row = Math.max(0, tile.row - reach); row <= Math.min(map.height - 1, tile.row + reach); row++) {
      for (let dc = -reach; dc <= reach; dc++) {
        const col = ((tile.col + dc) % map.width + map.width) % map.width;
        const other = map.tiles[row * map.width + col];
        if (!other || other === tile) continue;
        if (hexDistance(offsetToAxial(tile.col, tile.row), offsetToAxial(col, row)) > reach) continue;
        if (isWater(other)) water++; else land++;
      }
    }
    const score = Math.min(water, land) - middle * 1.4 - (tile.hills ? 0 : 3);
    if (score > bestScore) { bestScore = score; best = tile; }
  }
  return best ?? map.tiles[Math.floor(map.tiles.length / 2)];
}

export function createFogReview({ world, map, assets, materials, register, focusWidth, invalidateShadows }) {
  const board = buildPaintedBoard(map, assets, materials);
  world.add(board.group);
  board.createChartTable(register);
  const tile = frontierTile(board.renderMap);
  const state = { visible: 6, remembered: 10, shift: 0 };
  board.applyFog(stageLevels(board.renderMap, tile, state.visible, state.remembered));
  invalidateShadows?.();

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.append(style);
  const panel = document.createElement('aside');
  panel.className = 'fog-panel';
  panel.innerHTML = `
    <h2>Fog · three registers</h2>
    <p class="fog-note">Shadowed · full pigment and full geometry on remembered ground, the
      sun turned down and shifted toward the shadows’ own blue. Uncharted ground is the
      table: paper at the ground datum, taking the lit relief’s shadows.</p>
    <label>Remembered sun <input type="range" id="fog-sun" min="0" max="1" step=".01"></label>
    <label>Cool shift <input type="range" id="fog-cool" min="0" max="1" step=".01"></label>
    <label>Shade <input type="range" id="fog-shade" min=".4" max="1" step=".01"></label>
    <label>Lit edge (hexes) <input type="range" id="fog-edge" min=".02" max="2" step=".02"></label>
    <label>Chart ruling <input type="range" id="fog-rule" min="0" max="1" step=".02"></label>
    <label>Reveal (ms) <input type="range" id="fog-reveal" min="0" max="1200" step="20"></label>
    <div class="fog-buttons">
      <button id="fog-step">Reveal · one hex east</button>
      <button id="fog-reset">Reset</button>
      <button id="fog-game">Game zoom</button>
      <button id="fog-close">Close</button>
      <button id="fog-plate">Reference plate</button>
    </div>
    <figure class="fog-plate" hidden><img alt="The approved plate: lit, drawn and blank registers" src="${PLATE}"><figcaption>mockups/fog-study/three-registers.png</figcaption></figure>`;
  document.body.append(panel);

  // Every slider is the knob itself: `data/view3d.json` seeds it, the uniform
  // takes it live, and nothing on this page carries a figure of its own.
  const uniforms = board.fogUniforms;
  const slider = (id, uniform) => {
    const input = panel.querySelector('#' + id);
    input.value = uniforms[uniform].value;
    input.oninput = () => { uniforms[uniform].value = Number(input.value); };
    return input;
  };
  slider('fog-sun', 'paintedFogShadowedSun');
  slider('fog-cool', 'paintedFogShadowedCool');
  slider('fog-shade', 'paintedFogShadowedShade');
  slider('fog-edge', 'paintedFogEdge');
  slider('fog-rule', 'paintedFogChartRule');
  const reveal = panel.querySelector('#fog-reveal');
  reveal.value = board.revealMs;
  reveal.oninput = () => { board.revealMs = Number(reveal.value); };

  function repaint(at) {
    board.applyFog(stageLevels(board.renderMap, tile, state.visible, state.remembered, state.shift), at);
    invalidateShadows?.();
  }
  panel.querySelector('#fog-step').onclick = () => { state.shift++; repaint(performance.now()); };
  panel.querySelector('#fog-reset').onclick = () => { state.shift = 0; repaint(); };
  // Two frames, and the close one is the whole point of the review: it sits two
  // hexes inside the bubble's east edge and looks across it, so a lit hex, a
  // remembered hex and a sheet of blank paper share the picture. The wide frame
  // is the same board from game distance, centred on the bubble.
  const home = centre(tile);
  const edge = centre({ col: tile.col + state.visible + 2, row: tile.row });
  panel.querySelector('#fog-game').onclick = () => focusWidth(home.x, home.z, GAME_WIDTH);
  panel.querySelector('#fog-close').onclick = () => focusWidth(edge.x, edge.z, CLOSE_WIDTH);
  const plate = panel.querySelector('.fog-plate');
  panel.querySelector('#fog-plate').onclick = () => { plate.hidden = !plate.hidden; };

  focusWidth(home.x, home.z, GAME_WIDTH);

  return {
    board, tile,
    /**
     * The wide frame, asked for again after the page has resized: a zoom is
     * relative to the ortho frustum, and the frustum is fitted to the map after
     * build() returns.
     */
    frame() { focusWidth(home.x, home.z, GAME_WIDTH); },
    /**
     * The reveal's clock. No shadow bake rides on it: what casts is decided by
     * the discard, which moved once when the levels did — the ease only moves
     * light, and the paper it dissolves never cast anything.
     */
    tick(now) { board.advanceReveal(now); },
    describe() {
      return `Fog review · ${tile.col},${tile.row} · visible ${state.visible} · remembered ${state.remembered}`
        + ` · reveals ${board.revealStamps}`;
    },
    dispose() { panel.remove(); style.remove(); board.dispose(); },
  };
}
