import {buildPaintedBoard} from './paintedBoard.js';
import {packTerrainMap, setRiverStyle, setCoastStyle} from '../terrainStudy/surface.js';
import {unpackPaintedKit, packPaintedBatches, paintedTransferBuffers} from './paintedBoardTransfer.js';

// `part` is `{regions, terrain}` when the build is split across workers: this
// worker builds those regions only, and sends the prepared terrain only when
// `terrain` is true (every part prepares the same one). See `paintedBoardAsync.js`.
self.onmessage = ({data: {map, kit, shadows, riverStyle, coastStyle, part = null}}) => {
  let board, resources;
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
      if (prepared && !terrainSent && (!part || part.terrain)) { terrainSent = true; self.postMessage({type: 'terrain', terrain: packTerrainMap(prepared)}); }
      if (stage !== 'land') { self.postMessage({type: 'progress', percent: last < 0 ? 0 : last, stage}); return; }
      const percent = Math.floor(done / Math.max(1, total) * 100);
      if (percent !== last || done === total) { last = percent; self.postMessage({type: 'progress', percent, stage, done, total}); }
    }, null, part ? {regions: new Set(part.regions)} : null);
    self.postMessage({type: 'progress', percent: Math.max(0, last), stage: 'packing'});
    const batches = packPaintedBatches(board.exportBatches(), resources.bindings);
    const terrain = (!part || part.terrain) && !terrainSent ? packTerrainMap(board.renderMap) : null;
    self.postMessage({type: 'complete', batches, terrain, buildMs: performance.now() - started}, paintedTransferBuffers(batches));
  } catch (error) {
    self.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)});
  } finally {
    board?.dispose();
    for (const resource of resources?.bindings || []) resource.dispose();
  }
};
