# Magisterial: five builds, early and late, and the type sort (proposal)

**Status:** first draft, 2026-10-17. Nothing here is built. The deck sheet (`docs/decks/magisterial.md`) and the data are unchanged. This is stages 1, 2 and 7 of the card-design skill's deck pass: the map, the finished builds and the card types. The sheet (stage 3) waits for your review.

The user's request that started the pass, 2026-10-17, verbatim:

> *"could you do the same builds/card-design skill treatment for the remaining decks? commerce science magisterial and devotion"*

The method is the one you approved for Dominion (`docs/plans/dominion-builds.md`) and used for Expansionist (`docs/plans/expansionist-builds.md`): one loop per build on a quantity the playstyle makes by itself, an early and a late version, an early scaler that carries over, a Tier III capstone and a moment, the three essentials from the build's own quantity, and new cards wherever the sheet has a gap.

## How to read this

- **Chairs:** 3 at the start, 5 from draft 4 (Tier I), still 5 at draft 10 (Tier II), 8 from draft 18 (Tier III) and 11 from draft 26 (Tier IV). Each Order tier also needs its research age: age 2 for Tier I, age 3 for Tier II, age 4 for Tiers III and IV.
- **The early build** sits in five chairs through Tiers I and II, so each build names its Tier I council and its Tier II council. **The late build** has eight chairs at Tier III and eleven at Tier IV.
- **Governments come by draft count alone,** and the Order tiers wait for the research age too (`docs/plans/draft-pacing-2026-10-17.md`, section 5). A Magisterial seat makes more culture than most, so it often adopts the eight-chair government at draft 18 while it still drafts Tier II cards. Where that happens, the build lists what fills the three extra chairs.
- **Charters and boons take no chair.** A charter ("Once drafted, … No chair required.") works from the moment it is drafted. A boon ("On draft: …") pays once and then sits in the collection. Both count toward the cards that read the collection.
- **Status:**
  - *built*: in the data and dealt, as the sheet writes it;
  - *built, sheet revises*: in the data, and the sheet of 2026-10-06 changed its text, which is not applied yet;
  - *deferred*: in the data, not dealt;
  - *sheet*: on the sheet since 2026-10-06, not in the data;
  - **new**: this pass.
- **Shape:** *existing* names the effect kind that already says it; *nearly existing* names the small thing missing; *new shape* says what is missing. The families are under "Across the builds".
- **Type:** Military, Economic, Civic or Wildcard, by `docs/plans/doctrines-governments-chairs.md` section 4. A Wildcard card fits only a Wildcard chair; any card fits a Wildcard chair.
- **Chairs line:** each council names the government that seats most of it.
- **Numbers are first guesses** against `.claude/skills/card-design/references/power-bar.md`. Your priority is shape.

## Five facts that shape every build

1. **The data deals the old deck.** Of the 77 Magisterial rows, the sheet keeps 16 (three of them deferred) and cut 61. 49 of the cut rows are still dealt. None of the sheet's other 45 cards is built. So a Magisterial seat today draws mostly the flat culture-building cards the sheet of 2026-10-06 cut.
2. **A draft comes every 7 or 8 turns, all game.** In the bot games after the rung fix a seat drafted about 6 times from Tier 0, 5 from Tier I, 9 from Tier II and 3 from Tier III, and 25 times in 200 turns. A hand costs about 38 culture at draft 4, 182 at draft 10, 606 at draft 18 and 1,300 at draft 26. Bots passed one hand in 881.
3. **Science opens Magisterial's tiers.** Its culture brings drafts and governments early, but each Order tier also waits for the research age. So the cards that turn the deck's own quantities into science (The Disputation, The Encyclopedia, The Roll of Masters, The Book of Marvels, The Laureate, The Learned Patron) also bring the next tier sooner.
4. **The deck's rule cards are Wildcard.** By the sort's rule a card that acts on other cards or on the draft is Wildcard, as The New Code is. Every government has one Wildcard chair until tier 18. So each early build holds at most one standing Wildcard card, and the five draft privileges become charters.
5. **The moments are rare.** A hand comes every 7 or 8 turns, a great person every 15 to 25, a wonder every 20 to 30. So a payout on these moments is a lump sized to the moment (most pay from the hand's culture cost, which grows with the game), and growers and "this game" counts carry each build across the bands.

## The builds at a glance

| Build | The loop | The moment | Early scaler | Tier III capstone | Tier IV |
|---|---|---|---|---|---|
| **The Salon** | reroll or pass a hand → each refusal pays science, production and renown → the pay brings the next hand sooner | a reroll; a pass | The Jury's Register | The Second Sitting | The Grand Salon, The Long Deliberation |
| **The Cabinet** | draft → the card pays as it arrives and joins the collection → the collection pays → the next draft comes sooner | a card drafted | The Catalogue | The Connoisseurs | The Universal Library, The Polymath's Study, The Grand Retrospective |
| **The Patrons** | earn renown → call a great person → act or lay a work → the legacy and the cards pay → the next person comes sooner | a great person gained or spent | The Roll of Masters | The Universal Genius | The Immortals, The Last Commission, The Royal Invitation |
| **The Marvels** | pour production into a wonder → it pays the whole empire and deals a hand → the wonders held raise the next | a wonder finished | The Book of Marvels | Magnificence | The Magister's Court, The Hall of Wonders, The Bulwark of Marvels |
| **The Landscape** | culture grows the borders → works laid on the new ground claim the land around them → works set in patterns pay more → more culture | a work laid down; a garden made | The Gazetteers | The Divine Proportion | The Processional Way, The Pull of the Masters, Commission: The Ideal City |

**The base** under all five is the culture engine and conversion: culture buildings make culture, and conversion cards turn a share of it into production, science and gold. It is the deck's glue (see "The base").

**Every build feeds the draft.** That is the deck's thread. The Salon is paid for refusing hands; the Cabinet for taking them; the Patrons' great people pay culture (The Laurel Crowns); the Marvels' wonders deal free hands (The Unveiling) and bigger hands (The Hall of Wonders); the Landscape's Ideal City deals two.

---

## The map

### The deck's materials

"Self-producing" means a Magisterial game makes it whether or not a card asks. These are the best anchors.

| Material | Self-producing? | Where it lives in the sim | On the sheet today |
|---|---|---|---|
| **Culture** | Yes, and this deck makes the most | `Player.culturePool` is the draft pool; `City.culture` is the separate border channel | The Repertory, the conversion cards; the cut culture-building flats |
| **Drafts and the collection** | Yes: a draft every 7 or 8 turns, and a drafted card never leaves the collection (ruling (qqqqqq) 9) | `PlayerStatecraft.drafts`, `.orders`, `.slots`; counts `slottedOrders`, `unslottedOrders` | The Encyclopedia, The Universal Library, the boons, the draft payers |
| **Rerolls** | Partly: paid in faith; open from Chronology (age 2), or at once with the `rerollOffers` rule | `explainRerollCost`: 35 faith, ×1.6 in age 3 and ×2.2 in age 4, ×1.35 for each reroll under this government; `rerollsTaken` is zeroed on adoption; `SlottedOrder.rerollsSeen` | The Second Reading, The Critics' Circle, The Salon des Refusés, The Disputation |
| **Passes** | Rare: a pass gives up the card | `skipOrderOffer`; a pass counts as a draft, spends the culture and makes the next hand likelier to hold a rare (`skipPity`); the `draftPassed` occasion (Dominion batch D5) | The Patient Eye, The Unwritten Chapter, The Archive, The Long Deliberation |
| **Chairs and seating** | From the government | `chairCount`, `slotRider`, `chairsWon` (a commission's lasting chair); seals last 5 turns | The Antechamber, The Rotating Chairs, The Swearing-In, The Patron's Choice, The Senate Charter |
| **Great people and renown** | Yes: every empire earns renown | the renown ladder (75, 301, 531, 771, 1,023, 1,290…); counts `greatPeopleGained` and `greatPeopleCalled`; tally `greatPersonSpent`; occasions `greatPersonGained` and `greatPersonAct`; legacies | The Laureate, The Honoured Dead, The Living Canon, The Wandering Muse, The Last Commission |
| **Great-person works** | With great people | six works: Landmark (+3 culture), Academy, Manufactory, Customs House, Citadel and Holy Site (the last two claim the tiles beside them); the `greatWork` and `beside` tile tests | The Laureate, The Siting Masters, The Quarter of Masters, The Masters' Domain, The Processional Way |
| **Wonders** | With production, and races can be lost | 27 world wonders; counts `wonders` and `worldWonders`; the `hasWonder` scope; `completion` with `wonder` | The Guild of Masons, The Wonder Commonwealth, The Unveiling, The Golden Age |
| **Culture buildings** | Yes, but one of each kind per town | `buildingsOfCategory` culture: Monument, Amphitheater, Garden, Forum, Baths and more | The Repertory, The Temple of the Muses, Master Masons, The Markstones; the gates of the conversion cards |
| **Borders** | Yes, by border culture | the `borderCulture` and `borderCost` rules; `settleBorderWindfall`; `tilesInBorders` | The Markstones, The Landmark Bounds, The Paradise Garden, The Pull of the Masters |

### Five builds and the base

Each row is a section below, and the sources are its cards.

| Build | Leans on | Science from | Culture from | Production from |
|---|---|---|---|---|
| **The Salon** | rerolls, passes, faith | refusals (The Disputation, The Unwritten Chapter, The Hanging Committee) | The Critics' Circle, The Jury's Register | rerolls (The Atelier) |
| **The Cabinet** | drafts, the collection, boons | the bench (The Encyclopedia, The Long Gallery, The Polymath's Study) | drafts (The Accessions Register), the bench | boons (Gifts at Court), drafts, The Catalogue |
| **The Patrons** | renown, great people, legacies | The Laureate, The Portrait Gallery, The Roll of Masters, The Honoured Dead, scholars' acts | The Laureate, The Laurel Crowns, artists' acts | The Roll of Masters, The Honoured Dead, The Living Canon, engineers' acts |
| **The Marvels** | wonders | The Keepers of Wonders, The Book of Marvels | the same two, and The Golden Age | toward wonders; The Golden Age, The Wonder Commonwealth |
| **The Landscape** | works, land, how works are laid out | The Laureate, Academies, The Garden Courts, The Processional Way | Landmarks, The Siting Masters, The Quarter of Masters | The Gazetteers, The Masters' Domain, Manufactories |
| **The base** | culture buildings, culture | The Learned Patron | The Repertory | The Working Court, Civic Granaries, Master Masons |

### How the deck pairs with the other five

The currency test (`docs/decks/deck-design.md`): Magisterial makes culture and spends it on drafts.

- **Dominion, the triumph** (Emperor Taizong). Dominion gives great generals and citadels (works that already claim land), towns captured with their works and wonders (Looted Art's renown, The New Code's free hand, The Ideal City counts captured wonders) and Military cards for the chairs Magisterial cannot fill. Magisterial gives boons (The Sword of State), conversion and wonders. Best with the Patrons and the Landscape (generals, citadels) and the Cabinet (free hands from captures). Shared: The Sword of State, Examinations of State, Looted Art and The New Code, whose Dominion-sheet types stand. The Imperial Examinations and Triumphal Arches, cut on this sheet, still have data rows (question 9).
- **Expansionist, shaping territory** (no leader). Expansionist gives land and tended tiles (a garden's sides), engineers and Manufactories (The Master Builders, A Court of Engineers) and wonder production (The Pyramid Builders, The Builders' Levy, The Topping Out). Magisterial gives culture, Expansionist's gap, and works that claim land. Best with the Landscape and the Marvels. Shared: Garden Cities, Garden Provinces and The Sculpted Landscape, all Civic; you confirmed the shared types on 2026-10-16.
- **Commerce, the art market** (Zheng He). Commerce gives gold that buys draft actions (The Brokers' Redraw's gold rerolls; The Subscription List), merchants and Customs Houses, and foreign routes (Travelling Players, The Cosmopolitan Court). Magisterial gives culture turned into gold (The Performers' Treasury) and boons. Best with the Cabinet and the Salon. Shared: Travelling Players, The Art Dealers and The Cosmopolitan Court, typed here to reconcile with the Commerce pass.
- **Devotion, the cathedral** (Akhenaten, Hildegard of Bingen). Devotion gives faith, which is what a reroll costs, and holy sites (works that claim land; holy-site towns build wonders faster). Magisterial gives wonders and culture. Best with the Salon (faith rerolls), the Marvels (Sacred Commissions, The Rising Nave) and the Landscape. Shared: Sacred Commissions, Sacred Patronage (deferred) and The Rising Nave, typed here to reconcile with the Devotion pass. It was the weakest pair measured on 2026-10-13 (cards paid 6 to 19% of the seat's yield).
- **Scientific, the academy** (Hypatia). Scientific gives charters (each counts as a draft for The Court Painter and The Accessions Register, and adds a deck to The Polymath's Study), scholars and Academies, and science, which opens Magisterial's tiers. Magisterial gives more drafts, and rerolls to find the charter it needs. Best with the Cabinet, the Salon and the Patrons. Shared: Illuminated Treatises and The House of Wisdom, typed here to reconcile with the Scientific pass.

### Leaders

Magisterial has five leaders (only Devotion has more, with six), and Ibn Battuta draws on every deck.

| Leader | Decks | Ability points at | Builds it colours | Cards behind it |
|---|---|---|---|---|
| Hypatia | Scientific, Magisterial | +25% renown; great-person works pay half again | the Patrons, the Landscape | The Court Painter, The Prodigy, The Laureate, The Siting Masters, The Gazetteers |
| Akhenaten | Devotion, Magisterial | holy-site towns build wonders 20% faster; +1 faith on watered farms | the Marvels; faith for the Salon | The Guild of Masons, The Book of Marvels, Sacred Commissions |
| Hildegard of Bingen | Devotion, Magisterial | towns keeping a rite gain +20% culture; +2 culture and +2 production for each faith building | the base | the conversion cards, which read the culture she adds |
| Emperor Taizong | Dominion, Magisterial | melee strength and movement; garrisoned towns gain +1 happiness and +15% culture | colour only | Examinations of State (shared) |
| Zheng He | Commerce, Magisterial | ships; coastal routes pay +2 gold and +1 culture | colour only | Travelling Players, The Cosmopolitan Court (shared) |
| Ibn Battuta | every deck | one more chair; the first redraw of every hand is free | the Salon, the Cabinet | The Second Reading does what his redraw does |

- No Magisterial leader points at the draft, the deck's own subject. Ibn Battuta does, for every deck.
- Taizong and Zheng He have fewer than three Magisterial cards on their theme (the skill's floor); their themes live in their other decks.

### Where the sheet is thin

- **The data is behind the sheet** (fact 1). The cut rows are strong alone: the bot games of 2026-10-13 measured The National Galleries at 600 a turn (the best card measured in any deck), The Court Archives at 165 and The Civic Faith at 124. They go because they pay on a count that stops at one building of each kind per town and change no decision, not because they are weak. So the builds must replace that power with engines.
- **The sheet predates** the builds method, the typed chairs, the rung fix and the removal of the governments' reward hands. It uses the old statuses (built, revised, new), and five of its cards still deal "reward hands".
- **By tier:** Tier 0 is eleven commons, so the first six drafts hold no card that changes how the deck plays. Tier IV holds 11 rares of 15, and three of the deck's best engine cards sat there (The Disputation, The Grand Salon, The Envious Eye).
- **By role:** one grower (The Critics' Circle, capped at +10) and one count across the game (The Honoured Dead). Nothing early keeps paying late.
- **Works come late:** the first great person arrives around turn 30 to 60 and the third around turn 100, so the cards that read works do little for most of the early game.
- **Military:** one card (The Bulwark of Marvels, Tier IV), and the shared The Sword of State.
- **No Doctrines yet.** They come after the sheet, one direction for each build.

---

## 1. The Salon

**The fantasy.** The Paris Salon and its Salon des Refusés, the Royal Academy's hanging committee, the Venetian councils that drew lots until the right name came up. A court that is never content with the first hand it is shown. It asks for another hand, sends hands back, and is paid each time it refuses.

**The loop:** reroll or pass a hand → each reroll and each pass pays science, production, culture or renown → that pay brings the next draft sooner and pays for the next reroll → more hands to refuse.
- **The quantity:** hands rerolled or passed. A seat is dealt about 25 hands in 200 turns, and this build acts on most of them.
- **The moments:** a reroll and a pass.
- **What it spends:** faith on rerolls, and the card it does not take when it passes. A pass still counts as a draft: it spends the culture, moves the draft count, and makes the next hand likelier to hold a rare.
- **One rule for its payers:** each pays at most once a hand, in proportion to the culture the hand cost. So the payout grows with the game, and a free hand pays nothing. The sheet's The Disputation paid every reroll its faith price, so the best play was to reroll until the faith ran out: a chore and a faith converter at once. Here a second reroll is only for finding a better card.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Second Reading | 0 | common | The first reroll of each Order hand costs no faith. | opener | raises rerolls | none | Wildcard | sheet; existing (`rerollOffers`, the Rihla's rule, which also opens rerolls before Chronology) |
| The Critics' Circle | 0 | common | +1 science and +1 culture for each Order hand you have rerolled while this is seated, at most +10 of each. | grower | reads hands rerolled | science, culture | Civic | sheet; existing (`rerollsWhileSlotted`, counted once a hand) |
| The Temple of the Muses | 0 | common | Culture buildings give +2 faith each. | utility: faith for rerolls | raises faith | faith | Civic | built |
| The Disputation | I (from IV) | uncommon (was rare) | The first time you reroll each Order hand, gain science equal to half the culture the hand cost. | pay-off: the reroll | reads rerolls | science | Civic | sheet, moved and revised (was: science equal to each reroll's faith price); new shape (a reroll moment that carries the hand's cost) |
| The Atelier | I | common | The first time you reroll each Order hand, your capital gains production equal to half the culture the hand cost. | pay-off: the reroll | reads rerolls | production | Economic | **new**; new shape (the same reroll moment) |
| The Unwritten Chapter | I | common | Each time you pass on an Order hand, gain science equal to half the culture it cost. | pay-off: the pass | reads passes | science | Civic | sheet; nearly existing (a `draftPassed` rider; the pass must carry the hand's cost) |
| The Jury's Register | II | uncommon | +1% science and culture for each Order hand you have rerolled or passed this game, at most +30%. | early scaler | reads hands refused this game | science, culture | Civic | **new**; new shape ("this game" count: hands rerolled or passed) |
| The Salon des Refusés | II | uncommon | Once drafted, you may reroll an Order hand with culture instead of faith, at twice the faith price. No chair required. | changes what the player does | raises rerolls | none | Wildcard | sheet, revised into a charter; new shape (culture as a reroll bank; the redraw command already takes a bank) |
| The Archive | II | rare | Once drafted, when you pass on an Order hand you may keep one card from it, unseated. The hand then counts as drafted, not passed. No chair required. | build-defining: a pass that keeps a card | turns a pass into a card | none | Wildcard | sheet, revised into a charter; new shape (one card kept from a passed hand) |

- **Tier I council (five):** The Second Reading, The Critics' Circle, The Temple of the Muses, The Disputation, The Atelier. The Priest-King seats four: The Second Reading in its Wildcard chair, The Atelier in its Economic chair and two of the three Civic cards. Its Military chair goes to the partner.
- **Tier II council (five):** The Second Reading, The Disputation, The Jury's Register, The Unwritten Chapter, The Atelier, with the two charters held off the council. The Critics' Circle has reached its cap and gives way. The Theocracy seats four (no Economic chair); the partner takes its Military chair.
- **With eight chairs before Tier III:** add Commission: The Salon Season and the partner's two Military cards. Divine Mandate seats all eight, and its ability (+1 faith and +1 culture in the capital for each Civic Order seated) pays for rerolls.
- **Sizing:**
  - **The Disputation and The Atelier:** a seat spends about its culture income on hands, so each pays about half that income in its own yield: about 10 to 20 a turn in Tier I, 25 to 40 in Tier II and 40 to 60 in Tier III. That is the band's regular card, and it grows with the hand's price.
  - **The Jury's Register:** about +10% when Tier II opens, +20% by turn 150, +30% by about turn 200. A Magisterial seat drafts more hands, so it reaches the cap sooner.
  - **The Critics' Circle:** +6 of each by the end of Tier 0, the cap during Tier I.
- **How a few turns feel:**
  - Turn 15: the second hand of the game holds nothing the seat wants. The Second Reading asks again for nothing, and The Critics' Circle reads +2.
  - Turn 70: every Tier I hand is rerolled once for free. Each time The Disputation pays about 60 science, and The Atelier puts 60 production into the capital's Amphitheater.
  - Turn 110: a Tier II hand of three commons. The seat passes: The Unwritten Chapter pays 180 science, and the next hand is likelier to hold a rare. In the next hand only one card is worth having, so the seat passes again and keeps it through The Archive. That counts as a draft, so this pass pays nothing: the choice is real.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Jury's Register | II | uncommon | (above) | carried scaler | reads hands refused | science, culture | Civic | **new** |
| The Disputation | I | uncommon | (above) | carried: grows with the hand's price | reads rerolls | science | Civic | sheet |
| The Atelier | I | common | (above) | carried | reads rerolls | production | Economic | **new** |
| The Second Sitting | III | rare | Each time you pass on an Order hand you paid culture for, a free Order hand opens at once. | capstone: a pass costs no card | raises passes | a hand | Wildcard | **new**; nearly existing (a `draftPassed` rider with `freeDraft`, as The New Code opens one; a free hand passed opens nothing more) |
| The Prix de Rome | III | uncommon | After you pass on two Order hands in a row, your next Order hand deals only rare cards. | the moment | reads passes in a row | a hand of rares | Wildcard | **new**; new shape (a hand dealt from one rarity; the run of passes is `orderSkips`) |
| The Hanging Committee | III | common | Your capital gains +2 science and +2 culture for each Order hand you have rerolled or passed this game, at most +50 of each. | pay-off: flats under the percentage | reads hands refused this game | science, culture | Civic | **new**; new shape (The Jury's Register's count) |
| The Long Deliberation | IV | uncommon | Each time you pass on an Order hand, gain renown equal to half the culture it cost. | pay-off: the pass | reads passes | renown | Civic | sheet; nearly existing (the pass's cost) |
| The Grand Salon | IV | rare | Cards that pay you for rerolling, passing, drafting or seating a card pay 50% more, caps included. | the doubler | reads every draft-action payer | none | Wildcard | sheet; new shape (an amplifier that picks payers by the moment they pay on) |
| The Unwritten Chapter | I | common | (above) | carried | reads passes | science | Civic | sheet |

- **Carried over:** The Jury's Register (+20 to +30%), and The Disputation and The Atelier, whose pay grows with the hand's price: about 300 to 600 each a hand in Tier III.
- **The capstone, The Second Sitting:** a pass no longer costs a card. A paid hand can be refused for its pass payers, and the free hand still gives a card. The free hand does not move the draft count, and passing it opens nothing more.
- **The moment, The Prix de Rome:** with The Second Sitting, pass the paid hand, pass the free hand too, and the next hand is three rares. If fewer rares are left in the tier, the rest of the hand is dealt as usual.
- **Tier III council (eight):** The Jury's Register, The Disputation, The Hanging Committee, The Atelier, The Second Sitting, The Prix de Rome, and the partner's two Military cards. Divine Mandate seats it exactly.
- **Tier IV council (eleven):** add The Long Deliberation, The Grand Salon and The Working Court (the base). The Curia seats nine; its two Military chairs go to the partner.
- **How a few turns feel:**
  - Turn 155: a paid Tier III hand cost 900 culture. The seat passes: The Unwritten Chapter pays 450 science and The Long Deliberation 450 renown. The Second Sitting opens a free hand at once, and the seat drafts from it.
  - Turn 170: the seat passes the paid hand and then the free hand. The next hand is three rares.
  - Turn 185 (Tier IV): The Grand Salon raises every one of these payers by half.
- **If the seat never reaches draft 26,** the eight-chair council is the finished build, with its capstone and its moment. The eleven chairs and the Tier IV cards arrive together, at draft 26.

**Utility mix:** science (The Disputation, The Unwritten Chapter, The Hanging Committee, the Register), culture (The Critics' Circle, The Hanging Committee, the Register), production (The Atelier), renown (The Long Deliberation), faith (The Temple of the Muses).

**Gives up:** cards (every pass gives up a hand), faith, and steady pay: it earns in lumps when a hand is dealt.

**Partners:** Devotion (faith pays for rerolls), Commerce (gold rerolls through The Brokers' Redraw; The Art Dealers), Scientific (rerolls find the charter it needs).

**Leader:** none of the Magisterial leaders points here. Ibn Battuta plays it best (a free first redraw of every hand, and an extra chair). Akhenaten's farm faith pays for rerolls.

**Alternatives:**
- early: The Patient Eye (Tier 0: a pass returns 25% of its culture), Commission: The Salon Season (Tier I), The Rotating Chairs;
- the opposite plan: Officials by Merit (bigger hands, no rerolls) is the pivot to the Cabinet, and The Archive is the bridge.

---

## 2. The Cabinet

**The fantasy.** The cabinets of curiosities of Renaissance princes, the Medici collections, the Library of Alexandria copying every book that came into port. The court collects. Every card it drafts pays once as it arrives, and the shelf of cards it does not seat pays too.

**The loop:** draft → the card pays once as it arrives and joins the collection → the collection pays production, culture and science → the next draft comes sooner.
- **The quantity:** Orders held, seated or not. It grows with every draft and never shrinks.
- **The moment:** a card drafted (the boons and the draft payers).
- **What it spends:** chairs. Its boons and charters sit on the bench, so its chairs go to the cards that read the bench.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| Gifts at Court | 0 | common | On draft: your capital gains 40 production. Seated, this card does nothing. | boon | raises the collection | production | Economic | sheet; new shape (on-draft boons beyond a unit) |
| The Court Painter | 0 | common | Each card you draft grants 15 renown. A charter counts. | pay-off: the draft | reads drafts | renown | Civic | sheet, revised (was 5 renown); new shape (the draft moment) |
| The Encyclopedia | I (from II) | common | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. | pay-off: the bench | reads unseated Orders | science, culture | Civic | sheet, moved; existing (`unslottedOrders`) |
| The Accessions Register | I | uncommon | Each card you draft grants 20 culture and 20 production in your capital. A charter counts. | pay-off: the draft | reads drafts | culture, production | Civic | sheet; new shape (the draft moment) |
| The Wandering Muse | I | uncommon | On draft: gain a random great person of your age, of any family. It counts as called. Seated, this card does nothing. | boon | raises great people | a great person | Civic | sheet; new shape (an on-draft great person) |
| The Open Door | I | uncommon | Order hands cost 15% less culture. | engine: more drafts | raises drafts | none | Wildcard | sheet, revised (was 10%); new shape (a discount on the draft's price) |
| The Catalogue | II | uncommon | +1% production and gold for each Order you hold, at most +30%. | early scaler | reads Orders held | production, gold | Economic | **new**; new shape, small (a count of Orders held, seated or not) |
| The Subscription List | II | uncommon | Once drafted, you may pay gold into your draft pool: every 3 gold counts as 1 culture. No chair required. | changes what the player does | raises drafts | none | Wildcard | sheet, revised into a charter; new shape (gold paid into the draft pool) |

- **Tier I council (five):** The Court Painter, The Encyclopedia, The Accessions Register, The Open Door, The Working Court (the base). On the bench: Gifts at Court and The Wandering Muse. The Priest-King seats four (two Civic cards, The Open Door and The Working Court); its Military chair goes to the partner.
- **Tier II council (five):** The Catalogue, The Encyclopedia, The Accessions Register, The Open Door, The Working Court; The Subscription List held off the council. The Republic seats four (it has one Civic chair).
- **With eight chairs before Tier III:** add The Court Painter and the partner's Military card, and seat The Swearing-In in the extra chair The Antechamber opens while held. The Merchant League seats them.
- **Sizing:**
  - **Gifts at Court:** 40 production at turn 20 is about eight turns of an age 1 town.
  - **The Court Painter:** six Tier 0 drafts pay 90 renown, more than the first great person's 75.
  - **The Encyclopedia:** about +5 of each in Tier I and +10 by the end of Tier II.
  - **The Catalogue:** about +10% when Tier II opens (ten Orders held), +20% by turn 150, the cap late. About 25 production and gold a turn in age 3, and about 190 in age 4.
- **How a few turns feel:**
  - Turn 15: the first hand holds Gifts at Court. Drafted, it puts 40 production into the capital's Monument at once and never takes a chair.
  - Turn 60: The Wandering Muse brings a great scholar. The Accessions Register pays on that draft too, and The Court Painter's renown brings the next person nearer.
  - Turn 110: twelve Orders held and seven on the bench. The Encyclopedia pays +7 science and +7 culture, and The Catalogue +12% production and gold.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Catalogue | II | uncommon | (above) | carried scaler | reads Orders held | production, gold | Economic | **new** |
| The Encyclopedia | I | common | (above) | carried | reads unseated Orders | science, culture | Civic | sheet |
| The Connoisseurs | III | rare | You may draft a second card from each Order hand by paying its culture cost again. | capstone: a broken rule | raises drafts | none | Wildcard | **new**; new shape (a second pick from one hand; it counts as a draft) |
| The Long Gallery | III | uncommon | Each town gains +1 science and +1 culture for every four Orders you hold. | pay-off: flats in every town | reads Orders held | science, culture | Civic | **new**; new shape, small (The Catalogue's count) |
| The Grand Lottery | III | uncommon | On draft: one of these at random: a free Order hand, a great-person hand, or 500 culture, 500 faith or 500 production in your capital. Seated, this card does nothing. | the moment | raises drafts | varies | Civic | sheet, revised (was 150 of each); new shape (a random boon; the free hand exists as `freeDraft`) |
| The Cabinet of Curiosities | III | rare | On draft: add a random card from any deck to your collection, from the cards the game rates most helpful to you. Seated, this card does nothing. | boon from another deck | raises Orders held and decks held | none | Wildcard | sheet; new shape (a card granted from another deck's pool) |
| Officials by Merit | III | rare | Order hands deal two extra cards. You cannot reroll Order hands. | engine: better picks (the Salon's opposite) | raises choice | none | Wildcard | sheet; nearly existing (`offerRider`, and a rule that refuses the reroll) |
| The Universal Library | IV | rare | The town building the Magnum Opus gains +2% production toward it for each Order you hold, at most +40%. | finisher: the win | reads Orders held | production toward the Opus | Economic | sheet; existing (the shape of Commerce's The World's Exchange) |
| The Polymath's Study | IV | rare | Your towns gain +8% science and +8% production for each different deck among the Orders you hold, at most +40%. | pay-off: breadth | reads decks held | science, production | Civic | sheet; new shape (a count of decks held) |
| The Grand Retrospective | IV | rare | On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing. | the late moment | reads the collection | culture, science, production | Civic | sheet; new shape (an on-draft boon) |
| The Grand Salon | IV | rare | (the Salon's) | the doubler for the draft payers | reads every draft-action payer | none | Wildcard | sheet |

- **Carried over:** The Catalogue (the +30% cap by Tier III) and The Encyclopedia (its +15 cap).
- **The capstone, The Connoisseurs:** two cards from one hand. Both pay the boons and the draft payers, and both join the collection. Culture is the price, and this deck has the most.
- **The moment:** The Grand Lottery (Tier III) and The Grand Retrospective (Tier IV): one draft that pays big.
- **Tier III council (eight):** The Catalogue, The Encyclopedia, The Long Gallery, The Accessions Register, The Connoisseurs, Officials by Merit, and the partner's two Military cards. Divine Mandate seats it exactly. On the bench: The Grand Lottery, The Cabinet of Curiosities and every earlier boon.
- **Tier IV council (eleven):** add The Polymath's Study, The Universal Library and The Grand Salon. The Curia seats nine.
- **Sizing:**
  - **The Connoisseurs:** a Tier III hand costs 600 to 1,400 culture, so a seat with 300 culture a turn takes a second card about every other hand. Each second card counts as a draft, so the next hand costs more.
  - **The Long Gallery:** 24 Orders held give +6 of each in every town: about 120 a turn across ten towns.
  - **The Polymath's Study:** a seat's own hands reach three decks (its two and the common pool), +24%. The Cabinet of Curiosities and Scientific's charters add more.
  - **The Grand Retrospective:** eight wonders, eight works and 25 Orders pay 820 of each.
- **How a few turns feel:**
  - Turn 150: a Tier III hand holds two cards the seat wants. It pays the hand's 700 culture a second time and takes both.
  - Turn 160: The Grand Lottery comes up a free hand, and that pick pays the draft payers again.
  - Turn 185 (Tier IV): The Grand Retrospective arrives and pays 800 culture, science and production at once.
- **If the seat never reaches draft 26,** the eight-chair council is the finished build, with its capstone and its moment.

**Utility mix:** production (Gifts at Court, The Accessions Register, The Catalogue, The Universal Library), science and culture (The Encyclopedia, The Long Gallery, The Polymath's Study), renown (The Court Painter), great people (The Wandering Muse), gold (The Catalogue).

**Gives up:** depth. Its chairs hold readers, not engines, and its boons pay once.

**Partners:** Scientific (charters count as drafts, and add decks to The Polymath's Study), Commerce (The Subscription List's gold, the shared The Art Dealers), Dominion (the shared The Sword of State is a boon; The New Code opens free hands).

**Leader:** none of the Magisterial leaders points here. Ibn Battuta's extra chair suits it.

**Alternatives:** the seat family: The Swearing-In (Tier I: 15 culture each time you seat a card, once per card per government), The Rotating Chairs (Tier I: shorter seals), The Patron's Choice (Tier III: you choose what it pays), The Senate Charter (Tier II: its Assembly Hall pays for each Wildcard card seated). Also The Antechamber (Tier II: an extra Wildcard chair while held) and The Archive (the Salon's bridge).

---

## 3. The Patrons

**The fantasy.** The Medici household, Baghdad's House of Wisdom, the Mughal workshops, the Museion of Alexandria. A court that calls the great of every kind (painters, scholars, engineers, merchants and generals) and keeps what each one leaves behind.

**The loop:** earn renown → call a great person → spend them, on an act now or a work for good → their legacy and the cards pay science, culture and production → the next person comes sooner.
- **The quantity:** great people gained this game (`greatPeopleGained`, written when a person is chosen and never lowered). Every empire earns renown; this build earns more.
- **The moments:** a great person gained, and a great person spent.
- **What it spends:** time, and the choice between an act now and a work for good.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Prodigy | 0 | common | +50% renown until you gain your first great person. | opener | raises great people | renown | Civic | **new**; new shape, small (a condition, "no great person gained yet", The Cornerstone's sibling) |
| The Court Painter | 0 | common | (the Cabinet's) | bridge: renown from drafts | reads drafts | renown | Civic | sheet |
| The Laureate | I | uncommon | Towns working a great-person work gain +5 culture, +3 science and +1 renown, once per town. | pay-off: works | reads works worked | culture, science, renown | Civic | built |
| The Portrait Gallery | I | uncommon | While seated, this card gains +2 science and +2 culture each time you spend a great person. It starts at +2 of each. | grower | reads great people spent | science, culture | Civic | **new**; existing (a grower on the `greatPersonSpent` tally) |
| The Pension List | I | uncommon | Once drafted, you may pay culture into your renown: every 2 culture counts as 1 renown. No chair required. | changes what the player does: a draft or a person | raises great people | none | Civic | **new**; new shape (culture as a bank, paid into renown) |
| The Roll of Masters | II | uncommon | +3% science and production for each great person you have gained this game, at most +30%. | early scaler | reads great people gained | science, production | Civic | **new**; existing (empire `pays` count `greatPeopleGained`) |
| The Twice-Told Act | II | uncommon | Your great people's acts pay 50% more. | engine: the act | reads acts | the act's yield | Civic | **new**; existing (`effectAmplifier` at `greatPersonAct`, no family) |
| Commission: The Patron's Gallery | II | uncommon | Commission. Goal: have great-person works of three different families in your borders. Reward: a great person of the family you choose, and 200 culture. Then it leaves its chair. | the goal | reads works by family | a great person, culture | Wildcard | sheet; existing reward (`greatPerson` narrowed to a family); the choice of family is new |

- **Tier I council (five):** The Court Painter, The Laureate, The Portrait Gallery, The Working Court (the base) and the partner's Military card. The Prodigy holds one of the Civic chairs until the first person arrives. The Pension List is held off the council, and The Wandering Muse sits on the bench. The Priest-King seats all five, with one Civic card in its Wildcard chair.
- **Tier II council (five):** The Roll of Masters, The Twice-Told Act, The Laureate, The Portrait Gallery, Commission: The Patron's Gallery. The Theocracy seats four (the commission takes the Wildcard chair); the partner takes its Military chair.
- **With eight chairs before Tier III:** add The Working Court and the partner's two Military cards. Divine Mandate seats all eight, with The Portrait Gallery in a Wildcard chair.
- **Sizing:**
  - **The Prodigy:** age 1 renown is about 2 to 5 a turn (a Library, a Barracks, an early wonder), so the first person comes about ten turns sooner.
  - **The Pension List:** at Tier II, a third of a 60-culture income buys 10 renown a turn. That is about what a seat earns in renown by itself at that point, so great people come about twice as fast, for about one draft in three.
  - **The Portrait Gallery:** +12 of each after five people spent, about turn 130.
  - **The Roll of Masters:** about +9% when Tier II opens (three people), +20% by turn 150, +30% late. Bots called 2 or 3 people by turn 100 and 5 or 6 by turn 150; this build should call about half again as many.
- **How a few turns feel:**
  - Turn 35: The Prodigy and The Court Painter bring the first great person, a writer, who lays down a Landmark beside the capital.
  - Turn 70: The Laureate pays +5 culture and +3 science in the capital. The seat pays 300 culture into its renown (The Pension List), and a great engineer arrives a draft early.
  - Turn 120: the fifth person, a merchant, acts for 180 gold, and The Twice-Told Act adds half again. The Portrait Gallery reads +12 and the Roll +15%.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Roll of Masters | II | uncommon | (above) | carried scaler | reads great people gained | science, production | Civic | **new** |
| The Portrait Gallery | I | uncommon | (above) | carried grower | reads great people spent | science, culture | Civic | **new** |
| The Universal Genius | III | rare | Each of your great people arrives with a second charge: it may act, and then also lay down a work. | capstone: a broken rule | doubles what each person gives | none | Civic | **new**; new shape (a second charge on great people, with one legacy for each person) |
| The Laurel Crowns | III | uncommon | When you gain a great person, gain culture equal to half the renown it cost. | the moment | reads great people gained | culture | Civic | **new**; nearly existing (a `greatPersonGained` rider; the occasion must carry the renown paid) |
| The Honoured Dead | III | uncommon | Your capital gains +2 science and +4 production for each great person you have spent this game, at most +30 science and +60 production. | pay-off: flats | reads great people spent | science, production | Civic | built, sheet revises (the data pays +6 and +12) |
| The Living Canon | III | rare | Your towns gain +4% food and +4% production for each great-person family whose legacy you hold, at most +20% each. | pay-off: breadth | reads legacy families | food, production | Economic | built, sheet revises (the data pays 8%, in towns with three culture buildings) |
| The Masters' Domain | III | uncommon | Worked great-person works gain +3 production and +3 food. Their towns gain +20% gold, once per town. | pay-off (the Landscape's bridge) | reads works | production, food, gold | Economic | built, sheet revises (the data pays +12 and 30%) |
| The Last Commission | IV | rare | Spending a great person grants the town building your Magnum Opus 150 production, at most once per turn. | finisher: the win | reads great people spent | production toward the Opus | Economic | deferred; new shape (one moment for a great person spent, by act or by work) |
| The Royal Invitation | IV | rare | Any great person of yours may be spent beside a rival town building the Magnum Opus. That town puts half as much production toward it for 5 turns. Each rival can be slowed this way once every 15 turns. | denial: slows a rival's Opus | spends great people | none | Civic | sheet; new shape (an act open to every family, and a timed effect on a rival town) |
| The Immortals | IV | rare | The legacies of your great people count twice. | the doubler | reads legacies | every legacy | Civic | **new**; new shape (a doubler on one source of standing effects) |

- **Carried over:** The Roll of Masters (+20 to +30%) and The Portrait Gallery (about +16 of each by turn 160).
- **The capstone, The Universal Genius:** a great person no longer chooses between an act and a work. A scholar pays eight turns of science and then lays down an Academy, and leaves one legacy. It also doubles the Landscape's supply of works.
- **The moment, The Laurel Crowns:** each person pays culture worth about a draft. The sixth costs 1,290 renown and pays 645 culture.
- **Tier III council (eight):** The Roll of Masters, The Portrait Gallery, The Universal Genius, The Laurel Crowns, The Honoured Dead, The Living Canon, and the partner's two Military cards. Divine Mandate seats all six Magisterial cards (five Civic, two of them in its Wildcard chairs), and its ability pays +1 faith and +1 culture for each Civic Order seated.
- **Tier IV council (eleven):** add The Immortals, The Royal Invitation and The Last Commission. The Curia seats nine.
- **How a few turns feel:**
  - Turn 150: a great scholar arrives. The Laurel Crowns pays 600 culture, enough for the next draft. The scholar acts for eight turns of science and then lays an Academy beside the Landmark.
  - Turn 165: the eighth person is spent. The Honoured Dead reads +16 science and +32 production in the capital.
  - Turn 185 (Tier IV): The Immortals is drafted, and every legacy counts twice.
- **If the seat never reaches draft 26,** the eight-chair council is the finished build, with its capstone and its moment.

**Utility mix:** science (The Laureate, The Portrait Gallery, the Roll, The Honoured Dead, scholars' acts), culture (The Laureate, The Portrait Gallery, The Laurel Crowns, artists' acts), production (the Roll, The Honoured Dead, The Living Canon, engineers' acts), gold (merchants' acts, The Masters' Domain).

**Gives up:** presence on the board. It builds few wonders and buildings of its own, and great people come slowly.

**Partners:** Scientific (scholars and Academies; The House of Wisdom; Hypatia), Commerce (merchants; The Cosmopolitan Court's renown), Dominion (generals and citadels; Looted Art's renown), Expansionist (engineers: The Master Builders, A Court of Engineers), Devotion (Sacred Patronage, deferred: faith buys great-person hands).

**Leader:** Hypatia (Scientific and Magisterial): +25% renown, and works pay half again.

**Alternatives:**
- The Wandering Muse (Tier I boon);
- two of your ideas from `docs/themes/09-the-court.md`: The Shortlist (each great-person hand comes with one free redraw; the `rerollOffers` rule already covers it) and The Farewell Games (spending a great person gives +3 happiness for 15 turns);
- shared: Looted Art, The Cosmopolitan Court, The House of Wisdom, Sacred Patronage.

---

## 4. The Marvels

**The fantasy.** The Seven Wonders, Angkor, Hagia Sophia, the Forbidden City. An empire remembered for what it raised. Each wonder finished is a festival for the whole empire, deals a new hand of cards, and makes the next wonder easier.

**The loop:** pour production into a wonder → finishing it pays the whole empire and deals a free hand → the wonders held raise culture, science and production → the next wonder.
- **The quantity:** wonders held (`wonders`), and the towns that hold them (`hasWonder`).
- **The moment:** a wonder finished (`completion` with `wonder`).
- **What it spends:** production, and the risk of a race lost. A rival who finishes first leaves only a gold refund, and only for the front row of the queue.

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Cornerstone | 0 | common | +30% production toward wonders until you complete your first. | opener | raises wonders | production | Economic | sheet, revised (the renown on the first wonder is dropped, for one effect); new shape, small (a condition, "no wonder completed yet") |
| The Guild of Masons | I | uncommon | +38% production toward wonders. Towns building a wonder lose 2 gold a turn. | engine with a drawback | raises wonders | production | Economic | built |
| The Unveiling | I | uncommon | Completing a wonder deals you a free Order hand. | the moment: a wonder feeds the draft | reads wonders finished | a hand | Wildcard | sheet, revised (the 30 culture is dropped, for one effect); existing (a `completion` rider with `wonder` and `freeDraft`) |
| The Keepers of Wonders | I | common | Each town gains +2 culture and +2 science for each wonder in it. | pay-off | reads wonders held | culture, science | Civic | **new**; existing (town `pays` count `wonders` within the town) |
| The Ceremonial Guard | I | common | Towns holding a wonder gain +5 defence. | utility: holding the marvels | none | defence | Military | **new**; existing (`cityStat` defence, `hasWonder` scope) |
| The Book of Marvels | II | uncommon | +5% culture and science for each wonder you hold, at most +30%. | early scaler | reads wonders held | culture, science | Civic | **new**; existing (empire `pays` count `wonders`) |
| The Golden Age | II | rare | Completing a wonder gives your towns +20% production and culture for ten turns. A later wonder starts the ten turns again. | the moment for the whole empire | reads wonders finished | production, culture | Civic | deferred, sheet revises; new shape (a timed empire effect started by a moment, restarted rather than stacked) |
| The Envious Eye | II (from IV) | uncommon | When a rival completes a wonder you were building, the production you put into it moves to the next item in that town's queue. | safety net: a race lost | none | production | Economic | sheet, moved and trimmed (its free hand is dropped, for one effect); new shape (a lost wonder's production moved) |

- **Tier I council (five):** The Cornerstone, The Guild of Masons, The Unveiling, The Keepers of Wonders, The Ceremonial Guard. The Council of Elders seats all five.
- **Tier II council (five):** The Book of Marvels, The Golden Age, The Keepers of Wonders, The Unveiling, The Ceremonial Guard. The Theocracy seats all five. A seat that keeps the Council of Elders seats The Guild of Masons and The Envious Eye in place of two Civic cards.
- **With eight chairs before Tier III:** add The Guild of Masons, The Envious Eye and the shared Sacred Commissions. The Merchant League seats all eight, with The Keepers of Wonders in a Wildcard chair.
- **Sizing:**
  - **The Cornerstone:** Stonehenge or the Pyramids about a quarter sooner, in the age when wonders are cheapest.
  - **The Keepers of Wonders:** a capital with three wonders gains +6 culture and +6 science.
  - **The Book of Marvels:** three wonders when Tier II opens give +15%; six wonders reach the cap.
  - **The Golden Age:** ten turns of +20% production and culture in every town is about 200 production and 170 culture in age 3, for each wonder.
  - **The Unveiling:** a free hand is a whole draft: about 180 culture at draft 10 and 600 at draft 18.
- **How a few turns feel:**
  - Turn 30: the capital raises Stonehenge with The Cornerstone's +30%. Once it stands, the card has done its job.
  - Turn 80: the Colossus is finished. The Unveiling deals a free hand, and the port gains +2 culture and +2 science.
  - Turn 120: a rival finishes the Great Library first, and The Envious Eye moves its 300 production into the next item. The next wonder starts The Golden Age's ten turns.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Book of Marvels | II | uncommon | (above) | carried scaler | reads wonders held | culture, science | Civic | **new** |
| The Golden Age | II | rare | (above) | carried: every wonder starts it again | reads wonders finished | production, culture | Civic | deferred |
| The Keepers of Wonders | I | common | (above) | carried | reads wonders held | culture, science | Civic | **new** |
| Magnificence | III | rare | You may buy a wonder you are building with culture, at one culture for each hammer it still needs. | capstone: a broken rule | raises wonders | production, from culture | Economic | **new**; new shape (culture as a bank; a wonder sold, as Commerce's The Gilded Scaffold sells one for gold) |
| Commission: The Wonder of the Age | III | uncommon | Commission. Goal: put 1,500 production into wonders or the Magnum Opus while this is seated. Production in a wonder a rival finishes first still counts. Reward: one extra Wildcard chair for the rest of the game, and 250 culture. Then it leaves its chair. | the goal | reads production into wonders | a chair, culture | Wildcard | sheet; existing reward (`wildcardChairs`, as A Victor's Peace); new goal figure (production put into wonders while seated) |
| The Wonder Commonwealth | III | rare | Towns holding a wonder gain +38% production and +38% food. Your other towns gain +15% culture. | pay-off: town percentages | reads wonder towns | production, food, culture | Economic | built |
| The Magister's Court | IV | uncommon | Towns holding a wonder gain +25% production toward the Magnum Opus. | finisher: the win | reads wonder towns | production toward the Opus | Economic | deferred, sheet revises; existing now (a production bonus toward one item, scoped to wonder towns; the old blocker went with the Cathedral half) |
| The Hall of Wonders | IV | rare | Order hands deal one extra card for every two wonders you hold, at most three extra. | wonders feed the draft | reads wonders held | none | Wildcard | sheet; nearly existing (`offerRider` with a count) |
| The Bulwark of Marvels | IV | uncommon | The town building your Magnum Opus gains +4 strength and +25 hit points for each wonder you hold, at most +24 strength and +150 hit points. | defending the win | reads wonders held | defence | Military | sheet; existing (the `raisingOpus` scope, `cityStat` for each wonder) |

- **Carried over:** The Book of Marvels (the cap with six wonders), The Golden Age and The Keepers of Wonders.
- **The capstone, Magnificence:** culture finishes wonders. A seat with 300 culture a turn can buy the last half of a 1,000-hammer wonder in two turns and win a race it would have lost. Each culture spent is a draft delayed.
- **The moment:** a wonder finished: a free hand (The Unveiling), ten turns of The Golden Age, and The Wonder of the Age's lasting chair.
- **Tier III council (eight):** The Book of Marvels, The Golden Age, The Keepers of Wonders, Magnificence, The Wonder Commonwealth, The Guild of Masons, Commission: The Wonder of the Age, The Ceremonial Guard. The Merchant League seats all eight.
- **Tier IV council (eleven):** add The Magister's Court, The Hall of Wonders and The Bulwark of Marvels. The Estates seat all eleven. When the commission is met it leaves its chair, and its reward adds a twelfth.
- **How a few turns feel:**
  - Turn 150: Notre-Dame is two-thirds built and a rival is close. The seat pays 600 culture to finish it. The Golden Age begins, and The Unveiling deals a free hand.
  - Turn 165: The Wonder of the Age is met: a twelfth chair for good.
  - Turn 190 (Tier IV): the Opus town holds four wonders: +16 strength and +100 hit points, and every wonder town builds the Opus a quarter faster.
- **If the seat never reaches draft 26,** the eight-chair council is the finished build, with its capstone and its moment.

**Utility mix:** production toward wonders, culture and science for each wonder, food (The Wonder Commonwealth), defence (The Ceremonial Guard, The Bulwark of Marvels), and free hands.

**Gives up:** production for anything else, and the races it loses.

**Partners:** Devotion (Sacred Commissions: holy-site towns build wonders faster; The Rising Nave pays as the work rises), Expansionist (the great works flavour: The Pyramid Builders, The Builders' Levy, The Topping Out), Scientific (The House of Wisdom: towns working an Academy build wonders faster).

**Leader:** Akhenaten (Devotion and Magisterial): towns with a holy site build wonders 20% faster.

**Alternatives:** the shared Sacred Commissions (Tier I), The Rising Nave and The House of Wisdom (Tier III); The Commissioned Works (the base).

---

## 5. The Landscape

**The fantasy.** The Persian paradise garden, the English landscape garden, Babylon's Processional Way. Monuments laid out on the land, so that the land itself becomes the work. Culture pushes the borders out, works laid at the edge claim the ground around them, and works set in patterns pay more than the same works scattered.

**The loop:** culture grows the borders → works laid on the new ground claim the tiles around them → works set side by side and in lines pay culture, science and production → more culture, wider borders.
- **The quantity:** great-person works in your borders, of any family (`tilesInBorders` with `greatWork`), and tiles claimed.
- **The moments:** a work laid down; a tile claimed.
- **What it spends:** tiles (a work takes the place of a farm or a mine), and great people's acts.
- **Its supply problem:** works come with great people, and great people come slowly. Three things fill the gap: The Office of Works (a Landmark raised with culture, one in each town), the partner's works (citadels, holy sites, Manufactories, Academies, Customs Houses), and late, The Universal Genius (every person also lays a work).

### Early build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Markstones | 0 | common | Completing a culture building claims the next tile its town's borders would take. | opener: land from culture | raises tiles claimed | land | Economic | sheet; new shape (a border windfall the size of the next tile's price) |
| The Long Borders | 0 | common | Your borders grow 25% faster. | opener | raises tiles claimed | land | Economic | **new**; existing (`rulePercent` on `borderCulture`) |
| The Landmark Bounds | I | uncommon | Laying down a great-person work claims every unowned tile beside it. | engine: works claim land | raises tiles claimed | land | Economic | sheet; new shape, small (a citadel's and holy site's claim, given to every work) |
| The Office of Works | I | uncommon | Once drafted, each of your towns may raise one Landmark in its borders for culture: 100 for each age you have reached. No chair required. | changes what the player does: a work without a person | raises works | culture | Civic | **new**; new shape (culture as a bank, spent on a work; a Landmark raised this way leaves no legacy) |
| The Laureate | I | uncommon | (the Patrons') | bridge | reads works worked | culture, science, renown | Civic | built |
| The Siting Masters | II | common | Great-person works gain +1 culture for each hill, mountain, forest or water tile beside them, at most +3. | pay-off: where a work stands | reads the tiles beside works | culture | Civic | sheet; new shape (a count of the terrain beside a work) |
| The Quarter of Masters | II | common | Great-person works beside another great-person work yield their own yield again. This never stacks. | pay-off: the first arrangement | reads works side by side | the works' own yields | Civic | sheet; nearly existing (a hex `pays` on `greatWork` beside `greatWork`, as The Holy Army; "their own yield again" is new) |
| The Gazetteers | II | uncommon | +3% production and gold for each great-person work in your borders, at most +30%. | early scaler | reads works held | production, gold | Economic | **new**; existing (empire `pays` count `tilesInBorders` with `greatWork`) |
| The Custodians | II | common | Your units standing on a great-person work gain +4 strength. | utility: guarding the works | none | combat | Military | **new**; new shape, small (a combat condition: standing on a great-person work) |

- **Tier I council (five):** The Markstones, The Long Borders, The Landmark Bounds, The Laureate, and the partner's Military card; The Office of Works held off the council. The Council of Elders seats all five, with The Landmark Bounds in its Wildcard chair.
- **Tier II council (five):** The Gazetteers, The Siting Masters, The Quarter of Masters, The Laureate, The Custodians. The Theocracy seats all five, with The Gazetteers in its Wildcard chair.
- **With eight chairs before Tier III:** add The Landmark Bounds, The Long Borders and the shared Garden Cities. The Merchant League seats all eight, with two Civic cards in its Wildcard chairs.
- **Sizing:**
  - **The Office of Works:** a Landmark costs 200 culture in age 2 and 300 in age 3, about one draft. Alone it yields 3 culture. With The Laureate, The Siting Masters and The Quarter of Masters its town gains about 14 culture and 3 science.
  - **The Landmark Bounds:** up to six tiles for each work laid at the edge of the borders.
  - **The Gazetteers:** six works when Tier II opens give +18% production and gold; ten works reach the cap.
- **How a few turns feel:**
  - Turn 25: the second town's Monument is finished, and The Markstones claims the river tile its borders would have taken next.
  - Turn 75: a Landmark is raised with culture between the hills and the lake, and The Siting Masters adds +3 culture to it. The first great person, an engineer, lays a Manufactory beside it. Both now yield their own yield again, and the Manufactory, at the border, claims the six tiles around it.
  - Turn 120: seven works in the borders; The Gazetteers reads +21%.

### Late build

| Card | Tier | Rarity | Text | Role | Raises / reads | Pays | Type | Status, shape |
|---|---|---|---|---|---|---|---|---|
| The Gazetteers | II | uncommon | (above) | carried scaler | reads works held | production, gold | Economic | **new** |
| The Siting Masters | II | common | (above) | carried: doubled by the capstone | reads the tiles beside works | culture | Civic | sheet |
| The Divine Proportion | III | rare | The bonuses your Orders give to great-person works are doubled. | capstone: doubles a category | reads every Order's line on a work | all yields on works | Wildcard | **new**; nearly existing (`cardYieldAmplifier` limited to lines on works, as Expansionist's The Age of Improvement is on improved tiles) |
| Commission: The Paradise Garden | III | rare | Commission. Goal: have a great-person work beside fresh water with other works or tended tiles on three of its other sides. Reward: claim every tile within three hexes of it, and 300 culture. Then it leaves its chair. | the moment | reads an arrangement | land, culture | Wildcard | sheet; new shape (arrangements; a land claim) |
| The Garden Courts | III | uncommon | Towns working at least two great-person works gain +20% culture and science. | percentage on the flats | reads works worked | culture, science | Civic | **new**; existing (`percentYields`, the `workingTiles` scope, as Expansionist's The Royal Forests) |
| The Masters' Domain | III | uncommon | (the Patrons') | pay-off | reads works | production, food, gold | Economic | built, sheet revises |
| The Processional Way | IV | rare | Great-person works in a straight line of three or more touching tiles give +3 culture and +3 science each. In a line of five or more, they also give +3 production each. | the long arrangement | reads lines of works | culture, science, production | Civic | sheet; new shape (lines on the hex grid) |
| The Pull of the Masters | IV | rare | At the start of each turn, each of your great-person works takes one tile beside it that belongs to a rival and that no rival town is working. A town centre and a rival's own works are never taken. | pressure: land taken | raises tiles claimed | land | Economic | sheet; new shape (a claim that can take a rival's tile) |
| Commission: The Ideal City | IV | rare | Commission. Goal: one of your towns holds two wonders and works three great-person works. Reward: that town claims every unowned tile within three hexes and gains +25% culture, science and production for the rest of the game, and you are dealt two free Order hands. Then it leaves its chair. | the late goal (the Marvels' bridge) | reads wonders and works in one town | land, culture, science, production | Wildcard | sheet; existing pieces (lasting effects and `markTown`), plus a free hand as a commission reward |
| The Custodians | II | common | (above) | carried | none | combat | Military | **new** |

- **Carried over:** The Gazetteers (the cap with ten works), and The Siting Masters and The Quarter of Masters, whose lines The Divine Proportion doubles.
- **The capstone, The Divine Proportion:** every line an Order puts on a work pays twice: The Siting Masters, The Quarter of Masters, The Masters' Domain and The Processional Way. It is the build's whole idea at full size: the works laid out all game now pay double what the cards made of them.
- **The moment, The Paradise Garden:** a work beside the lake with works on three sides claims every tile within three hexes at once.
- **Tier III council (eight):** The Gazetteers, The Masters' Domain, The Siting Masters, The Garden Courts, The Laureate, The Divine Proportion, Commission: The Paradise Garden, The Custodians. The Merchant League seats seven (two Civic chairs); Divine Mandate seats seven (one Economic chair).
- **Tier IV council (eleven):** add The Processional Way, The Pull of the Masters and Commission: The Ideal City. The Curia seats ten; one Military chair goes to the partner.
- **Sizing:**
  - **The Divine Proportion:** ten works carrying about +6 from cards each gain +60. With a line of five works (The Processional Way's +3 culture, +3 science and +3 production, doubled) and The Masters' Domain, about +12 more on each work: +120 a turn.
  - **The Pull of the Masters:** one rival tile a turn for each work on a shared border.
- **How a few turns feel:**
  - Turn 150: the Landmark beside the lake has works on three sides, and The Paradise Garden claims every tile within three hexes.
  - Turn 165: a line of five works runs from the capital to the coast. The Divine Proportion doubles each one's +3 culture, +3 science and +3 production.
  - Turn 190 (Tier IV): the works on the rival border take a tile each turn.
- **If the seat never reaches draft 26,** the eight-chair council is the finished build, with its capstone and its moment.

**Utility mix:** land (The Markstones, The Long Borders, The Landmark Bounds, The Paradise Garden, The Pull of the Masters), culture and science (the works and their cards), production and gold (The Gazetteers, The Masters' Domain), defence (The Custodians).

**Gives up:** tiles, and great people's acts.

**Partners:** Expansionist (tended tiles count as a garden's sides; The Sculpted Landscape, Garden Cities), Dominion (citadels are works and claim land already), Devotion (holy sites likewise), Scientific (Academies), Commerce (Customs Houses).

**Leader:** Hypatia: works pay half again.

**Alternatives:** the shared The Sculpted Landscape (Tier III) and Garden Cities (Tier I); The Masters' Domain from the Patrons.

---

## The base: the culture engine and conversion

Every build draws on these cards for the essentials. They are glue: a high floor and a low ceiling.
- **Culture:** The Repertory (Tier 0), the shared Illuminated Treatises and Travelling Players.
- **Early faith:** The Temple of the Muses (Tier 0). Every deck keeps a small early faith source (the ruling of 2026-10-07).
- **Food and production:** Civic Granaries and Master Masons (Tier 0).
- **Conversion:** The Working Court (Tier I, production from culture), The Learned Patron (Tier II, science), The Performers' Treasury (Tier II, gold).
- **Spending culture:** The Commissioned Works (Tier III, buildings bought with culture).
- **Bridges for every build:** The Antechamber (Tier II, an extra Wildcard chair while held) and The Senate Charter (Tier II).
- **The share:** about ten cards of 87, well under the quarter the skill aims at for glue.

---

## Across the builds

### Bridges and pivots

- **The Court Painter and The Wandering Muse:** the Cabinet's draft brings the Patrons' people.
- **The Archive:** the Salon's pass keeps a card for the Cabinet.
- **The Grand Salon:** raises the Salon's and the Cabinet's payers alike.
- **The Laureate and The Masters' Domain:** the Patrons' works pay in the Landscape.
- **The Universal Genius:** every great person also lays a work, so the Patrons supply the Landscape.
- **Commission: The Ideal City:** the Landscape's works and the Marvels' wonders in one town.
- **The Unveiling and The Hall of Wonders:** the Marvels' wonders feed the Cabinet's draft.
- **The Laurel Crowns:** the Patrons' people pay culture, which is drafts.
- **Culture as a bank:** five cards in four builds spend the same culture, so every one of them competes with the next draft.
- **The pivots this opens:** Salon → Cabinet (from refusing hands to keeping cards), Cabinet → Patrons (boons bring people), Patrons → Landscape (people lay works), Landscape → Marvels (The Ideal City), Marvels → Cabinet (free and bigger hands).

### New shapes, and the cards that use them

**The count:** 26 new cards. 9 use shapes that exist, 3 nearly exist, and 14 need a new shape. The sheet's own cards need most of the same families.

1. **The draft announces its moments:** a card drafted (The Court Painter, The Accessions Register, the shared The Art Dealers), a reroll that carries the hand's culture cost (The Disputation, The Atelier), the pass with the hand's cost (The Unwritten Chapter, The Patient Eye, The Long Deliberation; `draftPassed` itself exists since Dominion batch D5), and a card seated (The Swearing-In). The Grand Salon picks its payers by these moments.
2. **Counts on the draft:** hands rerolled or passed this game (The Jury's Register, The Hanging Committee), Orders held, seated or not (The Catalogue, The Long Gallery; The Universal Library reads the same), and decks held (The Polymath's Study; the shared Travelling Players needs the seated version).
3. **On-draft boons beyond a unit:** `OrderDef.onDraft` carries only a unit today (The Sword of State). Production (Gifts at Court), a random great person (The Wandering Muse), a random prize (The Grand Lottery), a card from another deck (The Cabinet of Curiosities), and a lump read from the collection (The Grand Retrospective).
4. **Draft privileges as charters:** a charter that opens a draft action or a bank (The Salon des Refusés, The Subscription List, The Archive, The Pension List, The Office of Works). `CharterSpec.unlocks` names a technology, a building, rites, an improvement or a unit today.
5. **Culture as a bank:** rerolls (The Salon des Refusés), renown (The Pension List), a Landmark (The Office of Works), buildings (The Commissioned Works) and a wonder (Magnificence). The reroll command already takes a bank (The Brokers' Redraw), and purchases go through one list of banks (`purchase.ts`).
6. **Changes to the hand:** a second pick (The Connoisseurs), a hand of one rarity (The Prix de Rome), no rerolls (Officials by Merit), a discount on the draft's price (The Open Door), and a free hand from a paid pass (The Second Sitting, nearly existing).
7. **Arrangements of works and land:** works beside works (The Quarter of Masters; the `beside` tile test exists), terrain beside a work (The Siting Masters), lines (The Processional Way), the garden (The Paradise Garden), and claims by works (The Landmark Bounds, The Paradise Garden, The Pull of the Masters, The Markstones).
8. **Great people:** a second charge (The Universal Genius), the renown a person cost as a fact on `greatPersonGained` (The Laurel Crowns), one moment for a person spent by act or by work (The Last Commission, and the shared Sacred Patronage), a doubler on legacies (The Immortals), and "no great person yet" (The Prodigy).
9. **Wonders:** a timed empire effect started by a wonder and restarted, not stacked (The Golden Age), production put into wonders while seated (The Wonder of the Age), a lost wonder's production moved (The Envious Eye), and "no wonder yet" (The Cornerstone).
10. **One card each:** a combat condition on a work (The Custodians), a choice recorded on a seated card (The Patron's Choice), an extra chair from a held card (The Antechamber), and a free hand as a commission reward (The Salon Season, The Ideal City).

Where to cut if you want less engine work: The Prix de Rome, The Processional Way, The Pull of the Masters, The Royal Invitation, The Patron's Choice and The Cabinet of Curiosities.

**Facts that changed since the sheet of 2026-10-06:**
- The pass moment exists (`draftPassed`), so the pass payers need only the hand's cost on it.
- A free hand exists (`freeDraft`, built for The New Code). The governments' reward hands were removed on 2026-10-16, so the sheet's "reward hand" becomes "a free Order hand" on The Unveiling, The Salon Season, The Grand Lottery, The Envious Eye and The Ideal City.
- A lasting Wildcard chair exists as a commission reward (`wildcardChairs`, A Victor's Peace), so The Wonder of the Age's reward is built.
- A great person narrowed to one family exists as a commission reward.
- The Magister's Court lost its blocker with its Cathedral half: it fits an existing shape now.
- After the rung fix, Tier I lasts about five drafts and Tier II about nine.

### Readings I took (to confirm)

- **One effect each:** The Cornerstone drops its renown, The Unveiling its 30 culture and The Envious Eye its free hand.
- **Moves:** The Encyclopedia from Tier II to I; The Disputation from Tier IV to I, and from rare to uncommon; The Envious Eye from Tier IV to II. Rerolls and lost wonder races begin early in the game, so the cards that answer them come early too.
- **Numbers:** The Court Painter 15 renown (was 5), The Open Door 15% (was 10%), The Grand Lottery 500 of each (was 150).
- **Free hands pay the Salon nothing,** because its payers pay from the culture the hand cost.

### Checks

| Check | Salon | Cabinet | Patrons | Marvels | Landscape |
|---|---|---|---|---|---|
| **One loop** | hands refused | Orders held | great people gained | wonders held | works held |
| **Better together** | the payers need rerolls and passes, which The Second Reading and the charters make cheap | boons fill the bench the readers count | the scaler and the grower count what the openers call | the scaler, the Keepers and The Golden Age all read the wonders the engine raises | the Gazetteers, the Siting Masters and the capstone all read the works the openers bring |
| **Beats a pile** | percentages over flats that grow with the hand's price, and a capstone that makes refusing free | the scaler and town flats read a count only this deck pushes, and the capstone doubles the draft | each person pays several cards at once, and the capstone doubles each person | one wonder fires four cards and a free hand | the capstone doubles every work's card lines |
| **Several routes** | The Second Reading + The Disputation, or The Temple of the Muses + The Critics' Circle | Gifts at Court + The Encyclopedia, or The Court Painter + The Accessions Register | The Prodigy + The Laureate, or The Pension List + The Portrait Gallery | The Cornerstone + The Unveiling, or The Guild of Masons + The Keepers of Wonders | The Markstones + The Long Borders, or The Office of Works + The Laureate |
| **A scaler carries over** | The Jury's Register; The Disputation, The Atelier | The Catalogue, The Encyclopedia | The Roll of Masters, The Portrait Gallery | The Book of Marvels, The Golden Age | The Gazetteers, The Siting Masters |
| **Science, culture, production, early** | The Disputation; The Critics' Circle; The Atelier | The Encyclopedia; The Accessions Register; Gifts at Court | The Laureate; The Portrait Gallery; engineers' acts | The Keepers of Wonders; The Keepers, The Golden Age; The Golden Age | The Laureate; Landmarks; The Gazetteers |
| **Science, culture, production, late** | The Hanging Committee; the Register; The Atelier | The Long Gallery, The Polymath's Study; The Long Gallery; The Catalogue | The Honoured Dead; The Laurel Crowns; the Roll | The Book of Marvels; The Book of Marvels; The Wonder Commonwealth, Magnificence | The Garden Courts, The Processional Way; the works; The Masters' Domain |

---

## The type sort

Every card on the sheet (61 Magisterial cards and the 15 in its shared table) and the 26 new cards, by the rules of `docs/plans/doctrines-governments-chairs.md` section 4:
- A card is typed by what it pays or does, not by what it reads. A mixed card takes the type of the half that pays more; even halves with a Civic half go Civic.
- A card that acts on other cards or on the draft is Wildcard (as The New Code, which opens a draft). Commissions are Wildcard.
- Charters and boons are typed for their faces, though they never take a chair.
- A card shared with Dominion or Expansionist keeps the type in the data. A card shared with Commerce, Scientific or Devotion gets a proposed type here, marked "to reconcile" with that deck's pass.
- Tiers are as this pass proposes them; a moved card says so.
- The 61 data rows the sheet cut are left out. If you keep any, they are typed when the sheet is rebuilt.

### The sheet's cards

| Card | Tier | Status | Type | Build | Why |
|---|---|---|---|---|---|
| The Second Reading | 0 | sheet | Wildcard | Salon | changes the draft |
| The Critics' Circle | 0 | sheet | Civic | Salon | science and culture |
| The Patient Eye | 0 | sheet | Civic | Salon (alternative) | a culture refund, though it is paid by the draft |
| Gifts at Court | 0 | sheet | Economic | Cabinet (boon) | production |
| The Repertory | 0 | sheet | Civic | base | culture |
| Master Masons | 0 | built | Economic | base | production |
| Civic Granaries | 0 | built, sheet revises | Economic | base | food and production |
| The Temple of the Muses | 0 | built | Civic | base, Salon | faith |
| The Cornerstone | 0 | sheet | Economic | Marvels | production toward wonders |
| The Court Painter | 0 | sheet | Civic | Cabinet, Patrons | renown |
| The Markstones | 0 | sheet | Economic | Landscape | land |
| The Unwritten Chapter | I | sheet | Civic | Salon | science |
| The Rotating Chairs | I | sheet | Wildcard | Cabinet (alternative) | acts on seated cards |
| The Swearing-In | I | sheet | Civic | Cabinet (alternative) | culture |
| The Landmark Bounds | I | sheet | Economic | Landscape | land |
| The Open Door | I | sheet | Wildcard | Cabinet | the draft's price |
| The Unveiling | I | sheet | Wildcard | Marvels | deals a hand |
| Commission: The Salon Season | I | sheet | Wildcard | Salon (alternative) | commission |
| The Accessions Register | I | sheet | Civic | Cabinet | even culture and production |
| The Wandering Muse | I | sheet | Civic | Cabinet (boon), Patrons | a great person |
| The Laureate | I | built | Civic | Patrons, Landscape | culture, science and renown |
| The Guild of Masons | I | built | Economic | Marvels | production toward wonders |
| The Working Court | I | built | Economic | base | production from culture |
| The Encyclopedia | I (from II) | sheet | Civic | Cabinet | science and culture |
| The Disputation | I (from IV) | sheet | Civic | Salon | science |
| The Siting Masters | II | sheet | Civic | Landscape | culture |
| The Quarter of Masters | II | sheet | Civic | Landscape | a work's own yield again; three of the six works pay Civic yields (culture, science, faith), so the halves are even and one is Civic |
| The Salon des Refusés | II | sheet (charter) | Wildcard | Salon | a draft action |
| The Subscription List | II | sheet (charter) | Wildcard | Cabinet | a draft action |
| Commission: The Patron's Gallery | II | sheet | Wildcard | Patrons | commission |
| The Learned Patron | II | built | Civic | base | science |
| The Performers' Treasury | II | built | Economic | base | gold |
| The Senate Charter | II | built | Civic | base, Cabinet (alternative) | happiness, and the hall's science and culture, outweigh production toward buildings |
| The Archive | II | sheet (charter) | Wildcard | Salon, Cabinet | a draft action |
| The Antechamber | II | sheet | Wildcard | every build (a chair) | acts on the council |
| The Golden Age | II | deferred | Civic | Marvels | even production and culture |
| The Envious Eye | II (from IV) | sheet | Economic | Marvels | production kept |
| The Grand Lottery | III | sheet | Civic | Cabinet (boon) | three of its five prizes are Civic |
| The Commissioned Works | III | sheet | Economic | base | buildings bought with culture |
| The Patron's Choice | III | sheet | Wildcard | Cabinet (alternative) | you choose what it pays |
| Commission: The Wonder of the Age | III | sheet | Wildcard | Marvels | commission |
| The Masters' Domain | III | built, sheet revises | Economic | Patrons, Landscape | production, food and gold |
| The Honoured Dead | III | built, sheet revises | Civic | Patrons | even science and production |
| Officials by Merit | III | sheet | Wildcard | Cabinet | acts on the draft |
| The Cabinet of Curiosities | III | sheet | Wildcard | Cabinet (boon) | grants a card |
| Commission: The Paradise Garden | III | sheet | Wildcard | Landscape | commission |
| The Living Canon | III | built, sheet revises | Economic | Patrons | food and production |
| The Wonder Commonwealth | III | built | Economic | Marvels | production and food outweigh the culture elsewhere |
| The Magister's Court | IV | deferred | Economic | Marvels | production toward the Opus |
| The Universal Library | IV | sheet | Economic | Cabinet | production toward the Opus |
| The Last Commission | IV | deferred | Economic | Patrons | production toward the Opus |
| The Polymath's Study | IV | sheet | Civic | Cabinet | even science and production |
| The Grand Salon | IV | sheet | Wildcard | Salon, Cabinet | acts on other cards |
| The Processional Way | IV | sheet | Civic | Landscape | culture and science |
| The Hall of Wonders | IV | sheet | Wildcard | Marvels, Cabinet | the hand's size |
| The Bulwark of Marvels | IV | sheet | Military | Marvels | town strength and hit points |
| The Pull of the Masters | IV | sheet | Economic | Landscape | land |
| The Royal Invitation | IV | sheet | Civic | Patrons | a great person's act, though it slows a rival |
| Commission: The Ideal City | IV | sheet | Wildcard | Landscape, Marvels | commission |
| The Grand Retrospective | IV | sheet | Civic | Cabinet (boon) | even culture, science and production |
| The Long Deliberation | IV | sheet | Civic | Salon | renown |

### The shared cards

| Card | Also in | Tier | Status | Type | Why |
|---|---|---|---|---|---|
| Travelling Players | Commerce | 0 | built (Commerce revises) | Civic (shared, to reconcile) | culture |
| Illuminated Treatises | Scientific | 0 | built | Civic (shared, to reconcile) | science and culture |
| Garden Cities | Expansionist | I | built | Civic | the data's type, final |
| Sacred Commissions | Devotion | I | built | Economic (shared, to reconcile) | production toward wonders outweighs 60 faith a wonder |
| The Sword of State | Dominion | I | built | Military | the data's type |
| The Art Dealers | Commerce | I | sheet | Economic (shared, to reconcile) | gold |
| Examinations of State | Dominion | II | built | Civic | the data's type |
| Garden Provinces | Expansionist | II | built | Civic | the data's type, final |
| Looted Art | Dominion | II | built | Civic | the data's type |
| The Sculpted Landscape | Expansionist | III | built | Civic | the data's type, final |
| The Cosmopolitan Court | Commerce | III | built | Civic (shared, to reconcile) | renown outweighs gold on works |
| Sacred Patronage | Devotion | III | deferred | Civic (shared, to reconcile) | great people and faith |
| The House of Wisdom | Scientific | III | built | Civic (shared, to reconcile) | culture and renown outweigh production toward wonders |
| The New Code | Dominion | III | built | Wildcard | the data's type |
| The Rising Nave | Devotion | III | sheet | Civic (shared, to reconcile) | faith and culture |

The new cards are typed in their build tables. By tier:
- **Tier 0:** The Prodigy (Civic), The Long Borders (Economic).
- **Tier I:** The Atelier (Economic), The Portrait Gallery (Civic), The Pension List (Civic, charter), The Keepers of Wonders (Civic), The Ceremonial Guard (Military), The Office of Works (Civic, charter).
- **Tier II:** The Jury's Register, The Roll of Masters, The Twice-Told Act, The Book of Marvels (Civic); The Catalogue, The Gazetteers (Economic); The Custodians (Military).
- **Tier III:** The Hanging Committee, The Long Gallery, The Universal Genius, The Laurel Crowns, The Garden Courts (Civic); Magnificence (Economic); The Second Sitting, The Prix de Rome, The Connoisseurs, The Divine Proportion (Wildcard).
- **Tier IV:** The Immortals (Civic).

### Counts

| Tier | Military | Economic | Civic | Wildcard | The sheet's cards | With this pass |
|---|---|---|---|---|---|---|
| Tier 0 | 0 | 5 | 5 | 1 | 11 | 13: 6 E, 6 C, 1 W |
| Tier I | 0 | 3 | 5 | 4 | 12 | 20: 1 M, 4 E, 11 C, 4 W |
| Tier II | 0 | 1 | 6 | 5 | 12 | 19: 1 M, 4 E, 9 C, 5 W |
| Tier III | 0 | 4 | 2 | 5 | 11 | 21: 5 E, 7 C, 9 W |
| Tier IV | 1 | 5 | 6 | 3 | 15 | 14: 1 M, 4 E, 6 C, 3 W |
| **All** | **1** | **18** | **24** | **18** | **61** | **87: 3 M, 23 E, 39 C, 22 W** |
| Shared | 1 | 2 | 11 | 1 | 15 | |

- The first four type columns count the sheet's cards at the sheet's tiers. "With this pass" adds the 26 new cards and the three moves.
- Of the 22 Wildcard cards, ten never hold a chair for long: five commissions (they leave their chair), three charters, one boon (The Cabinet of Curiosities) and The Antechamber, which works while held. So 12 Wildcard cards compete for Wildcard chairs: 1 at Tier 0, 3 at Tier I, none at Tier II, 6 at Tier III and 2 at Tier IV, and no build holds more than one before Tier III or two at Tier III.

### Close calls

- **The Patient Eye** (Civic): a culture refund. It is paid by the draft, but it pays a yield and changes no rule.
- **The Unveiling** (Wildcard): with the 30 culture dropped, all it does is deal a hand.
- **The Accessions Register, The Golden Age, The Honoured Dead, The Polymath's Study, The Grand Retrospective** (Civic): even halves, one of them Civic.
- **The Quarter of Masters** (Civic): a work's own yield, which is culture for a Landmark, science for an Academy and production for a Manufactory.
- **The Senate Charter** (Civic): +3 happiness and the hall's science and culture against +30% production toward buildings.
- **The Grand Lottery** (Civic): three of its five prizes are Civic.
- **The Patron's Choice** (Wildcard): what it pays is the player's choice, made on the card.
- **The Royal Invitation** (Civic): a great person's act, though its effect is to slow a rival.
- **The Immortals** (Civic): legacies belong to great people, not to cards. Vae Victis, which doubles the cards' capture payouts, is Wildcard.
- **The Catalogue and The Gazetteers** (Economic): I chose production and gold for them so that Tier II gives the Republic and the Merchant League something to seat.
- **The Bulwark of Marvels and The Ceremonial Guard** (Military): a town's strength, hit points and defence.
- **Sacred Commissions** (Economic, shared, to reconcile): +38% production toward wonders outweighs 60 faith a wonder.

### Where a tier leans, and what it means under each government

- **Tier 0 (13 cards):** even Economic and Civic, one Wildcard, no Military. The Chiefdom (1 Military, 1 Economic, 1 Wildcard) seats an Economic card and one other in its Wildcard chair; its Military chair goes to the partner.
- **Tier I (20):** leans Civic (11). The Priest-King is the deck's government at draft 4; the Council of Elders seats the Marvels and the Landscape whole.
- **Tier II (19):** leans Civic (9), with 4 Economic. Its five Wildcard cards are three charters, a commission and The Antechamber, so none of them crowds the Wildcard chair. The Theocracy is the deck's government at draft 10; the Republic suits the Cabinet's and the Landscape's Economic cards.
- **Tier III (21):** the Wildcard tier (9), with 7 Civic and 5 Economic and no Military. Divine Mandate and the Merchant League suit it; under Imperium (3 Military) the partner fills three chairs.
- **Tier IV (14):** leans Civic (6). The Curia suits it, and the Estates seat the Marvels whole.
- **Military is thin:** three cards of 87, and the shared The Sword of State. Every government but the Republic has a Military chair, so a Magisterial seat's Military chairs mostly go to its partner, as the chairs intend. The deck's own three (The Ceremonial Guard, The Custodians, The Bulwark of Marvels) guard what it builds (question 10).
- **Each build steers its government:** the Salon and the Patrons are Civic (the Theocracy, Divine Mandate, the Curia), the Marvels and the Landscape are Economic and Civic (the Council of Elders, the Merchant League, the Estates), and the Cabinet is Civic and Wildcard.

---

## Questions for you

Each starts with my recommendation.

1. **Five builds and a base.** *Recommended: these five (the Salon, the Cabinet, the Patrons, the Marvels and the Landscape), with the culture engine and conversion as the base every build draws on.* The Landscape is the thinnest early, because works come with great people. If five is too many, fold it into the Patrons as their late direction.
2. **Bring the sheet up to date.** *Recommended: rebuild `docs/decks/magisterial.md` in the compact format of Dominion's and Expansionist's sheets, with these builds' cards, and retire the 61 rows the sheet cut (49 of them still dealt) when the deck is built.* A new card can take over a cut row where the theme matches, as Dominion's reworks did. Among the cut rows are three of the best earners measured; they go because they pay on a count that stops at one building of each kind per town.
3. **Draft privileges as charters.** *Recommended: yes,* for The Salon des Refusés, The Subscription List, The Archive, The Pension List and The Office of Works: "Once drafted, … No chair required." Each opens a new action or a new bank, which is what a charter does, and the deck's one early Wildcard chair stays free.
4. **Culture as a second bank.** *Recommended: yes, as one family of five cards:* rerolls, renown, a Landmark, buildings and the last of a wonder. Each spend delays the next draft, and that is the cost. The currency table says culture is spent on drafts; this keeps drafts its main use, not its only one.
5. **Landmarks without a great person** (The Office of Works). *Recommended: yes, one in each town,* at about the price of a draft. It leaves no legacy, so a great person's work stays the better source.
6. **Four rule-breakers for the Tier III capstones.** *Recommended: yes to all four:*
   - The Second Sitting: a paid pass opens a free hand;
   - The Connoisseurs: a second card from a hand, at its culture cost again;
   - The Universal Genius: a great person acts and also lays a work, with one legacy;
   - Magnificence: a wonder bought with culture. It lifts "a wonder is never for sale" for culture, as The Gilded Scaffold does for gold.
7. **Reroll payers pay once a hand.** *Recommended: yes.* The sheet's The Disputation paid every reroll its faith price, so the best play was to reroll until the faith ran out. Once a hand, sized to the hand's culture cost, the pay grows with the game, and a second reroll is only for finding a card.
8. **Doublers at Tier IV.** *Recommended: The Grand Salon as the sheet has it, and The Immortals (legacies count twice) as new.* The Renaissance Court Doctrine in `docs/themes/09-the-court.md` made legacies half again as strong.
9. **The shared rows.** *Recommended:*
   - retire The Imperial Examinations and Triumphal Arches, which this sheet cut and the Dominion sheet waits on;
   - keep Garden Provinces, and drop this sheet's recommendation to cut it, because the Expansionist builds use it for the road network's culture;
   - settle the eight types proposed here for the cards shared with Commerce, Scientific and Devotion when those passes report.
10. **Military cards of its own.** *Recommended: add The Ceremonial Guard (Tier I) and The Custodians (Tier II)* beside The Bulwark of Marvels, so a seat whose partner is not Dominion has something for its Military chair. The same question for Expansionist was deferred, then built.

After these, the deck pass goes on to the sheet, then Magisterial's Doctrines, one direction for each build.

## Rulings

None yet. Your words go here, verbatim and dated, before the next stage starts.
