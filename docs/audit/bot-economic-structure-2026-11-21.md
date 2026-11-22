# Bot economic planning audit

## Target and result

The user reported about 800 total yields around turns 80–90 with Lorenzo and
five or six cities. On 2026-11-21 the user set a target of 800 yields around
turn 100 across the bots. This work uses normal rules without difficulty bonuses.
Total yield adds food, production, net gold, science, culture and faith per turn.
City count is a comparison measure, not a limit.

The target is not met consistently. Six of eighteen baseline seats reached it.
The median was 474. The mean was 724 because a few strong economies raised it.

| Policy | Mean yields | Median yields | Seats at 800 | Mean score | Mean techs | Mean drafts | Captures |
|---|---:|---:|---:|---:|---:|---:|---:|
| Normal bot baseline | 724 | 474 | 6/18 | 759 | 23.5 | 14.3 | 3 |
| Local threat for walls | 947 | 538 | 6/18 | 818 | 24.5 | 15.5 | 8 |
| Remove unsupported ships and missing building sites from research payoffs | 617 | 511 | 4/18 | 756 | 21.7 | 14.6 | 2 |

A later [development study](bot-development-rounds-2026-11-21.md) validates the
local-defense patch on three more maps and accepts it on the isolated bot branch.

These are screening experiments, not accepted defaults. The local-defense
change improved yields for eleven seats but did not raise the number reaching
the target. Its mean gain also includes one Lorenzo game rising from 2,983 to
6,311. The research filter reduced the number reaching the target. Neither
patch has been merged into the playtest build.

The [results](../plans/benchmarks/bot-economic-structure-2026-11-21/results.json)
include every seat, score, yield, tech count, draft count, capture count and city.
The two candidate patches are stored beside that file.

## The strongest evidence

### Development separates otherwise similar empires

Two Lorenzo games had five cities at turn 80, but very different economies.

| Measure | Seed 314 | Seed 2026 |
|---|---:|---:|
| Total yields per turn | 143 | 778 |
| Population | 18 | 27 |
| Libraries | 0 | 5 |
| Science per turn | 6.1 | 215.5 |
| Culture per turn | 17.6 | 174.3 |
| Completed technologies | 14 | 27 |
| Order drafts | 9 | 17 |

On seed 314, Florence completed its Granary on turn 37, Barracks on 45,
Monument on 51, Great Sphinx on 64 and Palisade on 80. It chose a Library on
turn 81. Three of the five cities still had no completed buildings at turn 80.
On seed 2026, all five cities had Libraries by turn 68. Its stronger economy
also included more Orders, religion effects, wonders and Great Person effects.
This comparison identifies a development failure. It does not isolate the
causal effect of Libraries from terrain, warfare or the other investments.

The production scorer reads a building's current yield change correctly. The
gap is broader planning. Research, city production, purchases, workers and
Orders do not consistently carry an economic objective through to completion.
The current chain system already connects some of these decisions. The next
change should improve that connection, rather than add another flat science
bonus.

### Local defenses use an empire-wide emergency

`valueContext` counts weighted foreign combat units near any owned city.
`explainBuildingRow` uses that same number for a particular city's wall strength
and hit points. Enemies near one border increase the defensive value in distant
cities too. The production table and research chains both consume that value.

The candidate records the same weighted count per city while retaining the
original empire count for army planning. It uses the existing threat radius,
peace weight and military weights. It changes no balance numbers. A new test
checks that a distant enemy raises the frontier wall's value and the empire
threat, while leaving the interior wall's value unchanged. The appraisal file
passed all 146 tests with that candidate.

Keep this candidate for another controlled comparison. The three screening maps
show better median output and more captures, but substantial individual losses
remain. For example, Mansa Musa fell from 321 to 129 yields on seed 2026.

### Research promises work the bot cannot yet perform

`readNodeGifts` and `unitTerm` value naval unlocks. The production policy
explicitly declines naval units. Research therefore receives military value
from an action the bot does not take.

`buildingCopies` creates hypothetical copies without checking their required
sites. A non-coastal city can contribute a Lighthouse's promised value. A
building's prerequisite work and site preparation also need to be represented
before the plan can claim their payoff.

The second candidate removed naval unlock value and excluded copies whose
required site did not currently exist. This was too broad as a replacement for
planning. Some sites can become available after a Library, University or worker
improvement. Rejecting those futures does not model their preparation. The two
filters also changed together, so this experiment does not establish which
filter caused the loss. Keep them separate in the next comparison.

Military unlocks also use the full new soldier value, including the same nearby
threat premium, rather than the improvement over an available alternative.
That is a separate candidate for investigation. An upgrade should account for
strength, role, recruitment access and whether the bot can field it in time.
Do not remove military research merely because the standing army is large.

### Rearranging current Orders is not the main missing gain

A diagnostic tried every legal single replacement and then every legal second
replacement in Lorenzo's three turn-80 councils. It applied commands on copies
and respected sealed chairs. It measured current total yield, not defense,
future production, draft value or the bot's weighted objective.

| Seed | Current yields | Best single change | Best pair |
|---|---:|---:|---:|
| 42 | 297.0 | 297.0 | 297.0 |
| 2026 | 778.1 | 794.5 | 804.3 |
| 314 | 142.9 | 151.7 | 151.7 |

A broader council search can help. These snapshots do not support it as the
first fix for a several-hundred-yield deficit. Earlier drafts and the buildings
that support those cards matter more in the weak games. Future draft synergy
was not measured by this diagnostic.

## Next implementation sequence

1. Give research and production a shared, executable development plan. Evaluate
   a useful unlock together with the city that can build it and the required
   preparation. Count each payoff only after its prerequisites and build delay.
   Keep a short list of alternatives, rather than promising every possible
   building in every city. Recheck the plan when threats, unlocks or resources
   change. Keep the horizon, search limit and deck preferences tunable.
2. Separate local defense needs from the army's wider role. Retest the local
   wall candidate with one changed seat against unchanged opponents. Measure
   city losses, economic development and conquests together. A general reduction
   in army size is not the proposed fix.
3. Separate the two research feasibility filters. Give an unavailable building
   a preparation plan or no current payoff. Price a new military option against
   the alternatives the bot can already use. Preserve research's non-military
   benefits, including embarkation and trade.
4. Add limited card-pair planning after development is reliable. Test both
   drafts and seating with actual building and tile plans. A higher immediate
   council yield is not sufficient when the removed Order provides defense or
   future growth.

Track the fraction reaching 800, the lower end of the results, and each deck's
main yield alongside score and conquests. Increasing the mean alone does not
meet the user's target. Also track city count so a gain that requires many more
cities is visible.

## Method and limits

- Source: `b9226167`, save version 257, the previously validated normal bot
  branch. These games do not use the separate difficulty-tier changes.
- Seeds: 42, 2026 and 314. Standard map, barbarians enabled, six named leaders.
  Seat order: Alexander, Mansa Musa, Sejong, Mehmed, Lorenzo and Jayavarman.
- Each policy ran continuously from a new game through turn 100. Reloaded turn-90
  extensions were discarded because restarting bot memory can change decisions.
- All six seats used the candidate in each experimental game. Opponent changes
  can therefore contribute to a seat's gain or loss. These are three shared
  games per policy, not eighteen independent observations.
- Every continuous run reached turn 100 without a winner or a driver warning.
  Final yield totals were checked against replayed saves and matched.
- Some early scratch snapshots held references to changing arrays. Construction
  and council evidence in this report comes from replayed checkpoint saves.
  The reusable runner copies each checkpoint before continuing.
- These fixed seats and three maps do not establish a civilization ranking.
  Lorenzo has a high ceiling in this sample, but also weak results. A ranking
  needs more maps and rotated starting seats.

## Reproduction

The audit branch contains `scripts/botEconomyAudit.ts`. It records the fixed
roster, all six rates, score, development and saves at the checkpoints. Bundle it
against the stated source and run one game at a time.

```sh
./node_modules/.bin/esbuild scripts/botEconomyAudit.ts --bundle --platform=node --format=esm --target=node20 --outfile=/tmp/bot-economy-audit.mjs
node /tmp/bot-economy-audit.mjs 42 /tmp/bot-economy-42
```

Apply one stored candidate patch to a separate copy of the baseline to reproduce
that policy. The candidates are alternatives, not a combined change. The local
patch includes the diagnostic export used to inspect production rankings.

The audit branch passed typechecking, all 12,825 core tests in 565 files, and
the production build. Those checks cover the unchanged normal bot source and
the audit artifacts. They do not certify either experimental patch for release.
