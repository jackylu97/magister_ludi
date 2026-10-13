# HUD and screens: decisions so far

A working doc for the interface rework, to pick up after the deck cards are in the game and the user has playtested them. It records what the user has settled, what is still open, and where the drafts live. Nothing here is built yet except where it says so.

The audits and drawings behind these decisions are artifacts (private to the user):
- Commissions and levies mockup: https://claude.ai/artifact/AamrztC6ntoHoHVfeo4rLn
- HUD audit (today's problems, layouts A, B, C): https://claude.ai/artifact/664bbkGcFdghzRwSxxjdDU
- Iterations on B (B1 to B4): https://claude.ai/artifact/PeTtBeRtf2Q2Y6r5pvL6KK
- Compact B4 (B4a, B4b, B4c): https://claude.ai/artifact/Ai3VR7bTf1qMswc8EHM1Q4
- The empire panel (E1, E2, E3): https://claude.ai/artifact/J17JPskARuBt3PreyLzMTF
- **Final E2, the agreed design:** https://claude.ai/artifact/FMZ5C4xQh9jRe2FUyRdZ76 — its written spec is `docs/plans/hud-empire-panel-spec.md` (every element, its states, sizes, keys, and the code each part replaces)
- **City screen audit:** https://claude.ai/artifact/Jhzd7CgUYeizKK7ucRrsF5 — written version `docs/plans/city-screen-audit.md`

The written versions are in the session scratchpad (`ux-audit/`); copy them into `docs/plans/` when this work starts.

## Settled

### The top bar
- **Lean, about 13 items:** the six yields; happiness and authority as one chip; turn and age in the middle; **Diplomacy, Trade and Standings as labelled tabs at the right end** (the other empires' screens, carrying the trade-route, renown and bead figures); then **?** and **☰**. The Compendium moves into ☰ and the ? card. (Layout B4, the user, 2026-10-12: *"B4 seems to make the most logical sense to me."*)
- The aim is that nothing scrolls out of sight at 1024 px wide, as happiness, authority and the age clock do today.
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

### Commissions
- **Card face:** the goal and a counter (pips for small counts, a bar for larger ones); an unseated commission shows its kept progress as paused. **Built** (batch C).
- **Chips on the left side of the screen, under the empire panel and outside its drawer,** one per seated commission, at most four and then "+N more": a see-through background, a solid left edge in the deck's colour, a ring that fills, the name and the count in words; hover for the full goal and reward; click opens the government sheet at that card; "Fulfilled · reward paid" for one turn, then gone. (The user, 2026-10-12: *"Let's have commissions appear on the left side outside of the empire menu."*) **Built** under today's dock; it moves to sit below the empire panel when the panel is built.
- Nothing about commissions goes in the top bar.

### Levies
- **Now: a "Levy a citizen" button in the city panel** with a menu: one line per use the player's cards grant, the exact figure, the granting card, the population change and when the city can levy again. **Built** (batch L).
- **Later, the user's preference: click a citizen token** to levy that citizen, showing the tile or job lost. Waits for the city panel to draw citizens as tokens; the levy menu is built so it can open from a citizen.

### End Turn
- **End Turn carries everything still waiting:** its label names the first item, a badge counts the rest, and hovering (or focus) lists them all, each a link. Replaces stacked notices. The chronicle and Lens sit as two small buttons beside it.

### Strategic resources
- **Their counts head the city build list,** where building decisions are made.

## Open
- **Supply off the map.** In every layout the resources table stops being always visible: it becomes a Supply entry in the empire menu, with a warning chip only while a resource has none spare. That reverses the rule recorded in `src/ui/holdingsRail.ts` (lines 20 to 45: the counts must be readable without a click). Needs the user's ruling.
- **The city screen, settled by the user (2026-10-12):**
  - Arrangement A (keep the two rails, each with one job done well) is the direction.
  - The treasury shows on the city screen.
  - The terrain hover card sits at the bottom-left.
  - What a building or unit would add (the illustrative yields) shows only on hover, as a card over the right column, not inline in the rows.
  - A purchase always costs the full price, so no buy control may sit under a progress bar or read as "finish the rest".
  - The Spend card as first drawn was awkward and is being redesigned.
- **City screen iterations (awaiting the user's pick):** https://claude.ai/artifact/NH1gNwDbS4znDYxyKPsa1N — written version `docs/plans/city-screen-iterations.md`. A1: a "Buy outright · full price" column on every row, spending beside each bank. A2 (recommended): a Build | Buy switch on the work rail; Buy lists gold, faith and citizens in one list with one cost column, replacing the Spend card. A3: buy from the row's hover card, and one Town actions list.
- **The city screen audit, as first written** (before the rulings above). It recommends **arrangement A, "the same two rails, each with one job done well"** (about 4 days): a Buy button on the thing being built; refusals stated on screen once per reason (grey for "not here", red for "cannot afford"); rows you cannot use folded into "Not yet"; each yield chip with its own complete breakdown starting from the town centre and worked land; "short of" chips; ‹ › arrows and the `,` `.` keys to step between towns; Supply counts heading the build list; one Spend card for rites, the levy and faith purchases. Alternatives: B, one tabbed panel (7–8 days, reverses the 2026-09-03 band ruling); C, a yield table along the bottom (about 2 weeks). Rulings it raises: whether the treasury may show on the city screen; the `,` and `.` keys; whether puppets are included when stepping between towns.
- **Two bugs the city audit found, live today:** the Trader row in the build list looks pressable but does nothing (the build is refused for `routeOnly`, `src/sim/tech.ts:1061`, and the panel never asks, `src/ui/cityPanel.ts:2544`); and the retired augur's "Call an augur" row still shows in every town (`src/ui/cityPanel.ts:2656` checks `awaitsTech`, not `retired`).
- **Small decisions inside the build:** the empire menu's key; whether Leader and Standings get keys (L and S were proposed); the "screen registry" in `src/main.ts` that the audit recommends building first, since `main.ts` holds 19 hand-written lists of which screens to close.

## Build order (when this starts)
1. Regroup the top bar (fixes the overflow).
2. A screen registry in `main.ts`, then the empire panel (E2), the commission chips under it, and Supply.
3. End Turn's waiting list, the chronicle and Lens beside it.
4. The city screen, per its audit.
