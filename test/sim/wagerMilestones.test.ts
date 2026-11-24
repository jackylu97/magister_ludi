import { describe, expect, it, vi } from 'vitest';
import { appraiseMilestoneWagers } from '../../src/ai/wager';
import * as ledger from '../../src/sim/ledgerFold';
import { createGame, dispatch, saveGame, loadGame, isSavedConfig } from '../../src/sim/game';
import { isPassable } from '../../src/sim/pathfind';
import { foundCityAt, settleProductionQueue } from '../../src/sim/cities';
import { at, bareState } from './improvementHelpers';
import { applyCommand } from '../../src/sim/commands';
import { newGame } from './newGameHelpers';
import { bumpRevision, buyWithFaith, buyWithGold, spendFaith, spendGold } from '../../src/sim/state';
import { closeMilestoneAge, milestoneOffer, milestonePickNeeded, openMilestoneAge, wagerMetricNow } from '../../src/sim/wagerMilestones';
import { collectMilestoneAwards, runWagers } from '../../src/sim/wagers';
import { WAGER_GROUPS, WAGER_METRICS, addWagerCount, wagerIncome, wagerSetupCopy, type WagerCalibration } from '../../src/sim/wagerMilestoneData';

function calibration(): WagerCalibration {
  const make = () => Object.fromEntries(WAGER_METRICS.map((key) => [key, [1, 2, 3]])) as WagerCalibration['marks'][2];
  return { weights: { perArmyStrength: 1, perDefeat: 1 }, marks: { 1: { score: [1, 2, 3] }, 2: make(), 3: make(), 4: make() } };
}
const config = { seed: 14, sizeName: 'duel', players: [{ name: 'Human', color: 'red', isHuman: true }, { name: 'Bot', color: 'blue' }] };
function board(humanMarksPercent?: number) {
  return newGame({ ...config, wagerSetup: { mode: 'calibrated', calibration: calibration(), humanMarksPercent } });
}

describe('age milestones', () => {
  it('awards all age I marks at the first opportunity without a pick or a repeat', () => {
    const state = board();
    const seat = state.players[0]!;
    expect(milestoneOffer(state, 0)?.reached.map((r) => r.mark)).toEqual([0, 1, 2]);
    expect(milestonePickNeeded(state, 0)).toBe(false);
    const before = seat.beads.length;
    expect(before).toBe(3);
    collectMilestoneAwards(state, []);
    expect(seat.beads.length).toBe(before);
  });

  it('deals two shared wagers from different groups and skips both in the next age', () => {
    const state = board();
    openMilestoneAge(state, 2);
    const ageTwo = milestoneOffer(state, 0)!;
    expect(ageTwo.options.map((o) => o.metric)).toEqual(milestoneOffer(state, 1)!.options.map((o) => o.metric));
    const [a, b, score] = ageTwo.options.map((o) => o.metric);
    expect(score).toBe('score');
    expect(Object.values(WAGER_GROUPS).some((group) => group.includes(a) && group.includes(b))).toBe(false);
    openMilestoneAge(state, 3);
    expect(state.wagerBook!.ages[2]!.dealt.some((id) => id === a || id === b)).toBe(false);
  });

  it('replays the same shared deal and RNG through all ages', () => {
    const make = () => createGame({ ...config, wagerSetup: { mode: 'calibrated', calibration: calibration() } }).state;
    const first = make();
    const second = make();
    for (const age of [2, 3, 4]) {
      openMilestoneAge(first, age);
      openMilestoneAge(second, age);
      expect(first.wagerBook!.ages[age - 1]!.dealt).toEqual(second.wagerBook!.ages[age - 1]!.dealt);
      expect(first.rng).toEqual(second.rng);
    }
  });

  it('compares all nine choices and takes an immediately achievable high reward', () => {
    const state = board();
    openMilestoneAge(state, 2);
    const offer = milestoneOffer(state, 1)!;
    const options = appraiseMilestoneWagers(state, 1, { ageTurns: 30, driftWeight: 1 }, offer);
    expect(options).toHaveLength(9);
    const best = options[0]!;
    expect(best.mark).toBe(2);
    expect(best.now).toBeGreaterThanOrEqual(best.goal);
  });

  it('rejects invalid picks and end turn without changing state, pays an achieved pick once', () => {
    const state = board();
    openMilestoneAge(state, 2);
    const before = JSON.stringify(state);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 }).ok).toBe(false);
    for (const bad of [{ index: 2, age: 1, mark: 2 }, { index: 7, age: 2, mark: 1 }, { index: 1, age: 2, mark: 3 }]) {
      expect(applyCommand(state, { type: 'chooseWager', playerId: 0, ...bad } as Parameters<typeof applyCommand>[1]).ok).toBe(false);
    }
    expect(JSON.stringify(state)).toBe(before);
    const beads = state.players[0]!.beads.length;
    const cmd = { type: 'chooseWager', playerId: 0, index: 2, age: 2, mark: 2 } as const;
    expect(applyCommand(state, cmd).ok).toBe(true);
    expect(state.players[0]!.beads.length).toBe(beads + 3);
    expect(applyCommand(state, cmd).ok).toBe(false);
    expect(milestonePickNeeded(state, 0)).toBe(false);
  });

  it('counts each building completed from one production basket once', () => {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state, 4, 5));
    state.wagerBook = { setup: { mode: 'measure' }, ages: [] };
    city.queue = [{ kind: 'building', id: 'granary' }, { kind: 'building', id: 'monument' }];
    city.hammerBasket = 10000;
    bumpRevision(state);
    openMilestoneAge(state, 1);
    settleProductionQueue(state, city);
    expect(city.buildings).toEqual(expect.arrayContaining(['granary', 'monument']));
    expect(wagerMetricNow(state, 0, 'buildings')).toBe(2);
    settleProductionQueue(state, city);
    expect(wagerMetricNow(state, 0, 'buildings')).toBe(2);
  });

  it('keeps each age’s counters and subtracts refunds from purchases only', () => {
    const state = board();
    const player = state.players[0]!;
    buyWithGold(state, player, 6);
    player.faithPool = 8;
    bumpRevision(state);
    buyWithFaith(state, player, 4);
    spendFaith(state, player, 1);
    spendGold(state, player, 1);
    addWagerCount(state, 0, 'purchases', -3);
    wagerIncome(state, 0, 'scienceCulture', 8);
    wagerIncome(state, 0, 'faithGold', 5);
    expect(wagerMetricNow(state, 0, 'purchases')).toBe(7);
    openMilestoneAge(state, 2);
    const past = state.wagerBook!.ages[0]!.seats[0]!.closing!;
    expect(past.readings).toMatchObject({ purchases: 7, scienceCulture: 8, faithGold: 5 });
    expect(wagerMetricNow(state, 0, 'purchases')).toBe(0);
  });

  it('uses the configured human mark increase and leaves the rival bar at its calibrated values', () => {
    const state = board(40);
    expect(milestoneOffer(state, 0)!.options[0]!.marks).toEqual([1.4, 2.8, 4.2]);
    expect(milestoneOffer(state, 1)!.options[0]!.marks).toEqual([1, 2, 3]);
  });

  it('rejects incomplete calibration and measures without drawing from the game RNG', () => {
    expect(() => wagerSetupCopy({ mode: 'calibrated', calibration: undefined! })).toThrow();
    const invalid = calibration();
    invalid.marks[2].buildings = [2, 1, 3];
    expect(() => wagerSetupCopy({ mode: 'calibrated', calibration: invalid })).toThrow();
    expect(isSavedConfig({ ...config, wagerSetup: { mode: 'calibrated', calibration: invalid } })).toBe(false);
    expect(isSavedConfig({ ...config, wagerSetup: null })).toBe(false);
    const state = newGame({ ...config, wagerSetup: { mode: 'measure' } });
    const rng = JSON.stringify(state.rng);
    openMilestoneAge(state, 2);
    closeMilestoneAge(state);
    openMilestoneAge(state, 3);
    openMilestoneAge(state, 4);
    expect(JSON.stringify(state.rng)).toBe(rng);
    expect(milestoneOffer(state, 0)).toBeNull();
    expect(state.wagerBook!.ages[1]!.seats[0]!.closing?.scoreLines.length).toBeGreaterThan(0);
  });

  it('pays immediately when army strength rises and falls within one turn', () => {
    const state = board();
    openMilestoneAge(state, 2);
    const age = state.wagerBook!.ages[1]!;
    const now = wagerMetricNow(state, 0, 'armyStrength');
    const setup = state.wagerBook!.setup;
    if (setup.mode !== 'calibrated') throw Error('Missing test marks');
    age.dealt = ['armyStrength', 'peopleYields'];
    setup.calibration.marks[2].armyStrength = [now + 1, now + 100, now + 200];
    bumpRevision(state);
    expect(applyCommand(state, { type: 'chooseWager', playerId: 0, age: 2, index: 0, mark: 0 }).ok).toBe(true);
    const before = state.players[0]!.beads.length;
    const at = state.map.tiles.find((tile) => isPassable(tile) && !state.units.some((u) => u.col === tile.col && u.row === tile.row))!;
    const spawn = applyCommand(state, { type: 'spawnUnit', playerId: 0, ownerId: 0, unitType: 'warrior', at });
    expect(spawn.ok).toBe(true);
    expect(state.players[0]!.beads.length).toBe(before + 1);
    const unit = state.units.find((u) => u.col === at.col && u.row === at.row)!;
    expect(applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId: unit.id }).ok).toBe(true);
    expect(wagerMetricNow(state, 0, 'armyStrength')).toBe(now);
    expect(age.seats[0]!.reached).toEqual([{ mark: 0, turn: state.turn }]);
  });

  it('skips the people yield fold on a piece-only command', () => {
    const state = board();
    openMilestoneAge(state, 2);
    state.wagerBook!.ages[1]!.dealt = ['peopleYields', 'armyStrength'];
    bumpRevision(state);
    const spy = vi.spyOn(ledger, 'ledgerBagOfEmpire');
    try {
      expect(applyCommand(state, { type: 'chooseWager', playerId: 0, age: 2, index: 0, mark: 2 }).ok).toBe(true);
      expect(spy).toHaveBeenCalled();
      milestoneOffer(state, 0);
      spy.mockClear();
      const unit = state.units.find((u) => u.ownerId === 0)!;
      expect(applyCommand(state, { type: 'sleepUnit', playerId: 0, unitId: unit.id }).ok).toBe(true);
      milestoneOffer(state, 0);
      expect(spy).toHaveBeenCalledTimes(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('keeps only known calibration fields and replays the normalized config', () => {
    const setup = { mode: 'calibrated' as const, calibration: calibration(), extra: 'discard' };
    const game = createGame({ ...config, wagerSetup: setup });
    setup.calibration.marks[1].score[0] = 90;
    expect(game.config.wagerSetup).not.toHaveProperty('extra');
    const unit = game.state.units.find((u) => u.ownerId === 0)!;
    expect(dispatch(game, { type: 'sleepUnit', playerId: 0, unitId: unit.id }).ok).toBe(true);
    expect(loadGame(saveGame(game)).state).toEqual(game.state);
  });

  it('closes the winning age even when the next age is due on the same turn', () => {
    const state = board();
    state.ageClose = { age: 1, turn: state.turn };
    state.winnerId = 0;
    bumpRevision(state);
    const rng = JSON.stringify(state.rng);
    runWagers(state);
    expect(state.wagerBook!.ages).toHaveLength(1);
    expect(state.wagerBook!.ages[0]!.closed).toBe(state.turn);
    expect(JSON.stringify(state.rng)).toBe(rng);
  });

  it('closes the losing pick without imposing a malice', () => {
    const setup = calibration();
    setup.marks[2].score = [10000, 20000, 30000];
    const state = newGame({ ...config, wagerSetup: { mode: 'calibrated', calibration: setup } });
    openMilestoneAge(state, 2);
    applyCommand(state, { type: 'chooseWager', playerId: 0, age: 2, index: 2, mark: 2 });
    const before = state.players[0]!.beads.length;
    state.ageClose = { age: 2, turn: state.turn };
    bumpRevision(state);
    runWagers(state);
    expect(state.players[0]!.beads.length).toBe(before);
    expect(state.wagerBook!.ages[1]!.seats[0]!.reached).toEqual([]);
    expect(milestonePickNeeded(state, 0)).toBe(true);
    expect(state.wagers).toHaveLength(0);
  });
});
