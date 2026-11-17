import {buildPaintedBoard} from './paintedBoard.js';
import {packTerrainMap, setRiverStyle, setCoastStyle} from '../terrainStudy/surface.js';
import {unpackPaintedKit, packPaintedBatches, paintedTransferBuffers} from './paintedBoardTransfer.js';

self.onmessage = ({data: {map, kit, shadows, riverStyle, coastStyle}}) => {
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
    board = buildPaintedBoard(map, resources.assets, resources.materials, shadows, null, (done, total, stage) => {
      if (stage !== 'land') { self.postMessage({type: 'progress', percent: last < 0 ? 0 : last, stage}); return; }
      const percent = Math.floor(done / Math.max(1, total) * 100);
      if (percent !== last) { last = percent; self.postMessage({type: 'progress', percent, stage}); }
    });
    self.postMessage({type: 'progress', percent: Math.max(0, last), stage: 'packing'});
    const batches = packPaintedBatches(board.exportBatches(), resources.bindings);
    self.postMessage({type: 'complete', batches, terrain: packTerrainMap(board.renderMap), buildMs: performance.now() - started}, paintedTransferBuffers(batches));
  } catch (error) {
    self.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)});
  } finally {
    board?.dispose();
    for (const resource of resources?.bindings || []) resource.dispose();
  }
};
