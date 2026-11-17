# E2-final: the HUD specification

Date: 2026-10-12. The user picked E2 (one drawer, two depths), with two changes, verbatim: *"Let's have commissions appear on the left side outside of the empire menu. Lets have the research and culture sections be clickable (and reflected in the UX as such) instead of dedicated civic/tech tree buttons. Otherwise, it looks great."*

This document is the spec for building it. Sizes are CSS pixels at 1440 × 900. "Board" is the 1440 × 858 area below the top bar.

**Current state (batch SS2b, 2026-11-17).** The corner panel and the top bar follow "Option A, revised" of `docs/plans/mockups/scholars-study/corner-panel-options.html`, with the user's choices in `docs/plans/ui-critique-2026-10-16.md` ("The corner panel: option A revised is approved"). The panel's two lines are buttons; four marks with no words sit under them; the rest of the card grows it in place. The top bar is two groups with nothing between them, and its three tabs are gone: each screen has one door. Sections 1, 2, 3, 4, 5, 6 and 8 below describe the state as it is now; the rest of E2 is unchanged.

## 1. The whole screen, in one view

| Where | What | Always on screen? |
|---|---|---|
| Top edge | Top bar, 42 px, in two groups | yes |
| Top-left | The corner panel: the banner, two lines (the technology and the next draft, each a button with its bar), and four marks | yes |
| The same card, grown down | Its open part: the lines' figures and keys, the four marks as rows, Leader, the age wager, Supply | on a click on the card or Q |
| Left column, under the panel | Commission chips, one per seated commission | when any is seated |
| Bottom-left | Hover card (terrain, yields, combat forecast) | while the pointer is over a hex |
| Top-right | Unit panel | while a unit is selected |
| Top-centre | Toasts | for five seconds per notice |
| Bottom-right | End Turn with its count badge; ❧ chronicle and Lens beside it | yes |
| City screen | Replaces the HUD as today; Supply counts head the build list | in a city |

**Footprint at rest** (board only):
- Corner panel 248×131 = 32,488 (it was 200×56 = 11,200 before batch SS2, and 248×118 in batch SS2).
- End Turn 175×49 = 8,575.
- ❧ and Lens 2 × 40×40 = 3,200.
- Total **44,263 px², 3.6 %** with no commission seated.
- Each seated commission adds 248×38 = 9,424 (the 8 px gaps between chips leave the board showing).

Today's HUD covers 70,101 px² (5.7 %), measured at turn 91, before any commission chips.

## 2. Top bar (batch SS2b)

Two groups with nothing between them (the user, 2026-11-17: "left/right aligned scheme with no middle"). At 1440 about 550 px in the middle of the bar is empty.

Left group:
- Six yields: food, production, gold (bank and rate), science, culture, faith (bank and rate). Each opens the Ledger on that yield, culture included, because Statecraft has its own door in the corner panel.
- One meters chip, `☺ +8 · ♙ 0`. Each half keeps its own hover card and opens its own breakdown on click.
- **Renown** `✦57`: opens the Reliquary; the spend ceremony's card lands on it.
- **Beads** `2/7`: opens the Bead Race (V).

Right group:
- The seat strip, in hot-seat play only.
- `Turn 91 · Æra II · 9 left`, with the age card on hover.
- **?** (controls card) and **☰** (game menu: saves, the Compendium, the tutorial, the time of day). The menu has no Statecraft row any more.

Spacing (the board): 12 px at both ends; 12 px between figures in a group; 16 px between the yields, the meters chip and renown, and between the turn line and the two buttons; 8 px between the two buttons. Below 1200 px wide the bar's gap is 10 px.

**What the three tabs carried, and where it went:**

| Tab | What it showed besides its door | Now |
|---|---|---|
| Diplomacy | nothing (a mark and a label) | the corner panel's Diplomacy mark, W |
| Trade | the routes figure, in the good ink while a slot is free; the trade ledger as a hover card | the routes figure and its free-slot ink on the corner panel's Routes mark, E; the ledger is the trade sheet's |
| Standings | the renown figure (glowing while a great person waits) and the bead figure, each its own button | both figures at the end of the bar's left group, unchanged; the sheet is the corner panel's Standings mark, S |

## 3. The corner panel (batch SS2b)

**Position and size (the board's spacing):**
- `left: 16px; top: 54px` (12 px under the bar); 272 × 137 px at rest since batch SS2c (`--empire-panel-w`, `--empire-panel-h`; it was 248 × 131 in batch SS2b).
- One 4 px step for every padding, gap and height. The lines have 8 px of padding; a line is 24 px with a 4 px bar under it; the mark row is 36 px. One text edge for the lines and the open card's rows, after the pennant's column (`--empire-text-edge`, 69 px). Four type sizes: 14 px Fraunces for row titles, 13 px for line names, 12 px for notes, 12 px mono for every figure.
- Parchment, a 1 px paper edge, the soft paper shadow. Open, the edge is ink and the card is above the toasts (z-index 17), still under the bar.

**The top part (`#empire-top`):**
- The seat's **pennant** (batch SS2c, take 2 of the banner board, built larger and pressable). `#empire-panel` is its column, a button: the card's toggle for the keyboard, with `aria-expanded` and `aria-controls="empire-drawer"`. The pennant hangs from under the top bar across the 12 px gap onto the card, inside its left edge: a short swallowtail in the seat's colour with a thin ink edge, a parchment canton framed in the seat's second colour (`seatInks`), and the charge in ink (`heraldryFor`). It is 56 px wide with a 34 px charge; `--empire-banner-w` is the one value to tune, and the canton, the foot, the column, the text edge and the card's height follow it. It stands on the solid ink shadow of a pressable thing; hovered it moves 1 px and its edge darkens, pressed it lies flat. The **Q key** and the **arrow** sit under its foot on its centre line; the arrow points up while the card is open. A **red dot** on the banner when anything owes a decision: a card or a Doctrine (`hasStatecraftOffer`), a charter to swear, a belief (`hasReligionOffer`), a strategic resource with no spare copy. Accessible name: "Your empire: researching Code of Laws, 1 turn; next draft in 2 turns", then what is waiting.
- **Two lines, each a button**, drawn as an underlined name with an arrow (the user's choice over raised keys):
  - the **technology being learnt** (`#hud-research`; the star chart writes `#tech-current`, "Choose research…" when nothing is chosen) with its turns over a 4 px lapis bar. Opens the star chart (T).
  - **Next draft** (`#drawer-culture`) with its turns over a 4 px grape bar (the culture pool against `nextDraftCost`). Opens Statecraft (C). Title: "Statecraft: next draft in 7 turns (C)".
- **Every other part of the top grows the card**: the banner, the arrow and every gap around the two lines. Q does the same.

**The four marks (`#empire-quick`)**, under the top part; they never move. No labels at rest: the name and the key are in each mark's title and accessible name. Cells 44, flexible, flexible and 44 px wide, 36 high.

| Mark | Opens | Live figure | Key |
|---|---|---|---|
| Diplomacy | the Diplomacy sheet | none | W |
| Routes | the trade sheet | routes running against the cap (`tabFigures`, from `tradeLedger`); verdigris while a slot is free; no dot | E |
| Faith | the Faith sheet | the faith banked; see below | H |
| Standings | the standings sheet | none | S |

**The Faith figure** (the user's rulings of 2026-11-17):
- The number is always the faith banked.
- "banked/price" shows only while the next god has a price (`explainNextRung`, kind `open`), with a 2 px line under the mark that fills toward it. The figure turns rose once the price is met.
- Every other state (a god waiting for a name, a full pantheon, a place a technology must open) prints the one number.
- **The dot** shows when the seat has the faith to call a prophet now: `purchaseError` takes a prophet (the roster's `prophesies` row) in the faith bank in at least one of the seat's towns. No dot for a god waiting for a name. Once every belief of the seat's religion is chosen (`nextBeliefPool` is `null`), the dot never shows.
- The title and the accessible name say what the next thing is: `nextRungWords`, then "You have the faith to call a prophet", or the prophet's price (`explainPurchaseCost` in the capital) when the next god has no price and the religion has room.

Each mark is its sheet's trigger (`modalShell.ts`), so the keyboard goes back to it when the sheet closes. No sheet has a second door.

**Greyed doors (batch SS9a; the user, 2026-11-17: "i dont want to confuse new players").** A door is greyed while the sheet behind it has nothing to show:
- **Faith** opens as soon as the pantheon has a place (`pantheonSlots`) or a god held or waiting, the seat knows a rite (`availableRites`), it founded a religion, or it has faith banked or coming in. Divination is the normal way: it opens the first places and teaches the first rites. The technology named is `explainNextRung`'s own (kind `closed`).
- **Routes** opens as soon as the seat has researched the technology that unlocks the roster's caravan row (`UNIT_UNLOCK_TECH`, Currency), or it has a route slot or a route running.
- Greyed: the mark is dimmed, with no figure, line or dot. The title says "Opens when you research Divination" with the describers' keyword ref. A press on the mark, or the H or E key, prints "Faith opens when you research Divination." on the guidance line and opens nothing. The button stays reachable with `aria-disabled`. The open card's row says "opens with Divination", with the technology in bold.
- Other ways into the two sheets are not gated: the End Turn idle-cart and "Renew rites" prompts, a trader's "Start route", a town's Routes row and its rites. Each needs the feature to exist first.

## 4. The open card

A click or tap on the banner or on any part of the top that is not a line, Enter on the banner, or Q opens it; the card grows **down in place**. It covers the commission chips until it closes (the chips are hidden while it is open, so their tabs do not show past its edge). It closes on Q again, a second click on the top's ground, Escape, a press outside the card, or any card or screen opening (a line, a mark or a row opens one). It is one card in the screen registry (`screens.opening('drawer')`).

Top to bottom:
- **The two lines grow their detail**: the technology's "277/650 · +118 a turn" and "next: The Civil Service" with a T key; the draft's "38/308 · Tier 12", "next government at 18" and in red "a card awaits" or "a charter is ready to be sworn", with a C key.
- An ink rule, then **the four marks as four rows** of the card's one shape: mark, name, a note (Faith: "next god", "pantheon full", "call a prophet"), figure, key. No row of names under the marks.
- **Leader** (L): the seat's name, in the same shape. Opens the leader sheet.
- **Age wager**: "2 of 3 bars met". Opens the wager sheet.
- **Supply**: every strategic resource held, as spare over held in two columns, red when none is spare; a resource opens its Compendium entry. "spare of what you hold" beside the title, and "Q or Esc closes" at the foot.

**Keyboard:** opening moves the keyboard to the research line; Tab and Shift-Tab wrap inside the whole card; closing with the keyboard on a row of the open part puts it back on the banner.

## 5. Where each reading of the old drawer went

| Old drawer | Now |
|---|---|
| Header: banner and seat name | the banner on the top part; the name on the Leader row |
| Header hint ("Esc or Q to close") | "Q or Esc closes" at the foot of Supply |
| Research section: name, figures, rate, turns, bar, next, glyph | the research line: name, turns and bar at rest; figures, rate and next while open; the technology's glyph is no longer drawn (it is decoration, and the board has no place for it) |
| Culture section: figures, turns, bar, tier, owed | the "Next draft" line: turns and bar at rest; figures, tier, the next government and owed while open |
| Faith row: the next god in words, belief dot | the Faith mark: the faith banked, the sentence as its title and name, the prophet dot |
| Leader, age wager, Supply | the same rows; Supply as the board's two columns, without the resource marks |
| The × | none: the top part toggles, Escape closes |

## 6. Commission chips (the left column)

**Position:**
- Under the corner panel, in the left column: `left: 16px`, first chip at `top: 193px` (panel bottom plus 8 px).
- 248 px wide (the panel's width), 38 px tall, 8 px apart.
- **Only seated commissions** have a chip. With none seated the column is empty and the board is clear.
- At most four chips show; a fifth or more gives a `+N more` line that opens Statecraft.

**Look, as approved in the commissions mockup:**
- A see-through parchment background (`rgba(247,242,225,0.72)` with a 2 px backdrop blur) and a 1 px hairline border.
- A 3 px left edge in the card's deck colour.
- A 22 px ring that fills with progress.
- The card's name in Fraunces 12 px, and the count in words in mono 10.5 px (`1 / 2 camps cleared`, `93 / 150 hexes`).

**Relation to the corner panel:** the chips start 8 px under the panel at rest and take its width (248 px). The open panel grows down over them and they are hidden until it closes; they never move. The column reads top to bottom: your empire, then what you have committed to.

**States:**

| State | What happens |
|---|---|
| Hover (or tap) | A detail card opens beside the chip, to its right, 260 px wide: the full goal, each count, and the reward. |
| Click | Opens Statecraft at that card (the government sheet). |
| Keyboard | Each chip is a button in the tab order after the panel. Enter opens Statecraft at the card; focus shows the detail card. |
| Goal met this turn | Gilt left edge, full ring, `Fulfilled · reward paid` in vermilion. Next turn the chip is gone and the turn report lists the reward. |
| Card unseated | No chip; progress stays on the card face, paused. |

**Builds as:**
- A new `commissionChips.ts` that owns its container, as `holdingsRail.ts` does today.
- Refreshed on `state.revision` plus the seat, for that file's reason: it is called on pointer movement.

## 7. End Turn corner (unchanged from E2)

- **End Turn** stays at `right: 14px; bottom: 14px`.
- Its label names the first item owed, as now.
- A vermilion count badge at its top-left shows how many more there are (`+2`).
- Hovering or focusing it lists every item; each is a link to where it is answered. This needs an `allBlockers` beside `firstBlocker` (`turnBlockers.ts:191`).
- **❧ chronicle** and **Lens** are 40 px buttons to its left. The chronicle keeps its unread badge; Lens keeps Y, R and 0-9.

## 8. Keys

| Key | Does | Status |
|---|---|---|
| T | star chart | as before |
| C | Statecraft | as before |
| H | Faith | as before |
| W | Diplomacy | as before |
| E | Trade | as before |
| **S** | the standings sheet | new in batch SS2b; a press with Cmd, Ctrl or Alt is left to the browser |
| A | Abacus | as before |
| V | bead ledger | as before |
| **Q** | opens or closes the corner panel in place | since batch SS2 |
| **L** | Leader sheet | since batch UX3 |
| Escape | closes the open corner panel, then the usual layers | as before |

The ? card lists every key, S included.

## 9. Build order and size

1. **Top bar:** merged meters, three tabs, Abacus, ▤, ❧ and Lens out. About 1 day.
2. **Screen registry in `main.ts`,** replacing the 19 hand-written `onOpen` close lists, so the drawer and its rows open screens through one function. About half a day.
3. **Empire panel and drawer:**
   - New `empireDrawer.ts` (~300 lines).
   - Research section taking the research card's ids (~60).
   - Culture section (~80); Religion, Leader, wager rows (~60); Supply section from `holdingsRail.ts` (~40).
   - `style.css` (~220).
   - About 2 days.
4. **Commission chips:** `commissionChips.ts` (~150) and its detail card. Lands with the commissions feature.
5. **End Turn badge and list:** about 1 day.

Tests to update:
- `test/ui/hudDock.test.ts` and `test/ui/holdingsRail.test.ts`: their modules change shape.
- `test/ui/screenLifecycle.test.ts`: new listeners in `gameDisposers`.
- `test/ui/seatRoster.test.ts`: if it reads the bar's sources.
- The tutorial's anchors.

## 10. Risks

- **The tech tree and Statecraft are one click from rest** since batch SS2b: the two lines are buttons.
- **Accidental opening.** Since batch SS2 the panel opens only on a click, a tap or Q, so a pointer crossing the corner opens nothing. A click on the card's ground opens it, so a press that misses a line by a few pixels opens the card instead of a screen.
- **The left column grows with commissions.** Four chips reach about `top: 300px`, well clear of the hover card at the bottom-left at 900 px tall. At 720 px tall, keep the cap at three.
- **Supply moves off the board.** It now lives in the corner panel's open part and the city build list, which changes the rule recorded in `holdingsRail.ts:20-45`; the banner's dot covers the "something is short" case. The user should confirm in `docs/flags.md`.
