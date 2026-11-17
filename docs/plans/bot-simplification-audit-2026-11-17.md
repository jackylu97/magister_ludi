# Bot simplification audit, 2026-11-17

`docs/flags.md`, the bullet "After BP15: bots that decide in parallel, and a simplification audit of the bot's logic". The user: *"what other things could we do to improve bot performance? Could you do a pass looking through the logic, and seeing if any of it could be simplified?"*

This audit is read-only. It changes no code, data or test. Nothing is removed until the user picks from it.

## Summary

1. **Ask the beeline only when its inputs change.** The research goal table costs 15% to 16% of bot time and changes the plan in 1 sitting in 8 to 10. A rule "ask after a technology, a town, a war or the council changed" keeps 87% to 94% of the re-aims and asks in 4 sittings of 10. Saving: about 9% of bot time. Play changes a little.
2. **Ask diplomacy once a sitting.** It runs on every decision (4,564 and 6,293 asks a game) and answers 44 and 64 times. Asking at its first chance in each sitting keeps 72% to 77% of the answers (the rest wait one turn) for 10% to 13% of the cost. Saving: about 4% of bot time.
3. **Keep the spend arm's "nothing to buy" answer for the sitting.** After the first decision it costs about 5% of bot time and buys on 6% of asks. A memo keyed on the purse, the reserve and the route slots gives the same answers. With `reachOf`'s second price fold: about 6% of bot time, exact.
4. **Fix the heal arm for a dug-in piece.** `restAndHeal` returns nothing for a hurt piece that is already fortified, so the hunt and the campaign call it out and the fall-back arm walks it home. On seed 999 this is 82 of the 240 orders that flip back to an earlier target within three turns. A one-line fix; play improves.
5. **Remove the knobs that do nothing before the tuner runs.** About 20 tunable rows are dead, unreachable in a bot game, inert at today's values, or the same knob twice (K1 to K6). The sweep (K7) names more rows that changed no command. The search shrinks from 173 dimensions to about 155, and to about 140 if the quiet switches are frozen.

Together, items 1 to 3 save about a fifth of bot time, which is about 15% of a whole turn. They overlap with BP15 in places; each section says where.

## Method

- **Tree.** A clean detached worktree of `decks` at `52931907` (the bot and simulation code equal BP14's commit `f24c69e3`), and a scratch copy with counters. Both were outside the repo and were removed at the end.
- **Games.** The end check's game: six seats with two decks each, standard map, barbarians on, five personas. Seeds 42 and 999, turns 1 to 100. Two game processes at a time at most, each behind `nice -n 15` and `caffeinate -i`.
- **Play unchanged by the counters.** Every counted game reached the stored digests of `/Users/jacky/code/webciv-baselines/bdc74737/six-seat-standard-t100/` (seed 42 `511f35d6:843434` at turn 50 and `813871d0:954523` at turn 100; seed 999 `0186e46d:852974` and `796792fe:1011270`). No command was refused.
- **Counters.**
  - Each top-level arm of `decideNext` and `housekeeping` (`src/ai/bot.ts`) was wrapped: asks, answers (a command, not `null`), CPU milliseconds, and which arm made the decision.
  - The parts of `valueContext`, `techGoalTable` and the decision groups (first, middle and last decision of a sitting) were timed.
  - One line was written for each sitting: what changed since the seat's last sitting, and each decision's arm, command, and whether diplomacy and the beeline were asked and answered. Simple rules were then tested offline against these lines.
- **Knob sweep.** For each of the 173 rows of `data/ai.bounds.json`, the knob was set to its minimum and its maximum through the arena's tuning seam (`setAiTuning`, folded under each persona). Seven turns were played from three stored snapshots (seed 42 turns 30 to 32, seed 999 turns 60 and 61, seed 42 turns 90 and 91), and every command was compared with the untuned run. The knobs that changed nothing were played again over 25 turns (seed 42 turns 30 to 49, seed 999 turns 90 to 94). The untuned run was played again at the end of each process and gave the same commands.
- **Profiles.** BP14's profiles of the BP14 tree (`final-new-*.cpuprofile`, seeds 42 and 999, turns 90 to 100 and 120 to 130) were read again by function name.
- **Code reading.** Four read-only reviews of the code (unit orders; the economy arms; the appraisal and the council; the knobs and diplomacy). Each finding below that comes from reading only is marked "read in code".
- **Three counted runs.** The first counted the arms, the second the parts of `valueContext` and the decision groups, the third wrote the sitting lines. Their counters cost different amounts, so one arm's share differs by up to a point between them. Each table says which run it is from.
- **Words.** *Bot time* is CPU time inside `nextBotDecision`. It is 72% to 78% of a whole turn (BP14's profiles; 365 of 467 CPU seconds in the five stored games). A *sitting* is one seat's run of decisions in one turn. An arm *answers* when it returns a command.

### Where bot time goes, turns 1 to 100

From the second counted run.

| | Seed 42 | Seed 999 |
|---|---:|---:|
| Decisions; sittings | 5,085; 600 | 6,885; 600 |
| Bot CPU seconds | 78.2 | 96.1 |
| First decision of a sitting | 44.6% | 40.9% |
| Middle decisions | 42.8% | 48.6% |
| Last decision (answers nothing and ends the turn) | 12.6% | 10.5% |
| `valueContext` (built once a sitting, 600 times) | 40.5% | 36.4% |
| of it the want book (`wantBook`) | 18.3% | 17.7% |
| of it the trade reading (`routeOutlook`) | 9.4% | 7.5% |
| of it the chains (`liveChains`) | 8.6% | 7.5% |
| The research goal table (`techGoalTable`) | 17.1% | 16.1% |

A part's time includes the first reading of any memo on the economy clock that it is the first to ask, so the parts that run early in `valueContext` read a little high. BP14's late profiles put `routeOutlook` at 1.7% to 4.0% of the whole turn.

Arms, from the first counted run. Asks / answers / share of bot time:

| Arm | Seed 42 | Seed 999 |
|---|---|---|
| `answerBlocker` (units, towns, offers) | 2,807 / 2,666 / 29.9% | 3,898 / 3,682 / 31.5% |
| `spendCommand` (holds the first `valueContext` build) | 4,901 / 337 / 34.0% | 6,669 / 376 / 30.8% |
| `reaimBeeline` | 891 / 63 / 17.0% | 983 / 78 / 16.0% |
| `diplomacyDecision` | 4,564 / 44 / 4.7% | 6,293 / 64 / 5.2% |
| `reaskTheMarch` | 1,569 / 678 / 4.6% | 1,800 / 817 / 4.4% |
| `wakeTheCampaign` | 1,775 / 16 / 0.2% | 2,445 / 482 / 2.4% |
| `reslotDecision` | 637 / 37 / 1.9% | 638 / 38 / 2.1% |
| `slottingDecision` | 716 / 79 / 1.1% | 721 / 83 / 1.5% |
| `walkWithSettlers` | 1,984 / 157 / 1.5% | 2,707 / 205 / 1.5% |
| `disbandCommand` | 4,901 / 0 / 1.4% | 6,682 / 13 / 1.4% |
| `wakeTheHunt` | 1,759 / 190 / 1.2% | 1,963 / 163 / 0.7% |
| `wakeIdleSettler` | 1,794 / 19 / 0.6% | 2,479 / 34 / 0.5% |
| `adoptionTable` | 13 / 13 / 0.4% | 14 / 14 / 0.4% |
| `focusCommand` | 828 / 112 / 0.3% | 905 / 184 / 0.4% |
| `guardWorkers` | 1,827 / 33 / 0.1% | 2,502 / 23 / 0.2% |
| `wakeIdleWorker` | 2,554 / 41 / 0.2% | 3,518 / 29 / 0.2% |
| `projectIdleCommand` | 1,984 / 0 / 0.0% | 2,707 / 0 / 0.0% |
| `levyDecision` | 828 / 0 / 0.0% | 905 / 0 / 0.0% |
| `retireCommand` | 828 / 0 / 0.0% | 905 / 0 / 0.0% |

## All findings

Gains are shares of **bot time** unless the row says "turn". "Exact" means every answer stays the same and the digests hold. Sizes: S small, M medium, L large.

| # | What | Where | Evidence | Speed gain | Knobs or lines | Play | Risk | Size |
|---|---|---|---|---|---|---|---|---|
| 1 | The beeline is asked in every sitting; it re-aims in 1 in 8 to 10 | `reaimBeeline`, `techGoalTable` (`bot.ts`) | Measured: 15% to 16% of bot time; 94% of it is the first ask of each sitting; 63 and 78 re-aims in 600 sittings | about 9% | none | a little | low | S |
| 2 | Diplomacy is asked on every decision; it answers on 1% | `diplomacyDecision` (`diplomacy.ts`), called in `decideNext` | Measured: 4.4% to 5.0%; 44 and 64 answers | about 4% | none | a little | low | S |
| 3 | The spend arm rebuilds its whole answer on every decision | `spendCommand`, `bankSpend` (`bot.ts`) | Measured: 5.1% to 5.3% after the first decision; buys on 6% of those asks | up to 5%, exact | none | no | low | S |
| 4 | `reachOf` folds each purchase price twice | `reachOf` (`wants.ts`), `purchaseGate` (`purchase.ts`) | Read in code; `reachOf` is about 4% of a late turn (BP14) | about 1% to 2% of a turn, exact | none | no | low | S |
| 5 | The heal arm is silent for a hurt piece that is already dug in | `restAndHeal` (`bot.ts`) and its callers `wakeTheHunt`, `wakeTheCampaign` | Measured: 82 of 240 target flips on seed 999, 13 of 159 on seed 42 | fewer orders | none | better | low | S |
| 6 | The council stamps every bench card that fits every chair | `slottingDecision`, `reslotDecision`, `adoptionTable` (`council.ts`) | Profile: the council is 12% to 27% of a late turn; a stamp costs 3 to 35 ms and a walk 0.2 ms (BP3, BP6) | a third to a half of the council's share (estimate) | none | a little | low to medium | S |
| 7 | A re-seat swaps on any gain; the slot arm seats a card worth zero or less | `reslotDecision`, `moveToCountedChair`, `slottingDecision` | Read in code; measured: 37 and 38 unseatings a game, none within 3 turns of the seating, 9 and 14 within 10 turns | fewer stamps after a swap | none | a little | low | S |
| 8 | A stamped card counts the science and hammer premiums twice | `beyondTheStamp`, `todayContext` (`value.ts`); `hammerPrice`, `sciencePrice` (`prices.ts`) | Read in code and checked: the today context drops the chains, so the hammer price falls to the band floor; a flat production card reads about 1.5 times its pay | 1% to 3% (one walk fewer, estimate) | none | yes, less bias | medium | S |
| 9 | Five memos guard a recursion; two of them guard none | `faithPrice` (`prices.ts`), `malicePrice` (`wager.ts`); `chairReading`, `handRuleWorth`, `widerFitWorth` (`value.ts`) | Read in code by two reviews independently; BP14 counted 19 answers in 5 turns that depend on which arm asked first | 2% to 4% of a turn with a two-level price (estimate) | about 80 lines | a little (8 cards) | medium | M; S for the two |
| 10 | The trade reading prices every ordered pair of towns before the gate | `routeOutlook`, `pricedPairs` (`routes.ts`) | Profile: 1.7% to 4.0% of a late turn; census: 7.5% to 9.4% (first-reader cost included) | 1% to 3% (estimate) | none | almost none | low | S |
| 11 | The campaign plan is built for every soldier before the clauses that read it | `soldierCommand`, `campaignPlan` (`bot.ts`), `musterHex` (`campaign.ts`) | Profile: 0% to 1.1% of a late turn, more in war turns | under 1%, exact | none | no | low | S |
| 12 | Smaller repeated work per unit and per row | `nearestHostile`, `rangedFriendReady`, `guardWorkers`, `screenMarch`, settler route searches, `siteClaims`; `hammerPrice`, `levyReading`, `frontRowWorth`, `isOpusTown`; `strikeForce` twice in `explainDeclaration` | Read in code; each under 1% in the profiles | 1% to 3% together, exact | none | no | low | S each |
| 13 | Labels and sentences are built for every term and candidate | every arm; `explainSiteValue`, `rankPlanFor`, `slottingDecision` | Measured: 12 candidates and 31 terms a decision on average, 81 candidates on a purchase; cost not measured | not measured | none | no | medium | L |
| 14 | A soldier has three prices; only the build list charges the wage | `unitRoleValue`, `garrisonWorth` (`bot.ts`), `faithRowTerms` (`wants.ts`) | Read in code | none | fewer readings | yes | medium | M |
| 15 | The guard plan is fixed for the sitting, but the escort plan can take its soldier; an escort chase skips the heal arms | `guardPlan`, `workerGuard`, `readEscortPlan`, `walkWithSettlers` (`bot.ts`) | Read in code | none | none | better | low | S |
| 16 | A worker has two danger readings; the older one overrides the newer | `workerCommand`, `workerGuard`, `civilianDanger` (`bot.ts`) | Read in code; worker targets flip 57 and 58 times a game (BP15 is changing this arm) | none | none | yes | medium | S |
| 17 | No arm adds a defender to a town with a raider beside it | `garrisonOwed` (`campaign.ts`) and its four readers | Read in code; BP8's open item (32 cases in six games) | none | none | better | medium | M |
| 18 | Three copies of "lays ground", one missing the inquisitor | `isPlainBuilder` (`bot.ts`), `laysGround` (`plan.ts`), `isBuilder` (`arenaPage/run.ts`) against `buildsImprovements` (`improvements.ts`) | Read in code by two reviews; measured: no bot held an inquisitor in five snapshots (turns 60 to 120) | none | about 40 lines | only when it happens | low | S |
| 19 | The faith book's fallback buys a piece no arm uses | `faithRowTerms` (`wants.ts`) | Read in code | none | none | rarely | low | S |
| 20 | A trader put to sleep is never asked again | `traderCommand` (`bot.ts`), `routeOutlook`'s `idle` count | Read in code; measured: no idle or sleeping trader in five snapshots | none | none | only when it happens | low | S |
| 21 | A ruin's boon is always option 0 | `discoveryDecision` (`council.ts`) | Read in code | none | none | yes | low | S |
| 22 | A seat can declare war and propose peace a turn later | `explainDeclaration`, `peaceDecision` (`diplomacy.ts`) | Read in code; measured: 1 of 6 wars in two games (seed 42, seat 4, turns 93 and 94) | none | none | yes | low | S |
| 23 | For a bot receiver, the swap's price never decides | `writeSwap`, `receiverReader` (`diplomacy.ts`), the rival callback in `decideNext` | Read in code; measured: no rival context was built in two games | none | about 40 lines | no | low | S |
| 24 | A draft pick prices a card as if it sits; the draft plan charges the bench | `orderDecision` (`council.ts`) against `draftPlan` (`wants.ts`) | Read in code | none | none | yes | medium | S |
| 25 | "A card in a hand" is priced six ways | `draftPlan`, the pass, `chairReading`, the hand rules, the foreign card, the Doctrine offer | Read in code | small | about 40 lines | a little | low | S |
| 26 | Five one-town contexts skip the shared memo | `value.ts` (four places), `wants.ts` (one) | Read in code | under 1% | none | no | low | S |
| 27 | A town headed by a project reprices its whole build list on each housekeeping pass | `projectIdleCommand` (`bot.ts`) | Measured: 0.0% to turn 100, 0.1% at turn 120 | none now | none | no | low | S |
| K1 | `workers.planRadius` is read by nothing | `aiConfig.ts`; no reader | Read in code; sweep: no command changed | none | 1 row | no | none | S |
| K2 | 22 knobs are read only on paths a bot game cannot reach | retired cards; papers only a person writes | Read in code; sweep agrees for the 5 with rows | none | 5 rows (22 leaves) | no | low | S |
| K3 | 8 knobs are inert at today's values | `favourableBlow`, `garrisonOwed`, `deckTerms`, `meterFloorRefusal` | Read in code; sweep: no change in 32 turns for `military.wildAggression`, `score.deck.shareCap`, `war.luxuryGoldBaseline`; `military.siegeStrikeFloor` acts only above 0.3 (changed at 0.75 and 1.5) | none | up to 5 rows | no | low | S |
| K4 | Knobs that always act together | the two army mixes, the war score's scale, the declare bar and `military.aggression`, the siege floor, four flat age rows | Read in code | none | about 7 rows, 4 rows to scalars | no | low | S |
| K5 | Persona overrides that do nothing | `wager.familyLean` in wide, tall, warmonger; the warmonger's two mixes | Read in code | none | 12 leaves, 4 leaves | no | none | S |
| K6 | Bounds that the tuner cannot use well | `growth.allFocusSheets`, small integer ranges, switches at zero, hidden thresholds | Read in code | none | none | no | low | S |
| K7 | Knobs that changed no command at either bound | the sweep, two seeds | Measured: 68 of 173 changed no command in 32 turns; 12 of them feed common decisions | none | candidates to freeze for the first run | no | none | none |
| C1 | Code behind switches that are off | `marginFocusCommand`, `focusTable` (`bot.ts`) | Read in code | none | about 400 lines | no | low | S |
| C2 | Effect shapes that only retired rows use | `scoreEffect` arms and helpers (`value.ts`) | Read in code and a scan of the card data | none | 300 to 400 lines | no | low | M |
| C3 | Unreachable branches and unused exports | `frontRowWorth`, the project race clauses, `unitTerm`'s settler branch, `holdAfterStepBack`'s last sleep; `settlerReading`, `escortReading`, `focusReading` | Read in code | none | about 150 lines | no | none | S |
| C4 | Docblocks that describe code that is gone | listed in the C4 section | Read in code | none | none | no | none | S |

## The top findings

### T1. Ask the beeline only when its inputs change (finding 1)

**Today.** `reaimBeeline` sits in `housekeeping`. Every decision that reaches it asks `researchCommand`, which builds `techGoalTable`: about 50 goals, each priced by `techChain`. The bound `driver.reaimsPerTurn` (1) counts re-aims, not asks. The answer is "keep the plan" in most sittings.

**Measured** (the third counted run, every sitting of turns 1 to 100):

| | Seed 42 | Seed 999 |
|---|---:|---:|
| Asks; re-aims | 891; 63 | 983; 78 |
| Table CPU, share of bot time | 12.4 s, 15.8% | 14.8 s, 15.4% |
| Of it, the first ask of each sitting | 94% | 95% |
| Re-aims on the first ask of the sitting | 63 of 63 | 78 of 78 |
| Sittings whose first ask is the last decision (it answered nothing) | 396 | 350 |
| Sittings after a technology was finished | 130 (51 re-aims) | 149 (60 re-aims) |
| Sittings where only the hostile units near the towns changed | 140 (1 re-aim) | 120 (4 re-aims) |
| Sittings after no change of technology, towns, wars, council or nearby hostiles | 234 (3 re-aims) | 228 (6 re-aims) |

"Changed" compares the seat's state at the first decision of a sitting with its state at the first decision of its last sitting. The table is computed once a sitting in practice, because later asks reuse the context's memos. So a cap on asks would save almost nothing. What costs is asking in sittings where nothing the goal reads has moved.

**The simpler rule.** Ask the beeline only in a sitting where, since the seat's last sitting, a technology was finished, the town count changed, a war started or ended, or the council (a slotted card or the government) changed. The research blocker (an empty plan) still asks it every time.

**Agreement, offline on the census:**

- That rule asks in 38% (seed 42) and 42% (seed 999) of sittings. It keeps 59 of 63 re-aims (94%) and 68 of 78 (87%).
- Adding "hostile units near a town changed" and "a council, founding or war command earlier in this sitting" asks in at least 61% and 62% of sittings and keeps 60 of 63 and 74 of 78 (95%).
- A re-aim that is missed waits for the next sitting with a trigger, usually a few turns. The plan it keeps is the old goal's road, which is still a legal and coherent plan.
- Saving: about 60% of the table's cost with the first rule, about 9% of bot time (7% of a turn). About 38% of it with the wider rule, about 6% of bot time.

**Overlap with BP15.** BP15 takes "the research goal table from data it already has" (each ask cheaper) and "no work in the last decision that only ends the turn". In 396 and 350 of 600 sittings the first ask of the table was in the last decision. If BP15 drops the beeline from the last decision, those sittings stop asking at all, which is a trigger rule chosen by accident. This rule chooses it on purpose. Coordinate with BP15's result before building it.

**How to prove play is not worse.**

- Run the five stored seeds (42, 999, 1, 7, 2026) to turn 100 and compare with `bdc74737`'s stored games: towns, citizens, the six yields, techs known, and the turn each age opens. Use BP14's paired figure (the geometric mean of the per-seed ratios with a 95% t interval).
- Count re-aims sent a turn late, and the beakers stranded by them.
- Time it with BP14's `pair.ts` on the turn-90 and turn-120 snapshots of seeds 42 and 999.

**For the user.** No ruling covers when the beeline is asked. The `researchCommand` docblock argues for asking every turn ("idempotence by construction"); that argument is about correctness, and the trigger rule keeps it. The decision is whether a re-aim may wait a few turns for speed.

### T2. Ask diplomacy once a sitting (findings 2, 12, 22, 23)

**Today.** `decideNext` asks `diplomacyDecision` before the blockers on every decision (`bot.ts` line 1845). It runs five arms: answer proposals, peace, raze, declare, swap. Each arm is monotone (a war cannot be declared twice, a standing paper is refused), so asking often is safe but costly.

**Measured** (the second and third counted runs):

| | Seed 42 | Seed 999 |
|---|---:|---:|
| Asks; answers | 4,564; 44 | 6,293; 64 |
| Share of bot time | 4.4% | 5.0% |
| Answers at the first decision of a sitting | 8 | 13 |
| Answers at decisions 2 to 5 | 30 | 39 |
| Answers at decision 6 or later | 6 | 12 |

Most answers come at diplomacy's first ask in the sitting (34 of 44 and 46 of 64). That ask is often not the sitting's first decision: offers, the disband arm and purchases come before diplomacy, and they made the first decision in 251 and 288 of 600 sittings.

**The simpler rules, tested offline on the census:**

| Rule | Answers kept, seed 42 | Seed 999 | Cost kept |
|---|---:|---:|---:|
| Ask once a sitting (its first ask) | 34 of 44 (77%) | 46 of 64 (72%) | 10% to 13% |
| After a null answer, ask again only after an accepted command that moves gold, a war, a deal or a town (attack, purchase, route, tile, rite, found, disband, raze, any diplomacy command) | 35 of 44 (80%) | 50 of 64 (78%) | 21% to 24% |

- An answer that is missed waits for the seat's next sitting, one turn. A deal answered a turn later is still answered: the proposer's paper stands.
- Saving: about 3.5% to 4.4% of bot time.
- An exact form exists (skip while a fingerprint of the inputs is unchanged: wars, peace flags, proposals, unit and town counts by owner). The second rule above misses 9 and 14 answers whose inputs changed through commands outside its list, so the fingerprint must be wide. Build the once-a-sitting rule first and measure the exact form only if the missed answers matter.

**Smaller simplifications in the same arm** (read in code):

- `strikeForce` runs once in `explainDeclaration` and again for each war in `explainAdvantage`.
- For the tall and zealot personas (`declareThresholdPeaceful` 999) the rival loop builds rows only for the spectator feed. Skip the loop when the bar cannot be met.
- `campaignRoad` can run up to 12 path searches again on each decision for a rival that clears the bar but fails the road. Keep the answer for the sitting.
- **Finding 23.** For a bot receiver, the swap's verdict never depends on the price: the receiver's total cannot go below zero, so the verdict is the "last copy" clause alone. The receiver's reading (`receiverReader`, the rival callback in `decideNext` that builds a full `valueContext` for a rival) can go, about 40 lines. It built no context in either game, so there is no speed gain on these seeds. Pin the reduction with a test, so a future paper term that costs the receiver brings the price back.
- **Finding 22.** `explainDeclaration` never asks the peace score, and the war score reads lifetime losses. A seat can declare and sue at once. Measured: 1 of the 6 wars in the two games (seed 42, seat 4 declared at turn 93 and proposed peace at turn 94). Simple fix: do not declare on a target whose peace score is already under `war.sueFloor`.

**How to prove.** As T1. Also count deals accepted, wars, and war length over the five seeds.

**For the user.** No ruling covers how often diplomacy is asked. The surprise-war ruling (the `decideNext` comment: "a surprise war is legal (the ruling, section 2)") puts diplomacy before the blockers so that a declaration can be acted on in the same turn. Asking once a sitting keeps that order for the first ask.

### T3. Keep the spend arm's empty answer for the sitting (findings 3 and 4)

**Today.** `spendCommand` runs on every decision, before the blockers. `bankSpend` walks every gold, faith and culture want, asks `purseOf` for each (which reads the card spend floor), and builds a candidate or a refusal sentence for each. Usually the best row loses to the bar (the best "hold" row) before any live gate is asked, and the whole list is thrown away (read in code).

**Measured.** After the first decision of each sitting the arm costs 5.1% (seed 42) and 5.3% (seed 999) of bot time and buys on 224 of 3,931 and 245 of 5,688 asks.

**The simpler form, exact.**

- Find the best buyable row and the bar from the numbers, and build the candidate list only when a command goes out.
- Keep a null answer that was reached before any gate, keyed on the purse in each bank, `goldReserveFor` and `usedRouteSlots`. Nothing else feeds that answer, because the book and the bar are fixed for the sitting (`BotSitting.ctx`).
- `reachOf` (`wants.ts`) folds `explainPurchaseCost` again after `purchaseGate` already folded it (`clausesBeforeTheBank`, `purchase.ts`). Return the price from the gate. This is a small change to the simulation's interface, also exact.

**Gain.** Up to about 5% of bot time for the memo, and 1% to 2% of a turn for the price. No play change: the digests must hold.

**How to prove.** The two digest pins (`test/sim/aiDigest.slow.test.ts`), the stored digests of seeds 42 and 999 at turns 50 and 100, and a shadow check that asks fresh and compares, as BP14 did for its memos (`setDecisionMemoShadow`).

**For the user.** Nothing to decide. This is BP15's kind of cache, and it is not on BP15's list.

### T4. The heal arm and the dug-in piece (finding 5)

**Today.** `soldierCommand` asks `restAndHeal` first: a piece under `military.healBelowHealth` on its own ground digs in. But `restAndHeal` also returns nothing when `fortifyError` refuses the order, and for a piece that is **already fortified** it always does ("is already fortified", `combat.ts`). So for a hurt piece that has dug in, the arm falls through to the escort, the blows, the camp march and the campaign.

- `wakeTheHunt` and `wakeTheCampaign` ask exactly these pieces: they wake dug-in or sleeping soldiers and send any march the soldier arm names.
- So a hurt piece is called out to a camp or a muster. On ground the seat does not own, below `military.withdrawBelowHealth`, `fallBackAndHeal` walks it home. It digs in, and the next turn it is called out again.

**Measured.** An order "flips" when a unit's target returns to the target of its order two before, with a different target between, inside three turns.

| | Seed 42 | Seed 999 |
|---|---:|---:|
| Move orders | 1,820 | 2,720 |
| Flips | 159 | 240 |
| Hurt piece: the hunt calls it out, the fall-back walks it home | 6 | 51 |
| Hurt piece: the campaign calls it out, the fall-back walks it home | 1 | 27 |
| Hurt piece, other | 6 | 4 |
| Workers (BP15 is changing this arm) | 57 | 58 |
| Settlers (on seed 42 mostly a step out of a town against a march to a site) | 35 | 14 |
| Soldiers, other | 54 | 86 |

**The simpler form.** `restAndHeal` answers "stay" for a hurt piece that is already dug in on its own ground, the same answer as for one that is not yet dug in. The hunt and the campaign already drop a non-march answer, so they leave the piece to mend. No new rule: the heal arm's order (first, before every march) then holds for every caller, as its docblock says.

**Also in this family** (read in code, finding 15): `walkWithSettlers` calls `escortDuty` directly and skips the two heal arms, so a soldier below `healBelowHealth` can be sent to chase a settler. Route it through `soldierCommand`, as `guardWorkers` does.

**How to prove.** The five seeds to turn 100: soldiers lost, camps cleared, the flip count above, and the yields table. A test: a fortified piece at 40% health beside a camp is not called out by `wakeTheHunt`.

**For the user.** The heal arm is one of "the three tactics of 2026-09-04" (`soldierCommand`'s docblock; `docs/bot-priorities.md` principle 4). The fix keeps their order and their intent. No ruling is touched.

### T5. Knobs for the tuner (K1 to K7)

The tuner (`docs/plans/bot-evolution.md`) searches every row of `data/ai.bounds.json`, 173 today. A row that cannot change a decision costs search time and adds noise.

**K1. Read by nothing.** `workers.planRadius`. `renewalSteps` (`chain.ts`) became a fold and stopped reading it. Three places still say it is read: its docblock in `aiConfig.ts`, a comment in `chain.ts`, and `docs/bot-priorities.md`. It is also in `aiBounds.test.ts`'s integer list.

**K2. Read only on a path a bot game cannot reach** (22 leaves, 5 with bounds rows):

- Papers only a person writes, or that need a refusal a bot no longer makes (BP13): `war.openBordersPrice`, `war.counterMarkup`, `war.refusalMemoryTurns`.
- Retired cards: `score.devotion.frontRowShare`, `score.tallyForecast.wonderAnywhere` (both with rows), and 16 leaves without rows (`score.tallyForecast.unitKilled`, `unitTrained`, `wonderOrCapitalCaptured`; four `score.dominion.*`; four `score.scientific.*`; three `score.expansionist.*`; two `score.commerce.countForecast.*`).
- `driver.focusMargin`, read only under `driver.focusOrders` 2.
- A retired card held in an old save can still reach these, so keep the leaves and drop the bounds rows.

**K3. Inert at today's values:**

- `military.wildAggression` and `military.aggression` in combat: `favourableBlow` uses `damageTaken × max(strikeFloor, 1 − appetite)`, and `military.strikeFloor` is 1, so the appetite never moves the bar. The sweep found that `military.aggression` changes commands; by the code reading, that is through the declaration (diplomacy), where it stays live.
- `military.siegeStrikeFloor` (0) is read as `max(floor, 1 − siegeExchange)` and has no effect under 0.3.
- `score.deck.shareCap` is read only while `score.deck.sharePerCard` is above 0, and it is 0 (BP6's open choice for the user).
- `war.luxuryGoldBaseline` cancels out in a bot-to-bot swap.
- `military.unrestGarrison` (1) is read as `max(garrisonPerCity, unrestGarrison)`, and both are 1. No bounds row.
- `meters.happinessFloor` and `meters.authorityFloor` (−999) never refuse. No bounds rows, which is correct.

**K4. Knobs that act together:**

- `military.mixDefend.*` and `military.mixCampaign.*` hold the same four numbers in the base and in the warmonger: one mix, 4 rows fewer.
- The war score is linear in five weights, and every reader compares it with a floor or converts it at `war.goldPerScorePoint`. Scaling the weights and floors together changes nothing, so the tuner walks a flat ridge. Fix one weight: 1 row fewer.
- `military.aggression` only divides the declare bar. One declare bar per persona replaces the pair and the mode flip at `> 0`: 1 row fewer.
- `military.siegeStrikeFloor` with `war.siegeExchange`: one knob.
- `expansion.cityValueFalloffByAge`, `growth.smallCityPop`, `weights.production`, `weights.techByAge` hold four equal values in every persona that sets them. Make them scalars until a ruling wants an age shape.

**K5. Overrides that do nothing.** `wager.familyLean` at 1 for all four families in wide, tall and warmonger equals the base (12 leaves). It also hides the arena page's `familyLean` dial from those three personas, because the page's sheet is folded under the persona. The warmonger's two mixes are the same override written twice. Its `healBelowHealth` 0.35 equals the base `withdrawBelowHealth`, so the tuner's ordering repair moves it in every child.

**K6. Bounds the tuner cannot use well:**

- `growth.allFocusSheets` (0 or 1) needs a step of 0.5 at σ 0.1 to flip, so it never flips. Freeze it (BP13c: it stays on).
- Ranges of 2 or 3 integers rarely move: `military.garrisonPerCity`, `war.siegeWithin` (about 1% of draws), `workers.guardTurns`, `war.siegePiecesWanted`, `war.dogpileSeats`, `war.musterRadius`, `threat.underAttackRadius` (about 10%).
- Switches at 0 with `min: 0` clamp back to 0 on half of all draws: `war.targetValueWeight`, `war.goalTowns`, `research.ageEntryValue`, `research.doorValue`, `wager.commitMargin`, `score.deck.sharePerCard`.
- Hidden thresholds: `military.strikeFloor` below 1 brings the two appetites back; `expansion.cityValueFalloffByAge` above 1 makes each town worth more than the last.
- Six live knobs have no bounds row, so the tuner never moves them: `military.veteranCautionBelow`, `war.unrestDrag`, `war.razeUnrestTurns`, `war.razeReach`, and the two weariness weights.

**K7. The sweep.** Of 173 rows, 62 changed commands at both bounds in the seven short turns, 20 at one bound, and 91 at neither. Played again over 25 turns, 23 of the 91 changed commands and **68 changed none in 32 turns at either bound**. The lists are in the K7 section at the end of this file.

- 9 of the 68 are the dead, unreachable or inert knobs of K1 to K3, so the sweep agrees with the code reading.
- 47 act only at moments the windows did not hold: a war (16), the wager and the age close (9), the deck forecasts that a few cards read (17), three switches that are off, and the puppet (2).
- 12 feed common decisions and still changed nothing: `expansion.hexOffersPriced`, `growth.smallCityPop`, `growth.smallCityPremium`, `military.levyCapMultiple`, the two siege mix shares, `military.rangedDeferral`, `religion.tideShare`, `weights.techByAge`, `workers.planTopN`, `workers.searchRadius` (read only by the great person's arm), `workers.workDefenseValue`. Read each before the tuner runs.
- A knob that changes nothing in 32 turns of two games is not proven dead. The tuner's fitness is a whole game, where a rare moment counts. These are candidates to freeze for the tuner's first run, not rows to delete.

**A knob that adds the same term to every candidate.** `weights.techByAge` is read in `techChain` (`chain.ts`) as "holding one more technology", a constant added to every goal the beeline weighs, since every candidate is a node not yet held. In the beeline's table a constant added to every row cannot change which row is best, except through the incumbent's `× 1.1` margin and the sign test beside it. The same term also raises each live chain's worth (`liveChains`), which the hammer and science prices read, and it prices the lump for a free technology (`value.ts`). The sweep found no command change at 3 or at 40 in 32 turns. Check whether it should stay a tuner row; read in code, not proven inert.

**Size of the search.** Dropping K1, the five K2 rows and the K3 rows with bounds, and the K4 merges takes the search from 173 to about 155 dimensions. Freezing the K6 switches and the K7 rows that the code reading confirms takes it to about 140.

**How to prove.** The K4 merges and the K5 removals must give the same digests at the default sheet. A merge that keeps every product equal is exact by construction.

**For the user.** `score.deck.sharePerCard` and its cap are BP6's open choice ("which version to keep"). `driver.focusOrders` 2 and its margin are BP11's open choice ("the user decides which stays after the parameter pass"). `growth.allFocusSheets` stays on by the BP13c ruling, and BP13b asked for its switch. Plan §2.8 of `docs/plans/bot-evolution.md` wanted `wager.familyLean` per persona; remove the three copies only if nobody tunes it per persona yet.

### T6. The council: a shortlist, a margin and a floor (findings 6 to 9)

**Today.** The slot, re-seat and adoption arms stamp every bench card that fits each chair (`council.ts`). A stamp reads the card on two copies of the seat's board (`explainCardStamp`), 3 to 35 ms each (BP3). The bot's own walk of a card costs about 0.2 ms (BP6). In BP14's late profiles the council is 12% to 27% of a turn, and `orderDecision` alone 6.7% to 12.5%.

**Three simpler rules:**

- **A shortlist.** Rank the candidates by the walk (the chair reading already walks the bench), and stamp only the top three and the seated card. The stamp still decides. Gain: perhaps a third to a half of the council's share; after BP15 ("card figures kept for the turn after a seating") the saving falls mostly on the first reading of each sitting.
- **A margin on the re-seat.** `reslotDecision` swaps when the gain is above zero. Principle 1 of `docs/bot-priorities.md` asks for `priorities.switchMargin` (1.1). Measured: 37 and 38 unseatings a game; none within 3 turns of the card's seating, 9 and 14 within 10 turns. Each swap is two commands and moves the economy clock, so every held card is stamped again at the next council decision.
- **A floor on the slot.** `slottingDecision` takes the best pair with no floor, so a card worth zero or less can take a chair for up to two seal lengths. Seat only above zero.

**A bias to fix at the same time (finding 8).** For an effect the stamp sees, the bot adds "what the towns are expected to add": the walk on the context less the walk on `todayContext`. `todayContext` drops the chains, and `hammerPrice` and `sciencePrice` read the chains. So the today walk prices a hammer at the band floor (half the table) and a beaker at the table. Checked in code: for a card that pays production, the stamp already counts the table and the hammer premium (`hammerTerm`), and the "expected" term adds the premium again plus half the table. A flat production card reads about 1.5 times its pay at a neutral price. The slow stamp check (`aiCardStamp.slow.test.ts`) skips exactly these cards. The simpler form: the today context keeps the prices and drops only the promises. Then an effect with no promise reader needs no second walk.

**The guards (finding 9).** Three guards hold a real cycle (`chairReading`, `handRuleWorth`, `widerFitWorth`). Two reviews found independently that `faithPrice` and `malicePrice` guard a body that calls no pricing, so they cannot recurse; their guards can go now, exactly. For the other three, a two-level price removes the recursion: level 0 prices every card with the four pool readings at fixed stand-ins, and the real price reads level 0 inside a chair reading, a hand rule, a Doctrine offer or a wider fit. This also removes the order dependence that BP14 found (a memo first read inside a guard keeps the stand-in's effect). It changes the price of about eight live cards.

**How to prove.**

- **Agreement for the shortlist.** In the stored games of seeds 42 and 999, at each slot and unslot, compute both rules and record the stamp winner's rank in the walk order. Report the share at ranks 1, 2 and 3, and the stamped score lost when the winner is outside. This was not run: it needs a stamp-rank counter inside `council.ts`.
- The margin, the floor and the bias fix change play: the five seeds to turn 100 and turn 150 (the council matters late), with the paired figure.

**For the user.** The stamp-first pricing is B8's ruling (BP3): "where the sim can stamp a card ..., the bot takes that figure as the card's pay now, and keeps its own readings only for what a stamp cannot see". The shortlist keeps the stamp as the judge. The bias fix makes "what a stamp cannot see" mean only the promises, which is what the ruling says. Finding 24 (a draft pick ignores the bench) touches BP6's open item "a bench charge for a card that will not sit", and needs a ruling.

## Other findings, in short

- **Finding 10, the trade reading.** `pricedPairs` prices every pair of an own town and any town on the board (`routes.ts`), sorts them, and then gates at most `search.routeGateProbes` (24). At turn 120 a seat holds up to 23 routes, so the reading matters. A distance filter that is a necessary condition of the range rule (`routeRange`, in turns of travel) before pricing would cut the pairs. The probe budget then reaches more legal pairs, so a few answers can get better. Measure the share of pairs out of range first.
- **Finding 11, the campaign plan.** `campaignPlan` (with `musterHex`, a path search from home for each piece) is built near the top of `soldierCommand` for every soldier, but only the rival blow and `campaignMarch` read it. Build it lazily. Exact.
- **Finding 12, smaller repeated work.** `nearestHostile` walks every unit for each of about 200 scored hexes in `marchToSite`; one hostile list a revision would do. `rangedFriendReady` previews combat for every ranged piece on the board; a range check first gives the same answers. `guardWorkers`' second loop repeats a unit search for a sleeping soldier. A settler's route is searched up to three times in one decision. `screenMarch` asks six path searches. `hammerPrice` is not kept per context and town. `purchasingPlan` asks `soldierWorth` before `reachOf` for every land unit row in every town, and each call walks `levyReading` again, which `inputs.levy` already holds. `frontRowWorth` folds a fresh `explainCity`. `isOpusTown` folds every town. Each is under 1%; all are exact.
- **Finding 13, labels.** Every term and candidate carries a template string. The headless game reads only the command; `spectate.html` and the game's notices read the sentences. Two decisions read printed labels as keys (`scoreOf` finds a row by its name; the soldier summary looks for "has not shot yet"), so they need a real field first. Measure before building: a scratch tree with empty labels, the same digests, and paired CPU seconds. Principle 5 ("everything prints", `docs/bot-priorities.md`) and the pinned `foldTerms(terms) === score` hold, because the values do not change.
- **Finding 14, three soldier prices.** The build list (`unitRoleValue`) charges the wage; the gold book (`garrisonWorth`) and the faith book (`faithRowTerms`) do not, while the gold book's buildings do charge their upkeep. One soldier reading with the wage for all three is simpler and changes play.
- **Finding 16, the worker's two danger readings.** `workerGuard` reads visible hostiles by their own route; `civilianDanger` reads every hostile within 4 hexes, seen or not, with any soldier within 4 hexes as cover. The second can send a worker home from a threat the first does not see. BP15 is changing this arm (the worker that stays home), so leave it to BP15's result.
- **Finding 17, a defender beside the wild.** `garrisonOwed` (`campaign.ts`) is the one figure that the gold book, `unpaidSoldier`, `undefendedCity` and `garrisonReserve` read, and it ignores threats. Adding one to it while `cityIsThreatened` moves all four together. This is BP8's open item ("an empty town beside the wild often buys no defender").
- **Findings 18 and 19, the inquisitor.** `isPlainBuilder` lacks the `purges` marker, so an inquisitor goes to the worker arm (the fault batch H12 fixed for the apostle). The simulation's `buildsImprovements` has all five markers; use it in the three places that copy it. The faith book's last clause prices a row "worth at least the faith it costs", so a seat with spare faith can buy an inquisitor or a worker that nothing wants. Measured: no bot held an inquisitor in the five snapshots.
- **Finding 20, the sleeping trader.** A cart that finds no legal pair is put to sleep, no arm wakes it, and `routeOutlook` counts it as idle, which keeps the seat from hiring into that slot. Measured: no idle or sleeping trader in the five snapshots. Latent; wake it once a turn as `wakeIdleWorker` does.
- **Finding 21, ruins.** `discoveryDecision` always takes option 0. The bot already prices each kind of boon (`explainLump`, `explainSoldier`, the worker price).
- **Finding 25, a card in a hand.** The draft plan, the pass, the chair reading, the hand rules, the foreign card and the Doctrine offer each call `expectedBestOrder` over the same bags with their own score. One function with one memo a context would serve all six.
- **Finding 27, a town on a project.** The economy review read this as possibly large. Measured: `projectIdleCommand` answered 0 times and cost 0.0% of bot time to turn 100, and 0.1% of the turn-120 profile. Not worth changing now; measure it again after turn 150.

## C1 to C4: code that can go

- **C1.** `marginFocusCommand` and `marginSheetSentence` run only under `driver.focusOrders` 2 (BP11's third setting; the data has 1). `focusTable`, the two-sheet table, runs only under `growth.allFocusSheets` 0. About 400 lines. Both are open choices or rulings (see T5, "For the user").
- **C2.** Six effect kinds have no live row (`beadPerOccasion`, `encroach`, `happinessTierBoost`, `landfall`, `periodicMuster`, `worksBeyond`). The `mirror` basis has no row at all. 23 flag rules and 8 percent rules appear only on retired rows, and 7 rules on no row. 25 count kinds appear only on retired rows. The helpers only these reach (`fieldsTendedWorth`, `heldBuildingWorth`, `shoreRaidWorth`, `rallyWorth`, `guildInflowWorth`, `scholarStepWorth`, `charterSavingWorth`, `charterBeakersAhead`, `explainFrontRow`) are 300 to 400 lines. A save can still hold a retired card, so the arms fall to one shared stand-in rather than disappear. The scan script is `scripts/shapes.py` in the scratch folder named under Files.
- **C3.** Unreachable: the project and unit branches of `frontRowWorth` (only the Cathedral and the Opus accept contributions); the project clauses of `raceTerm`, `racePays` and `explainProjectRow` (every endeavour is dormant since Q1); `unitTerm`'s settler branch (Agriculture is a starting technology); `holdAfterStepBack`'s last `sleepUnit`. Exported and never called: `settlerReading`, `escortReading`, `focusReading`. One-line wrappers: `pricedEscortPlan`, `townWantingSite`.
- **C4.** Docblocks and docs that describe code that is gone:
  - `cityCommand` (the fixed priority list with a caravan), `productionTable` ("the solvency floor shows up here"), `chooseProduction` (a wait term and `turnsToBuild`), `unitRoleValue` ("a caravan is still a flat figure"), `techGoalTable` (a "one sweep" comment above no sweep), `housekeeping` ("two decisions"; it holds about a dozen), `reslotDecision` ("once a turn"; it looks once a seal), `nextTownChain` ("once a decision"; once a sitting), the slot summary ("the scarcest office first"; the rule is price over fits).
  - `liveChains` (`chain.ts`: "no ground survey"; `techChain` now calls `renewalSteps`).
  - `civilianDanger` (says the bot has one reading of danger, the one that sees every unit; two newer readings see only what the seat sees). `isPlainBuilder` ("three other things" carry charges; there are six). `soldierCommand`'s list of arms (leaves out the guard, the withdraw arm and the campaign), and its comment that the appetite "loosens this exchange bar".
  - `docs/bot-priorities.md`: "The formula" says `H` is 40, the Knobs section and the data say 60; line 620 says The Soldiers' Share forbids founding, which its row no longer does; lines 694 to 695 say a chase needs every town held, which BP12 replaced; `workers.planRadius` is listed as read.
  - The duplicated "margin defends the ground" comment in `marchToSite`.
- **Size.** `bot.ts` is 11,735 lines and `value.ts` 13,725; `src/ai/` is 45,801. The unit section of `bot.ts` is about 5,000 lines and could split into settler, escort, guard, soldier, religious and trader modules. That is a medium job with a risk of import cycles, and it changes nothing the user sees.

## Checked and found fine

- **Arms that never answer are cheap.** `levyDecision`, `retireCommand` and `projectIdleCommand` answered 0 times in two games and cost under 0.1% of bot time together. The first two are gated by cards; the third is the bot's side of a known gap. Keep them.
- **`disbandCommand`** answered 0 and 13 times but costs 1.4% of bot time. Most of it (0.9 to 1.1 s a game) is in the first decision of a sitting, where it is the first reader of the seat's books (`seatBooks`), a reading the context needs anyway. Its own cost is about 0.3%.
- **No town's build is set twice in one turn** (both games), and no arm undoes a purchase.
- **No Order is unseated within 3 turns of its seating** (both games). `sealedThisTurn` and `isReseatTurn` prevent a swap from being undone in the same or the next turn, and `moveToCountedChair` moves a card only into an empty chair.
- **`valueContext` is built exactly once a sitting** (600 times in 600 sittings, both games), and no context was built without a sitting.
- **The augur** is one stand-quiet arm, kept for old saves on purpose (CLAUDE.md). No council path reads feats, quests, endeavours or reckonings. `governmentsAtTier` filters retired rows, so no arm prices The Commonwealth or The Magisterium.
- **The bounds on repeat asks hold**: `wakeIdleWorker`, `wakeIdleSettler` and `wakeTheHunt` ask each piece once a turn; escort and guard orders go once a turn each; `reaskTheMarch` never lets a stand-down cancel a march and never sends the same target twice.
- **The escort plan's memo** and its input key look exact; it is 0.9% to 1.6% of a late turn.
- **The decision memo** (`decisionMemo.ts`) keys on the context, the epoch, the revision, the guard scope, the effects and the town. It has a shadow check.
- **`expectedBestOrder`** is an exact sum over the deal's distribution and is cheap. `skipCandidate` prices each pool card once.
- **Every knob in the bounds file names a real leaf**; the 999 and 60 sentinels are skipped by `isSentinel`; the two old dead knobs (`military.huntRadius`, `score.nominalTiles`) are gone.
- **The two war readings** (`explainPeaceScore` with weariness, `explainWarScore` without) differ on purpose (WC2). By the army ratio, a seat that declares at 4.5 reads `outArmed` only below 1.4, so the ratio alone does not flip it between war and peace (finding 22 is a different cause: the war score).
- **`driver.ts` and `stepper.ts`** duplicate their loop on purpose, and a byte-for-byte test pins the two together.
- **Every command** the arms send passes the simulation's own check first; neither game refused one.

## Not looked at, or not measured

- **Seeds.** Every measured figure comes from two seeds (42 and 999) to turn 100, unless it names BP14's profiles (turns 90 to 100 and 120 to 130). Seed 999 is the war-heavy game; the hunt and campaign figures differ a lot between the two.
- **After turn 100.** The census did not run past turn 100. The council's share grows late (BP14: 22% to 27% at turn 120), so the council findings are argued from BP14's profiles, not from new counts.
- **The shortlist agreement** (T6) and the label cost (finding 13) were not measured; each section says how.
- **Gains are not additive.** Several findings read the same memos, and the first reader of a memo pays for it. BP15 changes some of the same readings. Measure each change against the tree it lands on.
- **Play quality** of the rule changes (T1, T2, T4, T6) was not measured. Each section names the test.
- **Not read closely:** the arena page's runner beyond `isBuilder`; `stepper.ts`; the great-person arms beyond their cost; the puppet's production path.
- **Wall time.** All figures are CPU seconds; the machine was shared with other agents (load average 3 to 9).

## K7: the knob sweep

Short windows: seed 42 turns 30 to 32, seed 999 turns 60 and 61, seed 42 turns 90 and 91 (7 turns). Long windows, for the knobs quiet in the short ones: seed 42 turns 30 to 49, seed 999 turns 90 to 94 (25 turns). Each knob was set to its minimum and its maximum (the midpoint where the default sits on a bound). "Changed" means at least one command differed from the untuned run.

- **Both bounds changed commands in the short windows (62).** `camps.forceMargin`, `camps.marchReach`, `expansion.cityValueFalloffByAge`, `expansion.escortWaitTurns`, `expansion.roadDangerRadius`, `expansion.siteSearchRadius`, `military.aggression`, `military.armyPerCity`, `military.campHuntRadius`, `military.garrisonPerCity`, `military.healBelowHealth`, `military.levySurplusSlope`, `military.mixBonus`, `military.mixDefend.melee`, `military.mixDefend.ranged`, `military.scoutCap`, `military.scoutDecayPerTurn`, `military.scoutEarlyTurns`, `military.screenExposure`, `military.screenRadius`, `military.withdrawBelowHealth`, `priorities.horizonTurns`, `priorities.priceBandHigh`, `priorities.switchMargin`, `research.abilityValue`, `research.goalHorizon`, `research.strandWeight`, `score.lumpTurns`, `score.nominalCount`, `score.unknownEffect`, `site.freshWaterBonus`, `site.newLuxuryBonus`, `site.newStrategicBonus`, `site.strategicCopyValue`, `threat.armyPerSightedCamp`, `threat.armyPerSightedHostile`, `threat.extraArmyPerThreat`, `threat.militaryBonus`, `threat.peaceShare`, `threat.radius`, `threat.sightedArmyCap`, `war.declareThreshold`, `war.escortRadius`, `war.musterDistance`, `war.musterRadius`, `war.targetValueWeight`, `weights.authority`, `weights.city`, `weights.culture`, `weights.debtAversion`, `weights.faith`, `weights.food`, `weights.gold`, `weights.happiness`, `weights.military`, `weights.production`, `weights.renown`, `weights.science`, `weights.unitEdge`, `weights.worker`, `workers.guardTurns`, `workers.walkDiscount`.
- **One bound changed commands (20); the bound named is the one that did.** `camps.assaultAppetite` (1), `camps.raidLoss` (0), `expansion.escortCallTurns` (0), `growth.allFocusSheets` (0), `military.mixDefend.mounted` (0.7), `military.scoutBonus` (0), `military.screenBonus` (0), `military.strikeFloor` (2), `priorities.priceBandLow` (0.1), `religion.prophetTechValue` (1500), `research.greatPersonTurns` (0), `score.caravanScale` (1), `score.patienceTurns` (3), `site.strategicSpareTaper` (0), `threat.techMilitaryFactor` (6), `war.declareThresholdPeaceful` (1.5), `war.secondWarMultiple` (1), `war.strengthWeight` (0), `war.strikeForce` (1), `workers.waitingTurns` (5).
- **Quiet in the short windows, changed in the long ones (23).** `camps.siteShare` (0), `military.hardTargetMargin` (1 and 2), `military.mixCampaign.melee` (0.7), `military.mixCampaign.mounted` (0.05), `military.mixCampaign.ranged` (0.05), `military.scoutGlutPenalty` (50), `military.siegeStrikeFloor` (1.5 and 0.75), `research.ageEntryValue` (2 and 1), `research.charterTurns` (5), `score.combatScale` (20), `score.deck.sharePerCard` (0.2 and 0.1), `score.deck.tieBreak` (10), `score.tallyForecast.barbarianKill` (20), `score.tallyForecast.greatPersonSpent` (12), `score.tallyForecast.sizeRecord` (60), `score.tallyForecast.unitLost` (12), `threat.garrisonValue` (30 and 300), `war.dogpileSeats` (1), `war.reachRadius` (6), `war.siegePiecesWanted` (0 and 3), `war.tributeShare` (0.1 and 0.55), `war.unitLossWeight` (0.5), `weights.bead` (50).
- **Quiet in both (68)**, by kind:
  - Dead, unreachable or inert by the code reading (K1 to K3) (9): `workers.planRadius`, `war.openBordersPrice`, `war.counterMarkup`, `war.refusalMemoryTurns`, `score.devotion.frontRowShare`, `score.tallyForecast.wonderAnywhere`, `military.wildAggression`, `score.deck.shareCap`, `war.luxuryGoldBaseline`.
  - Switches that are off at 0 (3): `research.doorValue`, `wager.commitMargin`, `war.goalTowns`.
  - War and peace (wars are rare: 2 and 4 declared to turn 100) (16): `war.acceptCeiling`, `war.aheadMargin`, `war.cityWeight`, `war.expeditionOdds`, `war.goldPerScorePoint`, `war.luxuryGptBaseline`, `war.peaceExchange`, `war.roadDragPerStep`, `war.siegeExchange`, `war.siegeWithin`, `war.sueFloor`, `war.tributeFloor`, `threat.underAttackRadius`, `score.warPace.killsPerSoldier`, `score.warPace.leanShare`, `score.warPace.townsPerKill`.
  - The wager, the race and the age close (9): `wager.ageTurns`, `wager.driftWeight`, `wager.familyLean.culture`, `wager.familyLean.domination`, `wager.familyLean.economic`, `wager.familyLean.science`, `wager.leanWeight`, `weights.victory`, `priorities.raceLiveHorizons`.
  - Deck forecasts read by a few cards (17): `score.devotion.beliefSlotShare`, `score.devotion.faithSpentShare`, `score.devotion.faithUnitShare`, `score.devotion.faithfulPeace`, `score.devotion.followerSight`, `score.devotion.opusInterdict`, `score.devotion.parishTurns`, `score.devotion.sitesOverHorizon`, `score.magisterial.claimedHexShare`, `score.magisterial.lostRaceShare`, `score.magisterial.opusShare`, `score.magisterial.wonderFrontShare`, `score.magisterial.workBesideShare`, `score.tallyForecast.goldSpent`, `score.tallyForecast.wonderCompleted`, `score.gameTurns`, `score.recentTurns`.
  - Puppets (no puppet town in the windows; the first appears by turn 120 on seed 999) (2): `puppet.strandWeight`, `puppet.switchMargin`.
  - Common decisions that still changed nothing: read these before the tuner runs (12): `expansion.hexOffersPriced`, `growth.smallCityPop`, `growth.smallCityPremium`, `military.levyCapMultiple`, `military.mixCampaign.siege`, `military.mixDefend.siege`, `military.rangedDeferral`, `religion.tideShare`, `weights.techByAge`, `workers.planTopN`, `workers.searchRadius`, `workers.workDefenseValue`.

## Files

- This file.
- Scratch, not in the repo (`/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/botaudit/`): `armpatch.py` and `armpatch2.py` (the counters, applied to a scratch tree), `census.ts`, `census2.ts`, `census3.ts` (the counted games), `rules3.py` (the offline rule tests), `flips3.py` (the flipped orders), `knobs.ts` with `knobq.sh` and `knobq2.sh` (the sweep), `snapcheck.ts` (idle traders and inquisitors in the snapshots), `snap.ts` (the turn-30 and turn-60 snapshots), the outputs in `out/` and the logs in `logs/`. The two scratch trees (`tree/`, `inst/`) were removed at the end.
