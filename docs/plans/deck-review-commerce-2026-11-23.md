# Commerce deck review, 2026-11-23

This is a design review. It changes no data, no code and no test. No test, bot game or dev server was run for it. All power figures are arithmetic from the data files.

The user's words for this deck: "take a look at the scaling options, and see if they're competitive."

The user's questions for all four reviews: "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game?"

**How numbers are marked.**
- **(live)**: the number is in the data today.
- **(proposed)**: a suggestion of this review.
- **(estimate)**: my arithmetic from live numbers. It was not measured.

**How proposals are marked:** text change, existing shape, small extension, or new shape (the same four as `docs/plans/deck-direction-review-2026-11-23.md`).

---

## The user's comments, 2026-11-24

The user commented on the review page (10 comments). **Where this section and the text below disagree, this section is right.** Nothing is built yet. These changes wait in the queue behind the playtest.

| # | Card or point | Today (live) | The user's words | Result |
|---|---|---|---|---|
| 1 | Buying the whole Opus with gold in one turn | Gold poured into the Opus has no limit per turn. | "yup thats fine" | It stays as a broken combo. |
| 2 | The full route stack | About 190 a route abroad with every route card seated (estimate). | "yup" | It stays as a broken combo. The build must still confirm how the doublings combine. |
| 3 | Land Speculation (Tier 0, uncommon) | "Buying a hex grants culture equal to half the gold paid." | "yeah needs a nerf. Make this a flat amount, like 6 culture." | "Buying a hex grants 6 culture." (proposed number, the user's) |
| 4 | Financed Industry (Tier I, rare) | "Towns gain production equal to 20% of their gold." | "i think this is strong, because commerce players will be stacking gold. lets keep it as is" | No change. The review's verdict (not competitive when dealt) is not accepted. |
| 5 | The Casa da Índia (Tier IV, rare) | "Every copy of a luxury you hold pays its yields, not only the first." | "cool idea. could be phrased better." and "down to add this" | Adopted: each copy of a luxury counts as a luxury of its own, and extra copies give no happiness. A clearer wording (proposed): "Your cards count every copy of a luxury you hold, not only the first. Extra copies give no happiness." |
| 6 | The Gilded Scaffold (Tier III, rare) | "You may purchase world wonders. All your cities lose 15% production." | "great" | "You may buy world wonders with gold." The penalty goes. |
| 7 | Houses of Account (Tier II, common) | "Gold buildings provide +1 happiness and +2 renown." | "let's just do +2 renown." | "Gold buildings provide +2 renown." The happiness goes. The renown stays at +2, not the +1 the review proposed. |
| 8 | One count: "an empire you trade with" | The Treaty Ports ("+8% production for each empire you hold a deal with, at most +40%.") and Commission: The Trade Mission ("Goal: hold deals with two empires at once. Reward: a great merchant.") count deals only. | "thats cool, and makes intuitive sense. That should be somewhere in the compendium" | Adopted: an empire counts if a trade route of yours reaches it or you hold a deal with it. The Compendium gets an entry that explains the count. |
| 9 | Bought and Paid For (Tier IV, rare) | "+2% production and culture for each building you have bought with gold, at most +30%." | "cool, great" | It counts buildings bought with gold or with faith. |
| 10 | Section D.4, threads to cut or merge | | "lay these out with all their effects for me to review" | Laid out below. No decision yet. |

The user did not comment on The Feitorias (the review proposes that it pays for every two citizens). It stays open.

### Section D.4 again, with each card's effect

**The treasury.** The review: keep all three, and call them the "save" side of the gold theme. No card changes.

| Card | Tier | Effect today |
|---|---|---|
| The Money Lenders | III, rare | "Earn interest equal to 4% of your treasury each turn, with no cap." |
| The Strongroom (a commission) | III, uncommon | "Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury." |
| The Monte di Pietà (Doctrine) | IV | "Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold." |

**Deals.** The review: keep all five. Join them to the routes abroad through the "empire you trade with" count (point 8 above).

| Card | Tier | Effect today |
|---|---|---|
| Travellers' Letters | 0, common | "Your capital gains +2 science and +2 culture for each empire you have met." |
| Export Guilds | I, uncommon | "Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production." |
| Commission: The Trade Mission | I, uncommon | "Goal: hold deals with two empires at once. Reward: a great merchant." |
| The Treaty Ports | II, uncommon | "+8% production for each empire you hold a deal with, at most +40%." |
| The Colleganza (Doctrine) | III | "Luxuries you lend in a deal still count for you. Your units lose 4 strength. A luxury you have traded away cannot be traded to a second empire." |

**Roads.** The review: keep all three as the bridge to Expansionist.

| Card | Tier | Effect today |
|---|---|---|
| The Wayside Inns | II, common | "Hexes with a road gain +1 food and +1 production." |
| Market Gardens (shared with Expansionist) | II, common | "Hexes with a road gain +1 gold." |
| The Turnpike Trusts (Doctrine) | III | "Your gold buys 100% more when hiring caravans. Hexes with a road gain +1 gold." |

**Plain hex cards.** The review: keep all three as early glue.

| Card | Tier | Effect today |
|---|---|---|
| The Mineral Trade | 0, common | "Mines and quarries gain +2 gold." |
| The Provision Trade | 0, common | "Improved bonus resources gain +1 food and +1 production." |
| The Potters' Quarter | 0, uncommon | "The hexes beside your capital gain +1 production and +1 science." |

**Military singles.** The review: retire both. No theme reads them.

| Card | Tier | Effect today |
|---|---|---|
| Foreign Procurement | II, common | "You may buy units without their strategic resource." |
| The Epibatai | II, uncommon | "Your units gain +5 strength for three turns after they land from the sea." |

---

## Summary

### Findings

1. **Commerce's scaling is competitive. Three stacks are stronger than the Magisterial loop after its nerf.**
   - The yardstick: a Magisterial seat with six to eight works makes about 216 to 288 a turn in a typical seat, and 576 to 768 with the full set (estimate, from 36 and 96 a work).
   - A full stack of routes abroad pays about 190 for each route, so about 1,700 with nine routes (estimate, my reading of how the multipliers add).
   - A full stack of routes at home pays about 170 for each route (estimate).
   - Money at Work with a large income pays 450 science from one chair (estimate).
2. **Gold alone is weak, and the deck scales because three groups of cards read the same gold.** One hammer costs 4 gold (live). So 300 gold a turn is 75 hammers, against 476 production for the median age 4 seat. The cards that read income (The Nest Egg, Money at Work, The Stipendium) pay while the same gold is spent or saved. The cards that read a purchase pay again when it is spent.
3. **Houses of Account is the best renown card in the game.** "Gold buildings provide +1 happiness and +2 renown." (live). With 36 gold buildings in age 4 it gives +36 happiness and +72 renown a turn (estimate). After the nerf, a Magisterial seat with eight wonders and both supply cards makes 40.
4. **Gold can buy the whole Magnum Opus in one turn.** The Opus costs 2,534 hammers (live), so 10,136 gold, or 5,068 gold with the Doctrine The Opera del Duomo. The Great Loan pays twenty turns of income on draft. At 254 gold a turn, those two finish the Opus on the turn of the draft (estimate).
5. **Four cards do not compete:** The Casa da Índia (a Tier IV rare that pays 30 in a typical seat), The Gilded Scaffold (it is six times worse than Magisterial's Magnificence and it has a penalty), Merchant Princes (a great person costs 3,460 gold or more), and Financed Industry (a rare that pays 6 to 12 when it is dealt).
6. **The flat hex price made Land Speculation a scaler, and a chore.** A hex costs 30 or 60 gold times the age, with no rise for each hex bought (live). The card turns gold into culture at two for one, on every hex, with no limit. The best play is to buy a hex every turn.
7. **The deck has four real themes and three thin threads.** The treasury (three cards), the deals (five cards, no late card) and the roads (two cards) are too thin to be builds.

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | Houses of Account keeps one effect: "+1 renown for each gold building, favouring merchants". | Text change, existing shape |
| 2 | The Casa da Índia becomes the capstone of the goods theme: each copy counts as a luxury of its own. | Small extension |
| 3 | The Gilded Scaffold loses its production penalty. | Text change |
| 4 | Land Speculation pays on the first hex bought each turn, at the full price. | Existing shape (`oncePerTurns`) |
| 5 | One count for "an empire you trade with": a route reaches it, or you hold a deal with it. The deals thread then joins the routes abroad. | Small extension |
| 6 | Bought and Paid For counts buildings bought with gold or with faith. | Small extension |
| 7 | Retire Foreign Procurement and The Epibatai. Raise The Feitorias from "every four" to "every two" citizens. | Data only |

### Decisions only you can make

1. **Is buying the whole Opus in one turn a broken combo that you want?** Recommended: yes for the slow way (save for twenty turns with The Money Lenders). For The Great Loan with The Opera del Duomo, decide after play. If it is too easy, the loan pays ten turns of income.
2. **Is the full route stack one of the broken combos?** Recommended: yes, after someone confirms in the code that the three doublings add. If it is too high, the reward of The World's Fair is the one to change.
3. **Houses of Account: may it lose its happiness and half of its renown?** Recommended: yes. It supplies great people faster than the loop that the review of this morning cut.
4. **Land Speculation: the first hex each turn, or leave it?** Recommended: the first hex each turn. The total is about the same, and the player stops buying hexes that the town does not need.
5. **Should the deals thread be merged into the routes abroad (change 5), or cut?** Recommended: merged. The deck's brief asks for "the faction most interested in trade deals/diplomacy", and today no card after Tier II reads a deal.

---

## The figures this review uses

**Seats (estimate).** The power bar gives the median seat of every deck (gold 19, 47 and 298 a turn in ages 2, 3 and 4). The Commerce pass of 2026-11-20 used 150, 300, 450 and 600 for a Commerce seat. I use these two seats:

| | Age 2 typical | Age 2 committed | Age 3 typical | Age 3 committed | Age 4 typical | Age 4 committed |
|---|---|---|---|---|---|---|
| Towns | 5 | 6 | 8 | 10 | 12 | 15 |
| Gold a turn | 30 | 60 | 80 | 200 | 300 | 600 |
| Different luxuries | 3 | 5 | 5 | 7 | 7 | 9 |
| Luxury copies | 4 | 6 | 7 | 10 | 9 | 16 |
| Gold buildings | 3 | 6 | 10 | 16 | 36 | 50 |
| Trade routes | 2 | 3 | 4 | 6 | 6 | 9 |
| Science + culture (median seat, live in the power bar) | 55 | 55 | 189 | 189 | 936 | 936 |

**What gold buys (live rates, `data/rules.json`).**

| Purchase | Price | 300 gold a turn buys |
|---|---|---|
| One hammer of a unit or a building | 4 gold (`goldPerHammer`) | 75 hammers a turn |
| The same with The Open Market ("Your gold buys 25% more.") | 3.2 gold | 94 hammers |
| A hex | 30 gold, or 60 in the outer ring, times the age | 2.5 inner hexes in age 4 |
| A caravan | 75 gold, plus 15 for each running route | one, in most turns |
| A Knight (445 hammers in the power bar) | 1,780 gold (estimate) | one in six turns. A city buys one unit a turn (live). |
| A great-person draft (Merchant Princes) | 10 gold for each point of renown: 3,460 for the fifth, 5,380 for the seventh | one in 12 to 18 turns |
| A wonder (The Gilded Scaffold) | 1,168 gold for an age 2 wonder of 292 hammers. About 4,400 to 7,600 for an age 4 wonder (estimate). | one age 4 wonder in 15 to 25 turns |
| The Magnum Opus, by gold poured in | 10,136 gold. 5,068 with The Opera del Duomo. No limit in one turn (`contributeAt`). | the whole Opus in 34 turns, or 17 |

**The bar (`references/power-bar.md`).** A regular card pays 15 to 25 at Tier I, 35 to 60 at Tier II, 60 to 120 at Tier III. A headline card pays 40 to 50, 100 or more, 200 or more. The median seated card pays about 10 in age 2, 20 in age 3 and 40 to 62 in age 4.

**The yardstick.** After the nerf, one Magisterial work pays about 36 in a typical age 4 seat and 96 in the full set. With six to eight works that is 216 to 288 a turn from about three chairs (72 to 96 a chair), or 576 to 768 from three rares and a wonder.

---

## A. Scaling

### A.1 Every card that grows

All texts are live. Each cell is typical / committed (estimate). A percentage is taken of the median seat's total, so it is an upper figure.

| Card (tier, rarity) | Text | Age 2 | Age 3 | Age 4 | Arithmetic and verdict |
|---|---|---|---|---|---|
| The Nest Egg (0, common) | "Your capital gains +1 culture for every 4 gold you make each turn." | 7 / 15 | 20 / 50 | 75 / 150 | Income ÷ 4. **Competitive in every age.** It is above the median seated card of age 4 from a Tier 0 common. The Summer Palace and The League of Cities take the committed figure to 450. The Bourse building pays the same amount again. |
| Market Day (0, common) | "Your capital gains +1 gold for every citizen." | 8 | 12 | 18 | One town's citizens. It falls behind after age 2. That is right for Tier 0. |
| Salt Tithes (0, common) | "+3 gold for each different luxury you have improved." | 9 / 15 | 15 / 21 | 21 / 27 | Gold at a quarter value. Weak after age 2. |
| The Palace Stores (0, rare) | "Your capital gains +2 production and +2 culture for each different luxury you hold." | 12 / 20 | 20 / 28 | 28 / 36 | 4 for each kind. Strong when dealt, modest late. Fine. |
| Land Speculation (0, uncommon) | "Buying a hex grants culture equal to half the gold paid." | 30 to 60 culture a hex | 45 to 90 | 60 to 120 | Half of 30 or 60 × age. One hex a turn in age 4 is 60 to 120 culture. 600 gold a turn buys five hexes and 300 culture. **Too strong for the committed seat, and a chore.** See A.3. |
| The Strongbox (I, uncommon) | "Gains +1 science and +1 culture each time you buy something with gold, up to +15." | 20 / 30 | 30 | 30 | Fifteen purchases fill it, and a hex counts. Competitive in age 2, below the median in age 4. Its limit is on the card, and it is right. |
| Commercial Education (I, common) | "Gold buildings provide +3 science." | 9 / 18 | 30 / 48 | 108 / 150 | 3 × gold buildings. **Competitive.** It is a common that reaches the Tier III headline size. |
| Financed Industry (I, rare) | "Towns gain production equal to 20% of their gold." | 6 / 12 | 16 / 40 | 60 / 120 | 20% of income. **Not competitive when dealt:** a rare below the Tier I regular card (15 to 25). It is a regular card in age 4. |
| The Staple Right (I, common) | "Gain +4 gold and +3 culture for each luxury you hold two or more copies of." | 7 / 7 | 14 / 21 | 14 / 42 | 7 for each kind with a second copy. Modest. |
| Houses of Account (II, common) | "Gold buildings provide +1 happiness and +2 renown." | +3 happiness, +6 renown / +6, +12 | +10, +20 / +16, +32 | +36, +72 / +50, +100 | **Too strong.** A different luxury gives 4 happiness (live), so in age 4 this common is nine luxuries. Its renown is more than the Magisterial supply after the nerf. |
| Private Patronage (II, uncommon) | "Towns gain +25% gold." | 7 / 15 gold | 20 / 50 | 75 / 150 | A quarter of income, so 19 to 37 hammers in age 4. Weak alone. Its value is what the income cards add: with The Nest Egg and Money at Work, 75 more gold is 19 culture and 45 science. |
| The Tiraz (II, uncommon) | "Every town gains +1 production for each different luxury you hold." | 15 / 30 | 40 / 70 | 84 / 135 | Towns × kinds. **Competitive.** Two counts multiply, so it grows faster than the bar. |
| The Spice Exchange (II, rare) | "Every city gains +4% science and +4% culture for each different luxury you hold, at most +32%." | 7 / 11 | 38 / 53 | 262 / 300 | 4% × kinds, of science and culture. **Competitive, strong late.** Eight kinds reach its limit. |
| Names in Stone (II, rare) | "+1% science and culture for every 200 gold you have spent buying this game, at most +30%." | 2 / 3 | 23 / 57 | 281 / 281 | 600 and 1,200 gold spent by age 2, 2,500 and 6,000 by age 3. Weak when dealt, strong late. It is a counter over the whole game, and every seat fills it by age 4. |
| The Exchange (II, uncommon) | "+5% science and culture for each foreign empire your routes reach." | 3 / 6 | 19 / 28 | 140 / 234 | 5% × empires (1 to 5). Competitive. The count stops at the number of empires. |
| The Treaty Ports (II, uncommon) | "+8% production for each empire you hold a deal with, at most +40%." | 4 / 8 | 17 / 26 | 114 / 190 | 8% × deal partners, of 48, 107 and 476 production. Competitive on paper. It depends on what the bots sign. |
| The Factors' Houses (II, common) | "Each town holding your trading post, at home or abroad, gives you +2 gold and +4 culture." | 0 / 6 | 18 / 30 | 36 / 60 | 6 × posts. A post takes twenty turns of a route (live). Modest, and slow. |
| The Customs Houses, The Bonded Warehouses, The Weigh House (II, uncommon) | "Customs houses gain +8 science and +8 culture." and two more | 36 a house | 38 | 40 | Own gold 4, 6, 8 + 16 + 4 on the hex + 12 with two improved resources beside it. **Competitive.** One customs house with the three cards is a Magisterial work of the typical seat (36). |
| The Stipendium (III, common) | "Your units gain +1 strength for every 50 gold you make each turn, at most +8." | | +1 / +4 | +6 / +8 | Income ÷ 50. The strong line at Tier III is +12. Competitive, and it costs nothing more. |
| The Cloth Halls (III, common) | "Gold buildings provide +3 production." | | 30 / 48 | 108 / 150 | The same count as Commercial Education. Competitive. |
| The Money Lenders (III, rare) | "Earn interest equal to 4% of your treasury each turn, with no cap." | | 12 / 238 gold | 20 / 673 gold | A seat that spends holds 300 to 500 gold, so it gets 12 to 20. A seat that saves 200 a turn for 20 turns holds 5,955, and one that saves 300 for 30 turns holds 16,825. **Nothing or very strong.** See A.2. |
| The Monopoly (III, rare) | "For each luxury that only you hold, every town gains +5 gold and +3 culture." | | 64 / 240 | 96 / 360 | 8 × towns × kinds that only you hold (1 or 3). Strong, and it depends on the map. |
| The Latifundia (III, uncommon) | "Improved luxury hexes pay twice their yields." | | 60 / 100 | 80 / 140 | About 10 a hex with the Tier 0 and Tier I goods cards, on 8 to 12 worked hexes. Competitive. |
| The Stato da Mar (III, uncommon) | "Water hexes pay twice their yields." | | 150 / 300 | 300 / 525 | About 10 a water hex with the sea cards, on 30 hexes of five coastal towns. Competitive, on a coastal map. |
| Money at Work (IV, rare) | "Every town gains +1 science for every 20 gold you make each turn." | | | 180 / 450 | Towns × income ÷ 20. **Competitive, and the strongest single chair in the deck.** |
| Bought and Paid For (IV, rare) | "+2% production and culture for each building you have bought with gold, at most +30%." | | | 147 / 275 | 8 or 15 buildings, of 476 production and 442 culture. Competitive. |
| The Casa da Índia (IV, rare) | "Every copy of a luxury you hold pays its yields, not only the first." | | | 30 / 120 | About 15 for each spare copy (3 flat and about 1 in each town). The luxuries that give happiness pay nothing more. **Not competitive** for a Tier IV rare. |
| The Feitorias (IV, uncommon) | "Each town holding your trading post gives you +1 science and +1 culture for every four of its citizens." | | | 48 / 80 | 8 for each post in a town of 16. **Low** for Tier IV (60 to 120). |
| The Grain Barges (IV, uncommon) | "Your domestic trade routes pay their destination +1 food and +1 production for every three citizens of their origin." | | | 48 / 108 | 12 for each route from a town of 18. Competitive alone, and the route doublings multiply it (A.2). |

### A.2 The stacks

**One route abroad, age 4 (estimate).** My reading of `docs/trade.md`: flats first, then the cards that pay a route "twice" are added together, then the sea premium, then the Merchant League.

| Step | Gold | Science | Culture | Total |
|---|---|---|---|---|
| The base (live: +2 gold, +1 science, +1 culture, +1 gold for each 10 citizens of the two towns; 30 citizens) | 5 | 1 | 1 | 7 |
| The Common Road ("+3 gold, +3 science and +3 culture") | 8 | 4 | 4 | 16 |
| The Tea Horse Road, a route of 12 hexes | 10 | 4 | 6 | 20 |
| The Scholars' Roads ("Your routes pay twice their science and culture.") | 10 | 8 | 12 | 30 |
| The Doctrine The Muda (+6 science and +6 culture, before the doubling) | 10 | 20 | 24 | 54 |
| The World's Fair ("your trade routes to other empires pay twice as much"; it adds to The Scholars' Roads) | 20 | 30 | 36 | 86 |
| A sea route (+50%, live) | 30 | 45 | 54 | 129 |
| The Merchant League ("Your trade routes pay 50% more.") | 45 | 67 | 81 | 193 |

- Three commons give 30 a route. Six routes pay 180 from three chairs, which is 60 a chair. That is a little below the Magisterial typical seat.
- The full stack gives 193 a route. Nine routes pay about 1,700. That is more than twice the Magisterial full set.
- It needs a rare commission (routes to four empires), a Tier III Doctrine, a government, sea routes, nine route slots and peace. The Doctrine The Peace of Lodi adds 50% more.
- The cause is the one the first review found in Magisterial: several doublings on one thing. Here they are The Scholars' Roads, The World's Fair, the sea premium and the Merchant League.

**One route at home, age 4 (estimate).** Base 8 + Provisioning Contracts 6 + The Grain Barges 12 + the Caravanserai 2 = 28 food and production. The Return Leg pays the origin the same: 56. The Doctrine The Sea Ban doubles it: 112. The Merchant League: 168. Eight routes pay about 1,340. The Home Market and The Chartered Metropolis add +30% and +50% in the towns at the ends.

**The treasury.** Saving S gold a turn for n turns with The Money Lenders gives S × (1.04^n − 1) ÷ 0.04.

| Turns saved | Without the card | With the card | Interest in the last turn | At 300 gold a turn |
|---|---|---|---|---|
| 20 | 20 × S | 29.8 × S | 1.2 × S | 8,934 gold, 357 a turn |
| 30 | 30 × S | 56.1 × S | 2.2 × S | 16,825 gold, 673 a turn |
| 40 | 40 × S | 95.0 × S | 3.8 × S | 28,508 gold, 1,140 a turn |

- In hammers the interest is modest: 357 gold is 89 hammers a turn, and the seat gave up 75 hammers a turn to save.
- The card is strong for two other reasons. First, the hoard buys the Opus: 10,136 gold takes 22 turns of saving with the card and 34 without it. Second, if the interest counts as gold "you make each turn", Money at Work and The Nest Egg read it. After 40 turns that would be 12 towns × 72 = 864 science and 360 culture. I could not confirm that it counts.
- **The Great Loan with The Opera del Duomo.** The Great Loan: "On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns." Tier IV opens at about turn 161 and a game runs about 200 turns, so the forty turns cost at most ten turns of income. At 254 gold a turn the loan is 5,080 gold, and the Opus costs 5,068 with the Doctrine. This is decision 1.

**Gold spent on buildings.** Each card turns a quarter of the price into another yield.

| Seat, age 4 | Hammers | Civic Receipts (culture) | The Endowment (science) | With The Double Entry | Total a turn |
|---|---|---|---|---|---|
| 300 gold a turn, all on buildings | 75 | 75 | 75 | | 225 from two chairs |
| The same with The Double Entry | 75 | 150 | 150 | "Cards that pay when you buy something pay twice." | 375 from three chairs |
| 600 gold a turn with The Double Entry | 150 | 300 | 300 | | 750 from three chairs |

- These are one-time grants, so no percentage raises them (the rule that the user kept today).
- Names in Stone and Bought and Paid For then add up to 281 and 275 more, and both fill up as the gold is spent.

### A.3 Per build

The six threads are those of section 2.3 of the first review. Figures are age 4 a turn (estimate).

| Thread | Typical seat | Committed seat | Against the yardstick (216 to 288, and 576 to 768) | Verdict |
|---|---|---|---|---|
| Luxuries | The Tiraz 84 + The Latifundia 80 + The Palace Stores 28 = 192. With The Spice Exchange, 454. | Add The Monopoly (360): about 900 | Equal without the rare, above with it | **Competitive.** The map sets the limit: the number of kinds. |
| Buying with gold | 225 with two commons. Up to 780 with Names in Stone and Bought and Paid For. | 750 with The Double Entry, and Land Speculation's 300 culture | Equal, then above | **Competitive.** Too strong only through Land Speculation. |
| Trade routes | Abroad: 6 × 30 = 180, and The Exchange 140. At home: 4 × 26 = 104. | 1,340 at home, about 1,700 abroad | Below at three commons, far above at the top | **Competitive, too strong at the top.** Decision 2. |
| The sea | The Stato da Mar and the Tier I cards: about 300 on 30 water hexes | About 525 with Commission: The Harbour League and The Herring Fleets | Equal | **Competitive** on a coastal map. It costs citizens to work the water. |
| The treasury | 12 to 20 gold | A hoard, and the Opus | Not a yield | **Not a build.** It is two cards and one Doctrine. Its income cards are the build (The Nest Egg, Money at Work: 255 typical, 600 committed). |
| Merchants and Customs Houses | Four houses × 40 = 160 | Six × 40 = 240, the six hexes around each, and two acts for each merchant (The Company of the Staple: 16 turns of gold) | Equal for each work. Fewer works. | **Competitive.** With Houses of Account as it is today, it has more renown than Magisterial. |

**What is too strong, in order:** Houses of Account; Land Speculation since the flat hex price; the full route stacks; The Great Loan with The Opera del Duomo.

**What is not competitive:** The Casa da Índia, The Gilded Scaffold, Merchant Princes, Financed Industry when dealt, The Feitorias.

**Two number changes that are not full proposals.**
- **Land Speculation** (proposed): "The first hex you buy each turn grants culture equal to the gold paid." In age 4 that is 120 to 240 culture a turn for one press. The live card pays the same for two hexes, and five times that for a rich seat. The limit is the existing field `oncePerTurns` (The New Code uses it).
- **The Feitorias** (proposed): "for every two of its citizens". It then pays 96 to 160, which is the Tier IV regular card.

---

## B. Utility

"A chair" means the card must stay seated. A boon, a charter and a commission's reward need no chair.

| Card (tier) | Text (live) | Worth a chair or a pick? |
|---|---|---|
| The Open Market (0, rare) | "Your gold buys 25% more." | **Not in age 1.** It saves a fifth of what is spent: 1 gold a turn at an income of 5. From age 3 it is worth 15 to 30 hammers a turn. It is a rare that a player benches until Tier II. |
| The Pathfinders' Company (0, uncommon) | "Scouts gain +1 sight and +1 movement." | For the first 30 turns only. **No one keeps it.** As a Tier 0 opener it is acceptable. |
| The First Caravan (0, uncommon) | "On draft: gain a caravan, and room for one more trade route." | A pick, not a chair. The Trader opens with Currency in age 2 (live), so it pays nothing in age 1. Worth it for a seat that plans routes. |
| Letters of Credit (I, rare) | "On draft: gain 400 gold. Your towns make 30% less gold for fifteen turns." | **Always.** 400 gold is 13 to 40 turns of income at Tier I. The penalty is about 90 gold (estimate). It is close to an automatic pick. |
| The Planters' Charter (I) | "Unlocks the Plantation House, a building you buy with gold." | Yes, with two or more plantations. |
| The Market Writ (I, uncommon) | "+1 authority and +1 happiness for every two Markets in your empire." | Yes, from six Markets (+3 and +3). It is the deck's only authority. |
| The Ten Thousand (I, uncommon) | "Military units you buy with gold start as Veterans." | Only in a war that gold pays for. A Legionary costs about 324 gold against 80 a turn in age 3. A Dominion pair card in practice. |
| Export Guilds (I, uncommon) | "Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production." | Weak: 12 for two loans. Take it only with spare copies. |
| Commission: The Trade Mission (I) | "Goal: hold deals with two empires at once. Reward: a great merchant." | **Yes.** The bots now accept a swap of one duplicate for another (ruled today), so the goal is easy. |
| The Garum Works (I, uncommon) | "+1 happiness for each fishing boat in your borders." | Yes, with four or more boats. |
| Foreign Procurement (II, common) | "You may buy units without their strategic resource." | **No one takes it.** A chair for a rule that matters in one war. Strategic copies are now traded four at a time (ruled today), so the deal does this job. |
| The Epibatai (II, uncommon) | "Your units gain +5 strength for three turns after they land from the sea." | **No one takes it,** outside an invasion by sea. |
| Corner the Market (II, commission) | "Goal: hold three copies of one luxury. Reward: +2 happiness for each different luxury you hold." | **Yes.** +14 happiness in age 4 with no chair. |
| The Merchant Consuls (II, boon) | "On draft: choose a great merchant." | **Yes, always.** A customs house, or eight turns of gold. |
| The Brokers' Redraw (II, shared) | "You may reroll an Order hand with gold." | Cannot be judged: it still needs its button. |
| The League of Cities (II, shared rare) | "Cards that pay your capital also pay your second-largest town." | Yes, with The Nest Egg or The Palace Stores seated. |
| The Capitulations (III, uncommon) | "Each foreign town with your trading post lends you a luxury you lack." | **Yes** for the goods theme: each loan is 4 happiness and one more kind for every counter. It needs posts, so twenty turns of routes. |
| A Guild Commission (III) | "Goal: buy five buildings with gold. Reward: a free great-person draft." | Yes. The goal is easy for any Commerce seat. |
| The Strongroom (III, commission) | "Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury." | Yes. Ten turns of saving at 150 a turn, for a merchant and 300 culture. |
| The Gilded Scaffold (III, rare) | "You may purchase world wonders. All your cities lose 15% production." | **No one takes it.** See C. |
| Merchant Princes (III, rare) | "You may buy great-person drafts with gold." | **Almost no one.** The fifth person costs 3,460 gold, which is 865 hammers. The 2026-11-20 pass found one case of profit: 600 gold a turn and a second act. |
| A Court of Merchants (III, rare) | "Gain +50% renown, but great-person offers contain only Great Merchants." | Yes, in the customs house build. A real choice. |
| The Great Loan (IV, rare) | twenty turns of income | **Always**, so late in the game. Decision 1. |
| The World's Exchange (IV, uncommon) | "+20% production toward the Opus for each foreign empire your trade routes reach." | Modest. A Commerce seat pours gold, and this card raises production only. |
| The Wooden Walls (IV, uncommon) | "Your ships gain +6 strength and +1 movement." | Only in a sea war. It is Tier IV's one Military card, so it stays. |
| Doctrines: The Apoikia, The Laurion Leases, The Flying Money, The Turnpike Trusts | discounts on settlers and workers, resource hexes, purchases in bank towns, caravans | All useful. The Laurion Leases (resource hexes at a quarter of the price) is the best: it supplies luxury copies. Whether discounts add without a limit was open on 2026-11-20 (point r4-2). |

**Summary.** The commissions and boons are the deck's best utility, and they cost no chair. The purchase permissions are its worst: The Gilded Scaffold and Merchant Princes ask for a rare's chair and a price that gold cannot pay. Foreign Procurement and The Epibatai are candidates to retire. Tier II has three Military cards, so one remains.

---

## C. Late game

### C.1 Does each theme have a Tier III or IV card worth the wait?

| Theme | Tier III | Tier IV | Satisfying? |
|---|---|---|---|
| Goods (luxuries) | The Monopoly, The Latifundia, The Capitulations | The Casa da Índia | **In part.** The Monopoly depends on the map. The Tier IV rare is weak. Proposal 1. |
| Gold: earn, save, spend | The Stipendium, The Money Lenders, The Double Entry, The Endowment, The Cloth Halls | Money at Work, Bought and Paid For, The Great Loan | **Yes.** It has three rule-breakers and the Opus as the end. Two permissions are dead (proposal 2). |
| Routes at home | The Return Leg, The Chartered Metropolis | The Grain Barges, the Doctrine The Sea Ban | **Yes.** |
| Routes abroad | The Scholars' Roads, the Doctrine The Muda | The World's Fair, The World's Exchange, The Feitorias | **Yes.** |
| The sea | The Stato da Mar, The Free Ports, Commission: The Harbour League | The Herring Fleets, The Wooden Walls | **Yes**, on a coastal map. |
| Merchants and Customs Houses | A Court of Merchants, The Company of the Staple | none | **Yes.** Both capstones are at Tier III, where the skill puts them. |
| Deals | none | none | **No.** Section D, change 5. |

The deck already has its broken combos: the hoard and the Opus, the two route stacks, The Double Entry, and a merchant who acts twice. So I propose two revisions and one fix, and no new card.

### C.2 Proposal 1: The Casa da Índia (revision)

| Field | |
|---|---|
| Name | The Casa da Índia (the row exists) |
| Band, rarity | IV, rare |
| Text (proposed) | "Each copy of a luxury you hold counts as a luxury of its own. Copies give no happiness." |
| Live text | "Every copy of a luxury you hold pays its yields, not only the first." |
| Age goal | Age 4: decide the game. It turns a wide, improved land into production and culture for the Opus. |
| Theme and role | Goods, multiply. It fills the gap of a Tier IV capstone that does not depend on the map. |
| Role | Build-defining. Floor: the live card (30 in a typical seat). Ceiling: every card that counts luxuries counts copies. |
| Councils | Late goods council: The Tiraz, The Spice Exchange, The Palace Stores, The Latifundia, this card. |
| Attention | The player improves every luxury hex, and buys copies in deals. Nothing new to track: the trade screen shows copies. Low attention, high impact. |
| Power (estimate) | Typical (7 kinds, 9 copies): the live effect 30, The Tiraz +24, The Palace Stores +8, Salt Tithes +6, The Spice Exchange +37 (to its limit), Corner the Market +4 happiness. About 105. Committed (9 kinds, 16 copies, 15 towns): 120, The Tiraz +105, The Palace Stores +28, Salt Tithes +21. About 275 and +14 happiness. The Tier III bar is 60 to 120, and 200 or more for a headline card. |
| Synergy | Raises: nothing. Reads: luxury copies. Raised by: improved luxury hexes, the Doctrine The Laurion Leases (resource hexes at a quarter of the price), deals that bring copies in, The Estate Lands and The Emporia (reasons to improve). Read with: Salt Tithes (0), The Palace Stores (0), The Staple Right (I), The Tiraz (II), The Spice Exchange (II), Corner the Market (II), Numidian Cavalry (II), The Incense Road (shared, I), the Bazaar, the belief Patron of Merchants. Seven or more readers before its band. |
| Displaces | A Tier II flat card. The seat already holds the counters, and this card raises all of them. |
| Condition or drawback | No happiness from copies. The Spice Exchange keeps its limit of eight. It makes a copy worth more at home than lent, so it pulls against Export Guilds and The Treaty Ports. That is a real choice, like The Forbidden Silks against The Colleganza. |
| Shape | **Small extension.** The amplifier target `luxuryDuplicates` exists and does the yields. One more flag makes the count of different luxuries (`countedLuxuries`) read copies. |
| Type | Economic |

### C.3 Proposal 2: The Gilded Scaffold (revision)

| Field | |
|---|---|
| Name | The Gilded Scaffold (the row exists) |
| Band, rarity | III, rare |
| Text (proposed) | "You may buy world wonders with gold." |
| Live text | "You may purchase world wonders. All your cities lose 15% production." |
| Age goal | Ages 3 and 4: the deck that is weak at production buys what others build. |
| Theme and role | Gold spent, act. It is Commerce's door to wonders, as Magnificence is Magisterial's and The Pious Masons is Devotion's. |
| Role | Build-defining for Lorenzo and Zheng He. Floor: none without a hoard. Ceiling: a wonder every ten turns at 600 gold. |
| Councils | The buyer's late council, with The Open Market and The Double Entry. |
| Attention | One purchase, now and then. Low attention. |
| Power (estimate) | Magnificence buys a hammer for 1 culture, and the median age 4 seat makes 442 culture. This card buys a hammer for 4 gold, and the same seat makes 298 gold. So it is about six times slower, and it also costs 15% of production (about 71 a turn in age 4). Without the penalty an age 4 wonder still costs 4,400 to 7,600 gold, which is 15 to 25 turns of a typical income. With The Open Market and The Flying Money a hammer costs 2.4 gold. |
| Synergy | Reads: the treasury. Raised by: every gold card, The Strongroom's saving, a merchant's bargain. Feeds: Lorenzo's wonder cards, Names in Stone, and gold wonders if they count as gold buildings (not confirmed). |
| Displaces | Nothing today, because nobody seats it. |
| Condition or drawback | The price is the drawback. The user dislikes plain penalties, and this one makes a weak card unplayable. |
| Shape | **Text change:** remove the `percentYields` line. |
| Type | Economic |

### C.4 Proposal 3: Houses of Account (revision; Tier II, but it decides the late game)

| Field | |
|---|---|
| Name | Houses of Account (the row exists) |
| Band, rarity | II, common |
| Text (proposed) | "Gold buildings provide +1 renown, favouring merchants." |
| Live text | "Gold buildings provide +1 happiness and +2 renown." |
| Age goal | Age 3: grow into the plan. It supplies merchants for the customs house build. |
| Theme and role | Merchants and Customs Houses, supply. |
| Role | Pay-off. Floor: +10 renown in age 3. Ceiling: +50 in age 4. |
| Councils | The merchants' council, with The Customs Houses and A Court of Merchants. |
| Attention | None. |
| Power (estimate) | Live: +36 happiness and +72 renown in a typical age 4 seat. Proposed: +36 renown. After the nerf, Magisterial's The Workshop at Olympia gives 24 with eight wonders. Each gold building already gives 1 renown of its own, so the seat makes 72 in all, and a great person costs 538 to 935 at that point. |
| Synergy | Raises: renown. Reads: gold buildings. Raised by: every purchase of a Market, a Bazaar or a Bank, The Planters' Charter, The Flying Money. The same count pays Commercial Education, The Cloth Halls and The Patrons' Quarter. |
| Displaces | A Tier I flat card. |
| Condition or drawback | None. One effect (principle 2). The Market Writ and Corner the Market stay as the deck's happiness. |
| Shape | **Existing shape:** the `renown` line with `family: merchant`, as the Doctrine The Sogdian Colonies has. To check: that `family` reads on the `per` form. |
| Type | Civic |

**What the three open.** Copies of a luxury become a quantity that the land, the deals and the Doctrines all raise. Gold becomes a way into wonders, which is a general quantity that Lorenzo's second deck reads. Renown from gold buildings points at merchants, so the customs house build has its own supply and does not feed the Magisterial loop.

---

## D. Synergy across the whole game

### D.1 What outside the deck touches each theme (live)

| Theme and its quantities | Raised or read outside the deck |
|---|---|
| **Gold income** | Dominion: War Foundries ("gold equal to 30% of their production"), The Sutlers, The Proconsuls, The Mesta. Expansionist: The Grain Merchants ("gold equal to 20% of their food"), The Quitrents, Smallholdings, the Doctrine The Physiocrats. Devotion: The Tithe ("gold equal to 25% of their faith"), the beliefs Tithe Houses and Pilgrims' Coin, the Rite of Plenty. Scientific: The Royal Patents. Magisterial: The Art Dealers. Generic: The Gilded Country, The Royal Annals. Leaders: Lorenzo (renown from income), Mansa Musa, Pachacuti. Buildings: the Bourse (culture from income), the Bank. Legacies: Jakob Fugger (+20% gold), Kushim, Sang Hongyang. Luxuries: gems, spices, furs, silver, gold. Against it: the Doctrine The Contented City ("Your gold income is halved."). |
| **The treasury and lumps of gold** | Dominion: The Victory Mint (60 gold for each citizen of a captured town), Spoils of War. Scientific: The Royal Patents (100 gold for each age, for each technology). A merchant's bargain (eight turns of gold). No other deck reads the treasury. |
| **A purchase** | Dominion shared: The Army Contractors, Mercenary Contracts, Professional Soldiers, The Chartered Company. Devotion: The Votive Accounts counts gold and faith purchases, and Devotion has its own faith buyers (The Offering Chests, The Fabric Fund, The Offered Stones). Magisterial shared: The Patrons' Ledger. Legacies: Crassus, Fan Li, Fatima al-Fihri, Jacques Cœur. The Assay House. Lorenzo's Condottiere. |
| **Gold buildings** | Magisterial shared: The Patrons' Quarter. Generic: The Builders' Lodge ("Orders that add yields to buildings pay double."). Lorenzo's Florins. The government The Estates ("Your Economic cards pay 30% more."). |
| **Luxuries** | Expansionist shared: The Country Fair, The Provincial Fair. Devotion shared: The Merchant Shrines, The Incense Road. The belief Patron of Merchants. The Bazaar. Dominion: nothing but Numidian Cavalry inside this deck. Leaders: Mithridates and Mansa Musa pay camps and plantations. |
| **Trade routes** | Governments: Republic (+1 route), Merchant League (+1 route, +50%). Scientific: The Printers' Charter (+1 route). Devotion: Pilgrim Markets, the beliefs The Long Road and Sacred Cartography. Expansionist: the Doctrine The Inward Roads. Wonders: The Colossus (+1 route), Machu Picchu (+2), The Great Stelae of Aksum (+2 culture and +2 faith a route). Leaders: Genghis Khan, Cleopatra, Zheng He, Mansa Musa, and the Tambo and the Funduq. Legacies: Lamassī, Marco Polo, Aḥmad ibn Mājid, Marcus Ulpius Yarhai, Ibn Jubayr. Luxuries: furs, spices. |
| **The sea** | Expansionist: The Coast, The Harbour Cities, The Gathering Grounds, The Polders. Scientific shared: The Merchant Navigators. Wonders: The Great Lighthouse, The Colossus. The belief Lord of the Sea. Legacies: Hanno, Willem Beukelszoon (fishing boats pay double). Luxuries: pearls, coral, whales. Zheng He. |
| **Merchants and Customs Houses** | A customs house is a great-person work, so every Magisterial card for works reaches it, and The Mausoleum after the nerf doubles its own 4, 6 or 8 gold. The legacy Benjamin of Tudela. Lorenzo. |
| **Deals** | Cleopatra's The Queen's Alliances. Nothing else in the game reads a deal. |

### D.2 Gaps

1. **Deals stop at Tier II and touch nothing outside the deck.** Two counts do nearly the same job: "each empire you hold a deal with" (The Treaty Ports, Commission: The Trade Mission) and "each foreign empire your routes reach" (The Exchange, The World's Exchange, The World's Fair, Ibn Jubayr).
2. **Purchases are counted by bank.** Bought and Paid For and Names in Stone count gold only, and Devotion's The Offered Stones counts faith only. Mansa Musa holds both decks and fills neither.
3. **The treasury has no reader outside the deck,** and inside it has three. That is correct for a thin thread. It should not get more.
4. **Scientific has no steady way to make gold,** so Cleopatra's seat leans on routes alone. This is acceptable: her ability pays routes.
5. **Dominion and luxuries do not meet,** apart from Numidian Cavalry. Genghis Khan's seat uses the purchase cards. No change proposed.

### D.3 Proposed connections

| # | Connection | Through which general quantity | Size |
|---|---|---|---|
| 1 | "An empire you trade with" is one count: a trade route of yours reaches it, or you hold a deal with it. The Treaty Ports, The Exchange, The World's Exchange, the goals of The Trade Mission and The World's Fair all read it. | Trade partners | Small extension: one count reads both lists. Five card texts change one phrase. |
| 2 | Bought and Paid For reads "each building you have bought", with gold or with faith. | Buildings bought | Small extension. The Votive Accounts and The Double Entry already read both banks. |
| 3 | No new card for wonders. The Gilded Scaffold without its penalty is the link, and the five gold wonders (The Colossus, The Great Lighthouse, Petra, Machu Picchu, The Great Stelae of Aksum) are the natural targets. If the wonder rework wants a Commerce hook, "a gold wonder counts as a gold building for your cards" is the one to check first. | Gold buildings | To check in the code |

Connection 1 gives the deals a late game with no new card. A seat at peace with three empires, with a route to one of them, counts three. The Exchange then pays +15%, and the goal of The World's Fair needs one more partner of either kind.

### D.4 Threads to cut or merge

| Thread | Cards | What to do |
|---|---|---|
| The treasury | The Money Lenders, The Strongroom, the Doctrine The Monte di Pietà | **Merge by name, with no card change.** It is the "save" side of one gold theme: earn (The Nest Egg, Private Patronage, Money at Work, The Stipendium), save, spend (the purchase cards). The first review's gap at Tiers I and II then closes, because the income cards are there. |
| Deals | Travellers' Letters, Export Guilds, Commission: The Trade Mission, The Treaty Ports, the Doctrine The Colleganza | **Merge into the routes abroad** through connection 1. Export Guilds stays with the goods as the "lend it" choice against The Casa da Índia. |
| Roads | The Wayside Inns, Market Gardens (shared), half of the Doctrine The Turnpike Trusts | **Not a thread.** Keep them as the bridge to Expansionist. Land routes lay the roads. |
| Plain hex flats | The Mineral Trade, The Provision Trade, The Potters' Quarter | Tier 0 glue. Keep. |
| Military singles | Foreign Procurement, The Epibatai | **Retire both.** No theme reads them. |

After this the deck has four themes: **goods; gold (earn, save, spend); trade (at home, or abroad with deals and posts); the sea.** The merchants and their customs houses are the bridge to Magisterial. That is the three or four themes the skill asks for, and it removes no card that a build uses.

---

## What I could not verify

- **Every power figure.** No test, bot game or measurement was run. The power bar is from October and is older than the changes of November.
- **A Commerce seat's gold income.** The two seats in "The figures this review uses" are my assumptions. If a real seat makes less, every income card and every purchase figure falls with it.
- **Whether The Money Lenders' interest counts as gold "you make each turn"** for The Nest Egg, Money at Work, The Stipendium, the Bourse and Lorenzo. The count is the empire's gold a turn with the income cards themselves left out (`rateDepth`, `src/sim/statecraft/evaluator.ts`). I did not trace the interest line.
- **How the route doublings combine.** I read `docs/trade.md` as: The Scholars' Roads, The World's Fair and The Peace of Lodi add together, then the sea premium, then the Merchant League. The figures of 193 and 168 a route depend on it. I also assumed that The Sea Ban doubles the pay that The Return Leg gives the origin.
- **Whether the purchase cards fire on a wonder** bought under The Gilded Scaffold. If they do, a 6,000 gold wonder with Civic Receipts, The Endowment and The Double Entry grants 3,000 culture and 3,000 science at once.
- **Whether gold poured into the Opus fires purchase cards.** `docs/README.md` says it calls `spendGold` alone, so I assumed that only Names in Stone counts it.
- **Whether a gold wonder counts as a gold building** for Commercial Education, Houses of Account and The Cloth Halls.
- **Whether discounts on one purchase have a limit.** Change 118 of the 2026-11-20 pass proposed one. I did not find its ruling.
- **How many luxury kinds, copies and monopolies a seat holds,** and how many gold buildings a town has in each age. These are estimates from the building list.
- **Unit prices in gold.** I used 4 gold for each hammer of the power bar's unit costs.
- **What the bots sign since the trade prices changed today.** Every deals figure depends on it. Astra owns that.
- **Whether a caravan from The First Caravan can run before Currency.** I assumed that it cannot.
- **Whether Financed Industry and War Foundries feed each other** in a Genghis Khan seat (production from gold, and gold from production).
- **What the count `luxuryCopies` returns** (all copies, or the most copies of one kind). Proposal 1's size depends on the first reading being cheap to add.
- **Whether a bought unit fires Dominion's "unit gained" cards.** The skill says it should.
