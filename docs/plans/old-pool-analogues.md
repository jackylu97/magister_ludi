# The old common pool against the decks

## 1. Status

This file compares the last common pool of Orders and Doctrines, from before the deck system, with the cards in the six decks today. It answers the user's question of 2026-10-25: *"can you do a pass on the very last version of the common pool that we had before we swapped to the deck system? Which beliefs have no analogue in the current deck list"*. It was written on 2026-10-25 and changes no other file.

- **The old pool:** `data/statecraft.json` at commit 71a10f1a (2026-09-16). Commit a06b8ffc (2026-09-17) retired every row there when the decks arrived. The pool held 227 Orders, of which 176 were live, and 48 Doctrines, of which 45 were live. Only the live rows are compared. The rows are still in `data/statecraft.json` today, all retired.
- **The current list,** read from git HEAD (40e519e7):
  - the sheets of the four built decks: `docs/decks/dominion.md`, `expansionist.md`, `scientific.md` and `commerce.md`;
  - the two decks being built, as proposed: `docs/plans/devotion-list-proposed.md` and `docs/plans/magisterial-list-proposed.md`, with the user's cuts and the new wonder commission of 2026-10-25 (section 12 of each themes doc);
  - the live rows of `data/decks/common.json`: the cards two decks share, and the generic cards every seat may draw;
  - the Doctrines: Dominion's 15 live ones, the 24 on the Expansionist sheet (proposed), and the proposals for Scientific, Commerce, Devotion and Magisterial (16 each, in `docs/plans/<deck>-doctrines.md`).
- A card a sheet or a pass cuts is not in the list. A card that is proposed but not built is in the list, and this file marks it "proposed" or "add".
- `docs/decks/common.md` (the user's generic cards of 2026-10-12) is a plan that was never built, so it is not in the list. Where one of its cards brings an old card back, this file says so.

**How each old card is classed:**
- **Kept:** the same card (the same row or the same name) does the same job today. Its numbers or words may be new.
- **Analogue:** a different card does the same job. It reads the same quantity or moment and pays a similar thing, or it is the same rule. A different number or a small change of condition is still an analogue. Two current cards that together cover the old card also count.
- **Partial:** a current card does part of the job. One clause is missing, or the current card covers only a special case, or it reads a different quantity.
- **None:** nothing in the current list does the job.

**Two readings:**
- Some old names live on, but on cards with a new job. Those old cards are classed by their old job, not by their name. Section 3.9 lists them.
- An old Order can find its analogue in a current Doctrine, and an old Doctrine in a current Order. A current card in this file is an Order unless it says Doctrine.

**Notation:** "(Dominion II)" means the Dominion deck, Tier II. "(Expansionist Doctrine III, proposed)" means a Doctrine of Tier III that is not built. "generic, band 0" is a generic card of the first band. "shared Dominion/Devotion" is a card in `data/decks/common.json` that both decks draw.

## 2. Counts

**Orders** (176 live in the old pool):

| Class | Count |
|---|---|
| Kept | 15 |
| Analogue | 115 |
| Partial | 36 |
| None | 10 |
| **All** | **176** |

**Doctrines** (45 live in the old pool):

| Class | Count |
|---|---|
| Kept | 3 |
| Analogue | 27 |
| Partial | 11 |
| None | 4 |
| **All** | **45** |

- Most old Orders were flat yields, and the decks cover that ground many times over. The ten gaps are a few shapes: faith from the size of the capital, a multiplier on a class of buildings, production in coastal towns, a heal on a kill, help for a landing from the sea, and a timer that turns science into faith.
- Three old Doctrines are now Orders: The Tithe, Hegemony and The Standing Army.

## 3. The answer: the Orders with no analogue

Ten old Orders have no analogue. They fall into six groups. For each card: its old text, why nothing covers it, the deck it would fit best, and whether it is worth bringing back. The judgement uses the card-design method (`.claude/skills/card-design/SKILL.md`): one effect, short text, synergy through quantities many cards share, and no tedium.

**Worth bringing back:** The Oath-Bound, one card made from The Synod and The Consistory, and one coastal production card made from Boatwrights and The Shipwright Shores.

### 3.1 Faith from the size of the capital

**Census of Souls** (old pool: Government III, Wildcard, uncommon): *"+1 faith for each citizen in your capital."*

**Fire-Keepers** (old pool: Chiefdom, Wildcard, common): *"+1 faith in your capital for every 2 citizens living there."*

- **Why nothing covers it:** capital faith today comes from flat cards (Household Altars, The Merchant Shrines), from the gods and beliefs you hold (The Creed), and from towns keeping a rite (The Priest-Astronomers). No card reads the capital's citizens for faith. Commerce's Market Day does this for gold.
- **Best fit:** Devotion.
- **Not worth bringing back.** Faith income with no theme behind it adds nothing to Devotion's themes. **A related cut:** the Devotion pass cut The Offertory (+1 faith for every three citizens in each town) as *"faith income with no theme; the engine has enough"*.

### 3.2 Religious buildings that pay more

**The Synod** (old pool: Government II, Wildcard, common): *"Your faith buildings give half again their yield, counted after every other share."*

**The Consistory** (old pool: Government IV, Wildcard, rare): *"Your faith buildings pay double, counted after every other share."*

- **Why nothing covers it:** the only card that multiplies a class of buildings today is The Bourse (Commerce III: gold buildings produce 75% more). Devotion's multiply cards read beliefs (The Doctors of the Church), devout towns (The Settled Faith) and holy sites (The Two Sanctuaries, a proposed Doctrine), not religious buildings.
- **Best fit:** Devotion, Tier III, as the multiply card for religious buildings.
- **Worth bringing back, as one card.** Devotion supplies religious buildings (First Rites, The Gifts of the Faithful, The Cathedral Works) and widens them (The Painted Chapels, The Sacred Precincts), but nothing multiplies them. The Bourse's shape (`buildingYieldPercent`) does it as data. One caution: it pays faith, the deck's own yield, and the method keeps that to about a third of a deck.

### 3.3 Production buildings that pay more

**The Workshops' Rule** (old pool: Government III, Economic, uncommon): *"Your production buildings give half again their yield."*

- **Why nothing covers it:** as above, only gold buildings have a multiplier.
- **Best fit:** no deck clearly. No deck has production buildings as a theme. The generic plans on `docs/decks/common.md` (Workshop Towns, The Forgemasters, The Town Masons) cover the same ground with flat pay.
- **Not recommended.** A multiply card needs a theme of supply cards under it, and none exists.

### 3.4 The coast

**Boatwrights** (old pool: Chiefdom, Economic, common): *"+1 production in every coastal city."*

**The Shipwright Shores** (old pool: Government II, Economic, common): *"+3 production in every coastal city · +30% production toward ships there."*

- **Why nothing covers it:** the coastal cards today pay food, culture and fishing boats (The Fish Traps, The Coast, The Harbour Cities, The Polders) and gold (Letters of Marque). No card gives a coastal town production. No card speeds up ships in particular; Letters of Marque makes them slower.
- **Best fit:** Expansionist, beside its coast cards. Commerce is the other choice, but the Commerce pass left the coast to Zheng He's ability when it cut Coastal Estates.
- **Worth bringing back, as one card with one effect:** production in coastal towns. A town on the coast works water hexes that make little production, and no current card answers that. The old Doctrine Thalassocracy (section 5) is the same gap.

### 3.5 War

**The Oath-Bound** (old pool: Government II, Military, rare): *"Killing a unit heals the unit that struck the blow by 15."*

- **Why nothing covers it:** units heal on a pillage (The Yam), on an upgrade (The Field Refits), on a capture (The Soldiers' Share, a Dominion Doctrine) and through a rite (The Host Restored). Nothing heals on a kill.
- **Best fit:** Dominion, Tier I or II.
- **Worth bringing back.** It has one effect and reads kills, a moment Dominion makes all game. It keeps an attack moving, which suits the tempo deck, and it asks for no extra orders. It combines with The Varangian Guard (Elite units attack twice). The old row's shape (a heal paid on the kill moment) still works.

**Admiralty** (old pool: Government V, Military, rare): *"Your units come ashore from the water without spending movement, and gain +10 combat strength for 3 turns when they land."*

- **Why nothing covers it:** no card helps a landing. Dominion's Marine Drill had a landing clause, and lost it when it became The Longships in the Dominion builds pass.
- **Best fit:** Dominion.
- **Not recommended,** unless you want sea invasion as a way to play. It has two effects. **A related cut:** the Dominion sheet cut Beachheads (free embarking) on 2026-10-12 as *"a small convenience"*. The name Admiralty was reused for a route card in the first Dominion sheet and cut the same day, but that was a different job.

### 3.6 Timers that turn one yield into another

**The Golden Censer** (old pool: Government III, Wildcard, rare): *"Every 15 turns, gain faith equal to half the science your empire makes in a turn."*

- **Why nothing covers it:** the current list has timers that raise units (The King's Levy, The Conscription Rolls) and pay culture (The Champagne Fairs), and steady shares that turn faith into science (The Cloister). Nothing turns science into faith.
- **Best fit:** a card shared by Devotion and Scientific.
- **Not recommended.** A lump every fifteen turns is small, and the player must keep track of the timer.

### 3.7 Partial cards that are close to gaps

The Partial table (section 4) lists all 36. These few are nearly gaps, and each would be cheap to bring back:
- **The happiness tiers.** Mandate of Heaven and Universal Suffrage raised what happy towns pay. No current card touches the tiers, though the shape (`happinessTierBoost`) is still read. Worth a look as a capstone for Expansionist's tall towns or Devotion's devout realm.
- **The King's Road** (*"A unit that stops in one of your cities gets its movement back."*). The rule (`cityRestoresMovement`) is still read in `src/sim/arrival.ts`, and no card uses it. Modu Chanyu's Horde Camp does the same on pastures. Worth a look for Dominion, as a rule-breaker for moving armies. It would be a data row.
- **Far Runners and The Sacred Ground.** The user put both back on the generic sheet on 2026-10-12, as Far Runners and Holy Ground. Neither was built.
- **The building charters.** Their effects have cards today, so they are not gaps, but their buildings can no longer be built. See 3.10.
- **The chair doublers** (The Muster Rolls, The Wild Chair, The Compact of Chairs). The Grand Vizier (Magisterial II, proposed) doubles the Economic chair. Not recommended. The Magisterial pass asked (its question 3) whether The Grand Vizier falls under the user's rejection of cards that copy another card's effect (2026-10-06). The answers of 2026-10-25 keep it, but more doublers would raise the question again.

### 3.8 Cuts that touch these cards

No doc cuts any of the ten old cards itself. Two have a related cut, given above: The Offertory (for Census of Souls and Fire-Keepers) and Beachheads (for Admiralty). Several old names were reused in the first deck sheets and cut later. Those cuts were of the new versions, not of the old jobs, and the full table notes each one.

### 3.9 Old names now on cards with a new job

These old names are on current cards, but the job changed. Each old card is classed by its old job.

| Old card | What the current card of that name does | The old job's class |
|---|---|---|
| First Rites | Devotion 0: production toward Shrines, and faith from Shrines | Partial |
| Master Masons | Magisterial 0: production toward Monuments and on a first culture building | Analogue |
| The Almanac | Scientific 0: cheaper Libraries that give production | Analogue |
| Wayside Shrines | Devotion 0 (The Wayside Shrines): food and happiness in Shrine towns | Analogue |
| The Escorted Roads | Shared Dominion/Commerce II: gold on routes from garrisoned towns, and strength for escort ships | Analogue |
| The Saints' Fields | Devotion II: food and gold on worked holy sites | Partial |
| The Master Builders | Expansionist I: renown from towns working mines, quarries and lumber mills (unrelated) | Analogue |
| The Assay | Shared Expansionist/Scientific I: science on strategic resource hexes (unrelated) | Partial |
| The Merchant Scholars (Doctrine) | Shared Commerce/Scientific III: science on foreign routes for each Academy | Analogue |

### 3.10 Buildings with no way in

Nine buildings in `data/buildings.json` carry `unlockedByCard`, and only retired old cards open them. No live or proposed card opens them, so no player can build them:
- Chapel (The Rites Charter);
- Assay House (The Coin Charter);
- Cistern (The Waterwrights' Charter);
- The Vizier's Hall (The Vizierate);
- Coinworks (The Mint Charter);
- Almshouse (The Almshouse Charter);
- Orrery (The Stargazers' Charter);
- Assize Court (The Justices' Charter);
- Gilded Hall (the old Doctrine The Gilded Court).

The Keep was retired by ruling, and the Scriptorium and the Assembly Hall have current charters. Either retire the nine, or give some of them a charter. The user's generic card Cistern Works (2026-10-12, not built) would open the Cistern again.

### 3.11 Bringing an old card back

All 227 old Order rows and all 48 Doctrine rows are still in `data/statecraft.json`, retired. The sim still reads the shapes below, but no live card uses them:
- `buildingYieldPercent` for faith and production (The Bourse uses it for gold);
- `cityRestoresMovement` (The King's Road);
- `freeLanding` and `landfall` (Admiralty);
- `happinessTierBoost` (Mandate of Heaven, Universal Suffrage);
- `hillCityCost` (Hill Forts);
- `periodShorten` (The Almanac of Hours, The Great Clock);
- `slotPosition` (the chair doublers; The Grand Vizier will use it);
- `tilePurchase` (Chartered Companies, Royal Surveyors);
- `capitalRange` (Pilgrims);
- the city rule `freshwater` (Cistern Works).

So most old cards could come back as a data row in a deck file, with no new code.

## 4. The Partial ones

36 old Orders are Partial. Each row names the nearest current card and what it lacks. Section 3.7 picks out the few that are close to gaps.

| Old card | Old tier | Nearest current card | What is missing |
|---|---|---|---|
| Camp Followers | 0 | The Outriders (Dominion 0) | The free military unit. The Outriders pays production on the same moment. Name reused by an Armoury card in the first Dominion sheet, cut 2026-10-12. |
| Far Runners | 0 | The Pathfinders' Company (Commerce 0); The Outriders (Dominion 0) | Sight for every unit (only scouts now), and culture for a ruin. The user re-added it as a generic card on docs/decks/common.md (2026-10-12); not built. |
| First Rites | 0 | Household Altars (generic, band 0) | Faith that grows with the seated Wildcard cards. Name now on a Devotion Shrine card. |
| Pilgrim Roads | II | The Theoric Fund (Devotion Doctrine I, proposed) | Faith for each citizen of the capital. |
| Mandate of Heaven | III | The Theoric Fund (Devotion Doctrine I, proposed) | The raise to the happiness tiers. No card raises them now. |
| Hill Forts | I | The Highland Clans (Expansionist Doctrine I, proposed) | The strength bonus for units defending on hills. |
| The Old Ways | III | The Old Songs (Expansionist I) | The doubling. The Old Songs adds culture to worked wild land; nothing multiplies its yields. Expansionist kept the name until its review of 2026-10-16, then cut it. |
| The Saints' Fields | III | The Old Holy Places (Devotion II) | Faith on great-person works other than holy sites. Name now on a Devotion holy-site card. |
| The Harvest Songs | II | The Harbour Cities (Expansionist II); The Scribes' Hall (Scientific 0) | Culture read from the food a town makes. Culture per citizen exists only for coastal and Library towns. |
| The Drafting Halls | III | The Scribes' Hall (Scientific 0) | Science read from the production a town makes. |
| The Golden Scales | III | Money at Work (Commerce IV); Commercial Education (Commerce I) | Science read from gold income. Money at Work reads the treasury. |
| The Coin Charter | II | The Flying Money (Commerce Doctrine II, proposed) | The Assay House itself. No card opens it now. |
| The Vizierate | II | The Mill Wheels (Expansionist III) | The Vizier's Hall and its rule (+30% production while the queue holds two items). No card opens it now. |
| The Mint Charter | III | The Nest Egg (Commerce 0) | Culture as a share of gold income (the Coinworks). No card opens the Coinworks now. |
| The Almshouse Charter | III | Consecrated Labor (Devotion I) | Settlers and caravans bought with faith (the Almshouse). Consecrated Labor covers workers only. |
| The Founding Oath | 0 | Travellers' Letters (Commerce 0); the generic capital cards | Capital pay that reads the buildings in the capital. |
| The King's Road | IV | The Relay Stations (Dominion II) | Movement refilled when a unit stops in your town. The rule is still in the code; no card uses it. |
| Decisive Blows | IV | The Bronze-Founders' Charter (Scientific 0) | The bonus for every unit. The charter gives it to the chariot line only. |
| Harbourmasters | IV | The Coast (Expansionist II) | Trade-route capacity from coastal Harbours. Related cut: The Harbour Chain (Commerce, 2026-10-12). |
| The Grain Fleet | IV | The Harbour Cities (Expansionist II) | Food and gold in coastal towns. |
| Scholastics | IV | The Humanists (Scientific III) | Science for each University, and faith for each technology. |
| Universal Suffrage | V | The Public Fountains (Expansionist I); The Deaconries (Devotion II) | The raise to the happiness tiers. |
| The Muster Rolls | I | The Grand Vizier (Magisterial II) | The Military chair. The Grand Vizier doubles the Economic chair only. Name reused in the first Dominion sheet, cut 2026-10-12. |
| The Harvest Home | I | The Privy Council (Magisterial IV) | Food. The Privy Council does the same for production only. |
| The Reeve’s Bell | I | The Tax Rolls (Expansionist III); The Censors (Expansionist Doctrine II, proposed) | Food in the capital on a timer. The Tax Rolls pays gold at each census. |
| The Sacred Ground | II | The Old Holy Places (Devotion II) | Every hex that makes faith. The current card covers holy sites only. The user re-added it as Holy Ground on docs/decks/common.md (2026-10-12); not built. |
| The Foundry Days | II | The Royal Workshops (Scientific 0) | A production lump on a timer that reads empire production. The Royal Workshops pays a lump for each technology. |
| The High Chancery | II | The Two Capitals (Scientific Doctrine IV, proposed) | A raise to all card pay in the capital. |
| The Wild Chair | III | The Grand Vizier (Magisterial II) | The Wildcard chair. |
| The Cantors’ Rule | III | The Privy Council (Magisterial IV) | Faith. |
| The Triumph | III | The Sabbath Laws (Devotion II); The Champagne Fairs (Commerce III) | Culture read from the whole empire's production. The Sabbath Laws does it in one town, as a rite. |
| The Scholars’ Rule | IV | The Privy Council (Magisterial IV) | Science. |
| The Assay | IV | Money at Work (Commerce IV) | Science read from gold income, as a lump. Name now on an unrelated shared card. |
| The Compact of Chairs | V | The Grand Vizier (Magisterial II) | The Military and Wildcard chairs. |
| The Laureates’ Rule | V | The Privy Council (Magisterial IV) | Culture. |
| Pilgrims | III | Mission Houses (Devotion II) | Gold for each foreign citizen who follows you. Related cut: Peter's Pence, which the Devotion pass cut because the founder's share and the belief Pilgrims' Coin pay this job. |

## 5. The Doctrines

Of the 45 old Doctrines, 3 are kept as Orders, 27 have an analogue, 11 are partial and 4 have none. "Old tier" here is the culture tier (the draft count) at which an old government offered the Doctrine.

### 5.1 The Doctrines with no analogue

**Thalassocracy** (old tier 10): *"Coastal cities gain 10% of their food yield as production."*
- **Why nothing covers it:** the same coastal production gap as Boatwrights and The Shipwright Shores (section 3). The current coastal Doctrine, The Delian League (Commerce I, proposed), changes authority, not yields.
- **Best fit:** Commerce or Expansionist.
- **Worth a look,** if the Order version is not taken. As a Doctrine it needs a drawback.

**The Closed Realm** (old tier 0): *"Your happiness is fixed at +5, always · your units cannot attack outside your territory."*
- **Why nothing covers it:** no card fixes happiness at a number, and no card stops attacks by place. The nearest closed rule today is The Sea Ban (Commerce Doctrine IV, proposed: no foreign routes).
- **It was never built.** Both halves were deferred in the old pool, because nothing could hold a meter at a number or refuse an attack by place. It needs two new shapes.
- **Best fit:** Expansionist, for a tall and peaceful game.
- **Worth a look** as a game-warping Doctrine with one clear trade. A fixed +5 is worth much to a wide empire and little to a small one, so the number needs care.

**The Renaissance Court** (old tier 29): *"Great-person offers show one more card."*
- **Why nothing covers it:** Order hands can grow (The Hall of Wonders, Officials by Merit), but great-person hands cannot.
- **Not a gap.** Magisterial cut a near card, The Talent Scouts, on purpose: *"one extra name in a great-person hand changes little, and no card pays for it"*. The old card's struck second half (stronger legacies) is The Immortals now (Magisterial IV, proposed).

**The Woodwrights** (old tier 4): *"Clearing a forest or jungle pays +100% and grants +10 culture."*
- **Not a gap: cut on purpose.** Expansionist kept the name as a chop card, and its themes pass cut it: *"no theme: a chop spends the land, and by Tier III few forests are left to fell"*.

### 5.2 The partial Doctrines

| Old Doctrine | Old tier | Nearest current card | What is missing |
|---|---|---|---|
| The Muses' Call | 4 | The Wandering Muse (Magisterial I) | Calling great people before the technology that opens them. Magisterial kept the name as an Order and cut it. |
| The Gilded Court | 18 | The Assayer's Rule (Commerce 0) | The Gilded Hall (no card opens it now), and science and culture on gold hexes. |
| Master of Maps | 18 | The Pathfinders' Company (Commerce 0) | Sight and movement for every unit. The user re-added this card as Light Kit on docs/decks/common.md (2026-10-12); not built. |
| The Academy | 29 | Sacred Patronage (shared Devotion/Magisterial III) | The trade of culture for science. |
| Blitz | 45 | The Swift Riders (Dominion I) | Every unit moving on after a kill. The Swift Riders covers mounted units only. |
| Mare Nostrum | 45 | The Coast (Expansionist II); The Harbour Cities (Expansionist II) | Yields on every owned water hex, and science in coastal towns. |
| The Encyclopaedia | 45 | The Almanac (Scientific 0) | Science for each building in a town. |
| The Scattered Hearths | 10 | The Contented City (Expansionist Doctrine III, proposed) | Free happiness for the first citizens of every town, which rewards many small towns. |
| The Wandering Court | 18 | Provincial Councils (Expansionist II); Garden Provinces (shared Expansionist/Magisterial II) | The trade of capital yields for yields everywhere else. |
| The Natural Philosophers | 18 | The Jixian Academy (Scientific Doctrine II, proposed) | Capital science for each building in the capital. |
| The Triumphal Way | 45 | Hegemony (Dominion II) | Happiness after a capture. Hegemony pays production for ten turns on the same moment. |

### 5.3 All 45 Doctrines

| # | Old id | Old name | Old tier | Old text | Class | Current card and deck |
|---|---|---|---|---|---|---|
| 1 | `hermitCrown` | The Hermit Crown | 4 | While you hold at most 4 cities: +30% to every yield in your capital. | Analogue | The Free Cities (Scientific I) |
| 2 | `riverKings` | River Kings | 4 | +30% food in every city on fresh water; −10% food and −10% production in every city without it. | Analogue | The Gift of the River (Expansionist Doctrine I, proposed) |
| 3 | `woodwrights` | The Woodwrights | 4 | Clearing a forest or jungle pays +100% and grants +10 culture. | None | nothing (section 5.1) |
| 4 | `greatLitany` | The Great Litany | 4 | +1 culture for each 3 faith you gain per turn. | Analogue | The Learned Clergy (Devotion III) |
| 5 | `greatWarringTribes` | The Great Warring Tribes | 10 | +10% production toward units. Captured cities pay +5 science and +5 culture per turn. | Analogue | Conquered Archives (Dominion II) |
| 6 | `wolfMothersPact` | Wolf-Mother's Pact | 4 | Barbarians you kill join you at full health. | Analogue | Blood Brothers (Dominion 0) |
| 7 | `foundersRoad` | The Founders' Road | 4 | Newly founded cities are joined to your nearest city by road · +1 culture in every city. | Analogue | The Road Home (Expansionist 0) |
| 8 | `foundersCharter` | The Founders' Charter | 4 | +2 authority capacity · newly founded cities are founded with a Monument. | Analogue | The Planted Towns (Expansionist Doctrine III, proposed) |
| 9 | `musesCall` | The Muses' Call | 4 | Great people may be called before the technology that opens them. Adopting this calls one great person. … | Partial | The Wandering Muse (Magisterial I) |
| 10 | `thalassocracy` | Thalassocracy | 10 | Coastal cities gain 10% of their food yield as production. | None | nothing (section 5.1) |
| 11 | `mountainHold` | Mountain Hold | 10 | +15% production in every city with a mountain tile · +10 city defence there. | Analogue | The High Towns (Expansionist Doctrine IV, proposed); The Mountain Schools (Expansionist III) |
| 12 | `theSacredPath` | The Sacred Path | 10 | +1 faith on every forest hex · +1 culture on every jungle hex. | Analogue | Sacred Groves (shared Expansionist/Devotion 0) |
| 13 | `burningWay` | The Burning Way | 10 | Clearing a forest or jungle costs no worker charge. | Analogue | Bound to the Soil (Expansionist Doctrine I, proposed) |
| 14 | `breadAndCircuses` | Bread and Circuses | 10 | While your authority is positive: +2 happiness in every city of 6 or more population. −2 gold in every city, always. | Analogue | The Grain Dole (Expansionist II) |
| 15 | `theTithe` | The Tithe | 10 | +1 gold for each faith you gain per turn. | Kept | The Tithe (shared Commerce/Devotion II, now an Order) |
| 16 | `ironPrice` | The Iron Price | 18 | Killing a unit grants +20 culture · pillaging pays double. | Analogue | The Bards' Praise (Dominion 0); Spoils of War (Dominion II) |
| 17 | `manifestOfTheSteppe` | Manifest of the Steppe | 18 | Mounted units gain +1 movement. Pillaging pays double. | Analogue | Horse Lords (Dominion I); Commission: Harry the Border (Dominion I) |
| 18 | `gildedCourt` | The Gilded Court | 18 | Unlocks the Gilded Hall, a building that is bought with gold and never built. +1 science and +1 culture on every … | Partial | The Assayer's Rule (Commerce 0) |
| 19 | `grandBazaar` | The Grand Bazaar | 18 | Happiness from unique luxuries +50%. A second or later copy of a luxury pays 30% of its bonus instead of nothing. … | Analogue | The Casa da Índia (Commerce IV); The Forbidden Silks (Commerce Doctrine II, proposed) |
| 20 | `masterOfMaps` | Master of Maps | 18 | All units +1 sight and +1 movement, all units −4 combat strength. | Partial | The Pathfinders' Company (Commerce 0) |
| 21 | `hegemony` | Hegemony | 18 | A captured city costs 1 authority · capturing a city grants +5% production in every city for 10 turns. | Kept | Hegemony (Dominion II, now an Order) |
| 22 | `paxImperia` | Pax Imperia | 18 | +3 happiness and +10% culture in every city of 8 or more population. | Analogue | The Grain Dole (Expansionist II); Public Hospitals (generic, band 3) |
| 23 | `theAcademyOfDeeds` | The Academy | 29 | −10% culture and +20% science. Great scholar drafts can be bought with faith. | Partial | Sacred Patronage (shared Devotion/Magisterial III) |
| 24 | `theStandingArmy` | The Standing Army | 29 | +1 authority capacity for each 5 units you have in the field. −1 happiness in every city. Units cost no upkeep. | Kept | The Standing Army (shared Dominion/Commerce I, now an Order) |
| 25 | `theSeaCharter` | The Merchant Scholars | 29 | +2% science and +2% culture in every city for each trade route you run. | Analogue | The Lingua Franca (Commerce III); The Hanse (Commerce II) |
| 26 | `theRenaissanceCourt` | The Renaissance Court | 29 | Great-person offers show one more card. | None | nothing (section 5.1) |
| 27 | `cuiusRegio` | Cuius Regio | 29 | In cities that follow your religion, 15% of the faith they gain is gained again as science. | Analogue | The Cloister (shared Devotion/Scientific II) |
| 28 | `theYeomanry` | The Yeomanry | 29 | +1 production on every hex with a Farm. Cities of 10 or more population −1 happiness. | Analogue | The Three Sisters (Expansionist I); The Watercourses (Expansionist II) |
| 29 | `absolutism` | Absolutism | 29 | +6 authority capacity. A newly placed Order is locked for 10 turns instead of 5. | Analogue | Empire Without End (Expansionist Doctrine III, proposed) |
| 30 | `blitz` | Blitz | 45 | Units that kill may move again that turn. Units cannot fortify. | Partial | The Swift Riders (Dominion I) |
| 31 | `thePhilosophersStone` | The Philosopher's Stone | 45 | The Magnum Opus is built 25% faster. | Analogue | The Magister's Court (Magisterial IV); Imperium (Dominion IV) |
| 32 | `theGrandTourII` | The Grand Tour | 45 | +3 renown per turn for each wonder you hold. +1 culture for each wonder in the world, seen or not. | Analogue | The Workshop at Olympia (Magisterial I); Commission: The Votive Monument (Magisterial 0) |
| 33 | `mareNostrum` | Mare Nostrum | 45 | +1 food and +2 gold on every water hex you own. +15% science in coastal cities. | Partial | The Coast (Expansionist II); The Harbour Cities (Expansionist II) |
| 34 | `theLeveeEnMasse` | The Levée en Masse | 45 | Every 10 turns, a free melee unit musters in your capital. It moves one further for the rest of the game. | Analogue | The King's Levy (Dominion I); The Conscription Rolls (Dominion II) |
| 35 | `paxMagistri` | Pax Magistri | 45 | +3 happiness in every city. +5 science and +5 culture in every city of 12 or more population. | Analogue | The Megalopolis (Expansionist III); Civic Peace (generic, band 1) |
| 36 | `theEncyclopaedia` | The Encyclopaedia | 45 | +1 science for each building in a city. Science buildings cost −50% production. | Partial | The Almanac (Scientific 0) |
| 37 | `theGentleYoke` | The Gentle Yoke | 10 | −15% happiness demanded per citizen · every city costs 2 more authority. | Analogue | The Contented City (Expansionist Doctrine III, proposed) |
| 38 | `theScatteredHearths` | The Scattered Hearths | 10 | The first 2 citizens in every city demand no happiness · −4 happiness in your capital. | Partial | The Contented City (Expansionist Doctrine III, proposed) |
| 39 | `theWanderingCourt` | The Wandering Court | 18 | −15% to every yield in your capital · +3 food, production, science, culture and faith, and +3 happiness, in every … | Partial | Provincial Councils (Expansionist II); Garden Provinces (shared Expansionist/Magisterial II) |
| 40 | `thePilgrimWays` | The Pilgrim Ways | 18 | +3 faith for each city in the world that follows your religion · +1 culture for each foreign city that follows you … | Analogue | The Living Hymnal (Devotion II); The Lives of the Saints (Devotion II) |
| 41 | `theNaturalPhilosophers` | The Natural Philosophers | 18 | +1 science in your capital for each building standing in it · completing a technology grants 50% of a turn’s culture. | Partial | The Jixian Academy (Scientific Doctrine II, proposed) |
| 42 | `theDeepDelving` | The Deep Delving | 18 | +1 production on every mine and every quarry · surfacing a vein pays +40 gold, and a mine standing on rich ore … | Analogue | Old Workings (Expansionist III); The Highlands (Expansionist II) |
| 43 | `theClosedRealm` | The Closed Realm | 0 | Your happiness is fixed at +5, always · your units cannot attack outside your territory. | None | nothing (section 5.1) |
| 44 | `theTriumphalWay` | The Triumphal Way | 45 | Capturing a city grants +5 happiness in every city for 10 turns. | Partial | Hegemony (Dominion II) |
| 45 | `theHorseTribes` | The Horse-Tribes | 10 | Mounted units gain +1 movement and +2 combat strength. | Analogue | Horse Lords (Dominion I) |

## 6. All 176 Orders

"Old tier" is the old pool's government stage: 0 is the Chiefdom, I to V are Governments I to V. Old texts are quoted as written, shortened where long.

| # | Old id | Old name | Old tier | Old text | Class | Current card and deck | Note |
|---|---|---|---|---|---|---|---|
| 1 | `bloodedSpears` | Blooded Spears | 0 | +2 combat strength, and +4 more against barbarians. | Kept | Blooded Spears (Dominion 0) |  |
| 2 | `campFollowers` | Camp Followers | 0 | Clearing a barbarian camp grants +25 food and a random military unit. | Partial | The Outriders (Dominion 0) | Missing: The free military unit. The Outriders pays production on the same moment. Name reused by an Armoury card in the first Dominion sheet, cut 2026-10-12. |
| 3 | `farRunners` | Far Runners | 0 | All your units gain +1 sight. Claiming a ruin grants +10 culture. | Partial | The Pathfinders' Company (Commerce 0); The Outriders (Dominion 0) | Missing: Sight for every unit (only scouts now), and culture for a ruin. The user re-added it as a generic card on docs/decks/common.md (2026-10-12); not built. |
| 4 | `theLongWatch` | Martial Law | I | +1 happiness for each military unit standing in one of your cities, and +1 more for each fortification a city has built. | Kept | Martial Law (Dominion I) |  |
| 5 | `theWidowsLevy` | The Widow's Levy | 0 | When a unit of yours dies, its nearest city gains +10 production and you gain +40 gold. | Analogue | Armoury Guilds (Dominion II) |  |
| 6 | `commonGranary` | Common Granary | 0 | +2 food in every city holding an improved luxury resource. | Analogue | The Emporia (Commerce 0) |  |
| 7 | `saltTithes` | Salt Tithes | 0 | +3 gold for each unique luxury. | Kept | Salt Tithes (Commerce 0) |  |
| 8 | `boundaryStones` | Boundary Stones | 0 | +30% border expansion in every city with a Monument. | Kept | Boundary Stones (generic, band 0) |  |
| 9 | `firstRites` | First Rites | 0 | +1 faith in your capital, and +1 faith for each wildcard Order you have in a slot. | Partial | Household Altars (generic, band 0) | Missing: Faith that grows with the seated Wildcard cards. Name now on a Devotion Shrine card. |
| 10 | `borderWardens` | Border Wardens | I | +2 combat strength inside your territory, and +2 more for each military Order you have in a slot, at most +6 more. | Analogue | The Polemarch (Magisterial 0); The Hunting Grounds (Dominion 0) |  |
| 11 | `conscription` | Conscription | I | +50% production toward units · −2 happiness. | Analogue | The Spartan Discipline (Dominion I) | Name reused in the first Dominion sheet, cut 2026-10-12. |
| 12 | `spoilsOfTheWild` | Spoils of the Wild | I | Clearing a barbarian camp pays +100%. | Analogue | The Bards' Praise and The Outriders (Dominion 0) |  |
| 13 | `weightsAndMeasures` | Weights & Measures | I | +1 gold in every city. | Analogue | The Grain Banks (Commerce I) |  |
| 14 | `silkRoads` | Silk Roads | I | +5 gold on every trade route you run. | Analogue | The Common Road (Commerce II) |  |
| 15 | `theTaxFarm` | The Tax Farm | I | +1 gold for each 3 population in your empire. | Analogue | The Tax Rolls (Expansionist III); Market Day (Commerce 0) |  |
| 16 | `harbourDues` | Harbour Dues | I | Coastal cities gain 5% of their gold again as culture. | Analogue | The Harbour Cities (Expansionist II) |  |
| 17 | `homesteadCharters` | Homestead Charters | I | Newly founded cities start with 1 more population. | Analogue | The Seed Grain (Expansionist 0) |  |
| 18 | `granaryLevies` | Granary Levies | I | When a city grows, it gains +10 production. | Kept | Granary Levies (Expansionist 0) |  |
| 19 | `censusRolls` | The King's Table | I | +1 happiness for every 2 citizens in your capital. | Analogue | The Public Fountains (Expansionist I); The Deaconries (Devotion II) |  |
| 20 | `tinkersGuild` | Tinkers' Guild | I | Newly created workers gain +1 charge. | Kept | Tinkers' Guild (Expansionist I) |  |
| 21 | `festivalDays` | Festival Days | I | +4 happiness in your capital, and +2 culture in every city. | Analogue | Civic Peace (generic, band 1); The Repertory (Magisterial 0) |  |
| 22 | `ritesOfPassage` | Rites of Passage | I | Buying or completing a unit grants +10 faith. | Kept | Rites of Passage (shared Dominion/Devotion 0) |  |
| 23 | `fieldSurgeons` | Field Surgeons | II | All units heal +10 more per turn, anywhere. | Analogue | Resting Camps (generic, band 0); The Physicians' Charter (Scientific II) | Name reused in the first Dominion sheet, cut 2026-10-12. |
| 24 | `marchDiscipline` | March Discipline | II | Military units gain +1 movement. | Analogue | The Relay Stations (Dominion II); Total War (Dominion III) | Became The Marching Camps (Dominion), cut 2026-10-21. |
| 25 | `siegeDoctrine` | Siege Doctrine | II | +8 combat strength when attacking cities. | Analogue | The Scaling Ladders (Dominion 0) |  |
| 26 | `scorchedEarth` | Scorched Earth | II | Pillaging heals a further 25 and pays a further +10 gold. | Analogue | The Yam (Dominion III); Spoils of War (Dominion II) | Name reused in the first Dominion sheet, cut 2026-10-12. |
| 27 | `sumptuaryLaws` | Sumptuary Laws | II | +1 happiness for each unique luxury. | Analogue | The Forbidden Silks (Commerce Doctrine II, proposed) |  |
| 28 | `charteredCompanies` | Chartered Companies | II | Buying a hex pays +5 science · buying a hex costs 15% less. | Analogue | Land Speculation (Commerce 0) |  |
| 29 | `oreTithes` | Ore Tithes | II | +2 production on every hex carrying a strategic resource, and +2 production in your capital for each military … | Analogue | The Quartermasters (Dominion I) |  |
| 30 | `terracedHillsides` | Terraced Hillsides | II | +2 food on farms on hills. | Analogue | Smallholdings (Expansionist 0) |  |
| 31 | `masterMasons` | Master Masons | II | Completing a building grants +25 culture. | Analogue | The Dedications (Scientific I); Civic Receipts (Commerce I) | Name now on a Magisterial Monument card. |
| 32 | `royalSurveyors` | Royal Surveyors | II | +50% border expansion · buying a hex costs 25% less. | Analogue | The Wide Country (Expansionist III); The Laurion Leases (Commerce Doctrine I, proposed) |  |
| 33 | `provincialGovernors` | Provincial Governors | II | +1 authority capacity for each economic Order you have in a slot, at most +4. | Analogue | The Nomarchs (Magisterial I) |  |
| 34 | `emergencyPowers` | Emergency Powers | II | While your authority is negative: capital +25% production, and borders do not freeze. | Analogue | The Steppe Confederacy (Dominion Doctrine I) |  |
| 35 | `pilgrimRoads` | Pilgrim Roads | II | +1 faith for each citizen in your capital · +1 happiness for each 50 banked faith (at most +5). | Partial | The Theoric Fund (Devotion Doctrine I, proposed) | Missing: Faith for each citizen of the capital. |
| 36 | `lamplighters` | Lamplighters | II | +1 culture for each 3 faith you gain per turn. | Analogue | The Learned Clergy (Devotion III) |  |
| 37 | `scholarsStipend` | Scholars' Stipend | II | +3 science in every city of 5 or more population holding a Library, and +3 more where a University stands. | Analogue | The Scribes' Hall (Scientific 0) |  |
| 38 | `theMarshals` | The Marshals | III | +4 combat strength for each adjacent friendly combat unit (at most +8). | Analogue | The Serried Ranks (Dominion II) | Dominion kept the name until 2026-10-21, then cut it as the same job as The Serried Ranks. |
| 39 | `skirmishersCreed` | Skirmishers' Creed | III | Ranged units gain +1 range. | Analogue | Master Bowyers (Dominion II) |  |
| 40 | `theStandingLevy` | The Standing Levy | III | Every 12 turns, a free melee unit musters in your capital. | Analogue | The King's Levy (Dominion I) |  |
| 41 | `clientKings` | Client Kings | III | +4 authority capacity · a captured city costs one less authority. | Analogue | Pax Romana (Dominion III); Hegemony (Dominion II) |  |
| 42 | `provincialMints` | Provincial Mints | III | +10% gold in every city holding an improved luxury resource. | Analogue | Salt Tithes (Commerce 0) |  |
| 43 | `quarrymensGuild` | Quarrymen's Guild | III | +4 production in every city with a quarry, and +1 production on every quarry. | Analogue | Old Workings (Expansionist III) |  |
| 44 | `theGrainDole` | The Grain Dole | III | +2 happiness in every city of 6 or more population. | Kept | The Grain Dole (Expansionist II) |  |
| 45 | `mandateOfHeaven` | Mandate of Heaven | III | The science and culture your happy cities pay rises 8 percentage points · +1 happiness for each 150 banked faith. | Partial | The Theoric Fund (Devotion Doctrine I, proposed) | Missing: The raise to the happiness tiers. No card raises them now. |
| 46 | `theLyceum` | The Lyceum | III | Completing a technology grants an extra turn of culture. | Analogue | The Astronomical Diaries (Scientific I); The Jixian Academy (Scientific Doctrine II, proposed) |  |
| 47 | `censusOfSouls` | Census of Souls | III | +1 faith for each citizen in your capital. | None | nothing (section 3) | Related cut: The Offertory (Devotion pass). |
| 48 | `tolerationEdicts` | Toleration Edicts | III | −15% happiness demanded per citizen. | Analogue | The Contented City (Expansionist Doctrine III, proposed); The Rites Commonwealth (Devotion I) |  |
| 49 | `theLaureate` | The Laureate | I | +2 renown per turn. Every great-person improvement pays +3 more of its own yield. | Kept | The Laureate (Magisterial I) |  |
| 50 | `theLegion` | The Legion | I | Melee units gain +1 movement and +2 combat strength, and cities put 15% more production behind them. | Analogue | Total War (Dominion III); The Spear Makers (Dominion 0) |  |
| 51 | `fireKeepers` | Fire-Keepers | 0 | +1 faith in your capital for every 2 citizens living there. | None | nothing (section 3) | Related cut: The Offertory (Devotion pass). |
| 52 | `theAlmanac` | The Almanac | I | +2 science in your capital, and +2 science in every city with a Library. | Analogue | The Scribes' Hall (Scientific 0) | Name now on a Scientific Library card that pays production. |
| 53 | `villageFairs` | Village Fairs | I | +1 happiness for each luxury you hold two or more copies of. | Analogue | Corner the Market (Commerce II) |  |
| 54 | `hillForts` | Hill Forts | I | +4 combat strength when defending on hills, and a city on hills costs 1 less authority. | Partial | The Highland Clans (Expansionist Doctrine I, proposed) | Missing: The strength bonus for units defending on hills. |
| 55 | `theChoir` | The Choir | II | +3 culture and +1 happiness in every city with a Temple. | Analogue | The Painted Chapels (shared Devotion/Magisterial I) |  |
| 56 | `starGazers` | Star-Gazers | II | +15% science in every city with a mountain hex inside its borders. | Analogue | The Mountain Schools (Expansionist III) |  |
| 57 | `cisternWorks` | Cistern Works | II | Every city of yours counts as standing on fresh water. | Analogue | The Cura Aquarum (Expansionist III) | The user re-added a Cistern card on docs/decks/common.md (2026-10-12); not built. |
| 58 | `ledgerKeepers` | Ledger-Keepers | II | +1 science and +1 culture on every trade route sent from a city with a Market, and +1 trade route. | Analogue | The Printers' Charter (Scientific II) |  |
| 59 | `drumsOfWar` | Drums of War | II | While this Order is in a slot, units created from now on are born with +4 combat strength, and keep it for life. | Analogue | The War Manuals (Scientific 0); The Palace Schools (Scientific II) |  |
| 60 | `theCartographers` | The Cartographers | II | +1 science for each 40 hexes you have revealed. | Analogue | The Map Sellers (Commerce 0) |  |
| 61 | `theOathBound` | The Oath-Bound | II | Killing a unit heals the unit that struck the blow by 15. | None | nothing (section 3) |  |
| 62 | `waysideShrines` | Wayside Shrines | I | +1 faith in your capital for every city you hold. | Analogue | First Rites (Devotion 0) | Name now on a Devotion Shrine card that pays food and happiness. |
| 63 | `theOrchardTithe` | The Orchard Tithe | II | +2 food on every hex carrying a luxury resource. | Analogue | The Emporia (Commerce 0); Lay Offerings (Devotion 0) |  |
| 64 | `theUnbrokenLand` | The Unbroken Land | I | +1 food and +1 production on every unimproved forest or jungle hex. | Analogue | Sacred Groves (shared Expansionist/Devotion 0) |  |
| 65 | `theOldWays` | The Old Ways | III | The yields of unimproved hexes are doubled. | Partial | The Old Songs (Expansionist I) | Missing: The doubling. The Old Songs adds culture to worked wild land; nothing multiplies its yields. Expansionist kept the name until its review of 2026-10-16, then cut it. |
| 66 | `firstFruits` | First Fruits | III | +1 food and +1 gold on every hex carrying a resource. | Analogue | The Soldier-Farmers (Dominion I); The Emporia (Commerce 0); Lay Offerings (Devotion 0) |  |
| 67 | `theWarChest` | The War Chest | III | Military units cost 2 less gold in maintenance. | Analogue | The Soldiers' Purse (Dominion I) | Name reused in the first Dominion sheet, cut 2026-10-12. |
| 68 | `forcedMarches` | Forced Marches | III | Melee units gain +1 movement, and +2 instead inside your own territory. | Analogue | The Relay Stations (Dominion II) |  |
| 69 | `theEscortedRoads` | The Escorted Roads | III | Trade routes pay 30% more. | Analogue | Established Routes (Commerce III) | Name now on a shared card with a new job. |
| 70 | `theLastHunt` | The Last Hunt | II | +4 culture and +4 science for each barbarian camp you have cleared this game. | Analogue | The Pacified Marches (Dominion I) |  |
| 71 | `theSaintsFields` | The Saints' Fields | III | +3 faith on every great-person improvement. | Partial | The Old Holy Places (Devotion II) | Missing: Faith on great-person works other than holy sites. Name now on a Devotion holy-site card. |
| 72 | `theWayhouses` | The Wayhouses | III | +1 gold and +3 culture for each trade route you run. | Analogue | The Common Road (Commerce II); The Customs Service (Commerce III) |  |
| 73 | `theProvisioners` | The Provisioners | III | +1 happiness for each trade route between your own cities. | Analogue | The Grain Exchange (shared Expansionist/Commerce II); The Home Market (Commerce II) |  |
| 74 | `theCensusEternal` | The Census Eternal | III | +1 science for every 2 citizens in your empire. | Analogue | The Teeming Realm (Expansionist II) |  |
| 75 | `theGroundskeepers` | The Groundskeepers | III | +2 food and +2 production on every great-person improvement. | Analogue | The Masters' Domain (Magisterial III) | Magisterial kept the name, then cut it as the same job as The Masters' Domain. |
| 76 | `theMastersPresence` | The Master's Presence | III | +15% to every yield in each city beside a great person’s work. | Analogue | The Garden Courts (Magisterial III) | Magisterial kept the name, then cut it. |
| 77 | `theWonderFeasts` | The Wonder-Feasts | III | +4 food in every city while it is building a wonder · +20% production toward wonders. | Analogue | The Guild of Masons (Magisterial I); The Rising Nave (shared Devotion/Magisterial III, add) | Magisterial kept the name, then cut it (food is Expansionist's yield). |
| 78 | `theMasterBuilders` | The Master Builders | III | The Magnum Opus and cathedrals cost 25% less production. | Analogue | The Cathedral Works (Devotion II); The Magister's Court (Magisterial IV) | Name now on an unrelated Expansionist card. |
| 79 | `theShipwrightShores` | The Shipwright Shores | II | +3 production in every coastal city · +30% production toward ships there. | None | nothing (section 3) |  |
| 80 | `theArchives` | The Archives | II | +2 culture for each Order you have placed in a slot. | Analogue | The Boule (Magisterial III); The Art Dealers (shared Commerce/Magisterial I) |  |
| 81 | `theAnnalsOfLaw` | The Annals of Law | III | +3 culture for each Order you hold but have not placed in a slot. | Analogue | The Encyclopedia (Magisterial I) |  |
| 82 | `theWarCouncil` | The War Council | II | +2 combat strength for each military Order you have in a slot. | Analogue | The Polemarch (Magisterial 0) | The Polemarch is built on this card's retired row. |
| 83 | `theGuildCharter` | The Guild Charter | II | +3 gold for each economic Order you have in a slot, and +2 production in your capital for each. | Analogue | The Prefects (Magisterial II); The Art Dealers (shared Commerce/Magisterial I) |  |
| 84 | `theSynod` | The Synod | II | Your faith buildings give half again their yield, counted after every other share. | None | nothing (section 3) |  |
| 85 | `theHarvestSongs` | The Harvest Songs | II | Every city gains 15% of its food yield again as culture. | Partial | The Harbour Cities (Expansionist II); The Scribes' Hall (Scientific 0) | Missing: Culture read from the food a town makes. Culture per citizen exists only for coastal and Library towns. |
| 86 | `theDraftingHalls` | The Drafting Halls | III | Cities with a Library gain 20% of their production again as science. | Partial | The Scribes' Hall (Scientific 0) | Missing: Science read from the production a town makes. |
| 87 | `theGoldenScales` | The Golden Scales | III | Every city gains 20% of its gold yield again as science. | Partial | Money at Work (Commerce IV); Commercial Education (Commerce I) | Missing: Science read from gold income. Money at Work reads the treasury. |
| 88 | `theArsenalLaw` | The Arsenal Law | III | While you are at war, cities with a Barracks gain 15% of their production again as gold. | Analogue | War Foundries (Dominion I) |  |
| 89 | `theBalladWeavers` | The Ballad-Weavers | I | +2 culture per turn for each barbarian you have killed while this Order stands in a slot. | Analogue | The Captured Arms (Dominion 0); The Bards' Praise (Dominion 0) |  |
| 90 | `theReliquaryRolls` | The Reliquary Rolls | II | +3 faith and +3 culture per turn for each great person you have spent while this Order stands in a slot. | Analogue | The Honoured Dead (Magisterial II) |  |
| 91 | `theChroniclersOfTheFallen` | The Chroniclers of the Fallen | II | +1 gold per turn for each unit you have lost in battle while this Order stands in a slot. | Analogue | The Hall of the Slain (Dominion II); The Martyrology (Devotion II) |  |
| 92 | `theCasusBelli` | The Casus Belli | III | Declaring war grants +4 combat strength to all your units and +10% production in every city, for 10 turns. | Analogue | The Arrière-ban (Dominion III) |  |
| 93 | `ritesCharter` | The Rites Charter | I | Unlocks the Chapel. | Analogue | The Rogations (Devotion 0) | Devotion cut its version: "unlocking the Chapel alone changes no decision". |
| 94 | `vigilCharter` | The Vigil Charter | I | Unlocks the Keep. | Analogue | The Military Engineers' Charter (Scientific IV) | The old Keep building is retired by ruling; Expansionist's The Keeps has the name. |
| 95 | `scrivenersCharter` | The Scriveners' Charter | II | Unlocks the Scriptorium. | Analogue | The Paper-Makers' Charter (Scientific II) | Same building, new name. |
| 96 | `coinCharter` | The Coin Charter | II | Unlocks the Assay House. | Partial | The Flying Money (Commerce Doctrine II, proposed) | Missing: The Assay House itself. No card opens it now. |
| 97 | `waterwrightsCharter` | The Waterwrights' Charter | II | Unlocks the Cistern. | Analogue | The Surveyors' Charter (Scientific I); The Cura Aquarum (Expansionist III) |  |
| 98 | `theSenatus` | The Senatus | II | Unlocks the Assembly Hall. | Analogue | The Senate Charter (Magisterial II) | Same building, new name. |
| 99 | `toolmakersCharter` | The Vizierate | II | Unlocks The Vizier's Hall. | Partial | The Mill Wheels (Expansionist III) | Missing: The Vizier's Hall and its rule (+30% production while the queue holds two items). No card opens it now. |
| 100 | `mintCharter` | The Mint Charter | III | Unlocks the Coinworks. | Partial | The Nest Egg (Commerce 0) | Missing: Culture as a share of gold income (the Coinworks). No card opens the Coinworks now. |
| 101 | `almshouseCharter` | The Almshouse Charter | III | Unlocks the Almshouse. | Partial | Consecrated Labor (Devotion I) | Missing: Settlers and caravans bought with faith (the Almshouse). Consecrated Labor covers workers only. |
| 102 | `stargazersCharter` | The Stargazers' Charter | III | Unlocks the Orrery. | Analogue | The Mountain Schools (Expansionist III) |  |
| 103 | `justicesCharter` | The Justices' Charter | III | Unlocks the Assize Court. | Analogue | The Contented City (Expansionist Doctrine III, proposed); Local Clerks (generic, band 2) |  |
| 104 | `theBannerCall` | The Banner-Call | II | While you are at war: +15% production toward units, and killing a unit grants +5 culture. | Analogue | Reserve Officers (Dominion III); The Bards' Praise (Dominion 0) |  |
| 105 | `theFarCharts` | The Far Charts | III | +1 science for each 20 hexes you have revealed. | Analogue | The Map Sellers (Commerce 0) |  |
| 106 | `theFoundingOath` | The Founding Oath | 0 | Your capital pays +1 of every yield for each building standing in it, at most 3. | Partial | Travellers' Letters (Commerce 0); the generic capital cards | Missing: Capital pay that reads the buildings in the capital. |
| 107 | `theRecklessLevy` | The Reckless Levy | I | +50% production toward units · every unit costs one more coin to keep. | Analogue | The Spartan Discipline (Dominion I) |  |
| 108 | `theTitheOfIron` | The Tithe of Iron | II | +3 production on every mine · −3 food in every city with one. | Analogue | Old Workings (Expansionist III); The Mineral Trade (Commerce 0) |  |
| 109 | `theGranaryLaws` | The Granary Laws | III | Cities of 8 or more population gain 20% of their food yield again as science. | Analogue | The Megalopolis (Expansionist III) |  |
| 110 | `theKingsRoad` | The King's Road | IV | A unit that stops in one of your cities gets its movement back. | Partial | The Relay Stations (Dominion II) | Missing: Movement refilled when a unit stops in your town. The rule is still in the code; no card uses it. |
| 111 | `fieldHospitals` | Field Hospitals | IV | Units resting inside your own territory mend completely each turn. | Analogue | The Deputatoi (Scientific Doctrine II, proposed) |  |
| 112 | `decisiveBlows` | Decisive Blows | IV | +10 combat strength when attacking a unit below half strength. | Partial | The Bronze-Founders' Charter (Scientific 0) | Missing: The bonus for every unit. The charter gives it to the chariot line only. |
| 113 | `theMarshalsPurse` | The Marshals' Purse | IV | Military units cost 25% less to buy. | Analogue | The Offering Chests (Devotion III); The Flying Money (Commerce Doctrine II, proposed) |  |
| 114 | `knightlyOrders` | Knightly Orders | IV | Mounted units gain +10 combat strength inside your territory, and cities put 25% less production behind them. | Analogue | Horse Lords (Dominion I) |  |
| 115 | `theSiegeTrain` | The Siege Train | IV | Siege units gain +1 movement. +12 combat strength against cities for units standing beside a siege engine. | Kept | The Siege Train (Dominion III) |  |
| 116 | `patrons` | Patrons | IV | +10 culture for each wonder you hold. +3 renown per turn for each culture building you hold. | Analogue | Commission: The Votive Monument (Magisterial 0); The Choregia (Magisterial Doctrine I, proposed) |  |
| 117 | `theGuildOfMasons` | The Guild of Masons | IV | +50% production toward wonders · −15% production toward units. | Kept | The Guild of Masons (Magisterial I) |  |
| 118 | `harbourmasters` | Harbourmasters | IV | +1 trade route in every coastal city with a Harbour · +2 gold on every fishing boat. | Partial | The Coast (Expansionist II) | Missing: Trade-route capacity from coastal Harbours. Related cut: The Harbour Chain (Commerce, 2026-10-12). |
| 119 | `assizeCourts` | Assize Courts | IV | +6 authority capacity · a captured city costs 1 authority. | Analogue | The Proconsuls (Dominion IV); Pax Romana (Dominion III) |  |
| 120 | `theGrainFleet` | The Grain Fleet | IV | +6 food in every coastal city · +1 gold for each 3 citizens in your coastal cities. | Partial | The Harbour Cities (Expansionist II) | Missing: Food and gold in coastal towns. |
| 121 | `cathedralChapters` | Cathedral Chapters | IV | +2 culture and +2 faith in every city with a Cathedral. | Analogue | The Chapter Houses (Devotion IV) |  |
| 122 | `theConsistory` | The Consistory | IV | Your faith buildings pay double, counted after every other share. | None | nothing (section 3) |  |
| 123 | `scholastics` | Scholastics | IV | +5 science for each University you hold · completing a technology grants +40 faith. | Partial | The Humanists (Scientific III) | Missing: Science for each University, and faith for each technology. |
| 124 | `forcedMarch` | Forced March | V | Military units gain +1 movement outside your own territory. | Analogue | Total War (Dominion III); The Relay Stations (Dominion II) |  |
| 125 | `admiralty` | Admiralty | V | Your units come ashore from the water without spending movement, and gain +10 combat strength for 3 turns when … | None | nothing (section 3) | Related cut: Beachheads (free embarking), Dominion 2026-10-12. |
| 126 | `theSalon` | The Salon | V | Every great person’s work pays double what it makes. | Analogue | The Quarter of Masters (Magisterial II); The Divine Proportion (Magisterial III) | Magisterial kept the name, then cut it. |
| 127 | `theSilkExchange` | The Silk Exchange | V | +1 culture on every trade route you run, and your trade routes pay double science and culture. | Analogue | The Scholars' Roads (Commerce III) |  |
| 128 | `printingHouses` | Printing Houses | V | +3 culture for each Library you hold · +10% science in every city. | Analogue | The Scribes' Hall (Scientific 0) |  |
| 129 | `manufactories` | Manufactories | V | +30% production in every city with a manufactory inside its borders. | Analogue | The Engineers' Yards (Expansionist II); The Cathedral Lodges (Expansionist Doctrine IV, proposed) |  |
| 130 | `theInquisition` | The Inquisition | V | +8 faith and +8 culture in every city with a Temple. | Analogue | The Painted Chapels (shared Devotion/Magisterial I) |  |
| 131 | `universalSuffrage` | Universal Suffrage | V | +1 happiness for each 3 citizens in your empire · happiness tiers +10 percentage points. | Partial | The Public Fountains (Expansionist I); The Deaconries (Devotion II) | Missing: The raise to the happiness tiers. |
| 132 | `theMagistersCourt` | The Magister's Court | V | +30% production toward the Magnum Opus. | Kept | The Magister's Court (Magisterial IV) |  |
| 133 | `theMusterRolls` | The Muster Rolls | I | The Order in your first military slot pays twice. | Partial | The Grand Vizier (Magisterial II) | Missing: The Military chair. The Grand Vizier doubles the Economic chair only. Name reused in the first Dominion sheet, cut 2026-10-12. |
| 134 | `theHarvestHome` | The Harvest Home | I | Your Orders that give food give an additional food. | Partial | The Privy Council (Magisterial IV) | Missing: Food. The Privy Council does the same for production only. |
| 135 | `theReevesBell` | The Reeve’s Bell | I | Every 8 turns, your capital gains food for each citizen in your empire. | Partial | The Tax Rolls (Expansionist III); The Censors (Expansionist Doctrine II, proposed) | Missing: Food in the capital on a timer. The Tax Rolls pays gold at each census. |
| 136 | `theFirstChair` | The First Chair | II | The Order in your first economic slot pays twice. | Analogue | The Grand Vizier (Magisterial II) |  |
| 137 | `theScriveners` | The Scriveners | II | Your science buildings give half again their yield, the per-citizen lines included. | Analogue | The Universitas (Scientific Doctrine III, proposed); The Nizamiyya (Scientific III) |  |
| 138 | `theSacredGround` | The Sacred Ground | II | +1 faith on every hex that already supplies faith. | Partial | The Old Holy Places (Devotion II) | Missing: Every hex that makes faith. The current card covers holy sites only. The user re-added it as Holy Ground on docs/decks/common.md (2026-10-12); not built. |
| 139 | `theAssayersRule` | The Assayer’s Rule | II | +1 gold on every hex that already supplies gold. | Kept | The Assayer's Rule (Commerce 0) |  |
| 140 | `theCountingHouses` | The Counting Houses | II | Your gold buildings give half again their yield. | Analogue | The Bourse (Commerce III) |  |
| 141 | `theAlmanacOfHours` | The Almanac of Hours | II | Your Orders that pay every so many turns come round 3 turns sooner. | Analogue | Double Time (Dominion II) |  |
| 142 | `theFoundryDays` | The Foundry Days | II | Every 10 turns, your capital gains production equal to half of what your empire makes in a turn. | Partial | The Royal Workshops (Scientific 0) | Missing: A production lump on a timer that reads empire production. The Royal Workshops pays a lump for each technology. |
| 143 | `theNetsBlessing` | The Nets’ Blessing | II | Every fishing boat pays double what it makes. | Analogue | Crop Rotation (Expansionist Doctrine III, proposed); The Coast (Expansionist II) |  |
| 144 | `theHighChancery` | The High Chancery | II | Your Orders pay half again in your capital. | Partial | The Two Capitals (Scientific Doctrine IV, proposed) | Missing: A raise to all card pay in the capital. |
| 145 | `theVotiveTally` | The Votive Tally | II | +1 faith for each Order draft you have asked again while this stands in a slot. | Analogue | The Penitents' Roll (shared Devotion/Magisterial II) |  |
| 146 | `theWorkshopsRule` | The Workshops’ Rule | III | Your production buildings give half again their yield. | None | nothing (section 3) |  |
| 147 | `theWildChair` | The Wild Chair | III | The Order in your first wildcard slot pays twice. | Partial | The Grand Vizier (Magisterial II) | Missing: The Wildcard chair. |
| 148 | `theCantorsRule` | The Cantors’ Rule | III | Your Orders that give faith give half again. | Partial | The Privy Council (Magisterial IV) | Missing: Faith. |
| 149 | `theGoldenCenser` | The Golden Censer | III | Every 15 turns, gain faith equal to half the science your empire makes in a turn. | None | nothing (section 3) |  |
| 150 | `theDeepSeams` | The Deep Seams | III | Every mine pays double what it makes. | Analogue | Crop Rotation (Expansionist Doctrine III, proposed) |  |
| 151 | `theExchangeCharter` | The Exchange Charter | III | Your gold buildings give half again their yield, counted after every other share. | Analogue | The Bourse (Commerce III) |  |
| 152 | `theTriumph` | The Triumph | III | Every 12 turns, gain culture equal to the production your empire makes in a turn. | Partial | The Sabbath Laws (Devotion II); The Champagne Fairs (Commerce III) | Missing: Culture read from the whole empire's production. The Sabbath Laws does it in one town, as a rite. |
| 153 | `theScholarsRule` | The Scholars’ Rule | IV | Your Orders that give science give an additional science. | Partial | The Privy Council (Magisterial IV) | Missing: Science. |
| 154 | `theExchequer` | The Exchequer | IV | Your trade routes pay double. | Analogue | The Return Leg (Commerce III); The Sea Ban (Commerce Doctrine IV, proposed) |  |
| 155 | `theAssay` | The Assay | IV | Every 20 turns, gain science equal to the gold your empire makes in a turn. | Partial | Money at Work (Commerce IV) | Missing: Science read from gold income, as a lump. Name now on an unrelated shared card. |
| 156 | `theBroadAcres` | The Broad Acres | IV | Every farm pays double what it makes. | Analogue | Crop Rotation (Expansionist Doctrine III, proposed) |  |
| 157 | `theCompactOfChairs` | The Compact of Chairs | V | The Order in your first military, economic and wildcard slot each pay twice. | Partial | The Grand Vizier (Magisterial II) | Missing: The Military and Wildcard chairs. |
| 158 | `theLaureatesRule` | The Laureates’ Rule | V | Your Orders that give culture give an additional culture. | Partial | The Privy Council (Magisterial IV) | Missing: Culture. |
| 159 | `theGreatClock` | The Great Clock | V | Your Orders that pay every so many turns come round 3 turns sooner and pay half again. | Analogue | Double Time (Dominion II) |  |
| 160 | `theEncyclopaedists` | The Encyclopaedists | V | Every 10 turns, gain culture equal to the science your empire makes in a turn. | Analogue | The Humanists (Scientific III) |  |
| 161 | `theCollegesRule` | The Colleges’ Rule | V | Your science buildings pay double, counted after every other share. | Analogue | The Universitas (Scientific Doctrine III, proposed) |  |
| 162 | `theEldersWrit` | The Elders' Writ | 0 | +2 authority capacity. | Analogue | Local Clerks (generic, band 2) |  |
| 163 | `theTallySticks` | The Tally Sticks | 0 | +1 science in every city with a Monument. | Analogue | Illuminated Treatises (shared Scientific/Magisterial 0) |  |
| 164 | `boatwrights` | Boatwrights | 0 | +1 production in every coastal city. | None | nothing (section 3) |  |
| 165 | `theMarches` | The Marches | I | +2 authority capacity · −1 happiness in every city. | Analogue | Local Clerks (generic, band 2) |  |
| 166 | `theCensus` | The Census | I | +1 authority capacity for each 2 cities you hold. | Analogue | The Market Writ (Commerce I); Empire Without End (Expansionist Doctrine III, proposed) |  |
| 167 | `theScribesHall` | The Scribes' Hall | I | +1 science in every city for each 3 citizens living there. | Kept | The Scribes' Hall (Scientific 0) |  |
| 168 | `theLampKeptLit` | The Lamp Kept Lit | I | +25% science in your capital. | Analogue | Travellers' Letters (Commerce 0) |  |
| 169 | `fishWeirs` | Fish Weirs | I | +1 gold on every fishing boat. | Analogue | The Coast (Expansionist II) |  |
| 170 | `tribute` | Tribute | III | +1 gold for each 2 citizens living in your puppets. | Analogue | The Tributary Kings (Dominion III) |  |
| 171 | `ridersOfTheSteppe` | Riders of the Steppe | III | Mounted units ignore enemy zone of control and pillage without spending movement. | Kept | Riders of the Steppe (Dominion II) |  |
| 172 | `tolls` | Tolls | II | +1 gold for each 4 road hexes you have laid. | Analogue | The Milestones (Expansionist II) |  |
| 173 | `mercenaries` | Mercenaries | IV | Newly created military units bought with gold gain +2 combat strength. All units cost 20% less to buy. | Analogue | Professional Soldiers (shared Dominion/Commerce III) |  |
| 174 | `theEntrepot` | The Entrepôt | IV | +1 gold for each 5 citizens in every city of yours that a foreign trade route ends in. | Analogue | The Exchange (Commerce II) |  |
| 175 | `patronage` | Patronage | III | +1 renown per turn for each 4 citizens in your capital. | Analogue | The Royal Tutors (Scientific 0); The Workshop at Olympia (Magisterial I) | Magisterial kept the name, then cut it. |
| 176 | `pilgrims` | Pilgrims | III | Your capital carries its faith +6 hexes. +1 gold for each citizen of another empire who follows you. | Partial | Mission Houses (Devotion II) | Missing: Gold for each foreign citizen who follows you. Related cut: Peter's Pence, which the Devotion pass cut because the founder's share and the belief Pilgrims' Coin pay this job. |
