# How the board shows the citizens' hexes (2026-11-20)

Ruled by the user. Not built. Owner: Astra (the marks are drawn in
`src/render3d/overlays.ts`), with one small control on the city screen.

## The user's words

- On the built city screen: "could we do a design pass on the hex
  assignments? it's a bit unclear right now".
- On option B (light and shade): "this one feels cleaner to me. Could we
  outline tiles that are worked too?"
- On option C (the same with a citizen mark): "this sounds great but i'm
  worried it'll be too busy", then "lets aim for a very simple icon".
- The ruling, after seeing both at the size of the game: "ok lets do C with a
  toggle for the citizens, so both B and C with a toggle so i can see both."

## Pictures

- The four first options: `docs/plans/mockups/citizen-hex-marks/citizen-hex-marks.html`
  (https://claude.ai/artifact/SSYK3QGWPTMSA9iYDm2mbH).
- B and C at the size of the game:
  `docs/plans/mockups/citizen-hex-marks/citizen-hex-marks-at-size.html`,
  `option-b-at-size.jpg` and `option-c-at-size.jpg` beside it
  (https://claude.ai/artifact/MMLJrDELoof1ZCCux3qt6c).
- The mock-ups are drawings on a plain hex map. They show the marks, their
  sizes and their order. They are not the game's board.

## What a player sees while a city is open

Today a worked hex has a small bone ring, and a pinned hex has the ring in the
seat's colour (`overlays.ts`, "Worked-tile marks"). That is replaced by this.

| The hex | Shade | Outline | Marks |
|---|---|---|---|
| A citizen works it | none: full brightness | bone, with a thin dark edge so it holds on pale ground | its yields; the citizen dot when the toggle is on |
| A citizen works it and the player pinned it | none | the seat's colour | its yields; a seat-colour dot when the toggle is on, a small lock when it is off |
| Free: this city could work it and nobody does | light | none | its yields, a little fainter |
| Not available to this city (another city of yours works it, it is outside the city's reach, or it cannot be worked) | dark | none | the name of the city that works it, when one does |
| The city's own hex | none | none | none |

- **The citizen dot** is one plain disc, bone with an ink edge, above the
  yields. It is the "very simple icon". It is not a figure.
- **The toggle** is "Citizens" in the legend at the bottom centre of the city
  screen, beside Buy tiles. On is option C (dots). Off is option B (no dots,
  and a lock on a pinned hex). It starts on. The choice is a per-viewer
  setting kept in the browser, as the lens choice is. The user asked for the
  toggle "so i can see both"; it may be removed when the user has chosen.
- **The legend** names the marks in a few words: the dot or the outline for a
  worked hex, pinned by you, free, not yours.
- **The yields** are the yields lens's own chips and figures
  (`explainTileYield` with the owner's context; rule 5). Do not compute a
  second figure. They show on worked and free hexes while a city is open,
  whether or not the lens is on.
- **Clicks do not change:** a click on a free hex sends a citizen there and
  pins it; a click on a pinned hex frees it (`setLockedTiles`). Hover keeps
  its accent ring.
- **Fog and reveal:** a hex the seat has not explored gets the dark shade and
  no marks. A gated resource follows `RevealView` as today.
- **Cost:** the shade and outlines rebuild when the worked set, the pinned set
  or the open city changes, and never each frame (the lens's rule).
- **Colours and sizes are data** in `data/view3d.json` beside the present
  `TERRITORY.workedColor`, `lockedColor` and opacities.

## What the builder needs to decide and report

- Whether the shade is a second instanced layer or a wash on the board's own
  material. Either is fine; the fog wash is the nearest pattern.
- How the name of the other city is drawn (an atlas text mark or a DOM label).
- The city screen is `src/ui/cityPanel.ts`. The Claude session is changing it
  now (the second step of the city screen build puts Buy tiles at the bottom
  centre). Add the legend and the toggle beside that control after that step
  lands, or ask the Claude session to add them: say which in the hand-back.
- Tests: the overlay's inputs for the five states, the toggle's two forms,
  and that no yield is computed outside the lens's reading.

## Styling pass and the Manage citizens mode (2026-11-20, later the same day)

This section replaces the table and the toggle above where they disagree.

### The user's words

"could you take a look at the new citizen selection screen? the citizen
management button feels like it doesn't really do anything, but it might be
nice for hiding the complexity of citizen selection. Could you do a pass on the
design? rn i hate the white outlines and the dots are quite ugly. The glow is
promising and i think it just needs a styling pass."

### The reading

- The first build had no glow. "The glow" was the worked hexes standing bright
  against the shaded ground. So the lit hex is the mark, and the white outline
  and the dots are removed.
- The button becomes a mode, as Buy tiles is. That is what "hiding the
  complexity" means.

### What was built

- **The mode.** `setCitizenMode` and `isCitizenMode` in `src/ui/controls.ts`,
  beside `setBuyMode`.
  - Off, which is the state each time a city opens: the board shows no shade,
    no marks and no yields, the dock shows no legend, and a click on a hex does
    not pin or unpin. The board shows nothing new for the open city.
  - On: the shade, the lit hexes, the yields, the legend, and pinning by click.
    The `takeHint` words ("Take from ...") show only then.
  - The button reads "Manage citizens" when off and "Stop managing" when on,
    with the pressed state.
  - Esc stops the mode and keeps the city open. Manage citizens and Buy tiles
    exclude each other.
  - No sim command changed. Only the time at which the UI sends
    `setLockedTiles` changed.
  - The per-viewer "Citizens" setting (`webciv.citizenDots`) is removed.
- **Three styles of lit hex**, picked by `territory.citizens.style` in
  `data/view3d.json` ("a", "b" or "c"), so that the user can compare them in
  the game. All three share the shade. `src/render3d/citizenMarks.ts` draws
  them.
  - a, soft inner glow: an additive warm light just inside the hex edge that
    fades toward the centre. No line. This is the value in the file.
  - b, lifted light: nothing on the worked hex. The shade on the hexes around
    it fades out toward it.
  - c, gilded edge: a thin soft gold line with a faint glow.
  - A pinned hex has the same treatment in the seat colour, and a redrawn lock
    (pale, with a soft dark halo) near the lower edge of the hex, clear of the
    yield figures. There are no dots.
  - Another town's name keeps its place and has the lock's pale ink and halo.
- **The shade.** `freeOpacity` 0.40 and `darkOpacity` 0.66. The renderer blends
  in linear light, so a dark shade looks weaker on screen than its number.
- **The legend** shows only while the mode is on. Each key is a small hex drawn
  like its mark, from the same data as the board. There is no dot key.
- **Cost.** Instanced decals through `InstanceCollector`, one 256-pixel texture
  for each light profile, no work each frame, and a rebuild only when the
  signature changes.
- **Tests.** Six test files were changed to agree. They were not run, because
  tests were paused.
- **Review page.** The three styles, the mode off, and the first build for
  comparison, as screenshots of the game. When the user has chosen a style, the
  other two can be deleted from `citizenMarks.ts` and the data.

## Second styling pass: built from the game's own parts (2026-11-20)

This section replaces "Three styles of lit hex" and "The shade" above. The
three styles and `territory.citizens.style` are removed. The mode is unchanged.

### The user's words

"A is closest, i hate the artifacts from the gray shading in the background,
could we do that more naturally? A is closest to what I want, but it still
looks somewhat awkward, and the pinned hexes are difficult to tell apart. Could
we do a deeper pass and build it from the ground up with similar styling as the
rest of the game?"

### What was built

- **The ground is set back in the painted board's own materials.** There is no
  wash decal on the painted board.
  - The fog's light field (`createPaintedLightField` in
    `src/render3d/paintedFogLook.ts`) has two more channels: blue is 1 on a hex
    that is set back, alpha is 1 on a hex the open city cannot work at all (and
    on the city's own hex).
  - `SET_BACK_PAINT` in the same file is the shader block. A free hex keeps its
    own colours, a little darker and greyer. A hex that is not available is
    clearly more so. Trees and water go with the ground. The inside of a hex is
    one even tone, and the step to the next hex is soft and has no seam.
  - A worked hex has a soft warm rim inside its edge, painted by the same block.
    It is under the territory border, so the two do not fight.
  - `PaintedBoard.applySetBack(kinds)` writes the texels and one uniform. The
    renderer calls it after each lens rebuild (`rebuildLens`). The board is
    never rebuilt. With the mode off the block costs one uniform test for each
    fragment.
  - The numbers are `territory.citizens.ground` in `data/view3d.json`.
- **A pinned hex** has a firm line in the seat's colour, a little inside its
  edge. It is `frontierRibbon` of `movementBoundary.ts`, the movement range's
  ink: joined corners, laid over the terrain, with a dark backing strip so that
  a pale seat's line reads.
- **The seal** of a pinned hex stands on the resource markers' pin, at their
  height and size, at the hex's upper right. Its shape is the luxury marker's
  scalloped coin (`traceMarkerPaper`), in the seat's colour. The lock is in the
  seat's second colour, or in paper or ink if that would not read on the wax
  (`sealMarkColor`).
- **Another town's hex** has that town's name in the city banner's face.
- **The legend** has four keys drawn like the four states, from the same data.
- **The frozen toon board** has no painted materials. There `CitizenMarks`
  draws one plain wash decal for each hex, as the first build did.
- **Tested on** a bot game at turn 76 (a city of twelve citizens with farms, a
  camp, lumber mills, fishing boats and roads, and three neighbouring towns),
  with a red, a pale yellow and a dark navy seat.
- **Not built:** a fade when the mode turns on or off. The uniform
  `paintedBackOn` can carry one.
- **Tests** were updated to agree and were not run, because tests were paused.

## Third pass: three options for the worked and pinned marks (2026-11-20)

### The user's words

"This is the right direction." "a worked hex is hard to tell, and the pinned
tile using the same color is a bit confusing." "lets try to visualize 1-3.
Maybe 3 can be thematic and lean into the arcane style we have elsewhere in the
game". Option 1 is the user's own idea: "highlighting/outlining all worked
tiles in a neutral color and pins with the leader color, but the outlines are
slightly smaller than the hex itself."

### What was built

- `territory.citizens.marks` in `data/view3d.json` picks the option: 1, 2 or 3.
  The file has 2. `src/render3d/citizenMarks.ts` draws all three.
- In all three, the seat-colour line beside the territory border is removed.
  The mode, the set-back ground and the town names are unchanged.
- Free ground is set back more, so that worked reads against free:
  `freeShade` 0.72 to 0.62, `freeGrey` 0.35 to 0.45, `freeCool` 0.06 to 0.08.
- **Option 1.** A thin parchment outline on every worked hex, inset 0.27 of the
  hex radius, with rounded corners and a faint dark backing. A pinned hex has
  the same outline in the seat's colour, and the seal.
- **Option 2.** The same neutral outline. A pinned hex has a second outline
  inside the first in the same ink, and the seal. Only the seal has the seat's
  colour.
- **Option 3.** No outline. A worked hex has a token on the resource markers'
  pin at its upper right: the luxury marker's scalloped coin in paper with a
  gilt rim, and the sun of a rare Order card's corner (`CORNER_SUN`). A pinned
  hex has the same sun in wax of the seat's colour, with the sealed chair's
  lock (`CHAIR_LOCK`) on a small paper tab. A free hex has nothing; a quiet
  ring is drawn but off (`tokenFreeRing`).
- The pinned token of option 3 is the seal of options 1 and 2.
- The outlines are level, at the height of the hex's centre. Laid over a hill's
  slopes they came out bent.
- The warm rim is kept in full in option 3 and at about a third in options 1
  and 2 (`ground.rimByMarks`).
- The legend follows the option.
- When the user has chosen, the other two options can be deleted.

## The final design (2026-11-21)

This section is the current state. It replaces the three options above: the
`marks` switch, option 1, the tokens and the seal are deleted.

### The user's words

"I like the double outline, i think the seal is a bit busier than the double
outline. Could we also have the outline sit a bit lower, it looks a bit weird
when its offset like this. My proposal: option 3 when not in the citizen
management screen, option 2 when citizen management is active. The inset
outlines replace the mouseover effect when you mouse over a city". Then, on
the option 3 view: "let's remove the tokens from the option 3 view."

### The design

- **Manage citizens on.** A worked hex has one neutral inset outline. A pinned
  hex has two. No seal and no token. The ground the city does not work is set
  back fully. The yields, the other towns' names and the legend show. A click
  pins or unpins.
- **A city screen open, the mode off.** The ground the city does not work is
  set back lightly (`ground.openLevel`, 0.55 of the mode's shade), and each
  worked hex has the warm rim at full strength (`ground.openRim`). The yields
  of the city's hexes show (the user, 2026-11-21: "yields should appear by
  default on the city screen"). No outlines, no legend. A pinned hex looks like a worked hex. A
  click does not pin.
- **The pointer on a city on the main map.** The same inset outlines, single
  for worked and double for pinned, with no shade. They replace the small
  rings that `overlays.ts` drew (bone for a worked hex, the seat's colour for
  a pinned hex). `territory.workedColor`, `workedOpacity`, `lockedColor`,
  `ringScale` and `lockedRingOpacity` are removed.
- **The outline** is `citizenOutlines` in `src/render3d/citizenMarks.ts`. The
  mode (through `CitizenMarks`) and the hover (through `overlays.ts`) both use
  it. It is level, at the mean height of the ground under it plus
  `outlineLift` 0.012. Before, it stood at the height of the hex's centre and
  looked shifted up the screen. Its colour is `sand`, warmer than before.
- **The fade.** The shade and the rim each have a strength (`paintedBackOn`,
  `paintedRimOn`). `PaintedBoard.applySetBack` eases them to their new values
  over `ground.fadeMs` (150), and the renderer's loop calls `advanceSetBack`.
  In the mode the rim is at `ground.manageRim` (0.35) under the outlines.
- **The legend** shows worked, pinned (a double line), free, and not yours.
- **Tests** were updated to agree and were not run, because tests were paused.

## The bottom dock (2026-11-21)

The user's words: "city screen looks good", and "could we integrate the
buttons on the bottom better? I also like having a 'leave city screen' button
on the bottom, like before."

- `renderBuyDock` in `src/ui/cityPanel.ts` builds one bar (`.city-buy-dock`)
  in the paper of the screen's cards: the same edge, corners and shadow.
- It holds three controls of one height in a fixed order: Manage citizens,
  Buy tiles, then Leave city with an Esc key cap behind a thin rule.
- The two modes are toggles. Their names do not change, the one that is on is
  filled with ink, and only one can be on.
- The caption, the citizens' legend, the treasury line and the reason buying
  is refused are a drawer inside the bar, over the buttons. It opens in 150 ms
  when its content changes, and not at each rebuild of the panel.
- Leave city is the wide "Leave the town" button that stood at the bottom
  centre until the layout of 2026-11-20 (commit 4d035185 moved it to the head
  as a ×). The × in the head stays. Both call the one `onClose`.
- The dock is centred on the screen, and its width is capped so that it clears
  the work rail: `min(36rem, 100vw - 2 * (360px + 28px))`.

### The dock, second pass (2026-11-21)

The user's words: "could we massively simplify the hints, there's way too
much text. it also looks plain compared to the other UX, but the layout is
fine. I think just the 'worked' and 'pinned' icons need to exist to show the
player what those mean, but they look a bit awkward where they sit."

This replaces the lines above about the drawer's content, the legend and the
dock's position.

- **Text.** The Manage citizens mode has no caption and no drawer. The buy
  mode's drawer has the treasury ("N on hand") and, if there is one, why a
  purchase is refused. How to use a mode is its button's note (`noteOn`). The
  tile readout at the bottom left prints no line for either mode
  (`publishNotice` in `controls.ts`).
- **The keys.** `renderCitizenKeys` draws two keys, Worked and Pinned: a small
  hex with one inset outline and one with two, as SVG. They stand at the left
  end of the dock's row while the mode is on. The four-key legend is removed.
- **Styling.** The buttons are the kit's, as End Turn's is: a heavy ink edge,
  the paper's square corner and a hard ink shadow. A mode that is on is filled
  with ink and pressed onto its shadow. Leave city is the kit's quiet button.
  Buy tiles has the gold mark and Manage citizens a small hex. The bar has the
  head band's rule turned over (ink, paper, gilt).
- **Position.** Centred on the gap between the two rails: `left: calc(50% -
  37px)`, the camera's `cityFrameBiasPx`. Its width is capped at the gap.
- **Narrow screens** (the user: "check this overflow"). At 1280 wide the bar
  with the two keys was wider than its cap, and its ends stuck out of its
  paper. Under 1360px the keys are the marks alone (each word is the key's
  tooltip and `aria-label`) and the buttons' side padding is 10px. The cap is
  the gap less 32px on each side. Measured at 1280x800 and 1280x720: 9px of
  paper round every part, and 75px or more to each rail.

## Idea e, "the yields are the mark" (2026-11-21)

This section is the current state of the marks. It replaces the inset
outlines of "The final design" above. The shade, the rim, the mode and the
dock stay.

The user's words, on eight mocks: "lets do e. i think c may be trying to do
too much, i want this to feel unintrusive."

- **A worked hex:** its yield figures sit on a small parchment plaque (paper,
  a thin ink edge, a soft shadow, slightly rounded corners), sized to them.
- **A pinned hex:** the same plaque with a pin head in the seat's colour on
  its top edge (a dark rim and a small highlight, so that a pale seat reads).
- **A free hex:** faint yields and no plaque, and only in the Manage citizens
  mode. With the mode off only worked hexes show their plaques.
- **The pointer on a city on the main map:** the same plaques, with no shade.
  If the player has the yields on, the plaques join them.
- **How it is drawn.** `addPlaque` in `src/render3d/lens3d.ts` adds one flat
  quad behind the figures, in the yields' own collector. Sizes are rounded up
  to `plaque.step`, and each size has one small canvas texture
  (`plaqueMaterial` in `citizenMarks.ts`), kept until the layer is disposed.
  The pin heads are one more texture for each seat colour. The figures are
  today's atlas glyphs; dark ink glyphs were not tried.
- **Tunables:** `territory.citizens.plaque` in `data/view3d.json`.
- **The dock's keys** are a small plaque (Worked) and a plaque with the pin
  head (Pinned).
- **Left behind:** `citizenOutlines` and its tunables. `overlays.ts` still
  imports it and `controls.ts` hands it no hexes. Another developer had
  `overlays.ts` open, so it was not edited. Delete both together later.
- **Tests** were updated to agree and were not run.
