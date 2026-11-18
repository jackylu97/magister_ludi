import {bakeSeaDistanceData} from './seaDistances.js';
import {restoreTerrainMap, setRiverStyle, setCoastStyle} from '../terrainStudy/surface.js';

// The sea's distances, baked off the page (the third render speed pass). This
// worker bakes while the land is still being built, so the page is not held
// for the seconds the bake takes (about five on the Giant map). The page makes
// the texture from the numbers, as `bakeSeaDistances` would. The river and
// coast styles are set here too, as the board worker sets them.
//
// The page sends the settings and `port`, one end of a channel whose other end
// went to the board worker that prepares the terrain. That worker posts the
// prepared terrain here directly, so the page never copies it (the fourth
// pass). A message that carries `terrain` itself is baked at once.
self.onmessage = ({data: {terrain, port, knobs, organicRivers, riverStyle, coastStyle}}) => {
  const fail = (message) => self.postMessage({type: 'error', message});
  const bake = (prepared) => {
    try {
      setRiverStyle(riverStyle || null);
      setCoastStyle(coastStyle);
      const baked = bakeSeaDistanceData(restoreTerrainMap(prepared), knobs, organicRivers);
      self.postMessage({type: 'baked', baked}, [baked.data.buffer]);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  };
  if (terrain) { bake(terrain); return; }
  if (!port) { fail('No terrain and no port to wait on'); return; }
  port.onmessage = ({data: reply}) => {
    port.close();
    if (reply?.terrain) bake(reply.terrain);
    else fail(reply?.error ?? 'The board worker sent no terrain');
  };
  port.onmessageerror = () => { port.close(); fail('Could not read the terrain'); };
};
