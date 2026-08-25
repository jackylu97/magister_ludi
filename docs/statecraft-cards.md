# Statecraft — the card pools and governments (working doc, second pass)

Mechanics ratified in Entry XV. This pass (2026-08-25, per user direction): bigger pools,
**named archetype lines threading all four pools** (a roguelike draft is a promise your later
drafts keep), cards keyed to resource holdings and underused mechanics, and a power level up
~1.5–2× — a slotted card should feel like a decision, not a rounding error.

**Mechanism** column: `vocab` = one-line reuse of the existing effect vocabulary;
`hook:<name>` = a named extension built once. The hook set grew by two:
- `countScaled` — an effect × a deterministic count (unique luxuries held, camps cleared
  lifetime, discoveries claimed, techs known, cities founded, banked faith ÷ N). The
  deckbuilder's scaling engine; one hook, many cards.
- `rateConversion` — a per-turn trickle derived from another rate/pool (the pre-religion
  faith sinks live here).
Doctrine notes: resource-synergy cards scale off *counts of holdings* (empire rates), never
tile yields — tiles are the masteries' lane. Two-stage percents per Entry XVII (cards are
city-stage unless marked empire).

## The archetype lines (the promise structure)

| Line | Playstyle | Thread |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy, map violence | Camp Followers → Spoils of the Wild → Blood Tribute → Terror of the Steppe |
| 🐫 **The Long Caravan** | luxuries, gold, trade-to-be | Salt Tithes → Silk Roads → Sumptuary Laws → The Grand Bazaar |
| 🌱 **The Green Belt** | tall growth, happiness | Common Granary → Terrace Fields → Three-Field Rotation → Breadbasket Edicts |
| ⚒ **The Forge Levy** | wide production, war | War Drums → Levy Muster → Standing Army → Professional Legions |
| ✶ **The Star Chart** | science, discoveries | Curious Elders → Scribal Schools → Court Astronomers → The Academy |
| 🕯 **The Procession** | faith engine (the pre-religion sink) | First Rites → Litanies → Pilgrim Roads → Divine Inspiration |
| 🧭 **The Wayfarers** | exploration, discoveries, map | Far Runners → The Cartographers → Antiquarians → Master of Maps |

Every pool carries every line, so any draft can start or deepen a thread; the upgrade slot
(3-new+1-upgrade) is how a thread compounds when the pool moves on.

## Governments (fixed triples — deterministic spine)

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

## Chiefdom pool (10 — humble but felt)

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| War Drums | M | ⚒ | +25% ⚙ toward units in the capital | vocab |
| Blooded Spears | M | 🏹 | +3 combat vs barbarians | hook:combatCardLine |
| Camp Followers | M | 🏹 | camp clears also pay +25🌾 | hook:windfallRider |
| Far Runners | M | 🧭 | scouts +1 movement and +1 sight | hook:unitStatCard |
| Common Granary | E | 🌱 | capital +2🌾 | vocab |
| Salt Tithes | E | 🐫 | +1💰 per unique luxury you hold | hook:countScaled |
| Corvée Labour | E | ⚒ | +25% ⚙ toward buildings in the capital | vocab |
| Boundary Stones | E | — | +30% border culture, all cities | vocab |
| First Rites | W | 🕯 | +1🕯 per city | vocab |
| Curious Elders | W | ✶ | +5🔬 whenever you claim a discovery | hook:windfallRider |

## Government I pool (14 — tiers 3–6)

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Levy Muster | M | ⚒ | +15% ⚙ toward units, all cities | vocab |
| Border Wardens | M | — | +3 combat inside your territory | hook:combatCardLine |
| Spoils of the Wild | M | 🏹 | camp bounties +100% (gold and food) | hook:windfallRider |
| Hostage Takers | M | 🏹 | stolen/rescued civilians: rescuing pays +25💰; your civilians cannot be stolen while a combat unit is within 1 hex | hook:unitStatCard (guard radius) |
| Weights & Measures | E | 🐫 | +2💰 per city | vocab |
| Silk Roads | E | 🐫 | +2💰 per unique luxury | hook:countScaled |
| Terrace Fields | E | 🌱 | +15% 🌾, all cities | vocab |
| Land Grants | E | — | tile purchases −25% · +40% border culture | vocab |
| Census Rolls | E | — | +2 authority capacity | vocab |
| Festival Days | W | 🌱 | +3 happiness | vocab |
| Litanies | W | 🕯 | +1🎵 per 3🕯 gained per turn | hook:rateConversion |
| Scribal Schools | W | ✶ | +10% 🔬, all cities | vocab |
| The Cartographers | W | 🧭 | +2🔬 per turn per unclaimed discovery you can see · scouts +1 movement | hook:countScaled + unitStatCard |
| Wandering Players | W | — | +10% 🎵, all cities | vocab |

## Government II pool (14 — tiers 7–14)

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Standing Army | M | ⚒ | +20% ⚙ toward units · new units heal 10 on completion | vocab + hook:unitStatCard |
| March Discipline | M | ⚒ | all combat units +1 movement | hook:unitStatCard |
| Blood Tribute | M | 🏹 | +1 happiness and +1💰 per camp you have ever cleared (max 6) | hook:countScaled |
| Scorched Earth | M | — | pillaging heals the unit 25 and pays +10💰 | hook:windfallRider |
| Coin Mints | E | 🐫 | +15% 💰, all cities | vocab |
| Sumptuary Laws | E | 🐫 | +1 happiness per unique luxury | hook:countScaled |
| Three-Field Rotation | E | 🌱 | +20% 🌾, all cities · growth carryover +10% | vocab |
| Guild Charters | E | ⚒ | +20% ⚙ toward buildings, all cities | vocab |
| Royal Surveyors | E | — | +50% border culture · tile purchases −25% | vocab |
| Provincial Governors | E | — | +3 authority capacity | vocab |
| Pilgrim Roads | W | 🕯 | +2🕯 per city · +1 happiness per 20 banked 🕯 (max +3) | vocab + countScaled |
| Court Astronomers | W | ✶ | +15% 🔬, all cities | vocab |
| Antiquarians | W | 🧭 | discoveries offer 4 options instead of 3 · claim payouts +50% | hook:offerRider |
| Patronage of the Arts | W | — | +15% 🎵, all cities | vocab |

## Government III pool (14 — tier 15+, run-defining)

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Professional Legions | M | ⚒ | +30% ⚙ toward units · units heal +10 in territory | vocab + unitStatCard |
| Terror of the Steppe | M | 🏹 | +5 combat vs barbarians · camps pay triple · cleared camps grant +10🎵 | combatCardLine + windfallRider |
| The Marshals | M | ⚒ | +2 combat for every adjacent friendly combat unit (max +4) | hook:combatCardLine (adjacency) |
| Imperial Tax | E | 🐫 | +25% 💰, all cities | vocab |
| The Grand Bazaar | E | 🐫 | every luxury signature effect +50% · +2💰 per unique luxury | hook:effectAmplifier + countScaled |
| Breadbasket Edicts | E | 🌱 | +25% 🌾 · growth carryover +25% | vocab |
| The Great Works | E | ⚒ | +30% ⚙ toward buildings, all cities | vocab |
| Client Kings | E | — | +4 authority capacity · captured cities cost 2 (not 3) | vocab + hook:meterRule |
| Mandate of Heaven | W | 🕯 | happiness tiers +5pp · +1 authority capacity per 25 banked 🕯 (max +4) | vocab + countScaled |
| Divine Inspiration | W | 🕯 | +1% 🔬 and 🎵 per 10 banked 🕯 (max +20%) | hook:countScaled |
| The Academy | W | ✶ | +20% 🔬 · techs completed grant +10🎵 | vocab + windfallRider |
| Master of Maps | W | 🧭 | +15🔬 and +15💰 per discovery claimed from here on · your units ignore terrain cost in neutral territory | countScaled + unitStatCard |
| The Grand Stage | W | — | +20% 🎵 · +1 happiness per 2 cities | vocab + countScaled |
| Toleration Edicts | W | — | happiness demand −15% | vocab |

## ⚡ The benders (added pass three — narrow, plan-warping; keep beside the staples)

Litanies-model cards: alternate engines, geography commitments, and honest tradeoffs. A
bender should be a dead draft in the wrong run and the whole plan in the right one.

**Chiefdom / Gov I additions**

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| The Hermit Crown | E | 🌱 | while you hold ≤3 cities: capital +30% all yields | hook:conditionRule (city count) |
| Conscription | M | ⚒ | +50% ⚙ toward units · −2 happiness | vocab (negative lines are lines) |
| River Kings | E | 🌱 | +30% 🌾 in freshwater cities | hook:scopeVariant (freshwater) |
| The Woodwrights | E | ⚒ | chops pay +100% and grant +10🎵 each | windfallRider |
| Homestead Charters | E | — | founding a city pays it +20🌾 immediately | windfallRider (founding) |
| The Long Watch | M | — | sleeping and fortified units: +1 sight, +4 defense | unitStatCard (state-conditional) |

**Gov II additions**

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Bread and Circuses | W | 🌱 | +2🎵 per point of positive happiness (cap +12) | rateConversion |
| The Tithe | E | 🕯 | +1💰 per 🕯 gained per turn | rateConversion |
| Thalassocracy | E | 🐫 | +20% 💰 and 🎵 in coastal cities · coastal cities cost 0 authority | vocab (coastal scope) + meterRule |
| Mountain Hold | M | ⚒ | +25% ⚙ in mountain-adjacent cities · +5 defense there | scopeVariant + combatCardLine |
| Chartered Companies | E | 🐫 | each tile purchased also pays +5🔬 · purchases −15% | windfallRider (purchase) + vocab |
| Slash and Burn | E | ⚒ | chopping costs no worker charge | hook:actionRule |
| The Shield Wall | M | ⚒ | +5 combat on hills | combatCardLine (terrain) |

**Gov III additions**

| Card | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Manifest of the Steppe | E | — | settlers −40% ⚙ and no cost escalation · every city −1 extra happiness demand | vocab + meterRule |
| The Gilded Court | E | 🐫 | +1 authority capacity per 50💰 held (cap +5) | countScaled (treasury) |
| Wolf-Mother's Pact | M | 🏹 | barbarians never attack you (theft continues) · camps in your sight pay +50% | hook:behaviorRule + windfallRider |
| The Iron Price | M | 🏹 | every combat kill grants +5🎵 · pillaging +15💰 | windfallRider (combat) |
| Athenaeum of the Road | W | 🧭 | your first discovery each Æra: claim ALL THREE options | offerRider |
| Garrison State | M | ⚒ | each city +2⚙ per garrisoned combat unit (cap +4/city) | countScaled (garrison) |

New hooks this adds: `conditionRule` (an effect gated on a deterministic empire condition,
evaluated with the meters each refresh), `scopeVariant` (freshwater/mountain-adjacent city
scopes beside the existing coastal), `actionRule` (a command's cost rule changes while
slotted — the free chop), `behaviorRule` (the barbarian phase consults slotted cards; the
Pact is its only client v1). Tradeoffs are ordinary negative vocabulary lines — no special
machinery, and the breakdown prints them signed like everything else (rule 5).

## Implementation notes

- 52 cards. Hooks now: `combatCardLine` (labeled preview lines; terrain/adjacency variants),
  `unitStatCard` (movement/sight/heal/guard through each stat's one evaluator),
  `windfallRider` (scale/add to Entry XVIII payouts — modifier-immunity applies to the BASE;
  a rider is part of the printed number, documented), `countScaled`, `rateConversion`,
  `offerRider` (discovery offer size/quality), `effectAmplifier` (Grand Bazaar; amplifies
  the luxury vocabulary's own numbers), `meterRule` (Client Kings touches a meters constant).
- Banked-faith caps: every faith-scaling card carries a max so the pool stays a resource,
  not an exponent. All caps/amounts data.
- Power: tier-I percentages 15–20, tier-III 25–30 or a rule; scaling cards cap where noted.
- Placeholders from pass one (war-state, spawn hooks) dropped rather than carried.

## Revisions

*(yours — edit away)*
