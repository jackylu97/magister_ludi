# Brief for Astra — Expansionist and Scientific lines

**Design brief · revised 2026-09-16 · not implemented.** This revision develops the lines and their interactions before the next card-table rewrite. The eventual destination is the Expansionist and Scientific sections of `docs/six-decks-first-cut.md`. Leave the other four decks, cross-type table, generic pool, governments, live documentation and game data unchanged during that rewrite.

## Decisions for this revision

- **Remove Masteries.** No reward or permanent disqualification for completing an age before advancing, and no replacement age-completion checklist.
- **Charters activate on drafting.** Their wording is **“Once drafted, unlock X for research.”** They never need to be slotted or occupy a chair. Drafting unlocks access, not the completed technology or its benefits.
- **Great people are a central Scientific investment.** Recruitment, acts, worked improvements and retained legacies should support different combinations. Empire buildings help determine where that investment goes.
- **Research through construction is one optional card**, not a mandatory Scientific line or a redesign of the research system.
- **Lines overlap.** Woodland can support preservation; population can support provincial development; institutions can support either concentrated or distributed great works. These are authoring guides, not exclusive branches, new tags on every live ability, or an additional player selection.
- Numbers below are illustrative proposals. The Charter activation rule and removal above are user decisions; the other examples are candidates to develop and review.

## Why the current drafts are being redone

Too many cards repeat a template: one building provides a missing yield, then two buildings provide two yields. More rows have produced more bonus variety than decision variety. A complete deck needs ways to sustain a functioning empire; its signature building does not need to become the entire economy.

A useful line changes a settlement site, tile assignment, construction queue, research decision, worker action or great-person choice. Support cards then make that activity viable. Strong basic terrain bonuses can qualify: making rocky land habitable or preserving forest worthwhile changes what the player does.

## Rules for the eventual rewrite

1. **Write the loop first.** Each line needs an accessible starting point, support that speeds or sustains it, and a payoff. Its first interesting choice must work without a particular rare. Ordinary support should remain useful when a desired payoff never appears.
2. **Allow shared cards.** Give each card a primary line for organization and optional secondary links. Do not print parallel versions of one effect merely to fill every line. A whole deck supports multiple economies; each small combination need not solve every yield itself.
3. **Use plain opening support sparingly.** No mandatory six-card yield grid. Retain early faith by ages 1–2, useful food/production openings and routes to research and culture, using the deck's actual activities where possible.
4. **At most one accumulated-income card per deck.** “While active, gains +N per event forever” is one optional early foundation, not the default scaling pattern. Current land, population, retained legacies, maintained networks, finite windfalls and capped asset maturity provide other scales. A one-off growth payout is not another permanent counter.
5. **Rule changes across the ages.** Aim for at least two meaningful rule-changing cards per tier, counting overlapping lines once. They can change eligibility, access, placement incentives or existing actions. Do not invent a system solely to meet the quota.
6. **Real opportunity costs.** Include meaningful trade-off cards, roughly one per tier, but first use scarce citizens, land, charges, research time, great people and construction capacity. Arbitrary penalties are not a substitute for a choice.
7. **Roughly forty cards per deck:** about ten in tier 0, ten in tier 1, twelve in tier 2 and eight in tier 3. Charters count toward Scientific's catalogue even though they use no chairs. Treat counts as a budget, not a reason to pad.
8. **Respect timing.** Scaling investments start mainly in ages 1–2. Age 3 develops tall/wide administration and happiness. Great-person cards start with their actual access gate; buildings and units retain their technology requirements unless a card explicitly changes them.
9. **Keep existing reading conventions**, including worked tiles, creation stamps, base-yield conversions and non-recursive windfalls. Charter activation is an explicit exception to ordinary slot requirements. Name new mechanics in brackets; do not describe them as already implemented.
10. **Keep prose brief and concrete.** Each proposed effect should explain the resulting decision. Pricing and exhaustive implementation rules come after the design earns its place.

## Facts and scope

- Terrains: ocean, coast, lake, grassland, plains, desert, tundra, snow, mountain. Hills are a flag. Features: forest, jungle, oasis, floodplain. There is no marsh.
- Current strategic resources: horses, iron and niter. Copper and tin are bonus resources; ivory is a luxury. Camels and obsidian do not exist. Use the current roster for the first deck pass.
- Great-person works: Academy, Manufactory, Landmark, Customs House and Citadel. Holy Sites are separate. Existing works can open the resource beneath them, subject to its reveal requirement: this is a useful Scientific connection to strategics.
- Great people use the existing renown pool, family weighting and escalating call prices. They can be spent on their existing acts, works or legacies. A family-neutral bonus does not guarantee a scholar. Recruitment support must not require already having several great people.
- Empire buildings are **once per empire**, not world-unique wonders. Examples include Chart the Stars, Heroic Epic, Imperial Throne, Forum, Caravanserai, Bourse and Turning Heavens. Do not extend duplication to wonders or the Opus.
- Research follows the existing tree and selected research queue. New Charter nodes sit off the established lanes and are priced by their placement. Science is research progress, not a banked spending currency.
- Workers have charges. Chopping removes forest or jungle and pays a windfall. Planting, regrowth and changing underlying terrain require new support; mutable feature data alone does not make those actions implemented.
- Cities already have citizens, work radii, connections, citizen focus and construction queues. Population spending and migration in this brief require new commands; they remain explicitly identified proposals, not existing controls.
- The contest register supports first-in-age occasions, but first-to-research-a-specific-technology still needs its own event/key. Existing infrastructure is not a claim that every proposed trigger already exists.

---

## Expansionist — five overlapping lines

**Identity:** make land and population unusually useful. A player can preserve investments, consume them for tempo, or develop new territory. The same forest or citizen can serve different plans; the cards should make that choice matter.

### 1. The People — grow, spend, recover

**Loop:** feed a city → grow citizens → keep them working, levy them or move them → rebuild the population that supports the next investment.

**Different play:** an agricultural centre can finance a provincial economy or muster an army. Keeping citizens for valuable worked tiles remains a competing use. Tall and wide are both possible.

- **Start / Levy of the Land (U, tier 0):** Spend a citizen to gain production worth several turns of that city's food. [Population-payment command; payout basis must exclude its own windfalls.]
- **Sustain / Granary Levies and Patient Harvest:** retain growth windfalls and food retention as support. Keep Growing Annals as the deck's one optional accumulated-income card; no additional lifetime citizens-spent salary.
- **Alternative use / Muster of the Fields (U, tier 1):** Spend a citizen to muster the best melee unit the city can legally field. [Same population-payment system; retain technology, strategic-access and placement requirements.]
- **Alternative use / Great Migration (U, tier 1):** Once every ten turns, move one citizen between connected owned cities. [Migration command; migration is not natural growth.]
- **Network payoff / The Common Treasury (U, tier 2):** When a population levy grants production, a share also reaches your other connected cities. This distributes part of one payout; it does not trigger further levies or production-sharing events.
- **Late direction:** let a mature food economy support sustained construction or replenishment at empire scale. Prefer stronger uses for citizens and recovery over another “at ten population, gain every yield” row.

**Choice and fallback:** a citizen spent is a worked tile temporarily lost. Growth support still matters without a levy card. Always retain a minimum population; levies and migration must not refill the natural-growth rewards by repeatedly restoring lost citizens. Do not resolve that tension by introducing a second permanent history engine.

**Links:** Wild and Country sustain valuable citizens; Spade develops the land for their recovery. Common Treasury makes connections matter without requiring the Commerce deck. Muster links a food economy to Dominion.

### 2. The Woodland — plant, preserve or harvest

**Loop:** invest worker charges → establish woodland → let it mature → choose ongoing land value or immediate chopping proceeds → regenerate the next crop.

**Different play:** prepare production bursts around forest maturity, or maintain standing woodland as part of a stable economy. This line should not require chopping every eligible tile as soon as possible.

- **Open / Planted Forests (C, tier 0):** Workers may plant forest on eligible open ground for a charge. [New worker action and feature placement.]
- **Sustain / Old Growth (C, tier 1):** Forest standing for twenty turns gains additional food and production when worked and a larger chop payout. [Asset maturity; bounded benefit, not an uncapped turn counter.]
- **Harvest support / Charcoal Burners (C, tier 1):** Chops also pay faith and culture as a share of their production. This supports early faith without requiring a religious-building package.
- **Preservation support / The Woodland Edge (U, tier 1):** Worked improvements gain production beside unimproved forest; worked unimproved forests gain food beside farms. Count base adjacency, not the other bonus's output.
- **Cycle payoff / The Coppice (R, tier 2):** Chopping a mature forest you planted leaves young growth standing. It must mature again before another harvest and loses its mature bonuses meanwhile. [Regrowth state; no repeated immediate chopping.]
- **Burst payoff / The Woodwrights (R, tier 2 or 3):** substantially increase chop proceeds. This competes with leaving a valuable mature forest standing; it is an ordinary slotted rare.

**Choice and fallback:** natural forests support chopping and preservation before Planted Forests appears. Preserve current resource/chop restrictions. Maturity must be visible on the tile; repeated manual inspection is not the intended skill test.

**Links:** Woodland Edge rewards mixing Woodland, Wild and cultivated land. Chopping accelerates infrastructure for People or frontier towns for Spade. Old-growth food can sustain cities that improve little of their land.

### 3. The Wild — preserve productive space

**Loop:** claim varied land → assign citizens to unimproved tiles → preserve the terrain that sustains knowledge, faith and culture → selectively add works or improvements where they are worth the loss.

**Different play:** worker charges and citizen assignments acquire different priorities. Unimproved terrain is an intentional economic asset rather than unfinished development.

- **Start / The Naturalists (U, tier 0):** Cities gain science for distinct feature types they work. Features and base terrain are different lists; keep the count understandable.
- **Early faith / The Groves and the Stones (C, tier 0):** Worked unimproved forest grants faith, with a stronger benefit in a city holding a Shrine. The basic benefit works without the building.
- **Sustain / The Old Songs (C, tier 1):** Worked unimproved land grants culture.
- **Open / The High Pastures (U, tier 1):** Cities may work owned mountains within their normal work radius for production and faith. [Workability exception; does not make mountains passable or ordinarily improvable.]
- **Bridge payoff / The Hermitages (R, tier 2):** Great-person works qualify for your cards' unimproved-land bonuses and share part of their native yield with adjacent worked tiles. This changes card eligibility, not the actual improvement or its resource access.
- **Trade-off / The Old Ways (U or R, tier 2):** strengthen worked unimproved land substantially while reducing ordinary improvement bonuses. State whether Hermitages exempts great works from that penalty; the intended combination preserves their value.

**Choice and fallback:** preserving everything is not required. A mine on an essential strategic resource or a farm feeding mountain workers can be worth the lost wild yield. Strong preservation cards must supply enough material support to make their knowledge and faith usable.

**Links:** Woodland supplies forest; Country rewards unusual sites and varied terrain; Spade acquires land that can remain wild after a few strategic improvements. Hermitages connects to Scientific works and Magisterial patronage.

### 4. The Spade — develop the edge, extend the reach

**Loop:** choose a useful frontier → spend charges developing its edge → claim or irrigate new land → bring it into a working city's economy.

**Different play:** growth in territory responds to worker placement and irrigation layout as well as culture. Work radius and population still determine which claimed tiles can contribute.

- **Open / Claim by the Spade (U, tier 0):** Improving an unclaimed hex adjacent to your border claims it for the nearest eligible owned city. [Improvement outside ownership plus a claim; never steals another empire's hex.]
- **Sustain / worker support:** one useful charge or worker-production card lets players choose between claiming outward and improving inward. It should work before the frontier payoff arrives.
- **Reclamation (C, tier 1):** Clearing jungle leaves plains and provides food and production. [Underlying terrain changes need an explicit extension; preserve this as a proposal, not an existing chop effect.]
- **Layout support / The Watercourses (U, tier 1):** Farms directly beside a river irrigate adjacent farms. Only directly river-fed farms transmit water; the effect cannot propagate indefinitely. This affects farm irrigation, not river movement, city freshwater or unrelated river bonuses.
- **Open / Irrigation Works (U, tier 2):** Workers may establish an irrigation improvement supplying adjacent farms. [New improvement using the same agricultural-water reading; no river geometry change.]
- **Claim payoff / First Cultivation (U, tier 2):** A successful claim through improvement grants food and border growth to the receiving city. It rewards the act, not a permanent per-claimed-hex income counter; culture-claimed land remains useful.
- **Late direction:** stronger productive reach and useful provincial development, with authority relief tied to maintaining the resulting towns. Avoid removing ordinary work-radius and ownership constraints by implication.

**Links:** irrigated fields feed People; claims acquire resources for Country or Scientific; selected improved anchors can enclose a larger Wild economy. Woodland can fund the initial frontier investment.

### 5. The Country — specialize in the map, combine different provinces

**Loop:** inspect geography → choose settlement sites and worked land → specialize where the hand makes that land exceptional → combine complementary towns.

**Different play:** a hill town, a pastoral settlement and an irrigated centre contribute differently. A terrain specialization should be useful on its own, while broader cards let a mixed empire exploit several of them.

- **Start / geographic support:** retain useful ordinary farm, pasture, hill and coastal support. Geography should affect the opening before its rare appears.
- **Specializations (U, tier 1):** Highlands makes mines support learning; Steppe improves pastures and mounted production; Floodplains strengthens eligible farms; Coast makes fishing boats support culture. These are alternatives, not four required pieces.
- **Open / The Land Shapes Us (R, tier 1):** Cities receive different benefits from their founding geography: hills support defence/production, rivers food/gold, coasts trade capacity, deserts faith, tundra culture, forests science. [Define a short deterministic combination rule for overlapping conditions before card-table delivery; do not silently award all six or add a trait-selection screen.]
- **Mixed payoff / The Varied Country (U, tier 2):** reward working several different terrain and feature types with a substantial city benefit. A useful alternative to specializing every tile, not a mandatory condition for the biome cards.
- **Late payoff / The Complementary Provinces (U or R, tier 3):** connected cities gain material support from the distinct founding-geography traits represented in the network. Count each trait once so that adding a new kind of province has a purpose beyond founding another identical town.

**Choice and fallback:** retain River Kings and Highland Holds as possible trade-offs. A narrowly specialized town can coexist with a mixed capital. Plain land development and population support keep the deck playable when a preferred biome is absent.

### Expansionist combinations to test

| Combination | What the player actually does | What remains contested |
|---|---|---|
| People + Spade | Irrigate agricultural centres, levy citizens to develop newly claimed land and recover on better farms. | Citizens working valuable land versus immediate construction; charges inside versus outside the border. |
| Woodland + Wild | Plant and preserve forest mosaics; harvest selected stands to fund essential infrastructure. | Immediate chop payout versus mature yields and neighbours' adjacency benefits. |
| Wild + Country | Feed mountain workers from selected fertile tiles; preserve varied terrain for knowledge and faith. | Specialized improvements versus productive unimproved land; finite citizen assignments. |
| People + Country | Use fertile towns to support resource provinces through migration and connected levy proceeds. | Growing the centre larger versus improving the empire's distribution of citizens. |
| Woodland + Spade | Use existing forests to establish frontier towns and plant future stands as the border advances. | Spending finite early forests versus investing charges and waiting for renewal. |

Retain compatible support from the old draft selectively: Granary Levies, Growing Annals, Patient Harvest, River Kings, Highland Holds, Grain Dole, Local Census, Founders' Road and useful defence/administration. Do not preserve every named row if it duplicates these loops. Age 3 must still support both tall and wide development.

---

## Scientific — five overlapping lines

**Identity:** research opens unusual possibilities; great people and institutions turn those possibilities into a capable empire. Research time, construction, scarce great people and citizen assignments are the main investments. Early foundations should ripen into material, cultural and administrative power, with limited direct research amplification.

### 1. The Charters — permanent keys, optional research detours

**Loop:** choose a Charter in a draft → gain permanent access to a private technology → decide when its opportunity is worth the research detour → use the resulting capability with other investments.

**Charter lifecycle — user ruling:** print **“Once drafted, unlock X for research.”** Selected means taken from the offer, not merely shown. Access persists for that empire for the rest of the game, including through saves and government changes. A Charter cannot be slotted, requires no entry seal and consumes no chair. It still consumes the draft choice. The normal research prerequisites and cost remain; completing the technology grants its listed effects permanently through the technology. No ordinary slotted-card benefits are hidden on a Charter.

Other empires can research that technology if they also draft its Charter. The first drafter does not monopolize it. “Private” means access-controlled, not world-unique. The tree should identify the required Charter and show whether it has been drafted; ordinary policy cards still require a chair.

| Charter wording | Research age | Proposed technology payoff | Connections |
|---|---|---|---|
| Glassmakers' Charter: Once drafted, unlock Optics for research. | 2 | Scouts and ships gain sight; Observatories become constructible earlier than their normal age-4 access. | Exploration, coastal reach and institutional sites. |
| Metallurgists' Charter: Once drafted, unlock Alloys for research. | 3 | Strategic mines gain production; qualifying resource-dependent units are trained with additional health. | Strategics, manufacturing and defence. |
| Naturalists' Charter: Once drafted, unlock Taxonomy for research. | 3 | Worked feature diversity supports culture and faith, with a modest science component if needed. | Expansionist Wild; a broad economy instead of another large research multiplier. |
| Mechanists' Charter: Once drafted, unlock Mechanics for research. | 4 | Workshops and Manufactories gain production; worked Manufactories support adjacent worked tiles. | Great works, institutions and construction. |
| Alchemists' Charter: Once drafted, unlock Chemistry for research. | 4 | Niter mines gain production; an existing late military unlock becomes available earlier. | Strategics and timely deployment; verify the live unit/technology before naming it in the final row. |

Charters are uncommon or rare, offered in age-appropriate bands. Earlier investment effects belong early enough to develop. Add useful ordinary support for exploiting a researched Charter's subject, not a “collect three Charters” salary. Practical Arts below can help price a detour through actions already taken.

**Choice and fallback:** research a private node or advance along the ordinary tree. Every other Scientific line must work without a specific Charter. Its permanent effect must be priced against the lost draft choice and research time, not an ongoing chair cost it does not have.

### 2. The Strategics — discover, secure, put resources to work

**Loop:** find resources → secure and open them → use the same sites for economic infrastructure or military capability → develop institutions that exploit that geography.

**Different play:** settlement, resource access and production determine what the scientific empire can field. Great works over deposits offer an existing alternative to ordinary improvements, creating a placement decision.

- **Start / Field Notebooks and Natural Philosophy:** exploration pays useful early windfalls for genuinely new discoveries or first-seen categories; no repeat reveal income. Use existing scouts and workers.
- **Support / The Assay (U, tier 1):** gain modest science and material support from distinct accessible strategic types. This is current resource access, not a lifetime discovery counter.
- **Economic alternative / Stockpiles (C or U, tier 1):** additional accessible copies of a strategic provide gold or production. Define surplus against the live access/requirements model; do not invent a consumable inventory or subtract arbitrary per-unit resource quantities.
- **Military expression / Husbandry Studies (U, tier 2):** trained horse-dependent units gain movement. [New movement creation stamp beside existing unit bonuses; use horses, not a new camel unit.]
- **Bridge / Applied Metallurgy:** resource-dependent military construction in an institutional city gains production support. A worked Academy or Manufactory over a deposit retains normal access and can support the economic route instead.
- **Late payoff:** reinforce the practical value of the deposits and works held—construction, replenishment and useful units. Avoid another broad science percentage plus offensive strength for an empire already benefiting from superior technologies.

**Links:** Alloys/Chemistry reward some of the same sites; a work over ore connects to Great People; distributed institutions can serve several resource provinces. Expansionist Spade/Country can supply the land.

### 3. The Institutions — choose centres, establish provinces

**Loop:** choose where to construct a once-per-empire institution → support it with citizens and useful works → develop that centre or establish another with a different institution → optionally duplicate a chosen institution later.

**Different play:** cities have different institutional roles. Concentrating assets and spreading capability are both supported; neither requires a world wonder.

- **Start / Learned Commissions (C or U, tier 1):** Library cities construct empire buildings faster. It helps establish the first institution without requiring an existing collection.
- **Support / The Royal Society (U, tier 2):** held empire buildings provide renown and useful city production or happiness. Keep direct science modest; their role is to sustain the people and activity around them.
- **Provincial support / The Learned Chancery (C, tier 2):** an institutional city costs less authority and develops borders faster.
- **Concentration payoff / The Academy Quarter (U, tier 2):** an institutional city gains a substantial practical benefit for each different great-person work type it works. Pay once per city/type, not once for every institution stacked there. Citizens must actually work the improvements.
- **Open / The Second Seat (R, tier 3):** construct one additional copy of one empire building in a city with a University. The player chooses by queueing that second copy through ordinary construction; reserve the single extra allowance while queued. [Once-per-empire exception; no new selection screen.]
- **Mature support / Enduring Institutions:** established institutions gain cultural or material value over time, using the capped maturity approach in line 5.

**Choice and fallback:** several cities with one institution can thrive without an Academy Quarter collection. Duplicating an institution must review its individual effects: local benefits follow the second building, while world claims, one-time grants and empire-wide effects require explicit eligibility/stacking rules. Do not silently double every effect or extend the exception to wonders/Opus.

**Links:** institutions support recruitment and give works attractive destinations. Strategics can determine their location. Construction competes with research-detour exploitation and military deployment.

### 4. The Great People — recruit, choose a use, compose the empire

**Loop:** earn renown → choose among available people → spend a person on an act, work or legacy → develop that choice through other cards. The person is the scarce investment; the deck must support reaching the first one.

**Different play:** concentrated works, distributed works and a mix of legacies with works produce different landscapes and use the same recruitment support. Scholar and engineer support should coexist with useful routes for other families.

- **Start / Open Collegium (C or U, tier 1):** scientific infrastructure provides a modest renown foundation before a player owns works or institutions. Later institutional support expands it without guaranteeing a named person or family.
- **Works support / Working Estates (C or U, tier 1):** worked great-person improvements provide food or other material support for the citizens assigned to them. Academies and Manufactories are central, but other families should have useful roles.
- **Distributed payoff / The Endowed Provinces (U, tier 2):** each city working at least one great-person improvement gains substantial food and production, once per city. Additional works do not multiply this subsidy.
- **Concentrated alternative / The Academy Quarter:** reuse the Institutions card. Different work types in one institutional city compete with spreading the same people among provinces.
- **Legacy bridge / The Inherited School (U or R, tier 2):** worked Academies and Manufactories gain practical output for distinct great-person legacy families currently retained. This reads current legacies rather than adding another permanent event counter. More people spent on legacies means fewer available to establish works.
- **Act alternative / Discoveries through Great People (U or R, tier 2):** a valid great-person expenditure also advances the selected research by a portion of its cost. Acts, works and legacies qualify once per person; dismissal or death does not. This is research progress, not spendable science. Keep it a supporting payoff, not a prerequisite for the whole deck or a renown refund loop.
- **Late payoff / The Society of Artificers:** established works and their supporting institutions help finish major construction. Reward material capability; do not bypass the existing victory requirements.

**Choice and fallback:** Endowed Provinces works with any first work. Academy Quarter rewards a collection without making it necessary. Inherited School makes retained legacies useful alongside works without requiring every family. Act-based research leaves a useful way to spend a person when there is no good work site.

**Links:** institutional renown funds people; work placement can open strategic deposits; mature works gain value through Continuity. Expansionist Hermitages and Magisterial patronage offer natural cross-deck combinations.

### 5. Continuity — let useful investments mature

**Loop:** establish a building or work early → keep it useful and held → receive a bounded maturity benefit → invest the resulting resources in later institutions or people.

**Different play:** preserve an established centre while deciding where the next investment belongs. Maturity supports the other lines; it must not make every late-founded town or newly placed work a bad investment.

- **Early foundation / The Long Study (C or U, tier 0):** a Library gains culture and a small amount of renown after standing for a defined period. Early research infrastructure ripens into patronage rather than solely accelerating research again.
- **Work maturity / The Old Academy (U, tier 1):** an Academy gains food and production as it matures, up to a small number of clearly displayed stages. It remains useful immediately when placed.
- **Institution maturity / Enduring Institutions (U, tier 2):** mature empire buildings support additional happiness or construction in their cities. This helps sustain developed provinces.
- **Research competition / The Patent Rolls (U, tier 2):** being the first empire to complete a technology grants culture and renown. A contested optional payoff; it cannot be the only recruitment or culture support available to a trailing player.
- **Late payoff / The Long Inheritance (R, tier 3):** cities working mature great-person improvements gain substantial major-construction support, with an additional benefit for a mature empire building. New works and institutions still receive their normal immediate benefits.

**Maturity convention:** use capped elapsed-turn stages, not further rewards for advancing research ages. Asset age is a world fact from construction/placement; a later-drafted active card may recognize it. Card removal stops the bonus, but does not make a building young again. Capture does not rebuild an asset; destroying/replacing it resets its age. These readings need explicit timestamps; they are not extra accumulated-income cards. Replace the former permanently incrementing Generations of Scholars with Inherited School's current-legacy interaction.

**Choice and fallback:** waiting occupies real investment and delays new projects. Keep strong immediate uses for newly built assets. Avoid a catalogue where drawing a maturity card late makes it worthless or where early science yields automatically multiply into an uncatchable lead.

### Two supporting cards, not additional lines

- **The Practical Arts (R, tier 1):** technologies matching activities you already practise cost less. Examples: Sailing for a coastal empire, The Wheel with horse access, Irrigation when working floodplains, Alloys with iron access. [A short authored set of live-tech conditions; no new quest tracker or arbitrary count of technologies. Review offer timing so that the card has useful future applications when drafted.]
- **Research through Construction (U or R, tier 1):** while active, recurring city science contributes to production instead; completing an ordinary building grants research proportional to its construction cost. One optional conversion card supporting development and institutions. [Recurring-science routing plus construction-triggered research; projects, repeat replacements and free grants must not form a loop. Define purchase treatment in the eventual row. No science bank or new action.]

The Research Annals may remain the deck's one early accumulated-income card. Do not add permanent per-scholar or per-private-technology salary counters beside it. Keep selected existing support such as Celestial Rites for early faith, Field Notebooks, Apprentice Engineers, Public Academy, Engineering Colleges and Master Artificers only where it helps one of these decisions.

### Scientific combinations to test

| Combination | What the player actually does | What remains contested |
|---|---|---|
| Institutions + concentrated works | Build an institutional centre and assign citizens to several different work types around it. | Spending people on those works versus useful acts or legacies; finite tile assignments. |
| Institutions + Endowed Provinces | Put one useful work in each of several towns, then develop different institutions or a permitted second copy. | Spreading the people versus maximizing one exceptional centre. |
| Works + Inherited School | Establish productive Academies/Manufactories and retain a varied legacy portfolio to support them. | Each person can supply one of those investments, not both. |
| Strategics + works | Place an Academy or Manufactory over a revealed deposit and develop a capable resource province. | Placement for access versus adjacency, institutional reach or another city's needs. |
| Charters + Strategics | Research Alloys or Chemistry to exploit resources already secured, then construct the resulting capability. | Private detour versus ordinary research; troop production versus economic construction. |
| Continuity + provinces | Keep established sites productive while new provinces receive immediate Endowed Provinces support. | Protecting old investments versus extending the empire; maturity versus immediate value. |
| Construction card + Institutions | Use normal construction queues to advance research and develop national centres. | Research slows when useful ordinary construction runs out or military production takes priority. |

## Flexibility without another deck-management system

- Offer cards through the existing leader pools. Line labels organize this document only; no line must be selected, unlocked or completed by the player.
- Commons and uncommons should start different activities; rares intensify them. A useful mixed hand must not depend on collecting an exact three-card sequence.
- Prefer one shared support card to near-identical copies in several lines. Show its secondary connections in the table notes.
- Keep strategic and geographic fallback routes: not every map provides every resource, not every player wins a research race, and not every great-person offer contains the desired family.
- Cross-deck examples: Wild + Endowed Provinces develops scattered hermitages; People + Academy Quarter feeds citizens working an institutional district; Woodland + Institutions trades a harvest for an important construction window. These examples do not require adding cross-type card rows now.
- Before expanding to forty cards, sketch three credible four-chair combinations per deck. For each name a settlement, assignment, construction or research decision it changes; a missing-card substitute; and a viable response to disruption. List drafted Charters separately from seated cards.

## Systems this proposal assumes

| Scope | Mechanic | Status / boundary |
|---|---|---|
| Core Charter proposal | Permanent on-draft research access and exclusive-access technology nodes | User-directed activation rule. New unlock persistence/tree support; ordinary research costs and prerequisites still apply. |
| Expansionist proposal | Population levies and connected migration | New commands from the original brief. No new unit class; explicit population floor and ordinary unit eligibility. |
| Expansionist proposal | Planting, maturity and Coppice regrowth | New worker/feature lifecycle. Repeated immediate harvesting is not the loop. |
| Expansionist proposal | Improvement-led claims, mountain work, irrigation and jungle reclamation | Extensions to ownership/workability/water readings; planting and underlying terrain changes also need rendering support. These are not already implemented because a tile has a feature field. |
| Scientific proposal | Additional empire building | A limited construction exception, with a review of each eligible building's local, empire and one-time effects. |
| Shared supporting work | Asset maturity, current-legacy links, adjacency and new windfall riders | Extensions around existing investments; avoid another bank, currency, unit type or player-facing progression system. |
| Optional single card | Research through construction | Research routing and completion effects using normal queues. |
| Parked broader redesign | Promote copper/tin; add obsidian/camels and new unit requirements; make ivory a military requirement | Preserved from the original brief as a separate resource/roster proposal. Not required for either deck and not part of this rewrite. |

## What the next card-table pass should deliver

Rewrite only the two decks' four tier tables in `six-decks-first-cut.md`, with a primary-line column and brief secondary links where useful. Use this brief's loops, starting points, alternatives and payoffs; do not mechanically copy every candidate into a forty-card quota. Clearly mark Charters **on draft / no chair**, and keep them separate from four-chair example builds. Retain the existing playstyle-goal sections until specifically asked to reconcile them. Include concise new-mechanic notes and carry forward the systems boundary above. Other decks, cross-type/generic tables, government rules and all live game files remain outside that pass.
