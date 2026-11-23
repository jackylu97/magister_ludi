/** Review actual fights in saved games without repricing the bot's past decisions. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyCommand } from '../src/sim/commands';
import { applyCombat, previewCombat, type CombatOutcome } from '../src/sim/combat';
import { loadGame, restoreState, snapshotState, type SaveFile } from '../src/sim/game';
import { getTileAt, tileHex, wrappedDistance } from '../src/sim/map';
import { isBarbarian, newGame, realPlayers, type GameState, type Unit } from '../src/sim/state';
import { isCombatant, isRanged, unitDef } from '../src/sim/unitData';
import type { BotDecision } from '../src/ai/decision';

const [root, ...requested] = process.argv.slice(2);
if (!root) throw Error('Pass the comparison directory and optional variant names.');
const variants = requested.length ? requested : ['baseline', 'war-losses', 'ranked-attacks'];
const schedule = JSON.parse(readFileSync(join(root, 'schedule.json'), 'utf8'));
const seeds = process.env.BOT_COMBAT_SEEDS?.split(',').map(Number);

function unitReading(state: GameState, unit: Unit) {
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  return {
    id: unit.id, ownerId: unit.ownerId, type: unit.type, hp: unit.hp,
    col: unit.col, row: unit.row, terrain: tile.terrain, feature: tile.feature,
    hills: tile.hills, ranged: isRanged(unitDef(unit.type)),
    military: isCombatant(unitDef(unit.type)), fortifiedTurns: unit.fortifiedTurns,
  };
}
type UnitReading = ReturnType<typeof unitReading>;
type Event = {
  index: number; turn: number; automatic: boolean; outcome: CombatOutcome;
  attacker: UnitReading | null; defender: UnitReading | null;
  context: ReturnType<typeof attackContext> | null;
  originalDecision?: BotDecision;
  attackerLostByNextTurn?: { turn: number; index: number; by: number };
};

function attackContext(state: GameState, attacker: Unit, at: { col: number; row: number }) {
  const preview = previewCombat(state, attacker.id, at);
  assert(preview.ok, 'A recorded direct attack must still be legal.');
  const target = getTileAt(state.map, at.col, at.row)!;
  const nearby = state.units.filter(unit => {
    const tile = getTileAt(state.map, unit.col, unit.row)!;
    return wrappedDistance(state.map, tileHex(target), tileHex(tile)) <= 3;
  }).map(unit => unitReading(state, unit));
  const cities = state.cities.filter(city => {
    const tile = getTileAt(state.map, city.col, city.row)!;
    return wrappedDistance(state.map, tileHex(target), tileHex(tile)) <= 3;
  }).map(city => ({ id: city.id, ownerId: city.ownerId, name: city.name, col: city.col, row: city.row }));
  return { preview, nearby, cities };
}

const summaries: unknown[] = [];
for (const variant of variants) for (const { seed } of schedule.lineups) {
  if (seeds && !seeds.includes(seed)) continue;
  const directory = join(root, variant, String(seed));
  const report = JSON.parse(readFileSync(join(directory, `${seed}.json`), 'utf8'));
  const decisions = new Map<number, BotDecision>(
    (report.decisions ?? []).filter((row: { index?: number }) => row.index !== undefined)
      .map((row: { index: number; decision: BotDecision }) => [row.index, row.decision]),
  );
  const checkpoint = Math.max(...Object.keys(report.checkpoints).map(Number));
  const saved = readFileSync(join(directory, `${seed}-${checkpoint}.save.json`), 'utf8');
  const file = JSON.parse(saved) as SaveFile;
  const state = newGame(file.config);
  const events: Event[] = [];
  const lastAdvance = new Map<number, Event>();
  const commandsBySeat: Record<number, Record<string, number>> = {};
  const rosterTypes = new Map<number, UnitReading>();
  for (let index = 0; index < file.log.length; index++) {
    const command = file.log[index]!;
    const turn = state.turn;
    const counts = commandsBySeat[command.playerId] ??= {};
    counts[command.type] = (counts[command.type] ?? 0) + 1;
    // Direct attacks have an exact pre-attack board. End-turn attacks happen
    // inside several phases, so do not claim their earlier board was exact.
    const direct = command.type === 'attack';
    let context: ReturnType<typeof attackContext> | null = null;
    let directOutcome: CombatOutcome | null = null;
    if (direct || command.type === 'endTurn') {
      for (const unit of state.units) rosterTypes.set(unit.id, unitReading(state, unit));
      if (direct) {
        const attacker = state.units.find(unit => unit.id === command.unitId)!;
        context = attackContext(state, attacker, command.target);
        // Ordinary attacks omit their outcome from CommandResult. Collect it
        // from the same combat resolver on a private copy at the same RNG
        // position. The real replay still changes only through applyCommand.
        const copy = restoreState(snapshotState(state));
        const fight = applyCombat(copy, command.unitId, command.target);
        assert(fight.ok);
        directOutcome = fight.outcome;
      }
    }
    const result = applyCommand(state, command);
    assert(result.ok, `${variant}/${seed}: rejected replay command ${index}`);
    if (direct) assert(directOutcome !== null);
    if (directOutcome && result.combats) assert.deepEqual(result.combats, [directOutcome]);
    for (const outcome of directOutcome ? [directOutcome] : result.combats ?? []) {
      const event: Event = {
        index, turn, automatic: !direct, outcome,
        attacker: direct ? rosterTypes.get(outcome.attackerId) ?? null : null,
        defender: direct && outcome.defenderUnitId !== null ? rosterTypes.get(outcome.defenderUnitId) ?? null : null,
        context,
        originalDecision: direct ? decisions.get(index) : undefined,
      };
      for (const killed of outcome.killed) {
        const advance = lastAdvance.get(killed.id);
        if (advance && turn <= advance.turn + 1) {
          advance.attackerLostByNextTurn = {
            turn, index, by: killed.id === outcome.attackerId ? outcome.defenderOwnerId! : outcome.attackerOwnerId,
          };
        }
        lastAdvance.delete(killed.id);
      }
      if (outcome.advanced) lastAdvance.set(outcome.attackerId, event);
      events.push(event);
    }
  }
  // Check every simulation byte, not only the summary numbers. Observations
  // must not change the result of the normal save loader.
  assert.equal(snapshotState(state), snapshotState(loadGame(saved).state));
  assert.equal(events.filter(event => !event.automatic).length, file.log.filter(command => command.type === 'attack').length);
  const seats = realPlayers(state).map(player => {
    const attacks = events.filter(e => e.outcome.attackerOwnerId === player.id);
    const defenses = events.filter(e => e.outcome.defenderOwnerId === player.id);
    const field = attacks.filter(e => e.context && e.context.preview.cityPhase === undefined && !e.context.preview.capturesUnit && !e.context.preview.plundersUnit);
    const advances = attacks.filter(e => e.outcome.advanced);
    const counterLosses = attacks.filter(e => !e.outcome.attackerSurvived);
    // These are observed follow-ups, not proof that the sacrifice caused them.
    const afterTrade = (loss: Event, event: Event): boolean =>
      event.index > loss.index && event.turn <= loss.turn + 2;
    return {
      id: player.id, leader: player.leader,
      commands: commandsBySeat[player.id], attacks: attacks.length,
      ranged: attacks.filter(e => e.outcome.kind === 'ranged').length,
      againstWild: attacks.filter(e => e.outcome.defenderOwnerId !== null && isBarbarian(state, e.outcome.defenderOwnerId)).length,
      fieldDamageDealt: field.reduce((n, e) => n + e.outcome.damageToDefender, 0),
      fieldDamageTaken: field.reduce((n, e) => n + e.outcome.damageToAttacker, 0),
      counterDeaths: counterLosses.length,
      counterDeathsWithoutKill: attacks.filter(e => !e.outcome.attackerSurvived && !e.outcome.killed.some(k => k.ownerId !== player.id)).length,
      counterDeathsFollowedByAlliedKill: counterLosses.filter(loss => {
        const target = loss.outcome.defenderUnitId;
        return target !== null && events.some(event => afterTrade(loss, event) &&
          event.outcome.killed.some(unit => unit.id === target) &&
          (event.outcome.attackerId === target ? event.outcome.defenderOwnerId : event.outcome.attackerOwnerId) === player.id);
      }).length,
      counterDeathsFollowedByCityCapture: counterLosses.filter(loss =>
        loss.outcome.defenderCityId !== null && events.some(event => afterTrade(loss, event) &&
          event.outcome.capturedCityId === loss.outcome.defenderCityId && event.outcome.attackerOwnerId === player.id)).length,
      rangedKills: attacks.filter(e => e.outcome.kind === 'ranged').flatMap(e => e.outcome.killed).length,
      advances: advances.length,
      advancesLostByNextTurn: advances.filter(e => e.attackerLostByNextTurn).length,
      defended: defenses.length,
      defendedAgainstWild: defenses.filter(e => isBarbarian(state, e.outcome.attackerOwnerId)).length,
      knownFortifiedDefenses: defenses.filter(e => e.context && e.context.preview.fortifyBonus > 0).length,
      knownTerrainDefenses: defenses.filter(e => e.context && e.context.preview.terrainBonus > 0).length,
      // The arrival lists include civilians behind a defeated escort.
      // capturedUnitId can instead name a converted soldier, so do not use it.
      civilianLosses: events.reduce((n, { outcome }) => n +
        (outcome.arrival?.captured.filter(unit => unit.fromOwnerId === player.id).length ?? 0) +
        (outcome.arrival?.plundered.filter(trader => trader.fromOwnerId === player.id).length ?? 0) +
        (outcome.plundered?.fromOwnerId === player.id ? 1 : 0), 0),
      citiesLost: defenses.filter(e => e.outcome.capturedCityId !== null).length,
      lostToWild: events.filter(e => isBarbarian(state, e.outcome.attackerOwnerId) || (e.outcome.defenderOwnerId !== null && isBarbarian(state, e.outcome.defenderOwnerId))).flatMap(e => e.outcome.killed).filter(k => k.ownerId === player.id).length,
      roster: state.units.filter(unit => unit.ownerId === player.id && isCombatant(unitDef(unit.type))).reduce((counts, unit) => {
        counts[unit.type] = (counts[unit.type] ?? 0) + 1;
        return counts;
      }, {} as Record<string, number>),
    };
  });
  const review = { variant, seed, checkpoint, replayMatched: true, tradeWindowTurns: 2, seats, events };
  writeFileSync(join(directory, 'combat-quality.json'), JSON.stringify(review) + '\n');
  summaries.push({ variant, seed, checkpoint, replayMatched: true, tradeWindowTurns: 2, seats });
  writeFileSync(join(root, `combat-quality-${variants.join('-')}.json`), JSON.stringify(summaries, null, 2) + '\n');
  console.log(`Reviewed ${variant}/${seed}: ${events.length} fights, exact replay matched.`);
}
