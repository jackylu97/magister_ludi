// Builds — and checks — the painted benchmark's saved fixtures.
//
//   node scripts/terrain-study/check-fixtures.mjs            # every fixture
//   node scripts/terrain-study/check-fixtures.mjs --only standard-t120-s1
//   node scripts/terrain-study/check-fixtures.mjs --quick    # the smoke fixture
//
// The audit (#24) asks for "a developed standard map and a large map, with
// explicit counts of cities/walls, units, fields, roads and sites". A fixture is
// therefore not a hand-made scene: it is a *save*, produced by driving the bots
// from a seed for a fixed number of turns, written as `{config, log}` in the
// game's own envelope so the browser harness loads it through the same door a
// player's Continue does. Nothing here touches the user's shelf — the files land
// under docs/plans/benchmarks/fixtures/ and the harness pushes them into the
// headless browser's own localStorage.
//
// Three checks run on every fixture, and each is a pin the audit names:
//   · determinism — the same seed and turn count produce the identical payload
//     hash (the smoke fixture is built twice; the long ones are replayed);
//   · replayability — the payload loads through `loadSave`, which replays the
//     whole log against the real reducer and refuses a save it cannot rebuild;
//   · population — the counts the report has to print are read off the replayed
//     state, not off the generator's own bookkeeping.
//
// Seat 0 is played by a bot like every other seat (a seat `driveBots` skips
// never founds a city, and an empty empire is exactly the fixture the audit says
// is missing), and the written config then marks that seat human so the browser
// resumes into it the way a player's save does. `isHuman` is read nowhere in
// `src/sim/`, so the flip cannot move an outcome — the replay check would catch
// it if it did.
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'docs/plans/benchmarks/fixtures');

/** The fixtures, and the whole of what makes one. */
export const FIXTURES = [
  {id: 'smoke-t8-s1', seed: 1, sizeName: 'standard', seats: 4, turns: 8, barbarians: true,
   note: 'the determinism pin: cheap enough to build twice'},
  {id: 'standard-t120-s1', seed: 1, sizeName: 'standard', seats: 6, turns: 120, barbarians: true,
   note: 'the developed standard map — six empires, 120 turns'},
  {id: 'large-t120-s1', seed: 1, sizeName: 'large', seats: 8, turns: 120, barbarians: true,
   note: 'the larger stress map the review-7 gate names'},
];

const SEAT_INKS = [
  ['Crimson', '#d4502e'], ['Teal', '#1f8a85'], ['Gilt', '#c08a2b'], ['Lapis', '#3f639f'],
  ['Grape', '#7c5f8c'], ['Brook', '#8ac6bd'], ['Timber', '#8a6a45'], ['Steel', '#9aa3a8'],
];

/** The simulation, bundled once for node. Types are the compiler's business. */
async function loadSim() {
  const compiled = await build({
    stdin: {
      contents: `
        export {createGame, tryReplay} from './src/sim/game.ts';
        export {driveBots} from './src/ai/driver.ts';
        export {makeSavePayload, loadSave} from './src/ui/saves.ts';
        export {realPlayers, SCHEMA_VERSION} from './src/sim/state.ts';
      `,
      resolveDir: root,
      sourcefile: 'fixtures-entry.ts',
      loader: 'ts',
    },
    bundle: true, write: false, platform: 'node', format: 'esm',
  });
  return import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
}

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function configFor(fixture) {
  return {
    seed: fixture.seed,
    sizeName: fixture.sizeName,
    // Every seat driven, so every empire in the fixture is a real empire.
    players: SEAT_INKS.slice(0, fixture.seats).map(([name, color]) => ({name, color, isHuman: false})),
    barbarians: fixture.barbarians,
  };
}

/** Drives the bots and returns the save envelope, unwritten. */
export function buildFixture(sim, fixture) {
  const started = Date.now();
  const game = sim.createGame(configFor(fixture));
  for (let turn = 0; turn < fixture.turns; turn++) sim.driveBots(game, {warn: () => {}});
  const payload = sim.makeSavePayload(game, fixture.id, 0);
  // The seat the harness sits in. Presentation only — see this file's header.
  payload.config = {...payload.config, players: payload.config.players.map((spec, seat) =>
    seat === 0 ? {...spec, isHuman: true} : spec)};
  payload.name = fixture.id;
  return {payload, buildMs: Date.now() - started, state: game.state};
}

/** The populations the report has to print, read off a state. */
export function populationOf(state) {
  const improvements = {};
  let roads = 0;
  for (const tile of state.map.tiles) {
    if (tile.road !== undefined && tile.road !== null) roads++;
    if (tile.improvement) improvements[tile.improvement] = (improvements[tile.improvement] ?? 0) + 1;
  }
  return {
    turn: state.turn,
    seats: state.players.length,
    cities: state.cities.length,
    buildings: state.cities.reduce((sum, city) => sum + city.buildings.length, 0),
    walledCities: state.cities.filter(city => city.buildings.includes('palisade')).length,
    units: state.units.length,
    improvedTiles: Object.values(improvements).reduce((sum, count) => sum + count, 0),
    improvements,
    roadedTiles: roads,
    camps: state.camps.length,
    discoveries: state.map.tiles.filter(tile => tile.discovery).length,
    map: {width: state.map.width, height: state.map.height, tiles: state.map.tiles.length},
  };
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const quick = args.includes('--quick');
  const wanted = FIXTURES.filter(fixture =>
    (only === null || fixture.id === only) && (!quick || fixture.id.startsWith('smoke')));
  const sim = await loadSim();
  fs.mkdirSync(outDir, {recursive: true});
  const report = [];
  for (const fixture of wanted) {
    const {payload, buildMs, state} = buildFixture(sim, fixture);
    const json = JSON.stringify(payload);
    const digest = hash(payload);

    // Determinism: the cheap fixture is built a second time from the same seed.
    let deterministic = null;
    if (fixture.turns <= 12) deterministic = hash(buildFixture(sim, fixture).payload) === digest;

    // Replayability: the log rebuilt by the real reducer, through the real door.
    const loaded = sim.loadSave(json);
    if (!loaded.ok) throw new Error(`${fixture.id}: the save does not replay — ${loaded.error}`);
    const replayed = populationOf(loaded.game.state);
    const played = populationOf(state);
    if (hash(replayed) !== hash(played)) throw new Error(`${fixture.id}: replay disagrees with the played game`);

    fs.writeFileSync(path.join(outDir, `${fixture.id}.json`), json);
    report.push({
      id: fixture.id, note: fixture.note, seed: fixture.seed, size: fixture.sizeName,
      seats: fixture.seats, turns: fixture.turns, buildMs, commands: payload.log.length,
      bytes: json.length, payloadSha256: digest, deterministic,
      replays: true, population: replayed,
    });
    console.error(`[fixtures] ${fixture.id}: ${payload.log.length} commands, ${json.length} bytes, ${(buildMs / 1000).toFixed(1)} s`);
  }
  const summary = {
    generatedBy: 'scripts/terrain-study/check-fixtures.mjs',
    schemaVersion: sim.SCHEMA_VERSION,
    checks: 'same seed and turn count → identical payload hash; every payload replays through loadSave; populations read off the replayed state',
    fixtures: report,
  };
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
