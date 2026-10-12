# Six decks — expanded full-game proposal

**Design proposal · revised 2026-09-16 · not implemented.** Dominion is the user-edited reference. Expansionist, Scientific, Commerce and Devotion now use revised line-based pools; Magisterial retains its preceding card draft pending its revised brief. This file is the review catalogue, not the live balance tables. All card numbers, availability thresholds, government forms and draw weights remain proposals.

**User directions recorded here:** six named decks and the leader assignments below; cross-type cards; a shared common pool; rare cards available in normal drafts; doctrine rewards offer rares, with ordinary Orders requiring a chair and eight on-draft access cards: five Scientific research Charters and three Commerce building Charters; government capacities **3 → 4 → 6 → 9**. Nezahualcoyotl's Scientific pairing remains tentative. The earlier permanent-doctrine and six-chair-endgame proposals are superseded.

Sources: [live Orders, doctrines and governments](orders-and-doctrines.md), [earlier balance proposals](orders-and-doctrines-proposed.md), `data/statecraft.json`, and `data/leaders.json`. Existing names frequently have replacement effects here. New names are proposals. Omission is not an instruction to delete a live card. The older open deck discussion in `flags.md` is not an approval of this entire catalogue or of universal chairs.

## The structure

- **Leader:** two fixed decks, plus shared commons and eligible cross-type cards. Ibn Battuta has access to all six decks plus the same shared commons.
- **Cards:** C common, U uncommon, R rare. All enter one owned collection. Ordinary Orders occupy **one normal chair** when active and follow the same entry seals and replacement rules. Five Scientific research Charters and three Commerce building Charters instead unlock their named content once drafted and never occupy a chair. Rarity alone creates no passive effect.
- **Doctrines:** a **rare-only reward draft**, not a permanent card class. Take one rare into the collection: an ordinary Order must be seated for ongoing effects; a rare Charter grants its named research or building access immediately; the technology or building still needs investment. The same rare can appear in normal drafts and cannot be owned twice.
- **Government:** supplies **3 / 5 / 8 / 11** baseline chairs (was 3 / 4 / 6 / 9; see "Five content bands") and a small proposed administrative tradeoff. Extra-chair leader abilities remain additive.
- **Cross-type:** one card definition with two deck memberships. Either membership grants access; matching both does not double chance or effect.
- **Generic:** common rarity, no deck membership, accessible to everyone. A safety net of modest fundamentals rather than the best route to every yield.

No new quests, deck-unlock systems, currencies or chosen secondary attributes. Charters unlock specific research nodes or buildings, not additional card pools. Culture remains the normal draft currency. Increasing the variety here does not itself fix the cost or frequency of culture drafts.

## Six identities

| Deck | Investment it rewards | Different directions inside the deck |
|---|---|---|
| Dominion | Recruiting, positioning and using military units | Garrisons and disciplined armies; mobile raiding; territorial conquest; naval force |
| Expansionist | Citizens, worker charges, land and settlement geography | Population levies; forest management; preservation; worker-led claims and irrigation; complementary provinces |
| Commerce | Routes, partnerships, goods and deliberate spending | Established domestic partners; overseas posts; manufactured/export goods; reserves versus purchased capability |
| Devotion | Sacred buildings, rites, religious units and conversion | Local religious communities; missionary expansion; pastoral faith; faith-funded investment |
| Scientific | Research detours, deposits, institutions, great people and asset maturity | On-draft Charters; resource capability; concentrated or distributed works; acts and legacies; mature centres |
| Magisterial | Cultural institutions, wonders, great people and works | A monumental capital; distributed patronage; productive great works; military or religious courts |

**A yield alone does not determine type.** A garrison producing science can still be Dominion. Scientific cards should ask for scientific or engineering investment; otherwise every deck's bridge to science would require another tag.

## Leader pools

| Leader | Decks | Intended distinction |
|---|---|---|
| Pachacuti | Expansionist + Commerce | Mountain agriculture and connected settlements |
| Taizong | Dominion + Magisterial | Armies, garrisons and the imperial court |
| Modu Chanyu | Dominion + Devotion | Pastoral faith, mobile war and raiding |
| Akhenaten | Devotion + Magisterial | Religious construction and monuments |
| Al-Ma'mun | Devotion + Scientific | Religious institutions sustaining scholarship |
| Mithridates | Dominion + Expansionist | A compact, developed kingdom resisting larger empires |
| Joan of Arc | Dominion + Devotion | Conversion and warfare reinforcing one another |
| Mansa Musa | Commerce + Devotion | Commercial wealth and religious destinations |
| Zheng He | Commerce + Magisterial | Voyages, coastal networks and imperial prestige |
| Nezahualcoyotl | Expansionist + Scientific | Hydraulic engineering and populous cities; tentative |
| Hypatia | Scientific + Magisterial | Scholars and great works |
| Hildegard | Devotion + Magisterial | Rites, cultural communities and sacred institutions |
| Ibn Battuta | Rainbow: all six | Adapting a varied collection through an extra chair and free redraw |

Shared pairs are intentional. Modu and Joan should use the same pool differently because of their leader abilities, map investments and choices. Do not author a bespoke third pool for each pair.

## Availability and offer rules

### Five content bands, independent of government form

**User timing direction (2026-09-16):** cumulative scaling cards belong mainly in the first two ages; every deck needs faith by age 1–2; age 3 is the main tall/wide, authority and happiness step. For this worksheet, that means early scaling and faith in tier 0 / Government I, with empire-building choices concentrated in Government II. These are balance-stage correspondences, not a change that synchronizes the live technology and government clocks.

| Band | Government tier | Proposed unlock | Baseline chairs | Purpose |
|---|---|---|---|---|
| Early (Tier 0) | Chiefdom / tier 0 | Start | 3 | Establish a direction; accessible foundations, including early rares where available. |
| Middle (Tier I) | Government I | Regular draft count 4 | 5 | Add infrastructure, cross-type connections and tactical alternatives. |
| Late (Tier II) | Government II | Regular draft count 18 | 8 | Add conversion engines, developed-city rewards and specialization. |
| Advanced (Tier III) | Government III | Regular draft count 29 | 11 | Complete larger combinations; new uses for established assets. |
| Final (Tier IV) | Government IV | Regular draft count 45 | 11 | Endgame cards: finishers, late engines and the decks' signatures at full size. |

**Band 4 and the chairs (deck implementation, foundation batch, 2026-10-12).** The deck sheets' Tier IV is band 4. Its rung sits at draft count 45, where the last governments are offered. There is no fifth research age, so band 4 asks for age 4, the same as band 3, and only the ladder rung separates them. The chairs are the user's ruling in `docs/decks/deck-design.md` "More chairs" (3 / 5 / 8 / 11, replacing 3 / 4 / 6 / 9); the fifth rung keeps eleven.

Government tiers here refer to this proposal's four-stage progression, not the live game's five government promotions. They mark the earliest unlock; cards remain available in later tiers. Government form (Council, Crown or League) does not restrict access.

The **capacity sequence is the user's decision**. Retaining thresholds 4/18/29 is this proposal's provisional timing, inherited from the previous worksheet. They are culture-draft counts, not turns, ages or technology requirements. A doctrine reward is not a regular draft and cannot advance these counts. Card ownership is not a technology unlock: a card mentioning a University does not make Universities available before their technology.

**Age check — all six single-type decks (2026-09-16):** their four card bands now require **both** the listed government tier and research age **1 / 2 / 3 / 4**, respectively. Research age means the highest age among that empire's researched technologies, minimum 1, not the multiplayer world's mean age. Reaching Government I through culture alone therefore cannot offer an age-2 Market card while the empire is still in age 1. Within an age, normal technology, site and construction requirements remain: a card can encourage researching Currency and building a Market, but never grants either for free. This is a proposed offer gate, not an implemented rules change. Bridge and generic cards await their own timing pass; their rows are untouched.

Earlier cards remain eligible after each unlock. No pool rotates away; no owned card upgrades automatically. Unchosen cards may appear again. This avoids deleting an unfinished strategy when government changes.

### Normal three-card hands

1. Two positions come from the leader's two single-type pools, one from each. **C, U and R are all eligible in these positions.** Provisional rarity probabilities within an available category: **60% C / 30% U / 10% R**. Draw rarity first, then uniformly among eligible cards of that rarity; renormalize if a rarity is absent. These are probability targets, not per-card weights that change with catalogue size.
2. The third position alternates by regular draft number: **generic, cross-type, generic, single-type**, repeating. Thus generic commons occupy one sixth of base offer positions, cross-types one twelfth, and single-type identities three quarters. The extra single-type position alternates between the two leader decks on successive occurrences.
3. A cross-type needs **either** of the leader's types. It does not grant access to the other deck. A dual card matching both types is still one card ID, one candidate and one effect.
4. For rainbow, sample two different types uniformly for the first two positions. Use the same third-position cadence; on a single-type third position choose a different third type if possible. Generic cards are never sampled six times through six decks. This keeps Ibn's variety without inventing a seventh deck.
5. Every position excludes already owned IDs and cards already in the current hand. If its category is empty, fall back to any eligible unowned card using rarity-first selection. If fewer than three eligible cards remain, show a smaller hand. Never borrow an inaccessible deck or duplicate a card to fill space.
6. Redraws keep the same position categories and current unlocked bands. A new paid regular draft advances the cadence; repeatedly passing/redrawing one offer does not. Retained cards, if the live pass system supports them, keep their position and count as already present in that hand. Extra-offer effects add distinct eligible cards after the base hand, using rarity-first selection, without extra guaranteed generic or cross positions.
7. If a player's legal pool is fully owned, explain that it is exhausted and stop charging for empty normal drafts. Do not silently add repeat copies. The catalogue below is sized to avoid this during a roughly 45-draft game; longer games need an explicit continuation rule or additional content.

All draw rules are authoring proposals, not implemented behavior. They deliberately keep generic reliability and cross-type flexibility from overwhelming leader identity.

### Doctrine reward hands

- At proposed reform milestones **4, 18, 29 and 45**, offer three distinct unowned **R** cards from the same currently unlocked, leader-eligible catalogue. These are bonus rare-only opportunities; rares remain available in normal hands before and after them.
- Prefer a single-type rare from each leader deck, then another eligible rare, including cross-types. Exclude duplicates and use union-pool fallback if a source is empty. Rainbow samples different available types for its first two positions, then an eligible third rare. Extra-offer effects and legal redraw abilities apply to these hands too.
- Taking a card adds it to the collection. Ordinary Orders do not activate automatically, add chairs or evade seals. A Charter instead grants its named research or construction access once on selection, with no chair or seal; it grants neither a free technology nor a free building. Taking any rare in a normal draft removes that same ID from future doctrine hands, and vice versa.
- The player may bank or pass the reward; a banked reward does not block End Turn. Passing forfeits that opportunity. If all eligible rares are owned, resolve the reward as exhausted with no cost. No automatic compensation or new currency.
- There is **no three-rare ownership or activation cap**. Three active rare Orders occupy three chairs; Charters occupy none. Ordinary rare engines compete with their enabling Orders for chair capacity. A Charter costs a draft choice and subsequent research time or building expenditure instead.
- Ordinary ongoing rare benefits and penalties stop when unslotted. **The user's Universal Conscription explicitly makes its purchase ban permanent**; this is an exception requiring a clear confirmation/warning in any eventual UI, not a rule inferred for other rares. Ordinary world actions taken while a card was active remain: built buildings, purchased units, completed research and already paid windfalls are not reversed. Slotting itself never grants a reusable instant reward.

## Card-reading conventions

**Loss-trigger ruling (2026-09-16): deleting or voluntarily disbanding a unit never counts as “losing a unit.”** This applies to Songs of the Fallen, Blood Ledger and every other loss-triggered reward.

Every card table is proposed replacement rules text. Ordinary effects require activation unless stated otherwise; Charter access triggers on drafting; Scientific technology effects require research completion and Commerce building effects require acquiring the building. **C/U/R** indicate rarity; **Early/Middle/Late/Final** use the bands above. Deck membership is not a promise that every effect uses an already implemented primitive.

- Recurring bonuses require the card to be active. Event bonuses require it at the event, pay no retroactive rewards, and never recur merely because a card is reseated.
- Tile bonuses require worked tiles unless explicitly stated otherwise. “Farm” includes improvements marked as farms, including Terraces; terrain restrictions remain. Each worked tile belongs to at most one city's calculation.
- “Completing” or “training” a unit/building means production completion, excluding purchases and free grants unless stated otherwise. An explicit “counts as trained” clause, such as The King's Levy, overrides this default. Founding excludes capture, liberation and city transfer. Production refunds do not trigger another completion reward unless a genuinely different queued item completes.
- A garrison-presence condition pays once per city unless the text says per unit. **Dominion follows the user's per-garrisoned-unit ruling**, including ships, as stated in its section; that is not silently capped at one payout. “Culture building” and similar terms use the data category and include qualifying unique replacements. Named base buildings include their designated replacements; unrelated buildings providing the same yield do not automatically qualify.
- Routes mean routes you operate unless explicitly foreign-owned. A route's endpoint condition pays once per route unless stated otherwise. Multiple copies of a resource are ordered by stable tile ID where one “first” copy must be excluded; reassigning a worker cannot change which copy is excluded.
- First-contact, first-conversion and first-capture rewards are once per target per empire per game, recording the first event even if the card was inactive then. Slotting, reconversion, gifting, recapture and reloading cannot reset eligibility. Revealing the same vein twice cannot pay twice.
- Conversions read the city's recurring source yield **before card/government conversion outputs**. They never feed each other, themselves or windfalls. They may include non-conversion flats earned from other cards. Food-surplus conversions use that food minus consumption, floored at zero, before retention or growth payouts.
- Additional renown without a named family follows the ordinary renown allocation rules. Scholar renown is family-specific. Great-person improvement means the existing data-marked class, not a city wonder.
- Existing normal entry seals apply to **every rarity of slotted Order**, but never to Charters. Keep purchase escalation, action limits and build requirements. On unslot, extra capacity vanishes through normal over-capacity rules; existing cities, units and buildings are not deleted. A lost building unlock prevents starting/purchasing a new one; previously queued construction may finish, but no replacement queue entry may be added without the unlock.
- Extra worker charges apply on creation only. Movement/healing timing, adjacency and zone of control retain the normal rules unless explicitly changed. A production penalty is not a discount on gold or faith purchase prices.
- No automatic engine counters by chairs occupied, unused cards owned or card rarity. A Charter permanently grants named research, construction or rite access, not a recurring yield for an unused card. Effects should reward a real empire investment or action.
- **Growing cards:** counters advance only for events that occur while the card is active. The card keeps its recorded count when unseated, pays no recurring income while inactive, and resumes at that count when reseated. Only explicitly stated history-based cards read earlier events. This is the proposed interpretation of Dominion's growing cards as well; it needs approval before implementation.
- **One-time grants — ruled 2026-09-16:** “grants a great general” pays once on first activation of that owned card, never on reseating. Retain the used-grant flag through removal, government reforms and saves. The new five decks avoid instant unit grants on slotting.
- **Growth retention:** percentages retain part of the food actually spent on growth, add up to a maximum of 60%, and never cause a second growth that turn. This shared cap is proposed to stop multiple retention cards from making growth free.
- **New recurring-card scales:** values are intentionally closer to the user's Dominion pass. Base recurring yields before conversions may include other active non-conversion flats. No conversion output is eligible input to another conversion, including gold-to-production and production-to-gold pairs.
- New road/worker cards use instant builds and finite charges. No worker construction-duration system is introduced. Non-Dominion created-unit bonuses specify whether they persist from creation or require the card active.

### Timing pass — reviewed decks

Verified against [technology unlocks](../data/techs.json), [improvement prerequisites](../data/improvements.json) and [trade rules](trade.md). Earlier buildings remain useful in later ages; a late payoff does not need a new building merely because its name sounds advanced.

| Deck | Changes and retained openings |
|---|---|
| Dominion | Card effects and bands retained: Barracks, Stables, scouts and early mounted units are age 1; War Halls, Harbours and routes age 2; Armouries, Shipyards and siege units age 3. The conquest/administration and age-4 finish remain as approved. The new age floors prevent premature offers from fast government advancement. |
| Expansionist | Forty cards: population payments, planting, wild yields and worker-led claims begin in age 1; migration, mountain work and irrigation adjacency in age 2; renewal, great-work preservation and major administration in age 3; wider reach and mature-land payoffs in age 4. New actions are explicitly proposals. |
| Commerce | Forty-four cards: actual age-1 resources, scouting, Lighthouse and purchases; age-2 routes, Markets and one building Charter; age-3 mature partnerships, export industry and administration; age-4 purchased assets and finishes. Established-route age spans twenty-turn renewals; workers do not build roads. |
| Devotion | Forty-four cards, including two access Charters. Age-1 rites and faith-producing land; age-2 miracles, clergy, local learning and the sole income counter; age-3 administration, relic patronage and belief adjustment; age-4 consecrations, defence and finishes. Local play needs no founded religion; new rites require drafted access and their technology. |
| Scientific | Forty cards, including five on-draft Charters. Early exploration, faith and maturity precede age-2 great people and institutions. Age 3 connects works, legacies and provincial administration. Age 4 adds a second institution and mature construction. Optics explicitly advances Observatory access; other prerequisites remain. |
| Magisterial | Rebuilt around civic towns, world wonders, great works and legacies. Two age-1 civic counters and early faith precede age-2 patronage; Groundskeepers and Muses' Call wait for great-person access. Age 3 brings tall/wide administration and Golden Age. Assembly Hall retains its capital-only restriction. |

Claude's multiplayer playstyle columns are retained as broad context. The new Expansionist/Scientific line sections govern changed mechanics and supersede older statements that no unlock or land rule can change. The trade notes now correctly state that caravans need peace and contact, not open borders, and that land traders lay roads from age 2. Stables and Pachacuti's Terraces are already available in age 1; age-2 references to them mean continued development, not new unlocks. These are prerequisite/timing corrections, not a multiplayer balance verdict.

## Catalogue size

**385 distinct cards:** 330 single-type, 37 cross-type and 18 generic. There are **144 commons, 169 uncommons and 72 rares**. 10 entries grant access on drafting: five Scientific research Charters, three Commerce building Charters and two Devotion rite/building Charters. The remaining 375 are ordinary slotted-card proposals. These pools replace their predecessors rather than adding to them.

| Deck | Tier 0 | Government I | Government II | Government III | Total |
|---|---|---|---|---|---|
| Dominion | 11 | 25 | 32 | 17 | 85 |
| Expansionist | 10 | 10 | 12 | 8 | 40 |
| Commerce | 10 | 12 | 13 | 9 | 44 |
| Devotion | 10 | 12 | 14 | 8 | 44 |
| Scientific | 10 | 10 | 12 | 8 | 40 |
| Magisterial | 18 | 23 | 21 | 15 | 77 |

Expansionist and Scientific have forty cards each; Commerce has forty-four to preserve useful domestic, foreign, manufacturing and purchase alternatives. These budgets do not establish hand quality or balance. Devotion has forty-four cards for observance, miracles, missions and sacred destinations. Dominion, Magisterial and both shared pools retain their previous card rows.

## Single-type decks

The six playstyle guides below were written from the current leader abilities and the intended deck themes, without using the card rows as their design brief. They describe **desired play**, not a claim that the existing catalogue already delivers it. The guides retain broad leader and multiplayer context; the revised line briefs and replacement pools below govern Expansionist, Scientific, Commerce and Devotion. Magisterial retains its previous card table until its revised brief is applied. Dominion retains its approved card text; bridges, generic cards and earlier draft notes remain for separate review. Leader references: [live leader abilities](../data/leaders.json), [leader design notes](leaders.md), and the pairings above; specific effects described as needs are proposals, not new leader abilities.

A deck should support compatible approaches and a reliable mixed route. Across its cards it needs access to food, production, gold, research, culture, early faith, administration and military capacity; neither every individual line nor every opening hand must supply all of them alone. Foundations work before rares, and useful standalone cards must support Ibn Battuta's rainbow collections. These are authoring goals, not new tags, exclusive branches or player choices.

**Age pacing:** the tables use the game's four ages as a design arc: establish foundations in Omens, build an economy in Heroes, make tall/wide and authority/happiness choices substantial in Empire, and realize established investments in Cathedrals. Long-term counters and scaling foundations belong mainly in the first two ages. The government/draft clock remains separate; the six reviewed decks additionally use the minimum research ages stated above. Every route needs both the means to reach the existing victory requirements and enough production/security to finish; thematic payoffs do not automatically waive those requirements.

### Dominion

#### Playstyle goals — independent of the card draft

**Power fantasy:** “My armed forces make my civilization powerful.” Training, maintaining and deploying an army should sustain a functioning state: productive towns, military knowledge, legitimacy and the capacity to win. Peace, defence, raiding and conquest are different uses of that strength.

**Leader needs.** Taizong wants a capable standing army, productive garrison towns and an educated imperial court. Mithridates wants a compact, food-rich kingdom whose trained defenders can defeat a larger neighbour; gaining cities cannot be its only route to power. Modu wants mobile mounted forces supported by pastoral production, with raids worth conducting even without annexation. Joan wants military success that reinforces a religious homeland and advances her campaigns. Their second decks amplify those plans; Dominion must itself supply food, gold, research, culture, early faith and administration. Naval forces should be able to serve the same strategic roles as land armies where appropriate.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Professional army | Training, maintaining and preserving a capable force; military institutions and garrisons support the state. | A compact or distributed homeland can afford a strong army and remain economically competitive between wars. | Deterrence. Rivals read your army before declaring (the bot's declaration weighs strength ratios), so a standing force is a peace instrument; it costs neighbours nothing and buys you room to settle. |
| Raiding and campaigns | Mobility, favourable engagements, pillaging and repeated military successes; recovery keeps campaigns going. | The army creates value through action without needing to hold every place it attacks. Loss rewards soften costly fighting, rather than making deliberate waste the best plan. | Friction without conquest: pillaged tiles and plundered caravans hurt a neighbour's economy and earn grievance; clearing camps helps everyone nearby. Peace by exchange is the exit, and the war ledger prices it. |
| Conquest and incorporation | Taking useful towns, securing them and making them productive. | A successful campaign adds a functioning province rather than an unaffordable collection of captured towns. | The one zero-sum approach: a town taken is a town lost. The Courthouse decides whether it can be held; a peace that returns towns is the counter-offer; the whole table's threat reading rises against a conqueror. |

**Flexible route:** a mixed force supported by practical recruitment, logistics, defence and military institutions. It can respond to threats or opportunities without requiring a kill engine, a large occupied empire or an all-mounted army. It has a lower specialized ceiling, but needs a credible economy of its own.

| Age | Professional army | Raiding and campaigns | Conquest and incorporation |
|---|---|---|---|
| 1 · Omens | Training and defending early towns already help fund construction, knowledge or upkeep. *(Claude) Anchors: the Barracks and spearman (Bronze Working), the palisade (Stonecraft), the garrison reading itself — cards pay per garrisoned unit from turn five.* | Exploration, barbarian fighting and preserving a small force establish an action-based economy. *(Claude) Anchors: the scout and warrior (Agriculture), the archer (Fletching), barbarian camps as the age's legitimate war; the kill and camp occasions feed the growing cards.* | Build an affordable force and scout future targets; the opening must work before a city can be captured. *(Claude) Anchors: chariots (The Wheel); there is no siege ability yet, so walls hold and capture is not on the table — by design.* |
| 2 · Heroes | Military institutions and an experienced force sustain research, recruitment and town development. *(Claude) Anchors: the War Hall and phalanx (Bronze Panoply), stone walls (Siegecraft), the age-1 Stable (The Wheel); the War Hall's stamp is what "experienced" means.* | Pillaging, victories, mobility and recovery support longer expeditions; earnings help replenish and develop the homeland. *(Claude) Anchors: military embark (Wayfinding), the bowman, Markets and Temples as pillage targets worth the trip.* | Siege and reinforcement turn a first campaign into territory worth holding; early integration supports captured towns. *(Claude) Anchors: the siege ability (Siegecraft) opens the walls beat; a captured town still costs full authority and happiness — the Courthouse is an age away, which is the brake on early conquest.* |
| 3 · Empire | Strong garrison economies and trained forces support either large core cities or a defended network; happiness and administration keep pace. *(Claude) Anchors: the Armoury (Mathematics), the legionary and spear wall (Iron Working), the Great Wall (Satrapies) for the defended network.* | Several mobile forces can disrupt a larger empire while maintaining competitive domestic research and production. *(Claude) Anchors: the cataphract line — horseman, horse archer, war elephant; the catapult; galleys and fire ships (Shipwrights) for the coast.* | Authority, happiness, occupation recovery and connections make a substantial conquered realm viable. *(Claude) Anchors: the Courthouse (Iron Working) answers a captured town's cost — this is the age conquest is meant to begin; the Statue of Zeus; caravanserai roads to the provinces.* |
| 4 · Cathedrals | An established military state can research, construct and defend its own victory, without needing endless new enemies. *(Claude) Anchors: the Castle and pikeman (Castellany), the crossbowman (Machinery, with the cheaper road step), the Alchemical Codex.* | Military reach creates decisive pressure, resources and openings; the homeland can turn campaign success into victory investment. *(Claude) Anchors: knights (Militant Orders), the trebuchet (Natural Philosophy), ocean-going hulls (The Astrolabe).* | An incorporated empire supplies the knowledge, production and security to finish; continued expansion is a choice rather than the only way to stay solvent. *(Claude) Anchors: Alchemy opens the Opus door; the domination wager is the deck's bead — the endgame column should name it.* |

**Complete-empire requirements:** food/production through military settlement and institutions; gold through upkeep efficiency and campaigns; science/culture through training, military knowledge and established institutions; early faith through martial rites or commemoration; authority/happiness through both disciplined home rule and integration. Military strength is the deck's natural output, but research and civic development cannot require a second type or constant conquest.

**Mixing and boundaries:** professional forces can become raiders or conquerors; raids can finance an army or prepare annexation. Fleet variants belong throughout rather than being an isolated late package. Garrison play should still involve army investment and deployment decisions. A single research card should not be the only viable foundation for every approach. The intended tension is deploying forces versus retaining their domestic support, and funding another campaign versus developing what was gained.

#### Existing draft — unchanged

Garrison lines read **per garrisoned unit** throughout (the ruling of 2026-09-15: a ship is a garrison, so a coastal town with a soldier and a hull pays twice; the stacking cap is the only ceiling).

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text |
|---|---|---|
| Blooded Spears | C | +4 strength against barbarians. Clearing a camp grants 25 production and 25 food to your nearest city. |
| Martial Law | C | Each garrisoned unit grants its city +1 happiness and +2 food. |
| Paymasters | C | Barracks give +3 gold. Each garrisoned unit costs 1 less upkeep, minimum zero. |
| Muster Rites | C | Training a unit grants 5 faith and 5 food. |
| The War Chronicle | C | While slotted, pays +3 science and +3 culture, and gains +3 of each for every enemy unit you kill. |
| Conscription | U | +20% production toward units. Cities producing a unit lose 2 gold. |
| Pathfinders | U | Scouts gain +1 movement and +8 strength. |
| Drill Manuals | U | Barracks and Stables give +2 science. +20% production toward Barracks and Stables. |
| The Standing Army | R | Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units. |
| Blood Brothers | R | A barbarian unit you kill joins your side. |
| The King's Levy | R | Every fifteen turns your capital raises a melee unit for free. It counts as trained and costs no upkeep. |

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text |
|---|---|---|
| March Discipline | C | Military units gain +1 movement when starting their turn in your territory. |
| Field Surgeons | C | Military units heal an extra 10 health while fortified. |
| The Quartermasters | C | Worked strategic resources gain +2 food and +2 production. |
| Victory Steles | C | Gain +1 authority capacity for every two Monuments you hold. Monuments give +2 production. |
| Hunters' Offerings | C | Worked fishing boats, camps and pastures gain +1 production and +1 faith. |
| Quarry Levies | C | Worked mines and quarries gain +1 production and +1 gold. |
| Rites of Arms | C | Cities keeping a rite gain +2 production and +20% production toward units. |
| The Soldiers' Purse | C | Military units cost 1 less upkeep. |
| Veterans' Rest | C | Cities with a Barracks or a War Hall gain +1 happiness, and +1 more per garrisoned unit. |
| The War Hall Schools | C | War Halls give +3 science and +3 culture. |
| Shore Patrols | C | Worked fishing boats gain +1 production. Coastal cities with a Harbour gain +1 happiness. |
| The Marshals | U | +2 strength per adjacent friendly combat unit, at most +6. |
| Foragers' Right | U | Per garrisoned unit, the city's worked resource tiles gain +1 food and +1 production. |
| The Warlord's Call | U | On first activation only, grants a great general. Citadels gain +3 food and +3 production while this card is active. |
| Army Contracts | U | Routes from a city with a Barracks or a Stable gain +2 gold and +1 production; +4 gold and +2 production with both. |
| The Muster Rolls | U | While slotted, gains +1 science and +1 culture each time you train a unit. Purchases do not count. |
| The Pacified Marches | U | While slotted, gains +1 authority capacity and +3 culture for every barbarian camp cleared. |
| The Art of War | U | Training a unit grants science equal to half its strength. |
| Soldier-Settlers | U | Newly founded cities receive a free melee unit. Newly trained melee units carry one builder charge, for improvements or a chop. |
| The Iron Hand | U | +6 authority capacity. |
| The Sea Levy | U | Ships cost 1 less upkeep. Training a naval unit grants culture equal to its strength. |
| War Foundries | R | Cities with a Barracks gain gold equal to 20% of their base production and +25% production toward military units. |
| Songs of the Fallen | R | Killing or losing a unit grants science and culture equal to that unit's strength. |
| Universal Conscription | R | +50% production toward units. Once slotted, you may never purchase a unit again this game. |
| Horse Lords | R | Mounted units gain +3 strength and +1 movement. |

#### Tier 2 — Late (Government II · age 3+)

Age three is where the deck's verb turns from keep to take: the conquest kit arrives, and the garrison economy scales to the age.

| Card | Rarity | Proposed text |
|---|---|---|
| Siege Works | C | +25% production toward siege units. Siege units gain +4 strength against cities. |
| The War Chest | C | Military units cost 1 less upkeep, minimum zero. Barracks give +3 gold. |
| Armoury Guilds | C | Armouries give +3 science and +3 culture. Cities with one gain +10% production toward buildings. |
| Veterans' Boroughs | C | Cities of at least ten population with an Armoury gain +3 happiness and +20% science. |
| Conquered Archives | C | Captured cities gain +10 science and +10 culture. |
| Stockpiles | C | Cities gain +5 food per defensive building. |
| The Post Roads | C | Cities connected by road gain +1 happiness and +2 production. |
| Provincial Garrisons | C | Per garrisoned unit, the city gains +10% production toward buildings. |
| Triumphs | C | Capturing a city grants culture equal to ten times its population. |
| Camp Followers | C | Cities with an Armoury gain +3 food and +3 gold. |
| Naval Yards | C | Cities with a Shipyard gain +10% production and +2 culture. Ships trained there gain +10 health. |
| Scorched Earth | U | Pillaging heals the acting unit by 20 and pays the hex's gold yield again in faith. |
| Marine Drill | U | Naval melee units gain +4 strength. Land units attacking on the turn they disembark gain +3 strength. |
| Riders of the Steppe | U | Mounted units ignore enemy zone of control. Pillaging costs them one less movement point, minimum zero. |
| Fortifications | U | Workers may build forts on open ground without forest or jungle. A fort gives +2 food and +2 production, and friendly units fortified on it gain +5 strength. |
| Beachheads | U | Embarking and disembarking cost no movement. |
| The Long March | U | Melee units gain +1 strength and +1 movement. |
| The Iron Levy | U | +1 production toward units per strategic resource you hold, at most +6. Units cost 1 less upkeep while you hold iron. |
| Undermining | U | Your units gain +8 strength against cities with walls. Siege units ignore zone of control. |
| Mercenary Companies | U | Military units cost 25% less gold to purchase in cities with a Barracks. A purchased unit arrives with +10 health. |
| Levies of the Provinces | U | Captured cities produce units 30% faster and gain +2 food. |
| Spoils of War | U | Pillaging grants 10 production to every city. The first pillage each turn also grants 20 culture. |
| Warlords | U | Each great general you hold gives +10% production toward units. Citadels gain +2 production and +2 culture. |
| Prize Courts | U | Capturing a coastal city grants gold equal to twenty times its population. Ships adjacent to a city you capture heal fully. |
| The Admiralty | U | +1 trade-route capacity per two Shipyards, at most +2. Naval units gain +1 sight. |
| Blockade | U | A hostile coastal city with one of your ships adjacent counts as besieged. Routes into it are plundered at your ship. |
| Hegemony | R | Captured cities you hold cost one less authority. Capturing a city grants +20% production in every city for ten turns. |
| Triumphal Return | R | Capturing a city that holds a wonder heals all your units. |
| The Blood Ledger | R | The yields from killing or losing a unit are doubled. |
| Master Bowyers | R | Ranged and siege units gain +1 range. |
| Pax Imperia | R | While at peace, every city gains +20% production and +2 happiness. Declaring war silences this card for twenty turns. |
| The Sea Treasury | R | Per garrisoned unit, a coastal city gains production equal to 25% of its gold yield. |

#### Tier 3 — Final (Government III · age 4+)

The age's business is the Opus and the last war: the band pays the standing army at scale, turns captured provinces into empire, and ties conquest to the door. Every yield line is a percentage or a flat in the tens, since empire science in this age runs to the thousands.

| Card | Rarity | Proposed text |
|---|---|---|
| Standing Garrisons | C | Per garrisoned unit, the city gains +8% production and +8% culture. |
| Spoils of Empire | C | Captured cities gain +25% gold and +25% science. Cities with a Courthouse gain +4 happiness. |
| The Military Roads | C | Your military units pay nothing for a road step inside your territory. Cities connected to your capital gain +10% production. |
| Arsenals | C | Cities with an Armoury gain +20% production and produce ships 50% faster. |
| The Siege Train | U | Siege units gain +1 movement. Adjacent friendly land melee units gain +6 strength against cities. |
| Reserve Officers | U | While at war, cities with a Barracks produce military units 40% faster; while at peace, those cities gain +20% production toward buildings. |
| Blockade Admirals | U | Naval combat units gain +1 movement and +3 strength within two hexes of a hostile coastal city. |
| Defensive Lines | U | Land combat units gain +3 strength beside a friendly city. Cities with walls gain +3 defence per garrisoned unit. |
| War Colleges | U | Units trained in a city with an Armoury gain +1 movement and +20 health. |
| The Grand Levy | U | Cities with a Barracks produce units 50% faster and gain +1 production per two citizens. |
| Naval Supremacy | U | Naval units gain +1 sight and +1 range. Coastal cities gain +20% gold; coastal captured cities +40%. |
| The Long Peace | U | While at peace, garrisoned units cost no upkeep and cities with a Barracks gain +25% culture. |
| The Veterans' Grant | U | Each military unit you have ever trained gives your capital +2 production and +2 science, at most +60 each. |
| Blitz | R | Once per unit per turn, a combat kill restores 2 movement points. Your military units cannot fortify. This does not grant another attack. |
| Imperium | R | Each captured city you hold gives +5% production toward the Magnum Opus, at most +40%. |
| Casus Belli | R | Capturing an original capital grants a bead. |
| Total War | R | All your military units gain +8 strength and +1 movement. Every city demands +3 more happiness. |

Garrisons, recruiting, raiding and formations each have support. Late naval and siege options give military leaders an alternative to a melee-only finish. The rare choices favor a standing army, territorial conquest or mobile finishing blows.

### Determinations — 2026-09-16

- **War Chronicle:** keep the common card exactly as written: +3 science/+3 culture base and +3 of each per enemy kill while active. Its reliable early research/draft income is intentional. Do not apply the suggested +1 increment or rarity change.
- **Paymasters:** approved; added as a tier-0 common for early gold and garrison upkeep relief.
- **Victory Steles:** +1 authority per **two** Monuments, retaining +2 production per Monument. Count complete pairs; no extra cap is added. Iron Hand stays in its existing tier; moving it was not approved.
- **Veterans' Boroughs:** approved; added as a government-II common: cities of at least ten population with an Armoury gain +3 happiness and +20% science.
- **Warlord's Call:** the great general is granted on first activation only. Reseating cannot repeat it; Citadel yields remain active-card bonuses.
- **Unit losses:** deletion/disbanding never triggers loss rewards. This ruling applies to the whole killing/losing line, not only one card.
- **Blood Ledger:** retain the doubled-yield payoff for the killing/losing line. It is intended to keep that build scaling later. The review's windfall-only restriction is **not adopted**; keep the printed card. Exact treatment of growing-card increments versus recurring kill/loss-derived income still needs explicit implementation wording; do not silently narrow or multiply both layers.
- **Casus Belli:** keep its printed late-game bead reward. The proposed two-bead cap is not adopted. Normal event identity/recapture semantics still need explicit implementation wording; no additional limit is inserted here.
- **Military Roads:** zero-cost owned-territory road steps are intentional, to make war less tedious. Preserve the printed card; do not replace zero with a small positive cost. Pathfinding and interaction with other movement tolls still need ordinary implementation checks.

Notes on the Dominion catalogue:
- Coverage: every role is covered by tier 1. Culture and science ride the growing cards (per kill, per unit trained, per camp cleared); the per-unit-trained one matters most because it pays at peace.
- Identity: five tier-1 commons are pure economy with no military condition (Quarry Levies, Hunters' Offerings, Victory Steles, The Quartermasters, Rites of Arms). Conditioning them on a garrison or a military building would keep the deck's voice without weakening the economy.
- Early-war safety: every kill-fed card counts barbarians, and no card before tier 3 pays only during war. Pax Imperia is the peace-path rare.
- Scale: tier 3 yields are percentages or large flats; strength figures stay flat because the combat ledger does not inflate with the age. Casus Belli is retained at its printed strength by the user's 2026-09-16 ruling because it arrives in the late game; no proposed two-bead cap is adopted. The Sea Treasury is written at a quarter per garrisoned unit so a hull and a soldier make a half.
- New effect shapes asked for (each a design decision, defer-never-bend): a killed barbarian joining your side; melee units carrying a builder charge; forts as a card-unlocked improvement with a fortify bonus; a permanent "no more unit purchases" stamp on the empire; heal bonuses (fortified, beside a city); free embark; healing on capturing a wondered city; windfalls scaled by a unit's strength; a card granting a great general; a strength line with a walls predicate; a hull joining the siege field. The cheapest are the strength basis, the heal bonus and the permanent stamp; the dearest is the melee builder.

### Expansionist

#### Playstyle goals — independent of the card draft

**Power fantasy:** “I turn the land into a prosperous civilization, and that prosperity makes my empire powerful.” Population, productive countryside and connected settlements should support scholarship, faith, wealth, military capacity and victory construction. Land-access utilities help realize that promise; they cannot substitute for its economy.

**Leader needs.** Pachacuti wants many modest, productive mountain towns joined by roads, using terraces and mountain-farm gold; large-population requirements cannot gate all useful rewards. Mithridates wants abundant plantations and camps feeding a compact kingdom that can sustain research, development and a formidable army. Nezahualcoyotl wants irrigation and public works to support large, capable cities and an intellectual capital. Commerce, Dominion and Scientific respectively deepen those empires; they should not be required to repair a missing economic function in Expansionist.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Population | Food, natural growth and the institutions that make citizens productive. | Growing a city improves what the empire can accomplish, not only how much food it consumes. | Big cities are prizes: a tall empire is the conqueror's target and the trader's best destination. Its borders press outward as culture accrues, so a tall neighbour is a land dispute in slow motion. |
| Cultivation | Workers, improved resources and valuable worked land. | A developed countryside competes through the quality of its land use rather than city count alone. | Improved land is what raiders pillage and what workers repair; a cultivated frontier is a reason to garrison it. Luxuries worked here are the deal currency in every exchange. |
| Settlement network | Founding, connecting and developing several towns. | Each new settlement becomes a useful contributor, while established towns help the next ones succeed. | Forward settling is the age-one act most likely to start a war: it takes land a neighbour wanted and triggers the bot's threat reading. Roads and open borders make the network a highway for friends and enemies alike. |

**Flexible route:** combine ordinary development with People, Woodland, Wild, Spade and Country cards. These five line labels describe overlapping investments, not compulsory card families or selected branches. The preceding age table preserves the earlier broad goals; the new pool below replaces its old growth/founding engines.

| Age | Population | Cultivation | Settlement network |
|---|---|---|---|
| 1 · Omens | Early growth already contributes to construction or knowledge, making food investment rewarding. *(Claude) Anchors: the Granary (Pottery), the growth occasion, the Hanging Gardens (Calendar).* | Workers and first improvements generate enough value to compete with another building or settler. *(Claude) Anchors: the worker (Agriculture), farms (Agriculture) and pastures (Husbandry), mines (Mining), the first-improvement occasion; the Temple of Artemis for pastoral starts.* | Settle promising locations; initial support helps recover the investment without making settlers free or self-financing. *(Claude) Anchors: the settler (Agriculture), the Monument's border growth (Stonecraft), the recommended-site reading in the settler lens; the palisade for the frontier town.* |
| 2 · Heroes | Granaries, irrigation and population support construction, research and culture; concentrate growth or distribute it. *(Claude) Anchors: the Garden (Irrigation), the Temple and Amphitheater as happiness for a growing town, the Stele of Laws (Code of Laws) for the town cap.* | Develop food-rich estates, productive hills, retained woodland or a mixture; worked land begins funding the broader economy. *(Claude) Anchors: the Smithy's resourced mines (Bronze Panoply), the Market's luxuries (Currency), Terraces where Pachacuti has them.* | Connections, provisioning and basic institutions turn young towns into contributors; founding alone is insufficient. *(Claude) Anchors: the trader and domestic routes (Currency), the Harbour (Wayfinding) for coastal towns, roads laid by land traders; the connection to the capital is the gold ledger's own fact.* |
| 3 · Empire | Substantial happiness and infrastructure support genuinely large cities and their scientific, cultural or military output. *(Claude) Anchors: the Aqueduct and Baths (Engineering), the Public Bath (State Workforce), the Circus Maximus; this is the age of twelve-population towns.* | Intensively developed land remains competitive with acquiring more towns or citizens; specialized and mixed regions both work. *(Claude) Anchors: the Workshop (Guildhalls), the Watermill (Engineering), the distinct-improvement-types count — the deck's own diversification reading.* | Authority and provincial development support a broad realm; mature towns sustain younger or remote settlements. *(Claude) Anchors: the Town Charter (Daughter Cities) — the wide empire's own tech — the caravanserai roads (Silk Road), the Courthouse for a province taken rather than founded.* |
| 4 · Cathedrals | Exceptional cities sustain advanced research, major construction and military capacity. *(Claude) Anchors: the University (Scholarship), the Bank (The Counting Houses), the Forge (Steel).* | A thoroughly developed homeland provides the resources, knowledge and production needed to finish. *(Claude) Anchors: the Printing House (Movable Type), Machu Picchu (Natural Philosophy) for the mountain empire; Alchemy's door.* | A functioning commonwealth combines established towns into competitive research, military production and victory construction. *(Claude) Anchors: ocean-going settling (The Astrolabe) for the colonial realm, castles (Castellany) on the frontier; the deck has no natural wager family — its bead must be stated (economic through provinces, or culture through cities of twelve).* |

**Complete-empire requirements:** food/production through growth and land development; gold through productive estates, resources and connected settlements; science/culture through citizens, practical development and local institutions; early faith through agricultural or settlement traditions; authority/happiness through public infrastructure and provincial administration; military capacity through recruitment, provisioning and territorial defence. Population, cultivation and networks each need alternative ways to cover these jobs, rather than sharing one mandatory research card.

**Mixing and boundaries:** population plus cultivation creates fertile, productive heartlands; cultivation plus networks creates Pachacuti-like regional economies; population plus networks supports several substantial provincial capitals. A food bonus on camps can be a useful foundation. Successive cards should also help use the surplus and manage its consequences, instead of adding another yield to every camp. Tall starts need income without repeated founding; small-town networks need research without population-twelve gates.

#### Rebuilt card pool — citizens, woodland and the working frontier

**Rewritten from the [line brief](astra-brief-expansionist-scientific.md), 2026-09-16.** Forty cards replace the former seventy-two. **People** grows, spends and restores population; **Woodland** plants, matures and harvests forest; **Wild** makes preservation productive; **Spade** claims and irrigates land through workers; **Country** specializes settlements and combines complementary provinces. Labels organize the proposals, not player-selected branches. Shared cards explicitly connect lines.

These proposals intentionally add population payments, migration, planting and land-access exceptions. The earlier draft's prohibition on new land-control rules is superseded. Numbers are first-pass proposals; bracketed notes identify new implementation shapes. Plain growth, improvement and defence still work without these cards.

**Shared readings for these forty cards:**

- Bonuses require the card active. Natural-growth rewards count only growth beyond the city's historical population maximum; levy recovery, migration, founding and free population do not repeat them. Food retention still aids recovery and obeys the shared 60% cap. Growing Annals is the only accumulated-income card here.
- A levy costs one actual citizen, never the last. Each city may use one population levy per five turns, shared by production and military levies. Production reads recurring food before spending the citizen, excluding conversion outputs and windfalls. Migration transfers a citizen without changing their empire total and cannot empty a city. Cooldowns persist when cards are unseated. These restrictions price a new use for population; they do not make it a new bank.
- Planting costs a normal worker charge and movement. Eligible land is owned, clear, non-city grassland, plains or tundra without an improvement or incompatible resource. Planted forest matures after twenty turns; young planted forest cannot be chopped for a payout. Natural starting forest is mature. Harvest/replant resets maturity. Existing resource-protection restrictions remain. Forest bonuses to tiles require those tiles to be worked.
- Ordinary improvements are farms (including Terraces), pastures, plantations, camps, mines, quarries, lumbermills and fishing boats. Roads do not disqualify otherwise unimproved land. Great-person works and Holy Sites are separate; Hermitages only changes the former's eligibility for these card bonuses. Adjacency bonuses never read their own outputs.
- Claim by the Spade targets unowned, improvable land adjacent to owned territory and within an owned city's normal claim limit; nearest eligible city receives it. It never takes foreign land or expands work radius by implication. Record each hex's first claim through this action for the claim windfall; replacing or repairing an improvement cannot pay again. Watercourses and Irrigation Works affect farm irrigation only, not city freshwater, river combat, movement or geometry.
- Founding geography is recorded once for every city, whether a card is active or not. One trait per city, with this proposed precedence: river, coast, hill, forest, desert, tundra/snow, otherwise plain. Rivers mean actual river adjacency, not irrigation; coasts exclude lakes. This prevents a single site stacking every benefit and creates no new trait-selection action. A different precedence can be judged in playtests.

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| Smallholdings | C | Worked farms and pastures gain +1 food and +1 gold. | Country → People |
| Granary Levies | C | When a city grows in population, gain 15 production | People |
| Levy of the Land | U | Cities may spend one citizen to gain production equal to ten turns of their food. A city may levy once every five turns. [Population-payment action.] | People → Spade | [move to age 2]
| Planted Forests | C | Workers may plant forest on eligible open land for one charge. It matures after fifteen turns. [Planting and maturity.] | Woodland → Wild | [move to age 2]
| The Groves and the Stones | C | Unimproved forests gain +1 faith, in a city with a Shrine. | Wild → Woodland |
| The Naturalists | U | Each city gains +1 science for each distinct feature type it works. Your capital gains +1 science. | Wild → Country | 
| Claim by the Spade | U | Improving unclaimed land beside your border claims it for the nearest eligible city. Each hex first claimed this way grants that city 15 food and 10 gold. [Improvement-led claim.] | Spade → People, Country |
| Tinkers' Guild | C | Workers you produce or purchase gain +1 charge. | Spade → Woodland | [move to age 2]
| The Growing Annals | U | While active, gains +1 science and +1 culture per turn whenever one of your cities grows in population, no cap. | People |
| The Patient Harvest | R | Cities retain 30% of the food spent on growth, but produce military units 15% more slowly. | People; trade-off |
[note: need wide benefits]
+25% production towards settlers, cities settled adjacent to a resource cost 1 fewer authority.
gain +1 faith on luxury resource tiles [need consistent early faith]

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
+1 renown for every unique luxury resource.
| Old Growth | C | Worked mature forests gain +1 food and +1 production. Chopping mature forest grants 50% more production. | Woodland → People |
| Charcoal Burners | C | Chopping forest or jungle also grants faith and culture each equal to 20% of its chop production. | Woodland |
| The Woodland Edge | U | Worked ordinary improvements beside unimproved forest gain +1 production per adjacent forest, at most +2. Worked unimproved forests beside a farm gain +2 food, once per forest. | Woodland ↔ Wild, Country |
| The High Pastures | U | Your cities may work owned mountains within their work radius. Those mountains provide 3 production and 2 faith. [Workability exception, not movement permission.] | Wild → Country |
| The Watercourses | U | Farms directly beside a river irrigate adjacent farms. Irrigated worked farms gain +1 production. Water does not relay beyond that first step. [Farm-water adjacency.] | Spade → People |
| The Muster of the Fields | U | Cities may spend one citizen to muster their best legally available melee unit. This shares the city's five-turn levy limit. [Population payment; normal technology and resource access.] | People → military |
| The Great Migration | U | Once every ten turns, move one citizen from one connected owned city to another. [Migration action; neither city triggers a growth reward.] | People → Country | [remove]
| The Land Shapes Us | R | Cities gain their founding trait: river +3 food/+3 gold; coast +1 route capacity; hill +3 production/+3 defence; forest +3 science; desert +4 faith; tundra/snow +4 culture; plain +2 food/+2 production. Exactly one trait applies. | Country → all lines |
| The Old Songs | C | Worked unimproved land gains +1 culture. | Wild |
| The Local Census | C | Gain +1 authority capacity for every two cities working at least four land tiles, at most +3. | People ↔ Wild, Country |
[need to add science/culture yields in cards]
+1 culture on tiles adjacent to a great work.
farms gain +1 production for every two adjacent farm tiles [maybe?]
rare: +1 science and +1 culture on improved resource tiles in cities with a national building

#### Tier 2 — Late (Government II · age 3+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
+1 renown for each great work worked by a city.
| The Common Treasury | U | A production levy also grants each other connected owned city production equal to 20% of the levy's original payout. Shared production cannot trigger another sharing payout. | People → provincial network |
| Irrigation Works | U | Workers may build irrigation works for one charge on eligible owned open land. Adjacent farms count as irrigated and gain +1 food when worked. irrigation works base yield: +1 food +1 science [New improvement; ordinary tile/resource restrictions apply.] | Spade → People |
| Reclamation | C | Clearing jungle changes its land to plains and grants 30 food in addition to normal chop production. [Underlying-terrain change; does not change hills or resources.] | Spade → Woodland, People | [rework: clearing jungle or forest grants 30 culture in addition to normal chops, tile gains +1 food after chopping, we could have this stack with coppice]
| The Coppice | R | Chopping mature forest you planted leaves young forest standing. It matures again after fifteen turns and cannot be harvested while young. | Woodland → Wild |
| The Hermitages | R | Great-person works qualify for your unimproved-land card bonuses. Each great-person work also grants adjacent worked tiles +2 of each of its positive native yield types. [Native yields exclude card additions; no propagation.] | Wild → Scientific, Magisterial |
| The Old Ways | U | Worked unimproved land gains +2 food and +2 gold. Worked ordinary improvements lose 1 production, to a minimum of zero. Great-person works are exempt from this penalty. | Wild; trade-off |
| The Highlands | C | mines and quarries on hills gain +2 science and +1 production. | Country → Scientific |
| The Steppe | C | pastures gain +2 production. Horse-dependent military units cost 25% less production. | Country → military |
| The Floodplains | C | floodplain farms gain additional food equal to their native food yield before card additions and multipliers. | Country → People | [simplify: 50% more food on floodplains]
| The Coast | C | Worked fishing boats gain +2 food and +2 culture. | Country |
| Provincial Councils | U | Each connected noncapital city working at least four land tiles grants +1 authority capacity, at most +8, and gains +1 happiness. | Country ↔ Spade, Wild |
| The Grain Dole | C | Cities of at least ten population gain +4 happiness and retain an additional 20% of food spent on growth. | People |
While slotted, this card gains +1 authority for every great person improvement created. Starts at +1 authority.
Units gain additional +4 combat strength while fighting in either forest or hills (does not stack on forested hills). Units ignore terrain penalties from moving onto forest or hills.

#### Tier 3 — Final (Government III · age 4+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
great works with an adjacent great work gain double yields (binary, does not stack)
| The Woodwrights | R | Forest and jungle chops grant 100% more production. Chop percentages add together before Charcoal Burners reads the payout. | Woodland; harvest payoff |
| The Complementary Provinces | R | Connected cities gain +5% production and +5% culture per different founding trait represented among your connected cities, at most +30% each. The Land Shapes Us need not be owned. | Country → network |
| The Varied Country | U | Cities working at least four distinct terrain or feature types gain +20% food, production, gold and culture. Each distinct base terrain and feature counts once. | Country ↔ Wild |
| The Common Domain | U | Cities may work owned land one hex beyond their normal work radius and lock two additional tiles. This grants neither citizens nor ownership. [Work-radius and assignment-cap extension.] | Spade ↔ Wild, Country |
| Seasonal Levies | U | After spending a citizen on either levy, that city gains +40% food for ten turns. Repeated levies refresh the duration; they do not stack it. Regrowth triggers no historical-growth reward. | People; recovery payoff |
| The Harvest Tithe | C | Worked farms beside unimproved land gain +3 gold, once per farm. Farms beside a mature unimproved forest also gain +2 production. | People ↔ Wild, Woodland |
| Forest Sanctuaries | U | Worked mature unimproved forests gain +2 culture and +2 faith. Cities working at least three demand 20% less population happiness. | Woodland ↔ Wild; preservation payoff |
| The Land's Great Work | R | A city constructing an empire building, world wonder or the Opus gains production equal to 50% of its base food surplus. Military production in all your cities is reduced by 20%. Normal construction requirements remain. | People → major construction; trade-off |

#### Four-chair combinations and alternatives

These are test hands, not required sets. Earlier cards stay useful. No new line-selection or quest system is introduced.

| Direction | Four active cards | Changed decision and missing-card alternative |
|---|---|---|
| Agricultural levies | Smallholdings; Levy of the Land; The Patient Harvest; The Common Treasury | Feed a centre, spend citizens to build the provinces, then recover. Without Common Treasury, local levies still fund settlers/infrastructure; Migration redirects citizens instead. |
| Managed woodland | Planted Forests; Old Growth; Charcoal Burners; The Woodland Edge | Preserve some stands for adjacency and harvest others for a construction window. Natural forest works before planting is drafted; Coppice later improves renewal rather than enabling the whole plan. |
| Preserved country | The Naturalists; The Old Songs; The High Pastures; The Old Ways | Feed citizens working wild land and mountains instead of improving every tile. Groves supplies early faith; Woodland Edge is a material alternative where mountains are absent. |
| Productive frontier | Claim by the Spade; Tinkers' Guild; The Watercourses; Provincial Councils | Charges compete between claiming resources and irrigating the homeland. Country specializations or ordinary farms remain useful without Watercourses; authority support arrives in age 3. |

**Systems to review:** population payments and migration; planting/regrowth and visible maturity; outside-border improvement/claims; farm-water adjacency and an irrigation improvement; mountain work and radius extension; jungle terrain mutation; founding-trait history. Retain normal military legality, settlement rules and victory gates. Render/AI support is part of those new mechanics, not implied by existing mutable tile fields. The rest of the game's base-yield balance remains a separate pass.

### Commerce

#### Playstyle goals — independent of the card draft

**Power fantasy:** “My empire makes distant places useful to one another, and its wealth lets me act where others must wait.” Resources, exchange and investment should create a complete economy, with decisions about what to connect, what to develop and where to spend. Gold matters because it enables action, not merely because its total is large.

**Leader needs.** Pachacuti wants to use mountain income and road-linked towns to finance development across a dispersed homeland. Mansa Musa wants mines, camps and desert wealth to sustain religious-commercial centres and pilgrim exchange; trade must help him obtain food, production and research as well as more gold. Zheng He wants mobile fleets, valuable coastal destinations and an overseas network that rewards discovering and connecting places. Ibn Battuta's rainbow access should make standalone commercial tools useful to many mixed collections, without turning Commerce into compulsory access to every other deck's engine.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Domestic provisioning | Productive origins, well-chosen destinations and internal trade infrastructure. | Established cities support new towns or a major centre; the whole empire develops faster because its parts cooperate. | Nearly self-contained, and that is its value against a hostile table: internal routes cannot be closed by a border, only plundered by a raider inside it. The one approach that owes neighbours nothing. |
| Foreign and maritime exchange | Contacts, external routes, ports and access to useful partners or resources. | Reach and relationships produce wealth and knowledge beyond what the homeland could generate alone. | The most social approach in the game: it needs contact and peace (traders do not require open borders), pays the partner's town as well as yours, and is the first casualty of a war. It gives a rival a reason to keep you alive and a lever to hurt you. |
| Resource enterprise and reinvestment | Commercial resources, markets, profitable assets and deliberate purchases. | Developed wealth becomes workers, buildings, troops or institutions at the moment they matter. | Luxury copies are the deal currency — the one deal the bot offers unprompted is a luxury swap — and gold is the answer to a surprise: mercenaries bought the turn a neighbour declares. Wealth is the deterrent a Commerce player fields instead of a standing army. |

**Flexible route:** markets, resource income, sensible routes and selective purchasing support an adaptable economy. Domestic trade and enterprise provide alternatives when foreign access is poor. Sea routes are a geographical expression of exchange, not a prerequisite for every useful Commerce card.

| Age | Domestic provisioning | Foreign and maritime exchange | Resource enterprise and reinvestment |
|---|---|---|---|
| 1 · Omens | Prepare a productive origin and a useful second destination; economic foundations work before a network exists. *(Claude) Anchors: there is no trader until Currency — the age is resource development, the Granary and the Lighthouse (Sailing) for a coastal origin; roads wait for land traders in age 2.* | Exploration and first contacts help establish an economy; an isolated start has useful preparatory or domestic alternatives. *(Claude) Anchors: the scout, embark (Sailing), open borders (Writing) — the first-contact occasion is the age's payoff.* | Develop available commercial resources and earn enough to make an early purchase consequential. *(Claude) Anchors: mines and camps on luxuries (Mining, Fletching), the Tithes project (Calendar); the first purchase is a worker or a tile.* |
| 2 · Heroes | Routes and local institutions help young cities grow or concentrate output in a key city. *(Claude) Anchors: the trader and Market (Currency) — routes begin here; the Harbour (Wayfinding) opens domestic sea routes.* | Active partners and coastal access supply a mixture of income, knowledge and opportunities; routes are worth protecting. *(Claude) Anchors: foreign routes need contact and peace, not open borders; the bireme escorts them; the Colossus; a plundered caravan is the age's grievance.* | Markets and resource development turn income into repeated infrastructure or unit investment, with viable research and culture. *(Claude) Anchors: gold purchases at the Market's price, the Rite of Plenty (Currency), the Mausoleum; luxury swaps become deals.* |
| 3 · Empire | Choose between a strongly provisioned centre and a broad network; happiness, authority and route capacity support either. *(Claude) Anchors: the Caravanserai (Silk Road) adds route capacity per town; the Workshop (Guildhalls) as the productive origin; the Town Charter for the network.* | Multiple destinations sustain a trading realm; lost access matters, but rerouting and alternative partners allow recovery. *(Claude) Anchors: the Shipyard and galleys (Shipwrights); the Forum (Rhetoric); route capacity is now the deck's binding constraint and its cards' subject.* | Productive commercial cities can specialize or spread investment; wealth helps meet administrative and military needs. *(Claude) Anchors: buying Aqueducts and Courthouses outright; the Public Bath; mercenary purchases at the Armoury's town.* |
| 4 · Cathedrals | The network sustains major construction and the cities needed to support it. *(Claude) Anchors: the Bank (The Counting Houses), the Mint, Bazaar and Bourse (Paper Money) — the age's whole commercial tier arrives at once.* | An established international network funds research, strategic reach and victory investment rather than just accumulating route gold. *(Claude) Anchors: the caravel and carrack and ocean-going (The Astrolabe), the established Silk Road network from age 3; the economic wager is the deck's bead.* | Deliberate spending can accelerate late institutions and defence, or release production for the victory project; money does not bypass every construction restriction. *(Claude) Anchors: a wonder is never for sale and the Opus is not either — gold buys the University and the Castle so hammers go to the door (Alchemy).* |

**Complete-empire requirements:** food/production through provisioning and investment; gold through resources and exchange; science/culture through contacts, commercial institutions and circulation of knowledge; early faith through local merchant rites and pilgrimage preparations as well as later routes; authority/happiness through viable commercial towns and access to goods; military capacity through affordability, recruitment and protection of trade. Purchase-based options need a real income source and cannot rely on infinite refunds.

**Mixing and boundaries:** resource wealth finances routes; foreign earnings develop domestic destinations; provisioning builds stronger commercial centres. A commerce empire must have worthwhile ways to spend and protect wealth, not just increase its rate. Foreign trade should reward access without requiring an opponent to consent to the deck functioning. Support mixed economies and unfamiliar maps rather than making every player build the same port or acquire the same luxury.

#### Rebuilt card pool — partnerships, reach, goods and investment

**Rewritten from the [Commerce brief](astra-brief-commerce.md), 2026-09-16 · proposal only.** Forty-four cards replace the former seventy-two: **forty-one slotted Orders and three on-draft building Charters**. The extra four slots above the approximate forty-card budget preserve domestic allocation choices, export support and a material finish without relying on foreign access. Numbers remain review proposals, not tested balance.

| Playstyle | Loop and different decision | Shared support |
|---|---|---|
| Established partnerships | Build useful origins, run and renew routes, choose a major destination or several provinces. | Routes, purchasing, domestic posts and maturity. |
| Commercial expansion | Explore, reach new partners, establish commercial footprints, use them to expand reach. | Ways, Posts and Table; can later settle into established partnerships. |
| Manufacturing and exports | Improve goods, develop duplicate copies, purchase commercial buildings, export surplus or manufactured luxuries. | Luxuries, diplomatic agreements and purchase proceeds. |
| Purchased capability | Earn gold, choose between a reserve and investment, buy infrastructure, military units or great-person offers. | Any income line; domestic production still builds wonders and the Opus. |

**Card labels:** Routes = allocation and duration; Posts = established commercial footprints; Luxuries = goods and manufacturing; Purse = purchasing and reserves; Table = mutually useful foreign relationships; Ways = exploration and transport. These six labels overlap and are not six exclusive builds or extra draft categories. Ordinary cards start each activity; rares intensify it. A host never needs to own Commerce to receive an explicitly shared benefit.

**Rules for these forty-four cards:**

- **Timing and movement:** Markets, caravans and route cards begin in age 2. Tier 0 uses actual resources, exploration, purchases, faith and the age-1 Lighthouse. Workers do not gain a road-building action. Roads are laid by land traders from age 2; sea mode is distinct from a land route with coastal endpoints. Route capacity does not pay the hire price. Hiring discounts apply only to hiring a new caravan, never reusing an idle one.
- **Established posts are new per-empire facts**, separate from the existing shared city `tradingPost` range flag. A paying route that reaches its destination and completes a normal twenty-turn term establishes that operator's commercial post at both endpoints. Starting/cancelling does not qualify. The shared flag keeps its existing start-time behaviour. A qualified footprint persists, but foreign post income and card range privileges are suspended during war or while the host city is blockaded. A change of host owner suspends that empire's foreign commercial benefits until it completes a new qualifying term there; historic arrival rewards do not reset. A post never makes a foreign town your domestic city.
- **Maturity is a relationship, not one caravan's timer.** Count paying turns for an ordered origin/destination/mode pair across normal renewals. Renewal within two turns after its previous caravan returns home preserves progress; a replacement caravan may take over without counting overlapping turns twice. Cancellation, plunder, war or a missed renewal resets continuity; blockade pauses it without advancing it. Established Routes activates at thirty paying turns. The shared tracker advances without the card active, caps at the needed threshold and is displayed in the existing route view. Merchant Ledger is the only accumulated-income card.
- **Income scopes:** domestic routes pay their destination, foreign routes pay their operator's empire; explicit host grants pay the host's city or empire as printed. Only paying routes count. There are two unconditional route-flat cards, Provisioning Contracts and The Common Road; other route cards alter allocation, conditions, percentages or reach. Ordinary sea premiums apply to route yields, but not a second time to an explicit host grant or returned share. Return Leg copies one third of a domestic route's final non-conversion food/production/gold to its origin once. The returned share is a derived payout, cannot feed another route or conversion, and does not make two reciprocal routes compound. Routes' base provisioning still reads buildings, not received yields.
- **Trade and goods:** agreements mean accepted, active resource agreements, counted once per foreign partner. Open borders, proposed deals and one-off gifts do not qualify. Ordinary routes still require contact and peace, not an agreement. Warehouse counts read accessible, locally improved physical luxury deposits, including copies exported through ordinary deals, but exclude imports and manufactured goods. Exports still use normal available-copy and happiness rules; retaining a Warehouse bonus does not create extra tradable copies.
- **Commerce Charters:** each says **“Once drafted, unlock [building] for construction. No chair required.”** These three draft picks permanently unlock construction access, using the Scientific Charter activation convention. They do not grant a building or its effects for free, bypass technology/site gates, or waive its gold price. Their buildings and produced goods use the normal ongoing ownership rules. This is an extension of on-draft access to buildings, not a conversion of other decks' ordinary building-unlock Orders.
- **Purchases and reserves:** discounts use the actual quote and normal limits; no card directly purchases a world wonder or Opus. Spending rewards use gold actually paid, only for first acquisition of an ordinary building type in that city. Free grants, repair/rebuilding, deals, units and repeated offer actions do not qualify. Purchase stamps persist on that building/unit after unseating; other bonuses and penalties stop. Interest reads the treasury after that turn's commands but before income collection, pays once at turn resolution and never feeds itself in that resolution.
- **Safety and footprint:** Convoy gives escorts combat strength and traders mobility, not plunder immunity. Range exceptions never waive physical paths, sea/ocean access, war, capacity, expiry or blockade. No action rents a post, declares a tariff or asks another player to opt into a new mini-game. Route-path tolls and per-road age income are deferred from this cut; they would reward detours and add a separate path-accounting system.

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| Salt Tithes | C | Gain +3 gold per distinct accessible improved luxury you produce. Worked luxury tiles gain +1 food. | Luxuries → Purse |
| The Guild Halls | C | A city gains +1 production per distinct luxury type it works. Worked camps and plantations gain +1 food. | Luxuries; material opening |
| The Merchant Shrines | C | Your capital gains +2 faith. Cities working an improved luxury gain +2 faith, once per city. | Luxuries → faith |
| Travellers' Letters | C | Your capital gains +2 science and +2 culture, plus +1 of each per foreign empire met, at most +4 additional science and culture. | Ways → Table |
| Letters of Introduction | C | First contact with each foreign empire grants you 100 gold and that empire 15 gold. Contact recorded before activation cannot pay retrospectively. Discoveries yield 15 gold. | Table → Ways |
| The Pathfinders' Company | U | Scouts gain +1 sight and +1 movement. | Ways; exploration |
| The Lighthouse Keepers | C | Ships gain +1 sight. Lighthouses cost 25% less production; worked fishing boats gain +1 food. | Ways; coastal opening |
| The Assayer's Rule | U | +2 gold on resource tiles that supply gold | Luxuries → geography, Purse | [reworded, simplified]
| Civic Receipts | U | Purchasing an ordinary building for the first time in a city grants culture equal to 10% of the gold paid, at most 30 culture per purchase. | Purse → drafting | [move to age 2]
| Private Patronage | R | Gold purchases of ordinary buildings cost 20% less. Producing those buildings normally takes 20% more production. Empire buildings and wonders are unaffected. | Purse; trade-off |

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| Provisioning Contracts | C | Domestic routes grant their destination +3 food and +2 production. | Routes; domestic foundation |
| The Common Road | C | Your foreign routes grant you +2 gold, +2 science and +2 culture. Each also grants its host city +2 gold. | Routes ↔ Table; foreign foundation |
| The Return Leg | U | Your domestic routes also pay their origin one third of the non-conversion food, production and gold they pay the destination. The destination loses nothing. Returned yields cannot circulate again. | Routes; two useful endpoints |
| Venture Routes | U | Your routes gain two turns of range. Routes whose endpoints are more than fourteen hexes apart gain +100% gold, using the shortest wrapped map distance. | Routes ↔ Ways; reach |
| The Merchant Ledger | U | Hiring a new caravan costs 15% less. While active, gains +1 science and +1 culture per turn for each distinct destination city first reached by your routes, at most +24 of each. | Routes → expansion; sole income counter |
| The Factors' Houses | C | Your cities holding your established commercial post gain +2 gold and +4 culture. Hiring a caravan from such a city costs 15% less. | Posts ↔ Purse |
| The Planters' Charter | U | **Once drafted, unlock the Plantation House for construction. No chair required.** The building is purchased with gold; its payload is specified below. | Luxuries ↔ Purse; building access |
| Bought Swords | U | Military units cost 20% less gold to purchase, but 10% more production to train. Purchases still do not count as training. | Purse; trade-off |
| The Convoy | C | Your combat units within one hex of your trader gain +4 strength. Your traders gain +1 movement. Traders remain plunderable. | Ways → protection |
| The Treaty Ports | U | Each foreign empire with which you have an active resource agreement grants your capital +2 gold and +3 culture. That partner's capital gains +1 gold. Each partner counts once. | Table ↔ Luxuries |
| The Post Riders | C | Your civilians and traders beginning a turn on a road you own gain +1 movement for that turn. Hiring and starting a route do not trigger another grant. | Ways ↔ domestic network |
| Established Routes | U | Renewed routes pay 50% more. Does not stack repeatedly. | Routes ↔ partnerships |
uncommon: +1 authority for every 2 markets in your empire. buying tiles 30% cheaper.

#### Tier 2 — Late (Government II · age 3+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Home Market | U | Cities receiving at least two of your domestic routes gain +20% food, +20% production and +2 happiness, once per city. | Routes; concentration |
| The Caravanserai Network | U | Each different owned city receiving one of your domestic routes grants +1 empire happiness, +1 production and +1 gold on domestic trade routes. | Routes; distribution |
| The Foreign Factor | U | Each foreign city holding your established commercial post grants you +3 gold and its host city +1 gold per turn while you are at peace and the host is not blockaded. | Posts ↔ Table |
| The Consulate | U | Cities holding your established commercial post purchase ordinary buildings and civilian units for 15% less gold, benefiting that city's owner. Each qualifying foreign host also grants you +2 culture while at peace and unblocked. Multiple foreign Consulates do not stack the discount. | Posts ↔ Purse, Table |
| The Warehouses | U | Each luxury type with at least four accessible improved deposits you produce grants +6 gold, +4 culture and +3 happiness. Exported copies still count for this card; imported and manufactured copies do not. | Luxuries; specialization and exports |
| The Purple Works | R | **Once drafted, unlock the Purple Works for construction. No chair required.** This national building supplies one manufactured luxury copy; its payload is specified below. | Luxuries ↔ Table; building access |
| The Money Lenders | R | Earn interest equal to 2% of your treasury each turn, capped at 200 gpt. Gold purchases, caravan hires and gold-priced great-person offers cost 20% more while this card is active. | Purse; bounded reserve trade-off |
| The Chartered Arsenal | U | Military units purchased with gold gain +4 strength permanently on creation. | Purse → military quality |
| The Harbour Chain | U | Gain +1 route capacity per two Harbours you own, at most +4. Sea routes with your established post at both endpoints gain two turns of range. | Ways ↔ Posts |
| The League of Cities | R | Cities with one of your paying outgoing routes cost one less authority, minimum one, and gain +15% production. Cities without one lose 10% gold. | Routes; provincial trade-off |
| The Charter Fleet | U | Naval combat units cost 20% less gold to purchase. Naval combat units you purchase with gold gain +1 sight permanently. Normal coastal, technology and purchase requirements remain. | Ways ↔ Purse |
| Export Guilds | C | A city working a luxury type you currently export through an active agreement gains +20% production toward ordinary buildings and +2 happiness, once per city. | Luxuries ↔ Table; develop an export province |
| The Exchange | U | Each different foreign empire your routes currently serve grants you +5% science and culture empire wide. Each served empire's capital gains +2 science and +2 culture. | Table ↔ Routes; knowledge shared |
Rare: you can reroll with gold instead of faith. All other purchasing is 10% more expensive.
Rare: lose 4 route capacity, your routes gain +2 science and +2 culture and gain +50% science and culture.
Uncommon: customs house +3 gold and +1 renown, cities with a customs house +15% gold towards purchasing.

#### Tier 3 — Final (Government III · age 4+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Dye Vats | U | **Once drafted, unlock the Dye Vats for construction. No chair required.** This purchased building turns its city's worked luxuries toward culture and faith; its payload is specified below. | Luxuries; building access |
| The Endowment | U | Ordinary buildings you purchase gain a permanent bonus to each positive native yield equal to 25% of that yield, with a minimum bonus of +2 per positive yield type. Replacing a building cannot stack the stamp. | Purse; lasting purchased infrastructure |
| The Paid Army | U | Military-unit upkeep falls by 1 gold, minimum zero. Military units cost 25% less gold to purchase. | Purse; sustain purchased forces |
| Merchant Princes | R | Gold may purchase great-person drafts at the existing escalating offer price, with normal availability and purchase limits. | Purse → Scientific, Magisterial |
| The World's Exchange | R | Each different foreign empire currently served by your routes grants +10% production toward the Opus, at most +40%. Existing construction and victory requirements remain. | Table ↔ Routes; foreign finish |
| The Chartered Metropolis | R | Cities with at least three of your paying outgoing routes gain +25% food, production and culture, but each costs +4 authority while qualified. | Routes; concentrated trade-off |
| The Admiralty of Trade | R | Your sea routes may connect two cities holding your established commercial posts regardless of range. A legal sea path, access, peace and route capacity are still required. | Ways ↔ Posts; network reach |
| The Merchant Commonwealth | U | Each owned city with your established commercial post receiving a domestic route gains +2 happiness and costs one less authority, minimum one. | Posts ↔ Routes; distributed administration |
| The Merchant Works | R | Cities building an empire building, world wonder or the Opus gain production equal to 25% of their base city gold, but lose 20% of their gold income while doing so. Foreign-route empire gold and conversion outputs are excluded from the production basis. | Purse ↔ Luxuries; domestic/material finish |
rare: you may purchase world wonders, -15% production in all cities

#### Three building payloads — not extra cards

The named Charter grants access on drafting; the building must then be purchased. These are new proposed building rows, not implemented content. Price each using the ordinary production-size/column standard and gold quote, with the explicit purchase-only restriction. Apply normal discounts unless a row explicitly excludes them. Constructing one does not require the Charter to occupy a chair.

| Building | Availability and site | Proposed ongoing effect |
|---|---|---|
| Plantation House | Age 2; Currency; city works a plantation. One per city, gold purchase only; proposed size: medium. | Worked plantations in that city gain +2 gold and +1 food. |
| Purple Works | Age 3; Guildhalls; once per empire, gold purchase only; proposed size: large. | Supplies one copy of **Imperial Brocade**, a proposed manufactured luxury excluded from map generation. In addition to normal unique-luxury happiness, its holder gains +5% empire culture and +3 authority capacity, once per kind. Retain or export it through normal deals. Manufacturing does not place a resource on a tile or add a deal item. The copy exists only while the building is held and functioning. |
| Dye Vats | Age 4; Paper Money; city works a luxury tile. One per city, gold purchase only; proposed size: medium. | Each worked luxury tile gains +4 culture and +2 faith, but loses the gold provided by the resource's native yield. Terrain, improvement and unrelated card gold remain. Resource access and exportable copies remain. The choice of which tiles to work uses ordinary citizen assignment. |

**Goods and permissions:** Imperial Brocade needs a new resource row and building-backed availability accounting; the existing map-generated Tyrian Murex is unchanged. Its proposed signature and the building sizes above are balance placeholders. No additional copy stacking is implied by producing the same good in several empires. Losing/capturing the building updates resource availability through the existing deal-shortfall rules. A building's ordinary effect follows its owner even if the owner did not draft its Charter; access to construct another does not transfer. The Purple Works cannot be duplicated through Scientific's Second Seat, so trade cannot manufacture an unlimited unique good. Dye Vats' conversion is a building effect once purchased, not an optional slotted switch.

**Offer and lifecycle implications:** the three building Charters use the same on-draft access mechanism as Scientific's five research Charters. They are collection entries but not seats in a four- or nine-chair build; a rare-only doctrine offer can include Purple Works. A Charter competes with an immediately useful Order for the draft pick and then requires gold investment. Endowment is the opposite case: an ordinary slotted Order applies a purchase-time stamp to a building, while the Order's future purchase benefit stops when unseated.

#### Four-chair combinations and alternatives

| Direction | Four active Orders | Changed decision and fallback |
|---|---|---|
| Domestic heartland | Provisioning Contracts; The Return Leg; Established Routes; The Home Market | Develop strong origins and keep two routes feeding one centre. Caravanserai Network rewards spreading destinations instead; no foreign partner or Charter is required. |
| Overseas network | The Convoy; Venture Routes; The Foreign Factor; The Exchange | Secure distant routes and establish footprints that keep relationships valuable. Established Routes rewards remaining with a useful partner; domestic provisioning is a fallback during war. |
| Export provinces | Salt Tithes; The Guild Halls; The Warehouses; Export Guilds | Develop several copies and export to fund productive home cities. Without a cooperative partner, Assayer's Rule and Private Patronage turn local goods into infrastructure. Planters/Purple Works access, if drafted, occupies no chair. |
| Purchased development | The Assayer's Rule; Private Patronage; Civic Receipts; The Endowment | Work profitable land and buy lasting infrastructure, freeing queues for other jobs. Money Lenders offers a reserve-building alternative; its surcharge makes carrying it through a buying spree costly. |
| Purchased army | Salt Tithes; Bought Swords; The Chartered Arsenal; The Paid Army | Turn resource income into immediate military quality. Ordinary production remains available; The Convoy or Charter Fleet can replace a missing purchase card for a maritime empire. |

**Systems this draft assumes:** empire-specific completed-term commercial footprints; relationship continuity across renewals; bilateral route/deal/post payouts; on-draft building access; one building-backed luxury; persistent building purchase stamps; capped treasury interest. Existing route, purchase, citizen and diplomacy screens can present these choices. No toll-path sweep, manual worker roads, tariff action, manufacturing input inventory, trader invulnerability or new naval unit is assumed. All mechanics remain proposals and require ordinary explanations, AI evaluation and save/replay support before implementation.

### Devotion

#### Playstyle goals — independent of the card draft

**Power fantasy:** “Shared belief gives my civilization purpose and the means to accomplish extraordinary things.” Sacred communities, religious practice and faith in action should produce material as well as spiritual strength. An empire can be devout through its own institutions, through spreading belief, or through a sacred cause.

**Leader needs.** Akhenaten wants sacred agriculture and Holy Sites to support monumental construction. Al-Ma'mun wants faith and religious institutions to nourish an educated, growing empire. Hildegard wants rites and faith buildings to sustain productive cultural communities. Joan wants religious territory and military victories to reinforce each other. Modu needs pastoral faith to support mobile warfare without forcing a Temple in every town before he can function. Mansa Musa wants sacred destinations and trade to sustain a wealthy religious civilization. These leaders require several sources and uses of faith, not one compulsory conversion package.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Sacred communities and rites | Local religious institutions, active practice and a well-supported population. | A devout homeland becomes productive, educated and cohesive even without converting a foreign empire. | Quiet, but not silent: the tide of pressure leaks from your towns into a neighbour's without a unit moving, and the Temple's door tax blunts theirs. A devout homeland is the table's hardest target for a missionary. |
| Missions and pilgrimage | Religious reach, religious units and the places connecting communities. | Extending and sustaining belief creates useful relationships and economic or cultural reach beyond the core. | The friction approach without a war: converting a neighbour's town pays you from their citizens and provokes them, and the inquisitor is their answer. Pilgrim routes make the partner richer too, so a converted neighbour has reasons to stay converted. |
| Militant faith | A religious base supporting an army, with campaigns advancing or defending its cause. | Faith becomes military capability, and purposeful military action strengthens the civilization behind it. | Holy war: the Crusade's kill presses your faith into their towns, so every battle is also a conversion. The most provocative approach after conquest itself, and the one the peaceful-development clause exists to keep optional. |

**Flexible route:** useful local faith generation, religious buildings, rites and modest faith expenditure support a mixed empire. The player can draw value from religion without dominating conversions, fighting constantly or winning a contested religious race. Strong faith generation needs useful spending choices; hoarding alone is not the whole plan.

| Age | Sacred communities and rites | Missions and pilgrimage | Militant faith |
|---|---|---|---|
| 1 · Omens | Generate accessible faith and practical local benefits while preparing religious institutions. *(Claude) Anchors: the Shrine, the Rite of the Harvest and Omen Reading (Divination), the Consecration of the Bounds (Stonecraft), the Oracle; rites are a town's verbs and cost faith, which is the age's spend.* | Establish a faith source and a viable homeland before outward spread is available. *(Claude) Anchors: there is no prophet until The High Temple — the age banks faith toward founding; Stonehenge; Shrines generate faith, but a Shrine alone does not emit religious pressure before a religion exists.* | Pastoral or martial practices generate faith and support an ordinary early force; foreign religious territory is not a prerequisite. *(Claude) Anchors: the Blessing of Arms (Bronze Working), the Funeral Games; the Horde Camp for Modu.* |
| 2 · Heroes | Rites and institutions help fund food, production, research and culture. *(Claude) Anchors: the Temple (The High Temple), the existing city rites and the Rite of Plenty (Currency); Epic Poetry opens great-person calls, not a sixth city rite; the empire rite pays every Chapel.* | Religious units and initial spread create tangible rewards, with recovery from unsuccessful missions. *(Claude) Anchors: the prophet founds the religion and its beliefs (The High Temple) — the whole approach turns on here; the Long Count's reroll for the belief draft.* | Faith helps field or sustain troops; actions can defend religious communities or extend their reach. *(Claude) Anchors: the founder and follower beliefs chosen at founding are the militant approach's cards as much as the deck's; the War Hall's stamp for Temple towns.* |
| 3 · Empire | Choose a few major sacred centres or many local institutions; happiness and administration support both. *(Claude) Anchors: the Cathedral (Theology), the card-unlocked Chapel, Hagia Sophia and Angkor Wat; the Monastery row is retired; a Cathedral is the age's tall choice, many Chapels the wide one.* | A distributed religious network sustains economic and cultural output; owned towns and foreign followers have distinct uses. *(Claude) Anchors: the apostle (Theology) — charged proclamations, healing and relic placement; caravanserai roads as pilgrim ways; foreign followers are read by `religionFounder`'s stones.* | A religious army supports defence, raiding or incorporation; secular administration still keeps the empire viable. *(Claude) Anchors: the Courthouse for a holy conquest, the legionary; the Great Mosque of Djenné; the Crusade's kill-press.* |
| 4 · Cathedrals | Mature institutions sustain scholarship, major works and victory production. *(Claude) Anchors: Notre Dame and Inquisitors (The Holy Office), the University for the learned church; the Reliquary row is retired; Alchemy's door.* | Established reach supports a competitive finish without requiring endless fresh conversions. *(Claude) Anchors: the inquisitor (The Holy Office) — purging and defence, the reach *held* rather than extended; ocean-going missions (The Astrolabe).* | An established religious homeland and army can secure and build a victory; continued kills cannot be the only source of solvency. *(Claude) Anchors: knights and the Alhambra (Militant Orders); the deck has no wager family of its own — a religious bead does not exist and the endgame column must borrow culture or domination, which is a gap to rule on.* |

**Complete-empire requirements:** faith through multiple early practices; food/production through communities and religious institutions; gold through local support, pilgrimage and faith-enabled expenditure where appropriate; science/culture through religious learning and rites; authority/happiness through cohesive institutions in both tall and wide realms; military capacity through provisioning, defence and an optional militant branch. Economic coverage must exist in this deck even though its leaders have strong second-type pairings.

**Mixing and boundaries:** productive communities fund missions; missions support religious territory for campaigns; campaigns help establish new communities. Peaceful religious development must be a real alternative to holy war. Rewards for religious activity must not require repeatedly converting the same town back and forth, and the army must still cost resources even when faith is its funding source. Religious flavour alone is not a reason to attach a faith bonus to every building.

#### Rebuilt card pool — observance, miracles, missions and sacred destinations

**Rewritten from the Devotion brief and accepted critique, 2026-09-16 · proposal only.** This replaces the preceding card draft and its inline review comments. The broad leader goals above remain context. Forty-four cards, including two on-draft access Charters, support four overlapping approaches: sustained local rites, immediate faith spending, missionary reach, and sacred destinations. A local or receptive empire must function without founding a religion. All numbers below are proposed tuning values, not measured balance.

**Lines:** **Observance** funds and maintains productive rites; **Miracles** trades faith for immediate population, healing, land or units; **Missions** invests in clergy and holds religious reach; **Places** develops Holy Sites, stationary relics and Cathedrals; **Communion** supports cohesive tall or wide towns, including followers of another faith; **Sacred arms** funds and protects an army. These are authoring labels, not branches the player selects. A card can serve several lines.

**Rules for this pool:**

- Availability requires both government tier and research age. Shrines and basic rites are age 1; Temples, Prophets, routes and great-person calls age 2; Cathedrals/Apostles age 3; Inquisitors age 4. Monasteries, Reliquaries and Augurs remain retired. Religious building category does not include a great-person work. Holy Sites below are actual prophet-planted improvements, not a relic or Cathedral pretending to be one.
- **Your religion** means a faith whose founder-side benefits you currently hold through its original holy site's ownership, with the existing fallback when applicable. Additional sites do not transfer founding rights. **Any religion** explicitly includes a rival's. Unqualified city effects apply to your owned cities. Local rites, miracles and religious construction never require founding unless stated. Religious units retain their existing allegiance and founding rules; holding a captured holy site does not retune their faith.
- An ordinary rite lasts ten turns and costs 40/56/72/90 faith by research age; one rite per city. New rite access comes from the two Charters below, not universal technology additions. Charters need no seat and keep access after drafting; normal technology gates and rite costs still apply. Their effects exist only during a purchased or prophet-granted rite. Empire rites may use an unlocked, researched rite and supply the same city condition, with no extra cast reward.
- **Quiet Hours** adds five turns when a rite is granted while seated; it does not extend an already-running rite on activation. The earned end turn persists after removal. **Feast Days** records qualifying city-turns while seated, not global calendar dates. Each city pays after twelve qualifying turns, then subtracts twelve; inactive turns add nothing. Saved remainder survives a lapse or reseating. The happiness lasts five turns, expires normally while unseated and never stacks with itself. This is periodic income, not permanently increasing income. No free empire-wide renewal or half-price renewal card is included in this pass.
- **Miracle prices are explicit proposals.** Healing costs 12 faith plus half the total health it would actually restore, rounded up; minimum one injured eligible unit. Only your units qualify, at most 30 health each up to their normal maximum. A city may cast once per turn and a unit may receive this miracle once per turn even in overlapping city areas. Loaves costs the greater of 80 faith or twice the city's remaining food requirement for its next citizen, rounded up; once per city per turn. It consumes existing stored food toward that citizen, leaves the next growth basket empty, and triggers neither food retention nor natural-growth rewards. Neither miracle requires a religion. Faith discounts on clergy or ordinary purchases do not discount miracles.
- Existing purchase quotes, escalation, strategic resources, technology, location and per-turn limits apply to workers/soldiers. Faith purchases are not production completion. Land purchases use the current legal tile purchase and gold quote paid in faith, consuming the same purchase escalation/limits. No remote claims or purchase-refund loops. Creation bonuses persist on the unit; access ends when the ordinary enabling Order is unseated.
- **Living Hymnal is the sole accumulated-income card**, beginning with Prophets in age 2 and capped. Each city can qualify once per player across all controlled religions. Record first following even while inactive or domestically owned; conversion, gifting, capture and reconversion cannot manufacture another first. Its history persists when unseated but grows and pays only while active. Maintained-following rewards instead stop when the following is lost. Hearth Blessings requires natural growth beyond that city's historical maximum; no bought citizens, free population or regrowth payouts.
- **Relics stay stationary and limited to one per city.** Existing apostle placement still requires a Cathedral and one charge. Sainthood is an alternative source: a great person's valid act or work on the centre hex or a tile assigned to an owned Temple city leaves its relic if absent. It never redirects an extra relic elsewhere. Either expenditure already grants the person's normal legacy; that legacy is not a second event. A relic retains its existing +3 faith, survives card removal and follows city ownership; no transport, stacking or founder/pressure powers. A Citadel can only be placed on its normal legal tile, never inside a city centre.
- **Council** requires a Prophet of the religion you historically founded and still control at its original seat. Spend two charges in your original holy city to replace one follower belief once per research age per player (ages 3–4 here). Choose from three eligible alternatives; the old belief remains until selection. No pantheon/enhancer change, extra belief slot or reset of followers. The old ongoing effect stops in every following city, including foreign cities. Already completed religious houses remain with their native yields; existing queues may finish, but no new construction/purchase through the removed belief's unlock. No alternative available means no valid action or charge expenditure. Reseating, recapture and reacquisition do not reset the age allowance.
- Bishop's Choice affects future Cathedral production completions while seated, using only legal consecrations; no reselecting existing Cathedrals or rerolling through rebuilding. No beliefs or consecrations are doubled wholesale. Foreign following is an opportunity and a source of conflict, not assumed cooperation. Bonuses on a route that name both parties pay once to each distinct empire; domestic routes pay once, not twice.
- Local authority reductions floor at one authority per city and combine under normal authority rules. No half-price empire size, immunity to razing or additional town-cap system. The new rite's defensive reveal exposes camps only, not enemy units or unrestricted fog. Movement, combat and visibility elsewhere stay unchanged. Conversions exclude other conversion outputs and windfalls; Opus bonuses do not bypass technology or bead requirements.

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text | Line |
|---|---|---|---|
| First Rites | C | Shrines cost 25% less production and give +2 faith. | Observance; opening |
| Pastoral Shrines | C | Worked pastures gain +1 faith and +1 food. Your capital gains +2 production while you control an improved pasture. | Observance; Sacred arms |
| Lay Offerings | C | Worked mines and camps gain +1 faith. A city working at least two gains +3 gold, once per city. | Observance; opening |
| The Monastic Table | C | Cities keeping a rite gain +2 food and +2 production. | Observance |
| The Votive Fields | C | Worked farms and plantations in cities keeping a rite gain +1 food and +1 faith. | Observance; land |
| The Omen Schools | C | Cities keeping a rite gain +2 science and +1 culture. | Observance; learning |
| Hearth Blessings | U | Natural growth to a city's new population high grants 8 faith. A Shrine there also grants 8 food. | Observance; growth |
| Rites of Labor | U | Cities keeping a rite gain +20% production toward buildings and +2 gold. | Observance; development |
| The Book of Mercy | U | Once drafted, unlock the Rites of Mourning and the Watch after Divination. No chair required. | Observance; Charter [new rites below] |
| The Rites Commonwealth | R | Cities keeping a rite gain +3 production and demand 15% less population happiness. Your cities without a rite gain −1 happiness. | Observance; Communion; trade-off |

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text | Line |
|---|---|---|---|
| Pilgrims' Welcome | C | Cities with a Shrine following any religion gain +2 food and +2 gold. You need not have founded it. | Communion; receptive |
| Monastic Copyists | C | Cities with a Temple and Library gain +3 science and +3 culture. | Communion; learning |
| The Healing | C | Spend faith in an owned city to heal your units in and beside it by up to 30 health each. Once per city and affected unit per turn; price depends on actual healing. | Miracles; Sacred arms [priced city action] |
| The Loaves | U | Spend faith to add one citizen to an owned city, once per turn. Price follows remaining growth cost, minimum 80 faith; no natural-growth rewards or retained food. | Miracles [priced city action] |
| The Feast Days | U | Every twelve turns a city keeps a rite while this is seated, gain faith equal to its population and +2 happiness there for five turns. | Observance [local periodic reward] |
| The Quiet Hours | U | Rites granted while this is seated last five turns longer. | Observance; duration |
| The Rites Charter | U | Once drafted, unlock the Chapel for construction under its normal site rules, and the Rite of Passage after Bronze Working. No chair required. | Observance; Charter [new rite below] |
| The Living Hymnal | U | While active, gains +2 science and +2 culture per turn in your capital for each foreign city first converted to your religion, at most +24 of each. | Missions; sole income counter |
| Missionary Hospitality | U | Religious units cost 15% less faith. Your first conversion of each foreign city grants 20 food in your capital and 20 culture. | Missions; homeland support |
| The Alms Roads | U | Domestic routes from Temple cities give their destination +3 food and +2 gold. Your foreign routes from Temple cities give you +3 faith and +2 gold, and the host +1 gold. | Communion; commerce |
| Consecrated Labor | R | Workers may be purchased with faith in Temple cities at their normal equivalent purchase price. Those purchased workers gain +1 charge on creation. | Miracles; land |
| The Votive Companies | R | Temple cities keeping a rite may purchase military units with faith at their normal equivalent purchase price. All your military units cost +1 gold upkeep while this is seated. | Miracles; Sacred arms; trade-off |

#### Tier 2 — Late (Government II · age 3+)

| Card | Rarity | Proposed text | Line |
|---|---|---|---|
| The Concord | C | In each city following any religion, the first three citizens demand no population happiness. | Communion; wide |
| The Parish Rolls | C | Cities with a Temple following any religion cost one less authority, minimum one. | Communion; wide |
| The Saints' Fields | C | Worked Holy Sites give +3 food and +3 production. A city working one gains +2 happiness, once per city. | Places; tall |
| The Cathedral Works | C | Gain +30% production toward Cathedrals. Cities with one gain +5 production and +5 science. | Places; development |
| Sainthood | U | Spending a great person by act or work in an owned Temple city's territory leaves a relic in that city if it has none. | Places [alternative relic placement] |
| The Pilgrim Road | U | Your routes ending at a city holding a relic or working a Holy Site grant +2 faith to both operator and host, once each. Domestic routes grant +2 total. | Places; Communion |
| The Spiritual Host | U | Your military units gain +4 strength in territory following your religion. Temple cities gain +2 happiness while you are at war. | Sacred arms; Missions |
| The Congregation Rolls | U | Each foreign city following your religion gives your capital +2 gold and +2 science, at most +24 of each. | Missions; maintained reach |
| The Second Prophet | U | Prophets purchased while this is seated begin with one additional charge. Existing faith prices and charge costs remain. | Missions; Observance [creation stamp] |
| Mission Houses | U | Your proclamations apply 30% more pressure. Religious units gain +1 movement. | Missions |
| The Festival Calendar | U | Cities keeping a rite gain +20% food and +20% culture. | Observance; Communion |
| Consecrated Ground | U | Purchase legal city tiles with faith instead of gold at the same quoted price. Normal range and purchase limits apply. | Miracles; land [second purchase currency] |
| The Council | R | Once per research age, spend a Prophet's two charges in your original holy city to replace one follower belief, choosing from three eligible alternatives. You must still control the faith's original seat. | Missions [belief replacement] |
| The Settled Faith | R | Temple cities keeping a rite gain +20% science and +2 happiness. Your proclamations apply 25% less pressure. | Communion; Observance; trade-off |

#### Tier 3 — Final (Government III · age 4+)

| Card | Rarity | Proposed text | Line |
|---|---|---|---|
| The Consecrated Workshops | C | Cities keeping a rite gain +20% production. Their Cathedrals give an additional +4 production. | Observance; construction |
| Pilgrim Hospices | C | Cities of at least ten population with a Cathedral following any religion gain +20% food and +3 happiness. | Communion; Places; tall |
| The Holy Inquisition | U | Rival pressure entering your cities is reduced by 40%, multiplying existing defences. Inquisitors cost 25% less faith. | Missions; defence |
| The Holy Army | U | Your military units gain +5 strength in territory following your religion. Cities holding a relic train military units 30% faster. | Sacred arms; Places |
| The Sacred Treasury | U | A city with a Cathedral, a relic and a worked Holy Site gains +20% gold and culture, and +25% production toward wonders and the Magnum Opus. Pays once per city. | Places; concentrated finish |
| The Bishop's Choice | R | When you complete a Cathedral, choose its consecration from the legal set instead of receiving a random one. | Places [completion choice] |
| The Great Consecration | R | Each foreign city following your religion grants +5% production toward the Magnum Opus, at most +40%. | Missions; finish |
| The Cloistered Realm | R | Cities with a Cathedral keeping a rite gain +25% science and +25% production. Your proclamations apply 30% less pressure. | Observance; Communion; trade-off |

#### Three unlocked rites — payloads, not extra cards

| Rite | Required Charter and technology | Effect while the rite lasts |
|---|---|---|
| Mourning | Book of Mercy; Divination (age 1) | Population happiness demand is reduced by 50%; the city cannot train or purchase military units. Civilian units remain available. No effect on units already present. |
| The Watch | Book of Mercy; Divination (age 1) | Reveal barbarian camps within six hexes while active. Your combat kills within two hexes grant 8 faith, once per defeated unit across all your Watch cities. No reward for deleting your own pieces. |
| Passage | Rites Charter; Bronze Working (age 1 technology; Charter itself age 2+) | Military units trained in this city gain +10 maximum and current health on creation. Purchases and grants do not qualify. The bonus persists when the rite ends. |

These join the existing one-rite-per-city choice and use its ordinary age price and duration. They do not replace the existing military rite or add a second rite slot. Chapel retains its existing building costs, requirements and native effects; the Charter grants access, not a free building or a recurring no-chair bonus. No Founding rite or Founding Miracle is included: the new options already cover growth, settling support through land and development, and military preparation without duplicate Shrine grants.

#### Four-chair combinations and alternatives

| Approach | Example four seated Orders | What the player does differently |
|---|---|---|
| Productive observance | The Monastic Table; The Omen Schools; Rites of Labor; The Quiet Hours | Fund a few productive towns' rites instead of buying more clergy. Later spread practice with Festival Calendar or concentrate construction with Consecrated Workshops. Charter rites, if drafted, use no chair. |
| Immediate intervention | Pastoral Shrines; Lay Offerings; The Loaves; The Healing | Develop faith-producing land, then choose whether the bank buys a citizen or saves an army. Commons/uncommons establish the plan; Consecrated Labor or Votive Companies offers an optional rare expansion. |
| Missionary network | First Rites; Missionary Hospitality; Mission Houses; The Congregation Rolls | Buy and move clergy, then defend existing religious reach so it continues financing home cities. Living Hymnal can replace a seat for expansion; Second Prophet competes with discounts and domestic rites. |
| Receptive provinces | Pilgrims' Welcome; Monastic Copyists; The Alms Roads; The Parish Rolls | Develop connected Temple/Library towns and accept useful foreign belief. No founding or conversion is required. Concord supports further width; Pilgrim Hospices supports larger towns. |
| Sacred destinations | The Saints' Fields; The Cathedral Works; Sainthood; The Pilgrim Road | Spend a person in a suitable town, work a real Holy Site and direct routes to sacred destinations. An apostle can supply a Cathedral relic if Sainthood never appears. Sacred Treasury rewards concentration, not relic transport. |

These are alternatives, not a requirement to assemble every named card. Productive local rites begin in age 1, miracles and missions in age 2, major tall/wide distinctions and relic patronage in age 3, and defensive/final payoffs in age 4. Living Hymnal alone accumulates permanent income; local rites scale through the number and quality of participating cities. Early research/culture has common support through Omen Schools, followed by Copyists; early faith has several independent sources. Authority relies on the base game until Parish Rolls in age 3, a limitation to test rather than conceal.

**Systems this draft assumes:** two permanent access Charters; three rite rows; quoted healing/growth actions; faith tile purchasing; local feast progress; first-conversion history; Prophet charge stamps; alternative placement of the existing stationary relic; replacement belief offers; and a Cathedral completion choice. Every new action/offer needs normal deterministic commands, previews, save replay and AI handling. These are design proposals, not claims that a new bank line implements the whole feature. Existing modifiers, route payments, worked-site conditions and building predicates can extend current rules.

**Deferred/cut:** portable or stacked relics; cities counted as holy sites; Reformation; universal new rite unlocks; free global-calendar renewals; half-price renewal stacking; full area healing; unpriced miracles; half-cost empire size; raze immunity; blanket pantheon doubling; retired buildings; extra growing counters and repetitive faith-building yield rows. The old Devotion comments are superseded rather than merged into these decisions.

**Balance and multiplayer checks:** compare rite maintenance with miracles, clergy and faith purchases at actual prices; test five-turn extensions and Feast Days without perpetual self-financing rites; combine Prophet charge and purchase discounts against baseline acts; verify miracle overlap limits and that purchased growth cannot fund repeated expansionist levies profitably; test receptive cities after the religion cap is reached. Council changes effects in foreign follower cities too, and must retain the building-unlock safeguards above. Check foreign-first-conversion rewards against gifting and cooperative opponents; strong existing bridge cards still need their own review. Rites and milestones can support existing wager conditions, military aims and Opus construction; there is no new religious victory or guaranteed religious wager.

### Scientific

#### Playstyle goals — independent of the card draft

**Power fantasy:** “My civilization learns how to do things others cannot, and turns that knowledge into practical superiority.” Scholarship, invention and great minds should build a more capable empire. Research is valuable because the player can use its discoveries, not simply reach the end of the tree with no means to construct anything.

**User balance direction (2026-09-16):** science is probably the strongest yield because technology already carries military power and earlier economic bonuses. This deck should emphasize using those unlocks and science-adjacent population, renown, great works and once-per-empire buildings. Direct research boosts are a limited part of the kit; the analysis below does not authorize a self-amplifying science engine.

**Leader needs.** Al-Ma'mun wants religious and scientific institutions to feed population and support scholarship; he needs uses for growing faith-derived knowledge. Nezahualcoyotl wants populous, irrigated cities whose public works support an intellectual civilization. Hypatia wants renown and great-person works to create enduring centres of knowledge and useful output. Institutions, applied engineering and great minds therefore need distinct but compatible paths. Field exploration is useful preparation and flexible support, not the only early source of research.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Scholarly institutions | Population, research buildings and sustained local investment. | A few exceptional centres or a network of learned towns sustain a productive research economy. | A tech lead is read by rivals as a military gap (the bot's edge reading prices a unit unlock against a neighbour's roster), so a scholarly empire draws either alliances or pre-emptive war. Routes between Library towns pay both sides and are its diplomacy. |
| Applied engineering | Workshops, resources, infrastructure and deploying discoveries. | Research and production reinforce one another: the empire can actually build and use what it unlocks. | Unit quality over quantity: earlier access to the age's newest piece if research is ahead, with the normal technology and resource requirements. The quietest approach to be beside, and the hardest to invade. |
| Great minds and works | Renown, great people and productive scholarly or engineered works. | A succession of useful people leaves an increasingly capable landscape and set of institutions. | The great-person roster is shared, so every call is a race and a denial: the scholar you take is one a rival cannot. Works stand on the map and are pillage targets. |

**Flexible route:** practical research, exploration, infrastructure and selective institution building produce steady progress without one specialist engine. Ordinary science and production must work before the first great person. Researching a technology, calling a great person or building a work should offer different investment rhythms rather than three names for the same science percentage.

| Age | Scholarly institutions | Applied engineering | Great minds and works |
|---|---|---|---|
| 1 · Omens | Early institutions and population generate useful knowledge without starving construction or growth. *(Claude) Anchors: the Library and the Scholarship project (Writing), the Great Ziggurat; ruins provide early discoveries; vein prospecting waits for Geomancy in age 4.* | Resource development and practical discoveries support both production and research. *(Claude) Anchors: Mining and The Wheel; early mines and quarries support construction; prospecting is not available until age 4.* | Establish useful institutions and early renown foundations; the opening works before anyone is called. *(Claude) Anchors: renown accrues from buildings by family (the Library's scholar line); Epic Poetry in age 2 opens great-person calls; early renown prepares for that gate.* |
| 2 · Heroes | Learned cities support culture, income and continued development as well as science. *(Claude) Anchors: Chart the Stars (Chronology), the Garden (Irrigation) for the growing Library town, the Amphitheater for its calm.* | Research completions open productive investments; Smithies and other available infrastructure help realize them. *(Claude) Anchors: the Smithy's resourced mines (Bronze Panoply), stone walls (Siegecraft); the tech-completion occasion feeds the growing card.* | First great people provide immediate value through an action, work or legacy; support exists for the next investment. *(Claude) Anchors: Epic Poetry opens great-person calls; the first scholar's academy stands on a hex and opens its seam; the Academy's scholar draft buys the next for faith.* |
| 3 · Empire | Choose large scholarly centres or distributed institutions, with happiness and authority sufficient for either. *(Claude) Anchors: the Forum and Great Library (Rhetoric), the Examination Hall — Taizong's — the Aqueduct for the twelve-population Library town.* | Specialized industrial centres or provincial workshops keep research, construction and military modernization aligned. *(Claude) Anchors: the Workshop (Guildhalls), the Watermill (Engineering), the catapult and composite bowman (Mathematics) — the applied deck can afford to field them when researched; ordinary unlock timing applies except where a researched Charter technology explicitly advances access.* | Developed works and supporting institutions sustain multiple useful families, with a scholarly emphasis rather than dependence on one named person. *(Claude) Anchors: academies worked as tiles, Petra, the Water Clock (Horology); the draw is weighted by the feed share, so a scholarly empire calls scholars without being restricted to them.* |
| 4 · Cathedrals | Mature research centres can finance and construct a finish, with enough production and security to benefit from their knowledge. *(Claude) Anchors: the University and House of Wisdom (Scholarship), the Observatory (The Astrolabe), the Printing House (Movable Type).* | Advanced engineering delivers major construction and military capability, including the means to complete the Opus once eligible. *(Claude) Anchors: the Forge (Steel), the trebuchet (Natural Philosophy), the crossbowman (Machinery), the Alchemical Society — and Alchemy itself is the door, which the applied deck reaches first.* | Established works and accumulated intellectual investment pay off now; avoid starting a fresh long-term counter in the final age. *(Claude) Anchors: The Turning Heavens; the science wager is the deck's bead and the tech count is its arithmetic.* |

**Complete-empire requirements:** science through institutions, practical development and great minds; food/production through productive infrastructure and usable inventions; gold through an efficient developed economy; culture through education and discovery so drafting keeps pace; early faith through cosmology, observances or learned traditions without requiring Devotion; authority/happiness through civic knowledge and public institutions; military capacity through practical equipment, recruitment and defence. A technology lead alone is insufficient if units remain unaffordable.

**Mixing and boundaries:** populous institutions support great minds; engineered works support production; industrial capacity builds the next institutions and newly unlocked equipment. Scientific should make knowledge usable across several empire shapes, rather than force a single huge capital or dependence on rare scholars. Great-person access should remain useful when the preferred person is unavailable. The costs of research, construction and great-person investment must remain meaningful rather than refunding one another without limit.

#### Rebuilt card pool — private research, great people and institutional geography

**Rewritten from the [line brief](astra-brief-expansionist-scientific.md), 2026-09-16.** Forty cards replace the former seventy-seven: **thirty-five slotted Orders and five on-draft Charters**. **Charters** open optional research detours; **Strategics** turns deposits into useful capability; **Institutions** develops centres and provinces; **Great People** chooses between acts, works and retained legacies; **Continuity** lets established assets mature. Shared cards connect the lines. Masteries are removed entirely.

Science already supplies better unlocks and military units. Most payoffs below therefore provide practical capability, food, production, culture, gold, renown or administration. Research through Construction is one optional card. No line depends on winning a research race, drawing a particular Charter or obtaining a named great person.

**Rules for these forty cards:**

- **Charter ruling:** “Once drafted, unlock X for research.” Selecting the card permanently grants that empire access to the named technology. Seeing an offer does not. No chair, entry seal or activation is required or possible. Research still costs its normal price and requires its prerequisites; the technology's effects begin on research completion. Other empires may draft the same Charter and gain their own access. Government changes, card display and saves do not remove or retrigger access. Charter rarity still governs its draft eligibility.
- Empire buildings are existing non-wonder `oncePerEmpire` buildings, excluding the Opus. Different institutions need not share a city. Great-person works mean Academies, Manufactories, Landmarks, Customs Houses and Citadels, not Holy Sites. They still require citizens to work them for worked bonuses; they may open a revealed underlying resource through existing access rules.
- Additional renown uses the existing pool, family weights, escalating prices and shared roster. First calls remain behind Epic Poetry. No reward refunds the cost of recruiting a person. Valid expenditure means an existing act, work or legacy, once per person; death, dismissal or capture does not qualify. Legacy bonuses read currently retained families, not a permanent spent-person counter.
- Maturity reads an asset's elapsed lifetime, capped at its printed stages, even if its card was drafted later. Unseating stops bonuses without resetting age. Starting assets have a recorded initial age; capture preserves age, while replacement resets it. A Library reaching twenty turns gains the listed twenty-turn benefit, not repeated payouts every turn. Research Annals is this deck's only accumulated-income card.
- Founding, purchases, gifts, repair and replacement do not repeat first-improvement/building rewards. Native yields exclude card additions and conversions. Construction and great-person research windfalls apply to the selected research through ordinary research settlement, never a science bank. A research windfall cannot itself count as construction or another person spent.
- Unit creation bonuses apply on production completion while the card is active and persist; automatic upgrades are not new training. Existing unit, resource and location requirements apply unless a researched Charter technology explicitly changes an unlock.

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Almanac | C | Libraries cost 25% less production and give +1 production. | Continuity → Institutions |
| The Scribes' Hall | C | Cities with a Library gain +1 science per four citizens and +1 culture per three citizens. | Institutions; opening support |
| The Celestial Rites | C | Your capital gains +2 faith. First discovering each different terrain or feature type grants 5 faith. | Strategics → exploration |
| Field Notebooks | C | Claiming a ruin grants 15 science, 20 culture and 20 gold. | Strategics |
| Natural Philosophy | U | First discovering each different terrain or feature type grants 5 science and 10 food to your capital. | Strategics → Country |
| Apprentice Engineers | C | Cities with a Library produce workers 25% faster. Each first ordinary improvement you build on an owned hex grants its city 10 food and 10 gold. | Strategics → Spade |
| The Long Study | U | A Library at least twenty turns old grants +2 culture and +1 renown. At forty turns, these bonuses become +4 culture and +2 renown. | Continuity → Great People |
| The Research Annals | U | While active, gains +1 production and +1 culture per turn in your capital for each technology completed, at most +24 of each. | Continuity → Charters |
| Practical Astronomy | U | Scouts and ships gain +1 sight. Coastal cities with a Library gain +3 food. | Strategics → exploration |
| Patient Research | R | Science buildings cost 25% more production. Each science building at least twenty turns old gives +3 food and +3 production. | Continuity; trade-off |

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Glassmakers' Charter | U | **Once drafted, unlock Optics for research. No chair required.** | Charters → exploration, Institutions |
| The Open Collegium | C | Gain +25% renown while you have no unspent great-person unit. | Great People; recruitment before the first work |
| Working Estates | C | Worked great-person improvements gain +3 food and +2 gold. | Great People → provincial development |
| The Old Academy | U | An Academy at least twenty turns old gains +2 food and +2 production. At forty turns these bonuses become +4 of each. | Continuity → Great People |
| Learned Commissions | C | Library cities gain +25% production toward empire buildings. Completing each institution type for the first time grants 40 culture and 20 faith. | Institutions → Great People |
| The Assay | C | Gain +2 science and +2 gold for each distinct strategic resource type you can access. | Strategics |
| The Strategic Reserves | C | Each accessible improved strategic deposit beyond the first of its type gives its owning city +2 production and +2 gold. Great-person works qualify as improvements here. | Strategics ↔ Great People |
| The Practical Arts | R | Listed technologies matching your empire's current activities cost 20% less research. Ordinary military-unit production costs 10% more. The qualifying activities are shown below and on those technologies. | Charters ↔ Strategics; trade-off |
| Research through Construction | R | Your recurring city science supplies city production instead of research. Completing an ordinary building grants research equal to 50% of its standard production cost. Purchases, free buildings, replacements, projects, empire buildings and wonders do not trigger this reward. | Institutions; optional conversion |
| The Endowed Provinces | U | Each city working at least one great-person improvement gains +4 food and +3 production, once per city. | Great People → distributed works |

#### Tier 2 — Late (Government II · age 3+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Metallurgists' Charter | U | **Once drafted, unlock Alloys for research. No chair required.** | Charters → Strategics |
| The Naturalists' Charter | U | **Once drafted, unlock Taxonomy for research. No chair required.** | Charters → Wild |
| The Royal Society | C | Each empire building grants +2 renown. Its city gains +2 happiness, once per city. | Institutions → Great People |
| The Learned Chancery | C | Cities with an empire building cost one less authority, minimum one, and gain +50% border growth. | Institutions → provinces |
| The Academy Quarter | U | A city with an empire building gains +3 production and +3 gold per different great-person work type it works, at most +15 of each. Multiple institutions do not multiply this benefit. | Institutions ↔ concentrated works |
| The Inherited School | U | Worked Academies and Manufactories gain +2 food and +2 production per distinct great-person legacy family you currently retain, at most +10 of each. | Great People; legacies ↔ works |
| Discoveries through Great People | R | Spending a great person on an act, work or legacy grants 20% of the selected technology's research cost, at most once per turn. Normal research overflow applies. | Great People → Charters |
| Husbandry Studies | U | Horse-dependent military units you train gain +1 movement permanently. [Movement creation stamp; no new units or resources.] | Strategics → military |
| Enduring Institutions | U | A city with an empire building at least twenty turns old gains +2 happiness and +15% production, once per city. | Continuity ↔ Institutions |
| The Patent Rolls | U | Completing a technology before any other empire grants 20 culture and 10 renown. [A first-completion record for each technology; not an age-completion reward.] | Charters → Great People; optional contest |
| Commissions of Service | C | Spending a great person on an act or legacy grants the nearest owned city 30 food and 30 gold. Placing a work does not trigger this reward. | Great People; alternative to work placement |
| The Quiet Faculties | R | Cities working a great-person improvement gain +25% food and +20% production, but produce military units 25% more slowly. | Great People → People; trade-off |

#### Tier 3 — Final (Government III · age 4+)

| Card | Rarity | Proposed text | Line / links |
|---|---|---|---|
| The Mechanists' Charter | R | **Once drafted, unlock Mechanics for research. No chair required.** | Charters → Great People, Institutions |
| The Alchemists' Charter | U | **Once drafted, unlock Chemistry for research. No chair required.** | Charters → Strategics |
| The Second Seat | R | You may construct one additional copy of one eligible empire building in a city with a University. Choose by queueing the copy normally; only one extra copy may be queued or held across your empire. [Limited once-per-empire exception.] | Institutions; distributed capability |
| The Long Inheritance | R | Cities working a great-person improvement at least twenty turns old gain +30% production toward empire buildings, wonders and the Opus. A mature empire building there adds another +15%. | Continuity ↔ Great People |
| Master Artificers | U | Worked Academies and Manufactories gain +6 production and +6 gold. | Great People → major construction |
| The Distant Colleges | U | Cities with an empire building may work owned great-person improvements one hex beyond their normal work radius. No citizens, ownership or other tile eligibility are granted. [Work-radius exception.] | Institutions ↔ work placement |
| The Society of Artificers | R | A city with an empire building working an Academy or Manufactory gains food and culture each equal to 20% of its base production, excluding conversion outputs. | Institutions ↔ Great People; practical payoff |
| The Learned Realm | U | Each city working a great-person improvement grants +1 authority capacity, at most +8. Cities with a Library at least twenty turns old gain +2 happiness. | Great People ↔ Continuity; provincial payoff |

#### Charter technologies and research conditions

The following are **five technology payloads, not five additional cards**. Their effects are permanent once researched and need no chair. Prerequisites and column placement must be authored against the actual chart before implementation. The technology's age is not earlier than its Charter's offer band; research does not waive unit resource requirements or grant a free building.

| Technology | Research age | Proposed payoff when researched |
|---|---|---|
| Optics | 2 | Scouts and ships gain +2 sight. Observatories become constructible through this technology instead of waiting for their ordinary age-4 unlock; the building still costs production. |
| Alloys | 3 | Worked strategic mines gain +2 production. Resource-dependent military units subsequently trained gain +10 maximum health permanently. |
| Taxonomy | 3 | Cities gain +2 culture and +2 faith per distinct feature type they work. |
| Mechanics | 4 | Workshops give +6 production. Worked Manufactories gain +25% of their native production and grant adjacent worked tiles +2 food, once per receiving tile. |
| Chemistry | 4 | Worked niter mines gain +4 production. Existing niter-dependent military units cost 25% less production. No new unit or earlier unlock is assumed. |

**Practical Arts' fixed, proposed condition list:** Irrigation — work a floodplain; Currency — work an improved luxury; Wayfinding — own a coastal city; Engineering — work three irrigated farms in one city; Guildhalls — work two mines/quarries in one city; Scholarship — work an Academy; Geomancy — access iron; Optics — own a scout and a ship; Alloys — access iron; Taxonomy — work three different feature types across your empire; Mechanics — work a Manufactory; Chemistry — access niter. This is a short author-defined list, not a new quest system. It changes the current research cost, never retroactively pays a refund or bypasses prerequisites. Private nodes still require their drafted Charter.

**Implementation boundaries:** Research through Construction routes the city's recurring science before research collection into production once, as a conversion output. That production cannot feed another conversion, and the building's research reward cannot be reconverted. Only first production completion per city/building type pays; research received via other windfalls remains research. The Second Seat needs a reservation for the queued extra building and a whitelist of eligible institutional effects: local benefits follow each copy; empire-wide effects and one-time grants must not silently duplicate. An already completed extra building persists when the card is removed, but removal cannot reset the empire's extra-copy allowance. No world wonder or Opus is eligible. Resource additions (camels/obsidian, copper/tin promotions) remain parked.

#### Four-chair combinations and alternatives

Drafted Charters are listed separately: they are not active Orders and never fill one of these four chairs.

| Direction | Four active cards | Changed decision and missing-card alternative |
|---|---|---|
| A scholarly centre | Working Estates; Learned Commissions; The Academy Quarter; The Inherited School | Assemble different worked improvements around an institution while reserving some people for legacies. Without a legacy portfolio, Enduring Institutions supports the same centre. |
| Provincial schools | The Open Collegium; Working Estates; The Endowed Provinces; The Learned Chancery | Spend people to establish useful works in several towns, then distribute institutions. One work starts the plan; no particular family or Second Seat is required. |
| Applied research | The Assay; The Strategic Reserves; Apprentice Engineers; Research through Construction | Develop resource sites and ordinary buildings to fund research. Alloys, if drafted and researched, adds capability without consuming a chair. Learned Commissions replaces the conversion card for a conventional research economy. |
| Acts and inheritance | The Open Collegium; Commissions of Service; Discoveries through Great People; The Inherited School | Use acts for current needs and retain legacies while keeping a few productive works. Working Estates replaces the research payoff if it never appears; a single legacy family already contributes. |

**Systems to review:** persistent on-draft Charter access and new research nodes; maturity timestamps; new great-person and discovery riders; limited institutional duplication; creation-time movement; extra-radius work assignment; conversion isolation and research condition lists. Five Charter choices compete with immediately useful Orders even though they consume no chairs. Test that distinction explicitly; catalogue size alone says nothing about their power.

### Magisterial

#### Playstyle goals — independent of the card draft

**Power fantasy:** “My court makes civilization itself a source of power.” Monuments, institutions, great people and public culture should organize a prosperous realm whose influence and achievements can be felt on the map. Culture matters because patronage builds capability as well as opening more drafts.

**Leader needs.** Taizong wants a military-backed court whose garrison towns sustain culture and scholarship. Akhenaten wants sacred centres that can actually support monumental construction. Hypatia wants patronage to nurture useful great people and strengthen their enduring works. Hildegard wants productive religious-cultural institutions and active rites across her realm. Magisterial must support a magnificent capital, a landscape of great works and a distributed institutional civilization; it cannot assume every leader should compete for the same wonders.

| Main approach | Investment and source of power | What success feels like | (Claude) At the table |
|---|---|---|---|
| Monumental court | Concentrated patronage, major construction and institutions supporting a principal city. | A great capital can afford magnificent projects while sustaining a complete economy and credible defence. | Wonder races: a wonder is claimed once for the world, so every one you begin is a bet against the table, and the refund on losing is the front row's only. The capital that holds them is the richest prize on the map. |
| Great-person patronage | Renown, useful people, commissions and enduring works. | Different people and works contribute to a distinctive civilization; their value extends beyond producing more renown. | The shared roster again: each call denies the table a name, and the Triumphs are contested once per era, first by log order. Works on the map are pillage targets and border markers. |
| Civic and provincial culture | Distributed institutions, public culture and productive towns. | Many places participate in a flourishing realm rather than serving only as support for the capital. | Culture is the draft currency, so a broad cultural realm out-drafts the table; its border growth presses neighbours without a soldier. The peace-rewarding cards (Pageants of Peace, Cultural Embassies) make this the approach most content to be left alone. |

**Flexible route:** ordinary civic buildings, useful patronage and selective major projects provide reliable development without winning wonder races or drawing a specific person. Military courts and sacred institutions are leader-shaped expressions of these approaches; the deck also needs nonmilitary and nonreligious ways to perform its essential jobs.

| Age | Monumental court | Great-person patronage | Civic and provincial culture |
|---|---|---|---|
| 1 · Omens | Basic institutions support food, production and culture while preparing for ambitious construction. *(Claude) Anchors: the Monument (Stonecraft) and its border growth, the Pyramids and Stonehenge as the first wonder bets, the Oracle.* | Begin useful patronage and renown generation; benefits do not wait entirely on the first great person. *(Claude) Anchors: renown accrues by family from buildings; the Temple of Artemis (Husbandry); Epic Poetry opens great-person calls in age 2.* | Early local institutions support development and culture in ordinary towns. *(Claude) Anchors: a Monument in every town is the wide opening; the Granary beside it; culture is the draft meter, so this approach drafts first.* |
| 2 · Heroes | A first major project strengthens the city's broader economy; opportunity costs remain manageable if a rival wins the race. *(Claude) Anchors: the Amphitheater and Theatre of Dionysus (Epic Poetry), the Imperial Throne (Code of Laws), the Mausoleum and Colossus; the losing bet refunds the front row's hammers.* | First people and works provide useful production, knowledge or income, with room to adapt to the available roster. *(Claude) Anchors: the Heroic Epic; the Pageants project (Code of Laws) turns hammers into culture; Epic Poetry opens great-person calls here; if the shared roster is exhausted, renown banks rather than blocking recruitment.* | A growing set of cultural towns supports research, production and continued institution building. *(Claude) Anchors: the Stele of Laws (Code of Laws) for the town cap, the Garden; two culture buildings per town is the age's threshold.* |
| 3 · Empire | A large capital and supporting cities gain the happiness and administration needed to remain viable. *(Claude) Anchors: the Forum and Great Library (Rhetoric), the Forbidden City (Satrapies), the Circus Maximus for the capital's calm.* | An established collection of works and institutions supports multiple productive centres or a concentrated court. *(Claude) Anchors: the Examination Hall, Petra, the Water Clock; works stand as tiles and open their seams; the artist's work is culture on the map.* | Authority, happiness and local investment make a broad cultural realm competitive with concentrated patronage. *(Claude) Anchors: the Public Bath (State Workforce), the Town Charter, caravanserai roads; three culture buildings per town is the age's threshold.* |
| 4 · Cathedrals | A mature monumental centre has the knowledge, production and security to complete a victory, not merely win more decorative projects. *(Claude) Anchors: Notre Dame (The Holy Office), Machu Picchu (Natural Philosophy), the Alhambra (Militant Orders); Alchemy's door and the Opus as the last wonder.* | Existing people, legacies and works support major achievements; the final payoff uses an investment made throughout the game. *(Claude) Anchors: the House of Wisdom and The Turning Heavens (Scholarship); legacies are revoked by marking, never deleted, so the history is readable.* | An established institutional network combines its output into competitive science, military capacity and victory construction. *(Claude) Anchors: the University in every town, the Printing House (Movable Type); the culture wager is the deck's bead and the draft count its arithmetic.* |

**Complete-empire requirements:** culture through public institutions and achievement; food/production through civic support and practical patronage; gold through prosperous towns and useful works; science through education and learned institutions; early faith through civic-sacred traditions or patronage without requiring Devotion; authority/happiness through legitimacy and administration; military capacity through productive cities, civic defence and military patronage where chosen. A culture-rich empire must be able to execute its drafts with ordinary material resources.

**Mixing and boundaries:** provincial institutions finance a court; patronage strengthens major projects; a monumental centre helps create great people whose works benefit other towns. The deck should not depend on securing a particular wonder, person or building sequence. Great-person play overlaps Scientific, but Magisterial emphasizes broad patronage, civic achievement and a functioning court; Scientific emphasizes knowledge and its application. More culture should not be an automatic route to every other advantage through unlimited draft acceleration.

#### Rebuilt draft — courts, commissions and civic life

**Rewritten from the playstyle guide and Claude's comments, 2026-09-16 · proposal only.** Magisterial turns public culture and patronage into a functioning civilization. Its three approaches are a monumental court, great people and their enduring contributions, and prosperous provincial institutions. Culture and renown are important rewards, but already purchase drafts and contested people: the deck also needs food, production, knowledge, income and security from those investments.

Chronicle of Works rewards early civic construction with science/gold; Civic Annals rewards growing Monument towns with production/culture. Living Chronicle starts in age 2, when both wonders and great-person expenditure can support a lasting court economy. Later choices pay for institutions, works and legacies already established, rather than starting a new final-age counter. There are no cards that pay merely for drafting, holding cards or repeatedly changing chairs.

**Rules for this draft:**

- Require both government tier and research age. Monuments, Shrines, Granaries, quarries and early wonders are age 1; Gardens, Amphitheaters, Markets, Harbours and great-person calls are age 2; Cathedrals, the Forum, Workshops and Aqueducts are age 3; Universities and the final wonder tier are age 4. The Assembly Hall is an existing card unlock with a **capital-only** site requirement; Senate Charter does not waive it.
- **Culture buildings** here mean non-world-wonder buildings in the existing culture category, excluding the Magnum Opus. Monuments, Gardens and Amphitheaters can qualify in ordinary towns; a Forum is once per empire, a Courthouse is restricted to captured towns, and the Assembly Hall to the capital. Unique replacements count as their base building. No retired or unavailable building is assumed. **Wonder** means a world wonder, not an empire building or the Opus. A card naming Opus production does not open its technology or bead gate.
- **Great-person works** are the existing great-person improvement families, including Academies, Manufactories, Landmarks, Customs Houses and Citadels, excluding Holy Sites. Worked bonuses require citizen assignment. A city's presence condition pays once unless explicitly per work. Native yield means the improvement's printed base yield before leader, card, terrain or conversion additions; Great Exhibition cannot multiply another card's additions.
- Founding Pageant requires personally founding on a previously unsettled hex; capture, transfer and refounding do not qualify. Its free Monument is not a construction or purchase event. All first-construction rewards require production completion while active; purchases, gifts, replacement/rebuilding and capture do not count. Record previous acquisition even while inactive and preserve the city's history across transfer. Chronicle of Works counts each culture building type once per city, up to its cap. Civic Annals and Festival Commissions require natural growth beyond that city's historical population maximum; regrowth and free population do not pay. Counters retain progress while unseated but earn/pay nothing while inactive.
- Living Chronicle counts each world wonder you complete and each distinct great person you spend through a valid act, work or legacy, while active. A wonder captured or gifted is not completed. Spending a person counts once, excluding dismissal, death, capture and an unselected offer. If an engineer completes a wonder, that is one genuine person expenditure and one genuine wonder completion, not a repeatable trigger.
- Renown uses the existing pool and family weighting. Unspecified renown is family-neutral, useful to a court drawing every family. Calling still requires Epic Poetry and the normal escalating price/shared roster. No instant person appears on slotting and no card refunds renown for recruiting or spending a person. A legacy counts only while retained under the existing legacy rules; a revoked legacy does not count. Several legacies of one family still count as one family for Living Canon.
- Creation benefits such as Maritime Galleries remain on units trained while active; upgrades, purchases and free grants are not training. Ordinary ongoing bonuses stop when unslotted. Golden Age's earned duration continues to elapse while unseated, supplies no benefit while inactive and never restarts on reseating. Its duration refreshes rather than adding or stacking magnitude.
- Public Benefactors reads actual gold paid for the first purchase/acquisition of a building type in a city, retaining the same history across ownership changes. Free grants, rebuilding, units, land, trades and great-person offers do not qualify. Discounts reduce the reward base. All conversions exclude conversion outputs and windfalls. Culture converted into science, gold or production cannot become the input of another conversion.
- Wonder-production conditions use the item actually receiving the city's production, not a later queue entry. Ordinary wonder-loss refunds remain unchanged; cards grant no extra reward for losing, cancelling or restarting a project. Border-growth bonuses do not increase the culture available for drafts. No new festival action, quest, diplomacy currency or great-person system is introduced.

#### Tier 0 — Early (Chiefdom · age 1+)

| Card | Rarity | Proposed text |
|---|---|---|
| Master Masons | C | Gain +25% production toward Monuments. Completing a culture building for the first time in a city grants 20 production there. |
| Civic Granaries | C | Monuments give +2 food and +2 production. |
| The Civic Accounts | C | Monuments give +2 gold and +2 science. |
| Patronage | C | Your capital gains +1 renown per four citizens. Monuments give +1 culture. |
| The Civic Guard | C | Cities with a Monument gain +4 defence. Your military units defending beside one gain +3 strength. |
| Festival Commissions | C | Natural growth in a city with a Monument grants 10 culture and 10 food there. |
| The Temple of the Muses | C | Culture buildings give +2 faith each. |
| The Sculptors' Quarries | C | Worked quarries give +1 production and +1 culture. Cities working one gain +15% production toward buildings. |
| The Pageant Fields | C | Worked farms and plantations in cities with a Monument gain +1 food. Cities working at least three such tiles gain +2 culture, once per city. |
| Hearth Ceremonies | C | Cities with a Monument and Shrine gain +2 faith and +2 gold. |
| The Wonder-Feasts | U | Cities producing a wonder gain +4 food and +2 happiness. |
| The Chronicle of Works | U | While active, gains +1 science and +1 gold per turn for each culture building you complete for the first time in a city, at most +30 of each. |
| The Civic Annals | U | While active, gains +1 production and +1 culture per turn in your capital each time one of your cities with a Monument grows, at most +24 of each. |
| The Civic Nursery | U | Cities with a Monument produce workers and settlers 20% faster. |
| Public Benefactors | U | Purchasing a building with gold in a city with a Monument grants culture equal to 10% of the gold actually paid, at most 30 per purchase. Only its first acquisition in that city qualifies. |
| The Court Stewards | U | Your capital gains +1 food and +1 gold per three citizens while it has a Monument. |
| The Founding Pageant | R | Founding a city grants a free Monument and 25 culture. Your capital produces settlers 25% faster. |
| The Capital of Letters | R | Your capital gains +20% food and +20% gold while it has a Monument and Granary, but trains military units 15% more slowly. |

#### Tier 1 — Middle (Government I · age 2+)

| Card | Rarity | Proposed text |
|---|---|---|
| The Chancery | C | Gain +1 authority capacity per two Monuments, at most +3. Cities with at least two culture buildings gain +2 gold. |
| The Civic Stage | C | Cities with at least two culture buildings gain +2 happiness and +3 food. |
| The Public Copyists | C | Cities with a Monument and Library gain +3 science and +2 culture. |
| The Artisan Wages | C | Culture buildings give +2 gold and +1 production each. |
| Provincial Patrons | C | Noncapital cities with at least two culture buildings gain +1 renown and +2 culture. |
| The Citizens' Watch | C | Cities with at least two culture buildings train military units 20% faster and gain +3 defence. |
| The Harbour Festival | C | Harbours give +2 culture and +2 food. Coastal cities with a Monument gain +1 happiness. |
| The Pageant Schools | C | Cities with a Monument and Temple gain +2 science and +2 faith. |
| The Grand Fairs | C | Cities with a Market and Monument gain +3 culture and +3 gold. |
| The Groundskeepers | U | Worked great-person improvements give +3 food and +3 production. |
| The Laureate | U | Cities working a great-person improvement gain +3 culture, +2 science and +1 renown, once per city. |
| The Guild of Masons | U | Gain +25% production toward wonders. Cities producing a wonder lose 2 gold per turn. |
| The Civic Assemblies | U | Gain +1 authority capacity per two culture buildings, at most +4. Culture buildings cost 20% less production in noncapital cities. |
| The Patrons' Road | U | Connected noncapital cities with a Monument gain +3 gold and +2 production. Domestic routes from such cities give their destination +2 culture; your foreign routes from them give you +2 culture. |
| The Master Workshops | U | Completing a culture building for the first time in a city grants 25 production there and 20 gold. |
| The Commemorative Feast | U | Spending a great person grants 30 food and 30 production to your nearest city. Each person pays once. |
| The Living Chronicle | U | While active, gains +2 production and +2 culture per turn in your capital for each wonder you complete or great person you spend, at most +30 of each. |
| The Complete Court | U | Your capital gains +3% food and +3% production per distinct non-culture building category it holds, at most +18% each. |
| The Great Patrons | U | Each wonder you hold gives +2 family-neutral renown. Cities containing a wonder purchase culture buildings for 20% less gold. |
| The Muses' Call | R | Gain +20% renown. Cities working a great-person improvement gain +3 food and +3 production, once per city. |
| The Artisan Court | R | Cities working a great-person improvement gain +2 renown and purchase culture buildings for 25% less gold. |
| The Working Court | R | Cities with a Monument gain production equal to 20% of their base culture, excluding conversion outputs. |
| The Festival Season | R | Cities with a Garden and Amphitheater gain +20% food and +20% gold. Each qualifying city costs +2 gold upkeep. |

#### Tier 2 — Late (Government II · age 3+)

| Card | Rarity | Proposed text |
|---|---|---|
| The Court Archives | C | Culture buildings give +2 science each. Cities with at least two gain +5 gold. |
| The Public Gallery | C | Cities with at least three culture buildings gain +6 food and +3 happiness. |
| The Monumental Provinces | C | Connected noncapital cities with a Monument gain +5 production and +3 culture. |
| The Civic Faith | C | Culture buildings give +3 faith each. Cities containing a wonder gain +3 happiness. |
| The Provincial Chancery | C | Gain +1 authority capacity per noncapital city with at least two culture buildings, at most +8. Such cities gain +3 science. |
| The Palace Guard | C | Cities with at least three culture buildings train military units 30% faster. Your military units defending those cities gain +4 strength. |
| The Maritime Galleries | C | Harbours give +5 culture and +3 science. Ships trained in a city with at least two culture buildings gain +3 strength on creation. |
| The Provincial Stages | C | Noncapital cities with at least two culture buildings gain +2 renown and +3 food. |
| The Master's Presence | U | Cities working a great-person improvement gain +20% production toward buildings and +15% gold. |
| The Grand Tour | U | Cities containing a wonder gain +5 culture and +5 science. Cities working a great-person improvement gain +2 happiness. |
| The Learned Patron | U | Cities with at least two culture buildings gain science equal to 10% of their base culture, at most +12 science per city. Conversion outputs are excluded. |
| The Performers' Treasury | U | Cities with at least two culture buildings gain gold equal to 20% of their base culture, excluding conversion outputs. |
| The Civic Harvest | U | Cities of at least ten population with at least two culture buildings gain +25% food and +3 happiness, and retain an additional 20% of food spent on growth. |
| The Senate Charter | U | Unlocks the capital-only Assembly Hall. A city with one gains +3 happiness and +20% production toward buildings. |
| The Sculptors' Schools | U | Worked great-person improvements give +3 science and +3 gold. Their cities gain +1 renown, once per city. |
| The Patrons' Fleet | U | Cities with a Harbour and at least two culture buildings train ships 35% faster. Your ships gain +1 movement. |
| The Cultural Embassies | U | Each foreign empire you have met and are at peace with gives your capital +3 gold and +2 culture, at most +12 gold and +8 culture. Gain +1 family-neutral renown per two such partners, at most +2. |
| The Monumental Court | R | Cities containing a wonder gain +3 renown and +25% production toward culture buildings and wonders, once per city. |
| The Civic Commonwealth | R | Cities with at least three culture buildings demand 20% less population happiness and cost one less authority, minimum one. |
| The Great Exhibition | R | Worked great-person improvements gain +25% of their native yield. Cities working at least two different types gain +20% gold. |
| The Golden Age | R | Completing a wonder grants your cities +20% food, production, gold and culture for ten turns while this card remains active. Duration refreshes; magnitude does not stack. |

#### Tier 3 — Final (Government III · age 4+)

| Card | Rarity | Proposed text |
|---|---|---|
| The Laureate Cities | C | Cities of at least twelve population with at least two culture buildings gain +25% culture and +10% science. |
| The National Galleries | C | Culture buildings give +5 food and +5 gold each. Cities with at least three gain +4 happiness. |
| The Provincial Academies | C | Connected noncapital cities with a Library and at least two culture buildings gain +20% production and +10% science. |
| The Civic Pantheon | C | Cities containing a wonder gain +25% faith and +20% gold. Wonders give +10 culture each. |
| The Salon | U | Culture buildings give +2 renown each in cities working a great-person improvement, at most +6 per city. |
| The Magister's Court | U | Cities containing a wonder gain +25% production toward the Magnum Opus and Cathedrals, once per city. |
| The Masters' Domain | U | Worked great-person improvements give +8 production and +8 food. Their cities gain +20% gold, once per city. |
| The Great Chancery | U | Gain +2 authority capacity per city with at least three culture buildings, at most +12. Such cities gain +20% culture. |
| The Imperial Pageant | U | Your military units gain +5 strength when defending within two hexes of your wonder or great-person work. Cities with at least three culture buildings train military units 35% faster. |
| The Honoured Dead | U | Your capital gains +4 science and +8 production per distinct great person you have spent this game, at most +60 science and +120 production. |
| The Pageants of Peace | U | While at peace with every foreign empire, cities with at least two culture buildings gain +20% culture and +2 happiness. |
| The Living Canon | R | Cities with at least three culture buildings gain +5% food and +5% production per distinct great-person family whose legacy you currently hold, at most +25% each. |
| The Universal Court | R | Cities with at least three culture buildings gain food and gold each equal to 25% of their base culture. Conversion outputs are excluded. |
| The Last Commission | R | Spending a great person grants the city building your Magnum Opus 150 production, at most once per turn. No Opus under construction means no payout. Each person can pay once. |
| The Wonder Commonwealth | R | Cities containing a wonder gain +25% production and +25% food. Your cities without a wonder gain +10% culture instead. |

#### Intended packages and checks

| Approach | Ordinary opening | Age 2 development | Age 3 empire / age 4 finish |
|---|---|---|---|
| Monumental court | Civic Granaries and Court Stewards support a populous capital; quarry investment and Wonder-Feasts help it afford construction. | Complete Court rewards a broad supporting economy; Guild of Masons backs selected wonder attempts; Great Patrons turns successful projects into patronage. | Monumental Court and Golden Age reward further construction; Civic Harvest supports tall growth. Magister's Court and Wonder Commonwealth turn held wonders into productive finishing cities. Losing a race leaves useful civic infrastructure. |
| Great-person patronage | Patronage establishes renown; civic income and early faith support development before calls open. | Muses' Call supports recruitment; Groundskeepers makes placed works useful; Commemorative Feast and Living Chronicle also reward valid acts or legacies. No named person is required. | Great Exhibition develops a landscape of works. Living Canon instead rewards a varied retained legacy portfolio in developed cities; Last Commission turns a final useful expenditure into Opus construction. Those choices share patronage support but need not all fit in one hand. |
| Civic provinces | Monument towns grow through Civic Granaries, Festival Commissions and Civic Annals; Chronicle of Works rewards their construction. | Gardens/Amphitheaters support Civic Stage and Provincial Patrons; markets, libraries, faith buildings and roads broaden what towns can do. | Provincial Chancery and Civic Commonwealth support wide administration; Stages and Archives supply useful output. Great Chancery and Provincial Academies reward a developed realm without requiring a wonder in every city. |
| Flexible / diplomatic culture | Practical civic accounts, local defence and faith; no wonder or great-person prerequisite for essential opening yields. | Grand Fairs rewards commerce, Public Copyists learning, Pageant Schools religion, Citizens' Watch military preparation. | Cultural Embassies and Pageants of Peace reward peaceful relationships; local institutions and work-based benefits remain useful when a partner declares war. Taizong's military court and Hildegard's sacred towns can use the same institutions differently. |

**Claude's comments incorporated:** Complete Court now rewards food/production from a varied capital rather than multiplying science and culture together. Grand Fairs retains the commercial link. Cultural Embassies requires contact, counts distinct peaceful partners and has a cap; it does not pay for unknown empires or repeated agreements. Great Patrons gives family-neutral renown so it supports more than artists without handing every family a separate full-strength income. Golden Age moves to age 3, leaving time for wonder chaining; its burst improves the material economy and culture, not science. Maritime Galleries now prints a persistent training stamp.

**Distinct from Scientific:** Scientific primarily helps deploy discoveries and supports empire buildings. Magisterial organizes civic towns, pursues contested world wonders and makes patronage, works and legacies useful. Its cultural institutions can supply necessary science, but it does not inherit Scientific's technology-completion rewards or another large collection of science multipliers. It can flourish with a broad civic realm instead of leading the technology race.

**Multiplayer and victory:** wonders and great people are shared opportunities, so no core economy depends on winning them all. Extra renown is already a denial advantage; Great Patrons, Muses' Call and provincial renown need testing together. Peace bonuses can be interrupted by another player and never grant diplomatic immunity. Border growth may itself provoke neighbours. Ordinary institutional culture, income, research and defence remain available at war. Existing dealt wager conditions and the Opus gate still determine victory access; more drafts, wonders or people do not automatically award a bead under these cards.

**Balance checks:** compare three-chair court, patronage and provincial openings; price Monument completion refunds against actual costs and exclude the free Monument from Founding Pageant; test growth/food-retention loops under the shared cap and no-regrowth rule; compare wonder discounts and Golden Age refreshes with real construction times. Test whether choosing a work versus a legacy is meaningful, and whether native-yield boosts stack too strongly with Hypatia. Check The Working Court alongside culture bonuses, and limit science conversions to the printed base/cap. New event combinations, counters, legacy-family readings and timed effects still need implementation support. These are proposals, not a claim of simulated parity.

## (Claude) Cross-play and diversification — review notes, 2026-09-16

**Historical review, superseded where noted:** the comments below concern earlier card drafts. Expansionist and Scientific have since been replaced by forty-card line-based pools; Commerce now has forty-four entries including three building Charters. Their former building-category cards and multiple income counters are not current rows. Devotion now has forty-four cards with two access Charters and one growing-income card; Magisterial retains its prior card table. The 37 cross-type cards remain unchanged for separate review. Current counts and examples are recalculated below.

Additions above are tagged "(Claude)" in the card column. They aim at two things: playstyles a deck still lacked, and mechanics that pay for playing outside your lane. The shapes behind them, so the cost is visible:

- **One count kind, six cards: distinct building categories a city holds.** The data already classes every building (military, faith, culture, science, gold, food, production). The Well-Founded Town, The Emporium, The Parish of All Trades, The Polymaths and The Complete Court each pay per category held, in the deck's own voice. A player who builds only their lane's buildings gets nothing; one who puts a Barracks, a Temple, a Library and a Market in a town gets the most. Dominion could take a sixth ("The Garrison Town") if wanted. This is the cheapest diversification mechanic available: one new count kind.
- **One count kind over the diplomatic state, four cards.** The Treaty Ports (active deals), The Silk and the Sword and The Cultural Embassies (empires at peace with you), The Universal Church (foreign capitals following your faith). All four reward peace and reach over a human table rather than war, which is the multiplayer-safe direction, and none exists in the catalogue today.
- **A landmass reading, two cards.** The Island Charters and The Colonial Compact give Expansionist the colonial playstyle it lacked. Needs a landmass id per tile; the generator may already label continents — check before pricing.
- **Playstyles added**: colonial (Expansionist), exploration (Commerce, Scientific), defensive faith (Devotion), wonder-chaining bursts (Magisterial, The Golden Age), every-family great people (Scientific, Magisterial), escorted settling (Expansionist).
- **Seven new cross-type cards**, one for each pair whose bridge was thinnest, mostly commons and uncommons so they show up.
- **A class of cards to reword**: The Toll Watch, The Chartered Arsenal, The Paid Army, The Pilgrim Coast and The Maritime Galleries give units a strength or health stamp "while this card is active". A stamp is written at muster and never reads the card again, so "while active" is unimplementable as written. Either make them permanent stamps (the War Hall's shape) or live strength lines conditioned on a unit fact the sim does not carry (purchased versus trained). **Ruled 2026-09-16: permanent stamps** — the five cards' "while this card is active" clauses are struck; a unit mustered or purchased under the card keeps its stamp for life.
- **The knob**: the third hand position deals a cross-type card one hand in four. If diversification is the goal, one in three (generic, cross, single) is the dial, and the reserved generic position falls to fallback-only once its pick rate is measured low.
- **Counts**: with these additions each deck runs roughly seventy-five to ninety cards and the cross-type table thirty-seven. The capacity table below needs re-counting before the exhaustion claims are relied on.

## Standalone coverage and scaling

A deck is self-sufficient when its own commons and uncommons can fund necessary jobs through its own actions. It need not offer identical strengths, and a single three-chair opening cannot activate every role at once. Cross-type cards and generic commons are optional support, not repairs for a missing science or authority economy.

| Deck | Opening food / production / gold | Opening research / culture | Non-rare authority / faith by tier 1 | Military support without another deck | Later scaling and finish |
|---|---|---|---|---|---|
| Dominion — user edition | Martial Law / Blooded Spears / Paymasters | The War Chronicle; Drill Manuals | Victory Steles / Muster Rites, Hunters' Offerings | The deck's main action | Training, kills, garrisons and conquest; Imperium. Paymasters covers early gold; Veterans' Boroughs supports tall cities in government II. |
| Expansionist | Smallholdings, Granary Levies, Levy of the Land; Claim by the Spade | The Naturalists, Growing Annals; Old Songs and Charcoal Burners in age 2 | Local Census / Groves and the Stones, Charcoal Burners | Muster of the Fields, hill-town defence; ordinary military production | Citizens spent/recovered, renewed woodland, productive wild land, irrigated frontiers and complementary provinces. |
| Commerce | Salt Tithes, Guild Halls, Lighthouse Keepers; purchases and domestic provisioning | Travellers' Letters; Civic Receipts; Merchant Ledger begins with routes | No dedicated age-2 authority card; baseline until League of Cities in age 3 / Merchant Shrines | Bought Swords, Convoy, Charter Fleet, Chartered Arsenal and Paid Army | Mature domestic links, qualified foreign posts, manufactured/export goods, purchased assets or bounded reserves; foreign and domestic finishes. |
| Devotion | Monastic Table, Pastoral Shrines, Lay Offerings; Rites of Labor | Omen Schools; Copyists in age 2; Living Hymnal optional | Baseline authority until Parish Rolls in age 3 / First Rites, pastures, mines/camps and Votive Fields | Watch/Passage rites, Healing, Votive Companies, Spiritual Host and Holy Army | Maintained rites, immediate investment, receptive towns, held foreign following or sacred destinations; existing victory requirements. |
| Scientific | Almanac, Apprentice Engineers, Practical Astronomy; Patient Research matures | Scribes' Hall, Field Notebooks, Natural Philosophy, Research Annals | No dedicated age-2 authority card; government baseline until Learned Chancery in age 3 / Celestial Rites | Resource access, Husbandry Studies and researched Alloys/Chemistry; ordinary military production | Acts/works/legacies, national centres or provinces, bounded maturity; five drafted research keys use no chairs. |
| Magisterial | Civic Granaries, Civic Accounts, Court Stewards | Civic Accounts, Festival Commissions, Chronicle of Works | Chancery, Civic Assemblies / Temple of the Muses, Hearth Ceremonies | Civic Guard, Citizens' Watch, Palace Guard, Imperial Pageant | Civic growth/construction, patronage, world wonders and retained legacies; productive provinces or monumental cities. |

Expansionist, Scientific, Commerce and Devotion now use one optional accumulated-income card each, with other scaling drawn from land, citizens, current works/legacies and bounded maturity. They need useful early food, production and faith without exact rare combinations. Expansionist has modest age-2 authority support; Scientific relies on baseline administration until its age-3 institutional relief, a coverage limitation to test rather than hide behind a filler card. Major tall/wide and happiness choices remain concentrated in age 3. Commerce also relies on baseline authority before age 3, while its own Merchant Shrines supplies early faith. Devotion adds priced miracles, local learning and age-3 authority support without founding; Magisterial retains its earlier card coverage pending its rewrite. Numerical parity and reliable draft hands have not been demonstrated.

### When each economy starts scaling

| Deck | Tier 0 foundations that can grow | Government I second engine | Government II: tall / wide distinction | Government III payoff |
|---|---|---|---|---|
| Dominion, user-directed | War Chronicle, military and barbarian economy | Muster Rolls, Pacified Marches | Garrisoned cities versus captured provinces; authority and happiness become substantial | Army history, conquest and Opus access/support |
| Expansionist | Growing Annals is the sole income counter; levies, planting, wild faith and claims | Managed woodland, citizen migration, mountain work, irrigation adjacency | Common Treasury, Coppice, Hermitages, Grain Dole and Provincial Councils | Complementary provinces, larger work radius, stronger harvests or preservation, food-funded major construction |
| Commerce | Resource development, early purchases, contacts and merchant faith | Merchant Ledger is the only income counter; domestic allocation, continuity and first established posts | Home Market versus distributed routes; exports, bounded interest and purchased military quality | Building stamps, purchased people, sea-post reach, metropolitan or provincial administration, and two construction finishes |
| Devotion | Faith-producing land, rite-supported towns and natural-growth offerings; first rite Charter | Priced healing/growth, Copyists, sustained observance and Living Hymnal; second access Charter | Concord/Parish Rolls for width; Holy Sites/Cathedrals for concentration; relics, Council and missionary reach | Sacred Treasury, Cathedral choice, local rite construction/science, military capacity or held foreign reach |
| Scientific | Research Annals is the sole income counter; Library maturity, exploration and faith | First Charter, recruitment, worked estates, national commissions; optional construction-research card | Acts versus works/legacies; institutional quarters or provinces; two further Charters | Two final Charters, Second Seat, mature works and distributed authority |
| Magisterial | Chronicle of Works, Civic Annals; Temple of the Muses and Hearth Ceremonies for faith | Living Chronicle, works, broad patronage and varied supporting institutions | Civic Harvest / Monumental Court for tall; Provincial Stages / Provincial Chancery for wide; Golden Age construction bursts | Held works or legacy families, developed provinces, great-person history and wonders |

**Existing supporting worksheet:** `six-decks-coverage.md` predates the user's Dominion edits and this pass. It is left intact as historical working notes, not treated as the current coverage matrix; use the table above. In particular, its earlier claim that both types are needed for a bridge contradicts the proposal's either-type rule.

## Cross-type cards

The original target was two cards per pair; Claude has since proposed seven additional rows below. These bridge proposals are preserved for separate review, not an additional deck the player must manage. A pair usually offers a practical bridge followed by a later investment reward. Either type grants eligibility. Ordinary game actions can satisfy the other half without needing a card from that other deck.

| Card | Types | Rarity / availability | Proposed text |
|---|---|---|---|
| Frontier Garrisons | Dominion / Expansionist | C / Early (Chiefdom / tier 0) | Garrisoned cities of at most five population gain +2 food. |
| Military Colonies | Dominion / Expansionist | U / Middle (Government I) | Cities with a Barracks gain +30% production toward settlers and workers. |
| The Escorted Roads | Dominion / Commerce | U / Middle (Government I) | Routes whose origin has a garrison gain +3 gold. Naval units gain +2 strength while adjacent to one of your traders. |
| Letters of Marque | Dominion / Commerce | R / Final (Government III) | Naval combat kills grant 40 gold. Cities with a Harbour purchase naval combat units for 25% less gold, but produce those units 20% more slowly. |
| Rites of Passage | Dominion / Devotion | C / Early (Chiefdom / tier 0) | Completing a military unit grants 12 faith. |
| The Sacred Host | Dominion / Devotion | R / Middle (Government I) | Military units may be purchased with faith in cities with a Temple at the escalating conversion price. Combat kills grant 10 faith. Each military unit costs +1 gold upkeep while this card is active. |
| Field Academies | Dominion / Scientific | U / Middle (Government I) | Your first combat kill each turn grants 15 science. Cities with a Library produce siege units 25% faster. |
| The Engineer Corps | Dominion / Scientific | U / Final (Government III) | Siege units gain +1 movement. Cities with a Workshop gain +20% production toward siege units and +2 science while at war. |
| The Imperial Examinations | Dominion / Magisterial | U / Middle (Government I) | Garrisoned cities with a Monument gain +2 culture and +1 scholar renown. |
| Examinations of State | Dominion / Magisterial | R / Late (Government II) | Cities with a Monument and a garrison gain +1 science and +1 culture per three citizens. Ungarrisoned cities receive no bonus. |
| Market Gardens | Expansionist / Commerce | C / Early (Chiefdom / tier 0) | Farms beside a road gain +1 gold. Domestic routes grant an additional +1 food to their destination. |
| The Provincial Fair | Expansionist / Commerce | U / Late (Government II) | Connected noncapital cities with a Market gain +2 food. Their worked plantations, camps and pastures gain +1 gold. |
| Sacred Groves | Expansionist / Devotion | U / Early (Chiefdom / tier 0) | Worked, unimproved forests gain +1 food and +1 faith. |
| Harvest Offerings | Expansionist / Devotion | U / Late (Government II) | Farms gain +1 faith in cities following your religion. When those cities grow, they gain 10 production. |
| Hydraulic Schools | Expansionist / Scientific | C / Middle (Government I) | Cities with an Aqueduct gain +1 science per three citizens and +20% production toward science buildings. |
| The Hydraulic Commonwealth | Expansionist / Scientific | R / Late (Government II) | Aqueducts cost 30% less production. Cities with an Aqueduct gain science equal to 20% of their base food surplus, minimum zero, and +1 production per three citizens. |
| Garden Cities | Expansionist / Magisterial | U / Middle (Government I) | Cities with a Monument gain +1 culture per three worked farms, at most +3. Cities of at least eight population with an Aqueduct gain +1 happiness. |
| The Sculpted Landscape | Expansionist / Magisterial | U / Final (Government III) | Farms beside a great-person improvement gain +1 food and +1 culture. Each farm receives this once regardless of the number of adjacent works. |
| Pilgrim Markets | Commerce / Devotion | U / Middle (Government I) | Routes gain +2 gold and +2 faith if either endpoint contains a Holy Site. This pays once per route even when both endpoints qualify. |
| The Tithe | Commerce / Devotion | R / Late (Government II) | Cities with a Temple gain gold equal to 25% of their base faith. Gold purchases of religious buildings there cost 30% less. |
| Merchant Scholars | Commerce / Scientific | U / Middle (Government I) | Foreign routes from a city with a Library gain +3 science. |
| The Exchange of Discoveries | Commerce / Scientific | U / Final (Government III) | Cities with a University gain +2 science for each distinct foreign empire served by their outgoing routes, at most +8. Those routes gain +2 gold. |
| Travelling Players | Commerce / Magisterial | U / Early (Chiefdom / tier 0) | Foreign routes from a city with a Monument gain +2 culture. |
| The Cosmopolitan Court | Commerce / Magisterial | R / Final (Government III) | Cities with a culture building gain +1 renown per outgoing foreign route, at most +3 per city. Great-person improvements worked by such cities gain +2 gold. |
| Cloister Schools | Devotion / Scientific | U / Middle (Government I) | Cities with both a Temple and a Library gain +3 food and +3 science. |
| The Cloister | Devotion / Scientific | R / Late (Government II) | Cities with a Temple gain science equal to 20% of their base faith. Their Libraries and Universities each gain +2 food. |
| Sacred Commissions | Devotion / Magisterial | U / Middle (Government I) | Cities with a Holy Site gain +25% production toward wonders. Completing a wonder grants 40 faith. |
| Sacred Patronage | Devotion / Magisterial | R / Final (Government III) | Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn. |
| Illuminated Treatises | Scientific / Magisterial | C / Early (Chiefdom / tier 0) | Cities with both a Library and a Monument gain +1 science and +1 culture. |
| The House of Wisdom | Scientific / Magisterial | U / Final (Government III) | Worked Academies gain +2 culture. Cities working an Academy gain +1 renown and +20% production toward wonders. Each city receives the city bonus once. |
| (Claude) Marcher Lords | Dominion / Expansionist | U / Late (Government II) | Cities founded within four hexes of a foreign border gain +3 defence and +2 production, and cost one less authority, minimum one. |
| (Claude) Triumphal Arches | Dominion / Magisterial | U / Late (Government II) | Capturing a city grants 40 culture and +1 general renown. Cities containing a wonder gain +5 defence. |
| (Claude) The Crusader Orders | Dominion / Devotion | U / Late (Government II) | Military units gain +3 strength in territory not following your religion. Capturing a city presses your religion into it. [the press on capture is a third caller of the lump — a design decision] |
| (Claude) The Grain Exchange | Expansionist / Commerce | U / Middle (Government I) | Domestic routes from a city with a Granary give +3 food to their destination. Cities receiving one gain +1 happiness. |
| (Claude) The Monastery Libraries | Devotion / Scientific | C / Middle (Government I) | Monasteries give +3 science. Libraries give +2 faith. |
| (Claude) The Merchant Navigators | Commerce / Scientific | C / Late (Government II) | Ships gain +1 movement. Routes from a city with a Harbour and a Library gain +3 science. |
| (Claude) Garden Provinces | Expansionist / Magisterial | C / Late (Government II) | Connected cities with a Monument gain +2 food and +2 culture. |

## Generic common pool

All eighteen are **C**, offered to every leader through the shared position and exhaustion fallback. They have no deck type. They can also appear in extra normal-offer positions; they never appear in a rare-only doctrine hand. Earlier generics remain eligible, but expanding the generic table must not increase its reserved share of offers.

These are fallback tools, not foundations with empire-wide multipliers. Hearth Stores helps an awkward start; it should not outperform an Expansionist farm strategy. A basic research, food, faith or defence card lets a leader respond outside their specialty without gaining the specialized deck.

| Card | Rarity / availability | Proposed text |
|---|---|---|
| Hearth Stores | C / Early (Chiefdom / tier 0) | Your capital gains +1 food. |
| Common Tools | C / Early (Chiefdom / tier 0) | Your capital gains +1 production toward workers and buildings. |
| Watchmen | C / Early (Chiefdom / tier 0) | Friendly combat units gain +2 strength when defending in your territory. |
| Resting Camps | C / Early (Chiefdom / tier 0) | Friendly units that take no action this turn heal an additional 5 health when otherwise eligible to heal. |
| Local Markets | C / Early (Chiefdom / tier 0) | Your capital gains +2 gold. |
| The Village Scribe | C / Early (Chiefdom / tier 0) | Your capital gains +1 science. |
| Public Gatherings | C / Early (Chiefdom / tier 0) | Your capital gains +1 culture. |
| Household Altars | C / Early (Chiefdom / tier 0) | Your capital gains +1 faith. |
| Boundary Stones | C / Early (Chiefdom / tier 0) | Cities with a Monument expand their borders 20% faster. This does not increase draft culture. |
| Public Wells | C / Middle (Government I) | Cities without freshwater gain +1 food. |
| Civic Peace | C / Middle (Government I) | Gain +1 empire happiness. |
| Road Crews | C / Middle (Government I) | Workers gain +1 movement when starting their turn on a road you own. |
| Road Maintenance | C / Late (Government II) | Road upkeep is reduced by 20%, saving at most 4 gold per turn. |
| Emergency Stores | C / Late (Government II) | Cities of at most four population gain +1 food and +1 production toward buildings. |
| Local Clerks | C / Late (Government II) | Gain +1 authority capacity. |
| Public Hospitals | C / Final (Government III) | Cities of at least eight population gain +1 happiness. |
| Common Ledgers | C / Final (Government III) | Cities with a Market gain +1 science; cities with a Library gain +1 gold. |
| City Watches | C / Final (Government III) | Your cities gain +4 defence. Garrisoned units heal an additional 5 health when otherwise eligible to heal. |

Avoid generic free settlers, large production discounts, additional card slots, universal purchase discounts and blanket science/culture percentages. Those would become automatic picks across all leaders. These shared cards should earn a chair when their modest help is needed, then be replaceable.

## Governments and nine-chair endgames

### Capacity and administration

| Stage | Baseline capacity | Ibn Battuta with his existing extra chair |
|---|---|---|
| Start | **3** | 4 |
| First reform | **4** | 5 |
| Second reform | **6** | 7 |
| Third reform | **9** | 10 |

Ordinary rare, uncommon and common Orders all cost one chair. Unseating a rare Order frees its chair normally. The eight Scientific/Commerce Charters are permanent on-draft research/building keys and cannot be seated; they add no chairs or permanent doctrine seats.

The **universal-chair proposal** remains under review: deck types govern eligibility, replacing the old M/E/W seating constraints. Chair growth is awarded on the milestone independently of claiming the reform or rare reward. Newly added chairs are empty; existing cards and seals are preserved. Government changes do not trigger card effects or redraw the collection.

Retain the first cut's three modest, reusable forms as proposals. Every form has the same capacity at the same stage. At a reform, choose a form or retain the current one; no between-reform swapping or adoption payout.

| Form | Proposed administrative rule | Choice it presents |
|---|---|---|
| Council | Citizens demand 10% less happiness; authority capacity −2. | Concentrate population in fewer cities. |
| Crown | Authority capacity +3; every noncapital city demands +1 happiness. | Administer more cities while meeting their needs. |
| League | Trade-route capacity +1; authority capacity −2. | Support a network through provisioning and commerce. |

These replace, rather than supplement, the old government signatures. The existing sixteen names could later supply cosmetic era labels. Neither government form nor a rare doctrine determines deck access. Government and doctrine rewards remain independently accessible within Statecraft, and neither blocks End Turn.

### Migration of old powers

- Military signatures move into Dominion recruitment, garrison and conquest cards. Remove the old military-chair-count multipliers rather than keeping two copies.
- Theocracy/Curia-style conversions live in cross-type rares such as The Cloister. No free government conversion remains underneath them.
- Merchant League-style route power is divided among Commerce cards and the modest route-capacity form. Commonwealth-style great-person purchasing is Merchant Princes.
- Permanent old doctrines become ordinary rarity-tagged Orders, or are merged/retired. The new Scientific and Commerce Charters are separately specified on-draft access exceptions, not retention of old permanent doctrine yields. The old doctrines' ordinary Order benefits must be removed from the permanent doctrine evaluator; merely owning those Orders is insufficient.
- Old first-chair doublers, all-yield multipliers and repeated building/improvement doublers are not automatically preserved as rares.
- Taizong's science per military Order needs an explicit migration: Dominion membership is a candidate, counting a cross-type once. Other office-dependent leader, religion and card effects need individual decisions; six types cannot silently substitute for three offices.
- Wager malices still occupy chairs and cannot be removed through reform. Existing extra-chair and extra-offer sources need an audit against nine baseline chairs and normal-draft rares.

No live data, descriptions, rules or save formats are changed by this document.

## Can these pools last a full game?

**Historical draft snapshot:** the counts and sample builds below predate Zheng He’s approved Commerce + Magisterial swap; his old Dominion build is superseded. Current access is defined in `data/leaders.json`.

These counts include all ten drafted access Charters as collection entries, not slottable options. They are cumulative catalogue counts by government band, assuming the corresponding research age has also been reached for the six reviewed decks. They are not a count of immediately usable cards or a measurement of hand quality; the other pools still await their age pass. A leader receives both fixed single-type decks, all shared commons and every cross-type matching either type. Duplicate membership is counted once.

| Leader | Tier 0 cumulative | Through Government I | Through Government II | Full pool | Full-pool rares |
|---|---|---|---|---|---|
| Pachacuti | 33 | 65 | 100 | 124 | 20 |
| Taizong | 42 | 100 | 161 | 202 | 36 |
| Modu Chanyu | 33 | 82 | 138 | 169 | 31 |
| Akhenaten | 41 | 86 | 131 | 161 | 28 |
| Al-Ma'mun | 32 | 65 | 100 | 123 | 22 |
| Mithridates | 34 | 80 | 135 | 166 | 28 |
| Joan of Arc | 33 | 82 | 138 | 169 | 31 |
| Mansa Musa | 33 | 68 | 104 | 128 | 23 |
| Zheng He | 34 | 82 | 137 | 170 | 31 |
| Nezahualcoyotl | 33 | 64 | 98 | 121 | 18 |
| Hypatia | 39 | 83 | 125 | 157 | 28 |
| Hildegard | 41 | 86 | 131 | 161 | 28 |
| Ibn Battuta | 84 | 192 | 310 | 385 | 72 |

For a 45-normal-draft game with three doctrine rewards, a player accepting every reward owns at most 48 cards, before any separate card grants. The revised two-type full pools exceed that even without borrowing new deck types. This does not prove early-band sufficiency for extreme culture pacing, especially while research-age gates delay new offers. Culture pacing and extra reward sources still require live measurement.

The larger risk is now **finding coherent cards**, not literal exhaustion. Keep one offer position from each of the leader's types; do not simply shuffle all accessible cards into one global pool. Earlier foundations stay eligible. Review how frequently useful starting engines survive the growing pool before increasing draft count or adding yet more cards.

A standalone deck here means the player can build a functioning economy and winning plan primarily from one deck. It does not change the two-deck leader rule or claim that every random hand contains the needed answer. Generic commons and bridges remain optional flexibility.

## Examples of nine-chair finishes

These illustrate alternative packages, not required recipes or guaranteed draws. Each line lists exactly nine active Orders, including seated rares; any drafted Charters are additional research/building/rite access and never appear as chairs. Every package is legal through its leader's types, shared commons and either-type cross access.

| Leader / direction | Nine cards |
|---|---|
| Modu: pastoral raiding | Pastoral Shrines; Sacred Groves; Rites of Passage; March Discipline; Scorched Earth; Riders of the Steppe; The Sacred Host; The Standing Army; The War Chest. |
| Nezahualcoyotl: hydraulic research | Granary Levies; Levy of the Land; The Watercourses; The Patient Harvest; The Common Treasury; The Almanac; Learned Commissions; Working Estates; The Academy Quarter. |
| Mansa: religious markets | Salt Tithes; The Warehouses; Export Guilds; The Treaty Ports; Pilgrim Markets; The Tithe; First Rites; Merchant Princes; The Merchant Works. |
| Taizong: garrison court | Martial Law; The Standing Army; Patronage; The Imperial Examinations; Examinations of State; Provincial Patrons; The Civic Stage; The Court Archives; Reserve Officers. |
| Hypatia: great works | Working Estates; The Open Collegium; The Endowed Provinces; The Academy Quarter; The Inherited School; The Second Seat; Patronage; The Great Exhibition; Master Artificers. |
| Zheng He: maritime power | The Lighthouse Keepers; The Convoy; Venture Routes; The Harbour Chain; The Charter Fleet; The Admiralty of Trade; Marine Drill; Letters of Marque; Blockade Admirals. |

A rare such as The Sacred Host can be strong without being permanent: it uses one of Modu's chairs alongside the faith support and military cards needed to exploit it. Removing it ends faith purchase permission and its upkeep penalty; already purchased units remain.

## Balance and implementation review

1. **Check card-derived power against the baseline.** The goal remains strong 4X decisions enabled by the draft. A larger list alone will not make weak engines beat generic buildings. Tune passive science/culture and infrastructure separately after assessing complete card packages.
2. **Protect ordinary functionality.** Generic commons are optional aids, not permission to research, survive or expand. A bad hand must not strand a player without food, authority recovery or military production.
3. **Watch nine-card compounding.** Test food → growth → production, faith → troops → faith, and culture → drafts at nine occupied chairs. Do not restore hidden permanent rare-Order effects; the disclosed Charter access rule is the explicit exception. Scientific has one explicit Research through Construction exception: isolate its routed production from downstream conversions and exclude purchased/free/rebuilt completion loops. Separately price researched Charter effects and purchased Charter buildings alongside nine seated Orders. Commerce also needs tests for returned-route yield isolation, bilateral payments, completed-term post qualification, renewal continuity, interest caps and building-backed luxury availability.
4. **Make purchase rares safe.** Merchant Princes, Sacred Patronage, Consecrated Labor and The Sacred Host require explicit conversion prices based on current great-person, worker or military-unit costs and normal escalation. Do not expose an unpriced purchase action. Sacred Patronage's faith refund must remain below the full purchase cost after all discounts; free units/grants cannot produce a repeatable purchase-refund loop.
5. **No reslot exploits.** The Muses' Call now changes renown generation and active infrastructure benefits, with no instant person. Monumental Court checks existing wonders while active, leaving no permanent modifier. Ordinary upkeep changes affect the current ledger. Dominion explicitly has free-upkeep created units and a permanent purchase ban; preserve those user exceptions and review their combinations.
6. **Resolve timed collection behavior once.** Production completed while a cost/production card was active remains completed. Research and already awarded event income remain. Losing a discount does not reclaim savings; losing permission prohibits new purchases. A card modifying unit creation may leave a creation-time benefit, only where its text explicitly says so.
7. **Test rarity consistency.** Distinguish rarity probabilities from per-card weights. Do not let more uncommon cards dilute the promised rare chance, or let dual membership double a rare's chance. Record actual offered and chosen C/U/R shares by leader and stage.
8. **Test generic and cross-type share.** If generic commons are routinely best, weaken them or repair deck foundations. If cross-types make all leaders converge, lower cross hand frequency before inventing more eligibility rules.
9. **Draft useful alternatives.** Naval specialists still need land and administration options. Expansionist should offer tall and wide support. Devotion should function before conversion snowballs. Scientific needs productive cities, not only percentage science. Verify more than one viable opening per pair.
10. **Separate content capacity from implementation readiness.** Full-pool counts exceed 48 selected cards, but that does not establish balance, draw consistency or a complete effect schema. Current-user changes are recorded; card values, universal chairs, government forms, draw cadence and reform thresholds await review.

Before implementing, make an old-ID → new-card/retirement mapping, specify new effect primitives and conversion baselines, update office-dependent abilities, handle saved permanent doctrines and queued offers, and revise AI card/slot evaluation. The live documentation and data stay unchanged until that pass is authorized. Devotion proposes a limited follower-belief replacement through Council; it is not implemented and leaves the live belief system unchanged.

## Review notes for this expansion

See [Dominion review and standalone design notes](six-decks-dominion-review.md) for the non-destructive assessment of the user's deck, including early gold, growing-card timing, free-unit interactions, naval/garrison stacking, permanent decisions and the Opus bead gate. Dominion retains the user's design, with the approved 2026-09-16 changes recorded in its determination notes. Unapproved review nerfs have not been applied.

The current 37 bridge proposals (including Claude's seven additions) and 18 generic commons are preserved. Their strength and role still need a separate pass. Military Colonies remains available; its interaction with worker charges, population levies and shared production needs pricing. Provisioning, worked-land and research bridges also overlap the new pools; assess combined output and distinct roles. Bridges still naming retired buildings or premature prerequisites are unchanged proposals awaiting their own pass. See the Expansionist rework notes before treating the combined pool as balanced.
