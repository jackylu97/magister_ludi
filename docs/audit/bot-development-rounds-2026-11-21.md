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
