# Deck maps

A deck map lists a deck's **materials**, the three or four **themes** it centres on, and its **throughlines** (the combinations a seat can lean into), and places every card on them. Build or update the map before proposing cards for a deck. See SKILL.md, "Materials, themes and the deck map".

**Since 2026-10-20** a deck is designed from a few themes with four roles each, not from finished builds of one loop each (SKILL.md, "A way to play, built from a few themes"). Dominion's section below predates that: its materials table still holds, and its builds are revised with the new method later.

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

Since 2026-10-15 each throughline has a finished build (below), and the sources here are that build's cards. The garrison state became **the drilled legions**, built on unit ranks.

| Throughline | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The drilled legions** (holding and peace) | garrisons, ranks and experience, citadels, generals | a rank earned (Honours of the Legion); ranks earned this game (The Veterans' Roll); garrisons (The Military Frontier) | garrisons (Sword and Plough, Standing Garrisons); a rank earned; ranks earned this game | garrisons (Sword and Plough); ranked garrisons (The Fabricae); Standing Garrisons; Reserve Officers |
| **The endless host** (tempo) | units gained, units lost, levies, war weariness | units gained (The Gathering Host, The Art of War); kills and losses (Songs of the Fallen); units held (The Grand Army) | units gained (The Gathering Host); kills and losses; units lost this game (The Hall of the Slain) | units lost this game (The Hall of the Slain); Reserve Officers; a declaration of war (The Arrière-ban); disbanding into the Opus (The Legions' Labour) |
| **The steppe raiders** (mobility and plunder) | mounted units, pillage, camps, kills, ranks | pillages (The Captive Craftsmen) | kills and camps (The Bards' Praise); pillage (Spoils of War); hexes pillaged this game (The Sagas); a peace after a raiding war (Danegeld) | pastures and camps (The Horse Herds); pillages (The Captive Craftsmen, Spoils of War, The Plunder Trains) |
| **The conqueror** (taking and holding towns) | captured towns, pacification, siege, kills, generals | a town pacified (The Provincial Census); towns captured this game (Spear-won Land); captured towns held (The Annexed Provinces) | captures (Triumphs); razing (The Sack); captured towns held (The Annexed Provinces) | razing (The Sack); towns captured this game (Spear-won Land); captured towns toward the Opus (Imperium) |

Minor threads: naval force (map-dependent; its two cards are among those the user ruled be reworked to serve a build, 2026-10-15), and the holy war, which mostly belongs to the Dominion + Devotion pair.

### Leaders

| Leader | Decks | Ability points at | Cards behind it today |
|---|---|---|---|
| Emperor Taizong | Dominion, Magisterial | melee strength and movement; garrisoned towns pay happiness and culture | garrison cards (Martial Law, Sword and Plough, The Soldier-Farmers) |
| Modu Chanyu | Dominion, Devotion | mounted movement, pillage pays half again; pastures pay production and faith | The Horse Herds, Horse Lords, Riders of the Steppe, Spoils of War |
| Mithridates VI | Dominion, Expansionist | strength against an empire holding more cities; food on plantations and camps | camps: The Horse Herds. "Against a wider empire" reads no quantity any card raises: no throughline to draft toward yet. |
| Joan of Arc | Dominion, Devotion | kills pay faith and press her faith; strength on her faith's ground | kill cards (Songs of the Fallen, Battle Honours, The Art of War) |

### Finished builds

**Approved by the user, 2026-10-15** (*"I like these builds a lot more"*). The reasoning, sizing and turn-by-turn sketches are in `docs/plans/dominion-builds.md`, with the user's rulings at its end. Every card is on the deck sheet, `docs/decks/dominion.md`, which is the spec of record for card text. The user is revising the cards there next, so read the sheet for the current text.

Each build has two versions: an early build of Tier 0 to II cards (eight chairs, with a five-chair core for Tier I), and a late build of Tier III and IV cards plus one or two early scalers (eleven chairs).

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The drilled legions** | garrisons drill → units earn ranks → ranks pay, and win the fights that earn more ranks | a promotion | The Veterans' Roll | Knightly Ransom | the garrison finishers |
| **The endless host** | gain units cheaply → every gain and every loss pays → the pay raises the next wave | a unit gained, a unit lost | The Gathering Host, The Hall of the Slain | Valhalla | The Legions' Labour |
| **The steppe raiders** | ride out → pillage → plunder pays → riders live to earn ranks → they raid deeper | a pillage | The Captive Craftsmen, The Sagas | The Chevauchée | The Horde |
| **The conqueror** | break the walls → take the town → pacify it → it pays for the next siege | a capture, a pacification | Spear-won Land | Pax Romana | Vae Victis, Spolia |

Rulings that shape the builds (2026-10-15):
- Tier IV opens at draft 38, so the long-game layer is reached more often. Capstones still sit in Tier III.
- Elites are a perk of Dominion: drilling is not capped at Veteran.
- The three shape families (ranks and experience, pacification, "this game" counts) are to be built.
- Rule-breaking capstones are wanted, and more of them.
- The Legions' Labour is the host's way to win, and levied units count toward it.
- Cards no build uses are reworked to serve a build, not cut.

**Since then (2026-10-16):** the user's Tier III pass cut Knightly Ransom and reworked Valhalla and The Chevauchée, so three of the capstones above have changed. The sheet, `docs/decks/dominion.md`, is current; this table is not until the builds are revisited.

### Cards placed

The builds doc places each card in one or more builds ("Also fits" under each build, and "Bridges and pivots"). The sheet lists every card by tier with its status. A full placement table (themes, throughlines, role, essential, shape for every card) waits until the user's revision pass settles the list.

## Other decks

Not written yet. Build each from its section in `docs/decks/deck-design.md` and its sheet, in the same shape, and show the user before relying on it. Expansionist's pass started on 2026-10-16: its map, five builds and type sort are being drafted in `docs/plans/expansionist-builds.md`.
