# Leader roster pass, 2026-11-19

A design pass on the leaders, in three steps: the first pass on sixteen candidates, the user's comments on the page, and the user's ruling on the roster. No game data or code changed. The page for review is generated from the same source (`roster_data.py`, `final_data.py`, `build.py` and `build2.py` in the session scratchpad).

- This page is the roster after your comments and your ruling of 2026-11-19. Your words are the spec; they are copied at the end of the doc.
- Sixteen seats: one leader for each of the fifteen pairs, and Ibn Battuta, who plays every deck.
- Open for you: the readings in part 1, and Jayavarman VII in part 2. Everything else is ready for the build.
- Power bar used below (`.claude/skills/card-design/references/power-bar.md`): a regular new card pays 4 to 8 yield a turn at the end of age 1 and 35 to 60 in age 3; a headline card pays 10 to 15 and 100 or more. Early culture counts three times. A regular combat line is +2 to +3 in age 1 and +5 in age 3. A1 is the end of age 1 (about turn 55, 3 to 4 towns). A3 is the end of age 3 (about turn 150, 8 towns, 70 citizens). Every number is a first guess, to tune in playtest.
- History is written from memory and is not checked against sources.

## 1. Your lines: the final wording, the shape, the arithmetic and the readings

Each reading is a short question with the reading I recommend. The build uses the recommended reading unless you mark it.

### Alexander the Great: Ability II

- **You wrote:** "training a military unit gives science equal to half the unit's strength"
- **Final line:** **The Royal Army.** Gaining a military unit grants science equal to half its strength.
- **Shape:** Existing. `windfallRider` on `unitCompletion` with `class: {category: military}` and `grant: {yield: science, amount: 0.5, fromOccasion: strength, whole: true}`. The moment is paid in `realiseItem` (`src/sim/cities.ts`), which carries the strength and serves trained, bought and free units. For the builder to check: that a levied unit reaches it.
- **Arithmetic:** A1: strength 15 to 33, so 7 to 16 science a unit; a unit every six turns is about 2 science a turn against a median of 4. A3: strength 45 to 50, so 22 to 25 a unit; a unit every three turns is about 8 a turn. Under a regular card in both ages, and it scales with every levy, boon and purchase.
- **Q: Trained only, or every unit gained?** Recommended: Every military unit gained: trained, bought, levied or granted. That is your ruling of 2026-10-13 ("a unit gained"), and the text says "gaining".
- **Q: How is half rounded?** Recommended: Down. A Warrior of strength 15 gives 7.
- **Q: The name?** Recommended: "The Royal Army" is a placeholder; you gave the line and no name.

### Alexander the Great: Building

- **You wrote:** "Basilikoi: +2 culture, +1 science and culture on all strategic resources in the city, unlocks with the barracks. … counts as a military building"
- **Final line:** **The Royal Pages** (Basilikoi Paides). +2 culture. Each strategic resource the city works gives +1 science and +1 culture. A military building.
- **Shape:** Existing. A building row with `category: military`, `culture: 2`, and `tileYields` on a strategic resource hex (the Stable's shape, with a `resourceKind` test). Its column is the Barracks' technology, Bronzeworking (age 1).
- **Arithmetic:** A1: three towns, +6 culture and about +3 science and +3 culture from the hexes (culture worth about 27): strong for a small building. A3: eight towns, +16 culture and about +10 of each from the hexes.
- **Q: Is "Basilikoi" the right word?** Recommended: Nearly. The Basilikoi Paides were the royal pages: sons of nobles who served the king and trained as officers. It was a school, not a building. "Basilikoi" alone means "the royal ones". Recommended name: The Royal Pages, with Basilikoi Paides as the second line. Your word is kept if you prefer it short.
- **Q: "Unlocks with the barracks"?** Recommended: It opens with the same technology as the Barracks (Bronzeworking). It does not need a Barracks in the town. The other reading is `requiresBuilding: barracks`.
- **Q: Which hexes are "in the city"?** Recommended: Hexes the city works that hold a strategic resource your empire can see, improved or not. This is how the Stable reads pastures.
- **Q: What does "a military building" feed?** Recommended: The Circus Maximus (+1 happiness for each military building), The Castellans (+6 production for each military and defensive building, Dominion Tier IV), and Mehmed-style lines that name the category. It does not count as defensive: that reading is "gives city defence or hit points" (`isFortification`), so Stockpiles and The Burhs do not read it.

### Genghis Khan: Building

- **You wrote:** "trade routes from this city can travel twice as far. +30% production towards mounted units, counts as a military building"
- **Final line:** **The Yam.** Trade routes from this city reach twice as far. +30% production toward mounted units. A military building.
- **Shape:** **Small extension.** Route range is one number (`routeRange`, `src/sim/trade.ts`), raised by `rulePercent` rows with `rule: routeRange` (The Trade Winds, +50%). It reads the empire's rows only. The row needs to be read for the origin city: `rulePercent` has a `scope`, and `routeRange` must test it against the city the route starts from. The +30% is the Stable's `productionBonus` field. `category: military` is data.
- **Arithmetic:** A1: range matters once the first trader exists; double range reaches the second or third neighbour, not only the first. A3: +30% on a Horseman (151 hammers) saves 35 hammers a unit. It stacks with the Stable's +25%.
- **Q: The name?** Recommended: The Yam, the Mongol relay stations. A retired Dominion card has that name (its row id differs). "The Horde Camp" is the other choice.
- **Q: One a city, or one an empire?** Recommended: One a city, as you wrote "from this city".

### Joan of Arc: Both abilities and the building

- **You wrote:** "lets revert: units killed spread their faith, your units gain strength in cities that follow your religion. … keep it as it was."
- **Final line:** **The Voices.** Killing a unit pays faith, and presses your faith on the towns around the field. **The Maid.** +4 combat strength on any ground that follows your faith. **The Sainte-Chapelle** as built.
- **Shape:** Built. "Revert" restores the three rows of today exactly. The Voices: `windfallRider` on `kill`, 8 faith, and 15 pressure on towns within 4 hexes. The Maid: `combatLine` +4, `when: followingTerritory` (all ground that follows your faith, not only cities). The Sainte-Chapelle: +3 faith, needs a Temple, military units may be bought with faith there, +1 artist renown.
- **Arithmetic:** A1: a kill every four turns is 2 faith a turn; The Maid does nothing before a religion spreads. A3: +4 on 45 is 9% on your faith's ground; a kill every two turns is 4 faith a turn.
- **Q: One line for your decision.** Recommended: Today's The Maid is the same rule as the Devotion card The Spiritual Host (+4 in territory that follows your religion), and The Voices is the shared card The Sacred Host (kills grant 15 faith) at half the size. They stack. You have chosen today's text, so nothing changes unless you say so.
- **Q: "In cities" or on all ground that follows?** Recommended: All ground that follows your faith, as built. "In cities" would be narrower than today.

### Mehmed the Conqueror: Ability I

- **You wrote:** "Barracks give +1 science, an additional +1 for every great scholar or great general you've recruited this game."
- **Final line:** **The Enderun.** Each Barracks gives +1 science, and +1 more for every great scholar and great general you have gained this game.
- **Shape:** Existing. Three `pays` rows with `scope: hasBuilding barracks`: one flat (+1 science), and two with `basis: count`, `count: greatPeopleGained`, `family: scholar` and `family: general` (The Mural Crown reads that count by family). They sit on the Barracks' own line, so a card that multiplies military buildings multiplies them.
- **Arithmetic:** A1: three Barracks and no great person, +3 science (under regular). A3, with 3 to 5 scholars and generals gained: 4 to 6 science a Barracks. Six towns: +24 to +36. Twelve towns: +48 to +72. It reaches a regular card at six towns and a strong one at twelve, and it grows all game.
- **Q: Is it for each Barracks?** Recommended: Yes: each town with a Barracks. A seat has one Barracks a town.
- **Q: Does a great person taken by capture or boon count?** Recommended: Yes: every scholar or general gained, however gained. The count is `greatPeopleByFamily`.

### Mehmed the Conqueror: Building

- **You wrote:** "change: +2 science, +2 faith, +1 happiness."
- **Final line:** **The Külliye.** +2 science, +2 faith, +1 happiness.
- **Shape:** Existing. A building row with flat fields. Category `science` is recommended, so it reads as a school.
- **Arithmetic:** A1: not yet open (age 3 or 4 column, to set). A3: eight towns, +16 science, +16 faith, +8 happiness.
- **Q: Which category?** Recommended: Science. It then counts for science-building cards (The Common Tables, The Royal Tutors). Faith is the other choice.

### Nezahualcoyotl: Ability I, The Dikes

- **You wrote:** "cities with an aqueduct gain +1 science and +1 production on farms. Aqueducts arrive late so this should be stronger."
- **Final line:** **The Dikes.** In cities with an Aqueduct, farms give +1 science and +1 production.
- **Shape:** Existing. Today's second row (`pays` on a farm hex, `scope: hasBuilding aqueduct`) gains `science: 1`; the city's +1 culture row goes.
- **Arithmetic:** The Aqueduct opens at Engineering (age 3), or at age 2 with the Surveying charter. A1: nothing. A3: eight towns with about five farms each, +40 science and +40 production (80 a turn): above a regular card (35 to 60), under a headline (100). The other reading (+1 science in the city, +1 production on each farm) gives +8 science and +40 production.
- **Q: Is the +1 science on each farm, or once in the city?** Recommended: On each farm. You asked for stronger, the ability pays nothing for two ages, and 80 a turn is inside the bar. If it proves too strong, the science goes to every second farm.

### Cyrus the Great: Ability I

- **You wrote:** "revise: cities connected by road gain +1 happiness and +2 culture for every civic and wildcard slot in your government."
- **Final line:** **The Cyrus Cylinder.** Cities joined to your capital by road gain +1 happiness. Your capital gains +2 culture for every Civic and Wildcard chair in your government.
- **Shape:** **Small extension.** The happiness is Pachacuti's row (`scope: connected`). The culture needs a count of chairs by type: `slottedOrdersOfSlot` counts cards seated, not chairs. A new count reads `slotTypesOf` (`statecraft/council.ts`), which already holds every chair a card, wonder or hall adds.
- **Arithmetic:** Civic and Wildcard chairs: Chiefdom 1; tier 4, 2 or 3; tier 10, 1 to 4 (Tyranny has 1, Theocracy 4); tier 18, 3 to 5; tier 26, 5 to 7. Recommended reading: A1, three joined towns and three chairs, +3 happiness and +6 culture (culture worth 18: a headline). A3, eight towns and five chairs, +8 happiness and +10 culture. The other reading pays the culture in every joined city: A1, +18 culture a turn against a median of 3; A3, +80; tier 26 with twelve towns, +168. That is four to six times a headline card in age 1.
- **Q: Is the culture paid once, or in every joined city?** Recommended: Once, in the capital. In every city it is the strongest line in the game from turn 32. If you want it between the two, pay +1 culture in each joined city for every two such chairs.
- **Q: Do chairs added by cards, wonders and the Assembly Hall count?** Recommended: Yes. They are chairs in your government, and the count reads the same list.
- **Q: "Connected by road" to what?** Recommended: To your capital, as Pachacuti's line reads. The capital counts as joined.

### Cyrus the Great: Improvement, The Paradise Garden

- **You wrote:** "that's so good. let's say +1 happiness and +1 culture and counts as a great person work."
- **Final line:** **The Paradise Garden.** A worker lays it on flat land beside a river, a lake or an oasis, one in each city. +1 culture, and +1 happiness in its city. It counts as a great-person work.
- **Shape:** **Small extension.** It is a real hex, so it is simpler than The Spirit Way's ghost work: the `greatWork` tile test admits it by a mark on the improvement row, and every reader of that test then reads it with no other change. Two things are missing: that mark, and happiness from an improvement (a hex pays yields only). One garden in each city is a placement rule, to add in `improvementError`.
- **Arithmetic:** A1 (Agriculture or a later column, to set): three gardens, +3 culture and +3 happiness. With cards, each garden is a full work: The Laureate (+5 culture, +3 science in its town), The Masters' Domain (+6 food, +6 production), The Hanlin Academy (+2 science), The Garden Courts (+20% culture and science in the town), The Bourgs (grows 50% faster), The Gobelins (+10% toward the Opus), and the goals of The Patron's Gallery and The Paradise Garden. A3 with eight gardens and The Masters' Domain alone: +96 a turn. With The Divine Proportion or the Paradise Garden reward that doubles. The Mausoleum doubles it again.
- **Q: How many gardens?** Recommended: One in each city. Without a limit, a worker makes works at will and the doublers reach several hundred a turn.
- **Q: Which rules of The Spirit Way apply?** Recommended: It has no family (cards that name an Academy, a Holy Site or another kind do not read it). Nothing "lays" it (The Landmark Bounds and The Founding Gift do not fire). Unlike a ghost work it has neighbours: The Quarter of Masters and The Processional Way read it, and a garden beside a real work pays both.
- **Q: Does it count for Hypatia-style lines and legacies?** Recommended: Yes, as any work: a line that multiplies a work's yields multiplies the garden's +1 culture and what cards put on it.

### Cleopatra: Building, The Museion

- **You wrote:** "let's buff this to +2 science for every great person called."
- **Final line:** **The Museion.** +2 science for every great person your realm has called this game.
- **Shape:** Existing. The built row's `amount` goes from 1 to 2.
- **Arithmetic:** A1: none or one called, 0 to 2. A3: 7 to 9 called, +14 to +18 science in each city that holds one. It is a building in every city, so eight cities give +112 to +144: a headline.
- **Q: One a city, or one an empire?** Recommended: As built: every city may hold one. At +2 that is a headline card in age 3. If that is too much, make it once an empire, which also suits the one Museion of Alexandria.

### Cleopatra: Ability II, The Queen's Alliances

- **You wrote:** "lets make this +4 gold and +2 culture per age."
- **Final line:** **The Queen's Alliances.** Your capital gains +4 gold and +2 culture for each age you have reached.
- **Shape:** Existing. A flat capital row (+4 gold, +2 culture) and a `pays` row with `basis: count`, `count: agesClosed` (ages closed is one less than ages reached, so the two rows together make "each age reached").
- **Arithmetic:** A1: +4 gold and +2 culture (culture worth 6): a regular card. A3: +12 gold and +6 culture (18): under regular. Age 4: +16 and +8. It no longer depends on deals or on the bots.
- **Q: Does this replace the count of deals?** Recommended: Yes, whole. The name stays; the line no longer reads deals.
- **Q: Where is it paid?** Recommended: In the capital, as before.

### Lorenzo de' Medici: Ability I, The Medici Bank

- **You wrote:** "let's change this to +1 renown for every 8 gold per turn you earn."
- **Final line:** **The Medici Bank.** +1 renown a turn for every 8 gold your empire makes each turn, at most +40.
- **Shape:** **Small extension.** `pays` with `basis: rate`, `fromRate: goldPerTurn`, `per: 8` exists (The Learned Clergy reads faith this way), but it pays a yield, happiness or authority. Renown is not a target (`PayTarget`). Add `renown` as a target, or give the `renown` effect a `fromRate`.
- **Arithmetic:** See the table below. A1: 5 to 15 gold a turn, +1 renown. A3: 47 gold for a median seat and 100 to 150 for a Commerce seat, +6 to +19. Age 4: 300 to 600 gold, +37 to +75. A normal seat calls 7 to 9 people by turn 150, about 20 renown a turn late. So at 150 gold this doubles a seat's great people, and at 600 gold with no cap it calls one about every 9 turns even at the eighth step of the ladder.
- **Q: Gross or net gold?** Recommended: The rate the game already has: `goldPerTurn`, the gold the empire banked this turn, after maintenance, never below zero. Gold spent on purchases does not lower it.
- **Q: A cap, or none?** Recommended: A cap of +40 a turn (320 gold a turn). Below the cap the line is as you wrote it. Without one, a late Commerce seat calls a great person every 4 to 9 turns for the rest of the game.
- **Q: Which family does it favour?** Recommended: None: it feeds the pool. The Bottega favours engineers and artists.

| Gold a turn | Renown a turn | Turns for the 1st person (75) | for the 4th (267) | for the 8th (654) | Turns for all eight (2,647) | With the cap of 40 | the 8th, capped | all eight, capped |
|---|---|---|---|---|---|---|---|---|
| 40 | 5 | 15 | 54 | 131 | 530 | 5 | 131 | 530 |
| 150 | 18.75 | 4 | 15 | 35 | 142 | 18.75 | 35 | 142 |
| 600 | 75 | 1 | 4 | 9 | 36 | 40 | 17 | 67 |

- The ladder: 75, 134, 197, 267, 346, 436, 538, 654. The line alone, with no other renown.
- At 40 gold a turn it is a slow second source: a person every 15 to 130 turns. At 150 it alone calls all eight in about 140 turns, which is what a whole normal seat does. At 600 it calls all eight in 36 turns.
- Bot seats made a median of 47 gold a turn in age 3 and 298 in age 4, so a Commerce seat passes 150 near the end of age 3 and 600 in age 4.
- So the line is modest for three ages and then runs away. The cap of +40 leaves it as you wrote it up to 320 gold a turn, and holds the late game to a person about every 17 turns from this line.

### Lorenzo de' Medici: Ability II

- **You wrote:** "lets change this to: gain 10% production towards wonders for every gold building in a city."
- **Final line:** **Florins.** A city builds wonders 10% faster for each gold building in it, at most +50%.
- **Shape:** Existing fields, one point to check. `productionBonus` with `category: wonder`, `percent: 10`, `count: buildingsOfCategory`, `max: 5`, counted in the city. For the builder to check: that the count on a `productionBonus` takes a building category and counts in the town (The Many Hands counts across the empire).
- **Arithmetic:** Gold buildings a city can hold: Market, Bazaar, Gilded Hall, Bank, Lighthouse, Assay House, Coinworks, Plantation House, and the two great houses. A1: one Market, +10%. A3: three or four in the wonder city, +30% to +40%, where the best wonder cards give +25% to +30%.
- **Q: In that city, or across the empire?** Recommended: In that city: its own gold buildings speed its own wonders.
- **Q: A cap?** Recommended: +50%, five buildings. With no cap a capital with eight gold buildings builds wonders at +80%.

### Lorenzo de' Medici: Building, The Bottega

- **You wrote:** "+5 renown towards great engineers and great artists (+10 total). +2 production for every luxury resource or great work in this city."
- **Final line:** **The Bottega.** +5 renown a turn toward great engineers and +5 toward great artists. +2 production for every luxury resource and great-person work in this city. One in your empire.
- **Shape:** Existing. Two `renown` effects with a `family` in the row's `effects` (the row's own `renown` field holds one family), and a `pays` row with `count: tilesInBorders`, `within: city` and a tile test for a luxury or a work. `oncePerEmpire` is a marker that exists.
- **Arithmetic:** A Barracks gives 1 renown a turn and The General Staff 2. One Bottega at +10 is about half a normal seat's late renown. A3: a city with three luxuries and two works, +10 production. If every city may hold one: eight cities give +80 renown a turn, a great person every 4 to 8 turns from this building alone.
- **Q: One in each city, or one in your empire?** Recommended: One in your empire. In each city it is +80 renown a turn by age 3, on top of The Medici Bank.
- **Q: Do the Paradise Garden and wonders under The Spirit Way count as works here?** Recommended: A real work on a hex counts. A ghost work does not: it has no hex in the city's borders.

### Harun al-Rashid: Ability I, The Storehouse of Wisdom

- **You wrote:** "+1 science and +1 faith on faith and science buildings. (these can be multiplied by orders)."
- **Final line:** **The Storehouse of Wisdom.** Faith buildings and science buildings give +1 science and +1 faith each.
- **Shape:** Existing, written so that it is multiplied. Four `pays` rows with `where: city`, `basis: count`, `count: buildingsOfCategory`, `within: city`: categories `faith` and `science`, each to science and to faith. `cardLinesOnBuilding` (`statecraft/evaluator.ts`) puts exactly these rows in each building's own package, and `buildingYieldPercent` ("buildings of a category produce X% more") multiplies the package. Al-Ma'mun's row uses `buildingsOfCategories`, which is not packaged, so it is not reused.
- **Arithmetic:** A1: four such buildings, +4 science and +4 faith (regular). A3: eight towns with four each, +32 and +32 (64: the top of regular). With a card that makes science buildings pay half again, the science-building half becomes +24 and +24.
- **Q: Does a building that is both count twice?** Recommended: No. A building has one category, so each building pays once.

### Justinian: Ability II

- **You wrote:** "+2 happiness and +5 production on holy sites."
- **Final line:** **One Faith, One Empire.** Each holy site gives +5 production and +2 happiness.
- **Shape:** Existing. `pays` on the hex (`improvement: holySite`, `production: 5`), and `pays` to happiness with `count: tilesInBorders` and the same tile test. A hex cannot hold happiness, so that half is an empire line.
- **Arithmetic:** A holy site needs a prophet's two charges. A1: none. A3: two or three sites, +10 to +15 production and +4 to +6 happiness. Under a regular card; The Anchorites (a further site for one charge) and The Saints' Fields stack with it.
- **Q: Is the happiness for the city that works the site, or the empire?** Recommended: The empire's happiness, +2 for each site you hold. The game has one happiness figure.
- **Q: Must the site be worked?** Recommended: The production needs a citizen on the hex, as any hex yield. The happiness does not.

### Justinian: Building, The Basilica

- **You wrote:** "+3 faith and +3 city defense. +20% production towards wonders if the city has a holy site (should unlock in age 2, counts as a defensive building and a faith building)."
- **Final line:** **The Basilica.** +3 faith and +3 city defence. Its city builds wonders 20% faster if it works a holy site. A faith building and a defensive building.
- **Shape:** Existing: no change to the types is needed. A building has one category, so it is `category: faith`. "Defensive" is not a category: the game calls a building a fortification when it gives city defence or hit points (`isFortification`, `src/sim/buildingData.ts`), so `cityStat: defense 3` makes it one. The wonder line is a `productionBonus` with `scope: hasImprovement holySite`. Its column is The High Temple's (age 2), with the Temple.
- **Arithmetic:** A1: not open. A3: eight towns, +24 faith; +20% toward wonders in the one or two holy-site towns (Akhenaten had this line as an ability). It feeds Stockpiles (+8 food), The Burhs (+3 defence), The Castellans (+6 production) and The Sacred Precincts (+3 defence), and every faith-building card.
- **Q: Does it need a Temple first?** Recommended: No. It opens with the Temple's technology and stands alone.

### Sejong the Great: Ability II, The Royal Lectures

- **You wrote:** "Each time you complete a technology, gain an extra turn of renown."
- **Final line:** **The Royal Lectures.** Each time you complete a technology, gain renown equal to one turn of your renown.
- **Shape:** **Small extension.** `windfallRider` on `tech` exists, and a grant can pay renown, but only as a fixed number. `fromRate` has no renown rate. Add `renownPerTurn` to `RateSource` and let the grant's renown read it.
- **Arithmetic:** A technology comes about every seven turns, so this is about +14% renown. A1: 1 to 3 renown a technology. A3: about 20 a technology, 3 a turn. It is small: Hypatia's line was +25% renown. Three turns of renown (+43%) would be felt.
- **Q: Which families does the extra turn feed?** Recommended: The same split as that turn's renown, family by family.
- **Q: Is one turn enough?** Recommended: It is your line and it is safe. I would make it two or three turns.

### Sejong the Great: Building, The Hall of Worthies

- **You wrote:** "Rework: +5 renown towards scholars. +4 science."
- **Final line:** **The Hall of Worthies.** +4 science, and +5 renown a turn toward great scholars. One in your empire.
- **Shape:** Existing. A building row with `science: 4`, `renown: {family: scholar, perTurn: 5}` and `oncePerEmpire`.
- **Arithmetic:** A1: if it opens with the Library, +4 science doubles a median seat's science; set its column in age 2. A3: +5 scholar renown is a quarter of a normal seat's renown. In every city it would be +40 renown and +32 science.
- **Q: One in each city, or one in your empire?** Recommended: One in your empire, for the reason given for the Bottega. The Hall was one house in the palace.

## 2. Jayavarman VII, for Expansionist + Devotion

- **Who:** King of the Khmer empire from 1181 to about 1218. They took Angkor back after its sack, built the walled city of Angkor Thom and the Bayon with its towers of faces, and raised 102 hospitals and 121 rest houses along the royal roads. They were a Buddhist king; their own inscriptions say they felt the sickness of their people as their own.
- **Fit:** **Expansionist, the engine and public works** (citizens, and the buildings that let towns grow). Their cards read citizens gained and spent, and roads that join towns.
- **Fit:** **Devotion, the devout realm** (Shrines and faith buildings first, then devout towns). Their cards read Shrines, Temples and other faith buildings: faith, food, happiness, defence, and purchases with faith.
- **Ability I, The Hospitals of the King:** Faith buildings give +2 food and +1 happiness each.
  - Shape: Existing. Two `pays` rows with `count: buildingsOfCategory`, `category: faith`, `within: city`, to food and to happiness (Houses of Account pays happiness this way). The food sits on each building's own line, so Orders that multiply faith buildings multiply it.
  - Arithmetic: A1: three Shrines, +6 food and +3 happiness (a regular card, near a headline). A3: sixteen faith buildings, +32 food and +16 happiness (regular).
- **Ability II, The Great City:** Finishing a faith building adds 1 citizen to its city.
  - Shape: Existing. `windfallRider` on `buildingCompletion` with `buildingCategory: faith` and `grant: {citizens: 1}`; the grant goes to the town the moment names. For the builder to check: that a building bought with faith also pays it.
  - Arithmetic: A1: three Shrines, three citizens of about fifteen (each is 2 to 3 yield a turn, or a levy). A3: about sixteen faith buildings finished, sixteen citizens of seventy. It changes play: temples come before granaries, and each one is a citizen to work or to spend.
- **Unique unit:** **Ballista Elephant** (new row): stands in the War Elephant line (age 3). It has a ranged attack with range 2. The Bayon's reliefs show them. The base War Elephant exists.
- **Building:** **The House of Fire** (new building, a faith building): the rest houses of the royal roads. +2 faith and +2 food. Its city must be joined to your capital by road.
- **Start bias:** Terrain: river 4, lake 2, forest 1; wants `riverOrFloodplainWithin 1`. Served today (Nezahualcoyotl's want).
- **Colours:** Angkor sandstone, forest green (`#c9a27a`, `#1e6a45`).
- **Charge:** A naga with seven heads spread as a fan, from the causeways of Angkor Thom. The three towers of Angkor Wat are on the flag of Cambodia and belong to another king, so they are not used.
- **Cities:** Angkor Thom · Phimai · Banteay Chhmar · Lavo · Beng Mealea · Koh Ker
- **Bot persona:** `wide`, with the zealot's faith weights: roads to every town, a Shrine first in each.
- **Portrait (3:4, gouache poster):** After the seated portrait statue in Phnom Penh: a heavy-set man of sixty, hair in a small knot, eyes lowered, a slight smile, bare shoulders and a plain cloth. A stone face tower behind, half in fig roots, green morning light.
- **Overlaps and risks:** Angkor Wat is a wonder in the game and was built by Suryavarman II, sixty years earlier, for Vishnu. Nothing here uses or needs it, and a rival may build it. The Bayon is not in the game. Buddhism is a living faith: the abilities name hospitals, a city and roads, never a teaching, and the game's religions have invented names. The year of their death is uncertain. They are on the shelf in `docs/leaders.md` with other lines (rites, wonders); this design is new. The House of Fire also reads roads, as Pachacuti's and Cyrus's lines do: three leaders of Expansionist now reward roads.
- **Confidence:** good.

**An alternate, if they do not suit: Ramesses II** (Egyptians, ruled 1279 to 1213 BC).

- The builder pharaoh of Abu Simbel and the Ramesseum; the best-known king of Egypt, which loses Akhenaten.
- Takes all of Akhenaten's built kit: the Khopesh, the Obelisk, the ankh banner, the colours, the start bias, and The Nile's Gift (+1 faith on watered farms) as it is. Ancient Egypt is the pair's own model in `deck-design.md`. The cheapest seat on the page. It adds no region the roster lacks.

## 3. Your two questions on Genghis Khan

### What does the Horde Camp do?

- It is a military building of the fifth column (`hordeCamp` in `data/buildings.json`), built for Modu Chanyu.
- Every pasture its town works gives +1 faith.
- A unit of yours regains its movement each time it steps onto one of those pastures (`restoresMovementOn: pasture`).
- It gives no production and no renown. The faith is Devotion's, which is not one of Genghis Khan's decks. Your line replaces it: see "The Yam" in the readings.

### Should the colours change?

- Modu Chanyu's built colours are sky blue `#3a78b5` and bone `#efe6d2`. I proposed the same two, because the banner and pieces exist and the blue is the Eternal Blue Sky that the Mongols also swore by.
- They do not clash with anyone in the sixteen. The nearest primaries are Joan of Arc's azure and Sejong's navy, both over the rule of 40 and told apart by how light they are.
- What players expect: other games paint the Mongols red or dark red. Here red is taken twice over (Mehmed's Ottoman red, Qin's cinnabar, and Pachacuti's maroon).
- **Recommended: keep sky blue and bone.** It is true to the subject, it is built, and it keeps a fourth red off the map. If you want a change, the device can change alone: a white horse-tail standard in place of the sun and moon.

## 4. The roster as it stands: ready for the build, except the open readings

A struck line is my first proposal; your line follows it. The mark at the end of each row says where the row comes from.

### Alexander the Great (Dominion + Expansionist)

- **State:** selected, with your changes.
- **Ability I:** **The Unbroken Charge.** Your units gain +3 combat strength when they attack. Capturing a city heals all your units. *(as designed)*
- **Ability II:** ~~The Alexandrias. Capturing a city grants a Settler.~~ **The Royal Army.** Gaining a military unit grants science equal to half its strength. *(your line)*
- **Unique unit:** **Hypaspist**: stands in the Swordsman line (age 2). +1 movement and +5 strength against cities. The base Swordsman exists. *(new row)*
- **Building:** ~~The Gymnasium.~~ **The Royal Pages** (Basilikoi Paides). +2 culture. Each strategic resource the city works gives +1 science and +1 culture. A military building, opened with the Barracks' technology. *(your line)*
- **Start bias:** Terrain: river 2, hills 0.6, coast 0.4. No hard want. The map script serves it today.
- **Colours:** Tyrian purple, sun gold (`#6b2d7a`, `#e3b93a`; Mithridates' purple).
- **Charge:** The ram's horns of Ammon, from their coin portraits. The Vergina sun is disputed between Greece and North Macedonia, so it is not used.
- **Cities:** Pella · Aigai · Amphipolis · Alexandria Eschate · Bucephala · Kandahar
- **Bot persona:** `warmonger`: attacks early and keeps the army moving.
- **Portrait:** Young, clean-shaven, a white diadem band, the linen cuirass of the Alexander Mosaic. A long spear in one hand, a rolled map in the other, a dry plain at dusk behind.

### Genghis Khan (Dominion + Commerce)

- **State:** selected, with your changes.
- **Ability I:** **The Riders of the Steppe.** Mounted units gain +1 movement on grassland and plains. Pillaging pays half again. *(inherited, built)*
- **Ability II:** **The Pax Mongolica.** Your traders cannot be plundered. Trade routes pay +3 gold. *(as designed)*
- **Unique unit:** **Keshig**: the Xiongnu Horse Archer row with a new name (age 3, 5 movement). *(inherited, built)*
- **Building:** ~~The Horde Camp, as built.~~ **The Yam.** Trade routes from this city reach twice as far. +30% production toward mounted units. A military building. *(your line)*
- **Start bias:** Modu Chanyu's row as it is: grassland 0.45, plains 0.4, hills -0.3; wants `pastureGroundWithin 3`; horses furnished. Served today.
- **Colours:** sky blue, bone (`#3a78b5`, `#efe6d2`; Modu Chanyu's, as built).
- **Charge:** Modu Chanyu's sun and moon banner can stay: both are steppe signs. Or a horse-tail standard.
- **Cities:** Karakorum · Avarga · Almaliq · Samarkand · Zhongdu · Sarai
- **Bot persona:** `warmonger`, with more mounted units in the army mix and routes kept running at war.
- **Portrait:** Older, broad-faced, a fur-trimmed robe and a plain cap, after the Yuan court album (painted after their death; no portrait from life exists). A white horse-tail standard, steppe at dawn.
- **Note:** Inherited from Modu Chanyu: ability I, the unit row, the start bias, the colours and the sun and moon banner.

### Joan of Arc (Dominion + Devotion)

- **State:** selected: today's abilities and building.
- **Ability I:** ~~Killing a unit grants faith equal to its strength.~~ **The Voices.** Killing a unit pays faith, and presses your faith on the towns around the field. *(built)*
- **Ability II:** ~~Every city may buy military units with faith; they start as Veterans.~~ **The Maid.** +4 combat strength on any ground that follows your faith. *(built)*
- **Unique unit:** **The Gendarme**, as built. *(built)*
- **Building:** **The Sainte-Chapelle**, as built: +3 faith, and military units may be bought with faith in its city. *(built)*
- **Start bias:** As today: river 3, no hard want.
- **Colours:** royal azure, gold (`#2c3e9e`, `#d9a521`; as built).
- **Charge:** The single fleur-de-lis, approved 2026-09-19.
- **Cities:** Orléans · Reims · Paris · Bourges · Chinon · Rouen (the list of today)
- **Bot persona:** `zealot` that also attacks: a new persona row, zealot weights with the warmonger's war settings.
- **Portrait:** A young soldier in plain plate armour, short dark hair, no helmet. A white banner in hand, the walls of Orléans behind, morning light.
- **Note:** Nothing to build. The whole kit is today's.

### Mehmed the Conqueror (Dominion + Scientific)

- **State:** selected, with your changes.
- **Ability I:** ~~Military buildings give +2 science each.~~ **The Enderun.** Each Barracks gives +1 science, and +1 more for every great scholar and great general you have gained this game. *(your line)*
- **Ability II:** **The Great Bombard.** Your units gain +5 combat strength against cities. Capturing a city grants science equal to thirty times its population. *(as designed)*
- **Unique unit:** **Janissary**: stands in the Longswordsman line (age 4). Starts as a Veteran. The base Longswordsman exists; the game has no gunpowder foot unit to stand in for. *(new row)*
- **Building:** ~~+2 science, +2 food and +1 happiness.~~ **The Külliye.** +2 science, +2 faith, +1 happiness. *(your line)*
- **Start bias:** Terrain: coast 1.5, hills 0.6, river 2. No hard want (a coast want was served on half of boards for Zheng He).
- **Colours:** Ottoman red, white (`#d81e2c`, `#f5f1e6`; new).
- **Charge:** The çintamani: three discs over two wavy lines, a pattern of their court robes. It is not the crescent of a modern flag.
- **Cities:** Istanbul · Edirne · Bursa · Thessalonica · Trebizond · Sarajevo
- **Bot persona:** `warmonger` that builds siege engines first and attacks the nearest walled capital.
- **Portrait:** Thirty, hooked nose, a red robe and a large white turban, after the Bellini portrait and the one where they smell a rose. A bronze bombard behind, sea walls beyond.

### Qin Shi Huang (Dominion + Magisterial)

- **State:** selected as designed ("this design is great").
- **Ability I:** **The Great Works of Qin.** Garrisoned cities build wonders and buildings 25% faster. *(as designed)*
- **Ability II:** **The Registered Households.** Every city gains +1 production for every three citizens. *(as designed)*
- **Unique unit:** **Qin Crossbowman**: stands in the Bowman line (age 2). +3 ranged strength, and it costs as an Archer does (size `light`). *(new row)*
- **Building:** **The Commandery** (building): the benched Post Station with a new name. Its town builds faster while a road joins it to the capital. Qin built the straight roads. *(inherited, built)*
- **Start bias:** Taizong's row as it is: grassland 0.9, river 2; wants `grasslandWithin 2`. Served today.
- **Colours:** cinnabar, lacquer black (`#a83224`, `#1c1a1a`; new).
- **Charge:** A round coin with a square hole (the ban liang), the sign of one coinage.
- **Cities:** Xianyang · Yong · Yueyang · Handan · Linzi · Langya
- **Bot persona:** `wide`, with a garrison in every town and wonders high in the build order.
- **Portrait:** A heavy-set man in black robes with a flat beaded crown (the mianguan), drawn as later ages imagined them; no portrait from life exists. Ranks of clay soldiers behind, lamp light.
- **Note:** Inherited: Taizong's start bias, and the benched Post Station row as the Commandery.

### Pachacuti (Expansionist + Commerce)

- **State:** approved, stays.
- **Ability I:** **The Qhapaq Ñan.** Every city joined to your capital by road pays +1 happiness and +1 production. *(built)*
- **Ability II:** **The Gold of the Peaks.** Farms pay +1 gold for every mountain standing beside them. *(built)*
- **Unique unit:** **The Slinger**, as built. *(built)*
- **Improvement:** **Terraces**, as built. *(built)*
- **Start bias:** As built: river 6, hills 1.5, mountain 2.5; wants `mountainWithin 2`, `riverWithin 1`.
- **Colours:** maroon, sun gold (`#8b2635`, `#e0b21a`; as built).
- **Charge:** The sun of Inti, as built.
- **Cities:** Cusco · Quito · Tumebamba · Cajamarca · Vilcashuamán · Huánuco Pampa
- **Bot persona:** `wide`.
- **Portrait:** A man of forty with the red fringe of the Sapa Inca on the brow, gold ear discs, a checked tunic. A stone road climbing terraces behind, high clear light.
- **Note:** A note only: The Qhapaq Ñan is under a regular card in age 3.

### Jayavarman VII (Expansionist + Devotion)

- **State:** designed here; you have not seen it.
- **Ability I:** **The Hospitals of the King.** Faith buildings give +2 food and +1 happiness each. *(for your review)*
- **Ability II:** **The Great City.** Finishing a faith building adds 1 citizen to its city. *(for your review)*
- **Unique unit:** **Ballista Elephant** (new row): stands in the War Elephant line (age 3). It has a ranged attack with range 2. The Bayon's reliefs show them. The base War Elephant exists. *(for your review)*
- **Building:** **The House of Fire** (new building, a faith building): the rest houses of the royal roads. +2 faith and +2 food. Its city must be joined to your capital by road. *(for your review)*
- **Start bias:** Terrain: river 4, lake 2, forest 1; wants `riverOrFloodplainWithin 1`. Served today (Nezahualcoyotl's want).
- **Colours:** Angkor sandstone, forest green (`#c9a27a`, `#1e6a45`; new).
- **Charge:** A naga with seven heads spread as a fan, from the causeways of Angkor Thom. The three towers of Angkor Wat are on the flag of Cambodia and belong to another king, so they are not used.
- **Cities:** Angkor Thom · Phimai · Banteay Chhmar · Lavo · Beng Mealea · Koh Ker
- **Bot persona:** `wide`, with the zealot's faith weights: roads to every town, a Shrine first in each.
- **Portrait:** After the seated portrait statue in Phnom Penh: a heavy-set man of sixty, hair in a small knot, eyes lowered, a slight smile, bare shoulders and a plain cloth. A stone face tower behind, half in fig roots, green morning light.

### Nezahualcoyotl (Expansionist + Scientific)

- **State:** selected, with your change to The Dikes.
- **Ability I:** ~~Cities with an aqueduct pay +1 culture, and their farms +1 production.~~ **The Dikes.** In cities with an Aqueduct, farms give +1 science and +1 production. *(your line)*
- **Ability II:** **Flower and Song.** +1 culture for every two citizens in your capital. *(built)*
- **Unique unit:** **The Eagle Warrior**, as built. *(built)*
- **Building:** **The Tetzcotzinco**, as built. *(built)*
- **Start bias:** As built: lake 2.5, river 2; wants `riverOrFloodplainWithin 1`, `lakeWithin 2`.
- **Colours:** turquoise, ochre (`#1fb3a5`, `#c98b2e`; as built).
- **Charge:** The Tlaloc mask, approved 2026-09-19.
- **Cities:** Texcoco · Tenochtitlan · Tlacopan · Huexotla · Coatlinchan · Teotihuacan
- **Bot persona:** `tall`.
- **Portrait:** A man of fifty in a turquoise mosaic diadem and a knotted blue cloak. A codex open on the knee, the hill gardens and the aqueduct of Tetzcotzinco behind, late sun on the lake.

### Cyrus the Great (Expansionist + Magisterial)

- **State:** selected, with your changes.
- **Ability I:** ~~Every city gains +1 culture and +1 happiness.~~ **The Cyrus Cylinder.** Cities joined to your capital by road gain +1 happiness. Your capital gains +2 culture for every Civic and Wildcard chair in your government. *(your line)*
- **Ability II:** **The King's Gardeners.** Cities you found start with a Worker. *(as designed)*
- **Unique unit:** **Sparabara**: stands in the Phalanx line (age 2). +5 strength when it defends. The card The Immortals exists (it is about great people), so the unit is not an Immortal. *(new row)*
- **Improvement:** ~~+1 food and +2 culture.~~ **The Paradise Garden.** On flat land beside fresh water, one in each city. +1 culture, and +1 happiness in its city. It counts as a great-person work. *(your line)*
- **Start bias:** Terrain: river 4, plains 0.4, oasis 2; wants `riverWithin 2`. Served today.
- **Colours:** Susa glaze teal, gold (`#0f7c8c`, `#dcae3a`; new).
- **Charge:** A twelve-petal rosette, as on the stone of Persepolis. The winged figure (the Faravahar) is a sign of a living faith, so it is not used.
- **Cities:** Pasargadae · Ecbatana · Susa · Babylon · Sardis · Anshan
- **Bot persona:** `wide`: many towns, workers first, war only when attacked.
- **Portrait:** A man of fifty with a curled beard, a long pleated robe and a plain fluted crown. A hand on a clay cylinder, a walled garden with water channels behind, soft morning.

### Mansa Musa (Commerce + Devotion)

- **State:** approved, stays.
- **Ability I:** **The Gold of Wangara.** +2 gold on mines and camps, and +1 gold on every desert hex worked. *(built)*
- **Ability II:** **The Hajj.** Trade routes that begin or end at a city holding a holy site pay +2 gold and +2 faith. *(built)*
- **Unique unit:** **The Mandekalu**, as built. *(built)*
- **Building:** **The Sankore Madrasa**, as built. *(built)*
- **Start bias:** As built: desert 2, river 2, oasis 2; wants `aridWithin 2`; gold furnished. The arid want was served on 30% of boards.
- **Colours:** Wangara gold, indigo (`#e6c419`, `#27306e`; as built).
- **Charge:** The royal parasol, as built.
- **Cities:** Niani · Timbuktu · Djenné · Gao · Walata · Kumbi Saleh
- **Bot persona:** `balanced`, with gold and routes weighted up.
- **Portrait:** Seated as on the Catalan Atlas: a gold crown, a white robe, a gold nugget held up in one hand. A mud-brick mosque and a camel train behind, noon light.
- **Note:** A note only: The Hajj pays nothing before the first holy site, in age 2 or later.

### Cleopatra (Commerce + Scientific)

- **State:** selected ("great, i like her kit"), with two changes.
- **Ability I:** **Books from the Ships.** Your trade routes pay +2 science, and your foreign routes +2 more. *(as designed)*
- **Ability II:** ~~+4 gold and +2 culture for each empire you hold a deal with.~~ **The Queen's Alliances.** Your capital gains +4 gold and +2 culture for each age you have reached. *(your line)*
- **Unique unit:** **The Alexandrian Galley**, as built. *(inherited, built)*
- **Building:** ~~+1 science for every great person called.~~ **The Museion.** +2 science for every great person your realm has called this game. *(your line)*
- **Start bias:** Hypatia's row as it is: coast 2, river 3; wants `coastalWithin 1`, `riverWithin 2`.
- **Colours:** papyrus, deep lapis (`#e8dcae`, `#1c3f7a`; Hypatia's, as built).
- **Charge:** The knot of Isis (the tyet). It stands apart from the ankh.
- **Cities:** Alexandria · Cyrene · Ptolemais · Naucratis · Canopus · Pelusium (Hypatia's list)
- **Bot persona:** `tall`: one great port city, deals accepted readily, war avoided.
- **Portrait:** A woman of thirty with the broad diadem band and the knot of hair of their coin portraits, a Greek gown, a strong nose. Scrolls and a ship model on a table, the Pharos through the window.
- **Note:** Inherited from Hypatia: the unit, the building row, the city list, the colours and the start bias.

### Lorenzo de' Medici (Commerce + Magisterial)

- **State:** selected, with your changes.
- **Ability I:** ~~+1 renown a turn for every 100 gold in your treasury, at most +12.~~ **The Medici Bank.** +1 renown a turn for every 8 gold your empire makes each turn, at most +40. *(your line)*
- **Ability II:** ~~Gold buildings give +2 culture each.~~ **Florins.** A city builds wonders 10% faster for each gold building in it, at most +50%. *(your line)*
- **Unique unit:** **Condottiere**: stands in the Longswordsman line (age 4). It costs 40% less to buy with gold (`purchaseRider` on its own type). *(new row)*
- **Building:** ~~+1 production, +1 culture and +1 renown a turn.~~ **The Bottega.** +5 renown a turn toward great engineers and +5 toward great artists. +2 production for every luxury resource and great-person work in this city. One in your empire. *(your line)*
- **Start bias:** Terrain: river 3, hills 1; wants `riverWithin 1`. Served today.
- **Colours:** iris violet, florin gold (`#7b5ea7`, `#e0b548`; new).
- **Charge:** The Medici balls: six discs on a shield. The Florentine lily is too close to Joan's.
- **Cities:** Florence · Pisa · Arezzo · Volterra · Prato · Pistoia
- **Bot persona:** `tall`: holds a treasury, buys buildings, avoids war.
- **Portrait:** A dark-haired man of forty with a broken-looking flat nose and a strong jaw, a plain red gown, after the Verrocchio bust and the Vasari portrait. A ledger and a small bronze on the desk, the dome of Florence in the window.
- **Note:** The caps (+40, +50%) and "one in your empire" are my recommended readings, not your words.

### Harun al-Rashid (Devotion + Scientific)

- **State:** selected, with your change.
- **Ability I:** ~~Each faith or science building gives its city +1 science and +1 faith.~~ **The Storehouse of Wisdom.** Faith buildings and science buildings give +1 science and +1 faith each (on the building's own line, so Orders multiply it). *(your line)*
- **Ability II:** **The Learned Court.** Completing a technology grants faith equal to a fifth of its cost. *(as designed)*
- **Unique unit:** **The Camel Archer**, as built. *(inherited, built)*
- **Building:** **The House of Learning**, as built. *(inherited, built)*
- **Start bias:** Al-Ma'mun's row as it is: river 5, coast 0.6; wants `riverWithin 2`.
- **Colours:** Abbasid black, gold (`#1c1a1a`, `#d4a934`; Al-Ma'mun's, as built).
- **Charge:** Al-Ma'mun's palmette on the black field, as built.
- **Cities:** Baghdad · Raqqa · Kufa · Basra · Merv · Rayy (Al-Ma'mun's list without Samarra, which was built after them)
- **Bot persona:** `zealot`, with science weighted beside faith.
- **Portrait:** A man of forty with a full dark beard, a black robe and turban with gold bands. A brass water clock and a pile of books, the round city of Baghdad at night behind, lamp light.
- **Note:** Inherited from Al-Ma'mun: the unit, the building, the colours, the banner and the start bias.

### Justinian (Devotion + Magisterial)

- **State:** selected over Ashoka, with your changes.
- **Ability I:** **Solomon, I Have Surpassed You.** Completing a wonder grants faith equal to its production cost. *(as designed)*
- **Ability II:** ~~Faith buildings give +1 happiness and +1 culture each.~~ **One Faith, One Empire.** Each holy site gives +5 production and +2 happiness. *(your line)*
- **Unique unit:** **Cataphract**: the retired row (age 3, +5 against ranged units), opened again for this seat. *(inherited, built)*
- **Building:** ~~+2 faith, +2 culture and +3 city defence.~~ **The Basilica.** +3 faith and +3 city defence. Its city builds wonders 20% faster if it works a holy site. A faith building and a defensive building, opened in age 2. *(your line)*
- **Start bias:** Terrain: coast 2, hills 0.6, river 2. No hard want.
- **Colours:** porphyry, mosaic gold (`#5a1e4a`, `#d9b23c`; new).
- **Charge:** A dome on four arches. The double-headed eagle is 700 years later.
- **Cities:** Constantinople · Ravenna · Carthage · Thessalonica · Antioch · Justiniana Prima
- **Bot persona:** `tall`: wonders in the capital, walls, a small strong army.
- **Portrait:** The Ravenna mosaic as a living man: round face, dark eyes, a purple cloak with a gold panel and a jewelled crown. A model of the great church in hand, gold light.
- **Note:** Inherited: the retired Cataphract row, opened again.

### Sejong the Great (Scientific + Magisterial)

- **State:** selected, with your changes.
- **Ability I:** **The Correct Sounds.** Every city gains +1 science and +1 culture for every four citizens. *(as designed)*
- **Ability II:** ~~Each time you gain a great person, gain science equal to four turns of your science.~~ **The Royal Lectures.** Each time you complete a technology, gain renown equal to one turn of your renown. *(your line)*
- **Unique unit:** **Hwacha**: stands in the Trebuchet line (age 4). +10 ranged strength against units, and no bonus against cities. *(new row)*
- **Building:** ~~The Museion's rule, +1 science for every great person called.~~ **The Hall of Worthies.** +4 science, and +5 renown a turn toward great scholars. One in your empire. *(your line)*
- **Start bias:** Terrain: river 3, hills 1, coast 0.5; wants `riverWithin 2`. Served today.
- **Colours:** ink navy, porcelain white (`#25346b`, `#f3f1ea`; new).
- **Charge:** The bowl sundial of their reign (the angbuilgu): a half circle with a pointer.
- **Cities:** Hanseong · Gaeseong · Pyongyang · Gyeongju · Jeonju · Hamhung
- **Bot persona:** `tall`: science first, great people of any family taken when offered.
- **Portrait:** A man of forty in the red dragon robe and the black winged cap of a Joseon king, a gentle scholarly face, after the modern standard portrait (none from life survives). A printed page of the new letters in hand, a water clock behind.

### Ibn Battuta (Every deck)

- **State:** stays ("ibn battuta is great, he's my favorite").
- **Ability I:** **A Guest at Every Court.** One more chair in every government. *(built)*
- **Ability II:** **The Rihla.** The first redraw of every hand you are dealt costs nothing: an Order, a Doctrine or a great person, and never a belief. *(built)*
- **Unique unit:** **The Rihla Caravan**, as built. *(built)*
- **Building:** **The Funduq**, as built. *(built)*
- **Start bias:** None, as built.
- **Colours:** ochre, sea teal (`#b5651d`, `#0d6b78`; as built).
- **Charge:** As built.
- **Cities:** Tangier · Fez · Marrakesh · Sijilmasa · Ceuta · Tlemcen
- **Bot persona:** `balanced`.
- **Portrait:** A traveller of forty in a plain wool cloak and a white turban, a staff and a satchel of papers. A caravan and a harbour behind, clear noon light.
- **Note:** The sixteenth seat. It plays every deck (`rainbow: true`) and stands outside the fifteen pairs. Both abilities are draft effects. No start bias, by design.

## 5. Who is out, the rows of the leaders who leave, and the clashes

- **Not selected** (designed in the first pass, kept in the record below): Saladin, Augustus, Ashoka, Isabella of Castile ("i dont like isabella as a pick"), Hatshepsut ("not needed").
- **Leaving the game:** Emperor Taizong, Modu Chanyu, Akhenaten, Al-Ma'mun, Mithridates VI, Zheng He, Hypatia, Hildegard of Bingen.
- **Their rows.** A save is `{config, log}`, and a config that names a missing leader does not replay. So the eight rows stay in `data/leaders.json`, hidden. `LeaderDef` has no such flag today: the code needs a `retired` field on the row, checked at load (`src/sim/leaderData.ts`), and the leader screen, the random seat and the Compendium shelf must skip a retired row (`src/ui/leaderSelect.ts` and the roster readers). Removing the rows needs no code and breaks every save that seats one of the eight.
- **Their pieces.** Rows that a new leader takes are renamed or pointed at the new leader (the Xiongnu Horse Archer, the Alexandrian Galley, the Museion, the Camel Archer, the House of Learning, the Post Station, the Cataphract). The rest stay on the bench with `unlockedByLeader` and nobody to open them: the Tang Heavy Cavalry, the Examination Court, the Horde Camp, the Khopesh, the Obelisk, the Pontic Peltast, the Mountain Hold, the Treasure Ship, the Longjiang Dockyard, the Canoness, the Scriptorium.
- **A retired leader who keeps a piece a new leader uses** (Modu and the Keshig, Hypatia and the Museion, Al-Ma'mun and the House of Learning) still names it in an old save. If the row is renamed and changed, an old save replays with the new rule. Accept that, or give the new leader a copy of the row.

### Clashes the roster settles or leaves

- **Hypatia** leaves as a leader and stays a great person (scholar, age 3). The leader key `hypatiaOfAlexandria` stays on the hidden row; the clash is over.
- **Ibn Battuta** stays a leader, so the great person row with that name is renamed. The great people pass proposes Ibn Jubayr (change C25).
- **Zheng He** leaves as a leader; the great person row of that name is already retired.
- **Cosimo de' Medici** (merchant, age 5) stands beside Lorenzo. A Florentine seat can call Lorenzo's grandfather. Recommended: replace the row (Jacques Cœur suits the age), in the great people pass. To accept it is also defensible: every other seat can call Cosimo too.
- **Wonders that are a selected leader's own:** The Terracotta Army and The Great Wall (Qin), Hagia Sophia (Justinian, and Mehmed's mosque), The Great Library and The Great Lighthouse (Cleopatra's city), The House of Wisdom (Harun's city), Machu Picchu (Pachacuti), The Great Mosque of Djenné (Mansa Musa's realm). Angkor Wat is not Jayavarman's. None is required by any ability.
- **Two capitals in one city:** Justinian's list starts with Constantinople and Mehmed's with Istanbul. Alexander's list leaves Alexandria to Cleopatra.

## 6. The recount

- **Sixteen seats:** fifteen pairs and Ibn Battuta. Seven are built already or inherit most of a kit (Joan, Pachacuti, Nezahualcoyotl, Mansa Musa, Ibn Battuta; Genghis Khan, Cleopatra and Harun inherit). Seven kits are fully new: Alexander, Mehmed, Qin, Jayavarman VII, Cyrus, Lorenzo, Sejong. Justinian is new but for the unit.
- **Women: two of sixteen** (Joan of Arc, Cleopatra). Today it is three of thirteen. Isabella and Hatshepsut were the other two.
- **Regions:** Europe and Byzantium four (Alexander, Joan, Lorenzo, Justinian); the Middle East, Egypt and North Africa five (Mehmed, Cyrus, Cleopatra, Harun, Ibn Battuta); East Asia and the steppe three (Qin, Sejong, Genghis Khan); the Americas two; Southeast Asia one (Jayavarman VII, new); sub-Saharan Africa one (Mansa Musa). South Asia has none, since Ashoka is not selected.
- **Time:** four ancient (Cyrus, Alexander, Qin, Cleopatra); six between 500 and 1400 (Justinian, Harun, Jayavarman VII, Genghis Khan, Mansa Musa, Ibn Battuta); six in the 15th century. Jayavarman VII fills the gap that Isabella's century did not.
- **What Jayavarman VII changes:** the first seat from Southeast Asia, a seat in the empty 12th century, and no charged history beside the two American leaders. The roster loses a woman by it.
- **A note for later, not a proposal:** every pair is filled, so a woman can join only as a second leader on a pair or as a shared seat. The strongest are Wu Zetian (Dominion + Magisterial, with all of Taizong's built kit), Theodora (beside Justinian, as the shelf in `docs/leaders.md` already pairs them) and Hatshepsut (designed in the record).

### Colours of the sixteen

The game's rule is 40 between primaries (`inkDistance`). The closest pair here is at 59.

| Leader | Primary | Secondary | Words | Source | Nearest primary | Distance |
|---|---|---|---|---|---|---|
| Alexander the Great | `#6b2d7a` | `#e3b93a` | Tyrian purple, sun gold | Mithridates' purple | Justinian | 87 |
| Genghis Khan | `#3a78b5` | `#efe6d2` | sky blue, bone | Modu Chanyu's, as built | Cyrus the Great | 94 |
| Joan of Arc | `#2c3e9e` | `#d9a521` | royal azure, gold | as built | Sejong the Great | 89 |
| Mehmed the Conqueror | `#d81e2c` | `#f5f1e6` | Ottoman red, white | new | Qin Shi Huang | 90 |
| Qin Shi Huang | `#a83224` | `#1c1a1a` | cinnabar, lacquer black | new | Pachacuti | 59 |
| Pachacuti | `#8b2635` | `#e0b21a` | maroon, sun gold | as built | Qin Shi Huang | 59 |
| Jayavarman VII | `#c9a27a` | `#1e6a45` | Angkor sandstone, forest green | new | Cleopatra | 148 |
| Nezahualcoyotl | `#1fb3a5` | `#c98b2e` | turquoise, ochre | as built | Cyrus the Great | 120 |
| Cyrus the Great | `#0f7c8c` | `#dcae3a` | Susa glaze teal, gold | new | Genghis Khan | 94 |
| Mansa Musa | `#e6c419` | `#27306e` | Wangara gold, indigo | as built | Jayavarman VII | 165 |
| Cleopatra | `#e8dcae` | `#1c3f7a` | papyrus, deep lapis | Hypatia's, as built | Jayavarman VII | 148 |
| Lorenzo de' Medici | `#7b5ea7` | `#e0b548` | iris violet, florin gold | new | Genghis Khan | 115 |
| Harun al-Rashid | `#1c1a1a` | `#d4a934` | Abbasid black, gold | Al-Ma'mun's, as built | Justinian | 123 |
| Justinian | `#5a1e4a` | `#d9b23c` | porphyry, mosaic gold | new | Pachacuti | 85 |
| Sejong the Great | `#25346b` | `#f3f1ea` | ink navy, porcelain white | new | Joan of Arc | 89 |
| Ibn Battuta | `#b5651d` | `#0d6b78` | ochre, sea teal | as built | Qin Shi Huang | 105 |

- Three reds (Pachacuti, Mehmed, Qin), three blues (Genghis Khan, Joan, Sejong) and two purples (Alexander, Justinian) are over the rule and are told apart by how light they are. Justinian's porphyry and Alexander's purple are the pair to look at on the map.

### For the builder

- **New shapes: none. Small extensions: five.** (1) Route range read for the origin city (The Yam). (2) A count of chairs by type (The Cyrus Cylinder). (3) An improvement that the `greatWork` test admits, with happiness from an improvement and one in each city (The Paradise Garden). (4) Renown paid from a rate (The Medici Bank). (5) A renown rate for a grant (The Royal Lectures).
- **The earlier extension is gone:** Alexander's Settler on a capture was replaced by your line, which is an existing shape.
- **Points to check in the code:** a levied unit reaches `unitCompletion` (Alexander); `foundingRider` takes a civilian unit id (Cyrus); a `completion` rider can measure `production` (Justinian's ability I); a `productionBonus` count takes a building category inside the town (Lorenzo); a faith purchase pays `buildingCompletion` (Jayavarman VII); `pays` reads `greatPeopleGained` with a family (Mehmed).
- **New unit rows (7):** Hypaspist, Janissary, Qin Crossbowman, Ballista Elephant, Sparabara, Condottiere, Hwacha. Renamed: Keshig. Opened again: Cataphract.
- **New building rows (7):** The Royal Pages, The Yam, The Külliye, The House of Fire, The Bottega, The Basilica, The Hall of Worthies. Renamed: The Commandery (the Post Station). Changed: The Museion (+2). New improvement: The Paradise Garden.
- **Leader rows:** eleven new rows (Alexander, Genghis Khan, Mehmed, Qin, Jayavarman VII, Cyrus, Cleopatra, Lorenzo, Harun, Justinian, Sejong), one changed row (Nezahualcoyotl), eight hidden rows.
- **Art:** eleven portraits for the new leaders and five for those who stay. New banners: Alexander, Mehmed, Qin, Jayavarman VII, Cyrus, Cleopatra, Lorenzo, Justinian, Sejong. Reused: Genghis Khan (Modu's), Harun (Al-Ma'mun's).
- **Bot personas:** each kit names one of the five in `data/ai.json`. Joan keeps today's.
- **Docs and tests:** as in the record's "For the builder": `docs/leaders.md` tables with `test/sim/leaders.test.ts` and `test/render/seatInks.test.ts`, the seed sweep cast, `docs/mapgen.md`, the skill's "Leaders" section and the deck maps.

## 7. What I could not check

- No bot game was run, so no number is measured.
- The six code points in "For the builder".
- The history is from memory. For Jayavarman VII, the counts of 102 hospitals and 121 rest houses are from their own inscriptions as I recall them; check before any text ships.

## The user's rulings on the readings (2026-11-20)

The user commented on the review page and said: "ok i've commented on the
leaders doc, i'm pretty happy with these changes." **Where a line here differs
from sections 1, 2 or 4 above, this section is the spec.** A reading with no
comment stands as recommended. The user's words are quoted.

### Readings confirmed as recommended

- **Alexander, Ability II:** every military unit *gained* counts ("gained");
  half is rounded down ("round down"); the name The Royal Army stays ("sounds
  good").
- **Alexander, the building:** opens at Bronzeworking and needs no Barracks
  ("Yup, unlocked at bronzeworking"); it reads hexes the city works that hold
  a strategic resource ("yup"); it is a military building for every card that
  counts them ("Yup").
- **Genghis Khan's building:** The Yam, one in each city ("one a city. yam is
  fine").
- **Joan of Arc:** stacking with The Spiritual Host is accepted ("stacking is
  fine."); the ground is "all territory belonging to cities that follow your
  faith".
- **Mehmed:** each town's Barracks counts, every scholar or general gained
  counts however gained, and the Külliye is a science building ("yes" three
  times).
- **Nezahualcoyotl, The Dikes:** the science is on each farm ("on each farm").
- **Cyrus:** chairs added by cards, wonders and the Assembly Hall count
  ("yes"); joined means joined by road to the capital ("yup connected by road
  to your capital"); one Paradise Garden in each city ("one in each city"); the
  garden follows the Spirit Way rules as written ("yup") and counts as a work
  for lines and legacies that multiply works ("yes").
- **Cleopatra, The Museion:** every city may hold one ("one a city").
- **Lorenzo:** the bank reads net gold ("net gold") and favours no family
  ("none"); the wonder bonus counts gold buildings in that city ("in that
  city").
- **Harun al-Rashid:** a building pays once ("No, building shouldn't be double
  counted.").
- **Justinian:** the happiness is the empire's ("yup"); the Basilica needs no
  Temple ("agreed").
- **Sejong, The Royal Lectures:** the extra renown splits by family as that
  turn's renown does ("Yup").
- **Colours:** "ok lets keep the colors".

### Lines the user changed

| Leader, piece | The user's words | The line to build |
|---|---|---|
| Cyrus, The Cyrus Cylinder | "is it really that strong? let's say +1 culture in all connected cities for every civic/wildcard order in your government" | Cities joined to your capital by road gain +1 happiness, and +1 culture for every Civic and Wildcard chair in your government. (My reading: "order" here is the chair, as in the user's first line, "for every civic and wildcard slot"; and the happiness clause stays, since the comment sat on the culture question. To confirm.) |
| Cleopatra, The Queen's Alliances | "+4 gold +2 culture per age for each deal you have." | Your capital gains +4 gold and +2 culture for each age you have reached, for each deal you have. So the count of deals returns: with no deal the line pays nothing. |
| Lorenzo, The Medici Bank | "no cap" | +1 renown a turn for every 8 gold your empire makes each turn, net. No cap. |
| Lorenzo, Ability II | "no cap, there aren't that many gold buildings in the game no?" | +10% production toward wonders for every gold building in that city. No cap. (About eight gold buildings and two empire buildings exist, so a full capital reaches +80% to +100%.) |
| Lorenzo, The Bottega | "i meant it as every city. let's nerf for now, to +3 renown to each." and "spirit way and paradise garden should count. lorenzo has no access to paradise gardens but theoretically they should count." | One in each city. +3 renown a turn toward great engineers and +3 toward great artists. +2 production for every luxury resource or great person's work in its city; a Paradise Garden and a ghost work of The Spirit Way count as works. |
| Justinian, Ability II | "the hex has +5 production and +2 happiness, it must be worked to get the 2 happiness. If it's simpler, we can have the happiness apply without being worked." | Each holy site gives +5 production on its hex, and +2 happiness to the empire. The builder chooses: happiness only while a citizen works the hex if that is cheap to build, otherwise for every holy site held. Say which in the hand-back. |
| Sejong, The Royal Lectures | "let's make it three turns" | Each time you complete a technology, gain three turns of renown. |
| Sejong, The Hall of Worthies | "one in each city." | +4 science, and +5 renown a turn toward great scholars. One in each city. |
| Jayavarman VII, Ability I | "modify: +1 food and +1 faith on freshwater farms for every public work in the city." | The Hospitals of the King. Farms beside fresh water gain +1 food and +1 faith for every public work in their city. |
| Jayavarman VII, Ability II | "+1 culture and +1 faith for every 2 citizens in your empire." | The Great City. +1 culture and +1 faith for every 2 citizens in your empire. |
| Jayavarman VII, The House of Fire | "this seems underwhelming, let's modify: public work building, +2 food and +2 happiness and +3 renown towards engineers." | The House of Fire. A public work. +2 food, +2 happiness, and +3 renown a turn toward great engineers. |
| Alexander, the building's name | "lets come up with a better historical name, i just copied the civ 6 ability name." | **Open: a name.** Proposed, in order: The School of Mieza (where Aristotle taught Alexander and the sons of the Macedonian nobles), The Royal Pages (the plain English of Basilikoi Paides), The Gymnasion. |

Jayavarman VII's kit is otherwise as section 2 gives it (the unit, the
capital and towns, the colours), and the user's three lines replace its two
abilities and its building.

### Arithmetic on the changed lines, for the user to see

- **Jayavarman, The Great City:** an empire of 60 citizens in Æra II pays +30
  culture and +30 faith a turn; 120 citizens in Æra III pays +60 and +60; 200
  in Æra IV pays +100 and +100. A headline card pays 35 to 45 in Æra II and
  about 120 in Æra IV, so this is two headline cards in every age, from turn
  one, and culture is the draft currency. It is the strongest leader line on
  the roster.
- **Jayavarman, The Hospitals:** a city with four public works and five river
  farms pays +20 food and +20 faith. It grows with the public works, which
  the Expansionist deck already rewards.
- **Sejong, The Hall of Worthies in each city:** ten cities pay +50 scholar
  renown and +40 science a turn. The Bottega was cut to +3 for this reason;
  the Hall is at +5.
- **Cyrus, the culture in each joined city:** eight joined towns and five
  chairs pay +40 culture a turn in Æra III, a headline card, and +8 happiness.
- **Lorenzo, the bank with no cap:** a seat that banks 600 gold a turn late
  gains +75 renown a turn, a great person every four to six turns.
- **Cleopatra:** two deals in Æra III pay +24 gold and +12 culture; none pays
  nothing.

### Still open

- The name of Alexander's building.
- Cyrus: "order" as chair, and the happiness clause (my reading above).
- Whether The Great City and The Hall of Worthies stay at these figures after
  the arithmetic above.

## The user's last rulings on the readings (2026-11-20)

"1. school of mieza is great. 2. lets use order, i added that as a nerf 3.
let's make it for every 4 citizens. 4. +5 scholar renown is fine i think, i
want one leader who's playstyle is grabbing as many scholars as possible"

**This section overrules the one above where they differ.** Nothing in the
leader pass waits on the user now.

- **Alexander's building is The School of Mieza.**
- **Cyrus, The Cyrus Cylinder:** cities joined to your capital by road gain +1
  happiness, and +1 culture for every Order seated in a Civic or Wildcard
  chair of your government. An empty chair pays nothing: the user chose
  "order" over "slot" as a nerf. The count is cards seated in chairs of those
  two types (`slottedOrdersOfSlot`), so the new chair count is not needed. The
  happiness clause stays (the user did not withdraw it).
- **Jayavarman VII, The Great City:** +1 culture and +1 faith for every 4
  citizens in your empire. 120 citizens in Æra III pay +30 and +30.
- **Sejong, The Hall of Worthies:** stays one in each city at +5 scholar
  renown and +4 science. The user wants a leader whose way to play is to call
  as many scholars as possible.

## Record: 1. The structure

This pass designs every candidate in the ruling of 2026-11-19 (`docs/flags.md`, "Leaders: a more mainstream roster, one for each pair of decks"). Nothing here is built or ruled. You choose; the build follows your choice.

### The fifteen pairs today

- Six decks make fifteen pairs. Today ten pairs have a leader and five have none.
- The twelve leaders with two decks: Mithridates VI (Dominion + Expansionist); Modu Chanyu and Joan of Arc (Dominion + Devotion); Emperor Taizong (Dominion + Magisterial); Pachacuti (Expansionist + Commerce); Nezahualcoyotl (Expansionist + Scientific); Mansa Musa (Commerce + Devotion); Zheng He (Commerce + Magisterial); Al-Ma'mun (Devotion + Scientific); Akhenaten and Hildegard of Bingen (Devotion + Magisterial); Hypatia (Scientific + Magisterial).
- The thirteenth, Ibn Battuta, plays every deck (see "Ibn Battuta" below).
- No leader today: Dominion + Commerce, Dominion + Scientific, Expansionist + Devotion, Expansionist + Magisterial, Commerce + Scientific.
- Devotion has six leaders and Commerce three. A player who wants Dominion with Scientific cannot have it.

### The proposal: one leader for each pair

- Fifteen leaders, one a pair, so every pair is playable and no deck has more seats than another (each deck has five).
- Three stay as they are (Pachacuti, Nezahualcoyotl, Mansa Musa). One is reworked (Joan of Arc). Eleven are new.
- Four pairs have two candidates. The page gives a pick for each.

### The alternatives

- **Keep thirteen.** Ten new or reworked leaders and three that stay, with two pairs left empty. It saves about two leaders of work and keeps the hole that the proposal is meant to close. I do not recommend it.
- **Two leaders on the strongest pairs.** Dominion + Devotion, Dominion + Magisterial and Devotion + Magisterial each have two good candidates, and two of those pairs hold two leaders today. Eighteen leaders. The extra three can come later with no change to the first fifteen.
- **Fifteen plus the rainbow seat.** Ibn Battuta, or a successor, stays as a sixteenth seat that plays every deck.

### What fifteen costs to build, against thirteen

- From `docs/leaders.md`, "What it cost to build": the seven leaders of batch L6a were seven rows in `data/leaders.json`, fourteen new unit and building rows, three doc tables with their sync tests, and a handful of new shapes. The screens (L6b) exist and need no work.
- A leader costs: one row with two abilities; a unit row; a building or improvement row; colours, cities and a start bias in the doc tables; a banner drawing; a portrait; a bot persona; and a place in the map seed sweep.
- The recommended fifteen need eleven new leader rows and one reworked row. Three of the eleven take over a whole kit that is already built (Genghis Khan from Modu Chanyu, Cleopatra from Hypatia, Harun al-Rashid from Al-Ma'mun). So eight kits are fully new: eight unit rows, seven building rows and one improvement row, against fourteen rows for L6a.
- One small extension to the effect vocabulary and no new shape (see "For the builder").
- Thirteen would save two of the eight new kits. Fifteen costs about a third more data work than thirteen, and the same code work.
- Art is the larger cost either way: eleven or twelve new portraits, and eight new banners (three are reused).

## Record: 2. The roster by pair

| Pair | Recommended | People | Region | Time | Status | Also designed |
|---|---|---|---|---|---|---|
| Dominion + Expansionist | **Alexander the Great** | Macedonians | Macedon, Greece | 4th century BC | new |  |
| Dominion + Commerce | **Genghis Khan** | Mongols | Mongolia, the steppe | 13th century | new |  |
| Dominion + Devotion | **Joan of Arc** | French | France | 15th century | rework | Saladin |
| Dominion + Scientific | **Mehmed the Conqueror** | Ottomans | Anatolia and the Balkans | 15th century | new |  |
| Dominion + Magisterial | **Qin Shi Huang** | Qin | China | 3rd century BC | new | Augustus |
| Expansionist + Commerce | **Pachacuti** | Inca | the Andes | 15th century | stays |  |
| Expansionist + Devotion | **Isabella of Castile** | Castilians | Spain | 15th century | new |  |
| Expansionist + Scientific | **Nezahualcoyotl** | Texcocans | central Mexico | 15th century | stays |  |
| Expansionist + Magisterial | **Cyrus the Great** | Persians | Persia | 6th century BC | new |  |
| Commerce + Devotion | **Mansa Musa** | Malians | West Africa | 14th century | stays |  |
| Commerce + Scientific | **Cleopatra** | Ptolemies | Egypt (a Greek dynasty) | 1st century BC | new |  |
| Commerce + Magisterial | **Lorenzo de' Medici** | Florentines | Florence, Italy | 15th century | new | Hatshepsut |
| Devotion + Scientific | **Harun al-Rashid** | Abbasids | Iraq | 8th century | new |  |
| Devotion + Magisterial | **Ashoka** | Mauryas | India | 3rd century BC | new | Justinian |
| Scientific + Magisterial | **Sejong the Great** | Joseon | Korea | 15th century | new |  |

| Pair | Leader | Ability I | Ability II |
|---|---|---|---|
| Dominion + Expansionist | Alexander the Great | *The Unbroken Charge*: Your units gain +3 combat strength when they attack. Capturing a city heals all your units. | *The Alexandrias*: Capturing a city grants a Settler. |
| Dominion + Commerce | Genghis Khan | *The Riders of the Steppe*: Mounted units gain +1 movement on grassland and plains. Pillaging pays half again. | *The Pax Mongolica*: Your traders cannot be plundered. Trade routes pay +3 gold. |
| Dominion + Devotion | Joan of Arc | *The Voices*: Killing a unit grants faith equal to its strength. | *The Maid*: Every city may buy military units with faith. Units bought with faith start as Veterans. |
| Dominion + Scientific | Mehmed the Conqueror | *The Enderun*: Military buildings give +2 science each. | *The Great Bombard*: Your units gain +5 combat strength against cities. Capturing a city grants science equal to thirty times its population. |
| Dominion + Magisterial | Qin Shi Huang | *The Great Works of Qin*: Garrisoned cities build wonders and buildings 25% faster. | *The Registered Households*: Every city gains +1 production for every three citizens. |
| Expansionist + Commerce | Pachacuti | *The Qhapaq Ñan*: Every city joined to your capital by road pays +1 happiness and +1 production. | *The Gold of the Peaks*: Farms pay +1 gold for every mountain standing beside them. |
| Expansionist + Devotion | Isabella of Castile | *The Charter Towns*: Cities you found start with a Shrine. | *The Union of Crowns*: Your capital gains +1 faith and +1 gold for each city you hold. |
| Expansionist + Scientific | Nezahualcoyotl | *The Dikes*: Cities with an aqueduct pay +1 culture, and their farms +1 production. | *Flower and Song*: +1 culture for every two citizens in your capital. |
| Expansionist + Magisterial | Cyrus the Great | *The Cyrus Cylinder*: Every city gains +1 culture and +1 happiness. | *The King's Gardeners*: Cities you found start with a Worker. |
| Commerce + Devotion | Mansa Musa | *The Gold of Wangara*: +2 gold on mines and camps, and +1 gold on every desert hex worked. | *The Hajj*: Trade routes that begin or end at a city holding a holy site pay +2 gold and +2 faith. |
| Commerce + Scientific | Cleopatra | *Books from the Ships*: Your trade routes pay +2 science, and your foreign routes +2 more. | *The Queen's Alliances*: Your capital gains +4 gold and +2 culture for each empire you hold a deal with. |
| Commerce + Magisterial | Lorenzo de' Medici | *The Medici Bank*: +1 renown a turn for every 100 gold in your treasury, at most +12. | *Florins*: Gold buildings give +2 culture each. |
| Devotion + Scientific | Harun al-Rashid | *The Storehouse of Wisdom*: Each faith or science building gives its city +1 science and +1 faith. | *The Learned Court*: Completing a technology grants faith equal to a fifth of its cost. |
| Devotion + Magisterial | Ashoka | *The Edicts*: Your capital gains +3 culture and +2 faith for each foreign city that follows your religion. | *The Pillars*: Culture buildings give +2 faith each. |
| Scientific + Magisterial | Sejong the Great | *The Correct Sounds*: Every city gains +1 science and +1 culture for every four citizens. | *The Royal Lectures*: Each time you gain a great person, gain science equal to four turns of your science. |

## Record: 3. The pairs

### Dominion + Expansionist: the frontier

**Today.** **Mithridates VI** (Pontics). *The Poison King*: +2 combat strength against an empire that holds more cities. *The Groves and the Hunt*: +2 food on plantations and camps. Unique unit the Pontic Peltast, unique building the Mountain Hold.

#### Alexander the Great (Macedonians)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Expansionist.
- **Who:** King of Macedon, 356 to 323 BC. In eleven years they took the Persian empire from the Aegean to the Indus and never lost a battle. Most players know the name before any other conqueror.
- **Fit:** **Dominion, the provinces** (captured towns). Their cards read captures, captured towns held, sieges and pacification: a capture pays renown, gold, a free unit and a percentage for each town taken.
- **Fit:** **Expansionist, the frontier** (towns founded). Their cards read each founding: an extra citizen, a road home, culture, claimed hexes, a free Market.
- **Ability I, The Unbroken Charge:** Your units gain +3 combat strength when they attack. Capturing a city heals all your units.
  - Shape: Existing: `combatLine` (`side: attack`, `when: always`) and `windfallRider` on `capture` with `grant: {healAll: true}`.
  - Arithmetic: A1: +3 on strength 15 to 33 is a strong age 1 line, and it works on camps. A3: +3 on 45 is 7%, under the regular +5; the heal after each capture is the late value (it saves about five turns of rest between sieges).
- **Ability II, The Alexandrias:** Capturing a city grants a Settler.
  - Shape: **Small extension.** The windfall unit grant takes `bestMelee`, `randomMilitary` or `unlockedByTech`. It needs a unit id, as the on-draft grant already has (`settler`).
  - Arithmetic: A1: nothing in most games. A3: two to four captures give two to four Settlers; a town of five citizens is worth 40 to 80 yield a turn. Authority still limits founding. This one changes play: each conquest seeds a colony.
- **Unique unit:** **Hypaspist**: stands in the Swordsman line (age 2). +1 movement and +5 strength against cities. The base Swordsman exists.
- **Second unique:** **The Gymnasium** (building): +2 culture, and units gained in its town start with 2 experience. The shape asks for a second unique; this one is modest.
- **Start bias:** Terrain: river 2, hills 0.6, coast 0.4. No hard want. The map script serves it today.
- **Colours:** Tyrian purple, sun gold (`#6b2d7a`, `#e3b93a`).
- **Charge:** The ram's horns of Ammon, from their coin portraits. The Vergina sun is disputed between Greece and North Macedonia, so it is not used.
- **Cities:** Pella · Aigai · Amphipolis · Alexandria Eschate · Bucephala · Kandahar
- **Bot persona:** `warmonger`: attacks early and keeps the army moving.
- **Portrait (3:4, gouache poster):** Young, clean-shaven, a white diadem band, the linen cuirass of the Alexander Mosaic. A long spear in one hand, a rolled map in the other, a dry plain at dusk behind.
- **Overlaps and risks:** The new Dominion card The Companion Cavalry shares their cavalry, so the unit is not the Companions. Aristotle (their tutor) and Dinocrates (who planned Alexandria) are great people. No wonder is theirs. Cleopatra's capital is Alexandria, so this list leaves the Egyptian one out.

### Dominion + Commerce: merchants and their guards

**Today.** No leader today.

#### Genghis Khan (Mongols)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Commerce.
- **Who:** Founder of the Mongol empire, about 1162 to 1227. They joined the steppe tribes and began the largest land empire in history. Under their heirs, trade from China to Europe travelled one protected road.
- **Fit:** **Dominion, the marches** (mounted units, pillage, pastures). Their cards read hexes pillaged, mounted units and worked pastures and camps.
- **Fit:** **Commerce, the far trade and the home market** (trade routes). Their cards read routes run, foreign partners and towns that routes arrive at.
- **Ability I, The Riders of the Steppe:** Mounted units gain +1 movement on grassland and plains. Pillaging pays half again.
  - Shape: Existing and built: this is Modu Chanyu's ability of today, word for word (`unitStat`, and `windfallRider` on `pillage`, `percent: 50`).
  - Arithmetic: A1: little, until the first chariots. A3: a raiding war pillages five to ten hexes, each paying half again; riders at 5 movement reach the hexes that foot soldiers cannot.
- **Ability II, The Pax Mongolica:** Your traders cannot be plundered. Trade routes pay +3 gold.
  - Shape: Existing: `rule: tradersUnplunderable` and `pays` with `where: route`, `gold: 3`.
  - Arithmetic: A1: one or two routes, +3 to +6 gold (a regular card). A3: four to six routes, +12 to +18, under the regular 35; the rest of the value is that a seat at war keeps its routes. To tune: +4.
- **Unique unit:** **Keshig**: stands in the Horse Archer line (age 3) with 5 movement. This is the Xiongnu Horse Archer row with a new name.
- **Second unique:** **The Horde Camp** (building), as built for Modu Chanyu. Its faith on pastures could become gold.
- **Start bias:** Modu Chanyu's row as it is: grassland 0.45, plains 0.4, hills -0.3; wants `pastureGroundWithin 3`; horses furnished. Served today.
- **Colours:** sky blue, bone (`#3a78b5`, `#efe6d2`).
- **Charge:** Modu Chanyu's sun and moon banner can stay: both are steppe signs. Or a horse-tail standard.
- **Cities:** Karakorum · Avarga · Almaliq · Samarkand · Zhongdu · Sarai
- **Bot persona:** `warmonger`, with more mounted units in the army mix and routes kept running at war.
- **Portrait (3:4, gouache poster):** Older, broad-faced, a fur-trimmed robe and a plain cap, after the Yuan court album (painted after their death; no portrait from life exists). A white horse-tail standard, steppe at dawn.
- **Overlaps and risks:** Subutai (general, age 4) is a great person: a Mongol seat can call its own general, which is fine. The Dominion cards The Horde and The Naadam share the subject; none names them. Karakorum was built up by their heir; Avarga was their own camp. The conquests killed millions; the game treats them as it treats every conqueror.

### Dominion + Devotion: the holy war

**Today.** **Modu Chanyu** (Xiongnu). *The Riders of the Steppe*: mounted +1 movement on grassland and plains, pillage pays half again. *The Herds*: +1 production and +1 faith on pastures. **Joan of Arc** (French). *The Voices*: a kill pays 8 faith and presses your faith nearby. *The Maid*: +4 combat strength on ground that follows your faith.

**Pick Joan of Arc, reworked.** They are the best-known figure of a holy war, their unit, building, banner, cities and colours are built, and the roster needs women. Saladin is a good design and the better choice if you want a seat from the Crusader-era Middle East; they are the first alternate if a pair may hold two leaders.

#### Joan of Arc (French)

- **Status:** rework. **Confidence:** strong. **Decks:** Dominion + Devotion.
- **Who:** A farmer's daughter from Domrémy, about 1412 to 1431. At seventeen they led the French army to relieve Orléans and had the king crowned at Reims. They said that voices of saints sent them. Burnt at nineteen, made a saint in 1920.
- **Fit:** **Devotion, the holy war** (soldiers bought with faith, kills, losses). Their cards read units bought with faith, kills and declarations of war.
- **Fit:** **Dominion, the garrison state** (ranks). Their cards read each rank earned, and a rank a unit starts with counts as earned.
- **Ability I, The Voices:** Killing a unit grants faith equal to its strength.
  - Shape: Existing: `windfallRider` on `kill`, `grant: {yield: faith, amount: 1, fromOccasion: strength}`. Today it pays a flat 8 and presses the faith; the pressure goes, because nobody sees it.
  - Arithmetic: A1: a barbarian kill every four turns at strength 20 is about 5 faith a turn (regular). A3: a kill every two turns at strength 45 is about 22 faith a turn, at war on 45% of turns.
- **Ability II, The Maid:** Every city may buy military units with faith. Units bought with faith start as Veterans.
  - Shape: Existing: `rule: faithBuysUnits` with `class: {category: military}` and no scope, and `unitStamp` with `bought: faith`, `rank: veteran`.
  - Arithmetic: Faith buys at 2 a hammer. A1: a Spearman is 54 faith, about one Veteran every ten turns. A3: a Legionary is 162 faith, one every three to five turns at 40 to 60 faith a turn. This one changes play: faith is the army.
- **Unique unit:** **The Gendarme**, as built (age 4, +10 against cities).
- **Second unique:** **The Sainte-Chapelle** (building), as built, with one change: its "soldiers may be bought with faith here" is now the ability, so it gives +3 faith and makes units bought with faith in its city 20% cheaper (`purchaseRider`, `currency: faith`).
- **Start bias:** As today: river 3, no hard want.
- **Colours:** royal azure, gold (`#2c3e9e`, `#d9a521`).
- **Charge:** The single fleur-de-lis, approved 2026-09-19.
- **Cities:** Orléans · Reims · Paris · Bourges · Chinon · Rouen (the list of today)
- **Bot persona:** `zealot` that also attacks: a new persona row, zealot weights with the warmonger's war settings.
- **Portrait (3:4, gouache poster):** A young soldier in plain plate armour, short dark hair, no helmet. A white banner in hand, the walls of Orléans behind, morning light.
- **Overlaps and risks:** **Why rework:** today's The Maid is the Devotion card The Spiritual Host (+4 in territory that follows your religion) and does nothing before a religion spreads. Today's The Voices is the shared card The Sacred Host (kills grant 15 faith) at half the size; the new one stacks with it. The shared card The Shrine Guards (Shrine towns buy melee units with faith) is nearly dead for this seat. Notre-Dame is a wonder. A saint of a living church: the text stays plain and respectful.

#### Saladin (Ayyubids)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Devotion.
- **Who:** Sultan of Egypt and Syria, 1137 to 1193. They joined the two countries, won at Hattin and took Jerusalem back in 1187. Friend and enemy alike wrote of their mercy to the city.
- **Fit:** **Dominion, the garrison state** (garrisons). Their cards read garrisoned towns and garrisoned units: culture, production, authority, happiness, science.
- **Fit:** **Devotion, the holy war and the engine** (faith, defence, captures). Their cards read faith made, towns defended by religious buildings and soldiers bought with faith.
- **Ability I, The Defender:** Your units gain +4 combat strength inside your own borders. Capturing a city grants faith equal to thirty times its population.
  - Shape: Existing: `combatLine` with `when: ownTerritory`, and `windfallRider` on `capture` with `fromOccasion: population` (The Victory Mint's shape, in faith).
  - Arithmetic: A1: +4 at home is a strong age 1 line, for defence only. A3: +4 on 45 is 9% (regular); a city of six pays 180 faith, about five turns of faith.
- **Ability II, The Iqta:** Garrisoned cities gain +2 faith and +1 production.
  - Shape: Existing: `pays` with `where: city`, `scope: garrisoned`.
  - Arithmetic: A1: three towns, +6 faith and +3 production (9 a turn, a headline; early faith wins the race to found a religion). A3: eight towns, +16 and +8 (24, under regular).
- **Unique unit:** **Mamluk**: stands in the Horseman line (age 3). +4 strength on ground that follows your religion (the Khopesh's rule).
- **Second unique:** **The Khanqah** (building): a lodge of the devout, +1 faith and +1 happiness. They founded the first one in Egypt in 1173.
- **Start bias:** Terrain: river 3, oasis 2, desert 1; wants `riverWithin 2`. Served today (Al-Ma'mun's want).
- **Colours:** pine green, Ayyubid yellow (`#1e6a45`, `#ecc94b`).
- **Charge:** A plain eagle, drawn unlike the modern state emblems that carry Saladin's name; or a six-petal rosette.
- **Cities:** Cairo · Damascus · Aleppo · Jerusalem · Hama · Acre
- **Bot persona:** `zealot`: never declares war first, keeps a garrison in every town, and counter-attacks.
- **Portrait (3:4, gouache poster):** A lean man of fifty with a short beard, a yellow silk robe over mail and a plain turban. A hand on a sheathed sword, the walls of Jerusalem in evening light.
- **Overlaps and risks:** The Devotion Doctrine The Ribats converts a captured town and the Dominion card Pax Romana pacifies it, so the abilities do neither. Solomon's Temple (a new age 2 wonder) stands in Jerusalem. The Crusades are still a charged subject. The Ayyubid colour was yellow, which Mansa Musa holds, so yellow is the device here.

### Dominion + Scientific: the military edge

**Today.** No leader today.

#### Mehmed the Conqueror (Ottomans)

- **Status:** new. **Confidence:** strong. **Decks:** Dominion + Scientific.
- **Who:** Ottoman sultan, 1432 to 1481. At twenty-one they took Constantinople with the largest cannon yet cast, and made it a capital of scholars, soldiers and builders. They knew several languages and kept Italian painters at court.
- **Fit:** **Dominion, the provinces** (sieges, captured towns) and its military buildings. Their cards read siege units, captures and Barracks, walls and Armouries.
- **Fit:** **Scientific, the elite army and institutions**. Their cards read units ahead of their age, a lead in technologies, and empire buildings such as the cannon foundry.
- **Ability I, The Enderun:** Military buildings give +2 science each.
  - Shape: Existing: `pays` with `where: city`, `basis: count`, `count: buildingsOfCategory`, `category: military`, `to: science` (The Choregia's shape).
  - Arithmetic: A1: three Barracks, +6 science against a median of 4: a headline, so +1 may be right. A3: eight towns with two or three each, +32 to +48 (regular).
- **Ability II, The Great Bombard:** Your units gain +5 combat strength against cities. Capturing a city grants science equal to thirty times its population.
  - Shape: Existing: `combatLine` with `when: vsCity`, and `windfallRider` on `capture` with `fromOccasion: population`.
  - Arithmetic: A1: +5 against walls is strong, with few sieges to use it. A3: +5 on 45 is 11%, on top of siege engines; a city of six pays 180 science, under two turns of research, so fifty times may be right.
- **Unique unit:** **Janissary**: stands in the Longswordsman line (age 4). Starts as a Veteran. The base Longswordsman exists; the game has no gunpowder foot unit to stand in for.
- **Second unique:** **The Külliye** (building): a mosque with its school and kitchen, +2 science, +2 food and +1 happiness.
- **Start bias:** Terrain: coast 1.5, hills 0.6, river 2. No hard want (a coast want was served on half of boards for Zheng He).
- **Colours:** Ottoman red, white (`#d81e2c`, `#f5f1e6`).
- **Charge:** The çintamani: three discs over two wavy lines, a pattern of their court robes. It is not the crescent of a modern flag.
- **Cities:** Istanbul · Edirne · Bursa · Thessalonica · Trebizond · Sarajevo
- **Bot persona:** `warmonger` that builds siege engines first and attacks the nearest walled capital.
- **Portrait (3:4, gouache poster):** Thirty, hooked nose, a red robe and a large white turban, after the Bellini portrait and the one where they smell a rose. A bronze bombard behind, sea walls beyond.
- **Overlaps and risks:** The Tophane, the Scientific empire building, is their own cannon foundry: a fit, and nothing requires it. Hagia Sophia (age 3 wonder) is the church they made a mosque. Mimar Sinan and Taqi al-Din are great people of later reigns. The fall of Constantinople is mourned in the Greek and Orthodox world. If Justinian also ships, two seats share a capital: the lists say Istanbul and Constantinople.

### Dominion + Magisterial: the triumph

**Today.** **Emperor Taizong** (Tang). *The Mandate*: melee units +3 combat strength and +1 movement. *The Garrison Towns*: garrisoned cities +1 happiness and +15% culture. Unique unit Tang Heavy Cavalry, unique building the Examination Court.

**Pick Qin Shi Huang.** Your picture of Dominion names "qin china", their wonders are already in the game, and without them East Asia has one seat. Augustus is the better fit for Magisterial's council and is the first alternate; Rome already colours half of Dominion's card names without a seat.

#### Qin Shi Huang (Qin)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Magisterial.
- **Who:** King of Qin, then the first emperor of China, 259 to 210 BC. They ended the Warring States, set one script, one coinage and one measure, and joined the walls of the north. They are buried with an army of clay soldiers.
- **Fit:** **Dominion, the garrison state** (garrisons, ranks). Their cards read garrisoned towns and units; your own note on that theme starts with "Qin's ranks of merit".
- **Fit:** **Magisterial, the monuments** (wonders). Their cards read wonders being built, wonders held and each wonder finished.
- **Ability I, The Great Works of Qin:** Garrisoned cities build wonders and buildings 25% faster.
  - Shape: Existing: two `productionBonus` rows (`category: wonder` and `building`) with `scope: garrisoned`.
  - Arithmetic: A1: a 150-hammer wonder in a town of 5 production comes about six turns sooner. A3: eight garrisoned towns at 15 production, about +30 toward buildings (regular). It changes play: every town wants a soldier before a mason.
- **Ability II, The Registered Households:** Every city gains +1 production for every three citizens.
  - Shape: Existing: `pays` with `where: city`, `basis: count`, `count: population`, `within: city`, `per: 3`.
  - Arithmetic: A1: 12 to 15 citizens, +4 to +5 (regular). A3: about 70 citizens, +23 (under regular). Age 4: 150 citizens, +50.
- **Unique unit:** **Qin Crossbowman**: stands in the Bowman line (age 2). +3 ranged strength, and it costs as an Archer does (size `light`).
- **Second unique:** **The Commandery** (building): the benched Post Station with a new name. Its town builds faster while a road joins it to the capital. Qin built the straight roads.
- **Start bias:** Taizong's row as it is: grassland 0.9, river 2; wants `grasslandWithin 2`. Served today.
- **Colours:** cinnabar, lacquer black (`#a83224`, `#1c1a1a`).
- **Charge:** A round coin with a square hole (the ban liang), the sign of one coinage.
- **Cities:** Xianyang · Yong · Yueyang · Handan · Linzi · Langya
- **Bot persona:** `wide`, with a garrison in every town and wonders high in the build order.
- **Portrait (3:4, gouache poster):** A heavy-set man in black robes with a flat beaded crown (the mianguan), drawn as later ages imagined them; no portrait from life exists. Ranks of clay soldiers behind, lamp light.
- **Overlaps and risks:** The Terracotta Army and The Great Wall (both age 3 wonders) are theirs: a rival may build them, as in any game of this kind. Commission: The Ranks of Merit is their own system as a card. Li Bing is a great person of Qin. Five religion names (Fangshi, Huang-Lao, Mojia, Yinyangjia, Nongjia) are schools their court used or banned. The burning of books and the killing of scholars is told by a historian of the next dynasty and its scale is debated; it sits oddly in a cabal of scholars, which can be character. Their search for the elixir fits the frame well. **Colour:** Qin's own colour was black, which Harun al-Rashid holds, so cinnabar leads here; if Harun is not picked, Qin takes black.

#### Augustus (Romans)

- **Status:** new. **Confidence:** good. **Decks:** Dominion + Magisterial.
- **Who:** First emperor of Rome, 63 BC to AD 14. They ended a century of civil war, kept the forms of the Republic and ruled as "first citizen". Their peace lasted two hundred years.
- **Fit:** **Magisterial, the monuments and the council** (wonders, culture buildings, a government that fits the times). Their cards read wonders and culture buildings built and held.
- **Fit:** **Dominion, war and peace**. Its cards pay differently at war and at peace, so an army can choose to stay home.
- **Ability I, City of Marble:** Your capital builds wonders and buildings 30% faster.
  - Shape: Existing: two `productionBonus` rows with `scope: capital`.
  - Arithmetic: A1: a capital of 8 production gains 2.4; a wonder comes about eight turns sooner. A3: a capital of 30 gains 9. Small in yield, large in wonder races.
- **Ability II, The Augustan Peace:** While you are at peace, every city gains +1 culture and +2 gold.
  - Shape: Existing: `conditionRule` with `when: atPeace` around a `pays` row.
  - Arithmetic: A1: three towns, +3 culture (worth about 9) and +6 gold: a headline. A3: eight towns, +8 and +16 (24), on the 55% of turns a Dominion seat is at peace. It changes play: war has a price, so wars are short.
- **Unique unit:** **Centurion**: stands in the Legionary line (age 3). Starts as a Veteran. The card The Praetorian Guard exists, so the unit is not a Praetorian.
- **Second unique:** **The Triumphal Arch** (building): +2 culture and +1 renown a turn, favouring great generals.
- **Start bias:** Terrain: river 3, hills 1, coast 0.4; wants `riverWithin 2`. Served today.
- **Colours:** laurel green, marble (`#5a8f2e`, `#f2eee4`).
- **Charge:** The Capricorn, the sign they claimed, which they struck on their coins.
- **Cities:** Rome · Ostia · Mediolanum · Lugdunum · Augusta Emerita · Nicopolis
- **Bot persona:** `tall` in peace with a large standing army; it answers a war and seldom starts one.
- **Portrait (3:4, gouache poster):** The Prima Porta statue as a living man: about forty, short hair, a muscle cuirass and a red cloak, one arm raised. White marble columns under scaffolding behind.
- **Overlaps and risks:** Rome is in many card names of these two decks (Pax Romana, The Marian Reforms, The Auxilia, The Proconsuls, The Field of Mars, The Grass Crown, The Twelve Tables); none names them. The Circus Maximus is a wonder. Vitruvius, Gaius Marius and Crassus are great people. Four religion names are Roman priesthoods. "Brick to marble" is from Suetonius. Their first ability is close to Qin's; only one of the two is likely to ship.

### Expansionist + Commerce: the land and the market

**Today.** **Pachacuti** (Inca) stays.

#### Pachacuti (Inca)

- **Status:** stays. **Confidence:** strong. **Decks:** Expansionist + Commerce.
- **Who:** Sapa Inca from 1438 to 1471. They turned the valley kingdom of Cusco into an empire held together by forty thousand kilometres of road.
- **Fit:** **Expansionist, the frontier** (towns joined by road) and **the raised land** (farms, terraces).
- **Fit:** **Commerce, the home market** (domestic routes; caravans lay the roads that join the towns).
- **Ability I, The Qhapaq Ñan:** Every city joined to your capital by road pays +1 happiness and +1 production.
  - Shape: Built.
  - Arithmetic: A1: three joined towns, +3 and +3. A3: eight towns, +8 and +8 (under regular). The Expansionist card The Road Home joins each new town at once, so this is on from the founding.
- **Ability II, The Gold of the Peaks:** Farms pay +1 gold for every mountain standing beside them.
  - Shape: Built.
  - Arithmetic: Depends on the map: zero to about +10 gold in age 1, more with Terraces.
- **Unique unit:** **The Slinger**, as built.
- **Second unique:** **Terraces** (improvement), as built. No unique building, by your ruling of 2026-09-15.
- **Start bias:** As built: river 6, hills 1.5, mountain 2.5; wants `mountainWithin 2`, `riverWithin 1`.
- **Colours:** maroon, sun gold (`#8b2635`, `#e0b21a`).
- **Charge:** The sun of Inti, as built.
- **Cities:** Cusco · Quito · Tumebamba · Cajamarca · Vilcashuamán · Huánuco Pampa
- **Bot persona:** `wide`.
- **Portrait (3:4, gouache poster):** A man of forty with the red fringe of the Sapa Inca on the brow, gold ear discs, a checked tunic. A stone road climbing terraces behind, high clear light.
- **Overlaps and risks:** **Note:** both abilities fit the settled decks. The Qhapaq Ñan falls behind in age 3; +2 production would keep it a regular card. Machu Picchu (age 4 wonder) is their estate.

### Expansionist + Devotion: sacred land

**Today.** No leader today.

#### Isabella of Castile (Castilians)

- **Status:** new. **Confidence:** good. **Decks:** Expansionist + Devotion.
- **Who:** Queen of Castile from 1474 to 1504. Their marriage to Ferdinand of Aragon made Spain, their war ended Muslim rule in Granada, and their ships under Columbus reached the Americas in 1492.
- **Fit:** **Expansionist, the frontier** (towns founded). Their cards read each founding and the count of towns.
- **Fit:** **Devotion, the devout realm** (Shrines first, then devout towns). Three Tier 0 and Tier I cards read Shrines: faith, food and happiness in Shrine towns, and soldiers bought there.
- **Ability I, The Charter Towns:** Cities you found start with a Shrine.
  - Shape: Existing: `foundingRider` with `building: shrine` (The Agora's shape).
  - Arithmetic: A1: three new towns save about 25 hammers each and make faith from their first turn, +3 to +6 faith (regular). A3: the hammers no longer matter; the early faith did. It changes play: each town is founded already keeping the faith.
- **Ability II, The Union of Crowns:** Your capital gains +1 faith and +1 gold for each city you hold.
  - Shape: Existing: `pays` with `where: capital`, `basis: count`, `count: cities`.
  - Arithmetic: A1: four cities, +8 (top of regular). A3: eight cities, +16 (under regular). To tune: +2 gold.
- **Unique unit:** **Jinete**: stands in the Horseman line (age 3). +1 movement, and it may move after it attacks. The light horse of the Granada war.
- **Second unique:** **The Hermandad** (building): the town brotherhood they founded in 1476. +1 happiness and +3 city defence.
- **Start bias:** Terrain: coast 1.5, plains 0.4, hills 0.5. No hard want. Served today.
- **Colours:** ermine white, Castile crimson (`#f4f1ea`, `#a8123e`).
- **Charge:** The three-towered castle of Castile. The yoke and arrows, their own badge, was reused by the Falange in the 1930s, so it is not used.
- **Cities:** Segovia · Valladolid · Toledo · Seville · Burgos · Granada
- **Bot persona:** `wide`, with the zealot's faith weights.
- **Portrait (3:4, gouache poster):** A woman of forty, fair, in a dark red gown with a white veil and a plain gold crown, after the portraits of their court. A charter with a seal in hand, a caravel in the harbour behind.
- **Overlaps and risks:** **Read this first.** The Inquisition (1478), the expulsion of the Jews (1492), the forced conversion of Muslims and the start of the conquest of the Americas belong to this reign. Pachacuti and Nezahualcoyotl, who stay, are from peoples that Castile's heirs conquered within forty years. The design names none of this, and no ability or unit uses it, but the choice may still read badly. The Alhambra (age 4 wonder) is the palace they took. The card name The Mission exists, so the building is not a mission. El Cid is a great person. Less charged leaders for this pair are in "Gaps".

### Expansionist + Scientific: the engineers

**Today.** **Nezahualcoyotl** (Texcocans) stays.

#### Nezahualcoyotl (Texcocans)

- **Status:** stays. **Confidence:** strong. **Decks:** Expansionist + Scientific.
- **Who:** Ruler of Texcoco from 1431 to 1472: poet, lawgiver and the engineer of the dike that kept the lake of Mexico sweet.
- **Fit:** **Expansionist, public works** (Aqueducts and the towns that hold them).
- **Fit:** **Scientific, great cities** (a few large towns, the capital first).
- **Ability I, The Dikes:** Cities with an aqueduct pay +1 culture, and their farms +1 production.
  - Shape: Built.
  - Arithmetic: A1: nothing before the first Aqueduct. A3: eight towns, +8 culture and about +20 production.
- **Ability II, Flower and Song:** +1 culture for every two citizens in your capital.
  - Shape: Built.
  - Arithmetic: A1: a capital of 6, +3 culture (worth 9). A3: a capital of 16, +8.
- **Unique unit:** **The Eagle Warrior**, as built.
- **Second unique:** **The Tetzcotzinco** (building), as built.
- **Start bias:** As built: lake 2.5, river 2; wants `riverOrFloodplainWithin 1`, `lakeWithin 2`.
- **Colours:** turquoise, ochre (`#1fb3a5`, `#c98b2e`).
- **Charge:** The Tlaloc mask, approved 2026-09-19.
- **Cities:** Texcoco · Tenochtitlan · Tlacopan · Huexotla · Coatlinchan · Teotihuacan
- **Bot persona:** `tall`.
- **Portrait (3:4, gouache poster):** A man of fifty in a turquoise mosaic diadem and a knotted blue cloak. A codex open on the knee, the hill gardens and the aqueduct of Tetzcotzinco behind, late sun on the lake.
- **Overlaps and risks:** **Note:** both abilities fit. The Dikes does nothing in age 1, and its +1 culture is the kind of small number you called weak on Sword and Plough; +2 culture would fix it. The Pyramid of the Sun (new age 2 wonder) is in their valley.

### Expansionist + Magisterial: shaping territory

**Today.** No leader today.

#### Cyrus the Great (Persians)

- **Status:** new. **Confidence:** good. **Decks:** Expansionist + Magisterial.
- **Who:** Founder of the Persian empire, about 600 to 530 BC. They took Media, Lydia and Babylon, let conquered peoples keep their gods and laws, and laid out at Pasargadae the first known garden in four parts.
- **Fit:** **Expansionist, the raised land and the frontier** (improved tiles, towns founded). Most of the deck reads improved tiles.
- **Fit:** **Magisterial, the landscape** (works laid out on the land, culture from the ground). The pair's own model in `deck-design.md` is the Persian garden.
- **Ability I, The Cyrus Cylinder:** Every city gains +1 culture and +1 happiness.
  - Shape: Existing: `pays` with `where: city`, and `happiness` with `per: city`.
  - Arithmetic: A1: three or four towns, +3 to +4 culture (worth about 10) and the same happiness: a headline. A3: eight towns, +8 and +8. It lets a wide realm stay content and keep drafting.
- **Ability II, The King's Gardeners:** Cities you found start with a Worker.
  - Shape: Existing: `foundingRider` with a unit (The Frontier Militia's shape). For the builder to check: that it takes a civilian id.
  - Arithmetic: A1: three Workers (30 hammers), each improving three tiles sooner, about +6 yield a turn by turn 55 (regular). A3: small. The garden below is the late half.
- **Unique unit:** **Sparabara**: stands in the Phalanx line (age 2). +5 strength when it defends. The card The Immortals exists (it is about great people), so the unit is not an Immortal.
- **Second unique:** **The Paradise Garden** (improvement): a worker lays it on flat land beside a river, a lake or an oasis. +1 food and +2 culture. A bolder option: it counts as a great-person work for your cards, one a city (a small extension on the seam The Spirit Way adds).
- **Start bias:** Terrain: river 4, plains 0.4, oasis 2; wants `riverWithin 2`. Served today.
- **Colours:** Susa glaze teal, gold (`#0f7c8c`, `#dcae3a`).
- **Charge:** A twelve-petal rosette, as on the stone of Persepolis. The winged figure (the Faravahar) is a sign of a living faith, so it is not used.
- **Cities:** Pasargadae · Ecbatana · Susa · Babylon · Sardis · Anshan
- **Bot persona:** `wide`: many towns, workers first, war only when attacked.
- **Portrait (3:4, gouache poster):** A man of fifty with a curled beard, a long pleated robe and a plain fluted crown. A hand on a clay cylinder, a walled garden with water channels behind, soft morning.
- **Overlaps and risks:** The Hanging Gardens and The Great Ziggurat stand in Babylon, which they took in 539 BC. Commission: The Paradise Garden (Magisterial) shares the garden. The Satraps is a retired card and Satrapies a technology. The Royal Road was built by Darius, so no ability claims it. Reading the Cylinder as a charter of rights is modern. Their death in battle with Tomyris is Herodotus's story.

### Commerce + Devotion: pilgrims and markets

**Today.** **Mansa Musa** (Malians) stays.

#### Mansa Musa (Malians)

- **Status:** stays. **Confidence:** strong. **Decks:** Commerce + Devotion.
- **Who:** Ruler of Mali from about 1312 to 1337. Their pilgrimage to Mecca gave away so much gold that its price in Cairo fell for years.
- **Fit:** **Commerce, the goods** (mines, luxuries, gold).
- **Fit:** **Devotion, the holy places** (holy sites as trade destinations).
- **Ability I, The Gold of Wangara:** +2 gold on mines and camps, and +1 gold on every desert hex worked.
  - Shape: Built.
  - Arithmetic: A1: three or four mines and camps, +6 to +8 gold (regular). A3: about +30.
- **Ability II, The Hajj:** Trade routes that begin or end at a city holding a holy site pay +2 gold and +2 faith.
  - Shape: Built.
  - Arithmetic: A1: nothing. A3: three or four such routes, +6 to +8 of each.
- **Unique unit:** **The Mandekalu**, as built.
- **Second unique:** **The Sankore Madrasa** (building), as built.
- **Start bias:** As built: desert 2, river 2, oasis 2; wants `aridWithin 2`; gold furnished. The arid want was served on 30% of boards.
- **Colours:** Wangara gold, indigo (`#e6c419`, `#27306e`).
- **Charge:** The royal parasol, as built.
- **Cities:** Niani · Timbuktu · Djenné · Gao · Walata · Kumbi Saleh
- **Bot persona:** `balanced`, with gold and routes weighted up.
- **Portrait (3:4, gouache poster):** Seated as on the Catalan Atlas: a gold crown, a white robe, a gold nugget held up in one hand. A mud-brick mosque and a camel train behind, noon light.
- **Overlaps and risks:** **Note:** The Hajj is weak. A holy site needs a prophet, so the line pays nothing in age 1 and most of age 2, and then only on routes that touch one town. Counting a city with a Temple as well would switch it on a whole age sooner. The Gold of Wangara stacks with The Mineral Trade, which is intended. The Great Mosque of Djenné is a wonder.

### Commerce + Scientific: the patrons

**Today.** No leader today.

#### Cleopatra (Ptolemies)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Scientific.
- **Who:** Cleopatra VII, last ruler of Ptolemaic Egypt, 69 to 30 BC. They held the richest kingdom of the sea against Rome for twenty years by treaty, grain and nerve. Plutarch says they spoke many languages.
- **Fit:** **Commerce, the far trade** (foreign routes, partners, deals). Your picture of Commerce is "the faction most interested in trade deals".
- **Fit:** **Scientific, great cities and the learned land** (a great capital, its schools, scholars). The pair's model in `deck-design.md` is Ptolemaic Alexandria.
- **Ability I, Books from the Ships:** Your trade routes pay +2 science, and your foreign routes +2 more.
  - Shape: Existing: two `pays` rows with `where: route`, the second with `crossing: international`.
  - Arithmetic: A1: one or two routes, +2 to +8 science against a median of 4. A3: five routes, three foreign, +16 (under regular). To tune: +3.
- **Ability II, The Queen's Alliances:** Your capital gains +4 gold and +2 culture for each empire you hold a deal with.
  - Shape: Existing: `pays` with `where: capital`, `basis: count`, `count: dealPartners` (The Treaty Ports reads the same count).
  - Arithmetic: A1: no deal or one, 0 to 6. A3: two or three partners, +12 to +18. It is low unless you make deals, and that is the point: this seat stays at peace and trades.
- **Unique unit:** **The Alexandrian Galley**, Hypatia's unit as built.
- **Second unique:** **The Museion** (building), Hypatia's as built: +1 science for every great person your realm has called.
- **Start bias:** Hypatia's row as it is: coast 2, river 3; wants `coastalWithin 1`, `riverWithin 2`.
- **Colours:** papyrus, deep lapis (`#e8dcae`, `#1c3f7a`).
- **Charge:** The knot of Isis (the tyet). It stands apart from the ankh.
- **Cities:** Alexandria · Cyrene · Ptolemais · Naucratis · Canopus · Pelusium (Hypatia's list)
- **Bot persona:** `tall`: one great port city, deals accepted readily, war avoided.
- **Portrait (3:4, gouache poster):** A woman of thirty with the broad diadem band and the knot of hair of their coin portraits, a Greek gown, a strong nose. Scrolls and a ship model on a table, the Pharos through the window.
- **Overlaps and risks:** The Great Library and The Great Lighthouse stood in their capital, and earlier kings of the line built them. Hypatia stays a great person (scholar, age 3) and the Mouseion is an empire building, so one city gives the game three things. "Books from the ships" was a rule of earlier Ptolemies, told by Galen. They were Greek by descent and the first of the line to learn Egyptian. Keep clear of the seductress cliché. The second ability needs bots that offer deals often enough: check in play.

### Commerce + Magisterial: the art market

**Today.** **Zheng He** (Ming). *The Treasure Fleet*: ships +2 movement and +1 sight. *Tribute of the Western Ocean*: routes to or from a coastal city pay +2 gold and +1 culture (marked deferred in the data). Unique unit the Treasure Ship, unique building the Longjiang Dockyard.

**Pick Lorenzo de' Medici.** Medici Florence is the pair's own model in `deck-design.md`, the bankers theme has no leader, and their circle translated the Hermetic books, which suits the cabal frame. Hatshepsut costs less (all of Akhenaten's pieces are reused) and adds a woman, but with Cleopatra the roster would hold two queens of Egypt, both in Commerce. If you drop Cleopatra, pick Hatshepsut.

#### Lorenzo de' Medici (Florentines)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Magisterial.
- **Who:** Banker and first citizen of Florence, 1449 to 1492, called "the Magnificent". They paid for Botticelli, the young Michelangelo and the scholars who put Plato and the Hermetic books into Latin. They ruled a republic without a title.
- **Fit:** **Commerce, the bankers** (gold kept, gold buildings, great merchants). Their cards read the treasury and Markets and Banks.
- **Fit:** **Magisterial, the patrons** (renown, great people gained and spent). Their cards read each great person gained.
- **Ability I, The Medici Bank:** +1 renown a turn for every 100 gold in your treasury, at most +12.
  - Shape: Existing: `renown` with `count: bankedGold`, `countPer: 100`, `max: 12`.
  - Arithmetic: The first great person costs 75 renown. A1: 100 to 200 gold kept, +1 to +2 renown. A3: 600 to 1,200 kept, +6 to +12, about one more great person every 25 turns. It changes play: a full treasury draws the great.
- **Ability II, Florins:** Gold buildings give +2 culture each.
  - Shape: Existing: `pays` with `count: buildingsOfCategory`, `category: gold`, `to: culture`.
  - Arithmetic: A1: one or two Markets, +2 to +4 culture (worth 6 to 12): a headline. A3: sixteen gold buildings, +32 (regular).
- **Unique unit:** **Condottiere**: stands in the Longswordsman line (age 4). It costs 40% less to buy with gold (`purchaseRider` on its own type).
- **Second unique:** **The Bottega** (building): a master's workshop. +1 production, +1 culture and +1 renown a turn.
- **Start bias:** Terrain: river 3, hills 1; wants `riverWithin 1`. Served today.
- **Colours:** iris violet, florin gold (`#7b5ea7`, `#e0b548`).
- **Charge:** The Medici balls: six discs on a shield. The Florentine lily is too close to Joan's.
- **Cities:** Florence · Pisa · Arezzo · Volterra · Prato · Pistoia
- **Bot persona:** `tall`: holds a treasury, buys buildings, avoids war.
- **Portrait (3:4, gouache poster):** A dark-haired man of forty with a broken-looking flat nose and a strong jaw, a plain red gown, after the Verrocchio bust and the Vasari portrait. A ledger and a small bronze on the desk, the dome of Florence in the window.
- **Overlaps and risks:** **A clash to settle:** Cosimo de' Medici is a great person (merchant, age 5), so this seat could call their own grandfather. Replace that row (Jacques Cœur suits the age) or accept it. Leonardo is a great person too, which is fine. Magnificence is a Magisterial card and their epithet, so no ability uses the word. The Commerce card that buys great people with gold is their history as a card, so the ability does not copy it. Europe is already the largest group.

#### Hatshepsut (Egyptians)

- **Status:** new. **Confidence:** good. **Decks:** Commerce + Magisterial.
- **Who:** Pharaoh of Egypt, about 1479 to 1458 BC. Their fleet sailed to Punt and came home with incense trees, gold and ebony. They raised the terraced temple at Deir el-Bahari and the tallest obelisk still standing in Egypt, at Karnak.
- **Fit:** **Commerce, the goods and the far trade** (luxury kinds held, routes). Their cards read different luxuries and each route.
- **Fit:** **Magisterial, the monuments** (wonders built and held). Their cards read each wonder.
- **Ability I, The Voyage to Punt:** Each different luxury you hold gives +10% production toward wonders, at most +50%.
  - Shape: Existing: `productionBonus` with `category: wonder`, `count: uniqueLuxuries`, `max: 5`.
  - Arithmetic: A1: two or three luxuries, +20% to +30% (Akhenaten has +20% today). A3: five, +50%; the best wonder cards give +25% to +30%. It changes play: trade and claims buy monuments.
- **Ability II, The Obelisks:** You may run one more trade route for each wonder you hold, at most +4.
  - Shape: Existing: `routeRider` with `count: wonders`, `max: 4`.
  - Arithmetic: A1: one wonder, one route, 4 to 8 yield (regular). A3: three wonders, three routes at 10 to 20 each, 30 to 60 (regular).
- **Unique unit:** **The Khopesh**, Akhenaten's unit as built. Its strength on the faith's ground becomes strength inside your own borders.
- **Second unique:** **The Obelisk** (building), Akhenaten's as built.
- **Start bias:** Akhenaten's row as it is: river 4, floodplain 3, oasis 3, desert 2; wants `riverOrFloodplainWithin 1`, `aridBeside 3`.
- **Colours:** sun orange, lapis (`#e0852a`, `#234b9a`).
- **Charge:** Akhenaten's ankh, as built.
- **Cities:** Thebes · Memphis · Heliopolis · Abydos · Elephantine · Coptos (Akhenaten's list without Akhetaten, which was built a century later)
- **Bot persona:** `tall`: wonders first, routes second.
- **Portrait (3:4, gouache poster):** As their own statues show them: the striped headcloth, the broad collar and the false beard of a king on a calm, fine-boned face. Incense trees in baskets, the terraces of Deir el-Bahari behind, hard sun.
- **Overlaps and risks:** Senenmut, their steward, is a retired great-person row. The Great Sphinx, The Pyramids and The Temple of Thoth are Egyptian wonders and none is theirs. With Cleopatra there would be two Egyptian queens in Commerce. Their images were cut away about twenty years after their death; the reason is debated.

### Devotion + Scientific: scholars of the faith

**Today.** **Al-Ma'mun** (Abbasids). *The Mu'tazila*: +1 science for every fifth point of faith a turn. *The House of Wisdom*: +2 food for every faith or science building in a city. Unique unit the Camel Archer, unique building the House of Learning.

#### Harun al-Rashid (Abbasids)

- **Status:** new. **Confidence:** good. **Decks:** Devotion + Scientific.
- **Who:** Caliph in Baghdad from 786 to 809, the caliph of the Thousand and One Nights. Their court was the richest of its age; they sent Charlemagne an elephant and a water clock, and their library grew into the House of Wisdom.
- **Fit:** **Devotion, the engine and the devout realm** (faith made and spent, faith buildings).
- **Fit:** **Scientific, great cities and institutions** (science buildings in a few great towns, technologies finished).
- **Ability I, The Storehouse of Wisdom:** Each faith or science building gives its city +1 science and +1 faith.
  - Shape: Existing and nearly built: Al-Ma'mun's second ability is this row with food (`count: buildingsOfCategories`).
  - Arithmetic: A1: four such buildings, +4 and +4 (regular). A3: eight towns with four each, +32 and +32 (64, the top of regular). To tune.
- **Ability II, The Learned Court:** Completing a technology grants faith equal to a fifth of its cost.
  - Shape: Existing: `windfallRider` on `tech` with `fromOccasion: techCost`, `amount: 0.2`.
  - Arithmetic: A1: technologies cost 13 to 100, so 3 to 20 faith each, one to three a turn. A3: a technology every seven turns pays a large lump, about 20 faith a turn. It changes play: research feeds the rites and the faith purchases.
- **Unique unit:** **The Camel Archer**, Al-Ma'mun's unit as built.
- **Second unique:** **The House of Learning** (building), Al-Ma'mun's as built.
- **Start bias:** Al-Ma'mun's row as it is: river 5, coast 0.6; wants `riverWithin 2`.
- **Colours:** Abbasid black, gold (`#1c1a1a`, `#d4a934`).
- **Charge:** Al-Ma'mun's palmette on the black field, as built.
- **Cities:** Baghdad · Raqqa · Kufa · Basra · Merv · Rayy (Al-Ma'mun's list without Samarra, which was built after them)
- **Bot persona:** `zealot`, with science weighted beside faith.
- **Portrait (3:4, gouache poster):** A man of forty with a full dark beard, a black robe and turban with gold bands. A brass water clock and a pile of books, the round city of Baghdad at night behind, lamp light.
- **Overlaps and risks:** **History, stated plainly:** the House of Wisdom's fame belongs more to their son al-Ma'mun, today's leader of this pair. Harun is the better-known name; al-Ma'mun is the closer fit. The Harun of the Nights is legend. The House of Wisdom is a wonder (age 4) and a shared card name. The Bimaristan, a Scientific empire building, was first raised in Baghdad in their reign. al-Khwarizmi is a great person of the next reign. The cards The Translation Movement and The Round City share the city. **Colour:** black, which Qin Shi Huang also claims.

### Devotion + Magisterial: the cathedral

**Today.** **Akhenaten** (Egyptians). *The Great Works*: cities with a holy site make wonders 20% faster. *The Nile's Gift*: +1 faith on farms that drink fresh water. **Hildegard of Bingen** (Rhinelanders). *The Rites*: cities keeping a rite pay +20% culture. *Symphonia*: +2 culture and +2 production for every faith building in a city.

**Pick Ashoka.** South Asia has no seat without them, and Devotion's themes pass says no leader points at the spreading faith, whose model it names as "Ashoka's missionaries". Justinian is the pair's own model (Byzantium) and a fine design; they are the alternate, and the first to add if a pair may hold two leaders.

#### Ashoka (Mauryas)

- **Status:** new. **Confidence:** strong. **Decks:** Devotion + Magisterial.
- **Who:** Emperor of most of India, about 268 to 232 BC. After the war on Kalinga they turned to the Buddha's teaching, cut their edicts into rocks and pillars, and sent teachers as far as Sri Lanka and the Greek kings.
- **Fit:** **Devotion, the spreading faith** (followers abroad, clergy, conversions). Their cards read foreign cities that follow your religion and each town converted.
- **Fit:** **Magisterial, the engine and the monuments** (culture buildings as the base). Their cards read Monuments and other culture buildings.
- **Ability I, The Edicts:** Your capital gains +3 culture and +2 faith for each foreign city that follows your religion.
  - Shape: Existing: `pays` with `basis: count`, `count: followingForeign`, capital scope (The Living Hymnal's shape, for foreign cities).
  - Arithmetic: A1: nothing. A3: four to six foreign cities, +12 to +18 culture and +8 to +12 faith (low regular), with no cap. It changes play: the faith is sent abroad, not kept at home.
- **Ability II, The Pillars:** Culture buildings give +2 faith each.
  - Shape: Existing: `pays` with `count: buildingsOfCategory`, `category: culture`, `to: faith`.
  - Arithmetic: A1: three Monuments, +6 faith (regular), which wins the race to found a religion. A3: sixteen culture buildings, +32 (regular).
- **Unique unit:** **Envoy of the Law** (their dhamma-mahamatta): an Apostle with one more charge. The Canoness's row is the model.
- **Second unique:** **The Stupa** (building): +2 faith, +1 culture and +1 happiness.
- **Start bias:** Terrain: river 4, forest 1; wants `riverWithin 1`. Served on 70% of boards (Hildegard's want).
- **Colours:** sandstone buff, peacock blue (`#c9a27a`, `#12607a`).
- **Charge:** One pillar with a bell-shaped capital. The lion capital and the 24-spoke wheel are the emblem and flag of India, so they are not used.
- **Cities:** Pataliputra · Taxila · Ujjain · Tosali · Suvarnagiri · Sanchi
- **Bot persona:** `zealot`: spreads the faith with clergy and never declares war.
- **Portrait (3:4, gouache poster):** A man of fifty in a plain white cloth with one shoulder bare, a simple gold band, a calm face; no portrait from life exists. A hand on a polished sandstone pillar, a stupa and a fig tree behind, evening.
- **Overlaps and risks:** Buddhism is a living faith. The game's religions have invented names, so no ability names it; the biography does. The Iron Pillar (new age 2 wonder) is 600 years later and not theirs, though players may link them. Ajivika, a religion name, is a sect they gave caves to. The base War Elephant is the natural Mauryan unit, but a soldier would go against their story.

#### Justinian (Byzantines)

- **Status:** new. **Confidence:** good. **Decks:** Devotion + Magisterial.
- **Who:** Emperor in Constantinople from 527 to 565. They built Hagia Sophia in five years, set Roman law in one code that Europe still uses, and sent Belisarius to take back Africa and Italy.
- **Fit:** **Magisterial, the monuments** (each wonder finished and held).
- **Fit:** **Devotion, the engine and the devout realm** (faith spent, faith buildings, large content cities). Your picture of Devotion names Constantinople.
- **Ability I, Solomon, I Have Surpassed You:** Completing a wonder grants faith equal to its production cost.
  - Shape: Existing: `windfallRider` on `completion` with `wonder: true`, `fromOccasion: production`. For the builder to check: that a completion carries the cost.
  - Arithmetic: A1: one wonder of about 150 hammers pays 150 faith; a religion's first two gods cost 96. A3: 500 to 800 a wonder, the bar's lump for that band. It changes play: every wonder funds the faith.
- **Ability II, One Faith, One Empire:** Faith buildings give +1 happiness and +1 culture each.
  - Shape: Existing: two `pays` rows with `count: buildingsOfCategory`, `category: faith`.
  - Arithmetic: A1: three Shrines, +3 and +3 (culture worth 9). A3: sixteen faith buildings, +16 and +16.
- **Unique unit:** **Cataphract**: the retired row (age 3, +5 against ranged units), opened again for this seat.
- **Second unique:** **The Basilica** (building): +2 faith, +2 culture and +3 city defence.
- **Start bias:** Terrain: coast 2, hills 0.6, river 2. No hard want.
- **Colours:** porphyry, mosaic gold (`#5a1e4a`, `#d9b23c`).
- **Charge:** A dome on four arches. The double-headed eagle is 700 years later.
- **Cities:** Constantinople · Ravenna · Carthage · Thessalonica · Antioch · Justiniana Prima
- **Bot persona:** `tall`: wonders in the capital, walls, a small strong army.
- **Portrait (3:4, gouache poster):** The Ravenna mosaic as a living man: round face, dark eyes, a purple cloak with a gold panel and a jewelled crown. A model of the great church in hand, gold light.
- **Overlaps and risks:** Hagia Sophia (age 3 wonder) is their church, so a rival may build it. The Pandects, a Magisterial card, is their law book. "Justinian and Theodora" are on the shelf as a pair in `docs/leaders.md`; Theodora could share the portrait. They closed the school of Athens in 529 and put down the Nika riot with a massacre. The quote is from a later source. Purple is close to Alexander's.

### Scientific + Magisterial: the academy

**Today.** **Hypatia** (Alexandrians). *The Museion*: +25% renown. *The Commentaries*: a great person's work pays half again of what it makes. Unique unit the Alexandrian Galley, unique building the Museion.

#### Sejong the Great (Joseon)

- **Status:** new. **Confidence:** strong. **Decks:** Scientific + Magisterial.
- **Who:** King of Joseon Korea from 1418 to 1450. They made the Korean alphabet so that common people could read, filled the Hall of Worthies with scholars, and raised an engineer born a slave to build clocks and rain gauges.
- **Fit:** **Scientific, great cities and the learned land** (citizens who feed the schools, scholars).
- **Fit:** **Magisterial, the patrons** (great people of every family gained). Their cards read each great person gained.
- **Ability I, The Correct Sounds:** Every city gains +1 science and +1 culture for every four citizens.
  - Shape: Existing: two `pays` rows with `count: population`, `within: city`, `per: 4` (The Scribes' Hall without the Library).
  - Arithmetic: A1: 12 to 15 citizens, +3 and +3 (culture worth 9): a headline. A3: 70 citizens, +17 and +17 (34, regular). Age 4: 150 citizens, +37 and +37.
- **Ability II, The Royal Lectures:** Each time you gain a great person, gain science equal to four turns of your science.
  - Shape: Existing: `windfallRider` on `greatPersonGained` with `fromRate: sciencePerTurn`, `amount: 4` (The Doctorate's shape, for any family).
  - Arithmetic: A1: at most one great person, about 16 science. A3: one every 20 turns at 106 science a turn is 424 a time, about 21 a turn. It changes play: a science seat wants every family of great person.
- **Unique unit:** **Hwacha**: stands in the Trebuchet line (age 4). +10 ranged strength against units, and no bonus against cities.
- **Second unique:** **The Hall of Worthies** (building): a new row with the Museion's rule, +1 science for every great person your realm has called.
- **Start bias:** Terrain: river 3, hills 1, coast 0.5; wants `riverWithin 2`. Served today.
- **Colours:** ink navy, porcelain white (`#25346b`, `#f3f1ea`).
- **Charge:** The bowl sundial of their reign (the angbuilgu): a half circle with a pointer.
- **Cities:** Hanseong · Gaeseong · Pyongyang · Gyeongju · Jeonju · Hamhung
- **Bot persona:** `tall`: science first, great people of any family taken when offered.
- **Portrait (3:4, gouache poster):** A man of forty in the red dragon robe and the black winged cap of a Joseon king, a gentle scholarly face, after the modern standard portrait (none from life survives). A printed page of the new letters in hand, a water clock behind.
- **Overlaps and risks:** Yi Sun-sin (general, age 5) is a great person of Joseon 150 years later, which is fine. The Magisterial cards The Jinshi and The Hanlin Academy are the Chinese models of their court. Hwarang, a religion name, is from Silla, not Joseon. A much-loved figure in Korea, on the 10,000 won note.

## Record: 4. Ibn Battuta

- **Ibn Battuta is a real, playable leader, and the only one outside the pair grid.** The row in `data/leaders.json` has `rainbow: true` in place of `decks`.
- `leaderDecks` (`src/sim/leaderData.ts`) gives a rainbow seat all six decks, and each hand it is dealt samples two different decks (`src/sim/statecraft/draft.ts`). The leader screen prints "Rainbow · every deck" (`src/ui/leaderSelect.ts`).
- Their abilities are *A Guest at Every Court* (one more chair in every government) and *The Rihla* (the first redraw of every hand costs nothing). Unique unit the Rihla Caravan, unique building the Funduq. No start bias, by design.
- So they are the "no fixed deck" option: the generalist seat you asked for on 2026-09-11 ("the generalist, react to what you're given"). They are not a placeholder.
- Two things to know. Both abilities are draft effects, the kind you now reject. And Ibn Battuta is also a great person (merchant, age 4), which is why the leader's key is `ibnBattutaOfTangier`.
- This pass leaves the seat as it is. If the roster becomes one leader a pair, the rainbow seat is a sixteenth, and a better-known traveller could hold it (Marco Polo is a great person too, so the same clash would follow).

## Record: 5. Gaps in the spread, and three more candidates

The recommended fifteen, by region: Europe four (Alexander, Joan of Arc, Isabella, Lorenzo); the Middle East and Egypt four (Mehmed, Cyrus, Cleopatra, Harun al-Rashid); East Asia and the steppe three (Qin Shi Huang, Sejong, Genghis Khan); the Americas two (Pachacuti, Nezahualcoyotl); South Asia one (Ashoka); sub-Saharan Africa one (Mansa Musa).

- **Women: three of fifteen** (Joan of Arc, Isabella, Cleopatra). Today it is three of thirteen (Joan, Hypatia, Hildegard).
- **Southeast Asia, the Pacific and Japan: none.**
- **Sub-Saharan Africa: Mali only.** North America: none; the two American seats are both from the 15th century.
- **Time: seven of fifteen lived in the 15th century** (Pachacuti, Nezahualcoyotl, Sejong, Joan of Arc, Mehmed, Lorenzo, Isabella). Five are ancient. Only Harun al-Rashid stands between the year 1 and the year 1100.
- East Asia loses a seat if you pick Augustus over Qin Shi Huang. South Asia loses its only seat if you pick Justinian over Ashoka.

Three more mainstream candidates that would each fix a gap. They are not designed here.

- **Wu Zetian** (Zhou (Tang China), ruled 690 to 705). Decks: Dominion + Magisterial, or Devotion + Magisterial.
  - The only woman to rule China in their own name. They widened the examinations and used the Buddhist church to hold the throne.
  - Fixes women and East Asia at once, and reuses all of Taizong's pieces (Tang Heavy Cavalry, the Examination Court, the city list from Luoyang, jade and ivory, the dragon banner).
- **Shaka** (Zulu, about 1787 to 1828). Decks: Dominion + Expansionist.
  - They turned a small clan into a kingdom with age regiments, the short spear and the horns formation.
  - Fixes sub-Saharan Africa beyond Mali. The new Dominion card The Amabutho is their regiments, so the unit would be the Impi. A rival to Alexander for the pair.
- **Jayavarman VII** (Khmer, ruled about 1181 to 1218). Decks: Devotion + Magisterial, or Expansionist + Devotion.
  - Builder of Angkor Thom, the Bayon and 102 hospitals. Already on the shelf in `docs/leaders.md`.
  - Fixes Southeast Asia. On Expansionist + Devotion (temple cities and their reservoirs) they would replace Isabella with a far less charged figure. Angkor Wat is a wonder of an earlier king.

## Record: 6. What a successor can reuse

- **Genghis Khan takes all of Modu Chanyu's kit.** The first ability is Modu's as built. The Xiongnu Horse Archer becomes the Keshig. The Horde Camp, the start bias, the colours and the sun and moon banner stay. New: one ability row, a city list, a portrait.
- **Cleopatra takes all of Hypatia's kit:** the Alexandrian Galley, the Museion, the city list, the colours and the start bias. New: two ability rows, a banner, a portrait. Hypatia stays a great person.
- **Harun al-Rashid takes all of Al-Ma'mun's kit:** the Camel Archer, the House of Learning, the colours, the banner and the start bias. The first ability is Al-Ma'mun's second with other yields. The city list drops Samarra and adds Raqqa.
- **Hatshepsut would take all of Akhenaten's kit:** the Khopesh (with one rule changed), the Obelisk, the ankh banner, the colours and the start bias. The city list drops Akhetaten. The benched Valley of Kings also suits them.
- **Joan of Arc keeps everything** but the two ability rows and one clause of the Sainte-Chapelle.
- **Qin Shi Huang takes part of Taizong's kit:** the start bias, and the benched Post Station as the Commandery. The Examination Court and the Tang Heavy Cavalry do not fit Qin (the examinations are 800 years later). They would fit Wu Zetian whole.
- **Justinian opens the retired Cataphract row.** Basil II, for whom it was meant, stays on the shelf.
- **Sejong's Hall of Worthies is the Museion's rule on a new row.** The Examination Court would also suit Joseon, but its rule reads Military chairs.
- **The bench after the change:** the Pontic Peltast and the Mountain Hold (Mithridates), the Tang Heavy Cavalry and the Examination Court (Taizong), the Treasure Ship and the Longjiang Dockyard (Zheng He), the Canoness and the Scriptorium (Hildegard), and the first cut's pieces. The Canoness's row is the model for Ashoka's envoy.
- **Abilities that leave with their leaders** stay valid rows of effects and can be reused by any later leader: The Mandate, The Garrison Towns, The Herds, The Poison King, The Groves and the Hunt, The Great Works, The Nile's Gift, The Mu'tazila, The Treasure Fleet, The Museion (+25% renown), The Commentaries, The Rites, Symphonia.

## Record: 7. Colours

Two for each leader, as in `docs/leaders.md`, "The colours". The distance is the game's own measure (`inkDistance`, `src/art/seatInks.ts`); the rule is 40 between primaries. Every pair here is over the rule, so any mix of candidates can ship. Reused colours come from the leader who leaves.

| Leader | Status | Primary | Secondary | Words | Nearest primary | Distance |
|---|---|---|---|---|---|---|
| Pachacuti | stays | `#8b2635` | `#e0b21a` | maroon, sun gold | Qin Shi Huang | 59 |
| Nezahualcoyotl | stays | `#1fb3a5` | `#c98b2e` | turquoise, ochre | Cyrus the Great | 120 |
| Mansa Musa | stays | `#e6c419` | `#27306e` | Wangara gold, indigo | Hatshepsut | 129 |
| Ibn Battuta | today | `#b5651d` | `#0d6b78` | ochre, sea teal | Hatshepsut | 98 |
| Alexander the Great | new | `#6b2d7a` | `#e3b93a` | Tyrian purple, sun gold | Justinian | 87 |
| Genghis Khan | new | `#3a78b5` | `#efe6d2` | sky blue, bone | Cyrus the Great | 94 |
| Saladin | new | `#1e6a45` | `#ecc94b` | pine green, Ayyubid yellow | Augustus | 122 |
| Joan of Arc | rework | `#2c3e9e` | `#d9a521` | royal azure, gold | Sejong the Great | 89 |
| Mehmed the Conqueror | new | `#d81e2c` | `#f5f1e6` | Ottoman red, white | Qin Shi Huang | 90 |
| Qin Shi Huang | new | `#a83224` | `#1c1a1a` | cinnabar, lacquer black | Pachacuti | 59 |
| Augustus | new | `#5a8f2e` | `#f2eee4` | laurel green, marble | Saladin | 122 |
| Isabella of Castile | new | `#f4f1ea` | `#a8123e` | ermine white, Castile crimson | Cleopatra | 98 |
| Cyrus the Great | new | `#0f7c8c` | `#dcae3a` | Susa glaze teal, gold | Genghis Khan | 94 |
| Cleopatra | new | `#e8dcae` | `#1c3f7a` | papyrus, deep lapis | Isabella of Castile | 98 |
| Lorenzo de' Medici | new | `#7b5ea7` | `#e0b548` | iris violet, florin gold | Genghis Khan | 115 |
| Hatshepsut | new | `#e0852a` | `#234b9a` | sun orange, lapis | Ibn Battuta | 98 |
| Harun al-Rashid | new | `#1c1a1a` | `#d4a934` | Abbasid black, gold | Justinian | 123 |
| Justinian | new | `#5a1e4a` | `#d9b23c` | porphyry, mosaic gold | Pachacuti | 85 |
| Ashoka | new | `#c9a27a` | `#12607a` | sandstone buff, peacock blue | Hatshepsut | 137 |
| Sejong the Great | new | `#25346b` | `#f3f1ea` | ink navy, porcelain white | Joan of Arc | 89 |

Close to the eye, though over the rule:

- Pachacuti and Qin Shi Huang (59).
- Qin Shi Huang and Harun al-Rashid both have black as their historic colour. Harun keeps it, because the banner is drawn; Qin leads with cinnabar.
- The roster would hold three reds (Pachacuti, Mehmed, Qin) and three blues (Genghis Khan, Joan of Arc, Sejong), told apart by how light they are.

## Record: 8. For the builder

- **Leader rows** (`data/leaders.json`): eleven new rows and one changed row for the recommended fifteen. Each has `name`, `people`, `decks`, two `abilities`, `unit`, `building` or `improvement`, `colors`, `cities`, `startBias`.
- **Leaders that leave.** A save is `{config, log}`, and a config that names a removed leader will not replay. Keep the nine rows and hide them from the leader screen (a `retired` flag on `LeaderDef`, as card rows have), or accept that old saves break. This needs your builder's check of `validateLeaders` (`src/sim/leaderData.ts`).
- **New shapes: none. Small extensions: one.** Alexander's "Capturing a city grants a Settler" needs a unit id on the windfall unit grant (`WindfallGrantSpec.unit` in `src/sim/statecraftData.ts`, read in `payWindfallGrants`). Every other ability of the sixteen candidates uses a shape that a live or built row already uses.
- **Three points to check in the code:** that `foundingRider` takes a civilian unit id (Cyrus); that a `completion` rider can measure `production` (Justinian); that `renown` reads `count: bankedGold` with `countPer` (Lorenzo).
- **Unit rows** (`data/units.json`, `unlockedByLeader: true`): Hypaspist, Janissary, Qin Crossbowman, Jinete, Sparabara, Condottiere, Envoy of the Law, Hwacha; the Keshig is a rename. Each needs a size, a column, a model class and its one rule. A unit's own rule rides its row (`UnitDef.effects`).
- **Building and improvement rows:** the Gymnasium, the Külliye, the Hermandad, the Bottega, the Stupa, the Hall of Worthies, the Commandery (the Post Station renamed, with an earlier column), and the Paradise Garden in `data/improvements.json` (`unlockedByLeader`, as the Terraces).
- **A note on "replaces".** `docs/leaders.md` says a unique building replaces a base one, but the data rows stand beside the base building. The blocks here say what each row gives and leave that as it is.
- **The second unique.** `LeaderDef` asks for a building or an improvement on every row. This pass gives each new leader a modest one. If you would rather drop the rule, six of the eight new building rows can go.
- **Great people:** if Lorenzo ships, replace or keep the Cosimo de' Medici row (`data/greatPeople.json`). No other candidate is a great person.
- **Colours:** the table in "Colours" below. `test/render/seatInks.test.ts` asks for 40 between primaries; the closest pair here is at 59.
- **Banners** (`src/art/leaderBanners.ts`, `public/banners/`): eight new drawings; three reused (Modu's, Al-Ma'mun's, Joan's). Then `flair.html?review=banners`.
- **Bot personas** (`data/ai.json`, `personas`): five exist (balanced, wide, tall, zealot, warmonger). Each block names one. Joan needs a sixth: a zealot that attacks.
- **Start biases:** every bias uses a term the chooser has. Re-run the seed sweep with the new cast (`castFor` in `test/mapgen/leaderCriteria.ts`) and update the rates in `docs/mapgen.md`. That sweep is in the slow tier.
- **Tests and docs:** `test/sim/leaders.test.ts` and `test/render/seatInks.test.ts` hold the doc tables to the data, so `docs/leaders.md` ("The thirteen", "The biases", "The colours", "The cities") changes with the rows. Also `.claude/skills/card-design/SKILL.md` ("Leaders"), `references/deck-maps.md`, the "Leaders" part of each `docs/plans/<deck>-themes.md`, `test/ui/seatRoster.test.ts` if it names leaders, and the Compendium's leader shelf (generated).
- **Card checks after the build:** The Shrine Guards is nearly dead for Joan. Mansa Musa's The Hajj and Nezahualcoyotl's The Dikes are weak early (see their blocks).

## Record: 9. Questions for you

1. **One leader a pair, or two on some pairs?** I recommend fifteen now, one a pair. The alternates (Saladin, Augustus, Justinian) can be added later as second leaders with no change to the fifteen.
2. **The four contested pairs.** My picks are Joan of Arc (over Saladin), Qin Shi Huang (over Augustus), Lorenzo de' Medici (over Hatshepsut) and Ashoka (over Justinian). Which do you change?
3. **Isabella of Castile.** The fit to the decks is good and the history is heavy (the Inquisition, the expulsions, the Americas, with two American leaders in the same roster). Keep them, or take Jayavarman VII for Expansionist + Devotion?
4. **Ibn Battuta.** Keep the seat that plays every deck as a sixteenth leader, with a later rework of its two draft abilities? I recommend yes.

## Record: 10. What I could not check

- No bot game was run, so no number is measured.
- The history is from memory. The points most worth a check before any text ships: the House of Wisdom under Harun, the "books from the ships" story, the Hagia Sophia quote, and the dates of the Hermandad and the first khanqah.
- Whether bots offer deals often enough for Cleopatra's second ability.
- The three code points in "For the builder".
- Whether a portrait in the wonder paintings' style reads well at 3:4: no portrait was drawn.

## The user's comments on the page (2026-11-19)

The user commented on the review page ("ok i commented on the leader page").
The comments below are the user's words. They are the spec. A leader or a line
with no comment is not yet ruled.

| Leader | On | The user's comment |
|---|---|---|
| Alexander the Great | ability two, The Alexandrias (a capture grants a Settler) | "Change: training a military unit gives science equal to half the unit's strength." |
| Alexander the Great | the building, The Gymnasium | "Basilikoi: +2 culture, +1 science and culture on all strategic resources in the city, unlocks with the barracks." and "counts as a military building" |
| Genghis Khan | the building, The Horde Camp | "what does the horde camp do? A better effect for genghis khan: trade routes from this city can travel twice as far. +30% production towards mounted units, counts as a military building." |
| Genghis Khan | the colours (sky blue, bone) | "should the colors change?" |
| Joan of Arc | ability two, The Maid (buy units with faith; they start as Veterans) | "lets revert: units killed spread their faith, your units gain strength in cities that follow your religion." |
| Joan of Arc | the building, The Sainte-Chapelle | "keep it as it was." |
| Mehmed the Conqueror | ability one, The Enderun (military buildings give +2 science each) | "Barracks give +1 science, an additional +1 for every great scholar or great general you've recruited this game." |
| Mehmed the Conqueror | the building, The Külliye | "change: +2 science, +2 faith, +1 happiness." |
| Qin Shi Huang | the leader | "this design is great." |
| Isabella of Castile | the leader | "what does jayavarman look like? i dont like isabella as a pick." |
| Nezahualcoyotl | ability one, The Dikes | "cities with an aqueduct gain +1 science and +1 production on farms. Aqueducts arrive late so this should be stronger." |
| Cyrus the Great | ability one, The Cyrus Cylinder | "revise: cities connected by road gain +1 happiness and +2 culture for every civic and wildcard slot in your government." |
| Cyrus the Great | the improvement, The Paradise Garden | "that's so good. let's say +1 happiness and +1 culture and counts as a great person work." |
| Cleopatra | the leader | "great, i like her kit." |
| Cleopatra | the building, The Museion | "let's buff this to +2 science for every great person called." |
| Cleopatra | ability two, The Queen's Alliances | "lets make this +4 gold and +2 culture per age." |
| Lorenzo de' Medici | ability one, The Medici Bank | "let's change this to +1 renown for every 8 gold per turn you earn." |
| Lorenzo de' Medici | ability two, Florins | "lets change this to: gain 10% production towards wonders for every gold building in a city." |
| Lorenzo de' Medici | the building, The Bottega | "+5 renown towards great engineers and great artists (+10 total). +2 production for every luxury resource or great work in this city." |
| Hatshepsut | the leader | "not needed" |
| Harun al-Rashid | ability one, The Storehouse of Wisdom | "+1 science and +1 faith on faith and science buildings. (these can be multiplied by orders)." |
| Justinian | ability two, One Faith, One Empire | "+2 happiness and +5 production on holy sites." |
| Justinian | the building, The Basilica | "+3 faith and +3 city defense. +20% production towards wonders if the city has a holy site (should unlock in age 2, counts as a defensive building and a faith building)." |
| Sejong the Great | ability two, The Royal Lectures | "Each time you complete a technology, gain an extra turn of renown." |
| Sejong the Great | the building, The Hall of Worthies | "Rework: +5 renown towards scholars. +4 science." |

What follows:
- **Out:** Isabella of Castile and Hatshepsut.
- **Approved as designed:** Qin Shi Huang; Cleopatra with two changes.
- **A design is wanted for Jayavarman VII** (Expansionist + Devotion).
- **No comment yet:** Saladin, Augustus, Ashoka, Pachacuti, Mansa Musa, and the
  lines of the others that have no row above. The user edited Justinian and
  did not comment on Ashoka, so the Devotion + Magisterial pick is open.

## The user's ruling on the roster (2026-11-19, in chat)

"justinian over ashoka. assume the leaders with comments are the ones i've
selected. Pachacuti and mansa musa are approved."

The roster, one leader for each pair of decks:

| Pair | Leader | State |
|---|---|---|
| Dominion + Expansionist | Alexander the Great | selected, with the user's changes |
| Dominion + Commerce | Genghis Khan | selected, with the user's changes |
| Dominion + Devotion | Joan of Arc | selected: today's abilities and building |
| Dominion + Scientific | Mehmed the Conqueror | selected, with the user's changes |
| Dominion + Magisterial | Qin Shi Huang | selected as designed |
| Expansionist + Commerce | Pachacuti | approved, stays |
| Expansionist + Devotion | Jayavarman VII | being designed; the user has not seen the design |
| Expansionist + Scientific | Nezahualcoyotl | selected, with the user's change to The Dikes |
| Expansionist + Magisterial | Cyrus the Great | selected, with the user's changes |
| Commerce + Devotion | Mansa Musa | approved, stays |
| Commerce + Scientific | Cleopatra | selected, with the user's changes |
| Commerce + Magisterial | Lorenzo de' Medici | selected, with the user's changes |
| Devotion + Scientific | Harun al-Rashid | selected, with the user's change |
| Devotion + Magisterial | Justinian | selected over Ashoka, with the user's changes |
| Scientific + Magisterial | Sejong the Great | selected, with the user's changes |

Not selected: Saladin, Augustus, Ashoka, Isabella of Castile, Hatshepsut.
Leaving the game: Emperor Taizong, Modu Chanyu, Akhenaten, Al-Ma'mun,
Mithridates VI, Zheng He, Hypatia, Hildegard of Bingen. Ibn Battuta (the
every-deck seat) is not yet ruled.

**Ibn Battuta stays** (the user, 2026-11-19: "ibn battuta is great, he's my
favorite"). He is the sixteenth seat, the every-deck leader, outside the
fifteen pairs. His two abilities stay as they are; nobody is to rework them
unless the user asks. Because he stays a leader, the great person row with his
name is renamed (the great people pass proposes Ibn Jubayr, change C25).
