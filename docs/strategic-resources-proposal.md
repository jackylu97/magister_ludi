# Strategic resources — a proposal

**Draft for review, 2026-09-18.** The user asked for the Civ 5 model — a unit that requires a strategic resource uses up one copy of it while it lives — and named the roster: **copper, obsidian, horses, ivory, niter, camels, iron**.

That roster is the one parked in `docs/astra-brief-expansionist-scientific.md` (*"Promote copper/tin; add obsidian/camels and new unit requirements; make ivory a military requirement"*) and in `docs/six-decks-first-cut.md` (*"Resource additions (camels/obsidian, copper/tin promotions) remain parked"*). Tin is **not** in the list, so copper is promoted alone.

This is the implementation plan, the roster with tech placement and effects, and the rulings I need before anyone writes code. Edit inline — nothing here is settled.

---

## 1. What we have today

Three strategic resources: **horses**, **iron**, **niter**.

The gate is a boolean. `buildError` asks `hasResource(state, playerId, resource)`, which asks `resourceCopies(...) > 0`. One improved iron hill lets you build an unlimited number of swordsmen, forever. The same boolean gates auto-upgrade.

The counting machinery is already right, which is the good news. `resourceCopies` in `src/sim/cities.ts` returns a *net* figure: every owned tile carrying the resource whose access is open, minus what you have promised away in trade deals, floored at zero, plus what has been promised to you. Two empires can never hold three copies where there were two. The whole lending rule is one subtraction.

What is missing is the other side of the ledger. Nothing is ever spent.

### What requires what now

| Resource | Revealed by | Units that need it |
|---|---|---|
| Horses | Husbandry (age 1) | chariot, chariot archer, horseman, horse archer, knight, plus 6 leader uniques — **11 in all** |
| Iron | Bronze Panoply (age 2) | swordsman, legionary, longswordsman, khopesh — **4** |
| Niter | Alchemy (age 4) | fire lance — **1** |
| Ivory *(a luxury)* | — | war elephant — **1** |

Horses gate nearly the whole mounted roster while niter gates one unit. Niter is revealed by **Alchemy**, the endgame technology that opens the Magnum Opus — by the time a seat researches it the game is ending, so the fire lance is a unit almost nobody builds. And the war elephant already requires a luxury, which is the leak your roster closes by making ivory strategic.

Nothing gates any ship, any siege engine, or any bow.

---

## 2. The proposed model

**A unit that requires a strategic resource holds one copy for as long as it is alive.** Build a horseman and one horse copy is spoken for. Disband it, lose it in battle, or have it captured and the copy comes back. If every copy is spoken for, the unit cannot be built, bought, or upgraded into until something frees one.

Three properties matter for this codebase:

**It is derived, never stored.** Committed copies are a count of living units, which the state already holds. Nothing new is saved, nothing has to be kept in step, no schema bump, and a replayed log lands on the same answer because it lands on the same units.

**It is one subtraction in one place.** `resourceCopies` already answers "how many do I control". The new reading answers "how many are spoken for", and the gate compares — the same discipline the lending rule already follows.

**It removes a gate rather than adding a system.** Every surface that gates on a resource goes through `requiredResource` and one clause in `buildError`.

### Copies per source

If one improved tile is one copy, an empire with two horse tiles fields two mounted units in the whole game. That is not a constraint, it is a wall.

So a resource row should say how many copies each improved source provides:

```
"copiesPerSource": 3
```

This is the main balance dial and it belongs in data. A herd of three horse tiles at 3 copies each supports nine horsemen; a single iron seam at 2 supports two swordsmen. It also lets horses be plentiful and niter precious without touching the map budget.

### Cost per unit

Likewise `resourceCost` on a unit row, default 1 — so a knight can later cost two horses without a code change. If you would rather not have a field nothing uses yet, say so: this codebase fails a register test for a shape declared and never read, and that rule would bite here.

---

## 3. The roster

Seven resources. Two promotions, two new, three kept.

| Resource | Status | Revealed by | Age | Role | Copies per source |
|---|---|---|---|---|---|
| **Obsidian** | **new** | *(visible from the start)* | 1 | early blade — the alternative to copper | 3 |
| **Copper** | promote from bonus | Mining | 1 | early blade — the alternative to obsidian | 3 |
| **Horses** | keep | Husbandry | 1 | mount — the alternative to camels | 3 |
| **Camels** | **new** | Husbandry | 1 | mount — the alternative to horses | 3 |
| **Iron** | keep | Bronze Panoply | 2 | the steel blade | 2 |
| **Ivory** | promote from luxury | *(visible from the start)* | 2 | the elephant | 2 |
| **Niter** | keep, **moved earlier** | Physics | 4 | powder | 2 |

### The shape I think makes this work: paired alternatives

The seven fall naturally into **two pairs and three singles**:

- **Blade — obsidian or copper.** Either arms the early line.
- **Mount — horses or camels.** Either mounts the early cavalry.
- **Iron**, **ivory**, **niter** stand alone.

A unit in a paired role accepts *either* resource and consumes one copy of whichever it took. This does three things at once:

1. **It kills the map-roll problem.** The biggest risk in gating early units is that a player rolls a start with no copper and is defenceless on turn 20. With a pair, you need one of two resources, and the two sit on different terrain — copper on hills, obsidian on volcanic ground, horses on grass and plains, camels in desert. A desert start that is poor in horses is rich in camels.
2. **It makes terrain identity real.** A desert empire fields camel archers; a grassland empire fields horsemen. They are not the same army, and neither is locked out.
3. **It gives obsidian and camels a job.** On their own, obsidian gates one leader's eagle warrior and camels gate one leader's camel archer — a resource that serves a single unique unit is not worth a map slot.

**The cost:** `requiresResource` is a single `ResourceId` today. Accepting a pair means it becomes `ResourceId | ResourceId[]`, and consumption needs a deterministic rule for which copy is taken — I propose the first in the row's own order that has a copy available, which is stated, testable, and replay-safe.

If you would rather each resource gate its own distinct units instead, section 6 ruling 2 has that version.

### Where each sits in the tree

| Resource | Reveal tech | Why there |
|---|---|---|
| **Obsidian** | none — visible from the start | It is the pre-metal material. Anything that reveals it puts it after copper, which defeats the pairing. |
| **Copper** | **Mining** (age 1) | **Mining currently unlocks nothing at all.** This fills a real hole, and "you learn to dig before you can use what is down there" is the right story. |
| **Horses** | Husbandry (age 1) | Unchanged. |
| **Camels** | Husbandry (age 1) | Same node as horses, so the pair opens together and neither empire is ahead of the other on timing. |
| **Iron** | Bronze Panoply (age 2) | Unchanged. The copper/obsidian → iron ladder then runs across the age 1 / age 2 boundary. |
| **Ivory** | none — visible from the start | Already visible; the camp already works it. Promoting it should not hide it. |
| **Niter** | **Physics** (age 4) | Moved from Alchemy. Alchemy is the endgame node; Physics is two steps earlier and already unlocks the trebuchet. |

No new technology nodes. The lanes are your chart and adding nodes is a separate decision — every placement above uses a node that already exists.

### What gates what

| Unit | Age | Needs today | Proposed |
|---|---|---|---|
| spearman | 1 | — | no requirement |
| phalanx, swordsman, khopesh | 2 | — | **obsidian or copper** |
| chariot, chariot archer | 1 | horses | **horses or camels** |
| horseman, horse archer | 3 | horses | **horses or camels** |
| knight | 4 | horses | **horses or camels** |
| camel archer *(Al-Ma'mun)* | — | — | no requirement |
| eagle warrior *(Nezahualcoyotl)* | — | — | no requirement |
| slinger *(Pachacuti)* | — | — | no requirement |
| the 6 mounted uniques | — | horses | **horses or camels** |
| legionary, longswordsman | 2–4 | iron | unchanged |
| war elephant | 3 | ivory *(luxury)* | **ivory** *(now strategic)* |
add: siege elephant, age 4, requires ivory. +6 attack towards cities. 2 movement, strong ranged attack.
| fire lance | 4 | niter | unchanged |

The two leader uniques that are currently ungated — the eagle warrior and the slinger — take the single resource rather than the pair, because a unique unit rewarding a specific start is the point of a unique unit.

### The tiles themselves

Every strategic tile should be worth working before you need the resource.

| Resource | Yield now | Proposed | Improvement | Terrain |
|---|---|---|---|---|
| Obsidian | — *(new)* | +2 production | mine | hills, and desert/tundra |
| Copper | +1 production, +1 gold | unchanged | mine | hills (as today) |
| Horses | +1 production | **+1 production, +1 food** | pasture | grassland, plains |
| Camels | — *(new)* | +1 production, +1 gold | camp | desert |
| Iron | +1 production, +1 science | unchanged | mine | as today |
| Ivory | +1 food, +1 production | unchanged | camp | plains |
| Niter | +1 gold | **+1 production, +1 gold** | mine | as today |

Horses gaining food reflects that a pasture feeds people, and makes an early horse tile worth settling toward for a reason other than war.

### The empire bonus — one copy is enough

**The user, 2026-09-18:** *"Each strategic should also have special effects, so that they're still useful throughout the game, players gain this bonus for having at least one copy, only applies once regardless of number of copies."*

This is the part that keeps a resource interesting after your army is built. It also creates a good tension with consumption: **your first copy is for the bonus, every copy after it is for the army.** An empire down to its last iron has a real decision to make.

| Resource | Bonus | Fit | Note |
|---|---|---|---|
| **Obsidian** | melee units +1 combat strength | **excellent** | Combat is flat points on one ledger, so this is a labelled strength line and nothing new. |
| **Copper** | +1 production in every city | works | Scales with city count — see "what I would change" below. |
| **Horses** | faster movement along roads | **excellent** | `roadStepCost` is already a card rule folded into `MoveProfile.roadStep`. Zero new code, and it stacks with Machinery correctly. |
| **Iron** | +1 production on mines | good | Scales with mine count, which is a different axis from city count. |
| **Ivory** | +1 happiness in every city | works, **but the number is wrong** | See below. |
| **Niter** | +1 science on mines | works | Thematically the weakest, and it stacks with iron on the same tiles. |
| **Camels** | *(none given)* | — | Seven resources, six bonuses. Needs one. |

**The bonus reads controlled copies, not available ones.** If it read available copies, building an army would switch off your economy — commit your last iron to a swordsman and every mine in the empire loses a point of production. That is a perverse incentive and it would teach players not to build units, which is the opposite of the point. *Recommended: the bonus asks "do you control at least one", the same question `hasResource` already answers.*

#### Where the numbers are off

**Ivory.** A luxury pays **+4 happiness** once, empire-wide (`rules.meters.happiness.perUniqueLuxury`). *"+1 happiness in every city"* beats that at five cities and keeps growing. So promoting ivory out of the luxury pool would make it **stronger** than it is today, and uniquely scaling — the one resource whose bonus has no ceiling. *Recommended: **+4 happiness**, flat, which is exactly what ivory pays now. It keeps its job, changes its category, and does not quietly become the best resource in the game.*

**Camels.** Needs a bonus, and the historical fit is trade. Three options: **+1 gold on every trade route**, **one extra trade route**, or **desert tiles +1 production**. *Recommended: the extra trade route — it is the only bonus in the list that opens a decision rather than adding a number, and it serves both leaders whose identity is desert commerce.*

**Niter.** Science on mines is a stretch — saltpetre is not a learning material — and it lands on the same tiles as iron's bonus, so a hill empire double-dips. *Alternative: **+25% production toward siege and gunpowder units**, which is the same story told forward, or simply +1 production on mines to match iron.*

#### Two things that apply to the whole list

**Four of the six scale with empire size** (copper and ivory per city, iron and niter per mine). That is the pattern the user named at the start of this work — *"it kind of plays like i'm stacking bonuses that supplement what i'm already doing"*. Only obsidian and horses are qualitative. Worth deciding deliberately rather than by accident.

**All six decay.** The user, on age 4 card yields: *"flat bonuses are inconsequential in that age… they either need to be massive flat bonuses or percentages."* The same is true here. +1 production per city is large on turn 30 and invisible on turn 200. Three ways out, and one should be picked:

1. **Scale with age** — the bonus is +1 per age reached, so copper pays +1 early and +4 late.
2. **Make the late resources' bonuses percentages** — niter gives +10% science rather than +1 on mines.
3. **Accept the decay as intended** — an early resource is an early advantage, and niter's late arrival is what keeps it relevant. This is defensible, and it is the least work.

*Recommended: option 1 for the two age-1 economic bonuses (copper, ivory) and option 3 for everything else. Obsidian's +1 strength and horses' road speed both stay meaningful late without scaling, because combat strength and movement are not inflated by the same curve yields are.*

---

## 4. Implementation

### S1 — the reading and the gate

- A new reading: copies committed to living units. A sweep of that player's units, summing `resourceCost` for every one whose row names the resource. Barbarians excluded.
- `availableCopies = resourceCopies − committedCopies`, floored at zero.
- `buildError`'s clause changes from `!hasResource(...)` to `availableCopies(...) < cost`, with a refusal that says how many you hold and how many are spoken for.
- `hasResource` keeps its meaning — "do you control any at all" — because the luxury effects and the card evaluator ask that question legitimately. **It must not quietly become the new question.**

**The clock trap, and this one matters.** `resourceCopies` is memoised on the *economy* clock, which moves when ground or a deal changes. A unit being trained or dying is not an economy event. If the committed count is memoised on that clock it will be stale the moment a unit dies — which is exactly the bug R1 just spent a batch removing. The committed count goes on the revision clock or is not memoised at all, and a source-reading test should pin which.

### S2 — the pair

`requiresResource` becomes `ResourceId | ResourceId[]`. Everything that reads it — `buildError`, the upgrade ladder, the city panel, the Compendium, the bot — learns the list form. The consumption rule (first available in row order) is stated in one docblock and pinned.

### S3 — the roster in data

- `copiesPerSource` on every strategic row; `resourceCost` on the unit rows.
- Copper's `kind` changes from bonus to strategic and it gains `requiresTech: "mining"`.
- Ivory's `kind` changes from luxury to strategic — see ruling 1.
- Obsidian and camels are new rows with terrain, frequency, cluster size and improvement mappings.
- Niter's `requiresTech` moves from `alchemy` to `physics`.
- The unit rows take their new requirements.
- The map budget rises — section 5.

### S4 — the upgrade ladder

`upgradeTargetForType` already refuses a rung whose resource you lack; it must now refuse a rung whose resource is fully committed. The subtlety: a warrior climbing to a swordsman consumes an iron copy that was not previously spoken for, so **an upgrade can be blocked by your own army**. Correct, and Civ 5's behaviour, but it will surprise a player, so the refusal must say why.

### S5 — the surfaces

- **The city panel** shows a resource requirement on a queue item today; it should show the count — "Iron 2 of 3".
- **Somewhere always visible** — the top bar or the ledger — shows holdings and commitments for every strategic you can see. Without this the model is invisible until it refuses you, which is the worst way to learn a rule.
- **The Compendium** sentence becomes a statement about copies, and about pairs where a unit takes either.
- **The diplomacy screen** must offer *available* copies for trade, not controlled ones — ruling 4.

### S6 — the bot

The bot treats a resource as yes/no. It already has a wants system (`src/ai/wants.ts`) and a deal memory that reasons about resources; appraisal must read available copies. Without this, bots queue units they cannot build and waste production decisions. Not optional.

### S7 — mapgen

Obsidian and camels need candidate lists, the strategic purse needs retuning (section 5), and the start guarantees need extending (section 7). The existing scatter handles new kinds without code changes.

---

## 5. How many, and in what proportions

**The user, 2026-09-18:** *"we should massively up the number of total strategics. Also, each resource should take up a ratio of the total pool, i think there should be reduced quantitites of resources that appear later in the game. Camels should also be more rare than horses (historically true) and obsidian should be somewhat rare."*

The mechanism for the ratio already exists and is exactly right: the strategic purse (`strategicPer1000LandTiles`) is split between kinds by each row's `frequency` weight. So `frequency` **is** the share of the pool. Nothing needs building; the numbers need setting.

### Why the purse has to rise a long way

Splitting a fixed purse seven ways makes everything rarer:

- Today: budget 22 tiles per 1000 land tiles, weights totalling 29 (horses 11, iron 11, niter 7). Horses get 22 × 11/29 = **8.3 per 1000**.
- Seven kinds at the same budget: horses get roughly **3.7 per 1000**. Less than half.

A standard map is 80×52 with about 1,400 land tiles, so today there are roughly **31 strategic tiles on the entire map**, shared by every empire on it. That is already thin for a boolean gate, and it is far too thin for a model where copies are spent.

### Proposed: purse 60, weights as a share of 100

| Resource | Age | Share | Per 1000 land | Standard map | Today |
|---|---|---|---|---|---|
| **Horses** | 1 | 22 | 13.2 | ~18 | ~12 |
| **Copper** | 1 | 20 | 12.0 | ~17 | — |
| **Obsidian** | 1 | 13 | 7.8 | ~11 | — |
| **Camels** | 1 | 10 | 6.0 | ~8 | — |
| **Iron** | 2 | 15 | 9.0 | ~13 | ~12 |
| **Ivory** | 2 | 12 | 7.2 | ~10 | — |
| **Niter** | 4 | 8 | 4.8 | ~7 | ~7 |
| **Total** | | **100** | **60** | **~84** | ~31 |

Weights are written as a share of 100 so the ratio is readable straight off the row. The purse nearly triples, and the map carries **about 84 strategic tiles instead of 31**.

Against the user's three constraints:

- **Camels rarer than horses** — 10 against 22, so a camel seam is worth better than twice a horse herd.
- **Obsidian somewhat rare** — 13, below both age-1 mainstays and above camels.
- **Later is scarcer** — by cohort: **age 1 holds 65 of the 100**, age 2 holds 27, age 4 holds 8.

### One tension worth naming

"Later is scarcer" and "camels and obsidian are rare" pull against each other. Iron is age 2 but it is a mainline resource gating the whole sword ladder, so at share 15 it sits *above* obsidian (13) and camels (10), which are age 1. Strictly read, later should be below everything earlier.

I have read the rule as applying to **the age cohort as a whole** — each age gets a smaller slice of the map than the one before — with rarity *within* a cohort set by how historically common the thing was and how much work it does. If you meant it strictly per resource, obsidian and camels have to rise above iron, which makes the two rare resources common and defeats the other half of the instruction. *Flagging rather than choosing.*

### The other dial

`copiesPerSource` decides how large an army one seam supports, and it is the right place to compensate for rarity. A camel seam at 10 share but 4 copies per source is worth roughly as much *army* as a horse herd at 22 share and 3 copies — while still being a rarer and more valuable thing to find, to defend, and to trade for.

**This wants measurement, not reasoning.** Build it with these numbers, then measure in the arena: standard map, six empires, turn 100 — how many mounted units does a typical empire field, how often is a build refused for want of a copy, and how many empires are missing an entire role.

---

## 6. Rulings I need

**1. Does ivory stop being a luxury?** A resource row has one `kind`. Making ivory strategic takes it out of the luxury pool, which is one fewer happiness source and one fewer thing to trade for happiness. The alternative is letting a row be both, which is a schema change and a new question for every luxury effect.

ivory just a strategic

**2. Pairs, or one resource per unit?** Section 3 proposes obsidian-or-copper and horses-or-camels. The alternative is that each gates its own units: obsidian for the eagle warrior and slinger only, camels for the camel archer only.

yes, keep the _ or _ scheme. unique units should not require strategic resources.

**3. What happens when you lose a copy you were using?** Pillage a mine, lose a city, or have a deal expire, and you have four horsemen and three copies.

- **(a) Nothing happens to the units.** You cannot build or upgrade more until you are back in the black. No new state, no new rule.
- **(b) Civ 5's answer.** Surplus units are unsupplied and take a combat penalty until it clears. It fits — combat is flat points on one ledger, so it is one labelled negative line — but it needs a deterministic rule for *which* units are unsupplied (newest first, by unit id).

let's go with a.

**4. May you trade away a copy you are using?** Today a deal can promise any controlled copy.

yes, only trade away available copies.

**5. Does a unit in the production queue reserve a copy?** If not, you can queue four horsemen on three copies and the fourth is refused on completion, wasting the production.

yes, reserve on queueing.

**6. Do free units consume a copy?** Cards, ruins and completion grants hand out units. A free knight that needs no horse is a card that dodges the system.

free units do not require a copy.

**7. Should the spearman be gated at all?** It is the first real defensive unit. Even with the obsidian/copper pair, a start with neither is a start in trouble.

no gating spearmen.

---

## 7. What could go wrong

**The map roll decides the game.** The pairs help a great deal; they do not finish the job. Mapgen already has start guarantees, and they should be extended to promise **one blade source and one mount source within the starting area**. I would treat this as part of S7 rather than a nice-to-have.

**The bot handles it badly.** Bots already occasionally queue what they cannot build. A number gives them more ways to be wrong than a boolean did.

**Army sizes collapse.** If the numbers are wrong in the tight direction, a turn-100 empire fields four mounted units instead of twelve and the military game shrinks. This is the failure I would watch for first, and the arena measurement in section 5 is how to catch it.

**It becomes bookkeeping.** The model only earns its place if a player can see it at a glance and plan around it. If the counts are buried in a submenu, all it does is refuse people. S5 matters as much as S1.
