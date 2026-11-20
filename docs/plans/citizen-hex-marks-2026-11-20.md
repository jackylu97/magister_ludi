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
