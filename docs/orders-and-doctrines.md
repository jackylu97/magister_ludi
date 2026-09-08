# Orders and Doctrines — the master list

Every Order, Doctrine and government in one place, tables only. The tables ARE the
balance worksheet: edit a cell here, edit the matching field in `data/statecraft.json`,
and `test/sim/statecraftDocSync.test.ts` fails the build if the two ever disagree —
every live row appears in its own table and every table row names a live row, retired
rows excluded from both sides. Every Effect cell is the row’s own ratified `text`;
pool counts and tiers are the data’s. The reasoning behind each pass lives in
`docs/history/orders-and-doctrines-as-built.md`.

**Rarity** — the mark in an Order’s Rarity column **is** `OrderDef.rarity`: ● common ·
◆ uncommon · ○ rare, blank reads as common. The draw takes it as a *weight, never a
restriction* — 4 · 2 · 1 (`rarityWeights`) — applied inside the guaranteed military/
economic/wildcard spread, so a rare card is rare among cards of its own office and every
hand still holds one of each. Passing a draft raises the weights by `skipPity` until a
card is taken. Orders are never upgraded: a card is what it prints, held once, and a
draft is take one or pass.

**Role** — **E** an *engine*, a row whose subject is the deck or the board’s *kind* (a
count of the chairs, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar). **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted (a
count, a conversion, a doubler taken last, a tally). **S** a *standalone*, everything
else (a flat, a rule, an occasion, a charter, a boon on the calendar). The mark is
**derived from the row’s own effects** and pinned against that derivation, so a row that
changes shape changes its letter or fails the build. The ruled share is 25% engines ·
30% payoffs · 45% standalones **per game**, not per pool.

A row with a struck half carries **†** — in its Effect cell for a Doctrine, and in its
line under Notes, where the words after the dagger are what the row does *not* do.

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
|  | War Chief | 3/1/1 | +3 authority, +2 combat strength · killing a unit grants +5🔬 and +5🎵 per slotted Order |
| 10 | Republic | 1/3/3 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 1/2/4 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a fifth of the rate. |
|  | Tyranny | 3/1/3 | +5 authority capacity. +2 combat strength Pillaging pays +50% and costs no movement. |
| 18 | Divine Mandate | 2/2/4 | +1 faith and +1 culture in your capital for each wildcard Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 4/2/2 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 1/4/3 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 29 | The Curia | 3/3/4 | +6 faith for each Cathedral. Faith buildings supply science equal to their faith. |
|  | The Estates | 2/4/4 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 5/2/3 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |
| 45 | The Commonwealth | 2/5/5 | Great people may be bought with gold. Great-person improvements pay +50% more. |
|  | The Empire | 5/3/4 | +6 authority capacity. +1 combat strength for each great general you have earned this game. |
|  | The Magisterium | 3/4/5 | Every offer of every kind shows one more card. +3 renown per turn for each wonder you hold. |

## Doctrines

### Pool I (tier 4)

| Doctrine | Line | Effect |
|---|---|---|
| The Hermit Crown | 🌱 | While you hold at most 4 cities: +30% to every yield in your capital. |
| River Kings | 🌱 | +30% food in every city on fresh water; −10% food and −10% production in every city without it. |
| The Woodwrights | ⚒ | Clearing a forest or jungle pays +100% and grants +10 culture. |
| The Great Litany | 🕯 | +1 culture for each 3 faith you gain per turn. |
| Wolf-Mother's Pact | 🏹 | Barbarians you kill join you at full health. |
| The Founders' Road | — | Newly founded cities are joined to your nearest city by road · +1 culture in every city. |
| The Founders' Charter | 📜 | +2 authority capacity · newly founded cities are founded with a Monument. |
| The Muses' Call | 🏛 | Great people may be called before the technology that opens them. Adopting this calls one great person. Great-person improvements pay +1 production. |

### Pool II (tier 10)

| Doctrine | Line | Effect |
|---|---|---|
| Thalassocracy | 🐫 | Coastal cities gain 10% of their food yield as production. |
| Mountain Hold | ⚒ | +15% production in every city with a mountain tile · +5 city defence there. |
| The Burning Way | ⚒ | Clearing a forest or jungle costs no worker charge. |
| The Sacred Path | ⚒ | +1 faith on every forest hex · +1 culture on every jungle hex. |
| Bread and Circuses | 🌱 | While your authority is positive: +2 happiness in every city of 6 or more population. −2 gold in every city, always. |
| The Tithe | 🕯 | +1 gold for each faith you gain per turn. |
| The Gentle Yoke | 🌱 | −15% happiness demanded per citizen · every city costs 2 more authority. |
| The Scattered Hearths | 🌱 | The first 2 citizens in every city demand no happiness · −4 happiness in your capital. |
| The Horse-Tribes | ⚒ | Mounted units gain +1 movement and +1 combat strength. |
| The Great Warring Tribes | ⚒ | +10% production toward units. Captured cities pay +5 science and +5 culture per turn. |

### Pool III (tier 18)

| Doctrine | Line | Effect |
|---|---|---|
| The Iron Price | ⚒ | Killing a unit grants +20 culture · pillaging pays double. |
| Manifest of the Steppe | — | Settlers cost 40% less to train and have +2 movement. |
| The Gilded Court | 🐫 | Unlocks the Gilded Hall, a building that is bought with gold and never built. +1 science and +1 culture on every hex that yields gold. +2 authority capacity. |
| The Grand Bazaar | 🐫 | Happiness from unique luxuries +50%. A second or later copy of a luxury pays 30% of its bonus instead of nothing. +2 gold for each unique luxury. |
| Master of Maps | 🧭 | All units +1 sight and +1 movement, all units −2 combat strength. |
| Hegemony | ⚒ | A captured city costs 1 authority · capturing a city grants +5% production in every city for 10 turns. |
| Pax Imperia | 🌱 | +3 happiness and +10% culture in every city of 8 or more population. |
| The Wandering Court | 🌱 | −15% to every yield in your capital · +3 food, production, science, culture and faith, and +3 happiness, in every city but your capital. |
| The Pilgrim Ways | 🕯 | +3 faith for each city in the world that follows your religion · +1 culture for each foreign city that follows you · +1 culture for each 5 faith you gain per turn. |
| The Natural Philosophers | ✶ | +1 science in your capital for each building standing in it · completing a technology grants 50% of a turn’s culture. |
| The Deep Delving | ⛰ | +1 production on every mine and every quarry · surfacing a vein pays +40 gold, and a mine standing on rich ore pays +2 production more. |

### Pool IV (tier 29)

| Doctrine | Line | Effect |
|---|---|---|
| The Academy | — | −10% culture and +20% science. Great scholar drafts can be bought with faith. |
| The Standing Army | ⚒ | +1 authority capacity for each 5 units you have in the field. −1 happiness in every city. Units cost no upkeep. |
| The Sea Charter | 🐫 | Trade routes pay 50% more. |
| The Renaissance Court | — | Great-person offers show one more card. |
| Cuius Regio | 🕯 | In cities that follow your religion, 15% of the faith they gain is gained again as science. |
| The Yeomanry | 🌱 | +1 production on every hex with a Farm. Cities of 10 or more population −1 happiness. |
| Absolutism | — | +6 authority capacity. A newly placed Order is locked for 10 turns instead of 5. |

### Pool V (tier 45)

| Doctrine | Line | Effect |
|---|---|---|
| Blitz | ⚒ | Units that kill may move again that turn. Units cannot fortify. |
| The Philosopher's Stone | — | The Magnum Opus is built 25% faster. |
| The Grand Tour | — | +3 renown per turn for each wonder you hold. +1 culture for each wonder in the world, seen or not. |
| Mare Nostrum | 🐫 | +1 food and +1 gold on every water hex you own. Coastal cities cost no authority. |
| Pax Magistri | 🌱 | +3 happiness in every city. +5 science and +5 culture in every city of 12 or more population. |
| The Encyclopaedia | ✶ | +1 science for each building in a city. Science buildings cost −50% production. |
| The Triumphal Way | ⚒ | Capturing a city grants +5 happiness in every city for 10 turns. |

### Parked (tier 0 — offered in no pool)

| Doctrine | Waits on | Effect |
|---|---|---|
| The Closed Realm | your happiness is held at +5 whatever your cities ask for; your units cannot attack outside your own territory | Your happiness is fixed at +5, always · your units cannot attack outside your territory. |

## Orders

### Chiefdom pool (13)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Blooded Spears | M | 🏹 | ● | S | +1 combat strength, and +2 more against barbarians. |
| Camp Followers | M | 🏹 | ◆ | S | Clearing a barbarian camp grants +25 food and a random military unit. |
| Far Runners | M | 🧭 | ● | S | All your units gain +1 sight. Claiming a ruin grants +10 culture. |
| The Widow's Levy | M | — | ◆ | S | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. |
| Boatwrights | E | ⚓ | ● | P | +1 production in every coastal city. |
| Common Granary | E | 🌱 | ● | P | +2 food in every city holding an improved luxury resource. |
| Salt Tithes | E | 🐫 | ● | P | +3 gold for each unique luxury. |
| Boundary Stones | E | — | ● | S | +30% border expansion in every city with a Monument. |
| First Rites | W | 🕯 | ● | E | +1 faith in your capital, and +1 faith for each wildcard Order you have in a slot. |
| Fire-Keepers | W | 🕯 | ● | P | +1 faith in your capital for every 2 citizens living there. |
| The Founding Oath | W | 📜 | ○ | P | Your capital pays +1 of every yield for each building standing in it, at most 3. |
| The Elders' Writ | E | 📜 | ● | S | +2 authority capacity. |
| The Tally Sticks | E | ✶ | ● | P | +1 science in every city with a Monument. |

### Government I pool (33)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Long Watch | M | — | ● | P | +1 happiness for each unit standing in one of your cities, and +1 more for each fortification a city has built. |
| Border Wardens | M | — | ● | E | +1 combat strength inside your territory, and +1 more for each military Order you have in a slot, at most +3 more. |
| Conscription | M | ⚒ | ◆ | S | +50% production toward units · −2 happiness. |
| Spoils of the Wild | M | 🏹 | ◆ | S | Clearing a barbarian camp pays +100%. |
| Weights & Measures | E | 🐫 | ● | S | +1 gold in every city. |
| Silk Roads | E | 🐫 | ◆ | S | +5 gold on every trade route you run. |
| The Tax Farm | E | 🐫 | ● | P | +1 gold for each 3 population in your empire. |
| Harbour Dues | E | 🐫 | ● | P | Coastal cities gain 5% of their gold again as culture. |
| Homestead Charters | E | — | ◆ | S | Newly founded cities start with 1 more population. |
| Granary Levies | E | 🌱 | ◆ | S | When a city grows, it gains +10 production. |
| The King's Table | E | 🌱 | ● | P | +1 happiness for every 2 citizens in your capital. |
| Tinkers' Guild | E | — | ◆ | S | Newly created workers gain +1 charge. · *neutral* |
| Festival Days | W | 🌱 | ● | S | +4 happiness in your capital, and +2 culture in every city. |
| Rites of Passage | W | 🕯 | ◆ | S | Buying or completing a unit grants +10 faith. |
| The Laureate | W | 🏛 | ○ | S | +2 renown per turn. Every great-person improvement pays +3 more of its own yield. |
| The Legion | M | ⚒ | ◆ | S | Melee units gain +1 movement and +1 combat strength, and cities put 15% more production behind them. |
| The Almanac | W | ✶ | ● | P | +2 science in your capital, and +2 science in every city with a Library. |
| Village Fairs | W | 🌱 | ◆ | P | +1 happiness for each luxury you hold two or more copies of. |
| Hill Forts | M | ⛰ | ◆ | S | +2 combat strength when defending on hills, and a city on hills costs 1 less authority. |
| Wayside Shrines | W | 🕯 | ● | P | +1 faith in your capital for every city you hold. |
| The Unbroken Land | E | 🌱 | ◆ | S | +1 food and +1 production on every unimproved forest or jungle hex. |
| The Ballad-Weavers | W | 🏹 | ◆ | P | +2 culture per turn for each barbarian you have killed while this Order stands in a slot. |
| The Rites Charter | W | 🕯 | ◆ | S | Unlocks the Chapel. |
| The Vigil Charter | M | ⚒ | ◆ | S | Unlocks the Keep. |
| The Reckless Levy | M | ⚒ | ◆ | S | +50% production toward units · every unit costs one more coin to keep. |
| The Muster Rolls | M | ⚒ | ◆ | E | The Order in your first military slot pays twice. |
| The Harvest Home | E | 🌱 | ● | E | Your Orders that give food give an additional food. |
| The Reeve’s Bell | E | 🌾 | ● | S | Every 8 turns, your capital gains food for each citizen in your empire. |
| The Marches | M | 📜 | ◆ | S | +2 authority capacity · −1 happiness in every city. |
| The Census | E | 📜 | ◆ | P | +1 authority capacity for each 2 cities you hold. |
| The Scribes' Hall | E | ✶ | ◆ | P | +1 science in every city for each 3 citizens living there. |
| The Lamp Kept Lit | W | ✶ | ○ | P | +25% science in your capital. |
| Fish Weirs | E | ⚓ | ● | S | +1 food on every fishing boat. |

### Government II pool (49)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Field Surgeons | M | ⚒ | ● | S | All units heal +10 more per turn, anywhere. |
| March Discipline | M | ⚒ | ◆ | S | Military units gain +1 movement. |
| Siege Doctrine | M | ⚒ | ● | S | +4 combat strength when attacking cities. |
| Scorched Earth | M | — | ◆ | S | Pillaging heals a further 25 and pays a further +10 gold. |
| Sumptuary Laws | E | 🐫 | ● | P | +1 happiness for each unique luxury. |
| Chartered Companies | E | 🐫 | ◆ | S | Buying a hex pays +5 science · buying a hex costs 15% less. |
| Ore Tithes | E | ⚒ | ● | E | +2 production on every hex carrying a strategic resource, and +2 production in your capital for each military Order you have in a slot. |
| Terraced Hillsides | E | 🌱 | ● | S | +2 food on every hill hex. |
| Master Masons | E | ⚒ | ◆ | S | Completing a building grants +25 culture. |
| Royal Surveyors | E | — | ● | S | +50% border expansion · buying a hex costs 25% less. |
| Provincial Governors | E | — | ● | E | +1 authority capacity for each economic Order you have in a slot, at most +4. |
| Emergency Powers | E | — | ○ | S | While your authority is negative: capital +25% production, and borders do not freeze. · *neutral* |
| Pilgrim Roads | W | 🕯 | ◆ | P | +1 faith for each citizen in your capital · +1 happiness for each 50 banked faith (at most +5). |
| Lamplighters | W | 🕯 | ◆ | P | +1 culture for each 3 faith you gain per turn. |
| Scholars' Stipend | W | ✶ | ● | P | +3 science in every city of 5 or more population holding a Library, and +3 more where a University stands. |
| The Choir | W | 🕯 | ● | P | +3 culture and +1 happiness in every city with a Temple. |
| Star-Gazers | W | ✶ | ● | P | +15% science in every city with a mountain hex inside its borders. |
| Cistern Works | E | 🌾 | ◆ | S | Every city of yours counts as standing on fresh water. |
| Ledger-Keepers | E | 🐫 | ● | S | +1 science and +1 culture on every trade route sent from a city with a Market, and +1 trade route. |
| Drums of War | M | ⚒ | ◆ | S | While this Order is in a slot, units created from now on are born with +2 combat strength, and keep it for life. |
| The Cartographers | W | 🧭 | ◆ | P | +1 science for each 40 hexes you have revealed. |
| The Oath-Bound | M | ⚒ | ○ | S | Killing a unit heals the unit that struck the blow by 15. |
| The Orchard Tithe | E | 🌱 | ● | S | +2 food on every hex carrying a luxury resource. |
| The Last Hunt | W | 🏹 | ○ | P | +4 culture and +4 science for each barbarian camp you have cleared this game. |
| The Shipwright Shores | E | 🐫 | ● | P | +3 production in every coastal city · +30% production toward ships there. |
| The Archives | W | — | ● | E | +2 culture for each Order you have placed in a slot. |
| The War Council | M | — | ● | E | +1 combat strength for each military Order you have in a slot. |
| The Guild Charter | E | — | ● | E | +3 gold for each economic Order you have in a slot, and +2 production in your capital for each. |
| The Synod | W | — | ● | P | Your faith buildings give half again their yield, counted after every other share. |
| The Harvest Songs | W | 🌱 | ● | P | Every city gains 15% of its food yield again as culture. |
| The Reliquary Rolls | W | 🏛 | ◆ | P | +3 faith and +3 culture per turn for each great person you have spent while this Order stands in a slot. |
| The Chroniclers of the Fallen | M | — | ◆ | P | +1 gold per turn for each unit you have lost in battle while this Order stands in a slot. |
| The Scriveners' Charter | W | ✶ | ◆ | S | Unlocks the Scriptorium. |
| The Coin Charter | E | 🐫 | ◆ | S | Unlocks the Assay House. |
| The Waterwrights' Charter | E | 🌾 | ◆ | S | Unlocks the Cistern. |
| The Senatus | W | 📜 | ◆ | S | Unlocks the Assembly Hall. |
| The Toolmakers' Charter | E | ⚒ | ◆ | S | Unlocks the Smithy. |
| The Banner-Call | M | ⚒ | ◆ | S | While you are at war: +15% production toward units, and killing a unit grants +5 culture. |
| The Tithe of Iron | E | ⚒ | ◆ | P | +3 production on every mine · −3 food in every city with one. |
| The First Chair | E | 🏛 | ◆ | E | The Order in your first economic slot pays twice. |
| The Scriveners | W | ✶ | ◆ | E | Your science buildings give half again their yield, the per-citizen lines included. |
| The Sacred Ground | W | 🕯 | ● | E | +1 faith on every hex that already supplies faith. |
| The Assayer’s Rule | E | 🐫 | ● | E | +1 gold on every hex that already supplies gold. |
| The Counting Houses | E | 🐫 | ◆ | E | Your gold buildings give half again their yield. |
| The Almanac of Hours | W | 🏛 | ◆ | E | Your Orders that pay every so many turns come round 3 turns sooner. |
| The Foundry Days | E | ⚒ | ● | P | Every 10 turns, your capital gains production equal to half of what your empire makes in a turn. |
| The Nets’ Blessing | E | 🐫 | ○ | P | Every fishing boat pays double what it makes. |
| The High Chancery | W | 🏛 | ○ | E | Your Orders pay half again in your capital. |
| The Votive Tally | W | 🕯 | ◆ | E | +1 faith for each Order draft you have asked again while this stands in a slot. |

### Government III pool (42)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Marshals | M | ⚒ | ◆ | S | +2 combat strength for each adjacent friendly combat unit (at most +4). |
| Skirmishers' Creed | M | ⚒ | ○ | S | Ranged units gain +1 range. |
| The Standing Levy | M | — | ○ | S | Every 12 turns, a free melee unit musters in your capital. · *neutral* |
| Client Kings | E | — | ● | S | +4 authority capacity · a captured city costs one less authority. |
| Provincial Mints | E | 🐫 | ● | P | +10% gold in every city holding an improved luxury resource. |
| Quarrymen's Guild | E | ⚒ | ● | P | +4 production in every city with a quarry, and +1 production on every quarry. |
| The Grain Dole | E | 🌱 | ● | S | +2 happiness in every city of 6 or more population. |
| Mandate of Heaven | W | 🕯 | ◆ | P | The science and culture your happy cities pay rises 8 percentage points · +1 happiness for each 150 banked faith. |
| The Lyceum | W | ✶ | ◆ | S | Completing a technology grants an extra turn of culture. |
| Census of Souls | W | 🕯 | ◆ | P | +1 faith for each citizen in your capital. |
| Toleration Edicts | W | — | ● | S | −15% happiness demanded per citizen. |
| The Old Ways | W | 🌱 | ◆ | P | The yields of unimproved hexes are doubled. |
| First Fruits | E | 🌱 | ● | S | +2 food on every hex carrying a resource. |
| The War Chest | E | ⚒ | ● | S | Military units cost 2 less gold in maintenance. |
| Forced Marches | M | ⚒ | ● | S | Melee units gain +1 movement, and +2 instead inside your own territory. |
| The Escorted Roads | E | 🐫 | ● | P | Trade routes pay 30% more. |
| The Saints' Fields | W | 🕯 | ● | S | +3 faith on every great-person improvement. |
| The Wayhouses | E | 🐫 | ● | P | +1 gold and +3 culture for each trade route you run. |
| The Provisioners | E | 🐫 | ● | P | +1 happiness for each trade route between your own cities. |
| The Census Eternal | W | ✶ | ● | P | +1 science for every 2 citizens in your empire. |
| The Groundskeepers | E | 🏛 | ● | S | +2 food and +2 production on every great-person improvement. |
| The Master's Presence | E | 🏛 | ● | P | +15% to every yield in each city beside a great person’s work. |
| The Wonder-Feasts | E | ⚒ | ● | P | +4 food in every city while it is building a wonder · +20% production toward wonders. |
| The Master Builders | E | ⚒ | ● | S | The Magnum Opus and cathedrals cost 25% less production. |
| The Annals of Law | W | — | ● | E | +3 culture for each Order you hold but have not placed in a slot. |
| The Drafting Halls | E | ✶ | ● | P | Cities with a Library gain 20% of their production again as science. |
| The Golden Scales | E | 🐫 | ● | P | Every city gains 20% of its gold yield again as science. |
| The Arsenal Law | M | ⚒ | ○ | S | While you are at war, cities with a Barracks gain 15% of their production again as gold. |
| The Casus Belli | M | ⚒ | ○ | S | Declaring war grants +2 combat strength to all your units and +10% production in every city, for 10 turns. |
| The Mint Charter | E | 🐫 | ◆ | S | Unlocks the Coinworks. |
| The Almshouse Charter | W | 🕯 | ◆ | S | Unlocks the Almshouse. |
| The Stargazers' Charter | W | ✶ | ◆ | S | Unlocks the Orrery. |
| The Justices' Charter | M | — | ◆ | S | Unlocks the Assize Court. |
| The Far Charts | W | 🧭 | ○ | P | +1 science for each 20 hexes you have revealed. |
| The Granary Laws | E | 🌱 | ◆ | P | Cities of 8 or more population gain 20% of their food yield again as science. |
| The Workshops’ Rule | E | ⚒ | ◆ | E | Your production buildings give half again their yield. |
| The Wild Chair | W | 🏛 | ◆ | E | The Order in your first wildcard slot pays twice. |
| The Cantors’ Rule | W | 🕯 | ○ | E | Your Orders that give faith give half again. |
| The Golden Censer | W | 🕯 | ○ | P | Every 15 turns, gain faith equal to half the science your empire makes in a turn. |
| The Deep Seams | E | ⚒ | ○ | P | Every mine pays double what it makes. |
| The Exchange Charter | E | 🐫 | ○ | P | Your gold buildings give half again their yield, counted after every other share. |
| The Triumph | W | 🏛 | ● | P | Every 12 turns, gain culture equal to the production your empire makes in a turn. |

### Government IV pool (18)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The King's Road | M | ⚒ | ◆ | S | Your units gain +1 movement inside your own territory. |
| Field Hospitals | M | ⚒ | ◆ | S | Units resting inside your own territory mend completely each turn. |
| Decisive Blows | M | ⚒ | ○ | S | +5 combat strength when attacking a unit below half strength. |
| The Marshals' Purse | M | ⚒ | ○ | S | Military units cost 25% less to buy. |
| Knightly Orders | M | ⚒ | ○ | S | Mounted units gain +5 combat strength inside your territory, and cities put 25% less production behind them. |
| The Siege Train | M | ⚒ | ◆ | S | Siege units gain +1 movement. +6 combat strength against cities for units standing beside a siege engine. |
| Patrons | E | 🏛 | ◆ | P | +10 culture for each wonder you hold. +3 renown per turn for each culture building you hold. |
| The Guild of Masons | E | 🏛 | ● | S | +50% production toward wonders · −15% production toward units. |
| Harbourmasters | E | 🐫 | ◆ | S | +1 trade route · +2 gold on every fishing boat. |
| Assize Courts | E | — | ◆ | P | +1 authority capacity for each 2 cities you hold · a captured city costs 1 authority. |
| The Grain Fleet | E | 🌱 | ○ | P | +6 food in every coastal city · +50% growth surplus there. |
| Cathedral Chapters | E | 🕯 | ◆ | P | +2 culture and +2 faith in every city with a Cathedral. |
| The Consistory | W | 🕯 | ○ | P | Your faith buildings pay double, counted after every other share. |
| Scholastics | W | ✶ | ◆ | P | +5 science for each University you hold · completing a technology grants +40 faith. |
| The Scholars’ Rule | W | ✶ | ◆ | E | Your Orders that give science give an additional science. |
| The Exchequer | E | 🐫 | ● | P | Your trade routes pay double. |
| The Assay | E | 🐫 | ○ | P | Every 20 turns, gain science equal to the gold your empire makes in a turn. |
| The Broad Acres | E | 🌱 | ○ | P | Every farm pays double what it makes. |

### Government V pool (17)

| Order | Slot | Line | Rarity | Role | Effect |
|---|---|---|---|---|---|
| Forced March | M | ⚒ | ○ | S | Military units gain +1 movement outside your own territory. |
| Admiralty | M | 🐫 | ○ | S | Embarked units gain +1 movement · +5 defence in every coastal city. |
| The Salon | E | 🏛 | ● | P | Every great person’s work pays double what it makes. |
| The Silk Exchange | E | 🐫 | ◆ | P | +2 gold for each trade route you run. |
| Printing Houses | E | ✶ | ◆ | P | +3 culture for each Library you hold · +10% science in every city. |
| The Inquisition | W | 🕯 | ○ | P | +8 faith and +8 culture in every city with a Temple. |
| Universal Suffrage | W | 🌱 | ◆ | P | +1 happiness for each 3 citizens in your empire · happiness tiers +10 percentage points. |
| The Magister's Court | W | 🏛 | ○ | S | +30% production toward the Magnum Opus. |
| The Compact of Chairs | W | 🏛 | ○ | E | The Order in your first military, economic and wildcard slot each pay twice. |
| The Laureates’ Rule | W | 🏛 | ◆ | E | Your Orders that give culture give an additional culture. |
| The Great Clock | W | 🏛 | ○ | E | Your Orders that pay every so many turns come round 3 turns sooner and pay half again. |
| The Encyclopaedists | E | ✶ | ○ | P | Every 10 turns, gain culture equal to the science your empire makes in a turn. |
| The Colleges’ Rule | E | ✶ | ○ | P | Your science buildings pay double, counted after every other share. |
| The Great Enquiry | W | ✶ | ○ | S | The learning of the last age is counted toward the great work itself. |
| The Last Laurels | W | 🏛 | ○ | S | A draft turned down is counted toward the great work itself. |
| The Salted Earth | M | ⚒ | ○ | S | A city put to the torch is counted toward the great work itself. |
| The Final Proclamation | W | 🕯 | ○ | S | A prophet’s proclamation is counted toward the great work itself. |

### Notes and deferred halves (from the data rows)

- **Boundary Stones** — Border expansion is how fast a city claims its next hex, fed by that city’s own culture — separate from the culture your empire saves toward its next draft. This hurries the borders only.
- **Fire-Keepers** — The faith is paid in your capital, so anything that raises what your capital receives raises this with it.
- **The Founding Oath** — It counts the buildings standing in your capital rather than the first three ever raised there, and the third is the last that pays.
- **Boatwrights** — A city counts as coastal when it stands on the water itself, not merely near it.
- **Fish Weirs** — The hex has to carry the boats already. Open water with nothing built on it feeds no better.
- **Conscription** — The unhappiness is a flat charge on the realm, not a charge per city: nothing can count only the cities past a fourth one.
- **Spoils of the Wild** — It adds to Camp Followers rather than replacing it: a camp cleared under both pays both.
- **Silk Roads** — The coin rides on the road itself, so anything that raises what a route pays raises this with it.
- **Rites of Passage** — A unit bought with gold counts as completed, so it pays this too — but only once.
- **The Laureate** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **Wayside Shrines** — The faith is gathered in your capital, so anything that raises what your capital receives raises this with it.
- **The Reckless Levy** — The coin is charged on each soldier the empire is already paying for, so a settler, a scout or a caravan is no dearer than it was.
- **Cistern Works** — It answers what is asked of a city — whether the town can drink. A hex out in the fields is still watered by the river or by nothing.
- **Ledger-Keepers** — A road is read from the town that sent the caravan, so a Market at the far end of it pays nothing here.
- **The Synod** — A faith building is any building of yours that pays faith at all, and the share is taken last — after everything else that raised it.
- **The Harvest Songs** — It reads the whole harvest rather than what is left after the citizens eat: a city's surplus is decided after every percentage on it, and a card that read the surplus would be reading a figure that reads the card back.
- **The Votive Tally** — Only Order drafts you paid faith to see again are counted, and only while this sits in a chair. A doctrine, a name or a hand of gods asked again counts for nothing here.
- **The Escorted Roads** — The escort is paid for in coin and not in safety: a route this law enriches can still be plundered.
- **The Saints' Fields** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Groundskeepers** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Master's Presence** — A city is beside a work when one stands on its own hex or on one of the six touching it. Two works never pay twice.
- **The Far Charts** — How far a caravan may be sent is settled by the two cities it joins and by the trading posts they have built. This law does not reach that rule.
- **The King's Road** — The roads themselves are struck: a road step costs the same third of a point for everybody, and nothing bends that price. † your roads carry your units further than anybody else’s
- **Field Hospitals** — A piece mends only where it rests: one that moved or struck this turn heals nothing, here or anywhere.
- **Decisive Blows** — A fight is decided by points on one ledger rather than by a share of the blow, so what was written as extra damage is printed as a strength line.
- **Harbourmasters** — A trade route belongs to the empire rather than to a town, so the extra route is the realm’s and not the coast’s.
- **The Consistory** — A faith building is any building of yours that pays faith at all, and the doubling is taken last — after everything else that raised it.
- **Forced March** — The march is quicker and costs nothing: nothing remembers how far a piece walked this turn.
- **Admiralty** — A strength line asks about the hex a fight is on and never about the piece standing on it, so the defence at sea is not built. † +5 combat strength for embarked units
- **The Salon** — The great-person improvements are the academy, landmark, manufactory, customs house and citadel.
- **The Silk Exchange** — A caravan’s line is read from the town that sent it, and nothing yet asks how big the town at the far end has grown. † a song for every second citizen of the city the caravan is sent to
- **The Magister's Court** — The court doubles nothing yet: the fifth age has no great people in it, and no law can yet make a legacy count twice. † the legacies of great people of the fifth age count twice
- **The Great Enquiry** — Dealt only once the last age is reached, and earned only there.
- **The Last Laurels** — Dealt only once the last age is reached, and earned only there.
- **The Salted Earth** — Dealt only once the last age is reached, and earned only there.
- **The Final Proclamation** — Dealt only once the last age is reached, and earned only there.
- **The Muses' Call** — Renown banks from the first turn whether or not anybody answers it. This opens the door early, and opens it with somebody already through.
- **Mountain Hold** — The mountain has to stand inside the city’s own borders. A peak the bounds have not reached yet shelters nobody.
- **The Burning Way** — The axes are free, but the ground keeps no memory of the woods: land you have cleared pays what bare land pays.
- **The Gentle Yoke** — The extra writ is asked of every city you hold, however long you have held it.
- **The Great Warring Tribes** — The courthouse clause did nothing — there is no courthouse in the game — and is struck.
- **Hegemony** — A city you take costs one authority — the least any law can make it.
- **The Pilgrim Ways** — Nothing yet marks the turn a city changes its faith, so the foreign congregation is counted rather than paid for at the moment it is won.
- **The Sea Charter** — The clause about founding coastal cities with a Harbour is struck: nothing founds a city with a building it has not built.
- **The Renaissance Court** — The clause about stronger legacies is struck: nothing makes a legacy stronger.
- **The Philosopher's Stone** — The clause about distilleries is struck: there is no distillery in the game.
- **The Closed Realm** — Not built, both halves. Nothing in this game can hold a meter at a number instead of adding to it, and nothing can refuse an attack for where it is being made. † your happiness is held at +5 whatever your cities ask for · your units cannot attack outside your own territory
