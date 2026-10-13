# City screen audit — Magister Ludi

Date: 2026-10-12. Scope: how the city screen is arranged and how a player does the common jobs on it. It follows the HUD audit (`../ux-audit/audit.md`) and has to fit the HUD direction the user chose (`../ux-audit/final-e2.md`: the empire panel and its drawer at the top-left, commission chips in the left column, End Turn at the bottom-right carrying the waiting list).

Screenshots are in `shots/` (full size) and `web/` (downscaled, used by `ux-city.html`). They were taken in headless Chromium against the dev server on port 5199, which runs `/Users/jacky/code/webciv-play` at commit `de4af78`. `src/ui/cityPanel.ts` there differs from the `decks` tree only by the levy menu (`git diff`: the `levyMenu` import, `levyMenuOpenFor`, `renderLevy` and its call in the town rail), so the screen in the screenshots is the screen in the repo apart from the levy, which I read in code. Line numbers below are for the `decks` tree.

Two cities were captured:
- **Early:** a new game, turn 1, the capital just founded (size 1), with a Warrior and a Worker queued.
- **Late:** the 90-turn bot-played save from the HUD audit (seed 4242, 4 seats), loaded through Load → Import. Aldermarch (size 11, the capital) at 1440 × 900 and 1280 × 800; Larkspur (size 7, nothing queued) at 1024 × 768, because the camera at that size framed it first.

## Summary

The city screen is in good shape as a *mode*: the town's name owns the top edge, the board stays live between two rails, Escape backs out one layer at a time, and every figure is the simulation's own. The problems are in the two jobs players do most, building and buying, and in how much of the screen's information sits behind hovers.

The three that hurt most:

1. **Buying is hard to read and sometimes impossible from where you look.** Price tags that cannot be used are shown in red italics, and the reason is only in a native browser tooltip. In Aldermarch at turn 91, 10 of the 12 unit tags are refused, 6 of them for one reason ("A Swordsman already stands in Aldermarch — move it first"), which the screen never states once. The building you are building has no buy tag anywhere, because rows already in the queue leave the list (`cityPanel.ts:2702`); to buy it you remove it from the queue first. The treasury is not on the screen at all, because the city mode hides the top bar and the 2026-08-27 ruling took the treasury figure off the build list on the grounds that the top bar shows it.
2. **The build list is three screens long and starts with what you can least use.** At turn 91 the right rail's content is 1,791 px tall in a 727 px rail (2.5 rail heights; 3.8 at 1024 × 768). Units come first, so the buildings start below the fold. Twelve rows in Aldermarch can never be pressed today (six refused buildings and wonders, six faith "Call a …" rows, one of them for the retired augur). One row looks pressable and silently does nothing: **Trader** (a bug, below).
3. **The yield chips do not explain themselves from the screen.** Every chip raises the same list, and that list leaves out the land the town works and its centre (`PANEL_LEDGER_STEPS = [4, 8, 5, 6]`, `cityPanel.ts:535`). In the new capital the food chip reads 4, and its hover shows only "Happiness +5" and "Authority +6" percentage lines. To find where the 4 food comes from you hover each ringed hex.

**Recommendation: Arrangement A, "the same two rails, each with one job done well".** Keep the mode as ruled on 2026-09-03; add a Buy button to the "Building now" card, state refusals on the screen, fold the rows you cannot use, give each chip its own complete list, add a "short of" line to the band and previous/next town arrows, and put the Supply counts at the head of the build list as the HUD spec asks. About 4 days in three shippable steps. Arrangement B (one panel on the right, HUD left in place) is the better long-term fit with the E2 HUD but reverses a ruling the user liked; Arrangement C (a yield table along the bottom) is the most rule-5 of the three and the most expensive.

## Method

- Read `src/ui/cityPanel.ts` (3,664 lines) and `src/ui/levyMenu.ts`; the city-mode CSS in `src/style.css` (`.city-mode` 4462-4720, the narrow-screen block at 9044); the click precedence, Escape order and pan lock in `src/ui/controls.ts` (`openCity`/`setOpenCity` 4817-4860, board clicks 6770-6820, keys 8016-8100); the vignette (`src/render3d/vignette3d.ts`) and the worked-tile rings (`src/render3d/overlays.ts:422-440`); `docs/city-screen.md` (the 2026-09-03 rulings that produced today's layout).
- Drove the game in headless Chromium at 1440 × 900, 1280 × 800 and 1024 × 768: opened each town, hovered the yield chips, a build row and a buy tag, clicked every add-list tab, scrolled the work rail to the bottom, opened every disclosure, armed Buy tiles, hovered a hex, queued items, and clicked the Trader row to see what happens. Scripts are in `work/`.
- Measured boxes with `getBoundingClientRect` and the rails' `scrollHeight` against `clientHeight`; read every buy tag's `title` (its refusal).
- Checked the reference games online. Where a detail could not be confirmed it is marked.

## Inventory

### Layout at 1440 × 900 (Aldermarch, turn 91)

| Part | Where | Size | Source |
|---|---|---|---|
| Name band: name, capital star, `Size 11`, `190/190 hp` (wall ledger in a tooltip), siege badge, faith badge | full width, top | 1440 × 84 | `renderBand` 3291 |
| Six yield chips (food, prod, gold, sci, cult, faith); hover raises the ledger | band, right end | ~300 × 44 | `renderYieldChips` 1589 |
| **Town rail** (left) | x 14, y 96 | 230 × 727 | `renderTownRail` 3333 |
| · Growth meter (`+17 food · 5t`, bar, `8/11 working`, `38 / 114`) | first card | | `renderGrowth` |
| · Borders meter (`+18 culture · 2t`, bar, `Next tile 93 / 122`) and **Buy tiles** | first card | | `renderBorders` |
| · Focus: Default · Food · Production · Gold, and Avoid growth | first card | | `renderFocusPane` 1959 |
| · Settler note ("Working for production — a settler is at the front"), only when it applies | own card | | `renderCitizenFocus` |
| · Specialists row with a Dismiss per family (absent until a guild exists) | own card | | `renderSpecialists` |
| · **Levy a citizen ▾** and its menu (decks only; absent unless a card grants a levy) | own card | | `renderLevy` 2085, `levyMenu.ts` |
| · Disclosures, closed by default: Defence 67 · Built 14 · Routes 1 · Faith N · Rites | own card | | 3380-3436 |
| **Work rail** (right) | x 1126, y 96 | 300 × 727 | `renderWorkRail` 3439 |
| · "Building now": name (info card on hover), `60/89 · 1t`, ×, bar, contribute buttons when a card offers them | first card | | `renderProduction` 2197 |
| · Queue rows from 2, each with ↑ and × | first card | | `renderQueue` 2345 |
| · "Add to queue": tabs All · Units · Buildings · Wonders · Projects | second card | | `renderBuildables` 2462 |
| · Build rows (name, cost, turns, building preview) with a gold or faith buy tag beside each | second card | 29 rows + 6 faith rows | |
| · Caption: "A tag buys the row outright · 4 gold per hammer of full cost · banked hammers stay banked" | foot of list | | 2857 |
| · Puppet card (Annex, Raze) and the locked line | after the list | | `renderPuppet` |
| Board caption (tutorial on, or Buy tiles armed) | bottom centre, above Leave | 480 × 40 | `renderBoardCaption` 3481 |
| **Leave the town · Esc** | bottom centre | 176 × 36 | `renderLeave` |
| Hex hover card | bottom, right of centre (moved off the left rail in city mode) | 252 × 153 | `style.css:4686` |
| End Turn | bottom-right, unchanged | 175 × 49 | |
| Hidden in city mode | top bar, research card, dock, holdings card, **commission chips**, meters, popovers | | `style.css:4621-4632` |
| On the board | worked hexes ringed (bone white; pinned ones in the seat's ink), yields lens forced on inside the work radius, the world outside dimmed, free pan locked | | `overlays.ts:422`, `vignette3d.ts`, `controls.ts:7924` |

At 1280 × 800 the rails keep their widths and get shorter (627 px). At 1024 × 768 they keep their widths too: the 860 px breakpoint that narrows them to 196 and 244 px does not apply, so the board between the rails is **466 px wide**, 46 % of the screen.

### Every action, with clicks from the world map

Counting from the world with the town's banner visible. "Hover" is a pointer rest, not a click.

| Job | How today | Clicks |
|---|---|---|
| Open a town | click its banner or its hex; End Turn's "choose production" blocker also opens it | 1 |
| Choose what to build (empty queue) | click a row; at turn 90 the buildings are below the units, so scroll or press the Buildings tab first | 1-2 + scroll |
| Change what is being built now | × the front, then click the new row; or click the new row (goes to the back) and press ↑ once per item ahead of it | 2, or 1 + queue length |
| Reorder the queue | ↑ on a row (no down, no drag) | 1 per step |
| Buy a unit or building not in the queue | its tag | 1, if the row is on screen |
| Buy what is being built now | × it, find its row again, press its tag | 2 + search |
| Learn why a tag is refused | hover the tag and wait for the browser tooltip | hover per tag |
| Pin or move a citizen | click a ringed hex (pin) or another hex in the radius (move one there) | 1 |
| Set the focus or Avoid growth | one segment or the checkbox | 1 |
| Dismiss a specialist | Dismiss, then confirm | 2 |
| Buy a tile | Buy tiles, then a priced hex; Esc to stop | 2 (+1) |
| Levy a citizen (decks) | Levy a citizen ▾, then a line | 2 |
| Start a rite | open Rites (opens itself when one is affordable), then the rite | 1-2 |
| Read where a yield comes from | hover a chip (partial); hover each worked hex for the land | 1 hover + 1 per hex |
| See what the town is short of | read the Growth line (starving), "Nothing queued", the siege badge, and each refused row | no single place |
| Go to another town | Esc (or click outside the radius), find its banner, click it | 2 + search |
| Leave | Esc or Leave the town | 1 |

## Problems, ranked by how much they hurt play

### High

**1. Buying: refusals are invisible, the current build cannot be bought, and the treasury is off screen.**
- Every refused tag is red italic and disabled; its reason is a native `title` (`priceTag`, `cityPanel.ts:2879-2930`). Native tooltips take about a second, are unstyled, and do not exist on touch or for keyboard focus.
- Aldermarch, turn 91 (`web/buylist.jpg`): 10 of 12 unit tags refused. Six say "A Swordsman already stands in Aldermarch — move it first", two say "Aldermarch is not on the coast", one is Legionary's Iron, one is the Trader (below). Then six faith rows, all refused: retired augur, prophet (needs 120 faith, has 51), apostle and inquisitor (technology), Templars and canoness (not open). Of 25 tags, 3 can be used (Settler, Worker, War Hall).
- Red italic means three different things: cannot afford now, cannot buy here this turn, and can never buy. They look the same.
- **The building being built has no tag.** A building that is queued or at the front is dropped from the add list (`cityPanel.ts:2702`), and the "Building now" card offers only ×. To buy Smithy you press × and then find Smithy's tag. Humankind puts the buyout on the queued item itself: "Under its name, you will find its cost in gold and a BUYOUT option".
- **The treasury is not on screen.** The 2026-08-27 ruling removed "263 gold on hand" from the build list because "the number is on screen already, a hand's width above this" (comment at `cityPanel.ts:2840-2848`). On 2026-09-03 the city mode began hiding the whole top bar (`style.css:4621`). The premise of the earlier ruling no longer holds; only Buy tiles mode prints the treasury (`renderBoardCaption`). This needs the user's ruling before anything prints it again.

**2. The build list is long, ordered for the rules rather than the decision, and full of rows you cannot use.**
- Work rail content against its height (`scrollHeight`/`clientHeight`): Aldermarch 1,791 / 727 at 1440, 1,791 / 627 at 1280; Larkspur 2,289 / 595 at 1024. The All tab is the default by the user's ruling (`ADD_TABS`, docblock at `cityPanel.ts:458`) and prints units, then buildings, then wonders, then projects. At turn 91 the first building is about a full rail below the top (`web/buylist-bottom.jpg`).
- Rows you cannot use stay at full size in the list: Legionary (Iron 0/4), Harbour, Courthouse, Lighthouse, Great Lighthouse, Colossus, plus the six faith rows. In the new capital, five "Call a …" faith rows are taller than its four units (`web/early-rail.jpg`).
- **Bug: the Trader row is enabled and does nothing.** The unit loop greys a row only for size and resources (`cityPanel.ts:2544-2580`); it never asks `buildError`, which refuses `routeOnly` units ("Traders are not built — a caravan is hired on the trade sheet", `tech.ts:1061`). Clicking Trader in Aldermarch left the queue unchanged and showed nothing (probe in `work/probe.cjs`). Every refused command on this panel is silent (`commit`, `buy`, `give` return on `!ok` at 953, 971, 988).
- **Bug-adjacent: the retired augur's "Call an augur" row still prints** in every town; the purchase-only loop checks `awaitsTech` but not `retired` (`cityPanel.ts:2656-2667`).
- No way to put a new row at the front. Every click appends before the projects (`insertionIndex`), so "build this now" costs extra presses of ↑.

**3. The yield chips do not add up on screen (rule 5).**
- Each chip binds the same `yieldLedger` (`cityPanel.ts:1621`). Hovering science shows gems, incense, dyes, olives, honey, whales, copper, the buildings, the specialists and the happiness line for all six yields (`web/ledger-sci.jpg`).
- The ledger prints steps 4, 8, 5 and 6 of `docs/yields.md` only (`PANEL_LEDGER_STEPS`, 535): luxuries, buildings, specialists, caravans. The town centre and the worked land are left to the hex hover card. In the new capital the food chip says 4 and its hover shows only two percentage lines (`web/ledger-early.jpg`). Nothing on the screen adds up to 4.
- The simulation already has the lines (`readCity`'s `quote.lines` carries every step). The data rule is kept; the screen just does not show the fold's first half. The 2026-09-03 ruling was "the breakdown is one hover deeper and no shallower"; adding a one-line summary of the land keeps it one hover deep.

### Medium

**4. "What is this town short of?" has no answer in one place.**
- Starving is the Growth line in red; idle is "Nothing queued" in the work rail's first card, in plain ink (`web/late-1024.jpg`, Larkspur); a siege is a band badge; a missing strategic resource is a red line on each row that needs it; an unaffordable rite is a sentence repeated on each rite row ("… asks 72 faith and Crimson has 51", four times).
- The HUD spec moves the Supply counts out of the HUD and into "the head of the build list" (`final-e2.md` §1). The city screen does not have that strip yet.

**5. No way to go from one town to the next.**
- No previous/next control or key; the band has the name only. Free pan is locked while the mode holds (`panLocked`), so you leave (Esc), find the next banner, and click it.
- At the turn-91 zoom the banners overlap: Aldermarch spans x 588-839 and Oakenshade x 512-782 on the same row (y 390). The first scripted click on Aldermarch's banner opened Oakenshade.
- Humankind has arrows "on each side of the city name" at the top of its city panel that step through your cities (Amplitude forum, below).

**6. Much of the information is in native tooltips.**
- `cityPanel.ts` sets 29 `title`s; `levyMenu.ts` sets 2. They carry the growth modifiers, the border authority line, every buy refusal, the hit-point ledger, the focus hints, the guild bar, rite previews, the routes slot line and the Dismiss reason.
- The panel already has a proper card (`createInfoCard`, used for build rows and the yield chips). Rows and tags should use it so the reason appears with the hover styling, on focus, and on touch.

**7. Citizen management depends on faint board marks.**
- Worked hexes are thin rings, bone white when the game chose them and seat ink when pinned (`overlays.ts:422-440`). At turn 91, with the yields lens and the improvements, they are hard to pick out (`web/late-1440.jpg`).
- "8/11 working" does not say where the other three are (two specialists and one idle; the explanation is the specialists row's tooltip).
- The only instruction ("A ringed hex is a tile this city works…") appears with the tutorial or in Buy tiles mode, by ruling.

### Low

**8. The bottom edge collides.** At 1440 the board caption, the hex hover card and Leave the town overlap (`web/bottom.jpg`); at 1024 the hover card sits behind Leave (`web/early-1024.jpg`). The hover card was moved to the right of centre for a good reason (`style.css:4686-4700`), and the caption was centred above Leave; nobody owns the shared strip.

**9. Decisions are in the read-mostly rail.** The left rail is meant for "standing facts rather than decisions" (`renderTownRail` docblock), but it holds the focus control, Dismiss, Buy tiles, the levy and the rites. The focus and Buy tiles belong there (they move the two clocks). The levy (a citizen into hammers or a unit) and rites (faith into a timed effect) are spending, like the buy tags on the right.

**10. The band's middle is empty.** At 1440 the name ends at x ~270 and the chips start at x 1130. The band is 84 px tall for one line of identity and six chips.

## Heuristics check (from the `ux-audit` procedure)

| Heuristic | Score | Findings |
|---|---|---|
| Visibility of system status | 3 | The clocks are clear; idle, short and treasury are not on screen. |
| Match with the real world | 4 | Plain words ("Building now", "Size", "Next tile"). |
| User control and freedom | 3 | Escape backs out one layer at a time; no town-to-town move; × is the only way to change the front. |
| Consistency and standards | 3 | Red italic means three different refusals; tooltips are half native, half info cards. |
| Error prevention | 2 | The Trader row accepts a click it cannot honour; refused tags look like prices. |
| Recognition rather than recall | 2 | Reasons, the land's yields and the treasury are all hidden or off screen. |
| Flexibility and efficiency | 2 | No keys beyond Escape; no "build now"; 2.5-3.8 rail heights of scrolling. |
| Aesthetic and minimalist design | 3 | Handsome and consistent with the specimen; refused rows and repeated sentences add noise. |
| Help users recover from errors | 2 | A refused command changes nothing and says nothing. |
| Help and documentation | 3 | Row info cards are good; the board instruction shows only with the tutorial. |

**Overall: 27 / 50.**

## What the reference games do

Confirmed details are cited; anything I could not open is marked.

**Humankind**
- The city panel opens on the right: "the window that pops up on the right side of the screen once you click on your City" (DiamondLobby); "the production queue … is displayed on the right side of the screen" (Sullla).
- Buying sits on the item: "Under its name, you will find its cost in gold and a BUYOUT option that instantly builds the unit" (DiamondLobby).
- Previous/next city: arrows "in the top of the right panel, on each side of the city name" switch between "all my cities AND outposts" (Amplitude forum).
- Population is assigned to Food, Industry, Money or Science slots rather than to hexes (Sullla). A panel at the top of the screen shows the assignment, and the construction view has tabs — *both reported in TechRaptor's beginner guide, which I could not open (HTTP 403); taken from the search excerpt, so unconfirmed.*

**Endless Legend 2**
- Amplitude's November 2025 report names the old construction order as the problem: "when you build a district you select where you want to place the district, then what district you want to place", and "There is no place to see all the available districts".
- The December 2025 report ships the new flow: choose the district from a list first, then where; the game recommends a placement (a thumbs-up), and upgrade previews show the changed yields.
- A planned redesign (October 2025) was reported as "placing all city information in the lower part of the screen", with population management and the construction menu open at the same time. *Source is a Russian news article (Shazoo) describing Amplitude's concept sketches; concepts, not shipped.*
- Amplitude's game director, September 2026: nested tooltips, because "less clicking is better" (Power Up Gaming).

**Civilization VII**
- Firaxis' "Developing Settlements" post (update 1.2.5): the Settlement Production menu shows each building's base yields; the predicted yields moved to the placement step, where hovering a tile "updates the left panel with a summary of Settlement Yield changes", with an optional expanded panel itemising before-and-after figures. Growth events offer Add Improvement or Add Specialist in the same left panel.
- The city has separate production and purchase tabs; players complain that after a purchase "you constantly get set back to the production tab instead of the purchase tab" (Steam discussion). *Exact tab names and positions not confirmed from an official source.*

What this means for us:
- **Buy on the item, including the current build** (Humankind). Ours cannot buy the current build.
- **Previous/next arrows on the city name** (Humankind). Ours has none.
- **Show all options, then place** (EL2's fix, Civ VII's split). Ours already lists everything; the lesson is to make the list's options legible (fold what cannot be built, explain refusals once).
- **Keep the purchase view where the player left it** (the Civ VII complaint). Ours already remembers the add tab in module state (`addTab`); keep that for any new tab.
- **Yields itemised before and after** (Civ VII). Ours itemises building previews well; it is the town's own chips that are not itemised in full.

## Three alternative arrangements

All three keep: the mode (the board live, citizens pinned by clicking hexes, Buy tiles on the board, the dimmed world, the pan lock), Escape's order, the ink-on-parchment look, every figure read from the simulation, and rule 5. All three fix the two bugs (Trader, retired augur) and add a visible reason to refused tags and a short line when a command is refused; those are not arrangement choices.

HUD fit, for all three: End Turn keeps its corner and its waiting-count badge while a town is open, because the waiting list is still the thing that ends the turn. The Supply counts head the build list, as `final-e2.md` §1 specifies.

### A — The same two rails, each with one job done well (recommended)

Today's anatomy, with the work rail made into the place you decide and spend, and the band made into the place you read the town at a glance.

**Band (top edge):**
- `‹ Aldermarch ✶ ›` with previous/next arrows; keys `,` and `.` (no listener in `src/ui/*.ts` or `main.ts` reads either today). The order is the seat's cities in founding order; whether puppets are included is a question for the user.
- `Size 11 · 190/190 hp`, the siege and faith badges as now.
- **Short-of chips** in the middle, only when true, each one a link to where it is fixed: `Idle` (to the build list), `Starving` (to Focus), `Under siege`, `Unhappy`, `No Iron spare`. Nothing when the town is fine.
- **Treasury** `437 gold · 51 faith on hand`, small, beside the six chips. *Needs the user's ruling: the 2026-08-27 ruling's premise is gone.*
- Each yield chip raises **its own list**: the centre, "Worked land (8 hexes)", then the existing lines for that yield only, so the list sums to the chip. A click pins it.

**Town rail (left, 230 px), "the town and its people":**
- Growth, Borders + Buy tiles, Focus + Avoid growth (unchanged).
- "Citizens 11: 8 on land · 2 specialists · 1 idle" as one line, replacing "8/11 working".
- Specialists and Dismiss (unchanged).
- Defence, Built, Routes, Faith disclosures (unchanged).
- When a commission is seated whose count this town can move (hexes owned, improved tiles worked, treasury; `CommissionFigure`), one quiet line: `Commission · 93 / 150 hexes`. Optional; it keeps the left column's job from the HUD while the chips stand down.

**Work rail (right, 300 px; 320 if room), "build and spend":**
- **Building now**: name, bar, `60/89 · 1t`, ×, and a **Buy · 356 gold** button (the same `priceTag` the row would have had).
- Queue rows with ↑, ↓ and ×.
- **Supply strip**: the five strategic counts, `Iron 0/4` in vermilion when nothing is spare (from `holdingsRail.ts`' `strategicHoldings` and `copiesFigureNode`).
- Tabs, All first as ruled. Inside each shelf: the rows you can build first, then a fold, `Not yet · 6 ▸`, holding the rest with their reasons in full. The fold remembers its state as the disclosures do (`openDisclosures`).
- A row's click adds it to the back, as now; a small **Now** action on hover or focus (and Shift-click) puts it at the front.
- A shared refusal is said once, at the head of its shelf: "Units cannot be bought here this turn: a Swordsman stands in Aldermarch." The tags it covers grey out without red. Red stays for "cannot afford".
- **Spend** card after the list, absorbing what is spending today: faith purchases ("Call a prophet · 120 faith"), **Rites** (moved out of the left rail's disclosure; the price said once: "Rites cost 72 faith; you have 51"), and **Levy a citizen** (moved from the left rail).
- Trader row replaced by a line, "Caravans are hired on the trade sheet →", which opens Trade.

**Bottom:** Leave the town at the centre; the board caption and the hover card share the strip by rule (caption above Leave, hover card to the right of Leave's right edge, never under it).

**Board:** pinned rings drawn thicker than chosen ones, so pinning is visible without colour alone.

Borrows: Humankind (buy on the item, arrows on the name); Civ VII (itemised yields); EL2 (show everything you can build, with the reason for what you cannot).

Cost:
- `cityPanel.ts`: per-chip ledger with the land and centre lines (~90); band arrows and short-of chips (~100); Buy on the front card, ↓, Now (~80); shelf folds and shared refusals (~120); Spend card, moving rites and levy (~60, mostly moves); Trader line and the `retired` check (~15); titles to info cards (~60). About +500 / −150.
- `controls.ts`: `nextOwnCity`/`prevOwnCity` through `setOpenCity`, keys (~50).
- `style.css`: ~150. `overlays.ts`: pinned ring width (~10).
- Tests: `test/ui/cityPanel.test.ts` (ledger rows now sum to the chip; a new pure `chipLedgerRows`), `cityPanelRefresh.test.ts` (no new render-key terms unless the fold joins `addTab`), `cityScreen.test.ts`, `test/ui/cityModifiers.test.ts`.
- **About 4 days**, in three steps (see Recommendation).

Risks:
- The band gets busier; the short-of chips must stay absent when nothing is short.
- The treasury needs a ruling; without it, the Buy button still works but the player cannot see the bank.
- The rails still scroll at turn 90; folding cuts Aldermarch's 35 lines to about 22, which still exceeds a 727 px rail.
- `,` and `.` may be wanted elsewhere; confirm before binding.

### B — One panel on the right; the HUD stays

The town becomes a single tabbed panel on the right, as in Humankind; the left of the screen keeps the E2 HUD.

**Top bar:** stays (the E2 bar, 13 items). The gold and faith banks are therefore on screen, which settles the treasury question without reprinting it.

**Left:** the empire panel and the commission chips stay visible. Commission counts that this town moves update live as you pin citizens and buy tiles. The drawer opens on click only while a town is open (no hover opening over the board you are clicking).

**Right panel (380 px, from under the bar to above End Turn):**
- Header: `‹ Aldermarch ✶ ›`, Size, hp, badges; the six chips (each with its own complete list); the short-of line.
- Tab strip, remembered in module state: **Build · Buy · People · Town**.
  - **Build**: Building now with its Buy button, the queue, the Supply strip, the list with folds and the Now action.
  - **Buy**: every way to turn a bank into something now, one list: gold tags (units, buildings, the current build first), faith purchases, rites, the levy, contribute. Refusals grouped by reason.
  - **People**: Growth, Focus and Avoid growth, the citizen line, specialists, the faith followers.
  - **Town**: Borders and Buy tiles, Defence, Built, Routes.
- Leave the town at the panel's foot, not the board's.

**Board:** the left two thirds; the camera bias moves the town left of centre (`cityFrameBiasPx` becomes about −(380 + 14) / 2, against the 200 px HUD column on the left).

Borrows: Humankind (one right panel, arrows on the name); Civ VII (separate Build and Buy views, with the lesson from its players' complaint: do not jump back to Build after a purchase).

Cost:
- `cityPanel.ts`: a new panel shell and tabs (~300), the content changes from A (~400), removal of the two-rail layout (~−250).
- `style.css`: the city-mode block rewritten (~250); the stand-down rule changes (bar, empire panel and chips stay; only the hover card moves).
- `data/view3d.json` and its pin in `test/ui/cityScreen.test.ts` (camera bias); the vignette's ellipse follows the camera so needs no change.
- The E2 drawer's "never open on hover while…" list gains "a town is open".
- `tutorial.ts` anchor on `#city-panel` keeps its id.
- **About 7-8 days**, after the E2 HUD lands.

Risks:
- **It reverses the 2026-09-03 ruling** ("the band owns the top edge", "Ok i much prefer this, lets ship this"). Needs the user.
- Tabs hide the People view while you build. The board still shows the worked hexes, but Growth and Focus are a tab away.
- One 380 px panel at 1024 × 768 leaves a 616 px board; fine for the work radius, but the panel is long under every tab.

### C — The town's ledger along the bottom

EL2's planned move, taken further: the town's figures become a table along the bottom, the board gets the full width, and the build list opens only when you choose.

**Band (top, slim, ~56 px):** `‹ Aldermarch ›`, Size, hp, badges, short-of chips, the treasury (ruling as in A). No yield chips here: they are in the table.

**Bottom dock (full width minus End Turn's corner, ~220 px tall), three columns:**
- **People** (left, ~260 px): Growth, Borders + Buy tiles, Focus, the citizen line, specialists, Levy.
- **The yield table** (middle): one row per source (Town centre, Worked land, each luxury, each building, specialists, caravans, Happiness %, Authority %), one column per yield, totals at the foot equal to the chips. This is rule 5 made the centre of the screen, with no hover at all. Rows scroll inside the table; the total row stays.
- **Now and next** (right, ~300 px): Building now with Buy, then the queue as a short horizontal run of cards with turns; an **Add ▸** button.

**The chooser:** Add (or clicking an empty queue slot) slides a tall list out from the right edge over the board: tabs, Supply strip, folds, tags, Spend card as in A. It closes after a pick unless pinned.

**Left:** the empire panel and commission chips can stay at the top-left above the dock, since the left edge is free.

Borrows: EL2 (all city information in the lower part of the screen, population and construction open together); Civ VII (itemised before/after figures, a separate chooser step).

Cost:
- `cityPanel.ts`: the dock layout (~250), the yield table built from `quote.lines` with land and centre summaries (~200), horizontal queue cards (~150), the slide-out chooser (~200), plus A's content fixes (~400).
- `camera3d.ts` and `lookData.ts`: the city frame bias is horizontal only today (`camera3d.ts:402-431`); a vertical term is new code, a new `data/view3d.json` knob and its pin.
- `style.css`: the city-mode block rewritten (~300). End Turn and the hover card placement rules.
- **About 2 weeks.**

Risks:
- **Height.** At 1024 × 768: 768 − 56 − 220 = 492 px of board; the work radius at the default zoom needs about that. At 1280 × 720 it is tighter.
- The chooser hides the board's right third while open.
- Six columns of numbers is a dense table; it needs the specimen's tabular mono and careful zebra rules.
- The largest rewrite of the three, and the camera change touches the renderer.

## Compared

| | Today | A · two rails, done well | B · one right panel | C · ledger along the bottom |
|---|---|---|---|---|
| Board between panels, 1440 × 900 | 882 × 727 px | ~862 × 727 | ~1032 × 820 (left HUD floats over it) | 1440 × ~610 |
| Board, 1024 × 768 | 466 × 595 | ~466-510 × 595 | ~616 × 690 | 1024 × ~490 |
| Change what is built now | 2 (× + row) | 1 (Now) | 1 (Now) | 2 (Add + row) |
| Buy the current build | 2 + search | 1 | 1 | 1 |
| Why a tag is refused | hover, native tooltip | on screen, once per reason | on screen (Buy tab) | on screen (chooser) |
| Where food comes from | hover chip (partial) + each hex | 1 hover, complete | 1 hover, complete | always on screen |
| What the town is short of | scattered | band chips | header line | band chips |
| Next town | 2 + search | 1 (or key) | 1 (or key) | 1 (or key) |
| Treasury on screen | no | yes, after a ruling | yes (top bar) | yes, after a ruling |
| HUD while in a town | all stands down but End Turn | same | empire panel, chips and bar stay | panel and chips may stay |
| Rulings needed | — | treasury; keys | reverse 2026-09-03 | treasury; reverse 2026-09-03 |
| Size | — | ~4 days | ~7-8 days | ~2 weeks |
| Main risk | — | still scrolls at turn 90 | reverses a liked ruling | height at 768 |

## Recommendation

**Build A**, in three steps, each shippable:

1. **Buying and the bugs** (about 1 day): the Buy button on the "Building now" card; refusals on screen (one line per shared reason, short reason under a lone refused tag, grey for "not here", red for "cannot afford"); the Trader row becomes the trade-sheet link; the retired check in the purchase-only loop; a one-line note in the rail when a command is refused. Ask the user about the treasury in `docs/flags.md`.
2. **The town at a glance** (about 1.5 days): each chip its own complete list (centre and worked land first), the short-of chips, previous/next arrows and keys, the citizen line.
3. **The build list** (about 1.5 days): the Supply strip, the "Not yet" folds, Now and ↓, the Spend card (faith purchases, rites, levy), titles moved to info cards.

Keep B in view. Once the E2 HUD lands, a town screen that leaves the empire panel, commission chips and top bar in place is more consistent with it, and the commission counts that city actions move would update in sight. A's content changes carry over to B unchanged, so A is not wasted if the user later prefers B. C's yield table is worth taking on its own as the pinned view of a chip (click a chip in A to pin a full six-column table), which costs a day and puts rule 5 on screen without moving anything.

## How to test

- With the 90-turn save, ask a new player: "Buy the Smithy." "Why can't you buy a Bowman here?" "Where does this town's food come from?" "Go to Hollowmere." Count clicks, hovers and wrong turns before and after.
- Measure the work rail's `scrollHeight` at turn 90 in the three sizes; target under two rail heights with folds closed.
- A core test that each chip's list folds to the chip for every town in the 90-turn save (the rule-5 pattern of `test/ui/cityModifiers.test.ts`).
- A test that no enabled build row is refused by `buildError` and no enabled tag by `purchaseError` (catches the next Trader).

## Sources

- DiamondLobby, *How to make military in Humankind*: the city window "pops up on the right side of the screen once you click on your City"; "Under its name, you will find its cost in gold and a BUYOUT option". https://diamondlobby.com/humankind/how-to-make-military-in-humankind/
- Sullla, *Humankind Tutorial Game Part One*: "The production queue for Memphis is displayed on the right side of the screen"; population as Food, Industry, Money or Science specialists. https://sullla.com/HK/HKT1.html
- Amplitude forum, *QoL: traverse only cities*: arrows "in the top of the right panel, on each side of the city name" switch between "all my cities AND outposts". https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design-and-ideas/threads/49165-qol-traverse-only-cities-outpost-cluttering
- TechRaptor, *Humankind beginner guide* (search excerpt only; HTTP 403): population panel at the top of the city screen; tabs in the construction view. https://techraptor.net/gaming/guides/humankind-beginner-guide
- Amplitude, *State of the Game – November 2025* (Endless Legend 2): the old construction order and "There is no place to see all the available districts". https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/1015-%E2%80%8Bstate-of-the-game-%E2%80%93-november-2025
- Amplitude, *State of the Game – December 2025* (Endless Legend 2): the new construction flow, district first, recommended placement. https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/1021-state-of-the-game-december-2025
- Shazoo (Russian), *Sketches of Endless Legend 2's new interface*: concept of "placing all city information in the lower part of the screen", population and construction open together. https://shazoo.ru/2025/10/01/173683/nabroski-novogo-interfeisa-endless-legend-2-posle-kritiki-geimerov
- Power Up Gaming, *Endless Legend 2 full release … cut tedious clicking*: nested tooltips; "less clicking is better". https://powerupgaming.co.uk/2026/09/16/endless-legend-2-full-release-brings-overhaul-to-cut-tedious-clicking/
- Firaxis, *Developing Settlements* (Civilization VII): the Settlement Production menu's base yields, placement previews in the left panel, Add Improvement or Add Specialist. https://civilization.2k.com/civ-vii/game-guide/gameplay/developing-settlements/
- Steam discussion (Civilization VII): purchases "set back to the production tab instead of the purchase tab". https://steamcommunity.com/app/1295660/discussions/0/591762563949178511
