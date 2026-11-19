# Cards any leader may draw

The generic Orders, by tier: name, rarity, status, ability and type. They belong to no deck. Every seat may be dealt them, whatever its two decks are. Their rows live in `data/decks/common.json` with an empty `decks` list. The shared cards, which name two decks, are in the same file and are listed on the six deck sheets, not here.

**This sheet is the spec of record for the generic set.** You approved the set on 2026-11-18 with ten comments (`docs/flags.md`, "Generic Orders: a candidate set of changes (2026-11-18)"). The reasoning for each card, your comments, and the build list are in `docs/plans/generic-orders-proposal-2026-11-18.md` (sections 7 and 8 are current). The first build adds the Orders that use current effects. The final set has 39 Orders.

- **How a seat meets them.** On every second draft the third card of the hand is generic. That is 2 looks in Tier 0, 3 in Tier I, 4 in Tier II, 4 in Tier III and 0 to 2 in Tier IV.
- **Status** uses the words of the deck sheets:
  - `add`: a new card, not in the data yet.
  - `modify: tuned` or `modify: reworked`: the row is in the data and changes. The ability shown is the target.
  - `implemented`: in the data, dealt, and plays as written. The data text matches the Ability cell.
- **Type:** the chair the card fits: Military, Economic, Civic or Wildcard. A card fits a chair of its own type or a Wildcard chair, and a Wildcard card fits only a Wildcard chair.
- **Keyword:** Boon (paid once on the draft, no chair), Commission (holds a chair until its goal is met, then pays and leaves), Charter (no chair, unlocks a thing), Scaler (gains each time a thing happens while seated). The card frame prints the keyword, so the ability text does not repeat it.
- **Id:** a label for comments and for the proposal. It is not in the data.
- **Numbers** are first guesses. Your word, 2026-11-18: *"we can fix the numbers later in playtesting if they're too hard."* The numbers I am least sure of are listed under "To tune in playtest".
- **Sync test.** The test in `test/sim/decks/common.test.ts` checks this sheet against the data.

| Tier | Implemented | Modify | Add | All | Common | Uncommon | Rare |
|---|---|---|---|---|---|---|---|
| Tier 0 | 9 | 0 | 0 | 9 | 8 | 0 | 1 |
| Tier I | 7 | 0 | 3 | 10 | 6 | 2 | 2 |
| Tier II | 6 | 0 | 2 | 8 | 4 | 2 | 2 |
| Tier III | 4 | 0 | 4 | 8 | 2 | 4 | 2 |
| Tier IV | 3 | 0 | 1 | 4 | 2 | 1 | 1 |
| **All** | **29** | **0** | **10** | **39** | **22** | **9** | **8** |

**By type** (the chair a card fits):

| Tier | Military | Economic | Civic | Wildcard |
|---|---|---|---|---|
| Tier 0 | 4 | 2 | 3 | 0 |
| Tier I | 0 | 4 | 4 | 2 |
| Tier II | 1 | 2 | 2 | 3 |
| Tier III | 2 | 2 | 2 | 2 |
| Tier IV | 1 | 1 | 1 | 1 |
| **All** | **8** | **11** | **12** | **8** |

## Tier 0

| Card | Rarity | Status | Ability | Type | Keyword | Id |
|---|---|---|---|---|---|---|
| **The Palace School** | common | implemented | Your capital gains +2 science and +2 culture. | Civic |  | G0-1 |
| **The Royal Household** | common | implemented | Your capital gains +3 culture and +2 happiness. | Civic |  | G0-2 |
| **The Home Fields** | common | implemented | Resource tiles in your capital gain +1 food. | Economic |  | G0-3 |
| **First Fruits Feasts** | common | implemented | Improving a resource tile grants 5 culture. | Civic |  | G0-4 |
| **The Marchmen** | common | implemented | Your units gain +3 strength against barbarians. | Military |  | G0-5 |
| **Far Runners** | common | implemented | All your units gain +1 sight. | Military |  | G0-6 |
| **The Threshing Floor** | common | implemented | Your capital gains +1 production for every two citizens. | Economic |  | G0-7 |
| **Light Kit** | rare | implemented | All your units gain +1 movement and +1 sight, and -2 combat strength. | Military |  | G0-8 |
| **The Wagon Trains** | common | implemented | Settlers and workers gain +1 movement. | Military |  | G0-9 |

## Tier I

| Card | Rarity | Status | Ability | Type | Keyword | Id |
|---|---|---|---|---|---|---|
| **Common Festivals** | common | implemented | Every town gains +1 happiness. | Civic |  | G1-1 |
| **The Capital's Example** | common | add | Your other towns build buildings your capital already has 25% faster. | Economic |  | G1-2 |
| **The Hall of Fame** | common | implemented | +30% renown in your capital. | Civic |  | G1-3 |
| **The Gilded Country** | common | add | Every tile that makes at least 1 gold gains 1 more. | Economic |  | G1-4 |
| **Cistern Works** | common | implemented | Unlocks the Cistern: +2 food, and its town counts as standing on fresh water. | Economic | Charter | G1-5 |
| **The Brick Kilns** | uncommon | implemented | Gains +1 science and +1 gold for your empire each time you finish a building, at most +20. | Civic | Scaler | G1-6 |
| **Commission: The Land Register** | uncommon | implemented | Goal: have 30 citizens. Reward: every town gains +2 food and +2 production. | Wildcard | Commission | G1-8 |
| **The Liturgies** | common | implemented | On draft: every town gains production equal to ten times its citizens. | Economic | Boon | G1-9 |
| **The Builders' Lodge** | rare | add | Orders that add yields to buildings pay double. | Wildcard |  | G1-10 |
| **The Founders' Rights** | rare | implemented | +3 authority. Cities you found start with one extra citizen. | Civic |  | G1-11 |

## Tier II

| Card | Rarity | Status | Ability | Type | Keyword | Id |
|---|---|---|---|---|---|---|
| **Local Clerks** | common | implemented | Gain +3 authority. | Civic |  | G2-1 |
| **The Public Peace** | common | implemented | While you are at peace, every town gains +2 food and +1 happiness. | Economic |  | G2-2 |
| **The Town Watch** | common | implemented | Your units gain +5 strength when defending in your territory. | Military |  | G2-3 |
| **The Learned Embassy** | common | implemented | On draft: gain science equal to eight turns of your science. | Civic | Boon | G2-4 |
| **The Royal Annals** | uncommon | implemented | +4% production and gold for each commission you have fulfilled this game, at most +28%. | Economic |  | G2-5 |
| **Commission: The Building Programme** | uncommon | implemented | Goal: finish 12 buildings. Reward: every town gains +10% production. | Wildcard | Commission | G2-6 |
| **The Summer Palace** | rare | add | Cards that pay your capital pay 50% more. | Wildcard |  | G2-7 |
| **The Personal Union** | rare | add | Cards that belong to two decks pay 50% more. | Wildcard |  | G2-8 |

## Tier III

| Card | Rarity | Status | Ability | Type | Keyword | Id |
|---|---|---|---|---|---|---|
| **The Good Years** | rare | add | Your bonus from spare happiness is doubled. | Civic |  | G3-1 |
| **City Watches** | common | implemented | Your towns gain +8 defence. | Military |  | G3-2 |
| **Commission: The Master Plan** | uncommon | implemented | Goal: hold four towns of 20 or more citizens. Reward: +40% production toward the Magnum Opus. | Wildcard | Commission | G3-3 |
| **The General Summons** | uncommon | implemented | On draft: your capital raises up to three of the best melee units you can build. They cost no upkeep. | Military | Boon | G3-4 |
| **The Old Patterns** | uncommon | add | Towns build buildings of earlier ages 40% faster. | Economic |  | G3-6 |
| **The Old Foundations** | common | add | Buildings of the first two ages cost no gold upkeep. | Economic |  | G3-7 |
| **The Long Memory** | rare | add | Your scalers gain twice as much each time. | Wildcard |  | G3-8 |
| **The Office of Works** | uncommon | implemented | On draft: gain a great engineer draft. | Civic | Boon | G3-9 |

## Tier IV

| Card | Rarity | Status | Ability | Type | Keyword | Id |
|---|---|---|---|---|---|---|
| **The Grand Design** | uncommon | implemented | The town raising your Magnum Opus gains +1 production for every two citizens in your empire. | Economic |  | G4-1 |
| **The Last Walls** | common | implemented | The town raising your Magnum Opus gains +15 defence. | Military |  | G4-2 |
| **The Great Raising** | rare | add | On draft: every town finishes what it is building. Not wonders. | Wildcard | Boon | G4-3 |
| **The Settled Realm** | common | implemented | Every town gains +2 happiness. | Civic |  | G4-4 |

## To tune in playtest

| Id | Card | The number |
|---|---|---|
| G0-2 | The Royal Household | +3 culture |
| G1-2 | The Capital's Example | 25% |
| G1-6 | The Brick Kilns | the cap of +20 |
| G1-8 | Commission: The Land Register | 30 citizens; +2 and +2 |
| G1-9 | The Liturgies | ten times |
| G1-11 | The Founders' Rights | +3 |
| G2-1 | Local Clerks | +3 |
| G2-2 | The Public Peace | +2 food, +1 happiness |
| G2-4 | The Learned Embassy | eight turns |
| G2-5 | The Royal Annals | +4%, cap +28% |
| G2-6 | Commission: The Building Programme | 12 buildings; +10% |
| G2-7 | The Summer Palace | 50% |
| G2-8 | The Personal Union | 50% |
| G3-1 | The Good Years | doubled |
| G3-3 | Commission: The Master Plan | four towns of 20; +40% |
| G3-4 | The General Summons | three units |
| G3-8 | The Long Memory | twice |

## Open for your pass

- **The Good Years** needs a multiplier for the positive happiness bonus. The current effect adds the same number of points at both bonus levels.
- **The Summer Palace** needs a card effect that raises payments directed to the capital.
- **The Office of Works** uses the same grant as The Wandering Muse. If a great-person offer is waiting, the game banks the renown needed for the current threshold. After the pending pick raises that threshold, the next offer can require more renown. The later offer follows the normal family rules.

- **Ruled 2026-11-19.** The Summer Palace reads “Cards that pay your capital pay 50% more.” The user said “summer palace pay 50% more is fine.”
- **Ruled 2026-11-18** (your comments on the review page, in your words; proposal, "The user's ruling on this proposal"):
  - The Brick Kilns: *"+1 prod where? lets change to +1 science and +1 gold"*. Both are paid to the empire as a flat sum.
  - The Ever-Normal Granary: *"reject"*. Cut.
  - The Public Peace: *"too strong, +2 food and +1 happiness"*.
  - Commission: The Building Programme: *"12 buildings while slotted or 12 buildings total. if total, this number needs to be higher"*. It counts only while the card is seated, so the number stays 12.
  - Commission: The Master Plan: *"this should be harder, four towns of 20 or more citizens"*. The reward is raised to +40% to match.
  - The Building Trades: *"reject. lets say: boon: gain a great engineer draft"*. It is The Office of Works now.
  - The Wagon Trains (settlers and workers gain +1 movement): *"i like this one"*. Added.
  - The Founders' Rights, The Personal Union, The Long Memory: *"add"*. Added. The Founders' Rights keeps its two effects, as you wrote it.
  - No generic card reads the council, part of the set takes no chair, and generic cards have a type (the three recommendations, approved).
- **Named in this pass:** The Builders' Lodge (your The Builders' Charter; Charter is a keyword now), The Office of Works (the royal office that ran a kingdom's building), The Personal Union (two crowns under one ruler), The Liturgies (the public services a Greek city's rich citizens paid for), The Public Peace (the sworn peace of a realm), The Learned Embassy (a court's mission abroad for books and masters).

## Your rows of 2026-10-12, and what became of them

You wrote 23 cards for Tiers 0 and I on 2026-10-12. Fifteen are in the set. Your words for all 23 are kept here.

**In the set, with a change to your text:**

| Your card | Your text | On the sheet as | Why |
|---|---|---|---|
| Far Runners | All your units gain +1 sight. Claiming a ruin grants +10 culture. | All your units gain +1 sight. | One effect a card. |
| The Wagon Trains | Train settlers 20% faster. Settlers gain +1 movement. | Settlers and workers gain +1 movement. | One effect a card; Expansionist's The Land Hunger gives the settler speed. |
| First Fruits Feasts | Gain +5 culture after improving a resource tile. | Improving a resource tile grants 5 culture. | Wording only. |
| The Marchmen | +3 combat strength against barbarians. | Your units gain +3 strength against barbarians. | Wording only. |
| Common Festivals | +1 happiness in all cities. | Every town gains +1 happiness. | Wording only. |
| The Capital's Example | +15% production toward buildings your capital already has. | Your other towns build buildings your capital already has 25% faster. | The reading on the old sheet, and your 1.5 rule for Tiers I to III. |
| Cistern Works | Unlocks the Cistern: +2 food and +2 faith. A city with one counts as standing on fresh water and gives fresh water to the tiles beside it. | Unlocks the Cistern: +2 food, and its town counts as standing on fresh water. | The Cistern is a building in the data already, and the text follows that row. The Cistern also gives food on worked desert tiles and irrigates the farms its town works. Irrigation applies to farm renewals. The town avoids the dry settlement growth penalty. |
| The Builders' Charter | Orders that add yields to buildings pay double. | The same text, named The Builders' Lodge. | Charter is a keyword now. |

**In the set, unchanged:** The Palace School, The Royal Household, The Home Fields, Light Kit, The Hall of Fame, The Gilded Country, The Founders' Rights.

**Not in the set:**

| Your card | Tier | Your text | Why it is out |
|---|---|---|---|
| Oaths of Office | 0 | +1 faith for each card slotted in your government. | It reads the council, which is Magisterial's since 2026-10-20 (The Prytaneion). |
| The Tool Sheds | 0, rare | Builders you produce gain +1 charge. | Expansionist's Tinkers' Guild is the same card, common, in Tier I. |
| Village Workshops | 0 | +1 production in all cities. | Dominion's The Grain Tribute gives +1 food and +1 production in every city. |
| The Ancient Masons | I | +15% production toward wonders of the first two ages. | Magisterial's The Cornerstone and The Guild of Masons are stronger, and wonders belong to Scientific and Magisterial. |
| Holy Ground | I | Every tile that makes at least 1 faith gains 1 more. | Narrow outside Devotion. It uses the same new shape as The Gilded Country, so it is cheap to add later. |
| Kitchen Gardens | I | Tiles beside a city centre gain +1 food. | An alternate you did not take up. It needs a new hex scope. |
| Rich Lodes | I | Every strategic resource tile supplies one extra copy. | An alternate you did not take up. It depends on the map. |
| The First Minister | I, rare | While slotted, the first card slotted in your government pays double. | It reads the council; Magisterial's The Grand Vizier is this card for the first Economic chair. |

**The common pass's rows of 2026-10-12** (Tiers II to IV, written in the style of yours, not by you). Kept: Local Clerks, The Summer Palace, The Old Foundations, City Watches, The Old Patterns, The Good Years, The Settled Realm, The Last Walls, The Grand Design. Not in the set, with the reason in the proposal's section 3.5: Road Maintenance, Emergency Stores, The Stonecutters, Pleasure Gardens, Harbour Towns, Public Theatres, The Smiths' Guild, The Borough Councils, The Town Registers, Public Hospitals, Common Ledgers, The Bathhouses, Workshop Towns, Mill Races, The State Builders, The Great Towns, The Imperial Works, Close Neighbours, The Great Workshops, The Common Schools, The Royal Quarter, The Forgemasters, The Public Lectures, The Full Cabinet, and The Town Masons (which you rejected as The Building Trades).

## The previous generic Orders

The first build retired 16 of these rows and kept their IDs and effects. It updated Local Clerks and City Watches in place.

| Row | Tier | Previously dealt | Previous text | Result |
|---|---|---|---|---|
| Hearth Stores | 0 | yes | Your capital gains +1 food. | Retired. |
| Common Tools | 0 | no (deferred) | Your capital gains +1 production toward workers and buildings. | Retired. |
| Watchmen | 0 | yes | Friendly combat units gain +2 strength when defending in your territory. | Retired. |
| Resting Camps | 0 | yes | Units that take no action heal 5 more health. | Retired. |
| Local Markets | 0 | yes | Your capital gains +2 gold. | Retired. |
| The Village Scribe | 0 | yes | Your capital gains +1 science. | Retired. |
| Public Gatherings | 0 | yes | Your capital gains +1 culture. | Retired. |
| Household Altars | 0 | yes | Your capital gains +1 faith. | Retired. |
| Boundary Stones | 0 | yes | Cities with a Monument expand their borders 20% faster. | Retired. |
| Public Wells | I | yes | Cities without freshwater gain +2 food. | Retired. |
| Civic Peace | I | yes | Gain +1 empire happiness. | Retired. |
| Road Crews | I | no (deferred) | Workers gain +1 movement when starting on your road. | Retired. |
| Road Maintenance | II | no (deferred) | Road upkeep is reduced by 20%, saving at most 4 gold. | Retired. |
| Emergency Stores | II | no (deferred) | Cities of at most four population gain +1 food and +1 production toward buildings. | Retired. |
| Local Clerks | II | yes | Gain +1 authority capacity. | Updated to +3 authority (G2-1). |
| Public Hospitals | III | yes | Cities of at least eight population gain +1 happiness. | Retired. |
| Common Ledgers | III | yes | Cities with a Market gain +2 science; cities with a Library gain +2 gold. | Retired. |
| City Watches | III | no (deferred) | Your cities gain +4 defence. Garrisoned units heal 5 more. | Updated to +8 defence (G3-2). |
