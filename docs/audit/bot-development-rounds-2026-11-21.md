# Structural bot development experiments

## Checkpoints and scope

The user asked for further iterations, progress reports and a stable rollback point.

- Current project checkpoint: `codex/bot-stable-2026-11-21`, commit `67cd3b17`.
- Normal bot benchmark checkpoint: `codex/bot-benchmark-2026-11-21`, commit `77e33d9d`.
- Experiments run in `/private/tmp/webciv-structure-audit` on `codex/bot-development-rounds`.
- The target remains 800 total yields at turn 100 under normal rules.
- Keep each experiment separate and retain failed results. Do not update 5199 during screening.
- Keep the user's uncommitted settings and documents out of bot commits.

## First investigation: research progress

`researchRoad` sums full technology costs. `techChain` uses those same full costs
for each unlock's delay. Neither subtracts science already invested. The sim
keeps that progress on the active technology or in a parked technology account.

Test using the sim's `bankedTowardTech` reading. Apply unused science once at the
start of an unassigned plan. Carry any excess from a completed node forward.
Do not move progress between unrelated technologies. Keep the existing weights.

In the baseline seed 314 game, Lorenzo first planned Letters on turn 48,
switched away on turn 52, returned through another plan on turn 55, switched
again on turn 62 and completed Letters on turn 72. This trace establishes delay
and switching. It does not yet establish how much the missing progress reading
caused them.

## Screening results

Each experiment changes one part of the normal baseline. All six bot seats use
that policy for a continuous game through turn 100. Seeds are 42, 2026 and 314.
There are no difficulty bonuses. These are interacting games, so the seats are
not independent samples and a changed opponent can change another seat's result.

| Policy | Median yields | Mean yields | At least 800 | Mean score | Mean techs | Mean drafts | Captures |
|---|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 474 | 724 | 6/18 | 759 | 23.5 | 14.3 | 3 |
| Count research progress in remaining time | 520 | 574 | 6/18 | 697 | 22.8 | 13.7 | 1 |
| No military unlock value without a required resource | 475 | 662 | 5/18 | 742 | 23.5 | 14.1 | 0 |
| Remove completed unlock rewards from construction plans | 378 | 591 | 5/18 | 729 | 22.7 | 14.2 | 7 |

None qualifies as a stronger default from this screening. Keep the source
patches and the results for further work. Do not merge a correction merely
because its local arithmetic is more accurate.

### Resource requirements

At turn 40 on seed 314, Lorenzo controls obsidian but no horses or camels.
The Wheel's chain assigns about 279 points to the War Chariot and Chariot Archer.
It assigns about 65 to the Monument. The military rewards use full unit value
before the bot has trained a unit or acquired its required resource.

The trial adds `research.missingResourceUnitShare`, set to zero for the screen.
It scales the reward for a combat unlock without a controlled resource. It does
not change production gates. This is deliberately a narrow trial. A complete
planner must price the work or trade needed to acquire a resource, rather than
assume either immediate access or permanent unavailability.

### Already completed rewards

`liveChains` includes known technologies when a city can still construct their
buildings. `techChain` also includes the units, abilities and other direct
research rewards from those known technologies. `chainStepShare` then distributes
that value to construction choices. A Stable can get credit for the chariot
unlock even though the technology already made chariots available.

Removing those rewards lowers the median. The new direct regression cases pass,
but two older expectations fail: one requires a unit step on a known technology,
and the Great Person gate fixture now chooses Sailing. The second failure is a
policy regression to investigate, not an expectation to erase.

### City growth

At turn 80 on seed 314, many small towns make zero to two food surplus per turn.
Lorenzo's capital has ten citizens, while four later towns have three, three,
one and one. Many are building defensive structures. This is not just a lack
of cities.

The focus arm values the next citizen's tile and happiness cost, but omits the
per-population science and small-city premium that `explainCitizen` already
uses. A separate trial adds those existing terms to the focus comparison. It
changes no growth rules or tuning values.

The growth-value trial also failed the screen: median yields 462, mean 571,
three seats at 800, mean score 706, mean techs 23 and mean drafts 14.2.
Only six of eighteen seats improved their final yield rate. Retain the patch
for diagnosis; do not adopt it by itself. Its narrow appraisal and price tests
passed, which shows why those tests cannot replace played comparisons.

## Validated improvement: local defense

The earlier local-defense patch changes only the threat used to price a city's
strength and hit-point buildings. Each enemy still counts once toward the
empire's army demand. It counts toward each city's walls only when it is within
that city's existing threat radius. Existing diplomacy weights, military value
and threat radius remain tunable in `data/ai.json`.

The three new maps are 7, 999 and 2025. They were selected before the results
were read. The same six leaders, normal rules and continuous runner apply.

| New-map measure | Baseline | Local defense |
|---|---:|---:|
| Median yields | 460 | 579 |
| Mean yields | 813 | 944 |
| Seats at 800 | 4/18 | 5/18 |
| Mean score | 793 | 896 |
| Mean technologies | 24.7 | 24.9 |
| Mean Order drafts | 15.4 | 17.4 |
| Captures | 2 | 1 |

Twelve of eighteen seats improved on the new maps. Across all six maps:

- Median yields rose from 460 to 572.
- Mean yields rose from 769 to 946.
- Mean score rose from 776 to 857.
- Mean technologies rose from 24.1 to 24.7.
- Mean Order drafts rose from 14.8 to 16.4.
- Twenty-three of thirty-six seats improved their final yields.
- Seats at 800 rose from ten to eleven. The target is not met consistently.
- Captures rose from five to nine overall, but fell from two to one on the
  new maps. Do not claim a consistent conquest improvement.

The source fix is commit `a90137f0` on `codex/bot-development-rounds`.
Accept this patch on the isolated bot development branch. Keep it in a separate
commit. Do not include the failed research or growth trials in that commit.
The current `decks` branch and server 5199 retain their previous behavior.

## Civilization balance observations

Lorenzo and Sejong produce the largest economic outliers in this sample.
Under local defense, their median yields are 792 and 677, respectively.
Their means are 1,714 and 1,310, which show how much the outliers matter.
Mansa's median is 609, Jayavarman's 615, Alexander's 562 and Mehmed's 435.

Each leader always occupied the same seat. These games compare bot policies;
they do not isolate civilization balance from terrain, starting position,
card offers or opponents. Do not recommend a civilization nerf from these
results. A balance study needs seat rotations and more seeds.

## Validation and retained evidence

- The accepted patch passed typechecking, 12,826 core tests in 565 files and
  the production build. The build has the existing chunk-size warning.
- A fresh baseline seed 42 run reproduced the original saved command log
  exactly. The simpler reusable runner does not change the outcome.
- All screening and new-map games reached turn 100 without driver warnings.
- The source patches and full final-seat readings are in
  `docs/plans/benchmarks/bot-development-rounds-2026-11-21/`.
- The original local-defense source patch and original three-map readings
  remain in `docs/plans/benchmarks/bot-economic-structure-2026-11-21/`.
- Temporary bundles and full command logs remain in
  `/private/tmp/webciv-structure-audit/results/development/`.

## Next structural work

1. Make citizen-focus forecasts use the same food safeguards and yield stages
   as actual citizen assignment. The extra growth values alone did not help.
2. Price research as a feasible development plan: remaining science, access
   to resources and the buildings a specific city can complete. Test those
   parts together after the isolated corrections failed.
3. Trace weak cities' production and losses. Separate replacing lost units
   from unnecessary army growth, and failed expansion from slow construction.
4. Evaluate these fixes with both whole-game comparisons and shared-position
   diagnostics. Keep failed trials and protect the stable checkpoint.

### Why the long-game reference hashes changed

The first command difference on the six-seat duel is on turn 45: Junipers Rest
chooses a Monument instead of a Palisade. Its local threat is one, while the
empire's threat is about three. At the shared position before the command, the
Palisade's non-yield value falls from about 78 to 39.

On the standard map, the first difference is on turn 39: Aldermarch chooses a
Granary instead of a Palisade. Its local threat is one against an empire total
of two. The same wall value falls from about 58 to 39. These direct readings
explain the scope change; they are not a full reconstruction of each frozen
planning board.

The before-and-after 60-turn logs on both sizes replay to byte-identical states.
The unchanged runner also reproduced the original seed 42 baseline log exactly.
All eighteen new 100-turn logs replayed to the recorded yields, scores and
technology counts. The digest transitions and first changed commands are in
`validation.json` beside the results.

The first slow-suite run passed 170 of 172 tests. The two failures were the
old fixed reference hashes. No driver, state-purity or replay assertion failed.
The pins were updated only after tracing the changed production decisions.

The two affected slow-test files then passed all six tests with the new pins.
Together with the other 170 passing slow checks, all 172 slow tests are covered.
There were no further code changes after the successful core suite and build.

## Second round: citizen placement forecasts

The user asked to continue. Preserve the accepted local-defense state at
`codex/bot-local-defense-2026-11-21` (`27fbaa3d`). Compare new experiments with
that state, not with the earlier global-defense baseline.

The next experiment shares citizen placement between the simulation and the bot's
focus forecast. It must preserve locks, food safeguards, avoid-growth behavior,
per-city yield stages and actual growth modifiers. The preview must not mutate
the live state or its cached readings. The simulation's normal assignment order
and results must remain unchanged. Screen the bot policy before accepting it.


### Early priorities and Order variance

The user clarified the target on 2026-11-21:

> i would also double check what the bots are prioritizing early - it could be the case that orders aren't balanced and are fairly high variance. in general it shouldn't be building too many units early and should be prioritizing growth in cities early and overall yields throughout the game

Measure turns 1–40 before changing policy. Record production allocations, unit
losses, city population, food surplus, and the Orders offered and chosen. Record
current marginal yield contributions from seated cards separately from combat,
action and future value. A weak economy can have few surviving soldiers after
spending most of its production replacing losses. Do not treat troop counts as
production spending. Do not infer card imbalance from final empire yields alone.


### Scout roles experiment

Across the six local-defense games, production directed at queue heads during
turns 1–40 was 34.5% field soldiers, 13.4% scouts, 35.8% civilians, 12.0% ordinary
buildings and 4.3% wonders. This is the production rate read before resolution,
not a ledger of spent hammers: overflow, completion grants and mid-turn purchases
are not attributed by this reading. The median seat directed 50.5% to soldiers
and scouts. There were 128 newly appearing scouts and 96 scout losses. Free units
and purchases are included in appearances, so appearances are not training counts.

`explainSoldier` adds the city's emergency threat value to scouts. Their order
handler sends them to explore, and the army/garrison readers exclude them. Test
removing that emergency value from explorer appraisals. Keep their strength,
exploration bonus, cap and decay unchanged. Also restrict the forced opening
scout to the capital's founding turn. Later replacements must win the normal
production comparison. This applies the existing first-build instruction instead
of forcing replacements throughout the opening window.


### Committed army experiment

The army mix and wage forecast count queued soldiers. The total army demand
comparison counts only soldiers already on the map. Test counting front-row
field soldiers as committed supply in that comparison and in research's army
shortfall. Keep actual standing units separate for tactical and retirement
readings. Exclude the city's own queue when comparing replacement production.
Do not count explorers, civilian units or later queue rows. No tuning values or
game rules change. Test independently of the scout experiment first.


### Early routine army experiment

The user wants growth early and yields throughout the game, with fewer early
units. Test `military.routineArmyShareByAge` as an Arena parameter. It scales
routine soldiers per city and the extra demand from scouting camps and hostiles.
The minimum remains one defender per city. Nearby threat demand and active war
forces keep their existing values. The first trial uses `[0.5, 1, 1, 1]`,
independent of the other experiments. A neutral array must reproduce the current
policy exactly. This is an experimental bot preference, not a game balance change.


## Combat investigation

The user asked on 2026-11-21:

> could you take a look at how the bots handle combat? Against the barbarians, its often good to fortify melee units while attacking from range with archers.

The existing `rangedFriendReady` defers melee while an archer has an unused shot.
It stops deferring after the archer fires, and it exempts a predicted kill.
`favourableBlow` uses the midpoint damage exchange and returns the first accepted
target. It does not price losing the attacker's defensive position or exposure
to other enemies. `screenMarch` counts adjacent friendly melee units, not whether
they actually stand between the archer and the enemy. It rewards distance without
valuing a continuing firing position.

A separate, concrete fault is the treatment of fortified ranged units.
`awakeTrenches` skips their normal order blocker. `wakeTheCampaign` requires a war
with a real nation. `wakeTheHunt` requires a camp plan and excludes garrisons that
cannot leave their cities. A fortified archer can therefore have a legal shot at
a visible barbarian and never receive an attack command.

Test a direct ranged-attack check for fortified ranged units. It uses the same
combat preview and explanation as other attacks, runs before idle melee orders,
and emits only attacks. It does not move a garrison, waive combat legality or
change healing thresholds. Keep the neutral routine-army parameter during this
experiment. Test defensive fixtures and full games before adoption.


### Combined defensive army experiment

The user clarified:

> i think we need better combat strategy coupled with fewer units produced

Test combat policy and recruitment together. A lower troop target alone failed
the three-map screen, so it is not an accepted default. First test a melee unit
holding its position against barbarians when it stands in front of a friendly
archer that can keep firing from its current tile. The support reading must use
the simulation's hypothetical combat preview, including range and line of sight,
even after the archer has fired this turn. A nearby archer behind the enemy does
not provide a defensive line.

Expose the required damage exchange as `military.screenHoldExchange`. Zero keeps
the old policy. A positive value raises the exchange needed to leave the screen.
A predicted kill or capture remains allowed. An assembled camp assault keeps
its existing attack policy. A declined attack must also stop a later march from
walking the melee unit out of position. Compare the tactical change alone and
the same change with lower routine recruitment. Retain emergency recruitment.

Measure unit losses, production directed at military units, population, yields,
research, score and captured cities. Keep all experiments isolated from the live
play build.


### Early experiment results

The independent three-map screen uses 18 seats and the accepted local-defense
baseline: median 538 yields, mean 947, six seats at 800, mean score 818,
24.5 technologies and eight captured cities.

| Trial | Median yields | Mean yields | At least 800 | Mean score | Mean techs | Captures | Decision |
|---|---:|---:|---:|---:|---:|---:|---|
| Shared citizen placement forecast | 440 | 526 | 3/18 | 688 | 24.4 | 6 | Rejected as a default |
| Count queued soldiers toward army demand | 525 | 727 | 4/18 | 739 | 23.3 | 8 | Rejected as a default |
| Half routine army demand in Age I | 401 | 791 | 3/18 | 809 | 23.7 | 6 | Rejected as a default |

The scout-role trial ran on all six maps. Its median was 642 yields, mean 1350,
13/36 seats reached 800, mean score was 961, and mean technology count was 25.4.
Captures fell from nine to five. Alexander's median fell. Mean population at turn
40 fell from 8.08 to 7.89, and mean city count from 2.92 to 2.78. Keep this trial
experimental. It did not establish better early growth or better Dominion play.
Lorenzo won seed 2026 on turn 96 and Sejong won seed 2025 on turn 95. Those rows
are terminal readings, not turn-100 readings.

The neutral routine-army array reproduced all 5,588 commands of the accepted
seed-42 game and its config exactly. All 15 early experimental games replayed to
the recorded yields, score and technology counts.

### Order variance

Current card contributions vary substantially, but these games do not isolate
card balance from map position, opponents, drafting and other cards. The impact
reader measures the change when one seated card is removed. These readings
overlap and must not be added as separate causes of the empire's income.

- **The Twelve Tables** pays production and culture in the capital for each
  Order owned. In Lorenzo's seed-2026 game it contributed 43.2 current yields
  at turn 40, against 6.6 from **The Working Court** (Monument cities gain
  production from their culture) and 4.2 from **The Brick Kilns** (science and
  gold that grow with completed buildings). At turn 100 its contribution was
  556.6 after the empire's other modifiers.
- **The Immortals** doubles spent Great Person legacies. Its turn-100 marginal
  contribution was 1153 in that Lorenzo game.
- **The Processional Way** pays science and culture on tiles beside at least
  two Great Works. It contributed 1161.1 in Sejong's seed-2025 game.

These are examples of large differences in realized payoff, not a proposed
card rebalance. The raw evidence includes each card's description.

### Fortified ranged unit results

The wake rule is present in both the current project and the benchmark source.
The handoff section 0.1c explicitly preserves the old bot decisions by skipping
awake fortified units in the ordinary blocker queue. This prevents a healing
unit from hiding later blockers, but it also leaves some archers unasked.

Across six local-defense games, 180 fortified-unit turns ended with a legal
ranged attack unused on the live board. Of these, 111 met the persona's health
threshold. With the direct firing check, those counts were 72 and eight. The
remaining cases need separate interpretation: bots plan against frozen boards,
while this diagnostic reads the live board immediately before End Turn.

| Six-map policy | Median yields | Mean yields | At least 800 | Mean score | Mean techs | Captures | Units lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Local defense baseline | 572 | 946 | 11/36 | 857 | 24.7 | 9 | 754 |
| Fortified ranged firing | 549 | 848 | 13/36 | 837 | 24.9 | 9 | 750 |

The fix corrects a reproducible missed action. It does not establish a general
strength increase. Losses include scouts and civilians, not just field soldiers.

Both 120-turn replay fixtures first change at a healthy awake archer's legal
attack: turn 47 on duel and turn 61 on standard. The baseline digests were
reproduced before updating the expected states. Both changed games replayed
byte-for-byte with no warning or stalled turn.


### Combined defensive army results

The first trial uses `screenHoldExchange: 2` with the normal army target. The
second adds `routineArmyShareByAge: [0.75, 0.75, 0.75, 0.75]`. All other values
stay unchanged. Both include the fortified ranged firing fix.

| Three-map policy | Median yields | Mean yields | At least 800 | Mean score | Mean techs | Captures | Units lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fortified ranged firing | 591 | 947 | 7/18 | 826 | 24.7 | 8 | 400 |
| Defensive holding | 504 | 765 | 5/18 | 779 | 24.6 | 8 | 412 |
| Defensive holding and smaller army target | 634 | 847 | 6/18 | 853 | 25.1 | 7 | 418 |

The combined trial also ran on three additional maps. All six games reached
turn 100 with no warning or stalled turn.

| Six-map policy | Median yields | Mean yields | At least 800 | Mean score | Mean techs | Captures | Units lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fortified ranged firing | 549 | 848 | 13/36 | 837 | 24.9 | 9 | 750 |
| Defensive holding and smaller army target | 635 | 1086 | 13/36 | 946 | 26.1 | 7 | 752 |

The combined policy improves the economy in this sample but does not improve
army survival or the count reaching the target. Alexander's median falls from
521 to 394 and his captures fall from three to zero. Mehmed's median rises from
550 to 635 and his captures rise from six to seven. Keep the combined policy
experimental rather than making a general strength claim. The source defaults
remain one for routine army demand and zero for defensive holding.

On the initial three maps, production directed at military queue heads before
turn 40 falls from 35.1% to 27.8%. Scouts stay near 14.3%. Ordinary buildings rise
from 10.0% to 12.0%, and civilians rise from 36.3% to 42.7%. Mean population rises
from 7.67 to 8.28 and city count from 2.78 to 3.00. Population per city stays
roughly unchanged: this improvement comes mostly from expansion. Early combatant
losses rise from 62 to 66.

### The next structural problem: army composition

Through turn 40 on the initial three maps, 140 new warriors appear but only
seven archers. These counts include purchases and free units. Of the warriors,
107 appear at end-of-turn resolution, 27 through purchases and six through
Order or discovery choices. Twelve of the 18 seats have not researched
Fletching by turn 40, even though it requires only the starting Agriculture
technology. The smaller-army trial produces 114 warriors and six archers;
14 seats still lack Fletching.

The research unit appraisal prices raw strength and the total army shortfall.
It does not identify the first ranged unit as a missing defensive role. The
production arm has a unit-mix term, but that cannot select an unavailable unit.
A defensive-position policy has little early effect without ranged support.

The next experiment should connect these three choices:

1. Identify defensive jobs and the melee/ranged support missing from them.
2. Price research and recruitment from those gaps, including soldiers already
   being trained, rather than rewarding another unit type only for raw strength.
3. Keep the resulting force together, preserve firing positions, and evaluate
   exposure after an attack. Current melee attacks still price one damage
   exchange, not the other enemies that can retaliate afterward.

Keep the city-defender floor and active conquest requirements. Test the first
ranged unlock without adding a permanent preference for one named technology.
The objective is fewer required replacements, not just a lower target army size.


### Early science investigation

The user asked:

> are the seats not valuing early science? It's hard to believe that they trained 10 warriors before unlocking fletching

The warrior count is pooled across 18 seats and includes purchases and free
units. It is not ten trained warriors per seat. However, early science investment
is weak in these games: median science income is 1.65 on turn 10, 2.0 on turn 20,
2.875 on turn 30, and 3.525 on turn 40. None of these 18 seats has a Library by
turn 40.

Reconstructed research rankings show a planning problem, not simply a missing
science weight. On seed 42, Sejong's turn-10 Library would add three science.
The bot prices each point at 12.8, above its base weight of five, but discounts
the Library's contribution to zero. It projects completion 161.3 turns away.
The research path itself takes 72.7 turns at the current income, already beyond
the 60-turn horizon. The construction forecast also queues the Hanging Gardens,
Shrine, Oracle and Temple of Thoth before the Library. These are optional
unlocks, not required buildings. Both the low science assumption and this
construction sequence matter; removing the wonders alone would not make this
particular Library fit the horizon.

The same reading gives the retired Augur a base value of 80. Divination scores
114, Sailing 94, Writing 92 and Fletching 41. The research reader walks the raw
unlock list. It does not filter the retired Augur even though the build gate
refuses it and the tree's `liveUnlocks` reader hides it. Charter knowledge and
`rowsOfResearch` also walk raw lists. This is a concrete invalid reward to remove
before more weight tuning.

These are fresh live-board reconstructions, not the original frozen planning
contexts. The raw examples preserve the explanatory terms. The follow-up should
filter impossible unlocks, distinguish optional construction from a required
sequence, and value an early science investment through the research it enables.
Do not give every optional building an independent completion time while still
claiming that the same city can build them all simultaneously.


### Committed state and validation

- `74c0f029` contains the fortified ranged firing fix and the two neutral Arena
  controls. Tag: `codex/bot-combat-reviewed-2026-11-21`.
- The previous accepted source remains at
  `codex/bot-local-defense-2026-11-21` (`27fbaa3d`).
- `npm run test:all` passed all 13,006 tests in 615 files after the final source
  changes. Typechecking and the production build passed.
- Fifteen early experiments and fifteen combat experiments replayed to their
  recorded yields, scores and technology counts. The two 120-turn before/after
  fixtures also matched their complete replayed states.
- The source remains on the isolated bot branch. Port 5199 is unchanged.
- The science-planning findings above are audited follow-up work. They are not
  part of this source commit.
