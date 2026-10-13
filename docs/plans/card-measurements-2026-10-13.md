# What the cards pay: old single pool against the decks (bot games, 2026-10-13)

Measured after the first deck playtest (Dominion + Expansionist, Mithridates), where the midgame felt flat. Current tree: `decks` at 9fc520d5. Old tree: 71a10f1a, the last commit with the single pool of 175 live Orders and 44 live Doctrines. 5 seeds × 6 seats per version, standard map with barbarians, to turn 200 or game end. Scripts and raw data stayed in the session scratchpad; the tables are reproduced below.

## Findings

1. **The cards pay as large a share of the economy as before.** Seated Orders' share of a seat's total yield, by turn window:

   | | 1–50 | 51–100 | 101–150 | 151–200 |
   |---|---|---|---|---|
   | Current Orders | 15% | 19% | 21% | 25% |
   | Old Orders | 8% | 13% | 16% | 21% |
   | Old Orders plus Doctrines | 14% | 19% | 24% | 31% |

   - Doctrines were the old system's chairless permanent cards, dealt at each government. All 48 are retired now, so the old system pulls ahead only late, and only through them.
   - Dominion + Expansionist seats: 16.5 / 20.4 / 21.7 / 24.4%. The weakest pairs are Devotion + Scientific (1–11%) and Devotion + Magisterial (6–19%).
   - So the flat midgame is not cards paying less in total. It is the shape of the draft over time.
2. **Chairs stall in the midgame.** The ladder gives 5 chairs from draft 4 to draft 18, about turn 30 to turn 115. At turn 100 a current seat has 5.2 chairs; an old seat had 7.2 (the old ladder added chairs at draft 10). A current seat holds 11.8 Orders in turns 51–100 with 6.7 on the bench, and seats a new card 1.4 times per 10 turns against 2.0 before.
3. **New cards are not upgrades.** A newly seated card pays 2.9% of the seat's yield against 4.0% for the cards already seated; in the old tree they were equal (2.1% and 2.1%). Pay per seated card by band 0–4: 3.4, 2.8, 3.0, 1.5, 1.1%. In the old tree the government III pool was the peak (3.3% against 2.0% for chiefdom cards). Bands 3 and 4 hold many Opus, rule and percentage cards that a per-turn reading underrates, so treat the late figures with care.
4. **Hands are diluted.** Share of each hand from the seat's current band: 39% at band 2, 21% at band 3, 23% at band 4. The old draw dealt only from the current government's pool.
5. **One-effect cards pay more.** Pay per seated card: one effect 3.8% of seat yield, two effects 2.9%, three or more 2.3%. 14 of the old top 15 earners have one effect and read a general stat; 3 of the current top 15 do (The Highlands, Stockpiles, Ore Caravans).
6. **Build-around cards are rare and rarely seated.** A Dominion + Expansionist seat can be dealt 1 amplifier and 1 converter. Bots seated amplifiers and converters in 1.5% (old) and 3.8% (current) of midgame card-samples; the 5 current amplifiers were never seated. Bots are not humans, so this says little about how a person would draft them.
7. **Dominion at peace.** Dominion seats were at war on 29% of their turns. Pay per Dominion card was similar at peace and at war (44.9 against 42.1 a turn), but only because the bots seat its economy cards (Stockpiles, Examinations of State, War Foundries, The Quartermasters, Martial Law, The Camp Chaplains). Combat-only, war-only or rule cards are 69% of offered Dominion cards at band 0, 56% at band 1, 45% at band 2 and 33% at band 3: a human at peace sees hands that are about half dead.
8. **One-off grants are negligible** in both trees: 0.39 yield per seat per turn from kills, camps, chops, trained units and the like.
9. **Draft pace is the same**, so the comparison is fair on tempo: draft 4 / 10 / 18 / 29 at median turn 30 / 70 / 114 / 159 now against 31 / 68 / 116 / 171 before.

**Worth checking for bugs:** The Tithe paid nothing over 27 samples (it needs a Temple and reads a share of base faith), and Established Routes paid nothing over 30 samples (a route must be kept 30 turns, which may simply be rare).

## Method and caveats

- Every 5 turns, `explainCardImpact` for each seated Order: the game's own reading of what the seat's yields would be without that card, identical in both trees. Direct lines plus knock-on lines (1–10% of the total); happiness and authority points are kept separate. The seat total is every town's `foldCity` plus `foldEmpireLines`; food is gross, gold is net of maintenance.
- Seat 0 was always Mithridates; seat 1 was given Dominion + Expansionist by config; seats 2–5 cycled the other leaders. 10 Dominion + Expansionist seats in the current tree, and every deck appeared.
- Bots seat economy cards and skip combat cards. The old tree's military chair forced combat cards into play (18% of old midgame card-samples against 3% now). Each card is measured alone, so two cards sharing a happiness tier both get the credit. A per-turn reading cannot see combat, rule or percentage-rider value. Balance changed between the two commits. 5 seeds is a small sample.

## Tables

## Games played

| Version | Games | Seats | Last turn (min / median / max) | Winners before 200 | Stalls | Bot warnings | Run time per game, min (median) | Sampling share of run time |
|---|---|---|---|---|---|---|---|---|
| old | 5 | 30 | 188 / 200 / 200 | 2 | 0 | 0 | 106.0 | 3.0% |
| cur | 5 | 30 | 200 / 200 / 200 | 1 | 0 | 0 | 119.9 | 2.4% |

### Who sat where (current tree)

| Deck pair | Seats |
|---|---|
| dominion+expansionist | 10 |
| dominion+devotion | 4 |
| devotion+magisterial | 3 |
| expansionist+commerce | 2 |
| dominion+magisterial | 2 |
| devotion+scientific | 2 |
| commerce+devotion | 2 |
| commerce+magisterial | 2 |
| expansionist+scientific | 2 |
| scientific+magisterial | 1 |

Seats per deck: dominion 16, expansionist 14, devotion 11, magisterial 8, commerce 6, scientific 5

Leaders seated: mithridates 5, (plain chair, decks set by config) 5, pachacuti 2, taizong 2, modu 2, akhenaten 2, almamun 2, joan 2, mansaMusa 2, zhengHeOfMing 2, nezahualcoyotl 2, hypatiaOfAlexandria 1, hildegard 1

## 1. Cards' share of the economy

Per seat, every 5 turns: the per-turn yield the seated Orders pay (sum of each seated card's ghost-diff, direct lines plus knock-on lines), against the seat's total per-turn yield (every town's `foldCity` plus `foldEmpireLines`, six voices summed; food is gross, gold is net of maintenance). "Share" is the card total over the seat total. Per window, each seat's samples are averaged first, then the table gives the mean and the spread across seats (25th / 75th percentile, and the max).

### OLD

| Window | Seat-samples | Seat total yield/turn (mean) | Cards pay/turn (mean) | Share % mean | Share % p25 / median / p75 / max | Share % direct lines only (mean) | Knock-on as % of card pay | Food | Prod | Gold | Sci | Cult | Faith |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-50 | 300 | 52.4 | 4.5 | 7.9 | 2.7 / 5.6 / 11.6 / 22.2 | 7.3 | 6.5 | 0.3 | 0.7 | 0.5 | 0.6 | 1.0 | 1.4 |
| 51-100 | 299 | 271.7 | 35.0 | 12.6 | 8.2 / 13.3 / 15.8 / 22.3 | 11.7 | 6.6 | 2.6 | 6.7 | 3.2 | 11.0 | 9.3 | 2.3 |
| 101-150 | 290 | 839.3 | 134.7 | 15.8 | 12.6 / 15.8 / 18.6 / 31.3 | 14.2 | 8.7 | 8.6 | 34.6 | 14.7 | 59.8 | 14.0 | 3.0 |
| 151-200 | 269 | 2136.7 | 443.8 | 20.9 | 15.5 / 19.3 / 24.1 / 39.7 | 18.9 | 10.3 | 41.4 | 68.9 | 115.5 | 180.5 | 36.3 | 1.2 |

Old tree, Doctrines added (slotless permanent cards the old draft dealt at each government; the current tree has none live):

| Window | Doctrines pay/turn (mean) | Orders + Doctrines share % (mean) |
|---|---|---|
| 1-50 | 3.4 | 14.1 |
| 51-100 | 15.4 | 18.8 |
| 101-150 | 81.4 | 23.8 |
| 151-200 | 261.8 | 31.0 |

### CUR

| Window | Seat-samples | Seat total yield/turn (mean) | Cards pay/turn (mean) | Share % mean | Share % p25 / median / p75 / max | Share % direct lines only (mean) | Knock-on as % of card pay | Food | Prod | Gold | Sci | Cult | Faith |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1-50 | 300 | 55.3 | 8.9 | 15.2 | 8.6 / 16.4 / 22.5 / 32.4 | 15.1 | 1.0 | 2.3 | 0.3 | 2.0 | 0.6 | 2.0 | 1.8 |
| 51-100 | 300 | 324.5 | 60.6 | 19.0 | 14.6 / 18.2 / 23.8 / 43.1 | 18.5 | 3.5 | 16.0 | 9.0 | 12.9 | 5.9 | 5.7 | 11.2 |
| 101-150 | 300 | 1045.8 | 225.0 | 20.9 | 15.0 / 20.9 / 25.0 / 40.4 | 19.9 | 5.5 | 47.7 | 32.7 | 52.6 | 38.2 | 28.8 | 25.1 |
| 151-200 | 300 | 3002.4 | 751.3 | 24.7 | 18.7 / 23.8 / 29.4 / 46.3 | 22.9 | 7.9 | 138.1 | 102.9 | 133.4 | 186.6 | 128.4 | 61.9 |

### Current tree, by deck pair (share % of seat yield, mean over seats)

| Deck pair | Seats | 1-50 | 51-100 | 101-150 | 151-200 |
|---|---|---|---|---|---|
| dominion+expansionist | 10 | 16.5 | 20.4 | 21.7 | 24.4 |
| dominion+devotion | 4 | 20.8 | 21.3 | 18.0 | 23.4 |
| devotion+magisterial | 3 | 5.6 | 9.5 | 14.2 | 18.8 |
| expansionist+commerce | 2 | 14.6 | 28.5 | 26.6 | 43.6 |
| dominion+magisterial | 2 | 15.1 | 19.3 | 24.2 | 25.2 |
| devotion+scientific | 2 | 1.1 | 7.0 | 9.4 | 11.0 |
| commerce+devotion | 2 | 18.0 | 20.8 | 21.8 | 29.4 |
| commerce+magisterial | 2 | 22.1 | 19.0 | 23.9 | 21.6 |
| expansionist+scientific | 2 | 24.3 | 22.8 | 27.6 | 30.2 |
| scientific+magisterial | 1 | 1.4 | 18.3 | 26.9 | 24.1 |

## 2. Per card while seated

A card-sample is one seated Order at one 5-turn sample. "Pays" is the six voices summed (direct plus knock-on). "Paid nothing" means no yield and no happiness or authority points either; "no yield" counts a card that pays only meter points as zero.

### OLD

By band (current) or government pool (old):

| Group | Card-samples | Distinct cards | Mean pays/turn | Median | Mean % of the seat's yield one card pays | Share of card-samples paying nothing | Share paying no yield | Mean pays/turn, turns 51-150 only |
|---|---|---|---|---|---|---|---|---|
| chiefdom | 1255 | 12 | 3.7 | 0.0 | 2.00 | 52.6% | 59.3% | 5.9 |
| governmentI | 2528 | 23 | 15.9 | 7.1 | 2.15 | 25.3% | 34.2% | 9.3 |
| governmentII | 1647 | 33 | 16.3 | 6.6 | 1.81 | 31.6% | 32.2% | 12.1 |
| governmentIII | 1186 | 28 | 67.3 | 41.2 | 3.30 | 23.9% | 24.5% | 40.0 |
| governmentIV | 401 | 13 | 46.3 | 0.0 | 1.18 | 58.6% | 58.6% | 3.3 |
| governmentV | 1 | 1 | 250.0 | 250.0 | 4.31 | 0.0% | 0.0% | – |

By rarity:

| Rarity | Card-samples | Distinct cards | Mean pays/turn | Median |
|---|---|---|---|---|
| common | 3689 | 51 | 27.6 | 7.0 |
| uncommon | 2806 | 45 | 17.4 | 2.2 |
| rare | 523 | 14 | 37.3 | 19.7 |

Top 15 by mean per-turn payout (cards with at least 5 samples, 100 cards qualify):

| Card | Band/pool | Slot | Rarity | Samples | Mean pays/turn | Mean meter points | Samples paying nothing |
|---|---|---|---|---|---|---|---|
| Pilgrims | governmentIII | wildcard | uncommon | 25 | 400.6 | 0.0 | 0% |
| The Exchequer | governmentIV | economic | common | 48 | 288.3 | 0.0 | 2% |
| The Far Charts | governmentIII | wildcard | rare | 61 | 159.3 | 0.0 | 0% |
| Toleration Edicts | governmentIII | wildcard | common | 9 | 115.6 | 21.3 | 0% |
| The Golden Scales | governmentIII | economic | common | 25 | 111.1 | 0.0 | 0% |
| The Broad Acres | governmentIV | economic | rare | 14 | 110.9 | 0.0 | 0% |
| First Fruits | governmentIII | economic | common | 173 | 106.4 | 0.0 | 0% |
| The Drafting Halls | governmentIII | economic | common | 115 | 105.8 | 0.0 | 0% |
| The Granary Laws | governmentIII | economic | uncommon | 5 | 83.0 | 0.0 | 0% |
| The Wild Chair | governmentIII | wildcard | uncommon | 70 | 80.9 | 0.0 | 21% |
| The Census Eternal | governmentIII | wildcard | common | 169 | 75.7 | 0.0 | 0% |
| The Scriveners | governmentII | wildcard | uncommon | 43 | 63.3 | 0.0 | 0% |
| The War Chest | governmentIII | economic | common | 12 | 62.0 | 0.0 | 0% |
| The Annals of Law | governmentIII | wildcard | common | 12 | 60.9 | 0.0 | 0% |
| The Harvest Songs | governmentII | wildcard | common | 17 | 59.5 | 0.0 | 0% |

Bottom 15:

| Card | Band/pool | Slot | Rarity | Samples | Mean pays/turn | Mean meter points | Samples paying nothing |
|---|---|---|---|---|---|---|---|
| The Marshals' Purse | governmentIV | military | rare | 52 | 0.1 | 0.0 | 96% |
| The Foundry Days | governmentII | economic | common | 28 | 0.1 | 0.0 | 86% |
| Decisive Blows | governmentIV | military | rare | 46 | 0.1 | 0.0 | 93% |
| Far Runners | chiefdom | military | common | 113 | 0.0 | 0.0 | 100% |
| Camp Followers | chiefdom | military | uncommon | 100 | 0.0 | 0.0 | 100% |
| Spoils of the Wild | governmentI | military | uncommon | 7 | 0.0 | 0.0 | 100% |
| The Vizierate | governmentII | economic | uncommon | 134 | 0.0 | 0.0 | 100% |
| Sumptuary Laws | governmentII | economic | common | 9 | 0.0 | 9.3 | 0% |
| The Coin Charter | governmentII | economic | uncommon | 34 | 0.0 | 0.0 | 100% |
| The Mint Charter | governmentIII | economic | uncommon | 17 | 0.0 | 0.0 | 100% |
| Mercenaries | governmentIV | economic | rare | 29 | 0.0 | 0.0 | 100% |
| The Widow's Levy | chiefdom | military | uncommon | 11 | 0.0 | 0.0 | 100% |
| Knightly Orders | governmentIV | military | rare | 17 | -1.9 | 0.0 | 88% |
| The Guild of Masons | governmentIV | economic | common | 13 | -9.4 | 0.0 | 0% |
| The Reckless Levy | governmentI | military | uncommon | 13 | -13.3 | 0.0 | 0% |

Distinct seated cards: 110. Paid nothing (no yield, no meter points) on most of their samples: **32** (29.1%). Paid no yield on most samples: 38 (34.5%). Share of all card-samples paying nothing: 33.3%.

### CUR

By band (current) or government pool (old):

| Group | Card-samples | Distinct cards | Mean pays/turn | Median | Mean % of the seat's yield one card pays | Share of card-samples paying nothing | Share paying no yield | Mean pays/turn, turns 51-150 only |
|---|---|---|---|---|---|---|---|---|
| band 0 | 3962 | 65 | 22.6 | 12.0 | 3.36 | 18.2% | 18.2% | 19.1 |
| band 1 | 2037 | 58 | 51.0 | 28.1 | 2.79 | 20.2% | 21.7% | 27.3 |
| band 2 | 1123 | 36 | 94.0 | 54.0 | 2.99 | 22.7% | 25.6% | 39.4 |
| band 3 | 165 | 13 | 81.3 | 27.8 | 1.49 | 33.9% | 38.2% | 87.3 |
| band 4 | 19 | 3 | 72.0 | 80.9 | 1.10 | 42.1% | 42.1% | – |

By rarity:

| Rarity | Card-samples | Distinct cards | Mean pays/turn | Median |
|---|---|---|---|---|
| common | 5187 | 96 | 43.7 | 20.0 |
| uncommon | 1182 | 58 | 35.9 | 8.0 |
| rare | 937 | 21 | 47.7 | 17.7 |

Top 15 by mean per-turn payout (cards with at least 5 samples, 136 cards qualify):

| Card | Band/pool | Deck | Rarity | Samples | Mean pays/turn | Mean meter points | Samples paying nothing |
|---|---|---|---|---|---|---|---|
| The National Galleries | band 3 | magisterial | common | 14 | 600.5 | 60.3 | 0% |
| Marcher Lords | band 2 | dominion/expansionist | uncommon | 29 | 279.1 | 11.2 | 0% |
| The Exchange | band 2 | commerce | uncommon | 11 | 274.6 | 0.0 | 0% |
| The Highlands | band 2 | expansionist | common | 29 | 265.2 | 0.0 | 0% |
| The Scholars' Roads | band 2 | commerce | rare | 40 | 205.8 | 0.0 | 0% |
| Venture Routes | band 1 | commerce | uncommon | 29 | 199.4 | 0.0 | 0% |
| The Factors' Houses | band 1 | commerce | common | 23 | 195.4 | 0.0 | 0% |
| Stockpiles | band 2 | dominion | common | 140 | 187.7 | 0.0 | 0% |
| The Civic Pantheon | band 3 | magisterial | common | 5 | 182.3 | 0.0 | 0% |
| The Court Archives | band 2 | magisterial | common | 44 | 165.4 | 0.0 | 0% |
| The Military Frontier | band 4 | dominion | rare | 8 | 140.7 | 0.0 | 0% |
| The Hard Country | band 1 | expansionist | common | 51 | 137.1 | 0.0 | 0% |
| The Civic Faith | band 2 | magisterial | common | 59 | 123.5 | 4.2 | 0% |
| Ore Caravans | band 1 | commerce | common | 20 | 121.0 | 0.0 | 5% |
| The Silk Road Monks | band 2 | commerce | uncommon | 24 | 115.0 | 0.0 | 25% |

Bottom 15:

| Card | Band/pool | Deck | Rarity | Samples | Mean pays/turn | Mean meter points | Samples paying nothing |
|---|---|---|---|---|---|---|---|
| Watchmen | band 0 | generic | common | 23 | 0.0 | 0.0 | 100% |
| Field Notebooks | band 0 | scientific | common | 8 | 0.0 | 0.0 | 100% |
| The Tithe | band 2 | commerce/devotion | rare | 27 | 0.0 | 0.0 | 100% |
| Established Routes | band 1 | commerce | uncommon | 30 | 0.0 | 0.0 | 100% |
| The Royal Society | band 2 | scientific | common | 8 | 0.0 | 3.8 | 0% |
| Granary Levies | band 0 | expansionist | common | 6 | 0.0 | 0.0 | 100% |
| The Master Builders | band 1 | expansionist | common | 6 | 0.0 | 0.0 | 100% |
| Marine Drill | band 2 | dominion | uncommon | 5 | 0.0 | 0.0 | 100% |
| Rites of Passage | band 0 | dominion/devotion | common | 10 | 0.0 | 0.0 | 100% |
| The Seed Grain | band 0 | expansionist | uncommon | 11 | 0.0 | 0.0 | 100% |
| The Beating of the Bounds | band 0 | expansionist | common | 5 | 0.0 | 0.0 | 100% |
| Tinkers' Guild | band 1 | expansionist | common | 11 | 0.0 | 0.0 | 100% |
| The Capital of Letters | band 0 | magisterial | rare | 8 | -0.2 | 0.0 | 75% |
| The Patient Harvest | band 0 | expansionist | rare | 13 | -0.7 | 0.0 | 54% |
| Total War | band 3 | dominion | rare | 7 | -148.4 | -36.9 | 0% |

Distinct seated cards: 175. Paid nothing (no yield, no meter points) on most of their samples: **55** (31.4%). Paid no yield on most samples: 60 (34.3%). Share of all card-samples paying nothing: 19.9%.

## 2b. Per card shape

Each card is put in one class by the strongest build-around effect on its row, checked in this order: A boosts other cards (`cardYieldAmplifier`, `effectAmplifier`); B converts one yield into another or reads a rate (`pays` with basis share, mirror or rate); C scales with the empire (`pays` count at empire or capital); D scales within a town (`pays` count at city, hex or route); E flat or percent yield; F meter points only; G combat or war only (combat lines, unit stats, levies, kill/capture/camp riders); H a rule or anything else. A and B together are the closest reading of "cards that make other things better".

### OLD

| Shape | Live cards in the data | Card-samples seated | Share of seated card-samples, turns 51-150 | Mean pays/turn | Mean pays/turn, turns 51-150 | Card-samples paying nothing |
|---|---|---|---|---|---|---|
| A boosts other cards | 7 | 66 | 0.1% | 219.8 | 26.7 | 1.5% |
| B converts / reads a rate | 6 | 162 | 1.4% | 101.0 | 59.6 | 0.0% |
| C scales with empire | 36 | 1629 | 25.2% | 40.9 | 21.7 | 2.9% |
| D scales within a town | 3 | 172 | 1.8% | 34.4 | 15.8 | 0.6% |
| E flat or percent yield | 53 | 1840 | 30.0% | 27.3 | 16.1 | 14.5% |
| F meter points only | 6 | 165 | 2.0% | 4.5 | 5.3 | 0.6% |
| G combat or war only | 26 | 1522 | 17.9% | 2.9 | 2.3 | 75.6% |
| H rule / other | 39 | 1462 | 21.8% | 7.8 | 3.0 | 59.6% |

### CUR

| Shape | Live cards in the data | Card-samples seated | Share of seated card-samples, turns 51-150 | Mean pays/turn | Mean pays/turn, turns 51-150 | Card-samples paying nothing |
|---|---|---|---|---|---|---|
| A boosts other cards | 5 | 0 | 0.0% | – | – | 0.0% |
| B converts / reads a rate | 11 | 296 | 3.8% | 54.2 | 18.5 | 26.7% |
| C scales with empire | 24 | 1299 | 21.6% | 38.2 | 29.1 | 2.3% |
| D scales within a town | 44 | 1527 | 18.5% | 75.5 | 33.6 | 6.0% |
| E flat or percent yield | 163 | 3647 | 51.0% | 36.4 | 20.5 | 21.7% |
| F meter points only | 15 | 84 | 0.7% | 0.9 | 3.1 | 10.7% |
| G combat or war only | 36 | 299 | 3.0% | 0.0 | 0.0 | 100.0% |
| H rule / other | 132 | 154 | 1.3% | 0.2 | 0.5 | 98.7% |

Live cards a Dominion + Expansionist seat can be dealt (its two decks, cross-types naming either, and the generic cards): A 1, B 1, C 6, D 11, E 60, F 9, G 30, H 55 (of 173).

## 3. One-off grants

Every windfall payout the game made through `payWindfallGrants` (kills, camps, captures, chops, trained units, periodic boons, commissions and the rest), caught by a one-line hook in a scratch copy of each tree. Counted: the flat yield grants a card adds to an occasion, the units it gifts and the renown it adds. Not counted: a card's percentage riders on an occasion's own figure (the payout keeps only the combined amount; the count of occasions a card rode is shown instead), and the `onSlot` / charter grants that do not go through a windfall.

### OLD

Seated Orders paid **2275** yield in one-off grants over 5892 seat-turns: **0.39 per seat per turn** on average. By window (per seat per turn): 1-50 0.47, 51-100 0.33, 101-150 0.44, 151-200 0.30.

| Card | Band/pool | Occasions | Yield granted (total, by voice) | Units gifted | Renown | Rider lines (incl. percent riders) |
|---|---|---|---|---|---|---|
| Far Runners | chiefdom | 59 | 590 (culture 590) | 0 | 0 | 59 |
| Master Masons | governmentII | 16 | 400 (culture 400) | 0 | 0 | 16 |
| The Foundry Days | governmentII | 4 | 398 (production 398) | 0 | 0 | 0 |
| The Reeve’s Bell | governmentI | 7 | 252 (food 252) | 0 | 0 | 0 |
| The Widow's Levy | chiefdom | 4 | 200 (gold 160, production 40) | 0 | 0 | 8 |
| Scholastics | governmentIV | 5 | 200 (faith 200) | 0 | 0 | 5 |
| Camp Followers | chiefdom | 7 | 175 (food 175) | 7 | 0 | 14 |
| The Banner-Call | governmentII | 12 | 60 (culture 60) | 0 | 0 | 12 |
| Spoils of the Wild | governmentI | 0 | 0 () | 0 | 0 | 2 |

### CUR

Seated Orders paid **2314** yield in one-off grants over 6000 seat-turns: **0.39 per seat per turn** on average. By window (per seat per turn): 1-50 0.43, 51-100 0.47, 101-150 0.46, 151-200 0.18.

| Card | Band/pool | Occasions | Yield granted (total, by voice) | Units gifted | Renown | Rider lines (incl. percent riders) |
|---|---|---|---|---|---|---|
| Master Masons | band 0 | 33 | 660 (production 660) | 0 | 0 | 33 |
| Blooded Spears | band 0 | 10 | 500 (production 250, food 250) | 0 | 0 | 20 |
| Learned Commissions | band 1 | 7 | 420 (culture 280, faith 140) | 0 | 0 | 14 |
| Rites of Passage | band 0 | 21 | 252 (faith 252) | 0 | 0 | 21 |
| Granary Levies | band 0 | 14 | 210 (production 210) | 0 | 0 | 14 |
| Field Notebooks | band 0 | 2 | 110 (culture 40, gold 40, science 30) | 0 | 0 | 6 |
| The Founding Pageant | band 0 | 3 | 75 (culture 75) | 0 | 0 | 3 |
| Muster Rites | band 0 | 6 | 72 (faith 36, food 36) | 0 | 0 | 12 |
| Battle Honours | band 0 | 8 | 0 () | 0 | 66 | 8 |
| Field Academies | band 1 | 1 | 15 (science 15) | 0 | 0 | 1 |

## 4. Current tree: Dominion at peace and at war

Seats holding the Dominion deck. "At war" means the seat was in a war with another empire (`state.wars` names it — the same test the `atWar` card condition uses) on the sampled turn.

| State | Seat-samples | Dominion cards pay/turn per seat | Other seated cards pay/turn per seat | Dominion card-samples | Mean per Dominion card | Dominion card-samples paying nothing | Paying no yield | Dominion one-off grants per seat-turn |
|---|---|---|---|---|---|---|---|---|
| At peace | 455 | 214.8 | 90.9 | 2178 | 44.9 | 19.9% | 19.9% | 0.26 |
| At war | 185 | 272.4 | 35.8 | 1196 | 42.1 | 12.7% | 12.7% | 0.26 |

Dominion seats spent 28.8% of their turns at war.

Dominion cards seen seated both at peace and at war (at least 3 samples each):

| Card | Band | Peace samples | Peace mean | War samples | War mean |
|---|---|---|---|---|---|
| The Camp Chaplains | 0 | 159 | 48.6 | 130 | 70.9 |
| Arsenals | 3 | 60 | 51.4 | 20 | 64.8 |
| Sword and Plough | 0 | 96 | 11.7 | 69 | 22.2 |
| The War Hall Schools | 1 | 114 | 29.2 | 84 | 38.0 |
| Martial Law | 0 | 302 | 38.8 | 147 | 47.0 |
| The Road Garrisons | 2 | 5 | 27.0 | 3 | 33.7 |
| The Pacified Marches | 1 | 23 | 12.1 | 28 | 18.0 |
| The Horse Herds | 0 | 198 | 10.2 | 117 | 13.8 |
| The Standing Army | 0 | 201 | 14.0 | 75 | 14.4 |
| Blooded Spears | 0 | 64 | 0.0 | 6 | 0.0 |
| Siege Works | 2 | 69 | 0.0 | 38 | 0.0 |
| Horse Lords | 1 | 11 | 0.0 | 14 | 0.0 |
| The Siege Train | 3 | 14 | 0.0 | 10 | 0.0 |
| Drill Manuals | 1 | 168 | 26.6 | 87 | 26.3 |
| Armoury Guilds | 2 | 105 | 30.0 | 65 | 29.5 |
| Military Colonies | 1 | 6 | 1.2 | 8 | 0.7 |
| The Quartermasters | 1 | 110 | 73.3 | 52 | 48.9 |
| War Foundries | 1 | 119 | 79.6 | 73 | 47.2 |
| The Soldier-Farmers | 1 | 22 | 33.3 | 5 | 0.0 |
| The Escorted Roads | 1 | 24 | 114.8 | 12 | 72.1 |
| Stockpiles | 2 | 94 | 202.3 | 46 | 157.7 |
| Examinations of State | 2 | 58 | 145.7 | 79 | 88.5 |

## 5. Current tree: which band offered cards came from

Every hand dealt (regular drafts, rerolls and reward hands), caught as it was drawn. "Ladder band" is the band the seat's draft count has reached (`bandTierAt`). "Top open band" also applies the age gate (`bandOpen`): band b needs research age min(b+1, 4).

### draft hands, by ladder band

| Ladder band | Hands | Cards | From the ladder band % | band 0 % | band 1 % | band 2 % | band 3 % | band 4 % |
|---|---|---|---|---|---|---|---|---|
| 0 | 90 | 270 | 100.0 | 100.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 1 | 420 | 1266 | 40.7 | 59.3 | 40.7 | 0.0 | 0.0 | 0.0 |
| 2 | 296 | 952 | 38.9 | 30.5 | 30.7 | 38.9 | 0.0 | 0.0 |
| 3 | 261 | 892 | 21.0 | 26.9 | 25.1 | 27.0 | 21.0 | 0.0 |
| 4 | 58 | 184 | 23.4 | 32.1 | 20.7 | 15.2 | 8.7 | 23.4 |

Same hands grouped by the top band actually open (ladder and age gate together):

| Top open band | Cards | From the top open band % | band 0 % | band 1 % | band 2 % | band 3 % | band 4 % |
|---|---|---|---|---|---|---|---|
| 0 | 657 | 100.0 | 100.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 1 | 879 | 58.6 | 41.4 | 58.6 | 0.0 | 0.0 | 0.0 |
| 2 | 970 | 39.1 | 30.6 | 30.3 | 39.1 | 0.0 | 0.0 |
| 3 | 874 | 21.4 | 26.7 | 25.4 | 26.5 | 21.4 | 0.0 |
| 4 | 184 | 23.4 | 32.1 | 20.7 | 15.2 | 8.7 | 23.4 |

### reward hands, by ladder band

| Ladder band | Hands | Cards | From the ladder band % | band 0 % | band 1 % | band 2 % | band 3 % | band 4 % |
|---|---|---|---|---|---|---|---|---|
| 1 | 26 | 60 | 0.0 | 100.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 2 | 29 | 88 | 46.6 | 20.5 | 33.0 | 46.6 | 0.0 | 0.0 |
| 3 | 25 | 84 | 29.8 | 11.9 | 29.8 | 28.6 | 29.8 | 0.0 |
| 4 | 7 | 23 | 30.4 | 4.3 | 13.0 | 13.0 | 39.1 | 30.4 |

Old tree check: 3068 of 3068 offered cards (100.0%) came from the seat's current government pool — the old draw dealt from the current pool only (`livePool`), so this is 100% by construction.

## 6. Draft pace

### OLD

Turn a seat first reached each draft count (ladder rung) and first adopted a government of that tier; median turn, and how many of the 30 seats got there.

| Rung (drafts) | Reached: seats | Median turn | p25-p75 | Government of that tier adopted: seats | Median turn |
|---|---|---|---|---|---|
| 4 | 30 | 31 | 29-34 | 30 | 32 |
| 10 | 29 | 68 | 66-73 | 29 | 69 |
| 18 | 29 | 116 | 108-125 | 29 | 117 |
| 29 | 22 | 171 | 148-182 | 22 | 172 |
| 45 | 2 | 189 | 188-190 | 2 | 190 |

| Turn | Seats | Drafts (mean) | Orders held (mean) | Chairs (mean) | Seated (mean) | Empty chairs (mean) | Doctrines (mean) |
|---|---|---|---|---|---|---|---|
| 50 | 30 | 6.3 | 6.2 | 5.0 | 4.2 | 0.8 | 1.0 |
| 100 | 29 | 15.0 | 14.9 | 7.2 | 7.1 | 0.1 | 2.2 |
| 150 | 29 | 24.3 | 24.0 | 8.3 | 8.0 | 0.3 | 3.2 |
| 200 | 18 | 33.2 | 33.0 | 9.4 | 9.1 | 0.3 | 3.9 |

### CUR

Turn a seat first reached each draft count (ladder rung) and first adopted a government of that tier; median turn, and how many of the 30 seats got there.

| Rung (drafts) | Reached: seats | Median turn | p25-p75 | Government of that tier adopted: seats | Median turn |
|---|---|---|---|---|---|
| 4 | 30 | 30 | 27-35 | 30 | 30 |
| 10 | 30 | 70 | 62-73 | 30 | 70 |
| 18 | 29 | 114 | 109-123 | 29 | 115 |
| 29 | 25 | 159 | 152-171 | 25 | 160 |
| 45 | 7 | 189 | 168-194 | 7 | 190 |

| Turn | Seats | Drafts (mean) | Orders held (mean) | Chairs (mean) | Seated (mean) | Empty chairs (mean) | Doctrines (mean) |
|---|---|---|---|---|---|---|---|
| 50 | 30 | 6.7 | 7.3 | 5.0 | 5.0 | 0.0 | 0.0 |
| 100 | 30 | 15.1 | 15.5 | 5.2 | 5.2 | 0.0 | 0.0 |
| 150 | 30 | 25.4 | 26.9 | 8.2 | 7.9 | 0.3 | 0.0 |
| 200 | 30 | 37.2 | 39.7 | 10.4 | 10.1 | 0.3 | 0.0 |

## 6b. Chairs, bench and turnover

"Newly seated" counts cards that are in a chair at a sample and were not at the previous sample (5 turns earlier), per seat per 10 turns. "Benched" is Orders held minus Orders seated.

| Version | Window | Chairs (mean) | Held (mean) | Benched (mean) | Newly seated per seat per 10 turns | Payout of a newly seated card, % of seat yield (mean) | Payout of a card already seated, % of seat yield (mean) |
|---|---|---|---|---|---|---|---|
| old | 1-50 | 3.9 | 3.1 | 0.6 | 1.36 | 2.48 | 2.03 |
| old | 51-100 | 6.2 | 10.7 | 4.8 | 2.04 | 2.09 | 2.12 |
| old | 101-150 | 7.8 | 19.9 | 12.4 | 2.45 | 2.33 | 1.93 |
| old | 151-200 | 8.9 | 28.9 | 20.3 | 2.98 | 1.98 | 2.52 |
| cur | 1-50 | 3.8 | 3.5 | 0.5 | 1.49 | 3.90 | 3.86 |
| cur | 51-100 | 5.1 | 11.8 | 6.7 | 1.42 | 2.93 | 3.98 |
| cur | 101-150 | 7.2 | 21.9 | 14.9 | 2.35 | 2.50 | 3.00 |
| cur | 151-200 | 9.7 | 34.1 | 24.7 | 2.94 | 2.02 | 2.71 |

## 5b. What the hands offered and what the bots seated, by card shape

Regular draft hands only. "Ever seated" means the offered card was seen in a chair at any later sample in that game (the bot took it and seated it).

### OLD

| Group | Shape | Cards offered | Share of the group's offers | Ever seated % |
|---|---|---|---|---|
| chiefdom | C scales with empire | 149 | 41.4% | 39.6% |
| chiefdom | E flat or percent yield | 44 | 12.2% | 27.3% |
| chiefdom | F meter points only | 17 | 4.7% | 70.6% |
| chiefdom | G combat or war only | 120 | 33.3% | 46.7% |
| chiefdom | H rule / other | 30 | 8.3% | 0.0% |
| governmentI | A boosts other cards | 14 | 2.6% | 0.0% |
| governmentI | B converts / reads a rate | 13 | 2.4% | 0.0% |
| governmentI | C scales with empire | 147 | 27.5% | 40.1% |
| governmentI | D scales within a town | 4 | 0.7% | 100.0% |
| governmentI | E flat or percent yield | 164 | 30.7% | 43.3% |
| governmentI | F meter points only | 32 | 6.0% | 6.2% |
| governmentI | G combat or war only | 47 | 8.8% | 25.5% |
| governmentI | H rule / other | 113 | 21.2% | 32.7% |
| governmentII | A boosts other cards | 5 | 0.7% | 0.0% |
| governmentII | B converts / reads a rate | 35 | 5.0% | 20.0% |
| governmentII | C scales with empire | 171 | 24.3% | 25.1% |
| governmentII | E flat or percent yield | 189 | 26.8% | 24.9% |
| governmentII | G combat or war only | 203 | 28.8% | 27.1% |
| governmentII | H rule / other | 102 | 14.5% | 37.3% |
| governmentIII | A boosts other cards | 29 | 3.2% | 10.3% |
| governmentIII | B converts / reads a rate | 35 | 3.9% | 42.9% |
| governmentIII | C scales with empire | 154 | 17.1% | 24.7% |
| governmentIII | E flat or percent yield | 210 | 23.4% | 20.0% |
| governmentIII | F meter points only | 39 | 4.3% | 5.1% |
| governmentIII | G combat or war only | 220 | 24.5% | 19.1% |
| governmentIII | H rule / other | 212 | 23.6% | 24.5% |
| governmentIV | A boosts other cards | 119 | 21.3% | 10.1% |
| governmentIV | C scales with empire | 74 | 13.3% | 5.4% |
| governmentIV | D scales within a town | 28 | 5.0% | 57.1% |
| governmentIV | E flat or percent yield | 148 | 26.5% | 11.5% |
| governmentIV | F meter points only | 30 | 5.4% | 0.0% |
| governmentIV | G combat or war only | 83 | 14.9% | 65.1% |
| governmentIV | H rule / other | 76 | 13.6% | 14.5% |
| governmentV | A boosts other cards | 2 | 16.7% | 0.0% |
| governmentV | C scales with empire | 1 | 8.3% | 0.0% |
| governmentV | E flat or percent yield | 6 | 50.0% | 16.7% |
| governmentV | G combat or war only | 1 | 8.3% | 0.0% |
| governmentV | H rule / other | 2 | 16.7% | 0.0% |

### CUR

| Group | Shape | Cards offered | Share of the group's offers | Ever seated % |
|---|---|---|---|---|
| ladder band 0 | C scales with empire | 14 | 5.2% | 100.0% |
| ladder band 0 | D scales within a town | 19 | 7.0% | 47.4% |
| ladder band 0 | E flat or percent yield | 149 | 55.2% | 41.6% |
| ladder band 0 | G combat or war only | 30 | 11.1% | 50.0% |
| ladder band 0 | H rule / other | 58 | 21.5% | 13.8% |
| ladder band 1 | A boosts other cards | 4 | 0.3% | 0.0% |
| ladder band 1 | B converts / reads a rate | 8 | 0.6% | 75.0% |
| ladder band 1 | C scales with empire | 80 | 6.3% | 70.0% |
| ladder band 1 | D scales within a town | 117 | 9.2% | 48.7% |
| ladder band 1 | E flat or percent yield | 564 | 44.5% | 26.4% |
| ladder band 1 | F meter points only | 42 | 3.3% | 11.9% |
| ladder band 1 | G combat or war only | 141 | 11.1% | 18.4% |
| ladder band 1 | H rule / other | 310 | 24.5% | 5.5% |
| ladder band 2 | A boosts other cards | 6 | 0.6% | 0.0% |
| ladder band 2 | B converts / reads a rate | 11 | 1.2% | 63.6% |
| ladder band 2 | C scales with empire | 26 | 2.7% | 30.8% |
| ladder band 2 | D scales within a town | 62 | 6.5% | 51.6% |
| ladder band 2 | E flat or percent yield | 489 | 51.4% | 18.4% |
| ladder band 2 | F meter points only | 69 | 7.2% | 7.2% |
| ladder band 2 | G combat or war only | 121 | 12.7% | 6.6% |
| ladder band 2 | H rule / other | 168 | 17.6% | 1.2% |
| ladder band 3 | A boosts other cards | 8 | 0.9% | 0.0% |
| ladder band 3 | B converts / reads a rate | 11 | 1.2% | 9.1% |
| ladder band 3 | C scales with empire | 22 | 2.5% | 22.7% |
| ladder band 3 | D scales within a town | 80 | 9.0% | 32.5% |
| ladder band 3 | E flat or percent yield | 430 | 48.2% | 11.2% |
| ladder band 3 | F meter points only | 76 | 8.5% | 3.9% |
| ladder band 3 | G combat or war only | 109 | 12.2% | 14.7% |
| ladder band 3 | H rule / other | 156 | 17.5% | 0.6% |
| ladder band 4 | A boosts other cards | 1 | 0.5% | 0.0% |
| ladder band 4 | B converts / reads a rate | 1 | 0.5% | 0.0% |
| ladder band 4 | C scales with empire | 5 | 2.7% | 20.0% |
| ladder band 4 | D scales within a town | 13 | 7.1% | 23.1% |
| ladder band 4 | E flat or percent yield | 89 | 48.4% | 2.2% |
| ladder band 4 | F meter points only | 10 | 5.4% | 20.0% |
| ladder band 4 | G combat or war only | 31 | 16.8% | 0.0% |
| ladder band 4 | H rule / other | 34 | 18.5% | 0.0% |

### Current tree: Dominion cards offered to Dominion seats, by card band and shape

| Card band | Offered | A | B | C | D | E | F | G | H | Share combat/war only (G) | Share rule/other (H) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 269 | 0 | 0 | 37 | 0 | 47 | 0 | 62 | 123 | 23.0% | 45.7% |
| 1 | 266 | 0 | 9 | 17 | 0 | 90 | 0 | 72 | 78 | 27.1% | 29.3% |
| 2 | 241 | 0 | 0 | 0 | 16 | 104 | 13 | 73 | 35 | 30.3% | 14.5% |
| 3 | 92 | 0 | 0 | 0 | 16 | 37 | 9 | 27 | 3 | 29.3% | 3.3% |
| 4 | 35 | 0 | 0 | 3 | 3 | 7 | 2 | 10 | 10 | 28.6% | 28.6% |

