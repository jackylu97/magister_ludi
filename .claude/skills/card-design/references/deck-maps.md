# Deck maps

A deck map lists a deck's **themes** (its materials) and **throughlines** (directions a player can lean into), and places every card on them. Build or update the map before proposing cards for a deck. See SKILL.md, "Themes and throughlines", for why the two axes are kept apart.

A card is noted with: its themes, the throughlines it serves, its role (glue, pay-off, build-defining), the essential it pays (science, culture, production, or none), its band and its shape. These notes live in design docs only, never in the game.

## Dominion

Source: `docs/decks/deck-design.md` (Dominion, its 11 bonus themes) and `docs/decks/dominion.md`. The user's tempo ruling, current-band ruling and principles apply.

### Themes

"Self-producing" means the Dominion playstyle makes this quantity whether or not a card asks for it. Those are the best anchors (high floor). "Saturates" means it stops at one per town.

| Theme | Self-producing? | Notes |
|---|---|---|
| **Great generals and citadels** | Yes: renown from fighting, citadels from generals | The user's example of a theme that serves every throughline. A strong anchor. |
| **Garrisons** | Yes: an army stands in its towns | Saturates at one per town, so it scales with towns, not army size. A steady base; not a build-around on its own. |
| **Units trained or mustered** | Yes | Watch attention: units on the map are chores if the player does not need them. |
| **Kills** | Yes, while fighting (barbarians count) | Includes the early barbarian war. |
| **Barbarian camps** | Yes, from the map, mostly ages 1–2 | Camps respawn: cap anything that pays per camp. |
| **Military buildings** | Mostly: Barracks, walls, Stables, War Hall, Armoury, Castle | Saturates. Flat civic riders lose to civic buildings (tempo ruling). |
| **Captured towns** | Only when a war succeeds | Conquest's anchor from age 2 on. Compounds a leader's lead: watch it. |
| **Mounted units, pastures and strategic resources** | Depends on the map (horses, copper, iron) | Modu Chanyu's theme. Keep the map-dependent share small. |
| **Siege** | When conquering, from age 2 (Siegecraft) | |
| **Pillage** | Only when raiding | Raiders' theme. |
| **Naval force** | Depends on the map | A minor thread. |
| **War and peace** | Every game has both | A state, not a quantity: cards that pay differently in each. |
| **Logistics** (movement, roads, mobility) | No | Mostly rule cards; low synergy. |
| **Upkeep** | Always present for an army | Relief is Dominion's version of an economy card. |
| **War reparations** | Only after a won war | Mostly deferred in the data today. |

### Throughlines

| Throughline | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The garrison state** (holding and peace) | garrisons, citadels, military buildings, war and peace, upkeep | *to fill* | *to fill* | *to fill* |
| **Raising the host** (tempo) | units trained or mustered, early units, levies (with Expansionist), generals | *to fill* | *to fill* | *to fill* |
| **Raiders** (mobility and plunder) | mounted units, pillage, camps, kills | *to fill* | *to fill* | *to fill* |
| **Conquest** (taking and holding towns) | captured towns, siege, kills, generals | *to fill* | *to fill* | *to fill* |

Minor threads: naval force (map-dependent), and the holy war, which mostly belongs to the Dominion + Devotion pair.

### Leaders

| Leader | Decks | Ability points at | Cards behind it today |
|---|---|---|---|
| Emperor Taizong | Dominion, Magisterial | melee strength and movement; garrisoned towns pay happiness and culture | garrison cards (Martial Law, Sword and Plough, The Soldier-Farmers) |
| Modu Chanyu | Dominion, Devotion | mounted movement, pillage pays half again; pastures pay production and faith | The Horse Herds, Horse Lords, Riders of the Steppe, Spoils of War |
| Mithridates VI | Dominion, Expansionist | strength against an empire holding more cities; food on plantations and camps | camps: The Horse Herds. "Against a wider empire" reads no quantity any card raises: no throughline to draft toward yet. |
| Joan of Arc | Dominion, Devotion | kills pay faith and press her faith; strength on her faith's ground | kill cards (Songs of the Fallen, Battle Honours, The Art of War) |

### Cards placed

*Not yet placed.* The next step is to place every live Dominion card and the shared cards naming Dominion on the themes and throughlines above, with role, essential, band and shape, and then run the composition checks from SKILL.md.

## Other decks

Not written yet. Build each from its section in `docs/decks/deck-design.md` and its sheet, in the same shape, and show the user before relying on it.
