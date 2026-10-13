# What a player is trying to do in each age

A card earns its chair by serving what the player is trying to do *now*. Each band is dealt in roughly one age (band 0 ≈ age 1, band 1 ≈ age 2 into early age 3, band 2 ≈ late age 3, band 3 ≈ age 4). Turn ranges are from bot games; see `power-bar.md`.

## What the ages hold (from `data/techs.json`)

- **Age 1** (12 techs): Settler, Worker, Warrior, Scout, Archer, Spearman, War Chariot, Chariot Archer, Trireme. Granary, Monument, Shrine, Library, Lighthouse, and the military Barracks, Palisade, Stable. Cities can be attacked from turn 1; war before Siegecraft is a raid (take a town by storm or not at all). Embarking, pantheon-era rites.
- **Age 2** (9 techs): Phalanx, Swordsman, Bowman, Bireme, War Galley, Trader, Prophet. Market, Temple, High Temple, Amphitheater, Harbour, Garden, Smithy, Heroic Epic, Imperial Throne, and the military Stone Walls and War Hall. **Siegecraft** (an army that surrounds a town starves it), military embarking.
- **Age 3** (14 techs): Legionary, Spear Wall, Horseman, Horse Archer, War Elephant, Catapult, Composite Bowman, Galley, Tower Ship, Fire Ship, Apostle. Courthouse, Aqueduct, Forum, Workshop, Watermill, Town Charter, Public Bath, Cathedral, Caravanserai, and the military Armoury and Shipyard.
- **Age 4** (15 techs): Pikeman, Longswordsman, Crossbowman, Knight, Trebuchet, Fire Lance, Caravel, Carrack, Gun Galley, Inquisitor. University, Observatory, Bank, Bourse, Bazaar, Forge, Printing House, the military Castle, and the Magnum Opus line (the endgame: the builder of the Opus wins).

## Every player, by age

- **Age 1: claim.** Settle three or four towns, survive barbarians, explore (ruins, discoveries), reach the first government around draft 4, find faith before prophets arrive. Culture and production are both scarce; each of 3 chairs is a third of the hand.
- **Age 2: commit.** Choose a plan: first conquest, religion (prophets), trade routes, or growth. Authority and happiness start to bind at five or six towns. Band 1 opens here and runs about a dozen drafts.
- **Age 3: grow into it.** The tall-or-wide step: authority and happiness are the limits (Courthouses, Aqueducts arrive). Big armies cost 80 to 175 hammers a unit against about 15 production a town. Chairs rise from 5 to 8 around turn 126.
- **Age 4: decide the game.** The Magnum Opus race: build it, protect it, or stop whoever is building it. Units cost 180 to 580 hammers; universities and banks multiply the economy. 8 to 11 chairs.

## Dominion

The deck's way to play: the army is the economy (`docs/decks/deck-design.md`). Its currency is units, spent on garrisons, raids and conquest. Its gap is developing its own towns. The user's tempo ruling (2026-10-13): Dominion's economy is mostly up-front, strong now and fading, turned into a war; pay that grows with army size held at peace is avoided.

**Age 1 (band 0): claim and secure.**
- Settle three or four towns without losing them to barbarians: garrisons, strength against barbarians, pay for clearing camps.
- Explore first: scouts, ruins, discoveries.
- Optional early rush: a War Chariot (33) against a Warrior (20) before walls; early-unit production, a payout on the first capture.
- Reach the first government: culture from kills, camps and garrisons.
- Early faith before age 2's prophets: pay on units trained or held.

**Age 2 (band 1, which runs into age 3): the first conquest window.**
- Take a neighbour: Swordsmen and Phalanxes, Siegecraft's starving, Stone Walls for the defender. Cards that shorten a siege or move the army to the front, and payouts that make the first capture count (population kept, buildings kept, a big lump).
- Hold it: authority and happiness bind at five or six towns. Authority from garrisons, cheaper captured towns. A card that keeps one or two more towns is worth 40 to 100 yield a turn.
- Keep the economy running while the army is out: wartime production, upkeep relief, peacetime culture from garrisons.
- The first great general: renown for generals, a general from a goal.

**Age 3 (band 2): the big war, and turning it into provinces.**
- Field an expensive army: a Horseman costs 151 against about 15 production a town. Upgrades, purchases and training speed are tempo.
- Siege the big targets: catapults and war elephants; strength near cities, healing on a capture, siege movement.
- Make conquests productive: Courthouses, Aqueducts and Town Charters arrive. Captured towns that feed the empire, cheaper civic buildings in captured towns.
- The gap: Dominion's own towns lag, so its civic growth comes through captured towns.

**Age 4 (bands 3 and 4): decide the game.**
- The Magnum Opus race: take the builder's towns or guard your own (The Grand Coalition, The Praetorian Guard, capture pay toward your own Opus).
- The decisive army: Knights, Trebuchets, Castles; units cost 400 to 580, so free or cheap units are headline cards.
- A way for Dominion itself to win: holding capitals, or captured towns feeding its own Opus.

## The other decks

Not written yet. When designing for another deck, write its four ages here in the same shape from its section in `docs/decks/deck-design.md` and its sheet, and show the user before relying on it.
