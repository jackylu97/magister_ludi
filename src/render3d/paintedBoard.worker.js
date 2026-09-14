import {buildPaintedBoard} from './paintedBoard.js';
import {packTerrainMap} from '../terrainStudy/surface.js';
import {unpackPaintedKit, packPaintedBatches, paintedTransferBuffers} from './paintedBoardTransfer.js';

self.onmessage = ({data: {map, kit, shadows}}) => {
  let board, resources;
  try {
    const started = performance.now();
    resources = unpackPaintedKit(kit);
    let last = -1;
    board = buildPaintedBoard(map, resources.assets, resources.materials, shadows, null, (done, total) => {
      const percent = Math.floor(done / total * 100);
      if (percent !== last) { last = percent; self.postMessage({type: 'progress', percent}); }
    });
    const batches = packPaintedBatches(board.exportBatches(), resources.bindings);
    self.postMessage({type: 'complete', batches, terrain: packTerrainMap(board.renderMap), buildMs: performance.now() - started}, paintedTransferBuffers(batches));
  } catch (error) {
    self.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)});
  } finally {
    board?.dispose();
    for (const resource of resources?.bindings || []) resource.dispose();
  }
};
