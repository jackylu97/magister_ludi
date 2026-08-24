# Sprite credits

Most artwork in this directory is by **Kenney** (<https://kenney.nl>) and is released under
**CC0 1.0 Universal** (public domain dedication). No attribution is required; it is given
anyway because the work deserves it. The two exceptions are called out in their own sections
below: `units/` (the project owner's illustrations) and `icons/` (original work for this
project, also CC0).

Source packs:

- **Hexagon Pack** — <https://kenney.nl/assets/hexagon-pack> (terrain hexes, standing objects)
- **Boardgame Pack** — <https://kenney.nl/assets/boardgame-pack> (playing pieces)

Only the files Magister Ludi actually draws are vendored here.

## `terrain/` — 120 x 140 pointy-top hex faces

| File | Source | Change |
| --- | --- | --- |
| `grassland.png` | `Tiles/Terrain/Grass/grass_05.png` | none |
| `desert.png` | `Tiles/Terrain/Sand/sand_07.png` | none |
| `tundra.png` | `Tiles/Terrain/Stone/stone_07.png` | none |
| `plains.png` | `Tiles/Terrain/Grass/grass_05.png` | recoloured to khaki `#a89b52` |
| `snow.png` | `Tiles/Terrain/Stone/stone_07.png` | recoloured to `#e4eaec` |
| `mountain.png` | `Tiles/Terrain/Stone/stone_07.png` | recoloured to `#8b9393` |

The pack ships five terrain palettes (grass / sand / dirt / stone / mars) and the game has
eight terrains, so three faces are per-pixel recolours of a plain source tile: every pixel is
scaled by `target / dominantSourceColour`, which preserves the tile's speckle texture and its
antialiased rim. `ocean` and `coast` have no sprite at all — the pack has no water hex, so the
renderer fills those hexes with a flat colour (see `data/view.json`).

Every terrain sprite is a *plain*, undecorated variant. Baked-in decorations (the `_10`…`_18`
variants with trees and rocks painted onto the hex) are deliberately unused: this renderer
squashes the ground plane vertically, and anything painted into the ground squashes with it.
Trees and rocks come from `objects/` instead and are drawn upright.

## `objects/` — standing decoration, drawn unsquashed

From `PNG/Objects/`, unmodified: `treePine_small`, `treePine_large`, `treeRound_small`,
`treeRound_large`, `rockGrey_large`, `rockGrey_medium1`, `rockGrey_small1`, `rockBrown_small`.

## `pieces/<colour>/<silhouette>.png` — 64 x 64 playing pieces

From `PNG/Pieces (<Colour>)/piece<Colour>_border<NN>.png`, unmodified but **renamed**.

The pack's numbering is not consistent between colour folders — `pieceRed_border00` is a pawn
while `pieceBlue_border00` is a flag (Blue is offset by +1, Yellow by −1, the rest match Red).
Renaming to a silhouette name is what makes "same unit type, other player's colour" a lookup
instead of a per-colour table. The six silhouettes vendored, by their *Red* index:

| Name | Red index | Looks like |
| --- | --- | --- |
| `pawn` | 00 | chess pawn |
| `person` | 06 | gingerbread figure |
| `house` | 08 | gabled house |
| `tower` | 10 | rook / keep |
| `boat` | 14 | sailboat |
| `flag` | 18 | pennant |

`data/view.json` maps unit type to silhouette (`pieces.byUnitType`) and player colour to piece
colour (`pieces.byPlayerColor`). Only the silhouettes listed above exist on disk — pointing
`byUnitType` at a name that is not in the table is a hard load error, not a blank piece.

## `units/<type>.png` — 1024 x 1024 illustrated unit billboards

**Not Kenney, and not CC0.** These are the project owner's own Midjourney illustrations,
dropped into `assets/units/` (the source folder, which ships nothing) and vendored here
because Vite serves `public/` and only `public/`. `assets/` stays the drop folder: replacing
a sprite means dropping a new PNG there and copying it across, so the original art is never
edited in place by the build.

They arrive as opaque illustrations on a **white ground with no alpha channel**. Nothing
pre-processes them; the transparency is made at load time by keying near-white pixels out
with a feathered edge — see `src/render3d/sprites3d.ts`, tuned by `units.sprite` in
`data/view3d.json`.

| File | Unit type |
| --- | --- |
| `warrior.png` | `warrior` |
| `scout.png` | `scout` |

A unit type with no file here falls back to its procedural game piece, which is why the
settler still stands as a piece while these two are billboards.

## `icons/<class>.svg` — 8 model-class badge icons

**Original work for this project**, dedicated to the public domain under **CC0 1.0** so it
carries the same terms as everything around it. Drawn as part of the model-class pass (see
`src/render3d/badges3d.ts`): the 3D board sculpts one model per `modelClass` in
`data/units.json`, and these are the ink marks on the parchment roundel that says which unit
is actually standing there.

Kenney's **Board Game Icons** pack (<https://opengameart.org/content/board-game-icons>, 250
icons, CC0, vectors included) was downloaded and inspected first, and it is the reason these
are drawn rather than vendored. Four of the eight classes have a good match in it —
`sword` (melee), `bow` (ranged), `chess_knight` (mounted), `flag_triangle` (settler) — and
four have none at all: the pack has no hammer, no siege engine, no eye or spyglass, and
certainly no horse-archer. A set that was half Kenney's chunky rounded fills and half
hand-drawn would read as two sets, and a badge set has exactly one job, which is to be one
family; so all eight are drawn here in one language instead. Kenney's optical weight was used
as the reference for how heavy an icon has to be to survive being twenty pixels across.

| File | Model class | Mark |
| --- | --- | --- |
| `settler.svg` | `settler` | pennant on a planted pole |
| `worker.svg` | `worker` | mallet |
| `melee.svg` | `melee` | upright sword |
| `ranged.svg` | `ranged` | bow with a nocked arrow |
| `mounted.svg` | `mounted` | horse head |
| `mountedRanged.svg` | `mountedRanged` | horse head with an arrow |
| `siege.svg` | `siege` | catapult, arm thrown, shot in the air |
| `scout.svg` | `scout` | eye |

## `src/art/resourceMarks.ts` — 41 resource marks, as path data

**Original work for this project**, CC0 1.0, drawn in the *same* language as the eight badge
icons above and for the same reason: a set is a set. They are the ink on the kind-shaped paper
the **Resources lens** puts on a tile that carries something (see `src/render3d/badges3d.ts`,
`TileIcons`), and they are the only thing on the board that can actually *name* a resource —
the diorama props next to them say "an animal, some ore, a vine", which is atmosphere rather
than information.

They are **not files**, and this is the one set in this folder that is not. Seventeen of them
were files; the other twenty-four rows of `data/resources.json` had no drawing at all and fell
through to the emoji on the row, on the board *and* in every DOM panel that named them.
Finishing the set meant deciding where a finished mark lives, and a file lost: the panels print
the same marks as the board, a file can only ever be one colour, and this interface sets the
same sentence on parchment and on ink. So the drawings are path data on the same 64 × 64 grid,
traced into the atlas with `Path2D` and masked into the DOM as a `data:` URI
(`src/ui/resourceMark.ts`) where the ink is `currentColor`. One drawing, two printers.

Shapes that repeat are a small vocabulary of helpers rather than forty-one blobs of path code —
`cube`, `leaf`, `drop`, `ingot`, `dot`, `spark`, `crescent`, `fan`, `spiral`, `stalk`, `poly`
and `line`. `cube` reproduces the hand-drawn `stone` and `salt` blocks *to the coordinate*,
which is how the port of the original seventeen was checked (`test/resources3d.test.ts`).

`horses` is the *same path* as `mounted.svg`, deliberately: the resource and the cavalry it buys
should be one mark, and keeping its own copy rather than sharing one file keeps the two rosters
independently editable (a future cavalry badge redraw must not silently redraw the pasture).

`emoji` stays on every row of `data/resources.json` as the **last resort**, and nothing that
ships uses it: a resource with no entry in the registry prints its glyph exactly as this
project always did, which is what keeps a resource added at runtime legible with no code
written for it.

| Resource | Mark |
| --- | --- |
| `wheat` | a bound sheaf, three stalks and a tie |
| `cattle` | a cow's head, horns out |
| `deer` | a branching pair of antlers |
| `fish` | a fish, tail to the right |
| `stone` | a cut block in three-quarter view |
| `rice` | three drooping stalks standing in water |
| `maize` | a cob in its husk, kernels ranked |
| `bananas` | a single fruit, stem up |
| `copper` | an oxhide ingot, four horns and a hollowed waist |
| `tin` | two cast bars, stacked |
| `clay` | a coil pot, its rim thrown wide |
| `reeds` | papyrus stems under their umbels |
| `crabs` | a crab, claws raised |
| `bison` | a bison head, shaggy crown and short horns |
| `horses` | the badge set's horse head, reused verbatim |
| `iron` | an anvil on its block |
| `gems` | a cut gem, crown and pavilion |
| `silk` | a banner hung from a rail |
| `wine` | a bunch of grapes with a leaf |
| `spices` | a pepper pod |
| `salt` | a salt crystal, with two glints |
| `incense` | a censer under three curls of smoke |
| `jade` | a pierced disc, the bi, on its cord |
| `marble` | a colonnade on its stylobate |
| `furs` | a stretched pelt |
| `dyes` | two dye vats, dripping |
| `ivory` | a pair of tusks, tips up |
| `amber` | a drop of resin with a fly caught in it |
| `tea` | a leaf, midrib and two veins |
| `coffee` | a sprig of two cherries under a leaf |
| `cotton` | a burst boll in its spiked calyx |
| `sugar` | two jointed canes and a blade of leaf |
| `olives` | a sprig, two leaves and two olives |
| `lapis` | a polished cabochon, flecked with pyrite |
| `silver` | a cast bar under the moon |
| `gold` | a cast bar under the sun |
| `honey` | a comb cell, dripping |
| `pearls` | a pearl in an open shell |
| `coral` | a branching stag coral on its foot |
| `whales` | a fluke, sounding |
| `tyrian` | a murex whelk, whorl and spines |

## `icons/yields/<yield>.svg` — the three yield voices

**Original work for this project**, CC0 1.0, same grid, drawn a full stroke-weight heavier than
everything above. These replaced the coloured dots the board used to print on a tile: a dot can
say *how many* and never *which*, so a player had to learn that the top row meant food. They
are rasterised onto a disc of their own voice's colour — food green, production orange, gold
gilt — because the colour as a mass is what survives being ten pixels across, and a thin green
stroke on green grass does not.

| File | Yield | Mark |
| --- | --- | --- |
| `food.svg` | food | an ear of wheat on a stalk |
| `production.svg` | production | a hammer, head square on |
| `gold.svg` | gold | a coin |

Every mark in this folder and in `resourceMarks.ts` is authored on the same 64 × 64 grid inside a
safe circle, in one ink at one stroke weight, with round caps and joins throughout — the
consistency *is* the design. The files declare an intrinsic size of 256 px so the browser
rasterises them larger than any atlas cell asks for and the badge is downsampled rather than
blown up. The fill colour in the files is the palette's ink, but nothing depends on it: the
atlas builder recolours every icon to `badges.inkColor` from `data/view3d.json` at load, so the
ink stays a data decision. The resource marks make the same promise one step earlier — they
carry no colour at all until somebody asks for one.

## Marginalia (`icons/marginalia/`)

**Original work for this project**, CC0 1.0, same 64 × 64 grid and same round caps, drawn a
stroke lighter than the badges. There is one file and it is a garnish, not a readout.

| File | Where it appears |
| --- | --- |
| `serpent.svg` | scattered sparsely over large unexplored regions — *hic svnt dracones* |

The serpent is the only mark in this project that is *decoration*. Everything else on the
board answers a question a player asked; this one exists because the chart-table fiction
(design-notes Entry VII, Entry X) says an unfinished chart has monsters drawn in the empty
quarters, and because a blank vellum hex with nothing on it reads as a rendering failure while
a blank vellum hex with a small ink serpent on it reads as *unexplored*. It is hash-placed and
deliberately rare — see `fog.serpentChance` in `data/view3d.json`.
