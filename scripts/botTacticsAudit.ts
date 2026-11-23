/** Compare the local planner's alternatives on an original private planning board. */
import { readFileSync, writeFileSync } from 'node:fs';
import { aiConfigFor, setAiTuning } from '../src/ai/aiConfig';
import { planTacticalCombat } from '../src/ai/tactics/planner';
import { restoreState, snapshotState } from '../src/sim/game';

const [input, idText, output, tuning] = process.argv.slice(2);
const id = Number(idText);
if (!input || !output || !Number.isSafeInteger(id)) throw Error('Pass a planning snapshot, unit id and output path.');
if (tuning) setAiTuning(JSON.parse(readFileSync(tuning, 'utf8')));
const state = restoreState(readFileSync(input, 'utf8'));
const unit = state.units.find(row => row.id === id);
if (!unit) throw Error(`Unit ${id} is missing.`);
const before = snapshotState(state);
const started = performance.now();
const plan = planTacticalCombat(state, unit.ownerId, id, aiConfigFor(state.players[unit.ownerId]?.persona, unit.ownerId));
const elapsedMs = performance.now() - started;
if (snapshotState(state) !== before) throw Error('The planner changed its source state.');
writeFileSync(output, JSON.stringify({ input, turn: state.turn, unit, elapsedMs, plan }, null, 2) + '\n');
console.log(JSON.stringify({ unit: id, elapsedMs, action: plan?.action, stats: plan?.stats, candidates: plan?.candidates.map(row => ({ label: row.label, score: row.score, chosen: row.chosen })) }));
