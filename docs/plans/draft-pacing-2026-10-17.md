# Draft pacing, measured (2026-10-17)

This is the measurement the user asked for after the first playtest (`docs/flags.md` (ccccccc)):

> *"i'm in age 3 in science but still drafting tier 1 orders, my culture and science are roughly the same throughout the game. Could you do a measurement of how long each take? I think the number of drafts required to go from tier 1 -> 2 and 2-> 3 needs to be halved"*

The same day the user found the cause, and ruled the fix:

> *"wait, the government change at draft 10 should upgrade the pool from tier 1 to tier 2, why doesn't it do that?"*

This doc measures the game before and after that fix, and models the other options on top of the fix.

## Summary

- **The cause was a bug, not the cost curve.** Since schema 119 the Order tiers opened at drafts 18, 29 and 38, one government tier late, because the ladder had no rung at draft 10. In bot games a seat reached research age 3 on turn 85 (median), but got its first Tier II hand on turn 128. That is 44 turns in age 3 while it still drafted Tier I.
- **The fix is built** (schema 149, not yet committed). The Order tiers now open at the government tiers: 4, 10, 18 and 29 drafts. No chair count changed. A new test holds the rungs to the government tiers, so the two lists cannot drift apart again.
- **After the fix, research decides when Tiers I to III open.** Tier II now comes 2 or 3 turns after age 3 (median), and Tier III comes 3 or 4 turns after age 4. No seat spent more than 4 turns in age 3 while it still drafted Tier I.
- **So halving the drafts on top of the fix changes almost nothing for Tiers II and III.** Only Tier IV still waits on culture. It needs 29 drafts, and only 9 of 30 seats got there in 200 turns.
- **Recommendation:** keep the fix and today's cost curve, play again, and decide Tier IV on its own (section 7).

## 1. How a tier opens

- A draft opens on its own when the culture pool covers its cost, at most one a turn. Nobody chooses when to draft.
- The draft that comes after n drafts costs `12 + 5n + n^2.2` culture, rounded down.
- A pass still counts as a draft. It spends the culture and raises the draft count.
- An Order tier is dealt when two gates are open: the draft count has reached the tier's rung, and the research age is at least the tier plus one (`bandOpen`). Tier IV has no age of its own: it needs age 4, as Tier III does.
- Only the highest open tier is dealt. When a new tier opens, the earlier tiers leave the draw.

| Order tier | Rung before the fix | Rung after the fix | Government offered at that draft | Its chairs | Research age needed |
|---|---|---|---|---|---|
| Tier 0 | 0 | 0 | the Chiefdom | 3 | 1 |
| Tier I | 4 | 4 | tier 4 | 5 | 2 |
| Tier II | 18 | 10 | tier 10 | 5 | 3 |
| Tier III | 29 | 18 | tier 18 | 8 | 4 |
| Tier IV | 38 | 29 | tier 29 | 11 | 4 |

What the drafts cost (today's curve):

| Draft number | Cost of that draft | Culture to reach that draft count |
|---|---|---|
| 4th | 38 | 94 |
| 10th | 182 | 761 |
| 18th | 606 | 3,940 |
| 29th | 1,678 | 16,498 |
| 38th | 3,015 | 37,969 |

The flags item says the 18th draft costs about 260. It costs 606.

## 2. The measurement

- **Games:** five, at seeds 20260831, 11, 2026, 4242 and 31337, on the standard map with barbarians.
- **Seats:** six bots in each game, with the personas balanced, wide, tall, zealot, warmonger and balanced.
- **Length:** 200 turns. One game before the fix ended on turn 188, when a seat won.
- **Trees:** "before" is the tree at schema 148 (`e4f73bd7`). "After" is the same tree with the fix (schema 149).
- **Figures:** each figure is the median over the 30 seats, with the lowest and the highest seat in brackets. A seat that never reached a point is left out of that median, and the table says how many did reach it.

### 2a. When each point is reached (turn)

| | Before the fix | After the fix |
|---|---|---|
| Draft 4 | 32.5 (15–40) | 32.5 (15–40) |
| Draft 10 | 72.5 (45–103) | 72.5 (45–99) |
| Draft 18 | 128 (91–189), 26 of 30 | 133 (89–191), 27 of 30 |
| Draft 29 | 153 (114–197), 10 of 30 | 154 (120–174), 9 of 30 |
| Draft 38 | 173 (130–198), 6 of 30 | 165 (145–186), 6 of 30 |
| Research age 2 | 53 (32–72) | 53 (32–72) |
| Research age 3 | 84.5 (64–128) | 84.5 (64–119) |
| Research age 4 | 150 (106–200), 23 of 30 | 145.5 (93–200), 24 of 30 |
| First Tier I hand | 56.5 (35–78) | 56.5 (35–78) |
| First Tier II hand | 128 (91–189), 26 of 30 | 87.5 (64–126), 30 of 30 |
| First Tier III hand | 155 (114–197), 10 of 30 | 151 (99–193), 23 of 30 |
| First Tier IV hand | 175 (130–198), 6 of 30 | 154 (122–174), 9 of 30 |

### 2b. How long a seat waits

The wait is the turns between reaching a tier's research age and getting the first hand of that tier. A seat that never got the hand counts up to turn 200.

| | Before the fix | After the fix |
|---|---|---|
| Tier I, after age 2 | 3 (0–6) | 3 (0–6) |
| Tier II, after age 3 | 44 (9–133), 4 of 30 never | 2.5 (0–11) |
| Tier III, after age 4 | 27 (0–59), 13 of 23 never | 3.5 (0–20), 1 of 24 never |
| Tier IV, after age 4 | 39 (1–94), 17 of 23 never | 31 (1–77), 15 of 24 never |
| Turns in age 3 or later, still dealt Tier I | 44 (9–133) | 0 (0–4) |
| Turns in age 4, still dealt Tier II or lower | 18 (0–59) | 0 (0–20) |
| Turns where the age allows a higher tier than the drafts | 84 (9–133) | 27 (0–77), nearly all of it Tier IV |
| Turns where the drafts allow a higher tier than the age | 19.5 (2–57) | 55.5 (6–109) |

A wait of about three turns is the floor: a new tier can only appear on the next draft, and a draft comes every 7 or 8 turns.

### 2c. The drafts themselves

| | Before the fix | After the fix |
|---|---|---|
| Drafts dealt from Tier 0 | 6 (4–9) | 6 (4–9) |
| Drafts dealt from Tier I | 11 (8–13) | 5 (2–8) |
| Drafts dealt from Tier II | 7.5 (0–22) | 9 (4–17) |
| Drafts dealt from Tier III | 0 (0–9) | 3 (0–11) |
| Drafts dealt from Tier IV | 0 (0–40) | 0 (0–40) |
| All drafts by turn 200 | 24.5 (16–77) | 25.5 (15–68) |
| Passes | 1 in 864 drafts | 1 in 881 drafts |
| Turns per draft in age 1 | 8.1 (4.3–11.6) | 8.1 (4.3–11.6) |
| Turns per draft in age 2 | 6.7 (4.0–12.0) | 6.8 (4.0–11.8) |
| Turns per draft in age 3 | 7.4 (2.3–18.5) | 7.6 (1.7–21.0) |
| Turns per draft in age 4 | 7.8 (1.6–21.0) | 8.7 (2.1–20.0) |

The cost of a draft rises about as fast as the culture income does, so a draft comes every 7 or 8 turns for the whole game.

### 2d. Culture and science per turn

Median seat, before the fix. Turns in which a seat held no town are left out. After the fix the games take different paths, so after turn 75 the medians move by up to a quarter either way, but the culture for each point of science stays between 0.6 and 0.7.

| Turns | Culture | Science | Culture for each point of science |
|---|---|---|---|
| 1–25 | 2.8 | 3.0 | 1.0 |
| 26–50 | 8.6 | 8.9 | 0.9 |
| 51–75 | 19.2 | 32.9 | 0.7 |
| 76–100 | 44.3 | 58.7 | 0.7 |
| 101–125 | 65.1 | 86.1 | 0.7 |
| 126–150 | 78.2 | 115 | 0.7 |
| 151–175 | 95.6 | 153.7 | 0.7 |
| 176–200 | 86.4 | 169.7 | 0.6 |

The spread between seats is wide. One runaway seat banked thousands of culture a turn late in the game, and drafted 77 times.

## 3. The two currencies

| Order tier | Rung after the fix | Culture to reach it | Research age | Science to reach that age, cheapest path | Science the bots spent to reach it |
|---|---|---|---|---|---|
| Tier I | 4 | 94 | 2 | 220 | 366 (244–446) |
| Tier II | 10 (was 18) | 761 (was 3,940) | 3 | 580 | 1,792 (1,342–2,252) |
| Tier III | 18 (was 29) | 3,940 (was 16,498) | 4 | 3,880 | 9,624 (8,143–12,396) |
| Tier IV | 29 (was 38) | 16,498 (was 37,969) | 4 | 3,880 | 9,624 (8,143–12,396) |

The cheapest path is the least science that researches one technology of the age with all its prerequisites. The bots spend more because they research what their plans want, not the shortest way to the next age.

What this means:

- After turn 50 the bots bank about 0.7 culture for each point of science. For such a seat a rung comes before its age when the culture it needs is less than about 0.7 times the science the age needs.
- **After the fix, every rung up to Tier III comes before its age.** Tier II needs 761 culture against about 1,250 (0.7 × 1,792), and Tier III needs 3,940 against about 6,700 (0.7 × 9,624). So the research age decides.
- **Before the fix, Tier II needed 3,940 culture**, more than twice the science of age 3. So the drafts decided, for 44 turns.
- **Tier IV has no age of its own.** It needs 16,498 culture, about 1.7 times the science the bots spent to reach age 4, so the drafts decide, and late.
- The user banks about one culture for each point of science. For that player the rungs come even sooner, compared with the ages, than for the bots.

## 4. The options

Each option is modelled from the culture that each seat banked, turn by turn, in the five fixed games. A draft is taken as soon as the pool can pay, at most one a turn. A tier is dealt when its rung and its age are both reached, and the ages are the measured ones.

**The model was checked against a real run.** Modelled from the five games before the fix, the fix gives the same medians as the five fixed games, within five turns: Tier II 87.5 against 87.5, Tier III 150.5 against 151, Tier IV 155 against 154, and draft 18 on turn 128 against 133. Modelled from their own culture, the games before the fix give their measured figures to within one turn.

Each cell is the median turn of the first hand, then the median wait after the tier's age, then how many seats never got the tier when some did not.

| Option | Rungs for Tiers I–IV | Cost of a draft after n drafts | Culture to each rung | Tier II | Tier III | Tier IV | Drafts by turn 200 |
|---|---|---|---|---|---|---|---|
| **A**, before the fix | 4 · 18 · 29 · 38 | 12 + 5n + n^2.2 | 94 · 3,940 · 16,498 · 37,969 | 133, waits 48.5, 3 never | 154, waits 31, 15 of 24 never | 165, waits 46.5, 18 of 24 never | 25.5 |
| **B'**, the fix (built) | 4 · 10 · 18 · 29 | 12 + 5n + n^2.2 | 94 · 761 · 3,940 · 16,498 | 87.5, waits 2.5 | 151, waits 3.5, 1 never | 154, waits 31, 15 never | 25.5 |
| **H**, the fix with its gaps halved | 4 · 7 · 11 · 22 | 12 + 5n + n^2.2 | 94 · 311 · 981 · 7,143 | 87.5, waits 2.5 | 151, waits 3, 1 never | 146, waits 5, 5 never | 25.5 |
| **B**, the first proposal | 4 · 11 · 17 · 26 | 12 + 5n + n^2.2 | 94 · 981 · 3,334 · 11,825 | 87.5, waits 3 | 151, waits 3, 1 never | 161, waits 22.5, 9 never | 25.5 |
| **C1**, the fix with a gentler curve | 4 · 10 · 18 · 29 | 12 + 5n + n^2.0 | 92 · 630 · 2,766 · 10,092 | 87, waits 2 | 145, waits 3, 1 never | 154.5, waits 15, 8 never | 30 |
| **C2**, the fix with a gentler curve | 4 · 10 · 18 · 29 | 12 + 5n + n^1.8 | 89 · 538 · 2,054 · 6,596 | 88.5, waits 2 | 147, waits 2, 1 never | 150.5, waits 3, 4 never | 35.5 |

What this means:

- **Every option after the fix opens Tier II and Tier III within about three turns of the research age.** That is the floor set by one draft every 7 or 8 turns.
- **The options differ only in Tier IV, and in how many cards a seat drafts.**
- **The first proposal (B) is almost the fix.** The user's halving of 14 and 11 drafts gives rungs at 4, 11 and 17. The fix gives 4, 10 and 18.
- **H** opens Tier IV close to age 4 and adds no drafts. But it moves the rungs off the government tiers again, unless the governments move with them (section 5).
- **C2** also opens Tier IV close to age 4, but every seat drafts about ten more cards in 200 turns (35.5 against 25.5), which is 40% more cards. **C1** is between the two.
- The culture curve cannot make the culture to each rung "track" the science to each age. With the fix, Tiers II and III already cost less culture than their ages cost science. Tier IV shares age 4 with Tier III, so it has no age to track.

## 5. What reads the ladder

- **`bandTierAt`** reads it. It is the only reader while a game runs, so only the Order tiers move with the ladder.
- **The chairs** come from each government's own row (`chairs` and `chairMix`, read by `slotCount` and `slotSpread`), never from the ladder. `chairsAtTier` reads the ladder only in tests, which hold each row's chair count to its tier's rung. So moving a rung cannot change a chair count by accident: a test fails instead.
- **The governments** are offered at their rows' own tiers (`GOVERNMENT_TIERS`: 4, 10, 18 and 29), when the draft count reaches one (`planDraft`).
- **The Doctrine offers** pair Doctrine tier k with the k-th government tier (`governmentTierForDoctrineBand`). They do not read the ladder either.
- **The bots** read the tier through the same functions as the game (`currentBandOf`, `eligibleFor`), and price a draft with `draftCost`. They keep no copy of the rungs.
- **The interface** prints the next government's tier (`draftGlance`, read from `GOVERNMENT_TIERS`). No screen prints an Order tier's rung.
- **How the bug happened:** from schema 119 the ladder held only the rungs where the chair count rises, and the tier-10 governments add no chairs. Nothing held the ladder to the government tiers, so the two lists drifted apart.
- **After the fix,** the ladder's rungs are the government tiers, and `test/sim/statecraft.test.ts` ("opens each Order tier at the draft count where its government is offered") fails if they drift apart.
- **To move the Order tiers later** (option H, for example), there are two ways:
  - move the governments with them: the rows' `tier` and the ladder's rungs together. The Doctrines follow the governments, and the chair counts stay on the rows;
  - or split the ladder into an Order-tier ladder and the government list, and change that test on purpose.

## 6. Where the bots draft differently from a person

- **Nobody chooses when to draft.** A draft opens when the pool covers its cost, for a bot and for a person alike. So the draft count depends only on the culture income.
- **Passing does not slow the count.** A pass spends the culture and counts as a draft. The bots passed once in about 870 drafts. A person who passes for a rarer hand keeps the same pace.
- **The bots adopt each government as soon as it is offered.** The tiers read the draft count and not the government, so a person who waits to adopt is dealt the same tiers.
- **The bots bank about 0.7 culture for each point of science after turn 50.** The user reports about one to one. Such a player reaches each rung sooner, compared with the ages, so after the fix the research age decides even more often.
- **The bots spent about 1,790 science to reach age 3; the cheapest path is 580.** A person who rushes age 3 can get there before draft 10. With culture about equal to science, that player has about 580 culture at age 3: nine drafts, one short of draft 10, which needs 182 more. At that point of the game one draft takes 7 to 10 turns. So a fast researcher can still draft Tier I for a short time in age 3, but no longer for the 44 turns of the bug.

## 7. Recommendation

1. **Keep the fix** (built, schema 149). It answers the playtest: Tier II now comes 2 or 3 turns after age 3, against 44 turns before. Tier I to Tier II takes 6 drafts instead of 14, and Tier II to Tier III takes 8 instead of 11.
2. **Do not halve the drafts on top of the fix yet.** For Tiers II and III the research age now decides, so halving would move them by a turn or two at most.
3. **Keep today's cost curve for now.** A gentler curve mostly adds cards (C2: about 40% more by turn 200), and the user said the new cards are already strong.
4. **Decide Tier IV on its own.** It needs 29 drafts, and only 9 of 30 bot seats got there in 200 turns. If Tier IV should come soon after age 4, the cleanest change is a lower Tier IV rung with the tier-29 governments moved to the same draft count (H's 22 is one example), not a gentler curve for every draft.
5. **Measure again after the next playtest**, with the fix in place.

**The user chose 26** (2026-10-17, `docs/flags.md` (ddddddd)): *"lets move tier IV to tier 26"*. Tier IV's rung and the tier-29 governments moved to 26 drafts together (schema 150).

## Method and files

- The fix: `data/statecraft.json` (`tierLadder`), with its docblocks in `src/sim/statecraftData.ts`, the changelog entry v149 in `src/sim/state.ts`, and the new pin in `test/sim/statecraft.test.ts`.
- The measurement scripts are kept in the session's scratchpad, not in the repository: `pacing/measure.ts` (plays one game and writes every seat's turn-by-turn draft count, research age, culture, science and the tier of each draft), `pacing/report.py` (the tables in section 2), `pacing/analyse.py` (shared readings) and `pacing/options.py` (the model in section 4).
- The culture each seat banked is measured from the pool itself: the change in the pool each turn, plus the cost of each draft taken that turn. The science is measured the same way from the science pool and the cost of each technology researched. Both match the costs of the curve to within a few per cent.
