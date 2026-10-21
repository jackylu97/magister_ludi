# The Scientific deck: the full list, with the themes pass folded in

This is a review list, rebuilt on 2026-10-20. It puts every card on the deck sheet (`docs/decks/scientific.md`) in one list, with every new card and change from the themes pass (`docs/plans/scientific-themes.md`) folded in. It replaces the list of 2026-10-18, which folded in the superseded builds pass of 2026-10-17. It is not the spec of record: the sheet is unchanged, and the sheet's text wins wherever the two differ. You asked to read it grouped by tier, as before, and to cut cards by hand (2026-10-20: *"68 chairs is fine, i can cut on my own once they're formatted."*).

- **Status:**
  - `implemented`: in the data, dealt, and the sheet's text is what the game does.
  - `modify`: in the data, but not as the sheet writes it. The word after the colon says why: `revised` (the sheet changes the card) or `deferred` (not dealt, because it needs a new shape). Some rows have both.
  - `add`: on the sheet, not in the data.
  - `new`: proposed by the themes pass, not on the sheet. Some came from the 2026-10-17 pass, which the themes pass marks "(10-17)".
  - `proposed: …` after the status names a change the themes pass makes to a sheet card: a tier move, a rarity change, a rework, a trim to one effect, or a change of wording. The row already shows the change (the new tier, rarity and text), and the status says what it was.
  - **(was …)** names the data row that a renamed card takes over.
- **Type:** the chair the card fits (Military, Economic, Civic or Wildcard), from the themes pass's type sort. Charters take no chair; their type is for their face.
- **Build:** the card's theme and role in the themes pass.
  - The four themes are the learned land, institutions, great cities and the elite army. Engine glue raises or spends the engine (technologies and charters) and serves all four.
  - The roles are supply (more of the thing), widen (it pays something new), multiply (its output grows) and act (a choice or a moment). A capstone breaks a rule or doubles a category.
  - A second theme after a semicolon marks a bridge between two themes.
  - "feature A" or "feature B" marks a card that uses one of the two features you accepted on 2026-10-20: the trades as a card quantity, and reading rivals.
- **Rulings this list follows** (2026-10-20, `docs/plans/scientific-themes.md` section 11):
  - Tier 0 moves away from Civic. The Prospectors' Notes and The Palace Archive are now Economic, so Tier 0 holds 1 Military, 4 Economic and 5 Civic seatable cards.
  - Features A and B: yes.
  - Great cities may read town size: the Scientific player should play tall.
  - All 68 seatable cards stay. You cut by hand.
- **Doctrines:** Scientific has none yet. They come after your cuts.
- **Cut cards:** the cards the themes pass cuts are in the last section, `## Cut by this pass`, with their sheet text and one line on why, so you can restore any of them. The ten live rows the sheet cut before this pass are listed under "Data notes".

**By status** (charters included):

| Tier | Implemented | Modify | Add | New | All | Proposed change |
|---|---|---|---|---|---|---|
| Tier 0 | 3 | 0 | 4 | 5 | 12 | 2 |
| Tier I | 1 | 3 | 3 | 11 | 18 | 4 |
| Tier II | 1 | 2 | 3 | 15 | 21 | 4 |
| Tier III | 0 | 4 | 3 | 11 | 18 | 6 |
| Tier IV | 0 | 0 | 11 | 3 | 14 | 3 |
| **All** | **5** | **9** | **24** | **45** | **83** | **19** |
| Shared | 11 | 2 | 3 | 0 | 16 | 3 |

**By type** (the chair a card fits; charters take no chair, and their type is for their face):

| Tier | Military | Economic | Civic | Wildcard | All | Charters among them | Common / uncommon / rare |
|---|---|---|---|---|---|---|---|
| Tier 0 | 2 | 4 | 6 | 0 | 12 | 2 | 8 / 3 / 1 |
| Tier I | 2 | 8 | 8 | 0 | 18 | 3 | 6 / 10 / 2 |
| Tier II | 5 | 6 | 9 | 1 | 21 | 4 | 3 / 13 / 5 |
| Tier III | 4 | 4 | 8 | 2 | 18 | 3 | 3 / 9 / 6 |
| Tier IV | 4 | 4 | 4 | 2 | 14 | 3 | 1 / 6 / 7 |
| **All** | **17** | **26** | **35** | **5** | **83** | **15** | **21 / 41 / 21** |
| Shared | 1 | 0 | 15 | 0 | 16 | 1 |  |

Seatable cards (charters excluded): 68, that is 10 / 15 / 17 / 15 / 11 across Tiers 0 to IV. By type: 11 Military, 23 Economic, 29 Civic and 5 Wildcard.

**Data notes:**
- The Mechanists' Charter is Tier III in the data and Tier II on the sheet and in this list.
- Merchant Scholars is Tier I in the data and Tier III on the sheet and in this list.
- The Exchange of Discoveries is Tier III in the data. This list has it at Tier I, as the Commerce sheet does.
- None of the fifteen charter technologies is in `data/techs.json`.
- Buried seams (veins) are shelved: `veins.share` is 0 in `data/mapgen.json` (`docs/deprecated/veins.md`). The sheet's The Prospectors' Notes would pay nothing, so the themes pass reworks it.
- Ten live rows the sheet cut before this pass are still dealt: Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers and The Learned Realm. Field Notebooks is live too, and this pass cuts it. The recommendation is to retire all eleven rows.
- Rows whose data text is older than the sheet: Learned Commissions (+38% toward empire buildings, and 60 culture and 30 faith for a first of a kind), The Assay (+3 science and +3 gold for each kind), The Quiet Faculties and The Long Inheritance (any great-person work, not Academies), and Merchant Scholars (+5 science on foreign routes from a Library city).
- Deferred rows this list keeps: the Glassmakers', Mechanists' and Alchemists' Charters, The Second Seat, The Strategic Reserves (now The School of Mines) and The Monastery Libraries. Deferred rows this pass cuts: the Metallurgists' and Naturalists' Charters, and Discoveries through Great People. The Hydraulic Commonwealth (`common.json`, deferred) is cut on both its sheets; retire it.
- The Scriptorium and the Orrery are building rows that exist. The charters that opened them (The Scriveners', The Stargazers') are retired rows in `data/statecraft.json`, so the new name The Paper-Makers' Charter avoids a clash. The Bastion, the Frigate and the Corvette are rows that exist with `awaitsTech`: no ordinary technology opens them.
- Five sheet charters lose their "It opens …" clause (the Surveyors', Glassmakers', Mechanists', Printers' and Hermetic), because no card depends on a charter technology (ruling (qqqqqq) 11) and most of the cards they named are cut.

## Tier 0

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Herbalists' Charter** (charter) | common | new | Charter. Drafting this opens Herbals for research. Knowing it lets workers build the Physic Garden on flat land with fresh water: +1 food and +1 science. | Civic | learned land: supply |
| **The Bronze-Founders' Charter** (charter) | uncommon | new | Charter. Drafting this opens Casting for research. Knowing it lets you train the Phalanx and the Swordsman before Bronze Panoply. | Military | elite army: supply |
| **The Almanac** | common | implemented | Libraries cost 25% less production and give +1 production. | Economic | great cities: supply |
| **The Scribes' Hall** | common | implemented | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | Civic | great cities: widen |
| **The Long Study** | uncommon | implemented | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. | Civic | great cities: multiply (age); bridge to the learned land |
| **The Prize Essay** | common | add | Completing a technology before any other empire grants 15 culture and 15 production in your capital. Charter technologies do not count. | Civic | engine glue: a window |
| **The Prospectors' Notes** | uncommon | add; proposed: reworked (was 30 science and 15 production for a buried seam) | Building a mine or a quarry grants its town 25 production. | Economic | learned land: act |
| **The Palace Archive** | rare | add; proposed: reworked (was a Library before Writing); proposed: rarity was uncommon | In your capital, you may build empire buildings an age before their technology. | Economic | institutions: supply (early access) |
| **The Sky Watchers** | common | add | Shrines give +1 faith and +1 science. | Civic | engine glue: early faith |
| **The Royal Workshops** | common | new | Completing a technology grants 15 production in your capital. | Economic | engine glue: the moment |
| **The Royal Tutors** | common | new | +1 renown a turn for each science building you have, favouring great scholars. | Civic | learned land: supply |
| **The War Manuals** | common | new | Units gained in a town with a Library start with +2 strength. | Military | elite army: supply |

## Tier I

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Glassmakers' Charter** (charter) | uncommon | modify: deferred; proposed: wording (the "It opens …" clause goes) | Charter. Drafting this opens Optics for research. Knowing it lets you build the Observatory before The Astrolabe, needing a Library rather than a University. | Civic | great cities: supply |
| **The Surveyors' Charter** (charter) | uncommon | add; proposed: wording (the "It opens …" clause goes) | Charter. Drafting this opens Surveying for research. Knowing it lets you build the Aqueduct before Engineering, and lets workers build the Qanat: an improvement on flat land that waters the farms beside it with no river or lake nearby. | Economic | great cities: supply; learned land |
| **The Librarians' Charter** (charter) | rare | new | Charter. Drafting this opens Cataloguing for research. Knowing it lets you build the Forum and the Great Library before Rhetoric. | Civic | institutions: supply; great cities |
| **The Old Academy** | uncommon | implemented | An Academy at least twenty turns old gains +3 food and +3 production. At forty turns these bonuses become +6 of each. | Economic | learned land: widen |
| **Learned Foundations** (was Learned Commissions) | common | modify: revised; proposed: trimmed (its culture goes to The Dedications) | Cities with a Library build empire buildings 25% faster. | Economic | institutions: supply |
| **The Assay** | common | modify: revised | Gain +2 science for each distinct strategic resource you can access. | Civic | elite army: widen |
| **The Commonplace Book** | common | add; proposed: moved from Tier 0 | Charter technologies cost you 15% less research. | Civic | engine glue: charters |
| **The Forward Plans** | rare | add | You may build a University in any city whose Library has stood at least 30 turns, before you know Scholarship. | Civic | great cities: supply (a school early) |
| **The Astronomical Diaries** | uncommon | new | While seated, this card gains +1 culture and +1 production each time you complete a technology. It starts at +2 of each. | Civic | engine glue: grower |
| **The Secret Arts** | uncommon | new | Each town gains +1 production for each technology you know that no empire you have met knows, at most +5. | Economic | engine glue: the lead; feature B |
| **The Scholars' Fame** | common | new | Completing a technology grants renown, favouring great scholars, equal to a twentieth of its cost. | Civic | learned land: supply; bridge from the engine |
| **The Founding Gift** | uncommon | new | A great scholar who founds an Academy also grants its town 150 production. | Economic | learned land: act |
| **The Royal Estates** | common | new | Towns with an empire building gain +2 food and +2 production. | Economic | institutions: widen |
| **The Common Tables** | common | new | Towns gain +2 food for each science building in them. | Economic | great cities: supply |
| **The Dedications** | uncommon | new | Finishing a science building or an empire building grants culture equal to ten times the town's population. | Civic | great cities: act; institutions |
| **The Free Cities** | uncommon | new | While you hold at most five towns, your towns build buildings and wonders 20% faster. | Economic | great cities: multiply (with a cost) |
| **The Edge of the Sword** | uncommon | new | Your units gain +3 strength against units of an earlier age. | Military | elite army: multiply |
| **The Field Refits** | uncommon | new | Each time research upgrades one of your units, it heals fully. | Military | elite army: act |

## Tier II

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Mechanists' Charter** (charter) | rare | modify: deferred; proposed: wording (the "It opens …" clause goes) | Charter. Drafting this opens Mechanics for research. Knowing it lets you train the Trebuchet and the Crossbowman before their technologies. | Military | elite army: supply |
| **The Printers' Charter** (charter) | uncommon | add; proposed: wording (the "It opens …" clause goes) | Charter. Drafting this opens Printing for research. Knowing it lets you build the Printing House before Movable Type and gives +1 trade route. | Civic | great cities: supply |
| **The Paper-Makers' Charter** (charter) | uncommon | new | Charter. Drafting this opens Papermaking for research. Knowing it lets you build the Scriptorium: +2 science, and +10% science in a town with an Academy in its borders. | Civic | institutions: supply; learned land |
| **The Physicians' Charter** (charter) | uncommon | new | Charter. Drafting this opens Medicine for research. Knowing it lets you build the Bimaristan, an empire building: +25% food in its town, and your units heal 10 more a turn in your land. | Economic | institutions: supply; great cities |
| **Enduring Institutions** | uncommon | implemented; proposed: reworked (its +2 happiness goes) | A town with an empire building at least twenty turns old gains +25% production. | Economic | institutions: multiply (scaler) |
| **The Quiet Faculties** | rare | modify: revised | Cities working an Academy gain +25% food and +20% production, but produce military units 25% more slowly. | Economic | learned land: widen (with a drawback) |
| **The Charter Rolls** | uncommon | add; proposed: moved from Tier III; proposed: reworked (was +5 science); proposed: rarity was rare | Your capital gains +3 production and +3 culture for each charter you have drafted. | Civic | engine glue: "this game" count |
| **The Royal Charter Commission** | uncommon | add | Commission. Complete a charter technology while this is seated. Reward: a great scholar and 100 culture. Then it leaves its chair. | Wildcard | engine glue: commission |
| **The Translation Movement** | uncommon | new | Technologies that an empire you have met already knows cost you 20% less research. | Civic | engine glue: catch-up; feature B |
| **The Roll of Scholars** | uncommon | new | +4% production and culture for each great scholar you have gained this game, at most +30%. | Civic | learned land: multiply (scaler) |
| **The Latin Quarter** | common | new | Great-person works beside an Academy gain +2 culture and +1 production. | Civic | learned land: widen |
| **The Royal Readers** | rare | new | Great scholars raise the price of your next great person by half as much. | Civic | learned land: supply (rule-breaker) |
| **The Invitations** | rare | new | Completing an empire building grants a great scholar. | Civic | institutions: act; learned land |
| **The Palace Schools** | uncommon | new | Units gained in a town with an empire building start with +4 strength. | Military | institutions: widen; elite army |
| **The Round City** | uncommon | new | +1% production and culture for each citizen in your capital, at most +30%. | Civic | great cities: multiply (scaler) |
| **The Great Designs** | rare | new | In your capital, you may build wonders an age before their technology. | Economic | great cities: supply (wonders early) |
| **The City Architects** | common | new | Towns of at least eight citizens build wonders 25% faster. | Economic | great cities: supply |
| **The Scholars' Guild** | uncommon | new | Scholars in the trades also pay +1 food and +1 production. | Economic | great cities: widen; feature A |
| **The Companions** | uncommon | new | While you have no more military units than towns, your units gain +5 strength. | Military | elite army: multiply (with a cost) |
| **The Strategikon** | uncommon | new | Your units gain +1 strength for every five technologies you know. | Military | elite army: multiply (scaler); bridge from the engine |
| **The Armoury Patterns** | common | new | Towns build units of the newest age you know 25% faster. | Military | elite army: supply |

## Tier III

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Alchemists' Charter** (charter) | uncommon | modify: deferred; proposed: reworked (adds Niter Beds; the "It opens …" clause goes) | Charter. Drafting this opens Chemistry for research. Knowing it lets you train the Fire Lance before Alchemy, and lets workers build Niter Beds beside a farm or pasture, which supply one niter. Chemistry does not open the Magnum Opus. | Military | elite army: supply; learned land |
| **The Gunfounders' Charter** (charter) | uncommon | add; proposed: moved from Tier IV; proposed: reworked (was the Great Gun) | Charter. Drafting this opens Gunfounding for research. Knowing it lets you build the Tophane, an empire building: military units gained in its town start with +8 strength, and it builds them 25% faster. | Military | institutions: supply; elite army |
| **The Hermetic Charter** (charter) | rare | add; proposed: moved from Tier IV; proposed: wording (the "It opens …" clause goes) | Charter. Drafting this opens Hermeticism for research. Hermeticism belongs to the last age and costs more than an ordinary technology there. Knowing it lets you begin researching Alchemy while missing one of its five parent technologies. | Civic | engine glue: the Opus race |
| **The School of Mines** (was The Strategic Reserves) | common | modify: deferred, revised; proposed: reworked (was The Ordnance Rolls); proposed: moved from Tier I | An Academy standing on a strategic resource supplies one more copy of it. | Economic | learned land: widen; elite army |
| **The Second Seat** | rare | modify: deferred | You may build one second copy of an empire building, in a city with a University. | Civic | institutions: capstone (rule-breaker) |
| **The Long Inheritance** | uncommon | modify: revised; proposed: rarity was rare | Cities working an Academy at least twenty turns old gain +30% production toward empire buildings, wonders and the Magnum Opus. | Economic | institutions: supply; learned land |
| **The Proving Ground** | uncommon | add; proposed: moved from Tier IV; proposed: reworked (was per charter technology) | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. | Military | elite army: multiply (the lead); feature B |
| **The Age of Reason** | rare | new | Your Orders count each technology you complete twice. | Wildcard | engine glue: capstone (doubles) |
| **The Journeymen** | common | new | Completing a technology grants each town production equal to three times its population. | Economic | engine glue: the moment |
| **The Studium Generale** | rare | new | Great-person works beside an Academy count as Academies for your cards. | Wildcard | learned land: capstone (rule-breaker) |
| **The Nizamiyya** | uncommon | new | Academies produce half again of everything they make. | Civic | learned land: multiply |
| **The Doctorate** | common | new | Gaining a great scholar grants culture equal to eight turns of your culture. | Civic | learned land: act |
| **The Royal Academies** | uncommon | new | +5% production and culture for each empire building you hold. | Civic | institutions: multiply |
| **The Queen of Cities** | rare | new | Towns of at least 15 citizens produce twice their food and production. | Economic | great cities: capstone (doubler) |
| **The Humanists** | uncommon | new | Cities with a University gain culture equal to half their base science. | Civic | great cities: widen |
| **The Fellowships** | uncommon | new | In towns with a University, up to a third of the citizens may join the trades. | Civic | great cities: rule-breaker; feature A |
| **The Model Army** | rare | new | Research upgrades your units even when you lack the strategic resource the new unit needs. | Military | elite army: capstone (rule-breaker) |
| **Greek Fire** | uncommon | new | Gaining a unit that no empire you have met can build grants science and culture equal to its strength. | Civic | elite army: widen; feature B |

## Tier IV

| Card | Rarity | Status | Ability | Type | Build |
|---|---|---|---|---|---|
| **The Experimenters' Charter** (charter) | uncommon | add; proposed: reworked (takes The Great Experiment's rule; the Laboratory goes) | Charter. Drafting this opens Experimental Philosophy for research. Knowing it lets you pour science into the Magnum Opus, 2 science for each point of production. | Economic | institutions: the Opus |
| **The Military Engineers' Charter** (charter) | uncommon | new | Charter. Drafting this opens Military Architecture for research. Knowing it lets you build the Bastion (+5 defence, +30 hit points), which no ordinary technology opens. | Military | great cities: defence |
| **The Naval Gunners' Charter** (charter) | uncommon | new | Charter. Drafting this opens Naval Gunnery for research. Knowing it lets you build the Frigate and the Corvette, which no ordinary technology opens. | Military | elite army: supply |
| **The Great Instrument** | rare | add | Commission. Complete Alchemy while this is seated. Reward: production toward the Magnum Opus equal to a tenth of its cost. Then it leaves its chair. Not dealt to a seat that knows Alchemy. | Wildcard | institutions: act (the Opus) |
| **The Great Catalogue** | rare | add | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. | Economic | institutions: supply (the Opus) |
| **The Foundation Stone** | rare | add | You may begin the Magnum Opus before any empire knows Alchemy, once you have put half of Alchemy's cost into researching it. It cannot be finished until you know Alchemy, and your rod of beads must still be full to begin it. | Economic | institutions: rule-breaker (the Opus) |
| **The Sum of Knowledge** | rare | add | Your capital gains +1 production and +1 culture for each technology you know. | Civic | great cities: finisher; engine |
| **The Closed Book** | rare | add | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. | Civic | engine glue: the race |
| **The Breaching Batteries** | uncommon | add | Your siege units gain +5 strength against cities. Each hit they land on a city building the Magnum Opus removes 5% of the production banked toward it. | Military | elite army: act |
| **The Walls of Learning** | common | add; proposed: rarity was uncommon | Cities with a University gain +6 strength, and the city building your Magnum Opus gains +12 more. | Military | great cities: defence |
| **The Lynx-Eyed Academy** | rare | add | Commission. Hold four Academies while this is seated. Reward: a great scholar, and 300 production in each city with an Academy toward what it is building. Then it leaves its chair. | Wildcard | learned land: act (commission) |
| **The Patent Office** | uncommon | add; proposed: rarity was rare | Charter technologies cost you no more research than ordinary technologies at the same point in the tree. | Civic | engine glue: charters |
| **The Prototype Works** | rare | add | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. | Economic | engine glue: rule-breaker |
| **The Republic of Letters** | uncommon | new | Your capital gains +4 production and +4 culture for each Academy you hold. | Civic | learned land: multiply |

## Shared with another deck

These rows live in `data/decks/common.json`. Books from the Ships, The Blessed Forges and The Schoolmen's Charter have no row yet. A seat holding Scientific, or the deck named beside a card, may draw it, so a change here is felt in two decks. Each pair keeps an early shared card (ruling (qqqqqq) 14).

| Card | Also in | Tier | Rarity | Status | Ability | Type |
|---|---|---|---|---|---|---|
| **Illuminated Treatises** | Magisterial | 0 | common | implemented | Cities with both a Library and a Monument gain +1 science and +1 culture. | Civic |
| **Field Academies** | Dominion | I | uncommon | implemented | Your first combat kill each turn grants 23 science. Cities with a Library produce siege units 38% faster. | Civic |
| **Copying the Enemy** | Dominion | I | uncommon | implemented | Your first kill each turn of a unit you cannot yet build grants science toward the technology that unlocks it, equal to 10% of that technology's cost. | Civic |
| **Hydraulic Schools** | Expansionist | I | common | implemented | Cities with an Aqueduct gain +20% production toward science buildings. Those beside a mountain also gain +1 science per three citizens. | Civic |
| **Cloister Schools** | Devotion | I | uncommon | implemented | Cities with both a Temple and a Library gain +5 food and +5 science. | Civic |
| **The Monastery Libraries** | Devotion | I | common | modify: deferred, revised | Libraries give +2 faith. Temples give +2 science. | Civic |
| **The Exchange of Discoveries** | Commerce | I | uncommon | implemented; proposed: moved from Tier III | +2 science on mines and quarries on a resource. Additional +2 if the city has a market. | Civic |
| **The Schoolmen's Charter** (charter) | Devotion | I | uncommon | add; proposed: moved from the Scientific sheet to the shared cards | Charter. Drafting this opens Scholasticism for research. Knowing it lets you build the Cathedral and train the Apostle before Theology. | Civic |
| **The Cloister** | Devotion | II | rare | implemented | Cities with a Temple gain science equal to 30% of their base faith. Their Libraries and Universities each gain +3 food. | Civic |
| **The Merchant Navigators** | Commerce | II | common | implemented | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +5 science. | Civic |
| **Books from the Ships** | Commerce | II | uncommon | add | Each foreign trade route you send gains +1 science for each technology the destination's owner knows that you do not, at most +4. (Feature B.) | Civic |
| **The Blessed Forges** | Devotion | II | uncommon | add | Improved strategic resources gain +1 faith and +1 production. Cities with a Temple gain +2 faith and +2 production more. | Civic |
| **Carried-Off Scholars** | Dominion | II | common | implemented | Capturing a city grants science equal to ten times its population. | Civic |
| **Merchant Scholars** | Commerce | III | uncommon | modify: revised; proposed: reworked (reads Academies) | Foreign routes gain +2 science for each Academy in the origin city. | Civic |
| **The Engineer Corps** | Dominion | III | uncommon | implemented | Siege units gain +1 movement. Cities with a Workshop gain +30% production toward siege units and +3 science while at war. | Military |
| **The House of Wisdom** | Magisterial | III | uncommon | implemented | Worked Academies gain +3 culture. Cities working an Academy gain +1 renown and +30% production toward wonders. Each city receives the city bonus once. | Civic |

## Cut by this pass

Every card the themes pass cuts, so you can restore one. The first 22 rows are sheet cards, with the sheet's text. The last 13 are cards the 2026-10-17 pass proposed and the themes pass did not take; they are marked (10-17), with that pass's text.

| Card | Tier | Ability (as on the sheet) | Why |
|---|---|---|---|
| **Field Notebooks** | 0 | Claiming a ruin grants 15 science, 20 culture and 20 gold. | Exploration is Commerce's, and the card pushes no theme. Its row is live: retire it. |
| **The Tablet House** | 0 | Commission. Have a Library in two cities while this is seated. Reward: 40 culture and 40 production in your capital. Then it leaves its chair. | A weak goal. Tier 0 needs theme openers. |
| **The Temple Observatory** | I | Cities with both a Temple and an Observatory gain +3 faith and +3 science. | Two narrow facts, and the Observatory is an age 4 building. |
| **The Field Survey** | I | Worked farms, mines and quarries in a city with an Aqueduct gain +1 science. | Filler. The Qanat carries the Expansionist pair. |
| **The Prize Question** | I | Commission. Complete three technologies while this is seated; charter technologies do not count. Reward: 150 culture and 100 production in your capital. Then it leaves its chair. | The engine keeps one commission, The Royal Charter Commission. |
| **The Metallurgists' Charter** (charter) | II | Charter. Drafting this opens Alloys for research. Knowing it lets you train the Crucible Guard, a heavy foot soldier that needs iron and that only empires knowing Alloys can train, and build the Forge before Steel. It opens Crucible Steel. | It needs a new unit row. The Bronze-Founders' and Mechanists' Charters carry the land army. |
| **The Naturalists' Charter** (charter) | II | Charter. Drafting this opens Taxonomy for research. Knowing it gives your worked plantations and pastures +1 food. It opens New Crops. | A raw bonus behind a charter, the weakest of them. |
| **The Spectacle Makers** | II | Your Libraries, Universities and Academies count as 10 turns older than they are. | Maturity is no longer a theme. The age cards pay on time. |
| **The Religious University** | II | In each city with a University, one Holy Site counts as an Academy for every card. | The Studium Generale does this for every work beside an Academy. |
| **Crucible Steel** | II | Units that need iron or copper gain +4 strength. Cities with a Forge train them 15% faster. | Too many combat lines, and it needs a unit filter by resource. |
| **New Crops** | II | Worked plantations gain +1 science and +1 production. Farms beside a plantation gain +1 food. | Tied to the cut Naturalists' Charter. |
| **The Siege College** | II | Siege units gain +3 strength. Cities with a University train siege units 25% faster. | Siege is Dominion's. The Mechanists' Charter carries Scientific's siege. |
| **Discoveries through Scholars** (was Discoveries through Great People) | II | Each great scholar you spend, on an act, an Academy or a legacy, grants science equal to 25% of the cost of the technology you are researching. | Another science payer. The Founding Gift and The Doctorate carry the scholar's moment. |
| **The Engine Works** | III | Cities with a Workshop gain production equal to 15% of their base science. | A conversion with no theme home. |
| **The Presses** | III | You may spend gold to buy research toward the technology you are studying, at 6 gold for each point of science. At most half of a technology's cost may be bought this way. | Buying research with gold is a new player input. |
| **The Saltpetre Works** | III | Units that need niter cost 20% less production. | Niter Beds and the Fire Lance carry gunpowder. |
| **The Collegium** | III | Commission. Hold a University at least twenty turns old in four cities while this is seated. Reward: a great scholar and 200 culture. Then it leaves its chair. | It asks for four University towns, against few cities. |
| **The Lecture Circuit** | III | Cities with both a Library and a University gain +1 happiness and +15% production toward buildings. | Filler, and its happiness is civic life. |
| **The Great Experiment** | IV | You may pour science into the Magnum Opus as gold and faith can be poured, at 2 science for each point of production. | Merged into the Experimenters' Charter, which carries the rule without a chair. |
| **The Invisible College** | IV | Each city with a University at least thirty turns old gains +1 production and +1 culture for each other such city you hold, at most +8. | It scales with University towns, against few cities. |
| **The Register of Priority** | IV | Every city gains +1 culture for each technology you completed before any other empire, at most +8. Charter technologies do not count. | The firsts line is thin. The Prize Essay keeps it. |
| **The Longitude Prize** | IV | Commission. Complete three technologies of the last age while this is seated. Reward: a free technology of your choice from those you can research, other than Alchemy. Then it leaves its chair. | Its reward is a new choice of technology, a new player input. |
| **The House of Life** (10-17) | 0 | Your capital gains +1 culture for every three technologies you know, at most +5. | The engine keeps one grower and one count, so the deck is not about research alone. |
| **The Bronze Casters** (10-17) | 0 | Units that need a strategic resource cost 25% less production. | It makes many units, against the cost. |
| **The Disciples** (10-17) | I | Each Academy you have gives +2 renown a turn, favouring great scholars. | The Royal Tutors and The Scholars' Fame supply scholars with a higher floor. |
| **The Mechanicians** (10-17) | I | Finishing a building no other empire has yet built grants that town production equal to twenty times its population. Wonders do not count. | It needs a new ledger of first buildings. The institutions push buildings harder. |
| **The Natural History** (10-17) | II | +1% production and culture for every two technologies you know, at most +30%. | One count of technologies known is enough (The Strategikon, The Sum of Knowledge). |
| **The Old Libraries** (10-17) | II | +3% production and culture for each of your towns whose Library has stood forty turns, at most +30%. | It scales with the number of towns. The Round City reads one capital. |
| **The Scholar-Officials** (10-17) | II | +1 authority for each empire building you hold. | Authority is civic life. |
| **The Book of Firsts** (10-17) | II | +2% production and culture for each technology you completed before any other empire, at most +30%. Charter technologies do not count. | The firsts line is thin. |
| **The Seven Liberal Arts** (10-17) | III | Each town gains +2 culture for each age of which you know every technology. Charter technologies do not count. | Research alone. The engine keeps one count. |
| **The Professors** (10-17) | III | A great scholar that founds an Academy also writes its treatise. | Doubled great-person effects are Magisterial's, and its The Universal Genius does this already. |
| **The Instrument Makers** (10-17) | III | Buildings of the newest age you know cost 25% less production. | Other cards push the institutions harder. |
| **The Blast Furnaces** (10-17) | III | Units still need their strategic resource to be built, but no longer hold a copy of it. | It makes many units, against the cost. |
| **The Great Treatises** (10-17) | IV | A great scholar's treatise pays twice. | Doubled great-person effects are Magisterial's. |
