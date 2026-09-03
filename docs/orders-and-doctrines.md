# Orders and Doctrines — the master list

Every Order, Doctrine and government in one place, tables only. **Regenerated from
`data/statecraft.json` 2026-09-02** — the Effect column is each row's own ratified `text`;
counts and tiers are the data's (pools: Chiefdom 13 · Gov I 34 · Gov II 35 · Gov III 33;
doctrine tiers ride the ladder 4/10/18/29/45). Edit here; the two working docs (`deprecated/statecraft-cards.md`, `deprecated/statecraft-ages-3-5.md`) keep the commentary and are no longer the source. Tier: ● defining · ◆ strong · ○ situational (blank = not yet tiered).

**As built, 2026-08-28 (second pass)** — six of those halves are built and the shapes are
generic:

- **Tyranny** *(−30% unit maintenance)* and **The Standing Army** *(no upkeep at all)* — the
  eighth `CardRule`, `unitUpkeep`, folded as its **own labelled line** in
  `explainEmpireGold` beside the gross payroll (`explainUnitUpkeepRebate`). The gross list
  stays gross, so the creditors' disband choice is the same under every government.
- **The Curia** *(faith buildings supply science equal to their faith)* — `mirrorYield`,
  read in `cityYields` off the buildings' own category and their own faith, never the town's
  total. A **flat** line, so it lands before Entry XVII's percentages.
- **The Commonwealth** and **The Magisterium** *(great people bought with gold / faith)* —
  a great person is still **called**: what is for sale is the *recruitment*. The new
  `purchaseGreatPersonOffer { playerId, currency }` charges the bank and pours the remaining
  renown through `settleRenownWindfall`, so there is one draft path and `chooseGreatPerson`
  still answers. Gated by `actionRule` `buyGreatPersonWithGold` / `…WithFaith`; priced at
  `rules.greatPeople.offerPriceGold` (300💰) / `offerPriceFaith` (150🕯).
- **The Commonwealth** *(great-person improvements pay +50% more)* — `tileYield.percent`
  plus `TileCondition.greatWork`, read in `explainTileYield` as one more labelled line
  computed off the **improvement's own** entries. It never multiplies the terrain, the river
  or another card.
- **The Empire** *(capturing a city with a wonder heals all your units)* —
  `WindfallOccasionFacts.capturedWonder` (read before the town changes hands, which is the
  only moment anything still knows) and `WindfallGrantSpec.healAll`.
- **The Encyclopaedia** *(science buildings cost −50%)* — `productionBonus.buildingCategory`,
  read off `BuildingDef.category`, so a second science building is a JSON row.
- **The Grand Tour II** *(+1🎵 per wonder in the world, seen or not)* —
  `CountKind.worldWonders`, off `GameState.wonders`: the claim register is the one place a
  wonder is written down and never moves, so there is no fog clause to get wrong.
- **The Academy of Deeds** *(every Triumph pays its renown twice over)* —
  `AmplifierTarget.triumphRenown`, folded into the printed figure in `awardTriumph` before
  `settleRenownWindfall` banks it, so the annal and the pool are one number.

**A deferred half still stands on**, and each waits on a system the game does not have: The
Curia (the Cathedral) · The Academy of Deeds' second half (a missed Triumph is closed for
good — reopening one is a change to `awardTriumph`'s `perAge` register) · The Sea Charter
(the Harbour) · The Renaissance Court (nothing makes a legacy stronger) · Cuius Regio (two) ·
Absolutism (an extra Order office is a change to a *layout*, not a number) · Blitz (both) ·
The Philosopher's Stone (both) · The Levée en Masse (nothing happens when a border is
crossed) · Pax Magistri (no war to declare) · Religious Mandate (diplomacy) · The Great
Warring Tribes (the courthouse).

## Themes (the archetype lines)

| Line | Playstyle | Ideas |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy |  |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates |  |
| 🌱 **The Green Belt** | tall growth |  |
| ⚒ **The Forge Levy** | wide production, war |  |
| ✶ **The Star Chart** | science |  |
| 🕯 **The Procession** | faith engine |  |
| 🧭 **The Wayfarers** | exploration |  |
| 🏛 **The Marble Court** | wonders, renown, great people |  |
| ⚓ **The Tide** | trade routes, the sea, coastal empire |  |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle |  |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work |  |
| ☽ **The Cloister** | spiritualism — faith + science |  |
| 📜 **The Charter** | expansionist — wide cities → authority → more settling |  |
| 🌾 **The Ploughshare** | agrarian — stacking yields on farms |  |
| ⛰ **The Highlands** | mountains — hills and mountain bonuses |  |

## Governments

| Tier | Government | Slots M/E/W | Signature |
|---|---|---|---|
| 0 | Chiefdom | 1/1/1 | — |
| 4 | Council of Elders | 0/2/3 | +3 happiness · +1 renown per turn per city |
|  | Priest-King | 1/2/2 | +2🕯 per city |
|  | War Chief | 3/1/1 | +1 combat strength per 2 cities you hold (max +3) · killing a unit grants +5🔬 and +5🎵 per slotted Order |
| 10 | Republic | 1/3/3 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 1/2/4 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a tenth of the rate. |
|  | Tyranny | 3/1/3 | +3 authority capacity. Pillaging pays +50%. |
| 18 | Divine Mandate | 3/3/5 | happiness tiers +5pp · +1🎵 per 5🕯 gained per turn |
|  | Imperium | 5/3/3 | +3 authority capacity. All units +1 movement. |
|  | Merchant League | 2/5/4 | +1 gold for each building that produces gold. Trade routes pay 50% more. |
| 29 | The Curia | 4/4/5 | +3 faith for each Cathedral. Faith buildings supply science equal to their faith. · †deferred |
|  | The Estates | 3/5/5 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 6/3/4 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 3/7/6 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 7/4/5 | +6 authority capacity. +1 combat strength for each great general you have earned this game. |
|  | The Magisterium | 4/5/7 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

## Doctrines

### Pool I (tier 4)

| Doctrine | Line | Effect |
|---|---|---|
| The Hermit Crown | 🌱 | While you hold at most 4 cities: +30% to every yield in your capital. |
| River Kings | 🌱 | +30% food in every city on fresh water; −10% food and −10% production in every city without it. |
| The Woodwrights | ⚒ | Clearing a forest or jungle pays +100% and grants +10 culture. |
| The Great Litany | 🕯 | +1 culture for each 3 faith you gain per turn. |
| Wolf-Mother's Pact | 🏹 | Barbarians never attack you and never steal from you. A barbarian you kill joins you instead of dying. You can no longer clear a barbarian camp. |
| Athenaeum of the Road | 🧭 | A ruin you claim pays every option instead of one. |
| The Founders' Road | — | Your first 5 cities are founded with a free Monument, and new cities are joined to your nearest city by road. · †deferred |

### Pool II (tier 10)

| Doctrine | Line | Effect |
|---|---|---|
| Thalassocracy | 🐫 | +20% gold and +20% culture in every coastal city · a coastal city costs 1 less authority. |
| Mountain Hold | ⚒ | +15% production in every city beside a mountain · +5 city defence there. · †deferred |
| The Burning Way | ⚒ | Clearing a forest or jungle costs no worker charge. · †deferred |
| Bread and Circuses | 🌱 | While your authority is positive: +3 happiness in every city. −1 gold in every city, always. |
| The Tithe | 🕯 | +1 gold for each faith you gain per turn. |
| Divine Inspiration | 🕯 | +1% science and +1% culture for each 200 banked faith. |
| The Gentle Yoke | 🌱 | −20% happiness demanded per citizen · every new city costs 3 more authority. |
| The Scattered Hearths | 🌱 | The first 3 citizens in every city demand no happiness · −4 happiness in your capital. |
| The Great Warring Tribes | ⚒ | Negative authority no longer slows production toward units · +10% production toward mounted units · captured cities pay +5 science and +5 culture. |

### Pool III (tier 18)

| Doctrine | Line | Effect |
|---|---|---|
| The Iron Price | ⚒ | Killing a unit grants +15 culture · pillaging pays +15 gold. |
| Manifest of the Steppe | — | Settlers cost 40% less to train and have +2 movement · every city demands +1 happiness. |
| The Gilded Court | 🐫 | Unlocks the Gilded Hall, a building that is bought with gold and never built. +1 science and culture on all tiles that yield gold. +1 authority |
| The Grand Bazaar | 🐫 | Happiness from unique luxuries +50%. A second or later copy of a luxury pays 30% of its bonus instead of nothing. +2 gold for each unique luxury. |
| Master of Maps | 🧭 | All units +1 sight and +1 movement · all units −2 combat strength. |
| Hegemony | ⚒ | +1 authority capacity for each city you hold · a captured city costs one less authority. |
| Pax Imperia | 🌱 | +3 happiness and +3 culture in every city of 8 or more population. |
| The Wandering Court | 🌱 | −15% to every yield in your capital · +3 food, production, science, culture and faith, and +3 happiness, in every city but your capital. |

### Pool IV (tier 29)

| Doctrine | Line | Effect |
|---|---|---|
| The Academy | — | -10% culture, +20% science. Can purchase great scholar drafts with faith (1000 faith) |
| The Standing Army | ⚒ | +1 authority capacity for each 5 units you have in the field. −1 happiness in every city. Units cost no upkeep. |
| The Sea Charter | 🐫 | Trade routes pay 50% more. Every coastal city is founded with a Harbour. · †deferred |
| The Renaissance Court | — | Great-person offers show one more card. Every great person's legacy is 50% stronger. · †deferred |
| Cuius Regio | 🕯 | In cities that follow your religion, 15% of your faith yield is converted into science |
| The Yeomanry | 🌱 | +1 production on every hex with a Farm. Cities of 10 or more population −1 happiness. |
| Absolutism | — | +6 authority capacity. A newly placed Order is locked for 10 turns instead of 5. · †deferred |

### Pool V (tier 45)

| Doctrine | Line | Effect |
|---|---|---|
| Blitz | ⚒ | Units that kill may move again that turn. Units cannot fortify. · †deferred |
| The Philosopher's Stone | — | The Great Work costs −25% production. Every Distillery pays +5 gold. · †deferred |
| The Grand Tour | — | +3 renown per turn for each wonder you hold. +1 culture for each wonder in the world, seen or not. |
| Mare Nostrum | 🐫 | +1 food and +1 gold on every water hex you own. Coastal cities cost no authority. |
| The Levée en Masse | ⚒ | When an enemy unit enters your borders, every city with a Barracks musters a militia unit (at most once every 10 turns). · †deferred |
| Pax Magistri | 🌱 | +3 happiness in every city. +5 science and +5 culture in every city of 12 or more population. · †deferred |
| The Encyclopaedia | ✶ | +1 science for each building in a city. Science buildings cost −50% production. |
| The Triumphal Way | ⚒ | Capturing a city grants +5 happiness in every city for 10 turns. |

### Parked (tier 0 — offered in no pool)

| Doctrine | Waits on | Effect |
|---|---|---|
| Religious Mandate | permanent war with empires of another faith; your cities cannot be converted; a powerful bonus toward the domination and religious beads | Permanent war with empires of a different majority religion · your cities cannot be converted. |
| The Closed Realm | your happiness is held at +5 whatever your cities ask for; your units cannot attack outside your own territory | Your happiness is fixed at +5, always · your units cannot attack outside your territory. |

## Orders

**Rarity** (proposed 2026-08-29, not yet built — the user finalises the marks first): ● common ·
◆ uncommon · ○ rare. Read by the draw as a *weight, never a restriction* — proposed 4 · 2 · 1 —
so a rare comes round about a third as often as a common and a hand of three still holds one
roughly two drafts in five. The marks below are a first assignment for the user to cut: ● is a
flat number, ◆ pays for doing something, ○ changes a rule. The decline rule (a passed card's
weight halves for twenty turns) is the other half of the repeat fix and is in
`docs/orders-candidates.md`.

RULING: orders can only be deepened up to level 3. Some cannot be upgraded, will note them.

### Chiefdom pool (13)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| Blooded Spears | M | 🏹 | ● | +1 combat strength, and +2 more against barbarians. | upgrade: +1 strength towards barbarians
| Camp Followers | M | 🏹 | ◆ | Clearing a barbarian camp grants +25 food and a random military unit. | upgrade: +15 food
| Far Runners | M | 🧭 | ● | Scouts +1 movement and +1 sight. Civilians +2 movement while embarked. | cannot be upgraded
| The Widow's Levy | M | — | ◆ | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. | upgrade: +5 production +10 gold
| Militia Levies | M | — | ● | All your cities gain +4 defense and +1 sight radius. · *neutral* | upgrade: +2 defense
| Common Granary | E | 🌱 | ● | +1 food in every city holding an improved luxury resource. | upgrade: +1 food
| Salt Tithes | E | 🐫 | ● | +2 gold for each unique luxury. | upgrade: +1 gold
| Boundary Stones | E | — | ● | +30% border culture in every city. | upgrade: +5%
| First Rites | W | 🕯 | ● | +2 faith in your capital. | upgrade: +1 faith
| Border Ballads | W | 🏹 | ◆ | +2 culture for each barbarian camp you have found, and +10 culture for each barbarian unit you kill. | +10 culture per barb kill
| Fire-Keepers | W | 🕯 | ● | +1 faith in your capital, and +1 happiness there. | upgrade: +1 happiness
| Wolf-Runners | M | 🏹 | ◆ | Scouts gain +1 movement, and claiming a ruin grants +15 gold. | upgrade: +10 gold
| Hearth Songs | W | 🌱 | ◆ | +1 culture in every city of 4 population or less. | upgrade: +1 culture

### Government I pool (34)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Long Watch | M | — | ● | +1 happiness for each unit standing in one of your cities, and +1 more for each fortification a city has built. | cannot be upgraded
| Border Wardens | M | — | ● | +2 combat strength inside your territory. | upgrade: +1 combat
| Vanguard | M | ⚒ | ● | +2 combat strength outside your territory. | upgrade: +1 combat
| Conscription | M | ⚒ | ◆ | +50% production toward units · −2 happiness. | cannot be upgraded
| Spoils of the Wild | M | 🏹 | ◆ | Clearing a barbarian camp pays +100%. [Adds to Camp Followers. don't include this text in game] | cannot be upgraded
| Horse Lords | M | ⚒ | ● | Mounted units gain +1 movement. | cannot be upgraded
| Weights & Measures | E | 🐫 | ● | +1 gold in every city. | cannot be upgraded
| Silk Roads | E | 🐫 | ◆ | +3 gold for each trade route you run. | upgrade: +1 gold, up to +6
| The Salt Road | E | 🐫 | ● | strategic resources yield +1 gold | upgrade +1 gold.
| The Tax Farm | E | 🐫 | ● | +1 gold for each 4 population in your empire. | cannot be upgraded
| Harbour Dues | E | 🐫 | ● | Coastal cities gain +2 gold and +1 culture. | upgrade: +1 gold, up to +4
| Land Grants | E | — | ◆ | Buying a hex costs 25% less · +40% border culture. | upgrade: +5% hex cost reduction
| Homestead Charters | E | — | ◆ | Newly founded cities start with 1 more population. | cannot be upgraded
| Granary Levies | E | 🌱 | ◆ | When a city grows, it gains +10 production. | upgrade: +10 production
| The King's Table | E | 🌱 | ● | +1 happiness for every 2 citizens in your capital. | cannot be upgraded
| Tinkers' Guild | E | — | ◆ | Newly created workers gain +1 charge. · *neutral* | cannot be upgraded
| Public Granaries | E | — | ◆ | Cities keep 15% of their stored food when they grow. · *neutral* | deepen: gain +5%, up to 35%.
| Festival Days | W | 🌱 | ● | +4 happiness. | upgrade: +2 happiness, up to +8.
| Rites of Passage | W | 🕯 | ◆ | Buying or completing a unit grants +10 faith. | upgrade: +5 faith
| The Laureate | W | 🏛 | ○ | +1 renown per turn. Every great-person improvement pays +2 more of its own yield. | upgrade: +1 renown
| The Legion | M | ⚒ | ◆ | Melee units gain +1 movement and +1 combat strength, and cities put 15% more production behind them. | upgrade: +10% production
| Statute Labour | E | ⚒ | ● | +1 production in every city for each 4 citizens living there. | cannot be upgraded
| The Almanac | W | ✶ | ● | +2 science in your capital, and +1 science in every city with a Library. | upgrade: +1 science in capital
| Village Fairs | W | 🌱 | ● | +1 happiness for each luxury you hold two or more copies of. | upgrade: +1 happiness
| The Muster Roll | M | ⚒ | ● | Units created from now on are born with +10 maximum health, and keep it for life. | cannot be upgraded
| Hill Forts | M | ⛰ | ◆ | +2 combat strength when defending on hills, and a city on hills costs 1 less authority. | upgrade: +1 strength
| The Pilgrim's Purse | W | 🕯 | ◆ | +5 faith in every city standing beside a holy site. | upgrade: +2 faith
| Charter Towns | E | 📜 | ◆ | Newly founded cities are founded with a Granary. | cannot be upgraded
| Wayside Shrines | W | 🕯 | ● | +1 faith in every city. | cannot be upgraded
| Curious Elders | W | ✶ | ◆ | +5 science whenever you claim a ruin. | (restored — fell out of the edit pass; mark me)
| The Unbroken Land | E | 🌱 | ◆ | +1 food and +1 production on every unimproved hex. | upgrade: +1 faith on unimproved hexes

### Government II pool (35)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| River Wardens | E | 🌾 | ● | When a unit is stationed in a city, that city gains +1 food on every farm beside fresh water. | cannot be upgraded
| Field Surgeons | M | ⚒ | ● | All units heal +10 more per turn, anywhere. | cannot be upgraded
| March Discipline | M | ⚒ | ◆ | Military units gain +1 movement. | cannot be upgraded
| The Shield Wall | M | ⚒ | ● | +3 combat strength on hills. | upgrade: +1 combat strength
| Siege Doctrine | M | ⚒ | ● | +4 combat strength when attacking cities. | upgrade: +1 combat strength
| Scorched Earth | M | — | ◆ | Pillaging heals a further 25 and pays a further +10 gold. | upgrade: +15 gold
| Sumptuary Laws | E | 🐫 | ● | +1 happiness for each unique luxury. | cannot be upgraded
| Publicani | E | 🐫 | ◆ | +2 gold for each point of positive authority. | upgrade: +1 gold
| Chartered Companies | E | 🐫 | ◆ | Buying a hex pays +5 science · buying a hex costs 15% less. | upgrade: +5 science, +5% cost reduction
| Foreign Quarters | E | 🐫 | ◆ | +1 gold and +1 science in every city near another empire's territory. | [remove]
| Ore Tithes | E | ⚒ | ● | +1 production on every hex carrying a strategic resource. | cannot be upgraded
| Terraced Hillsides | E | 🌱 | ● | +1 food on every hill hex. | cannot be upgraded
| Master Masons | E | ⚒ | ◆ | Completing a building grants +10 culture. | upgrade: +5 culture
| Royal Surveyors | E | — | ● | +50% border culture · buying a hex costs 25% less. | cannot be upgraded
| Provincial Governors | E | — | ● | +3 authority capacity. | upgrade: +1 authority
| Emergency Powers | E | — | ○ | While your authority is negative: capital +25% production, and borders do not freeze. | cannot be upgraded
| The Common Purse | E | — | ○ | Leftover production from a completed item is doubled. · *neutral* | cannot be upgraded
| Pilgrim Roads | W | 🕯 | ◆ | +1 faith for every 3 citizens in your capital · +1 happiness for each 50 banked faith (at most +5). | upgrade: increases cap on happiness +2
| Lamplighters | W | 🕯 | ◆ | +1 culture for each 5 faith you gain per turn. | cannot be upgraded
| Scholars' Stipend | W | ✶ | ● | +2 science in every city of 5 or more population. | upgrade: +1 science
| The Choir | W | 🕯 | ● | +1 culture and +1 happiness in every city with a Temple. | upgrade: +1 culture
| Star-Gazers | W | ✶ | ● | +2 science in every city with a mountain hex inside its borders. | upgrade: +1 science
| Cistern Works | E | 🌾 | ● | Every city of yours counts as standing on fresh water. | cannot be upgraded
| Ledger-Keepers | E | 🐫 | ● | +1 gold in every city with a Market, and +1 trade route. | upgrade: +1 gold
| Drums of War | M | ⚒ | ◆ | while slotted, newly created units gain +2 combat strength, and keep it for life. | cannot be upgraded
| The Cartographers | W | 🧭 | ◆ | +1 science for each 40 hexes you have revealed. |  cannot be upgraded
| The Masons' Lodge | E | ⚒ | ◆ | Cities of 6 population or more put 10% more production behind buildings. | upgrade: +5% production
| The Oath-Bound | M | ⚒ | ○ | Killing a unit heals the unit that struck the blow by 15. | cannot be upgraded
| The Orchard Tithe | E | 🌱 | ● | +1 food on every hex carrying a luxury resource. | cannot be upgraded
| The Greenwood Law | E | 🌱 | ◆ | +2 food and +2 production on every unimproved hex. | upgrade: +2 faith
| The Quiet Fields | W | 🌱 | ● | +1 happiness for each unimproved hex your cities work. | cannot be upgraded
| The Quartermasters | M | ⚒ |   | Military units cost 1 less gold in maintenance. | cannot be upgraded
| The Last Hunt | W | 🏹 |   | +2 culture for each barbarian camp you have cleared this game. | cannot be upgraded
| The Shipwright Shores | E | 🐫 |   | +1 production in every coastal city · +30% production toward ships there. | upgrade: +1 prod
| The Archives | W | — |   | +1 culture for each level of the Orders you have placed in a slot. | upgrade: +1 culture

### Government III pool (33)

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Marshals | M | ⚒ | ◆ | +2 combat strength for each adjacent friendly combat unit (at most +4). | cannot be upgraded
| Garrison State | M | ⚒ | ● | Each city gains +3 production for each combat unit standing in it (at most +6 per city). | upgrade: +1 production
| Skirmishers' Creed | M | ⚒ | ○ | Ranged units gain +1 range. | cannot be upgraded
| The Finisher's Art | M | — | ● | +4 combat strength against units below half strength. | cannot be upgraded
| Frontier Forts | M | — | ● | +6 city defence in every city near another empire's territory. | cannot be upgraded
| The Standing Levy | M | — | ○ | Every 12 turns, a free melee unit musters in your capital. · *neutral* | upgrade: -2 turns
| Client Kings | E | — | ● | +2 authority capacity · a captured city costs one less authority. | upgrade: +1 authority
| Provincial Mints | E | 🐫 | ● | +2 gold for each improved copy of a luxury — duplicates count. | cannot be upgraded
| Quarrymen's Guild | E | ⚒ | ● | +4 production in every city with a quarry. | upgrade: +1 production
| The Grain Dole | E | 🌱 | ● | +2 happiness in every city of 6 or more population. | cannot be upgraded
| Mandate of Heaven | W | 🕯 | ○ | The science and culture your happy cities pay rises 5% · +1 happiness for each 200 banked faith. | cannot be upgraded
| The Lyceum | W | ✶ | ◆ | Completing a technology grants an extra turn of culture. | cannot be upgraded
| Census of Souls | W | 🕯 | ◆ | +1 faith for each citizen in your capital. | cannot be upgraded
| Toleration Edicts | W | — | ● | −10% happiness demanded per citizen. | upgrade: additional -2%
| The Old Ways | W | 🌱 | ◆ | The yields of unimproved hexes are doubled. [lets keep this, this is the payoff card] cannot be upgraded
| First Fruits | E | 🌱 | ● | +1 food on every hex carrying a resource. cannot be upgraded
| The War Chest | E | ⚒ |   | Military units cost 3 less gold in maintenance. | cannot be upgraded
| Forced Marches | M | ⚒ |   | Melee units gain +1 movement, and +2 instead inside your own territory. | cannot be upgraded
| The Escorted Roads | E | 🐫 |   | Trade routes pay 30% more. · †deferred | [lets implement this] upgrade: +10% per upgrade
| The Saints' Fields | W | 🕯 |   | +3 faith on every great-person improvement. | cannot be upgraded
| The Wayhouses | E | 🐫 |   | +2 gold and +1 culture for each trade route you run. | upgrade: +1 gold
| The Provisioners | E | 🐫 |   | +1 happiness for each trade route between your own cities. | cannot be upgraded
| The Prize Grounds | E | 📜 |   | +2 happiness in every city settled on a luxury resource. | upgrade: +1 happiness
| The Census Eternal | W | ✶ |   | +1 science for every 4 citizens in your empire. | cannot be upgraded
| The Groundskeepers | E | 🏛 |   | +1 food and +1 production on every great-person improvement. | cannot be upgraded
| The Master's Presence | E | 🏛 |   | +10% to every yield in each city beside a great person's work. | cannot be upgraded
| The Wonder-Feasts | E | ⚒ |   | +2 food in every city while it is building a wonder · +10% production toward wonders. | upgrade: +1 food, +5% production
| The Master Builders | E | ⚒ |   | The Magnum Opus and cathedrals cost 15% less production. | upgrade: additional 5% cost reduction
| The Dry Docks | E | 🐫 |   | +25% production toward ships in every city with a Harbour. · †deferred | [lets build this] upgrade: +5% production
| The Wintering Grounds | M | — |   | Your units cost no gold in maintenance outside your territory | cannot be upgraded
| The Annals of Law | W | — |   | +2 culture for each Order you hold but have not placed in a slot. | upgrade: +1 culture
| Triumphs | M | ⚒ | ◆ | Capturing a city grants +30 culture. · †deferred (the 5 renown half) | (restored — fell out of the edit pass; mark me)
| The Auspicious Seal | W | — |   | The first time this Order is placed in a slot, a die of the Magister is yours. | cannot be upgraded

### Government IV pool — PROPOSED (tier 29 adoption) (20)

Not in the data yet. Stocked from the dissolved worksheet pools by power and
timing: everything here leans on content that is live by mid-Æra III (knights,
trebuchets, universities, the Cathedral, wonders in number). Wiring it is one
enum value + `poolOfGovernment` mapping tier 29 here instead of Government III.

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The King's Road | M | 🎖 | ◆ | units gain +1 movement when starting their turn in friendly territory. Roads are extra effective. |
| Levies | M | 🎖 | ● | every city with a Barracks musters a free melee unit every 20 turns · −1 happiness per Barracks · *(note: The Levée en Masse (Pool V Doctrine) is the same idea — keep one)* |
| Field Hospitals | M | 🎖 | ◆ | units inside your borders heal to full each turn they do not move (fortify counts) |
| Decisive Blows | M | 🎖 | ○ | +15% damage dealt when attacking a unit already below full strength |
| The Marshals' Purse | M | 🎖 | ○ | units cost −25% gold to purchase |
| Trade Wardens | M | ⚓ | ○ | trade routes cannot be pillaged · +5 combat within 2 hexes of a road |
| Knightly Orders | M | ⚒ | ○ | mounted units +5 combat inside your borders · mounted units cost +25% ⚙ |
| The Siege Train | M | ⚒ | ◆ | siege units +1 movement · +5 combat vs cities for units adjacent to a siege unit |
| Patrons | E | 🏛 | ◆ | +1 renown per turn per building of the 🎵 category · +2🎵 per wonder you hold |
| The Guild of Masons | E | 🏛 | ● | +30% ⚙ toward wonders · −15% ⚙ toward units |
| Harbourmasters | E | ⚓ | ◆ | coastal cities +1 trade route · fishing boats +1💰 |
| The Factor Houses | E | ⚓ | ○ | each trade route to another civilization pays +3🔬 |
| The Corvée | E | ⚒ | ● | completing a building grants +1 population in that city · −2 happiness |
| Assize Courts | E | — | ◆ | +1 authority capacity per 3 cities · captured cities cost 1 |
| The Grain Fleet | E | 🌱 | ○ | coastal cities +2🌾 · +25% growth surplus in coastal cities |
| Cathedral Chapters | E | 🕯 | ◆ | +1 happiness per Cathedral · Cathedrals +2🎵 · *(Cathedral is live — implementable)* |
| Star Readers | W | ✶ | ◆ | +2🔬 per wonder you hold · completing a wonder grants +30🔬 |
| The Synod | W | 🕯 | ◆ | rites last 25% longer · +1🕯 per temple · *(rites are one-shots now (one-charge augur) — "last 25% longer" needs a rework)* |
| Scholastics | W | ✶ | ◆ | +2🔬 per University · completing a technology grants +15🕯 |
| Court Poets | W | 🏛 | ○ | every Triumph you earn grants +20🎵 · great people arrive with +1 charge |

### Government V pool — PROPOSED (tier 45 adoption) (16)

The Æra IV pool: the run to the Opus. Rally points, great-person economy,
late-game happiness and print culture. Same wiring as IV, for tier 45.

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| Muster | M | 🎖 | ● | a unit completed in any city may appear at your designated *rally city* instead · −2 happiness in the rally city |
| Forced March | M | 🎖 | ○ | combat units +1 movement outside your borders · −5 combat on the turn they moved 3+ hexes |
| Admiralty | M | ⚓ | ○ | embarked units +1 movement and +5 defence · coastal cities +5 defence |
| The Salon | E | 🏛 | ● | every great-person draft shows one more card · great people cost +10% renown (the ladder steepens) |
| The Silk Exchange | E | ⚓ | ◆ | +2💰 per trade route · luxuries imported by route count as held |
| Printing Houses | E | ✶ | ◆ | +1🎵 per Library · the Printing House +2🔬 |
| Tithe Barns | E | 🌱 | ○ | cities keep 50% of the basket on growth · −1🕯 per city |
| The Provincial Estates | E | — | ◆ | +1 authority capacity per city of 8+ population |
| Guild Charters | E | ⚒ | ○ | each Workshop / Forge grants +1 renown per turn to the Engineer family · +2% ⚙ per production building in that city (max +6%) · *(user deferred earlier ("too many mechanics") — re-cut before building)* |
| Manufactories | E | ⚒ | ◆ | +2⚙ and 1 renown per Manufactory (the great work) in your empire · *(the manufactory great work is live — implementable)* |
| The Inquisition | W | 🕯 | ● | cities with a Temple: +2 happiness and +2🕯 · cities without one: −2 happiness |
| Pilgrimage | W | 🕯 | ○ | +2🎵 per wonder you hold · +1🕯 per Triumph earned |
| Universal Suffrage | W | 🌱 | ◆ | +1 happiness per 4 population, empire-wide · happiness tiers +5pp |
| The Magister's Court | W | 🏛 | ○ | great people arrive with a second charge · the Magnum Opus +10% ⚙ · *(the Opus is live — implementable)* |
| Ancestor Cults (II) | W | 🕯 | ○ | +1🕯 per 2 population in every city of 10+ |
| The Long Peace | W | — | ● | +20% 🎵 and 🔬 empire-wide while you have lost no unit in 20 turns · lose it all the turn you do |

### Government VI pool — PROPOSED (no rung exists yet) (10)

There is no adoption tier past 45 — this pool needs a seventh ladder rung (or a
different gate: the Opus opening, an Æra V entry) before it can be dealt.
Deliberately stocked with the rows that wait on Æra V content, so building the
pool and building the content are one decision.

| Order | Slot | Line | Rarity | Effect |
|---|---|---|---|---|
| The Corps | M | 🎖 | ● | two units of one type on one hex merge into a corps (+50% strength, one piece) · corps cost 2 authority · *(user: backburner, UX first)* |
| Bombardiers | M | 🎖 | ◆ | siege units +1 range · Bombards cost −25% ⚙ · *(waits: Bombards (Æra V, unbuilt))* |
| The Aerostat Corps | M | ✶ | ○ | Aerostats +2 sight · every city with an Observatory +1 sight · *(waits: Aerostats + Observatory sight (Æra V))* |
| Rocket Arrows | M | 🜍 | ○ | ranged units +10 combat vs units on open ground · −5 on hills |
| The Adepts | E | 🜍 | ◆ | the Distillery +3🔬 +1🕯 · +1 renown per turn to the Scholar family per Distillery · *(waits: the Distillery (cut with First Distillation))* |
| The Furnace | E | 🜍 | ● | every strategic resource counts as one more copy · Forges +2⚙ · −1 happiness per Forge · *(waits: the Forge (Æra V))* |
| The Porcelain Trade | E | ⚓ | ○ | the Porcelain Works' luxury counts twice · +3💰 per Porcelain Works · *(waits: the Porcelain Works (Æra V))* |
| The Clerks of the Engine | E | 🜍 | ◆ | the Engine +4🔬 · +1🔬 per 2 population in its city · *(waits: the Engine (Æra V))* |
| The Entranced Workforce (II) | E | 🜍 | ○ | the Entranced Workforce project pays double · −3 happiness while it runs · *(waits: the Entranced Workforce project (Æra V))* |
| The Encyclopaedists | W | ✶ | ● | every technology draft… → completing a technology grants +25🎵 and +10🕯 · science −10% |

### Notes and deferred halves (from the data rows)

- **Boundary Stones** — Border culture is the culture a city puts toward its own borders, not the culture your empire saves toward its next draft. This hurries your borders only.
- **Rites of Passage** — A unit bought with gold counts as completed, so it pays this too — but only once.
- **The Loose Rein** — Retired: this Order is no longer offered in a draft. A saved game that already holds it keeps it.
- **Triumphs** — The renown a capture pays is not built: a windfall's grants are banked by a routine that cannot reach the renown ladder, so only the culture arrives. † capturing a city also grants 5 renown
- **The Laureate** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Bronze Mirror** — Not built: every luxury in this game is a seam in the ground, held by working it. Nothing can hand an empire a luxury that is not anywhere on the map. Retired until one can. † a luxury of your own make — bronze trinkets — worth +1 happiness in every city, and +1 more for each copper or tin you hold
- **Cistern Works** — It answers what is asked of a city — whether the town can drink. A hex out in the fields is still watered by the river or by nothing.
- **Sanctuary** — Not built: a city can only be captured in this game, never sacked. Retired until sacking exists. † your holy city is sacked rather than captured while it keeps your religion
- **The Old Ways** — Not built: a percentage in this game lands on a whole city or on the whole empire, never on one hex. Doubling what a single hex pays is a new kind of arithmetic and is a design decision, not a number. Retired until it is made. † the yields of every unimproved hex are doubled
- **The Escorted Roads** — † trade routes within 3 hexes of your soldiers cannot be plundered — nothing in the game can say where a route is safe, only what it pays
- **The Saints' Fields** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Groundskeepers** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Master's Presence** — A city is beside a work when one stands on its own hex or on one of the six touching it. Two works never pay twice.
- **The Dry Docks** — † ships mend completely in a port — a heal that depends on where a piece is standing is a rule about a hex, and healing is a rule about a turn
- **The Great Warring Tribes** — The clause about courthouses does nothing: there is no courthouse in the game yet.
- **The Founders' Road** — The free hall is the Monument. A grander one is meant to take its place once the game has a hall to grow into. † an amphitheatre instead of the Monument, once one is unlocked
- **Mountain Hold** — Built for a mountain **next to** the city. The ratified text says within two hexes, and the board can only be asked about the ring of six today. † the bonus reaching a city with a mountain two hexes away, rather than only one
- **The Burning Way** — Not built: the board does not remember a clearing. A felled forest leaves bare ground that looks exactly like ground nothing ever grew on, so nothing can tell the two apart to pay for one of them. † +1 food on every hex you have cleared of forest or jungle
- **Divine Inspiration** — Faith income today rarely reaches 200 banked faith, so this pays little until faith yields grow.
- **Religious Mandate** — None of this is built, and the card is never offered. † permanent war with empires of another faith † your cities cannot be converted † a powerful bonus toward the domination and religious beads
- **The Academy of Deeds** — A Triumph missed in one age is still closed for good; only the doubling is in effect. † Triumphs you missed by one age can still be earned in the next
- **The Sea Charter** — There is no Harbour in the game yet, so no city is founded with one. † every coastal city is founded with a Harbour
- **The Renaissance Court** — Nothing yet makes a legacy stronger, so only the extra card is in effect. † every great person's legacy is 50% stronger
- **Cuius Regio** — Nothing yet makes a rite itself stronger, so only the extra charge is in effect. The charge is decided in the city the augur is trained in. † their rites are 30% more effective
- **Absolutism** — The extra slot is not built: a government's slots are laid out when it is adopted, and adding one is a change to that layout rather than a number. † you gain a wildcard Order slot
- **Blitz** — Neither half is built: nothing gives a unit its movement back for a kill, and nothing stops a unit fortifying. † units that kill may move again that turn † units cannot fortify
- **The Philosopher's Stone** — Neither the Great Work project nor the Distillery is in the game yet. † the Great Work costs −25% production † every Distillery mints +5 gold
- **The Levée en Masse** — Not built: nothing in the game happens when a foreign unit crosses your border. † cities with a Barracks muster a militia when an enemy enters your borders
- **Pax Magistri** — The clause about declaring war is not built: empires are not yet at war or at peace. † you can no longer declare war
- **The Closed Realm** — Not built, both halves. Nothing in this game can hold a meter at a number instead of adding to it, and nothing can refuse an attack for where it is being made. † your happiness is held at +5 whatever your cities ask for † your units cannot attack outside your own territory

---

**As built, 2026-08-28 (copy pass).** The printed faces of every card in this
document are generated by `describeCard`, and its word tables were rewritten to
the Compendium's plain voice: *writ* → **authority**, *tile* → **hex**,
*hammers* → **production**, *the basket* → **stored food**, *the wild* →
**barbarians**, *chopping* → **clearing a forest or jungle**, *claiming a
discovery* → **claiming a ruin**, *garrisoned* → **standing in one of your
cities**, *seals* → **locked**. Numbers are unchanged throughout; the ratified
text in the tables above is the design record and reads in its own voice.

