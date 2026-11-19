# The generic Orders: a candidate set of changes (2026-11-18)

**Current state:** you approved this proposal on 2026-11-18 with ten comments. Section 7 applies them, section 8 is the build list, and `docs/decks/common.md` is the sheet of the final set. Sections 0 to 6 are kept as you approved them.

**Status: a proposal. Nothing here is built, and no data changed.** The request is in `docs/flags.md`, "Generic Orders: a candidate set of changes (2026-11-18)". The user: *"they're weak at the moment and we havent givenmuch thought ot them. Aim for cards that would be generally useful for themes across all decks, please reference the card design skill we drafted."*

The method is the `card-design` skill (`.claude/skills/card-design/`). The review page for a phone is a separate file; this document is the full reasoning.

## 0. What "generic Orders" means here

So that we mean the same set:

- **A generic card** is a row of `data/decks/common.json` whose `decks` list is empty. Every seat can be dealt it, whatever its two decks.
- **A shared card** is a row of the same file that names two decks. A seat is dealt it only if it holds one of those decks. Shared cards are not part of this proposal.
- **The file holds 95 rows:** 18 generic and 77 shared (23 of the shared rows are retired).
- **Of the 18 generic rows, 13 are dealt.** Five are deferred: they have a sentence and no effect, and `orderIsDealt` keeps them out of every hand.
- **Every generic row is common, and none has a type.** A card with no type fits any chair and counts as the type of the chair it sits in (`statecraft/council.ts`).

How the draft uses them (`src/sim/statecraft/draft.ts`):

- A hand has three positions. The first two come from the seat's two decks.
- The third position follows a cycle of four drafts: generic, shared, generic, own deck (`THIRD_CADENCE`). So a generic card is the third card of every odd draft. That is one position in six.
- Only the current band is dealt (`currentBandOf`, `dealGateFor`). The bands open at drafts 0, 4, 10, 18 and 26.
- If the generic bag of the band is empty, the position is dealt from everything the seat can draw (`drawHandPositions`, rule 5). A seat with The Hospitium gets a foreign card in the third position and sees no generic position.
- A hand wider than three deals its extra cards from everything the seat can draw, so a generic card can appear there too.

What that gives a seat in one game:

| Tier | Drafts | Generic looks | Generic cards dealt today | Proposed |
|---|---|---|---|---|
| 0 | 1 to 3 | 2 (drafts 1 and 3) | 8 | 8 |
| I | 4 to 9 | 3 (drafts 5, 7, 9) | 2 | 10 |
| II | 10 to 17 | 4 (drafts 11, 13, 15, 17) | 1 | 7 |
| III | 18 to 25 | 4 (drafts 19, 21, 23, 25) | 2 | 7 |
| IV | 26 and later | 0 to 2 | 0 | 4 |

- A bot seat makes about 25 drafts in 200 turns (`docs/plans/draft-pacing-2026-10-17.md`), so a seat sees about 13 generic cards in a game.
- **How many a band should hold.** Nothing depends on a generic card, so variety matters more than finding one. I size each band at about two to three times its looks: enough that two games differ, and enough that the bag is not empty after two picks. Tier IV holds four, because half the bot seats never reach it.
- Your sheet of 2026-10-12 (`docs/decks/common.md`) sized the bands at 11, 12, 12, 12 and 10. The proposal is smaller in the late bands, because a generic card there must be worth a chair or take none.

**One file disagrees with the request, and I followed the file.** My brief said generic cards should reward the deckbuilding itself (the draft, the chairs, Doctrines). Your ruling 4 of 2026-10-20 (`docs/decks/deck-design.md`) says *"magisterial should own the government system"*, and Magisterial now has the cards that read the council. So this set stays off the council. Question 1 asks you to confirm.

## 1. Audit of the present generic Orders

### 1.1 The 18 rows in the data

| Card | Tier | Text | Effect shape | Raises and reads | Role | Floor and ceiling | Measured or seated | Verdict |
|---|---|---|---|---|---|---|---|---|
| Hearth Stores | 0 | Your capital gains +1 food. | pays, capital | Raises capital food. Reads nothing. | Glue | 1 and 1. The bar is 4 to 8. | Not in the tables. | Replace with The Home Fields (G0-3). A weaker copy of Sweet Water and The Grain Tribute. |
| Common Tools | 0 | Your capital gains +1 production toward workers and buildings. | none (deferred) | Nothing. | Glue | Never dealt. | Never dealt. | Cut. The Threshing Floor (G0-7) takes the job. |
| Watchmen | 0 | Friendly combat units gain +2 strength when defending in your territory. | combatLine | Reads nothing. | War utility | Nothing at peace. | Bots seated it for 23 samples. It paid 0.0, because a yield reading cannot see combat. | Cut from Tier 0. The Marchmen (G0-5) is the early fight; The Town Watch (G2-3) does this job when armies arrive. |
| Resting Camps | 0 | Units that take no action heal 5 more health. | unitStat | Reads nothing. | Filler | Small. | Not in the tables. | Cut, or alternate A1-5 at +10 in Tier I. |
| Local Markets | 0 | Your capital gains +2 gold. | pays, capital | Raises gold. | Glue | 2 gold, which counts as 1. | Not in the tables. | Cut. A weaker copy of Market Day. |
| The Village Scribe | 0 | Your capital gains +1 science. | pays, capital | Raises science. | Glue | 1 and 1. | Not in the tables. | Replace with The Palace School (G0-1). A weaker copy of The Scribes (+1 in every town). |
| Public Gatherings | 0 | Your capital gains +1 culture. | pays, capital | Raises culture. | Glue | 1, worth about 3 early. The best of the five. | Not in the tables. | Replace with The Palace School (G0-1). |
| Household Altars | 0 | Your capital gains +1 faith. | pays, capital | Raises faith. | Glue | 1 and 1. | Not in the tables. | Cut. Every deck has its own early faith (your ruling of 2026-10-07), and The Calling pays +3. |
| Boundary Stones | 0 | Cities with a Monument expand their borders 20% faster. | rulePercent | Raises hexes owned. | Glue | Nothing until a Monument stands. | Not in the tables. | Tune: alternate A0-2 without the Monument. |
| Public Wells | I | Cities without freshwater gain +2 food. | pays, scope | Raises food in dry towns. | Utility | 0 on a river map. 6 with three dry towns. | Not in the tables. | Replace with Cistern Works (G1-5), which takes no chair. |
| Civic Peace | I | Gain +1 empire happiness. | happiness | Raises happiness. | Utility | 1 and 1. | Not in the tables. | Replace with Common Festivals (G1-1): +1 in every town. |
| Road Crews | I | Workers gain +1 movement when starting on your road. | none (deferred) | Nothing. | Filler | Never dealt. | Never dealt. | Cut. |
| Road Maintenance | II | Road upkeep is reduced by 20%, saving at most 4 gold. | none (deferred) | Nothing. | Utility | Never dealt. At most 4 gold in age 3. | Never dealt. | Cut. The Old Foundations (G3-7) is the gold answer. |
| Emergency Stores | II | Cities of at most four population gain +1 food and +1 production toward buildings. | none (deferred) | Nothing. | Glue | Never dealt. | Never dealt. | Cut. Two effects, and too small for age 3. |
| Local Clerks | II | Gain +1 authority capacity. | authority | Raises authority. | Utility | A third of a town. | Not in the tables. | Tune to +3 (G2-1). It is the only generic card dealt in Tier II, so the slot shows it on every look. |
| Public Hospitals | III | Cities of at least eight population gain +1 happiness. | happiness, scope | Raises happiness. | Utility | About +6 in age 4. | Not in the tables. | Cut. The Grain Dole (Expansionist, Tier II) gives +4 in towns of ten. |
| Common Ledgers | III | Cities with a Market gain +2 science; cities with a Library gain +2 gold. | pays, two scopes | Reads Markets and Libraries. | Glue | About 40 in age 4, under the bar of 60 to 120. | Not in the tables. | Cut. Two effects, and it is a Commerce with Scientific pair card. The Building Trades (G3-5) takes its place. |
| City Watches | III | Your cities gain +4 defence. Garrisoned units heal 5 more. | none (deferred) | Nothing. | War utility | Never dealt. | Never dealt. | Rework to one effect: +8 defence (G3-2). |

Notes on the table:

- **Measured.** `docs/plans/card-measurements-2026-10-13.md` prints only the top 15 and the bottom 15 cards. Watchmen is the only generic card in either list. I could not read what the others paid.
- **Seated.** The measurements show bots seated Watchmen. `docs/playtest_notes.md` names no generic card. Your note of 2026-08-26 says *"need general utility orders"*.
- **Role.** All 13 dealt cards are glue or utility. There is no pay-off and no build-defining card.

### 1.2 What is wrong with the set as a whole

1. **The numbers are a quarter of the bar.** Five of the eight Tier 0 cards pay +1 or +2 in the capital. The skill's bar for a Tier 0 card is 4 to 8 a turn by turn 40. Civic Peace gives 1 happiness, and Local Clerks gives a third of a town.
2. **Most are a deck card's weaker copy.** The Village Scribe (+1 science in the capital) against The Scribes (+1 science in every town). Household Altars (+1 faith) against The Calling (+3 faith). Local Markets against Market Day. Hearth Stores against Sweet Water. Public Hospitals against The Grain Dole.
3. **Nothing reads anything.** All 13 are flat pay or a flat rule. No card reads a quantity that the decks raise, so no generic card gets better in a seat that leans one way. There is no scaler, no commission, no boon and no charter, and every card is common.
4. **Three bands are nearly empty.** Tier I deals 2 generic cards for 3 looks. Tier II deals one, so the slot shows Local Clerks on every look until the seat takes it. Tier III deals 2 for 4 looks. Tier IV deals none.
5. **They ask for a chair and cannot earn it.** A seat has 5 chairs from about turn 30 to turn 115 and holds about 12 Orders with 7 on the bench (the measurements, finding 2). A small flat generic card joins the bench.
6. **They have no type,** so they fit any chair. That is an accident of the data, and it makes Commission: The Golden Bull trivial. Question 3.

### 1.3 The sheet of 2026-10-12

`docs/decks/common.md` is a plan of 57 cards that was never built. You wrote its 23 cards for Tiers 0 and I, and the "common pass" filled Tiers II to IV in their style.

- **Your Tier 0 and I rows fix the size.** They pay at the bar (The Palace School, The Royal Household, Common Festivals).
- **Several of your rows are already cross-deck cards.** The Gilded Country and Holy Ground read what a tile makes, whichever card put it there. The Builders' Charter doubles the building cards of every deck. The Capital's Example spreads whichever buildings the seat chose. This proposal keeps them and builds the set around the same idea.
- **Four of your rows now have a twin in a deck,** because the decks were built after you wrote them: The Tool Sheds (Tinkers' Guild), Village Workshops (The Grain Tribute), The Ancient Masons (The Cornerstone) and half of The Wagon Trains (The Land Hunger).
- **Two read the council** (Oaths of Office, The First Minister), which became Magisterial's on 2026-10-20.
- **The common pass's Tiers II to IV are mostly flats on one named building** ("Cities with a Smithy gain..."). A building per town is a quantity that does not build (the skill, "Saturating quantities do not build"), and each such card is a deck card's weaker copy.

Section 3.5 lists every row of the sheet that is not in the set, with the reason.

## 2. The cross-deck quantities

This is the ground a generic set can stand on: quantities and moments that at least four decks raise or read. "Raises" means the deck's cards or its way to play make more of it. "Reads" means a live card of the deck pays by it. The card names are examples from the live data.

| Quantity or moment | Dominion | Expansionist | Commerce | Devotion | Scientific | Magisterial | Who reads it today |
|---|---|---|---|---|---|---|---|
| **The capital and its citizens** | reads late (The Tributary Kings) | raises, reads (The Grain Census) | reads (Market Day, The Nest Egg) | reads (The Royal Cult, The Creed) | raises, reads (The Round City) | reads (The Encyclopedia) | Each deck, for its own yield. No card multiplies it. |
| **Buildings finished and held** | raises (Barracks, walls) | raises (Granaries, public works) | raises by buying | raises by faith | raises (schools, empire buildings) | raises (culture buildings) | Each deck reads its own buildings. Nothing reads all of them. |
| **Happiness** | raises (Martial Law) | raises (The Grain Dole) | raises (Houses of Account) | raises (The Deaconries) | raises (the Physic Garden) | raises (The Keepers of Wonders) | Nobody. |
| **Commissions fulfilled** | 8 commissions | 3 | 6 | 5 | 3 | 7 | Nobody (The Res Gestae is retired). |
| **Improved resource tiles** | reads (The Quartermasters) | raises, reads | reads (Salt Tithes, The Emporia) | reads (Lay Offerings) | reads (The Assay, shared) | no | Four decks. |
| **What a tile makes** (gold, faith) | no | raises (Smallholdings) | raises (The Mineral Trade) | raises (Temple Estates) | no | no | Nobody reads it as such. |
| **Citizens in the empire** | raises by capture | raises, reads | reads (The Market Halls) | reads (The Deaconries, The Psalter) | reads (The Scribes' Hall) | no | Four decks. |
| **Great people gained** | reads (The Mural Crown) | raises (A Court of Engineers) | raises (A Court of Merchants) | no (prophets are units) | reads (The Roll of Scholars) | reads (The Roll of Masters) | Magisterial reads any family, by your ruling. A generic card may only supply. |
| **War and peace** | at war 32 to 45% of turns | mostly at peace | needs peace | either | mostly at peace | mostly at peace | Almost nobody (one condition exists). |
| **Authority** | raises (The Pacified Marches) | raises (The Horrea) | raises (The Market Writ) | raises (The Caliphate) | no | raises (The Nomarchs) | Expansionist (The Sovereign Writ). |
| **Units gained** | raises, reads | raises (levies) | raises by buying | raises by faith | few | few | Dominion. Left to it. |

Quantities one deck owns, which a generic card must not take: technologies (Scientific), trade routes and gold spent (Commerce), faith spent and rites (Devotion), cards drafted and seated, governments and Doctrines (Magisterial), kills and captures (Dominion), towns founded and hexes (Expansionist).

**What follows from the grid:**

- **Three anchors that every seat has and nobody multiplies:** the capital, buildings, and happiness.
- **One keyword that every deck prints and nobody reads:** the commission.
- **Two states every game has and no deck owns:** peace, and the gap in a seat's two decks.

The candidate set is built on these six things.

## 3. The candidate set

### 3.1 What a generic card is for

The skill says a deck owns what it asks the player to do. A generic card can ask only for what every seat does. So:

- **It reads a quantity from section 2.** It has a floor in any seat, and a ceiling in a seat whose decks push that quantity.
- **It answers a problem any seat can have:** unhappy towns, the authority limit, a dry site, barbarians, a neighbour's army, an empty treasury. Your note of 2026-08-26 asks for exactly this: *"need general utility orders"*. Each answer is sized to fix the problem, which the present cards are not.
- **Eight of the 36 cards take no lasting chair.** Four boons pay once on the draft. Three commissions pay a lasting reward and leave their chair. One charter unlocks a building. They add to a council, and they make the generic slot a real choice in every hand: tempo now, or a card to keep.
- **It never beats a deck card at the deck's own job.** The seated generic cards are utility answers, glue for the capital, or pay-offs that need the decks' cards to feed them.
- **It follows the simplification rules of 2026-11-10:** one effect and at most one condition, in one line; a Tier 0 card is a plain yield on a thing the player has or does; a common or uncommon has no drawback; no card reads how long a thing has stood, what a rival knows, or a treasury threshold; no card waits on a world event; no card raises units on a timer. No card adds a button, a menu or a target to pick.

The set holds 36 cards: 13 are your rows of 2026-10-12, 8 are rows the common pass wrote, 2 are older cards tuned, and 13 are new.

### 3.2 The set in one table

| Id | Card | Tier | Rarity | Type | Text | Where it comes from |
|---|---|---|---|---|---|---|
| G0-1 | **The Palace School** | 0 | common | Civic | Your capital gains +2 science and +2 culture. | Your row of 2026-10-12, unchanged. |
| G0-2 | **The Royal Household** | 0 | common | Civic | Your capital gains +3 culture and +2 happiness. | Your row of 2026-10-12, unchanged. |
| G0-3 | **The Home Fields** | 0 | common | Economic | Resource tiles in your capital gain +1 food. | Your row of 2026-10-12, unchanged. |
| G0-4 | **First Fruits Feasts** | 0 | common | Civic | Improving a resource tile grants 5 culture. | Your row of 2026-10-12. Reworded to the live style; the effect is yours. |
| G0-5 | **The Marchmen** | 0 | common | Military | Your units gain +3 strength against barbarians. | Your row of 2026-10-12, unchanged. |
| G0-6 | **Far Runners** | 0 | common | Military | All your units gain +1 sight. | Your row of 2026-10-12, cut to one effect. The ruin clause is dropped (one effect per card; your note of 2026-08-27 asked for less early culture from discoveries). |
| G0-7 | **The Threshing Floor** | 0 | common | Economic | Your capital gains +1 production for every two citizens. | New. |
| G0-8 | **Light Kit** | 0 | rare | Military | All your units gain +1 movement and +1 sight, and -2 combat strength. | Your row of 2026-10-12, unchanged. |
| G1-1 | **Common Festivals** | I | common | Civic | Every town gains +1 happiness. | Your row of 2026-10-12. Wording only. |
| G1-2 | **The Capital's Example** | I | common | Economic | Your other towns build buildings your capital already has 25% faster. | Your row of 2026-10-12, with your reading. 15% becomes 25% under your 1.5 rule for Tiers I to III. |
| G1-3 | **The Hall of Fame** | I | common | Civic | +30% renown in your capital. | Your row of 2026-10-12, unchanged. |
| G1-4 | **The Gilded Country** | I | common | Economic | Every tile that makes at least 1 gold gains 1 more. | Your row of 2026-10-12, unchanged. |
| G1-5 | **Cistern Works** | I | common | Economic (Charter) | Charter. Unlocks the Cistern: +2 food, and its town counts as standing on fresh water. | Your row of 2026-10-12. The Cistern is already a building row in the data, with no live card that opens it. |
| G1-6 | **The Brick Kilns** | I | uncommon | Economic (Scaler) | Scaler. Gains +1 production and +1 gold each time you finish a building, at most +20. | New. |
| G1-7 | **The Ever-Normal Granary** | I | uncommon | Civic | Your capital gains +5 of whichever you make least: science, culture or production. | New. |
| G1-8 | **Commission: The Land Register** | I | uncommon | Wildcard (Commission) | Goal: have 30 citizens. Reward: every town gains +2 food and +2 production. | New. |
| G1-9 | **The Liturgies** | I | common | Economic (Boon) | Boon. On draft: every town gains production equal to ten times its citizens. | New. The name is the public services that rich citizens of a Greek city paid for. |
| G1-10 | **The Builders' Charter** | I | rare | Wildcard | Orders that add yields to buildings pay double. | Your row of 2026-10-12, unchanged. It needs a new name: Charter is now a keyword for a card that takes no chair. I suggest The Builders' Lodge. |
| G2-1 | **Local Clerks** | II | common | Civic | Gain +3 authority. | The live card, tuned: +1 becomes +3. |
| G2-2 | **The Public Peace** | II | common | Civic | While you are at peace, every town gains +2 happiness. | New. The name is the sworn peace of a realm (the Landfriede, the Peace of God). |
| G2-3 | **The Town Watch** | II | common | Military | Your units gain +5 strength when defending in your territory. | New. It does Watchmen's job in the age when armies arrive. |
| G2-4 | **The Learned Embassy** | II | common | Civic (Boon) | Boon. On draft: gain science equal to eight turns of your science. | New. The name is the missions that courts sent abroad to bring back books and masters. |
| G2-5 | **The Royal Annals** | II | uncommon | Economic | +4% production and gold for each commission you have fulfilled this game, at most +28%. | New here. It is the shape of Dominion's retired The Res Gestae, which was cut because one deck had too few commissions. |
| G2-6 | **Commission: The Building Programme** | II | uncommon | Wildcard (Commission) | Goal: finish 12 buildings. Reward: every town gains +10% production. | New. |
| G2-7 | **The Summer Palace** | II | rare | Wildcard | Cards that pay your capital also pay your largest other town. | The 2026-10-12 sheet's Tier II rare (written by the common pass, not by you). Kept as written. |
| G3-1 | **The Good Years** | III | rare | Civic | Your bonus from spare happiness is doubled. | The 2026-10-12 sheet's Tier III rare, reworked. It read every town's mood; the game has one happiness figure for the empire, so it reads that. |
| G3-2 | **City Watches** | III | common | Military | Your towns gain +8 defence. | The live row (deferred, never dealt), cut to one effect. |
| G3-3 | **Commission: The Master Plan** | III | uncommon | Wildcard (Commission) | Goal: hold three towns of 12 or more citizens. Reward: +20% production toward the Magnum Opus. | New. |
| G3-4 | **The General Summons** | III | uncommon | Military (Boon) | Boon. On draft: gain three of the best melee units you can build, in your capital. They cost no upkeep. | New. |
| G3-5 | **The Building Trades** | III | uncommon | Economic | Every town gains +1 production for each building in it, at most +15. | The 2026-10-12 sheet's Tier IV rare, The Town Masons, moved to Tier III and renamed (four live cards already have Masons in the name). |
| G3-6 | **The Old Patterns** | III | uncommon | Economic | Towns build buildings of earlier ages 40% faster. | The 2026-10-12 sheet's Tier III rare, as a plain uncommon. |
| G3-7 | **The Old Foundations** | III | common | Economic | Buildings of the first two ages cost no gold upkeep. | The 2026-10-12 sheet's Tier II rare, as a common in Tier III. |
| G4-1 | **The Grand Design** | IV | uncommon | Economic | The town raising your Magnum Opus gains +1 production for every two citizens in your empire. | The 2026-10-12 sheet's row, unchanged. |
| G4-2 | **The Last Walls** | IV | common | Military | The town raising your Magnum Opus gains +15 defence. | The 2026-10-12 sheet's row, cut to one effect and aimed at the Opus town. |
| G4-3 | **The Great Raising** | IV | rare | Wildcard (Boon) | Boon. On draft: every town finishes what it is building. Not wonders. | New. |
| G4-4 | **The Settled Realm** | IV | common | Civic | Every town gains +2 happiness. | The 2026-10-12 sheet's row. Wording only. |

### 3.3 Each card

The fields are the ones the card-design skill asks for. "Decks" names the decks whose themes the card serves and what it does in a seat with none of them.

#### Tier 0

Early age 1. Drafts 1 to 3. A seat is shown 2 generic cards.

**G0-1 The Palace School**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Civic |
| Text | Your capital gains +2 science and +2 culture. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | The Village Scribe and Public Gatherings (two cards become one). |
| Age goal | Reach the first government (culture buys drafts) and keep research moving. |
| Decks | Scientific (a great capital: The Round City later reads it), Magisterial (culture is its engine), Commerce (its capital cards: Market Day, The Nest Egg). In any other seat it is a plain start on the two essentials that cannot be bought. |
| Role | Glue. Floor +4 in every seat. Ceiling low: only a capital percentage or The Summer Palace lifts it. |
| Attention | None. Nothing to track, nothing left on the map. |
| Power | +4 on the face. Early culture is worth about three times its face, so it reads as about 8. The Tier 0 bar is 4 to 8 by turn 40. By the end of Tier I it is 4 of about 55 science and culture (7%), and a Tier I card pushes it out. |
| Synergy | Raises: science and culture in the capital. Reads: nothing. It is a base for capital percentages (The Round City) and for G2-7 The Summer Palace. |
| Displaces | Nothing early (three chairs). It leaves its chair in Tier I. |
| Condition or drawback | None. |
| Shape | Existing: pays, where city, scope capital. Data only. |

**G0-2 The Royal Household**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Civic |
| Text | Your capital gains +3 culture and +2 happiness. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Joins the band. It takes the early happiness job that Civic Peace does badly in Tier I. |
| Age goal | Reach the first government; keep the first towns happy while they grow. |
| Decks | Expansionist (room to grow before its own happiness cards), Dominion (a happy start for a seat that does not develop at home), Magisterial (culture). In any other seat it is the strongest plain culture card in Tier 0. |
| Role | Glue with a high floor: about 9 culture-equivalent plus two points of happiness. Ceiling: the two points can lift a seat to the first spare-happiness step. |
| Attention | None. |
| Power | 3 culture reads as about 9 early, at the top of the Tier 0 headline range (10 to 15) once the happiness counts. It is the strongest card in this band. Your notes of 2026-09-03 say there is too much happiness, so if it is taken every time, lower it to +2 culture. |
| Synergy | Raises: culture, happiness. Reads: nothing. Its happiness feeds G3-1 The Good Years much later, if it is still seated. |
| Displaces | Nothing early. It can hold a chair into Tier I because of the happiness. |
| Condition or drawback | None. Note: it and G0-1 both pay capital culture. A seat that is shown both may take both; that is a tall capital opening and I think it is fine. |
| Shape | Existing: pays (capital) and happiness. Data only. |

**G0-3 The Home Fields**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Economic |
| Text | Resource tiles in your capital gain +1 food. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Hearth Stores. |
| Age goal | Grow the capital so it can build settlers and still work its land. |
| Decks | Expansionist (growth), Commerce (Market Day pays gold for each capital citizen), Devotion (The Royal Cult pays faith for each capital citizen; Lay Offerings pays on the same pastures, camps and plantations), Dominion (The Horse Herds, on the same pastures). In a seat with none of them it is +2 to +4 food. |
| Role | Glue. Floor: 2 food on a poor site. Ceiling: 4 food, and every card that counts capital citizens. |
| Attention | It rewards a choice the player already makes: which resource tiles the capital works. |
| Power | A capital works 2 to 4 resource tiles by turn 40, so +2 to +4 food against a seat total of 17. Low end of the bar (4 to 8), with a map-dependent floor. |
| Synergy | Raises: capital citizens. Read by: Market Day, The Royal Cult, The Round City, G0-7 The Threshing Floor. Four readers at or before Tier II. |
| Displaces | Nothing early. |
| Condition or drawback | None. |
| Shape | Existing, to check: pays, where hex, on a resource tile, scope capital (The Provincial Fair joins a hex test and a city scope the same way). |

**G0-4 First Fruits Feasts**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Civic |
| Text | Improving a resource tile grants 5 culture. |
| Where it comes from | Your row of 2026-10-12. Reworded to the live style; the effect is yours. |
| Replaces | Household Altars (its place in the band; every deck has its own early faith by your ruling of 2026-10-07). |
| Age goal | Reach the first government. Claim and improve the land around the first towns. |
| Decks | Expansionist (it improves the most land), Commerce (luxuries: Salt Tithes, The Emporia), Dominion (pastures and strategic resources: The Horse Herds, The Quartermasters), Devotion (Lay Offerings). A seat with none of them still improves 4 to 8 resource tiles in the band. |
| Role | Glue that pays on a moment. Floor: 20 culture over the band. Ceiling: 40 or more for a seat that improves quickly. |
| Attention | It rewards what a worker already does. The payout arrives as a moment the player sees. |
| Power | 4 to 8 resource tiles by turn 40 gives 20 to 40 culture. The first drafts cost 12, 18, 26 and 38, so it buys about one early draft. One-off grants only register when they are large for their time; 5 culture at 3 culture a turn is. |
| Synergy | Raises: culture, on the moment an improvement is built. Reads: improved resource tiles, which four decks raise. |
| Displaces | Nothing early. It is spent by Tier I and leaves. |
| Condition or drawback | None. |
| Shape | Probably existing: windfallRider on improvementBuilt. It may need the resource-tile test on that rider. |

**G0-5 The Marchmen**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Military |
| Text | Your units gain +3 strength against barbarians. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Watchmen (bots seated it for 23 samples and it paid nothing they could measure). |
| Age goal | Survive the barbarians and clear the camps near the first towns. |
| Decks | Dominion (camps feed The Outriders, The Pacified Marches and Clear the Frontier), Expansionist (the frontier: Outposts, The Barbarian Frontier), Commerce (safe caravans). A seat with none of them still fights barbarians in age 1. |
| Role | A utility answer. Floor: it saves the first warriors. Ceiling: more camps cleared, sooner. |
| Attention | None. It changes fights the player already has. |
| Power | +3 on a Warrior of 15 to 20 strength is 15 to 20%. The Tier 0 bar for a combat line is +2 to +3, and this one has a condition, so +3 is right. |
| Synergy | Raises: camps cleared and barbarian kills. Read by: The Outriders, The Captured Arms, The Bards' Praise, The Pacified Marches, Commission: Clear the Frontier. |
| Displaces | Nothing early. It leaves once the camps are gone. |
| Condition or drawback | Only against barbarians. Blooded Spears (Dominion) gives +2 against everyone, so this is not its copy. |
| Shape | Existing: combatLine with the vsBarbarians condition. Data only. |

**G0-6 Far Runners**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Military |
| Text | All your units gain +1 sight. |
| Where it comes from | Your row of 2026-10-12, cut to one effect. The ruin clause is dropped (one effect per card; your note of 2026-08-27 asked for less early culture from discoveries). |
| Replaces | Resting Camps. |
| Age goal | Explore: find ruins, city sites, camps and neighbours. |
| Decks | Commerce (Travellers' Letters pays for each empire met), Expansionist (choosing sites), Dominion (finding camps). In any seat it shows more of the map sooner. |
| Role | Filler: low attention, low impact. It is here so that Tier 0 has a second card that is not a yield. |
| Attention | None. |
| Power | No yield. Its worth is ruins and neighbours found a few turns sooner. Honest reading: the weakest card in the band, and that is acceptable for a cheap common. |
| Synergy | Raises: empires met, discoveries claimed. Read by: Travellers' Letters, The Exchange (later). |
| Displaces | Nothing. It is rarely worth a chair after Tier 0. |
| Condition or drawback | None. |
| Shape | Existing: unitStat, sight +1. Data only. |

**G0-7 The Threshing Floor**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, common, Economic |
| Text | Your capital gains +1 production for every two citizens. |
| Where it comes from | New. |
| Replaces | Local Markets, and Common Tools (deferred, never dealt). |
| Age goal | Build settlers, workers and the first buildings. |
| Decks | Expansionist (growth becomes production), Scientific (a great capital), Commerce and Devotion (their gap is production; Market Day and The Royal Cult count the same citizens). In a seat with none of them it is +3 production by turn 40. |
| Role | Glue with a small ceiling. Floor +2. Ceiling +6 in a capital of twelve. |
| Attention | None. It pays for growing the capital, which the player already wants. |
| Power | A capital of 6 to 8 citizens at turn 40 gives +3 or +4 production against a seat total of 11. In the bar (4 to 8) at its low end. At the end of Tier I (10 to 12 citizens) it gives +5 or +6 and is pushed out. |
| Synergy | Reads: capital citizens. Raisers at or before its band: The Home Fields (G0-3), Sweet Water, Smallholdings, The Patient Harvest, The Grain Tribute. Market Day and The Royal Cult read the same number. |
| Displaces | Nothing early. |
| Condition or drawback | None. |
| Shape | Existing: pays, scope capital, basis count, count capitalPopulation, per 2. Data only. |

**G0-8 Light Kit**

| Field | |
|---|---|
| Tier, rarity, type | Tier 0, rare, Military |
| Text | All your units gain +1 movement and +1 sight, and -2 combat strength. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Joins the band as its one rare. |
| Age goal | Explore and claim land faster than the neighbours. |
| Decks | Expansionist (settlers and workers arrive sooner), Commerce (scouts and caravans), Devotion (prophets and apostles later). A Dominion seat should pass it: the -2 costs it fights. |
| Role | Build-defining, with a drawback. Floor: negative for a seat that fights. Ceiling: a land grab several turns ahead. |
| Attention | Movement is used every turn, so the attention is the fun part. |
| Power | +1 movement is half again for most age 1 units. -2 strength is 10 to 13% of a Warrior. A real trade. |
| Synergy | Raises: towns founded sooner, hexes claimed, empires met. |
| Displaces | A combat card. It is the opposite choice to Blooded Spears. |
| Condition or drawback | The drawback: -2 strength on every unit. |
| Shape | Existing, to check: two unitStat lines and a combatLine of -2 (a negative strength line may need allowing). |

#### Tier I

Late age 1 and most of age 2. Drafts 4 to 9. A seat is shown 3.

**G1-1 Common Festivals**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Civic |
| Text | Every town gains +1 happiness. |
| Where it comes from | Your row of 2026-10-12. Wording only. |
| Replaces | Civic Peace (+1 happiness for the whole empire). |
| Age goal | Authority and happiness start to bind at five or six towns. |
| Decks | Expansionist (wide), Dominion (captured towns), Devotion (large devout towns), Commerce. A Scientific seat with three towns gets little and should pass it. |
| Role | A utility answer. Floor +3 happiness. Ceiling +8 or more in a wide empire. |
| Attention | None. |
| Power | Five towns give +5 happiness: one step of the spare-happiness bonus, or room for five more citizens at about 4 yield each. That is about 20 a turn against a bar of 15 to 25. Civic Peace gave 1. |
| Synergy | Raises: happiness. Read by: G3-1 The Good Years. Every deck has happiness cards beside it. |
| Displaces | A flat yield card, in a seat that is close to unhappy. |
| Condition or drawback | None. It scales with towns, so it is not a tall seat's card. |
| Shape | Existing: happiness, per city. Data only. |

**G1-2 The Capital's Example**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Economic |
| Text | Your other towns build buildings your capital already has 25% faster. |
| Where it comes from | Your row of 2026-10-12, with your reading. 15% becomes 25% under your 1.5 rule for Tiers I to III. |
| Replaces | Joins the band. |
| Age goal | Commit to a plan and carry it from the capital to the new towns. |
| Decks | Expansionist (many young towns), Dominion (captured towns that lost buildings), Commerce and Devotion (buy a building once in the capital, then build it elsewhere), Scientific (the capital gets each building first). A seat with one town gets nothing. |
| Role | Glue for wide seats. Floor: low with two or three towns. Ceiling: every new town catches up a quarter faster. |
| Attention | It rewards an order of building the player can see: capital first. |
| Power | Four other towns at 10 production, about 60% of it on such buildings, 25% of that: about 6 production a turn, plus the tempo. Below the bar on paper (15 to 25); The Carters' Guild and Learned Foundations pay the same 25% with narrower conditions, so the rate is the going rate. |
| Synergy | Raises: buildings finished. Read by: G1-6 The Brick Kilns, G2-6 The Building Programme, G3-5 The Building Trades, The Apprentices, The Dedications, and every card that pays on a building. |
| Displaces | A flat production card. |
| Condition or drawback | Only in towns other than the capital, and only for buildings the capital has. |
| Shape | New shape (yours): a production line narrowed to buildings present in the capital. |

**G1-3 The Hall of Fame**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Civic |
| Text | +30% renown in your capital. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Joins the band. |
| Age goal | The first great person. |
| Decks | All six: each deck owns a great-person family. It serves Magisterial (The Roll of Masters, The Symposium), Scientific (The Roll of Scholars), Dominion (The Mural Crown) and Commerce and Expansionist (their Courts) most. |
| Role | Supply for a quantity that five decks read. Floor: great people arrive a little sooner. Ceiling: every card that pays on a great person gained. |
| Attention | None. |
| Power | I could not measure how much of a seat's renown comes from its capital. If it is about half, this is +15% renown: one more great person in about seven. Size to check. |
| Synergy | Raises: great people gained. Read by: The Roll of Masters, The Roll of Scholars, The Mural Crown, The Symposium, The Overseers of Works, The Honoured Dead. Reading great people of any family stays Magisterial's; this card only supplies them. |
| Displaces | A small flat card. |
| Condition or drawback | Capital only. |
| Shape | Existing: cityRenownPercent, scope capital. Data only. |

**G1-4 The Gilded Country**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Economic |
| Text | Every tile that makes at least 1 gold gains 1 more. |
| Where it comes from | Your row of 2026-10-12, unchanged. |
| Replaces | Joins the band. |
| Age goal | Fund the plan: purchases, upkeep, roads. |
| Decks | Commerce (The Mineral Trade turns every mine into a gold tile), Expansionist (Smallholdings does it for farms and pastures; The Wild Orchards), the shared Market Gardens (road hexes) and The Country Fair (luxuries), Devotion (The Saints' Fields). In a seat with none, it pays on the map's own gold tiles. |
| Role | Pay-off with a floor. Floor: 5 to 8 gold. Ceiling: 25 or more when a deck card has made every farm or mine a gold tile. |
| Attention | It rewards tiles the player already chose to work. |
| Power | 10 to 25 worked gold tiles in Tier I give +10 to +25 gold against a seat total of 19. Gold counts half, so 5 to 12: a little under the bar alone, at it with one feeder. |
| Synergy | Reads: tiles that make gold. Raisers at or before Tier I: The Mineral Trade, Smallholdings, The Wild Orchards, Market Gardens, The Country Fair, The Provincial Fair. This is the flat-then-more layering the skill asks for. |
| Displaces | A flat gold card. |
| Condition or drawback | None. |
| Shape | New shape (yours): a hex line that tests the tile's own yield. Reading to confirm: it counts gold from other cards, and never its own +1. |

**G1-5 Cistern Works**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Economic, Charter |
| Text | Charter. Unlocks the Cistern: +2 food, and its town counts as standing on fresh water. |
| Where it comes from | Your row of 2026-10-12. The Cistern is already a building row in the data, with no live card that opens it. |
| Replaces | Public Wells. |
| Age goal | Make a dry site good; grow. |
| Decks | Expansionist (Sweet Water and The Watercourses read fresh water; The Aediles gains on each public work), Scientific (The Curators of Works: public works give +1 science and +1 happiness), Devotion (your text gives it +2 faith). A seat whose towns all stand on rivers passes it. |
| Role | A utility answer that takes no chair. Floor: +2 food in each dry town. Ceiling: farms that can now be irrigated. |
| Attention | One more building to choose in a dry town. It shows on the city screen. |
| Power | +2 food in each town that builds it, and farms beside it may count as watered. Three dry towns: +6 food and their irrigation, for no chair. |
| Synergy | Raises: public works, fresh-water towns. Read by: The Aediles, The Curators of Works, Sweet Water, The Watercourses. |
| Displaces | Nothing: a charter takes no chair. Its cost is the draft. |
| Condition or drawback | Only useful to a seat with dry towns. |
| Shape | Existing: a charter that unlocks a building. The data row gives +2 food, fresh water and +1 food on worked desert. Your text adds +2 faith and water for the tiles beside the town; the second is new. |

**G1-6 The Brick Kilns**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, uncommon, Economic, Scaler |
| Text | Scaler. Gains +1 production and +1 gold each time you finish a building, at most +20. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | Commit: whatever the plan is, it is made of buildings. |
| Decks | Commerce (it buys buildings: Civic Receipts and The Strongbox fire on the same purchase), Devotion (faith buys them: The Gifts of the Faithful, The Lay Brothers), Scientific (The Apprentices, The Dedications), Magisterial (Master Masons), Expansionist (many towns, public works), Dominion (Barracks and walls for The General Staff and Stockpiles). A seat with none of these cards still finishes buildings. |
| Role | Pay-off with a real floor: it grows in every seat. Ceiling: +20 and +20 by the middle of Tier II in a seat that buys buildings. |
| Attention | The card face shows its value, as every scaler does. It rewards something the player already does. |
| Power | Five towns finishing a building every eight turns add about 0.6 a turn. Seated at turn 40 it is about +12 and +12 at turn 72 (18 with gold at half), in the Tier I bar (15 to 25). It reaches +20 and +20 around turn 100 and then fades against the Tier III bar, which is the turnover the skill wants. |
| Synergy | Reads: buildings finished, a moment every deck makes and three decks speed up. Raisers at or before its band: The Capital's Example (G1-2), Learned Foundations, The Gifts of the Faithful, The Votive Gifts, Civic Receipts' purchases, Master Masons, G1-9 The Liturgies. |
| Displaces | A flat production card. |
| Condition or drawback | The cap of +20. |
| Shape | Existing shape, one new counter: pays by a tally, as The Strongbox does. The tally of buildings finished does not exist yet (only bought with gold, public works and wonders are counted). Reading: a bought building counts. |

**G1-7 The Ever-Normal Granary**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, uncommon, Civic |
| Text | Your capital gains +5 of whichever you make least: science, culture or production. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | Cover the gap in the seat's two decks while it commits to its plan. |
| Decks | Expansionist (its gap is science and culture), Commerce and Devotion (their gap is production), Dominion (it does not develop at home). A seat with no gap is paid in its smallest essential, which is usually culture. |
| Role | Glue that aims itself. Floor +5 of something the seat needs. Ceiling: the same +5, so it never beats a deck card at the deck's own job. |
| Attention | The card face says which of the three it pays now. It changes by itself; the player picks nothing. |
| Power | +5 in age 2. If it lands on culture (25 a turn) it is +20% culture and reads as about 15: a regular Tier I card (15 to 25). On production (48) it is small. It pays most where the seat is weakest. |
| Synergy | Reads: the three essentials. It is the gap rule of deck-design.md made into a card. It moves when another card fixes the gap. |
| Displaces | A flat card for the essential the seat lacks. |
| Condition or drawback | It pays only the smallest of the three. |
| Shape | New shape: a pays line whose yield is the least of the seat's science, culture and production per turn. |

**G1-8 Commission: The Land Register**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, uncommon, Wildcard, Commission |
| Text | Goal: have 30 citizens. Reward: every town gains +2 food and +2 production. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | Commit and grow: a target every plan reaches in its own way. |
| Decks | Expansionist (growth reaches it first), Dominion (captured citizens count), Scientific (a few large towns), Devotion and Commerce (large devout or trading towns). Every seat can meet it. |
| Role | Pay-off that leaves its chair. Floor: nothing until the goal. Ceiling: +4 in every town for the rest of the game, with no chair after that. |
| Attention | The commission rail shows the count. The goal is the player's own growth, not a chore. |
| Power | Tier I opens near turn 32 with 12 to 18 citizens, and 30 comes near turn 55 to 70, so it holds a chair for about 25 turns and pays nothing. Then six towns pay +24 a turn, at the top of the bar (15 to 25), chairless. Break the Sod (Expansionist) pays less for an easier goal; lower this to +1 and +1 if it is taken every time. |
| Synergy | Reads: citizens. Raises: commissions fulfilled, read by G2-5 The Royal Annals. Raisers of citizens at or before its band: about twenty live cards in the six decks. |
| Displaces | For 25 turns it takes the weakest seated card's chair. Then it gives the chair back. |
| Condition or drawback | The chair it holds while it pays nothing. It is a Wildcard card, so it needs a Wildcard chair, and the tier 4 and tier 10 governments have one. |
| Shape | Existing shape, one new figure: a commission that reads a figure reached. Population is not in the list of figures yet. |

**G1-9 The Liturgies**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, common, Economic, Boon |
| Text | Boon. On draft: every town gains production equal to ten times its citizens. |
| Where it comes from | New. The name is the public services that rich citizens of a Greek city paid for. |
| Replaces | Joins the band. |
| Age goal | Tempo for whatever the plan is: units, settlers, a wonder, a temple. |
| Decks | All six. Dominion (units now), Magisterial (a wonder; and a card held unseated counts for The Encyclopedia and The Roll of the Senate), Scientific (buildings), Expansionist (settlers; large towns get more), Commerce and Devotion (their gap is production). |
| Role | Glue that takes no chair. Floor: 150 production. Ceiling: 400 in a seat with large towns. |
| Attention | One moment. The best play is to draft it when the towns are building something worth having, which is a small real choice. |
| Power | Five towns of five citizens gain 250 production. A one-off lump registers at 200 to 400 in Tier I. It is about five turns of production in every town. |
| Synergy | Reads: citizens in each town. Raises: buildings and units finished sooner (The Brick Kilns, The Gathering Host), and Orders held. |
| Displaces | Nothing. The player gives up a seated card from this hand for tempo now. |
| Condition or drawback | Paid once. |
| Shape | Small extension: an on-draft grant paid to every town from its population. The windfall grant already has both parts (The Journeymen); the on-draft grant has only a capital target. |

**G1-10 The Builders' Charter**

| Field | |
|---|---|
| Tier, rarity, type | Tier I, rare, Wildcard |
| Text | Orders that add yields to buildings pay double. |
| Where it comes from | Your row of 2026-10-12, unchanged. It needs a new name: Charter is now a keyword for a card that takes no chair. I suggest The Builders' Lodge. |
| Replaces | Joins the band as its rare. |
| Age goal | Commit: make the buildings the seat chose worth twice as much. |
| Decks | Scientific (The Almanac, The Royal Estates, The Common Tables, The Sky Watchers), Devotion (First Rites, The Temple Storehouses, The Tithe Barns), Commerce (Commercial Education, The Grain Banks, The Market Halls), Magisterial (Civic Granaries, The Temple of the Muses), Dominion (The General Staff). Thin in Dominion with Expansionist: one or two such cards. |
| Role | Build-defining. Floor: nothing with no such card seated. Ceiling: two or three seated cards doubled. |
| Attention | It changes which cards the player seats and which buildings every town gets. |
| Power | Doubling two cards worth about 15 each is +30; three is +45. The Tier I headline is 40 to 50. |
| Synergy | Reads: card lines paid because a building stands in the town. Raisers at or before Tier I: 3 to 6 in most pairs, 1 or 2 in Dominion with Expansionist. Supply and widen cards come before it, as the skill asks. |
| Displaces | The weakest card, once two building cards are seated. |
| Condition or drawback | It needs building cards seated. It doubles card lines, never a building's own yields (that is The Bourse's job for gold buildings). |
| Shape | New shape (yours): the card-line doubler narrowed to lines that a building pays. Reading to confirm: a line counts when its condition is a named building or a building category in the town. |

#### Tier II

Late age 2 and most of age 3. Drafts 10 to 17. A seat is shown 4.

**G2-1 Local Clerks**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, common, Civic |
| Text | Gain +3 authority. |
| Where it comes from | The live card, tuned: +1 becomes +3. |
| Replaces | Itself. |
| Age goal | The tall-or-wide step: authority is one of the two limits of age 3. |
| Decks | Expansionist and Dominion (one more town), Devotion (wide devout empires), Commerce (posts and towns). A Scientific seat with few towns passes it. |
| Role | A utility answer. Floor: nothing for a seat under its limit. Ceiling: one more town. |
| Attention | None. |
| Power | A founded town costs 3 authority, so this is one town. A town is worth 40 to 100 yield a turn in age 3. At +1 it bought a third of a town. |
| Synergy | Raises: towns held. Read by: The Book of Settlements, Spear-won Land, The Quitrents, and every per-town card. |
| Displaces | A yield card, when the seat is at its limit. |
| Condition or drawback | Worth nothing to a seat with spare authority. Your note of 2026-09-03 says authority is too plentiful, so +2 is the fallback. |
| Shape | Existing: authority. A number change. |

**G2-2 The Public Peace**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, common, Civic |
| Text | While you are at peace, every town gains +2 happiness. |
| Where it comes from | New. The name is the sworn peace of a realm (the Landfriede, the Peace of God). |
| Replaces | Joins the band. |
| Age goal | Grow into it: happiness is the other limit of age 3. |
| Decks | Expansionist, Scientific, Magisterial and Commerce at peace (Commerce needs partners at peace). Dominion between wars: it is the deck's reason to make peace. Devotion (large devout towns). |
| Role | A utility answer with a condition. Floor: nothing at war. Ceiling: +16 happiness in eight towns. |
| Attention | It makes war and peace a choice with a price the player can see. |
| Power | Eight towns at peace gain +16 happiness: both steps of the spare-happiness bonus (about 38 a turn in age 3) and room for 16 citizens. A regular to strong Tier II card (35 to 60) at peace, and nothing at war. Dominion seats were at war on 45% of age 3 turns. |
| Synergy | Raises: happiness. Read by: G3-1 The Good Years. It pairs with every happiness card in the six decks. |
| Displaces | A flat card, in a seat that expects peace. |
| Condition or drawback | At peace only. |
| Shape | Existing: conditionRule (atPeace) over a happiness line per city. Data only. |

**G2-3 The Town Watch**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, common, Military |
| Text | Your units gain +5 strength when defending in your territory. |
| Where it comes from | New. It does Watchmen's job in the age when armies arrive. |
| Replaces | Joins the band. |
| Age goal | Hold what you have while a neighbour makes its first conquest. |
| Decks | Expansionist (its militia and levied units defend at home), Scientific (few units, each one matters), Commerce, Magisterial and Devotion (seats that would rather not build an army). Dominion has better. |
| Role | A utility answer. Floor: nothing at peace. Ceiling: a siege that fails. |
| Attention | None. It can wait on the bench until a war comes. |
| Power | +5 on units of 42 to 50 strength is 10 to 12%: the regular Tier II combat line. A war card is measured in wars: a town kept is 40 to 80 yield a turn. |
| Synergy | Reads: nothing. It protects what every other card pays on. |
| Displaces | A yield card, for the length of a war. |
| Condition or drawback | Defending, on your own land. |
| Shape | Existing: combatLine, side defend, when ownTerritory (Watchmen's row at +5). Data only. |

**G2-4 The Learned Embassy**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, common, Civic, Boon |
| Text | Boon. On draft: gain science equal to eight turns of your science. |
| Where it comes from | New. The name is the missions that courts sent abroad to bring back books and masters. |
| Replaces | Joins the band. |
| Age goal | Reach the technology the plan is waiting for: Courthouses, Aqueducts, the next unit. |
| Decks | Dominion, Commerce, Devotion and Expansionist (science cannot be bought or taken, and these four lack it). Scientific (a technology sooner fires The Astronomical Diaries and The Journeymen). Magisterial (a card held). |
| Role | Glue that takes no chair. Floor: about 500 science. Ceiling: about 900. |
| Attention | One moment. |
| Power | At 106 science a turn in age 3 it is about 850. A lump registers at 500 to 900 in Tier II. It scales with the seat, so it is never out of date. |
| Synergy | Raises: technologies completed. Read by: The Astronomical Diaries, The Royal Workshops, The Scholars' Fame, The Journeymen. |
| Displaces | Nothing. The player gives up a seated card from this hand. |
| Condition or drawback | Paid once. |
| Shape | Small extension: an on-draft grant sized by a per-turn rate. Commission rewards and windfall grants already do this; the on-draft grant takes a fixed amount today. |

**G2-5 The Royal Annals**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, uncommon, Economic |
| Text | +4% production and gold for each commission you have fulfilled this game, at most +28%. |
| Where it comes from | New here. It is the shape of Dominion's retired The Res Gestae, which was cut because one deck had too few commissions. |
| Replaces | Joins the band. |
| Age goal | Turn the goals already met into the economy for the big step. |
| Decks | Every deck has commissions: Dominion 8, Magisterial 7, Commerce 6, Devotion 5, Expansionist 3, Scientific 3. The generic set adds three more. |
| Role | Pay-off. Floor: nothing before the first commission. Ceiling: +16 to +28% in a seat that drafts commissions. |
| Attention | It makes each commission in a hand worth a second look. The count is shown. |
| Power | Two commissions: +8% of production and gold (154 in age 3) is 12. Four: 25 in age 3 and about 120 in age 4. It starts under the Tier II bar and passes it, as a this-game counter should. |
| Synergy | Reads: commissions fulfilled. Raisers at or before Tier II in a two-deck pool: 3 (Expansionist with Scientific, counting The Land Register) to 9 (Dominion with Magisterial). It is the generic set's one this-game counter. |
| Displaces | A flat Tier I card. |
| Condition or drawback | The cap of +28%. It needs commissions drafted and met. |
| Shape | Existing: pays, where empire, by the count of commissions met, as a percentage (the retired row's own effect). Data only. |

**G2-6 Commission: The Building Programme**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, uncommon, Wildcard, Commission |
| Text | Goal: finish 12 buildings. Reward: every town gains +10% production. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | The tall-or-wide step is made of Courthouses, Aqueducts, Forums and Workshops. |
| Decks | Commerce and Devotion (they buy buildings, so they finish it fastest), Expansionist (many towns), Scientific (institutions), Magisterial (culture buildings), Dominion (it rebuilds captured towns). |
| Role | Pay-off that leaves its chair. Floor: nothing until the goal. Ceiling: +10% production for the rest of the game, with no chair. |
| Attention | The rail shows the count. The goal is what the seat builds anyway. |
| Power | Eight towns finish 12 buildings in about 15 turns in age 3. The reward is 11 production then and about 48 in age 4, chairless. It costs a chair for 15 turns (about 600 yield) and returns about 2,500 over the rest of the game. A blanket percentage, so watch it: at +15% it would be an automatic pick. |
| Synergy | Reads: buildings finished. Raises: commissions fulfilled (The Royal Annals). Shares its counter with The Brick Kilns. |
| Displaces | The weakest seated card, for about 15 turns. |
| Condition or drawback | The chair it holds while it pays nothing. It is a Wildcard card, so it needs a Wildcard chair, and the tier 4 and tier 10 governments have one. |
| Shape | Existing shape, one new counter: a commission that counts a moment. It needs the same tally of buildings finished as The Brick Kilns. |

**G2-7 The Summer Palace**

| Field | |
|---|---|
| Tier, rarity, type | Tier II, rare, Wildcard |
| Text | Cards that pay your capital also pay your largest other town. |
| Where it comes from | The 2026-10-12 sheet's Tier II rare (written by the common pass, not by you). Kept as written. |
| Replaces | Joins the band as its rare. |
| Age goal | Grow into it: a second great city. |
| Decks | Commerce (Market Day, The Nest Egg, Travellers' Letters, Export Guilds), Devotion (The Calling, The Royal Cult, The Creed, The Living Hymnal), Scientific (The Royal Workshops, The Charter Rolls), Magisterial (The Encyclopedia, The Honoured Dead, The Accessions Register), and the generic capital cards. Thin for Dominion and Expansionist until Tier III. |
| Role | Build-defining. Floor: nothing with no capital card seated. Ceiling: three capital cards paid twice. |
| Attention | It changes which town the player grows second. |
| Power | A seat with three capital cards worth 15 to 40 each gains 45 to 120. The Tier II headline is 100 or more. |
| Synergy | Reads: card lines paid to the capital. Raisers at or before Tier II: 4 each in Commerce, Devotion and Magisterial, 2 in Scientific, 1 in Expansionist, none in Dominion, and 5 generic (G0-1, G0-2, G0-3, G0-7, G1-7). |
| Displaces | The weakest card, once two capital cards are seated. |
| Condition or drawback | It needs capital cards seated. Reading to confirm: each capital line is paid again in that town with that town's own figures, and a one-off lump is not paid twice. |
| Shape | New shape: a second town for card lines scoped to the capital. |

#### Tier III

Late age 3 into age 4. Drafts 18 to 25. A seat is shown 4.

**G3-1 The Good Years**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, rare, Civic |
| Text | Your bonus from spare happiness is doubled. |
| Where it comes from | The 2026-10-12 sheet's Tier III rare, reworked. It read every town's mood; the game has one happiness figure for the empire, so it reads that. |
| Replaces | Joins the band as its rare. |
| Age goal | Decide the game: turn a contented empire into the last push. |
| Decks | All six have happiness cards: Dominion (Martial Law), Expansionist (The Grain Dole, The Waterworks), Commerce (Houses of Account, Corner the Market), Devotion (The Wayside Shrines, The Temple Storehouses, The Deaconries, The Cathedral Works), Scientific (the Physic Garden, The Curators of Works), Magisterial (The Keepers of Wonders, The Senate Charter). |
| Role | Build-defining. Floor: nothing below 5 spare happiness. Ceiling: +40% where the game gives +20%. |
| Attention | It makes the happiness figure something to steer toward. The figure is on the top bar. |
| Power | I read the bonus as +10% science and culture at 5 spare and +20% at 10 (to check). Doubled at 10 spare it adds about 187 a turn in age 4 (936 science and culture). The Tier III headline is 200 or more. |
| Synergy | Reads: spare happiness. Raisers at or before Tier III: at least 3 in every pair, plus G0-2, G1-1, G2-2 here. |
| Displaces | A flat percentage card. |
| Condition or drawback | It needs spare happiness. A lost war (weariness) or fast growth turns it off. |
| Shape | Probably existing: happinessTierBoost is a card effect that no live card uses. To check: the tier clamp of 20 in rules.json, and that a doubled penalty is not intended. |

**G3-2 City Watches**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, common, Military |
| Text | Your towns gain +8 defence. |
| Where it comes from | The live row (deferred, never dealt), cut to one effect. |
| Replaces | Itself. |
| Age goal | Protect the towns while the Opus race starts. |
| Decks | Scientific, Magisterial, Commerce, Devotion and Expansionist seats that build the Opus. Dominion uses it to hold captured towns. |
| Role | A utility answer. Floor: nothing at peace. Ceiling: a town that does not fall. |
| Attention | None. |
| Power | The Tier III combat line is +6 regular and +12 strong. +8 on every town is between them. |
| Synergy | Reads: nothing. It stacks with The Burhs, The Theodosian Walls and The Ceremonial Guard. |
| Displaces | A yield card, when a neighbour arms. |
| Condition or drawback | Towns only. |
| Shape | Existing: cityStat, defence. Data only. |

**G3-3 Commission: The Master Plan**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, uncommon, Wildcard, Commission |
| Text | Goal: hold three towns of 12 or more citizens. Reward: +20% production toward the Magnum Opus. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | Decide the game: every deck must be able to build the Opus. |
| Decks | Every deck. Expansionist and Scientific meet it by growing, Dominion by capturing, Devotion and Commerce by keeping large towns happy. |
| Role | Pay-off that leaves its chair. Floor: nothing until the goal. Ceiling: a fifth more Opus production, with no chair. |
| Attention | The rail shows the count. |
| Power | Each deck's own Opus card gives +10% for each of something, at most +40%. This gives half the cap for a goal any seat can meet, and it stacks with them. |
| Synergy | Reads: large towns. Raises: commissions fulfilled (The Royal Annals). |
| Displaces | The weakest seated card, until the goal is met. |
| Condition or drawback | The chair it holds while it pays nothing, and it must be a Wildcard chair. It is worth nothing to a seat that will not build the Opus. |
| Shape | Existing shape, one new figure: towns of at least a given size. |

**G3-4 The General Summons**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, uncommon, Military, Boon |
| Text | Boon. On draft: gain three of the best melee units you can build, in your capital. They cost no upkeep. |
| Where it comes from | New. |
| Replaces | Joins the band. |
| Age goal | Survive an attack, or strike while a rival builds the Opus. |
| Decks | Scientific, Magisterial, Commerce and Devotion (seats with small armies), Expansionist (its militia theme), Dominion (a unit gained feeds The Gathering Host, and no upkeep). |
| Role | A utility answer that takes no chair. Floor: three garrisons. Ceiling: a war turned. |
| Attention | Three units to order, once. No timer raises more. |
| Power | Three Longswordsmen are about 1,000 production. A lump registers at 1,000 or more in Tier III. |
| Synergy | Raises: units gained, garrisons. Read by: The Gathering Host, Standing Garrisons, The Regimental Schools. |
| Displaces | Nothing. |
| Condition or drawback | Paid once. |
| Shape | Small extension: The Sword of State grants one such unit on draft; this needs a count of three. |

**G3-5 The Building Trades**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, uncommon, Economic |
| Text | Every town gains +1 production for each building in it, at most +15. |
| Where it comes from | The 2026-10-12 sheet's Tier IV rare, The Town Masons, moved to Tier III and renamed (four live cards already have Masons in the name). |
| Replaces | Common Ledgers. |
| Age goal | Turn an age of building into the production the Opus needs. |
| Decks | Commerce and Devotion (their gap is production, and they buy buildings), Scientific (institutions), Magisterial (wonder towns), Expansionist (many towns), Dominion (captured towns keep buildings). |
| Role | Pay-off with a real floor. Floor: about 60. Ceiling: about 180. |
| Attention | None. It pays for what stands. |
| Power | Twelve towns with 12 buildings each give +144 production in age 4 (476 before). The Tier III bar is 60 to 120 and the headline 200. |
| Synergy | Reads: buildings in each town. Raisers: The Capital's Example, The Old Patterns, The Building Programme, and every purchase card in Commerce and Devotion. |
| Displaces | A flat Tier II production card. |
| Condition or drawback | The cap of +15 a town. |
| Shape | Existing: pays, where city, by the count of buildings in the town. Data only. |

**G3-6 The Old Patterns**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, uncommon, Economic |
| Text | Towns build buildings of earlier ages 40% faster. |
| Where it comes from | The 2026-10-12 sheet's Tier III rare, as a plain uncommon. |
| Replaces | Joins the band. |
| Age goal | Bring young and captured towns up to the level of the old ones. |
| Decks | Dominion (captured towns), Expansionist (late colonies), Devotion (newly devout towns), and any seat that founded late. |
| Role | Glue for wide seats. Floor: nothing in a finished empire. Ceiling: a new town built up in half the time. |
| Attention | None. |
| Power | In age 4 a new town lacks ten or more old buildings. 40% faster on those is worth about 14 production in each town that still builds them. |
| Synergy | Raises: buildings finished. Read by: The Building Trades, The Royal Annals through The Building Programme. |
| Displaces | The Capital's Example, if it is still seated. |
| Condition or drawback | Only buildings of ages before the seat's own. |
| Shape | New shape: an age filter on a production line. Your The Ancient Masons needs the same filter for wonders. |

**G3-7 The Old Foundations**

| Field | |
|---|---|
| Tier, rarity, type | Tier III, common, Economic |
| Text | Buildings of the first two ages cost no gold upkeep. |
| Where it comes from | The 2026-10-12 sheet's Tier II rare, as a common in Tier III. |
| Replaces | Public Hospitals (its place; The Grain Dole in Expansionist does that job better). |
| Age goal | Keep the treasury alive when banks, armies and roads all ask for gold. |
| Decks | Dominion (army upkeep), Expansionist (many towns, many buildings), Scientific and Magisterial (they are not gold decks). Commerce does not need it. |
| Role | A utility answer. Floor and ceiling: the upkeep of the old buildings. |
| Attention | None. |
| Power | I could not size it: it depends on what building upkeep costs in age 4. To check before it is built. |
| Synergy | Raises: gold. It makes a wide empire's buildings free to hold. |
| Displaces | A flat gold card. |
| Condition or drawback | Only the first two ages. |
| Shape | New shape: building upkeep relief by age. |

#### Tier IV

Age 4. Draft 26 and later. A seat is shown 0 to 2; half the bot seats never get here.

**G4-1 The Grand Design**

| Field | |
|---|---|
| Tier, rarity, type | Tier IV, uncommon, Economic |
| Text | The town raising your Magnum Opus gains +1 production for every two citizens in your empire. |
| Where it comes from | The 2026-10-12 sheet's row, unchanged. |
| Replaces | Joins the band. |
| Age goal | Build the Opus. |
| Decks | Expansionist (most citizens), Dominion (captured citizens), Devotion and Commerce (their gap is production), Scientific (large towns). |
| Role | Pay-off. Floor: +40. Ceiling: +75. |
| Attention | None. |
| Power | 100 to 150 citizens give +50 to +75 production in one town. The decks' own Opus cards are stronger and conditional, so this does not beat them. |
| Synergy | Reads: citizens in the empire. |
| Displaces | A late flat card. |
| Condition or drawback | Only while raising the Opus. |
| Shape | Existing: pays, scope raisingOpus, by the count of population, per 2. Data only (to check). |

**G4-2 The Last Walls**

| Field | |
|---|---|
| Tier, rarity, type | Tier IV, common, Military |
| Text | The town raising your Magnum Opus gains +15 defence. |
| Where it comes from | The 2026-10-12 sheet's row, cut to one effect and aimed at the Opus town. |
| Replaces | Joins the band. |
| Age goal | Protect the Opus. |
| Decks | Every seat that builds the Opus without an army: Scientific, Magisterial, Commerce, Devotion, Expansionist. |
| Role | A utility answer. |
| Attention | None. |
| Power | +15 is above the strong Tier III line (+12), on one town. |
| Synergy | Stacks with City Watches and the decks' wall cards. |
| Displaces | A yield card, during the race. |
| Condition or drawback | One town. |
| Shape | Existing: cityStat with the raisingOpus scope. Data only. |

**G4-3 The Great Raising**

| Field | |
|---|---|
| Tier, rarity, type | Tier IV, rare, Wildcard, Boon |
| Text | Boon. On draft: every town finishes what it is building. Not wonders. |
| Where it comes from | New. |
| Replaces | Joins the band as its rare. |
| Age goal | Decide the game in one turn: an army, or every University and Bank at once. |
| Decks | All six. Dominion (an army of Knights), Scientific and Commerce (the big buildings), Expansionist (most towns). |
| Role | Build-defining for one turn. Floor: about 1,500 production. Ceiling: about 4,000. |
| Attention | The player queues the dearest thing in each town before drafting. One turn of care for a result they can see. |
| Power | Twelve towns each finishing an item of 300 to 580 is 2,000 to 4,000 production, two to four times the Tier III lump. |
| Synergy | Raises: buildings and units finished. Read by: The Building Trades and every card that pays on a building or a unit gained. |
| Displaces | Nothing. |
| Condition or drawback | Paid once. Not wonders, and so not the Opus. |
| Shape | New shape: an on-draft grant that completes each town's front item (the purchase path already realises an item without the production). |

**G4-4 The Settled Realm**

| Field | |
|---|---|
| Tier, rarity, type | Tier IV, common, Civic |
| Text | Every town gains +2 happiness. |
| Where it comes from | The 2026-10-12 sheet's row. Wording only. |
| Replaces | Joins the band. |
| Age goal | Hold a large empire together through the last age. |
| Decks | Expansionist, Dominion, Devotion (wide seats). It feeds The Good Years in any seat. |
| Role | A utility answer. |
| Attention | None. |
| Power | Twelve towns: +24 happiness. |
| Synergy | Raises: happiness. Read by: G3-1 The Good Years. |
| Displaces | A late flat card. |
| Condition or drawback | None. |
| Shape | Existing: happiness, per city. Data only. |

### 3.4 Alternates

These are not in the recommended set. Each can be swapped in.

| Id | Tier | Card | What it is | Text | Why it is an alternate |
|---|---|---|---|---|---|
| A0-1 | 0 | **The Wagon Trains** | Your row. Common, Military. | Settlers and workers gain +1 movement. | Cut to one effect. I dropped the 20% toward settlers: Expansionist's The Land Hunger gives 25% in Tier I, so yours was its earlier copy. |
| A0-2 | 0 | **Boundary Stones** | The live card, simplified. Common, Civic. | Your towns' borders grow 20% faster. | The Monument condition goes. Your note of 2026-08-27 says borders grow slowly. |
| A1-1 | I | **Kitchen Gardens** | Your row. Common, Economic. | Tiles beside a city centre gain +1 food. | A plain food card. It needs a new hex scope. It can replace Cistern Works as the food answer if you prefer a seated card. |
| A1-2 | I | **Holy Ground** | Your row. Common, Civic. | Every tile that makes at least 1 faith gains 1 more. | Same new shape as The Gilded Country. It is narrow outside Devotion, because few tiles make faith in a seat without it. Modu Chanyu's pastures make faith, so it would make his theme richer. |
| A1-3 | I | **The Founders' Rights** | Your row. Rare, Civic. | +3 authority. Cities you found start with one extra citizen. | Two effects. The second is Expansionist's The Seed Grain, and Local Clerks at +3 covers the first. If you keep it, I would keep only the authority and make it uncommon. |
| A1-4 | I | **Rich Lodes** | Your row. Common, Economic. | Every strategic resource tile supplies one extra copy. | It fits existing effects. It depends on the map, and Commerce's Strategic Exports doubles copies in Tier II. |
| A1-5 | I | **Resting Camps** | The live card, tuned and moved. Common, Military. | Units that take no action heal 10 more health. | Tier I has no Military card in the core set. This is the one to add if you want each band to hold every type. |
| A2-1 | II | **The Personal Union** | New. Rare, Wildcard. | Cards that belong to two decks pay 50% more. | It reads the shared cards, which are the bridges of each pair. New shape. I held it back because reading cards is Magisterial's ground (question 1). |
| A3-1 | III | **The Long Memory** | New. Rare, Wildcard. | Your scalers gain twice as much each time. | Every deck has one or two scalers, all in Tiers I and II. It is dead in a seat that holds none, so it would need to be dealt only to a seat with a scaler. |

### 3.5 Rows of the 2026-10-12 sheet that are not in the set

`docs/decks/common.md` holds 57 rows. The set above keeps 23 of them: 13 of your 23 rows for Tiers 0 and I, and 10 of the 34 rows of Tiers II to IV (8 that the common pass wrote, and the older Local Clerks and City Watches). The rest are here, with the reason. Public Hospitals and Common Ledgers are in the audit table of section 1.

| Row | Tier | Written by | Why it is out |
|---|---|---|---|
| Oaths of Office | 0 | yours | Reads the cards seated. Magisterial's The Prytaneion does this job now. Question 1. |
| The Tool Sheds | 0 | yours | Expansionist's Tinkers' Guild is the same card (workers gain +1 charge), common, in Tier I. |
| Village Workshops | 0 | yours | Dominion's The Grain Tribute gives +1 food and +1 production in every city, so this is its weaker copy. |
| The Wagon Trains | 0 | yours | Alternate A0-1, cut to one effect. |
| The Ancient Masons | I | yours | Magisterial's The Cornerstone (+20%, Tier 0) and The Guild of Masons (+30%, Tier I) are stronger and have no age clause. Wonders belong to Scientific and Magisterial by your ruling of 2026-10-20. |
| Holy Ground | I | yours | Alternate A1-2. |
| Kitchen Gardens | I | yours | Alternate A1-1. |
| Rich Lodes | I | yours | Alternate A1-4. |
| The First Minister | I | yours | Magisterial's The Grand Vizier is this card for the first Economic chair. Question 1. |
| The Founders' Rights | I | yours | Alternate A1-3. |
| Road Maintenance, Emergency Stores | II | old rows | Deferred and never dealt. Each needs a one-off shape for a small effect. |
| The Stonecutters, Pleasure Gardens, Public Theatres, The Smiths' Guild, Harbour Towns | II | common pass | Flat pay on one named building or on the coast. Each is a deck card's weaker copy, and a building per town does not build. |
| The Borough Councils, The Town Registers | II | common pass | Small flats by town size. The Republic's own line is The Town Registers. |
| The Bathhouses, Workshop Towns, Mill Races, The Great Towns | III | common pass | The same building flats, in Tier III. |
| The State Builders, The Imperial Works | III | common pass | Empire buildings are split between Scientific and Expansionist by your ruling of 2026-10-20. |
| Close Neighbours | III | common pass | It asks the player to place towns for a card. A new count for a small effect. |
| The Great Workshops | IV | common pass | The Master Plan (G3-3) gives the same +20% as a reward, and each deck has its own Opus card. |
| The Common Schools, The Royal Quarter, The Forgemasters, The Public Lectures | IV | common pass | Too small for age 4: +5 in the capital against 450 a turn. |
| The Full Cabinet | IV | common pass | Reads the cards seated. Magisterial's The Boule does this. Question 1. |

### 3.6 The combinations the set opens

Each is stated through a general quantity or moment. No card names another card.

- **The capital.** Capital citizens are raised by The Home Fields and by every growth card. They are read by The Threshing Floor, Market Day, The Royal Cult and The Round City. Card lines paid to the capital are multiplied by The Summer Palace.
- **Buildings.** Buildings finished are sped up by The Capital's Example, The Old Patterns, The Liturgies and every purchase card of Commerce and Devotion. They are read by The Brick Kilns (each one), The Building Programme (twelve), The Building Trades (those that stand) and The Builders' Charter (the cards that pay on them).
- **Happiness.** It is raised by The Royal Household, Common Festivals, The Public Peace, The Settled Realm and at least three cards in every deck pair. It is read by The Good Years.
- **Commissions.** Every deck has them, and the set adds three. The Royal Annals reads the count.
- **Tile yields.** Any card that puts gold on a tile makes The Gilded Country pay there too.
- **Peace.** The Public Peace and The Good Years pay a seat that stays out of war. Dominion's cards pay a seat that goes to war. A Dominion seat that holds both has a real choice each time a war could end.

## 4. Checking the set

### 4.1 Composition by tier

| Tier | Cards | Rarity (common, uncommon, rare) | Types (Military, Economic, Civic, Wildcard) | Take no lasting chair | Shapes in the tier |
|---|---|---|---|---|---|
| 0 | 8 | 7, 0, 1 | 3, 2, 3, 0 | 0 | capital flats, a hex flat, a per-citizen count, a payout on a moment, a combat line, unit stats |
| I | 10 | 6, 3, 1 | 0, 5, 3, 2 | 3 (boon, commission, charter) | happiness, a production line, renown, a tile-yield line, a scaler, a self-aiming flat, a commission, a boon, a charter, a doubler |
| II | 7 | 4, 2, 1 | 1, 1, 3, 2 | 2 (boon, commission) | authority, a peace condition, a combat line, a boon, a this-game counter, a commission, a doubler |
| III | 7 | 2, 4, 1 | 2, 3, 1, 1 | 2 (boon, commission) | a meter rule, town defence, a commission, a unit boon, a per-building count, a production line, upkeep relief |
| IV | 4 | 2, 1, 1 | 1, 1, 1, 1 | 1 (boon) | an Opus count, town defence, a boon, happiness |
| **All** | **36** | **21, 10, 5** | **7, 12, 11, 6** | **8** | |

- **Roles.** 23 cards are glue or utility answers, 8 are pay-offs (The Gilded Country, The Brick Kilns, the three commissions, The Royal Annals, The Building Trades, The Grand Design) and 5 are build-defining (the five rares). A deck aims at a quarter glue. A generic set is mostly glue on purpose: it is the floor under the decks.
- **No two cards with one job.** The pairs that come close, and why I kept both:
  - The Palace School and The Royal Household both pay capital culture. They are both your cards; one adds science and the other happiness.
  - The Capital's Example (Tier I) and The Old Patterns (Tier III) both speed up old buildings. They are in different bands, so the later one replaces the earlier.
  - Common Festivals (Tier I) and The Settled Realm (Tier IV) are the same card at two sizes, for the same reason.
- **No linchpin.** No pay-off depends on one card. The Royal Annals has 3 to 9 commissions feeding it. The Good Years has at least three happiness cards in every pair. The Summer Palace and The Builders' Charter each have several feeders, with one weak pair (below).
- **Peace and war.** 29 cards are useful at peace. Seven concern war (The Marchmen, Light Kit, The Town Watch, City Watches, The General Summons, The Last Walls, and Far Runners a little). None is an attacker's card: attack belongs to Dominion. The generic war cards are a defender's answers.
- **Attention against impact.** No card is high attention and low impact. Far Runners is low attention and low impact (filler). The Great Raising and The Liturgies ask for one turn of care before the draft, and the result is visible.
- **Military chairs.** Tier I has no Military card. If you want every band to hold every type, add alternate A1-5.
- **Wildcard chairs.** The three commissions and the two doublers (The Builders' Charter, The Summer Palace) are Wildcard cards. The tier 4 and tier 10 governments have one Wildcard chair. So a seat in Tiers I and II runs one of them at a time, next to its decks' own commissions. I think that limit is right: it stops the generic commissions from being free. It also means that if you find them never seated, the limit is the first thing to look at.

### 4.2 The weak pair

Dominion with Expansionist has the fewest feeders for the two doublers: one or two cards that pay on a building (The General Staff, Stockpiles in Tier II) and one that pays the capital (The Grain Census). The generic capital cards lift The Summer Palace to the floor of three. The Builders' Charter stays thin in that pair, and such a seat should pass it. That is acceptable for a rare; it is the reason it must not be a common.

### 4.3 Leaders

- **Emperor Taizong** (garrisoned towns pay happiness and culture) gets more from The Good Years than other leaders. I think that is a welcome colour, not a problem.
- **Mithridates VI** (food on plantations and camps) gets a little more from The Home Fields and First Fruits Feasts, which pay on the same tiles.
- **Modu Chanyu** (pastures pay production and faith) would make every pasture a faith tile for Holy Ground. That is one reason Holy Ground is an alternate.
- **A rainbow seat** (all six decks) sees the same share of generic cards. The Royal Annals is stronger there, because the seat can draft any deck's commissions.
- No card names a leader, a unique unit or a unique building.

### 4.4 Example councils

**Early: Commerce with Devotion.** A capital opening.

- *Chiefdom, about turn 30 (three Wildcard chairs):* Market Day (Commerce, Tier 0), The Royal Cult (Devotion, Tier 0), **The Home Fields** (generic, Tier 0). All three stand on capital citizens. The Home Fields adds the food that grows them, and the other two are paid for each one.
- *Priest-King, about turn 65 (1 Military, 1 Economic, 2 Civic, 1 Wildcard):*
  - Economic: **The Brick Kilns** (generic, Tier I). This seat buys buildings with gold and with faith (Civic Receipts, The Gifts of the Faithful), so it gains every few turns.
  - Wildcard: Market Day.
  - Civic: The Royal Cult, The Pilgrim Staff (Devotion, Tier I).
  - Military: empty, unless a shared card fills it. Neither deck's own Tier I cards include a Military card. This is the chair alternate A1-5 would fill.
  - No chair: **The Liturgies** (generic boon), taken on draft 7 for 250 production toward the first Temples.
- How it feels: the seat grows one city, buys its buildings, and watches The Brick Kilns count them.

**Middle: Expansionist with Scientific, at peace.** Republic, about turn 125 (1 Military, 3 Economic, 1 Civic, 1 Wildcard).

- Economic: The Royal Estates (Scientific, Tier I), The Almanac (Scientific, Tier I), Enduring Institutions (Scientific, Tier II).
- Civic: The Astronomical Diaries (Scientific, Tier I, a scaler).
- Wildcard: **The Builders' Charter** (generic rare). All three Economic cards pay because a building stands in the town, so all three are doubled (by the reading on G1-10).
- Military: **The Town Watch** (generic, Tier II). The seat has few units and no better Military card.
- Earlier, in the same Wildcard chair: **Commission: The Land Register** (generic), met at about turn 60. Its +2 food and +2 production in every town still pays.
- How it feels: the generic rare is the centre of this council, and it only works because the deck supplied three building cards.

**Late: Devotion with Magisterial.** Divine Mandate, about turn 160 (2 Military, 1 Economic, 3 Civic, 2 Wildcard).

- Civic: The Keepers of Wonders (Magisterial, Tier I), The Deaconries (Devotion, Tier II), **The Good Years** (generic rare). The first two raise happiness; the third doubles what spare happiness pays.
- Wildcard: The Divine Proportion (Magisterial, Tier III), **Commission: The Master Plan** (generic), one large town short of its goal.
- Economic: The Wonder Commonwealth (Magisterial, Tier III).
- Military: The Spiritual Host (Devotion, Tier II), **City Watches** (generic, Tier III). Neither deck has a second Military card worth the chair.
- How it feels: the seat is content and at peace, and three generic cards are paid for that.

**A seat where they do not earn a chair: Dominion with Commerce, at war.** Imperium, about turn 150 (3 Military, 2 Economic, 1 Civic, 2 Wildcard).

- Every chair has a deck card that pays on what this seat does: The Tagmata, Siege Works, The Drill Masters; The Victory Mint, The Return Leg; Standing Garrisons; two commissions of its own.
- What the generic slot offers it: The Public Peace (off, it is at war), The Good Years (off, war weariness), City Watches (it is the attacker), The Old Foundations (Commerce has gold).
- It takes **The General Summons** for three units and no chair, and passes the rest.
- The reason: the seated generic cards answer problems, and this seat has none of them. Its two decks fill every chair type. That is the intended result. A generic card should be the right pick in some hands and never in all of them.

### 4.5 The skill's list, "Before you hand it over"

| Check | Result |
|---|---|
| The deck map was read and each card says which gap it fills | There is no map for a generic set. Section 2 is its map. The skill's maps cover Dominion only; I used each deck sheet's four themes and the live card texts. |
| Each card names its theme and role | Yes: capital, buildings, happiness, commissions, tile yields, peace, or a utility answer. |
| Supply, widen, multiply and act cards in each theme | Capital: supply (G0-1, G0-3), read (G0-7), multiply (G2-7). Buildings: supply (G1-2, G3-6), act (G1-9, G2-6), read (G1-6, G3-5), multiply (G1-10). Happiness: supply (G0-2, G1-1, G2-2, G4-4), multiply (G3-1). |
| No more than a third pays its own yield | Does not apply: the set has no yield of its own. It pays production most often, then happiness. It pays science and culture least, because blanket science and culture cards would be automatic picks. |
| The splits of "Direction, 2026-10-20" are followed | Yes. No card reads the council, technologies, routes, faith spent, kills or wonders. Great people are only supplied (G1-3). |
| No new player input | Yes. No card adds a button, a menu, a choice or a target. |
| Every card has a real floor | Yes, with five stated exceptions that are pay-offs or rares: G1-10, G2-5, G2-7, G3-1 and the three commissions before their goal. |
| Theme and era fit the band | Yes. Three names need your eye: The Liturgies (Greek public services), The Ever-Normal Granary (Han China) and The Public Peace (the medieval sworn peace, in Tier II). |
| No card is high attention and low impact | Yes. |
| No linchpin | Yes (4.1). |
| One effect, at most one condition, one line | Yes, except two of your rows kept as you wrote them: The Royal Household (culture and happiness) and Light Kit (two stats and a drawback). |
| No card names another card | Yes. |
| Every pay-off has three set-ups at or before its band | Yes, except The Builders' Charter in Dominion with Expansionist (4.2). |
| Every number is checked against the power bar | Yes, with the arithmetic on each card. Three could not be sized: G1-3, G3-7 and the happiness bonus of G3-1. |
| Culture in Tiers 0 and I is priced as scarce | Yes: G0-1, G0-2, G0-4 and G1-7 count early culture at three times its face. No boon pays culture, because a culture boon would pay back the draft that bought it. |
| War cards say what they do to a war | Yes (G0-5, G2-3, G3-2, G3-4, G4-2). |
| Your edits on the sheet were read and not contradicted silently | Section 1.3 and section 3.5 list every change to your rows of 2026-10-12, with the reason. |
| Each card has a type | Yes. Question 3 asks whether generic cards should have one. |
| Each new name was checked for collisions | Yes, by a search of `data/decks/`, `data/statecraft.json`, `data/buildings.json`, `data/greatPeople.json`, `data/religion.json` and `docs/decks/`. I renamed three of my own first choices that collided (The King's Peace, Watch and Ward, The Jubilee). |
| Plain English | Yes. |

## 5. Choices for you

### 5.1 Three sizes of change

- **A. Five cards (the smallest useful change).** All five fit effects the game has.
  1. G0-1 The Palace School replaces The Village Scribe and Public Gatherings.
  2. G0-5 The Marchmen replaces Watchmen.
  3. G1-1 Common Festivals replaces Civic Peace.
  4. G2-1 Local Clerks goes from +1 to +3 authority.
  5. G2-5 The Royal Annals joins Tier II. It is the first generic card that reads something, and its effect is a retired row's.
- **B. The 21 cards that need no new shape.** A plus: G0-2, G0-3, G0-4, G0-6, G0-7, G0-8, G1-3, G1-5, G2-2, G2-3, G3-1, G3-2, G3-5, G4-1, G4-2, G4-4. Six of the 21 are marked "to check" on their Shape line. This fills every band. It retires, replaces or tunes every present card except Boundary Stones (5.2).
- **C. The whole set of 36 (recommended).** B plus the 7 small extensions and the 8 new shapes below.

### 5.2 What I would cut from the data

- **Retire:** Hearth Stores, Local Markets, The Village Scribe, Public Gatherings, Household Altars, Watchmen, Resting Camps, Public Wells, Civic Peace, Public Hospitals, Common Ledgers. Each is replaced by a card of the set (section 1.1).
- **Retire, never dealt:** Common Tools, Road Crews, Road Maintenance, Emergency Stores.
- **Keep and change:** Local Clerks (+3), City Watches (one effect), Boundary Stones (alternate A0-2; retire it if you do not take the alternate).

### 5.3 What the build would need

**Small extensions** (a new member of a list the game already has; 7 cards):

- A tally of buildings finished: The Brick Kilns (G1-6) and The Building Programme (G2-6).
- Two commission figures: citizens in the empire (G1-8) and towns of a given size (G3-3).
- Three options on the on-draft grant: paid to every town from its citizens (G1-9), sized by a per-turn rate (G2-4), and a count of units (G3-4).

**New shapes** (8 cards; the first three are your own cards of 2026-10-12):

1. A production line narrowed to buildings the capital has: The Capital's Example (G1-2).
2. A hex line that tests what the tile already makes: The Gilded Country (G1-4), and Holy Ground if you take the alternate.
3. The card-line doubler narrowed to lines a building pays: The Builders' Charter (G1-10).
4. A pays line aimed at the least of science, culture and production: The Ever-Normal Granary (G1-7).
5. A second town for capital card lines: The Summer Palace (G2-7).
6. An age filter on a production line: The Old Patterns (G3-6).
7. Building upkeep relief by age: The Old Foundations (G3-7).
8. An on-draft grant that finishes each town's front item: The Great Raising (G4-3).

If eight is too many, the ones I would give up first are 7, then 6, then 4.

### 5.4 Readings I took (the build would use these unless you mark them)

1. **The Capital's Example** applies in every town but the capital, to a building the capital holds at that moment (your reading on the sheet).
2. **The Gilded Country** counts gold that other cards add to a tile, and never its own +1.
3. **The Builders' Charter** doubles a card line when the line's condition is a named building or a building category in the town. That includes "towns with a Barracks gain..." and "Libraries give...". It never doubles a building's own yields.
4. **The Summer Palace** pays each capital line again in the largest other town, with that town's own figures. A one-off lump is not paid twice.
5. **The Brick Kilns and The Building Programme** count a building that was bought, as well as one that was built. Wonders do not count.
6. **The Good Years** doubles only a bonus. A penalty for unhappiness is not doubled.
7. **Cistern Works** uses the Cistern building as the data has it (+2 food, fresh water, +1 food on worked desert). Your text adds +2 faith and water for the tiles beside the town.
8. **The Great Raising** finishes the front item of each town's queue. A project and a wonder are left as they are.
9. **The Royal Annals** counts every commission the seat has fulfilled, from any deck.

### 5.5 Questions only you can answer

1. **Should a generic card read the council?** Recommended: no. Your Oaths of Office and The First Minister (2026-10-12) read the cards seated and the first chair. On 2026-10-20 you gave the government system to Magisterial, and it now has The Prytaneion, The Nomarchs, The Boule and The Grand Vizier for those jobs. A generic copy would give every seat Magisterial's theme. If you want one such card for everyone, The First Minister is the one to keep, as the Tier I rare in place of The Builders' Charter.
2. **Should a part of the generic set take no chair?** Recommended: yes. Eight of the 36 cards do: four boons, three commissions (which leave when the goal is met) and one charter. A seat has five chairs for about eighty turns and a bench of about seven cards, so a generic card that needs a chair is rarely seated. A boon or a commission adds to a council and does not take a deck card's place. The other reading is a set of seated cards only, which keeps the generic slot simpler and weaker.
3. **Should generic cards have a type?** Recommended: yes, as written on each card. Today the generic rows have no type, so they fit any chair and count as the type of the chair they sit in. That makes Commission: The Golden Bull trivial and copies The Mixed Constitution. The other reading is to keep it on purpose: generic cards are weaker, and their strength is that they fit any chair.

## 6. What I could not check

- **I ran no game, no test and no build.** Every "Existing" on a Shape line comes from reading `data/decks/*.json` and the type lists in `src/sim/statecraftData.ts`. I did not read the evaluator's arm for each one. Six cards say "to check" for that reason.
- **What the present generic cards paid.** The measurements file prints only its top and bottom 15 cards, and only Watchmen is in them.
- **How bots would draft the set.** The bots seat economy cards and skip combat cards and amplifiers (the measurements, finding 6), so they will undervalue the doublers, the boons and the commissions.
- **Three sizes:** the share of renown that comes from the capital (G1-3), what building upkeep costs in age 4 (G3-7), and what the spare-happiness bonus pays and whether its clamp of 20 would block a doubling (G3-1).
- **The age goals of five decks.** `references/age-goals.md` has the general goals and Dominion's. For the other decks I used the general goals and each deck's themes.
- **The world clock rule** of 2026-11-18 opens ages II and III sooner. The power arithmetic uses the older bot measurements.
- **Whether a seated card can be swapped in the same turn a war starts.** The Town Watch and City Watches are worth more if it can.

---

## The user's ruling on this proposal (2026-11-18)

Review page: https://claude.ai/artifact/MLqfdzKUKKb5iyhyCds2c7. The user: "these
are great, read my comments, otherwise approved". So the recommended set (size
C) is approved with the changes below, and the three recommendations stand: no
generic card reads the council, part of the set takes no chair, and generic
cards have a type.

The user's comments, card by card:

| Card | The user's words | What changes |
|---|---|---|
| G1-6 The Brick Kilns | "+1 prod where? lets change to +1 science and +1 gold" | Gains +1 science and +1 gold each time you finish a building. The text must say where it pays. |
| G1-7 The Ever-Normal Granary | "reject" | Cut. |
| G2-2 The Public Peace | "too strong, +2 food and +1 happiness" | While you are at peace, every town gains +2 food and +1 happiness. |
| G2-6 Commission: The Building Programme | "12 buildings while slotted or 12 buildings total. if total, this number needs to be higher" | Say which it is. If it counts the whole game, raise the number. |
| G3-3 Commission: The Master Plan | "this should be harder, four towns of 20 or more citizens" | Goal: hold four towns of 20 or more citizens. |
| G3-5 The Building Trades | "reject. lets say: boon: gain a great engineer draft" | Replaced by a boon: on draft, gain a great engineer draft. |
| A0-1 (settlers and workers gain +1 movement) | "i like this one" | Added to the set. |
| A1-3 (+3 authority; cities you found start with one extra citizen) | "add" | Added to the set. |
| A2-1 (cards that belong to two decks pay 50% more) | "add" | Added to the set. |
| A3-1 (your scalers gain twice as much each time) | "add" | Added to the set. |

Every other card of the set is approved as written.

## 7. The set after the ruling (2026-11-18)

Sections 0 to 6 are the proposal as you approved it, and they are kept as they were. This section applies your ten comments. Where it and the earlier sections disagree, this section and the sheet `docs/decks/common.md` are current.

Your later word on numbers, 2026-11-18: *"no need to run bot games, we can fix the numbers later in playtesting if they're too hard."* So no number below was checked against a game. The numbers I am least sure of are marked "to tune in playtest" on the sheet.

### 7.1 What changed

| Card | Change |
|---|---|
| G1-6 The Brick Kilns | Now: "Gains +1 science and +1 gold for your empire each time you finish a building, at most +20." Both are paid to the empire as a flat sum, which is what the existing scaler shape does (The Strongbox pays the same way). No town is named. It is Civic now, by the type rule for an even card with a Civic half. |
| G1-7 The Ever-Normal Granary | Cut. Tier I still holds ten cards with every role (below). The job it did, covering a seat's gap, has no card now; I do not think the band needs one. |
| G2-2 The Public Peace | Now: "While you are at peace, every town gains +2 food and +1 happiness." One condition, one scope, two things paid. The Wayside Shrines and The Temple Storehouses are written the same way, so it stands as one effect. In the data it is one `conditionRule` over two lines (a `pays` line and a `happiness` line). It is Economic, as The Wayside Shrines is. |
| G2-6 Commission: The Building Programme | The number stays 12. See 7.2. |
| G3-3 Commission: The Master Plan | Now: "Goal: hold four towns of 20 or more citizens. Reward: +40% production toward the Magnum Opus." The reward is doubled because the goal is much harder. See 7.3. |
| G3-5 The Building Trades | Cut. Replaced by G3-9 The Office of Works: "On draft: gain a great engineer draft." See 7.4. |
| G0-9 The Wagon Trains | Added (was A0-1): "Settlers and workers gain +1 movement." |
| G1-11 The Founders' Rights | Added (was A1-3), as you wrote it: "+3 authority. Cities you found start with one extra citizen." It has two effects and it stands, because you said "add". It reads as two short sentences about one thing, founding one more town. It is a rare, so a second clause is less of a reading cost than on a common. |
| G2-8 The Personal Union | Added (was A2-1): "Cards that belong to two decks pay 50% more." |
| G3-8 The Long Memory | Added (was A3-1): "Your scalers gain twice as much each time." |
| G1-10 | Renamed The Builders' Lodge. The name does not collide with any card, building or great person. |

The ids G1-7 and G3-5 are not used again. Keyword words ("Boon.", "Scaler.", "Charter.") are no longer written in a card's text: since batch DS8 the card frame prints the keyword from the data.

### 7.2 How a commission counts progress (your question on G2-6)

From the code (`src/sim/commissions.ts`, `recordScalingOccasion` in `src/sim/statecraft/draft.ts`, `src/ui/commissionGoal.ts`), there are two kinds of goal:

- **A counted goal** ("clear 2 barbarian camps", "start two rites") counts a moment. The card has its own tally. **The tally rises only while the card is seated.** It is kept when the card is unseated, and it resumes when the card is seated again. The card face says so: "Not seated. Progress is kept and resumes when you seat it." Nothing that happened before the card took a chair counts.
- **A reached goal** ("hold 1,500 gold", "hold ten Orders") reads a figure of the empire as it stands now. The whole empire counts, whenever it was built. The goal is checked only while the card is seated, at the end of the turn. A seat that already has the figure when it seats the card is paid that turn.

So, for the three generic commissions:

| Commission | Kind | What it means |
|---|---|---|
| G2-6 The Building Programme | counted | 12 buildings finished **while it is seated**. The number stays 12. A seat of eight towns in age 3 needs about 15 turns. To tune in playtest. |
| G1-8 The Land Register | reached | 30 citizens in the empire as it stands. A seat that already has 30 is paid at once, so the number must be above what a seat has when Tier I opens. I read the five shared bot games before your word on numbers arrived: no bot seat had 30 citizens at turn 50 (the most was 21), and 13 of 30 had them at turn 75. So 30 is a goal for the end of Tier I. To tune in playtest. |
| G3-3 The Master Plan | reached | Four towns of 20 or more citizens, as the empire stands. No study was made. To tune in playtest. |

### 7.3 The Master Plan

The goal is yours: four towns of 20 or more citizens. I did not check whether a seat can reach it in the band. The reward is +40% production toward the Magnum Opus, twice the first figure. +40% is the cap of each deck's own Opus card, so this is the strongest Opus card a seat can hold, for the hardest goal in the generic set. If playtest shows that almost no seat reaches it, lower the goal before you raise the reward.

### 7.4 The Office of Works (the great engineer boon)

**Text:** "On draft: gain a great engineer draft." Tier III, uncommon, Civic, Boon. It takes no chair.

**The shape exists.** The on-draft grant of a great person (`onDraft: [{grant: 'greatPerson'}]`, The Wandering Muse) already takes a family, and `raiseOnDraft` (`src/sim/cities.ts`) passes it to `drawGreatPersonOffer`. The row is `onDraft: [{grant: 'greatPerson', family: 'engineer'}]`.

What the player gets, as the game works today:

- **An offer of great engineers,** the same hand a great person called by renown opens. Its size is the ordinary one: three names (`rules.offers.greatPerson`), or more if a card or legacy widens great-person offers.
- **The names** are drawn from the engineers of the seat's age first, then the ages before it, then the ages after it, weighted as the ordinary draw is. There are 15 engineers in the data.
- **It moves no renown.** The seat's renown pool stays where it was, and the family feed that weights later draws is not changed. I did not check whether the pick raises the price of the next rung; the commission rewards that grant a great person behave the same way, whichever it is.
- **The pick blocks End Turn** until it is made, as every great-person offer does. That is an existing input, not a new one.

Two edge cases, where the existing arm does something a player would dislike:

1. **An offer is already waiting.** The on-draft arm keeps the waiting offer and the new grant does not land. The boon is lost.
2. **Every engineer is taken.** The offer has no names, and the grant does not land.

A commission's reward does better in both cases: `grantGreatPersonOffer` (`src/sim/greatPeople.ts`) fills the renown ladder to its next rung instead, so the person arrives after the waiting one is chosen. **I recommend the builder sends the on-draft grant through that routine.** It is a change of a few lines and it also fixes The Wandering Muse. It is the only work this card needs.

### 7.5 The doublers

The set now has four cards that act on other cards, and one that doubles a meter:

| Tier | Card | What it raises |
|---|---|---|
| I | G1-10 The Builders' Lodge | card lines paid on a building, doubled |
| II | G2-7 The Summer Palace | card lines paid to the capital, paid again in a second town |
| II | G2-8 The Personal Union | shared cards, +50% |
| III | G3-8 The Long Memory | what scalers gain, doubled |
| III | G3-1 The Good Years | the spare-happiness bonus, doubled |

- **All five stay rare.** A hand rolls the rarity first (60, 30, 10) and then picks a card of that rarity. So a band with two rares shows a rare on 10% of its looks, the same as a band with one. Adding The Personal Union and The Long Memory does not make doublers more common; it makes each one rarer.
- **Tier II has three Wildcard cards** (the commission and two doublers) and the tier 10 governments have one Wildcard chair. A seat can run one of them at a time until the tier 18 government gives it two. That is a real limit and I think it is the right one.
- **The Long Memory is dealt only to a seat that holds a scaler.** Without that gate it is a dead card in some seats. The game has this kind of gate already (cards marked "Needs a levy").
- **The Personal Union needs seated shared cards.** A seat's pool holds 15 to 22 of them over a game. In Tier II a seat is shown a shared card on two drafts in eight, so it holds two or three by then. It is weak with one and strong with three.

### 7.6 One thing you must still decide: The Summer Palace

While I wrote the build list I found that **Scientific's Tier IV Doctrine The Two Capitals already does this**: "Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly." I missed it in the proposal, because I read the Orders of each deck and not the Doctrines.

- The good part: the shape exists (the rule `secondCapital`), so The Summer Palace is a data row.
- The problem: the generic card is that Doctrine's first half, two tiers earlier, with no drawback and for every seat. A Scientific seat that holds both gains nothing from the second.

You approved G2-7 as written, so it is on the sheet. My recommendation is to change it to a card that is not the Doctrine: **"Cards that pay your capital pay 50% more."** That keeps the capital theme, costs a new narrowing on the card-line amplifier, and stacks with the Doctrine. The other choices are to keep it as it is, or to cut it and leave Tier II with one doubler.

### 7.7 The final set

| Id | Card | Tier | Rarity | Type | Keyword | Text | Needs | Mark |
|---|---|---|---|---|---|---|---|---|
| G0-1 | **The Palace School** | 0 | common | Civic |  | Your capital gains +2 science and +2 culture. | existing shape |  |
| G0-2 | **The Royal Household** | 0 | common | Civic |  | Your capital gains +3 culture and +2 happiness. | existing shape |  |
| G0-3 | **The Home Fields** | 0 | common | Economic |  | Resource tiles in your capital gain +1 food. | existing shape |  |
| G0-4 | **First Fruits Feasts** | 0 | common | Civic |  | Improving a resource tile grants 5 culture. | existing shape |  |
| G0-5 | **The Marchmen** | 0 | common | Military |  | Your units gain +3 strength against barbarians. | existing shape |  |
| G0-6 | **Far Runners** | 0 | common | Military |  | All your units gain +1 sight. | existing shape |  |
| G0-7 | **The Threshing Floor** | 0 | common | Economic |  | Your capital gains +1 production for every two citizens. | existing shape |  |
| G0-8 | **Light Kit** | 0 | rare | Military |  | All your units gain +1 movement and +1 sight, and -2 combat strength. | existing shape |  |
| G0-9 | **The Wagon Trains** | 0 | common | Military |  | Settlers and workers gain +1 movement. | existing shape | added |
| G1-1 | **Common Festivals** | I | common | Civic |  | Every town gains +1 happiness. | existing shape |  |
| G1-2 | **The Capital's Example** | I | common | Economic |  | Your other towns build buildings your capital already has 25% faster. | new shape |  |
| G1-3 | **The Hall of Fame** | I | common | Civic |  | +30% renown in your capital. | existing shape |  |
| G1-4 | **The Gilded Country** | I | common | Economic |  | Every tile that makes at least 1 gold gains 1 more. | new shape |  |
| G1-5 | **Cistern Works** | I | common | Economic | Charter | Unlocks the Cistern: +2 food, and its town counts as standing on fresh water. | existing shape |  |
| G1-6 | **The Brick Kilns** | I | uncommon | Civic | Scaler | Gains +1 science and +1 gold for your empire each time you finish a building, at most +20. | small extension | changed |
| G1-8 | **Commission: The Land Register** | I | uncommon | Wildcard | Commission | Goal: have 30 citizens. Reward: every town gains +2 food and +2 production. | small extension |  |
| G1-9 | **The Liturgies** | I | common | Economic | Boon | On draft: every town gains production equal to ten times its citizens. | small extension |  |
| G1-10 | **The Builders' Lodge** | I | rare | Wildcard |  | Orders that add yields to buildings pay double. | new shape | renamed |
| G1-11 | **The Founders' Rights** | I | rare | Civic |  | +3 authority. Cities you found start with one extra citizen. | existing shape | added |
| G2-1 | **Local Clerks** | II | common | Civic |  | Gain +3 authority. | existing shape |  |
| G2-2 | **The Public Peace** | II | common | Economic |  | While you are at peace, every town gains +2 food and +1 happiness. | existing shape | changed |
| G2-3 | **The Town Watch** | II | common | Military |  | Your units gain +5 strength when defending in your territory. | existing shape |  |
| G2-4 | **The Learned Embassy** | II | common | Civic | Boon | On draft: gain science equal to eight turns of your science. | small extension |  |
| G2-5 | **The Royal Annals** | II | uncommon | Economic |  | +4% production and gold for each commission you have fulfilled this game, at most +28%. | existing shape |  |
| G2-6 | **Commission: The Building Programme** | II | uncommon | Wildcard | Commission | Goal: finish 12 buildings. Reward: every town gains +10% production. | small extension | answered |
| G2-7 | **The Summer Palace** | II | rare | Wildcard |  | Cards that pay your capital also pay your largest other town. | existing shape | flag |
| G2-8 | **The Personal Union** | II | rare | Wildcard |  | Cards that belong to two decks pay 50% more. | small extension | added |
| G3-1 | **The Good Years** | III | rare | Civic |  | Your bonus from spare happiness is doubled. | existing shape |  |
| G3-2 | **City Watches** | III | common | Military |  | Your towns gain +8 defence. | existing shape |  |
| G3-3 | **Commission: The Master Plan** | III | uncommon | Wildcard | Commission | Goal: hold four towns of 20 or more citizens. Reward: +40% production toward the Magnum Opus. | small extension | changed |
| G3-4 | **The General Summons** | III | uncommon | Military | Boon | On draft: gain three melee units, in your capital. They cost no upkeep. | small extension |  |
| G3-6 | **The Old Patterns** | III | uncommon | Economic |  | Towns build buildings of earlier ages 40% faster. | new shape |  |
| G3-7 | **The Old Foundations** | III | common | Economic |  | Buildings of the first two ages cost no gold upkeep. | new shape |  |
| G3-8 | **The Long Memory** | III | rare | Wildcard |  | Your scalers gain twice as much each time. | small extension | added |
| G3-9 | **The Office of Works** | III | uncommon | Civic | Boon | On draft: gain a great engineer draft. | existing shape | added |
| G4-1 | **The Grand Design** | IV | uncommon | Economic |  | The town raising your Magnum Opus gains +1 production for every two citizens in your empire. | existing shape |  |
| G4-2 | **The Last Walls** | IV | common | Military |  | The town raising your Magnum Opus gains +15 defence. | existing shape |  |
| G4-3 | **The Great Raising** | IV | rare | Wildcard | Boon | On draft: every town finishes what it is building. Not wonders. | new shape |  |
| G4-4 | **The Settled Realm** | IV | common | Civic |  | Every town gains +2 happiness. | existing shape |  |

**Counts:**

| Tier | Cards | Common | Uncommon | Rare | Military | Economic | Civic | Wildcard | No lasting chair |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 9 | 8 | 0 | 1 | 4 | 2 | 3 | 0 | 0 |
| I | 10 | 6 | 2 | 2 | 0 | 4 | 4 | 2 | 3 |
| II | 8 | 4 | 2 | 2 | 1 | 2 | 2 | 3 | 2 |
| III | 8 | 2 | 4 | 2 | 2 | 2 | 2 | 2 | 3 |
| IV | 4 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| **All** | **39** | **22** | **9** | **8** | **8** | **11** | **12** | **8** | **9** |

### 7.8 The composition checks again, for the bands that changed

- **Tier 0 (9 cards).** Four of nine are Military (The Marchmen, Far Runners, Light Kit, The Wagon Trains), but only The Marchmen is a combat card. Far Runners (sight), The Wagon Trains (movement for settlers and workers) and Light Kit (movement and sight for all, with a drawback) are close to each other. They do not have one job: one is sight, one is two unit classes, one is everything for a price. If the band feels like too much scouting in play, Far Runners is the one to drop.
- **Tier I (10 cards).** Without The Ever-Normal Granary the band has: three utility answers (Common Festivals, Cistern Works, The Founders' Rights), three glue cards (The Capital's Example, The Hall of Fame, The Liturgies), three pay-offs (The Gilded Country, The Brick Kilns, The Land Register) and one doubler (The Builders' Lodge). Shapes: happiness, a production line, renown, a tile line, a charter, a scaler, a commission, a boon, a doubler, authority with a founding rider. No two cards share a job. It still has no Military card.
- **Tier I and Tier II both give +3 authority** (The Founders' Rights, Local Clerks). They are in different bands, and a seat that takes both has two more towns. Your note of 2026-09-03 says authority is too plentiful, so watch this pair first.
- **Tier II (8 cards).** Two utility answers (Local Clerks, The Town Watch), one peace card, one boon, one counter, one commission, two doublers. Three of the eight are Wildcard (7.5).
- **Tier III (8 cards).** Two boons now (The General Summons, The Office of Works), one commission, two doublers, two wide-empire economy cards (The Old Patterns, The Old Foundations), one defence card. With The Building Trades gone, no generic card reads the buildings that stand; The Brick Kilns and The Building Programme still read the buildings finished.
- **No linchpin, and every pay-off has a floor or a gate:** The Long Memory has its gate, and the other pay-offs are as in section 4.

## 8. The build list

For the builder. Take the groups in this order. The sheet `docs/decks/common.md` has each card's text; a row is done when its data text equals the sheet's Ability cell.

Every new row goes in `data/decks/common.json` with `decks: []`, `line: "none"`, a band, a rarity, a `type`, a Flavour line and its text. `test/sim/decks/common.test.ts` asks for all of these.

### 8.1 Group 1: shapes that exist today (24 cards, a JSON row each)

| Id | Card | Effect, in the data's words | To check |
|---|---|---|---|
| G0-1 | The Palace School | `pays`, city, scope capital, science 2, culture 2 | |
| G0-2 | The Royal Household | `pays`, city, scope capital, culture 3; `happiness` 2 | |
| G0-3 | The Home Fields | `pays`, hex, on `hasResource`, scope capital, food 1 | that a hex line takes the capital scope (The Provincial Fair joins `on` and `scope`) |
| G0-4 | First Fruits Feasts | `windfallRider`, occasion `improvementBuilt`, grant culture 5 | that the rider can be narrowed to a resource tile; if it cannot, this card moves to group 2 |
| G0-5 | The Marchmen | `combatLine` 3, when `vsBarbarians` | |
| G0-6 | Far Runners | `unitStat` sight 1 | |
| G0-7 | The Threshing Floor | `pays`, city, scope capital, basis count, count `capitalPopulation`, per 2, to production | |
| G0-8 | Light Kit | `unitStat` movement 1; `unitStat` sight 1; `combatLine` -2, when `always` | that a combat line may be negative (Total War's happiness line is, its combat line is not) |
| G0-9 | The Wagon Trains | `unitStat` movement 1, class settler and worker | |
| G1-1 | Common Festivals | `happiness` 1, per city | |
| G1-3 | The Hall of Fame | `cityRenownPercent` 30, scope capital | |
| G1-5 | Cistern Works | a charter that unlocks the building `cistern` (`unlocksBuilding`) | the building row has no faith and does not water the tiles beside the town; the sheet's text follows the row |
| G1-11 | The Founders' Rights | `authority` 3; `foundingRider` with a citizen (The Seed Grain's row) | |
| G2-1 | Local Clerks | `authority` 3 (the live row, 1 becomes 3) | |
| G2-2 | The Public Peace | `conditionRule`, when `atPeace`, then `pays` city food 2 and `happiness` 1 per city | |
| G2-3 | The Town Watch | `combatLine` 5, side defend, when `ownTerritory` | |
| G2-5 | The Royal Annals | two `pays` lines, where empire, basis count, count `commissionsMet`, percent 4, stage empire, max 7, to production and to gold (the retired The Res Gestae's rows, with gold for culture) | |
| G2-7 | The Summer Palace | `rule` `secondCapital` | section 7.6: it is the first half of the Doctrine The Two Capitals; wait for the user's choice |
| G3-1 | The Good Years | `happinessTierBoost` | the field is `points`, not "doubled": write the points that double each step, and check `tierClamp` (20) in `data/rules.json` and that a penalty step is not raised |
| G3-2 | City Watches | `cityStat` defence 8 (the live deferred row, rewritten) | |
| G3-9 | The Office of Works | `onDraft: [{grant: 'greatPerson', family: 'engineer'}]` | section 7.4: send the on-draft grant through `grantGreatPersonOffer` so it is not lost |
| G4-1 | The Grand Design | `pays`, city, scope `raisingOpus`, basis count, count `population`, per 2, to production | |
| G4-2 | The Last Walls | `cityStat` defence 15, scope `raisingOpus` | |
| G4-4 | The Settled Realm | `happiness` 2, per city | |

### 8.2 Group 2: small extensions (8 extensions, 9 cards)

Each adds one member to a list the game already has.

1. **A tally of buildings finished** (`TallyOccasion`, written by `recordScalingOccasion`). Used by G1-6 The Brick Kilns (a scaler: two `pays` lines, where empire, count `tally`, max 20) and G2-6 The Building Programme (a counted goal of 12). A bought building counts. A wonder does not.
2. **A commission figure: citizens in the empire** (`CommissionFigure`, measured in `commissionFigure`, `src/sim/commissions.ts`). Used by G1-8 The Land Register. Its reward is a lasting `pays` line in every town.
3. **A commission figure: towns of at least a given size.** Used by G3-3 The Master Plan. The goal carries the size (20) and the count (4). Its reward is a lasting production bonus toward the Opus.
4. **An on-draft grant paid to every town from its citizens.** The windfall grant has `toEveryTown` and `fromTownPopulation` (The Journeymen); the on-draft windfall (`OnDraftWindfall`) has `toCapital` only. Used by G1-9 The Liturgies.
5. **An on-draft grant sized by a per-turn rate** (`fromRate`, as The Doctorate's grant). Used by G2-4 The Learned Embassy.
6. **A count on the on-draft unit grant.** The Sword of State grants one `bestMelee`. Used by G3-4 The General Summons (three).
7. **A selector on the card-type amplifier: a card that names two decks** (`cardTypeAmplifier` today selects a chair type). Used by G2-8 The Personal Union. It raises every number the seated shared cards give, as the tier-26 governments raise a type.
8. **A meta rule that doubles what a scaler gains, and a deal gate "holds a scaler".** The rule joins `metaRule` beside `techCountsTwice`, read where `recordScalingOccasion` raises a tally. The gate joins `dealGateFor` (`src/sim/statecraft/draft.ts`) beside `needsLevy`. Used by G3-8 The Long Memory. A commission's tally is not doubled.

### 8.3 Group 3: new shapes (5 entries, 6 cards)

In the order I would build them: the cheapest first, and the two that share a filter together.

**1. An age filter on a production line, and its sibling "the capital has it".** Cards: G3-6 The Old Patterns, G1-2 The Capital's Example.
- *What it does.* A `productionBonus` row for buildings gains one of two narrowings. `earlierAges`: the building's age is below the seat's research age. `capitalHas`: the capital holds the building now, and the town is not the capital.
- *Where it joins.* `cardProduction` in `src/sim/statecraft/evaluator.ts` (the reader of `productionBonus`).
- *Words.* "Towns build buildings of earlier ages 40% faster." and "Your other towns build buildings your capital already has 25% faster." The second needs a clause for "your other towns".
- *Yield sequence.* `productionBonus` lands at step 11 of `docs/yields.md` (multiplicative, production only, the city stage). No new row in the register.
- *Edge cases.* A building with no age of its own (opened by a charter, or granted only): not an earlier-age building. A wonder and a project: never. A seat with one town: The Capital's Example pays nothing. The capital loses the building (a capture): the bonus stops at once. Under The Two Capitals: only the true capital counts.

**2. A hex line that tests what the tile already makes.** Card: G1-4 The Gilded Country (and Holy Ground, if the user ever takes it).
- *What it does.* A `pays` hex line with a new tile test: the tile's own fold of one yield, without this card's line, is at least 1.
- *Where it joins.* The tile tests (`tileConditionHolds`) and the card tile lines (`cardTileLines`, `scopedCardTileLines`). The evaluator already has a notion of a test that reads the fold (`tileConditionReadsFold`); this test joins it.
- *Words.* "Every tile that makes at least 1 gold gains 1 more."
- *Yield sequence.* Step 2 (the hex), additive, row `pays` hex flat. The line must be folded after every other hex line, and the register should say so.
- *Edge cases.* Its own +1 never counts toward the test. Two such cards on one yield cannot exist today; if a second is added, each must leave out both. A percentage on the hex is applied after it. A tile that makes gold only through another card: counts (this is the point of the card). An unworked tile: no line, as for every hex line. Rule 5: it is one labelled line in `explainTileYield`.

**3. The card-line doubler narrowed to lines a building pays.** Card: G1-10 The Builders' Lodge.
- *What it does.* A `cardYieldAmplifier` (percent 100) with a new narrowing: the amplified line's own condition names a building or a building category in the town (`hasBuilding`, `buildingsOfCategory`, a count of `buildingsOfKind`, or a "each X gives" row).
- *Where it joins.* `cardYieldAmplifier`'s reader (the amplifier functions near `cardAmplifierFlat`), which today narrows by a hex test (`on`).
- *Words.* "Orders that add yields to buildings pay double."
- *Yield sequence.* The register's `cardYieldAmplifier` row: steps 2, 3 and 18, over the card lines of the fold it reads. No new row, but the row's text should name the new narrowing.
- *Edge cases.* A building's own yields are never doubled. A Doctrine's line: the text says Orders, so no. A percentage line whose condition is a building (Enduring Institutions): doubled, unless the user rules otherwise. A one-off payout on finishing a building: not doubled (it is a moment, not a line on a building). Two doublers on one line (with The Personal Union, or The Grand Vizier): they add, they do not multiply, by the amplifier's own rule.

**4. Building upkeep relief by age.** Card: G3-7 The Old Foundations.
- *What it does.* Buildings of ages 1 and 2 cost no gold maintenance.
- *Where it joins.* The building maintenance line of `explainEmpireGold` (`src/sim/empireGold.ts`), through a reader in the evaluator beside the unit upkeep readers (`cardUpkeepRebateLines`). It is a new effect kind or a new `where` on `upkeepRebate`.
- *Words.* "Buildings of the first two ages cost no gold upkeep."
- *Yield sequence.* Not in the town sequence. It changes one line of the empire's gold fold, and belongs in "Kinds that move a voice but not through this sequence".
- *Edge cases.* It must be a labelled rebate line, not a smaller maintenance line (rule 5). A building with no age: not covered. Check first what building maintenance costs in age 4; if it is a few gold, cut the card instead.

**5. An on-draft grant that finishes each town's front item.** Card: G4-3 The Great Raising.
- *What it does.* When the card is drafted, each of the seat's towns completes the item at the front of its queue.
- *Where it joins.* `raiseOnDraft` (`src/sim/cities.ts`), a new arm of `OnDraftGrant`, realised through `realiseItem` as a purchase is.
- *Words.* "On draft: every town finishes what it is building. Not wonders."
- *Yield sequence.* None.
- *Edge cases.* A wonder, the Opus and a project at the front: left alone. An empty queue: nothing. A unit that cannot be placed: follow the purchase rule. Production already banked on the item: it is spent, not kept as overflow. Completion riders (a card that pays on a building finished) fire for each. The unit's escalation ladder rises as for a built unit, not as for a free one. A town in unrest or a puppet: follow the purchase rule.

### 8.4 The present generic rows

**Retire** (`retired: true`; the row keeps its text and effects, for saves):

- Dealt today: `hearthStores`, `watchmen`, `restingCamps`, `localMarkets`, `theVillageScribe`, `publicGatherings`, `householdAltars`, `commonBoundaryStones`, `publicWells`, `civicPeace`, `publicHospitals`, `commonLedgers`.
- Deferred, never dealt: `commonTools`, `roadCrews`, `roadMaintenance`, `emergencyStores`.

**Change in place:**

- `localClerks`: +1 authority becomes +3, and it gains the type Civic.
- `cityWatches`: the deferred row becomes "Your towns gain +8 defence." with a `cityStat` line and the type Military.

**Tests this touches:** `test/sim/decks/common.test.ts` lists the retired rows by id and expects each retired row to name two decks. Both must change. `docs/orders-and-doctrines.md` has a generic table under `test/sim/statecraftDocSync.test.ts`; it changes in the same batch.

### 8.5 What a bot needs

`src/ai/value.ts` prices a card. Today it prices a boon as a lump spread over the turns left (`onDraftWorth`), a commission as its reward (`explainCommission`), and an amplifier by the lines it would find (`amplifiedLines`). Each new thing needs an entry, or the bot values it at nothing:

- **Boons.** The three new on-draft options (every town from its citizens, a per-turn rate, three units) need a price in the on-draft pricing (`magisterialDraftGrantWorth` and `draftedUnitWorth`). The Great Raising needs its own: the production each town's front item still lacks. The great engineer draft is priced already, as The Wandering Muse is.
- **Commissions.** The two new figures (citizens, towns of a size) must be readable by the bot's reading of how far a goal is (`commissionProgress`), so that it does not seat The Master Plan with no town above ten. The counted goal needs a rate of buildings finished per turn, as `commissionMetRate` has for its own count.
- **A commission's chair.** The bot should know that a commission holds a Wildcard chair and pays nothing until it is met.
- **Doublers.** The Builders' Lodge: `amplifiedLines` must count the seated lines whose condition is a building. The Personal Union: count the seated shared cards and what they pay. The Long Memory: the gains its seated scalers still expect. The Summer Palace is priced as The Two Capitals is.
- **The Royal Annals.** It reads commissions met; the bot has a rate for that (`commissionMetRate`), with a cautious default.
- **Conditions.** The Public Peace should be priced by the share of turns the seat is at peace. The Good Years should be priced at nothing below 5 spare happiness.
- **Defence cards.** Bots skip combat cards. The Town Watch, City Watches and The Last Walls will not be seated by a bot unless it knows it is being attacked. That is acceptable for now; say so in the batch report.
- **The arena panel.** Any new bot knob appears on `arena.html` with no page edit (CLAUDE.md).

### 8.6 Putting the sheet under a sync test

`docs/decks/common.md` is written to be read by the test that reads the six deck sheets. The builder must:

1. **Stop the generator.** `scripts/deckDocs.mjs` writes `docs/decks/common.md` (its last block, `writeSheet('docs/decks/common.md', ...)`). Remove that block, or the next run overwrites the sheet.
2. **Read the tier tables** with the reader `test/sim/decks/dominion.test.ts` uses (five tier headings, a table each; the first five cells are Card, Rarity, Status, Ability, Type, as on every deck sheet). Move that reader to `test/sim/decks/sortedSheets.ts` so two test files can share it. The sheet has two more cells, Keyword and Id.
3. **Check, in `test/sim/decks/common.test.ts`:** an `implemented` row's rarity, tier, text and type equal the data row's; a `modify` row has a data row; an `add` row has none; every generic data row that is not retired is on the sheet once; a retired row is on no table.
4. **Check the Keyword cell** against `orderKeyword` for every row that has a data row.
5. **Let generic rows carry a type.** `rowsListedOnSortedSheets` (`sortedSheets.ts`) lists the rows that may have a `type`. Add the generic rows that `common.md` lists, or a typed generic row fails the rule in `dominion.test.ts`.
6. **The Id cell is not data.** The test ignores it. It is there so that comments and this proposal can cite a card.
7. **As each card is built,** its Status changes from `add` or `modify` to `implemented`, and the counts table at the top of the sheet is recomputed.

## The Summer Palace: the user's ruling (2026-11-19)

The user: "summer palace pay 50% more is fine."

- **G2-7 The Summer Palace** now reads: "Cards that pay your capital pay 50% more."
- It no longer repeats the Scientific Doctrine The Two Capitals.
- This replaces the text of G2-7 in section 7 and on `docs/decks/common.md`. The builder updates the sheet row with the card.
- The number is to tune in playtest.

## First implementation batch

The branch `codex/generic-orders` implements 22 of the 39 approved Orders.
It retires the 16 rows in section 8.4 and updates Local Clerks and City Watches
in place. The tier tables in `docs/decks/common.md` list the remaining 17.

Two cards from group 1 need more work. The Good Years must double both positive
happiness levels. A fixed increase gives a different result at each level.
The Summer Palace needs the capital payment increase in the final ruling above.

Cistern Works unlocks the existing Cistern. The Office of Works uses the same
grant as The Wandering Muse. If an offer is already waiting, that grant banks
renown toward recruitment. It does not reserve an engineer for the next offer.

Before integrating the new pool into the play build, update the save version
and verify the bot results on the combined branch. Draft commands record an
option index. A command log from the old pool can select a different card
under the new rules.

This batch passed typecheck, all 12,080 core tests in 521 files, and the
production build with the shared turn runner at `e3d89148`. The focused
tests check resource improvements, capital yields, the Opus queue, combat
strength on attack and defence, and card text against the sheet.

## The General Summons, 2026-11-19

The generic branch now implements 23 of the 39 Orders. The General Summons raises up to three melee units when the card is drafted. The capital uses its normal placement rules for each unit. Each placed unit costs no upkeep. A capital with one legal space gets one unit. The bot values the three units at their production cost and can overvalue a crowded capital. The type check, 12,084 core tests and the production build passed. The new pool will land together when the remaining 16 Orders are ready.

## The Land Register and The Master Plan, 2026-11-19

The generic branch now implements 25 of the 39 Orders. The Land Register counts the citizens in towns the seat holds. The Master Plan counts its towns that meet the population floor. Both check the current board at turn end while seated. Fulfilment frees the chair and keeps the reward active for the rest of the game.

The bot estimates when each town will meet The Master Plan's goal from its current growth rate and food basket. It uses the ordinary Commission price and chair rules for both Orders.

Typecheck, all 12,087 core tests and the production build passed on the generic Orders branch.

**The Old Foundations.** The data already sets a useful bound on this proposed card. Four Age I buildings can pay one gold upkeep each. Ten Age II buildings can pay two each, including four once-per-empire buildings. For example, a town with a Barracks, Library, Market and Smithy saves six gold a turn. A town with only a Granary and Monument saves zero. The card scales with the number of eligible buildings already built. These are examples from the cost rules, rather than observations of play. Check actual holdings in the next human playtest.

## The Brick Kilns and The Building Programme, 2026-11-19

Both cards count a building when a town finishes it from its queue or buys it.
The same count covers a queue item finished by a windfall. Wonders, the Magnum
Opus, free grants and capture give no progress. Each card keeps its own progress
when unseated. The Brick Kilns caps each yield at +20. The Building Programme
leaves its chair after twelve and gives +10% production to every current and
future town.

The bot estimates the completion rate from recent buildings in its towns. The
board keeps the dates when buildings arrived. These dates cannot distinguish
mid-game grants from paid construction, so the rate is an estimate. An ordinary
building gains value for advancing a seated Building Programme in the bot's
queue, gold and faith plans.

Typecheck, all 12,090 core tests and the production build passed on this branch.

## The Liturgies and The Learned Embassy, 2026-11-19

The Liturgies adds ten production per citizen to each owned town. The grant
uses each town's population before any town settles. It can finish a queued
wonder or any other queue item the town can finish through ordinary production.
Overflow and production in idle towns stay in their normal baskets.

The Learned Embassy pays eight times the current empire science rate when the
Order enters the collection. The normal science windfall can finish research
and fire its completion effects. Those effects do not change the rate used for
the grant. The bot prices both Orders as one-time yields using these same
population and science readings.

The generic branch implements 29 of the 39 approved Orders. Typecheck, all
12,094 core tests and the production build passed with this pair.

## The final ten Orders, 2026-11-19

All 39 approved generic Orders are implemented.

- The Capital's Example reads the buildings in the town with your palace.
  The Old Patterns uses the age of the technology that unlocks each building
  and compares it with your current research age. The Old Foundations lists
  each upkeep rebate beside the building bill. The Good Years doubles both
  positive happiness levels for science and culture.
- The Gilded Country checks gold on worked tiles after the other flat tile
  yields and before the percentage bonuses. The Builders' Lodge doubles
  recurring yields that Orders add to buildings. The Summer Palace increases
  recurring card payments directed to your capital. The Personal Union increases
  the eligible effects of seated Orders that belong to two decks.
- The Long Memory appears in offers once you own a Scaler. While seated, it
  doubles new gains on your Scalers. The Great Raising completes the current
  unit or ordinary building in each eligible town when drafted. Each completed
  item uses the normal production rules.

The dealable pool now contains 505 Orders, including all 39 generic Orders. Save version 246 identifies the new pool because draft commands store an index into an offer. The two six-seat, 120-turn reference states are `52d790f9:384223` (Duel) and `b7eb7f33:1015904` (Standard). Both games finished without a bot warning or stall. The card batch and turn-start work passed 12,153 core checks and 13 targeted slow checks, including the independent draft-price comparison.

### Release audit

The release contains 9 generic Orders in Tier 0, 10 in Tier I, 8 in Tier II,
8 in Tier III and 4 in Tier IV. That is 39 live Orders. The data keeps 16
retired generic rows and excludes them from the deal.

- The General Summons raises up to three units, subject to placement space.
  The bot prices all three and can overvalue the card when the capital is crowded.
- If a great-person offer is pending when you draft The Office of Works, the
  game adds renown toward the current threshold. The next offer follows the
  usual family rules.
- The [common deck sheet](../decks/common.md#to-tune-in-playtest) lists 17 cards
  with numbers to tune in playtest. Record the upkeep saved by The Old Foundations
  on actual late-game boards.
