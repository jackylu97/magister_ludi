# Bot combat planning, 22 November

This is the audit before the combat corrections. It uses the earlier rules-260
study and identifies the defects that prompted the new work. See the
[version-262 comparison](bot-combat-results-2026-11-22.md) for implementation
and measurements.

The user asked whether bots account for terrain, ranged shots, favorable
trades and defensive positions. The immediate attack rules cover part of
this. Position choice and coordination remain basic.

## Current behavior

- `src/ai/bot.ts`, `favourableBlow`, uses `previewCombat`. It receives the
  simulation's terrain, fortification, river, range and line-of-sight rules.
  The default field exchange requires more damage dealt than received.
  Sieges have a separate threshold. A melee attack against walls or a
  fortified defender on favorable ground has another guard.
- `fortifiedRangedAttack` lets an archer fire from its defensive position.
  `rangedFriendReady` can defer a melee attack until an available archer fires.
- `restAndHeal` rests a wounded unit on owned land. `fallBackAndHeal` finds
  a route toward an owned city. A predicted kill or capture can bypass rest.
- `screenMarch` compares the current hex and adjacent hexes. It rewards
  nearby friendly melee units and distance from the nearest visible enemy.
- Campaigns gather a force and reserve destinations. `approachHexes` orders
  legal positions by distance to the moving unit. It does not score their
  defensive terrain or shooting opportunities.

These tactical functions and their default settings also exist in the play
build at `b08e93f7`. The study branch has additional research-planning work;
it does not use a different tactical planner.

## Confirmed limits

1. **The first acceptable target wins.** `favourableBlow` returns inside the
   target loop. It does not rank every legal target. The barbarian scan also
   precedes the rival scan, so their best targets do not compete together.
2. **The exchange stops at one attack.** Its ordinary score is midpoint
   damage dealt minus damage received. It does not price the unit at risk,
   damage from other enemies next turn, or the position after a melee advance.
   A predicted midpoint kill can bypass several safety checks. The separate
   certain-city-capture preference is disabled at the current settings.
3. **Terrain affects an existing attack, but seldom selects a position.**
   There is no general search for a hill, protected river crossing, choke
   point or safe firing hex. A retreat checks whether a route exists, rather
   than comparing enemy attack exposure along alternative routes.
4. **Archer protection is approximate.** A friendly melee unit beside a
   candidate hex counts as protection even if it is not between the archer
   and the enemy. Only the nearest visible enemy determines distance value.
   The move does not check that a useful shot remains available.
5. **Movement and attack are separate choices.** A legal shot from the current
   position takes precedence over looking for a better firing position.
   The planner does not compare moving then shooting against shooting now
   or holding a defensive tile.
6. **The extra melee-screen rule is off.** `military.screenHoldExchange` is
   zero. The code can hold a melee unit against barbarians while a healthy
   ranged unit keeps firing, but the default does not use that extra check.
   The ordinary ranged-first deferral remains active.
7. **Strategic army estimates are coarse.** `armyStrength` and
   `fieldedStrength` add each unit's base melee strength. They do not use
   current health or ranged attack strength. The available force subtracts
   garrison demand as a count, rather than selecting a healthy local army.
   This is separate from the accurate forecast used for an individual attack.

## New campaign example

The baseline all-leader game on seed 72839 ended on turn 94. Alexander
declared eleven wars, captured no cities and held ninety-nine military units
at the end. These included sixty Warriors, twenty-four Swordsmen and only
three Bowmen. Only three were Scouts, so Scouts do not explain the large
army in this case. These are surviving units, not counts of trained units;
grants and levies also add units.
The command log contains thirty-six Warrior purchases and sixty-five queue
choices headed by a Warrior. Queue choices are not completed builds.

Several declarations were followed by a peace command two to four turns
later. The recorded commands include:

- Jayavarman: declaration on turn 46, peace on turn 48; the same pattern
  repeats on turns 58/60 and 70/72.
- Joan: declaration on turn 48, peace on turn 52; later pairs include
  turns 62/64, 74/76 and 86/88.

### Confirmed peace error

Repeating the original frozen baseline with war-decision recording produces
the exact same final save, command log and checkpoint metrics. The original
decisions show that Alexander accepted offered peace after a single loss on
turns 48, 52, 60, 64 and 72. His army-advantage reading still cleared its
threshold in every case.

The exchange counter reads a loss as three points and no kills as a divisor
of one. Its resulting ratio of three exceeds the peace threshold of 2.2.
`readPeaceOffer` treats a bad exchange as a reason to accept even while the
army still has an advantage. The accepted offers also contain tribute.

Those five losses were not losses to the opponent in the peace offer. The
simulation records no recent losses to another civilization at those points.
They were barbarian casualties. `readWarExchange` subtracts lifetime
`unitsLost` and `unitsKilled` baselines. Losses include barbarians; kills
exclude them. It also mixes losses to other civilizations into this opponent's
exchange. This is a confirmed attribution error, not evidence that declining
every peace offer would improve the bot.

The explanation is wrong too. For example, the turn-48 decision claims a
war score of thirty-five is below a threshold of twenty-five. The real
reason was the exchange override. Print the condition that actually decided
the answer, including whose losses it counted.

The simulation already records recent losses by opponent in
`Player.warLosses`. Evaluate that record as the basis for a recent-war
assessment, with its retention window stated explicitly. City-capture goals
also need opponent-specific attribution.

The first command-only replay produced different fresh answers. War exchange
history lives in AI memory beside the simulation, so replaying commands does
not restore that history. The repeated frozen run supplies the original
decision evidence; the command replay supplies the actual loss records.

## Proposed implementation order

1. Correct opponent-specific war exchange accounting and its explanations.
   Verify that a barbarian casualty or a loss in another war cannot count as
   a loss to this opponent. Compare declarations, peace, captures and costs.
2. Rank all legal current-position attacks together. Price useful damage,
   likely kills, certain captures and survival. Keep deterministic tie-breaking
   and print the reasons for the selected target.
3. Compare holding, moving and moving then attacking in a bounded area.
   Use the simulation's own movement and combat forecasts. Include the
   position occupied after a melee kill.
4. Estimate retaliation from visible enemies. Count each enemy once, even
   when it can attack from several hexes. Use shared reachability readings.
   Evaluate defensive terrain, fortification and ranged protection through
   the resulting exchanges, without charging the same danger twice.
5. Coordinate available ranged shots and melee follow-up. Preserve a useful
   defensive line when another ranged turn is better than a melee exchange.
6. Make declaration, campaign execution and peace evaluate the same feasible
   objective. Do not force a fixed minimum war length when the army has lost
   its advantage or cannot reach the target.
7. Check recruitment and upgrades against the force that can fight locally.
   An empire-wide melee count is not a useful substitute for available ranged
   support. Include free units and levies when measuring excess recruitment.

Keep preferences in `data/ai.json` so the generated Arena panel exposes them.
Use fixed search bounds rather than elapsed-time cutoffs. Planning must not
consume simulation randomness or mutate the real state. Start with one enemy
response, rather than searching the whole game tree.

Test terrain choices, multiple targets, overkill, exposed melee advances,
blocked firing lines, movement costs and wounded-unit survival on arranged
boards. Then compare casualties, captures, army spending and economic progress
across the all-leader schedule. A higher capture count bought by a ruined
economy is not enough to accept the change.

No tactical changes from this proposal are in the play build. The income and
Scout experiments remain separate, with their existing tuning fixed.
