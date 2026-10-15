# HUD and screens: decisions so far

A working doc for the interface rework. It records what the user has settled, what is still open, and where the drafts live. Nothing here is built yet except where it says so. The build started on 2026-10-15; its batches are under "Build plan" below.

The audits and drawings behind these decisions are artifacts (private to the user):
- Commissions and levies mockup: https://claude.ai/artifact/AamrztC6ntoHoHVfeo4rLn
- HUD audit (today's problems, layouts A, B, C): https://claude.ai/artifact/664bbkGcFdghzRwSxxjdDU
- Iterations on B (B1 to B4): https://claude.ai/artifact/PeTtBeRtf2Q2Y6r5pvL6KK
- Compact B4 (B4a, B4b, B4c): https://claude.ai/artifact/Ai3VR7bTf1qMswc8EHM1Q4
- The empire panel (E1, E2, E3): https://claude.ai/artifact/J17JPskARuBt3PreyLzMTF
- **Final E2, the agreed design:** https://claude.ai/artifact/FMZ5C4xQh9jRe2FUyRdZ76 — its written spec is `docs/plans/hud-empire-panel-spec.md` (every element, its states, sizes, keys, and the code each part replaces)
- **City screen audit:** https://claude.ai/artifact/Jhzd7CgUYeizKK7ucRrsF5 — written version `docs/plans/city-screen-audit.md`

The written versions are in this folder: `hud-audit.md` (today's problems, layouts A, B, C), `hud-iterations.md` (B1 to B4), `hud-iterations-compact.md` (B4a to B4c), `hud-iterations-empire.md` (E1 to E3) and the spec, `hud-empire-panel-spec.md`. The three chosen drawings are in `mockups/`: `hud-e2-final.html`, `city-a-iterations.html` (A1 to A3) and `faith-f1.html`. The screenshots were not kept; the audit artifacts above carry them.

## Settled

### The top bar
- **Lean, about 13 items:** the six yields; happiness and authority as one chip; turn and age in the middle; **Diplomacy, Trade and Standings as labelled tabs at the right end** (the other empires' screens, carrying the trade-route, renown and bead figures); then **?** and **☰**. The Compendium moves into ☰ and the ? card. (Layout B4, the user, 2026-10-12: *"B4 seems to make the most logical sense to me."*)
- The aim is that nothing scrolls out of sight at 1024 px wide, as happiness, authority and the age clock did before.
- **Built** (batch UX1). As drawn, with these choices inside the spec: the renown figure on the Standings tab prints the pool alone (`✦57`) and puts the rung and rate in its tooltip, accessible name and hover card; the bead figure keeps the bar's existing ◉ mark; the tabs drop their printed names below 1200 px wide (kept for screen readers); the Abacus's door is a button in the standings sheet's header; and once the seat has ended its turn the turn line names who it is waiting for instead of the age.
- **Space covered at rest** (final E2, 1440 × 900): about 23,000 px² (1.9% of the board) with no commission seated, about 38,000 px² (3.1%) with two; today's HUD covers 70,101 px² (5.7%).

### The empire panel (top-left): version E2
The user, 2026-10-12: *"ok E2 is my favorite."* One drawer at the top-left, in two depths:
- **At rest:** abbreviated, small: the seat's banner and two thin progress bars, research and culture (the draft meter, which is this game's "civic" progress).
- **Depth one, on hover** (and on focus, and on a tap for touch): the drawer expands to full research and culture sections: the technology's name, turns left and progress; the draft meter, and the government line ("next government at …").
- **The research and culture sections are themselves clickable** and look it (cursor, hover and focus states, an affordance on the title): research opens the star chart, culture opens Statecraft. **No separate "Tech tree" or "Statecraft" buttons.** (The user, 2026-10-12.)
- **Depth two, on click** (or tap, Enter or Q): the drawer extends to the rest of the empire's screens and stays open until dismissed: Religion (H), Leader (L, a new key), an Age wager row (the wager sheet's first standing way in), and the Supply counts.
- **The drawer opens to the right of the panel,** not downward, so it never covers the commission chips and nothing moves when it opens.
- **The at-rest bars are not separate click targets;** the whole closed panel is one target (6 px bars are far below a usable target size). T and C still go straight to the star chart and Statecraft.
- **A draft waiting** shows at rest: the culture section's edge and "a card awaits".
- Keys stay: T opens the star chart, C opens Statecraft; the empire menu gets a free key (Q was proposed).
- Hover opens after a short delay and never while dragging the map or aiming a move.
- **Built** (batch UX3, `src/ui/empireDrawer.ts`). As drawn, with these choices inside the spec:
  - A peek (depth one, on hover or Tab) tells the screen registry nothing, so a pointer crossing the corner closes no other card; it still counts as open, so Escape closes it first and any card or screen opening closes it. Pinning (depth two) is a card opening, so it closes the other cards.
  - Only Tab opens a peek from the keyboard. The panel is also where the keyboard lands when the drawer closes, and a drawer that opened itself every time would be in the way.
  - Pinned, the drawer behaves like the other HUD cards: the keyboard moves to the research section, Tab wraps inside the drawer, and the × comes last in the tab order. Closing it with the keyboard inside returns the keyboard to the panel.
  - The H row reads **Faith** (the ruling in `docs/flags.md` (ssssss) 4.7), and its dot lights only for a belief to choose. The ? card says "H Faith" too; the sheet's own title is renamed in a later faith batch.
  - The banner is the seat's charge in ink on a parchment disc, inside a ring of the seat's colour. With nothing chosen to research, the panel's research bar turns gilt and pulses, as the research card did.
  - "Next government at N" names the next tier a government is actually offered at (4, 10, 18, 29, 45), not the next rung of the slot ladder.
  - The age wager row opens the wager sheet, as drawn, and reads "2 of 3 bars met" ("no wager this age" in Æra I).
  - The Supply heading is the house's grey eyebrow, not vermilion: vermilion means a shortage, and here it marks only the resources with none spare.
  - The leader sheet's trigger is the drawer's Leader row, so the panel's own "expanded" state only ever describes the drawer. The drawer has closed by the time the sheet does, so the keyboard goes back to the page.
  - The open-the-tree tutorial step rings the panel while the drawer is shut and the research section once it is open, and tells the player to click the banner, then Research.

### Commissions
- **Card face:** the goal and a counter (pips for small counts, a bar for larger ones); an unseated commission shows its kept progress as paused. **Built** (batch C).
- **Chips on the left side of the screen, under the empire panel and outside its drawer,** one per seated commission, at most four and then "+N more": a see-through background, a solid left edge in the deck's colour, a ring that fills, the name and the count in words; hover for the full goal and reward; click opens the government sheet at that card; "Fulfilled · reward paid" for one turn, then gone. (The user, 2026-10-12: *"Let's have commissions appear on the left side outside of the empire menu."*) **Built** (batch C), and moved under the empire panel in batch UX3: 200 px wide, the first chip at `top: 120px`, at most four (three on a window under 720 px tall), then a "+N more" line that opens Statecraft.
- Nothing about commissions goes in the top bar.

### Levies
- **Now: a "Levy a citizen" button in the city panel** with a menu: one line per use the player's cards grant, the exact figure, the granting card, the population change and when the city can levy again. **Built** (batch L).
- **Later, the user's preference: click a citizen token** to levy that citizen, showing the tile or job lost. Waits for the city panel to draw citizens as tokens; the levy menu is built so it can open from a citizen.

### End Turn
- **End Turn carries everything still waiting:** its label names the first item, a badge counts the rest, and hovering (or focus) lists them all, each a link. Replaces stacked notices. The chronicle and Lens sit as two small buttons beside it.
- **Built** (batch UX4, `src/ui/endTurnList.ts`). As drawn, with these choices inside the spec:
  - The list is `allBlockers` (`turnBlockers.ts`), which walks the same clauses in the same order as `firstBlocker`, so the label and the list's first row cannot disagree. The Statecraft pause (a banked charter, or an Order outside its slot) comes last, since a press mentions it but does not stop on it.
  - Idle units, carts and towns waiting on the same thing share one row with a count ("3 units need orders"); the row goes to the first of them, as a press would. A lone unit or town is named ("Scout needs orders", "Choose production in Aldermarch").
  - The badge counts rows after the first, so it matches what the list shows. Hidden while the others are moving.
  - The list opens 150 ms after the pointer rests on End Turn, at once on keyboard focus (Tab then walks its rows), never for a touch, and closes 300 ms after the pointer leaves. Escape inside it closes it and hands the keyboard back to End Turn. It is a hover card, not a card in the screen registry.
  - End Turn keeps one width (`--end-turn-w`, 264 px), sized for the longest label it says ("The others are moving…"), so the Lens and the chronicle no longer slide. "A government awaits your oath" became "A government awaits" to fit.
- **The toast over the empire drawer** (found in UX3): the drawer now stacks above the toasts. A centred toast reaches over the drawer on any window narrower than about 1430 px, and moving the toasts would have put them over the unit panel instead; the drawer is what the player opened and is reading, and every toast is kept in the chronicle.
- **The wager sheet after the stake:** since the drawer gave it a standing door, a visit mid-age refused the two cards not staked only after a press. Their buttons are now disabled, and the game's own reason ("You have already staked this age") is said once above the cards.

### Strategic resources
- **Their counts head the city build list,** where building decisions are made.

## Open
- **Supply off the map.** In every layout the resources table stops being always visible: it becomes a Supply entry in the empire menu, with a warning chip only while a resource has none spare. That reverses the rule recorded in `src/ui/holdingsRail.ts` (lines 20 to 45: the counts must be readable without a click). **Ruled 2026-10-15: yes, move it** (`docs/flags.md` (ssssss) 1); the red dot on the banner covers a resource with no spare copy. **Built** in batch UX3: the card and `holdingsRail.ts` are gone, and the counts are the drawer's Supply section (the old rule and its reversal are recorded in `src/ui/empireDrawer.ts`). The strip at the head of the town's build list is UX7's.
- **The city screen, settled by the user (2026-10-12):**
  - Arrangement A (keep the two rails, each with one job done well) is the direction.
  - The treasury shows on the city screen.
  - The terrain hover card sits at the bottom-left.
  - What a building or unit would add (the illustrative yields) shows only on hover, as a card over the right column, not inline in the rows.
  - A purchase always costs the full price, so no buy control may sit under a progress bar or read as "finish the rest".
  - The Spend card as first drawn was awkward and is being redesigned.
- **City screen buying and spending: A1, chosen by the user (2026-10-12).** Every row of the add list carries a price in one column headed "Buy outright · full price · you have N gold", in three looks: can buy (a pressable tag), short (the figure and "need N"), not here (a dash, with the reason stated once per section). Queued buildings, the current build included, stay in the add list marked "in queue · 1st" at the same full price, so the current build can be bought in one click. Spending sits beside the bank it draws on: the levy on the population (Size) line, rites in a Faith card in the town rail, faith purchases as a Faith shelf of the add list in the same price column. Hover cards over the right column carry the "would add" figures and the "Buy outright" line.
- **Hover rule, corrected by the user (2026-10-12):** "hover only" was about the **yield explanations**: hovering the food total (or any yield chip) in the city screen shows the breakdown of that yield's sources. It was not about the build list. Build rows keep **one inline mark for the item's main yield** (for example "+2 production"), so buildings can be compared at a glance; the full "would add" preview and the "Buy outright" line are in the row's hover card.
- **Shortening the build list, ruled by the user (2026-10-12), all five:** obsolete units and rows no technology has reached are already hidden. In addition: (1) one-line rows, since the multi-line previews were most of the height; (2) rows this town can never build (a harbour inland, a wonder another empire finished) are hidden; (3) rows blocked for a reason the player can fix (a missing strategic resource, too few citizens) fold into "Not yet · N" with the reason, so the player learns what to fix; (4) the Faith shelf is collapsed unless something in it is affordable; (5) the chosen tab is remembered per player.
- **Rites tab with many towns:** needs to be more ergonomic; the user is preparing notes for the next iteration.
- **City screen iterations (A1 chosen; A2 and A3 kept for reference):** https://claude.ai/artifact/NH1gNwDbS4znDYxyKPsa1N — written version `docs/plans/city-screen-iterations.md`. A1: a "Buy outright · full price" column on every row, spending beside each bank. A2 (recommended): a Build | Buy switch on the work rail; Buy lists gold, faith and citizens in one list with one cost column, replacing the Spend card. A3: buy from the row's hover card, and one Town actions list.
- **The city screen audit, as first written** (before the rulings above). It recommends **arrangement A, "the same two rails, each with one job done well"** (about 4 days): a Buy button on the thing being built; refusals stated on screen once per reason (grey for "not here", red for "cannot afford"); rows you cannot use folded into "Not yet"; each yield chip with its own complete breakdown starting from the town centre and worked land; "short of" chips; ‹ › arrows and the `,` `.` keys to step between towns; Supply counts heading the build list; one Spend card for rites, the levy and faith purchases. Alternatives: B, one tabbed panel (7–8 days, reverses the 2026-09-03 band ruling); C, a yield table along the bottom (about 2 weeks). Rulings it raises: whether the treasury may show on the city screen; the `,` and `.` keys; whether puppets are included when stepping between towns.
- **Two bugs the city audit found, live today:** the Trader row in the build list looks pressable but does nothing (the build is refused for `routeOnly`, `src/sim/tech.ts:1061`, and the panel never asks, `src/ui/cityPanel.ts:2544`); and the retired augur's "Call an augur" row still shows in every town (`src/ui/cityPanel.ts:2656` checks `awaitsTech`, not `retired`).
- **Small decisions inside the build:** the "screen registry" in `src/main.ts` that the audit recommends building first, since `main.ts` holds 19 hand-written lists of which screens to close. **Keys, ruled 2026-10-15** (`docs/flags.md` (ssssss) 2 and 3): Q opens and pins the empire drawer, L opens the Leader sheet, comma and period step to the previous and next town, and stepping includes puppets. Standings gets no key.

## Build plan (started 2026-10-15)

The user, 2026-10-15: *"Could we begin the UX overhaul that we started planning? That should go on in parallel while i'm a blocker on deck changes"*.

**Status: every batch below is built, gated and deployed (2026-10-15).** Each was committed on `decks` after typecheck, the core tests and the build passed; batches that touched the simulation or the bots also passed the bot replay digests unchanged. No batch changed the save format.

| Batch | Commit | | Batch | Commit |
|---|---|---|---|---|
| UX1 top bar | `a2e445ad` | | UX7 build list | `bbf164e6` |
| UX2 screen registry | `73dffb9a` | | UX7b city follow-ups | `6066464f` |
| UX3 empire panel | `005ec94a` | | UX8a faith bugs | `ac0b1dfe` |
| UX4 End Turn list | `d6f429e7` | | UX8b faith readings | `36f070f6` |
| UX5 city buying | `19c8232a` | | UX9 Faith tabs, Rites | `77fbbba7` |
| UX5b purchase shortfall | `f05a9c57` | | UX10, UX11 Bonuses, Religion | `4e052d90` |
| UX6 town at a glance | `8e66ef05` | | | |

Still open after the build: the top bar's fit at 1024 px has not been checked in a browser; a purchase can strand set-aside hammers (`docs/flags.md` (tttttt), held for the next save-format change); `pamphlet.ts` still says "the Religion screen", because its text is pinned as ruled.

- Two streams run at once, one agent each, on separate files: **the HUD** and **the city screen**. The faith screen's bug fixes run beside them; the rest of the faith screen waits for its rulings.
- Each batch is gated (typecheck, core tests, build), committed on `decks` and deployed to the play server before the next batch in its stream starts.
- The rulings the later batches wait on are in `docs/flags.md` item (ssssss).
- **Shared pieces:** the city screen builds the price column, the refusal line and the bank display (the list under "Shared components" below) as their own modules in `src/ui/`, with their own tests. The faith screen and the HUD use them instead of drawing their own.
- **Fences:** the HUD stream owns `main.ts`, `topBar.ts`, `hudDock.ts`, `holdingsRail.ts`, `commissionRail.ts`, `turnBlockers.ts`, the tutorial's anchors, and the top bar, dock, research card and End Turn corner in `index.html`. The city stream owns `cityPanel.ts`, `levyMenu.ts` and the modules it creates, and (from UX6) the city-mode parts of `controls.ts`. Each stream edits only its own blocks of `style.css` and `index.html`.

### HUD stream

| Batch | What | Spec | Waits on |
|---|---|---|---|
| UX1 | **The top bar (B4).** One meters chip. Diplomacy, Trade and Standings as labelled tabs at the right end, carrying the routes, renown and bead figures. Then ? and ☰, with the Compendium inside ☰. The Abacus, Lens, ❧ and ▤ leave the bar: ❧ and Lens become buttons beside End Turn, and the Abacus opens from the standings sheet and from A. The dock loses its Diplomacy, Trade and Standings doors, which are now tabs. | `hud-empire-panel-spec.md` §2, and §7 for the two buttons | — |
| UX2 | **The screen registry.** One function in `main.ts` opens a screen and closes the others, replacing the hand-written close lists. No visible change. | spec §9, step 2 | UX1 |
| UX3 | **The empire panel and its drawer (E2),** the commission chips under it, and the Supply section. Removes the dock, the research card and, if ruled, the resources card. | spec §3 to §6, §8 | UX2; (ssssss) 1 and 2 |
| UX4 | **End Turn's waiting list:** a count badge, and a hover list of everything still owed, each a link. | spec §7 | UX1 |

### City screen stream

| Batch | What | Spec | Waits on |
|---|---|---|---|
| UX5 | **Buying (A1).** The price column with its three looks. Queued buildings stay in the add list at full price. A shared refusal is said once per shelf. The treasury goes in the band. Faith purchases become a Faith shelf in the same column. A refused command says so in one line. Fixes the Trader row and the retired augur's row. Builds the shared price column, refusal line and bank display. | `city-screen-iterations.md` A1; the A1 bullet above; `city-screen-audit.md`, Recommendation step 1 | — |
| UX6 | **The town at a glance.** Each yield chip opens its own complete list (the centre and the worked land first, summing to the chip). Short-of chips. ‹ › town stepping and its keys. The citizen line. The terrain hover card at the bottom-left. | audit step 2; `city-screen-iterations.md` "Settled" | UX5; (ssssss) 2 and 3 |
| UX7 | **The build list.** The Supply strip at its head. One-line rows with one yield mark each. The "would add" preview and the buy line in a hover card over the right column. "Not yet · N" folds. Rows this town can never build are hidden. The Faith shelf is collapsed unless something in it is affordable. The tab is remembered per player. A "Now" action and ↓. The levy on the Size line. The Faith card, with the rites, in the town rail. Native tooltips become info cards. | audit step 3; the five build-list rulings and the hover rule above | UX6 |

### Faith screen stream

| Batch | What | Spec | Waits on |
|---|---|---|---|
| UX8a | **Four live bugs** from the faith audit (its §3, items 4 to 7): retired rites listed, card-taught rites naming a technology as their teacher, the augur in the sheet's header, and the duration printed twice and ignoring The Octave (which lifts `riteTurnsFor` out of `stampRite`). The founder share's line (item 8) needs its own source, so it goes with UX8b. | `faith-screen-audit.md` | — |
| UX8b | **The readings the screen needs:** `riteTurnsFor`, `explainRitePreview`, `explainReligionLedger`, the founder share's own source, and a meter line that carries its card. | `faith-screen-f1.md`, "Simulation pieces and size" | (ssssss) 4 |
| UX9 | The Rites tab, with rite mode. | F1, tab 1 | UX8b |
| UX10 | The Bonuses tab, with the deal and stamp animation. | F1, tab 2 | UX8b; (ssssss) 4 |
| UX11 | The Religion & followers tab. | F1, tab 3 | UX8b; (ssssss) 4 |

## The faith screen

- **The user's request (2026-10-12):** manage rites from the faith screen, and lay out every bonus the religion gives.
- **F1 chosen by the user (2026-10-12): three tabs, Rites, Bonuses, Religion.** Notes on it: the Rites tab should work like F2's middle column (your towns as rows, each with its rite and turns, or a Start menu) rather than one row per rite; the Bonuses tab keeps its information but must not read as a spreadsheet, and should be cards with the Orders screen's kind of animation and more visual elements. Revised mockup of all three tabs: https://claude.ai/artifact/1mCHSLtszinuuiGkhTygqj — written version `docs/plans/faith-screen-f1.md` (rites by town with a Start menu and a strip of known rites; bonuses as Orders-style cards with the deal, flip and stamp animation; the religion tab with who follows, rival pressure and clergy cards). About 7 days. Its open rulings were answered on 2026-10-15 (`docs/flags.md` (ssssss) 4): as proposed, except that the Bonuses tab shows only the religion's own sources, never Order cards, which belong to the Statecraft screen.
- **Final F1 comments, ruled by the user (2026-10-12):**
  - Tab 3 (Religion & followers) drops the god cards, follower belief cards and bonus figures; the Bonuses tab owns them. The pantheon wheel stays (it shows gods held and progress to the next; nothing is chosen on the faith screen).
  - Rites tab: narrower town rows so more towns fit; towns with no rite running appear at the top; selecting a rite re-orders the free towns by what it would pay, best first, with one click to start it in a town; with no rite selected, each free town keeps its "Start a rite" menu.
  - Confirmed by the user (2026-10-12): (1) the one-click button carries the price ("Start · 72 faith"), with no confirm dialog, and every remaining button greys out with "short N" once the bank cannot pay for another; (2) a rite that pays two kinds of thing ranks towns by its main yield, with the second shown beside it; (3) selecting the same rite again, or Escape, leaves the selected-rite mode.
- **Audit and three layouts:** https://claude.ai/artifact/2cmwZenBYFPeFm7UwEnE7K — written version `docs/plans/faith-screen-audit.md`. F1 (recommended): three tabs, Rites, Bonuses, Religion. F2: one page in three columns. F3: a rite calendar and a ledger.
- **Bugs it found, live today:** retired rites are listed (`religionScreen.ts` walks every rite, not `LIVE_RITE_IDS`); card-taught rites name a technology as their teacher (`religionScreen.ts`, `controls.ts`); the sheet header names the retired augur (`index.html`); rite duration is printed twice and ignores The Octave; the founder share's line carries a belief's id (`statecraft/evaluator.ts`).

## Shared components across the HUD, city and faith screens

The E2 HUD, the city screen (A1) and the faith screen (F1) were designed one at a time and each drew the same pieces. Before building any of them, define these once and use them on all three, so they behave the same everywhere:
- **A price column:** "Buy outright · full price · you have N", with the three looks (can buy, short by N, not here).
- **A refusal line:** why something cannot be done, stated once per reason on the screen, never only in a tooltip.
- **A hover card over the right-hand column:** what a thing would add, its price line, and a yield's source breakdown.
- **The bank display:** treasury, faith and their per-turn change, in one style wherever it appears.
- **A yield mark:** the same icon and number style for every yield on every screen.
