# Tech Unlocks — working doc

> **DEPRECATED (2026-08-23):** superseded by `docs/ages.md` (the five-age ladder).
> Kept as the record of the Age I rework and its implementation-status notes.

Everything a tech grants today, straight from `data/*.json`. For the honing pass:
edit freely under **Revisions** at the bottom; nothing here is code.

**Age I was reworked to the Revisions section below** (2026-08-23). What ships is
written out here; what was deliberately left for later is under *Implementation
status*. The Revisions section itself is untouched — it is the design, and this is
the report against it.

## Unlock types the engine supports today

- **Units** — tech gates production (`unlocks.units`); some also need a strategic resource.
- **Buildings** — tech gates production (`unlocks.buildings`).
- **Improvements** — tech gates what a worker may build (`requiresTech` in `improvements.json`). The worker sheet greys a locked row and names the tech; a hex that could never take the improvement is still absent rather than greyed.
- **Auto-upgrade** — when a tech lands, existing units on an upgrade chain retype for free (AoE2-style): warrior→swordsman, spearman→pikeman, archer→compositeBowman→crossbowman, horseman→knight, swordsman→longswordsman, catapult→trebuchet. Untouched by the rework.
- **Improvement renewals** — a tech adds yield to an *existing* improvement (`upgrades[].tech`). Two now: Calendar +1🪙 on plantations, Feudalism +1🌾 on freshwater farms.

> **The farm's home widened, 2026-08-26.** It was flat, featureless grassland or plains.
> It is now that *plus* any flat desert, tundra or snow that can drink (`hasFreshWater` —
> a river on one of its own edges, or a lake or oasis beside it) *plus* the floodplain
> feature, which is fresh by construction. Grassland and plains still need no water. The
> data shape is `freshwaterTerrain` on the farm's row — a **union** with `validTerrain`
> rather than a fifth filter, so the dry half of the table is untouched. Note the two
> renewals now stack on the same ground: Feudalism's +1🌾 is freshwater-only, so a
> riverside desert farm is a 2🌾 improvement the moment both land.
- **Building renewals** — the same idea for a building (`upgrades[].tech` in `buildings.json`). One: The Wheel, +1🌾 on every granary. Each lands as its own labelled line in the city panel's yield breakdown.
- **Building authority capacity** — a building raises the empire's writ (`authorityCapacity`). One: the monument, +1. The authority breakdown counts them per type ("Monuments ×3 +3"); nothing in the meter names the monument.
- **Per-category production modifier** — a building puts a share of its city's hammers behind one *kind* of item (`productionBonus: { category, percent }`). One: the barracks, +10% toward units. Luxuries declare the same shape (marble, +15% toward buildings), and `productionModifiers` is one list over both tables. It flows through `cityYields`, so the estimate, the panel and the hammers the basket receives are one number.
- **Resource reveal** — tech makes a strategic resource *visible* (it works regardless). Two now: Husbandry reveals horses, Bronzeworking reveals iron.

## Age I

Eleven nodes, one root. **Agriculture is the only starting technology and the only
tech with no prerequisite**, so every game opens on a real choice between four
second-tier nodes rather than on "Agriculture or Pottery".

- **Agriculture** (15🔬, *free at game start*): units — settler, warrior, scout, worker · improvement — **farm** (+1🌾, on flat grassland or plains, on any flat desert/tundra/snow **with fresh water**, and in a floodplain)
- **Husbandry** (18🔬 ← Agriculture): unit — horseman · improvement — **pasture** · reveals **horses**
- **Fletching** (18🔬 ← Agriculture): unit — archer (ranged 7) · improvement — **camp**
- **Mining** (16🔬 ← Agriculture): improvement — **mine** (+1⚙ on hills) · ability — **clear forest** (20⚙ once, to the city that owns the tile)
- **Earthenware** (16🔬 ← Agriculture): building — granary (+3🌾)
- **Bronzeworking** (23🔬 ← Mining + Earthenware): unit — spearman · building — **barracks** (+10%⚙ toward units built here) · reveals **iron**
- **Stonecraft** (23🔬 ← Husbandry + Earthenware): improvement — **quarry** · building — monument (+2🎵, **+1 authority capacity**)
- **Calendar** (21🔬 ← Earthenware): improvement — **plantation** (+1🌾) · **renewal: plantations +1🪙**
- **Divination** (21🔬 ← Husbandry): building — shrine (+1🔬 +1🎵)
- **The Wheel** (29🔬 ← Husbandry + Bronzeworking): units — **war chariot**, **chariot archer** · **renewal: granaries +1🌾**
- **Letters** (27🔬 ← Earthenware + Divination): building — library (+2🔬, +1🔬/pop, +2🪙)

Age I is 227🔬 in total, 212 of it payable. The chart is eight columns by six
lanes; ÆRA I paints columns 0–3, II 4–5, III 6–7.

**The two chariots.** The Wheel's pair is the doc's "chariot (stronger than a
horseman)" and "chariot archer (stronger than an archer, no indirect fire)", read
as a melee/missile split: the **war chariot** is melee (14⚔, 4 moves, 11⚙, needs
🐎) and the **chariot archer** is ranged (9⚔/9🏹 at range 2, 3 moves, 9⚙, needs
🐎). The war chariot therefore leaves the ranged roster, which is the change that
makes The Wheel a *pair* rather than two spellings of one unit. Visually they take
the two mounted silhouette classes — the archer keeps `mountedRanged`, whose badge
is the mounted bow, and the war chariot joins `mounted` with the horseman and the
knight. No new sculpt and no new badge cell: a ninth model class would need a
hand-made icon, which the art rules forbid.

## Age II

Content untouched by the rework; prerequisites re-pointed at the new Age I ids,
and costs deliberately left alone (see *Implementation status*).

- **Iron Working** (132🔬 ← Bronzeworking + Stonecraft): unit — swordsman (needs ⛓; auto-upgrades warriors)
- **Mathematics** (153🔬 ← Letters + The Wheel): unit — catapult (siege)
- **Currency** (162🔬 ← Letters + Stonecraft): building — market (+3🪙)
- **Construction** (183🔬 ← Stonecraft + Fletching): unit — composite bowman (auto-upgrades archers) · building — aqueduct (+3🌾)
- **Philosophy** (196🔬 ← Letters + Divination): building — temple (+2🎵)
- **Engineering** (212🔬 ← Mathematics + Construction): buildings — workshop (+2⚙), watermill (+2🌾+1⚙)
- **Drama and Poetry** (234🔬 ← Philosophy + Currency): building — amphitheater (+3🎵)

## Age III

- **Feudalism** (266🔬 ← Iron Working + Currency): unit — pikeman (auto-upgrades spearmen) · **renewal: farms on freshwater +1🌾**
- **Machinery** (285🔬 ← Engineering + Construction): unit — crossbowman (auto-upgrades composite bowmen)
- **Theology** (314🔬 ← Philosophy + Drama): building — monastery (+2🎵, +0.25🔬/pop)
- **Chivalry** (342🔬 ← Feudalism + Husbandry): unit — knight (needs 🐎; auto-upgrades horsemen)
- **Steel** (380🔬 ← Iron Working + Machinery): unit — longswordsman (needs ⛓; auto-upgrades swordsmen)
- **Physics** (418🔬 ← Mathematics + Engineering): unit — trebuchet (auto-upgrades catapults)
- **Education** (451🔬 ← Theology + Philosophy): building — university (+0.75🔬/pop)

## Improvements — what workers can build (for cross-reference)

All six cost 1 worker charge. **Every one is now tech-gated**, which is what turns
the worker's menu from a wall of six buttons on turn one into a curve.

- **Farm** +1🌾 — *Agriculture* · flat grassland/plains, clears clutter · improves wheat · Feudalism renewal (+1🌾 freshwater)
- **Mine** +1⚙ — *Mining* · any hills, clears clutter · improves iron, gems
- **Pasture** +1⚙ — *Husbandry* · on cattle/horses only
- **Camp** +1🌾+1🪙 — *Fletching* · on deer only
- **Quarry** +1⚙ — *Stonecraft* · on stone/salt only
- **Plantation** +1🌾 — *Calendar* · on silk/wine/spices only · Calendar renewal (+1🪙)

The plantation's gate and its renewal are the same tech, which reads oddly and is
deliberate: the design asks for "plantations (+1 food +1 gold)" *and* for the gold
to be Calendar's gift, so the base row pays the crop and the renewal pays the
trade. It is a degenerate renewal today — you cannot own a plantation without
Calendar — and it separates the moment a second tech touches plantations, or the
gate moves.

Resource-improvements also flip `hasResource` on (strategic resources feed unit production only once improved).

## Implementation status — what the rework shipped, and what it deferred

Shipped, using existing systems plus four small generic mechanisms
(`requiresTech` on improvements, building renewals, `authorityCapacity`,
`productionBonus`): the whole Age I graph above, both chariots, and the
re-pointed Age II/III prerequisites.

**Deferred — designed, not built. Nothing below exists in the code.**

- **Faith.** There is no faith yield, so the shrine's "+2 faith" is not in the game; it pays +1🔬 +1🎵 instead. Divination is still the religion root, and the science half is the design's own ask ("religion should include bonuses to science and culture").
- **XP and promotions.** The barracks' "+15 XP for units trained here" needs a promotion system; only the +10%⚙ half shipped.
- **Indirect fire.** Archers and chariot archers use the one ranged rule the combat model has. The archer's indirect fire and the chariot archer's *lack* of it are the same deferred distinction.
- **Chop scalers.** The forest chop itself **shipped** (2026-08-23, Entry XII.b): `chopFeature`, 20⚙ once, gated on Mining, one worker charge, banked in the city that owns the tile. What is still deferred is the *scaling* — "+5 per teched resource, +5 per slotted civic" — which lands as extra fields on the `chop` row plus one term in `chopFeatureAt` once the curve is designed. **Assarting** (a jungle clearing) is one JSON object away and deliberately unwritten: no jungle row exists, and `chopDef` answering `null` is the whole of "not choppable".
- **Priest / monk.** Unspecified in the design and unbuilt.
- **Trade menu.** Letters' "unlock trade menu" is unbuilt; the library's +2🪙 shipped.
- **The unlock-roll system** ("mastery of the hearth", "mastery of the seasons", …). Not built, and every "food unlock?" / "military unlock?" note in the design is parked with it. Wonders stay deliberately absent as the design says.
- **Sailing, entirely.** Embarkation, fishing boats and water-conditional yields ("water tiles +1🌾 in cities with a granary") each need new machinery — a movement rule for civilians on water, a water improvement, and a yield that reads a *building* from a *tile*. It headlines a future water milestone rather than being smuggled into Age I, so Sailing is not in the tree at all.

**Pacing.** The scripted empire in `test/tech.test.ts` now closes the three ages on
turns **40 / 68 / 107**, against 42 / 100 / 167 before. Age I got dearer (212
payable beakers against 137) and still closes two turns sooner, because the three
buildings that empire actually builds all got stronger: granary 2🌾→3🌾 (+1 more
with The Wheel), shrine gained a beaker, library went from ½🔬/pop to 2🔬 +1🔬/pop.
Ages II and III kept their costs to the beaker, so the compounding lands on them
and the endgame arrives sixty turns sooner. That is left standing rather than
rescaled: the ledger asks for a condensed game with impactful unlocks, and a
rescale would hide the effect of these restats from the playtest that has to judge
them. Multiplying ages II and III by ~1.5 puts the finale back on turn 165 if the
old length is wanted.

## Gaps worth knowing while revising

- **Every improvement is tech-gated now**; the spread is the one above.
- **No chop/clear-feature mechanic exists** (forest chop for ⚙ is designed in the ledger, not built).
- Renewals are cheap and generic on both improvements and buildings; reveals are cheap and generic on resources. Any tech can take another of any of them with one data line.
- Fish and work boats are deferred; no improvement touches water.
- Techs are the only unlock source — no civics/cards yet (M12).

## Revisions

Things i've been considering: each unlock gives a 'roll' that allows you to improve a class of buildings aka unlocking the granary can unlock potential upgrades like:
- mastery the hearth: food buildings give +1 faith
- mastery of the seasons: food buildings give +1 food to tiles adjacent to the city
- mastery of the fields: food buildings give resource tiles +1 food
- centralize authority: food buildings give +3 food to the capital
(the naming could use more work, these are just some examples.)

Another note: going to purposely leave out wonders, which should balance the power of unlocks in terms of player priority of techs. Unlock system isn't built yet, so we can ignore those for now, just a note for the future.

Would love your thoughts: Each science unlock should be fairly impactful, given we're condensing the game. I also want unlocks to bring a level of power/unpredictability so that there is no optimal tech path, but depends on game, hence early unlocks that lead to more predictable bonuses in the second tier.

Also, playing along with the themes in the game, i want religion to include both bonuses to science and culture, instead of civ's emphasis on religion being more tied to culture. Religion should be an upfront investment that pays off in the late game.

Agriculture (dont use tillage)
- this should be the only starting tech
- settler warrior scout worker, keep as is
- unlocks farms (+1 food)

Earthenware (prev pottery)
- granary: +3 food in city.
- prereq: agriculture
- food unlock?

Mining
- unlocks building mines on hill tiles (+1 prod)
- prereq: agriculture
- unlocks chopping forests (20 prod +5 for each tech resourced +5 for each civic slotted in the government, to implement later)

Calendar
- unlocks plantations (+1 food +1 gold)
- +1 gold in cities with a plantation resource
- prereq: pottery

Sailing
- civilian units can now enter water tiles
- unlocks fishing boats (+1 food and +1 gold) on water resources
- water tiles +1 food in cities with a granary
- prereq: agriculture

Divination
- prereq: husbandry
- shrine (+2 faith, +1 science)
- religious unlock?
- unlocks priest/monk? (to be designed)

Husbandry (prev animal husbandry)
- prereq: agriculture
- horseman unlock
- unlock pasture improvement
- reveals horses

Fletching (prev archery)
- prereq: agriculture
- unlocks archer (indirect fire)
- unlock camp improvement (deer)
- military unlock

Stonecraft
- prereq: husbandry, pottery
- unlock quarry improvement
- unlock monument (+2 culture, +1 authority)

Letters (prev writing)
- prereq: pottery, divination
- unlock library (+2 science, +1 science for each population in this city)
- +2 gold in all cities with a library
- science unlock
- unlock trade menu? (to implement later)

bronzeworking:
- prereq: mining, pottery
- unlocks: spearmen
- reveals iron
- military unlock
- unlocks: barracks (+10% production towards units, +15XP for new units trained in this city)

The Wheel:
- unlocks: chariot, chariot archer
- chariot (more movement, stronger than a horseman)
- chariot archer (more movement, stronger than archer, no indirect fire)
- military unlock
- +1 food in all cities with a granary


I like the renaming of the ages!


### Suggestions (Claude) — renaming the tree away from Civ

Principle per the naming bible: period words that still say what they do. Each is
"name — unlocks — why". Mix and match; none is load-bearing.

**Age I — crafts and omens** (a village learning its hands)

- **Tillage** (now Agriculture) — settler/warrior/scout/worker — the act, not the industry; pairs with a later farm renewal ("three-field rotation")
- **The Kiln** (now Pottery) — granary, monument — the object over the material; "Pottery" is the most Civ word in the tree
- **Divination** (new, or absorbs Masonry's shrine) — shrine, maybe reveals a luxury (reading the land's omens) — your example; religion should not fall out of *bricklaying*, which is what Masonry unlocking the shrine says today
- **Stonecraft** (now Masonry) — quarry improvement (gate it here), aqueduct later — masonry becomes about *stone*, its actual subject
- **Letters** (now Writing) — library — "a man of letters"; warmer than "Writing"
- **The Bridle** (now Animal Husbandry) — horseman, pasture improvement (gate it here) — the invention that turns an animal into transport
- **Fletching** (now Archery) — archer — the craft name; also quietly says "we make many arrows"
- **The Forge** (now Bronze Working) — spearman, reveals iron — one forge tech instead of Civ's bronze→iron→steel metallurgy ladder (see Age III)
- **The Cartwright** (now The Wheel) — chariot — nobody "researches" a wheel; they learn to build carts

**Age II — the learned arts** (the tree earns its "Natural Philosophy" title)

- **Geometry** (now Mathematics) — catapult — period-true (siegecraft *was* applied geometry)
- **Coinage** (now Currency) — market, plantation improvement (gate it here) — the mint, not the abstraction
- **The Arch** (now Construction) — aqueduct, composite bowman — one structural idea carrying the whole tech
- **Rhetoric** (now Philosophy) — temple — already pencilled in; the art of moving crowds fits temples and stages better than "philosophy"
- **The Watermill** (now Engineering) — watermill, workshop, mine renewal (+1⚙?) — name the machine that made the medieval economy
- **Theatrum** (now Drama and Poetry) — amphitheater — a nod to Theatrum Mundi, the runner-up name, finally getting its stage

**Age III — powers and institutions** (knowledge becomes leverage)

- **Vassalage** (now Feudalism) — pikeman, freshwater-farm renewal — the *relationship*, sharper than the textbook -ism
- **Clockwork** (now Machinery) — crossbowman — the most Magister-Ludi word available; precision as a worldview
- **The Cloister** (now Theology) — monastery — the place where the copying happens (the flavor text already says so)
- **Heraldry** (now Chivalry) — knight — the social technology of the mounted class; "Chivalry" is fine too
- **Tempering** (now Steel) — longswordsman — the craft secret, not the material ("Iron, taught patience by fire" is already the flavor)
- **Ballistics** (now Physics) — trebuchet — honest about what the tech is *for*
- **The Studium** (now Education) — university — the medieval word for one; or plain **Scholarship**

**Structural spice while renaming** (cheap, uses existing mechanisms)

- Gate improvements as noted above (Bridle→pasture, Stonecraft→quarry, Coinage→plantation, camp→Fletching?) so worker choices open over time
- Add 2–3 more renewals so old improvements age well: Tillage-line rotation (+1🌾 farms), Watermill mine renewal, a Coinage plantation renewal (+1🪙)
- Add 1–2 reveals: Divination reveals a luxury; gems could hide until Coinage ("worthless until someone will pay")
- A chop tech: **Assarting** — the actual medieval word for clearing forest for farmland — unlocking the chop-for-⚙ mechanic when it's built
