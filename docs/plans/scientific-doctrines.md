# Scientific Doctrines (proposal)

**Status:** proposal, 2026-10-23. Nothing is built. No code, data or deck sheet changed. This is stage 6 of the deck pass (the card-design skill, "Doctrines") for Scientific. The Scientific sheet (`docs/decks/scientific.md`) still says "Doctrines: none yet".

The user's request, 2026-10-23, verbatim: *"could you assign a subagent to create doctrines for commerce and scientific, update the doc when done."* The Commerce Doctrines are in `docs/plans/commerce-doctrines.md`.

## 1. How to read this

- **One section a tier,** Tiers I to IV. Each starts with a table: Doctrine | Theme | Text | Drawback | Shape. Notes on each Doctrine follow the table: why it is here, what it changes in play, its size against the power bar, and its historical model.
- **Theme:** the engine (technologies and charters), or one of the four themes of `docs/plans/scientific-themes.md`: the learned land, institutions, great cities and the elite army.
- **Shape:**
  - *existing:* the effect kinds and fields that already say it, with the live row that uses the same form;
  - *near existing:* one small field or member on a shape that exists;
  - *new shape:* what is missing. Section 9 groups the new shapes.
- **Numbers are first guesses.** The effort went into what each Doctrine does.
- **Plain text, no card names.** No Doctrine names an Order or another Doctrine (principle 8). A Doctrine may name a game object: a technology, a building, an improvement or a unit line.

**When each tier is offered, and the bar it is sized against** (`.claude/skills/card-design/references/power-bar.md`; the turns are the bot model):

| Doctrine tier | Offered with | First offer, about | The age then | A regular card pays | A headline card pays |
|---|---|---|---|---|---|
| I | tier-4 governments | turn 32 | late age 1, age 2 | 15 to 25 a turn | 40 to 50 |
| II | tier-10 governments | turn 72 | late age 2, age 3 | 35 to 60 | 100 or more |
| III | tier-18 governments | turn 133 | late age 3, age 4 | 60 to 120 | 200 or more |
| IV | tier-26 governments | turn 161 | age 4 | 60 to 120 | 200 or more |

A Doctrine is held all game and takes no chair. So a Doctrine with a real drawback aims near the headline of its tier, and one with no drawback aims at the regular card.

## 2. How the Doctrines fit the deck

**The deck in one line** (`docs/decks/deck-design.md`, "Direction, 2026-10-20"): Scientific is paid for advancement, is strongest in the windows when it is ahead, and gives up numbers (few towns, few units). It stays out of civic life; the Physic Garden's happiness is the one exception the user ruled.

**What a Scientific Doctrine does.** Each one turns a part of that identity into a rule the seat lives with for the whole game:

- **The engine (4):** the seat chooses how it races. It may race for firsts and pay to follow (The Pythagorean Brotherhood), turn its research into drafts (The Jixian Academy), keep a free army only while it leads (The Directorate of Arms), or beeline the Magnum Opus (The Court of Rudolf II).
- **The learned land (3):** more Academies, from more sources. A scholar founds two (The Peripatetic School), Academies need no citizen (The Pandidakterion), and every great person founds one (The Platonic Academy).
- **Institutions (2):** the great houses do more than their own town. Each one makes research cheaper (The Academy of Gondishapur), and each one serves its neighbours (The Külliye).
- **Great cities (3):** the seat commits to few, big towns. Settlers cost double (The Removal to Xianyang), small towns' schools are halved (The Universitas), and a second great city counts as the capital (The Two Capitals).
- **The elite army (4):** few units, each worth more. They fight better and cost more (The Workshops of Syracuse), heal fully at home (The Deputatoi), shoot twice (The Volley Fire), and grow with each upgrade (The Nassau Reforms). The themes pass found the elite army thin at Tier IV; The Nassau Reforms is a Tier IV home for it.

**The cost shows.** Fifteen of the sixteen carry a drawback, and most drawbacks are the deck's own cost: fewer settlers, dearer or slower units, slower ordinary buildings, a penalty while behind, or small towns left weak.

**What the Doctrines leave to the Orders.** The Orders already pay for the moment of research, the charters drafted, the charter price, the lead in strength and production, wonders while ahead, and Academy yields. No Doctrine here does one of those jobs (section 7 checks each one).

**What a pair seat gets.** Adopting a government offers Doctrines of its tier: one from each of the seat's two decks, then a third from either (`drawDoctrineOffer`). A deck with no Doctrine left in the tier gives its place to the rest of the bag. So with 4 a tier, a Scientific seat sees one or two Scientific Doctrines at each adoption, beside one or two of its partner's.

| Partner | Its Doctrines today | What the pair gets |
|---|---|---|
| Dominion | 15 live | The military edge. The Workshops of Syracuse and The Nassau Reforms make Dominion's few units better. The Deputatoi suits Dominion's fortified defenders, and its drawback (no healing abroad) bites a conqueror. The Directorate of Arms and The Marian Reforms both waive upkeep: a seat holding both keeps a free army even when behind. |
| Expansionist | none built; 32 proposed, 24 after your comments of 2026-10-23 (`docs/plans/expansionist-builds.md`) | The engineers. Expansionist's wide Doctrines pull against The Removal to Xianyang and The Two Capitals, so a seat must choose tall or wide. The Peripatetic School's new shape (a great person kept after its work) was shared with the proposed The Cathedral Lodges until your comments of 2026-10-23 rewrote that Doctrine. |
| Commerce | none built; 16 proposed (`docs/plans/commerce-doctrines.md`) | The patrons. Commerce's gold buys the schools The Universitas doubles. Its proposed The Grand Canal feeds a great city with other towns' food, which suits The Two Capitals. |
| Devotion | being written now | Scholars of the faith. The Deputatoi and the Bimaristan suit a realm that fights at home. |
| Magisterial | being written now | The academy. The Platonic Academy turns a Magisterial artist's landmark into an Academy, so a pair seat must choose between the two kinds of work. That is a real choice, by design. |

## 3. Tier I (with the tier-4 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Pythagorean Brotherhood** | engine | Completing a technology before any other empire gives your towns +25% production for ten turns. It does not stack. Technologies that an empire you have met already knows cost you 25% more. | Following a rival costs a quarter more research. | Existing. `windfallRider` on `tech` with `first: 'techWorld'` and a `timed` grant (10 turns, `renews`) of `percentYields` production +25: The Prize Essay's first and The Scourge of God's timed grant. `rulePercent` `gapTechCost` +25 (The Translation Movement's rule, as a surcharge). |
| **The Removal to Xianyang** | great cities | Your towns grow 30% faster. Settlers cost twice as much. | Settlers cost double. | Existing. `rulePercent` `growthSurplus` +30; `rulePercent` `settlerCost` +100. |
| **The Workshops of Syracuse** | elite army | Your military units fight at +15% strength. They cost 50% more to build and to buy. | Units cost half again. | Existing. `unitStat` `combatPercent` 15, `class: { category: 'military' }`; `rulePercent` `unitCost` +50 with the same class (The Servian Reforms' rule, reversed). |
| **The Peripatetic School** | learned land | A great scholar may found two Academies before it is used up. Each great scholar you gain counts as one and a half great people toward the price of your next one. | Every later great person comes slower. | **New shape:** a great person kept after its first work, and used up by its second. Existing: `rulePercent` `scholarLadderStep` +50 (The Royal Readers' rule, reversed). |

**The Pythagorean Brotherhood** (engine)
- **Why:** the deck is strongest in windows. This makes the window a rule. Each world first opens ten turns of faster building, so a racer works in bursts.
- **In play:** the seat picks research it can finish first, not research it needs most. It stops following, because a technology a met empire knows costs a quarter more. Charter technologies never count as world firsts (`settleResearch`), so the race is on the ordinary tree.
- **Size:** a racer takes a first every five to eight turns in age 2, so the window is open most turns. That is about +10 production a turn at turn 50 and +25 at turn 100. The surcharge is real: a seat that falls behind pays it on most of its research.
- **Model:** the brotherhood of Pythagoras at Croton (about 530 BC). It kept its discoveries inside the school, ran the city, and learned nothing from outsiders.

**The Removal to Xianyang** (great cities)
- **Why:** the themes say the Scientific player plays tall (the user, 2026-10-20: *"the scientific player should be trying to play tall"*). This makes it a commitment at the first government.
- **In play:** four or five towns grow fast. Each new settler costs twice as much, so a sixth town is a real decision. Purchases follow the price, so gold cannot dodge it.
- **Size:** +30% growth in four or five towns adds one or two citizens a town by turn 80, about +20 to +30 yield a turn. A settler goes from 28 hammers to 56, before the settler ladder.
- **Model:** Qin Shi Huang moved 120,000 wealthy households to the capital, Xianyang (221 BC). The capital grew, and the frontier was settled slowly.

**The Workshops of Syracuse** (elite army)
- **Why:** the user's picture of the deck: *"when fielding an army, focus around having strong, advanced elite units instead of many units."* This says it in one rule.
- **In play:** every unit is stronger and dearer, so the seat fields fewer of them. It works with every source of units, the line traits included. It stacks with Dominion's cards in a pair seat.
- **Size:** units of age 2 have 30 to 35 strength, so +15% is about +5, a strong combat line at band 1. A Swordsman goes from 46 hammers to 69.
- **Model:** Dionysius I of Syracuse (399 BC) paid craftsmen from all Greece high wages to make new weapons. They built the first catapults and the first quinqueremes.

**The Peripatetic School** (learned land)
- **Why:** Academies are the learned land's quantity, and only great scholars make them. This doubles each scholar's land.
- **In play:** a scholar founds an Academy, walks on, and founds a second, or spends its second act on another of its acts. Every Academy card pays on twice as many Academies. The price: great scholars climb the great-person ladder half again as fast, so every later great person, of any family, comes slower.
- **Size:** a Scientific seat gains four to six scholars a game, so two to four more Academies after the slower ladder. Each pays +3 science, and The Old Academy's +3 food and +3 production when it is twenty turns old.
- **Model:** Aristotle taught at Assos, Mytilene and Mieza before he founded the Lyceum at Athens (335 BC). His school taught while walking, which gave it its name.

## 4. Tier II (with the tier-10 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Jixian Academy** | engine | Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture. | Towns' culture falls by a quarter. | Existing. `windfallRider` on `tech`, grant culture `amount: 0.2`, `fromOccasion: 'techCost'` (The Scholars' Fame's measure); `percentYields` culture −25. |
| **The Academy of Gondishapur** | institutions | Each empire building you hold makes technologies 3% cheaper for you, at most 24%. Your towns build other buildings 15% more slowly. | Ordinary buildings come slower. | **New shape:** a price line on every technology, read from a count (`explainTechCost` has a line only for charter and gap technologies). Existing: `productionBonus` building, `empireBuilding: false`, −15 (Private Patronage's form). |
| **The Deputatoi** | elite army | Your units heal fully when they rest in your land. They do not heal outside it. | No healing abroad. | Existing. `unitStat` `heal` 100, `where: 'ownTerritory'` (the Bimaristan's form); `rule` `noHealAbroad`. |
| **The Pandidakterion** | learned land | Your Academies yield as if worked, and need no citizen. | None. | **Near existing:** your Academies join the extra worked hexes The Limitanei adds (Dominion D13: chosen after the citizens' hexes, and eating no food). |

**The Jixian Academy** (engine)
- **Why:** culture is the draft currency, and charters are drafted. This ties the draft to research, so a fast researcher sees more cards and more charters.
- **In play:** research becomes the seat's culture engine, and its culture buildings matter less. A slow researcher loses by it, so it is a racer's choice. A charter technology counts at its full price, premium included.
- **Size:** an age 3 technology costs 360 to 1,150, so it grants 72 to 230 culture. At a technology every four turns that is 18 to 58 culture a turn, against a quarter of about 80 culture a turn (−20). It is a gain only for a seat that researches fast.
- **Model:** the Tang Academy of Assembled Worthies (Jixian Yuan, 725) collected, copied and edited the empire's books, and its scholars drafted the court's documents.

**The Academy of Gondishapur** (institutions)
- **Why:** the institutions pay the economy (themes pass). This makes each great house pay the engine too, so the two meet.
- **In play:** every empire building, the charter houses included, is now also research. The seat raises houses before ordinary buildings, because ordinary buildings come slower.
- **Size:** four houses at turn 100 make research 12% cheaper, about +14% research speed. Eight houses reach the cap of 24%. The cap is there because science is the strongest yield (`docs/decks/deck-design.md`, the balance note).
- **Model:** the Sasanian academy and hospital at Gondishapur (6th century) took in the scholars Justinian expelled from Athens, and became the learned centre of Persia.

**The Deputatoi** (elite army)
- **Why:** few units must not die. At home they now never stay wounded.
- **In play:** a defending line that rests is whole again the next turn, so an attacker must kill a unit in one turn. Abroad the army does not heal at all, so the seat fights at home and strikes out only briefly. Healing needs a rested unit (`healUnits`), so a unit that attacks does not heal that turn.
- **Size:** measured in wars, not yield. A rested unit heals 10 a turn by default; this heals it fully in its own land.
- **Model:** the Byzantine *deputatoi* (the Strategikon of Maurice, about 600) carried the wounded from the field. They were paid for each soldier they saved.

**The Pandidakterion** (learned land)
- **Why:** an Academy costs a citizen to work. This frees that citizen, so the learned land costs the great city nothing.
- **In play:** every Academy pays all the time, and so does every card that pays on an Academy hex. The town's citizens work farms and mines instead. It is the one Scientific Doctrine with no drawback: it is a supply Doctrine for the learned land.
- **Size:** each Academy frees a citizen worth 3 to 5 yield. Four Academies are about +15 to +20 a turn, more with The Old Academy.
- **Model:** the state school of Constantinople (425), whose chairs were paid by the emperor, not by the students.

## 5. Tier III (with the tier-18 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Directorate of Arms** | engine (the lead); bridge to the elite army | While no empire you have met knows more technologies than you, your military units cost no upkeep. While one does, their upkeep is doubled. | Upkeep doubles when you fall behind. | **New shape, small:** an `EmpireCondition` "no empire you have met knows more technologies" and its opposite (feature B's `knowsMoreTechs`, asked of every met empire). Existing inside it: `upkeepRebate` `free`, class military; `rulePercent` `unitUpkeep` +100. |
| **The Universitas** | great cities | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. | Small towns' schools are halved. | Existing. `buildingYieldPercent` category science +100, scope `populationAtLeast` 12; −50, scope `populationAtMost` 11. |
| **The Volley Fire** | elite army | Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength. | Melee units are weaker. | Existing. `rule` `secondAttack`, `class: { modelClass: 'ranged' }` (The Varangian Guard's rule, narrowed by class); `unitStat` `combatPercent` −10, `class: { modelClass: 'melee' }`. |
| **The Külliye** | institutions | The effects your empire buildings give their own town also reach your towns within three hexes of it. Your towns build empire buildings 25% more slowly. | Houses come slower. | **New shape:** for an empire building's own effects, the `hasBuilding` scope also admits your towns within three hexes of the town that holds it. Existing: `productionBonus` building, `empireBuilding: true`, −25. |

**The Directorate of Arms** (engine)
- **Why:** the lead is the engine's quantity in war. This turns it into the army's pay: a seat ahead keeps a free army, and a seat behind pays twice.
- **In play:** the seat watches the one number it already races for. Falling behind costs gold every turn, so the seat races harder or shrinks its army. Only met empires count (feature B), so nothing hidden shows.
- **Size:** 10 to 15 units cost about 20 to 40 gold a turn in age 3 and 4. That is saved while ahead and doubled while behind.
- **Model:** the Song Directorate of Weapons (1073) ran the state's arsenals and their new arms, so a small professional army stayed ahead of its neighbours.

**The Universitas** (great cities)
- **Why:** the deck grows a few great cities to feed its schools. This pays the great ones and starves the rest.
- **In play:** the seat grows two or three towns past twelve and stops investing in its small towns' schools. The per-citizen science of the Library and the University is part of a building's yields, so it doubles too (a reading, to confirm in a triage).
- **Size:** a town of fifteen with a Library and a University makes about 20 science from them, so +20. Two such towns are +40. A small town loses 2 or 3.
- **Model:** the universities of Bologna (1088) and Paris (about 1200) were guilds of masters and students that formed only in the largest towns.

**The Volley Fire** (elite army)
- **Why:** a few advanced units must do the work of many. The archer line now shoots twice.
- **In play:** the archer line becomes the army's core, and the melee line becomes a screen. With the Mechanists' Repeating Crossbow trait, an archer shoots, steps back and shoots again. Siege units are not in the line, so the walls still need engines.
- **Size:** measured in wars. It doubles the archer line's ranged damage. The melee line loses about 5 strength at 45 to 50.
- **Model:** Tang and Song crossbowmen shot in ranks that turned in rotation, so the line never stopped shooting (Li Quan described it in 759).

**The Külliye** (institutions)
- **Why:** the institutions' capstone. A great house now serves its district, not one town.
- **In play:** the seat raises its houses where its towns stand close, and plants towns near its houses. The Forum's +10% science and culture, the Bimaristan's +25% food, the Tophane's +4 strength for units gained, and the Mouseion's culture now reach every town within three hexes. A few close towns suit it; a wide realm gains little.
- **Size:** with four houses in a tight realm, two or three towns gain each house's effects: a band 3 headline.
- **Model:** the Ottoman *külliye* (from the 1330s at Bursa): a mosque with its school, hospital, kitchen and library, built to serve the whole district around it.

## 6. Tier IV (with the tier-26 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Court of Rudolf II** | engine | Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more. | The rest of the last age is dearer. | **New shape** (shared with The Academy of Gondishapur): the technology price line, narrowed to one technology's chain of prerequisites and to an age. |
| **The Platonic Academy** | learned land | Your great people of every family found an Academy as their work, in place of their own. | No citadels, customs houses, landmarks or manufactories. | **New shape:** the work a great person founds, replaced by the Academy for every family. |
| **The Nassau Reforms** | elite army | Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly. | Units come slower. | **New shape, small:** a strength stamp at the upgrade moment, beside `upgradeHeals` in `upgradeUnits`. Existing: `productionBonus` unit, class military, −25, `stage: 'empire'` (The Marian Reforms' form). |
| **The Two Capitals** | great cities | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. | Other towns grow slower. | **New shape:** the `capital` scope and the capital counts admit a second town for the holder's cards, chosen again each turn. Existing: `rulePercent` `growthSurplus` −25, with a scope that admits neither capital (the same new reading). |

**The Court of Rudolf II** (engine)
- **Why:** the Magnum Opus is the deck's way to win (themes pass, section 2). This is the beeline: the seat races down the one chain that opens it.
- **In play:** the seat researches toward Alchemy and lets the rest of the last age wait. Its army and its late buildings lag, because those technologies cost a quarter more. That opens a window for a rival to strike the Opus town. A Doctrine names a technology, not a card, so principle 8 holds.
- **Size:** Alchemy costs 8,000 and needs five fourth-age technologies, each with its own chain. A fifth off that chain is several thousand science, about ten to fifteen turns of age 4 research.
- **Model:** the court of the emperor Rudolf II at Prague (1576 to 1612) paid alchemists, astronomers and instrument makers to pursue the great work.

**The Platonic Academy** (learned land)
- **Why:** the learned land's capstone. Every great person, of whatever family, becomes a school.
- **In play:** generals, merchants, artists and engineers each found an Academy, which pays science and every Academy card. They no longer found their own works, so a partner deck that reads citadels, customs houses or landmarks loses them. Their acts do not change.
- **Size:** a seat with a partner deck gains three to six other great people late in the game. Each is now an Academy worth +3 science, plus the Academy cards (The Old Academy's +6 food and +6 production at forty turns).
- **Model:** Marsilio Ficino's academy at Careggi (1462), paid for by Cosimo de' Medici, where merchants, artists and scholars met as one company of learning.

**The Nassau Reforms** (elite army)
- **Why:** the elite army rests on the upgrade rule (themes pass, section 2). This makes a unit that lives through the ages better than a new one.
- **In play:** the seat keeps its old units alive, because each upgrade makes them stronger for good. New units come slowly, so a lost veteran is hard to replace. It is not a rank: Dominion owns ranks, and this is a stamp, as The Palace Schools' is.
- **Size:** a unit raised in age 1 and kept to age 4 upgrades three times, so +6, about 10% of an age 4 unit.
- **Model:** Maurice of Nassau (1590s) standardised the Dutch army's weapons and calibres, so each new weapon refitted every company at once.

**The Two Capitals** (great cities)
- **Why:** the great cities' late capstone. A tall realm has two great cities, and the second now counts.
- **In play:** every card that pays the capital pays a second town too: The Sum of Knowledge, The Republic of Letters, The Charter Rolls and The Round City in Scientific, and the partner's capital cards. "For your cards" means the Orders' and the Doctrines' effects only: the palace, the authority ladder and the rules do not change. The other towns grow slowly, so the realm is two great cities and their farms.
- **Size:** The Sum of Knowledge alone pays +1 production and +1 culture for each technology known, so about +45 and +45 more at 45 technologies.
- **Model:** the Ming kept two capitals, Beijing and Nanjing, each with its own set of ministries (from 1421).

## 7. The checks

- **Four a tier, sixteen in all.** Each tier has four Doctrines.
- **Most change a rule or the way the seat plays.** Seven bend a rule outright: firsts open a window, a scholar founds twice, Academies need no citizen, house effects reach neighbours, every great person founds an Academy, upgrades stamp strength, and a second town counts as the capital. The rest change a price or a rate with a cost that steers the seat.
- **Most carry a drawback:** fifteen of sixteen. The Pandidakterion has none. The Platonic Academy's drawback is the works it replaces.
- **Each theme and the engine get at least two:** engine 4, learned land 3, institutions 2, great cities 3, elite army 4 (section 8).
- **No Doctrine repeats an Order's job:**
  - The Pythagorean Brotherhood reads world firsts, as The Prize Essay does, but it pays a production window, not a lump.
  - The Jixian Academy reads the technology moment, as The Scholars' Fame does, but it pays culture, not renown.
  - The Academy of Gondishapur and The Court of Rudolf II change technology prices, as The Commonplace Book, The Translation Movement and The Patent Office do, but they read empire buildings and the Opus chain, which no Order reads for a price.
  - The Universitas doubles a class of building in big towns, as The Queen of Cities doubles food and production there. It pays science and halves the small towns, which no Order does.
  - The Deputatoi heals in your land, as the Bimaristan does, but the Bimaristan is a building, not an Order.
  - The Nassau Reforms reads the upgrade moment, as The Field Refits does, but it pays strength, not a heal.
- **No Doctrine names a card.** Two name game objects: Alchemy (a technology) and the archer line (Archer to Crossbowman, as the charter texts write it).
- **The splits are followed.** No Doctrine pays happiness or authority (civic life is not Scientific's). The Nassau Reforms is a stamp, not a rank (ranks are Dominion's). No Doctrine pays for holding a wonder (Magisterial's) or makes a doubled great-person effect (Magisterial's).
- **No new player input.** Every Doctrine is automatic, or uses research, building, a great person's work or a unit's attack.
- **Science stays a minority.** Four Doctrines touch research or science (The Pythagorean Brotherhood's surcharge, The Academy of Gondishapur, The Universitas, The Court of Rudolf II). The rest pay production, culture, food, upkeep, strength, healing or Academies.
- **Every era fits its tier:** Tier I classical (530 to 221 BC), Tier II late antique and early medieval (425 to 725), Tier III medieval (759 to the 1330s), Tier IV early modern (1421 to the 1590s).
- **Where it falls short:**
  - Institutions get only two Doctrines. The Orders already cover production toward the houses and their yields, and few other house rules are free.
  - Nine Doctrines need a new or near shape (section 9). Seven are data only.
  - The two research discounts sit against the user's note that science costs should scale harder (question 1).

## 8. Counts

| Tier | Engine | Learned land | Institutions | Great cities | Elite army | All |
|---|---|---|---|---|---|---|
| I | 1 | 1 | 0 | 1 | 1 | 4 |
| II | 1 | 1 | 1 | 0 | 1 | 4 |
| III | 1 | 0 | 1 | 1 | 1 | 4 |
| IV | 1 | 1 | 0 | 1 | 1 | 4 |
| **All** | **4** | **3** | **2** | **3** | **4** | **16** |

| | Data only (existing shapes) | Near existing | New shape |
|---|---|---|---|
| Doctrines | 7: The Pythagorean Brotherhood, The Removal to Xianyang, The Workshops of Syracuse, The Jixian Academy, The Deputatoi, The Universitas, The Volley Fire | 1: The Pandidakterion | 8: The Peripatetic School, The Academy of Gondishapur, The Directorate of Arms, The Külliye, The Court of Rudolf II, The Platonic Academy, The Nassau Reforms, The Two Capitals |

## 9. The new shapes, grouped

Checked against the code at commit `48f37cf8`. Each family is read by more than one Doctrine where possible.

1. **A price line on every technology** (The Academy of Gondishapur, The Court of Rudolf II). `explainTechCost` (`src/sim/tech.ts`) has the column, the charter premium, and one card line, `charterTechCost` for a charter technology or `gapTechCost` for one in the gap. Missing: a `CardRule` member for any technology, read from a count (`count`, `per`, `max`) or narrowed to one technology's chain of prerequisites and an age. It would be one more labelled line of the same list.
2. **Great people and their works:**
   - a great person kept after its first work and used up by its second (The Peripatetic School). Expansionist's proposed The Cathedral Lodges needed the same shape for engineers, but your comments of 2026-10-23 rewrote it to double Manufactories, so the shape serves this Doctrine alone;
   - the work every family founds, replaced by the Academy (The Platonic Academy).
3. **Academies worked with no citizen** (The Pandidakterion). The Limitanei (Dominion batch D13) already adds worked hexes after the citizens' hexes, eating no food. Missing: a rule that adds the town's Academy hexes to those extra hexes.
4. **Which towns a scope admits:**
   - a building's own-town effects reach your towns within three hexes of it (The Külliye);
   - a second town counted as the capital for the holder's cards, and its negation for "neither capital" (The Two Capitals).
5. **A feature B condition** (The Directorate of Arms). `rivals.ts` has `knowsMoreTechs` for one empire against another, and the combat conditions `vsMoreTechs` and `vsFewerTechs`. Missing: an `EmpireCondition` asked of every met empire, and its opposite.
6. **The upgrade moment** (The Nassau Reforms). `upgradeUnits` already reads `upgradeHeals` after each upgrade. Missing: a strength stamp written at the same place.

**For less engine work, cut** The Pandidakterion, then The Nassau Reforms, then The Directorate of Arms. Each is a smaller idea than the shapes it needs.

## 10. Facts the cells rely on

Checked at commit `48f37cf8`.

- **A Doctrine row** lives in the deck file's `doctrines` map with `decks`, `band` (1 to 4), `text` and `effects` (`data/decks/dominion.json`). Its effects are live from the turn it is taken (`liveEffects`' second source).
- **The Age of Reason doubles Orders only.** `techCountsTwice` reaches Orders' technology riders; a Doctrine's riders are read once (`MetaRuleId` docblock).
- **Charter technologies are never world firsts** (`settleResearch`: `!isCharterTech(...) && markFirst(...)`).
- **Technology prices** (`explainTechCost`): the column, then the charter premium, then the cards. `gapTechCost` is asked only for an ordinary technology a met empire knows; a positive percent is a surcharge.
- **Healing** (`healUnits`, `src/sim/turn.ts`): only a rested unit heals, 10 a turn (`healing.perTurnIfRested`), plus `unitStat` `heal` lines (with `where`), and `noHealAbroad` refuses it outside your borders.
- **Strength percentages:** `unitStat` `combatPercent` is a percentage on a unit's own strength (`cardCombatPercent`).
- **A second attack** (`secondAttack`) is read through `cardBehaviorRuleFor`, which asks the row's `class` of the unit's type. The archer line is `modelClass: 'ranged'`; siege and mounted archers are other classes.
- **Military units** are `category: 'military'`; ships are `category: 'naval'` and do not count.
- **Building yields:** `buildingYieldPercent` takes a building `category` and a town `scope`.
- **Empire buildings** carry `oncePerEmpire` and `empireBuilding`; their effects are scoped `hasBuilding` to their own row (the Forum, the Bimaristan, the Tophane, the Mouseion).
- **Feature B** (`src/sim/rivals.ts`): `techLead`, `techGap`, `knowsFewerTechs`, `knowsMoreTechs`, met empires only. No `EmpireCondition` reads them.
- **Alchemy** costs 8,000 and needs five fourth-age technologies (`data/techs.json`). Fifteen ordinary technologies are in the fourth age.
- **The bots** price every card by its effects (`src/ai/value.ts`, an exhaustive switch). Each new shape needs a price there before bots take the Doctrine.

## 11. Questions for the user

1. **The two research discounts.** The Academy of Gondishapur (up to 24% off every technology) and The Court of Rudolf II (20% off the Opus chain) sit against your notes that science is the strongest yield and that science costs should scale harder. *Recommended: keep both, with Gondishapur capped at 24%.* Each has a cost the seat feels (slower ordinary buildings; a dearer army late).
2. **The four rule changes that touch core rules:** The Platonic Academy (every great person founds an Academy), The Two Capitals (a second capital for your cards), The Külliye (house effects reach towns within three hexes) and The Pandidakterion (Academies need no citizen). *Recommended: yes to all four.* Each is the rule-breaker of its theme.
3. **The Court of Rudolf II and the pace of the end.** It brings the Magnum Opus closer by ten to fifteen turns for a seat that commits. *Recommended: yes.* The army lags behind while it does, which gives rivals a window to stop it.
4. **The Deputatoi heals fully.** A defending line is whole every turn it rests. *Recommended: yes,* because the deck defends a few towns and the drawback stops it healing abroad. The smaller version heals 30 more a turn in your land.
5. **The Volley Fire gives the archer line two attacks a turn.** *Recommended: yes.* It is the existing rule of The Varangian Guard, narrowed to one line. Siege stays at one attack.
6. **The Universitas doubles the per-citizen science of the Library and the University** (a reading of "twice their yields"). *Recommended: yes,* because per-citizen science is most of what those buildings make.
7. **The Platonic Academy against a partner deck.** It removes citadels, customs houses, landmarks and manufactories from a Scientific seat that takes it. *Recommended: keep it,* because the choice is the point. If you want the partner's works safe, it can read "Your great scholars and engineers" instead.
8. **What comes next.** *Recommended:* after your pass, the Doctrines go onto the Scientific sheet's four Doctrine tables, then a triage sorts them into data-only and new-shape batches, as Dominion's did.
