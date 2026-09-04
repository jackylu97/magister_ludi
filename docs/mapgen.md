# Map generation — the designer's reference

What the generator does, in the order it does it, with the name of every number
you can turn and the function that reads it.

Written to be used while tuning, not while compiling. Every heading is a pass;
every pass names its tunables in `data/mapgen.json` spelling and links the file
that decides it. The last section is the whole table with current defaults.

The loop this is meant to be read in: open **`mapgen.html`** (`npm run dev`),
turn a knob in its Tuning panel, press Generate, read the census in the sidebar.
See [The experimental loop](#the-experimental-loop).

Companion files: `data/mapgen.json` (the numbers), `src/sim/mapgenData.ts` (their
types and the override seam), `docs/luxuries.md` (the resource table itself),
`docs/design-history.md` and git (why any of it is the way it is).

---

## Contents

1. [The contract](#the-contract)
2. [The two fields](#the-two-fields)
3. [Terrain, hills and mountains as shares](#terrain-hills-and-mountains-as-shares)
4. [Features: forest and jungle](#features-forest-and-jungle)
5. [Lakes, coast and rivers](#lakes-coast-and-rivers)
5b. [The arid features: oasis and floodplain](#the-arid-features-oasis-and-floodplain)
5c. [The pangaea: one continent and its islands](#the-pangaea-one-continent-and-its-islands)
5d. [The broken ridges](#the-broken-ridges)
6. [The continent carve](#the-continent-carve)
7. [The luxury deal](#the-luxury-deal)
8. [The density budgets and the settle pass](#the-density-budgets-and-the-settle-pass)
9. [Starts: scoring and the fairness guarantees](#starts-scoring-and-the-fairness-guarantees)
9b. [Discoveries: the last pass](#discoveries-the-last-pass)
10. [The experimental loop](#the-experimental-loop)
11. [Every tunable](#every-tunable)

---

## The contract

`generateMap(seed, sizeName, overrides?)` (`src/sim/mapgen.ts`) is a **pure
function of its three arguments**. Same arguments, byte-identical map, on every
machine. Two things follow, and both are load-bearing rather than tidy:

- A save is `{config, log}` and nothing else. The map is not stored; it is
  regenerated. So anything that made the map has to be in the config.
- **Nothing may regenerate a tile mid-game.** `Tile.improvement` and
  `Tile.feature` change during play (build, pillage, chop) and are logged
  commands; everything else about a tile is generation output and stays put.

Order inside generation is part of the contract too. The four noise layers are
drawn first, then rivers roll dice, then resources roll dice — so adding a
resource pass can never move a coastline, and the tests hold that by regenerating
with resources stripped and diffing field by field.

Passes, in order, all in `generateMapDetail`:

| # | Pass | Where |
|---|------|-------|
| 0 | four noise layers from the seed | `mapgen.ts` |
| 0b | the pangaea mask, and the island belt read off it | `pangaeaPull`, `islandShelfLift` |
| 1 | fields → terrain, hills | `buildTerrainFields`, `pickLandTerrain` |
| 1b | forest and jungle, then oases | `assignFeatures`, `assignOases` |
| 2 | small water bodies → lakes | `classifyLakes` (`water.ts`) |
| 3 | ocean within `coast.rings` hexes of land → coast | `mapgen.ts` |
| 3b | shelf run out to every island | `chainIslandShelves` (`water.ts`) |
| 4 | rivers (**first dice**) | `traceRivers` (`water.ts`) |
| 4b | watered flat desert → floodplain | `deriveFloodplains` (`water.ts`) |
| 5 | who can drink | `computeFreshwater` (`water.ts`) |
| 6 | resources (**second dice**) | `placeResources` (`resources.ts`) |

Neither pangaea pass rolls a die either — the mask is arithmetic on the
continental field and the shelf chains are a BFS — so a map generated with
`pangaea.enabled: false` and `shelfChains: false` is the pre-2026-09-03 world
back, byte for byte (`test/mapgen/resources.slow.test.ts`'s `OLD_FIXTURES`).

Only two passes roll dice, and both new passes are in the other camp: the oases
are dealt off a noise layer and the floodplains are read off the finished water,
so neither touches `rng` and resources on a given seed are drawn from exactly the
stream they were drawn from before either existed.

Start positions are *not* a generation pass. They are derived from the finished
map by `chooseStartPositions` (`startPositions.ts`), which rolls nothing — so
asking twice gives the same seats, and `placeResources` can ask about them
mid-generation without disturbing anything.

### Frequency versus cycleTiles

Every noise layer states its scale one of two ways, and which one is a design
decision:

- **`frequency`** — cycles around the *world*. The number of features is fixed
  and each grows with the map. Right for continents and regional climate.
- **`cycleTiles`** — tiles per cycle. A feature's *size in hexes* is fixed and a
  bigger map holds more of them. Right for anything read at hex scale: ranges
  that must stay one or two tiles wide, copses that must stay copses.

`frequencyOf` in `mapgen.ts`. `cycleTiles` wins if a layer somehow has both.

---

## The two fields

The generator draws exactly two geographies and reads every terrain decision off
them. That is the difference between a world and a pile of independent scatters:
a forest is where it is because that part of the continent is wet, and a hill is
where it is because a range runs past it.

Both are sampled on the surface of a **cylinder** (θ = 2π·col/width fed to 3D
noise), so column `width` lands on the same coordinates as column 0 and there is
no east–west seam. Rows do not wrap.

Both are **rank-normalised**: each value is replaced by its percentile. That is a
monotone transform, so the shape of the field is untouched, but every threshold
now means "a fraction of the map" — `seaLevel: 0.58` puts water on 58% of tiles
on *every* seed. `rankNormalizeInPlace` and `rankAmong` in `mapgen.ts`.

### Relief

Built in `buildTerrainFields`. Three ranked components, mixed by weight, plus a
skeleton bonus:

1. **Ridged multifractal** (`ridged3`, `noise.ridge`) — crests are connected
   *lines*, not blobs. This is what a mountain range is. Weight
   `elevation.ridgeWeight`. Sharpened first by `elevation.ridgeSharpness`: a
   power above 1 pulls everything below the maximum down harder than the
   maximum, which is the difference between a range one hex wide and four.
2. **The continental field itself** (`noise.elevation`), weight
   `elevation.continentWeight` — biases crests inland, onto the high spine of a
   landmass, so a range separates one half of a continent from the other rather
   than decorating a beach.
3. **Local steepness of the continental field**, weight
   `elevation.gradientWeight` — an escarpment reads as hills even where no crest
   runs under it.

Plus the **crest skeleton**. `crestLine` marks tiles where the field falls away
in *both* directions along at least one of the hex's three axes — a one-tile-wide
locus by construction, however broad the massif. Those tiles are lifted by
`elevation.crestlineWeight × crestRank`, *in proportion to how high the crest
is*, which is what makes ranges taper at their ends instead of stopping square.
Read off the **unbiased** crest deliberately: the spine bias steps in bands
parallel to the coast, and a skeleton read off the biased field finds ridges in
those bands that are artefacts of the mask.

**The spine bias.** A crest deep inland keeps its full height; one on the beach
keeps `elevation.spineFloor` of it, smoothstepped between
`elevation.spineNearTiles` and `elevation.spineFarTiles` hexes from water
(`waterDistance`, a wrap-aware BFS whose crest is the medial axis of the
landmass). A strong line still makes a small coastal range; it just cannot
compete with the interior.

### Moisture

Two scales **multiplied**, not added:

```
wet = regional^regionalWeight × local^localWeight
```

`noise.moistureRegional` (low frequency: this part of the world is wooded
country, that part is open steppe) times `noise.moistureLocal` (`cycleTiles`:
copses and clearings). Multiplication is the point — a wood needs the region
*and* the patch to be wet, so forest concentrates into real regions instead of
dusting the map evenly. The exponents are `moisture.regionalWeight` and
`moisture.localWeight`; below 1 an exponent flattens a layer's say, above 1 it
sharpens it.

**Rain shadow** (`moisture.rainShadow`) then dries tiles downwind of a range,
*before* the field is ranked. `rainShadowAt` walks upwind one hex at a time and
stops at the first mountain: the near side of a shadow is desert, the far side
merely dry (`strength × (1 − (step−1)/rangeTiles)`). `windDirection` is the hex
direction the wind comes *from* — 3 is west, see `hex.ts`. `enabled: false`
skips the pass whole rather than tuning it to zero, so a disabled shadow leaves
moisture bit-identical to a build that never had one.

---

## Terrain, hills and mountains as shares

The relief mix is ranked **among land tiles** (`rankAmong`) and the two terrain
cuts are quantiles of that rank:

```
mountainCut = 1 − elevation.mountainShare
hillCut     = mountainCut − elevation.hillShare
```

So the top `mountainShare` of land is mountain and the band of `hillShare`
immediately below it is hills. Shares rather than absolute heights, for two
reasons: "5% of the land is mountain" is the sentence a designer actually wants
to write, and a quantile is stable across seeds *and* sizes where an absolute cut
is only stable across seeds.

Because hills are the flank band of the same field the peaks came from,
**foothills hug every range for free**, and lesser crests that never reach the
mountain cut surface as standalone hill chains through the interior.

Everything else is a lookup (`pickLandTerrain`), in this precedence:

| Test | Result |
|------|--------|
| on the mountain quantile | `mountain` |
| latitude ≥ `latitude.snow` | `snow` |
| latitude ≥ `latitude.tundra` | `tundra` |
| moisture < `moisture.desertMax` **and** latitude < `latitude.desertMax` | `desert` |
| moisture < `moisture.plainsMax` | `plains` |
| otherwise | `grassland` |

Latitude is 0 at the equator and 1 at either pole (`latitudeOf`).

The coastline is decided by the **continental field alone**: land is
`base ≥ elevation.seaLevel`, before relief exists. Polar rows above
`elevation.polarWaterLatitude` get `elevation.polarWaterElevationBonus` added
first, so the caps read as ice rather than open water, and they are land for
every later pass too.

Final `tile.elevation` is `seaLevel + (1 − seaLevel) × relief` on land and the
raw continental height at sea — so elevation stays monotone across the shoreline
and a river always finds the sea downhill of everything.

---

## Features: forest and jungle

`assignFeatures`. A **share of eligible ground**, not a cut on the moisture value.

Eligibility first (`jungleEligible`, `forestEligible`): jungle wants grassland or
plains inside `latitude.jungleMax`; forest wants grassland, plains or tundra
between `latitude.forestMin` and `latitude.forestMax`, on a tile with no feature
yet. Then the **wettest `moisture.jungleShare` / `moisture.forestShare` of that
eligible set** gets the trees.

Why a share: moisture is ranked over the whole map, so a fixed `jungleMin` asks
"is this tile wetter than 82% of the *world*" — whose answer inside the equatorial
band depends entirely on where this seed put its wet regions, which is how jungle
came to be absent from one seed and cover half the tropics on the next. Ranking
*within* the band asks "is this among the wettest tenth of the tropics", which
holds on every seed.

What it does **not** flatten is *where* the trees go: the regional layer still
decides which parts of the band are rainforest and which savannah. A share fixes
how much wood the world has; the field fixes where it is.

Jungle is dealt first and takes its tiles out of forest's eligible set, so the
tropics read as jungle-then-clearing rather than two features fighting over a hex.

The **oasis** is dealt in this same pass, immediately after the trees, but on a
different field and with a spacing rule of its own — see
[The arid features](#the-arid-features-oasis-and-floodplain). The floodplain is
not dealt at all; it is derived after the rivers.

> Note the denominator. `forestShare` is a share of *eligible* ground, which is
> about two thirds of the land — so it reads roughly two thirds as large in a
> terrain census. A `forestShare` of 0.32 is not 32% of the map.

---

## Lakes, coast and rivers

All three in `src/sim/water.ts`. This is geography and truth-tracking only: a
river costs nothing to cross yet and a lake grants no bonus; `Tile.freshwater` is
the fact being recorded for a later milestone to price.

**Lakes** are a *classification*, not a terrain the noise produces. Every water
tile belongs to a connected water body (wrap-aware, so a puddle on the seam is
one lake); bodies of at most `lakes.maxSize` tiles that are not part of the polar
margin become `lake`.

**Coast** is a multi-source BFS, flooding outward from every land tile across
ocean tiles only, up to `coast.rings` hex steps (2, since the naval-combat
ruling of 2026-08-29 — a one-ring shelf was too thin a strip to fight over).
The flood fires only from `ocean` tiles, and that guard is load-bearing: `coast`
is a *marine* terrain — the shelf a trireme hugs, the water a fishing boat or a
caravel may enter (`isEmbarkableTerrain`) — and a pond has no shelf. A lake is a
maximal water body, so no ocean tile is ever adjacent to one, the flood can
never step onto or through a lake, and a lake can neither become coast nor mint
it. Lake-adjacent land keeps its terrain and gains `freshwater`.

Distance is a graph invariant, so the *set* of tiles the flood promotes does not
depend on the order it visits them in — what determinism actually rests on is
the ring-1 seed (every ocean tile with a land neighbour, walked in tile-index
order, exactly the old single-ring check) and the final sweep that writes
`coast` back onto `map.tiles` in that same order. `rings: 1` therefore
reproduces the pre-ruling map byte for byte — pinned in
`test/mapgen/resources.slow.test.ts`'s `OLD_FIXTURES` — and `rings: 2` is a
strict superset of that shelf, never a different one.

A second ring roughly doubles coast's share of the map's water (measured on
three sizes at seed-fixed generation: standard 15.8% → 29.4%, duel 37.3% →
63.1%, large 12.1% → 23.2% — a duel map is nearly all shelf now, which is the
point on the smallest board). Total water is unmoved — this pass only
relabels `ocean` as `coast`, it plants nothing and removes nothing — so land
share, the sea-resource budget (`bonusPer1000LandTiles` etc., which is counted
per **land** tile) and `isCoastal`'s adjacency reading for the start scorer's
`coastBonus` (still "does a land tile touch a `coast` tile", still true or false
exactly as before — ring 1 is unchanged) are all untouched by the width. What
does widen is the *pool* every sea resource (`validTerrain: ['coast']` only,
never `'ocean'`) draws its candidate tiles from, so a coastal luxury or bonus
resource has more shelf to land on, at the same fixed budget.

**Rivers run on edges, not tiles.** A river is a path along hex *corners*; each
step crosses exactly one edge and flags it. A corner's altitude is the mean
elevation of its three hexes, and a trace steps to the lowest neighbouring corner
that is not higher — ties broken by the corner's canonical integer key, never by
iteration order. (That tie-break matters more than it looks: elevation is a rank
so values are distinct *except* on the polar plateau, where the ice bonus clamps a
whole region to exactly 1.)

A trace ends at a **mouth** (a corner touching ocean or lake) or a **confluence**
(a corner that already carries a river — the two merge and share the way down).
It fails and is discarded whole if it runs out of downhill before either, or if
it is shorter than `rivers.minLength` or longer than `rivers.maxLength`.

The quota is `rivers.countPer1000Tiles` scaled by map area, floored at
`rivers.minCount`, with `rivers.attemptsPerRiver` springs examined per river
asked for — per river rather than a flat cap, because the budget has to grow with
the quota it serves. A spring must sit at altitude ≥ `rivers.minSpringElevation`
(which is to say: **on range ground**, the relief field's own high country) and
`rivers.minSpringSpacing` hexes from another spring. That spacing is 1 — "not the
same hex" — deliberately: springs already have to stand on a fifth of the land
gathered into lines, and two springs sharing a ridge make a river *system* with
tributaries, which is what a mountain range should shed.

Rivers are the generator's **first dice**, rolled after every noise field, so
terrain on a given seed is exactly what it was before rivers existed.

## The arid features: oasis and floodplain

Two features on the desert, added together because they are two halves of one
idea — where the water is, the desert is not desert — and built as opposites of
each other. Neither rolls a die.

### Oasis — placed

`assignOases` (`mapgen.ts`). A **share of eligible ground** exactly as the trees
are: `moisture.oasisShare` of the flat, featureless desert gets a pool. Yield is
3🌾 1⚙ (`terrain.json`), move cost is the desert's own 1 — an oasis is walkable
and workable, which is the Civ convention — and it is **fresh water**, for itself
and for its six neighbours.

Two things separate it from the way forest and jungle are dealt, and both are
what make a scatter read as a scatter:

- **It is ranked on the *local* moisture layer alone**, not the combined field.
  An oasis is a local high water table inside regionally arid country, and the
  combined field cannot say that: moisture is `regional × local`, so the wettest
  tiles of any desert are the ones whose *regional* value came closest to not
  being desert at all — a rim around the edge of every sand sea, which is
  precisely where an oasis is not. `TerrainFields.localMoisture` exists for this.
- **There is a spacing rule.** The wettest tiles of a noise layer are contiguous,
  so a share taken straight off the ranking deals three or four pools in one
  clump and none for forty hexes — a lake with palm trees, not a chain of
  watering holes. Candidates are swept wettest first (ties by tile index) and one
  is taken only if it stands `moisture.oasisSpacing` hexes from every oasis
  already placed.

The share is counted against the eligible set *before* spacing thins it, so
`oasisShare` is a ceiling rather than a promise: dense desert seats all of it, a
thin ribbon seats what it has room for. That is the honest behaviour — the
alternative is a pass that keeps searching until it hits a quota and packs the
last few in at the spacing floor. On a standard map it comes out at about **6.6
oases**.

### Floodplain — derived

`deriveFloodplains` (`water.ts`), run after the rivers and after the oases.
**There is no frequency and no share.** A floodplain is not a thing the generator
decides to put somewhere; it is what desert *is* when a river runs through it, so
the rule is read off the finished water and a map with more rivers grows more of
it for free. Yield is 2🌾. On a standard map, about **44 tiles**.

Four conditions, each refusing a hex that would read wrong:

| Condition | Why |
|---|---|
| terrain is `desert` | this is the arid-land feature; a river through grassland is a river through grassland |
| not hills | a hill's yield wins outright over any feature's, so a floodplain on a hill would be a name with no number behind it — and a terraced hillside is not a flood plain |
| feature is `none` | so the pass steps around an oasis rather than paving over it |
| a river runs on one of its own edges, **or** a neighbour is an oasis | the sentence itself |

It runs **at generation only**. `Tile.feature` is one of the two fields that
change during play (the chop's), and a pass that re-derived features mid-game
would be the map regenerating itself under a save.

### Fresh water, and the one clause that is missing

`computeFreshwater` gained two clauses and deliberately not three. A tile can
drink when a river runs on its own edges, when **it is itself an oasis**, when a
neighbour is a lake, or when **a neighbour is an oasis**. Watering *itself* is
the thing no other source here does, and it is the whole difference between a
pool standing on a land hex and a body of water occupying one.

A **floodplain is not named at all**, and its absence is the point: it is only
ever derived onto ground that already touches a river or an oasis, so it is fresh
by construction. A clause for it would be a second rule that could one day
disagree with the first. `water.test.ts` asserts the derivation instead.

### Neither is choppable

There is no row for either in the chop table (`data/improvements.json`), and
unlike the jungle's absence that one is a decision rather than a hole waiting for
a design: there is nothing to fell. An oasis is water and a floodplain is ground,
so a chop row would have to be a rule about draining or levelling the map.
`improvements.test.ts` asserts the absence at the table *and* through the
command, so the worker's sheet cannot start offering it.

### What grows on them

Sugar regains the home the ledger always gave it — `validFeatures:
["jungle", "floodplain"]`, with `desert` joining its terrain list so the
floodplain half can match (the constraint is a plain AND of terrain and feature,
so the two halves are two rows' worth of ground written as one). Incense is
widened to `["none", "floodplain"]`: its ratified home is "desert, desert hills,
plains, plains hills", and a floodplain is still desert, so leaving it out would
have been a silent narrowing of the kind `docs/luxuries.md`'s Approximations
table exists to prevent.

Salt, lapis, silver and gold stay on bare desert, deliberately. Salt is an
evaporite pan and a river running through it is the thing that stops one forming;
the other three are mined, and a mine needs hills, which a floodplain never has.
See `docs/luxuries.md` for the row-by-row reasoning.

---

## The pangaea: one continent and its islands

`pangaeaPull` and `islandShelfLift` in `mapgen.ts`, `chainIslandShelves` in
`water.ts`. **Ruled 2026-09-03** (`docs/flags.md`, "Batch: mapgen pangaea"): the
default map is one large continent with medium islands off its shelf, and every
seat is on the continent.

The reason is the length of a game. A split-continents world is a *new world* to
sail to, and this game ends before ocean-going hulls exist — so a second landmass
across deep water was ground nobody would ever stand on. The maritime half of the
design is served instead by islands a coastal hull can reach.

### The mask, and why it is a mask

It biases the field the coastline is **already** read off, and nothing else. The
generator's architecture is "two geographies, everything derived"; a pangaea that
drew its own landmass would be a third geography the relief and moisture layers
knew nothing about — mountains that stop at an invisible line, forests that
ignore a coast. Every later pass carries on reading the same continental field it
always did.

Two shoulders, each flat across `coreShare` of a half-extent and rising to 1 at
the edge (`smoothstep`):

```
pull = eastWestStrength × shoulder(distance from the meridian)
     + polarStrength    × shoulder(latitude)
```

The east–west distance is **wrap-aware**, or the mask would put a hard rim at
column 0 and make the seam the noise hides visible as a coastline. `polarStrength`
is deliberately small: a continent that runs most of the way to the caps is what
keeps tundra and snow on the map at all.

**The field is ranked, masked, and ranked again.** That second rank is the whole
trick — `seaLevel` is a quantile, so re-ranking a masked field leaves the map with
exactly the water fraction it had before and only changes *where* that water is. A
mask applied after the cut would have been a sea-level change wearing a shape's
clothes.

### The island belt is read off the coastline, not off a longitude

A belt written as a band of longitude lands inside the continent on one seed and
out in the deep ocean on the next, because how wide the continent comes out is the
noise's business. So the cut is taken **twice**: a provisional one to find the
shore, then `islandShelfLift` gives height back to water in a gaussian band
`islandShelfTiles` hexes offshore, and the real cut follows.

Four hexes offshore is not an arbitrary distance: it is exactly the gap two rings
of `coast` close from either side, so a belt island is on the shelf by
construction. The lift touches **water only** — the continent keeps its own
coastline, and the land the belt gains comes back out of the re-rank at the
mainland's thinnest margins.

The belt does not *draw* islands; it lets the noise draw them. An archipelago
appears where this seed's continental field was already high, so it reads as
geography rather than as a stamp.

### The shelf chains

`chainIslandShelves`, pass 3b. Landmasses are numbered in tile-index order, the
largest is the mainland, and any other landmass the mainland's shelf cannot reach
is joined to it by promoting the BFS-shortest path of `ocean` between the two
shelves to `coast`.

**It moves no land.** A land bridge would change the land fraction, the terrain
census and every density budget counted per land tile; a shelf is the same
continental shelf real islands sit on and costs the map nothing but a ribbon of
shallow water. The one thing it widens is the pool of tiles a sea resource may
land on, which the 8/27 playtest note wanted anyway.

It fires on a minority of seeds — the belt already puts most islands inside the
free two rings — and it is what turns "islands usually reachable" into a
guarantee. Its one refusal is land ringed by **lake**: `lake` is not embarkable,
a lake has no shelf, and an islet in one is ground no unit in the game can reach.
Nothing here may invent water.

### The belt retune, 2026-09-03

Ruled the same day, once the shape was on screen: **islands bigger and more
frequent**. Three knobs, no new algorithm — `islandShelfTiles` 4 → 5 (further
out, so there is sea room for an island to be round rather than a splinter),
`islandShelfSpread` 2.5 → 3.0 and `islandShelfLift` 0.18 → 0.32.

Measured on a standard board over twenty seeds:

| | before | after |
|---|---|---|
| islands of ≥6 hexes, per map | 5.8 | **8.4** |
| average size of one | 31 | **41** |
| islands of ≥20 hexes, per map | 2.0 | **4.0** |
| median mainland share | 92% | **83%** |
| median mainland **tiles** | 1480 | **1476** |

The land fraction is fixed by `seaLevel`, so **every hex the islands gain is a
hex the mainland gives up** — which is why the belt cost the continent a tenth of
its ground at the first cut. The answer, ruled the same day, was to raise the
world's land rather than to give the islands back: `seaLevel` 0.62 → 0.58, about
170 more land tiles on a standard board. The continent is back to the *footprint*
it had before the islands (1476 tiles against 1480) with the archipelago on top
of it, and the share is the only reading that stays lower.

Every per-1000-land-tile budget — bonus, strategic and luxury resources, and the
discoveries — scales with that land automatically, because that is the
denominator they were always written in.

### What it costs, measured

- **Land fraction: the mask does not move it.** Over twenty seeds and every size
  the drift against the same seed with the mask off tops out at 1.4% of the map
  (on duel, where one hex is worth the most) — the ice-cap bonus is applied after
  the mask, so a polar tile the re-rank moved across the cut is gained or lost at
  the margin. How much land there is, is `seaLevel`'s business and nothing else's.
- **Mainland share of the land**: a median of 81-89% by size. The floor over a
  twenty-seed sweep is 36% (seed 5, large), and the gap is one documented shape —
  a **strait**. The mask says where the land reaches east and west and nothing
  about the rows between, so a seed whose noise runs a low band across the
  continent is dealt a pangaea in two lobes. Both lobes sit on one shelf and both
  are big enough to live on, so both are legal homes.
- **Rivers**: the quota is a *ceiling* on the boards above `standard`, because a
  trace has to run downhill from spring to sea without one step back up and one
  continent has an interior. Breaking the ranges
  ([the broken ridges](#the-broken-ridges)) bought most of the loss back —
  measured floors over twenty seeds are duel 0.71, standard **0.98**, large 0.81,
  huge 0.63, giant 0.68 of the quota asked for. Round two of the ruling cost some
  of that back and `rivers.minSpringElevation` 0.84 → 0.80 recovered it — see
  that row in [Every tunable](#every-tunable).
- **Coast**: more of it, both from the longer island coastlines and from the
  chains.

### Starts: the landmass floor

The fifth refusal in `scoreStartSite`, and the only one that looks past the two
rings. A site is allowed when its own landmass is **the mainland, or big enough
to live on** — two clauses joined by an *or*:

- `starts.minLandmassShare` (1) — at least this share of the **largest**
  landmass. `1` means the mainland.
- `starts.minLandmassTiles` (100) — or simply this many contiguous land tiles,
  whatever the mainland has.

The *or* is the ruling of 2026-09-03: "all players spawn on the main landmass (or
a landmass with at least 100 continuous tiles) so players aren't isolated on a
small island". Either clause alone gets one of the two cases wrong. A share
refuses the far lobe of a strait-split pangaea, which is a whole country; a tile
floor alone would seat a player on an island the day the belt grew one that size.
`0` switches a clause off; both at `0` disables the refusal.

Every roster the game plays now seats legally on every seed in the sweep — duel
at two and four, and every larger board up to the **maximum roster of twelve**.
(The tile floor is what let twelve seats in: mainland-only used to fall through
to the last-resort sweep on a strait seed.) The one documented gap is duel at six
seats or more: 386 land tiles will not seat six capitals anywhere decent, so the
greedy sweep takes refused sites (`chooseStartPositions`) and some of those are
small islands. A start on an island beats no start.

---

## The broken ridges

`elevation.ridgeBreakStrength`, applied inside `buildTerrainFields`. **Ruled
2026-09-03**: "make it so that the ridges of mountains aren't as continuous —
break up continuous lines of mountains a bit and have them be slightly more
scattered."

The crest field is a *ridged multifractal* precisely so that its crests are
connected lines rather than blobs, and `crestlineWeight` then lifts the skeleton
of those lines — which is what a range is, and also why a range came out as one
unbroken wall from end to end. The break is a second field multiplied into the
crest **before the relief mix is ranked**:

```
crestRaw = sharp × spineBias × (1 − ridgeBreakStrength × (1 − breakRank))
```

`breakRank` is a fine-scale fbm (`noise.ridgeBreak`, `cycleTiles: 4`) ranked
among land, so the strength means an exact fraction: the break field's high
country keeps its crest whole and its low country keeps `1 − strength` of it. The
saddles that opens are what turn one wall into a chain of massifs.

**It is a scatter, not a cull, and that is arithmetic rather than tuning.**
`mountainShare` is a quantile of the land, so the same number of hexes is
mountain either way — all the break decides is *which* hexes. The hexes a saddle
gives up surface as mountain somewhere else along the line.

It reads the **ridge layer's own permutation table** rather than a fifth noise
layer, and that is deliberate: a fifth table would have to be drawn from `rng`,
and any draw made before the rivers moves every river and every resource on every
seed. Sampled through plain fbm at hex scale instead of through `ridged3` at
range scale, the same table hands back a field with nothing in common with the
crests it breaks. `0` skips the pass and leaves the relief bit-identical.

Measured over twenty seeds on a standard board, whole → broken:

| | whole | broken |
|---|---|---|
| mountains per map | 143 | **143** (exactly) |
| separate massifs | 23.9 | **57.4** |
| hexes in the average massif | 6.37 | **2.52** |
| the largest massif | 40 | **15** |
| longest straight run, average | 6.8 | **5.3** |
| longest straight run, worst seed | 11 | **8** |

The first cut shipped at `strength 0.7` / `cycleTiles 4` and the user asked for
more of it the same day ("still too many unbroken chains of mountains"); the
strength is now at its ceiling of 1 and the break field is finer, which roughly
halved the average massif and the longest run again.

Three knock-on effects, all improvements and all measured:

- **Walkability.** A wall of mountain encloses pockets; a chain of massifs has
  passes. The largest connected component of *passable* land on the mainland went
  from 98.5% of it to 99.7% on average, and from 89.6% to 96.1% on the worst
  seed.
- **Rivers.** A continuous wall is a watershed a trace cannot cross, so the
  interior it encloses drains nowhere. Gapped, the same interior has saddles to
  leave by. (Pushed to the ceiling the crests also get *flatter*, which costs
  springs; `rivers.minSpringElevation` follows it down to compensate.)
- **Rain shadow.** A gapped range shelters a narrower strip, so the lee is a real
  lee: the test's bound came back from 0.92 to 0.91, and to its original 0.90
  once `mountainShare` fell to 0.08.

The scatter's one price — scattered mountains touch more ground, so more hills
stand next to one — was paid and then refunded on the same day. The share of
hills that are *not* foothills went 0.535 → 0.500 with the break, and back to
0.561 when `mountainShare` fell to 0.08. Hills per map (677) were never the thing
moving: the mountain cut is a quantile, so what changes is *which* hexes are
mountain, not how many hills there are.

---

## The continent carve

`carveContinents` in `src/sim/resources.ts`. Rolls nothing.

A **continent** here is Civ 6's sense of the word — a chunk of land of roughly
fixed size — and emphatically *not* a connected landmass. Keyed to landmasses, a
map whose land happened to be one connected mass had one region, was dealt one
hand of luxuries, and read as a single grey average from pole to pole.

Three steps:

1. **Components.** Connected land, wrap-aware, seeded in tile-index order so a
   component's id is a fact about the map rather than the traversal
   (`landRegions`).
2. **Cut each component** of at least `minContinentTiles` land into
   `round(tiles / continentTargetTiles)` pieces, by farthest-point seeding and
   then `growBalancedCells`.
3. **Attach everything left** — sea, and islands below the floor — to whichever
   carved continent is nearest across open water. That is what gives a pearl bed
   a continent to belong to, and what stops a two-hex skerry being dealt a hand.

### growBalancedCells

A multi-source BFS **with a quota**, and the quota is the whole difference from
the plain Voronoi it replaces. Under Voronoi the cell sizes are whatever the
coastline hands out: a lobed supercontinent divided between four seeds gave cells
of 60 and of 477 on the same map, and "continent" then meant a different amount
of ground every time the word was used.

Capacity starts at `ceil(|tiles| / |seeds|)`. When a cell is full its frontier
stops and its neighbours take the ground. If a round ends with ground still
unclaimed — a cell can be *boxed in*, with every route out of a pocket running
through full cells — capacity rises by one and the frontier is **rebuilt by
sweeping the whole member set** in tile-index order, not resumed from where the
last round stopped (a tile whose owner filled up after the sweep passed it would
otherwise never be asked again). Every cell is connected by construction.

### Fold and re-cut, and the remainder

`mergeSmallContinents` folds any carved cell below the floor into the **smallest
neighbour it shares a land border with** (ties by id), and refuses the merge if
the result would pass `1.5 × continentTargetTiles`. Ids are compacted afterwards
in order of lowest member tile index, so a continent's number stays a fact about
the map rather than about how many merges happened first.

**Why the band holds, in one line:** a component of `x · target` tiles is cut
into `round(x)` pieces of at most `x/round(x) · target` each; that ratio is worst
at a half (`x = 1.5⁻` gives 1.5), and `minContinentTiles` is the floor under `x`.
So every carved continent lands in `[minContinentTiles, 1.5 × continentTargetTiles]`
— arithmetic, not a hope about the coastline. With the shipped 155/200 that band
is 0.775×–1.5×.

**The floor is now above the cut's own worst ratio, and that has a consequence.**
`x/round(x)` bottoms out at **0.75** (at `x = 1.5`), and 155 is above
`0.75 × 200 = 150`. So a component of almost exactly one and a half targets cuts
into two cells that are *both* under the floor, and `mergeSmallContinents` folds
them straight back into the one continent they came from. It is allowed to — the
result is 1.5 targets, exactly the band's ceiling — and the band still holds; what
is lost is the cut. A **duel** map's ~390 land tiles land in that window on most
seeds, so three of five sampled duel seeds now come back as a *single* continent
and are dealt one hand of luxuries for the world. Standard and up have enough land
that the window is one component among many and never the whole map, so they are
unaffected. Setting `minContinentTiles` at or below `0.75 × continentTargetTiles`
closes it.

**The documented remainder**, three cases that are correct rather than bugs:

- Land in a component *below* `minContinentTiles` is never carved; it is attached
  across the water, so a 30-hex island belongs to the mainland's continent and
  its jade is that continent's jade.
- A cell with no land neighbour at all, or whose every neighbour is already near
  the ceiling, keeps its size.
- A map with no component over the floor (an archipelago world) falls back to one
  continent per component — a map still has to have continents.

Consequently the *tiles assigned to* a continent can exceed the band while the
ground *carved into* it never does. Both are right: the band is a statement about
the carve, the attachment is a statement about which coastline a resource trades
from.

---

## The luxury deal

`dealContinentLuxuries` + `luxuryGroundOf` (`resources.ts`). This is the one
resource pass that is a *geography* rather than a scatter, because where a kind
grows is the whole of what makes it worth trading for.

Each continent is dealt `luxuryKindsPerContinent` kinds; a kind is confined to
`maxContinentsPerLuxury` continents map-wide (relaxed upward if the arithmetic
demands — the cap can never be smaller than
`ceil(continents × kinds / |luxuries|)`). Then `luxuryCopiesPerKind.min…max`
tiles of each dealt kind are placed on that continent.

### Hostability

A continent may only be dealt a kind it can actually **seat a seam of**: it needs
at least `luxuryMinCopiesPerContinent` candidate tiles for that kind, using the
same per-kind candidate list the scatter draws from, so "can host" and "will
place" are the same sentence asked twice. A hand naming a luxury the continent
has nowhere to put deals a blank — the copies are never placed, the kind is
absent from the map, and the character the hand was supposed to give the
coastline is one kind thinner than the ledger claims. Refusing the draw is the
whole fix, and the redraw is deterministic because it is the same weighted draw
over a smaller pool.

The **cap** is a design preference and relaxes when everything hostable is at it
(take from the least-used kinds); the **ground** filter never relaxes. A jungle is
a fact.

### Scarcity bias

The draw weight is

```
frequency × (continentCount / hostCount) ^ luxuryScarcityBias
```

`frequency` is the designer's "this ought to be rarer than that" dial. The second
factor is what makes the exotic half of the table exist at all: a wine grows on
any grassland and will find a home whoever is dealt it; coffee needs jungle, and
the two or three continents with jungle are the only places coffee can ever come
from. Weighted the same, the jungle continent draws four kinds out of the twenty
that suit it and coffee is one ticket in twenty — which is exactly how a third of
the luxury table was missing from most maps.

`luxuryScarcityBias`: **0** is frequency alone (the old behaviour), **1** is
proportional, **above 1** says a rare host is worth more than its rarity. Shipped
at 1.5.

---

## The density budgets and the settle pass

Three separate purses, all in tiles per 1000 **land** tiles so a duel map and a
giant map have the same density rather than the same count:

| Budget | Applies to | How |
|--------|-----------|-----|
| `bonusPer1000LandTiles` | bonus resources | scatter |
| `strategicPer1000LandTiles` | strategic resources | scatter |
| `luxuryPer1000LandTiles` | luxuries | **settled after the deal** |

Three purses rather than one split by frequency weight, because they answer
different questions — how often a city site has something worth working, versus
how scarce iron is — and one purse meant retuning either retuned both.

### The scatter (bonus, then strategic)

Per attempt: draw a resource by `frequency` weight, then a candidate tile
uniformly from that resource's own candidate list (the tiles whose terrain,
feature and hills satisfy the row — `resourceData.ts`). Both draws come from the
map rng, so both are reproducible.

A find within `minSpacing` of an *existing* resource is **thrown away rather than
nudged** — rejection sampling keeps placement a pure function of the draw
sequence; a nudge would make it a function of the search order too. A find then
spreads over `clusterSize` tiles that satisfy the same constraints, so horses
arrive as a herd and gems as a single seam. Spacing is measured against every
resource tile *not* in the cluster being grown, which is the whole of "dense
inside, sparse outside".

Attempts are capped at `attemptsPerResource × budget`, so a map whose terrain
cannot hold the budget finishes rather than spinning. Falling short is not an
error; it is what a poor map is.

### The luxury settle pass

`settleLuxuryDensity`. The luxuries are dealt per continent first and the budget
is reconciled *afterwards*, in this order:

1. **Deepen thin seams** — bring every (continent, kind) group up to
   `luxuryMinCopiesPerContinent` where the ground allows. A group of one hex is
   the thing the whole per-continent deal exists to prevent, so this outranks
   being exactly on budget. (Singletons happen even on ground that passed
   `canHost`: the spacing rule refuses a tile that fell next to somebody else's
   find, and a kind dealt late meets a board the earlier kinds took the room out
   of.)
2. **Trim or top up** to the budget, if the total is outside
   `± luxuryDensityTolerance`. A top-up grows a seam beside an existing copy
   first, then anywhere else on the continent the row allows.

The top-up **honours `minSpacing`**, unlike the two start guarantees below. A
guarantee is a promise to a player and outranks an aesthetic; a budget *is* the
aesthetic, so a top-up that shouldered in beside somebody else's find would be
the density pass undoing the thing it exists to tidy. Same-kind tiles are exempt
from the measure — a seam is allowed to touch itself.

---

## Starts: scoring and the fairness guarantees

`src/sim/startPositions.ts`. Contains no numbers at all; every one is in
`starts`.

### The score

`scoreStartSite` returns a **breakdown list** whose fold is the total — the same
discipline as tile yields (CLAUDE.md rule 5), one register out. A site is scored
on **bare ground**: resources and improvements are stripped first, because a
start chosen for a wheat is a start whose quality vanishes the moment the wheat
is a wheat somewhere else.

| Line | Value |
|------|-------|
| Site | `siteYield × centreWeight` |
| Best N tiles | sum of the best `workedTiles` ring tiles, each weighted by its ring |
| Fresh water | `freshwaterBonus` if the site can drink |
| Coast | `coastBonus` if the site is coastal |

A tile's worth is `food × foodWeight + production × productionWeight + gold ×
goldWeight`. How many rings are scored is **the length of `ringWeights`** — a
third ring is a data edit. Only the best `workedTiles` of the neighbourhood count,
not all eighteen: a city works its best tiles first and grows into the rest over
an age, and a score that summed everything rewarded a hex ringed by eleven
mediocre hills over one with six excellent tiles.

### The refusals

Five, in the order a player would say them:

0. the site's landmass is neither the mainland (`minLandmassShare`) nor big
   enough on its own (`minLandmassTiles`) — see
   [Starts: the landmass floor](#starts-the-landmass-floor);
1. the site itself stands on `hostileTerrain`;
2. more than `maxHostileRingShare` of the rings is hostile terrain;
3. more than `maxWaterRingShare` of the rings is water;
4. `ringFood < minRingFood`, or `ringProduction < minRingProduction`.

The two floors are read off **every** workable ring tile, not the scored
`workedTiles` — they are a promise about what the neighbourhood can feed and
build over a whole game, and reading them off a set the score itself ordered
would make them a function of the weights they exist to backstop.

### Spacing and seating

`startSpacing` = `round(spacingFactor × √land)`, clamped to
`[minDistance, maxDistance]` — scaled to the **map**, never to the player count.
That is deliberate and load-bearing: it makes an *n*-player game's starts an exact
prefix of a 12-player game's, which is what lets the resource guarantees below
seat the maximum roster once and have it cover every real game.

Seating is a greedy sweep, best score first, ties by tile index, relaxing spacing
by one when a sweep places nothing — down to `minDistance`, which is what makes
that number mean a *floor* rather than merely a clamp. Still short: the refused
sites are swept too (a start on snow is a bad start; no start is a crash). Still
short: only then does the floor itself give way to 1.

### The three guarantees

The scatter is fair on average and nobody plays an average. So after it, every
possible start (the maximum roster) is checked and each gap filled:

1. a **bonus food** resource within `startFoodRadius`;
2. `startLuxuryKinds` distinct luxuries within `startLuxuryRadius`;
3. one of those kinds standing in a seam of `startLuxuryCopies` tiles — Civ 5's
   region luxury. One lonely wine four hexes off is a curiosity; a seam of two is
   a reason to plant a city on it.

All three **roll no dice**: the tile chosen is the nearest legal one, ties by tile
index, and the luxury chosen prefers the continent's own hand so a guarantee does
not flatten the character the deal just built. That keeps them reproducible
without consuming from the stream, and means they do not shift when the scatter
above them is retuned.

### Water at a start: a soft preference, not a guarantee

The complaint this pass began with was a start with **neither coast nor river**,
and the honest state of it is that fresh water and coast are *strongly preferred*
by the scorer and guaranteed by nothing.

Measured over the maximum roster (twelve possible starts) on fifteen standard
seeds, the share of sites with fresh water **or** coast went **80.0% → 91.7%**:
about two thirds of that came from the water pass itself (twice the rivers, and
oases watering their own neighbourhoods put a quarter of the land within reach of
a drink rather than an eighth) and the rest from raising `freshwaterBonus` 7 → 10
and `coastBonus` 4 → 6.

Those two numbers were swept, and they **plateau**: 10/6 measured best, and 12/7,
14/8, 16/10 and 20/12 all bought nothing further while distorting the rest of the
score. That is the shape of the remaining ~10%, and it says the residue is not a
weighting problem. A start is seated by a greedy sweep at `startSpacing`, so the
last few seats are choosing among whatever is left at that distance; where no
watered site is available, no amount of preferring one conjures it. Closing the
gap properly means a *guarantee* pass — the shape the three resource guarantees
already have — and that is deliberately not built here.

Strategic fairness — "every player can reach iron" — is deliberately **not**
attempted. It is a much stronger claim (about distance through terrain, contested
ground and expansion, not one ring of tiles) and the honest way to hold it is the
AI milestone's scripted-bot harness. Map-driven military asymmetry is a feature
of this design; a start that cannot feed itself is not.

---

## The experimental loop

**`mapgen.html`** (`npm run dev`, then open `/mapgen.html`) generates a whole
game — every capital founded through the real `foundCity` command — and prints
the census, the continent table and the start table beside it. `src/dev/mapReport.ts`
computes all of it from the simulation's own evaluators; the page counts nothing.

Its **Tuning panel** carries the parameters in this document that are visible in
those two surfaces — six groups: Terrain (the two relief shares, the three
feature shares, oasis spacing, the rain shadow), **Water** (the river quota,
`minLength`, `minSpringElevation`, `backtrackSteps` and `lakes.maxSize`),
**Pangaea** (the two shoulder strengths, the core, and the island belt's three
rows), Continents, Resources and Starts. `ridgeBreakStrength` sits in the Terrain
group beside the two relief shares. Floodplains have no row of their own on
purpose: they are derived from the rivers and the oases, so the Water group and
the two oasis rows above it are already the whole of their tuning. Each row shows the JSON's own value in the margin, highlights
itself when you change it, and Generate rebuilds the map with the change applied.
`[` and `]` then fly the camera to each seat's capital in turn so you can look at
what the numbers did; `F` frames the whole map again.

**Copy as JSON** emits only the overridden subset, shaped to paste straight into
`data/mapgen.json` once a tuning is worth keeping.

### How the override seam works

An override is a **sparse edit sheet carried in the game config**, never a write
to the generator's module table:

```ts
createGame({
  seed: 1,
  sizeName: 'standard',
  players: [...],
  mapgenOverrides: { elevation: { mountainShare: 0.16 } },
});
```

`resolveMapgenConfig` (`src/sim/mapgenData.ts`) deep-merges the sheet over
`MAPGEN_CONFIG` and **throws on an unknown key or a mistyped value** — the
failure mode that would otherwise happen is a designer typing `mountainshare`,
seeing nothing change, and concluding the tunable does nothing. Arrays replace
wholesale. An absent or empty sheet returns the module table by identity, so an
ordinary game costs nothing and serialises exactly as it did before the feature.

The sheet also rides on the map (`GameMap.mapgenOverrides`), because the passes
that run *after* generation — the start chooser, the resource guarantees, the
inspection report — are handed a map and nothing else; they ask `mapgenFor(map)`.

The invariant, which is the whole point: **a tuned map is still a legitimate
deterministic `{config, log}`.** Same config and seed, same world, on reload and
on another machine. Held by `test/mapgen/mapgenOverrides.test.ts`.

---

## Every tunable

`data/mapgen.json`, with current defaults. Retired keys live in the file's own
`retired` block with what replaced them — read it as the file's changelog.

### sizes

| Key | Default | Meaning |
|-----|---------|---------|
| `duel` | 40×25 | |
| `standard` | 80×52 | the size the balance is tuned against |
| `large` | 104×64 | |
| `huge` | 128×80 | |
| `giant` | 180×112 | |

### noise

| Key | Default | Meaning |
|-----|---------|---------|
| `elevation.frequency` | 2.6 | continental cycles around the world |
| `elevation.octaves` / `.lacunarity` / `.persistence` | 5 / 2.0 / 0.45 | fbm shape |
| `ridge.cycleTiles` | 21 | tiles per ridge cycle — range spacing, fixed in hexes |
| `ridge.octaves` / `.lacunarity` / `.persistence` | 4 / 2.0 / 0.5 | fbm shape |
| `ridge.offset` / `.gain` | 1.0 / 1.9 | ridged-multifractal shape |
| `moistureRegional.frequency` | 1.9 | wet-country cycles around the world |
| `moistureRegional.octaves` / `.lacunarity` / `.persistence` | 2 / 2.0 / 0.45 | |
| `ridgeBreak.cycleTiles` | 3 | tiles per cycle of the field that gaps the ranges — how often a wall breaks |
| `ridgeBreak.octaves` / `.lacunarity` / `.persistence` | 3 / 2.0 / 0.5 | fbm shape |
| `moistureLocal.cycleTiles` | 8 | tiles per copse-and-clearing cycle |
| `moistureLocal.octaves` / `.lacunarity` / `.persistence` | 3 / 2.0 / 0.5 | |

### elevation

| Key | Default | Meaning |
|-----|---------|---------|
| `seaLevel` | 0.58 | quantile of the continental field below which is sea — so ~58% water. Was 0.62 until 2026-09-03: the island belt takes its land out of the mainland, so raising the world's land is what put the continent back to the footprint it had before the islands |
| `polarWaterLatitude` | 0.94 | latitude above which the ice-cap bonus applies |
| `polarWaterElevationBonus` | 0.12 | how much the poles are lifted, before the sea test |
| `mountainShare` | 0.08 | **share of land** that is mountain (0.10 until 2026-09-03 — the user's own playtest number). A quantile, so lowering it moves hexes into the hill band beneath rather than flattening anything |
| `hillShare` | 0.38 | share of land that is hills — the band below the mountain cut |
| `ridgeWeight` | 1.0 | weight of the ridged crest field in the relief mix |
| `continentWeight` | 0.25 | weight of the continental field — pulls high ground inland |
| `gradientWeight` | 0.12 | weight of continental steepness — hills on escarpments |
| `ridgeSharpness` | 2.0 | power on a crest before the spine bias; higher = thinner ranges |
| `crestlineWeight` | 0.35 | lift for tiles on the crest *line* — line versus wall |
| `spineFloor` | 0.5 | share of its height a crest keeps on the beach |
| `spineNearTiles` | 2 | hexes from water where the spine bias starts to lift |
| `spineFarTiles` | 7 | hexes from water where it is fully lifted |
| `ridgeBreakStrength` | 1.0 | how much of its height a crest loses in the break field's low country — the gaps in a range. `0` skips the pass. See [The broken ridges](#the-broken-ridges) |

### latitude

| Key | Default | Meaning |
|-----|---------|---------|
| `snow` | 0.9 | latitude at or above which land is snow |
| `tundra` | 0.76 | …and tundra |
| `desertMax` | 0.55 | desert only equatorward of this |
| `jungleMax` | 0.24 | jungle only inside this band |
| `forestMin` / `forestMax` | 0.18 / 0.86 | forest only between these |

### moisture

| Key | Default | Meaning |
|-----|---------|---------|
| `desertMax` | 0.28 | moisture rank below which (and inside `latitude.desertMax`) land is desert |
| `plainsMax` | 0.55 | below which land is plains; above, grassland |
| `forestShare` | 0.32 | share of **eligible** ground that gets forest |
| `jungleShare` | 0.20 | the same over the equatorial band's eligible ground |
| `oasisShare` | 0.06 | share of flat, featureless desert that gets an oasis — a ceiling, thinned by the spacing below |
| `oasisSpacing` | 3 | hexes between two oases |
| `regionalWeight` | 1.0 | exponent on the regional layer |
| `localWeight` | 0.55 | exponent on the local layer — below 1, it only breaks regions up |
| `rainShadow.enabled` | true | false skips the pass whole |
| `rainShadow.windDirection` | 3 | hex direction the wind comes *from*; 3 is west |
| `rainShadow.rangeTiles` | 4 | how many hexes downwind of a range stay dry |
| `rainShadow.strength` | 0.45 | moisture removed immediately downwind, tapering to nothing |

### lakes

| Key | Default | Meaning |
|-----|---------|---------|
| `maxSize` | 8 | water bodies of at most this many tiles become lakes |

### pangaea

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | true | false skips the mask whole, restoring the pre-ruling scatter of continents bit for bit |
| `centreColumnShare` | 0.5 | where the continent's meridian sits, as a share of the width |
| `coreShare` | 0.22 | share of a half-extent the mask leaves untouched |
| `eastWestStrength` | 1.2 | how hard the eastern and western rims are pushed under |
| `polarStrength` | 0.12 | the same pole-ward; small on purpose, so the continent keeps its tundra |
| `islandShelfTiles` | 5 | hexes offshore the island belt sits |
| `islandShelfSpread` | 3.0 | how far either side of that the belt reaches (the gaussian's sigma) |
| `islandShelfLift` | 0.32 | height the belt hands back; the dial between no islands and a second continent, and the one that pays for them out of the mainland's margins |
| `shelfChains` | true | run a ribbon of `coast` out to any island the shelf cannot already reach |

### coast

| Key | Default | Meaning |
|-----|---------|---------|
| `rings` | 2 | hex steps of open ocean, BFS-flooded from land, that become `coast` — where embark reach ends, where a fishing boat or a caravel's water begins, and the shelf a trireme hugs. `1` is the pre-2026-08-29 shelf and reproduces it byte for byte (`test/mapgen/resources.slow.test.ts`'s `OLD_FIXTURES`); the ruling raised it to 2 so naval combat has a strip of water worth fighting over |

### rivers

| Key | Default | Meaning |
|-----|---------|---------|
| `countPer1000Tiles` | 14 | river quota, scaled by map area |
| `minCount` | 3 | floor on that quota — a duel map is never riverless |
| `minSpringElevation` | 0.80 | lowest corner altitude a spring may sit at (range ground). Moved with `seaLevel` and the ridge break on 2026-09-03: land elevation runs `seaLevel…1`, so an absolute threshold means a different quantile of the land when either moves. 0.80 is the hill cut — "hill country or above" |
| `minSpringSpacing` | 1 | hexes between springs; 1 means "not the same hex" |
| `minLength` | 4 | traces shorter than this many edges are discarded |
| `maxLength` | 80 | hard cap on one trace |
| `backtrackSteps` | 64 | forks one trace may retry before it is abandoned; 0 is the plain greedy walk |
| `attemptsPerRiver` | 120 | springs examined per river asked for |

### resources

| Key | Default | Meaning |
|-----|---------|---------|
| `continentTargetTiles` | 200 | land tiles one carved continent aims for |
| `minContinentTiles` | 155 | land a component needs to be carved rather than attached; also the band's floor. **Above `0.75 × target` — see the carve's remainder** |
| `luxuryKindsPerContinent` | 4 | kinds in one continent's hand |
| `maxContinentsPerLuxury` | 2 | continents one kind may appear on (relaxes upward if the arithmetic demands) |
| `luxuryCopiesPerKind.min` / `.max` | 3 / 6 | tiles of a dealt kind placed on its continent |
| `luxuryMinCopiesPerContinent` | 2 | tiles a continent must be able to seat before it is dealt a kind; also the seam floor |
| `luxuryPer1000LandTiles` | 75 | luxury density the settle pass reconciles to |
| `luxuryDensityTolerance` | 0.1 | how far the settled total may sit from that budget |
| `luxuryScarcityBias` | 1.5 | exponent on `continents/hosts` in the draw weight; 0 = frequency alone |
| `bonusPer1000LandTiles` | 110 | bonus resource tiles per 1000 land (85 until 2026-08-27 — the playtest wanted a wider, more coastal game) |
| `seaFrequencyMultiplier` | 1.35 | weight on every bonus row whose legal terrain is all water (fish, crabs), drawn out of the same purse by `drawWeighted` — a seventh sea row inherits it |
| `strategicPer1000LandTiles` | 22 | strategic resource tiles per 1000 land |
| `minSpacing` | 2 | minimum hex distance between two different finds |
| `attemptsPerResource` | 12 | draws allowed per budgeted tile before a scatter gives up |
| `startFoodRadius` | 3 | how far from a start a bonus food must be for the guarantee to rest |
| `startLuxuryRadius` | 4 | how far a start's guaranteed luxuries may be |
| `startLuxuryKinds` | 2 | distinct luxury kinds every start is guaranteed |
| `startLuxuryCopies` | 2 | tiles of one of those kinds — the region-luxury seam |

### starts

| Key | Default | Meaning |
|-----|---------|---------|
| `spacingFactor` | 0.55 | × √land, then clamped — start spacing |
| `minDistance` | 5 | clamp floor, and the floor the greedy sweep relaxes to |
| `maxDistance` | 16 | clamp ceiling |
| `ringWeights` | [1.0, 0.55] | what each ring is worth; **its length is how many rings are scored** |
| `workedTiles` | 6 | how many ring tiles are scored — the best this many, not all |
| `centreWeight` | 2.0 | what the site's own tile is worth against a ring tile's 1 |
| `foodWeight` | 1.0 | relative worth of food when scoring ground |
| `productionWeight` | 2.5 | …of production |
| `goldWeight` | 0.3 | …of gold |
| `freshwaterBonus` | 10 | flat bonus for a site on fresh water |
| `coastBonus` | 6 | flat bonus for a coastal site |
| `minRingFood` | 16 | food the workable ring tiles must carry, or the site is refused |
| `minRingProduction` | 11 | production they must carry |
| `hostileTerrain` | desert, tundra, snow | terrain nobody should start on or be surrounded by |
| `maxHostileRingShare` | 0.45 | share of the rings that may be hostile before refusal |
| `maxWaterRingShare` | 0.5 | share of the rings that may be water before refusal |
| `minLandmassShare` | 1.0 | how big a site's landmass must be, × the **largest** landmass; `1` means the mainland, `0` switches this clause off |
| `minLandmassTiles` | 100 | …**or** simply this many contiguous land tiles. The two are an *or*; both at `0` disables the refusal |

---

## Discoveries: the last pass

Ancient ruins and tribal villages (`placeDiscoveries`, `src/sim/discoveryPlacement.ts`;
design ledger Entry XX, retuned 2026-08-25). **The only generation pass whose tunables are
not in `data/mapgen.json`** — they live in `data/discoveries.json`, beside the pool of boons a
site hands over, because "how many ruins are there" and "what does a ruin give you" are one
designer's decision made in one sitting. Halve the payoffs and you will want more of them.

It dresses ground the fields ahead of it have already decided, and it now shares one of
their geographies rather than reading none: sites are **dealt per carved continent**
(`carveContinents`, `src/sim/resources.ts`) — the same regions `dealContinentLuxuries`
reads. Recomputed here rather than threaded through from `placeResources`, because the carve
is a pure function of `(map, config)` and takes no `Rng`, so recomputing it costs the dice
stream nothing.

**It runs last, after `placeResources`**, and that ordering is load-bearing in exactly the
way the rivers' and the resources' are: every draw it makes is a draw nothing before it can
see, so terrain, hills, features, river edges and every resource on a given seed are
bit-identical to what they were before discoveries existed. A pass inserted anywhere
earlier would have moved every wheat field on every map in the game.

**The ground a site may take**: passable land (so no mountains and no sea — a ruin nothing
can walk to is a decoration), carrying **no resource** (a hex already drawing a wheat sheaf
and a reveal marker does not also want broken columns on it), `minDistanceFromStart` from
every start in the **maximum roster's** seating — the same list the resource guarantees use,
because a short roster's starts are a prefix of a full one's — and `minDistanceApart` from
every site already placed, *across both kinds and every continent*, since two ruins four
hexes apart and a ruin four hexes from a village are the same crowding on the board.

One global shuffle decides which legal hexes on a given continent are considered first;
then, continent by continent in id order, a greedy sweep takes whatever still satisfies the
spacing, ruins before villages, up to that continent's own dealt count
(`sitesPerContinent`, drawn per continent from a `{min, max}` range — `dealContinentLuxuries`'s
bargain exactly, including the "the draw happens whether or not the ground can take it" rule
so a continent with no legal ground does not shift every later continent's roll). The counts
are a **ceiling, not a promise** — a continent with room seats every site it was dealt, a
cramped one seats what it has room for, which is `oasisShare`'s bargain exactly.

**The retune's reason, measured**: at a flat rate per 1000 land tiles the whole map read as
one grey average, and measured that way the nearest site to a capital sat 7-16 hexes off —
past what a scout finds early. Dealing per continent instead means every region reads as
having its own ruins nearby.

**The fairness top-up** (`ensureStartDiscoveries`) closes the gap per-continent dealing still
leaves for any *one* start: where fewer than `fairness.minWithinRadius` sites already stand
within `fairness.radius` hexes of a possible start, it plants more on the nearest still-legal
ground — drawn from the very candidate list `minDistanceFromStart` already filtered off
**every** possible start, so that exclusion is never the thing that relaxes. What relaxes
instead is the spacing rule (`ensureStartFood`'s bargain exactly) and, failing even that, the
floor itself: a low-priority candidate start whose whole radius sits inside closer starts'
exclusion zones (measured against the *maximum* roster) simply keeps whatever the deal
already gave it, rather than buying its floor with another seat's capital ring.

### data/discoveries.json → placement

| Key | Default | Meaning |
|-----|---------|---------|
| `sitesPerContinent` | `{min: 7, max: 8}` | sites dealt to one carved continent, before spacing thins it |
| `ruinShare` | 0.55 | share of a continent's dealt sites that are ruins, rounded per continent |
| `minDistanceFromStart` | 6 | how far a site must stand from every possible start |
| `minDistanceApart` | 4 | how far a site must stand from every site already placed |
| `fairness.radius` | 12 | how far from a start the top-up counts sites (a two-scout-reach proxy) |
| `fairness.minWithinRadius` | 3 | sites the top-up guarantees within that radius |

`ruinsPerThousandLand` (5) and `villagesPerThousandLand` (4) are retired — see the file's own
`retired` block, in the same changelog-as-data convention `MapgenConfig.retired` uses.

`offerSize` (3) and the `rows` table in the same file are gameplay rather than generation —
what a claim deals and what each row pays. See design ledger Entry XX.E–F.
