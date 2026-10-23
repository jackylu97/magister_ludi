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
 *
 * ---
 *
 * **Batch C3 (schema 131): Doctrines come with a government, and the reward
 * hands go.** Duel `b8469a41:274868` → `2f3f0a7e:292377`, standard
 * `c4b52563:951785` → `cf4d90d5:967120`. Three things moved them:
 *
 *   · the version, 130 to 131, and the empty `rewardHands` field gone from
 *     every seat;
 *   · the reward hands themselves. Under D1 the duel game opened six and took
 *     a rare from each, the standard game nine; those rares are no longer
 *     dealt, so every seat that took one holds a different collection from
 *     its fourth draft on;
 *   · the Doctrine offers. Every seat here holds all six decks, so each
 *     tier-4 adoption offers The Steppe Confederacy, the one Doctrine in the
 *     data, and every one of the six seats takes it on both boards (scored
 *     above nothing by its border rule). Its other half is live while a
 *     seat's authority is negative: on twelve seat-turns in the duel game and
 *     sixty-five in the standard one.
 *
 * Measured apart: D1's tree reproduces D1's digests; this tree with the
 * Steppe's row withheld from every pool (the reward hands gone, no Doctrine
 * offered) gives duel `67496c7a:295285` and standard `69f3a11a:952512`; and
 * this tree as it is gives the literals below. The duel game adopts 11
 * governments, the standard one 15.
 *
 * In the duel game seat 3 is eliminated on turn 108 during an earlier seat's
 * turn. The driver read its seat list before the first seat moved, drove the
 * fallen seat anyway and warned when its End Turn was refused, which failed
 * the no-warnings check above the hash. `driveBots` now skips a seat that has
 * been eliminated or has ended its turn by the time its own turn in the pass
 * comes, as the stepper already did (`aiDriverEliminated.test.ts`). That
 * changes no state, since the refused commands never did. Nothing stalled and
 * no command was refused.
 *
 * ---
 *
 * **Dominion batches D2 and D3 (schemas 132 and 133), merged after C3.** Duel
 * `2f3f0a7e:292377` → `3ba9ba41:270645`, standard `cf4d90d5:967120` →
 * `b5305be8:966741`. D2 and D3 were built on a side branch at schemas 131 and
 * 132, without C3. The literals they pinned there (D2: duel `9fbcd543:269226`,
 * standard `26e408cb:978767`; D3: duel `b376efbc:278839`, standard
 * `184d350b:950167`) do not apply to this tree. Two things moved the digests:
 *
 *   · the version, 131 to 133;
 *   · the eighteen cards. D2 adds seven Dominion rows, reworks The Soldiers'
 *     Purse, and gives March Discipline's row to The Marching Camps. D3 adds
 *     eight rows and reworks Armoury Guilds. From the first draw that deals
 *     one of them, the seats hold different cards. At turn 120 the duel board
 *     has one seat with The Soldiers' Purse and one with The Captive
 *     Craftsmen, and the standard board has one seat with The Soldiers' Purse
 *     and one with The Swift Riders. None of them is seated.
 *
 * Other changes could move a game and move neither of these: D2's new attack
 * rules and `Unit.firstAttackTurn`; D3's record `Player.hexesPillaged`, the
 * raider named on the pillage occasion (which lets the Mandekalu's own salvage
 * rider pay), and the food and production of a pillage settling at once. No
 * unit attacks twice, no empire pillages a hex, and no seat has a leader, so
 * none of them is reached. Checked by taking the movers back out (the deck
 * file as C3 left it, the version at 131, the record not written, no raider
 * named and no settlement), which gives C3's digests exactly on both boards.
 * Nothing stalled and no command was refused.
 *
 * ---
 *
 * **Expansionist batch E0 (schema 134): the types, and the cards that need no
 * new shape.** Duel `3ba9ba41:270645` → `f5591807:272724`, standard
 * `b5305be8:966741` → `54af715a:983935`. Three things moved them:
 *
 *   · the types. Every Expansionist row, and nine shared rows, now carry the
 *     sheet's type, so an Expansionist card fits only a chair of its own type
 *     or a Wildcard chair. The bots seat through `slotOrderError`, so they
 *     follow the rule with no code change. With the types alone, at schema
 *     133, the boards give duel `0293413f:276537` and standard
 *     `cbd1f152:940662`;
 *   · the cards. Twenty-seven Expansionist rows join the deck, eight rows
 *     change to the sheet's text, two deferred rows are freed (The Rope
 *     Stretchers, Garden Cities) and two rows are retired (The Forest
 *     Gardens, Daughter Towns). From the first draw that meets one of them,
 *     the seats hold different cards. At turn 120 the duel board has one
 *     seat with an E0 card seated (Hydraulic Schools), and the standard
 *     board has three: The Ambarvalia on one seat, and The Plough Teams and
 *     Hydraulic Schools on two each;
 *   · the version, 133 to 134, which moves the hash and not the length. With
 *     every E0 change but the version set back to 133, the boards give duel
 *     `38abf0da:272724` and standard `769b92e9:983935`: the same games, the same
 *     lengths.
 *
 * The retired Keep building changes nothing here: only the retired Vigil
 * Charter unlocked it, so no seat could build one. The duel game adopts 11
 * governments and the standard one 16. Nothing stalled and no command was
 * refused.
 *
 * ---
 *
 * **Dominion batch D4 (schema 135), unrest, authority, and "this game"
 * counts, merged after E0.** Duel `f5591807:272724` → `6b98d500:290747`,
 * standard `54af715a:983935` → `baf6c127:961721`. D4 was built on a side
 * branch at schema 134, without E0, and the literals it pinned there (duel
 * `3583df65:268144`, standard `37ce3d15:948656`) do not apply to this tree.
 * Four things moved the digests:
 *
 *   · the version, 134 to 135;
 *   · the twelve cards. Nine Orders join the Dominion pool, The Proconsuls is
 *     reworked, and two Doctrines join the pools: The Consular Roads at tier 4
 *     and The Universal Monarchy at tier 18. Every tier-4 adoption now offers
 *     two Doctrines. At turn 120 the duel board has three seats with The
 *     Consular Roads and three with The Steppe Confederacy, and the standard
 *     board four and two. On the standard board one seat has The Acropolis
 *     seated and one holds The Satraps, not seated;
 *   · the new record `Player.enemiesKilled`, written for every empire whose
 *     units kill, the wild's raiders included;
 *   · the bots' new readings (`src/ai/value.ts`): D3's pillage extras, the
 *     places a grant can land, and D4's new shapes, so they price cards
 *     differently.
 *
 * The settlement of every town that a camp's or a discovery's grants feed is a
 * fifth mover, and it is taken out with the others. Checked by taking all five
 * back out (the deck file as E0 left it, the version at 134, the record not
 * written, and the bot's readings and the two settlements as they were), which
 * gives E0's digests exactly on both boards. Nothing stalled and no command
 * was refused.
 *
 * ---
 *
 * **Expansionist batch E1 (schema 136): the levies, merged after D4.** Duel
 * `6b98d500:290747` → `1b08ba49:270185`, standard `baf6c127:961721` →
 * `430a6ef2:959302`. E1 was built on a side branch at schema 135, without D4,
 * and the literals it pinned there (duel `213bf539:269774`, standard
 * `ad0181de:983942`) do not apply to this tree. Three things moved the
 * digests:
 *
 *   · the cards. Ten Expansionist rows join the deck, and seven cards (six of
 *     them new) are dealt only to a seat holding a card that grants a levy.
 *     From the first draw that meets one of them, the seats hold different
 *     cards;
 *   · the new `levyReturns` phase, which raises the revision once more every
 *     turn;
 *   · the version, 135 to 136.
 *
 * Bots do not levy yet, so no citizen is levied, no piece carries a levy mark
 * and no citizen is due home on either board, and no seat holds an E1 card at
 * turn 120. Checked by taking E1's movers out (the deck file as D4 left it, the
 * phase removed, the version at 135), which gives D4's digests exactly on both
 * boards. The duel game adopts 12 governments and the standard one 15.
 * Nothing stalled and no command was refused.
 *
 * ---
 *
 * **Dominion batch D5 (schema 137), units gained and new moments, merged after
 * E1.** Duel `1b08ba49:270185` → `31cc28b2:303960`, standard `430a6ef2:959302`
 * → `87201d9d:969761`. D5 was built at schema 136, without E1, and the literals
 * it pinned there (duel `161786a7:291108`, standard `83dff662:954606`) do not
 * apply to this tree. Four things moved the digests:
 *
 *   · the version, 136 to 137;
 *   · the fourteen cards. Nine Orders join the Dominion pool and three join
 *     the shared pool, and two Doctrines join the pools: Total Mobilisation at
 *     tier 18, and The Landsturm, the first Doctrine a tier-29 adoption
 *     offers. At turn 120 two seats on each board have The Gathering Host
 *     seated. On the duel board two seats hold Total Mobilisation, and three
 *     hold The Sword of State, one of them seated. On the standard board four
 *     seats hold Total Mobilisation, and one of them also holds The Landsturm,
 *     has The Longbowmen seated and holds The Open Muster, not seated;
 *   · the new record `Player.greatPeopleByFamily`, written for every great
 *     person an empire gains;
 *   · the bots' new readings (`src/ai/value.ts`, `src/ai/bot.ts`): the four new
 *     moments, the new grants, the citizen a muster costs, and what drafting a
 *     card hands over. That last term counts only for a card the seat does not
 *     hold yet, so a held card that does nothing seated is not worth its unit
 *     again (fixed at the merge; it moved the duel digest and not its length).
 *
 * Checked by taking all four back out (the two deck files as E1 left them,
 * the version at 136, the record not written, and the bots' readings as they
 * were), which gives E1's digests exactly on both boards. Everything else D5
 * changed stayed in for that run: the new moments, the `unitGained` tally and
 * the new emptiness test in `payBattleRiders` change nothing without the
 * cards. Nothing stalled and no command was refused.
 *
 * ---
 *
 * **Dominion batch D6 (schema 138), captures, commissions and the end of a
 * war.** Duel `31cc28b2:303960` → `a86298d3:304146`, standard
 * `87201d9d:969761` → `a0e03ce3:969986`. Four things moved the digests:
 *
 *   · the version, 137 to 138;
 *   · the cards. Danegeld, Vae Victis and Looted Art join the pools, War
 *     Reparations and Commission: A Victor's Peace are dealt, and six live rows
 *     change what they do (Clear the Frontier's citizens, Take the City's
 *     floor and Barracks, The Grand Campaign and The Captured Marvel reading
 *     the towns their goal counted, Hold the Capitals reading whose first town
 *     it is, and Spolia keeping its production for the Opus). At turn 120 no
 *     seat on the duel board holds a D6 card, and on the standard board one
 *     seat holds Commission: Take the City, not seated. The draws differ from
 *     the first hand that meets one of the new rows;
 *   · the new records: every empire's first town now carries
 *     `originalCapitalOf`, every war records the towns taken and the hexes
 *     pillaged (one war on the duel board has two towns taken), and a
 *     commission's tally row keeps the towns it counted;
 *   · the behaviour of the reworked rows above, which the control takes out
 *     with the records.
 *
 * Checked by taking all four back out (the two deck files as D5 left them, the
 * version at 137, none of the new records written, and the three captured-town
 * figures, the old original-capital readings and Spolia's capital delivery put
 * back), which gives D5's digests exactly on both boards. Everything else D6
 * changed stayed in for that run: the peace payment, the end of a war by
 * destruction, the goal floors and the new rewards, the capture amplifier,
 * renown scaled by the moment, the Opus bank's release, and the bots' new
 * readings change nothing without the cards. Nothing stalled and no command
 * was refused.
 *
 * ---
 *
 * **Expansionist batches E2 (schema 139) and E3 (schema 140), moments, records
 * and counts, and the land, merged after D6.** Duel `a86298d3:304146` →
 * `eed36fcb:288964`, standard `a0e03ce3:969986` → `0b6d0a03:1013929`. E2 and E3
 * were built at schemas 137 and 138, without D5 and D6, and the literals they
 * pinned there (E2: duel `70666b59:270586`, standard `b49d4bdb:960141`; E3:
 * duel `3175a91c:260719`, standard `d2051ff0:951807`) do not apply to this
 * tree. Four things moved the digests:
 *
 *   · the version, 138 to 140;
 *   · the cards. E2's nine new Expansionist rows and E3's five join the pools,
 *     E3 frees two deferred rows (The Common Domain, and The Raising of the
 *     Land, which moves from Tier IV to Tier III), and four live rows change
 *     (The Land's Great Work, The Prospectors, The Watercourses and The
 *     Landscape Garden). At turn 120 one duel seat holds The Woodland Bands and
 *     another holds The Grain Census, neither seated, and no standard seat
 *     holds an E2 or E3 card. The draws differ from the first hand that meets
 *     one of the new rows;
 *   · the two new town fields: `City.largestSize`, written at every founding
 *     and every new record, and `City.joinedBy`, written the first time a town
 *     is joined to its capital by road, with or without a card;
 *   · E2's new `roadJoinings` phase, which raises the revision once more every
 *     turn.
 *
 * Checked by taking all four back out (the deck file as D6 left it, the
 * version at 138, the phase removed, which also stops the `City.joinedBy`
 * writes, and `City.largestSize` not written), which gives D6's digests
 * exactly on both boards. Everything else E2 and E3 changed stayed in for that
 * run, and it changes nothing without the cards. That includes the bot's
 * phantom town, which now stands on the seat's capital. The duel game adopts
 * 11 governments and the standard one 17. Nothing stalled and no command was
 * refused.
 *
 * ---
 *
 * **Expansionist batch E4 (schema 141): works, claims and borders.** Duel
 * `eed36fcb:288964` → `63f7db4c:289000`, standard `0b6d0a03:1013929` →
 * `d1e861fb:1013915`. Four things moved them:
 *
 *   · the cards. Three Expansionist rows join the deck, five deferred rows are
 *     freed (Outposts, The Polders, Migration, The Great Migration, The
 *     Encroaching Fields), and two rows change (The Fish Traps, The Wide
 *     Country). From the first draw that meets one of them, the seats hold
 *     different cards. At turn 120 one standard seat holds The Fish Traps and
 *     Migration, neither seated, and no duel seat holds an E4 card;
 *   · the two new end-of-turn phases, `encroachment` and `migration`, which
 *     raise the revision twice more every turn;
 *   · the version, 140 to 141;
 *   · the rest of the new code: the Keep and the polder on the bots' worker
 *     roster, the tally renamed to `hexClaimed`, and the improvement rows.
 *
 * With the cards alone taken out (the deck file as E3 left it, everything else
 * in place), the boards give duel `9d909129:288964` and standard
 * `b066362d:1013929`: the same lengths as before, so the phases and the
 * version move the hash only. Checked by taking all of E4's movers out (the
 * deck file, the improvement table and `data/ai.json` as E3 left them, the two
 * phases removed, a purchase recorded under the old tally name, and the
 * version at 140), which gives E3's digests exactly on both boards. The duel
 * game adopts 11 governments and the standard one 17. Nothing stalled and no
 * command was refused.
 *
 * ---
 *
 * **Dominion batch D7 (schema 142), economy rules and Double Time, merged
 * after E4.** Duel `63f7db4c:289000` → `110900e1:270781`, standard
 * `d1e861fb:1013915` → `d35f6b2b:966765`. D7 was built at schema 139, without
 * E2 to E4, and the literals it pinned there (duel `19550795:276543`, standard
 * `60bda3e9:983815`) do not apply to this tree. Two things moved the digests:
 *
 *   · the version, 141 to 142;
 *   · the cards. Eight Dominion Orders, The Farming Garrisons and The Legions'
 *     Labour join the pools, and three Doctrines join the offers: The Marian
 *     Reforms at tier 4, The Laws of Lord Shang at tier 10 (the first Doctrine
 *     there, so every adoption at that tier now offers it) and The Fortress
 *     Empire at tier 29. At turn 120 on the duel board two seats seat The
 *     Farming Garrisons and one seats The Hunting Grounds, five hold The
 *     Marian Reforms and four The Laws of Lord Shang. On the standard board
 *     three seats hold The Farming Garrisons (two seat it), every seat holds
 *     The Laws of Lord Shang and four hold The Marian Reforms. The bots take
 *     Lord Shang because they price the food it moves as production at the
 *     board's own weights, and the towns that build soldiers then grow more
 *     slowly, which is most of why both boards' states are shorter.
 *
 * Checked by taking both back out (the two deck files as E4 left them and the
 * version at 141), which gives E4's digests exactly on both boards. Everything
 * else D7 changed stayed in for that run: the fourteenth town step, the
 * empire-stage production line, the fortified-unit test and count, the camp
 * muster rule, the weariness rules, the harvest in the drill phase, the
 * disband moment, Double Time's repeats, the fortification's announcement, the
 * completion riders' empty-payout test and the bots' new readings change
 * nothing without the cards. Nothing stalled and no command was refused.
 *
 * ---
 *
 * **Expansionist batch E5 and the lake fix (L1), merged after D7 (schemas
 * 143 and 144).** Duel `110900e1:270781` → `01ab9020:285340`, standard
 * `d35f6b2b:966765` → `a4608f70:956430`. E5 and L1 were built at schemas 142
 * and 143, without D7, and the literals they pinned there (E5: duel
 * `26886ed7:276670`, standard `1b906911:989041`; L1: duel `22e6ff02:275643`,
 * standard `19b5eebe:996001`) do not apply to this tree. Three things moved
 * the digests:
 *
 *   · E5's cards. Four Expansionist rows join the deck (The Burhs, Commission:
 *     Break the Sod, The Sovereign Writ, The Imperial Roads), one shared row
 *     joins the shared file (The Frontier Militia), The Heartland is freed, and
 *     The Domesday Survey and The Master of Works change. At turn 120 on the
 *     duel board one seat seats The Frontier Militia and another The Burhs; on
 *     the standard board one seat holds Commission: Break the Sod, not seated;
 *   · the open lake. A piece that may embark now crosses lakes, and a worker
 *     with Irrigation may lay floating gardens on one: at turn 120 three stand
 *     on lakes on the duel board and one on the standard board. Scouts,
 *     workers and soldiers step onto lakes (221 piece-turns on the duel board,
 *     79 on the standard one). No hull enters a lake;
 *   · the version, 142 to 144.
 *
 * Checked by taking E5's and L1's movers out (the Expansionist and shared deck
 * files and the lake row as D7 left them, and the version at 142), which gives
 * D7's digests exactly on both boards. Everything else E5 and L1 changed
 * stayed in for that run, the removal of E4's lake rule for workers included,
 * and it changes nothing without the cards and the open lake. The duel game
 * adopts 12 governments and the standard one 15. Nothing stalled and no
 * command was refused.
 *
 * ---
 *
 * **Dominion batch D8 (schema 145), the last eight Dominion Doctrines, merged
 * after E5 and the lake fix.** Duel `01ab9020:285340` → `029bb984:288649`,
 * standard `a4608f70:956430` → `ec53cf16:901072`. D8 was built at schema 143,
 * without E5 and L1, and the literals it pinned there (duel
 * `61231c1f:265576`, standard `c952c241:916732`) do not apply to this tree.
 * Two things moved the digests:
 *
 *   · the version, 144 to 145;
 *   · the Doctrines. The Soldiers' Share and The Servian Reforms join the
 *     tier-4 offers, Centurions, The Plunder Economy, The Strategoi and Weight
 *     of Numbers the tier-10 offers, Combined Arms the tier-18 offers and The
 *     Scourge of God the tier-29 offers. An offer of three is now dealt from
 *     five cards at tiers 4 and 10, so The Laws of Lord Shang is no longer
 *     every seat's Tier II Doctrine. At turn 120 no seat holds it. On the duel
 *     board three seats reached tier 10 and all three took Centurions. On the
 *     standard board all six seats reached tier 10 and every one took Weight
 *     of Numbers. At Tier I six seats across the two boards hold The Servian
 *     Reforms, four The Marian Reforms, one The Consular Roads and one The
 *     Steppe Confederacy; three seats hold Total Mobilisation at Tier III. The
 *     bots price a strength line as if every unit had it, so the scaled lines
 *     of Centurions and Weight of Numbers read as a flat +3.
 *
 * Checked by taking both back out (the Dominion deck file as the lake fix left
 * it and the version at 144), which gives the lake fix's digests exactly on
 * both boards. Everything else D8 changed stayed in for that run: the heal and
 * the rank around a hex, the timed effects on the raider, the raider's
 * strength on a pillage, the three new rules, the unit cost line, the Elite
 * and attack counts and their record, the rank on a surcharge and the free
 * unit's waiver, the aura's amplifier, the whole-hex share and the bots' new
 * readings change nothing without the cards. Nothing stalled and no command
 * was refused.
 *
 * ---
 *
 * **Expansionist batch E6 (schema 146): The Breadbasket and Veteran Colonies,
 * merged after D8.** Duel `029bb984:288649` → `3b48dd73:288649`, standard
 * `ec53cf16:901072` → `441af4ef:901072`. E6 was built at schema 145, without
 * D8, and the literals it pinned there (duel `e8c6ce6b:285340`, standard
 * `e4591a83:956439`) do not apply to this tree. On this tree only the version
 * moved the digests, 145 to 146. The two cards come live, but neither game
 * changes because of them: no seat holds either card at turn 120. The bots
 * never tell a town to stop growing, and they disband a unit only to clear
 * their arrears, so neither card would pay a bot anyway.
 *
 * Checked twice with the version at 145: once with the Expansionist deck file
 * as D8 left it, and once with E6's. Both give D8's digests exactly on both
 * boards, so the new town scope, the cap rule (`assignCitizens` leaves a
 * town's citizens on its food while a card moves its surplus) and the two
 * cards change nothing in these games. The duel game adopts 10 governments
 * and the standard one 14. Nothing stalled and no command was refused.
 *
 * ---
 *
 * **The movement fixes (`docs/flags.md` (xxxxxx), schema 147), merged after
 * E6.** Duel `3b48dd73:288649` → `828c72e8:271204`, standard
 * `441af4ef:901072` → `c404a125:916889`. The batch was built at schema 145,
 * before E5, the lake fix, D8 and E6, and the literals it pinned there (duel
 * `fe57c5b7:280097`, standard `5d676cf2:975894`) do not apply to this tree.
 * Four things moved the digests:
 *
 *   · the version, 146 to 147;
 *   · part 1: a landing, onto the coast or a lake, is planned only onto a hex
 *     the piece may stop on;
 *   · part 2: the bots step a garrison aside only onto land, bring an idle land
 *     piece on the water ashore and never dig in to mend there;
 *   · part 3: a march that has to rest on a blocked hex goes round it. In
 *     these two games 1505 detours were searched for and 519 taken.
 *
 * Checked by taking all three parts out and printing the version as 146,
 * which gives E6's digests exactly on both boards. The piece-turns land units
 * spend on the water went from 1640 to 980 on the duel board and from 862 to
 * 837 on the standard one. The longest run a soldier spends there went from
 * 58 turns to none on the duel board and from 40 to 13 on the standard one.
 * Nothing stalled and no command was refused.
 *
 * ---
 *
 * **The take (`docs/flags.md` (aaaaaaa), schema 148): towns may take each
 * other's hexes with the citizen tool.** Duel `828c72e8:271204` →
 * `ae39b205:271204`, standard `c404a125:916889` → `23269452:916889`. Only the
 * version moved them, 147 to 148: a hex moves between towns only on a player's
 * pin, and the bots never pin a citizen, so neither game changes. Checked by
 * printing the version as 147 with the take in place, which gives the movement
 * fixes' digests exactly on both boards. Nothing stalled and no command was
 * refused.
 *
 * ---
 *
 * **The rung fix (`docs/flags.md` (ccccccc), schema 149): the Order tiers open
 * at the government tiers.** Duel `ae39b205:271204` → `99856b59:272524`,
 * standard `23269452:916889` → `37e4b83b:940920`. Two things moved them:
 *
 *   · the version, 148 to 149;
 *   · the rungs. Tier II is dealt from draft 10 instead of 18, Tier III from
 *     18 instead of 29 and Tier IV from 29 instead of 38, each with its
 *     research age as before. By turn 120 on the standard board two seats had
 *     been dealt a Tier II hand before the fix (first on turns 99 and 101);
 *     now all six have (first between turns 68 and 98), and one has been
 *     dealt eight Tier III hands.
 *
 * Checked by putting the ladder back as the take left it and printing the
 * version as 148, which gives the take's digests exactly on both boards.
 * Nothing stalled and no command was refused.
 *
 * ---
 *
 * **Tier IV at 26 (`docs/flags.md` (ddddddd), schema 150): Tier IV's rung and
 * the tier-29 governments moved to 26 drafts.** Duel `99856b59:272524` →
 * `e030e5f7:272524`, standard `37e4b83b:940920` → `06b9e985:940920`. Only the
 * version moved them, 149 to 150: no seat reaches draft 26 in these 120
 * turns. Checked twice with the version printed as 149: once with Tier IV at
 * 26, and once with the ladder and the governments as the rung fix left them.
 * Both give the rung fix's digests exactly on both boards. Nothing stalled and
 * no command was refused.
 *
 * ---
 *
 * **The draft rung alone (`docs/flags.md` (eeeeeee), schema 151): an Order
 * tier opens at its draft rung, and the research age plays no part.** Duel
 * `e030e5f7:272524` → `9f1e136f:262163`, standard `06b9e985:940920` →
 * `97ff33bf:896332`. The rule moves both, not only the version: with the
 * change in place and the version printed as 150, the duel gives
 * `9333dcae:262163` and the standard board `0a2a4938:896332`, the same
 * lengths as the real digests and not Tier IV at 26's. At turn 120, three
 * seats are dealt a later band than the age gate allowed: on the duel board
 * a seat at 11 drafts in age 2 (Tier II, not Tier I) and one at 19 drafts in
 * age 3 (Tier III, not Tier II); on the standard board one at 20 drafts in
 * age 3 (Tier III, not Tier II). Hands dealt earlier in the game moved the
 * same way. Nothing stalled and no command was refused.
 *
 * ---
 *
 * **The Scientific, Dominion, Expansionist and Commerce builds, and the bot
 * changes that came with them (schemas 152 to 175, `d9d7390b..6cc886aa`).**
 * Duel `9f1e136f:262163` → `4ae3b573:274890`, standard `97ff33bf:896332` →
 * `f663ac08:988016`. No commit in this range re-cut the pin, so every change
 * in it is measured as one move, and no control run took the movers apart.
 * They fall in six groups:
 *
 *   · the version, 151 to 175, which changes the state's own bytes;
 *   · the Scientific build, S0 to S13. Thirteen charter technologies join the
 *     tree, and only a seat that drafted the charter may research one. A
 *     technology's price becomes a list with a charter premium. S1 to S9 add
 *     line traits, guildsmen counts (feature A), readings of the empires a
 *     seat has met (feature B), the building charters, the research record
 *     and new cards. S1b and S11 retire the rows the plan cut;
 *   · the Dominion build, D9 to D15. D9 retires the ten cards the pass cut
 *     and The Servian Reforms. D10 to D15 add new and changed cards, the
 *     commission moment and count (feature C), the resource sight gate and
 *     The Limitanei's extra worked hexes;
 *   · the Expansionist build, E7 to E12. E7 retires fifteen rows and changes
 *     ten. E8 to E12 add new cards, the hex marks, public works, and The Cura
 *     Aquarum's one answer to what a town holds. Veteran Colonies now gives a
 *     citizen for a free unit too (`6a836b49`);
 *   · the Commerce build, T1 to T7. T1 retires eleven rows, moves four to the
 *     shared file and changes fifteen. T2 to T7 add new cards, the
 *     `cardDrafted` and `postEstablished` moments, the trade commissions,
 *     deals as a card quantity (feature D), buying on credit, the
 *     `treasuryHeld` tally and Mercenary Contracts;
 *   · the bots. D16, S13, E13 and T9 give the new kinds a price, where many
 *     were priced at nothing or at a stand-in before (commissions, charters,
 *     and the new Expansionist and Commerce kinds). S13 also makes research
 *     read the folded price. Bots now levy a citizen when a seated card
 *     grants a levy, and retire a soldier in a town for Veteran Colonies'
 *     citizen (`e3edb81b`). T8 makes the bots renew their trade routes.
 *
 * **Both prints grew**: the duel by 12,727 characters (about 5 per cent) and
 * the standard board by 91,684 (about 10 per cent). The commit messages do
 * not say which mover adds the most bytes, so this re-cut does not assign the
 * growth. They name some likely sources: new records written during play (the
 * research tallies of S6, D12's `militaryGained` tally, E11's
 * `publicWorkCompleted` tally, T6's `treasuryHeld` tally) and trade routes
 * that now renew instead of lapsing (T8). Measured twice, same bytes both
 * runs. Nothing stalled and no command was refused, which the assertion above
 * this one checks before the hash does.
 */
const DIGESTS: Record<string, string> = {
  duel: '4ae3b573:274890',
  standard: 'f663ac08:988016',
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
