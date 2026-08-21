# Sprite credits

All artwork in this directory is by **Kenney** (<https://kenney.nl>) and is released under
**CC0 1.0 Universal** (public domain dedication). No attribution is required; it is given
anyway because the work deserves it.

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
