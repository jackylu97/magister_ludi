import {bakeSeaDistanceData} from './seaDistances.js';
import {restoreTerrainMap, setRiverStyle, setCoastStyle} from '../terrainStudy/surface.js';

// The sea's distances, baked off the page (the third render speed pass). The
// page hands over the prepared terrain as soon as a board worker sends it, and
// this worker bakes while the land is still being built, so the page is not
// held for the seconds the bake takes (about five on the Giant map). The page
// makes the texture from the numbers, as `bakeSeaDistances` would. The river
// and coast styles are set here too, as the board worker sets them.
self.onmessage = ({data: {terrain, knobs, organicRivers, riverStyle, coastStyle}}) => {
  try {
    setRiverStyle(riverStyle || null);
    setCoastStyle(coastStyle);
    const baked = bakeSeaDistanceData(restoreTerrainMap(terrain), knobs, organicRivers);
    self.postMessage({type: 'baked', baked}, [baked.data.buffer]);
  } catch (error) {
    self.postMessage({type: 'error', message: error instanceof Error ? error.message : String(error)});
  }
};
