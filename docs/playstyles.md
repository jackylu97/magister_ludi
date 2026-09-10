# Playstyles — the two families (worksheet, 2026-09-10)

A worksheet in the `war-diplomacy.md` shape: what exists is stated with its data
key, ▢ is a decision still open for the user, (rec) is the orchestrator's default
and stands unless overruled. Nothing here flies until a ▢ is marked and a batch
is cut on the flags board. The user edits this file directly during the balance
pass; the batches read it back.

Where it came from: the design conversation of 2026-09-09/10 (maritime yields,
wide land, imperium and steppe, land commerce, tall, faith), item (rrr) on
`docs/flags.md`.

## 0. The shape

- **Two families a first-time player can read**: **wide** and **tall**. Each has
  sub-identities that blend rather than exclude:
  - **Wide** — many towns; the army is **melee** (the imperium) or **mounted**
    (the steppe); the economy is **land commerce** (plantations, caravans,
    tolls) or **sea commerce** (fishing, harbours, foreign routes). Imperium +
    land commerce and imperium + sea commerce are both meant to blend; steppe
    stands further apart.
  - **Tall** — one or two great cities; **science, culture and wonders**, with
    **great people** and **walls** as history insists; the **holy city** for
    faith; a **hub** for trade rather than a sender.
- **Costs and gains must scale on the same axis.** Wide's costs scale by
  *count* (authority, escalation) and so must its gains (per-city flats, route
  slots per building, connection gold). Tall's costs scale by *size* (happiness
  per citizen, the third ring) and so must its gains (per-citizen buildings,
  compounding percents, slots per size band, strength per citizen). The
  weakness of tall today is that most of its gains still scale by count.
- **Each family climbs the happiness wall its own way**: the merchant buys
  contentment (luxuries, imports, gold for buildings), the general marches it
  (roads home, garrisons, spoils), the tall city grows it (per-citizen
  buildings, the arena line) and imports it (few rich routes).

## 1. Improvements pay their voice (the base fix, both families)

The resource improvement pays the *commercial* voice; the terrain under it
feeds the town. Today three improvements pay food where history paid gold, and
the sea's two buildings pay food on every water hex.

| Improvement | Today (`data/improvements.json`) | (rec) | Why |
|---|---|---|---|
| Fishing boats | +1 food +1 gold on six resources | **+2 gold** | fishing was subsistence; the sea's wealth was trade |
| Plantation | +1 food, 0 gold on thirteen luxuries | **+2 gold** | cash crops are the definition of a commercial economy |
| Camp | +1 food +1 gold | keep | trapping fed and paid |
| Pasture, mine, quarry, farm | unchanged | keep | the steppe's and the imperium's ground |

Sea buildings (`data/buildings.json`), today: Harbour +1 food on every water
hex (+ a route slot); Lighthouse +1 food on every water hex, 2 gold; Shipyard +1
production on water resources. A worked ocean tile under Harbour + Lighthouse
is **3 food 1 gold** — the food glut is the two buildings, not the boats.

- (rec) Harbour: **+1 gold** on water (keeps its slot); Lighthouse: **+1 gold**
  on water, flat gold down to 1. Water base stays 1 food 1 gold, so a worked
  ocean hex is 1 food 3 gold: worked for coin, growth imported.
- (rec) **Exactly one food layer on the sea** so a coastal town is not starved:
  Harbour +1 food on water *resource* hexes only (the catch lands somewhere).
  ▢ or the boats keep +1 food instead — one, not three.
- Coastal authority relief (`rules.authority.coastalCity`) **stays**: wide is
  the point; the pressure is happiness and the answer is trade.

## 2. Wide — the imperium (melee, roads, garrisons, puppets)

History: Rome, Persia, the Han. Held what it took with roads, legions and
client kings; paid for by the provinces.

What exists: melee cheaper / stronger (Orders at `statecraft.json` 1317, 2914,
3160, 3839); Satrapies (a road-joined city is content and pays gold); domestic
routes pay food and hammers off the destination's buildings
(`rules.trade.buildingsPerFood/Production`) and the trader **paves the road**;
puppets cost less authority than annexed towns (`rules.war.puppetAuthorityRelief`);
the capture sheet (K1) prices annex / puppet / raze; escalation
(`UnitDef.escalation`) is the tax.

- **Roads are the spine.** (rec) Domestic routes weight **hammers first**, food
  second — the supply road is how a conquest gets its walls and forge; the road
  outlives the route and Satrapies pays on it. Say it on the trade screen
  ("paves a road home").
- **Martial law** (Civ IV's): a garrisoned town demands less — (rec) +1
  happiness per garrisoned unit, **capped at 2–3**, carried by a Government tier
  or an Order, never the base rules. Build soldiers, station them, hold more
  towns; the soldier in the city is the one that fights (ties to the military
  tech edge the user wants). ▢ figures.
- **Puppets are the empire**: mostly puppets held by garrisons and roads,
  annexing the prizes. PP1 (batch, in flight) makes puppets build real things.
- **Conquest pays happiness**: (rec) a Triumph on capture paying happiness for a
  spell (`Player.timed`), or the Amphitheatre / Colosseum line scaling with
  garrisons. The sea build never gets this.
- **No authority discount for the land build.** Authority is what should hurt
  it; garrisons and puppets are how it copes. If both families get cheap
  authority the fork collapses.

## 3. Wide — the steppe (mounted, pastures, spoils, tribute)

History: Scythia, the Huns, the Khanates. Rode through provinces rather than
holding them; took tribute; when it settled it became an imperium.

What exists: mounted +movement / +strength Orders (1619, 2016, 5113); pastures
(`herdGods`); pillage bounty (`rules.trade.pillageBounty`); plunder of routes;
hit-and-run on the light hulls; H1 Horde held on the board.

| | Imperium | Steppe |
|---|---|---|
| Army | melee, cheaper per hammer | mounted, faster, pastures |
| Holding | garrisons, roads home, puppet → annex | **tribute**: puppets pay gold, never annexed; no garrisons |
| Ground | hills, rivers, forge | grassland and plains, open ground |
| Happiness | roads home + garrisons | **spoils**: a pillage or capture pays happiness for a spell |
| Economy | domestic routes, production | pillage bounty, plunder, tribute gold |
| Weakness | slow, road-bound, escalation | cannot hold cities; few of its own; ZOC-heavy ground |

- **Spoils** (rec): a pillage or a capture grants a timed empire happiness
  effect (windfall rider + `Player.timed`, shapes that exist). Decays if the
  horde stops. ▢ figure and duration.
- **Tribute** (rec): under one Order a puppet pays **gold per citizen** to the
  overlord *instead of* the authority relief — the steppe wants puppets it never
  annexes; the imperium wants to annex. ▢ rate.
- The steppe never builds the road; mounted movement is its road.

## 4. Wide — land commerce (plantations, caravans, tolls, mercenaries)

History: the caravan cities (Palmyra, Petra, Samarkand), Mali, the Silk Road
polities. Cash crops, luxuries, tolls, banking; ideas travelled with goods.

What exists: Market and Caravanserai give route slots; Caravanserai pays food +
production on routes it originates; Bank +20% gold where routes end
(`routeEndsHere`); Bazaar pays gold per unique luxury in the city; six Orders
pay science / culture on routes (3535, 3931, 5250, 5482 …); luxuries pay
happiness per unique kind (`resourceEffects.ts`), a second copy nothing (30%
under one card).

- **Plantations pay gold** (§1) — the one big fix; the mapgen already clusters
  the thirteen luxuries.
- **The Silk Road in the base**, not only in cards (rec): a route's science and
  culture scale with the **unique luxuries at its origin** — +1 of each per two
  luxuries — a `pays` row on the count the Bazaar already reads. Makes the
  plantation empire's routes ramp on their own. ▢ rate.
- **Tolls** (rec): gold **per road hex you own**, on the Caravanserai or a
  mid-tier Order — a new `count` reading. Rewards the imperium's road network
  in the merchant's currency; gives domestic routes a reason after the road is
  paved. ▢ rate, ▢ which row carries it.
- **Mercenaries** (rec): one card — units bought with gold skip the escalation
  ladder, or cost less. The hinge between commerce and imperium: the merchant
  funds the standing army the general fields. ▢ which.

## 5. Wide — sea commerce (fishing, harbours, foreign routes, navy)

History: Phoenicia, Carthage, Athens' Piraeus, Venice, Genoa, the Hansa, the
Dutch, Portugal. Rich and thin, not tall; bought what they could not build;
grain by sea; navigation science.

- §1's yield changes make the sea pay gold and keep one food layer.
- **Foreign routes are the sea's thing** (gold, science, culture, luxuries);
  domestic routes are the imperium's. A land empire *can* run foreign routes
  but they are not its identity.
- **Purchase is the Venetian move**: gold buys the happiness buildings; the sea
  build produces little and buys much (`purchase.ts` as it stands).
- Navy: N1's waterline rules; `docs/units.md` for the triangle.
- ▢ a luxury-copy-by-route rule (§7) helps the sea build second-most after tall.

## 6. Tall — the library city, the wonder city, walled

History, by what made them tall: **Athens** (one city, league tribute, drama,
philosophy, the Parthenon); **Ptolemaic Alexandria** (Library, Museum,
Lighthouse); **Abbasid Baghdad, Umayyad Córdoba** (science by patronage);
**Florence** (banking money into artists and great people); **Constantinople**
(one city behind walls for a thousand years); **Song Kaifeng and Hangzhou**
(largest on earth; printing, gunpowder, paper money); **Egypt, Angkor,
Tenochtitlan** (few cities, enormous ones, monumental building; engineered
fields).

What exists and already scales by size: Library 0.5 / Monastery 0.25 /
University 0.75 / Alchemical Society 1 **science per citizen**; Amphitheatre
**+1 culture per 2 citizens**; the Observatory and Capital of the World wagers;
wonders' renown; great people through the Reliquary; per-follower religion rows
(§8). What does **not** scale by size: **happiness** (every building pays a flat
figure; only the Assize Court's demand relief exists), **city strength**
(`rules.combat.cityStrengthPerPop` = 0), **renown**, **route slots**.

- **Cities defend by size** (rec): set `rules.combat.cityStrengthPerPop` > 0 so
  a city of 20 is a fortress — Constantinople; the single change that lets a
  tall player survive an imperium next door. ▢ figure.
- **A happiness line that pays per citizen** (rec): the arena / theatre tier
  pays +1 happiness per N citizens (the amphitheatre's own shape, `count:
  population, per: N`). ▢ which rows, ▢ N.
- **Great people scale with the capital** (rec): renown per citizen in the
  capital, or per wonder standing in it — one `pays` row; the Reliquary and the
  great-work seams exist. Florence. ▢ rate.
- **Wonders are tall's beads**: keep the wonder bead grants (Chart the Stars,
  The Turning Heavens, The Codex) after all — for tall they are the point.
  ▢ a wonder-production percent that scales with the city's size (Egypt's
  monumental labour) — a `percentYields` with a population count.
- **Percent stages compound** for tall by construction (`applyStages`): a
  per-citizen base × city % × empire %. Wide keeps its flats.

## 7. Routes — by count for wide, by size for tall

Today: route slots come from **buildings** (Market, Caravanserai, Harbour,
Shipyard, Colossus) and a few cards, so slots scale with city count; a route's
gold scales with the **combined population** of its two ends
(`rules.trade.goldPerCombinedPop`), so a tall capital's few routes are the
richest on the map. History: the tall cities *were* the hubs (Piraeus,
Alexandria, the Bosporus, Kaifeng at the end of the Grand Canal) — they did not
send many caravans; they were where the caravans went.

- **A slot per size band** (rec): a city earns a route slot at 10 citizens and
  another at 20 (a `count: population` reading on a `routeSlots` line). Wide
  keeps slot-per-building. A town of 20 with Market + Caravanserai runs four;
  four towns of five run four. Same count, different shape, tall's pay more.
  ▢ bands.
- **The hub pays the host by size** (rec): `rules.trade.international.hostGold`
  scales with the host's population, so the tall capital is the destination
  everyone wants and profits from peace. Bots pick destinations by value and
  will come on their own. ▢ rate.
- **Luxuries by route** — **not in the game today** (a luxury pays coin *on*
  routes; nothing carries a luxury *to* a city). (rec) a **foreign** route to a
  city holding an improved luxury you lack counts as **half a copy** at the
  origin; **one luxury per route**; **unique kinds only** (a second copy pays
  nothing, as today); lapses with the route (twenty turns, plunder, war). The
  bounds are what keep it from being wide's free lunch: the ceiling is the
  handful of kinds reachable rivals hold and you do not, every route abroad is
  a road not paved at home, and happiness that arrives by caravan leaves by
  caravan. Helps tall most, the sea second. The bots need a want for it or it
  pays only humans (a W2-style want, same batch). ▢ rule in or out, ▢ half.

## 8. Faith — wide's per-building beliefs, tall's holy city

Read off `data/religion.json` (live rows):

- **Per city that follows / per building** (wide's): Feast Days, Lamps of the
  Shrine, The Quiet Hours, Holy Water, The Scriptoria, Guild of the Faithful,
  Pilgrim's Coin, Congregation, Sacred Fire, The Standing Stones, Keeper of the
  Hearth.
- **Per citizen / per follower** (tall's): Choirs (+1 culture / 4 citizens),
  Tithe Houses (+1 gold / 3 citizens), The Long Prayer, Ancestor Worship, and
  the **consecrations** (Scholar's Crypt, Choir Loft, Eternal Flame — per
  follower in *this* city) and the **rites** (city-scoped, so a tall city gets
  their whole value); Marvels of the Faith (per following city *holding a
  wonder*) and Mason's Chapel (+10% wonders) are tall's too; faith buys great
  people (`OFFER_PURCHASES`) and the faith houses.
- **The hole**: a tall empire **presses weakly** — pressure radiates from holy
  sites and cities, and one city is one source — so every "per city in the
  world that follows" enhancer pays it less, and its religion rarely leaves
  home. History says the opposite: the holy *city* (Rome, Constantinople,
  Jerusalem, Mecca, Varanasi, Angkor, Kyoto, Lhasa) was the religion's centre
  of gravity precisely because it was one great city, and pilgrims came to it.
- (rec) **The holy city presses by size**: the holy site's pressure scales with
  its city's population (`bankPressure`'s one caller `spreadReligion`, the
  figure read off the holy city), so a great city is a great faith. ▢ rate.
- (rec) **Pilgrimage**: foreign followers pay the **holy city** — faith or gold
  per following foreign city, banked in the holy city (Apostles doubles what
  foreign followers pay; this is the tall-shaped sibling, paid *to a place*).
  ▢ voice, ▢ rate.
- (rec) **More per-follower follower rows** so the tall city's own congregation
  is worth as much as wide's ten shrines: a happiness-per-followers row
  (Feast Days' tall sibling), a science-per-followers row. Two JSON rows.
- The wide story needs nothing new: it already has the per-building rows, and
  the Scriptoria / Guild rows scale with its count.

## 9. Batches (proposed cut, after the user's science pass)

1. **Y1 — improvements pay their voice**: §1 (boats, plantations, Harbour,
   Lighthouse), Compendium regenerated, `docs/luxuries.md` / yields docs synced.
2. **R5 — routes by size**: §7 slots per band + host gold by size (+ ▢ luxuries
   by route with its bot want).
3. **L1 — the land family's cards**: martial law, spoils, tribute, Silk Road,
   tolls, mercenaries (§2–§4) — card-vocabulary rows, one or two new counts.
4. **T4 — tall**: city strength per citizen, happiness per citizen line, renown
   by the capital (§6).
5. **F1 — the holy city**: §8's three.

Each is data plus at most one new reading; none needs a new civ system — a
player becomes the steppe or the hub by the cards they take and the ground they
settle.

## 10. Orders and doctrines — what still fits, what is owed (2026-09-10)

Read off `data/statecraft.json` (169 live Orders, 48 doctrines, 16
governments) against §0–§9 and the user's tree pass (`docs/flags.md` (uuu)).
Nothing here is built; the user marks `docs/orders-and-doctrines.md` by hand.

**Well served already** (no new card needed):
- Imperium: The Legion, Forced Marches, The Standing Levy / Levée en Masse, The
  King's Road, Field Hospitals, The Standing Army (doctrine), the Imperium and
  Sultanate governments, The Empire; **The Long Watch** (+1 happiness per unit
  standing in a city, +1 per fortification) *is* martial law — (rec) make it
  the imperium's centrepiece: rename *Martial Law*, cap at 3 per town.
- Spoils (steppe): Iron Price (kill +20 culture, pillage ×2), Scorched Earth,
  Tyranny's pillage, The Triumphal Way (capture → +5 happiness 10 turns), The
  Saddle's new pillage rider.
- Commerce: Silk Roads, The Wayhouses, Ledger Keepers, The Silk Exchange, The
  Provisioners (+1 happiness per domestic route — the imperium's road payoff),
  The Marshal's Purse (units 25% cheaper to buy — mercenaries-lite).
- Tall: Hermit Crown (≤4 towns, capital +30%), Census Rolls (+1 happiness per
  2 capital citizens), The Founding Oath, The Lamp Kept Lit, The High Chancery,
  The Gentle Yoke (less demand per citizen, more authority per city — the
  right trade), Pax Imperia / Pax Magistri / The Grain Dole (per-size towns);
  wonders: Guild of Masons, Wonder Feasts, Master Builders, Magister's Court,
  The Grand Tour, Patrons; great people: The Laureate, The Salon,
  Groundskeepers, Master's Presence.

**No longer fit, or fit the old identities** (▢ each):
- **Mare Nostrum** — "coastal cities cost no authority" duplicates the base
  coastal relief (`rules.authority.coastalCity`); (rec) drop that clause, keep
  the water yields (now gold-leaning per §1).
- **The Orchard Tithe** (+2 food on luxury hexes), **First Fruits** (+2 food on
  resource hexes), **Common Granary** (+2 food in towns with an improved
  luxury) — the plantation's old food identity; with plantations paying gold
  (mark 12) these read against the grain. (rec) Orchard Tithe → +2 gold on
  luxury hexes; the other two stay as the farm-belt's.
- **The Grain Fleet** (+6 food coastal, +50% growth) and **Fish Weirs** (+1
  food on boats) — the sea-as-food identity. (rec) Grain Fleet → the
  entrepôt (below); Fish Weirs → +1 gold on boats or retire.
- **Manifest of the Steppe** (settlers cheaper and faster) is wide-founding,
  not the steppe. (rec) re-theme: mounted units +1 movement on open ground
  and pay no upkeep outside your borders.
- **Four generic route multipliers** — The Sea Charter (×1.5), Merchant
  League's ×1.5, The Escorted Roads (+30%), The Exchequer (×2). (rec) keep
  two (the government's and The Exchequer as the rare), retire the other two
  in favour of tolls and the hub.
- **Harbourmasters** (+1 route, +2 gold on boats) — with the Harbour and
  Shipyard slot-less (marks 8, 16), this card is the sea build's *only* route
  source and should say so: (rec) "+1 trade route in every coastal city with
  a Harbour" — the sea chooses slots-by-count as a card.

**Payoff cards owed** (each one JSON row on an existing shape unless noted):
1. **Tribute** (steppe, economic, uncommon): a puppet pays +1 gold per 2
   citizens to you *instead of* its authority relief. New rule kind.
2. **Riders of the Steppe** (military, rare): mounted units ignore zone of
   control. New flag rule (`zoc` kind exists).
3. **Tolls** (land commerce, economic, common): +1 gold per 4 road hexes you
   own. New `count: roadHexes`.
4. **Mercenaries** (commerce ↔ imperium, economic, rare): units bought with
   gold do not raise the escalation ladder. New rule.
5. **The Entrepôt** (sea and tall, economic, uncommon): international routes
   ending in your cities pay the host +1 gold per 5 host citizens. New
   `count` on the host's population at `routeEndsHere`.
6. **Patronage** (tall, wildcard, uncommon): +1 renown per 4 citizens in your
   capital. `pays … to: renown` on a capital population count — the shape
   exists.
7. **The Holy City** (faith, tall, wildcard, rare): your holy city presses its
   faith harder for every 4 citizens it holds. A belief-side rule (§8).
8. **Pilgrims** (faith, tall): every foreign city that follows you pays +1 gold
   to your holy city. `pays where: city` on the `followingForeign` count,
   scoped to the holy site.
