# Improvement models for review

[Current Nazca Lines at play zoom](nazca-board.jpg) · [Approved Wild Orchard and earlier Nazca Lines](revisions.jpg) · [Original review sheet](review.jpg) · [Editable Blender scene](improvements.blend)

The original [in-game views](on-board.jpg) show all nine improvements at normal play zoom on turn 151 of seed 20260832. The [original full board screenshot](play-view.jpg) shows the same game with the HUD. For this review, the forest opens around the orchard and totem, the reservoir sluice faces the river, and the hillfort bank follows the slope.

These are the first intact models for six Expansionist improvements and three works that currently borrow props. The review uses the same orthographic camera and hex size for all nine. Each GLB contains only the improvement. The terrain, lights and ground shadows belong to the review scene.

| Model | What to look for at play zoom |
|---|---|
| [Nazca Lines](nazca-lines.glb) | A white line runs between two dark gravel edges. It doubles back along the bill, around the flight feathers and through the fan tail. The board review projects each band onto the terrain. |
| [Inuksuk](inuksuk.glb) | Broad, uneven granite slabs carry an overhanging stone. An opening between the lower stacks keeps the silhouette recognizable on snow. |
| [Totem Pole](totem-pole.glb) | A cedar post with a hooked bird bill, relief-cut wings and a second face below. The red and dark teal pigment sits within the carving. |
| [Stepwell](stepwell.glb) | Three flights of sandstone steps descend to a small pool. A colonnade marks the far edge. The banks contain the stairs above the tile surface. |
| [Hillfort](hillfort.glb) | Two grass banks follow the hill crown. A narrow timber gate leads to two thatched roundhouses inside the palisade. |
| [Baray](baray.glb) | A broad, shallow reservoir bounded by low earthworks. The double sluice opens on one side, and a stair enters the water at the opposite bank. The sluice can face the river at placement. |
| [Fish Traps](fish-traps.glb) | Two willow fences funnel fish into a tapered reed basket. A plank platform reaches the basket. The lower stakes and basket sit below the waterline. |
| [Wild Orchard](wild-orchard.glb) | Three fruit trees of different ages surround a picking ladder and two baskets. The front tree leaves a gap so that the ladder stays visible. |
| [Paradise Garden](paradise-garden.glb) | Crossed water channels divide four planted beds around a fountain. Cypress trees and a shaded pavilion enclose the far end. |

The [charter works review](charter-works.jpg) shows the two clay furnaces of the Smelter, the Stone Circle and the Cliff Monastery. All three use the same scale, materials and export process as the first nine works.

## Painted board

Open [the improvements in the gallery](/flair.html?review=works&work=approved). Select a work to inspect it at game zoom or in detail. The game and gallery use the same exports, terrain fitting and paint.

Fish Traps, Wild Orchard and Paradise Garden have gameplay rows. The gallery shows the other six through a visual overlay until their rows exist. The approved models show intact works. A pillaged work uses the board’s existing land or water damage effect.

## Nazca photograph references

The redraw follows the aerial photographs in Peru’s Ministry of Culture survey (page 10, photograph 3, Casabonnes) and Robert Stephens’s account of his 2019 flight. [Stephens’s flight photographs](https://www.mojavestars.org/solareclipse/2019-chile-total-solar-eclipse)

## Editing

Open the Blender file for the separate model parts. Each collection contains one improvement. Move its parent to position the whole model. The game uses Y-up GLBs. The authoring scene uses Blender's Z axis for height.

To rebuild the exports with the project's settlement materials, run the following command from the repository root.

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/terrain-study/build_settlement_assets.py -- --improvement-study
```

Add `--only=fish-traps` to work on one GLB, or `--pictures` to render individual PNGs to the system temporary directory under `magister-improvement-review`. Use `--source-scene` to regenerate the combined Blender file from the model recipes.
