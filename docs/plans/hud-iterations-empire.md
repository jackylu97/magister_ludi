# The empire panel: three iterations

Date: 2026-10-12. Follows `iterations-compact.md`. The user, verbatim: *"ok i quite like the drawer idea. B4b seems the best. Could we have one empire modal, that shows tech + civic progress, that appears abbreviated until hover? I also like the rest appearing as part of the 'empire button' being clicked, but where is the tech tree entry button in that case? this is really close, lets try a few more iterations"*

## Kept from B4 in all three

- **Top bar, 13 items:** six yields; happiness and authority in one chip; the turn and age; Diplomacy, Trade `1/3` and Standings (renown and beads) as tabs at the right; ? and ☰.
- **End Turn carries the waiting list:** a count badge, and a hover list of everything still owed.
- **Beside End Turn:** the chronicle (❧) and Lens.
- **Supply counts** head the city build list.
- **Keys stay:** T opens the star chart and C opens Statecraft, as now. H, W and E stay. The empire menu gets a key of its own: **Q**, which nothing binds today (checked against `controls.ts:8016-8160` and the H/W/E listeners in `main.ts`).

## What "civic progress" is in this game

There is no civics tree. Two things in the code play that part:

1. **The draft meter, the frequent one.** Culture fills `Player.culturePool` toward the next draft. The cost is `nextDraftCost(player)` (`src/sim/statecraft/draft.ts:97`), and it escalates with drafts taken, never with city count. The culture chip's hover already prints it as `Tier N · next draft  pool/cost` (`src/ui/topBar.ts:223-230`). When it fills, a hand of Orders is offered: the "A card awaits" blocker.
2. **The government ladder, the slow one.** `tierLadder` in `data/statecraft.json` opens more chairs as drafts accumulate: at 0, 4, 18, 29 and 45 drafts, giving 3, 5, 8, 11 and 11 chairs. Tier 45 also opens the two great-person governments. A government waiting to be sworn shows as `player.statecraft.pendingGovernment` ("a charter is ready to be sworn").

So in every iteration, the **civic ring is the draft meter**: it moves every few turns, the way Civ's civic progress does. The government ladder is the second line when expanded: "Tier 14 · next government at 18 (4 drafts)". The turns to the next draft are the pool's shortfall over the empire's culture per turn. That is a presentation sum, worked out in the UI like the yield strip's totals.

## Three states, drawn for each

- **At rest:** what is always on the board.
- **Hovered:** the panel expands like a drawer to show research and civic progress in full. It opens after a short delay (about 200 ms) and closes about 300 ms after the pointer leaves. It never opens while the map is being dragged or a move is being aimed.
- **Empire menu open:** a click on the banner (or Q) opens everything about your own empire, with the progress rows at its top, so the menu is the hovered panel plus the rest.

## E1 — Three buttons in one pill

At rest the panel is a pill with three separate targets, each doing exactly one thing.

**At rest (200 × 40 px, top-left):**
- The seat's **banner**, which opens the empire menu.
- A **research ring** with the current tech's glyph, which opens the star chart.
- A **civic ring** (the draft meter) with Statecraft's mark and its badge, which opens Statecraft.
- A small goals count `◔ 3`.
- Thin dividers between the parts; each part lights on hover.

**Hovered (about 330 × 150):**
- The pill grows downward.
- A research row: name, progress bar, `186/190 · 1t`, and a **Tech tree · T** button.
- A civic row: `Next draft 120/450 · 2t`, `Tier 14 · next government at 18`, and a **Statecraft · C** button.
- One goals line naming the nearest goal.

**Empire menu (banner click or Q):**
- The two progress rows.
- Then Religion · H, Leader · L, Supply (five counts, red when short).
- Then the Goals list with progress.

**Where the tech tree is:** one click on the research ring, at rest. While hovered there is also a labelled button. T works as before.

**Touch and keyboard:**
- Tapping a ring opens its screen directly; tapping the banner opens the menu, which contains the progress rows, so touch users lose nothing by not hovering.
- Tab focus on the pill counts as hovering it.

**Footprint at rest:**
- Pill 200×40 = 8,000; End Turn 8,575; ❧ and Lens 3,200.
- **19,775 px², 1.6 % of the board.**

**Borrows:**
- Humankind: science and civics as two separate round dials, each its own door.
- Civ VII: the tech and civic progress buttons sit side by side.

**Cost:**
- `hudDock.ts` becomes the empire panel: pill, expansion, menu (~280).
- The research card's markup becomes the research ring, keeping the `#hud-research` id that `techTree.ts`'s `renderStatus` and the tutorial (`tutorial.ts:161`) use (~60).
- The civic ring and rows read `culturePool`, `nextDraftCost` and `tierLadder` (~80).
- Goals in the menu (~100); `holdingsRail.ts` becomes the Supply rows (~40).
- The bar and End Turn as in B4a (~320); `style.css` (~200); the screen registry in `main.ts`.
- About 4-5 days.

**Risks:**
- Three 36 px targets in one 200 px pill. A miss opens the wrong screen; the dividers and per-part hover light have to be clear.
- At rest the rings carry no words. The tech's name appears only on hover or in the menu, so a player who never hovers sees a glyph, not "Code of Laws".

## E2 — One drawer, two depths

The drawer idea taken literally: one surface that opens a little on hover and fully on a click.

**At rest (150 × 56 px, top-left):**
- The **banner** with two thin progress bars stacked beside it: research (blue) and the draft meter (purple).
- A red dot when anything is owed, and a `▸` to show it opens.
- No words.

**Hovered, depth one (about 300 × 170):**
- The drawer slides open to show two sections.
- **Research:** name, progress, turns, and a **Tech tree · T** button.
- **Civics:** next draft with turns, the tier and next government, and a **Statecraft · C** button.

**Clicked, depth two (about 300 × 430):**
- A click anywhere on the panel (or Q) extends the same drawer downward and pins it.
- Below the two sections: Religion · H, Leader · L, Supply, then Goals.
- Escape, a click outside, or the × folds it.

**Where the tech tree is:** the labelled **Tech tree** button at the top of the drawer. On a desktop it is hover-then-click: one click, but only after the drawer is open. T works as before.

**Touch and keyboard:**
- The first tap opens depth two directly; touch has no hover, so it skips depth one.
- Q toggles depth two. Tab focus opens depth one.

**Footprint at rest:**
- Panel 150×56 = 8,400; End Turn 8,575; ❧ and Lens 3,200.
- **20,175 px², 1.6 %.**

**Borrows:**
- Endless Legend 2: its side HUD panels, and its decision to keep every empire action in one place.
- B4c's drawer, which the user liked.

**Cost:**
- New `empireDrawer.ts` with the two depths, the pin and focus handling (~300).
- The research card content moves into it (~80); the civic rows (~80); Goals (~100); Supply rows (~40).
- The bar and End Turn (~320); `style.css` (~220).
- About 5 days.

**Risks:**
- **The tech tree is never one click from rest.** With a mouse you hover first; on touch it is two taps. This is the "hidden door" trade-off from the audit, softened because the drawer's first depth opens on hover alone.
- The research name is not on screen at rest.
- A hover drawer at the top-left can open while the pointer crosses it on the way to the board; the 200 ms delay matters.

## E3 — Banner plus a named research ribbon

The tech tree's door stays exactly what it is today, a research readout you click, made small and fixed to the empire banner.

**At rest (270 × 40 px, top-left):**
- The **banner**, with a ring around it showing the draft meter. Its badge shows when a draft, a belief or a charter is waiting.
- Attached to its right, a **research ribbon**: the tech's glyph, `Code of Laws`, a thin progress bar and `1t`.
- **Clicking the ribbon opens the star chart; clicking the banner opens the empire menu.** The ribbon has the tech's name written on it, so it reads as "research" without hovering.

**Hovered (about 300 × 120, under the panel):**
- A detail card.
- **Research:** progress `186/190`, science per turn, turns left, and what is queued next.
- **Civics:** next draft `120/450 · 2t`, `Tier 14 · next government at 18 (4 drafts)`, and "a charter is ready to be sworn" when it is.
- The nearest goal.

**Empire menu (banner click or Q):**
- The same detail at the top.
- **Statecraft · C** as the first row, showing "a card awaits" when it does.
- Religion · H, Leader · L, Supply (counts, red when short), then the Goals list with progress.

**Where the tech tree is:** the ribbon, one click, labelled with what you are researching, as today's research card is (`index.html:997-1001`: "The whole card is the button"). T works as before.

**Touch and keyboard:**
- Tap the ribbon for the star chart, tap the banner for the menu. The menu carries the hover detail, so touch loses nothing.
- Tab focus on the panel shows the detail; Enter on the banner opens the menu.

**Footprint at rest:**
- Panel 270×40 = 10,800; End Turn 8,575; ❧ and Lens 3,200.
- **22,575 px², 1.8 %.**

**Borrows:**
- Endless Legend 2: research per turn "clearly displayed", and one place for empire actions.
- Humankind: the banner as the empire's anchor at the top-left.
- Civ VII: the tech button sits directly under the totals.

**Cost:**
- `hudDock.ts` becomes the banner and its menu (~240).
- The research card becomes the ribbon, keeping `#hud-research` and its click (~60). This is the smallest change to the star chart's wiring of the three.
- The detail card (~120); the civic ring and rows (~80); Goals (~100); Supply rows (~40).
- The bar and End Turn (~320); `style.css` (~200).
- About 4-5 days.

**Risks:**
- Statecraft has no one-click door at rest. It is the menu's first row, C, the badge on the banner, and End Turn's routing when a draft is waiting. Drafting itself happens on the offer card End Turn raises, so the Statecraft *screen* (slotting cards) is visited less often than research. That is the reason research gets the ribbon and civics gets the ring.
- The ribbon is 26 px tall; keep its whole length clickable.

## Compared

| | B4b (reference) | B4c (reference) | E1 three buttons | E2 drawer, two depths | E3 banner + research ribbon |
|---|---|---|---|---|---|
| At rest | banner, tech name, goals count | 18 px edge handle | banner · research ring · civic ring · goals count | banner, two thin bars | banner with civic ring · named research ribbon |
| Footprint at rest | ~21,895 px² (1.8 %) | ~16,455 (1.3 %) | ~19,775 (1.6 %) | ~20,175 (1.6 %) | ~22,575 (1.8 %) |
| Tech name readable at rest | yes | no | no | no | **yes** |
| Tech tree from rest | popover row (2 clicks) | drawer (hover + click) | **1 click** (ring) | hover + click; 2 taps on touch | **1 click** (ribbon) |
| Statecraft from rest | popover row | drawer | **1 click** (ring) | hover + click | menu row (2 clicks), C, badge |
| Hover shows | — | the whole drawer | progress rows with buttons | depth one: progress with buttons | detail card |
| Click on banner | popover | — | menu | depth two (pinned) | menu |
| Touch | taps | taps | taps go straight to screens | first tap opens fully | taps go straight to screens |
| Main risk | hidden doors | most hidden | three small targets, no words at rest | tech tree never one click | Statecraft one click deeper |
| Size | ~4 days | ~5 days | 4-5 days | ~5 days | 4-5 days |

## Recommendation

**E3, the banner with a named research ribbon.**

- It answers the user's question with the least to learn: the way into the tech tree is the thing that says what you are researching. That is how the research card works today, kept small.
- At rest it shows the one fact a player checks every turn (the tech and its turns) in words. It still shows civic progress as the ring around the banner.
- Hovering gives the full tech and civic detail. A click on the banner gives everything else about your empire, which is the shape the user asked for.
- Touch users lose nothing, because the menu carries the hover detail.

Take one piece of E1 if Statecraft needs to be one click from rest: make the civic ring around the banner its own target. That brings back E1's small-target risk, so I would wait for a playtest before doing it.

E2 is the most drawer-like, but it puts the tech tree behind a hover every time, which repeats the audit's hidden-door problem for the screen players open most.

Build order for E3:
1. **The top bar** (merged meters, world tabs, Compendium into ☰): about 1 day.
2. **The empire panel:** banner, ribbon, hover detail, menu with Goals and Supply, and the screen registry first. About 2-3 days.
3. **End Turn's count badge and hover list:** about 1 day.

## Sources

As in `iterations.md` and `iterations-compact.md`:
- Endless Legend 2: Amplitude, "UI/UX Next Steps" (one place for empire actions; research per turn "clearly displayed"); "Public Test Branch - Update 6" (side and top HUD panels; End Turn names required actions).
- Civilization VII: CivFanatics "User Interface" thread (progress buttons for science and culture under the top-left totals).
- Humankind: Sullla, Humankind Tutorial Game Part One (objectives beside the empire's banner; science and civics as dials).
