# Strategic resources — a proposal

**Draft for review, 2026-09-18.** The user asked for the Civ 5 model — a unit that requires a strategic resource uses up one copy of it while it lives — and for more strategic resources in the game. This is the implementation plan, the proposed roster, and the questions I need answered before anyone writes code.

Edit this file inline. Nothing here is settled.

---

## 1. What we have today

Three strategic resources: **horses**, **iron**, **niter**.

The gate is a boolean. `buildError` asks `hasResource(state, playerId, resource)`, which asks `resourceCopies(...) > 0`. One improved iron hill lets you build an unlimited number of swordsmen, forever. The same boolean gates auto-upgrade, so a warrior climbs to a swordsman if you control any iron at all.

Copies are already counted properly, which is the good news. `resourceCopies` in `src/sim/cities.ts` returns *net* copies: every owned tile carrying the resource whose access is open, minus what you have promised away in trade deals, floored at zero, plus what has been promised to you. Two empires can never hold three copies where there were two. The lending rule already lives in one subtraction.

So the counting machinery exists. What is missing is the other side of the ledger: nothing is ever *spent*.

### What requires what now

| Resource | Revealed by | Units that need it |
|---|---|---|
| Horses | Husbandry (age 1) | chariot, chariot archer, horseman, horse archer, knight, plus 6 leader uniques — **11 in all** |
| Iron | Bronze Panoply (age 2) | swordsman, legionary, longswordsman, khopesh — **4** |
| Niter | Alchemy (age 4) | fire lance — **1** |
| Ivory *(a luxury)* | — | war elephant — **1** |

Three things stand out. Horses gate nearly the whole mounted roster while iron gates four units and niter gates one. Niter is revealed by Alchemy, which is the endgame technology — so niter is effectively an endgame curiosity. And the war elephant requires **ivory**, which is a luxury, so a strategic requirement is already leaking into the happiness economy.

Nothing gates any ship, any siege engine, or any bow.

### Where the map budget sits

Strategic resources get their own purse: `strategicPer1000LandTiles = 22`, split between the kinds by each row's `frequency` weight (horses 11, iron 11, niter 7 — 29 total). A standard map is 80×52 with roughly 1,400 land tiles, so about **31 strategic tiles on the whole map**: ~12 horses, ~12 iron, ~7 niter, shared between every empire on it.

**This is the number that makes or breaks the whole proposal**, and section 5 comes back to it.

---

## 2. The proposed model

**A unit that requires a strategic resource holds one copy of it for as long as it is alive.** Build a horseman and one horse copy is spoken for. Disband it, lose it in battle, or have it captured and the copy comes back. If every copy is spoken for, the unit cannot be built, bought, or upgraded into until something frees one.

Three properties matter for this codebase:

**It is derived, never stored.** Committed copies are a count of living units, which the state already holds. Nothing new is saved, nothing has to be kept in step, and a replayed log lands on the same answer because it lands on the same units. This also means no schema bump.

**It is one subtraction, in one place.** `resourceCopies` already answers "how many do I control". The new reading answers "how many are spoken for", and the gate compares. Three questions, one arithmetic — the same discipline the lending rule already follows.

**It removes a gate rather than adding a system.** `buildError` stops asking a boolean and starts asking a number. Every surface that gates on a resource today goes through `requiredResource` and that one clause.

### Copies per source

If one improved tile is one copy, then on a standard map an empire with two horse tiles fields two mounted units in the whole game. That is not a constraint, it is a wall.

So a resource row should say how many copies each improved source provides:

```
"copiesPerSource": 3
```

This is the main balance dial and it belongs in data, not code. A herd of three horse tiles at 3 copies each supports nine horsemen; a single iron seam at 2 copies supports two swordsmen. It also lets horses be plentiful and niter be precious without touching the map budget.

### Cost per unit

Likewise, a unit row could say how much it takes:

```
"resourceCost": 2
```

Default 1. I propose adding the field and setting everything to 1 for now, so that a later balance pass can make a knight cost two horses without a code change. If you would rather not have the field until something uses it, say so — the codebase has a rule that a declared-and-unread shape fails its register test, and this would be exactly that.

---

## 3. The proposed roster

Six strategic resources. Two are promotions of resources already on the map, two are new, two are the ones we have.

| Resource | Status | Revealed by | Age | What it gates | Copies per source |
|---|---|---|---|---|---|
| **Copper** | promote from bonus | Mining | 1 | spearman, phalanx | 3 |
| **Horses** | keep | Husbandry | 1 | the mounted line (11 units) | 3 |
| **Iron** | keep | Bronze Panoply | 2 | swordsman, legionary, longswordsman, khopesh | 2 |
| **Timber** | **new** | Shipwrights | 3 | galley, tower ship, fire ship, caravel, carrack, gun galley | 3 |
| **Coal** | **new** | Prospecting | 4 | trebuchet, forge-tier units | 2 |
| **Niter** | keep, **moved earlier** | Physics | 4 | fire lance, and any future gunpowder unit | 2 |

Notes on each choice.

**Copper** is already on the map as a bonus resource with +1 production +1 gold, on hills, on four terrains. Promoting it gives age 1 a strategic constraint that is not horses, and it gates the defensive line rather than the offensive one — a different kind of pressure. **Mining currently unlocks nothing at all**, so this fills a real hole in the tree.

**Horses** stay where they are. The mounted line is the largest resource-gated group in the game and this is the resource the whole Modu leader identity rests on.

**Iron** stays at Bronze Panoply. The copper → iron ladder then runs across the age 1 / age 2 boundary, which matches the bronze → iron story without needing a new node.

**Timber** is the big addition. No ship in the game is gated on anything today, and "Zheng He needs fleets that can project power" is in the design doc as a leader identity. Timber would sit on forest tiles and be worked by the lumbermill, which already exists. That creates a genuine tension the game does not currently have: **chopping a forest for its one-time payout destroys a strategic source.** I think that is the most interesting single thing in this proposal.

**Coal** fills the other empty node. **Prospecting currently unlocks nothing**, and it is the natural home for the last pre-industrial fuel. Coal on hills, worked by the mine.

**Niter moves from Alchemy to Physics.** Alchemy is the endgame technology — it is what makes the Magnum Opus available, and by the time a seat researches it the game is ending. Niter revealed there means the fire lance is a unit almost nobody builds. Physics is age 4, two nodes earlier, and already unlocks the trebuchet.

### What I am not proposing

**Tin.** It is on the map as a bonus resource and "bronze needs copper and tin" is historically right, but two resources gating one unit line is fiddly in a way Civ 5 deliberately moved away from. Left as a bonus resource.

**Ivory.** The war elephant requiring a luxury is odd, and under the consumption model it gets odder — a war elephant would eat a copy of a happiness resource. Section 6 asks you to rule on it.

**Anything post-gunpowder.** The game ends around the fire lance. Oil, aluminium and uranium have nowhere to go.

### Effects on the tiles themselves

Every strategic tile should be worth working even before you need the resource, the way Civ does it. Current yields, and what I propose:

| Resource | Tile yield now | Proposed | Improvement |
|---|---|---|---|
| Copper | +1 production, +1 gold *(as a bonus)* | unchanged | mine |
| Horses | +1 production | +1 production, +1 food | pasture |
| Iron | +1 production | unchanged | mine |
| Timber | — *(new)* | +1 production, +1 gold | lumbermill |
| Coal | — *(new)* | +2 production | mine |
| Niter | +1 gold | +1 production, +1 gold | mine |

Horses gaining food reflects that a pasture feeds people; it also makes an early horse tile worth settling toward for a reason other than war.

---

## 4. Implementation

Six pieces of work. The first three are the model, the second three are everything that has to know about it.

### S1 — the reading and the gate

The core change, and it is small.

- A new reading: how many copies of a resource this empire has committed to living units. A sweep of that player's units, summing `resourceCost` for every one whose row names the resource. Barbarians excluded.
- `availableCopies = resourceCopies − committedCopies`, floored at zero.
- `buildError`'s clause in `src/sim/tech.ts` changes from `!hasResource(...)` to `availableCopies(...) < cost`, with a refusal sentence that says how many you hold and how many are spoken for.
- `hasResource` keeps its meaning — "do you control any at all" — because the luxury effects and the card evaluator ask that question legitimately. **It must not quietly become the new question.**

**The clock trap, and this one is important.** `resourceCopies` is memoised on the *economy* clock, which moves when ground or a deal changes. A unit being trained or dying is not an economy event. If the committed count is memoised on the same clock it will be stale the moment a unit dies, and we will have built exactly the bug R1 just spent a batch removing. The committed count either goes on the revision clock or is not memoised at all — and a source-reading test should pin which.

### S2 — the roster in data

- `copiesPerSource` on every strategic row; `resourceCost` on every unit row that names one.
- Copper's `kind` changes from bonus to strategic; it gains `requiresTech: "mining"`.
- Timber and coal are new rows, with terrain, frequency, cluster size and improvement mappings.
- Niter's `requiresTech` moves from `alchemy` to `physics`.
- The unit rows gain their new `requiresResource` values per the table above.
- The map budget rises — see section 5.

### S3 — the upgrade ladder

`upgradeTargetForType` already refuses to climb a rung whose resource you lack. Under the new model it must refuse a rung whose resource is fully committed. The subtlety: a warrior upgrading into a swordsman consumes an iron copy that was not previously spoken for, so **an upgrade can be blocked by your own army**. That is correct and it is Civ 5's behaviour, but it will surprise a player, so the refusal needs to say why.

### S4 — the surfaces

- **The city panel** already shows a resource requirement on a queue item. It should show the count: "Iron 2 of 3".
- **Somewhere always visible** — the top bar or the ledger — should show holdings and commitments for every strategic you can see. Without this the model is invisible until it refuses you, which is the worst way to learn a rule.
- **The Compendium** prints "Your empire must control improved Iron to build one." That sentence becomes a statement about copies.
- **The diplomacy screen** already lists holdings for trade. It must show available copies, not controlled ones — see the ruling in section 6.

### S5 — the bot

The bot currently treats a resource as a yes/no. Under the new model, "I hold three horse copies and two are spoken for" changes what it should build, and it already has a wants system (`src/ai/wants.ts`) and a deal memory that reasons about resources. Appraisal should read available copies. Without this, bots will queue units they cannot build and waste their production decisions.

### S6 — mapgen

Timber and coal need candidate lists, and the whole strategic purse needs retuning (section 5). The existing scatter machinery handles new kinds without code changes — it draws a resource by frequency weight, then a tile from that resource's own candidate list.

---

## 5. The density problem

**Adding kinds to the strategic purse makes every existing kind rarer**, because the purse is split by frequency weight. This is arithmetic, not opinion:

- Today: budget 22, weights total 29. Horses get 22 × 11/29 = **8.3 tiles per 1000 land tiles**.
- With six kinds at similar weights (roughly 53 total): horses get 22 × 11/53 = **4.6 per 1000**. Nearly halved.

So `strategicPer1000LandTiles` has to roughly **double, to around 40**, just to hold the current density of horses and iron — and that is before deciding whether the current density is even right under a model where copies are consumed.

There are two dials and they interact:

- **The purse** decides how many tiles exist and therefore how contested the map is. More tiles means fewer wars over the last iron hill.
- **`copiesPerSource`** decides how big an army one seam supports. Higher means the same map supports bigger armies without more conflict.

My recommendation: raise the purse to hold current per-kind density, and use `copiesPerSource` as the army-size dial. That keeps map contest roughly where it is today and makes army size a number we can tune without regenerating anyone's mental model of the map.

**This needs playtesting, not reasoning.** I would build it with the numbers above and then measure: a standard map, six empires, turn 100 — how many mounted units does a typical empire field, and how often is a build refused for want of a copy? The arena harness can answer that.

---

## 6. Rulings I need from you

These change the design, not just the code. I have given a recommendation for each.

**1. What happens when you lose a copy you were using?** Pillage a mine, lose a city, or have a trade deal expire, and suddenly you have four horsemen and three copies.

- **(a) Nothing happens to the units.** You simply cannot build or upgrade more until you are back in the black. No new state, no new rule, nothing to explain.
- **(b) Civ 5's answer.** The surplus units are "unsupplied" and take a combat penalty until it clears. Fits this codebase well — combat is flat points on one ledger, so it is one labelled negative strength line. But it needs a deterministic rule for *which* units are unsupplied (newest first, by unit id).

*I recommend (a) for the first version, with (b) as a later addition if the model feels toothless.*

**2. Does a unit in the production queue reserve a copy?** If not, you can queue four horsemen on three copies and the fourth is refused when it completes, which wastes the production.

*I recommend yes — reserve on queueing, so the refusal happens when you press the button rather than ten turns later.*

**3. Do free units consume a copy?** Cards, ruins and completion grants all hand out units. A free knight that needs no horse is a card that dodges the whole system.

*I recommend yes, they consume — and the grant simply fails to arrive if you have no copy, the way `done: false` is already a real outcome for a completion grant.*

**4. May you trade away a copy you are using?** Today a deal can promise any controlled copy.

*I recommend a deal may only promise **available** copies. Otherwise every deal is a potential army-breaker, and the alternative is resolving what happens to the units, which is question 1 again.*

**5. What happens to the war elephant's ivory?** Options: leave it (a luxury that a unit consumes), move the war elephant onto horses, or give it ivory as a genuine strategic.

*I recommend moving the war elephant onto **horses**. Ivory stays a pure luxury, and the elephant is a mounted unit in every way that matters to the rules.*

**6. Should ships really need timber?** It is the biggest single change here — it makes chopping forests a strategic decision and it gates a whole category that is currently ungated. It is also the change most likely to feel bad on a map where a player's continent is short of forest.

*I recommend yes, but gating only the **larger** warships from Shipwrights onward, leaving the trireme and bireme free so that a coastal empire is never locked out of the water entirely.*

**7. Copper for the spear line — too harsh in age 1?** The spearman is the first real defensive unit. Gating it on a resource could leave a player genuinely defenceless against an early rush.

*I recommend gating the **phalanx** (age 2) and leaving the **spearman** (age 1) free. Copper still matters from the moment you can see it, but nobody loses a game on turn 20 to a map roll.*

---

## 7. What could go wrong

**The map roll decides the game.** If an empire starts with no horses and no copper it is behind in a way no decision can fix. Civ 5 mitigates this with trade and with an explicit start guarantee. This codebase already has start guarantees in mapgen; extending them to "every start has at least one age-1 strategic within the starting area" is probably necessary and should be part of S6.

**The bot handles it badly.** Bots already occasionally queue things they cannot build. Making the gate a number rather than a boolean gives them more ways to be wrong, and S5 is not optional.

**Army sizes collapse.** If the numbers are wrong in the tight direction, a turn-100 empire fields four mounted units instead of twelve and the whole military game shrinks. This is the failure I would watch for first, and it is exactly what the arena measurement in section 5 is for.

**It becomes bookkeeping.** The model only adds something if the player can see it at a glance and plan around it. If the counts are buried in a submenu, all it does is refuse people. S4 is as important as S1.
