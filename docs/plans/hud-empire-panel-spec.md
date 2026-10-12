# E2-final: the HUD specification

Date: 2026-10-12. The user picked E2 (one drawer, two depths), with two changes, verbatim: *"Let's have commissions appear on the left side outside of the empire menu. Lets have the research and culture sections be clickable (and reflected in the UX as such) instead of dedicated civic/tech tree buttons. Otherwise, it looks great."*

This document is the spec for building it. Sizes are CSS pixels at 1440 × 900. "Board" is the 1440 × 858 area below the top bar.

## 1. The whole screen, in one view

| Where | What | Always on screen? |
|---|---|---|
| Top edge | Top bar, 42 px, 13 items | yes |
| Top-left | Empire panel (banner and two progress bars) | yes |
| Right of the panel | The empire drawer | on hover, click, Q or focus |
| Left column, under the panel | Commission chips, one per seated commission | when any is seated |
| Bottom-left | Hover card (terrain, yields, combat forecast) | while the pointer is over a hex |
| Top-right | Unit panel | while a unit is selected |
| Top-centre | Toasts | for five seconds per notice |
| Bottom-right | End Turn with its count badge; ❧ chronicle and Lens beside it | yes |
| City screen | Replaces the HUD as today; Supply counts head the build list | in a city |

**Footprint at rest** (board only):
- Empire panel 200×56 = 11,200.
- End Turn 175×49 = 8,575.
- ❧ and Lens 2 × 40×40 = 3,200.
- Total **22,975 px², 1.9 %** with no commission seated.
- Each seated commission adds 200×38 = 7,600 (the 6 px gaps between chips leave the board showing); two seated make about **38,175 px², 3.1 %**.

Today's HUD covers 70,101 px² (5.7 %), measured at turn 91, before any commission chips.

## 2. Top bar (unchanged from B4 and E2)

Left to right:
- Six yields: food, production, gold (bank and rate), science, culture, faith (bank and rate). Each opens the Ledger on that yield, culture included, because Statecraft now has its own door in the drawer.
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

## 3. The empire panel (at rest)

**Position and size:**
- `left: 14px; top: 54px` (12 px under the bar); 200 × 56 px.
- Parchment, 3 px ink border, the 3 px offset ink shadow every HUD card has.

**Contents, left to right:**
- The seat's **banner**: its charge on a parchment canton, drawn by `heraldryMarkDataUri` as the Leader dock button does today. 40 px circle.
- Two **progress bars**, 96 × 6 px each, stacked, each followed by its turns in mono:
  - research (cobalt) `1t`;
  - the draft meter (grape) `2t`.
- A **red dot** on the banner when anything about your empire owes a decision:
  - a draft or Doctrine (`hasStatecraftOffer`);
  - a belief (`hasReligionOffer`);
  - a charter to swear (`pendingGovernment`);
  - a strategic resource with no spare copy.
- A `▸` at the right edge, which says the panel opens sideways.

**The whole panel is one target.** The two bars are not separate click targets:
- At 6 px tall they are far below a usable target size (WCAG 2.2 asks for 24 px).
- Splitting the panel into two or three targets is E1's design, which the user did not pick; its risk was a miss opening the wrong screen.
- The way to the star chart and to Statecraft is one hover away, as a large labelled section, and T and C go there directly.

**States:**

| State | Look | What happens |
|---|---|---|
| Rest | as above | — |
| Hover (pointer over it for 200 ms) | background lifts to `#fdfaef` | the drawer opens at depth one |
| Press (mouse down) | the physical press used everywhere (`translate(3px,3px)`, shadow collapses) | — |
| Click, or Q, or Enter when focused | panel drawn "open": right edge flattened, joined to the drawer | the drawer opens at depth two and stays (pinned) |
| Keyboard focus | `:focus-visible` ring (the bar's existing focus style, `style.css:1808`) | the drawer opens at depth one |
| Touch tap | — | opens depth two directly, since touch has no hover |

**Accessible name:** "Your empire: researching Code of Laws, 1 turn; next draft in 2 turns". It is a `button` with `aria-expanded` and `aria-controls` set to the drawer.

## 4. The empire drawer

**Position:**
- It opens **to the right of the panel**: `left: 220px` (the panel's right edge plus 6 px), `top: 54px`, 300 px wide.
- It never covers the left column, so the commission chips under the panel stay visible and never move.
- The pointer moves straight from the panel into the drawer with no gap.

**Opening and closing:**
- Hover opens after 200 ms. The drawer closes 300 ms after the pointer has left both the panel and the drawer.
- It never opens on hover while the map is being dragged, a move is being aimed, or a sheet is open.
- A pinned drawer (depth two) closes on Escape, a click outside, the ×, Q again, or opening any screen. It is one layer in Escape's order, before the selection (`controls.ts:8037`).
- It is built on `popover.ts`, the same pattern as the lens and chronicle cards, and it registers its listeners in `gameDisposers`.

### Depth one (hover or focus), about 300 × 200

**Header:** the banner, the seat's name, and "hover · click to pin" in small mono.

**Research section, one button, full width, about 280 × 70:**
- Title: `Research →`.
- `Code of Laws`, a progress bar, `186/190 · +91 a turn · 1t`, and `next: Mathematics` when a queue exists.
- **Click opens the star chart.** The key hint `T` is at the right of the title.
- It takes over the research card's ids (`#hud-research`, `#tech-current`, `#research-figures`, `#research-turns`), so `techTree.ts`'s `renderStatus` and the tutorial's anchor (`tutorial.ts:161`) keep working. The research card at `index.html:1002-1027` is removed.

**Culture section, one button, full width, about 280 × 70:**
- Title: `Culture →`.
- `Next draft 120/450 · 2t` and a progress bar (the draft meter: `culturePool` against `nextDraftCost`, `draft.ts:97`).
- `Tier 14 · next government at 18` from `tierLadder` (`data/statecraft.json`).
- When owed: `a card awaits` or `a charter is ready to be sworn`, in vermilion.
- **Click opens Statecraft.** The key hint `C` is at the right of the title.

At the foot: `▾ click for Religion, Leader, Supply`.

### Depth two (click, Q, Enter, or a tap), about 300 × 360

Depth one, then under an ink rule:
- **Religion** row: faith pool and the next rung; dot when a belief is owed. Click or H.
- **Leader** row: "your civ". Click or L (newly bound; nothing uses L today).
- **Age wager** row: the three bars' progress (`2 of 3`). Click opens the wager sheet. This gives the wager a standing door, which it has never had (`main.ts:3926`, `4050`).
- **Supply** section: every strategic resource held, `spare/held`, vermilion when nothing is spare. This is the content of today's holdings rail (`strategicHoldings`, `copiesFigureNode`). Clicking a resource opens its Compendium entry.

**Replaces:**
- `#hud-dock` and `hudDock.ts`: the six dock buttons. Statecraft becomes the culture section; Religion and Leader become rows; Diplomacy, Trade and Standings become bar tabs.
- `#hud-holdings` and `holdingsRail.ts`: becomes the Supply section.
- `#hud-dock-popovers`: removed.
- `hudBadgeWaiting` and `religionBadgeWaiting` feed the banner's dot and the per-row dots.

## 5. The clickable sections: how they look in each state

Research and culture are real `<button>` elements, each containing its title, figures and bar. There are no separate "Tech tree" or "Statecraft" buttons.

| State | Look |
|---|---|
| Rest | Parchment, a 2 px hairline border (`--rule`). The title is in Fraunces with a quiet `→` in ink-soft. The key hint (`T`, `C`) is in a small mono box at the right. Cursor: pointer. |
| Hover | Background `#fdfaef`. A 4 px left edge appears in the section's colour (cobalt for research, grape for culture). The title gets an underline and the `→` darkens to ink and moves 2 px right (no movement under reduced motion). |
| Keyboard focus (`:focus-visible`) | The same as hover, plus a 3 px ring in the section's colour, 2 px outside the border, so it shows on parchment and against the drawer's ink border alike. |
| Pressed | The HUD's physical press: `translate(2px,2px)` and the hairline darkens to ink. |
| Owed (a draft waiting) | The culture section's left edge stays grape at rest and its owed line is vermilion, so the waiting state is visible without hovering the section. |

**Keyboard order inside the drawer:** research → culture → Religion → Leader → Age wager → Supply. Tab and Shift-Tab move through them, Enter opens, Escape closes the drawer and returns focus to the panel.

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

**Relation to the drawer:** the drawer opens to the right of the column, so the chips are never covered and never move when it opens. The column reads top to bottom: your empire, then what you have committed to.

**States:**

| State | What happens |
|---|---|
| Hover (or tap) | A detail card opens beside the chip, to its right, 260 px wide: the full goal, each count, and the reward. It cannot collide with the drawer, because the drawer only opens from the panel. |
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
| **Q** | empire drawer at depth two (toggle) | new; unbound today |
| **L** | Leader sheet | new; unbound today |
| Escape | closes the drawer, then the usual layers | extended |

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
- **Accidental opening.** The 200 ms delay and the drag and aim guards matter; the drawer opens to the right, over the board, so it must close promptly.
- **The left column grows with commissions.** Four chips reach about `top: 300px`, well clear of the hover card at the bottom-left at 900 px tall. At 720 px tall, keep the cap at three.
- **Supply moves off the board.** It now lives in the drawer and the city build list, which changes the rule recorded in `holdingsRail.ts:20-45`; the banner's dot covers the "something is short" case. The user should confirm in `docs/flags.md`.
