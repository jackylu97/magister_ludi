import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { exclusiveTimes, instrument, summarizeInteraction, timings } from './instrument.mjs';

// The diagnostic must fail if a measured function has moved. Verify that its
// transformed copies still parse using the project's normal TypeScript version.
const root = new URL('../../', import.meta.url);
for (const file of [...Object.keys(timings), 'src/ui/bot.worker.ts']) {
  const source = await readFile(new URL(file, root), 'utf8');
  const measured = instrument(source,file);
  const parsed = ts.createSourceFile(file,measured,ts.ScriptTarget.Latest,true);
  assert.deepEqual(parsed.parseDiagnostics.map(d => d.messageText),[]);
}
assert.equal(instrument('console.log(1);','unrelated.ts'),undefined);
const spans = [
  {group:'controls',depth:0,start:5,end:15},
  {group:'reducer',depth:1,start:6,end:13},
  {group:'route',depth:2,start:7,end:10},
  {group:'HUD',depth:0,start:18,end:22},
];
assert.deepEqual(exclusiveTimes(spans,6,20),{reducer:4,route:3,controls:2,HUD:2});
assert.deepEqual(exclusiveTimes(spans,22,24),{});
const sample = { press: {created:1, received:2}, release:{created:5, received:6}, feedback:20, spans };
const jobs = [{id:1, posted:4, postFinished:7, worker:[7,23], reply:25, status:'driven'}, {id:2, posted:19, postFinished:19.5}];
const report = summarizeInteraction(sample, jobs, [17, 22]);
assert.deepEqual(report.ms.duringReleaseQueue, {controls:1});
assert.equal(report.ms.unattributed, 3);
assert.equal(report.ms.nextCompositorEventAfterDraw, 2);
assert.equal(report.botOverlap[0].mainThreadPostDuringReleaseQueueMs, 1);
assert.equal(report.botOverlap[0].confirmedCoordinatorMs, 13);
assert.equal(report.botOverlap[1].confirmedCoordinatorMs, null);
assert.equal(summarizeInteraction(sample, [], []).ms.nextCompositorEventAfterDraw, null);
console.log('All timing hooks parse. Nested phases, input queues and overlapping worker windows pass.');
