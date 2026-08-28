# Sprite credits

Most artwork in this directory is by **Kenney** (<https://kenney.nl>) and is released under
**CC0 1.0 Universal** (public domain dedication). No attribution is required; it is given
anyway because the work deserves it. The two exceptions are called out in their own sections
below: `units/` (the project owner's illustrations) and `icons/` (ten **Tabler Icons**
under the MIT licence, one composed from two more, and ten drawn for this project in
Tabler's geometry, CC0).

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

## `icons/*.svg` — 21 badge icons, one per unit type

**Not our work any more, and that is the point.** Twenty SVG files, one per `BadgeClass`
(`src/render3d/badges3d.ts`), rasterised into the parchment roundel that floats over a
piece and says which unit is standing there. They were drawn for this project until the
icon pass; ten of them are now **Tabler Icons** verbatim and an eleventh is composed from
two more, and the other ten are drawn here in Tabler's geometry because no icon set in the
world draws the medieval half of a 4X roster.
The reason the vendored ones are vendored is the same sentence the six yield voices get
(see below): a set drawn by people who draw icon sets for a living reads better at twenty
pixels than anything this project would author for itself, and the badge is the smallest
thing on the board that has to be *read* rather than merely seen.

- **Tabler Icons** — <https://tabler.io/icons> · <https://github.com/tabler/tabler-icons> —
  **MIT licence**, pinned at `@tabler/icons` **3.46.0**

MIT requires no attribution in a running build. It is given because the work deserves it,
which is the same sentence this file makes about Kenney at the top.

**One family, not two.** Lucide (ISC) was preferred first, being already in the project for
the yields, and lost on coverage: it has no bow, no horse, no laurel and no candle, which is
four of them. Tabler has all four. A set half in one hand and half in another is two sets
wearing one name, so the whole badge roster moved to Tabler rather than the six shapes Lucide
was missing.

### One mark per unit type (user, 2026-08-28)

The set was twelve until the ruling: *"for the sake of making unit icons clearer, could we get
unique badges for each unit type (warriors and swordsmen should have different icons)."* It
was twelve because the sculpts had collapsed onto eight model classes on the argument that
nobody can use a difference they cannot see at forty pixels of bronze — and the ruling is
right that a badge is not bronze. What fails on a miniature is *carved detail*; what survives
on paper is a **silhouette**, which is what an icon is made of. So the badge went one grade
finer than the sculpt for every row rather than for four of them.

Two rules decided all twenty, and they are the whole design:

- **the family says the line.** A sword line stays swords, a bow line stays bows, a mounted
  line stays mounted. A player who has learnt one rank has learnt the other two.
- **the axis or the count says the rank**, because those are the two things that survive
  twenty-four pixels. A club on the other diagonal from a sword; a second sword crossed over
  the first; one spear against two; an upright bow against a diagonal one; a wheel among
  horses; a hanging counterweight among thrown arms. Never a longer blade or a finer
  fletching — a *detail* is exactly what the sculpts lost their seat over.

| File | Badge class | Line · rank | Upstream icon | Mark |
| --- | --- | --- | --- | --- |
| `warrior.svg` | `warrior` | sword · 1 | *drawn here* | a club: tapered haft, round head, one binding — on the diagonal opposite the sword |
| `melee.svg` | `melee` | sword · 2 | Tabler `sword` | a sword on the diagonal, hilt low |
| `longswordsman.svg` | `longswordsman` | sword · 3 | Tabler `swords` | two swords crossed — more sword, not a longer one |
| `spear.svg` | `spear` | spear · 1 | *drawn here* | a spear upright: leaf blade, socket collar, two lugs |
| `pikeman.svg` | `pikeman` | spear · 2 | *drawn here* | two hafts braced in a hedge under narrow spikes |
| `ranged.svg` | `ranged` | bow · 1 | Tabler `bow` | a bow loosed on the diagonal, the arrow away to the corner |
| `compositeBowman.svg` | `compositeBowman` | bow · 2 | *drawn here* | a recurve bow stood upright at full draw, arrow still on the string |
| `crossbowman.svg` | `crossbowman` | bow · 3 | *drawn here* | a crossbow spanned: prod, string drawn back to the nut, bolt, butt |
| `mounted.svg` | `mounted` | mounted · 1 | Tabler `horse` | a horse in full, head down |
| `chariot.svg` | `chariot` | mounted · 2 | *drawn here* | a big spoked wheel and its draught pole |
| `knight.svg` | `knight` | mounted · 3 | Tabler `chess-knight` | the chess knight, on its base |
| `mountedRanged.svg` | `mountedRanged` | mounted · ranged | *composed* — Tabler `horse` + Tabler `bow` | the horse, smaller, under a loosed arrow |
| `siege.svg` | `siege` | siege · 1 | *drawn here* | a catapult: base, A-frame, arm thrown, shot in the air |
| `trebuchet.svg` | `trebuchet` | siege · 2 | *drawn here* | a tall frame, the beam pivoted high, the counterweight hung |
| `settler.svg` | `settler` | civilian | Tabler `tent` | an A-frame tent, its door thrown open |
| `worker.svg` | `worker` | civilian | Tabler `hammer` | a claw hammer, head up |
| `scout.svg` | `scout` | civilian | Tabler `binoculars` | field glasses |
| `trader.svg` | `trader` | civilian | *drawn here* | a covered wagon: canopy hooped over an overhung bed, on two wheels |
| `religious.svg` | `religious` | called | Tabler `candle` | a lit candle |
| `greatPerson.svg` | `greatPerson` | called | Tabler `laurel-wreath` | a laurel wreath, eight leaves and a tie |
| `prophet.svg` | `prophet` | called | *drawn here* — Tabler `candle`, ringed | the augur's candle, smaller, under a halo arc |

Twelve names in the class column are model classes and eight are unit ids, and the two
namings are not a muddle: a badge is named after its **class** exactly when it is still the
drawing a roster row nobody has named would fall back to, and after a **row** when it exists
for that row alone. `melee.svg` is the swordsman's sword *and* what any unnamed foot soldier
wears; `longswordsman.svg` is one unit's and nothing else's.

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

### The ten that are not Tabler drawings, and why they are not somebody else's either

Neither Tabler nor Lucide draws a **catapult**, a **trebuchet**, a **spear** (nor a lance,
pike or javelin under any other name), a **crossbow**, a **chariot**, a **club** or a
**horse-archer**. In `@tabler/icons` 3.46.0 the names `catapult`, `trebuchet`, `crossbow`,
`chariot`, `pike`, `spear` and `archery` are all 404s; this is not a gap somebody could close
by looking harder. There was a third family available that draws most of them. It was not
used, for the reason this file already gave about Kenney's board-game icons: those are filled
silhouettes, these are strokes, and a badge set has exactly one job, which is to be one
family. Half a set in somebody's fills and half in somebody's strokes is worse than either.

So nine are **drawn for this project**, CC0 1.0 like everything else original here, but
drawn in *Tabler's* geometry rather than in ours: the 24-unit box, the family's 2.75 stroke,
round caps and joins, no fill anywhere, and a stroked outline wherever a shape wants mass
because Tabler never fills. The tenth is a composition of two Tabler paths.

`trader.svg` is the one on this list whose upstream name is **not** a 404, and the entry
below says why it is drawn here anyway. The counts in this section moved when it did, and
they had already drifted once — `prophet.svg` was appended a pass earlier without them
being touched — so they are now recounted from the table rather than adjusted by one.

- `mountedRanged.svg` is a **composition** of two Tabler drawings: `horse` verbatim, scaled
  0.75 into the lower-left with its stroke-width divided back out so it still prints at 2.75,
  under `bow`'s own arrowhead corner with the shaft cut short to clear the horse's back. Both
  upstream paths are intact and legible in the file.
- `siege.svg` — the catapult. The composition is the old hand-drawn one's: base, A-frame, arm
  thrown, shot in the air, with a stroked ring for the shot.
- `trebuchet.svg` — deliberately the catapult's *pair*. A tall frame instead of a low one, a
  long beam pivoted high across it instead of an arm thrown, and a hanging counterweight box
  where the catapult has a shot in the air. The box is the tell: it is the only square in the
  siege line, and a square survives being small.
- `spear.svg` — it arrived because the spear line was wearing the sword (user, 2026-08-27:
  "spearman line needs its own icon distinct from warrior line"). It is deliberately **not**
  the sword redrawn on another angle: at twenty pixels a diagonal blade is a diagonal blade
  whatever its tip is shaped like, so the spear stands upright, which separates cleanly from
  `melee.svg`'s diagonal at a glance. A leaf blade, a socket collar and the two lugs of a
  boar-spear.
- `pikeman.svg` — the spear *counted* rather than lengthened. A pike is a spear you cannot
  carry alone; at twenty-four pixels a longer shaft is not a difference and a second shaft is.
  Two hafts braced in a shallow hedge, each under a narrow spike, with the spear's leaf blade
  dropped so head shape says the rank too.
- `compositeBowman.svg` — the bow stood **upright** at full draw, the string pulled into a V
  with the arrow still on it, and reflexed limb tips for the tell at sixty-four. Orientation
  is what separates it from `ranged.svg` at twenty-four: a diagonal against an upright.
- `crossbowman.svg` — drawn **spanned**, which is the whole of what makes it read: a prod, a
  string already pulled back to the nut, a bolt lying on the stock with its head out past the
  prod, and a butt. A crossbow at rest is a bow and a chord, and at 2.75 of 24 a bow and a
  chord close into a solid lens that reads as an umbrella — three drafts of this mark came
  back as an umbrella, a mallet and an aeroplane before the string was drawn back. It is the
  third axis in the bow line: `ranged.svg` is a diagonal, `compositeBowman.svg` is a bow seen
  edge-on, and this is the shouldered T of a weapon aimed at the reader.
- `chariot.svg` — the only rank in the mounted line that is not an animal, and that is the
  design rather than a shortcut: a spoked wheel is what a chariot *is*, it is the one circle
  in the line, and it survives being small where a second horse drawing would not. It carried
  a car for one draft and lost it: at twenty-four pixels a box sitting on the wheel's crown
  merged into the wheel and the mark went to mush. One big spoked wheel and the draught pole
  it is pulled by.
- `trader.svg` — a **covered wagon**, and the only entry in this list drawn here in spite of
  upstream having the name. Tabler's `caravan` is a modern travel trailer: a tow hitch, a
  window and one road wheel, which reads correctly and reads *the wrong millennium*, and the
  board it would sit on has an augur on it. `camel`, `wagon` and `horse-cart` are 404s. It
  replaces Tabler `package`, a crate, on the ruling *"could we have a different icon for the
  trader (something more resembling a caravan)"* — a crate says freight but it does not say
  **travelling**, which is the whole of what the unit does. A camel was drawn first, in two
  drafts, and lost on the one thing that decides a badge: it is a quadruped in profile
  standing on the same board as `mounted.svg`, which is also a quadruped in profile, and at
  twelve pixels two humps are two pixels. The wagon collides with nothing in the set — one
  dome, and the only mark on two wheels, where the chariot is deliberately one big wheel. The
  canopy is drawn wider than the bed so it overhangs fore and aft, which is what separates a
  schooner from a cart at any size, and the canopy has no ribs: a rib was drawn and cut for
  the exact reason `chariot.svg` lost its car, that at twelve pixels it closes the arch into a
  lump.
- `warrior.svg` — a club, and it is drawn here rather than vendored for a specific reason.
  Tabler *has* an `axe`, which was the obvious first rank for the sword line, and `axe` is
  Tabler's `hammer` turned around — which would have put the warrior one glance away from the
  worker, on a board where they stand side by side. So: a tapered haft swelling to a round
  head with one binding at the grip, running on the diagonal **opposite** `melee.svg`'s sword,
  because at twenty pixels the axis of a diagonal is read before anything drawn on it. Club
  and sword cross rather than echo.

`knight.svg` is the one vendored drawing that needs a word, being a chess piece in a set of
weapons and animals: the mounted line needed a third rank that was neither a horse in profile
(which is rank 1) nor a horse under something (which is the horse-archer), and Tabler's
`chess-knight` is an upright mass against two horizontal ones — the cleanest available
separation, and on theme for a game called Magister Ludi.

### Which row wears which, and who decides

`BadgeClass` is `ModelClass` plus twelve. Two of the twelve are decided by the **rules** and
ten by the **art table**, and the fence is the point rather than an inconsistency: what a
piece *does* is the simulation's fact and belongs on the unit row, while which drawing names
it is the renderer's, and a `badge:` column in `data/units.json` would be the art reaching
across into the rules' own file.

- **`greatPerson`** — read off `UnitDef.greatWork` in `badgeClassFor`, ahead of everything
  else. A great person stands on the **settler's** sculpt, because it is a civilian with a
  handcart. "Settler" floating over Archimedes sends a player looking for a city site. One
  laurel for all five families, not five: a scholar and a general differ in what they *do*,
  and the unit panel and the offer card already say which in words.
- **`prophet`** — read off `UnitDef.prophesies`, second, ahead of the candle. This entry used
  to say the prophet would wear `religious`, and religion v2 made that the wrong bet: a
  prophet founds a faith, plants a holy site, drafts its beliefs and proclaims, out of a purse
  an order of magnitude past an augur's, and the two pieces stand beside each other on the
  same ground. It wears the **same candle, ringed** — the augur's silhouette is the right one
  and only the rank is different. Ahead of `consecrates` for the reason `greatWork` is ahead
  of both: a prophet that also consecrated would still be a prophet. The ring is drawn in the
  mark and is **not gilt**: this atlas is one ink per *style* (nation, wild) and not per
  class, so gold here would mean recolouring every badge on the board.
- **`religious`** — read off `UnitDef.consecrates`, third. An augur stands on the **worker's**
  sculpt, because it is a figure on foot with a bundle. "Worker" over the only piece in the
  game that spends faith is the worse of the two mistakes: it is an invitation to march it at
  a hill and build a mine.
- **everything else** — `badges.byUnitType` in `data/view3d.json`, third. That table used to
  be a short list of exceptions to `modelClass`; since the one-mark-per-row ruling it names
  *every* row whose badge it decides, which makes it the register rather than a list of
  special cases. Naming a row whose class would have given the same cell (`"swordsman":
  "melee"`) is deliberate: the table is meant to read as the complete answer, and a row
  missing from it is a row nobody has decided about.
- **`modelClass`** — fourth and last, and it has become what it always read like and never
  quite was: the answer for a row nobody has drawn yet. It is a good answer rather than a
  placeholder, because each class member of `BadgeClass` is a line's first rank. A unit added
  to `data/units.json` and nowhere else still gets a legible badge; it just does not get a
  *distinct* one, which is the cue to draw it one.

The table is checked against the atlas at load, so a typo either side is a thrown error
rather than a badge quietly drawing somebody else's icon.

Two of the rows are also split in the **sculpt** (`pieces.byUnitType`, `SculptId` in
`board3d.ts`): a caravan gets the worker's token with a pack instead of a mallet, and a
caravan actually running a route gets a gilt bale roped on top of it. The badge still does the
naming; the bodies only say "these are two things" and "this one is loaded".

The candle is deliberately **not** the faith yield's flame. They are two different questions
asked in two different places — the flame is a *number's* voice on the top bar, the candle is
a *piece's* name on the board — and a player who saw the same mark in both places would
reasonably read the badge as "this tile makes faith". A candle is the same idea one step over:
lit, tended, and something a person carries.

## `src/art/resourceMarks.ts` — 41 resource marks, as path data

**One hand on one grid, twenty vendored and twenty-one drawn here**, and that is new as of
the one-hand pass (2026-08-27). They are the ink on the kind-shaped paper the **Resources
lens** puts on a tile that carries something (see `src/render3d/badges3d.ts`, `TileIcons`),
and they are the only thing on the board that can actually *name* a resource — the diorama
props next to them say "an animal, some ore, a vine", which is atmosphere rather than
information.

- They are **not files**, and this is the one set in this folder that is not. See "path data,
  not files" below.
- Every one of them is on **Tabler's 24-unit grid at weight 2.75** — the badge roster's own
  box and the six yield voices' own box.
- **Twenty are Tabler Icons** (MIT), pinned at the same `@tabler/icons` **3.46.0** the badges
  are, copied to the coordinate.
- **Twenty-one are original work for this project** (CC0 1.0), drawn *in Tabler's geometry*:
  the 24 box, 2.75, round caps and joins, no fill anywhere. This is `siege.svg` and
  `spear.svg`'s arrangement one set over, and for the same reason.

Each row carries its own `credit` in `resourceMarks.ts` — **required**, not optional — which
is what makes the table below checkable rather than a second list that can drift from the
code.

### The debt this file was recording, and how it was paid

The previous note said the set was "two hands under one weight": thirty-two drawings of ours
on the house 64-unit grid and nine Tabler ports on upstream's 24, re-weighted so both painted
the same line. That fixed the weight and nothing else, and the user read the rest of it off
the board:

> *"the luxury resources don't look different, ideally they look consistent with the lucide
> icons and military icons. We need to do a pass on the bonus resources too."*

A shared weight is not a shared hand. Two sets drawn to two padding conventions, with two
ideas about how round a corner is and whether a lobe may be filled, sit on one board looking
like two sets. So the whole table moved:

1. **All forty-one are on the 24-unit grid at 2.75.** The house 64 and its 6.5 stay declared
   in `resourceMarks.ts` because five other families still draw on them — heraldry, the
   discovery sites, the card lines, the marginalia and the printer's devices — and those are
   drawn *large*, where 64 units of detail is right. A resource mark is read at twelve pixels
   on a hex, and twelve pixels is what this grid is for.
2. **Eleven more marks became Tabler drawings**, wherever upstream has one that reads as the
   thing at twelve pixels. Some of those shift the metaphor a step, deliberately: a paw for
   furs, a bone for ivory, a stack of coin for silver, a crown for gold, a candy for sugar.
   A mark that reads is worth more than a mark that is literal and illegible.
3. **The rest were redrawn here on the 24 grid**, and every fill in the set is gone. A filled
   lobe closes its own gaps at tile size — which is why two solid tusks read as a pair of
   croissants and six solid grape berries read as one mound.
4. **`PORTED_MARK_BOX` / `PORTED_MARK_STROKE` / `PORTED_MARK_SCALE` and `resourceMarkPrint`
   are gone**, along with the `cube`, `crescent`, `spiral` and `fan` helpers whose only
   callers were marks that left. One grid needs no reconciliation; the single inset that
   remains is `RESOURCE_MARK_SCALE`, `YIELD_MARK_SCALE`'s twin.

`test/render/resources3d.test.ts` pins the shape of all of it: one grid, one weight, no fills,
and a credit on every row in one of exactly two sentences.

### The two edits made to the vendored drawings, and no others

Word for word the badge section's two, above: the stroke was weighted from upstream's 2 to
**2.75** on upstream's own 24-unit grid, and nothing else. No path was re-fitted and no shape
re-centred, so a `d` string here is copy-pasteable back to and from Tabler's — which is what
makes a re-vendoring a diff rather than a redraw. (The colour edit does not apply: these are
path data, inked by whoever prints them.)

### Path data, not files

Seventeen of these were once SVG files; the other twenty-four rows of `data/resources.json`
had no drawing at all and fell through to the emoji on the row, on the board *and* in every
DOM panel that named them. Finishing the set meant deciding where a finished mark lives, and
a file lost: the panels print the same marks as the board, a file can only ever be one colour,
and this interface sets the same sentence on parchment and on ink. So the drawings are path
data, traced into the atlas with `Path2D` and masked into the DOM as a `data:` URI
(`src/ui/resourceMark.ts`) where the ink is `currentColor`. One drawing, two printers.

Shapes that repeat are a small vocabulary of helpers rather than forty-one blobs of path code
— `leaf`, `drop`, `ingot`, `dot`, `spark`, `stalk`, `poly` and `line`. They take coordinates
and are grid-agnostic, which is why the move from 64 to 24 cost them nothing.

`horses` **is the badge's horse**, and that closes the open art question this file carried
from the icon pass. It is the same upstream drawing rather than a shared file, because a
resource mark and a unit badge are never on screen in the same roundel and the two rosters
keep the right to move apart again.

`emoji` stays on every row of `data/resources.json` as the **last resort**, and nothing that
ships uses it: a resource with no entry in the registry prints its glyph exactly as this
project always did, which is what keeps a resource added at runtime legible with no code
written for it.

| Resource | Source | Mark |
| --- | --- | --- |
| `wheat` | Tabler `wheat` | an ear of wheat, two sprays off one stem |
| `cattle` | *drawn here* | an ox's head, horns swept wide |
| `deer` | Tabler `deer` | a stag's head, antlers full |
| `fish` | Tabler `fish` | a fish, tail to the left |
| `stone` | Tabler `cube` | a cut block in three-quarter view |
| `rice` | *drawn here* | three drooping stalks standing in water |
| `maize` | *drawn here* | a cob laid on the diagonal, kernels ranked, one husk at its foot |
| `bananas` | Tabler `banana` | a single fruit, stem squared at the top |
| `copper` | *drawn here* | an oxhide ingot, four horns and a hollowed waist |
| `tin` | *drawn here* | two cast bars, stacked |
| `clay` | *drawn here* | a coil pot, its rim thrown wide |
| `reeds` | *drawn here* | papyrus stems under their umbels |
| `crabs` | *drawn here* | a crab, eyes on stalks and both claws up |
| `bison` | *drawn here* | a bison head, shaggy crown and stub horns |
| `horses` | Tabler `horse` | the badge set's horse, in full |
| `iron` | *drawn here* | an anvil, horn out, on its foot |
| `gems` | Tabler `diamond` | a cut gem, table and pavilion, with one facet line |
| `silk` | *drawn here* | a bolt of cloth hung from a rail, its hem in points |
| `wine` | Tabler `grape` | a bunch of grapes under a stem and a leaf |
| `spices` | Tabler `pepper` | a pepper pod under its stem |
| `salt` | Tabler `salt` | a salt shaker, three grains falling |
| `incense` | *drawn here* | a censer under three curls of smoke |
| `jade` | *drawn here* | a pierced disc, the bi |
| `marble` | Tabler `building-bank` | a colonnade under its pediment, on a stylobate |
| `furs` | Tabler `paw` | a paw, four toes and a pad |
| `dyes` | Tabler `bucket-droplet` | a dyer's bucket, one drop cast |
| `ivory` | Tabler `bone` | a bone, knuckled at both ends |
| `amber` | *drawn here* | a drop of resin with something caught in it |
| `tea` | Tabler `leaf` | a leaf on its stem, midrib drawn |
| `coffee` | Tabler `coffee` | a cup under two curls of steam |
| `cotton` | *drawn here* | a burst boll in its spiked calyx |
| `sugar` | Tabler `candy` | a boiled sweet, twisted at both ends |
| `olives` | *drawn here* | a sprig, two leaves over two olives |
| `lapis` | *drawn here* | a polished cabochon, flecked with pyrite |
| `silver` | Tabler `coins` | a stack of struck coin |
| `gold` | Tabler `crown` | a crown, five points |
| `honey` | *drawn here* | a comb cell, dripping |
| `pearls` | *drawn here* | a pearl over an open shell |
| `coral` | *drawn here* | a branching stag coral on its foot |
| `whales` | *drawn here* | a fluke, sounding |
| `tyrian` | Tabler `spiral` | a whelk shell, whorl tapering to its apex |

### The five swaps worth arguing about

Metaphor moved a step in each of these, on purpose, and each one is a mark that reads at
twelve pixels replacing one that did not:

- **`stone` and `salt` were the same drawing.** Both were the house `cube()` block; salt was
  told apart by two sparkles, which is a difference twelve pixels cannot carry. Stone is now
  upstream's `cube` and salt is a shaker.
- **`silver` and `gold` were the same drawing too** — a cast bar under a moon and the same bar
  under a sun. They are two different treasures now: a stack of struck coin, and the metal a
  crown is made of.
- **`furs`** was a stretched pelt, which has no name at this size; a paw is the animal it came
  off, and a silhouette that survives.
- **`ivory`** was two filled tusks, the heaviest mark in the old table and the one that most
  obviously read as a pair of croissants.
- **`incense` is deliberately *not* Tabler's `candle` or `flame`.** The candle is the augur's
  badge and the flame is the faith yield's voice, so either would have the board saying "this
  hex makes faith". A censer is the same idea one step over — burnt, not lit. It is drawn here.

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

There are **two grids in this project and the split is by what a mark is read at**, not by who
drew it. Everything read small — the six yields here, the twelve badges, and since the one-hand
pass all forty-one resource marks — is on upstream's **24-unit** box at 2.75, vendored or drawn
in that geometry. Everything read large — the twelve heraldic charges, the discovery sites, the
card lines, the marginalia, the printer's devices — is on this project's own **64-unit** grid at
6.5, inside a safe circle, in one ink with round caps and joins throughout. A vendored mark
keeps upstream's grid rather than being rescaled into ours, because rescaling path data is how a
vendored drawing quietly stops being the drawing that was vendored. Both printers take the box
as a parameter, and one scale constant per small set (`YIELD_MARK_SCALE`, `RESOURCE_MARK_SCALE`)
insets it to the same optical size in the same roundel.

## The three meter marks — `src/art/meterMarks.ts`

The same bargain as the six yields, one family over: path data rather than files, on upstream's
24-unit grid at the yield set's own 2.75, printed by the same emitter and pinned by
`test/render/meterMarks.test.ts`. They are read at chip size on the top bar and in hover cards,
which is the size the vendored sets are drawn for and the size a hand-drawn mark loses at.

| Mark | Upstream icon | Set | Drawing |
| --- | --- | --- | --- |
| happiness | `smile` | Lucide (ISC) | a smiling face: two eyes, a curved mouth, a ringed outline |
| authority | `stamp` | Lucide (ISC) | a hand stamp: the head and its handle, set on the page it marks |
| renown | `laurel-wreath` | Tabler (MIT) | a laurel wreath: two sprays closing under a tied crown |

The renown wreath is **the badge's drawing, not a second one**: `icons/greatPerson.svg` above is
the same Tabler icon at the same weight, so the HUD chip, the renown hover and the badge over a
great person's piece are one picture in three places. It was drawn here until 2026-08-27 —
computed from an arc and a lean angle, because this file's badge section had recorded that Lucide
carried no laurel and nobody re-checked Tabler. A playtest found the consequence first ("needs a
better icon for renown, it's not very readable, needs to be the same style as the other icons"):
three leaves a side on a bare arc reads as a horseshoe at twelve pixels, and a set with one
member drawn by us is a set with one member that looks drawn by us. The house drawing was
deleted rather than tuned.

Edits to upstream: the stroke weighted 2 → 2.75, and `smile`'s `<circle>` face converted to path
data (every member of a mark in this project is a `d` string). Nothing re-fitted, nothing
re-centred.

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
