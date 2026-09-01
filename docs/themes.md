# The Themes — reconciliation ledger

The game's content answers to four unrelated tag vocabularies (see `docs/codex.md`). This
doc is the reconciliation: the gameplay themes derived from what the cards actually do,
now with the user's direction notes (2026-08-31) fleshed into proposals. Each entry: the
fantasy, the loop, where it lives today, the ruled direction, and proposed content. The
`tags:` line maps today's internal vocabulary onto the theme so the merge can be
mechanical later. Proposals are candidates, not commitments.

---

## 1. The Imperium
Soldiers are an economy, not an expense. Units pay yields by being built (faith per unit),
by dying (production + gold to the widow, culture in verse), and by killing (culture,
faith, healing). The loop: **cheap, expendable units in → events out.** The completest
engine in the pool and entirely undiscoverable today.
- Lives in: Orders (Conscription, The Widow's Levy, Rites of Passage), Doctrines (The Iron
  Price, The Standing Army), beliefs (God of the Forge, Rites of Blood), a tech (Epic
  Poetry), beads (The Conqueror, The Strongest Arm).
- State: **complete but hidden** — no wonder, no great-person hook, no named identity.
- tags: forge · war · domination
- **Wins by:** the sword as tempo — The Fallen Palace (first capital taken), The Strongest Arm and The Most Cities at age-close, The Muster of the Realm; late, captured ground funds any pillar of the Opus.
- Direction (user): cheap units over strong ones; units cheaper but weaker; free units on
  a rhythm; melee and cheap ranged over cavalry (cavalry is the Steppes', below).
- Proposed:
  - **The Horde Levy** (Order): units −30% production cost and −2 strength — the trade
    stated on one card. Deepening restores the strength, not the discount.
  - The Standing Levy already musters free melee every 10 turns; its deepened faces
    shorten the rhythm — the "free units every X turns" scaling engine.
  - **The Terracotta Army** becomes the theme's trophy wonder: on completion, a free copy
    of your cheapest melee unit in every city with a Barracks.
  - General hook: a legacy that scales with *units lost this game* — the widow's general.
  - The flip (Æra III, with Imperium the government): **the fallen return** — when a unit
    of yours dies, a militia musters free in the nearest city every Nth loss.
  - Deliberate rule: a *disbanded* unit triggers no death riders — only the enemy's blow
    pays, or the engine is a mint.

## 2. The Wild Frontier
The steppe as a harvest: camps found, camps cleared, barbarians killed or tamed — each
pays. Wolf-Mother's Pact flips the whole rule (barbarians join you).
- Lives in: Orders (Camp Followers, Spoils of the Wild, Border Ballads), one Doctrine
  (Wolf-Mother's Pact), beliefs (Lady of the Hunt).
- State: **ruled early-only, Æra I–II, by design** (user). It needs no late act of its
  own: its heir is **The Steppes** (15), and Wolf-Mother's tamed horde is the bridge —
  the player who rode the wild in age II arrives at age III already horsed.
- tags: hunt · wild
- **Wins by:** nothing of its own, by ruling — it is the tempo feeder: camp bounties buy the age-II bead lead its heirs (1, 15) convert.

## 3. The Faith Engine
Faith-per-turn as the master resource, converted into everything else: culture (The Great
Litany, Lamplighters), gold (The Tithe), science (Divine Inspiration, The Curia),
happiness (Pilgrim Roads). The loop: stack 🕯/turn → route it through converters → spend
the rest on augurs and rites.
- Lives in: Orders/Doctrines (the whole procession line), governments (Theocracy, The
  Curia), enhancers (Reliquaries), beads (The Hierophant, The Tithe).
- State: **complete early, aimless late** — over-supplied with converters, under-supplied
  with destinations.
- tags: procession · stone(part) · sun(part)
- **Wins by:** the Opus faith pillar as its stated destination; The Cathedral of the Age and The Hierophant on the way.
- Direction (user): a late-game payoff that ties directly into win conditions; buy units
  with faith; buy great people with faith; faith-only buildings; more late faith units;
  faith × science as a thematic pairing.
- Proposed:
  - **Great people with faith**: Divine Mandate's signature (the tier-18 government has no
    text yet) — call a great person for faith at a per-renown rate. The Commonwealth
    already does this for gold at tier 45; faith gets there two eras earlier.
  - **Units with faith**: Holy Order (enhancer) already promises warrior monks called with
    faith — build it, and add an Æra IV roster row or two behind it (the theme's late
    units). The augur/prophet purchase lane is the mechanism, already built.
  - **Faith-only building**: The Gilded Hall's mirror — **The Reliquary**, purchasable
    only with faith, pays renown and happiness. `purchaseOnly` + a faith bank both exist.
  - **The win tie-in**: the v0 **Magnum Opus** (end of Æra IV, the golden-bead
    destination) takes *pillars* — hammers, gold, faith, culture — and each theme funds
    its own pillar. Faith's late destination is then literally the win condition, and the
    same move answers the Mission and the Caravans below.
  - **Faith × science**: The Curia already converts (faith buildings supply science);
    add an Æra IV tech effect — *the observatory cloister* — where temples supply science
    per adjacent science building, so the pairing is spatial and visible.

## 4. The Mission
Faith pointed *outward*: convert foreign cities and be paid per foreign follower
(Apostles, World Church, Congregation, The Long Prayer, Pilgrims' Coin). Distinct from
the Faith Engine: that one banks faith, this one exports it.
- Lives in: enhancer beliefs almost entirely, plus beads (The Apostle, The Widest Faith)
  and two edge Doctrines (Religious Mandate, Sanctuary).
- State: **one-channel** — no Orders, no wonder-identity beyond Hagia Sophia, no
  great-person hook past the prophet.
- tags: road(part) · the enhancer pool
- **Wins by:** conversion as conquest — The Widest Faith at every age-close, The Ecumenical Council as the majority race; the Opus premium on foreign followers makes the world itself the engine.
- Direction (user): converting other civs needs a late payoff and a direct win-condition
  tie-in.
- Proposed:
  - **The Ecumenical Council** (Æra IV endeavour): first faith followed by a majority of
    the world's citizens — a bead and a lasting boon. The Mission's race.
  - **Theocratic Mandate** (the deferred enhancer) gets its shape: foreign empires whose
    majority faith is yours pay you a tithe — a share of their per-turn faith. The bot
    can now be converted, which finally makes this testable.
  - The Magnum Opus tie-in: foreign followers count toward the faith pillar at a premium
    — converting the world *is* funding the Opus.
  - Give it its first Orders (it has none): a slot card per age — press harder, reach
    further, be paid more per foreign town.

## 5. The Caravan State
Roads and routes as the empire's veins: gold per route, routes pay more, routes carry
extra cargo (faith both ways, a beaker each). The loop: connect everything → per-route
payoffs → gold buys what hammers can't.
- Lives in: Orders (Silk Roads, Ledger-Keepers), Doctrines (The Sea Charter), a
  government (Merchant League), techs (The Imperial Post, The Knotted Cord), enhancers
  (The Long Road, Sacred Cartography — the best crossover cards in the game), beads (The
  Grand Caravan, The Richest Roads).
- State: **complete and currently degenerate** — needs a trigger and a trim, not adders.
- tags: caravan · road(part) · economic
- **Wins by:** The Richest Roads and The Grand Caravan mid-game; late, gold is the fungible pillar — the Caravan State part-buys the Opus, which is exactly its fantasy.
- Direction (user): gold today is an accelerant for infrastructure and war, strongest
  early; wants creative late uses. The most powerful things (Orders, Doctrines, wonders)
  are rightly not for sale — the interesting lane is **powerful buildings that can only
  be bought, never built**.
- Proposed:
  - **The purchase-only line** (the Gilded Hall's siblings, one per age): buildings that
    *convert* gold per turn rather than add it — the Counting House (gold→science), the
    Bourse (gold→culture) — so late gold becomes a rate you route, not a pile. This is
    the Faith Engine's converter play, mirrored, and it makes the two economies rhyme.
  - **A trigger at last**: when a caravan completes a full circuit (route runs its
    length), a windfall — the theme's chronicle drum.
  - **Mercenaries** (ties the Imperium): an Æra III unlock — units purchasable in *any*
    city at a premium rate, not just where the barracks stands.
  - When diplomacy lands, gold's endgame is influence: deals, tributes, war chests. The
    Opus's gold pillar covers the win tie-in meanwhile.

## 6. The Luxury Table
Luxuries as a collection game: gold and happiness per unique kind, per copy, per improved
resource (Salt Tithes, Sumptuary Laws, Village Fairs, Provincial Mints, The Grand
Bazaar). The natural **wide-play happiness engine** — it already half-exists.
- Lives in: Orders/Doctrines (caravan line's other half), beliefs (Lord of the Hoard,
  Pilgrimage), a wonder (Temple of Artemis's shape).
- State: **half-built** — capped by map scarcity by design; the duplicate-copies rule is
  the lever to extend it.
- tags: caravan(part) · green(part)
- **Wins by:** no race of its own — it is the wide player's ceiling-lifter, and its reckoning is contentment (see 17).

## 7. The Land Rush
Ground itself as the payoff: cheaper hexes, faster borders, cheaper settlers, cities born
grown, and authority capacity as the wide-play fuel (Hegemony, Client Kings, Provincial
Governors). The loop: authority + border culture → more ground → more of everything.
- Lives in: Orders (mostly the untagged cluster), Doctrines, a tech (Colonial Charters),
  beads (The Founder, The Twelve, The Most Cities, The Surveyor).
- State: **rich but anonymous** — the biggest untagged cluster; The Charter posture's
  spine. See **16 (Expansionists)**: proposal is that 16 *is* this theme's Æra III+ act,
  folded here rather than kept separate.
- tags: none(most) · charter · green(part)
- **Wins by:** the count races — The Founder, The Twelve, The Most Cities at every age-close; late, the overseas colony endeavour (see 16's notes) and sheer pillar throughput from many towns.

## 8. The Tall Hearth
Population as the multiplier: food kept on growth, per-citizen yields, thresholds for big
cities, and the guilds turning surplus citizens into specialists. The loop: food →
citizens → per-head yields → science and culture compound.
- Lives in: everywhere — Orders, Doctrines, governments (Republic, The Estates), follower
  beliefs, guilds, beads (The Metropolis, The Greatest City, The Census of the World).
- State: **complete** — and the beads' current bias toward it is the endeavour problem.
- tags: green · hearth · ploughshare
- **Wins by:** the size races — The Metropolis, The Greatest City, The Census of the World; late, specialists and the Great Levy turn population directly into whichever pillar the build needs.
- Direction (user): late game converts population into further yields; possibly a
  late-game **population-spending** mechanic as the payoff for having grown early.
- Proposed:
  - The guilds are already the passive half; add the active half — **consuming a
    specialist for a lump** (an artist's masterwork: renown + culture windfall; a
    scholar's treatise: a research windfall). Population spent, legacy kept — the
    settler's precedent generalized upward.
  - **The Great Levy** (project, Æra IV): −1 population → a large hammer conversion. A
    project row is the exact right shape (repeatable, rate-limited, modifier-immune).
  - Food's late converter: a building where surplus food pays science (the physicians'
    college) — tall's answer to the Curia.

## 9. The Court of Great People
Renown as a currency and legacies as a collection.
- Lives in: The Laureate, The Renaissance Court, The Commonwealth, governments (t45
  pair), beads (The Dynasty, The Most Called, the First-X feats).
- State: **system built, deck thin** — one court Order exists; the family tags should
  dissolve into the other themes (each family serves 2–3 themes as their face cards).
- tags: court · the GP family vocabulary
- **Wins by:** The Most Called and The Dynasty; a legacy-count standing race (The Legacy) is its natural signature — the court wins by *who* it kept, not what it built.

## 10. The Observatory
Science tempo as identity: payoffs per technology completed, per age reached, age-lead as
a weapon. The per-age/per-tech scaling shape is its real identity and barely used.
- Lives in: Orders (star line), The Encyclopaedia, beads (The Deepest Learning), wonders
  (Great Library, House of Wisdom).
- State: **thin as a theme** — mostly flat science adders today.
- tags: star · sky(part) · science
- **Wins by:** tempo itself — First Into the Age every era, The Deepest Learning at age-close, The Scholar's Wager; the curtain-closer: finishing the chart is this theme's Opus.

## 11. The Cartographers
The unknown as a resource: ruins pay, revealed hexes pay, sight and movement stack.
- Lives in: Orders (wayfarers), Doctrines (Master of Maps, Athenaeum), beliefs (Keeper of
  the Calendar), the explorer units.
- State: the weakest theme (user) — discoveries are spent by age 2 and nothing renews the
  question the theme asks.
- tags: wayfarers · road(part)
- **Wins by:** the completed chart — circumnavigation, a discovery-count feat per layer (ruins, sea, veins); it wins early beads cheap and sells the map to whoever is winning late.
- Direction (user): the map should keep secrets in later layers — veins were mentioned;
  critical points on the map with strong bonuses; a reason to explore after the chart is
  drawn.
- Proposed — **the map keeps secrets in layers**, each layer legal under the "mapgen runs
  once" rule because everything is placed at generation and only *revealed* later:
  - **Ocean discoveries** (Æra III–IV): ruins' siblings placed on deep ocean at mapgen —
    derelicts, drowned temples — unreachable until Ocean-Going. The theme's second act
    arrives with the sea for zero new mechanism: `Tile.discovery` already does all of it.
  - **Veins** (Æra III): rich deposits placed under hills at mapgen, invisible until
    *prospected* — a worker/explorer verb from a Prospecting tech. The reveal-tech
    machinery (`RevealView`, `resourceIsVisibleTo`) already knows how to hide a resource
    per seat; this adds "revealed by an act" beside "revealed by a tech".
  - **Named places** (critical points): a handful of mapgen-marked hexes — the High Pass,
    the Confluence — that pay an empire-wide bonus to whoever holds or works them. The
    Steppes and the Imperium suddenly care where the Cartographer's chart says to fight.
  - **Circumnavigation** (feat) and sea charts sold for gold (ties the Caravans) round
    out the late identity: the information economy.

## 12. The Stoneworks
Hammers and monuments as the identity: payoffs per building completed, per building
standing, wonder-holding as an engine, windfalls doubled. **Production and wonders as a
theme** (user — affirmed as its own line, split out of forge).
- Lives in: Orders (Master Masons, Quarrymen's Guild, Statute Labour), beliefs (Guild of
  the Faithful, The Standing Stones), beads (the building endeavours, The Most Marvels,
  The Builder), all 27 wonders as its trophies.
- tags: forge(part) · stone · culture(beads)
- **Wins by:** The Most Marvels, The Builder, The Exposition — and the Opus is itself a build, so the Stoneworks is the one theme whose win condition is literally its loop.

## 13. The Waters
Coast and river as a siting bet; the naval line defends the investment.
- Lives in: Doctrines (Thalassocracy, Mare Nostrum), beliefs (water axis), techs (The
  Floating Fields), the naval roster.
- State: **payoffs without verbs** — blockade exists; plunder, sea ruins (see 11) and
  strait control are the missing acts.
- tags: water · caravan(part) · frost/sun
- **Wins by:** the sea lanes at age-close (a Richest Roads sibling for sea routes), the overseas colony, and denial — a blockade is how this theme takes beads *away*.

## 14. The Old Ways (Nature)
**User's proposal, fleshed out.** The unimproved world as a source: a counterpoint to
industrialization that leans faith (spirits, druids, shamans) or culture (the wild as
inspiration). The loop: *keep* ground wild → the wild pays → chopping and ploughing are
real costs, not just foregone bonuses.
- Already latent: Spirits of the Wood (+1🎵 on forest hexes), Winter Mother, the chop
  windfall as the thing this theme refuses.
- Proposed:
  - **The Sacred Grove**: an augur-planted work that must stand on unimproved wooded
    ground — faith + culture, more per adjacent unimproved hex. The great-work machinery
    (`anywhere`, family improvements) already carries it.
  - **The Old Ways** (Order): +1🕯 and +1🎵 on every *worked, unimproved* forest, jungle
    or marsh — the citizen who walks into the wood instead of clearing it.
  - **The Green Covenant** (Doctrine): cities keeping ≥N unimproved hexes in their bounds
    gain happiness and border culture; a chop anywhere breaks the covenant for 10 turns.
    A real, felt tension against The Woodwrights — the first *mutually exclusive
    lifestyle* pair in the pool.
  - Trophy wonder: **The Grove of Ancestors** (requiresSite: forest), paying per
    unimproved wooded hex the city works.
  - Cross-play: Faith Engine (the druid lean), Tall Hearth (culture lean), Cartographers
    (wilderness is where the secrets are), and *deliberate* anti-synergy with the
    Stoneworks — the argument the theme exists to have.
- **Wins by:** the quiet races — a contentment reckoning, the Grove as a wonder bead, and an unimproved-ground standing count; it wins by refusing the Stoneworks' race, visibly.

## 15. The Steppes
**User's proposal, fleshed out.** Wide play that synergizes with war: the horse empire.
Many cities lightly held, cavalry and ranged cavalry covering the sprawl, science and
culture from *motion and law* rather than buildings and population.
- Already latent: Horse Lords, Hegemony (+authority per city), Manifest of the Steppe,
  Wolf-Mother's horde as the age-II on-ramp (see 2).
- Proposed (the user's four notes, made concrete):
  - **The Ordu** (Order): every X turns, a free mounted unit for each 3 cities — units
    from city *count*, the wide-military engine stated plainly.
  - **Client Kings / Hegemony** already relieve authority; the Steppes' government-lane
    doubles down: captured and founded cities alike cost less while your cavalry
    outnumber your towns.
  - **The Yam** (tech effect or Order): science and culture per *pair of connected
    cities* — the post-rider network as the steppe's library. Alternate yield source,
    exactly as asked, and it marries the Caravan State.
  - **The Kurgan** (improvement): the steppe's monument — culture + faith on plains and
    grassland, more beside pastures. Culture without buildings.
  - Cross-play: the Imperium (armies), the Caravans (the silk road runs through the
    steppe), the Wild Frontier (its heir), Expansionists/Land Rush (the peaceful twin).
- **Wins by:** the sprawl double — The Most Cities *and* The Strongest Arm at once, which no other theme can hold together; the horde is both its economy and its reckoning.

## 16. Expansionists
**User's proposal.** Build many cities; alternate science/culture sources; late-founded
cities develop fast enough to matter; exploration tie-in (new continents to settle);
resource control paying per unique luxury and per city.
- Honest read: this overlaps **7 (The Land Rush)** almost completely — same loop, same
  cards, same posture. **Recommendation: fold 16 into 7 as its Æra III+ act** (the
  Charter posture), keeping 15 as the military twin. The content lands either way:
  - **Colonial Charters** (the deferred tech) as the marquee: settlers stay affordable
    late and a new city is born *developed* — the Founders' Road/Charter Towns ladder
    extended by age (later foundings arrive with granary + monument + shrine).
  - **The Provincial Academies** (Order): flat science per city, no building required —
    the alternate source, shared shape with the Yam.
  - **New continents**: with Ocean-Going, mapgen's second landmass is the late settling
    ground — ties Cartographers (11) and Waters (13); the age-IV endeavour is planting a
    thriving colony overseas.
  - Resource control: the Luxury Table (6) already pays per kind and per copy; the wide
    player is simply the one who can collect them. No new mechanism needed — a tag.
- **Wins by:** see 7 — the count races, plus the overseas colony as its age-IV signature.

---

## Additional candidates (distinct, with deliberate tie-ins)

## 17. The Festival State
Happiness as a *spent* resource, not a ceiling: games, feasts, triumphal processions.
The loop: surplus happiness + gold → spectacle → culture, renown, and drafts. Already
latent: Funeral Games (building), The Great Games (endeavour), Bread and Circuses,
Mandate of Heaven (happy cities pay more). Proposed: **The Games** as a repeatable
project (spend hammers+gold → an empire happiness step and a culture lump, each grander
than the last), festival rites for the augur, and a reckoning for the most content
realm. Cross-play: Tall (big cities host), Caravans (fund it), the Court (artists
headline it). Distinct because its input — happiness itself — is nothing else's input. **Wins by:** the contentment reckoning and ever-grander Games — the festival calendar *is* a bead schedule.

## 18. The Magistracy
The law as an engine: authority and the Statecraft apparatus itself paying yields.
Already latent: Publicani (+gold per positive authority), War Chief (per slotted Order),
The Long Reign / The Deepening (quests about slot levels), Emergency Powers. The loop:
stack authority surplus and Order levels → per-law payoffs → more drafts. Proposed: an
Order paying science per slotted Order level (the codified law as scholarship), a
government whose wildcard slot doubles a card's level, the Qadi's Court tech effect as
its anchor. Cross-play: it crosses *every* posture because every empire runs a
government — the deckbuilder's deck-about-the-deck. Very much this game's own theme; the
title character's. **Wins by:** The Long Reign and The Deepening made a family — the perfected council as a standing race; it converts governance itself into beads.

## 19. The Almanac
Time itself: omens, calendars, the rhythm of turns. Already latent: Keeper of the
Calendar (every 20 turns, a find), The Standing Levy (every 10, a soldier), The Long
Count (tech ability), Omen Reading, the Water Clock of Su Song. The loop: **scheduled
triggers** — effects that fire on a rhythm the player builds around — plus age-entry
timing as a resource (first-into-the-age feats). Proposed: cards that shorten every
"every N turns" effect you run (the metronome as a scaler), an augur rite that *tells
you the next reckoning early*, and an Æra IV wonder that fires everyone's rhythms one
turn sooner. Cross-play: Faith (omens), Observatory (astronomy), Imperium (the levy
rhythm). Distinct mechanically — no other theme's cards care *when*. **Wins by:** timing races — first-into-the-age feats are already its native food; an omen that predicts the next reckoning is a bead bought with foresight.

---

## Simplifying the beads — the themes as the win system

The bead race today is four row kinds (feats · endeavours · quests · reckonings), hands
that refill, drafting, and dice — a lot of *mechanics* for what the sections above show
is really one idea: **every theme wants one race and one measure.** Two shapes cover
everything:

- **A Deed** (the race): first empire to do X, once per age — today's feats, endeavours
  and quests collapse into this one kind. No hands, no drafting: the age's deeds are a
  **public board** every player sees the day the age opens (drawn once, deterministically,
  from the themes the age serves). You don't hold deed cards; you *do* deeds.
- **A Reckoning** (the measure): most-X at age-close, unchanged — it is already the
  cleanest mechanic in the system.

Each ratified theme contributes exactly **one deed and one reckoning per age it is live**
— the win system becomes a projection of the theme list, the codex grid gains two columns,
and the endeavour bias problem (Entry LII) dissolves structurally: wide, war, faith and
festival each own their lane because the *themes* do. Dice stay as the one gambling verb
(re-roll a deed's terms? bank a bead? — needs its sink either way). The golden bead stays
the Magnum Opus. What is *removed*: hand management, per-kind rules, the quest/endeavour
distinction, and the drafting moment — the board replaces all four.

---

**Cross-cutting observations for the unification pass:**
- Complete engines: 1, 3, 5, 8. Thin or one-channel: 4, 9, 10, 11, 13. Early-only by
  ruling: 2 (heir: 15). Anonymous: 7 (absorbs 16). New: 14, 15, and the 17–19 candidates.
- The best cards in the pool are **crossovers** (Sacred Cartography, The Knotted Cord,
  Pilgrimage) — the unified vocabulary keeps dual-theme cards legal, tagged with a
  primary.
- **The Magnum Opus proposal recurs in four themes** (3, 4, 5, 8): one late destination
  with per-theme pillars would give every engine the same answer to "what is this all
  for" without four separate win systems. Worth deciding once, early.
- Every ratified theme eventually names: its trigger, its payoff, its scaler (Entry
  LII's triangle), its wonder, its great-person hook, its bead card, and its age-by-age
  identity — that grid is the next page of this doc, after the list is ratified.
- Naming note: "The Imperium" (theme 1) collides with the tier-18 government named
  Imperium — one of the two should probably rename before the tags are cut over.
