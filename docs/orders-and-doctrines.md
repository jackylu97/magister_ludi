# Orders and Doctrines — the master list

Every Order, government and Doctrine in one place, tables only. The tables ARE the balance
worksheet: edit a cell here, edit the matching field in `data/statecraft.json`, and
`test/sim/statecraftDocSync.test.ts` fails the build if the two ever disagree — every live
row appears in its own deck's table and every table row names a live row, retired rows
excluded from both sides. Every Effect cell — and every government's Signature cell — is
the row's own ratified `text`; bands, chairs, tiers and rarities are the data's. The
reasoning behind each pass lives in `docs/history/orders-and-doctrines-as-built.md`; the
pre-rework shelves, every row of them retired, are `docs/history/orders-and-doctrines-retired.md`.

**The decks rework** (branch `decks`, batch D1a — `docs/plans/decks-rework.md`, ruled
`docs/flags.md` (iiiiii); the design of record is `docs/six-decks-first-cut.md`, whose
structure paragraphs are sync-tested where they state a number):

- **Six decks.** Every Order row carries `decks` — one deck for a single-type card, two for
  a cross-type card (one row, one effect, either membership grants access), none for a
  generic card that belongs to every seat — and a `band`. A leader's row carries its two
  decks; Ibn Battuta's says `rainbow`; a seat under nobody holds all six. A seat's pool is
  its decks' single-type rows, the cross-types naming either, and the commons
  (`deckPoolOf`).
- **Five bands, one gate.** A band is open to a seat once the seat's regular draft count has
  reached its band's rung of the ladder (`currentBandOf`). The research age plays no part (the
  user, 2026-10-17, `docs/flags.md` (eeeeeee): *"lets remove the research age altogether"*).
  This replaces the rule of 2026-09-16, under which each band also needed the research age one
  above it. The ladder is the table below.
- **Only the current band is dealt** (the user, 2026-10-13; `docs/decks/deck-design.md`). A
  hand is dealt only from the seat's current band, the highest band its draft count has reached
  (`currentBandOf`, `eligibleFor`). When a new band opens, the earlier bands are no longer
  dealt. Cards already held keep their chairs. If the seat already holds every card of its
  current band, the draft is not charged and waits for the next band; it is never dealt from
  an earlier band instead (`draftExhausted`). A row may name a **last band**
  (`OrderDef.lastBand`, Dominion batch D7): it is dealt in every band from its own to that
  one. Double Time was the one such row, dealt in bands 2 and 3 (the user, 2026-10-16), until
  batch DS1 retired it. No dealt row has a last band now.
- **Universal chairs.** A government supplies a chair count: 3 / 5 / 6 / 8 / 11 by its tier's
  rung (the user's ruling, `docs/decks/deck-design.md` "More chairs", and batch G1's six chairs
  at tier 10), written on each row as `chairs`. A leader's extra chair and a card's are
  additive.
- **The draw is rarity-first.** A hand is three positions — one card from each of the
  seat's two decks, and a third by the regular-draft cadence *generic → cross → generic →
  single* (the single alternating between the two decks; a rainbow seat samples two distinct
  decks a hand, and a third deck on the single turn). In each position a rarity rung is
  drawn at the table's odds (`rarityOdds`, renormalised over the rungs present), then a card
  uniformly within it. Every position excludes the held and the hand; an empty category falls
  back to the eligible union; fewer eligible cards deal a smaller hand; a rider's extra cards
  come after the base hand from the union. Passing moves `skipPity` points out of common into
  uncommon and rare for the next hand; taking a card zeroes it. Two Doctrines change the draw.
  The Hospitium fills the third position from a deck the seat does not hold, or from the
  eligible union if those decks have nothing left; a rainbow seat keeps its ordinary third
  card. The Jinshi doubles the rare rung's points after the pass has moved them, before the
  odds are renormalised, and it reaches The Hospitium's third card. The faith reroll keeps the
  hand's positions. An exhausted pool charges nothing: the meter stays full and no draft is
  counted until there is a card to deal.
- **No reward hands.** D1a banked a rare-only hand at draft counts 4, 18 and 29. Batch C3
  removed them (the user, 2026-10-16): a new government brings only its Doctrine offer
  (see Doctrines below). Schema 131.
- **Charters.** A row with `charter` grants on the pick — a technology made researchable, a
  building made buildable, rites made learnable — and never sits in a chair. It grants no
  free technology and no free building.
- **Nothing deleted.** Every pre-rework Order and Doctrine row is `retired: true`: in the data
  and the Compendium, in no pool. The live Doctrines are the decks' own, written in batch C3
  (see Doctrines below). A row whose text needs a shape the vocabulary lacks is `deferred` in
  plain words, with no effects, and is in no pool either. Schema 119; a pre-rework save is
  refused.

**Rarity** — the mark in an Order's Rarity column **is** `OrderDef.rarity`: ● common ·
◆ uncommon · ○ rare, blank reads as common. The draw takes it as a *probability target,
never a per-card weight* — 60 · 30 · 10 (`rarityOdds`) — drawn first, then a card within the
rung. Passing a draft moves `skipPity` points out of common until a card is taken. Orders
are never upgraded: a card is what it prints, held once, and a draft is take one or pass.

**Role** — **E** an *engine*, a row whose subject is the deck or the board's *kind* (a
count of the chairs, an amplifier over what your other Orders pay, a share on a class of
buildings, a "hexes that already supply this" test, a shortener of the calendar). **P** a
*payoff*, a row that scales with what the empire has built, holds, worked or slotted (a
count, a conversion, a doubler taken last, a tally). **S** a *standalone*, everything
else (a flat, a rule, an occasion, a charter, a boon on the calendar). The mark is
**derived from the row's own effects** and pinned against that derivation, so a row that
changes shape changes its letter or fails the build.

**Band** — the number in an Order's Band column **is** `OrderDef.band`: 0 Early · 1 Middle ·
2 Late · 3 Final, the ladder's rungs.

A row with a struck half carries **†** in its line under Notes, where the words after the
dagger are what the row does *not* do.

## The ladder

| Rung | Band | Regular draft count | Chairs |
|---|---|---|---|
| Chiefdom | 0 | 0 | 3 |
| Government I | 1 | 4 | 5 |
| Government II | 2 | 10 | 6 |
| Government III | 3 | 18 | 8 |
| Government IV | 4 | 26 | 11 |

A government is offered at its row's own tier (4 · 10 · 18 · 26), and each tier is a rung, so
an Order tier opens at the same draft count as its government. Adopting one opens a Doctrine
offer of the paired tier (see Doctrines below). Until batch C3 a reward hand was banked at
every rung but the first; the reward hands are gone.

2026-10-15: the fifth rung moved from 45 to 38 drafts (`docs/flags.md` (uuuuuu)).
2026-10-17: the rungs are the government tiers (`docs/flags.md` (ccccccc)). From schema 119
the ladder held only the rungs where the chair count rises, so the tier-10 governments had
no rung and every Order tier from Tier II up opened one government tier late. The tier-10
rung keeps the five chairs of the rung below it, and the rung at 38 is gone with its retired
governments, so Tier IV opened at 29.
2026-10-17: Tier IV and its governments moved from 29 to 26 drafts (`docs/flags.md`
(ddddddd): *"lets move tier IV to tier 26"*).
2026-11-10: the tier-10 rung has six chairs, one more than the rung below it (batch G1,
`docs/flags.md` (hhhhhhh)).

## Governments

| Tier | Government | Military | Economic | Civic | Wildcard | Chairs | Signature |
|---|---|---|---|---|---|---|---|
| 0 | Chiefdom | 1 | 1 | 0 | 1 | 3 | Grants nothing of its own. |
| 4 | Council of Elders | 1 | 2 | 1 | 1 | 5 | Every town gains +2 food and +1 renown. |
|  | Priest-King | 1 | 1 | 2 | 1 | 5 | Every town gains +1 science and +1 faith. |
|  | War Chief | 2 | 1 | 1 | 1 | 5 | Units gain +4 strength. Kills grant 10 science and 10 culture. |
| 10 | Aristocracy | 1 | 1 | 3 | 1 | 6 | Every town gains +2 science. Great people cost 15% less renown. |
|  | Republic | 1 | 3 | 1 | 1 | 6 | +1 trade route. Towns gain +1 culture for every 5 citizens. |
|  | Tyranny | 3 | 1 | 1 | 1 | 6 | +5 authority. Units cost 30% less upkeep. |
| 18 | Divine Mandate | 2 | 1 | 3 | 2 | 8 | Every town with a wonder gains +20% culture and +20% faith. |
|  | Imperium | 3 | 2 | 1 | 2 | 8 | Units gain +1 movement. Towns you captured gain +10% science and culture. |
|  | Merchant League | 1 | 3 | 2 | 2 | 8 | +1 trade route. Your trade routes pay 50% more. |
| 26 | The Curia | 2 | 2 | 4 | 3 | 11 | Your Civic cards pay 30% more. |
|  | The Estates | 2 | 4 | 2 | 3 | 11 | Your Economic cards pay 30% more. |
|  | The Sultanate | 4 | 2 | 2 | 3 | 11 | Your Military cards are 30% stronger. |

- **The twelve signatures are batch G1's** (the user's ruling of 2026-11-10, `docs/flags.md`
  (hhhhhhh); the spec is `docs/plans/deck-simplification-2026-11-10.md`, "Governments").
- **Chairs have types** (batch C2; the mixes are `docs/plans/doctrines-governments-chairs.md`
  section 4, and batch G1 set the tier-10 mixes). The four type columns add up to Chairs,
  which is the rung's count.
- **Which chair a card fits:** a Military, Economic or Civic chair takes a card of its own
  type or an unsorted card; a Wildcard chair takes any card; a Wildcard card fits only a
  Wildcard chair. A card from a deck not sorted yet is unsorted.
- **Every chair beyond a government's mix** (a leader's, a card's) is a Wildcard chair.
- **Adopting a government re-seats the seated cards** and keeps as many as possible in the
  same chair: a card whose chair still exists and still fits it stays there. The rest move
  to the free chairs: Wildcard cards first, then typed cards in chairs of their own type,
  then typed cards in the Wildcard chairs left, then unsorted cards, typed chairs before
  Wildcard ones. A card that fits no chair left goes back to the collection.
- **The tier-26 signatures raise the seated cards of one type** (`cardTypeAmplifier`). Every
  number a seated card of that type gives is 30% larger, rounded to the nearest whole number,
  and never less than 1 larger where the number is 1 or more. The rise is taken of each line
  the card prints, in a town, on a hex, on a trade route or for the empire, and is printed as
  a line of its own. It reaches yields, percentages on yields and production, strength in a
  fight, a town's defence, and the yields and percentages of one-time rewards and boons. It
  does not reach happiness, authority, renown, unit stats other than strength, rules, costs,
  a commission's reward, or a card off its chair. An unsorted card counts as the type of the
  chair it sits in.
- **Great people cost 15% less renown** under the Aristocracy (`greatPersonCost`, a card
  rule). The cut comes off the price once, beside The Peregrini's discount.
- **Theocracy is retired** (batch G1): the Aristocracy takes its place at tier 10, and its row
  is kept as it was, with its five chairs.
- **The tier-38 governments are retired** (The Commonwealth, The Empire and The
  Magisterium): their rows are kept for saves and nobody is offered them. Since 2026-10-17
  the ladder has no rung at 38 either: Tier IV opens at 26.

## Doctrines

- **What a Doctrine is.** A card held for the whole game. It takes no chair, is never given
  up, and its effects apply from the turn it is taken (`liveEffects`' second source,
  `PlayerStatecraft.doctrines`).
- **Where the rows live.** In the deck files, beside the Orders: each `data/decks/<deck>.json`
  has a `doctrines` map, folded into the one Doctrine table with the same id-collision check
  the Orders get. A row carries its `decks` (one or two), its sheet tier as `band` (Tier I to
  IV, written 1 to 4), its `text` and its `effects`. The pre-rework rows in
  `data/statecraft.json` stay retired.
- **Which government offers it.** Each Doctrine tier pairs with one government tier, in
  order: tier 4 offers the Tier I Doctrines, tier 10 Tier II, tier 18 Tier III and tier 26
  Tier IV. A row's `tier` field is that government tier, derived from `band` when the tables
  are folded (`governmentTierForDoctrineBand`), never written on a deck row.
- **The offer.** Adopting a government opens a Doctrine offer of its tier, drawn from the
  seat's two decks: one Doctrine from each deck, then a third from either (`drawDoctrineOffer`,
  `drawDoctrinePositions`; the interim rule until the user rules the mix). A rainbow seat
  samples two of its decks. A deck with no Doctrine left gives its place to the rest of the
  bag; a rider that widens Doctrine offers adds cards from the whole bag. A Doctrine the seat
  holds is never offered again. An empty bag opens no offer and spends no randomness.
- **The answer.** Take one (`chooseDoctrine`) or pass (`skipDoctrineOffer`). A pass costs
  nothing and banks nothing; a Doctrine passed on is not held, so it can be offered again.
  The offer blocks End Turn until it is answered, and a waiting offer must be answered before
  another government is adopted (`governmentChoiceError`), so an adoption never writes over
  it. The faith reroll may redeal it. The bots take the best-scoring Doctrine when it scores
  above nothing, and pass otherwise.
- **The spec of record** is each deck's sheet (`docs/decks/<deck>.md`), whose Doctrine tables
  list a deck's Doctrines across the four tiers. A Doctrine with a data row matches its sheet
  row in name, tier and text (`test/sim/decks/<deck>.test.ts`). The table below mirrors the
  live rows (`statecraftDocSync.test.ts`).
- **A retired Doctrine** keeps its row in the deck file, so a save that holds it reads the
  same, and is on no sheet, in no offer and not in the table below. Dominion has three, which
  the user removed from the sheet: The Servian Reforms (Dominion batch D9), and Weight of
  Numbers and Total Mobilisation (batch DT1).

| Doctrine | Decks | Tier | Offered with | Effect |
|---|---|---|---|---|
| The Steppe Confederacy | Dominion | I | tier 4 | +50% production toward mounted units. Mounted units gain +3 strength when attacking a wounded unit. |
| The Marian Reforms | Dominion | I | tier 4 | Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected. |
| The Soldiers' Share | Dominion | I | tier 4 | Melee units gain +1 movement and +3 strength. |
| The Laws of Lord Shang | Dominion | II | tier 10 | While a town builds a military unit, its surplus food goes into the unit instead of into growth. |
| Centurions | Dominion | II | tier 10 | Each Elite unit gives +3 strength to your units beside it, and costs 1 less upkeep. |
| The Plunder Economy | Dominion | II | tier 10 | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. |
| The Consular Roads | Dominion | II | tier 10 | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. |
| The Universal Monarchy | Dominion | III | tier 18 | Towns you capture cost no authority, including those you already hold. Towns you found from now on cost twice as much authority. |
| Combined Arms | Dominion | III | tier 18 | Your units gain +3 strength, doubled beside one of your siege units. Siege units beside one of your melee units cannot be attacked in melee. |
| The Strategoi | Dominion | III | tier 18 | +30% renown. Citadel yields and your great generals' strength aura are doubled. |
| The Landsturm | Dominion | IV | tier 26 | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general. |
| The Fortress Empire | Dominion | IV | tier 26 | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. |
| The Scourge of God | Dominion | IV | tier 26 | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. |
| Bound to the Soil | Expansionist | I | tier 4 | Workers gain +1 charge. Tended tiles gain +1 food. |
| The Gift of the River | Expansionist | I | tier 4 | Worked tiles beside a river gain +1 food and +1 production. Towns away from fresh water cost 3 more happiness. |
| The Highland Clans | Expansionist | I | tier 4 | Towns on hills cost 1 less authority. Hills beside a town gain +1 food. |
| The Commanderies | Expansionist | I | tier 4 | Each of your towns costs 1 less authority, minimum one. Your borders grow 30% more slowly. |
| The Georgics | Expansionist | II | tier 10 | Your works count as having stood twice as long. Improvements that have stood for twenty turns gain +1 production. |
| Synoecism | Expansionist | II | tier 10 | Your towns of six or more citizens grow 30% faster. Towns you founded cost 1 more authority, including those you already hold. |
| The Curator of Waters | Expansionist | II | tier 10 | Public works give +2 happiness and are built 50% faster. |
| Human Sacrifice | Expansionist | II | tier 10 | Your towns may levy every two turns instead of every five. Your capital may levy a citizen to perform a rite across your empire. |
| The Censors | Expansionist | II | tier 10 | When the world takes a census, each of your towns gains a citizen. If you lead the census, each of your towns also gains +1 happiness for the rest of the game. |
| The Wildwood Compact | Expansionist | II | tier 10 | Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge. |
| Crop Rotation | Expansionist | III | tier 18 | Worked improvements yield twice their own bonus. Worked unimproved tiles yield nothing. |
| The Contented City | Expansionist | III | tier 18 | Your citizens ask 20% less happiness. Your gold income is halved. |
| The Builder Kings | Expansionist | III | tier 18 | +25% production toward wonders. Manufactories gain +2 production for each wonder in the town working them. |
| Empire Without End | Expansionist | III | tier 18 | +1 authority for each town you hold. |
| All Roads Lead to Rome | Expansionist | III | tier 18 | Your capital gains +3% production and gold for each town joined to it by road, at most +45%. Each town not joined to it costs 2 more authority. |
| The Planted Towns | Expansionist | III | tier 18 | Towns you found start with four citizens and a Monument. Training a settler also costs its town a citizen. |
| The Garden Peoples | Expansionist | III | tier 18 | Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture. |
| The Physiocrats | Expansionist | IV | tier 26 | Every improved tile gains +2 food, +2 production and +2 gold. |
| The Hydraulic Empire | Expansionist | IV | tier 26 | Worked tiles with fresh water gain +1 food and +1 production for each public work in their town. |
| The Cathedral Lodges | Expansionist | IV | tier 26 | Manufactories yield twice as much. Towns with a Manufactory gain +30% production toward wonders and the Magnum Opus. |
| The High Towns | Expansionist | IV | tier 26 | Your towns may work mountains. Mountains gain +4 production, and each gives +1 production to the hexes beside it. |
| The Mandarinate | Expansionist | IV | tier 26 | Each point of spare authority gives +1% science and culture, at most +30%. Each of your towns costs 1 more authority. |
| The Inward Roads | Expansionist | IV | tier 26 | Towns joined to your capital by road gain +20% science and culture. Your caravans may not travel to other empires. |
| Arcadia | Expansionist | IV | tier 26 | Needs tended land. Your tended tiles also count as improved for every card. |
| The Apoikia | Commerce | I | tier 4 | Settlers and workers cost half as much gold to buy. |
| The Laurion Leases | Commerce | I | tier 4 | Hexes with a resource cost half as much gold to buy. |
| The Delian League | Commerce | I | tier 4 | Your coastal towns cost 1 less authority and gain +3 production. |
| The Grand Canal | Commerce | II | tier 10 | Each of your domestic routes carries half of its origin's surplus food to its destination. |
| The Sogdian Colonies | Commerce | II | tier 10 | Each of your towns holding your trading post gains +3 culture and +3 renown, favouring merchants. |
| The Forbidden Silks | Commerce | II | tier 10 | Your luxuries give twice their happiness. You cannot lend luxuries in deals. |
| The Flying Money | Commerce | II | tier 10 | Your towns with a gold building buy units and buildings 20% cheaper. Your other towns cannot buy them with gold. |
| The Year and a Day | Commerce | III | tier 18 | Your towns that a domestic route reaches grow 25% faster. Your other towns grow 25% more slowly. |
| The Muda | Commerce | III | tier 18 | Your trade routes to other empires pay +3 science and +3 culture, and cannot be plundered. |
| The Turnpike Trusts | Commerce | III | tier 18 | Caravans cost half as much gold to buy. Hexes with a road gain +1 gold. |
| The Sea Ban | Commerce | IV | tier 26 | Your domestic routes pay twice as much. You cannot send trade routes to other empires. |
| The Peace of Lodi | Commerce | IV | tier 26 | While you are at peace, your trade routes pay 50% more. While you are at war, they pay 25% less. |
| The Opera del Duomo | Commerce | IV | tier 26 | Gold you pour into the Magnum Opus buys twice as many hammers. Your towns build the Magnum Opus 25% more slowly. |
| The Monte di Pietà | Commerce | IV | tier 26 | Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold. |
| The Pythagorean Brotherhood | Scientific | I | tier 4 | +2 science in every city, doubled in cities with a Shrine. |
| The Removal to Xianyang | Scientific | I | tier 4 | Your towns grow 30% faster. Settlers cost twice as much. |
| The Workshops of Syracuse | Scientific | I | tier 4 | Your military units gain +5 combat strength. They cost 50% more to build and to buy. |
| The Peripatetic School | Scientific | I | tier 4 | Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown. |
| The Jixian Academy | Scientific | II | tier 10 | Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture. |
| The Academy of Gondishapur | Scientific | II | tier 10 | Towns with an empire building gain +15% science. +20% production toward empire buildings, except the Magnum Opus and its works. |
| The Pandidakterion | Scientific | II | tier 10 | Hexes with an Academy have double yields, applied after every other change to the hex. |
| The Directorate of Arms | Scientific | III | tier 18 | While no empire you have met knows more technologies than you, your units gain +3 combat strength. |
| The Universitas | Scientific | III | tier 18 | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. |
| The Volley Fire | Scientific | III | tier 18 | Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength. |
| The Külliye | Scientific | III | tier 18 | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings, except the Magnum Opus and its works. |
| The Court of Rudolf II | Scientific | IV | tier 26 | Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more. |
| The Nassau Reforms | Scientific | IV | tier 26 | Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly. |
| The Platonic Academy | Scientific | IV | tier 26 | Your great people of every family found an Academy as their work, in place of their own. |
| The Two Capitals | Scientific | IV | tier 26 | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. |
| The Arthashastra | Magisterial | I | tier 4 | You have one more Wildcard chair. The card seated in it counts twice. |
| The Hospitium | Magisterial | I | tier 4 | The third card in each of your Order hands comes from a deck you do not hold. |
| The Choregia | Magisterial | I | tier 4 | Culture buildings give +3 culture and +2 renown each. |
| The Periclean Works | Magisterial | I | tier 4 | Each wonder you hold gives +2 production in every town. |
| The Magnaura | Magisterial | II | tier 10 | Each town gains +1 science for each Civic card you have seated. |
| The Jinshi | Magisterial | II | tier 10 | Rare cards come up twice as often in your Order hands. |
| The Peregrini | Magisterial | II | tier 10 | Great-person works give +1 food and +1 production to every hex beside them. Laying a great-person work makes your next great person cost 20% less. |
| The Barmakids | Magisterial | II | tier 10 | Each great person you have gained gives every town +1 food and +1 production. |
| The Council of Ten | Magisterial | III | tier 18 | You have two more Wildcard chairs. |
| Scutage | Magisterial | III | tier 18 | Orders you hold but have not seated pay half their yields. You have one fewer Wildcard chair. |
| The Bourgs | Magisterial | III | tier 18 | Towns working a great-person work grow 25% faster. |
| The Carroccio | Magisterial | III | tier 18 | Your units gain +1 strength for each wonder you hold, at most +8. |
| The Union of Lublin | Magisterial | IV | tier 26 | You also gain the abilities of the other two governments of your tier. |
| The Kitabkhana | Magisterial | IV | tier 26 | Spending a great person grants 200 renown for each age you have reached. |
| The Gobelins | Magisterial | IV | tier 26 | Each great-person work in your borders gives +4% production toward the Magnum Opus, at most +40%. |
| The Escorial | Magisterial | IV | tier 26 | Completing a wonder gives you a free great-person draft. |
| The Theoric Fund | Devotion | I | tier 4 | +1 culture for every 3 faith your empire makes. |
| The Rites of Zhou | Devotion | I | tier 4 | Each town holding a rite gains +2 food and +2 happiness. |
| The Serapeum | Devotion | I | tier 4 | Each of your gods gives twice its effects. |
| The Paean | Devotion | I | tier 4 | Your military units gain +1 strength for every god and belief you hold. |
| The Capitulary of Herstal | Devotion | II | tier 10 | Rites cost half as much. |
| The Seven Councils | Devotion | II | tier 10 | Your religion may hold one more follower belief and one more enhancer belief. |
| The Patrimony of Peter | Devotion | II | tier 10 | Your holy city's citizens demand no happiness. |
| The Ribats | Devotion | II | tier 10 | Military units created in a town following your religion gain +3 strength for good. Conquering a town converts it to your religion. |
| The Imarets | Devotion | III | tier 18 | Your devout towns grow 25% faster. |
| Canossa | Devotion | III | tier 18 | You and an empire whose capital follows your religion cannot declare war on each other. |
| The Canons of the Holy Sepulchre | Devotion | III | tier 18 | Towns with a holy site buy with faith at 30% less. |
| The Martyr's Crown | Devotion | III | tier 18 | Each of your units that dies in battle presses your religion on every town within three hexes. |
| The Saint Peter's Indulgence | Devotion | IV | tier 26 | +1% production toward the Magnum Opus for every 150 faith you have spent this game. |
| The House of Worship | Devotion | IV | tier 26 | Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds. |
| The Apostolic Camera | Devotion | IV | tier 26 | Your follower beliefs also pay you in every foreign town that follows your religion. |
| The Two Sanctuaries | Devotion | IV | tier 26 | Hexes with a holy site have double yields, applied after every other change to the hex. |

## Decks

One table a deck, then the cross-types and the generic pool. **Filled in D1b**: every
pre-rework row is retired and the six decks' rows are D1b's, one agent a deck, entered
from the design doc's deck tables. A row whose text needs a shape the vocabulary lacks
is `deferred` — in the data, in the Compendium, in no pool and in no table below; its
sentence is under Notes, after the dagger. **A live Order lives in its deck's own file**
— `data/decks/<deck>.json`, with the cross-type and generic rows in
`data/decks/common.json` — and the retired shelf stays in `data/statecraft.json`; the
eight fold into one registry with an id-collision check, and a deck's table here mirrors
that deck's file. A row lands here in the same edit that lands it in its file, or the
sync test fails.

An id that collided with a retired row takes its **deck file's name as a prefix**
(`dominionBloodedSpears`, `commerceSaltTithes`, `commonBoundaryStones`) — one convention
across the seven files. Ids are internal; the names in these tables are the card's.

### Dominion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Blooded Spears | 0 | ● | S | Military units gain +2 strength. |
| Blood Brothers | 1 | ○ | S | A barbarian unit you kill joins your side. |
| Commission: Clear the Frontier | 1 | ● | S | Goal: clear 2 barbarian camps. Reward: choose a great general. |
| The Horse Herds | 0 | ● | S | Worked pastures and camps give +1 food and +1 production. |
| Sword and Plough | 0 | ● | P | Each city with a garrison gains +1 culture and +2 production. |
| The Grain Tribute | 0 | ● | S | +1 food and +1 production in every city. |
| The Bards' Praise | 0 | ● | S | Killing a unit grants culture equal to its strength. |
| The Outriders | 0 | ● | S | Clearing a barbarian camp grants 10 production to every town. |
| The Captured Arms | 0 | ● | P | +1 science for every unit you have killed this game, no cap. |
| The Gathering Host | 1 | ◆ | P | Gains +1 science and +1 culture each time you gain a military unit. |
| The Training Cadre | 1 | ● | S | Units gained in a town with a Barracks start with 2 experience. |
| The Quartermasters | 1 | ● | S | Worked strategic resources gain +3 food and +3 production. |
| Honours of the Legion | 1 | ◆ | S | Each time one of your units earns a rank, gain science and culture equal to its strength. |
| The Pacified Marches | 1 | ◆ | P | +1 authority and +5 culture for each barbarian camp you have cleared, at most +8 and +40. |
| War Foundries | 1 | ○ | P | Towns with a Barracks gain gold equal to 30% of their production. |
| Songs of the Fallen | 1 | ○ | S | Killing or losing a unit grants science and culture equal to twice its strength. |
| Horse Lords | 1 | ○ | S | Mounted units gain +3 strength and +1 movement. |
| The General Staff | 1 | ● | P | Each Barracks gives +5 production and +2 general renown. |
| Martial Law | 1 | ● | P | Each garrisoned unit grants its city +2 happiness and +4 food. |
| The Swift Riders | 1 | ◆ | S | Mounted units may move after attacking. |
| The Captive Craftsmen | 1 | ◆ | P | Gains +1 science and +1 production each time you pillage a hex. |
| Siege Works | 2 | ● | S | Siege units gain +4 strength against towns. |
| Conquered Archives | 2 | ● | P | Captured cities gain +6 science and +6 culture. |
| Stockpiles | 2 | ● | P | Cities gain +8 food per defensive building. |
| Riders of the Steppe | 2 | ◆ | S | Pillaging costs your mounted units one less movement point. |
| Spoils of War | 2 | ◆ | S | Pillaging a hex grants 50 gold and 15 culture. |
| Hegemony | 2 | ○ | S | Towns you captured cost 1 less authority. |
| Master Bowyers | 2 | ○ | S | Ranged and siege units gain +1 range. |
| The Citadel Works | 2 | ● | S | Citadels gain +5 science and +3 general renown. |
| Commission: Take the City | 2 | ◆ | S | Goal: capture a city of 8 or more citizens. Reward: each city you capture grants 250 science and 250 culture per age. |
| Living off the Land | 2 | ● | S | Military units outside your territory cost no upkeep. |
| The Serried Ranks | 2 | ○ | S | Melee units beside another melee unit gain +10 strength when defending. |
| The Veterans' Roll | 2 | ◆ | P | +1% science and culture for every rank your units have earned this game, at most +30%. |
| The Tactica | 2 | ◆ | S | Great generals give 1 experience each turn to units beside them. |
| Spear-won Land | 2 | ◆ | P | +3% production and science for each town you have captured. |
| The Longbowmen | 2 | ● | S | Ranged units gain +2 strength and +1 range. |
| Standing Garrisons | 3 | ● | P | Per garrisoned unit, the city gains +12% production and +12% culture. |
| The Siege Train | 3 | ◆ | S | Siege units gain +1 movement, and +5 strength when defending. |
| Total War | 3 | ○ | S | All your military units gain +5 strength and +1 movement. Every city demands +3 more happiness. |
| The Victory Mint | 3 | ◆ | S | Capturing a city grants gold equal to thirty times its population. |
| The Drill Masters | 3 | ● | S | Units you gain start as Veterans. |
| Up Through the Ranks | 3 | ◆ | S | Each time one of your units becomes an Elite, gain 250 renown, favouring great generals. |
| The Regimental Schools | 3 | ● | P | Each garrisoned unit gives its town +3 science. |
| The Tagmata | 3 | ◆ | S | Veteran and Elite units gain +5 strength. |
| Interior Lines | 3 | ◆ | S | Roads cost your units 40% less movement. |
| The Bakufu | 3 | ◆ | P | A great general standing in a town gives it +25% science and culture. |
| Pax Romana | 3 | ○ | S | Towns you capture are pacified at once. |
| The Mural Crown | 3 | ◆ | S | Gaining a great person grants 200 science and culture for each great general you have gained. |
| Valhalla | 3 | ○ | S | When one of your units dies, gain 25 culture for each Monument in your empire. |
| Commission: A Victor's Peace | 3 | ○ | S | Goal: take two cities from an empire, then make peace with it or destroy it. Reward: one more Wildcard chair. |
| Commission: Hold the Capitals | 4 | ○ | S | Goal: hold two rival capitals. Reward: a great general, and +25% production in every town for twenty turns. |
| The Grand Army | 4 | ○ | P | Your capital gains +3 science and +3 culture for each military unit you have. |
| The Annexed Provinces | 4 | ○ | P | Each captured city you hold gives +5% science and +5% culture in every city, at most +25%. |
| The Marshalate | 4 | ○ | P | Your great generals' aura gives +1 more strength for each great general you have gained this game, at most +5. |
| The Proconsuls | 4 | ◆ | S | Captured towns with a garrison cost no authority. |
| Commission: The Grand Campaign | 4 | ◆ | S | Goal: capture three cities. Reward: a great general, and science and culture equal to ten times their population. |
| The Varangian Guard | 4 | ○ | S | Elite units may attack twice a turn. |
| The Great Bombards | 4 | ○ | S | Your siege units break a town's walls in one blow. |
| The Horde | 4 | ○ | S | Pillaging a hex also pillages every enemy improvement beside it. |
| Vae Victis | 4 | ○ | P | Your capture rewards are paid twice. |
| The Spear Makers | 0 | ● | S | +25% production toward military units. |
| War Feeds Itself | 2 | ○ | S | At the end of your turn, each of your units in enemy territory yields you its hex's yields. |
| The Glorious Dead | 4 | ○ | S | Your losses never count toward war weariness. |
| The Castle Demesne | 1 | ◆ | S | Citadels give +3 food and +3 production. |
| Commission: The First Province | 1 | ◆ | S | Goal: capture a town. Reward: towns you captured gain +5 food and +5 gold. |
| The Naadam | 2 | ● | S | Pastures and camps gain +2 culture. |
| The Taker of Cities | 2 | ◆ | S | Your units beside one of your great generals gain +5 strength against towns. |
| The Tributary Kings | 3 | ◆ | P | Your capital gains +1 production and +1 gold for each citizen in your puppet towns. |
| Commission: The Border Fortress | 2 | ◆ | S | Goal: plant a citadel. Reward: citadels gain +2 food and +2 production. |
| Commission: The Chosen Men | 3 | ◆ | S | Goal: have three units become Elite. Reward: your Elite units ignore enemy zone of control. |
| The Limitanei | 3 | ○ | S | A garrisoned town works one more hex. |
| Circumvallation | 4 | ◆ | S | While a rival town is under siege by your units, it adds no production toward a Magnum Opus. |
| The Upstarts | 1 | ◆ | S | Your units gain +3 strength against the units of an empire that knows more technologies than you. |

### Expansionist

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Smallholdings | 0 | ● | S | Worked farms and pastures gain +1 food and +1 gold. |
| Granary Levies | 0 | ● | S | When a city grows in population, gain 15 production |
| The Patient Harvest | 0 | ○ | S | Towns keep 30% of their food when they grow. |
| The Fish Traps | 1 | ● | S | Charter. Workers may build fish traps on lake and coast tiles: +1 food and +1 production. |
| Sweet Water | 0 | ● | S | Tiles beside a river or lake gain +1 food. |
| The Seed Grain | 0 | ◆ | S | Towns you found start with one extra citizen. |
| The Rope Stretchers | 0 | ● | P | Each town gains +1 science for every three improved tiles in its borders. |
| The Road Home | 0 | ● | S | Each town you found is joined to your nearest town by road. |
| The Woodland Bands | 0 | ● | S | Your units ignore the movement cost of forest and jungle. |
| The Founding Furrow | 0 | ● | S | Founding a town grants culture equal to five times the number of towns you hold. |
| The Horrea | 0 | ◆ | P | Each Granary you hold gives +1 authority. |
| Levy of the Land | 1 | ◆ | S | A town may spend a citizen for production equal to the food it took to grow. Once every five turns. |
| Tinkers' Guild | 1 | ● | S | Workers gain +1 charge. |
| The Old Songs | 1 | ● | S | Worked unimproved land gains +2 culture. |
| The Local Census | 1 | ● | S | A town working four improved tiles costs 1 less authority. |
| The Wild Orchards | 1 | ● | S | Charter. Workers may tend a forest or jungle tile into an orchard: +1 food and +1 gold. |
| Dark Earth | 1 | ◆ | S | Farms that have stood 20 turns gain +2 food. |
| The Three Sisters | 1 | ● | S | Farms beside a plantation or pasture gain +2 food and +2 production. |
| The Hard Country | 1 | ● | S | Worked desert and tundra tiles gain +1 food and +1 production. |
| Outposts | 1 | ◆ | S | Workers may plant an outpost on a wild tile near your border. It claims its hex and the ring around it. |
| The Wild Marches | 1 | ● | P | +1 culture for every four wild hexes you own. |
| The Road Towns | 1 | ● | P | Towns joined to your capital by road gain +2 production. |
| The Gleaners | 1 | ● | S | After a town levies a citizen, it gains +3 food for ten turns. |
| The Grain Census | 1 | ◆ | P | Gains +1 production and +1 gold each time a town grows past its largest size. |
| The Burhs | 1 | ● | S | Towns gain +3 defence for each defensive building. |
| Commission: Break the Sod | 1 | ● | S | Goal: work 12 improved tiles. Reward: farms gain +1 food. |
| The Land Hunger | 1 | ◆ | S | Towns build settlers 25% faster. |
| The Aediles | 1 | ◆ | P | Gains +1 production and +1 culture each time you finish a public work. |
| The Watercourses | 2 | ◆ | S | Irrigated farms gain +2 production. |
| The Highlands | 2 | ● | S | Mines and quarries on hills gain +2 science and +1 production. |
| The Coast | 2 | ● | S | Worked fishing boats gain +3 food and +3 culture. |
| Provincial Councils | 2 | ◆ | S | Towns joined to your capital by road cost 1 less authority. |
| The Grain Dole | 2 | ● | S | Towns of 10 or more citizens gain +4 happiness. |
| The Waterworks | 2 | ◆ | S | Aqueducts give +3 happiness. |
| The Breadbasket | 2 | ◆ | S | A town told to stop growing adds its food surplus to its production. |
| Veteran Colonies | 2 | ◆ | S | A military unit in one of your towns may retire. The town gains a citizen. |
| The Engineers' Yards | 2 | ● | S | Improvements beside a manufactory gain +2 production. |
| The Tended Country | 2 | ◆ | S | Needs tended land. Tended tiles gain +2 production. |
| The Hedgerows | 2 | ● | S | Needs tended land. Worked farms beside a tended tile gain +2 food, once per farm. |
| The Great Households | 2 | ◆ | P | Each town gains +2% production for each citizen, at most +30%. |
| The Harbour Cities | 2 | ● | P | Coastal towns gain +1 culture for every two citizens. |
| The Terraces of Moray | 2 | ◆ | S | Towns beside a mountain may spend a citizen to gain science equal to the food it took to grow that citizen. |
| The Colonists | 2 | ◆ | S | Towns of at least six citizens may spend a citizen to raise a settler. |
| The Book of Settlements | 2 | ◆ | P | +3% production and gold for every town you have founded this game, at most +30%. |
| The Staked Claims | 2 | ◆ | S | Each town you found claims every unowned hex within two hexes of it. |
| Seasonal Levies | 3 | ◆ | S | After a town levies a citizen, it gains +60% food for ten turns. |
| The Long Tending | 3 | ○ | S | Tended tiles gain +3 food. |
| The Polders | 3 | ○ | S | Workers may build a polder on a coast tile beside three of your land tiles. It yields as a farm. |
| A Court of Engineers | 3 | ○ | S | Gain +50% renown, but great-person offers contain only great engineers. |
| The Wide Country | 3 | ◆ | S | Goal: claim 12 hexes by outposts, cleared camps or buying. Reward: your borders grow 25% faster. |
| Old Workings | 3 | ● | S | Mines, quarries and lumber mills gain +3 production. |
| The Megalopolis | 3 | ○ | P | Towns of ten or more citizens gain +1 science and +1 production for each citizen. |
| Plenty | 3 | ● | S | When a town grows, it gains production equal to five times its new population. |
| The Mill Wheels | 3 | ● | P | Towns with a Watermill gain +15% production. |
| The Quitrents | 3 | ● | P | +1 gold for every two hexes you own. |
| The Mit'a | 3 | ○ | S | Needs a levy. A citizen spent on a levy returns to its town twenty turns later. |
| The Freedom of the City | 3 | ◆ | S | The first time a town reaches 15 citizens, it gains production equal to forty times its population. |
| The Great Colonies | 3 | ○ | S | Towns you found start with a third of the citizens of your largest town. |
| The Age of Improvement | 3 | ○ | E | The bonuses your Orders give to improved tiles are doubled. |
| The Mountain Terraces | 3 | ○ | S | Your towns may work the mountains in their borders. A worked mountain yields 2 science and 1 production. |
| The Sovereign Writ | 3 | ○ | S | Spare authority's bonus has no ceiling. |
| The Imperial Roads | 3 | ○ | S | Towns joined to your capital by road cost no authority. |
| The Capitolia | 3 | ◆ | P | Each empire building you hold gives each of your towns +1 culture. |
| The Garden of the World | 4 | ○ | S | Tended tiles gain +2 food, +1 production and +1 culture. |
| The Corvée | 4 | ○ | S | Your towns may levy a citizen toward the Magnum Opus. |
| The Philosophers' Peaks | 4 | ◆ | P | Each town gains +2 science for every mountain in its borders, at most +6. |
| The Measure of the Land | 4 | ○ | P | Every town gains +1 science for every 25 hexes your empire owns, at most +10. |
| The Mother City | 4 | ○ | P | Your capital gains +5% production and +5% culture for each town you have founded this game. |
| The General Levy | 4 | ○ | S | Your towns may spend a citizen to raise a melee unit. At war, they may do it every turn. |
| The Great Migration | 4 | ○ | S | Every ten turns, each foreign town near your border loses a citizen to your nearest happier town. |
| The Domesday Survey | 4 | ○ | S | Goal: own 120 hexes and work 40 improved or tended tiles. Reward: each town gains +1 science for each improved or tended tile it works. |
| The Theodosian Walls | 4 | ◆ | S | Your towns gain +1 defence for every two citizens. |
| The Imperial Highways | 4 | ○ | S | The town raising the Magnum Opus gains +3% production toward it for every town joined to your capital by road, at most +45%. |
| The Keeps | 4 | ○ | S | Workers may build one Keep in each town. A Keep gains the yields of every tile around it. |

### Commerce

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Salt Tithes | 0 | ● | P | +3 gold for each different luxury you have improved. |
| Travellers' Letters | 0 | ● | P | Your capital gains +2 science and +2 culture for each empire you have met. |
| The Pathfinders' Company | 0 | ◆ | S | Scouts gain +1 sight and +1 movement. |
| The Mineral Trade | 0 | ● | S | Mines and quarries gain +1 gold. |
| Land Speculation | 0 | ◆ | S | Buying a hex grants culture equal to half the gold paid. |
| Private Patronage | 1 | ○ | P | Towns gain +25% gold. |
| Civic Receipts | 1 | ◆ | S | Buying a building grants culture equal to 15% of the gold paid. |
| Provisioning Contracts | 1 | ● | S | Domestic routes grant their destination +3 food and +3 production. |
| The Common Road | 2 | ● | S | Your foreign routes give +3 gold, +3 science and +3 culture. |
| The Factors' Houses | 2 | ● | P | Your cities holding your trading post gain +2 gold and +4 culture. |
| The Planters' Charter | 1 | ◆ | S | Charter. Unlocks the Plantation House, a building you buy with gold. |
| The Market Writ | 1 | ◆ | P | +1 authority for every two Markets in your empire. |
| Commercial Education | 1 | ● | P | Gold buildings provide +3 science. |
| Financed Industry | 1 | ○ | P | Towns gain production equal to 20% of their gold. |
| The Home Market | 2 | ● | P | Towns that receive two domestic routes gain +30% food and production. |
| The Money Lenders | 3 | ○ | P | Earn interest equal to 4% of your treasury each turn, with no cap. |
| Mining Districts | 2 | ◆ | S | Mines gain +2 gold and +2 science for every two mines beside them. |
| Foreign Procurement | 2 | ◆ | S | You may buy units without their strategic resource. |
| The League of Cities | 2 | ○ | P | Towns that send a trade route gain +20% production. |
| The Exchange | 2 | ◆ | P | +5% science and culture for each foreign empire your routes reach. |
| The Scholars' Roads | 3 | ○ | P | Your routes give +50% science and culture. You run 2 fewer routes. |
| The Customs Houses | 2 | ◆ | P | Each customs house in your borders gives its town +4 science and +4 culture, whether or not it is worked. |
| Strategic Exports | 2 | ◆ | P | Your strategic resources supply twice as many copies. |
| Caravanserai Cities | 3 | ◆ | S | Caravanserais can be built in every city. |
| The Endowment | 3 | ◆ | P | Purchased buildings provide +2 science each, at most +6 per town. |
| Merchant Princes | 4 | ○ | S | You may buy great-person drafts with gold. |
| The World's Exchange | 4 | ○ | S | +10% production toward the Opus for each foreign empire your trade routes reach, at most +40%. |
| The Chartered Metropolis | 3 | ○ | P | Towns that send three trade routes gain +35% food, production and culture. |
| The Admiralty of Trade | 3 | ◆ | S | Your trade routes to a town holding your trading post have no range limit. |
| The Merchant Works | 4 | ○ | P | Towns building a wonder gain production equal to 25% of their gold. |
| The Gilded Scaffold | 3 | ○ | P | You may purchase world wonders. All your cities lose 15% production. |
| A Court of Merchants | 3 | ○ | S | Gain +50% renown, but great-person offers contain only Great Merchants. |
| Corner the Market | 2 | ◆ | S | Goal: hold four copies of one luxury. Reward: +2 happiness for each luxury you hold two or more copies of. |
| The Strongroom | 3 | ◆ | S | Goal: hold 1,500 gold. Reward: a great merchant, and culture equal to a fifth of your treasury. |
| The Carters' Guild | 2 | ● | S | Towns that receive a domestic trade route build buildings 25% faster. |
| The Nest Egg | 0 | ● | P | Your capital gains +1 culture for every 4 gold you make each turn. |
| The Pack Trail | 0 | ● | S | Your trade routes give +2 gold. |
| The First Caravan | 0 | ● | S | Boon. On draft: gain a caravan. |
| The Staple Right | 1 | ● | P | Gain +3 gold and +2 culture for each luxury you hold two or more copies of. |
| Numidian Cavalry | 2 | ◆ | S | Charter. Unlocks Numidian Cavalry: a Horseman with +1 strength for each luxury you hold. |
| Houses of Account | 2 | ● | P | Gold buildings provide +2 happiness and +1 renown. |
| A Guild Commission | 3 | ◆ | S | Goal: buy five buildings with gold. Reward: a free great-person draft. |
| The Monopoly | 3 | ○ | P | For each luxury that only you hold, every town gains +5 gold and +3 culture. |
| The Customs Service | 3 | ◆ | S | Trade routes leaving a city whose borders hold a customs house gain +3 gold and +3 culture. |
| The Bourse | 3 | ○ | E | Gold buildings produce 75% more of their own yields. |
| The Spice Exchange | 2 | ○ | P | Every city gains +5% science and +5% culture for each luxury you hold two or more copies of, at most +30%. |
| Money at Work | 4 | ○ | P | Every town gains +1 science for every 20 gold you make each turn. |
| Bought and Paid For | 4 | ○ | P | Each town gains +4% production and culture for each building you bought there with gold, at most +24%. |
| The Neutral Flag | 4 | ◆ | P | Your trade routes to an empire that is at war with another empire gain +100% gold and +50% science. |
| The World's Fair | 4 | ○ | S | Goal: have trade routes to four empires. Reward: your trading post in each of their capitals. |
| The Great Loan | 4 | ○ | S | Boon. On draft: gain twenty turns of gold income. Your towns make 25% less gold for forty turns. |
| The Trade Winds | 4 | ○ | S | Gain +3 trade route capacity. Your trade routes reach 50% farther. |
| Market Day | 0 | ● | P | Your capital gains +1 gold for every citizen. |
| The Emporia | 0 | ● | S | Improved luxury hexes gain +1 food and +1 production. |
| The Grain Banks | 1 | ◆ | P | Cities with a Granary gain +3 gold. |
| The Market Halls | 1 | ● | P | Towns with a Market gain +1 food and +1 production for every three citizens. |
| Names in Stone | 2 | ◆ | P | +1% science and culture for every 200 gold you have spent buying this game, at most +30%. |
| Bills of Exchange | 2 | ◆ | P | Every town gains +1% production for every 10 gold you make each turn, at most +30%. |
| The Grain Barges | 4 | ◆ | P | Your domestic trade routes pay their destination +1 food and +1 production for every four citizens of their origin. |
| The Return Leg | 3 | ○ | S | Your trade routes between your own towns also pay their origin everything they pay their destination. |
| The Fondaci | 2 | ◆ | S | Each time one of your trading posts is established, gain science and culture, each equal to twenty times the population of its town. |
| The Champagne Fairs | 3 | ◆ | S | Every ten turns, each town that receives a domestic trade route grants culture equal to ten times its population. |
| Commission: The Great Fair | 2 | ◆ | S | Goal: have domestic routes arrive in four of your towns. Reward: two more trade routes. |
| Export Guilds | 1 | ◆ | P | Each luxury you lend to another empire in a deal gives your capital +4 culture and +2 production. |
| The Treaty Ports | 2 | ◆ | P | +5% production for each empire you hold a deal with, at most +25%. |
| The Capitulations | 3 | ◆ | S | Each foreign town with your trading post lends you a luxury you lack. |
| The Casa da Índia | 4 | ○ | P | Every copy of a luxury you hold pays its yields, not only the first. |
| Letters of Credit | 1 | ○ | S | You may buy with gold until your treasury reaches −150. Debt disbands none of your units until your treasury falls below −150. |
| The Strongbox | 1 | ◆ | P | While seated, this card gains +1 science and +1 culture each turn you end with at least 300 gold in your treasury, up to +15 of each. |
| The Merchant Guilds | 2 | ◆ | S | You may run one more trade route for every two merchants in the trades. |

### Devotion

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| First Rites | 1 | ● | P | Shrines give +2 faith. |
| Lay Offerings | 0 | ● | S | Pastures, camps and plantations gain +1 faith and +1 food. |
| The Founding Vows | 1 | ◆ | S | Goal: start two rites. Reward: 100 faith, and 40 food in your capital. |
| The Calling | 0 | ● | S | Your capital gains +3 faith. |
| The Wayside Shrines | 1 | ● | P | Cities with a Shrine gain +2 food and +1 happiness. |
| Consecrated Labor | 1 | ● | S | Cities with a Shrine may buy workers with faith. |
| The Octave | 1 | ◆ | P | Your rites last 50% longer. |
| The Fast | 1 | ◆ | S | Charter. Unlocks the Rite of Fasting: for ten turns a town does not grow, and gains science and culture equal to its population. |
| The Living Hymnal | 2 | ◆ | P | Your capital gains +3 science and +3 culture for every city following your religion, with no cap. |
| The Mission | 2 | ◆ | S | Goal: convert two foreign cities. Reward: an Apostle and 300 culture. |
| The Second Prophet | 2 | ◆ | S | Prophets and apostles you buy start with one extra charge. |
| The Creed | 1 | ◆ | P | Your capital gains +3 faith and +3 culture for every god and belief you hold. |
| The Rites Commonwealth | 1 | ○ | S | Cities keeping a rite demand 25% less population happiness. |
| The Saints' Fields | 2 | ● | S | Holy Sites gain +5 food and +8 gold. |
| The Cathedral Works | 3 | ● | P | Cathedrals give +8 science and +2 happiness. |
| The Old Holy Places | 2 | ● | S | Holy Sites gain +3 faith and +3 culture. |
| Temple Estates | 2 | ● | S | Hexes beside a Holy Site gain +2 food and +2 faith. |
| The Votive Gifts | 1 | ● | S | Towns may spend faith to add production to what they are building. Not wonders. |
| The Spiritual Host | 2 | ◆ | S | Military units gain +4 strength in land that follows your religion. |
| Mission Houses | 2 | ◆ | S | Your proclamations press 30% harder. |
| The Lay Brothers | 2 | ○ | S | Cities with a Temple may buy ordinary buildings with faith, at the faith rate. |
| The Settled Faith | 2 | ○ | P | Devout towns gain +15% science and culture. |
| The Holy Inquisition | 3 | ◆ | P | +35% faith. |
| The Learned Clergy | 3 | ◆ | P | +2 science and +2 culture for every 10 faith your empire makes each turn. |
| The Offered Stones | 3 | ◆ | P | Buildings you bought with faith give +2 culture each. |
| The Doctors of the Church | 3 | ○ | E | Follower beliefs pay 150% more in your towns. |
| The Last Offering | 4 | ○ | S | In your holy city, faith you pour into the Magnum Opus buys 50% more production. |
| The Great Commission | 4 | ○ | S | Goal: more than half the world's cities follow your religion. Reward: devout towns gain +3 faith and +3 culture. |
| The Tithe of Nations | 4 | ○ | P | Gain 1 faith each turn for every two citizens in the world who follow your religion. |
| The Treasury of Merit | 4 | ○ | P | Each turn, gain science equal to 2% of the faith you hold and culture equal to 2% of it, no cap. |
| The Apostolic Succession | 4 | ○ | P | Your holy city gains +3 science and +3 culture for every ten turns since your religion was founded, at most +24 of each. |
| The Chapter Houses | 4 | ○ | P | Every city with a Cathedral gains +2 science and +2 culture for each Cathedral you hold, at most +12 of each. |
| The Seven Pilgrimages | 4 | ◆ | P | A city working a Holy Site gains +1 science and +1 culture for every Holy Site you hold, at most +5 of each. |
| The Conversion of Kings | 3 | ○ | S | Goal: convert a rival's capital. Reward: a Prophet and 500 culture. |
| The Pious Masons | 3 | ○ | S | Towns with a Cathedral may buy a half-built wonder with faith. |
| The Host Restored | 4 | ○ | S | Towns may spend faith to heal every unit of yours in land that follows your religion. |
| The Deaconries | 2 | ◆ | P | Devout towns gain +1 happiness for every four citizens. |
| The Martyrology | 1 | ◆ | P | Gains +2 faith and +2 culture each time one of your units dies in battle. |
| The Consecration Feast | 3 | ◆ | S | Finishing a Cathedral grants science and culture equal to twenty times the town's population. |
| The Pilgrim Towns | 3 | ◆ | P | Towns working a holy site gain +20% culture. |
| The Gifts of the Faithful | 1 | ● | S | Religious buildings may be bought with faith. |
| The Book of Life | 2 | ◆ | P | +1% science and culture for every 150 faith you have spent this game, at most +30%. |
| The Offering Chests | 3 | ● | S | Military units bought with faith cost 30% less. |
| The Rogations | 1 | ◆ | P | Gains +1 faith and +1 culture each time a town starts a rite. |
| The Sabbath Laws | 2 | ◆ | S | Charter. Unlocks the Rite of the Sabbath: for ten turns a town builds nothing, and gains culture equal to its production. |
| The Psalter | 3 | ◆ | S | Each rite started in a devout town grants science and culture equal to five times the town's population. |
| The Parishes | 2 | ◆ | S | Each town you found starts out devout. |
| Commission: The State Church | 2 | ◆ | S | Goal: hold six towns, all devout. Reward: devout towns cost 1 less authority. |
| The Confessors | 2 | ◆ | S | Towns that follow your religion share their sight with you. |
| Pentecost | 3 | ○ | S | When a foreign town turns to your religion, your religion presses every town within four hexes of it. |
| The Mass Baptisms | 3 | ◆ | S | The first time a foreign town turns to your religion, gain science and culture equal to twenty times its population. |
| The Anchorites | 2 | ◆ | S | Your prophets raise a further holy site for one charge instead of two. |
| The Caliphate | 3 | ○ | S | Devout towns cost no authority. |
| The Abbeys | 3 | ○ | S | Your apostles may raise holy sites, as prophets do. |
| The Interdict | 4 | ○ | S | A rival's town that follows your religion adds no production toward a Magnum Opus. |
| The Turning of Swords | 3 | ○ | S | An enemy unit you kill on land that follows your religion joins your side instead, at most once a turn. |
| The Double Feast | 4 | ○ | S | Your towns may keep two rites at once. |
| The Tithe Barns | 0 | ● | P | Cities with a Granary gain +1 faith and +1 production. |
| The Royal Cult | 0 | ◆ | P | Your capital gains +1 faith for each citizen. |
| The Temple Storehouses | 1 | ● | P | Temples give +2 food and +2 happiness. |
| The Household Gods | 0 | ● | S | +2 faith in every town. |
| The First Offering | 0 | ● | S | Boon. On draft: gain 25 faith. |

### Scientific

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| The Almanac | 1 | ● | P | Libraries give +2 production. |
| The Bronze-Founders' Charter | 1 | ◆ | S | Charter. Opens Casting: your spear and chariot lines gain +2 strength for good. |
| The Herbalists' Charter | 0 | ● | S | Charter. Opens Herbals, which unlocks the Physic Garden: +2 science and +2 happiness. |
| The Prospectors' Notes | 0 | ◆ | S | Building a mine or a quarry grants its town 25 production. |
| The Royal Workshops | 0 | ● | S | Completing a technology grants 15 production in your capital. |
| The Royal Tutors | 0 | ● | S | +2 scholar renown each turn for each science building. |
| The War Manuals | 0 | ● | S | Units gained in a town with a Library start with +2 strength. |
| The Curators of Works | 0 | ● | P | Public works give +1 science and +1 happiness. |
| Learned Foundations | 1 | ● | S | Cities with a Library build empire buildings 25% faster. |
| The Old Academy | 1 | ◆ | S | Academies gain +3 food and +3 production. |
| The Secret Arts | 1 | ◆ | P | Each town gains +1 production for each technology you know that no empire you have met knows, charter technologies included, at most +5. |
| The Edge of the Sword | 1 | ◆ | S | Your units gain +3 strength against the units of an empire that knows fewer technologies than you. |
| The Glassmakers' Charter | 1 | ◆ | S | Charter. Opens Optics, which unlocks the Specularium: +3 food, and +1 science for every two citizens. |
| The Surveyors' Charter | 1 | ◆ | S | Charter. Opens Surveying: you may build the Aqueduct early, and workers may build the Qanat, which waters the farms beside it. |
| The Founding Gift | 1 | ◆ | S | A great scholar who founds an Academy also grants its town 150 production. |
| The Librarians' Charter | 1 | ○ | S | Charter. Opens Cataloguing, which unlocks the Mouseion: +4 scholar renown, and +2 culture for each empire building you hold. |
| The Astronomical Diaries | 1 | ◆ | P | Gains +1 culture and +1 production each time you complete a technology. |
| The Scholars' Fame | 1 | ● | S | Completing a technology grants scholar renown equal to a twentieth of its cost. |
| The Royal Estates | 1 | ● | P | Each empire building gives its town +2 food and +2 production. |
| The Common Tables | 1 | ● | P | Towns gain +2 food for each science building in them. |
| The Free Cities | 1 | ◆ | S | While you hold at most five towns, your towns build buildings and wonders 20% faster. |
| The Forward Plans | 1 | ○ | S | You may build Universities before you know Scholarship. |
| The Dedications | 1 | ◆ | S | Finishing a science building or an empire building grants culture equal to ten times the town's population. |
| The Scribes' Hall | 1 | ● | P | Towns with a Library gain +1 science for every four citizens. |
| The Sky Watchers | 1 | ● | P | Shrines give +1 faith and +1 science. |
| The Quiet Faculties | 2 | ○ | P | Towns working an Academy gain +25% food and +20% production. |
| Enduring Institutions | 2 | ◆ | P | Towns with an empire building gain +20% production. |
| The Mechanists' Charter | 2 | ○ | S | Charter. Opens Mechanics: catapults gain +1 range, and your archer line may move after it shoots. |
| The Translation Movement | 2 | ◆ | S | Technologies that an empire you have met already knows cost you 20% less research. |
| The Paper-Makers' Charter | 2 | ◆ | S | Charter. Opens Papermaking, which unlocks the Scriptorium: +2 science, and +10% science beside an Academy. |
| The Physicians' Charter | 2 | ◆ | S | Charter. Opens Medicine, which unlocks the Bimaristan: +25% food in its town. |
| The Printers' Charter | 2 | ◆ | S | Charter. Opens Printing, which unlocks the Aldine Press: +2 culture and +1 trade route. |
| The Latin Quarter | 2 | ● | S | Great-person works beside an Academy gain +2 culture and +1 production. |
| The Charter Rolls | 2 | ◆ | P | Your capital gains +3 production and +3 culture for each charter you have drafted. |
| The Royal Charter Commission | 2 | ◆ | S | Goal: complete a charter technology. Reward: a great scholar and 100 culture. |
| The Roll of Scholars | 2 | ◆ | P | +4% production and culture for each great scholar you have gained this game, at most +28%. |
| The Palace Schools | 2 | ◆ | S | Units gained in a town with an empire building start with +4 strength. |
| The Round City | 2 | ◆ | P | +1% production and culture for each citizen in your capital, at most +30%. |
| The City Architects | 2 | ● | S | Towns of at least eight citizens build wonders 25% faster. |
| The Invitations | 2 | ○ | S | Completing an empire building grants a great scholar. |
| The Strategikon | 2 | ◆ | S | Your units gain +4 strength within two hexes of an Academy. |
| The Armoury Patterns | 2 | ● | S | Towns build units of the newest age you know 25% faster. |
| The Proving Ground | 3 | ◆ | S | Your units gain +1 strength for each technology you know that no empire you have met knows, at most +8. |
| The Gunfounders' Charter | 3 | ◆ | S | Charter. Opens Gunfounding, which unlocks the Tophane: its town builds military units 25% faster, with +4 strength. |
| The Alchemists' Charter | 3 | ◆ | S | Charter. Opens Chemistry: your warrior line gains +1 strength for each charter technology you know. |
| The Nizamiyya | 3 | ◆ | S | Academies yield 50% more. |
| The Age of Reason | 3 | ○ | S | Your Orders count each technology you complete twice. |
| The Journeymen | 3 | ● | S | Completing a technology grants each town production equal to three times its population. |
| The Second Seat | 3 | ○ | S | You may build one second copy of an empire building, in a city with a University. |
| The Doctorate | 3 | ● | S | Gaining a great scholar grants culture equal to eight turns of your culture. |
| The Royal Academies | 3 | ◆ | P | +5% production and culture for each empire building you hold. |
| The Queen of Cities | 3 | ○ | P | Towns of at least 15 citizens produce twice their food and production. |
| The Humanists | 3 | ◆ | P | Cities with a University gain culture equal to half their base science. |
| The Model Army | 3 | ○ | S | Research upgrades your units even when you lack the strategic resource the new unit needs. |
| The Naval Gunners' Charter | 4 | ◆ | S | Charter. Opens Naval Gunnery: your Gun Galleys gain +3 strength and may blockade a rival's port. |
| The Military Engineers' Charter | 4 | ◆ | S | Charter. Opens Military Architecture, which unlocks the Bastion: +5 defence and +30 hit points. |
| The Republic of Letters | 4 | ◆ | P | Your capital gains +4 production and +4 culture for each Academy you hold. |
| The Sum of Knowledge | 4 | ○ | P | Your capital gains +1 production and +1 culture for each technology you know. |
| The Great Catalogue | 4 | ○ | S | +10% production toward the Magnum Opus for each charter technology you know, at most +40%. |
| The Walls of Learning | 4 | ● | S | Towns with a University gain +6 defence. |
| The Lynx-Eyed Academy | 4 | ○ | S | Goal: hold four Academies. Reward: a great scholar, and 300 production in each town with an Academy. |
| The Great Instrument | 4 | ○ | S | Goal: complete Alchemy. Reward: a tenth of the Magnum Opus. |
| The Foundation Stone | 4 | ○ | S | You may begin the Magnum Opus once Alchemy is half researched. |
| The Closed Book | 4 | ○ | S | If you complete Alchemy before any other empire, empires that do not know Alchemy may not begin the Magnum Opus for 10 turns. |
| The Breaching Batteries | 4 | ◆ | S | Each hit your siege units land on a city removes 5% of its Magnum Opus progress. |
| The Prototype Works | 4 | ○ | S | You may build the buildings and train the units of the technology you are researching, at double their production cost. Wonders are excepted. |
| The Scribes | 0 | ● | S | +1 science in every town. |
| The Apprentices | 0 | ● | S | Finishing a building grants 5 science. |

### Magisterial

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Civic Granaries | 1 | ● | P | Monuments give +1 food and +1 production. |
| The Temple of the Muses | 0 | ● | P | Culture buildings give +2 faith each. |
| Master Masons | 0 | ● | S | Finishing a culture building grants 30 production in its town. |
| The Prytaneion | 0 | ◆ | E | Each town gains +1 food for each card you have seated. |
| The Polemarch | 0 | ● | E | Your units gain +2 strength for each Military card you have seated. |
| The Court Painter | 0 | ● | S | Each card you draft grants 15 renown. A charter counts. |
| The Cornerstone | 0 | ● | S | Towns build wonders 20% faster. |
| The Second Reading | 0 | ◆ | S | The first reroll of each hand is free. |
| Commission: The Eighth Wonder | 1 | ◆ | S | Goal: complete a wonder. Reward: each wonder you hold gives +3 culture and +5 renown. |
| The Laureate | 1 | ◆ | P | Towns working a great-person work gain +5 culture and +3 science. |
| The Guild of Masons | 1 | ◆ | S | +30% production toward wonders. |
| The Working Court | 1 | ○ | P | Towns with a Monument gain production equal to 30% of their culture. |
| The Nomarchs | 1 | ◆ | E | +1 authority for every two cards you have seated. |
| The Workshop at Olympia | 1 | ● | S | +3 renown a turn for each wonder you hold. |
| The Overseers of Works | 1 | ◆ | S | Each time you gain a great person, your capital gains 100 production for each age you have reached. |
| The Keepers of Wonders | 1 | ● | P | +2 happiness for each wonder you hold. |
| The Ceremonial Guard | 1 | ● | S | Towns holding a wonder gain +5 defence. |
| The Unveiling | 1 | ◆ | S | Completing a wonder deals you a free Order hand. |
| The Encyclopedia | 1 | ● | E | +1 science and +1 culture in your capital for each Order you hold unseated, at most +15 of each. |
| Commission: The Roll of the Senate | 1 | ◆ | S | Goal: hold ten Orders. Reward: one more Wildcard chair. |
| The Open Door | 1 | ◆ | S | Order hands cost 15% less culture. |
| The Wandering Muse | 1 | ◆ | S | Boon. On draft: gain a free great-person draft. |
| The Landmark Bounds | 1 | ◆ | S | Laying a great-person work claims every unowned hex beside it. |
| The Learned Patron | 2 | ◆ | P | Towns with two culture buildings gain science equal to 15% of their culture. |
| The Senate Charter | 2 | ◆ | S | Charter. Unlocks the Assembly Hall in your capital: +3 happiness and +30% production toward buildings. |
| The Honoured Dead | 2 | ◆ | P | Gains +2 science and +4 production in your capital each time you spend a great person. |
| The Prefects | 2 | ◆ | E | +5% production for each Economic card you have seated. |
| The Symposium | 2 | ◆ | S | Each time you gain a great person, you are dealt a free Order hand. |
| Letters Patent | 2 | ◆ | P | Your great people's acts pay 50% more. |
| The Quarter of Masters | 2 | ● | P | A great-person work beside another great-person work yields its own yield again. This never stacks. |
| The Seven Sights | 2 | ◆ | P | +5% culture and science for each wonder you hold, at most +30%. |
| The Golden Age | 2 | ○ | S | Completing a wonder gives your cities +20% production and culture for ten turns. A later wonder restarts the ten turns. |
| The Accessions Register | 2 | ◆ | S | Each card you draft grants your capital production equal to half the culture its hand cost. |
| The Unwritten Chapter | 2 | ● | S | Each time you pass on an Order hand, gain science equal to half the culture the hand cost. |
| The Sed Festival | 2 | ○ | S | Each time you adopt a government, gain a free great-person draft. |
| Commission: The Patron's Gallery | 2 | ◆ | S | Goal: hold great-person works of three families. Reward: a free great-person draft and 200 culture. |
| The Envious Eye | 2 | ◆ | S | When a rival finishes a wonder you were building, your production moves to the next item. |
| The Grand Vizier | 2 | ○ | E | The card in your first Economic chair pays its yields twice. |
| The Masters' Domain | 3 | ◆ | S | Worked great-person works give +3 food and +3 production. |
| The Wonder Commonwealth | 3 | ○ | P | Towns holding a wonder gain +35% production and food. |
| The Boule | 3 | ◆ | E | +2% science and culture for each card you have seated. |
| The Roll of Masters | 3 | ◆ | P | +3% science and culture for each great person you have gained this game, at most +30%. |
| The Garden Courts | 3 | ◆ | P | Towns working at least two great-person works gain +20% culture and science. |
| Commission: The Wonder of the Age | 3 | ◆ | S | Goal: put 1,500 production into wonders. Reward: 250 culture and one more Wildcard chair. |
| Officials by Merit | 3 | ○ | S | Order hands deal two extra cards. You cannot reroll Order hands. |
| The Pandects | 3 | ◆ | P | +5% science and production for each Doctrine you hold. |
| Commission: The Golden Bull | 3 | ◆ | S | Goal: fill every Military, Economic and Civic chair with a card of its type. Reward: a Doctrine offer. |
| The Divine Proportion | 3 | ○ | E | The bonuses your cards give great-person works are doubled. |
| The Second Sitting | 3 | ○ | S | Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once. |
| Magnificence | 3 | ○ | S | You may buy a wonder you are building with culture, one culture for each hammer it still needs. |
| The Mixed Constitution | 3 | ○ | S | Your cards fit any chair. |
| The Universal Genius | 3 | ○ | S | Your great people may act, and then still lay their work. Each leaves one legacy. |
| The Cabinet of Curiosities | 3 | ○ | S | Boon. On draft: gain a random card of your tier from a deck you do not hold. |
| Commission: The Paradise Garden | 3 | ○ | S | Goal: have a great-person work with three works or tended hexes beside it. Reward: every unowned hex within three hexes joins your borders. |
| The Privy Council | 4 | ○ | E | Each of your cards that pays production pays +1 more production wherever it pays it. |
| The Universal Library | 4 | ○ | S | The city building the Magnum Opus gains +2% production toward it for each Order you hold, seated or not, at most +40%. |
| The Polymath's Study | 4 | ○ | E | Your towns gain +8% science and production for each different deck among the cards you hold, at most +40%. |
| The Hall of Wonders | 4 | ○ | S | Order hands deal one more card for every two wonders you hold, at most two more. |
| The Last Commission | 4 | ○ | S | Spending a great person adds 150 production to your Magnum Opus. |
| The Immortals | 4 | ○ | S | The legacies of your great people count twice. |
| Commission: The Ideal City | 4 | ○ | S | Goal: have one town hold two wonders and work three great-person works. Reward: that town gains +25% culture, science and production. |
| The Grand Retrospective | 4 | ○ | S | Boon. On draft: gain 20 culture, science and production for each wonder, great-person work and Order you hold. |
| The Processional Way | 4 | ○ | S | Great-person works in a straight line of three or more give +3 culture and +3 science each. |
| The Pull of the Masters | 4 | ○ | S | Each turn, each great-person work takes one unworked hex beside it from a rival town. |

### Cross-type

| Order | Decks | Band | Rarity | Role | Effect |
|---|---|---|---|---|---|
| The Frontier Militia | Dominion · Expansionist | 0 | ● | S | Each town you found starts with a melee unit. |
| The Escorted Roads | Dominion · Commerce | 2 | ◆ | S | Trade routes from a garrisoned town gain +5 gold. |
| Field Academies | Dominion · Scientific | 1 | ◆ | S | Your first kill each turn grants 25 science. |
| Examinations of State | Dominion · Magisterial | 2 | ○ | P | Garrisoned towns gain +1 science and +1 culture for every three citizens. |
| Market Gardens | Expansionist · Commerce | 0 | ● | S | Hexes with a road gain +1 gold. |
| The Provincial Fair | Expansionist · Commerce | 2 | ◆ | S | Towns with a Market gain +2 gold on plantations, camps and pastures. |
| Sacred Groves | Expansionist · Devotion | 0 | ◆ | S | Worked, unimproved forests gain +1 food and +1 faith. |
| The Assay | Expansionist · Scientific | 1 | ● | S | Hexes with a strategic resource gain +2 science. |
| The Mountain Observatories | Expansionist · Scientific | 0 | ● | P | Cities with a mountain in their borders gain +3 science. |
| The Sculpted Landscape | Expansionist · Magisterial | 3 | ◆ | S | Farms beside a great-person work gain +2 food and +2 culture. |
| The Tithe | Commerce · Devotion | 2 | ○ | P | Towns with a Temple gain gold equal to 25% of their faith. |
| Merchant Scholars | Commerce · Scientific | 3 | ◆ | P | Foreign routes gain +2 science for each Academy in the origin city. |
| The Cloister | Devotion · Scientific | 2 | ○ | P | Towns with a Temple gain science equal to 30% of their faith. |
| Sacred Commissions | Devotion · Magisterial | 2 | ◆ | S | Towns with a Holy Site build wonders 30% faster. |
| Illuminated Treatises | Scientific · Magisterial | 0 | ● | P | Libraries give +1 culture. Monuments give +1 science. |
| The House of Wisdom | Scientific · Magisterial | 3 | ◆ | S | Towns working an Academy build wonders 30% faster. |
| The Merchant Navigators | Commerce · Scientific | 2 | ● | S | Trade routes from a town with a Harbour gain +5 science. |
| Letters of Marque | Dominion · Commerce | 3 | ○ | S | Naval kills grant 60 gold. |
| The Exchange of Discoveries | Commerce · Scientific | 1 | ◆ | S | Mines and quarries on a resource gain +2 science. |
| Garden Provinces | Expansionist · Magisterial | 2 | ● | P | Connected cities with a Monument gain +3 food and +3 culture. |
| Garden Cities | Expansionist · Magisterial | 1 | ◆ | P | Towns with a Monument gain +1 culture for every three wild tiles they work. |
| Pilgrim Markets | Commerce · Devotion | 2 | ◆ | S | Trade routes to or from a town with a Holy Site gain +3 gold and +3 faith. |
| Rites of Passage | Dominion · Devotion | 0 | ● | S | Gaining a military unit grants 12 faith. |
| The Sacred Host | Dominion · Devotion | 1 | ○ | S | Kills grant 15 faith. |
| The Crusader Orders | Dominion · Devotion | 2 | ◆ | S | Military units gain +3 strength in land that does not follow your religion. |
| The Barbarian Frontier | Dominion · Expansionist | 1 | ◆ | S | Clearing a barbarian camp claims its hex and the unowned hexes around it. |
| The Oriflamme | Dominion · Devotion | 1 | ◆ | S | Military units beside one of your religious units gain +4 strength. |
| Professional Soldiers | Dominion · Commerce | 3 | ◆ | S | Units you purchase gain +3 combat strength. |
| The Chartered Company | Dominion · Commerce | 3 | ◆ | S | Charter. Unlocks the Company Guard, a melee unit you buy with gold. |
| The Muster of the Fields | Dominion · Expansionist | 1 | ◆ | S | Towns of 5 or more citizens may spend a citizen to raise a melee unit. |
| Carried-Off Scholars | Dominion · Scientific | 2 | ● | S | Capturing a city grants science equal to ten times its population. |
| The Soldier-Scholars | Dominion · Scientific | 2 | ◆ | P | Each military unit in your towns gives +2 science. |
| The Sword of State | Dominion · Magisterial | 1 | ● | S | Boon. On draft: gain the best melee unit you can build. It costs no upkeep. |
| The New Code | Dominion · Magisterial | 3 | ○ | S | Capturing a city deals you a free Order hand, at most once every ten turns. |
| Looted Art | Dominion · Magisterial | 2 | ◆ | S | Capturing a city grants 20 renown for each great-person work and wonder inside its borders. |
| The Farming Garrisons | Dominion · Expansionist | 1 | ● | S | Hexes with a fortified unit gain +1 food and +1 production. |
| The Merchant Shrines | Commerce · Devotion | 0 | ● | P | Towns working an improved luxury gain +2 faith. |
| The Silk Road Monks | Commerce · Devotion | 2 | ◆ | S | Trade routes to a town that follows your religion gain +3 gold and +3 culture. |
| The Brokers' Redraw | Commerce · Magisterial | 2 | ○ | S | You may reroll an Order hand with gold. |
| The Standing Army | Dominion · Commerce | 1 | ◆ | S | Garrisoned units cost no upkeep. |
| The Art Dealers | Commerce · Magisterial | 1 | ● | E | +3 gold for each card seated in your government. |
| Mercenary Contracts | Dominion · Commerce | 3 | ◆ | S | Military units you buy cost no upkeep for twenty turns. |
| The Holy Spring | Expansionist · Devotion | 0 | ● | P | Towns beside a mountain or a lake gain +2 faith and +1 culture. |
| The Priest-Astronomers | Devotion · Scientific | 1 | ● | P | Your capital gains +2 science and +2 faith for each town keeping a rite. |
| The Monastic University | Devotion · Scientific | 3 | ○ | S | A Holy Site and an academy standing beside each other each gain +5 science and +3 faith. |
| The Painted Chapels | Devotion · Magisterial | 1 | ◆ | P | Religious buildings give +3 culture each. |
| The Festival Calendar | Devotion · Magisterial | 2 | ◆ | P | Cities keeping a rite gain +30% food and +30% culture. |
| The Ambarvalia | Expansionist · Devotion | 0 | ● | P | Each town gains +1 faith for every two improved tiles. |
| The Monastery Libraries | Devotion · Scientific | 1 | ● | P | Libraries give +2 faith. Temples give +2 science. |
| The Shrine Guards | Dominion · Devotion | 1 | ● | S | Towns with a Shrine may buy melee units with faith. |
| The Blessed Forges | Devotion · Scientific | 2 | ◆ | S | Improved strategic resources gain +1 faith and +1 production. |
| The Schoolmen's Charter | Devotion · Scientific | 1 | ◆ | S | Charter. Opens Scholasticism, which unlocks the Cathedral School: +2 science for each faith building in its town. |
| Sacred Patronage | Devotion · Magisterial | 3 | ○ | S | You may buy a great-person draft for 750 faith. |

### Generic

| Order | Band | Rarity | Role | Effect |
|---|---|---|---|---|
| Hearth Stores | 0 | ● | S | Your capital gains +1 food. |
| Watchmen | 0 | ● | S | Friendly combat units gain +2 strength when defending in your territory. |
| Resting Camps | 0 | ● | S | Friendly units that take no action this turn heal an additional 5 health when otherwise eligible to heal. |
| Local Markets | 0 | ● | S | Your capital gains +2 gold. |
| The Village Scribe | 0 | ● | S | Your capital gains +1 science. |
| Public Gatherings | 0 | ● | S | Your capital gains +1 culture. |
| Household Altars | 0 | ● | S | Your capital gains +1 faith. |
| Boundary Stones | 0 | ● | S | Cities with a Monument expand their borders 20% faster. This does not increase draft culture. |
| Public Wells | 1 | ● | P | Cities without freshwater gain +2 food. |
| Civic Peace | 1 | ● | S | Gain +1 empire happiness. |
| Local Clerks | 2 | ● | S | Gain +1 authority capacity. |
| Public Hospitals | 3 | ● | S | Cities of at least eight population gain +1 happiness. |
| Common Ledgers | 3 | ● | P | Cities with a Market gain +2 science; cities with a Library gain +2 gold. |

### Notes and deferred halves (from the data rows)

- **Riders of the Steppe** — A raid costs a single point of movement, so a rider who is forgiven one is forgiven the raid.
- **The Old Songs** — Open water your people work counts as unbuilt ground here: the game tells works from wild, and not land from sea.
- **The Waterworks** — The saving on the aqueduct is paid as extra production toward it, which comes to the same price.
- **Travellers' Letters** — An empire you have met stays met, so the letters never stop arriving — a rival you have since destroyed is still a rival you once wrote to.
- **Civic Receipts** — Every building a town buys pays, however many it has bought before and whichever shelf it came off. What the card still does not pay for is a unit bought at the same counter, which is the whole of what the word building narrows. The share is taken of what actually left the treasury, so a discount at the till is a smaller rebate.
- **The Return Leg** — The town a trade route between your own cities leaves is paid what the town it reaches is paid, line for line: the route's own pay, every card's addition to it, and a blockade that stops it. The copy stays in the town it was paid to, and no card that raises what trade routes pay raises it a second time. A trade route to another empire is not copied.
- **The Planters' Charter** — The Plantation House is bought with gold and never built. Every plantation its city works gains a little food and a little gold.
- **The Treaty Ports** — An empire counts once, however many deals you hold with it. A deal that only hands over gold at once leaves nothing running, so it does not count, and a war ends every deal between the two empires.
- **Financed Industry** — The share is taken of the town's own flat coin as it stood before any conversion spoke, so a card that turns coin into hammers cannot feed a card that turns hammers into coin.
- **The Home Market** — A town counts while two or more trade routes from your other towns end there at once.
- **The Money Lenders** — The interest is counted on the treasury after your cities add their gold for the turn and before upkeep is paid. It is paid in whole steps, so the last few coins earn nothing, and a treasury in debt earns nothing.
- **Mining Districts** — The neighbours need not be worked and need not be yours; the mine being paid does have to be worked, which is true of every line that lands on a hex. Odd numbers round down, so a mine with three beside it is paid once.
- **Foreign Procurement** — The waiver is for the counter alone — a town still cannot put a knight in its queue without horses. A piece bought this way is an ordinary piece afterwards and still takes a copy, so an empire that buys past its iron finds the iron spoken for.
- **The League of Cities** — A town counts while one of your trade routes sets out from it. A route that has been cancelled or plundered does not count.
- **Export Guilds** — Each copy counts, so two copies of one luxury lent in two deals count twice. A copy counts while its deal runs, and a war ends every deal between the two empires.
- **The Exchange** — Each empire counts once, however many of your trade routes reach it.
- **The Customs Houses** — A customs house counts for the town whose borders hold it, whether or not anyone works it.
- **Strategic Exports** — The map does not change: the card doubles the copies that your own improved deposits supply. A copy another empire lends you is not doubled, and a copy you lend away comes off the doubled figure.
- **Caravanserai Cities** — Being one to a realm and being one of the realm's great houses were a single mark doing two jobs, and this card is what needed them apart. They are two marks now, and every building that carried the old one carries both, so nothing about any existing row moved. The card lifts the limit and leaves the class exactly where it was: a realm may raise a yard in every town, and every one of them is still a great house — still priced against how many towns it will serve, still admitted wherever a card asks for an empire building, still counted as one of them, and still passed over by a discount written for the ordinary shelves. The card buys many of an expensive thing rather than turning it into a cheap one. One thing had to be made safe alongside it: the walk that gathers what a realm's great houses do used to read each town's shelf in turn, which was harmless while a realm could hold only one of each, so it now reads each row once however many copies stand.
- **The Endowment** — A town now writes down which bank paid for each of its roofs, beside the turn they went up. Either bank counts: a library bought with faith is as bought as one bought with gold. A roof completed in the yard, granted by a card or laid as a relic counts for nothing. A captured town brings its record with it, so a conqueror is paid for the roofs its last owner bought.
- **The World's Exchange** — An empire counts once, however many of your trade routes reach it, and only while one of those routes is running. The bonus goes to the Opus and to nothing else a city builds.
- **The Chartered Metropolis** — A town counts while three or more of your trade routes set out from it. A route that has been cancelled or plundered does not count.
- **The Admiralty of Trade** — Only the town the route goes to needs your trading post, and the post must be paying: a war or a blockade suspends the waiver as it suspends a post's income. Routes by land and by sea are treated alike. Nothing else about sending a route changes: a lane no caravan could use, a partner you have not met, a war, a full set of trade routes and a route already running that way are all still refused.
- **The Merchant Works** — Only the item at the front of the town's queue counts. The share is taken of the town's own gold before any other card converts it.
- **The Gilded Scaffold** — The treasury pays the wonder's full cost in hammers at the ordinary rate, and every other refusal at the counter still stands: a wonder another empire has already claimed, one whose technology is not in, and one whose site the ground does not hold are all refused as before. A wonder is still never bought by the faith bank, except in the one town whose own shelf opens it.
- **A Court of Merchants** — The share is taken of everything the realm earns in renown each turn, and never of a lump a triumph pays. The narrowing is a strong nudge and not a lock: when every great merchant in the world has been called, the draft goes back to showing the whole roster, so a court that has run out of merchants still deals a hand. A draft somebody bought narrowed to another family is dealt as what it was bought as.
- **Numidian Cavalry** — The rider can be built beside the Horseman rather than in place of it, once you reach the age of the Horseman's technology. Each kind of luxury you hold counts once, and a luxury you receive in a deal counts. A luxury that a trading post lends you does not count.
- **The Monopoly** — A luxury counts while you hold at least one copy of it, deals included, and no other empire holds any.
- **The World's Fair** — Each empire counts once, however many of your trade routes reach it. A capital that already holds your established trading post gains nothing more. The new posts pay as any other post does: not during a war, and not while the town is blockaded.
- **The Great Loan** — The loan is paid at the end of the turn you seat the card, as long as your gold income is above nothing.
- **Names in Stone** — Gold counts when you spend it on units, buildings, hexes, caravans and great people, and when you pour it into the Opus. Upgrades, gold given in a deal and gold spent to reroll a draft do not count.
- **The Fondaci** — A trading post is established after a full route term of unbroken trading with a town. A trade route leaves your trading post at both of its ends, so one route to a new town can establish two posts, and each pays by the size of its own town. A town that already holds your trading post does not establish it again. The moment comes whether or not the post is paying that turn.
- **The Champagne Fairs** — A fair counts each of your cities that one of your own trade routes reaches on the turn the fair is held, and pays for every citizen living there. The culture goes to your empire. The fairs are counted from the turn you seat the card.
- **Commission: The Great Fair** — A town counts while at least one of your trade routes from another of your towns ends there. The goal is checked at the end of each turn.
- **Land Speculation** — The culture is rounded down.
- **The Capitulations** — Only a trading post that is established and paying lends, so a post lends nothing during a war with the town's owner or while the town is blockaded. Each town lends the first luxury it has improved that you do not hold and that no other post already brings you. The towns are taken in the order they were founded. A borrowed luxury gives the same happiness and yields as one copy you hold.
- **The Casa da Índia** — Only the luxury's own food, production, gold, science, culture and faith are paid for each copy. Its happiness and every other effect still count once for each kind. Silver and gold already pay some lines for each copy, and those lines are not paid twice.
- **Letters of Credit** — Buildings, units, trade caravans, hexes and great-person drafts may all be bought on credit. Gold poured into a wonder or the Magnum Opus, and gold paid to redraw a hand of cards, must still come from gold you hold. While your treasury is below zero you still lose a share of your science and culture.
- **The Strongbox** — Your treasury is checked at the end of each turn, after your income, interest and upkeep are paid. The card counts only while it is seated, and it keeps what it has counted when it leaves its chair.
- **The Merchant Guilds** — Merchants in the trades are counted in all of your cities together.
- **The Nest Egg** — Your gold income is read after upkeep. Gold that a card pays to your empire as a whole, and not to a town, does not count.
- **Bills of Exchange** — Your gold income is read after upkeep. Gold that a card pays to your empire as a whole, and not to a town, does not count.
- **Money at Work** — Your gold income is read after upkeep. Gold that a card pays to your empire as a whole, and not to a town, does not count.
- **The First Caravan** — The caravan waits in your capital until you send it on a trade route. You can send it once you have room for a route, which a Market gives.
- **The Golden Age** — A wonder completed while the bonus runs starts it again, and does not add a second bonus. The Magnum Opus is not a wonder.
- **The Last Commission** — A great person counts whether they act or lay a work. A city is building the Magnum Opus while it stands at the front of its queue. While none of your cities is building it, the card pays nothing, and nothing is kept for later.
- **The Prytaneion** — Only the Orders sitting in a chair count, this one included. A charter takes no chair, so it does not count, and neither does a Doctrine.
- **The Polemarch** — Every unit gains it, on land and at sea, attacking or defending. This card counts itself, and a Military card in a Wildcard chair counts too.
- **The Court Painter** — A card picked from a free hand counts. Passing on a hand does not, and neither does a Doctrine or a great person. This card pays nothing for drafting itself.
- **The Second Reading** — This covers hands of Orders, Doctrines and great people, and it lets you reroll before you know Chronology. A belief hand's first reroll is already free.
- **The Nomarchs** — Only the Orders sitting in a chair count, this one included. A charter takes no chair, so it does not count, and neither does a Doctrine.
- **The Workshop at Olympia** — A wonder you captured counts.
- **The Keepers of Wonders** — A wonder you captured counts.
- **The Unveiling** — No hand is dealt while an Order hand or a Doctrine offer is waiting for your answer. The free hand does not raise the price of your next hand.
- **The Encyclopedia** — A charter counts, because it never takes a chair.
- **The Prefects** — This card counts itself, and an Economic card in a Wildcard chair counts too.
- **The Symposium** — No hand is dealt while an Order hand or a Doctrine offer is waiting for your answer. The free hand does not raise the price of your next hand.
- **Letters Patent** — It raises the gold, production, science and culture an act pays. A general's act pays none of these, so it gains nothing.
- **The Quarter of Masters** — The work's own yield is paid again once, however many works stand beside it. What other cards pay on the work is not paid again.
- **The Seven Sights** — A wonder you captured counts.
- **The Boule** — Only the Orders sitting in a chair count, this one included. A charter takes no chair, so it does not count, and neither does a Doctrine.
- **The Roll of Masters** — A great person counts from the moment you gain it, spent or not. Great people gained before this card was seated count too.
- **The Privy Council** — Each town, hex or empire line counts on its own, so a card that pays production in many towns gains in each of them. A percentage is not raised, and this card does not raise itself.
- **Commission: The Eighth Wonder** — Only a wonder finished in one of your own cities while this card is seated meets the goal. A wonder you captured does not, and the Magnum Opus is not a wonder. After that, every wonder you hold pays each turn, those built before the goal and those you captured included.
- **Commission: The Roll of the Senate** — Every Order you hold counts, seated or not, this card included. Charters and finished commissions count. A Doctrine does not.
- **Commission: The Wonder of the Age** — Only the production a city makes each turn counts, while a wonder or the Magnum Opus is at the front of its queue. Production you buy, or gain all at once, does not.
- **The Universal Library** — Every Order you hold counts, seated or not, this card included. Charters and finished commissions count. A Doctrine does not.
- **The Polymath's Study** — Every Order you hold counts, seated or not. A card that two decks share counts for both decks. The cards that belong to no deck count together as one more deck.
- **The Open Door** — The price of each hand you buy with culture is cut, then rounded down. Cuts from more than one card add together first. The number of drafts you have taken, the tiers at which a government is offered, and the better odds a pass buys do not change.
- **The Accessions Register** — The production is rounded down. A charter counts. A card from a free hand pays nothing, because that hand cost no culture. A hand you reroll keeps the price of the hand it replaced. This card pays nothing for drafting itself.
- **The Unwritten Chapter** — The science is rounded down. Passing on a free hand pays nothing, because that hand cost no culture. A hand you reroll keeps the price of the hand it replaced.
- **The Wandering Muse** — If a great person is already waiting for your choice, or you cannot call great people yet, you gain the renown still needed for your next great person instead. A card picked from a free hand counts.
- **Officials by Merit** — Hands of Doctrines and great people may still be rerolled. A hand never holds more than five cards.
- **The Hall of Wonders** — A wonder you captured counts, and the Magnum Opus is not a wonder. The wonders are counted when the hand is dealt. A hand never holds more than five cards.
- **The Sed Festival** — The card pays only if it still has a chair once the new government seats your council. If a great person is already waiting for your choice, or you cannot call great people yet, you gain the renown still needed for your next great person instead.
- **The Pandects** — Every Doctrine you hold counts, whatever its deck.
- **Commission: The Golden Bull** — A chair held by a malice is left out. An empty Military, Economic or Civic chair is not in order. While no Doctrine of your government's tier is left to offer you, or a Doctrine offer is already waiting for your answer, the card stays in its chair and pays when an offer can be made.
- **Commission: The Patron's Gallery** — A work counts wherever it stands in your borders, whoever laid it, and whether or not a city works it. A Holy Site counts as a family of its own. If a great person is already waiting for your choice, or you cannot call great people yet, you gain the renown still needed for your next great person instead.
- **The Immortals** — A legacy you have lost counts for nothing. A legacy that only allows something gains nothing from counting twice. The cards that count your great people, or their families, still count each person once.
- **The Landmark Bounds** — The hexes join your nearest city. A hex that a city already owns, yours or a rival's, is left alone. A Holy Site that a prophet raises is not laid by a great person, so it claims nothing. A Citadel still takes the hexes around it, as it always does.
- **The Envious Eye** — It counts wherever the wonder stood in the queue. If the production covers the next item, that item is finished at once. A city with nothing else in its queue gets gold back, as it would without this card.
- **Commission: The Ideal City** — A wonder you captured counts, and the Magnum Opus is not a wonder. A great-person work counts when one of the city's citizens works it, whoever laid it. If more than one city meets the goal, the oldest of them gains the bonus.
- **The Grand Vizier** — While this card is seated, the council screen names each chair by its place, so you can see which Economic chair is first. Only the yields that card pays your cities and your empire count twice. Its bonuses on hexes, its percentages, the yields it pays as a share of another yield, and its rules do not. A loss of gold on that card counts twice too. If the chair is empty, or your government has no Economic chair, this card does nothing.
- **The Divine Proportion** — Every card you have seated that adds a yield to a great-person work adds it twice, a partner deck's cards included. A bonus paid for each hex beside the work is doubled for each such hex. A bonus a city gains for working a work, a share of a work's own yield, a bonus that depends on the city working the hex, and a leader's bonus are not doubled.
- **The Second Sitting** — Passing on a free hand deals nothing, because that hand cost no culture. A hand you reroll keeps the price of the hand it replaced. No hand is dealt while a Doctrine offer is waiting for your answer. The free hand does not raise the price of your next hand, and you keep the better odds the pass bought.
- **Magnificence** — Only the wonder at the front of a city's queue can be bought, and never the Magnum Opus. The production the city has already put into it counts toward the price and is used up. The culture comes from what you are saving for your next Order hand. Every other rule of buying still applies, and cards that make buying cheaper or dearer change this price too. Buying with culture does not count as spending gold or faith.
- **The Mixed Constitution** — This card itself goes in a Wildcard chair. While it is seated, any card you hold may sit in any chair, and when you adopt a government every seated card keeps a chair while chairs remain. When it leaves its chair, your council is seated again at once: a card that still fits its chair keeps it, the others move to free chairs that fit them, and a card that fits no free chair goes back to your collection. A card that had to move may be moved again at once. A card still counts as its own type wherever it sits.
- **The Universal Genius** — What counts is whether this card is seated when a great person acts. If it is, the act pays as usual and the person stays where they stand. They may then lay their work, even after this card has left its chair, but they cannot act again. Their legacy, and anything that pays when you spend a great person, comes once, when the work is laid. A great person who lays their work without acting is spent at once, as usual. Acting does not use their movement.
- **The Cabinet of Curiosities** — The card comes from the cards of your current tier in the decks you do not hold. A card two decks share can come only if you hold neither deck. A card you already hold, or a card that belongs to no deck, never comes. Common cards come more often than rare ones, as in an ordinary hand, and passing on hands does not change the odds. The card counts as drafted: a charter opens what it opens, a card that gives something when drafted gives it, and cards that pay when you draft a card pay for it. It came from no hand, so a card that pays a share of a hand's price pays nothing for it. If no such card is left, you gain nothing.
- **The Grand Retrospective** — Everything is counted once, at the moment you draft this card. Every Order you hold counts, seated or not, this card included; charters and finished commissions count, and a Doctrine does not. A wonder you captured counts, and the Magnum Opus is not a wonder. A great-person work counts wherever it stands in your borders, whoever laid it, and whether or not a city works it; a prophet's Holy Site counts too. The culture and science go to your empire, and the production goes to your capital.
- **Commission: The Paradise Garden** — The work in the middle must stand in your borders. A hex beside it counts whoever owns it, and a prophet's Holy Site counts as a great-person work. The new hexes join your nearest city, and a hex that a city already owns, yours or a rival's, is left alone. If more than one of your works meets the goal, the land is claimed around the one furthest north, and of those the one furthest west. A claimed hex can lie beyond the reach of your city's citizens.
- **The Processional Way** — A line runs straight along the hexes, in any direction, with each work beside the next and no gap. Every work of the line must be in your borders, and a prophet's Holy Site counts. A work on more than one line gains the bonus once. Like every bonus on a hex, a work pays it only while one of your cities works it.
- **The Pull of the Masters** — This happens at the end of each turn, after borders grow, and peace or war does not matter. Every great-person work in your borders pulls, whoever laid it, and a prophet's Holy Site counts. Each work tries the hexes beside it in turn and takes the first one it may. A hex that a citizen of its town is working stays, and so does a hex with a great-person work on it; anything else on the hex, such as a farm or a road, comes with it. The hex joins your nearest town, but only if it is close enough for that town's own borders to reach; otherwise the work tries its next hex. A hex taken this turn cannot be taken again in the same turn, so when works of two empires reach for the same hex, the empire listed first among the players takes it.
- **Letters of Marque** — The coin is for a kill made by one of your ships, wherever it happens.
- **Pilgrim Markets** — One Holy Site at either end is enough, and a route with a Holy Site at each end is paid once. The Holy Site may stand anywhere inside either town's borders, and nobody has to work its hex.
- **Sacred Patronage** — A great person bought with faith costs the same faith each time. What rises is the renown each later great person needs.
- **Professional Soldiers** — The strength is given when the unit is bought while this card is held, and the unit keeps it for life.
- **The Chartered Company** — Once the charter is drafted, the Company Guard can be hired from late in the last age of the technology tree.
- **Mercenary Contracts** — A military unit bought with gold or with faith while this card is seated is covered from the turn it is bought. It keeps the waiver for the whole term, even if the card leaves its chair. Ships are not covered.
- **The Brokers' Redraw** — The gold price is a multiple of the faith price, so faith stays the cheaper way to reroll. A reroll in either bank raises the same count, and a hand whose first reroll is free stays free in both. Gold may reroll any hand that faith may, not only an Order hand.
- **The Art Dealers** — Only the Orders sitting in a chair count, this one included. A charter takes no chair, so it does not count, and neither does a Doctrine.
- **The Consecration Feast** — A Cathedral bought with faith or gold is finished too, so it pays as one that was built.
- **The Creed** — Your gods count before you found a religion. Each religion you are paid by adds its follower and enhancer beliefs. A holy city you capture does not add the gods of the empire that founded it.
- **The Gifts of the Faithful** — Shrines, Temples, Cathedrals and the other religious buildings may be bought with faith in every town. Wonders keep their own rules.
- **The Book of Life** — Faith counts when you spend it on units, buildings, rites, rerolls, gods and great people, and when you pour it into a build.
- **The Offering Chests** — A unit bought with gold pays the full price. The discount adds to any other discount before it applies.
- **The Rogations** — Only a rite that lasts counts. The Votive Offering and the Restoring of the Host act at once, so they do not. A prophet's rite over the whole realm counts once in each town it reaches.
- **The Sabbath Laws** — Production the town buys, or is given at once, still goes into what it is building.
- **The Psalter** — Only a rite that lasts counts. The Votive Offering and the Restoring of the Host act at once, so they do not. A prophet's rite over the whole realm pays in each devout town it reaches.
- **The Parishes** — A town you found follows your religion from its first turn, however many citizens it starts with. If no religion pays you, nothing happens.
- **Commission: The State Church** — Every town you hold must be devout at once. The goal is checked at the end of each turn.
- **The Confessors** — A foreign town that follows your religion shows you what a town sees, but not what its owner's buildings and cards add. What you see from those towns is updated when one of your units moves and at the end of each turn.
- **Pentecost** — Each time, it presses as hard as a prophet's proclamation, but cards that change a proclamation do not change it. A town it turns presses the towns around it in turn. Each town counts at most once a turn for each religion, so a chain always ends. If more than one religion pays you, each one presses.
- **The Mass Baptisms** — A town that turns away and comes back pays only once. Your own towns never count.
- **The Anchorites** — Founding a religion still costs both of a prophet's charges. Under The Abbeys, an apostle pays the same lower price.
- **The Caliphate** — A town that stops following your religion costs authority again. While this is seated, the reward of Commission: The State Church has nothing left to do.
- **The Abbeys** — An apostle can raise a holy site only once you have founded a religion, so it never founds one. It pays what a prophet pays for a further holy site.
- **The Interdict** — Only a town building the Magnum Opus is stopped, and only while it follows your religion. Your own towns are never stopped.
- **The Turning of Swords** — Only your own attack turns a unit, and only a land soldier of an empire you are at war with. A city's garrison and a barbarian never turn. The unit joins at full health and costs you no upkeep. It counts as a loss in its empire's war, but not as a kill or a death for your cards or theirs.
- **The Double Feast** — A town cannot keep the same rite twice. A prophet's rite over your whole realm takes a free place, or the place of the older rite. Cards that ask whether a town keeps a rite do not pay twice, but cards that count rites started count both.
- **Common Tools** — † the hammers are for workers and buildings, and for nothing else
- **Road Crews** — † a worker that wakes on one of your roads travels further that day
- **Road Maintenance** — † the upkeep of your roads is reduced, up to a limit each turn
- **Emergency Stores** — † the hammers are for buildings, and for nothing else
- **City Watches** — † a soldier standing inside one of your towns mends faster there

## Themes (the archetype lines)

The `line` tag — presentation only, read by no draw; the decks are the card's home.

| Line | Playstyle | Ideas |
|---|---|---|
| 🏹 **The Wild Hunt** | barbarian economy |  |
| 🐫 **The Long Caravan** | luxuries, gold, duplicates |  |
| 🌱 **The Green Belt** | tall growth |  |
| ⚒ **The Forge Levy** | wide production, war |  |
| ✶ **The Star Chart** | science |  |
| 🕯 **The Procession** | faith engine |  |
| 🧭 **The Wayfarers** | exploration |  |
| 🏛 **The Marble Court** | wonders, renown, great people |  |
| ⚓ **The Tide** | trade routes, the sea, coastal empire |  |
| 🎖 **The Banner** | the *pace* of war — levies, muster, decisive battle |  |
| 🜍 **The Athanor** | the Magister's sciences — alchemy, automata, the Great Work |  |
| ☽ **The Cloister** | spiritualism — faith + science |  |
| 📜 **The Charter** | expansionist — wide cities → authority → more settling |  |
| 🌾 **The Ploughshare** | agrarian — stacking yields on farms |  |
| ⛰ **The Highlands** | mountains — hills and mountain bonuses |  |
