# Shared combat planner

The user approved implementation of the
[combat research plan](bot-combat-research-2026-11-23.md). This work is isolated
on `codex/bot-position-262`. Port 5199 is unchanged. The stable runtime control
is `1b596864`; existing economy, production and diplomacy weights stay fixed.

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

## Validation in progress

The implementation checkpoint passes typecheck, all 574 core files with
12,986 tests, and the production build. The core run includes 25 tactical
fixtures and 13 planned-combat tests, including the page/worker comparison.
The stable policy's long replay pins and sixty-turn worker comparison are
checked separately. No full slow-tier sweep or deployment is part of this
checkpoint.

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

## Limits

- This is a bounded local search, not an exhaustive combat solver. It keeps
  only some visible enemies, nearby friendly units and move destinations.
- Enemy responses are greedy sequences. They can miss a combination whose
  first attack looks bad alone. Full allowances are a conservative next
  opportunity, not an exact model of simultaneous turn timing.
- Economic rewards from fighting are not fully simulated inside a sequence.
  The real command resolves them before the next decision. Rank strength and
  kill healing are included; a new rank's wider economic rewards are not.
- The search does not model hidden reinforcements, sea combat, unit swaps or
  several turns of a siege. Strategic objectives still come from the existing
  job planner.
- More captures, fewer losses or higher income alone cannot establish better
  combat. Review the original decisions and actual fights before promotion.
