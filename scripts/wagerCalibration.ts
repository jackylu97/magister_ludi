/** Run from the repository root. The wager spec describes the manifest and commands. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isLeaderId } from '../src/sim/leaderData';
import { getMapSize } from '../src/sim/mapgenData';
import { wagerSetupCopy, type WagerCalibration, type WagerSetup } from '../src/sim/wagerMilestoneData';
import { fitCalibration, heldOutReach } from './wagerCalibrationAnalysis';
import { play, type Manifest, type Strategy } from './wagerCalibrationGame';

const [action, manifestPath, outputDir] = process.argv.slice(2);
if (!['measure', 'fit', 'validate'].includes(action) || !manifestPath || !outputDir) {
  throw Error('Usage: vite-node scripts/wagerCalibration.ts <measure|fit|validate> <manifest.json> <output-directory>');
}
const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const seeds = [...manifest.trainingSeeds, ...manifest.heldOutSeeds];
if (!manifest.policy?.name || !Number.isSafeInteger(manifest.turnLimit) || manifest.turnLimit < 1 ||
    !manifest.trainingSeeds.length || !manifest.heldOutSeeds.length || !seeds.every(Number.isSafeInteger) ||
    new Set(seeds).size !== seeds.length || !manifest.boards.length || !manifest.leaders.every(isLeaderId) ||
    new Set(manifest.leaders).size !== manifest.leaders.length) {
  throw Error('Supply two nonempty, disjoint seed lists, a policy name, unique leaders, boards and a positive turn limit.');
}
const boards = new Set<string>();
for (const board of manifest.boards) {
  getMapSize(board.sizeName);
  const key = board.sizeName + '/' + board.seatCount;
  if (boards.has(key) || !Number.isInteger(board.seatCount) || board.seatCount < 2 || board.seatCount > manifest.leaders.length) {
    throw Error('Each board needs a unique map and seat count, and one distinct leader per seat.');
  }
  boards.add(key);
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
function writeJson(name: string, value: unknown) {
  const file = join(outputDir, name);
  const temporary = file + '.' + process.pid + '.tmp';
  writeFileSync(temporary, JSON.stringify(value, null, 2));
  renameSync(temporary, file);
}
function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(outputDir, name), 'utf8')) as T;
}

mkdirSync(outputDir, { recursive: true });
const files = [...git('ls-files', '-co', '--exclude-standard', '-z', '--', 'src/ai', 'src/sim', 'data', 'scripts/wagerCalibration*.ts')
  .split('\0').filter((file) => file && existsSync(file))].sort();
const hash = createHash('sha256');
for (const file of files) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
const plan = { manifest, sourceRevision: git('rev-parse', 'HEAD').trim(), sourceHash: hash.digest('hex') };
if (existsSync(join(outputDir, 'plan.json'))) {
  if (JSON.stringify(readJson('plan.json')) !== JSON.stringify(plan)) throw Error('This directory records a different policy, source or manifest. Use a new directory.');
} else if (action === 'measure') writeJson('plan.json', plan);
else throw Error('Run measure before fitting or validating.');

type Run = ReturnType<typeof play>;
function runs(strategy: Strategy, setup: WagerSetup, runSeeds: number[], create: boolean) {
  const reports: Run[] = [];
  for (const seed of runSeeds) for (const board of manifest.boards) {
    const name = [strategy, seed, board.sizeName, board.seatCount].join('-') + '.json';
    if (create && !existsSync(join(outputDir, name))) {
      console.log('Playing', name);
      writeJson(name, play(manifest, seed, board, strategy, setup));
    }
    reports.push(readJson<Run>(name));
  }
  return reports;
}

if (action === 'measure' || action === 'fit') {
  const reports = runs('measure', { mode: 'measure' }, manifest.trainingSeeds, action === 'measure');
  if (action === 'fit') {
    const proposal = fitCalibration(reports.flatMap((r) => r.samples));
    writeJson('proposal.json', proposal);
    console.log(proposal.calibration ? 'Ready for held-out validation.' : proposal.issues.join('\n'));
  }
} else {
  const { calibration, issues } = readJson<{ calibration: WagerCalibration | null; issues: string[] }>('proposal.json');
  if (!calibration) throw Error('Calibration needs review: ' + issues.join('; '));
  const setup = wagerSetupCopy({ mode: 'calibrated', calibration });
  if (existsSync(join(outputDir, 'validation-input.json'))) {
    if (JSON.stringify(readJson('validation-input.json')) !== JSON.stringify(calibration)) throw Error('The validation directory already contains runs for different calibration data.');
  } else writeJson('validation-input.json', calibration);
  const report = (['natural', 'low', 'middle'] as const).map((strategy) => {
    const games = runs(strategy, setup, manifest.heldOutSeeds, true);
    const seats = games.flatMap((game) => game.seats);
    const fourthAge = seats.filter((seat) => seat.enteredAgeIV);
    const choices = seats.flatMap((seat) => seat.picks.filter((pick) => pick.pick !== null));
    const picksByAge = ([2, 3, 4] as const).map((age) => ({
      age, marks: ([0, 1, 2] as const).map((mark) => {
        const picks = choices.filter((entry) => entry.age === age && entry.pick!.mark === mark);
        return { mark, picked: picks.length, paid: picks.filter((entry) => entry.reached.length > 0).length,
          paidAtPick: picks.filter((entry) => entry.paidAtPick).length };
      }),
    }));
    return { strategy, games: games.length, picksByAge, seeds: manifest.heldOutSeeds, seats: seats.length,
      reachedAgeIV: fourthAge.length, atDoorDuringObservedAgeIV: fourthAge.filter((s) => s.atDoorDuringAgeIV).length,
      ageIVCutShortByTurnLimit: fourthAge.filter((s) => !s.finishedAgeIV).length,
      ageIVWinners: fourthAge.filter((s) => s.won).length,
      unfinishedGames: games.filter((g) => g.winner === null).length,
      reach: heldOutReach(games.flatMap((g) => g.samples), calibration) };
  });
  writeJson('held-out.json', report);
}
