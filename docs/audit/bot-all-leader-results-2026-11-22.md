# Bot planning across all leaders, 22 November

Neither candidate is promoted to the play build. The complete-income change
has mixed results and more successful finishes. Adding the Scout change
reduces performance on this schedule. Preserve both experiments and keep the
stable baseline available.

## Method

- Baseline: `f6ff7e26`, rules version 260. The play build uses version 261;
  its healing and city-road changes are deliberately outside this comparison.
- Income: use complete recurring income for budgets and forecasts. Keep the
  simulation's partial inputs for card conversions and great-person payouts.
- Income plus Scout: also remove the flat nearby-enemy defense bonus from
  Scout production value. Exploration value and all preference settings stay
  unchanged.
- Five Standard maps, six bot seats each, run serially through turn 100 or a
  win. Every selectable leader appears twice, in different seats and seeds.
  Every leader's two decks appear in the schedule.
- Three versions use identical seeds, seats, rules and settings. No difficulty
  overrides. `data/ai.json` and personas remain fixed.
- The [schedule](bot-all-leader-schedule-2026-11-22.json) was recorded before
  the candidate results. Check it against the live roster before reusing it.
- All fifteen games completed without a driver warning. No seat was removed
  from the results. There were no eliminated seats.

The income version wins one game on turn 88. Turn 80 is therefore the latest
recorded checkpoint shared by every game. Compare fixed-turn metrics there.
Report wins and captures through each game's actual end separately. Do not
replace a missing turn-100 sample with an earlier winning position.

There are five maps, not thirty independent trials. Opponents affect one
another, and two starts per leader do not establish a reliable strength ranking.
This cycle tests structural changes. It is not another parameter grid search.
Cumulative income sums the recurring-income sample after each turn. It does
not count one-time grants or reconstruct every amount deposited in the banks.
A numbered checkpoint is sampled after that turn's bot step.

## Results

| Measure | Baseline | Income | Income plus Scout |
| --- | ---: | ---: | ---: |
| Median total income, turn 80 | 444 | 398 | 321 |
| Mean total income, turn 80 | 755 | 761 | 572 |
| Median official score, turn 80 | 524 | 474 | 470 |
| Median cumulative income through turn 80 | 9,899 | 8,893 | 8,911 |
| Median technologies researched, turn 80 | 19 | 18.5 | 17.5 |
| Median culture drafts, turn 80 | 13 | 13 | 12 |
| Seats already at 800 income on turn 80 | 7 | 7 | 8 |
| Wins before or on turn 100 | 1 | 2 | 0 |
| Cities captured through actual game end | 0 | 3 | 0 |

The 800-income objective is still turn 100. The turn-80 row is an early
checkpoint, not a replacement objective. Its count also shows why a single
threshold is insufficient: the combined version has more seats over that
threshold but lower income and score overall.

Median recurring yield rates at turn 80:

| Yield | Baseline | Income | Income plus Scout |
| --- | ---: | ---: | ---: |
| Food | 91.5 | 107.5 | 88.5 |
| Production | 97.7 | 93.3 | 97.8 |
| Gold | 54.0 | 38.0 | 31.6 |
| Science | 63.8 | 62.9 | 44.1 |
| Culture | 46.1 | 59.8 | 41.6 |
| Faith | 21.5 | 25.3 | 14.0 |

Against baseline, income improves turn-80 total income for sixteen of thirty
paired seats and lowers it for fourteen. Score improves for fourteen, is
unchanged for one and falls for fifteen. Adding the Scout change improves
income for ten seats and lowers it for twenty, compared with income alone.

Wins and captures:

- Baseline Qin wins seed 72839 on turn 94. Income Qin wins it on turn 95.
- Income Lorenzo wins seed 48017 on turn 88. The other versions have no
  winner on that map by turn 100.
- Income Alexander captures two of Joan's cities on seed 72839. Income
  Genghis captures one of Sejong's cities on seed 67153. No seat is eliminated.
- The combined version has no winner or city capture on these five maps.

## Every leader

Each cell is the mean total income from that leader's two starts on turn 80.
These are outcomes for the full leader, deck pair, persona and starting sites.
They do not isolate a leader ability.

| Leader | Baseline | Income | Income plus Scout |
| --- | ---: | ---: | ---: |
| Alexander the Great | 422 | 526 | 313 |
| Joan of Arc | 174 | 344 | 363 |
| Qin Shi Huang | 2,052 | 2,751 | 1,756 |
| Jayavarman VII | 276 | 298 | 179 |
| Cyrus the Great | 480 | 478 | 246 |
| Cleopatra | 644 | 756 | 586 |
| Mehmed the Conqueror | 338 | 282 | 322 |
| Pachacuti | 387 | 261 | 279 |
| Nezahualcoyotl | 358 | 282 | 303 |
| Mansa Musa | 626 | 568 | 569 |
| Lorenzo de' Medici | 3,416 | 2,426 | 1,525 |
| Justinian | 268 | 358 | 236 |
| Harun al-Rashid | 409 | 339 | 498 |
| Sejong the Great | 1,075 | 1,300 | 1,123 |
| Genghis Khan | 400 | 447 | 278 |

Qin, Lorenzo and Sejong show high ceilings. The strongest baseline Lorenzo
position reaches about 28,037 income on turn 100, while his other baseline
start reaches only 348. Record the cards, Doctrines, legacies and wonders
behind these differences before drawing a balance conclusion. The separate
[watchlist](balance-watchlist-2026-11-22.md) tracks those observations.

## Decision and next investigation

The income fix corrects a real mismatch between the bot's forecast and the
simulation's banked yields. That alone does not prove stronger play with the
existing preferences. Keep it as a separate candidate. Do not tune the
preferences to hide remaining planning errors in this investigation.

The Scout experiment is not ready to ship. Its local regression test passes,
but that test does not establish better game play. Before revisiting it,
trace the replacement builds, exploration, worker protection and upkeep.

The [combat audit](bot-combat-planning-2026-11-22.md) identifies a more direct
structural gap: target selection accepts the first satisfactory attack, and
position choice lacks a general retaliation check. Campaign and peace choices
also need a shared assessment of the target. Test these changes separately
from income and Scout valuation.

## Reproduction and artifacts

The preserved worktree is `/private/tmp/webciv-bot-science-260`, branch
`codex/bot-planning-corrections-2026-11-22`. The baseline remains at
`f6ff7e26` on `codex/bot-science-260`. Do not merge this experimental branch
into `decks` as a strength improvement.

The artifact directory is `/private/tmp/webciv-bot-planning-2026-11-22`:

- `manifest.json` records source, settings and frozen bundle hashes.
- `baseline.mjs`, `income.mjs` and `income-scout.mjs` are the frozen runners.
- `all-leader-jobs.json` and `income-all-leader-jobs.json` name each game.
- `run-games.py` runs a job list serially and checks every exit code.
- Each variant/seed directory contains metrics, logs and checkpoint saves.
- `summarize-cycle.py` validates coverage and paired inputs, then writes
  `all-leader-results.json`. It selects a shared checkpoint automatically.
- `final-evidence.ts` replays final saves and checks all six recorded yields
  against the simulation. `war-evidence.ts` traces Alexander's peace choices.
- `baseline-war-trace.mjs` changes only the recorder's command filter. Its
  repeat of seed 72839 reproduces every original metric and the final save
  byte for byte. It records the original war decisions, including AI memory.

The committed [evidence snapshot](bot-all-leader-evidence-2026-11-22.json)
contains ninety fixed-turn seat records, final content from all fifteen
verified replays, selected card-removal differences, tested definitions and
input hashes. Each replay matches all six recorded final yield rates. None
of the evidence readings changes the simulation state.

The war trace confirms an opponent-attribution error: barbarian casualties
trigger five of Alexander's early peace acceptances. This strengthens the case
for correcting combat planning before judging Dominion's balance from these
economic outcomes. The combat audit separates that finding from the unbuilt
tactical improvements.

The income-only diagnostic runs on seeds 60137 and 117031 predate this cycle.
Their twelve seats had mixed results. They are development evidence, not extra
independent all-leader validation. The earlier parameter search remains fixed.

## Validation

- Typecheck passed.
- Core tests passed: 572 files and 12,924 tests.
- Production build passed. It retains the existing large-chunk warning.
- All four long card-valuation checks passed.
- Both 120-turn regression games finished without driver warnings or stalls.
  Their hashes changed because the experiment changes decisions. The
  experimental pins record the reason. A separate repeat matched both:
  duel `27109ab3:415518`, Standard `9acedde4:1119107`.
- The repeat selected only the two digest cases. It skipped the four card
  checks that had already passed.
- No complete slow-suite or `main` push is claimed. This is an isolated
  experiment, with no merge into `decks` and no update to port 5199.
