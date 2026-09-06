# The balance turn — every Order weighed against the turn-92 empire (2026-09-05)

The ruling (`docs/flags.md` §A, "RULED, awaiting build → The balance turn"):
**orders get more powerful, everything else is nerfed a little**, and the Æra
III orders most of all. The earlier half of the same direction stands —
ordinary building flats down a quarter, cards carrying more of the empire's
power (`docs/loop-review.md` §E, `docs/cards-pass-2.md` §E).

This doc is the worksheet for that ruling: every live Order row weighed against
the user's own turn-92 reading, a diagnosis of what the weak rows have in
common, and a proposal as a table to mark up. **Nothing under `data/` moves
until it is marked.** The master list of rows is `docs/orders-and-doctrines.md`;
this doc never restates a row's full text, only what it pays.

---

## 0. The scale everything is weighed against

The reading is the user's, turn 92 of the first full playthrough, six cities
(`docs/flags.md` note 17):

| 🌾 | ⚒ | 💰 | 🔬 | 🎵 | 🕯 | 😊 | writ |
|---|---|---|---|---|---|---|---|
| 211 | 131 | 143 | 200 | 195 | 59 | 28 | 6 |

### The standing assumptions

Every weight below is computed from this one empire. Where a row asks a
question the snapshot does not answer, the answer is here, once, and every
uncertain figure in the audit traces to a line of this table.

| The empire holds | Assumed |
|---|---|
| cities · citizens | 6 · 60 (ten a town, twelve in the capital) |
| ordinary buildings a town | Monument, Granary, Shrine, Library, Temple, Market, Amphitheatre, Workshop, Aqueduct |
| Libraries · Markets · Temples · Monuments | 6 · 6 · 6 · 6 |
| Universities · Cathedrals · Barracks | 4 · 1 · 2 |
| coastal towns · towns with a mountain in reach · quarry towns | 2 · 2 · 2 |
| trade routes running (of which foreign) | 3 (1) |
| wonders held · great-person works standing | 3 · 3 |
| unique luxuries · luxuries held twice · improved luxury copies | 6 · 4 · 8 |
| worked hexes (improved · unimproved) | 66 (36 · 20) |
| worked hills · strategic hexes · Mines · Farms on fresh water | 8 · 4 · 7 · 8 |
| road hexes laid · hexes revealed | 45 · 700 |
| military units standing · state | 4 · at peace |
| barbarians killed · camps cleared, lifetime | 25 · 5 |
| banked faith | 300 |
| Orders held · slotted · on the bench | 19 · 11 · 8 |
| slotted by flavour, M/E/W | 3 / 4 / 4 |
| a city grows · a technology completes | every 3 turns · every 8 turns |
| a mid-Æra-III unit's strength | 24 |

**Two readings of the meters do most of the work below, so they are stated
first.** `meterEffects` (`src/sim/meters.ts`): a positive happiness total pays a
percentage on science and culture, clamped by `METERS.tierClamp`; a positive
authority total pays a percentage on production, on the same ladder.

| Meter | This empire | Rung | Headroom |
|---|---|---|---|
| happiness | 28 | +20% 🔬🎵 | **at the clamp** — a further point of cheer pays no yield at all |
| authority | 6 | +10% ⚒ | four points short of the +20% rung, worth 13⚒ |

A `happinessTierBoost` (Mandate of Heaven, Universal Suffrage, the Examination
Hall tech) is applied *after* the clamp and therefore still pays. Ordinary
happiness does not.

### The consequence scale

Share of the *relevant voice*, per the brief. Non-yield rows are priced in the
conventions below the table.

| Reading | Share | 🌾 | ⚒ | 💰 | 🔬 | 🎵 | 🕯 |
|---|---|---|---|---|---|---|---|
| negligible | <3% | <6 | <4 | <4 | <6 | <6 | <2 |
| modest | 3–8% | 6–17 | 4–10 | 4–11 | 6–16 | 6–16 | 2–5 |
| real | 8–15% | 17–32 | 10–20 | 11–21 | 16–30 | 16–29 | 5–9 |
| consequential | >15% | >32 | >20 | >21 | >30 | >29 | >9 |

| Non-yield | Priced as |
|---|---|
| happiness | zero at this snapshot (see the clamp); a point buys headroom for roughly one citizen |
| authority capacity | 3 points = one more founded city (`METERS.authority.foundedCity`); at this empire, 4 points also crosses the +20% production rung |
| combat strength | +1 ≈ 4% of a mid-age unit, times the units the row touches; no yield |
| tempo / utility (movement, sight, heal, charges, purchase discount) | no yield; called out in words |
| a charter | the unlocked building's yields **once built everywhere**, with the hammers owed named |

---

## 1. The audit

Retired rows are excluded. Struck halves (`deferred`) are not counted — a card
is weighed on what it pays.

### Chiefdom pool (11)

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| bloodedSpears | Blooded Spears | ● | +1 strength, +2 more vs the wild | ~4% of a unit, 12% vs the wild, on 4 pieces | negligible |
| campFollowers | Camp Followers | ◆ | a camp cleared pays 25🌾 and a unit | 5 camps lifetime ≈ 2🌾 + 3⚒ a turn | negligible (real before t40) |
| farRunners | Far Runners | ● | +1 sight all units; a ruin pays 10🎵 | ruins exhausted; sight only | negligible |
| theWidowsLevy | The Widow's Levy | ◆ | a unit lost pays 10⚒ 40💰 | zero at peace | negligible |
| commonGranary | Common Granary | ● | +1🌾 per town holding an improved luxury | 5🌾 · 2% 🌾 | negligible |
| saltTithes | Salt Tithes | ● | +2💰 per unique luxury | 12💰 · 8% 💰 | real (floor) |
| boundaryStones | Boundary Stones | ● | +30% borders in Monument towns | borders mature | negligible (real before t40) |
| firstRites | First Rites | ● | +1🕯 capital, +1🕯 per W Order slotted | 5🕯 · 8% 🕯 | real |
| fireKeepers | Fire-Keepers | ● | +1🕯 +1😊 capital | 1🕯 · 2% 🕯; cheer capped | negligible |
| firstFruitsOffering | First Fruits | ◆ | a growth pays 10🕯 | 3🕯 · 5% 🕯 | modest |
| theFoundingOath | The Founding Oath | ○ | +1 of every yield per capital building, thrice over | 3 of each · 1–5% each | **negligible** |

*The pool's only rare is its weakest card at t92.*

### Government I pool (29)

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| theLongWatch | The Long Watch | ● | +1😊 per garrison and per fortification | cheer capped | negligible |
| borderWardens | Border Wardens | ● | +1 strength at home, +1 more per M Order (max 3) | +4 ≈ 17% of a unit | negligible (yield) |
| conscription | Conscription | ◆ | +50% toward units, −2😊 | ~20⚒ while building units; else zero | real at war / negligible at peace |
| spoilsOfTheWild | Spoils of the Wild | ◆ | camps pay double | ~2 points a turn | negligible |
| weightsAndMeasures | Weights & Measures | ● | +1💰 every city | 6💰 · 4% 💰 | modest (floor) |
| silkRoads | Silk Roads | ◆ | +3💰 per route | 9💰 · 6% 💰 | modest |
| theTaxFarm | The Tax Farm | ● | +1💰 per 4 citizens | 15💰 · 10% 💰 | **real** |
| harbourDues | Harbour Dues | ● | 5% of coastal gold again as 🎵 | 2🎵 · 1% 🎵 | negligible |
| homesteadCharters | Homestead Charters | ◆ | new cities start larger | no new cities | negligible |
| granaryLevies | Granary Levies | ◆ | a growth pays 10⚒ | 3⚒ · 2% ⚒ | negligible |
| censusRolls | The King's Table | ● | +1😊 per 2 capital citizens | cheer capped | negligible |
| tinkersGuild | Tinkers' Guild | ◆ | new workers gain a charge | utility | negligible |
| festivalDays | Festival Days | ● | +4😊 | cheer capped | negligible |
| ritesOfPassage | Rites of Passage | ◆ | a unit completed pays 10🕯 | 2🕯 · 3% 🕯 | modest (floor) |
| theLaureate | The Laureate | ○ | +1 renown a turn; +2 on each great-work hex | 6 points spread + renown | modest |
| theLegion | The Legion | ◆ | melee tempo and strength, +15% melee hammers | no yield | negligible |
| statuteLabour | Statute Labour | ● | +1⚒ per 4 citizens, in each town | 12⚒ · 9% ⚒ | **real** |
| theAlmanac | The Almanac | ● | +2🔬 capital, +1🔬 per Library | 8🔬 · 4% 🔬 | modest |
| villageFairs | Village Fairs | ◆ | +1😊 per duplicated luxury | cheer capped | negligible |
| hillForts | Hill Forts | ◆ | +2 strength on hills; a hill town costs 1 less writ | 1 writ ≈ ⅓ city | negligible |
| thePilgrimsPurse | The Pilgrim's Purse | ◆ | +5🕯 per town beside a Holy Site | 5🕯 · 8% 🕯 | real (conditional) |
| charterTowns | Charter Towns | ◆ | new cities founded with a Granary | no new cities | negligible |
| waysideShrines | Wayside Shrines | ● | +1🕯 every city | 6🕯 · 10% 🕯 | **real** |
| theUnbrokenLand | The Unbroken Land | ◆ | +1🌾+1⚒ on unimproved wood | ~5 hexes · 2–4% | negligible |
| theBalladWeavers | The Ballad-Weavers | ◆ | +1🎵 per barbarian killed while slotted | ~15🎵 · 8% 🎵 | modest (grows) |
| theBellFounders | The Bell-Founders | ◆ | +1🎵 per wonder finished anywhere while slotted | ~8🎵 · 4% 🎵 | modest (grows) |
| ritesCharter | The Rites Charter | ◆ | unlocks the Chapel (+1🕯; a rite pays +5🎵) | 6🕯 · 10% 🕯, for 318⚒ | real (deferred by hammers) |
| vigilCharter | The Vigil Charter | ◆ | unlocks the Keep | no yield | negligible |
| theRecklessLevy | The Reckless Levy | ◆ | +50% toward units, double unit upkeep | zero at peace, negative on a standing army | negligible |

### Government II pool (45)

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| fieldSurgeons | Field Surgeons | ● | +10 healing | no yield | negligible |
| marchDiscipline | March Discipline | ◆ | military +1 movement | no yield | negligible |
| siegeDoctrine | Siege Doctrine | ● | +4 vs cities | no yield | negligible |
| scorchedEarth | Scorched Earth | ◆ | pillaging heals and pays | zero at peace | negligible |
| sumptuaryLaws | Sumptuary Laws | ● | +1😊 per unique luxury | cheer capped | negligible |
| publicani | Publicani | ◆ | +2💰 per point of positive writ | 12💰 · 8% 💰 | real (floor) |
| charteredCompanies | Chartered Companies | ◆ | a bought hex pays 5🔬; hexes 15% cheaper | occasional | negligible |
| oreTithes | Ore Tithes | ● | +1⚒ on strategic hexes, +1⚒ capital per M Order (max 3) | 7⚒ · 5% ⚒ | modest |
| terracedHillsides | Terraced Hillsides | ● | +1🌾 on hills | 8🌾 · 4% 🌾 | modest |
| masterMasons | Master Masons | ◆ | a building completed pays 10🎵 | 3🎵 · 2% 🎵 | negligible |
| royalSurveyors | Royal Surveyors | ● | +50% borders, hexes 25% cheaper | borders mature | negligible |
| provincialGovernors | Provincial Governors | ● | +1 writ per E Order (max 4) | 4 writ → crosses the +20% ⚒ rung → 13⚒ | **real** |
| emergencyPowers | Emergency Powers | ○ | while writ is negative: +25% capital ⚒, borders unfrozen | writ is +6 | **zero** |
| pilgrimRoads | Pilgrim Roads | ◆ | +1🕯 per 3 capital citizens; +1😊 per 50 banked faith | 4🕯 · 7% 🕯; cheer capped | modest |
| lamplighters | Lamplighters | ◆ | +1🎵 per 5🕯 a turn | 11🎵 · 6% 🎵 | modest |
| scholarsStipend | Scholars' Stipend | ● | +2🔬 in towns of 5+ with a Library, +2 more with a University | 20🔬 · 10% 🔬 | **real** |
| riverWardens | River Wardens | ● | +1🌾 on Farms beside fresh water | 8🌾 · 4% 🌾 | modest |
| theChoir | The Choir | ● | +1🎵 +1😊 per Temple town | 6🎵 · 3% 🎵; cheer capped | modest (floor) |
| starGazers | Star-Gazers | ● | +2🔬 per mountain town | 4🔬 · 2% 🔬 | negligible |
| cisternWorks | Cistern Works | ○ | every city counts as on fresh water | zero alone; whatever the deck reads off fresh water | rule-changer, unpriceable alone |
| ledgerKeepers | Ledger-Keepers | ● | +1💰 per Market town, +1 route | 6💰 + a route (~8 points) | modest |
| drumsOfWar | Drums of War | ◆ | born +2 strength | no yield | negligible |
| theCartographers | The Cartographers | ◆ | +1🔬 per 40 hexes revealed | 17🔬 · 9% 🔬 | **real** |
| theMasonsLodge | The Masons' Lodge | ◆ | +10% toward buildings in towns of 6+ | ~11⚒ while building | modest |
| theOathBound | The Oath-Bound | ○ | a kill heals 15 | zero at peace | negligible |
| theOrchardTithe | The Orchard Tithe | ● | +1🌾 on luxury hexes | 8🌾 · 4% 🌾 | modest |
| theQuietFields | The Quiet Fields | ● | +1😊 per unimproved hex worked | cheer capped | negligible |
| theLastHunt | The Last Hunt | ○ | +2🎵 +2🔬 per camp cleared | 10 each · 5% each | modest |
| theShipwrightShores | The Shipwright Shores | ● | +1⚒ coastal, +30% toward ships there | 2⚒ · 2% ⚒ | negligible |
| theArchives | The Archives | ● | +1🎵 per Order slotted | 11🎵 · 6% 🎵 | modest |
| theWarCouncil | The War Council | ● | +1 strength per M Order (max 3) | no yield | negligible |
| theGuildCharter | The Guild Charter | ● | +2💰 per E Order; +1⚒ capital per E Order | 8💰 + 4⚒ · 6% + 3% | modest |
| theSynod | The Synod | ● | +1🕯 +1🎵 per W Order | 4🕯 · 7% 🕯; 4🎵 · 2% 🎵 | modest |
| theHarvestSongs | The Harvest Songs | ● | 10% of food again as 🎵 | 21🎵 · 11% 🎵 | **real** |
| theReliquaryRolls | The Reliquary Rolls | ◆ | +2🕯 +2🎵 per great person spent while slotted | 6🕯 · 10% 🕯 | real (grows) |
| theChroniclersOfTheFallen | The Chroniclers of the Fallen | ◆ | +1💰 per unit lost while slotted | zero at peace | negligible |
| scrivenersCharter | The Scriveners' Charter | ◆ | unlocks the Scriptorium (+2🔬, +10%🔬 with an Academy) | 12🔬 · 6% 🔬, for 804⚒ | modest |
| coinCharter | The Coin Charter | ◆ | unlocks the Assay House (+2💰, buys 5% cheaper) | 12💰 · 8% 💰, for 1080⚒ | real (floor) |
| waterwrightsCharter | The Waterwrights' Charter | ◆ | unlocks the Cistern (+2🌾, fresh water, desert food) | 12🌾 · 6% 🌾, for 354⚒ | modest |
| theSenatus | The Senatus | ◆ | unlocks the Assembly Hall (+1🔬 +1🎵 per W Order, +2 writ) | 4🔬 + 4🎵 + 2 writ, for 92⚒ | modest |
| toolmakersCharter | The Toolmakers' Charter | ◆ | unlocks the Smithy (+2⚒, +1⚒ per M Order) | 12⚒ + 18⚒ = 30⚒ · 23% ⚒, for 414⚒ | **consequential** |
| theBannerCall | The Banner-Call | ◆ | at war: +15% units; a kill pays 5🎵 | zero at peace | negligible |
| theLongRoads | The Long Roads | ○ | +1💰 per road hex laid | 45💰 · 31% 💰 | **consequential** |
| theTitheOfIron | The Tithe of Iron | ◆ | +2⚒ per Mine, −1🌾 per Mine town | 14⚒ · 11% ⚒, −4🌾 | **real** |
| breadAlone | Bread Alone | ◆ | +3🌾 −1🎵 every city | 18🌾 · 9% 🌾, −6🎵 | **real** |

### Government III pool (46) — the fork

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| theMarshals | The Marshals | ◆ | +2 strength per adjacent friendly (max 4) | no yield | negligible |
| garrisonState | Garrison State | ● | +3⚒ per garrison (max 6) | 12⚒ if two towns garrisoned · 9% ⚒ | real (conditional) |
| skirmishersCreed | Skirmishers' Creed | ○ | ranged +1 range | no yield; a rule-changer | negligible (yield) |
| theFinishersArt | The Finisher's Art | ● | +4 vs the wounded | no yield | negligible |
| frontierForts | Frontier Forts | ● | +6 defence near rivals | no yield | negligible |
| theStandingLevy | The Standing Levy | ○ | a free melee unit every 12 turns | ~8⚒ a turn, less upkeep | modest |
| clientKings | Client Kings | ● | +2 writ; a captured town costs 1 less | 2 writ ≈ ⅔ city, no rung crossed | modest |
| provincialMints | Provincial Mints | ● | +2💰 per improved luxury copy | 16💰 · 11% 💰 | **real** |
| quarrymensGuild | Quarrymen's Guild | ● | +4⚒ per Quarry town | 8⚒ · 6% ⚒ | modest |
| theGrainDole | The Grain Dole | ● | +2😊 in towns of 6+ | cheer capped | negligible |
| mandateOfHeaven | Mandate of Heaven | ◆ | +5pp on the happiness rung; +1😊 per 200 banked faith | 10🔬 + 10🎵 · 5% each | modest each, real together |
| theLyceum | The Lyceum | ◆ | a technology pays a turn's culture | 24🎵 · 13% 🎵 | **real** |
| censusOfSouls | Census of Souls | ◆ | +1🕯 per capital citizen | 12🕯 · 20% 🕯 | **consequential** |
| tolerationEdicts | Toleration Edicts | ● | −10% happiness demanded | cheer capped | negligible |
| theOldWays | The Old Ways | ◆ | unimproved ground doubled | ~40 points across 🌾⚒💰 | **consequential** |
| firstFruits | First Fruits | ● | +1🌾 on resource hexes | 14🌾 · 7% 🌾 | modest |
| theWarChest | The War Chest | ● | military upkeep −3💰 | 12💰 · 8% 💰 on four pieces | real (floor) |
| forcedMarches | Forced Marches | ● | melee +2 movement at home | no yield | negligible |
| theEscortedRoads | The Escorted Roads | ● | routes pay +30% | ~7 points | modest |
| theSaintsFields | The Saints' Fields | ● | +3🕯 per great-work hex | 9🕯 · 15% 🕯 | **consequential** |
| theWayhouses | The Wayhouses | ● | +2💰 +1🎵 per route | 6💰 + 3🎵 | modest |
| theProvisioners | The Provisioners | ● | +1😊 per internal route | cheer capped | negligible |
| thePrizeGrounds | The Prize Grounds | ● | +2😊 per town on a luxury | cheer capped | negligible |
| theCensusEternal | The Census Eternal | ● | +1🔬 per 4 citizens | 15🔬 · 8% 🔬 | modest (ceiling) |
| theGroundskeepers | The Groundskeepers | ● | +1🌾+1⚒ per great-work hex | 3 + 3 · 1–2% | negligible |
| theMastersPresence | The Master's Presence | ● | +10% all yields beside a great work | ~5% of every voice · ~47 points | **real** |
| theWonderFeasts | The Wonder-Feasts | ● | +2🌾 while building a wonder, +10% wonder hammers | situational | negligible |
| theMasterBuilders | The Master Builders | ● | +15% toward the Opus and Cathedrals | endgame only | negligible (now) |
| theDryDocks | The Dry Docks | ● | +25% toward ships in Harbour towns | no navy | negligible |
| theWinteringGrounds | The Wintering Grounds | ● | units abroad cost no upkeep | at peace, ~0 pieces abroad | negligible |
| theAnnalsOfLaw | The Annals of Law | ● | +2🎵 per Order held but not slotted | 16🎵 · 8% 🎵 | **real** |
| theAuspiciousSeal | The Auspicious Seal | ● | a die of the Magister on first slotting | one shot | negligible per turn |
| theSaltingHouses | The Salting Houses | ● | 10% of coastal food again as ⚒ | 7⚒ · 5% ⚒ | modest |
| theDraftingHalls | The Drafting Halls | ● | 10% of Library-town ⚒ again as 🔬 | 13🔬 · 7% 🔬 | modest |
| theGoldenScales | The Golden Scales | ● | 10% of gold again as 🔬 | 14🔬 · 7% 🔬 | modest |
| theArsenalLaw | The Arsenal Law | ○ | at war: 15% of Barracks-town ⚒ again as 💰 | zero at peace | negligible |
| theCharterOfTheMarches | The Charter of the Marches | ○ | +2 of every yield in the newest town; a founding pays 30🎵 | 2 of each · 1–3%; no foundings | **negligible** |
| theAlmonersBook | The Almoners' Book | ◆ | +1🔬 per 400💰 spent buying, while slotted | ~7🔬 after 30 turns | modest (slow) |
| theCasusBelli | The Casus Belli | ○ | a declaration pays +2 strength and +10% ⚒ for ten turns | zero at peace | negligible |
| mintCharter | The Mint Charter | ◆ | unlocks the Coinworks (+2💰, 10% of its town's 💰 again as 🎵) | 12💰 + 14🎵, for 1080⚒ | **real** |
| almshouseCharter | The Almshouse Charter | ◆ | unlocks the Almshouse (+1🎵, faith buys civilians) | 6🎵 · 3% 🎵, for 636⚒ | modest |
| stargazersCharter | The Stargazers' Charter | ◆ | unlocks the Orrery (+1🔬, +10%🔬 near a mountain) | 6🔬 + ~6🔬, for 804⚒ | modest |
| justicesCharter | The Justices' Charter | ◆ | unlocks the Assize Court (+1 writ, crowding −15%) | 6 writ ≈ two cities, for 600⚒ | **real** |
| theFarCharts | The Far Charts | ○ | +1🔬 per 20 hexes revealed | 35🔬 · 18% 🔬 | **consequential** |
| theCongregation | The Congregation | ○ | +1🎵 +1🔬 per following city | ~12 each · 6% each | modest |
| theGranaryLaws | The Granary Laws | ◆ | 10% of food in towns of 8+ again as 🔬 | 18🔬 · 9% 🔬 | **real** |

### Government IV pool (16, tier 29)

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| theKingsRoad | The King's Road | ◆ | +1 movement at home | no yield | negligible |
| fieldHospitals | Field Hospitals | ◆ | mends whole at home | no yield | negligible |
| decisiveBlows | Decisive Blows | ○ | +5 vs the wounded | no yield | negligible |
| theMarshalsPurse | The Marshals' Purse | ○ | military −25% to buy | situational | negligible |
| knightlyOrders | Knightly Orders | ○ | mounted +5 at home, −25% mounted hammers | no yield | negligible |
| theSiegeTrain | The Siege Train | ◆ | siege +1 movement | no yield | negligible |
| patrons | Patrons | ◆ | +2🎵 per wonder | 6🎵 · 3% 🎵 | modest (floor) |
| theGuildOfMasons | The Guild of Masons | ● | +30% wonders, −15% units | ~9⚒ while building a wonder | modest |
| harbourmasters | Harbourmasters | ◆ | +1 route, +1💰 per Fishing Boat | 4💰 + a route | modest |
| theFactorHouses | The Factor Houses | ○ | +3🔬 per foreign route | 3🔬 · 2% 🔬 | **negligible** |
| assizeCourts | Assize Courts | ◆ | +1 writ per 3 cities; a captured town costs 1 | 2 writ ≈ ⅔ city | modest |
| theGrainFleet | The Grain Fleet | ○ | +2🌾 coastal, +25% coastal growth surplus | 4🌾 · 2% 🌾 | negligible |
| cathedralChapters | Cathedral Chapters | ◆ | +1😊 per Cathedral, +2🎵 in Cathedral towns | 2🎵; cheer capped | negligible |
| courtAstronomers | Court Astronomers | ◆ | +2🔬 per wonder | 6🔬 · 3% 🔬 | modest (floor) |
| theConsistory | The Consistory | ◆ | +1🕯 per Temple | 6🕯 · 10% 🕯 | real |
| scholastics | Scholastics | ◆ | +2🔬 per University; a technology pays 15🕯 | 8🔬 + 2🕯 | modest |

*Nine of sixteen rows pay no yield; the pool's best economic row is a rare
paying under a fiftieth of one voice. **Government IV audits below Government
II.***

### Government V pool (11, tier 45)

| id | Name | ◆ | Pays | Weight at t92 | Reading |
|---|---|---|---|---|---|
| forcedMarch | Forced March | ○ | military +1 movement abroad | no yield | negligible |
| admiralty | Admiralty | ○ | embarked +1 movement, coastal +5 defence | no yield | negligible |
| theSalon | The Salon | ● | +1 card in every great-person offer | draft quality, no yield | modest |
| theSilkExchange | The Silk Exchange | ◆ | +2💰 per route | 6💰 · 4% 💰 | modest (floor) |
| printingHouses | Printing Houses | ◆ | +1🎵 per Library; +2🔬 in Printing House towns | 6🎵 + 6🔬 · 3% each | modest (floor) |
| titheBarns | Tithe Barns | ○ | +50% stored food kept on a growth; −1🕯 every city | growth is slow; −6🕯 · −10% 🕯 | **net negative** |
| theGuildCompact | The Guild Compact | ○ | +2% ⚒ per production building here (max 6%) | 8⚒ · 6% ⚒ | modest |
| manufactories | Manufactories | ◆ | +2⚒ per Manufactory hex | 2⚒ · 2% ⚒ | negligible |
| theInquisition | The Inquisition | ● | +2😊 and +2🕯 per Temple town | 12🕯 · 20% 🕯; cheer capped | **consequential** |
| universalSuffrage | Universal Suffrage | ◆ | +1😊 per 4 citizens; +5pp on the happiness rung | 10🔬 + 10🎵 · 5% each | modest each |
| theMagistersCourt | The Magister's Court | ○ | +10% toward the Magnum Opus | endgame only | negligible (now), decisive at the close |

### The other card power — Doctrines (the shorter audit)

Doctrines are permanent and cost no chair, so they are weighed on the same
scale but bought once. Tier 4 and 10 rows are summarised; the fork's tier is
given row by row, because it is the tier under review.

| Tier | Row | Pays | Weight at t92 | Reading |
|---|---|---|---|---|
| 4 | hermitCrown · riverKings · woodwrights · greatLitany · wolfMothersPact · foundersRoad | percentages on a tiny empire, or occasions | The Hermit Crown is dead above four cities; River Kings pays ~+30% of one town's food; The Great Litany pays 19🎵 | one real (greatLitany), the rest negligible at t92 |
| 10 | thalassocracy · theSacredPath · burningWay · breadAndCircuses · theTithe · divineInspiration · theGentleYoke · theScatteredHearths · theHorseTribes | conversions and cheer | theTithe pays 59💰 (41% 💰) — **the strongest single row in the game**; divineInspiration pays +1.5% 🔬 and 🎵; the cheer rows are capped | one consequential, two modest, the rest negligible |
| 18 | ironPrice | a kill pays 20🎵; pillage doubled | zero at peace | negligible |
| 18 | manifestOfTheSteppe | settlers −40% and +2 movement; +1 happiness demanded | expansion over | negligible (real before t50) |
| 18 | gildedCourt | the Gilded Hall (+8💰 +2🎵, bought); +1🔬+1🎵 on gold ground | ~10💰 + ~14 points, for 350💰 a copy | real |
| 18 | grandBazaar | luxury cheer +50%, duplicates at 30%, +2💰 per unique | 12💰 + capped cheer | real (floor) |
| 18 | masterOfMaps | +1 sight and movement; a vein or ruin pays 25🔬; −2 strength | occasional; the reveal engine is exhausted by t92 | modest |
| 18 | hegemony | a captured town costs 1 writ; a capture pays +5% ⚒ for ten turns | zero at peace | negligible |
| 18 | paxImperia | +3😊 +3🎵 in towns of 8+ | 15🎵 · 8% 🎵; cheer capped | real (floor) |
| 18 | theWanderingCourt | −15% capital; +3 of five yields and +3😊 elsewhere | ~75 points less the capital's tithe | **consequential** |
| 18 | thePilgrimWays | +2🕯 per following city; +1🎵 per foreign follower; +1🎵 per 5🕯 | ~24🕯 + ~23🎵 | **consequential** |
| 18 | theNaturalPhilosophers | +1🔬 per capital building; a technology pays a fifth of a turn's 🎵 | 12🔬 + 5🎵 | modest |
| 18 | theDeepDelving | +1⚒ per Mine and Quarry; a vein pays 40💰; +2⚒ on rich ore | 9⚒ · 7% ⚒ | modest |
| 29 | theAcademyOfDeeds | +20% 🔬, −10% 🎵; faith buys scholars | 40🔬 · 20% 🔬 | **consequential** |
| 29 | theStandingArmy, theSeaCharter, theRenaissanceCourt, cuiusRegio, theYeomanry, absolutism | upkeep, routes, offers, faith→science, farms, writ | cuiusRegio ~9🔬; theYeomanry 14⚒; absolutism 6 writ ≈ two cities | one real, the rest modest |
| 45 | thePhilosophersStone · theGrandTourII · mareNostrum · paxMagistri · theEncyclopaedia | the Opus, renown, water, cheer, capital science | theEncyclopaedia ~12🔬 + 50% science buildings; paxMagistri's cheer is capped | modest |

**The reading**: the tier-10 doctrine `theTithe` outweighs every Order in the
game, and the tier-18 doctrines outweigh the tier-18 *orders* by roughly two to
one. The fork's permanent picks are already at the intended weight; the fork's
drafts are not.

### The other card power — government signatures

| Government | Tier | Slots | Signature weight at t92 | Reading |
|---|---|---|---|---|
| councilOfElders | 4 | 0/2/3 | +3😊 (capped) + 6 renown | negligible |
| warChief | 4 | 3/1/1 | occasions only | negligible at peace |
| priestKing | 4 | 1/2/2 | 12🕯 · 20% 🕯 | consequential (on faith) |
| republic | 10 | 1/3/3 | 12🎵 · 6% 🎵, −5% demand | modest |
| tyranny | 10 | 3/1/3 | 3 writ ≈ one city; upkeep −30% | modest |
| theocracy | 10 | 1/2/4 | 12🕯 · 20% 🕯, plus ~1🔬 and ~1🎵 off the capital's faith | real (on faith alone) |
| **merchantLeague** | 18 | 2/5/4 | 8💰 + routes +50% (~12) + a route (~8) ≈ 28 points | real |
| **imperium** | 18 | 5/3/3 | 18⚒ · 14% ⚒, plus tempo and a capture windfall | real |
| **divineMandate** | 18 | 3/3/5 | 5🕯 + 5🎵 + 10% faith (~5🕯) ≈ 10🕯 · 17% 🕯 | real (on faith alone) |
| theEstates | 29 | 3/5/5 | 6😊 (capped) + 10🎵 | modest |
| theSultanate | 29 | 6/3/4 | conquest percentages | zero without conquest |
| theCuria | 29 | 4/4/5 | faith buildings mirror 🔬 ≈ 18🔬 | real |
| theCommonwealth | 45 | 3/7/6 | great works +50% ≈ 8 points; gold buys great people | modest |
| theEmpire | 45 | 7/4/5 | 6 writ ≈ two cities | real |
| theMagisterium | 45 | 4/5/7 | +1 card in every offer; renown per wonder | draft quality |

---

## 2. The diagnosis

### The few that feel consequential, and what they share

By the audit, these are the live Orders that move more than a seventh of a
voice for this empire:

| Row | Pool | Shape |
|---|---|---|
| theLongRoads | Gov II | a count over a thing the empire has hundreds of |
| toolmakersCharter | Gov II | a per-town building whose own line is a deck-reader |
| theFarCharts | Gov III | a count over a thing the empire has hundreds of |
| theOldWays | Gov III | a percentage of the ground itself |
| censusOfSouls | Gov III | a count over citizens |
| theSaintsFields | Gov III | a per-hex line on ground the empire chooses |
| theLyceum | Gov III | a payout on a frequent occasion, sized by a voice |
| theMastersPresence | Gov III | a percentage of every voice |
| theHarvestSongs | Gov II | a percentage of a voice, converted |
| theInquisition | Gov V | a per-town flat against the *smallest* voice |
| provincialMints, theTaxFarm, statuteLabour, scholarsStipend | Gov I–III | counts over citizens, copies, buildings |

**One sentence**: the consequential rows are the ones whose number is
multiplied by something the empire has a lot of — roads, revealed hexes,
citizens, copies, buildings, or a whole voice. Nothing else is consequential,
and every one of these shapes already exists in the vocabulary.

### What the rest have in common — six failure modes

| Mode | Rows | Why it fails |
|---|---|---|
| **The flat per city** | weightsAndMeasures, waysideShrines, theChoir, breadAlone's culture half, patrons, printingHouses, courtAstronomers, theSilkExchange, cathedralChapters, and ~30 more | a flat was sized for a three-city empire; six cities turn +1 into a twentieth of a voice |
| **Cheer at the clamp** | theLongWatch, censusRolls, festivalDays, villageFairs, sumptuaryLaws, theQuietFields, theGrainDole, tolerationEdicts, theProvisioners, thePrizeGrounds, cathedralChapters, theInquisition's cheer half, universalSuffrage's cheer half, and every doctrine cheer clause | `tierClamp` caps the happiness bonus at the +10 rung; this empire reads 28, so **eighteen live rows pay literally nothing** |
| **War and wild at peace** | theWidowsLevy, spoilsOfTheWild, campFollowers, scorchedEarth, theOathBound, theBannerCall, theArsenalLaw, theCasusBelli, theChroniclersOfTheFallen, theRecklessLevy, ironPrice, hegemony, theSultanate, and all nine of Gov IV/V's M rows | ~35 rows read zero for an empire at peace whose wild has stopped mattering |
| **A condition that expired** | boundaryStones, royalSurveyors, homesteadCharters, charterTowns, farRunners' ruin half, theCharterOfTheMarches, emergencyPowers, manifestOfTheSteppe, hermitCrown | founding, borders, ruins and negative writ are early-game facts; the late pools still price them |
| **A per-building line on a building nobody built** | manufactories, theDryDocks, starGazers, theFactorHouses, harbourmasters, theGrainFleet, admiralty | the row waits on a build the empire had no reason to make |
| **The faith asymmetry** | firstRites, waysideShrines, censusOfSouls, theInquisition, theConsistory, theSaintsFields, theSynod, priestKing | the same shape pays a fifth of faith and a thirtieth of science, because faith is the smallest voice; the faith rows read strong for a reason that has nothing to do with their design |

### Rarity is not correlated with power

Of the twenty live rare rows, four pay above *modest* for this empire
(theLongRoads, theFarCharts, theOldWays is uncommon, cisternWorks is a
rule-changer). Against that: emergencyPowers pays zero, titheBarns is net
negative, theCharterOfTheMarches and theFoundingOath are negligible, and
theFactorHouses — a Government **IV** rare — pays less than a fiftieth of one
voice. `docs/cards-pass-2.md` §E.6 already ruled that ○ should mean
"rule-changer, not bigger number"; on the audit, ○ today means neither.

### Why Æra III does not read as a spike

Five findings, in order of weight:

1. **The shapes do not change at the fork.** Gov III's commons are the same
   flat-per-city and flat-per-building rows as Gov I's, drawn against an empire
   three times larger. The pool's *median* row is worth a twentieth of a voice —
   the same share a Gov I row was worth when Gov I was drafted.
2. **The draw is weighted toward the floor.** `rarityWeights` leans four to two
   to one toward commons inside each sub-bag, so the *expected* card of a Gov
   III hand is one of its thirty commons, and the pool's height lives entirely
   in its rares and uncommons (theFarCharts, theOldWays, theLyceum,
   censusOfSouls).
3. **The pool grew instead of growing up.** Gov III is the largest shelf in the
   game. Breadth was added at the fork; height was not.
4. **The one thing that does spike is not a draft.** Imperium's chair-reader
   pays more than any Gov III order — and it is a single choice made once, not
   the drafts the fork is supposed to be about.
5. **The tiers above it are worse.** Gov IV audits below Gov II on every
   measure; Gov V's best row is a common paying the smallest voice, and its
   rares include a row that is net negative to hold.

---

## 3. The proposal

### The target, for your markup

| Pool | Target for a *typical* paying row | Multiplier on today |
|---|---|---|
| Chiefdom | 4–8% of the voice at the age it is drafted | ×1.25 |
| Government I | 4–8% | ×1.25 |
| Government II | 6–12% | ×1.4 |
| **Government III** | **10–20%** (20–40🔬 · 20–40🎵 · 15–30💰 · 13–26⚒ · 20–40🌾 · 6–12🕯) | **×1.75** |
| Government IV | 15–25% | ×2 |
| Government V | 20–30% | ×2.25 |

### Five rules the pass follows

1. **Multiply the shape, not the number.** A row that already counts per city,
   per building, per citizen or per copy gets its per-unit figure raised; a flat
   is only raised where the row has no count to raise.
2. **Where a flat has a count available, it becomes a count.** All of
   `population`, `buildingsInCity`, `slottedOrders*`, `uniqueLuxuries`,
   `roadHexes`, `revealedTiles`, `followingCities` already exist. **No new
   effect kind is proposed anywhere in this doc.**
3. **A cheer row that is only cheer pays a yield as well.** With the clamp where
   it is, cheer alone is a dead clause for any happy empire. Every such row gets
   a second, small, yield clause so it stays a wide-empire card *and* pays a
   tall one. (Alternative, if you would rather not touch the rows: raise
   `METERS.tierClamp`. That is a rules decision, not a number — it is in §6.)
4. **War, wild and expansion rows are left alone.** They read zero because the
   empire is at peace and finished expanding, not because they are badly sized.
   Raising them would make a war deck the only deck.
5. **Charters are weighed after their hammers.** A charter's number is raised
   only where the building it unlocks is cheap enough that six copies are
   plausible.

### Chiefdom — proposed

| id | Current | Proposed | New weight | Reading |
|---|---|---|---|---|
| commonGranary | +1🌾 per town with an improved luxury | **+2🌾** | 10🌾 · 5% | modest |
| saltTithes | +2💰 per unique luxury | **+3💰** | 18💰 · 13% | real |
| firstRites | +1🕯 capital, +1🕯 per W Order | **+1🕯 in *every city* ** | 24🕯 · 41% | consequential — **too strong; see §6 on the faith voice** | [per W order is way too strong, early faith snowballs very quickly]
| firstFruitsOffering | a growth pays 10🕯 | **20🕯** | 6🕯 · 10% | real |
| theFoundingOath | +1 of each yield per capital building, max 3 | **+1 of each yield in the capital for every city you've founded (no cap)** | 18 of each · 6–30% | consequential — the pool's rare finally warps a game |
[per city is way too strong, wouldn't that be potentially ~+20 to all yields in the early game? I'm for buffing orders massively, but chiefdom may be too early for this]

Unchanged: bloodedSpears, campFollowers, farRunners, theWidowsLevy,
boundaryStones, fireKeepers (rules 4 and 5).

### Government I — proposed

| id | Current | Proposed | New weight | Reading |
|---|---|---|---|---|
| weightsAndMeasures | +1💰 every city | **+1💰 per 3 citizens** (`population`, per 3, empire) | 20💰 · 14% | real — the vanilla floor becomes a floor that scales |
| theTaxFarm | +1💰 per 4 citizens | **per 3** | 20💰 · 14% | real |
| statuteLabour | +1⚒ per 4 citizens in this town | **per 3** | 18⚒ · 14% | real |
| theAlmanac | +2🔬 capital, +1🔬 per Library | **+2🔬 capital, +2🔬 per Library** | 14🔬 · 7% | modest |
| waysideShrines | +1🕯 every city | **+1🕯 every city, +1🎵 every city** | 6🕯 + 6🎵 | real |
| silkRoads | +3💰 per route | **+5💰** | 15💰 · 10% | real |
| festivalDays | +4😊 | **+4😊 in your capital, +2🎵 every city** | 12🎵 · 6% | modest (the cheer floor now pays) | [this is way too much happiness, modified]
| censusRolls | +1😊 per 2 capital citizens | **+1😊 per 2, +1🎵 per 2 capital citizens** | 6🎵 · 3% | modest |
| theLaureate | +1 renown; +2 on each great-work hex | **+2 renown; +3 on each great-work hex** | 9 points + renown | modest |
| theUnbrokenLand | +1🌾+1⚒ on unimproved wood | **+1🌾+1⚒** | 15 points · 4–5% | modest | [+1 +1 was already strong enough]
| theBalladWeavers | +1🎵 per barbarian killed | **+2🎵** | 30🎵 · 15% | real (grows) |
| theBellFounders | +1🎵 per wonder finished anywhere | **+2🎵** | 16🎵 · 8% | real (grows) |
| thePilgrimsPurse | +5🕯 per town beside a Holy Site | unchanged | — | already real |
| ritesCharter | the Chapel: +1🕯, a rite pays 5🎵 | **the Chapel: +2🕯, a rite pays 10🎵** | 12🕯 · 20% | consequential |

Unchanged: the war rows, the founding rows, tinkersGuild, harbourDues
(a conversion whose base is coastal gold — it rises when the empire does).

### Government II — proposed

| id | Current | Proposed | New weight | Reading |
|---|---|---|---|---|
| publicani | +2💰 per positive writ | **+3💰** | 18💰 · 13% | real |
| oreTithes | +1⚒ strategic hexes, +1⚒ capital per M Order (max 3) | **+2⚒ strategic hexes, +2⚒ capital per M Order (max 3)** | 14⚒ · 11% | real |
| terracedHillsides | +1🌾 on hills | **+2🌾** | 16🌾 · 8% | real |
| provincialGovernors | +1 writ per E Order (max 4) | **max 6** | 6 writ ≈ two cities and the +20% ⚒ rung | consequential |
| pilgrimRoads | +1🕯 per 3 capital citizens | **per 1 capital citizen** | 6🕯 · 10% | real |
| lamplighters | +1🎵 per 5🕯 a turn | **per 3** | 19🎵 · 10% | real |
| scholarsStipend | +2🔬 with a Library, +2 with a University | **+3🔬 / +3🔬** | 30🔬 · 15% | consequential |
| riverWardens | +1🌾 on Farms beside fresh water | **+2🌾** | 16🌾 · 8% | real |
| theChoir | +1🎵 +1😊 per Temple town | **+3🎵 +1😊** | 12🎵 · 6% | modest |
| starGazers | +2🔬 per mountain town | **+15%** | 8🔬 · 4% | modest |
| ledgerKeepers | +1💰 per Market town, +1 route | **trade routes to cities with a market +1 science and +1 culture** | 12💰 + a route | real |
| theCartographers | +1🔬 per 40 revealed | **per 40** | 28🔬 · 14% | real | [no this is way too strong to buff]
| theOrchardTithe | +1🌾 on luxury hexes | **+2🌾** | 16🌾 · 8% | real |
| theLastHunt | +2🎵 +2🔬 per camp cleared | **+4🎵 +4🔬** | 20 each · 10% each | real |
| theShipwrightShores | +1⚒ coastal, +30% ships | **+3⚒ coastal, +30% ships** | 6⚒ · 5% | modest |
| theArchives | +1🎵 per Order slotted | **+2🎵** | 22🎵 · 11% | real |
| theGuildCharter | +2💰 per E Order; +1⚒ capital per E Order | **+3💰; +2⚒** | 12💰 + 8⚒ | real |
| theSynod | +1🕯 +1🎵 per W Order | **+2🕯 +2🎵** | 4🕯 + 8🎵 | modest |
| theHarvestSongs | 10% of food again as 🎵 | **15%** | 32🎵 · 16% | consequential |
| theReliquaryRolls | +2🕯 +2🎵 per great person spent | **+3🕯 +3🎵** | 9🕯 · 15% | real |
| theSenatus | the Assembly Hall: +1🔬 +1🎵 per W Order, +2 writ | **+2🔬 +2🎵 per W Order, +2 writ** | 8🔬 + 8🎵 + 3 writ | real |
| scrivenersCharter | the Scriptorium: +2🔬, +10%🔬 with an Academy | **+3🔬, +15%** | 18🔬 · 9% | real |
| coinCharter | the Assay House: +2💰 | **+3💰** | 18💰 · 13% | real |
| waterwrightsCharter | the Cistern: +2🌾 | **+3🌾** | 18🌾 · 9% | real |
| theTitheOfIron | +2⚒ per Mine, −1🌾 per Mine town | **+3⚒ per Mine, −3🌾** | 21⚒ · 16% | consequential |
| breadAlone | +3🌾 −1🎵 every city | **+5🌾 −1🎵** | 30🌾 · 14% | real |
| theLongRoads | +1💰 per road hex | unchanged | — | already consequential |
| toolmakersCharter | the Smithy: +2⚒, +1⚒ per M Order | unchanged | — | already consequential |
| sumptuaryLaws | +1😊 per unique luxury | **+1😊 and +1💰 per unique luxury** | 6💰 · 4% | modest (the cheer floor now pays) |
| theQuietFields | +1😊 per unimproved hex worked here | **+1😊 and +1🎵 per unimproved hex worked here** | ~20🎵 · 10% | real |
| masterMasons | a building completed pays 10🎵 | **25🎵** | 8🎵 · 4% | modest |

Unchanged: the war rows, royalSurveyors, charteredCompanies, cisternWorks
(a rule-changer priced by what it turns on), theMasonsLodge, drumsOfWar.

### Government III — proposed (the fork)

The target is **10–20% of a voice**. Every uncoloured Gov III row moves.

| id | Current | Proposed | New weight | Reading |
|---|---|---|---|---|
| garrisonState | +3⚒ per garrison (max 6) | **+4⚒ (max 12)** | 24⚒ · 18% | consequential (conditional) | [remove, boring]
| clientKings | +2 writ; captured −1 | **+4 writ; captured −1** | 4 writ → crosses the +20% ⚒ rung | consequential |
| provincialMints | +2💰 per improved luxury copy | **+10% gold in cities with an improved luxury** | 24💰 · 17% | consequential |
| quarrymensGuild | +4⚒ per Quarry town | **+4⚒ per Quarry town, and +1⚒ per Quarry hex** | 15⚒ · 11% | real |
| theGrainDole | +2😊 in towns of 6+ | **+2😊 and +3🌾 in towns of 6+** | 18🌾 · 9% | real |
| mandateOfHeaven | +5pp; +1😊 per 200 banked faith | **+8pp; +1😊 per 150 banked faith** | 16🔬 + 16🎵 · 8% each | real |
| theLyceum | a technology pays a turn's 🎵 | **a turn** | 37🎵 · 19% | consequential | [no need to buff this one]
| censusOfSouls | +1🕯 per capital citizen | unchanged | — | already consequential |
| tolerationEdicts | −10% happiness demanded | **−15% demanded** | 6🎵 + real headroom | modest | [happiness already very strong]
| theOldWays | unimproved ground doubled | unchanged | — | already consequential |
| firstFruits | +1🌾 on resource hexes | **+2🌾** | 28🌾 · 13% | real |
| theWarChest | military upkeep −3💰 | **−2💰** | 20💰 · 14% | real | [units already only cost 3 in this era]
| theEscortedRoads | routes +30% | **+30%** | 14 points | real | [this is a payoff card from other bonuses to trade routes]
| theSaintsFields | +3🕯 per great-work hex | **+3🕯** | 9🕯 + 6🎵 | consequential | [i'll probably have 6-7 great work hexes at this point in the game]
| theWayhouses | +2💰 +1🎵 per route | **+3🎵 +1gold** | 12💰 + 6🎵 | real |
| theProvisioners | +1😊 per internal route | **+1😊 and +3💰 per internal route** | 6💰 · 4% | modest |
| thePrizeGrounds | +2😊 per town on a luxury | **+2😊 and +3 of that luxury's own yield** | ~6 points | modest | [remove this one entirely]
| theCensusEternal | +1🔬 per 4 citizens | **per 2** | 30🔬 · 15% | consequential |
| theGroundskeepers | +1🌾+1⚒ per great-work hex | **+2🌾+2⚒** | 18 points | real |
| theMastersPresence | +10% all yields beside a great work | **+15%** | ~70 points · 7% of every voice | consequential |
| theWonderFeasts | +2🌾 while building a wonder, +10% wonder ⚒ | **+4🌾, +20%** | situational | modest |
| theMasterBuilders | +15% Opus and Cathedrals | **+25%** | endgame | endgame |
| theWinteringGrounds | units abroad cost no upkeep | **units abroad cost no upkeep, and each pays +2🎵** | war-scoped | unchanged in kind |
| theAnnalsOfLaw | +2🎵 per Order on the bench | **+3🎵** | 24🎵 · 12% | real |
| theSaltingHouses | 10% of coastal 🌾 again as ⚒ | **20%** | 14⚒ · 11% | real |
| theDraftingHalls | 10% of Library-town ⚒ again as 🔬 | **20%** | 26🔬 · 13% | real |
| theGoldenScales | 10% of 💰 again as 🔬 | **20%** | 28🔬 · 14% | real |
| theCharterOfTheMarches | +2 of every yield in the newest town; a founding pays 30🎵 | **+2 of every yield in *every town founded since this Order was taken*, a founding pays 60🎵** — *needs no new shape only if `CityScope`'s `newest` can be widened; if it cannot, raise to +5 of every yield in the newest town* | ~30 points either way | real |
| theAlmonersBook | +1🔬 per 400💰 spent | **per 200💰** | ~14🔬 | modest (grows) |
| mintCharter | the Coinworks: +2💰, 10% again as 🎵 | **+3💰, 15%** | 18💰 + 21🎵 | consequential |
| almshouseCharter | the Almshouse: +1🎵 | **+3🎵** | 18🎵 · 9% | real |
| stargazersCharter | the Orrery: +1🔬, +10%🔬 near a mountain | **+2🔬, +20%** | ~24🔬 · 12% | real |
| justicesCharter | the Assize Court: +1 writ, crowding −15% | **+2 writ, crowding −20%** | 12 writ ≈ four cities | consequential |
| theFarCharts | +1🔬 per 20 revealed | unchanged | — | already consequential |
| theCongregation | +1🎵 +1🔬 per following city | **+2🎵 +2🔬** | 24 each · 12% each | real |
| theGranaryLaws | 10% of food in towns of 8+ again as 🔬 | **20%** | 36🔬 · 18% | consequential |
| theStandingLevy | a free melee unit every 12 turns | **every 8 turns** | ~12⚒ | real |

Unchanged (rule 4): theMarshals, skirmishersCreed, theFinishersArt,
frontierForts, forcedMarches, theArsenalLaw, theCasusBelli, theDryDocks,
theAuspiciousSeal.

### Government IV and V — proposed

Gov IV must clear Gov III by a margin or the fourth rung is a downgrade.

| id | Current | Proposed | New weight | Reading |
|---|---|---|---|---|
| patrons | +2🎵 per wonder | **+10🎵** | 18🎵 · 9% | real |
| theGuildOfMasons | +30% wonders, −15% units | **+50%, −15%** | ~15⚒ while building | real |
| harbourmasters | +1 route, +1💰 per Fishing Boat | **+1 route, +2💰 per Fishing Boat** | 12💰 + a route | real |
| theFactorHouses | +3🔬 per foreign route | **+3🔬 and +3💰 per route, foreign routes twice over** | ~27 points | consequential |
| assizeCourts | +1 writ per 3 cities | **+1 writ per 2 cities** | 3 writ = one city | real |
| theGrainFleet | +2🌾 coastal, +25% coastal growth | **+6🌾 coastal, +50%** | 12🌾 · 6% | modest |
| cathedralChapters | +1😊 per Cathedral, +2🎵 in Cathedral towns | **+1😊 per Cathedral, +4🎵 +4🕯 in Cathedral towns** | 4🎵 + 4🕯 | modest (Cathedral-poor empire) |
| courtAstronomers | +2🔬 per wonder | **+10🔬** | 18🔬 · 9% | real |
| theConsistory | +1🕯 per Temple | Double the yields on your temples [applies last] | 12🕯 · 20% | consequential | [we should include more orders like this, double the yields on (farms, mines, fishing boats, markets, as some potential candidates)]
| scholastics | +2🔬 per University; a technology pays 15🕯 | **+5🔬; 40🕯** | 20🔬 + 5🕯 | real |
| theSalon (V) | +1 card in every great-person offer | **+1 card** | draft quality | real |
| theSilkExchange (V) | +2💰 per route | **+1 culture per 2 population in the destination city** | 18💰 · 13% | real |
| printingHouses (V) | +1🎵 per Library; +2🔬 in Printing House towns | **+3🎵 per Library; +10% science** | 18🎵 + 15🔬 | real |
| titheBarns (V) | +50% stored food kept; −1🕯 every city | **+100% kept; −1🕯 every city** | growth tempo; the cost stands | real for a growing empire |
| theGuildCompact (V) | +2% ⚒ per production building (max 6%) | **+3% (max 15%)** | 20⚒ · 15% | consequential |
| manufactories (V) | +2⚒ per Manufactory hex | **+6⚒** | 6⚒ · 5% | modest (works-poor empire) |
| theInquisition (V) | +2😊 +2🕯 per Temple town | **+8🕯 +8🎵 on temples** | 18🕯 + 18🎵 | consequential |
| universalSuffrage (V) | +1😊 per 4 citizens; +5pp | **+1😊 per 3; +10pp** | 20🔬 + 20🎵 · 10% each | consequential |
| theMagistersCourt (V) | +10% toward the Opus | **+20%** | endgame | endgame |

Unchanged (rule 4): every Gov IV/V military row.

---

## 4. The nerf side — what "everything else" means

The direction says *a bit*. It is worth stating up front what the ruled cut
actually buys, because the arithmetic is smaller than it sounds.

### (a) Ordinary building flats −25% (ruled)

Wonders excluded (they are §4d). Rounding rule proposed: **round to the nearest
whole number, ties away from the cut** — so a +2 line stays +2 rather than
halving, and the quarter is taken where the arithmetic is clean.

| Building | Today | −25%, rounded | Delta |
|---|---|---|---|
| monument | 2🎵 | 2🎵 | — (tie) |
| granary | 3🌾 | 2🌾 | −1🌾 |
| shrine | 1🔬 1🕯 | 1🔬 1🕯 | — |
| library | 2🔬 | 2🔬 | — (tie) |
| temple | 2🕯 | 2🕯 | — (tie) |
| market | 3💰 | 2💰 | −1💰 |
| workshop | 3⚒ | 2⚒ | −1⚒ |
| watermill | 2🌾 1⚒ | 2🌾 1⚒ | — |
| amphitheater | 3🎵 | 2🎵 | −1🎵 |
| monastery | 2🎵 | 2🎵 | — (tie) |
| cathedral | 3🎵 3🕯 | 2🎵 2🕯 | −1🎵 −1🕯 |
| mint | 3💰 | 2💰 | −1💰 |
| armoury | 1⚒ | 1⚒ | — |
| gildedHall | 8💰 2🎵 | 6💰 2🎵 | −2💰 |
| hallOfDeeds | 2🎵 | 2🎵 | — (tie) |
| steleOfLaws | 3🎵 | 2🎵 | −1🎵 |
| bazaar | 2💰 | 2💰 | — (tie) |
| harbour | 1🌾 | 1🌾 | — |
| baths | 2🌾 | 2🌾 | — (tie) |
| forum | 3🎵 | 2🎵 | −1🎵 |
| examinationHall | 1🔬 | 1🔬 | — |
| courthouse | 3💰 | 2💰 | −1💰 |
| shipyard | 1⚒ | 1⚒ | — |
| forge | 2⚒ | 2⚒ | — (tie) |
| caravanserai | 2💰 | 2💰 | — (tie) |
| printingHouse | 2🔬 2🎵 | 2🔬 2🎵 | — (tie) |
| observatory | 3🔬 | 2🔬 | −1🔬 |
| lighthouse | 2💰 | 2💰 | — (tie) |
| townCharter | 4🌾 2🎵 | 3🌾 2🎵 | −1🌾 |
| clocktower | 2🔬 | 2🔬 | — (tie) |
| bank | 4💰 | 3💰 | −1💰 |
| chartTheStars | 2🔬 | 2🔬 | — (tie) |
| theTurningHeavens | 3🔬 | 2🔬 | −1🔬 |
| theAlchemicalCodex | 2🔬 | 2🔬 | — (tie) |
| theMagnumOpus | 5🎵 | 4🎵 | −1🎵 |
| chapel | 1🕯 | 1🕯 | — |
| scriptorium | 2🔬 | 2🔬 | — (tie) |
| assayHouse | 2💰 | 2💰 | — (tie) |
| cistern | 2🌾 | 2🌾 | — (tie) |
| smithy | 2⚒ | 2⚒ | — (tie) |
| coinworks | 2💰 | 2💰 | — (tie) |
| almshouse | 1🎵 | 1🎵 | — |
| orrery | 1🔬 | 1🔬 | — |

**What that is worth to the turn-92 empire**, against the assumed spine:

| Voice | From ordinary building flats today | After the cut | Empire delta |
|---|---|---|---|
| 🌾 | 18 | 12 | −3% of 🌾 |
| ⚒ | 18 | 12 | −5% of ⚒ |
| 💰 | 18 | 12 | −4% of 💰 |
| 🔬 | 18 | 18 | 0% |
| 🎵 | 30 | 18 | −6% of 🎵 |
| 🕯 | 18 | 18 | 0% |

The ruled cut lands at roughly a twentieth of the empire. That is honestly *a
bit* — and it also means **the ratio between deck and base moves almost
entirely because the cards go up**, not because the buildings come down. Worth
knowing before the pass is judged.

### (b) The line the flats cut misses — `sciencePerPop`

The cut above does nothing to science, because science does not live in the
flats. Under the assumed spine, roughly half the empire's science comes from
per-citizen lines on buildings, and most of that is one line.

| Source | 🔬 at t92 | Considered view |
|---|---|---|
| the base `rules.cities.sciencePerPop` | 60 | cut to 0.5 |
| library `sciencePerPop: 1` | 60 | **cut to 0.5** — one ordinary building paying a citizen's whole beaker again is where "I'm just building more buildings" comes from |
| university `1` | 30 | leave |
| observatory `0` · alchemicalSociety `1` · monastery `0` | ~15 | leave |

Cutting the Library line is the single most effective nerf on the table — worth
about a twelfth of the empire's science, which is more than the whole of §4a
across all six voices — and it is **outside** the ruled "flats", so it is a
decision rather than an implementation detail. It is in §6.

### (c) Tile yields — leave them

| Candidate | View |
|---|---|
| terrain base yields | **leave.** Every percentage, conversion and doubling card in the deck rides the tiles. Cutting the base cuts the cards with it, which is the opposite of the direction. |
| improvement yields and their tech upgrades | **leave.** They are the reward for the worker loop, and the audit found no order that reads them except theOldWays, whose whole point is unimproved ground. |
| resource yields | **leave.** They are the luxuries system's floor, and five order rows count them. |

### (d) Wonders — leave them, they are already the weak build

A wonder pays a few points of one voice for the hammers of several ordinary
buildings (the rows are in `data/buildings.json`; none pays more than an
Amphitheatre plus a Monument). Against a Gov III order at the proposed target
that is a poor trade already; cutting it would make the wonder line a trap. The
one honest trim would be the *completion grants*, and those are beads — the
victory road, not a yield.

### (e) Beliefs — leave them

Beliefs are cards, and the direction is that cards carry more of the power.
Follower and enhancer rows are on the same flat-per-city shape the orders are,
against the smallest voice; they read strong for the faith-asymmetry reason in
§2, not because they are oversized. The fix there is the faith voice (§6), not
the belief rows.

### (f) Techs' effect rows — leave them

A fifth of the tree's nodes carry an effect row, all of them tempo or utility
(`stateWorkforce`, `theImperialPost`, `steel`, `movableType`). Two touch
happiness by a point each. Nothing here is carrying empire power.

### (g) Entry LIV's supply trim — rides with the pass, on your word

The flags board defers this to the balance turn: *happiness and authority relief
should live in cards, not buildings, so tall-vs-wide bites*. The audit supports
it and it is the one nerf that makes an order category better rather than
worse — the writ rows (provincialGovernors, clientKings, justicesCharter,
assizeCourts) are the quiet winners of §1, and buildings currently sell the same
thing.

| Building | Today | Proposed |
|---|---|---|
| monument | +1 authority capacity | **cut** — the universal one; writ becomes a card decision |
| steleOfLaws | +1 authority capacity | keep (a specialist row) |
| examinationHall · courthouse · assemblyHall · assizeCourt | +1 / +2 / +2 / +1 | keep — each is a deliberate build |
| funeralGames | +3😊 | **+2😊** |
| baths | +2😊 | **+2😊** |
| cathedral · reliquary | +3😊 / +4😊 | keep — late, expensive, specialist |

---

## 5. Interactions to watch

| Surface | What moves |
|---|---|
| `test/sim/statecraftPacing.slow.test.ts` | the draft cadence band and all three government-tier bands. **A feedback loop to expect**: theHarvestSongs, theLyceum, theArchives and theAnnalsOfLaw all pay culture, culture is the draft basket, so a stronger deck drafts faster, which strengthens the deck. The cadence band (measured 9.3, band 5–13) is the one to read first; the tier bands were last re-centred on the Library's gold removal and will move again. |
| `test/sim/tech.slow.test.ts` | the age-turn measurements — scholarsStipend, theGoldenScales, theDraftingHalls, theGranaryLaws and theCensusEternal together add most of a science voice at the proposed numbers. Æra entry will come earlier; the bands are two-sided, so they fail on *fast* as well as slow. |
| `test/sim/endgame.slow.test.ts` | bead pace and the Opus; theMasterBuilders and theMagistersCourt both rise. |
| `data/ai.json` `weights` · `score` | the bot prices yields per age (`weights.food` tapers 9.8→5.6, science flat at 5–6). A card-heavy game changes what a draft is *worth*, not what a yield is worth — the number to re-read is the draft plan's E[best-of-hand] in `src/ai/wants.ts`, which is exactly the quantity this pass moves. The bot is not a balance baseline (ruled 2026-09-05), but a pass that makes drafts better and buildings worse will make the bot's build-first `priorities` wrong in a *measurable* way, so the OFAT baseline wants re-running afterward. |
| the arena (`arena.html`) | no page edit — this pass adds no knob, only values. The five-game averages per seat will move; that is the instrument working. |
| `test/sim/statecraftDocSync.test.ts` | pins **name and rarity only**, not the numbers, so a pure value pass needs no doc edit. **Any rarity move does** — and a rarity move also changes the draw bag. |
| `test/sim/cardImpact.test.ts` · `growingOrders.test.ts` · `statecraft.test.ts` | every changed row's stamp changes; eleven statecraft fixtures were re-aimed in the last pass and will need it again. |
| the compendium | generated from the rows and the sim's own describers, so it follows for free. Rule 7 still binds: no number may reach `compendiumText.ts` prose. |
| saves | this pass changes what a log replays into, so **schema 70 → 71** regardless of whether any rarity moves. |
| `docs/orders-and-doctrines.md` | the Effect column is each row's own `text`; the sync test does not read it, but a row whose text no longer matches its effects is a card that lies. Regenerate the tables in the same pass. |

---

## 6. For your markup — the decisions only you can make

1. **The Æra III multiplier.** §3's first table proposes the fork at
   seven-fourths of today, with the target *a tenth to a fifth of a voice for a
   six-city empire*, on a ladder that keeps Gov IV and V ahead. Mark the
   multiplier, or mark the target and the row tables follow it.

2. **The faith voice.** Faith is the smallest voice and science the largest
   (§0), so an identical shape pays a fifth of faith and a thirtieth of science
   — which is why the faith rows already audit as the strongest commons in the
   game, and why firstRites at the proposed number lands at two fifths of its
   voice. Three ways out, and only you can pick: (a) leave it — faith is *meant*
   to be the small voice a faith deck grows; (b) raise the faith rows less than
   everything else, a per-pool exception; (c) raise what faith *buys* so the
   voice grows with the empire. Until this is marked, every 🕯 figure in §3
   should be read as provisional.

   faith needs to be a more useful resource, i agree. What are some ideas for what faith can buy?

3. **Does the nerf reach beyond the flats?** The ruled quarter off ordinary
   building flats is worth about a twentieth of the empire (§4a) and **nothing
   at all to science**. §4b proposes the one further cut that would bite —
   `library.sciencePerPop` down a quarter. Yes or no. §4c–f recommend leaving
   tile yields, wonders, beliefs and techs alone, each for a stated reason;
   strike any you disagree with.

   ruled on, above

4. **Rarity: correlated with power, or orthogonal?** Today it is neither — ○
   marks four strong rows and eight rows that pay nothing. `docs/cards-pass-2.md`
   §E.6 ruled ○ = rule-changer; the audit says that ruling was never carried out.
   Either (a) ○ means rule-changer and the draw's rarity weighting is the *only*
   thing rarity does, or (b) ○ also means bigger, and the proposal tables should
   push the rares further than the commons. A rarity move changes the draw bag,
   so this decision costs a schema bump either way.

   rarity should correlate with power/payoff

5. **Cuts.** The audit found rows that pay nothing to any empire, not merely to
   this one. Candidates, for your strike: **theFoundingOath** (a rare paying
   less than a twentieth of any voice), **theCharterOfTheMarches** (reads only
   at a founding), **titheBarns** (net negative to hold), **theFactorHouses** (a
   Gov IV rare paying less than a fiftieth of a voice), **manufactories** and
   **theDryDocks** (per-building lines on buildings the game rarely has),
   **theGroundskeepers** (a strictly worse theSaintsFields). Keep or cut each; a
   cut is `retired: true` per the standing pattern.

   made edits above, if there are things not included above, please list their abilities.

6. **The cheer clamp.** Eighteen live rows pay nothing to an empire this happy,
   because `METERS.tierClamp` caps the bonus at the second rung (§0). §3's rule
   3 gives each of those rows a second yield clause. The alternative is one line
   of data — raise the clamp — which makes every cheer row live again and makes
   happiness the strongest thing in the game. Rule 3, or the clamp, or neither.

what is rule 3?
## 7. Answers to the markup (2026-09-06)

**Rule 3** is §3's third rule: a row that is *only* cheer gets a second, small
yield clause, because the tier clamp makes cheer alone a dead clause for any
happy empire. You marked "happiness already very strong" on tolerationEdicts,
so the recommendation is **neither** rule 3 nor the clamp: the pure-cheer rows
are the "fewer things" pass's first cuts or become conditional payoffs (cheer
*and* something only a wide empire has). Listed for the strike in
`docs/fewer-things.md`.

**Not in the proposal tables**: the twenty-nine rows rule 4 left alone — war,
wild and expansion — because they read zero at peace and finished expanding,
not because they are mis-sized. Their abilities, for your eye:

| id | pool · rarity | ability |
|---|---|---|
| theLongWatch | I · ● | +1😊 per unit standing in a city, +1 more per fortification built |
| borderWardens | I · ● | +1 strength inside your territory, +1 more per slotted military Order (max +3) |
| conscription | I · ◆ | +50% production toward units · −2😊 |
| spoilsOfTheWild | I · ◆ | clearing a camp pays +100% |
| homesteadCharters | I · ◆ | new cities start with 1 more population |
| granaryLevies | I · ◆ | a city that grows gains +10⚒ |
| ritesOfPassage | I · ◆ | buying or completing a unit grants +10🕯 |
| theLegion | I · ◆ | melee +1 movement +1 strength; cities put 15% more production behind them |
| villageFairs | I · ◆ | +1😊 per luxury held in two or more copies |
| hillForts | I · ◆ | +2 strength defending on hills; a hill city costs 1 less authority |
| charterTowns | I · ◆ | new cities founded with a Granary |
| vigilCharter | I · ◆ | unlocks the Keep |
| theRecklessLevy | I · ◆ | +50% production toward units · army upkeep doubled |
| fieldSurgeons | II · ● | all units heal +10 more per turn |
| siegeDoctrine | II · ● | +4 strength attacking cities |
| theWarCouncil | II · ● | +1 strength per slotted military Order (max +3) |
| marchDiscipline | II · ◆ | military +1 movement |
| scorchedEarth | II · ◆ | pillaging heals a further 25 and pays a further +10💰 |
| theChroniclersOfTheFallen | II · ◆ | +1💰 per unit lost in battle while slotted |
| theBannerCall | II · ◆ | at war: +15% production toward units; a kill grants +5🎵 |
| emergencyPowers | II · ○ | authority negative: capital +25% production, borders do not freeze |
| theOathBound | II · ○ | a kill heals the striker by 15 |
| theKingsRoad | IV · ◆ | +1 movement inside your territory |
| fieldHospitals | IV · ◆ | units resting in your territory mend completely |
| theSiegeTrain | IV · ◆ | siege units +1 movement |
| decisiveBlows | IV · ○ | +5 strength attacking a unit below half |
| theMarshalsPurse | IV · ○ | military units cost 25% less to buy |
| knightlyOrders | IV · ○ | mounted +5 strength in your territory; cities put 25% less production behind them |
| admiralty | V · ○ | embarked +1 movement · +5 defence in coastal cities |

**What faith can buy** — candidates, none built, for your pick (the fewer-things
doc's option A makes rites the first of these):

| purchase | shape | why it changes play |
|---|---|---|
| a rite, in a city, no augur | faith → a timed city bonus, per-city seal | the Chapel becomes the door to a verb you actually use |
| a redraw of an Order offer | faith → the offer is dealt again (Balatro's reroll) | faith is the deck's tempo currency; a faith deck drafts better |
| breaking a seal early | faith → a slotted card may be swapped before its five turns | the skill expression you ruled on, now purchasable by the faithful |
| a border tile | faith → the next rung of a city's borders | the votive alternative to culture; a faith empire spreads |
| the religious line at a discount, any building with a belief | faith → hammers, at a rate a belief can raise | the tall faith town builds what the science town builds, paid differently |
| renown toward the next great person | faith → renown, at a rate | a faith deck calls its people sooner (the Academy draft is this today for scholars only) |
| a settler or worker (the Reliquary opens this today) | existing | keep |

The conversions are the same thing seen from the deck: an *engine* card
("faith buys culture at 2:1", "each rite also pays science") is a faith path
that changes how you play, and that is `docs/fewer-things.md` §4's job.

**Your edits that need a new shape** (rule 2 said none; two of yours do):

| row | your text | shape |
|---|---|---|
| theConsistory | double the yields on your temples, applied last | **a doubler by building category** — new; the same shape gives "double your farms / mines / fishing boats / markets", which you asked for, so it is one shape for five or six cards and worth building |
| theSilkExchange | +1🎵 per 2 population in the destination city | a route reading the *partner's* population — new; `routeYields` reads the partner's buildings today, not its size |

Everything else you wrote lands on an existing shape (percentages, per-building
counts, route yields, city-scoped conditions).

**The one number to look at twice**: `rules.cities.sciencePerPop` 1 → 0.5
*and* the Library 1 → 0.5 halves the citizen's own beaker as well as the
building's. That is the largest single move in the markup — it slows every
empire's tech pace by roughly a third, bots and pacing fixtures included — and
you have not yet reached Æra IV at turn 92. If the intent is "buildings carry
less", the Library cut alone does it; if the intent is a slower game, say so
and the pacing bands move with it.
