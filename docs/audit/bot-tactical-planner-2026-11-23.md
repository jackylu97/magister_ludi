# Shared combat planner

The user approved implementation of the
[combat research plan](bot-combat-research-2026-11-23.md). This work is isolated
on `codex/bot-position-262`. Port 5199 is unchanged. The stable runtime control
is `1b596864`; existing economy, production and diplomacy weights stay fixed.

The implementation and five-map experiment are complete. Keep `tactics.enabled`
at zero. The planner improves some combat results, but development is less
consistent and large battles cost much more to plan. It is not promoted as
the default policy.

## Implementation

- `src/ai/tactics/position.ts` constructs private positions. It uses the sim's
  reachable tiles, combat plan, damage curve and attack allowances.
- `assessment.ts` scores health, losses, captures, protection, healing and
  progress. Role weights distinguish melee, ranged, mounted and siege units.
  Damage and deaths are charged once across the sequence.
- `planner.ts` searches short local sequences. It compares holding, moving,
  attacking, moving before shooting, and movement after attacks when allowed.
  It executes one command and reads the actual result before deciding again.
- Enemy responses obey occupation, movement costs, remaining allowances and
  attack limits. A separate scenario gives enemies full allowances. These
  scenarios are compared, not added together. Two melee units cannot occupy
  the same approach to attack from it.
- The middle-damage sequence is also checked with low outgoing damage and
  high counter damage. These are scenarios, not probabilities. The planner
  does not inspect or advance the game's random stream.
- Projections include forced advances, fortification, kill healing, ranks and
  repeated-attack strength. Captures, civilian arrivals, camp clearing and
  conversions stop a sequence because they can change other systems.
- Required garrisons stay in place. Essential escorts and worker guards keep
  their existing job logic. The land combat planner leaves naval jobs alone.
- A frozen plan carries its local group origin. Execution checks nearby units,
  terrain, city facts, laws and relevant empire facts. A changed threat causes
  replanning. War Bonds includes the treasury in these dependencies.
- The spectator receives the same candidate scores and nested terms that the
  planner used, including the selected enemy response.

The new `tactics` block in `data/ai.json` controls the experiment. Its limits
and role weights also appear in the generated Arena panel. `enabled: 0`
selects the stable policy; `enabled: 1` selects the local planner. The old
branches remain as the control and for jobs outside this planner's scope.

## Cost controls

- Search limits count positions, units, move candidates, sequence depth and
  enemy replies. Clock time never changes a decision.
- The planner skips swap searches because this version does not select swaps.
  Ordinary movement still uses the shared pathfinding rules.
- The final comparison keeps an escape candidate for each participating unit.
  A group can order a unit other than the one that started the assessment, so
  preserving only that first unit's escape can discard another unit's safe move.
- Immutable projections can reuse ground indexes when city, player, map and
  ownership records are unchanged. They keep separate economy and movement
  caches. A city capture refuses this reuse.
- Identical remaining and full enemy allowances share one response search.
- A fortified archer's early interrupt checks nearby firing opportunities.
  Campaign and defense jobs handle more distant repositioning.
- Unrelated workers do not carry combat dependency records.
- `memo.ts` can reuse a local assessment after an unrelated order. It compares
  local dependencies, jobs, tuning and the economy stamp. The stamp rejects
  reuse when an economic change outside the local area could affect combat.
- Tactical moves stop on visible destinations. Removing hidden occupants from
  the search must not imply that an unseen destination is empty.

An original saved turn took 10,889 ms with the first prototype and 9,665 ms
after the movement and ground-cache changes. The commands were identical in
that comparison. After removing repeated distant-archer searches and duplicate
responses, the saved turn took 3,832 ms. That later comparison also includes
projection fixes, so it is not a claim of identical commands or a controlled
speed ratio. These measurements are headless turn planning, not rendering FPS.

On the revised pilot's saved turn 91, the dependency cache reduced planning
from 26,145 ms to 17,293 ms. The complete command sequence matched with the
cache bypassed. Local searches fell from 504 to 280; projected positions fell
from 32,033 to 18,003. This remains a significant late-game cost.

## Validation

The implementation checkpoint `a7abe4cc` passes typecheck, all 574 core files
with 12,986 tests, and the production build. That run includes 25 tactical
fixtures and 13 planned-combat tests, including the page/worker comparison.
Seven long checks also pass: the stable policy's 120-turn duel and standard
board replay pins, card-stamp checks, and the sixty-turn page/worker
comparison. The worker check produces the same command log and state on both
paths. No full slow-tier sweep or deployment is part of this checkpoint.

Focused fixtures cover uncertain kills, source-state and RNG isolation,
health caps before counters, captured wall health, repeated-attack strength,
experience, required garrisons, protected ranged shots, hidden units,
contested approaches and dependency invalidation. Further fixtures exercise
move-then-shoot, movement after attacking, conversions and worker parity.

The first long prototype was stopped because planning cost grew too quickly.
Its completed checkpoints end at turn 60. It is not a completed comparison.
The revised pilot completed seed 48017 through turn 100. Both it and the
stable control passed an exact combat replay. This pilot predates the visible
destination fix and the dependency cache. It is one map, not the all-leader
comparison.

| Observed result, all six seats | Stable control | Pilot |
| --- | ---: | ---: |
| Direct and automatic attacks | 549 | 702 |
| Ranged attacks | 401 | 524 |
| Advances | 76 | 87 |
| Advances followed by death by the next turn | 9 | 11 |
| Counterattack deaths | 0 | 1 |
| Observed fortified defenses | 59 | 128 |
| Observed defenses with terrain bonuses | 98 | 175 |
| Civilian losses | 26 | 16 |
| Losses to barbarians | 46 | 33 |
| City captures | 2 | 5 |

Mehmed captured five cities and eliminated Pachacuti. His score rose from
1,748 to 1,990 while his income fell from 1,670 to 1,213. Justinian's income
rose from 878 to 3,226 and his losses fell from 29 to 24. Nezahualcoyotl's
income rose from 267 to 851. These are outcomes of different games after the
first changed decisions, not isolated measurements of one tactic.

The pilot also exposed a refused move at turn 95. Legionary 578 tried to stop
at `(30, 20)`, a remembered but currently hidden tile occupied by warrior 621.
The visible-destination fix addresses that case without revealing the hidden
unit. The warning and original replay remain in the pilot artifacts.

The counterattack death was warrior 461 at turn 82, command 5040. It attacked
at 36 health; the counter range was 25 to 36. The sampled holding and retreat
alternatives had lower scores because of the surrounding fight. This remains
a case for reviewing retreat coverage, not proof that the sacrifice was good.

Artifacts are in `/private/tmp/webciv-bot-combat-2026-11-22`: `tactics-round2`,
`combat-quality-combat-facts-tactics-round2.json`, `inspect-refusal.jsonl` and
the paired `tactics-profile-cached` / `tactics-profile-uncached` reports.
The uncached profile bypasses only `cachedTacticalPlan` in a frozen diagnostic
bundle. It does not change the planner, its limits or its weights.

## First corrected game and retreat review

Checkpoint `a7abe4cc` completed seed 72839 in 506 seconds and passed exact
combat replay. It logged no refused commands. Deaths after advances fell from
8 of 57 to 5 of 92. Losses to barbarians fell from 54 to 35. Captures rose from
1 to 5, but mean income fell from 2,506 to 2,032 and total unit losses rose
from 65 to 96. This is a mixed result, not evidence for promotion.

The review captured the original private planning board for spearman 554 at
turn 68, command 3342. The complete command prefix matched. Reassessing that
board reproduced the selected attack and its scores. The unit had no legal
ordinary move destinations. The full movement query did offer a swap with
swordsman 61 at `(33, 21)`, which this planner does not search. The missing
ordinary retreat was not a discarded safe move. The planner preferred damage before death over
holding under a projected lethal archer reply. That does not establish that
the sacrifice was best across all possible responses. This is a concrete
case for adding swaps and checking replacement garrisons before promotion.

The review did identify a separate shortlist defect: only the assessment's
first unit kept an escape candidate. A group can order any of its units, so
the final comparison must retain escapes for the others too. A focused
fixture failed under the earlier code and passes with that change. It uses
a fixed guard and a wounded ally with a safe retreat. All 26 tactical tests
and 13 planned-combat tests pass after the correction. The correction also
passes typecheck, the production build, and all 574 core files with 12,987 tests.

The remaining `a7abe4cc` games were stopped during seed 48017. Its partial
output is not a completed game. The completed seed and the captured decision
remain under `tactics-shared` and `tactics-spearman554` in the artifact folder.

## Completed five-map comparison

The policy checkpoint is `6de2429f`. The
[evidence file](bot-tactical-evidence-2026-11-23.json) contains all thirty paired
seats, the fifteen-leader coverage check, counters, timings and input hashes.
Every leader appears twice on the unchanged
[five-map schedule](bot-combat-schedule-2026-11-22.json). These are the same
maps used in earlier iterations, not a new holdout sample. All six seats use
the same policy in each game; this is not a head-to-head tournament.

All five games passed exact combat replay and reported no live-driver
warnings. Frozen plans still reject changed positions before dispatch. For
example, seed 67153 cut and replanned 217 times because local combat facts
changed. Its preflight checks also refused eleven planned commands. These
are safe plan corrections, not eleven rejected commands in the saved game.

Qin won seed 39827 on turn 93. The control had no winner through turn 100.
For this pair, the control was rerun to turn 93. Its complete 5,954-command
prefix matched the original control, and its combat replay passed. The table
below uses turn 93 for both sides of that pair and turn 100 for the others.

| Result across thirty matched seats | Control | Local planner |
| --- | ---: | ---: |
| Losses to barbarians | 244 | 148 |
| City captures | 8 | 11 |
| Advances followed by death by the next turn | 31 / 333 (9.3%) | 36 / 465 (7.7%) |
| Total unit losses | 383 | 475 |
| Civilian losses in combat and arrivals | 74 | 75 |
| Deaths to an immediate counterattack | 0 | 2 |
| Mean researched nodes | 30.37 | 29.57 |
| Mean Order drafts | 20.43 | 20.90 |
| Median score | 1,011 | 961 |
| Mean score | 1,365 | 1,519 |

The planner fights more often. Total attacks rise from 1,945 to 2,909. The
advance-loss rate improves, but the number of deaths after advances rises.
The better barbarian result does not establish equally good defense against
other civilizations. More captures and a higher mean score are not sufficient
to call this a stronger general policy.

The turn-100 benchmark excludes the early-finished pair from both sides. It
therefore covers twenty-four seats on four maps:

| Turn-100 development | Control | Local planner |
| --- | ---: | ---: |
| Seats with at least 800 combined recurring yields | 20 / 24 | 14 / 24 |
| Median combined recurring yields | 1,300 | 1,145 |
| Mean combined recurring yields | 2,459 | 2,054 |
| Mean researched nodes | 30.71 | 29.25 |
| Mean Order drafts | 20.25 | 20.25 |

Qin's early win is a useful result, but it is separate from that benchmark.
His 27,761 yields at turn 93 also make the mean across all final observations
look much better than the median. Different wars and card histories contribute
to these differences. The comparison does not isolate a change in economic
valuation or establish a new content balance verdict.

## Cost and exact-result optimization

These are headless game durations, including planning, simulation and audit
capture. They are not rendering FPS or controlled per-operation speed ratios.

| Seed | Last completed turn | Planner duration |
| --- | ---: | ---: |
| 72839 | 100 | 571 seconds |
| 48017 | 100 | 744 seconds |
| 85211 | 100 | 232 seconds |
| 39827 | 93 | 428 seconds |
| 67153 | 100 | 1,537 seconds |

The largest case made 36,670 local searches, 2,546,853 friendly projections
and 2,091,429 combat forecasts. Genghis ended with 156 military units and four
captures. The configured position limit bounded each friendly search; it did
not make repeated searches across a large army cheap.

After the cohort, the scorer gained one exact-result shortcut: if a projection
keeps the original city array, no city changed and the city score needs no
walk. If the array changed, unchanged city records still need no comparison.
This uses the projection's existing immutable records and adds no new cache.

A saved late turn was measured in before/after/after/before order. The two
control runs took 17,981 and 18,003 ms; the shortcut took 17,445 and 17,761 ms.
That is about a 2.2% mean saving in this fixture. All 237 query results, the
complete final state and the search counters matched. This small optimization
does not resolve the large-battle cost. The five-map policy results above
come from the frozen checkpoint before this shortcut.

The final source, including the shortcut, passes typecheck, the production
build, and all 574 core files with 12,987 tests. No full slow-tier sweep or
deployment was performed for this experiment.

## Work needed before promotion

1. Add swaps and allow one unit to replace another in a required garrison.
   Two recorded counterattack deaths have no ordinary visible move available,
   but do have legal swaps on the actual pre-command board. Legionary 404 at
   turn 94 on seed 48017 has seven swaps; legionary 204 at turn 92 on seed
   67153 has three. Several replacement units have full health. This is a
   missing option to assess, not proof every swap is safe.
2. Reduce repeated local searches and enemy-response work. The expensive
   case needs an engagement-entry and reuse review before a larger budget.
   Keep deterministic work limits; do not let machine speed choose an action.
3. Review weak defensive games and the conservative reply assumptions.
   A lower local score must not force a sacrifice merely because a useful
   retreat, rotation or support action was omitted from the shortlist.
4. Compare mixed old/new seats and additional maps after those corrections.
   Keep the previous economy and production weights fixed until the combat
   effects are understood.

## Limits

- This is a bounded local search, not an exhaustive combat solver. It keeps
  only some visible enemies, nearby friendly units and move destinations.
- Enemy responses are greedy sequences. They can miss a combination whose
  first attack looks bad alone. Full allowances are a conservative next
  opportunity, not an exact model of simultaneous turn timing.
- The reply grants enemies sight of the friendly targets in the assessment.
  This avoids reading hidden enemy spotters, but can overstate their firing
  opportunities. It is a conservative information assumption, not an exact
  reconstruction of enemy sight after every projected move.
- Unit value uses relative combat strength and role weights. It does not yet
  price production replacement time or the scarcity of a particular unit.
- Economic rewards from fighting are not fully simulated inside a sequence.
  The real command resolves them before the next decision. Rank strength and
  kill healing are included; a new rank's wider economic rewards are not.
- The search does not model hidden reinforcements, sea combat, unit swaps or
  several turns of a siege. Strategic objectives still come from the existing
  job planner.
- More captures, fewer losses or higher income alone cannot establish better
  combat. Review the original decisions and actual fights before promotion.
