# Orders and Doctrines — the master list

Every Order, government and Doctrine in one place, tables only. The tables ARE the balance
worksheet: edit a cell here, edit the matching field in `data/statecraft.json`, and
`test/sim/statecraftDocSync.test.ts` fails the build if the two ever disagree — every live
row appears in its own deck's table and every table row names a live row, retired rows
excluded from both sides. Every Effect cell — and every government's Signature cell — is
the row's own ratified `text`; bands, chairs, tiers and rarities are the data's. The
reasoning behind each pass lives in `docs/history/orders-and-doctrines-as-built.md`; the
pre-rework shelves, every row of them retired, are `docs/history/orders-and-doctrines-retired.md`.

**The decks rework** (branch `decks`, batch D1a — `docs/plans/decks-rework.md`, ruled
`docs/flags.md` (iiiiii); the design of record is `docs/six-decks-first-cut.md`, whose
structure paragraphs are sync-tested where they state a number):

- **Six decks.** Every Order row carries `decks` — one deck for a single-type card, two for
  a cross-type card (one row, one effect, either membership grants access), none for a
  generic card that belongs to every seat — and a `band`. A leader's row carries its two
  decks; Ibn Battuta's says `rainbow`; a seat under nobody holds all six. A seat's pool is
  its decks' single-type rows, the cross-types naming either, and the commons
  (`deckPoolOf`).
- **Five bands, one gate.** A band is open to a seat once the seat's regular draft count has
  reached its band's rung of the ladder (`currentBandOf`). The research age plays no part (the
  user, 2026-10-17, `docs/flags.md` (eeeeeee): *"lets remove the research age altogether"*).
  This replaces the rule of 2026-09-16, under which each band also needed the research age one
  above it. The ladder is the table below.
- **Only the current band is dealt** (the user, 2026-10-13; `docs/decks/deck-design.md`). A
  hand is dealt only from the seat's current band, the highest band its draft count has reached
  (`currentBandOf`, `eligibleFor`). When a new band opens, the earlier bands are no longer
  dealt. Cards already held keep their chairs. If the seat already holds every card of its
  current band, the draft is not charged and waits for the next band; it is never dealt from
  an earlier band instead (`draftExhausted`). A row may name a **last band**
  (`OrderDef.lastBand`, Dominion batch D7): it is dealt in every band from its own to that
  one. Double Time is the one such row, dealt in bands 2 and 3 (the user, 2026-10-16).
- **Universal chairs.** A government supplies a chair count and no layout: 3 / 5 / 8 / 11 by
  its tier's rung (the user's ruling, `docs/decks/deck-design.md` "More chairs"), written on each row as `chairs`; the sixteen governments keep their
  signatures. A leader's extra chair and a card's are additive.
- **The draw is rarity-first.** A hand is three positions — one card from each of the
  seat's two decks, and a third by the regular-draft cadence *generic → cross → generic →
  single* (the single alternating between the two decks; a rainbow seat samples two distinct
  decks a hand, and a third deck on the single turn). In each position a rarity rung is
  drawn at the table's odds (`rarityOdds`, renormalised over the rungs present), then a card
  uniformly within it. Every position excludes the held and the hand; an empty category falls
  back to the eligible union; fewer eligible cards deal a smaller hand; a rider's extra cards
  come after the base hand from the union. Passing moves `skipPity` points out of common into
  uncommon and rare for the next hand; taking a card zeroes it. The faith reroll keeps the
  hand's positions. An exhausted pool charges nothing: the meter stays full and no draft is
  counted until there is a card to deal.
- **No reward hands.** D1a banked a rare-only hand at draft counts 4, 18 and 29. Batch C3
  removed them (the user, 2026-10-16): a new government brings only its Doctrine offer
  (see Doctrines below). Schema 131.
- **Charters.** A row with `charter` grants on the pick — a technology made researchable, a
  building made buildable, rites made learnable — and never sits in a chair. It grants no
  free technology and no free building.
- **Nothing deleted.** Every pre-rework Order and Doctrine row is `retired: true`: in the data
  and the Compendium, in no pool. The live Doctrines are the decks' own, written in batch C3
  (see Doctrines below). A row whose text needs a shape the vocabulary lacks is `deferred` in
  plain words, with no effects, and is in no pool either. Schema 119; a pre-rework save is
  refused.

**Rarity** — the mark in an Order's Rarity column **is** `OrderDef.rarity`: ● common ·
◆ uncommon · ○ rare, blank reads as common. The draw takes it as a *probability target,
never a per-card weight* — 60 · 30 · 10 (`rarityOdds`) — drawn first, then a card within the
rung. Passing a draft moves `skipPity` points out of common until a card is taken. Orders
are never upgraded: a card is what it prints, held once, and a draft is take one or pass.

**Role** — **E** an *engine*, a row whose subject is the deck or the board's *kind* (a
count of the chairs, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar). **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted (a
count, a conversion, a doubler taken last, a tally). **S** a *standalone*, everything
else (a flat, a rule, an occasion, a charter, a boon on the calendar). The mark is
**derived from the row's own effects** and pinned against that derivation, so a row that
changes shape changes its letter or fails the build.

**Band** — the number in an Order's Band column **is** `OrderDef.band`: 0 Early · 1 Middle ·
2 Late · 3 Final, the ladder's rungs.

A row with a struck half carries **†** in its line under Notes, where the words after the
dagger are what the row does *not* do.

## The ladder

| Rung | Band | Regular draft count | Chairs |
|---|---|---|---|
| Chiefdom | 0 | 0 | 3 |
| Government I | 1 | 4 | 5 |
| Government II | 2 | 10 | 5 |
| Government III | 3 | 18 | 8 |
| Government IV | 4 | 26 | 11 |

A government is offered at its row's own tier (4 · 10 · 18 · 26), and each tier is a rung, so
an Order tier opens at the same draft count as its government. Adopting one opens a Doctrine
offer of the paired tier (see Doctrines below). Until batch C3 a reward hand was banked at
every rung but the first; the reward hands are gone.

2026-10-15: the fifth rung moved from 45 to 38 drafts (`docs/flags.md` (uuuuuu)).
2026-10-17: the rungs are the government tiers (`docs/flags.md` (ccccccc)). From schema 119
the ladder held only the rungs where the chair count rises, so the tier-10 governments had
no rung and every Order tier from Tier II up opened one government tier late. The tier-10
rung keeps the five chairs of the rung below it, and the rung at 38 is gone with its retired
governments, so Tier IV opened at 29.
2026-10-17: Tier IV and its governments moved from 29 to 26 drafts (`docs/flags.md`
(ddddddd): *"lets move tier IV to tier 26"*).

## Governments

| Tier | Government | Military | Economic | Civic | Wildcard | Chairs | Signature |
|---|---|---|---|---|---|---|---|
| 0 | Chiefdom | 1 | 1 | 0 | 1 | 3 | Grants nothing of its own. |
| 4 | Council of Elders | 1 | 2 | 1 | 1 | 5 | +3 happiness. +1 renown per turn for each city you hold. |
|  | Priest-King | 1 | 1 | 2 | 1 | 5 | +2 faith in every city. |
|  | War Chief | 2 | 1 | 1 | 1 | 5 | +3 authority capacity. +4 combat strength. Killing a unit grants +5 science and +5 culture for each Order you have in a slot. |
| 10 | Republic | 0 | 3 | 1 | 1 | 5 | +1 culture for each 5 population in a city. −5% happiness demanded per citizen. |
|  | Theocracy | 1 | 0 | 3 | 1 | 5 | +2 faith in every city. Your capital's faith is gained again as science and as culture, at a fifth of the rate. |
|  | Tyranny | 3 | 1 | 0 | 1 | 5 | +5 authority capacity. +4 combat strength. Pillaging pays +50% and costs no movement. |
| 18 | Divine Mandate | 2 | 1 | 3 | 2 | 8 | +1 faith and +1 culture in your capital for each civic Order you have in a slot · +10% faith in every city of 6 or more population. |
|  | Imperium | 3 | 2 | 1 | 2 | 8 | +1 production in every city for each military Order you have in a slot · all units +1 movement · capturing a city pays +50 gold and heals every one of your units. |
|  | Merchant League | 1 | 3 | 2 | 2 | 8 | +2 gold for each economic Order you have in a slot · trade routes pay 50% more · +1 trade route. |
| 26 | The Curia | 2 | 2 | 4 | 3 | 11 | +6 faith for each Cathedral. Faith buildings supply science equal to their faith. |
|  | The Estates | 2 | 4 | 2 | 3 | 11 | +1 happiness in every city. +2 culture in every city of 8 or more population. |
|  | The Sultanate | 4 | 2 | 2 | 3 | 11 | All units +1 movement, and cities put 25% more production behind units — a fifth off their price. Captured cities +10% science and +10% culture. |

- **Chairs have types** (batch C2; the mixes are `docs/plans/doctrines-governments-chairs.md`
  section 4). The four type columns add up to Chairs, which is the rung's count.
- **Which chair a card fits:** a Military, Economic or Civic chair takes a card of its own
  type or an unsorted card; a Wildcard chair takes any card; a Wildcard card fits only a
  Wildcard chair. A card from a deck not sorted yet is unsorted.
- **Every chair beyond a government's mix** (a leader's, a card's) is a Wildcard chair.
- **Adopting a government re-seats the seated cards** and keeps as many as possible in the
  same chair: a card whose chair still exists and still fits it stays there. The rest move
  to the free chairs: Wildcard cards first, then typed cards in chairs of their own type,
  then typed cards in the Wildcard chairs left, then unsorted cards, typed chairs before
  Wildcard ones. A card that fits no chair left goes back to the collection.
- **The three tier-18 signatures count seated Orders by type.** An unsorted card counts as
  the type of the chair it sits in, a Wildcard chair included.
- **The tier-38 governments are retired** (The Commonwealth, The Empire and The
  Magisterium): their rows are kept for saves and nobody is offered them. Since 2026-10-17
  the ladder has no rung at 38 either: Tier IV opens at 26.

## Doctrines

- **What a Doctrine is.** A card held for the whole game. It takes no chair, is never given
  up, and its effects apply from the turn it is taken (`liveEffects`' second source,
  `PlayerStatecraft.doctrines`).
- **Where the rows live.** In the deck files, beside the Orders: each `data/decks/<deck>.json`
  has a `doctrines` map, folded into the one Doctrine table with the same id-collision check
  the Orders get. A row carries its `decks` (one or two), its sheet tier as `band` (Tier I to
  IV, written 1 to 4), its `text` and its `effects`. The pre-rework rows in
  `data/statecraft.json` stay retired.
- **Which government offers it.** Each Doctrine tier pairs with one government tier, in
  order: tier 4 offers the Tier I Doctrines, tier 10 Tier II, tier 18 Tier III and tier 26
  Tier IV. A row's `tier` field is that government tier, derived from `band` when the tables
  are folded (`governmentTierForDoctrineBand`), never written on a deck row.
- **The offer.** Adopting a government opens a Doctrine offer of its tier, drawn from the
  seat's two decks: one Doctrine from each deck, then a third from either (`drawDoctrineOffer`,
  `drawDoctrinePositions`; the interim rule until the user rules the mix). A rainbow seat
  samples two of its decks. A deck with no Doctrine left gives its place to the rest of the
  bag; a rider that widens Doctrine offers adds cards from the whole bag. A Doctrine the seat
  holds is never offered again. An empty bag opens no offer and spends no randomness.
- **The answer.** Take one (`chooseDoctrine`) or pass (`skipDoctrineOffer`). A pass costs
  nothing and banks nothing; a Doctrine passed on is not held, so it can be offered again.
  The offer blocks End Turn until it is answered, and a waiting offer must be answered before
  another government is adopted (`governmentChoiceError`), so an adoption never writes over
  it. The faith reroll may redeal it. The bots take the best-scoring Doctrine when it scores
  above nothing, and pass otherwise.
- **The spec of record** is each deck's sheet (`docs/decks/<deck>.md`), whose Doctrine tables
  list a deck's Doctrines across the four tiers. A Doctrine with a data row matches its sheet
  row in name, tier and text (`test/sim/decks/<deck>.test.ts`). The table below mirrors the
  live rows (`statecraftDocSync.test.ts`).
- **A retired Doctrine** keeps its row in the deck file, so a save that holds it reads the
  same, and is on no sheet, in no offer and not in the table below. Dominion has one: The
  Servian Reforms, which the user removed from the sheet (Dominion batch D9).

| Doctrine | Decks | Tier | Offered with | Effect |
|---|---|---|---|---|
| The Steppe Confederacy | Dominion | I | tier 4 | Negative authority no longer stops your borders growing. While authority is negative, gain +50% production toward mounted units. |
| The Consular Roads | Dominion | I | tier 4 | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. |
| The Marian Reforms | Dominion | I | tier 4 | Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected. |
| The Soldiers' Share | Dominion | I | tier 4 | Capturing a town fully heals every unit of yours within three hexes and raises each by one rank. You can no longer found new cities. |
| The Laws of Lord Shang | Dominion | II | tier 10 | While a town builds a military unit, its surplus food goes into the unit instead of into growth. |
| Centurions | Dominion | II | tier 10 | Each Elite unit gives +3 strength to your units beside it, and costs 2 more upkeep. |
| The Plunder Economy | Dominion | II | tier 10 | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. |
| The Strategoi | Dominion | II | tier 10 | +30% renown. Citadel yields and your great generals' strength aura are doubled. |
| Weight of Numbers | Dominion | II | tier 10 | Your units gain +3 strength for each attack your units have already made on the same target this turn, at most +12. Your units cannot fortify. |
| The Universal Monarchy | Dominion | III | tier 18 | Towns you capture cost no authority. Towns you found cost twice as much. |
| Total Mobilisation | Dominion | III | tier 18 | While at war, each town of six or more citizens raises the best melee unit you can build every five turns, for a citizen. It costs no upkeep. While at peace, your towns grow 25% faster. |
| Combined Arms | Dominion | III | tier 18 | Your units gain +3 strength, doubled beside one of your siege units. Siege units beside one of your melee units cannot be attacked in melee. |
| The Landsturm | Dominion | IV | tier 26 | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general. |
| The Fortress Empire | Dominion | IV | tier 26 | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. |
| The Scourge of God | Dominion | IV | tier 26 | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. |

## Decks

One table a deck, then the cross-types and the generic pool. **Filled in D1b**: every
pre-rework row is retired and the six decks' rows are D1b's, one agent a deck, entered
from the design doc's deck tables. A row whose text needs a shape the vocabulary lacks
is `deferred` — in the data, in the Compendium, in no pool and in no table below; its
sentence is under Notes, after the dagger. **A live Order lives in its deck's own file**
— `data/decks/<deck>.json`, with the cross-type and generic rows in
`data/decks/common.json` — and the retired shelf stays in `data/statecraft.json`; the
eight fold into one registry with an id-collision check, and a deck's table here mirrors
that deck's file. A row lands here in the same edit that lands it in its file, or the
sync test fails.

An id that collided with a retired row takes its **deck file's name as a prefix**
(`dominionBloodedSpears`, `commerceSaltTithes`, `commonBoundaryStones`) — one convention
across the seven files. Ids are internal; the names in these tables are the card's.

### Dominion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Blooded Spears | 0 | ● | S | Military units gain +2 strength, doubled against barbarians. |
| The Standing Army | 0 | ◆ | S | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |
| Blood Brothers | 0 | ○ | S | A barbarian unit you kill joins your side. |
| The King's Levy | 0 | ○ | S | Every fifteen turns your capital raises a melee unit for free. It costs no upkeep. |
| Commission: Clear the Frontier | 0 | ● | S | Commission. Clear two barbarian camps while this card is seated. Then choose a great general from a draft. The card leaves its chair. |
| The Horse Herds | 0 | ● | S | Worked pastures and camps give +1 food and +1 production. |
| Battle Honours | 0 | ● | S | Commission. Kill six units while this card is seated. Then gain 2 population in your capital, and the best melee unit you can build is trained in your capital, free of upkeep. The card leaves its chair. |
| Sword and Plough | 0 | ● | P | Each city with a garrison gains +1 culture and +2 production. |
| The Camp Chaplains | 0 | ● | S | Killing or losing a unit grants faith equal to its strength. |
| The Grain Tribute | 0 | ● | S | +1 food and +1 production in every city. |
| The Scaling Ladders | 0 | ● | S | Melee units gain +4 strength against towns. |
| The Bards' Praise | 0 | ● | S | Killing a unit grants culture equal to its strength. Clearing a barbarian camp grants 30 culture. |
| The Cattle Raid | 0 | ● | S | Clearing a barbarian camp gives every city +3 food for ten turns. Clearing another restarts the ten turns. |
| The Drill Grounds | 0 | ● | S | Units standing in your towns gain 1 experience every 4 turns. |
| The Armed Colony | 0 | ● | S | A town founded beside one of your military units starts with three extra hexes, and that unit becomes a Veteran. |
| The Campaign Annals | 0 | ○ | P | While seated, this card gains +1 science each time one of your units earns a rank. It starts at +3 science. |
| The Outriders | 0 | ● | S | Claiming a discovery or clearing a barbarian camp grants 8 production to every town. |
| The Garrison Captains | 0 | ● | P | +1 authority for each garrisoned unit. |
| The Captured Arms | 0 | ● | P | +1 science for every unit you have killed this game, no cap. |
| The Gathering Host | 0 | ◆ | P | While seated, this card gains +1 science and +1 culture each time you gain a military unit. It starts at +2 science and +2 culture. |
| The Training Cadre | 1 | ● | S | Units gained in a town with a Barracks start with 2 experience. |
| The Quartermasters | 1 | ● | S | Worked strategic resources gain +3 food and +3 production. |
| The Soldiers' Purse | 1 | ● | S | Military units cost 1 less upkeep for each rank they hold. |
| Honours of the Legion | 1 | ◆ | S | Each time one of your units earns a rank, gain science and culture equal to its strength. |
| The Pacified Marches | 1 | ◆ | P | Gains +1 authority capacity and +5 culture for every barbarian camp cleared this game, at most +8 authority and +40 culture. |
| The Art of War | 1 | ◆ | S | Gaining a unit grants science equal to three quarters of its strength. |
| War Foundries | 1 | ○ | P | Cities with a Barracks gain gold equal to 30% of their base production and +38% production toward military units. |
| Songs of the Fallen | 1 | ○ | S | Killing or losing a unit grants science and culture equal to twice its strength. |
| Horse Lords | 1 | ○ | S | Mounted units gain +3 strength and +1 movement. |
| The General Staff | 1 | ● | P | Cities with a Barracks give +3 production and +2 renown a turn, favouring great generals. |
| The Soldier-Farmers | 1 | ● | S | Garrisoned towns gain +1 production and +1 gold on each worked hex with a resource. |
| Martial Law | 1 | ● | P | Each garrisoned unit grants its city +2 happiness and +4 food. |
| Walled Towns | 1 | ● | P | Towns with a defensive building, such as a Palisade or walls, gain +15% food. |
| The Swift Riders | 1 | ◆ | S | Mounted units may move after attacking. |
| The Captive Craftsmen | 1 | ◆ | P | Gains +1 science and +1 production each time you pillage a hex. |
| The Satraps | 1 | ◆ | S | Garrisoned towns in unrest pacify twice as fast. |
| The Acropolis | 1 | ◆ | P | Citadels give +2 culture and +1 authority each. |
| The Sack | 1 | ◆ | S | Razing a town you captured grants production, gold and culture equal to fifteen times its population. |
| Siege Works | 2 | ● | S | +38% production toward siege units. Siege units gain +4 strength against cities. |
| Armoury Guilds | 2 | ● | S | When one of your units falls, your nearest town with an Armoury gains production equal to its strength. |
| Conquered Archives | 2 | ● | P | Captured cities gain +6 science and +6 culture. |
| Stockpiles | 2 | ● | P | Cities gain +8 food per defensive building. |
| Triumphs | 2 | ● | S | Capturing a city grants culture equal to fifteen times its population. |
| The Longships | 2 | ◆ | S | A ship of yours that ends its turn beside an enemy improvement on the shore pillages it. |
| Riders of the Steppe | 2 | ◆ | S | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |
| Spoils of War | 2 | ◆ | S | Pillaging grants 15 production to your city nearest the pillaged hex. The first pillage each turn also grants 30 culture. |
| Hegemony | 2 | ○ | S | Captured cities you hold cost one less authority. Capturing a city grants +30% production in every city for ten turns. |
| Master Bowyers | 2 | ○ | S | Ranged and siege units gain +1 range. |
| The Citadel Works | 2 | ● | S | Citadels gain +5 science. Each citadel inside your borders gives +1 renown a turn, favouring great generals. |
| Commission: Take the City | 2 | ◆ | S | Commission. Capture a city with at least eight citizens. Then, for the rest of the game, each city you capture grants 250 science and 250 culture per age. The card leaves its chair. |
| Living off the Land | 2 | ● | S | Military units outside your territory cost no upkeep. |
| The Serried Ranks | 2 | ○ | S | Melee units beside another melee unit gain +10 strength when defending. |
| The Conscription Rolls | 2 | ◆ | S | Every ten turns, each town of at least eight citizens raises the best melee unit you can build. |
| The Veterans' Roll | 2 | ◆ | P | +1% science and culture for every rank your units have earned this game, at most +30%. |
| The Tactica | 2 | ◆ | S | At the end of your turn, great generals give 1 experience to every unit beside them. Each time one of your units earns a rank, gain 15 science. |
| The Fabricae | 2 | ● | P | Towns whose garrison is a Veteran or Elite gain +25% production. |
| The Sagas | 2 | ◆ | P | +1% culture and gold for every three hexes you have pillaged this game, at most +30%. |
| The Hall of the Slain | 2 | ◆ | P | +1% production and culture for every two units you have lost this game, at most +30%. |
| The Provincial Census | 2 | ◆ | S | Pacifying a town grants science equal to twenty times its population. |
| Spear-won Land | 2 | ◆ | P | +3% production and science for every town you have captured this game, at most +30%. |
| The Longbowmen | 2 | ● | S | Ranged units gain +4 strength and +4 ranged strength. +5 culture each time they attack from range. |
| War Reparations | 2 | ◆ | S | Making peace after taking cities in that war grants gold equal to twenty times their total population, and half as much culture. |
| Standing Garrisons | 3 | ● | P | Per garrisoned unit, the city gains +12% production and +12% culture. |
| The Siege Train | 3 | ◆ | S | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |
| Reserve Officers | 3 | ◆ | S | While at war, cities with a Barracks produce military units 60% faster; while at peace, those cities gain +30% production toward buildings. |
| Total War | 3 | ○ | S | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. |
| The Arrière-ban | 3 | ◆ | S | Declaring war gives every city +50% production for ten turns. Declaring war again restarts the ten turns. |
| The Victory Mint | 3 | ◆ | S | Capturing a city grants gold equal to thirty times its population. |
| The Board of Ordnance | 3 | ● | S | While at war, each city with a Barracks gains +1 production and +1 science for every three citizens. |
| The Drill Masters | 3 | ● | S | Units you gain start as Veterans. |
| Up Through the Ranks | 3 | ◆ | S | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. |
| The Devshirme | 3 | ○ | S | Captured towns of at least six citizens may spend a citizen to raise the best melee unit you can build, as a Veteran. |
| The Regimental Schools | 3 | ● | P | At the end of your turn, each garrisoned unit gains 1 experience and gives its town +2 science. |
| The Tagmata | 3 | ◆ | S | Veteran and Elite units gain +5 strength. |
| Interior Lines | 3 | ◆ | S | A step along a road costs 40% less movement. A unit that has not moved this turn gains +4 strength when attacking. |
| The Plunder Trains | 3 | ● | S | Pillaging grants 30 production and 15 food to your capital. |
| The Yam | 3 | ◆ | S | Mounted units heal fully when they pillage. |
| The Chevauchée | 3 | ○ | S | Pillaging a hex damages enemy cities within three hexes with 50% of the pillaging unit's strength. |
| The Bakufu | 3 | ◆ | P | A great general standing in a town gives it +25% science and +25% culture, and pacifies it at once. |
| Pax Romana | 3 | ○ | S | Towns you capture are pacified at once, and each costs 1 less authority to hold. |
| The Mural Crown | 3 | ◆ | S | +10 renown each turn, favouring great generals. Each time you gain a great person, gain 100 science and 100 culture for each great general you have gained this game. |
| Valhalla | 3 | ○ | S | When one of your units dies, gain 25 culture for each Monument in your empire. |
| Commission: A Victor's Peace | 3 | ○ | S | Commission. Make peace with an empire, or destroy it, after taking at least two of its cities in that war. Then gain one extra Wildcard chair for the rest of the game. |
| Danegeld | 3 | ○ | S | Making peace with an empire you pillaged in that war grants 40 gold and 40 culture for each hex you pillaged. |
| Imperium | 4 | ○ | S | Each captured city you hold gives +10% production toward the Magnum Opus, at most +40%. |
| Commission: Hold the Capitals | 4 | ○ | S | Commission. Hold two original capitals other than your own at the same time. Then every city gains +25% production for twenty turns, and you gain a great general. The card leaves its chair. |
| Spolia | 4 | ○ | S | Capturing a city that was raising a Magnum Opus adds half the production it had put into that Opus to your own. If you have not begun one, the production is kept until you do. |
| The Legions' Labour | 4 | ○ | S | Disbanding a military unit in a town building a wonder or the Magnum Opus adds half its production cost toward it. Units raised for free add nothing, but units raised by a levy count. |
| The Praetorian Guard | 4 | ○ | S | The city raising your Magnum Opus gains +5 defence for each unit garrisoned there. Your military units within two hexes of it gain +6 strength. |
| The Grand Army | 4 | ○ | P | Your capital gains +1 science and +1 culture for every military unit you have, at most +30 of each. |
| The Annexed Provinces | 4 | ○ | P | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. |
| The Marshalate | 4 | ○ | P | Your great generals' aura gives +1 more strength for each great general you have gained this game, at most +5. |
| The Military Frontier | 4 | ○ | P | Each unit garrisoned in a city gives it +3 science and +3 culture, at most three units per city. |
| The Nation in Arms | 4 | ○ | S | Every ten turns, each city with an Armoury raises the best melee unit you can build. They cost no upkeep. |
| The Grand Coalition | 4 | ○ | S | While at war with an empire raising a Magnum Opus, your military units gain +6 strength against it, and cities with a Barracks produce military units 30% faster. |
| The Proconsuls | 4 | ◆ | S | Captured cities with a garrison cost no authority and gain +10 defence. |
| Commission: The Grand Campaign | 4 | ◆ | S | Commission. Capture three cities while this card is seated. Then gain a great general, and science and culture each equal to ten times those cities' total population. The card leaves its chair. |
| Commission: The Captured Marvel | 4 | ○ | S | Commission. Capture a city that holds a world wonder or was another empire's original capital. Then, for the rest of the game, captured cities that hold a world wonder, and captured original capitals, gain +30% science and +30% culture. The card leaves its chair. |
| The Varangian Guard | 4 | ○ | S | Elite units may attack twice a turn. |
| The Great Bombards | 4 | ○ | S | Your siege units break a town's walls in one blow. |
| The Horde | 4 | ○ | S | Pillaging a hex also pillages every enemy improvement beside it. |
| The Harrying | 4 | ○ | S | Pillaging a hex beside a rival town with no garrison throws that town into unrest. |
| Vae Victis | 4 | ○ | P | Your capture rewards are paid twice. |
| The Spear Makers | 0 | ● | S | +30% production toward first- and second-age military units. |
| The Defiant Kingdom | 0 | ◆ | S | While another empire holds more towns than you, you train military units 25% faster. |
| The Hunting Grounds | 0 | ◆ | S | Barbarian camps within ten hexes of your cities spawn 50% faster. Your units gain +4 strength in your own territory. |
| The Funeral Oration | 2 | ◆ | S | Units you lose count half toward war weariness. |
| The Castra | 2 | ◆ | S | Your own hexes with a fortified military unit gain +1 science and +1 production. Citadels gain +3 production and +3 science. |
| Double Time | 2 | ○ | S | Your Orders' effects that happen at the end of a turn or every few turns trigger twice. |
| War Feeds Itself | 2 | ○ | S | At the end of your turn, each of your units in enemy territory yields you its hex's yields. |
| The Glorious Dead | 4 | ○ | S | Your losses never count toward war weariness. |
| The Champion's Portion | 0 | ● | S | Killing a unit grants renown equal to its strength, favouring great generals. |
| The Castle Demesne | 1 | ◆ | S | Citadels give +3 food and +3 production. |
| The Spartan Discipline | 1 | ◆ | S | Towns build military units 30% faster, but buildings 15% more slowly. |
| Commission: The Ranks of Merit | 1 | ◆ | S | Commission. Have three of your units earn a rank while this card is seated. Then, for the rest of the game, each rank a unit earns grants science and production equal to its strength in your capital. The card leaves its chair. |
| Commission: The First Province | 1 | ◆ | S | Commission. Capture a town while this card is seated. Then, for the rest of the game, towns you captured gain +5 food and +5 gold. The card leaves its chair. |
| The Naadam | 2 | ● | P | Towns gain +2 culture and +1 happiness for each pasture and camp in their borders. |
| The Taker of Cities | 2 | ◆ | S | Your units beside one of your great generals gain +5 strength against towns. |
| The Roll of Triumphs | 2 | ◆ | P | +5% production and gold for each great general you have gained this game, at most +30%. |
| The March Revenues | 3 | ◆ | P | +3% production for each pasture, camp and strategic resource inside your borders, at most +30%. |
| The Tributary Kings | 3 | ◆ | P | Your capital gains +1 production and +1 gold for each citizen in your puppet towns. |
| Commission: Man the Walls | 0 | ● | S | Commission. Have military units standing in three of your towns at the same time. Then each town with a garrison gains 30 production. The card leaves its chair. |
| The Ovation | 1 | ◆ | S | Completing a commission gives every town +30% production for ten turns. Completing another restarts the ten turns. |
| The Res Gestae | 2 | ◆ | P | +4% production and culture for each commission you have completed this game, at most +28%. |
| Commission: The Border Fortress | 2 | ◆ | S | Commission. Plant a citadel while this card is seated. Then, for the rest of the game, your citadels gain +2 food and +2 production. The card leaves its chair. |
| Commission: The Chosen Men | 3 | ◆ | S | Commission. Have three of your units become Elite while this card is seated. Then, for the rest of the game, your Elite units ignore enemy zone of control. The card leaves its chair. |
| Commission: Harry the Border | 1 | ◆ | S | Commission. Pillage four hexes while this card is seated. Then, for the rest of the game, your mounted units gain +50% yields from pillaging. The card leaves its chair. |
| Rally to the Standard | 3 | ○ | S | A military unit you gain appears beside your nearest great general instead of in its town, if that general stands within ten hexes of the town. |
| The Limitanei | 3 | ○ | S | Each military unit in one of your towns lets that town work one more hex, at most two more. |
| The Relay Stations | 2 | ◆ | S | Military units that start their turn in one of your towns connected to your capital gain +2 movement. |
| Circumvallation | 4 | ◆ | S | While a rival town is under siege by your units, it adds no production toward a Magnum Opus. |
| The Upstarts | 1 | ◆ | S | Your units gain +3 strength against the units of an empire that knows more technologies than you. |

### Expansionist

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Smallholdings | 0 | ● | S | Worked farms and pastures gain +1 food and +1 gold. |
| Granary Levies | 0 | ● | S | When a city grows in population, gain 15 production |
| The Naturalists | 0 | ◆ | P | Each city gains +1 science for every two hills or mountains in its borders, at most +3. |
| The Patient Harvest | 0 | ○ | S | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. |
| The Fish Traps | 0 | ● | S | Once drafted, workers may tend a lake or coastal tile into fish traps for one charge: +1 food and +1 production. No chair required. |
| Sweet Water | 0 | ● | S | Towns beside a river or lake gain +1 happiness. Worked freshwater tiles gain +1 food. |
| The Seed Grain | 0 | ◆ | S | Towns you found start with one extra citizen. |
| The Ambarvalia | 0 | ● | P | Your capital gains +1 faith. Each town gains +1 faith for every two improved tiles in its borders. |
| The Rope Stretchers | 0 | ● | P | Each town gains +1 science for every three improved tiles in its borders. |
| The Road Home | 0 | ● | S | Each town you found is joined to your nearest town by road. |
| The Work Gangs | 0 | ● | S | Towns of at least three citizens may spend a citizen to raise a worker. This shares the town's levy wait. |
| The Woodland Bands | 0 | ● | S | Your units ignore the extra movement cost of forest and jungle, and gain +2 strength while they stand in forest or jungle. |
| The Founding Furrow | 0 | ● | S | Founding a town grants culture equal to five times the number of towns you hold. |
| The Horrea | 0 | ◆ | P | Each Granary you hold gives +1 authority. |
| Levy of the Land | 1 | ◆ | S | Cities may spend one citizen to gain production equal to the food it took to grow that citizen. A city may levy once every five turns. |
| Tinkers' Guild | 1 | ● | S | Workers you produce or purchase gain +1 charge. |
| The Old Songs | 1 | ● | S | Worked unimproved land gains +2 culture. |
| The Local Census | 1 | ● | S | A town working at least four improved or tended tiles costs one less authority, minimum one. |
| The Wild Orchards | 1 | ● | S | Once drafted, workers may tend a forest or jungle tile into a wild orchard for one charge: +1 food and +1 gold. No chair required. |
| The Burning Season | 1 | ◆ | S | Once drafted, workers may burn a grassland or plains tile for one charge: +1 food. Bare ground becomes burned country; an improvement on the tile stays. No chair required. |
| Dark Earth | 1 | ◆ | S | Worked farms gain +2 food once they have stood for 20 turns, and another +2 food once they have stood for 50 turns. |
| The Three Sisters | 1 | ● | S | Worked farms beside a plantation or a pasture gain +2 food and +2 production, once per farm. |
| The Commons | 1 | ◆ | P | Each town gains +1 happiness for every two wild tiles it works, at most +3. |
| The Hard Country | 1 | ● | S | Worked desert and tundra tiles gain +1 food and +1 production. |
| The Master Builders | 1 | ● | S | Towns working at least three mines, quarries or lumber mills give +1 renown a turn, favouring great engineers. |
| Outposts | 1 | ◆ | S | Workers may plant an outpost on a wild tile within three hexes of your border, for one charge. It claims its hex and the ring around it for your nearest town, and costs no authority. A town founded on an outpost keeps that land. |
| Six Gardens | 1 | ◆ | S | Needs tended land. Commission. Have six tended tiles. Then, for the rest of the game, tended tiles gain +1 culture. The card leaves its chair. |
| The Forest Keepers | 1 | ● | S | Lumber mills that have stood for twenty turns gain +2 culture. |
| The Public Fountains | 1 | ● | P | Towns beside a river or lake gain +1 happiness for every four citizens, at most +3. |
| The Wild Marches | 1 | ● | P | +1 culture for every four wild hexes you own. |
| The Quiet Provinces | 1 | ◆ | P | Each town gains +1 production for every three points of spare authority, at most +3. |
| The Road Towns | 1 | ● | P | Towns joined to your capital by road gain +2 production. |
| The Labour Feasts | 1 | ◆ | S | Needs a levy. After a town spends a citizen on a levy, it gains +1 culture for every wild tile it works, for ten turns. At most once every ten turns. |
| The Gleaners | 1 | ● | S | Needs a levy. After a town spends a citizen on a levy, it gains +3 food for ten turns. At most once every ten turns. |
| The Grain Census | 1 | ◆ | P | While seated, this card gains +1 production and +1 gold each time one of your towns grows past its largest size. It starts at +2 of each. |
| The Burhs | 1 | ● | S | Towns gain +3 defence for every defensive building in them, and +100% production toward defensive buildings. |
| Commission: Break the Sod | 1 | ● | S | Commission. Work twelve improved tiles at the same time. Then, for the rest of the game, your improvements count as having stood ten turns longer. The card leaves its chair. |
| The Land Hunger | 1 | ◆ | S | While another empire holds more towns than you, your towns build settlers 25% faster, and your settlers gain +1 movement. |
| The Marl Pits | 1 | ◆ | S | When your workers finish a mine or quarry, each farm or pasture beside it gains +1 food for the rest of the game, at most +2 on one tile. |
| The Aediles | 1 | ◆ | P | While seated, this card gains +1 production and +1 culture each time you finish a public work. It starts at +2 of each. |
| The Watercourses | 2 | ◆ | S | Farms directly beside a river irrigate adjacent farms. Irrigated worked farms gain +2 production. Water does not relay beyond that first step. |
| The Highlands | 2 | ● | S | Mines and quarries on hills gain +2 science and +1 production. |
| The Coast | 2 | ● | S | Worked fishing boats gain +3 food and +3 culture. |
| Provincial Councils | 2 | ◆ | S | Connected towns other than the capital cost one less authority, minimum one, and gain +1 happiness. |
| The Grain Dole | 2 | ● | S | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. |
| The Waterworks | 2 | ◆ | P | Aqueducts cost 33% less production. Towns with an Aqueduct gain +1 happiness for every four citizens, at most +3. |
| The Breadbasket | 2 | ◆ | S | A town told to stop growing adds its food surplus to its production. |
| Migration | 2 | ○ | S | Every ten turns, each of your towns that is at its happiness limit sends one citizen to your smallest connected town that has room to grow. |
| Veteran Colonies | 2 | ◆ | S | A military unit standing in one of your towns may retire there: the unit is removed and the town gains one citizen. |
| The Engineers' Yards | 2 | ● | S | Manufactories gain +3 production. Worked farms, mines, quarries and lumber mills beside a manufactory gain +2 production. |
| The Tended Country | 2 | ◆ | S | Needs tended land. Tended tiles gain +2 production. |
| The Old Fields | 2 | ◆ | P | +1% food and production for every three works that have stood thirty turns, at most +30%. |
| The Hedgerows | 2 | ● | S | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. |
| The Great Households | 2 | ◆ | P | Each town gains +2% production for every citizen it has, at most +30%. |
| The Harbour Cities | 2 | ● | P | Coastal towns gain +1 culture for every two citizens. |
| The Milestones | 2 | ◆ | P | +1% gold and culture for every three road hexes you have paved, at most +30%. |
| The Teeming Realm | 2 | ◆ | P | +1% science and culture for every ten citizens in your empire, at most +30%. |
| The Labour Rolls | 2 | ◆ | P | Needs a levy. +1% production and food for every two citizens you have levied this game, at most +30%. |
| The Terraces of Moray | 2 | ◆ | S | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. |
| The Colonists | 2 | ◆ | S | Towns of at least six citizens may spend a citizen to raise a settler. |
| The Book of Settlements | 2 | ◆ | P | +3% production and gold for every town you have founded this game, at most +30%. |
| The Staked Claims | 2 | ◆ | S | Each town you found claims every unowned hex within two hexes of it. |
| The Many Hands | 2 | ◆ | S | Your towns build empire buildings 3% faster for each town you hold, at most +36%. |
| The Burghers | 2 | ◆ | S | Towns of at least twelve citizens fill their guild bar half again as fast. |
| Watch and Ward | 2 | ● | S | Needs a levy. Units a levy raised gain +5 strength in your own territory. |
| Seasonal Levies | 3 | ◆ | S | Needs a levy. After a city spends a citizen on a levy, it gains +60% food for ten turns. A city can gain this at most once every twenty turns. |
| The Long Tending | 3 | ○ | S | Needs tended land. Tended tiles gain +2 food for every 25 turns since they were tended, at most +6. |
| The Mountain Schools | 3 | ◆ | P | Towns with at least two mountains in their borders gain +15% science. Worked mines and quarries beside a mountain gain +2 science. |
| The Polders | 3 | ○ | S | Workers may raise a polder on a coast tile that touches at least three of your land tiles, for two charges. A polder yields as a farm on grassland. |
| A Court of Engineers | 3 | ○ | S | Gain +50% renown, but great-person offers contain only great engineers. |
| The Wide Country | 3 | ◆ | S | Commission. Claim twelve hexes by outposts, cleared camps or buying while this card is seated. Then, for the rest of the game, your borders grow 25% faster. The card leaves its chair. |
| Old Workings | 3 | ● | S | Worked mines, quarries and lumber mills that have stood for twenty turns gain +3 production. |
| The Royal Forests | 3 | ◆ | P | Towns working at least three lumber mills gain +25% culture. |
| The Megalopolis | 3 | ○ | P | Towns of ten or more citizens gain +1 science and +1 production for each citizen. |
| Plenty | 3 | ● | S | When a town grows, it gains production equal to five times its new population. |
| The Mill Wheels | 3 | ● | P | Towns with a Watermill gain +15% production. |
| The Quitrents | 3 | ● | P | +1 gold for every two hexes you own. |
| The Hallowed Woods | 3 | ◆ | P | Towns working at least five wild tiles gain +25% culture. |
| The Stationes | 3 | ◆ | S | Land units gain +3 strength while they stand in a town connected to your capital by road. |
| The Mit'a | 3 | ○ | S | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. |
| The Slack Season | 3 | ◆ | S | Needs a levy. Every twentieth turn, after the harvest, your towns may levy whatever their wait. |
| The Trained Bands | 3 | ◆ | S | Needs a levy. Units raised by a levy start as Veterans. |
| The Freedom of the City | 3 | ◆ | S | The first time each of your towns reaches fifteen citizens, and again at twenty, it gains production equal to forty times its population. |
| The Topping Out | 3 | ◆ | S | Finishing an empire building grants each of your towns production equal to five times its population. |
| The Tax Rolls | 3 | ◆ | S | When the world takes a census, gain gold equal to five times your citizens. |
| The Opening of the Roads | 3 | ◆ | S | When one of your towns is first joined to your capital by road, it gains production equal to twenty times its population. |
| The Great Colonies | 3 | ○ | S | Towns you found start with a third of the citizens of your largest town. |
| The Raising of the Land | 3 | ○ | S | When a great engineer rushes the works in one of your towns, every improved or tended tile in its borders gains +1 food and +1 production for the rest of the game. |
| The Age of Improvement | 3 | ○ | E | The bonuses your Orders give to improved tiles are doubled. |
| The Water Courts | 3 | ○ | S | A farm joined to fresh water by a chain of your farms counts as having fresh water. |
| The Coming of the Water | 3 | ◆ | S | When a town finishes an Aqueduct, every farm in its borders gains +1 food for the rest of the game. |
| The Mountain Terraces | 3 | ○ | S | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. |
| The Sovereign Writ | 3 | ○ | S | Spare authority's bonus to production and border growth has no ceiling: +10% for every five points. |
| The Imperial Roads | 3 | ○ | S | Towns joined to your capital by road cost no authority. |
| The Capitolia | 3 | ◆ | P | Each empire building you hold gives each of your towns +1 culture. |
| The Cura Aquarum | 3 | ○ | S | Towns joined to your capital by road count as having an Aqueduct. |
| The Garden of the World | 4 | ○ | S | Needs tended land. Tended tiles gain +2 food, +1 production and +1 culture. Towns working at least six tended tiles gain +3 happiness. |
| The Heartland | 4 | ○ | S | Goal: one of your towns works twelve improved or tended tiles that each yield 5 or more in total. Reward: for the rest of the game that town costs no authority and gains +3 happiness and +20% food. The card then leaves its chair. |
| The Corvée | 4 | ○ | S | While one of your cities builds the Magnum Opus, each of your other towns of at least ten citizens may spend one citizen for it, once every five turns. The Opus city gains production equal to the food that citizen took to grow. This shares the town's levy limit. |
| The Master of Works | 4 | ○ | S | When a great engineer rushes the works in the city building the Magnum Opus, each of your towns with a manufactory also sends that city one turn of its own production. |
| The Philosophers' Peaks | 4 | ◆ | P | Each town gains +2 science for every mountain in its borders, at most +6. |
| The Inheritance of Fields | 4 | ◆ | S | Worked improvements and tended works that have stood for at least 60 turns gain +1 production. Tended ones also gain +1 culture. |
| The Measure of the Land | 4 | ○ | P | Every town gains +1 science for every 25 hexes your empire owns, at most +10. |
| The Mother City | 4 | ○ | P | Your capital gains +5% production and +5% culture for each town you have founded this game. |
| The General Levy | 4 | ○ | S | Your towns may spend one citizen to raise their best melee unit. At peace a town may do this once every five turns, sharing the levy limit; while you are at war, once every turn. Units raised this way cost no upkeep inside your borders. |
| The Great Migration | 4 | ○ | S | Every ten turns, each foreign town within three hexes of your border loses one citizen to your nearest town, if your town is happier and has room to grow. |
| The Encroaching Fields | 4 | ◆ | S | Once every ten turns, each of your towns of at least twelve citizens takes one hex from the borders of a foreign town next to it, if nobody works that hex and your town is larger than the town that owns it. |
| The Domesday Survey | 4 | ○ | S | Commission. Own at least 120 hexes and work at least 40 improved or tended tiles at the same time. Then, for the rest of the game, each town gains +1 science for each improved or tended tile it works. The card leaves its chair. |
| The Two Harvests | 4 | ○ | S | Needs tended land. Your worked farms, mines and lumber mills also count as tended for your cards, but not as wild. |
| The Theodosian Walls | 4 | ◆ | S | Your towns gain +1 defence for every two citizens. |
| The Great Aqueducts | 4 | ○ | S | The town raising the Magnum Opus gains +5% production toward it for each of your towns with an Aqueduct, at most +40%. |
| The Imperial Highways | 4 | ○ | S | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. |
| The Keeps | 4 | ○ | S | Workers may build a Keep, one in each town. A Keep gains the yields of every tile around it, and units on its tile gain +5 strength. |
| The Public Good | 4 | ○ | P | +1% science and culture for each public work you hold, at most +25%. |

### Commerce

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Salt Tithes | 0 | ● | P | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. |
| The Merchant Shrines | 0 | ● | P | Your capital gains +2 faith. Cities working an improved luxury gain +1 faith, once per city. |
| Travellers' Letters | 0 | ● | P | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, no cap. |
| The Pathfinders' Company | 0 | ◆ | S | Scouts gain +1 sight and +1 movement. |
| The Assayer's Rule | 0 | ◆ | S | Worked resource tiles that supply gold gain +1 gold. |
| The Mineral Trade | 0 | ● | S | Worked mines and quarries gain +2 gold but lose 1 production. |
| Coastal Estates | 0 | ● | S | Worked plantations and fishing boats gain +1 food and +1 gold. |
| Land Speculation | 0 | ◆ | P | Your cities gain +25% gold. Your capital loses 2 happiness. |
| Private Patronage | 1 | ○ | P | Your cities gain +38% gold. Producing ordinary buildings normally takes 20% more production. Empire buildings and wonders are unaffected. |
| Civic Receipts | 1 | ◆ | S | Buying any building grants culture equal to 15% of the gold paid, with no cap. |
| Provisioning Contracts | 1 | ● | S | Domestic routes grant their destination +3 food and +3 production. |
| The Common Road | 1 | ● | S | Your foreign routes grant you +3 gold, +3 science and +3 culture. Each also grants its host city +3 gold. |
| Venture Routes | 1 | ◆ | P | Your trade routes gain two turns of range. Trade routes between cities at least fifteen hexes apart gain +100% gold. |
| The Factors' Houses | 1 | ● | P | Your cities holding your trading post gain +2 gold and +4 culture, and +25% gold. |
| The Planters' Charter | 1 | ◆ | S | Once drafted, unlock the Plantation House for construction. No chair required. The building is purchased with gold; its payload is specified below. |
| Bought Swords | 1 | ◆ | P | Your cities gain +38% gold. Military units take 10% more production to train. Purchased units count as trained. |
| Established Routes | 1 | ◆ | P | A trade route you have kept up for at least thirty turns pays 50% more. A route that lapses, is cancelled or is plundered begins its term again. |
| The Market Writ | 1 | ◆ | P | +1 authority for every two Markets in your empire. Your cities gain +38% gold. |
| Commercial Education | 1 | ● | P | Gold buildings provide +3 science. |
| Ore Caravans | 1 | ● | P | Trade routes gain +1 gold for every mine in their origin city. |
| Frontier Investment | 1 | ◆ | P | In your cities of 5 population or fewer, domestic trade routes pay double, and those cities gain +25% gold. |
| Financed Industry | 1 | ○ | P | Cities gain production equal to 30% of their gold yield. Every city loses 3 food. |
| The Home Market | 2 | ● | P | Cities receiving at least two of your domestic routes gain +30% food, +30% production and +2 happiness, once per city. |
| The Caravanserai Network | 2 | ● | S | Each city receiving a domestic trade route grants +2 happiness (once per city); +2 production and +2 gold on domestic trade routes. |
| The Foreign Factor | 2 | ● | P | Each foreign city holding your trading post grants you +5 gold and its host city +2 gold per turn while you are at peace and the host is not blockaded. |
| The Money Lenders | 3 | ○ | P | Earn interest equal to 4% of your treasury each turn, with no cap. |
| Mining Districts | 2 | ◆ | S | Worked mines gain +2 gold and +2 science for every two adjacent mines. |
| Royal Assays | 2 | ◆ | P | Each improved luxury resource deposit with a mine provides one additional copy of that luxury. |
| Foreign Procurement | 2 | ◆ | S | Ignore strategic resource requirements when purchasing units. All units cost 20% more. |
| The League of Cities | 2 | ○ | P | Cities with one of your paying outgoing routes gain +23% production and cost one less authority, minimum one. Cities without one lose 10% gold. |
| The Exchange | 2 | ◆ | P | Each different foreign empire your routes currently serve grants +5% science and culture empire-wide. Foreign routes to your cities grant +2 science and +2 culture to both you and the sender. |
| The Brokers' Redraw | 2 | ○ | S | You may reroll a draft with gold instead of faith. All other purchasing is 10% more expensive. |
| The Scholars' Roads | 2 | ○ | P | Lose 4 route capacity. Your routes gain +2 science and +2 culture, and gain +50% science and culture. |
| The Customs Houses | 2 | ◆ | P | Customs houses gain +5 gold and +1 renown. Cities with a customs house gain +38% gold. |
| Strategic Exports | 2 | ◆ | P | Trade routes gain +2 science per improved strategic resource deposit in their origin city. Your strategic resource deposits provide twice their normal quantity. |
| Caravanserai Cities | 3 | ◆ | P | Caravanserais can be built in every city. Cities with a Caravanserai gain +30% gold. |
| The Endowment | 3 | ◆ | P | Purchased buildings provide +2 science each, at most +6 per town. |
| Merchant Princes | 4 | ○ | S | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. |
| The World's Exchange | 4 | ○ | S | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. |
| The Chartered Metropolis | 3 | ○ | P | Cities with at least three of your paying outgoing routes gain +38% food, production and culture, but each costs +4 authority while qualified. |
| The Admiralty of Trade | 3 | ○ | S | A sea trade route between two cities that both hold your trading post has no range limit. |
| The Merchant Works | 4 | ○ | P | Cities building a world wonder, an empire building or the Opus gain production equal to 25% of their gold, and lose 20% of their gold. |
| The Gilded Scaffold | 3 | ○ | P | You may purchase world wonders. All your cities lose 15% production. |
| A Court of Merchants | 3 | ○ | S | Gain +50% renown, but great-person offers contain only Great Merchants. |
| Corner the Market | 2 | ◆ | S | Commission. Goal: control four copies of one luxury, counting copies you receive in deals. Reward: a great merchant and 225 gold. The card then leaves its chair. |
| The Strongroom | 4 | ○ | S | Commission. Goal: end a turn with at least 2,000 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. |
| The Map Sellers | 0 | ● | P | Your capital gains +1 gold and +1 culture for every 40 hexes you have revealed, at most +8 of each. |
| The Carters' Guild | 0 | ● | P | Your cities connected to your capital by road, other than the capital, gain +1 food and +2 gold. |
| The Nest Egg | 0 | ● | P | Your capital gains +1 culture for every 50 gold in your treasury, at most +4. |
| The Staple Right | 1 | ● | P | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. |
| The Waqf | 2 | ● | P | Faith buildings you bought with gold provide +3 faith and +2 culture. |
| The Silk Road Monks | 2 | ◆ | S | Your trade routes carry 100% more religious pressure. Trade routes you send to a city that follows your religion gain +3 gold and +3 culture. |
| Numidian Cavalry | 2 | ◆ | S | Once drafted, unlock Numidian Cavalry, a Horseman replacement. No chair required. Gains +1 combat strength per distinct luxury you control; luxuries obtained only through the Silk Road contribute +0.5 instead. Normal technology requirements apply. |
| Houses of Account | 2 | ● | P | Gold buildings provide +2 happiness and +1 renown. |
| A Guild Commission | 3 | ◆ | S | Commission. Goal: buy five buildings with gold while seated. Reward: a free great-person draft, the same offer Merchant Princes sells for gold. The card then leaves its chair. |
| The Monopoly | 3 | ○ | P | For each luxury you hold three or more copies of and no other empire holds, gain +8 gold, +5 culture and +1 happiness in every city. |
| The Customs Service | 3 | ◆ | S | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. |
| The Bourse | 3 | ○ | E | Gold buildings produce 75% more of their own yields. |
| Patrons Abroad | 4 | ○ | P | Your city building the Magnum Opus gains +3 production for each foreign city holding your trading post. |
| The Merchant Dynasties | 4 | ◆ | P | Each customs house inside your borders gives its city +3 science and +3 culture, whether or not it is worked. |
| The Spice Exchange | 4 | ○ | P | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. |
| Money at Work | 4 | ○ | P | Your capital gains +1 production for every 50 gold in your treasury, at most +40. |
| Bought and Paid For | 4 | ○ | P | Buildings you bought with gold provide +1 production and +2 culture each, counting at most six per city. |
| The Hired Garrison | 4 | ◆ | S | A city with a world wonder or the Magnum Opus at the front of its queue may buy any number of military units with gold each turn. |
| The Neutral Flag | 4 | ◆ | P | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. |
| The World's Fair | 4 | ○ | S | Commission. Goal: have six trade routes running at the same time, foreign or domestic. Reward: +50% science and +50% culture in every city for ten turns. The card then leaves its chair. |
| The Great Loan | 4 | ○ | S | When you seat this card, gain gold equal to twenty turns of your gold income. For the next forty turns your cities lose 25% gold. The card then leaves its chair. |
| The Trade Winds | 4 | ○ | S | Gain +3 trade route capacity. Your trade routes reach 50% farther. |

### Devotion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| First Rites | 0 | ● | P | +25% production toward Shrines. Shrines give +2 faith. |
| Pastoral Shrines | 0 | ● | S | Worked pastures gain +1 faith and +1 food. A city working at least two pastures gains +1 happiness. |
| Lay Offerings | 0 | ● | S | Camps and plantations gain +1 faith and +1 food. |
| The Old Gods Remain | 0 | ◆ | S | Gain one more pantheon belief. |
| The Founding Vows | 0 | ◆ | S | Commission. Start two rites in your cities while this is seated. Reward: 100 faith and 40 food in your capital. Then this card leaves its chair. |
| The Calling | 0 | ● | S | +25% faith until you have founded a religion. |
| The Holy Spring | 0 | ● | P | Cities whose centre stands beside a mountain or a lake gain +2 faith and +1 culture. |
| The Wayside Shrines | 0 | ● | P | Cities with a Shrine gain +2 food and +1 happiness. |
| The Consolation | 1 | ● | S | Cities keeping a rite gain +3 happiness. |
| The Priest-Astronomers | 1 | ● | P | Your capital gains +2 science and +2 faith for every city of yours keeping a rite, at most +16 of each. |
| Consecrated Labor | 1 | ● | S | Cities with a Shrine may buy workers with faith. |
| The Octave | 1 | ◆ | P | Rites you start while this is seated last 50% longer. |
| The Fast | 1 | ◆ | S | Once drafted, unlock the Rite of Fasting. A city keeping it stores no food toward growth for ten turns and gains faith equal to its population each turn. No chair required. |
| The Living Hymnal | 1 | ◆ | P | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. |
| The Alms Roads | 1 | ◆ | S | Your trade routes from Temple cities gain +5 faith. |
| The Mission | 1 | ◆ | S | Commission. Convert two foreign cities to your religion while this is seated. Reward: a free Apostle in your capital and 150 culture. Then this card leaves its chair. |
| The Second Prophet | 1 | ◆ | S | Prophets and apostles you buy start with one extra charge. |
| The Monastic Builders | 1 | ◆ | S | Science buildings may be bought with faith. |
| The Creed | 1 | ◆ | P | Your capital gains +3 faith and +3 culture for every belief your religion holds. |
| The Painted Chapels | 1 | ◆ | P | Religious buildings give +3 culture each. |
| The Rites Commonwealth | 1 | ○ | S | Cities keeping a rite demand 25% less population happiness. Your cities without a rite gain −1 happiness. |
| The Saints' Fields | 2 | ● | S | Worked Holy Sites give +5 food and +8 gold. A city working one gains +2 happiness, once per city. |
| The Cathedral Works | 2 | ● | P | Gain +45% production toward Cathedrals. Cities with one gain +8 science and +2 happiness. |
| The Old Holy Places | 2 | ● | S | Holy Sites that have stood for 20 turns gain +3 faith. Those that have stood for 40 turns gain +3 faith and +3 culture more. |
| Temple Estates | 2 | ● | S | Hexes beside a Holy Site gain +2 food and +2 faith. |
| The Votive Gifts | 2 | ● | S | While this is seated, your cities know the Votive Offering: a city spends the rite's faith to add that much production, at the faith rate, to whatever it is building. Not toward wonders. Once per city per turn. |
| The Spiritual Host | 2 | ◆ | S | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. |
| Mission Houses | 2 | ◆ | S | Your proclamations apply 30% more pressure. Apostles gain +1 movement. |
| The Festival Calendar | 2 | ◆ | P | Cities keeping a rite gain +30% food and +30% culture. |
| The Penitents' Roll | 2 | ◆ | E | +6 science and +6 culture for every Order hand you reroll while this is seated. Rerolls cost 30% less faith while this is seated. |
| The Lay Brothers | 2 | ○ | S | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. |
| The Settled Faith | 2 | ○ | P | Temple cities keeping a rite gain +30% science and +2 happiness. Your proclamations apply 25% less pressure. |
| The Holy Inquisition | 3 | ◆ | P | Rival religions press your cities 40% less. +38% faith. |
| The Learned Clergy | 3 | ◆ | P | +2 science and +2 culture for every 10 faith your empire makes each turn. |
| The Offered Stones | 3 | ◆ | P | Buildings you bought with faith give +2 culture each, at most +6 per town. You can purchase buildings with faith. |
| The Doctors of the Church | 3 | ○ | E | Follower beliefs pay 150% more in your own cities. |
| The Monastic University | 3 | ○ | S | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. |
| The Great Consecration | 4 | ○ | S | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. |
| The Last Offering | 4 | ○ | S | In your holy city, faith you pour into the Magnum Opus buys 50% more production. |
| The Great Commission | 4 | ○ | S | Commission. Have more than half of the world's cities follow your religion. Reward: 500 faith, and for 30 turns every city that follows your religion gains +3 faith and +3 culture. Then this card leaves its chair. |
| The Tithe of Nations | 4 | ○ | S | While one of your cities is building the Magnum Opus, gain 1 faith each turn for every citizen in the world who follows your religion, at home or abroad. |
| The Treasury of Merit | 4 | ○ | P | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. |
| The Apostolic Succession | 4 | ○ | P | Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each. |
| The Chapter Houses | 4 | ○ | P | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. |
| The Seven Pilgrimages | 4 | ◆ | P | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. |
| The Peace of God | 4 | ◆ | S | The city building your Magnum Opus cannot be pressed by rival religions, and gains +2 strength for each city that follows your religion, at most +30. |
| The Last Crusade | 4 | ◆ | S | Your military units gain +8 strength against an empire that is building the Magnum Opus, while fighting in territory that follows your religion. |
| The Conversion of Kings | 4 | ○ | S | Commission. Have a rival's capital follow your religion while this is seated. Reward: a free Prophet in your capital and 300 culture. Then this card leaves its chair. |
| The Pious Masons | 4 | ○ | S | In cities with a Cathedral, a world wonder that is at least half built may be bought with faith. Not the Magnum Opus. |
| The Host Restored | 4 | ○ | S | While this is seated, your cities know the Restoring of the Host: a city spends the rite's faith to heal every unit of yours standing in territory that follows your religion to full health. A city may say it once every five turns. |

### Scientific

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| The Almanac | 0 | ● | P | Libraries cost 25% less production and give +1 production. |
| The Scribes' Hall | 0 | ● | P | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. |
| The Long Study | 0 | ◆ | P | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. |
| The Bronze-Founders' Charter | 0 | ◆ | S | Drafting this opens Casting for research. Knowing it gives two lines a trait they keep through every upgrade. Hoplite (Spearman to Pikeman): +1 strength, and in one of your towns +1 more for every four citizens there. Maryannu (War Chariot to Knight): +1 strength, and +5 against a unit below half health. No chair required. |
| The Herbalists' Charter | 0 | ● | S | Drafting this opens Herbals for research. Knowing it lets workers build the Physic Garden on flat land with fresh water, one in each town: +2 science and +2 happiness. No chair required. |
| The Prospectors' Notes | 0 | ◆ | S | Building a mine or a quarry grants its town 25 production. |
| The Royal Workshops | 0 | ● | S | Completing a technology grants 15 production in your capital. |
| The Prize Essay | 0 | ● | S | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. |
| The Sky Watchers | 0 | ● | P | Shrines give +1 faith and +1 science. |
| Learned Commissions | 1 | ● | S | Library cities gain +38% production toward empire buildings. Completing each institution type for the first time grants 60 culture and 30 faith. |
| The Old Academy | 1 | ◆ | S | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these bonuses become +6 of each. |
| The Commonplace Book | 1 | ● | S | Charter technologies cost you 15% less research. |
| The Secret Arts | 1 | ◆ | P | Each town gains +1 production for each technology you know that no empire you have met knows, at most +5. |
| The Edge of the Sword | 1 | ◆ | S | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. |
| The Glassmakers' Charter | 1 | ◆ | S | Drafting this opens Optics for research. Knowing it lets you build the Specularium, a city building only you can build: +3 food, and +1 science for every two citizens of its town. No chair required. |
| The Surveyors' Charter | 1 | ◆ | S | Drafting this opens Surveying for research. Knowing it lets you build the Aqueduct before Engineering, and lets workers build the Qanat: an improvement on flat land that waters the farms beside it with no river or lake nearby. No chair required. |
| The Founding Gift | 1 | ◆ | S | A great scholar who founds an Academy also grants its town 150 production. |
| The Librarians' Charter | 1 | ○ | S | Drafting this opens Cataloguing for research. Knowing it lets you build the Mouseion, an empire building only you can build: +4 renown a turn, favouring great scholars, and +2 culture for each empire building you hold, itself included. It costs 30% more production than an ordinary empire building. No chair required. |
| The Astronomical Diaries | 1 | ◆ | P | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. |
| The Scholars' Fame | 1 | ● | S | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. |
| The Quiet Faculties | 2 | ○ | P | Cities working a great-person improvement gain +38% food and +30% production, but produce military units 25% more slowly. |
| Enduring Institutions | 2 | ◆ | P | A city with an empire building at least twenty turns old gains +2 happiness and +23% production, once per city. |
| The Mechanists' Charter | 2 | ○ | S | Drafting this opens Mechanics for research. Knowing it gives two lines a trait they keep through every upgrade. Onager (Catapult and Trebuchet): +1 range. Repeating Crossbow (Archer to Crossbowman): it may move after it shoots. No chair required. |
| The Scholars' Guild | 2 | ◆ | P | Scholars in the trades also pay +1 food and +1 production. |
| The Translation Movement | 2 | ◆ | S | Technologies that an empire you have met already knows cost you 20% less research. |
| The Great Designs | 2 | ○ | S | Your towns build a wonder 30% faster while no empire you have met knows the technology that opens it. |
| The Paper-Makers' Charter | 2 | ◆ | S | Drafting this opens Papermaking for research. Knowing it lets you build the Scriptorium: +2 science, and +10% science in a town with an Academy in its borders. No chair required. |
| The Physicians' Charter | 2 | ◆ | S | Drafting this opens Medicine for research. Knowing it lets you build the Bimaristan, an empire building: +25% food in its town, and your units heal 10 more a turn in your land. No chair required. |
| The Printers' Charter | 2 | ◆ | S | Drafting this opens Printing for research. Knowing it lets you build the Aldine Press, a city building only you can build: +2 culture, and trade routes from its town gain +2 science and +2 culture. It also gives +1 trade route. No chair required. |
| The Latin Quarter | 2 | ● | S | Great-person works beside an Academy gain +2 culture and +1 production. |
| The Charter Rolls | 2 | ◆ | P | Your capital gains +3 production and +3 culture for each charter you have drafted. |
| The Royal Charter Commission | 2 | ◆ | S | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. |
| The Long Inheritance | 3 | ◆ | S | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. |
| Greek Fire | 3 | ◆ | S | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. |
| The Proving Ground | 3 | ◆ | S | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. |
| The Gunfounders' Charter | 3 | ◆ | S | Drafting this opens Gunfounding for research. Knowing it lets you build the Tophane, an empire building: military units gained in its town start with +4 strength, and it builds them 25% faster. No chair required. |
| The Alchemists' Charter | 3 | ◆ | S | Drafting this opens Chemistry for research. Knowing it gives the Grenadier trait to the Warrior line (Warrior to Longswordsman), kept through every upgrade: +1 strength, and +1 more for each charter technology you know. Workers may build Niter Beds beside a farm or pasture, which supply one niter. Chemistry does not open the Magnum Opus. No chair required. |
| The School of Mines | 3 | ● | P | An Academy standing on a strategic resource supplies one more copy of it. |
| The Studium Generale | 3 | ○ | S | Great-person works beside an Academy count as Academies for your cards. |
| The Nizamiyya | 3 | ◆ | S | Academies produce half again of everything they make. |
| The Age of Reason | 3 | ○ | S | Your Orders count each technology you complete twice. |
| The Journeymen | 3 | ● | S | Completing a technology grants each town production equal to three times its population. |
| The Patent Office | 4 | ◆ | S | Charter technologies cost you no more research than ordinary technologies at the same point in the tree. |
| The Naval Gunners' Charter | 4 | ◆ | S | Drafting this opens Naval Gunnery for research. Knowing it gives your Gun Galleys the Galleass trait: +3 strength, and they blockade: parked off a rival's port, a Gun Galley closes its sea lane and its trade. No chair required. |
| The Military Engineers' Charter | 4 | ◆ | S | Drafting this opens Military Architecture for research. Knowing it lets you build the Bastion (+5 defence, +30 hit points), which no ordinary technology opens. No chair required. |
| The Republic of Letters | 4 | ◆ | P | Your capital gains +4 production and +4 culture for each Academy you hold. |
| The Sum of Knowledge | 4 | ○ | P | Your capital gains +1 production and +1 culture for each technology you know. |
| The Great Catalogue | 4 | ○ | S | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. |

### Magisterial

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Civic Granaries | 0 | ● | P | Monuments give +2 food and +2 production. |
| The Civic Accounts | 0 | ● | P | Monuments give +2 gold and +2 science. |
| Patronage | 0 | ● | P | Your capital gains +1 renown per four citizens. Monuments give +1 culture. |
| The Temple of the Muses | 0 | ● | P | Culture buildings give +2 faith each. |
| The Sculptors' Quarries | 0 | ● | S | Worked quarries give +1 production and +1 culture. Cities working one gain +15% production toward buildings. |
| The Pageant Fields | 0 | ● | P | Worked farms and plantations in cities with a Monument gain +1 food. Cities working at least three such tiles gain +2 culture, once per city. |
| Hearth Ceremonies | 0 | ● | P | Cities with a Monument and Shrine gain +2 faith and +2 gold. |
| The Wonder-Feasts | 0 | ◆ | P | Cities producing a wonder gain +4 food and +2 happiness. |
| The Civic Nursery | 0 | ◆ | S | Cities with a Monument produce workers and settlers 20% faster. |
| The Court Stewards | 0 | ◆ | P | Your capital gains +1 food and +1 gold per three citizens while it has a Monument. |
| The Founding Pageant | 0 | ○ | S | Founding a city grants a free Monument and 25 culture. Your capital produces settlers 25% faster. |
| The Capital of Letters | 0 | ○ | P | Your capital gains +20% food and +20% gold while it has a Monument and Granary, but trains military units 15% more slowly. |
| Master Masons | 0 | ● | S | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. |
| The Chronicle of Works | 0 | ◆ | P | While active, gains +1 science and +1 gold per turn for each culture building you complete for the first time in a city, at most +30 of each. |
| The Chancery | 1 | ● | P | Gain +1 authority capacity per two Monuments, at most +3. Cities with at least two culture buildings gain +3 gold. |
| The Civic Stage | 1 | ● | P | Cities with at least two culture buildings gain +2 happiness and +5 food. |
| The Public Copyists | 1 | ● | P | Cities with a Monument and Library gain +5 science and +3 culture. |
| The Artisan Wages | 1 | ● | P | Culture buildings give +2 gold and +1 production each. |
| Provincial Patrons | 1 | ● | P | Noncapital cities with at least two culture buildings gain +1 renown and +3 culture. |
| The Citizens' Watch | 1 | ● | S | Cities with at least two culture buildings train military units 30% faster and gain +3 defence. |
| The Harbour Festival | 1 | ● | P | Harbours give +3 culture and +3 food. Coastal cities with a Monument gain +1 happiness. |
| The Pageant Schools | 1 | ● | P | Cities with a Monument and Temple gain +3 science and +3 faith. |
| The Grand Fairs | 1 | ● | P | Cities with a Market and Monument gain +5 culture and +5 gold. |
| The Groundskeepers | 1 | ◆ | S | Worked great-person improvements give +5 food and +5 production. |
| The Laureate | 1 | ◆ | P | Cities working a great-person improvement gain +5 culture, +3 science and +1 renown, once per city. |
| The Guild of Masons | 1 | ◆ | P | Gain +38% production toward wonders. Cities producing a wonder lose 2 gold per turn. |
| The Civic Assemblies | 1 | ◆ | P | Gain +1 authority capacity per two culture buildings, at most +4. Culture buildings cost 20% less production in noncapital cities. |
| The Patrons' Road | 1 | ◆ | P | Connected noncapital cities with a Monument gain +5 gold and +3 production. Domestic routes from such cities give their destination +3 culture; your foreign routes from them give you +3 culture. |
| The Great Patrons | 1 | ◆ | S | Each wonder you hold gives +2 family-neutral renown. Cities containing a wonder purchase culture buildings for 20% less gold. |
| The Muses' Call | 1 | ○ | P | Gain +20% renown. Cities working a great-person improvement gain +5 food and +5 production, once per city. |
| The Artisan Court | 1 | ○ | S | Cities working a great-person improvement gain +2 renown and purchase culture buildings for 25% less gold. |
| The Working Court | 1 | ○ | P | Cities with a Monument gain production equal to 30% of their base culture, excluding conversion outputs. |
| The Festival Season | 1 | ○ | P | Cities with a Garden and Amphitheater gain +30% food and +30% gold. Each qualifying city costs +2 gold upkeep. |
| The Master Workshops | 1 | ◆ | S | Completing a culture building for the first time in a city grants 38 production there and 30 gold. |
| The Court Archives | 2 | ● | P | Culture buildings give +3 science each. Cities with at least two gain +8 gold. |
| The Public Gallery | 2 | ● | P | Cities with at least three culture buildings gain +9 food and +3 happiness. |
| The Monumental Provinces | 2 | ● | P | Connected noncapital cities with a Monument gain +8 production and +5 culture. |
| The Civic Faith | 2 | ● | P | Culture buildings give +5 faith each. Cities containing a wonder gain +3 happiness. |
| The Provincial Chancery | 2 | ● | P | Gain +1 authority capacity per noncapital city with at least two culture buildings, at most +8. Such cities gain +5 science. |
| The Maritime Galleries | 2 | ● | P | Harbours give +8 culture and +5 science. Ships trained in a city with at least two culture buildings gain +3 strength on creation. |
| The Provincial Stages | 2 | ● | P | Noncapital cities with at least two culture buildings gain +2 renown and +5 food. |
| The Master's Presence | 2 | ◆ | P | Cities working a great-person improvement gain +30% production toward buildings and +23% gold. |
| The Grand Tour | 2 | ◆ | P | Cities containing a wonder gain +8 culture and +8 science. Cities working a great-person improvement gain +2 happiness. |
| The Learned Patron | 2 | ◆ | P | Cities with at least two culture buildings gain science equal to 15% of their base culture, at most +18 science per city. Conversion outputs are excluded. |
| The Performers' Treasury | 2 | ◆ | P | Cities with at least two culture buildings gain gold equal to 30% of their base culture, excluding conversion outputs. |
| The Civic Harvest | 2 | ◆ | P | Cities of at least ten population with at least two culture buildings gain +38% food and +3 happiness, and retain an additional 20% of food spent on growth. |
| The Senate Charter | 2 | ◆ | S | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +30% production toward buildings. |
| The Sculptors' Schools | 2 | ◆ | S | Worked great-person improvements give +5 science and +5 gold. Their cities gain +1 renown, once per city. |
| The Patrons' Fleet | 2 | ◆ | S | Cities with a Harbour and at least two culture buildings train ships 53% faster. Your ships gain +1 movement. |
| The Monumental Court | 2 | ○ | S | Cities containing a wonder gain +3 renown and +38% production toward culture buildings and wonders, once per city. |
| The Civic Commonwealth | 2 | ○ | S | Cities with at least three culture buildings demand 20% less population happiness and cost one less authority, minimum one. |
| The Laureate Cities | 3 | ● | P | Cities of at least twelve population with at least two culture buildings gain +38% culture and +15% science. |
| The National Galleries | 3 | ● | P | Culture buildings give +5 food and +5 gold each. Cities with at least three gain +4 happiness. |
| The Provincial Academies | 3 | ● | P | Connected noncapital cities with a Library and at least two culture buildings gain +30% production and +15% science. |
| The Civic Pantheon | 3 | ● | P | Cities containing a wonder gain +25% faith and +20% gold. Wonders give +10 culture each. |
| The Masters' Domain | 3 | ◆ | P | Worked great-person improvements give +12 production and +12 food. Their cities gain +30% gold, once per city. |
| The Great Chancery | 3 | ◆ | P | Gain +2 authority capacity per city with at least three culture buildings, at most +12. Such cities gain +30% culture. |
| The Honoured Dead | 3 | ◆ | P | Your capital gains +6 science and +12 production per distinct great person you have spent this game, at most +90 science and +180 production. |
| The Pageants of Peace | 3 | ◆ | S | While at peace with every foreign empire, cities with at least two culture buildings gain +30% culture and +2 happiness. |
| The Living Canon | 3 | ○ | P | Cities with at least three culture buildings gain +8% food and +8% production per distinct great-person family whose legacy you currently hold, at most +40% each. |
| The Universal Court | 3 | ○ | P | Cities with at least three culture buildings gain food and gold each equal to 38% of their base culture. Conversion outputs are excluded. |
| The Wonder Commonwealth | 3 | ○ | P | Cities containing a wonder gain +38% production and +38% food. Your cities without a wonder gain +15% culture instead. |

### Cross-type

| Order | Decks | Band | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Frontier Militia | Dominion · Expansionist | 0 | ● | S | Each town you found starts with the best melee unit you can build standing in it. |
| Military Colonies | Dominion · Expansionist | 1 | ◆ | S | Cities with a Barracks gain +45% production toward settlers and workers. |
| The Escorted Roads | Dominion · Commerce | 1 | ◆ | S | Routes whose origin has a garrison gain +5 gold. Naval units gain +2 strength while adjacent to one of your traders. |
| Field Academies | Dominion · Scientific | 1 | ◆ | S | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. |
| The Engineer Corps | Dominion · Scientific | 3 | ◆ | S | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. |
| The Imperial Examinations | Dominion · Magisterial | 1 | ◆ | P | Garrisoned cities with a Monument gain +3 culture and +1 scholar renown. |
| Examinations of State | Dominion · Magisterial | 2 | ○ | P | Cities with a Monument and a garrison gain +2 science and +2 culture per three citizens. Ungarrisoned cities receive no bonus. |
| Market Gardens | Expansionist · Commerce | 0 | ● | S | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. |
| The Provincial Fair | Expansionist · Commerce | 2 | ◆ | P | Connected noncapital cities with a Market gain +3 food. Their worked plantations, camps and pastures gain +2 gold. |
| Sacred Groves | Expansionist · Devotion | 0 | ◆ | S | Worked, unimproved forests gain +1 food and +1 faith. |
| Hydraulic Schools | Expansionist · Scientific | 1 | ● | P | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. |
| The Assay | Expansionist · Scientific | 1 | ● | S | Hexes with a strategic resource gain +2 science. |
| The Sculpted Landscape | Expansionist · Magisterial | 3 | ◆ | S | Farms beside a great-person improvement gain +2 food and +2 culture. Each farm receives this once regardless of the number of adjacent works. |
| The Tithe | Commerce · Devotion | 2 | ○ | P | Cities with a Temple gain gold equal to 25% of their base faith, and +25% gold. |
| Merchant Scholars | Commerce · Scientific | 1 | ◆ | S | Foreign routes from a city with a Library gain +5 science. |
| Travelling Players | Commerce · Magisterial | 0 | ◆ | S | Foreign routes from a city with a Monument gain +2 culture. |
| Cloister Schools | Devotion · Scientific | 1 | ◆ | P | Cities with both a Temple and a Library gain +5 food and +5 science. |
| The Cloister | Devotion · Scientific | 2 | ○ | P | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. |
| Sacred Commissions | Devotion · Magisterial | 1 | ◆ | S | Cities with a Holy Site gain +38% production toward wonders. Completing a wonder grants 60 faith. |
| Illuminated Treatises | Scientific · Magisterial | 0 | ● | P | Cities with both a Library and a Monument gain +1 science and +1 culture. |
| The House of Wisdom | Scientific · Magisterial | 3 | ◆ | S | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. |
| Marcher Lords | Dominion · Expansionist | 2 | ◆ | P | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. |
| The Merchant Navigators | Commerce · Scientific | 2 | ● | S | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. |
| Letters of Marque | Dominion · Commerce | 3 | ○ | P | Naval combat kills grant 60 gold. Cities with a Harbour gain +38% gold, but produce naval combat units 20% more slowly. |
| The Exchange of Discoveries | Commerce · Scientific | 3 | ◆ | S | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. |
| Books from the Ships | Commerce · Scientific | 2 | ◆ | P | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. |
| Garden Provinces | Expansionist · Magisterial | 2 | ● | P | Connected cities with a Monument gain +3 food and +3 culture. |
| Garden Cities | Expansionist · Magisterial | 1 | ◆ | P | Cities with a Monument gain +1 culture per three worked wild tiles, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. |
| Pilgrim Markets | Commerce · Devotion | 1 | ◆ | S | Routes gain +3 gold and +3 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. |
| The Grain Exchange | Expansionist · Commerce | 1 | ◆ | S | Domestic routes from a city with a Granary give +5 food to their destination. Cities receiving one gain +1 happiness. |
| The Cosmopolitan Court | Commerce · Magisterial | 3 | ○ | S | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +3 gold. |
| Rites of Passage | Dominion · Devotion | 0 | ● | S | Gaining a military unit grants 12 faith. |
| The Sacred Host | Dominion · Devotion | 1 | ○ | S | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 15 faith. |
| The Crusader Orders | Dominion · Devotion | 2 | ◆ | S | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. |
| The Holy Army | Dominion · Devotion | 3 | ◆ | S | Worked Holy Sites and citadels that stand beside each other each gain +3 faith and +3 culture. |
| The Barbarian Frontier | Dominion · Expansionist | 1 | ◆ | S | Clearing a barbarian camp claims the camp's hex and every unowned hex around it for your nearest town within five hexes. |
| The Oriflamme | Dominion · Devotion | 1 | ◆ | S | Military units beside one of your religious units gain +4 strength. |
| The Flood Festival | Expansionist · Devotion | 1 | ◆ | S | Each tile your workers turn into burned country grants 8 faith. |
| The Road Garrisons | Dominion · Expansionist | 2 | ◆ | P | Garrisoned cities with a road to your capital gain +5 food and +5 defence. |
| Convert It or Tax It | Dominion · Devotion | 2 | ◆ | P | Captured cities that do not follow your religion gain +5 gold and +3 faith. Captured cities that follow it cost one less authority, minimum one. |
| War Bonds | Dominion · Commerce | 3 | ◆ | S | Military units gain +1 strength for every 150 gold in your treasury, at most +5. |
| Professional Soldiers | Dominion · Commerce | 3 | ◆ | S | Units you purchase gain +3 combat strength. |
| The Chartered Company | Dominion · Commerce | 3 | ◆ | S | Once drafted, unlock the Company Guard, a unique gunpowder-age melee unit that can only be bought with gold, in cities with a Barracks. No chair required. |
| The Muster of the Fields | Dominion · Expansionist | 1 | ◆ | S | Cities of at least five citizens may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. The unit counts as trained. |
| Carried-Off Scholars | Dominion · Scientific | 2 | ● | S | Capturing a city grants science equal to ten times its population. |
| The Sword of State | Dominion · Magisterial | 1 | ● | S | On draft: the best melee unit you can build is trained in your capital. It costs no upkeep. Seated, this card does nothing. |
| Copying the Enemy | Dominion · Scientific | 1 | ◆ | S | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. |
| The New Code | Dominion · Magisterial | 3 | ○ | S | Capturing a city opens a draft at once, at no culture cost. This can happen at most once every ten turns. |
| Looted Art | Dominion · Magisterial | 2 | ◆ | S | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. |
| The Farming Garrisons | Dominion · Expansionist | 1 | ● | S | Hexes with a fortified military unit gain +1 food and +1 production. Fortified units gain +2 strength. |

### Generic

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Hearth Stores | 0 | ● | S | Your capital gains +1 food. |
| Watchmen | 0 | ● | S | Friendly combat units gain +2 strength when defending in your territory. |
| Resting Camps | 0 | ● | S | Friendly units that take no action this turn heal an additional 5 health when otherwise eligible to heal. |
| Local Markets | 0 | ● | S | Your capital gains +2 gold. |
| The Village Scribe | 0 | ● | S | Your capital gains +1 science. |
| Public Gatherings | 0 | ● | S | Your capital gains +1 culture. |
| Household Altars | 0 | ● | S | Your capital gains +1 faith. |
| Boundary Stones | 0 | ● | S | Cities with a Monument expand their borders 20% faster. This does not increase draft culture. |
| Public Wells | 1 | ● | P | Cities without freshwater gain +2 food. |
| Civic Peace | 1 | ● | S | Gain +1 empire happiness. |
| Local Clerks | 2 | ● | S | Gain +1 authority capacity. |
| Public Hospitals | 3 | ● | S | Cities of at least eight population gain +1 happiness. |
| Common Ledgers | 3 | ● | P | Cities with a Market gain +2 science; cities with a Library gain +2 gold. |

### Notes and deferred halves (from the data rows)

- **Riders of the Steppe** — A raid costs a single point of movement, so a rider who is forgiven one is forgiven the raid.
- **The Old Songs** — Open water your people work counts as unbuilt ground here: the game tells works from wild, and not land from sea.
- **Outposts** — No work can yet be raised outside your borders, and only a town or a great general can claim ground. † a worker plants an outpost on wild ground near your border, and it claims that ground and the ring around it for your nearest town
- **The Waterworks** — The saving on the aqueduct is paid as extra production toward it, which comes to the same price.
- **Migration** — No rule yet moves a citizen from one town to another. † a crowded town sends a citizen to a small town joined to it
- **The Polders** — The ground under a hex never changes during a game, by a deliberate rule, and the board would have to redraw the hex. † a worker turns shallow sea beside your land into grassland
- **The Heartland** — A reward cannot yet mark one town for the rest of the game. † one town working a great stretch of rich land becomes your heartland, cheaper to hold and happier for good
- **The Master of Works** — For now a great engineer's act simply pays half as much again, wherever it is spent.
- **The Great Migration** — No rule yet moves a citizen from one town to another, let alone between empires. † unhappy foreign towns near your border lose citizens to your happier towns
- **The Encroaching Fields** — A hex never changes hands between empires except when its town is captured. † large towns take unworked hexes from the borders of smaller foreign towns beside them
- **Travellers' Letters** — Half built, and so held whole. Nothing in this game counts the empires you have met, so the letters have nobody to be addressed to. † your capital learns and sings a little more for every foreign empire you have met
- **Letters of Introduction** — Held whole. The world does not announce a first meeting, and no law of yours can put coin in another realm's treasury. † meeting an empire for the first time pays you, and pays them; claiming a discovery pays gold
- **Private Patronage** — Held whole. A discount here would reach the great national houses as well, and the card says it must not. † buying an ordinary building costs less, and raising one the slow way costs more
- **The Common Road** — Half built, and so held whole. A law of yours pays your own books; it has no way to put coin in a foreign market. † a road that ends abroad pays you, and pays the town it ends in
- **The Return Leg** — Held whole. A caravan's earnings are banked where it arrives, and there is no way to send a share of them home. † a road pays the town it left as well as the town it reaches, and the second helping never travels again
- **The Merchant Ledger** — Held whole. No book in this game records which markets your caravans have already found. † hiring a caravan costs less; every new market your roads reach for the first time teaches and sings, for as long as you keep the ledger
- **The Factors' Houses** — Held whole. A standing commercial house is a new fact about a town, and nothing on the board keeps one yet. † the towns where your house is established pay gold and culture, and send caravans more cheaply
- **The Planters' Charter** — Held whole. The house it would open has not been drawn up yet, so the charter has nothing to grant. † drafting this opens the planters' house for building
- **The Convoy** — Half built, and so held whole. A soldier can only be told that another soldier stands beside him; a cart is nobody's formation. † soldiers standing beside one of your carts fight harder; your carts travel further
- **The Treaty Ports** — Held whole. Nothing counts your standing agreements, and no law of yours can pay a foreign capital. † every partner you have a standing agreement with pays your capital, and theirs
- **The Post Riders** — Held whole. A piece can be paid for the ground it stands on, but the road under it is not among the grounds it can be asked about. † a cart or a workman that wakes on your own road travels further that turn
- **Established Routes** — Held whole. A caravan is hired and lapses; nothing remembers that the same road was run before. † a road kept up across renewals pays far more
- **The Market Writ** — A line the design is still writing, entered under a working name so that it is not lost. Both halves would be ordinary law once the card is named and its words are settled. † your markets widen your writ, and land is cheaper to buy
- **The Caravanserai Network** — Held whole. What a road pays cannot be made to rise with the number of towns your other roads reach. † each of your towns that one of your own roads ends in gladdens the realm and enriches the roads themselves
- **The Foreign Factor** — Held whole. A standing commercial house abroad is a new fact about a town, and no law of yours can pay a foreign town. † every foreign town where your house is established pays you, and pays its host, while the peace holds
- **The Consulate** — Held whole. A standing commercial house abroad has no place on the board, and a discount of yours cannot be handed to another empire. † towns where your house is established buy more cheaply, whoever owns them, and each foreign host sings for you
- **The Warehouses** — Held whole. The realm can be asked which luxuries it holds more than one seam of, never which it holds a shed's worth of. † a luxury you dig in real quantity pays gold, culture and contentment
- **The Purple Works** — Held whole. The works it would open has not been drawn up yet, and neither has the good it would make. † drafting this opens the purple works for building
- **The Money Lenders** — Half built, and so held whole. A surcharge reaches the things a city buys, and never the hire of a cart or the calling of a great name. † your treasury pays you interest each turn, up to a ceiling; everything you buy, hire or call for costs more while the lenders are seated
- **The Harbour Chain** — Held whole. Extra roads are granted to the realm or once per town, never counted off a tally of harbours. † your harbours together open more roads than you could otherwise run; a sea road between two of your established houses runs longer
- **The Charter Fleet** — Half built, and so held whole. A piece can be born stronger or hardier, but nothing can be written on it about how far it sees. † hulls bought with gold cost less and are built with keener lookouts for the rest of their lives
- **Export Guilds** — Held whole. Nothing asks whether a particular good is being sold abroad this turn. † a town working a good you are currently selling abroad builds faster and rests easier
- **The Exchange** — Half built, and so held whole. A law of yours pays your own books; it cannot teach a foreign capital. † every foreign realm your roads reach teaches your whole empire, and learns from it
- **The Scholars' Roads** — A line the design is still writing, entered under a working name so that it is not lost. Each of its three halves would be ordinary law once the card is named and its words are settled. † you may run fewer roads, and every one of them teaches and sings far more
- **The Customs Houses** — A line the design is still writing, entered under a working name so that it is not lost. Renown is paid for a town's buildings and never for one hex's works, and no town's gold can be made to go further at the counter. † a customs house pays gold and renown, and its town buys more with what it earns
- **The Dye Vats** — Held whole. The vats they would open have not been drawn up yet, so the charter has nothing to grant. † drafting this opens the dye vats for building
- **The Endowment** — Held whole. A soldier can be marked at his birth by the bank that paid for him; a building cannot. † a building you buy is better for the rest of its life than one you raised
- **The World's Exchange** — Held whole. Hammers behind a thing are raised by a flat share, never by a share counted off how far your roads reach.
- **The Admiralty of Trade** — Held whole. A standing commercial house has no place on the board, and nothing may waive how far a road is allowed to reach. † a sea road between two of your established houses may be run at any distance
- **The Merchant Commonwealth** — Held whole. A standing commercial house has no place on the board, and no law makes a single town cheaper to hold. † your own towns where your house is established and one of your roads ends rest easier and are easier to hold
- **The Merchant Works** — Half built, and so held whole. A town can be asked whether it is raising a wonder, but the realm's single great houses and the last work of all are not a class anything can name. † a town raising one of the realm's great houses turns a share of its coin into stone, and loses a share of its coin while it does
- **Pastoral Shrines** — Not built, both halves together: the law can dress a herder's ground, and nothing can yet ask whether the realm keeps a single pen anywhere at all, which is the clause the capital's hammers hang on. † worked pastures pay an offering of faith and a little more food; your capital works harder while you keep a penned herd anywhere at all
- **Hearth Blessings** — Not built: a town remembers how many people live in it and not how many ever did, so nothing can tell a new high from an ordinary birth. † a town growing past the largest it has ever been gives thanks in faith; a shrine there sets bread on the table besides
- **The Book of Mercy** — Not built: neither observance has been written into the book of rites, so the charter has nothing to open. The row is kept so the two may be written. † a town may mourn, and while it grieves its people ask far less of it and it raises no soldiers; a town may keep a watch, seeing the raiders' camps around it and taking faith for every kill near its walls
- **Pilgrims' Welcome** — Not built: the law can ask whether a town keeps your faith and cannot yet ask whether it keeps somebody's. † towns with a shrine that keep any faith at all, yours or a rival's, eat better and trade better
- **The Healing** — Not built: there is no order a town can give that spends faith on the wounded, and no price quoted for one. † a town may spend faith to mend your soldiers standing in it and beside it
- **The Loaves** — Not built: there is no order a town can give that buys a citizen, and no price quoted for one. † a town may spend faith to seat another citizen at once
- **The Feast Days** — Not built: nothing counts the years a particular town has spent keeping its rites while this law stood. † a town that has kept its rites long enough holds a feast, takes faith for every citizen at it, and is glad of it for a while
- **The Quiet Hours** — Not built: a law may make the realm's rites run longer by a share of their length and cannot yet add a flat count of turns to them. † a rite granted while this stands runs five turns longer than it would
- **The Rites Charter** — Not built, both halves together: the chapel is ready to be opened and the rite charted beside it has not been written into the book of rites. † the chapel may be raised in your towns under its ordinary rules; a town may keep the Rite of Passage, and the soldiers raised there are hardier for the rest of their lives
- **Missionary Hospitality** — Half built and therefore not built: the world now writes down the first time each foreign town turns to your faith, but the roster has no word that gathers every kind of clergy into one line, so nothing can make them cheaper to call. † clergy cost less faith to call; the first time each foreign town turns to your faith your capital is fed and the realm sings
- **The Alms Roads** — Not built: a caravan carries no faith, and a law of yours cannot put coin in another empire's purse. † roads from your temple towns feed and enrich the towns they reach; roads from them into another realm pay you in faith and coin, and pay your host a little too
- **Consecrated Labor** — Not built: the faith bank sells clergy and houses of learning, and nothing opens it to the spade. † workers may be bought with faith in temple towns at the price coin would have paid; and those workers come with an extra charge in them
- **The Votive Companies** — Not built, both halves together: the faith bank does not sell soldiers, and the price the other half charges is no card on its own. † temple towns keeping a rite may buy soldiers with faith at the price coin would have paid; and every soldier you keep costs a coin more while this stands
- **The Concord** — Not built: the waiver on a town's first citizens is a rule of the whole realm and cannot yet be narrowed to the towns that keep a faith. † in a town that keeps any faith the first three citizens ask nothing of the realm's contentment
- **The Parish Rolls** — Not built: the writ is granted to the realm as capacity and is never taken off a particular town's price. † a temple town that keeps any faith is cheaper to hold, though never free
- **Sainthood** — Not built: nothing can set a relic down but the apostle who carries one. † spending a great person in a temple town's country leaves a relic behind in that town if it has none
- **The Pilgrim Road** — Not built: a caravan carries no faith, and a law of yours cannot pay another empire. † your roads ending at a town that holds a relic or works a holy site pay faith to the sender and to the host alike
- **Mission Houses** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself, and the roster has no word that gathers the prophet, the apostle and the inquisitor into one line. † your proclamations press harder on the towns that hear them; clergy travel farther in a turn
- **Consecrated Ground** — Not built: land is bought out of the treasury and nothing opens the faith bank to it. † hexes may be bought with faith at the price coin would have paid
- **The Council** — Not built: there is no council a prophet can call, and no offer of beliefs to lay before one. † once an age a prophet at your faith's first seat may set one follower belief aside and choose another from three
- **The Settled Faith** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself. † temple towns keeping a rite learn faster and are gladder; and your proclamations press more gently for it
- **Pilgrim Hospices** — Not built: the law can ask whether a town keeps your faith and cannot yet ask whether it keeps somebody's. † great towns with a cathedral that keep any faith eat well and are glad of it
- **The Holy Inquisition** — Not built, both halves together: a town's resistance to another faith belongs to its temple and cannot yet be raised for the realm at large. † a rival's faith presses far more weakly on your towns, over whatever defence they already keep; inquisitors cost less faith to call
- **The Sacred Treasury** — Not built: a bonus on building can name one row or one category, never a marvel and the last work of all at once. † a town with a cathedral, a relic and a worked holy site grows rich, sings, and builds the great works faster
- **The Bishop's Choice** — Not built: a cathedral's consecration is settled as the roof goes on and there is no offer to put before anyone. † when you finish a cathedral you choose its consecration instead of being given one
- **The Cloistered Realm** — Not built, both halves together: a proclamation's weight can be shifted by a flat figure and not by a share of itself. † cathedral towns keeping a rite learn and build far faster; and your proclamations press more gently for it
- **The Long Study** — † a library that has stood a long while pays culture and renown, and pays more again once it is very old
- **The Old Academy** — † an academy that has stood a long while feeds and works the town it serves, and more again once it is very old
- **Enduring Institutions** — † a town whose empire building has stood a long while is gladder and builds faster, once per town
- **The Second Seat** — † you may raise one further copy of an empire building, in a town that holds a university, and only one such copy may be building or standing at a time
- **The Civic Guard** — † Towns that keep a Monument are harder to storm.; Soldiers defending beside such a town fight harder. A strength line can be told where the fight is happening — your ground, the hills, a town — but not which buildings stand in the town behind it.
- **Festival Commissions** — Not built: a windfall is paid to an empire and cannot be told what stands in the town that grew; and the design pays only for growth past a town's own historical high, which nothing remembers. † a town that holds a monument is paid in song and bread each time it grows
- **The Civic Annals** — Not built: a counter is a number on a card and carries no subject, so it cannot be told which towns to watch; and the design pays only for growth past a town's own historical high, which nothing remembers. † the card keeps count of every time one of your towns that holds a monument grows, and pays a little more each turn for it
- **Public Benefactors** — Half built and therefore not built: a purchase now says what it cost and whether it was that town's first, but a windfall is paid to an empire and cannot be told what stands in the town where the money changed hands. † buying a building in a town that holds a monument pays song in proportion to the coin that actually left the treasury, the first time that town acquires one of that kind
- **The Commemorative Feast** — † Spending a great person feeds and supplies the nearest town. The world announces the moment a great person is spent on a deed, and not the moment one is spent laying down a lasting work — so a card written on the spending would pay for half of the ways a person may be spent.
- **The Living Chronicle** — Not built: a card may count a marvel finished anywhere in the world and a great one spent, but not a marvel finished by you alone; and two counters cannot share one ceiling, so a card whose limit is on the pair of them cannot be written as a pair of lines. † the card keeps count of the marvels you finish and the great ones you spend, and pays a little more each turn for both
- **The Complete Court** — † Your capital is paid for the breadth of what it has raised. The kinds of building a town holds can be counted now, but not with one of those kinds left out — and this card is paid for everything except its own.
- **The Palace Guard** — † Towns that keep several culture buildings raise soldiers faster and are defended harder. A strength line cannot be told which buildings stand in the town behind it.
- **The Cultural Embassies** — † Your capital is paid for each foreign realm you have met and are not fighting. Nothing counts the realms you have met, nor the ones you are at peace with — only the ones your caravans trade with.
- **The Great Exhibition** — † Great-person works pay half again as much as they were built to pay.; Towns working several different kinds of such work earn more. The kinds a town works can be counted and paid for one at a time, but a town cannot yet be admitted for working several of them.
- **The Golden Age** — † Finishing a marvel gives the whole realm a decade of plenty, and a second marvel begins the decade again rather than doubling it. A blessing hung on the realm at a moment is hung a second time beside the first, so two would pay twice over instead of lasting longer.
- **The Salon** — † Culture buildings pay renown in towns whose citizens work a great person's lasting work. A trickle counted off a shelf of buildings is counted across the whole realm, and cannot be held to a class of town or to a ceiling in each one.
- **The Magister's Court** — † Towns holding a wonder press on faster with the Great Work and with cathedrals. A bonus on building can name one row or one category, never two rows at once.
- **The Imperial Pageant** — † Soldiers defending near your marvels and your great people's works fight harder. A strength line can be told whose ground the fight is on, but not what stands two hexes away from it.; Towns that keep several culture buildings raise soldiers faster.
- **The Last Commission** — † Spending a great person pours production into whichever town is building the Great Work. A windfall's supplies go to the nearest town to where the deed happened, and cannot be sent to the town that is building a named thing.
- **Letters of Marque** — The coin is for a kill made by one of your ships, wherever it happens. The extra gold and the slower shipyards both belong to the cities that have a Harbour.
- **The Sacred Host** — A soldier bought with faith costs what it would cost to build, converted at the faith rate.
- **Pilgrim Markets** — † a road pays when either of its two ends keeps a holy site
- **The Exchange of Discoveries** — † a town counts the distinct realms its own caravans reach
- **Sacred Patronage** — Half built and therefore not built: a gift may now be held to once a turn, but the moment the world announces is a great one spending themselves on their boon — so a card written on the spending would pay for one of the ways a person may be spent and stay silent for the others. † spending a great person pays faith, but never more than once in a turn
- **Triumphal Arches** — † taking a town raises the name of a general in particular. A town that holds a wonder can be told from one that does not now, but the renown an occasion pays favours nobody in particular — a deed is not a shelf of buildings, and the draw's bias is a fact about what an empire keeps.
- **The Crusader Orders** — Taking a city presses your religion on it once, as a prophet would; whether it converts depends on the faith already there. An empire with no religion presses nothing.
- **The Flood Festival** — Burned country is laid down one tile at a time by a worker, so the faith is paid tile by tile as each one is burned.
- **Professional Soldiers** — The strength is given when the unit is bought while this card is held, and the unit keeps it for life.
- **The Chartered Company** — Once the charter is drafted, the Company Guard can be hired from late in the last age of the technology tree.
- **Mercenary Contracts** — Not built yet: a unit that leaves the game on its own after a set time is a new kind of unit, and this card needs one. † hired soldiers who serve for a set time and then leave
- **The Grain Exchange** — † the town at the far end of one of these particular roads is the gladder for it
- **The Monastery Libraries** — Held whole. One half of this asks for a house the realm no longer raises, so that half can never pay — and a card is never bent to fit the half that can. † a house of quiet study teaches as well as prays, and a library prays as well as teaches
- **Common Tools** — † the hammers are for workers and buildings, and for nothing else
- **Road Crews** — † a worker that wakes on one of your roads travels further that day
- **Road Maintenance** — † the upkeep of your roads is reduced, up to a limit each turn
- **Emergency Stores** — † the hammers are for buildings, and for nothing else
- **City Watches** — † a soldier standing inside one of your towns mends faster there

## Themes (the archetype lines)

The `line` tag — presentation only, read by no draw; the decks are the card's home.

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
