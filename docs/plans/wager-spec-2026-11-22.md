# The wager, simplified: spec for the build (2026-11-22)

Ruled by the user in chat on 2026-11-22. It replaces the larger proposal in
`docs/plans/wager-proposal-2026-11-22.md`, which the user found too
complicated: "this feels complicated all of a sudden, i dont want to think
about this, and i'm sure new players will be confused too. What's the simplest
form of this that's fun and engaging and feels like a wager".

Owner of the rules and the bots: Astra. Owner of the screens: the Claude
session.

## 1. The rule

**Age I: one bar, no choice.**
- Every seat has the same bar: its **score** (section 3).
- The bar has three marks. Each mark that a seat passes pays **1 bead**, on
  the turn that it passes it. So age I pays 0 to 3 beads.
- The bar is there from turn 1. It asks nothing and opens no window.
- The user: "the wager in age 1 is just awkward, because I don't want a new
  player to be confused in age 1 ... maybe everyone has to do the total yields
  wager in age 1 and there isn't an option?" Then: "what about score instead
  of wager?"

**Ages II, III and IV: pick one wager, and pick a mark.**
- When the age opens, a seat sees **three wagers: two dealt, and its score.**
  Score is always on offer, so a seat is never dealt three wagers that it
  cannot use.
- Each wager is one number with three marks: **low pays 1 bead, middle pays
  2, high pays 3.**
- The seat picks one wager and one mark.
- If the number reaches the mark before the age ends, the seat gets that
  mark's beads **on that turn**. If it does not, the seat gets nothing.
- There is no other cost. No malice follows a missed wager.
- Score has all three marks for now. The user: "Let's keep the 3 beads on the
  score for now".

**The door.** 7 beads open the Opus door, as today.

Why these three parts, in the user's words: "you only get 2 shots at earning
beads (age 2 and age 3 wagers) because you're building the magnum opus in age
4 ... I'm imagining a situation where you lowroll the wagers, have a strong
empire and don't have enough beads to win in age 4 even though you reach it
first." The age I bar gives a fourth chance; paying on the turn makes the age
IV wager count; score on offer in every age removes the low roll.

## 2. Readings that the Claude session chose (say if one is wrong)

- The two dealt wagers are **the same for every seat** in an age, and they
  come from two different groups (section 4), so one deal rewards two kinds
  of play.
- The pick is made when the age opens and **cannot be changed**. A human seat
  must pick before it ends its turn (a blocker, as for a draft). A bot picks
  in the same turn.
- A seat may pick a mark that its number has already passed. It is paid at
  once. The marks should be placed so that this is rare.
- For difficulty tier 13 ("Wager milestones are 40% higher for you"), every
  mark of the player's bars, the age I bar included, is 40% higher.
- A wager does not repeat as a dealt wager in the next age.
- The 24 wagers of today, the secret stake and the malice for a missed stake
  are retired (`retired: true` rows, kept for saves and the Compendium).
  Malices from other sources do not change.

## 3. The score

The score is the list in `src/sim/score.ts` (`explainScore`, weights in
`rules.score`). Four changes, the user's:

1. **Beads leave the score.** "Let's just remove beads from score
   altogether."
2. **The card line counts everything on the In play screen.** "What your
   cards have paid over the game should be all the cards in the 'in play'
   screen, not just orders." Today `recordDeckTally` adds only the statecraft
   class of the Ledger (Orders and governments). Add the other sources that In
   play lists: beliefs, rites and consecrations, wonders, legacies, leaders,
   luxuries' signatures and technologies' effects, as that screen defines
   them.
3. **A new line: rival units and camps defeated.** "ok lets add rival units
   and camps defeated".
4. **A new line: army strength.** "total combat strength of entire army, base
   strength + veterancy level + orders that increase combat strength
   unconditionally". So: for each military unit, its base strength, plus what
   its rank adds, plus every card line that adds strength with no condition.
   Terrain, fortification, a general's aura and conditional card lines do not
   count. (`armyStrength` exists and leaves out ranks today.)

Not ruled: the Claude session suggested that the "age reached" line should not
count on the bar, because it pays every seat alike. Leave it in unless the
user says otherwise.

New weights are Astra's to propose from bot games: what share of a score each
line makes at the close of each age.

## 4. The dealt wagers

Twelve, all approved by the user. Each reads one number that the player can
see. A wager marked "over the age" needs a counter that runs from the first
turn of the age and is shown on the wager.

| Group | Wager | Reads |
|---|---|---|
| Engine | The sum of your six yields | Now |
| Engine | Science and culture gained | Over the age |
| Engine | Faith and gold gained (gross, not net of spending) | Over the age |
| Engine | Gold and faith spent | Over the age |
| Cities | Total population | Now |
| Cities | The highest production of one city | Now |
| Cities | Buildings finished | Over the age |
| Land | Improved hexes | Now |
| Land | Different luxuries held | Now |
| Land | The yields of your trade routes | Now |
| People and arms | The yields from your great people (their hexes and legacies) | Now |
| People and arms | The total combat strength of your army (the same reading as the score line) | Now |

Guards, each a small rule: spending counts purchases only, and selling or a
refund subtracts; an improvement that the seat pillaged itself does not count
again when rebuilt; a "now" wager is reached on the first turn that the
number is at the mark, and stays reached.

Cut by the user: The Field of Glory, the largest single payout.

## 5. Where the marks go

Nobody sets a mark by hand. The user: "Once we decide on the right format,
i'd like to do an optimization loop on the bots, and then decide the right
numbers based on the bots."

- Measure, for the score and for each wager, the figure of every seat at the
  close of each age, across seeds and seat counts.
- First rule to try: low at the figure that three seats in four reach, middle
  at the figure that half reach, high at the figure that one seat in six
  reaches.
- Check the result against the door: a seat that plays well and picks the
  middle mark each age should hold 7 beads during age IV; a seat that picks
  low every time should fall short.

## 6. Screens (the Claude session)

- The score as one figure in the top row, with `explainScore`'s list on
  hover.
- The age I bar: small, with its three marks, and a one-time note when the
  first mark is passed.
- The sheet where a seat picks a wager and a mark when an age opens: three
  cards, each with the number now, the three marks and the beads.
- The picked wager as the same small bar for the rest of the age.
- Astra provides the readings: the offer for a seat, each wager's number now
  and its marks, the pick, and whether a mark was reached.

## 7. Kept for later, not for this build

- Score with two marks only (at most 2 beads), so that the dealt wagers are
  the way to 3. The user: "i like that as a solution for later."
- One more bead for beating every rival on the wager that you picked.
- A soft door: each missing bead adds to the price of the Opus.

## Score readings for calibration

- Read `standingArmyStrength(state, playerId)` for the army wager and the
  army score line. It uses the roster's combat strength for land and naval
  units, including ranged units. Each unit adds its rank bonus and applicable
  card bonuses that apply in both attack and defence. A training stamp and
  a separate ranged attack value add no points.
- Read `rivalUnitsAndCampsDefeated(state, playerId)` for the other new line.
  It sums `unitsKilled` and `campsCleared`. A barbarian unit kill adds no
  points. Clearing its camp adds one to the count.
- Pass candidate weights as the third argument to `explainScore` when
  measuring the share each line contributes. The two fields are `perDefeat`
  and `perArmyStrength`. The default score omits those two lines until the
  weights are chosen.
- The lifetime score uses the Ledger's yield payments at collection each turn.
  The deck keeps its existing rows. Sources outside its Ledger class have
  their own rows, so an ordinary building or tile can share a class with a
  scored source without adding its income to the score. Technology effects
  and luxury signatures count. The current In play screen has no entries for
  those two sources.

## Candidate integration

The integrated engine uses schema 267. Ordinary configurations keep legacy wager dealing while calibration is pending. They already use the redesigned score and army reading. These can change final scores and the outcome of legacy army wagers. Measurement mode uses those same readings. Run policy comparisons on a fixed rules version. Measure marks with the selected bot policy on the integrated rules. The legacy rows carry `retired: true` for the new rules. The old game mode still uses their original eligibility.

- Set `GameConfig.wagerSetup` to `{ mode: 'measure' }` to collect age opening and closing readings. This adds no milestone deal or RNG draw. Ordinary legacy deals still occur. Read `state.wagerBook.ages` after play. Each closing seat record includes all thirteen readings, the raw defeat and army values, and the score breakdown. The winning command also closes an unfinished age.
- To try calibrated rules, pass `{ mode: 'calibrated', calibration: { weights, marks } }`. Supply both proposed score weights and three strictly increasing positive marks per reading. Age I requires score only. Each later age requires all thirteen readings. The game checks the whole payload before map generation and copies it into the normalized replay config. No production weight or mark ships with this candidate.
- For difficulty tests only, the candidate setup accepts `humanMarksPercent`. Ordinary config validation still admits only implemented difficulty tiers. Once the difficulty table admits tier 13, human bars at and above that tier use the increase in the milestone data. Bot bars keep the calibrated marks.
- In Claude's screens, use `milestoneOffer(state, playerId)`. It returns the age, opening and closing turn, each option's reading and marks, the seat's pick, and the turn it reached each mark. The command is `{ type: 'chooseWager', playerId, age, index, mark }`. Marks use indices zero, one and two. The age field protects against a click on an expired offer. The old wager sheet uses the old command payload.
- The bot considers all nine choices. It uses the preceding age's growth, the time left and the existing Arena settings `wager.ageTurns` and `wager.driftWeight`. The highest projected achievable bead award wins. If the projection reaches no mark, it picks the closest. The decision report includes the forecast, the mark and its reward.
- Wager bead families use the provisional mapping in `data/wagerMilestones.json`. It chooses the Abacus rod. The door and the bot use the bead count.

### What the counters record

- Gross income uses actual positive payments to the gold, faith, science and culture banks. The collection phase counts the staged city payments and empire income excluding bills. Other writers include project conversions, discoveries, camp bounties, pillage, plunder, religious payments, paid great-person acts, bead boons, card windfall grants, and beakers granted to a specific technology. Switching technologies and restoring saved research progress gives no income. A diplomatic transfer and a lost-wonder refund give no gross income.
- Purchases use `buyWithGold` and `buyWithFaith`. Faith uses the amount actually charged. Rites paid through ordinary spending and contributions to a build have no purchase price for this reading. In a diplomatic exchange, a lump paid for resources, cities or passage adds to the buyer's purchases and subtracts from the seller's. The wonder refund subtracts from purchases.
- The buildings counter uses `realiseItem` when the building actually joins the city. Production, including production windfalls, and purchases count. Wonders count. Free grants and captured buildings give no completion. This is the implementation reading of “buildings finished”.
- Improvements count functioning owned works at the time of the reading. Pillage removes the work and repair restores that one hex. Once a wager pays, restoring a work cannot pay it again. A luxury uses the seat's counted luxury kinds. Domestic deliveries and international receipts use their actual route yield lines. Great-person yields use the Ledger's people class.

### Screen integration and calibration

- Read the current score with `foldScore(explainScore(state, playerId))`. Use the same list for the hover text.
- Read `milestoneOffer(state, playerId)` to draw the bar and options. A null result means the milestone screen does not apply. In Age I show the score option and its three marks. Compare the previous and current `reached` lists for the first-mark notice. Use each entry's turn to identify the event.
- In Ages II through IV, `milestonePickNeeded(state, playerId)` controls the choice sheet and turn blocker. Preserve the option index from the offer when sending the choice. After the pick, use its metric and mark to draw the bar. A closed age carries its final reading.
- Finish the bot optimization loop before measuring marks. Run measurement games across seeds and seat counts. Keep the seat, age, and whether the game ended early with each sample. Report each score line's share and propose the two new weights. Recalculate the closing scores with the proposed weights before calculating score marks.
- For each age and reading, report the sample size, mark and actual fraction of seats that reach it. Flag zero or repeated quantiles for a decision. Check the proposed marks in calibrated games with new seeds. Check the Opus door and low versus middle choices against section 5 before enabling the new rules in ordinary games.

### Earlier replay check on the schema 261 candidate

This check covered the isolated schema 261 candidate before integration with the later rules. The retained six-seat, 120-turn logs used seed 20260831. Both logs replayed to completion on the release and candidate rules.

- The duel log had 6,966 commands. The release digest was `4172463b:393230`. The candidate digest was `94135bed:410687`.
- The standard log had 7,293 commands. The release digest was `64733584:1087655`. The candidate digest was `f00f39a6:1106620`.

For each comparison, the check set the candidate's `schemaVersion` to 260 and removed each player's `statecraft.inPlayYieldTallies`. The resulting JSON matched the release snapshot byte for byte. This comparison describes those two command logs. Other games can take a different course when the new army reading changes a legacy wager.

### Running calibration after bot policy selection

Use the worktree that contains both the candidate rules and the selected bot code. Start with `scripts/wagerCalibration.example.json`. Its seeds, leaders, board sizes and turn cap illustrate the input. The example starts with three training seeds and three different validation seeds. Both groups run three-seat and six-seat games on the same map size. This gives six training games and eighteen validation games across the three pick strategies. Each complete training age has 27 seat readings from six games. Seats share their map and opponents. Treat those six games as the independent runs when assessing uncertainty. Expand the seed lists if few games finish an age, a mark depends heavily on one seed, or the marks coincide. Record the observed wall time on the first complete game to estimate the remaining run time. The lists must be disjoint. Set `policy.name` to the selected policy. Optional `policy.settings` takes Arena settings applied after each seat's persona. Use a fresh output directory for a new policy or study.

Run these commands from the repository root, one at a time. Replace `manifest.json` with the study file and `/tmp/wager-study` with the output directory.

```sh
npx vite-node scripts/wagerCalibration.ts measure manifest.json /tmp/wager-study
npx vite-node scripts/wagerCalibration.ts fit manifest.json /tmp/wager-study
npx vite-node scripts/wagerCalibration.ts validate manifest.json /tmp/wager-study
```

- **Measurement.** The runner plays one training game at a time. Each seed uses every requested board and seat count. It rotates the list of leaders by seed. Each game file records the raw readings by seat and age, along with each closing score line and the two military counts. Seats whose game ends in victory have a labelled final sample. A turn limit leaves the unfinished age open. The fit excludes that unfinished sample. A stalled game or a bot warning stops the run. Completed games can be reused after an interruption. `plan.json` records the manifest, source revision and a hash of the simulation, bot, data and calibration code.
- **Proposal.** For a first comparison, the fit prices each new military line like a typical positive existing score line. Within each age it takes the median of the existing lines' mean positive contributions. It averages these four reference values with equal weight per age. Each proposed weight divides that reference by the corresponding mean count, also averaged equally across ages. This is an analysis choice for review. The score sheet's own rounding applies to each new line before the score marks are calculated. `proposal.json` reports every line's mean points and share by age. Each mark is the highest observed figure reached by at least the target fraction of seats. The report includes the count and fraction actually reaching it. Zero, negative or coincident marks and missing age data require review before a calibrated game can run.
- **Held-out validation.** Each fresh seed runs three times with the same map and seats. One game uses normal bot picks. In the other two games each seat chooses its best wager at a fixed low or middle mark. Payoffs use the real command, rules and turns. Game files show all seats, scores, winners, picks, payout turns, immediate payouts, total beads and the turn each seat reached the Opus bead threshold. `held-out.json` reports actual age-end reach fractions with the fitted marks, the number of seats observed in Age IV, and how many reached the door during or before that age. It counts unfinished Age IV observations separately. Use the per-seat scores and winner flags to inspect the user’s “plays well” condition. A winner or a score rank is an observation, not a new rule of play.
