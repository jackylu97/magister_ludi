# Dominion: ideas under discussion

Ideas for the Dominion deck that are not part of the deck yet. The deck as it stands, and the user's own revisions, are in `docs/decks/dominion.md`; nothing here is ruled. The method is the `card-design` skill (`.claude/skills/card-design/`).

- **1. The first proposal (2026-10-13):** tempo cards for every band, a rework of the military-building riders, keyword readers, a cleanup of two-effect cards. The user did not like its direction for Dominion ("i dont love this direction for dominion"); kept as a record and a source of parts.
- **2. Five cards, first draft (2026-10-13):** written by a subagent from the skill alone, built on the user's band 0 edits. Safe and synergy-correct, with no rare and nothing that bends a rule.
- **3. Staples and wild ideas (2026-10-13):** a brainstorm at both extremes.

## 1. The first proposal (2026-10-13)

*Written after the first deck playtest (Mithridates, Dominion + Expansionist), from `docs/plans/deck-midgame-changes.md` sections B and C and the rulings in `docs/decks/deck-design.md`. Nothing here is built.*

**The direction in brief.**
- Dominion's economy becomes **tempo**: one-off lumps and short bursts on moments the game already announces (a building finished, a military building finished, a unit trained, a town reaching a size, a government adopted, a war declared, a commission completed), plus two early flats that fade as the empire grows. None of the new cards pays more as the army grows or as time passes.
- **Most new cards are live at peace.** Of the 21 new cards, 17 pay without a war; band 0 gets six peacetime cards, so an opening Dominion hand is no longer half combat cards.
- The flat **civic riders on military buildings** (Drill Manuals, The War Hall Schools, Armoury Guilds, War Foundries, Arsenals) become faster training, faster building, or a lump when the building is finished.
- Dominion gains **its own levy and its own charter** (The Press Gang, The Keep Charter), so the levy and charter keywords appear in a Dominion hand even without Expansionist. It also gets two levy and commission readers and two more commissions.
- **Science and culture from fighting stay** as they are (Songs of the Fallen, The Art of War, Triumphs, Battle Honours).
- About half the existing cards carry two effects. Each one gets a one-line split or trim below.

### How the numbers were sized

- From `docs/plans/card-measurements-2026-10-13.md`: a seated card pays about 3% of the seat's yield. A seat makes about 55 yield a turn in turns 1–50, 325 in turns 51–100 and 1,050 in turns 101–150. Bands open at drafts 4 / 10 / 18 / 29, at about turns 30 / 70 / 114 / 159.
- One-off grants pay 0.39 yield per seat per turn today, too little to notice. The lumps below are sized to land at about a band's average while that band is being dealt: about 3–5 a turn for band 0, 10–30 for band 1 and 30–60 for band 2, counting how often the moment comes.
- The lumps deliberately **do not use `perAge`**. A flat 10 production is a third of a building in the first age and a rounding error in the fourth. That decline is the tempo profile the user asked for: strong now, fading later, and replaced by the current band's cards.
- Production costs from `data/rules.json`: an early small building costs 30–39 hammers and a medium one 40–52. An early military unit costs about 15–27 hammers after the +50% military surcharge.

### 1. New tempo cards (plan section C)

#### Band 0 (Tier 0), new cards

Replaced by the user's own band 0 ideas, now on the sheet under "New cards, not yet in the game".

#### Band 1 (Tier I), new cards

| Card name | Rarity | Text | Shape | Why |
|---|---|---|---|---|
| **The Accession** | uncommon | Adopting a government gives every city +30% production for ten turns. | **New shape:** `WindfallOccasion` `governmentAdopted`, fired by `adoptGovernment` (the announced `Occasion` of that name already exists for beads; the windfall side does not). Rider grant `timed {turns: 10, effects: [percentYields production 30]}`. | Lump on a general moment the user named. A band 1 card sees about three adoptions (turns ~70, ~114, ~159), and each is a ten-turn sprint. Unlike a Doctrine's `onAdopt`, this pays on every adoption while seated. |
| **The Call to Arms** | common | Declaring war lets every city train military units 50% faster for ten turns. Declaring again restarts the ten turns. | `windfallRider` occasion `declareWar`, grant `timed {turns: 10, renews: true, effects: [productionBonus unit class military 50]}`. | Turns the early lead into a war: the army arrives in the turns after the declaration. Does not stack (`renews`). |
| **The Press Gang** | uncommon | Towns of at least six citizens may spend a citizen to raise their best melee unit. | `levy use: conscript`, `minPopulation: 6`. Shares the town's five-turn levy wait. The unit is not counted as trained. | **Dominion's own levy**, so the levy keyword appears in a Dominion hand without Expansionist. Turns food into an army at once. Its drawback is a citizen lost and no training pay. |
| **The Recruiting Sergeants** | common | After a town spends a citizen on a levy, it trains military units 50% faster for five turns. At most once every ten turns. | `levy after {turns: 5, every: 10, effects: [productionBonus unit class military 50]}`, hung on the levying town's `City.timed` (the Seasonal Levies shape). | **A levy reader.** Works with every levy use (production, muster, conscript), so it pairs with The Press Gang, The Muster of the Fields and Levy of the Land. |
| **Victory Parades** | uncommon | Completing a commission gives every city +3 culture for ten turns. | **New shape:** `WindfallOccasion` `commissionMet`, fired where a commission pays its reward (`commissions.ts`). Rider grant `timed {turns: 10, effects: [pays where:city culture: 3]}`. | **A commission reader.** Every commission in any deck pays twice. Culture, so a finished goal speeds the next draft. Live at peace through Commission: Clear the Frontier and Commission: Raise the Host. |
| **Commission: Raise the Host** | common | Commission. Train four units while this card is seated. Then every city gains +25% production for ten turns. The card leaves its chair. | `commission` goal `{counted, occasion: unitTrained, count: 4}`, reward `{timed: {turns: 10, effects: [percentYields production 25]}}`. | A peacetime goal for a military empire. Pays in tempo, not beads. Counts any trained unit, workers and settlers included, so it is never dead. |
| **The Keep Charter** | uncommon | Once drafted, your cities may build the Keep. No chair required. | `charter unlocks.building: keep`. The Keep row (`data/buildings.json`) is already `unlockedByCard`, and no live card opens it (the retired Vigil Charter did). | **Dominion's own charter.** It adds a military building for Raising the Standard, The Muster Ground and Stockpiles to read: the Keep gives +25 city hit points and heals units beside it. |

#### Band 2 (Tier II), new cards

| Card name | Rarity | Text | Shape | Why |
|---|---|---|---|---|
| **Engineer Cohorts** | common | Finishing a building grants 35 production to that city. | `windfallRider` occasion `buildingCompletion`, grant `{yield: production, amount: 35}`. | The band 2 version of Work Details: about a quarter of a mid-game building back, at roughly one completion a turn across eight towns. Since only the current band is dealt, it replaces Work Details in the draw. |
| **The Muster Ground** | common | Finishing a military building lets every city train military units 50% faster for five turns. Finishing another restarts the five turns. | `windfallRider` occasion `buildingCompletion`, `buildingCategory: military`, grant `timed {turns: 5, renews: true, effects: [productionBonus unit class military 50]}`. | A burst on completion in place of a standing training bonus. Reads the same moment as Raising the Standard and the reworked Drill Manuals. |
| **Hot Forges** | uncommon | Training a military unit gives every city +3 production for five turns. Training another restarts the five turns. | `windfallRider` occasion `unitCompletion`, `class: {category: military}`, grant `timed {turns: 5, renews: true, effects: [pays where:city production: 3]}`. | Pays for keeping the forges busy, not for the size of the army: one unit every five turns keeps it lit, and a lost army costs nothing. About 24 production a turn across eight towns. |
| **Campaign Chests** | uncommon | Declaring war grants gold equal to ten turns of your gold income, at most 300. | `windfallRider` occasion `declareWar`, grant `{yield: gold, amount: 10, fromRate: goldPerTurn, max: 300}`. | A war-start lump that buys the units the declaration needs. **Check:** if peace and a second declaration can follow quickly, the card needs a once-every-N-turns limit (the rider has only `oncePerTurn` today). |
| **Commission: The Border War** | common | Commission. Kill five units while this card is seated. Then gain 150 science and 150 culture. The card leaves its chair. | `commission` goal `{counted, occasion: unitKilled, count: 5}`, reward `[{yield: science, amount: 150}, {yield: culture, amount: 150}]`. | Science and culture from fighting, as one big moment. Barbarian kills count, so it can be finished at peace. |

#### Band 3 (Tier III), new cards

| Card name | Rarity | Text | Shape | Why |
|---|---|---|---|---|
| **The Victory Mint** | uncommon | Capturing a city grants gold equal to thirty times its population. | `windfallRider` occasion `capture`, grant `{yield: gold, amount: 30, fromOccasion: population}`. | The gold partner of Triumphs (culture) and Carried-Off Scholars (science): a captured town pays for the next push. |
| **The Grand Review** | uncommon | Completing a commission grants 300 renown, favouring great generals. | **New shape:** `WindfallOccasion` `commissionMet` (as Victory Parades). Grant `{renown: 300, renownFamily: general}`. | A second commission reader, paying Dominion's great-person family. By band 3 the next great person costs about 1,000 renown (`renownThreshold`: 75 + 180 per person already taken), so this is about a third of a general. |

#### Band 4 (Tier IV), new cards

| Card name | Rarity | Text | Shape | Why |
|---|---|---|---|---|
| **Tribute of Cities** | rare | Capturing a city grants production toward your Magnum Opus equal to twenty times its population. | `windfallRider` occasion `capture`, grant `{yield: production, amount: 20, fromOccasion: population, toOpus: true}`. | A finisher that pays on any capture, not only an Opus city (Spolia's case). It is a one-off, so it sits outside the Opus percentage cap. |

### 2. The military-building civic riders

| Existing card | Band | Now | Proposal | Shape | Why |
|---|---|---|---|---|---|
| **Drill Manuals** | 1 | Barracks and Stables give +3 science; +30% production toward them. | **Rework:** "Finishing a military building grants 30 science." | `windfallRider` occasion `buildingCompletion`, `buildingCategory: military`, grant science 30. | Training teaches, once, when the school opens. A flat +3 science loses to a Library; a lump of 30 does not. |
| **The War Hall Schools** | 1 | War Halls give +5 science and +5 culture. | **Rework:** "Cities with a War Hall train military units 40% faster." | `productionBonus unit class military 40`, scope `hasBuilding warHall`. | Faster training, as the ruling asks. The science and culture move to Drill Manuals and Raising the Standard. |
| **Armoury Guilds** | 2 | Armouries give +5 science and +5 culture; Armoury cities +15% production toward buildings. | **Trim and raise:** "Cities with an Armoury build buildings 25% faster." | `productionBonus building 25`, scope `hasBuilding armoury`. | Keeps the tempo half, raised, and drops the flat civic rider. The Armoury becomes the army's workshop. |
| **War Foundries** | 1 (rare) | Barracks cities: 30% of production gained again as gold, and +38% production toward military units. | **Trim:** "Cities with a Barracks train military units 50% faster." | `productionBonus unit class military 50`, scope `hasBuilding barracks`. | The gold share is a converter that grows with production for the rest of the game, which is the long-term scaling the ruling moves out of Dominion. The training half becomes the deck's one standing Barracks training card, because The Standing Army loses its own (cleanup below). |
| **Arsenals** | 3 | Armoury cities +30% production, and ships 75% faster. | **Trim:** keep "+30% production in cities with an Armoury"; drop the ships. | `percentYields production 30`, scope `hasBuilding armoury`. | One effect. The ship clause is a separate naval card's job. |
| **The Citadel Works** | 2 | Citadels +5 science; +1 general renown per citadel. | **Trim:** keep the renown trickle; drop the science. | `renown` count `tilesInBorders` citadel, family general. | Citadel yields are The Marshalate's job. The renown is the generals engine. |
| **Stockpiles** | 2 | +8 food per defensive building in the city. | **Number:** back to +5. | unchanged | Measured at 187.7 a turn at +5, which is within 0.3 of the twice-the-band-mean line that kept other cards out of the 1.5× buff. At +8 it pays well above band 2. |
| **The General Staff**, **Reserve Officers**, **The Nation in Arms**, the shared **Military Colonies** | 1 / 3 / 4 / 1 | — | **Keep.** | — | Already tempo (training speed, a muster, faster settlers) or great-person renown, not flat civic yields. |

### 3. Keyword readers in this deck

- **Levies:** The Press Gang (a source), The Recruiting Sergeants (a reader). With Expansionist, both also work with Levy of the Land, The Muster of the Fields, Seasonal Levies and The Corvée.
- **Commissions:** Commission: Raise the Host and Commission: The Border War (new goals), and two readers, Victory Parades and The Grand Review. Both readers also pay on every other deck's commissions.
- **Charters:** The Keep Charter. Dominion had no charter of its own before; the shared The Chartered Company was its only one. The charter reader proposed on Expansionist's sheet (The Charter Rolls) counts this one too.
- **Tended works:** no Dominion reader. Tending is Expansionist's, and no Dominion card read it without becoming a two-fact condition.

### 4. Cleanup of existing cards (plan B2)

One effect per card, at most one condition. "Split" means each half becomes its own card in the same band; "trim" means one half goes.

| Existing card | Band | Problem | Proposal |
|---|---|---|---|
| **Blooded Spears** | 0 | Two effects (strength against barbarians, and a camp lump). | **Trim** to the camp lump (25 production and 25 food). The common The Marchmen already gives +3 against barbarians. |
| **The Standing Army** | 0 (rare) | Two effects (free garrison upkeep, and Barracks training). | **Trim** to "Garrisoned units cost no upkeep." War Foundries takes the Barracks training. |
| **The Horse Herds** | 0 | Two effects (pasture and camp production, and mounted training). | **Split:** The Horse Herds keeps "+1 production on worked pastures and camps"; a new band 0 card, **The Remount Depots**, takes "+20% production toward mounted units". |
| **Battle Honours** | 0 | Two occasions. | **Trim** to "Your first kill each turn grants 6 renown, favouring great generals." Camps already pay through Blooded Spears. |
| **Sword and Plough**, **Reserve Officers** | 0 / 3 | Two halves, one at war and one at peace. | **Keep.** Each is one choice stated both ways; flagged so the user can rule. |
| **The Camp Chaplains** | 0 | Pays more as the army grows (+1 faith per unit), which the tempo ruling avoids. | **Flag (the user's own card):** either cap it ("at most +6") or leave it as the deck's early faith. |
| **The Soldier-Farmers** | 1 | Three facts (at peace, garrisoned, pasture or camp). | **Trim** to "While at peace, worked pastures and camps gain +2 food and +2 production." |
| **The Pacified Marches** | 1 | Two effects (authority and culture per camp). | **Trim** to the culture (+5 per camp cleared while seated, at most +40). Authority relief is earned on Expansionist's side. |
| **Horse Lords** | 1 (rare) | Two stats on one class. | **Keep** as one effect (mounted units are better); flag if the user reads it as two. |
| **Siege Works** | 2 | Two effects (siege training, and strength against cities). | **Trim** to "+38% production toward siege units." The Siege Train carries the strength. |
| **Marine Drill** | 2 | Two unrelated effects (naval melee strength, and units coming ashore). Measured paying nothing. | **Split** into **Marine Drill** (land units that come ashore gain +3 strength for one turn) and a naval card (naval melee +4), or cut the naval half. |
| **Riders of the Steppe** | 2 | Two rules. | **Trim** to "Mounted units ignore enemy zone of control." Spoils of War pays the pillage. |
| **Spoils of War** | 2 | Two effects (production per pillage, culture on the first each turn). | **Trim** to "Pillaging grants 15 production to your nearest city." |
| **Hegemony** | 2 (rare) | Two effects (captured cities cost less authority, and a capture burst). | **Trim** to the burst: "Capturing a city grants +30% production in every city for ten turns." The Proconsuls carries holding. |
| **The Siege Train** | 3 | Two effects (siege movement, melee beside siege). | **Trim** to the melee strength line. |
| **Defensive Lines** | 3 | Two effects (strength near cities, wall defence per garrison). | **Trim** to "+3 strength for land units beside your cities." |
| **Naval Supremacy** | 3 | Four lines (ship sight and range, coastal gold, captured coastal gold). | **Split** into a ship card ("Ships gain +1 range") and a coastal card ("Coastal cities gain +30% gold"). Drop the captured-coastal line. |
| **The Praetorian Guard** | 4 | Two effects. | **Trim** to "Your military units within two hexes of the city raising your Magnum Opus gain +6 strength." |
| **The Grand Army** | 4 | Pays more as the army grows. | **Rework:** add "while you are at war" (`conditionRule atWar`), so it pays when the army is used, not for keeping it. |
| **The Marshalate** | 4 | Two effects (strength per general, citadel yields). | **Trim** to the strength per great general. |
| **The Grand Coalition** | 4 | Two effects. | **Trim** to "+6 strength against the empire raising a Magnum Opus." |
| **The Proconsuls** | 4 | Two facts (captured and garrisoned) and two effects. | **Trim** to "Captured cities with a garrison cost no authority." |
| Shared **Marcher Lords** | 2 | Three effects. | **Trim** to "Cities within four hexes of a foreign border cost one less authority, minimum one." |
| Shared **The Road Garrisons** | 2 | Two facts and two effects (the user's card). | **Flag:** drop the defence and keep the food. |

Already one effect, or one count paying one bag, and kept as they are: Martial Law, Muster Rites, The King's Levy, Blood Brothers, The Quartermasters, The Soldiers' Purse, The Marshals, The Art of War, Songs of the Fallen, Conquered Archives, Triumphs, Master Bowyers, Standing Garrisons, Total War (its drawback is the model), Imperium, Spolia, The Annexed Provinces, The Military Frontier, and the commissions.

### 5. Combinations this opens

Each combination works through a general moment or keyword, never through one card naming another.
- **The military building finished.** Raising the Standard (culture), the reworked Drill Manuals (science) and The Muster Ground (a training burst) all pay when a Barracks, wall, Stable, Armoury or Keep is finished. The Keep Charter adds one more building to finish. A seat that leans into it gets its draft, its research and its army from the same few builds.
- **Citizens into soldiers (with Expansionist).** The Press Gang or The Muster of the Fields spends a citizen, The Recruiting Sergeants makes the town's next units come out faster, and Coming of Age pays again when the town regrows to four. Expansionist's growth cards (The Barn-Raising, The Gleaners) refill the town.
- **The sprint into war.** The Accession, Commission: Raise the Host and The Call to Arms each hang a ten-turn production burst, and they stack. A seat that adopts a government, finishes its commission and declares in the same stretch raises an army well ahead of its neighbours, then Campaign Chests and The Victory Mint pay for the next push.
- *Small, with happiness as fuel:* Total War's −3 happiness per city is easier to carry with Expansionist's happiness cards (The Open Country, The Commons, The Grain Dole). This is a pairing, not a line of the deck.

### 6. New shapes this section needs

Four, each read by more than one card across the two proposals:
1. **`WindfallOccasion` `governmentAdopted`**, fired in `adoptGovernment` beside the existing announced occasion. Used by The Accession.
2. **`EmpireCondition` `beforeAge`** (`value: TechAge`), true while `highestAge` is below the value. Used by The Old Chieftaincy. There is no `not` composite, and this is a named member in the same way `atPeace` is.
3. **`WindfallOccasion` `commissionMet`**, fired where a commission pays its reward. Used by Victory Parades, The Grand Review and Expansionist's The Harvest Feast.
4. **`CountKind` `chartersHeld`** (Expansionist's The Charter Rolls). No Dominion card uses it, but The Keep Charter adds to its count.

Everything else uses shapes that exist today. Two points to check when building:
- The Recruiting Sergeants assumes `levy.after` effects can carry a `productionBonus`. `cardProduction` reads `liveCityEffects`, which includes `City.timed`, so it should.
- The Press Gang assumes `levy use: conscript` takes `minPopulation`, as The Corvée's `opus` use does.

## 2. Five cards, first draft (2026-10-13)
A proposal for the user to iterate on. Nothing here is built. It builds on the user's edits to `docs/decks/dominion.md` (now its "changing" rows and "New cards" section): the Tier 0 rewrites (Martial Law +1 happiness and +3 food per garrisoned unit, Sword and Plough +2 culture and +2 production per garrisoned town, Muster Rites 8 and 8, Battle Honours as "kill 10 units, gain a great general draft", The Pacified Marches counting "this game") and the five new band 0 lines (+1 authority per garrisoned unit; scouts and discoveries; +30% toward first- and second-age military units; the grower that gains +1 science and +1 culture per unit trained or mustered; kills paying culture equal to strength). None of the five below restates those.

Following the skill as extended in b317aa33: the current priority is **shape**. The numbers are first guesses sized against `power-bar.md`.

**The five, at a glance**

| Card | Band | Rarity | Role | Themes (self-producing anchors in bold) | Throughlines |
|---|---|---|---|---|---|
| The Garrison Writ | 0 | common | glue / opener | **garrisons**, **units trained or mustered**, captured towns | garrison state, conquest, raising the host |
| The Regimental Rolls | 1 | uncommon | pay-off ("this game") | **units trained or mustered** | raising the host, garrison state |
| Commission: Garrison the Realm | 1 | uncommon | commission (pay-off and set-up) | **garrisons**, **generals and citadels** | garrison state, conquest |
| The Frontier Forts | 2 | uncommon | pay-off | **generals and citadels**, **garrisons** | garrison state, conquest |
| The Old Campaigners | 2 | uncommon | pay-off ("this game"), war card | **kills**, **barbarian camps** (the early kills) | conquest, raiders, garrison state |

All five are written on themes the Dominion playstyle produces by itself. One card needs no new shape; three need small new shapes; one needs two members of one small new shape. Those are listed at the end.

---

### 1. The Garrison Writ

| Field | |
|---|---|
| Band, rarity | 0, common |
| Text | When you found or capture a town, the best melee unit you can build is trained there, free of upkeep. |
| Age goal | Age 1: settle three or four towns without losing them to barbarians. It keeps paying into age 2's "hold it": a town just taken gets a defender at once. |
| Themes and throughlines | Garrisons, units trained or mustered, captured towns. Garrison state (every new town is garrisoned on its first turn), conquest (a captured town is held), raising the host (the unit counts as trained for the training cards). **Gap filled:** the Dominion side of the Dominion + Expansionist frontier hook. The pair grid says Expansionist gives Dominion "newly founded towns that need garrisons", and no Dominion card answers that today. |
| Role | Glue. **Floor** (no garrison cards seated): a free 15–27 hammer unit per new town, which is 6–10 turns of a new town's production, with no upkeep. **Ceiling** (garrison base seated): each new town pays Sword and Plough, Martial Law and the +1 authority line from its first turn. |
| Attention | Low. It leaves one piece per new town, the best one the player can build, standing in the town that needs it. It can be fortified and left alone. Nothing to track. |
| Power | Drafted around turns 15–30; a seat founds 2–3 more towns in band 0. Per founding: about 20 hammers (Warrior 15, Spearman 27) plus 1 gold a turn of saved upkeep (age 1 gold is about 5 a turn). With the user's garrison base seated, the town's garrison pay (+2 culture, +2 production, +3 food, +1 happiness, +1 authority) starts about 8 turns earlier than if the town built its own Warrior: about 56 yield per town. Three foundings: about 60 hammers of lumps (band 0 lump bar 50–100) and roughly 4–8 a turn averaged over band 0 (regular bar 4–8), higher with the garrison base. In band 1 each founding or capture gives a 46–61 hammer unit; by age 4 a free unit is small next to 35 production a town. Strong when settling, fading later: the tempo profile. |
| Synergy | **Raises:** garrisoned towns; unit completions (the unit is free, so it pays the completion riders as The King's Levy's musters do). **Reads:** towns founded and towns captured. **Fed by** (founding, ≤ band 1): The Seed Grain, The Beating of the Bounds, Military Colonies, Daughter Towns give reasons to found; every war card raises captures. **Feeds:** Martial Law, Sword and Plough, the user's +1 authority per garrisoned unit, The Soldier-Farmers, The Road Garrisons, The Escorted Roads, Examinations of State; Muster Rites and Rites of Passage on completion; Commission: Garrison the Realm (below). A set-up, so it needs no raisers; it reads a moment every seat makes. |
| Displaces | A band 0 card that pays a little at every town, such as The Camp Chaplains or Muster Rites, in a seat that is still settling. It competes with The King's Levy as the "free units" chair: the Levy pays on a clock, this pays per town. |
| Condition or drawback | Pays only on new towns. A seat that stays at two towns gets one or two units from it. |
| Shape | Two `windfallRider` rows, occasions `found` and `capture`, each `grant: {unit: …}`. Both seams deliver at the town's own hex (`foundCityAt` and the capture's `payBattleRiders` pass the town's coordinates), through `realiseItem(…, {free: true})`. Works today with `unit: 'randomMilitary'`, but that draw can pick an outdated type (it does not skip a Warrior once Swordsmen are buildable). **Small new shape (recommended):** let `WindfallGrantSpec.unit` also take `'bestMelee'`, the value `CommissionReward.unit` and `periodicMuster` already use. |

The trigger is two existing occasions, but one moment to the player ("a town joins you") and one effect. If the user reads it as two, trim to founding only; the capture half is what makes it useful in band 1.

### 2. The Regimental Rolls

| Field | |
|---|---|
| Band, rarity | 1, uncommon |
| Text | Every town gains +1 production for every three military units you have trained this game, at most +5. |
| Age goal | Age 2: keep the economy running while the army is out. It pays off the band 0 training cards after band 0 leaves the draw. |
| Themes and throughlines | Units trained or mustered, as a "this game" counter (The Pacified Marches' model). Raising the host above all; the garrison state too, since garrisons are trained units. **Gap filled:** the audit counted about 12 cards that make more units and 2 that read them. It is also production for the raising-the-host throughline in band 1, which today has only science (The Art of War) and the user's grower. |
| Role | Pay-off. **Floor:** a seat that trained only its garrisons (6 units) gets +2 a town. **Ceiling:** a seat that drafted the training cards reaches the cap during band 1 and holds +5 a town. |
| Attention | None added. It rewards training the player has already done; the card shows its count. Because the cap is 15 units, which an army-raising seat reaches anyway, it does not reward training units nobody needs. |
| Power | Drafted at turn 55–70 with 5 towns and about 9 military units trained: +3 × 5 = 15 production a turn (band 1 regular 15–25; median seated card 7–12). End of band 1, 7 towns and 15 units: +5 × 7 = 35 (best seated card 29–47). Age 2 production is about 48 a seat, so this is a large share early and a smaller one late: 50–60 at 10 towns in age 3 (band 2 regular 35–60), about 14% of a town's production in age 4. The unit estimates are guesses; the bots' `unitsBuilt` at turn 70 would settle the divisor. |
| Synergy | **Reads:** military units trained this game. **Raisers at or before band 1, live:** The Standing Army (b0), War Foundries (b1), The Muster of the Fields (b1, a levied unit counts as trained), The Horse Herds (b0, live data has +20% toward mounted units; the user's edit drops it). Proposed: the user's +30% toward first- and second-age military units. Three live raisers without The Horse Herds. **Raises:** flat production in every town, the base that town-stage percentages multiply (Hegemony's +30% burst, The Standing Army's and War Foundries' training percentages). **Shares its moment with** Muster Rites, Rites of Passage, The Art of War and the user's grower; the grower counts while it is seated, this card counts the whole game. |
| Displaces | A band 0 flat that does not grow: Muster Rites, The Camp Chaplains, The Horse Herds. It does not displace Sword and Plough at 5 towns (that card pays 20 with culture); it does by the end of the band. |
| Condition or drawback | Needs a training history. A peaceful builder who trained four units gets +1 a town. |
| Shape | `pays where:city basis:count`, `to: production, amount: 1, per: 3, max: 5`, `class: {category: military}`. **New shape:** `CountKind` member `unitsTrained`, a lifetime count read off `Player.unitsBuilt` (summed over the types the `class` filter admits). The record exists and nothing lowers it, like `clearedCamps` off `Player.campsCleared`. It counts units built or bought, and leaves out free ones (King's Levy musters, The Garrison Writ's units) and captured ones. **Check with the user:** The King's Levy's text says its unit "counts as trained", and the user's grower says "train or muster". If musters should count here too, the count needs a new lifetime counter written beside `payCompletionRiders`' unit path instead of reading `unitsBuilt`. |

### 3. Commission: Garrison the Realm

| Field | |
|---|---|
| Band, rarity | 1, uncommon |
| Text | Commission. Have six towns with a garrison. Then gain a great general. The card leaves its chair. |
| Age goal | Age 2: "the first great general: a general from a goal", and "hold it" at five or six towns. |
| Themes and throughlines | Garrisons (read as a threshold, not a scaling count), generals and citadels. Garrison state (the general plants a citadel on the frontier) and conquest (the general's aura marches with the army). **Gap filled:** Dominion has no commission in band 1; the user's Battle Honours commission is the war route to the first general (kill ten units), and this is the peace route. Two routes, so the generals theme has no linchpin. |
| Role | Commission: a pay-off on the garrison base and a set-up for every generals and citadels card. **Floor:** a free general for a seat with six towns. **Ceiling:** the general becomes a manned citadel (The Frontier Forts) or leads the first conquest. |
| Attention | Low. Progress is a number the card shows (towns garrisoned out of six). The reward is one piece, a great person, with one interesting choice: citadel or field command. |
| Power | The next great person costs `75 + 180n + n^2.65` renown, where n is the great people of any family already recruited (`renownThreshold`, `src/sim/renown.ts`): 75, then 256, then 441. By band 1 most seats have recruited one or two, so the next costs 250–450. A Dominion seat earning generals' renown from The General Staff (+2 a turn per Barracks, about 10 a turn at five Barracks) waits 10–30 turns for its first or second general; this skips that wait. What the general is worth: a citadel (+2 production, +8 defence, claims its ring of hexes, and the renown and science cards read it), or an aura of +3 strength within two hexes (about 9% of age 2's 30–35 unit strength). As a lump it is near the top of band 1's 200–400 bar, which is the size Commission: Hold the Capitals uses the same reward at. |
| Synergy | **Reads:** garrisoned towns. **Raisers at or before band 1:** The Garrison Writ (b0, new), The King's Levy (b0), The Muster of the Fields (b1, a town levies its own garrison), The Standing Army (b0, garrisons cost no upkeep); towns from Expansionist's founding cards (The Seed Grain, Military Colonies, Daughter Towns). Four live raisers. **Raises:** great generals called, which The Marshalate counts, and citadels, which The Citadel Works and The Frontier Forts read. |
| Displaces | Costs a draft pick and a chair only until met. For a Dominion + Expansionist seat with five or six towns it is met within a few turns. |
| Condition or drawback | Six towns, each holding a unit. A tall seat cannot finish it without a war. |
| Shape | `commission`, reward `{greatPerson: 'general'}` (exists: Commission: Hold the Capitals). **New shape:** `CommissionFigure` member `garrisonedTowns`, the towns with at least one combat unit standing in them, the same test as the `garrisoned` city scope. Goal `{kind: 'reached', figure: 'garrisonedTowns', count: 6}`. |

### 4. The Frontier Forts

| Field | |
|---|---|
| Band, rarity | 2, uncommon |
| Text | Each citadel with one of your units standing on it gives +15 science. |
| Age goal | Age 3: the gap. Dominion's own towns lag, and the garrison state has no science of its own in bands 1–2. |
| Themes and throughlines | Generals and citadels, garrisons. Garrison state (the user's own example in the skill: "a unit standing on a citadel makes science") and conquest (citadels go on the border, and a manned one is a fort in the way of the next war). **Gap filled:** science for the garrison-state throughline, which today gets it only from the Magisterial-shared Examinations of State (b2) and The Military Frontier (b4). From the Roman frontier forts, which held the province's records, maps and engineers (the Vindolanda tablets). |
| Role | Pay-off. **Floor:** a Dominion seat has one or two generals by band 2 (renown from fighting, Battle Honours, the commission above), so +15 to +30 science for one standing order per citadel. **Ceiling:** with The Citadel Works' renown per citadel, more citadels bring more generals, which bring more citadels. |
| Attention | One order per citadel, once: move a unit onto it and fortify it. That is positioning outside a fight, which the skill warns about, but it is a single placement like a garrison, not something repeated each turn. |
| Power | Age 3 science is about 106 a seat. Two manned citadels: +30 (band 2 regular 35–60; median seated card 18–25 in turns 101–150). Three: +45. A citadel is the rarest of the five quantities, so the per-citadel figure is large. Science is paid at face value. |
| Synergy | **Reads:** citadels with a unit on them. **Raisers of citadels at or before band 2:** Battle Honours (b0, the user's commission, a general draft), The General Staff (b1, general renown per Barracks), The Citadel Works (b2, general renown per citadel), Commission: Garrison the Realm (b1, new). Three live raisers plus the new commission, plus the general renown the playstyle earns by itself. **Raises:** science. **Shares its hex with** The Marshalate's citadel yields (b4) and the Devotion-shared The Holy Army (citadel beside a holy site). |
| Displaces | A band 1 flat (Sword and Plough's culture is already less in age 3), or The Citadel Works if the proposal trims that card to its renown. |
| Condition or drawback | Needs a general spent on a citadel instead of the field, and a unit kept on it. |
| Shape | `pays where:hex`, `science: 15`, `on: {test: 'all', of: [{test: 'improvement', improvement: 'citadel'}, <manned>]}`. **New shape:** a `TileCondition` member for "a unit of this empire stands on the hex" (no tile test reads units today). Fallback if the user declines it: "Citadels gain +10 science", which is the job The Citadel Works' science half does today and which the proposal trims away. |

### 5. The Old Campaigners

| Field | |
|---|---|
| Band, rarity | 2, uncommon |
| Text | Military units gain +1 strength for every five units you have killed this game, at most +8. |
| Age goal | Age 3: the big war. Siege the big targets with an army that is better than its numbers. |
| Themes and throughlines | Kills, including the barbarian kills of ages 1 and 2. Conquest and raiders (strength in the field); the garrison state too, since the line applies on defence. **Gap filled:** a "this game" counter that bridges the band 0 barbarian war (Blooded Spears, Battle Honours, Commission: Clear the Frontier, the user's kill-culture card) into band 2, after those cards leave the draw. From the veterans of Marius' and Caesar's legions, kept under arms for their experience. |
| Role | Pay-off, and the batch's war card. **Floor:** +2 to +3 from the barbarian kills any Dominion seat makes. **Ceiling:** +8 for a seat that has fought two wars. |
| Attention | None added; the card shows its count. It rewards fighting the player is already doing, not training spare units. |
| Power | Kills this game at band 2 opening (turn ~114): about 5–10 barbarian kills plus 5–15 from a first war, so +2 to +5. The cap of +8 needs 40 kills. Age 3 unit strength is 42–50: +5 is the band 2 regular combat line, +8 the strong one (16–19%). Damage is an exponential in the difference of strengths at 0.04 a point (`rules.combat.strengthExponent`), so +5 deals about 22% more damage and takes about 18% less; +8 deals about 38% more and takes about 27% less. A walled age 3 town falls in roughly a quarter fewer blows, so about 2–4 turns sooner per siege, with fewer 81–174 hammer units lost. It works on defence, so it holds a chair through peace against raids. |
| Synergy | **Reads:** units killed this game, barbarians included. **Raisers at or before band 2:** Blooded Spears (b0), The Marshals (b1), Horse Lords (b1), March Discipline (b1), The Oriflamme (b1, Devotion-shared, in this pool), Watchmen (generic b0), Siege Works and Master Bowyers (b2). **Raises:** kills, which Songs of the Fallen, Field Academies, The Sacred Host, the user's kill-culture card and Battle Honours read. It is a loop (kills make strength, strength makes kills), held in by the cap. |
| Displaces | A peacetime band 1 card, in a seat about to go to war; in a seat that is not, it is a weak pick, as it should be. |
| Condition or drawback | Needs a fighting history. Snowball risk: it favours a seat already winning wars. The cap keeps it within the band 2 strong line. |
| Shape | `combatLine`, `amount: 1`, `side: 'both'`, `when: {test: 'always'}`, `class: {category: military}`, `scaled: {count: 'unitsKilled', per: 5, max: 8}` (the War Bonds pattern). **New shape:** `CombatScaleCount` member `unitsKilled`, a lifetime count. `Player.unitsKilled` exists but leaves out the wild by design (The Field of Glory), so this needs a lifetime counter written at the same seam as the `unitKilled` tally (`payBattleRiders`, the `kill` occasion), which does count barbarians. |

---

### Combinations

Each works through a general quantity or moment; no card names another.

- **A town joins, and the garrison base pays at once** (towns founded or captured → garrisoned towns). Expansionist founds; The Garrison Writ puts the best melee unit in each new town; the user's Sword and Plough, Martial Law and +1 authority per garrisoned unit pay from the town's first turn; Commission: Garrison the Realm counts the sixth garrisoned town. With the Writ's capture half, a town taken in band 1 is defended and pays its own authority at once.
- **Garrisons into generals into science** (garrisoned towns → great generals → manned citadels). The commission turns a garrisoned realm into a general; the general plants a citadel; a unit on the citadel makes The Frontier Forts pay; The Citadel Works' renown per citadel brings the next general. The user's Battle Honours commission is the war route into the same chain, so a peaceful seat and a fighting seat both reach it.
- **The training history pays the towns** (units trained this game). The Standing Army, War Foundries, The Muster of the Fields and the user's +30% toward early units raise the count; The Regimental Rolls pays production on it. The user's grower reads the same moment while it is seated and pays science and culture, so the two do different jobs.
- **The barbarian war becomes the veteran army** (units killed this game). Blooded Spears, the user's kill-culture card, Battle Honours and Commission: Clear the Frontier make band 0 a season of kills; The Old Campaigners turns that history into strength for the band 2 war, and its strength raises the kills that Songs of the Fallen pays on.
- **Layers.** The Regimental Rolls and Sword and Plough are flats in every town; Hegemony's +30% production burst on a capture multiplies them.

**Leaders.** Taizong (garrisons) gains three cards on his theme: the Writ, the commission and The Frontier Forts. Joan (kills) gains The Old Campaigners. Mithridates' "strength against an empire holding more cities" still reads nothing a card raises; The Garrison Writ's capture half and The Old Campaigners help him hold and take towns from a wider empire, but no card here speaks to that quantity. Modu Chanyu's mounted and pillage theme gets nothing from this batch.

**Composition.** Four of the five are useful at peace. Shapes: a moment payout, a "this game" count paying a flat, a commission, a hex line, a combat line. No rare: the build-defining rares in these bands stay The King's Levy, War Foundries and Songs of the Fallen.

### The weakest of the five

**The Frontier Forts.** Its floor depends on how many generals a seat has called by band 2, and citadels are the rarest quantity here: a seat with one citadel gets +15 science, around the median seated card and below the band 2 regular bar. It also needs a new tile test, and it asks for a placement outside a fight, which the skill counts as attention. It stays because the garrison-state throughline has no science of its own in bands 1 and 2, generals and citadels is the theme the user named as serving every throughline, and the card closes a loop that already exists (Battle Honours, The General Staff and The Citadel Works make generals and citadels, and today nothing at band 2 pays the garrison state for holding them). If the tile test is declined, the fallback "Citadels gain +10 science" keeps the job without the placement.

### New shapes

1. **Lifetime counts** (two members of one idea, like `clearedCamps` off `Player.campsCleared`): `CountKind` `unitsTrained` off `Player.unitsBuilt` (The Regimental Rolls), and `CombatScaleCount` `unitsKilled` off a new lifetime kill counter that includes barbarians (The Old Campaigners).
2. **`CommissionFigure` `garrisonedTowns`** (Commission: Garrison the Realm).
3. **A `TileCondition` for "a unit of this empire stands here"** (The Frontier Forts).
4. *Optional:* `WindfallGrantSpec.unit` accepting `'bestMelee'` (The Garrison Writ; works today with `'randomMilitary'`).

### Checklist run (skill, "Before you hand it over")

- Deck map read (`references/deck-maps.md`); each card names its gap. Pass.
- Real floor on every card; roles, shapes and rarities mixed (glue, two this-game pay-offs with different jobs, a commission, a hex pay-off). No two cards share a job: the two "this game" counts read different moments and pay different things. Pass; no rare in the batch, noted above.
- Theme and era: Roman colonies' garrisons (band 0), muster rolls (band 1), a frontier commander (band 1), Roman frontier forts and Marian veterans (band 2, the classical age). Pass.
- Attention: none is high attention and low impact. The Writ creates units, one per new town, the best type, in place; The Frontier Forts asks for one placement per citadel. Pass.
- No linchpin: generals have two commission routes plus renown; garrisons and training each have four or more raisers. Pass.
- One effect, at most one condition, one line each. The Writ's two occasions are flagged above. Pass.
- No card names another. Pass.
- Three or more set-ups at or before the band for each pay-off: Rolls (3 live), commission (4 live), Forts (3 live plus the commission), Campaigners (7+). Pass.
- Numbers checked against the bar with arithmetic. Pass, with the unit-count estimates marked as guesses.
- Culture in bands 0 and 1: none of the five pays culture. Not applicable.
- War cards in age terms: The Old Campaigners in age 3 strengths and damage; the commission's general in age 2 strength. Pass.
- The user's edits: built on, not restated. Two points raised for the user: whether musters count as "trained" (The King's Levy's text and the grower against `unitsBuilt`), and that The Horse Herds' +20% toward mounted units, one of the Rolls' raisers in live data, is dropped by the user's edit. Pass.
- Plain English. Pass.

**Changed from the first draft after the skill update:** Mustering Out (disbanding a unit in a town pays half its cost as production) was cut. It hit the skill's "training to disband" tedium case and needed a new disband occasion. The commission's reward changed from a ten-turn training burst, which rewarded training units nobody needs, to a great general. The band 2 war card now reads kills instead of units trained, so it rewards fighting rather than training more units.

## 3. Staples and wild ideas (brainstorm, 2026-10-13)

Ideas at both extremes, for shape rather than numbers. Most wild ones need new rules.

### Staples: dull, safe, high floor

| Idea | Band | Theme |
|---|---|---|
| Worked hills give +1 production | 0 | terrain |
| Garrisoned towns give +1 culture | 0 | garrisons |
| Kills pay gold equal to the defeated unit's strength | 0 | kills |
| Clearing a camp gives culture | 0 | camps |
| Walls give +1 happiness | 0–1 | military buildings |
| Your first three military units cost no upkeep | 0 | upkeep |
| Units in your territory heal 10 more a turn | 1 | logistics |
| Military units cost 15% less production | 1 | units trained |
| Great generals arrive 25% sooner | 1 | generals |
| Citadels gain +2 food and +2 production | 1–2 | citadels |
| Captured towns keep all their buildings | 2 | captured towns |
| Garrisoned towns give +10% production | 2 | garrisons |

### Wild: rule-benders and new decisions

| Idea | Band | Theme | What makes it interesting |
|---|---|---|---|
| **Veteran colonies:** a unit that has won a fight can retire into the nearest town as a citizen. | 1 | units trained → citizens | Rome's veteran colonies. Turns spare units into population (less to manage) and bridges to Expansionist's citizen and levy cards. |
| **The sack:** on capturing a town, keep it or sack it, razing it for a big lump of its production, gold and culture. | 2 | captured towns | A decision on every capture: hold land or take tempo. |
| **Field promotion:** your first kill each turn upgrades the killing unit to the best unit of its kind you can build. | 1 | kills, unit quality | Fewer, better pieces; the army modernises by fighting. |
| **Generals as governors:** a great general standing in a town gives it +20% to all yields. | 2 | generals | Spend the general on the front, or keep it as a governor. |
| **Living off the land:** units in enemy territory pay you that hex's food and production. | 1 | war, raiders | The army is an income on someone else's land. |
| **Soldier-farmers, literally:** a military unit standing on an improved tile works it like a citizen. | 0–1 | garrisons, improvements | The *tuntian* made literal; a one-off placement. |
| **The tribute:** a weaker neighbour at peace with you pays gold each turn. | 2 | war and peace | Intimidation as income. Needs a "weaker" measure. |
| **Hire the camp:** pay gold to hire a barbarian camp's units instead of clearing it. | 0 | camps | Clear for rewards, or buy an army. |
| **Kingdom of the sword:** drafts cost 2 less culture for each town captured this game. | 2 | captured towns → drafts | Conquest speeds up the deck. |
| **Trophies:** +3 science for each different empire whose unit you have killed this game. | 1 | kills | A collection goal; rewards fighting more neighbours. |
| **The long peace:** gains +2 culture every 10 turns at peace; losing a town resets it. | 1 | war and peace | A grower for a peaceful Dominion, at risk if attacked. |
| **Military roads:** every hex your army ends a turn on becomes a road. | 1 | logistics | Roman roads built by the legions. |
| **The moving capital:** once per age, move your palace to a captured town. | 3 | conquest | Steppe empires and Rome. |
| **Banners of the fallen:** each enemy capital you hold gives one more chair. | 3–4 | conquest → draft | A build-defining rare. |
| **Scorched earth:** when an enemy army enters your land, your pillaged hexes pay you and starve them. | 1 | defence | War against you hurts the attacker. |

Starred in the conversation: veteran colonies, the sack, field promotion and generals as governors. Together they make a loop (train, fight, promote survivors, retire veterans into towns) and answer the unit-spam tedium.
