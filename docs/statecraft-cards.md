# Statecraft — Orders, Doctrines and governments (working doc, fourth pass)

Mechanics: ledger Entry XV + XV.b. **Orders** are slottable, entry-sealed, drafted on the
culture meter (3 new + 1 upgrade), amnestied on adoption. **Doctrines** are permanent,
occupy no slot, and are drafted 1-of-3 at each government adoption from that tier's pool.

### Upgrades (fixed 2026-08-26)

A level-2 face is the printed face's numbers `×1.5`, floored per figure — **and advanced by
at least one whole point per level**. That last clause is the fix: `floor(1 × 1.5)` is `1`,
so before it, *nineteen of the sixty-five Orders* could be dealt as the draft's upgrade
option and change nothing at all. Every card that prints a number is now deepenable; a card
that prints none (`The Loose Rein`, `The Common Purse`, `The Standing Levy` — three
switches) carries `"upgradable": false` on its row and the upgrade slot never rolls it.
Giving one of those three a second face is a design decision, not a data edit: write the
clause and delete the flag. `test/sim/statecraft.test.ts` holds both halves together, in
both directions, so the flag cannot be used to hide a row that just needs a bigger number.

Pass four (user rulings 2026-08-25): **no card depending on barbarians or discoveries past
Chiefdom/Gov I** (those systems fade by the Age of Empire), and **no "flat +X% of a yield"
Orders** (generically strong, uninteresting). Every surviving percentage is a *category*
(toward units/buildings) with a second clause, a *channel* (border culture), or scoped to
a real condition. Cards marked ✎ carry the user's own edits.

## The archetype lines

| Line | Playstyle | Orders thread → Doctrine payoff |
|---|---|---|
| 🏹 **The Wild Hunt** *(early — resolves by Gov II)* | barbarian economy | Blooded Spears → Camp Followers → Spoils of the Wild · doctrine: Wolf-Mother's Pact |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates | Salt Tithes → Silk Roads → Sumptuary Laws → Provincial Mints · doctrines: Thalassocracy, The Gilded Court, The Grand Bazaar |
| 🌱 **The Green Belt** | tall growth | Common Granary → Granary Levies → Terraced Hillsides → The Grain Dole · doctrines: The Hermit Crown, River Kings, Pax Imperia |
| ⚒ **The Forge Levy** | wide production, war | Conscription → Horse Lords → Ore Tithes → Garrison State · doctrines: The Woodwrights, Mountain Hold, The Burning Way, Hegemony |
| ✶ **The Star Chart** | science | Curious Elders → Scholars' Stipend → The Lyceum · doctrine: Master of Maps |
| 🕯 **The Procession** | faith engine | First Rites → Rites of Passage → Pilgrim Roads → Mandate of Heaven · doctrines: The Great Litany, The Tithe, Divine Inspiration |
| 🧭 **The Wayfarers** *(early)* | exploration | Far Runners → Curious Elders · doctrine: Athenaeum of the Road |

## Governments (fixed triples; adoption = slot jump + amnesty + DOCTRINE draft)

Signatures rewritten off the flat-% rule too.

| Tier | Choice | Slots (M/E/W) | Signature |
|---|---|---|---|
| 0 | **Chiefdom** | 1/1/0 | — |
| 3 | **Council of Elders** | 1/2/1 | +2 happiness |
| | **War Chief** | 2/1/1 | +1 combat strength per 2 cities you hold (max +4) |
| | **Priest-King** | 1/1/2 | +2🕯 per city |
| 7 | **Republic** | 1/3/2 | +25% border culture · tile purchases −10% |
| | **Tyranny** | 3/1/2 | +3 authority capacity · pillaging pays +10💰 |
| | **Theocracy** | 1/2/3 | +2🕯 per city · happiness demand −5% |
| 15 | **Merchant League** | 2/4/3 | +1💰 per city · +1💰 per unique luxury |
| | **Imperium** | 4/2/3 | +3 authority capacity · units +1 movement inside your territory |
| | **Divine Mandate** | 2/3/4 | happiness tiers +5pp · +1🎵 per 5🕯 gained/turn |

# DOCTRINES (permanent · slotless · one per adoption)

## Doctrine pool I (offered at the tier-3 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| The Hermit Crown | 🌱 | while you hold ≤3 cities: capital +30% all yields | hook:conditionRule |
| River Kings ✎ | 🌱 | +30% 🌾 in freshwater cities · −10% 🌾 and ⚙ in cities without freshwater | hook:scopeVariant |
| The Woodwrights | ⚒ | chops pay +100% and grant +10🎵 each | windfallRider |
| The Great Litany | 🕯 | +1🎵 per 3🕯 gained per turn | hook:rateConversion |
| The Great Warring Tribes ✎ | ⚒ | negative authority no longer penalises ⚙ toward units · +10% ⚙ toward mounted units · conquered cities provide +5 science and culture · you may never build the courthouse family | meterRule + vocab + hook:productionBar *(see critique: the flat per-city 🔬🎵 is the strongest line in pool I and off-theme; courthouse bar is free until that family exists)* |
| Wolf-Mother's Pact ✎ | 🏹 | barbarians never attack you (theft continues) · camps in your sight pay +50% | behaviorRule + windfallRider |
| Athenaeum of the Road ✎ | 🧭 | for ALL discoveries: claim all three options | offerRider *(user: playtest, possibly remove — see critique re: power)* |
| The Founders' Road ✎ *(new)* | — | your first 5 cities are founded with a free monument · cities are automatically joined by roads | foundingRider + FUTURE: roads (the road half activates with the road system; the monument half ships now) |

## Doctrine pool II (offered at the tier-7 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| Thalassocracy ✎ | 🐫 | +20% 💰 and 🎵 in coastal cities · coastal cities cost 1 fewer authority | vocab (coastal scope) + meterRule |
| Mountain Hold | ⚒ | +25% ⚙ in mountain-adjacent cities · +5 defense there | scopeVariant + combatCardLine |
| The Burning Way | ⚒ | chopping costs no worker charge · pillaging heals 25 | hook:actionRule + windfallRider |
| Bread and Circuses ✎ | 🌱 | +1🎵 per point of positive happiness (no cap) | rateConversion |
| The Tithe | 🕯 | +1💰 per 🕯 gained per turn | rateConversion |
| Divine Inspiration ✎ | 🕯 | +1% 🔬 and 🎵 per 200 banked 🕯 (no max) | countScaled *(scale note: unreachable at current faith income; assumes religion-era inflation — revisit at the faith milestone)* |

## Doctrine pool III (offered at the tier-15 adoption)

| Doctrine | Line | Effect | Mechanism |
|---|---|---|---|
| The Iron Price ✎ | ⚒ | every combat kill grants +15🎵 · pillaging +15💰 | windfallRider |
| Manifest of the Steppe | — | settlers −40% ⚙, no cost escalation · every city +1 happiness demand | vocab + meterRule |
| The Gilded Court ✎ | 🐫 | unlocks the Gilded Hall: a building purchasable only, for 1000💰 · +3 authority capacity | hook:unlocksBuilding *(price note: 1000💰 is a whole game's income today — tune with the gold loop)* |
| The Grand Bazaar ✎ | 🐫 | happiness from unique luxuries +50% · additional copies of a luxury count at 30% (instead of 0) · +2💰 per unique luxury | hook:effectAmplifier + countScaled |
| Master of Maps ✎ | 🧭 | all units +1 sight and +1 movement · −10% combat strength | unitStatCard |
| Hegemony *(new)* | ⚒ | +1 authority capacity per city you hold · captured cities cost 2 | countScaled + meterRule *(the wide-empire identity: cities fund their own writ)* |
| Pax Imperia *(new)* | 🌱 | cities of 8+ population: +3 happiness and +3🎵 each | scopeVariant (population threshold) *(the tall-empire identity)* |

## Doctrines awaiting systems (not in a live pool until their systems exist)

| Doctrine | Needs | Effect |
|---|---|---|
| Religious Mandate ✎ | religion · war state · beads | permanent war with civilizations of a different majority religion · your cities cannot be converted · powerful bonus toward domination/religious victory beads (TBD) |

# ORDERS (slottable · sealed · the culture meter's drafts)

## Chiefdom pool (10)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Blooded Spears | M | 🏹 | +3 combat vs barbarians | combatCardLine |
| Camp Followers | M | 🏹 | camp clears also pay +25🌾 | windfallRider |
| Far Runners | M | 🧭 | scouts +1 movement and +1 sight | unitStatCard |
| The Long Watch ✎ | M | — | a unit fortified in a city gives that city +1 happiness, +1 more per fortification level | countScaled (garrison fortification) |
| The Widow's Levy | M | — | when a unit of yours dies, its nearest city gains +10⚙ | windfallRider (death) |
| Common Granary | E | 🌱 | +1 food on resource tiles | vocab |
| Salt Tithes | E | 🐫 | +1💰 per unique luxury | countScaled |
| Boundary Stones | E | — | +30% border culture, all cities | vocab (channel) |
| First Rites | W | 🕯 | +1🕯 per city | vocab |
| Border Ballads | W | 🏹 | +2🎵 per barbarian camp you can currently see | countScaled |
| Militia Levies *(neutral)* | M | — | all your cities +5 defense and +1 sight radius | hook:cityStatCard |

## Government I pool (17)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Border Wardens | M | — | +3 combat inside your territory | combatCardLine |
| Vanguard *(new)* | M | ⚒ | +3 combat outside your territory | combatCardLine *(Border Wardens' mirror — the aggression posture)* |
| Conscription | M | ⚒ | +50% ⚙ toward units · −2 happiness | vocab (category + tradeoff) |
| Spoils of the Wild | M | 🏹 | camp bounties +100% | windfallRider |
| Horse Lords | M | ⚒ | mounted units +1 movement | unitStatCard (class) |
| Weights & Measures | E | 🐫 | +2💰 per city | vocab |
| Silk Roads | E | 🐫 | +2💰 per unique luxury | countScaled |
| The Salt Road | E | 🐫 | +1💰 per improved bonus resource | countScaled |
| The Tax Farm *(new)* | E | 🐫 | +1💰 per 3 population, empire-wide | countScaled *(the population faucet)* |
| Harbour Dues *(new)* | E | 🐫 | coastal cities +2💰 and +1🎵 | vocab (coastal scope, flats) |
| Land Grants | E | — | tile purchases −25% · +40% border culture | vocab (channels) |
| Homestead Charters ✎ | E | — | newly founded cities start with an extra population | hook:foundingRider |
| Granary Levies | E | 🌱 | when a city grows, it gains +10⚙ | windfallRider (growth) |
| Census Rolls | E | — | +2 authority capacity | vocab |
| Festival Days | W | 🌱 | +3 happiness | vocab |
| Curious Elders | W | ✶ | +5🔬 whenever you claim a discovery | windfallRider |
| Rites of Passage | W | 🕯 | completing a unit grants +2🕯 | windfallRider |
| Tinkers' Guild *(neutral)* | E | — | workers are built with +1 charge | unitStatCard (class) |
| Public Granaries *(neutral)* | E | — | cities keep 25% of their food basket on growth | vocab (growthCarryover) |
| The Loose Rein *(neutral)* | W | — | your Orders' seals last 2 turns instead of 5 | hook:metaRule *(the flexibility card — pairs with any swap-heavy plan)* |

## Government II pool (17)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| Field Surgeons *(new)* | M | ⚒ | units heal +5 per turn anywhere | unitStatCard |
| March Discipline | M | ⚒ | all combat units +1 movement | unitStatCard |
| The Shield Wall | M | ⚒ | +5 combat on hills | combatCardLine |
| Siege Doctrine | M | ⚒ | +5 combat when attacking cities | combatCardLine |
| Scorched Earth | M | — | pillaging heals 25 and pays +10💰 | windfallRider |
| Sumptuary Laws | E | 🐫 | +1 happiness per unique luxury | countScaled |
| Publicani | E | 🐫 | +1💰 per point of positive authority | rateConversion |
| Chartered Companies | E | 🐫 | each tile purchased pays +5🔬 · purchases −15% | windfallRider + vocab |
| Foreign Quarters | E | 🐫 | +1💰 and +1🔬 in cities adjacent to another civilization's territory | scopeVariant (frontier) |
| Ore Tithes | E | ⚒ | +3⚙ in each city holding an improved strategic resource | scopeVariant (holding) |
| Terraced Hillsides *(new)* | E | 🌱 | +1🌾 per worked hill tile in each city (cap +4) | countScaled (worked tiles) |
| Master Masons *(new)* | E | ⚒ | completing a building grants +5🎵 | windfallRider (completion) |
| Royal Surveyors | E | — | +50% border culture · tile purchases −25% | vocab (channels) |
| Provincial Governors | E | — | +3 authority capacity | vocab |
| Pilgrim Roads | W | 🕯 | +2🕯 per city · +1 happiness per 20 banked 🕯 (max +3) | vocab + countScaled |
| Lamplighters *(new)* | W | 🕯 | +1🎵 per 5🕯 gained per turn | rateConversion *(the Litany's lesser cousin)* |
| Scholars' Stipend *(new)* | W | ✶ | +2🔬 in each city of 5+ population | scopeVariant (population threshold) |
| Emergency Powers *(neutral)* | E | — | while authority is negative: capital +25% ⚙ and borders do not freeze | conditionRule + meterRule *(the overextension safety valve)* |
| The Common Purse *(neutral)* | E | — | production overflow from a completed item is doubled | hook:actionRule (overflow) |

## Government III pool (14)

| Order | Type | Line | Effect | Mechanism |
|---|---|---|---|---|
| The Marshals | M | ⚒ | +2 combat per adjacent friendly combat unit (max +4) | combatCardLine (adjacency) |
| Garrison State | M | ⚒ | each city +2⚙ per garrisoned combat unit (cap +4/city) | countScaled |
| Skirmishers' Creed | M | ⚒ | ranged units +1 range | unitStatCard (class) |
| The Finisher's Art | M | — | +5 combat against units below half strength | combatCardLine (state) |
| Frontier Forts *(new)* | M | — | +6 defense in cities within 3 hexes of a foreign border | scopeVariant (frontier) + combatCardLine |
| Triumphs *(new)* | M | ⚒ | capturing a city grants +30🎵 | windfallRider (capture) |
| Client Kings | E | — | +4 authority capacity · captured cities cost 2 | vocab + meterRule |
| Provincial Mints *(new)* | E | 🐫 | +1💰 per improved luxury copy — duplicates count | countScaled *(Grand Bazaar's companion)* |
| Quarrymen's Guild *(new)* | E | ⚒ | +3⚙ in cities holding stone or marble | scopeVariant (holding) |
| The Grain Dole *(new)* | E | 🌱 | cities of 6+ population: +2 happiness each | scopeVariant (population threshold) |
| Mandate of Heaven | W | 🕯 | happiness tiers +5pp · +1 authority capacity per 25 banked 🕯 (max +4) | vocab + countScaled |
| The Lyceum | W | ✶ | completing a technology grants +15🎵 | windfallRider *(The Academy, shorn of its %)* |
| Census of Souls | W | 🕯 | +1🕯 per 2 population in your capital | countScaled |
| Toleration Edicts | W | — | happiness demand −15% | vocab (rulePercent) |
| The Standing Levy *(neutral)* | M | — | every city may complete one unit per turn from its basket even if the queue holds a building first (units jump the queue when affordable) | hook:actionRule (queue) |

*(Pass-four cuts: barbarian/discovery cards beyond Gov I — Blood Tribute, Terror of the
Steppe, The Cartographers, Antiquarians, Tyranny's camp clause. Flat-% yields — War Drums,
Corvée Labour, Levy Muster, Terrace Fields, Scribal Schools, Coin Mints, Three-Field
Rotation, Guild Charters, Imperial Tax, Breadbasket Edicts, The Great Works, Court
Astronomers, Patronage of the Arts, Professional Legions, Standing Army, and the % halves
of The Academy and three government signatures. Replaced with twelve scoped/conditional
Orders and two pool-III Doctrines.)*

## Flavor (one line each — the voice of the tech tree's aphorisms)

**Governments**
- Chiefdom — "Whoever speaks last at the fire, speaks for all."
- Council of Elders — "Slow counsel, and no one hanged for it."
- War Chief — "The spear chooses; the rest agree."
- Priest-King — "The gods speak. He translates."
- Republic — "A crowd that learned to sign its name."
- Tyranny — "One will, and the roads run straight."
- Theocracy — "Law is what the altar remembers."
- Merchant League — "Every treaty has a ledger underneath."
- Imperium — "The map is a claim; the legion is the proof."
- Divine Mandate — "Heaven approves. It was asked."

**Doctrines**
- The Hermit Crown — "A small kingdom, held entirely in one hand."
- River Kings — "The river gives; the dry land is told to be grateful."
- The Woodwrights — "A forest is a city that has not been felled yet."
- The Great Litany — "Say it every day and it becomes true."
- The Great Warring Tribes — "No writ runs faster than a horse."
- Wolf-Mother's Pact — "We are not their prey. We are their kin, and they take their share."
- Athenaeum of the Road — "Everything found is kept. Everything kept is known."
- The Founders' Road — "The first stone of every town is a monument to the road that brought it."
- Thalassocracy — "Our borders are wherever the tide reaches."
- Mountain Hold — "The peaks are a wall nobody had to build."
- The Burning Way — "Ash is faster than a plough."
- Bread and Circuses — "Feed them, amuse them, and they will sing for you."
- The Tithe — "A tenth of the harvest, and the gods keep the books."
- Divine Inspiration — "Prayer, given long enough, thinks."
- Religious Mandate — "There is one truth, and we are its army."
- The Iron Price — "Every death a verse; every verse a debt paid."
- Manifest of the Steppe — "There is always more land. There is never enough rest."
- The Gilded Court — "Gold on the walls, gold in the words, gold under the throne."
- The Grand Bazaar — "The second silk is not nothing. The tenth is a fortune."
- Master of Maps — "We see everything. We fear it a little."
- Hegemony — "Every city carries its own weight, and the crown carries none."
- Pax Imperia — "In great cities the noise itself is a kind of peace."

**Orders — Chiefdom**
- Blooded Spears — "The wild taught us. We took notes."
- Camp Followers — "Behind the war, a market."
- Far Runners — "Run until the land is new, then run once more."
- The Long Watch — "A sleepless wall is a comfort to those inside it."
- The Widow's Levy — "Grief works. It always has."
- Common Granary — "One store, one hunger, one answer."
- Salt Tithes — "Salt is small. Its tax is not."
- Boundary Stones — "A stone that says *ours* says it forever."
- First Rites — "Before the temple, the gesture."
- Border Ballads — "Fear, set to a tune, becomes a people."
- Militia Levies — "Every farmer a spear, every roof a watchtower."

**Orders — Government I**
- Border Wardens — "Home ground fights beside you."
- Vanguard — "Strangers' ground fights harder — so must we."
- Conscription — "Everyone serves. Nobody smiles."
- Spoils of the Wild — "Their plunder was ours all along."
- Horse Lords — "The saddle is a country of its own."
- Weights & Measures — "An honest scale is the first tax."
- Silk Roads — "Rare things travel; travel makes them rarer."
- The Salt Road — "Every field pays a toll on its way to market."
- The Tax Farm — "Count the people, and the coin counts itself."
- Harbour Dues — "The sea pays for the privilege of arriving."
- Land Grants — "Land, given freely, is land that was owed."
- Homestead Charters — "The wagon holds one more family than the law allows."
- Granary Levies — "A new mouth is a new pair of hands."
- Census Rolls — "What is counted can be commanded."
- Festival Days — "Idleness, made sacred, keeps the peace."
- Curious Elders — "The old ask questions the young forgot to."
- Rites of Passage — "A sword blessed is a soul enlisted."
- Tinkers' Guild — "One more mend in every bag of tools."
- Public Granaries — "The city eats slowly, and stays fed."
- The Loose Rein — "Laws that change quickly are laws that are watched closely."

**Orders — Government II**
- Field Surgeons — "Stitched on the road, marching by morning."
- March Discipline — "Legs are the first weapon."
- The Shield Wall — "High ground and a locked line — the old arithmetic."
- Siege Doctrine — "Walls are patient. We are less so."
- Scorched Earth — "What we cannot keep, we salt."
- Sumptuary Laws — "Only the crown wears the purple; all the rest are glad to see it."
- Publicani — "The writ has a price, and we collect it."
- Chartered Companies — "Every deed of land comes with a survey attached."
- Foreign Quarters — "The neighbour's coin spends as well as ours."
- Ore Tithes — "Where the ore is, the hammers gather."
- Terraced Hillsides — "The hill was made to feed us; it only needed steps."
- Master Masons — "Every finished wall is a song about itself."
- Royal Surveyors — "The chain and the plumb line, quietly annexing."
- Provincial Governors — "Distance obeys, if someone is paid to make it."
- Pilgrim Roads — "Where the faithful walk, the faithful settle."
- Lamplighters — "A small flame kept is a small song sung."
- Scholars' Stipend — "A crowd is a library that has not been catalogued."
- Emergency Powers — "When the writ tears, the capital holds the pieces."
- The Common Purse — "Nothing left on the workbench is wasted."

**Orders — Government III**
- The Marshals — "Shoulder to shoulder, the line is one animal."
- Garrison State — "The soldiers do not idle. Nobody does."
- Skirmishers' Creed — "Strike from where they cannot answer."
- The Finisher's Art — "Mercy is for the unwounded."
- Frontier Forts — "The border is where we keep our walls."
- Triumphs — "A city taken is a story told forever."
- Client Kings — "Better a king who bows than a province that rebels."
- Provincial Mints — "Every seam of silk, its own small coin."
- Quarrymen's Guild — "Stone remembers; marble boasts."
- The Grain Dole — "A full city is a quiet one."
- Mandate of Heaven — "The pious are easy to govern, and they know it."
- The Lyceum — "Every new thing learned is a song about the old."
- Census of Souls — "A great city prays in a great voice."
- Toleration Edicts — "Let them keep their gods; they will pay their taxes."
- The Standing Levy — "The spear is always first in line."

## Implementation notes

- 20 Doctrines live (8/6/7) + 1 awaiting systems; 66 Orders (8 neutral, marked). Hooks: combatCardLine
  (terrain/state/adjacency/frontier), unitStatCard (class/heal/state), windfallRider
  (death/growth/completion/capture/discovery/camp), foundingRider, countScaled (holdings,
  population, worked tiles, garrison, banked pools), rateConversion, offerRider,
  effectAmplifier, meterRule, conditionRule, scopeVariant (geographic, holding, frontier,
  population-threshold), actionRule (chop/overflow/queue), behaviorRule, productionBar, unlocksBuilding, cityStatCard
  (city defense/sight), metaRule (a card touching the Statecraft rules themselves — The Loose Rein).
- Doctrines: permanent, slotless, one per adoption, dice reroll the offer. Drawback
  doctrines sanctioned; drawback Orders stay mild.
- All numbers data; scalers capped where noted.
- The Orders offer UI is the discoveries' offerCard in Statecraft dress; the Doctrine offer
  is the same card in a heavier frame; the collection/slots screen is new (the Orders screen).

## As built (2026-08-26)

Ledger Entry XV / XV.b, playable.md item 5. Every card in the tables above ships **whole**
except the four halves listed here, each of which is annotated on its own data row
(`note`, and `deferred` where a named mechanism is missing) so the deferral is legible in
`data/statecraft.json` as well as here.

| Card | What ships | What does not, and what it waits for |
|---|---|---|
| **The Gilded Court** | +3 authority capacity | **The Gilded Hall.** Nothing in the game buys a *building* with gold — the only gold sink is `purchaseTile` — so `unlocksBuilding` has no mechanism to unlock into. It is declared in the vocabulary and read into a *description*, never into a rule. Waits for a building-purchase system. |
| **Religious Mandate** | nothing — it is never dealt | **All of it.** Needs religion, a war state and the beads. It sits at tier 0, which is not a live pool, so `poolDoctrines` can never draw it; a test asserts that. |
| **The Founders' Road** | the free monument, for the first 5 cities | **The roads.** Waits for the road system, exactly as the ratified row says. |
| **The Great Warring Tribes** | the writ exemption, the mounted bonus, the conquered-city yields | **The courthouse prohibition**, inert: no courthouse family exists to forbid. It costs nothing today and needs no code when one does. |

**Magister's Dice are not built.** Entry XV parks them as a currency (cap 3, earned
deterministically) and a reroll is a thing you spend one *on*. Building the verb before the
currency would be guessing what it costs, which is the same argument Entry XVIII made about
`settleResearch` before there was a science boon to serve.

**The hook vocabulary, as implemented.** Every mechanism named in the Implementation notes
above is a member of one union (`CardEffect`, `src/sim/statecraftData.ts`) read by one
evaluator (`src/sim/statecraft.ts`). The mapping from that note's names to the shipped
shapes:

- `combatCardLine` → **`combatLine`**, with a `CombatCondition` (terrain / state /
  adjacency / frontier / posture) and an optional `scaled` count. Seven cards.
- `unitStatCard` → **`unitStat`** over `movement | sight | heal | charges | range |
  combatPercent`, filtered by class, category or ranged-ness. Each stat reaches that stat's
  **single** evaluator (`fullMovement`, `sightOf`, `healUnits`, `createUnit`, `planCombat`)
  and nothing writes a stat onto a unit.
- `windfallRider` → **`windfallRider`** over twelve occasions, composed by `windfallPayout`
  into the *printed number* (see Entry XV's build note: a rider is not a multiplication
  after a settlement).
- `foundingRider`, `offerRider`, `effectAmplifier`, `meterRule`, `conditionRule`,
  `actionRule`, `behaviorRule`, `metaRule`, `cityStatCard` (→ **`cityStat`**),
  `unlocksBuilding` → one shape each, same names.
- `countScaled` and `rateConversion` share one `CardPayout` tail (yield / happiness /
  authority / percent), which is what makes them one idea each rather than one idea per
  destination.
- `scopeVariant` is **not** a shape: it is a `CityScope` *field* on the yield-bearing
  shapes, read by one `cityScopeAdmits`. Freshwater, mountain-adjacent, frontier,
  population-threshold, holding, coastal, captured and capital are members of that union.
- `productionBar` → **`meterRule: authorityUnitProductionExempt`**, read in
  `cityStageSums`, which is the one evaluator that knows both the empire's percentages and
  what the town is building.
- `vocab` in the notes above is not a hook at all — it is `cityYields`, `empireYields`,
  `percentYields`, `productionBonus`, `rulePercent`, `happiness`, `authority`,
  `happinessTierBoost` and `tileYield`, the ordinary yield shapes.

**Measured cadence**, seed 4242 on the scripted pacing empire: first draft turn 7, 6.6
turns per draft over drafts 1–8, governments on turns 24 / 47 / 97. Entry XV's build note
holds the argument for why that is above the ~5-turn target and why the answer is culture
income rather than a cheaper curve.

## Revisions

*(yours — edit away)*
