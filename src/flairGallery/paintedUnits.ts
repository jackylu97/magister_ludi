import { Renderer3D } from '../render3d/renderer3d';
import { FAMILIES, greatPersonDef, type Family } from '../sim/greatPeopleData';
import { leaderDef } from '../sim/leaderData';
import { unitDef } from '../sim/unitData';
import { resolveUnitPointerTarget } from '../ui/unitPointer';
import {
  INFANTRY_VIEWS, POLEARM_VIEWS, RANGED_VIEWS, CAVALRY_VIEWS, MOUNTED_RANGED_VIEWS, SIEGE_VIEWS, EMBARKED_VIEWS, FAITH_VIEWS, CARAVAN_VIEWS, NAVAL_LIGHT_VIEWS, NAVAL_HEAVY_VIEWS, NAVAL_RANGED_VIEWS, UNIT_LINE_REVIEWS,
  UNIT_CONTEXT_VIEWS, UNIT_REVIEW_LEADERS, UNIT_REVIEW_PEOPLE, UNIT_REVIEW_TYPES, UNIT_VIEWS,
  createUnitsFixture, moveUnitsFixtureUnit, setUnitsFixtureVisibility, unitReviewGroup,
  type EquipmentReviewType, type InfantryReviewType, type UnitReviewContext, type UnitReviewGroup, type UnitReviewLeader, type UnitReviewType,
} from './unitsFixture';
import { button, checkbox, controls, element, select } from './sheet';

type LineGroup = Exclude<UnitReviewGroup, 'representatives'>;
type Focus = UnitReviewType | InfantryReviewType | EquipmentReviewType | UnitReviewContext | 'all' | 'civilian' | LineGroup;
const isLine = (focus: string): focus is LineGroup => Object.prototype.hasOwnProperty.call(UNIT_LINE_REVIEWS, focus);
type ReviewViews = Record<string, { col: number; row: number; label: string; note: string }>;
const representativeViews = { ...UNIT_VIEWS, ...UNIT_CONTEXT_VIEWS };
const allViews = { ...representativeViews, ...INFANTRY_VIEWS, ...POLEARM_VIEWS, ...RANGED_VIEWS, ...CAVALRY_VIEWS, ...MOUNTED_RANGED_VIEWS, ...SIEGE_VIEWS, ...EMBARKED_VIEWS, ...FAITH_VIEWS, ...CARAVAN_VIEWS, ...NAVAL_LIGHT_VIEWS, ...NAVAL_HEAVY_VIEWS, ...NAVAL_RANGED_VIEWS };

/** A focused art review using the production board, pieces, fog and movement. */
export async function drawPaintedUnits(into: HTMLElement): Promise<() => void> {
  const params = new URLSearchParams(location.search), requested = params.get('unit') ?? '';
  let focus: Focus = requested === 'all' || requested === 'civilian' || isLine(requested) || Object.prototype.hasOwnProperty.call(allViews, requested)
    ? requested as Focus : 'warrior';
  let group = unitReviewGroup(focus, params.get('group'));
  let views: ReviewViews = group !== 'representatives' ? UNIT_LINE_REVIEWS[group].views : representativeViews;
  let leader: UnitReviewLeader = UNIT_REVIEW_LEADERS.find(id => id === params.get('owner')) ?? 'pachacuti';
  let family: Family = FAMILIES.find(id => id === params.get('family')) ?? 'scholar';
  let daylight = ['morning', 'day', 'golden', 'dusk'].includes(params.get('light') ?? '') ? params.get('light')! : 'golden';
  let detail = params.get('detail') === 'close', remembered = false, selected = false, shadows = true;
  let badgesVisible = true;
  let inspectedUnitId: number | null = null;
  let ready = false, disposed = false, rebuilding = false;
  let state = createUnitsFixture({ leader, family, group });
  const knobs = controls(into), actions = controls(into), note = element('p', 'sheet-note');
  const stage = element('div', 'painted-works-stage painted-units-stage');
  const canvas = element('canvas', 'painted-works-canvas painted-units-canvas');
  canvas.setAttribute('aria-label', 'Painted unit review. Hover a piece, badge or tile; click to select. Drag to pan; scroll to zoom.');
  const overlay = element('div', 'painted-works-labels');
  overlay.style.pointerEvents = 'none';
  stage.append(canvas, overlay); into.append(note, stage);
  const status = element('p', 'sheet-note', 'Loading the painted world…');
  status.setAttribute('role', 'status'); into.append(status);
  const renderer = new Renderer3D(canvas, { minFrustum: 1.2 });
  const listener = new AbortController(), signal = listener.signal;
  const resize = new ResizeObserver(() => {
    renderer.resize();
    if (ready && isLine(focus)) frame();
  }); resize.observe(canvas);
  const makeLabels = () => Object.entries(views).map(([id, view]) => {
    const node = element('span', 'painted-works-label', view.label); overlay.append(node);
    return { id, view, node };
  });
  let labels = makeLabels();
  const moved = new Set<number>();
  let specimens = locateSpecimens();
  function locateSpecimens(): Map<string, number> {
    return new Map(Object.entries(views).map(([id, view]) => [id,
      state.units.find(unit => unit.col === view.col && unit.row === view.row)!.id]));
  }
  function currentUnit() {
    const id = inspectedUnitId ?? specimens.get(isLine(focus) ? UNIT_LINE_REVIEWS[focus].base : focus === 'all' ? 'warrior' : focus === 'civilian' ? 'scout' : focus);
    return state.units.find(unit => unit.id === id)!;
  }
  const updateURL = (): void => {
    const url = new URL(location.href);
    url.searchParams.set('unit', focus); url.searchParams.set('owner', leader);
    url.searchParams.set('family', family); url.searchParams.set('light', daylight);
    if (group !== 'representatives') url.searchParams.set('group', group); else url.searchParams.delete('group');
    url.searchParams.set('detail', detail ? 'close' : 'game'); history.replaceState(null, '', url);
  };
  const updateActions = (): void => {
    const overview = focus === 'all' || focus === 'civilian' || isLine(focus);
    scaleControl.disabled = rebuilding || overview;
    familyControl.disabled = rebuilding || group !== 'representatives';
    moveButton.disabled = !ready || rebuilding || remembered || overview || moved.has(currentUnit().id);
    resetButton.disabled = !ready || rebuilding;
  };
  const selection = (): void => {
    if (!ready) return;
    renderer.setSelectedUnitId(selected && !remembered ? currentUnit().id : null);
    renderer.invalidate();
  };
  const frame = (): void => {
    clearHover();
    updateURL(); updateActions();
    if (!ready) return;
    if (isLine(focus)) {
      renderer.focusOpening({ col: 6, row: focus === 'cavalry' ? 5 : 4 });
      // Fit the pieces to this canvas, without the main game's city-rail inset.
      // Include head height and space for labels at narrow panel widths.
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const points = Object.values(views).flatMap(view =>
        [renderer.projectCell(view.col, view.row, 0), renderer.projectCell(view.col, view.row, 1.6)]);
      const halfWidth = Math.max(...points.map(point => point ? Math.abs(point.x - width / 2) : 0));
      const halfHeight = Math.max(...points.map(point => point ? Math.abs(point.y - height / 2) : 0));
      const zoom = Math.min((width - 140) / (2 * halfWidth), (height - 100) / (2 * halfHeight));
      if (Number.isFinite(zoom) && zoom > 0) renderer.zoomBy((focus === 'siege' || focus === 'caravans') ? zoom * .70 : zoom, width / 2, height / 2);
      note.textContent = focus === 'embarked' ? 'A shared transport with the passenger’s unit badge. Select the settler to embark or the warrior to land.' : focus.startsWith('naval') ? `${UNIT_LINE_REVIEWS[focus].label} on navigable water. Choose one to inspect its hull, rig and equipment.` : focus === 'siege' ? 'Catapult and trebuchet: low torsion engine and tall counterweight engine. Choose one for game or detail scale.' : `${UNIT_LINE_REVIEWS[focus].label} variants beside the accepted ${UNIT_LINE_REVIEWS[focus].base}. Choose one to inspect its equipment at game or detail scale.`;
    } else if (focus === 'all' || focus === 'civilian') {
      const firstRow = focus === 'all' ? 2 : 6;
      renderer.focusOpening({ col: 7, row: (firstRow + 10) / 2 });
      renderer.frameCells([{ col: 4, row: firstRow }, { col: 10, row: 10 }], false);
      note.textContent = focus === 'all'
        ? 'The twelve accepted representatives. Choose one for game or detail scale; the city and hill examples are below the group.'
        : 'Scout, settler, worker, trader, prophet and great person. Choose one for game or detail scale.';
    } else {
      renderer.focusOpening(currentUnit());
      if (detail) renderer.zoomBy(3.4, canvas.clientWidth / 2, canvas.clientHeight / 2);
      note.textContent = views[focus].note;
      if (focus === 'greatPerson') note.textContent += ` ${greatPersonDef(UNIT_REVIEW_PEOPLE[family]).name} carries the ${family} emblem.`;
    }
    if (remembered) note.textContent += ' Remembered terrain hides units and the live city, as it does in the game.';
    selection();
  };
  const refresh = (): void => {
    clearHover();
    renderer.skipAnimations();
    setUnitsFixtureVisibility(state, remembered);
    if (ready) renderer.setGameState(state);
    frame();
  };
  const resetSpecimens = (): void => {
    inspectedUnitId = null;
    state = createUnitsFixture({ leader, family, group });
    views = group !== 'representatives' ? UNIT_LINE_REVIEWS[group].views : representativeViews;
    overlay.replaceChildren(); labels = makeLabels();
    specimens = locateSpecimens(); moved.clear(); refresh();
  };
  const queueReset = (): void => {
    if (rebuilding) return;
    cancelPointer();
    rebuilding = true;
    groupControl.disabled = true; unitControl.disabled = true; updateActions();
    status.textContent = 'Preparing the specimen world…';
    // Return the selection event before constructing terrain and fitting pieces.
    // The old frame remains visible until the replacement world is ready.
    setTimeout(() => {
      if (disposed) return;
      try {
        resetSpecimens();
        status.textContent = 'Specimens ready. Hover a piece, badge or tile; click to select. Drag to pan · scroll to zoom.';
      } catch (error) {
        status.textContent = `The review could not reset: ${error instanceof Error ? error.message : String(error)}`;
      } finally {
        rebuilding = false;
        groupControl.disabled = false; unitControl.disabled = false; updateActions();
      }
    }, 0);
  };
  const unitOptions = (): readonly (readonly [string, string])[] => group !== 'representatives'
    ? [[group, `${UNIT_LINE_REVIEWS[group].label} together`], ...Object.entries(UNIT_LINE_REVIEWS[group].views).map(([id, view]) => [id, view.label] as const)]
    : [['all', 'All twelve'], ['civilian', 'Scouts & civilians'],
      ...UNIT_REVIEW_TYPES.map(id => [id, UNIT_VIEWS[id].label] as const),
      ...Object.entries(UNIT_CONTEXT_VIEWS).map(([id, view]) => [id, view.label] as const)];
  const groupControl = select(knobs, 'Group', [['representatives', 'Accepted representatives'], ['infantry', 'Infantry variants'], ['polearm', 'Anti-cavalry variants'], ['ranged', 'Ranged variants'], ['cavalry', 'Cavalry variants'], ['mountedRanged', 'Mounted ranged variants'], ['siege', 'Siege engines'], ['navalLight', 'Light ships'], ['navalHeavy', 'Heavy ships'], ['navalRanged', 'Ranged ships'], ['faith', 'Religious'], ['caravans', 'Caravans'], ['embarked', 'Embarked transports']], group, value => {
    group = value as UnitReviewGroup; focus = group !== 'representatives' ? group : 'all';
    unitControl.replaceChildren(...unitOptions().map(([id, label]) => {
      const option = element('option', undefined, label); option.value = id; return option;
    }));
    unitControl.value = focus; queueReset();
  });
  const unitControl = select(knobs, 'Unit', unitOptions(), focus, value => { focus = value as Focus; inspectedUnitId = null; frame(); });
  const scaleControl = select(knobs, 'Scale', [['game', 'Game zoom'], ['close', 'Detail']], detail ? 'close' : 'game',
    value => { detail = value === 'close'; frame(); });
  select(knobs, 'Owner', UNIT_REVIEW_LEADERS.map(id => {
    const def = leaderDef(id); return [id, `${def.name} · ${def.colors.names.join(' / ')}`] as const;
  }), leader, value => {
    leader = value as UnitReviewLeader;
    // This is an ink comparison in a disposable fixture. Recolour its owner
    // without regenerating the terrain or resetting a specimen's movement.
    const definition = leaderDef(leader), owner = state.players[0]!;
    owner.leader = leader; owner.name = definition.name;
    owner.color = definition.colors.primary; owner.secondary = definition.colors.secondary;
    refresh();
  });
  const familyControl = select(knobs, 'Great-person family', FAMILIES.map(id => [id, id[0]!.toUpperCase() + id.slice(1)] as const), family, value => {
    family = value as Family;
    const person = state.units.find(unit => unit.id === specimens.get('greatPerson'));
    if (person) person.person = UNIT_REVIEW_PEOPLE[family];
    refresh();
  });
  select(knobs, 'Light', [['morning', 'Morning'], ['day', 'Daylight'], ['golden', 'Golden hour'], ['dusk', 'Dusk']], daylight,
    value => { daylight = value; renderer.setDaylight(value); updateURL(); });
  checkbox(actions, 'Shadows', shadows, value => {
    shadows = value;
    if (ready) { renderer.setShadows(shadows); renderer.setGameState(state); selection(); }
  });
  checkbox(actions, 'Labels', true, value => { overlay.hidden = !value; renderer.invalidate(); });
  checkbox(actions, 'Badges', badgesVisible, value => {
    badgesVisible = value;
    if (ready) renderer.setUnitBadgesVisible(badgesVisible);
  });
  const selectionControl = checkbox(actions, 'Selection', selected, value => { selected = value; selection(); });
  checkbox(actions, 'Remembered', remembered, value => { remembered = value; refresh(); });
  const moveButton = button(actions, 'Move one hex', () => {
    clearHover();
    renderer.skipAnimations();
    const unit = currentUnit(), result = moveUnitsFixtureUnit(state, unit.id);
    if (!result.ok) { status.textContent = result.error; return; }
    setUnitsFixtureVisibility(state, remembered);
    renderer.setGameState(state); selection();
    renderer.animateMove(unit.id, result.from, result.walked);
    if (result.walked.length) moved.add(unit.id);
    updateActions();
    status.textContent = result.walked.length
      ? `${unitDef(unit.type).name} moved through the game’s movement command. Reset the specimens to repeat.`
      : 'No movement remains. Reset the specimens to repeat.';
  });
  const resetButton = button(actions, 'Reset specimens', queueReset);
  button(actions, 'Reset view', frame);
  updateActions();
  renderer.setFrameListener(() => {
    for (const { id, view, node } of labels) {
      const unit = state.units.find(piece => piece.id === specimens.get(id))!;
      const point = renderer.projectCell(unit.col, unit.row, -.12);
      const included = isLine(focus) ? true : focus === 'all' ? id in UNIT_VIEWS
        : focus === 'civilian' ? id in UNIT_VIEWS && view.row >= 7 : focus === id;
      node.hidden = !included || remembered || !point?.onScreen;
      node.textContent = id === 'greatPerson' ? `Great ${family}` : view.label;
      if (point) { node.style.left = `${point.x}px`; node.style.top = `${point.y + 30}px`; }
    }
  });
  let hoveredUnitId: number | null = null;
  let drag: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
  function hoverUnit(id: number | null): void {
    if (id === hoveredUnitId) return;
    hoveredUnitId = id; renderer.setHoveredUnitId(id);
    canvas.style.cursor = id === null ? '' : 'pointer';
  }
  function clearHover(): void { hoverUnit(null); }
  function cancelPointer(): void {
    const id = drag?.id; drag = null; clearHover();
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function targetAt(event: PointerEvent) {
    if (!ready || rebuilding || remembered) return null;
    const bounds = canvas.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return null;
    const selectedId = selected ? currentUnit().id : null;
    const direct = resolveUnitPointerTarget(state, 0, selectedId, {
      badgeId: badgesVisible ? renderer.pickUnitBadge(x, y, 0) : null,
      modelId: () => renderer.pickUnitModel(x, y, 0),
    });
    return direct ?? resolveUnitPointerTarget(state, 0, selectedId, { tile: renderer.pick(x, y)?.tile });
  }
  function selectTarget(event: PointerEvent): void {
    const target = targetAt(event);
    if (!target) { clearHover(); return; }
    const { unit } = target;
    // Contexts can contain a stack: keep the clicked unit's identity even when
    // its cell is represented by one shared City occupancy option.
    const specimen = [...specimens].find(([, id]) => id === unit.id)?.[0]
      ?? Object.entries(views).find(([, view]) => view.col === unit.col && view.row === unit.row)?.[0];
    if (specimen) { focus = specimen as Focus; unitControl.value = focus; }
    inspectedUnitId = unit.id; selected = true; selectionControl.checked = true;
    updateURL(); updateActions(); selection(); hoverUnit(unit.id);
    note.textContent = `${unitDef(unit.type).name} selected. ${views[focus]?.note ?? ''}`;
    status.textContent = `${unitDef(unit.type).name} selected. Hover a piece, badge or tile; click to select. Drag to pan · scroll to zoom.`;
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag || !ready || rebuilding) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    if (!drag) { hoverUnit(targetAt(event)?.unit.id ?? null); return; }
    if (drag.id !== event.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
      drag.moved = true; clearHover();
    }
    renderer.panByScreen(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX; drag.y = event.clientY;
  }, { signal });
  canvas.addEventListener('pointerleave', clearHover, { signal });
  canvas.addEventListener('pointercancel', cancelPointer, { signal });
  canvas.addEventListener('lostpointercapture', () => { if (drag) { drag = null; clearHover(); } }, { signal });
  canvas.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const wasDrag = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5;
    drag = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!wasDrag) selectTarget(event);
  }, { signal });
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); clearHover(); const bounds = canvas.getBoundingClientRect();
    renderer.zoomBy(Math.exp(-event.deltaY * .0015), event.clientX - bounds.left, event.clientY - bounds.top);
  }, { passive: false, signal });
  const dispose = (): void => {
    if (disposed) return; disposed = true;
    cancelPointer();
    listener.abort(); resize.disconnect(); renderer.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true, signal });
  try {
    await renderer.enablePaintedLook(daylight);
    if (disposed) return dispose;
    renderer.setDaylight(daylight); renderer.setShadows(shadows); renderer.setUnitBadgesVisible(badgesVisible);
    renderer.setFogSeat(0); renderer.setGameState(state);
    ready = true; frame();
    status.textContent = 'Hover a piece, badge or tile; click to select. Drag to pan · scroll to zoom. Movement uses the game’s rules.';
  } catch (error) {
    status.textContent = `The review could not load: ${error instanceof Error ? error.message : String(error)}`;
    dispose();
  }
  return dispose;
}
