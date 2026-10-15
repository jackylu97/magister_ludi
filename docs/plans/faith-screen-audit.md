# The faith screen: audit and three layouts

Date: 2026-10-12. Branch `decks` at `cec9f8e5`. Nothing in the repo was changed.

The user's request: *"We should have the ability to configure and manage rites on that screen, along with all the bonuses from your religion clearly laid out."*

The drawings are the faith audit artifact linked from `hud-ux-decisions.md`; that page embeds the screenshots, so it is not kept in the repo.

## How this was checked

- A bot-driven game: seed 4242, standard map, four seats, seat 0 played by the bot, run to turn 131 (`work/gen.ts`, save at `work/g4242.json`). At turn 131 seat 0 has founded *the Children of Sky and Wild*: three gods, three follower beliefs, no enhancer, 10 cities following (3 of its own 7, and 7 foreign), Omen Reading running in 3 towns, The Camp Chaplains (Dominion) and First Rites (Devotion) seated, 137 faith banked, +87 a turn, a rite costs 72.
- Captured with headless Chromium at 1440 × 900 and 1280 × 800 against my own Vite server on port 5288, stopped by PID afterwards. Port 5199 was not touched.
- The figures in the drawings come from the sim's own readings of that save (`work/read.ts`, `work/read2.ts`): `explainLedger`, `explainDeckLedger`, `readEmpire`'s town lines, `explainPressure`, `riteError`.

## 1. What the screen shows today

`src/ui/religionScreen.ts`, built on `modalShell.ts`, opened by H, by the dock's faith button, and by the ☰ menu. It is the Statecraft sheet's split: a fixed left column and a right pane that scrolls.

- **Left column:** the pantheon wheel (every god in the table, the ones you hold lit) and one card per pantheon place, each wearing its stamp figure (`explainCardImpact`).
- **Right pane, in order** (`paint`, lines 1196–1230):
  1. Faith gathered, `137 (+87)`, and the next pantheon rung (`drawPool`, 647).
  2. Your religion: its name (editable), "3 of 3 religions founded", the follower and enhancer beliefs as cards with stamps (`drawReligion`, 923).
  3. What the holy city is paid (the founder share) and every town in the world that follows, with its follower count and pressure a turn (`drawTide`, 1027).
  4. Rites, as a reference: every rite in the table, what it does, its flavour line (`drawRites`, 1118).
  5. The clergy: a city select and the prophet, apostle and inquisitor buttons (`drawClergy`, 866).

How a rite is started today: the city screen's Rites disclosure (`cityPanel.ts` `renderRites`, 2998; summary at 3405), one row per rite with a button and the price; or a prophet's unit sheet ("say one rite over every city you own", `controls.ts` 5940). The faith screen has no button for either.

## 2. What is missing for the two jobs

### Managing rites
- The screen cannot start a rite. It is reference text only.
- It never says which towns are keeping which rite, or for how many more turns. That fact exists (`cityRite`, `cityRiteTurnsLeft`, `religion.ts` 1410 and 1421) and is shown nowhere outside each town's own panel, where the held rite appears only as a bare number in the disclosure's summary ("Rites 7") and in its tooltip.
- It does not say what a rite would pay in a given town, or what a running rite is paying now (Omen Reading is paying +42 science across three towns in the test game).
- It does not say what blocks a rite (cost, the town already keeping one, the offering needing a build) except on the city screen.
- It does not offer the prophet's empire rite, or warn that the empire rite replaces whatever each town was keeping (`clearCityRite`, called at `religion.ts` 1854).

### Seeing every bonus
- No faith income breakdown at all. "137 (+87)" is the only figure; the +87 is 59 from seated cards (49 from The Camp Chaplains alone, a Dominion card), 10 from worked land, 8 from the religion, 5 from buildings, 5 from wonders (`explainLedger`). The top bar's faith hover shows the bank and the next rung only (`topBar.ts` 231).
- The belief cards show a stamp figure that is a ghost difference (what removing the card would cost, knock-ons included), not the Ledger's attribution, so the stamps do not add up to any total the game prints elsewhere. Star Readers stamps +10 science; the Ledger credits it +8.
- Seated Devotion cards are absent. So are running rites, cathedral consecrations, and the faith buildings that beliefs open (the Wat, the Mosque).
- Follower beliefs that open a building show "— · ✶ · —" (nothing), which reads as "does nothing".
- Non-yield effects (happiness, combat strength, pressure) are only in each card's clause text, never summed.

### Followers and spread
- The following list is good. Missing: which of **your own** towns follow nothing (4 of 7 in the test game, and no pressure reaches them), and which rival faiths are pressing your towns.

## 3. Ranked problems, with references

1. **No way to start or see rites from the faith screen.** `religionScreen.ts` 1118–1182 is text; no `performRite` is wired to `createReligionScreen`'s options (`main.ts` 4544). High.
2. **No faith income breakdown, and the bonuses do not reconcile.** The screen prints the pool and the rate (`drawPool`, 647) and per-card ghost stamps (`beliefStamp`, 617), never the Ledger's split. Rule 5 asks that a total be the fold of its list; there is no list. High.
3. **Rites sit two screens down.** At 1280 × 800 the pane is 1,756 px tall against 609 px visible; the rites start 976 px down, below the second screenful. At 1440 × 900 it is 1,756 against 709. High for this request.
4. **Retired rites are listed.** `drawRites` walks `Object.keys(RELIGION.rites)` (line 1123), so The Preaching and Recasting the Omens appear, greyed, as "needs The High Temple" and "needs Divination". `LIVE_RITE_IDS` is the right list. Medium.
5. **Card-taught rites name the wrong teacher.** Rite of Fasting shows "needs Divination", Votive Offering "needs The High Temple", Restoring of the Host "needs The Holy Office", on the faith screen (`religionScreen.ts` 1132) and on the city screen ("Taught by Divination", `controls.ts` 5787, from `riteDef(id).tech`). They are taught by The Fast, The Votive Gifts and The Host Restored (`RiteDef.byCard`, `religionData.ts` 189). Medium.
6. **The sheet's header names the retired augur.** `index.html` 1148 "Augurs & Pantheon" and 1151 "an augur is three rites, or one god". The module's own rule (`religionScreen.ts` 14–17) forbids naming a retired piece; its test reads only the `.ts` file. Medium.
7. **The duration is said twice and ignores amplifiers.** Each rite reads "Kept for 10 turns · … · for 10 turns" (`riteGrantWords` plus `lasting`, 1137–1160), and "Kept for 1 turns". The figure is the row's `duration`, not what `stampRite` will actually stamp under The Octave (+50%) or Chichen Itza (`religion.ts` 1671). Medium.
8. **The founder share is labelled and attributed oddly.** "Religion · the Children of Sky and Wild · ×3" prints an internal multiplier label; the line borrows the first enhancer or follower belief as its card (`statecraft/evaluator.ts` 931), so any per-card split credits the founder share to Temple Spires. Medium (it blocks an honest per-source table).
9. **The city screen repeats one refusal eight times.** With a rite running, every row says "Aldermarch is already keeping Omen Reading" (`cityPanel.ts` 3004–3033). The A1 ruling already moves rites into a Faith card with the refusal stated once. Low here (owned by the city screen work).
10. **Stale docblocks.** `commands.ts` 1231 and `cityPanel.ts` 2990 say a rite needs a Chapel; `riteError` asks no such thing (`religion.ts` 1441). `empireRiteAt`'s docblock (1833) says chapels are not paid; the loop pays them (1862). Low.
11. **The clergy row wraps awkwardly at 1440**, names floating between buttons. Low.

## 4. What the sim already offers the new screen

| Need | Exists | Where |
|---|---|---|
| Start a rite in any of your cities | yes, `performRite {cityId, rite}`; no rule ties it to the city screen or to where the camera is | `commands.ts` 1241, gate `riteError` |
| Is the town keeping a rite, how long | yes | `cityRite`, `cityRiteTurnsLeft` |
| Price | yes, one figure per age (40, 56, 72, 90) | `riteCostFor` |
| Why a town cannot | yes, one sentence | `riteError` (unknown, already keeping, building nothing or a wonder for the offering, cannot afford) |
| Rites you know (tree, charter, seated card) | yes | `availableRites` |
| Empire rite by a prophet | yes, `empireRite {unitId, rite}`; the prophet needs a charge and movement, and can stand anywhere | `empireRiteError` 1776 |
| What a running rite pays now | yes, as town lines carrying the rite's id (`Rite · Omen Reading (7 turns left)`, class religion) | `readEmpire(...).towns[].reading.lines` |
| Faith income by class | yes, sums to the top bar | `explainLedger` (faith row: tiles 10, buildings 5, deck 59, religion 8, wonders 5) |
| Seated cards' pay, card by card | yes | `explainDeckLedger` |
| The religion class, card by card | **no**; `deckLinesOfCity` does it for the deck class only | `ledgerFold.ts` 430 |
| What a rite would pay in a town not keeping it | **no** | (new: a ghost reading, `explainBuildingPreview`'s method) |
| Amplified duration before stamping | **no**, inside `stampRite` only | `religion.ts` 1671 |
| Happiness lines tied to a card | **no**, `MeterContribution` carries a label only | `meters.ts` 121 |
| Pressure on a town, by faith | yes | `explainPressure` |

Nothing blocks starting a rite away from the city screen: the command names a town, not a unit, and the only seat-level check is that the player has not ended the turn (`commands.ts` 3876).

## 5. Three layouts

All three keep `modalShell.ts` (H, Escape, the ×, `hidden` as the whole state), retitle the sheet "Faith" with "your religion" as its eyebrow, and carry a header strip: faith banked, income a turn, the rite price.

### F1 · Three tabs: Rites, Bonuses, Religion (recommended)
- **Rites tab** (opens first whenever one of your towns is free and you can afford a rite; otherwise the last tab used). One row per rite you know: what it does, its turns (amplified), its price, **which towns keep it now with turns left as chips**, and what it is paying now. "Start in…" opens a checklist of your cities on the right: each line says free, keeping X for N turns, or the reducer's refusal, and for a free town what the rite would pay there. The foot says the total: "2 cities · 144 faith · you have 137 — short 7. Start in Northwatch now; the second can follow next turn." Card-taught rites the empire lacks sit greyed under "Taught by cards", naming the card. The prophet's empire rite is a last row: which prophet, the price once, and the towns whose rites it will replace, with turns lost.
- **Bonuses tab:** one table, rows grouped by where the bonus comes from (pantheon, follower beliefs, enhancer beliefs, holy city, rites running, seated Devotion cards, other cards paying faith), columns for the six yields plus "other effects" in words. Group subtotals; the religion groups' total is printed beside the Ledger's Religion figure so the two can be seen to match. Above it, the faith income as one bar split by class.
- **Religion tab:** today's content: the wheel, the belief cards, the following list (plus your own towns that follow nothing and rival pressure), the clergy.
- **Size:** about 5 days (UI 3, sim 2).

### F2 · One page, three columns, no tabs
- Header strip, then the faith income bar across the full width.
- **Left: what your faith gives.** The bonuses table compressed to one line per source with its figures as chips; groups fold.
- **Middle: your cities and their rites.** City first: every town is a row with its rite and a turns bar, or "Start ▾" listing the rites you know with what each would pay there. "Several" mode puts a tick on each row and a rite picker at the top.
- **Right: followers and spread**, compact, with the clergy at its foot. The wheel is dropped; gods are rows in the left column.
- **Size:** about 5.5 days. Tight at 1280 (three 360 px columns); below 1100 px it must stack.

### F3 · A rite calendar, and a ledger
- **Top: the calendar.** Rows are your cities, columns the next twelve turns. A running rite is a bar to the turn it ends. A forecast row under it shows the faith bank by turn (137, 224, 311 …) and how many rites each turn can pay for. Pick a rite from a palette at the left, then click the "now" cell of any free row to start it there; a later cell shows when it becomes affordable but does not book it.
- **Bottom: bonuses as Ledger bars**, one bar a voice with the religion slice split by source, and the itemised list under it.
- Followers and spread as a narrow right column.
- **Size:** about 6 days. Booking a rite for a future turn would need a stored order and a turn phase: about 3 days more, and not recommended.

## 6. New commands and sim changes

| Change | F1 | F2 | F3 | Size |
|---|---|---|---|---|
| Start in one city: `performRite` as it is | yes | yes | yes | none |
| Start in several: the screen sends one `performRite` a city, stops at the first refusal, and checks the running total before it sends | yes | yes | yes | ¼ day |
| (Alternative) one `performRites {cityIds, rite}` command, all or nothing | optional | optional | optional | ½ day + tests; not recommended, one command per town keeps the log and the refusals plain |
| Empire rite from the screen: `empireRite` as it is, the screen picks the prophet | yes | yes | yes | ¼ day |
| `riteTurnsFor(state, seat, rite)`: the amplified duration, lifted out of `stampRite` so the screen and the stamp share it | yes | yes | yes | ¼ day |
| `explainRitePreview(state, seat, cityId, rite)`: a ghost reading of what a rite would pay in a town, by the `explainBuildingPreview` method | checklist | dropdown | ghost bars | 1 day |
| `explainReligionLedger(state, seat)`: the religion class split by belief, rite, consecration and founder share, by generalising `deckLinesOfCity` to any class | yes | yes | yes | ½ day |
| The founder share gets its own source instead of borrowing a belief's id (`evaluator.ts` 931) | yes | yes | yes | ½ day |
| `MeterContribution` carries the card that paid it, so happiness can join the "other effects" column by source | yes | yes | yes | ½ day |
| Fixes from §3: retired rites, card-rite teacher name, header text, duration words | yes | yes | yes | ½ day |
| Booking rites for a later turn (state field, command, turn phase) | — | — | optional | 3 days; not recommended |

## 7. Where it opens, and the city screen

- **E2 drawer, depth two, the Religion row (H):** keeps H. The row gains one line, "3 rites running · 4 towns free", and its dot lights when a belief is owed (as today) or when a town is free and a rite is affordable (proposed, needs a ruling).
- **Top bar faith chip:** opens the Ledger on faith, as the E2 spec says. Its hover card ends with "Bonuses and rites: H".
- **City screen (A1), Faith card in the town rail:** the card's headline is the town's rite and turns left ("Keeping Omen Reading · 7 turns left") or its rite rows with the price, refusal stated once. A link at its foot, "All rites and towns ›", opens the faith screen on the Rites tab with this town ticked. In the other direction, every town name on the faith screen opens that town's city screen and closes the sheet.

## 8. Recommendation

**F1.** Each job gets the full width it needs: the Rites tab is an action list like the build list, and the Bonuses tab is a table like the Ledger. The identity content the user ruled on (the wheel, the cards, the following list) stays whole on the third tab, so nothing settled is reversed. At 1280 × 800 the Rites tab fits seven to ten towns without scrolling the sheet. Borrow one thing from F3: the forecast sentence at the foot of the checklist ("the second can follow next turn").

Build order: the four small sim pieces (`riteTurnsFor`, `explainReligionLedger`, the founder share's source, the fixes), then the Rites tab without previews, then `explainRitePreview`, then the Bonuses tab.

## 9. Rulings the user needs to make

1. Which layout: F1, F2 or F3.
2. Starting in several towns: one command per town (recommended) or one all-or-nothing command.
3. Should the prophet's empire rite be offered on this screen (it spends a charge of a prophet standing anywhere)?
4. Which seated cards count as your religion's bonuses: the Devotion deck only, or any card that pays faith? In the test game the largest faith source is The Camp Chaplains, a Dominion card (+49 of +87). Proposed: Devotion cards in their own group, other faith-paying cards in a second group.
5. Follower beliefs also pay the owners of foreign towns that follow. Show only how many such towns there are (proposed, keeps the fog rule) or what they pay?
6. The drawer's Religion dot: light it when a town is free and a rite is affordable, or only for a belief owed (today)?
7. The sheet's name: "Faith" (proposed) or "Religion".

## 10. Other games

- **Civilization V**: a religion overview with three tabs, your religion, world religions and beliefs (from memory; not rechecked). Closest to F1's split of "yours" from "what it does".
- **Civilization VI**: a religion screen listing your beliefs by kind, and a world view of religions and follower counts; the religion lens draws pressure on the map; faith purchases live in the city (from memory; tab names not confirmed). No timed per-city rite to manage.
- **Civilization VII**: religion opens in the Exploration age with Piety and a Temple; beliefs are one Reliquary, Founder beliefs and one Enhancer (Theology); a city's religion panel had a launch bug where it did not default to your own religion (player reports: [Prima Games](https://primagames.com/tips/how-to-spread-your-religion-in-civilization-7), [Steam discussion](https://steamcommunity.com/app/1295660/discussions/0/591762339848527069), [Steam discussion](https://steamcommunity.com/app/1295660/discussions/0/591762563949243321); belief counts are player claims, unconfirmed).
- **Humankind**: a religion screen where tenets are chosen as the follower count grows (from memory; not rechecked).
- **Endless Legend 2**: I found no confirmed religion screen. Faith appears through the Tahuk faction ([PCGamesN](https://www.pcgamesn.com/endless-legend-2/tahuk-faction)); how it is shown is unconfirmed.
- **Stellaris** (outside the genre): the edicts screen lists timed empire effects with their cost and time left, which is the shape F1's rite rows borrow (from memory; details change between versions).
