import { Renderer3D } from '../render3d/renderer3d';
import { tileTopY } from '../render3d/layout';
import { samplePaintedSurface } from '../render3d/paintedSurface';
import { createMap, getTileAt, offsetToAxial, axialToOffset, type Tile } from '../sim/map';
import { hexDistance, HEX_DIRECTIONS } from '../sim/hex';
import { createUnit, newGame } from '../sim/state';
import { resetVisibility, VISIBLE } from '../sim/visibility';
import { button, checkbox, controls, element, select } from './sheet';

const treatments = {
  corners: { title: 'A · Corner marks', note: 'Small ivory brackets keep individual destinations readable and the scene open. My starting recommendation.' },
  outline: { title: 'B · Fine outlines', note: 'A fine, muted ivory rim on every reachable tile. Familiar movement language with no white fill.' },
  boundary: { title: 'C · Range boundary', note: 'One perimeter around the movement area. The quietest option; individual destinations appear on hover.' },
  current: { title: 'Current · In game', note: 'The approved range boundary, rendered by the game itself. Compare its terrain-following outline with the original studies.' },
} as const;
type Treatment = keyof typeof treatments;
const key = (t: {col: number; row: number}) => `${t.col},${t.row}`;
const corners = Array.from({ length: 6 }, (_, i) => { const a = (i * 60 - 30) * Math.PI / 180; return [Math.cos(a), Math.sin(a)] as const; });

/** Review-only screen-space ink over the real game scene. No game tunables change. */
export async function drawMovementReview(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search);
  let treatment: Treatment = Object.prototype.hasOwnProperty.call(treatments, params.get('style') ?? '') ? params.get('style') as Treatment : 'corners';
  let light = params.get('light') ?? 'day', show = true, ready = false, disposed = false;
  const choices = element('div', 'movement-choices'); choices.setAttribute('aria-label', 'Movement treatments'); into.append(choices);
  const note = element('p', 'sheet-note'); into.append(note);
  const knobs = controls(into), stage = element('div', 'painted-works-stage movement-stage');
  const canvas = element('canvas', 'painted-works-canvas movement-canvas');
  canvas.setAttribute('aria-label', 'Movement highlight comparison over ruins, a tribal village and a barbarian camp');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('movement-ink'); svg.setAttribute('aria-hidden', 'true');
  stage.append(canvas, svg); into.append(stage);
  const status = element('p', 'sheet-note', 'Loading the comparison world…'); status.setAttribute('role', 'status'); into.append(status);
  const state = newGame({ seed: 19, sizeName: 'duel', players: [{ name: 'Review', color: '#714291', secondary: '#c9ccd6', isHuman: true }] });
  state.map = createMap({ width: 14, height: 12, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = state.map.tiles.map(() => null); resetVisibility(state); state.visibility[0]!.fill(VISIBLE);
  const tile = (col: number, row: number) => getTileAt(state.map, col, row)!;
  for (const t of state.map.tiles) {
    t.moisture = .55;
    if (t.col >= 8) t.terrain = 'plains';
    if ((t.col === 4 && t.row >= 4 && t.row <= 7) || (t.row === 7 && t.col >= 6 && t.col <= 8)) t.feature = 'forest';
    if (t.col >= 8 && t.row >= 5 && t.row <= 7) t.hills = true;
    if (t.row <= 2 && t.col > 7) t.terrain = 'mountain';
  }
  tile(5, 4).discovery = 'ruins'; tile(5, 6).discovery = 'village';
  state.camps.push({ col: 7, row: 4, foundedTurn: 0 });
  const unit = createUnit(state, 0, 'scout', 6, 5);
  const origin = offsetToAxial(6, 5);
  const range = state.map.tiles.filter(t => hexDistance(origin, offsetToAxial(t.col, t.row)) <= 2);
  const reachable = range.filter(t => t !== tile(6, 5));
  const cells = new Set(range.map(key));
  const names = new Map([[key(tile(5, 4)), 'Ancient ruins'], [key(tile(7, 4)), 'Barbarian camp'], [key(tile(5, 6)), 'Tribal village']]);
  const renderer = new Renderer3D(canvas, { minFrustum: 1.2 });
  let hovered: Tile | null = null;
  const writeURL = () => { const u = new URL(location.href); u.searchParams.set('style', treatment); u.searchParams.set('light', light); history.replaceState(null, '', u); };
  const buttons = Object.entries(treatments).map(([id, data]) => {
    const b = button(choices, data.title, () => { treatment = id as Treatment; update(); });
    b.classList.add('movement-choice'); b.setAttribute('aria-pressed', String(id === treatment)); return { id, b };
  });
  function update() {
    note.textContent = treatments[treatment].note;
    buttons.forEach(({id,b}) => b.setAttribute('aria-pressed', String(id === treatment)));
    if (ready) {
      renderer.setReachable(show && treatment === 'current' ? reachable : []);
      renderer.setHover(null);
    }
    writeURL(); paint();
  }
  select(knobs, 'Light', [['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], light,
    value => { light = value; renderer.setDaylight(light); writeURL(); });
  checkbox(knobs, 'Show movement area', true, value => { show = value; update(); });
  const frame = () => { if (ready) { renderer.focusOpening({col: 6, row: 5}); renderer.zoomBy(1.35, canvas.clientWidth / 2, canvas.clientHeight / 2); } };
  button(knobs, 'Reset view', frame);
  function paint() {
    if (!ready || !show || treatment === 'current') { svg.innerHTML = ''; return; }
    svg.setAttribute('viewBox', `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
    // Recover the orthographic basis through the renderer's public projection.
    // Each cell gets its own wrapped origin; samples follow the actual relief.
    const projectBase = (t: Tile) => renderer.projectCell(t.col, t.row, -tileTopY(t))!;
    const a = projectBase(tile(6, 5)), east = projectBase(tile(7, 5)), south = projectBase(tile(6, 7));
    const above = renderer.projectCell(6, 5, 1 - tileTopY(tile(6, 5)))!;
    const project = (t: Tile, x: number, z: number) => {
      const p = projectBase(t), y = (samplePaintedSurface(t, x, z) ?? tileTopY(t)) + .035;
      return `${(p.x + x * (east.x-a.x)/Math.sqrt(3) + z * (south.x-a.x)/3 + y*(above.x-a.x)).toFixed(2)},${(p.y + x * (east.y-a.y)/Math.sqrt(3) + z * (south.y-a.y)/3 + y*(above.y-a.y)).toFixed(2)}`;
    };
    const polygon = (t: Tile, scale: number) => corners.map(([x,z]) => project(t,x*scale,z*scale));
    let d = '';
    for (const t of range) {
      if (treatment === 'boundary') {
        const h = offsetToAxial(t.col,t.row);
        for (let side = 0; side < 6; side++) {
          const delta = HEX_DIRECTIONS[side]!, next = axialToOffset({q:h.q+delta.q,r:h.r+delta.r});
          if (cells.has(key(next))) continue;
          const start = corners[side]!, end = corners[(side+1)%6]!;
          d += `M${project(t,start[0],start[1])}L${project(t,end[0],end[1])}`;
        }
      } else if (t !== tile(6,5)) {
        const pts = polygon(t,.87);
        if (treatment === 'outline') d += `M${pts.join('L')}Z`;
        else for (let i=0;i<6;i++) {
          const c=corners[i]!, before=corners[(i+5)%6]!, after=corners[(i+1)%6]!;
          d += `M${project(t,(c[0]*.78+before[0]*.22)*.87,(c[1]*.78+before[1]*.22)*.87)}L${pts[i]}L${project(t,(c[0]*.78+after[0]*.22)*.87,(c[1]*.78+after[1]*.22)*.87)}`;
        }
      }
    }
    const width = treatment === 'boundary' ? 1.9 : treatment === 'corners' ? 1.6 : 1.05;
    svg.innerHTML = `<path d="${d}" fill="none" stroke="#394b45" stroke-opacity=".28" stroke-width="${width+1.6}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#eee4bc" stroke-opacity="${treatment==='outline'?.48:.73}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (hovered && cells.has(key(hovered))) {
      const pts = polygon(hovered,.90);
      svg.innerHTML += `<path d="M${pts.join('L')}Z" fill="none" stroke="#ffe0a0" stroke-width="2.4" stroke-linejoin="round"/>`;
    }
  }
  renderer.setFrameListener(paint);
  const resize = new ResizeObserver(() => renderer.resize()); resize.observe(canvas);
  const listener = new AbortController(), signal = listener.signal;
  let drag: {id:number;x:number;y:number} | null = null;
  canvas.addEventListener('pointerdown', e => { if(e.button!==0)return; drag={id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); },{signal});
  canvas.addEventListener('pointermove', e => {
    if(drag) { renderer.panByScreen(e.clientX-drag.x,e.clientY-drag.y); drag.x=e.clientX;drag.y=e.clientY; return; }
    const rect=canvas.getBoundingClientRect(),hit=renderer.pick(e.clientX-rect.left,e.clientY-rect.top);
    hovered=hit?.tile ?? null;
    if (treatment === 'current') renderer.setHover(hit);
    status.textContent=hovered&&cells.has(key(hovered)) ? `${names.get(key(hovered)) ?? 'Reachable tile'} · hover marks only this destination` : 'Hover destinations · drag to pan · scroll to zoom. Preview only; clicks do not issue orders.';
    paint();
  },{signal});
  canvas.addEventListener('pointerup', e=>{drag=null;canvas.releasePointerCapture(e.pointerId);},{signal});
  canvas.addEventListener('lostpointercapture',()=>{drag=null;},{signal});
  canvas.addEventListener('pointerleave',()=>{hovered=null;renderer.setHover(null);paint();},{signal});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();renderer.zoomBy(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false,signal});
  const dispose=()=>{if(disposed)return;disposed=true;listener.abort();resize.disconnect();renderer.dispose();};
  window.addEventListener('pagehide',dispose,{once:true,signal});
  try {
    await renderer.enablePaintedLook(light); if(disposed)return dispose;
    renderer.setFogSeat(0);renderer.setGameState(state);renderer.setSelectedUnitId(unit.id); ready=true;frame();update();
    status.textContent='Hover destinations · drag to pan · scroll to zoom. Preview only; clicks do not issue orders.';
  } catch(error) {status.textContent=`Could not load review: ${String(error)}`;dispose();}
  return dispose;
}
