# Luxuries & Bonus Resources — the as-ratified reference

The ratified table, as built. The candidate menu this file used to be is gone;
what survives of it is the **Revisions** section at the bottom, which is the
user's own text and is the source record — it is quoted, never edited. Everything
above it says what the code actually does with that text, what was approximated
on the way, and what was deferred and why.

Read alongside `data/resources.json` (the table itself), `src/sim/resourceData.ts`
(the vocabulary) and `src/sim/resourceEffects.ts` (the one evaluator).

---

## The shape of a row

A resource is a JSON row and nothing else. It declares where it may sit, what it
puts on its tile, and — for a luxury — a **list of signature effects**:

```jsonc
"gems": {
  "yields": { "food": 0, "production": 0, "gold": 2 },   // on the tile
  "validTerrain": ["grassland", "plains", "tundra"],
  "hills": true,
  "effects": [
    { "kind": "perCityYields", "gold": 2 },                          // base tier
    { "kind": "percentYields", "yield": "gold", "percent": 10, "fromAge": 3 }
  ]
}
```

A list rather than one effect, because the ratified design gives almost every
luxury **two tiers**: what it does from the moment you hold it, and what it does
additionally once your empire reaches Æra III (`fromAge: 3`, gated on
`highestAge`). A locked tier is still *shown* — the hover names it and labels it
"Æra III" — because a payoff a player cannot see is a payoff they cannot plan for.

### Uniqueness, and the one exception

A luxury counts **once per kind**, never once per tile. Two improved jade seams
are one jade in your hands. **Silver and gold break this deliberately**: their
Æra III tiers carry `perCopy: true` and scale with how many tiles you control.
That is marked in the data, in `ResourceEffectModifiers`, in the evaluator, and
here, because a reader who has learnt the uniqueness rule will otherwise be
certain it is a bug.

### The vocabulary

Nine shapes. One evaluator reads all of them; nothing else in the game switches
on `effect.kind`.

| Shape | What it does |
|---|---|
| `perCityYields` | Flat yields in **every** city — or, with `scope`, every coastal one (`"coastal"`) or only the city holding the seam (`"owner"`). |
| `perPopulationYields` | The same, multiplied by each city's population, floored per city. |
| `empireYields` | A flat sum to the empire, once, landing in no city. |
| `extraHappiness` | On top of the flat `perUniqueLuxury`; optionally `per: "city"` or `per: "coastalCity"`. |
| `authoritySupply` | Authority **capacity**, optionally `per: "city"`. Never a discount on what a city costs. |
| `productionBonus` | A percentage of hammers behind one category, in the owning city or (`scope: "empire"`) every city. |
| `percentYields` | A percentage of one yield, empire-wide or in each coastal city. |
| `rulePercent` | A signed percentage on a named rule: `happinessDemand`, `borderCost`, `growthCarryover`. |
| `happinessTierBoost` | Raises the *positive* happiness tiers by percentage points. Amber, and nothing else. |

Every shape may carry `fromAge` and `perCopy`.

**Percentages never compound inside a stage.** Every luxury percentage — a
`percentYields` at any scope, a `productionBonus` at either — is a **city-stage**
modifier (Entry XVII, and the user's 2026-08-24 classification: "in every city"
still *applies* in a city). They sum with each other and with the buildings' into
one per-yield figure, and the happiness and authority tiers — the whole of the
*global* stage today — multiply what that comes to:
`(base + flats) × (1 + Σ city%) × (1 + Σ global%)`, floored once at the very end
(`cityStageSums` in `cities.ts`, `applyStages` in `modifiers.ts`). Three luxuries
at +10% read as +30%, not as 1.1³; a +10% tier over them is worth 13 points of
base, not 10.

`empireYields` and the `"owner"` scope are the two readings the ratified table
does not currently declare: it is **wide everywhere**. Both are kept — they are
the only flat readings a tall empire gets as much out of as a wide one — and both
are held live by an overridden row in `test/resourceEffects.test.ts`.

### Faith

Faith is a **new yield, and it is accumulate-only**. Tiles pay it (incense, jade),
signatures pay it (incense's per-city line), cities collect it, and it lands in
`Player.faithPool` every turn. **Nothing spends it.** The top bar shows the pool
with a candle glyph and its hover card says so out loud: *"The faithful gather.
Their purpose comes later."*

It ships now rather than later because four ratified rows put faith on a *tile*,
so either the yield algebra carries it or those rows ship with their signature
quietly deleted. `TileYield` therefore grew from three voices to six — food,
production, gold, **science, culture, faith** — since the same table also puts
culture on silk and science on tea, coral and reeds. `TileYieldSpec` is the
declaration shape (the three new voices optional); `readTileYield` is the one
door between them.

### Access: how a resource gets into your hands

`openedResource` in `cities.ts` is the single rule, and it has three clauses in
this precedence:

1. **Reveal.** A resource with a `requiresTech` you do not hold is in nobody's
   hands, however it is worked. You cannot supply an army from a thing nobody in
   your empire has a word for. *This binds the improved path too* — a mine dug on
   a hill for its hammers no longer hands over iron before Bronze Working. The
   yield is still paid; only the *supply* is withheld.
2. **Improvement.** The improvement `improvesResource` names is on the tile. No
   technology is asked: an improvement already built keeps paying, so a captured
   pasture works from the turn it changes hands.
3. **The city itself.** A city standing on the seam works it as the improvement
   would — but only once its owner holds the technology that improvement needs. A
   capital founded on gems is worth nothing until Mining; the turn Mining lands,
   the gems appear. Derived every time it is asked: no flag, no schema, no phase.

Ledgers say which: "Gems · mine" against "Gems · city". Holding the same kind
both ways is still **one** holding, and the improved reading wins the label —
it is the more specific fact and the one a pillage can take away.

---

## Approximations

The map has no marsh, no floodplain, and no way to express "riverside" or
"adjacent to X" as a placement rule — the constraint shape is a plain **AND** over
`validTerrain` / `validFeatures` / `hills` (see `resourceData.ts`, and the `deer`
precedent it already documents). Every ratified home that named ground this game
does not have was approximated, and each one is listed here rather than silently
narrowed.

| Ratified home | As placed | Why |
|---|---|---|
| Jade: "grassland, grassland hills, riverside" | grassland, hills either | No riverside filter. Both halves of the ground it named are covered. |
| Cotton: "flat grassland, riverside" | flat grassland | No riverside filter; the flat half is the whole rule. |
| Sugar: "jungle, marsh, desert floodplain" | jungle (grassland/plains) | No marsh, no floodplain — and the constraint is one AND rule, so "jungle **or** desert" cannot be written as one row at all. The jungle half is the one with the most ground. |
| Coffee: "jungle hills" | jungle (grassland/plains) | **Widened 2026-08-24.** The two halves are near-independent on this generator — jungle is a share of a thirteen-row equatorial band, hills are a quantile of relief — so their intersection was about a dozen hexes on a standard map, spread over nine or ten continents. Coffee could not reach a seam of two anywhere and was absent from eleven maps in fifteen. The jungle half is the half that carries the flavour; the hills half was the half that made it a ghost. |
| Olives: "coast-adjacent grassland hills" | grassland hills | No adjacency filter. |
| Amber: "coastal forest, coastal" | forest on grassland/plains/tundra | No adjacency filter; forest is the half that survives. |
| Incense: "desert, desert hills, plains, plains hills" | desert or plains, hills either | Expressed exactly. |
| Whales: "deep-coast edge" | coast | No "coast adjacent to ocean" filter. |
| Tyrian: "coast, tile adjacent to coast" | coast | Same. |
| Clay, reeds: "riverside flats" | flat grassland/plains | No riverside filter. |
| Rice: "wet grassland, riverside flats" | flat grassland | No moisture or riverside filter at placement time. |

Improvement homes were assigned so that nothing is permanently unimprovable —
the salt precedent, read forwards. **Jade is quarried, not mined**, because it
sits on flat ground as often as on hills and a mine needs high ground; **marble
moved to the mine**, because it is hills-only and the mine reaches all of it.
Reeds and bananas are plantation crops; clay is a quarry; copper, tin, silver,
gold and lapis are all hills, so all are mined.

## Frequencies

The scatter's budget (`countPer1000LandTiles`) is unchanged, so the *number* of
resource tiles on a map is what it always was — going from seventeen kinds to
forty-one spreads the same budget wider rather than flooding anything. Weights
were rescaled to hold the old proportions: roughly **50% bonus, 15% strategic,
35% luxury**. Measured on seed 4242: a duel map carries 64 resource tiles across
22 kinds, a standard map 216 across 30.

`luxuryKindsPerRegion` rose from 4 to 6, because a hand of four out of
twenty-five would have made every continent read the same way. The two-distinct-
luxuries-per-start guarantee is untouched and still green.

**Amended 2026-08-24 — the distribution survey.** Both numbers above have since
been superseded and the section is kept for the record. The single scatter purse
is gone (three budgets now: `bonusPer1000LandTiles`, `strategicPer1000LandTiles`
and, new with this pass, `luxuryPer1000LandTiles`), and hands are dealt to carved
continents rather than to landmasses at `luxuryKindsPerContinent` (4). What
changed in *this* pass, all in `data/mapgen.json`:

- **A hand is only dealt what the ground can wear.** A continent must have room
  for `luxuryMinCopiesPerContinent` (2) tiles of a kind before it can be dealt
  it. Dealing a kind onto ground that cannot grow it dealt a blank: the copies
  were never placed, the kind was absent, and the continent's character was a
  kind thinner than the ledger claimed.
- **Scarcity leads the draw** (`luxuryScarcityBias`, 1.5). A kind is weighted by
  its `frequency` times `(continents / continents that can host it)` raised to
  the bias. A wine grows anywhere and will find a home whoever draws it; the two
  continents with jungle are the only place coffee can ever come from, and
  weighting the two alike is how a third of the table came to be missing from
  most maps. Measured over fifteen standard maps, the worst-served kind went from
  absent on eleven maps to absent on four.
- **The total is budgeted.** `luxuryPer1000LandTiles` (75, ±10%) with a
  deterministic trim-or-top-up after the guarantees. The deal alone swung from 65
  to 90 tiles per 1000 land — a 38% swing in how much of the trading half of the
  game exists, decided by how many continents the coastline happened to make. It
  now runs 74.7–81.2.

The two-distinct-luxuries-per-start guarantee is still untouched and still green,
and the budget will not trim a copy inside a start's guarantee radius.

---

## The land luxuries

Each row: what its tile pays · its live signature · its Æra III tier · what is
deferred. "Deferred" means the effect is **not in the data at all** — it waits on
a system this game does not have, and inventing a near-miss shape for it would be
worse than an honest hole.

### Gems — hills
`+2🪙` on tile · **+2🪙 in every city** · Æra III: **+10% gold in every city**.

### Silk — forest on grassland/plains
`+1🎭` on tile · **+1🎭 in every city** · Æra III: **+5% culture in every city**.

### Wine — grassland/plains
`+2🪙` on tile · **+2 happiness** (empire).
*Not re-specced in the Revisions*, so it keeps the signature it shipped with. It
is the table's one bare-`extraHappiness` row.

### Spices — jungle on grassland/plains
`+2🪙` on tile · **+2 authority capacity**.
**Deferred:** Æra III ("connected cities +25% gold, trade routes +10% yield") —
waits on **trade routes and connected cities**, neither of which exists.

### Salt — desert
`+1🌾 +1⚙` on tile · **+10% production toward units in every city** · Æra III:
**+5% food in every city** (the whole harvest, not the surplus — so it feeds
growth *and* the citizens).
**Deferred:** "−10% upkeep on units" — waits on **unit upkeep**, which this game
does not have.

### Incense — desert or plains, hills either
`+2🪙 +1🕯` on tile · **+1🕯 in every city**.
**Deferred:** Æra III ("−10% cost to purchase units with faith") — waits on
**faith spending**, which this pass deliberately does not build.

### Jade — grassland, hills either
`+1⚙ +1🕯` on tile. **No live signature.**
**Deferred:** "+2 faith on production buildings" — waits on a **building
classification** (there is no such thing as a "production building" in
`buildings.json`, and inventing a per-building-class shape for one row is the
one-off hack this pass refused). Æra III ("+1 option when selecting civics") —
waits on **civics**.

### Marble — hills
`+2🪙 +1⚙` on tile · **+15% production toward buildings in every city**.
**The interim, decided:** the ratified line is "+15% production towards wonders",
and there are no wonders. The shipped +15% toward *buildings* is kept as the
stand-in — it is the nearest live thing, it is what the row already did, and
dropping marble to tile yields alone would have made the wonder-builder's luxury
do nothing at all for an unknown number of milestones. What changed is its scope:
it was the owning city's and is now the empire's, matching the ratified table's
shape (every second-bullet line in it is an empire line). Re-point it at wonders
the day they land.
**Deferred:** Æra III ("+4 culture from world wonders in all cities") — **wonders**.

### Furs — forest on tundra/plains/grassland
`+1⚙ +2🪙` on tile · **−10% culture for the next border tile**.
The ratified line is "new tiles cost 10% less culture **and gold**"; tiles cannot
be bought with gold in this game, so the culture half is the whole of it.
**Deferred:** Æra III ("+2 trade route limit") — **trade routes**.

### Dyes — jungle or forest on grassland/plains
`+1🎭 +2🪙` on tile · **+1🎭 in every city** · Æra III: **+5% culture in every
city**. ("Same bonuses as silk", as ratified.)

### Ivory — plains
`+1🌾 +1⚙` on tile. **No live signature.**
**Deferred:** the war elephant (a mounted-line replacement with its own combat
profile) and its Æra III siege bonus — waits on **unique units**, a system this
game does not have. Ivory ships as tile yields and its flat happiness, as the
task directed.

### Amber — forest on grassland/plains/tundra
`+1🪙` on tile · **+1 happiness** (empire) and **+1 happiness per city** ·
Æra III: **the positive happiness tiers rise by 5 percentage points** — M10's
+10%/+20% rungs become +15%/+25% while amber is held.
The boost is applied *after* the tier clamp (it would do nothing at the top rung
otherwise) and only to the **positive** rungs: lifting the malus rungs would
punish an unhappy empire for owning amber.

### Tea — grassland hills
`+1🔬 +2🪙` on tile · **+1🔬 in every city**.
**Deferred:** Æra III ("+3% production per science building in the city") — waits
on a **building classification**, exactly as jade's second bullet does.

### Coffee — jungle on grassland/plains
`+2🪙` on tile · **+1⚙ in every city**.
The hills half of its ratified home was **dropped** (see Approximations): jungle
and hills are near-independent on this generator, so "jungle hills" described
about a dozen hexes on a standard map and coffee was absent from eleven maps in
fifteen.
**Deferred:** Æra III ("production buildings give an extra 50% of their base
yield and +1 science") — **building classification**, plus a multiplier on
building yields that nothing else in the game has.

### Cotton — flat grassland
`+1🌾 +2🪙` on tile · **cities keep 10% of the basket when they grow**.
A rebate on what growing cost, floored, and kept *in addition* to the usual
overflow. `growthCarryover` is the one `rulePercent` whose number is the rate
itself rather than a scaling of a base — an empire without cotton keeps nothing,
so there is no base to scale.
**Deferred:** Æra III ("production buildings give +2 food in each city") —
**building classification**.

### Sugar — jungle on grassland/plains
`+2🪙` on tile · **+1 happiness** (empire) and **+1 happiness per city** ·
Æra III: **−10% happiness demanded per citizen**, which multiplies both the
linear demand and the crowding term.

### Olives — grassland hills
`+2🌾 +1🪙` on tile · **+2🌾 in every city** · Æra III: **+0.5🪙 per citizen in
every city**, floored per city.

### Lapis Lazuli — desert hills
`+3🪙` on tile · **+1🎭 in every city**.
**Deferred:** Æra III ("+10% great people generation") — **great people**.

### Silver — hills
`+3🪙` on tile · **+1🪙 in every city** and **+1 authority per city** ·
Æra III: **+2 authority per copy of silver you control**.
One of the two `perCopy` rows. See the exception above.

### Gold — hills
`+3🪙` on tile · **+1🪙 +1🌾 in every city** and **+1 happiness per city** ·
Æra III: **+2 happiness per copy** and **+2🌾 in every city per copy**.
The other `perCopy` row. The food half of its Æra III tier is the most
aggressive number in the table — the ratified text says "+2 food per copy" with
no scale attached, and cities are the only place food can land — so it is the
first thing to look at in playtesting.

### Honey — flat grassland
`+2🌾 +1🪙` on tile · **+1 happiness per city** · Æra III: **−10% happiness
demanded per citizen**. ("Same bonuses as sugar", as ratified — bullets two and
three; honey's own tile line carries no happiness.)

---

## The sea luxuries — placed, specified, and inert

**All four are switched off, and prominently so.** Pearls, coral, whales and
tyrian murex are on the map, in the data, with both tiers written and tested. No
improvement can be built on water, so **nobody can hold one**: no happiness, no
per-city yields, no signature of any kind fires. Their *tile* yields still pay a
citizen working the coast, which is the same bargain fish has kept since M6.

They land the day work boats do, and the row to change is one line of
`data/improvements.json`. `test/improvements.test.ts` asserts the hole as "water
iff unimproved", so that day the test fails in both directions at once.

### Pearls — coast
`+3🪙` on tile · **+1 happiness per city** · Æra III: **+3🪙 in every coastal
city** and **+3 happiness per coastal city**.

### Coral — coast
`+1🔬 +1🌾` on tile · **+2🔬 in every coastal city** · Æra III: **+20% science in
each coastal city** — a *local* percentage, applied inside each coastal city,
not an empire-cumulative one.

### Whales — coast
`+2🌾 +1🪙` on tile · **+2⚙ in every coastal city** · Æra III: **+5% production
in every coastal city**.
**Deferred:** "fishing boats gain +1 production" — waits on **fishing boats**.

### Tyrian Murex — coast
`+1🌾 +3🪙` on tile. **No live signature.**
**Deferred:** "fishing boats give +1 culture" — **fishing boats**. Æra III
("−10% cost of new civics") — **civics / Statecraft**.

---

## Bonus resources

Pure tile yields, exactly as ratified. The five that already existed were checked
against the list: only **fish** changed (`+1🌾` → `+2🌾`).

| Resource | Yield | Home |
|---|---|---|
| Wheat | +1🌾 | grassland/plains |
| Cattle | +1🌾 | grassland |
| Deer | +1🌾 | forest on grassland/plains/tundra |
| Fish | +2🌾 | coast *(no improvement)* |
| Stone | +1⚙ | plains/desert/tundra |
| Rice | +2🌾 | flat grassland |
| Maize | +1🌾 | flat plains |
| Bananas | +1🌾 | jungle on grassland/plains |
| Copper | +1⚙ +1🪙 | hills |
| Tin | +2🪙 | hills |
| Clay | +1🌾 +1⚙ | flat grassland/plains |
| Reeds | +1🌾 +1🔬 | flat grassland/plains |
| Crabs | +1🌾 +1🪙 | coast *(no improvement)* |
| Bison | +1🌾 | flat plains |

Reeds is the first bonus resource to pay **science** off a tile, which is one of
the three reasons `TileYield` widened.

There is no sheep row: the candidate menu had one, the ratified list does not.

---

## Deferred, gathered

Everything above, in one place, by what it waits on.

| Waits on | Rows |
|---|---|
| Trade routes / connected cities | spices Æra III, furs Æra III |
| Wonders | marble Æra III (and marble's base line, standing in as buildings) |
| Great people | lapis Æra III |
| Civics / Statecraft | jade Æra III, tyrian Æra III |
| Unit upkeep | salt's −10% |
| Faith **spending** | incense Æra III |
| Fishing boats / work boats | whales Æra III (part), tyrian's base line; **and every signature of all four sea luxuries** |
| Unique units | ivory (war elephants, and its Æra III combat tier) |
| A building classification | jade's base line, tea Æra III, coffee Æra III, cotton Æra III |

The last row is the only one where a shape was *considered and refused*. Tagging
buildings with a class (`science`, `production`) and adding two shapes on top of
it — a flat bag per building of a class, and a percentage per building of a class
— would light four rows. It was refused for this pass because coffee's tier also
needs a *multiplier on a building's own yield*, which nothing in the game has, so
the tag would light three and a half rows and leave the fourth deferred anyway.
It is the obvious next extension if these rows are wanted.

---

## Revisions

*(yours — edit away)*
*Existing:* gems · silk · wine · spices · salt

all bonuses are unique i.e. multiple copies don't stack the bonus

gems:
- spawns on hills
- +2 gold on tile
- +2 gold per city
- at age 3: additionally provides +10% gold in all cities 

silk:
- keep current spawn
- +1 culture on tile
- +1 culture per city
- at age 3: additionally provides +5% culture in all cities

spices:
- keep current spawn
- +2 gold on tile
- +2 authority
- at age 3: connected cities provide +25% gold, trade routes increase yield by 10%

salt:
- keep current spawn
- +1 food, +1 production on tile
- +10% production towards units, -10% upkeep on units
- at age 3: +5% food on all cities (all growth, not surplus growth)

Incense:
- desert, desert hills, plains, plains hills
- +2 gold, +1 faith on tile
- +1 faith per city
- at age 3: -10% cost to purchase units with faith

Jade:
- grassland, grassland hills, riverside
- +1 fath, +1 production on tile
- +2 faith on production buildings
- at age 3: gain 1 additional option when selecting civics

Marble:
- hills
- +2 gold, +1 prod on tile
- +15% production towards wonders
- at age 3: +4 culture from world wonders in all cities

Furs:
- forest, tundra forest
- +1 prod, +2 gold on tile
- new tiles cost 10% less culture and gold
- at age 3: gain +2 trade route limit

Dyes:
- jungle, forest
- +1 culture, +2 gold
- same bonuses as silk

Ivory:
- plains
- +1 food, +1 prod
- replaces mounted units line with war elephants (-1 movement, +20% combat strength, + 20% combat strength against mounted units and cities, +30% cost to produce)
- at age 3: siege and mounted units gain 15% combat strength towards cities

Amber:
- coastal forest, coastal
- +1 happiness, +1 gold
- +1 happiness per city
- at age 3: additional 5% bonus for happy cities

Tea:
- grassland hills
- +1 science, +2 gold
- +1 science per city
- at age 3: cities gain 3% production for each science building in the city

Coffee:
- jungle hills
- +2 gold
- +1 prod per city
- at age 3: production buildings give an extra 50% of their base yield and +1 science

Cotton:
- flat grassland, riverside
- +1 food +2 gold
- cities keep 10% of food upon growing
- at age 3: production buildings give +2 food in each city

Sugar:
- jungle, marsh, desert floodplain
- +1 happiness, +2 gold
- +1 happiness per city
- at age 3: happiness cost for population -10%

Olives:
- grassland hills
- +2 food, +1 gold
- +2 food per city
- at age 3: +0.5 gold per population in cities

Lapis:
- desert hills
- +3 gold
- +1 culture per city
- at age 3: +10% great people generation in all cities

Silver:
- hills
- +3 gold on tile
- +1 gold +1 authority per city
- at age 3: gain +2 authority per copy of silver you control

Gold:
- hills
- +3 gold on tile
- +1 gold +1 food +1 happiness per city
- at age 3: gain +2 happiness +2 food per copy of gold you control

Honey:
- grassland
- +2 food, +1 gold
- same bonuses as sugar

Pearls:
- coast
- +3 gold on tile
- +1 happiness per city
- at age 3: +3 gold +3 happiness for each coastal city

Coral:
- coast
- +1 science +1 food
- +2 science for each coastal city
- at age 3: +20% science for each coastal city

Whales:
- deep-coast edge
- +2 food +1 gold
- coastal cities gain +2 production
- at age 3: fishing boats gain +1 production, coastal cities gain +5% production

Tyrian:
- coast, tile adjacent to coast
- +1 food +3 gold
- fishing boats give +1 culture
- at age 3: decrease cost of new civics by 10%


## Bonus resources

wheat: +1 food
cattle: +1 food
deer: +1 food
fish: +2 food
stone: +1 prod
rice: +2 food
maize: +1 food
bananas: +1 food
copper: +1 prod +1 gold
tin: +2 gold
clay: +1 prod +1 food
reeds: +1 food +1 science
crabs: +1 food +1 gold
bison: +1 food