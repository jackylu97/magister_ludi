# Beliefs, rites and consecrations — the master list

Every belief, rite and consecration in one place, tables only — one table per table
in `data/religion.json`. The tables ARE the balance worksheet: edit a cell here, edit
the matching field in the data, and `test/sim/beliefsDocSync.test.ts` fails the build
if the two ever disagree — every live row appears in its own table and every table row
names a live row, retired rows excluded from both sides. Every Effect cell is the
row’s own ratified `text`. The system itself — the tide, the ladder, the clergy, who is
paid — is `docs/religion-v2.md`.

**Axis** — the mark in a belief’s Axis column **is** `BeliefDef.axis`, printed as the
data spells it (`hearth` · `sky` · `stone` · `wild` · `water` · `war` · `road` · `sun` ·
`frost` · `none`). It is a synergy thread and nothing else: it groups the cards on the
belief screen and it feeds the religion’s generated name, and `none` is the neutral
pick, which is most of the good ones. It is never a restriction on what may be drawn.

**Duration** — a rite’s Duration column **is** `RiteDef.duration`, the turns its effects
stand on the town that performed it. A rite is a season and nothing else: there is no
instant half.

**Building** — a consecration is never drafted and never chosen. It is *rolled* when a
cathedral is topped out, and the Building column names the building whose completion
rolls it (`BuildingDef.consecrated`; only the Cathedral carries that marker today).

A row with a struck half carries **†** — in its Effect cell, and in its line under
Notes, where the words after the dagger are what the row does *not* do.

## Pantheon beliefs

Permanent, empire-wide, unconvertible — consecrated off the faith ladder and never
redrafted. The pantheon IS the religion’s identity.

| Belief | Axis | Effect |
|---|---|---|
| Goddess of the Harvest | hearth | +1 food on every hex carrying a bonus resource that pays food. |
| Keeper of the Hearth | hearth | Granaries supply +1 faith. +1 happiness in the capital. |
| Star Readers | sky | +4 science in every city beside a mountain. |
| Keeper of the Calendar | sky | Every 10 turns, you are offered a find from a ruin. A ruin pays once for each age you have reached. |
| The Standing Stones | stone | Monuments supply +1 culture and +1 faith. |
| Ancestor Worship | stone | +1 culture in every city of 4 or more population. +5% culture in every city of 10 or more. |
| Lady of the Hunt | wild | +1 food and +1 gold on every hex with a Camp improvement. Clearing a barbarian camp pays +10 faith. |
| Spirits of the Wood | wild | Clearing a forest or jungle pays +15 faith. +1 culture on every forest hex. |
| River Mother | water | +2 food in every city on fresh water. Those cities' shrines supply +1 happiness. |
| Lord of the Sea | water | +1 production and +1 gold on every hex with a Fishing Boat. |
| God of the Forge | war | Barracks supply +1 production. All your units gain +1 combat strength. |
| Rites of Blood | war | Killing a unit pays +25 faith, once for each age you have reached. |
| Oracle of the Crossroads | road | +3 faith for each ruin you claim. Scouts see one hex further. |
| Sacred Fire | none | +1 faith in every city. |
| Desert Fathers | sun | +1 faith on every desert hex. |
| Winter Mother | frost | +1 food and +1 faith on every tundra hex. |
| The Stone Hoard | stone | +1 culture and +1 faith on every hex with a Mine or Quarry carrying a resource. |
| The Vigil | none | A city keeping a rite gains +10% science and +10% culture while it lasts. |
| Vineyard Rites | hearth | +1 food and +1 culture on every hex with a Plantation. |
| Cult of Heroes | none | +15% renown. |

## Follower beliefs

Drafted at founding, three at most. A follower belief is a fact about a **town**: it
applies city-locally in every city that follows, whoever owns it. A clause that pays an
empire, or that counts the world, belongs in the enhancer pool instead.

| Belief | Axis | Effect |
|---|---|---|
| Cathedrals of the Sky | sky | Temples supply +2 science and +2 culture. |
| Pilgrimage | road | +1 faith for every luxury held by a city that follows. |
| Feast Days | hearth | +1 happiness for every city that follows, and Temples supply +1 happiness. |
| Holy Water | water | +1 food and +1 faith for every city that follows and stands on fresh water. |
| Lamps of the Shrine | sun | +2 science for every city that follows and has a Shrine. |
| Choirs | none | +1 culture for every 4 citizens of a city that follows. |
| Tithe Houses | none | +1 gold for every 3 citizens of a city that follows. |
| The Quiet Hours | frost | +1 faith and +1 culture for every city that follows. |
| Warrior Monks | war | +5 combat strength for units defending a city that follows. |
| Harvest Blessing | hearth | +1 food on every farm worked by a city that follows. |
| Guild of the Faithful | stone | +10% production toward buildings in every city that follows. |
| Common Table | hearth | A city that follows keeps a quarter of its stored food when it grows. |

## Enhancer beliefs

Drawn once the followers’ house is full and Theology is in, two at most. These bend the
tide and pay the **founder** — the empire holding the holy site — which is why the
world-scale counts live here.

| Belief | Axis | Effect |
|---|---|---|
| Reliquaries | stone | +1 culture for every 3 faith you bank each turn. |
| Inquisition | war | A Temple holds off a foreign faith twice as hard. |
| The Long Road | road | Roads and caravans carry 2 more faith to a city. |
| Itinerant Preachers | road | Cities that follow reach 5 hexes further. |
| The Pulse of Bells | sky | A proclamation reaches 4 hexes further and presses 20 faith harder. |
| Ecclesia | stone | Holy sites press 3 harder and pay +3 faith each. |
| Apostles | none | What foreign followers pay you is doubled. |
| Sacred Cartography | water | A caravan carries your faith both ways along its route. |
| Holy Order | war | Knights Templar may be called with faith. They fight as well as your best horse, and better where the faith is kept. |
| Theocratic Mandate | none | Rulers who share your faith owe you for it. · † |
| Congregation | hearth | +1 happiness for every 3 cities in the world that follow, up to 5. |
| Pilgrims' Coin | road | +4 gold for every city in the world that follows. |
| World Church | none | +15% culture for every empire in the world that follows you. |
| The Long Prayer | sun | +1 culture for every 4 citizens in the world who follow you. |
| The Crusade | war | +2 combat strength inside foreign cities that follow your religion. Killing a unit presses your faith on the towns around the field. |

## Rites

A city’s verb, bought with faith, one at a time per town. The tree teaches it and the
bank pays for it; the effects then stand on the town for the Duration column’s turns.

| Rite | Duration | Effect |
|---|---|---|
| Rite of the Harvest | 10 | Every hex this city works that feeds it feeds it one more, while the rite runs. |
| Omen Reading | 10 | Every building standing in this city adds a little learning, while the rite runs. |
| Consecration of the Bounds | 10 | Luxury hexes sing, and this city's bounds walk outward faster, while the rite runs. |
| Blessing of Arms | 10 | This city is harder to storm while the rite runs. |
| Rite of Plenty | 10 | Every hex this city works with a seam in it pays a little coin, while the rite runs. |

## Consecrations

The patron a cathedral is dedicated to when the stones are topped out — rolled, never
chosen, and then a fact about that town for as long as it stands.

| Consecration | Building | Effect |
|---|---|---|
| The Scholars' Crypt | Cathedral | +1 science for every 2 followers in this city. |
| The Choir Loft | Cathedral | +1 culture for every 2 followers in this city. |
| The Treasury of Relics | Cathedral | +3 gold for every faith building in this city. |
| The Masons' Chapel | Cathedral | +10% production toward wonders in this city. |
| The Eternal Flame | Cathedral | +1 faith for every follower in this city. |
| The Green Cathedral | Cathedral | +1 faith and +1 culture on every unimproved hex this city works. |

## Notes and deferred halves (from the data rows)

- **Theocratic Mandate** — There is no diplomacy for a mandate to be made of. † a claim on empires that follow you
- **Blessing of Arms** — The rite holds the walls and nothing else: a soldier standing inside them mends at the ordinary pace.
