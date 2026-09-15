# Painted fog — the three registers

Status: **landed** (F1). The ruling is `docs/flags.md` **(zzzz)**; the
sequencing, after the shadows batch, is **(ddddd)**. The painted look
(`?art=painted`) draws the shadowed treatment on remembered ground and the chart
table under uncharted ground; the frozen toon board (`src/render/`, `fog3d.ts`'s
vellum patches) is untouched and still draws the fog it always did.

Reference of record: **`mockups/fog-study/three-registers.png`** — the user's
plate. The review page shows it beside the sliders (*Reference plate*) so the
match can be judged without leaving the frame.

Review page: **`/terrain-study.html?review=fog`** — the *production* board
(`buildPaintedBoard`) with staged levels, a visible bubble inside a remembered
ring inside blank paper, every knob on a slider and the reveal on a button.

## The three registers

| | the picture |
|---|---|
| **uncharted** | **paper on the table.** A real surface at the ground datum, wearing the world-space grain and a faint ruled hex, lit by the same sun and — the point — *receiving the explored relief's cast shadows*, so the diorama reads as a relief model set down on a chart rather than as sculpture beside a flat marker. Out in the margin, where a whole disc is uncharted sea, the paper takes the sea's wash. |
| **remembered** | **the same world, in shadow.** Civ's convention, and what the user chose off the plate: full pigment, full geometry, the sun scaled by `shadowedSun` and shifted a little toward the ink (`shadowedCool`, `shadowedShade`). Nothing about the hex moves — a hill keeps its silhouette and its colour — so what separates memory from sight is *light*, which is the one thing a player never has to be taught. |
| **visible** | **the lit model**, untouched to the bit. |

**Ink is discrete, light is continuous.** The uncharted frontier is a whole hex
either way — it is where the sculpt ends — so the discard reads the vision
channel with **nearest** filtering and lands on hex edges. The lit edge is
light, so it fades: a second, **linearly filtered** field carries one weight per
cell and the material samples it at the fragment's own world position, over
`sunFalloff` hexes centred on the boundary.

That second field is **doubled in x** — cell `(col, row)` writes texel
`2·col + (row & 1)`, and the interleaved texels hold the mean of the two hexes
they sit between — because an offset-row map is sheared against world space and
a plain `W×H` filter would blend the wrong hexes. `2W` texels are exactly one
world period, so a repeating `u` wraps onto the canonical cell and the board's
three copies sample one field.

**The reveal.** `applyFog(levels, at)` stamps a transition once per cell per
change and `advanceReveal(now)` eases both channels over `revealMs`: the paper
dissolves into the world (a soak threshold, not a blend, so nothing needs to be
transparent) and the sun comes up on a hex the seat has just looked at. It is a
**comparison, never a countdown** — an absolute stamp, an absolute now, and a
pure ease between them, the discipline the simulation's `TimedEffect` keeps.
Without a timestamp every register arrives whole, which is what a seat change
and every headless test ask for.

## Audit finding 2, the fog half

A remembered → visible change is **a light-texture write and nothing else**: no
batch changes visibility, no geometry is rebuilt, `shadowRevision` does not
move, and no static shadow is rebaked. Only a hex crossing *out of the dark* is
new geometry in the world, and only that asks for one bake. Measured on the
seeded probe (`p5march.mjs`), a march that charts three new hexes costs one
static bake in both the old build and this one; the remembered ⇄ visible traffic
of an ordinary turn costs none in either. `test/render/paintedFog.test.ts` and
`test/render/paintedShadowDetail.test.ts` pin both halves.

The eased reveal rides on the same fact: a reveal frame is texel writes, so the
frames between two registers cost a redraw and no rebuild.

## The paper takes the sun's shadow, and not its colour

The table is a lit surface on purpose — that is why it is a plane at the ground
datum and not a flat marker. But a chart is a chart at every hour, and under
golden light a cream page came out **peach**. The fix is one fold in the chart
material: the light the rig contributed (`outgoingLight / diffuseColor`) is
reduced to its luminance, and that scalar re-tints the page's own cream and the
margin's sea wash. Every scrap of the cast shadow survives; none of the sun's
hue does.

## The knobs — `data/view3d.json` → `painted.fog`

No figure lives in code. Every row is read by name in `paintedFogLook.ts` and
registered in both directions by `test/render/paintedKnobs.test.ts`.

| row | ships | what it is |
|---|---|---|
| `paper` | `cream` | the page, as a palette name |
| `ink` | `inkBlue` | the ruling and the cool shift — the blue the cast shadows are already in |
| `sunFalloff` | 0.5 | the lit edge's width, **in hexes** |
| `revealMs` | 300 | how long a hex takes to change register; zero arrives whole |
| `shadowedSun` | 0.35 | how much of the sun remembered ground keeps |
| `shadowedCool` | 0.22 | how far its pigment shifts toward the ink |
| `shadowedShade` | 0.88 | and how far it is knocked back |
| `chartRule` | 0.22 | the ruled hex's weight on the paper |
| `ruleWidth` | 0.055 | and its width |
| `chartLift` | 0.055 | the paper's height, a hair above the water plane |
| `chartSea` | `teal` | the margin's wash |
| `chartSeaMix` | 0.35 | how much of it the page takes |
| `chartSeaRegion` | 2 | how wide a disc must be sea before a hex takes the wash — `marginaliaWater`'s rule, and for its reason: a wash that followed every hidden coast would chart the coastline for free |
| `chartSoak` | 7.0 | the grain the dissolve eats the page away on |

## What was deleted at landing

The study shipped four treatments so the user could choose between them. Three
are gone, with every knob and uniform that fed them:

- **`wash`** — the treatment as it shipped: remembered pigment mixed halfway to
  a flat tone and taken down to seven tenths, one line in `paintedFog.js`. It is
  what `shadowed` replaces, and nothing on the painted path still wants it. (The
  frozen toon board's own explored wash, `fog.exploredWash` in `fog3d.ts`, is a
  different thing and stays: it is the 2D-era board's fog and not the painted
  look's.)
- **`drawn`** — the plate's pen-hatched register: `paintedHatch`,
  `paintedFacetAngle`, and the `hatchScale`/`hatchGain`/`hatchWhite`/`hatchSea`/
  `hatchPixels`/`hatchInk`/`hatchCross`/`drawnRule`/`washMix` rows.
- **`bleed`** — the wet register: `paintedBlot` and the five `bleed*` rows.
- **the `treatment` knob itself**, and the one uniform every branch read. There
  is one treatment now, so the register paint is unconditional.

The review page lost its treatment buttons with them; its sliders are the
shadowed knobs and the chart's.

## Where the code is

- `src/render3d/paintedFogLook.ts` — the registers, the light field, the GLSL,
  the paper's geometry, the reveal's ease. The one place the picture is stated.
- `src/render3d/paintedFog.js` — the per-cell texture, the reveal's stamps, the
  board's shader installer and the paper's.
- `src/render3d/paintedBoard.js` — `applyFog(levels, at)`, `advanceReveal`, and
  `createChartTable(register)`, which is the paper as one merged fan of hexagons
  (six triangles a cell, one draw call a wrap copy, the ruling drawn in the
  material rather than built) standing outside the visibility batches: every
  other batch hides while its hexes are uncharted, and the paper is drawn
  *because* they are.
- `src/render3d/renderer3d.ts` — the chart table raised once per board, the
  reveal's clock handed to `applyFog` on a state frame, and the loop's gate.
- `src/render3d/fog3d.ts` — under the painted look this layer contributes the
  **marginalia alone** (`ChartPaper`): the serpents and the `hic svnt dracones`
  are `marginaliaWater` × `serpentFits`, two rules it owns and nothing else
  asks, so they are planted on whatever page is actually there. Its vellum patch
  and ghost ring are the paper's own claim, made better, and are not drawn twice.
- `src/terrainStudy/fogReview.js` — the review page.
- `test/render/paintedFog.test.ts` — the register of all of the above.

## Sacrifices

- **A fogged hex casts a shadow now, and always did** — but it is *seen* to now:
  remembered relief keeps its silhouette, so a remembered mountain throws its
  shadow across a watched valley. That is the treatment, not a defect.
- **The soft light edge crosses into watched ground.** `sunFalloff` is centred
  on the boundary, so a quarter-hex band inside a *visible* hex facing a
  remembered or uncharted one is partly shaded. Watched ground further than that
  band from a frontier is pixel-identical to the old build; the band is not, and
  cannot be while the edge is soft.
- **A reveal costs frames.** The loop now draws while any cell is easing —
  `revealMs` of animation after a march, where the old build drew one frame.
  Each of those frames is a redraw with no rebuild and no bake.
- **The paper is 25k triangles a wrap copy, submitted always.** Uncharted hexes
  are discarded in the fragment shader rather than culled on the CPU, so a fully
  charted board still submits three chart draw calls that draw nothing. It
  replaces four instanced chart layers (`fog3d.ts`'s patch and ring, in three
  wrap copies), so the net draw-call count is one lower.
- **The chart's furniture moved up.** The vellum patch and the ghost ring are
  gone from the painted path, and the marginalia now sit at the painted board's
  ground datum instead of on the toon board's substrate.
- **Knobs that went away**: `treatment`, `washMix`, `hatchScale`, `hatchGain`,
  `hatchWhite`, `hatchSea`, `hatchPixels`, `hatchInk`, `hatchCross`, `drawnRule`,
  `bleedSun`, `bleedStrength`, `bleedScale`, `bleedPaper`, `bleedDesaturate`,
  `legacyWash`, `legacyMix`, `legacyShade`. A saved sheet naming one is a sheet
  the register test fails on.
- **The review page's shadow bake follows the zoom.** The study page has no
  `setBakeDetail` wiring, so at map zoom its static bake sees the far LOD. The
  game's own path is unaffected (P5's seam).
