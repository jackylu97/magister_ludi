# Bot combat comparison, 22 November

The all-leader games, representative fight review and checks are complete.
The implementation plan is
[bot-combat-2026-11-22](../plans/bot-combat-2026-11-22.md).

## Baseline

- Rules version 262, commit `de26f9c8`.
- Rollback branch: `codex/bot-before-combat-262`.
- Five Standard maps, six seats each. Every selectable leader appears twice.
- The [schedule](bot-combat-schedule-2026-11-22.json) was fixed before results.
- Both sides include Claude's weaker-barbarian rules. Earlier version-260
  results are historical context, not the control group.
- Earlier AI settings remain unchanged. The ranking trial adds two controls:
  target removal value and counter-loss cost. This is not a new grid search.
- Complete recurring income includes empire-level payments. Measurements read
  the same totals as the HUD; they do not change the bot's valuation policy.
- Games and tests run serially. Elapsed game times include pauses for tests,
  so they are not a speed comparison.

## Evaluation priority

The user clarified that combat quality, including defense, is the primary
objective. Captures, economic outcomes and final score support that review.
Fewer captures can reflect stronger defense. Review actual encounters and the
pressure on each side before judging a policy.

## Decision after this comparison

Keep the opponent-attribution correction. It fixes a confirmed error and
removes an unsaved history from worker planning. Keep target ranking as a
candidate, not a proven overall improvement. Do not update the play server
with this batch yet. Review holding, counter risk and exposure after an advance
before promoting the combat policy.

The evidence includes better local target choices and defensive coordination.
It also finds real losses that the current attack score does not handle.
Lower capture counts alone are neither a success nor a regression.

## Supporting game outcomes

All fifteen games reached the turn-100 checkpoint without a driver warning.
No seat was eliminated. The ranked version's Sejong won one game on turn 100;
the other fourteen games had no winner by that checkpoint. No earlier sample
replaces a missing turn-100 result.

| Measure at turn 100 | Baseline | Peace correction | Ranked attacks |
| --- | ---: | ---: | ---: |
| Median total recurring income | 1,403 | 1,323 | 1,185 |
| Mean total recurring income | 2,053 | 2,703 | 2,545 |
| Seats with at least 800 income | 22 / 30 | 23 / 30 | 24 / 30 |
| Median official score | 1,036 | 1,040 | 1,012 |
| Mean technologies researched | 30.2 | 31.6 | 30.4 |
| Mean culture drafts | 20.0 | 21.6 | 20.7 |
| Unit losses | 498 | 444 | 456 |
| Cities captured and lost | 14 | 13 | 7 |
| Accepted peace offers | 20 | 9 | 10 |

The peace correction improves score for nineteen of thirty paired seats.
Ranking improves score for fifteen and income for thirteen compared with
the peace correction. The higher mean income and lower median reflect large
outliers. These are five maps with interacting opponents, not thirty
independent trials. The figures do not establish that the combat policy is
ready to ship.

Every leader's paired results, original first-changed attacks and selected
fight records are in the [evidence](bot-combat-evidence-2026-11-22.json).

## Changes under comparison

1. **Opponent-specific peace decisions.** Read saved `warLosses` rather than
   differences in global lifetime counters. Include only this opponent,
   this war and the retained recent-loss period. Unit and town captures count
   separately. Barbarian and third-party losses no longer trigger acceptance.
   A worker copy or loaded save sees the same records. The feed names the
   condition that caused acceptance.
2. **Ranked attacks.** Compare all visible legal targets, across barbarians
   and rival empires. Preserve the existing eligibility rules. Score damage,
   finishing attacks, certain captures and the immediate counter forecast.
   Preserve map-order ties and show every candidate in the spectator.
3. **Effective range.** Use `attackRange` in combat validation, target search,
   finishing checks and siege approach. The earlier search missed Mechanics'
   range bonus for the siege line.

## Limits

- The wider warscore still uses lifetime totals. Only the recent exchange is
  now opponent-specific.
- The ranking trial does not forecast attacks from other enemies next turn.
- It does not yet compare attacking now against moving to better terrain or
  holding position. Ranged coordination and army composition remain separate.
- Camp appraisal still assumes a raid on every muster and ignores the new
  attack-radius limit. That needs a separate change and comparison.
- Two starts per leader can expose problems, but cannot isolate leader balance.
  A conquered seat's low income is not by itself evidence of poor economic play.

## Review of actual fights

Seed 48017 gives a contested front between Mehmed and Mansa, plus fights with
Pachacuti and barbarians. Review all fights on that map in each version. This
is one representative map, not an independent measure of every leader.

The recorder replays accepted commands. Normal attacks omit their outcome
from `CommandResult`, so it obtains that outcome from `applyCombat` on a private
copy at the same RNG position. The real replay still uses `applyCommand`.
It checks the attack count against the command log and compares every final
state byte with the normal save loader. End-turn outcomes come from the
reducer's report. Their pre-fight terrain is not reconstructed from an earlier
phase. Nearby units in the audit are an observer's view, not proof of what the
bot could see on its frozen planning board.

| Measure on seed 48017 | Baseline | Peace correction | Ranked attacks |
| --- | ---: | ---: | ---: |
| Attacks by the six empires | 660 | 472 | 541 |
| Ranged attacks | 460 | 359 | 396 |
| Immediate counterattack deaths | 0 | 0 | 2 |
| Melee advances after combat | 102 | 66 | 75 |
| Advancing attacker killed by the next turn | 16 | 11 | 9 |
| Civilian captures and trade plunders suffered in combat | 23 | 12 | 17 |

These counts describe different wars after the first changed decision. More
shots do not by themselves mean better ranged play. An advance followed by a
loss can be a useful sacrifice. Check the individual fight before classifying
it. The next-turn count includes later combat deaths, not disbanding. The
civilian count includes captures after an escort dies, but excludes ordinary
movement captures and soldiers converted by a card effect.

### A better target before the games diverge

In the peace-correction and ranked versions, the first 1,454 commands on
seed 48017 are identical. On turn 50, Mansa's 52-health warrior can attack a
full-health barbarian spearman or a 25-health barbarian warrior.

- The previous search chooses the spearman: forecast 31 dealt and 29 taken.
- The ranked search chooses the warrior: forecast 25 dealt and 27 taken,
  removing the target at the midpoint roll.

The recorded attack kills the warrior and takes 22 damage. Its advance clears
the camp and recovers a worker. The camp pays 25 gold and 25 food; the food
grows Timbuktu to seven population. This is a useful military and civilian
outcome on the same initial position, not just a larger score.

Both choices come from the original games. This is a cleaner test of target
selection than comparing their much later city counts. It still does not
compare attacking with staying fortified.

The first changed command is an attack in all five paired games. Two now
finish a wounded target. The other three prefer a larger raw damage exchange.
That last choice needs a stronger value model: on seed 72839, Alexander's
bowman changes from 31 damage to a swordsman to 45 damage to a warrior.
More damage to a weaker unit is not automatically better than reducing the
stronger unit's health. Target threat and replacement cost are not in this
ranking yet.

### Army size is not useful force by itself

On seed 48017, Mehmed ends with 103 military units in the baseline, 86 with
the peace correction and 98 with ranking. None of the three `unitsGained`
records contains a siege unit. The ranked roster includes 56 legionaries and
18 composite bowmen. Upgrades change the type of an existing unit, so a large
late roster does not mean those unit types were all trained directly.

This is a reason to inspect siege recruitment and army use, not to raise the
overall military preference. Large armies can still lack the tools or firing
positions needed to take a defended city.

### Defensive coordination already works in some fights

In the baseline game, Mehmed's swordsman captures a worker on turn 63 at
(32, 15). Mansa's archer deals 17 damage that turn and 16 on turn 64. After
the swordsman also attacks the city, Mansa's swordsman finishes its remaining
six health. That sequence combines ranged damage and a finishing melee attack.

The reverse front also exposes a problem. Mansa's 28-health swordsman captures
a worker on turn 61 at (32, 14). Mehmed's swordsman and bowman kill it on the
next turn. The capture costs no immediate health, but its destination is
dangerous. This is a case for reviewing the original planning information,
not proof that the bot could have avoided every later attack.

### Two failures need the next combat change

- Ranked version, turn 65, command 2658: Mansa's warrior has 37 health and
  attacks a barbarian spearman. The forecast gives 28 damage dealt and 32
  taken, with a maximum counter of 37. The warrior dies. Ranking subtracts
  the risk penalty but does not compare its negative result with holding.
- Ranked version, turn 94, command 5336: Mansa's 25-health swordsman attacks
  a 22-health barbarian legionary across a river. The forecast prints a
  maximum counter of 24, but the low attack roll leaves the defender alive.
  The counter deals 25 and kills the swordsman. The current forecast applies
  survival protection when a high attack roll *can* kill, before a kill is
  certain. The actual combat rule correctly protects only a killing blow.

The preview's optimistic display is intentional and has regression tests in
`combat.test.ts`. The bot should not treat that displayed maximum as an exact
safety bound. Add exact counter-risk information from the combat calculation
for the bot, while keeping the current UI presentation and combat rule separate.

The next change should compare holding with attacking and use a truthful
counter-risk bound. Then assess the landing tile after a melee kill or
capture. The current ranged positioning score also needs review: it counts
nearby friendly melee units and distance from an enemy, but does not prove
that a friendly unit blocks the enemy's route or that the bow has a shot.

## Validation

- Typecheck and production build passed.
- The full core suite passed: 572 files, 12,938 tests. The later test-only
  fixture change passed all seven tests in `aiCardStamp.test.ts`, including
  two new cases, and a second typecheck.
- All twelve tests in the four relevant slow files passed: war planning,
  card valuation, the standard digest and worker parity. This is not the
  whole slow tier or the `test:all` push gate.
- The first card-valuation run lacked active examples of spare-happiness
  bonuses and town-loss weariness relief. A controlled private position now
  covers both. The five-test slow file passed again without changing a bot
  rule, a digest or a coverage threshold.
- Both 120-turn digests reproduced their measured states. The pins changed
  for rules 261–262 and this bot policy, with the reason recorded beside them.
- The 60-turn worker run matched the page's commands and final state.
- All fifteen saved games reproduced the recorded economy and score metrics.
  All three full combat replays on seed 48017 matched the normal loader byte
  for byte. Diagnostic reads left the game state unchanged.

The candidate stays on `codex/bot-combat-262`. The play server on port 5199
is unchanged. `codex/bot-before-combat-262` preserves the starting commit.
