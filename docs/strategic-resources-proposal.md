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

**The user, 2026-09-18:** *"lets have the number of copies on a tile of strategic resources be 3-8."*

So a tile carries a **quantity**, rolled when the resource is placed, and each resource row gives the range it rolls in:

```
"copiesPerSource": [3, 5]
```

A range rather than a constant, and per tile rather than per resource, for three reasons. It is what the user asked for — "on a tile", with a span wide enough that the span is the point. It is the shape the neighbouring field already uses: `clusterSize: [2, 3]` sits two lines away in the same rows and means exactly this kind of thing. And it makes a deposit worth scouting — a seven-copy iron hill is a prize somebody will fight over, where a flat constant makes every seam interchangeable.

A resource that should not vary writes `[3, 3]`, so the constant is still available.

**Where the quantity lives.** On the tile, written once by `placeResources` in `newGame`, from the map rng, exactly as `Tile.resource` itself is. That puts it with the *placed-once* tile facts and **not** with the mutable ones — CLAUDE.md's register of mutable tile fields is `improvement`, `feature`, `discovery`, `road`, `vein`, `surveyed`, and this joins none of them. Nothing may regenerate it mid-game, for the same reason nothing may regenerate a resource.

This is the main balance dial for army size. **Every resource's maximum is 8 and the floor is what varies** (settled 2026-09-18) — so the rarer a resource is on the map, the higher its worst case, and no deposit of anything is ever capped below a jackpot.

### Cost per unit

Likewise `resourceCost` on a unit row, default 1 — so a knight can later cost two horses without a code change. If you would rather not have a field nothing uses yet, say so: this codebase fails a register test for a shape declared and never read, and that rule would bite here.

---

## 3. The roster

Seven resources. Two promotions, two new, three kept.

| Resource | Status | Revealed by | Age | Role | Copies per tile |
|---|---|---|---|---|---|
| **Obsidian** | **new** | *(visible from the start)* | 1 | early blade — the alternative to copper | 4–8 |
| **Copper** | promote from bonus | Mining | 1 | early blade — the alternative to obsidian | 3–8 |
| **Horses** | keep | Husbandry | 1 | mount — the alternative to camels | 3–8 |
| **Camels** | **new** | Husbandry | 1 | mount — the alternative to horses | 5–8 |
| **Iron** | keep | Bronze Panoply | 2 | the steel blade | 4–8 |
| **Ivory** | promote from luxury | *(visible from the start)* | 2 | the elephant | 4–8 |
| **Niter** | keep, **moved earlier** | Physics | 4 | powder | 5–8 |

**Every maximum is 8; the floor is what differs** (settled 2026-09-18). So any seam of anything can roll a jackpot, and what a rare resource buys you is a better *worst* case rather than a better best one. A camel seam is never disappointing; a horse herd sometimes is. That makes scouting worth doing on every deposit rather than only on the rare ones.

### What that means in copies on the ground

Expected copies per 1000 land tiles, which is tiles × the mean of the range:

| Resource | Tiles | Mean | Copies |
|---|---|---|---|
| Horses | 13.2 | 5.5 | **73** |
| Copper | 12.0 | 5.5 | **66** |
| Iron | 9.0 | 6.0 | **54** |
| Obsidian | 7.8 | 6.0 | **47** |
| Ivory | 7.2 | 6.0 | **43** |
| Camels | 6.0 | 6.5 | **39** |
| Niter | 4.8 | 6.5 | **31** |

The reassuring number is that **the two pairs come out level**: blade is 66 + 47 = 113, mount is 73 + 39 = 112. Since a paired unit accepts either, the blade pool and the mount pool are the same size, which is what keeps the two halves of an army in step.

The number to watch is **inside** the mount pair. A grassland empire with horses and no camels draws on 73; a desert empire with camels and no horses draws on 39. So a pure-desert empire fields roughly **half** the mounted force of a pure-grassland one — the per-tile range no longer compensates for the share the way it did when maxima differed, because the means have converged (5.5 against 6.5).

That may well be the intended picture: desert is harsh, and the desert empire is getting an extra trade route out of the same resource. But it is a design fact rather than an accident, and the lever if it plays badly is **camels' map share**, not their range — raising camels from 10 to 15 closes most of the gap without touching the 3–8 span.

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
| phalanx, swordsman | 2 | — | **obsidian or copper** |
| khopesh *(Akhenaten)* | — | iron | **no requirement** — a unique |
| chariot, chariot archer | 1 | horses | **horses or camels** |
| horseman, horse archer | 3 | horses | **horses or camels** |
| knight | 4 | horses | **horses or camels** |
| camel archer *(Al-Ma'mun)* | — | — | no requirement |
| eagle warrior *(Nezahualcoyotl)* | — | — | no requirement |
| slinger *(Pachacuti)* | — | — | no requirement |
| the 6 mounted uniques | — | horses | **no requirement** — uniques |
| legionary, longswordsman | 2–4 | iron | unchanged |
| war elephant | 3 | ivory *(luxury)* | **ivory** *(now strategic)* |
add: siege elephant, age 4, requires ivory. +6 attack towards cities. 2 movement, strong ranged attack.
| fire lance | 4 | niter | unchanged |

**No leader unique requires a strategic resource** — settled 2026-09-18: *"yup, all unique units don't require strategic resources. we can nerf later on if we need."*

This reaches all thirteen, since none of them declares a `replaces` and every one is a standalone unit. Two rows above are read by it: **khopesh** comes off obsidian-or-copper and **the six mounted uniques** come off horses-or-camels. Seven uniques that are gated today lose their requirement — khopesh on iron, the mounted six on horses.

It is a real balance change and the user has taken it knowingly: a leader's unique unit becomes strictly easier to field than the standard unit it stands beside, and Mansa Musa's mandekalu needs nothing where a plain knight needs a mount. Flagged here so that whoever tunes this later knows it was a choice and not an oversight.

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

### The settled set — 2026-09-18

| Resource | Bonus | Already expressible? |
|---|---|---|
| **Obsidian** | melee units +1 combat strength | **new shape** — `combatLine` is a card effect but not yet a resource one |
| **Copper** | +1 gold in every city | **yes** — `perCityYields` |
| **Horses** | faster movement along roads | **almost** — `rulePercent` exists but `ResourceRule` admits only three of the nine card rules; `roadStepCost` has to join it |
| **Iron** | fighting units +10 health, live | **new shape** — see below |
| **Ivory** | +4 happiness | **yes** — `extraHappiness`, which is exactly what it pays as a luxury today |
| **Camels** | +1 gold on every trade route | **yes** — `routeYields` |
| **Niter** | +10% science, empire-wide | **yes** — `percentYields` |

Seven resources, seven jobs: obsidian makes you fight better, copper makes you rich, horses make you fast, iron makes you tough, ivory makes you content, camels make you trade, niter makes you learn. Copper and camels both pay gold, but from different places — a city and a route — so a landlocked empire and a trading one value them differently.

**Four are one JSON row with no code at all.** The luxury effect vocabulary (`ResourceEffect` in `src/sim/resourceData.ts`) already carries `perCityYields`, `extraHappiness`, `routeYields` and `percentYields`, and it is deliberately the cards' vocabulary wherever the two mean the same thing. Three need something:

- **Obsidian's combat line.** `combatLine` is a card shape; adding it to `ResourceEffect` is a member on a union that exists, and one evaluator reads the whole vocabulary.
- **Horses' road rule.** `ResourceRule` is `Extract<CardRule, 'happinessDemand' | 'borderCost' | 'growthCarryover'>` — three of the nine. `roadStepCost` joins that list.
- **Iron's health.** The largest of the three, and it needs a ruling first.

#### Iron's +10 health — settled 2026-09-18

**A live bonus, on fighting units only.** While the empire controls at least one iron, every piece of its that can fight has +10 maximum health. Lose the last iron and the army loses it.

Live rather than a creation stamp, so that all seven bonuses obey one rule a player can guess instead of six obeying it and iron being an exception. The user, on why civilians are excluded: *"civilians are captured immediately when a different unit walks on it, so hp doesnt make sense for civilian units"* — which is right, and it is why `arriveOnTile` is the seam that takes a settler rather than `planCombat`. Health a piece can never spend is health that should not be printed on it.

**The test is `isCivilian`, not the category.** `isCivilian(def)` already exists and is documented as *"a civilian in combat terms — capturable, never a threat"*; it is `!isCombatant`, which is strength or range above nothing. Use it rather than `category === 'military'`, which would silently exclude all **fourteen naval units** — a ship fights, and a war galley is exactly the kind of thing an iron-rich empire should field a tougher version of. Barbarians are excluded, as they are from every empire reading.

**What it costs to build.** The existing +10 health mechanism is a creation stamp — `UnitStamp.hp`, written when a piece is built and read by `unitMaxHp` as `roster maxHp + stamp`, carried for life through upgrades. That is what the War Hall does, and what the design doc's Alloys technology proposes. A live bonus cannot use it, because a stamp is written once. So:

- `unitMaxHp(unit)` gains the state and the owner, and **every reader changes with it**: the heal cap (`healUnits`, a rite, a pillage, a great person's act), both of the forecast's bars, the upgrade's health fraction in `tech.ts`, and the health bar the renderer draws. Its docblock already calls itself *the* maximum and lists those readers, so the list is known — it is a signature change on a hot helper, not a hunt.
- **A clamp is needed for the moment the bonus goes**, since a piece at 110 of 110 would be over its new maximum. *Current health drops to the new maximum — you lose the ten points, not a proportion.* Where that clamp runs matters: it should be a comparison at the point of reading, in the spirit of "timed effects are comparisons, never countdowns", rather than a sweep that rewrites every unit the turn an iron mine is pillaged.
- This is the one bonus of the seven that makes the **empire reading hot**: `unitMaxHp` is asked per piece per frame by the renderer. `hasResource` is memoised on the economy clock, which is the right clock for it — losing an iron mine is an economy event — so this should be cheap, but it wants measuring rather than assuming.

**Five of the seven are one JSON row with no code at all.** A luxury's effect vocabulary (`ResourceEffect` in `src/sim/resourceData.ts`) already carries `perCityYields`, `improvementYields`, `routeYields`, `extraHappiness`, `productionBonus`, `percentYields`, `buildingCategoryYields`, `unitUpkeepRebate` and more — and it is deliberately the cards' vocabulary wherever the two mean the same thing. Only two bonuses need anything built:

- **Obsidian's combat line.** `combatLine` is a card shape; adding it to `ResourceEffect` is the smaller half of the work, and one evaluator reads the whole vocabulary.
- **Horses' road rule.** `ResourceRule` is `Extract<CardRule, 'happinessDemand' | 'borderCost' | 'growthCarryover'>` — three of the nine. `roadStepCost` joins that list.

Both are additions to a union that already exists, not new systems. That is worth knowing before choosing between the alternatives below: **a bonus that fits the vocabulary costs a data row; one that does not costs a batch.**

**The bonus reads controlled copies, not available ones.** If it read available copies, building an army would switch off your economy — commit your last iron to a swordsman and every mine in the empire loses a point of production. That is a perverse incentive and it would teach players not to build units, which is the opposite of the point. *Recommended: the bonus asks "do you control at least one", the same question `hasResource` already answers.*

#### Settled 2026-09-18

**Ivory is +4 happiness**, flat and empire-wide. That is exactly what ivory pays as a luxury today (`rules.meters.happiness.perUniqueLuxury`), so it keeps its job and changes only its category. The rejected version — +1 per city — beat +4 at five cities and kept growing, which would have made promoting ivory a straight upgrade and given it the only bonus in the set with no ceiling.

**Camels are +1 gold on every trade route.** One `routeYields` row, and the historical fit is exact: the camel caravan *is* the overland route.

#### Alternatives for iron, copper and niter

Each option below says what it is historically, and what it would cost to build. "**One row**" means the vocabulary already carries it.

**Iron.** The real historical impact of iron was agricultural before it was military — iron ploughshares broke heavy northern soils that bronze could not.

| Option | The history | Cost |
|---|---|---|
| +1 production on mines *(current)* | Iron tools cut rock faster | one row |
| **+1 food on farms** | The iron ploughshare — the change that actually fed Europe | one row |
| −25% unit upkeep | Standardised equipment made armies cheap to keep, which is why iron-age states fielded bigger ones | one row (`unitUpkeepRebate`) |
| +15% production toward units | Arsenals and armouries | one row (`productionBonus`) |
| Melee units +10 max health | Iron scale and mail | **new shape** (`unitStamp`) |
| +1 production in cities with a Smithy or Forge | The smith's quarter | one row (`buildingCategoryYields`) |

*My pick: **+1 food on farms**. It is the most historically true of the six, it is the least expected, and it puts iron on a different axis from every other bonus in the set — iron makes you grow rather than making you stronger, which is a more interesting reason to want it than "more production".*

**Copper.** Copper was the first worked metal, but its longest-running role was money: copper coin was the everyday currency of almost every premodern economy, while silver and gold were for the state.

| Option | The history | Cost |
|---|---|---|
| +1 production in every city *(current)* | Bronze-age tooling | one row |
| **+1 gold in every city** | Copper coinage — the small change of the ancient world | one row |
| +10% production toward buildings | Bronze saws, chisels and drills built things | one row |
| +1 production on mines and quarries | The extraction economy | two rows |
| +1 faith in cities with a Shrine or Temple | Ritual bronze — the Shang vessels, the temple bells | one row |
| +2 culture in the capital | Bronze casting as the first monumental art | needs `pays` widened beyond empire-flat |

*My pick: **+1 gold in every city**. It is more historically true than production, and it separates copper from iron — under the current list both are "a bit more production", which makes them feel like the same resource twice.*

**Niter.** Saltpetre is the one where the obvious story and the true story diverge most. It is the oxidiser in gunpowder, but saltpetre beds were also a fertiliser and a curing salt, and the search for it is what drove early chemistry.

| Option | The history | Cost |
|---|---|---|
| +1 science on mines *(current)* | The alchemists' search for it became chemistry | one row |
| **+10% science empire-wide** | The same story as a rate rather than a flat — and a rate does not decay | one row (`percentYields`) |
| +1 food on farms | Saltpetre beds as fertiliser | one row *(collides with the iron option above)* |
| +2 production on mines | Blasting powder in the workings | one row |
| +25% production toward siege and gunpowder units | The obvious military reading | **needs a narrower category** than `ProductionCategory` has |
| Cities +5 strength | Powder artillery on the walls | **new shape** (`cityStat`) |

*My pick: **+10% science empire-wide**. It tells the true story — niter is why chemistry happened — and it is the one bonus in the whole set that answers the decay problem, because a percentage of a late-game science total is large exactly when a flat +1 has become invisible. It also stops niter and iron paying on the same tiles.*

**If all three picks are taken**, the set reads: obsidian makes you fight better, copper makes you rich, horses make you fast, iron makes you grow, ivory makes you content, camels make you trade, niter makes you learn. Seven resources, seven different jobs, and only one of them is production.

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

---

## 8. The build queue — 2026-09-18

The user: *"let's start queuing up agents to implement these changes."* Sections 1–7 are the spec; this is the order the work happens in. Each batch is one agent on a worktree off `decks`, gated by the orchestrator (typecheck + core tier per module + build) and merged before the next one starts.

**Why this is mostly sequential.** Each batch adds a field or a shape the next one writes rows against, and three of the five want the same files. `unitData.ts` and `tech.ts` in particular are touched by both R1 and R2, so running them together would put two agents in one file.

| # | Batch | What it is | Depends on |
|---|---|---|---|
| 1 | **R1 — the copies model** | Committed and available copies; the build gate; `requiresResource` as a pair; the upgrade ladder; queue reservation (ruling 5); the trade gate (ruling 4). Sim only, no new resources yet. | — |
| 2 | **R2 — the bonus vocabulary** | `combatLine` on `ResourceEffect`; `roadStepCost` into `ResourceRule`; iron's live `unitMaxHp` and its clamp. Sim only. | R1 |
| 3 | **R3 — the roster and the map** | The four new or promoted rows, `copiesPerSource`, the shares, the purse at 60, candidate lists, start guarantees. Data and mapgen. | R1, R2 |
| 4 | **R4 — the surfaces** | City panel counts, an always-visible holdings strip, the Compendium sentences, the diplomacy screen offering available copies. | R3 |
| 5 | **R5 — the bot** | Appraisal reads available copies rather than a boolean. | R3 |

R4 and R5 are on disjoint fences (`src/ui` and `src/ai`) and run together.

**The decks queue is paused behind this.** `docs/plans/decks-rework.md` still has D2e (the bilateral grant, ~15 cards) and A1 (the two silent arrivals) unstarted, and D2f blocked on rulings. They resume when R5 lands.

**What R1 must not do.** It changes no resource rows and adds no resources. The roster is R3's, and the unique-unit question above is R3's to write once the user has settled it. R1's job is the machinery, proven against the three strategics that exist today.
