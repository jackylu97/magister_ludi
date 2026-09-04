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
  The full camera seizure/pan-lock (idea #1) is NOT in this ship; flagged
  as a follow-up ruling.
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
  (`yieldLedger`).
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
  the price-tag caption · the puppet card and the locked line.
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
build list.

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
   else now" signal, no visual redesign.
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

## The first redesign (kept for the record; rev 2 overrides)

Adopt the house split, inside the widened dock. **Left column — the town**
(read-mostly):

- Header band: name · size · hp (+siege badge) · belief line · the growth
  ring (the banner's own mark, larger) with "grows in N" beside it.
- A **yield chip row** — one chip per yield showing the fold; the full
  rule-5 breakdown moves to the existing hover-card idiom. Nothing is
  deleted, it is one hover deeper.
- **The people** — one section: assigned count + focus note + specialists
  + followers as sub-rows of a single box.
- **Growth and Borders** — two compact progress rows (bar, turns figure),
  breakdowns on hover.
- **Standing facts, collapsed** — Defence / Built / Routes as disclosure
  rows (closed by default, count in the summary: "Built · 7"), the current
  contents unchanged inside.

**Right pane — the work** (the decision surface):

- A **current production card**: item name, progress bar, turns, with the
  modifier lines it already prints.
- The queue rows directly under it.
- **Add to queue directly under the queue**, tabbed by
  `ProductionCategory` (Units / Buildings / Wonders / Projects) instead of
  one long list; the buy-mode toggle and purchase prices stay exactly
  where the flow has them, inside the same pane.
- Puppet note and locked hints stay with the pane they explain.

Rules that bind the pass:

- **No information deleted** — every list, ledger and hover the screen
  prints today remains reachable (hover or disclosure). Rule 5 is not
  negotiable; this pass moves ink, it does not dry it up.
- No sim changes, no new sim reads — the same `CityQuote` photograph.
- Specimen language throughout; tabular figures; the split's existing CSS
  classes and the capped-overlay rule (the sheet joins the one rule the
  register test pins, as Diplomacy just did).
- Keyboard/Esc/close behaviour, `gameDisposers`, and the sticky info-card
  rules unchanged.
- The 8/28 ruling stands: no redundant "Empire +X%" line beside the
  per-city modifier lines.

## Open to the implementer

- Whether Yields chips and People merge into the header visually.
- Tab memory (last tab per session) — fine via module state, not state.
- What the mobile/narrow fold does (the split idiom already folds at
  860px — follow it).
