# Dominion deck review, 2026-11-23

This is a design review. It changes no data, no code and no test. No test, bot game or dev server was run for it. All power figures are arithmetic from the data files.

The user's words for this deck (2026-11-23): "How is the scaling of the builds? i guess it isn't so important for dominion, i think dominion should also have a few late game options that feel a bit busted in the way magisterial works."

The user's questions for all four reviews: "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game?"

**How numbers are marked.**
- **(live)**: the number is in the data today.
- **(proposed)**: the number is a suggestion of this review.
- **(estimate)**: my arithmetic from live numbers, or a count I assumed. It was not measured.

**How proposals are marked.** Text change, existing shape, small extension, or new shape. The meanings are those of `docs/plans/deck-direction-review-2026-11-23.md`.

**Already settled, and assumed below** (the same file, "The user's comments"): The Drill Masters moves to Tier II, The Horde moves to Tier III, and Pax Romana reads "Towns you capture are pacified at once, and each gains +5 food and +5 production for good."

---

## The user's comments, 2026-11-23

The user commented on the review page (11 comments) and said in chat: "i like the changes." **Where this section and the text below disagree, this section is right.** Nothing is built yet. These changes wait in the queue behind the playtest.

| # | Card or point | The user's words | Result |
|---|---|---|---|
| 1 | The Companion Cavalry | On the finding: "attacks should refresh too". On the proposed text: "great". On decision 1: "yes". | New text: "A unit of yours that kills a unit regains its movement and may attack again." |
| 2 | The Sacred Band (new) | "thats cool, lets add it", and on decision 2: "yes" | Build it: "When one of your Elite units dies, gain a melee unit in your capital. It starts as a Veteran." |
| 3 | The Huscarls (new) | "sure", then: "it should probably read as \"elite units in a garrison give twice the garrison bonus from other effects\" or something" | Build it, with the user's wording as the base: "Elite units in a garrison give twice the garrison bonus of your other cards." The build chooses the final words. |
| 4 | Interior Lines | "lets cut", and on its replacement by The Huscarls: "great" | Retired. The Huscarls takes its place at Tier III. |
| 5 | The Tributary Kings | On the utility row: "cut" (22:58). On the proposal to read captured towns: "cool i like it" (23:01). | The two comments disagree. The later one is taken: the card stays and reads citizens in captured towns. To confirm with the user. |
| 6 | Spare authority | "let's make a note: there should be maybe more payoff for spare authority in the deck" | A note for the next Dominion pass: the deck supplies spare authority (Hegemony, The Universal Monarchy) and has no card that reads it. The readers are in Devotion, Expansionist and Magisterial. |

The user did not comment on decision 4 (the drill loop of The Drill Masters with Up Through the Ranks, about 200 to 300 renown a turn). It stays open. The orchestrator's view: size it together with the Magisterial renown supply before The Drill Masters moves to Tier II.

---

## E. Summary

### Findings

1. **The builds scale.** In a committed seat in age 4, each of the five builds pays between about 450 and 1,090 a turn (estimate). A Magisterial seat after the nerf pays about 216 from six works, and 576 with the full set (estimate, from the direction review). Dominion needs a won war and four to six chairs to get there. Magisterial needs three rares and a wonder.
2. **Three builds stop growing, and each for a different reason.**
   - The garrison stops at one garrisoned unit for each town, and The Veterans' Roll stops at 30 ranks.
   - The host's kill cards pay by unit strength. Strength grows about twice from age 2 to age 4. The economy grows about ten times.
   - The generals stop at the number of citadels, and The Bakufu pays once for each town.
3. **Dominion already has four broken combos.** Two are in Tier IV, which half the seats reach. One is hidden.
   - Capture rewards with Vae Victis: about 5,200 yield and 400 renown for one capture in age 4 (estimate).
   - The Horde with The Plunder Economy: about 1,080 production for one pillage action in age 4 (estimate).
   - Citadels with The Strategoi and The Bakufu: about 80 a turn for each citadel town (estimate).
   - The hidden one: The Drill Masters with Up Through the Ranks. Eight garrisons become Elite in ten turns and pay 2,000 renown. That is four to seven great people. It is faster than the Magisterial supply that the direction review cut.
4. **One rare does less than its text suggests.** The Companion Cavalry ("A unit of yours that kills a unit regains its movement.") refills movement only. The unit cannot attack again (`src/sim/combat.ts`, the Blitz comment). So the deck has no kill chain, and kills are the moment that the most cards in the whole game read.
5. **Most utility is good. Four cards are not worth a chair.** Interior Lines, Hegemony once The Universal Monarchy is held, The Tributary Kings, and Circumvallation outside the Opus race.
6. **Synergy across the game is rich for kills, units gained, captured towns, garrisons and herds.** It is thin for pillage and puppet towns. The pillage gap follows your ruling of 2026-11-10 ("pillage goes down to a few cards"), so I leave it.

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | The three settled fixes (The Drill Masters to Tier II, The Horde to Tier III, the new Pax Romana). | Tier moves, one text change |
| 2 | The Companion Cavalry: a unit that kills may attack again. | Small extension |
| 3 | New Tier III rare, The Sacred Band: an Elite that dies comes back as a Veteran. | Small extension |
| 4 | New Tier III rare, The Huscarls: an Elite in a garrison counts as two garrisoned units. It takes the place of Interior Lines, which is retired. | Small extension |
| 5 | The Tributary Kings reads citizens in captured towns, not in puppet towns. | Small extension |

Changes 2 to 4 add no mechanic, no button and no percentage of combat strength. Each one joins two themes of the deck.

### Decisions only you can make

1. **Should The Companion Cavalry become a real kill chain?** Recommended: yes. It is the deck's missing multiplier for kills.
2. **Do you want The Sacred Band?** It makes "feed units to die" a loop that pays on every death. Recommended: yes.
3. **May The Huscarls replace Interior Lines?** Recommended: yes. The card count of Tier III then rises by one, not two.
4. **The drill loop pays about 200 to 300 renown a turn if the player keeps new units moving through garrisons.** Keep it as a broken combo? Recommended: yes, and watch it in play. If moving units through towns feels like a chore, Up Through the Ranks can pay only for an Elite made in a fight.
5. **Should The Tributary Kings read captured towns?** Recommended: yes. Nothing else in the game reads puppet towns.

---

## The seat I used for the arithmetic

| | Age 2 | Age 3 | Age 4 | Source |
|---|---|---|---|---|
| Towns | 5 | 8 | 12 | power bar, measured from bots |
| Seat yield a turn | 225 | 543 | 2,450 | power bar, median |
| Production | 48 | 107 | 476 | power bar, median |
| Science + culture | 55 | 189 | 936 | power bar, median |
| Unit strength | 33 | 46 | 60 | power bar, mid-range |
| Share of turns at war (Dominion bots) | 32% | 45% | 37% | power bar |
| Regular card of the band then dealt | 15 to 25 | 35 to 60 | 60 to 120 | power bar |
| Headline card | 40 to 50 | 100+ | 200+ | power bar |
| Magisterial after the nerf: one work, typical seat | 16 | about 26 | 36 | direction review, estimate |
| Magisterial after the nerf: works in play | 3 works: 48 | 5 works: 130 | 6 works: 216, full set 576 | direction review, estimate |

The power bar was measured before the changes of November. Read every result as an order of magnitude.

"Typical" means a seat that holds the build's two to four plainest cards and fights one war in each age. "Committed" means a seat that drafts the build and plays for it. The counts of captures, pillages, kills and units are my assumptions, and each table states them.

---

## A. Scaling

### A.1 The garrison and the ranks

A garrisoned unit is a fighting unit on the town's own hex (`garrisonOf`, `src/sim/statecraft/evaluator.ts`). One land unit fits. So "for each garrisoned unit" is "for each town" in practice.

| Card (live text, shortened) | Age 2, 5 towns | Age 3, 8 towns | Age 4, 12 towns |
|---|---|---|---|
| Sword and Plough: +1 culture and +2 production | 5 × 3 = 15 | 24 | 36 |
| Martial Law: +2 happiness and +4 food | 20, and 10 happiness | 32, and 16 | 48, and 24 |
| The Regimental Schools (III): +6 science and +6 production | | 8 × 12 = 96 | 144 |
| Standing Garrisons (III): +12% production and culture | | 12% × (107 + 83) = 23 | 12% × (476 + 442) = 110 |
| The Limitanei (III): one more hex | | 8 × 5 = 40 | 12 × 8 = 96 |
| The Veterans' Roll (II): +1% science and culture for each rank, at most +30% | | 10 ranks: 19. 30 ranks: 57 | 20 ranks: 187. 30 ranks: 281 |

- **Typical (estimate):** age 2: 35 from two chairs. Age 3: 152 from three chairs. Age 4: 338 from four chairs.
- **Committed (estimate):** age 3: 272. Age 4: 715 and +24 happiness, from six chairs. That is about 119 for each chair, at the top of the regular bar.
- **Against Magisterial:** above the typical seat (216), and above the full set (576) only with all six cards.
- **Lumps:** Honours of the Legion pays science and culture equal to the unit's strength for each rank: 66, 92 and 120 for one rank in ages 2, 3 and 4. It is small unless many units earn ranks.

**The drill loop.** A unit becomes a Veteran at 4 experience and an Elite at 10 (live, `rules.combat.ranks`). The Drill Masters gives a garrisoned unit 1 experience each turn, with no stop at Veteran. Up Through the Ranks pays 250 renown for each new Elite. The live prices of the first seven great people are 75, 134, 197, 267, 346, 436 and 538.
- Eight garrisons: 8 × 250 = 2,000 renown after ten turns. A seat with no great person yet gains seven (1,993). A seat that has three gains four more (1,587).
- With The Training Cadre a new unit starts as a Veteran, so it is an Elite after six turns. If twelve towns each send out a new Elite every ten turns, the loop pays 12 × 250 ÷ 10 = 300 renown a turn (estimate). The Magisterial supply that the direction review cut was 52 a turn.
- Each general then lays a citadel (A.5) and fires The Mural Crown. This is the legions' broken combo, and it is live today at Tier III.

**Where it stops.** The garrison cards stop at one unit for each town, so they grow only with the number of towns and with town yields. The Veterans' Roll stops at 30 ranks, which fifteen fully ranked units reach. After that the only growth is the drill loop.

### A.2 The conqueror

Assumed captures by the end of each age (estimate): typical 1, 3 and 5. Committed 2, 5 and 9. A captured town is itself worth about 45, 68 and 200 a turn.

| Card (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| Commission: The First Province: captured towns +5 food and +5 gold | 10 | 30, committed 50 | 50, committed 90 |
| Conquered Archives (II): captured cities +10 science and +10 culture | 20 | 60, committed 100 | 100, committed 180 |
| Spear-won Land (II): +5% production and science for each town captured, no limit | | 15% × 213 = 32, committed 53 | 25% × 970 = 243, committed 45% = 437 |
| The Annexed Provinces (IV): +5% science and culture for each, at most +25% | | | 25% × 936 = 234 |
| The Proconsuls (IV): captured towns +25% production and gold | | | about 16 a town: 80, committed 146 |

- **Typical (estimate):** 30, 122 and 707. **Committed:** 60, 203 and 1,087.
- **In wars:** one capture in age 4 with Commission: Take the City (250 science and 250 culture for each age), The Victory Mint (60 gold × 10 citizens) and The Grass Crown (200 renown) pays 2,000 + 600 yield and 200 renown. With Vae Victis it pays 4,000 + 1,200 and 400 renown. That is two turns of a median seat's whole yield, and usually one great general.
- **Against Magisterial:** far above the full set in age 4, and below the typical seat in age 2.

**Where it stops.** It does not stop. Spear-won Land has no limit. The real limits are the towns in the world, and authority at 4 for each captured town (live, `rules.meters`), which Hegemony and The Universal Monarchy remove. This build grows slowly in age 2 and very fast in age 4. That is the right shape for a deck that wins by war, and it is also the build that most adds to a lead.

### A.3 The raiders

Assumed hexes pillaged this game (estimate): typical 5, 15 and 30. Committed 15, 40 and 80. Assumed pastures and camps worked: typical 4, committed 8.

| Card (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| The Captive Craftsmen (I): gains +2 science and +2 production for each pillage, no limit | 20, committed 60 | 60, committed 160 | 120, committed 320 |
| The Horse Herds (0) and The Naadam (I): +1 food, +1 production, +2 culture | 16, committed 32 | 16, committed 32 | 16, committed 32 |
| The Mesta (III): +4 food, +4 production, +4 gold | | 48, committed 96 | 48, committed 96 |
| War Feeds Itself (II): each unit in enemy land yields its hex | | 6 units × 4 = 24, at war | 10 × 6 = 60, at war |

- **Typical (estimate):** 36, 124 and 184. **Committed:** 92, 288 and 448, before the lumps.
- **Lumps for one pillage:** 25 gold (live, `rules.improvements`), Spoils of War 50 gold and 15 culture, and The Plunder Economy production equal to half the unit's strength in every city: 23 × 8 = 184 in age 3, 30 × 12 = 360 in age 4.
- **With The Horde,** a pillage also pillages each enemy improvement beside it, and each of those is a full pillage with its riders and its count (`pillageAt`, `src/sim/improvements.ts`). At three hexes for one action (estimate), one action in age 4 pays 1,080 production, 225 gold, 45 culture, and +6 science and +6 production for good on The Captive Craftsmen. A median seat makes 476 production a turn.
- **Against Magisterial:** typical is below it, committed is near the full set, and a raid with The Horde is above it while it lasts.

**Where it stops.** It stops when no enemy improvement is in reach: at peace, or when everything near is burnt. At peace the build is the herd cards alone (64 to 128).

### A.4 The host

Assumed military units gained while the card is seated (estimate): typical 8, 20 and 35. Committed 20, 45 and 85. Assumed kills this game: typical 10, 30 and 60. Committed 25, 70 and 150.

| Card (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| The Gathering Host (I): gains +1 science and +1 culture for each military unit gained | 20, committed 44 | 44, committed 94 | 74, committed 174 |
| The Captured Arms (0): +1 science for each kill this game | 10, committed 25 | 30, committed 70 | 60, committed 150 |
| Songs of the Fallen (I, rare): a kill or a loss pays science and culture equal to twice the strength | 132 an event | 184 an event | 240 an event |
| The Grand Army (IV, rare): capital +6 science and +6 culture for each military unit | | | 15 units: 180. 30 units: 360 |

- Songs of the Fallen, averaged over all turns with one event a turn of war (typical) or three (committed): 132 × 32% = 42, 83 and 89. Committed: 127, 248 and 266.
- **Typical (estimate):** 72, 157 and 223. **Committed:** 196, 412 and 950 with The Grand Army.
- **Lumps for one death in age 4:** Valhalla 25 × 12 Monuments = 300 culture, and The Glorious Dead half the unit's cost, about 170 production.
- **Against Magisterial:** equal to the typical seat, and above the full set only with The Grand Army at Tier IV.

**Where it stops.** The moment cards pay by unit strength, and strength grows from 33 to 60 while the economy grows ten times. Songs of the Fallen is 19% of a typical seat's yield in age 2 and 4% in age 4. The two growers add 1 for each event in every age, while a unit costs 46 hammers in age 2 and 340 in age 4. The generic rare The Long Memory ("Your scalers gain twice as much each time.", Tier III) is the only multiplier.

### A.5 Generals and citadels

A citadel's own yield is 3 production, 5 with Philosophy and 7 with Education (live, `data/improvements.json`). Assumed great generals (estimate): typical 1, 2 and 4. Committed 2, 5 and 8.

| Source (live text, shortened) | Age 2 | Age 3 | Age 4 |
|---|---|---|---|
| One citadel with The Castle Demesne (+5 food, +5 production) and The Citadel Works (+8 science) | 3 + 10 = 13 | 5 + 10 + 8 = 23 | 7 + 10 + 8 = 25 |
| The same with the Doctrine The Strategoi (citadel yields doubled) | | 46 | 50 |
| The Bakufu (III): a town with a citadel +25% production, science and culture | | 25% × 38 = about 10 a town | 25% × 118 = about 30 a town |

- **Typical (estimate):** 13, 2 × 23 + 19 = 65, and 4 × 25 + 118 = 218.
- **Committed, with The Strategoi:** 26, 5 × 46 + 48 = 278, and 8 × 50 + 236 = 636.
- **Lumps:** The Mural Crown pays 200 science and 200 culture for each great general gained, each time any great person is gained. With five generals that is 2,000 for each new great person.
- **In wars:** the aura is +3 strength (live). The Marshalate adds +1 for each general, at most +5, and The Strategoi doubles the aura. I read the total as up to +16 against unit strengths of 45 to 80. The strong combat line of Tier III is +12.
- **Against Magisterial:** one citadel town pays 55 to 80, against 36 for a typical work and 96 in the full set. A citadel is also a great-person work, so in Qin Shi Huang's seat the Magisterial work cards add to it.

**Where it stops.** The number of citadels, which is the number of generals not kept for the aura. The Bakufu pays once for each town. The price of great person 8 is 654 renown and of number 12 is 1,288 (live), so the supply slows unless the drill loop or The Grass Crown feeds it.

### A.6 The five builds together

| Build | Age 2 typical | Age 3 typical | Age 4 typical | Age 4 committed | Stops growing |
|---|---|---|---|---|---|
| Garrison and ranks | 35 | 152 | 338 | 715 | Yes, in age 3: one garrison a town, 30 ranks |
| Conqueror | 30 | 122 | 707 | 1,087, and about 5,200 a capture | No |
| Raiders | 36 | 124 | 184 | 448, and about 1,350 an action with The Horde | At peace |
| Host | 72 | 157 | 223 | 950 | Yes, slowly: pay follows unit strength |
| Generals and citadels | 13 | 65 | 218 | 636 | At the number of citadels |
| Magisterial after the nerf | 48 | about 130 | 216 | 576 | No |

All figures are estimates of yield a turn. Dominion is weaker than Magisterial in age 2 in three builds, level in age 3, and level or stronger in age 4. That fits the deck: it pays through wars, and the big wars are in ages 3 and 4. It does not fit the tempo ruling of 2026-10-13 ("strong now and fading") in one place: the host is the tempo build, and it is the one that fades too much.

---

## B. Utility

"Chair" means worth a chair in its tier. "Pick" means worth a draft pick. A boon ("On draft") needs no chair.

| Card | Tier | Live text | Verdict |
|---|---|---|---|
| Blood Brothers | 0, rare | A barbarian unit you kill joins your side. | Chair, in age 1 only. It gives a free army while camps are near. It is dead by age 3. |
| The Ver Sacrum | 0, rare | On draft: gain a Settler and a melee unit. | Pick. About 43 hammers when a town makes 5. |
| The Outriders | 0 | Clearing a barbarian camp grants 20 production to every town. | Chair for the first 40 turns. 60 for a camp with three towns reaches the Tier 0 lump bar (50 to 100). |
| The Foederati | I | Clearing a barbarian camp adds 2 citizens to your capital. | Chair early. Weak after age 2, when camps are far away. |
| The Training Cadre | I | Units gained in a town with a Barracks start as Veterans. | Chair. Each unit is +3 strength and one rank earned, so it feeds three other cards. |
| The Swift Riders | I | Mounted units may move after attacking, and pillage without spending movement. | Chair in a raider seat. It is the card that makes raiding fast. No value without mounted units. |
| The Upstarts | I | +5 strength against an empire that knows more technologies. | Chair as a safety net. Dominion is often behind in technologies, and +5 is near the strong line for Tier I (+6). |
| The Standing Army (shared) | I | Garrisoned units cost no upkeep. | Chair in a garrison seat until The Marian Reforms is held. Then it is dead. |
| Master Bowyers | II, rare | Ranged and siege units gain +1 range. | Chair. The best war rule in the tier: ranged units strike with no counter-blow from one hex further. |
| Siege Works | II | Siege units gain +1 movement and +4 strength against towns. | Chair during a siege war. Swap it out at peace. |
| Hegemony | II, rare | Towns you captured cost 1 less authority. | Chair with three or more captured towns. It is dead when The Universal Monarchy (Doctrine III) is held, because those towns then cost nothing. |
| The Amabutho, The Field of Mars | II | On draft: a melee unit in each Barracks town. On draft: 4 experience for every military unit. | Pick, both. The Field of Mars makes every unit a Veteran at once, so each one fires the rank cards. |
| The Tactica | II | Great generals give 1 experience each turn to units beside them. | Chair in a ranks seat. It drills the field army as The Drill Masters drills garrisons. |
| The Serried Ranks | II, rare | Melee units beside another melee unit gain +10 strength when defending. | Chair when defending. +10 is very large for age 3 (strength 46). |
| Interior Lines | III | Roads cost your units 40% less movement. | **No one takes it.** A road step already costs a third of a move. It pays nothing, and at Tier III it sits beside cards that pay 60 to 120. |
| Total War | III, rare | At war: +4 strength and +1 movement, and every city demands +2 more happiness. | Chair for one war. With twelve towns it costs 24 happiness, so Martial Law must pay for it. |
| The Master of Soldiers | III | On draft: choose a great general. | Pick. A general is worth 346 renown or more by then. |
| The Limitanei | III, rare | A garrisoned town works one more hex. | Chair. About 96 a turn in age 4 (estimate). |
| The Tributary Kings | III | Capital +2 production and +2 gold for each citizen in your puppet towns. | **Almost no one takes it.** A puppet saves 1 authority (live). Hegemony and The Universal Monarchy save the same or more with no puppet. Nothing else reads puppets. |
| Commission: A Victor's Peace | III, rare | Take two cities, then make peace. Reward: one more Wildcard chair. | Chair. A chair for good is worth a regular card every turn. |
| Commission: The Chosen Men | III | Three Elites. Reward: Elites gain +1 movement and ignore zone of control. | Chair in a ranks seat. The goal is met in ten turns with The Drill Masters. |
| The Companion Cavalry | III, rare | A unit of yours that kills a unit regains its movement. | Weak for a rare. The unit may move but not attack again. See proposal C.1. |
| The Great Bombards | IV, rare | Your siege units break a town's walls in one blow. | Chair. It is the strongest war card in the deck. |
| Circumvallation | IV | A town under siege makes no production and takes twice the siege damage. | Chair only against the builder of the Opus. Siege damage is 5 a turn (live), so twice that is small. |
| The Marchmen, The Town Watch, The General Summons (generic) | 0, II, III | +3 against barbarians. +5 defending at home. On draft: three melee units. | The Marchmen: chair for 30 turns. The Town Watch: chair when attacked. The General Summons: pick. |

**Summary.** The utility is useful. The deck has a war rule for each kind of war (range, siege, walls, defence, raid), and its boons are sized to notice. The weak ones are Interior Lines, The Tributary Kings, The Companion Cavalry, and Hegemony beside its own deck's Doctrine. Two Doctrines make a card dead (The Marian Reforms against The Standing Army, The Universal Monarchy against Hegemony). That is acceptable for a Doctrine, but the player should not be offered the dead card afterwards.

---

## C. Late game

### C.0 What each theme has at Tier III and Tier IV

| Theme | Tier III | Tier IV | Satisfying? |
|---|---|---|---|
| Garrison and ranks | Standing Garrisons, The Regimental Schools, The Limitanei, The Tagmata, Up Through the Ranks, Commission: The Chosen Men | The Varangian Guard, The Castellans, the Doctrine The Fortress Empire | Partly. The yield cards are plain and all stop at one garrison a town. The rule-breaker is at Tier IV. |
| Conqueror | Pax Romana (new text), The Victory Mint, Commission: A Victor's Peace | Vae Victis, The Annexed Provinces, The Proconsuls, two commissions | Yes. |
| Raiders | The Horde (after the move), The Mesta | the Doctrine The Scourge of God | Yes, after the move. |
| Host | Valhalla | The Grand Army, The Glorious Dead, the Doctrine The Landsturm | Partly. It has pay for deaths and for size, and nothing that multiplies kills. |
| Generals and citadels | The Bakufu, The Mural Crown, The Master of Soldiers, the Doctrine The Strategoi | The Marshalate | Yes. |

Two themes need a late card: the garrison and the host. The three proposals below are for them, and each one also feeds a second theme.

### C.1 The Companion Cavalry (revision)

| Field | |
|---|---|
| Name | The Companion Cavalry (live card) |
| Band, rarity | Tier III, rare |
| Text | "A unit of yours that kills a unit regains its movement and may attack again." (proposed) |
| Age goal | Age 3 and age 4: win the big war quickly. |
| Theme and role | The host (kills): multiply. It also serves the raiders and the ranks. It fills the gap "nothing multiplies kills". |
| Role | Build-defining. Floor: the live card (movement after a kill). Ceiling: one strong unit kills two or three wounded units in a turn. |
| Councils | Late host council, as the capstone. Late legions council, beside The Varangian Guard. |
| Attention | The player softens targets with ranged units and then sends one unit to finish them in order. That is a decision inside a fight, where the player already arranges units. It leaves nothing on the map and needs no tracking. High impact, attention that is the fun part. |
| Power | In wars. At even strength a blow does about 30 damage of 100 (live, `rules.combat`), so a kill takes three or four blows. An army that lands two kills a turn gains two more attacks, about a quarter more (estimate). Each further kill pays every kill card again: in age 4, Songs of the Fallen 240, The Melted Arms 120 production, The Bards' Praise 60 culture, The Captured Arms +1 science for good. A chain of three pays about 1,260 in one turn. I expect a field battle to end about a third sooner (estimate). |
| Synergy | Raises: kills, ranks (a kill is 2 experience). Reads: a kill. Twelve live sources pay for a kill (section D). Elite strength, The Tagmata and Master Bowyers make the first kill easier. |
| Displaces | A flat strength card. The player gives up +4 or +5 on every unit for a second and third attack on the best unit. |
| Condition or drawback | It needs a kill. A blow that only wounds ends the unit's turn as today. No limit is written on the card. |
| Shape | **Small extension.** The rule `moveAfterKill` refills movement and leaves `hasAttacked` set. The card needs a field on the row, or a sister rule, that clears it after a kill. |
| Type | Military |

### C.2 The Sacred Band (new)

| Field | |
|---|---|
| Name | The Sacred Band. Carthage raised its Sacred Band again after the whole unit died at the Crimissus. Another name: The Athanatoi, the Byzantine "Immortals" regiment. "The Immortals" is a live Magisterial card. |
| Band, rarity | Tier III, rare |
| Text | "When one of your Elite units dies, gain a melee unit in your capital. It starts as a Veteran." (proposed) |
| Age goal | Age 3 and age 4: field an expensive army. A unit costs 151 to 583 hammers, so a free replacement is a headline. |
| Theme and role | The host (losses): act and supply. The ranks: supply. It fills the gap "a lost Elite is ten turns of drill gone". |
| Role | Build-defining. Floor: none without Elites, so it is a late card for a seat that has them. Ceiling: a loop that pays on every death and every rank. |
| Councils | Late host council with Valhalla and The Glorious Dead. Late legions council with The Drill Masters and Up Through the Ranks. |
| Attention | The player now sends Elites into fights they may lose. The game leaves the same number of units on the map as before. Nothing to track. |
| Power | One death and return in age 4 (estimate): Valhalla 300 culture, Songs of the Fallen 264, The Glorious Dead 170 production, then a Veteran worth about 340 hammers. Six turns of drill later it is an Elite again: 250 renown from Up Through the Ranks, 132 from Honours of the Legion, two more ranks on The Veterans' Roll, and +1 science and +1 culture for good on The Gathering Host. Six Elites that each die once in eight turns: about 800 yield and 190 renown a turn. The Magisterial full set is 576. |
| Synergy | Raises: units gained, ranks earned. Reads: a death, the Elite rank. Sources of Elites at or before Tier III: The Drill Masters, The Tactica, The Training Cadre, The Field of Mars, and any war. Outside the deck: The Ten Thousand (Commerce), The Fetials (Devotion), The Martyrology and The Martyr's Crown (Devotion, pay on a death). |
| Displaces | A unit-supply card (The Spear Makers, a levy). The player swaps cheap new units for free veteran ones. |
| Condition or drawback | The unit must be an Elite, and it must die in a fight. A unit worth +6 strength does not die by accident. |
| Shape | **Small extension,** in two places. The `rank` test on a rider is read only on the `rankEarned` moment today, so the `death` moment must carry the dead unit's rank. The unit grant (`bestMelee`, live) needs a starting rank, as `unitStamp` has. |
| Type | Military |

This is the loop you named on 2026-10-13, when you asked to support feeding units to die as a way to play. It is not the cut "train a unit, then disband it" loop, because a death needs an enemy.

### C.3 The Huscarls (new, in the place of Interior Lines)

| Field | |
|---|---|
| Name | The Huscarls: the household troops of the Danish and English kings, who lived in the king's hall. No collision in `data/` or `docs/`. |
| Band, rarity | Tier III, rare |
| Text | "Each Elite unit in a garrison counts as two garrisoned units." (proposed) |
| Age goal | Age 3: grow into it. Turn a standing army into the economy of the towns it holds. |
| Theme and role | The garrison: multiply. It is the theme's first card that removes the limit of one garrison a town. It joins the garrison to the ranks. |
| Role | Build-defining. Floor: nothing without a garrison card and Elites. Ceiling: every "for each garrisoned unit" card is paid twice. |
| Councils | Late legions council: Sword and Plough or Martial Law, The Regimental Schools, Standing Garrisons, The Drill Masters, The Huscarls. |
| Attention | One choice: keep the Elites in the towns, or send them to the front (The Varangian Guard and The Sacred Band want them at the front). The Drill Masters makes Elites in the towns with no orders. Nothing to track: the town's breakdown shows the count. |
| Power | Age 4, twelve towns, an Elite in each (estimate): The Regimental Schools +144, Standing Garrisons +110, Martial Law +48 food and +24 happiness. About 300 a turn and 24 happiness. Alone it pays nothing. Tier III headline: 200+. |
| Synergy | Raises: the garrison count. Reads: the Elite rank, garrisons. Live cards that count garrisoned units: Martial Law, The Regimental Schools, Standing Garrisons. Sources of Elites: as C.2. In Qin Shi Huang's seat the 24 happiness pays for more towns and more wonders. |
| Displaces | A fourth plain garrison card. |
| Condition or drawback | Elite rank. Cards that ask "does the town have a garrison" (Sword and Plough, The Limitanei, The Sutlers, Examinations of State) do not change. |
| Shape | **Small extension.** The `garrison` count takes a `class` filter today. It needs a weight by rank. |
| Type | Wildcard by the sort rule (a card that acts on other cards). To confirm: a Wildcard card fits only a Wildcard chair. |

### C.4 What the batch opens

- **Kill, then kill again** (C.1): every source that pays for a kill is paid more than once a turn.
- **Die, return, drill, die** (C.2): every source that pays for a death, for a unit gained and for a rank is paid in one cycle.
- **Drill at home, count twice** (C.3): the drill loop of A.1 now also pays yields while the Elites wait.
- The three cards pull against each other for the same Elites. That is the choice the garrison theme lacks today.

**Left alone on purpose.** Vae Victis, The Varangian Guard, The Great Bombards and The Marshalate stay at Tier IV. With The Horde, Pax Romana and the three cards above, each theme has its rule-breaker at Tier III. The Sultanate ("Your Military cards are 30% stronger", live) is the game's one percentage on combat lines, and nothing here adds another.

---

## D. Synergy across the whole game

### D.1 What outside the deck touches each theme (all live)

| Quantity or moment | Other decks and shared cards | Generic cards, Doctrines, governments | Leaders | Wonders, beliefs, legacies, luxuries |
|---|---|---|---|---|
| **A kill** | The Sacred Host (faith), Field Academies (science), The Barber-Surgeons (health), The Turning of Swords (the unit joins you) | War Chief: kills grant 10 science and 10 culture | Joan of Arc: faith and pressure | Rites of Blood (faith). Legacies: Tlacaelel (50 faith and 50 culture), Ahmose (10 gold) |
| **A unit gained** | Rites of Passage (12 faith), The Muster of the Fields and The General Levy (levies), The Shrine Guards and The Soldiers of God (faith buys), The Ceremonial Guard (a wonder gives two units), The Ordinance Companies (a new age gives three), The Army Contractors, Mercenary Contracts | The General Summons | Alexander: science equal to half its strength | The Statue of Zeus (three units). Salt and ivory: +10% toward units |
| **A rank** | The Ten Thousand (bought units start as Veterans), The Fetials (units from a rite town start as Veterans) | none | none | none |
| **A death** | The Martyrology (gains +2 faith and +2 culture), the Doctrine The Martyr's Crown (pressure) | none | none | none |
| **A garrison** | The Standing Army, The Sutlers (+1 gold a citizen), Examinations of State (+1 science and culture for every three citizens), The Soldier-Scholars, The Farming Garrisons | none | Qin Shi Huang: garrisoned cities build 25% faster | Legacies: Fu Hao (+2 faith), Zhuge Liang (+2 food), Chanakya (free upkeep) |
| **A captured town** | Looted Art (renown), The New Code (an Order hand), Carried-Off Scholars (a technology), the Doctrine The Ribats (it converts) | Imperium: captured towns +10% science and culture | Mehmed: science equal to thirty times its population. Alexander: all units heal | The Library of Ashurbanipal (scholar renown for each). Legacies: Julius Caesar (200 gold and 200 culture), Belisarius (a unit), El Cid (+6 strength in captured land) |
| **Spare authority** (a conqueror with Hegemony or The Universal Monarchy has much of it) | The Two Swords, The Commander of the Faithful, Commission: The Anointing (Devotion). The Sovereign Writ, the Doctrine The Mandarinate (Expansionist). The Nomarchs (Magisterial) | Tyranny: +5 authority. Local Clerks | none | The Walls of Uruk, The Terracotta Army (+2 each), The Forbidden City (+5) |
| **A great general, a citadel** | Every Magisterial card for a great-person work, because a citadel is one. The Hall of Heroes. The Mausoleum's doubling | The Hall of Fame (+30% renown in the capital), The Summer Palace | Mehmed: each Barracks +1 science for each scholar and general gained | The Alhambra (a free general and a Military chair). Cult of Heroes (+15% renown). 32 general legacies |
| **Pastures and camps** | Lay Offerings, The Megaliths, The Temple Herds (Devotion). Smallholdings, The Three Sisters, The Hillforts (Expansionist). The Provincial Fair | none | Mansa Musa: +2 gold on camps | The Temple of Artemis (+1 food). Stable. Herd Gods, Lady of the Hunt |
| **Military and defensive buildings** (Stockpiles, The Castellans, The General Staff, War Foundries) | The Military Engineers' Charter (the Bastion), The Gunfounders' Charter (the Tophane) | The Town Watch | Mehmed | The Circus Maximus (+1 happiness for each military building). God of the Forge (+2 production for each). Legacy: Amina (+3 gold for Stone Walls) |
| **Strategic resources** (The Quartermasters) | The Assay, The Blessed Forges, Foreign Procurement, The Model Army | none | Alexander's School of Mieza | The Iron Pillar (+1 production). Horses, iron, obsidian |
| **A pillage** | none | none | Genghis Khan: pillaging pays half again | none |
| **Puppet towns** (The Tributary Kings) | none | none | none | none |

### D.2 What this shows

- **The direction review named five Dominion cards that "connect to nothing".** Two of them do connect, outside the deck, and one needs no partner. Stockpiles belongs with The Castellans, God of the Forge and The Circus Maximus: a seat that builds every military building gets 6 production for each from The Castellans (seven buildings in a town: 42 a town, 504 in twelve towns, estimate), +2 more from the belief, and happiness from the wonder. The Quartermasters belongs with five resource sources. The Upstarts is a safety net and needs no partner. Interior Lines and The Tributary Kings connect to nothing.
- **Three cross-deck combos are live and strong, and nobody has named them.**
  - **Spare authority.** The Universal Monarchy makes captured towns cost no authority. A conqueror then holds 10 or more spare authority, and Devotion pays +3 faith and +3 culture for each point (The Commander of the Faithful), Expansionist removes the ceiling on its bonus (The Sovereign Writ), and Magisterial pays culture in the capital (The Nomarchs).
  - **Bought veterans.** The Ten Thousand (Commerce) makes each unit bought with gold a Veteran. For Genghis Khan each purchase is then a rank for The Veterans' Roll and a payout of Honours of the Legion.
  - **Citadels as works.** In Qin Shi Huang's seat a citadel takes The Strategoi's doubling and every Magisterial work card.
- **Gaps.**
  1. **A rank has set-ups in two other decks and no reader outside Dominion.** That is acceptable: a set-up stands alone. The Huscarls and The Sacred Band add two readers inside the deck.
  2. **A death has two readers in Devotion and one in Dominion at Tier III.** The Sacred Band joins them.
  3. **A pillage has one reader outside the deck.** This follows your ruling of 2026-11-10. Its bridge to Commerce is gold: Spoils of War pays 50 gold a hex, and Commerce's treasury cards read the treasury.
  4. **Puppet towns have one reader in the whole game.**
  5. **Dominion and Expansionist share no card above Tier II.** The pair's late bridge is spare authority and levies, and both work without a shared card. No change proposed.

### D.3 Proposed connections

Only two, and both read general quantities.

1. **The Tributary Kings reads captured towns.** New text (proposed): "Your capital gains +1 production and +1 gold for each citizen in towns you captured."
   - Typical age 4: five towns of nine citizens, 45 + 45 = 90. Committed: nine towns of ten, 180. The Tier III regular card is 60 to 120.
   - It then meets everything in the "captured town" row of D.1, and the generic rare The Summer Palace ("Cards that pay your capital pay 50% more.").
   - Size: small extension. The count `puppetPopulation` exists. A count of citizens in captured towns is the same walk with the `captured` test.
2. **Retire Interior Lines and put The Huscarls in its place** (C.3). The deck's only pure movement card at Tier III pays nothing. The Beacons (Expansionist, +1 movement inside your borders) and Total War's +1 movement already do its job.

I do not propose a new shared card, a new count or a new keyword. The three card proposals of section C make their connections through moments the game already announces: a kill, a death, a rank earned and a unit gained.

---

## F. What I could not verify

- **Every count in section A.** Captures, pillages, kills, units gained, ranks and generals for the typical and committed seats are my assumptions. No bot game was run. The power bar predates the changes of November.
- **The drill loop in play.** I read `grantExperience` and `settleRanksEarned`: a card's experience has no stop at Veteran, and each rank fires the riders. I did not test that Up Through the Ranks pays for an Elite made by drill.
- **Whether a free great person or a renown lump changes the price ladder** in a way that slows the loop of A.1.
- **Garrisons in a coastal town.** One unit of each category fits on a hex (live, `rules.stacking`). I did not check whether a ship in a coastal town counts as a second garrisoned unit for Standing Garrisons.
- **The Strategoi.** Its citadel line is `wholePercent: 100`. I read it as doubling the card lines on the hex too, and A.5 depends on that. I also did not check the order in which it and The Marshalate change the aura, so "+16" may be +11.
- **Vae Victis with the new Pax Romana.** I did not check whether "+5 food and +5 production for good" counts as a capture reward and is doubled.
- **Carried-Off Scholars under Vae Victis.** It may grant two technologies. I left it out of the capture figure.
- **The Glorious Dead and a free unit.** A unit with free upkeep refunds nothing (`combat.ts`). The Sacred Band's replacement should refund as a normal unit only if it is not marked free. That is a build decision.
- **The Huscarls' type.** Wildcard by the sort rule. I did not count the Wildcard chairs of the tier-18 governments.
- **Hex values for The Limitanei and War Feeds Itself** (5 to 8 a hex) are guesses.
- **What a puppet town is worth to a player.** I read only `rules.war` (1 authority less, 75% of happiness demand). I did not read what a puppet may build.
- **Bots.** Astra needs values for a second attack after a kill, for an Elite's death under The Sacred Band, and for an Elite in a garrison under The Huscarls. I did not read `src/ai/`.
