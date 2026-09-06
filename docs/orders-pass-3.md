# The order pass — engines, payoffs, and the standalones that stay (2026-09-06)

The user: *"I agree with your mix of orders, engines, payoffs and standalones
… i think we can cut some standalones and add more payoff/engine cards.
Could you do a proposal pass?"*

Rulings this pass obeys (`docs/fewer-things.md` §4 and §6; `docs/balance-turn.md`
as marked up; `docs/tech-gifts.md` §7):

- **Roles**: an **engine** reads the deck or the board's *kind* (a line count,
  a slot position, an amplifier over card yields by voice, a building category,
  a "tiles that supply X" test, a period shortener); a **payoff** scales with
  what the empire has built, holds or slotted (per building, per citizen, a
  conversion, a tally, a doubler "applied last"); a **standalone** is a flat, a
  site-scoped flat, a rule, a one-off, or a **periodic boon** ("as a
  standalone" — the user).
- **Shares per pool: 25% engines · 30% payoffs · 45% standalones.**
- **Rarity correlates with power**: engines ● ◆, payoffs ○; the multiplier
  rides the role (a standalone keeps its balance-turn number; engines and
  payoffs take the pool's uplift).
- **The five engine shapes are the user's**, verbatim in §3; **all twelve
  lines are readable** (`slottedOrdersOfLine`).
- **Periodic boons are strong** — "their yields come in bursts" — absolute-turn
  stamped, a two-turn floor after shortening; the deck's periodic rows read
  *other* things than the tree's (Horology, The Long Count).
- The balance-turn markup's numbers and cuts stand (`garrisonState`,
  `thePrizeGrounds` cut; the re-cut rows keep their new text); its **29
  war/wild/expansion rows are left alone** except where a line reader makes
  one an engine.

**Nothing under `data/` moves until §8 is marked.** Every table row is
KEEP · CONVERT · CUT · NEW. A CUT row is `retired: true` (kept for saves).

---

## 1. The census — today and after

Roles classified over the 158 live rows by the definitions above.

| pool | rows today | E / P / S today | rows after | E / P / S after | target at 25/30/45 |
|---|---|---|---|---|---|
| Chiefdom | 11 | 1 / 4 / 6 | 10 | 3 / 4 / 3 | 3 / 3 / 4 |
| Government I | 29 | 1 / 10 / 18 | 25 | 6 / 9 / 10 | 6 / 8 / 11 |
| Government II | 45 | 5 / 17 / 23 | 40 | 10 / 15 / 15 | 10 / 12 / 18 |
| Government III | 46 | 1 / 21 / 24 | 40 | 9 / 17 / 14 | 10 / 12 / 18 |
| Government IV | 16 | 0 / 9 / 7 | 21 | 5 / 8 / 8 | 5 / 6 / 10 |
| Government V | 11 | 0 / 4 / 7 | 14 | 5 / 4 / 5 | 4 / 4 / 6 |
| **all** | **158** | **8 / 65 / 85** | **150** | **38 / 57 / 55** | |

The pools stay a little payoff-heavy and standalone-light against the
target; the user can strike further in §8 (every standalone left is either a
war rule the pass leaves alone, a charter door, or a periodic boon).

Counts of the verdicts: **KEEP 108 · CONVERT 12 · CUT 26 · NEW 30.**

---

## 2. The pass, per pool

Columns: id · **today** (the row's effect as it reads now — the balance-turn
markup's re-cuts are quoted in the verdict where they differ) · rarity (today →
after) · line (after) · role after · verdict and text. Weights are on the turn-92 empire (🌾211 ⚒131 💰143 🔬200 🎵195 🕯59,
six cities, a Temple and a Library in each, three routes, six unique
luxuries, ~45 road hexes, ~700 revealed hexes) — *alone* / *in a committed
deck of its line*.

### Chiefdom (11 → 10)

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `bloodedSpears` | +1 combat strength, and +2 more against barbarians. | ● | hunt | S | KEEP |
| `boundaryStones` | +30% border expansion in every city with a Monument. | ● | charter | P | KEEP — +30% border growth per Monument city |
| `campFollowers` | Clearing a barbarian camp grants +25 food and a random military unit. | ◆ | hunt | S | KEEP |
| `commonGranary` | +1 food in every city holding an improved luxury resource. | ● | green | P | KEEP |
| `farRunners` | All your units gain +1 sight. Claiming a ruin grants +10 culture. | ● | wayfarers | S | KEEP |
| `fireKeepers` | +1 faith in your capital, and +1 happiness there. | ● | procession | **E** | **CONVERT** — +1 faith per 2 citizens in your capital | [move the proposed ability to government 2 (+1 faith on tiles that supply faith), this is too early.]
| `firstFruitsOffering` | The first citizen born in each city pays +10 faith once. | ◆ | procession | — | **CUT** — a one-off first citizen's tithe; pays nothing after turn 30 |
| `firstRites` | +1 faith in your capital, and +1 faith for each wildcard Order you have in a slot. | ● | procession | **E** |  (the amplifier by voice, faith). The balance-turn markup cut its "per wildcard" as a snowball; an amplifier cannot snowball — it pays nothing with no faith cards and a third of the faith deck with them. Alone: 0; Faith deck at t92: ~25🕯 | 
[move to age 3: **CONVERT** — *"Your Orders that give faith give half again."*, payoff is very strong and won't be useful until later. Early orders should probably lean more standalone, as early faith is difficult to come by without early orders. eep the current effect for now]
| `saltTithes` | +2 gold for each unique luxury. | ● | caravan | P | KEEP |
| `theFoundingOath` | Your capital pays +1 of every yield for each building standing in it, at most 3. | ○ | charter | P | KEEP — the user's re-cut (+1 of each yield in the capital per city founded) |
| `theWidowsLevy` | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. | ◆ | forge | S | KEEP |
| **`theFirstChair`** | — | ◆ | court | **E** | **NEW** — *"The Order in your first economic slot pays twice."* (the slot-position reader; the user's shape, at the pool where the deck is three cards) | [move to age 2]

### Government I (29 → 25)

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `borderWardens` | +1 combat strength inside your territory, and +1 more for each military Order you have in a slot, at most +3 more. | ● | forge | **E** | **CONVERT** — *"+1 strength inside your territory, and +1 more for each Forge Order in a slot, at most +3."* (the line reader, `CombatScale` twin) | [KEEP, let's not add confusion with line-specific effects]
| `censusRolls` | +1 happiness for every 2 citizens in your capital. | ● | green | — | **CUT** — cheer per citizen; dead above the clamp | [KEEP, we nerfed happiness in the tech tree, so we need orders to supplement]
| `charterTowns` | Newly founded cities are founded with a Granary. | ◆ | charter | S | [REMOVE, duplicate of homestead charters] |
| `conscription` | +50% production toward units · −2 happiness. | ◆ | forge | S | KEEP |
| `festivalDays` | +4 happiness. | ● | green | S | KEEP — the user's re-cut (+4😊 capital, +2🎵 every city) |
| `granaryLevies` | When a city grows, it gains +10 production. | ◆ | green | S | KEEP (an occasion) |
| `harbourDues` | Coastal cities gain 5% of their gold again as culture. | ● | caravan | P | KEEP |
| `hillForts` | +2 combat strength when defending on hills, and a city on hills costs 1 less authority. | ◆ | highlands | S | KEEP |
| `homesteadCharters` | Newly founded cities start with 1 more population. | ◆ | charter | S | KEEP |
| `ritesCharter` | Unlocks the Chapel. | ◆ | procession | S | KEEP — the Chapel (a real build) |
| `ritesOfPassage` | Buying or completing a unit grants +10 faith. | ◆ | procession | S | KEEP (an occasion) |
| `silkRoads` | +3 gold on each trade route. | ◆ | caravan | P | [modified: attach yields to trade routes for later multipliers] |
| `spoilsOfTheWild` | Clearing a barbarian camp pays +100%. | ◆ | hunt | S | KEEP |
| `statuteLabour` | +1 production in every city for each 4 citizens living there. | ● | forge | P | [remove, boring] |
| `theAlmanac` | +2 science in your capital, and +1 science in every city with a Library. | ● | star | P | KEEP |
| `theBalladWeavers` | +1 culture per turn for each barbarian you have killed while this Order stands in a slot. | ◆ | hunt | P | KEEP (a tally) |
| `theBellFounders` | +1 culture per turn for each wonder finished anywhere in the world while this Order stands in a slot. | ◆ | court | P | [remove, boring] |
| `theLaureate` | +1 renown per turn. Every great-person improvement pays +2 more of its own yield. | ○ | court | P | KEEP |
| `theLegion` | Melee units gain +1 movement and +1 combat strength, and cities put 15% more production behind them. | ◆ | forge | S | KEEP |
| `theLongWatch` | +1 happiness for each unit standing in one of your cities, and +1 more for each fortification a city has built. | ● | forge | — | [KEEP, need sources of happiness] |
| `thePilgrimsPurse` | +5 faith in every city standing beside a holy site. | ◆ | procession | P | REMOVE, boring |
| `theRecklessLevy` | +50% production toward units · every unit +1 maintenance. | ◆ | forge | S | MODIFIED |
| `theTaxFarm` | +1 gold for each 4 population in your empire. | ● | caravan | P | KEEP |
| `theUnbrokenLand` | +1 food and +1 production on every unimproved forest or jungle hex. | ◆ | green | P | KEEP — the user's number (+1🌾 +1⚒) |
| `tinkersGuild` | Newly created workers gain +1 charge. | ◆ | ploughshare | S | KEEP |
| `vigilCharter` | Unlocks the Keep. | ◆ | forge | S | KEEP |
| `villageFairs` | +1 happiness for each luxury you hold two or more copies of. | ◆ | green | — | [KEEP] |
| `waysideShrines` | +1 faith in your capital for every city. | ● | procession | S | modified, put in capital for stacking bonuses later |
| `weightsAndMeasures` | +1 gold in every city. | ● | caravan | S | KEEP |
| **`theScriveners`** | — | ◆ | star | **E** | **NEW** — *"Your science buildings give half again their yield, the per-citizen lines included."* (the building-yield percent by category; the user's shape, verbatim). Alone at t92: six Libraries at (2 + 5) × 50% ≈ **21🔬**; with Universities later, ≈35 | [move to age 2]
| **`theHarvestHome`** | — | ● | green | **E** | **NEW** — *"Your Orders that give food give half again."* (amplifier, food). Alone: 0; Growth deck: ~15🌾 | [modify: your orders that give food give an additional food (this stacks better for bonuses like +1 food from each resource, etc.)]
| **`theMusterRolls`** | — | ◆ | forge | **E** | **NEW** — *"The Order in your first military slot pays twice."* (position) |
| **`theReevesBell`** | — | ● | ploughshare | S | **NEW, periodic** — *"Every eight turns, every city gains food equal to its population."* Bursts: ~60🌾 an eighth turn on the t92 empire ≈ 7.5🌾 a turn averaged; a growth deck shortens it |

### Government II (45 → 40)

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `breadAlone` | +3 food and −1 culture in every city. | ◆ | green | — | **CUT** — a flat with a tax on culture; the Harvest Songs are the food deck's card |
| `charteredCompanies` | Buying a hex pays +5 science · buying a hex costs 15% less. | ◆ | caravan | S | KEEP |
| `cisternWorks` | Every city of yours counts as standing on fresh water. | ○ | ploughshare | S | KEEP — the rule-changer, make this an uncommon |
| `coinCharter` | Unlocks the Assay House. | ◆ | caravan | S | KEEP |
| `drumsOfWar` | While this Order is in a slot, units created from now on are born with +2 combat strength, and keep it for life. | ◆ | forge | S | KEEP |
| `emergencyPowers` | While your authority is negative: capital +25% production, and borders do not freeze. | ○ | court | S | KEEP |
| `fieldSurgeons` | All units heal +10 more per turn, anywhere. | ● | forge | S | KEEP |
| `lamplighters` | +1 culture for each 5 faith you gain per turn. | ◆ | procession | P | KEEP — +1🎵 per 5🕯 (the conversion) |
| `ledgerKeepers` | +1 gold on markets, and +1 trade route. | ● | caravan | P | KEEP — the user's re-cut (routes to Market cities +1🔬 +1🎵) | [modify to put bonuses on markets]
| `marchDiscipline` | Military units gain +1 movement. | ◆ | forge | S | KEEP |
| `masterMasons` | Completing a building grants +10 culture. | ◆ | forge | S | KEEP (an occasion) |
| `oreTithes` | +1 production on every hex carrying a strategic resource, and +1 production in your capital for each military Order you have in a slot, no cap. | ● | forge | **E** | [KEEP] |
| `pilgrimRoads` | +1 faith for every 3 citizens in your capital · +1 happiness for each 50 banked faith (at most +5). | ◆ | procession | P | KEEP — the user's re-cut (+1🕯 per capital citizen) |
| `provincialGovernors` | +1 authority capacity for each economic Order you have in a slot, at most +4. | ● | court | P | [KEEP] |
| `publicani` | +2 gold for each point of positive authority. | ◆ | caravan | P | REMOVE |
| `riverWardens` | +1 food on every farm beside fresh water. | ● | ploughshare | P | REMOVE, duplicate of irrigation |
| `royalSurveyors` | +50% border expansion · buying a hex costs 25% less. | ● | charter | S | KEEP |
| `scholarsStipend` | +2 science in every city of 5 or more population holding a Library, and +2 more where a University stands. | ● | star | P | KEEP |
| `scorchedEarth` | Pillaging heals a further 25 and pays a further +10 gold. | ◆ | hunt | S | KEEP |
| `scrivenersCharter` | Unlocks the Scriptorium. | ◆ | star | S | KEEP |
| `siegeDoctrine` | +4 combat strength when attacking cities. | ● | forge | S | KEEP |
| `starGazers` | +2 science in every city with a mountain hex inside its borders. | ● | star | P | KEEP — the user's re-cut (+15%🔬 in mountain cities) |
| `sumptuaryLaws` | +1 happiness for each unique luxury. | ● | caravan | — | KEEP |
| `terracedHillsides` | +1 food on every hill hex. | ● | green | P | KEEP |
| `theArchives` | +1 culture for each Order you have placed in a slot. | ● | court | E | KEEP — the tagless deck reader (+1🎵 per slotted Order) |
| `theBannerCall` | While you are at war: +15% production toward units, and killing a unit grants +5 culture. | ◆ | forge | S | KEEP |
| `theCartographers` | +1 science for each 40 hexes you have revealed. | ◆ | wayfarers | P | KEEP — per 40 (the user: no buff) |
| `theChoir` | +1 culture and +1 happiness in every city with a Temple. | ● | procession | P | KEEP — the user's re-cut (+3🎵 +1😊 per Temple town) |
| `theChroniclersOfTheFallen` | +1 gold per turn for each unit you have lost in battle while this Order stands in a slot. | ◆ | forge | P | KEEP (a tally) |
| `theGuildCharter` | +2 gold for each economic Order you have in a slot, and +1 production in your capital for each. | ● | caravan | **E** | KEEP |
| `theHarvestSongs` | Every city gains 10% of its food yield again as culture. | ● | green | P | KEEP |
| `theLastHunt` | +2 culture and +2 science for each barbarian camp you have cleared this game. | ○ | hunt | P | KEEP |
| `theLongRoads` | +1 gold for each road hex you have laid. | ○ | caravan | P | REMOVE, boring |
| `theMasonsLodge` | Cities of 6 population or more put 10% more production behind buildings. | ◆ | forge | P | REMOVE, boring |
| `theOathBound` | Killing a unit heals the unit that struck the blow by 15. | ○ | forge | S | KEEP |
| `theOrchardTithe` | +1 food on every hex carrying a luxury resource. | ● | green | P | KEEP |
| `theQuietFields` | +1 happiness for each unimproved hex your cities work. | ● | green | — | REMOVE, too strong |
| `theReliquaryRolls` | +2 faith and +2 culture per turn for each great person you have spent while this Order stands in a slot. | ◆ | court | P | KEEP (a tally) |
| `theSenatus` | Unlocks the Assembly Hall. | ◆ | charter | S | KEEP |
| `theShipwrightShores` | +1 production in every coastal city · +30% production toward ships there. | ● | caravan | S | KEEP |
| `theSynod` | +1 faith and +1 culture for each wildcard Order you have in a slot. | ● | procession | **E** | CHANGE: your faith buildings provide +50% yields (applies to total yields, including from other effects) |
| `theTitheOfIron` | +2 production on every mine · −1 food in every city with one. | ◆ | forge | P | KEEP — the user's (+3⚒ per mine, −3🌾) |
| `theWarCouncil` | +1 combat strength for each military Order you have in a slot, no cap. | ● | forge |
| `toolmakersCharter` | Unlocks the Smithy. | ◆ | forge | S | KEEP |
| `waterwrightsCharter` | Unlocks the Cistern. | ◆ | ploughshare | S | KEEP |
| **`theAlmanacOfHours`** | — | ◆ | court | **E** | **NEW** — *"Your every-so-many-turns Orders fire three turns earlier."* (the period shortener; the user's shape, verbatim). Alone: nothing; with two periodic rows: their bursts a third more often |
| **`theAssayersRule`** | — | ● | caravan | **E** | **NEW** — *"Your tiles that supply gold give one more."* (tile test). Alone at t92: ~10 gold hexes → 10💰 |
| **`theCountingHouses`** | — | ◆ | caravan | **E** | **NEW** — *"Your gold buildings give half again their yield."* (building percent: Market, Bazaar, Bank) |
| **`theFoundryDays`** | — | ● | forge | S | **NEW, periodic** — *"Every ten turns, every mine and quarry pays its production again, at once, to its city."* ~20 hexes × 3⚒ = 60⚒ a tenth turn |
| **`theNetsBlessing`** | — | ○ | caravan | P | **NEW** — *"Double the yields of your fishing boats, applied last."* (the doubler by category; the user's list) |
RARE PAYOFF: yields to your capital from orders are 50% more effective.
UNCOMMON ENGINE: +1 faith on shrines for every faith roll while this order is slotted.

### Government III (46 → 40) — the fork

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `almshouseCharter` | Unlocks the Almshouse. | ◆ | procession | S | KEEP |
| `censusOfSouls` | +1 faith for each citizen in your capital. | ◆ | procession | P | KEEP |
| `clientKings` | +2 authority capacity · a captured city costs one less authority. | ● | court | S | KEEP |
| `firstFruits` | +1 food on every hex carrying a resource. | ● | green | P | KEEP |
| `forcedMarches` | Melee units gain +1 movement, and +2 instead inside your own territory. | ● | forge | S | KEEP |
| `frontierForts` | +6 city defence in every city near another empire's territory. | ● | highlands | S | REMOVE, boring |
| `garrisonState` | Each city gains +3 production for each combat unit standing in it (at most +6 per city). | ● | forge | — | **CUT** — the user: "remove, boring" |
| `justicesCharter` | Unlocks the Assize Court. | ◆ | court | S | KEEP |
| `mandateOfHeaven` | The science and culture your happy cities pay rises 5 percentage points · +1 happiness for each 200 banked faith. | ◆ | procession | P | KEEP |
| `mintCharter` | Unlocks the Coinworks. | ◆ | caravan | S | KEEP |
| `provincialMints` | +2 gold for each improved copy of a luxury — duplicates count. | ● | caravan | P | KEEP — the user's re-cut (+10%💰 in cities with an improved luxury) |
| `quarrymensGuild` | +4 production in every city with a quarry. | ● | forge | P | KEEP |
| `skirmishersCreed` | Ranged units gain +1 range. | ○ | forge | S | KEEP |
| `stargazersCharter` | Unlocks the Orrery. | ◆ | star | S | KEEP |
| `theAlmonersBook` | +1 science per turn for each 400 gold you have spent buying while this Order stands in a slot. | ◆ | star | — | **CUT** — a tally on gold spent buying; pays under a hundredth of a voice |
| `theAnnalsOfLaw` | +2 culture for each Order you hold but have not placed in a slot. | ● | court | E | KEEP — the bench reader; better as chairs shrink |
| `theArsenalLaw` | While you are at war, cities with a Barracks gain 15% of their production again as gold. | ○ | forge | P | KEEP |
| `theAuspiciousSeal` | The first time this Order is placed in a slot, a die of the Magister is yours. | ● | court | — | **CUT** — a die of the Magister; the dice are gone |
| `theCasusBelli` | Declaring war grants +2 combat strength to all your units and +10% production in every city, for 10 turns. | ○ | forge | S | KEEP |
| `theCensusEternal` | +1 science for every 4 citizens in your empire. | ● | star | P | KEEP |
| `theCharterOfTheMarches` | Your newest city gains +2 of every yield. Founding a city grants +30 culture. | ○ | charter | — | **CUT** — reads only at a founding, after the founding age |
| `theCongregation` | +1 culture and +1 science for each city in the world that follows your religion. | ○ | procession | P | REMOVE |
| `theDraftingHalls` | Cities with a Library gain 10% of their production again as science. | ● | star | P | KEEP |
| `theDryDocks` | +25% production toward ships in every city with a Harbour. | ● | caravan | — | **CUT** — a per-building line on a building the game rarely has |
| `theEscortedRoads` | Trade routes pay 30% more. | ● | caravan | P | KEEP — +30% (the user: "a payoff card from other bonuses to trade routes") |
| `theFarCharts` | +1 science for each 20 hexes you have revealed. | ○ | wayfarers | P | KEEP |
| `theFinishersArt` | +4 combat strength against units below half strength. | ● | forge | — | **CUT** — Decisive Blows (IV) is the same rule, bigger |
| `theGoldenScales` | Every city gains 10% of its gold yield again as science. | ● | caravan | P | KEEP |
| `theGrainDole` | +2 happiness in every city of 6 or more population. | ● | green | — |KEEP |
| `theGranaryLaws` | Cities of 8 or more population gain 10% of their food yield again as science. | ◆ | green | P | KEEP |
| `theGroundskeepers` | +1 food and +1 production on every great-person improvement. | ● | court | P | KEEP — the user's (+2🌾 +2⚒ per great work) |
| `theLyceum` | Completing a technology grants an extra turn of culture. | ◆ | star | P | KEEP — a turn (the user: no buff) |
| `theMarshals` | +2 combat strength for each adjacent friendly combat unit (at most +4). | ◆ | forge | S | KEEP |
| `theMasterBuilders` | The Magnum Opus and cathedrals cost 15% less production. | ● | forge | S | KEEP |
| `theMastersPresence` | +10% to every yield in each city beside a great person's work. | ● | court | P | KEEP |
| `theOldWays` | The yields of unimproved hexes are doubled. | ◆ | green | P | KEEP |
| `thePrizeGrounds` | +2 happiness in every city settled on a luxury resource. | ● | charter | — | **CUT** — the user: "remove this one entirely" |
| `theProvisioners` | internal trade routes supply 1 happiness | ● | caravan | — | KEEP |
| `theSaintsFields` | +3 faith on every great-person improvement. | ● | procession | P | KEEP — +3🕯 (the user) |
| `theSaltingHouses` | Coastal cities gain 10% of their food yield again as production. | ● | caravan | — | **CUT** — a coastal food-to-production conversion nobody builds around; the Grain Fleet (IV) is the coastal card |
| `theStandingLevy` | Every 12 turns, a free melee unit musters in your capital. | ○ | forge | S | KEEP — a periodic row already; every 12 turns a free melee unit |
| `theWarChest` | Military units cost 3 less gold in maintenance. | ● | forge | S | KEEP — −2💰 (the user) |
| `theWayhouses` | +2 gold and +1 culture for each trade route you run. | ● | caravan | P | KEEP — the user's re-cut (+3🎵 +1💰 per route) |
| `theWinteringGrounds` | Your units cost no gold in maintenance outside your territory. | ● | forge | — | **CUT** — the War Chest is the upkeep card |
| `theWonderFeasts` | +2 food in every city while it is building a wonder · +10% production toward wonders. | ● | forge | S | KEEP |
| `tolerationEdicts` | −10% happiness demanded per citizen. | ● | court | S | KEEP — −15% demanded (the user) |
| **`theIronRule`** | — | ◆ | forge | **E** | **NEW** — *"Your Orders that give production give half again."* (amplifier, production; the user's shape, verbatim). Alone: 0; Forge deck at t92 (Tithe of Iron 21, Quarrymen 8, Statute 12, Ore Tithes 6 …): ~24⚒ | [remove]
| **`theWorkshopsRule`** | — | ◆ | forge | **E** | **NEW** — *"Your production buildings give half again their yield."* (building percent: Workshop, Forge, Barracks' percent line) |
| **`theLitany`** | — | ● | procession | **E** | **NEW** — *"+1🕯 in every city for each Procession Order in a slot."* (line reader; the worked deck's engine). Alone: 6🕯; Faith deck with five Procession cards: 30🕯 | [remove]
| **`theChartroom`** | — | ● | star | **E** | **NEW** — *"+2🔬 in your capital for each Star or Wayfarers Order in a slot, and +1 in every other city."* (line reader over two lines) | [remove]
| **`theWildChair`** | — | ◆ | court | **E** | **NEW** — *"The Order in your first wildcard slot pays twice."* (position) |
| **`theGoldenCenser`** | — | ○ | procession | P | **NEW** — Every 15 turns, gain half your science as faith.
| **`theDeepSeams`** | — | ○ | forge | P | **NEW** — *"Double the yields of your mines, applied last."* (doubler). ~20 mines × 3 = **60⚒** — the Æra III spike the fork wanted, and the reason it is rare |
| **`theExchangeCharter`** | — | ○ | caravan | P | **NEW** — *"50% yields from gold buildings, applied last."* |
| **`theTriumph`** | — | ● | court | S | **NEW, periodic** — *"Every twelve turns, your capital gains culture equal to your empire's production."* 131🎵 a twelfth turn ≈ 11🎵 a turn; shortened, a ninth |

### Government IV (16 → 21)

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `assizeCourts` | +1 authority capacity for each 3 cities you hold · a captured city costs 1 authority. | ◆ | court | P | KEEP |
| `cathedralChapters` | +1 happiness for each Cathedral you hold · +2 culture in every city with one. | ◆ | procession | P | **CONVERT** (the cheer half goes) — *"+2🎵 and +2🕯 in every city with a Cathedral."* |
| `courtAstronomers` | +2 science for each wonder you hold. | ◆ | star | P | KEEP — +10🔬 per wonder (the user) |
| `decisiveBlows` | +5 combat strength when attacking a unit below half strength. | ○ | forge | S | KEEP |
| `fieldHospitals` | Units resting inside your own territory mend completely each turn. | ◆ | forge | S | KEEP |
| `harbourmasters` | +1 trade route · +1 gold on every fishing boat. | ◆ | caravan | P | KEEP — +2💰 per boat (the user) |
| `knightlyOrders` | Mounted units gain +5 combat strength inside your territory, and cities put 25% less production behind them. | ○ | forge | S | KEEP |
| `patrons` | +2 culture for each wonder you hold. | ◆ | court | P | KEEP — +10🎵 per wonder (the user) |
| `scholastics` | +2 science for each University you hold · completing a technology grants +15 faith. | ◆ | star | P | KEEP |
| `theConsistory` | +1 faith for each Temple you hold. | ◆ → ○ | procession | P | KEEP — the user's re-cut, *"double the yields of your Temples, applied last"* — a doubler is a payoff and goes rare |
| `theFactorHouses` | +3 science for each trade route you run to another empire. | ○ | caravan | — | **CUT** — a Gov IV rare paying under a fiftieth of a voice |
| `theGrainFleet` | +2 food in every coastal city · +25% growth surplus there. | ○ | green | P | KEEP |
| `theGuildOfMasons` | +30% production toward wonders · −15% production toward units. | ● | court | S | KEEP |
| `theKingsRoad` | Your units gain +1 movement inside your own territory. | ◆ | forge | S | KEEP |
| `theMarshalsPurse` | Military units cost 25% less to buy. | ○ | forge | S | KEEP |
| `theSiegeTrain` | Siege units gain +1 movement. | ◆ | forge | S | KEEP |
| **`theScholarsRule`** | — | ◆ | star | **E** | **NEW** — *"Your Orders that give science give half again."* (amplifier, science) |
| **`theVestryRule`** | — | ◆ | procession | **E** | **remove** — duplicate, moved earlier (building percent: Shrine, Temple, Cathedral, Chapel) |
| **`theExchequer`** | — | ● | caravan | **E** | double your trade route yields |
| **`theAssay`** | — | ○ | caravan | P | **NEW** — Every 20 turns, gain your total gold as science |
| **`theBroadAcres`** | — | ○ | green | P | **NEW** — *"Double the yields of your farms, applied last."* — the largest doubler, so the latest; ~40 farms × 2 = 80🌾 |
| **`theJubilee`** | — | ◆ | procession | S | **NEW, periodic** — *"Every 10 turns, every city gains faith and culture equal to its population."* |

### Government V (11 → 14)

| id | today | rarity | line | role | verdict |
|---|---|---|---|---|---|
| `admiralty` | Embarked units gain +1 movement · +5 defence in every coastal city. | ○ | caravan | S | KEEP |
| `forcedMarch` | Military units gain +1 movement outside your own territory. | ○ | forge | S | KEEP |
| `manufactories` | +2 production on every manufactory. | ◆ | forge | — | **CUT** — a per-building line on a great work few hold |
| `printingHouses` | +1 culture for each Library you hold · +2 science in every city with a Printing House. | ◆ | star | P | KEEP — the user's re-cut (+3🎵 per Library; +10%🔬) |
| `theGuildCompact` | +5% production for every specialist in a city, up to 40%. | ○ | forge | P | KEEP |
| `theInquisition` | +2 happiness and +2 faith in every city with a Temple. | ● → ○ | procession | P | KEEP — the user's re-cut (+8🕯 +8🎵 on Temples) is a payoff at rare size |
| `theMagistersCourt` | +30% production toward the Magnum Opus. | ○ | court | S | KEEP |
| `theSalon` | Every great-person offer shows one more card. | ● | court | S | CHANGE: Double the yield of great people improvements |
| `theSilkExchange` | +2 gold for each trade route you run. | ◆ | caravan | P | KEEP — the user's re-cut (+1🎵 per 2 population in the destination) |
| `titheBarns` | Cities keep 50% of their stored food when they grow · −1 faith in every city. | ○ | green | — | **CUT** — net negative to hold |
| `universalSuffrage` | +1 happiness for each 4 citizens in your empire · happiness tiers +5 percentage points. | ◆ | green | S | KEEP — the tier boost is live above the clamp |
| **`theCompactOfChairs`** | — | ○ | court | **E** | **NEW** — *"The Order in the first slot of every kind pays twice."* (position; the capstone) |
| **`theEncyclopaedists`** | — | ○ | star | P | **NEW** — *"Every 10 turns, gain your total science yield as culture"* |
| **`theLaureatesRule`** | — | ◆ | court | **E** | **NEW** — *"Your Orders that give culture give half again."* (amplifier, culture) |
| **`theGreatClock`** | — | ○ | court | **E** | **NEW** — *"Your every-so-many-turns Orders fire three turns earlier and pay half again."* (shortener + a rider on the boon; the periodic capstone) |
| **`theCollegesRule`** | — | ○ | star | P | **NEW** — *"Double the yields of your Universities, applied last."* |

JUST WIN NOW orders:
- while slotted, gain a tech bead for every 2 age 5 technologies you research
- while slotted, gain a culture bead for every draft you skip
- while slotted, gain a military bead for every city you raze
- while slotted, gain a faith bead for every prophet proclamation

---

## 3. The engine catalogue, by shape

| shape (the user's words) | rows | pools |
|---|---|---|
| **"your orders that give X give 50% more X"** — the amplifier by voice | `firstRites` 🕯 · `theHarvestHome` 🌾 · `theIronRule` ⚒ · `theScholarsRule` 🔬 · `theLaureatesRule` 🎵 | Chiefdom · I · III · IV · V — one voice per age, faith first (the smallest voice, where half again is safe) |
| **"your X buildings give an extra 50% base yield (per-pop included)"** — the building percent by category | `theScriveners` (science) · `theCountingHouses` (gold) · `theWorkshopsRule` (production) · `theVestryRule` (faith) | I · II · III · IV |
| **"your tiles that supply X give one more"** — the tile test | `fireKeepers` 🕯 · `theAssayersRule` 💰 | Chiefdom · II (food and production tiles are too many hexes for +1 to be an engine rather than a flood — left to the doublers) |
| **"your first economic slot pays twice"** — the position reader | `theFirstChair` (economic) · `theMusterRolls` (military) · `theWildChair` (wildcard) · `theCompactOfChairs` (every kind) | Chiefdom · I · III · V |
| **"your every-X-turn cards trigger 3 turns earlier"** — the shortener | `theAlmanacOfHours` · `theGreatClock` (+ half again) | II · V |
| the line reader (all twelve readable) | `borderWardens` `oreTithes` `theWarCouncil` (Forge, strength and hammers) · `theSynod` `theLitany` (Procession) · `theGuildCharter` `theExchequer` (Caravan) · `theChartroom` (Star + Wayfarers) · `theArchives` `theAnnalsOfLaw` (tagless) | I–IV |

Twenty-four engines in all, thirty-eight counting the readers' twins.

## 4. The payoff catalogue

| scales with | rows |
|---|---|
| a doubler "applied last" (the user's list) | `theNetsBlessing` fishing boats (II) · `theDeepSeams` mines (III) · `theExchangeCharter` Markets (III) · `theConsistory` Temples (IV) · `theBroadAcres` farms (IV) · `theCollegesRule` Universities (V) |
| a conversion at a share per line card | `theGoldenCenser` 🕯→🔬 per Procession (III) · `theAssay` 💰→🔬 per Caravan (IV) · `theEncyclopaedists` 🔬→🎵 per Star (V) |
| a conversion at a flat share | `lamplighters` · `theHarvestSongs` · `theGoldenScales` · `theGranaryLaws` · `theDraftingHalls` · `harbourDues` · `theArsenalLaw` · `printingHouses` |
| per building / per building city | `theAlmanac` · `theChoir` · `scholarsStipend` · `theMasonsLodge` · `quarrymensGuild` · `theTitheOfIron` · `cathedralChapters` · `courtAstronomers` · `patrons` · `scholastics` · `theInquisition` · `theGuildCompact` · `theMastersPresence` |
| per citizen / per city / per copy | `statuteLabour` · `theTaxFarm` · `censusOfSouls` · `pilgrimRoads` · `theCensusEternal` · `provincialMints` · `saltTithes` · `theFoundingOath` · `provincialGovernors` · `assizeCourts` |
| per route / per road / per hex revealed / per great work | `silkRoads` · `ledgerKeepers` · `theWayhouses` · `theEscortedRoads` · `theSilkExchange` · `harbourmasters` · `theLongRoads` · `theCartographers` · `theFarCharts` · `theSaintsFields` · `theGroundskeepers` · `theLaureate` |
| a tally while slotted | `theBalladWeavers` · `theBellFounders` · `theChroniclersOfTheFallen` · `theReliquaryRolls` · `theLastHunt` |
| the ground | `commonGranary` · `terracedHillsides` · `riverWardens` · `theOrchardTithe` · `firstFruits` · `theUnbrokenLand` · `theOldWays` · `theGrainFleet` · `boundaryStones` · `mandateOfHeaven` · `theCongregation` · `theLyceum` · `publicani` |

## 5. Twelve lines, all readable

The `line: 'none'` rows are reassigned by what they pay (the table's line
column is the assignment). Rows carrying each line after the pass, and
whether the line has an engine and a payoff to read it:

| line | rows | engines reading it | payoffs scaling with it | note |
|---|---|---|---|---|
| forge | 41 | Border Wardens (I) · Ore Tithes, War Council (II) · Iron Rule, Workshops' Rule, Muster Rolls (I/III) | Deep Seams (III) · Guild Compact (V) | the largest line; strength *and* hammers read it |
| caravan | 26 | Guild Charter (II) · Assayers' Rule, Counting Houses (II) · Exchequer (IV) | Nets' Blessing (II) · Exchange Charter (III) · Assay (IV) | |
| procession | 22 | Fire Keepers, First Rites (C) · Synod (II) · Litany (III) · Vestry Rule (IV) | Golden Censer (III) · Consistory (IV) · Inquisition (V) | the worked Faith deck's line |
| green | 16 | Harvest Home (I) | Broad Acres (IV) · Grain Fleet (IV) | one engine — **flag**: a second green engine (a growth-occasion reader) is a §8 question |
| star | 14 | Scriveners (I) · Chartroom (III) · Scholars' Rule (IV) | Colleges' Rule (V) · Encyclopaedists (V) | |
| court | 20 | First Chair (C) · Archives (II) · Almanac of Hours (II) · Wild Chair, Annals (III) · Compact, Laureates' Rule, Great Clock (V) | Masters' Presence (III) · Patrons (IV) | the deck-reading line, as intended |
| hunt | 6 | — | Ballad Weavers (I) · Last Hunt (II) | **no engine** — the wild is deferred on the bot side; leave it |
| wayfarers | 4 | Chartroom (III, with star) | Cartographers (II) · Far Charts (III) | |
| charter | 8 | — | Boundary Stones (C) · Founding Oath (C) | **no engine** — expansion reads the board (cities founded), not the deck; leave it |
| ploughshare | 6 | Reeve's Bell (I, periodic) reads nothing; Cistern Works is a rule | River Wardens (II) | **flag** — merge ploughshare into green? a §8 question |
| highlands | 2 | — | — | **flag** — two rows (Hill Forts, Frontier Forts); merge into forge? |
| cloister | 0 | — | — | **flag** — no live Order carries it (doctrines may); retire the mark or fold into procession |

## 6. Three worked decks — the turn-92 empire

Chairs: eleven (today's Gov III), noting the ruled cut to eight makes every
figure below a little smaller and the choice a little sharper.

**Deck 1 — the generic pile** (standalones and flat payoffs, no engine):
Long Roads 45💰 · Far Charts 35🔬 · Scholars' Stipend 20🔬 · Granary Laws
18🔬 · Census Eternal 15🔬 · Lyceum 24🎵 · Harvest Songs 21🎵 · Annals 16🎵
· Tax Farm 15💰 · Statute Labour 12⚒ · Census of Souls 12🕯 → **233 points,
as today** (every row kept its number).

**Deck 2 — the Faith deck** (Fire Keepers · First Rites · Synod · Litany ·
Vestry Rule — five engines; Golden Censer · Consistory · Inquisition — three
payoffs; Wayside Shrines · Saints' Fields · Choir — three standalones):

| row | pays |
|---|---|
| standalones (Wayside Shrines 6🕯 · Saints' Fields 9🕯 · Choir 18🎵 +6😊) | 15🕯 · 18🎵 |
| Fire Keepers (faith tiles +1) | 12🕯 |
| Litany (+1🕯 every city × 5 Procession) | 30🕯 |
| Vestry Rule (faith buildings +50%: six Temples, a Cathedral, two Shrines) | 14🕯 |
| Consistory (Temples doubled, applied last) | 12🕯 → 26🕯 after the Vestry |
| Inquisition (+8🕯 +8🎵 on Temples) | 48🕯 · 48🎵 |
| Synod (+2🕯 +2🎵 × 5) | 10🕯 · 10🎵 |
| First Rites (faith cards ×1.5 — over the card lines above, ≈120🕯) | +60🕯 |
| Golden Censer (faith → science, 3% × 5 = 15% of ≈240🕯) | 36🔬 |
| **total** | **≈215🕯 · 76🎵 · 36🔬 ≈ 330 points** — and the empire's faith goes from 59 to ≈270 |

The Faith deck out-pays the pile by two fifths in points and by a factor of
four in its own voice — which is the part that changes play: a faith of 270
a turn buys rerolls, rites in every city, the faith ladder's rungs early,
and everything the Cathedral sells; the temples, the Chapel and the
Cathedral become the build.

**Deck 3 — the Trade deck** (Assayers' Rule · Counting Houses · Guild
Charter · Exchequer — four engines; Exchange Charter · Assay · Escorted
Roads — three payoffs; Long Roads · Silk Roads · Wayhouses · Weights and
Measures — four standalones/flats):

| row | pays |
|---|---|
| Long Roads 45 · Silk Roads 9 · Wayhouses 3💰 9🎵 · Weights 6 | 63💰 · 9🎵 |
| Assayers' Rule (gold tiles +1) | 10💰 |
| Counting Houses (gold buildings +50%: six Markets, two Bazaars) | 12💰 |
| Guild Charter (+2💰 × 5 Caravan, +5⚒) | 10💰 · 5⚒ |
| Exchequer (+3💰 × 5) | 15💰 |
| Exchange Charter (Markets doubled, applied last) | 18💰 → 27💰 |
| Escorted Roads (routes +30%) | ≈6💰 |
| Assay (gold → science, 15% of ≈290💰) | 43🔬 |
| **total** | **≈145💰 · 9🎵 · 5⚒ · 43🔬 ≈ 200 points** — gold 143 → ≈290 |

Smaller in points than the Faith deck (gold is the voice the game prices
lowest) but it doubles the treasury, which buys tiles, units and buildings
outright — the Trade path's play is *purchasing*, and the Assay turns the
surplus into science. Whether 200 is enough against 233 is a §8 question:
the Trade line may want its amplifier ("Orders that give gold give half
again") one pool earlier than the Counting Houses.

## 7. Interactions

| surface | what moves |
|---|---|
| `docs/orders-and-doctrines.md` + `statecraftDocSync.test.ts` | name and rarity per pool are pinned; 26 retirements, 30 new rows, 12 conversions and the rarity moves (Consistory, Inquisition → ○) all re-print; a **role** column and a **line** column join the table with their own sync |
| `test/sim/statecraft.test.ts` (the fold registry) | the five engine shapes, the line count, the period shortener and the doubler join it; a shape declared but never read fails the register test |
| `cardImpact` stamps | every converted and new row stamps; the amplifier's stamp is "what the other cards would pay more" — the aggregate on Confirm is where it reads best |
| the draw | rarity moves change the bag — **one schema bump**; the retirements keep their rows |
| the bot | `draftPlan` prices cards alone: every **engine** here prices near zero and is never drafted (the marginal-reading debt, fewer-things §5); the doublers and conversions price through `explainCounted`/percent readings; the periodic rows price as a windfall over the period. The bot plays a standalone-and-payoff deck until the marginal reading lands — acceptable for the first playtest, written down |
| pacing harnesses | the deck's power moves every band; re-aim after the pass lands, once |
| the compendium | generated; each new shape needs its words once |
| `Order.rarity` weights | 4/2/1 + `skipPity`: with payoffs rare, the pass and the pity are the path to them, as designed |

## 8. For your markup

1. **Pool sizes.** 150 rows after the pass (Gov II 40, Gov III 40 are still
   large). Strike further standalones per pool, or accept.
2. **The NEW rows' texts** (30) — every one is a proposal; the user's five
   shapes are placed one voice per age for the amplifiers and one category per
   age for the building percents. Mark any that should move pools.
3. **The doublers' placements** — fishing boats (II) · mines (III) · Markets
   (III) · Temples (IV) · farms (IV) · Universities (V). Farms last because
   it is the largest; mines at the fork because it is the spike.
4. **Periodic figures** — Reeve's Bell (8 turns, food = population), Foundry
   Days (10, mines and quarries pay again), Triumph (12, culture = empire
   production), Jubilee (15, faith and culture = population), and the Standing
   Levy's 12. Strong by ruling; mark any up or down.
5. **The lines with no engine** — hunt and charter (leave), green (one engine
   only — add a growth-occasion reader?), ploughshare (merge into green?),
   highlands (merge into forge?), cloister (retire the mark?).
6. **The Trade deck's size** — move the gold amplifier earlier, or accept
   that Trade plays through purchasing rather than points.
7. **Conversions that override your balance-turn marks** — `firstRites`
   (your "+1🕯 every city" → the faith amplifier; the standalone version is
   `waysideShrines` already) and `theSynod` (your +2/+2 kept, the count moved
   from wildcard slots to the Procession line). Confirm or revert.

---

## 9. The markup, folded (2026-09-06) — rulings, the new grammar, and four questions

The user's marks are in the tables above; this section records what they
rule and what they change about the pass's *shape*.

### The grammar the marks reveal

Read together, the marks say one thing: **put yields on a thing, then
multiply the thing.** Silk Roads' gold goes *on the route* ("for later
multipliers"); Ledger Keepers' gold goes *on the Market*; Wayside Shrines'
faith goes *in the capital* ("for stacking bonuses later"); then the
multipliers come as payoffs, applied last — "double your trade route yields",
"+50% from gold buildings", "faith buildings +50% including other effects",
"yields to your capital from Orders are 50% more effective", "double the
yield of great-people improvements". That is a cleaner combo engine than
line reading: the *object* is the tag (a route, a building category, the
capital, a great work, a tile), it is visible on the board, and the player
learns it by placing a card and watching a number move. So:

- **Line readers are withdrawn** ("let's not add confusion with
  line-specific effects"): Border Wardens, the Guild Charter, Ore Tithes,
  Provincial Governors and the War Council keep their **slot-flavour** counts
  (military / economic / wildcard — the slot type the player already sees),
  with the caps off Ore Tithes and the War Council; the Litany, the
  Chartroom and the Exchequer's line count go. **This withdraws
  fewer-things' "all twelve lines readable" for Orders** — `CardLine` stays a
  drawn mark and `slottedOrdersOfLine` is not built. *(Question 2 below
  confirms.)*
- **Amplifiers stack additively, not multiplicatively**: "your Orders that
  give food give **an additional** food" (per line instance, so it stacks
  with "+1 food on each resource hex" hex by hex); the "half again" amplifier
  survives only as the late faith card. The Iron Rule (production ×1.5) goes.
- **Multipliers are late and rare**; the early pools lean **standalone**
  ("early orders should probably lean more standalone, as early faith is
  difficult to come by without early orders"). Fire Keepers keeps a flat
  (+1🕯 per 2 capital citizens); the faith-tile engine moves to Gov II; the
  faith amplifier to Gov III; the First Chair and the Scriveners to Gov II.
- **Periodic conversions replace the per-line conversions**: the Golden
  Censer "every 15 turns, half your science as faith"; the Assay "every 20
  turns, your gold as science"; the Encyclopaedists "every 10 turns, your
  science as culture"; the Jubilee every 10. Bursts, strong, on the ruled
  occasion.
- **Happiness rows stay** (Census Rolls, the Long Watch, Village Fairs,
  Sumptuary Laws, the Grain Dole, the Provisioners): "we nerfed happiness in
  the tech tree, so we need orders to supplement." *(Question 4 — the clamp.)*
- **Cuts for boredom or duplication**: Charter Towns (Homestead Charters
  covers it), Statute Labour, the Bell Founders, the Pilgrims' Purse, the
  Publicani, River Wardens (Irrigation's gift now), the Long Roads, the
  Masons' Lodge, Frontier Forts, the Congregation, the Quiet Fields ("too
  strong"), the Vestry Rule (the Synod is now that card).

### Rows as ruled (beyond the tables)

| row | as ruled |
|---|---|
| `theSynod` | **your faith buildings +50%, applied to the total including other effects** (the building percent, applied last) — Gov II |
| `theExchangeCharter` | **+50% yields from gold buildings, applied last** — Gov III |
| `theExchequer` | **double your trade route yields** — Gov IV, a rare payoff (the multiplier on the object Silk Roads and Ledger Keepers stack onto) |
| `theSalon` | **double the yield of great-people improvements** — Gov V (the Laureate and the Groundskeepers stack onto them) |
| `theGuildCompact` | **+5% production per specialist in a city, up to 40%** |
| `theMagistersCourt` | +30% toward the Opus |
| `theRecklessLevy` | +50% toward units · every unit +1 maintenance |
| `waysideShrines` | +1🕯 in your capital for every city |
| `silkRoads` · `ledgerKeepers` | yields attached to the route / the Market |
| `cisternWorks` | uncommon |
| **new, Gov II, rare payoff** | *"Yields to your capital from Orders are 50% more effective."* — the capital as the object; Wayside Shrines, the Guild Charter's hammers, Fire Keepers stack onto it |
| **new, Gov II, uncommon engine** | *"+1 faith on Shrines for every faith roll while this Order is slotted."* — a tally on the faith ladder's rungs (*question 3*) |
| **new, Gov V — "just win now"** | *while slotted*: a tech bead per two Æra V technologies researched · a culture bead per draft skipped · a military bead per city razed · a faith bead per prophet's proclamation — the Æra V acceleration the victory ruling asked for (beads gate the Opus door), written as Orders so they are drafted, not given |

### The census after the marks (estimate)

| pool | rows | engines | payoffs | standalones |
|---|---|---|---|---|
| Chiefdom | 9 | 0 | 4 | 5 |
| Government I | 20 | 1 (Muster Rolls) | 7 | 12 |
| Government II | 38 | 6 (Synod, First Chair, Scriveners, faith tiles, Assayers', Counting Houses, Almanac of Hours, the shrine tally) | 14 | 18 |
| Government III | 34 | 4 (faith amplifier, Workshops' Rule, Wild Chair, Almanac…) | 15 | 15 |
| Government IV | 19 | 3 | 9 | 7 |
| Government V | 17 (with the four bead rows) | 4 | 5 | 8 |

Early pools standalone-heavy, late pools multiplier-heavy — the ladder the
user asked for, and the reason the 25/30/45 share is now **per game**, not
per pool.

### Four questions

1. **"Move to age 2 / age 3"** — read as the Government II and III pools
   (Orders live in pools, not ages). Confirm.
2. **Lines** — the marks withdraw line reading for Orders. Confirm that
   `CardLine` stays a drawn mark only and `slottedOrdersOfLine` is not built
   (fewer-things §4 and §6 item 8 then re-rule). Slot-flavour counts stay.
3. **"For every faith roll"** — the faith ladder's consecration rungs (three
   in a game), or every time faith is *spent* (rites, rerolls)? The second is
   the livelier tally.
4. **The cheer clamp** — with the cheer rows kept and happiness nerfed on the
   tree, `METERS.tierClamp` still caps the bonus at the second rung, so an
   empire at 28 happiness gets nothing from a +1. Raise the clamp (one
   number), or leave cheer as a floor against unhappiness rather than a
   bonus? The pass reads better with the clamp raised now that cheer is
   scarcer.
