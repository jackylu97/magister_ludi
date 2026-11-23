# Deck direction review, 2026-11-23

This is a design review. It changes no data, no code and no test. No test, bot game or dev server was run for it. All power figures are arithmetic from the data files.

**How numbers are marked.**
- **(live)** means the number is in the data today. The card or row is named.
- **(proposed)** means the number is a suggestion of this review.
- **(estimate)** means the number is my arithmetic from live numbers. It was not measured.

**How proposals are marked.**
- **Text or number change:** the card keeps its effect kind.
- **Existing shape:** a new card or a new effect that the effect vocabulary can already write.
- **Small extension:** an existing shape needs one more field or scope.
- **New shape:** the vocabulary cannot write it today.

The user's words that started this review (2026-11-23): "After playtesting, it's pretty clear to me that magisterial is too strong, there are just so many options for buffing great people tiles + wonders in the game, and mausoleum is clearly too strong. It also makes gameplay kind of one-note, i ended up with almost identical builds across all the magisterial leaders. [...] I think that gameplay loop is very fun to play, but i think magisterial needs a few more options/synergies in addition to nerfs of that core loop. I also feel like the other decks have generally strong cards, but maybe lack clear direction/concrete builds, but i'm not sure."

---

## Summary

### Findings

1. **Magisterial is too strong because three changes landed in one week and multiply each other.**
   - The renown ladder became cheap on 2026-11-12. The price of great person number n is `75 + 58n + n^2.65` (live, `data/rules.json` `renown`). The linear term was 180. The first six people now cost 1,455 renown in total. Before, the second person alone cost 301.
   - The Mausoleum was reworked on 2026-11-18. It doubles every great-person work, after every other bonus.
   - The Magisterial pass of 2026-11-19 raised the cards on works, wonders and great people. That pass assumed "2 or 3 great people by turn 100" (`docs/plans/magisterial-design-pass-2026-11-19.md`, section 1). A Magisterial seat now gains about 12 or more in a game (estimate).
2. **The Mausoleum is a multiplier on other multipliers, it costs no chair, and it also supplies great people.** One work in age 4 pays about 30 without it and about 60 with it in a typical seat. In the full set it pays about 276 (estimate, worked below). A regular Tier III card pays 60 to 120 for the whole empire.
3. **Every Magisterial leader ends at the same build for three reasons.**
   - All five leader abilities point at wonders or works. None points at the council or the draft.
   - Each partner deck brings its own doubler for the same hexes (Scientific for Academies, Devotion for Holy Sites, Dominion for citadels, Expansionist for Manufactories, Commerce for Customs Houses).
   - The loop's counts have no limit (great people gained, works, wonders). The council's counts stop at the number of chairs. So the loop always pays more than the deck's other themes.
4. **Nine Magisterial cards are automatic picks today.** The Hanlin Academy, The Honoured Dead, The Golden Age, The Symposium, The Workshop at Olympia, Commission: The Eighth Wonder, The Keepers of Wonders, The Masters' Domain and The Quarter of Masters.
5. **The council and the draft cards are the deck's stated identity, and nobody needs them.** They are sound cards. They lose only by comparison.
6. **The other five decks mostly do have concrete builds.** My answer to your doubt, deck by deck:
   - Dominion: I do not agree. It has five clear builds. Three small fixes.
   - Expansionist: I agree in part. Its builds are clear, but they do not compete, so every seat takes all of them. Two small fixes.
   - Commerce: I do not agree on direction. It has six threads and three of them are thin. No card change is needed now.
   - Devotion: I do not agree. Its builds are clear. Tier 0 is one note, and the deck adds many small mechanics.
   - Scientific: I agree in part. Its Academy build is the Magisterial loop again, its army thread has no pay-off, and its charters split the deck into many small unlocks.

### Recommended changes, in order

| # | Change | Size |
|---|---|---|
| 1 | The Mausoleum doubles a work's own yields, not the card bonuses on it. | Existing shape |
| 2 | Commission: The Paradise Garden gets a reward that is not a second doubling. | Small extension |
| 3 | The Hanlin Academy keeps one effect (cheaper great people). | Text change |
| 4 | The Doctrine The Peregrini loses its discount on the next great person. | Text change |
| 5 | The Honoured Dead and The Hall of Heroes count families of great people, not great people. | Existing shape |
| 6 | The Golden Age fires on wonders only. | Text change |
| 7 | The Symposium fires on a great person's act, not on gaining one. | Existing shape |
| 8 | Commission: The Eighth Wonder pays one free great-person draft in place of +5 renown for each wonder each turn. | Text change (your card, so it is a question below) |
| 9 | Add the cards for three other ways to play Magisterial: the court of acts, the council and the collection (eight more new cards, moves and revisions, section 1.6). | Mostly existing shapes |
| 10 | Dominion: move The Drill Masters to Tier II and The Horde to Tier III. Re-aim Pax Romana. | Tier moves, one text change |
| 11 | Expansionist: move The Water Boards to Tier III. | Tier move |
| 12 | Scientific: turn one of its seven flat strength cards into a pay-off. | Small extension |
| 13 | Devotion: re-aim one of the six flat faith cards of Tier 0. | Existing shape |

Changes 1 to 8 are the nerf. Together they cut a typical age 4 work from about 60 to about 36, and the best case from about 276 to about 96 (estimate). The cluster of works stays the deck's strongest single build.

### Decisions only you can make

1. **The Mausoleum: should it double only a work's own yields?** Recommended: yes. The other two options are in section 1.3.
2. **Commission: The Eighth Wonder is your own card. May its reward change to "a free great-person draft, and each wonder you hold gives +3 culture"?** Recommended: yes. It and The Workshop at Olympia pay renown for each wonder each turn, and together they are the main supply of the loop.
3. **Do you want the cluster of works to stay a "broken combo"?** Recommended: yes. Keep The Divine Proportion, The Processional Way and Commission: The Ideal City as they are, and measure again after changes 1 to 8.
4. **Should the renown ladder stay as cheap as it is (`75 + 58n`)?** Recommended: yes. The other five decks need great people too. The review cuts Magisterial's supply cards and leaves the ladder alone.
5. **Which of the three other Magisterial builds should be built first?** Recommended: the court of acts and the collection. The council needs only one new card.
6. **Devotion's rites and Scientific's charters add about 25 small mechanics between them. Do you want a pass that folds some of them into plain cards?** Recommended: yes, as a separate pass after Magisterial. It follows your words of today: "I'd love to simplify wherever we can."

---

## The user's comments, 2026-11-23

The user commented on the review page (33 comments). This section records each comment in the user's words and what it settles. **Where this section and the text below disagree, this section is right.** The sections below are the review as first written.

### Settled

| # | Card or point | The user's words | Result |
|---|---|---|---|
| 1 | The Mausoleum | "yeah, have this apply to just the +4/6/8 that they give by default, i.e. the academy should not multiply all science bonuses stacked on top of it." | Option 1. The Mausoleum doubles a work's own yields only. |
| 2 | The Peregrini | "good" | Its discount goes. The +1 food and +1 production beside a work stays. |
| 3 | The Honoured Dead | "let's just nerf the effect. +5 science and +5 production in your capital" | It keeps its shape (it gains each time you gain a great person). The gain is +5 and +5 (it was +8 and +8). The family count is dropped for this card. |
| 4 | The Hall of Heroes | "Yeah, good." | +2 strength for each family of great person gained. |
| 5 | The Golden Age | "yeah sounds good" | It fires on wonders only. |
| 6 | The Symposium | "Ok, that's a good change i think" | It fires on a great person's act. |
| 7 | Commission: The Eighth Wonder | "great" | Reward: a free great-person draft, and +3 culture for each wonder held. |
| 8 | The Hanlin Academy | "let's modify: +20% renown towards scholars, works give +2 science. This is a scientific card? if not, lets make it scientific + magisterial" | New text: "+20% renown toward great scholars. Great-person works give +2 science." It is a Magisterial card today (`data/decks/magisterial.json`). It becomes a shared card of Scientific and Magisterial. |
| 9 | All discounts on great people | "discounts should be rephrase as X% more renown, like for gold and faith purchasing" | A card, government or wonder no longer lowers the price of a great person. It raises renown. This covers Aristocracy (15) and Solomon's Temple (10). Recommended reading: keep each printed number, so "15% less" becomes "+15% renown". That is a little weaker than today. |
| 10 | The Second Summons (new) | "thats cool, i like it" | Build it: "Your great people may act twice." |
| 11 | The Pandects | "sure" | It moves from Tier III to Tier II. |
| 12 | Commission: The Golden Bull | "sure" | It moves to Tier II, and its goal is 12 Orders. |
| 13 | Pax Romana | "Sure, i'm down for this." | "Towns you capture are pacified at once, and each gains +5 food and +5 production for good." |
| 14 | The Water Boards | "sure" | It moves from Tier IV to Tier III. |
| 15 | The Armoury Patterns | "sure sounds good" | It becomes the pay-off: a kill on an empire with fewer technologies grants science equal to twice the unit's strength. |
| 16 | The Pandidakterion | "sure" | It stays as Scientific's one doubler. It needs no change. |
| 17 | Devotion Tier 0 | "rites aren't available in tier 0, i think tier 0 is probably fine for now." | Change 13 of the summary is dropped. My suggestion was wrong: a Tier 0 card cannot read a rite. |
| 18 | The Ancient Constitution (proposed) | "not very fun." | Dropped. Its replacement is in the next table. |
| 19 | The Tabularium (proposed) | "a bit boring" | Dropped. |
| 20 | The Areopagus (proposed) | "this feels way too strong, could we not have it scale off of every town." | Dropped. Its replacements are in the next table. |

The user did not comment on these, so the recommended reading stands until the user says otherwise:
- The Drill Masters moves to Tier II and The Horde to Tier III.
- The cluster of works stays a broken combo (The Divine Proportion, The Processional Way, Commission: The Ideal City are not changed).
- The renown ladder stays as it is.

### New cards from the user's comments

| Card | The user's words | Proposed row | Shape |
|---|---|---|---|
| The Anteroom (it replaces The Areopagus, and the Tier III card of the same name) | "your capital gains +3 culture for each unslotted order in your hand." On the Tier III row: "suggested above, lets reconcile the two" | One card, Tier I, uncommon, Civic: "Your capital gains +3 culture for each Order you hold but have not seated." With four unseated Orders at Tier I it pays +12 culture. With 17 late it pays +51. | Existing shape, if the count that Scutage reads is open to a `pays` line. To check in the build. |
| The reroll card (name to choose; it takes The Tabularium's place at Tier II) | "Each time you reroll a draft, this card gains +2 culture and +2 gold. rerolls cost 50% less faith." | Tier II, uncommon: the user's text as written. | The count `rerollsWhileSlotted` exists on a retired card (`data/statecraft.json`). The cheaper reroll is a small extension. |
| The swap card (name to choose; it replaces The Ancient Constitution) | "scaling card that gains yields every time you swap a card into your government. cards are only locked for two turns." | Tier III, rare. The numbers and one rule are open (question 3 below). | The rule `sealTurns` exists (the seal is five turns today). The tally of cards seated is a small extension. |

### Open after the comments

1. **Commission: The Paradise Garden needs a new reward.** The user: "this isn't a great effect, that's basically just adding three population, no?" That is correct. Two suggestions:
   - (recommended) "Reward: each great-person work gives +2 of its own yield for each other work in its town." Three works give +4 each. Six give +10 each. It pays for the cluster and it is not a doubling of the whole hex.
   - "Reward: a free great-person draft each time that town completes a wonder."
2. **The Panegyric needs a new shape.** The user: "+2/+2 is probably too weak to offset the benefits of planting. I think the shape of this is wrong, because by the time you reach late game it won't matter, and it ramps too slowly to be useful early." Two suggestions, both sized by the age so they do not ramp:
   - (recommended) "When one of your great people acts, your capital gains +3 of that person's yield for each age you have reached, for good." An act in age 4 leaves +12 a turn, against a work at about 36 after the nerf, and the player also gets the act.
   - "When one of your great people acts, your cities gain +20% science, gold and culture for ten turns. A later act restarts the ten turns." This is the half of The Golden Age that the nerf removed, moved to acts.
3. **The swap card: what counts as a swap?** If every seating counts, the best play is to move a card every two turns in every chair, and that is a chore. Two readings:
   - (recommended) It gains when you seat an Order that you have not seated before in this game. It then pays for a large collection, and it joins the council to the collection.
   - It gains on every seating, as the user wrote it.
4. **Which two or three great-person support cards to cut.** The user: "i think overall, we may have too many support cards for great people in the magisterial deck, i think we should cut 2-3". The Hanlin Academy moves to the shared pool, which is one. Recommended cuts (the rows are retired, not deleted):
   - The Sed Festival: it is The Wandering Muse a second time (a free great-person draft on draft).
   - The Roll of Masters: it is the third card that counts great people gained, after The Honoured Dead and The Encyclopedia.
   - The Garden Courts: it is The Laureate a second time (a town working a work gains more).
5. **Should a free great person raise the price of the next one?** The user: "in theory they shouldn't". Today they do: every pick raises `Player.greatPeopleRecruited`, however the offer opened (`settleGreatPersonChoice`, `src/sim/greatPeople.ts`). If free picks stop counting, each free draft is worth one whole step of the ladder more than today, and the loop gains supply. Recommended: decide after the nerf is on the play server.
6. **Should percentages raise a one-time grant?** The user, on whether "production toward wonders" raises a windfall of production: "it should be, but i think it should. modifiers should affect all sources of a yield". Today a one-time grant is not raised by any percentage (design entry XVIII.5), and that rule covers every windfall in the game. I read the comment as a wish to change the rule. It is a large change, so it needs the user's plain yes first.

### The user's answers to the open points (2026-11-23, in chat)

The user's words: "paradise garden sounds good. panegyric, how about gain 1 free reroll when one of your great people acts. lets try with every seating. for #4 please list the card abiities, i dont know their effects by name. hmm, let's just not bother with #5 then. let's queue these items because i'd like my friend to playtest on the current branch, and get his thoughts, even if the game is broken."

- **Point 1, settled.** Commission: The Paradise Garden's reward is "each great-person work gives +2 of its own yield for each other work in its town".
- **Point 2, settled.** The Panegyric: "When one of your great people acts, you gain one free reroll."
- **Point 3, settled.** The swap card gains on every seating.
- **Point 4, settled.** The user, after reading the three effects: "roll of musters can go. garden courts can go. sed festival is fine." The Roll of Masters and The Garden Courts are retired. The Sed Festival stays.
- **Points 5 and 6.** The user's "#5" was the fifth question in chat, which is point 6 here: percentages do not raise a one-time grant, and that rule stays. Point 5 (a free great person raises the next price) is not changed.
- **No card build starts now.** The settled changes are queued until the user's friend has played the branch as it is.

The user's questions for the four reviews, and one more job: "is the utility in the deck useful? Are there satisfying late game options for the current themes in the game? Could we design more synergy around the themes with other card combinations through _all_ decks and bonuses in the game? I also think a bunch of the wonders could use a re-work, i found them generally not useful, like library of ashurbanipal."

### Reviews the user asked for

| Deck | The user's words | The job |
|---|---|---|
| Dominion | "How is the scaling of the builds? i guess it isn't so important for dominion, i think dominion should also have a few late game options that feel a bit busted in the way magisterial works." | Check how each build grows across the ages. Propose two or three late cards that are broken combos. |
| Commerce | "take a look at the scaling options, and see if they're competitive." | Compare the growing cards (the treasury, the gold buyers, the routes) with the Magisterial loop after the nerf. |
| Devotion | "could we take a look at the religious beliefs and the synergy with the devotion cards? I think it's missing some cohesion." | Read every belief against the four Devotion builds and name the gaps. |
| Scientific | "could we look at the strength of the other themes after this latest change? The charter technologies could overall be buffed i think, since the require investment to obtain." | Size the four themes that are not the Academy against the nerfed loop. Propose a raise for the charters. |

### Facts the user confirmed

- Great people in a game: "12 is reasonable, i got around 15-20 but that was because i was hunting them, and stacking renown".

---

## Part 1: Magisterial

### 1.1 The core loop, with numbers

The loop has five steps.

1. **Wonders pay renown.** Each wonder row pays +10 renown when it completes and +2 a turn (live, `data/buildings.json`; The Mausoleum pays +5, The Library of Ashurbanipal +10, three pay +1, and The Oracle pays +3 through an effect).
2. **Renown buys great people.** Prices (live formula): 75, 134, 197, 267, 346, 436, 538, 654, 786, 935, 1,101, 1,288. The first five cost 1,019 in total, the first eight 2,647, the first twelve 6,757.
3. **A great person lays a work.** A work pays 4 of its yield (live, `data/improvements.json`; a citadel 3 production). Philosophy adds +2 and Education adds +2 (live). So a work's own yield is 4 in age 2, 6 in age 3 and 8 in age 4.
4. **Cards add flat yields to the work, and other cards and wonders multiply them.**
5. **Each great person gained also fires up to eight other cards,** and each wonder completed fires up to seven.

#### Sources that supply great people (renown and free drafts)

"Every seat" means every Magisterial seat can reach it. "Race" means a wonder that one empire in the world builds.

| Source | What it does (live) | Band or age | Reach |
|---|---|---|---|
| Wonder rows | +10 renown on completion, +2 a turn | all ages | every seat, race |
| The Mausoleum (wonder) | +5 renown a turn | age 2 | race |
| The Library of Ashurbanipal (wonder) | +10 renown a turn, more for captured towns | age 2 | race |
| Ordinary buildings | +1 or +2 renown a turn each (Library, Market, Amphitheater, University and about 45 more rows) | all ages | every seat |
| Specialists | +1 renown each (`renownPerSpecialist`) | all ages | every seat |
| The Workshop at Olympia | +3 renown a turn for each wonder | Tier I, common | every seat |
| Commission: The Eighth Wonder | after one wonder: +3 culture and +5 renown a turn for each wonder, for the rest of the game, with no chair | Tier I, uncommon | every seat |
| The Hanlin Academy | great people cost 20% less | Tier II, uncommon | every seat |
| The Peregrini (Doctrine) | laying a work makes the next great person cost 20% less | Tier II | every seat |
| The Choregia (Doctrine) | +2 renown for each culture building | Tier I | every seat |
| The Kitabkhana (Doctrine) | spending a great person grants 200 renown for each age | Tier IV | every seat |
| The Escorial (Doctrine) | completing a wonder gives a free great-person draft | Tier IV | every seat |
| The Wandering Muse, The Sed Festival | on draft: a free great-person draft | Tier I, Tier II | every seat |
| Commission: The Patron's Gallery | hold three works: a free draft and 200 culture | Tier II | every seat |
| The Nine Jewels | on draft: two free drafts | Tier IV, rare | every seat |
| The Hall of Fame (generic) | +30% renown in the capital | Tier I, common | every seat |
| The Office of Works (generic) | on draft: a great engineer draft | Tier III | every seat |
| Aristocracy (government) | great people cost 15% less | tier 10 | every seat |
| Council of Elders (government) | +1 renown in every town | tier 4 | every seat |
| Solomon's Temple (wonder) | great people cost 10% less, and one more name in each offer | age 2 | race |
| The Great Library, The Alhambra (wonders) | a free great scholar, a free great general | age 3, age 4 | race |
| Cult of Heroes (belief) | +15% renown | religion | a seat with that religion |
| Lapis Lazuli (luxury) | +1 renown in each city from age 3 | map | map |
| The Patrons' Ledger (Commerce shared) | buying a building grants renown equal to 10% of the gold | Tier II | Lorenzo |
| Looted Art, The Grass Crown, The General Staff, The Citadel Works (Dominion) | renown from captures, Barracks and citadels | Tiers I to II | Qin Shi Huang |
| The Royal Tutors, The Scholars' Fame, The Librarians' Charter, The Invitations (Scientific) | scholar renown and free scholars | Tiers I to II | Sejong |
| Sacred Patronage (Devotion shared) | buy a great-person draft with faith | Tier III, rare | Justinian |
| Merchant Princes (Commerce) | buy great-person drafts with gold | Tier III, rare | Lorenzo |
| Leaders | Lorenzo: +1 renown for every 8 gold a turn; The Bottega +6. Sejong: three turns of renown for each technology; The Hall of Worthies +5 | from age 1 | one seat each |

**The four discounts add together.** The Hanlin Academy (20), Aristocracy (15), Solomon's Temple (10) and The Peregrini (20) are summed and taken once (`renownThreshold`, `src/sim/renown.ts`). A seat with all four pays 35% of the price.

**Renown income in age 2 (estimate).** A seat with four towns, three ordinary renown buildings in each, four wonders, The Workshop at Olympia and The Eighth Wonder makes about 12 + 8 + 12 + 20 = 52 renown a turn. With The Mausoleum it makes 57. At that rate the first five great people take 20 turns. The same seat without the two cards makes 20 a turn.

#### Sources that add to a great-person work

| Source | What it does (live) | Band or age | Reach |
|---|---|---|---|
| The Laureate | a town working a work gains +5 culture and +3 science | Tier I | every seat |
| The Landmark Bounds | laying a work claims the unowned hexes beside it | Tier I | every seat |
| The Hanlin Academy | works give +2 science | Tier II | every seat |
| The Quarter of Masters | a work beside a work gives +4 culture and +4 production | Tier II, common | every seat |
| The Spirit Way | wonders count as works: each wonder gets the card bonuses for a work, and its town counts as working one | Tier II | every seat |
| The Peregrini (Doctrine) | +1 food and +1 production on each hex beside a work, for each work beside it | Tier II | every seat |
| The Masters' Domain | a worked work gives +6 food and +6 production | Tier III | every seat |
| The Garden Courts | a town working a work gains +20% culture and science | Tier III | every seat |
| The Bourgs (Doctrine) | a town working a work grows 50% faster | Tier III | every seat |
| The Divine Proportion | the bonuses your cards give works are doubled | Tier III, rare | every seat |
| Commission: The Paradise Garden | one town works three works: works yield double | Tier III, rare | every seat |
| The Processional Way | a hex beside two or more works gives +10 culture and +10 science | Tier IV, rare | every seat |
| Commission: The Ideal City | one town holds two wonders and works two works: its culture, science and production are doubled | Tier IV, rare | every seat |
| The Pull of the Masters, The Gobelins (Doctrine) | works take rival hexes; +10% toward the Opus for each work | Tier IV | every seat |
| The Mausoleum (wonder) | works yield double, after every other bonus | age 2 | race |
| The Great Library (wonder) | each Academy gains +2 science for each great scholar gained | age 3 | race |
| Homer (legacy) | +3 of its own yield on every work | age 2 | the draw |
| Ferdowsi, Benjamin of Tudela (legacies) | +4 culture on works; +2 gold and +1 culture on works | age 4 | the draw |
| Philosophy, Education (technologies) | +2 each to a work's own yield | ages 3, 4 | every seat |
| The Patrons' Quarter (Commerce shared) | a work gains +2 production and +2 culture for each gold building in its town | Tier II | Lorenzo |
| The Customs Houses, The Bonded Warehouses, The Weigh House (Commerce) | Customs Houses +8 science and +8 culture, and more | Tier II | Lorenzo |
| The Sculpted Landscape (Expansionist shared) | farms beside a work gain +2 food and +2 culture | Tier III | Cyrus |
| The Engineers' Yards, The Builder Kings, The Cathedral Lodges (Expansionist) | Manufactories: +4 production beside them, +2 for each wonder, yields doubled | Tiers III to IV | Cyrus |
| The Paradise Garden (Cyrus's improvement) | a worker builds one in each town, and it counts as a work (`countsAsGreatWork`) | age 1 | Cyrus |
| The Old Academy, The Lecture Halls, The Latin Quarter, The Nizamiyya, The Lynx-Eyed Academy (Scientific) | Academies: +3 food and +3 production; +2 science for each science building; +50% of the whole hex; +5 science and +5 culture | Tiers II to III | Sejong |
| The Pandidakterion (Scientific Doctrine) | Academy hexes yield double, after every other change | Tier II | Sejong |
| Temple Estates, The Old Holy Places, The Pilgrim Towns (Devotion) | Holy Sites gain food, production, faith and culture | Tiers II to III | Justinian |
| The Two Sanctuaries (Devotion Doctrine) | Holy Site hexes yield double, after every other change | Tier IV | Justinian |
| Justinian's ability | each Holy Site gives +5 production | age 1 | Justinian |
| The Castle Demesne, The Citadel Works, The Bakufu (Dominion) | citadels: +5 food and +5 production; +8 science; the town +25% | Tiers I to III | Qin Shi Huang |
| The Strategoi (Dominion Doctrine) | citadel yields are doubled | Tier III | Qin Shi Huang |

#### Sources that pay for wonders

| Source | What it does (live) | Band or age | Reach |
|---|---|---|---|
| The Cornerstone | +25% production toward wonders and culture buildings | Tier 0, common | every seat |
| The Friends of Khufu | a town spends a citizen for 25% of a wonder's cost, every five turns | Tier I | every seat |
| Magnificence | buy a wonder with culture, one culture for a hammer | Tier III, rare | every seat |
| Commission: The Wonder of the Age | 1,500 production into wonders: 250 culture and a Wildcard chair | Tier III | every seat |
| The Keepers of Wonders | each wonder: +2 happiness, and +1 of five yields in its town | Tier I, common | every seat |
| The Periclean Works (Doctrine) | each wonder gives +2 production in every town | Tier I | every seat |
| The Seven Sights | +5% culture and science for each wonder, at most +30% | Tier II | every seat |
| The Wonder Commonwealth | towns with a wonder gain +35% production and food | Tier III, rare | every seat |
| The Stele of Deeds, The Carroccio (Doctrines) | a Wildcard chair for every three wonders; +1 strength for each wonder, at most +8 | Tiers II, III | every seat |
| The Unveiling | completing a wonder deals a free Order hand | Tier I | every seat |
| The Ceremonial Guard | completing a wonder grants two units | Tier I, common | every seat |
| The Golden Age | a wonder or a great person: +25% production and culture for ten turns, and it restarts | Tier II, rare | every seat |
| The Encyclopedia | +1 science and +1 culture for each Order, wonder or great person gained | Tier I | every seat |
| The Grand Retrospective | on draft: 40 culture, science and production for each wonder, work and Order | Tier IV, rare | every seat |
| The Pyramids, Marble | +20% toward wonders; +10% toward wonders, and +2 culture on each wonder from age 3 | age 1, map | race, map |
| Divine Mandate (government) | towns with a wonder gain +20% culture and faith | tier 18 | every seat |
| Legacies | Imhotep, Hemiunu, Leonardo, Michelangelo, Villard, Brunelleschi, Amenhotep: +15% to +25% toward wonders each. Imhotep +3 science for each wonder. Phidias +5 culture for each wonder. Dürer: wonders yield 50% more | ages 2 to 4 | the draw |
| The Masons' Chapel (consecration), Marvels of the Faith (belief) | +10% toward wonders in the city; +5 science and culture for each following city with a wonder | religion | a seat with that religion |
| The Lodge Books (Scientific shared) | completing a wonder completes the current technology | Tier II, rare | Sejong |
| The House of Wisdom (Scientific shared) | towns working an Academy build wonders 30% faster | Tier III | Sejong |
| The Free Cities, The City Architects (Scientific) | +20% and +30% toward buildings and wonders | Tiers I, II | Sejong |
| Sacred Commissions (Devotion shared) | towns with a Holy Site build wonders 30% faster | Tier II | Justinian |
| The Pious Masons (Devotion) | buy a half-built wonder with faith | Tier III, rare | Justinian |
| The Gilded Scaffold (Commerce) | buy wonders with gold | Tier III, rare | Lorenzo |
| Leaders | Qin: garrisoned cities build wonders 25% faster. Lorenzo: +10% for each gold building in the city. Justinian: faith equal to the wonder's cost, and The Basilica +20% | from age 1 | one seat each |

#### What one work pays

Figures are the hex only, before town and empire percentages. All inputs are live; the sums are estimates.

| Case | Own yield | Card flats | The Divine Proportion | The Mausoleum and The Paradise Garden | Total a turn |
|---|---|---|---|---|---|
| Age 2, no cards | 4 | 0 | no | no | 4 |
| Age 2, typical: The Hanlin Academy, The Quarter of Masters | 4 | 2 + 8 = 10 | no | no | 14 |
| Age 2, the same with The Mausoleum | 4 | 10 | no | ×2 | 28 |
| Age 4, typical: add The Masters' Domain | 8 | 2 + 8 + 12 = 22 | no | no | 30 |
| Age 4, the same with The Mausoleum | 8 | 22 | no | ×2 | 60 |
| Age 4, full set: add The Processional Way (a work in a cluster is beside two works) | 8 | 22 + 20 = 42 | ×2, so 84 | ×3 (the two doublings add in one pass) | 276 |

- A typical age 2 seat has three works. With The Mausoleum they pay 84 a turn, plus The Laureate's +8 in each town that works one. The median age 2 seat makes 225 a turn in all (power bar). A regular Tier I card pays 15 to 25.
- A typical age 4 seat has six to eight works. Six works pay 360 with The Mausoleum, and 1,656 in the full set. The median age 4 seat makes 2,450 a turn. A Tier III headline card pays 200.
- The town percentages come after this: The Garden Courts (+20% culture and science), The Seven Sights (up to +30%), The Roll of Masters (up to +30%), and Commission: The Ideal City (the town's culture, science and production doubled).
- **My reading of the code, not tested:** The Divine Proportion doubles The Processional Way's line on a work hex, because the amplifier reads every card line on a hex that holds a work.

#### What one wonder pays

| Case | Its own row | Cards for each wonder | Total a turn (estimate) |
|---|---|---|---|
| Age 2, typical: The Keepers of Wonders, The Eighth Wonder, The Periclean Works with five towns | about 5 | 5 + 3 + 10 = 18, plus +2 happiness | about 23, and +10 renown with The Workshop at Olympia |
| Age 4, typical: add The Seven Sights (5% of about 936 culture and science), The Spirit Way with The Masters' Domain and The Hanlin Academy, and eight towns | about 8 | 5 + 3 + 16 + 47 + 14 = 85 | about 93, and +10 renown |

- An age 2 wonder costs 292 production (live: size `wonder` 130 × 1.31 for each column, column 4). It pays back in about 12 turns, and it takes no chair. So each wonder is one more regular card that needs no chair.
- The wonder side is strong, but it grows in a straight line. The work side multiplies. The nerf belongs on the work side and on the supply of great people.

#### What one great person gained fires

With the live cards seated, one great person gives all of these:

- a legacy for the rest of the game;
- a work for the rest of the game, or an act (eight turns of the empire's science, gold or culture, or 60 hammers × era for an engineer; live, `rules.greatPeople`);
- The Honoured Dead: +8 science and +8 production in the capital, for good, with no limit;
- The Overseers of Works: 100 production for each age, in the capital;
- The Symposium: a free Order hand;
- The Golden Age: ten turns of +25% production and culture, restarted;
- The Encyclopedia: +1 science and +1 culture, for good;
- The Roll of Masters: +3% science and culture, at most +30%;
- The Hall of Heroes: +1 strength on every unit, for good, with no limit;
- The Barmakids (Doctrine): +1 food and +1 production in every town, for good.

**The new queue rule makes this larger.** Since today a city completes every queue row it can pay for, and a windfall of production does the same during the turn (`docs/flags.md`, "A queue completes as much as it can pay for in one turn"). So The Overseers of Works (400 production in age 4), an engineer's act and The Friends of Khufu can finish a wonder in the middle of a turn. With The Escorial (a wonder gives a free great person) that wonder gives a great person, who gives 400 more production. With The Lodge Books (Sejong) each wonder also completes a technology. This chain needs a Tier IV Doctrine, so it can stay as one of the broken combos. Measure it once the queue rule is on the play server.

### 1.2 Why this is too strong: three causes

1. **The cards were sized for a slow supply, and the supply is now fast.** The pass of 2026-11-19 called the deck weak because "three of the four themes count things that arrive slowly, and the cards pay as if they were plentiful". It raised the cards. The materials table in `docs/plans/magisterial-themes.md` still prints the old ladder (75, 301, 531, 771). The live ladder is 75, 134, 197, 267.
2. **The supply cards stack on the same count.** Each wonder gives 2 renown from its row, 3 from The Workshop at Olympia and 5 from The Eighth Wonder. Ten a turn for each wonder is five times the base.
3. **Four things double the same hex.** The Mausoleum, Commission: The Paradise Garden, The Divine Proportion, and one Doctrine from the partner deck. Only The Divine Proportion costs a chair.

### 1.3 The Mausoleum

**What it does (live, `data/buildings.json` row `mausoleum`).**
- "Great-person works yield double", written as `wholePercent: 100` with `appliedLast: true` on every hex that holds a work.
- The doubling is taken off the hex's whole fold: the work's own yield, the ground, every card line, every legacy line and the first-pass percentages (`src/sim/yields/hex.ts`).
- It applies in every town of the empire, to all six kinds of work (Academy, Landmark, Manufactory, Customs House, Citadel, Holy Site) and to Cyrus's Paradise Gardens.
- +5 renown a turn, toward engineers, and +10 on completion.
- It opens with Currency in age 2 and costs 292 production. It has no site rule.

**Why it is too strong.**

| Reason | Arithmetic |
|---|---|
| Its value is every other card's value | On a bare age 2 work it adds 4. On a typical age 4 work it adds 30. In the full set it adds 92 for each work, because it adds to The Paradise Garden's doubling (8 + 84 = 92, then ×3 = 276). Six works: +552 a turn from one age 2 building. |
| It doubles a hex that a Doctrine has already doubled | Sejong with The Nizamiyya (+50%) and The Pandidakterion (double, applied last): an Academy is ×1.5 and then ×3, so ×4.5. Qin with The Strategoi: a citadel is ×2 and then ×2, so ×4. Justinian with The Two Sanctuaries: a Holy Site is ×3. |
| It costs no chair and cannot be lost | A Tier III rare that did the same thing would be the best card in the deck. The wonder is permanent, and it costs 292 production once. |
| It supplies its own works | +5 renown a turn is 2.5 times a normal wonder. Alone it pays for the first great person in 15 turns and the first three in 81 turns. |
| It is a race | One empire has it. A Magisterial seat that wins the race and one that loses it play at very different strengths. A bot that takes it gains little, and the human loses a lot. |
| It pays Cyrus at once | Cyrus builds a Paradise Garden in each town with a worker, with no great person. Every garden is doubled from age 2. |

**Three options.**

| Option | New text (proposed) | What it changes | Size |
|---|---|---|---|
| **1. Own yields only (recommended)** | "Great-person works give twice their own yields. +5 renown a turn." | It doubles the improvement's own row and its technology upgrades: +4 a work in age 2, +6 in age 3, +8 in age 4. It no longer reaches card lines. Six works in age 4: +48 a turn. | Existing shape: `percent: 100` on the `greatWork` test, which reaches the works and nothing a card adds (`CardPaysEffect.percent`). |
| 2. This city only | "Great-person works in this city yield double, after every other bonus. +2 renown a turn." | The doubling stays as you wrote it, in one town. | Existing shape with a `hasBuilding` scope, as The Hanging Gardens has. To check: that a building's `wholePercent` line reads the scope. |
| 3. Later and dearer | The live text, moved to an age 4 technology. | It costs about 1,100 to 1,900 production and arrives after the loop is built. | Number change |

**Why option 1.**
- It removes the one free multiplier and keeps a clear reason to build the wonder in every game: more from every work, and engineer renown.
- Its value no longer depends on which cards are seated, so a seat that loses the race loses about 48 a turn in age 4, not 550.
- The big moment moves to cards the player drafts (The Divine Proportion, The Processional Way), and to the partner's Doctrine. Those cost a chair or a Doctrine pick.
- Option 2 is not a real cut. The best play already puts every work in one town, because The Quarter of Masters, The Processional Way, The Paradise Garden and The Ideal City all ask for a cluster.
- Option 3 keeps the multiplier on multipliers.

**In every option,** Commission: The Paradise Garden must lose its doubling (section 1.5, change 2). It is the same line as the wonder's, and the two add.

**Bots:** one line for Astra. The value of the Mausoleum row changes from "works × card yield" to "works × own yield".

### 1.4 Why every Magisterial leader ends at the same build

**The five leaders against the loop (abilities live, `data/leaders.json`).**

| Leader | Abilities | What they point at | What the partner deck adds to the same loop |
|---|---|---|---|
| Qin Shi Huang (Dominion) | Garrisoned cities build wonders and buildings 25% faster. +1 production for every three citizens. | Wonders | Citadels are works. The Castle Demesne, The Citadel Works, The Bakufu, The Strategoi (citadels doubled). Three cards give free generals. |
| Cyrus the Great (Expansionist) | Connected cities gain +1 happiness and +1 culture for each Order in a Civic or Wildcard chair. Founded cities start with a Worker. The Paradise Garden improvement counts as a work, one in each town. | Works in every town from age 1. Half of one ability points at the council. | The Sculpted Landscape, Manufactory cards, The Builder Kings. |
| Lorenzo de' Medici (Commerce) | +1 renown for every 8 gold a turn. Wonders 10% faster for each gold building. The Bottega: +6 renown and +2 production for each luxury or work in the borders. | Great people, wonders and works: all three | The Patrons' Quarter, The Customs Houses, Merchant Princes, The Gilded Scaffold. |
| Justinian (Devotion) | A wonder completed grants faith equal to its cost. Each Holy Site gives +5 production, and +2 happiness when worked. The Basilica: +20% toward wonders. | Wonders, and Holy Sites as works | Sacred Commissions, Temple Estates, The Pilgrim Towns, The Two Sanctuaries, The Pious Masons. |
| Sejong the Great (Scientific) | +1 science and +1 culture for every four citizens. Each technology grants three turns of renown. The Hall of Worthies: +5 scholar renown. | Great people | The whole Academy theme, The Pandidakterion, The House of Wisdom, The Lodge Books. |

- Every leader has at least one ability that feeds wonders, works or renown. Only half of one ability (Cyrus's culture for each seated Civic or Wildcard card) feeds another theme.
- Every partner deck has cards for one kind of work, and four of the five have a card or Doctrine that doubles it. So the partner deck does not open a second road. It makes the same road wider.
- The Spirit Way joins the last gap. With it seated, a wonder is a work for every card. Then the monuments and the landscape are one build.

**The automatic picks (principle 5: "No card should be an automatic take in every hand").**

| Card | Why it is always right |
|---|---|
| The Hanlin Academy (II) | Two effects, and both feed the loop: great people 20% cheaper, and +2 science on every work. |
| The Honoured Dead (II) | +8 science and +8 production in the capital for each great person, with no limit. Twelve great people: +96 and +96 (estimate). The Summer Palace, The League of Cities and The Grand Vizier or The Privy Council raise it again. |
| The Golden Age (II, rare) | With a great person or a wonder every ten turns it never ends. It is then a plain +25% production and culture in every city. |
| The Symposium (II) | A free Order hand for each great person: twelve or more free cards a game. Each one feeds The Twelve Tables, The Encyclopedia and The Golden Bull. |
| The Workshop at Olympia (I) and Commission: The Eighth Wonder (I) | +8 renown a turn for each wonder between them. The commission's goal is one wonder, which the seat builds in any case, and its reward needs no chair. |
| The Keepers of Wonders (I, common) | +2 happiness and five yields for each wonder. |
| The Quarter of Masters (II, common) and The Masters' Domain (III) | +8 and +12 on each work, before the doublings. |

**The cards and themes nobody needs today.**

- **The council:** The Polemarch, The Nomarchs, The Prefects, The Boule, The Pandects, The Divan. They pay for seated cards, chairs or Doctrines. Those counts stop at 5, 6, 8 and 11 chairs and at four or five Doctrines. The Boule at eight chairs is +16% science and culture. One doubled work pays more.
- **The draft:** The Second Reading, The Accessions Register, Officials by Merit, The Cabinet of Curiosities, Commission: The Golden Bull, The Heralds. A loop seat gets its extra hands from The Symposium and The Unveiling and does not need to work for them.
- **Acts:** Letters Patent (a great person's act pays double) is never right while a work pays 60 or more a turn for good.
- **Single cards:** The Envious Eye (a safety net for a lost race), The Ceremonial Guard, The Quarry Gangs.
- These cards are not weak against the power bar. They are weak against the loop. After the nerf most of them need no change.

### 1.5 Nerfs to the core loop, card by card

The aim is to change shapes and remove duplicate sources. No change below adds a cap or a penalty.

| # | Card | Live text | Proposed text | Why, and what stays fun | Size |
|---|---|---|---|---|---|
| 1 | The Mausoleum (wonder) | Works yield double, after every other bonus. +5 renown. | "Great-person works give twice their own yields. +5 renown a turn." | Section 1.3. Every seat still wants it. | Existing shape |
| 2 | Commission: The Paradise Garden (III, rare) | Goal: one town works three works. Reward: your works yield double. | "Goal: have one town work three great-person works. Reward: that town works three more hexes." | It was the wonder's line a second time, and the two added to ×3. The new reward gives the garden town its citizens back, so the cluster costs nothing to work. The goal and the picture stay. | Small extension: The Limitanei's rule (a town works one more hex) with the marked-town scope that The Ideal City uses |
| 3 | The Hanlin Academy (II) | Great people cost 20% less renown. Works give +2 science. | "Great people cost 20% less renown." | One effect (principle 2). It becomes the supply card. The Quarter of Masters and The Masters' Domain are the cards that widen a work. | Text change |
| 4 | The Peregrini (Doctrine II) | Works give +1 food and +1 production to every hex beside them. Laying a work makes your next great person cost 20% less. | "Great-person works give +1 food and +1 production to every hex beside them." | The discount adds to three others for 65% off. The first sentence is the fun half: it rewards placing works among good hexes. | Text change |
| 5 | The Honoured Dead (II) | Gains +8 science and +8 production in your capital each time you gain a great person. | "Your capital gains +15 science and +15 production for each family of great person you have gained." (proposed numbers) | It counted the loop's fastest count with no limit. Five families exist, so it ends at +75 and +75 without a cap written on the card. It now rewards calling different families, which pulls against A Court of Merchants and other one-family plays. | Existing shape: the count `legacyFamilies` |
| 6 | The Hall of Heroes (II, common) | Your units gain +1 strength for each great person you have gained. | "Your units gain +2 strength for each family of great person you have gained." (proposed) | Twelve great people gave +12 strength to every unit from a common card. The strong line for Tier III is +12 (power bar). Five families give +10. | Existing shape |
| 7 | The Golden Age (II, rare) | A wonder completed or a great person gained gives +25% production and culture for ten turns. A later one restarts it. | "Completing a wonder gives your cities +25% production and culture for ten turns. A later one restarts the ten turns." | It never ended. On wonders alone it is a moment again: the player plans the next wonder to keep it alive. It becomes the monuments' card. | Text change (one effect removed) |
| 8 | The Symposium (II) | Each time you gain a great person, you are dealt a free Order hand. | "Each time one of your great people acts, you are dealt a free Order hand." | It turned every great person into a card for free. Now the player gives up the work to get the hand. It becomes the first card of the court of acts (section 1.6). | Existing shape: the `greatPersonAct` moment with the `freeDraft` grant |
| 9 | Commission: The Eighth Wonder (I) | Goal: complete a wonder. Reward: each wonder gives +3 culture and +5 renown. | "Goal: complete a wonder. Reward: a free great-person draft, and each wonder you hold gives +3 culture." | Your card, so it is question 2. It and The Workshop at Olympia are the same source twice. The reward keeps a great person as the prize, once. | Text change |

**Left alone on purpose.**
- **The Divine Proportion, The Processional Way, Commission: The Ideal City.** These are the broken combo. Each is a rare, and each costs a chair or a hard goal.
- **The Quarter of Masters, The Masters' Domain, The Laureate, The Garden Courts.** They are the build's widen and multiply cards. If the build is still too strong after changes 1 to 9, lower The Masters' Domain first, from +6 and +6 to +4 and +4 (proposed).
- **The Spirit Way.** It joins monuments and landscape, and that is a real combination. After change 1 a wonder gains nothing from The Mausoleum, because a wonder has no hex yield of its own.
- **The Workshop at Olympia.** After change 9 it is the one card that pays renown for each wonder.
- **The Keepers of Wonders, The Seven Sights, The Wonder Commonwealth, The Overseers of Works, The Roll of Masters.** Their sums grow in a straight line or carry a limit already.
- **The renown ladder.** It serves all six decks (question 4).

**The same arithmetic after changes 1 to 9 (estimate).**

| Case | Today | After |
|---|---|---|
| Age 2 work, typical seat with The Mausoleum | 28 | 4 + 8 + 4 = 16 |
| Age 4 work, typical seat with The Mausoleum | 60 | 8 + 20 + 8 = 36 |
| Age 4 work, full set | 276 | 8 + (40 × 2) + 8 = 96 |
| Six works, age 4, full set | 1,656 | 576, and the garden town works three more hexes |
| Renown for each wonder each turn, with both supply cards | 10 | 5 |
| Discount on great people, all sources | 65% | 45% |

The full set is still about three headline cards' worth of yield from three rares and a wonder. It stays the strongest thing the deck can do. A typical seat falls from 60 to 36 for each work, and the other builds can now compete with that.

**Bots:** Astra needs new values for changes 2, 5, 6 and 8 (a reward of worked hexes, two family counts, and a hand for an act). Changes 1, 3, 4, 7 and 9 change numbers that the ghost diff already reads.

### 1.6 Three other ways to play Magisterial

Each build below uses a material that the deck or the game already has. None adds a new player action.

#### Build A: the court of acts

**The way to play.** Call great people and spend them. A great person acts now and leaves a legacy. The court is paid for the act, for the legacy and for the variety of families, and it holds few works.

**Materials it reads.**
- the act (the `greatPersonAct` moment), sized at eight turns of the empire's science, gold or culture, or 60 hammers × era, times `1 + 0.05 × technologies` (live);
- a great person spent (`greatPersonSpent`);
- legacies and the families they come from (`legacyFamilies`).

**Live cards that serve it.**

| Tier | Cards |
|---|---|
| I | The Wandering Muse (a free draft), The Overseers of Works (production for each great person) |
| II | Letters Patent (acts pay double), The Sed Festival, The Honoured Dead and The Hall of Heroes (after changes 5 and 6: families), The Symposium (after change 8) |
| III | The Universal Genius (act, then lay the work), The Roll of Masters |
| IV | The Immortals (legacies count twice), The Last Commission (a great person spent adds production to the Opus), The Nine Jewels, The Kitabkhana (Doctrine: renown for a great person spent) |
| Partner and legacy | The Collected Works (Scientific: scholars act twice), The Company of the Staple (Commerce: merchants act twice), The Doctorate, Leonardo (acts +50%) |

**Why it is not a build today.** A scholar's act in age 3 pays about 850 science once (eight turns of the median 106). A work in the loop pays 60 or more a turn for good. After the nerf a typical work pays 36, so an act with two act cards seated is a fair trade.

**Gaps.** Nothing at Tier I pays for an act. No scaler. Only one family (scholars or merchants, through the partner) can act twice.

**Proposals.**

| Name | Band, rarity | Text (proposed) | Raises / reads | Role | Shape |
|---|---|---|---|---|---|
| The Symposium (revision) | II, uncommon | "Each time one of your great people acts, you are dealt a free Order hand." | Reads: acts. Raises: Orders held. Fed by every source of great people in section 1.1. | Pay-off, and the bridge to the collection (Build C) | Existing shape |
| The Panegyric (new) | I, uncommon, Civic | "Starts at +2 culture and +2 gold for your empire. Gains +2 of each every time one of your great people acts." | Reads: acts. Culture at Tier I is scarce, so +2 is worth about 6. After five acts: +12 and +12. | Scaler. Floor: a small flat card. Ceiling: about 50 a turn late. | Small extension: a tally of acts. The `greatPersonSpent` tally counts acts and works together today. |
| The Honoured Dead (revision) | II, uncommon | "Your capital gains +15 science and +15 production for each family of great person you have gained." | Reads: families. An act leaves a legacy, so it counts. | Pay-off for variety | Existing shape |
| The Second Summons (new) | III, rare, Wildcard | "Your great people may act twice." | Reads: acts. Raises: acts for The Symposium, The Panegyric and Letters Patent. | Build-defining capstone. Condition: the piece gives up its work unless The Universal Genius is seated too. | Existing shape: The Collected Works' amplifier with no family. To check: what a scholar does with both cards seated. |

**Checks.**
- Set-ups before pay-offs: great people are supplied at Tiers I and II by at least six live sources, before any act card needs them.
- No linchpin: The Panegyric, Letters Patent, The Symposium and The Second Summons each start the build.
- Tedium: an act is one press for each great person, which the player makes today. Nothing is left on the map.
- With Build A in the deck, a hand that shows The Quarter of Masters and Letters Patent is a real choice.

**Bots:** Astra needs a value for an act against a work when act cards are seated.

#### Build B: the council

**The way to play.** Govern. Choose the government for its chairs, fill each chair with the right type, collect Doctrines, and be paid for the shape of the council.

**Materials it reads.** Seated cards by type (`slottedOrdersOfSlot`), seated cards in all (`slottedOrders`), Doctrines held (`doctrinesHeld`), chairs, and the government's own ability.

**Live cards that serve it.**

| Tier | Cards |
|---|---|
| 0 | The Prytaneion (+1 food in each town for each seated card), The Polemarch (+2 strength for each seated Military card) |
| I | The Nomarchs, Commission: The Roll of the Senate, The Art Dealers (Commerce shared) |
| II | The Prefects (+5% production for each seated Economic card), The Grand Vizier, The Mixed Constitution, The Senate Charter, The Lawgiver |
| III | The Boule, The Pandects (+5% science and production for each Doctrine), The Divan |
| IV | The Privy Council |
| Doctrines and governments | The Arthashastra, The Magnaura, The Jinshi, The Stele of Deeds, The Council of Ten, Scutage, The Union of Lublin; The Estates, The Sultanate and The Curia (+30% to one type) |

**Assessment.**
- It has a path through every band, and it is the deck's largest theme.
- Its set-ups are the chairs, which every seat has.
- Its pay-off is the weak point. The readers stop at the chair count, and its doublers (The Grand Vizier, The Privy Council, The Arthashastra) double whatever is seated. Today the best thing to seat there is a loop card, so the council serves the loop.
- After the nerf it needs little. Its three gaps: no Order reads Civic cards, although Civic is the deck's largest type (34 of 67 cards, live); Doctrines pay only from Tier III; and it has no capstone of its own.

**Proposals.**

| Name | Band, rarity | Text (proposed) | Raises / reads | Role | Shape |
|---|---|---|---|---|---|
| The Areopagus (new) | I, common, Civic | "Each town gains +1 culture for each Civic card you have seated." | Reads: seated Civic cards. With two Civic cards and four towns: +8 culture at Tier I, worth about 24 while culture is scarce. With four under The Curia and eight towns: +32. | Glue for the build, and the Civic partner of The Polemarch and The Prefects | Existing shape: The Prytaneion's line with the Civic count |
| The Pandects (move) | III to II, uncommon | The live text: "+5% science and production for each Doctrine you hold." | Reads: Doctrines. At Tier II a seat holds two or three (the governments, The Lawgiver, The Theatre of Dionysus): +10% to +15%. | Pay-off that arrives while the council is still being built | Tier move |
| The Ancient Constitution (new) | III, rare, Civic | "You keep the ability of the government you held before this one." | Reads: the government. It makes the choice at tiers 10 and 18 matter twice: Aristocracy's cheaper great people under Divine Mandate, or the Republic's trade route under the Merchant League. | Build-defining. Floor: one government ability, about a regular card. | Small extension: The Union of Lublin's rule, pointed at the earlier government |

**Checks.**
- Set-ups before pay-offs: chairs and governments come without cards.
- No linchpin: five readers at Tiers 0 to II start it.
- Tedium: none. The player seats cards today.
- The Grand Vizier and The Privy Council stay as they are. They are the council's best cards, and they make the deck's "combinations of cards" promise real.

**Bots:** Astra needs a value for The Ancient Constitution when it chooses a government.

#### Build C: the collection

**The way to play.** Play the draft. Draft more cards than anyone, hold cards from more decks, and be paid for the Orders held, seated or not. This is the picture in `docs/decks/deck-design.md`: "If Expansionist plays the board, Magisterial plays the card game."

**Materials it reads.** Orders held (`ordersHeld`), Orders held but not seated, a card drafted (`cardDrafted`), free hands, the decks among the cards held, and commissions fulfilled.

**Live cards that serve it.**

| Tier | Cards |
|---|---|
| 0 | The Twelve Tables (rare: +2 production and +2 culture in the capital for each Order held), The Second Reading, The Heralds |
| I | The Encyclopedia, The Unveiling, Commission: The Roll of the Senate (hold eight Orders) |
| II | The Accessions Register, The Symposium, The Brokers' Redraw (Commerce shared) |
| III | Officials by Merit, The Cabinet of Curiosities, Commission: The Golden Bull (hold 20 Orders), The New Code (Dominion shared) |
| IV | The Universal Library, The Polymath's Study, The Grand Retrospective |
| Doctrines, generic cards, wonders | The Hospitium, Scutage; The Royal Annals, The Long Memory; The Oracle (one more card in each offer), The Great Sphinx (five free rerolls) |

**Assessment.**
- Path: the only card that pays for each Order held between Tier 0 and Tier IV is The Twelve Tables, a Tier 0 rare. So the build has a linchpin, and it has no pay-off at Tiers II and III.
- Set-ups: plenty. Every draft is one, and four cards deal free hands.
- Pay-off worth committing to: none before Tier IV, and the Tier IV pay-offs go to the Opus.
- Cards held but not seated are named in the deck's design as its own ground. Only the Doctrine Scutage reads them.

**Proposals.**

| Name | Band, rarity | Text (proposed) | Raises / reads | Role | Shape |
|---|---|---|---|---|---|
| The Tabularium (new) | II, uncommon, Civic | "+1% science and culture for each Order you hold, seated or not." | Reads: Orders held. About 14 Orders when it is dealt: +14%. About 30 late: +30%. The Boule gives +2% for each seated card, at most +22%. | Pay-off, and the second route into the build | Existing shape: The Boule's line with the count `ordersHeld` |
| The Anteroom (new) | III, uncommon, Economic | "Each Order you hold but have not seated gives your capital +3 production and +3 culture." | Reads: unseated Orders. With 25 held and 8 seated: +51 and +51, against a regular Tier III card at 60 to 120. It pulls against the council's extra chairs, so the two builds differ. | Pay-off | Existing shape, if the count of unseated Orders that Scutage reads is open to a `pays` line. To check. |
| Commission: The Golden Bull (move) | III to II, uncommon | "Goal: hold 12 Orders. Reward: a Doctrine offer." (it was 20) | Reads: Orders held. Raises: Doctrines, for The Pandects. A seat reaches 12 Orders in the middle of Tier II. | Pay-off, and the bridge to the council | Number change and tier move |

**Checks.**
- Set-ups before pay-offs: drafts come every seven or eight turns for every seat.
- No linchpin after the change: The Twelve Tables, The Encyclopedia, The Tabularium and The Anteroom each pay for the collection.
- Tedium: none. The count is on the collection screen today.
- The Symposium (after change 8) and The Unveiling are the bridges from great people and wonders into this build.

**Bots:** Astra needs a value for a held Order while The Tabularium or The Anteroom is seated, so a bot drafts a card it will not seat.

#### How the four builds sit together after the changes

| Build | Counts | Its limit | Its rare |
|---|---|---|---|
| The cluster (the core loop) | works, wonders | the land of one town; needs the draw of three rares | The Divine Proportion |
| The court of acts | acts, families | five families; a great person can do one thing | The Second Summons |
| The council | chairs, types, Doctrines | the government's chairs | The Ancient Constitution, The Mixed Constitution |
| The collection | Orders held | culture, the draft currency | The Twelve Tables |

The leaders then differ. Lorenzo and Sejong make the most renown, and can choose the cluster or the court of acts. Cyrus's seated-card ability and his roads fit the council. Qin and Justinian build the most wonders, and The Unveiling takes them to the collection. This is a tendency, not a lock.

**A note on types.** The proposals add four Civic cards, one Economic and one Wildcard. Magisterial's Tier III has no Military card and Tier II has one (live counts, `docs/decks/magisterial.md`). This review does not fix that.

---

## Part 2: the other five decks

The card lists below are live (`data/decks/*.json`, rows with `retired: true` left out). "Path" means the build has cards at every tier it can use. "Set-ups" means cards that raise its count at or before its pay-offs.

### 2.1 Dominion

**Builds a player can aim at today.**

| Build | Live cards | Path | Set-ups before pay-offs | Pay-off worth it |
|---|---|---|---|---|
| The garrison and the ranks | Sword and Plough (0), Martial Law, The Training Cadre, Honours of the Legion (I), The Veterans' Roll (II), Standing Garrisons, The Regimental Schools, The Drill Masters, The Tagmata, Commission: The Chosen Men (III), The Varangian Guard (IV) | Yes | Garrisons: yes. Ranks: thin. Honours of the Legion (I) and The Veterans' Roll (II) pay for ranks, but the card that earns ranks at peace, The Drill Masters, is at Tier III. | Yes: Standing Garrisons, The Varangian Guard |
| The conqueror | Commission: The First Province (I), Conquered Archives, Hegemony, Spear-won Land, Commission: Take the City, The Grass Crown, The Auxilia (II), The Victory Mint, Pax Romana (III), The Annexed Provinces, The Proconsuls, Vae Victis (IV) | Yes | Yes | Yes. It is the clearest build in the game. |
| The raiders | The Horse Herds (0), Horse Lords, The Swift Riders, The Captive Craftsmen, The Naadam (I), Spoils of War, War Feeds Itself (II), The Mesta, The Companion Cavalry (III), The Horde (IV) | No pillage card at Tier III | Yes | Its rule-breaker, The Horde, is at Tier IV, which half the seats reach |
| The host: units gained, kills and losses | The Bards' Praise, The Captured Arms, The Spear Makers (0), The Gathering Host, Songs of the Fallen (I), The Melted Arms, The Amabutho, Commission: The Decisive Battle (II), Valhalla (III), The Grand Army, The Glorious Dead (IV) | Yes | Yes | Yes |
| Generals and citadels | Commission: Clear the Frontier, The Castle Demesne, The General Staff (I), The Citadel Works, Commission: The Border Fortress, The Tactica, The Taker of Cities (II), The Bakufu, The Master of Soldiers, The Mural Crown (III), The Marshalate (IV) | Yes | Yes | Yes |

**Strong cards that connect to nothing.** The Quartermasters (worked strategic resources +3 food and +3 production), Stockpiles (+8 food for each defensive building), The Tributary Kings (the only card that reads puppet towns), The Upstarts, Interior Lines.

**Fixes, smallest first.**
1. **Move The Drill Masters from Tier III to Tier II** (tier move). The rank pay-offs then have a set-up at peace.
2. **Move The Horde from Tier IV to Tier III** (tier move). The raiders get a Tier III capstone and the gap closes.
3. **Re-aim Pax Romana** (text change). Unrest lasts three turns since today (`docs/flags.md`, "Unrest lasts three turns in every town"), so "pacified at once" is worth three turns of one town. That is too little for a Tier III rare. The Doctrine The Consular Roads has the same clause. `docs/flags.md` already names The Satraps as weak for the same reason. The new text is yours to choose. One suggestion: "Towns you capture are pacified at once, and each gains +5 food and +5 production for good." (proposed; existing shapes).

**Do I agree with the doubt?** No. Dominion had the full builds pass, and it shows. Its builds are concrete and they differ from each other.

### 2.2 Expansionist

**Builds a player can aim at today.**

| Build | Live cards | Path | Set-ups before pay-offs | Pay-off worth it |
|---|---|---|---|---|
| The improved land | The Rope Stretchers, The Gathering Grounds (0), The Makers of Land, The Three Sisters, Dark Earth, Tinkers' Guild, Commission: Break the Sod (I), The Hedgerows, The Watercourses, Commission: The Reclaimed Lands (II), The Cadastre, Old Workings, The Age of Improvement (III), The Domesday Survey, The Keeps (IV) | Yes | Yes | Yes: The Age of Improvement |
| Citizens and levies | Granary Levies, The Patient Harvest, The Seed Grain (0), Levy of the Land, The Grain Census (I), The Seven Fat Years, The Terraces of Moray, The Great Households (II), Seasonal Levies, The Mit'a, Plenty, The Megalopolis (III), The Corvée, The Thousand Villages (IV) | Yes | Yes | Yes: The Megalopolis, The Mit'a |
| The wide realm: towns, roads, authority | The Road Home, The Founding Furrow, The Horrea (0), The Road Towns, The Staked Claims, The Land Hunger (I), Provincial Councils, The Book of Settlements, The Great Colonies (II), The Imperial Roads, The Sovereign Writ, The Quitrents (III), The Mother City, The Imperial Highways (IV) | Yes | Yes | Yes: The Imperial Roads |
| Public works | The Aediles (I), Commission: Bread and Water, The Thermae, The Mansiones, The Waterworks (II), The Water Boards (IV) | No card at Tier III | Yes | Its multiplier is at Tier IV |

**Strong cards that connect to nothing, or to little.** The mountain cards (The Mountain Terraces, The Philosophers' Peaks, the Doctrine The High Towns) depend on the map. The Coast and The Harbour Cities are two cards for coastal towns. A Court of Engineers and The Engineers' Yards are a two-card engineer thread whose pay-offs are Doctrines (The Builder Kings, The Cathedral Lodges). The Great Migration.

**Fixes, smallest first.**
1. **Move The Water Boards from Tier IV to Tier III** (tier move). Public works then have their multiplier where a capstone belongs.
2. **Nothing else now.**

**Do I agree with the doubt?** In part. The direction is clear, and your playtest note agrees ("levy of the land is soooo good"). The weakness is a different one: the first three builds all say "be large", and none of them asks the player to give up another. So an Expansionist seat takes all three, and its games look alike. That is a question for a later pass, and a card that pulls two builds apart would be the tool. The Doctrines already do it (The Planted Towns, Synoecism, Crop Rotation).

### 2.3 Commerce

**Builds a player can aim at today.**

| Build | Live cards | Path | Set-ups before pay-offs | Pay-off worth it |
|---|---|---|---|---|
| Luxuries | Salt Tithes, The Emporia, The Palace Stores (0), The Staple Right, The Dye Works, The Estate Lands (I), The Spice Exchange, The Tiraz, Corner the Market (II), The Monopoly, The Latifundia, The Capitulations (III), The Casa da Índia (IV) | Yes | Yes | Yes |
| Buying with gold | The Open Market, Land Speculation (0), Civic Receipts, The Strongbox, The Ten Thousand (I), Names in Stone, Private Patronage (II), The Endowment, A Guild Commission, The Double Entry, Merchant Princes (III), Bought and Paid For (IV) | Yes | Yes | Yes: The Double Entry |
| Trade routes, at home or abroad | The First Caravan (0), Provisioning Contracts (I), The Common Road, The Home Market, The Exchange, The Tea Horse Road (II), The Return Leg, The Scholars' Roads, The Chartered Metropolis (III), The World's Fair, The Grain Barges (IV) | Yes | Yes | Yes, and the Doctrines make home or abroad a real choice (The Sea Ban, The Muda) |
| The sea | The Fishing Fleets, The Periplus (0), The Salt Pans, The Slipways, The Garum Works (I), The Sea Lords (II), The Stato da Mar, The Free Ports, Commission: The Harbour League (III), The Herring Fleets (IV) | Yes | Yes | Yes, on a coastal map |
| The treasury | The Nest Egg (0), The Money Lenders, The Strongroom, The Stipendium (III), Money at Work (IV) | Nothing at Tiers I and II | The pay-offs read gold income or the treasury, which every Commerce seat has | The Money Lenders (4% of the treasury each turn, no limit) is a broken combo of the kind you asked for |
| Merchants and Customs Houses | Commission: The Trade Mission (I), The Customs Houses, The Bonded Warehouses, The Weigh House, The Merchant Consuls (II), A Court of Merchants, The Company of the Staple (III) | Tiers I to III | Yes | Yes |

**Strong cards that connect to little.** The Treaty Ports and Export Guilds read deals, and their value depends on what the bots will sign. The Mineral Trade, The Potters' Quarter and The Provision Trade are plain flats. The Wayside Inns and Market Gardens are a two-card road thread.

**Fixes.**
1. **None is needed for direction.**
2. **One risk to check in play, not a card change:** the deals cards (Travellers' Letters, Export Guilds, Commission: The Trade Mission, The Treaty Ports, Cleopatra's second ability) depend on the bots' trade logic, which changed today. Astra owns that.

**Do I agree with the doubt?** No. Commerce has the most builds of any deck. If it feels unclear, the cause is the opposite: six threads over 85 cards, so a seat sees about two cards of each thread in a tier. Cutting the thinnest threads would sharpen it, and that is a job for the simplification pass.

### 2.4 Devotion

**Builds a player can aim at today.**

| Build | Live cards | Path | Set-ups before pay-offs | Pay-off worth it |
|---|---|---|---|---|
| Rites | The Hallowed Ground, The Chantries, The Octave, The Fast, The Votive Gifts, The Founding Vows, The Rites Commonwealth, The Rogations (I), The Vigil of Arms, The Sabbath Laws, The Double Feast (II), The Naming Feasts, The Psalter (III), The Host Restored (IV) | Yes | Yes | Yes: The Rites Commonwealth, The Double Feast |
| Faith spent | The First Offering (0), Consecrated Labor, The Gifts of the Faithful, The Pilgrim Staff (I), The Offering Chests, The Book of Life (II), The Sacred Bequests, The Fabric Fund, The Offered Stones, The Pious Masons (III), The Soldiers of God, The Last Offering (IV) | Yes | Yes | Yes |
| Devout towns and authority | The Parishes, The Settled Faith, The Deaconries, Commission: The State Church, The Living Hymnal, Pentecost (II), The Holy Inquisition, The Caliphate, Commission: The Anointing, The Two Swords (III), The Commander of the Faithful, The Great Commission (IV) | From Tier II, when religions exist | Yes | Yes: The Caliphate. It fits your words of today, "I'm kind of liking this authority-based religious play." |
| Faith buildings | The Tithe Barns (0), First Rites, The Temple Workshops, The Temple Storehouses (I), The Temple Herds, The Bell Towers (II), The Prince-Bishops, The Cathedral Works (III), The Chapter Houses (IV) | Yes | Yes | Yes: The Prince-Bishops |

**Strong cards that connect to little.** The Martyrology and the Doctrine The Martyr's Crown pay for units that die, which is a Dominion pair thread. The Creed and three Doctrines read gods and beliefs. The Turning of Swords.

**Fixes, smallest first.**
1. **Re-aim one Tier 0 card** (existing shape). Six of the eight Tier 0 cards pay flat faith (The Calling, The Royal Cult, The Household Gods, The First Offering, The Tithe Barns, Lay Offerings). A seat's first three chairs look the same in every game. Suggestion: The Calling becomes "Towns keeping a rite gain +2 food and +2 production." (proposed; the scope `keepingRite` exists). Tier 0 then points at one of the builds.
2. **Nothing else for direction.**

**A separate point, on the number of mechanics.** Devotion's cards add seven rites, two buildings and four faith houses (The Hallowed Ground, The Fast, The Votive Gifts, The Vigil of Arms, The Sabbath Laws, The Naming Feasts, The Host Restored; the Chapel, the Bell Tower; the Doctrine The House of Worship). Each is a small rule to learn. This is question 6.

**Do I agree with the doubt?** No. After Dominion, Devotion has the clearest builds.

### 2.5 Scientific

**Builds a player can aim at today.**

| Build | Live cards | Path | Set-ups before pay-offs | Pay-off worth it |
|---|---|---|---|---|
| Academies and scholars | Commission: The Old Learning, The Scholars' Fame, The Royal Tutors (I), The Old Academy, The Lecture Halls, The Latin Quarter, The Roll of Scholars, The Invitations (II), The Collected Works, The Nizamiyya, The Doctorate, The Lynx-Eyed Academy (III), The Invisible College (IV) | Yes | Yes | Yes. It is the Magisterial loop on one kind of work, with its own doubler (The Pandidakterion). |
| Technologies completed | The Royal Workshops (0), The Astronomical Diaries (I), The Alfonsine Tables, The Translation Movement (II), The Journeymen (III) | Yes | Research is the set-up | Yes: The Journeymen |
| Charters | The Smelters' Charter (0), five charters and The Charter Rolls (I), five charters and The Royal Charter Commission (II), three charters and The Closed Book (III), The Great Catalogue (IV) | Yes | Yes | Four cards read the count of charters: The Secret Arts (I), the Great Archive (II), The Alchemists' Charter (III), The Great Catalogue (IV). They are modest. |
| Empire buildings | The Royal Estates, The Dedications, The Librarians' Charter (I), The Invitations, The Palace Schools (II), The Royal Academies, The Second Seat (III) | Tiers I to III | Yes | Yes: The Second Seat |
| The elite army | The War Manuals (0), The Bronze-Founders' Charter, The Edge of the Sword (I), The Armoury Patterns, The Strategikon, The Palace Schools, The Barber-Surgeons, The Ordinance Companies (II), The Alchemists' Charter, The Gunfounders' Charter, The Model Army (III) | Yes | Yes | No. Seven of these cards are flat strength. Together they can pass +20 (estimate). No card pays for a fight won with few units. |

**Strong cards that connect to little.** The Queen of Cities (towns of 15 citizens produce double food and production) and The Round City read big towns, and the deck has four cards for growing one. The House of Life.

**Fixes, smallest first.**
1. **Turn one flat strength card into a pay-off** (small extension). The Armoury Patterns (+3 for units of your age) and The Edge of the Sword (+3 against an empire with fewer technologies) do nearly the same job. Suggestion for The Armoury Patterns: "Killing a unit of an empire that knows fewer technologies than you grants science equal to twice its strength." (proposed). The army then feeds research, which is the deck's engine.
2. **The Academy build takes the same Mausoleum fix as Magisterial.** After it, The Pandidakterion (a Doctrine) is Scientific's one doubler.
3. **The charters are a question of simplicity more than of power.** Sixteen charter cards each open a different small thing: a building, an improvement, a unit rule or a rite. A seat that drafts five has five unrelated unlocks. This is question 6.

**Do I agree with the doubt?** In part. The themes are clear on paper, because Scientific had the first themes pass. In play its strongest build is the Academy loop, its army is a pile of numbers, and its charters do not add up to one thing.

### 2.6 The generic and shared cards

- The generic cards are glue, and that is their job. Three reach into the Magisterial loop and stay: The Hall of Fame, The Office of Works and The Summer Palace.
- The shared cards do their work as signposts for a pair. The Magisterial pairs' shared cards all point at works or wonders (The Patrons' Quarter, The Sculpted Landscape, The House of Wisdom, Sacred Commissions, Sacred Patronage, The Lodge Books, Looted Art). When the three new builds are built, one shared card for each pair should point at the council or the collection. The Art Dealers and The Brokers' Redraw already do. This review proposes no new shared card.

---

## What I could not verify

- **How many great people a human Magisterial seat gains.** The figure of 12 or more is arithmetic from renown income. The only bot figures in the docs come from before the ladder changed. `docs/playtest_notes.md` has no entry for the Magisterial games, so your message is the only playtest source.
- **Whether a free great-person draft raises the price of the next one.** I did not trace `Player.greatPeopleRecruited` through the free grants.
- **Whether The Divine Proportion doubles The Processional Way's line on a work hex.** It is my reading of the amplifier. The 276 figure depends on it. Without it the full set is 216.
- **Whether The Mausoleum reaches a wonder under The Spirit Way.** My reading of `wonderWorkYieldLines` is that it does not, because that function multiplies card lines only.
- **Whether a windfall of production (The Overseers of Works, an engineer's act) is raised by "production toward wonders" bonuses.** The chain in section 1.1 is larger if it is.
- **Option 2 for The Mausoleum:** whether a building's `wholePercent` line reads a `hasBuilding` scope.
- **The Anteroom:** whether the count of unseated Orders is open to a `pays` line. **The Second Summons:** what happens when it and The Collected Works are both seated.
- **Wonder costs other than The Mausoleum's 292.** They follow the same formula from each wonder's technology column, and I did not list each one.
- **All power figures.** No test, bot game or measurement was run. The power bar itself predates the changes of November.
- **Capture rules for Pax Romana's suggested text.** I did not read what a captured town keeps.
