# Beliefs, rites and consecrations — the master list

Every belief, rite and consecration in one place, tables only — one table per table
in `data/religion.json`. The tables ARE the balance worksheet: edit a cell here, edit
the matching field in the data, and `test/sim/beliefsDocSync.test.ts` fails the build
if the two ever disagree — every live row appears in its own table and every table row
names a live row, retired rows excluded from both sides. Every Effect cell is the
row’s own ratified `text`. The system itself — the tide, the ladder, the clergy, who is
paid — is `docs/religion-v2.md`.

The game does not print a belief’s `text`. Every surface (the belief hand, the Faith
sheet’s Bonuses tab, the Compendium) prints the describers’ sentences, generated from
the row’s effects (`describeCard`), so a card says the same rule in the game’s own
words. A rite’s `text` is printed on the city screen’s rite rows and in the report after
a rite starts; its Rites tab and Compendium page print the describers’ sentences.
The rows here are the batch B1 spec (`docs/plans/belief-update-2026-11-10.md`).

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
rolls it (`BuildingDef.consecrated`; only the Cathedral carries that marker today). A
withdrawn patron (`retired: true`) is never rolled, and a town that already holds it
keeps it.

A row with a struck half carries **†** — in its Effect cell, and in its line under
Notes, where the words after the dagger are what the row does *not* do.

## Pantheon beliefs

Permanent, empire-wide, unconvertible — consecrated off the faith ladder and never
redrafted. The pantheon IS the religion’s identity.

A hand of gods is drawn from every live row below that the empire does not
already hold. Two empires may hold the same god (batch R2a, 2026-10-28).

| Belief | Axis | Effect |
|---|---|---|
| Goddess of the Harvest | hearth | Bonus resources that give food gain +1 food. |
| Keeper of the Hearth | hearth | Granaries give +2 faith and +1 happiness. |
| Star Readers | sky | +4 science in every town with a mountain in its borders. |
| Keeper of the Calendar | sky | Plantations gain +1 science. |
| The Standing Stones | stone | Monuments give +2 culture and +1 faith. |
| Ancestor Worship | stone | +1 culture for every 4 citizens in a town. |
| Lady of the Hunt | wild | Camps gain +1 food and +1 gold. |
| Spirits of the Wood | wild | Unimproved forest and jungle hexes gain +1 faith and +1 culture. |
| River Mother | water | Towns on fresh water gain +2 food. |
| Lord of the Sea | water | +1 production and +1 gold on every hex with a Fishing Boat. |
| God of the Forge | war | Each military building gives +2 production. |
| Rites of Blood | war | Killing a unit grants faith equal to its strength. |
| Oracle of the Crossroads | road | Scouts and settlers gain +1 movement and +1 sight. |
| Sacred Fire | none | +2 production in every town. |
| Desert Fathers | sun | Desert hexes gain +1 food and +1 faith. |
| Winter Mother | frost | +1 food and +1 faith on every tundra hex. |
| The Stone Hoard | stone | Mines and quarries on a resource gain +1 culture and +1 faith. |
| The Vigil | none | A town keeping a rite gains +15% science and culture. |
| Vineyard Rites | hearth | +1 food and +1 culture on every hex with a Plantation. |
| Cult of Heroes | none | +15% renown. |
| Herd Gods | wild | +1 production and +1 faith on every hex with a Pasture. |
| Patron of Merchants | road | +1 faith and +2 gold for each different luxury you hold. |
| The Muses | none | +1 faith for every 3 culture you make each turn. |

## Follower beliefs

Drafted at founding, three at most. A follower belief is a fact about a **town**: it
applies city-locally in every city that follows, whoever owns it. A clause that pays an
empire, or that counts the world, belongs in the enhancer pool instead.

Four of them open a **faith house**: a building bought with faith and never built,
which may stand only in a town that follows the religion that opened it. The belief
opens the row for whoever owns a following town; the town is where the rule is asked.
`docs/religion-v2.md` §Buildings & wonders has the mechanism, and
`docs/production-costs.md` the price.

- **The Faith house keyword** (batch B1). Minarets, Temple Spires, The Open Kitchen
  and The Eternal Flame print the keyword *Faith house* as their first clause. It is
  read off the belief's own data (`beliefKeyword`, `religionData.ts`): one of its
  effects unlocks a building that is a faith house (`isFaithHouse`, `buildingData.ts`:
  `purchaseOnly`, bought with faith, and `followingOnly`).
- The keyword has a tooltip on hover and on keyboard focus, every time, and a page on
  the Compendium's Concepts shelf (`concept:faithHouse`), as the Order keywords of batch
  DS8 do. The belief's own sentence then says only what it opens and what the house
  gives, so the `text` here does not repeat the word.
- The houses: the Mosque (+3 faith, +2 production, +1 authority) and the Wat (+3
  happiness, +1 faith for every 2 citizens) are unchanged. The Gurdwara pays +3 food,
  +3 faith and +1 science for every 3 citizens. The Dar-e Mehr pays +25% faith in its
  town and no flat faith.

| Belief | Axis | Effect |
|---|---|---|
| Cathedrals of the Sky | sky | Temples supply +2 science and +2 culture. |
| Pilgrimage | road | A town that follows gains +1 faith for every 3 followers. |
| Feast Days | hearth | +1 happiness for every city that follows, and Temples supply +1 happiness. |
| Holy Water | water | Towns that follow and stand on fresh water gain +10% food. |
| Lamps of the Shrine | sun | Shrines in towns that follow give +2 science. |
| Choirs | none | +1 culture for every 4 citizens of a city that follows. |
| Tithe Houses | none | +1 gold for every 3 citizens of a city that follows. |
| The Quiet Hours | frost | In towns that follow, each building that supplies faith gives +2 culture and +1 happiness. |
| Warrior Monks | war | +10 combat strength for units defending a city that follows. |
| Harvest Blessing | hearth | +1 food on every farm worked by a city that follows. |
| Guild of the Faithful | stone | +15% production toward buildings in every town that follows. |
| Common Table | hearth | A city that follows keeps a quarter of its stored food when it grows. |
| Minarets | sky | Unlocks the Mosque: +3 faith, +2 production and +1 authority. |
| Temple Spires | hearth | Unlocks the Wat: +3 happiness, and +1 faith for every 2 citizens. |
| The Open Kitchen | hearth | Unlocks the Gurdwara: +3 food, +3 faith, and +1 science for every 3 citizens. |
| The Eternal Flame | sun | Unlocks the Dar-e Mehr: +25% faith in its town. |
| The Alms Box | none | Towns that follow buy with faith for 20% less. |

## Enhancer beliefs

Drawn once the followers’ house is full and Theology is in, two at most. These bend the
tide and pay the **founder** — the empire holding the holy site — which is why the
world-scale counts live here.

| Belief | Axis | Effect |
|---|---|---|
| Reliquaries | stone | +1 culture for every 3 faith you make each turn. |
| Inquisition | war | Rival religions press your towns with a Temple at half strength. |
| The Long Road | road | Your religion presses 2 harder along roads and trade routes. |
| Itinerant Preachers | road | Towns that follow press your religion 5 hexes further. |
| The Pulse of Bells | sky | A proclamation reaches 4 hexes further and presses 20 faith harder. |
| Ecclesia | stone | Each holy site gives +1 faith for each town in the world that follows your religion. |
| Apostles | none | Apostles cost 30% less faith. |
| Sacred Cartography | water | Your trade routes press your religion at both ends. |
| Holy Order | war | Unlocks Knights Templar, bought with faith. They gain +6 strength in land that follows your religion. |
| Congregation | hearth | +2 faith for every town in the world that follows your religion. |
| Pilgrims' Coin | road | +4 gold for every city in the world that follows. |
| World Church | none | +15% culture for every empire in the world that follows you. |
| The Long Prayer | sun | +1 culture for every 4 citizens in the world who follow you. |
| The Crusade | war | Your units gain +6 strength in foreign land that follows your religion. |
| Marvels of the Faith | none | +5 science and +5 culture for every city in the world that follows you and holds a wonder. |
| The Scriptoria | sky | +1 science for every faith building in a city that follows you. |

## Rites

A city’s verb, bought with faith, one at a time per town (two different rites at once
under The Double Feast, Devotion batch DV8). The tree teaches it and the
bank pays for it; the effects then stand on the town for the Duration column’s turns.
The last four rows are taught by Devotion Orders, not by the tree: Rite of Fasting by
The Fast's charter, Votive Offering while The Votive Gifts is seated, Restoring of the
Host while The Host Restored is seated, and Rite of the Sabbath by The Sabbath Laws'
charter. Votive Offering and Restoring of the Host act once, when the rite is said, and
the town keeps them only as a wait before it may say them again. They are not seasons, so
they do not count as rites started and pay no card that rides a rite started (Devotion
batch DV4).

| Rite | Duration | Effect |
|---|---|---|
| Rite of the Harvest | 10 | Hexes that give food give +1 more. |
| Omen Reading | 10 | +1 science for each building in this town. |
| Consecration of the Bounds | 10 | Luxury hexes gain +1 culture, and this town's borders grow 30% faster. |
| Blessing of Arms | 10 | +10 defence. |
| Rite of Plenty | 10 | Hexes with a resource give +1 gold. |
| Rite of Fasting | 10 | This town does not grow, and gains +1 science and +1 culture for each citizen. |
| Votive Offering | 1 | Spend faith to add that much production to what this town is building. Not wonders. |
| Restoring of the Host | 5 | Heals every unit of yours in land that follows your religion. |
| Rite of the Sabbath | 10 | This town builds nothing, and gains its production as culture. |

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

## Notes and deferred halves (from the data rows)

- **Blessing of Arms** — The rite holds the walls and nothing else: a soldier standing inside them mends at the ordinary pace.

## Withdrawn and held rows (batch B1)

- **Withdrawn** (`retired: true`, kept in the data so a game that names them still
  reads): the enhancer Theocratic Mandate, which never had an effect, and the
  consecration The Green Cathedral, which the cathedral no longer rolls.
- **Held back: Feast Days.** The spec's text is "Rites in a town that follows last 5
  turns longer". The game can lengthen a rite only by a percentage over the whole
  empire (`effectAmplifier riteDuration`, The Octave), read when the rite starts
  (`riteTurnsFor`), which asks no town. A flat step of turns for the towns that follow
  is a shape the game does not have, so the row keeps its effect and text of today.
