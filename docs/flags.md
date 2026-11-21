# The Standing Flags

### Pillaging and repair, 2026-11-19

Pillaging an improvement leaves a damaged work on the tile. Until a worker repairs it, all game rules treat the tile as having no improvement. This includes yields, resource access and the improved-tile counts on Orders. A worker can repair the original work without spending a charge. The player must be able to see the damage and order the repair. Dedicated 3D models for damaged works are deferred.

Every OPEN ruling, deferred half and live thread — **nothing here is done**. The
log of rulings already made and built moved to `docs/history/flags-log.md` on
2026-09-11, item letters kept, so a citation like "(pppp)" or "(eeee)" resolves
there. A ruled-and-built item leaves this page the day it lands; its story lives
in the log, in `docs/history/design-history.md` and in git.

Three sections: **A** is the questions only the user can answer, **B** is rows
that ship deferred-with-prose, **C** is open threads and playtest questions. The
user edits this page directly — user marginalia are rulings.

**Landed on `main` 2026-09-14** (the user: *"commit all of our leader related
changes and push"*): the whole held stack of 2026-09-10 → 09-12 — S2 · F2 · M1 ·
L2 · X14 · P3 · P4 · L3 · L4 · L5 · H7 · F3 · M2 · the mapgen defaults · D1 ·
L6 — at **schema 115**, gate green (core 209/6307, slow 38/147). `docs/great-
people.md` is the user's own version. The log of what each batch built is
`docs/history/flags-log.md`.

## A. Awaiting your ruling

**(ooooooo) Bot pass 3: the fixes the user approved on 2026-11-12, and the ones held.**
The two audits are `docs/audit/bot-pass-3-card-values.md` (faults B1 to B10) and `docs/audit/bot-pass-3-competitiveness.md` (faults P1 to P10). The proposal page is https://claude.ai/artifact/HHjupvTGRpJt5acTJiynyJ; B11 and B12 were added on it. The user commented on each item and wrote *"determinations that have been approved can be delegated"*. Each fix below is the audit's own "Fix" text plus the user's additions. After each batch the orchestrator reports the bots' turn-100 figures and the time per turn.
- **Approved** (the user's word on each is *"great"* unless quoted):
  - **P1** The threat count reads only empires at war and barbarians at full weight; a peaceful neighbour's soldiers count at a small share scaled by that neighbour's intent; each town keeps a floor of one defender.
  - **P2** No build-then-disband loop: the build choice reads upkeep as the disband choice does, a unit trained in the last 10 turns is not disbanded unless gold is below zero and falling, and the empire's gold is read once a turn. The user adds: *"the bot should plan ahead about how many soldiers its able to support, and put greater weight on gold when it's needed for soldiers. there should be mechanisms in place for dynamically updating yield values based on game factors right?"* So: the bot forecasts how many soldiers its income can pay for and does not train past that, and the worth of gold rises when upkeep needs it (the want book in `src/ai/wants.ts` already moves the worth of a coin; extend that mechanism, do not add a second one).
  - **P3** (the user, 2026-11-12: *"P3 approved. you're good to make those changes."*) The Epic Poetry ability is valued by the great people the seat's banked renown and renown income would call in the next 30 turns, times the bot's price for a great person, in place of the flat ability value. The renown weight itself (B11) stays held.
  - **P5** Camps ranked by what they cost the seat and what clearing pays, with a force sized to the camp.
  - **P6** A worker priced by the improvements waiting; each cause of idle workers fixed.
  - **P7** Measured again after P1; the settler's price looked at only if towns at turn 50 are still under 4.
  - **P8** The bot side only: check that the bot buys when a purchase beats waiting. No rule change.
  - **P9** The three unread wonder rewards priced through existing readings. The user adds: *"please make sure to implement the forbidden palace's additional wildcard slot"*. The Forbidden City's row carries `deferred: ["one more Order slot"]`; it becomes a real effect: its holder has one more Wildcard chair. This is a rule change in the sim, and the bot must read it.
  - **B1** The deck bonus is removed, with a tie-break of about 2 points and an explicit price for progress toward a Doctrine that needs many cards of one deck (the user: *"why is this bonus even needed? in theory, the greedy approach should be a good decision maker on its own already right?"*). The orchestrator also measures the cautious version (+5% of the card's own price for each held card, to +50%) and shows both.
  - **B2** Riders priced at full value times the rate, with the seat's own recent rates. The user: *"seems ok to me. the bonuses towards killing should probably factor in the bot's inclination to go to war"*. So a kill or capture rate comes from the seat's own war plans and recent fighting, not from one fixed figure for every seat.
  - **B3, B4, B5, B6** as the audit proposes.
  - **B7** Follower beliefs priced in the towns that follow. The user adds: *"make sure that bot's price the potential across all cities when making a selction (the first religious pick will always be zero because there are no followers)"*. So at the moment of choosing a belief, the price reads the towns the seat can expect to hold in its religion (all its own towns for a first pick), not only the towns that follow now.
  - **B8** The three unread conditions. The user asks: *"shouldn't this be able to be calculated ad-hoc with the sim's engine? If not, these kinds of calculations should be able to be calculated offline."* Ruling taken from that: **where the sim can stamp a card on a copy of the seat's state (`explainCardImpact`), the bot takes that figure as the card's pay now**, and keeps its own readings only for what a stamp cannot see (rates of future moments, growth, one-time lumps, cards that cannot be seated). This is the general fix for B3, B4 and B8 together. A slow-tier check compares the bot's price with the stamp over recorded positions, so a new card shape that the bot misreads fails a test.
  - **B9, B10, B12** as proposed on the page.
- **Held:**
  - **P4** wonders (*"defer for later, once we tune the bot parameters"*). **P10** the endgame (*"defer"*). **B11** the renown weight (*"hold off, we'll do a parameter pass later"*).
- **Slow bot turns first, 2026-11-13** (the user: *"fix the slow bot turns please"*). Before BP3, one batch (BPS) measures a six-seat bot game's late turns on this branch, finds what makes them slow, and fixes it. It is a speed fix only: the bots decide the same, and no rule changes. The method, the earlier numbers and the pins are in `docs/plans/performance-pass-2026-11-06.md`; the batch adds its own measurements and findings to that file.
- **More bot orders, looked at last, 2026-11-13.** BPS found that most of the late slowdown is play: on seed 999 the bots give 138 commands a turn against 80 before BP1, and hold 61 towns against 44. The user: *"the bot taking more orders might make sense, lets just continue with the build and examine at the end"*. So BP3 to BP8 go on as planned, and after BP8 one check measures the commands a turn and the seconds a turn again and reports them.
- **BP6's findings, 2026-11-14** (commit `86646802`; tables in `docs/plans/performance-pass-2026-11-06.md`):
  - No Doctrine needs cards of one deck, so B1's "Doctrine progress" prices the one case that exists: a Doctrine still to come that counts the seat's Orders (today The Magnaura only). The default is the ruled version (`score.deck.tieBreak` 2). The cautious version is `score.deck.sharePerCard` 0.05, off by default. `score.synergyBonus` is retired.
  - Open for the user: which version to keep (six seeds at turn 100, ruled against cautious: production −6% against +3%, gold −7% against +19%, science +11% against +6%, culture −14% against −12%).
  - Open for the user: seven commissions that the bot's forecast puts at the 60-turn horizon for every seat at every snapshot: A Guild Commission, A Victor's Peace, Hold the Capitals, Take the City, The Grand Campaign, The Lynx-Eyed Academy, The Wide Country. This is a forecast, not proof that no bot can meet them.
  - Not done in BP6: the cost of the work in a commission's draft price; a bench charge for a card that will not sit; pulls for steps no arm prices yet (a camp cleared, a town taken, a war won, a town converted, and others listed in the plan file).
- **BP7's findings, 2026-11-14** (commit `ac469aab`; tables in `docs/plans/performance-pass-2026-11-06.md`):
  - The Forbidden City's chair is built as a `slotRider` on the row (schema 243). The chair follows the town: completion, capture and raze fit the slots again. An empire that loses it re-seats as an adoption does.
  - Open for the user: the game now has two rules for a chair that closes. Scutage returns the card in the closed chair to the collection. The Forbidden City moves it to a free chair that fits, and returns it only if none does. They could agree.
  - Open: four seeds at turn 150 show science −22% and gold −28%. Split runs (B10 only, P9 only, no deadline) do not point at one part, and the untouched tree with a small knob change moved science −7%. A run over many more seeds is needed; it joins the check after BP8.
  - Not done: lost wonder races rose (the race term is P4, held); `docs/codex.md` is stale and was not regenerated; the chair's price by the walk differs from the stamp by up to a third.
- **BP8's findings, 2026-11-14** (tables in `docs/plans/performance-pass-2026-11-06.md`). Bot pass 3's eight batches are all committed.
  - Open: an empty town beside the wild often buys no defender (32 cases in six games to turn 100; in 24 the bot's own gold book held the coin, with a Granary as the best row). Not traced.
  - Open: a town founded in the turn has no rows in the gold book until the next turn. Reading the book again at each founding fixed it and cost a third of a late turn, so it was dropped.
  - Open: the wild takes any civilian with no soldier on its own hex, but the bot counts a soldier within 4 hexes as cover. Units lost to the wild rose 8%.
  - Open: 21% of worked hexes with a legal improvement are still bare at turn 100 (the page's aim was under 10%), and three quarters of worker-turns are marches (`workers.walkDiscount`, for the parameter pass).
  - For the user: the richest seat holds 8,749 gold at turn 150. What late gold should buy is a rule question.
- **BP9: the faults the end check found, ruled 2026-11-14.** The end check is the section "End check of bot pass 3, 2026-11-14" in `docs/plans/performance-pass-2026-11-06.md`; its list "Faults to fix next" numbers them. The user, on faults 1 to 3: *"yes go for it."* On faults 4 and 5: *"4 and 5 feel like genuine bugs, this should be patched out. I think it's fine to just prevent the bots from doing that, unless there's a more elegant solution."*
  - Fault 1: Money at Work and Bills of Exchange fold the whole empire once for each town (`countOf` calls `foldEmpireRates`). Fix the cost; the figures a card pays must not change.
  - Fault 2: `wakeTheCampaign` asks dug-in pieces again at every decision when their answer is "stay". Fix the cost.
  - Fault 3: a prophet walks between two hexes without end (`holySiteStep`). Find the cause and fix it.
  - Fault 4: a town switches its focus every turn (`focusCommand`). Find why the two readings disagree and fix that if the fix is simple. If it is not, a plain guard is allowed: the bot does not undo its own focus order within a few turns.
  - Fault 5: settlers with nowhere to go are woken and put back to sleep every turn, and the bot still builds settlers late. Find the cause first. A plain guard is allowed: the bot does not wake a settler that has no site, and does not build a settler when one already waits with no site.
  - Fault 6 (refused deals) is not ruled and stays out of BP9.
  - No game rule changes. These are bot and cost fixes.
- **BP10: the user's second ruling on the focus and the settlers, 2026-11-15**, after BP9 (commit `7acedb9d`; its report is the section "BP9" of the plan file). The user: *"the bot should simply just complete what it's working on without swapping focus in cities (disallow switching entirely). for the settler: aren't we having the bot look at it's available settle locations to determine whether to make a settler? How is it not sending those to settle if it already chose a spot"*.
  - Focus. The order in question is the citizen focus (`setCitizenFocus`: which yield a town's citizens favour), not the town's build. The reading taken: the bot chooses a town's focus when the town starts a build and does not change it until that build is finished. BP9's 5-turn hold (`driver.focusHoldTurns`) goes. The batch also measures the plainer reading, in which the bot sends no focus order at all, so the user can choose with figures.
  - Settlers. The bot does read the sites: the worth of a settler is a share of "the next town", one site for the whole empire (`ctx.expansion`, `expansionTerm` in `src/ai/wants.ts`). BP9 found that several towns can start a settler in the same turn, and that late settlers stand awake with no town founded (11.2 a turn at turns 141 to 150 on four seeds). Nobody has traced where those settlers are going. The batch traces it first, then makes the rule the user expects: the bot builds or buys a settler only for a site that no other settler of the seat (standing, marching or in a queue) is already for, and a settler that exists goes to its site.
  - Also in the batch, from BP9's proposals: the bot's want for a prophet it cannot use (a plain bug). The proposal to disband a settler with no site waits for the trace.
- **BP11: escorts for settlers, and the focus question, ruled 2026-11-15**, after BP10 (commit `3f94f1d9`; its report is the section "BP10" of the plan file). The user, on BP10's settler fix and its open problem (the wild took 38 settlers on the road at turns 100 to 130, against 9 before): *"yes, thats a good fix, go for it. the ai should try to escort its settler with military units. Also, why does the no focus orders make the outcomes so much worse? what would be a good fix otherwise, maybe having the bots change focus isn't a bad thing? I'm also wondering if we just need to rebalance the bot's parameters before making a determination"*.
  - Escorts. The bot tries to give each settler a soldier that travels with it, on the settler's own hex where the stacking rules allow, because the wild takes any civilian with no soldier on its own hex. "Try" is the user's word: a settler with no soldier available still goes when its road is safe. The bot also reads the danger along a settler's road, not only at its end.
  - Focus. The batch first finds out why sending no focus order costs production and science (BP10 measured it and did not explain it). It then adds a third setting of `driver.focusOrders`: the bot may change a town's focus at any time, but only when the new focus beats the present one by a clear margin (a knob), and never on a tie. The batch measures the three settings. The user decides which stays after the parameter pass ("rebalance the bot's parameters before making a determination"), so the batch sets the default to the setting that measures best and says so.
- **BP12: the late pile of settlers, approved 2026-11-15**, after BP11 (commit `3b042ec8`; its report is the section "BP11" of the plan file). BP11 left one open problem: at turns 121 to 130 the seats hold 22 to 31 settlers (seeds 999, 42, 7), against 4 to 11 before, and nobody traced why. The orchestrator asked "shall I have an agent trace it next?" and the user answered: *"yes to #1"*.
  - Trace first: for each settler alive late, what it was built for, what it is doing each turn (waiting for an escort, waiting for a safe road, marching, asleep), and how long. Then fix the cause in the bot. A settler that waits must not be a reason to build another, and a seat must not hold more settlers than it has free sites and can move.
  - No game rule changes. Early expansion must hold (towns at turns 50 and 100), and the wild must not take more settlers again.
- **BP13: refused deals, the escort plan's cost, and soldiers that guard workers; and a look at bare worked hexes. Ruled 2026-11-16.** The orchestrator listed the bot faults still open after BP12. The user: *"Let's fix the refused deal and escort plan points. dispatch an agent to investigate the bare worked hexes. the bots should have logic to move soldiers to protect workers if they sense a hostile unit."*
  - Refused deals (fault 6 of the end check): the bots propose about 3 deals a turn and one in seven is accepted, about 6 commands a turn for half a deal. Find why the proposer offers what the other bot refuses, and fix it so a bot proposes a deal only when its own reading says the other side will take it, or does not propose.
  - The escort plan's cost: about 5% of a late turn after BP12. Bring it down without changing what the plan decides.
  - New behaviour: when a bot sees a hostile unit that can reach one of its workers, it moves a soldier to protect that worker. BP11 found that making workers wait for a soldier on their own hex cost 20% to 40% of improvements, so the worker keeps working and the soldier comes to it.
  - Bare worked hexes: 21% of worked hexes with a legal improvement are still bare at turn 100 (BP8). A separate agent investigates why and reports; it changes no code.
- **An unowned hex always reads as outside the border. Ruled 2026-11-17.** The user, on a hill with four owned neighbours that the gold line enclosed: *"this should not be expected behavior, why would a hill tile outside your territory read as inside your territory, and why is there this 'afterimage' border laid over it? hexes that are unowned should always read as outside your borders."* The outline rule of 2026-11-14 took in an unowned hex with four or more owned neighbours (`visualTest.borders.fillNeighbours`, `fillPasses`) and marked it with a faint gap line. `fillPasses` is now 0, so the strong line never encloses an unowned hex at the edge of the territory. Holes too: the user, asked about a hole closed on every side by one empire's land: *"holes should get the full border, lets go with A."* `holeMax` is now 0. This replaces the outline rule of 2026-11-14 in the game's data; the code for it stays, unused.
- **A borrowed luxury cannot be lent on. Ruled 2026-11-17.** The user: *"yes, no trading lent luxuries."* Today `proposeDeal` accepts a luxury that the giver holds only on loan, because `dealSideError` asks `availableCopies`, which counts copies lent in; the giver keeps its access and the receiver gains it, so one copy serves three empires or more (found in batch SS4; `netCopies` floors the giver's own copies at zero before it adds the copies lent in). The rule: an empire can lend only copies that it owns. A borrowed copy can be used and not lent. The deal table then offers no such row. It is built after BP13 lands, because the bots' deals can change and the digest pins may move.
- **The Faith mark's dot means a prophet is affordable. Ruled 2026-11-17, built in batch SS2b.** The user: *"I think we should use this dot for when a prophet is available and no more dot after all religion beliefs have been chosen"*, and *"enough faith to buy a prophet is the right interpretation"*. This replaces the older note (ssssss) 4.7 for this mark: no dot for a god that waits for a name, a dot while `purchaseError` accepts a prophet in one of the seat's towns, and no dot once every belief of the seat's religion is chosen. The corner panel and top bar are option A revised (`docs/plans/ui-critique-2026-10-16.md`): each screen has one door.
- **Rendering speed, third pass. Ruled 2026-11-17.** The user: *"yes, small changes are ok! make sure to record before/after. panning > load time of new game > end turn pause"*. It starts when the second pass has landed.
  - Order of importance: the frame rate while the player pans, then the load time of a new game, then the pause at a turn end.
  - Small changes to the picture are allowed (for example a water mirror that leaves out small props). Each one comes with a before and after picture for the user, and each is one setting to revert.
  - A change that keeps the picture identical needs no approval. A change that alters it is shown first.
  - **The two mirror choices are both taken. Ruled 2026-11-17.** The user, after the before and after pictures: *"i'm fine with both A and B for reflections."* So `visualTest.coast.open.mirror.whileMoving` is false (no reflections while the camera moves; they return after `settleMs`) and `visualTest.coast.open.mirror.works` is false (farms, mines, herds and fishing boats do not reflect). Each is one setting to revert.
- **Rendering speed, second pass. Ruled 2026-11-17.** The user: *"Motion stopping after a few seconds is fine"* and *"you can delegate a subagent to continue with the performance improvements"*. The first pass is `docs/plans/render-performance-2026-11-16.md`.
  - Motion (smoke, birds, water, sails) stops after a few seconds with no input, by the setting `visualTest.motionRestSeconds`. It is an option in the menu, off by default, as the question to the user put it.
  - The road plan and the border plan stop re-planning the whole map on a change.
  - The works and towns material stops switching programs in a frame.
  - The terrain build's fixed 120 second limit goes: the load shows progress and does not send the player back to the title screen.
  - The pixel ratio and the edge smoothing stay as they are.
- **Queued after BP13: faster bot decisions, then the arena and the evolutionary tuner; and a rendering speed pass now. Ruled 2026-11-16.** The user: *"ok, whats the best way to do hyperparameter tuning for the bots? could you update the bot arena, i'd like to look into that evolutionary algorithm again. But maybe before that, lets wait for the bot pass to finish and see if we can make the decisionmaking much more efficient. Now that the visual update has concluded, could you look into the rendering pipeline and graphics and see if there are any speedups available? Lets make it run as efficiently as possible, also verify that the cloud shading is fully removed from the game."*
- **The bot's turn in phases, and a fourth rendering speed pass. Ruled 2026-11-17.** The user: *"additionally, could we try to improve the graphics performance further? lets take this phased approach, how long will it take to build?"*
  - **The phase shape is built right after BP16 and before the three items below.** Today a seat's loop restarts from the top of about 19 checks after every command, so each check is asked at every decision (the audit: disband asked 4,901 times for 0 answers, diplomacy 4,564 for 44, spend 4,901 for 337). In phases: research, diplomacy, the council, spending and housekeeping are each asked once a sitting, in order; then a loop runs over units and towns; a check is asked again only when a named event that it depends on has happened. Play changes slightly, so five seeds are checked.
  - **Rendering speed, fourth pass.** Same rules as the third: panning first, then load time, then the turn end; a change that keeps the picture identical needs no approval; a change that alters it comes with before and after pictures and one setting to revert.
- **Bot performance work, 2026-11-19.** The user approved continuing through the bot queue without an approval between stages. Start C2 after C1, then take BP17, BP18 and BP19 in order. Verify each stage against the measurements and play checks below before landing it.
- **After BP16: three more bot speed items. Ruled 2026-11-17.** The user, on the list offered after BP15: *"ok lets do 1-3."* They follow BP16, one batch each, in this order.
  - **BP17, the bots think during the player's turn.** Turns are simultaneous. With BP16's parallel driver, the bot seats plan in the background on the turn-start state while the human plays. At End Turn, a seat whose plan the human's commands did not touch is applied at once; the others plan again. Play stays identical to planning after End Turn.
  - **BP18, think about slow things less often.** The bot's picture of what it wants (`valueContext`: the want book, the chains, the trade reading) and the research goal table are rebuilt when something they depend on changes, or every few turns, and not every turn. This changes play, so it is checked on five seeds, with care: BP15 took out a close relative because it made the research goal worse.
  - **BP19, price fewer cards.** The council prices a shortlist of cards and not every card (audit finding T6). The audit's pricing bias is decided with it.
- **BP16: the audit's safe items, then parallel bots. Ruled 2026-11-17.** The user, on the order proposed after BP15: *"lets gp for 1 and 2."* (1 is parallel bots by the safe design; 2 is the audit's safe items.)
  - Stage A, from `docs/plans/bot-simplification-audit-2026-11-17.md`: the heal arm's bug for a hurt piece that is already fortified (T4); diplomacy asked once a sitting (T2); the spend arm keeps its "nothing to buy" answer for the sitting and prices a purchase once (T3). Play may change; the pins are cut once and five seeds are checked.
  - Stage B, parallel bots by the design in the BP15 section of the plan file, option (c): each seat plans in its own worker on the turn-start state; a conservative check decides whether an earlier seat touched anything the seat read; if so, that seat plans again serially. Play and the pins stay identical.
  - Not in this batch: the research goal table asked only when its inputs change (T1), the council changes and the pricing bias (T6), the knob cleanup (T5), the dead code.
- **After BP15: bots that decide in parallel, and a simplification audit of the bot's logic. Ruled 2026-11-17.** The user: *"ok that sounds good. parallel bots sounds good too. Before we look at tuner game specific changes, what other things could we do to improve bot performance? Could you do a pass looking through the logic, and seeing if any of it could be simplified?"*
  - Bots that decide in parallel worker threads are approved. BP15 reports a design for it (what changes in how seats see each other's moves in a turn, and how determinism holds); it is built as the next batch, BP16.
  - A read-only audit of `src/ai/` reports what could be simplified: arms that overlap or never fire, knobs that change nothing, readings computed and not used, and logic whose cost is high for what it decides. It writes `docs/plans/bot-simplification-audit-2026-11-17.md`. Nothing is removed until the user picks from it.
  - The tuner's own changes (a cheaper mode, early stops, shared snapshots) wait until after these.
- **BP15: more bot speed, with caching, and the worker that stays home. Ruled 2026-11-17.** The user, on the BP14 report: *"#4 worker should stay home yes. #1 bot speedup yes. Any more bot speed up approaches we could take? I'm happing to lean into approaches that take advantage of caching"*.
  - The five savings that BP14 found and left because each changes play slightly are taken (one picture of what the bot wants for each turn, the research goal table from data it already has, the wildcard chair priced once a turn, card figures kept for the turn after a seating, no work in the last decision that only ends the turn).
  - More caches are wanted: readings kept across decisions and across turns, each with its inputs stated, and refreshed only for what changed.
  - A worker stays in its town while a hostile unit can reach the hex it would work. It does not walk back out into the danger it fled (BP13c found 26 of 98 step-backs were such repeats).
  - The batch is checked on five seeds against the stored baseline, as BP14 was.
- **BP13c: after the worker fixes. Ruled 2026-11-17.** The user, on the BP13b report: *"step back fix is good. four sheet switch is good. is the sleeped worker every awoken? If not the fix should be to wake villagers before deciding to build new ones"*.
  - A worker that steps back from a threat stays there for the turn. It is not ordered out again in the same turn.
  - `growth.allFocusSheets` stays on.
  - Sleeping workers: `wakeIdleWorker` (`src/ai/bot.ts`) asks each sleeping worker once a turn what it would do awake. To verify and fix if false: the ask runs before any town decides to build a new worker, and the worker's price counts the charges of a sleeping worker, so a seat with an idle worker does not build another.
- **BP13b: the three worker fixes from the bare-hex report. Ruled 2026-11-16.** The user: *"the worker should target the highest value hexes, which is what it should be doing now no? a march should count as a claim, and a worker's payoff should count the charges that will actually land."* The report is `docs/plans/bare-worked-hexes-2026-11-16.md`. It runs after BP13 lands and before the decision-speed pass.
  - **The choice shares the city's rule.** Ruled 2026-11-16, in place of a share knob. The user: *"shouldn't the logic be shared in deciding which hex to work vs which hex to improve, basically the most valuable unimproved hex should be worked over a less valuable unimproved hex, no?"*, then *"ok i see, that should be the ruling."* Today `rankPlanFor` (`src/ai/plan.ts`) prices the gain of an improvement in the bot's currency (with the hammer premium) and does not ask whether a citizen works the hex. The city (`assignCitizens`) picks hexes by the citizen sheet the town carries (`RULES.cities.citizenWeights`, or its focus sheet). So a mine on a hill that the city will not work beats a farm on a hex that it works. The rule: for each candidate, the worker asks the city's own scorer whether a citizen will work the hex with the improvement on it (the improved hex against the town's weakest worked hex, on the town's sheet). If yes, the hex counts in full, whether a citizen is on it today or not. If no, only the part that needs no citizen counts (a resource it opens). There is no `workers.unseatedShare` knob.
  - **The bot compares all four citizen sheets.** Ruled 2026-11-16. The user: *"ok i see, lets use that approach."* Today the bot's focus arm (`src/ai/bot.ts`) compares the balanced sheet with the production sheet only. It will compare all four sheets a town can carry (balanced, food, production, gold) in the bot's own currency and pick the best, with the game's starvation guard as it is. The worker's test above reads the sheet the town carries. No game rule or weight changes. A switch in `data/ai.json` turns the wider comparison off, and the batch reports both readings on the shared baseline.
  - **A march is a claim.** A worker's march end counts as taken, so a second worker of the seat picks another hex.
  - **The price counts the charges that will land.** `explainWorkerCraving` counts each worker's charges by when they can arrive inside `workers.waitingTurns`, and not all at once on the best hex.
  - Not ruled, left as they are: the citizens' weights in the plan, a worker row in the gold book, and the bare-hex measure.
  - Order for the bots: BP13 finishes; then a pass that makes the bot's decisions much cheaper (BP14, with no change to what it decides where that is possible); then the arena is updated and the evolutionary tuner (`scripts/evolve.ts`, `data/ai.bounds.json`, `docs/plans/bot-evolution.md`) is taken up again.
  - Rendering, now: an audit of the painted board's drawing cost with fixes, in its own worktree. The picture must not change, except that the cloud shadows (switch 7, off by default since 2026-11-14: "lets get rid of the cloud shadows") are checked to be gone from what is drawn and are removed from the code.
- **Batches, one agent at a time in the main tree:** BP1 = P1 + P2 · BP2 = B9 + B5 + P3 · BP3 = the stamp-first pricing (B8's ruling, with B3 and B4) and the slow-tier check · BP4 = B2 · BP5 = B6 + B7 · BP6 = B1 + B12 · BP7 = B10 + P9 (with the Forbidden City's chair) · BP8 = P5 + P6 + P8's check.

**(nnnnnnn) A visual pass on the painted board, with low drawing cost: RULED 2026-11-12; a test version is in flight (batch V1).**
The user: *"i want to explore ways of making the game more visually appealing, without increasing the rendering costs too significantly."* The assistant looked at 20 screenshots of a turn-80 game (`scratchpad/shots2/`) and proposed ten ideas. The user approved the first six and asked: *"Could you make a test version for me to visually inspect"*.
1. **Sea with depth and motion** (*"yes, this is worth working on, we also need to distinguish ocean and coast tiles"*). Water is darker away from land, the hard pale ring at the coast becomes a soft foam line, and slow glints move on it. **Coast and ocean must read as two different kinds of hex at a glance**, because the rules treat them differently (embarking, Open Ocean).
2. **Thinner rivers with banks** (*"this would be great"*). About half the width, a light bank line, slightly rounded corners. A river must still read clearly as a river on a hex edge.
3. **One border, at the edge** (*"great"*). The strong line only where an empire's land ends, and a faint inner tint. Worked and locked hex marks are a different layer and stay.
4. **Ground detail on flat terrain** (*"great"*). Dune ridges on desert, grass tufts on plains, drift lines on snow, painted once when the board builds.
5. **A cleaner fog** (*"great"*). Remembered ground takes a cool, pale paper tint with a light hatch, in place of the brown wash.
6. **Quieter pins** (*"great"*). Resource pins shrink when zoomed out, the pin fades on a hex the empire has already improved, and unit badges stay strongest.
- **Cost rule:** no full-screen pass, no new per-frame rebuild, no new draw call per hex. Each change is a shader, a colour, a line width or something painted once.
- **Test version:** each of the six is an option the player can switch on and off, so the two looks can be compared in the same view. Defaults are decided after the user has looked.
- **Added 2026-11-12** (the user: *"let's try 8 and 9 and a few options for 10, add those as well. 7 will be a large effort, so keep that on the backburner for now"*). Each is one more switch in the test version:
7. (Number 8 on the list) **Drifting cloud shadows.** One slow scrolling pattern multiplied into the ground colour. No extra pass and no extra geometry.
8. (Number 9) **Small idle motion.** Flags that wave, ships that bob, smoke from cities, moved in the vertex shader by one time value. No new draw call per piece and no per-frame rebuild; the unit fingerprint and instancing rules stay.
9. (Number 10) **Light by age, as a choice of options.** A selector with a few settings to compare, for example: fixed light as today; a warmer default; the light follows the player's age (morning, day, golden, dusk across the four ages); the light moves slowly through the day as turns pass. The assistant's readings; the user picks after looking.
- **Parked:** unit silhouettes (number 7 on the list). The user called it a large effort.
- **The user's verdict on the test version, 2026-11-12:** *"the ground details look bad and so does the cleaner fog. Is there a way to make the rivers feel more organic? Same with roads. The other changes feel pretty good, lets defer the changing lighting with age though"*.
  - **Dropped:** switch 4 (ground detail) and switch 5 (the cleaner fog). Their code leaves the test version; the fog and the flat ground stay as they were.
  - **Kept:** 1 (sea, coast against ocean), 2 (thinner rivers), 3 (one border), 6 (quieter pins), 7 (cloud shadows), 8 (idle motion).
  - **Deferred:** 9 (light by age). The selector leaves the test version; the fixed light stays.
  - **New, to try in the test version (the assistant's readings of "more organic"):**
    - **Rivers** drawn as one smooth, slightly wandering ribbon along their hex edges: corners rounded into curves, a small sideways wander hashed from the tile coordinates, a width that grows downstream, a tapered source, joins that merge smoothly, and a mouth that opens into the coast. A river is still a rule on a hex edge, so the ribbon stays close enough to its edge that a player can tell which two hexes it divides.
    - **Roads** drawn as curved paths: a smooth curve through the hexes a road links, with a small hashed wander so that no two stretches look the same, junctions that merge as forks, and a road that meets a river at a right angle with a small bridge mark. A road must still read as joined or not joined at a glance.
    - Both are built once and rebuilt only when a road is laid, as today. Same cost rule as the rest of the pass.
  - **Grounding and coloured light, to try** (the user, 2026-11-12: *"ok lets try #1 and 2 and go from there"*). Two more switches in the test version:
    - **Grounding:** soft shade where things meet the ground, baked into the board's colours once when it is built: under tree clumps, at the foot of mountains, in the folds of hills, round city walls and improvements. Each unit piece gets a soft dark patch under it. No pass and no per-frame work.
    - **Coloured light:** shadows are tinted cool (blue-violet) and the lit side stays warm, and units and mountains get a thin rim light on the side away from the sun. A change to the shading only.
  - **Borders, to compare** (the user: *"i'm not sure how i feel about the land borders following the contour of the hills, the border lines feel a bit strange/misshapen"*): three options beside switch 3: `drape` (as today), `ruled` (straight ink lines from hex corner to hex corner that ignore the relief) and `wash` (a thin ruled line with a band of the empire's colour fading inward).
  - **A test scene** (the user, 2026-11-12: *"for the sake of testing, could we create a test scene that we use to render changes? We don't need to wire it/measure the full game until we finish iteration on these improvements."*). One small hand-made world, drawn by the real renderer with no game running, that holds every case the visual work needs. Visual changes are built and judged there first. Wiring a change into the full game, and measuring its cost in a full game, waits until the user has finished iterating on the look.
    - It grows from the flair gallery's existing painted world (`src/flairGallery/worldFixture.ts`), shown full-window, with named camera views, the light selector and the visual switches. It is fixed and deterministic, so two screenshots from one view differ only by the switch.
    - Contents: every terrain and feature; coast beside ocean; a lake; a river with a source, a join and a mouth; hills and mountains with a border crossing them; roads with a junction and a river crossing; three cities of different sizes with one walled; each improvement and several resources; units of each class, one ship; visible, remembered and unexplored ground side by side; two empires that share a border.
  - **The north star, 2026-11-12:** Islanders and Dorfromantik (see `docs/art-pass.md`). The user asked the assistant to do the visual work directly, not through a subagent, and rejected in turn: the brushed coast edge, a two-tone noise edge, the new border styles (the old border is back; switch 3 is off by default), flat ribbon roads, and a realistic sea. The sea in the test scene is now two flat matte tones with a soft wandering edge, a pale shore and a few slow drawn ripples. Roads are a worn track of five bands. Neither is ruled yet.
  - **Coast into ocean** (the user, 2026-11-12: *"the coast looks good, but it should really transition more nicely into ocean, maybe we can do a similar kind of brushstroke technique like how the land terrain transitions?"*). The step from coast to ocean uses the same painted, brushed edge that the land uses where two terrains meet: an irregular stroke that crosses the hex line, in place of a clean hex-shaped step. The two kinds of water must still read as different hexes at a glance (the user's earlier ruling), so the stroke softens the line and does not blur the two colours into one.
  - **Towns and works in the test scene, 2026-11-12** (the user: *"lets let the city fill its hex, let's also get rid of the flag in the middle of the city. Proceed with the houses, mines, quarries and farms. You can dispatch these in a fable subagent."*). All of it is in the test scene only, behind `visualTest.northStar`:
    - A town fills its hex: the wall, the ground patch, the houses and the monuments grow until the town reaches close to the hex edge. The garrison's place in the middle stays clear.
    - The pole and flag that stand in the middle of a town are not drawn. The town's banner over the board and the border still show the owner.
    - Houses, mines, quarries and farms get new models in the style of the round trees and the monuments: simple, full shapes, matte colour, few details, readable at play zoom. A Fable agent builds them; the assistant judges the pictures.
  - **Terrain against the reference games, 2026-11-12** (the user, after the assistant's comparison with screenshots of Islanders and Dorfromantik: *"ok, lets try and make these changes"*). Test scene only, each with its own number or switch under `visualTest`:
    - A deeper, more saturated land palette (`visualTest.land: "deep"`; `"soft"` gives the earlier one back).
    - Trees on open land stand in small groves with empty meadow between them, and forests are denser and darker.
    - Hills are two or three flat terraces with a darker side face, in place of low mounds with many lit facets.
    - Mountains take a warm slate colour that belongs to the palette.
    - The hex line is fainter.
    - Not yet: land with a thick side face everywhere, and a clearer difference between desert and unexplored paper.
  - **Shading, 2026-11-12** (the assistant proposed five rendering items; the user: *"ok lets go for that"*). Test scene only:
    - A height gradient on trees, rocks and buildings: darker at the foot, lighter at the top.
    - Coloured shadows: a shadow leans blue or purple and keeps its saturation.
    - A stronger contact shade where things meet the ground (switch 9's numbers).
    - Two new switches for the user to judge: a final colour grade (contrast, warm highlights, slight haze), and a blur at the top and bottom of the screen for a miniature look.
    - Bevelled model edges are modelling work and are not in this step.
  - **Rendering, second step, 2026-11-12** (the assistant listed seven items; the user: *"ok lets do 1,2,3 and 4. units should come next but will require input from me. #6 after that"*). In the test scene: (1) edge smoothing on the painted board's render targets; (2) sharper shadows from a shadow map fitted to the view; (3) bevelled edges on the new models; (4) more life: trees that sway, a few birds, a moving part on a work. Then units, which need the user's input first. Then land with a side face. The soft edge of the known world (item 5) was not chosen.
  - **Rivers and roads, 2026-11-12** (the user: *"the rivers and roads surely need work too"*, then *"yes do detailing on the river and roads, i think the rivers need better modeling, like in our reference games. Roads should also have some 3d representation"*). In the test scene: a river is modelled, not painted: a channel with banks that have height and a water surface set below the ground, as in Dorfromantik. A road has a 3D form: a bed with an edge that stands up from the ground, and small things along it. A road through terraced hills gets a cut or a ramp.
  - **Second look at rivers and roads, and yields on the board, 2026-11-12** (the user: *"let me zoom in more closely. can't we give the road a geometry and place it along the hill? the river coloring is quite bad, i think thats the biggest thing that needs changing. #1 is great, maybe there's something we can do with effects, like lighting or light particles?"*).
    - The test scene lets the camera come closer.
    - A road is its own geometry with its own smooth height, laid along a hill as a ramp with sides that reach the ground. It is not draped over each step.
    - The river's colours change: no pale stripe down the middle, a deeper water tone that belongs with the sea, and a quieter bank.
    - **Yields on the board: approved in principle** (option 1 of the assistant's three: a hex's scenery gets fuller as its yield rises, by its strongest yield), with effects such as light or light particles on rich hexes. Not built yet. The picture reads the yield the player's own empire sees, and is built again only when a hex's yield changes.
  - **Yields on the board: build approved, 2026-11-12** (the user: *"i think we need to smooth the geometry of the roads, or at least smooth the rendering of the sides of the road. Could we try to make the river colors more similar to dorfromantik? and yes, please work on the improvements!"*). The assistant's proposal, which the user approved: three steps of richness by a hex's strongest yield; scenery from step 1 (food: sheaves and crops; production: timber and stone; gold: a stall and gilding; later science, culture and faith with a small monument each), and a light or particle effect on step 3 hexes. First build in the test scene with food, production and gold. It shows on every hex the player's empire can see, reads the yield as that empire sees it, takes its steps from `data/view3d.json`, and is built again only when a hex's yield changes. Also: a road's sides are smoothed, and the river takes Dorfromantik's pale, soft water colour.
  - **Detail on roads and rivers, and examples of rich hexes, 2026-11-12** (the user: *"ok the roads are still pretty ugly, i think the road and river both need more detail, look at how the reference games handle this. please add some tiles with examples of all first/second/third step tiles. they look promising."*). From Dorfromantik's screenshots: its water is a patchwork of two close tones with a thin pale shore, reeds, lily pads and stones; its tracks carry strong repeated detail across their length (sleepers and rails on a dark bed). So: the river gets water patches, lily pads, reeds and bank stones; the road gets paving slabs and kerb stones. The test scene gets a `yields` view with one example of each kind of rich hex at each step.
  - **Third look at roads and rivers, 2026-11-12** (the user: *"kerb stones feel awkward, make the road a bit thinner and windier? river give it a layer of sandy beach, make it non-uniformly windy and vary in width. look at our reference games outside of dorformantik for ideas"*). From Kingdoms and Castles: water with a pale sand beach beside it, and roads as plain pale dirt paths with no edging. So: no kerb stones, a thinner road that winds more; a river with sand on both banks that is wide in places and thin in others, a width that swells and narrows, and winding that is strong in some stretches and slight in others.
  - **Two river directions to compare, 2026-11-12** (the user, of checkpoint 15's river: *"they look very awkward. lets talk through what would actually make them look better"*; then, of the assistant's choices A (the river is a cut channel that follows the hex edges) and B (the free curve made a real stream: two different banks, sand bars inside bends, darker water, a lusher strip beside it): *"ok lets try that.i think i prefer B but i'm open to seeing A. a sixth is fine, but maybe smaller is better"*). Both are built in the test scene on the same river, so the user can switch between them: B with switch 4 on, A with switch 4 off. The river is a sixth of a hex wide or a little less. Moving rivers into hexes (choice C) is not done: it changes the rules.
  - **The free stream is chosen, 2026-11-12** (the user, of the two rivers: *"B is much better, and i agree with your assessment, let's work on your suggestions for B"*). The river is the free stream (switch 4). Built on it: smaller sand bars with green on the old ones, a stream that joins a river a little way downstream through an opening in the river's bank, a spring pool where a river starts on open land, and more bends on long runs. The edge channel (choice A) stays behind switch 4 for comparison and is not developed further.
  - **A true cut for the free stream, 2026-11-13** (the user: *"ok do the true cut and then fic small issues"*). The ground is cut along the stream's own curve: the water lies below the land, and the banks slope down to it. Each hex near a river carries the river's line (`tile.riverCarve`, set when the board is built); the ground's height reads it, and the hex's mesh gets vertices along the channel and where the channel crosses the hex's outline, so two hexes meet with no gap. Then the small faults: the sand tail at a junction, a second source on grass in the scene, and larger reeds and stones.
  - **The river as scenery, 2026-11-13** (the user: *"it still doesnt feel right, maybe not natural or not aesthetic. the rivers should feel dynamic and something to look at, scenery like an oasis that holds up on its own. the junction has blocky colors now take another look."*, then *"look at short hike the game for inspo maybe"*). The river is a place to look at, not a line: trees and bushes keep to its banks; pale glints travel downstream on the water; and, from A Short Hike, the water is a deep saturated blue with a turquoise band at its edge and a thin, broken white foam line at the waterline. At a junction the inner bands of a joining stream narrow smoothly to nothing, and the river's own bands run through unbroken, so no band ends in a block.
  - **Foam, varied trees and width, 2026-11-13** (the user: *"yeah lets add white foam, vary the trees, we'll do a pass on the coast after. can you make the river wider and narrower in areas too"*). The river has pools and narrows; rocks stand in the stream with white water round them, and the narrows show white streaks; riverside trees stand in bunches of mixed size with open bank between, and keep off a bridge. **Next: a pass on the coast.**
  - **The coast, redone, 2026-11-13** (the user: *"ok lets redo the coast and ocean/coast transition"*). After A Short Hike, as the river was: from the land outward the sea is a band of pale sand, a thin white foam line that laps in and out, a crisp band of turquoise shallows, then the coast's blue and the ocean's deeper blue. Coast and ocean meet in a crisp step with a drawn pale line on the coast side, not a soft blend, and the step still wanders so it follows no hex line. Coast and ocean hexes must still read apart at a glance (the user's earlier ruling). `visualTest.sea.style` picks this look (`"bands"`) or the earlier soft one (`"soft"`).
  - **A free coastline, 2026-11-13** (the user, on the offer to give the coast its own smooth line: *"lets work on the coastline yeah"*). The shore no longer follows the hex outline. One smooth line runs through the middle of each shore edge, so a corner of land that points into the sea is rounded off and a corner of sea that points into the land is filled, by the same small amount. The land slopes down to that line as a sand beach and goes under the water, with no vertical side face; the sand, the foam line and the shallows follow the line. A river mouth pulls the line in to a cove that meets the river. The centre of every land hex stays dry and the centre of every water hex stays wet, so a piece always stands on the right side of the line. As built (checkpoint 25), the line is also relaxed, which takes out the rhythm of the hex corners; on a shore that runs north to south it can lie up to half a hex from the true edge. `visualTest.coast.relax` lowers that. `visualTest.coast.free` turns the free coast on, and the sea switch carries it; with either off the hex shore of the entry above returns. **Open:** an empire's border still follows the hex outline, so on a shore it runs over the sand and the water; and the cost on a full map is not measured (about a tenth more triangles in the test scene).
  - **The sea's bands, smooth, and the river's end, 2026-11-13** (the user: *"ok lets find a way to merge the coast with the rivers end. Also, i think the changes in color are a bit jagged, could we take a look at how the ocean is being colored and how we're creating those segments of color? it looks unnatural to me"*). Cause of the jagged bands: the sea's paint read two numbers stored at each corner of the water's large triangles (the distance to the shore, and the count of hexes from land), and the graphics card joined them in straight lines, so each band's edge was a chain of straight pieces with a kink at each triangle. Ruling: the sea reads its distances from one picture of the whole map (a distance field), made from smooth lines: the free waterline, and a second smooth line between coast hexes and ocean hexes. Each band's edge is then a smooth curve. Coast and ocean hexes still read apart. At a river mouth the sea takes the river's colour in a tongue that reaches out from the river's end, and the foam line and the sand do not cross the mouth.
  - **The open sea after A Short Hike, 2026-11-13** (the user, of the smooth bands: *"yeah its too tidy but its better. could you take a look at our reference games and see how they do it?"*, then, of the plan below: *"great lets do the short hike approach"*). What the references do: A Short Hike draws one thin uneven band of turquoise and foam at the shore and no band further out, fills the open water with large loose outlined shapes in close blues that follow nothing, and rings each rock in the water with foam; Islanders draws one thin band and a soft glow; Dorfromantik has no open sea. Ruling: (1) one band at the shore, uneven in width; (2) no drawn line at the step from coast to ocean and no second step, and the two blues meet on a loose edge, so coast and ocean hexes still differ by colour; (3) the open water carries loose contour shapes in close blues with thin lighter outlines, drifting slowly; (4) a few rocks stand off the coast, each with a foam ring.
  - **Calm water under the sun, 2026-11-13** (the user, after the contour shapes: *"yeah the pattern needs some work, lets go with a different scheme"*; then *"is there any way to fake realism for the water? what if it had basic sun reflections and water reflections. maybe that combined with #3, with the noise pattern removed?"*; then, of a first try with sparkles: *"this isn't what i was thinking at all, more like the specular highlights from specifically the sun on calm water"*, with three Midjourney pictures; then *"could you do some more iterations on this until it looks aesthetic"*). This replaces point (3) of the entry above. The open water has no pattern of its own: it is a calm, deeper blue that mirrors the sky, with soft cloud shapes in it, and the sun shows as a road of short level strokes of light on a faint warm glow. The band at the shore, the loose edge between coast and ocean, and the rocks stay. Built as pattern 5 (`visualTest.coast.open.pattern`; the scene page's `sea=1..5` shows the others). **Open:** true reflections of land, boats and buildings, which the user's pictures show, are not built; the user's verdict on this version.
  - **Softer, lower hills, 2026-11-13** (the user: *"lets take a look at hills again, i think they're a bit too chunky and unnatural in contrast to our other changes now, lets smooth them out slightly, make them not as tall"*). The terraced hill of 2026-11-12 (a flat top on steep dark sides, with a second step) gives way to a low rounded mound: a rounder outline, a profile that rises in a few gentle facets to a small top, about half the height, and sides only a little darker than the top. `visualTest.hills.smooth` turns it on; with it off the terraces return.
  - **Hills, further, and the brush strokes between terrains return, 2026-11-13** (the user, of the rounded mounds: *"ok thats too round, could you make them feel a bit more realistic? and blend into the terrain a bit more"*; then: *"definitely an improvement, i think they need to inherit the ground's texture, could we make them a tad even more organic looking, and a little less round? also, lets bring back the brushstroke transitions between terrain types, its looking much closer now"*). A hill is uneven and lopsided, shades off into the ground by slope, and carries the ground's own brush strokes across it. The clean tiles of 2026-11-12, where a hex took only its own terrain's strokes, are withdrawn: strokes cross from one terrain into the next again (`visualTest.tiles.clean: false`). The fine groove at each hex edge stays.
  - **Rocky hills with green on top, 2026-11-13** (the user, after several rounds of soft mounds, with four Midjourney pictures: *"take a look at these renderings from midjourney, maybe they need to be more rocky, with occasional cliffs and dropoffs, foliage lies on top of them in a layer rather than being coated in green color"*; before that: *"could we make the mounds generally larger and a bit more bumpy"*, *"larger base, they don't need to be taller"*, and *"the triangles make them look crumpled"*). A hill is a mass of rock with the ground's green lying on its top and on its gentle side. Where its side is steep it is bare rock in a few large clean facets: a cliff or a drop-off, on one side or two and not all round. The gentle side runs down into the ground in the ground's own strokes. The base is broad and the height is as before. `visualTest.hills.soft.cliffs` holds the rock's settings.
  - **Painted ground, uneven cliffs, and mountains in the hills' language, 2026-11-13** (the user, of the terrain edges: *"i think the terrain blending seems worse for whatever reason that what it used to be ... I'd rather it blend a little more, and have the texture feel a bit more painterly"*; then: *"could we revert the hex groove so that between terrains there's not a rigid cutoff, the half tones look great, is there any way we could make the strokes look more painted instead of vector art. The hills look better for sure, i think i agree with your follow ups too. Could you also do a pass to make the mountains more mountain-like, and we can try to improve the visual language across hills/mountains? take a look at my reference for inspiration on how organic forms should look"*). (1) Strokes from another terrain are mixed half way toward the hex's own ground (kept: "the half tones look great"). (2) The fine groove at each hex edge is withdrawn, so no line cuts the strokes between terrains. (3) The strokes are to read as paint and not as flat vector shapes. (4) A cliff rises and falls along its length and breaks into ledges. (5) Mountains are to be more like mountains, and hills and mountains are to share one visual language: rock in large facets, warm in the sun and cool in the shade, with green or snow lying on the level parts, as in the user's Midjourney pictures.
  - **The ground as it was, and new mountain models, 2026-11-13** (the user, after the painted-ground build: *"could we have the ground just look the way it used to before our changes?"*, and of the proposal for new mountain models: *"let's work on new mountain models, yes"*). Points (1) and (3) of the entry above are withdrawn: no half tones, no extra strokes, no strokes laid across terrain edges, no brush streaks, and the paper's tooth at its first strength. The ground is painted as the approved study paints it; the hex groove stays off and strokes cross between terrains. Each withdrawn piece keeps its code behind a number set to nothing (`visualTest.paint`, `visualTest.paper`). The ground's colours are still the deeper set of 2026-11-12 (`visualTest.land: "deep"`); `"study"` gives the first colours. New mountain models: rounded, faceted crags with level shelves where green or snow can lie, in the rock of the hills' cliffs, after the user's Midjourney pictures. A Fable agent builds them in the visual worktree, as the user allowed for modelling.
  - **The study's ground, with more of its own strokes across terrain edges, 2026-11-13** (the user, after edge strokes and half tones were tried again: *"now it looks too jumbled, what i'm looking for is a patchwork transition"*; *"lets get rid of the halftones too ... could you double check what we had before our changes and just do a bit more of that? I swear it looked way better before we started with these graphics changes"*; *"ideally we keep the relative size of the old strokes and just extend more of them across hex transition boundaries"*). Found: the ground painter of 8 November and today's are the same code with the new numbers at nothing; what changed the ground's look was the deeper colours of 2026-11-12 and the colour grade, which make every edge harder. Ruling: the ground takes the study's colours (`visualTest.land: "study"`) and strokes at their own size; no half tones; and more of the study's own brush groups are laid along the edges between terrains only (`visualTest.paint.layers`). The study's dark crease along a hex edge is at half strength (`paint.crease`).
  - **Later rulings of 2026-11-13, in the user's words** (each is built in the visual worktree; checkpoints 49 to 54).
  - **Rulings of 2026-11-14, in the user's words** (checkpoints 55 to 60, and work in flight).
    - Sizes: *"The farm houses/windmills look way too large compared to cities and monuments."* Barn, windmill, haystack and quarry are smaller.
    - Town floor: *"could you also make the city floor texture more city-like? lets have it similar to the mine, where it somewhat transitions into the surrounding tile as well"*; then *"it looks great!"*.
    - Blur: *"could we tone down the blur slightly, like 40%"*.
    - Animals: *"the horses seem a bit too simple now"*, and *"give the animals some movement so that's its in line with our other subtle movements"*.
    - Mountains: *"they look like they just lean more now ... We need some small ledges in the mountains"*, and the range *"needs a bit more diversity in terms of silhouette"*.
    - Clouds and pins: *"lets get rid of the cloud shadows, make it so that the resource icons show in front of foliage"*, and *"also remove the quieter resource pins"*. Switches 6 and 7 are off by default.
    - Borders: *"do a pass on the borders (they look weird when overlapping with hills) and i liked the glow on the border facing inwards towards owned territory"*. This reverses the ruling of 2026-11-12 that returned the old border: switch 3 is on again, in the draped style with its glow, and the line runs level over hills.
    - Great people's improvements: *"please make them more monumental and larger in stature, they should look and feel important"*. A modelling agent is building new models for the six.
    - Bots: *"you can proceed with all the bot changes"*: BP5 to BP8 go on without a stop for approval at each.
    - Colours: *"could we add more distinction in the desert tile colors, i still like the color grade. lets make the colors just a tad softer"*, then *"the orange color in the desert are a bit too strong, i think we could do with less contrast in the desert and grassland colors (split the difference for desert between the new and old color)"*. The colour grade stays, a little softer; `visualTest.paint.desert` and `.grassland` hold the stroke tones.
    - Clouds: *"the drifting cloud cover is raising the contrast too much, could we have the drifting cloud cover be smaller and move so that we can tell its a moving cloud?"*
    - Resource pins: the user agreed to a taller shield for strategic resources (then *"slightly wider and slightly shorter"*), marks set back from their rims, and *"please make sure to make the resource icons render in front of any foliage/map elements"*. The glyphs themselves are not yet redrawn.
    - Unit badges: *"they should have both leader colors"*; *"its not fuzzy and maybe more un-aliased, i can see individual pixels. also, some of the banner strokes are thick while others are thin"*. Found: rim and disc shared one draw order, so the disc's paper covered the rim on some pieces only. The rim is now drawn just before its disc, and a second ring carries the seat's trim.
    - Water: *"could we get rid of the soft white patches in the water, and do a similar painted texture on the water ... and we can handl the ocean/coast transition the same way we do transitions for other terrains"*; then *"have the scale of the textures be similar to the land, and get rid of our old coast/ocean boundary, using a darker pallette for the ocean tiles and a lighter one for coast"*. The user was not sure of this one and asked to see it. Also *"the rocks near the edge of the coast also could use a reflection"*.
    - Roads: *"let's have the base of the road ramp be much skinnier (the ones that go over hills), lets have the incline be almost 90 degrees on that ramp"* (`organicRoads.sideRun`).
    - Great works, second pass (after checkpoint 61): *"i prefer the old design for the landmark and citadel, could we use those original designs, but do a stylization pass/dress up those concepts?"* and *"The style and modelling for the new great work models are great, but could you make them greater complexity/epic. you can feel free to add more buildings for the academy/manufactory/customs house, the customs house feels boring and needs a conceptual makeover. their height should still be scale-wise similar to the other improvements, lets compensate for height by designing larger structures and not just scaling it to be larger"*. So: the landmark and the citadel go back to the concepts they had before checkpoint 61, dressed in the new style; the academy, manufactory and customs house become groups of buildings; the customs house gets a new concept; no work is taller than the scale of the other improvements allows, and size comes from a wider, richer structure.
    - Borders: *"please take a look and fix the borders in purple's land where an enclosed open tile renders poorly"*.
    - After checkpoint 63: *"yeah much better, could you add a ring of stones around the landmark so that its visually as big as the others?"*
    - Next subjects (2026-11-14): *"could you create a page for how you'd redesign the units? lets do a single melee piece for now, you can choose. Do an audit on the resource glyphs, which ones need to be changed? animal motion and mountains are good for now. Could you make it more obvious on the north and south that that's where the map ends, not sure how that should be conveyed visually"*. So: a proposal page for the units with one melee piece worked through (the orchestrator picks it); an audit of the resource glyphs, with no redraw until the user reads it; the animals' motion and the mountains are accepted for now; the north and south ends of the map get a visual mark, with the form for the orchestrator to propose and build in the test scene.
    - The unit piece, first look (2026-11-15): *"i like the direction of the new models a lot. I think they come off as amateur-ish or too cartoonish in terms of the art style, but they look impressive already."* and, with a reference picture (`images/14.png` of the session: a faceted hoplite in one clay colour on a round base, among plain turned pawns): *"you don't need to do exactly like this, but i think it reads better if it looks somewhat like a board game piece, and leans more elegant/simple instead of cartoony"*. So the swordsman is modelled again as a board game piece: taller and slimmer, a small head with no face, a long tunic that makes one solid form down to the base, large flat facets, few colours, and one or two large attributes (shield, sword, crest). The cartoon version stays in the build script so the two can be compared.
    - The unit piece, second look (2026-11-15), on the column piece of checkpoint 66: *"ok its not bad. another iteration, the angles should be sharper in its silhouette, make broad sweeping strokes in its form instead of faceted/detailed. Treat it like an avant garde piece of art, maybe art deco? I'm imagining something slightly more chess piece looking, with sharp angles and more exagerated form/pose."* So the next version has few long planes with sharp edges, not many small facets; a more stylised, chess-like form; and a stronger pose.
    - The unit piece, third look (2026-11-15), on the art deco piece of checkpoint 67, with a reference picture (`images/15.png` of the session: a smooth robed figure like a turned chess piece, in one colour, with a sword that stands beside it on a wide round base of two steps): *"its a little too angular, could you try another pass with sweeping curves folded into the design? like a chess piece almost. not exactly like this but something in this direction"*. So the next version is a turned form with curved lines: a round body with a long curved profile, a cloak with a curved hem, and no sharp spikes.
    - More references for the unit piece (2026-11-15, `images/16.png` to `18.png` of the session): *"some more references"*. Three soldier statues in one clay colour on a thick plain drum: a long robe or tunic, a cloak that falls down the back, a real helmet with a crest, a round shield with a boss, and an upright spear. They are figures, not abstract pieces, with soft low facets.
    - The unit piece, fourth look (2026-11-15), on the statue piece of checkpoint 68: *"please look at the proportions and figure weighting of my reference, imagine you're a master of gestural form, i want some visual intrigue and forms that feel a bit long and skinny than natural. do you see what i mean in the references?"* What the references share: figures 8 to 9 heads tall with a small head; the weight high, in the shoulders and cloak, with a taper to narrow feet; a thin upright weapon that rises above the helmet; one round mass on one side and one thin line on the other; a skinny figure on a broad drum.
    - The unit piece, fifth look (2026-11-15), on the long figure of checkpoint 69: *"the pose feels awkward and the silhouette unnatural. have it jst be upright"*. So the bend of the body goes and the figure stands straight. The sword held up beside the head, which looked as if it floated, becomes a long sword that stands on its point with the hand on the pommel.
    - The unit piece, sixth look and a change of direction (2026-11-15). On the upright long figure of checkpoint 70: *"ok the new model doesn't look very good. what do you think is achievable?"* The orchestrator answered that a figure like the references needs a sculpted mesh, and that abstract game pieces are what its method makes well. The user: *"lets do the abstract game pieces. it can look like a more elegant/inspired version of what we currently have (the chess pieces) that feel less stocky, what do you think? We should also find a slightly better design so that the unit type is more obvious from looking at it, more differentiation in the template so that it reads better? could you do 3 different variations with different weights/forms"*. So: three families of abstract pieces, each with a different weight and form, each shown for several unit classes so the user can judge how well the class reads. The figure pieces stay in the build script and are not developed further.
    - Two more references for the abstract pieces (2026-11-15). `images/19.png` of the session, a small plain figure with a tall sword on a tall drum that stands on a wide disc: *"maybe something like this, but with even simpler shapes?"* `images/20.png`, tall dark carved pieces, each one tapered block with slanted shoulders and a small block for a head: *"or maybe something like this as a template"*. The first becomes the "monument" family and the second the "monolith" family, beside the "turned" and "cut-out" families.
    - The abstract families are rejected (2026-11-15), on the four families of checkpoint 71: *"i'm sorry i dont like any of these. Could we just make small modifications to the existing pieces so that they're easier to read as units?"* So today's pieces stay. The work is small changes to them so that the class reads from the piece. The figure pieces and the four families stay in the worktree's build script, unused.
    - The bolder tools are accepted, with five more changes (2026-11-15), on the trial of checkpoint 72: *"that reads better! could we make the helmets read better as military units, and the little nose on the figures can be removed. the unit models should be the same size across the board, the tools shouldn't 'count' towards its height. Could we also increase the decoration on each piece as they become more advanced? It would also be nice if the secondary color elements were a little bit more prominent"*. So: (1) military pieces get helmets that read as helmets; (2) the nose goes; (3) every piece's body is the same size, and a tall tool does not make the piece smaller; (4) a piece of a later age carries more decoration; (5) the seat's second colour takes more of the piece.
    - The second round is accepted (2026-11-15), on checkpoint 73: *"yeah these are great, make sure the new helmets use the same player character and aren't grey in game. do a readability pass next on the remaining pieces in the same way."* Read as: the helmets take the player's colour, not grey steel ("character" read as "colour"). Then the same pass goes over the pieces not yet changed: mounted pieces, machines, ships, wagons, the settler, great people, elephants and the faith pieces. The same pass means: bolder tools, no nose, a height that does not count the tool, more decoration with a later age, and the seat's second colour on more of the piece.
    - The pass on the other pieces is accepted (2026-11-15), on checkpoint 75: *"these look great. Lets go and adjust the lance and staff heights so they fit the bounds of the piece a bit better, these adjustments dont need to be very large. The other points are largely fine i think. Could you come up with a few more alternate designs for the scout and the settler? Also, lets just have the helmets be the same color, they don't need to be darker."* So: lances and staffs get a little shorter so they rise less into the badge; the helmets take the seat's first colour as the body has it, not a darker tone; and the scout and the settler each get a few alternate designs for the user to choose from. The other weak points of checkpoint 75 stay as they are.
    - The pieces are final, and the visual work joins the game (2026-11-15), on checkpoint 76: *"lets go with the spyglass scout, with a slightly larger satchel. Settler lets just stay with A, could you make a better icon for it? I think we're ready to begin finalizing these changes, lets fold in the units and visual updates with the maingame, i'd like to playtest"*. So: the scout is design C (the spyglass) with a larger satchel; the settler stays as it is and gets a better badge icon; and the visual test worktree, with the unit pieces, is merged into `decks` and moved to the play server. It is one merge commit, so one revert takes it out.
    - Helmets after the first playtest (2026-11-16): *"ok after playtesting a bit, could we have the helmets be white again, with the primary color of the player as an accent color? Let's have each helmet have an accent color so every unit has a splash of color on the helmet."* So a helmet is ivory, as the caps were, and every helmet carries one bold part in the seat's first colour (the brow band). This replaces the helmet in the body's colour with a second-colour band.
    - The archers' helmet (2026-11-16): *"the hats look generally good, except the archer line looks like a regular hat instead of a helmet. Could we do something more similar to the melee line for their helmets? they don't need to look all that different."* So the wide brim goes. The bow line wears the melee dome, with a small round knob on top as its one difference.
    - The settler icon again (2026-11-16): *"the new settler icon is also a bit confusing, could you just have it be a large flag instead of what we have now, i think its too busy"*. So the house leaves the icon. It is one large flag on a pole.
    - Improvements by age (2026-11-16, from the playtest): *"another thing: i notice that the model for a city is different throughout the ages, we should have alternate art for some of the improvements too, the windmills feel out of place with the huts representing the city."* So an improvement's model follows the age of its owner, as a town's does. In the first age a farm has no windmill. Which improvements get steps, and how many, is for the orchestrator to propose with pictures; the windmill farm is the first case. **Built 2026-11-16, for the user to judge.** The table is `NORTH_STAR_WORK_AGES` in `src/terrainStudy/northStarAssets.js`, one entry for each of the four ages. Farm: a small store on legs, a drying rack and sheaves; then a low straw barn; then the tiled barn; then the barn or the windmill. Mine: a propped hole with baskets; then a shaft with a windlass; then today's pithead. Quarry: a low face with a block on rollers; then two poles that lift a block; then today's crane. Pasture: an open straw shed; from the third age a small tiled stable. Lumber camp: a log on trestles under a straw shed; from the third age today's saw shed. A plantation's store follows the farm's. The step is the age of the owner of the hex, and a work on a hex that nobody owns takes the first step. `visualTest.works.byAge: false` in `data/view3d.json` gives back the one look of before. Open for the user: a work changes with its owner's age (as a town does), it does not keep the look of the age it was built in.
    - Improvements by age, the user's review (2026-11-16), on the worktree build `f7984b6c` (page https://claude.ai/artifact/ByMedrQkHYxtXxYTpamv2K): *"age 3 and age 4 can just have the same assets, lets go back to having a mix of houses and windmills for the farms for variety. Could we axe the tile yield-based structures, i think they feel out of place. Let's express this gameplay idea exclusively with particles. Could you experiment with a few particle/rendering systems for this? I'm imagining a combination of lighting and particles, you can use games like genshin impact for inspiration for particle system design. The town center building feels out of place in age 1/2, lets have towns contain just huts in age 1, small buildings in age 2, but could we have slightly more intricate buildings for age 3/4? Also double check that the smoke stack is coming out of a central building in game, i think the test map doesn't line up exactly with real in-game assets"*. So: (1) ages 3 and 4 share their models, and their farms are a mix of barns and windmills, as before; (2) the structures that mark a rich hex (the sheaves, log piles and stalls of `paintedRichness.ts`) go, and a hex's yield is shown only by particles and light, with a few systems built for the user to compare; (3) a town has no hall in ages 1 and 2: huts only in age 1, small buildings in age 2, and more intricate buildings in ages 3 and 4; (4) check in a real game, not the test scene, that a town's smoke rises from a central building.
    - Towns approved, and the yield light's form (2026-11-16), on the worktree build `d3ee033a`: *"i think a combination of A and B would be cool. Let's make B much more subtle (get rid of some of the hard edges) and make A more matte (like before) than the shiny motes currently. Let's say: tier 1 - small motes, few motes tier 2 - small/med motes, some ground light tier 3 - med/large motes, full ground light. Could you visualize what that would look like on some of the improvements and great people works? The aging towns look great, lets move forward with that, defer the monuments and sphere for later."* So: (1) the towns by age are approved and join `decks`, with the works by age; the armillary sphere and the wonder monuments in early ages are deferred; (2) the yield light is one system, motes with ground light, by the hex's step: step 1 is a few small motes and no ground light, step 2 small to medium motes and some ground light, step 3 medium to large motes and the full ground light; the motes are matte, not shiny, and the ground light is much softer than system B, with no hard edge; (3) pictures of it on improvements and on great people's works come before it is final.
    - The yield light's rule (2026-11-16): *"what are the cutoffs for motes right now? We should add motes based on total yields on a tile, and the mote colors should depend on which yields are represented, proportionally. culture/science on tiles should count as 1.5x and gold yields on tiles should count at 0.75x. a tile should have at least 4 combined yields to get motes, 7 for medium, and 10+ for the highest tier"*. This replaces the per-yield steps of the first build (food 3/4/5; production and gold 2/3/4; science, culture and faith 1/2/3; the two strongest yields shown). The rule now: a hex's score is the sum of its yields, with culture and science counted 1.5 times, gold 0.75 times, and food, production and faith once. A score of 4 or more gives step 1, 7 or more step 2, 10 or more step 3. Below 4 the hex shows nothing. The motes' colours are those of the hex's yields, in proportion to each yield's part of the score.
    - The yield light is accepted as built (2026-11-16), on system D (`61055e84`). The orchestrator reported that by land and improvement alone almost every work is at step 1, which is hard to see at play zoom, and offered a stronger step 1 or lower thresholds. The user: *"it's fine, keep it as built. There are plenty of bonuses in game that will push these over the edge."* So the thresholds (4, 7, 10) and step 1's three small motes stay.
    - The map's end rails (2026-11-16, from the playtest): *"the map boundaries are too flat, the concept is promising (wooden borders) but could we add texture and some detail/nuance to sell the look and have it feel less amateur-ish? The shading/rendering also feels very flat"*. So the wooden rail at the north and south ends stays as the idea. It gets a shaped profile, wood texture, small details and better shading (`src/render3d/mapEnds.ts`, `visualTest.mapEnds`).
    - The moulded rails, the user's review (2026-11-16), on the merge `2f62fece`: *"these look great, the southern edge looks perfect, my only gripe is that the northern edge feels strange due to the weird perspective. It should really look like it's a table/board being viewed from the same angle as the camera. Maybe it can be slightly raised from the terrain to give it dimensionality."* So the south rail is approved. The north rail must read as the far edge of a board seen from the camera's angle: the player should see its top and its near face in the right order and proportion, and it may stand a little above the ground.
    - The north rail is accepted (2026-11-16), on the merge `247d4166`: *"its looking a lot better, lets go with A. the weak points are fine lets keep it as is."* So the wall follows the hex points (`north.wall: "cut"`), and the rail stays as built: the cool shade tone on the wall, the drawn shade and the miniature blur are accepted.
    - The south rail gets the same raise (2026-11-16). The orchestrator reported that only the north is raised, and recommended leaving the south low because a raised south rail covers part of the bottom row. The user: *"for the sake of completion, lets apply the same transformation to the south end. It shoudl partly cover the bottom row form being raised. lets make sure the two sides are symmetrical"*. So both ends use the same raised profile, mirrored. That the south rail then covers part of the bottom row is accepted.
    - The south rail's thickness (2026-11-16): *"the south rail should have some thickness, could we add in an additional shaded section that shows the thickness of the entire south rail, to give the board a feeling of dimensionality?"* So below the south rail the player sees a further shaded face: the side of the board itself, as the edge of a thick table or tray, under the rail's own outer face. The orchestrator first told the agent not to cover more of the map. The user: *"the map can be covered, that's fine."* So the form may cover more of the bottom row if that gives the board more depth.
    - The rails are accepted (2026-11-16), on the merge `f53d2a76`: *"yeah these look great, as built is fine. Could we make the under rail face slightly darker than the rail itself?"* So the depth of 0.8, the dark band at the south and the hidden border line on the bottom row stay. One change: the board's side under the rail is a little darker (`side.color` `#5f4532` to `#4a3324`).
    - The shore's bands (2026-11-16, from the playtest): *"could we make the light blue even more shallow? It looks kind of awkward for lakes. the light border on the light shaded coastal region also don't have to be super thick, or we could remove the middle lines to reduce the heaviness of that section. Let's make the white section near the coast thicker, the off-coast outline less thick, get rid of the middle lines, and make the light blue section entirely thinner overall, does that make sense?"* So, in `visualTest.sea.bands`: the white foam at the shore is wider; the pale line at the outer edge of the shallows is thinner and fainter; the second faint line inside the shallows (the last wave's trail) goes; and the light blue shallows are a narrower band.
    - The shore's bands, second note (2026-11-16): *"lets make the thick white coast lines unbroken, but vary in depth (they should represent the white foam from the waves), could we add some slight motion to the light blue section that we made thinner. It's looking a lot better already"*. So the foam line has no gaps and its width varies along the shore, like foam left by waves; and the shallows' outer edge moves a little.
    - The mountains' foot rocks (2026-11-16, from the playtest): *"the mountain model, some of the models have rocks at the base that feel too evenly distributed, pointed outward radially that feel unnatural. Lets make the rocks near the base more asymmetrical and more natural looking."* So the rocks at a mountain's foot are placed unevenly, in clusters with gaps, with varied size and turn, and they do not all point away from the peak.
    - Mountains: *"could use some more dramatic forms"*, they *"look a bit bare"*, and *"more dramatic in shape like the reference ... This isn't hugely important but could add a lot"*. Three passes by the modelling agent; `NORTH_STAR_CRAGS` returns the old models.
  - **Farms and the mine, 2026-11-12** (the user: *"could you add an alternate farm tile with a spinning windmill? And could you vary the colors on farms so that some are predomenantly green while some are yellow/orange/red"*, and of the new mine: *"it sticks up like a mound. I like the old depiction better, but you're welcome to stylize it differently"*). Some farms have a windmill with turning sails in place of the barn (`visualTest.works.windmillShare`). A farm takes one colour set, so one is mostly green and another gold, orange or red (`works.fieldSets`). The mine is drawn the old way (`works.newMine: false`).

**(mmmmmmm) Great people: cheaper to earn, odds on the Renown tab, and legacy changes: RULED 2026-11-12; batch GP1 queued.**
The user, 2026-11-11: *"i think we need to slightly nerf some of the great people, and also make them slightly easier to earn. The renown tab should show the current percentage odds somewhere of what great people are going to be available to draft. let's make great people generally 25% faster to earn (with the same starting cost) and then start an artifact with some proposed changes (they should feel roughly similar in power for their situational use case, generally powerful great people should be nerfed)."* The proposal page is https://claude.ai/artifact/4HePmSDpo2ahSPhV4uM8qY. On 2026-11-12 the user commented on it and wrote *"ok i made comments on the great people doc, please schedule those changes for subagents"*. Reading taken: a row with no comment is approved as proposed.
- **Renown prices.** The user's comment replaces the 25% ruling: *"on second thought, lets increase by 80% total, instead of 4 great people at 2000 renown lets make it 7"*. So `rules.renown.linear` goes from 180 to **58**; `base` 75 and `exponent` 2.65 stay. The first eight prices become 75, 134, 197, 267, 346, 436, 538, 654 (they are 75, 256, 441, 633, 834, 1046, 1270, 1508). Seven people cost 1,993 renown in all.
- **The Renown tab.** It shows, for the next offer, the chance in percent that a name comes from each family, from the draw's own weights, and which age's names are in the bag (the user: *"this is great"*). The renown breakdown is collapsed to one line for each city (*"we can collapse the full renown breakdown per city (i.e. tenochtitlan: +13)"*). Reading taken: a city's line can be opened to show its sources, and sources that belong to no city (Triumphs, cards, luxuries) keep their own lines.
- **Legacy changes** (the "now" text is in `docs/great-people.md`):

| Person | Legacy becomes | Source |
|---|---|---|
| Aristotle | your buildings that supply science pay +25% | proposal |
| Hemiunu | +25% production toward wonders; the drawback stays | proposal |
| Zhang Heng | +1 gold for each of your buildings that supplies science | the user: *"let's revise: +1 gold on every building that supplies science"* |
| Eratosthenes | no change (+1 science per 80 hexes revealed) | the user: *"this is too strong, keep at 80"* |
| Zhang Qian | no change (+2 gold per 80 hexes revealed) | the user: *"keep at 80"* |
| Crassus | all units and buildings cost 20% less to buy; the drawback stays | proposal |
| Spartacus | +5 combat strength against an empire with more cities than you | proposal |
| Roger Bacon | completing a technology grants +15% food and +15% production in every city for 3 turns | proposal |
| Maimonides | +1 happiness per 2 buildings in your cities that supply science | proposal |
| Āryabhaṭa | +1 faith in every city per building there that supplies science | proposal |
| Murasaki Shikibu | +4 culture per melee unit in the field | proposal |
| al-Jazarī | your buildings that supply production pay +40%, counted after every other bonus | proposal |
| Mimar Sinan | +2 production, +2 culture in every city with a Temple (the two build bonuses go) | proposal |
| Subutai | mounted units: +1 movement and +2 combat strength (a flat figure, no percentage) | the user: *"+2 combat strenght instead of percentage"* |
| Tomoe Gozen | +3 combat strength for mounted units and +3 for ranged units (flat, no percentage) | the user: *"revise: +3 combat strength for both (instead of a percentage)"* |
| El Cid | +6 combat strength in a city you captured | proposal |
| Paracelsus | +15% science in every city; the drawback stays | proposal |
| Copernicus | +4 science in every city | proposal |
| Leonardo | +20% production toward wonders; a great person's act pays +50% | proposal |
| Taqī al-Dīn | +20% science in your capital (the mountain line goes) | proposal |
| Vaucanson | newly created workers gain +2 charges | proposal |
| Jakob Fugger | +20% gold in every city; the authority drawback stays; all units and buildings cost 10% less to buy | proposal |
| Willem Beukelszoon | the works on every Fishing Boat hex pay +100% (the ground doubling goes) | proposal |
| Gracia Mendes Nasi | +3 authority capacity; +1 happiness and +5 gold per spare authority | proposal |
| Lautaro | +5 combat strength against mounted units | proposal |
| Sin-lēqi-unninni | +50% production toward Amphitheaters | proposal |

- Acts and works do not change. If a row needs an effect shape the game does not have, the agent holds that row back and reports it.

**(lllllll) The worker's menu and the improvement preview: RULED 2026-11-11; batch W1 built.**
The user: *"workers action menu should not show improvements that haven't been unlocked (i.e. charter improvements). also, please have the tooltip show the proper yields, i think the preview yields for an improvement dont factor religious beliefs or orders"*. And on the tech hover card's "may" headings above abilities (for example "Workers and settlers may"), to the recommendation to remove them: *"yeah i agree"*.
- **The worker's menu** lists an improvement only if the empire has unlocked it. An improvement whose technology the empire does not know is not listed at all, whether that technology is a charter technology (Qanat, Physic Garden) or an ordinary one. Reading taken: this covers every locked improvement, not only charter ones. An improvement that is unlocked but cannot be built on this hex prints as it does today.
- **The improvement preview** (the tooltip on a menu row) shows the yields the hex will really have for this empire once the improvement stands: beliefs, Orders, technologies' renewals and every other source the hex's own breakdown counts. The figure comes from the sim's own fold (`explainTileYield` with the owner's context, rule 5), never from a second sum in the UI.
- **The tech hover card** drops the "… may" headings above abilities. The ability lines name their own subject since batch TT3.

**(kkkkkkk) Shorter lines on the tech tree: RULED 2026-11-11; batch TT3 built.**
The user: *"lets do a readability pass on the tech tree. i.e. 'workers +1 charge' instead of 'newly created workers gain 1 charge'. the rite unlock should also be shorter and more readable. the change to improvement upgrades is great, lets have the whole tech tree read the same way"*.
- **The model** is the improvement line that batch TT1 made: the thing first, then the figure ("Farm +1 food on fresh water"). Every line a technology prints for a rule, an ability or a line trait reads that way: subject first, figure second, no "gain", "may", "now" or "newly created", no full stop.
- **Where:** the node's face, the hover card, and the Compendium's technology page. All three print the same words.
- **The lines** (the assistant's wording; the user, 2026-11-11: *"ok these are great"*, with two changes marked in the table):

| Technology | Now | Becomes |
|---|---|---|
| The Wheel, State Workforce | newly created workers gain +1 charge | Workers +1 charge |
| Code of Laws | +3 authority capacity | Authority capacity +3 |
| The Golden Roads, Printing | +1 trade route | Trade routes +1 |
| Daughter Cities | new cities are founded with a Town Charter | New cities start with a Town Charter |
| Herbals | +2 happiness per hex with a Physic Garden in your borders | Physic Garden +2 happiness |
| Surveying | (prints only its own name) | Aqueduct, as an ordinary building unlock with its price, and no rule line (the user, 2026-11-11: *"surveying should just read aqueduct as the unlock"*). The Qanat stays as its improvement unlock |
| Blessing of Arms | A town may keep this rite: +10 defence. | Rite: town +10 defence |
| Consecration of the Bounds | A town may keep this rite: luxury hexes gain +1 culture, and the town's borders grow 30% faster. | Rite: luxury hexes +1 culture, borders grow 30% faster |
| Rite of the Harvest | A town may keep this rite: hexes that give food give +1 more. | Rite: food hexes +1 food |
| Omen Reading | A town may keep this rite: +1 science for each building in the town. | Rite: +1 science per building |
| Rite of Plenty | A town may keep this rite: hexes with a resource give +1 gold. | Rite: resource hexes +1 gold |
| Embark | Cross coastal water and lakes. | Civilians and scouts cross coast and lakes (scouts embark too) |
| Sea Legs | Soldiers may cross coastal water and lakes. | Soldiers cross coast and lakes |
| Open Ocean | Ships and embarked units may cross deep ocean. | Ships and embarked units cross deep ocean |
| Siege | Surrounded enemy cities cannot heal and lose health each turn. | Siege (the keyword alone, a link to its Compendium entry, which holds the rule). The user, 2026-11-11: *"just have it be a keyword 'siege' that's unlocked, that links to a compendium entry"* |
| Ancestor Rites | Renown now earns great-person offers. | Renown earns great people |
| The Long Count | You may spend faith to redraw an Order draft. | Spend faith to redraw an Order draft |
| Open Borders | Open-borders treaties; both empires must know Writing. | Open-borders treaties (the user, 2026-11-11: *"Open borders can just read 'open-borders treaties'"*) |

- **Readings taken:**
  - "Workers +1 charge" still means only workers trained after the technology. The short line follows the user's own example.
  - If Embark does not mean civilians only, the agent keeps the true subject and reports it.
  - A rule sentence that an Order also prints (the worker charge, the trade route) changes on the Order too only if the same describer words build both and the Order then reads well; otherwise the technology gets its own short words. The agent reports which.
  - Line traits (Hoplite, Onager and the others) follow the same form if their lines do not already.
  - The two rites that cards teach (Votive Offering, Restoring of the Host) are not on the tree and do not change.

**(jjjjjjj) Rulings of 2026-11-11 on the held cards, the tier-26 rule, two technologies, rites and beliefs: RULED; batches DS9, R1, TT2, RT1 and B1 are queued.**
The user answered a numbered list of open items. Each ruling below quotes the answer.
- **Batch R1, cards and the moments they need:**
  - The Terraces of Moray: *"add the rule"*. A levy becomes a moment that cards can read, carrying the production it paid. The card reads "A levy also grants science equal to half its production." A levy that pays no production (one that raises a unit or a settler) grants no science.
  - Letters of Credit: *"card also lifts the 25% loss"*. With the card seated, a treasury between 0 and −150 costs no science or culture, as well as disbanding no units. Its text is "Your treasury may fall to −150 with no penalty."
  - The Strongbox: *"add the new moment"*. One moment fires for each purchase made with gold, of any kind. The card reads "Gains +1 science and +1 culture each time you buy something with gold, up to +15."
  - The Votive Lamp: *"drop it"*. It is not added.
  - The Pilgrim Staff: *"add that moment"*. One moment fires each time faith is spent, carrying the amount. The card (Devotion, Tier I, Civic) reads "Spending faith grants culture equal to a fourth of it."
  - The Apprentices: *"wonders should not count"*. Finishing a wonder or the Magnum Opus grants nothing.
  - The Scholars' Roads: *"don't lose trade routes, just plain 'your routes gain +50% science and culture'"*.
  - Market Gardens: *"move it (roads aren't available that early in the game). new shared card: +1 gold on luxury resources"*. Market Gardens moves to Tier II. A new shared card for Expansionist and Commerce at Tier 0, Economic, common, reads "Luxury resources gain +1 gold." Its name is a placeholder: The Country Fair.
  - The tier-26 governments: *"add all three"*. The 30% rise also covers happiness, authority and renown that a seated card of the type gives.
  - A banned route that ends when its far town changes hands: *"accepted"*.
- **Batch TT2, technologies:**
  - Divine Right: *"remove it and link castellany"*. The technology leaves the tree, its bonus goes with it, and Castellany takes Divine Right's parent (Guildhalls) as its parent.
  - The Civil Service: *"yup, go with the suggestion"*. The Courthouse moves from Iron Working to The Civil Service. The holding bonus (great-person works +1 food and +1 production) is then cut, as item (iiiiiii) first ruled.
  - The second worker charge: *"move it to the wheel"*. It moves from Bronze Panoply to The Wheel.
- **Batch RT1, rites:** *"lets instead have a blocking 'renew rites' message in the 'end turn' button that opens the rites menu when clicked; happens when a rite expires. disappears after closing the faith menu (player doesn't have to renew)."* No rite renews by itself.
- **Batch B1, beliefs:** *"belief page is ready"*. The spec of record is `docs/plans/belief-update-2026-11-10.md`. The Dar-e Mehr takes the proposed +25% faith (*"your change"*).
- **Batch DS9** is unchanged from item (hhhhhhh): the Chiefdom's three chairs become Wildcard chairs (a reading the user saw and did not change), a charter technology costs the ordinary price, and The Second Reading is dealt in Tier 0 and Tier I.
- **CLAUDE.md:** *"update claude.md, no need to keep a log of the change, just update it."* Done for the road step sentence.
- **The play server:** *"please move changes as they come in ot the playtest server"*. After each committed batch, the play clone (`~/code/webciv-play`, port 5199) moves to the new head.
- **Still open:** early game pacing (item iiiiiii).

**(iiiiiii) Less authority and happiness from the tech tree, and fewer passive bonuses on technologies: RULED 2026-11-10; batch TT1 is queued. Early pacing is OPEN.**
The user: *"there's too much authority and happiness in the game as it stands. I also think there are too many 'random' bonuses that aren't impactful in the tech tree ... unlocking something feels obvious, but the passive bonuses are so easy to miss ... i think we can cut most of them (make sure to keep irrigation, thats a big one)."* After the review page (https://claude.ai/artifact/RsNxBxQTx3kgdQfZNECNDd) and nine comments: *"no determinations yet on the early game pacing, but everything else is approved"*.
- **Authority, ruled:**
  - A coastal town costs 3, the same as any founded town. The user: *"this is confusing and not visible to the player"*. The coastal rule leaves the data and the code, with any card rule that only changed it.
  - The Civil Service no longer gives +5 authority.
  - The Assize Court, The Examination Court and The Post Station no longer give +1 authority. Each keeps its other effects.
  - Gracia Mendes Nasi gives +5 authority, not +8.
  - **Kept, by the user's comments:** the Monument's +1 (*"the only early game source of authority"*), the Courthouse's +2 in a captured town, and every wonder's authority (*"i'm not worried about wonders"*). Also kept: the Palace, the +2 for each age, the Imperial Throne, the Assembly Hall, Code of Laws' +3, Tyranny's +5 and the Mosque's +1.
- **Happiness, ruled:**
  - Satrapies no longer gives +1 happiness in each joined town.
  - The Civil Service no longer makes the rewards arrive 5 points sooner.
  - The Silk Road no longer lends a luxury for each foreign route.
  - The Public Bath gives +1 in each joined town, not +2.
  - **Kept:** the rewards for spare happiness, both steps. The user: *"rewarding excess happiness is important"*.
  - **Kept:** each different luxury gives 4 happiness. The user: *"keep luxuries at 4, that's important for early pacing"*.
- **Orders:** no Order is cut or changed by this item. The user: *"lets not cut from the orders for now. i'm concerned with only the tech tree"*. This also keeps the generic card Local Clerks.
- **Passive bonuses on technologies, ruled.** Cut:
  - Siegecraft: +1 town defence for every 4 citizens.
  - Epic Poetry: culture when a unit falls.
  - Chronology: the renown every 15 turns; seeing the next age a turn early; +1 culture on plantations.
  - State Workforce: the 25% discount on buying workers.
  - The Saddle: science and culture for pillaging.
  - Daughter Cities: the settler discount; +1 food and +1 production on domestic routes.
  - Satrapies: +1 gold for each joined town (and the happiness above).
  - The Civil Service: +1 food and +1 production on great-person works (and the two lines above).
  - Guildhalls: wonders 10% faster; +2 culture for each wonder.
  - Horology: the science every 10 turns.
  - The Silk Road: +3 gold on foreign routes (and the luxury loan above).
  - Geomancy: the extra +1 production and +1 faith on a mine with a resource.
  - The Golden Roads: +1 gold for each luxury at a route's ends.
  - Machinery: the cheaper road step.
  - Castellany: +10 strength when defending against ranged units.
  - Steel: +1 movement for melee units.
- **Kept:** Irrigation (farms beside fresh water +1 food), Currency (plantations +1 gold), The Saddle (pastures +1 production), Geomancy (mines +1 production), Code of Laws (+3 authority), State Workforce (workers +1 charge), The Golden Roads (+1 trade route), Daughter Cities (a founded town starts with a Town Charter), Iron Working (warriors become swordsmen when the seat gains iron).
- **Moved:** Movable Type's +10% science and production leaves the technology and goes onto the Printing House, for the town that holds it.
- **New:** a second "workers gain +1 charge" in Age 2. The user: *"let's add an additional 'workers gain +1 charge' somewhere in age 2"*. Reading: it goes on Bronze Panoply, which unlocks the Smithy and has no passive bonus today.
- **Kept bonuses are printed as the technology's headline**, in the place an unlock is printed.
- **Readings taken without a ruling (the user may change them):**
  - Divine Right keeps its one bonus (a captured town costs 1 less authority) for now. The technology unlocks nothing else, so it needs a new unlock or leaves the tree, and the user has not said which.
  - The Quiet Hours belief is not touched here. The belief pass is a separate proposal.
  - The Civil Service keeps one bonus for now: great-person works gain +1 food and +1 production. The user cut its authority and its happiness line by name. Its only unlock, the Examination Hall, was retired earlier, so with all three bonuses cut the technology gives nothing, and the tree's rule that every technology gives something fails. Like Divine Right, it needs a new unlock or leaves the tree, and the user has not said which. The line "The Civil Service: +1 food and +1 production on great-person works" in the Cut list above waits for that ruling.
- **Open:** early game pacing (section 4 of the page). The user has ideas of their own and has made no determination.

**(hhhhhhh) Simpler Orders and twelve reworked governments: RULED 2026-11-10; batches DS1 to DS9 and G1 in flight.**
The user: *"the cards require too much reading at the moment, and some of the tier 0 cards feel a bit too fancy for me currently."* After the review page, 24 comments and the governments table: *"Please ensure that an opus agent is runnign to implement work that's been finalized (the deck simplification and governments rework)"*.
- **The spec of record** is `docs/plans/deck-simplification-2026-11-10.md`: the rules of the pass, the four keywords (Commission, Charter, Scaler, Boon), the governments table, and one table per deck of every cut, move, reword, simplify, change and new row.
- **Readings taken without a ruling (the user may change them):**
  - the Chiefdom's three chairs become Wildcard chairs. RULED 2026-11-11: the user saw that this went against the 2026-10-16 ruling (one Military, one Economic, one Wildcard) and kept the three Wildcard chairs (*"ok, this is fine"*);
  - the War Chief's kill reward is a flat 10 science and 10 culture;
  - The Curia keeps its name;
  - "change to +5" on The General Staff is +5 production, with the +2 renown kept;
  - a charter technology costs the ordinary price.
- **Not in this item:** the Doctrines do not change. The belief pass is a separate proposal (https://claude.ai/artifact/E57VMp4NWRhJrEYDi9C57V) and is not ruled.

**(ggggggg) Fewer trade route rules: RULED 2026-11-10. Batch TR1 is built (commit 7541245f); batch TR2 is queued.**
The user: *"We need to drastically cut down on our rules for trade routes. Each market/lighthouse should only give 1 trade route. The caravanserai can give 3 trade route capacity."* Then, on the open points: *"lighthouse gains 1 trade route, none from the harbor. other four buildings give 1 and remove the growth by citizens in all buildings entirely. let's remove the 20 turn term; routes can only be cancelled after they've completed one trip to the destination city. the pay formula is intended to increase throughout the game, it's good for now. sea premium is good, because the sea player has worse tiles from being next to coast. Let's have the hire price start lower (75 gold) but increase the more active trade routes you have (15 gold per)."*
- **Built, batch TR1:**
  - A Market gives 1 trade route, a Lighthouse gives 1 and the Caravanserai gives 3.
  - The Harbour gives none. The Colossus, the Tambo, the Longjiang Dockyard and the Funduq give 1 each.
  - No building's route capacity grows with its town. The field `routeSlotsPerPopulation` is gone.
- **Ruled, batch TR2:**
  - **A route has no term.** It runs until its owner cancels it, or until something else ends it as today (a war between the two ends, a plunder, a lost town). `rules.trade.routeTurns` goes, and so do renewal, auto-resend and every prompt or bot rule that exists only because a route lapses.
  - **A route may be cancelled only after its caravan has reached the destination town once.** Before that, the cancel is refused with a plain sentence.
  - **The hire price is 75 gold, plus 15 gold for each trade route the seat has running.** These are two knobs in `rules.trade`. The price no longer follows the Trader row's production cost or the age. A card that changes the hire price (The Turnpike Trusts) applies after.
- **Stays as it is (the user's words above):** the pay formula, and the sea premium of 50%.
- **Not ruled, so not changed:** the host's gold line on a foreign route, and road maintenance on roads a seat's traders laid.
- **Readings taken without a ruling, for batch TR2 (the user may change them):**
  - A cancelled route leaves its cart standing idle, as a lapsed route did, and a Send still uses an idle cart before it hires a new one.
  - An idle cart does not count as a running route for the price.
  - The Sea Ban and The Inward Roads let a route that is already abroad run on when they are adopted. With no term this would last for ever, so adopting either one now ends the seat's routes abroad at once and leaves the carts idle.
- **Known after TR1:** the slow test `aiBot.slow.test.ts` ("opens both banks rather than hoarding them") fails for one seat, which now holds more gold than the test allows. The two bot digests moved, as expected. Both wait for TR2, which changes what a bot spends on routes.

**(fffffff) Each deck is a way to play, not a yield: RULED 2026-10-20; every deck BUILT on `decks` by 2026-10-26, on `main` since 2026-11-01.**
The user, after reading the six builds passes: *"each deck feels a bit one note, and needs diverse bonuses that aren't so squarely on theme with their central purpose/yield."*
- **The rulings** are in `docs/decks/deck-design.md`, "Direction, 2026-10-20":
  - the user's picture of each deck, verbatim;
  - a few themes per deck, with varied bonuses inside each theme;
  - the table of what each deck is paid for, when it is strongest and what it gives up;
  - wonders leave Expansionist, and Magisterial owns the government system;
  - Scientific also plays around empire buildings, split with Expansionist;
  - Expansionist does not necessarily draft slower;
  - victory conditions wait until the decks are fun to play;
  - the Scientific sketch, and the user's call to be bold and use the mechanics the game has.
- **What it changes:** the builds passes of 2026-10-17 for Commerce, Devotion, Scientific and Magisterial (`docs/plans/*-builds.md`) are redone with this direction before any of their cards are built, Scientific first. The card-design skill now designs a deck from a few themes with four roles, in place of one loop per build.
- **Open:** that file's "Open questions", item 3.
- **The Scientific pass** (`docs/plans/scientific-themes.md`, its sections 10 and 11): the user's rulings of 2026-10-20 are Tier 0 away from Civic, town size may stay, all 68 cards stay for the user to cut, and yes to features A and B. Then, on the pass's other questions 1, 2 and 5 to 9 (the themes and engine as written, fifteen charters that each open a technology, the fifth-age rows, the four rule-breakers, leaving civic life, the Schoolmen's Charter shared with Devotion, and the 21 cuts with the ten old live rows retired): *"yup, yes to all."*
- **The charter UX prototype** (2026-10-21, the user's comments on it): the charter shelf shows drafted charter technologies only, and appears only after the first charter is drafted; military charters no longer open units early, but give a better version of a unit (+7 strength, or a special ability) at the same production cost. Verbatim in `docs/plans/scientific-themes.md` section 12. Still open there: whether a charter technology counts toward an empire's age.
- **The better versions** (2026-10-21): a small strength bonus (+1 at Tier 0, +2 at Tier II) plus an interesting ability for every version, and the ability stays with the unit's line when it upgrades. Verbatim in section 13 of the pass.
- **The review page comments** (2026-10-21, 18 rows), then *"let's implement."* Cut: the Hermetic and Experimenters' charters, The Palace Archive, The Fellowships. Three charters open a new building in place of early access (the Glassmakers', Librarians' and Printers'). The Assay is shared with Expansionist and The Companions with Dominion. New text for The Royal Estates, The Great Designs, The Edge of the Sword, The Companions and The Strategikon. Verbatim, with the readings to confirm and the three proposed buildings, in section 14 of the pass.
- **The build plan's questions** (2026-10-21): a charter technology does not count toward an empire's age; new figures for the Specularium and the Mouseion; The Soldier-Scholars' +5 in attack and defence; type the cards early; type the shared cards too; the placeholder placement and the readings stand. Verbatim in section 15 of the pass. The build is under way (`docs/plans/scientific-build-triage.md`).
- **The Dominion pass** (`docs/plans/dominion-themes.md`, 2026-10-21): the user commented on 11 rows, then *"lets begin working on it."* Seven commissions now leave an institution, two Tier 0 commissions swap goals, and The Bards' Praise, The Gathering Host and The Soldier-Farmers change. Verbatim, with readings to confirm, in section 11 of that pass.
- **The Dominion build plan** (`docs/plans/dominion-themes-triage.md`, D9 to D16): the user took every recommendation (*"recommendations seem fine"*): build the three drafts in D14, The Limitanei with ships counting, a read-only list of institutions under the council, The Res Gestae at +4% up to +28%, Rally to the Standard for military units only, and the readings as written. D9 is under way in the worktree `~/code/webciv-dom`.
- **The Expansionist pass** (`docs/plans/expansionist-themes.md`, 2026-10-21): the user commented on 10 rows, then *"fold those into the expansionist doc, queue up the changes."* Three more cuts (The Beating of the Bounds, The Garden Frontier, The Builders' Levy), and new text for Plenty, The Burning Season, The Land Hunger, The Mountain Schools, The Mother City, The Measure of the Land and Veteran Colonies. Verbatim, with readings, in section 11 of that pass. Its two questions answered: *"let's cut common domain. cut one of veteran colonies and home for harvest."* The Common Domain is cut; Home for the Harvest is cut and Veteran Colonies stays (the orchestrator's choice: it is built and covers any military unit).
- **The Commerce pass's answers** (2026-10-23, section 13 of `docs/plans/commerce-themes.md`): yes to sections 10 and 12, except that Safe Conduct is cut, The Commenda counts a lent luxury as half a copy, and Commerce's commissions are a mix of institutions and one-time rewards. Five review-page comments: Market Day pays the capital +1 gold per citizen, The Emporia pays on improved luxury hexes, The Agora becomes +3 gold in each city with a Granary, Private Patronage pays +40% gold, and Bought Swords is removed. Next: the Commerce triage.
- **The Commerce build plan** (`docs/plans/commerce-themes-triage.md`, T1 to T9): the user took every recommendation (*"approved, lets begin implementation. for 1-7, go with the recommendations."*): two institutions (The Great Fair, Corner the Market), The Grain Banks, The Standing Army shared with Commerce, The Art Dealers built now, The Casa da Índia on flat yields only, The Commenda's half copy, and readings 1 to 42.
- **The Expansionist Doctrines** (2026-10-23, the user's 22 comments on the review page, folded into `docs/plans/expansionist-builds.md` and the sheet): 8 cut, 14 revised (most lose their drawback), 24 remain. Eight readings and two questions (The Builder Kings and the wonder split; The Cathedral Lodges' wonder clause) are at the end of that section.
- **The Expansionist build plan's answers** (2026-10-23): keep both of Veteran Colonies' loops, and teach the bots to levy in a bot-track batch. The readings are approved, except reading 25: every unit that retires gives a citizen, a unit raised for free included (*"the player shouldn't have to keep track of which ones were free"*).
- **The review comments on built cards** (2026-10-23 and 2026-10-25, batch R1, `docs/plans/review-revisions-2026-10-25.md`): Dominion's The King's Levy (gains a melee unit when drafted; Tier I), The Standing Army (Tier I), The Drill Grounds (every 3 turns) and The Campaign Annals (+3 science a rank); The Cattle Raid, The Defiant Kingdom and Copying the Enemy retired; Scientific's The Almanac (a cost bug, then +2 production) and The Secret Arts (counts charter technologies); The Art Dealers (+3 gold for each seated card); Devotion's The Fast (science and culture) and The Rites Commonwealth (no drawback).
- **The Devotion and Magisterial passes' answers** (2026-10-25, section 12 of each themes doc): *"please fold those in and begin implementing devotion and magisterial"*. The build takes every recommendation of section 10 and section 11 as a reading. Magisterial: The Prytaneion pays for each seated card, The Markstones and Gifts at Court are cut, and a Tier 0 commission to complete a wonder is added. Built by `docs/plans/devotion-themes-triage.md` (DV1 to DV9) and `docs/plans/magisterial-themes-triage.md` (MG1 to MG17). Their Doctrines are proposed in `docs/plans/devotion-doctrines.md` and `docs/plans/magisterial-doctrines.md`.
- **The Scientific Doctrines** (2026-10-23, three comments, `docs/plans/scientific-doctrines.md`): The Pythagorean Brotherhood's surcharge is 10%, The Workshops of Syracuse gives +5 strength, and The Peripatetic School is rewritten (Academies +2 science and +2 production; +30% renown from science buildings and wonders).
- **Where it stands (2026-10-28):**
  - Every card of the six decks is built on `decks` (commit `48381b6a`, schema 199). Each deck has a build plan with "Built" notes: `docs/plans/scientific-build-triage.md`, `dominion-themes-triage.md`, `expansionist-themes-triage.md`, `commerce-themes-triage.md`, `devotion-themes-triage.md` and `magisterial-themes-triage.md`. The six sheets in `docs/decks/` are the specs of record.
  - The game deals 615 Orders: 533 in the six decks, 69 shared by two decks and 13 that belong to no deck. Dominion's 15 Doctrines are live. The Doctrines of the other five decks are proposed in `docs/plans/<deck>-doctrines.md` (Expansionist's in its sheet, `docs/decks/expansionist.md`) and are not built.
  - The tidy batches Z1 and Z2 and the bots' runway rule followed (`docs/plans/tidy-2026-10-26.md`). The push gate passed on `48381b6a`: the type check, the build and `npm run test:all` (470 files, 10,262 tests).
  - The play server runs this build on `deck-themes`, pushed to GitHub on 2026-10-28.
- **Where it stands (2026-11-01):**
  - After the build, the user's review comments became batches Z3, R2a to R2d, BR1 and R3 (`docs/plans/tidy-2026-10-26.md`, `devotion-review-2026-10-28.md`, `barbarians-2026-10-28.md`, `scientific-review-2026-10-28.md`). Schema 205. The game deals 617 Orders.
  - The push gate first failed: the bots ran out of stack on turn 118 of the six-seat standard game, pricing a held Commission: The Golden Bull. Commit `fb7c6234` fixes it and re-records the two six-seat digests. The push gate then passed: the type check, the build and `npm run test:all` (474 files, 10,346 tests).
  - The user said yes to the deploy: `main` and `deck-themes` are both at this build, and the play server runs it.
  - **Next:** the user's playtest.
- **The Doctrine review (2026-11-05):** the user read every Doctrine on the review page, left 41 comments and said to implement. `docs/plans/doctrine-review-2026-11-05.md` is the spec, with the user's three answers on The Arthashastra, Human Sacrifice and The Turnpike Trusts. After it, 98 Doctrines stand: Dominion's 13 are live, and the other five decks' 85 get built by `docs/plans/doctrines-build-triage.md`.
  - **The build is done on `decks` (2026-11-06, schema 226).** All 98 Doctrines are dealt, and each sheet row has a live data row. `docs/plans/doctrines-build-triage.md` holds the batches DT1 to DT20, the readings check and the follow-ups. Nothing since `2a73a7e5` is pushed. The push gate and the re-recorded `aiDigest` digests come before any push.
  - **Next:** the user's playtest decides what changes. The user keeps playtest notes on the review page, where every Order has a row. Deck size (Dominion 129 cards, Expansionist 113, against a target of 45 to 55) waits for the playtest.

**(ddddddd) Draft pacing after the rung fix: Tier IV BUILT 2026-10-17 (schema 150); choices 1 and 2 still open.**
The rung fix (item (ccccccc), built 2026-10-17, schema 149, now in the log)
opens the Order tiers at 4, 10, 18 and 29 drafts. Measured in bot games, Tier
II now comes about three turns after research age 3, against 44 turns before.
The measurements and options are in `docs/plans/draft-pacing-2026-10-17.md`.
Three choices remain:
1. **Halve the drafts between tiers on top of the fix?** Recommended: no. The
   research age now decides when Tiers II and III open, so halving would move
   them by a turn or two at most.
2. **A gentler draft cost curve?** Recommended: keep today's. A curve of
   `n^1.8` gives about 40% more cards by turn 200, and the user finds the cards
   strong already.
3. **Tier IV:** it needs 29 drafts, and only 9 of 30 bot seats got there in 200
   turns. To bring it close to research age 4, lower its rung and move the
   tier-29 governments with it, for example to 22 drafts. Or keep it late.
   **RULED:** *"lets move tier IV to tier 26. please make this change so i can
   playtest"*. Tier IV's rung is 26 drafts, and the tier-29 governments (The
   Estates, The Sultanate, The Curia) and their Doctrine offers move to 26 with
   it. Choices 1 and 2 are not changed for this playtest. **Built** 2026-10-17
   (schema 150, commit `11911985`).

**(bbbbbbb) The hex take's readings: awaiting your confirmation.**
The take (item (aaaaaaa)) landed on 2026-10-17 (schema 148), built with these
readings. Each one stands until the user changes it:
1. A town may not take a hex with an "at most one per city" work, such as a
   Keep, if it already owns one. Two takes in one pin list cannot bring a town
   two either.
2. The town that loses the hex drops its pin there, and places its citizens
   again at once.
3. Only the player's pin moves a hex between towns. The automatic assignment,
   and so the bots, never take one.
4. **Puppet towns,** which the ruling did not mention: today the game lets the
   player pin a puppet's citizens. So a town may take a hex from its empire's
   puppet, and a puppet may take one.

**(zzzzzz) Two movement questions from the fix for item (xxxxxx): awaiting your ruling.**
The fix landed on 2026-10-17 (schema 147); item (xxxxxx) is now in the log.
1. **Detours stay on land.** The build added a rule: a march over dry land
   goes round a blocker over dry land too. Without it, units went round one
   hex by sea, and the two landings cost two whole turns. Recommended: keep it.
2. **Settlers at sea, an older bot problem.** A settler at sea turns back when
   a land raider comes near, and sets out again when the raider leaves. One
   settler went back and forth for 79 turns in a test game. A land raider
   cannot strike a unit on water, so turning back gains nothing. Recommended:
   a civilian on water ignores land raiders, and flees only from a threat that
   can reach it. This changes the bot's settler policy (`civilianFlight`),
   not a game rule.

**(yyyyyy) The Floating Gardens' future: awaiting your ruling.**
The user, 2026-10-16: *"Floating gardens are a unique building for the aztec
civ, right? We had an earlier iteration of floating garden that has since been
deprecated."*
- **Today** it is an improvement that any civ may build after Irrigation. Since
  the lake fix (item (wwwwww), built 2026-10-17, now in the log) it may also
  stand on a lake, for a seat with Sailing.
- **Where it came from:** the old Raised Fields split on 2026-09-03 (Entry
  LXIII) into the mountain-side Terraces and the Floating Gardens. The Texcoco
  leader's unique building is The Tetzcotzinco.
- **The options:** keep it for every civ (recommended), make it the Texcoco
  leader's own improvement, or retire it.

**(vvvvvv) Doctrines, governments and typed chairs — RULED, 2026-10-15 and 2026-10-16.**
The proposal is `docs/plans/doctrines-governments-chairs.md`, which records
the rulings in full. In short:
- **Typed chairs are option B** (*"I think B makes sense."*): every card is
  Military, Economic or Civic, and governments mix the three with Wildcard
  chairs (the name the card faces use for the old Open chairs).
- **Doctrines come with the government** (*"doctrines offered with the
  government, as before. Show a combination of the two deck's doctrines."*):
  adopting a government offers Doctrines of that government's tier, drawn
  from both of the seat's decks.
- **The Dominion Doctrines are the ones on the sheet** (*"#2 answered with the
  doc."*): `docs/decks/dominion.md` lists thirteen, four at Tier I and three at
  each of Tiers II to IV, and none at Tier 0.
- **Governments are as before** (*"governments are like they were before, just
  with an extra civics category"*): their chair mixes come back with Civic as a
  third type, and their signature abilities stay. The three tier-18
  abilities that count Orders by chair type work again once chairs are typed.
- **2026-10-16, the user's second pass** (quoted in full in the plan doc):
  - a new government brings only its Doctrine offer, and the rare reward
    hands are removed (*"new governments should stop giving rare reward
    hands, just the doctrine selection"*);
  - Doctrine pairs that cancel each other's drawbacks are intended (*"#3 is
    intentional"*);
  - The Marian Reforms: towns build military units at half speed;
  - Double Time is rare and dealt in Tiers II and III (one optional field on
    the row); The Serried Ranks is rare; Combined Arms gets a new second
    clause (proposed on the sheet);
  - three endless host Doctrines are proposed, every government has a
    four-type chair mix, and every Dominion card has a type (all in the plan
    doc, section 4, and on the sheet);
  - the user's answers on the sheet: The Call to the Spear and The Muster of
    the Fields become one card shared with Expansionist; a unit that starts as
    a Veteran counts as earning a rank; The Steppe Confederacy lifts the border
    freeze; The Strategoi doubles only the generals' strength aura.
- **2026-10-16, the user's third pass** (quoted in full in the plan doc):
  - the Chiefdom keeps its old mix of one Military, one Economic and one
    Wildcard chair (*"lets revert chiefdom yeah"*);
  - Double Time doubles only what Orders do at the end of a turn or every few
    turns (*"the smaller reading, it should only affect orders"*);
  - a Wildcard card fits only a Wildcard chair (*"#2 yes"*);
  - the fifth government tier was meant for a fifth age and is left
    unimplemented (*"tier 5 was meant for an age 5 that hasn't been
    implemented, just leave the last tier as unimplemented"*): the tier-38
    governments get no chair mix, and the build retires them. Card Tier IV
    still opens at draft 38. Read from the same answer and confirmed: Doctrine
    tiers I to IV come with the governments of tiers 4, 10, 18 and 29, one
    each, as Doctrine pools did before the decks rework;
  - Divine Mandate counts Civic Orders (*"lets have it count civic orders"*);
  - Interior Lines' roads take Machinery's rule at Machinery's size (40%), and
    the merged levy keeps the five-citizen floor.
- Still open: the new Combined Arms clause and
  endless host Doctrines; how the Doctrine offer mixes the two decks; and the
  other five decks' Doctrines and types. Card faces: the user chose A2 and
  asked for changes, now on the canvas as A3
  (https://claude.ai/artifact/B6Nyi6ZKCjHtXcSZTNrDoB; source in
  `docs/plans/mockups/card-faces/`).

**(uuuuuu) Dominion's four builds, and Tier IV at draft 38 — RULED, 2026-10-15.**
The user answered the questions in `docs/plans/dominion-builds.md`, where the
rulings are written out with their words. In short:
- **Tier IV opens at draft 38**, not 45 (*"lets have drafts feel more
  impactful. Let's move it down to 38 drafts. we can tune culture costs
  later."*). The governments and doctrines offered at that rung, and the
  reward hand it banks, move with it. This applies to every deck.
- Drilling may reach Elite: *"access to elite units should be a perk of
  choosing dominion."*
- The three shape families (ranks and experience, pacification, "this game"
  counts) are to be built; the rule-breaking capstones stay, and the deck wants
  more of them; The Legions' Labour is un-deferred and levied units count
  toward it; the cards no build uses are reworked, not cut.
- Next: every card goes onto `docs/decks/dominion.md` as a compact list by
  tier, the user revises it, and the cards are built after that pass. The two
  duplicates (ruling 7 there) wait for that pass.
- The "this game" counts need new counters on the player, which is a save
  format change. It can land together with (tttttt).

**(ssssss) The interface rework's open rulings — RULED, 2026-10-15** (the user:
*"Could we begin the UX overhaul that we started planning? That should go on in
parallel while i'm a blocker on deck changes"*). The batches are in
`docs/plans/hud-ux-decisions.md`, "Build plan". UX1, UX2, UX4, UX5 and UX8a
need none of the rulings below and go first. Each line carries the
orchestrator's proposal.

**The user's answers, 2026-10-15:** points 1, 2 and 3 as proposed (Supply moves
off the board; Q, L, comma and period are bound; town stepping includes
puppets). Point 4 as proposed except 4.3, verbatim: *"accept all, except only
show religious beliefs in the bonus screen; orders should appear on the
statecraft screen, showing them in both places could be confusing."* So the
Bonuses tab shows the religion's own sources (gods, follower and enhancer
beliefs, the holy city's founder share, rites running) and no Order cards.
*Default inside that ruling:* the tab's headline faith figure still sums to the
top bar's, with everything the cards pay as one slice that names Statecraft as
the place to see them, so the figure never disagrees with the bar.

1. **Supply off the board (UX3).** The always-visible resources card goes. Its
   counts move to the drawer's Supply section and to the head of every town's
   build list, and the banner's red dot lights while a resource has no spare
   copy. This reverses the rule in `src/ui/holdingsRail.ts` that the counts be
   readable without a click. *Proposed: yes, as the E2 spec draws it.*
2. **Keys (UX3, UX6).** Q opens the empire drawer and pins it; L opens the
   Leader sheet; `,` and `.` step to the previous and next town on the city
   screen. None of the four is bound today. *Proposed: yes.*
3. **Town stepping and puppets (UX6).** *Proposed: step through every town you
   hold, in founding order, puppets included, because a puppet's screen is
   where it is annexed or razed.*
4. **The faith screen (UX8b to UX11),** from `docs/plans/faith-screen-f1.md`,
   "Rulings still open":
   1. The Bonuses tab deals its cards every time it opens; a figure counts up
      only if it changed since you last looked. *Proposed.*
   2. God and belief cards show the Ledger's figure, which sums to the Ledger,
      not today's stamp (what removing the card would cost). *Proposed: the
      Ledger's.*
   3. The Bonuses tab shows every seated card that pays faith, not only
      Devotion's. *Proposed.* **Overruled: no Order cards on the Bonuses tab;
      Orders are shown on the Statecraft screen.**
   4. The prophet's rite appears on the Rites tab. *Proposed.*
   5. Rows for rival faiths pressing your towns follow the faith lens's fog
      rule: towns you remember count, not only towns in sight. *Proposed.*
   6. Towns keeping a rite are listed soonest free first. *Proposed.*
   7. The drawer's Religion dot lights only when a decision is owed (a belief
      to choose), not whenever a rite is affordable, which would be true on most
      turns. The sheet is called **Faith**, since it holds rites, bonuses and the
      religion. *Proposed.*

**(tttttt) A purchase can strand set-aside hammers — fix held for the next
save-format change, 2026-10-15.** Found by the UX5 agent and confirmed in code.
When a town moves a building off the front of its queue, the hammers it had
banked are set aside under that building's name (`city.itemProgress`,
`parkHammers` in `src/sim/state.ts`). If the player then buys that building
outright while it is not at the front, `purchaseItemAt` removes the queue row
but leaves those hammers set aside, and since the building now stands, nothing
can ever spend them. The stated rule is that buying never spends banked hammers
and nothing is lost. *Proposed fix:* a bought item's set-aside hammers join the
basket and go to whatever the town builds next; check the other ways a queued
building can come to stand (a card or wonder granting it, capture) for the same
leak. Fixing it changes outcomes, so it needs a new save format, which would
stop the current playtest save from loading. *Default:* it lands with the next
deck batch that changes the save format anyway. Say if you want it sooner.

**(rrrrrr) Three costs of war: unrest, war weariness, ranks — RULED, 2026-10-14**
(the user, after the warmonger research in `docs/plans/warmonger-research.md`:
*"we're missing certain mechanics for war that make the warmonger playstyle feel
more strategic, namely war weariness, unit promotions, unrest"*). The design was
proposed in chat and the user ruled on its four open questions: *"puppets should
not skip unrest, weariness comes from losses only (the difference between your
losses and their losses), lets have ranks just give more combat strength for
now, order sounds good"*. Lines marked *default* are the orchestrator's choices
inside that design: the user may overrule any of them. Every number lives in
`data/rules.json`.

Why these three: each prices a different part of a war. Weariness prices losses,
unrest prices taking towns, ranks price losing units. Today a war costs nothing
to declare, nothing to keep fighting, and a captured town works for its captor
the turn it falls; the user's playtest found authority stops binding by turn 50.

Built in this order, each as its own batch, gated and deployed for playtesting
before the next starts.

1. **Unrest (batch WC1) — BUILT 2026-10-14, schema 125.** As built:
   `docs/war-diplomacy.md` §5c and `src/sim/unrest.ts`.
   - **Choices made in the build, for the user to check in play:**
     - The gate is step 13 of `docs/yields.md`, after both stages, so nothing
       can bring a stopped voice back.
     - One-time grants still land in a town in unrest: chopped hammers, card
       windfalls, purchases, and a card that turns production into gold.
     - A town ceded at a treaty table keeps its unrest record as it stands.
     - A town in unrest raises no empty-queue blocker.
     - Bots keep a soldier in a town in unrest and do not attack out of it with
       that soldier. They raze their own town in unrest when no soldier is
       within four hexes and six or more turns of unrest remain.
   - **Bot games:** no town changed hands by turn 120 in the duel digest game
     (checked), and the standard game's print kept its length, so the bots' own
     play is unchanged in both. Unrest shows up in the user's conquests and in
     longer bot wars.
   - A town taken by force enters unrest, **whether it is kept as a puppet or
     annexed** (the user). Annexing a puppet neither restarts nor ends its
     unrest. Razing leaves nothing to pacify.
   - *Default:* a town retaken by the empire that founded it enters unrest too,
     for `City.captured`'s reason: a war of reconquest is still a war.
   - *Default:* a town taken again while still in unrest starts a fresh unrest
     for its new owner.
   - **While in unrest** the town makes no production, science or culture, and
     its borders do not grow. Food, gold and faith are unaffected.
   - **Pacification fills each turn,** the way production fills toward a
     building. When it reaches the target, unrest ends. *Defaults:* the target
     is 2 × the town's population on the turn it was taken. The rate per turn is
     1, plus 1 while one of its owner's military units stands in the town, plus
     1 while one of its owner's great generals stands in or beside it, plus 1
     once it has a Courthouse. The rate is a labelled list (rule 5), and the town
     panel shows the bar, the reasons and the turns left.
   - **Rebels.** A town in unrest with no military unit of its owner in it
     raises a rebel. *Default:* one every 3 such turns: a barbarian unit of the
     kind a camp would raise that turn, placed on a free hex beside the town. A
     rebel is an ordinary barbarian from then on.
   - **Bots** keep a garrison in a captured town until it is pacified, and count
     unrest when deciding whether to take or raze a town.
   - **Interface:** the town panel's unrest section and an unrest mark on the
     town's banner (a new `CityLook` field).
   - Not in this batch: cards that read unrest.
2. **War weariness (batch WC2) — BUILT 2026-10-14, schema 126.** As built:
   `docs/war-diplomacy.md` §6a and `src/sim/weariness.ts`.
   - **Choices made in the build, for the user to check in play:**
     - Each enemy you are weary of is its own cost line in the happiness list,
       labelled with that people's name.
     - The foreign courts table shows the weariness against each empire, even
       at peace, because peace does not erase losses.
     - The Compendium has a "War weariness" entry.
     - Bots read weariness only when deciding on peace: a weary bot sues
       sooner, signs worse terms and pays more. The enemy's weariness never
       counts, and the reading that decides whether a bot keeps campaigning
       ignores weariness.
   - **A regression found and fixed in the build:** the first version put
     weariness into that campaigning reading too. A losing bot then stopped
     marching one turn early, and the war in the slow-tier war loop never
     reached a peace.
   - **Bot games:** on the standard digest board, weariness cost the warmonger
     its happiness bonus for a turn, and halved one rival's growth for two
     turns. That was the only change.
   - **Not built:** weariness in the decision to declare war, a turn message,
     and a mark on the empire roster.
   - **From losses only** (the user). Weariness against one enemy is **your
     losses to it minus its losses to you**, never below zero, so a war you are
     winning costs nothing.
   - **A town counts as 8 units** (the user, 2026-10-14: *"losing a town counts
     as losing 8 units, losing a single unit shouldn't be very punishing"*).
   - *Defaults:*
     - A loss is a unit of yours that empire destroys or captures, military or
       civilian, or a town of yours it takes by force.
     - Losses count over the last 20 turns. Peace does not erase them; they age
       out.
     - Barbarians never count, on either side.
     - A town handed over in a peace deal is not a loss.
   - Total weariness is the sum over enemies, and it is a line in the happiness
     list, one line per enemy. *Default:* 1 happiness per point. An unhappy
     empire stops growing and is not otherwise weakened, so weariness never
     touches combat.
   - Stored as losses stamped with their turn and read through the window:
     compared, never counted down, the way Triumphs are recorded.
   - **Bots** weigh weariness when offering and answering peace.
3. **Ranks (batch WC3) — BUILT 2026-10-14, schema 127.** As built:
   `docs/war-diplomacy.md` §6b and `src/sim/ranks.ts`.
   - **Choices made in the build, for the user to check in play:**
     - **Kills:** a kill earns 2 experience in all, not 1 for surviving plus
       2. Veteran takes two kills and Elite five.
     - **What counts as a fight:** a blow at a soldier, or at a town whose walls
       still stand. Taking a civilian, plundering a caravan or walking into an
       empty town earns nothing, and towns never earn.
     - **Barbarians** take a unit to Veteran and no further. Barbarian units
       earn no experience themselves.
     - **The forecast's old card line is renamed.** The strength stamp from
       cards (Professional Soldiers, the Terracotta Army) used to print
       "Veteran"; it now prints "Training", so "Veteran" means only the rank.
       The Terracotta Army's note is reworded to match.
     - **Where the rank shows:** one chevron (Veteran) or two (Elite) on the
       unit's badge, the same chip on a town banner's garrison row, and the
       rank and experience in the unit panel.
     - **Bots** keep a ranked unit below three quarters health out of a blow
       it could die to, or one that deals no more than it takes.
   - **Bot games:** both digest games changed, because units now earn ranks
     in them.
   - **Not built:** a message when a unit ranks up, cards that read ranks, and
     ranks in the bots' strength estimate when deciding on war.
   - **Ranks give more combat strength and nothing else for now** (the user):
     no choices, no extra health, no movement.
   - *Defaults:*
     - Experience from combat: +1 for each combat a unit survives, +2 for a
       kill, attacking or defending.
     - Veteran at 4 experience, Elite at 10.
     - Veteran +3 strength, Elite +6 in total: the size of a general's aura and
       of full fortification.
   - **Each rank is one flat strength line on the combat ledger** (the user,
     2026-10-14: *"our combat is based on flat bonuses, so the combat from ranks
     should be flat right?"*). The damage curve reads the difference between
     two strengths, so a flat edge is worth the same in every age (`combat.ts`:
     *"it has no scale"*). A share of base strength would grow stronger each
     age.
   - Experience stays with a unit through its automatic upgrades.
   - Fighting barbarians can take a unit to Veteran and no further, so camps
     that respawn cannot be farmed.
   - **Interface:** a rank badge on the piece (it joins `signUnits` and the
     flair gallery), rank and experience in the unit panel, the rank line in the
     combat forecast.
   - **Bots** keep damaged veterans out of fights they are likely to lose.

**(qqqqqq) The deck balance review's rule questions — RULED, 2026-10-12** (the
user, answering `docs/decks/review/summary.md` items 1–15, and in chat). The
reasoning behind each question is in that file and the four lens reports
beside it.

1. **Stacked purchase discounts.** Discount cards stop discounting the price.
   The user: *"modify bonuses to +25% of the yield instead of a discount on
   the total cost."* Read as: each card that took a percentage off a purchase
   price instead raises the yield that pays for purchases by 25% (gold for the
   gold cards, faith for the faith ones), so stacking adds income and can never
   make a purchase free. Confirmed by the user, 2026-10-12. The scope and
   any downside of each card stay as they are.
2. **A discount or bonus names its currency** and applies to that currency
   only.
3. **Faith buys production at 2 faith per hammer** (gold stays at 4). Reroll
   prices in faith are unchanged. The gold price of a reroll keeps the same
   premium over faith's worth: `redraw.goldMultiple` is **3** (the user,
   2026-10-12: *"multiplier to 3 is what i meant"*; one faith is now worth two
   gold, so 3 is 1.5 times break-even, as 6 was before). The reward hand the
   new fifth rung banks at draft 45 stays until after playtesting.
4. **No cap on card bonuses toward the Magnum Opus.** *"This seems like a fun
   way to play the game."*
5. **Adopting a government no longer unseats every card.** A card's progress
   (a commission's count, a counter) stays with the card through unseating
   and adoption; only events while it is seated count.
6. **Commissions are not races.** A commission belongs to the seat that drafted
   it, is visible only to that seat, and asks nothing about other empires
   finishing first.
7. **Only a citizen gained by filling the food basket counts as growth.**
   Levies, migration, retired units, faith and founding add citizens that do
   not.
8. **Every card that enters your collection counts as drafted**, however it
   arrived: it fires its on-draft boon, and a charter grants its technology.
9. **All drafted cards stay in the player's collection**, unseated, and count
   as held. That includes charters and commissions. The interface must show
   that a charter is active while unseated; what that looks like is deferred.
10. **A charter technology costs its column's price × 1.5**, one figure in
    `data/rules.json`.
11. **A charter's benefit is the technology.** Researching it grants what the
    technology unlocks, guaranteed. **No card depends on a charter
    technology:** the "Needs <technology>" gates on the Scientific sheet are
    removed, and those cards are ordinary cards in the pool (the user,
    2026-10-12: *"we should remove the dependencies"*).
12. *Open — the user asked what chairs mean for the draft meter; answered in
    chat 2026-10-12.*
13. **One draft pool per seat.** A hand is drawn from one pool: the common
    cards plus every card of the seat's two decks, including every shared card
    that names either deck (a Commerce and Devotion seat can draw Commerce and
    Magisterial shared cards). This replaces the current one-card-per-deck
    hand with a common or shared third card.
14. **Every pair of decks keeps a shared card at Tier I or earlier.** Garden
    Cities, Illuminated Treatises and Hydraulic Schools stay; the pairs that
    lack one get one.
15. **Counts and maturity show in the interface.** A card that counts
    something shows its count; a tile or building crossing a card's age
    threshold is announced.

Also ruled in chat the same day: **uncapped late-game engines are wanted.**
*"I think the game is more fun with uncapped orders, these are the late game
engines and orders that allow players to 'break the game' which plays into
the power fantasy of the game."* Items 16 and 17 (caps on The Money Lenders
and The Strongroom) are therefore declined.

**(pppppp) Four Commerce cards that lift a rule — RULED, C3, 2026-09-19** (the
user, 2026-09-19, answering four questions). Each of these was cheap to build
and expensive to decide; the decisions are below, with what each rule was
protecting so a later reader knows it was weighed rather than missed.

1. **A Court of Merchants — fall back to the normal draw.** When the merchant
   roster is spent, the offer is drawn the ordinary weighted way. The card is a
   strong nudge, never a lock, so the reason the draw is weighted rather than
   restricted — *a spent roster banks rather than blocks* — survives intact.
2. **The Gilded Scaffold — build it as written.** Gold buys world wonders and
   every city loses 15% production while it is held. This lifts *a wonder is
   never for sale*, which existed so that one-per-world was not decided by who
   was richest the turn it unlocked. The lift has a precedent in the same
   clause: the Valley of Kings already waives it for faith in one town
   (`BuildingDef.faithBuysWonders`). Build the gold lift the same way — an
   action rule read at the one refusal in `purchaseError`, not a second path.
3. **The Brokers' Redraw — gold at a premium.** Gold may pay for a redraw, but
   it costs more than the faith ladder would, so faith stays the efficient
   route and the card is a convenience rather than a replacement. This keeps
   faith worth holding for an empire that keeps no religion, which is what
   faith-only was protecting. The premium is a number for `data/statecraft.json`,
   never a constant in code.
4. **Civic Receipts — pay on the purchase of any building.** The user's words:
   *"rework: pay on purchase of any building."* **Read as: every building
   purchase pays, with no first-time restriction and no ordinary-building
   restriction** — not "the first purchase of any building". The offered option
   was the narrower one and it was declined in favour of a rework, and "on
   purchase of any building" says what it says. This is a real buff: a standing
   10% culture rebate on every building bought, uncapped. It also takes the card
   off the ledger of firsts entirely, which removes the withholding case C1
   shipped deliberately. **If the narrower reading was meant, it is a one-word
   correction and the card should carry `first` again.**

**Venture Routes** is built in the same batch and needed no ruling: a route's
term is `expiresTurn = state.turn + TRADE.routeTurns`, a constant, so a
percentage on it is the shape `settlerCost`, `unitUpkeep` and `roadStepCost`
already are.

**(oooooo) Niter cannot be mined, and one rule is written in three places —
RULED, R6, 2026-09-18** (the user, 2026-09-18: *"ok yeah, put in the niter fix
and the deduplications"*). Two jobs, both cleanup after the five strategic
resource batches; `docs/strategic-resources-proposal.md` §9 is the list.

**The niter fix.** Niter's row is `hills: false` on plains, desert and tundra.
`mine` is the only improvement that lists it and carries `requiresHills: true`,
so a flat niter seam cannot be worked at all — only a city standing on it or a
great person's academy opens it. This was survivable while the gate was a
boolean and is not now that copies are spent.

**The ruling: add `hillsIf: ["ownResource"]` to the mine's row.** The mechanism
already exists and was built for the mirror image of this problem — the farm
carries that waiver because *"wheat on a hill wants a farm and can take nothing
else, so refusing the farm makes it unimprovable"* (the user, 2026-08-27).
Niter on flat ground wants a mine and can take nothing else. Same ruling, other
direction. It is a JSON edit the schema already validates, the waiver is gated
on the resource being revealed so it cannot leak the map through a button, and
**no other mine-opened resource is flat today** — copper, obsidian, iron, gems,
marble, silver, gold and lapis are all `hills: true` — so the blast radius is
niter alone. Rejected: putting `hills: true` on niter, which would move where it
spawns, shrink its footprint and make it compete with iron and copper for hill
tiles, all to avoid a one-word data edit.

**The deduplications.** Three readings restate a rule that lives somewhere else,
each because a batch was fenced out of the module that owns it:
`tileCopies` (private to `cities.ts`) is restated by `tileCopyCount`
(`src/ui/resourceCopies.ts`) and `tileSeamCopies` (`src/ai/value.ts`), and
`openedResource`'s clauses are restated by `improvementOpensSeam` in `src/ai/`.
Export the originals, delete the copies. Also: the HUD register comment in
`index.html` does not list the holdings rail, because that file was outside R4's
fence.

**(nnnnnn) A dealt card's face — RULED, U1, 2026-09-17** (the user, 2026-09-17:
*"could you take a look at the UI for the new cards? Lets have the icons
reflect what kind of card they are, also, i notice the deck type is mentioned
on the card design twice. Please consolidate the design so that the icons are
informative, deck type is on the card just once, add the rarity to the card
somewhere."*). Three faults on one face, all of them D1c's stated leftovers.

1. **The emblem says nothing.** All 399 new rows carry `line: 'none'`, so
   `cardFace` gives every one of them the same neutral lozenge — three cards in
   a hand are three identical plates. The fifteen `CardLine` threads are dead
   for rows written after the rework (`docs/plans/decks-shape-audit.md`'s foot:
   *"`line` is dead for the new rows… the deck is the thread now"*), and the
   emblem should be the **deck's** mark.
2. **The deck is named twice**, in the eyebrow (`orderPayoff` → "Dominion
   order") and again on the chip under the title (`orderBadges`). D1c kept both
   deliberately — the eyebrow is the accessible reading order, the chip is the
   visual badge — but on screen it is the same word twice.
3. **Rarity is nowhere on the card**, though it is the field the draw is
   weighted by and the one thing that tells a player whether a card they passed
   on is likely to come round again.

**The ruling**: the deck is named **once in words** and shown **once as a
mark**. The eyebrow keeps the words (it is the reading order, and it is where a
cross-type names both of its decks); the emblem takes the deck's own drawing
and the deck's own ink; the chip the deck word vacates is spent on **rarity**,
which the card has never carried. A charter keeps its own chip — a charter is a
kind, not a deck, and the fact that it takes no chair is the one thing a player
cannot work out from the clauses. The rarity marks are the doc's own and the
sync test's: ● common · ◆ uncommon · ○ rare
(`docs/orders-and-doctrines.md` §Rarity).

**(rrrrr) The Khopesh upgrades into the Legionary — BUILT** (the user,
2026-09-15: *"khopesh should upgrade into legionary"*). `upgradesTo` on the
row: it went straight to the Longswordsman, skipping the rung every other
sword climbs; the roster doc is re-printed.

**(hhhhhh) A mountain's hitbox swallows its neighbours — BUILT, R5, 2026-09-16** (measured: the centre of every neighbour already picked right; the *faces* did not — a mountain took a tenth of a neighbour's face on average and a third at worst on a generated map, and in the browser three hundred and fifty-eight of seven hundred and eighty-five probe points along a neighbour's face named the mountain. The cause was not only the peak: the range's props — summits, saddles, shoulders and talus — are labelled with the mountain's cell and a shoulder stands most of the way to a hill neighbour's centre, and the tile pick raycast every registered mesh including them. Now the pick refuses every prop flagged pick-only at registration, so it reads the near ground alone; every face is its own at both zooms, zero of seven hundred and eighty-five probes and two hundred and ninety-four real clicks name the wrong hex, a unit behind a peak stays pickable where its body shows, and no pixel changed; pins in `test/render/tilePickGround.test.ts`; the rule in `docs/README.md`) (the
user, 2026-09-16: *"i think the mountains hitbox is too big so clicking
adjacent tiles often incorrectly selects the mountain instead"*). **Measure
first**: in the painted renderer at play zoom and at overview, for a mountain
hex and each of its six neighbours, put the cursor at the neighbour's screen
centre and record which hex the pick returns; do the same for a hill and a
flat hex as controls; print the table. The expected cause: the pick resolves
against the first mesh a ray hits, and a mountain's peak stands tall enough
that a ray aimed at the ground of the hex *behind* it (in screen space, the
far side under the ortho tilt) strikes the peak first. **The rule**: the hex
under the cursor is the hex whose *ground* the cursor points at — the pick
resolves on the ground plane (or the hex grid's own inverse at the tile's
base height), never on dressing geometry; a peak, a tree, a city model or a
unit piece may be what the eye sees, but the ground decides the hex. Units
and cities keep their own pick (a piece is a target) — the fix is to the
*tile* pick only, and a unit standing behind a peak must still be pickable.
Pins: the six-neighbour table returns the neighbour every time at both zooms
(a headless test against the pick function with the fixture board); the
before/after screenshot pair is pixel-identical (no drawing changes).
`docs/painted-renderer.md` or the renderer's reference notes the rule.

**(gggggg) The Compendium names the technology that opens a thing — BUILT, C1, LANDED 2026-09-16** (one opening line on every building, wonder, unit, improvement and rite — a hundred and twenty-one name a technology, seventeen a card, twenty-six a leader, two say "from the start", the Bastion among them with no gate at all, a data oddity to look at; the reverse reading is `gatingTech`, the cost column's own; the mirror against every tech's unlocks is pinned both ways)
(the user, 2026-09-16: *"please revise the compendium to include which
technology unlocks a given building/unit/wonder etc"*). Every Compendium
entry for a thing the tree opens — a building, a wonder, a unit, an
improvement, a great person's work if a tech gates it, a rite or ability if
`techsGrant` names it — carries a line naming its unlocking technology as a
keyword ref (`[[tech:id|Name]]`, so it links), read from the tree's own
`unlocks` (the one reverse reading `cities.ts` already makes for the cost
column — reuse it, never a second table); a thing no tech opens says who
does open it (a card's `unlocksBuilding`, `unlockedByCard`, a leader's
unique row, "available from the start"), and a wonder's world-gate line
(`worldUnlockTech`) stays as it is beside the new one. The tech entry's own
list of what it unlocks is the mirror and already exists — the two must
agree, pinned. Plain words (rule 7), the entry's existing voice.

**(ffffff) A ship is a garrison — RULED, holds by construction; pinned with D1**
(the user, 2026-09-15: *"ships should count as a garrison regardless. Coastal
cities have the benefit of double dipping the garrison bonuses, without any
special modifiers."*). The sim already says so: `'naval'` is its own stacking
category, so a hull and a land piece share a coastal city hex under the
ordinary caps (`unitData.ts`'s category docblock: "on a coastal city hex a
ship garrisons"); `garrisonOf` (`statecraft/evaluator.ts`) takes every
combatant of the owner standing on the hex, and a hull is a combatant because
its row carries a strength; the `garrisoned` predicate is boolean (admits
once), the `garrison` count kind counts pieces — so a soldier and a ship are
**two**. Consequences, not code: (1) **garrison bonuses in the deck rework use
the count basis** (per garrison piece), never the boolean, so a coastal town
pays twice and an inland town once, with no naval clause on any card — the
stacking cap is the only ceiling, and it is two; (2) no card grants "a ship
counts as a garrison" (the orchestrator's Fleet Anchorage is struck from the
worksheet); (3) the city's garrison beat already defends with the best piece
present. D1 carries the pin: a hull alone on a coastal city is a garrison, a
hull and a soldier count two, and an inland town with a soldier counts one.

**(eeeeee) Two military buildings for the middle ages — BUILT, M2, LANDED 2026-09-15** (`warHall` at Bronze Panoply, medium, +2 production, units mustered there +10 max hp; `armoury` at Mathematics — the retired Machinery-era row re-opened under the M2 spec — medium, +4 production, +25% toward ranged and siege; both chain on the Barracks; the Courthouse at Iron Working, its price 520 → 231 hammers; **one seam fixed**: a buildable row's `unitStamp` was declared and never applied, since the stamp reader walked only the empire's one-of-a-kind effects — it now reads the birth town's effects first; no city prop draws per ordinary building, so no pixel changed; the six-seat digest moved because the bots value the richer techs differently, re-cut with the reason) (the user,
2026-09-15: *"Let's have the age 2 building be: +2 production, units trained in
this city gain +10 health. Age 3: +25% production towards ranged and siege, +4
production."*). The ordinary military row today is Barracks and Stable in age
one, walls, then Shipyard in three and Castle in four — nothing for a Dominion
card to condition on before age three but a Barracks or a garrison. **Age
two: the War Hall**, a NEW row (the user, 2026-09-15: *"lets create a
separate building, the smithy already serves as the production building for
age 2"* … *"lets just call it a war hall"* — the Smithy is untouched):
`warHall` at `bronzePanoply` (age 2, the armour technology, beside the smithy
in its unlocks), category `military`, +2 production, a `unitStamp` with
`hp: 10` scoped `hasBuilding: warHall` (the Terracotta Army's shape;
`unitDef(...).maxHp + stamp.hp` is already the reading), renown to the
general as the Barracks pays, size medium per the cost standard, a plain
`note` (soldiers raised here march in bronze).
**Age three: the Armoury**, a new row at `mathematics` (the catapult's and
the composite bowman's tech): `size` medium-or-large per the cost standard
(the agent proposes from `docs/production-costs.md`'s table, never a figure),
+4 production, `productionBonus` +25% toward units whose model class is
ranged or siege (the Barracks' shape with `modelClasses: ['ranged','siege']`
— confirm `siege` is a model class; if siege is a category, the selector
takes both forms), category `military`, renown to the general as the Barracks
does, requires a Barracks if buildings carry prerequisites (else not). **The
Courthouse moves to age three** (the user, 2026-09-15: *"lets move courthouse
to age three"*): out of `theQadisCourt`'s unlocks (age 4) and into
`ironWorking`'s (the legionary's tech) — an unlocks edit, not a lane change;
its column and so its price follow the tech (printed before/after in M2's
report); its effect joins no other building (the user: *"i dont see a need
to add its effect to a different building"*). Pins: a unit produced in a War
Hall town has ten more max hp than
the roster's and keeps it marching; a unit built elsewhere does not; the
Courthouse is buildable in a captured town once Iron Working is held and
refused before; the
Armoury's percent lands only on ranged and siege rows; both rows in the
buildings reference doc with the sync test green; the Compendium prints both
from the rows; a v117 log replays (no schema change — a new row and a new
stamp on an old row are data).

**(mmmmmm) Screens that dispatch around the register — BUILT, M1, 2026-09-17**
(the sweep found **thirteen** sites where the ruling named four — the reroll,
the ruin/village pick, the Order pick and its pass, the charter, the Doctrine,
the belief, the tarot, the Reliquary's call at the ladder, the reward sheet's
whole command class, the religion sheet's faith purchase, the wager stake and
the census dismissal. All thirteen now leave through **one** `send` in
`main.ts`: `dispatch` → `controls.reportCommand` → `reportSharedNews`, and
`controls.repaint()` on acceptance. `reportCommand` rather than `commit`, for
that docblock's own reason — the funnel's list would re-run the sighting poll
and a dozen other readings for one command, and two of the things on it raise a
modal, from inside the callback of a modal already raising the next one.
**`refresh`'s contract is obeyed, not widened**: it still means "the game object
was replaced" and it still seats the client; what moved is the calling. Its
mid-game twin is `GameControls.repaint()` — the lens, the board, the overlays,
one pass over the HUD, and no opinion about the chair — which is the repaint
`sendStatecraft` had always ended on, factored out. The seven diplomacy-rail
verbs were the same abuse one step milder (they reported correctly through
`controls`, but repainted with `refresh(localPlayerId())`, emptying the skip set
and dropping the selection on a press of Declare War); they repaint now.
`main.ts` holds exactly one `dispatch` and two `refresh` calls, both at a game
replacement. The register is `test/ui/dispatchRegister.test.ts`)
(2026-09-17). A handful of surfaces in `src/main.ts` call `dispatch(game, …)`
directly and then `controls.refresh()`, reaching **neither** `commit` nor
`reportCommand`: the religion screen's faith purchase, the offer reroll, the
wager stake, the census dismissal and others. A command issued there produces
no shared news at all — if one of them ever won the game, razed a town or
plundered a cart, the player would be told nothing. They were silent before
V2 as well, so this is a standing hole rather than a regression, but V2's
once-guard now makes such a silence **permanent** rather than deferred to the
next reported command. The fix is to route those sites through
`controls.reportCommand`, a `main.ts` pass. Related and worth doing in the
same breath: those same mid-game `controls.refresh()` calls abuse a contract
that says "call after replacing the game object", and silently reset the seat
to zero — a separate latent bug V2 found and did not touch.

**(llllll) A game can be won and never announced — BUILT, V2, 2026-09-17**
(the check moved into `reportSharedNews`, both bolted-on checks deleted,
`wonBefore` gone from the file; the once-guard is a client fact re-baselined
on `refresh`, so a loaded already-won save announces nothing; the hand-over
still raises the sheet last, behind the turn card, via a third holder beside
Triumphs and beads, and the register and the beat can never both fire.
**Eleven roads into `realiseItem` could finish the Opus and ten were silent** —
a contribution, a purchase, a rite's riders, a chop, a claimed ruin, an
engineer, a trade route, a bead's boon, battle spoils, a ceded town — and the
user's own most likely road, the city panel's Contribute button, is among
them. The Opus is deliberately not marked a wonder, so the "never for sale"
refusal never covered it and a purchase is a real road in.)

**(llllll, original ruling) A game can be won and never announced — RULED, V2** (the user,
2026-09-17, playtesting: *"i didn't get a victory screen after completing the
magnum opus. I had >7 beads, maybe that was the reason"*).

**Not the beads.** Beads gate the *door* — the threshold lives in `buildError`
— and never the close; holding more than the threshold is simply holding more.
`data/buildings.json`'s `theMagnumOpus` carries `endsTheGame: true`, and
`realiseItem` (`src/sim/cities.ts`) calls `closeTheGreatWork` off that marker
"in the one routine that means *the city now has the thing*, so an Opus
hammered out, hurried by contributions or bought outright all close the age by
this line". **The sim is right: `state.winnerId` was almost certainly set.**

**The interface is wrong.** `onVictory` fires from exactly **two** places in
`src/ui/controls.ts`: the **attack** handler (line ~5111) and the **end-turn
press** (~7566 and ~7577). Both guard on `wonBefore === null`, captured before
their own dispatch, so each fires once. Any *other* command that sets
`winnerId` announces nothing — and then the next End Turn sees a game already
won, `wonBefore !== null`, and stays silent **for ever**. The Opus can be
finished by a path that is neither an attack nor an end turn — a rite's hammers
(CLAUDE.md names this seam: "a rite's hammers completing a wonder carry no
toast (known gap)"), a contribution, a purchase — and every one of those wins
the game in silence. A rival winning inside its own command is the same hole
seen from the other side.

**The fix**: the victory check belongs in **one** place that every accepted
command passes, not bolted onto two of them. T2 has just built exactly that
seam — `reportSharedNews`, the register of news that is *about me whoever
caused it*, reached from both `commit` (this seat's orders) and
`reportCommand` (a rival's). A win is the loudest member that register will
ever have. The "fire once" guard moves with it and becomes a fact about the
client, not about a command: **the game was announced, or it was not.** Delete
the two bolted-on checks; do not leave a third.

**Pins**: the Opus finished by production announces once; finished by a rite's
hammers announces once; finished by a contribution or a purchase announces
once; a rival finishing it announces to every seat; last-empire-standing still
announces; the sheet is raised exactly once however many commands follow; a
game already won before the client attached announces nothing new.

**(kkkkkk) A trader is a marker on the ground, not a piece in the way — RULED, T3**
(the user, 2026-09-17: *"there can be as many traders on a single tile as
needed, they don't count towards tile unit limits. If a unit is standing on
top of a trader, hide the trader from view. Units can step on other player's
traders regardless of war status (players at peace can just have overlap).
Think of the trader unit as just a placeholder position for pillaging, but
otherwise does not interact with units."*)

**Half of clause one is already true and that is the useful finding.**
`stacksFreely('trader')` (`src/sim/units.ts`) already answers before the sweep
— "a caravan always fits, anywhere it could stand at all, whoever else is
standing there" — and `hasEscortRoom` skips traders as well. So a player's own
caravans have never blocked each other for stacking. **The jam was somewhere
else**: `canStopOn` (`src/sim/pathfind.ts`) refuses any hex flagged
`PEACEFUL_UNIT`, which is set for *every* foreign piece whose owner you are not
at war with — a rival's caravan included. An international route's goal is the
partner's doorstep, so one peaceful foreign piece parked there is enough to
deny the path, and before this ruling a lapsed route then died of it.

**What changes:**
1. **A trader never blocks anybody.** A foreign trader must not raise
   `PEACEFUL_UNIT` (or must not make `canStopOn` refuse), at war or at peace,
   for a mover of any kind. Traders keep stacking freely; nothing about the
   caps changes, because they were already exempt.
2. **A trader exerts and suffers nothing else**: no zone of control, no escort
   slot, no blocking, no stacking count. It is a marker saying *a route passes
   here and may be pillaged here*, and that is its whole interaction.
3. **A unit standing on a trader hides it** (`src/render3d/`), so a hex shows
   the piece that matters. The trader returns when the hex is its own again.
4. **The war check in `arrival.ts` becomes load-bearing and must be added.**
   Today that file's plunder and capture branches ask only "somebody else's,
   civilian, laden" — the war requirement is held *entirely* by `canStopOn`
   refusing a peaceful hex. Clause 1 removes that guard for traders, so
   **without a war check a peaceful neighbour's scout walking over your caravan
   would plunder it**. The check goes where the taking happens, and its
   docblock says why it may not live in the caller any more.

**Pins**: a soldier may stop on a foreign trader's hex at peace and the
caravan is untouched; the same at war plunders it; six caravans and a soldier
share a hex; a trader may stop on a hex holding foreign pieces; a trader
exerts no zone of control; a rival's caravan never denies a path; the renderer
hides a trader under a piece and shows it again when the piece leaves.

**(jjjjjj) A route that ends by somebody else's hand tells nobody — RULED, T2**
(the user, 2026-09-17, playtesting: *"i'm not getting notifications that my
routes are being pillaged, yet they keep disappearing"*, then: *"i dont know
if i see barbarians where i'm sending my routes though, could you check the
logic for traders when they complete a route? or if there's something else
ending the routes"* — the second question found the bigger half).

**The whole of it: a route ends in the command of whoever ended it, and the
owner only ever hears about their own commands.** `reportRoutes`
(`src/ui/controls.ts`) is seat-filtered and correct, and it has **exactly one
call site** — inside `commit`, which runs for the local player's own orders.
A rival's orders go to `reportCommand` instead, which deliberately does not
run `commit`'s funnel (its docblock: firing a seat's after-effects for a
rival's order "would narrate another empire's turn"). That reasoning holds
for a sighting poll; it does not hold for `routesEnded` and `reportRaids`,
which are **already filtered to the local player's own losses** and speak
only when the local player is the one hurt. So three silences, one cause:

1. **A rival declares war** → `cancelRoutesBetween` (`diplomacy.ts`) kills
   every route between the two empires → `routesEnded` rides the *rival's*
   command → the owner is never told. The war popup itself does fire
   (`warDeclared` is handled in `onCommand`), so the player sees the war and
   not the three routes that died with it. **This is the likely case the user
   is hitting** — they report no barbarians, and bots dogpiling them with war
   is a standing complaint.
2. **A rival razes a city** a route ran to → `cancelRoutesAt` → same silence.
3. **A piece walks onto the caravan** → the arrival plunder, below.

**THE RULE, ruled 2026-09-17 and overriding every mechanism below** (the user,
after eight routes died in one turn: *"trade routes should never die unless
they're pillaged, this is incredibly frustrating"*). **A route ends in exactly
three ways and no others: it is pillaged; war ends it; or an endpoint stops
being a city (razed, captured, lost).** Everything else that ends a route
today is a bug and comes out:

- **The jam-drop comes out entirely.** `marchOneTrader`'s "a route that has
  already lapsed ends here rather than at home" is deleted. A caravan that
  cannot path **waits**, however long it takes. The docblock's fear — a cart
  waiting for ever on a partner it can never reach, holding a slot — is
  already answered by `routeTarget` returning `null` when an endpoint stops
  being one of this empire's cities, which is the legitimate ending above. A
  jam is not a wall and must never be fatal.
- **Auto-renew means the route never expires.** Renewal is rewritten to fire
  wherever the caravan is, not only on reaching home, so an auto-renewing
  route can never be in the lapsed state at all. (Equivalently: an
  auto-renewing route has no expiry. Implement whichever reads cleaner and
  keeps `usedRouteSlots` honest.)
- **Without auto-renew**, a route still ends when its term runs out and the
  caravan is home — that is the player's own choice and stays.
- Every one of the three legitimate endings **announces to the owner**, per
  the reporting fixes above, and the words say what happened: pillaged, ended
  by war, or its town lost. No ending is ever printed as a homecoming.

**Three more, found by the user's third question** (*"i have 15 trade routes
active, all set to renew, would having a large number of routes cause any
issues?"*) — and these are probably the ones they are actually hitting:

4. **The ending does not read as an ending.** `routeEndSentence`
   (`src/ui/tradeLines.ts`) prints *"The caravan from Uruk has come home"* for
   `renewed: false` — the sentence for a route that has **ended**. It reads as
   good news about an arrival. A player has no way to connect it to a route
   disappearing. Reword so a route ending says it ended.
5. **A lapsed route dies of traffic, and auto-renew does not save it.**
   `marchOneTrader` (`src/sim/turn.ts`) rewrites `expiresTurn` **only when the
   caravan reaches home**. A term that runs out while the cart is on the road
   leaves the route live but lapsed; then the jam clause — "a route that has
   already lapsed ends here rather than at home" — drops it on any turn it
   cannot path, **whatever `autoResend` says**. Caravans are stacking-free, and
   the docblock names the commonest jam as another civilian in the gateway, so
   **a player's own caravans are the traffic**: the more routes, the likelier
   one is stuck on the turn its term lapses. And it reports `noteEnd(false)` →
   *"has come home"*, which is a **lie**: the cart died stranded in the field.
   Fix: either let a lapsed auto-renew route renew where it stands, or say
   truthfully that the caravan was lost on the road — the user's call, and the
   sentence must stop claiming a homecoming either way.
6. **Renewal noise drowns the news.** Every renewal announces *"sets out
   again"*; fifteen routes on twenty-turn terms is about a notice a turn, and
   the log caps at a hundred. Real losses are pushed out by one's own caravans
   reporting in. Consider not announcing an uneventful renewal at all.

**The arrival plunder**, the originally-filed half: there are two ways to lose
a caravan and only one reports to the victim. A *blow*
that plunders rides `CombatOutcome.plundered`, and `reportRaids`
(`src/ui/controls.ts`) filters it by `defenderOwnerId === localPlayerId` and
announces `plunderLossSentence` — that path is right. A piece that simply
**walks onto** the cart takes it through `arrival.ts` instead: the caravan is
`removeUnit`'d, `ArrivalReport.plundered` records the *raider's* spoils, and
the only surface reading it (`controls.ts`, the arrival block) prints
`plunderSpoilsSentence` — the **plunderer's** sentence. Nothing tells the
owner, and the vanished route is never pushed to `routesEnded`, so
`reportRoutes` cannot catch it either. A caravan is a stacking-free piece
with no defence, so walking onto it is the *ordinary* way to take one: this
is the common case, not the corner. **The fix**: the victim is told on the
arrival path exactly as the combat path tells them. `TraderPlunder` carries
what the owner's client needs to name the loss (the destination cannot be
re-derived — the cart is off the board — so it is carried at settle time, as
the combat path solves it with a pre-dispatch snapshot); the arrival block
gains a victim-side announcement beside the raider-side one, seat-filtered;
`plunderLossSentence` is the one sentence for both paths. **The second fix, and the larger one**: a rival's command must run the
reporters that are already seat-filtered to the local player's own losses —
`reportRoutes` and `reportRaids` at least. `reportCommand` is the seam;
widening `commit`'s funnel wholesale is the wrong answer and would narrate a
rival's turn, which is what its docblock is guarding. Name the register of
which reporters are "about me" and which are "about my seat's doings", and
say it in a docblock so the next reporter added lands on the right side.

**Pins**: a rival declaring war on you announces the routes it killed, once
each, to their owner and to nobody else; a rival razing a city likewise; a
piece walking onto a foreign caravan announces to the owner and to the
raider, each their own sentence, and neither hears the other's; a barbarian
doing it says so too; a rival's command still narrates none of that empire's
own doings to the player; the combat path is unchanged; a replayed log is
byte-identical.

**(iiiiii) The decks rework builds on branch `decks` — D1a and D1b BUILT 2026-09-17; D2 ordered by the shape audit**
(the branch is playable: **399 order rows, 143 live**, every deferred card in the
data and the Compendium saying in plain words what it would do; both core tiers
green, typecheck and build clean. `docs/plans/decks-shape-audit.md` is the fold
of the seven deferral lists and carries the build order, ruled by the user
2026-09-17: *"lets try and get broad coverage, but leave any new mechanics that
are only needed for 1-2 cards"* — three cards or it is not built, so the
founding-trait record is cut and stays deferred. Order: **D2a** predicates ·
**D2b** counts and reach · **D2c** occasions · **D2d** the age stamp · **D2e**
the bilateral grant · **D2f** the systems. Also ruled: a once-per-empire
building is an **empire building** (the class had no player-facing name;
`oncePerEmpire` the identifier is untouched). **One finding to chase**: with the
live pool, bots stop making peace — `test/sim/aiWar.slow.test.ts` reaches a
declaration, one offer and no truce, where the same seed with an empty pool
truces and closes. Proved to be the cards, not the bot's synergy re-aim. A
balance question for the playtest, not a broken test.)

**(iiiiii, original ruling) The decks rework builds on branch `decks` — RULED, D1** (the user,
2026-09-17: *"i think at this point, we just need to playtest these. Let's
keep the old cards (dont delete them yet), but lets create a new branch for
these systems"*). The plan of record is `docs/plans/decks-rework.md`; the
design of record is `docs/six-decks-first-cut.md` (its structure, leader
pools, offer rules, reward hands and reading conventions are the rules; its
deck tables, cross-type table and generic pool are the cards). Three batches
on the branch, never on `main` until the playtest says so: **D1a** the
structure (decks on rows and leaders, the seat pool, bands gated on
government tier AND research age, universal chairs 3/4/6/9 with the sixteen
governments kept as chair counts, the rarity-first draw and its cadence,
rare-only reward hands at drafts 4/18/29, charters granted on the pick, the
old rows `retired: true` and never deleted, a schema bump that retires
saves); **D1b** the cards, one agent a deck, every row either live on an
existing shape or `deferred` in plain words — the deferred lists are the
shape audit; **D1c** the surfaces; **D2** the shapes in waves, the age stamp
first. Held out of D1: the government forms, new strategics, bot tuning,
mid-game pool expansion. (dddddd) below is superseded by this ruling.

**(dddddd) Separate decks per leader attribute — SUPERSEDED by (iiiiii)** (the user, 2026-09-15: *"i'm considering reworking the card pool such that we have separate 'decks' for different leader attributes, so each leader has two attributes and has access to two decks throughout the game … I think this gives more flexibility around designing cards and keeping them organized, and somewhat solves the problem of not rolling cards that are useful to you"*; pool expansion as play goes on deliberately deferred until this is tried). The assessment of record: the orders' `line` tag is the attribute in embryo (forge 36 · caravan 29 · procession 20 · green 17 · star 17 · court 17 · hunt 5 · charter 5 · wayfarers 3 · ploughshare 3 · tide 2 · highlands 1 · none 21, live rows), advisory today, read by no draw. **Three design points to settle before an agent flies** (the orchestrator's recommendation first, each): (1) **a common deck exists** — the `none` rows and the plain generalities belong to every seat; a seat's pool = common + its two attribute decks; ▢ or attributes only. (2) **One attribute fixed by the leader, the second chosen by the player at the first draft**, after the start is seen (a tide leader inland must not carry a dead deck for a game; the choice is turn one's decision; a third attribute at an age entry is the deferred expansion's natural shape); ▢ or both fixed on the leader row. (3) **The M/E/W spread is guaranteed**: an empty (attribute, tier, slot) cell falls back to the common deck, and a sync test pins that no attribute has an empty slot across the five tiers. Migration: consolidate the tail lines into ~eight attributes; `none` → common; a leader row carries its attribute(s); `poolOfGovernment` reads the seat's decks; held cards keep their ids (schema bump; offers already drawn are kept). Bot: its persona lean derives from its attributes; the pool reading E1a skipped (`score.poolSynergy`) returns as "cards left in my decks". Compendium: a per-deck view is a grouping of rows it already generates. **Nothing built until the user marks this up.**

**(aaaaaa) The draft pass — BUILT, B1, LANDED 2026-09-16 (the reroll reset on adoption; the meter at 12 + 5n + n^2.2; schema 118; the six-seat digest and the benchmark fixtures re-taken for the earlier drafts); parts (1) and (2) DROPPED** (2026-09-15, the user: *"ok lets drop it, just implement the things that would be relevant for a possible post-deck rework future"* — follow a line is redundant under (dddddd); 2026-09-16, the user: *"remove hold on pass, that doesn't seem like a useful mechanic. the reroll mechanic sounds good. flatter draft meter is great, we dont need to verify with a measurement, we can just use that calculated number, and i can play test to see how it feels"* — B1 builds (3) the reroll reset on adoption and (4) the meter at **costLinear 5, costExponent 2.65 → 2.2**, the pair three of four measured runs chose (26.5 drafts by turn 160 against today's 17.5, the first three drafts at turns 8 / 15 / 25 against 8 / 15 / 26), landed without the fourth run; no `followedLine`, no `heldOrder`, no draft-sheet control; the schema bump 118 stays for the reroll counter's changed rule) (the user, 2026-09-15: *"the
specificity of our cards, and how it's difficult to find the card you're
looking for with our long spans of time between drafts, and how expensive
re-rolls are"*; the diagnosis of record: 101 of the deck's ~250 effects are
flat `pays` lines, drafts are three cards off a meter whose exponent puts
late drafts decades apart, and the faith reroll compounds for life — so a
specific card is a lottery ticket and the rational pick supplements the
plan already running). Four changes to the *draw*, none to a card's text
(the card-by-card rewrite is a later pass, read against the tally, S2):
(1) **Follow a line.** `PlayerStatecraft.followedLine: OrderLine | null`
(schema 118 — S2 takes 117), written by one command `followLine {playerId,
line}` (null = follow nothing = today). While a line is followed, each
sub-bag of the M/E/W spread multiplies the weight of that line's cards by
`statecraft.lineFollowWeight` (data, ~4) — the spread holds, the line is
pulled. Changing the line **zeroes the banked skip pity** (`orderSkips`),
the one cost; a change with a hand open re-deals nothing. `explainOfferSize`
untouched. (2) **Hold on pass.** `skipOrderOffer` takes an optional
`hold: index`; the held card's id lands in `PlayerStatecraft.heldOrder`
and, at the next draft, replaces the drawn card of its own slot (spread
holds); pity still banked; a pick or a second pass without a hold clears
it. (3) **The reroll resets.** `rerollsTaken` is zeroed when a government
is adopted (the event's writer, `adoptGovernment`; an event write, no
countdown) — a fresh government arrives with a cheap reroll.
`religion.reroll` numbers unchanged. (4) **A flatter meter, measured.**
The agent measures drafts taken by turn 100 and turn 160 in a headless
six-seat game at today's `meter` (costBase 12, linear 5, exponent 2.65)
and proposes the exponent/linear pair that yields ~1.5× the drafts by
turn 160 with the early cadence kept; lands it in `data/statecraft.json`
with the measurement in the changelog, the number the user's to re-rule.
Card flats are NOT cut in this batch — the deck gets stronger by the extra
drafts, deliberately, and S2's tally is how the rewrite reads it. The bot
follows no line and holds nothing in B1 (its line choice is a row for a
later E batch, `statecraft.lineLean`, off the same pool reading as
`score.poolSynergy`). UI: the draft sheet gains the follow control (the
lines named in the describers' words, never an id) and a hold on each
card of a passed hand; the Compendium's statecraft entry states the three
rules in plain words; screenshots before/after for the user's eye.
Pins: the weighted draw with a line followed (seeded, counted over many
draws), the hold replacing its own slot, the pity zeroed on a change, the
reroll zeroed on adoption, a replayed log byte-identical.

**(bbbbbb) S2 — the lifetime tally — BUILT, 2026-09-15** (`PlayerStatecraft.yieldTallies`, one row per card per voice, written by `recordDeckTally` at the head of the yield phase from the Ledger's own per-card split, schema 117; the Ledger's third band prints per card with the fold under a rule; the score's six statecraft lines read the lifetime sum at `perDeckYield` ÷ 50 — measured over two turn-160 bot games so the lines keep V1's fifth of the score; a benched card keeps what it paid; the reading is what the Ledger printed for the turn, not what the banks credited after the phase's citizen re-seat — the one stated gap) ((yyyyy)(1) as
written: `PlayerStatecraft.tallies` per voice, one add a turn in
`collectYields` from `ledgerFold`'s statecraft class, schema 117, the
Ledger's third band prints per card, V1's six statecraft score lines read
the tally instead of the current turn). The user, 2026-09-15: *"lets get
working on each of these things"*.

**(cccccc) V1 and L1 land as reviewed** — the user's *"ok, lets get working
on each of these things"* (2026-09-15) taken as the verdict on both sheets;
wonders keep the cobalt L1 chose (gilt if the user says so later).

**(zzzzz) The bot's skill and an evolutionary tuner — RULED; E0 WRITTEN, its eight rulings TAKEN AS RECOMMENDED (the user, 2026-09-15: *"ok, lets get working on each of these things"*); E1a BUILT 2026-09-15 (twenty-odd rows at today's defaults, `data/ai.json`; the two dead dials retired; three six-seat digests byte-identical — the one move found and fixed was a floor on the tribute share against a fractional treasury; the meter floors demonstrated: a floor of fifty cuts a duel's eighteen towns at turn sixty to six; the ruled two-mix *shapes* and the persona family leans are deliberately NOT on the sheet, since they move the digest — they are the tuner's first edits when it runs; `docs/bot-priorities.md` carries the rows), E1b BUILT 2026-09-15 (`npm run evolve` → `scripts/evolve.ts` + `evolveGenome.ts`; `data/ai.bounds.json` 133 rows over 151 numeric leaves, 18 frozen by omission, sync-tested in `test/sim/aiBounds.test.ts`; `test/sim/aiDigest.slow.test.ts` pins the six-seat digest at two literals off `aiDigestHelpers.ts`, which the script's sentinel reads too; a quick generation ran end to end with the sentinel held across workers; a full generation is ~7 CPU-hours, ~50 minutes on eight workers; "How to run" in the plan; the winner is written back by hand only, and `test/sim/aiRows.test.ts`'s equal-mixes pin is re-cut with the first champion); the tuner's first RUN HELD until (dddddd) settles** (the user, 2026-09-15: *"let's hold off on tuning the bot until we settle the rework"* — E1a's rows land at today's defaults with the digests unmoved, E1b's harness lands unrun; E1a's row (ii) `score.poolSynergy` is skipped, to return after the decks)
(`docs/plans/bot-evolution.md` is the plan of record; its "What the user
must rule on" list is ruled **1–8 as recommended**, no ▢ taken.) **E1a —
the first batch of rows** (§2.8 items 1–3, every row marked NUMBER, at
today's defaults, the two dead dials retired, the personas restated as
numbers on the new rows) **plus four the user named** (2026-09-15: *"valuing
entering age 3 with the value of all the luxury resources they have,
valuing cards with the potential cards it could receive in the future,
making sure it respects the boundaries for happiness and authority, the
overall value of soldiers and army composition (archers are better on
defense, catapults only useful on the offense)"*): (i) `research.ageEntryValue`
is not flat — its reader sums the worth of the seat's *own* luxury rows
whose effects carry `fromAge` = the age being entered (silver/gold's
`perCopy` Æra III and any `fromAge` effect), scaled by the row, so a seat
holding no such luxury wants the crossing only for the flat part; (ii)
`score.poolSynergy` — a card option's worth gains a term for the cards
*still drawable* on its line from `poolOfGovernment` (forward), beside
today's `synergyBonus` (backward, held cards); (iii) `meters.happinessFloor`
/ `meters.authorityFloor` — a next town, a puppet, or an act the bot can
see would push the meter below the floor is **refused** in the chain, not
priced (today both are prices only, `weights.happiness/authority`); (iv)
`military.mix` becomes **two mixes by posture** — `mixDefend` (no campaign
planned) and `mixCampaign` (a war planned or open on the offensive), the
posture read from the war ledger/campaign plan; siege belongs to the
campaign mix only; ranged weighted to the defend mix. Every new row: a
docblock on its reader, the arena walks it with no page edit (an array is
a wholesale replace), `aiPersona.test.ts`'s pins hold or are re-cut with a
measurement, and the six-seat 120-turn digest is re-taken with the reason
(a default that reproduces today's play moves no digest — a moved digest
is a finding, printed). **E1b — the harness**: `scripts/evolve.ts` per
§3 (vite-node, `runArenaGame`, the child pool, (μ+λ) 6+12, tournament-3,
block crossover with personas whole, fitness = `foldScore` at duel 120 /
standard 100 + Opus earliness, promotion on two thirds of games, ledger
CSV + markdown + `champion.json`, write-back by hand only); the bounds
sheet `data/ai.bounds.json` sync-tested against the sheet's leaves (an
unrowed leaf frozen; `driver.*`, `search.*`, `puppetProfile`, `solvency.*`,
sentinels frozen by omission); `test/sim/aiDigest.slow.test.ts` pinning the
six-seat digest at two literals. E1b needs V1's `src/sim/score.ts` — V1
lands first.
(the user, 2026-09-15: *"I also want to make the game a lot harder, so the
skill required to beat the game can feel more pressing. Maybe we can start
by optimizing the ai, could you start a script to begin an evolutionary
improvement algorithm to improve the bot performance? And before we kick
it off, should we think more about what tunable parameters we should add
to the bot to give it more skill expression"*). **E0 is a plan document,
not code**: `docs/plans/bot-evolution.md`. (1) An audit of the bot's
decision surface — every knob in `data/ai.json` (the arena walks it), what
decision each moves, and which decisions have *no* knob at all; (2) the
strategy-level knobs that are missing and the behaviour each needs before
it can be a number — which victory shape a seat plays for and when it
commits, when expansion stops and development starts, how a technology is
valued by age, when a seat pivots to faith or to wonders, how a neighbour's
threat is read, how a war is opened and ended — each as a proposed row
with its reader; (3) the harness: a population of `data/ai.json` variants
played headless through the arena's own engine (`src/arenaPage/`, its
workers), each candidate against the current champions across several
seeds and both map sizes, fitness = V1's `foldScore` at a fixed turn plus
the Opus turn (objective, never the bot's own appraisal), selection and
mutation on the numeric rows with the persona structure kept, a
generation's cost estimated from A1's timings, results as a ledger the
user can read, and the winner written back to the sheet only by hand; (4)
the difficulty lever kept separate from the bot's skill (a handicap
sheet, later). The user marks the document up; E1 builds the harness.

**(yyyyy) Two rows V1 and L1 turned up — RULED, follow-ups.** (1) **A
lifetime tally for the deck.** Nothing in the sim records what a card has
paid since it was drafted: the Ledger's third band says so, and the score's
six statecraft lines read what the deck pays *on the turn the score is
asked*, so an empire that compounded for two hundred turns and one that
drafted the same cards last turn score alike there (V1's sacrifice). The
seam V1 names: `PlayerStatecraft.tallies` already counts a slotted card's
occasions — a per-voice lifetime figure written in `collectYields` from
`ledgerFold`'s statecraft class, one add a turn, is a schema bump (117) and
one sentence in the changelog; then the Ledger's third band prints per
card and the score reads the tally. Batch S2 when the user wants it. (2)
**The loading sheet hides a failed replay.** A save whose log the current
rules refuse (the committed 41-town fixture after the movement rulings)
leaves the sheet at "turn 4 of 121" for ever instead of the refusal's own
sentence: the worker's rejection must reach the sheet as a line and the
landing as the shelf's refusal, and the sheet must come down. A bug, R4;
pin: a log with a refused command shows the sentence and no sheet remains.
**R4 BUILT** (2026-09-15): at HEAD the hang did not reproduce — the sheet
came down within a second, which was the same bug quieter: the sentence
went to the landing's foot and the console alone. Now the sheet *turns
into* the refusal (the ruling's alternative) and stands until Back or
Escape; the paper carries the plain sentence and, in the small mono voice,
the reducer's own line with the command index; the shelf row and Continue
are marked "would not open" for the page's life (never persisted — a
future build may open it). Pins in `test/ui/loadingSheet.test.ts` and
`gameLoader.test.ts` (worker and fallback paths agree character for
character).

**(xxxxx) Founding a town lags — BUILT, R3, 2026-09-15** (measured: the founding is one drawn frame and one required static shadow bake, and the camera never moved the target or zoom; the *second* hitch was the camera's pitch ease re-facing every billboarded layer a third of a second after the click — now a turned pitch is one more staleness reason the founding's own sweep answers, `DioramaCamera.facing` = the pitch being settled on; the settle re-faces nothing; board pixels 0.000% before/after; the bake's depth draws stay the parked audit task #19; `benchWorkloads=foundTown` is the workload on the bench; pins in `test/render/paintedFounding.test.ts`; billboards now snap at the *start* of a pitch turn rather than its end — the one thing a player could notice) (the user, 2026-09-15: *"the
game tends to lag a bit when founding a new city - i think it has to do
with the new camera angle, could you take a look"*). **Measure first**: the
frame after a `foundCity` command on a developed board (the 41-town fixture
and a fresh game at turn ~30), attributed with P1's probe (`benchmarkTerrain`'s
attribution, the shadow ledger `paintedLook.shadowStats`, the layer
fingerprints): the static sun's rebake (a founding suppresses the hex's
decor and clears the ground — `suppressTile` → `invalidateShadows` — so the
8192² bake runs: how many draws, how many ms, and is it one bake or more
across the easing's frames), the city layer's first cut for the new town,
the terrace/relief cut if the hex is a hill, the ground layer (territory,
roads) rebuild for the new ring, the lens and fog, the banner, and **the
camera**: Astra's lower angle and easing (`camera3d.ts`, the design
history's 2026-09-15 entries) — does a founding move the camera, and does
each eased frame re-fit the shadows (`fitShadows` on `setDaylight`/camera)
or re-render the counter map (`counterCoverage` drift)? Then take the
dearest row in the render's discipline: a bake that runs once, not per
eased frame; the counter map's gate reading the eased camera as one move;
the founding's rebuilds coalesced to one frame; anything the camera does
that the old angle did not, made the same cost. Fidelity: the P-series pair
0.000%; a founding shot before/after identical once settled; the
attribution table before/after and a Sacrifices paragraph.

**(wwwww) The movement range ink's seams — BUILT, R2** (2026-09-15: the corners coincided to 1.8e-15; the seam was *height* — a ray at exactly a hex vertex falls through the seam between the terrain's own triangles and read the paper 0.08 below the plateau, 1.8× the ink's width, at the hub of every round join, and the two strips broke at different corners. Now the boundary edges are traced into closed rings, the ground is read once per centreline station as the highest of a five-point rosette, and each ring is extruded with bounded mitre joins — both strips from the same stations. **Sacrifices kept**: a mitred corner runs ~15 % wider than the edge and reads sharp rather than round; a turn sharper than 60° is bevelled; the ribbon is level across its width, so a ~0.0006 cross-slope tilt is gone; a crevasse a hundredth of a hex wide is bridged; a station the ground cannot answer takes the line between its neighbours rather than its tile's height.) Originally: (the user,
2026-09-15: *"the seams in the range indicator for movement is off, could
you take a look?"*). Astra's frontier ink (`src/render3d/movementBoundary.ts`,
drawn by `overlays.ts` as two on-top strips, backing and ink) reads as
separate strokes: at the corners where two edges meet the segments do not
join cleanly, and some strokes sit off the hex edge they trace. Measure
before fixing — shoot the ink with a soldier selected (the harness
`scratchpad/pw/rangeshot.mjs` does it: the End Turn blocker selects the
settler, Skip Turn, the blocker again selects the scout) and crop the
corners at 2×; then find the cause among: the corner positions computed
per cell not coinciding across the two cells that share a corner (float
drift, or the cylinder's wrap — `cellCenter` of a col-0 cell against its
col-(width−1) neighbour); the painted hex top being inset or rounded
against `VIEW3D.board.hexRadius` so the ink's corners fall off the drawn
plateau edge; the height samples at the strip's inner and outer offsets
disagreeing with the round join's centre so the join sits above or below
the strip; the two strips (backing, ink) being built with different
widths from the same samples so the backing shows through at joins; or the
overlay's `onTop` depth against the terrain relief P3/Astra's terrace and
relief cuts changed. Fix so the frontier is **one continuous line** that
follows the hex edges of the reachable set — joined corners, no gaps, no
offset — with the same two strips and the same knobs (`OVERLAY.range*`
in the sheet). Pins: every corner of the frontier is shared by exactly the
edges that meet there (a geometry test on a small reachable set: the
segment endpoints coincide within 1e-6 across cells, including across the
wrap seam), and the strip's samples at a corner equal the join's. Fidelity:
the pixel pair at play/overview unchanged with nothing selected;
before/after 2× crops of three corners for the user.

**(uuuuu) The victory screen for the Magnum Opus, and the score — BUILT, V1, LANDED 2026-09-15** (`src/sim/score.ts` `explainScore`/`foldScore`, weights in `rules.score`; `src/ui/victoryScreen.ts` on `modalShell`; standings in the dock; the six statecraft lines read the current turn until S2's tally lands)
(the user, 2026-09-15: *"we need to draft a victory screen for completing the
magnum opus, and give the player a score based on their empire results and
the yields from their deck."*). Today `closeTheGreatWork` sets `winnerId`
and `victoryModal.ts` prints an eyebrow, a headline, a bead figure and a
line. Rule: **a score is a rule-5 list** — `explainScore(state, playerId)`
in the sim (a leaf beside `ledgerFold.ts`), labelled lines a player can
check, `foldScore` its one figure, the weights in `data/rules.json`'s
`score` block, never in code: the empire's results — towns held, citizens,
technologies, wonders, beads kept, great people recruited, towns taken by
force, the age reached, and the Opus itself for its builder — and **what
the deck produced**, the Ledger's lifetime tally per voice (`ledgerFold`'s
own reading of the statecraft class over the game, the one the sheet's
third section prints), each voice weighted. The screen: a full parchment
sheet on `modalShell` (the H5 rule) that replaces the modal when the Opus
closes — the winner's figure and people at the head, the Opus named,
then **the score as its list** in the specimen's tabular columns with the
fold at the foot, a second column for every other seat's score so the
table reads as standings, and a line of what the deck paid in each voice
over the game; a `Continue playing` and a `Back to the title`. The same
sheet is reachable after the game from the dock (the standings are true
whether or not the Opus is done — `explainScore` reads any turn). A bot's
win shows the same sheet with the winner named. Pins: the list and the
fold on a fixture, the weights read from the sheet, the sheet's rows equal
the reading's lines, both journeys from the sheet, the modal replaced.
**A visual-review checkpoint for the user** — screenshot before landing.

**(vvvvv) The Ledger's colours, its name for the deck, and two more charts
— BUILT, L1, LANDED 2026-09-15** (palette `--ldg-*` in `src/style.css`, `src/ui/ledgerInk.ts`; wonders wear cobalt; the third band waits on S2) (the user, 2026-09-15: *"let's add more colors to the ledger,
'your deck' should read as statecraft, and the other colors should be
glanceable. Let's also add great people and religion to the ledger charts
at the bottom."*). `LEDGER_CLASS_NAME.deck` reads **statecraft** (the user
overrules rule 7's earlier reading: the word is on the dock already). Each
Ledger class — the land, buildings, statecraft, religion, great people,
trade, wonders, other — gets **its own ink** from one palette (a `ledger`
block in `data/view3d.json`'s UI colours or the specimen's palette file,
whichever holds the sheet's inks today), used everywhere the class appears:
the stamp column, the class chips of the second section, the third
section's rows, and the charts — a legend once at the foot. Inks chosen
against the parchment for glanceability: distinct hue per class at the
specimen's saturation, the land earthy, buildings stone, statecraft the
Order ink, religion the faith ink, great people renown's gold, trade the
route's teal, wonders the wonder stamp's colour, other the rule grey —
read the specimen (`docs/design-specimen.html`) and reuse its named inks
where one exists. The charts at the bottom: today one sparkline per voice
with the deck's share shaded; now **the deck, great people and religion
each shaded in their own ink** under the total, stacked from the axis, so
a glance says which of the three carried the voice — `LedgerSample` gains
`people` and `religion` per voice beside `deck` (the recorder in `main.ts`
samples them from `ledgerFold` like the deck), the legend names the three.
Pins: the class names, the palette has one ink per class and every class
is drawn with its own, the sample carries the three series, a chart with
all three stacks them in order. Pixel pair unchanged at play/overview
(the sheet is closed); a screenshot of the Ledger for the user's eye.

**(ttttt) A recommended site in the settler lens — BUILT, S1** (2026-09-15: `explainSite`/`foldSite` in the new leaf `sites.ts`, `rankSites` the sweep on charted foundable ground above `rules.sites.scoreFloor`, `readSites` the memo on the revision; the bot's site appraisal re-based on the same reading with `siteWorth` and the ring's weights moved from `data/ai.json` to `rules.sites` — both 120-turn digests byte-identical; a pennant atlas family (`settleMarks.ts`) drawn in the lens layer's settler branch on the top `ui.recommendedSites`, knobs on the sheet, a slider in the gallery; the card's Recommended row in plain words. **Sacrifices kept**: the arena lost two per-persona knobs (ring, weights) — one table for everyone; a radius-8 site sweep per revision while a settler is selected, the dearest reading in `readings.ts`; the marker's fold and the bot's total differ by what the bot adds for time, so the board may mark a hex the bot ranks second; `scoreFloor` 70 is a judgement nobody has playtested; the atlas grew a row.) Originally: (the user,
2026-09-15: *"could we implement a map icon for recommended city settlement
locations, like in civ? hovering over it should give some indicator (we
recommend you build a city here - access to X luxuries, the yields are
good, etc). It should only appear in the settler lens."*). The bot already
appraises sites (`src/ai/`'s expansion rows: `expansion.siteSearchRadius`,
the site's yields, luxuries, fresh water, the falloff from the capital) —
**one reading, shared**: `explainSite(state, playerId, tile)` returns a
labelled list (rule 5's shape — the luxuries it would reach, the fresh
water, the worked yields of its ring, the coast, the distance from the
nearest own town, the hills), `foldSite` its one figure, and `readSites`
the memo in `readings.ts` — the bot's own site appraisal re-based on it so
the icon and the bot agree about what a good site is (the bot's decisions
may move; digests re-taken, said so). The lens: with a settler selected
(the settler lens is what shows when a settler is selected today — the
founding preview), the top few sites in the seat's charted ground within
reach (a knob, `ui.recommendedSites` ≈ 3, and a floor on the figure) draw
a marker in the tile atlas (path data, the atlas discipline; a new mark
joins the flair gallery in the same pass) on the hex, visible only in that
lens and only where `foundingErrorAt` is null. Hovering the marker prints
the list in plain words — "A good site: three luxuries in reach (Silk,
Wine, Gems), fresh water, strong food" — through the sticky info card;
clicking it does nothing a click on the hex would not. Fog: a site is
recommended only on charted hexes and never on ones the seat cannot see
the yields of (rule 5's ctx). Pins: the reading's list, the fold, the memo
on the revision, the lens shows the marker only with a settler selected,
the words print, no marker on an unfoundable hex; the P-series pixel pair
unchanged at turn one with nothing selected. The bot's arena averages
before/after in the report if its appraisal was re-based.

**(sssss) Combat odds at a distance — BUILT, U1** (2026-09-15: `combatForecast` asks the real hex first and, refused, a comparison — `standToStrike` picks the hex the piece could stand on beside the target, a sword the strongest stance, a bow the nearest in range, and `planCombat` prices from a copy standing there under a `CombatStance`, every clause but the two readiness ones still asked; the reducer passes no stance. The card wears a dashed hairline and says "Out of reach — a comparison"; six pins. **Sacrifices kept**: the comparison assumes a hex the piece may never reach and says not how far; the hex is the interface's choice; a hover costs up to six previews for a sword and nineteen for a bow; a spent piece shows odds instead of its refusal.) Originally: (the user,
2026-09-15: *"the unit overview should show the combat odds regardless of
movement/adjacency, players need a way to compare strength without
marching their units into combat."*). Today the forecast — both sides'
strength and the damage each would take, `planCombat`'s own reading — shows
only when a selected piece hovers an enemy it could strike this turn
(adjacent, or in range, with movement). Rule: with a piece selected, hovering
**any** enemy piece or town in sight shows the same forecast as if the two
were adjacent on the target's own hex — the ground the target stands on,
its fortification, the general's aura, the waterline's refusals printed as
refusals, with a plain line saying it is a comparison and not an order
("out of reach — a comparison"); the right-click still refuses what
`attackError` refuses. One reading (`forecastAt` or its existing name in
`src/ui/controls.ts`), the card's tint says which. Pins in `test/ui/`: a
forecast for an enemy three hexes off equals the forecast the same pair
would get adjacent, less nothing; the order is still refused; the line
prints. Built as `combatForecast` widened (`CombatReading`) over a
`CombatStance` on `previewCombat` — the hex is chosen by `standToStrike`
beside it: the strongest standable hex for a sword, the nearest hex in range
for a bow, and "nowhere to stand beside it" where there is none. The fog is
the one refusal a comparison does not get past. `docs/units.md` carries it.

**(qqqqq) The culture and great-person ladders climb a fifth slower — BUILT**
(the user, 2026-09-15: *"tune down the scaling of the culture tiers and the
great people tiers by ~20% (the initial values are fine, but they get
expensive too quickly)"*). Both ladders are `base + linear·n + n^exponent`
with the same shape; the bases stay (culture 12, renown 75) and the two
growth terms move: culture `costLinear` 6 → 5 and `costExponent` 2.8 → 2.65
(the fifth draft −18 %, the tenth −28 %); renown `linear` 225 → 180 and
`exponent` 2.8 → 2.65 (the third person −18 %, the sixth −19 %). The README
and `docs/great-people.md` follow; the one literal pin re-taken.

**(ppppp) A seat is named by its figure — BUILT, N1** (2026-09-15: `seatName`/`seatPeople` in `leaderData.ts`, `LeaderDef.people` on every row and in the doc's table ("people", not "civ"), every print site through the one reading and a source sweep pinning it; the setup swatches and a leaderless save's shelf label keep the ink's name by design. **Two follow-up rows**: the sim's own refusals about your own empire — `purchase.ts`, `religion.ts`, `tech.ts`, `greatPeople.ts`, `discoveries.ts`, `statecraft/draft.ts` — still say "Crimson has 40 gold", matched literally by two mirrors in `wants.ts`; and the diplomacy feed's possessives read "the Inca' paper" — a people word wants a different sentence shape.) Originally: (the user, 2026-09-15:
*"players should be identified by their leader choice - let's retire the
color naming scheme unless the user has selected no leader"*). Today a seat
is "Crimson" or "Teal" — its ink's name, from `src/ui/gameSetup.ts`'s
`SEATS` — on the top bar, the banners, the diplomacy sheet, the capture
and war sentences, the turn card, the spectator feed and the Abacus, and
the figure is a second line beside it. Rule: **a seat that has a figure is
called by the figure** — "Pachacuti", "Modu Chanyu", "Joan of Arc" — and
its empire by the figure's people where a sentence wants a nation ("the
Inca", `LeaderDef`'s civilisation word; the doc's "The thirteen" table
carries it); a seat with **no figure keeps the ink's name** as today, so
the scheme is retired, not deleted. One reading (`seatName(state, id)` /
`seatPeople` beside it, in the sim's `leaderData.ts` or a leaf the UI and
the AI's feed both import), every surface through it — nothing prints
`player.name` for a figured seat, pinned by a source sweep like
`test/ui/seatRoster.test.ts`'s. `Player.name` stays what the config wrote
(a save's own words; the ink's name is still what the setup screen shows
in the colour swatch). Bot seats draw their figure at setup as they do
today, so every bot is named. Two figures on one board are refused at setup
already (one figure a seat), so names are unique. Docs: the README's UI
paragraph; the changelog says no state moved.

**(ooooo) Passing, swapping, and no toll from a friend — BUILT, M1** (2026-09-15: `TransitField` classifies a piece as a foreign town, a hostile soldier, a hostile civilian or a peaceful piece, once for the hoisted sweep and the fallback walk; `canTransit` refuses only the hostile soldier, `canStopOn` refuses resting on a peaceful piece; `zocField` counts only seats at war — pieces, towns and the Great Wall's borders; `planSwap` is the one reading of a swap, asked by the highlight and the reducer, and `swapPlaces` walks the mover then the sitter through `advanceAlongPath`, both arrivals through `arriveOnTile`; a `moveUnit` onto the friend's hex is the whole order, schema 116, the changelog saying a stored march now walks under the new rules; the info card prints "Swap with Spearman", the swap hex wearing the ordinary move tint until a tint of its own exists (U1's row). The bots take different roads: both 120-turn digests and the ranged-board pins re-taken with the measured reason. **Sacrifices kept**: a neighbour's column no longer corks a pass and its picket costs nothing until a declaration — the Great Wall buys nothing at peace; a swap spends both pieces' turns, breaks both trenches and drops the sitter's standing order, with the card's line the whole warning; a swap is never a standing order; `reachableTiles` may run one A* per own-soldier hex in the highlight; `walkFitsThisTurn` is a fifth reader of `stepCost`. **For W1**: the bots inherit the pass and the free picket through `canTransit`/`canStopOn` but cannot see the swap — `wants.ts`'s step-the-garrison-aside search is the case it would solve.) Originally: (the
user, 2026-09-15: *"units should be able to 'move past' units that are
blocking them if they have enough movement (i.e. the unit has enough
movement to get to a tile as if the unit blocking wasn't there), this
should apply only on civs you're not at war with. Units should not exert
ZOC if you're not at war with them. Moving a military unit onto another
should 'swap' the two unit's positions if they both have enough movement
to reach the swapped destination tile."*). Three rules, one batch, all in
`stepCost`'s discipline (the four readers — `findPath`, `reachableTiles`,
`advanceAlongPath`, `pathTurns` — price alike, or a highlight lies):
1. **A friend's piece is not a wall.** A hex holding a piece of a seat this
   empire is **not at war with** (own pieces included) may be *passed
   through* on the way to a further hex — `canTransit` admits it, `canStopOn`
   still refuses it — exactly as a road through a town is walked, so a
   column two deep in a pass no longer blocks the road. A hostile piece
   blocks as it always did. The path's cost is the ground's; the pass costs
   nothing extra. A move that would *end* on a friend's hex is refused as
   before — unless rule 3 applies.
2. **Zone of control is a war toll.** `zocField` counts only pieces of seats
   this empire is at war with (the wild included); a neighbour at peace
   exerts none. `zocExtraCost` and the highlight read the same field.
3. **The swap.** A military piece ordered onto a hex holding one of **its
   own seat's** military pieces (never a civilian, never another seat's)
   swaps the two: the mover walks its path and the sitter walks the reverse,
   and the order is accepted only if **both** have the movement to make
   their whole walk this turn (each priced through `stepCost`, the sitter's
   from its own hex to the mover's origin along the reverse of the path).
   One command (`moveUnit` with the friendly hex as its target, or a
   `swapUnits` command if the reducer's shape needs it — the validate-fully
   rule holds: refused, the state is byte-identical), both arrivals through
   `arriveOnTile`, both pieces' movement spent, both wake. The highlight
   shows the swap hex as reachable in its own tint and the info card says
   "swap with Warrior". The bot may use it or ignore it; the bot's decisions
   must stay deterministic and the 120-turn digests are re-taken if they
   move (a bot that now passes a friend takes a different road — that is
   allowed, and said in the changelog). Schema: a v116 log replays unless
   it contains a move the old rule refused (none can), so the schema stays
   116 unless a new command is added — then 117, with the changelog's
   sentence. Pins: pass-through at peace, wall at war, no ZOC at peace, the
   swap accepted with both fed and refused with either short, civilians
   never swapped, another seat never swapped, the highlight and the
   reducer agreeing hex for hex (`reachableTiles` = the set of accepted
   moves).

**(nnnnn) The bots' wars — BUILT** (the user, 2026-09-15:
*"the ai is probably too agressive in going to war, how is it valuing the
decision to war right now?"* and, in a game where every bot but one had
declared on them: *"they are just sending massive hordes of army lmao.
their ai is honestly not great right now either, so i feel like i'm playing
a wave defense game. We should really tune it's propensity to throw units
into mine and how aggressively it decides to declare war."*). Two halves,
one batch, **measure first** on the user's shape — a six-seat standard
game with seat 0 held passive (defending, never declaring) for a hundred
turns at three seeds — and report before changing anything: how many
seats declared on seat 0 and on what turn, the army ratio each declared
at, and the exchange each war produced (bot pieces lost against seat 0's
pieces lost, and against seat 0's towns taken). **The declaration**
(`src/ai/diplomacy.ts`, the five clauses): the ratio counts **fielded**
strength — pieces spare of the garrisons every town is owed, the strike
force's own reading — not the whole roster; a term for what the war would
cost, the nearest target town's own strength (`cityBaseStrength` plus its
walls and hill) and the road's length, against the force that would walk
it; **no second war while one runs** unless the advantage is overwhelming
(a second bar, in the sheet); and a dogpile check — a target already at
war with two or more seats is not a cheaper target, it is the same target,
so the appetite does not read their other wars as weakness. The persona
bars in `data/ai.json` are then retuned so that, on the measured shape,
at most one or two seats declare on a passive seat 0 by turn 100 and none
before its army is real. **The conduct** (`src/ai/bot.ts`'s attack and
campaign rows, `src/ai/campaign.ts`): a bot strikes only when the forecast
is favourable — the damage it would deal against the damage it would take,
through `planCombat`'s own forecast, with a knob for the margin; a hurt
piece falls back and heals rather than presses; a column masses to its
strike force before it walks in rather than arriving one piece a turn; and
a fortified piece on a hill or in a town is not attacked by melee at a
loss — ranged and siege go first or it waits. Every clause is a printed
term on the spectator feed, every number a sheet knob (the arena walks the
sheet). **Fidelity is the arena**: the bot must still win its own games —
`arena.html`'s five-game average per seat before and after, and the
determinism digest unchanged where no decision is meant to change (the
opening, the builds). Report the measured shape before/after and a
Sacrifices paragraph. Waits for A1 (the AI performance pass) to land, since
both are in `src/ai/`. **Addendum, the peace** (the user, 2026-09-15: *"the
ai should have some idea of how many units it's lost to you vs how many
it's killed, and factor that into it's decision for peace."*): a bot keeps
the **exchange** of each war it is in — pieces it has lost to that enemy
against pieces it has killed of theirs, since the war began, plus towns
taken each way (`explainWarScore` already folds losses and towns, but as
career totals; the per-war, since-declaration reading is what a peace
decision needs, and `Player.triumphs`/the combat reports are where the
counts already come from) — and **sues for peace** when the exchange has
run against it past a knob (`war.peaceExchange`, the ratio of its losses
to its kills that makes it ask) and its army advantage no longer clears
the declaration bar, and **accepts** a peace offered when the exchange is
against it or its advantage is gone; it declines peace while it is winning
the exchange. Printed terms on the spectator feed; the persona bars keep
their say (a warmonger asks later). Pinned: a war with a bad exchange
proposes peace; a war with a good one declines it.

**Built**, and the whole of it —
measurement, clauses, knobs and what was sacrificed — is
`docs/war-diplomacy.md` §14. The one thing the measurement changed about the
ruling: **the persona bars are untouched**, because on the measured shape no
peaceful persona ever cleared its bar in three games and every declaration in
the three came from the warmonger, four of them in a single turn — so what
was declaring too much was one seat opening four wars at once, which is
`war.secondWarMultiple`'s, not a bar's. **The addendum's peace** is built with
it: the per-war exchange is `src/ai/warLedger.ts` — the simulation's own
`unitsKilled`/`unitsLost` windowed from the declaration by a `WeakMap` on the
live state, the refusal memory's own bargain, so no schema moves — read by
`explainStanding` and spent in three printed clauses (sue on
`war.peaceExchange` **and** a lost advantage, take an offered peace when either
is true, send the envoy home while the exchange runs its way). If the exchange
is ever wanted as a fact of the world, the field to propose is a pair of
counters on `WarState`, which is `src/sim/`'s to add.

**(mmmmm) Soldiers cost half again; hills are worth two — BUILT** (the
user, 2026-09-15: *"military units need to be ~50% more expensive"* and
*"hills should only give +2 combat strength"*). `rules.production
.militaryPercent` (50) is one line over the sized-and-columned figure,
`Soldier +50%`, pushed in `unitRosterLines` for every unit that is not a
civilian — so the worker beside the warrior and the trader beside the
catapult pay nothing more, and the Compendium's empire-free reading and the
city's fold agree; the settler's ladder and the empire's lines compose on
top as before. `docs/production-costs.md`'s unit rows and `docs/units.md`'s
roster are re-printed. Hills' `defenseBonus` is 2 (was 6) in
`data/terrain.json`; the combat pins re-taken with the arithmetic.

**(lllll) An empire rite pays every chapel — BUILT** (the user, 2026-09-15:
*"are chapels correctly getting the +5 culture from an empire-wide rite by
the prophet?"* — they were not). `empireRiteAt` stamped the rite on every
town and paid none; a chapel's `ritePays` was read only by the city rite.
Now each town the empire rite lands on pays its chapel through the same
`payRiteBuildings` seam and `settleCultureWindfall`, once per town, and the
report carries `chapelCulture` summed. Pinned in `test/sim/religion.test.ts`.

**(kkkkk) Joan's Voices reach four hexes — BUILT** (the user, 2026-09-15:
*"lets update joan of arc, unit kills should convert cities within 4
tiles"*; on the question of whether the lump grows too: *"Range 4, same
lump"*). The kill's press keeps its fifteen pressure — one citizen turns
per town per kill, a temple holding its share — and lands on every town
within **four** hexes of the field instead of two: `data/leaders.json`
`pressure.range`, the doc's row follows. No new shape.

**(jjjjj) The AI turn feels slow — BUILT, A1** (2026-09-15: one End Turn is 90 % the bots' decisions, 10 % resolution, and a bot's command reaches no repaint — at the same seed and turns the press costs *less* under the painted default than under `?art=toon3d`, so the renderer is not the cause. `TransitField` sweeps a byte a hex once per search in place of two linear walks per edge; `resourceCopies` reads off the slate. The press 2.08 → 1.76 s on the 41-town fixture, turns 101–120 of a six-seat game 2.6 → 1.5 s a turn, the 120-turn digests identical at two seeds. **Sacrifices kept**: a per-search byte-per-tile allocation (~1.3 MB of short-lived garbage a press, dearer than the walks on an empty board); a `TransitField` must never outlive the search that swept it; a new writer that changes what an empire holds must announce on the economy clock or `resourceCopies` goes stale — the hand-writing tests were taught to announce. **Still standing**: the appraisal asks `explainCity` per candidate rather than reading `readCity` once, ~14 % of the press.) Originally: (the user, 2026-09-15:
*"could you do a performance pass on the ai - its starting to feel slow, i
wonder if anything changed due to the new renderer"*). **Measure first**,
on the 41-town fixture (`docs/plans/benchmarks/fixtures/standard-t120-s1`)
and on a fresh six-seat game driven ~80 turns: the wall time of one End
Turn as the player experiences it, attributed to (a) the bots' decisions
(`src/ai/` — per seat, per phase: wants, appraisal, the per-unit plan, and
the pathfinding inside them, `findPath`/`reachableTiles`/`pathTurns` call
counts and ms), (b) the turn resolution phases (`src/sim/turn.ts`), and
(c) the UI and renderer work the bots' commands trigger on the main thread
— every accepted bot command calls `onChanged` → `updatePanel` (a DOM
repaint) and marks the renderer dirty (`syncStateLayers` on the next
frame) — under the painted look **and** under `?art=toon3d`, so the
renderer question is answered by a paired number, not a guess. Then take
the dearest rows in the sim's discipline: the pathfinder hoists T1 named
(`hasForeignUnit` and `cityAt` are linear walks of 273 units and 41 towns
per edge inside `canTransit`, in every A* in the game — hoist per search,
`zocField`'s bargain, lifetime one search); the bots' own memos keyed on
the revision; and the UI repaint coalesced to once per bot seat or once per
turn rather than once per command, if (c) is a real share. **Fidelity is
determinism**: a 120-turn six-seat bot game replays to the same snapshot
digest before and after (the bots must decide identically — a hoist may
change nothing but time), plus the P-series pixel pair. Report the
attribution table before/after and a Sacrifices paragraph.

**(iiiii) Four rulings from the Modu Chanyu playtest — BUILT** (the user,
2026-09-15: *"marco polo needs a nerf: make it every 5 tiles instead.
terraced hillsides needs a nerf, should read: +2 food on farms on hills.
Let's buff taizon, +3 combat strength on melee instead of the combat bonus
before, keep the additional movement the same. we can also make the new
lighting/renderer the default, set to the day lighting."*). Marco Polo's
legacy pays +1 gold per **5** hexes of route (was 2) — `data/greatPeople.json`
`per`, the doc's row follows. Terraced Hillsides pays +2 food on a **farm on
a hill** (was every hill hex): the hex clause is `all` of the `improvement:
farm` test (so a terrace counts) and `hills` — `data/statecraft.json`, the
doc's row follows. Taizong's Mandate: melee **+3** combat strength (was +1),
+1 movement unchanged — `data/leaders.json`, `docs/leaders.md`'s row follows.
**The painted look is the default renderer, opening at day** — `artMode()` in
`src/main.ts` returns `painted` unless `?art=toon3d` (or `sprites`/`flat`),
and the daylight preset reads `?light=` else `day`; the harness scripts that
name `?art=painted&light=golden` are unaffected, and every fidelity pair in
the P-series was taken under golden, so a future pair should say which.

**(hhhhh) The save format stays {config, log} — PARKED** (the user,
2026-09-15, on the replay cost of loading: *"Lets keep the current save
format for now."*). The hybrid — config, log and a snapshot of the final
state, snapshot-first load with the replay verified off the critical path
and the shelf in IndexedDB — is written up in the session of 2026-09-15
and costs a day when wanted; replay is roughly half of a developed load's
wait after P7 moved it off the main thread.

**(ggggg) Only an original capital is unrazeable — BUILT** (the user,
2026-09-15: *"the game should allow razing cities that aren't original
capitals, not allowing capitals in general basically prevents razing if
you're capturing cities in a specific order."*). The orchestrator's default
of 2026-09-03 — capitals are never razeable — was read through
`City.wasCapital`, written whenever the loser's *current* capital fell, and
since `capitalCityOf` re-seats the moment a palace is taken, a warlord
taking an empire's towns in order found every one of them a capital on the
day it fell. Now `City.originalCapital` is written once at founding on an
empire's first town and never cleared, razing refuses that and the razer's
own current seat, and nothing else; `wasCapital` stays for the
`capitalCaptured` bead, which still pays on a re-seated capital. No new
command; a v116 log replays byte for byte (a raze the old rule refused was
never in a log). Pinned in `test/sim/war.test.ts`: two rival towns fall in
order, the first cannot burn and the second can.

**(fffff) The trade route screen is slow again — BUILT, T1** (2026-09-15: open 553 → 182 ms, repaint 1,399 → 497 ms on the 41-town fixture; 74 rows identical, pixels identical. The memo already hit and the DOM was 1.5 ms of it — 90 % was `findPath`, asked three times a pair; now one gate a pair (`explainRouteGates`) and a foreign no-path answers its remaining doorsteps by lookup (`findPathToFirst`). **Follow-up row, M-series**: `hasForeignUnit` and `cityAt` are linear walks inside `canTransit` in every A* in the game — hoisting them per search is `zocField`'s bargain and would speed every bot turn and move highlight.) Originally: (the user,
2026-09-15, turn 99 as Modu Chanyu: *"Could you do a performance pass on
the trade route screen? it seems to be slow again"*). Measure first on a
developed fixture (`docs/plans/benchmarks/fixtures/standard-t120-s1`, 41
towns, or the user's own turn-99 shape: many towns, several traders, the
screen opened from the dock and refreshed per command): where the time
goes when the screen opens and when it repaints — `readRoutes`'s memo
(`src/sim/readings.ts`), the per-pair `explainRouteYieldBetween` /
`explainRouteSenderYieldBetween` folds (`routeYields.ts`), route reach
(pathfinding per origin × destination), `explainRouteSlots`, and the DOM
build in `src/ui/tradeScreen.ts`/`tradeLines.ts`. Then take the dearest
rows: nothing recomputed that the revision did not move (the E3 memo
discipline — a `readX` keyed on the revision in `readings.ts` alone), pair
folds asked once per pair per revision, reach computed once per origin,
the DOM patched rather than rebuilt where the list is unchanged. **Fidelity
here is the screen's content**: every route row's figures, order and words
identical before and after on the fixture (a serialised-DOM or per-row
figure comparison), plus the P-series' pixel pair at play/overview
(0.000%). Report open time and per-command repaint time before/after,
and a Sacrifices paragraph.

**(ccccc) Two Terraces rulings from the Pachacuti playtest** (the user,
2026-09-14: *"farms are colliding with the city border, we should have them
sit under. Also, let's have terrace farms only be able to be built on
hills."*). **Terraces on hills only — BUILT** (schema unchanged: the row
gains `requiresHills: true` with no waiver; the `mountainFoot` seam stays and
forgives only the *water*, so a dry hillside at a peak's foot takes one and
the flat valley floor beneath the same peak takes a farm's rules; pinned in
`test/sim/leaderGround.test.ts`, `docs/leaders.md` follows). **Farms sit
under the border ink — BUILDING, R1**: under the painted look a field's
furrows and patch draw *over* the territory ribbon where a farmed hex meets
the empire's edge; the ink is the map's top layer on the ground and the
fields belong beneath it, so the works layer's field patches render under
the ground layer's territory ink (draw order / depth offset, whichever the
two layers already use — the user sees no farm stroke crossing a border).
Fidelity gate as the P-series: before/after shots at play and overview
differ **only** along farmed border edges, every region explained; a
farmed-border close-up pair for the user's eye.

**(eeeee) A loading sheet for Continue — BUILDING, with P7** (the user,
2026-09-14: *"we need a 'loading game...' modal that shows progress for
continuing a previous save, right now this only exists for starting a new
game."*). Today a new game shows the terrain worker's progress (the
`terrainBuildProgress` sheet from `beginGame`) and a loaded save shows only
the pressed button's label while the log replays. **P7 moved the replay
into a worker** (audit #22) — so the load journey has two staged workers in
a row and both can report. Rule: one loading sheet for both journeys,
shown from the press until the board is on screen, with the stages named in
a first-time player's words and a progress bar that moves — for a save:
*Opening the save · Replaying the game (turn N of M) · Painting the world ·
Placing the pieces*; for a new world the first two are absent. The replay
worker posts progress as it walks the log (per turn, not per command);
the terrain worker's existing progress feeds the third stage; the fourth is
`setGameState` and the first frame. The sheet is a `modalShell` sheet by
the H5 rule, wears `.statecraft-overlay`, and stays up until
`first-board-frame` (P1's mark) so "playable" is never a blank board. No
Cancel yet (P7's sacrifice #3 stands; ▢ the user). Fidelity: the settled
frame is untouched — a pixel-identical play/overview pair.

**(ddddd) The shadowed fog lands — LANDED 2026-09-15** (the user, on the review pair: *"great - it looks much better. Please proceed."*) (the user, 2026-09-14: *"please
also queue up the shadowed fog implementation, i'll let you sequence before
or after the fog performance pass"*). Sequenced **after P5** (the shadows
batch in flight), because the study's second pass on branch `fog-study` is
built on a snapshot from before P2 and P5 and touches the same sun and
shadow-map code — reconciling once, against the tree with both landed, is
one merge instead of two. The ruling is (zzzz) below: reconcile the
uncommitted second pass with main, delete the drawn and bleed treatments,
`treatment` stops being a knob, fix the paper's sun tint, take audit #2
(a fog texel change rebuilds five layers) with it, and `docs/plans/
painted-fog-study.md` becomes the record. A visual-review checkpoint for
the user before it lands — it is the look of half the map.
**F1 built it** (2026-09-15): remembered ground keeps its pigment and its
geometry and sits in shadow; uncharted ground is the chart table, a lit
paper plane at the ground datum that takes the relief's cast shadows and
rules its own hexes, and takes the sun's shadow but **not its colour** (the
peach page is fixed by folding the light to one luminance before it touches
the page); the reveal eases over `revealMs` off an absolute stamp. Audit
finding 2's fog half is held by test: a remembered ⇄ visible change is a
light-texture write — no batch visibility, no geometry, no rebake — and
only a hex crossing out of the dark costs one bake, as it did before.
The drawn and bleed treatments, the old painted wash and the `treatment`
knob are deleted; `data/view3d.json`'s `painted.fog` group is the whole of
what is left, registered by `paintedKnobs`. Fidelity: the omniscient board
is pixel-identical (0.000% of the frame); watched ground is identical
beyond a quarter-hex of a sight frontier (0.000%), and inside that band
0.19% of watched pixels at play and 0.64% after a march — the soft light
edge the ruling asks for. Fogged ground differs by design: 1.4% of the play
frame, 12.4% after a march. Review images: `.claude/scratch/f1/`.


**(aaaaa) The painted renderer's performance pass — RULED, P-series** (the
user, 2026-09-14: *"i've had astra also document what it thinks are the
biggest performance improvements, could you read over the doc (now in main)
and delegate subagents to handle each? Please verify they don't change the
existing visual fidelity and note any sacrifices that have to be made to
functionality before folding them in."*). The spec is
`docs/plans/painted-performance-audit.md` — the original findings 1–16 as
reconciled against the integrated renderer (`70ff850`) in its "Integration
reconciliation" section, plus the additional tasks 17–24 and the revised
delegation order there. **Two waves, each batch on its own fence off the
reconciled main** (Astra's `70ff850` merged with L7 and the generals' data):
**wave 1** — P1 the measurement harness (#24 GPU/CPU attribution and stress
fixtures, #23 startup stage markers; evidence only, no runtime change); P2
the local fixes (#17 the shadow toggle without a terrain rebuild, corrected
#1 the counter-shadow gate including resting units, #11 the walker layer set
once, #16 the painted knobs into `data/view3d.json`); P3 the developed-map
caches (#5 city recipes keyed on the city's look with the local surface
sampler, #6 the ground layer's incremental batches); P4 startup assets (#20
GLB processing moved to a build script with a manifest, #8 parallel asset
loads, #9 the grain textures as one channel — pixel identity required);
**wave 2**, after wave 1 lands and P1's numbers exist — P5 the shadows (#3
one-period fit and #19 exploration's global bake split from colour LOD); P6
overview LOD (#18, one distant prop family; **a visual-review checkpoint
for the user**, since it changes what the far view draws); P7 startup
caching or replay-in-a-worker (#21/#22, whichever P1's stage markers say).
**The fidelity gate, every batch**: before/after screenshots of the same
seeded game at play and overview through the headless harness
(`scratchpad/pw/gameshot.mjs`, `?art=painted&light=golden`, same camera),
pixel-diffed (`pixdiff.mjs`, threshold 0.08) — **≤ 0.5% differing pixels**
or the batch explains every differing region; the agent's own before/after
measurement on one named workload; and a **"sacrifices"** paragraph in its
report naming any behaviour that changed (a stale shadow case, a picking
edge, a dropped bump map) — the orchestrator folds nothing in without it,
and anything visual waits for the user's eye. Every batch: typecheck,
`test/render` + its own pins green; the orchestrator's full gate at landing.
**Landed — P4** (2026-09-14): the three grains ship as their red channel and
upload one-channel, the nine vegetation GLBs bake at build time into one
bundle (`scripts/terrain-study/build_asset_bundle.mjs`; the GLB path stays
as the fallback), and the grain, vegetation and settlement requests run
together. Asset phase 345 → 116 ms cold on localhost; board pixels
identical at play and overview. **Sacrifices kept**: an edited GLB or grain
needs its build script re-run — a forgotten one fails core
(`test/render/paintedAssetSync.test.ts`), and the authored RGB grains now
live in `scripts/terrain-study/grain-source/`, not `public/`; the
terrain-study page still uploads the grains four-channel (renders the same,
keeps none of the VRAM saving) — a three-line follow-up in
`src/terrainStudy/main.js`. **Landed — P2** (2026-09-14): the shadow toggle writes the flag over the
painted board (6.7 s → 0.1 s warm; the first toggle of a session still
pays shader compilation), the counter shadow map renders only on a seam
(a walker in flight, a piece appearing or moving, a faller, the sun
turning, the view drifting past the lesser of `counterCoverage` and the
window's real spare margin — lossless at every aspect ratio), walkers take
their layer once, and every painted literal reads `data/view3d.json`'s
`painted` block. Pixels identical at play, overview and every toggle stop.
**Sacrifices kept**: hovering a unit does not re-render the counter map
(the hover shell casts nothing); a future caster on layer 2 that bypasses
`rebuildUnits` must call `invalidateDynamicShadows` (a source register
test says which seams do); the stats line's board-build figure no longer
includes the toggle. **Follow-up row**: roads, borders and site props
keep their build-time shadow flags across a shadow toggle (pre-existing;
visible only when a game starts with shadows off and turns them on).
**Landed — P3** (2026-09-14): the city layer keeps each town's cut
(keyed on every `CityLook` fact but the two banner-only ones) and the
ground layer keeps each region's merged buffer; per fog move on a 41-town
standard fixture, 80 ms → under 1 ms; every instance matrix and vertex
identical, pixels identical. **Sacrifices kept**: resident memory for the
kept cuts (small beside the board); a town's heights read its own hex's
triangles, so a thing overhanging a city hex no longer lifts its floor
(judged correct — the works and sites already read this way); the
remembered wash is a vertex attribute on the one ground material, so each
region is one draw; a caller that mutated a plan object in place would
render stale ink (nothing does; the docblock says so).
**Landed — P1** (2026-09-14): the evidence harness — a GPU timer probe,
per-frame attribution (preparation vs submission), five reducer-driven
workloads, eight startup marks in `main.ts`, three bot-played fixtures
(`docs/plans/benchmarks/fixtures/`), `scripts/terrain-study/check-painted.mjs`.
The record is `docs/plans/painted-performance-evidence.md`. **What it
found**, for the waves in flight and after: replay of a developed save
blocks the main thread ~20 s before the renderer is asked for anything
(P7's #22); "playable" precedes the first drawn frame by ~22 s in one
long task on the software rasteriser — shader compilation, upload and the
first static bake — on a new world too (~14 s), and **nobody's task yet**;
the static sun's 8192² target is 512 MiB, 2.4× the board's geometry (P5's
#3); a unit step on a 41-town map cost 53–184 ms of `setGameState` layer
rebuilds before P3 landed (P3 measured its five layers at 80 → 1 ms on the
same fixture; the remainder is the units and fog layers, unmeasured since);
and a real scout march charted twenty cells with zero static rebakes while
an end-turn refresh baked once — the opposite of #19's source reading, so
P5 measures before it acts. Nothing visual changed (evidence only).
**Landed — P5** (2026-09-14): the static bake's near geometry is raised
around the sun's depth submission alone (`PaintedBoard.setBakeDetail`,
inside `separatePaintedShadows`' try/finally), so an overview reveal keeps
its far colour LOD — the bake frame's colour half is now exactly the quiet
frame's (1204 → 840 draws on a fully charted board); a per-pass ledger
(`paintedLook.shadowStats`) says what the depth pass costs on its own.
Four pairs at 0.000%. **#3 not taken, with numbers**: the depth pass is
three-quarters of a reveal frame (2716 draws ≈ 905 × three wrap copies),
and a canonical-period fit is a real 3× cut, but it needs the shadow lookup
wrapped in every receiving material's shader with a sheared UV offset and a
per-copy depth offset — surgery on the approved look with seam risk and no
visual checkpoint; incremental baking is only half-correct (suppression
removes casters); 8192 → 4096 is a fidelity call, not a cost one (the pass
is draw-bound). Queued as **P11** in wave 3 with a user eye on seam shadows.
**Sacrifices kept**: `updateDetail` takes only `pixels` now (a caller that
wants near geometry for a bake calls `setBakeDetail`, and must pair it with
`false`); the one-frame detail pop on a reveal is gone by design; the hook
is bound to one board and rebinds in `rebuildBoard` alone. Two rows for
later: the first frame with a walking piece spends ~1.7 s compiling the
walker's depth program (P8's list), and the bake count climbs across
restarts in one tab (something does not reset with the board — P9).
**Landed — R1** (2026-09-14, (ccccc)): the ground ink takes a polygon
offset one rank deeper than every other ground decal, so the border ribbon
and roads draw over a farm's furrows; town and great-person ground pigment
go under the ink too (same class, same step), a farmed frontier hex loses
a thin strip of crop beneath the ribbon, and a plinth base directly under
a ribbon could in theory lose its bottom row of pixels (not reproduced).
**Landed — P7** (2026-09-14, and (eeeee) with it): replay dominated
(3.9 s of blocked main thread on a developed save against 6 ms to hand the
result across a worker), so `newGame` and the log walk run in
`src/ui/game.worker.ts` through `src/ui/gameLoader.ts`; the main thread
blocks ~7 ms on a load instead of seconds; the state is byte-identical to
the synchronous path (pinned both in-process and through the real
`postMessage` seam) and refusals match character for character. The
**loading sheet** (`src/ui/loadingSheet.ts`) covers both journeys from the
press until a frame has been presented: Opening the save · Replaying the
game (turn N of M, reported per turn by a `ReplayWatcher` on the one
walk) · Painting the world (the terrain worker's progress) · Placing the
pieces; a new world shows the last two. #21 (terrain caching) **not
taken, with numbers**: the 6–12 s rebuild is already off-thread and costs
the main thread 34–157 ms, so a cache buys wall time, not responsiveness,
and needs an IndexedDB round-trip measurement first — queued in wave 3 as
part of P8's startup work. **Sacrifices kept**: a load's wall clock is
+145–730 ms for the worker crossing; one idle worker holding the sim
module graph lives for the page (spun up on the landing so a load never
fills a cold one); no Cancel and no replay timeout (a hung worker hangs
the load where before it hung the tab); a broken save shows the busy
label before its sentence; the shelf takes one load at a time; the sheet
cannot be dismissed and is never disposed (pinned out of the register on
purpose); "of M" reads the shelf label, display-only; on the synchronous
fallback the bar does not move; the last stage is a proxy (terrain 100%
to two frames past `hideLanding`), not `setGameState` itself; the saves
panel's route shows the sheet in two halves around "Abandon the game in
progress?". P1's `first-board-frame` mark is the one that survived (it
fires inside `boot`, earlier than the sheet's own seam).
**Landed — P6** (2026-09-14, the user's eye: *"yeah this is fine, lets
send it"*): the attribution said groves were a third of a fully revealed
overview's triangles (980k of 3.0M) and escarpments a fifth of that, so
the groves are the one distant family — each grove and cypress sculpt
gets a map-scale stand-in by vertex clustering on its own box
(`farSculpt`, `vegetation.js`; 643 → ~20 triangles, same footprint,
height, tint, pose and instancing), derived at load rather than bundled so
`paintedAssetSync` keeps its meaning; families ride `VEGETATION_SPECIES`
and the sheet's `painted.lod.distantCells`. Far view −29% submitted
triangles at unchanged draws; near view, picking, the static bake,
instance counts and placement untouched (pinned). **Sacrifices kept**: far
forests read slightly denser and greener (solid crowns, 1.2% of the
overview's pixels, all canopy); a pop at the existing 25/29-px LOD band
(79 px worst case); ~20 KB more board geometry and 6–28 ms of clustering
once per session; a new sculpt must declare its `family` or it silently
gets no stand-in; `benchmarkTerrain` gained a parked-overview scenario
first in its results. **Follow-up row**: an unnamed scene layer is the
second-largest far-view contributor (410k triangles over 27,855
instances) — name and attribute it (P10).
**Landed — P10** (2026-09-15): measured first — P1's 53–184 ms a unit
step is gone with P3's caches (the five town layers fire only on their
own fingerprints; a step is 14–77 ms, the dearest row the units layer,
P2/P5's seam, untouched); the board sheds `paintedReservationDistance`
(four million zeroes, the material states the zero) and the merged land's
`uv` (derived from position through three's BUMPMAP_UV macro) —
213.3 → 182.7 MiB of arrays, byte-identical pixels; `signPaintedWorks`
folds integers (−38 %); a fog flip's region rebuild is pinned by count;
the unnamed far layer was two — the unit pieces (58 % of an omniscient
overview's triangles; at the player's own view a fifth of that) and the
fog chart (25k paper instances in four draws) — and every scene layer is
named now (`SCENE_LAYER_NAMES`, a source register). The benchmark
fixtures were regenerated at schema 116. **Not taken, with numbers**:
`turfWeight` (13.3 MiB, needs the fog texture's alpha — F1's file),
the uniformly-zero suppress batches (0.6 MiB), the works layer's wash as
an instanced attribute, the lens (2–3 ms a step). **For the user**: the
unit pieces are the far view's biggest row; cutting them means a
map-scale stand-in per unit family or dropping the outline hull and
x-ray ghost beyond the LOD band (the ghost is what makes a piece behind a
peak findable) — an art call. **Sacrifices kept**: the board depends on
three's `defaultAttributeValues` path and on the BUMPMAP_UV macro's name
(pinned); a second uv-reading map on the merged land would read (0,0)
silently; the works guard asks resource visibility once a row (an empire
fact today; a per-hex reveal rule must undo it).
**Landed — P9** (2026-09-15): a unit pick tests each instance's own
sphere before the triangle cast and walks the scene minus lights and unit
visuals (a body pick 6.9 → 4.8 ms, p95 halved; the same 28 picked and 11
blocked, id for id); `mergedDetails` stops receiving shadows (0 pixels at
both zooms) while the **water keeps receiving** — turning it off moved
634 pixels, a headland's shadow across a river, so the audit's cheapest
row is declined by measurement; the settlement kit ships as
`settlements-1.bundle` through P4's contract (28 requests → 1, 60 → 12
ms, +84 KB gzipped, `--check` in core); the shadow toggle writes its flag
over the works, sites, cities, roads and territory batches P3 retains
instead of forcing rebuilds (the setting leaves their batch keys; toggled
off now darkens the props and ribbons that used to keep casting — 45 px);
the study page uploads the grains one-channel. Six pairs at 0.000%.
**The climbing bake count is not a leak**: `shadowBakes` is a running
total the look keeps across restarts; games two and three bake less than
the first. **Sacrifices kept**: a future detail material not flush with
the ground would not receive a shadow (pinned per family); the lens and
the marginalia still occlude a pick (a picking change, not taken);
picking holds ~16 B a slot of sphere cache; a cold settlement fallback is
one round trip slower; `paintedCities` takes the toggle twice (both
reuses); a sixth retained layer must join `setShadows`' list by hand.
**Landed — P8** (2026-09-15): measured first, and the premise was wrong —
the first-frame task was not shader compilation but **texture uploads**
(the badge and tile-icon atlases and the three grains, each followed by a
GPU round trip: 89 % of it), with the "first link" the frame's first
synchronising call draining the queue. So the atlases are handed to
`renderer.initTexture` inside the terrain worker's window and the prepared
board's programs are linked with `compileAsync` before it enters the scene
(the board, not the scene: 34 programs against the scene's 49). Geometry
upload (16 ms) and the first bake (0 ms of main thread) declined with
numbers. First-frame task 6.6 s → 0.36 s on a new world, 13.7 s → 0.7 s
on a developed save; pixels identical. **Sacrifices kept**: seven extra
programs link per session (the board's hidden LOD/fog variants); the
atlases upload whether or not the first frame draws them; `terrain-ready`
now means built *and* uploaded; and — the one to know — **the first frame
no longer synchronises with the GPU, so on the software rasteriser the
rasterisation backlog is paid by the next task** (a developed save
freezes ~19 s *after* the board appears where it froze ~13 s inside the
first frame before; a fraction of that on real hardware; the board is on
screen throughout). P11 is the row that shrinks that backlog.
**Landed — P11, ON since 2026-09-15** (the user, on the shadow-edge crops: *"i actually like the crisper shadows, lets proceed with that."*): the one-period shadow fit
(`src/render3d/paintedShadowWrap.js`) — the static sun bakes one world
period plus a `periodMargin` instead of three wrap copies, and every
receiving material's shadow lookup subtracts the period's displacement in
shadow space (sideways *and* along the light's depth axis — the shadow
matrix's first column × period), installed by a sweep from inside the
bake rather than a list (eighteen receivers on a charted board, the fog's
chart table and one frozen-toon marker material among them, which a list
would have missed). With the knob on: 2716 → 1186 draws and 8.67 → 3.83 M
triangles on the static pass, ~2.2× on its time, and the three wrap copies
go from 0.013–0.064 % apart to **identical**. **Why off**: the map stays
8192² over a third of the width, so cast-shadow edges read ~2× crisper and
less stippled everywhere — 0.07–0.48 % of pixels, all edges, at every
preset — a look change on approved art. **▢ the user**: the before/after
crops are `.claude/scratch/p11/review/shadow-edge-{golden,dusk}-…-3x.png`
in P11's worktree; flipping `painted.shadows.periodFit` to `true` in
`data/view3d.json` is the entire change. Off is the old renderer to the
digit (0.000 % at play, overview and both seam views). **Sacrifices if
on**: a seam band of `periodMargin` (3 world units; a much lower sun or a
much taller caster would want it raised); one shader recompile for a
receiver that first appears after the first bake; two derived chunks
added to three's shared `ShaderChunk` table; slot 0 must stay the static
sun (the same assumption `painterly.js` makes).
**Wave 3 — QUEUED** (the user, 2026-09-14: *"add p8 to the queue along
with the others"*), after wave 2 lands, in this order: **P8 the first
frame** — the ~14 s (new world) to ~22 s (developed save) between
"playable" and the first drawn frame, one unbroken main-thread task of
shader compilation, first geometry upload and the first static bake;
compile the painted programs ahead with the parallel-compile extension
while the terrain worker runs, upload batches as they arrive, bake before
the landing comes down (or once coarse, then refined); "playable" means
the board is on screen; real-hardware numbers from the user's machine first
(the benchmark button writes the marks). **P9 the small rows** — #12
picking's occluder root (the unit groups, not the scene), #15 water and
decor no longer `receiveShadow`, #20's second half (the settlement kit
through P4's bundle contract), P2's follow-up (roads, borders and site
props take the toggle's flag), the terrain-study page's one-channel grains.
**P10 the developed-map remainder** — #10 per-tile constants out of the
per-vertex attributes (213 MiB of arrays), #7's residual (a fog change
touches only the affected regions of the works layer), and P1's open
reading (what the units and fog layers cost per step now that P3 took the
other five to under a millisecond — measure first). Same fidelity gate,
same sacrifices paragraph, core tests only.


**(zzzz) Fog of war under the painted look — RULED: shadowed** (the user,
2026-09-14, after the four-way study at `terrain-study.html?review=fog`:
*"i actually like the look of shadowed the most. i'll let you know when the
repo is free to add that in."*). Remembered cells keep their full pigment and
geometry and sit in shadow — the sun term scaled by `paintedFog.shadowedSun`
(0.35) with a slight cool shift (`shadowedCool` 0.22, `shadowedShade` 0.88) —
the fill unchanged; uncharted cells stay the chart table (the paper plane at
ground datum receiving the lit relief's shadows, ruled hexes, the sea wash);
the light edge soft over `sunFalloff` (0.5 hex) with the ink edge hard; the
reveal eases the sun up over `revealMs` (300). **Waits for the repo**: the
study lives on branch `fog-study` (worktree `.claude/worktrees/fog-study`,
served on :5241), built on a snapshot of the other agent's uncommitted
renderer redesign; it lands only once that redesign is committed and the
two are reconciled — the drawn and bleed treatments are deleted at landing
(the drawn's hatching and the bleed's block are fenced so they lift out
clean; the toggle and knobs go with them), `treatment` stops being a knob,
and `docs/plans/painted-fog-study.md` becomes the record. Two things to
carry: the **paper takes the sun's shadow but not its colour** (under golden
hour it read peach — the user saw it), and the audit's finding that any fog
texel change today forces a full shadow rebake and five layer rebuilds
(`docs/plans/painted-performance-audit.md`, finding 2) is the first thing to
fix beside it, or the soft edge and the reveal will stutter every march.


**(yyyy) The new-game flow in three screens — RULED, L7** (the user,
2026-09-14: *"the three screen flow is great, please fold those in too"*;
the spec is the artifact "Magister Ludi — New Game Flow", its first three
tabs, redrawn in `mockups/new-game-flow.html` when L7 lands). Today the
landing is one leaf: the poster masthead, the map card and the seat card,
with Continue and Load in the map card's foot. **L7 builds** three screens,
all screen states of the one page as the landing is today (nothing routes):
**(1) the title** — the poster masthead at full size, once, and under it two
cards on its edges: the menu (Continue with the newest save named on the
button and hidden when there is none · New game · Load a game · Multiplayer
greyed with "coming after the playable core" · a rule · Compendium ·
Settings) and the recent-worlds shelf (named saves and the autosave, newest
first, each row naming the figure, the seed, the turn and when — a row loads
it; the shelf reads `savesPanel.ts`'s own list); keyboard: Enter continues,
N new, L load, ? the book. **(2) new game, step one** — the mode as a
segmented switch at the top (Single player · Hot-seat · Online greyed),
then the map card exactly as built (seed + Random, size, the seats stepper,
the opponent row at two seats, the tutorial check; the hot-seat checkbox
becomes the switch) — the rows the mockup shows and the game does not have
(rivals · pace · the wild · difficulty) are **not built**, no greyed
placeholders — a summary strip in mono under the card ("standard · 6 seats
· seed 1"), Back to the title, and **Choose your civ →**. The masthead does
not repeat here; a small mono breadcrumb ("new game · step one of two")
stands in. **(3) choose your civ, step two** — the roster as the four-line
faces `leaderSelect.ts` already builds, No leader first and default,
**Random** last (dealt by the seed through `hash3`, the cast's own hash),
and beside the roster a detail card for the chosen figure: a portrait plate
slot in the figure's two inks (`artPlate`-style, the painting arrives
later), the name and identity line (▢ `family`/identity is still not a
field; print the two inks' names and nothing invented), the two abilities
through the describers, the unit and building each with the age that opens
it, the colour chips, the first cities, and **Begin as X** (Begin for no
leader). Back returns to step one with its values kept. `currentConfig`
reads the same controls it reads today; the config is byte-identical for
the same choices. Every existing pin on the landing (`leaderScreens`,
`gameSetup`, `screenLifecycle`, `seatRoster`, the tutorial) is reworked,
never dropped; new pins: the three screens are one `#landing` with a
`data-step`, Continue hides without a save and names the newest with one,
the shelf lists saves newest first and loads on click, the keys, the
segmented switch writes `hotSeat`, Random deals by the seed and the same
seed deals the same figure, Back keeps the seed, Begin's label follows the
pick, and a raw `[[` nowhere. `docs/README.md`'s surfaces section follows.
**L7 built** (2026-09-14; on the gate, landing with the great-people data
fix): `src/ui/landingFlow.ts` (the step walk, the breadcrumb table, the
summary strip, one guarded document key handler with two refusals — a text
control keeps every key, a button only Enter/Space); `savesPanel.ts` gained
`recentWorlds` and `relativeWhen`; the title's menu and shelf, the world's
switch and summary, the civ's roster with Random dealt by `hash3` and the
detail card; every control id kept and `currentConfig` unchanged; the book
opened from the title lifted above the landing (z 60); a pre-existing bug
found — `hidden` on a landing row was a no-op under the card's `display`
rules (the Opponent row had shown at every count) — fixed with a `[hidden]`
rule and a cascade pin. Verified on screen through the headless harness
(`scratchpad/pw/flow.mjs`). Twenty-one pins in `test/ui/landingFlow.test.ts`.


One paragraph a question, in the words the state of the tree makes them now.
The letter is the item the question came out of; the item's full history is in
`docs/history/flags-log.md`.

### Balance figures the user has not yet set

- **(nnn) · (hhh) The wager's bars, and the bead threshold.** Every bar in
  `docs/wager.md`'s deck is a bench figure, not the user's. Two — The Academies
  and The Contented Realm — were already cut well below the bench by ruling; the
  other twenty-two stand as measured. `rules.threshold` is **7**, two-thirds of a
  two-seat bench reading, and is likewise awaiting the user's own figure. The
  doc's table is sync-tested, so data and doc move together.
- **(ttt) The strength ladder's leftovers.** Three things the U9 pass left for a
  ruling: the `armyStrength` wager bars (375 · 1200 · 2500) that rode the ladder
  ×2.5; **the naval triangle now kills in one blow** — a light hull on a gun deck
  is a 10-point gap plus the two ±10 naval lines, which is a kill, and the lines
  at ×1.5 instead of ×2 is the lever if that is too sharp; and a **cost
  inversion** — the Legionary (40 strength, 54⚙, column 6) is stronger *and*
  cheaper than the Horseman (38, 101⚙, column 7), a column artefact.
- **(ppp) The waterline's three percentages.** `landRangedVsShipPercent`,
  `landSiegeVsShipPercent` and `embarkedCounterPercent` are first cuts. Beside
  them: the taking of a town is a melee kill on the **garrison** beat, and
  whether the user meant the **walls** beat too is unanswered.
- **(kkk) The Assize Court's relief.** Crowding is gone and a town's demand is
  linear in its citizens; the Court forgives a share of that demand. Fifteen per
  cent of the whole citizen line is deliberately more than fifteen per cent of a
  surcharge was — the figure is the user's to retune.
- **(hhh) The renown ladder, and the one-city pace.** The ladder is
  `floor(75 + 225n + n^2.8)`; whether halving the arrivals was enough or the step
  goes again is the user's call. Beside it: a one-city empire reaches the Opus
  around turn 4800 on the harness, and whether that is the pacing wanted has
  never been answered.
- **(qqq) · (xxx) The baseline the balance pass reads.** The tech ladder and the
  happiness figures were fitted while the retired deeds were still injecting
  yields; the wagers now carry that weight alone, and a wager pays beads, not
  yields. Any balance pass starts from the new baseline, not the fitted one.

### The map and the starts

- **(rrrr) · (tttt) Spacing, and a crowded roster.** Starts are
  `spacingFactor` 0.55 × √land, clamped to a floor of 10 and a ceiling of 20.
  The floor is ruled for **six** seats; what a **twelve**-seat standard game
  should do — relax the floor with a report, or refuse the count in the stepper —
  is open. `spacingFactor` itself is the lever if the user wants standard at 16
  rather than 20.
- **(tttt) Duel's river quota fell to half.** `rivers.minLength` 4 → 5 alone
  did it (isolated per knob): on 386 land tiles many traces reach the sea in
  four edges, and duel is under `pitLakeMinTiles` so it has no basin to flood.
  Standard, large, huge and giant fill their quotas. If duel should stay
  riverine the knob is a per-size `minLength` or letting duel pool.
- **(cccc) The luxury guarantee's fallthrough.** A leader's base luxury guarantee
  was tightened to hand-or-nothing, its whole-table fallthrough removed. If a
  seed sweep shows that starves a start, the fallthrough comes back.

### Leaders

- **(dddd) · (jjjj) The rows `data/leaders.json` does not carry.** There is no
  `family` or `spectrum` field, so the new-game screen's family line and spectrum
  bar print nothing and the mockup's two lines are absent. A data decision.
- **(xxxx) The leaders' second cut — RULED, L6** (the user, 2026-09-11: *"lets
  implement these. Fold it into the existing UI and axe the leader draft
  mechanic. I'm not sure what to do with the leader menu, we still need to
  give players a way to see what their civ does."*). The spec is
  `docs/leaders.md` "The second cut — fixed identity": a figure is **two
  abilities, a unique unit, a unique building** plus colours, cities, start
  bias and charge; **thirteen figures** (the six built, remapped; Joan of Arc,
  Mansa Musa, Zheng He, Nezahualcoyotl, Hypatia, Hildegard of Bingen, Ibn
  Battuta new). **L6a — the sim and the data**: `LeaderDef` reshaped
  (`abilities: CardEffect[][2]`, `unit`, `building`, the rest as today);
  the abilities are the seat's held effects from `newGame` (the bonus's
  seam, widened to two); a unique's row is `unlockedByLeader` and opens for
  the figure's seat **through the tech gate every row has** — no age
  machinery; `Player.leaderPicks`/`leaderOffer`, `chooseLeaderCard`, the
  `leaderDraft` blocker, the `leaders` phase, `leaderCardHome`/the deck
  types and `src/ai/leader.ts` **retire** (the v113 changelog rewritten to
  the second cut; schema stays 115 — nothing landed); seven new unit rows
  and seven new building rows (sizes, columns, silhouettes/model classes,
  Compendium clauses through the describers) and the six benched rows kept
  with `unlockedByLeader` and no figure (a bench); the seven new figures'
  **colours, cities and start biases drafted into the doc's three tables by
  the agent** (the doc is the spec; the user retunes; sync-tested); the
  first-cut deck tables and their sync test removed with the deck. New
  shapes, **build if small, else defer-and-annotate**: Joan's soldiers
  bought with faith in one building (`BuildingDef.faithBuysMilitary`, read
  in `purchase.ts` beside `faithBuysWonders`); the Treasure Ship's second
  passenger (the escort clause, per row); the Scriptorium's doubled belief
  effects in its city (a city-scoped amplifier on follower/founder lines);
  the Canoness's production lump on proclamation (a rider on the proclaim
  occasion — add the occasion if absent); Ibn Battuta's **re-roll** (a new
  command `rerollOffer {playerId, kind}` redrawing an Order, doctrine,
  government or great-person offer once from the seat's own pool, never a
  belief; a `Player` stamp per offer so it is once per draft; bots ignore
  it for now); the caravan's `+3 gold on its routes` and `cannot be
  plundered` scoped to one trader row (route rider and rule by `class`).
  **L6b — the screens**, on L6a: the landing face shows the four lines
  (abilities through the describers, the unit and building named with the
  tech that opens each); the draft sheet and its door go; **the leader
  sheet stays as "your civ"** — the four lines with what each ability pays
  this turn from the ledger's own lines, the uniques with their opening
  tech and a Compendium ref, the cities in order, the pair of inks; the
  Compendium's leader shelf lists the same; the spectator names the figure;
  the mockup redrawn to four lines. Pins: every figure's abilities are live
  from turn one; a unique opens for its figure's seat at its tech and for
  no other seat; the draft command is refused as unknown; a config naming
  a figure replays; the doc tables ↔ data; the re-roll redraws once and is
  refused twice; the caravan pays and is not plundered.
  **L6a built** (2026-09-12, held `cb40685`): `LeaderDef {abilities[2],
  unit, building, colors, cities, startBias}`; a unique opens through two
  questions — the seat's sheet names the row AND its column is reached
  (`columnReached`, since no node names these rows); everything of the
  first cut retired, `src/sim/leaders.ts` and `src/ai/leader.ts` deleted,
  the v113 paragraph rewritten, schema stays 115 and a figure config
  replays byte for byte. Three sheet keys renamed for id collisions with
  great people (`zhengHeOfMing`, `hypatiaOfAlexandria`,
  `ibnBattutaOfTangier`; names unchanged) — ▢ the user may prefer to
  promote those three out of the great-people roster instead. New:
  `UnitDef.effects` — a row's own rules ride the row and fold into its
  figure's law (this also rescued seven first-cut unit rules the deck's
  deletion would have destroyed). **Built shapes**: soldiers bought with
  faith (`faithPurchases: 'military'`, a third word on the seam); the
  Rihla's re-roll folded into the EXISTING `rerollOffer` command (an
  `ActionRuleId rerollOffers` waives the first asking per hand, never a
  belief, never a government); the caravan's +3 gold and unplunderability
  scoped to its row, and `caravanTypeFor` so his seat fields Rihla
  caravans; the Tetzcotzinco's whole-yield percent; the Museion's per-
  great-person science; the Funduq's lifted site. **Deferred on the row**:
  the Treasure Ship's second passenger, the Scriptorium's doubled beliefs,
  the Canoness's production lump (no `proclaim` occasion), Zheng He's
  first-contact lump, the Dockyard's +1 movement for ships built there;
  the Sankore's rate is a 25% share with a note. The seven figures'
  colours, cities and biases are in `docs/leaders.md`'s tables (the
  user's to retune); two new wants `coastalWithin`, `lakeWithin`. The
  tree did not typecheck at that head on purpose — six UI files read the
  retired types. **L6b built** (2026-09-12): the landing face is four lines
  (two rules through the describers, the unit and the building each named
  with what opens it — today every unique prints the age of its own
  column, since no node names one); `leaderDraftSheet.ts`, its overlay,
  CSS, wiring, the blocker arm and the `TurnBlocker` member are gone
  (the bot's dead `leaderDraft` arm with them); **the leader sheet is
  "Your Civ"** — both rules with the ledger's own lines under each, both
  uniques with `isUnlocked`'s answer and a Compendium ref ("Not yet — it
  comes with Æra IV"), the cities in order with the founded ones inked,
  the pair of inks; a plain seat gets one sentence; the dock's fifth door
  lost its waiting dot; the mockup redrawn to two tabs. Twenty-five pins.
  Whole tree typechecks; `test/ui` 77 files green. The full gate then
  failed two slow sweeps for one cause: both seated *every* figure — six
  became thirteen — and thirteen seats cannot hold a floor of ten. **Re-
  aimed at the product's six-seat cast**: `castFor(seed)` in
  `test/mapgen/leaderCriteria.ts` — Akhenaten every board (the (uuuu)
  reading is his), the other five a window rotated through the twelve so
  each sits ten of twenty-four boards; rates are shares of seatings.
  Floor held (min 14, median 16, none let down). **Shares worth the
  user's eye**: Mansa Musa's arid start 30% (40% unbiased — dry country
  is the ground a standard board grows least and refuses most, and a
  one-want figure is served late on the ladder), Zheng He's coast 50%
  (unmoved by the bias, same reason), Hildegard's river 70%; every other
  criterion 90–100%. `refitSlots` has no callers now (the draft was its
  only one) — docblock says so, kept whole. `docs/mapgen.md`'s rates
  table follows the new shares.
- **(qqqq) Whose movement the row means.** A leader row reading "military units
  regain all movement" is implemented as `isCombatant`; mounted-only would be a
  rule change.

### Religion and great people

- **(qqqq) The Great Ziggurat's dead rider.** Its `purchaseRider` targets
  `consecrates: true`, which today is the **retired** augur alone — a −25% on
  nothing. Aim it at prophets, or take it off the row.
- **(lll) Names, tiers and one reading.** Two renamed great people and several
  new rows carry proposed names and tiers that are the user's to change. Three
  members of the vocabulary (`sightedCities`, `bankedGold`, `strongerTarget`) are
  now read by no row at all.
- **(lll) The trader that cannot be plundered.** `tradersUnplunderable` is read as
  the **plunder** seam — a blow on a laden cart neither plunders nor harms it. If
  "cannot be pillaged" meant something wider, say so.

### Statecraft, cards and the Compendium

- **(dddd) Two shapes the vocabulary lacks.** A **scoped authority-cost** line
  ("cities of kind X cost one fewer authority", three cards want it) and a
  **per-puppet count**. Both are deferred-and-annotated today; building either is
  a design decision.
- **(lll) · (dddd) What the Compendium shows of retired and boon-only rows.** It
  lists retired great people and the forty-seven retired Orders while hiding
  retired buildings — one ruling covers all three. Separately, a pure-boon
  leader card's Compendium entry prints its effects only, where the draft sheet
  composes the lump.
- **(www) The queue floor's edge.** A command that would shorten a works list
  below The Vizier's Hall's floor is refused, because a strict floor deadlocks an
  emptied town — the shape of that refusal is flagged rather than ruled.

### Trade

- **(iii) A route needs a slot, not a Trader.** Currency (the Market) therefore
  gates trade in practice. Whether a technology should open routes in its own
  right is the user's call.
- **(uuu) A sea empire's route count.** With the Harbour and the Shipyard
  slot-less and slots coming from the Market and the Caravanserai by size, a wide
  and thin sea empire runs very few routes — the sea build's identity is thinner
  than it reads.
- **(iii) The idle-trader prompt can offer nothing.** A seat whose only partners
  are out of range or unseen is prompted and finds the sheet empty. The prompt is
  passable; the departure is deliberate (the cheap half of the gate) rather than
  paid for with a pathfind per press.

### The tree, and rows left mid-air

- **(uuu) The Toolmakers' Charter.** It retired when the Smithy moved into Bronze
  Panoply. Re-aim it or leave it retired.
- **(uuu) The Forge's name.** Steel's Forge keeps its name; the Foundry rename
  was only ever to free the word, and the user may still want it.
- **(uuu) The Lighthouse's gold.** It kept its base two gold **beside** the new
  two food; whether the mark meant *instead* is unanswered.
- **(vvv) The Saddle's parents, and the armoured horse's node.** The Saddle sits
  in Æra II with recommended prereqs (Husbandry + Bronzeworking); the armoured
  mounted row and the War Elephant sit at a recommended Iron Working. The lanes
  are the user's chart, so both placements want confirming.

### The bot

- **(sss) The opening build.** `openingScout`'s third clause has always declined,
  so the "scout first" ruling was never actually in force. `military.scoutCap` is
  3 and the seat now stops at its dial. Whether a first build should be
  hard-coded at all is the user's.
- **(www) The two strand weights.** `research.strandWeight` and
  `puppet.strandWeight` are both 0.35 — what a switch is charged for the progress
  it strands. An arena sweep of the pair is owed.
- **(xxx) What the orders pass actually moved.** The Merchant Scholars / Martial
  Law swap and the four "keep" rows are the likely movers in the t100 readings;
  only a playtest reads it.

### Presentation and small debts

- **(rrr) The two families.** `docs/playstyles.md` is open and every ▢ in it is
  the user's, during their balance pass. Nothing in it flies until marked.
- The Compendium does not walk `data/wagers.json`, and the census has no
  Compendium shelf. Two small passes.
- **(nnn) Plainer wager names** are proposed in `docs/wager.md`'s Notes column
  (Bread and Iron → *Full Fields and a Standing Army*, The Six Voices → *The
  Whole Yield*, …); the names in the data are unchanged. Beside them, The
  Patronage's note says "counted from the age's deal" where the other flow rows
  say "added up over the age" — the same thing, worded differently.
- **(nnnn) `lobby.ts`'s `MAX_SEATS`** is still the rules' figure rather than the
  stepper's. They agree at twelve today.
- **(zzz) · (yyy) Replay safety of the U9 figures.** Schema 109 already says a
  v108 log does not replay; whether the exact strength figures want a bump of
  their own is the user's (the recommendation is no — U9 has not been played).

## B. Deferred halves on the rows (regenerated from data)

Each waits on the named thing; the prose on the row is player-plain and is
the source. Regenerate with the scratchpad dump after any data pass. Your
ruling 2026-09-04 stands: every deferral stays; anything relying on a
removed system was re-cut with the levelling axe.

**Orders** — Triumphs (renown grant: a windfall's grants can't reach the
renown ladder) · Sanctuary (sacking doesn't exist; retired) · The Escorted
Roads (route safety is placeless) · The Dry Docks (heal-in-port is a hex
rule) · The Wolf-Standard (a camp's bounty has one destination) · The Far
Charts' second half (route reach off sightings is a `trade.ts` rule) · The
Tide-Reckoning (route mode unreadable) · the late-pool strikes (King's
Road's roads, Siege Train's adjacency, Patrons'/Guild Compact's/
Manufactories' family renown, Court Astronomers' wonder bounty, The
Consistory's rite duration, Forced March's penalty, Admiralty's embarked
defence, The Salon's renown price, The Silk Exchange's imported luxuries,
The Inquisition's temple-less penalty, The Magister's Court's second charge).

**Doctrines** — The Founders' Road (amphitheatre swap) · Mountain Hold
(radius 2) · The Burning Way (chopped-hex memory) · Religious Mandate (war,
conversion immunity, bead bonus — parked tier 0) · The Academy (faith-bought
scholar drafts) · The Sea Charter's founded-with-Harbour half · The
Renaissance Court's stronger-legacies half · Absolutism's longer-seal half ·
Blitz (retired to proposed — no stock half) · The Philosopher's Stone's
Distillery half · The Closed Realm (both — parked tier 0) · The
Horse-Tribes' flat-ground and stable halves.

**Governments** — The Curia (+3🕯 per Cathedral).

**Techs** — Epic Poetry (verse sized by the fallen piece) · Kingship (the
King List needs founding turns) · Paper Money (the Bourse spends gold) ·
Empire-Building (capital-mirror hammers) · Colonial Charters
(distance-priced authority) · Castellany (anti-ranged defence line) ·
Fortification (walls that mend).

**Resources** — Ivory (war elephants; hammers toward a category) · Lapis
(renown ruling).

**Wonders/buildings** — Terracotta Army (born strength) · Statue of Zeus
(+15% vs cities) · Notre-Dame (Cathedral culture) · Forbidden City (an
Order slot) · Alhambra (born fortify bonus) · Water Clock (the chime
cadence) · Shipyard (ship-only discount) · Printing House (routes paying
the destination) · Observatory's mountain sight clause · Bank
(routes-ending-here count) · The Cistern's fields half (a building waters
its town, not its hexes) · **The Magnum Opus (the culture pillar)**.

**Great people** — Sin-lēqi-unninni (Hall of Deeds is gone) · Leonardo
(project halving) · Mimar Sinan (cathedral discount) · Yi Sun-sin (naval
strength) · Dinocrates (a wonder-occasion legacy).

**Beliefs** — Holy Order (faith-bought fighting order) · Theocratic Mandate
(claims on followers) · The Promised Land (faith at a founding is a third
way to press).

**Numbers to tune (v55)** — Stele of Laws (50⚙, worse per hammer than the
Monument) · Stone Walls (55⚙) · Workshop (net −1 late vs the old renewal
path) · Floating Gardens (+1🌾+1💰; the lake half waits on lakes being
standable — a movement ruling; pit lakes now exist on big maps).

## C. Open threads

### The tedium thread (2026-09-06, the user's overriding impression of the first playthrough)

"Many of the mechanics felt tedious — so many buildings with similar effects;
I never wanted to invest in my chapel because I was so far ahead and didn't
want to waste time paying for augurs and using them in my cities. I couldn't
notice where the surveyable mines were in my territory." Three threads, no
rulings yet:

- **Buildings**: too many rows that are a flat with a different name. The
  balance turn's building trim is the wrong tool for this — the fix is
  *fewer* buildings, each a shape (a per-citizen line, a percentage, a
  district-like condition), with the flats folded into cards. Proposal owed:
  a cut list per age, with what each surviving building is *for*.
- **Augurs and rites**: a unit bought with faith, walked to a town, told to
  perform a timed rite — value per click too low, and worthless when ahead.
  Candidate shapes: rites become a city verb paid in faith (no unit; the
  Chapel is the door), or the augur folds into the prophet and rites into
  consecrations/beliefs (passive faith). The Chapel then has to be *for*
  something the leader still wants.
- **Veins**: the surveyable hills are invisible — nothing marks a hex that
  `prospect` would answer. Candidate: the lens (or the worker's reachable
  highlight) marks prospectable hills once the tech is held; or a survey is
  automatic when a worker rests on the hex. Small, and a UI ruling.
- **Bigger, rarer choices; cards that combo** (2026-09-06, the user): "I
  ended up with generically strong orders across the board, it didn't feel
  like the cards had synergy with each other… the faith-oriented build
  didn't make me really change how I played… I almost feel like we need to
  include a proportion of cards that don't really do much on their own, but
  combo nicely with other cards." Direction, not yet numbers: the deck gets
  **engines** (weak alone, read other cards by tag) and **payoffs** (scale
  with what is slotted beside them) beside a smaller share of standalone
  flats; a path (faith, war, trade, growth) has to be a different *engine*
  for the primary yields, not a side dish. `docs/history/fewer-things.md` — DRAFTED,
  awaiting your markup: the choice-size ladder, 38 → 19 buildings per age
  with a clause each, the augur options (recommends A split by act: rites a
  city verb, the augur a rare consecrator), the engine/payoff/standalone
  shares (25/30/45 — standalones are the fuel), one required new shape
  (`slottedOrdersOfLine` — the twelve `CardLine`s already on every row,
  switched on as a readable tag), and the finding that supersedes
  `cards-pass-2.md` §E.3: the draft cadence is NOT the problem (20 drafts by
  t92 on your own culture curve) — fewer, bigger drafts (`costExponent`
  2.25 → 2.8 with chairs down a quarter) is the coupled proposal. Largest
  bot debt: the draft plan prices cards alone, so it can never draft an
  engine — a marginal reading `V(deck ∪ card) − V(deck)` is the fix.
  **Rulings from the markup (2026-09-06)** — `docs/history/fewer-things.md` §7:
  the engine shapes are the user's five (amplifier by voice over card yields;
  building-yield percent by category; a "yields X" tile test; a periodic
  occasion with its own period-shortener; the slot-position reader — **slots
  are ordered as drawn, the topmost economic slot is the first**); lines stay
  drawn marks with three readable (War, Faith, Trade); **an unconfirmed card
  in a slot shows no yields — Confirm locks it and the aggregate fires**
  (the count-up is the scoring moment); **faith replaces the Magister's
  dice** — the dice go entirely, a faith reroll of a draft costs by age and
  by rerolls so far, printed as the rising price it is; the prophet's
  empire-wide rite is one of the five city rites cast everywhere; the
  apostle and a relic (faith per turn, once per cathedral) are faith's
  "magisterial supplement" ideas, open; buildings keep prerequisite chains.
  **Third pass (2026-09-06)** — every open item answered, folded into
  `docs/history/fewer-things.md` (§6 is the record): all twelve lines readable;
  cadence 2.8 and chairs down a quarter incl. Gov IV/V; ten chains; the
  Chapel pays culture on a rite (no gate — the tree is the only gate); the Cathedral keeps its roll; Court Augurs
  renamed to pay every city with an active rite; grants ignore chains; the
  faith ladder shaped like the augur's old prices; reroll from 35 faith at
  a slight exponent, prophets free; the apostle's third act is the relic;
  the base beaker halves and science moves into orders (the next playtest
  calibrates); three projects (production → gold / science / culture);
  veins marked, with hidden unique minerals. **Still open: the rites' faith
  price and per-city seal** (a default is proposed there).
  `docs/history/tech-gifts.md` — MARKED UP and folded (2026-09-06): **unique
  buildings, once per empire, as each age's anchor** (Heroic Epic · Imperial
  Throne · High Temple · Forum · the Caravanserai returned as the route hub;
  priced at half a wonder of the age; effects city-scoped bar the Throne's
  authority); the nodes' own gifts as the user wrote them (Movable Type's
  connected-city percents, Machinery's roads at a fifth, The Silk Road's
  endpoint luxuries, Horology's two periodic figures — "bursts are strong");
  the apostle at Theology; eight small shapes beside fewer-things' ten.
  `docs/history/orders-pass-3.md` — MARKED UP (2026-09-06), folded in its §9: the
  grammar is **put yields on a thing, then multiply the thing** (routes,
  Markets, the capital, great works, faith buildings — multipliers late,
  rare, applied last); **line readers withdrawn** for Orders (slot-flavour
  counts stay — CONFIRMED; `CardLine` is a drawn mark only); amplifiers stack additively; early pools
  lean standalone; periodic conversions (science↔faith↔culture, gold→science)
  as bursts; the cheer rows kept and the clamp left as is until the next playtest; the shrine engine tallies faith rerolls;
  four Gov V "just win now" bead Orders. All four questions in §9 answered. And
  `docs/deprecated/veins.md` — **SHELVED on your word (2026-09-06)**: the layer was
  unreachable for most of a game (its gate an Æra IV node) and a survey is
  the small frequent click this pass removes. `veins.share` is 0 (the last
  mapgen pass — every seed's ground stays bit-identical); the verb stays
  greyed by the tree; Geomancy keeps its mine line. In the drawer: the rare
  minerals as tech-revealed surface luxuries, no verb, when wanted.

- **Statecraft-close bug** — your deterministic recipe (discovery → culture
  boon → mid-turn draft → slot → dead ×) awaits confirmation on current
  main plus the console/elementsFromPoint probe.
- **Bot honesty — RULED into context**: the bot is not a balance baseline
  until significantly improved; playtests are the source of truth. The
  arena (`arena.html`) and the grid search (`scripts/gridSearch.ts`) are the
  instruments; the OFAT baseline needs re-running after the playthrough's
  tunings, on real seeds.
- **Bot debts, written down in docblocks** — a luxury's signature, the
  citadel's ring and hypothetical percents unpriced; a camp on
  charted-but-left ground over-counted; a wounded piece deep in enemy
  fields does not retreat; purchases don't read the unit mix; warscore
  wants a loss register (schema); the route reading under-reads a caravan
  (`score.caravanScale` 3 is the stand-in — the road's march and the
  destination's growth are the missing terms); naval is a hard null; the
  war economy's baselines sit outside the currency; the bot's culture plan
  prices drafts but a pass never conditions on the hand it just saw.
- **The opening build order, yours** (was `docs/flags.md`, folded here
  2026-09-07 by batch H4 — two lines are a flag, not a doc): *"ai needs to
  prioritize early scouts"* and *"my general build order is scout settler
  settler worker, that might not be optimal but first build being a scout
  should be hard-coded."* Unbuilt: nothing in `src/ai/` hard-codes a first
  build.
- **Late-game cost** — batch 9 in flight (above); if your game's End Turn
  drags past ~t100 on standard, say so and it jumps the queue.
- **Pamphlet shots: 3 outstanding** — move-attack, worker-improve,
  diplomacy-with-a-met-rival need a riper save; captions meanwhile.
- **Closed by your marginalia, for the record**: mid-peace expulsion (not
  now) · barbarian red rim (keep) · 4.5× declare (tune in playtest) ·
  project-headed towns (Civ V behaviour, confirmed) · authority roominess
  (defer to playtest) · camera easing (not needed; pan lock shipped) ·
  the seal lengthening (vetoed — slot-in/out is skill expression).
- **Playtest questions live** — the seven-line log: turn of each draft, the
  first pass and why, when slots first feel contested, the turn the wild
  stops mattering, when each age turns, beads per age, any stamp that
  surprised you.

## After rendering pass four: banners, trees, and a fifth look (2026-11-18)

Rulings by the user, 2026-11-18.

- **Town banners get their own layers.** The user: "ok great, lets make the
  banner change." Add `will-change: transform` to `.city-banner` in
  `src/style.css`. The fourth pass measured 18 ms of graphics time a frame
  for the banner repaint at the farthest zoom, and 0.4 ms with the line.
  Condition: a picture check at three zooms. If the banner text looks softer,
  drop the line and report.
- **Simpler trees sooner is deferred.** The user: "The trees look way too
  simplified, lets defer for now." `painted.lod.nearPixels/farPixels` stay at
  25/29.
- **A fifth look for more speed.** The user: "any other graphics headroom
  available? maybe we can check the rendering pipeline or any of the
  animations". This is a survey: read the pipeline and the animations, measure,
  and propose. Build only changes that keep the picture pixel for pixel. Every
  picture-changing idea comes back as a proposal with before and after
  pictures. The report goes in `docs/plans/render-performance-2026-11-16.md`
  as "Fifth pass".

## BP16 stage B as landed: the order differs from the ruling (2026-11-18)

- The ruled order put research, diplomacy, the council, spending and
  housekeeping before the units. With that order, production at turn 100 fell
  26% on five seeds.
- The landed order is: diplomacy and spending, then the unit and town loop,
  then research, the council and housekeeping. `docs/bot-priorities.md`, "The
  order of a sitting", is the reference.
- The gain is about 1% of a turn. The user has been told and has not yet
  confirmed the order.
- Open: the likely cause of the 26% drop is that some context memos keep the
  value their first reader leaves, so the order of the arms changes prices.
  Not proven. A fix waits for the user's answer, and so does stage C.

## Rendering: baked ground paint and a scroll cache (2026-11-18)

Rulings by the user, 2026-11-18. Both are built after the fifth pass reports
its measurements (the small-triangle test and the scroll cache estimate).

- **Bake the ground's paint into a texture.** The user: "for #1 we should
  definitely be baking the texture laid over the mesh." Today the paint is
  vertex colours (`vertexColors: true` in `paintedBoard.js`), so a coarser mesh
  loses paint. Bake the paint once, then let the ground mesh get coarser at far
  zooms with the same colours.
- **Scroll cache.** The camera has a fixed angle and no perspective, so the
  static ground only slides during a pan. Draw it once into a picture larger
  than the screen and move that picture.
  - Trees: "trees freeze while the camera moves sounds good to me." Trees go in
    the cache; sway stops during a pan and starts again at rest.
  - Water: "same approach for water is cool by me."
  - Fog, borders, improvements and towns change on events; each change draws
    the cache again.
  - Zoom: scale the cached picture while the zoom moves, then draw it sharp at
    rest (proposed to the user, not yet confirmed).
- **The check of frames that need no drawing** (the user: "do the #7 check") is
  question 2 of the fifth pass.

## Bots after BP16 stage B (2026-11-18)

The user, 2026-11-18: "you're good to go with your recommendation for the bots
optimization." The recommendation was:

1. The landed order of a sitting stands.
2. **BP16b-fix: find and fix the order fault.** Some context memos seem to keep
   the value their first reader leaves, so the order of the arms changes prices
   (production fell 26% in one order). Prove the cause, then make each memo
   give the same value whoever reads first. Pins may be cut once.
3. **Then stage C: parallel bots from a frozen copy of the board.** Each bot
   decides from the board as it stood at the start of the turn's bot step, in
   its own worker. Results change once. This replaces the earlier "pins
   identical" condition, which stage B showed is not reachable.

## Age turn-over: a missing plate, the abacus motion, and a faster clock (2026-11-18)

The user, 2026-11-18, from a game on the play server at about turn 70: "no, i
didnt see it during the world's age turns over. I also dont see a new abacus
animation (it uses the 2d abacus animation, when ideally it should be the 3D
one)."

- **Fault: the age plate did not show** when the world's age turned over.
  Find the cause before any fix.
- **The age turn-over's abacus motion must use the 3D abacus**, not the 2D one.
- **The clock turns over sooner.** The user: "The age rollover should probably
  be more aggressive too, once any player has reached age 3, or if half the
  players have reached age 2, it should trigger the countdown for age
  roll-over." Reading taken (to confirm with the user): the countdown that
  closes age N starts when any living seat has reached age N+2, or when at
  least half of the living seats have reached age N+1. This replaces the
  floored mean in `worldAge` (`src/sim/worldClock.ts`). The countdown length
  (`rules.wager.countdown`) stays. Built after the bot order fault batch lands,
  because both cut the digest pins.
- **A styling pass for the 3D abacus** is scheduled (the user: "Could you also
  schedule a styling pass for the 3d abacus?"). Design options first, with
  pictures.

## Rendering focus: the ground paint texture (2026-11-18)

The user: "Let's defer the zoom and scroll cache for now, and focus on the
ground paint texture, i have a feeling that should speed things up
considerably." The scroll cache and its zoom handling are deferred. The baked
ground paint, with a coarser ground mesh at far zooms, is the next rendering
build. It starts when the fifth pass reports.

## Age turn-over: landed fix and three follow-ups (2026-11-18)

- Landed (`c3341ac8`): every age that opens is reported, so the age plate and
  the wager sheet show at the first turn-over. The bead award sheet shows the
  3D abacus (`BEAD_SHEET_FRAME_3D` in `src/ui/beadModal.ts` is the switch).
- Three follow-ups, proposed to the user and taken as the recommended reading:
  1. A tutorial note must not open on top of the age plate. It waits until the
     plate (and any sheet in the same queue) has closed.
  2. The top bar's age card must not show the new age before the plate has
     announced it. Interface only; `currentWorldAge` in the sim stays.
  3. The bead sheet's line and the Abacus screen say "of 7 beads" while the 3D
     frame draws 13 beads a rod. Make the frame and the words agree.
- Open with the user: up to five pages can show in one hand-over (Triumph
  sheet, bead sheets, age plate, wager sheet, census). Not changed yet.

## After rendering pass five (2026-11-18)

Pass five landed (`a97cd1a0`): banner layers, and no board frames under the
orders screen, the Abacus or the landing page. Its proposals, and the user's
answer, 2026-11-18: "2 3 4 are great, 5 is fine too."

- **Ruled, to build as one small batch:**
  - 2: no board motion under the star chart;
  - 3: the red "decision waiting" dot and the research bar's nudge animate by
    transform and opacity, not `box-shadow`, with the same look;
  - 4: layers for the Buy Tiles price tags and the faith plates, with the
    banner picture check repeated;
  - 5: no board motion under the parchment sheets.
- **Open:** 1, a canvas at pixel ratio 1 while the camera moves (28% to 35% off
  a pan frame, softer while moving). The user has not answered.
- **The ground paint texture** is the next large rendering build. Pass five
  found the cause of the land's cost: the painter cuts every brush patch into
  the mesh (about 1,750 triangles a land hex against about 320 for the hex and
  its hills). Estimate: 7 to 12 ms off a 43 ms frame at the middle zoom. It
  starts with a plan and a small test that measures the real gain.
- The scroll cache stays deferred. WebGL2 cannot copy MSAA samples the way it
  needs.

## BP16b-fix: the order fault, found and not shipped (2026-11-18)

- **Proven.** In two games to turn 100, 3,585 of 405,448 kept memo reads
  (0.9%) differed from a fresh reading, in 30 of 52 memos.
- **It explains only part of the 26%.** With every memo fresh, all five phases
  before the loop still lose production. The landed order of a sitting stands.
- **The exact fix costs 5% to 8% of a late turn** and shows no play change
  clear of chance on five seeds. A smaller fix (2 of 30 memos) costs up to 1.8%
  on one seed and also shows no clear change.
- **Decision (orchestrator, under the user's "you're good to go with your
  recommendation for the bots optimization"): ship neither.** The stale reads
  are a speed trade, now on the record. The patches and the games are in
  `/Users/jacky/code/webciv-baselines/bp16fix/`. The report is in
  `docs/plans/performance-pass-2026-11-06.md`, "BP16b-fix: the order fault".
- Next for the bots: the world clock rule (a small rule batch), then stage C,
  parallel bots from a frozen copy of the board.

## The world clock rule: built, gated, held (2026-11-18)

- Built on branch `worktree-agent-a38585a4eb6b84ad7` at `7847f279`. Gate:
  typecheck, 515 test files (11,959 tests), build and both digests pass.
- **Held, not landed.** It raises the schema to 245, so the user's current game
  would stop loading. It lands when the user says so.
- Measured on five seeds: age II opens about 9 turns sooner and age III about
  26 turns sooner. Age II wagers are kept less often (10 of 30, was 17 of 30);
  that goes to the wager rework. `ai.wager.ageTurns` (32) was measured under
  the old clock and may now be too long.
- Stage C (parallel bots) waits for it, because both cut the digest pins.

## The user's answers, 2026-11-18 (afternoon)

"1 land now 2. yes 3. what colors are they now? 4. could we support both? 5. no
need for now"

1. **The world clock rule lands now.** Landed; schema 245; older saves are
   refused.
2. **Fix the card figures that disagree, with stage 2.** One reading feeds a
   card's pay plate, its chip and the totals, for yields and for the two
   meters. Details in `docs/plans/ui-critique-2026-10-16.md`.
3. Meter colours: the user asked what they are now. Ink, as built, until the
   user says otherwise.
4. **The Council screen supports both** real drag and drop and click then
   click.
5. **No lower resolution while the camera moves**, for now.

## Generic Orders: a candidate set of changes (2026-11-18)

The user: "can you start a fable subagent for suggesting a candidate set of
changes for the generic orders? they're weak at the moment and we havent
givenmuch thought ot them. Aim for cards that would be generally useful for
themes across all decks, please reference the card design skill we drafted."

- A proposal only: candidate changes to the generic Orders (the cards every
  seat can be dealt, whatever its two decks). Nothing is built until the user
  picks.
- The method is the `card-design` skill (`.claude/skills/card-design/`).
- The proposal goes in `docs/plans/generic-orders-proposal-2026-11-18.md`.

## Ground paint texture: build stages 1 and 2 (2026-11-18)

The test measured 13% to 17.5% off a panning frame at the middle and farthest
zoom, no firm gain at the closest, where the picture also goes soft
(`docs/plans/ground-paint-texture-2026-11-18.md`; pictures at
https://claude.ai/artifact/A3qHr7HXdTzcoi8WggmCKV). The user, 2026-11-18, on
the pictures: "icant tell the difference between the before/after so you're
good to proceed."

- **Build stages 1 and 2 of the plan**: the plain, textured land at the middle
  and farthest zoom, in place of the far mesh; today's cut land stays at the
  closest zoom. Behind a switch.
- The test path is on branch `worktree-agent-a61bfcdb3b66ab6f8` (`99744c63`).
- Stage 3 (a coarser plain land) and stage 4 wait for the result.

## The frame of the game: a cabal of magisters from the whole world (2026-11-19)

The user, while reviewing the wonder proposals:

> "lets go with wonders that are not solely european, i want a diverse set
> from other cultures"

> "lets assume the game is set in a fantasy world where all the magisters
> from around the world are playing this game, in some kind of mystical
> cabal"

- The players are magisters from every part of the world, joined in a
  mystical cabal. The frame is fantasy, not Renaissance Europe.
- A wonder, leader, card or name may come from any culture's own tradition of
  hidden knowledge. It does not need to be something Renaissance Europe knew.
- This is a frame for new content (the wonder proposals first, then the design
  pass on leaders and deck polish). It does not order a rewrite of existing
  text.
- Player-facing words stay plain (hard rule 7). The frame changes subjects and
  names, not the register.

## Ground paint texture: use the texture at every zoom (2026-11-19)

The user, after stages 1 and 2 landed: "lets not do the old cut models at
all, lets just use the texture at all zoom levels."

- The plain textured land is drawn at every zoom. The cut land (brush patches
  cut into the mesh) is no longer drawn.
- This is rendering work, so it belongs to Astra under the split of
  2026-11-18 (`docs/plans/astra-handoff-2026-11-18.md`).
- What the build must settle, from the stage 1 and 2 report
  (`docs/plans/ground-paint-texture-2026-11-18.md`, Part 3):
  - **Sharpness up close.** At 32 texels a unit the patch edges match the cut
    land at 100 pixels a hex, are a little soft at 130 and plainly soft at
    160. The closest zoom is about 249 pixels a hex. A sharp closest zoom
    needs a denser texture near the camera, or the user's yes to a softer
    look. Doubling the density over the whole map costs four times the
    memory (about 228 MiB on the standard map) and is over the GPU's texture
    limit on the Giant map, so a whole-map answer does not work there.
  - **What still reads the cut land.** The pointer's pick, unit heights and
    the sun's shadow bake read the cut land today. The report says the plain
    land has the same surface, so they can move to it.
  - **The wait for the bake.** Today the cut land is drawn until the bake ends
    (about 1.5 s on the standard map, 9 s on the Giant map). Without it, the
    board needs something to show in that time.
  - **The switch back** (`painted.groundTexture.enabled: false`) should stay
    until the user has played with the new look.
- Expected gain at the closest zoom, from the measured table: about 8 to 9% of
  a panning frame, plus the memory and load time of the cut land.

## Religion names: short names that sound like a religion (2026-11-19)

The user, on the faith screen mock-up: "could we do a naming pass, lets make
these religion names way shorter. They can be proper nouns that just sound
arcane/cool, or reference obscure religions from history". Then, on the first
list of candidates (`docs/plans/religion-names-2026-11-19.md`): "i like the
direction for the religion names a lot, but i'd prefer if they sounded like
the name of a religion, not a specific god."

- A religion's name is short: one or two words.
- It reads as the name of a religion, a sect, a school or a mystery, not as
  the name of one god or of a place.
- It may be a real, obscure and extinct tradition from any culture, or an
  invented name that sounds like one. No living faith.
- **This replaces part of the ruling of 2026-08-27** ("keep religions fluid /
  not tied to historical world religions", with the code's "never a fixed
  roster"). A fixed list of names is now allowed. The names are still not the
  world religions that people practise.
- Nothing is built until the user has chosen the names.

## Leaders: a more mainstream roster, one for each pair of decks (2026-11-19)

The user, while planning leader portraits: "i might change the people to be
honest. Looking at the current version of the game, i think i want to go with
slightly more mainstream picks, and find leaders who fit thematically some of
the playstyles in the decks." Then, on a list of suggestions by deck pair: "ok,
please do a fable design pass for all the suggestions, i can choose among
them".

- The roster of thirteen leaders is under review. Portraits wait until it is
  settled.
- The direction: leaders that most players know, each a fit for the two decks
  they play. A proposal on the table is one leader for each of the fifteen
  pairs of decks.
- The candidates, by pair (the user chooses among them; nothing is ruled):
  - Dominion + Expansionist: Alexander the Great (today Mithridates VI)
  - Dominion + Commerce: Genghis Khan (no leader today)
  - Dominion + Devotion: Saladin, or Joan of Arc kept (today Modu Chanyu and Joan of Arc)
  - Dominion + Scientific: Mehmed the Conqueror (no leader today)
  - Dominion + Magisterial: Qin Shi Huang, or Augustus (today Emperor Taizong)
  - Expansionist + Commerce: Pachacuti (stays)
  - Expansionist + Devotion: Isabella of Castile (no leader today)
  - Expansionist + Scientific: Nezahualcoyotl (stays)
  - Expansionist + Magisterial: Cyrus the Great (no leader today)
  - Commerce + Devotion: Mansa Musa (stays)
  - Commerce + Scientific: Cleopatra (no leader today)
  - Commerce + Magisterial: Lorenzo de' Medici, or Hatshepsut (today Zheng He)
  - Devotion + Scientific: Harun al-Rashid (today Al-Ma'mun)
  - Devotion + Magisterial: Justinian, or Ashoka (today Akhenaten and Hildegard of Bingen)
  - Scientific + Magisterial: Sejong the Great (today Hypatia)
- A design pass writes each candidate's abilities and pieces for the user to
  mark up. Nothing is built until the user picks.

## A purchased unit appears beside a full city (ruled 2026-11-20, not built)

The user, on the city screen's red line "A Horse Archer already stands in
Aldermarch — move it first": "this red text is unclear. lets change the
behavior - purchased units appear beside the city, but units cannot be
purchased when a city is under siege if a unit is on the city. this should
read 'city cannot purchase without free tiles'".

- Today a city cannot buy a unit while a unit of the same stacking class
  stands on its hex.
- **New rule:** if the city's hex is free for the unit, the unit appears
  there, as today. If it is not, the unit appears on a free hex beside the
  city. The reading for "free" is the rule `canStopOn` already gives, and the
  hex is chosen by a fixed order, never by chance (determinism).
- **Refused only when there is no free hex:** the city's hex is taken and no
  hex beside it is free. A city under siege with a unit on it is the usual
  case. My reading of "under siege": a hex beside the city that an enemy
  holds, or that an enemy's zone covers while the city is besieged
  (`siegeField`), is not free. The builder confirms this reading against the
  code and says so.
- **The sentence:** "This city cannot purchase without free tiles."
- It goes through `purchaseError` and `realiseItem` (`purchase.ts`), so the
  list, the forecast and the reducer agree. The unit arrives through
  `arriveOnTile`. Whether a produced unit (not bought) follows the same rule
  is not ruled; it stays as it is.
- Owner: Astra (a rule in `src/sim`).

## A coastal city is a city that owns a coast hex within two hexes (ruled 2026-11-20, not built)

**Ruled:** the user confirmed the narrow form on 2026-11-20 ("confirm all the commerce 5 points"). On 48 starts it raises coastal capitals from 17 to 26. The text below is the proposal as first written.

The user, in the Commerce pass (on dealing sea cards only to seats with a
coast, which the user rejected): "a coastal city should be defined as a city
with access to the coast i.e. controls a coastal tile. that way, you can
settle two tiles from the coast and still build a lighthouse, get coastal
bonuses, settle more flexibily, what do you think?"

- Today a city is coastal only when its own hex is beside water.
- **Proposed:** a city is coastal when a water hex is in its borders (or, a
  narrower form, within its first two rings). It may then build the
  Lighthouse, the Harbour and ships, and every "coastal" scope reads it.
- **What the builder must settle:** where a ship built in such a city
  appears (my proposal: on the nearest water hex the city owns, chosen by a
  fixed order); whether the city can be attacked from the sea; whether sea
  trade routes start from it; and whether the reading changes when a city
  gains or loses its only water hex (it is derived, never stored).
- My advice to the user: yes, in the narrower form (a water hex within two
  rings that the city owns). It makes the sea theme live for many more
  starts without dealing rules, and it ends the choice between a good city
  site and a coastal one. It also makes every coastal bonus more common, so
  the sea cards of the Commerce pass should be priced after it.
- Owner once ruled: Astra (a rule in `src/sim`).

## A lumber mill gives +2 production (built)

From the Expansionist pass, change 65. The user had said of forests: "it
feels like it's just better to chop them currently". The pass found that a
chop pays 28 to 46 production in the first two ages and the cleared hex then
farms for as much as a lumber mill yields, so a chop costs nothing later. The
proposal: a lumber mill gives +2 production (from +1). The user: "great". It
is a base rule in the improvement data, for every deck. Owner: Astra.

## Terrace farms require a hill beside a mountain (built)

The user confirmed on 2026-11-20: "i mean only a hill beside a mountain."
The worker checks for both hills and an adjacent mountain on every allowed
terrain. Fresh water alone does not qualify a hill.

## The Open Market discounts Great People (ruled 2026-11-20)

The user confirmed “Discount Great People too”. Calculate the base gold price from the next Great Person’s renown cost at 10 gold per point. Apply The Open Market’s 20% discount using the same price for the offer and the payment. The faith offer keeps its existing price. [Commerce build list](plans/commerce-design-pass-2026-11-20.md#4-ready-for-the-build)

## Merchant Princes waits for recruitment (ruled 2026-11-20)

The user chose “Wait for recruitment to unlock”. Until a player can recruit Great People, Merchant Princes cannot take gold or open an offer. Use the ordinary recruitment ability, which Epic Poetry or a card can grant. The Reliquary shows the reason and the purchase command checks it before spending gold.

## Base science, culture and unit prices (implemented in save version 251)

The user: "I think base science and culture is a bit too strong, i think i
want to nerf the passive science from population, and the base science and
culture buildings that scale off population. Also, i think units are still a
bit too cheap". Then, on the figures proposed: "university should be 6 flat,
but otherwise i agree. leave the tree slow for now. 80% surcharge sounds
good. I think workers and settlers probably need to become more expensive
too."

| Thing | Today | Ruled |
|---|---|---|
| Science for each citizen (`rules.cities.sciencePerPop`) | 0.5 | 0.25 |
| Library | +2 science, +0.5 for each citizen | +3 science, flat |
| University | +0.75 science for each citizen | +6 science, flat |
| Amphitheater | +2 culture, +1 for every 2 citizens | +4 culture, flat |
| A soldier's surcharge (`rules.production.militaryPercent`) | 50 | 80 |

- **Technology prices do not change.** The tree runs slower on purpose
  ("leave the tree slow for now"), so that science is earned from cards,
  great people, wonders and buildings.
- Why: a city of 10 citizens with both buildings made 19.5 science, 17.5 of
  it from the citizen count. Food was the best science yield.
- Rows of a leader or a card that pay science for each citizen (for example
  The Mithridatium) are not in this ruling. List them in the build report.
- Cards and great people that read these buildings ("your Libraries pay
  double") now read the flat figures. Check their arithmetic.
- **Measure before and after** with the bots, on enough seeds to read it
  (science a turn and the turn each age is reached, at turns 50, 100 and
  150; units a seat; the turn of the first settler and the first war).
- Owner: Astra (data rows and two rules).

### Workers and settlers (implemented in save version 251)

The user: "I think workers and settlers probably need to become more
expensive too." They are civilians, so the soldier's surcharge does not
reach them. Today a worker costs 10 and each one built adds 2; a settler
costs 28 and each one built adds 7. Proposed first figures:

| Unit | Today (first, second, third, fourth) | Proposed |
|---|---|---|
| Worker | 10, 12, 14, 16 | base 14 (the `line` size), +4 each: 14, 18, 22, 26 |
| Settler | 28, 35, 42, 49 | base 36, +9 each: 36, 45, 54, 63 |

The user: "ok lets do that for now, i'll see if we need a further pass." So
the proposed figures are ruled as a first step. The worker moves to the
`line` size with a ladder of 4; the settler's base is 36 with a ladder of 9.

## A purchase discount is "gold buys more" (ruled 2026-11-20, not built)

The user, in the Commerce pass: "instead of doing subtractive effects, to do
additive ones aka your gold is 20% more effective instead of the cost is 20%
less", then "25% more is good, every gold discount should take this form.
devotion can take this too."

- Every card, Doctrine, belief or building that makes a **purchase** cheaper
  states it as buying power: "Your gold buys 25% more" (or faith, for a faith
  purchase). The price is the full price divided by (1 + the sum of the
  bonuses that apply), rounded up once.
- Bonuses add to each other inside the sum. The price can never reach zero,
  and no cap is needed: bonuses that sum to 90% give 47% off.
- **Convert every live purchase discount** to this form. A row that reads
  "20% less" becomes "buys 25% more", which is the same price for a seat that
  holds only that row. List each converted row in the build report.
- This is for purchases with gold and with faith. A discount on the
  production cost of a thing (a cheaper settler to build) does not change.
- The price chip shows the final price. `explainPurchaseCost` keeps its
  ordered lines, with one line for the buying power.
- Owner: Astra (`purchase.ts`, the describers and the data rows). The Claude
  session then shows the full price struck through beside the final one.

## Attacking across a river is a flat −3 (ruled 2026-11-21)

The user: "attacking over a river should be a flat penalty, not a percentage,
lets update it to -3. check if there are any % combat strength modifiers left
in the game". Until now a melee attack across a river multiplied the
attacker's base strength by 0.8 (`rules.combat.riverAttackPenalty` 0.2). It
becomes one labelled flat line of −3 on the attacker's side, like every other
line on the ledger. This follows the user's earlier rulings: "terrain bonuses
should be additive, not percentage" (2026-08-28) and no percentages of combat
strength on cards (2026-11-19).

### The percentages of combat strength that remain (2026-11-21)

| Where | What | State |
|---|---|---|
| The Volley Fire (Scientific Doctrine) | melee units −10% combat strength | Already ruled to change in the Scientific pass, change 59: "your archer line may attack twice a turn, they lose 4 combat strength when defending against a melee attack". Not built. |
| `rules.naval.landRangedVsShipPercent` | a land bow shoots a ship at −50% | **Ruled 2026-11-21: a flat −6.** |
| `rules.naval.landSiegeVsShipPercent` | a land siege engine shoots a ship at +50% | **Ruled 2026-11-21: a flat +6.** |

Not percentages of strength, so not in the list: the damage roll's band of
±20%; a hull that boards an embarked column takes half of the counter-blow
(`embarkedCounterPercent`, a share of damage); the Opus breach rule (a share
of banked production). No unit row and no other card carries a percentage of
strength. The `combatPercent` stat stays in the vocabulary until The Volley
Fire changes, and then nothing reads it.

### The naval rulings (2026-11-21)

The user: "land bow against a ship: -6. Land siege against a ship +6. Ships
attacking embarked units should take no damage."

- A land bow that shoots a ship: one flat line of −6 on the attacker's side.
- A land siege engine that shoots a ship: one flat line of +6.
- A ship that attacks an embarked unit takes no damage from the counter-blow
  (`rules.naval.embarkedCounterPercent` 50 becomes no counter at all).
- Why flat is right here, in the user's words: "Isn't damage calculation
  based on the difference of combat strengths, so -6 would be the same
  regardless of absolute strength?" It is. Damage is
  `baseDamage · e^(0.04 · (attacker − defender))`, so 6 points change damage
  by the same factor (about 0.79 or 1.27) at every strength. The old
  percentages were the rule that changed with the ages: −50% was 6 points at
  strength 12 and 20 points at strength 40.
- After these and The Volley Fire, no percentage of combat strength is left
  in the game.

### The Chevauchée (a note for whoever revives it, 2026-11-21)

The Chevauchée (Dominion, `retired: true`) strikes towns near a pillaged hex
with 50% of the raider's strength (`strikeTownsNear` in `src/sim/combat.ts`).
It is in no pool, so the percentage reaches no game, and the code is left
alone. If the card returns, give it a flat form: the raider's strength less
6. The user: "sounds good".
