# B4, three compact versions

Date: 2026-10-12. Follows `iterations.md`. The user's response, verbatim: *"B4 seems to make the most logical sense to me. B1 is ok, but the UI feels way too cluttered, i think things need to be somewhat stashed away or more compact."*

## What stays from B4 in all three

- **Your own empire on the left; the other empires on the right.** Diplomacy, Trade and Standings are labelled tabs at the right end of the top bar. Trade carries `1/3`. Standings carries renown and beads; clicking those figures still opens the Reliquary and the bead ledger.
- **A leaner top bar than B4.**
  - Happiness and authority share one chip (`☺ +8 · ♙ 0`); hovering still shows each meter's card, and clicking either half opens its breakdown.
  - The Compendium button leaves the bar. It is already linked from the ? card (`index.html:979`) and joins the ☰ menu.
  - The bar holds: six yields, the meters chip, the turn and age, three tabs, ? and ☰. That is **13 items**, against 15 in B4 and 20 today.
- **End Turn swallows the waiting list.** Its label names the first outstanding item, as it does now. A small count badge says how many more there are (`A card awaits  +2`). Hovering the button, or focusing it, lists them all, each a link to where it is answered.
  - This is the one idea all three share. The stacked pills in B1 and B4 cost about 15,000 px² for something End Turn already half does.
  - Endless Legend 2's End Turn names required actions ("A Quest Requires your attention"), and Civ VII's bottom-right button tells you what to do before you can end the turn. Both do this with the button itself, not a separate list.
- **The chronicle (❧) and Lens** sit as two small 40 px buttons beside End Turn.
- **Supply counts** head the city screen's build list in every version, because that is where "can I build another horseman?" is asked.
- **Shown only when relevant, as today:** the hover card (bottom-left), the unit panel (top-right), toasts (top-centre).

## How the footprint was measured

"Always on screen" means every box that covers the board at 1440 × 900 on an ordinary turn with nothing hovered and nothing selected. The top bar is the same 42 px band in every version and is left out; the board below it is 1440 × 858 = 1,235,520 px².

- **Today:** measured in the browser at turn 91.
  - Research card 230×82 = 18,860.
  - Dock 246×36 = 8,856.
  - Strategic resources card 230×147 = 33,810.
  - End Turn 175×49 = 8,575.
  - **70,101 px², 5.7 % of the board.** The planned commission chips would add about 26,000 more.
- **B1** (estimated from the drawn sizes):
  - Dial row 560×70 = 39,200.
  - Goals list (three chips) 260×100 = 26,000.
  - End Turn 8,575.
  - Three waiting pills 3 × 180×28 = 15,120.
  - Chronicle and Lens 2,254 + 3,920.
  - **95,069 px², 7.7 %.**
- **B4:**
  - Dial row 370×70 = 25,900.
  - Goals 26,000.
  - End Turn 8,575.
  - Pills 15,120.
  - Chronicle and Lens 6,174.
  - **81,769 px², 6.6 %.**

The three below are estimates from the drawn sizes in the same way.

## B4a — Slim and labelled

Everything stays on screen, but small. No door is hidden.

**Always on screen, top-left, one 30 px row under the bar:**
- **Research as a slim progress strip,** 240 × 26 px: the tech's glyph, `Code of Laws`, a thin fill bar and `1t`. Clicking it opens the star chart, as T does. It replaces the 82 px research card.
- **Statecraft and Religion as two small 30 px dials** beside it, with their rings and badges.
- **A `⋯` button** that opens a small menu holding Leader (and anything else about your own empire that is visited rarely).
- **Goals as one pill** under the row, 230 × 26 px: `◔ Goals 3 · Domesday Survey 93/150 ▸`. It shows the goal closest to done. One click expands the full list of commission chips with their progress; a second click or Escape folds it.

**Appears only when relevant:**
- A red **Supply warning chip** (`⚒ Iron 0/4`) appears after `⋯` only while some strategic resource has none spare. Clicking it opens today's resources table.
- With nothing short, Supply is not on screen. The table is always one click away through `⋯`, and the counts head the city build list.

**Bottom-right:** End Turn with its count badge; ❧ and Lens beside it.

**Footprint:**
- Row 360×30 = 10,800; Goals pill 230×26 = 5,980; End Turn 8,575; ❧ and Lens 2 × 40×40 = 3,200.
- **28,555 px², 2.3 %** of the board: about 40 % of today, 30 % of B1, 35 % of B4.
- With a resource short, plus about 2,900.

**Borrows:**
- Civ VII: progress buttons in one row directly under the totals, and a small icon carrying a number (its Government icon's celebration countdown).
- Endless Legend 2: its developers' aim that strategic resources "take up less space".

**Cost:**
- `index.html`: the research card markup becomes the strip, keeping the `#hud-research` id so `techTree.ts`'s `renderStatus` and the tutorial anchor (`tutorial.ts:161`) still work (~60).
- `hudDock.ts`: two dials and the `⋯` menu (~150).
- New `goalsPill.ts` (~120).
- `holdingsRail.ts` becomes the warning chip and the table popover (~80).
- `topBar.ts`: meters merged, three tabs (~170).
- End Turn's count badge and hover list, with `allBlockers` beside `firstBlocker` in `turnBlockers.ts` (~150).
- `style.css` (~200).
- The screen registry in `main.ts`.
- About 4 days.

**Risks:**
- Leader moves one click deeper (into `⋯`). It is a record rather than a decision, so this matters least, but it is a hidden door; give it the key L.
- Supply hidden until short means a player planning ahead opens `⋯` or a city to see the counts. That changes the rule in `holdingsRail.ts:20-45` and needs the user's ruling.
- A 26 px strip is a smaller target than the card; keep its whole width clickable.

## B4b — One empire button

Your empire is one button at the top-left; its screens and goals are in a popover.

**Always on screen, top-left:**
- **The empire button,** 230 × 44 px.
  - The seat's banner (its heraldic charge on a parchment canton, as the Leader door already draws it) inside a ring that shows research progress.
  - Beside it, two short lines: `Code of Laws · 1t` and `Goals 3`.
  - A red dot when Statecraft, Religion or the Leader owes a decision. A red corner when a strategic resource is short.

**One click opens a compact popover with everything about your empire:**
- One row each for Research (progress and turns, T), Statecraft (C), Religion (H), Leader (L), Supply (the counts, red when short).
- Under them, the Goals: the commission chips with their progress, and the age wager.
- Clicking a row opens that screen.

**Bottom-right:** End Turn with its count badge; ❧ and Lens.

**Footprint:**
- Empire button 230×44 = 10,120; End Turn 8,575; ❧ and Lens 3,200.
- **21,895 px², 1.8 %:** about 31 % of today.

**Borrows:**
- Humankind: the empire's banner at the top-left with the current objectives beside it.
- Endless Legend 2: one place for every empire action. Here that place is one button instead of a sidebar.

**Cost:**
- `hudDock.ts` becomes the empire button and its popover (~220). The popover uses the existing `popover.ts` pattern, like the lens and chronicle cards.
- The research card's content moves into the button and its first row (~80).
- Goals inside the popover (~100); `holdingsRail.ts` becomes the Supply row (~40).
- The bar and End Turn as in B4a (~320); `style.css` (~180).
- About 4 days.

**Risks:**
- **This brings back the hidden-door problem from the audit.**
  - Statecraft and Religion, which the user called "front and centre" when the dock was built (`hudDock.ts:9-18`), are now one click deeper, and only a dot says a decision is waiting.
  - What keeps it workable: the keys T, C, H and L still go straight to each screen. End Turn routes to whatever is owed. The badge on the banner is visible all the time.
  - It needs the user to accept that standing concerns are signalled rather than shown.
- Research progress is a ring around the banner; the tech's name is a 12 px line beside it, so it is less readable than the strip in B4a.

## B4c — A drawer on the left edge

Nothing about your empire sits on the board until you reach for it.

**Always on screen:**
- **A slim handle on the left edge,** 18 × 260 px, under the bar.
- It shows three thin vertical progress ticks (research, Statecraft, Religion) and a red dot when anything owes a decision.

**On hover at the left edge, a click on the handle, or a key (Q is unbound today; Tab is not used, because it moves keyboard focus):**
- A drawer slides out over the board, about 250 px wide.
- It holds the research strip, the Statecraft and Religion dials, Leader, Supply (red when short) and the Goals list with progress.
- A pin keeps it open; that is a per-viewer setting in `localStorage`.

**Bottom-right:** End Turn with its count badge; ❧ and Lens.

**Footprint:**
- Handle 18×260 = 4,680; End Turn 8,575; ❧ and Lens 3,200.
- **16,455 px², 1.3 %:** about 23 % of today. Pinned open, it is about the same as B4a.

**Borrows:**
- Endless Legend 2: its side HUD panels and its move of every empire action to one upper-left place, made collapsible here.

**Cost:**
- New `empireDrawer.ts` (~250): the slide, the pin, keyboard focus, the edge hover zone.
- The research card and dock content moves into it (~120).
- Goals (~100); the bar and End Turn as in B4a (~320); `style.css` (~200).
- About 5 days.

**Risks:**
- **The most hidden of the three.** The research name, the Goals and every door except the bar's tabs are off screen until reached for. A new player has to discover the handle; the tutorial must point at it.
- A hover zone on the left edge can open the drawer by accident when the pointer passes the edge. It needs a short delay, and must stand down while a unit drag or a city screen is active.
- The drawer covers the board's left 250 px while open, including city banners there.

## Compared

| | Today | B1 | B4 | B4a slim | B4b empire button | B4c drawer |
|---|---|---|---|---|---|---|
| Always-on footprint (px², board only) | 70,101 | ~95,069 | ~81,769 | **~28,555** | ~21,895 | ~16,455 |
| Share of the board | 5.7 % | 7.7 % | 6.6 % | 2.3 % | 1.8 % | 1.3 % |
| Top bar items | 20 | 14 | 15 | 13 | 13 | 13 |
| Research | card | big dial | big dial | slim strip with name | ring on the banner, name beside | in the drawer; a tick on the handle |
| Statecraft, Religion | icons | big dials | big dials | small dials, always visible | in the popover (one click) | in the drawer (hover) |
| Leader | icon | small dial | small dial | in `⋯` | in the popover | in the drawer |
| Supply | 5-row card | small dial | small dial | warning chip only when short | row in the popover; red corner | row in the drawer; red dot |
| Goals | (planned chips) | chip list | chip list | one pill, expands on click | in the popover | in the drawer |
| Waiting list | End Turn label | pills | pills | End Turn badge + hover list | same | same |
| Hidden doors | Ledger, Reliquary | none new | none new | Leader | Statecraft, Religion, Leader, Supply | everything on the left |
| Borrows from | — | Civ VII, EL2 | Civ VII | Civ VII, EL2 | Humankind, EL2 | EL2 |
| Size | — | 4-5 days | ~5 days | ~4 days | ~4 days | ~5 days |

## Recommendation

**B4a, slim and labelled.**

- It cuts the always-on footprint to about 40 % of today's (and about a third of B4's).
- It keeps the bar at 13 items.
- It leaves research, Statecraft and Religion visible and labelled, so it does not undo the audit's main finding, that doors hidden behind a click go unfound.
- What it stashes is what is visited least (Leader, behind `⋯`) or matters only when something is wrong (Supply, shown as a warning). The Goals list folds to one pill that still shows the nearest goal's progress and opens in one click.

B4b is the right choice if the user wants the board clearer still and accepts that Statecraft and Religion become one click away with a badge. B4c hides the most and needs the most teaching; I would not start there.

Build order for B4a:
1. **The top bar** (merged meters, the three world tabs, Compendium into ☰): about 1 day. It also fixes the overflow at 1024 px.
2. **The left row:** research strip, two small dials, `⋯`, the Goals pill and the Supply warning, with the screen registry in `main.ts` first. About 2 days.
3. **End Turn's count badge and hover list:** about 1 day.

## Sources

The reference details are cited in full in `iterations.md`. The ones used here:
- Endless Legend 2: Amplitude, "UI/UX Next Steps" (empire actions in one upper-left place; strategic resources "take up less space"), and "Public Test Branch - Update 6" (End Turn names required actions, e.g. "A Quest Requires your attention"; side and top HUD panels).
  - https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/996-ui-ux-next-steps
  - https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/1004-public-test-branch-update-6
- Civilization VII: CivFanatics "User Interface" thread (progress buttons under the top-left totals); patch notes (celebration countdown under the Government icon; Victory screen from the Trophy / Age Progress button); a Steam discussion on the bottom-right button that lists what to do before ending the turn.
  - https://forums.civfanatics.com/threads/user-interface.691341/
  - https://support.civilization.com/hc/en-us/articles/54088808418579-Civilization-VII-Patch-Notes-Apple-Arcade-August-26-2026
  - https://civilization.2k.com/civ-vii/game-update-notes/2026-may-19-patch-1-4-0/
  - https://steamcommunity.com/app/1295660/discussions/2/570371033831324629
- Humankind: Sullla's tutorial (objectives beside the empire's banner at the top-left).
  - https://sullla.com/HK/HKT1.html
