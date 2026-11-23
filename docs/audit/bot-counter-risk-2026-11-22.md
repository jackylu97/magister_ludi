# Bot counterattack risk, 22 November

This follows the [combat comparison](bot-combat-results-2026-11-22.md).
The starting candidate is `8d9927e6`, on rules version 262. The all-leader
comparison is complete. The final checks are in progress. Port 5199 is unchanged.

## Problem

The UI intentionally protects its forecast's attacker when a high attack roll
can kill the defender. The actual fight protects only an attack that kills.
The bot had treated the displayed maximum counter as a safety bound.
The earlier fight review found two deaths that the next decision rule must
handle: an acknowledged lethal counter, and an uncertain finishing attack
whose displayed counter appeared safe.

## Candidate

- `previewCombatRisk` reuses the combat plan without consuming randomness.
  Its worst counter uses the weakest attack roll. It preserves the attacker's
  last health only if that attack still kills. The UI preview and combat
  resolution are unchanged.
- The midpoint uses midpoint rolls on both sides. It is not a statistical
  expected value. The bounds describe the immediate counter, not later attacks.
- Healing and withdrawal no longer yield to a possible finishing attack when
  the counter can kill the attacker.
- If the maximum counter can kill and the risk penalty makes the attack's
  score negative, the bot can hold. A refusal stops the later campaign and
  camp marches, including when a fortified unit needs no new order.
- Deliberate nonfatal siege trades remain allowed. The candidate preserves
  the previous ranking among safe targets and every existing preference value.
- Original unit decisions now have their accepted command's log index. The
  recorder keeps their reasoning, including the planning health and maximum
  counter. A later replay need not invent what the bot believed.

## First trial and correction

The first trial also added the existing siege allowance to target scores.
That changed an unrelated choice on turn 43 of seed 48017, before either
counter-risk failure from the earlier review.

Both versions began with the same 1,007 commands. Mehmed's 53-health warrior
then had two attacks:

- Ranked attacks finished a five-health barbarian spearman. It took 40 damage,
  advanced into the forest and died to Pachacuti's archer later that turn.
- The allowance trial attacked Pachacuti's full-health archer. It dealt 25,
  took 34 and stayed in place. Pachacuti's warrior killed it later that turn,
  taking 33 damage in return.

Both attacks survived their immediate counter. The changed target does not
isolate the effect of better counter-risk information. The next candidate
therefore keeps the safe-target ranking and tests the narrower risk guard.
The first trial remains recorded as `counter-risk`; the narrower candidate
is `counter-guard`.

The first trial reached turn 100 without warnings, and its full combat replay
matched the normal loader. Across its six empires:

| Measure on seed 48017 | Ranked attacks | Allowance trial |
| --- | ---: | ---: |
| Attacks | 541 | 500 |
| Ranged attacks | 396 | 359 |
| Immediate counterattack deaths | 2 | 0 |
| Melee advances | 75 | 73 |
| Advancing attacker killed by next turn | 9 | 6 |
| Civilian captures and trade plunders suffered in combat | 17 | 27 |
| Total unit losses recorded by the game | 118 | 90 |
| City captures | 3 | 4 |

These are different wars after the first changed decision. The lower unit
loss count does not establish better defense, especially with more civilian
losses. Do not promote a policy from these totals alone.

## All-leader results for the narrower candidate

Both versions used the same five Standard maps, six seats per map and fixed
AI settings. Every selectable leader played twice. All games completed the
turn-100 checkpoint without warnings or eliminated seats. Sejong won one
ranked-attacks game at that checkpoint; the narrower candidate had no winner.

| Measure at turn 100, thirty seats | Ranked attacks | Counter guard |
| --- | ---: | ---: |
| Mean recurring income | 2,544.62 | 2,653.29 |
| Median recurring income | 1,185.28 | 1,144.54 |
| Seats with at least 800 recurring income | 24 | 23 |
| Mean score | 1,382.20 | 1,413.23 |
| Median score | 1,012 | 1,023 |
| Mean researched technologies | 30.43 | 30.73 |
| Mean culture drafts | 20.67 | 20.77 |
| City captures | 7 | 7 |
| Total unit losses recorded by the game | 456 | 440 |

Income increased in nine seats, stayed equal in six and fell in fifteen.
Score increased in eleven seats. The median paired income change was -4.54.
These figures do not establish a general improvement. Later differences in
war, income and card choices follow the changed decisions.

The first changed commands occur on turns 58, 46, 67 and 49 on seeds 72839,
48017, 85211 and 39827. The candidate fortifies instead of attacking in three
of these cases, and retreats in the other. Seed 67153 keeps all 6,833 commands.
The shared prefixes isolate the first policy change, not its later effects.

The full combat replay review now covers both versions on all five maps.
All ten replays match the normal loader's complete final state.

| Actual combat events, thirty seats | Ranked attacks | Counter guard |
| --- | ---: | ---: |
| Attacks | 2,194 | 2,012 |
| Ranged attacks | 1,461 | 1,329 |
| Immediate counterattack deaths | 8 | 1 |
| Melee advances | 350 | 345 |
| Advancing attacker killed by next turn | 61 | 62 |
| Civilian captures and trade plunders suffered in combat | 73 | 81 |
| Defenses with a known fortification bonus | 89 | 99 |
| Defenses with a known terrain bonus | 260 | 229 |

The counter check addresses its narrow failure. It does not establish better
overall combat. Later attacks kill far more advancing units than immediate
counters do. The unchanged capture total is neutral evidence; defense is part
of the objective. Fewer attacks and fewer recorded unit losses can also follow
less fighting, rather than better choices within each fight.

The detailed seed-48017 review gives a stronger warning than the lower loss
total. Against ranked attacks, the narrower candidate reduces direct
counterattack deaths from two to one, but advancing attackers lost by the
next turn rise from nine to thirteen. Civilian captures and trade plunders
suffered in combat rise from seventeen to twenty-eight. The replay contains
511 empire attacks, including 366 ranged attacks and 76 melee advances.
It matches the normal save loader exactly. Movement-only captures are outside
the civilian count; automatic battles do not have exact pre-fight terrain
readings in this diagnostic.

Seed 67153 illustrates the position question without a policy difference:
both versions send exactly the same commands. On turns 83–84, Harun and
Mehmed repeatedly occupy (53, 35) after finishing wounded swordsmen. Harun's
full-health swordsman kills a target on three health and takes 35 damage.
Two ranged attacks then deal 51, and a melee finish takes its remaining
fourteen health. That attacker advances and dies on the next turn. Its killer
also advances and dies to ranged fire. These are actual exchanges, not proof
that every advance was a mistake. A position review must compare the trade's
purpose and alternatives on the original planning boards. The evidence file
keeps the intervening attacks as well as the finishing blows.

## The narrower trial exposes unsafe retreat

On seed 48017, the narrower candidate preserves the first 1,200 commands.
The first difference is Pachacuti's warrior on turn 46. It has thirteen health.
Its attack on a spearman would deal 37 at the midpoint, but only 33 at the low
roll against 37 health. The UI shows at most twelve counter damage. The risk
reading correctly includes thirteen, enough to kill the attacker.

The original decision in the narrower game orders a retreat toward Cusco.
The actual move stops at (21, 26), still beside that spearman. It attacks later
that turn and kills the warrior. In the ranked game, the warrior instead kills
the spearman, advances with one health, and dies to a different spearman. That
attack at least removes one enemy and damages the next.

This is a worse observed result for the retreat, not evidence that its death
was unavoidable. `botCombatDecisionCapture.ts` reproduced the original private
board and matched the complete accepted command prefix. The warrior had two
movement points. The bounded follow-up check found three non-swap options:
fortify, move west onto hills or move east onto hills. Each allowed a lethal
attack by an enemy already visible to the bot. The chosen route took the west
option. The check uses full enemy movement and independent attacks; it does
not establish that every possible response ends in death. It does establish
that heading home is not a safety test.

The code explains the missing comparison. `fallBackAndHeal` chooses a reachable
route toward a nearby city. It does not assess enemy attacks on the hex where
the unit will stop this turn. Healing and retreat run before attack selection,
so they can prevent the bot from comparing the alternatives together.

The [recorded evidence](bot-counter-risk-evidence-2026-11-22.json) contains the
actual fights and the original retreat explanation. It also contains the first
trial's separate results; do not combine the two candidate versions.

## A legal attack can have a stale target

The narrower game's remaining counterattack death is Mansa's warrior on
turn 60, command 2171. The original plan forecasts a finishing attack against
one health, with at most 39 counter damage against its own 51 health.
At execution, the target is Mehmed's 42-health swordsman. The actual attack
deals thirteen and takes 51, killing the warrior.

The private-board capture matched the complete accepted command prefix. The
planned defender was barbarian spearman 278, on one health at (30, 11).
Mehmed's swordsman 149 was still at (30, 12), on 59 health. It killed the
spearman and advanced before Mansa's command executed. The same coordinate
therefore named a different unit from a different empire.

`applyNextStep` checks offers, entity-id mappings and command legality. It does
not check whether an attack still faces the defender and health its plan used.
It counts different combat and movement outcomes, but continues the plan until
a later command is refused. A changed fight can remain legal and still be a
bad attack. The original board establishes a replaced defender in this case.

Checking combat assumptions before dispatch is a separate priority from
counter-risk valuation. Raising the risk penalty cannot fix a decision that
uses an outdated target.

## Scope still missing

The risk guard does not evaluate the landing tile after a kill or capture.
It does not assess whether holding is safe against other visible enemies.
A finishing attack can therefore survive its counter and still lose the
attacker to follow-up fire. Target threat, replacement cost, useful ranged
positions and dedicated siege recruitment remain separate work.

## Reproduce a reviewed decision

`scripts/botEconomyAudit.ts` accepts `BOT_AUDIT_COMBAT=1`. This records the
original unit decisions and their accepted log indexes. Keep the frozen
runner, tuning, scenario and game save together. A command log alone cannot
recover an old bot's explanation from a new policy.

`scripts/botCombatDecisionCapture.ts` takes the save path, turn, player id,
unit id and output directory. Run it with the recorded policy and settings.
It reruns planning from the saved configuration and captures the private
board behind the original accepted decision. It checks the complete accepted
command prefix against the save, including commands before the selected turn.
The snapshots are diagnostic files, not playable saves.

`scripts/botRetreatOptionsAudit.ts` takes one such snapshot, a unit id and an
output path. It applies each legal move or fortify command to a private copy.
It then checks possible attacks from enemies visible on the original board.
It gives those enemies a full movement allowance and tests them independently.
It does not predict which action they will choose, combine competing firing
positions or introduce enemies revealed by the diagnostic move. Swap moves
are excluded. A clear tile under this check is evidence of an alternative;
the absence of one is not proof that death was unavoidable.

## Checks and decision

- Typecheck passed.
- All 572 core test files passed, with 12,948 tests.
- The production build passed.
- Both 120-turn digest games completed without warnings or stalls. Their
  complete saves replayed exactly. The new pins record the reviewed policy
  changes, not a simulation rule or RNG change.
- All five final-save metric checks and all ten combat replay reviews passed.
- Both original planning captures matched their complete accepted prefixes.
  The retreat diagnostic left its source snapshot unchanged.
- The four relevant slow bot test files are still running at this checkpoint.
  No full core-plus-slow push gate has run, and nothing is being pushed to main.

Keep this candidate off port 5199. It corrects the immediate counter-risk
reading and makes some attacks refuse a lethal gamble. The games still expose
stale targets, unsafe advances and civilian losses. The next implementation
checks the planned defender before dispatch; position choice follows that.
The fixed all-leader schedule and earlier AI preference values stay unchanged.
