# The Tree — cohesive re-cut from the themes (2026-09-02)

The tech tree, rebuilt from the ratified theme sheets. Principles, all ruled:
- **Neutral tree**: nodes unlock buildings, units, and spikes; abilities live on cards and
  building rows. The seven legacy effect-techs stay as exceptions.
- **Simple graph**: every node has one or two parents, no more. Lanes read left to right.
- **Pruned first**: filler is out (it's easy to add back — the shelf at the bottom holds it).
  A node earns its place by a necessity or a ★ power spike.
- Costs follow Entry LIV's bands: I 8–26 · II 45–195 · III 340–640 · IV 720–1140.
- The game ends at Æra IV (the Opus closes it); Æra V is a shelf, not a promise.

## Æra I — Omens (11 nodes)

### Agriculture — START · 15
- Settler (unit) — 0 str · 2 mv · cost 28 · founds a city; consumes a population.
- Warrior (unit) — 8 str · 2 mv · cost 10.
- Scout (unit) — 5 str · 2 mv · cost 13 · ignores terrain cost.
- Worker (unit) — 0 str · 2 mv · cost 14 · 3 charges.
- Farm (improvement) — +1🌾; on fresh water and floodplains too.

### Husbandry ← Agriculture · 8
- Horseman (unit) — 12 str · 4 mv · cost 17.
- Pasture (improvement) — works Horses, Cattle, Sheep.
- reveals Horses (passive).
- The Temple of Artemis (wonder) — +2🌾 +1🕯 · its hexes with Camps and Pastures pay more.

### Fletching ← Agriculture · 8
- Archer (unit) — 7 str · rng 2 · 2 mv · cost 11.
- Camp (improvement) — works Furs, Ivory, Deer.

### Sailing ← Agriculture · 8
- embark (passive) — civilians may cross coast; military embark waits for Wayfinding.
- Trireme (unit) — 10 str · 4 mv · cost 12 · the first hull.
- Fishing Boat (improvement) — works sea resources.
- The Great Lighthouse (wonder) — +1💰 on Fishing Boats · coastal cities +1 sight · +1 trade route.

### Mining ← Agriculture · 8
- Mine (improvement) — +1⚙, hills and ore.
- Quarry (improvement) — works Stone and Marble.

### Earthenware ← Agriculture · 8
- Granary (building) — cost 21 · +3🌾.
- The Hanging Gardens (wonder) — +25% food surplus stored toward growth · +1🌾 on farms beside fresh water here.

### The Wheel ← Husbandry · 26
- War Chariot (unit) — 14 str · 4 mv · cost 24.
- Chariot Archer (unit) — 9 str · rng 2 · 3 mv · cost 20.

### Bronzeworking ← Mining · 16 ★
- Spearman (unit) — 11 str · 2 mv · cost 11.
- Barracks (building) — cost 25 · +1 renown/turn · unit XP home when veterancy lands.
- Funeral Games (building) — cost 49 · +3☺.
- The Walls of Uruk (wonder) — capital: +10 city defence · +2 str inside its borders · +2 authority capacity.

### Stonecraft ← Mining · 16
- Monument (building) — cost 21 · +2🎵.
- Palisade (building) — cost 42 · +15 city hp.
- Stonehenge (wonder) — +1 pantheon slot · +1🕯 on Stone/Marble hexes · a free Augur on completion.
- The Pyramids (wonder) — new workers gain +1 charge.

### Divination ← Earthenware · 16 ★ (the faith door)
- Augur (unit) — bought with faith only · 3 rites, or 1 god (consecration).
- Shrine (building) — cost 15 · +1🔬 +1🕯.
- The Oracle (wonder) — +1🕯 here · +1 card in every Statecraft and Doctrine draft.
- the first rites (passive) — Rite of the Harvest (+1 pop), Omen Reading (+15🔬), Recasting the Omens.

### Letters ← Earthenware · 24
- Library (building) — cost 28 · +2💰 +2🔬 · +1🔬 per pop.
- The Great Ziggurat (wonder) — +2🕯 +2🎵 · faith purchases cost less here.

## Æra II — Heroes (7 nodes)

### Kingship ← Letters · 65
- Stele of Laws (building) — cost 36 · +1🎵 · +2 authority capacity *(proposed — its reason to exist post-authority-rework)*.
- the government ladder's home (passive) — flavor anchor; tiers ride drafts, not techs.

### Epic Poetry ← Letters · 150 ★
- verse for the fallen (passive, legacy effect-tech) — when a unit of yours dies, its nearest city gains culture.
- Amphitheater (building) — cost 74 · +3🎵.
- Hall of Deeds (building) — cost 32 · +2🎵 +1☺ · +1 renown/turn.
- The Theatre of Dionysus (wonder) — +4🎵 · +1☺ per Amphitheater you hold *(proposed rework — editable)*.

### Ancestor Rites ← Divination · 105 ★
- the great-person offer opens (passive) — renown starts buying names.

### The High Temple ← Divination · 120 ★
- Prophet (unit) — bought with faith · founds or enhances a religion (consumed) · proclaims · plants holy sites.
- Temple (building) — cost 53 · +2🕯 · holds off foreign pressure.
- founding (passive) — a religion, from your pantheon.

### Currency ← The Wheel + Letters · 195 ★ (the trade door)
- Trader (unit) — cost 28 · runs one route.
- Market (building) — cost 59 · +3💰.
- Bazaar (building) — cost 44 · +2💰 · +1💰 per luxury this city works *(its countScaled)*.
- The Colossus (wonder) — +1⚙ +1💰 on water hexes carrying a resource.
- The Mausoleum (wonder) — +1💰 per building here · +1💰 on Quarry hexes · +2 authority capacity.

### Bronze Panoply ← Bronzeworking · 135 ★
- Phalanx (unit) — 14 str · 2 mv · cost 14.

### Wayfinding ← Sailing · 60
- military embark (passive).
- Bireme (unit) — 13 str · 5 mv · cost 12.
- War Galley (unit) — 16 str · 3 mv · cost 19.
- Harbour (building) — cost 62 · +1🌾 · sea routes from here.

## Æra III — Empire (14 nodes; the decision point earns the widest age)

### Iron Working ← Bronze Panoply · 420 ★ (The Legion merged in — user: one melee per age)
- Legionary (unit) — 17 str · 2 mv · cost 16 · +1 str per adjacent friendly unit (its row's ability) · **replaces the Swordsman** (that row retires).
- Pikeman (unit) — 16 str · 2 mv · cost 17 · +8 str vs mounted *(proposed — the folded Halberd Wall's role)*.
- reveals Iron (passive) — gates this line; warriors retool when it connects.

### The Cataphract ← Iron Working · 530 ★ (the horse age)
- Cataphract (unit) — 22 str · 4 mv · cost 24 · requires Horses + Iron.
- Horse Archer (unit) — 12 str · rng 2 · 4 mv · cost 20 *(the folded Steppe Bow)*.
- War Elephant (unit) — 24 str · 3 mv · cost 26 · requires Ivory *(proposed placement — editable)*.

### Mathematics ← Currency · 400
- Catapult (unit) — 14 str · rng 2 · 1 mv · cost 15 · +10 vs cities *(proposed)*.
- Composite Bowman (unit) — 11 str · rng 2 · 2 mv · cost 14.

### Engineering ← Mathematics · 490 ★
- Aqueduct (building) — cost 59 · +15% food surplus toward growth (user retune).
- Baths (building) — cost 80 · +1🎵 +2☺.
- Watermill (building) — cost 63 · +2🌾 +1⚙ · river cities only.

### Artisanry ← Currency · 460 ★ (NEW — 12's marquee)
- Workshop (building) — cost 69 · +2⚙ · +10%⚙ in its city (user spec).

### Prospecting ← Engineering · 520 ★ (NEW — the vein layer)
- the prospect act (passive) — a worker or explorer surveys a hill: ore veins (rich mine +2⚙ +1💰) · iron veins · deep luxuries (gems/silver/gold) · misses mark the hex barren · every survey pays a +15💰 assay.

### Rhetoric ← Epic Poetry · 390
- Forum (building) — cost 96 · +3🎵 · +2 renown/turn *(proposed)*.
- the renown buildings' home (passive) — 09's shelf.

### The Qadi's Court ← Kingship · 590
- Courthouse (building) — cost 100 · +1💰 · a captured city with one costs 1 less authority.
- The King List (passive, waits) — pays a city for its years since founding · needs founding-turn memory.

### The Examination Hall ← Kingship · 440
- Examination Hall (building) — cost 92 · +1🔬 · +1 authority capacity · +1🎵 per point of spare authority (user rework).

### Education ← Rhetoric + Mathematics · 640 ★
- University (building) — cost 134 · +0.75🔬 per pop.
- The House of Wisdom (wonder) — +15% to the bonus positive happiness pays · +2🔬 (user rework).
- The Forbidden City (wonder) — −5% happiness demanded everywhere · +1🔬 per point of spare authority (user).

### Theology ← The High Temple · 600 ★
- Cathedral (building) — cost 340 · +3☺ · gold/faith contributions hurry it · consecrated to one of five patrons on completion (Entry LV).
- Monastery (building) — cost 106 · +2🎵 · +0.25🔬 per pop.
- the enhancer pool opens (passive).
- Hagia Sophia · Angkor Wat · The Great Mosque · Chichen Itza · Notre-Dame (wonders) — the faith slate, texts on sheet 03.

### Colonial Charters ← Kingship · 460 ★ (07's marquee)
- settlers train 50% faster (passive, user spec).
- cities founded 15+ hexes from the capital cost 1 less authority (passive, user spec).
- new cities are founded with a Granary *(proposed third clause — editable)*.

### The Imperial Post ← Currency · 560 ★
- connected cities gain +1☺ (passive — the user's node, homed).
- roads near your cities cost no upkeep *(proposed second clause)*.

### Shipwrights ← Wayfinding · 570 ★ (the triangle's III hulls)
- Galley (unit) — 16 str · 5 mv · cost 14 (light).
- Tower Ship (unit) — 24 str · 3 mv · cost 23 (heavy).
- Fire Ship (unit) — 12 str · rng 2 · 4 mv · cost 20 (ranged).
- Shipyard (building) — cost 90 · +1⚙ · +25%⚙ toward naval *(proposed)*.

## Æra IV — Cathedrals (11 nodes; ends the game)

### Feudalism ← The Qadi's Court · 765
- Castle (building) — cost 140 · +25 city hp · +5 city defence *(proposed)*.
- Spear Wall (unit) — 20 str · 2 mv · cost 21 · the pike line's IV step.

### Steel ← Iron Working · 920 ★
- Longswordsman (unit) — 21 str · 2 mv · cost 21 · melee gains +1 mv at this node (user note on the row).

### Chivalry ← Feudalism + The Cataphract · 950 ★
- Knight (unit) — 20 str · 4 mv · cost 22 · *(proposed retune to 24 str — it should outclass the Cataphract)*.

### Machinery ← Artisanry · 795 ★
- Armoury (building) — cost 160 · +1⚙ · +20%⚙ toward units · units made here pay 50% of their strength as 🔬 and 🎵 (user spec, on the row).
- Crossbowman (unit) — 18 str · rng 2 · 2 mv · cost 20.

### Physics ← Engineering · 820
- Trebuchet (unit) — 22 str · rng 2 · 1 mv · cost 24 · +15 vs cities *(proposed)*.

### Movable Type ← Education · 885 ★
- Printing House (building) — cost 160 · +2🔬 +2🎵 · +1 card shown on culture drafts *(proposed — editable)*.

### The Astrolabe ← Shipwrights + Mathematics · 1035 ★
- ocean-going (passive) — deep water opens; the ocean discoveries with it.
- The Observatory (building) — cost 175 · +3🔬 · +10%🔬 in its city · +1🔬 per pop (user spec).
- Caravel (unit) — 22 str · 6 mv · cost 17 (light).
- Carrack (unit) — 32 str · 3 mv · cost 27 (heavy).
- Gun Galley (unit) — 18 str · rng 2 · 4 mv · cost 24 (ranged).

### The Silk Road ← The Imperial Post · 840 ★
- +1 trade route (passive).
- Caravanserai (building) — cost 150 · +2💰 · +25% route yields from this city *(proposed)*.

### Paper Money ← The Silk Road · 1080 ★
- Mint (building) — cost 150 · +3💰 *(moved here — flag: The Mint endeavour is an Æra III race; either the building stays earlier or the endeavour moves)*.
- The Bourse (building, purchase-only) — converts gold→culture per turn *(proposed: 6💰 → 3🎵)*.

### The Holy Office ← Theology · 900 ★
- Inquisitor (unit) — bought with faith · strips a lump of rival pressure within 5 hexes · +2 str to adjacent units (user spec).
- The Reliquary (building) — +4☺ · +10%🕯 in its city · allows purchasing units with faith (merged, ruled).

### Gunpowder ← Machinery · 1140 ★★ (the closer)
- reveals Niter (passive).
- The Fire Lance (unit, NEW) — *(proposed 26 str · 2 mv · cost 26 · requires Niter)* — the first gunpowder soldier, named for the weapon that really was first.
- **The gunpowder line's naming register (renaissance-punk, ruled 2026-09-02)** — smoke, brass and slightly heretical science; culturally neutral. The slate for the line as it grows:
  - Æra IV: **The Fire Lance** (above) · alternates: The Serpentine, The Thunderhand.
  - Æra V shelf, infantry: **The Thunder Rank** · alternates: The Powder Choir, The Brimstone Guard.
  - Æra V shelf, siege: **The Bombard** · alternate: The Alchemist's Mouth.
  - Æra V shelf, mounted: **The Serpentine Riders** · alternate: The Smoke Lancers.
  - naval (bonus, existing rows): Gun Galley → **The Brimstone Galley**? · Frigate could stay plain — the sea names are settled art; flag only.
- pays a bead (passive — the closing node's reward, user ruling).

**The Magnum Opus** is deliberately NOT a node: it unlocks for every empire when the world's
first seat completes Gunpowder — the finish line announces itself to all contestants at
once, like the bead age opening. (Needs its ruling; the alternative is a node ← Gunpowder.)

## What happens to the live nodes this cut removes
Implementation map for the themes build — every pruned-but-implemented node folds, nothing dangles:
| pruned | its content goes to |
|---|---|
| Calendar | Hanging Gardens → Earthenware; the Almanac theme keeps the flavor |
| The Deluge Remembered | shelf |
| Irrigation | shelf (farms-on-freshwater already live via rules) |
| Standing Stones | its yields → Stonecraft; the name lives on in 14's rite |
| Caravans | Bazaar → Currency |
| The Long Count | shelf (19's ability parks with it) |
| The Knotted Cord | shelf (route science becomes an Order candidate, 05) |
| The Orrery of Bronze | shelf |
| Construction | → Engineering |
| The Halberd Wall | its role → Pikeman at Iron Working |
| The Steppe Bow | Horse Archer → The Cataphract |
| The Floating Fields | shelf (a rules-tech; the neutral ruling frowns) |
| The First Distillation | CUT (distilleries removed, user 2026-09-02) |
| The Legion (node) | merged into Iron Working (user: one melee per age — the Swordsman row retires for the Legionary) |

## The proposal shelf — ages II–V (add-backs and candidates; over-provisioned, cut freely)
**Æra II**: Irrigation *(farm +1 beside fresh water; Hanging Gardens' truer home)* · The Long
Count *(19: age-timing flavor + a Die on age entry?)* · The Lyre *(an early culture building)*
· The Census *(+1 authority capacity, plain)*.
**Æra III**: The Knotted Cord *(+1🔬 per route)* · Optics *(scouts and ships +1 sight)* · The
Water Clock of Su Song's home *(user moved the wonder to III — it wants a node: Mathematics
or a shelf node "Horology")* · The Grand Bazaar's node *(if the doctrine wants a tech gate)*.
**Æra IV**: Banking *(a second gold building; Paper Money's sibling)* · The Compass *(navy +1
movement at ocean; pairs with The Astrolabe)* · Windmills *(+1⚙ farms on hills — plain)* ·
Fortification *(city defense line; the Wave Wall's honest home)* · Alchemy *(the Codex
project's node, 10)*.
**Æra V — the shelf beyond the curtain** *(only if the game ever plays past the Opus)*:
The Printing Revolution *(drafts +1 card empire-wide)* · The Scientific Method *(★ the
mastery system's door, if masteries live)* · Astronomy *(the far sky; renames The
Observatory's late act)* · Sovereignty *(the tier-45 governments' node)* · The World Map
*(every seat's chart shared; circumnavigation's heir)* · Standing Armies *(upkeep rework)*.

## Open questions for the ruling
- [ ] The Magnum Opus: world-unlock at first Gunpowder (recommended) or its own node?
- [ ] Walls of Uruk / Temple of Artemis re-homes stand as listed (Bronzeworking / Husbandry)?
- [ ] Is 15 nodes too wide for Æra III? The next prunes would be The Examination Hall
  (fold into Kingship's line) and Rhetoric (fold renown buildings into Epic Poetry).
- [ ] Costs above are band placements, not tuned numbers — the pacing fixtures re-measure on the build.
