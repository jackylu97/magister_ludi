import { describe, expect, it } from 'vitest';

// The board is shown to its first seat before the first state reaches it, so every layer is built once, for that
// seat's eyes. Before, the first build drew every layer for the whole map, and the controls' first seat built them all
// again a moment later: about 25 s of a Giant map's load (render speed pass, third pass). Read off the source, because
// the page's boot needs a browser and a WebGL context.
const main = Object.values(import.meta.glob('../../src/main.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0]!;

describe('the board\'s first seat', () => {
  it('is set before the first state, to the seat the controls will open at', () => {
    const create = main.slice(main.indexOf('async function createRenderer('));
    const body = create.slice(0, create.indexOf('\n}\n'));
    expect(body).toMatch(/firstSeat: number/);
    const seat = body.indexOf('renderer.setFogSeat(firstSeat);'), state = body.indexOf('renderer.setGameState(game.state);');
    expect(seat).toBeGreaterThan(0);
    expect(state).toBeGreaterThan(seat);
    // The same seat the boot hands the controls a few lines later.
    expect(main).toMatch(/createRenderer\(artMode\(\), game, initial === null \? 0 : resumeSeat\(game\.state\)\)/);
    expect(main).toMatch(/controls\.refresh\(initial === null \? 0 : resumeSeat\(game\.state\)\)/);
  });
});
