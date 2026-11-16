# E2-final: the HUD specification

Date: 2026-10-12. The user picked E2 (one drawer, two depths), with two changes, verbatim: *"Let's have commissions appear on the left side outside of the empire menu. Lets have the research and culture sections be clickable (and reflected in the UX as such) instead of dedicated civic/tech tree buttons. Otherwise, it looks great."*

This document is the spec for building it. Sizes are CSS pixels at 1440 × 900. "Board" is the 1440 × 858 area below the top bar.

**Current state (batch SS2, 2026-11-16).** The empire panel and its side drawer are now one card, the **corner panel**: the Scholar's Study Corner board's variant A, with variant C's live figures on Routes and Faith (`docs/plans/mockups/scholars-study/Corner.dc.html`; the ruling is in `docs/plans/ui-critique-2026-10-16.md`, "iteration 3"). It opens downward in place on a click or Q, never to the side, and has no hover peek. Sections 1, 3, 4, 5, 6 and 8 below describe the panel as it is now; the rest of E2 is unchanged.

## 1. The whole screen, in one view

| Where | What | Always on screen? |
|---|---|---|
| Top edge | Top bar, 42 px, 13 items | yes |
| Top-left | The corner panel: the banner, the technology and the next draft with their bars, and four quick buttons | yes |
| The same card, grown down | Its open part: Research, Culture, Leader, the age wager, Supply | on a click or Q |
| Left column, under the panel | Commission chips, one per seated commission | when any is seated |
| Bottom-left | Hover card (terrain, yields, combat forecast) | while the pointer is over a hex |
| Top-right | Unit panel | while a unit is selected |
| Top-centre | Toasts | for five seconds per notice |
| Bottom-right | End Turn with its count badge; ❧ chronicle and Lens beside it | yes |
| City screen | Replaces the HUD as today; Supply counts head the build list | in a city |

**Footprint at rest** (board only):
- Corner panel 248×118 = 29,264 (it was 200×56 = 11,200 before batch SS2; the four quick buttons are the difference).
- End Turn 175×49 = 8,575.
- ❧ and Lens 2 × 40×40 = 3,200.
- Total **22,975 px², 1.9 %** with no commission seated.
- Each seated commission adds 200×38 = 7,600 (the 6 px gaps between chips leave the board showing); two seated make about **38,175 px², 3.1 %**.

Today's HUD covers 70,101 px² (5.7 %), measured at turn 91, before any commission chips.

## 2. Top bar (unchanged from B4 and E2)

Left to right:
- Six yields: food, production, gold (bank and rate), science, culture, faith (bank and rate). Each opens the Ledger on that yield, culture included, because Statecraft has its own door in the corner panel.
- One meters chip, `☺ +8 · ♙ 0`. Each half keeps its own hover card and opens its own breakdown on click.
- In the middle: `Turn 91 · Æra II · 9 left`.
- At the right, three labelled tabs:
  - **Diplomacy** (W);
  - **Trade `1/3`** (E);
  - **Standings `✦57 ●2/7`**: the renown figure opens the Reliquary, the bead figure the bead ledger, the tab itself the standings sheet; the Abacus opens from that sheet and from A.
- **?** (controls card) and **☰** (game menu; the Compendium moves in here and stays linked from the ? card).

**Replaces:**
- In `index.html:568-688`: the Abacus button (`#abacus-button`), Lens, ❧ and ▤ leave the bar.
- In `topBar.ts`: the routes, renown and bead chips become the Trade and Standings tabs, and the two meter chips merge.
- The tutorial step anchored on `#abacus-button` (`tutorial.ts:136`) needs a new anchor. The step on `.civ-meters` (`tutorial.ts:220`) moves with the merged chip.

## 3. The corner panel (batch SS2)

**Position and size:**
- `left: 14px; top: 54px` (12 px under the bar); 248 px wide, 118 px tall at rest (`--empire-panel-w`, `--empire-panel-h`).
- Parchment, a 1 px paper edge, the soft paper shadow. Open, the edge is ink and the card is above the toasts (z-index 17), still under the bar.

**The top part (`#empire-panel`), one button:**
- The seat's **banner**: the board's bookmark, 20 × 28, in the seat's colour, with the seat's charge in ink on a parchment canton. The board's canton is 6 px and plain; it is 12 px here so the charge can be read (the heraldry rule keeps a charge off seat ink).
- The **technology being learnt** (the star chart writes `#tech-current`, "Choose research…" when nothing is chosen) and its turns, over a 4 px lapis bar.
- **Next draft** and its turns, over a 4 px grape bar (the culture pool against `nextDraftCost`).
- A triangle at the right: down while closed, up while open.
- A **red dot** on the banner when anything owes a decision: a card or a Doctrine (`hasStatecraftOffer`), a charter to swear, a belief (`hasReligionOffer`), a strategic resource with no spare copy.
- Accessible name: "Your empire: researching Code of Laws, 1 turn; next draft in 2 turns", then what is waiting. It is a `button` with `aria-expanded` and `aria-controls="empire-drawer"`.

**The four quick buttons (`#empire-quick`)**, always there, under the top part, and they never move:

| Button | Opens | Live figure | Key |
|---|---|---|---|
| Diplomacy | the Diplomacy sheet | none | W |
| Routes | the trade sheet | routes running against the cap, the top bar's Trade figure (`tabFigures`, from `tradeLedger`) | E |
| Faith | the Faith sheet | faith banked against the next god's price (`explainNextRung`): "51/60"; "full" when the pantheon is full; no figure while a god waits to be named (a red dot instead) or while a technology must open the next place | H |
| Standings | the standings sheet | none | none |

Each button is the trigger or one of the doors of its sheet (`modalShell.ts`, `doors`), so the keyboard goes back to it when the sheet closes. The bar's three tabs stay for now: the Corner board says they "can" leave the bar, and the top bar's own redesign is a later batch.

## 4. The open part (`#empire-drawer`)

A click or tap on the top part, Enter on it, or Q opens it; the card grows **down in place**. It covers the commission chips until it closes (the chips are hidden while it is open, so their tabs do not show past its edge). It closes on Q again, a second click on the top part, Escape, a press outside the card, or any card or screen opening (a quick button opens one). It is one card in the screen registry (`screens.opening('drawer')`).

Rows, top to bottom, each under a hairline:
- **Research** (T): the star chart's figures, the rate and the next technology: "186/190 · +91 a turn · next: Mathematics". Click opens the star chart. The row keeps the old research card's id, `#hud-research`.
- **Culture** (C): "120/450 · Tier 14 · next government at 18", and in red "a card awaits" or "a charter is ready to be sworn" with a dot on the title. Click opens Statecraft.
- **Leader** (L): the seat's name. Click opens the leader sheet. (The old drawer's heading showed the name; the open card has no heading.)
- **Age wager**: "2 of 3 bars met". Click opens the wager sheet.
- **Supply**: every strategic resource held, as spare over held in two columns, red when none is spare; a resource opens its Compendium entry. The foot says "spare of what you hold" and "Q or Esc closes".

**Keyboard:** opening moves the keyboard to the Research row; Tab and Shift-Tab wrap inside the whole card (the top part, the quick buttons, the rows); closing with the keyboard on a row puts it back on the top part.

## 5. Where each reading of the old drawer went

| Old drawer | Now |
|---|---|
| Header: banner and seat name | the banner on the top part; the name on the Leader row |
| Header hint ("Esc or Q to close") | "Q or Esc closes" at the foot of Supply |
| Research section: name, figures, rate, turns, bar, next, glyph | name, turns and bar on the top part; figures, rate and next on the Research row; the technology's glyph is no longer drawn (it is decoration, and the board has no place for it) |
| Culture section: figures, turns, bar, tier, owed | turns and bar on the top part; figures, tier and owed on the Culture row |
| Faith row: the next god in words, belief dot | the Faith button: the figure, the sentence as its title and name, the dot |
| Leader, age wager, Supply | the same rows; Supply as the board's two columns, without the resource marks |
| The × | none: the top part toggles, Escape closes |

## 6. Commission chips (the left column)

**Position:**
- Under the empire panel, in the left column: `left: 14px`, first chip at `top: 120px` (panel bottom plus 10 px).
- 200 px wide (the panel's width), 38 px tall, 6 px apart.
- **Only seated commissions** have a chip. With none seated the column is empty and the board is clear.
- At most four chips show; a fifth or more gives a `+N more` line that opens Statecraft.

**Look, as approved in the commissions mockup:**
- A see-through parchment background (`rgba(247,242,225,0.72)` with a 2 px backdrop blur) and a 1 px hairline border.
- A 3 px left edge in the card's deck colour.
- A 22 px ring that fills with progress.
- The card's name in Fraunces 12 px, and the count in words in mono 10.5 px (`1 / 2 camps cleared`, `93 / 150 hexes`).

**Relation to the corner panel:** the chips start 10 px under the panel at rest and take its width (248 px). The open panel grows down over them and they are hidden until it closes; they never move. The column reads top to bottom: your empire, then what you have committed to.

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
| T | star chart | as now |
| C | Statecraft | as now |
| H | Religion | as now |
| W | Diplomacy | as now |
| E | Trade | as now |
| A | Abacus | as now |
| V | bead ledger | as now |
| **Q** | opens or closes the corner panel in place | since batch SS2 (it pinned the side drawer before) |
| **L** | Leader sheet | new; unbound today |
| Escape | closes the open corner panel, then the usual layers | extended |

The ? card (`index.html:953-955`) lists Q and L beside the others.

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

- **The tech tree is not one click from rest.** It is hover then click (or T). The user chose this in E2; the large labelled research section is the answer to "where is the tech tree button". On touch it is two taps.
- **Accidental opening.** Since batch SS2 the panel opens only on a click, a tap or Q, so a pointer crossing the corner opens nothing.
- **The left column grows with commissions.** Four chips reach about `top: 300px`, well clear of the hover card at the bottom-left at 900 px tall. At 720 px tall, keep the cap at three.
- **Supply moves off the board.** It now lives in the corner panel's open part and the city build list, which changes the rule recorded in `holdingsRail.ts:20-45`; the banner's dot covers the "something is short" case. The user should confirm in `docs/flags.md`.
