# Planned combat targets, 22 November

This candidate starts at `379aab0b`, after the
[counter-risk review](bot-counter-risk-2026-11-22.md). It is on
`codex/bot-combat-target-262`. The focused checks, all-leader games, replay
reviews and final tests passed. Port 5199 is unchanged.
The earlier AI preference values and five-map leader schedule stay fixed.

## Recorded failure

On seed 48017, Mansa's warrior planned to finish a barbarian spearman on one
health. Mehmed acted first, killed that spearman and advanced a swordsman onto
the tile. The planned attack still named a legal coordinate, so the bot sent
it against the new defender. The warrior died to the counterattack.

The original private planning capture matched the game's complete accepted
command prefix. This was a changed unit from a different empire, not a small
change in a damage roll. The case is command 2171 on turn 60 in the earlier
review's evidence.

## Candidate

Each planned attack records the selected defender's unit or city id, owner,
siege phase and both combatants' health and strength. The applier checks those
facts again before dispatch. It
uses the simulation's own target selection, including civilians and city
attacks. New entity ids use the same mapping as planned commands.

If the target is unavailable or changed, the unused plan stops. The existing
live decision loop continues with accepted commands, budgets and sitting
marks preserved. The stale attack never reaches the reducer. Worker plans,
ordinary play and the spectator share this applier.

This is a targeted check. It does not invalidate a plan solely because an
unrelated bank or city changes. It does not assess threats around an advance.
Position choice remains a distinct question. The simulation rules, RNG and
save version are unchanged.

`botEconomyAudit.ts` now records the existing planning counters so the review
can count replans. `botCombatTargetRegression.ts` checks the recorded failure
against the original private board and the command-only live replay. It must
stop the attack without dispatch or mutation.

## The target-only trial

The first version checked identity, owner and siege phase. It passed all 106
focused tests and stopped the recorded turn-60 failure without mutation. Its
new seed-48017 game matched the first 2,171 commands, then fortified instead
of attacking the swordsman. It completed turn 100 without warnings and its
complete combat replay matched the normal loader.

The next turn exposed stale health. The warrior planned with 61 health, then
Mehmed's attack left it on one health. It still attacked a barbarian spearman
whose identity had not changed, and died to the counter. On turn 71, another
swordsman planned with seventy health and attacked with one left. The original
private planning captures reproduced both decisions and matched the complete
accepted command prefixes. These cases justify checking health as well as
identity. Strength is the other direct exchange input read from the same
shared forecast.

The target-only game has two counterattack deaths, compared with one in the
counter-guard game. It has eleven advances followed by death, against thirteen,
and 33 civilian captures or trade plunders suffered in combat, against 28.
The four city captures, against two, do not establish better combat. Keep this
trial separate from the broader combat-facts check.

It stopped 23 plans at an attack: three changed targets and twenty unavailable
attacks. The latter replace the existing reducer-refusal fallback. The first
accepted-command difference remains the proven replaced-defender case.

## The combat-facts trial: first game

The broader check also completed seed 48017 through turn 100 without warnings.
Its full combat replay matched the normal loader. Against the counter-guard
control, it has zero immediate counterattack deaths instead of one, nine
advances followed by death instead of thirteen, and 26 civilian captures or
trade plunders suffered in combat instead of 28. Both have two city captures.
There are 549 attacks, including 401 ranged attacks. These are encouraging
figures from one changed game, not an all-leader conclusion.

The versions share the first 2,078 commands. On turn 59, Mansa's warrior had
planned with full health. Mehmed then dealt 53 damage before its command.
The control still attacked a fortified barbarian spearman: it dealt 25,
took forty and fell to the spearman's later attack that turn.

The new check notices the warrior's remaining 47 health. Its fresh decision
rejects the risky attack and fortifies. It survives the spearman's attack,
then dies to Mehmed on the next turn, dealing twenty damage in return.
This delays the loss and requires another enemy attack. It does not save the
unit permanently, or establish that holding was the best possible position.

The game stops 49 plans at an attack: 34 for changed health or strength,
two for changed targets and thirteen for unavailable attacks. There are six
seats and one hundred turns. These are bounded combat checks, not a plan
invalidation after every state revision.

## All-leader results

All five games completed the turn-100 checkpoint without warnings, winners
or eliminated seats. Every selectable leader played twice. The comparison
keeps all thirty seats, including cities lost in war.

| Measure at turn 100 | Counter guard | Combat facts |
| --- | ---: | ---: |
| Mean recurring income | 2,653.29 | 3,046.68 |
| Median recurring income | 1,144.54 | 1,384.15 |
| Seats with at least 800 income | 23 | 25 |
| Mean score | 1,413.23 | 1,497.13 |
| Median score | 1,023 | 1,041 |
| Mean researched technologies | 30.73 | 31.13 |
| Mean culture drafts | 20.77 | 21.20 |
| City captures | 7 | 8 |
| Recorded unit losses | 440 | 390 |
| Mean fielded military units | 38.37 | 43.17 |

Income improves in 21 seats and score in twenty. The median paired income
change is +161.22. Large Qin and Sejong economies affect the averages; the
[balance watchlist](balance-watchlist-2026-11-22.md) retains each start's
context. Army size increases. This change does not establish lower unit
production, and it does not change the recruitment preferences.

The first accepted-command differences occur on turns 65, 59, 84, 65 and 55
on seeds 72839, 48017, 85211, 39827 and 67153. Later worlds differ in combat,
random draws and economic choices. The original failures and their fresh
decisions are stronger evidence for the narrow correction than the totals.
All five combat replays and final metric replays match. The observers leave
the replayed simulation unchanged.

## Actual combat quality

The objective is useful fighting on attack and defense. In games where all
seats use the same policy, one seat's city capture is another seat's loss.
More captures alone do not establish a stronger policy.

| Actual fights through turn 100 | Counter guard | Combat facts |
| --- | ---: | ---: |
| Attacks | 2,012 | 1,980 |
| Ranged attacks | 1,329 | 1,320 |
| Immediate counterattack deaths | 1 | 0 |
| Advances after combat | 345 | 340 |
| Advances followed by death by the next turn | 62 | 31 |
| Civilian captures or trade plunders suffered in combat | 81 | 74 |
| Unit deaths in fights with barbarians | 264 | 251 |
| Direct defenses with a fortification bonus | 99 | 124 |
| Direct defenses with a terrain bonus | 229 | 208 |

The advance-loss rate falls from 18.0% to 9.1%, with nearly the same number
of advances. Ranged attacks remain about two thirds of attacks. Fortification
use increases, but recorded terrain use decreases. These are useful signals,
not a claim that every position improved. Fortification and terrain counts
cover direct attacks with an exact pre-fight board. They exclude automatic
end-turn attacks. Civilian counts include combat arrivals behind an escort;
they do not count captures from ordinary movement.

The combat check stops 189 plans across 3,000 seat-turns: 133 for health or
strength, eleven for a changed defender or siege phase, and 45 for an
unavailable attack. The existing live loop resumes each stopped plan.
Unavailable attacks previously reached the reducer's refusal path. This is
not a global invalidation after each state change.

### Defense at Raqqa

On seed 67153, turns 84–85, Harun's bowman fires from Raqqa while spearman
705 holds beside the city. The bowman deals nineteen damage to Mehmed's war
chariot. The chariot attacks the fortified spearman, deals twenty and takes
39. On the next turn the bowman deals another 24 without taking damage.
The spearman and bowman survive that exchange. The original bowman's
decision describes firing from its defensive position.

This is the desired combination of a melee defender and ranged damage.
It demonstrates actual behavior in the new game. It does not prove this
small guard introduced that tactic; the world has already diverged from
the control by then. Harun still loses two cities in this game.

### A loss that needs context

On seed 39827, turn 72, Qin's swordsman 373 finishes a nine-health barbarian
swordsman, clears its camp and receives food and gold. It takes 36 counter
damage, then another 25 defending against swordsman 579. On turn 73 it
attacks again, dealing 36 and taking 33. The barbarian's next attack kills
it but takes thirty counter damage. Qin's unit dealt 99 damage to that second
swordsman across their exchanges. The barbarian then dies attacking another
Qin defender on turn 74.

The first attack appears in the advance-loss count. Counting it as a wasted
unit would omit the camp reward, removed defender and damage to the second
attacker. The original decisions show that the bot valued the immediate kill
and the later favorable damage exchange. They do not compare those choices
with a safe retreat or sustained ranged support. This remains a useful case
for the next position review, not proof that this attack should be banned.

## Remaining combat questions

- Compare the actual landing tile after a move or capture with visible enemy
  attacks. The current check does not assess the surrounding threat.
- Compare retreat, fortification and a useful final attack. Retreat toward a
  home city can still end on an exposed tile.
- Protect ranged units and civilians with positions that block enemy movement.
  A nearby friendly melee unit alone does not prove protection.
- Review target threat, replacement cost and army composition. Do not change
  the fixed preference values during these structural comparisons.

## Completed checks

- Typecheck and all 109 focused tests passed. They cover target replacement,
  health and strength changes, siege phases, valid targets, id mapping and
  completion through the live decision loop.
- All three recorded failures stop before dispatch and leave both boards
  unchanged. The [evidence file](bot-combat-targets-evidence-2026-11-22.json)
  includes their original decisions, private unit facts and actual outcomes.
- The fixed all-leader games and comparison are complete.
- All five final metric replays and combat replays match. Original decisions
  and actual defense and loss sequences are included in the evidence file.
- Both six-seat, 120-turn digest games complete without warnings or stalls
  and replay exactly. The reviewed pins are `31b35234:419471` for duel and
  `5539315b:1102660` for standard.
- Final typecheck, all 573 core files with 12,957 tests, and build passed.
  The build reports its existing large-chunk warning.
- Both long war/worker files passed, with six tests. The worker check compares
  every accepted command and state across sixty turns, then checks diplomacy
  and Great Person choices. The two 120-turn digest games above use the same
  existing helper as the digest tests; the standard game was not run twice.
- All heavy checks ran serially. No full `test:all` push gate or deployment
  has run. The policy remains separate from `main`, `decks` and port 5199.

## Checkpoint

Keep this correction as the starting point for the next position experiment.
The earlier counter-risk checkpoint is `379aab0b`; its validation-only update
is `0ded129c`. The full pre-combat baseline remains at
`codex/bot-before-combat-262` (`de26f9c8`). These commits allow each policy
change to be compared or reverted without changing unrelated gameplay work.
