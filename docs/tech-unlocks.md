# Tech Unlocks — working doc

Everything a tech grants today, straight from `data/*.json`. For the honing pass:
edit freely under **Revisions** at the bottom; nothing here is code.

## Unlock types the engine supports today

- **Units** — tech gates production (`unlocks.units`); some also need a strategic resource.
- **Buildings** — tech gates production (`unlocks.buildings`).
- **Auto-upgrade** — when a tech lands, existing units on an upgrade chain retype for free (AoE2-style): warrior→swordsman, spearman→pikeman, archer→compositeBowman→crossbowman, horseman→knight, swordsman→longswordsman, catapult→trebuchet.
- **Improvement renewals** — a tech adds yield to an *existing* improvement (`upgrades[].tech`). Only one exists: Feudalism, +1🌾 on freshwater farms.
- **Resource reveal** — tech makes a strategic resource *visible* (it works regardless). Only one exists: Bronze Working reveals iron.

## Age I

- **Agriculture** (15🔬, no prereq): units — settler, warrior, scout, worker *(the starting kit; every game opens by researching this or Pottery)*
- **Pottery** (15🔬, no prereq): buildings — granary (+2🌾), monument (+2🎵)
- **Archery** (20🔬 ← Agriculture): unit — archer (ranged 7)
- **Animal Husbandry** (20🔬 ← Agriculture): unit — horseman (needs 🐎)
- **Bronze Working** (22🔬 ← Pottery): unit — spearman · reveals **iron**
- **Masonry** (22🔬 ← Pottery): building — shrine (+1🎵)
- **Writing** (25🔬 ← Pottery): building — library (+0.5🔬/pop)
- **The Wheel** (28🔬 ← Animal Husbandry + Bronze Working): unit — chariot (ranged, needs 🐎)

## Age II

- **Iron Working** (132🔬 ← Bronze Working + Masonry): unit — swordsman (needs ⛓; auto-upgrades warriors)
- **Mathematics** (153🔬 ← Writing + The Wheel): unit — catapult (siege)
- **Currency** (162🔬 ← Writing + Masonry): building — market (+3🪙)
- **Construction** (183🔬 ← Masonry + Archery): unit — composite bowman (auto-upgrades archers) · building — aqueduct (+3🌾)
- **Philosophy** (196🔬 ← Writing + Masonry): building — temple (+2🎵)
- **Engineering** (212🔬 ← Mathematics + Construction): buildings — workshop (+2⚙), watermill (+2🌾+1⚙)
- **Drama and Poetry** (234🔬 ← Philosophy + Currency): building — amphitheater (+3🎵)

## Age III

- **Feudalism** (266🔬 ← Iron Working + Currency): unit — pikeman (auto-upgrades spearmen) · **renewal: farms on freshwater +1🌾**
- **Machinery** (285🔬 ← Engineering + Construction): unit — crossbowman (auto-upgrades composite bowmen)
- **Theology** (314🔬 ← Philosophy + Drama): building — monastery (+2🎵, +0.25🔬/pop)
- **Chivalry** (342🔬 ← Feudalism + Animal Husbandry): unit — knight (needs 🐎; auto-upgrades horsemen)
- **Steel** (380🔬 ← Iron Working + Machinery): unit — longswordsman (needs ⛓; auto-upgrades swordsmen)
- **Physics** (418🔬 ← Mathematics + Engineering): unit — trebuchet (auto-upgrades catapults)
- **Education** (451🔬 ← Theology + Philosophy): building — university (+0.75🔬/pop)

## Improvements — what workers can build (for cross-reference)

All six cost 1 worker charge. **None is tech-gated today** — every one is buildable from turn 1.

- **Farm** +1🌾 — flat grassland/plains, clears clutter · improves wheat · Feudalism renewal (+1🌾 freshwater)
- **Mine** +1⚙ — any hills, clears clutter · improves iron, gems
- **Pasture** +1⚙ — on cattle/horses only
- **Camp** +1🌾+1🪙 — on deer only
- **Quarry** +1⚙ — on stone/salt only
- **Plantation** +1🪙 — on silk/wine/spices only

Resource-improvements also flip `hasResource` on (strategic resources feed unit production only once improved).

## Gaps worth knowing while revising

- **No improvement is tech-gated** — likely candidates for spreading across the tree.
- **No chop/clear-feature mechanic exists** (forest chop for ⚙ is designed in the ledger, not built).
- **Only one renewal** (Feudalism farms) and **one resource reveal** (iron) — both mechanisms are generic and cheap to add to any tech.
- Fish and work boats are deferred; no improvement touches water.
- Techs are the only unlock source — no civics/cards yet (M12).

## Revisions

*(yours — edit away)*

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
