# Luxuries & Bonus Resources — the candidate menu

Working doc (2026-08-23). The effect vocabulary (from the mapgen/luxuries pass):
**local** = city yields in the owning city · **empire** = flat empire yields per unique kind
· **happy+** = extra happiness on top of the base +4 · **prod%** = category production bonus
in the owning city. New kinds fold in as pure `resources.json` rows — no code per kind.
Signature sketches below are starting points, not commitments.

## Land luxuries

*Existing:* gems · silk · wine · spices · salt

| Candidate | Home | Signature sketch |
|---|---|---|
| **Incense** | desert, desert hills | empire 🎵 · revealed by Divination (decided) · faith fuel later |
| **Jade** | grassland hills, riverside | empire 🎵 ("the stone of heaven") |
| **Marble** | hills | prod% buildings — the wonder-builder's luxury |
| **Furs** | forest, tundra forest | local 🪙+🌾 (camp country) |
| **Dyes** | jungle, forest | local 🎵 |
| **Ivory** | plains | prod% units, or local 🪙 (war-and-trade flavor) |
| **Amber** | coastal forest | empire 🪙 (the Baltic road) |
| **Tea** | grassland hills | local 🔬 |
| **Coffee** | jungle hills | local ⚙ |
| **Cotton** | flat grassland, riverside | local 🪙 |
| **Sugar** | jungle, wet flats | local 🌾+🪙 |
| **Olives** | coast-adjacent grassland hills | local 🌾+🪙 (the Mediterranean tree) |
| **Lapis** | desert hills | empire 🎵 — the palette's own stone (ultramarine = ground lapis) |
| **Silver** | hills, tundra hills | local 🪙, bigger than gems' |
| **Honey** | grassland | happy+ (small), local 🌾 |

## Water luxuries — *land with the water milestone (work boats/Sailing)*

| Candidate | Home | Signature sketch |
|---|---|---|
| **Pearls** | coast | local 🎵+🪙 |
| **Coral** | coast (warm) | local 🎵 |
| **Whales** | deep-coast edge | local 🌾+🪙 |
| **Tyrian Murex** | coast | empire 🎵 — the purple itself; the specimen palette's tyrian is this snail |

## Bonus resources

*Existing:* wheat · cattle · deer · fish · stone

| Candidate | Home | Yield sketch |
|---|---|---|
| **Sheep** | hills | 🌾 (pasture target — hills food, rare today) |
| **Rice** | wet grassland, riverside flats | 🌾 (the freshwater-farm synergy crop) |
| **Maize** | plains | 🌾 |
| **Bananas** | jungle | 🌾 (jungle's reason to exist pre-chop) |
| **Copper** | hills | ⚙ (early mine target; bronze flavor) |
| **Clay** | riverside flats | ⚙ (kiln/Earthenware flavor) |
| **Papyrus / Reeds** | riverside flats | 🔬 or 🎵 trickle (the Tablet House's raw material) |
| **Crabs** | coast | 🌾 (water bonus beyond fish) *(water milestone)* |
| **Bison** | plains | 🌾 (camp target on open ground) |

## Strategic (later, for the record)

**Saltpeter** — revealed by Fire Medicine, gates the gunpowder line (Age of Cathedrals).

## Notes

- Every luxury keeps base +4 happiness per unique improved kind; signatures are the variety.
- Regional clustering (a continent leans toward kinds) is the trade-value setup.
- Improvement homes: most land luxuries → plantation or mine/quarry/camp per terrain;
  water kinds need work boats (deferred).

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