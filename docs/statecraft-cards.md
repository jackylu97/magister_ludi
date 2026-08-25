# Statecraft — Orders, Doctrines and governments (working doc, third pass)

Mechanics: ledger Entry XV + XV.b. **Orders** are slottable, entry-sealed, drafted on the
culture meter (3 new + 1 upgrade), amnestied on adoption. **Doctrines** are permanent,
occupy no slot, and are drafted 1-of-3 at each government adoption from that tier's pool —
three irreversible identity beats per game. Archetype lines thread BOTH classes: an Order
thread you invest in is what makes its Doctrine worth taking when adoption day comes.

Your three inline edits from the pre-split draft are preserved and marked ✎.

## The archetype lines

| Line | Playstyle | Orders thread → Doctrine payoff |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy | Camp Followers → Spoils of the Wild → Blood Tribute → Terror of the Steppe · doctrines: The Ransom Code, Wolf-Mother's Pact, The Iron Price |
| 🐫 **The Long Caravan** | luxuries, gold | Salt Tithes → Silk Roads → Sumptuary Laws → Imperial Tax · doctrines: Thalassocracy, The Gilded Court, The Grand Bazaar |
| 🌱 **The Green Belt** | tall growth | Common Granary → Terrace Fields → Three-Field Rotation → Breadbasket Edicts · doctrines: The Hermit Crown, River Kings |
| ⚒ **The Forge Levy** | wide production, war | War Drums → Levy Muster → Standing Army → Professional Legions · doctrines: The Woodwrights, Mountain Hold, The Burning Way |
| ✶ **The Star Chart** | science | Curious Elders → Scribal Schools → Court Astronomers → The Academy · doctrines: Athenaeum of the Road, Master of Maps |
| 🕯 **The Procession** | faith engine | First Rites → Pilgrim Roads → Mandate of Heaven · doctrines: The Great Litany, Divine Inspiration, The Tithe |
| 🧭 **The Wayfarers** | exploration | Far Runners → The Cartographers → Antiquarians · doctrines: Athenaeum of the Road, Master of Maps |

## Governments (fixed triples; adoption = slot jump + amnesty + DOCTRINE draft)

| Tier | Choice | Slots (M/E/W) | Signature |
|---|---|---|---|
| 0 | **Chiefdom** | 1/1/0 | — |
| 3 | **Council of Elders** | 1/2/1 | +2 happiness |
| | **War Chief** | 2/1/1 | +15% ⚙ toward units, all cities |
| | **Priest-King** | 1/1/2 | +2🕯 per city |
| 7 | **Republic** | 1/3/2 | +25% border culture · tile purchases −10% |
| | **Tyranny** | 3/1/2 | +3 authority capacity · camps pay +50% |
| | **Theocracy** | 1/2/3 | +2🕯 per city · happiness demand −5% |
| 15 | **Merchant League** | 2/4/3 | +10% 💰 empire · +1💰 per unique luxury |
| | **Imperium** | 4/2/3 | +3 authority capacity · +15% ⚙ toward units |
| | **Divine Mandate** | 2/3/4 | happiness tiers +5pp · +1🎵 per 5🕯 gained/turn |

# DOCTRINES (permanent · slotless · one per adoption)

## Doctrine pool I (offered at the tier-3 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| The Hermit Crown | 🌱 | while you hold ≤3 cities: capital +30% all yields | hook:conditionRule |
| River Kings ✎ | 🌱 | +30% 🌾 in freshwater cities · −10% 🌾 and ⚙ in cities without freshwater | hook:scopeVariant |
| The Woodwrights | ⚒ | chops pay +100% and grant +10🎵 each | windfallRider |
| The Great Litany | 🕯 | +1🎵 per 3🕯 gained per turn | hook:rateConversion |
| The Great Warring Tribes ✎ | ⚒ | negative authority no longer penalises ⚙ toward units · +10% ⚙ toward mounted units · +5🔬 +5🎵 per city · you may never build the courthouse family | meterRule + vocab + hook:productionBar *(courthouse family = the future authority buildings; bar activates when they exist)* |
| Wolf-Mother's Pact ✎ | 🏹 | barbarians never attack you (theft continues) · camps in your sight pay +50% | behaviorRule + windfallRider *(moved from pool III)* |
| Athenaeum of the Road ✎ | 🧭 | for ALL discoveries: claim all three options | offerRider *(moved from pool III — user: the power must arrive while discoveries live; playtest, possibly remove)* |

## Doctrine pool II (offered at the tier-7 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| Thalassocracy | 🐫 | +20% 💰 and 🎵 in coastal cities · coastal cities cost 1 fewer authority | vocab + meterRule |
| Mountain Hold | ⚒ | +25% ⚙ in mountain-adjacent cities · +5 defense there | scopeVariant + combatCardLine |
| The Burning Way | ⚒ | chopping costs no worker charge · pillaging heals 25 | hook:actionRule + windfallRider |
| Bread and Circuses | 🌱 | +1🎵 per point of positive happiness (no cap) | rateConversion |
| The Tithe | 🕯 | +1💰 per 🕯 gained per turn | rateConversion |
| Divine Inspiration ✎ | 🕯 | +1% 🔬 and 🎵 per 1000 banked 🕯 (no max) | countScaled *(scale note: current faith income (~2–5/turn) never reaches 1000 — this number assumes religion-era faith inflation; revisit at the faith milestone)* |
| Religious Mandate ✎ | 🕯 | permanent war with civilizations of a different majority religion · your cities cannot be converted · powerful bonus toward domination/religious victory beads (TBD) | FUTURE: religion + war state + beads — annotated, not built until those systems exist |

## Doctrine pool III (offered at the tier-15 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| The Iron Price ✎ | 🏹 | every combat kill grants +15🎵 · pillaging +15💰 | windfallRider |
| Manifest of the Steppe | — | settlers −40% ⚙, no cost escalation · every city +1 happiness demand | vocab + meterRule |
| The Gilded Court | 🐫 | unlocks Gilded Hall, building can only be purchased for 1000 gold, +3 authority | countScaled |
| The Grand Bazaar | 🐫 | happiness effect of unique luxuries +50%, additional copies of a luxury have 30% effectiveness (instead of 0%, don't contribute extra happiness) · +2💰 per unique luxury | hook:effectAmplifier + countScaled |
| Master of Maps ✎ | 🧭 | all units +1 sight and +1 movement · −10% combat strength | unitStatCard *(rework: the explorer-empire tradeoff)* |

# ORDERS (slottable · sealed · the culture meter's drafts)

## Chiefdom pool (10)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| War Drums | M | ⚒ | +25% ⚙ toward units in the capital | vocab |
| Blooded Spears | M | 🏹 | +3 combat vs barbarians | combatCardLine |
| Camp Followers | M | 🏹 | camp clears also pay +25🌾 | windfallRider |
| Far Runners | M | 🧭 | scouts +1 movement and +1 sight | unitStatCard |
| The Long Watch ✎ | M | — | a unit fortified in a city gives that city +1 happiness, +1 more per fortification level | countScaled (garrison fortification) |
| Common Granary | E | 🌱 | capital +2🌾 | vocab |
| Salt Tithes | E | 🐫 | +1💰 per unique luxury | countScaled |
| Corvée Labour | E | ⚒ | +25% ⚙ toward buildings in the capital | vocab |
| Boundary Stones | E | — | +30% border culture, all cities | vocab |
| First Rites | W | 🕯 | +1🕯 per city | vocab |
| Border Ballads | W | 🏹 | +2🎵 per barbarian camp you can currently see | countScaled *(fear makes poets)* |
| The Widow's Levy | M | — | when a unit of yours dies, its nearest city gains +10⚙ | windfallRider (death) |

## Government I pool (15)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Levy Muster | M | ⚒ | +15% ⚙ toward units, all cities | vocab |
| Border Wardens | M | — | +3 combat inside your territory | combatCardLine |
| Conscription | M | ⚒ | +50% ⚙ toward units · −2 happiness | vocab |
| Spoils of the Wild | M | 🏹 | camp bounties +100% | windfallRider |
| Weights & Measures | E | 🐫 | +2💰 per city | vocab |
| Silk Roads | E | 🐫 | +2💰 per unique luxury | countScaled |
| Terrace Fields | E | 🌱 | +15% 🌾, all cities | vocab |
| Land Grants | E | — | tile purchases −25% · +40% border culture | vocab |
| Homestead Charters ✎ | E | — | newly founded cities start with an extra population | hook:foundingRider |
| Census Rolls | E | — | +2 authority capacity | vocab |
| Festival Days | W | 🌱 | +3 happiness | vocab |
| Scribal Schools | W | ✶ | +10% 🔬, all cities | vocab |
| Curious Elders | W | ✶ | +5🔬 whenever you claim a discovery | windfallRider |
| Horse Lords | M | ⚒ | mounted units +1 movement | unitStatCard (class) |
| The Salt Road | E | 🐫 | +1💰 per improved bonus resource | countScaled |
| Granary Levies | E | 🌱 | when a city grows, it gains +10⚙ | windfallRider (growth) |
| Rites of Passage | W | 🕯 | completing a unit grants +2🕯 | windfallRider |

## Government II pool (16)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Standing Army | M | ⚒ | +20% ⚙ toward units · new units heal 10 on completion | vocab + unitStatCard |
| March Discipline | M | ⚒ | all combat units +1 movement | unitStatCard |
| The Shield Wall | M | ⚒ | +5 combat on hills | combatCardLine |
| Blood Tribute | M | 🏹 | +1 happiness and +1💰 per camp ever cleared (max 6) | countScaled |
| Scorched Earth | M | — | pillaging heals 25 and pays +10💰 | windfallRider |
| Coin Mints | E | 🐫 | +15% 💰, all cities | vocab |
| Sumptuary Laws | E | 🐫 | +1 happiness per unique luxury | countScaled |
| Three-Field Rotation | E | 🌱 | +20% 🌾 · growth carryover +10% | vocab |
| Guild Charters | E | ⚒ | +20% ⚙ toward buildings, all cities | vocab |
| Chartered Companies | E | 🐫 | each tile purchased pays +5🔬 · purchases −15% | windfallRider + vocab |
| Royal Surveyors | E | — | +50% border culture · tile purchases −25% | vocab |
| Provincial Governors | E | — | +3 authority capacity | vocab |
| Pilgrim Roads | W | 🕯 | +2🕯 per city · +1 happiness per 20 banked 🕯 (max +3) | vocab + countScaled |
| The Cartographers | W | 🧭 | +2🔬 per unclaimed discovery you can see · scouts +1 movement | countScaled + unitStatCard |
| Publicani | E | 🐫 | +1💰 per point of positive authority | rateConversion (the writ farmed for coin) |
| Ore Tithes | E | ⚒ | +3⚙ in each city holding an improved strategic resource | scopeVariant (holding-scoped) |
| Siege Doctrine | M | ⚒ | +5 combat when attacking cities | combatCardLine |
| Foreign Quarters | E | 🐫 | +1💰 and +1🔬 in cities adjacent to another civilization's territory | scopeVariant (frontier) |

## Government III pool (16)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Professional Legions | M | ⚒ | +30% ⚙ toward units · units heal +10 in territory | vocab + unitStatCard |
| Terror of the Steppe | M | 🏹 | +5 combat vs barbarians · camps pay triple · clears grant +10🎵 | combatCardLine + windfallRider |
| The Marshals | M | ⚒ | +2 combat per adjacent friendly combat unit (max +4) | combatCardLine (adjacency) |
| Garrison State | M | ⚒ | each city +2⚙ per garrisoned combat unit (cap +4/city) | countScaled |
| Imperial Tax | E | 🐫 | +25% 💰, all cities | vocab |
| Breadbasket Edicts | E | 🌱 | +25% 🌾 · growth carryover +25% | vocab |
| The Great Works | E | ⚒ | +30% ⚙ toward buildings, all cities | vocab |
| Client Kings | E | — | +4 authority capacity · captured cities cost 2 | vocab + meterRule |
| Mandate of Heaven | W | 🕯 | happiness tiers +5pp · +1 authority capacity per 25 banked 🕯 (max +4) | vocab + countScaled |
| The Academy | W | ✶ | +20% 🔬 · techs completed grant +10🎵 | vocab + windfallRider |
| Antiquarians | W | 🧭 | discoveries offer 4 options · claim payouts +50% | offerRider |
| Court Astronomers | W | ✶ | +15% 🔬, all cities | vocab |
| Patronage of the Arts | W | — | +15% 🎵, all cities | vocab |
| Toleration Edicts | W | — | happiness demand −15% | vocab |
| Skirmishers' Creed | M | ⚒ | ranged units +1 range | unitStatCard (class) |
| The Finisher's Art | M | — | +5 combat against units below half strength | combatCardLine (state) |
| Census of Souls | W | 🕯 | +1🕯 per 2 population in your capital | countScaled |

*(Sorting notes: Hostage Takers → The Ransom Code, promoted to Doctrine. Litanies → The
Great Litany, promoted. Slash and Burn + the Scorched-Earth heal merged into The Burning
Way (Doctrine); Scorched Earth keeps the pay-and-heal Order form. Wandering Players and
The Grand Stage trimmed as redundant culture staples. Your ✎ edits: River Kings gained its
freshwater drawback (now a true drawback Doctrine), Homestead Charters became founding
population (new hook:foundingRider — founding-time effects, reusable), The Long Watch
became the garrison-happiness card and moved off sight/defense.)*

## Implementation notes

- 18 Doctrines (5/6/7 per tier, drawn without replacement) + 51 Orders. Hooks:
  combatCardLine, unitStatCard, windfallRider (now incl. death/growth riders), foundingRider,
  countScaled, rateConversion, offerRider, effectAmplifier, meterRule, conditionRule,
  scopeVariant (geographic + holding-scoped + frontier), actionRule, behaviorRule,
  productionBar (a card forbidding a build family).
- Doctrines: permanent, slotless, one per adoption, dice reroll the offer. Drawback
  doctrines sanctioned; drawback Orders stay mild.
- Faith scalers capped; all numbers data.
- The Orders offer UI is the discoveries' offerCard in Statecraft dress; the Doctrine offer
  is the same card in a heavier frame (it is adoption day); the collection/slots screen is
  new (the Orders screen — naming bible).

## Revisions

*(yours — edit away)*
