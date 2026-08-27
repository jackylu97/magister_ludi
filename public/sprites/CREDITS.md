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

## `icons/<class>.svg` — 9 badge icons

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
| `greatPerson.svg` | — | laurel wreath, two branches tied, a jewel in the gap |

The ninth is the odd one and stays odd on purpose: it is not a model class at all. A great
person stands on the **settler's** sculpt (`modelClass` in `data/units.json`, because it is a
civilian with a handcart) and must not wear the settler's *name* — the badge is the board's
only sentence about what a piece is, and "settler" floating over Archimedes is a wrong
sentence rather than a missing one. So the badge set is one longer than the sculpt set, and
`BadgeClass` in `src/render3d/badges3d.ts` is where the two stop being the same list.

**One laurel for all five families**, not five. A scholar and a general differ in what they
*do*, and the interface says which is which in words, in the unit panel and on the offer card;
five more badges would be five more silhouettes to learn for information the player already
has. What the board owes is the one distinction it cannot say any other way, which is *this
piece is not a settler*. Drawn against the eye it shares a ring-ish footprint with: the eye is
a closed lens with a solid pupil dead centre, the wreath is an open ring with a gap at the top
and the jewel sitting in it, so the two do not smudge together at twenty pixels.

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

## The six yield voices — `src/art/yieldMarks.ts`

**Not our work, and the only vendored drawings in the project.** The six most-read marks in the
game — they are on the top bar, on every build button and on every tile of the board with the
yields switch up — are taken from two open icon sets rather than drawn here, because a set drawn
by people who draw icon sets for a living reads better at twelve pixels than anything this
project would author for itself.

- **Lucide** — <https://lucide.dev> · <https://github.com/lucide-icons/lucide> — **ISC licence**
- **Tabler Icons** — <https://tabler.io/icons> · <https://github.com/tabler/tabler-icons> — **MIT licence**

Both licences are permissive and neither requires attribution in a running build. It is given
because the work deserves it, which is the same sentence this file makes about Kenney at the top.

| Yield | Upstream icon | Set | Mark |
| --- | --- | --- | --- |
| food | `carrot` | Lucide (ISC) | a carrot, pulled, with its two leaves |
| production | `settings` | Lucide (ISC) | a cogwheel, eight teeth around a hub |
| gold | `moneybag` | Tabler (MIT) | a drawstring money bag |
| science | `flask-conical` | Lucide (ISC) | a conical flask, filled to its line |
| culture | `music` | Lucide (ISC) | a beamed pair of notes |
| faith | `flame` | Lucide (ISC) | a flame with its inner tongue |

They are **path data, not files**, and live in `src/art/yieldMarks.ts` beside the resource marks
rather than under `public/` — the six SVGs that used to sit in `icons/yields/` are gone. A file
can only be one colour, and these marks are printed on a coloured disc in the board's atlas *and*
as `currentColor` in a dozen DOM surfaces set in four different inks. As data they are traced by
`Path2D` into the atlas cell and emitted as a `data:` URI CSS mask by `src/ui/yieldMark.ts`, from
one source, with nothing to fetch and nothing to 404 at boot.

Two edits were made to the upstream drawings and no others: three `<circle>` elements became path
data (every member of a mark in this project is a `d` string, because both printers take exactly
one kind of thing), and the stroke was weighted from upstream's 2 to **2.75** on the same 24-unit
grid. Upstream draws for a 24-pixel toolbar icon; a board pip here is about ten pixels across and
a 2/24 stroke goes spidery at that size. The chosen weight lands almost exactly where the
hand-drawn set it replaces was printed — ten pixels at the shipped atlas cell, against the old
files' ten and a half — so the set did not get heavier, it stopped being drawn by us. No path was
re-fitted, no shape re-centred; `test/render/yieldMarks.test.ts` pins the data against the
vendored strings so a tidy-up of a curve is a failing test rather than a silent redraw of somebody
else's icon.

They are rasterised onto a disc of their own voice's colour — food green, production orange, gold
gilt, and so on through all six — because the colour as a mass is what survives being ten pixels
across, and a thin green stroke on green grass does not. The ink is `icons.yieldInkColor` from
`data/view3d.json`, so it stays a data decision.

Every mark in `resourceMarks.ts` and `siteMarks.ts` is authored on the project's own 64 × 64 grid
inside a safe circle, in one ink at one stroke weight, with round caps and joins throughout — the
consistency *is* the design. The vendored six keep upstream's 24-unit grid instead, because
rescaling path data is how a vendored drawing quietly stops being the drawing that was vendored;
both printers take the grid as a parameter, and `YIELD_MARK_SCALE` reconciles the two sets'
padding conventions so they print at the same optical size in the same roundel.

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
