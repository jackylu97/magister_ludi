# HUD arrangement audit — Magister Ludi

Date: 2026-10-12. Scope: where the HUD puts things and how each screen is reached. The individual sheets (Statecraft, Religion, the star chart and so on) are out of scope; the user likes them.

Screenshots are in `shots/` (full size) and `web/` (downscaled). They were taken in headless Chromium against the dev server on port 5199. That server runs from `/Users/jacky/code/webciv-play` (branch `decks`, commit `de4af78`, an ancestor of the current `HEAD`). `index.html`, `src/style.css`, `hudDock.ts`, `holdingsRail.ts` and `topBar.ts` are byte-identical between the two trees, so the HUD in the screenshots is the HUD in the repo. The late-game state is a 90-turn game played by the bots for every seat (seed 4242, standard map, 4 seats) and imported through Load → Import.

## Summary

The pages are good; the frame around them is not yet arranged. Three things hurt most:

1. **The top bar carries four different kinds of information in one row and runs out of width.** It holds 13 readouts and 6 buttons. At 1280 px wide it is already at its tightest size step; at 1024 px the happiness and authority meters (the two figures that warn you) and the age countdown scroll out of sight.
2. **Screens are reached through five different kinds of door, and some of those doors are hidden.** Six unlabelled icons under the research card, eight top-bar numbers that are secretly buttons, six top-bar tools, seven letter keys, and End Turn's blockers. The Ledger opens only by clicking a yield number, the Reliquary only by clicking renown, and the wager and census sheets have no door at all once answered.
3. **Everything piles into the top-left.** The research card, the six-door dock and the strategic resources card take about 290 px of the map's top-left corner all the time, and the commission chips are about to join them. The strategic resources card is an inventory table sitting between the doors; it is not a door, a goal or a warning, and it is absent from the city screen, where you actually choose what to build.

Humankind solves the same problems by giving each corner one job: the empire and its goals at the top-left, the doors to the big screens grouped as round progress meters at the bottom-left, and the turn (End Turn, what is still waiting, the news) at the bottom-right.

**Recommendation: Layout B, "a corner for each job"**, built in three steps, starting with the top bar regroup (cheapest, and it fixes the overflow).

## Method

- Read the HUD code: `index.html` (HUD register comment at 518-558, top bar 568-688, research card 1002-1027, dock 1038, context card 1663-1752, End Turn 1756-1773), `src/style.css`, `src/ui/hudDock.ts`, `src/ui/holdingsRail.ts`, `src/ui/topBar.ts`, `src/ui/turnBlockers.ts`, `src/ui/controls.ts` (keyboard, 8016-8160) and the screen wiring in `src/main.ts` (5206-5405).
- Drove the real game in headless Chromium: a new game for five turns, then the 90-turn save at 1440×900, 1280×720, 1920×1080 and 1024×768. Opened the chip hover cards, the lens and chronicle popovers, the city screen, the unit panel and the draft offer.
- Measured element boxes in the page (`getBoundingClientRect`) and the yield strip's `scrollWidth` against its `clientWidth`.
- Checked the Humankind details against published sources (listed at the end). Where a detail could not be confirmed it is marked as unconfirmed.

## Inventory

### Always on screen

| Element | Where | Size at 1440×900 (turn 91) | Source |
|---|---|---|---|
| Top bar (ink) | full width, top, 42 px | — | `index.html:568`, `style.css:1294` |
| · Six yields: food, production, gold (bank + rate), science, culture, faith (bank + rate) | bar, left | strip is 974 px wide | `topBar.ts:172` |
| · Renown `57/633 (+39)` | bar, after yields | | `topBar.ts:632` |
| · Trade routes `1 / 3` | bar | | `topBar.ts:680` |
| · Beads `2 / 7` | bar | | `topBar.ts:731` |
| · Age `Æra II · closes in 9 turns` | bar | | `topBar.ts:779` |
| · Happiness and Authority meters | bar, last in the strip | | `topBar.ts:1097` |
| · Turn and seat name `Turn 91 Crimson` | bar, middle-right | 128 px | `index.html:573` |
| · Seat chips (hot-seat only) | bar | empty in single player | `index.html:582` |
| · Abacus, Lens, Chronicle ❧, Controls ?, Compendium ▤, Menu ☰ | bar, right | 256 px | `index.html:584-687` |
| Research card | top-left under bar | 230×82 | `index.html:1002` |
| Dock: Statecraft, Religion, Diplomacy, Trade, Leader, Standings (icon only) | under research card | 246×36 | `hudDock.ts:193-236` |
| Strategic resources card | under dock, hidden until the first holding | 230×147 (5 rows) | `holdingsRail.ts:121`, `style.css:3178` |
| End Turn (label names the first blocker) | bottom-right | 175×49 | `index.html:1756` |

### Shown when relevant

| Element | Trigger | Where |
|---|---|---|
| Context card (terrain, yields, combat forecast, refusals) | pointer over a hex | bottom-left, 252 px wide, up to ~200 px tall |
| Unit panel | a unit selected | top-right, 340 px wide, stops above End Turn |
| City screen | a city opened | replaces the top bar with the city band; two side rails |
| Toasts | news | top-centre under the bar |
| Hover cards for every bar chip | hover | under the chip |
| "Return to the offer" | an offer put away with View map | left of End Turn |
| Badges | Statecraft or Religion owes a pick; chronicle has unread lines | on those buttons |

### Every way to open a screen

| Screen | Dock | Bar chip | Bar button | Key | End Turn / event | Notes |
|---|---|---|---|---|---|---|
| Star chart (research) | — | — | research card | T | research blocker | |
| Statecraft | ✓ (badge) | culture chip | ☰ menu entry | C | draft blocker opens the offer card | five doors |
| Religion | ✓ (badge) | — | — | H | belief blocker | |
| Diplomacy | ✓ | — | — | W | war dispatch "review" | |
| Trade | ✓ | routes chip | — | E | idle trader blocker | |
| Leader ("your civ") | ✓ | — | — | none | — | dock only |
| Standings | ✓ | — | — | none | victory | dock only |
| Abacus (score) | — | — | Abacus | A | — | a second score screen, in a different place from Standings |
| Bead ledger | — | beads chip | — | V | also from an Abacus rod | |
| Ledger (where each yield comes from) | — | food, production, gold, science, faith chips | — | none | — | only reachable by clicking a number |
| Reliquary | — | renown chip | — | none | — | only reachable by clicking a number |
| Wager | — | — | — | none | age change, wager blocker | no door once staked (`main.ts:3926`, `4050`) |
| Census | — | — | — | none | census blocker | no door once read (`main.ts:3936`, `4052`) |
| Happiness / Authority breakdown | — | meter chips | — | none | — | popovers under the bar's left end |
| Compendium | — | — | ▤ | none | — | also linked from the ? card and the title screen |
| Controls card | — | — | ? | none | — | |
| Chronicle | — | — | ❧ | none | — | |
| Lens menu | — | — | Lens | Y, R, 0-9 | — | |
| Game menu (save, load, restart) | — | — | ☰ | none | — | |
| Capture sheet | — | — | — | — | a city taken | |

Totals: 19 places a screen or popover can be opened from, through 5 kinds of door. Seven screens have a letter key; Leader, Standings, Ledger, Reliquary, Compendium, Chronicle and the game menu do not.

A check that came back clean: the H and W key listeners are not added to `gameDisposers` (`main.ts:5341`, `5363`; the code says so at 5395). I restarted a game in the browser and pressed H, W and E; each still opened its screen once. The guard in `isInputBlocked` hides the duplicate listener. It is still worth sweeping, but it is not a visible bug today.

## Problems, ranked by how much they hurt play

### 1. The top bar is four bars in one, and it overflows (high)

- **Evidence.** `web/bar-1440.png`, `web/bar-1024.png`, `shots/w1280-10-zoomed.png`, `shots/w1024-10-zoomed.png`. Measured: at 1440 px the strip is 974 px and fits; at 1280 px `topBar.ts`'s fit logic (`STRIP_FIT_STEPS`, `topBar.ts:389`) has already applied `is-tighter`; at 1024 px the strip needs 767 px and gets 586, so it scrolls, and the readouts cut off are the happiness and authority meters and the end of the age countdown.
- **Why it hurts.** The bar mixes rates and banks (the six yields), progress in the race (renown, beads), a capacity (routes), a clock (the age) and two warning meters, in the same chip style. Your eye has to read every chip to find the one you want. The meters are the only figures that change what you should do this turn (unhappiness stops growth), and they are placed last, so they are the first to disappear on a laptop.
- **Also.** Five of the chips are buttons that open five different screens (Ledger, Statecraft, Reliquary, Trade, Bead ledger), and nothing marks which. The culture chip opens Statecraft while the gold chip next to it opens the Ledger (`topBar.ts:336-377`), so the same gesture on neighbouring numbers does different things.
- **Humankind.** As far as I can confirm, Humankind keeps its empire readout small and does not put its progress meters in the top bar: the era-star objectives sit next to the empire's banner at the top-left, and the science and civics progress meters are round dials at the bottom-left (Sullla's tutorial). A player forum post describes its resource window as "very basic" and placed opposite the era/star panel. The lesson: separate "what I earn" from "how I am doing in the race", and keep warnings beside the earnings they affect.

### 2. Screens are reached through scattered and partly hidden doors (high)

- **Evidence.** The table above. `hudDock.ts:170` builds icon-only buttons (the `label` argument is unused); the names exist only as `title` tooltips. `shots/late-13-unit.png` shows the six icons: a scroll, a flame, a flag, a cart, a crescent (your seat's charge) and a list. Two of them have letter keys printed in their tooltips; two have no key at all.
- **Why it hurts.** A new player cannot tell a scroll from a list without hovering each. Systems with two or more entrances (Statecraft has five) are easy to find; systems with one hidden entrance (Ledger, Reliquary) are effectively undiscovered. The two score screens (Abacus in the bar, Standings in the dock) are in different places. The ☰ menu docblock (`index.html:837-841`) admits the problem: it adds Statecraft there "so a player who has stumbled on none of those still has one place", but it lists only Statecraft.
- **Engineering signal.** `main.ts` has 19 hand-written `onOpen` lists, each naming every other surface to close (for example `main.ts:5258-5275`, `5308-5325`). Every new screen has to be added to all of them. A registry of screens would make any rearrangement cheaper.
- **Humankind.** The doors to its main screens (tech tree, civics, and others) are grouped in one cluster at the bottom-left, as large round icons; the tech and civics icons are also the progress dials for those systems, so the door tells you when it has something new (Sullla's tutorial; a Steam forum post says tech, civics, religion and other tabs were "moved into bottom left side of screen" with "bit huge icons"). One cluster, big targets, and the door doubles as the status. A criticism worth learning from: a forum user found Humankind's war tab easy to miss because it "just appears among some other tab", so new doors need a label or an announcement.

### 3. The top-left column is overloaded, and the strategic resources card is in the wrong place (high, per the user)

- **Evidence.** `web/leftcol.png`, `shots/late-10-zoomed.png` (the card covers the Ravensford banner), `shots/late-11-city.png` (the city screen: the card is gone, and the build list prints `Legionary — needs improved Iron 0/4` inline instead). Measured stack at 1440×900: research card 54-136 px, dock 147-183 px, resources card 193-340 px.
- **Why it hurts.** The card is a five-row inventory table between the doors and the map. It answers "can I build another horseman?", which you ask in the city build list or when upgrading a unit, not while looking at the map. In the city screen, where the question comes up, the card is hidden. It also grows with each new resource and will be pushed down by the commission chips.
- **Background.** `holdingsRail.ts:20-45` explains why it is here: the strategic resources proposal (§7) says the counts must be visible without clicking, and the top bar had no room. Moving it is a change to a recorded decision, so the user should rule on it (a line in `docs/flags.md`).
- **Humankind.** I could not confirm where Humankind shows strategic resource counts. What it does do is keep the top-left for the empire's identity and its current goals (the objectives next to the banner), which is the job the commission chips will do here.

### 4. "What is waiting" is spread over four places (medium)

- **Evidence.** End Turn names one blocker at a time (`turnBlockers.ts:191`, `firstBlocker`, which knows ten kinds at lines 136-145). Statecraft and Religion show a dot on their dock icons. The chronicle badge is at the top-right. Toasts appear top-centre. "Return to the offer" appears beside End Turn. `shots/late-05-endturn-click.png` shows the draft offer raised from End Turn; until you click, the only sign of it is the End Turn label.
- **Why it hurts.** You cannot see the whole list of what the turn still needs. You find out one item at a time by pressing End Turn.
- **Humankind.** The End Turn button sits at the bottom-right. Smaller buttons appear right above it for pending items (the next army with movement left, for example), and turn notifications stack in the same corner (Steam and Amplitude forum posts). One corner answers "what does this turn still need". Players complained that the small icons there were too small and that some notifications appeared elsewhere, so the lesson is to make that stack large and complete.

### 5. Small targets and colour-only states (medium, accessibility)

- Top-bar icon buttons are 24×24 px (`style.css:1781`), the labelled bar buttons use 9 px uppercase mono (`style.css:1345`), and the chronicle badge is 14 px with 8.5 px text (`style.css:2056-2063`). 24 px meets WCAG 2.2's minimum target but is small for a mouse at speed and too small for touch.
- The dock icons are 36 px squares with no text.
- Meter state is shown by colour (`civ-meter is-good`); the deficit state is colour plus sign. Adding a word or shape at the tightest step would help colour-blind players.
- Glyph buttons (❧ ▤ ☰ ?) carry `aria-label`s, which is good; the dock buttons carry `aria-label` too. Keyboard: seven screens have keys; the rest need the mouse.

### 6. Smaller points (low)

- The context card can reach ~200 px tall (long resource text, `shots/early-03-turn7.png`), which at 1280×720 brings it within ~200 px of the resources card.
- The seat strip is empty in single player but still takes a gap in the bar.
- The unit panel at the top-right is 340 px wide; in Humankind a similar right-side panel drew complaints for taking "almost half of the screen". Ours is fine at 1440 but worth watching at 1280.

## Heuristics (from the ux-audit checklist)

| Heuristic | Score (1-5) | Notes |
|---|---|---|
| Visibility of system status | 3 | Yields and meters always visible at 1440; meters lost at 1024; only one blocker shown at a time |
| Match with the real world | 4 | Plain words, good game metaphors |
| User control and freedom | 4 | Escape backs out one layer at a time; offers can be put away |
| Consistency and standards | 2 | Same gesture on neighbouring chips opens different screens; two score screens in two places; some doors labelled, some not |
| Error prevention | 4 | End Turn blockers |
| Recognition over recall | 2 | Icon-only dock; hidden doors; keys only in tooltips and the ? card |
| Flexibility and efficiency | 3 | Seven keys; no keys for Leader, Standings, Ledger, Reliquary |
| Aesthetic and minimalist design | 3 | The style is strong; the bar and left column are dense |
| Help users recover from errors | 4 | Refusals explained in the context card |
| Help and documentation | 4 | Controls card, Compendium, tutorial |
| **Overall** | **33 / 50** | |

## What Humankind does, in one place

Confirmed by the sources listed at the end:

- **Top-left:** the empire's banner, with the current objectives (era-star goals in the Neolithic) listed beside it.
- **Bottom-left:** round progress dials for science and civics; the doors to the tech, civics, religion and other screens are grouped there as large icons.
- **Bottom-right:** the large End Turn button; smaller pending-action buttons appear above it (next idle army); notifications collect in that corner; the button itself says what still needs attention (units to move, diplomacy, events).
- **Right side:** the army panel and the city's production queue.
- **No minimap.** Zooming out turns the board into a simplified strategic map.

Not confirmed, so not relied on: the exact position of the money/influence readout and of the fame scores; whether rival leaders' portraits form a strip; how the quest list is placed after the Neolithic.

Criticisms of Humankind's HUD from players, worth avoiding: notifications "all over the place" rather than by End Turn; small icons beside End Turn; the army panel too large; tile information placed where unit information was expected; a new tab easy to miss.

## Alternative layouts

All three keep the ink top bar, the parchment cards, the 3 px ink border with offset shadow, the yield colours, mono figures, End Turn's corner and the city screen as they are. All three give the commission chips a home under the research card. Sizes are rough estimates for one agent.

### Layout A — Tidy in place

The current structure, cleaned up. Smallest change; it does not move menus out of the area below research, so it only half answers the brief.

- **Top bar**, three labelled groups with thin dividers: *Economy* (six yields, then happiness and authority straight after them, so the meters never scroll away) · *Turn* (turn number and age countdown merged: `Turn 91 · Æra II, 9 left`) · *Race* (renown, beads). Tools reduced to Lens, ❧, ?, ☰. The Abacus button goes (A still opens it, and Standings links to it); the routes chip goes (the Trade door shows `1/3`); the Compendium joins the ? card and ☰ menu (the link already exists, `index.html:979`).
- **Left column:** research card; the dock becomes labelled (two rows of three, icon plus a short word and its key: `Statecraft C`); commission chips under it; the strategic resources card collapses to a single line of marks and spare counts (`⌑4 ♘6 ⛟26 Fe0 ⚘25`), with the full table on hover or click.
- **Cost:** `topBar.ts` (regroup and reorder, ~80 lines), `hudDock.ts` (labels, ~40), `holdingsRail.ts` (collapsed line, ~60), `style.css` (~120), `index.html` (remove two buttons), tests for the dock, the rail and the bar; the tutorial step anchored on `#abacus-button` (`tutorial.ts:136`) needs a new anchor. About 1-2 days.
- **Risk:** low. The top-left stays crowded once commissions arrive.

### Layout B — A corner for each job (recommended)

Modelled on Humankind. Each corner answers one question.

- **Top bar = what the empire earns and how it stands.**
  - Left: six yields, then happiness and authority immediately after them.
  - Centre: `Turn 91 · Æra II · 9 turns left`.
  - Right: the race (renown, beads); clicking renown opens the Reliquary and clicking beads opens the bead ledger, as now.
  - Far right: ▤ ? ☰ only.
  - Every yield chip opens the Ledger, including culture (Statecraft has its own labelled door now), so one gesture means one thing across the strip.
  - Leaves the bar: routes (to the Trade door), Lens (to the bottom-right), Abacus (into Standings), chronicle (to the bottom-right).
- **Top-left = what I am working towards.** The research card, and under it a *Goals* list: the commission chips (semi-transparent, solid deck-coloured edge, ring + name + count, as in the commissions mockup), and the current age's wager as one chip, which gives the wager a standing door. Empty when there are no goals. This is Humankind's objectives-beside-the-banner.
- **Bottom-left = the doors.** One row of labelled lozenges, fixed at the bottom-left edge: Statecraft C · Religion H · Diplomacy W · Trade E · Leader L · Standings S · Supply. Each shows its icon, a short word (the word drops to the key letter below 1280 px), a badge when the system owes you a decision, and a small dial or count where the system has one: Statecraft fills toward the next draft, Religion toward the next faith goal, Trade shows `1/3`, Supply turns vermilion when any resource has none spare. The context card stacks directly above this row and grows upward. This is Humankind's bottom-left cluster, with words added because the forum complaint was about doors that were easy to miss.
- **Supply (strategic resources)** becomes a door: its popover is the current card's table, unchanged. The counts are also printed as a strip at the head of the city screen's build rail, where the build decision is made. This changes the recorded rule that the counts must be readable without a click; on the map you still see the warning state without clicking, and in the city you see every count. Needs a ruling in `docs/flags.md`.
- **Bottom-right = the turn.** End Turn stays exactly where it is. Above it, a *Waiting* stack lists every outstanding item, not only the first (`A card awaits`, `Choose research`, `2 units need orders`), each a button that goes there; at most three, then `+2 more`. Beside End Turn: the chronicle ❧ with its badge, and a small Lens button (Y, R and 0-9 as now). Toasts stay top-centre, under the numbers they change.
- **Right edge:** the unit panel as now; its bottom limit grows by the Waiting stack's height.
- **City screen:** unchanged, apart from the supply strip in the build rail.
- **Cost:**
  - `index.html`: move the dock container; remove the Abacus, Lens and routes markup from the bar (~60 lines changed).
  - `style.css`: new anchors for the doors row and the Goals list; `#hud-context` anchored above the doors row; the `--research-card-h`/`--hud-dock-h` arithmetic replaced by a flex column for the top-left (~250 lines changed).
  - `hudDock.ts`: labels, dials, the Supply door, keys for Leader and Standings (~150).
  - `holdingsRail.ts`: becomes the Supply popover body (~60).
  - `topBar.ts`: regroup, culture chip to Ledger, remove routes (~120).
  - New `waitingStack.ts`: needs an `allBlockers` beside `firstBlocker` in `turnBlockers.ts` (~150 + ~40).
  - `main.ts`: rewire doors; ideally replace the 19 `onOpen` lists with a screen registry (~300 removed, ~120 added).
  - City build rail supply strip (~60).
  - Tutorial anchors (`#abacus-button`, `.civ-meters`, `tutorial.ts:136`, `220`); tests for the dock, rail, bar, screen lifecycle and seat roster.
  - About 4-6 days in three shippable steps.
- **Risks:**
  - The bottom-left now holds both the doors and the hover card; the card must never cover the doors (anchor it above them, never over).
  - The Waiting stack makes End Turn's corner taller, and the unit panel's `max-height` uses `--end-turn-clearance` as a fixed number (`style.css:227`); it would have to be measured instead.
  - The keys L and S are free today (checked against `controls.ts:8016-8160` and the H/W/E listeners) but should be confirmed against planned verbs.
  - The Supply move needs the user's ruling.

### Layout C — One door, tabbed screens

A different idea, not from Humankind: keep the map almost bare and make the screens one tabbed set.

- **Top bar** as in B. **Top-left:** research card and Goals, as in B. **Bottom-right:** End Turn, Waiting stack and chronicle, as in B.
- **No door row on the map.** One labelled button at the bottom-left, `Empire ▸` (and the Tab key), opens the screen you used last. Every full-screen sheet gets the same tab strip across its top: Research · Statecraft · Religion · Diplomacy · Trade · Leader · Standings · Ledger · Reliquary · Supply. The letter keys switch tabs while a sheet is up, so you can go from Trade to Diplomacy without passing through the map.
- The sheets themselves are unchanged; only their headers gain the strip.
- **Cost:** `modalShell.ts` gains a shared tab strip and a way to swap sheets without closing the shell (~250); a screen registry in `main.ts` (as in B); every sheet header in `index.html` (12 headers); the star chart and the Abacus, the two stated exceptions to the shell (`CLAUDE.md`, "Traps — render & UI"), need their own handling; `test/ui/screenLifecycle.test.ts` and the focus-return rules. About 1-2 weeks.
- **Risk:** highest. The star chart's dark full-window stage and the Abacus's measured stage do not share the shell. Badges become less visible, because they live inside the tab strip until you open it. It is the cleanest map, but it hides the systems behind one button, which is the opposite of what the user asked for.

## Recommendation

Build **Layout B** in three steps, each shippable on its own:

1. **Top bar regroup.** Move happiness and authority next to the yields, merge the turn and age, move the race to the right, remove the Abacus, routes and Compendium chips from the bar. This fixes the 1024 px and 1280 px overflow and needs no new components. About 1 day.
2. **Doors to the bottom-left; Goals to the top-left.** A labelled doors row with badges and dials; Supply becomes a door, and its counts appear in the city build rail (after the user's ruling); the commission chips land under the research card. Do the screen registry in `main.ts` first, since every later screen benefits. About 2-3 days.
3. **The turn corner.** The Waiting stack above End Turn (an `allBlockers` beside `firstBlocker`), the chronicle and Lens beside it. About 1-2 days.

Take one idea from C regardless: the screen registry, which replaces the 19 hand-written close lists and makes any of these layouts cheaper to change later.

## How to test the change

- Five-second test with someone new: "Where would you change your government? Where do you see what your cities pay in gold? What is still left to do this turn?" Count hovers and wrong clicks before and after.
- Load a turn-90 save at 1024×768, 1280×720 and 1440×900 and check that no top-bar readout scrolls out of sight (`scrollWidth === clientWidth` on each group).
- Count the map area covered at the top-left at turn 90 with two commissions seated: target under 200 px of height, against today's 290 px.

## Sources for the Humankind details

- Sullla, *Humankind Tutorial Game Part One*: objectives "listed in the top-left corner next to the player's banner"; science and civics as circular meters at the bottom-left; production queue on the right; no minimap, a zoomed-out national map instead. https://sullla.com/HK/HKT1.html
- Steam discussion (2021) on Humankind's UI: tech, civics, religion and other tabs "moved into bottom left side of screen" with "bit huge icons"; the star/era menu and the resource window swapped sides compared with Endless Legend; notifications "all over the place"; the unit panel "takes almost half of the screen"; the war tab easy to miss; no minimap. https://steamcommunity.com/app/1124300/discussions/0/3043858334666569762
- Steam discussion on idle units: the Idle Unit button "on the bottom right next to the big next turn circle"; smaller buttons appear above the main button. https://steamcommunity.com/app/1124300/discussions/0/595140510531751387
- Amplitude forum, *UI feedback*: the symbols next to End Turn at the bottom-right "are way too small"; a request to route notifications by subject. https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design-and-ideas/threads/38262-ui-feedback
- Amplitude forum, *Acknowledge notification shortcut*: notifications in the bottom-right corner interacting with the End Turn key. https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design/threads/41730-acknowledge-notification-shortcut
- The Sixth Axis review: the End Turn button tells you if units need moving, diplomacy needs answering or an event needs attention. https://www.thesixthaxis.com/2021/08/16/humankind-review-a-different-breed/
