# Archer and spearman model review

Open `pieces.blend` to edit the named parts. Each piece has its own collection.
The GLBs each contain one mesh with the origin at the centre of the base. Both
use +Y up. The base is 0.74 units wide. The materials `Seat` and `SeatDark`
control the two player colours.

| Model | Third-pass triangles | Revised triangles | Height | Material groups |
| --- | ---: | ---: | ---: | ---: |
| Archer | 1,246 | 1,374 | 1.061 | 5 |
| Spearman | 1,478 | 1,678 | 1.340 | 4 |

## Review images

- `renders/comparison.png` shows the reference, the third pass and the revised
  pair at about the same base width. The two model renders use the same lights,
  camera and scale.
- `renders/archer-views.png` and `renders/spearman-views.png` show the front,
  profile and rear three-quarter views, from left to right.
- `renders/board.png` shows the models at 51 pixels per unit on a sage ground.
  The camera uses the 50-degree elevation from `data/view3d.json`. Each row has
  an archer and a spearman in crimson, lapis and teal. The first row faces the
  camera at a slight angle. The second row shows the back of each piece.
  Studio lights and an untextured ground keep the shapes visible.
- `renders/review-pair.png` and `renders/third-pair.png` are the full-size pair
  renders used in the comparison.

## Model changes

The archer has one hood and shoulder cape. The face opening has a thick edge.
The cape widens at the shoulders and leaves the dark opening in the cloak visible.
The bow has a curved gold stave, a single brown grip and a straight string.
Its upper limb angles outward and back. A small part of it shows beside the
hood from behind at board size. Its lower tip clears the base and the cloak. The bow arm bends at the elbow.
The other hand rests closer to the body.

The spearman keeps the gold V. Its rear point sits above the cloak, where the
full band can be seen. A curved neck guard follows the helmet band. The shield
has a shallow dark face and a narrow gold lip. Its centre stays to the side of
the V. The spear shaft is 0.060 units wide, up from 0.036. Both bases have a
closed underside.

## Rebuild

Run these commands from this directory with Blender 4.5 and Python with Pillow.
On macOS the Blender executable is usually
`/Applications/Blender.app/Contents/MacOS/Blender`.

```sh
Blender -b -t 2 --python-exit-code 1 -P build.py
Blender -b -t 2 --python-exit-code 1 -P render.py
python3 compare.py
```

The build imports the third-pass kit from the parent directory. It writes both
GLBs and the editable Blender file. The renderer imports the GLBs from each
pass and uses Cycles on two CPU threads. To inspect a smaller draft, add
`-- preview` after `render.py`. Draft frames go to the system temporary
directory under `astra-review-frames`.
