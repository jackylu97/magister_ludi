// @ts-check
/** @typedef {import('./paintedBoardProtocol').BoardBuildRequest} BoardBuildRequest */
/** @typedef {import('./paintedBoardProtocol').BoardBuildReply} BoardBuildReply */
/** @typedef {import('./paintedBoardProtocol').TerrainPacket} TerrainPacket */
/** @typedef {import('./paintedBoard.js').PaintedBuildShare} BuildShare */
import {buildPaintedBoard} from './paintedBoard.js';
import {packTerrainMap, setRiverStyle, setCoastStyle} from '../terrainStudy/surface.js';
import {unpackPaintedKit, packPaintedBatches, paintedTransferBuffers} from './paintedBoardTransfer.js';

// `part` is `{regions, terrain}` when the build is split across workers: this
// worker builds those regions only, and sends the prepared terrain only when
// `terrain` is true (every part prepares the same one). See `paintedBoardAsync.js`.
// `terrainPort` is a port to the sea's bake, when the page sends one. The
// prepared terrain is posted there too, from this worker, so the page does
// not have to copy it on to the bake (see `paintedBoardAsync.js`).
// `shareTo` (ports to the other parts) or `shareFrom` (a port from the part
// that has `shareTo`) makes the parts work out the map's shape and rivers once:
// the part with `shareTo` posts each as it is done, and a part with
// `shareFrom` waits for both and then builds on them (`buildPaintedBoard`'s
// `share`; the fourth render speed pass).
/** @param {BoardBuildReply} reply @param {Transferable[]} [buffers] */
function postReply(reply, buffers = []) {
  const worker = /** @type {{postMessage(value: BoardBuildReply, transfer: Transferable[]): void}} */ (self);
  worker.postMessage(reply, buffers);
}

/** @param {MessageEvent<BoardBuildRequest>} event */
self.onmessage = ({data}) => {
  if (!data.shareFrom) { build(data, data.shareTo ? publisher(data.shareTo) : null); return; }
  // Until the shape and the rivers arrive, this part is on the first step, as the part working them out is.
  postReply({type: 'progress', percent: 0, stage: 'shape'});
  const port = data.shareFrom;
  /** @type {unknown} */
  let shape;
  /** @param {MessageEvent<{kind: 'shape' | 'rivers', payload: unknown}>} event */
  port.onmessage = ({data: {kind, payload}}) => {
    if (kind === 'shape') { shape = payload; return; }
    port.close();
    build(data, {shape, rivers: payload});
  };
  port.onmessageerror = () => { port.close(); postReply({type: 'error', message: 'Could not read the shared terrain'}); };
};

/** Posts each early step's result to every other part as it is done, then lets the ports go. */
/** @param {MessagePort[]} ports @returns {Extract<BuildShare, {publish: Function}>} */
function publisher(ports) {
  return {
    publish(kind, payload) {
      for (const port of ports) port.postMessage({kind, payload});
      if (kind === 'rivers') for (const port of ports) port.close();
    },
  };
}

// `ground` is the page's plan for the ground paint texture (`groundPaintPlan`), or null: with one, this part builds
// the plain land in place of the far land.
/** @param {BoardBuildRequest} request @param {BuildShare | null} share */
function build({map, kit, shadows, riverStyle, coastStyle, part, terrainPort, ground = null}, share) {
  let board, resources;
  /** @param {TerrainPacket} terrain */
  const toBake = (terrain) => {
    if (!terrainPort) return;
    try { terrainPort.postMessage({terrain}); } catch (error) { terrainPort.postMessage({error: error instanceof Error ? error.message : String(error)}); }
    terrainPort.close(); terrainPort = undefined;
  };
  try {
    // The worker has its own copy of the terrain modules, so the river cut the
    // page chose (the visual test version's thinner rivers) is set here too.
    setRiverStyle(riverStyle || null);
    setCoastStyle(coastStyle);
    const started = performance.now();
    resources = unpackPaintedKit(kit);
    // One report as each step starts, and one for each whole percent of the
    // land step, which is the only step that can count. The page shows them on
    // the loading sheet, so a slow build reads as one that goes on.
    let last = -1;
    // `done` and `total` ride with the land step's reports, so a page running several parts can add them up.
    // The prepared terrain goes to the page as soon as the land step starts, by the part that sends it, so the page
    // can bake the sea's distances from it while the land is still being built. It is not sent again at the end.
    let terrainSent = false;
    board = buildPaintedBoard(map, resources.assets, resources.materials, shadows, null, (done, total, stage, prepared) => {
      if (prepared && !terrainSent && (!part || part.terrain)) {
        terrainSent = true;
        const terrain = packTerrainMap(prepared);
        postReply({type: 'terrain', terrain}); toBake(terrain);
      }
      if (stage !== 'land') { postReply({type: 'progress', percent: last < 0 ? 0 : last, stage}); return; }
      const percent = Math.floor(done / Math.max(1, total) * 100);
      if (percent !== last || done === total) { last = percent; postReply({type: 'progress', percent, stage, done, total}); }
    }, null, part ? {regions: new Set(part.regions)} : null, share, ground);
    postReply({type: 'progress', percent: Math.max(0, last), stage: 'packing'});
    const batches = packPaintedBatches(board.exportBatches(), resources.bindings);
    const terrain = (!part || part.terrain) && !terrainSent ? packTerrainMap(board.renderMap) : null;
    if (terrain) toBake(terrain);
    postReply({type: 'complete', batches, terrain, buildMs: performance.now() - started}, paintedTransferBuffers(batches));
  } catch (error) {
    postReply({type: 'error', message: error instanceof Error ? error.message : String(error)});
    // The bake waits on this port; tell it that no terrain is coming.
    if (terrainPort) { terrainPort.postMessage({error: 'The board build failed'}); terrainPort.close(); terrainPort = undefined; }
  } finally {
    board?.dispose();
    for (const resource of resources?.bindings || []) resource.dispose();
  }
}
