# Robed archer and spearman

Make two Blender pieces for review. Use [the approved concept](concept.png) for the shapes and posture. An exact copy is unnecessary. Both figures have a small blank ivory chess head, broad robes in the player's colour and a low round base. This study uses red for the player.

The archer leans into the bow. A deep, open hood surrounds the head, and a long overlapping robe gives the back a different outline from the front. Leave clear space inside the bow at board zoom.

The spearman stands upright. The angled shoulder mantle, round shield and upright spear give the figure its shape. Let the shield turn slightly away from the robe. Use a simple helmet with a short point, a player-coloured brow band and a visible blank head.

Open [the Blender scene](robed-pieces.blend) to edit both pieces. Each piece has its own collection and parent at the centre of its base. Move the parent to move the complete piece.

- [Studio render](robed-pair.png) and [higher camera angle](robed-pair-high-angle.png)
- [Archer GLB](archer.glb) and [spearman GLB](spearman.glb)

The Blender scene supplies the wood grain. The GLBs use plain material colours. [The Blender script](build.py) recreates the scene and exports both pieces.

## Faceted revision

The [revised Blender scene](faceted/robed-pieces.blend) uses large, flat robe panels. The archer's hood ends at the cheeks. One diagonal fold crosses under the chin. The spearman's shield sits in front of a single cut in the robe.

The [archer](faceted/archer.glb) has 478 exported triangles, down from 14,454. The [spearman](faceted/spearman.glb) has 646, down from 20,306. [Studio render](faceted/studio.png) · [Higher-angle render](faceted/high-angle.png) · [Blender script](faceted/build.py)
