import { expect, it } from 'vitest';
import { claimTile, foundCityAt } from '../../src/sim/cities';
import { improvementGroundError } from '../../src/sim/improvements';
import { raiseImprovement, tileNeighbors } from '../../src/sim/map';
import { bumpRevision } from '../../src/sim/state';
import { improvementSites } from '../../src/ui/improvementSites';
import { at, bareState } from '../sim/improvementHelpers';

it('marks only buildable stone circle sites and counts working improvements', () => {
  const state = bareState(14, 10);
  const city = foundCityAt(state, 0, at(state, 4, 4));
  expect(improvementSites(state, 0, 'stoneCircle')).toEqual([]);
  const player = state.players[0]!;
  player.statecraft.orders.push('theMegaliths');
  const site = at(state, 5, 4);
  claimTile(state, city, site);
  const neighbours = tileNeighbors(state.map, site).filter(tile => tile.col !== 4 || tile.row !== 4);
  raiseImprovement(neighbours[0]!, 'pasture', state.turn);
  raiseImprovement(neighbours[1]!, 'camp', state.turn);
  raiseImprovement(neighbours[2]!, 'farm', state.turn);
  bumpRevision(state);
  const sites = improvementSites(state, 0, 'stoneCircle');
  const target = sites.find(cell => cell.col === site.col && cell.row === site.row);
  expect(target?.count).toBe(2);
  expect(target?.detail).toMatch(/Pasture/i);
  expect(target?.detail).toMatch(/Camp/i);
  for (const cell of sites) expect(improvementGroundError(state, 0, at(state, cell.col, cell.row), 'stoneCircle')).toBeNull();
  expect(sites.some(cell => cell.col === 4 && cell.row === 4)).toBe(false);
  delete neighbours[0]!.improvement;
  bumpRevision(state);
  expect(improvementSites(state, 0, 'stoneCircle').find(cell => cell.col === site.col && cell.row === site.row)?.count).toBe(1);
});

it('requires an adjacent mountain and counts each mountain once', () => {
  const state = bareState(14, 10);
  const city = foundCityAt(state, 0, at(state, 4, 4));
  state.players[0]!.statecraft.orders.push('theCliffMonasteries');
  const site = at(state, 5, 4);
  claimTile(state, city, site);
  const locate = () => improvementSites(state, 0, 'cliffMonastery').find(cell => cell.col === site.col && cell.row === site.row);
  bumpRevision(state);
  expect(locate()).toBeUndefined();
  const ring = tileNeighbors(state.map, site).filter(tile => tile.col !== 4 || tile.row !== 4);
  ring[0]!.terrain = 'mountain';
  ring[1]!.terrain = 'mountain';
  site.mountainsBeside = 2;
  bumpRevision(state);
  expect(improvementGroundError(state, 0, site, 'cliffMonastery')).toBeNull();
  expect(locate()).toMatchObject({ count: 2, detail: '2 × mountain' });
});

it('clears a preview on Escape, and an old button cannot clear a newer preview', async () => {
  const { bindActionPreview } = await import('../../src/ui/actionPreview');
  const doc = new EventTarget();
  const make = () => Object.assign(new EventTarget(), { ownerDocument: doc }) as unknown as HTMLElement;
  const a = make();
  const b = make();
  let marks = '';
  bindActionPreview(a, () => { marks = 'worker'; }, () => { marks = ''; });
  bindActionPreview(b, () => { marks = 'rite'; }, () => { marks = ''; });
  a.dispatchEvent(new Event('pointerenter'));
  expect(marks).toBe('worker');
  b.dispatchEvent(new Event('focus'));
  a.dispatchEvent(new Event('pointerleave'));
  expect(marks).toBe('rite');
  doc.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
  expect(marks).toBe('');
});
