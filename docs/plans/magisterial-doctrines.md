# Magisterial Doctrines (proposal)

**Status:** proposal, 2026-10-25. Nothing is built. No code, data or deck sheet changed. This is stage 6 of the deck pass (the card-design skill, "Doctrines") for Magisterial. The build plan (`docs/plans/magisterial-themes-triage.md`, written at the same time) does not include them; they join it after your pass.

The user's request, 2026-10-25, verbatim: *"Please do a pass on the doctrines for the remaining decks"*. Devotion and Magisterial had no Doctrines. Devotion's were written at the same time, in `docs/plans/devotion-doctrines.md`.

## 1. How to read this

- **One section a tier,** Tiers I to IV. Each starts with a table: Doctrine | Theme | Text | Drawback | Shape. Notes on each Doctrine follow the table: why it is here, what it changes in play, its size against the power bar, and its historical model.
- **Theme:** the engine (culture and the draft), or one of the four themes of `docs/plans/magisterial-themes.md`: the council, the patrons, the landscape and the monuments. Each tier has at most one Doctrine for each of these five homes (themes pass, section 8: *"one for each theme at most of Tiers I to IV"*).
- **Shape:**
  - *existing:* the effect kinds and fields that already say it, with the row or proposal that uses the same form;
  - *near existing:* one small field or member on a shape that exists, or a shape the Magisterial build already makes for an Order;
  - *new shape:* what is missing. Section 9 groups the new shapes.
- **Numbers are first guesses.** The effort went into what each Doctrine does.
- **Plain text, no card names.** No Doctrine names an Order or another Doctrine (principle 8). A Doctrine may name a game object: the Magnum Opus, a wonder, a great-person work, a culture building, a chair or a card type.
- **The card words are the Magisterial pass's:**
  - "seated" means in a chair. "Orders you hold" means the collection, seated or not;
  - "spending a great person" means their act or their work. The Magisterial build adds that moment for The Last Commission (themes pass, section 12);
  - a "Civic card" is a card of the Civic type. An unsorted card counts as the type of the chair it sits in (`countedTypeOf`).

**When each tier is offered, and the bar it is sized against** (`.claude/skills/card-design/references/power-bar.md`; the turns are the bot model):

| Doctrine tier | Offered with | First offer, about | The age then | A regular card pays | A headline card pays |
|---|---|---|---|---|---|
| I | tier-4 governments | turn 32 | late age 1, age 2 | 15 to 25 a turn | 40 to 50 |
| II | tier-10 governments | turn 72 | late age 2, age 3 | 35 to 60 | 100 or more |
| III | tier-18 governments | turn 133 | late age 3, age 4 | 60 to 120 | 200 or more |
| IV | tier-26 governments | turn 161 | age 4 | 60 to 120 | 200 or more |

A Doctrine is held all game and takes no chair. Your comments on the Expansionist and Scientific Doctrines (section 2) set the size here: a Doctrine with no drawback aims at the regular card of its tier or a little above, and one with a drawback aims near the headline. Magisterial makes the most culture, so it usually reaches each government, and so each offer, first.

## 2. How the Doctrines fit the deck

**The deck in one line** (`docs/decks/deck-design.md`, "Direction, 2026-10-20"): Magisterial is paid for governance (drafts, governments, great people), is strongest when its combinations come together, and gives up depth: it depends on what the draft offers. Your picture: *"this focus is on being adaptable to the draft, i.e. being the best magister. historically, this is the faction that gains from strong governance and having the right social institutions to meet the challenges of the time"*.

**Your taste in Doctrines, and what this file does with it.** You commented on 22 of the 32 Expansionist Doctrines (`docs/plans/expansionist-builds.md`, "Your comments, 2026-10-23") and revised three Scientific ones (`docs/plans/scientific-doctrines.md`):
- Most revisions removed the drawback: *"remove the malice"*, *"no malice"*. So 14 of the 16 here carry none. The two that keep one (The Hospitium, Scutage) keep it because the choice is the point.
- You cut Doctrines that do not matter in their age: *"probably don't need to think about settling new cities in age 4"*. So each Doctrine here pays in the tier it is offered and still pays in age 4. None pays in authority or in new towns late.
- You asked for a Doctrine to be stronger (*"This seems worse than crop rotation, needs to be stronger."*) and rewrote several as plain rules on one game object. So each text here is one rule on one thing the deck already has: the government, the Order hand, culture buildings, wonders, great people, works and chairs.
- On Scientific you swapped +15% strength for a flat +5 and replaced a fiddly great-person rule with plain yields. So the one combat Doctrine here is a flat line, and the great-person Doctrines pay plain yields and renown.

**What a Magisterial Doctrine does.** Each one turns a part of the deck's identity into a rule the seat keeps for the whole game:
- **The council (4):** the government counts for more. Its ability counts twice (The Arthashastra), its Civic chairs do research (The Magnaura), it has one more Wildcard chair (The Council of Ten), and at the last tier the other two governments of the tier lend their abilities as well (The Union of Lublin).
- **The engine (3):** the draft and the collection. The third card of each hand comes from another deck (The Hospitium), rare cards come twice as often (The Jinshi), and cards off the chairs pay half their yields (Scutage).
- **The patrons (3):** culture buildings pay renown (The Choregia), each great person gained raises every town (The Barmakids), and each person spent pays toward the next (The Kitabkhana).
- **The landscape (3):** great people lay works beyond the borders (The Peregrini), towns that work a work grow faster (The Bourgs), and works speed the Magnum Opus (The Gobelins).
- **The monuments (3):** each wonder held gives production in every town (The Periclean Works) and strength to every unit (The Carroccio), and each wonder finished calls a great person (The Escorial).

**The rulings this file keeps:**
- **Magisterial owns the government system** (ruling 4 of 2026-10-20). Four Doctrines bend it, and each bends it for its holder only. None changes the chair mixes, the abilities, when governments come, the Doctrine offer or the seal for any other seat. So none raises the question section 8 of the themes pass kept for you. Question 1 asks you to confirm that reading.
- **Feature G (a government adopted is a moment) stays with the Orders.** `adoptGovernmentAt` announces the moment before it draws the Doctrine offer, so a Doctrine never sees the adoption that offers it. A Tier I Doctrine on the moment would pay three times at most and wait about 40 turns for its first payment; a Tier IV one would never pay. The Arthashastra makes each new government count for more instead. The Sed Festival keeps the moment.
- **Rerolls are the Devotion pair's** (themes pass, question 6). No Doctrine pays for, frees or prices a reroll.
- **The splits are followed.** Wonders: the Doctrines pay for holding them and speed the Magnum Opus; none opens a wonder early or adds production toward wonders. Great-person works: towns with a work, and land claimed through works; none pays science on works or reads an Academy. Flexibility: Magisterial in which cards it holds (The Hospitium, The Jinshi, Scutage).
- **No new player input.** Every Doctrine is automatic, or works through drafting, seating, adopting, building, or a great person's act or work.

**The cost shows.** Magisterial gives up depth. The Hospitium gives up one card of the seat's own pool in every hand for a card from the wider world, and Scutage gives up a Wildcard chair for a collection that pays. The Magnaura binds the council to its Civic chairs. The Arthashastra and The Union of Lublin make a poor choice of government cost twice as much. The monuments and landscape Doctrines pay only for what the seat has raised: wonders, works and great people.

**A path through the tiers for each theme.** A seat that leans on one theme finds its Doctrine at most adoptions:

| Home | Tier I | Tier II | Tier III | Tier IV |
|---|---|---|---|---|
| council | The Arthashastra | The Magnaura | The Council of Ten | The Union of Lublin |
| engine | The Hospitium | The Jinshi | Scutage | |
| patrons | The Choregia | The Barmakids | | The Kitabkhana |
| landscape | | The Peregrini | The Bourgs | The Gobelins |
| monuments | The Periclean Works | | The Carroccio | The Escorial |

- The landscape has no Tier I Doctrine. Works come with great people, and the first comes at about turn 30 to 60, so a work Doctrine at turn 32 would wait.
- The monuments have no Tier II Doctrine. The Orders hold the wonder's moments and multipliers there (The Seven Sights, The Golden Age, The Envious Eye).
- The patrons have no Tier III Doctrine. The Orders hold its capstone and its percentages there (The Universal Genius, The Roll of Masters, The Living Canon).
- The engine has no Tier IV Doctrine. The Orders hold the collection's finishers there (The Universal Library, The Polymath's Study).

**Doctrines that combine.** Two Doctrines that reward one commitment together are intended (your ruling for Dominion, 2026-10-16: *"#3 is intentional"*):
- The Council of Ten and Scutage: one adds a Wildcard chair and the other takes one away, so a seat holding both keeps its council and its collection pays.
- The Arthashastra and The Union of Lublin: at tier 26 the adopted government counts twice and the other two of its tier once each.
- The Hospitium and The Jinshi: the third card comes from another deck, and rares come twice as often in every position.
- The Choregia and The Kitabkhana: renown from culture buildings, then from every person spent.
- The Periclean Works, The Carroccio and The Escorial all read wonders. They pay production, strength and great people.
- The Peregrini, The Bourgs and The Gobelins all read works. They pay land, growth and the Opus.

**What the Doctrines leave to the Orders.** The Orders already pay for each seated card (The Prytaneion, The Nomarchs, The Boule, the shared The Art Dealers), double one chair (The Grand Vizier), win chairs through goals (The Roll of the Senate, The Wonder of the Age), let any card fit any chair (The Mixed Constitution), widen the hand (Officials by Merit, The Hall of Wonders), pay for passing and drafting (The Unwritten Chapter, The Second Sitting, The Court Painter, The Accessions Register), pay for the collection (The Encyclopedia, The Universal Library, The Polymath's Study), double great people's acts and legacies (Letters Patent, The Universal Genius, The Immortals), speed wonders (The Cornerstone, The Guild of Masons, Magnificence), pay culture, science, happiness and renown for wonders held (The Seven Sights, The Keepers of Wonders, The Workshop at Olympia), and pay works side by side (The Quarter of Masters, The Processional Way). No Doctrine here does one of those jobs (section 7 checks each one).

**What a pair seat gets.** Adopting a government offers Doctrines of its tier: one from each of the seat's two decks, then a third from either (`drawDoctrineOffer`). A deck with no Doctrine left in the tier gives its place to the rest of the bag. With four a tier, a Magisterial seat sees one or two Magisterial Doctrines at each adoption, beside one or two of its partner's.

| Partner | Its Doctrines today | What the pair gets |
|---|---|---|
| Dominion | 15 live | The triumph (Emperor Taizong). The Arthashastra doubles the martial governments' +4 strength and Imperium's production for each Military card. The Carroccio's strength sums with Combined Arms and The Fortress Empire. The Council of Ten's Wildcard chair seats a Dominion commission. The Strategoi's +30% renown sums with The Choregia's renown. Under The Union of Lublin, a conqueror keeps the Sultanate's movement and captured-town science whichever tier-26 government it adopts. |
| Expansionist | none built; 24 after your comments of 2026-10-23 (`docs/plans/expansionist-builds.md`) | Shaping territory. The Peregrini uses Expansionist's own shape for works beyond the borders (The Garden Frontier's tended works, batch E4). The Bourgs and Synoecism both grow towns faster, in different towns. The Cathedral Lodges doubles Manufactories, which are great-person works, so The Gobelins counts them. The Builder Kings (+35% production toward wonders, no buying) is still an open question on the Expansionist sheet; no Magisterial Doctrine adds production toward wonders (question 6). |
| Commerce | none built; 16 proposed (`docs/plans/commerce-doctrines.md`) | The art market (Zheng He). The Arthashastra doubles the Merchant League's route pay and its extra route. The Opera del Duomo pours gold into the Opus and The Gobelins speeds it with works, so the pair raises it from two sides. A customs house is a work, so The Peregrini can lay one on a luxury beyond the borders, which opens the luxury to the seat. |
| Devotion | none built; 16 proposed (`docs/plans/devotion-doctrines.md`) | The cathedral (Akhenaten, Hildegard of Bingen). The Arthashastra doubles the faith of the religious governments (the Priest-King, the Theocracy, Divine Mandate, the Curia). The Magnaura counts Devotion's Civic cards, which are most of its faith cards. Holy sites are great-person works for The Bourgs and The Gobelins. The Serapeum reads the gods twice by the same kind of rule as The Arthashastra (section 9). The Saint Peter's Indulgence and The Gobelins both speed the Opus. The Imarets and The Bourgs grow towns 25% faster; a devout town that works a work grows 50% faster. |
| Scientific | none built; 16 proposed (`docs/plans/scientific-doctrines.md`) | The academy (Hypatia). The Platonic Academy turns every great person's work into an Academy, and Academies are still works for The Peregrini, The Bourgs and The Gobelins. The Peripatetic School's renown from science buildings and wonders sums with The Choregia's from culture buildings, and with Hypatia's +25% renown. The Magnaura gives the pair a council that researches. |

## 3. Tier I (with the tier-4 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Arthashastra** | council | Your government's ability counts twice. | None. | **New shape, small:** a rule that reads the held government's effects a second time in `liveEffects`' first source (`buildLiveEffects` pushes `governmentDef(sc.government).effects` once today). The chairs come from the government's chair mix, not its effects, so they do not change. A flag rule (Tyranny's `freePillage`) holds once. Shared with The Union of Lublin (section 9). |
| **The Hospitium** | engine | The third card in each of your Order hands comes from a deck you do not hold. | Each hand shows one card fewer from your own pool. | **New shape:** a hand position whose bag is the current band's single-type rows of the decks the seat does not hold, drawn rarity first as usual (`drawHandPositions`, `thirdPositionOf`, `drawRarityFirst`). |
| **The Choregia** | patrons | Culture buildings give +1 renown each. | None. | Existing. `renown`, `amount: 1`, `per: 'buildingOfCategory'`, `category: 'culture'` (the retired Patrons' form). No `family`, so it feeds the pool and not the draw's weights. |
| **The Periclean Works** | monuments | Each wonder you hold gives +1 production in every town. | None. | Existing. `pays`, `where: 'city'`, `basis: 'count'`, `count: 'wonders'`, `to: 'production'`, `amount: 1` (the count The Keepers of Wonders and The Seven Sights read). |

**The Arthashastra** (council)
- **Why:** Magisterial owns the government system, and your picture is a realm with the right institutions for its time. This makes every choice of government twice as large.
- **In play:** each adoption becomes the biggest decision of its tier. The seat picks the government whose ability it can use most, not only the chair mix it likes. It pays at all four government tiers, so it suits every plan.
- **Reading:** every number in the ability counts twice, and a rule with no number holds once. The War Chief's kills pay twice; each tier-18 ability counts each seated card twice; Imperium's and the Sultanate's +1 movement becomes +2 (question 1).
- **Size:** at tier 4, the Council of Elders gives +3 happiness more and +1 renown a turn more for each town: about +5 renown a turn with five towns, which roughly doubles a seat's early renown. The Priest-King gives +2 faith more in each town (+10). The War Chief gives +3 authority and +4 strength more. That is a regular Tier I card, and it grows: Imperium with four Military cards in ten towns gives about +40 production more, and the Estates give +12 happiness and about +20 culture more.
- **Model:** the Arthashastra, the manual of statecraft attributed to Kautilya, minister of the first Mauryan emperor (about 300 BC). It set out how a king's ministers, taxes, spies and laws should work so that the state got the most out of each.

**The Hospitium** (engine)
- **Why:** your picture: *"this focus is on being adaptable to the draft"*. The deck that plays the card game sees cards from beyond its own two decks.
- **In play:** every hand still deals one card from each of the seat's two decks. The third comes from one of the four decks the seat does not hold, at the seat's own tier. A card taken this way joins the collection and fits the chair of its type, as any card does.
- **Drawback:** the third card no longer comes from the seat's own pool, so its generic and cross-deck cards come less often. That is the trade the deck lives by: breadth for depth.
- **Size:** measured in choice, not yield. Four other decks at one tier hold 40 to 60 cards, so the third card is often one the seat could never see before. The Orders that count decks (The Polymath's Study, the shared Travelling Players) pay more for it.
- **A rainbow seat** (Ibn Battuta) holds every deck, so its third card is the ordinary one.
- **Model:** the Roman *hospitium publicum* (from the 4th century BC): a public bond by which Rome and a foreign people each received the other's envoys as guests. Each side kept a bronze token as proof of the bond.

**The Choregia** (patrons)
- **Why:** the patrons' supply comes from the other themes (themes pass, 4.2). Every Magisterial seat raises culture buildings, so this gives the patrons a source that needs no great person first.
- **In play:** each Monument, Amphitheater, Garden or Forum is also renown. The first great people come sooner, so the patrons and the landscape start in Tier I rather than Tier II.
- **Size:** four to six culture buildings at turn 32 give +4 to +6 renown a turn, more than a typical seat earns then. The second great person (301 renown) comes about 20 to 30 turns sooner. About 15 culture buildings at Tier II give +15 a turn, and about 40 at Tier IV give +40.
- **Model:** the *choregia* of Athens (5th and 4th centuries BC). A rich citizen paid for a chorus at the city's festivals. A winner put up a monument to the victory, such as the Choragic Monument of Lysicrates (335 BC), and won lasting fame by it.

**The Periclean Works** (monuments)
- **Why:** Magisterial is paid for holding wonders (ruling 3 of 2026-10-20). Production is the deck's gap, and wonders are one of its stated routes to production (`deck-design.md`, Magisterial, "Reaching the three essentials").
- **In play:** each wonder pays the whole realm, so one more wonder is always worth the race, and a lost race costs more. It suits every Magisterial plan, because the deck raises wonders anyway.
- **Size:** one or two wonders in five towns give +5 to +10 production at turn 32. Three or four wonders in seven towns give +21 to +28 at turn 72. Eight wonders in twelve towns give +96 at turn 175.
- **Model:** the building programme on the Acropolis of Athens (447 to 432 BC). Plutarch wrote that it gave paid work to every trade in the city: masons, carpenters, smiths, dyers and carters.

## 4. Tier II (with the tier-10 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Magnaura** | council | Each town gains +1 science for each Civic card you have seated. | None. | Existing. `pays`, `where: 'city'`, `basis: 'count'`, `count: 'slottedOrdersOfSlot'`, `slot: 'civic'`, `to: 'science'`, `amount: 1` (The Prytaneion's form with The Prefects' type count). |
| **The Jinshi** | engine | Rare cards come up twice as often in your Order hands. | None. | Near existing. **New, small:** a holder rule on the rare rung's weight in `rarityOdds` (`statecraft/draft.ts`), +100%, read before the odds are spread over the rarities a position's bag holds. The pity (`skipPity`) moves points as today. |
| **The Barmakids** | patrons | Each great person you have gained gives every town +1 food and +1 production. | None. | Existing. Two `pays` rows, `where: 'city'`, `basis: 'count'`, `count: 'greatPeopleGained'`, `amount: 1`, one to food and one to production. |
| **The Peregrini** | landscape | Your great people may lay their works up to two hexes beyond your borders. The hex joins your nearest town. | None. | Near existing. `worksBeyond` gains `works: 'greatWork'` beside `'tended'` (The Garden Frontier, Expansionist batch E4), `reach: 2`. `worksBeyondReach` and the ground clause of `improvementGroundError` ask it for a great person's work (`greatPersonWorkError` reaches that clause through `improvementErrorAt`). The claim is `claimGroundForWork`'s. |

**The Magnaura** (council)
- **Why:** the themes pass found that the council reaches science late (section 9). Each other chair type already has a reader: Military cards give strength (The Polemarch), Economic cards production (The Prefects), Wildcard cards science and culture (the Assembly Hall of The Senate Charter). Civic cards had none. This gives them science.
- **In play:** the Civic-led governments (the Priest-King, the Theocracy, Divine Mandate, the Curia) become research governments, and a Civic card in a Wildcard chair counts too. Tier II leans Civic (9 of 17 cards), so the seat has Civic cards to seat.
- **Size:** under the Theocracy, three or four Civic cards in seven towns give +21 to +28 science at turn 72, when a typical seat makes about 30. Under the Republic, +7 to +14; under Tyranny, which has no Civic chair, only what the Wildcard chair holds. Under Divine Mandate, four or five Civic cards in ten towns give +40 to +50; under the Curia, five to seven in twelve towns give +60 to +84.
- **Model:** the school at the Magnaura palace in Constantinople, refounded by the caesar Bardas about 855. Leo the Mathematician taught there, the state paid its masters, and its students became the empire's officials.

**The Jinshi** (engine)
- **Why:** your playtest note: *"drafting does not feel very good in the midgame, options dont seem impactful"*. Rare cards are the deck's capstones and doublers. This makes each hand more likely to hold one.
- **In play:** the rare rung's weight doubles before the odds are spread, so 60 / 30 / 10 becomes about 55 / 27 / 18. A three-card hand holds at least one rare card about 45% of the time instead of about 27%. Passing still moves points toward uncommon and rare.
- **Size:** measured in choice. It pays most in Tiers II and III, where rare cards are a fifth to a third of each pool. In Tier IV most cards are rare already, so it adds little there; it has done its work by then.
- **Model:** the *jinshi*, the "presented scholar" degree of the Tang examinations (from the 7th century). Few candidates passed it each year, and those few filled the highest offices.

**The Barmakids** (patrons)
- **Why:** great people are one of the deck's stated routes to production. The Overseers of Works pays a lump when a person arrives; this pays for every person the seat has ever gained.
- **In play:** each great person, of any family, raises every town for the rest of the game, whether they act or lay a work. It is a count of this game, so a person spent long ago still pays, and a lost war does not shrink it.
- **Size:** two or three people in seven towns give +28 to +42 a turn at turn 72. Five in ten towns give +100 at turn 133. Seven in twelve towns give +168 at turn 175, a little above the Tier IV regular card, as a scaler taken at Tier II should be.
- **Model:** the Barmakids, viziers to the early Abbasid caliphs (about 750 to 803). They paid scholars, translators and physicians, and Baghdad's first paper mill opened in their time (794).

**The Peregrini** (landscape)
- **Why:** the landscape's supply is slow, and its land claims wait for a work laid at the edge of the borders (themes pass, 4.3). The deck's design lists *"territory gain and management through great-person works"* (`deck-design.md`, Magisterial, bonus theme 8). This makes every work a way to claim land.
- **In play:** a great person walks out to unowned ground up to two hexes beyond the borders and lays their work there. The hex joins the nearest town, and the work opens the seam it covers, so a Landmark on an unclaimed luxury gives the seat that luxury. With The Landmark Bounds, the work also claims the unowned hexes around it. Ground a rival owns is never taken.
- **Size:** measured in land. Each work laid this way claims one hex, often with a resource on it. Five or six works a game claim five or six hexes and their seams.
- **Model:** the Irish *peregrini* of the 6th and 7th centuries. Monks such as Columba (Iona, 563) and Columbanus (Luxeuil, about 590) founded houses in wild places beyond any kingdom, and land was cleared and settled around them.

## 5. Tier III (with the tier-18 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Council of Ten** | council | You have one more Wildcard chair. | None. | Existing. `slotRider`, `extra: 1`, read by `chairCount`; a chair beyond the government's mix is a Wildcard chair. |
| **Scutage** | engine | Orders you hold but have not seated pay half their yields. You have one fewer Wildcard chair. | One fewer Wildcard chair. | **New shape:** the flat yield lines of Orders held and not seated, read at one half (The Grand Vizier's `slotPosition` factor, read over the collection instead of one chair). Near existing: `slotRider` with `extra: -1`. |
| **The Bourgs** | landscape | Towns working a great-person work grow 25% faster. | None. | Existing. `rulePercent`, `rule: 'growthSurplus'`, `percent: 25`, `scope: { test: 'workingGreatWork' }` (a scoped growth rate; Devotion's proposed The Imarets uses the same form). |
| **The Carroccio** | monuments | Your units gain +1 strength for each wonder you hold, at most +8. | None. | Near existing. `combatLine`, `amount: 1`, `side: 'both'`, `when: { test: 'always' }`, `scaled: { count: 'wonders', per: 1, max: 8 }`. Missing: `wonders` as a `CombatScaleCount`, read as the `CountKind` of that name. |

**The Council of Ten** (council)
- **Why:** the themes pass found that Tier III leans Wildcard (section 8): four standing Wildcard cards (The Mixed Constitution, The Divine Proportion, Officials by Merit, The Second Sitting) compete for the tier-18 governments' two Wildcard chairs. That competition is the deck's cost. This eases it for a seat that commits to the council.
- **In play:** one more chair that takes any card, under the current government and every later one. The commissions that win a chair (The Roll of the Senate, The Wonder of the Age) do the same through a goal; this is the standing version.
- **Size:** a chair is worth the card the seat puts in it: about 25 to 40 a turn at turn 133, and about 60 after turn 175. The council's readers raise it: The Prytaneion adds +1 food in every town and the shared The Art Dealers +3 gold.
- **Model:** the Council of Ten of Venice, set up in 1310 for one emergency and made permanent in 1335. It could act on any matter of state.

**Scutage** (engine)
- **Why:** the deck's design says *"Cards outside the government count"* (`deck-design.md`, Magisterial), and the standing rule is that a card off its chair does nothing. This bends that rule for its holder: the collection pays.
- **In play:** every Order the seat holds and has not seated pays half its yields: food, production, gold, science, culture and faith. Percentages, production bonuses, strength, rules and commissions pay nothing off the chair. So the old Tier 0 to II flats keep paying after the council moves on, and the seat drafts for breadth. The price is a smaller council.
- **Drawback:** one fewer Wildcard chair, the chair the deck's commissions and rules all want.
- **Reading:** a card off its chair counts what it counts as if it were seated. An unseated The Prytaneion still counts the seated cards.
- **Size:** a Tier III seat holds 10 to 15 cards off its chairs. Half of their flat lines is about 80 to 150 a turn: an unseated The Prytaneion under eight seated cards in ten towns pays +40 food by itself. Less the chair (about 30 to 60), that is +50 to +100, near the Tier III headline, as a Doctrine with a drawback should be.
- **Model:** scutage, "shield money", in 12th-century England. A knight who did not serve in the king's army paid a sum instead; Henry II raised a great scutage for the Toulouse campaign of 1159. Those who stayed at home still paid the crown.

**The Bourgs** (landscape)
- **Why:** your split for Magisterial's works: *"cities with a great work gain X"*. The Laureate and The Garden Courts pay those towns culture and science; this makes them grow.
- **In play:** a town that works a work grows a quarter faster. A bigger town works more hexes, and a work needs a citizen to pay, so the seat lays its works where its best towns can work them.
- **Size:** four to six such towns at Tier III. A quarter faster growth gives each about one citizen more every 15 to 20 turns: +10 to +15 citizens by turn 175, worth about +40 to +75 a turn.
- **Model:** the bourgs of medieval France and England (10th to 13th centuries): new towns that grew up beside an abbey or a castle, such as Bury St Edmunds beside its abbey.

**The Carroccio** (monuments)
- **Why:** the themes pass found no Military card in Tier III (section 8). Magisterial is paid for holding wonders. This turns the realm's wonders into the army's strength.
- **In play:** every unit fights better for each wonder held, in attack and in defence. A rival that takes a wonder town weakens the whole army, and the wonders help guard the Opus town.
- **Size:** four to seven wonders give +4 to +7. The cap of +8 is about 10 to 15% of an age-4 unit (45 to 80 strength): between the regular (+6) and the strong (+12) combat line of Tier III.
- **Model:** the *carroccio* of the Lombard cities: a great ox-cart that carried the city's standard, an altar and a bell into battle, first used at Milan about 1039. The Lombard League's carroccio stood at the centre of its line at Legnano (1176).

## 6. Tier IV (with the tier-26 governments)

| Doctrine | Theme | Text | Drawback | Shape |
|---|---|---|---|---|
| **The Union of Lublin** | council | You also gain the abilities of the other two governments of your tier. | None. | **New shape** (The Arthashastra's family): `liveEffects`' first source also reads the effects of the other governments of the held government's tier (`governmentDef(id).tier`). Derived from the held government; no new state. The chairs do not change. |
| **The Kitabkhana** | patrons | Spending a great person grants 200 renown for each age you have reached. | None. | Near existing. A rider on the moment a great person is spent by either verb, which the Magisterial build adds for The Last Commission and the shared Sacred Patronage, with a renown grant of 200 per age (The Overseers of Works' `perAge`). |
| **The Gobelins** | landscape | Each great-person work in your borders gives +4% production toward the Magnum Opus, at most +40%. | None. | Near existing. `productionBonus`, `category: 'building'`, `building: 'theMagnumOpus'`, `percent: 4`, `count: 'tilesInBorders'`, `max: 10` (The Great Consecration's form). Missing: the count's tile test (`tile: { test: 'greatWork' }`) on `productionBonus`, as `pays` and `renown` carry one. |
| **The Escorial** | monuments | Completing a wonder gives you a free great-person draft. | None. | Existing. `windfallRider` on `completion` with `wonder` (The Unveiling's form), with the grant `greatPerson: 'any'` (The Invitations' grant, read by `grantGreatPersonOffer`). |

**The Union of Lublin** (council)
- **Why:** the council's last Doctrine. Each tier offers three governments, one leading each kind of chair. The realm that governs best holds all three at once.
- **In play:** the seat adopts a tier-26 government for its chairs and gains the other two abilities as well. Under the Estates it also has the Curia's faith and its science from faith buildings, and the Sultanate's movement and unit production. Only the abilities: the chairs are the adopted government's.
- **Size:** two more tier-26 abilities. For a seat of twelve towns that is about +60 to +150 a turn and +1 movement: a Tier IV headline, with no drawback, at the last government of the game.
- **Model:** the Union of Lublin (1569) joined Poland and Lithuania in one Commonwealth, with an elected king, a senate and a chamber of envoys. Its writers praised it as monarchy, aristocracy and democracy in one state.

**The Kitabkhana** (patrons)
- **Why:** in the last age, great people help decide the Opus race (an engineer's act, a merchant's gold, The Last Commission). This keeps them coming: each one spent pays toward the next.
- **In play:** the seat spends its people soon after they arrive, by act or by work, and the next one comes sooner. The same moment pays The Last Commission and grows The Honoured Dead.
- **Size:** 800 renown for each person spent in age 4, against rungs of about 1,300 to 1,900. Three people spent after turn 161 give 2,400 renown, about one and a half more people.
- **Model:** the *kitabkhana* of the Mughal emperor Akbar (from the 1560s), the imperial library and painting workshop. Masters such as Abd al-Samad trained a large staff of painters there, so each master left pupils behind.

**The Gobelins** (landscape)
- **Why:** each of the deck's other homes has a finisher toward the Opus (The Magister's Court, The Universal Library, The Last Commission). The landscape had none. This makes its works build the win.
- **In play:** the seat counts its works, its own and its partner's (Landmarks, Academies, Manufactories, customs houses, citadels and holy sites all count), and the town raising the Opus builds it faster. It sums with the other Opus percentages.
- **Size:** six to ten works give +24% to +40%. In an Opus town making 60 to 100 production that is +15 to +40 hammers a turn, about ten turns off an Opus of 2,500 hammers or more.
- **Model:** the Gobelins manufactory in Paris (1662). Colbert gathered the king's painters, weavers, cabinet-makers and silversmiths there under Charles Le Brun to furnish Versailles.

**The Escorial** (monuments)
- **Why:** your picture puts the patronage of great people beside great monuments. In the last age, each wonder finished calls the masters who will build the next.
- **In play:** each wonder deals a great-person draft at once, and the seat chooses the person, as from the ladder's own draft. A wonder that a rival finishes first deals nothing. The Magnum Opus is not a wonder, and finishing it ends the game.
- **Reading:** a person taken from the draft counts as recruited (`greatPeopleRecruited`), so the next rung of the ladder is dearer, as with The Sed Festival's draft.
- **Size:** a Magisterial seat finishes two to four wonders after turn 161, so two to four more great people. A great person sells for 1,000 gold at the counter.
- **Model:** the Escorial, the monastery and palace Philip II built outside Madrid (1563 to 1584). The work drew Italian painters such as Federico Zuccaro and Pellegrino Tibaldi to Spain.

## 7. The checks

- **Four a tier, sixteen in all,** and at most one Doctrine for each home in each tier.
- **Most change a rule or the way the seat plays.** Eight bend a rule: the government counts twice, the third card comes from another deck, rares come twice as often, works go beyond the borders, a chair is added, the collection pays, three governments count at once, and a wonder calls a great person. The other eight are plain yield rules on one game object: culture buildings, wonders (twice), Civic cards, great people (twice), towns with a work, and works.
- **Two carry a drawback** (The Hospitium, Scutage). Each is light, and each is the choice the Doctrine is about. Fourteen carry none.
- **No Doctrine matters only in one age.** Each pays in the tier it is offered and in age 4. The Jinshi pays least in Tier IV, where most cards are rare already. The Peregrini needs works, which come all game.
- **No Doctrine repeats an Order's job:**
  - The Arthashastra and The Union of Lublin read the government's ability, which no Order reads.
  - The Magnaura reads Civic cards seated, the one chair type no Order read; The Boule pays a percentage for every seated card.
  - The Council of Ten gives a chair for nothing; The Roll of the Senate and The Wonder of the Age give one for a goal met.
  - The Hospitium widens the pool of the third card; Officials by Merit and The Hall of Wonders widen the hand, and The Cabinet of Curiosities grants one random card once.
  - The Jinshi changes the odds of a rarity, which no Order touches.
  - Scutage makes the cards off the chairs pay their own lines; The Encyclopedia pays a flat sum for each of them.
  - The Choregia reads culture buildings for renown; The Repertory and The Temple of the Muses read them for culture and faith.
  - The Barmakids pays flat food and production for each person gained; The Roll of Masters pays a percentage of science and culture, and The Overseers of Works a lump on arrival.
  - The Kitabkhana pays renown on a person spent; The Last Commission pays the Opus, and The Honoured Dead grows in the capital.
  - The Periclean Works pays production in every town for each wonder; The Wonder Commonwealth pays percentages in wonder towns only.
  - The Carroccio gives units strength for each wonder; The Ceremonial Guard and The Bulwark of Marvels give towns defence.
  - The Escorial pays a great person on a wonder finished; The Unveiling pays an Order hand and The Golden Age a timed festival on the same moment.
  - The Bourgs grows towns that work a work; The Laureate and The Garden Courts pay them culture and science.
  - The Gobelins reads works for the Opus; The Universal Library reads Orders held and The Magister's Court wonder towns.
- **No Doctrine names a card.** Game objects named: the Magnum Opus, wonders, great-person works, culture buildings, Wildcard chairs, Civic cards (a card type) and Order hands.
- **The splits are followed:**
  - the government system: all four council Doctrines bend it for their holder only (question 1);
  - wonders: pay for holding them (The Periclean Works, The Carroccio) and a moment when one is finished (The Escorial); none opens a wonder early or adds production toward wonders;
  - great-person works: towns with a work (The Bourgs), land claimed through works (The Peregrini) and the works counted for the Opus (The Gobelins); none pays science on works or reads an Academy;
  - rerolls: none (the Devotion pair's);
  - authority and happiness: none pays them directly. The Arthashastra and The Union of Lublin raise them only where a government's ability does.
- **No new player input.** Every Doctrine is automatic, or works through drafting, seating, adopting, building, or a great person's act or work. The Peregrini adds ground where a work may stand; it adds no button.
- **Culture stays a minority.** No Doctrine pays culture directly; the Orders carry the culture engine. Production: three (The Periclean Works, The Barmakids, The Gobelins). Science: one (The Magnaura). Renown and great people: three (The Choregia, The Kitabkhana, The Escorial).
- **Areas, five of five:** the army (The Carroccio, and The Arthashastra under the martial governments), the land (The Peregrini, The Bourgs), the economy (The Periclean Works, The Barmakids, The Gobelins, Scutage), civic life and the government (The Arthashastra, The Magnaura, The Council of Ten, The Union of Lublin), and great people and wonders (The Choregia, The Kitabkhana, The Escorial).
- **Every era fits its tier:** Tier I classical (Athens from 447 BC, Rome's *hospitium* from the 4th century BC, the Arthashastra about 300 BC), Tier II early medieval (the 6th to the 9th centuries), Tier III medieval (about 1039 to 1335), Tier IV early modern (1563 to 1662).
- **Where it falls short:**
  - The Hospitium and The Jinshi pay in choice, not yield, so they are hard to size. Bots pass one hand in 881 and seat by their own appraisal, so the bot games will not show their worth until the bots learn them.
  - Four Doctrines need a new shape (section 9). Scutage is the largest.
  - The Arthashastra and The Union of Lublin together give a tier-26 seat its own government twice and the other two once each. That is strong by design; question 1 asks about movement.
  - Tier IV holds two Doctrines that bring great people (The Kitabkhana, The Escorial), through different reads.
  - No Doctrine uses feature G (section 2).
  - Every number is a guess.

## 8. Counts

| Tier | Engine | Council | Patrons | Landscape | Monuments | All |
|---|---|---|---|---|---|---|
| I | 1 | 1 | 1 | 0 | 1 | 4 |
| II | 1 | 1 | 1 | 1 | 0 | 4 |
| III | 1 | 1 | 0 | 1 | 1 | 4 |
| IV | 0 | 1 | 1 | 1 | 1 | 4 |
| **All** | **3** | **4** | **3** | **3** | **3** | **16** |

| | Data only (existing shapes) | Near existing | New shape |
|---|---|---|---|
| Doctrines | 7: The Choregia, The Periclean Works, The Magnaura, The Barmakids, The Council of Ten, The Bourgs, The Escorial | 5: The Jinshi, The Peregrini, The Carroccio, The Kitabkhana, The Gobelins | 4: The Arthashastra, The Hospitium, Scutage, The Union of Lublin |

## 9. The new shapes, grouped

Checked against the code at commit `0d17be6c`. Each family is read by more than one card where it can be.

1. **Which governments the walk reads** (The Arthashastra, The Union of Lublin). `buildLiveEffects` (`statecraft/evaluator.ts`) pushes the held government's effects once, as its first source. Missing: a holder rule that pushes them a second time, and a holder rule that also pushes the effects of the other governments of the held government's tier. Both are derived from the held government, so no state is stored and no save changes. The chairs come from the government's chair mix, not its effects, so neither touches the chairs. Devotion's proposed The Serapeum reads the gods twice in the fourth source, so one family of rule ("read this source again") serves all three. The bots must price both in `src/ai/value.ts`, and their adoption appraisal should see the doubled or added abilities.
2. **The Order hand** (The Hospitium, The Jinshi):
   - a third hand position whose bag is the current band's single-type rows of the decks the seat does not hold (`drawHandPositions`, `thirdPositionOf`, `positionBag`). The rarity-first draw is unchanged. The bots' view of a hand (`expectedHandBags`) must learn the new bag;
   - the rare rung's weight doubled for the holder, read in `rarityOdds` (and `rarityFirstOdds`) before the odds are spread. The pity still moves points as today.
3. **The collection pays** (Scutage). Orders held and not seated push their flat yield lines at one half, each as its own labelled line (rule 5). It is The Grand Vizier's factor (`slotPosition`), read over the collection instead of one chair. The second half is a negative `slotRider` `extra`, read by `chairCount`, which removes the last Wildcard chair.
4. **Works beyond the borders** (The Peregrini). `worksBeyond.works` gains `'greatWork'`, `worksBeyondReach` takes it, and the ground clause of `improvementGroundError` asks it for a great person's work. Expansionist's The Garden Frontier already does this for tended works, so the claim (`claimGroundForWork`) and its rule (ground a rival owns is never taken) exist.
5. **Two counts in two more places:**
   - `wonders` as a `CombatScaleCount` (The Carroccio). Devotion's proposed The Paean adds `beliefsHeld` the same way;
   - a tile test on `productionBonus`'s count (The Gobelins), so `tilesInBorders` can count great-person works there, as it does for `pays` and `renown`.
6. **The moment a great person is spent** (The Kitabkhana). The Magisterial build adds it for The Last Commission and the shared Sacred Patronage. The Doctrine adds only a rider on it, with The Overseers of Works' `perAge` renown grant.

**For less engine work, cut** Scutage first, then The Hospitium. The Union of Lublin costs little once The Arthashastra's rule exists.

## 10. Facts the cells rely on

Checked at commit `0d17be6c`.

- **A Doctrine row** lives in the deck file's `doctrines` map with `decks`, `band` (1 to 4), `text` and `effects` (`data/decks/dominion.json`). `data/decks/magisterial.json` has no `doctrines` map today. A Doctrine's effects are live from the turn it is taken (`liveEffects`' second source).
- **`buildLiveEffects`** walks the held government first, then the Doctrines, then the seated Orders. Orders off their chairs are not read.
- **Governments** (`data/statecraft.json`): the Chiefdom grants nothing. Tier 4: the Council of Elders (happiness, renown for each town), the War Chief (authority, strength, two kill riders), the Priest-King (faith in every town). Tier 10: the Republic, Tyranny (with `freePillage`), the Theocracy. Tier 18: the Merchant League, Imperium (+1 movement), Divine Mandate. Tier 26: the Estates, the Sultanate (+1 movement), the Curia. Each row carries its `tier`. The tier-38 governments are retired.
- **Adoption** (`adoptGovernmentAt`, `statecraft/draft.ts`): the chairs are rebuilt to `chairCount`, the cards are re-seated, the `governmentAdopted` occasion is awarded (Triumphs only), and then the Doctrine offer is drawn.
- **The Doctrine offer** (`drawDoctrineOffer`): one from each of the seat's decks, then a third from either. An `offerRider` with `offer: 'doctrine'` widens it (the Oracle carries one). The Theatre of Dionysus grants a Doctrine offer of the current government's tier when finished (`doctrineDraft`).
- **The Order hand:** three positions, one from each of the seat's decks and a third by the cadence generic, cross, generic, single (`thirdPositionOf`). Each position draws a rarity first at 60 / 30 / 10 (`rarityOdds`, spread over the rarities its bag holds), then a card. Each pass moves 10 points to uncommon and 5 to rare until a card is taken (`skipPity`). A hand holds at most five cards (`rules.offers.max`).
- **Chairs:** `slotRider` `extra` is read by `chairCount`; a chair beyond the government's mix is a Wildcard chair. Commissions add `chairsWon`.
- **Counts:** `wonders`, `greatPeopleGained`, `slottedOrdersOfSlot` (with `slot`), `unslottedOrders` and `tilesInBorders` (with `tile`) are `CountKind` members. A `pays` row takes `count`, `slot`, `tile`, `per` and `max`.
- **Renown:** `renown` takes `per: 'buildingOfCategory'` with a `category`. The ladder is 75, 301, 531, 771, 1,023, 1,290, 1,575 and 1,882 for the first eight people. A person taken from a draft raises `greatPeopleRecruited`. A `greatPerson: 'any'` grant opens a draft through `grantGreatPersonOffer`.
- **Works:** a Landmark yields 3 culture and an Academy 3 science (`data/improvements.json`). A work stands only inside the borders today: `improvementGroundError` lets only outposts and tended works stand beyond them, and `worksBeyond` takes `works: 'tended'` only. A great person's work is checked by `greatPersonWorkError` through `improvementErrorAt`.
- **Combat scales** (`CombatScaleCount`): cities, adjacentFriendlies, greatPeopleOfFamily, slottedOrdersOfSlot, capitalGreatWorks, uniqueLuxuries, bankedGold, attacksOnTarget, townCitizensHere, charterTechsKnown, techLead. No `wonders`.
- **The Opus:** `productionBonus` toward `theMagnumOpus` with a `count`, `per` and `max` is live (The Great Consecration). `productionBonus` carries no `tile`. The Magnum Opus is not marked as a wonder.
- **Growth:** `rulePercent` `growthSurplus` with a scope is read per town (`cardRulePercent` with a city). `workingGreatWork` is a town scope.
- **The bots** price every card by its effects (`src/ai/value.ts`, an exhaustive switch). Each new shape needs a price there before bots take the Doctrine.

## 11. Questions for the user

1. **The government system.** The four council Doctrines bend it for their holder only: The Arthashastra counts the held government's ability twice, The Magnaura reads Civic chairs, The Council of Ten adds a chair, and The Union of Lublin adds the other two abilities of the tier. None changes anything for another seat. *Recommended: confirm that reading, and take all four.* One detail: The Arthashastra also doubles the +1 movement of Imperium and the Sultanate to +2. If that is too much, it can read "every number in it but movement".
2. **Scutage bends the rule that a card off its chair does nothing.** *Recommended: yes, as written,* with one fewer Wildcard chair as the price. The smaller version pays a quarter and has no drawback.
3. **The Hospitium changes what the seat is dealt:** its third card always comes from a deck it does not hold. *Recommended: yes.* If you want it as a gift with no trade, it could deal a fourth card from another deck, but a wider hand is the job of Officials by Merit and The Hall of Wonders.
4. **Feature G stays with the Orders.** A Doctrine is offered after the adoption moment, so one on the moment would wait 40 turns or never pay. *Recommended: keep the moment for The Sed Festival.*
5. **Two drawbacks in sixteen.** *Recommended: as written,* following your comments on Expansionist and Scientific.
6. **The Builder Kings** (an open question on the Expansionist sheet: cut it, or move it to Magisterial). No Magisterial Doctrine adds production toward wonders, and its drawback (no buying) is the kind you removed elsewhere. *Recommended: cut it rather than move it here.*
7. **What comes next.** *Recommended:* after your pass, the Doctrines go into four Doctrine tables on the Magisterial sheet, and the build plan (`docs/plans/magisterial-themes-triage.md`) sorts them into data-only and new-shape batches.
