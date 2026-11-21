import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async file => JSON.parse(await readFile(file, 'utf8'));
const fixture = 'd4c94d9b86025e090e4cbada41453cae1277f5551d7375f79b1406d8cfdc6c96';
const [scenario, ...files] = process.argv.slice(2);
if (!['known-ground', 'dawnreach'].includes(scenario) || !files.length) {
  throw Error('Usage: node scripts/input-latency/check-yields.mjs known-ground ON_OFF.json OFF_ON.json | dawnreach REPORT.json [REPORT.json]');
}
const known = scenario === 'known-ground';
const actionsFile = known ? './turn120-actions.json' : './turn120-city-actions.json';
const expected = await load(new URL(actionsFile, import.meta.url));
const reports = await Promise.all(files.map(load));
const modes = reports.flatMap(report => report.runs.map(run => run.mode));
if (known) {
  assert.deepEqual(reports.map(report => report.runs.map(run => run.mode)), [['on','off'],['off','on']], 'Expected both matched pairs in forward and reverse order.');
} else {
  assert.deepEqual(modes.sort(), ['off','on'], 'Compare the Dawnreach route with bot preparation on and off.');
}

const total = { reads:0, cities:0, empires:0, clicks:0 };
for (const report of reports) {
  assert.equal(report.fixtureSha256, fixture, 'Wrong turn 120 snapshot.');
  assert.equal(report.fixtureKind, 'snapshot');
  if (known) assert.equal(report.usedFixedActions, true, 'The known-ground count requires fixed actions.');
  if (report.measuredFunctions !== undefined) {
    for (const name of ['readCity','readEmpire','readMeter','explainCity','explainEmpireLines']) {
      assert.ok(report.measuredFunctions.includes(name), `Missing diagnostic hook for ${name}.`);
    }
  }
  assert.deepEqual(report.actions, expected, 'Wrong input sequence for this count budget.');
  for (const run of report.runs) {
    const readsBefore = total.reads;
    assert.equal(run.environment.turn, 120);
    assert.equal(run.environment.seat, 0);
    assert.equal(run.environment.pixelRatio, 1.5);
    assert.deepEqual(run.interactions.map(event => event.expected), expected, 'Missing or different interaction in the capture.');
    for (const [i, event] of run.interactions.entries()) {
      const start = event.release.received, end = event.feedback;
      assert.ok(Number.isFinite(start) && Number.isFinite(end) && end >= start, 'Missing release or visible feedback.');
      const spans = event.spans.filter(span => span.start >= start && span.start < end);
      assert.ok(spans.some(span => span.name === 'endDrag'), 'Missing input handler trace.');
      const calls = name => spans.filter(span => span.name === name).length;
      const reads = calls('readCity') + calls('readEmpire') + calls('readMeter');
      const cities = calls('explainCity'), empires = calls('explainEmpireLines');
      total.reads += reads;
      total.cities += cities;
      total.empires += empires;
      total.clicks++;
      const label = `${scenario}, bots ${run.mode}, action ${i + 1} (${event.expected.kind} ${event.expected.unit})`;
      assert.equal(cities, 0, `${label} rebuilt ${cities} city breakdowns.`);
      assert.equal(empires, 0, `${label} rebuilt ${empires} empire breakdowns.`);
    }
    // Older captures lack the hook list. At least one economic reader must be present in each of those runs.
    if (report.measuredFunctions === undefined) assert.ok(total.reads > readsBefore, 'The capture contains no evidence of yield instrumentation.');
  }
}
console.log(`${scenario}: ${total.clicks} verified clicks, ${total.reads} economy reader calls, ${total.cities} fresh city and ${total.empires} fresh empire breakdowns.`);
