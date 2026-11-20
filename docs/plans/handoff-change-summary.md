# Handoff implementation summary

This list covers the implementation work from the November 18 handoff and the related playtest requests. Claude supplied the approved card and leader designs and built the setup, diplomacy and other interface screens. The items below describe the rules, rendering, bots, models and maintenance work in the playtest branch.

The release passed the TypeScript checks, the production build and all 12,709 tests in 597 files. The full test run took 12 minutes and 3 seconds with three workers. A sustained 60 FPS during player interaction remains an open target.

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

Great Person ratings and balance tuning remain open. Claude owns leader portraits. Until a portrait is available, the game displays the leader's emblem. The schema 249 build requires a fresh game or a save from that rules version. The shelf hides saves from version 248. Updating the build leaves their stored data in place.

Two implementation choices affect the roster. The Ballista Elephant uses its listed strength of 50 for its range-two attack. The generic teal seat color moved from `#1f8a85` to `#208b85` to meet the game's color separation rule against Cyrus. The approved leader colors are in the roster sheet.
