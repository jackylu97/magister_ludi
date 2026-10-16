/**
 * **The six-seat 120-turn digest, pinned** (`docs/plans/bot-evolution.md`
 * §3.5, ruling 7; the procedure of `docs/flags.md` (jjjjj) and (ttttt), where
 * it was the orchestrator's scratch: *"the 120-turn digests identical at two
 * seeds"* — here at the measured seed on the two boards the harness plays).
 *
 * What it pins: the bots decide **identically** — the whole state,
 * `snapshotState` hashed (`aiDigestHelpers.ts`'s FNV, the `explore.test.ts`
 * `RANGED_BOARDS` print), after a hundred and twenty turns of six personas on
 * the duel board and on the standard board. A refactor that means to change no
 * decision leaves both literals where they are; a change that moves one is a
 * finding, and the literal is **re-cut with the reason printed** in the commit
 * that moves it — never quietly. A schema bump moves both by construction (the
 * state's own bytes change) and is re-cut with the bump's changelog line as the
 * reason.
 *
 * The harness's sentinel (`scripts/evolve.ts`) reads the very same
 * `digestOfState`, so the suite's pin and the run's halt are one reading.
 *
 * Slow by kind: two full six-seat games, the standard board's alone near three
 * minutes on one core.
 */

import { describe, expect, it } from 'vitest';

import { digestOfState, playSeatedGame, sixSeatSpec } from './aiDigestHelpers';

/**
 * The literals. Cut 2026-09-15 at schema 117 (L1's lifetime deck tally,
 * `91326ba`, moved both from schema 116's `4a422d67:248888` /
 * `eaf58d1f:887156` — the state's own bytes changed); E1a's rows at today's
 * defaults (`60543d2`) then moved neither — a default that reproduces today's
 * play moves no digest, measured on both boards.
 *
 * Re-cut for M2 (`dd69463`, the War Hall and the Armoury, the Courthouse to
 * Iron Working): two buildable rows joined the tree and one moved, so the
 * bot's node valuer (`readNodeGifts`, which prices a technology by what it
 * unlocks) found Bronze Panoply, Mathematics and Iron Working richer and
 * Machinery and Divine Right poorer, and every seat's research order moved
 * from the first of those choices on — duel `ecfb7314:251149` →
 * `3e710249:248825`, standard `586ca4e0:892118` → `592eb05b:904802`. No rule
 * of play changed; a data row the bot can build is a reason the digest moves.
 *
 * Re-cut for B1 (schema 118, the draft pass): the culture meter's exponent
 * fell from 2.65 to 2.2, so every seat's third draft and after arrives
 * earlier and the deck it holds at turn 120 is a different deck — duel
 * `3e710249:248825` → `a31b1dc0:249598`, standard `592eb05b:904802` →
 * `2f8db9d8:905343`. The prints grew by the cards drafted. The reroll reset
 * moves nothing on its own: no bot rerolls.
 *
 * Re-cut for D1a (the decks rework, schema 119, branch `decks` —
 * `docs/plans/decks-rework.md`): every seat draws from a different pool now —
 * its own decks' — and in D1a that pool is **empty** for every seat: every
 * pre-rework Order and Doctrine row is `retired: true` and D1b's rows do not
 * exist yet, so every draft is an exhausted hand that charges nothing, counts
 * nothing and deals nothing. No seat drafts, so no seat reaches a government
 * rung, adopts, or seats a card; the six seats' collections are empty at turn
 * 120 and the prints **shrank** by the cards they used to hold — duel
 * `a31b1dc0:249598` → `e444d304:236660`, standard `2f8db9d8:905343` →
 * `42315015:855946` — while the state's own bytes changed (the schema digits,
 * four seat fields and `rewardHands`). D1b fills the decks and re-cuts these.
 *
 * **Re-cut for D1b (the cards, branch `decks`)**, and this is the re-cut D1a
 * promised in the paragraph above. Seven agents wrote three hundred and
 * ninety-nine rows into `data/decks/*.json`, a hundred and forty-three of them
 * live, so **the pool is no longer empty**: every seat draws from its leader's
 * two decks plus the commons and the either-type crosses, drafts again, reaches
 * the ladder's rungs, adopts, banks reward hands and seats cards for a hundred
 * and twenty turns. Every decision downstream of a held card moves with it —
 * which is the whole of what a digest is for. Duel `e444d304:236660` →
 * `1ccd794d:245595`, standard `42315015:855946` → `4180e4e6:893888`; the prints
 * **grew back** by the cards the six seats hold at turn 120, to a little under
 * where they stood before D1a emptied the shelf (`a31b1dc0:249598` /
 * `2f8db9d8:905343`), which is what a differently-stocked pool dealing a
 * differently-sized collection looks like.
 *
 * The bot's synergy reading moved in the same pass and is part of this print:
 * `scoreCard`'s bonus counted cards sharing a `line` and counts cards sharing a
 * **deck** now (`bot.ts`, the reason in its docblock) — the old reading was
 * dead for the whole live catalogue, since no D1b row carries a line, so the
 * two changes cannot be separated at this seed and are not claimed separately.
 * Measured twice, same bytes both runs.
 */
/**
 * **Re-cut for D2a (the predicates, branch `decks`)**. Five new members on
 * unions the evaluator already walked — a threshold on a shelf of buildings, a
 * worked improvement, a worked great person's work, a marvel standing in the
 * town, the negations those wanted, and the ring of six on a hex condition —
 * un-deferred **thirty-two rows**, taking the live catalogue from a hundred and
 * forty-three to a hundred and seventy-five. Twenty-three of them are
 * Magisterial's, which was the thinnest deck in the audit, so a Magisterial seat
 * now draws from roughly twice the shelf it drew from yesterday and every seat's
 * hands, picks, chairs and downstream decisions move with it. Duel
 * `1ccd794d:245595` → `af754d10:245540`, standard `4180e4e6:893888` →
 * `1b9b9b99:900701`.
 *
 * The prints move in **opposite directions**, which is what a differently-stocked
 * pool looks like rather than a bug: the standard board's six seats hold more
 * cards at turn 120 and print longer, and the duel's two hold a shade fewer —
 * the same number of drafts spent on a wider shelf is not the same collection.
 * Nothing about the *engine* changed in this batch; the bot appraises the new
 * rows through exactly the walk it already had. Measured twice, same bytes both
 * runs.
 */
/**
 * **Re-cut for D2b (counts and reach, branch `decks`)**, the second and last of
 * the two vocabulary batches. Seven shapes, every one a field on an effect that
 * already stood: `count`/`per`/`max` on the production bonus and the route
 * rider, a ceiling on a share of a town's own fold and on a per-town writ, a
 * scope on the renown trickle and on the purchase rider, the empire-building
 * selector (a scope, a count and a narrowing on the bonus), a per-town writ
 * price (`meterRule` `cityCost`), four distinct-kind counts and a per-neighbour
 * multiplier on a hex line. They un-deferred **twenty-seven rows**, taking the
 * live catalogue from a hundred and seventy-five to two hundred and two — twelve
 * of them Magisterial's and five Scientific's, which were the two thinnest decks
 * left after D2a. Duel `af754d10:245540` → `beeae6b2:240493`, standard
 * `1b9b9b99:900701` → `ad176577:886331`.
 *
 * **Both prints fell**, where D2a's moved in opposite directions, and the reason
 * is the same fact read once more: the same number of drafts spent on a wider
 * shelf is not the same collection, and a seat that takes a different card at
 * turn 30 takes different everything afterwards. Two of the shapes also reach
 * the *board* rather than only the hand — a town the writ prices one point
 * cheaper is a town a bot may found, and hammers counted off a congregation
 * move a queue — so the drift starts earlier here than it did in D2a.
 *
 * Nothing about the **engine** changed: the bot appraises every new field
 * through the walk it already had, save the one arm `meterRule`'s register
 * required (`scoreMeterRule`'s `cityCost`, which prices the new rule exactly as
 * the three beside it price theirs). Measured twice, same bytes both runs.
 */
/**
 * **Re-cut for D2c (occasions, branch `decks`)**, the batch that stopped growing
 * the vocabulary and started keeping facts. Four shapes: three more moments a
 * growing card may count (a kill, a unit trained, a camp burnt out), a windfall
 * grant that is a share of what the occasion itself measured, the world's ledger
 * of what was done first (`GameState.firsts`, schema 120), and a once-a-turn
 * stamp on a rider. They un-deferred **fifteen rows**, taking the live catalogue
 * from two hundred and two to two hundred and seventeen — six of them Dominion's
 * and three Magisterial's. Duel `beeae6b2:240493` → `40881a25:261580`, standard
 * `ad176577:886331` → `3d71414c:919322`.
 *
 * **Both prints rose**, where D2b's both fell, and the rise is larger than the
 * fifteen rows alone would explain. Three things compound: the shelf is wider
 * again, so the same drafts buy a different collection; six of the freed rows
 * are **Dominion's**, which is the deck whose cards pay on kills, musters and
 * captures — the moments a bot at war reaches constantly, so a seat that takes
 * one diverges on the very next fight rather than on the next draft; and the
 * world now carries a register that grows all game (`firsts`, one row per shelf
 * per town, per building the realm finishes, per technology anybody finishes
 * first), which is most of the byte count by itself.
 *
 * Nothing about the **engine** changed. The bot appraises every new row through
 * the walk it already had; the only edit outside the sim was four numbers on
 * `data/ai.json`'s `tallyForecast`, which the existing arm reads for the three
 * new occasions and which the arena panel picks up with no page edit. Measured
 * twice, same bytes both runs.
 */
/**
 * **Re-cut for D2d (the age stamp, branch `decks`)**, the cheapest system per
 * card in the audit. Three things in the world now remember the turn they were
 * placed — a building joining a town (`City.buildingTurns`), a work raised on a
 * hex (`Tile.improvedOn`), a road opened (`TradeRoute.startedTurn`), schema 121
 * — and five readings ask them: a term on three `CityScope`s, one hex condition
 * and one on the route `pays`. They un-deferred **six rows**, taking the live
 * catalogue from two hundred and seventeen to two hundred and twenty-three —
 * five of them Scientific's, which was the thinnest deck left, and one
 * Commerce's. Duel `40881a25:261580` → `10d89ce1:260423`, standard
 * `3d71414c:919322` → `624b2217:922586`.
 *
 * **The prints moved in opposite directions**, which is D2a's shape rather than
 * D2b's or D2c's, and the split is the honest one for a batch this small. The
 * shelf is six rows wider, so the same drafts buy a different collection and a
 * seat that takes a different card at turn 30 takes different everything after
 * — that is the drift both boards share. What the duel shows is that six rows
 * across two decks is small enough for the drift to land either way: a seat that
 * spends a draft on a Continuity card instead of a Dominion one fights less and
 * founds less, and a shorter game is fewer bytes.
 *
 * The **stamps themselves** are a small and one-sided part of the count: a town
 * carries one number per building it has raised and a hex one per work standing
 * on it, so the standard board's rise is partly the register and partly the
 * different game. No stamp is written where nothing is placed — the explore
 * sweep's byte count is unchanged to the byte at both seeds, which is the
 * measurement that says so.
 *
 * Nothing about the **engine** changed, and no file in `src/ai` was touched: the
 * bot appraises every new term through the walk it already had. One known gap is
 * written down rather than fixed here — `value.ts`' hex appraisal calls
 * `tileConditionHolds` with no clock, so a `standingSince` line reads as paying
 * nothing to the bot (The Old Academy's, today). It undervalues one row and lies
 * about none. Measured twice, same bytes both runs.
 */
/**
 * **Re-cut for R1 (the copies model, branch `decks`)** — batch 1 of
 * `docs/strategic-resources-proposal.md`. A unit that needs a strategic
 * resource now holds one copy of it while it lives, and a row queued in a town
 * holds one from the moment it is queued, so an empire can no longer build an
 * unlimited army off a single iron hill. Duel `10d89ce1:260423` →
 * `fc6eca56:265734`, standard `624b2217:922586` → `adb36756:935196`.
 *
 * No resource row and no unit row changed; the roster is batch R3's. What moved
 * is the gate, against the three strategics that already existed: horses gate
 * eleven mounted rows, iron four swords, niter the fire lance. Six seats over a
 * hundred and twenty turns hold a handful of copies apiece, so a seat that used
 * to queue its fourth horseman now queues something else — and every decision
 * after that is a different decision. The **upgrade ladder** moves with it and
 * moves earlier: a warrior climbing to a swordsman is a new claim on the
 * empire's iron rather than a free retyping, so the sweep that used to march a
 * whole line up at Iron Working now marches as many of it as there are copies
 * and leaves the rest as warriors. That is the change a bot feels first,
 * because it happens on the turn a technology lands rather than on a build
 * decision.
 *
 * **Both prints grew**, by about two per cent on each board, and the direction
 * is the right way round: a seat refused a mounted row builds a building or a
 * cheaper unit instead, and finishes the game with more standing than the army
 * it could not field. Nothing was lost — no seat stalled and no command was
 * refused, which the assertion above this one checks before the hash does.
 *
 * Nothing in `src/ai` was touched and the bot is not taught the new rule in this
 * batch: it still appraises a resource as a boolean, so it will sometimes queue
 * a row the gate refuses and pick again. That is batch R5's job and it is
 * written down here because it is part of what this print measures. Measured
 * twice, same bytes both runs.
 */
/**
 * **Re-cut for R3 (the roster and the map)** — batch 3 of
 * `docs/strategic-resources-proposal.md`. Duel `fc6eca56:265734` →
 * `1e3ae648:281597`, standard `adb36756:935196` → `3500d4f1:951201`.
 *
 * Three resources became seven, and everything downstream of that moves:
 *
 *   · **The board is a different board.** Obsidian and camels are new rows and
 *     copper and ivory changed kind, so the scatter's weighted draw lands
 *     somewhere else on every seed; the strategic purse went from 22 tiles per
 *     1000 land to 60; and every strategic tile now rolls a quantity off the
 *     map rng. The terrain is untouched — the resource stream is drawn last —
 *     but which hex carries which seam is new everywhere.
 *   · **What a bot can build moved.** The sword line came off iron onto the
 *     obsidian/copper pair, the mounted line accepts camels as well as horses,
 *     the phalanx gained a requirement it never had, and seven leader uniques
 *     lost the one they had. Niter's reveal moved from Alchemy to Physics, so
 *     the fire lance is reachable in a game that ends.
 *   · **Every empire now has seven standing bonuses to hold.** A copy of copper
 *     pays a coin in every city, ivory four happiness, camels a coin a route,
 *     niter a tenth of science, iron ten points of health on every fighting
 *     piece, obsidian a point of melee strength, horses quicker roads. Those
 *     are live from the first turn a seam is dug, and they change what a seat
 *     can afford long before they change what it builds.
 *
 * **Both prints grew again**, about six per cent on the duel board and under
 * two on the standard one. The direction is the one the batch intends: a tile
 * carries three to eight copies instead of one, so a seat that used to stall at
 * its second horseman fields a cavalry arm, and an empire with iron keeps a
 * larger army alive. Nothing stalled and no command was refused, which the
 * assertion above this one checks before the hash does.
 *
 * Nothing in `src/ai` was touched. The bot still appraises a resource as a
 * boolean and will sometimes queue a row the gate refuses and pick again; that
 * is batch R5's job. Measured twice, same bytes both runs.
 *
 * ---
 *
 * **Batch R5 — the bot learns to count copies.** Duel `1e3ae648:281597` →
 * `e37cc04e:277027`, standard `3500d4f1:951201` → `d7516cde:955202`.
 *
 * Three changes move it, and each moves a different decision:
 *
 *   · **the production gate now asks the reducer's question.** A unit reserves
 *     its strategic copy when it is queued, and every production command the bot
 *     sends replaces the town's whole queue — so a row asked about on its own
 *     was counted against a queue that was on its way out. `queueAhead` was
 *     dropping live resource-gated rows out of the queue it was rebuilding (a
 *     swordsman holding the empire's only obsidian judged itself unbuildable),
 *     and `cityCommand` could offer two rows on one free copy and have the
 *     reducer refuse the pair. Both now walk the proposal the way
 *     `validateQueue` walks it;
 *   · **a seam is priced in copies, not as a boolean.** The first copy of a kind
 *     is worth its empire-wide bonus and stops there; every copy after it is one
 *     more unit the empire may field, at `site.strategicCopyValue` each, tapered
 *     on what the empire can already spare. So a seven-copy iron hill is a
 *     better site than a three-copy one and an empire with no iron wants one
 *     several times more than an empire with twenty spare horses wants a
 *     twenty-first;
 *   · **the spade joins the settler and the purse.** Ground an empire already
 *     owns arms nobody until there is a mine on it, so the improvement plan now
 *     prices the seam a spade would open.
 *
 * **Both prints shrank a little on the duel board and grew a little on the
 * standard one** — under two per cent either way. The direction is not the
 * interesting number; what the change is for is measured elsewhere. Over six
 * duel boards to turn 40, both seats: copies held rose 35 → 43 and copies the
 * army had actually taken up rose 4 → 10, at a cost of about a tenth of a town
 * per seat. The copy value is the measured pick of a four-point sweep; the
 * sweep is written out on `AiConfig.site.strategicCopyValue`.
 *
 * No command was refused and nothing stalled, which the assertion above the
 * hash checks first. Measured twice, same bytes both runs.
 *
 * ---
 *
 * **Batch C1 — the Commerce deck widens.** Duel `e37cc04e:277027` →
 * `25ba8a39:274085`, standard `d7516cde:955202` → `b01dd2f0:959093`.
 *
 * **A wider live pool is a different collection**, and that is the whole of why
 * this moved: nothing in `src/ai` was touched and no rule of the simulation
 * changed for any card that was already live. The Commerce file went from
 * fourteen dealt rows to thirty-one — eleven new rows off the user's own sheet
 * (`docs/decks/commerce.md`) and six whose deferral notes had gone stale since
 * the shape waves landed — so every Commerce seat's shelf is more than twice the
 * size it was, the draw lands on different cards, and a hundred and twenty turns
 * of compounding does the rest.
 *
 * Three of the revisions also change a figure a live card was already paying,
 * which moves the board even where the draw does not: The Assayer's Rule pays
 * one coin on a gold seam rather than two, Provisioning Contracts feeds a
 * domestic road's destination two rather than three, and Civic Receipts' culture
 * lost its ceiling and gained the refusal to pay for a great house.
 *
 * **The duel print shrank about one per cent and the standard one grew under a
 * half.** Neither direction is a finding: the seats are drawing from a different
 * shelf, so the two numbers are not measuring the same experiment. Nothing
 * stalled and no command was refused, which the assertion above this one checks
 * before the hash does. Measured twice, same bytes both runs.
 *
 * ---
 *
 * **Batch C2 — the cheap Commerce members.** Duel `25ba8a39:274085` →
 * `71abc180:274152`, standard `b01dd2f0:959093` → `7a2d0e11:937239`.
 *
 * A wider live pool again, and for C1's reason exactly: nothing in `src/ai` was
 * touched and no rule changed for a card that was already live. Ten more rows
 * are dealt — six new Commerce cards off the user's sheet, two Commerce rows
 * that were each waiting on one field, and two rows of the shared file, which
 * widens Dominion's and Scientific's shelves as well as Commerce's. Every
 * Commerce, Dominion and Scientific seat therefore draws from a different
 * collection, and a hundred and twenty turns of compounding does the rest.
 *
 * One card also changes a figure a live row was already paying: The Exchange of
 * Discoveries carried its old text in the data (a count of the courts a town's
 * caravans reach) and now carries the sheet's, which pays science on mines and
 * quarries instead.
 *
 * **The duel print is flat to within a rounding and the standard one shrank
 * about two per cent.** Neither direction is a finding — the seats are drawing
 * from a different shelf, so the two runs are not the same experiment. Nothing
 * stalled and no command was refused, which the assertion above this one checks
 * before the hash does. Measured twice, same bytes both runs.
 *
 * ---
 *
 * **The repeated unit order (browser performance audit, 2026-10-06, finding
 * 1).** Duel `71abc180:274152` → `af2c51e6:276083`, standard
 * `7a2d0e11:937239` → `bc49a8a5:962094`.
 *
 * Two causes, measured separately. First, both literals were already stale on
 * the unmodified `decks` head (05b177a): that tree prints duel
 * `af2c51e6:276083` and standard `fc238dc8:951127`, so some commit after C2
 * moved both without a re-cut. Second, this fix: `wakeTheCampaign` now calls a
 * dug-in piece back at most once a turn, and the driver and the stepper no
 * longer send an accepted unit order again to a piece the previous copy left
 * unchanged. Before it, a seat at war could send one `moveUnit` to a jammed,
 * dug-in soldier about 390 times in a turn and lose the rest of its turn to
 * the command budget. The duel game never hit that loop, so its print is the
 * same with and without the fix. The standard game did, so from the first
 * loop turn its seats spend those turns on other orders instead, and the print
 * moves from `fc238dc8:951127` to `bc49a8a5:962094`. Nothing stalled and no
 * command was refused or repeated.
 *
 * ---
 *
 * **The four approved decks and their shared cards (deck implementation
 * batches D1–D4 and S, `docs/plans/deck-implementation.md`).** Duel
 * `af2c51e6:276083` → `b5f6b5b8:286280`, standard `bc49a8a5:962094` →
 * `8f051783:947360`.
 *
 * Every seat draws from different pools now. The Commerce, Dominion,
 * Expansionist and Devotion sheets brought 348 rows live and retired their
 * cuts, and the shared batch added nine rows to `common.json` and moved The
 * Holy Army into it, which also changes the order cards are drawn in. New
 * shapes change what a seated card pays (commissions, levies, tended works,
 * faith purchases, card-taught rites, the Opus scopes), and new rows the bot
 * can build (Plantation House, Numidian Cavalry, Company Guard) change what
 * its technology valuer sees. No rule of play outside the decks changed. The
 * duel print grew and the standard one shrank, which is not a finding: the
 * seats hold different decks. Nothing stalled and no command was refused,
 * which the assertion above this one checks before the hash does.
 *
 * ---
 *
 * **Only the current band is dealt, and midgame cards pay half again
 * (c0a7536e, schema 124).** Duel `b5f6b5b8:286280` → `843c2e63:277904`,
 * standard `8f051783:947360` → `20f927f3:966650`.
 *
 * Two changes, not measured apart. A hand is now dealt only from the seat's
 * current band, so once band 1 opens a seat stops drawing band 0 cards, and
 * every live card in bands 1 to 3 has its yield figures raised by half. The
 * schema bump alone changes the state's bytes. Every seat in this game sits
 * under no leader and so holds all six decks, and no seat's current band ran
 * out of cards in either game, so the exhausted-band rule did not fire here.
 *
 * What moved at turn 120: the leading seat on each board finishes with more
 * band 1 and band 2 cards and fewer band 0 cards, and the standard board's
 * leader (seat 1, balanced) grew from 11 towns and 86 population to 13 and
 * 108, with science per turn from 380 to 708. The duel print shrank about
 * three per cent and the standard one grew about two. Nothing stalled and no
 * command was refused, which the assertion above this one checks before the
 * hash does.
 *
 * ---
 *
 * **Unrest in captured towns (batch WC1, schema 125).** Duel
 * `843c2e63:277904` → `ce3c090f:277904`, standard `20f927f3:966650` →
 * `9daae566:966650`.
 *
 * Only the hash moved. Both prints kept their length, because the state
 * differs only in the bytes of the schema number (124 → 125). No town changed
 * hands in the duel game by turn 120, which was checked: no town has
 * `capturedOn`, so no unrest record was ever written. The new bot terms (the
 * garrison a town in unrest needs, the declaration's unrest drag, and the raze
 * arm) changed no decision. Nothing stalled and no command was refused, which
 * the assertion above this one checks before the hash does.
 *
 * ---
 *
 * **War weariness (batch WC2, schema 126).** Duel `ce3c090f:277904` →
 * `1b5560ba:277904`, standard `9daae566:966650` → `37c3e10e:966087`.
 *
 * **Duel: only the hash moved.** Hashing the final state with the schema
 * number set back to 125 gives exactly the WC1 pin, and no empire in that game
 * has a war loss on record.
 *
 * **Standard: the simulation's happiness rule moved it, not the bots' peace
 * weighting.** The command logs are identical with and without the bots'
 * weariness knobs (`war.wearinessWeight` and `war.unhappyWearinessWeight`).
 * What happened, in order:
 *
 *   · Seat 4 (the warmonger) lost a unit to seat 3 on turn 83, and seat 3 lost
 *     two units to seat 4 on turn 93.
 *   · That weariness cost seat 4 its 10 per cent bonus to science and culture
 *     on turn 89, and halved seat 3's growth on turns 99 and 100.
 *   · The first command to change is seat 3's, on turn 102. Its town "Seat 4 2"
 *     (city 453) has 3 citizens where it used to have 4, so the bot no longer
 *     sets that town's production focus.
 *
 * At turn 120 the standard game's log holds 5,174 commands and its print is 563
 * characters shorter.
 *
 * Nothing stalled and no command was refused, which the assertion above this
 * one checks before the hash does.
 *
 * ---
 *
 * **Unit ranks (batch WC3, schema 127).** Duel `1b5560ba:277904` →
 * `d8a34333:278234`, standard `37c3e10e:966087` → `ab40e54f:956390`.
 *
 * Unlike WC1 and WC2, both prints changed length, because ranks change fights
 * on both boards:
 *
 *   · A unit that survives a fight earns experience, and the `experience` key
 *     now appears on pieces in the state.
 *   · A Veteran or Elite fights with a flat +3 or +6 strength line on the
 *     combat ledger, so later fights between ranked units resolve differently.
 *   · Bots keep damaged ranked units out of fights they are likely to lose
 *     (`military.veteranCautionBelow`).
 *
 * The two games therefore diverge from the first fight in which a piece earns
 * experience. The duel print grew by 330 characters and the standard one
 * shrank by 9,697 (about one per cent).
 *
 * Nothing stalled and no command was refused, which the assertion above this
 * one checks before the hash does.
 *
 * ---
 *
 * **D0 and C2a together (schemas 128 and 129).** Duel `d8a34333:278234` →
 * `6f55a0da:270418`, standard `ab40e54f:956390` → `caf0dbef:987468`. D0 landed
 * without re-cutting this pin, so the two batches are measured as one move.
 *
 *   · D0 changed what the decks deal: fourteen Dominion cards joined, seventeen
 *     changed and three were retired, so from the first draw that meets one of
 *     them the hands are different hands.
 *   · C2a typed the chairs. A typed card fits only a chair of its own type or a
 *     Wildcard chair, and the bots seat by type. Adopting a government keeps
 *     every card whose chair still exists and still fits it and moves the rest,
 *     where it used to empty every chair. The tier-18 governments count seated
 *     Orders by type, an unsorted card counting as its chair's type. The
 *     tier-38 governments are retired, which changes nothing here: no seat
 *     reaches draft 38 (the most is 24).
 *
 * The duel game sends 10 adoptions, 75 seatings and 43 unseatings; the
 * standard game 15, 127 and 85. The two chairs standing empty on the standard
 * board at turn 120 are held by malices. Nothing stalled and no command was
 * refused, which the assertion above this one checks before the hash does.
 *
 * ---
 *
 * **Dominion batch D1 (schema 130), ranks: earning them.** Duel
 * `6f55a0da:270418` → `b8469a41:274868`, standard `caf0dbef:987468` →
 * `c4b52563:951785`. Four things moved them:
 *
 *   · the version, 129 to 130;
 *   · the new `drill` phase, which raises the revision once more every turn;
 *   · the new record `Player.ranksEarned`, written for every seat whose units
 *     earn a rank, in a fight or otherwise;
 *   · the eleven cards: nine new rows join the Dominion pool and two rows are
 *     replaced (The Training Cadre takes over Drill Manuals, Honours of the
 *     Legion takes over The War Hall Schools), so from the first draw that
 *     meets one of them the hands are different hands.
 *
 * Checked by taking all four back out (the deck file as C2a left it, the
 * version at 129, the phase removed and the record not written), which gives
 * C2a's digests exactly on both boards. Nothing stalled and no command was
 * refused.
 */
const DIGESTS: Record<string, string> = {
  duel: 'b8469a41:274868',
  standard: 'c4b52563:951785',
};

/**
 * Long enough for the standard board on a loaded machine (171 s alone at the
 * plan's measurement; five times that beside a whole slow suite). The timeout
 * is the machine's, not the test's.
 */
const PATIENCE = 900_000;

describe('the six-seat digest', () => {
  for (const sizeName of ['duel', 'standard']) {
    it(
      `plays a hundred and twenty turns on the ${sizeName} board to the state it always reaches`,
      () => {
        const played = playSeatedGame(sixSeatSpec(sizeName));
        // A bot that refuses its own commands or stalls is a bug before it is a
        // digest; say which before the hash disagrees.
        expect({ sizeName, warnings: played.warnings, stalled: played.stalled }).toEqual({
          sizeName,
          warnings: 0,
          stalled: false,
        });
        expect({ sizeName, digest: digestOfState(played.game.state) }).toEqual({
          sizeName,
          digest: DIGESTS[sizeName],
        });
      },
      PATIENCE,
    );
  }
});
