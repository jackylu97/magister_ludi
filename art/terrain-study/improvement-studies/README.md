# Improvement models for review

[Revised Nazca Lines and Wild Orchard at play zoom](revisions.jpg) · [Original review sheet](review.jpg) · [Editable Blender scene](improvements.blend)

The original [in-game views](on-board.jpg) show all nine improvements at normal play zoom on turn 151 of seed 20260832. The [original full board screenshot](play-view.jpg) shows the same game with the HUD. For this review, the forest opens around the orchard and totem, the reservoir sluice faces the river, and the hillfort bank follows the slope.

These are the first intact models for six Expansionist improvements and three works that currently borrow props. The review uses the same orthographic camera and hex size for all nine. Each GLB contains only the improvement. The terrain, lights and ground shadows belong to the review scene.

| Model | What to look for at play zoom |
|---|---|
| [Nazca Lines](nazca-lines.glb) | A hummingbird cut into desert gravel. The long bill and two groups of feathers give it a direction on the tile. The strokes need to follow the terrain surface when placed. |
| [Inuksuk](inuksuk.glb) | Broad, uneven granite slabs carry an overhanging stone. An opening between the lower stacks keeps the silhouette recognizable on snow. |
| [Totem Pole](totem-pole.glb) | A cedar post with a hooked bird bill, relief-cut wings and a second face below. The red and dark teal pigment sits within the carving. |
| [Stepwell](stepwell.glb) | Three flights of sandstone steps descend to a small pool. A colonnade marks the far edge. The banks contain the stairs above the tile surface. |
| [Hillfort](hillfort.glb) | Two grass banks follow the hill crown. A narrow timber gate leads to two thatched roundhouses inside the palisade. |
| [Baray](baray.glb) | A broad, shallow reservoir bounded by low earthworks. The double sluice opens on one side, and a stair enters the water at the opposite bank. The sluice can face the river at placement. |
| [Fish Traps](fish-traps.glb) | Two willow fences funnel fish into a tapered reed basket. A plank platform reaches the basket. The lower stakes and basket sit below the waterline. |
| [Wild Orchard](wild-orchard.glb) | Three fruit trees of different ages surround a picking ladder and two baskets. The front tree leaves a gap so that the ladder stays visible. |
| [Paradise Garden](paradise-garden.glb) | Crossed water channels divide four planted beds around a fountain. Cypress trees and a shaded pavilion enclose the far end. |

## Editing

Open the Blender file for the separate model parts. Each collection contains one improvement. Move its parent to position the whole model. The game uses Y-up GLBs. The authoring scene uses Blender's Z axis for height.

To rebuild the exports with the project's settlement materials, run the following command from the repository root.

```sh
blender --background --factory-startup --python-exit-code 1 --python scripts/terrain-study/build_settlement_assets.py -- --improvement-study
```

Add `--only=fish-traps` to work on one GLB, or `--pictures` to render individual PNGs to the system temporary directory under `magister-improvement-review`. Use `--source-scene` to regenerate the combined Blender file from the model recipes.
