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

## `icons/<class>.svg` — 11 badge icons

**Not our work any more, and that is the point.** Eleven SVG files, one per `BadgeClass`
(`src/render3d/badges3d.ts`), rasterised into the parchment roundel that floats over a
piece and says which unit is standing there. They were drawn for this project until the
icon pass; they are now **Tabler Icons** — with three exceptions this section names — for the
same reason the six yield voices stopped being drawn here (see below, and it is the same
sentence twice): a set drawn by people who draw icon sets for a living reads better at
twenty pixels than anything this project would author for itself, and the badge is the
smallest thing on the board that has to be *read* rather than merely seen.

- **Tabler Icons** — <https://tabler.io/icons> · <https://github.com/tabler/tabler-icons> —
  **MIT licence**, pinned at `@tabler/icons` **3.46.0**

MIT requires no attribution in a running build. It is given because the work deserves it,
which is the same sentence this file makes about Kenney at the top.

**One family, not two.** Lucide (ISC) was preferred first, being already in the project for
the yields, and lost on coverage: it has no bow, no horse, no laurel and no candle, which is
four of them. Tabler has all four. A set half in one hand and half in another is two sets
wearing one name, so the whole badge roster moved to Tabler rather than the six shapes Lucide
was missing.

| File | Badge class | Upstream icon | Mark |
| --- | --- | --- | --- |
| `settler.svg` | `settler` | Tabler `tent` | an A-frame tent, its door thrown open |
| `worker.svg` | `worker` | Tabler `hammer` | a claw hammer, head up |
| `melee.svg` | `melee` | Tabler `sword` | a sword on the diagonal, hilt low |
| `ranged.svg` | `ranged` | Tabler `bow` | a bow drawn, the arrow away to the corner |
| `mounted.svg` | `mounted` | Tabler `horse` | a horse in full, head down |
| `mountedRanged.svg` | `mountedRanged` | *composed* — Tabler `horse` + Tabler `bow` | the horse, smaller, under a loosed arrow |
| `siege.svg` | `siege` | *drawn here* | a catapult, arm thrown, shot in the air |
| `scout.svg` | `scout` | Tabler `binoculars` | field glasses |
| `greatPerson.svg` | — | Tabler `laurel-wreath` | a laurel wreath, eight leaves and a tie |
| `religious.svg` | — | Tabler `candle` | a lit candle |
| `spear.svg` | `spear` | *drawn here* | a spear upright: leaf blade, socket collar, two lugs |

### The two edits made to the vendored drawings, and no others

1. **The stroke was weighted from 2 to 2.75** on Tabler's own 24-unit grid. This is the
   `yieldMarks.ts` number exactly, arrived at there for the same problem: upstream draws for
   a 24-pixel toolbar icon and a 2/24 stroke goes spidery at the size a game asks for. It
   also lands almost exactly on the weight the hand-drawn badges it replaces were printed at
   — 7 of 64, against 2.75 of 24 — so the set did not get heavier, it stopped being drawn by
   us.
2. **The stroke colour became `#2f2b32`**, because these are loaded as `<img>` and
   `currentColor` has nothing to resolve against there. The atlas recolours every surviving
   pixel wholesale (`drawBadgeCell`), so the value is inert; it is the old files' ink so that
   a file opened on its own looks like what the board draws.

No path was re-fitted, no shape re-centred, and the 24-unit grid is upstream's own — the
`d` strings in these files are copy-pasteable back to and from Tabler's, which is what makes
re-vendoring a diff rather than a redraw. Every file carries its upstream name and URL in an
XML comment at the top.

### The three that are not Tabler drawings, and why they are not somebody else's either

Neither Tabler nor Lucide draws a **catapult**, a **horse-archer** or a **spear** (nor a
lance, pike or javelin under any other name), and there was a third family available that
draws all of them. It was not used, for the reason this file already gave about Kenney's
board-game icons two paragraphs into the old version of this section: those are filled
silhouettes, these are strokes, and a badge set has exactly one job, which is to be one
family. Half a set in somebody's fills and half in somebody's strokes is worse than
either.

- `mountedRanged.svg` is a **composition** of two Tabler drawings: `horse` verbatim, scaled
  0.75 into the lower-left with its stroke-width divided back out so it still prints at 2.75,
  under `bow`'s own arrowhead corner with the shaft cut short to clear the horse's back. Both
  upstream paths are intact and legible in the file.
- `siege.svg` is **drawn for this project**, CC0 1.0 like everything else original here, but
  drawn in *Tabler's* geometry rather than in ours: the 24-unit box, the family's 2.75 stroke,
  round caps and joins, no fill anywhere, and a stroked ring for the shot because Tabler never
  fills. The composition is the old hand-drawn catapult's — base, A-frame, arm thrown, shot in
  the air — re-laid on that grid.
- `spear.svg` is the same, and it arrived because the spear line was wearing the sword
  (user, 2026-08-27: "spearman line needs its own icon distinct from warrior line"). It is
  deliberately **not** the sword redrawn on another angle: at twenty pixels a diagonal blade is
  a diagonal blade whatever its tip is shaped like, so the spear stands upright, which is the
  one silhouette in this set that separates cleanly from `melee.svg`'s diagonal at a glance. A
  leaf blade, a socket collar and the two lugs of a boar-spear — the part of the weapon that is
  about stopping a charge, which is what the unit is for. Which rows wear it is
  `badges.byUnitType` in `data/view3d.json` (spearman and pikeman today), not a name compared
  in TypeScript.

### Why the set is eleven when the sculpt roster is eight

`BadgeClass` is `ModelClass` plus three. Two of the extras exist for one reason: a piece
that borrows another piece's body must not wear that piece's *name*. The badge is the board's
only sentence about what a unit is, and a wrong sentence is worse than a missing one. The
third goes the other way — see `spear` below.

- **`greatPerson`** — a great person stands on the **settler's** sculpt, because it is a
  civilian with a handcart. "Settler" floating over Archimedes sends a player looking for a
  city site. One laurel for all five families, not five: a scholar and a general differ in
  what they *do*, and the unit panel and the offer card already say which in words.
- **`religious`** — an augur stands on the **worker's** sculpt, because it is a figure on
  foot with a bundle. "Worker" over the only piece in the game that spends faith is the worse
  of the two mistakes: it is an invitation to march it at a hill and build a mine. One candle
  for the whole family here too — the prophet the High Temple brings will wear this one.
- **`spear`** — a spearman *is* what it is shaped like: a foot soldier, `modelClass: 'melee'`,
  sharing the swordsman's sculpt and rightly so. The badge is finer than the sculpt here rather
  than coarser, because the sword says "the line you send at a city" and the spear line is the
  one you send at a horse, and a player who cannot tell them apart on the board is a player who
  loses a stack to a chariot. One spear for the whole line — spearman, pikeman, and whatever
  comes after them.

The first two are read off the unit row rather than off a type name (`badgeClassFor` asks
`UnitDef.greatWork` and `UnitDef.consecrates`), so a new great person or a new priest is a
data row and the renderer does not move. The third is read off `badges.byUnitType` in
`data/view3d.json`, and that is the fence rather than an inconsistency: what a piece *does* is
the simulation's fact and belongs on the unit row, while which drawing names it is the
renderer's, and a `badge:` column in `data/units.json` would be the art reaching across into
the rules' own file. The table is checked against the atlas at load, so a typo either side is a
thrown error rather than a badge quietly drawing somebody else's icon.

The candle is deliberately **not** the faith yield's flame. They are two different questions
asked in two different places — the flame is a *number's* voice on the top bar, the candle is
a *piece's* name on the board — and a player who saw the same mark in both places would
reasonably read the badge as "this tile makes faith". A candle is the same idea one step over:
lit, tended, and something a person carries.

## `src/art/resourceMarks.ts` — 41 resource marks, as path data

**Thirty-two original, nine vendored**, and the split is new as of the luxury pass
(2026-08-27). They are the ink on the kind-shaped paper the **Resources lens** puts on a tile
that carries something (see `src/render3d/badges3d.ts`, `TileIcons`), and they are the only
thing on the board that can actually *name* a resource — the diorama props next to them say
"an animal, some ore, a vine", which is atmosphere rather than information.

- The thirty-two are **original work for this project**, CC0 1.0, on the house 64-unit grid.
- The nine are **Tabler Icons** (MIT), pinned at the same `@tabler/icons` **3.46.0** the badge
  roster is, copied to the coordinate and kept on upstream's 24-unit grid. Each one carries its
  own `credit` on its row in `resourceMarks.ts`, which is what makes the table below checkable
  rather than a second list that can drift from the code.

### The debt this file was recording, and how it was paid

The note that stood here said the resource marks and the badges still shared *the weight,
which is what a viewer actually reads*. That had been wrong since the icon pass. The badges and
the six yield voices went to a vendored 2.75 on a 24-unit box — 0.115 of their grid — while
this set stayed at 5 on 64, which is 0.078 of its own, a third lighter. The user's report is
the same observation from outside the code: *"icon pass over luxury resources, the new unit
banners look great."*

Two things changed and nothing else:

1. **The house weight went from 5 to 6.5** (`MARK_STROKE`), which is 0.102 of the 64 box and
   lands on the vendored sets' painted line once the house grid's tighter safe circle is
   allowed for — these marks reach about 78% of their box where a 24-unit vendored one reaches
   about 83%. The filled shapes' lighter outline followed it, 4 → 5.2, holding the same ratio.
   It is **one number for the whole house hand** — resources, discovery sites, heraldry, card
   lines, the marginalia and the printer's devices all default to it — because a per-family
   weight is how a set stops being a set, which is the same sentence this file already makes
   twice about the badges and the yields.
2. **Nine marks were replaced by Tabler drawings**, in every case where upstream has a mark
   that reads as the thing at twelve pixels and ours did not. Six of the nine were *filled*
   here, and a fill is what kills a mark at that size: the gaps between six grape berries or
   three banana crescents close into one black mound. Upstream's are outline, overlapped, and
   survive the shrink.

Every other mark stayed exactly as drawn, re-weighted only by (1). Where Tabler has nothing
that reads as the thing — an oxhide ingot, a coil pot, a murex whelk, a bison, a censer, a
crab, a comb cell — ours is still the better drawing and there was no reason to move it.

| Resource | Tabler icon | Why it moved |
| --- | --- | --- |
| `wheat` | `wheat` | a bound sheaf of seven paths against one ear of four |
| `deer` | `deer` | a stag's head reads as a deer; bare antlers read as a fork |
| `fish` | `fish` | ours was a filled lens with a triangle; upstream's has a gill line and a mouth |
| `bananas` | `banana` | the stem and the squared end are what stop one crescent reading as a horn |
| `horses` | `horse` | the open question below, closed |
| `gems` | `diamond` | the same cut gem with one facet line instead of five |
| `wine` | `grape` | six filled berries closed into a mound at tile size |
| `spices` | `pepper` | a filled pod was a blob; the outline keeps the shoulder |
| `tea` | `leaf` | the same leaf, drawn by somebody who draws leaves |

The two edits made to these nine are the badge section's two, word for word: nothing was
re-fitted or re-centred, the 24-unit grid is upstream's own, and `test/render/resources3d.test.ts`
pins the grid, the weight and the no-fill rule so a tidy-up of a curve is a failing test rather
than a silent redraw of somebody else's icon.

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

`horses` **is the badge's horse again**, and that closes the open art question this file has
been carrying since the icon pass. The story is worth keeping because the arrangement worked:
the pasture and the cavalry it buys were one drawing; the badge moved to Tabler and the
pasture did not, precisely because each roster keeps its own copy rather than sharing a file,
and "a future cavalry badge redraw must not silently redraw the pasture" is what that bought.
The redraw came, it did not propagate, and somebody then *decided* — which is the whole point.
It is the same upstream drawing rather than a shared file still, because a resource mark and a
unit badge are never on screen in the same roundel and the two rosters keep the right to move
apart again.

`emoji` stays on every row of `data/resources.json` as the **last resort**, and nothing that
ships uses it: a resource with no entry in the registry prints its glyph exactly as this
project always did, which is what keeps a resource added at runtime legible with no code
written for it.

| Resource | Mark |
| --- | --- |
| `wheat` | an ear of wheat, two sprays off one stem — Tabler `wheat` (MIT) |
| `cattle` | a cow's head, horns out |
| `deer` | a stag's head, antlers full — Tabler `deer` (MIT) |
| `fish` | a fish, tail to the left — Tabler `fish` (MIT) |
| `stone` | a cut block in three-quarter view |
| `rice` | three drooping stalks standing in water |
| `maize` | a cob in its husk, kernels ranked |
| `bananas` | a single fruit, stem squared at the top — Tabler `banana` (MIT) |
| `copper` | an oxhide ingot, four horns and a hollowed waist |
| `tin` | two cast bars, stacked |
| `clay` | a coil pot, its rim thrown wide |
| `reeds` | papyrus stems under their umbels |
| `crabs` | a crab, claws raised |
| `bison` | a bison head, shaggy crown and short horns |
| `horses` | the badge set's horse, in full — Tabler `horse` (MIT) |
| `iron` | an anvil on its block |
| `gems` | a cut gem, table and pavilion, with one facet line — Tabler `diamond` (MIT) |
| `silk` | a banner hung from a rail |
| `wine` | a bunch of grapes under a stem and a leaf — Tabler `grape` (MIT) |
| `spices` | a pepper pod under its stem — Tabler `pepper` (MIT) |
| `salt` | a salt crystal, with two glints |
| `incense` | a censer under three curls of smoke |
| `jade` | a pierced disc, the bi, on its cord |
| `marble` | a colonnade on its stylobate |
| `furs` | a stretched pelt |
| `dyes` | two dye vats, dripping |
| `ivory` | a pair of tusks, tips up |
| `amber` | a drop of resin with a fly caught in it |
| `tea` | a leaf on its stem, midrib drawn — Tabler `leaf` (MIT) |
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

Every *original* mark in `resourceMarks.ts` and `siteMarks.ts` is authored on the project's own
64 × 64 grid inside a safe circle, in one ink at one stroke weight, with round caps and joins
throughout — the consistency *is* the design. Every **vendored** mark keeps upstream's 24-unit
grid instead — the six yields here, and since the luxury pass the nine ported resource marks —
because rescaling path data is how a vendored drawing quietly stops being the drawing that was
vendored; both printers take the grid as a parameter, and a scale constant reconciles the two
sets' padding conventions so they print at the same optical size in the same roundel
(`YIELD_MARK_SCALE` for the voices, `PORTED_MARK_SCALE` for the resource ports).

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
