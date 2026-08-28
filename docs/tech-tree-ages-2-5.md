# A sample tech tree — Æra II to Æra V

Working doc (2026-08-27). A *proposal* for the four ages above the shipped Age of Omens,
grounded in `docs/ages.md` (the five-age ladder and its pacing roles),
`docs/mythic-sciences.md` (the four threads and the canon-myth spine), `docs/religion.md`
(what the High Temple and Theology owe), `docs/luxuries.md` (the deferred-by-system table)
and design-notes Entries V (game length: ~45–55 nodes, every node a package) and VI (the
Bead Race and the Magnum Opus). Nothing here is scheduled until the Revisions section says
so, and **nothing shipped is renamed by this doc** — rename candidates sit in their own
table at the end, for a later ruling.

## The frame

| | Æra I · Omens | Æra II · Heroes | Æra III · Empire | Æra IV · Cathedrals | Æra V · Magister |
|---|---|---|---|---|---|
| nodes | 12 (shipped) | 9 | 10 | 10 | 10 |
| cost band 🔬 | 8–26 | 45–110 | 130–240 | 270–450 | 500–750 |
| pacing role | improvements, first religion, expansion, barbarians | **wonders**, first great people, the admin/science/culture/gold buildings | empire bonuses, **roads + trade**, premier war units, victory specialisation begins | late victory conditions, flavour units, empire-wide bonuses, late war units | post-victory accelerants, game-enders; **most games end late IV / early V** |
| target close | ~t41 | ~t75 | ~t115 | ~t155 | curtain ~t185 |

Fifty-one nodes in all. The Empire and Cathedrals bands keep the costs the shipped Æra II/III
nodes already carry (those nodes *are* Empire and Cathedrals, re-banded — see "What moves"),
so the Heroes band is inserted between the Omens ramp and the current 132🔬 floor. The turn
targets are a first guess to be *measured* by the pacing test (`test/sim/tech.slow.test.ts`),
not asserted; Entry V's rule that late costs grow slower than yields is what keeps the last
two ages from sagging, and the curtain moving from ~t130 to ~t185 is the price of two more
acts — if it plays long, the Heroes and Empire bands compress first.

**Every node is a package**: two or three unlocks, at least one of which is something a
player can *see* (a unit, a building, an improvement, a wonder). No connective-tissue nodes.
Where a package needs a system that does not exist, the row says so in the **needs** column;
a node whose every unlock waits on a system is a node the tree pass builds last.

**The register**: real kernels only (mythic-sciences principle 2); the fantastic comes from
the telling. Names shade from the Iliad (II) through Rome and the Han (III) to the House of
Wisdom and the Song (IV) and into the magister's dream of engines (V).

Legend for the tables — **prereqs** are display order (the first is the lane the node
continues, per `techData.ts`'s docblock); **thread** is the mythic-sciences lineage the node
advances (Fate, Fire, Sky, Water, or the canon spine ✦); **needs** names the system the
package is blocked on (blank = buildable on today's mechanisms: units, buildings, renewals,
improvements, abilities, projects, `cityStat`, `happiness`, `authorityCapacity`).

---

## Æra II — The Age of Heroes (9 nodes, 45–110🔬)

The Iliad, Gilgamesh, the Shang, Assyria. The age of *wonders* — every one of the six here is
a rest-of-game engine — and the age the admin, science, culture and gold buildings arrive,
one each. Military is modest by design: one unit line and the first city wall.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Epic Poetry** | 45 | Letters | **Hall of Deeds** building (+2🎵, +1 happiness) · rule: *the fallen become verse* — a friendly unit's death pays 🎵 to the nearest city · wonder **The Oracle** | ✦ | the death-culture hook is one `windfallRider`-shaped line on a tech, small · **wonders** |
| **Kingship** | 50 | Stonecraft, Letters | **Stele of Laws** building (+2 authority capacity) · wonder **The Walls of Uruk** · *(later)* the King List: capital yields scale with the age of the line | ✦ | wonders · King List deferred (needs "turns since founding" on the capital — trivial state, not yet wanted) |
| **The High Temple** | 60 | Divination, Stonecraft | **Temple** moves here from Philosophy (+2🕯) · +1 pantheon slot · **prophets** (faith-purchased; found the religion) · rite **Funeral Rites** (+2 happiness in a city, 20 turns) · wonder **The Great Ziggurat** | ✦ | prophets + religions + spread (religion.md, the Age 2–3 pass) · wonders |
| **Ancestor Rites** | 60 | Divination, Earthenware | **Ancestor Mound** = monument renewal (+1🎵 +1 authority capacity) · wonder **The Pyramids** (workers +1 charge, empire-wide, forever) | ✦ | wonders (renewal is a data row) |
| **Irrigation** | 65 | Calendar, Earthenware | farm renewal: **+1🌾 on farms beside fresh water** (moves here from Feudalism, which gets the castle instead) · **floodplain farms** allowed if not already · wonder **The Hanging Gardens** (+3🌾 in the city, +1 happiness) | Water | wonders |
| **Standing Stones** | 70 | Stonecraft, Divination | **Standing Stones** improvement (worker-built, open flat ground, +1🎵 +1🕯; the first thing a people builds that is not food) · wonder **Stonehenge** (+4🕯, +1 pantheon slot) | Sky ✦ | improvement is a data row + a sculpt · wonders |
| **Caravans** | 80 | Calendar, The Wheel | **Bazaar** building (+2🪙, the first gold building) · Statecraft: the *Founders' Road* doctrine's road half stays dormant until Æra III; caravans are the promise | — | trade routes (Æra III) — the bazaar ships now |
| **Bronze Panoply** | 90 | Bronzeworking, The Wheel | **Phalanx** (spearman upgrade; str 10, +25% vs mounted) · barracks renewal: units built here +1 combat (the existing `unitProductionBonus` shape) · AoE2-style auto-upgrade of spearmen on research (Entry V) | Fire | auto-upgrade is a small unit-line hook: `upgradesTo` on the unit row |
| **Wayfinding** | 110 | Sailing, Husbandry | scouts +1 sight · settlers +1 movement · **Harbour** building (coastal; +1🌾 on worked sea resource tiles) · wonder **The Great Lighthouse** (coastal; +1 sight and +1 movement for embarked units, +2🪙) | Water | unit stat gifts exist as card hooks; a *tech* stat gift is one line in `techGifts` |

**Heroes wonders (6):** The Oracle (mints a Magister's Die each age — the dice economy's
canon source; until dice exist: +3🎵 +3🕯) · The Walls of Uruk (+10 city defense in the
capital, +2🎵; "climb the walls and walk them") · The Great Ziggurat (+3🔬 +3🕯; science and
faith wired together) · The Pyramids (workers +1 charge) · The Hanging Gardens (+3🌾 +1
happiness) · Stonehenge (+4🕯, +1 pantheon slot) · The Great Lighthouse (coastal).

---

## Æra III — The Age of Empire (10 nodes, 130–240🔬)

Rome, the Han, Alexander, the Maya. The shipped Æra II nodes, re-banded, plus the three
things the age is *for*: roads, the administrative building family, and the first "science
felt like magic" renewal. Costs are the shipped ones.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Iron Working** ⬆ | 132 | Bronze Panoply, Stonecraft | swordsman (shipped) · wonder **The Terracotta Army** (every unit type you own gains +1 combat while garrisoned; +2 authority capacity) | Fire | wonders |
| **Currency** ⬆ | 162 | Letters, Caravans | market (shipped) · **trade route** slots begin: 1 per market · wonder **The Colossus** (coastal; +3🪙, +1 trade route) | — | **trade routes** |
| **Mathematics** ⬆ | 153 | Letters, The Wheel | catapult (shipped) · **Scholarship** project renewal: 20⚙ → 6🔬 · wonder **Petra** (desert city: desert tiles +1🌾 +1⚙) | Sky | wonders |
| **Construction** ⬆ | 183 | Stonecraft, Fletching | composite bowman, aqueduct (shipped) · **Baths** building (+2 happiness) · wonder **The Circus Maximus** (+4 happiness empire-wide) | Water | wonders |
| **Philosophy** ⬆ | 196 | Letters, Divination | temple *leaves* (to The High Temple) · **Lyceum** building (+3🔬, the mid-game science house) · wonder **The Great Library** (a free technology of the current age, +3🔬) | Fate | wonders · "free tech" = `settleResearchWindfall`, exists |
| **Engineering** ⬆ | 212 | Mathematics, Construction | workshop, watermill (shipped) · wonder **The Great Wall** (every city +5 defense, enemy units end their move on entering your borders — the zone-of-control lock, empire-wide) | Water | wonders |
| **Drama** ⬆ | 234 | Philosophy, Currency | amphitheater (shipped) · **Epic Poetry** renewal: the Hall of Deeds +1🎵 · wonder **The Theatre of Dionysus** (+3🎵, one free Statecraft draft) | ✦ | wonders · "free draft" = `settleCultureWindfall`, exists |
| **The Royal Road** | 150 | Engineering, Caravans | **roads** (worker improvement, 1 charge; movement ⅓ on road; a road between two cities *connects* them) · connected cities +1🪙 · the **Founders' Road** doctrine's dormant half wakes | — | **roads** (improvement kind that affects `stepCost` + a "connected" predicate) |
| **The Examination Hall** | 175 | Kingship, Letters | **Examination Hall** building (+3 authority capacity; scholars, not bailiffs) · **Great Warring Tribes**' dormant courthouse bar wakes · authority tier +5 → +10% ⚙ becomes +15% | ✦ | none (the doctrine halves are data) |
| **The Orrery of Bronze** | 200 | Mathematics, Philosophy | library renewal (+1🔬 per library, +1 more with a Lyceum) · **Antikythera** — a *clockwork astronomical computer*: the first Sky-thread device; foreshadows Clockwork and the Engine | Sky Fate | none |

**Empire wonders (8):** Terracotta Army · Colossus · Petra · Circus Maximus · Great Library ·
Great Wall · Theatre of Dionysus · *(candidate)* **The Mausoleum** (Kingship-adjacent: +🪙 per
building, +2 authority capacity).

---

## Æra IV — The Age of Cathedrals (10 nodes, 270–450🔬)

The House of Wisdom, Song China, Mansa Musa, the sagas, the khanates — the age the world
talks to itself along the Silk Road. The shipped Æra III nodes, re-banded, plus the three the
eastern mainline owes: the trade network proper, movable type, and the beginning of alchemy.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **Feudalism** ⬆ | 266 | Iron Working, Currency | pikeman (shipped) · freshwater-farm renewal *leaves* (to Irrigation) · **Castle** building (+8 city defense; the Walls line, tier two) · unit upkeep begins to bite: **serfdom** — farms +1⚙ under a Statecraft Order of the age | Fire | **unit upkeep** (the rule; the doc has wanted it since M9) |
| **Machinery** ⬆ | 285 | Engineering, Construction | crossbowman (shipped) · **Windmill** = workshop renewal (+2⚙ on flat cities) · wonder **The Water Clock of Su Song** (+3🔬, +1 authority capacity) | Sky | wonders |
| **Theology** ⬆ | 314 | The High Temple, Drama | monastery (shipped) · **Cathedral** building (+3🕯 +2 happiness) · rite **The Mysteries** (temple renewal +1 happiness) · religions may **enhance** here (the enhancer pool) · wonder **Hagia Sophia** (a free prophet, +3🕯) | ✦ | prophets/spread (Age 2–3 pass) · wonders |
| **Chivalry** ⬆ | 342 | Feudalism, Husbandry | knight (shipped) · **Tourney Ground** (barracks renewal: +1 happiness, mounted +1 combat) · wonder **The Alhambra** (+1 happiness, mounted units built here +1 combat, +3🎵) | — | wonders |
| **Steel** ⬆ | 380 | Iron Working, Machinery | longswordsman (shipped) · **Forge** building (+15% ⚙ on units; +1⚙ per mine) · **war elephants** where ivory is held (ivory's deferred Æra III tier) | Fire | unique-resource units (a unit row with `requiresResource`, exists for strategics) |
| **Physics** ⬆ | 418 | Mathematics, Engineering | trebuchet (shipped) · wonder **Machu Picchu** (mountain-adjacent city: +2🪙 per trade route, +25% 🪙) | Sky | wonders |
| **Education** ⬆ | 451 | Theology, Philosophy | university (shipped) · wonder **The House of Wisdom** (+50% 🔬 in the city, a free technology) · Statecraft: Athenaeum's condition relaxes here | Fate | wonders |
| **The Silk Road** | 300 | Currency, The Royal Road | **trade routes** proper: a caravan/cog unit travels between connected cities for 🪙 (+ the partner's luxuries count for the *trade* tier — spices Æra III, furs Æra III wake) · **Caravanserai** building (+2🪙, +1 trade route) · wonder **The Great Mosque of Djenné** (+3🕯, trade routes +2🕯) | — | **trade routes** (the M9 gold economy proper) |
| **Movable Type** | 330 | Letters, Machinery | **Printing House** building (+2🔬 +2🎵) · every library +1🎵 · Statecraft: one extra Order offer per draft | Fate | none |
| **The First Distillation** | 360 | Earthenware, Theology | *alchemy begins* (Alexandria and the jindan) · **Distillery** = market renewal (+2🪙, +1 happiness where wine/spirits is held) · opens the Fire thread's last run | Fire | none |

**Cathedrals wonders (7):** Water Clock of Su Song · Hagia Sophia · Alhambra · Machu Picchu ·
House of Wisdom · Great Mosque of Djenné · *(candidate)* **Angkor Wat** (+1🕯 per two tiles
worked, +2 pantheon-slot-equivalent for religions).

---

## Æra V — The Age of the Magister (10 nodes, 500–750🔬)

The magister's dream of the future: brass, aether, clockwork, never smokestacks. Most games
end here or just before. Every node is a post-victory accelerant, a game-ender, or the road
to the Magnum Opus — and the tree ends where the victory begins.

| node | 🔬 | prereqs | package | thread | needs |
|---|---|---|---|---|---|
| **The Luopan** | 500 | The First Distillation, Wayfinding | geomancy: the **settler lens shows the land's veins** (site bonuses stronger, a hidden luxury revealed within 3 hexes of a founded city) · the compass — embarked units +1 movement, ocean crossable | Sky | none (lens data + the `embarkable` flag on ocean) |
| **Fire Medicine** | 520 | The First Distillation, Physics | **Bombard** (siege; trebuchet upgrade) · **Rocket Arrows** (ranged; crossbow upgrade, range 2, +vs cities) — "they sought eternal life; they found this" · castle renewal +4 defense | Fire | none |
| **The White Gold** | 560 | The First Distillation, Earthenware | **Porcelain Works** building: **mints a luxury no tile has** (porcelain — counts as a unique luxury for the +4 happiness and can be traded) | Fire | *manufactured luxury* — one `resourceKind` a building supplies (luxuries.md's "building classification" row) |
| **The Perspective Glass** | 580 | Education, The Luopan | optics: every city +1 sight · **Observatory** building (+4🔬 on hills/mountain-adjacent) · reveals every unrevealed resource on explored land · wonder **The Astronomical Bureau** (+6🔬; the final age's objectives shown a turn early) | Sky | wonders |
| **The Clockwork Servant** | 600 | Machinery, The Orrery of Bronze | automata (Yan Shi, al-Jazari): **Clockwork Worker** unit — never expends charges · Windmill renewal +1⚙ | Sky Fate | none (`chargesLeft` absent = infinite, a unit-row flag) |
| **The Loom That Remembers** | 620 | The Silk Road, Movable Type | Jacquard: **plantation +1🪙 +1🎵 renewal** · **Manufactory** = Forge renewal (+3⚙) · silk becomes memory — the Fate thread's penultimate step | Fate | none |
| **Mesmerism** | 640 | Theology, The Perspective Glass | **The Entranced Workforce** project: 25 happiness surplus → +30% ⚙ in a city for 10 turns (a timed effect, a happiness *spend*) · fashionably sinister | — | a project whose price is a meter surplus — small |
| **The Paper Lantern That Lifted** | 680 | Fire Medicine, The Perspective Glass | **Aerostat** unit: sight 5, ignores terrain, cannot fight, cannot be attacked by melee — the fog system's showpiece · +1 happiness | Sky | flying movement = `ignoresTerrainCost` + an `unattackable` flag |
| **The Calculating Engine** | 720 | The Loom That Remembers, The Clockwork Servant | **The Engine** building: +8🔬, +1 Magister's Die per age (the machine that computes possibility) · Scholarship renewal 20⚙ → 8🔬 | Fate | dice economy (until then: the science) |
| **The Great Work** | 750 | The Calculating Engine, The White Gold | unlocks **the Magnum Opus** — Entry VI's golden-bead capstone: a declared, multi-turn project in the capital, announced to every seat, interruptible by siege · from reading entrails to transmuting the world | Fire Fate Sky | **the Bead Race** (victory) |

**Magister wonders (2 + the Opus):** The Astronomical Bureau · *(candidate)* **The Porcelain
Tower** (+3🎵 per luxury manufactured) · the Magnum Opus is *not* a wonder — it is the
victory, and only one seat needs to finish it.

---

## What moves in the shipped tree

| shipped node | today | proposed | why |
|---|---|---|---|
| Philosophy → temple | Æra II | temple moves to **The High Temple** (Æra II) | the temple is religion's building; Philosophy keeps the Lyceum and the Great Library |
| Feudalism → freshwater-farm renewal | Æra III | renewal moves to **Irrigation** (Æra II); Feudalism gets the Castle | a growth renewal belongs with the Hanging Gardens, a defence building with the pikeman |
| Iron Working's prereq | Bronzeworking | **Bronze Panoply** | the Fire thread runs Bronze → Panoply → Iron |
| Currency's second prereq | Stonecraft | **Caravans** | gold descends from trade, not masonry |
| ages | I / II / III | I / **II inserted** / III / IV / V | the whole point |

Nothing is renamed here. Candidates for the naming ruling, kept out of the tables above:
Philosophy → *Rhetoric* (already ratified in Entry X, unapplied) · monument → *Stele*, library
→ *Tablet House* (canon spine) · Drama → *Epic Poetry* was proposed, but Epic Poetry is a
better *Heroes* node, so Drama keeps its name · Feudalism → *The Manor*? · Theology → *The
Cloister* (religion.md).

## Systems this tree assumes, in the order the ages need them

1. **Wonders** (Æra II, first) — a `wonder: true` building flag, one-per-world claimed-by
   tracking on `GameState`, an announcement when one completes, a sculpt per wonder (the
   world's one permitted spectacle, `docs/art-pass.md` W3). Twenty-three wonders across the
   four ages; each is a data row once the flag exists.
2. **Prophets, religions and spread** (Æra II–IV) — religion.md's Age 2–3 pass.
3. **Roads** (Æra III) — an improvement kind that `stepCost` reads and a "connected" predicate.
4. **Trade routes** (Æra III–IV) — the gold economy proper; wakes spices, furs and Machu Picchu.
5. **Unit upkeep** (Æra IV) — the M9 rule that never landed; Feudalism's serfdom is its foil.
6. **Manufactured luxuries** (Æra V) — a building that supplies a resource kind.
7. **The Bead Race and the Magnum Opus** (Æra IV–V) — Entry VI, the win condition the user
   has put after the tree passes.
8. **Great people** (Æra II onward) — still parked; every "free prophet / free technology"
   above uses an existing windfall seam instead, so nothing here waits on them.
9. **Magister's Dice** — The Oracle and the Engine mint them; until the reroll economy exists
   they pay the fallback yields printed in their rows.

## Open questions for the ruling

- **Curtain**: ~t185 with five ages, or compress Heroes/Empire to hold ~t160?
- **Heroes' military**: one unit (the phalanx) and one wall is deliberately thin — is the age
  allowed to be a builder's age, or does it want a second line (chariot upgrade)?
- **Temple to The High Temple** changes Æra I's faith income *timing* (the shrine stays) —
  this interacts with the open faith-income ruling (first augur t49).
- **Mesmerism** and **The Paper Lantern**: keep both, or move one to the mastery roll pool
  as the 2026-08-23 ruling did for Greek Fire and the Silk Mystery?
- **Wonder count**: 23 is Civ-scale; halve it for the first pass (the six of Heroes plus one
  per later node that has a clear engine) and grow?

## Revisions

*(yours — edit away; ✎ marks what changed)*
