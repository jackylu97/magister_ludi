# Handoff implementation summary

This list covers the implementation work from the November 18 handoff and the related playtest requests. Claude supplied the approved card and leader designs and built the setup, diplomacy and other interface screens. The items below describe the rules, rendering, bots, models and maintenance work in the playtest branch.

Port 5199 now serves save version 251. A fresh game as Alexander reached its first board frame at 2205 × 1189 in Chrome. The release passed the TypeScript checks, the production build and all 12,724 tests in 597 files. The full test run took 10 minutes and 23 seconds with three workers. A sustained 60 FPS during player interaction remains an open target.

## Cards, wonders and people

| System | What changed |
|---|---|
| Generic Orders | Built the approved pool of 39. Added the draft effects, player descriptions and bot prices. A Great Person grant from an Order now has a fallback if an offer is already open or its family is exhausted. The Summer Palace increases card payouts in the capital by 50%. |
| Dominion | Implemented the approved deck pass. Dominion has 82 Orders and 14 Doctrines, including the new Field of Mars rule. |
| Magisterial | Implemented the approved deck pass, including the Paradise Garden and Spirit Way changes. Magisterial has 67 Orders and 17 Doctrines. Wrote Flavour for the eleven new cards. Unit-grant tooltips explain how the game picks the eligible unit. |
| Wonders | Implemented the 34-wonder roster, including eight additions, revised effects and technology requirements, and the retirement of the Water Clock of Su Song. The Great Sphinx grants free draft rerolls. A city that completes the Great Library or the Alhambra while a Great Person offer is open keeps its existing offer and skips the new one. |
| Religion | Founding draws from 59 names grouped by pantheon. |
| Great People | Built the roster of 157 and the approved changes to offers, legacies and renown. A Great Work starts at 4 of its yield. Philosophy and Education each add 2. Five wonders now grant renown to a different family. Deborah remains in the roster. |
| Leaders | Implemented the approved 16-leader roster and unique kits. Eleven leaders join and eight leave active selection. Added the new units, buildings, improvement, start preferences, colors and bot settings. Applied the final rulings on Alexander, Cyrus, Jayavarman VII, Sejong, Lorenzo, Cleopatra and Justinian. |
| City rules | A purchased unit can use a legal neighboring tile when its city is full. The city view distinguishes worked, available and unavailable tiles, shows yields on usable tiles and has an optional dot on each worked tile. |

The reference sheets give each effect, unit and named person. [Generic Orders](../decks/common.md) · [Dominion](../decks/dominion.md) · [Magisterial](../decks/magisterial.md) · [Wonders](../wonders.md) · [Great People](../great-people.md) · [Leaders](../leaders.md)

## Pillaging and models

- Pillaging leaves the improvement on its tile in a damaged state. It supplies no yields, resource access or improvement bonuses. Orders count the tile as unimproved. Repair uses the worker's remaining movement and costs no charge. It restores the original construction date.
- Added seven damaged improvement models. Farms retain their field and enclosure. Ash and embers mark damage, including a version for fishing tiles. Land fires share draw batches and appear on the turn of the raid.
- Built and revised the town and improvement models across four ages. A wonder has a small landmark within its city tile. The Stable is a city building. The shelter on a pasture belongs to the pasture.
- Developed animal-mask and other unit concepts, then used the approved carved spearman as the style reference for a worker, archer and horseman. The four Blender models are review assets. The live unit set still uses the existing pieces. [Model and improvement notes](../art-pass.md)

## Bots and simulation speed

- Unified spectator, arena and regular turns on the same bot command runner. The spectator retains candidates, scores and explanations for each decision. Regular games release those explanations as they record each command.
- Added parallel planning by seat, hardware-based worker limits and planning during the human turn. End Turn can use a current plan. The game checks the board again after a human command and applies the chosen commands in seat order.
- Fixed the purchase step after an earlier seat invalidates part of a plan. The bot now checks its remaining spending opportunities. Fixed the Apostolic Camera's price so projected conversions contribute to future value and only actual foreign followers contribute to current income.
- Reused path, army, garrison and movement calculations where the underlying facts are the same. In a paired purchase comparison, all 191 commands and every spectator explanation matched. Reusing army and garrison readings saved about 26 and 32 ms for five seats on two developed boards.
- Profiled city yields, barbarian movement and standing orders. Avoided repeated building-payment reads and repeated movement work. Ran the 16-seed bot comparison, settler trace, and deck and persona swaps. The card shortlist and less frequent research pricing did not earn a place in the build. Bot strength tuning remains open. [Bot changes and comparisons](bot-performance-and-cleanup-2026-11-19.md)

## Player interaction and rendering

- An accepted move can draw its first walking frame before the empire panels refresh. The Move button also avoids a second panel refresh. A move with no animation updates the panels immediately.
- Shared science totals across the HUD and reused building yield calculations within a read. Reused terrain heights for high-yield lights. Their median rebuild fell from 9.44 to 2.56 ms on the late-game fixture.
- Reused unit badge positions and camera dimensions for pointer picking. Hidden enemy moves skip rebuilding the visible units. Several changes to tile yields in one frame now share a redraw.
- Shared improvement instance data across the three map copies. After a move the renderer updates only the affected improvement regions and reuses unchanged river effects. Open water skips shoreline calculations beyond their reach.
- Removed a duplicate 3D pick when selecting a unit. On the tested Swordsman, the first board update moved from 64–65 ms to about 50 ms. The Routes button now reads two counts directly. Off-screen forest batches can skip a draw after a conservative check for tree sway and shadows. [Matched click and frame measurements](benchmarks/playtest-fps-2026-11-19/unit-selection.json)
- Unit picking now reuses the ground triangle index. When a piece stands in front of the terrain, the game can skip a full triangle search. Across 430 checks the same unit, or empty ground, was picked each time. Fog, a hill in front of a unit and wrapped map copies still affect selection.
- Selection, movement range and attack highlights now build together. Across eight selections, highlight builds fell from 24–25 to 17. The selected units kept identical highlight geometry and colors. [Selection timing](benchmarks/playtest-fps-2026-11-19/selection-highlights.json)
- The first walking unit uses shaders prepared for its water reflection. In two Chrome comparisons on the M4, the first move reached the next draw 39–53 ms sooner. Two of three native WebKit pairs improved. [First-move measurements](benchmarks/playtest-fps-2026-11-19/walking-reflection.json)
- Kept the high-density default at 1.5×. The Display setting offers a 1.25× option. The close-zoom terrain trial stays available for visual review. The Giant WebKit trial stopped during land construction before the texture could be measured. [Renderer audit and measurements](code-and-performance-audit-2026-11-19.md) · [Terrain comparison](close-terrain-trial-2026-11-19.md)

## Saves, maintenance and tests

- A failed save replacement preserves the last successful save. Overlapping writes keep their order. The loaders validate the setup and identify the index of a bad command.
- A contested Great Person redraw is logged and replays correctly. Submitted diplomacy deals own their terms. The Council preview preserves the history of an Order that stays in its chair.
- Startup releases listeners and other resources after a failed attempt. Shared types check both ends of terrain worker messages. Corrected stale comments and tests covering current screen behavior.
- Shared deterministic bot fixtures and a 120-turn duel between tests. Switched large geometry comparisons to direct byte checks. In the matched six-worker core comparison, elapsed time fell from 376 to 207 seconds. The full suite also runs the slow tier. [Test measurements](test-suite-speed-2026-11-19.md)

Great Person ratings and balance tuning remain open. Claude owns leader portraits. Until a portrait is available, the game displays the leader's emblem. The playtest accepts fresh games and version 251 saves. Earlier saves remain in browser storage and the shelf hides them.

Two implementation choices affect the roster. The Ballista Elephant uses its listed strength of 50 for its range-two attack. The generic teal seat color moved from `#1f8a85` to `#208b85` to meet the game's color separation rule against Cyrus. The approved leader colors are in the roster sheet.

## Commerce and Expansionist handoff review

Claude closed both designs at `08852814`. The following counts describe the approved designs. The playtest includes the first deck rules below. Most of the two decks still use their earlier cards. [Handoff](astra-handoff-2026-11-18.md#314-the-commerce-and-expansionist-deck-passes-ready)

| Deck | Deck-specific Orders | Shared Orders | Doctrines | Main change |
|---|---:|---:|---:|---|
| Commerce | 85 | 25 | 15 | Sea tiles, ports, land improvements and purchases give the deck more ways to play. |
| Expansionist | 82 | 17 | 21 | Charters and leaders open unique improvements. Their placement and neighboring tiles determine their value. |

- Both passes use one shared copy of The Founders’ Stores. The Hillforts is shared with Dominion. Update the partner sheets and the single shared row together.
- A purchased unit uses a legal neighboring tile when its city is full. The new gold pricing and recruitment rules for Great People appear below.
- Lumber mills now give +2 production. Pachacuti’s terraces require both a hill and an adjacent mountain.
- The new coastal rule counts a city that owns a coast tile within two hexes. Ship placement, naval attacks and the start of sea routes need to respect the distance from the city to the water. The flag proposes spawning on the nearest owned water tile using a stable tie order.
- Six new improvements need a worker action, an icon and a board model with their data. They are Nazca lines, inuksuk, totem pole, stepwell, hillfort and baray. The bots need to value their charters and choose sites using the neighboring tiles.
- The 16-leader roster already ships. The seven new leader units and the two charter units still use fallback figures. Keshig already uses the painted horse archer. The gallery has a siege elephant study suitable for reviewing the Ballista Elephant.
- Claude’s UI follow-up is the current value on Bought and Paid For, The Votive Accounts and The Makers of Land. Distinct miniature models for each wonder remain an art decision. The existing shared monuments already sit on the city tile.

Read the closing rulings with each build list. The Hillforts is approved, The Fyrd stops at +6 strength, and The Beacons is dealt in both Tiers I and II. [Commerce](commerce-design-pass-2026-11-20.md#the-pass-is-closed-2026-11-20) · [Expansionist](expansionist-design-pass-2026-11-20.md#the-pass-is-closed-2026-11-20)

### First deck rules

These rules first entered the test build at version 250 and now run on port 5199 with the base economy changes.

- The Open Market is a Tier 0 rare Economic Order. It gives a 20% discount on units, buildings, tiles, caravans and Great People bought with gold. A Great Person’s gold price starts at ten times the next renown threshold. The Reliquary displays the quote that the purchase command charges. The card does not grant the ability to buy a Great Person. The faith price stays the same. In a browser game with recruitment unlocked, the Reliquary displayed 1,576 gold for a 197-renown threshold. Clicking the purchase deducted 1,576 and opened a three-name offer.
- Combined discounts stop at 50% on one purchase. A larger individual discount still applies by itself. For example, The Laurion Leases buys a resource tile for a quarter of its price. Adding The Open Market keeps the price at a quarter. Prices use the existing rule that rounds down to whole coins.
- Lumber mills add two production. A worker can build Pachacuti’s terraces only on a hill beside a mountain. The worker preview and the command use the same check.
- One test pins the current save version. The subsystem suites retain their historical minimums and their save, header and replay checks. Updating the version no longer requires copying its history to fifteen test files.

### Base science, culture and unit prices

Save version 251 includes this balance pass and the preceding deck rules. The research cost table keeps its previous values.

| Source or cost | Previous | New |
|---|---|---|
| Science from each citizen | 0.5 | 0.25 |
| Library | 2 science plus 0.5 per citizen | 3 science |
| University | 0.75 science per citizen | 6 science |
| Amphitheater | 2 culture plus 1 per 2 citizens | 4 culture |
| Military production surcharge | 50% | 80% |
| First four workers | 10, 12, 14, 16 production | 14, 18, 22, 26 production |
| First four settlers | 28, 35, 42, 49 production | 36, 45, 54, 63 production |

A city of ten with both science buildings receives 11.5 science from its citizens, Library and University combined, down from 19.5, before other income and modifiers. Ibn al-Haytham doubles an ordinary Library to 6 science. With Cai Lun’s Library bonus as well, the two legacies give that Library 10 science and 2 culture. The Universitas gives a University 12 science at twelve citizens or more and 3 below twelve. Sophocles gives an Amphitheater 5 culture and 1 happiness.

Other recurring sources of science from population keep their own rules.

| Source | Science tied to population |
|---|---|
| Sejong’s Correct Sounds | Each city earns 1 science and 1 culture per 4 citizens. |
| Sankore Madrasa and Museion | Each adds 0.5 science per citizen to its other effects. |
| Alchemical Society, Specularium and Gurdwara | Respectively 1 science per citizen, per 2 citizens and per 3 citizens. |
| The Scribes’ Hall, Examinations of State | A Library city earns 1 science per 4 citizens. A garrisoned city earns 1 science and 1 culture per 3. |
| The Megalopolis and the Rite of Fasting | The first adds 1 science and 1 production per citizen in cities of ten or more. The rite adds science and culture per citizen while growth stops. |
| Mithridatium and Scriptorium of Rupertsberg | Their rows still add 1 and 0.25 science per citizen, respectively. Their leaders are outside the current roster. |

The military surcharge applies to the unit’s price after the size and technology column. A Warrior costs 18 production or 72 gold. A Spearman costs 32 production or 128 gold. Civilian traders and Great People retain their separate rules. [Production costs](../production-costs.md) · [Yields](../yields.md)

### Merchant Princes and recruitment

Merchant Princes now requires the Great Person recruitment ability before it accepts gold. In a browser game before Epic Poetry, the Reliquary disabled the purchase and named the missing research. Sending the command directly left the game state and command log unchanged. After Epic Poetry, the same 197-renown threshold cost 1,576 gold with The Open Market and opened three names. A separate game with the retired recruitment Doctrine prepared in the test produced the same offer size and charge.

### Results from five paired bot games

Across 30 seats, mean science per turn in the Arena fell from 10.89 to 6.15 at turn 50 and from 121.65 to 94.97 at turn 100. Across matched seats, the median change was 17 turns later for Age II and 2 turns later for the first settler built or bought. The first war came 7 turns later in the median game pair. By the end of the runs, 18 of 30 seats had reached Age IV, down from 25.

Three of the five pairs reached turn 150 in both builds. Across those 18 seats, mean units per player, including civilians, changed from 78.06 to 78.39. Median science fell from 611.31 to 483.01, but mean science rose from 1,073.76 to 1,459.11. One player on seed 20260832 reached 15,399.71 science per turn. The study gives the per-seed figures, the science measure and the turn of each victory. [Full balance study](benchmarks/base-economy-2026-11-20.md)

A replay of that seat reproduced the turn-150 reading. It held 30 towns and 293 citizens. Money at Work supplied 85 science to each town and The Curia added 26 more. Together they supplied 3,330 science before percentages. Population supplied 73.25. This interaction explains why lowering the base rate can slow early research while leaving room for a large late-game payout.
