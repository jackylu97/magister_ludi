# Unit kit trial: archer and spearman

This folder holds a trial of game pieces that a Blender script builds from one
shared kit of simple solids. It holds two pieces, an archer and a spearman.
The state here is the **third pass**, which the user chose to keep. Astra takes
the work from here.

## What the user asked for

- `reference.png` shows three carved wooden pieces: a worker, an archer and a
  spearman. An image generator made it. The user wants "the overall form and
  not the render quality".
- The user dropped the worker to save cost. Only the archer and the spearman
  are built.
- Of the second pass the user said: "it looks like you're missing the
  shoulders". The third pass added a shoulder block, so the shoulders exist now.
- Of the fourth pass the user said: "unfortunately the pieces look worse in the
  fourth pass, could we revert?" The fourth pass is in `pass4/` so that nobody
  repeats it.

## How to run it

Use Blender 4.5 (`/Applications/Blender.app/Contents/MacOS/Blender` on this
machine). Run each command from this folder.

- `Blender -b -P archer.py` builds the archer, prints its triangle count and
  writes `archer.glb`.
- `Blender -b -P spearman.py` does the same for the spearman and writes
  `spearman.glb`.
- `Blender -b -P render.py` builds both pieces and writes six pictures to
  `renders/`:
  - `pair.png`, the two pieces side by side;
  - `archer-34.png` and `spearman-34.png`, front three-quarter views;
  - `archer-game.png` and `spearman-game.png`, from the game's camera, 50
    degrees above the horizon;
  - `board.png`, both pieces at about 56 pixels tall, in three seat colours.
- `python3 compare.py` (plain Python with Pillow, after `render.py`) writes
  `renders/compare.png`: the reference beside `pair.png` at the same base width.

Blender prints a Freestyle error (`'NoneType' object has no attribute
'use_chaining'`) on each render. The pictures and their outlines are still
correct.

The `.glb` files use +Y up. The origin is the centre of the base's foot. The
top of the bare head is at height 1.0.

`pictures/` holds the third-pass renders as JPEG. `board.jpg` is enlarged three
times.

## The kit

`kit.py` holds every part. A piece script only puts parts together.

- `base()`: a wide pale disc, a gold band, a narrower pale step.
- `body()`: a dark 12-facet bell and a cloak over it that is open at the front.
- `mantle(drops, band)`: the shoulder block. `drops` sets how far the edge
  hangs at each angle, so `{0: .10, 30: .05}` gives a V at the front.
- `head()`: a plain sphere.
- `hood()`: a round thick shell, open at the front.
- `helmet()`: a low cap, a thin brow band, cheek plates, a neck guard, a finial.
- `sleeve(shoulder, hand, cuff)`: a sleeve with an elbow, a cuff band and a
  hand block.
- Props: `bow`, `spear`, `shield`. `pick` and `quiver` are also there, but no
  piece uses them now and `pick` was never rendered.

Conventions in the kit:

- Z is up and the piece faces -Y. An angle is measured from the front.
- Faceted parts have flat faces. Turned parts (base, head, shafts) are smooth
  with sharp edges above 40 degrees. The exporter writes both as split normals.
- There are five materials. The game recolours two of them for each player:
  **Seat** (the cloak colour) and **SeatDark** (the darker panel colour).
  WoodPale, Gold and WoodBrown stay fixed.

Triangle counts: archer 1,246, spearman 1,478.

### Outline of the spearman against the reference

Widths are fractions of the base width. The reference is measured from the
picture. The third pass comes from the model numbers, without arms and props.

| Height | Reference | Third pass |
|---|---|---|
| Foot | 0.78 | 0.81 |
| Mid body | 0.62 | 0.66 |
| Shoulder line | 0.66 | 0.73 |
| Neck | 0.22 | 0.28 |
| Head middle, with cheek plates | 0.37 | 0.38 |

Other measures: the base is 0.27 base widths high (reference 0.28). The top of
the head is 1.35 base widths above the foot (reference 1.33). The hood is 0.53
base widths wide (reference 0.57).

## What is right

- The base, with its strong gold band.
- The three stacked solids: body, shoulder block, head. The outline goes in at
  the neck and out to the shoulders.
- The spearman's gold V on the chest.
- The low helmet with the face showing below the band.
- The round hood with a thick rim.
- Both pieces share the base, body, head and sleeve numbers.

## What still does not match

- **Arms.** The forearms are short. The cuff and the hand read as one block
  beside the body. In the reference the sleeve is the main shape, about 0.7
  head widths thick and 0.9 to 1.2 head widths long.
- **Archer's hood and cloak.** The hood hides most of the shoulders. The lapels
  belong to the shoulder block and do not join the hood's rim. In the reference
  the hood and the cloak are one garment.
- **Shield.** It is small (0.41 base widths; the reference is 0.45) and far to
  the side.
- **Spear.** The shaft is thin (0.15 head widths; the reference is about 0.33).
- **Helmet.** The dome is a little large.
- **Bow.** It is pale. The reference bow is gold-brown.
- **Style.** The reference has soft bevels and a wood grain. These pieces have
  hard facets and flat colour.

## The fourth pass, and why it read worse

`pass4/` holds its scripts and one render (`pass4/pair.jpg`). It changed four
things:

- Each arm became one straight thick sleeve with the cuff around its end.
- The archer got one band (`coat_edge`) that runs up the cloak's front edge,
  around the face and down the other side.
- The shield grew to 0.45 base widths and moved to the front-left.
- The spear shaft grew to 0.32 head widths, with a taller collar and blade.

Why it read worse:

- The larger shield and the slanted band hid the V. The upper body became a
  barrel again.
- The slab sleeves pass through the side of the shoulder block.
- The cloak opening became a straight slot.

Two changes measured right. Try them one at a time on the third pass:

- the thick spear shaft, at 0.32 head widths;
- the sleeve length (1.2 head widths on the archer, 0.9 on the spearman).

## How the kit is meant to extend

- A new foot unit is a new prop and new headgear on the same base, body,
  shoulder block, head and sleeves. A swordsman needs only a sword. A scout
  needs a staff and a pack. A settler needs a hat and a bundle.
- A horseman can reuse the upper half (shoulder block, head, helmet, sleeves,
  spear). The horse needs its own body and a longer base.
- Mounted units, ships and siege engines need their own bodies. They can share
  the base, the materials and the facet style.
