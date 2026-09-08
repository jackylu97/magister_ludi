/**
 * The whole game in one plain, serializable object.
 *
 * `GameState` is data only — no classes, no methods, no references to anything
 * outside itself. Everything it holds survives `JSON.stringify` unchanged
 * (see `snapshotState` in `game.ts`), which is what makes save files, replays,
 * network sync and debugging dumps all the same problem.
 *
 * Determinism
 * -----------
 * The generator is stored *in* the state (`state.rng`), so a roll is a state
 * mutation like any other and two runs of the same command log stay in lockstep.
 * Nothing in the simulation may call `Math.random()` or read the clock.
 *
 * The map is generated from `config.seed` directly, but gameplay must not roll
 * the same numbers the terrain did: `state.rng` is a *separate stream* derived
 * from the same seed through `hashSeed` (see `deriveGameplayRng`). Same seed,
 * same map, uncorrelated gameplay rolls.
 *
 * Entity ids
 * ----------
 * Units and cities are allocated ids from `nextEntityId`, a plain counter, so
 * ids depend only on the order commands were applied — never on insertion order
 * of a Map or the address of an object. Ids are unique across *all* entity
 * kinds, which keeps "selected thing" references unambiguous later.
 *
 * Ordering
 * --------
 * Anything that affects the outcome iterates an array. `players`, `units` and
 * `cities` are arrays and their order is part of the state.
 *
 * Simultaneous turns
 * ------------------
 * There is no "current player". Every player acts inside one shared turn window
 * and the turn resolves when the last of them has ended it, so the only turn
 * state is *who is finished*: `turnEnded`, a boolean per player. That is a set
 * in spirit, but it is an array because a `Set` does not survive
 * `JSON.stringify` and this state has to.
 *
 * Why tile ownership lives here and not on the map
 * ------------------------------------------------
 * `tileOwner` is a parallel array over `map.tiles`, not a field on `Tile`, and
 * that is the point: `GameMap` is *generation output*. It is a pure function of
 * the seed and the size, `newGame` rebuilds it rather than storing it, and
 * `replay` relies on that — a save file carries a seed, not four thousand tiles.
 * The moment a border expansion wrote into a tile, the map would stop being
 * reproducible from its seed and would have to be serialised in full.
 *
 * Keeping it parallel also keeps the fast path fast: ownership changes once or
 * twice per turn per city and is read constantly, so it wants to be a flat array
 * indexed exactly like `map.tiles` (`row * width + col`, via `tileIndex`). It
 * holds *city* ids rather than player ids because a tile belongs to a city — the
 * player is one lookup away and would otherwise be duplicated state that could
 * disagree with itself.
 */

import { type BuildingId, isWonder } from './buildingData';
import {
  type BeadCardId,
  type BeadFamily,
  type BeadKind,
  BEAD_DECK_AGES,
  beadDeckFor,
  drawAgeReckonings,
} from './beadData';
import type { ProjectId } from './projectData';
import type { DiscoveryId, DiscoveryKind } from './discoveryData';
import {
  FAMILIES,
  SPECIALIST_FAMILIES,
  type Family,
  type GreatPersonId,
  type SpecialistFamily,
} from './greatPeopleData';
import type { TriumphId } from './triumphData';
import type { GameMap } from './map';
import { generateMap, getMapSize } from './mapgen';
import { type MapgenOverrides, resolveMapgenConfig } from './mapgenData';
import {
  type BeliefId,
  type ConsecrationId,
  type PlayerPantheon,
  newPlayerPantheon,
} from './religionData';
import { type Rng, hashSeed, makeRng, shuffle } from './rng';
import { type CitizenFocus, RULES } from './rulesData';
// Type-only, and deliberately: `wars.ts` imports *values* from this module, so
// an ordinary import here would be a runtime cycle. Nothing runs across this
// arrow — the two shapes are declarations — which is the documented exception
// (`statecraft.ts`/`religionData.ts` keep the same bargain).
import type { Truce, WarState } from './wars';
// `deals.ts` keeps the same bargain, and for the same reason: it imports values
// from this module, so the two shapes it names here arrive type-only.
import type { DealProposal, DealState } from './deals';
import {
  type PlayerStatecraft,
  cardExtraCharges,
  cardUnitStamp,
  newPlayerStatecraft,
} from './statecraft';
import type { CardEffect, CardId } from './statecraftData';
import { chooseStartPositions, planStartingUnits } from './startPositions';
import type { TechId } from './techData';
import { type UnitStamp, type UnitTypeId, unitDef, unitMaxHp } from './unitData';
import {
  type CitySighting,
  newVisibilityGrid,
  recomputeAllVisibility,
  recomputeVisibility,
  recomputeVisibilityFor,
} from './visibility';

/**
 * Bumped whenever the shape of `GameState`, `GameConfig` or the command log
 * changes incompatibly. Save files carry it so `loadGame` can refuse a file it
 * would silently misread.
 *
 * The long tail — entries 3 through v78 — is history and lives in
 * `docs/history/schema-changelog.md`. None of those saves loads against this
 * build (`loadGame` tests the schema for exact equality), so what they record
 * is *why* each bump happened rather than how to read an old file; the recent
 * entries stay here because the next bump is written by whoever reads them.
 *
 * v79: **the woods** (`docs/flags.md` "Rulings 2026-09-06, evening" item h; the
 * batch is `docs/fewer-things-plan.md` H9). The user: "currently forests spawn
 * in huge patches, could we make them more diffuse across the map? There should
 * be smaller patches of forest across the map, and some unforested tiles
 * breaking up the large patches." Two passes answer the two halves, both in
 * `mapgen.ts`, both tuned by the new `woodland` block of `data/mapgen.json`.
 *
 *   · **The grain** (`woodland.grain` 0.55, `noise.woodlandGrain` at five tiles
 *     a cycle): the forest deal orders its eligible ground by the moisture
 *     percentile blended with a copse-scale one, so the same number of hexes
 *     are wooded and they are wooded in twice as many places. Measured over
 *     five seeds on a standard board: 25 woods of mean 11.8 became 48 of mean
 *     6.0, and the largest wood on a map fell from 74 hexes to 44.
 *   · **The clearings** (`woodland.clearingChance` 0.4, `clearingMinPatch` 8):
 *     a hex whose six neighbours are all trees, in a wood of at least eight, is
 *     offered a clearing. Forest hexes with a wooded ring fell from 13.6% of
 *     the wood to 1.4% — which is the "huge patches" complaint stated as a
 *     number, and the number the ruling was written against.
 *
 *   · **And the capitals are armed** (`docs/flags.md` note 20, ruled 2026-09-05,
 *     never built until now): `resources.startStrategics` — horses and iron —
 *     within `startStrategicRadius` of every possible start. The fourth
 *     fairness guarantee, built exactly like the three beside it: it rolls no
 *     dice, plants on the nearest legal hex, gives up `minSpacing` rather than
 *     the promise, and never the row's own terrain filter. The scatter's
 *     twenty-two strategic tiles per 1000 land arms about forty of the 120
 *     seat-resource pairs a five-seed sweep asks about; the guarantee forces the
 *     rest, and no seat is short at any size from `standard` up. Behind it, the
 *     start chooser gained its seventh hard rejection — a site with no legal
 *     hex for a listed row in reach (`strategicGround`), unreachable on the
 *     standard sheet and firing only on a `duel` board asked to seat twelve.
 *
 *     Both draw from streams keyed on the seed
 *     (`webciv:mapgen:woodland:grain:<seed>`, `…:clearings:<seed>`) rather than
 *     from the map's own generator, so the terrain, the hills, the rivers and
 *     every later pass's *dice* are bit-identical to v78 on every seed. What
 *     moved is the ground those dice land on: a forest resource needs a forest.
 *
 *     The migration note: a v78 save does not load. The map is regenerated from
 *     the config rather than stored, so a v78 command log replays onto a world
 *     whose woods — and whose deer, furs, horses and iron — stand somewhere
 *     else.
 *
 * v80: **the belief hand's own ladder** (`docs/flags.md` "Rulings 2026-09-06,
 * evening" item i). The user: "make the first reroll free and the following
 * ones cost faith… It should auto-draft a pantheon once you reach the requisite
 * faith. It subtracts that amount from your faith total… Prophet re-rolls
 * reset per roll, and are entirely separate from order drafts." Three moves in
 * `religion.ts`: `openFaithLadder` spends the rung and climbs
 * `PlayerPantheon.rungs` at the *deal* (the pick charges nothing; the offer's
 * `rungCost` is the record); a belief hand's reroll is priced on the hand's
 * own count — new `BeliefOffer.rerolls`, first asking free, then
 * `explainBeliefRerollCost` (the Order draft's base and age multiplier, the
 * exponent raised to the paid askings on this hand), through no door, moving
 * neither `rerollsTaken` nor the chairs' tallies; and the count dies with the
 * hand. A v79 log that rerolled a belief hand replays a different bank.
 *
 * v81: **early production** (`docs/flags.md`, "Rulings 2026-09-06, late — early
 * production", items x and y). Two prices moved, and both of them move in every
 * game. The first paid column of the tree is **10** beakers rather than 13 —
 * Fletching, Husbandry, Mining and Pottery, the four nodes an empire buys before
 * anything else. And the age band that repriced units alone is now one rule for
 * **every hammer price**: `cost × costAgeBase ^ age` at a base of 1.25, asked of
 * buildings and wonders on the same terms as units and folded as its own line
 * (`explainBuildingCost` joins `explainUnitCost`). Æra I is no longer exempt at
 * ×1, which is the ruling read as written — the complaint was that hammers had
 * stopped meaning anything, and an age exempted from the fix would be a rule
 * with a hole in it.
 *
 * A v80 log does not replay. Every research settlement banks against a different
 * threshold and every completion against a different basket, so the first town
 * to finish anything diverges and the rest of the log is a different game.
 *
 * v82: **the cost scale** (`docs/flags.md`, "Rulings 2026-09-07, small hours",
 * item aa — the user on v81's own numbers: "production costs are way too low,
 * they probably need to be like 4–5× what they are now", corrected to "in age 4
 * only", then drawn out in full: "the curve needs to be fairly exponential").
 * The band v81 made a power is the user's **table**: `production.costAgeBand`
 * **[1.25, 2.5, 4.5, 8.5]** by Æra, replacing `costAgeBase`, and a price is
 * `floor(cost × costAgeBand[age − 1])`. Æra I is untouched from v81 and the
 * later eras are two to three and a half times dearer than they were — a
 * Library 35, a Market 147, a Workshop 310, a University 1139. One printed line
 * still ("Æra III ×4.5"); purchases move with it because they convert the
 * folded price, and projects stay outside it as before.
 *
 * A v81 log does not replay — anything an empire built after leaving Æra I
 * finishes on a different turn, and from there the game is a different one.
 *
 * v83: **the wide-play rows** (`docs/flags.md`, "Rulings 2026-09-07 — the
 * early-pacing doc, marked", items cc and ee and the Throne half of dd;
 * `docs/early-pacing.md` §2c–2e). Seven cards and two building rows, and every
 * one of them a JSON row — nothing in the vocabulary moved. The Monument
 * carries `authorityCapacity` 1 again (ruling n), so the fourth town of Æra I
 * is reachable without a technology; the Imperial Throne's flat five writ
 * becomes **three plus one for every three cities held** (a `pays` count on
 * the row's own `effects`, read at the empire scale as every `oncePerEmpire`
 * row is). Three authority Orders (The Elders' Writ, The Marches, The Census)
 * and three science Orders (The Tally Sticks, The Scribes' Hall, The Lamp Kept
 * Lit) join the chiefdom and Government I pools, and The Founders' Charter
 * joins the tier-4 Doctrines — its Monument is `foundingRider.building`, the
 * shape The Founders' Road left standing when its own free Monument was taken
 * away on 2026-09-03.
 *
 * A v82 log does not replay. Six new rows in two early pools is a different
 * bag, so the first draft an empire is dealt is a different hand, and every
 * pick after it lands on a different board.
 *
 * v84: **the bead Orders, and the draft the cards promised** (batch H3,
 * `docs/audit/orchestrator.md` — the fix queue and "What surprised me"). Four
 * rare Æra V Orders carried `effects: []` and were being dealt paying nothing;
 * they now carry one shape between them, `CardEffect`'s `beadPerOccasion` — a
 * grant bead of the empire's own, minted on one of four last-age deeds
 * (`OrderBeadOccasion`: a node of the last age finished, a draft turned down, a
 * city razed, a prophet's proclamation), each hooked at its own single seam.
 * `awardBead` is still the only writer of `Player.beads`; the four new bead
 * rows carry `BeadGrantDef.repeatable`, which gives up the grant class's
 * once-per-empire key and nothing else. Beside it, the surface for
 * `purchaseGreatPersonOffer` — built in the simulation since The Commonwealth
 * was written and constructed by no screen until now — is a rail of calls at
 * the foot of the Reliquary.
 *
 * A v83 log replays **identically until an Æra IV empire holds one of the four
 * cards**, at which point a bead is minted where none was: the rod is longer,
 * the Opus door opens sooner, and every seat's reading of the race differs from
 * there. Nothing about the draw itself moved — the four rows were already in
 * the bag — so the divergence is a payout rather than a deal.
 *
 * v85: **the rerolls, on one ladder** (batch H14, `docs/flags.md` item q;
 * `docs/early-pacing.md` §2f). `rerollOffer` knew two hands and knows four: a
 * **Doctrine** draft and a **great-person** draft join the Order draft on
 * `PlayerStatecraft.rerollsTaken` — one lifetime count, so rerolling any of the
 * three raises the price of all three — at **twice** the Order price
 * (`religion.reroll.heavyMultiple`, a line of its own in the fold) and through
 * the same door. The belief hand keeps its own free-first ladder, untouched, and
 * the shrine engine's tally still counts Order drafts alone. One field is new:
 * `GreatPersonOffer.family`, so a scholar draft bought narrow is redealt narrow.
 *
 * A v84 log does not replay past the first reroll of either new hand — the
 * redeal is drawn inside the command from `state.rng`, so the generator moves
 * where it did not and every draw after it belongs to a different game. A log
 * with no such reroll in it replays identically: nothing about a deal, an Order
 * reroll's price or the tally moved.
 *
 * v86: **the empire stage** (batch H19, `docs/flags.md` item oo — the user,
 * 2026-09-07: *"empire additive bonuses should apply before empire
 * multiplicative bonuses"*). The meter tiers and the arrears multiplied every
 * *town's* basket and nothing else; the empire's own lines — a luxury's empire
 * signature, the caravans abroad, the roads' coin, an Order's empire-wide
 * science — were banked flat, which made a tier a rule about *where* a beaker
 * happened to be earned. They now fold first and take the empire stage once:
 * `(Σ empire lines) × (1 + Σ empire%)`, Entry XVII's shape at the empire's
 * scale, as the ordered list `explainEmpireLines` (`cities.ts`) is the fold of —
 * with the multiplication printed as one reconciliation line per voice. The
 * treasury's **bills** stay outside it: maintenance, a levy's surcharge, a
 * charter's rebate and the treaties are costs rather than yields
 * (`TradeGoldKind`), so a contented empire earns more from its roads without
 * paying its soldiers less.
 *
 * A v85 log replays identically until the first turn an empire holds **both** a
 * meter tier (or an arrears penalty) and an empire-scale line, at which point
 * that turn banks a different figure and every threshold downstream of it — a
 * technology, a border rung, a draft — is crossed on a different turn.
 *
 * v87: **the revision** (batch E2, `docs/flags.md` item pp;
 * `docs/audit/evaluations.md` §2b and §3c — the user, 2026-09-07: *"variables
 * are cached and updated with the user's actions, so yields that have not
 * changed are not recalculated"*). One integer, `GameState.revision`, nought at
 * `newGame`, raised by `applyCommand` on every accepted command and once by
 * each end-of-turn phase after it runs. It is the key every derived reading is
 * remembered under — the town's labelled list (`readCity`), the empire's
 * (`readEmpire`), the law reaching a seat (`liveReading`), the interface's own
 * "re-read" trigger — replacing four private invalidation schemes, of which the
 * loudest was a **print** of everything a seat held, rebuilt on every one of the
 * hundred-odd-thousand asks a late turn makes.
 *
 * A v86 log replays **identically**: the counter is derived from the log and the
 * fixed phase order, no rule reads it, and no figure moves. What moves is the
 * *snapshot* — `snapshotState` is `JSON.stringify(state)`, so a saved state
 * gains a field and its hash changes, which is why this is a schema bump and not
 * a quiet addition.
 *
 * v88: **the deferred rows, first half** (batch E4a,
 * `docs/audit/deferred-rows.md`). Twenty-odd rows that promised a clause the
 * game did not keep were ruled one at a time: five clauses built on shapes that
 * already existed or on a field's worth of new vocabulary, seven struck out of
 * the rows that carried them, and eight rows withdrawn from their pools
 * outright. What moves a replay is that the cards themselves changed — The Curia
 * pays for a Cathedral, Blitz hands a killer its walking back and forbids the
 * trench, The Siege Train pays beside its engines, Patrons pays renown for the
 * culture houses, Triumphs pays renown for a town taken, the Terracotta Army
 * stamps the soldiers raised under it, the Statue of Zeus takes fifteen percent
 * off a wall, Notre-Dame and the Observatory and the Shipyard read what they
 * always printed, three great people's legacies stopped being empty, The Vigil
 * pays while a rite runs, Castellany answers arrows, Ivory puts hammers behind
 * soldiers, and The Long Road and The First Keel can be earned at last.
 *
 * A v87 log replays identically **only** in a game where none of those rows was
 * ever held, drawn or reachable — which is to say, almost none. A pool that lost
 * five Orders and gained two Doctrines deals different hands from the first
 * draft on, and every seeded draw after that belongs to a different game. This
 * is a content bump, and content is what the log is played against.
 *
 * v89: **the production standard** (batch P1, `docs/production-costs.md` — the
 * user, 2026-09-07: *"we need to scale them back … buildings should be sized
 * small, medium, large, wonder, and we should use one set of scaling notation
 * across the board. Costs should scale this base production cost by column
 * number in the tech tree."*). Every hammer price in the game is now
 * `sizeHammers[size] × columnRate ^ (column − 1)`, floored once, with the
 * once-per-empire line after it and the settler's ladder on top: a row carries a
 * **size** (`BuildingDef.size`, `UnitDef.size`) and never a figure, and the
 * column is `techColumn` of the technology that unlocks it — or the row's own
 * `column` where the tree names nothing, which is how a charter's building is
 * finally priced in the age its pool opens in rather than as Æra I. The rate is
 * the user's **1.31**; `costAgeBand` is retired with the printed bases it
 * multiplied. Two ladders became one: a Cathedral is 397 where it was 1530, a
 * University 520 where it was 1139, a Bank 893 where it was 1530, a Market 89
 * where it was 147, a Granary 30 where it was 26, Notre-Dame 1934 where it was
 * 2720. The roster rides the same curve at the same rate (ruled: playtest first)
 * — a warrior 10, a knight 297, a frigate 448, a settler 28 and 42 at its third.
 *
 * A v88 log does not replay. Every completion lands on a different turn and the
 * first one to move takes the rest of the game with it.
 *
 * v90: **the audience** (batch D1, `docs/war-diplomacy.md` §12). A paper put to
 * an empire is answered while the player is still standing at the table: the
 * client driving a bot seat asks that seat's answer arm at once and dispatches
 * the bot's own command (`answerAudience`, `src/ai/driver.ts`), so an offer is
 * signed or sent back in the same breath it was made. Two things move in the
 * rules to allow it — a new command **`declinePeace`**, which sends the other
 * seat's envoy home (before this a peace offer stood for ever, and "no" was not
 * a thing a seat could say), and a peace that **closes on the second
 * signature**, inside that command, rather than at the turn's end. Civ's rule,
 * and the one an audience needs: a seat that signed is at peace now. The
 * end-of-turn phase stays as a sweep for a pair whose flags met without a
 * command between them.
 *
 * A v89 log replays identically only in a game with no peace in it. Where there
 * is one the war ends a beat earlier — inside the signing command rather than in
 * that turn's resolution — and the expulsions, the ceded towns and everything
 * the rest of that turn was priced against move with it.
 *
 * v91: **a luxury is lent by the copy, and Petra stands at the edge of the sand**
 * (batch T1, flags (tt) and (uu)). The deal register lent the *kind*: a clause in
 * `openedResource` refused the giver every tile of a promised luxury, so an
 * empire with two amber that lent one kept none of it and the ground stopped
 * paying as well (the user, 2026-09-08: *"i have two copies of amber. I traded
 * one amber to the bot for marble. I should be getting the +4 happiness from
 * having a unique amber and a unique marble"*). The clause is gone. One deal row
 * now lends **one copy**; `resourceCopies` is where the whole rule lives — opened
 * tiles, less the copies promised away, floored, plus the copies received — and
 * `hasResource`, `controlledHoldings` and a town's own `cityResources` are three
 * readings of that one figure. The tile itself never stops paying its yield:
 * only the signature crosses the table. Beside it, Petra's `requiresSite` takes
 * the new `terrainBeside` scope (the user, same day: *"To build petra, you only
 * need to be settled on or adjacent to desert"*) — the centre hex or the ring of
 * six, a third question beside `onTerrain`'s centre and `terrainInBorders`'
 * culture-fed borders.
 *
 * A v90 log replays identically only where nobody ever lent a luxury and nobody
 * raised Petra. Where a bargain was struck the contentment on both sides of it
 * moves, and every growth, purchase and build priced against that happiness
 * moves with it; where a town beside the sand can now raise a wonder it could
 * not, its whole queue is a different game.
 *
 * v92: **the tech ladder re-anchored at 10** (batch S1, `docs/flags.md` item
 * (vv); v91 is batch T1's, in flight beside this one — the user, 2026-09-08:
 * *"adjust the science tree costs according to the
 * decreased cost from the first tech … let's go with A for now"*). The first
 * paid column was hand-cut from 13 to 10 on 2026-09-06 without the ladder above
 * it being re-run, so every column from the second up was still priced off an
 * anchor that no longer existed. It is re-run now: the same taper from
 * cost(1) = 10 for the columns the formula owns (30 · 69 · 135 · 225 →
 * 23 · 53 · 105 · 175) and the seven authored late columns scaled by the same
 * 10/13 (400 · 540 · 680 → 310 · 415 · 525; 1450 · 1700 · 1950 · 2200 →
 * 1100 · 1300 · 1500 · 1700). No node's column moved and no prerequisite was
 * touched — a column is still a price, and this is the price the column now
 * carries. The tree is 27401 beakers where it was 35698.
 *
 * A v90 log does not replay. Every technology after the first lands on a
 * different turn, and a tree that arrives early takes every unlock, every
 * escalation and every bead threshold in the game with it.
 *
 * v93: **the Orders balance pass** (batch B1, `docs/flags.md` item (xx) — the
 * user's marks on `docs/orders-and-doctrines.md`, 2026-09-08). Fifteen rows
 * moved and three are new. The new ones first: **The Muses' Call** is a Pool I
 * Doctrine that opens the great-person door before the tree does, calls one
 * great person the moment it is adopted, and pays +1 production on every great
 * person's work; **Boatwrights** (chiefdom) pays +1 production in every coastal
 * city and **Fish Weirs** (Government I) +1 food on every fishing boat, the
 * first two rows of the worksheet's Tide thread. **Divine Inspiration is
 * withdrawn** — banked faith is meant to be spent — and **The Horse-Tribes'**
 * struck strength clause is built as a flat +1 for the mounted, its second
 * deferral dropped with it. The rest are dials: Thalassocracy converts food to
 * production rather than gold, Mountain Hold reads a mountain anywhere in the
 * borders rather than one hex from the centre, The Great Warring Tribes' hammers
 * stand without the authority gate, Manifest of the Steppe loses its happiness
 * bill, The Gilded Court gains +2 authority capacity, Master of Maps loses both
 * science riders, Pax Imperia's +3 culture becomes +10%, The Pilgrim Ways pays 3
 * faith a congregation and The Natural Philosophers half a turn of culture a
 * technology; The Elders' Writ seats two.
 *
 * One shape is new — `grantsAbility`, a card handing over a verb the tree
 * teaches, folded into `hasAbility` so a door keeps one answer — and one field,
 * `DoctrineDef.onAdopt`, which is `OrderDef.onSlot` at the Doctrine's scale.
 *
 * A v92 log does not replay: a Doctrine pool that no longer holds Divine
 * Inspiration and two Order pools that hold a row they did not deal the same
 * hands, and every offer after the first draft diverges from there.
 *
 * v94: **the Governments marks** (batch B1b, `docs/flags.md` item (zz) — the
 * user's marks on the Governments table of `docs/orders-and-doctrines.md`,
 * 2026-09-08, which rode into an earlier commit and were missed by B1's pass).
 * Three chairs move. **War Chief** trades its scaled combat line — +1 for every
 * second city, capped at three — for +3 authority capacity and a flat +2 that
 * pays from the first turn it is adopted; the two kill riders stand.
 * **Theocracy** gains its capital's faith again as science and as culture at a
 * fifth of the rate where it was a tenth. **Tyranny** goes to +5 authority
 * capacity, gains a flat +2 combat strength, and its raids cost no movement.
 *
 * That last is one new behaviour rule — `freePillage`, read in `pillageAt`
 * where the raid's single point is spent and nowhere else — and the Governments
 * table's Signature column becomes each row's own `text`, the four early rows
 * gaining one, sync-tested beside the chairs.
 *
 * A v93 log does not replay: an empire under any of the three banks different
 * writ, different strength and different beakers from the turn it adopts, and a
 * raid under Tyranny leaves its column somewhere the old law could not reach.
 *
 * v95: **the deferred rows that needed a shape** (batch E4b,
 * `docs/audit/deferred-rows.md`; v93 is batch B1's and v94 batch B1b's, landed beside this one).
 * E4a built every ruling that was a data row on a shape that already existed and
 * left the ten that were not. They are built here, and what each needed is
 * written on its own row: The Levée en Masse musters a levy on the calendar and
 * **stamps it** with a point of movement for life (`UnitStamp.movement`, read in
 * `fullMovement`, handed to `createUnit` by the muster); The King's Road fills a
 * piece's allowance when it comes to rest in one of your towns, and Admiralty
 * lands its men **free** and gives them three turns of strength — two rules read
 * at the two movement seams that already exist (`stepCost` prices the pair of
 * hexes, `advanceAlongPath` hangs the blessing, and neither is a second price).
 * Five buildings join the table: the **Stable** at The Wheel (which is what The
 * Horse-Tribes was waiting for), the **Printing House** un-retired to take the
 * beakers the roads bring it, the **Bourse** at Paper Money — a `oncePerEmpire`
 * house whose coin becomes culture, which is how a `pays` rate reaches the
 * empire's own books — and the **Bank** and the **Cistern** reworked: a share of
 * the coin where a caravan ends (`routeEndsHere`), and farms watered by the town
 * that works them (`BuildingDef.irrigates`, read where the renewal reads the
 * river). The Silk Exchange doubles what its roads carry in beakers and song
 * (`CardRouteYieldEffect.share`), Manufactories pays the towns that hold one,
 * and **The Crusade** presses a lump of faith wherever its soldiers kill —
 * `bankPressure`'s third caller.
 *
 * A v92 log replays identically only in a game where none of those rows was ever
 * held. Where one was, a piece walks further, a levy is stamped, a caravan pays
 * more or a citizen turns — and every basket priced against it moves.
 *
 * v96: **the beliefs balance pass** (batch B2, `docs/beliefs.md` — the user's
 * marks of 2026-09-08; v93 and v94 are the batches in flight beside it). The
 * worksheet came back marked and the marks are rulings: Star Readers pays four,
 * the almanac comes round every ten turns, an altar takes twenty-five, Lord of
 * the Hoard is **The Stone Hoard** and pays a mine *or* a quarry on any seam at
 * all, The Vigil pays two tenths instead of two flats, and The Living Rock is
 * withdrawn. Two gods are new — Vineyard Rites on the plantations, Cult of
 * Heroes on the whole renown trickle. Choirs and the Tithe Houses swapped their
 * steps; the Preachers walk five hexes; Ecclesia's stones pay three; the
 * Congregation counts by threes to five; Pilgrims' Coin pays coin for every
 * following town in the world; the World Church pays a *share* of culture per
 * following empire. Cathedrals of the Sky and Feast Days moved onto the
 * **temple** rather than onto the town, so a share of a temple's worth has one
 * figure to take.
 *
 * And **Holy Order is built**: the Knights Templar are a roster row no
 * technology opens (`UnitDef.unlockedByCard`, `CardUnlocksUnitEffect`), bought
 * out of the faith bank, armed and priced off whatever horse the age has taught
 * this empire (`UnitDef.mirrors`). The `cityHappinessDemand` meter rule went
 * with the pass (the user: *"Don't keep the useless rule"*) and the Manifest of
 * the Steppe is the settlers' card alone.
 *
 * A v92 log does not replay. Every one of those figures is banked into a
 * different pool on a different turn, a pantheon draw no longer deals The
 * Living Rock and therefore deals a different god from the same seed, and the
 * roster grew a row — which moves nothing that was raised and everything that
 * is drawn against a list of them.
 */
/**
 * v97: **the second beliefs pass** (batch B3, `docs/beliefs.md` — the user's
 * marks of 2026-09-08, the second set). Seven rows, and one of them is a shape.
 *
 * **Herd Gods** pays a hammer and a candle on every pasture, which is the wild
 * axis' answer to the plantations. **The Crusade** fights for three instead of
 * two. Two enhancers count the tide by what stands in it: **Marvels of the
 * Faith** pays five beakers and five songs for every following city in the world
 * that holds a wonder, and **The Scriptoria** a beaker for every faith house in
 * one — two new `following…` counts, over the sweep the other five already
 * share.
 *
 * And **four follower beliefs open four buildings** — the Mosque, the Wat, the
 * Gurdwara and the Dar-e Mehr. Each is bought with faith and never built
 * (`BuildingDef.purchase`, the roster's marker one table over, at
 * `faithPerHammer` per hammer of the ordinary cost), and each may stand only in
 * a town that keeps the faith which opened it (`BuildingDef.followingOnly`,
 * read in `purchaseError` and nowhere else). A follower belief is city-local, so
 * a row it hands over is opened for **whoever owns a following city**:
 * `cardUnlocksBuilding` walks the empire's own towns' beliefs after its law.
 *
 * A v96 log does not replay. The pantheon and both belief pools grew rows, so a
 * draw from the same seed deals a different hand; a Crusade's blow lands harder;
 * and a town that bought a faith house is a town holding stones the old build
 * has no id for.
 */
/**
 * v98: **standing orders walk on this turn's points** (batch U1,
 * `docs/flags.md` (bbb) — the user, 2026-09-08: *"a unit's orders should only be
 * performed at the end of the turn if they have available movement"*).
 *
 * One phase changed and one march moved. `resetMovement` (`turn.ts`) used to
 * refill every allowance and then walk every stored path on the points it had
 * just handed out, so a column under orders opened its owner's turn with that
 * turn's movement already spent, standing somewhere nobody had watched it walk
 * to. The second pass is gone: the refill resumes nothing, and
 * `spendLeftoverMovement` — one line above it, on this turn's own leftover — is
 * now the only phase in the pipeline that marches a standing order.
 *
 * A v97 log does not replay. **Every multi-turn march arrives a turn later**,
 * and a column stands one turn's allowance short of where the old pipeline put
 * it on the turn it set out — which moves what a scout sees, which hex a raider
 * burns a camp on, and therefore every die rolled after it.
 */
export const SCHEMA_VERSION = 98;

/**
 * One effect that runs out — an augur's rite hanging on a city or a unit
 * (ledger Entry XXVIII).
 *
 * **The whole subsystem is this type plus one comparison.** `expiresTurn` is an
 * absolute turn and the reading is `state.turn < expiresTurn`; nothing anywhere
 * decrements anything. That is `SlottedOrder.sealedUntil`'s lesson taken as a
 * rule: a countdown is state that has to be ticked, a phase that ticks it is a
 * phase that can be skipped, run twice or run in the wrong order, and a turn
 * number is *compared* instead of maintained. `pruneTimedEffects` (`turn.ts`)
 * exists only to stop dead paper accumulating in a save — deleting nothing would
 * change no outcome, which is exactly the property that makes it safe.
 *
 * `effect` is an ordinary `CardEffect` and is read by the **same evaluators**
 * that read a slotted Order's: a timed city percentage joins `foldCityStages`, a
 * timed strength line joins `planCombat`'s list, a timed border percentage joins
 * the borders channel, a timed tile line joins `explainTileYield`'s. There is no
 * second interpretation of a card effect anywhere in the game, and a rite is not
 * about to be the first (see `statecraft.ts`, `liveCityEffects`).
 *
 * `card` is the rite it came from, so the line labels itself off the one table
 * — "Rite · Omen Reading (12 turns left)" — and a saved game carries a name
 * rather than a sentence.
 */
export interface TimedEffect {
  /** The rite (a `CardId`, see `statecraftData.ts`) that stamped this. */
  card: CardId;
  effect: CardEffect;
  /** Live while `state.turn < expiresTurn`. Never a countdown. */
  expiresTurn: number;
}

// --- players ----------------------------------------------------------------

/** What the caller asks for; `newGame` turns each spec into a `Player`. */
export interface PlayerSpec {
  name: string;
  /** CSS colour string. The simulation never interprets it; the UI does. */
  color: string;
  /**
   * The seat's heraldic charge — a crescent, a stag, a key — as a plain string.
   * The simulation never interprets it; the renderer and the interface do (see
   * `src/art/heraldryMarks.ts`, which owns the twelve ids and the drawings).
   *
   * `color`'s sibling in every respect, and deliberately so. It is **config**,
   * which is what makes it replay-safe: a save is `{config, log}`, so a game
   * reloaded a year later flies the banners it was started with rather than
   * whatever the fallback order happens to be by then.
   *
   * Optional, and absent means *by seat order* (`heraldryFor`) exactly as an
   * unrecognised colour means by seat order. That is what let heraldry arrive
   * without a line changing in setup, and it is why **no schema bump** was
   * needed: `normalizeConfig` writes the key only when it is there, so a config
   * that never heard of charges normalises byte-identically to one from before
   * they existed — and nothing in `src/sim/` reads the field, so no outcome can
   * turn on it.
   */
  charge?: string;
  /**
   * Which way a seat *nobody is sitting in* plays — `'wide'`, `'tall'`,
   * `'zealot'`, `'warmonger'`, or absent for the balanced default.
   *
   * `charge`'s sibling in every respect, and for `charge`'s reasons. It is
   * **config**, so a game saved today replays a year from now with the same
   * seats playing the same way rather than whatever the default has become; it
   * is an **uninterpreted string** here, because the simulation must never read
   * it — the roster of personas lives in `data/ai.json` and is `src/ai/`'s
   * business alone (`aiConfigFor`).
   *
   * **No schema bump**, and the argument is exact: a persona drives the *bot*,
   * not the reducer, and an old save replays its command log without ever
   * running one. `normalizeConfig` writes the key only when it is there, so a
   * config that never heard of personas normalises byte-identically to one from
   * before they existed.
   */
  persona?: string;
  /** Defaults to false — the caller decides who sits at the keyboard. */
  isHuman?: boolean;
}

/**
 * One great person this empire has spent, and whether their legacy still speaks.
 *
 * **A legacy is history, and history is never deleted** (the 2026-08-28 ruling
 * that revoked the "nothing revokes a legacy" trap). Three ratified rows lose
 * their ability on an occasion — Archimedes when an enemy walks into his city,
 * Hypatia the first turn the realm turns ugly, Boudica when her age closes — and
 * the mechanism is a *mark*, not a splice: the record stays in spend order, the
 * roll of who served this empire stays exactly what it was, and only
 * `liveEffects` stops reading a revoked row.
 *
 * `age` is the empire's era at the moment the person was spent, and it is here
 * for exactly one revocation: "only during the age she was recruited in" is a
 * comparison against a stamp, in the `TimedEffect` tradition — an absolute
 * number, compared, never a counter anything has to tick.
 */
export interface LegacyRecord {
  id: GreatPersonId;
  /** The empire's era (`highestAge`) when this person was spent. */
  age: number;
  /**
   * Present once the occasion on the row has happened. **Never removed** — the
   * key is the whole of the mechanism, and a legacy that came back would be a
   * fourth state nothing in the design asks for.
   */
  revoked?: true;
}

export interface Player {
  /** Stable id, equal to the player's index in `GameState.players`. */
  id: number;
  name: string;
  color: string;
  /**
   * The seat's heraldic charge, copied from its spec. Absent means *by seat
   * order* — see `PlayerSpec.charge`, which carries the whole argument.
   *
   * Uninterpreted here for `color`'s reason, and it must stay that way: the day
   * a rule reads this field it stops being decoration and starts being a schema
   * bump.
   */
  charge?: string;
  /**
   * The seat's bot persona, copied from its spec. Absent means balanced — see
   * `PlayerSpec.persona`, which carries the whole argument.
   *
   * Uninterpreted here for `charge`'s reason, and it must stay that way: the day
   * a *rule* reads this field the bot stops being a reader of the state and
   * starts being part of it, and that is a schema bump.
   */
  persona?: string;
  isHuman: boolean;
  /** Treasury. Every city's gold lands here; nothing spends it yet. */
  gold: number;
  /**
   * Science banked toward the current technology. A pool rather than a per-turn
   * rate because research is bought, not rented — and, since Milestone 4, the
   * pool *is* the progress: there are no per-tech buckets, so switching research
   * moves the aim and loses nothing. See the model note in `tech.ts`.
   */
  sciencePool: number;
  /**
   * Culture banked toward the next Statecraft draft — and **the basket itself**,
   * not a running total beside one (see `PlayerStatecraft`, which deliberately
   * has no basket field of its own).
   *
   * Spent by the `statecraft` phase, which deducts the draft's cost and leaves
   * the overflow here toward the next one. Border culture is a **separate
   * channel** (`City.culture`) and is not touched: one turn's culture fills a
   * city's border basket and this pool in parallel, exactly as it did before
   * anything spent either.
   */
  culturePool: number;
  /**
   * Faith banked by every temple hill, incense grove and jade seam the empire
   * works — and **spent on augurs** (ledger Entry XXVIII).
   *
   * It shipped as a deliberate half-system: faith is a *tile* yield in the
   * ratified luxury table — incense pays it where it grows, jade pays it out of
   * the rock — so either the algebra carried it or four rows shipped with their
   * signature quietly deleted. The pool filled, the top bar showed it, and the
   * hover said out loud that the faithful were gathering and their purpose came
   * later. That was an honest empty room; a number that silently did nothing
   * would not have been.
   *
   * The room is furnished now. `purchaseUnit` charges this pool through
   * `explainPurchaseCost` (`religion.ts`), which is the only thing that spends
   * it — augurs, and nothing else, because "keep faith legible" is the design
   * (`docs/deprecated/religion.md`). The hover's note is *gone* rather than reworded,
   * exactly as it promised.
   *
   * A pool rather than a rate, exactly as `sciencePool` and `culturePool` are:
   * what spends it spends a bank, not an income.
   */
  faithPool: number;
  /**
   * The technology `sciencePool` is currently aimed at, or `null` when the
   * player has not chosen one. Set by the `chooseResearch` command and cleared
   * by `advanceResearch` the moment the tech completes.
   */
  researching: TechId | null;
  /**
   * What this player has lined up **after** `researching`, in the order it will
   * be learnt. Absent means nothing is queued.
   *
   * Presence is the state, which is `Unit.path`'s convention and is here for the
   * same two reasons: an empire that never queued anything serialises exactly as
   * it did before this field existed, and a state that reaches this build with
   * no key at all reads as an empty queue rather than as a crash. Every read goes
   * through `researchPlan` (`tech.ts`), which is where the `?? []` lives.
   *
   * The head is deliberately **not** in here. `researching` is still the whole of
   * "what the beakers are aimed at" — switching is still free and lossless, the
   * pool is still the progress — and this is only what follows, so nothing that
   * asked `researching` before has to learn a second question. The invariant that
   * makes the End Turn blocker still correct is the other half of that split: a
   * non-empty queue always has a head, because the only two writers
   * (`writeResearchPlan` and `promoteResearchQueue`) fill `researching` from the
   * front of the plan and delete this key the moment nothing is left behind it.
   */
  researchQueue?: TechId[];
  /**
   * Technologies this player holds, in the order they completed.
   *
   * On the player rather than in a parallel array on the state, unlike
   * `turnEnded`: this is a fact *about a player* that outlives every turn, and
   * an array indexed by id would be a second length invariant to keep in step
   * (see the `turnEnded` trap in CLAUDE.md). An array rather than a `Set`
   * because the state has to survive `JSON.stringify`, and because iteration
   * order that is part of the state is iteration order a replay reproduces.
   *
   * Seeded from `rules.research.startingTechs`, so a new city can build
   * something on turn one.
   */
  techsResearched: TechId[];
  /**
   * Every seat this empire has **met**, in seat order — and it is a memory, not
   * a reading of the board (user, 2026-09-04: *"meeting should be permanent, and
   * only need to sight a unit or tile the player owns once"*; schema 64).
   *
   * This is the field `hasMetSeat`'s docblock said would have to exist. Meeting
   * was derived from four things the board still draws, and the honest gap in
   * that reading was written down beside it: nothing remembers a column that
   * walked past a scout and walked away, so a meeting made by a fleeting
   * sighting *lapsed* with the sighting. A meeting is not the kind of fact that
   * can be un-happened, so it is stored.
   *
   * **Sorted ascending, and an array rather than a `Set`** — `techsResearched`'
   * two reasons exactly: the state has to survive `JSON.stringify`, and an
   * order that is part of the state is an order a replay has to reproduce. Sorted
   * rather than in the order the meetings happened, because two seats met on one
   * sweep would otherwise serialise in the order the sweep happened to visit
   * them.
   *
   * **Written in one place** — `recordMeetings` (`visibility.ts`), off the same
   * `lit` set the fog and the city memory are folded from, so a meeting happens
   * exactly when a seat can *see* something: a piece of theirs, or ground their
   * towns own. Every mover already ends inside a recompute, so there is no seam
   * to remember to hook.
   *
   * **The wild is never met and never meets.** It is a seat, and it is nobody's
   * acquaintance: `realPlayers` keeps it off every roster a screen draws, so a
   * stored meeting with it would be a row nothing prints and a fact nothing
   * asks. `hasMetSeat`'s live clauses still answer for a barbarian under your
   * eye, which is what the combat forecast wants; this register simply never
   * grows for it, on either side.
   *
   * Nothing ever removes an id. That is the whole of the ruling.
   */
  metSeats: number[];
  /**
   * How many of each escalating unit type — settler and worker, today — this
   * player has *completed from production or bought*, keyed by `UnitTypeId`.
   * The multiplier in `explainUnitCost` (`cities.ts`), one ladder per type
   * rather than one shared ladder (schema 31; the settler-only reading was
   * `Player.settlersBuilt`, a single counter).
   *
   * Presence is the state, exactly as `Unit.path` and `researchQueue` are: a
   * type never built has no key rather than a zero, so an empire that has
   * founded no city and trained no worker serialises as it did before either
   * type could escalate.
   *
   * "Built" is meant strictly, and the two exclusions are the rule rather than
   * an oversight. The settler a player opens the game holding was never paid
   * for, so it does not make the next one dearer; a unit taken off a rival on
   * the battlefield was paid for by *them*, and capturing one is already its
   * own kind of expensive — captured units never reach this counter because
   * `captureUnit` never calls `realiseItem`. `realiseItem` is the *only* place
   * any key here climbs, for both a completion and a purchase, and it skips a
   * free grant (`options.free`) for the same reason a capture is skipped: a
   * gift was not *built*.
   *
   * On the player rather than derived from the board because it can never be
   * derived: a settler is *consumed* when it founds, so counting the ones
   * standing around would price the fourth city like the first.
   */
  unitsBuilt: Partial<Record<UnitTypeId, number>>;
  /**
   * How many tiles this player has ever bought with gold (`purchaseTile`).
   *
   * The escalation ladder in `explainTilePurchase` (`cities.ts`), and per
   * *player* rather than per city because that is what it is meant to price: Civ
   * 6 escalates a habit of buying land, and a habit belongs to an empire. Kept
   * on the player for `unitsBuilt`'s reason — it can never be derived from
   * the board, because a bought tile is indistinguishable from a tile culture
   * claimed the moment the gold has left the treasury.
   *
   * Nothing lowers it. Losing the ground does not refund the habit.
   */
  tilesPurchased: number;
  /**
   * How many barbarian camps this player has ever **burnt out**
   * (`arriveOnTile`, the one seam that clears one).
   *
   * `tilesPurchased`' twin one verb over, and it is on the player for that
   * counter's reason exactly: it can never be derived from the board, because a
   * cleared camp leaves *nothing behind* — that is what clearing one means. The
   * board can answer "how many camps still stand" (`visibleCamps`) and "how many
   * have I found" (`discoveredCamps`, off the monotone fog); only a record can
   * answer "how many did I ride down".
   *
   * Nothing lowers it. The Last Hunt is a tally of a life's work, and a hunt
   * that stopped counting when the steppe emptied would be a card that punishes
   * finishing the job.
   */
  campsCleared: number;
  /**
   * True once this player holds no units and no cities. They are out.
   *
   * A flag rather than a removal from `players`, and that is load-bearing: the
   * `turnEnded` array is indexed by player id and player id *is* the index (see
   * the trap in CLAUDE.md), so splicing a player out would renumber everybody
   * after them and silently reattribute every command in the log. An eliminated
   * seat therefore stays in the array, keeps its id, and is simply finished
   * forever — `clearTurnEnded` re-raises its flag every turn, so it never blocks
   * a resolution and never gets another window to act in.
   *
   * Set by `updateElimination` (`combat.ts`), which runs both inside the attack
   * that caused it — so a turn cannot deadlock waiting for a player who was
   * wiped out mid-window — and as a turn phase.
   */
  eliminated: boolean;
  /**
   * True for **the wild** — the one appended seat that owns every camp and every
   * raider, and is nobody's opponent in the sense the rest of this file means.
   *
   * A seat rather than an ownerless unit, and that is the whole design (ledger
   * Entry XX). Every rule in this simulation is written in terms of a `Player`:
   * combat asks whose unit it is, stacking asks whose category is on the hex,
   * visibility keeps a grid per player id, `attackTargetAt` reads `ownerId !==
   * ownerId`. Ownerless barbarians would have meant a second answer to each of
   * those, which is the thing rule 5 forbids one grade up. So the wild is a
   * player, and the *exclusions* are written down once instead.
   *
   * It is **appended last**, after the opening rosters are seated, so player id
   * is still the player's index (the trap in CLAUDE.md) and every real seat keeps
   * the id it would have had in a game with no barbarians at all. Its flag is
   * always present, like `eliminated` and unlike `pendingDiscovery`, because
   * "is this seat the wild" is a fact about every player rather than a state some
   * of them are in.
   *
   * What it is excluded from, and where each exclusion is written:
   *   · the turn — `clearTurnEnded` re-raises its flag every turn, exactly as it
   *     does for an eliminated seat, so nothing ever waits for the wild;
   *   · victory and elimination — `updateElimination` skips it, so a solo game
   *     against barbarians is not won the moment their last camp falls;
   *   · research — `advanceResearch` skips it: the wild does not learn, it
   *     inherits (see `barbarianTier` in `barbarians.ts`);
   *   · the meters, the seat cycle and the End Turn blockers — all interface, all
   *     asked of `realPlayers`.
   * What it is emphatically *not* excluded from is combat, movement, stacking and
   * fog. Those are the rules it exists to be inside.
   */
  barbarian: boolean;
  /**
   * A claimed ruin or village whose boon has not been chosen yet, or the key is
   * **absent** — which it is for every player almost all of the time.
   *
   * Presence *is* "this empire owes the game a decision", which is `Unit.path`'s
   * convention and is here for the same reason: a player who has never found a
   * ruin and one who has just spent its offer must serialise identically.
   *
   * Written by `claimDiscoveryAt` the moment a unit steps onto a site, and
   * cleared by the `chooseDiscovery` command. The offer is stored rather than
   * re-rolled on demand because it is a **draw**: rolling it when the card opens
   * would make the options a function of when somebody looked at a screen, and
   * under simultaneous turns two seats look at different times. Both halves are
   * in the log — the movement that claimed it and the pick that spent it — so a
   * replay deals the same three cards and takes the same one.
   */
  pendingDiscovery?: DiscoveryOffer;
  /**
   * Everything Statecraft knows about this empire: its tier, its government, its
   * Orders and where they are slotted, its Doctrines, and any offer outstanding
   * (ledger Entry XV and XV.b; the shape and every rule are in `statecraft.ts`).
   *
   * **Always present**, like `techsResearched` and unlike `pendingDiscovery`:
   * every seat has a government and a slot spread from turn one, so this is a
   * fact about a player rather than a state some of them are in. The wild gets
   * one too — a `Player` is a `Player`, and giving the seat a chiefdom costs one
   * object and spares every reader an `undefined` check. Nothing ever fills it:
   * the phase skips the wild exactly as `advanceResearch` does.
   *
   * A nested object rather than eight fields, because it is one subject with one
   * lifecycle — created whole, replaced wholesale on adoption, and read all at
   * once by one screen.
   */
  statecraft: PlayerStatecraft;
  /**
   * The empire's native cults: which gods it has consecrated, and any belief
   * offer outstanding (ledger Entry XXVIII; the shape and every rule are in
   * `religionData.ts` and `religion.ts`).
   *
   * **Always present**, like `statecraft` and for its reason: every seat has a
   * pantheon from turn one, empty though it is, so this is a fact about a player
   * rather than a state some of them are in. The wild gets one too and nothing
   * ever fills it — the phases skip it exactly as `advanceResearch` does.
   */
  pantheon: PlayerPantheon;
  /**
   * How many augurs this player has ever **bought with faith**.
   *
   * `unitsBuilt`'s twin one currency over, and the escalation in
   * `explainPurchaseCost` (`religion.ts`): the second augur costs 15🕯 more than
   * the first, so *when* to spend faith on a god rather than on three rites is a
   * tempo decision against a climbing price.
   *
   * On the player because it can never be derived, for `unitsBuilt`'s reason
   * exactly: an augur is *consumed* by consecrating or by its last rite, so
   * counting the ones standing around would price the fourth like the first.
   * Nothing lowers it, and a captured augur does not raise it — it was paid for
   * by somebody else.
   */
  augursPurchased: number;
  /**
   * How many prophets this player has ever **bought with faith**.
   *
   * `augursPurchased`' twin, and a field of its own rather than one counter for
   * both agents: the two climb separate ladders (40 +15 against 120 +60), so a
   * shared counter would make the first prophet cost whatever the augurs had
   * already run the price up to. Read in exactly one place (`purchasesMade`,
   * `purchase.ts`), which is where the augur's is read.
   */
  prophetsPurchased: number;
  /**
   * Renown banked toward the next great person — **the fifth Entry XVIII
   * bucket**, and the basket itself (`docs/great-people.md`).
   *
   * `culturePool`'s twin one currency over, and deliberately the same shape: a
   * *pool*, not a rate, filled by buildings and wonders a turn at a time and by
   * Triumphs in lumps, and spent by `settleRenownWindfall` (`renown.ts`) the
   * instant it covers the ladder. There is no second bank anywhere and there
   * must never be — a second answer to "how close am I to a recruitment" is two
   * answers that disagree the first time a windfall pays one of them.
   *
   * The overflow stays here toward the next name, exactly as the culture pool's
   * does.
   */
  renownPool: number;
  /**
   * How much renown each family has *fed this empire*, ever — the record the
   * offer is weighted by.
   *
   * Not a second pool: nothing is ever spent out of it and nothing is ever
   * subtracted. It is a **history**, and it exists because the draw has to be
   * able to say "an empire of libraries is offered scholars" without any rule
   * saying so. Ever, rather than this-turn, so a library torn down by a
   * conqueror does not un-teach the empire what it was.
   *
   * Always present with all five keys, like `techsResearched` and unlike
   * `greatPersonOffer`: every seat has a feed record from turn one, empty though
   * it is, so this is a fact about a player rather than a state some of them are
   * in. A record rather than five fields because it is read all at once by one
   * weighting and by one hover.
   */
  renownByFamily: Record<Family, number>;
  /**
   * The great people this empire has **spent**, in the order they were spent —
   * and therefore the legacies reaching it (*they served you; their legacy
   * remains*).
   *
   * `liveEffects`' **sixth source** (`statecraft.ts`): each record is looked up
   * through `anyCardDef` and its `legacy` walked exactly as a belief's effects
   * are — **unless it has been revoked**, which is one filter in that walk and
   * the only reading of `LegacyRecord.revoked` anywhere. Nothing else in the
   * game reads this list for its effects; `greatPeopleEarned` reads it for a
   * *count*, and a revoked legacy still counts, because The Empire's line says
   * "earned this game" and a general who is no longer heeded was still earned.
   *
   * An array in spend order, for `techsResearched`' reason: iteration order that
   * is part of the state is iteration order a replay reproduces, and a ledger
   * that reshuffled itself would look wrong for no reason.
   */
  legacies: LegacyRecord[];
  /**
   * Blessings and **bills** hanging on the empire itself, each until an absolute
   * turn. `City.timed` and `Unit.timed`'s third holder.
   *
   * Crassus' is the first and says why the holder had to exist: "−1 happiness
   * for 10 turns after every purchase" is a fact about the *realm's* mood, and
   * hanging it on the town that happened to buy the granary would have been a
   * quieter, wrong rule. Everything else about it is the other two holders'
   * exactly — absolute expiry, ordinary `CardEffect`s, the same evaluator, the
   * same broom (`pruneTimedEffects`), the key deleted when the list empties so
   * an empire that has paid its debts serialises like one that never bought
   * anything.
   */
  timed?: TimedEffect[];
  /**
   * The Triumphs this empire has earned, in the order it earned them.
   *
   * Append-only and stamped with the turn, which is what makes the *news* a
   * diff rather than a sink threaded through nine mechanisms: what a command
   * awarded is the slice past the length it started at (`triumphsAwarded` in
   * `triumphs.ts`), and what a resolution awarded is the same slice taken across
   * every seat. `arriveOnTile` reports rather than announces; this is the same
   * idea for a thing that happens in ten places instead of two.
   *
   * It is also the **register of what has been earned**, which is how `once` and
   * `perAge` are enforced — see `awardTriumph`.
   */
  triumphs: EarnedTriumph[];
  /**
   * How many great people this empire has ever **recruited** — the ladder in
   * `renownThreshold` (`renown.ts`).
   *
   * `unitsBuilt`'s and `augursPurchased`' third sibling, and on the player
   * for their reason exactly: a recruited person is *consumed* by its act or its
   * work, so counting the ones standing around would price the fourth like the
   * first. `legacies.length` is deliberately not the counter either — a person
   * is recruited when it is picked and leaves its legacy only when it is spent,
   * and an empire holding an unspent great person has already paid for it.
   *
   * Nothing lowers it.
   */
  greatPeopleRecruited: number;
  /**
   * The names a filled renown bucket is offering, or the key is **absent** —
   * which it is for every player almost all of the time.
   *
   * Presence *is* "this empire owes the game a decision", which is
   * `pendingDiscovery`'s convention and is here for its reason: a player who has
   * never filled the bucket and one who has just spent an offer must serialise
   * identically. Blocks End Turn (`greatPersonBlocker`).
   *
   * Drawn once, at the moment the bucket filled, and spent by an ordinary
   * command naming an **index** — Entry XV's doctrine for the fifth time. An
   * offer rolled on sight would make the deal a function of when somebody looked
   * at a screen, and under simultaneous turns two seats look at different times.
   */
  greatPersonOffer?: GreatPersonOffer;
  /**
   * Every bead this empire has clacked onto the Abacus, **in the order they
   * were earned** (design ledger Entry VI, `docs/beads.md`).
   *
   * `Player.triumphs`' discipline one system up and for its reasons exactly:
   * append-only and turn-stamped, so what a command earned is the slice past
   * the length it started at and no seam had to grow a parameter to say so; and
   * it is the register of what this seat holds, which is what the threshold
   * counts. Nothing ever removes an entry — a bead once clacked is clacked.
   *
   * Contention between *seats* is settled elsewhere: `GameState.beads.claimed`
   * is the world's register, because almost every bead is a first-in-the-world.
   */
  beads: EarnedBead[];
  /**
   * Cities this empire **founded itself**, ever. The Founder's count.
   *
   * On the player rather than derived from the board, and that is the whole
   * point of the counter: `state.cities` cannot say who founded a town (a
   * capture rewrites `ownerId`, and `City.captured` is sticky the other way), so
   * "eight cities of your own" is a fact only a counter can keep. Nothing lowers
   * it — a city lost was still a city founded.
   */
  citiesFounded: number;
  /** Cities taken by force, ever. `citiesFounded`' twin. Nothing lowers it. */
  citiesCaptured: number;
  /**
   * Faith spent on augurs and prophets, ever — The Hierophant's count.
   *
   * A *spend* is not a thing on the board and `faithPool` is a bank that moves
   * both ways, so the only honest reading is a counter raised where the coin
   * leaves (`purchaseItemAt`).
   */
  faithOnHolyOrders: number;
  /** Gold banked from the Tithes project, ever. Raised in `payProject`. */
  tithesGold: number;
  /** Science banked from the Scholarship project, ever. `tithesGold`' twin. */
  scholarshipScience: number;
  /**
   * Yields this empire's caravans carried **during the current age** — the
   * Richest Roads' reckoning.
   *
   * The one counter that is **reset**, and it is reset in exactly one place
   * (`openBeadAge` in `beads.ts`) at the moment the world's age turns over,
   * because a reckoning of the age is a question about the age. A total that
   * never reset would hand every later reckoning to whoever led the first one.
   */
  routeYieldsThisAge: number;
  /** Great people called during the current age. `routeYieldsThisAge`' twin. */
  greatPeopleThisAge: number;
}

/**
 * One bead, earned. See `Player.beads`.
 *
 * `EarnedTriumph`'s shape one system up: **what**, **which class of card**,
 * **which family's rod it lands on**, and **when**. The name, the text and the
 * boon are the catalogue's business and history does not restate a table — but
 * the family is on the record rather than looked up, because the Abacus counts
 * rods and a card retuned from culture to science must not silently move a bead
 * an empire already owns.
 */
export interface EarnedBead {
  id: BeadCardId;
  kind: BeadKind;
  family: BeadFamily;
  /** `state.turn` it was earned on. What makes the news a diff. */
  turn: number;
}

/**
 * One bead claimed **by the world**, and who took it. See `GameState.beads`.
 *
 * `ContestedTriumph`'s twin, and keyed the same way for its reason: nearly every
 * bead is a first-in-the-world, and the pair `(id, age)` is the key because a
 * feat may be once per game (`age: 0`) or once per age of the world's clock.
 */
export interface BeadClaim {
  id: BeadCardId;
  age: number;
  playerId: number;
  turn: number;
}

/**
 * One card on the table. See `BeadTable.hands`.
 *
 * `faceUp` is the whole of Entry VI's drafting model: a card dealt before its
 * age opens is face down — it is *there*, it is in the seeded order, and nobody
 * may claim it — and the turn the first seat in the world reaches that age every
 * card in the hand turns over at once. A card dealt after the age has opened
 * arrives face up.
 */
export interface BeadCard {
  id: BeadCardId;
  faceUp: boolean;
}

/**
 * The Bead Race's whole world state (design ledger Entry VI).
 *
 * Five fields, and each of them is one sentence:
 *
 *   · `decks` — the shuffled order of each age's cards, drawn from `state.rng`
 *     **once, in `newGame`**, so a seed *is* a deal (Entry II's fairness: every
 *     seat sees the same cards in the same order). Cards are taken off the
 *     front; an empty deck is an age that has dealt everything it holds.
 *   · `hands` — what is on the table for each age, in deal order.
 *   · `claimed` — the world's register. **The** place contention is settled, so
 *     "the first seat by log and sweep order" is a property of the order things
 *     were applied in rather than of a check somebody could forget.
 *   · `streaks` — how many consecutive turns each seat has held each streak
 *     deed's count at or above its value. Reset to zero the turn it falls short.
 *   · `worldAge` — the world's clock, one clock for everybody: the highest age
 *     any real seat has reached. An age *opens* the turn this rises.
 *
 * Plain objects and arrays throughout, never a `Map` or a `Set`: every one of
 * them is iterated for an outcome, and an outcome that depends on iteration
 * order must depend on an order the state itself carries.
 */
export interface BeadTable {
  decks: Record<string, BeadCardId[]>;
  hands: Record<string, BeadCard[]>;
  claimed: BeadClaim[];
  streaks: Record<string, Record<string, number>>;
  worldAge: number;
}

/**
 * One Triumph, earned. See `Player.triumphs`.
 *
 * Three facts and no more: **what**, **when**, and — for the scopes that are
 * counted per era — **which age it was earned in**. Everything else a surface
 * could want is on the row (`triumphData.ts`), because a triumph's name and what
 * it paid are the table's business and history does not restate a table.
 */
export interface EarnedTriumph {
  id: TriumphId;
  /** `state.turn` it was earned on. What makes the news a diff. */
  turn: number;
  /**
   * The empire's age at the moment it was earned, on a `perAge` or `contested`
   * row and absent on the others.
   *
   * Absent rather than zero on a `once` row, so a save from a game with no
   * per-age triumphs in it serialises as small as it reads.
   */
  age?: number;
}

/**
 * The names a renown bucket dealt, in draw order.
 *
 * `DiscoveryOffer`'s shape minus the site — a great person arrives in the
 * capital, so there is no hex to carry — and `OrderOffer`'s rule: a pick is an
 * **index**, never an id, because an index can only ever name something the
 * player was actually dealt.
 */
export interface GreatPersonOffer {
  options: GreatPersonId[];
  /**
   * The family this hand was **narrowed to** when it was dealt, and absent —
   * which is every hand but one — for a draft from the whole roster.
   *
   * Written by `drawGreatPersonOffer` and read by exactly one thing: the reroll
   * (schema 85), which deals the hand again *as what it was dealt as*. The
   * Academy's scholar draft is bought narrow (`OFFER_PURCHASES`), and a reroll
   * that dealt the whole roster back would be handing the player something other
   * than the thing they paid for.
   *
   * Absent rather than a widening flag, so a game with no such row serialises
   * exactly as it did before this field existed.
   */
  family?: Family;
}

/**
 * Three boons drawn from the pool, and where they were found.
 *
 * The **first** of Entry XV's draft shape to exist in the game: offers generated
 * from `state.rng` and stored, a pick that is an ordinary command, and a refusal
 * that leaves the state byte-identical. Statecraft's card draft inherits this
 * shape rather than inventing a second one — which is why the offer carries an
 * ordered list of ids and an index is what spends it, and not, say, the id itself
 * (an id would let a client name a card it was never dealt).
 *
 * The site is carried because two of the three effect shapes need it: a free unit
 * stands *here*, and the nearest owned city is nearest *to here*. Reading it off
 * the claiming unit instead would have been wrong the moment that unit moved on,
 * or died, before the player chose.
 */
export interface DiscoveryOffer {
  /** Which kind of site this was. Flavour on the card; the draw's weights read it. */
  kind: DiscoveryKind;
  /** Where it stood. See the docblock for why this is on the offer. */
  col: number;
  row: number;
  /** The options, in draw order. `chooseDiscovery` names one by index. */
  options: DiscoveryId[];
}

/**
 * A barbarian camp: a hex the wild musters out of.
 *
 * State, not board. Camps are the one thing in this pass that is *not* a tile
 * field, and the split is deliberate: `Tile.discovery` is generation output that
 * play consumes, so it belongs to the map the seed produced, while a camp is
 * founded mid-game by a turn phase and has a history (when it appeared, which is
 * what its muster cadence counts from). Putting it on the tile would have made
 * the map carry state the seed never produced; putting it here keeps
 * `GameState.camps` an ordinary array that iterates in a fixed order like every
 * other outcome-bearing list in this state.
 */
export interface BarbarianCamp {
  col: number;
  row: number;
  /** The turn it was founded. Its muster cadence counts from this. */
  foundedTurn: number;
}

// --- entities ---------------------------------------------------------------

/**
 * A unit on the board.
 *
 * Position is offset `(col, row)` to match `Tile`, not axial: it is what the map
 * is indexed by, so no conversion sits between a unit and the tile it stands on.
 * `col` is always canonical (wrapped into `[0, width)`).
 *
 * `path` is the *remaining* waypoints of a multi-turn move order, first step
 * first, and is absent — the key deleted, not an empty array — whenever the unit
 * is idle. Keeping the shape of an idle unit identical however it became idle is
 * what lets `snapshotState` be compared byte for byte.
 */
export interface Unit {
  id: number;
  ownerId: number;
  type: UnitTypeId;
  col: number;
  row: number;
  hp: number;
  /** Movement points left this turn. Refilled by the `resetMovement` phase. */
  movesLeft: number;
  /**
   * True once this unit has attacked this turn. Cleared by `resetMovement`
   * alongside the movement allowance, because they are the same allowance: one
   * attack per unit per turn, exactly as Civ V has it.
   *
   * Always present rather than optional, unlike `path` and `fortifiedTurns`. It
   * is a fact about every unit on every turn — a warrior that has not attacked
   * has *not attacked*, which is a real state and not an absent one — and the
   * healing rule reads it on every unit in the game every turn.
   */
  hasAttacked: boolean;
  /**
   * The rest of a march this unit has been ordered on, or the key is **absent**
   * when it is standing where it was put. Presence is the state, like
   * `sleeping`'s and `fortifiedTurns`'.
   *
   * Walked at the **end** of a turn, on the points that turn granted
   * (`spendLeftoverMovement` in `turn.ts`, and only there since 2026-09-08 —
   * `docs/flags.md` (bbb)). So a piece under orders opens its owner's next turn
   * standing where it stopped, holding a full allowance and still carrying what
   * is left of the route: the order is kept, and the player may change it.
   */
  path?: { col: number; row: number }[];
  /**
   * How many turns this unit has been fortified, or the key is absent when it is
   * not fortified at all.
   *
   * Presence *is* the fortified state, which is `path`'s convention (see its
   * docblock) and it is here for the same reason: a unit that has never dug in
   * and a unit that has just been shaken out of a trench must serialise
   * identically, or two states that are the same game would not compare equal.
   * Zero is a real value and means "fortified this turn, no bonus yet" — the
   * `advanceFortify` phase raises it, capped by `combat.fortifyMax`.
   */
  fortifiedTurns?: number;
  /**
   * Improvement charges this unit has left, or the key is **absent** on
   * everything that never had any.
   *
   * Presence *is* "this is a builder", which is `path`'s and `fortifiedTurns`'
   * convention and is here for the third time for the same reason: a warrior
   * and a worker must serialise differently in kind rather than by a zero, or a
   * state that gave every soldier `chargesLeft: 0` would be a state claiming
   * fifteen unit types are builders whose tools happen to be worn out.
   *
   * Initialised from `UnitDef.charges` by `createUnit`, so there is exactly one
   * place a charge count comes into existence and no creation path can forget.
   * Spent by the `buildImprovement` command, one improvement's `chargeCost` at a
   * time; a unit that reaches zero is *removed* rather than left standing empty,
   * so the value is always at least one while the unit is on the board.
   *
   * A captured worker keeps whatever is left of it (design ledger, M7): capture
   * changes `ownerId` and touches nothing else, so this needs no rule of its own.
   */
  chargesLeft?: number;
  /**
   * This unit has been told to sleep, or the key is **absent** when it has not.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`' and
   * `chargesLeft`' convention and is here for the fourth time for the same
   * reason: a unit that has never slept and a unit just shaken awake must
   * serialise identically, or two states that are the same game would not
   * compare equal.
   *
   * What it means, and what it deliberately does not. Sleep is a *civilian's*
   * fortify: the cheapest possible standing order, given to a worker with
   * nothing to build or a settler waiting on an escort, and its whole content is
   * "stop asking me about this piece". It costs nothing, spends nothing, and
   * changes no rule — a sleeping unit defends, is captured, is seen and heals
   * exactly as it did awake. The only thing that reads it is
   * `unitAwaitsOrders` (`sim/units.ts`), which is the whole point: End Turn
   * stops nagging, and the post-resolution camera stops flying to it.
   *
   * Two things end it, and they are opposite in kind. **An order** — any
   * command at all that names this unit clears the flag, because telling a piece
   * to do something is telling it to wake up, and a second verb for "wake" would
   * be a verb whose only use is undoing a typo. **Enemies** — the `wakeSleepers`
   * phase clears it when a foreign combatant is inside this unit's own sight at
   * the end of a resolution, which is the reason sleep is safe to use at all:
   * a worker left asleep on the frontier is not a worker the player forgot.
   */
  sleeping?: boolean;
  /**
   * Effects that run out — a Blessing of Arms on this piece — or the key is
   * **absent**, which it is for every unit almost all of the time.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s
   * and `sleeping`'s convention and is here for the fifth time for the same
   * reason: a warrior that was never blessed and one whose blessing has been
   * swept away must serialise identically. See `TimedEffect` for why an expiry
   * is an absolute turn and never a countdown.
   *
   * A captured unit keeps them, exactly as it keeps its charges: capture moves
   * `ownerId` and touches nothing else, and a blessing is on the piece.
   */
  timed?: TimedEffect[];
  /**
   * **Which** great person this piece is, or the key is **absent** on every
   * ordinary unit — which is all of them but a handful in a whole game.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s and `timed`'s convention and is here for the sixth time for the
   * same reason: a warrior and Archimedes must serialise differently in kind.
   *
   * It is deliberately *not* how the rules ask "is this a great person" — that
   * is `UnitDef.greatWork`, a fact about the **type**, exactly as `consecrates`
   * is for the augur and `foundsCity` for the settler. This says *who*, which is
   * what the family verb and the legacy need: `greatPersonAct` reads the family
   * off it, and spending the piece pushes this id onto `Player.legacies`.
   *
   * A captured great person keeps it, exactly as a captured worker keeps its
   * charges — capture moves `ownerId` and touches nothing else about what the
   * piece *is*, so a stolen Imhotep leaves his legacy to his captor.
   *
   * **The renderer's fingerprint must learn it.** Piece visuals rebuild off a
   * hash of `(id, col, row, hp, ownerId)` (the trap in CLAUDE.md); a great
   * person that ought to look like Archimedes rather than like a settler is a
   * visual-affecting unit property, and the render pass adds it there.
   */
  person?: GreatPersonId;
  /**
   * The trade route this piece is **carrying**, or the key is **absent** on
   * every unit that is not on the road — which is all of them but a handful.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s and `person`'s convention and is here for the
   * seventh time for the same reason: a trader idling at home and one that has
   * never been sent must serialise identically, or two states that are the same
   * game would not compare equal.
   *
   * **The route is the piece.** There is deliberately no `GameState.routes`
   * register: the caravan *is* the route, so a route ends when the trader dies
   * with no bookkeeping anywhere, a plundered route is a dead unit, and "how
   * many routes do I run" is a count of units rather than a list that could
   * disagree with the board. That is the one structural decision the design doc
   * left open, and it is settled this way because every other shape needs a rule
   * for what happens to the register when the piece is killed.
   *
   * It is a fact about the **piece** and not about the type: whether a unit *may*
   * carry one is `UnitDef.trades`, which is the same two-fields-two-questions
   * split `greatWork` and `person` make.
   */
  trade?: TradeRoute;
  /**
   * This empire never paid for this piece, so it pays no maintenance on it —
   * or the key is **absent**, which it is for every unit that was built, bought
   * or seated at the start.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s, `person`'s and `trade`'s convention and is here for
   * the eighth time for the same reason: a warrior a city built and a warrior a
   * wonder handed over must serialise differently in kind rather than by a
   * `false`, or a game with no gifts in it would not compare equal to itself
   * before this field existed.
   *
   * **The register of who writes it**, and it is deliberately short — every
   * entry is "the game issued this, nobody bought it":
   *
   *   1. `captureUnit` — a piece taken in war, and a barbarian talked round by
   *      the Wolf-Mother's Pact (which goes through the same function). You did
   *      not raise it, so you do not keep it on your payroll;
   *   2. `realiseItem(…, { free: true })` — the windfall path, which is every
   *      Statecraft grant that hands over a piece (Levies, Camp Followers'
   *      stray) and reaches the roster through `payWindfallGrants`;
   *   3. `payCompletionGrants` — a **building's** gift: the Statue of Zeus'
   *      swordsman, Hagia Sophia's, and every `onComplete` unit after them;
   *   4. `settleGreatPersonChoice` — a great person, which is exempt by type
   *      anyway (no unlock tech) and is marked so the rule does not depend on
   *      that staying true;
   *   5. `claimDiscoveryAt` — a ruin's escort.
   *
   * A **completion** of a queued unit and a **purchase** deliberately do not
   * write it: those are pieces an empire paid for, and they go on the payroll
   * like everything else. That split is the whole reason `realiseItem` takes the
   * flag rather than deriving it — the one routine serves both.
   *
   * A captured piece keeps it, exactly as it keeps its charges and its
   * blessings: `captureUnit` sets it *because* changing hands is one of the
   * occasions, not as an exception to "capture touches nothing else".
   */
  freeUpkeep?: true;
  /**
   * **Gold a turn the town that raised this piece forgives it**, or the key is
   * absent — which it is for every unit not born under an Imperial Throne
   * (`BuildingDef.unitUpkeepRebate`, `docs/history/tech-gifts.md` §7).
   *
   * `freeUpkeep`'s **partial** cousin and deliberately a number rather than a
   * second flag: that one says the empire never paid for the piece at all and is
   * written at five named seams, and this says the empire paid for it in a town
   * that keeps its own soldiers cheaply. A flag would have made the Throne a way
   * to field a free army; a number is a discount a ledger can print.
   *
   * Presence is the state, `freeUpkeep`'s convention for the tenth time: a
   * warrior raised before the Throne stood and one raised after it must
   * serialise differently in kind, and a game with no Throne in it serialises
   * exactly as it did before this field existed.
   *
   * **Written in one place**, `realiseItem` (`cities.ts`), off the buildings
   * standing in the town at the moment the piece is raised — a completion and a
   * purchase both, because both are pieces the town made. It is never rewritten:
   * the stamp is a fact about a *moment*, exactly as `unitStamp` is, so a Throne
   * razed next year does not put the legion back on full pay and a captured
   * piece carries its birthplace's bargain to its new flag.
   *
   * Read in one place, `explainUnitUpkeepRebate` (`upkeep.ts`), as a labelled
   * give-back line — never subtracted from the gross, so the creditors' sweep
   * (`disbandCandidate`) still picks the dearest piece by what it truly costs.
   */
  upkeepRebate?: number;
  /**
   * What this empire's **law** was worth to this piece on the day it was made —
   * or the key is **absent**, which it is for every unit born under a council
   * that had stamped nothing.
   *
   * Presence is the state, which is `path`'s, `fortifiedTurns`', `chargesLeft`'s,
   * `sleeping`'s, `timed`'s, `person`'s, `trade`'s and `freeUpkeep`'s convention
   * and is here for the ninth time for the same reason: a warrior raised before
   * The Muster Roll and one raised after it must serialise differently in kind,
   * and a game with no such card in it must serialise exactly as it did before
   * this field existed.
   *
   * **Written in one place**, `createUnit`, from `cardUnitStamp` — so a
   * completion, a purchase, a wonder's grant, a ruin's escort and a great
   * person's arrival are all stamped by one line, exactly as they are all
   * charged by one line. Nothing ever rewrites it: the stamp is a fact about a
   * *moment*, so a card unslotted next year does not un-blood the levy it
   * raised, and a captured piece keeps its old empire's stamp the way it keeps
   * its charges.
   *
   * The two readings are `unitMaxHp` and `unitStampStrength` (`unitData.ts`),
   * which is where the field's docblock lives. It is deliberately **not** in the
   * piece fingerprint: nothing it changes is drawn.
   */
  stamp?: UnitStamp;
  /**
   * This piece has been told to seek out unexplored land on its own, or the
   * key is **absent** when it is under its own orders.
   *
   * Presence is the state — `path`'s convention, here for the tenth time and
   * for the same reason: a warrior that never ranged ahead and one called back
   * to the colours must serialise identically.
   *
   * What it means: the `marchExplorers` phase (`turn.ts`) aims the piece at
   * `exploreTarget` (`explore.ts`) whenever it stands without a path, and
   * deletes the key — reporting it (`TurnReport.exploreEnded`) — the turn
   * nothing within reach would show it anything new. Three things end it, and
   * they are the sleep flag's endings one field over: **any other accepted
   * order naming the unit** clears it in `applyCommand`'s one seam (never per
   * handler), `cancelOrder` is the plain "never mind", and the search running
   * dry ends it from inside the resolution. Only `setAutoExplore` writes it.
   *
   * **The renderer's fingerprint hashes it** (`signUnits`): an exploring piece
   * takes the routed caravan's wash — busy, not orderable — so presence
   * changes what is drawn on a piece that has not moved, which is
   * `Unit.trade`'s case exactly.
   */
  autoExplore?: true;
}

/**
 * A live trade route, as it sits on the caravan carrying it (`Unit.trade`).
 *
 * Four facts and no more: the two ends, when it lapses, and which way the piece
 * is walking. What the route *pays* is nowhere here — it is derived every turn
 * from the two cities as they stand (`explainRouteYield` in `routeYields.ts`), so a
 * destination that finishes a library raises the route the next turn and a
 * destination that is captured stops paying its old owner. A snapshot of the
 * buildings at send time would be a second ledger.
 */
export interface TradeRoute {
  /** The city the caravan set out from. **The city the route pays.** */
  from: number;
  /** The partner. Its buildings and people are what the route is worth. */
  to: number;
  /**
   * The turn this route stops paying — an **absolute** turn, read as
   * `state.turn < expiresTurn`, exactly as `TimedEffect.expiresTurn` is.
   * Nothing decrements it; the shuttle phase compares it, and only when the
   * caravan is standing at home.
   */
  expiresTurn: number;
  /**
   * True while the caravan is walking *toward* `to`, false while it is walking
   * home. Flipped by `marchTraders` the turn it arrives, which is what makes the
   * piece shuttle rather than teleport — and what makes a road get walked in
   * both directions.
   */
  outbound: boolean;
  /**
   * True when the caravan should start a fresh leg instead of idling the turn
   * its route lapses (the user's ruling: "add a button for auto-resend").
   *
   * Always present rather than optional, unlike the flags on `Unit` — it is
   * `hasAttacked`'s case one level in: every route either renews or does not,
   * which is a real state and not an absent one, and there is exactly one place
   * a route comes into existence (`startRouteAt`) so no creation path can leave
   * it out.
   */
  autoResend: boolean;
  /**
   * True when this route is run **by sea**, or the key is **absent** when it is
   * run by land (the user's ruling, 2026-09-03: *"trade routes should stay
   * entirely either land only routes or water only routes"*).
   *
   * Presence is the state — `Unit.path`'s convention — and the absent half is
   * land on purpose: every route that existed before the ruling was a land route
   * and every route in a world with no coast still is, so a land route
   * serialises exactly as it always did.
   *
   * What it changes is two things and no more: the caravan is pathed with the
   * water-confined profile on every leg (`routeProfile`, `trade.ts`, read again
   * by `marchTraders` when it turns the piece around), and it **lays no road**
   * anywhere, harbours included (`layRoadUnder`, `roads.ts`). What a route pays
   * is untouched — a cargo is a cargo whichever way it travelled.
   */
  sea?: true;
}

/**
 * One entry in a city's production queue. Plain data, so it survives a save.
 *
 * A discriminated union rather than `{ kind, id: string }`: `kind` and `id` are
 * not independent — a `'unit'` item's id is a `UnitTypeId` and nothing else —
 * and writing that down means every consumer narrows for free instead of
 * casting. It stays two flat fields so it serialises as an ordinary object.
 */
export type QueueItem =
  | { kind: 'unit'; id: UnitTypeId }
  | { kind: 'building'; id: BuildingId }
  | { kind: 'project'; id: ProjectId };

/**
 * The three kinds of row a queue holds, for the gates that ask one question of
 * all of them (`buildError`, `isUnlocked`, `gatingTech` in `tech.ts`).
 *
 * Deliberately *not* the same type as `ProductionCategory` (`buildingData.ts`),
 * which is what a production bonus may name and stops at unit/building: a
 * barracks putting ten percent behind Tithes would be a barracks minting money,
 * and a project's rate is printed on its row precisely so nothing modifies it.
 */
export type QueueKind = QueueItem['kind'];

/**
 * A city.
 *
 * Position is offset `(col, row)` exactly as a unit's is, so the tile a city
 * stands on needs no conversion. `name` is stored rather than derived because a
 * player will eventually rename one, and because deriving it from an index into
 * the rules list would silently rename every city when that list is retuned.
 *
 * The three baskets are all "progress toward the next thing", all in the units
 * of the thing that fills them, and all kept rather than reset when the thing
 * completes — the remainder is overflow and belongs to the next item:
 *
 *   foodBasket    food toward the next population point (`growCities`)
 *   hammerBasket  production toward the front of the queue (`advanceProduction`)
 *   culture       culture toward the next border tile (`expandBorders`)
 *
 * `culture` is the city's *unspent* culture, not its lifetime total; the running
 * total the player accumulates is `Player.culturePool`, which the same yield
 * feeds in parallel. `tilesClaimed` counts expansions rather than owned tiles,
 * because it is the input to the cost curve and the free ring a city is founded
 * with must not make the second tile expensive.
 *
 * `workedTiles` is derived state — `assignCitizens` recomputes it from scratch
 * every `collectYields` — but it is stored anyway: the UI draws it, and a value
 * the player can see is a value that has to survive a save.
 *
 * `lockedTiles` is the opposite: pure player intent, never derived, and the one
 * input `assignCitizens` cannot recompute. See `setLockedTiles` in `commands.ts`
 * and the assignment rules in `cities.ts`.
 */

/**
 * Which "one a turn" a bought unit spends (`City.purchasedUnitTurns`).
 *
 * The user's widening of the one-unit-a-turn rule (2026-09-02): *faith buying,
 * buying a civilian unit, and buying a military unit all counted separately*. So
 * the bucket is a pair of questions asked in order — **which bank paid**, and
 * then **is the piece a combatant** — because the faith bank is the one a town
 * calls an augur or a prophet out of and that call has never competed with a
 * garrison for the same afternoon.
 *
 * Read off `UnitDef` through `isCivilian` rather than off a name, exactly as
 * every other class question in this codebase is: nothing here compares a type
 * against `"settler"`, so a caravan is bought out of the civilian bucket for
 * being a non-combatant and not for being called a trader.
 *
 * Declared here beside `City` rather than in `purchase.ts` because the field is
 * the city's; `purchase.ts` imports this module and an import the other way
 * would be the runtime cycle `moduleCycles.test.ts` exists to catch.
 */
export type UnitPurchaseBucket = 'militaryGold' | 'civilianGold' | 'faith';

export interface City {
  id: number;
  ownerId: number;
  name: string;
  col: number;
  row: number;
  population: number;
  /**
   * Hit points, out of `combat.cityBaseHp`. A city is a defender like any other
   * piece: it is shot at, it is stormed, and it heals `combat.cityHealPerTurn`
   * every turn in the `healCities` phase.
   *
   * A city is never destroyed by damage — ranged fire floors it at 1 (the Civ
   * rule: bombardment softens, infantry takes) and a melee blow that would empty
   * it captures it instead, restoring `combat.cityCaptureHpFraction` of the
   * maximum under its new owner. So `hp` is always in `[1, cityMaxHp(city)]`.
   */
  hp: number;
  /** Food banked toward the next population point. May go negative: starvation. */
  foodBasket: number;
  /** Culture banked toward the next border tile. See the docblock. */
  culture: number;
  /** How many tiles this city has claimed by expansion. Drives the cost curve. */
  tilesClaimed: number;
  /** Completed buildings, in the order they finished. At most one of each. */
  buildings: BuildingId[];
  /**
   * True once this city has been taken by force, ever.
   *
   * The one thing about a city that cannot be recomputed from the board, which
   * is why it is stored rather than derived: a captured town keeps its
   * buildings, its people and its ground, and by the turn after the fight there
   * is nothing left to distinguish it from one somebody built. The authority
   * meter needs exactly that distinction — a seized city costs 3 where a founded
   * one costs 2 (design ledger, Entry XIV.D.2) — so `captureCity` in `combat.ts`
   * raises this and nothing ever lowers it.
   *
   * *Ever*, and that is the design: a city that has changed hands is a seized
   * city thereafter, including for the empire that founded it and won it back.
   * Conquest is meant to self-throttle, and a war of reconquest is still a war.
   * It also means a captured capital is no longer anybody's capital — see
   * `capitalCityOf` in `cities.ts`, which seats the palace in the oldest city
   * its owner actually founded.
   */
  captured: boolean;
  /**
   * True while this town is a **puppet** — taken by force and not yet annexed
   * (`docs/war-diplomacy.md`, 9b; Civ V's rule).
   *
   * The key is **absent** for every town that is not one, which is every town
   * anybody founded and every conquest its captor has annexed: presence is the
   * state, so a game with no puppets in it serialises exactly as one from
   * before the field existed. `captureCity` writes it and `annexCity` deletes
   * it, and those are the only two.
   *
   * It is a second field beside `captured` rather than a reading of it because
   * they say different things and both are needed: `captured` is *sticky and
   * forever* — a town that has changed hands is a seized town for the rest of
   * the game, including for the empire that founded it and won it back — while
   * this is a **standing arrangement** the captor may end at any time and never
   * resume. What a puppet is worth is two readings and no more: it asks its
   * captor less writ (`cityAuthorityCost`) and its citizens ask for less
   * contentment (`explainHappiness`), both off `rules.war`.
   *
   * A puppet's production queue is deliberately **not** refused by the reducer.
   * The town is uncontrollable from the *interface* (the city panel locks it),
   * because under the ruling a puppet builds what the seat's own appraisal
   * picks — issued as ordinary logged commands by whichever client drives the
   * seat — and a reducer that refused them would be refusing the mechanism.
   */
  puppet?: true;
  /**
   * True once this town has been somebody's **seat of government** — written at
   * the moment it is taken from an empire whose capital it was.
   *
   * The one thing about a captured capital that cannot be recomputed
   * afterwards, and it is here for `captured`'s exact reason: `capitalCityOf`
   * is derived and prefers a town its owner actually *founded*, so the instant
   * a palace changes hands nothing on the board says it was ever one. Razing
   * reads it — a capital is never razeable (the orchestrator's default, ruled
   * 2026-09-03) — and nothing else does.
   *
   * Absent on every ordinary town, presence-is-the-state, and never cleared: a
   * palace pulled down is still a palace that stood.
   */
  wasCapital?: true;
  /** Production queue, front first. Replaced wholesale by `setCityProduction`. */
  queue: QueueItem[];
  /** Production banked toward the front of the queue. */
  hammerBasket: number;
  /** Tiles the citizens work, excluding the free centre. Sorted by tile index. */
  workedTiles: { col: number; row: number }[];
  /**
   * Tiles the player has pinned a citizen to, in the order they pinned them.
   * `assignCitizens` works these first and fills the rest by score. Player
   * intent, not derived state: order is preserved exactly as sent, and an entry
   * that is not currently workable is ignored rather than dropped.
   */
  lockedTiles: { col: number; row: number }[];
  /**
   * What this town's people are being placed **for**, or the key is **absent** —
   * which it is for every town until somebody says otherwise, and absent means
   * `'default'`: the balanced ordering the game has always used.
   *
   * `lockedTiles`' sibling one grade coarser, and player intent in exactly its
   * sense: a pin says *this hex*, a focus says *this kind of hex*, and neither
   * can be recomputed from the board. Presence is the state (`tradingPost`'s
   * rule): there is no `'default'` written anywhere, so a saved town that was
   * never told anything serialises as it always did.
   *
   * A pin outranks it — see `chooseCitizens`, which seats every honoured lock
   * before the focus sorts what is left — and a focus never starves a town:
   * `assignCitizens` puts the balanced sheet back when the focused one would
   * leave the citizens short. **Cleared when the town changes hands**
   * (`handOverCity`), with the queue and the pins: it is the old owner's
   * arrangement, and a puppet takes no focus at all until it is annexed.
   */
  focus?: CitizenFocus;
  /**
   * True when this town has been told to **stop growing** — to work its ground
   * for anything but the bushels that would fill the basket — or the key is
   * absent, which it is for every town nobody has said it about.
   *
   * A second field rather than a fourth focus, because it is a different kind of
   * instruction: a focus says which yield to prefer, and this says what the food
   * *surplus* may be (nothing). The two compose — a town may avoid growth while
   * chasing hammers — and neither may starve the place: the cap is applied by
   * swapping worked hexes down while the harvest still feeds the citizens, and
   * `capFoodSurplus` stops the moment the next swap would not (`cities.ts`).
   */
  avoidGrowth?: true;
  /**
   * Effects that run out — an Omen Reading on this town's scribes, a
   * Consecration of its bounds — or the key is **absent**, which it is for every
   * city almost all of the time.
   *
   * `Unit.timed`'s twin, same convention and same reason. A **captured** city
   * keeps them, and that is deliberate rather than an omission: a rite was
   * performed on the *place*, and the conqueror inherits the walls, the granary
   * and the calendar together. Its effects then pay their new owner, because
   * every reader asks the city's owner for the empire half and the city itself
   * for this half.
   */
  timed?: TimedEffect[];
  /**
   * True once a caravan has ever set out from this town or arrived at it, or the
   * key is **absent** on a town no route has touched.
   *
   * **History, and it is never cleared** — the same kind of fact `captured` is,
   * and stored for the same reason: a post is a thing that *happened* to a
   * place, and by the turn after the route lapses there is nothing on the board
   * left to derive it from. A captured town keeps its post, exactly as it keeps
   * its granary.
   *
   * What it buys is **range**: each post among a proposed route's two endpoints
   * is worth `rules.trade.postRangeTurns` more turns of march
   * (`routeStartable`), which is the user's ruling — the first caravan to a
   * town is the expensive one and every one after it reaches further. Nothing
   * else reads it.
   */
  tradingPost?: boolean;
  /**
   * The turn this town last bought a unit **of each class**, or the key is
   * **absent** on a town that never has (user, 2026-08-28 playtest: "cities can
   * only purchase a single unit per turn"; widened 2026-09-02: "cities should be
   * able to only buy one unit of each *type* — faith buying, buying a civilian
   * unit, and buying a military unit all counted separately").
   *
   * One record with one stamp per `UnitPurchaseBucket` rather than three fields,
   * because the rule is one rule asked of three buckets: `purchaseError` looks up
   * the bucket the thing being bought falls in and `purchaseItemAt` writes the
   * same one, so a fourth class is a member of that union and nothing else.
   *
   * Each entry is an **absolute** turn compared against `state.turn`, never a
   * countdown — `TimedEffect`'s rule and `SlottedOrder.sealedUntil`'s, applied to
   * the shortest-lived fact in the game. The whole reading is
   * `city.purchasedUnitTurns?.[bucket] === state.turn`, so nothing decrements it,
   * no phase clears it and the entry is *already* meaningless the moment the turn
   * rolls over. That is what makes the rule safe under simultaneous turns: there
   * is no moment in the pipeline where it has to have been reset.
   *
   * **Units only.** A treasury that can turn coin into a garrison as fast as it
   * can click is the thing the note is about; a town that buys a granary and a
   * library on the same afternoon has bought two things it then has to feed.
   * Written by `purchaseItemAt` and read by `purchaseError`, and by nothing
   * else.
   */
  purchasedUnitTurns?: Partial<Record<UnitPurchaseBucket, number>>;
  /**
   * How many of this town's citizens follow each religion, or the key is
   * **absent** on a town nobody has preached to — which is every town for most
   * of a game.
   *
   * **Civ V's citizen model, and the whole of "a city follows a religion"**
   * (user, 2026-08-27): a religion does not take a town, it takes people in it
   * one at a time, and the town follows the one more than half its citizens
   * do (`cityReligion`). Everything else — the banner, the founder's trickle,
   * what a follower belief pays — is derived from that one count.
   *
   * The rest of the population follows nothing, and that is a *derivation*
   * rather than a stored figure: `population` minus the sum here. A second
   * count of the unconverted would be a second answer, and the first thing it
   * would do is disagree the turn a citizen was born.
   *
   * Keyed by `ReligionId`, which is a number, so a serialised town reads
   * `{"0": 3}`; nothing iterates this object for an outcome — every sweep walks
   * `GameState.religions` (founding order) and looks a count up by id, which is
   * the determinism rule read for an object.
   *
   * A **captured** town keeps its followers, exactly as it keeps its granary and
   * its blessings: a conquest changes whose town it is, not what the people in
   * it believe.
   */
  followers?: Partial<Record<ReligionId, number>>;
  /**
   * Faith banked toward the *next* convert, per religion, or the key is
   * **absent** — which it is for every town nothing is pressing on.
   *
   * The one thing about the tide that has to be stored: pressure is recomputed
   * from the board every turn (`explainPressure`), but *how close the next
   * citizen is to turning* is history, and a game that recomputed it would
   * convert a town the instant a holy site went up or never at all. Every
   * `rules.religion.pressurePerConvert` in here buys one citizen and is spent;
   * the remainder carries, exactly as a food basket's does.
   *
   * **Two things fill it and they share one converter** (`bankPressure`,
   * `religion.ts`): the `spreadReligion` phase, and a proclamation's lump paid
   * the instant a prophet or an augur speaks (`pressLump`).
   */
  pressureBank?: Partial<Record<ReligionId, number>>;
  /**
   * How many of this town's citizens have left the fields for each trade
   * (ledger Entry XLVIII), zero for every family in a town with no guild — which
   * is every town for the first stretch of a game.
   *
   * **Written in full rather than by presence**, which is the one place this
   * town breaks with `followers` and `pressureBank` beside it, and the reason is
   * that a specialist count is *arithmetic* and not an event: `population −
   * specialists` is the number of citizens `assignCitizens` seats on hexes, and
   * it is asked of every city on every pass over the map. Four zeros in a
   * serialised town are cheaper than an optional lookup in the innermost loop
   * the simulation has, and a field that is always there can never be the reason
   * a sweep forgot to ask.
   *
   * A **captured** town keeps its guilds, exactly as it keeps its granary and
   * its followers: a conquest changes whose town it is, not what its people do
   * for a living.
   */
  specialists: Record<SpecialistFamily, number>;
  /**
   * Renown banked toward this town's **next** specialist — the guild bar.
   *
   * `foodBasket`'s shape one currency over, and it carries for the same reason:
   * the threshold is spent and the remainder stays, so a town does not lose the
   * overflow it earned on the turn a guild formed. It is filled by the `guilds`
   * phase alone (`guilds.ts`) and emptied to zero by exactly one other thing —
   * `dismissSpecialist`, where the restart *is* the price of the verb.
   *
   * The empire's renown pool is untouched by all of this: the bar is a second
   * reading of the same trickle, never a diversion of it. A library pays its
   * owner one renown toward a great person **and** one into the bar of the town
   * it stands in.
   */
  guildBasket: number;
  /**
   * The patron this town's cathedral was dedicated to, or the key is **absent**
   * — which it is for every town that has not finished one, which is most of
   * them for most of a game (design ledger Entry LV).
   *
   * **Presence is the state**, `tradingPost`'s rule and `Unit.trade`'s: there is
   * no "unconsecrated" value and nothing to clear. It is written in exactly one
   * place (`realiseItem`, when a completed row carries `BuildingDef.consecrated`)
   * and read in exactly one (`liveCityEffects`' consecration source), so the
   * dedication and what it pays cannot drift.
   *
   * It is **rolled, not chosen** — one draw off `state.rng` at the moment the
   * stones are topped out — and it therefore replays: a save is `{config, log}`,
   * the same commands reach the same completion in the same order, and the
   * generator is at the same point when they do.
   *
   * A **captured** town keeps its dedication, exactly as it keeps its granary,
   * its followers and its blessings: a conquest changes whose town it is, not
   * which saint the masons carved over the door. What the patron pays therefore
   * follows the stones, which is the wonders framework's rule one scale down.
   */
  consecration?: ConsecrationId;
}

/**
 * A religion's id: its **index in `GameState.religions`**, which is founding
 * order.
 *
 * A number rather than a string for the reason `City.id` is one — it is handed
 * out by the register that holds the thing — and founding order rather than a
 * counter because the register is an array and the array *is* the order. Every
 * tie in the whole subsystem ("the religion with the fewest followers, ties by
 * religion id order") is broken by it, so it has to be an order the state
 * carries and not one an object's keys happen to produce.
 */
export type ReligionId = number;

/**
 * One religion, founded by one empire's prophet, followed by whoever the tide
 * reaches.
 *
 * **Identity is the pantheon**: the beliefs the founder had consecrated at the
 * moment of founding are copied here, and their axes are what the generated
 * name is made of. They are a *snapshot* rather than a live reading of
 * `Player.pantheon`, because a religion outlives the moment — an empire that
 * consecrates a fourth god afterwards has not renamed its faith.
 *
 * `follower` and `enhancer` are drafted beliefs from two pools of their own
 * (`data/religion.json`), written in the ordinary card vocabulary and read by
 * the ordinary evaluator. Who they pay is the whole design (user, 2026-08-28,
 * correcting the 08-27 reading): a **follower** belief applies *city-locally*,
 * in every town that follows this faith and to whoever owns that town, and an
 * **enhancer** bends the tide for the empire that holds the **holy city**.
 *
 * `founderId` is **history and a fallback, not the payee.** Who a religion pays
 * is `religionFounder` (`statecraft.ts`) — the owner of the city whose
 * territory holds `holySite`, so a captured holy city moves the trickle and the
 * enhancers with it. The founding empire's *pantheon* is untouched by any of
 * that: a pantheon is native to the empire that consecrated it (the 2026-08-26
 * ruling) and is read off `Player.pantheon`, never off this row.
 */
export interface Religion {
  id: ReligionId;
  /**
   * The empire whose prophet founded it. Never changes; nothing may found
   * twice — and it is what `religionFounder` falls back to when the stones are
   * gone (pillaged, or standing on ground nobody owns).
   */
  founderId: number;
  /** Generated at founding from the pantheon's axes; renamable, pure prose. */
  name: string;
  /** The founder's gods at the moment of founding. Identity, never redrafted. */
  pantheon: BeliefId[];
  /** Drafted from the follower pool. Applies in every city that follows. */
  follower: BeliefId[];
  /**
   * Drafted from the enhancer pool at Theology. Bends the tide, and pays the
   * holy city's owner.
   *
   * A **list**, because `pools.enhancerSlots` is two: the scalar this field
   * used to be silently overwrote the first pick the moment a prophet spent a
   * second charge on the pool. `follower`'s shape, for `follower`'s reason.
   */
  enhancer: BeliefId[];
  foundedTurn: number;
  /**
   * The hex the **first** holy site went up on, or absent for a religion
   * founded before schema 29.
   *
   * The anchor of "who does this faith pay": the holy city is the town whose
   * territory holds this hex, and `religionFounder` reads it off the board
   * every time rather than storing an owner that a conquest would make stale.
   * A later site is an ordinary improvement and never moves this.
   */
  holySite?: { col: number; row: number };
}

/**
 * The religion this empire **founded**, or `undefined`.
 *
 * **The** reading of "my religion", and the whole of "one religion per empire,
 * ever" (user, 2026-08-27): the register is swept for a row naming this seat,
 * so there is no flag on the player that could disagree with it and no way to
 * hold two. A walk of a list that never exceeds a handful of rows.
 */
export function foundedReligion(state: GameState, playerId: number): Religion | undefined {
  for (const religion of state.religions) {
    if (religion.founderId === playerId) return religion;
  }
  return undefined;
}

/**
 * Which religion more than half of this town's citizens follow, or `null`.
 *
 * **The** reading, and it is derived rather than stored (`cityReligion` is asked
 * of a town, never written to it) — the `barbarianRoles` discipline applied to a
 * banner. A town split three ways follows nothing, which is what "the old gods"
 * means: below a majority the place has a mosque, a shrine and an argument.
 *
 * `state.religions` order is not needed here because a strict majority can only
 * ever be one religion, so there is no tie to break.
 */
export function cityReligion(city: City): ReligionId | null {
  const followers = city.followers;
  if (!followers) return null;
  const half = city.population / 2;
  for (const [key, count] of Object.entries(followers)) {
    if ((count ?? 0) > half) return Number(key);
  }
  return null;
}

/** How many of this town's citizens follow one religion. Zero when none do. */
export function followerCount(city: City, religion: ReligionId): number {
  return city.followers?.[religion] ?? 0;
}

/** Citizens of this town who follow nothing at all. Never negative. */
export function unconvertedCitizens(city: City): number {
  let followed = 0;
  for (const count of Object.values(city.followers ?? {})) followed += count ?? 0;
  return Math.max(0, city.population - followed);
}

/**
 * Moves **one** citizen onto a religion, taking them from the unconverted first
 * and otherwise from the religion with the fewest followers.
 *
 * The order is the ruling (user, 2026-08-27) and it is what makes a young faith
 * spread through a town before it starts prising people off an older one. The
 * tie among equally small religions is broken by **id order**, which is founding
 * order — an order the state carries (see `ReligionId`).
 *
 * `order` is the world's religions in founding order; the caller hands it in
 * because it is the state's array and this function may not reach for the state.
 * Answers whether anybody actually moved: a town every one of whose citizens
 * already follows this religion has nobody left to give.
 */
export function convertCitizen(
  city: City,
  to: ReligionId,
  order: readonly ReligionId[],
): boolean {
  const followers = city.followers ?? {};
  if (unconvertedCitizens(city) <= 0) {
    let from: ReligionId | null = null;
    let fewest = 0;
    for (const id of order) {
      if (id === to) continue;
      const held = followers[id] ?? 0;
      if (held <= 0) continue;
      if (from === null || held < fewest) {
        from = id;
        fewest = held;
      }
    }
    if (from === null) return false;
    const left = (followers[from] ?? 0) - 1;
    if (left <= 0) delete followers[from];
    else followers[from] = left;
  }
  followers[to] = (followers[to] ?? 0) + 1;
  city.followers = followers;
  return true;
}

/**
 * Takes one citizen **off one named religion** and leaves them following
 * nothing. Answers whether anybody actually stopped.
 *
 * `convertCitizen`'s inverse, and the Purge's half of it (`purgePressure`,
 * `religion.ts`, ledger Entry LVIII): an inquisitor unmakes belief rather than
 * preaching, so the citizen goes to *nobody* and no second faith is chosen here.
 * That is what keeps the Purge and the Preaching two verbs instead of one verb
 * with a sign.
 *
 * It is here rather than in `religion.ts` because `City.followers` has exactly
 * three writers and they live together — this, `convertCitizen` and
 * `shrinkFollowers` — which is the same discipline `captureUnit` keeps for
 * `Unit.ownerId`. The key is deleted when a congregation empties and the map
 * itself when the last key goes, so a town nobody follows serialises exactly
 * like one nobody ever preached to.
 */
export function unconvertCitizen(city: City, from: ReligionId): boolean {
  const followers = city.followers;
  if (!followers) return false;
  const held = followers[from] ?? 0;
  if (held <= 0) return false;
  const left = held - 1;
  if (left <= 0) delete followers[from];
  else followers[from] = left;
  if (Object.keys(followers).length === 0) delete city.followers;
  return true;
}

/**
 * Takes one citizen away from the religion with the **most** followers — what a
 * town losing a mouth does to its congregations.
 *
 * The mirror of `convertCitizen`'s rule and deliberately not its inverse: a
 * famine takes from the largest congregation because that is where most of the
 * town is, and taking from the smallest would let a starving city quietly purge
 * a rival faith. Ties by id order, which is founding order.
 *
 * The key is **deleted** when a congregation empties, so a town nobody follows
 * any more serialises exactly like one nobody ever preached to.
 */
export function shrinkFollowers(city: City, order: readonly ReligionId[]): void {
  if (unconvertedCitizens(city) > 0) return;
  const followers = city.followers;
  if (!followers) return;
  let largest: ReligionId | null = null;
  let most = 0;
  for (const id of order) {
    const held = followers[id] ?? 0;
    if (held <= 0) continue;
    if (largest === null || held > most) {
      largest = id;
      most = held;
    }
  }
  if (largest === null) return;
  const left = most - 1;
  if (left <= 0) delete followers[largest];
  else followers[largest] = left;
  if (Object.keys(followers).length === 0) delete city.followers;
}

/**
 * One wonder, claimed. See `GameState.wonders`.
 *
 * Four facts and no more: **what** was built, **where** it stands, **who** built
 * it and **when**. Everything else a surface could want — the wonder's name, its
 * yields, its effects — is on the building row, and everything about who holds
 * it *now* is on the city. This is the history, and history does not change.
 *
 * `{ cityId, playerId, building }` is deliberately the shape a future `triumphs`
 * evaluator reads to pay renown on a completion (`docs/great-people.md`): the
 * seam is the report `realiseItem` already returns, so great people join by
 * reading it rather than by growing a hook inside the completion routine.
 */
export interface WonderClaim {
  building: BuildingId;
  /** The city it stands in, at the moment it was finished. */
  cityId: number;
  /** The empire that finished it. Not necessarily the one that holds it now. */
  playerId: number;
  /** `state.turn` when it completed. */
  turn: number;
}

/**
 * One contested Triumph, claimed. See `GameState.contested`.
 *
 * `WonderClaim`'s shape one register over, and for its reason: **what** was
 * claimed, **who** claimed it, and **when** — plus the `age` it was claimed in,
 * because a contested row is contested once per era and the pair `(id, age)` is
 * the key. This is history, and history does not change.
 */
export interface ContestedTriumph {
  id: TriumphId;
  /** The empire that got there first. */
  playerId: number;
  /** The age it was claimed in. The other half of the uniqueness key. */
  age: number;
  /** `state.turn` when it was claimed. */
  turn: number;
}

/**
 * A feed record with every family at nothing — the shape `Player.renownByFamily`
 * is created with, in **one place**, so that every seat's record serialises with
 * the same five keys in the same order.
 */
export function emptyRenownFeed(): Record<Family, number> {
  const feed = {} as Record<Family, number>;
  for (const family of FAMILIES) feed[family] = 0;
  return feed;
}

// --- state ------------------------------------------------------------------

export interface GameConfig {
  /** Numeric seed; use `hashSeed` to turn a word into one. */
  seed: number;
  /** Size key from `data/mapgen.json`. */
  sizeName: string;
  players: PlayerSpec[];
  /**
   * A sparse edit of `data/mapgen.json` for this game's map, or absent — which
   * it is for every ordinary game.
   *
   * It lives **here**, in the config, and that is the whole design. The
   * generator reads module-level data, so the only other way to try a different
   * `mountainShare` would be to write into `MAPGEN_CONFIG` — and a mutated
   * module table breaks the one promise the save format rests on, that
   * `{config, log}` replays to the same world. With the sheet in the config it
   * still does: the config *is* every number the map was made from.
   *
   * Validated by `resolveMapgenConfig`, which throws on an unknown key rather
   * than ignoring it. Written today only by the mapgen inspection page's tuning
   * panel; the game itself never sets one.
   */
  mapgenOverrides?: MapgenOverrides;
  /**
   * Whether this world has barbarians in it. **Absent means no.**
   *
   * A world option, in the config, for `mapgenOverrides`' exact reason: the
   * config *is* every input the world was made from, and a save is `{config,
   * log}`. A flag anywhere else — a module constant, a runtime toggle — would
   * mean two games with the same config replaying to different states, which is
   * the one promise this whole architecture rests on.
   *
   * Off unless asked, and the game asks (`main.ts` sets it on every new game).
   * The default is the quiet world rather than the loud one because the loud one
   * cannot be opted out of by anything that never heard of it: a fixture, an
   * inspection page, a pacing measurement or a test written before Entry XX
   * would otherwise silently acquire a raider in turn thirty of a run it was
   * counting hammers in. A player who wants the wild gets it from the new-game
   * screen; everything else gets the world it always had.
   */
  barbarians?: boolean;
}

export interface GameState {
  schemaVersion: number;
  /** 1-based; `data/rules.json` sets the starting value. */
  turn: number;
  /**
   * **How many times the world has moved** — the key every derived reading is
   * remembered under (`docs/audit/evaluations.md` §2b, §3c; batch E2).
   *
   * Nought in `newGame`, raised by `applyCommand` on every command it *accepts*
   * and once by each end-of-turn phase after that phase has run. Those are the
   * only two ways the simulation moves at all, so a counter that follows them
   * is the answer to "has anything changed since I last asked" — and because
   * both sites are inside the replay, a save that replays reaches the same
   * counter as the game it was saved from. It is state and not a module
   * variable for that reason exactly: a number two games in one process shared
   * would be a memo of the other board.
   *
   * **It is not a clock and it is not a turn.** Nothing compares two revisions
   * for size, nothing does arithmetic on one; the only question ever asked of it
   * is whether it is the same integer it was, which is what makes a memo keyed
   * on it a two-integer compare rather than a walk of everything a seat holds
   * (`liveReading`, `statecraft.ts`, was O(every card, building, bead and tech)
   * per ask).
   *
   * Its guarantee is stated at command and phase granularity and no finer: a
   * reading taken *inside* a handler, between the mutation and the bump, is a
   * reading of a world in the middle of moving. Nothing in the simulation does
   * that on purpose — a reader is a reader and a writer is a writer — and
   * `bumpRevision` is exported so that a test which pokes the state by hand can
   * say so the way a command would.
   */
  revision: number;
  /** The one and only gameplay generator. Advanced by mutation. */
  rng: Rng;
  /** Next id handed to a unit or city. See the module docblock. */
  nextEntityId: number;
  players: Player[];
  /**
   * Who has ended the current turn, indexed by player id — which is the player's
   * index in `players`, so this array is exactly as long as that one.
   *
   * All false at the start of every turn. The `endTurn` command sets one flag;
   * setting the last outstanding flag resolves the turn and clears them all.
   * Read it through `hasEndedTurn` / `allTurnsEnded` rather than indexing it.
   */
  turnEnded: boolean[];
  map: GameMap;
  units: Unit[];
  cities: City[];
  /**
   * Who owns each tile, as a *city* id, indexed exactly like `map.tiles`
   * (`tileIndex(map, col, row)`). `null` is unclaimed. See the module docblock
   * for why this is here and not on the tile.
   */
  tileOwner: (number | null)[];
  /**
   * What each player can see, as one grid per player id — so
   * `visibility[playerId][tileIndex(map, col, row)]` is 0 hidden, 1 explored,
   * 2 visible. See `visibility.ts` for the model and `newVisibilityGrid` for
   * the shape.
   *
   * Parallel arrays over `map.tiles`, exactly like `tileOwner`, and here for the
   * same three reasons: the map is generation output that a save does not carry,
   * this is read constantly and written rarely, and a flat array indexed the way
   * every other tile lookup is indexed cannot fall out of step with the board.
   *
   * Indexed by player *id*, which is the player's index in `players` (see the
   * `turnEnded` trap in CLAUDE.md) — the same assumption that array already
   * makes, and it will be revisited in the same breath if players ever become
   * removable.
   *
   * Plain integer arrays rather than a packed string or a bitfield. A standard
   * map is 4,160 tiles, so four seats cost about 33 kB of JSON — measured, not
   * guessed — and a packed representation would buy back a rounding error at the
   * price of making every state dump unreadable by eye.
   */
  visibility: number[][];
  /**
   * What each player *remembers* of the cities they have seen, one list per
   * player id, sorted by city id.
   *
   * The other half of `explored`: terrain is static, so a remembered tile can
   * simply be drawn, but a city is a thing that was there — it has a name and a
   * flag and both can change while nobody is watching. This is the minimum that
   * lets an unwatched site keep a (dimmed) banner instead of a blank hex. See
   * `CitySighting` in `visibility.ts` for why it is deliberately not richer.
   */
  citySightings: CitySighting[][];
  /**
   * Every barbarian camp standing on the board, in founding order.
   *
   * An array on the state rather than a flag on a tile — see `BarbarianCamp` for
   * why — and in founding order rather than map order, because that is the order
   * they *muster* in and an outcome that depends on iteration order must depend
   * on an order the state itself carries. Empty in a world with no barbarians in
   * it, which is every world whose config did not ask for them.
   */
  camps: BarbarianCamp[];
  /**
   * Every wonder that has been built, **in the order they were claimed**.
   *
   * The whole of "one per world": there is no flag on a building, no counter on
   * a player and no second register anywhere — a wonder is claimed iff there is
   * a row here naming it, and `buildError` (`tech.ts`) refuses the second empire
   * to reach for it in a sentence read off this row. Written in exactly one
   * place, `claimWonder`, called from exactly one place, `realiseItem`
   * (`cities.ts`) — the same discipline `captureUnit` keeps for a change of
   * ownership.
   *
   * An **array in claim order** rather than a `Record<BuildingId, …>`, and for
   * `GameState.camps`' stated reason: an outcome that depends on iteration
   * order must depend on an order the state itself carries, and "the order they
   * were finished" is a fact a chronicle wants anyway. It is short — twenty-odd
   * rows in a whole game — so the linear lookup below costs nothing.
   *
   * It is deliberately a record of the *claim* and not of where the wonder
   * stands today. A captured wonder pays its captor (the effects are read off
   * the holding city's `buildings`, like every other building), while this row
   * keeps saying who first raised it and when — which is the shape the future
   * `triumphs` evaluator reads to pay renown (`docs/great-people.md`).
   */
  wonders: WonderClaim[];
  /**
   * Every great person any empire has recruited, **in the order they were
   * picked** — the world's consumed roster.
   *
   * `GameState.wonders`' twin one table over, and the whole of "only one empire
   * ever has Archimedes": a name is spent iff there is an entry here, the draw
   * subtracts this list from the age's roster, and `greatPersonChoiceError`
   * refuses the *second* pick of a name a faster seat took in the same window.
   * Written in exactly one place, `settleGreatPersonChoice` (`greatPeople.ts`).
   *
   * An **array in pick order** rather than a set, for `camps`' stated reason: an
   * outcome that depends on iteration order must depend on an order the state
   * itself carries. It is short — a dozen rows in a whole game — so the linear
   * lookup costs nothing.
   *
   * It deliberately does **not** record who took each name. Who holds a legacy
   * is `Player.legacies`, and who is holding an unspent piece is the board; a
   * third answer here would be a third thing to keep in step.
   */
  recruited: GreatPersonId[];
  /**
   * The contested Triumphs, and who took each — **in claim order**.
   *
   * A contested triumph is the world's, not a seat's (Entry V's feats): the
   * first empire into an era earns First Light and nobody else ever can, in that
   * era. This is that register, and it is the *only* place contention is
   * settled — `awardTriumph` refuses a row whose `(id, age)` is already here, so
   * "first by log and sweep order" is a property of the order commands were
   * applied in rather than of a check somebody could forget to run.
   *
   * An array rather than a `Record<TriumphId, playerId>` because the key is a
   * *pair* (a contested row is claimed once per age) and because claim order is
   * a fact a chronicle wants anyway — `GameState.wonders`' argument exactly.
   */
  contested: ContestedTriumph[];
  /**
   * Every religion that has been founded, **in founding order** — which is also
   * what a `ReligionId` is.
   *
   * `GameState.wonders`' twin one system over, and the register in the same
   * sense: a religion exists iff there is a row here, an empire has founded one
   * iff a row names it, and how many the world may hold at all
   * (`rules.religion.maxReligions`, two thirds of the real seats rounded up) is
   * a count of this array. Written in exactly one place, `foundReligion`
   * (`religion.ts`), from exactly one verb.
   *
   * An **array in founding order** rather than a record, for `camps`' stated
   * reason: every tie in the spread ("the religion with the fewest followers,
   * ties by id") is broken by an order, and it has to be an order the state
   * itself carries.
   */
  religions: Religion[];
  /**
   * Every live war, one row per pair, in declaration order
   * (`docs/war-diplomacy.md`, section 1).
   *
   * `GameState.wonders`' twin one system over and the register in the same
   * sense: two empires are at war iff there is a row here naming them, and
   * every gate in the simulation — the combat planner, the raid, the border —
   * asks one reader (`atWar`, `wars.ts`) rather than keeping an opinion. The
   * wild is **never** in it; see that module's docblock for why a barbarian
   * needs no row to fight.
   *
   * An **array in declaration order** rather than a record keyed by pair, for
   * `camps`' stated reason: an outcome that depends on iteration order must
   * depend on an order the state itself carries. It is short — a handful of
   * rows in a whole game — so the linear lookup costs nothing.
   */
  wars: WarState[];
  /**
   * Every truce still standing: this pair may not go to war again until the
   * turn named on the row.
   *
   * `wars`' opposite number and a separate array for the plainest reason — a
   * truce exists exactly when a war does not, so one row could never carry
   * both. The expiry is **absolute** and nothing ticks it (the timed-effect
   * rule); `pruneTruces` is a broom.
   */
  truces: Truce[];
  /**
   * Every bargain two empires have signed and that has not run out
   * (`docs/war-diplomacy.md`, section 7; `deals.ts`).
   *
   * `wars`' third sibling and the register in the same sense: an empire lends a
   * luxury, pays a tribute or opens a border iff there is a row here saying so,
   * and the three readers — `openedResource`, `explainEmpireGold`,
   * `closedBordersFor` — each ask one function rather than keeping an opinion.
   * Unlike a war there may be **several** rows for one pair, each with its own
   * absolute expiry, so an array in signing order rather than a record keyed by
   * pair; the ordering is `camps`' argument exactly.
   *
   * Only signed bargains are here. A proposal nobody has answered lives in
   * `dealProposals`, and the two are separate arrays precisely so that no
   * reading of this one has to remember to filter.
   */
  deals: DealState[];
  /**
   * Bargains one empire has put to another and nobody has signed.
   *
   * `deals`' antechamber, in **log order**, which is the order a contention
   * resolves by: two proposals accepted in the same window resolve in the order
   * their acceptances were logged, and nothing about a proposal's own age is
   * ever read for an outcome. A declaration between the pair sweeps theirs away
   * (`cancelDealsBetween`) for the reason a war takes its peace offers with it.
   */
  dealProposals: DealProposal[];
  /**
   * The Bead Race — the decks, the hands, the world's register and its clock.
   * See `BeadTable`, and design ledger Entry VI for why there is one victory
   * condition rather than four.
   */
  beads: BeadTable;
  /**
   * The winner, once there is one; `null` while the game is live.
   *
   * **One field, two ways to reach it** (Entry VI.3): the last empire standing
   * (`updateElimination`, `combat.ts`) and the Great Work closing
   * (`closeTheGreatWork`, `beads.ts`, which names the empire that raised it).
   * Whichever comes first writes it, and neither ever clears a winner the other
   * named — a game that has been won stays won.
   *
   * There used to be a third: the first empire to `BEAD_RULES.threshold` beads
   * won outright in the `beads` phase. That reading is **retired** (schema 64) —
   * the threshold opens the Magnum Opus now, and the Opus closes the game. The
   * close used to count the rods and break a tie for the builder; since schema
   * 69 it simply names the builder, and the beads are a door rather than a
   * tally.
   *
   * It is a *record*, not a gate: the reducer keeps accepting commands after it
   * is set, because refusing them would mean a replay of a finished game
   * diverges from the game it replays. The interface is what stops.
   */
  winnerId: number | null;
}

// --- construction -----------------------------------------------------------

/**
 * Canonicalises a config so that two configs that mean the same game *are* the
 * same object: the seed is coerced to a 32-bit integer (the generators do this
 * anyway) and player specs are copied with defaults filled in.
 *
 * `createGame` stores the normalised form, so a save file never round-trips a
 * value the simulation would have reinterpreted.
 */
export function normalizeConfig(config: GameConfig): GameConfig {
  const normalized: GameConfig = {
    seed: config.seed | 0,
    sizeName: config.sizeName,
    players: config.players.map((spec) => {
      const player: PlayerSpec = {
        name: spec.name,
        color: spec.color,
        isHuman: spec.isHuman ?? false,
      };
      // Written only when it is named, exactly as `barbarians` and the mapgen
      // sheet are: a seat that took its charge by seat order normalises to *no*
      // key at all and is byte-identical to a spec from before heraldry existed.
      if (spec.charge !== undefined) player.charge = spec.charge;
      // The persona, on exactly the same terms: written only when it is named,
      // so a roster from before personas existed normalises byte-identically.
      if (spec.persona !== undefined) player.persona = spec.persona;
      return player;
    }),
  };
  // The override sheet is copied through JSON for the same reason the player
  // specs are copied at all — the config is the save file and a caller that
  // keeps editing the object it handed in must not be able to rewrite a game's
  // map. The round trip also drops any `undefined` a partial was spread from,
  // so an empty sheet normalises to *no* sheet and the game is byte-identical
  // to one that never had the field.
  if (config.mapgenOverrides && Object.keys(config.mapgenOverrides).length > 0) {
    const copied = JSON.parse(JSON.stringify(config.mapgenOverrides)) as MapgenOverrides;
    if (Object.keys(copied).length > 0) normalized.mapgenOverrides = copied;
  }
  // Written only when it is on, exactly as the override sheet is: a quiet world
  // normalises to *no* key at all and is byte-identical to a config from before
  // the wild existed. `false` and absent are the same world and must serialise
  // the same way.
  if (config.barbarians === true) normalized.barbarians = true;
  return normalized;
}

/**
 * The gameplay generator for a seed: a stream deliberately unrelated to the one
 * `generateMap` runs. Hashing a labelled string is the same trick used for word
 * seeds, and it is stable across platforms because it is pure integer math.
 */
export function deriveGameplayRng(seed: number): Rng {
  return makeRng(hashSeed(`webciv:gameplay:${seed | 0}`));
}

function validateConfig(config: GameConfig): void {
  const { minPlayers, maxPlayers } = RULES.game;
  if (config.players.length < minPlayers) {
    throw new Error(`A game needs at least ${minPlayers} player(s)`);
  }
  if (config.players.length > maxPlayers) {
    throw new Error(`A game supports at most ${maxPlayers} players`);
  }
  // Throws with the list of known sizes if the key is bad.
  getMapSize(config.sizeName);
  // Throws on an unknown key or a mistyped value, *before* a tile is drawn — a
  // bad sheet is a bad config, not a map that quietly ignored half of it.
  resolveMapgenConfig(config.mapgenOverrides);
}

/**
 * A fresh Bead Race: both decks drawn and shuffled, both hands empty, nothing
 * claimed.
 *
 * **The one place a deck is ordered.** It is drawn here, in `newGame`, rather
 * than when an age opens, for the doctrine `discoveries.ts` states and every
 * offer generator obeys: an order rolled later would make the deal a function
 * of *when* somebody reached an age, and under simultaneous turns two seats
 * reach it in the same window. Rolled once from the config's own generator, a
 * seed **is** a deal — which is also Entry II's fairness rule, since every seat
 * looks at the same table.
 *
 * A deck is **two halves shuffled together**: the age's endeavours and quests,
 * which are the same in every game (`beadDeckFor`), and **four reckonings, one
 * per family, drawn from the pool of eight** (`drawAgeReckonings`). A reckoning
 * is an ordinary card in every respect that matters here — shuffled in, dealt
 * one a turn, turned face up when its age opens — and differs only in when it
 * resolves: at the *next* age's opening, across every seat at once.
 *
 * The order of the two calls per age is the rule, not a habit: the reckonings
 * are drawn first and the combined list is shuffled second, so the generator is
 * consumed in one fixed sequence and a replay deals the same table. Ages are
 * walked in `BEAD_DECK_AGES` order for the same reason. `beadDeckFor` has
 * already dropped every dormant card, so nothing unreachable is ever dealt into
 * a hand somebody has to read.
 */
function newBeadTable(rng: Rng): BeadTable {
  const decks: Record<string, BeadCardId[]> = {};
  const hands: Record<string, BeadCard[]> = {};
  for (const age of BEAD_DECK_AGES) {
    const reckonings = drawAgeReckonings(rng);
    decks[String(age)] = shuffle(rng, [...beadDeckFor(age), ...reckonings]);
    hands[String(age)] = [];
  }
  // The world begins in its first age, whatever the tree's opening technologies
  // are: `worldAge` is the *clock*, and a clock that started at the highest age
  // anybody happened to hold would open an age before anybody had entered it.
  return { decks, hands, claimed: [], streaks: {}, worldAge: 1 };
}

/**
 * Builds the initial state. Deterministic in `config` alone: the same config
 * always produces a byte-identical state.
 */
export function newGame(config: GameConfig): GameState {
  const normalized = normalizeConfig(config);
  validateConfig(normalized);

  const map = generateMap(normalized.seed, normalized.sizeName, normalized.mapgenOverrides);
  // Named before the state is built, because the two decks are shuffled off it
  // (see `newBeadTable`) and the state literal below cannot refer to itself.
  const rng = deriveGameplayRng(normalized.seed);
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    turn: RULES.game.startingTurn,
    // Nought, and the first accepted command makes it one. See `GameState.revision`.
    revision: 0,
    rng,
    nextEntityId: RULES.game.firstEntityId,
    players: normalized.players.map((spec, index) => ({
      id: index,
      name: spec.name,
      color: spec.color,
      // Spread rather than assigned, so a seat with no charge has no key — the
      // same shape `normalizeConfig` just produced, and the reason a state from
      // a charge-less config serialises identically to one from before the field.
      ...(spec.charge === undefined ? {} : { charge: spec.charge }),
      ...(spec.persona === undefined ? {} : { persona: spec.persona }),
      isHuman: spec.isHuman ?? false,
      gold: 0,
      sciencePool: 0,
      culturePool: 0,
      faithPool: 0,
      researching: null,
      // Copied, never aliased: the rules are shared by every player and by every
      // game in the process, and a player who researched something must not
      // write it into the rule book.
      techsResearched: [...RULES.research.startingTechs],
      // Nobody has met anybody on turn one — the opening rosters are seated
      // after this literal, and the first recompute below is what introduces
      // two empires that started in sight of each other.
      metSeats: [],
      // Presence is the state (see the field's docblock): nobody has built a
      // settler or a worker yet, so the empty object is the opening kit, same
      // as a fresh `researchQueue`-less player.
      unitsBuilt: {},
      tilesPurchased: 0,
      campsCleared: 0,
      eliminated: false,
      barbarian: false,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason exactly: a player who drafts a card must not write it into
      // everybody else's collection.
      statecraft: newPlayerStatecraft(),
      // The same argument one system over: a player who consecrates a god must
      // not write it into everybody else's pantheon.
      pantheon: newPlayerPantheon(),
      augursPurchased: 0,
      prophetsPurchased: 0,
      renownPool: 0,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason exactly: a player whose libraries feed the scholars must not
      // write that into everybody else's history.
      renownByFamily: emptyRenownFeed(),
      legacies: [],
      triumphs: [],
      greatPeopleRecruited: 0,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason: an empire that clacks a bead must not write it onto every rod
      // in the world.
      beads: [],
      citiesFounded: 0,
      citiesCaptured: 0,
      faithOnHolyOrders: 0,
      tithesGold: 0,
      scholarshipScience: 0,
      routeYieldsThisAge: 0,
      greatPeopleThisAge: 0,
    })),
    turnEnded: normalized.players.map(() => false),
    map,
    units: [],
    cities: [],
    // One slot per tile, all unclaimed. Sized once, here, so every later access
    // is a plain indexed read that cannot be out of range.
    tileOwner: new Array<number | null>(map.tiles.length).fill(null),
    // One grid per seat, all blank. Sized here for the reason `tileOwner` is:
    // every later access is a plain indexed read that cannot be out of range.
    visibility: normalized.players.map(() => newVisibilityGrid(map.tiles.length)),
    citySightings: normalized.players.map(() => []),
    camps: [],
    // Nothing has been built yet, which is what an empty claim register means.
    wonders: [],
    // Nobody has been recruited and nothing has been claimed, which is what two
    // empty registers mean.
    recruited: [],
    contested: [],
    // Nobody has founded anything, which is what an empty register means.
    religions: [],
    // Nobody is at war and nobody owes anybody peace. Two empty registers, and
    // a world that never fights serialises with both of them empty forever.
    wars: [],
    truces: [],
    deals: [],
    dealProposals: [],
    // **The deal is the seed.** Both decks are shuffled here, before a single
    // piece is placed, so that a config alone determines every card and the
    // order it comes off — Entry II's fairness, and the reason no generator ever
    // draws a bead card on sight (see `beads.ts`).
    beads: newBeadTable(rng),
    winnerId: null,
  };
  placeStartingUnits(state);
  // The wild is seated **after** the opening rosters, and that ordering is the
  // whole of why player id is still the player's index: `placeStartingUnits`
  // asks `chooseStartPositions` for `state.players.length` sites, so a seat
  // appended before it would have claimed a start of its own and shifted
  // nobody's — but seated *nothing*, leaving an ownerIndex the roster never
  // filled. Appended here it costs the real seats nothing at all.
  if (normalized.barbarians === true) seatBarbarians(state);
  // The opening scouting report. `createUnit` has already refreshed each seat as
  // its pieces landed, but a seat whose roster is empty — a scenario, a future
  // spectator — would otherwise start with no grid computed at all, and a state
  // that is only correct when somebody owns something is a state waiting to be
  // wrong.
  recomputeAllVisibility(state);
  return state;
}

/**
 * Seats every player's opening roster. Deterministic in the map and the rules
 * alone (see `startPositions.ts`), so it rolls no dice and needs no log entry —
 * a replay reproduces the same starts from the config.
 */
function placeStartingUnits(state: GameState): void {
  const starts = chooseStartPositions(state.map, state.players.length);
  for (const placement of planStartingUnits(state.map, starts, RULES.startingUnits)) {
    const player = state.players[placement.ownerIndex];
    if (!player) continue;
    createUnit(state, player.id, placement.unitType, placement.col, placement.row);
  }
}

/**
 * Appends the wild, with everything a seat needs and nothing a nation does.
 *
 * Every parallel-array-over-players in the state is extended in the same breath,
 * which is the point of doing it in one function: `turnEnded`, `visibility` and
 * `citySightings` are all indexed by player id (see their docblocks and the trap
 * in CLAUDE.md), so a seat added without all three would be a seat whose fog grid
 * is `undefined` the first time anything asks what it can see.
 *
 * Its flag goes up **already finished**. A seat that never ends its turn would
 * deadlock every resolution, and `clearTurnEnded` re-raises it every turn
 * thereafter — the same one line that keeps an eliminated empire finished, which
 * is exactly the right precedent: both are seats the turn must never wait for.
 *
 * It is named rather than numbered because the name reaches the player: a combat
 * forecast says who is being fought.
 */
function seatBarbarians(state: GameState): void {
  const player: Player = {
    id: state.players.length,
    name: 'Barbarians',
    // The simulation never interprets a colour (see `PlayerSpec`); the diorama
    // maps this one onto the raven ink in `data/view3d.json`.
    color: '#3a3a42',
    isHuman: false,
    gold: 0,
    sciencePool: 0,
    culturePool: 0,
    faithPool: 0,
    researching: null,
    // **Empty**, and not the opening kit. The wild does not research and does not
    // begin holding anything; what it can field is read off the *real* empires
    // every time it musters (`barbarianTier`), so a starting-tech list here would
    // be a second, stale answer to the same question.
    techsResearched: [],
    // **Empty forever.** The wild meets nobody and nobody meets the wild (see
    // the field's docblock); present so every reader may index a seat without
    // asking which kind it is, exactly as `beads` and `renownPool` are.
    metSeats: [],
    unitsBuilt: {},
    tilesPurchased: 0,
    campsCleared: 0,
    eliminated: false,
    barbarian: true,
    // A chiefdom the wild will never leave. Present so that every reader may
    // index a seat without asking which kind it is; filled by nothing, because
    // `runStatecraft` skips the wild the way `advanceResearch` does.
    statecraft: newPlayerStatecraft(),
    pantheon: newPlayerPantheon(),
    augursPurchased: 0,
    prophetsPurchased: 0,
    // Present so every reader may index a seat without asking which kind it is,
    // and filled by nothing: the renown phase skips the wild the way
    // `advanceResearch` does. The wild has no screen to be offered a name on.
    renownPool: 0,
    renownByFamily: emptyRenownFeed(),
    legacies: [],
    triumphs: [],
    greatPeopleRecruited: 0,
    // Present so every reader may index a seat without asking which kind it is,
    // and filled by nothing: the `beads` phase skips the wild the way the renown
    // phase does. The wild has no Abacus and nothing to win.
    beads: [],
    citiesFounded: 0,
    citiesCaptured: 0,
    faithOnHolyOrders: 0,
    tithesGold: 0,
    scholarshipScience: 0,
    routeYieldsThisAge: 0,
    greatPeopleThisAge: 0,
  };
  state.players.push(player);
  state.turnEnded.push(true);
  state.visibility.push(newVisibilityGrid(state.map.tiles.length));
  state.citySightings.push([]);
}

// --- accessors --------------------------------------------------------------

/** Hands out the next entity id. The only place ids are minted. */
export function allocateEntityId(state: GameState): number {
  const id = state.nextEntityId;
  state.nextEntityId = id + 1;
  return id;
}

/**
 * Mints a unit at full health and full movement and appends it to `state.units`.
 *
 * The low-level constructor: it validates nothing. Callers own the rules —
 * `spawnUnit` in `commands.ts` checks terrain and stacking first, and
 * `placeStartingUnits` gets legal positions from `startPositions.ts`. Keeping it
 * here rather than in `units.ts` avoids an import cycle with the id allocator
 * and keeps every field of a `Unit` written in exactly one place, which is what
 * makes the serialised key order stable.
 */
export function createUnit(
  state: GameState,
  ownerId: number,
  type: UnitTypeId,
  col: number,
  row: number,
  person?: GreatPersonId,
  /**
   * A stamp the **caller** is handing this one piece, on top of whatever the
   * empire's law stamps on everything — The Levée en Masse's point of movement
   * for the levy it musters (`CardPeriodicMusterEffect.stamp`).
   *
   * Passed *in* rather than written on afterwards, and that is the whole reason
   * it is a parameter: `Unit.stamp` has exactly one writer, and the health a
   * piece is born at is read off the stamp two lines below — a warrior stamped
   * after the literal would be a veteran who starts wounded. Summed with the
   * law's rather than replacing it, so a conscript raised under The Muster Roll
   * carries both marks.
   */
  gift?: UnitStamp,
): Unit {
  const def = unitDef(type);
  // **The stamp is decided before the piece exists**, because the maximum it is
  // born at is the roster's plus its own (`unitMaxHp`) — a warrior minted at the
  // sheet's 100 and stamped to 110 a line later would be a veteran who starts
  // wounded. The Muster Roll, Drums of War; see `cardUnitStamp`, the one reader
  // of the shape, and `Unit.stamp`, where presence is the state.
  // The birth hex travels with it since the Terracotta Army: a stamp may name
  // the town that raised the piece, and this is the one place a piece comes into
  // existence — so "built in this city" is asked exactly where it can be
  // answered. A creation on open ground has no town and a scoped stamp is silent
  // there; see `CardUnitStampEffect.scope`.
  const stamp = cardUnitStamp(state, ownerId, { col, row });
  // The caller's own mark, folded into the law's before anything is read off it:
  // one field, one writer, and a piece that is a veteran twice over carries the
  // sum. Voice by voice, because a mark on a levy and a mark on the whole army
  // are two reasons for the same point.
  if (gift !== undefined) {
    if (gift.hp !== undefined) stamp.hp = (stamp.hp ?? 0) + gift.hp;
    if (gift.strength !== undefined) stamp.strength = (stamp.strength ?? 0) + gift.strength;
    if (gift.movement !== undefined) stamp.movement = (stamp.movement ?? 0) + gift.movement;
  }
  const stamped = Object.keys(stamp).length > 0;
  const unit: Unit = {
    id: allocateEntityId(state),
    ownerId,
    type,
    col,
    row,
    hp: stamped ? unitMaxHp({ type, stamp }) : def.maxHp,
    // "Full movement" is the roster's plus the piece's own stamp, for the
    // health's reason exactly (`unitMaxHp`): a conscript minted at the sheet's
    // two points and stamped to three a line later would be born a third of a
    // turn tired, and `isRested` — which compares the purse against
    // `fullMovement` — would refuse to heal it on the turn it mustered. The
    // empire's *law* is deliberately not read here: a card's movement bonus has
    // always landed at the next refill, and a stamp is not a card.
    movesLeft: def.movement + (stamp.movement ?? 0),
    hasAttacked: false,
  };
  // Written after the literal and only when the type declares charges, so a
  // soldier's serialised shape is byte-for-byte what it was before builders
  // existed. See `Unit.chargesLeft` for why presence is the marker.
  // Tinkers' Guild, and it is applied **at birth** rather than on read, which is
  // what the card's own text asks for: "workers are built with +1 charge". A
  // charge is spent, so a bonus computed on read would hand the extra charge
  // back every time the card was re-slotted and take it away mid-job when it
  // came out. Floored at 1, because a builder with no charges is not a builder.
  // The birth hex travels with the question, because a card may ask *which town
  // raised this piece* — Cuius Regio's augurs are charged by the faith of the
  // city they were trained in. It is the hex and not a city id: `createUnit` has
  // never known about towns, and the one reader resolves the town from the hex
  // (`cardExtraCharges`), so a piece born in the wild simply admits no scoped
  // line.
  if (def.charges !== undefined) {
    unit.chargesLeft = Math.max(
      1,
      def.charges + cardExtraCharges(state, ownerId, type, { col, row }),
    );
  }
  // Written **here**, after the literal and only when a caller named one, for
  // `chargesLeft`'s reason exactly: every field of a `Unit` is written in one
  // place, which is what keeps the serialised key order stable, and an ordinary
  // warrior's shape is byte-for-byte what it was before great people existed.
  // Exactly one caller passes it — `settleGreatPersonChoice` (`greatPeople.ts`).
  if (person !== undefined) unit.person = person;
  // Written after the literal and only when the council had stamped something,
  // for `chargesLeft`' reason exactly: a game with no such card in it serialises
  // byte-for-byte as it did before this field existed.
  if (stamped) unit.stamp = stamp;
  state.units.push(unit);
  // A new pair of eyes opens here, whoever asked for them: the `spawnUnit`
  // command, a city finishing production, a scenario seating an opening roster.
  // Refreshing in the constructor rather than at each of those call sites is the
  // same argument `breakFortify` makes from inside `advanceAlongPath` — there is
  // exactly one place a unit comes into existence, so there is exactly one place
  // that can forget.
  recomputeVisibility(state, ownerId);
  return unit;
}

/**
 * Takes a unit off the board. Returns false when there was no such unit.
 *
 * The counterpart of `createUnit` and, like it, a low-level operation that
 * validates nothing: the only caller today is `foundCity`, which spends a
 * settler. Ids are never reused, so nothing that remembered this one can be
 * fooled into finding a different unit later — it simply stops resolving.
 */
export function removeUnit(state: GameState, unitId: number): boolean {
  const index = state.units.findIndex((unit) => unit.id === unitId);
  if (index < 0) return false;
  const ownerId = state.units[index]!.ownerId;
  state.units.splice(index, 1);
  // The counterpart of the refresh in `createUnit`, and it has to be read off
  // the unit *before* the splice: a piece that dies is a piece whose owner stops
  // seeing the ground around it, and by the time this returns there is nothing
  // left to ask whose it was.
  recomputeVisibility(state, ownerId);
  return true;
}

/**
 * Shakes a unit out of its trench. Returns whether it was in one.
 *
 * The key is *deleted* rather than zeroed, because presence is the state (see
 * `Unit.fortifiedTurns`) and a unit that never fortified must serialise
 * identically to one that just stopped.
 *
 * It lives here, beside the other three one-line facts about a unit's existence,
 * rather than in `combat.ts` where it was written, because `captureUnit` below
 * needs it and `captureUnit` has to sit under every module that can transfer a
 * piece — `arrival.ts` among them, which `combat.ts` imports. `combat.ts`
 * re-exports it, so every caller that has always asked combat about its own
 * posture rule goes on asking combat; the rule itself is unchanged and still has
 * exactly the callers it had (`movement.ts` when a unit's position changes,
 * `applyCombat` when it attacks, and now a change of owner).
 */
export function breakFortify(unit: Unit): boolean {
  if (unit.fortifiedTurns === undefined) return false;
  delete unit.fortifiedTurns;
  return true;
}

/**
 * Wakes a sleeping unit. Returns whether it was asleep.
 *
 * `breakFortify`'s sibling in every respect — the key is *deleted* rather than
 * set false, because presence is the state (see `Unit.sleeping`) and a unit that
 * has never slept must serialise identically to one just woken — and it lives
 * here for the same reason: it is a one-line fact about a piece's posture that
 * more than one occasion reaches, and the occasions must not each own a copy.
 *
 * The occasions, and they are the whole rule:
 *
 *   1. **any command that names the unit** (`commands.ts`, `wakeActorUnit`) —
 *      an order is a waking, so there is no separate "wake" verb to forget to
 *      send;
 *   2. **`wakeSleepers`** (`turn.ts`), when a foreign combatant is inside the
 *      sleeper's own sight at the end of a resolution;
 *   3. **`captureUnit`** below, because the sleep was somebody else's decision
 *      about somebody else's piece, exactly as the trench was.
 */
export function wakeUnit(unit: Unit): boolean {
  if (unit.sleeping === undefined) return false;
  delete unit.sleeping;
  return true;
}

/**
 * A unit changes hands: the **one** implementation of capture.
 *
 * The third low-level fact about a piece's existence, beside `createUnit` and
 * `removeUnit`, and here for their reason: there is exactly one way a unit comes
 * into the world, one way it leaves it, and — as of the wild's raiding — more
 * than one *occasion* on which it changes owner, so there had better be one
 * place that knows what changing owner means.
 *
 * The three occasions, all of them this function:
 *
 *   1. a melee blow that takes a hex holding only civilians — resolved as an advance, so the hand-over is `arriveOnTile`'s (`applyCombat` — the rule players have
 *      always had, and the rule a barbarian thief steals by, unchanged);
 *   2. the ground under a civilian being taken — a melee winner advancing onto
 *      the hex its kill emptied (`arriveOnTile`);
 *   3. that same advance onto a **barbarian camp**, which frees the laborers the
 *      wild had walked back to it (`arriveOnTile` again, and the reason the two
 *      are one call site rather than two rules).
 *
 * What it does, and why each line: the new owner, obviously; **no movement left
 * this turn**, because a piece that has just been dragged across a hex line has
 * not been marching for its new owner; **no orders**, because the waypoints were
 * the *previous* owner's plan and a captured settler walking back to its old
 * capital would be absurd; out of any trench, because the trench was dug by
 * somebody else's army; and **awake**, for the trench's reason exactly — the
 * sleep was the previous owner's decision that this piece could be left alone,
 * and it is the first thing the new owner needs asked about. Everything else it
 * keeps — hit points, and a worker's
 * `chargesLeft` above all (design ledger, M7): capture changes hands and nothing
 * else about what the piece *is*.
 *
 * Both empires' maps are redrawn, which is what makes the two new occasions cost
 * their callers nothing: a piece that changes hands is a pair of eyes closing on
 * one side and opening on the other, and this is the only place that knows both
 * ids at once.
 *
 * **A trader never reaches here** (the trade pass). A laden caravan caught by a
 * soldier is *plundered* — destroyed, and its cargo paid to the killer's nearest
 * city — rather than taken, so both call sites above ask `trades` first and
 * neither this function nor its rules learnt a thing about routes. That is the
 * shape a fourth occasion should copy: the exception belongs to the occasion,
 * never to the change of hands.
 */
export function captureUnit(state: GameState, unit: Unit, ownerId: number): void {
  const before = unit.ownerId;
  unit.ownerId = ownerId;
  unit.movesLeft = 0;
  delete unit.path;
  breakFortify(unit);
  wakeUnit(unit);
  // **Off the payroll, for ever** (the maintenance ruling, 2026-08-28). A piece
  // that changed hands was never paid for by the empire holding it, so it costs
  // that empire nothing to keep — and the mark stays if it changes hands again,
  // because it was never bought by anybody who has it now. Written here for the
  // reason everything else in this function is written here: there is exactly
  // one place that knows a unit has changed owner, and a maintenance rule that
  // asked each *occasion* to remember would be a rule the fourth occasion forgets.
  unit.freeUpkeep = true;
  if (before !== ownerId) recomputeVisibilityFor(state, [before, ownerId]);
}

/**
 * Mints an empty city and appends it to `state.cities`.
 *
 * The sibling of `createUnit`, here for the same three reasons: it needs the id
 * allocator, every field of a `City` is written in exactly one place (which is
 * what keeps the serialised key order stable), and keeping it out of `cities.ts`
 * avoids an import cycle.
 *
 * Like `createUnit` it validates nothing and claims nothing — the rules live in
 * the `foundCity` command, and the opening territory is claimed by `foundCityAt`
 * in `cities.ts`. A city minted here owns no tiles and works none.
 */
export function createCity(
  state: GameState,
  ownerId: number,
  name: string,
  col: number,
  row: number,
): City {
  const city: City = {
    id: allocateEntityId(state),
    ownerId,
    name,
    col,
    row,
    population: 1,
    hp: RULES.combat.cityBaseHp,
    foodBasket: 0,
    culture: 0,
    tilesClaimed: 0,
    buildings: [],
    // Founded, by definition: this is the only way a city comes into existence,
    // and the only thing that raises the flag is a fight (see `captureCity`).
    captured: false,
    queue: [],
    hammerBasket: 0,
    workedTiles: [],
    lockedTiles: [],
    // Written in full — see `City.specialists`. A fresh object every time, for
    // the reason every table accessor in this game builds one: a shared record
    // summed into by one town would give every other town its guilds.
    specialists: newCitySpecialists(),
    guildBasket: 0,
  };
  state.cities.push(city);
  return city;
}

/** A town with nobody in the trades yet. The one place the zeros are written. */
export function newCitySpecialists(): Record<SpecialistFamily, number> {
  const counts = {} as Record<SpecialistFamily, number>;
  for (const family of SPECIALIST_FAMILIES) counts[family] = 0;
  return counts;
}

/**
 * The claim on a wonder, or `undefined` while it is still unbuilt.
 *
 * **The** question, asked by everything that has an opinion about wonders: the
 * build gate, the purchase gate, the panel's greyed row and the sculpt. A linear
 * scan of a list that holds at most one row per wonder in the game — see
 * `GameState.wonders` for why an array is the right shape here.
 */
export function wonderClaim(state: GameState, building: BuildingId): WonderClaim | undefined {
  for (const claim of state.wonders) {
    if (claim.building === building) return claim;
  }
  return undefined;
}

/**
 * Records a wonder as built. **The one place `state.wonders` is written**, and
 * it is `createCity`'s neighbour for that reason.
 *
 * Deliberately not idempotent and deliberately not a validator: it appends. The
 * rule that there is only ever one row per wonder lives at the gate
 * (`buildError`) and in the sweep that empties every other queue of it the
 * instant this is called (`refundBeatenWonders`), which is what makes "the first
 * city in the sweep wins" a property of the completion routine rather than of a
 * check somebody could forget to run.
 */
export function claimWonder(
  state: GameState,
  building: BuildingId,
  city: City,
): WonderClaim {
  const claim: WonderClaim = {
    building,
    cityId: city.id,
    playerId: city.ownerId,
    turn: state.turn,
  };
  state.wonders.push(claim);
  return claim;
}

// --- the revision -----------------------------------------------------------

/**
 * **The world moved** — the one writer of `GameState.revision`.
 *
 * Two callers in the simulation and they are the whole contract: `applyCommand`
 * after a command it accepted, and `runEndOfTurn` after each phase in the fixed
 * order. Everything else that would like to say "the board is different now"
 * says it by being one of those two, because a third bump site is a third place
 * to forget — and a memo trusting a counter nobody raised is the one failure
 * this whole scheme can cause.
 *
 * A test that pokes the state by hand — slots a card, revokes a legacy, moves
 * the turn on — is doing by hand what a command does, and calls this for the
 * same reason a command does. That is not a leak in the design; it is the
 * design said out loud: **a writer moves the state and the revision moves with
 * it**, and the readings follow without being told (`docs/audit/evaluations.md`
 * §2b).
 */
export function bumpRevision(state: GameState): void {
  state.revision += 1;
}

// --- turn status ------------------------------------------------------------

/**
 * Has this player finished the current turn?
 *
 * Answers false for an id that is not a player's, which is deliberate: callers
 * that care whether the player exists at all ask `playerById`, and this stays a
 * question about the turn rather than a second, weaker existence check.
 */
export function hasEndedTurn(state: GameState, playerId: number): boolean {
  return state.turnEnded[playerId] === true;
}

/**
 * Is every seat finished? The condition the `endTurn` handler resolves the turn
 * on.
 *
 * It iterates `players`, not `turnEnded`, so a hand-edited save with a short or
 * over-long flag array cannot make an unfinished turn look finished. A game with
 * no players is never "all ended" — there is nothing to end.
 */
export function allTurnsEnded(state: GameState): boolean {
  if (state.players.length === 0) return false;
  for (const player of state.players) {
    if (!hasEndedTurn(state, player.id)) return false;
  }
  return true;
}

/**
 * Reopens every seat. Called once per turn, as the turn rolls over.
 *
 * Every seat *that is still in the game*: an eliminated player's flag is raised
 * again rather than cleared, so a wiped-out empire is permanently finished and
 * `allTurnsEnded` never waits for it. That is the whole of the "their turnEnded
 * is auto-true each turn" rule, written in the one place turn flags are reset —
 * so there is nothing for a later phase to forget.
 */
export function clearTurnEnded(state: GameState): void {
  // The wild joins the eliminated on the right-hand side of this line, and that
  // is the whole of "barbarians are auto-ended every turn": both are seats that
  // will never send an `endTurn`, so both are re-raised here rather than given a
  // rule of their own somewhere a later phase could forget it.
  for (const player of state.players) {
    state.turnEnded[player.id] = player.eliminated || player.barbarian;
  }
}

/**
 * Every seat that is somebody's empire — the roster with the wild left out.
 *
 * **The** register for "who counts": victory, the meters, the seat cycle, the
 * blockers, the median-tech tier the wild itself musters against, and every
 * report that says how the game is going all ask this rather than filtering
 * `state.players` themselves. One implementation, because the failure mode of a
 * second one is silent — a solo game that declares victory the moment the last
 * camp falls, or a happiness ledger with a line for the raiders.
 *
 * **The interface's rosters ask it too**, and they were the ones that had been
 * missed: the top-bar seat strip, the status line's waiting list, the Abacus's
 * rods and the hot-seat cycle all draw one row per seat, and every one of them
 * drew a row for the wild — a "Barbarians ✓" chip in the top bar of every solo
 * game, and a scoring rod for the weather. Anything with the shape "one thing
 * per player" belongs here whether it is a rule or a chip, which is what makes
 * a future seat kind that should not be listed (a city-state) an edit to this
 * one filter rather than an audit of two directories. The register of them is
 * `renderSeats`' docblock in `main.ts`; `test/ui/seatRoster.test.ts` reads the
 * sources and fails on a hand-rolled roster filter, because the failure mode of
 * a missed surface is a chip nobody notices for a milestone.
 *
 * In `state.players` order, which is the order everything else walks players in,
 * and it is a plain filter rather than a cached list because the roster is tiny
 * and a cache would be one more thing that can disagree with the array.
 */
export function realPlayers(state: GameState): Player[] {
  return state.players.filter((player) => !player.barbarian);
}

/** The wild's seat, or `undefined` in a world that has none. */
export function barbarianPlayer(state: GameState): Player | undefined {
  for (const player of state.players) {
    if (player.barbarian) return player;
  }
  return undefined;
}

/** Is this id the wild's? False for an id that names nobody. */
export function isBarbarian(state: GameState, playerId: number): boolean {
  return playerById(state, playerId)?.barbarian === true;
}

/** Linear scan by id; player counts are tiny and arrays keep order honest. */
export function playerById(state: GameState, id: number): Player | undefined {
  for (const player of state.players) {
    if (player.id === id) return player;
  }
  return undefined;
}

export function unitById(state: GameState, id: number): Unit | undefined {
  for (const unit of state.units) {
    if (unit.id === id) return unit;
  }
  return undefined;
}

export function cityById(state: GameState, id: number): City | undefined {
  for (const city of state.cities) {
    if (city.id === id) return city;
  }
  return undefined;
}

// --- the roster, read the two ways a sweep asks for it -----------------------

/**
 * Two readings of `state.cities` that live **here** rather than in `cities.ts`,
 * beside `cityById` and for its reason (2026-08-28).
 *
 * Both are pure functions of the roster and the parallel arrays this module
 * declares — no yields, no citizens, no queue — so neither ever needed the city
 * rules, and having them in `cities.ts` was what forced `empireGold.ts`' flood
 * fill to import the largest module in the simulation to find a capital. Moving
 * them made that file a leaf. `cities.ts` re-exports both, so every caller that
 * already asks it keeps asking it: this is a change of *home*, not of address.
 */

/**
 * Which of a player's cities is the capital: the oldest one they *founded*, or —
 * for an empire that owns nothing but conquest — the oldest one they hold.
 *
 * There was no capital in this game before Milestone 10, so this is the rule
 * being written rather than one being read, and it is written in one place so
 * that everything that ever asks (the palace's happiness, the palace's
 * authority capacity, the one city that costs no authority, the root of the
 * road connection fill) asks the same function.
 *
 * Oldest is `state.cities` order, which is founding order, which is id order:
 * ids are minted by a counter (see `state.ts`), so "the first city in the array"
 * is a fact about the state and not about the wall clock. Nothing is stored,
 * because nothing has to be — the answer is a pure function of the board, and a
 * stored `isCapital` would be a second thing to keep in step the day a city
 * changes hands.
 *
 * The founded-first rule is what makes a conquered palace mean something: take
 * an empire's first city and its capital moves to the oldest town it built for
 * itself, which is Civ's rule and the intuitive one. `captured` is sticky (see
 * its docblock), so a capital lost and won back does not resume the palace — the
 * empire has a new seat of government, and the old one is a prize.
 *
 * `undefined` for a player with no cities at all, which is every player on turn
 * one: a palace nobody has built supplies nothing, and the meters say so.
 */
export function capitalCityOf(state: GameState, playerId: number): City | undefined {
  let fallback: City | undefined;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (!city.captured) return city;
    fallback ??= city;
  }
  return fallback;
}

/**
 * **The towns this empire holds**, in `state.cities` order — which is founding
 * order, which is part of the state.
 *
 * Beside `capitalCityOf` because it is the same register read one question
 * wider, and here rather than in any of its callers because it had **four**
 * implementations before batch H6: `beads.ts` and `triumphs.ts` each kept a
 * private `citiesOf`, `statecraft.ts` kept a private `cityCount` that was this
 * loop with a counter instead of a list, and `resourceEffects.ts` kept a fifth
 * with a coastal filter on it. Two of them fed counts that two evaluators both
 * had to answer (`countOf`'s `cities` and `beadCount`'s `cities`), which is the
 * shape of duplication H6 is for: not two vocabularies, one reading written
 * out four times.
 *
 * A fresh array every call, because a caller that filtered a shared one would be
 * filtering the board.
 */
export function citiesOf(state: GameState, playerId: number): City[] {
  const held: City[] = [];
  for (const city of state.cities) {
    if (city.ownerId === playerId) held.push(city);
  }
  return held;
}

/**
 * **How many wonders stand in this empire's towns.**
 *
 * `citiesOf`'s reason exactly: `beadCount`'s `wondersHeld` and `countOf`'s
 * `wonders` were the same three nested loops in two files, and a wonder counted
 * one way for a feat and another for a card would be the kind of drift no test
 * asks about. A wonder is one per world, so the empire's own towns are the whole
 * of the question — and a captured wonder joins this count the turn the town
 * changes hands, which is the wonders framework's own rule (what a wonder *pays*
 * follows the stones).
 *
 * `age` narrows it to the wonders of one era, which is a bead's question and not
 * a card's; the era of a wonder is the tree's to answer, so the caller hands in
 * the reading rather than this leaf importing the tree. Absent counts them all.
 */
export function wondersHeldBy(
  state: GameState,
  playerId: number,
  ageOf?: (id: BuildingId) => number,
  age?: number,
): number {
  let held = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    for (const id of city.buildings) {
      if (!isWonder(id)) continue;
      if (age !== undefined && ageOf !== undefined && ageOf(id) !== age) continue;
      held += 1;
    }
  }
  return held;
}

/**
 * **How many Orders this empire has sitting in a chair.**
 *
 * The council, and the third reading two evaluators both kept (`countOf`'s
 * `slottedOrders`, `beadCount`'s). A card in the hand is not a law of the realm,
 * which is the whole of what a slot means — and it counted the *levels* of those
 * cards until the levelling ruling of 2026-09-04 emptied the word of meaning, so
 * a full council is a count of chairs.
 */
export function slottedOrderCount(state: GameState, playerId: number): number {
  const sc = playerById(state, playerId)?.statecraft;
  if (!sc) return 0;
  let filled = 0;
  for (const slotted of sc.slots) {
    if (slotted !== null) filled += 1;
  }
  return filled;
}

/**
 * Who owns each hex, read by **tile index** — the sweep's shape of the question
 * `tileOwnerPlayerId` answers by coordinate.
 *
 * `state.tileOwner` is a parallel array over `state.map.tiles` (`row * width +
 * col`, see the state's own docblock), so a loop that already holds an index
 * holds the answer's address too. `tileOwnerPlayerId` cannot know that: given a
 * col and a row it must wrap the column, find the tile, index the array, and
 * then scan `state.cities` for the city's owner — the right answer for a caller
 * that has coordinates and nothing else, and the wrong one four thousand times
 * in a row. That per-hex cost was 85% of end-of-turn resolution on a forty-city
 * empire, because the resource sweeps in `cities.ts` run about a thousand times
 * a turn.
 *
 * So the work is turned round: one pass over the *cities* — forty of them, not
 * four thousand hexes — into an id→owner lookup, and the sweep reads ownership
 * positionally. Unclaimed is the common answer and costs one array read.
 *
 * The `Map` is a **lookup, never an iteration**: nothing walks it, so no outcome
 * can depend on its order, and every list these sweeps produce still comes out
 * in `state.map.tiles` order exactly as before. A stale city id resolves to
 * `null`, which is what `cityById(...)?.ownerId ?? null` already said. See
 * `zocField` (`pathfind.ts`) for the same bargain one system over: a fact about
 * the whole sweep, resolved once, instead of re-derived per step.
 */
export interface TileOwnerField {
  /** The player owning the hex at this tile index, or `null` for unclaimed. */
  at(index: number): number | null;
}

/**
 * Hoists the owner reading for **one sweep**. See `TileOwnerField`.
 *
 * "One sweep" is the whole of its lifetime and it is not a soft rule: the
 * id→owner half is resolved here and now, so a field that outlived the loop that
 * built it would keep answering with a city list the state has moved past — a
 * town founded or captured since would read as unowned or as its old seat.
 * Nothing in the simulation holds one past its loop, and nothing should start
 * to: hoisting is cheap (one pass over `state.cities`) precisely so that the
 * answer to "is this still current" can always be "it was built this instant".
 */
export function tileOwnerField(state: GameState): TileOwnerField {
  const owners = new Map<number, number>();
  for (const city of state.cities) owners.set(city.id, city.ownerId);
  return {
    at(index: number): number | null {
      const cityId = state.tileOwner[index];
      if (cityId === null || cityId === undefined) return null;
      return owners.get(cityId) ?? null;
    },
  };
}
