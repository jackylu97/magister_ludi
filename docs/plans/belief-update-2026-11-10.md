# Belief update: the spec of record (2026-11-10, approved 2026-11-11)

This file is what batch B1 is built from. The user reviewed the proposal on the review page (https://claude.ai/artifact/E57VMp4NWRhJrEYDi9C57V), left 15 comments, and then ruled: *"belief page is ready"*. `docs/flags.md` item (jjjjjjj) records the ruling.

## The user's design rules

The user, 2026-11-10: *"Because of how central they are to the devotion deck, they need to be able to scale throughout the game. Each pantheon belief should provide a small bonus early, but with some scaling into the late game with investment. 'camps gain +1 food and +1 gold' is a good example, it gives the player direction for decision making (settle lands with camps, pursue temple of artemis)."* And: *"how i see religion beliefs: these require faith investment, and should offer either scaling bonuses (scales from religion investment, whether thats number of cities, followers, faith generated, etc) or utility that are generally strong but benefit the devotion player most."* And: *"Try to aim for bonuses that feel largely equal in strength (in their situationally advantageous positions). Bonuses that appear earlier and cap earlier should be stronger than bonuses that scale throughout the game. Bonuses that require investment (worship buildings) should give quick bursts of tempo for the cities that purchase them, or be stronger scaling options than bonuses that don't require investment"*.

- A god (a pantheon belief) starts small and grows with a thing the player can collect.
- A follower or enhancer belief grows with the religion, or is a utility that a Devotion seat uses most.
- A belief's text gives its number.
- A belief with no effect leaves the pool.
- A number in a changed row is a first guess.

## Keyword: Faith house

A faith house is a building that is bought with faith, never built, and stands only in a town that follows the religion. The keyword is printed on the belief, and a player can point at it at any time to read the rule, as with the Order keywords of batch DS8. Where a new text below begins "Faith house.", that word is the keyword and the card face prints it; the data text does not repeat it.

## How to read the tables

- A row that is not in a table does not change.
- **cut:** the row gets `retired: true` and keeps its body for saves.
- **reword:** the same effect, new text.
- **simplify:** a clause is removed. The effect list changes to match the new text exactly.
- **change:** a different effect.
- **new:** a new row. The names of the new rows (The Muses, Patron of Merchants, The Alms Box) are placeholders the user accepted for now.
- The Note column is the reason shown to the user. It is not belief text.
- "Your comment" or "Your ruling" marks a row the user wrote. Those rows outrank the rest.
- Rites: only the texts change, to state the numbers the data already has. No rite's effect, cost or length changes.
- Faith houses: the Mosque and the Wat keep their effects of today. The Gurdwara and the Dar-e Mehr change as their rows say.
- If a new text needs an effect shape the game does not have, the batch does not bend a near fit. It keeps the old row and reports it.

## The tables

### Gods

| Row | Mark | Axis or source | New text | Note |
|---|---|---|---|---|
| Patron of Merchants | new | road | +1 faith and +2 gold for each different luxury you hold. | Grows with: luxuries you settle, improve or trade for. No god leaned toward Commerce. |
| The Muses | new | none | +1 faith for every 3 culture you make each turn. | Grows with: culture, which every seat makes and a Magisterial seat makes most. It replaces Lord of Works. Your comment: a wonder is too much investment for what that god paid. |
| Keeper of the Hearth | change | hearth | Granaries give +2 faith and +1 happiness. | Your comment of 2026-11-10. Grows with: Granaries. |
| Star Readers | change | sky | +4 science in every town with a mountain in its borders. | Your comment of 2026-11-10. Grows with: towns you found near mountains. The old text asked for the town to stand beside the mountain. |
| Keeper of the Calendar | change | sky | Plantations gain +1 science. | Your comment of 2026-11-10. Grows with: plantations. Vineyard Rites also pays for plantations, with food and culture. |
| The Standing Stones | change | stone | Monuments give +2 culture and +1 faith. | Grows with: Monuments. It asks for a building, so it pays three yields. |
| Ancestor Worship | change | stone | +1 culture for every 4 citizens in a town. | Grows with: the size of your towns. The old god stopped growing at 10 citizens. |
| Spirits of the Wood | change | wild | Unimproved forest and jungle hexes gain +1 faith and +1 culture. | Grows with: woods you keep. The old god paid you to clear a forest and also paid you to keep it. |
| God of the Forge | change | war | Each military building gives +2 production. | Grows with: Barracks, then every later military building. A flat +2 strength is worth less each age. |
| Rites of Blood | change | war | Killing a unit grants faith equal to its strength. | Grows with: how much you fight, and with the age of the units you fight. It needs no age clause. |
| Oracle of the Crossroads | change | road | Scouts and settlers gain +1 movement and +1 sight. | Your comment of 2026-11-10. A utility for the opening, and for a wide empire all game. |
| Sacred Fire | change | none | +2 production in every town. | Your comment of 2026-11-10. Grows with: towns. |
| Desert Fathers | change | sun | Desert hexes gain +1 food and +1 faith. | Your comment of 2026-11-10. The fresh water rule is out. Grows with: desert you settle. |
| The Vigil | change | none | A town keeping a rite gains +15% science and culture. | Grows with: your towns' own yields. It costs faith every ten turns, so it is larger than a god that costs nothing to keep. |
| Lady of the Hunt | simplify | wild | Camps gain +1 food and +1 gold. | Grows with: camps. Your example of a god that gives direction. The faith for a barbarian camp goes, because "camp" meant two things on one belief. |
| River Mother | simplify | water | Towns on fresh water gain +2 food. | Grows with: towns you found on rivers and lakes. Two effects. The belief keeps one. |
| Goddess of the Harvest | reword | hearth | Bonus resources that give food gain +1 food. | Your comment of 2026-11-10. It stays at +1 food: a map has many food resources, so it is already strong. |
| The Stone Hoard | reword | stone | Mines and quarries on a resource gain +1 culture and +1 faith. | Same effect. |

### Follower beliefs

| Row | Mark | Axis or source | New text | Note |
|---|---|---|---|---|
| The Alms Box | new | none | Towns that follow buy with faith for 20% less. | Your ruling of 2026-11-10: a follower belief, at 20%. |
| Pilgrimage | change | road | A town that follows gains +1 faith for every 3 followers. | Grows with: followers. With Choirs (culture) and Tithe Houses (gold), a religion can now take faith, culture or gold for each follower. |
| Feast Days | change | hearth | Rites in a town that follows last 5 turns longer. | A utility that a Devotion seat uses most. The old belief paid happiness, which is plentiful. The idea is from your September file. |
| Holy Water | change | water | Towns that follow and stand on fresh water gain +10% food. | A percentage grows with the town. The old +1 food and +1 faith did not. |
| The Quiet Hours | change | frost | In towns that follow, each building that supplies faith gives +2 culture and +1 happiness. | Your comment of 2026-11-10. Grows with: Shrines, Temples, Cathedrals and faith houses. |
| Guild of the Faithful | change | stone | +15% production toward buildings in every town that follows. | A first guess at a size nearer the other beliefs. |
| The Open Kitchen | change | hearth | Faith house. Unlocks the Gurdwara: +3 food, +3 faith, and +1 science for every 3 citizens. | Your comment of 2026-11-10. The science now grows with the town. |
| The Eternal Flame | change | sun | Faith house. Unlocks the Dar-e Mehr: +25% faith in its town. | One percentage, large enough to matter in a town with Temples. |
| Lamps of the Shrine | reword | sun | Shrines in towns that follow give +2 science. | Same effect. |
| Minarets | reword | sky | Faith house. Unlocks the Mosque: +3 faith, +2 production and +1 authority. | Your comment of 2026-11-10. Back to its effect of today. Your words: the Mosque has the identity of adding authority. |
| Temple Spires | reword | hearth | Faith house. Unlocks the Wat: +3 happiness, and +1 faith for every 2 citizens. | Your comment of 2026-11-10. Back to its effect of today. |

### Enhancer beliefs

| Row | Mark | Axis or source | New text | Note |
|---|---|---|---|---|
| Ecclesia | change | stone | Each holy site gives +1 faith for each town in the world that follows your religion. | Your comment: a seat has too few holy sites for +3 faith each to matter. This grows with two investments at once, the sites and the spread. |
| Apostles | change | none | Apostles cost 30% less faith. | The old belief doubled a payment of 1 faith for each foreign town, which is too small to feel. Pilgrims' Coin is the belief that pays for foreign towns. |
| Congregation | change | hearth | +2 faith for every town in the world that follows your religion. | The old belief paid happiness and stopped at 5. This is the faith belief beside Pilgrims' Coin (gold) and The Long Prayer (culture). |
| The Crusade | simplify | war | Your units gain +6 strength in foreign land that follows your religion. | Two effects. The belief keeps one. The Doctrine The Martyr's Crown is the belief that presses your religion from a battle. |
| Reliquaries | reword | stone | +1 culture for every 3 faith you make each turn. | Same effect. The Devotion Doctrine The Theoric Fund has the same line, so the two add up. |
| Inquisition | reword | war | Rival religions press your towns with a Temple at half strength. | Same effect. The text now gives the number. Today a Temple lets through 75%. |
| The Long Road | reword | road | Your religion presses 2 harder along roads and trade routes. | Same effect. |
| Itinerant Preachers | reword | road | Towns that follow press your religion 5 hexes further. | Same effect. |
| Sacred Cartography | reword | water | Your trade routes press your religion at both ends. | Same effect. |
| Holy Order | reword | war | Unlocks Knights Templar, bought with faith. They gain +6 strength in land that follows your religion. | Same effect. The text now gives the number. |
| Theocratic Mandate | cut | none |  | The row has no effect today. Its text promises a claim on other empires, and the game has no diplomacy to make that from. |

### Rites

| Row | Mark | Axis or source | New text | Note |
|---|---|---|---|---|
| Rite of the Harvest | reword | from a technology · 10 turns | Hexes that give food give +1 more. | Same effect. The text now gives the number. |
| Omen Reading | reword | from a technology · 10 turns | +1 science for each building in this town. | Same effect. The text now gives the number. |
| Consecration of the Bounds | reword | from a technology · 10 turns | Luxury hexes gain +1 culture, and this town's borders grow 30% faster. | Same effect. The text now gives the number. |
| Blessing of Arms | reword | from a technology · 10 turns | +10 defence. | Same effect. The text now gives the number. |
| Rite of Plenty | reword | from a technology · 10 turns | Hexes with a resource give +1 gold. | Same effect. The text now gives the number. |
| Rite of Fasting | reword | from an Order · 10 turns | This town does not grow, and gains +1 science and +1 culture for each citizen. | Same effect. The text now gives the number. |
| Votive Offering | reword | from an Order · 1 turn | Spend faith to add that much production to what this town is building. Not wonders. | Same effect. |
| Restoring of the Host | reword | from an Order · 5 turns | Heals every unit of yours in land that follows your religion. | Same effect. |
| Rite of the Sabbath | reword | from an Order · 10 turns | This town builds nothing, and gains its production as culture. | Same effect. |

### Consecrations

| Row | Mark | Axis or source | New text | Note |
|---|---|---|---|---|
| The Green Cathedral | cut |  |  | Your comment of 2026-11-10. |
