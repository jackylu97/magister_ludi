# The city screen — usability pass (spec of record, ruled 2026-09-03)

The user: "our city screen has gotten quite busy and it would be good to
simplify/clean up", judged against existing 4X UIs.

## The audit (against Civ V/VI)

What Civ V does that we don't: three zones with strong hierarchy — a header
band of identity facts, a read-mostly rail of standing facts with detail in
expanders, and one decision surface (production + purchase) where the
choose-list sits directly against the queue. The map does the citizen work.
Civ VI: the same split, with the choose-list tabbed by category and a
"current production" card carrying item, progress and turns at a glance.

What we do instead (`src/ui/cityPanel.ts` render(), top to bottom): header,
Yields, Citizens, Citizen focus, Specialists, Followers, Growth,
Production, Borders, Defence, Queue, Puppet, Built, Routes, **Add to
queue**, hints — ~15 sections in one column at equal visual weight.
Specific failures:

1. **The build decision is cut in half.** Queue sits mid-column; Add to
   queue is at the very bottom, with Puppet/Built/Routes between them.
   Choosing what to build next is THE decision the screen exists for.
2. **Standing facts interleave with decisions.** Defence, Built, Routes,
   Borders are read-mostly; they sit between things a player edits.
3. **The people are four sections** (Citizens, focus note, Specialists,
   Followers) reading as four topics when they are one: "where are this
   town's people and what do they believe".
4. **Every rule-5 list prints in full, always.** The breakdowns are the
   screen's glory but they cost a column-foot each; most reads want the
   fold, with the list on demand.
5. **No use of the house split.** The parchment split idiom
   (`sc-split`/`sc-column`/`sc-pane`) already carries Statecraft, Religion,
   Trade, the Compendium and now Diplomacy — the city screen predates it.

## Mounting (settled by the 2026-09-03 read-only survey)

The panel is NOT an overlay sheet and must not become one: `#city-panel` is
the right-docked fixed panel sharing the corner with `#unit-panel`, and the
citizen work happens on the BOARD beneath it — pinning citizens to ringed
hexes, Buy-tiles price tags, the city-focus vignette. An overlay would
cover the functions, not just the ink. So: **keep the right dock, widen it
(340px → ~520px), and put the `sc-split` inside it** — it does not join
the capped-overlay CSS rule. Knock-ons the widening forces:
`camera.cityFrameBiasPx` in `data/view3d.json` ≈ (width+14)/2 (pinned
numerically), the look number noted at `lookData.ts:1097`, the shared
`#city-panel, #unit-panel` selector (split it without breaking the
camera-bias pin's selector read), and the 860px breakpoint block (join the
existing one; `sc-split` already folds there).

## Revision 2 (user's notes on the first prototype, 2026-09-03)

Supersedes the two-pane shape below where they disagree:

- **Single column, one flow** — no `sc-split`. Width stays close to
  today's: **360px** (was 340; 520 rejected as too much). Camera bias knob
  moves the 20px.
- **No growth ring on this screen** — the Growth bar carries the turns
  figure; the working count rides the same row ("5/7 working"). The
  banner's ring is unaffected.
- **No "people" section.** Only a one-row **specialists** line (count ·
  yield · dismiss). The citizen-focus note prints only when a focus is
  set, one short line. Followers shrink to the faith name in the header
  band (full headline on hover).
- **Cut prose across the panel**: sub-sentences and captions trimmed to
  fragments; the closing board caption ("click a ringed hex…") prints only
  while the tutorial is active or Buy-tiles is armed.
- Order of the single column: header band → yield chips (breakdowns one
  hover deeper) → Growth bar → Borders bar → specialists row →
  Defence/Built/Routes disclosures → Building-now card → queue rows →
  tabbed Add-to-queue → buy line.
- The static prototype of record:
  https://claude.ai/code/artifact/d9a29ff5-d1fc-4631-9bb3-95a36edf0962
  (revision 2). Implementation awaits sign-off on it.

## Revision 3 — the full-screen mode — **RULED, SHIPPING** (2026-09-03: "Ok i much prefer this, lets ship this")

The user's ask: #3 (name band) + #4 (exit) designed for the whole screen,
board and worked hexes still the main event. Prototyped at the same
artifact URL (revision 3): the Civ V anatomy — the town's name band owns
the top edge (empire top bar yields while the mode holds; yield chips ride
the band), a ~230px translucent left rail (growth/borders bars,
specialists, the three disclosures), a ~264px right rail (production card
+ queue, tabbed add-list), the board keeping ~55% of the screen between
them with the dim-beyond-the-ring framing, and one "Leave the town"
button bottom centre. Implementation notes binding the build:

- Rev 2's content decisions carry over into the rails: yield chips with
  breakdowns one hover deeper, ONE specialists row, no "people" section,
  focus note only when set, disclosures closed by default, tabbed
  add-list, prose cut to fragments, the board caption only while the
  tutorial is active or Buy-tiles is armed.
- The board stays fully live between the rails (citizen pinning,
  Buy-tiles tags, the vignette). The dim-beyond-the-work-radius is part
  of the ship.
- Camera: with rails both sides the framing is roughly symmetric —
  `cityFrameBiasPx` re-tunes accordingly (its numeric pin follows).
  The full camera seizure/pan-lock (idea #1) was NOT in this ship; the
  pan-lock half landed in revision 3.1 below.
- The top bar yields to the band only while the mode holds; everything
  restores on leave. Esc = Leave the town.
- The tutorial anchors a step at `#city-panel` — keep the id on the mode's
  container or move the anchor with it in the same pass.

### What shipped (2026-09-03)

`src/ui/cityPanel.ts` builds the mode into the same `#city-panel` container;
`#city-panel` left the right-hand dock and `#unit-panel` kept it unchanged.

- **Layout**: `.city-mode` is a flow column — the band is the first row, the
  two rails live in a `.city-body` row under it. The rails' top is wherever
  the band actually ends, at every viewport width; no rule asserts a band
  height (the first build's `--city-band-h` is gone, and its absence is
  pinned). The band never wraps: the name and the belief line ellipsise, the
  figures and the chips never shrink.
- **Band** (`.city-band`, full width, flush at the top of the screen): name in
  the display face · Size · hp (ledger on hover) · siege badge · belief badge ·
  the six yield chips, each raising the rule-5 ledger it folds
  (`yieldLedger`). Since revision 4 the banks sit just left of the chips.
- **The chrome stands down** while the mode holds, all of it through one
  derived rule (`body:has(.city-mode:not([hidden]))` — nothing stored, every
  close path restores it): the **whole empire bar** (`#topbar`, the ☰ menu
  included — a half-emptied strip read as a bug, and Escape/Leave are the
  exits), the research card, the screen dock and the two popover columns. With
  the bar gone the mode's top padding collapses so the band sits flush; both
  facts share the one condition, so a browser without `:has` keeps the bar
  *and* keeps the band below it. The tile readout is the one card that stays —
  it slides right of the town rail instead.
- **Town rail** (`.city-rail.is-left`, 230px): Growth and Borders meters (the
  working count rides the Growth row; both breakdowns on the row's hover) ·
  Buy tiles · the focus note when set · the specialists row · four
  disclosures, closed by default with the fold in the summary — Defence · N
  (the fold of `defenseRows`), Built · N, Routes · N, Faith · N.
- **Work rail** (`.city-rail.is-right`, 264px): "Building now" card (name,
  bar, banked/cost · turns, contribute buttons, × to stop) · the queue rows
  after it, numbered from two · "Add to queue" tabbed by `queueCategory`
  (Units / Buildings / Wonders / Projects; shelf remembered in module state) ·
  the price-tag caption · the puppet card and the locked line. Revision 4
  replaced the price tags with a price column and added a Faith shelf.
- **Exit**: one "Leave the town ⏎" at the bottom centre, calling the same verb
  Escape does. The panel's × is gone.
- **Board**: the container takes no pointer events; the dim, the ringed hexes,
  citizen pinning and Buy-tiles price tags are untouched.
- **Camera**: `cityFrameBiasPx` 177 → **17** — half the difference between the
  two rails' footprints, pinned in `test/ui/cityScreen.test.ts`.

Deviations from the prototype, all named: the board caption is centred above
the exit rather than bottom-left, which `#hud-context` owns; the prototype's
"263🪙 on hand · Buy with gold" line is not built — the per-row price tags
stand, and the 2026-08-27 ruling forbids reprinting the treasury under the
build list. (Superseded by revision 4: the user ruled on 2026-10-12 that the
treasury shows on the city screen.)

## Revision 3.1 — the camera and the wash (ruled 2026-09-04, shipped)

The user's marginalia: "Easing camera isn't needed for now, but refusing pan
is good" · "lighten the vignette slightly, maybe 25% less in visibility".
Idea #1's second half only — no easing on open, no easing back on leave.

- **Pan lock**: `panLocked()` in `controls.ts` is `openCity() !== null`, read
  by the `pointermove` drag. Derived, no flag — every way out of the mode
  (Leave, Escape, a seat change, a town captured under the panel) restores
  the pan for free. The press, the click and the wheel are untouched:
  clicking hexes is the mode's own input, and the zoom stays the player's.
  A locked drag still accumulates `travelled`, so it is not read as a click.
- **Vignette**: `vignette.opacity` 0.68 → **0.51** in `data/view3d.json`
  (three quarters of what it was). Data-only; the wash's shape, its one mesh
  and its `refreshCityFocus` seam are unchanged.
- Pinned in `test/ui/cityScreen.test.ts` ("the city mode and the camera").

## Revision 4 — buying (A1), batch UX5 (shipped 2026-10-15)

The user chose A1 on 2026-10-12 (`docs/plans/hud-ux-decisions.md`, "City
screen buying and spending: A1"; the drawing is
`docs/plans/mockups/city-a-iterations.html`). The governing rule: **a purchase
always costs the item's full price and never gets cheaper as the town builds
it** (`purchase.ts`). So no price sits under or beside a progress bar, the
"Building now" card and the queue rows carry no prices, and every price reads
as buying outright.

### The price column

- Every row of the add list has a price cell in one right-hand column
  (`src/ui/priceCell.ts`). Over the column, once: "Buy outright · full price ·
  you have 437 gold" (plus "· 51 faith" when an ordinary row is also priced in
  faith).
- Three looks, told apart by shape and not by colour alone:
  - **can buy now**: a pressable plate with the figure, in the bank's ink;
  - **short of the bank**: the plain figure, not pressable, with "need 31"
    under it in the wanting voice;
  - **cannot be bought here**: a dash. The reason is said elsewhere (below).
- Which look a cell gets is the purchase gate's answer (`purchaseLook`, which
  reads `explainPurchaseCost`, `purchaseError` and `bankOf`). "Short" means the
  gate refused for the money and nothing else; any earlier refusal makes it a
  dash, because more money would not help.
- A seat that has ended its turn sees its pressable prices greyed in the quiet
  ink (a state, not a lack). The work rail's foot already says the turn is over.
- Wonders now have a cell too. In most towns it is a dash ("a wonder must be
  built, not bought"), but a card can open a bank for one (The Gilded Scaffold
  for gold; the Valley of Kings and The Pious Masons for faith), and then the
  price shows.
- Projects get an empty cell that keeps the column's width. A project is a
  conversion, so nothing can buy one.
- The caption under the list says what a gold price is: the full cost at the
  gold-per-hammer rate, however much has been built, and that buying what is
  being built now passes its banked hammers to the next item.

### Refusals, once per reason

- The refused cells of a shelf are grouped by the gate's sentence
  (`src/ui/refusalLine.ts`, `planRefusals`). A reason several rows share is one
  line at the head of the shelf ("A Warrior already stands in Aldermarch — move
  it first") and those rows show the dash. A reason only one row has is a short
  line under that row ("Aldermarch needs population 2 to raise a Settler (it
  has 1)").
- Sentences that differ only in the row's own name at the start are one reason
  too. Every wonder is refused in its own name, so the Wonders shelf says
  "Each of these is a wonder — it must be built, not bought" once.
- When a shelf has two or more shared reasons, each line and each dash it
  covers carry the same small number.
- A dash whose reason the row already prints adds nothing: a unit greyed for
  its missing horses, or a harbour inland, is refused for sale in the same
  words its row already shows.
- "Cannot afford" is the short look, never a refusal line.
- No refusal lives only in a native tooltip. The contribute buttons under the
  bar also print a refusal on a line under them.
- Every refusal line wears the wanting voice (`.wanting`).

### Queued buildings stay in the list

- A building in the queue, the current build included, keeps its row in the add
  list, marked "in queue · 1st" (2nd, 3rd …), priced in full. Its build button
  cannot be pressed (a second copy in one queue is refused), so it is drawn as
  a quiet label rather than a greyed refusal. Its price can be pressed, so the
  current build is bought in one press.
- Buying it strikes the queued copy, and the hammers banked toward the current
  build carry on to the next item (`purchaseItemAt`, `reaimProduction`). The
  panel repaints from the state, so the row leaves the list and "Building now"
  shows the next item with the hammers.

### The Faith shelf

- The things a town buys with faith and never builds ("Call a prophet" and the
  rest) are a shelf of their own, with a Faith tab after Projects and a heading
  of its own: "Buy outright · full price · you have 51 faith". Their offer is a
  plain label, not a button; the price beside it is the control.
- Things bought with gold and never built (the Company Guard) stay at the foot
  of the units, beside the bank they draw on.
- The shelf stays open in this batch. Collapsing it when nothing in it is
  affordable is batch UX7.

### The treasury in the band

- "Treasury 437 (+21) · Faith 51 (+2)" sits just left of the six yield chips,
  in the top bar's voice: the bank, then the rate in brackets
  (`src/ui/bankFigure.ts`, which writes it with the top bar's `poolFigure` and
  reads the same `readEmpire` totals). The 2026-08-27 ruling that kept the
  treasury off this screen assumed the top bar was visible above it; the mode
  hides the top bar, and the user ruled on 2026-10-12 that the treasury shows.

### Two bugs fixed

- **The Trader row** looked pressable and did nothing: the queue refuses a
  route-only unit, and the unit loop never asked `buildError`. Every unit row
  now asks `buildError` with the town in hand, so no refused row looks
  pressable, and caravans are not build rows at all (`offeredInBuildList`).
  One line stands in for them, "Caravans are hired on the trade sheet →", which
  opens Trade through the panel's `onOpenTrade` option.
- **The retired augur** printed "Call an augur" in every town, because the
  loop over things that are only bought checked `awaitsTech` and not `retired`.
  No retired row prints anywhere now.

### A refused command says so

- Before, every command this panel sent returned silently when the reducer
  refused it. Now the refusal's sentence is one line at the top of the work
  rail, held there while the rail scrolls, until the next accepted command (from
  anywhere: it shows only at the revision it was refused at) or the next town.

### How it is built

- `buildListModel` (`cityPanel.ts`) is the add list as data: which rows exist,
  which build buttons may be pressed, each price's look, and where each refusal
  is said. `renderBuildables` only draws it. `test/ui/cityPanelBuying.test.ts`
  sends every pressable row and every pressable price to the reducer on a copy
  of the state and checks it is taken.
- The three shared modules, `priceCell.ts`, `refusalLine.ts` and
  `bankFigure.ts`, are written for the faith screen and the HUD to use too
  (`docs/plans/hud-ux-decisions.md`, "Shared components"), each with its own
  test file.
- Recognising "short of the bank, and only that" compares the gate's refusal
  with the sentence `purchaseError` writes for its last clause, the same
  comparison the bot makes (`outOfReachFor` in `src/ai/wants.ts`). A
  simulation reading that answered it directly, as `purchaseHexBlocker` does
  for the town's hex, would replace that comparison.

## Citizen focus pane (ruled 2026-09-03, shipped)

The user: a Civ V/VI-style citizen management control — "default focus,
food focus, prod focus, gold focus, and avoid growth checkmark for now."
As built:

- **State**: `City.focus` ('food' | 'production' | 'gold'; the key is absent
  for Default — presence is the state) and `City.avoidGrowth?: true`. Both are
  player intent the board cannot recompute, and both are cleared by
  `handOverCity` with the queue and the pins.
- **Verb**: `setCitizenFocus {cityId, focus?, avoidGrowth?}`, validated fully.
  An absent field is a half not named; clearing is said out loud
  (`focus: 'default'`, `avoidGrowth: false`). Turn-gated, refused for a puppet
  — `citizenFocusError` is the one gate, and it is what greys the control.
- **Sheets**: one table, `rules.cities.citizenFocusWeights`, keyed by focus.
  `citizenWeightsWhileHalted` is gone: a halting town (settler at the front)
  leans on the `production` row of the same table. `citizenLean` decides which
  speaks, and **the player's word outranks the game's guess** — a town told to
  chase coin chases coin with a settler at the front. Each sheet gives the
  focused yield the top weight and leaves the other two in `citizenWeights`'
  own order beneath it; nothing is zeroed. Default is untouched, and is pinned
  as never dominated by a focus (`test/sim/cities.test.ts`).
- **Avoid growth** is a trim applied *after* the sheet has chosen
  (`capFoodSurplus`): one swap at a time, cheapest score first, stopping at
  the swap that would put the town into deficit. It never moves a pinned
  citizen and never walks through a starving arrangement, so a town that could
  only reach nothing by two swaps at once keeps a bushel.
- Locked tiles outrank both. Bot untouched (its own citizen valuation).
- **UI**: `renderFocusPane` — four sentence-case segments and an "Avoid growth"
  checkbox, in the left rail's clocks card directly under Growth and Borders.
  The settler note (`renderCitizenFocus`) is silent once a focus is set.
- Rode the v60 wave (schema note: assignment outcomes change).

## "You are in a city" — mode ideas (2026-09-03, not yet ruled, no build)

Civ V's trick is that the city screen is a MODE, not a panel: the camera
seizes the town, the world dims, the chrome changes, and one obvious exit
returns you. Candidate moves for us, cheapest first — they compose:

1. **Camera seizure** — opening the screen eases the camera onto the town
   (the bias knob already half-does this) and locks free pan while open;
   Esc/Leave eases back to where you were. Biggest single "I am somewhere
   else now" signal, no visual redesign. (Part-ruled 2026-09-04: the pan
   lock shipped in revision 3.1, the easing is declined for now.)
2. **Dim the world, light the ring** — strengthen the existing city-focus
   vignette: everything beyond the work radius drops toward the table
   colour (the fog wash's cousin), the workable ring reads bright, other
   towns' banners and far units hide. The board stays live inside the ring
   (citizen pinning, tiles) — outside it goes quiet.
3. **The town's name across the top** — a parchment band spanning the
   viewport top (large Instrument Serif name, size/hp beside it), the
   Civ V city-banner-header move; the side panel then needs no header of
   its own. The top bar's empire chips could yield to city figures while
   the mode holds.
4. **An unmistakable exit** — one wide "Leave the town" button at the
   bottom centre (Esc equivalent), instead of only the panel's ×.
5. **An ink frame** — a drawn border around the whole viewport while in
   the mode (the ledger-page metaphor); cheap, loud, very much our
   language.

Recommended cut if ruled: 1 + 2 + 4 (mode feel without new chrome), with
3 as the second pass if it still reads ambiguous. Idea 5 is the flavour
lever if the rest feels too quiet.

## Open to the implementer

- Whether Yields chips and People merge into the header visually.
- Tab memory (last tab per session) — fine via module state, not state.
- What the mobile/narrow fold does (the split idiom already folds at
  860px — follow it).
