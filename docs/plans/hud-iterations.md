# Layout B, four iterations

Date: 2026-10-12. Follows `audit.md`. The user's response to Layout B: *"B is ok, but the bottom left corner still feels clunky. I think the research doesn't necessarily need to be on its own on the top left, could we do a few iterations on layout B? its correct directionally but still not quite there. Take inspiration from endless legend 2, humankind, civ 7."*

What stays fixed in every iteration, because the user accepted it in B:

- A lean top bar: the six yields with happiness and authority straight after them, the turn and age in the middle, the race (renown and beads) at the right (B4 changes this), and the system buttons (▤ ? ☰) at the far right. Routes, the Abacus, Lens and the chronicle leave the bar.
- The End Turn corner: End Turn where it is now, a list of everything still waiting stacked above it, and the chronicle and Lens beside it.
- The unit panel at the top-right, and the city screen unchanged apart from a strip of strategic resource counts at the head of its build list.

What changes between iterations: where the doors to the screens go, where research goes, and where Goals (the commission chips and the age's wager) and Supply (strategic resources) go.

## What the three references do

### Humankind (Amplitude, 2021)

- The empire's banner sits at the top-left, with the current objectives listed beside it.
- Science and civics progress are two round dials at the bottom-left; the doors to the tech, civics, religion and other screens are grouped there as large round icons.
- End Turn is a large button at the bottom-right; small pending-action buttons appear above it, and notifications collect in that corner.
- No minimap; zooming out turns the board into a simple strategic map.
- Player complaints: notifications appear in several places, the icons beside End Turn are too small, the army panel is too large, a newly added tab was easy to miss.

### Civilization VII (Firaxis, 2025)

Confirmed:
- The empire's counters (gold, influence, science, culture, happiness) run across the top-left.
- Directly under them is a row of buttons, described by an early player as "buttons for era score, science & culture progress", plus others.
- A "Turns until next Celebration" countdown was added under the Government icon in that HUD.
- Patch 1.4.0 made the Victory screen open from the Trophy / Age Progress button in the HUD.
- The minimap sits at the bottom-left with a lens toggle.
- The selected unit's stats and actions sit at the bottom-right.
- A bottom-right button tells you what you need to do before you can end the turn.

Criticised:
- Clicking the tech icon opens a quick-choice menu rather than the tree.
- The minimap is small and shows little.
- There are only two lenses.

Not confirmed:
- Where notifications sit on a desktop screen.
- Whether rival leaders' portraits form a strip.

### Endless Legend 2 (Amplitude, early access 2025)

The developers' post *UI/UX Next Steps* describes the change most relevant to this audit.

- At early-access launch, the main screen had a "Divided UI": protectorates, empire and quest log sat in the upper-left, while heroes, research and diplomacy sat around the End Turn button.
- The developers decided to remove the split: "All empire actions are in the upper left". Faction powers move "to the top center to be more noticeable", strategic resources "take up less space", and research per turn is "clearly displayed". Their reason: players mainly want one place to find empire actions.
- A player's reply says the Research button sits awkwardly in the middle of the new sidebar.
- The End Turn button lists mandatory actions, for example "A Quest Requires your attention" (patch notes, October 2025).
- Reviewers called the interface among the best in the genre.
- Not confirmed: how the shipped sidebar is ordered, and where notifications and the minimap sit.

**The two Amplitude games disagree, and that is useful.** Humankind put the doors at the bottom-left; Endless Legend 2 started with a split and moved every empire action to the upper-left. Civ VII also puts its progress buttons at the top-left under the counters. Two of three references, including the newest, gather the empire's doors at the top-left directly under the numbers they relate to.

## B as drawn in the audit, and what was wrong with it

- Research card alone at the top-left, Goals under it.
- A row of seven labelled doors along the bottom-left edge, with the hover card stacked above it.
- The bottom-left became two unrelated things on top of each other (a hover readout and the doors) and a long row of rectangles, which is the clunkiness the user saw.
- Research sat apart from Statecraft and Religion, though all three are "progress toward the next thing".

## B1 — A row of dials under the bar (recommended)

**Borrows from:** Civ VII (a row of progress buttons directly under the top-left counters) and Endless Legend 2 (all empire actions in one upper-left place, with research shown plainly, and not stuck in the middle of the list). The dials themselves are Humankind's: the door is also the progress meter.

- **Top-left, under the bar:** one row of round dials, left to right:
  - Three large progress dials: **Research**, **Statecraft**, **Religion**.
    - Research's ring is the current tech's progress, with the tech's glyph inside and its name and turns under it (`Code of Laws · 1t`). It is the first dial in the row, not a card on its own.
    - Statecraft's ring fills toward the next draft; Religion's toward the next faith goal.
  - Four smaller round doors: **Diplomacy**, **Trade** (`1/3` under it), **Leader**, **Standings** (the Abacus opens from Standings and from A).
  - One more small door: **Supply**, whose ring turns vermilion when any strategic resource has none spare. Its popover is today's resources table, and the counts also head the city build list.
  - Every dial has a short label and its key under it; a badge when it owes a decision.
- **Under the dials: Goals.** The commission chips (exactly as in the commissions mockup: "the left column, directly under the row of menu icons") and the age's wager as a chip.
- **Bottom-left: the hover card, alone.** Nothing stacked on it, nothing beside it.
- **Bottom-right:** End Turn, the waiting list above it, chronicle and Lens beside it.
- **Map covered:** the dial row is about 70 px tall and 560 px wide (about 40% of a 1440 px screen); with two commissions the top-left column is about 150 px tall, against today's 290 px.
- **Why it works:** the empire reads top to bottom in one place, in order of how often you look: what you earn (the bar), what you are progressing (the dials), what you are aiming at (Goals). The bottom-left goes back to one job.
- **Cost:**
  - `hudDock.ts` becomes the dial row (~200 lines, dials drawn as conic-gradient rings in the style of the current research dial).
  - The research card's markup in `index.html` becomes the first dial, keeping the `#hud-research` id so `techTree.ts`'s `renderStatus` and the tutorial anchor (`tutorial.ts:161`) still find it (~60).
  - `holdingsRail.ts` becomes the Supply popover (~60).
  - `style.css` replaces the `--research-card-h` / `--hud-dock-h` arithmetic with one flex column (~200).
  - The top bar regroup (~120); the waiting list and `allBlockers` (~190); the city build-list strip (~60); the screen registry in `main.ts`.
  - About 4-5 days.
- **Risks:**
  - It keeps the doors in the top-left, which the user's first message named. The answer to that is that the doors are now one tidy, labelled row of dials with research in it, instead of a card, a strip of icons and a table stacked under each other. That needs the user's agreement.
  - The row is wide (~560 px); below 1280 px the labels drop to keys only.
  - Moving Supply off the map needs the user's ruling (`holdingsRail.ts:20-45`).

## B2 — Humankind's dial cluster at the bottom-left

**Borrows from:** Humankind (science and civics as two dials at the bottom-left with the other screens' doors grouped around them; objectives beside the banner at the top-left).

- **Top-left:** only Goals (commission chips and the wager). Nothing else, so it reads as Humankind's objectives list.
- **Bottom-left: a compact cluster.**
  - Two large dials side by side, **Research** and **Statecraft** (science and "civics").
  - Six small round doors in two rows of three above them: Religion, Diplomacy, Trade, Leader, Standings, Supply.
  - About 280 × 240 px in all.
- **The hover card moves beside the cluster,** on the same bottom edge to its right, instead of on top of it. The two never stack.
- **Bottom-right:** the End Turn corner.
- **Why it works:** the doors and the progress they report are one object, and the top-left is left for goals, which is the job Humankind gives it.
- **Cost:**
  - `hudDock.ts` builds the cluster (~220; a small grid).
  - `style.css`: the cluster and the hover card's new anchor (`#hud-context`'s `left` becomes the cluster's width plus a gap) (~220).
  - The Goals container; the rest as in B1.
  - About 5 days.
- **Risks:**
  - Three things share the bottom edge (cluster, hover card, End Turn corner); at 1024 px that is about 280 + 252 + 300 px, which fits but leaves the bottom of the board busy.
  - City banners near the bottom-left corner sit under the cluster.
  - The cluster is taller than B's row of doors, so more of the board's bottom-left is covered.
  - The tutorial step anchored on the research card (`tutorial.ts:161`) moves to the bottom of the screen.

## B3 — One slim sidebar for the empire

**Borrows from:** Endless Legend 2 (its decision to put "all empire actions in the upper left" in one sidebar, and its player's complaint that research sat in the middle of it, so research goes first here).

- **A slim vertical rail down the left edge,** under the bar, 52 px wide. From the top:
  - Research (a dial, first), Statecraft, Religion (dials);
  - a rule;
  - Diplomacy, Trade, Leader, Standings;
  - a rule;
  - Supply.
  - Icons with badges and rings. Hovering the rail, or focusing it from the keyboard, slides labels out over the map. A pin button keeps the labels out; that choice is a per-viewer convenience kept in `localStorage`.
- **Goals:** a column directly to the right of the rail, at the top.
- **Hover card:** bottom-left, to the right of the rail.
- **Bottom-right:** the End Turn corner.
- **Why it works:** one place for every door, in a fixed order, taking the least map of any option. It reads as a table of contents.
- **Cost:**
  - `hudDock.ts` becomes the rail (~220); the label slide and pin (~80).
  - `style.css` (~200).
  - Every left-anchored surface (`#hud-context`, the Goals list, the meters' popovers, the city screen's left rail) moves right by the rail's width.
  - The rest as in B1.
  - About 5 days.
- **Risks:**
  - A full-height strip of the board's left edge is always covered.
  - Labels that only appear on hover are the hidden-door problem again unless pinned. The default should be pinned for the first game.
  - The slide-out covers the Goals column while it is open.

## B4 — Empire on the left, world on the right

**Borrows from:** Civ VII (progress buttons under the counters at the top-left; the Trophy / Age Progress button in the HUD opening the Victory screen) and the audit's own idea of splitting "screens about the empire" from "screens about the world".

- **Top bar, right end: the world.** Three labelled tabs that carry their own figures:
  - **Diplomacy**;
  - **Trade** `1/3`;
  - **Standings** `✦ 57/633 · ● 2/7`, which replaces the bar's renown and bead chips. Clicking the renown figure still opens the Reliquary and the beads still open the bead ledger.
  - Then ▤ ? ☰.
- **Top-left, under the bar: the empire.** A shorter dial row: Research, Statecraft, Religion (large); Leader, Supply (small).
- **Goals** under the dials.
- **Bottom-left:** the hover card alone.
- **Bottom-right:** the End Turn corner.
- **Why it works:** each side of the screen answers one question. Left: how is my empire doing and what is it working on. Right: how do I stand against the others.
- **Cost:**
  - `topBar.ts` gains the three tabs and loses the renown and bead chips (~150); `index.html` (~40).
  - A shorter dial row (~160); the rest as in B1.
  - About 5 days.
- **Risks:**
  - The top bar gains three labelled tabs, so it is busier than in B1. It holds 6 yields, 2 meters, the turn, 3 tabs and 3 system buttons; that fits at 1280 px but needs the tabs to drop to icons below about 1200 px.
  - Doors split between two places may need explaining once.
  - The tutorial step on `.civ-meters` (`tutorial.ts:220`) is unaffected; the one on `#abacus-button` (`tutorial.ts:136`) needs a new anchor, as in every option.

## Compared

| | B (audit) | B1 dial row | B2 cluster | B3 sidebar | B4 split |
|---|---|---|---|---|---|
| Research | card alone, top-left | first dial in the row | big dial, bottom-left | first icon on the rail | first dial in the row |
| Doors | row of 7, bottom-left | same row as research | two dials with six doors above | left rail | empire dials top-left, world tabs in the bar |
| Bottom-left | doors + hover card stacked | hover card only | cluster + hover card side by side | hover card, right of rail | hover card only |
| Goals | under research | under the dials (matches the mockup) | top-left alone | right of the rail | under the dials |
| Supply | door in the row | small dial | small door in the cluster | rail icon | small dial |
| Map covered top-left, 2 commissions | ~190 px tall | ~150 px tall, ~560 px wide | ~70 px (Goals only) | 52 px wide strip + Goals | ~150 px tall, ~370 px wide |
| Top bar items | 14 | 14 | 14 | 14 | 15 |
| Main reference | Humankind | Civ VII, Endless Legend 2 | Humankind | Endless Legend 2 | Civ VII |
| Size | 4-6 days | 4-5 days | ~5 days | ~5 days | ~5 days |
| Main risk | clunky bottom-left | doors still top-left | crowded bottom edge | hidden labels | busier bar |

## Recommendation

**B1, the row of dials under the bar.**

- It is the arrangement two of the three references converge on. Civ VII puts its progress buttons directly under its counters. Endless Legend 2 moved every empire action to the upper-left after trying a split, because players wanted one place to look.
- It fixes what the user disliked about B. The bottom-left holds only the hover card, and research joins Statecraft and Religion as the first of three progress dials.
- It takes Humankind's best idea, the door that is also the progress meter, without taking its bottom-left placement, which made B clunky here.
- It lands the commission chips exactly where the commissions mockup already put them, and it is the cheapest of the four.

If the user wants the doors away from the top-left after all, B4 is the next choice: it moves only the three world screens into the bar and keeps the rest of B1.

Build order, as before: the top bar regroup first (about a day, fixes the overflow at 1024 px); then the dial row with Goals and Supply (2-3 days); then the End Turn corner (1-2 days).

## Sources

Humankind:
- Sullla, Humankind Tutorial Game Part One. https://sullla.com/HK/HKT1.html
- Steam discussion on Humankind's UI (2021). https://steamcommunity.com/app/1124300/discussions/0/3043858334666569762
- Steam discussion on idle units and the next-turn button. https://steamcommunity.com/app/1124300/discussions/0/595140510531751387
- Amplitude forum, UI feedback. https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design-and-ideas/threads/38262-ui-feedback

Civilization VII:
- CivFanatics, "User Interface" thread (top-left counters, the row of progress buttons under them, minimap with lens toggle at the bottom-left, unit stats and actions at the bottom-right). https://forums.civfanatics.com/threads/user-interface.691341/
- Civilization VII Update 1.4.0 notes (Victory screen from the Trophy / Age Progress button). https://civilization.2k.com/civ-vii/game-update-notes/2026-may-19-patch-1-4-0/
- Civilization VII patch notes (celebration countdown under the Government icon). https://support.civilization.com/hc/en-us/articles/54088808418579-Civilization-VII-Patch-Notes-Apple-Arcade-August-26-2026
- Screen Rant, "Civ 7 Is Promising More UI Updates" (tech icon opens a quick menu; minimap and lens limits). https://screenrant.com/civ-7-ui-updates-fixes-suggestions-op-ed/
- Steam discussion mentioning the bottom-right button that lists what to do before ending the turn. https://steamcommunity.com/app/1295660/discussions/2/570371033831324629

Endless Legend 2:
- Amplitude, "UI/UX Next Steps" (the Divided UI and the move of all empire actions to the upper-left). https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/996-ui-ux-next-steps
- Amplitude, "Public Test Branch - Update 6", 8 October 2025 (End Turn's mandatory-action message; side and top HUD panels). https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/1004-public-test-branch-update-6
- DBLTap, Endless Legend 2 Early Access review (interface described as good and functional, nested tooltips). https://www.dbltap.com/reviews/endless-legend-2-early-access-review
- Neowin, Endless Legend 2 Early Access review (interface praised; I could not open the page, so this comes from the search summary only). https://www.neowin.net/reviews/endless-legend-2-early-access-review-big-brilliant-ideas-reshape-the-4x-landscape/
