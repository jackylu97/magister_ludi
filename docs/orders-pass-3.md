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

Columns: id · rarity (today → after) · line (after) · role after · verdict and
text. Weights are on the turn-92 empire (🌾211 ⚒131 💰143 🔬200 🎵195 🕯59,
six cities, a Temple and a Library in each, three routes, six unique
luxuries, ~45 road hexes, ~700 revealed hexes) — *alone* / *in a committed
deck of its line*.

### Chiefdom (11 → 10)

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `bloodedSpears` | ● | hunt | S | KEEP |
| `boundaryStones` | ● | charter | P | KEEP — +30% border growth per Monument city |
| `campFollowers` | ◆ | hunt | S | KEEP |
| `commonGranary` | ● | green | P | KEEP |
| `farRunners` | ● | wayfarers | S | KEEP |
| `fireKeepers` | ● | procession | **E** | **CONVERT** — *"Your tiles that supply faith give one more."* (the tile test). Alone at t92: ~4 holy-site and pasture-shrine hexes → 4🕯; in a Faith deck with Saints' Fields and a Cathedral town: 10–14🕯 |
| `firstFruitsOffering` | ◆ | procession | — | **CUT** — a one-off first citizen's tithe; pays nothing after turn 30 |
| `firstRites` | ● | procession | **E** | **CONVERT** — *"Your Orders that give faith give half again."* (the amplifier by voice, faith). The balance-turn markup cut its "per wildcard" as a snowball; an amplifier cannot snowball — it pays nothing with no faith cards and a third of the faith deck with them. Alone: 0; Faith deck at t92: ~25🕯 |
| `saltTithes` | ● | caravan | P | KEEP |
| `theFoundingOath` | ○ | charter | P | KEEP — the user's re-cut (+1 of each yield in the capital per city founded) |
| `theWidowsLevy` | ◆ | forge | S | KEEP |
| **`theFirstChair`** | ◆ | court | **E** | **NEW** — *"The Order in your first economic slot pays twice."* (the slot-position reader; the user's shape, at the pool where the deck is three cards) |

### Government I (29 → 25)

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `borderWardens` | ● | forge | **E** | **CONVERT** — *"+1 strength inside your territory, and +1 more for each Forge Order in a slot, at most +3."* (the line reader, `CombatScale` twin) |
| `censusRolls` | ● | green | — | **CUT** — cheer per citizen; dead above the clamp |
| `charterTowns` | ◆ | charter | S | KEEP |
| `conscription` | ◆ | forge | S | KEEP |
| `festivalDays` | ● | green | S | KEEP — the user's re-cut (+4😊 capital, +2🎵 every city) |
| `granaryLevies` | ◆ | green | S | KEEP (an occasion) |
| `harbourDues` | ● | caravan | P | KEEP |
| `hillForts` | ◆ | highlands | S | KEEP |
| `homesteadCharters` | ◆ | charter | S | KEEP |
| `ritesCharter` | ◆ | procession | S | KEEP — the Chapel, now the rite door (a real build) |
| `ritesOfPassage` | ◆ | procession | S | KEEP (an occasion) |
| `silkRoads` | ◆ | caravan | P | KEEP |
| `spoilsOfTheWild` | ◆ | hunt | S | KEEP |
| `statuteLabour` | ● | forge | P | KEEP |
| `theAlmanac` | ● | star | P | KEEP |
| `theBalladWeavers` | ◆ | hunt | P | KEEP (a tally) |
| `theBellFounders` | ◆ | court | P | KEEP (a tally) |
| `theLaureate` | ○ | court | P | KEEP |
| `theLegion` | ◆ | forge | S | KEEP |
| `theLongWatch` | ● | forge | — | **CUT** — cheer per garrison; dead above the clamp |
| `thePilgrimsPurse` | ◆ | procession | P | KEEP |
| `theRecklessLevy` | ◆ | forge | S | KEEP |
| `theTaxFarm` | ● | caravan | P | KEEP |
| `theUnbrokenLand` | ◆ | green | P | KEEP — the user's number (+1🌾 +1⚒) |
| `tinkersGuild` | ◆ | ploughshare | S | KEEP |
| `vigilCharter` | ◆ | forge | S | KEEP |
| `villageFairs` | ◆ | green | — | **CUT** — cheer per duplicate luxury |
| `waysideShrines` | ● | procession | S | KEEP |
| `weightsAndMeasures` | ● | caravan | S | KEEP |
| **`theScriveners`** | ◆ | star | **E** | **NEW** — *"Your science buildings give half again their yield, the per-citizen lines included."* (the building-yield percent by category; the user's shape, verbatim). Alone at t92: six Libraries at (2 + 5) × 50% ≈ **21🔬**; with Universities later, ≈35 |
| **`theHarvestHome`** | ● | green | **E** | **NEW** — *"Your Orders that give food give half again."* (amplifier, food). Alone: 0; Growth deck: ~15🌾 |
| **`theMusterRolls`** | ◆ | forge | **E** | **NEW** — *"The Order in your first military slot pays twice."* (position) |
| **`theReevesBell`** | ● | ploughshare | S | **NEW, periodic** — *"Every eight turns, every city gains food equal to its population."* Bursts: ~60🌾 an eighth turn on the t92 empire ≈ 7.5🌾 a turn averaged; a growth deck shortens it |

### Government II (45 → 40)

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `breadAlone` | ◆ | green | — | **CUT** — a flat with a tax on culture; the Harvest Songs are the food deck's card |
| `charteredCompanies` | ◆ | caravan | S | KEEP |
| `cisternWorks` | ○ | ploughshare | S | KEEP — the rule-changer |
| `coinCharter` | ◆ | caravan | S | KEEP |
| `drumsOfWar` | ◆ | forge | S | KEEP |
| `emergencyPowers` | ○ | court | S | KEEP |
| `fieldSurgeons` | ● | forge | S | KEEP |
| `lamplighters` | ◆ | procession | P | KEEP — +1🎵 per 5🕯 (the conversion) |
| `ledgerKeepers` | ● | caravan | P | KEEP — the user's re-cut (routes to Market cities +1🔬 +1🎵) |
| `marchDiscipline` | ◆ | forge | S | KEEP |
| `masterMasons` | ◆ | forge | S | KEEP (an occasion) |
| `oreTithes` | ● | forge | **E** | **CONVERT** — *"+1⚒ on every strategic hex, and +1⚒ in your capital for each Forge Order in a slot, at most +3."* (line reader) |
| `pilgrimRoads` | ◆ | procession | P | KEEP — the user's re-cut (+1🕯 per capital citizen) |
| `provincialGovernors` | ● | court | P | **CONVERT** — *"+1 authority capacity for every two cities you hold, at most +4."* (a board reading; the flavour count goes) |
| `publicani` | ◆ | caravan | P | KEEP |
| `riverWardens` | ● | ploughshare | P | KEEP |
| `royalSurveyors` | ● | charter | S | KEEP |
| `scholarsStipend` | ● | star | P | KEEP |
| `scorchedEarth` | ◆ | hunt | S | KEEP |
| `scrivenersCharter` | ◆ | star | S | KEEP |
| `siegeDoctrine` | ● | forge | S | KEEP |
| `starGazers` | ● | star | P | KEEP — the user's re-cut (+15%🔬 in mountain cities) |
| `sumptuaryLaws` | ● | caravan | — | **CUT** — cheer per luxury |
| `terracedHillsides` | ● | green | P | KEEP |
| `theArchives` | ● | court | E | KEEP — the tagless deck reader (+1🎵 per slotted Order) |
| `theBannerCall` | ◆ | forge | S | KEEP |
| `theCartographers` | ◆ | wayfarers | P | KEEP — per 40 (the user: no buff) |
| `theChoir` | ● | procession | P | KEEP — the user's re-cut (+3🎵 +1😊 per Temple town) |
| `theChroniclersOfTheFallen` | ◆ | forge | P | KEEP (a tally) |
| `theGuildCharter` | ● | caravan | **E** | **CONVERT** — *"+2💰 for each Caravan Order in a slot, and +1⚒ in your capital for each."* (line reader) |
| `theHarvestSongs` | ● | green | P | KEEP |
| `theLastHunt` | ○ | hunt | P | KEEP |
| `theLongRoads` | ○ | caravan | P | KEEP |
| `theMasonsLodge` | ◆ | forge | P | KEEP |
| `theOathBound` | ○ | forge | S | KEEP |
| `theOrchardTithe` | ● | green | P | KEEP |
| `theQuietFields` | ● | green | — | **CUT** — cheer per unimproved hex |
| `theReliquaryRolls` | ◆ | court | P | KEEP (a tally) |
| `theSenatus` | ◆ | charter | S | KEEP |
| `theShipwrightShores` | ● | caravan | S | KEEP |
| `theSynod` | ● | procession | **E** | **CONVERT** — *"+2🕯 +2🎵 for each Procession Order in a slot."* (line reader; the user's numbers) |
| `theTitheOfIron` | ◆ | forge | P | KEEP — the user's (+3⚒ per mine, −3🌾) |
| `theWarCouncil` | ● | forge | **E** | **CONVERT** — *"+1 strength for each Forge Order in a slot, at most +3."* |
| `toolmakersCharter` | ◆ | forge | S | KEEP |
| `waterwrightsCharter` | ◆ | ploughshare | S | KEEP |
| **`theAlmanacOfHours`** | ◆ | court | **E** | **NEW** — *"Your every-so-many-turns Orders fire three turns earlier."* (the period shortener; the user's shape, verbatim). Alone: nothing; with two periodic rows: their bursts a third more often |
| **`theAssayersRule`** | ● | caravan | **E** | **NEW** — *"Your tiles that supply gold give one more."* (tile test). Alone at t92: ~10 gold hexes → 10💰 |
| **`theCountingHouses`** | ◆ | caravan | **E** | **NEW** — *"Your gold buildings give half again their yield."* (building percent: Market, Bazaar, Bank) |
| **`theFoundryDays`** | ● | forge | S | **NEW, periodic** — *"Every ten turns, every mine and quarry pays its production again, at once, to its city."* ~20 hexes × 3⚒ = 60⚒ a tenth turn |
| **`theNetsBlessing`** | ○ | caravan | P | **NEW** — *"Double the yields of your fishing boats, applied last."* (the doubler by category; the user's list) |

### Government III (46 → 40) — the fork

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `almshouseCharter` | ◆ | procession | S | KEEP |
| `censusOfSouls` | ◆ | procession | P | KEEP |
| `clientKings` | ● | court | S | KEEP |
| `firstFruits` | ● | green | P | KEEP |
| `forcedMarches` | ● | forge | S | KEEP |
| `frontierForts` | ● | highlands | S | KEEP |
| `garrisonState` | ● | forge | — | **CUT** — the user: "remove, boring" |
| `justicesCharter` | ◆ | court | S | KEEP |
| `mandateOfHeaven` | ◆ | procession | P | KEEP |
| `mintCharter` | ◆ | caravan | S | KEEP |
| `provincialMints` | ● | caravan | P | KEEP — the user's re-cut (+10%💰 in cities with an improved luxury) |
| `quarrymensGuild` | ● | forge | P | KEEP |
| `skirmishersCreed` | ○ | forge | S | KEEP |
| `stargazersCharter` | ◆ | star | S | KEEP |
| `theAlmonersBook` | ◆ | star | — | **CUT** — a tally on gold spent buying; pays under a hundredth of a voice |
| `theAnnalsOfLaw` | ● | court | E | KEEP — the bench reader; better as chairs shrink |
| `theArsenalLaw` | ○ | forge | P | KEEP |
| `theAuspiciousSeal` | ● | court | — | **CUT** — a die of the Magister; the dice are gone |
| `theCasusBelli` | ○ | forge | S | KEEP |
| `theCensusEternal` | ● | star | P | KEEP |
| `theCharterOfTheMarches` | ○ | charter | — | **CUT** — reads only at a founding, after the founding age |
| `theCongregation` | ○ | procession | P | KEEP |
| `theDraftingHalls` | ● | star | P | KEEP |
| `theDryDocks` | ● | caravan | — | **CUT** — a per-building line on a building the game rarely has |
| `theEscortedRoads` | ● | caravan | P | KEEP — +30% (the user: "a payoff card from other bonuses to trade routes") |
| `theFarCharts` | ○ | wayfarers | P | KEEP |
| `theFinishersArt` | ● | forge | — | **CUT** — Decisive Blows (IV) is the same rule, bigger |
| `theGoldenScales` | ● | caravan | P | KEEP |
| `theGrainDole` | ● | green | — | **CUT** — cheer per big city |
| `theGranaryLaws` | ◆ | green | P | KEEP |
| `theGroundskeepers` | ● | court | P | KEEP — the user's (+2🌾 +2⚒ per great work) |
| `theLyceum` | ◆ | star | P | KEEP — a turn (the user: no buff) |
| `theMarshals` | ◆ | forge | S | KEEP |
| `theMasterBuilders` | ● | forge | S | KEEP |
| `theMastersPresence` | ● | court | P | KEEP |
| `theOldWays` | ◆ | green | P | KEEP |
| `thePrizeGrounds` | ● | charter | — | **CUT** — the user: "remove this one entirely" |
| `theProvisioners` | ● | caravan | — | **CUT** — cheer per route |
| `theSaintsFields` | ● | procession | P | KEEP — +3🕯 (the user) |
| `theSaltingHouses` | ● | caravan | — | **CUT** — a coastal food-to-production conversion nobody builds around; the Grain Fleet (IV) is the coastal card |
| `theStandingLevy` | ○ | forge | S | KEEP — a periodic row already; every 12 turns a free melee unit |
| `theWarChest` | ● | forge | S | KEEP — −2💰 (the user) |
| `theWayhouses` | ● | caravan | P | KEEP — the user's re-cut (+3🎵 +1💰 per route) |
| `theWinteringGrounds` | ● | forge | — | **CUT** — the War Chest is the upkeep card |
| `theWonderFeasts` | ● | forge | S | KEEP |
| `tolerationEdicts` | ● | court | S | KEEP — −15% demanded (the user) |
| **`theIronRule`** | ◆ | forge | **E** | **NEW** — *"Your Orders that give production give half again."* (amplifier, production; the user's shape, verbatim). Alone: 0; Forge deck at t92 (Tithe of Iron 21, Quarrymen 8, Statute 12, Ore Tithes 6 …): ~24⚒ |
| **`theWorkshopsRule`** | ◆ | forge | **E** | **NEW** — *"Your production buildings give half again their yield."* (building percent: Workshop, Forge, Barracks' percent line) |
| **`theLitany`** | ● | procession | **E** | **NEW** — *"+1🕯 in every city for each Procession Order in a slot."* (line reader; the worked deck's engine). Alone: 6🕯; Faith deck with five Procession cards: 30🕯 |
| **`theChartroom`** | ● | star | **E** | **NEW** — *"+2🔬 in your capital for each Star or Wayfarers Order in a slot, and +1 in every other city."* (line reader over two lines) |
| **`theWildChair`** | ◆ | court | **E** | **NEW** — *"The Order in your first wildcard slot pays twice."* (position) |
| **`theGoldenCenser`** | ○ | procession | P | **NEW** — *"Your faith pays again as science, three percent for each Procession Order in a slot."* (a conversion at a share per line card). Faith deck at t92 (150🕯, five cards): **22🔬**; alone (59🕯, one card): 2 |
| **`theDeepSeams`** | ○ | forge | P | **NEW** — *"Double the yields of your mines, applied last."* (doubler). ~20 mines × 3 = **60⚒** — the Æra III spike the fork wanted, and the reason it is rare |
| **`theExchangeCharter`** | ○ | caravan | P | **NEW** — *"Double the yields of your Markets, applied last."* (doubler; Markets and, through the chain, what stands on them is a §8 question) |
| **`theTriumph`** | ● | court | S | **NEW, periodic** — *"Every twelve turns, your capital gains culture equal to your empire's production."* 131🎵 a twelfth turn ≈ 11🎵 a turn; shortened, a ninth |

### Government IV (16 → 21)

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `assizeCourts` | ◆ | court | P | KEEP |
| `cathedralChapters` | ◆ | procession | P | **CONVERT** (the cheer half goes) — *"+2🎵 and +2🕯 in every city with a Cathedral."* |
| `courtAstronomers` | ◆ | star | P | KEEP — +10🔬 per wonder (the user) |
| `decisiveBlows` | ○ | forge | S | KEEP |
| `fieldHospitals` | ◆ | forge | S | KEEP |
| `harbourmasters` | ◆ | caravan | P | KEEP — +2💰 per boat (the user) |
| `knightlyOrders` | ○ | forge | S | KEEP |
| `patrons` | ◆ | court | P | KEEP — +10🎵 per wonder (the user) |
| `scholastics` | ◆ | star | P | KEEP |
| `theConsistory` | ◆ → ○ | procession | P | KEEP — the user's re-cut, *"double the yields of your Temples, applied last"* — a doubler is a payoff and goes rare |
| `theFactorHouses` | ○ | caravan | — | **CUT** — a Gov IV rare paying under a fiftieth of a voice |
| `theGrainFleet` | ○ | green | P | KEEP |
| `theGuildOfMasons` | ● | court | S | KEEP |
| `theKingsRoad` | ◆ | forge | S | KEEP |
| `theMarshalsPurse` | ○ | forge | S | KEEP |
| `theSiegeTrain` | ◆ | forge | S | KEEP |
| **`theScholarsRule`** | ◆ | star | **E** | **NEW** — *"Your Orders that give science give half again."* (amplifier, science) |
| **`theVestryRule`** | ◆ | procession | **E** | **NEW** — *"Your faith buildings give half again their yield."* (building percent: Shrine, Temple, Cathedral, Chapel) |
| **`theExchequer`** | ● | caravan | **E** | **NEW** — *"+3💰 for each Caravan Order in a slot."* (line reader) |
| **`theAssay`** | ○ | caravan | P | **NEW** — *"Your gold pays again as science, three percent for each Caravan Order in a slot."* Trade deck at t92 (200💰, five cards): 30🔬 |
| **`theBroadAcres`** | ○ | green | P | **NEW** — *"Double the yields of your farms, applied last."* — the largest doubler, so the latest; ~40 farms × 2 = 80🌾 |
| **`theJubilee`** | ◆ | procession | S | **NEW, periodic** — *"Every fifteen turns, every city gains faith and culture equal to its population."* |

### Government V (11 → 14)

| id | rarity | line | role | verdict |
|---|---|---|---|---|
| `admiralty` | ○ | caravan | S | KEEP |
| `forcedMarch` | ○ | forge | S | KEEP |
| `manufactories` | ◆ | forge | — | **CUT** — a per-building line on a great work few hold |
| `printingHouses` | ◆ | star | P | KEEP — the user's re-cut (+3🎵 per Library; +10%🔬) |
| `theGuildCompact` | ○ | forge | P | KEEP |
| `theInquisition` | ● → ○ | procession | P | KEEP — the user's re-cut (+8🕯 +8🎵 on Temples) is a payoff at rare size |
| `theMagistersCourt` | ○ | court | S | KEEP |
| `theSalon` | ● | court | S | KEEP — +1 card (the user) |
| `theSilkExchange` | ◆ | caravan | P | KEEP — the user's re-cut (+1🎵 per 2 population in the destination) |
| `titheBarns` | ○ | green | — | **CUT** — net negative to hold |
| `universalSuffrage` | ◆ | green | S | KEEP — the tier boost is live above the clamp |
| **`theCompactOfChairs`** | ○ | court | **E** | **NEW** — *"The Order in the first slot of every kind pays twice."* (position; the capstone) |
| **`theEncyclopaedists`** | ○ | star | P | **NEW** — *"Your science pays again as culture, three percent for each Star Order in a slot."* |
| **`theLaureatesRule`** | ◆ | court | **E** | **NEW** — *"Your Orders that give culture give half again."* (amplifier, culture) |
| **`theGreatClock`** | ○ | court | **E** | **NEW** — *"Your every-so-many-turns Orders fire three turns earlier and pay half again."* (shortener + a rider on the boon; the periodic capstone) |
| **`theCollegesRule`** | ○ | star | P | **NEW** — *"Double the yields of your Universities, applied last."* |

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
