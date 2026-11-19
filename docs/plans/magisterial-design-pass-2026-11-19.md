# Magisterial design pass (2026-11-19)

**Status:** a proposal for your review. Nothing here is built. The deck sheet (`docs/decks/magisterial.md`), the data and the code are unchanged. The review page is generated from the same data as this file (the script and data are named at the foot).

Your request, 2026-11-19, verbatim:

> *"please run a design pass on the magisterial and dominion decks, they feel underpowered/not as fun. produce an artifact for each that details the changes/cuts/additions you'd make along with the thematic rationale for each change. go for more changes than needed, i'll go through and approve or rejct every change."*

- This is a design proposal. It changes no data and no code. You approve or reject each change by its number.
- Card text under "Now" is the game's own text, read from the data rows and the describers on 2026-11-19. History in the thematic lines is from my own knowledge and is not checked against a source.
- Every number is a first guess against the power bar and is marked "to tune in playtest". No bot game was run.
- The method is the card-design skill (`.claude/skills/card-design/SKILL.md`) and its power bar. The two approved plans of 2026-11-18 (the generic Orders and the wonders) are taken as built, and no change repeats one of their effects.

## 1. Why the deck feels weak

- **Three of the four themes count things that arrive slowly, and the cards pay as if they were plentiful.** Bots call 2 or 3 great people by turn 100 and 5 or 6 by turn 150. A great person acts or lays a work, so a seat holds fewer works than that. A work yields 3. The Quarter of Masters pays +3 for a work beside a work. The Masters' Domain pays 6 a work at Tier III: 18 to 24 with three or four works, against a regular card at 60 to 120. The Processional Way, a Tier IV rare, pays 18 for a line of three, against a headline of 200. The Divine Proportion doubles these small numbers. The deck has no card that makes great people cheaper.
- **The Wildcard chair is jammed.** 18 of the 64 cards are Wildcard, and 8 of the 16 in Tier III. A government has one Wildcard chair until tier 18, then two, then three. So through Tiers I and II one chair must serve The Second Reading, The Open Door, The Unveiling, The Symposium, The Grand Vizier and two commissions. The player drafts the deck's most interesting cards and cannot seat them. Commission: The Roll of the Senate would help, but its goal of ten Orders is met only as Tier I ends.
- **Many cards pay a meter nobody is short of, or a rule nobody sees.** You said on 2026-09-03 that authority and happiness are too plentiful. The Nomarchs pays +2 authority at five chairs (the generic Local Clerks pays +3 with no condition). The Keepers of Wonders pays happiness only. The Ceremonial Guard pays +5 defence. The Open Door saves about 4 culture a turn. The Unwritten Chapter and The Second Sitting pay for passing, which is rarely the right play. The Hall of Wonders and the Doctrine The Jinshi change the hand, not the board.
- **The exciting cards are few and late, and some bands have no rare worth the name.** Tier 0 has no rare. Tier I has one, The Working Court, which pays about 7 production when it is dealt (30% of 25 culture) against a headline of 40 to 50. The deck's picture says it has more boons than any deck; it has three. Its best moments (a free great person, a Doctrine offer, another chair) sit at Tier III or behind hard goals. The Sed Festival is dealt at the same draft as the tier-10 government, so it can fire only twice.
- **Four cards do one job, and the Military chairs stay empty.** The Cornerstone, The Guild of Masons, Sacred Commissions and The House of Wisdom all say "+X% production toward wonders". The deck has two Military cards and none after Tier I, while governments hold one to four Military chairs. Commission: The Golden Bull asks for every typed chair to be filled, which this deck cannot do alone.
- **What works and stays.** The Prytaneion (25 food at five chairs and five towns), The Prefects, The Boule, The Pandects, The Accessions Register, The Wandering Muse, The Universal Genius, Magnificence, The Wonder Commonwealth and The Mixed Constitution are sound. The council theme is the strongest of the four. The changes below move the other three themes up to it.

## 2. Every change

19 buff, 8 new, 8 rework, 5 cut, 3 move, 5 doctrine: 48 in all.

| # | Card | Kind | Tier | Confidence |
|---|---|---|---|---|
| 01 | The Court Painter | buff | Tier 0 | strong |
| 02 | The Cornerstone | buff | Tier 0 | good |
| 03 | Master Masons | buff | Tier 0 | good |
| 04 | The Twelve Tables | new | Tier 0 | strong |
| 05 | The Nomarchs | rework | Tier I | good |
| 06 | Commission: The Roll of the Senate | buff | Tier I | strong |
| 07 | The Guild of Masons | rework | Tier I | good |
| 08 | The Keepers of Wonders | buff | Tier I | good |
| 09 | The Ceremonial Guard | rework | Tier I | good |
| 10 | The Working Court | buff | Tier I | strong |
| 11 | The Encyclopedia | rework | Tier I | good |
| 12 | The Open Door | cut | Tier I | strong |
| 13 | Civic Granaries | buff | Tier I | strong |
| 14 | The Sed Festival | move | Tier II to Tier I | strong |
| 15 | The Friends of Khufu | new | Tier I | good |
| 16 | The Unveiling and The Symposium | move | Tier I and Tier II | good |
| 17 | The Grand Vizier | buff | Tier II | good |
| 18 | The Senate Charter | rework | Tier II | good |
| 19 | Letters Patent | buff | Tier II | speculative |
| 20 | The Honoured Dead | buff | Tier II | good |
| 21 | Commission: The Patron's Gallery | buff | Tier II | good |
| 22 | The Quarter of Masters | rework | Tier II | good |
| 23 | The Golden Age | buff | Tier II | strong |
| 24 | The Learned Patron | buff | Tier II | strong |
| 25 | The Unwritten Chapter | cut | Tier II | good |
| 26 | The Hanlin Academy | new | Tier II | strong |
| 27 | The Spirit Way | new | Tier II | good |
| 28 | The Lawgiver | new | Tier II | good |
| 29 | The Hall of Heroes | new | Tier II | good |
| 30 | The Mixed Constitution | move | Tier III to Tier II | good |
| 31 | Commission: The Golden Bull | rework | Tier III | good |
| 32 | The Masters' Domain | buff | Tier III | strong |
| 33 | The Garden Courts | buff | Tier III | good |
| 34 | Commission: The Paradise Garden | cut | Tier III | good |
| 35 | The Second Sitting | cut | Tier III | speculative |
| 36 | The Divan | new | Tier III | good |
| 37 | The Privy Council | rework | Tier IV | good |
| 38 | The Last Commission | buff | Tier IV | good |
| 39 | The Processional Way | buff | Tier IV | good |
| 40 | Commission: The Ideal City | buff | Tier IV | good |
| 41 | The Hall of Wonders | cut | Tier IV | strong |
| 42 | The Grand Retrospective | buff | Tier IV | good |
| 43 | The Nine Jewels | new | Tier IV | good |
| 44 | The Jinshi | doctrine | Tier II Doctrine | good |
| 45 | The Magnaura | doctrine | Tier II Doctrine | good |
| 46 | The Bourgs | doctrine | Tier III Doctrine | speculative |
| 47 | The Gobelins | doctrine | Tier IV Doctrine | strong |
| 48 | The Stele of Deeds | doctrine | Tier II Doctrine | good |

## 3. The changes

Each change stands alone unless its block names another change.

### 01. The Court Painter (buff)

- **Tier, rarity, type:** Tier 0, common, Civic.
- **Now:** Each card you draft grants 15 renown. A charter counts.
- **Proposed:** Each card you draft grants 15 renown for each age you have reached. A charter counts.
- **Theme:** Courts kept painters on a wage to record each new honour: the Song painting academy, the Mughal workshops. A richer court gave larger commissions.
- **Play:** A draft comes every 7 or 8 turns, so the card pays 2 renown a turn. The second great person costs 301 renown and the third 531, so the card stops mattering after the first. With the age it pays 4, 6 and 8 a turn. Floor: one early great person. It feeds every card that reads great people.
- **Shape:** Existing shape: windfallRider on cardDrafted with a renown grant and perAge.
- **Confidence:** strong.

### 02. The Cornerstone (buff)

- **Tier, rarity, type:** Tier 0, common, Economic.
- **Now:** Towns build wonders 20% faster.
- **Proposed:** Towns build wonders and culture buildings 25% faster.
- **Theme:** Mesopotamian and Egyptian kings laid a foundation deposit with their name under each temple and public building. The rite was for every public work, not only the greatest.
- **Play:** A seat that builds no wonder in Tier 0 gets nothing. With culture buildings the card speeds every Monument (the floor) and the first wonder (the ceiling). It also stops being a smaller copy of The Guild of Masons.
- **Shape:** Existing kind: productionBonus. A filter for culture buildings is to confirm.
- **Confidence:** good.

### 03. Master Masons (buff)

- **Tier, rarity, type:** Tier 0, common, Economic.
- **Now:** Finishing a culture building grants 30 production in its town.
- **Proposed:** Finishing a culture building grants its town 30 production for each age you have reached.
- **Theme:** A masons' lodge that finished one job took its crew and tools to the next job in the same town. Larger buildings trained larger crews.
- **Play:** A seat builds three or four Monuments in age 1, so the card pays about 100 production once. An Amphitheater costs about three times a Monument and the grant stays 30. With the age, each later building pays 60 to 120, a lump the player notices.
- **Shape:** Existing shape: windfallRider on buildingCompletion (culture) with perAge.
- **Confidence:** good.

### 04. The Twelve Tables (new)

- **Tier, rarity, type:** Tier 0, rare, Civic.
- **Now:** not in the deck.
- **Proposed:** Your capital gains +1 production and +1 culture for each Order you hold, seated or not.
- **Theme:** Rome's first written laws, about 450 BC, stood on bronze tablets in the Forum. Each later law joined the public record, and the body of law made the city governable.
- **Play:** Engine glue and a scaler; Tier 0 has no rare today. It pays 3 + 3 at the third draft, 10 + 10 when Tier II opens and 26 + 26 at Tier IV, so it is worth a chair all game. It reads Orders held, which every draft, boon and free hand raises. Culture is scarce early, so +1 is the right size.
- **Shape:** Existing shape: pays, where capital, basis count, count ordersHeld.
- **Confidence:** strong.

### 05. The Nomarchs (rework)

- **Tier, rarity, type:** Tier I, uncommon, Civic.
- **Now:** +1 authority for every two cards you have seated.
- **Proposed:** +2 authority. Your capital gains +1 culture for each point of authority you have to spare.
- **Theme:** Egypt's nomarchs governed the provinces for the crown. A province held with ease sent its surplus to the court.
- **Play:** Authority is plentiful, so +2 of it at five chairs buys nothing. This card turns the spare meter into the scarce currency. Six spare points are +6 culture a turn in age 2, where a seat makes about 25. Each new town costs 3 of it, so founding becomes a real choice. Expansionist's The Mandarinate reads the same meter as a percentage.
- **Shape:** Existing shapes: authority, and pays (capital, count authoritySurplus).
- **Confidence:** good.

### 06. Commission: The Roll of the Senate (buff)

- **Tier, rarity, type:** Tier I, uncommon, Wildcard.
- **Now:** Goal: hold ten Orders. Reward: one more Wildcard chair.
- **Proposed:** Goal: hold seven Orders. Reward: one more Wildcard chair.
- **Theme:** The Roman censors kept the roll of the Senate and added names to it.
- **Play:** Tier I runs from draft 4 to draft 10. With a goal of ten, the chair arrives as the tier ends, and the commission holds the only Wildcard chair until then. With seven, it arrives at about the third draft of the tier, and the new chair then seats the deck's Wildcard cards.
- **Shape:** Existing shape (one number).
- **Confidence:** strong.

### 07. The Guild of Masons (rework)

- **Tier, rarity, type:** Tier I, uncommon, Economic.
- **Now:** +30% production toward wonders.
- **Proposed:** Completing a wonder grants every town 40 production for each age you have reached.
- **Theme:** Medieval masons' lodges moved on when a great church was finished, and the trained crews went to work in other towns.
- **Play:** Four cards say "+X% toward wonders". This one becomes the pay-off for finishing a wonder. In age 2 with five towns it pays 400 production, a lump in the 200 to 400 range for its tier. Floor: zero with no wonder, so it is an engine card and not glue.
- **Shape:** Existing shape: windfallRider on completion (wonder), a grant to every town, perAge.
- **Confidence:** good.

### 08. The Keepers of Wonders (buff)

- **Tier, rarity, type:** Tier I, common, Civic.
- **Now:** +2 happiness for each wonder you hold.
- **Proposed:** Each wonder you hold gives +2 happiness and +3 gold.
- **Theme:** Greek cities competed for the title of temple-warden of a great shrine, because its visitors and festivals brought money.
- **Play:** Happiness is plentiful, so the card often pays nothing the player feels. Gold gives it a floor. With three wonders it pays +6 happiness and +9 gold. The generic The Good Years doubles the bonus from spare happiness, so the happiness half has a pay-off later.
- **Shape:** Existing shape: pays (empire, count wonders), twice.
- **Confidence:** good.

### 09. The Ceremonial Guard (rework)

- **Tier, rarity, type:** Tier I, common, Military.
- **Now:** Towns holding a wonder gain +5 defence.
- **Proposed:** Completing a wonder grants the best melee unit you can build. It costs no upkeep.
- **Theme:** Great monuments had standing guards, such as the Medjay at the royal tombs of Thebes. The guard was raised when the place was finished.
- **Play:** +5 defence is a rule the player never sees. A free unit is a moment, and it is the army of a seat that spends its production on wonders. One unit for each wonder keeps the pieces few. The deck has two Military cards, and this makes one of them worth its chair.
- **Shape:** Small extension, to confirm: windfallRider on completion (wonder) with a unit grant in that town. The unit grant exists for boons and for every town.
- **Confidence:** good.

### 10. The Working Court (buff)

- **Tier, rarity, type:** Tier I, rare, Economic.
- **Now:** Towns with a Monument gain production equal to 30% of their culture.
- **Proposed:** Towns with a Monument gain production equal to 50% of their culture.
- **Theme:** A court that paid for festivals and buildings also employed the town. Its culture was work for craftsmen.
- **Play:** It is the only rare of Tier I. A seat makes about 25 culture in age 2, so 30% is 7 production against a headline of 40 to 50. At 50% it pays 12 when dealt, 40 in age 3 and over 200 in age 4. It is the deck's conversion card and should feel like one.
- **Shape:** Existing shape (one number): pays, city, basis share.
- **Confidence:** strong.

### 11. The Encyclopedia (rework)

- **Tier, rarity, type:** Tier I, common, Civic.
- **Now:** +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each.
- **Proposed:** Each card you draft grants science equal to two turns of your science.
- **Theme:** The great compilations, such as Pliny's Natural History and the Yongle Encyclopedia, were made by gathering every text the court could collect. Each new text added to what was known.
- **Play:** At Tier I a seat holds one or two unseated cards, so the card pays +1 or +2. As proposed, drafting pays the deck's gap, science: about a quarter more science at one draft every 7 or 8 turns. Free hands pay it too.
- **Shape:** Existing shape: windfallRider on cardDrafted, grant fromRate. Related to change 04. If you reject The Twelve Tables, keep this card as it is and remove its cap.
- **Confidence:** good.

### 12. The Open Door (cut)

- **Tier, rarity, type:** Tier I, uncommon, Wildcard.
- **Now:** Order hands cost 15% less culture.
- **Proposed:** cut; retire the row.
- **Theme:** No theme change. The card leaves the deck and its row is retired.
- **Play:** The saving is about 27 culture on a hand of 182, or 4 culture a turn, and the player never sees it happen. It also holds the one Wildcard chair. The Twelve Tables and The Nomarchs pay culture the player can see.
- **Shape:** Data only: retire the row.
- **Confidence:** strong.

### 13. Civic Granaries (buff)

- **Tier, rarity, type:** Tier I, common, Economic.
- **Now:** Monuments give +1 food and +1 production.
- **Proposed:** Culture buildings give +1 food and +1 production each.
- **Theme:** Public buildings held the town's stores. The Greek prytaneion kept the common hearth and fed the guests of the city.
- **Play:** With four towns it pays 8, under the Tier I bar of 15 to 25, and it never grows. On every culture building it pays 8 when dealt and about 30 in age 3 (two or three culture buildings in six towns). It is the widen card for culture buildings. The generic The Builders' Lodge doubles it.
- **Shape:** Existing shape: pays, city, count buildingsOfCategory (culture).
- **Confidence:** strong.

### 14. The Sed Festival (move)

- **Tier, rarity, type:** Tier II to Tier I, rare, Civic.
- **Now:** Tier II. Each time you adopt a government, gain a free great-person draft.
- **Proposed:** Tier I. Each time you adopt a government, gain a free great-person draft.
- **Theme:** Egypt's Sed festival renewed the king's rule after thirty years, with gifts and new works. It is an age 1 institution, so Tier I fits its era better.
- **Play:** Tier II opens at draft 10, the same draft as the tier-10 government. So the card arrives after that adoption and can fire only twice, at tiers 18 and 26. From Tier I it can fire three times, and the first comes while a great person is still rare. It gives Tier I a second rare.
- **Shape:** Data only: the band.
- **Confidence:** strong.

### 15. The Friends of Khufu (new)

- **Tier, rarity, type:** Tier I, uncommon, Economic.
- **Now:** not in the deck.
- **Proposed:** A town building a wonder may spend a citizen for production toward it.
- **Theme:** The pyramids were built by named work gangs raised from the villages in turns and fed by the state. "Friends of Khufu" is a gang name found on the blocks.
- **Play:** Monuments theme, supply and act. Levies are one of your keywords and this deck has none. A citizen pays the food it took to grow, as Levy of the Land does, once every five turns. Food from The Prytaneion and Civic Granaries becomes wonders. Floor: zero with no wonder in the queue.
- **Shape:** Existing shape: levy with use "wonder". The use is in levies.ts, and no live card has it.
- **Confidence:** good.

### 16. The Unveiling and The Symposium (move)

- **Tier, rarity, type:** Tier I and Tier II, uncommon, Wildcard to Civic.
- **Now:** Wildcard. "Completing a wonder deals you a free Order hand." and "Each time you gain a great person, you are dealt a free Order hand."
- **Proposed:** Civic. Both texts stay.
- **Theme:** No theme change.
- **Play:** A government has one Wildcard chair until tier 18, and 18 of the 64 cards want it. These two pay a moment with a free hand, which is culture saved, and culture cards are Civic. The Wandering Muse and The Sed Festival also grant a draft and are Civic already. This bends the sort rule "a card that acts on the draft is Wildcard". Say if you want the rule kept.
- **Shape:** Data only: the type.
- **Confidence:** good.

### 17. The Grand Vizier (buff)

- **Tier, rarity, type:** Tier II, rare, Wildcard.
- **Now:** The card in your first Economic chair pays its yields twice.
- **Proposed:** The card in your first chair pays its yields twice.
- **Theme:** The vizier stood first after the ruler and acted with the ruler's own seal.
- **Play:** The Theocracy has no Economic chair, so the card does nothing there. With "first chair" it works under every government, and the player chooses what to double by the card they seat there.
- **Shape:** Existing kind: slotPosition. A position that takes any chair type is to confirm.
- **Confidence:** good.

### 18. The Senate Charter (rework)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** Unlocks the Assembly Hall in your capital: +3 happiness and +30% production toward buildings. (The hall also gives +1 science and +1 culture for each Wildcard card seated, +2 authority and +1 renown a turn.)
- **Proposed:** Charter. Unlocks the Assembly Hall in your capital: one more Wildcard chair and +3 happiness.
- **Theme:** A senate needs a house: the Curia in Rome, the Bouleuterion in Athens. The building is where the council sits.
- **Play:** The hall has six small lines today and the player feels none of them. One chair is felt at once, and the player buys it with production (about 135 hammers). As a true Charter the card takes no chair, so the hall is a net gain. This is the second early source of a Wildcard chair.
- **Shape:** Existing shapes, to confirm: the Charter keyword, and a building that opens a chair (buildingOpensChairs in council.ts).
- **Confidence:** good.

### 19. Letters Patent (buff)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** Your great people's acts pay 50% more.
- **Proposed:** Your great people's acts pay double.
- **Theme:** Letters patent were an open grant from the crown that gave one person an office, a title or a monopoly. The crown's name made the person's act count for more.
- **Play:** An act is about eight turns of one yield, and a great person comes about every 30 turns. So +50% is four turns of one yield in 30, too small to hold a chair. Double makes "act or lay a work" a real question. I could not confirm the size of each family's act.
- **Shape:** Existing shape (one number): effectAmplifier on greatPersonAct.
- **Confidence:** speculative.

### 20. The Honoured Dead (buff)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** Gains +2 science and +4 production in your capital each time you spend a great person.
- **Proposed:** Gains +5 science and +5 production in your capital each time you spend a great person.
- **Theme:** Cities kept public tombs and yearly rites for their great dead, as Athens did with its public funeral. The names kept working for the city.
- **Play:** After three great people it pays 18 against the Tier II bar of 35 to 60. At +5 and +5 it pays 30 after three and 50 after five. It is the patrons' scaler. The generic The Long Memory doubles each gain, and The Summer Palace adds half.
- **Shape:** Existing shape (two numbers): the Scaler.
- **Confidence:** good.

### 21. Commission: The Patron's Gallery (buff)

- **Tier, rarity, type:** Tier II, uncommon, Wildcard.
- **Now:** Goal: hold great-person works of three families. Reward: a free great-person draft and 200 culture.
- **Proposed:** Goal: hold three great-person works. Reward: a free great-person draft and 200 culture.
- **Theme:** A patron's gallery showed the best of every master the house had paid.
- **Play:** A seat has two or three great people by turn 100. Three families means that the first three must all differ and must all lay works. Three works of any family keeps the plan and drops the tracking. Batch DS1 cut The Living Canon because few players track families.
- **Shape:** Existing shape: a reached goal on the great-person works in your borders.
- **Confidence:** good.

### 22. The Quarter of Masters (rework)

- **Tier, rarity, type:** Tier II, common, Civic.
- **Now:** A great-person work beside another great-person work yields its own yield again. This never stacks.
- **Proposed:** A great-person work beside another great-person work gives +4 culture and +4 production.
- **Theme:** Masters of one trade lived on one street and shared tools, apprentices and buyers, as in the weavers' quarter of Kyoto or the coppersmiths' street of Cairo.
- **Play:** A work yields 3, so a pair pays 6 today. The approved wonder that doubles great-person works does this job better. As proposed, a pair pays 16 and three in a cluster pay 24, and The Divine Proportion has something to double.
- **Shape:** Existing shape: pays, hex, on a great-person work beside one.
- **Confidence:** good.

### 23. The Golden Age (buff)

- **Tier, rarity, type:** Tier II, rare, Civic.
- **Now:** Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns.
- **Proposed:** Completing a wonder or gaining a great person gives your cities +25% production and culture for ten turns. A later one restarts the ten turns.
- **Theme:** Golden ages are named for their monuments and their masters together: Periclean Athens, Tang Chang'an, Abbasid Baghdad.
- **Play:** A wonder comes about every 30 turns, so the card is on a third of the time: about +7% for a rare. With great people as a second moment, a seat with both themes keeps it on more than half the time. It is a bridge between the monuments and the patrons.
- **Shape:** Existing shape: windfallRider with anyOf moments and a timed grant.
- **Confidence:** strong.

### 24. The Learned Patron (buff)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** Towns with two culture buildings gain science equal to 15% of their culture.
- **Proposed:** Towns with an Amphitheater gain science equal to 30% of their culture.
- **Theme:** The patrons who paid for theatre and poetry also kept scholars, as the Ptolemies did at Alexandria.
- **Play:** A seat makes about 83 culture in age 3, so 15% is 12 science against a bar of 35 to 60. At 30% it pays 25 in age 3 and about 130 in age 4. One named building is plainer than "two culture buildings", the pattern the deck notes say to avoid. It is the twin of The Working Court.
- **Shape:** Existing shape: pays, city, basis share, scope hasBuilding.
- **Confidence:** strong.

### 25. The Unwritten Chapter (cut)

- **Tier, rarity, type:** Tier II, common, Civic.
- **Now:** Each time you pass on an Order hand, gain science equal to half the culture the hand cost.
- **Proposed:** cut; retire the row.
- **Theme:** No theme change. The card leaves the deck and its row is retired.
- **Play:** A pass spends the whole price of a hand, and a card is almost always worth more than half its price in science. So the right play is not to pass, and the card pays nothing. The Encyclopedia (change 11) pays science for drafting instead.
- **Shape:** Data only: retire the row.
- **Confidence:** good.

### 26. The Hanlin Academy (new)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** not in the deck.
- **Proposed:** Great people cost 20% less renown.
- **Theme:** The Tang emperors founded the Hanlin Academy in the 8th century. It kept scholars, painters and calligraphers at court on a salary, ready to be called.
- **Play:** Patrons theme, supply. Every patrons and landscape card is priced on the number of great people, and the deck has no card that raises it. 20% less is about one more great person by turn 150. Floor: good in any seat, because wonders and culture buildings pay renown. The approved Solomon's Temple gives 10% the same way.
- **Shape:** Existing shape: rulePercent, rule greatPersonCost.
- **Confidence:** strong.

### 27. The Spirit Way (new)

- **Tier, rarity, type:** Tier II, uncommon, Civic.
- **Now:** not in the deck.
- **Proposed:** Towns holding a wonder count as working a great-person work.
- **Theme:** A spirit way is the road to a Chinese imperial tomb, lined with stone figures. The monument and the works around it were made as one place.
- **Play:** A bridge between the monuments and the landscape. Works are the scarcest thing the deck reads. With this card each wonder town is paid by The Laureate (+5 culture, +3 science), The Garden Courts (+20%) and the Doctrine The Bourgs. Floor: zero with no card that reads works, so it is an engine card.
- **Shape:** New shape, small: the town test workingGreatWork also admits a town with a wonder while the holder has this rule.
- **Confidence:** good.

### 28. The Lawgiver (new)

- **Tier, rarity, type:** Tier II, rare, Civic (Boon).
- **Now:** not in the deck.
- **Proposed:** On draft: gain a Doctrine offer.
- **Theme:** Cities in crisis gave one person the power to rewrite the laws: Solon in Athens, Hammurabi in Babylon, Prince Shotoku and his Seventeen Articles. The laws outlasted the office.
- **Play:** Council theme, act. A Doctrine is the strongest thing the game gives, and a seat gets four. A fifth is a moment the player remembers, and it feeds The Pandects. The deck should have the most boons and has three. It takes no chair.
- **Shape:** Small extension: the Doctrine offer exists as a commission reward (The Golden Bull). As an on-draft grant it is new.
- **Confidence:** good.

### 29. The Hall of Heroes (new)

- **Tier, rarity, type:** Tier II, uncommon, Military.
- **Now:** not in the deck.
- **Proposed:** Your units gain +1 strength for each great person you have gained.
- **Theme:** Armies marched under the names of their honoured dead: the ancestor masks of Roman families, the enshrined heroes of Japan.
- **Play:** Patrons theme, widened to the army. The deck has no Military card after Tier I. Three great people at turn 100 give +3 on a strength of 42 to 50 (a regular war card), and six by turn 150 give +6 (a strong one). It has no cap, because batch DS1 kept two capped "this game" cards for each deck.
- **Shape:** Existing shape: combatLine with the count greatPeopleGained.
- **Confidence:** good.

### 30. The Mixed Constitution (move)

- **Tier, rarity, type:** Tier III to Tier II, rare, Wildcard.
- **Now:** Tier III. Your cards fit any chair.
- **Proposed:** Tier II. Your cards fit any chair.
- **Theme:** Polybius wrote in the 2nd century BC that Rome was strong because it mixed consuls, senate and assemblies. That is the age of the Republic, which is Tier II.
- **Play:** The chairs bind hardest at Tier II: each tier-10 government lacks one type (the Republic has no Military chair, the Theocracy no Economic chair, Tyranny no Civic chair). By Tier III every government has every type and two Wildcard chairs, so the card arrives after the problem.
- **Shape:** Data only: the band.
- **Confidence:** good.

### 31. Commission: The Golden Bull (rework)

- **Tier, rarity, type:** Tier III, uncommon, Wildcard.
- **Now:** Goal: fill every Military, Economic and Civic chair with a card of its type. Reward: a Doctrine offer.
- **Proposed:** Goal: hold 20 Orders. Reward: a Doctrine offer.
- **Theme:** The Golden Bull of 1356 fixed who elected the emperor and ended a century of disputed elections. A long and settled body of law earned a new one.
- **Play:** A typed card fits only its own chair or a Wildcard chair, so today's goal means "leave no typed chair empty". This deck has two Military cards, so the goal depends on the partner deck. A seat that drafts holds 20 Orders two or three drafts into Tier III. The goal is the deck's own act.
- **Shape:** Existing shape: a reached goal on ordersHeld, as The Roll of the Senate has.
- **Confidence:** good.

### 32. The Masters' Domain (buff)

- **Tier, rarity, type:** Tier III, uncommon, Economic.
- **Now:** Worked great-person works give +3 food and +3 production.
- **Proposed:** Worked great-person works give +6 food and +6 production.
- **Theme:** A master was given land to support the work: a studio, an estate, a school with its own fields.
- **Play:** With three or four works it pays 18 to 24 against the Tier III bar of 60 to 120. At +6 it pays 36 to 48, and The Divine Proportion doubles that to 72 to 96.
- **Shape:** Existing shape (two numbers): pays, hex.
- **Confidence:** strong.

### 33. The Garden Courts (buff)

- **Tier, rarity, type:** Tier III, uncommon, Civic.
- **Now:** Towns working at least two great-person works gain +20% culture and science.
- **Proposed:** Towns working a great-person work gain +20% culture and science.
- **Theme:** Palace gardens were courts of learning: the courts of the Alhambra, the scholar gardens of Suzhou.
- **Play:** Two works in one town is a narrow condition, and it pays one town. With one work it pays two to four towns. With The Spirit Way (change 27) it pays every wonder town too.
- **Shape:** Existing shape: percentYields with the scope workingGreatWork.
- **Confidence:** good.

### 34. Commission: The Paradise Garden (cut)

- **Tier, rarity, type:** Tier III, rare, Wildcard.
- **Now:** Goal: have a great-person work with three works or tended hexes beside it. Reward: every unowned hex within three hexes joins your borders.
- **Proposed:** cut; retire the row.
- **Theme:** No theme change. The card leaves the deck and its row is retired.
- **Play:** The goal joins two narrow facts. The reward claims unowned hexes at Tier III, when few are left. The card holds a Wildcard chair while it waits. The Landmark Bounds does the land job early, and Commission: The Ideal City stays as the commission about arrangement.
- **Shape:** Data only: retire the row.
- **Confidence:** good.

### 35. The Second Sitting (cut)

- **Tier, rarity, type:** Tier III, rare, Wildcard.
- **Now:** Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once.
- **Proposed:** cut; retire the row.
- **Theme:** No theme change. The card leaves the deck and its row is retired.
- **Play:** In play it is one free reroll of every hand. That is the job of The Second Reading, with harder words and a rare's chair. You approved it as a capstone on 2026-10-25 with the other recommendations, so this cut is yours to refuse. If you keep one pass card, keep this one.
- **Shape:** Data only: retire the row.
- **Confidence:** speculative.

### 36. The Divan (new)

- **Tier, rarity, type:** Tier III, uncommon, Civic.
- **Now:** not in the deck.
- **Proposed:** You have one more Economic chair and one more Military chair.
- **Theme:** The Ottoman Divan sat the treasurers and the judges of the army beside the viziers. Finance and war each had a seat at the council.
- **Play:** Council theme, supply. The card takes one chair and gives two, so the council grows by one, and it turns a Civic chair into the types the government is short of. Every card that counts seated cards gains from it.
- **Shape:** Small extension: a typed chair on slotRider. The approved wonders build adds the same thing ("one more Military chair"). Shares the typed-chair extension with change 44.
- **Confidence:** good.

### 37. The Privy Council (rework)

- **Tier, rarity, type:** Tier IV, rare, Wildcard.
- **Now:** Each of your cards that pays production pays +1 more production wherever it pays it.
- **Proposed:** The cards in your Wildcard chairs pay their yields twice.
- **Theme:** A privy council was the ruler's small inner council. Its members acted with the crown's own authority.
- **Play:** "+1 more on every line" is hard to predict and small for a Tier IV rare. As proposed, the player seats their best yield cards in the three Wildcard chairs of a tier-26 government, or in more with the deck's extra chairs. It is clear and large. A ruling is needed on a card doubled twice (with The Arthashastra): I suggest three times, not four.
- **Shape:** Small extension: slotPosition over every Wildcard chair. Today it names one position.
- **Confidence:** good.

### 38. The Last Commission (buff)

- **Tier, rarity, type:** Tier IV, rare, Economic.
- **Now:** Spending a great person adds 150 production to your Magnum Opus.
- **Proposed:** Spending a great person adds 150 production to your Magnum Opus for each age you have reached.
- **Theme:** A master's last work was often for the patron's greatest project, as Michelangelo's was the dome of St Peter's.
- **Play:** The Opus costs about 4,000 production by the cost standard (my estimate; I did not confirm the column). So 150 is under 4% of it, once every 20 or 30 turns. With the age it is 600, about a seventh of the Opus for each great person.
- **Shape:** Existing shape: windfallRider with perAge.
- **Confidence:** good.

### 39. The Processional Way (buff)

- **Tier, rarity, type:** Tier IV, rare, Civic.
- **Now:** Great-person works in a straight line of three or more give +3 culture and +3 science each.
- **Proposed:** Great-person works in a straight line of three or more give +10 culture and +10 science each.
- **Theme:** Babylon's Processional Way ran straight from the Ishtar Gate to the temple of Marduk, between walls of glazed reliefs.
- **Play:** A line of three pays 18 today against a Tier IV headline of 200. At +10 a line of three pays 60 and a line of four 80, and The Divine Proportion doubles it. Arrangements of works are on your list of themes for this deck, so the line stays.
- **Shape:** Existing shape (two numbers).
- **Confidence:** good.

### 40. Commission: The Ideal City (buff)

- **Tier, rarity, type:** Tier IV, rare, Wildcard.
- **Now:** Goal: have one town hold two wonders and work three great-person works. Reward: that town gains +25% culture, science and production.
- **Proposed:** Goal: have one town hold two wonders and work two great-person works. Reward: that town's culture, science and production are doubled.
- **Theme:** Planners drew one perfect capital to hold everything: the round city of Baghdad, Filarete's Sforzinda.
- **Play:** +25% in one town is about 40 yield at Tier IV, for the hardest goal in the deck. A doubled capital is a reward the player plans the whole game around. Two works, not three, because a seat holds three to five works in all.
- **Shape:** Existing shape (numbers).
- **Confidence:** good.

### 41. The Hall of Wonders (cut)

- **Tier, rarity, type:** Tier IV, rare, Wildcard.
- **Now:** Order hands deal one more card for every two wonders you hold, at most two more.
- **Proposed:** cut; retire the row.
- **Theme:** No theme change. The card leaves the deck and its row is retired.
- **Play:** Officials by Merit already widens every hand at Tier III, so this is a second card with one job. By Tier IV few drafts are left, and a wider hand changes nothing on the board.
- **Shape:** Data only: retire the row.
- **Confidence:** strong.

### 42. The Grand Retrospective (buff)

- **Tier, rarity, type:** Tier IV, rare, Civic (Boon).
- **Now:** On draft: gain 20 culture, science and production for each wonder, great-person work and Order you hold.
- **Proposed:** On draft: gain 40 culture, science and production for each wonder, great-person work and Order you hold.
- **Theme:** A retrospective shows a master's whole life of work in one place.
- **Play:** A seat with 28 Orders, 4 wonders and 3 works gains 700 of each. A Tier IV hand costs about 1,300 culture, and a lump at this tier registers at 1,000 or more. At 40 it pays 1,400 of each.
- **Shape:** Existing shape (one number).
- **Confidence:** good.

### 43. The Nine Jewels (new)

- **Tier, rarity, type:** Tier IV, rare, Civic (Boon).
- **Now:** not in the deck.
- **Proposed:** On draft: gain two free great-person drafts.
- **Theme:** Akbar's court in the 16th century is remembered for its nine jewels: a musician, a finance minister, a general, poets and scholars, called from across India.
- **Play:** Patrons theme, supply. In age 4 a great person costs over 1,000 renown. Two at once feed The Last Commission, The Immortals, the Doctrine The Kitabkhana and the Opus. It takes no chair.
- **Shape:** Existing shape: the on-draft great-person grant, twice.
- **Confidence:** good.

### 44. The Jinshi (doctrine)

- **Tier, rarity, type:** Tier II Doctrine, rework, engine to council.
- **Now:** Rare cards come up twice as often in your Order hands.
- **Proposed:** You have two more Civic chairs.
- **Theme:** The jinshi were the few who passed the highest Tang and Song examination. They filled the civil offices, and under the Song the civil service outranked the generals.
- **Play:** Draft odds are a rule the player cannot see at work. Two chairs are seen every turn. The tier-10 governments have five chairs, so +2 is large, and it is in line with The Council of Ten (two Wildcard chairs at Tier III). It feeds The Magnaura.
- **Shape:** Small extension: a typed chair on slotRider. Shares the typed-chair extension with change 36.
- **Confidence:** good.

### 45. The Magnaura (doctrine)

- **Tier, rarity, type:** Tier II Doctrine, buff, council.
- **Now:** Each town gains +1 science for each Civic card you have seated.
- **Proposed:** Each town gains +2 science for each Civic card you have seated.
- **Theme:** The palace school at the Magnaura in Constantinople trained the empire's officials (the model already in the Doctrine notes).
- **Play:** Three Civic cards and six towns pay 18 science at Tier II. That is a regular card, and a Doctrine should shape the game. At +2 it pays 36 at Tier II and over 80 at Tier IV.
- **Shape:** Existing shape (one number).
- **Confidence:** good.

### 46. The Bourgs (doctrine)

- **Tier, rarity, type:** Tier III Doctrine, buff, landscape.
- **Now:** Towns working a great-person work grow 25% faster.
- **Proposed:** Towns working a great-person work grow 50% faster.
- **Theme:** A bourg was the settlement that grew at the gate of an abbey or a castle, drawn by the work inside.
- **Play:** A seat has two or three towns with a work. +25% growth in those towns is slow to show, and it is the weakest Doctrine of its tier. With The Spirit Way (change 27) it also reaches wonder towns.
- **Shape:** Existing shape (one number).
- **Confidence:** speculative.

### 47. The Gobelins (doctrine)

- **Tier, rarity, type:** Tier IV Doctrine, buff, landscape.
- **Now:** Each great-person work in your borders gives +4% production toward the Magnum Opus, at most +40%.
- **Proposed:** Each great-person work in your borders gives +10% production toward the Magnum Opus, at most +50%.
- **Theme:** The French crown gathered the royal workshops at the Gobelins to furnish the king's greatest houses.
- **Play:** A seat holds three to five works at Tier IV, so the Doctrine pays 12 to 20%. Its cap needs ten works, which no seat reaches. At +10% it pays 30 to 50%.
- **Shape:** Existing shape (two numbers).
- **Confidence:** strong.

### 48. The Stele of Deeds (doctrine)

- **Tier, rarity, type:** Tier II Doctrine, new, monuments.
- **Now:** not in the deck.
- **Proposed:** You have one more Wildcard chair for every three wonders you hold, at most two more.
- **Theme:** Rulers carved the list of what they had built and won as their claim to rule: Darius at Behistun, Augustus in the Res Gestae. The monuments were the proof of the right to govern.
- **Play:** Tier II has no Doctrine for the monuments. This one joins the monuments to the council: wonders become chairs. A builder holds three wonders by Tier III. It gives a wonder seat a reason to keep building after the percentages cap.
- **Shape:** Small extension: slotRider with a count.
- **Confidence:** good.

## 4. What the changes add up to

- After the changes the deck holds 67 Orders (64, less 5 cuts, plus 8 new) and 17 Doctrines.
- Wildcard cards fall from 18 to 12. Military cards rise from 2 to 3.
- Boons rise from 3 to 5.
- One new shape (The Spirit Way) and five small extensions: typed chairs (changes 36 and 44, shared with the approved wonders build), a Doctrine offer on draft (28), every Wildcard chair doubled (37), a chair count from wonders (48), and a unit granted on a wonder (09, to confirm).
- No change depends on the wager system or on beads. No change adds a player input: the levy uses the levy menu that exists.
- Not changed, and why: The Second Reading, The Workshop at Olympia and Commission: The Eighth Wonder carry your own comments. The Hospitium is a draft rule, but it is the deck's reach into other decks, so it stays.

## 5. The throughlines after the changes

- **The council (chairs and types).** Tier 0: The Prytaneion, The Polemarch, The Twelve Tables. Tier I: The Nomarchs, The Roll of the Senate (seven Orders), The Sed Festival. Tier II: The Grand Vizier, The Prefects, The Mixed Constitution, The Senate Charter's hall, The Lawgiver. Tier III: The Boule, The Pandects, The Divan, The Golden Bull. Tier IV: The Privy Council. Doctrines: The Arthashastra, The Jinshi, The Council of Ten, The Union of Lublin.
- **The patrons (great people).** Tier 0: The Court Painter. Tier I: The Wandering Muse, The Overseers of Works, The Sed Festival. Tier II: The Hanlin Academy, The Honoured Dead, Letters Patent, The Symposium, The Hall of Heroes, The Golden Age. Tier III: The Universal Genius, The Roll of Masters. Tier IV: The Immortals, The Nine Jewels, The Last Commission. Doctrines: The Choregia, The Barmakids, The Kitabkhana.
- **The landscape (works on the land).** Tier I: The Laureate, The Landmark Bounds. Tier II: The Quarter of Masters, The Spirit Way, The Patron's Gallery. Tier III: The Masters' Domain, The Garden Courts, The Divine Proportion. Tier IV: The Processional Way, The Pull of the Masters, The Ideal City. Doctrines: The Peregrini, The Bourgs, The Gobelins. Tier 0 has no landscape card, because no seat has a great person then; The Court Painter is the way in.
- **The monuments (wonders).** Tier 0: The Cornerstone, Master Masons. Tier I: The Friends of Khufu, The Guild of Masons, The Keepers of Wonders, The Ceremonial Guard, The Eighth Wonder, The Workshop at Olympia, The Unveiling. Tier II: The Seven Sights, The Golden Age, The Spirit Way. Tier III: Magnificence, The Wonder Commonwealth, The Wonder of the Age. Tier IV: The Ideal City, The Grand Retrospective. Doctrines: The Periclean Works, The Stele of Deeds, The Carroccio, The Escorial.
- **The engine (culture and the draft).** Tier 0: The Twelve Tables, The Second Reading, The Court Painter. Tier I: The Encyclopedia, The Working Court, Civic Granaries. Tier II: The Accessions Register, The Learned Patron. Tier III: Officials by Merit, The Cabinet of Curiosities. Tier IV: The Universal Library, The Polymath's Study, The Grand Retrospective.

## 6. Example councils

**Early: the lawful city (end of Tier I, the Priest-King, five chairs and one won)**

- Military chair: The Ceremonial Guard (a free unit for each wonder).
- Economic chair: The Prytaneion (+6 food in each town with six cards seated).
- Civic chair: The Twelve Tables (+8 production and +8 culture in the capital at eight Orders).
- Civic chair: The Nomarchs (+2 authority, and culture from spare authority).
- Wildcard chair: The Sed Festival, seated before the tier-10 adoption.
- Won chair (The Roll of the Senate, met at seven Orders): The Second Reading.

The player drafts on every turn they can, because each Order pays the capital. They hold a fourth town back while the spare authority pays culture, then adopt the tier-10 government with The Sed Festival seated and call a great person.

**Middle: the builders' republic (end of Tier II, the Republic, five chairs and two won), with Devotion or Scientific**

- Economic chairs: The Friends of Khufu, The Guild of Masons, The Working Court.
- Civic chair: The Golden Age.
- Wildcard chair: The Grand Vizier (the first chair holds The Working Court, so its production pays twice).
- Won chair (The Roll of the Senate): The Spirit Way.
- Hall chair (The Senate Charter's Assembly Hall): The Laureate.
- No chair: The Lawgiver (a fifth Doctrine: The Stele of Deeds or The Periclean Works).

A wonder town spends a citizen every five turns toward the wonder. Each finished wonder pays every town production, starts ten turns of +25%, and counts as a work for The Laureate.

**Late: the court of masters (Tier IV, the Curia, eleven chairs and up to four more)**

- Military chairs: The Hall of Heroes, The Polemarch.
- Economic chairs: The Masters' Domain, The Wonder Commonwealth.
- Civic chairs: The Hanlin Academy, The Honoured Dead, The Garden Courts, The Roll of Masters.
- Wildcard chairs: The Privy Council, The Divine Proportion, The Twelve Tables (paid twice by The Privy Council).
- Extra chairs (the hall, two commissions and the Doctrine The Council of Ten): The Universal Genius, The Boule, The Processional Way, The Last Commission.
- No chair: The Nine Jewels, The Grand Retrospective.

Each great person acts, then lays a work in the line beside the capital, then adds 600 production to the Opus. The two boons arrive in the last drafts and turn into the final push.

## 7. What to test first

1. The Wildcard chair. With changes 06, 12, 16, 18 and 30, can a seat in Tiers I and II seat the cards it wants? Count the turns a drafted card waits with no chair.
2. The Twelve Tables and The Nomarchs. Is culture from Orders held and from spare authority too much in age 1 and 2? Is authority still plentiful, or has it tightened since 2026-09-03?
3. The number of great people and works. With The Hanlin Academy, The Sed Festival at Tier I and The Spirit Way, does a patrons or landscape seat reach three works by turn 100?
4. The extra chairs. A seat with The Roll of the Senate, the Assembly Hall, The Divan, The Jinshi and The Stele of Deeds can reach 15 or more chairs. Find the count where it stops being fun to manage.
5. The Lawgiver. Is a fifth Doctrine at Tier II the best moment in the deck, or does it decide the game?

## 8. What I could not determine

- Whether authority and happiness are still plentiful. The only evidence is your note of 2026-09-03. I did not find a later measurement.
- How many wonders and great-person works a human seat holds at each tier. The figures used are from bot games (two or three great people by turn 100, five or six by turn 150).
- The size of each family's act, for Letters Patent. The rules give an act about eight turns of a yield; I did not trace each family.
- The exact cost of the Magnum Opus. About 4,000 production is my estimate from the cost standard.
- Four shape details marked "to confirm": a culture-building filter on productionBonus, a slotPosition that takes any chair type, a unit granted in one town on a wonder, and a building that opens a Wildcard chair.
- The playtest notes hold no comment on this deck. The cards measured in the bot games of 2026-10-13 are almost all retired, so no measurement of the current cards exists.
- I read the sheet, the deck notes, the themes map and your comments of 2026-10-25 and 2026-11-10 in full. I read the builds, triage and Doctrine plans only in part.

## 9. How this was made

- Card text: a script read `data/decks/magisterial.json` and the Magisterial rows of `data/decks/common.json`, and printed each live row's text beside `describeCard`'s clauses (`src/sim/statecraft`).
- Shapes: each "existing shape" names a `CardEffect` kind that a live row uses today. "To confirm" marks a field I did not trace in `statecraft/evaluator.ts`.
- The page and this file are written by one script from one data file, in the session scratchpad: `deck-pass/magisterial-build.mjs` and `deck-pass/magisterial-data.mjs`.
