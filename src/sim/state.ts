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

import { type BuildingId, isWonder } from "./buildingData";
import { type BeadCardId, type BeadFamily, type BeadKind } from "./beadData";
import type { ProjectId } from "./projectData";
import type { DiscoveryId, DiscoveryKind } from "./discoveryData";
import {
  FAMILIES,
  SPECIALIST_FAMILIES,
  type Family,
  type GreatPersonId,
  type SpecialistFamily,
} from "./greatPeopleData";
import type { TriumphId } from "./triumphData";
// The economy clock lives beside the slate rather than on the state (batch M2,
// `slate.ts`). That file is a true leaf — a type-only import of `GameState` and
// no runtime edge at all — so this edge cannot make a cycle from here either.
import { bumpEconomy } from "./slate";
import type { GameMap } from "./map";
import { generateMap, getMapSize } from "./mapgen";
import { type LeaderId, isLeaderId, leaderDecks } from "./leaderData";
import { type MapgenOverrides, resolveMapgenConfig } from "./mapgenData";
import {
  type BeliefId,
  type ConsecrationId,
  type PlayerPantheon,
  type RiteId,
  newPlayerPantheon,
} from "./religionData";
import { type Rng, hashSeed, makeRng, nextInt } from "./rng";
import { type CitizenFocus, RULES } from "./rulesData";
// Type-only, and deliberately: `wars.ts` imports *values* from this module, so
// an ordinary import here would be a runtime cycle. Nothing runs across this
// arrow — the two shapes are declarations — which is the documented exception
// (`statecraft.ts`/`religionData.ts` keep the same bargain).
import type { Truce, WarState } from "./wars";
// `deals.ts` keeps the same bargain, and for the same reason: it imports values
// from this module, so the two shapes it names here arrive type-only.
import type { DealProposal, DealState } from "./deals";
import {
  type PlayerStatecraft,
  cardBirthTimedEffects,
  cardExtraCharges,
  cardUnitStamp,
  newPlayerStatecraft,
  refitSlots,
} from "./statecraft";
// A value import as well as the types: `statecraftData.ts` is a runtime leaf
// (the JSON and its vocabulary) and imports this module not at all.
import {
  type CardEffect,
  type CardId,
  type DeckId,
  type FirstKind,
  type LevyUse,
  type OrderId,
  WORLD_FIRST_KINDS,
  isDeckId,
} from "./statecraftData";
import { chooseStartPositionsFor, planStartingUnits } from "./startPositions";
import type { TechId } from "./techData";
import {
  type UnitStamp,
  type UnitTypeId,
  unitDef,
  unitMaxHp,
} from "./unitData";
// The empire's live share of a piece's maximum health — iron's ten points (R2).
import { unitHealthBonus } from "./resourceEffects";
import {
  type CitySighting,
  newVisibilityGrid,
  recomputeAllVisibility,
  recomputeVisibility,
  recomputeVisibilityFor,
} from "./visibility";

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
 * carries. The tree came to 27401 beakers where it had been 35698 (batch B6 has
 * since re-cut it again; it is 68609 today).
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
 *
 * v99: **the palace pays a beaker, a note and six writ** (the user,
 * 2026-09-08: "lets have the starting palace supply 1 science and 1 culture";
 * "+6 starting authority. That way the player can settle 3 coastal or 2
 * regular cities without needing monuments"). The one "Palace" line in the
 * capital's list carries `palaceScience` and `palaceCulture` beside its coin
 * (`rules.cities`), staged like everything else the town banks; and the
 * palace's writ is six (`meters.authority.palaceCapacity`, was four). A v98
 * log does not replay: every capital researches and drafts a little sooner
 * from the first turn, the first technology lands on a different turn, and an
 * empire's third town no longer pays an overrun the old law charged.
 *
 * v100: **a route is hired with gold, and the sea pays more** (batch R1; the
 * user, 2026-09-09, `docs/flags.md` item (iii): "Instead of building traders,
 * lets have trade routes be purchasable with gold directly in the interface of
 * the trade screen"; and "sea routes should pay +50%"). A new command,
 * `buyRoute`, charges the treasury `routePrice` — the Trader row's own
 * converted production cost, `rules.trade.routePriceMultiplier` over it —
 * mints the caravan in the origin's gates and writes the route on it, gated by
 * the whole of `routeStartable` plus the purse. The Trader row leaves the build
 * queue and the purchase book with it (`UnitDef.routeOnly`), and a route run by
 * sea pays `rules.trade.seaYieldPercent` more as a line of its own fold. A v99
 * log does not replay: the caravan a seat used to queue is now a coin it
 * spends, every bot seat's purse and build order move with it, and a sea route
 * already running banks half again from the turn this lands.
 *
 * v101: **the world clock is the mean, and an age is given ten turns to close**
 * (batch G1; the user, 2026-09-08, `docs/wager.md` §1: "lets take the idea of a
 * global age (takes the mean of all players, with a 10 turn countdown for age
 * end)"). The first-seat rule is **retired**: `BeadTable.worldAge` — a stored
 * clock raised to the highest age any real seat had reached — is gone, and in
 * its place `GameState.ageClose` carries one absolute `{age, turn}` stamp off
 * which two readings are derived (`worldClock.ts`): `worldAge`, the mean of
 * every living empire's highest technology floored, and `currentWorldAge`, the
 * age the world is in. When the mean first crosses, the age it is leaving is
 * given `rules.wager.countdown` turns; at the close a new announced occasion —
 * `ageClosed`, the moment G2's wagers are judged on — fires for every seat and
 * the world enters the next age, which is when the deed tables turn over. The
 * last age has nothing above it and closes `rules.wager.lastAgeTurns` after it
 * opened, or the turn the Great Work is raised, whichever comes first.
 *
 * A v100 log does not replay. Every age now opens a countdown later than it did
 * and off a different reading, so a hand turns face up on a different turn, a
 * reckoning is taken on a different board, and the per-age counters the opening
 * resets are zeroed somewhere else entirely.
 *
 * v102: **the wager** (batch G2, `docs/wager.md` §2/§3/§5; the user,
 * 2026-09-08: "5 turns into each new age, players are shown three targets drawn
 * from a deck… Each player chooses one of the wagers"). Every age from the
 * second deals the whole world **three bars** out of `data/wagers.json`,
 * guaranteed to come from three different theme lines; every seat stakes one in
 * secret (`chooseWager`, an End Turn blocker on the deal turn, the phase's own
 * default for a chair nobody sat in); a card is claimed the turn a seat first
 * meets it and mints beads then — two for the card that seat staked, one for
 * either of the others — through four new repeatable grant rows, one per rod;
 * and at the age's close a seat whose own card is still unclaimed takes a
 * `pendingMalice`, which batch G3 turns into a card in a chair. New state:
 * `GameState.wagers` (append-only, one row per age, with every seat's opening
 * figures and every claim), `Player.wager`, `Player.wagerTotals`,
 * `Player.pendingMalices`, `Player.malices`, `Player.renownEarned`,
 * `Player.unitsKilled`/`unitsLost`, and `City.capturedOn`. A new `wagers` phase
 * runs between `worldClock` and `beads`, and a new announced occasion
 * (`wagerClaimed`) joins the union. The eight **reckonings** are retired
 * (`retired: true`): the wager is the age's snapshot now and it is taken for
 * everybody rather than paying the leader alone.
 *
 * A v101 log does not replay, for two reasons. The deal takes two rolls of
 * `state.rng` an age (a line, then a card inside it). And retiring the
 * reckonings takes four cards out of each age's deck, so the shuffle at
 * `newGame` spends fewer rolls and every draw in the game starts from a
 * different place — `drawAgeReckonings` still spends a roll a family over its
 * now-empty pools, deliberately, so that at least *that* much is unmoved and a
 * later reckoning-shaped row costs nothing to add back.
 *
 * v103: **crowding is removed, and the justices forgive the citizens** (batch
 * B7; the user, 2026-09-09, `docs/flags.md` item (kkk): "lets remove crowding
 * unhappiness altogether"). A town's happiness demand is `demandPerPop ×
 * charged citizens` and nothing else: the surcharge a town over a threshold
 * paid on top of its citizens is gone with its three rules
 * (`meters.happiness.crowdingWeight`/`crowdingFrom`/`crowdingExponent`), gone
 * from `explainHappiness`, from the founding preview, and from the puppet's
 * gain line — which now relieves the citizens alone. The Assize Court carried
 * the one `crowdingRelief`; the marker is retired for `demandRelief`, the same
 * fifteen read one cost line over, and the court's "the justices sit" line is
 * now a share of everything its town's citizens ask for.
 *
 * A v102 log does not replay. Every empire holding a town of eleven or more is
 * paying less for it from the turn this lands, which moves the happiness tier
 * it sits on, which moves every yield the tier scales, which moves growth,
 * research and the turn a bot seat decides it can afford one more town.
 *
 * v104: **the great-person pass** (batch GP1; the user, 2026-09-09,
 * `docs/flags.md` item (lll): "i massively buffed the great people, since
 * they're now much more rare"). The roster is re-cut against the doc's own
 * *Legacy* column: eight names are **retired** (`GreatPersonDef.retired`, the
 * row kept so a save holding that legacy still loads and out of every draw),
 * six are new — Gaius Marius, Willem Beukelszoon, Epicurus, Aristotle,
 * Maimonides, Roger Bacon — five move age, and a couple of dozen legacies are
 * retuned or rewritten in the existing effect vocabulary. Nothing on the state
 * shape moves: this is a data bump, and it is a bump because a **draw** is
 * state. `rosterOfAge` is the bag every offer is dealt from and it no longer
 * holds the retired rows, so every recruitment in a game deals a different hand
 * — and the rows were reordered into the doc's reading order besides, which
 * moves the weighted walk's own indices.
 *
 * A v103 log does not replay: the first great person of a v103 game is drawn
 * from a bag of eighty in one order and of seventy-eight in another, and the
 * offer's rolls diverge from there.
 *
 * v104 (with GP1): **the almoner's ledger** — `Player.goldSpent`, a whole
 * number raised at the five seams where a player's own act takes gold out of
 * the treasury for a thing (see the field). It rides the great-person pass'
 * bump rather than asking for one of its own: **GP1** moves the roster — eight
 * names retired, four added, five re-aged — and a changed roster changes the
 * draw, so the version was already going up in the same batch. The field is the
 * only state batch **GP2** adds; every other shape it builds is vocabulary, read
 * off rows and off the board.
 *
 * A v103 log does not replay under it, for GP1's reason and not for this
 * field's: a seat loaded from an older log simply starts its ledger at nought,
 * which is the honest reading of a record nobody was keeping.
 *
 * v105: **the malice deck** (batch G3, `docs/wager.md` §4; the user,
 * 2026-09-08: *"the malice be a card that must remain slotted in your government
 * with a malice effect"*). The half of the wager G2 recorded and did not pay is
 * built: at an age's judgement a seat whose staked bar went unmet is dealt a
 * card from `data/malices.json` by `state.rng`, never one it already holds, and
 * the world **seats** it — in the last chair of its flavour, turning whatever
 * Order sat there out into the hand with its seal broken and nothing refunded;
 * in a wildcard chair where the realm has none of that flavour; and, where a
 * realm has no chair at all, in a ninth chair nobody has, paying its effect all
 * the same (`HeldMalice.chair` absent). It cannot be unslotted — `slotOrder` and
 * `unslotOrder` refuse the chair in one plain sentence each — it stacks to
 * `rules.stack` (two, a third replacing the oldest), it survives an adoption and
 * re-seats itself into the new spread, and it leaves at the next age's judgement
 * if that age's stake is kept. A held malice is `liveEffects`' **eleventh**
 * source, credited to itself by name in every ledger it reaches, and `CardId`
 * gains its eleventh class. New state: `HeldMalice.chair`, and `Player.malices`
 * — declared by G2 and written by nothing — now written. A new announced
 * occasion, `maliceSeated`, joins the union.
 *
 * A v104 log does not replay. The judgement now spends a roll of `state.rng` for
 * every seat that missed its bar, so the first missed wager in a game moves
 * every draw after it; and from that turn the seat is paying an effect it was
 * not paying before, which moves its yields, its research and everything priced
 * against them.
 *
 * v106: **the census** (batch C1, `docs/wager.md` §10/§11; the user,
 * 2026-09-09: "every few turns, a notification is shown of every player's yield
 * of a major stat… I was imagining the notification would be a full modal, and
 * only take place every 15 turns or so"). Every thirteen to seventeen turns —
 * the gap drawn uniformly from `state.rng` at each census, so a seed is a
 * calendar — the world is measured on **one** figure out of a closed list of
 * thirteen, drawn from the same generator and never the same one twice running,
 * and every real seat is ranked on it. The seat at the head takes a repeatable
 * Triumph worth `rules.census.renown`, shown **inside the census sheet** and
 * never as a Triumph card of its own (the user: "let's not show both"). New
 * state: `GameState.census` (`nextTurn`, an absolute turn drawn at `newGame`
 * and again at every census, and `taken`, an append-only list of records) and
 * `Player.censusSeen` (the turn of the last census this seat acknowledged,
 * written by the new `dismissCensus` command — presence-is-state, absent means
 * none). A new `census` phase runs between `wagers` and `beads`, a new
 * announced occasion (`censusTaken`) joins the union, and `data/triumphs.json`
 * gains `censusLeader`.
 *
 * A v105 log does not replay. The first interval is drawn at `newGame` — after
 * the two decks are shuffled, deliberately, so the opening hands are exactly
 * the hands they were — and every roll after that point is one place along:
 * each census afterwards spends three more (the next gap, the figure, the
 * taker's name), so every offer, every raid and every draft downstream of the
 * first census lands differently.
 *
 * v107: **the waterline, and the taking of a town** (batch N1,
 * `docs/war-diplomacy.md` §5b; the user, 2026-09-09: "melee units should not be
 * able to attack boats from land… boats should take reduced damage from ranged
 * attacks from land… but should take increased damage from siege… Boats should
 * also take reduced damage when attacking embarked units, and embarked units
 * should not be able to attack boats. Also, a melee unit attacking and killing
 * the unit protecting a city should take the city"). Five rules, all of them in
 * `combat.ts` and three new numbers in `rules.naval`: a land piece that closes
 * may not attack a water hex and an embarked piece may not attack a ship (both
 * refused in `attackTargetAt`, so the tint, the forecast and the reducer say one
 * sentence); a land bow fights a hull at `landRangedVsShipPercent` and a land
 * siege engine at `landSiegeVsShipPercent`, attacker-side percentages on named
 * lines; a hull boarding a column at sea takes `embarkedCounterPercent` of the
 * counter; and a **melee blow that kills a town's garrison takes the town in the
 * same blow**, the winner walking in through `arriveOnTile`.
 *
 * No new state — every one of them is a rule read off the board — but **a v106
 * log does not replay**: battles resolve differently. A blow refused where it
 * used to land spends no dice at all, a shot at a hull rolls against a different
 * strength, and a garrison's death now ends a siege one blow earlier, so every
 * draw downstream of the first fight is one place along.
 *
 * v108 (batch Q1, `docs/flags.md` (nnn); the user, 2026-09-09: *"Could we remove
 * the table of the previous win conditions and remove it from our code? the
 * wager system seems way better to me."*): **the deeds retire**. Feats,
 * endeavours and quests were the old victory conditions and the wager replaced
 * them, so every row of the three carries `retired: true` — kept for the
 * Compendium's record, dealt to nobody — beside the eight reckonings that went
 * this way in G2 and the four Æra V bead Orders, whose grants go with the cards
 * that minted them. `BeadTable` loses `decks`, `hands` and `streaks` and is the
 * world's register alone; `BeadCard` is gone with the table it sat on; the
 * `beads` phase is gone from `END_OF_TURN_PHASES`, because a phase that dealt a
 * card, swept a count and kept a streak book has none of the three left to do.
 * `rules.handSize` and `rules.dealEveryTurns` leave `data/beads.json` and
 * `rules.threshold` is re-cut on the bench for a world with no deeds in it.
 *
 * A v107 log does not replay. `newGame` drew four reckonings and shuffled two
 * decks off `state.rng` and now draws nothing at all, so every generator-fed
 * decision in the game — the first great person offered, the first Order dealt,
 * the malice — moves by the rolls the deal used to spend.
 *
 * v109 (batch U9, `docs/flags.md` (ttt); the user, 2026-09-10: *"There should be
 * a larger gap between units in combat strength … i'd love for the fire lancer
 * to end as an 80 strength unit"*): **the strength ladder**. Every
 * `combatStrength` and `rangedStrength` in `data/units.json` is re-cut on Civ 6's
 * magnitudes — the curve here has always been Civ 6's (`baseDamage` 30 ×
 * e^(0.04 × difference)), so a gap of ten is half again the damage and a gap of
 * thirty is a kill, and the old figures were packed too tightly for either to
 * mean anything. With them go every flat line that shares the ledger: terrain,
 * fortification, the general's aura, the walls, the naval column, the citadel,
 * and every card, belief, rite, wonder and great person that adds strength
 * points. The Cataphract's row retires with the ladder (no node has opened it
 * since tree revision 4).
 *
 * No new state again — a strength is a data figure and none of it is stored on a
 * piece — but **a v108 log does not replay**: every battle rolls against
 * different numbers, so the damage, the deaths and the dice spent after the
 * first blow all move.
 *
 * v110 (batch T5, the user's tree pass — `docs/flags.md` (uuu), 2026-09-10:
 * *"could you fold in my changes to the tech tree"*): **eleven marks, and a
 * replay's yields move on every one of them.** The Barracks, the Stable and the
 * Shipyard hurry a quarter rather than a tenth and each now names *which*
 * soldiers; the Lighthouse and the Harbour trade a food line for a coin and a
 * seam; two new buildings stand (the **Garden** at Irrigation, the **Public
 * Bath** at State Workforce); Satrapies stops keeping a wide realm's roads for
 * nothing; Daughter Cities pays the carts that never leave the realm; The Saddle
 * pays beakers and songs for a burnt field. And **Raised Fields is gone** — the
 * id leaves `TechId`, so a v108 log that researched it is refused rather than
 * replayed against a tree without it, exactly as v44's re-cut refused one that
 * named Drama. **The Silk Road** stands in its slot, at its column, off its
 * prerequisite, with Shipwrights still chaining off it; it carries the
 * Caravanserai down from Mathematics, pays a caravan that ends abroad, and
 * lends the empire one luxury from every foreign market it reaches, at half
 * (`rules.trade.importedLuxuryPercent`). The Floating Gardens move to Irrigation
 * with the water that grows them.
 *
 * v111 (batch S2, `docs/flags.md` (www); the user, 2026-09-10: *"the pool of
 * yields shouldn't swap over when reselecting something … swapping to a
 * different tech shouldn't allow you to keep your technology progress on the
 * new tech, same for production"*): **beakers and hammers are committed to the
 * thing they were spent on.** A pool used to follow the aim, so switching
 * research or re-heading a queue carried every banked point along with it and
 * cost nothing. Progress is now **kept with the thing** and neither carried nor
 * lost: `Player.techProgress` parks the beakers banked toward a technology the
 * empire has aimed away from, `City.itemProgress` parks the hammers banked
 * toward a queue row that is no longer at the front, and returning to either
 * finds it exactly where it was left. Overflow still follows the *queue* —
 * what is left after a thing completes was never toward that thing — and the
 * turn's own spend is still committed at the end of turn. **The Vizier's Hall**
 * stands with the rule (`BuildingDef.queueFloor`): a town that holds it may not
 * be left with fewer than two rows to build, and it makes half again as many
 * hammers while it has them.
 *
 * A v110 log replays identically **except where a seat changed its mind**: a
 * `chooseResearch` that moved the aim, a `setCityProduction` that re-headed a
 * queue, or a `dequeueResearch` that dropped the head now leaves the old
 * thing's progress behind rather than handing it to the new one, so every
 * completion after that moment lands on a different turn.
 *
 * v112 (batch F2, the user's ruling of 2026-09-10 — `docs/flags.md` (bbbb):
 * *"Prophets should have only two charges … Proclamations and empire-wide rites
 * each take 1 charge. Founding a religion creates a holy site and consumes two
 * charges. Drawing a new belief costs two charges."*): **a price on every one of
 * a prophet's acts**, in `rules.religion.prophetCosts`, read in one place
 * (`chargeCostOf`) and spent in one (`spendCharge`). No new state — a charge has
 * always been a number on the piece — but **a v111 log does not replay**: a
 * prophet that had spent a charge speaking could found a faith or draw a belief
 * before this, and is refused now, so a log whose prophet did that diverges at
 * the command and every draw after it moves with the generator.
 *
 * v113 (batch L2a, `docs/flags.md` (dddd) and (xxxx); rewritten for the second
 * cut, batch L6a, 2026-09-12): **a leader is two abilities, a unique unit and a
 * unique building.** `data/leaders.json` carries, per figure, a pair of
 * `abilities` — ordinary card effects, live for the seat from the turn it sits
 * down and for the rest of the game — and the ids of the one soldier and the one
 * building that figure alone may raise, beside its colours, its towns and its
 * start bias. One field joins the seat: `Player.leader`, the runtime copy of the
 * spec's figure. Both abilities join `liveEffects` as its twelfth source; a
 * unique's row carries `unlockedByLeader` and is opened for the figure's seat by
 * `isUnlocked` once the row's own technology has come — no age machinery, no
 * offer, no pick.
 *
 * The first cut's draft is **retired with the deck**: there is no
 * `Player.leaderPicks`, no `Player.leaderOffer`, no `chooseLeaderCard` command,
 * no `leaders` phase and no End Turn blocker. Nothing of it ever landed on a
 * saved game — the schema stayed at 115 through the whole of it — so a v115
 * config naming a figure replays byte for byte here: the fields are simply not
 * written, and a seat under a figure now owes no decision it did not owe before.
 * A roster naming no figure is untouched either way.
 *
 * v114 (batch X14, `docs/flags.md` (gggg); the user, 2026-09-10: *"units set on
 * auto-explore should use all of their movement"*): **a ranging piece marches,
 * not steps.** `marchExplorers` re-aims and walks again on the same turn's
 * points until the allowance is spent, the road is jammed, or there is nothing
 * left to see — the seat's fog recomputed between legs so the search reads the
 * ground the piece has just lit. No new state, but **a v113 log does not
 * replay**: an explorer that walked one hex a turn now walks two or three, so
 * every hex it claims, every camp it burns and every unit it meets happens on
 * a different turn, and the resolution order moves with it.
 *
 * v115 (batch P3, `docs/flags.md` (hhhh); the user, 2026-09-10: *"purchased
 * units should spawn on the city tile. If a unit of it's type is already
 * occupying the city tile, it should block purchasing"*): **a bought unit
 * stands on the city hex, or is not sold.** `spawnTileFor`'s walk stops at the
 * centre for a purchase (`onCityHexOnly`) and `purchaseError` refuses, naming
 * the piece in the way, before any coin moves; a *built* unit keeps its spill
 * to a neighbour. No new state, but **a v114 log does not replay**: a purchase
 * made into a garrisoned town was accepted then and is refused now, and the
 * bots step their garrison aside before buying — two commands where there was
 * one.
 *
 * v116 (batch L8, `docs/flags.md` (bbbbb); the user, 2026-09-14, playtesting
 * Pachacuti: *"originally, i was imagining that terraces would be a unique
 * farm, not a building in the city. It would have +1 food compared to a regular
 * farm, and could be built adjacent to mountains"*): **the Terraces are a field,
 * not a hall.** The building is `retired` — kept, like every withdrawn row, so a
 * save that raised it still replays and a copy already standing keeps paying —
 * and its `townTerraces` hills waiver is gone from the farm with it. In its
 * place `data/improvements.json` carries a `terraces` row: the farm's terrain,
 * features and worker charge, two food where a farm pays one, no
 * `requiresHills` at all, and `mountainFoot` — the fourth seam in the constraint
 * shape, which forgives a row its water on any hex a peak stands beside.
 * `countsAs: 'farm'` is what keeps every rule already written true of it, read
 * through `improvementCountsAs` and never by a name. A figure's second unique
 * may now be a **work of the ground**: `LeaderDef.improvement` beside
 * `building`, one of the two and never neither, gated by
 * `leaderOpensImprovement` exactly as the soldier and the hall are gated.
 *
 * No new state — a figure's uniques are read off `data/leaders.json` and never
 * written into a game, and `Tile.improvement` was always the field that holds
 * this. But **a v115 log does not replay**: the row did not exist, so a
 * `buildImprovement` naming it was refused where it is now accepted, a hillside
 * and a dry mountain foot that took nothing now take a terrace, and the Terraces
 * queued as a *building* in a town — which a v115 Inca player could do — is
 * refused where it was built, so every hammer after it lands somewhere else. A
 * v115 log that neither queued the hall nor cut a terrace replays byte for byte.
 *
 * **Still 116, with one more field** (2026-09-15, `docs/flags.md` (ggggg); the
 * user: *"the game should allow razing cities that aren't original
 * capitals"*): `City.originalCapital`, written at founding on an empire's
 * first town, is what razing refuses now — `wasCapital` (every seat that ever
 * fell) is the bead's alone. A v116 log replays byte for byte: the field is
 * derived at founding on replay, and a raze the old rule refused never reached
 * a log. The snapshot print gains the key on every empire's first town.
 *
 * **Still 116, and no new field at all** (2026-09-15, `docs/flags.md` (ooooo);
 * the user: *"units should be able to 'move past' units that are blocking
 * them… Units should not exert ZOC if you're not at war with them. Moving a
 * military unit onto another should 'swap' the two unit's positions"*): three
 * movement rules, all of them about who is in the way. A piece of a seat this
 * empire is not at war with is **passed through** rather than walked around
 * (`canTransit` admits it, `canStopOn` still refuses it); the zone of control
 * counts **only seats at war** (`zocField`); and a soldier ordered onto one of
 * its own seat's soldiers **trades places** with it when both walks fit the turn
 * (`planSwap`, carried by `moveUnit` — no command was added, which is why the
 * version did not move).
 *
 * **A v116 log replays, and the games it describes may end differently.** No
 * refusal became an acceptance for any command a v116 log can hold — a
 * `moveUnit` onto a friend's hex was refused by every version of these rules
 * there has ever been, so no log contains one — but a march *stored* under the
 * old rules is walked under the new ones: a column that halted behind a
 * neighbour's spearman now files past it, and one that paid a picket's toll at
 * peace now does not. Every seat re-decides from the board it is handed, so the
 * bots take different roads from the same seeds and the 120-turn digests moved
 * with them (re-taken in `test/sim/explore.test.ts`, with the measurement in
 * their docblock). Nothing about the *shape* of a save changed.
 *
 * **Still 116, and nothing moved** (2026-09-15, `docs/flags.md` (ppppp); the
 * user: *"players should be identified by their leader choice — let's retire
 * the color naming scheme unless the user has selected no leader"*): a seat is
 * called by its figure now, and its country by the figure's people, but that is
 * a *reading* over the state and not a field in it. `seatName` / `seatPeople`
 * (`leaderData.ts`) answer off `Player.leader`, which a game has carried since
 * v112; `Player.name` still holds exactly what the config wrote and a save still
 * carries exactly that word. No command changed, no refusal changed its shape,
 * and a v116 log replays byte for byte — the sentences the interface prints over
 * it simply say "the Inca" where they said "the Crimson".
 *
 * v117 (batch S2, `docs/flags.md` (bbbbbb); the user, 2026-09-15: *"lets get
 * working on each of these things"*, over V1's own sacrifice): **the deck keeps
 * a lifetime tally.** `PlayerStatecraft.yieldTallies` — one row per card that
 * has ever paid, six voices each (`CardYieldTally`, `draft.ts`) — is added to
 * once a turn at the head of the `collectYields` phase by `recordDeckTally`
 * (`ledgerFold.ts`), from the Ledger's own per-card reading of the statecraft
 * class (`explainDeckLedger`), and written by nothing else. The Ledger's third
 * band prints it per card, and the six statecraft lines of the score read its
 * fold in place of the current turn's pay. No rule of play moved and no command
 * changed: **a v116 log replays**, and the replay writes the tally from its
 * first resolution, so a save — which is a config and a log — arrives with the
 * tally it would always have had. The one migration sentence is for a state
 * *restored from a print* rather than replayed: a pre-117 snapshot has no
 * `yieldTallies` key, every reader takes `?? []` for it, and the writer opens
 * the list on the next turn — zeroed tallies, in other words. The snapshot
 * print gains the key on every seat.
 *
 * v118 (batch B1, `docs/flags.md` (aaaaaa); the user, 2026-09-15: *"the
 * specificity of our cards, and how it's difficult to find the card you're
 * looking for with our long spans of time between drafts, and how expensive
 * re-rolls are"*): **two changes to the draw, none to a card**. Four were
 * ruled; two — a line to follow, and a card held back from a passed hand — were
 * dropped by the user before landing, for the separate-decks rework of the
 * pool, and nothing of either shipped. (1) `rerollsTaken` is **zeroed by
 * adoption** (`adoptGovernmentAt`, the one writer of adoption) — the reroll's
 * ladder starts again under every new government; the field was a lifetime
 * count from v71 to here. (2) **A flatter meter**: `meter.costExponent` 2.65 →
 * **2.2**, `costLinear` and `costBase` untouched, so the ladder is
 * `12 + 5n + n^2.2`. Measured in a headless six-seat bot game (seed 20260915,
 * standard map, barbarians on, driven to turn 160), drafts taken per seat,
 * mean of six — today's 12 + 5n + n^2.65: **11.0 by t100, 17.5 by t160**, the
 * first three drafts landing on turns 8 / 15 / 26; candidates 4 + n^2.15:
 * 14.5 / 26.3 (8 / 15 / 24); **5 + n^2.2: 14.2 / 26.5 (8 / 15 / 25)**;
 * 5 + n^2.1: 15.0 / 28.8; 5 + n^2.0: 16.8 / 31.5. The pair landed is the one
 * nearest one and a half times the drafts by t160 with the opening cadence
 * kept — its first three rungs are 12 / 18 / 26 against today's 12 / 18 / 28,
 * and the twentieth draft costs 757 culture where it cost 2554. The number is
 * the user's to re-rule after playtesting the feel; the table is repeated in
 * `docs/orders-and-doctrines.md` under "The draft pass".
 *
 * No field joined or left the player. **A v117 log does not replay**: every
 * draft from the third is priced off a different curve, so the meter fills on
 * different turns and every hand after it is a different deal. 117 is S2's,
 * the lifetime tally, taken in the same batch.
 *
 * v119 (the decks rework, batch D1a on branch `decks` —
 * `docs/plans/decks-rework.md`, ruled `docs/flags.md` (iiiiii); the design of
 * record is `docs/six-decks-first-cut.md`): **the card system learns decks.**
 * Four fields join the seat: `Player.decks` (the figure's two, all six for the
 * rainbow and for a seat under nobody), `charteredTechs`, `charteredBuildings`
 * and `charteredRites` (what a charter's pick has opened; three lists that only
 * grow). Two join the deck: `PlayerStatecraft.rewardHands` (the rare-only
 * reward hands banked at regular draft counts 4 / 18 / 29, as absolute counts)
 * and `pendingReward` (one of them opened and on the table). `slots` is a flat
 * list of universal chairs — 3 / 4 / 6 / 9 by the government's tier, the M/E/W
 * spread retired — and a government offer's `tier` is unchanged. Every
 * pre-rework Order and Doctrine row is `retired: true` and deleted from
 * nothing; every row carries `decks` and `band`; the draw is rarity-first
 * (60 / 30 / 10) into positions the seat's decks and the draft count decide,
 * and an exhausted pool charges nothing. Three commands join the log
 * (`openRewardHand`, `chooseReward`, `passReward`).
 *
 * **A v118 save is refused and does not replay** (`loadGame` tests the
 * schema for exact equality): every hand from the first is a different deal —
 * a different pool, a different draw, different chairs to seat it in — so a
 * v118 command log would pick indexes into hands this build never dealt. Nothing
 * migrates; the branch starts its saves afresh, which is what a playtest branch
 * is for.
 *
 * v120 (the decks rework, batch D2c on branch `decks` — occasions): **the world
 * writes down what was done first.** One field joins the world —
 * `GameState.firsts`, the append-only ledger of first-of-a-kind records
 * (`FirstKind`, written only by `markFirst`) — and one joins the deck,
 * `PlayerStatecraft.riderTurns`, the absolute turn each once-a-turn windfall
 * rider last rode. Three moments join `TallyOccasion` (a kill, a unit trained, a
 * camp burnt out — a town grown was written up and deliberately not built, see
 * `TallyOccasion`'s own note) and two counts join `CountKind` off the new
 * ledger; a windfall grant may be a share of the occasion's own facts
 * (`OccasionMeasure`), capped by `WindfallGrantSpec.max`.
 *
 * **A v119 save is refused and does not replay**, and this is a bump *within*
 * the branch rather than one over `main`: a v119 log replayed against these
 * rules would pay different windfalls from the first kill and count different
 * tallies from the first muster, so the state it reached would not be the state
 * it recorded. D1a's paragraph above says why the branch migrates nothing, and
 * the same answer holds — the playtest starts its saves afresh.
 *
 * v121 (the decks rework, batch D2d on branch `decks` — the age stamp): **three
 * things now remember when they were placed.** `City.buildingTurns` is the turn
 * each of a town's buildings joined it, written only by `addBuilding`;
 * `Tile.improvedOn` is the turn the work standing on a hex went up, written only
 * by `raiseImprovement` and cleared only by `razeImprovement` (`map.ts`); and
 * `TradeRoute.startedTurn` is the turn a road opened, written only by
 * `startRouteAt` and never rewritten by a renewal. Every one of them is an
 * **absolute turn compared against `state.turn`** — `TimedEffect.expiresTurn`'s
 * discipline — so nothing anywhere ticks. The vocabulary that reads them is
 * `standingTurns` on three `CityScope`s and on the route `pays`, and
 * `TileCondition`'s `standingSince`.
 *
 * **A v120 save is refused and does not replay**, and this is again a bump
 * *within* the branch rather than one over `main`: a v120 log carries no stamps
 * at all, so every card written on an age would answer "not old enough" forever
 * and the state it reached would not be the state it recorded. The branch
 * migrates nothing, for D1a's stated reason.
 *
 * v122 (the decks rework, batch D2e on branch `decks` — the bilateral grant and
 * the trading post): **a town remembers whose traders keep a house in it.**
 * `City.posts` is the one new field: a list of `CommercialPost` records, one per
 * empire that has traded here, each carrying the absolute turn that empire's
 * unbroken trading presence in the town began. A post is *established* once that
 * presence has lasted a full route term (`rules.trade.routeTurns`), and an
 * established post is permanent — war, capture and cancellation never remove
 * one. Only the writers in `trade.ts` touch the list, and nothing ticks: the
 * ripening is `state.turn - since >= term`, an absolute turn compared, exactly
 * as v121's stamps are.
 *
 * Beside it the card vocabulary gains the other half of the batch,
 * `CardPaysEffect.payee`, which is how a card may pay an empire that is not the
 * one holding it.
 *
 * **A v121 save is refused and does not replay**, for v121's own reason one
 * paragraph up: a v121 log carries no posts, so every card written on one would
 * answer "no house here" forever. The branch migrates nothing.
 *
 * v123 (the decks rework, batch C8 on branch `decks` — provenance on a shelf):
 * **a town remembers which bank paid for each of its buildings.**
 * `City.buildingBanks` is the one new field: for each building bought at the
 * till, which currency bought it. It is written only by `addBuilding`, beside
 * the date v121 added, and it records nothing at all for a building that was
 * completed in the queue, granted by a card or laid as a relic — absence is
 * "nobody bought this", which is the common case and the shape every town from
 * before the field already has.
 *
 * The field exists because provenance cannot be recovered afterwards: by the
 * turn after a purchase a bought library and a built one are identical, and The
 * Endowment pays for one and not the other.
 *
 * **A v122 save is refused and does not replay**, for the same reason as every
 * bump on this branch: a v122 log carries no banks, so a card written on one
 * would answer "nothing here was bought" forever. The branch migrates nothing.
 *
 * v124 (branch `decks`; the user's ruling of 2026-10-13 in
 * `docs/decks/deck-design.md`, "Only the current band is dealt"): **a draft
 * hand is dealt only from the seat's current band**, the highest band open to
 * it on both the ladder tier and the research age (`currentBand`,
 * `statecraft/draft.ts`). Earlier bands are no longer dealt once a later one
 * opens; cards already held keep their chairs. The exhaustion check now reads
 * the bag at the waiting draft's own count, the count the hand is dealt at. No
 * field joined or left the state.
 *
 * **A v123 save is refused and does not replay.** From the first hand dealt
 * after a seat's second band opens, the bag is smaller, so the same roll picks
 * a different card and a v123 log's `chooseOrder` index would name a card this
 * build never dealt. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v125 (branch `decks`; batch WC1, `docs/flags.md` (rrrrrr) part 1): **a town
 * taken by force enters unrest.** `City.unrest` is the one new field, absent on
 * every town that is not in unrest. While it stands the town makes no
 * production, science or culture and its borders do not grow; a new `unrest`
 * phase fills its pacification each turn and raises a rebel from an unguarded
 * town every third unguarded turn. The Courthouse gains the `easesUnrest`
 * marker, `rules.war.unrest` holds every figure, and the town's yield sequence
 * gains a thirteenth step, the unrest gate.
 *
 * **A v124 save is refused and does not replay.** From the first capture on, a
 * v124 log's taken town would bank hammers, beakers and culture this build
 * withholds, and a rebel would roll dice the v124 game never rolled. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v126 (branch `decks`; batch WC2, `docs/flags.md` (rrrrrr) part 2): **losing
 * a war costs happiness.** `Player.warLosses` is the one new field, absent
 * until an empire first loses a unit or a town to another empire. Each record
 * is a loss stamped with its turn and the empire that caused it. War weariness
 * against one enemy is the losses suffered to it over the last
 * `rules.war.weariness.windowTurns` turns minus the losses inflicted on it over
 * the same turns, never below zero, with a town worth `townLoss` units. It is
 * one cost line per enemy in the happiness list. The `settleDiplomacy` phase
 * now also prunes records that have left the window.
 *
 * **A v125 save is refused and does not replay.** From the first unit lost in
 * a war on, a v125 log's empire would be happier than this build makes it, so
 * its towns would grow on turns this build holds them back, and the bots would
 * weigh peace differently. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v127 (branch `decks`; batch WC3, `docs/flags.md` (rrrrrr) part 3): **units
 * earn ranks in combat.** `Unit.experience` is the one new field, absent until
 * a unit earns its first experience. A unit gains `rules.combat.ranks.survive`
 * for each fight it lives through and `kill` in place of that for a fight in
 * which it destroyed the unit it fought, attacking or defending. It is a
 * Veteran from 4 experience and Elite from 10, and the rank is one flat
 * strength line on the combat ledger (+3 and +6). Fights with the barbarians
 * can take a unit to Veteran and no further, and barbarian units earn nothing.
 * The strength line a card's stamp adds is now labelled "Training", because
 * "Veteran" names the rank.
 *
 * **A v126 save is refused and does not replay.** Once any unit reaches
 * Veteran, a v126 log's copy of it fights weaker than this build makes it, so
 * its fights end differently and a later command can name a unit that is no
 * longer where the log expects it. The branch migrates nothing, for the reason
 * given under v119.
 *
 * v128 (branch `decks`; batch D0 of `docs/plans/chairs-build.md`, the Dominion
 * cards that need no new shape): **fourteen cards join the decks, seventeen
 * change, and three are retired.** No field joined or left the state. The
 * Dominion file gains thirteen rows, and the shared file gains Carried-Off
 * Scholars and The Muster of the Fields, which moves out of the Expansionist
 * file under its own id and now needs a town of five citizens. The sheet's
 * three cut cards (Defensive Lines, Arsenals and Naval Supremacy) are retired.
 * Among the changed cards: Battle Honours becomes a commission, The Camp
 * Chaplains pays on kills, Songs of the Fallen pays every loss, The Pacified
 * Marches counts the camps cleared this game, and Martial Law moves to Tier I.
 * The user's rulings of 2026-10-16 are part of the same version: a unit raised
 * by The General Levy now pays the cards that pay for a unit gained (it still
 * does not count as trained), a second declaration of war restarts The
 * Arrière-ban's ten turns instead of stacking, and Walled Towns counts any
 * defensive building, the Palisade included.
 *
 * **A v127 save is refused and does not replay.** The draft bags hold
 * different cards, so the same roll deals a different hand and a v127 log's
 * `chooseOrder` index would name a card this build never dealt, and a card a
 * v127 game held pays differently here. The branch migrates nothing, for the
 * reason given under v119.
 *
 * v129 (branch `decks`; batch C2a of `docs/plans/chairs-build.md`): **chairs
 * have types again.** No field joined or left the state. In the data, each
 * government row's `chairMix` replaces its old `slots`: a mix of Military,
 * Economic, Civic and Wildcard chairs that adds up to the rung's chairs
 * (`docs/plans/doctrines-governments-chairs.md` section 4), and every chair
 * beyond the mix is a Wildcard chair. A typed chair takes a card of its own
 * type or an unsorted card, a Wildcard chair takes any card, and a Wildcard
 * card fits only a Wildcard chair (`orderFitsSlot`). Adopting a government now
 * re-seats the cards already seated (`reseatOrders`) where it used to empty
 * every chair: a card whose chair still exists and still fits it keeps that
 * chair, and the rest move to free chairs that fit them. Imperium, the
 * Merchant League and Divine Mandate count seated Orders by type (Divine
 * Mandate counts Civic ones now), and an unsorted card counts as the type of
 * its chair, a Wildcard chair included. The Empire, The Commonwealth and The
 * Magisterium are retired, so nobody is offered a government at draft 38.
 *
 * **A v128 save is refused and does not replay.** A v128 log can seat a card
 * in a chair this build refuses it, its adoptions emptied councils that this
 * build keeps seated, and a seat that reached draft 38 adopted a government
 * this build never offers. Each of those changes what the seat holds from that
 * command on. The branch migrates nothing, for the reason given under v119.
 *
 * v130 (branch `decks`; batch D1 of `docs/plans/dominion-build-triage.md`,
 * ranks: earning them): **eleven Dominion cards that give units experience or
 * pay when a unit earns a rank.** Nine join the Dominion file and two take over
 * existing rows: The Training Cadre replaces Drill Manuals and Honours of the
 * Legion replaces The War Hall Schools, each keeping its id. One field joins
 * the state: `Player.ranksEarned`, the number of ranks the empire's units have
 * ever earned, absent until the first and raised only by `settleRanksEarned`
 * (`cities.ts`). The rules that change:
 *
 *   · experience no longer comes from fighting alone. A new end-of-turn phase,
 *     `drill`, runs after `muster` (The Drill Grounds, The Regimental Schools,
 *     The Tactica); a unit gained in a town can start with experience or a
 *     rank (The Training Cadre, The Drill Masters, and The Devshirme's levy);
 *     and a town founded beside a military unit can make it a Veteran (The
 *     Armed Colony). Civilians and barbarians still earn nothing;
 *   · earning a rank is a moment the cards pay on: the `rankEarned` windfall
 *     occasion and tally, and the `ranksEarned` count over the new record;
 *   · two cards may grant one levy use, and the row that governs it in a town
 *     is chosen by the town (`levyGrantFor`, `levies.ts`).
 *
 * **A v129 save is refused and does not replay.** The draft bags hold
 * different cards, so a v129 log's picks would name cards this build never
 * dealt, the new phase raises the revision once more every turn, and a unit
 * that earns a rank writes the new record. The branch migrates nothing, for the
 * reason given under v119.
 *
 * v131 (branch `decks`; batch C3 of `docs/plans/chairs-build.md`): **Doctrines
 * come with a government, and the reward hands go.** Two fields leave the
 * state: `PlayerStatecraft.rewardHands` and `PlayerStatecraft.pendingReward`,
 * with the three commands that used them (`openRewardHand`, `chooseReward`,
 * `passReward`). One command joins: `skipDoctrineOffer`, which passes on a
 * Doctrine offer. Adopting a government now opens a Doctrine offer of that
 * government's tier (tier 4 offers the Tier I Doctrines, tier 10 Tier II, tier
 * 18 Tier III and tier 29 Tier IV), drawn from the seat's two decks: one from
 * each deck, then a third from either. A Doctrine already held is never
 * offered again, and with nothing to offer no offer opens. A waiting Doctrine
 * offer must be answered before another government is adopted. A deck's
 * Doctrines live in its file's new `doctrines` map; the first is Dominion's
 * The Steppe Confederacy, and with it the border freeze's exemption
 * (`meterRule` `borderFreezeExempt`) lifts the freeze's own line and lets a
 * border claim, where before it only cleared the flag.
 *
 * **A v130 save is refused and does not replay.** A v130 seat carries the two
 * reward fields this build no longer reads, a v130 log may name the three
 * reward commands this build refuses, and from the first adoption on this
 * build deals a Doctrine offer the v130 game never dealt, which spends
 * randomness and blocks the turn until it is answered. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v132 (branch `decks`; Dominion batch D2 of
 * `docs/plans/dominion-build-triage.md`, ranks read, and combat rules): **nine
 * Dominion cards that read a unit's rank or change a rule of combat.** Seven
 * join the Dominion file. The Soldiers' Purse is reworked, and The Marching
 * Camps takes over March Discipline's row and keeps its id. One field joins
 * the state: `Unit.firstAttackTurn`, the turn an Elite under The Varangian
 * Guard made the first of its two attacks. Only `applyCombat` writes it. It is
 * compared against `state.turn`, never reset, and absent in any game without
 * the card. The rules that change:
 *
 *   · a card can read a unit's rank: a combat condition (`hasRank`), a
 *     narrowing on a unit stat and on a flag rule (`rank`), a town scope
 *     (`garrisonRank`) and an upkeep rebate for each rank (`perRank`);
 *   · four new behaviour rules: an attack keeps fortification, a land unit
 *     may move after attacking, an Elite may attack twice, and a siege unit
 *     takes a town's walls to the floor in one blow;
 *   · a combat condition for a unit that has not moved this turn (`unmoved`);
 *   · every write of a unit's experience is announced on the economy clock,
 *     because a town scope now reads it.
 *
 * **A v131 save is refused and does not replay.** The draft bags hold
 * different cards, so a v131 log's picks would name cards this build never
 * dealt. The branch migrates nothing, for the reason given under v119.
 *
 * v133 (branch `decks`; Dominion batch D3 of
 * `docs/plans/dominion-build-triage.md`, pillage and grant delivery): **nine
 * Dominion cards about pillaging and about where a grant lands.** Eight join
 * the Dominion file, and Armoury Guilds is reworked in place. One field joins
 * the state: `Player.hexesPillaged`, the number of hexes the empire's units
 * have pillaged in the game. Only the pillage verb writes it (`payPillage`,
 * which only `pillageAt` calls, in `improvements.ts`). The wild never writes
 * it, and it is absent until the first pillage. The rules that change:
 *
 *   · a pillage tells its riders which unit type did it, counts a tally
 *     (`hexPillaged`) and keeps the record above. Because the raider is now
 *     named, the Mandekalu's own salvage rider (`data/units.json`) pays. It
 *     never paid before;
 *   · a pillage rider can heal the raider fully, strike the enemy towns near
 *     the hex, put an ungarrisoned enemy town beside the hex into unrest
 *     (`startUnrest`'s second caller), and spread the pillage to the enemy
 *     improvements beside the hex. Each extra hex is a full pillage;
 *   · a strike (`strikeTownsNear`, `combat.ts`) takes one roll from
 *     `state.rng` for each town it hits, in founding order;
 *   · a grant's food and production can go to the capital, to every town, or
 *     to the nearest town that a scope admits;
 *   · the food and production that a pillage's riders pay settle at once.
 *     Before, Spoils of War's production waited for the end of the turn.
 *
 * **A v132 save is refused and does not replay.** The draft bags hold
 * different cards, and every pillage now writes the new record. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v134 (branch `decks`; Expansionist batch E0 of
 * `docs/plans/expansionist-build-triage.md`, the types and the data): **the
 * Expansionist deck is sorted, and the cards that need no new shape are
 * built.** No field joins the state and no rule changes. What changes:
 *
 *   · every Expansionist row on the deck's sheet carries the sheet's type, and
 *     so do the nine shared rows its shared table lists that had none. An
 *     Expansionist card now fits only a chair of its own type or a Wildcard
 *     chair, as Dominion's cards have since C2a;
 *   · twenty-seven new Expansionist rows. Eight rows change to the sheet's
 *     text: six Expansionist rows and two shared ones. The Rope Stretchers
 *     and Garden Cities were deferred and are now dealt. The Spirits of Place
 *     is renamed The Ambarvalia and keeps its id;
 *   · The Forest Gardens and Daughter Towns are retired, and so is the Keep
 *     building, which only the retired Vigil Charter unlocked. Each row stays
 *     in the data, so a town or a collection that holds one keeps it.
 *
 * **A v133 save is refused and does not replay.** The draft bags hold
 * different cards, and a seat command that put an Expansionist card in a
 * chair of another type is now refused. The branch migrates nothing, for the
 * reason given under v119.
 *
 * v135 (branch `decks`; Dominion batch D4 of
 * `docs/plans/dominion-build-triage.md`, unrest, authority, and "this game"
 * counts): **twelve Dominion cards about unrest, the writ and the game's
 * records.** Nine Orders join the Dominion file, The Proconsuls is reworked in
 * place, and two Doctrines join its `doctrines` map: The Consular Roads at
 * Tier I and The Universal Monarchy at Tier III. One field joins the state:
 * `Player.enemiesKilled`, the number of units the empire's units have killed
 * in the game, the wild's included. Only `tallyFall` (`combat.ts`) writes it.
 * The wild never keeps it, and it is absent until the first kill. The rules
 * that change:
 *
 *   · a card can add a line to a town's pacification (`CardRule`
 *     `pacificationRate`), end a town's unrest at once in the unrest phase
 *     (`CityRuleId` `pacified`), or end it at the moment of capture
 *     (`ActionRuleId` `pacifyOnCapture`);
 *   · the end of a town's unrest is a moment the cards pay on (the `pacified`
 *     windfall occasion, with the town's population), paid by `endUnrest`
 *     (`unrest.ts`);
 *   · a card can set a town's writ price or scale it (`cityCost` with a
 *     `value` or a `percent`);
 *   · the writ sums a town-by-town count over the towns a row's scope admits.
 *     Before, such a row paid nothing;
 *   · three counts over the game's records (`enemiesKilled`, `unitsLost`,
 *     `citiesCaptured`), and two town scopes (`generalPresent`,
 *     `notCaptured`);
 *   · every town that The Outriders' hammers land in settles at once, after a
 *     camp and after a discovery;
 *   · the bots price D3's pillage extras and the places a grant can land, so
 *     they draft differently.
 *
 * **A v134 save is refused and does not replay.** The draft bags hold
 * different cards, every kill now writes the new record, and the bots draft
 * differently. The branch migrates nothing, for the reason given under v119.
 *
 * v136 (branch `decks`; Expansionist batch E1 of
 * `docs/plans/expansionist-build-triage.md`, the levies): **twelve
 * Expansionist cards about levies.** Ten join the Expansionist file; Seasonal
 * Levies gains the levy gate, and The General Levy its free upkeep. What
 * changes:
 *
 *   · four new things a levy can buy: a worker, a settler, science, and hammers
 *     for the nearest other town building a world wonder;
 *   · a deal gate, "Needs a levy" (`OrderDef.needsLevy`): a gated card is
 *     dealt only to a seat holding a card that grants a levy;
 *   · three fields join the state, each absent until it is first written:
 *     `Player.citizensLevied`, the citizens an empire has spent on levies
 *     (written only by `recordLevy`); `Unit.levied`, the levy that raised a
 *     piece (written only by `createUnit`); and `CityLevyRecord.returns`, the
 *     citizens due home to a town (written by `levyAt`, emptied by the new
 *     phase);
 *   · a new end-of-turn phase, `levyReturns`, before `collectYields`. It
 *     raises the revision once more every turn;
 *   · a stamp and an upkeep rebate can be narrowed to the pieces a levy
 *     raised, and a citizen coming home through `settlePopulationWindfall`
 *     pays no growth riders.
 *
 * **A v135 save is refused and does not replay.** The draft bags hold
 * different cards, and every resolution runs one more phase. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v137 (branch `decks`; Dominion batch D5 of
 * `docs/plans/dominion-build-triage.md`, units gained and new moments):
 * **fourteen Dominion cards that raise units or pay on new moments.** Nine
 * Orders join the Dominion file, three shared Orders join the common file (The
 * Sword of State, Copying the Enemy and The New Code), and two Doctrines join
 * Dominion's `doctrines` map: Total Mobilisation at Tier III and The Landsturm
 * at Tier IV. One field joins the state: `Player.greatPeopleByFamily`, the
 * great people the empire has gained in the game, by family. Only
 * `settleGreatPersonChoice` (`greatPeople.ts`) writes it, and it is absent
 * until the first great person. The rules that change:
 *
 *   · every unit `realiseItem` brings into being counts for a new tally,
 *     `unitGained`: trained, bought, free and conscripted units alike;
 *   · four new moments the cards pay on: an Order draft passed
 *     (`draftPassed`), a town taken by force and razed (`raze`, with its
 *     population), an attack from range (`rangedAttack`) and a great person
 *     gained (`greatPersonGained`). `payOccasionRiders` (`cities.ts`) pays all
 *     four;
 *   · a grant can raise the best melee unit or each military unit a
 *     technology unlocks, in the capital or in each town a scope admits; can
 *     be paid once for each item a count finds (`perCount`); can bank science
 *     toward the technology of a unit killed (`towardFallenTech`, through
 *     `bankTowardTech`); and can open a free Order draft (`freeDraft`) that
 *     moves neither the draft count nor the culture;
 *   · a rider can fire at most once in a number of turns (`oncePerTurns`), and
 *     only for a kill of a unit the empire cannot build yet (`fallenUnbuilt`).
 *     A kill now names the unit killed (`WindfallOccasionFacts.fallen`), and a
 *     finished technology names itself (`tech`);
 *   · an Order can raise units when it is drafted (`OrderDef.onDraft`), and a
 *     row whose whole text is that grant is dealt;
 *   · a periodic muster can cost the town a citizen (`costsCitizen`);
 *   · a strength line can ask for a great general beside the unit
 *     (`besideGreatGeneral`), and a count can count great people, of one
 *     family or all (`greatPeopleGained`);
 *   · a kill, a death or a capture pays a payout that holds only science
 *     toward a technology or a free draft. Before, `payBattleRiders` dropped
 *     a payout with no yields, units, heal or timed effects;
 *   · the bots price the new moments and grants, so they draft differently.
 *
 * **A v136 save is refused and does not replay.** The draft bags hold
 * different cards, every unit gained and every great person now write the new
 * records, and the bots draft differently. The branch migrates nothing, for
 * the reason given under v119.
 *
 * v138 (branch `decks`; Dominion batch D6 of
 * `docs/plans/dominion-build-triage.md`, captures, commissions and the end of
 * a war): **eleven Dominion cards.** Two Orders join the Dominion file
 * (Danegeld, Vae Victis) and one the common file (Looted Art). Two deferred
 * rows come live (War Reparations, Commission: A Victor's Peace), and six live
 * rows are reworked in place (Commission: Clear the Frontier, Commission: Take
 * the City, Commission: The Grand Campaign, Commission: The Captured Marvel,
 * Commission: Hold the Capitals, Spolia). Five fields join the state, each
 * absent until it is first written:
 *
 *   · `WarState.taken` and `WarState.pillaged`: the towns each side took by
 *     force and the hexes each side pillaged during that war, written only by
 *     `recordWarCapture` and `recordWarPillage` (`wars.ts`);
 *   · `City.originalCapitalOf`: whose first town this is, written beside
 *     `originalCapital` in `createCity`;
 *   · `Player.opusBank`: production kept for the Magnum Opus until a town
 *     raises it;
 *   · `PlayerStatecraft.chairsWon`: Wildcard chairs a commission gave for the
 *     rest of the game. The tally rows (`OrderTally`) may also carry `people`,
 *     `wonders` and `town`.
 *
 * The rules that change:
 *
 *   · a peace pays each side's `peace` riders with what it won
 *     (`takenPopulation`, `hexesPillaged`), and the end of a war, by peace or
 *     by the other empire's destruction, is a tally a commission counts
 *     (`warEnded`, with the towns taken);
 *   · a counted commission goal may have a floor (`minPopulation`,
 *     `minTownsTaken`), keeps the towns it counted, and a reward may read them
 *     (`fromGoal`), build in the town that met it (`building`), grant citizens
 *     (`citizens`, to the capital or the smallest towns) or add Wildcard
 *     chairs (`wildcardChairs`, read by `chairCount`);
 *   · three commission figures that read the towns taken this turn or ever
 *     (`capturedPopulation`, `capturedThisTurnPopulation`,
 *     `capturedThisTurnWonders`) are gone: the goal's own record replaces
 *     them. `originalCapitalsHeld` no longer counts the empire's own first
 *     town, and The Captured Marvel no longer counts it either;
 *   · a production grant sent to the Opus with no town raising it is kept on
 *     `Player.opusBank`, and `releaseOpusBanks` (`cities.ts`) moves it into
 *     the town raising the Opus at the start of the production phase. Before,
 *     it went to the capital;
 *   · an amplifier can scale an Order's capture riders (`captureRewards`), and
 *     a renown grant can be a share of the moment (`fromOccasion`). A capture
 *     now carries the works and wonders inside the town (`worksAndWonders`);
 *   · the bots price the peace moment and the capture amplifier.
 *
 * **A v137 save is refused and does not replay.** The draft bags hold
 * different cards, every war and every first town now write the new records,
 * a Spolia grant lands somewhere else, and the bots draft differently. The
 * branch migrates nothing, for the reason given under v119.
 *
 * v139 (branch `decks`; Expansionist batch E2 of
 * `docs/plans/expansionist-build-triage.md`, moments, records and counts):
 * **ten Expansionist cards.** Nine join the Expansionist file, and The Land's
 * Great Work now counts towns of at least eight citizens, as its text says.
 * What changes:
 *
 *   · two fields join `City`, each absent until it is first written:
 *     `largestSize`, the most citizens the town has ever had (written by
 *     `foundCityAt` and `settleSizeRecord`), and `joinedBy`, the empires whose
 *     capital the town has been joined to by road (written only by the new
 *     phase);
 *   · three windfall occasions: a town growing past its largest size
 *     (`sizeRecord`), the world taking a census (`census`, paid to every real
 *     empire) and a town first joined to its capital by road
 *     (`joinedToCapital`). The completion occasions now carry the town's
 *     population;
 *   · a tally occasion, `sizeRecord`, and two counts: `citiesFounded` (the
 *     record `Player.citiesFounded`) and `citiesAdmitted` (the towns a scope
 *     admits, which a production bonus can read);
 *   · a founding rider can start a town at a share of the largest town
 *     (`fromLargest`);
 *   · a new end-of-turn phase, `roadJoinings`, after `levyReturns` and before
 *     `collectYields`. It raises the revision once more every turn, and it
 *     writes `City.joinedBy` for every real empire, with or without the card.
 *
 * **A v138 save is refused and does not replay.** The draft bags hold
 * different cards, every resolution runs one more phase, and towns carry the
 * two new fields. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v140 (branch `decks`; Expansionist batch E3 of
 * `docs/plans/expansionist-build-triage.md`, the land): **ten Expansionist
 * cards about the land.** Five join the Expansionist file; The Prospectors,
 * The Watercourses and The Landscape Garden now do what their text says; The
 * Common Domain and The Raising of the Land were deferred and are now dealt,
 * the second at Tier III with the sheet's text. What changes:
 *
 *   · two fields join `Tile`, each absent until it is first written:
 *     `marks`, the lasting marks on a hex (written only by `markHex`, and only
 *     ever added to), and `surfacedBy`, the empire whose survey struck the
 *     seam (written only by `prospectAt`, on a strike);
 *   · the rule book gains `improvements.hexMarks`, what each mark pays and
 *     while what stands on the hex, and the hex fold reads it;
 *   · a farm can count as having fresh water by its empire's law
 *     (`farmWaterOf`): the Irrigation renewal, the farm's placement and the
 *     cards' `freshwater` test all read it;
 *   · three tile tests (`river`, `wonderTown`, `surfaced`), a combat condition
 *     that reads the hex a piece stands on (`standingIn`), three behaviour
 *     rules (`woodsWalk`, `riverFarmsWater`, `farmChainsWater`) and two city
 *     rules (`workMountains`, `widerReach`);
 *   · a town's reach is its own (`workRadiusOf`), mountains can be workable,
 *     and a unit's step into forest or jungle can cost the open-ground price;
 *   · a windfall rider can name the building finished and can mark a town's
 *     land, and a great person's act now pays its riders in the town where the
 *     act landed rather than in the capital;
 *   · an Order amplifier can carry a tile test, and then raises hex lines only.
 *
 * **A v139 save is refused and does not replay.** The draft bags hold
 * different cards, and the riders of a great person's act land in a different
 * town. The branch migrates nothing, for the reason given under v119.
 *
 * v141 (branch `decks`; Expansionist batch E4 of
 * `docs/plans/expansionist-build-triage.md`, works, claims and borders): **ten
 * Expansionist cards.** The Keeps, The Garden Frontier and The Staked Claims
 * join the Expansionist file. Outposts, The Polders, Migration, The Great
 * Migration and The Encroaching Fields were deferred and are now dealt. The
 * Fish Traps and The Wide Country now do what their text says. No field joins
 * the state. What changes:
 *
 *   · three improvement rows join the table (`townKeep`, `polder`, `outpost`),
 *     each opened while a seated card names it (`unlocksImprovement`). The
 *     Keep copies the hexes around it and gives its hex's defender +5, one in
 *     each town; the polder yields as a farm on grassland; the outpost is laid
 *     beyond the borders and claims the unowned ring around it;
 *   · a tended work may be laid on unowned ground near the borders under The
 *     Garden Frontier (`worksBeyond`), and the hex joins the nearest town;
 *   · a worker of a seat holding The Fish Traps may step onto a lake as if
 *     embarked (`MoveProfile.wades`), and only the fish traps may be laid on
 *     one;
 *   · a founding rider can claim every unowned hex within a radius
 *     (`claimRadius`), and a town founded on an outpost takes its land;
 *   · the tally `hexBought` is now `hexClaimed`: hexes claimed by an outpost,
 *     a cleared camp or buying;
 *   · two new end-of-turn phases after `expandBorders`, `encroachment` and
 *     `migration`, which run The Encroaching Fields (`encroach`) and the two
 *     migrations (`migration`) every ten turns. Each raises the revision once
 *     more every turn;
 *   · the bots may lay Keeps and polders when a seated card opens them.
 *
 * **A v140 save is refused and does not replay.** The draft bags hold
 * different cards, every resolution runs two more phases, and the bots lay
 * different works. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v142 (branch `decks`; Dominion batch D7 of
 * `docs/plans/dominion-build-triage.md`, economy rules and Double Time):
 * **thirteen Dominion cards.** Eight Orders join the Dominion file (The Spear
 * Makers, The Defiant Kingdom, The Hunting Grounds, The Funeral Oration, The
 * Castra, Double Time, War Feeds Itself, The Glorious Dead) and one the common
 * file (The Farming Garrisons, shared with Expansionist). A deferred row comes
 * live (The Legions' Labour), and three Doctrines join Dominion's `doctrines`
 * map: The Marian Reforms at Tier I, The Laws of Lord Shang at Tier II and The
 * Fortress Empire at Tier IV. No field joins the state. An Order row may name
 * a last band (`OrderDef.lastBand`): Double Time is dealt in bands 2 and 3.
 * The rules that change:
 *
 *   · a town's yields gain a fourteenth step: a card may move the town's food
 *     surplus into production while the town builds a row the card names
 *     (`explainSurplusMoved`), and the growth channel then banks none of it.
 *     The empire's steps are now 15 to 20;
 *   · a production percentage can join the empire stage (`stage: 'empire'`);
 *   · a hex test asks whether a fortified military unit of the empire stands on
 *     the hex (`fortifiedUnit`, answered through `GroundFacts`), and a count
 *     counts those units (`fortifiedUnits`);
 *   · a unit filter can ask for a unit's age (`ageAtMost`), a town scope for
 *     the row at the front of its queue (`producing`), and an empire condition
 *     for a met empire that holds more towns (`rivalHoldsMoreTowns`);
 *   · disbanding a unit is a moment the cards pay on (`disband`), with the town
 *     the unit stood in and its production cost, and a rider can ask for that
 *     town (`inTown`);
 *   · a barbarian camp near the towns of an empire whose law speeds it musters
 *     sooner (`campMuster`), and an empire's law can count its own war losses
 *     for less (`unitLossWeariness`, `townLossWeariness`);
 *   · at the end of a turn, a unit in enemy territory can yield its owner the
 *     hex's yields (`harvest`, run in the drill phase);
 *   · an Order's periodic boons, musters, drills and harvests can happen twice
 *     (`turnEffectRepeats`);
 *   · a write of a unit's fortification moves the economy clock, and a
 *     completion rider that pays only science toward a technology or a free
 *     draft is now paid (`payCompletionRiders` asks `windfallPayoutIsEmpty`);
 *   · the bots price the new shapes, so they draft differently.
 *
 * **A v141 save is refused and does not replay.** The draft bags hold
 * different cards, a disbanded unit now pays the cards that pay on one, and
 * the bots draft differently. The branch migrates nothing, for the reason
 * given under v119.
 *
 * v143 (branch `decks`; Expansionist batch E5 of
 * `docs/plans/expansionist-build-triage.md`, meters, commissions and the shared
 * militia): **eight cards.** The Burhs, Commission: Break the Sod, The
 * Sovereign Writ and The Imperial Roads join the Expansionist file, and The
 * Frontier Militia joins the shared file. The Heartland was deferred and is
 * now dealt, and The Domesday Survey and The Master of Works now do what their
 * text says. One field joins the state, absent until it is first written:
 *
 *   · `City.markedBy`: the commissions that marked the town, each with the
 *     empire that held it then, written only by `markGoalTown`
 *     (`commissions.ts`).
 *
 * The rules that change:
 *
 *   · a commission reward may mark the town that met the goal (`markTown`),
 *     hand over effects for the rest of the game (`lasting`, read by
 *     `liveEffects` from the fulfilled commissions) and pay each town from its
 *     own figure (`eachTown`). The `markedBy` town scope reads the mark;
 *   · two commission figures, `improvedOnlyTilesWorked` and
 *     `oneTownWorkedHexes`, and a goal's floor on each hex
 *     (`hexYieldAtLeast`); a goal one town meets names its town in
 *     `commissionGoalTown`;
 *   · a meter rule, `writUncapped`, takes the ceiling off the writ's bonus;
 *   · a founding rider can raise a unit in the new town (`unit`), a production
 *     bonus can name fortifications (`defensive`, read by `isFortification`),
 *     a windfall rider's town filter (`inTown`, from Dominion batch D7) now
 *     reads a great person's act too, and a grant can be read off the
 *     empire's other towns (`fromTowns`). A great person's act now carries
 *     its town (`WindfallOccasionFacts.townId`, the fact D7's disband moment
 *     fills).
 *
 * **A v142 save is refused and does not replay.** The draft bags hold
 * different cards, and The Domesday Survey and The Master of Works pay
 * differently. The branch migrates nothing, for the reason given under v119.
 *
 * v144 (branch `decks`; the lake fix, "L1", the user's ruling of 2026-10-16,
 * `docs/flags.md` (wwwwww)): **a lake is water like the coast.** No field
 * joins the state. What changes:
 *
 *   · the lake's terrain row is `embarkable`, so a land piece that may embark
 *     (Sailing; soldiers at Wayfinding) may cross a lake, and a hull may enter
 *     one from a port beside it. Every step is priced through `stepCost`, as
 *     for the coast;
 *   · E4's lake rule for workers is removed: `MoveProfile.wades`, the
 *     improvement row field `workersWade` and `workerWaters`. A worker lays
 *     fish traps on a lake as on the coast, standing on the hex, embarked;
 *   · the Floating Gardens' deferred note is removed, because its lake half
 *     can now be built.
 *
 * Whether a town beside a lake is coastal is unchanged.
 *
 * **A v143 save is refused and does not replay.** Pieces now path across
 * lakes, so the bots move differently. The branch migrates nothing, for the
 * reason given under v119.
 *
 * v145 (branch `decks`; Dominion batch D8 of
 * `docs/plans/dominion-build-triage.md`, the last Dominion Doctrines):
 * **eight Doctrines join Dominion's `doctrines` map**, so all sixteen of the
 * sheet's Doctrines are in the data. The Soldiers' Share and The Servian
 * Reforms join Tier I; Centurions, The Plunder Economy, The Strategoi and
 * Weight of Numbers join Tier II; Combined Arms joins Tier III; and The Scourge
 * of God joins Tier IV. One field joins the state: `Player.strikesThisTurn`,
 * the attacks an empire's units made this turn, kept only for an empire whose
 * law counts them. The rules that change:
 *
 *   · a grant can heal every unit within some hexes of the moment's hex and
 *     raise each fighting unit one rank (`healWithin`, `rankWithin`), and can
 *     hang timed effects on the unit that acted (`actorTimed`, hung by
 *     `pillageAt`);
 *   · a pillage carries the raider's own strength (`pieceStrength`);
 *   · three behaviour rules: no founding (refused in `foundingError` and, for
 *     a unit that founds cities, in `buildError`), no experience (asked in
 *     `ranks.ts`), and a siege unit screened from melee by a melee unit beside
 *     it (`screenError`, asked by `attackTargetAt` and `planCombat`);
 *   · a unit cost percentage for a class of units, as a line of
 *     `explainUnitCost` (`unitCost`);
 *   · a strength line can count the Elites beside a unit (`CombatScale.rank`)
 *     or the attacks already made this turn on the same target
 *     (`attacksOnTarget`);
 *   · an upkeep surcharge can name a rank, and a unit a free rebate covers pays
 *     no surcharge at all (`freeByLaw`);
 *   · a great general's aura can be amplified (`generalAura`), and a hex row can
 *     take a share of everything the hex pays (`wholePercent`, the hex's last
 *     line);
 *   · the bots price the new shapes, so they take different Doctrines.
 *
 * **A v144 save is refused and does not replay.** The Doctrine offers hold
 * different cards, so every seat that adopts a government is dealt a
 * different hand, and the bots choose differently. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v146 (branch `decks`; Expansionist batch E6 of
 * `docs/plans/expansionist-build-triage.md`, the two cards that waited for
 * Dominion batch D7): **two cards come live.** The Breadbasket and Veteran
 * Colonies were deferred and are now dealt. No field joins the state. The
 * rules that change:
 *
 *   · a town scope asks whether the town's owner told it to stop growing
 *     (`avoidsGrowth`, read off `City.avoidGrowth`). The Breadbasket moves
 *     such a town's food surplus into production through D7's
 *     `surplusToProduction`, whatever the town builds;
 *   · while a card moves a town's food surplus into production, the Avoid
 *     growth tick no longer moves the town's citizens off food
 *     (`assignCitizens` skips `capFoodSurplus`). This reaches The Laws of Lord
 *     Shang too, in a town told to stop growing while it builds a military
 *     unit;
 *   · Veteran Colonies is a rider on D7's disband moment: a military unit
 *     disbanded on the hex of one of your towns pays that town food equal to
 *     its production cost, as a growth windfall.
 *
 * **A v145 save is refused and does not replay.** The draft bags hold
 * different cards. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v147 (branch `decks`; the movement fixes of `docs/flags.md` (xxxxxx), ruled
 * 2026-10-17): **units stuck on water, and routing round a blocking unit.**
 * No field joins the state. The rules that change:
 *
 *   · a step from land onto water (the coast or a lake), or from water onto
 *     land, spends the whole allowance and ends the march on the hex it lands
 *     on, so `findPath` plans such a step only onto a hex where the piece may
 *     stop (`endsTheMarch`, `canStopOn`). Before, a march could aim its landing
 *     at a full town hex and then wait at the water's edge for good;
 *   · when the hex a march has to rest on holds a piece that leaves it no
 *     room, the walk plans a way round that hex to the same goal
 *     (`findPathAround`) and walks it. A route on dry land goes round on dry
 *     land. When there is no way round, the piece waits, as before. The order
 *     left on the unit is the detour's remainder, and the command's result
 *     names the cells walked (`CommandResult.reroutes`);
 *   · the bots step a garrison out of a town only onto land, never leave a
 *     land piece asleep or dug in on the water (it comes ashore instead), and
 *     never dig in to mend there.
 *
 * **A v146 save is refused and does not replay.** Its marches would walk
 * different routes: a landing it planned onto a full hex is refused, and a
 * march it left waiting at a blocked hex now goes round. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v148 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
 * (aaaaaaa)): **towns may take each other's hexes with the citizen tool.** No
 * field joins the state. The rules that change:
 *
 *   · a pin (`setLockedTiles`) may go on a hex that another town of the same
 *     empire owns inside this town's work radius (`takeableTiles`). The pin
 *     takes the hex: `takeTile` moves its owner in `state.tileOwner` to this
 *     town, the losing town drops its pin there, and both towns are re-seated
 *     in the same command. The hex stays this town's when the pin is lifted;
 *   · a take that would give a town a second "at most one per town" work (The
 *     Keeps) is refused;
 *   · the automatic assignment, and so the bots, never take a hex.
 *
 * **A v147 save is refused and does not replay.** Its own pins would replay as
 * they were, but the rule a pin is judged by has changed, and the branch
 * refuses a save from before a rule change. It migrates nothing, for the
 * reason given under v119.
 *
 * v149 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
 * (ccccccc)): **the Order tiers open at the government tiers.** No field joins
 * the state. The ladder's rungs (`tierLadder`) are now 0 · 4 · 10 · 18 · 29
 * drafts, one per band, with 3 · 5 · 5 · 8 · 11 chairs. Since schema 119 they
 * had been 0 · 4 · 18 · 29 · 38: the tier-10 governments add no chairs and
 * had no rung, so every Order tier from Tier II up opened one government tier
 * late. The rules that change:
 *
 *   · Tier II is dealt from draft 10 (with research age three), Tier III from
 *     draft 18 (age four) and Tier IV from draft 29 (age four). Before they
 *     were dealt from drafts 18, 29 and 38;
 *   · draft 38 is no longer a rung. Its governments stay retired, so it opens
 *     nothing;
 *   · no chair count changes: the tier-10 rung keeps the five chairs of the
 *     rung below it, and every government row keeps its own figure.
 *
 * **A v148 save is refused and does not replay.** A seat between drafts 10 and
 * 17 is now dealt Tier II hands where it was dealt Tier I hands, so every
 * later pick differs. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v150 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
 * (ddddddd): *"lets move tier IV to tier 26"*): **Tier IV opens at 26
 * drafts.** No field joins the state. The rules that change:
 *
 *   · the last rung of `tierLadder` is 26 drafts instead of 29, so Tier IV is
 *     dealt from draft 26 (with research age four);
 *   · the last live governments (The Estates, The Sultanate, The Curia) are
 *     offered at tier 26 instead of 29, with their eleven chairs, and the Tier
 *     IV Doctrines come with them (`governmentTierForDoctrineBand`).
 *
 * **A v149 save is refused and does not replay.** A seat at drafts 26 to 28
 * is now offered a government, a Doctrine offer and Tier IV hands where it was
 * offered none of them. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v151 (branch `decks`; the user's ruling of 2026-10-17, `docs/flags.md`
 * (eeeeeee): *"lets remove the research age altogether"*): **an Order tier
 * opens at its draft rung alone.** No field joins the state. The rules that
 * change:
 *
 *   · a seat is dealt from the band its draft count has reached
 *     (`currentBandOf`): Tier I from draft 4, Tier II from 10, Tier III from
 *     18 and Tier IV from 26, in any research age. Before, each band also
 *     needed the research age one above it (Tier I age two, Tier II age three,
 *     Tiers III and IV age four), the rule of 2026-09-16;
 *   · `bandOpen` and `currentBand` are gone. They had no input left but the
 *     ladder tier.
 *
 * **A v150 save is refused and does not replay.** A seat whose draft count was
 * ahead of its research age is now dealt hands from a later band, so the same
 * roll picks a different card and every later pick differs. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v152 (branch `decks`; Scientific batch S0, `docs/plans/scientific-build-
 * triage.md`): **the charter technologies.** No field joins the state. The
 * rules that change:
 *
 *   · thirteen technologies join `data/techs.json`, each marked
 *     `TechDef.charter`. Only a seat that drafted the charter naming one may
 *     research it. They sit off the sky (`TECH_IDS` is still the fifty
 *     ordinary rows; `ALL_TECH_IDS` holds all sixty-three), and none moves an
 *     empire's age, marks a world first or counts as a node of the last age;
 *   · a technology's price is a fold (`explainTechCost`, `foldTechCost`): the
 *     column price, then for a charter technology a premium of
 *     `rules.research.charterPremiumPercent`, then the cards' percentages,
 *     added together and floored once. An ordinary technology with no card on
 *     it costs what it cost before;
 *   · two Scientific cards come live: The Commonplace Book (Tier I) and The
 *     Patent Office (Tier IV). The thirteen charter rows are in the deck file
 *     and stay deferred until their gifts are built. The Metallurgists' and
 *     Naturalists' Charters are retired.
 *
 * **A v151 save is refused and does not replay.** A Scientific seat's pool now
 * holds two more cards, so its hands from Tier I on differ, and the roster of
 * technologies a log may name has changed. The branch migrates nothing, for
 * the reason given under v119.
 *
 * v153 (branch `decks`; Scientific batch S1, `docs/plans/scientific-build-
 * triage.md`): **the line traits.** No field joins the state. The rules that
 * change:
 *
 *   · a technology row may carry line traits (`TechDef.traits`): a name, a
 *     unit line and card effects, read as `liveEffects`' tenth source and
 *     labelled "<technology> · <trait>". A unit filter may name a line
 *     (`UnitFilter.line`): the named unit and every unit its upgrade chain
 *     reaches. Casting gives the Hoplite and the Maryannu, Mechanics the
 *     Onager and the Repeating Crossbow, Chemistry the Grenadier and Naval
 *     Gunnery the Galleass;
 *   · two strength scales (the citizens of your own town a piece stands in,
 *     and the charter technologies you know), one count (the second of
 *     these) and one behaviour rule (`blockades`). Whether a piece blockades
 *     is now a question about the piece, its row's marker or its owner's
 *     cards, at all four places that ask it;
 *   · three Scientific charters are dealt: the Bronze-Founders', the
 *     Mechanists' and the Naval Gunners'.
 *
 * **A v152 save is refused and does not replay.** A Scientific seat's pool now
 * holds three more cards, so its hands differ from the opening draft on. The
 * branch migrates nothing, for the reason given under v119.
 *
 * v154 (branch `decks`; Scientific batch S1b, `docs/plans/scientific-build-
 * triage.md`): **the Scientific sheet of record and the chair types.** No
 * field joins the state. The rules that change:
 *
 *   · the Scientific deck is sorted: each of its twenty-six current rows
 *     carries a type (`OrderDef.type`), from the Type column of
 *     `docs/decks/scientific.md`. So is each shared row that sheet lists,
 *     eight of them for the first time (the cards Scientific shares with
 *     Commerce, Devotion and Magisterial). A typed card fits only a chair of
 *     its own type or a Wildcard chair, so a seat command that seated one of
 *     these cards in another chair is now refused;
 *   · twenty-four Scientific rows are retired: Field Notebooks, the ten live
 *     rows the sheet cut on 2026-10-06, Discoveries through Great People and
 *     twelve deferred rows. The shared The Hydraulic Commonwealth is retired
 *     too. A retired row leaves every pool.
 *
 * **A v153 save is refused and does not replay.** A Scientific seat's pool now
 * holds eleven fewer cards, so its hands differ from the opening draft on, and
 * a logged seat command may now be refused. The branch migrates nothing, for
 * the reason given under v119.
 *
 * v155 (branch `decks`; Dominion batch D9, `docs/plans/dominion-themes-
 * triage.md`): **the Dominion themes pass, first batch.** No field joins the
 * state. The rules that change:
 *
 *   · ten Dominion Orders are retired (Muster Rites, The Funeral Games, The
 *     Armourers' Secret, The Marshals, The Marching Camps, The Open Muster,
 *     The Cleruchy, The Valetudinaria, The State Forges, The Keshik), and so
 *     is the Doctrine The Servian Reforms. No pool or offer deals them. A seat
 *     that holds one keeps it, with its effects;
 *   · one new Order comes live: The Champion's Portion (Tier 0);
 *   · four Orders change: Clear the Frontier and Battle Honours trade rewards,
 *     and Battle Honours asks for six kills, not ten; The Camp Chaplains also
 *     pays faith when you lose a unit; The Bards' Praise pays 30 culture for
 *     a camp, not 15.
 *
 * **A v154 save is refused and does not replay.** A Dominion seat's pool and
 * its Tier I Doctrine offer now hold different cards, so its hands differ.
 * The branch migrates nothing, for the reason given under v119.
 *
 * v156 (branch `decks`; Scientific batches S2 and S3, `docs/plans/scientific-
 * build-triage.md`): **the guildsmen as a card count, and readings against
 * the empires a seat has met.** No field joins the state. The rules that
 * change:
 *
 *   · new card kinds: the count `guildsmen` (feature A); the counts `techLead`
 *     and `techGap`, the strength scale `techLead`, the combat condition
 *     `vsFewerTechs`, the production filter `aheadOfMet`, the rider filter
 *     `unbuildableByMet` and the rule `gapTechCost` (feature B, read through
 *     the new leaf `rivals.ts`). A technology a met empire already knows can
 *     now carry a card line in `explainTechCost`;
 *   · seven Scientific Orders come live (The Scholars' Guild, The Secret Arts,
 *     The Edge of the Sword, The Translation Movement, The Great Designs, Greek
 *     Fire, The Proving Ground), and one shared Commerce and Scientific Order
 *     (Books from the Ships).
 *
 * **A v155 save is refused and does not replay.** A Scientific or Commerce
 * seat's pool now holds more cards, so its hands differ from the opening draft
 * on. The branch migrates nothing, for the reason given under v119.
 *
 * v157 (branch `decks`; Dominion batch D10, `docs/plans/dominion-themes-
 * triage.md`): **the Dominion themes pass, the data-only cards of Tiers I to
 * III.** No field joins the state. The rules that change:
 *
 *   · nine new Orders come live: The Castle Demesne, The Spartan Discipline,
 *     Commission: The Ranks of Merit and Commission: The First Province
 *     (Tier I); The Naadam, The Taker of Cities and The Roll of Triumphs
 *     (Tier II); The March Revenues and The Tributary Kings (Tier III);
 *   · two Orders change: The Acropolis pays culture and authority for
 *     citadels, not authority for the capital's buildings; Commission: Take
 *     the City asks for a city of eight citizens, not five, and its reward
 *     becomes science and culture for each later capture, for the rest of
 *     the game, in place of a one-time payout and a Barracks.
 *
 * **A v156 save is refused and does not replay.** A Dominion seat's pools
 * from Tier I on now hold more cards, so its hands differ. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v158 (branch `decks`; Scientific batch S4, `docs/plans/scientific-build-
 * triage.md`): **the building charters.** No field joins the state. The rules
 * that change:
 *
 *   · eight Scientific charters are dealt: the Herbalists', Glassmakers',
 *     Librarians', Paper-Makers', Physicians', Printers', Gunfounders' and
 *     Military Engineers';
 *   · their charter technologies now give something. Optics, Cataloguing,
 *     Medicine, Printing and Gunfounding open five new buildings (the
 *     Specularium, the Mouseion, the Bimaristan, the Aldine Press and the
 *     Tophane). Papermaking opens the Scriptorium, which no card opens any
 *     more, and Military Architecture opens the Bastion, which waited for a
 *     technology until now. Herbals opens a new worker row, the Physic Garden,
 *     and pays happiness for each one inside your borders. Printing gives one
 *     more trade route;
 *   · a building row may cost a share more than its size and column say
 *     (`BuildingDef.costPercent`, the Mouseion's premium), as one more line
 *     of `explainBuildingCost`. The Scriptorium and the Bastion now cost what
 *     their technologies' columns say.
 *
 * **A v157 save is refused and does not replay.** A Scientific seat's pool now
 * holds eight more cards, so its hands differ from the opening draft on, and a
 * logged build of a Scriptorium or a Bastion meets a different gate and price.
 * The branch migrates nothing, for the reason given under v119.
 *
 * v159 (branch `decks`; Dominion batches D11 and D12, `docs/plans/dominion-
 * themes-triage.md`): **the Dominion commissions, and five small automatic
 * rules.** The two batches were built as 155 and 156 on their own branch and
 * merged after S4 together, so they share one number. No field joins the
 * state. The rules that change in D11 (the commissions):
 *
 *   · five new Orders come live: Commission: Man the Walls (Tier 0), The
 *     Ovation (Tier I), The Res Gestae and Commission: The Border Fortress
 *     (Tier II), and Commission: The Chosen Men (Tier III);
 *   · Commission: The Captured Marvel's reward becomes +30% science and
 *     culture, for the rest of the game, in captured towns that hold a world
 *     wonder or were founded as another empire's capital, in place of a
 *     one-time payout;
 *   · meeting a commission is a moment the empire's cards can pay on, and the
 *     commissions met are a count;
 *   · the `rankEarned` tally is written once for each rank, with the rank,
 *     and the great-person spend tells the tally the work it laid;
 *   · a rank's production lands and settles at once, except for a unit gained
 *     already holding a rank, whose hammers still wait for the production step.
 *
 * The rules that change in D12 (the automatic rules):
 *
 *   · two new Orders come live: Commission: Harry the Border (Tier I) and
 *     Rally to the Standard (Tier III);
 *   · three Orders change: The Gathering Host grows only for military units
 *     gained; The Soldier-Farmers pay +1 production and +1 gold on each worked
 *     hex with a resource in a garrisoned town, at war or at peace; The
 *     Marshalate adds +1 to the great generals' aura for each great general
 *     gained, at most +5, in place of its strength line and citadel yields;
 *   · a card's resource tests (`hasResource`, `resourceKind`, `resource`)
 *     answer only for a resource the empire can see, in hex lines, in counts
 *     of hexes and in scopes over worked hexes. A card no longer pays on
 *     copper, horses, camels, iron or niter before the technology that reveals
 *     it;
 *   · the `militaryGained` tally is written beside `unitGained`.
 *
 * **A v158 save is refused and does not replay.** A Dominion seat's pools now
 * hold more cards, and every seat's resource lines read the sight gate. The
 * branch migrates nothing, for the reason given under v119.
 *
 * v160 (branch `decks`; Scientific batch S5, `docs/plans/scientific-build-
 * triage.md`): **the learned land.** No field joins the state. The rules that
 * change:
 *
 *   · the Surveyors' and the Alchemists' Charters are dealt. Surveying opens
 *     the Aqueduct before Engineering and a new worker row, the Qanat, which
 *     waters the farms beside it. Chemistry opens a new worker row, Niter
 *     Beds, built beside a farm or pasture, which supply one niter;
 *   · eight more Scientific Orders come live: The Prospectors' Notes, The
 *     Founding Gift, The Latin Quarter, The Studium Generale, The Nizamiyya,
 *     The Republic of Letters, The School of Mines (the old Strategic
 *     Reserves row), and The Long Inheritance at its new text;
 *   · The Assay moves to the shared cards (Expansionist and Scientific) with a
 *     new text: hexes with a strategic resource gain science;
 *   · a great person's work pays the riders on building an improvement, as a
 *     worker's build does;
 *   · a town scope `hasImprovement` reads a variant row as its base row.
 *
 * **A v159 save is refused and does not replay.** A Scientific or
 * Expansionist seat's pools now hold different cards, and a logged Aqueduct
 * meets a different gate. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v161 (branch `decks`; Dominion batches D13, D14 and D15, `docs/plans/
 * dominion-themes-triage.md`): **The Limitanei, the three drafts and The
 * Upstarts.** The three batches were built as 160 and 161 on their own
 * branch and merged after S5 together, so they share one number. No field
 * joins the state.
 *
 * The rules that change in D13 (The Limitanei):
 *
 *   · one new Order comes live: The Limitanei (Tier III, rare);
 *   · a card's `garrisonWorks` rule lets a town work one more hex for each
 *     combat unit of its owner on the town's hex, ships included, up to the
 *     rule's `max`. The assigner (`chooseCitizens`) fills these seats after
 *     the citizens' seats. The extra hexes eat no food and count as worked
 *     hexes for every card.
 *
 * The rules that change in D14 (the three drafts):
 *
 *   · two Orders come live: The Relay Stations (Tier II) and Circumvallation
 *     (Tier IV). The row `marineDrill` becomes The Longships and plays a new
 *     rule;
 *   · a card's `shoreRaid` rule makes each naval combat unit of its holder
 *     pillage, at the end of the turn (the `drill` phase), the first enemy
 *     improvement on land beside it (`raidFromTheSea`). The raids join the
 *     turn's pillage reports;
 *   · a `unitStat` line can name `where: 'connectedTown'`: a unit standing in
 *     one of its owner's towns joined to the capital by road;
 *   · a card's `opusSiege` rule holds a rival town's production at nothing
 *     while it builds a Magnum Opus, is under siege, and a combat unit of the
 *     holder stands beside it (`explainOpusGate`, step 13 of
 *     `docs/yields.md`).
 *
 * The rules that change in D15 (The Upstarts):
 *
 *   · one new Order comes live: The Upstarts (Tier I, a new row);
 *   · a strength line can ask `vsMoreTechs`: the other side's empire knows
 *     more technologies than this one.
 *
 * **A v160 save is refused and does not replay.** A Dominion seat's pools in
 * every tier from I to IV now hold more cards, so its hands differ, and
 * Marine Drill's strength lines are gone. The branch migrates nothing, for
 * the reason given under v119.
 *
 * v162 (branch `decks`; Scientific batch S6, `docs/plans/scientific-build-
 * triage.md`): **the research record.** No field joins the state. The rules
 * that change:
 *
 *   · eleven Scientific Orders come live: The Royal Workshops, The Prize
 *     Essay, The Sky Watchers, The Astronomical Diaries, The Scholars' Fame,
 *     The Charter Rolls, The Royal Charter Commission, The Age of Reason, The
 *     Journeymen, The Sum of Knowledge and The Great Catalogue;
 *   · completing a technology is written down for the seated Orders that
 *     count it (`techCompleted`, and `charterTechCompleted` for a charter
 *     technology), and its price travels with the `tech` occasion;
 *   · the `tech` occasion now pays a rider that grants renown alone, and the
 *     food and production its riders pay settle in their towns at once;
 *   · a grant may pay each town by its own citizens (`fromTownPopulation`),
 *     and The Age of Reason makes an Order count each technology twice.
 *
 * **A v161 save is refused and does not replay.** A Scientific seat's pools
 * now hold eleven more cards, so its hands differ. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v163 (branch `decks`; Scientific batch S7, `docs/plans/scientific-build-
 * triage.md`): **the data-only cards of Tiers 0 to II.** No field joins the
 * state, and no shape is new. The rules that change:
 *
 *   · nine Scientific Orders come live: The Royal Tutors, The War Manuals,
 *     The Royal Estates, The Common Tables, The Free Cities, The Roll of
 *     Scholars, The Palace Schools, The Round City and The City Architects;
 *   · Learned Commissions becomes Learned Foundations under the same id:
 *     +25% toward empire buildings in a Library town, and its two riders
 *     for a first empire building of each kind are gone;
 *   · Enduring Institutions pays +25% production and no happiness;
 *   · The Quiet Faculties reads a worked Academy, not any great person's
 *     work, and pays +25% food and +20% production.
 *
 * **A v162 save is refused and does not replay.** A Scientific seat's pools
 * now hold nine more cards, so its hands differ, and three live cards pay
 * different figures. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v164 (branch `decks`; Scientific batch S8, `docs/plans/scientific-build-
 * triage.md`): **great people and the great houses.** No field joins the
 * state. The rules that change:
 *
 *   · a rider may grant a great person (`WindfallGrantSpec.greatPerson`),
 *     dealt as a commission's is, and a completion rider may name an any-of
 *     filter (`anyOf`);
 *   · the great-person price reads the empire's cards (`renownThreshold`
 *     takes the state; the `scholarLadderStep` rule);
 *   · `buildsEverywhere` may lift the one-to-a-realm limit for a counted
 *     number of copies of every great house, in the towns a scope admits, and
 *     a queue being replaced counts its own building rows for it;
 *   · `unlocksBuilding` may open a row in some towns only, and the University
 *     is a row a card may open early;
 *   · a commission may count the Academies inside the borders
 *     (`academyHexes`);
 *   · eleven Scientific Orders come live: The Forward Plans, The Dedications,
 *     The Royal Readers, The Invitations, The Second Seat, The Doctorate, The
 *     Royal Academies, The Queen of Cities, The Humanists, The Walls of
 *     Learning and The Lynx-Eyed Academy.
 *
 * **A v163 save is refused and does not replay.** A Scientific seat's pools
 * now hold eleven more cards, so its hands differ. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v165 (branch `decks`; Expansionist batches E7 and E8, `docs/plans/
 * expansionist-themes-triage.md`): **the Expansionist themes sheet, the
 * retirements, ten cards changed in place and five new Orders.** The two
 * batches were built as 163 and 164 on their own branch and merged after S7
 * and S8 together, so they share one number. No field joins the state.
 *
 * The rules that change in E7 (the sheet, the retirements and ten cards
 * changed in place):
 *
 *   · fifteen Expansionist rows are retired: The Pyramid Builders, The
 *     Beating of the Bounds, The Prospectors, The Garden Frontier, The
 *     Builders' Levy, The Plough Teams, The Polis, The Landscape Garden, The
 *     Common Domain, The Woodwrights, Public Works, The Manors, The Assay
 *     Office, The Managed Wild and The Land's Great Work. No draft deals them
 *     again, and a seat that already holds one keeps it and its effects;
 *   · ten Expansionist Orders change in place. The Rope Stretchers pays
 *     science for the improved tiles in a town. The Milestones pays gold and
 *     culture, and The Teeming Realm science and culture. The Measure of the
 *     Land pays science, at most +10. The Mother City gives the capital +5%
 *     production and culture for each town founded. Plenty pays five times
 *     the new population. The Staked Claims moves to Tier II. Six Gardens,
 *     The Wide Country and The Domesday Survey now leave an institution, and
 *     the Domesday goal falls to 120 hexes and 40 tiles;
 *   · five Orders change type to civic, and The Two Harvests (still
 *     deferred) to wildcard.
 *
 * The rules that change in E8 (five new Orders in shapes that already
 * existed):
 *
 *   · The Founding Furrow (Tier 0): founding a town grants culture equal to
 *     five times the number of towns you hold, the new town included;
 *   · The Horrea (Tier 0): each Granary you hold gives +1 authority;
 *   · The Land Hunger (Tier I): while a met empire holds more towns than you,
 *     your towns build settlers 25% faster and your settlers gain +1
 *     movement;
 *   · The Many Hands (Tier II): your towns build empire buildings 3% faster
 *     for each town you hold, at most +36%;
 *   · The Capitolia (Tier III): each empire building you hold gives each of
 *     your towns +1 culture.
 *
 * **A v164 save is refused and does not replay.** An Expansionist seat's
 * pools lose fourteen cards and gain five, and five of its cards fit other
 * chairs, so its hands and its councils differ. The branch migrates nothing,
 * for the reason given under v119.
 *
 * v166 (branch `decks`; Scientific batch S9, `docs/plans/scientific-build-
 * triage.md`): **the army and the Opus.** Two optional fields join the state:
 * `Unit.unsupplied` and `GameState.closedBook`. The rules that change:
 *
 *   · nine Scientific Orders come live: The Field Refits, The Strategikon,
 *     The Armoury Patterns, The Model Army, The Great Instrument, The
 *     Foundation Stone, The Closed Book, The Breaching Batteries and The
 *     Prototype Works; and one shared Order, The Soldier-Scholars (Dominion
 *     and Scientific);
 *   · an upgrade from research may heal the piece fully (`upgradeHeals`), or
 *     go past the strategic resource gate for a piece on the board
 *     (`upgradeIgnoresResource`). A piece upgraded that way holds no copy
 *     (`Unit.unsupplied`), and the copies ledger skips it;
 *   · a unit filter may ask for the owner's newest age (`newestAge`), and
 *     `unitMatches` takes the owner's age;
 *   · two strength conditions: `nearLearning` (your great people of named
 *     families, or a named work in your borders, within some hexes) and
 *     `standingInOwnTown` (the piece stands in its own empire's town, in
 *     attack and in defence);
 *   · a siege blow on a town raising the Magnum Opus may remove a share of
 *     the production banked toward it (`opusBreach`);
 *   · the Opus may open early to one empire (`opusEarly`), and then waits for
 *     that empire to know the technology before it may finish;
 *   · completing the Opus's technology first may close the Opus to the other
 *     empires for some turns (`closedBook`, `GameState.closedBook`);
 *   · a commission may pay production toward the Opus by a share of its cost
 *     (`opusCost`, `toOpus`), and a row may refuse to be dealt to a seat that
 *     knows a technology (`notDealtKnowing`);
 *   · the rows of the current research may be built at a premium
 *     (`prototypes`), a labelled cost line; a queued row whose research moved
 *     on, or whose opening card left, waits for its technology before it may
 *     finish, and stays legal in its town's queue.
 *
 * **A v165 save is refused and does not replay.** A Scientific seat's pools
 * now hold nine more cards, and a Dominion or Scientific seat's one more, so
 * their hands differ. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v167 (branch `decks`; Expansionist batches E9 and E10, `docs/plans/
 * expansionist-themes-triage.md`): **the land (marks, ages and tended
 * fields), and the militia and the trades.** The two batches were built as
 * 165 and 166 on their own branch and merged after S9 together, so they
 * share one number. No field joins the state, but `Tile.marks` may now hold
 * three more ids (`burned`, `marl`, `marlSecond`).
 *
 * The rules that change in E9 (the land: marks, ages and tended fields):
 *
 *   · The Burning Season: a worker may burn a grassland or plains hex that
 *     holds an improvement. The improvement stays and the hex is marked
 *     `burned` (+1 food while improved). A hex is burned once;
 *   · The Marl Pits (a new Tier I Order): finishing a mine or quarry marks
 *     each farm or pasture beside it, inside your borders, with marl (+1
 *     food), and a second time with a second marl, at most;
 *   · Commission: Break the Sod now leaves an institution: your works count
 *     as ten turns older for your cards. The timed food and the worker go;
 *   · The Two Harvests is built and dealt: your farms, mines and lumber
 *     mills also count as tended land for your cards, the Six Gardens goal
 *     included;
 *   · The Mountain Schools: towns with at least two mountains in their
 *     borders gain +15% science.
 *
 * The rules that change in E10 (the militia and the trades):
 *
 *   · Veteran Colonies: a military unit retired in one of your towns gives
 *     that town one citizen, in place of food equal to its cost. A unit raised
 *     for free gives nothing. The citizen comes with no growth riders and
 *     counts toward the town's largest size (a `citizens` grant on the
 *     disband moment);
 *   · Watch and Ward (a new Tier II Order): units a levy raised gain +5
 *     strength in your own territory, attacking and defending (`levied` on
 *     `combatLine`);
 *   · The Burghers (a new Tier II Order): towns of twelve citizens or more
 *     fill their guild bar half again as fast (the `guildInflow` rule, one
 *     line of `explainGuildInflow`).
 *
 * **A v166 save is refused and does not replay.** An Expansionist seat's
 * pools hold four more cards, a worker's build can do a new thing, and a
 * retired soldier now pays a citizen, so its hands, its land and its towns
 * differ. The branch migrates nothing, for the reason given under v119.
 *
 * v168 (branch `decks`; Expansionist batches E11 and E12, `docs/plans/
 * expansionist-themes-triage.md`): **public works, empire buildings and The
 * Cura Aquarum.** The two batches were built as 167 and 168 on their own
 * branch and merged together after S11, S12 and S13, so they share one
 * number. No field joins the state.
 *
 * The rules that change in E11 (public works and empire buildings). Six
 * building rows carry a new marker, `publicWork` (the Granary, Aqueduct,
 * Watermill, Harbour, Public Bath and Cistern):
 *
 *   · The Aediles (a new Tier I Order): +2 production in the capital and +2
 *     culture, and +1 of each for every public work finished while it is
 *     seated (the `publicWorkCompleted` tally, written in `realiseItem`);
 *   · The Public Good (a new Tier IV Order): +1% science and culture for each
 *     public work you hold, at most +25% (the `publicWorks` count);
 *   · The Topping Out: finishing an empire building, in place of a wonder,
 *     grants each of your towns production equal to five times its own
 *     population (Scientific batch S6's per-town grant), in place of twenty
 *     times the finishing town's.
 *
 * The rule that changes in E12 (The Cura Aquarum). A new city rule,
 * `holdsBuilding`, says that the towns its scope admits hold its building:
 *
 *   · The Cura Aquarum (a new Tier III Order): every town joined to the
 *     capital by road counts as having an Aqueduct. The town gains what an
 *     Aqueduct does (its growth, its water) and counts as having one for every
 *     card that asks. It does not count for what was built: score, upkeep,
 *     triumphs, wagers, buying, the build list or finishing one.
 *
 * The one reading of what a town holds is `townBuildings`
 * (`statecraft/evaluator.ts`). With no such card seated it is the town's own
 * list, so a game with no seat holding the card plays as it did.
 *
 * **A v167 save is refused and does not replay.** An Expansionist seat's
 * pools hold three more cards, and The Topping Out pays different towns for
 * a different building, so its hands and its towns differ. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v169 (branch `decks`; Commerce batch T1, `docs/plans/commerce-themes-
 * triage.md`): **the Commerce sheet of record.** No field joins the state.
 * The rules that change:
 *
 *   · the deck is sorted: every Commerce row that `docs/decks/commerce.md`
 *     lists carries a type, so it fits only a chair of that type or a
 *     Wildcard chair. Four shared rows gain a type too (Pilgrim Markets, The
 *     Tithe, Travelling Players and The Cosmopolitan Court);
 *   · eleven rows are retired: Coastal Estates, Bought Swords, Frontier
 *     Investment, Ore Caravans, Venture Routes, The Caravanserai Network,
 *     Patrons Abroad and The Merchant Dynasties (all live), and The
 *     Consulate, The Post Riders and The Embargo (all deferred);
 *   · four rows move from the Commerce file to the shared file, with their
 *     ids, texts and tiers: The Merchant Shrines, The Waqf and The Silk Road
 *     Monks (shared with Devotion) and The Brokers' Redraw (shared with
 *     Magisterial);
 *   · fifteen cards change in place. Private Patronage pays +40% gold. The
 *     Market Writ, The Factors' Houses and Caravanserai Cities lose their
 *     gold percentage. The Carters' Guild becomes +25% production toward
 *     buildings in towns a domestic trade route reaches. Corner the Market
 *     leaves an institution: +2 happiness for each luxury held twice or more.
 *     The Customs Houses pays science and culture for each customs house in a
 *     town's borders. Established Routes asks for twenty turns. The
 *     Strongroom asks for 1,500 gold. Bought and Paid For pays a percentage
 *     for each building bought with gold. Money at Work pays every town
 *     science for its treasury. Six cards change tier;
 *   · the shared The Escorted Roads, Pilgrim Markets, The Grain Exchange and
 *     Travelling Players move to Tier II, and The Exchange of Discoveries to
 *     Tier I;
 *   · the deferred The Return Leg, Export Guilds and The Treaty Ports take
 *     their new text, tier and rarity, and stay out of every pool.
 *
 * **A v168 save is refused and does not replay.** A Commerce seat's pools and
 * chairs hold different cards, and so do the pools of a seat whose deck
 * shares a moved card. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v170 (branch `decks`; Commerce batch T2, `docs/plans/commerce-themes-
 * triage.md`): **the new Commerce cards that need no new shape.** No field
 * joins the state. The rules that change:
 *
 *   · eight Commerce cards are new and dealt: Market Day and The Emporia
 *     (Tier 0), The Grain Banks and The Market Halls (Tier I), Names in
 *     Stone, The Hanse and Bills of Exchange (Tier II), and The Grain Barges
 *     (Tier IV);
 *   · the shared Merchant Scholars (Commerce and Scientific) moves from Tier I
 *     to Tier III. Its foreign routes now gain +2 science for each Academy in
 *     the origin city, in place of +5 science from a city with a Library.
 *
 * **A v169 save is refused and does not replay.** A Commerce seat's pools
 * hold eight more cards, and a Commerce or Scientific seat is dealt Merchant
 * Scholars at a different tier. The branch migrates nothing, for the reason
 * given under v119.
 *
 * v171 (branch `decks`; Commerce batch T7, `docs/plans/commerce-themes-
 * triage.md`): **the pair cards.** No field joins the state. The rules that
 * change:
 *
 *   · a new windfall moment, `cardDrafted`, is paid each time a card enters
 *     an empire's collection from an Order draft, a charter included. A pass,
 *     a Doctrine and a belief do not count;
 *   · the shared The Art Dealers (Commerce and Magisterial, Tier I, common) is
 *     new and dealt: each card you draft grants 15 gold;
 *   · The Standing Army moves from the Dominion file to the shared file,
 *     shared by Dominion and Commerce, with its id, text, tier and type.
 *
 * **A v170 save is refused and does not replay.** A Commerce or Magisterial
 * seat's pools hold a new card, a Commerce seat's pools hold The Standing
 * Army, and the order of the rows in a Dominion seat's pools changes. The
 * branch migrates nothing, for the reason given under v119.
 *
 * v172 (branch `decks`; Commerce batch T3, `docs/plans/commerce-themes-
 * triage.md`): **routes and posts.** No field joins the state. The rules that
 * change:
 *
 *   · a new windfall moment, `postEstablished`, is paid once for each trading
 *     post of an empire that becomes established, at home or abroad, with the
 *     post's town and its citizens. A sweep in the `roadJoinings` phase pays
 *     it; it writes nothing, so a game where no card pays the moment is
 *     unchanged;
 *   · a new rule, `homeRoutesPayOrigin`, makes a domestic route pay its origin
 *     a copy of what it pays its destination, at step 6 of the town's fold;
 *   · the rule `postsWaiveSeaRouteRange` is renamed `postsWaiveRouteRange`,
 *     and it now waives the range of any route, by land or sea, whose
 *     destination holds the sender's paying post;
 *   · two new counts (the citizens of the foreign towns holding your paying
 *     post, and every live route in the world), `population` narrowed by a
 *     town scope, and a periodic boon that passes that scope to its count;
 *   · The Fondaci, The Champagne Fairs and The Lingua Franca are new Commerce
 *     cards; The Return Leg is dealt; The Foreign Factor and The Admiralty of
 *     Trade (now uncommon) take their new text.
 *
 * **A v171 save is refused and does not replay.** A Commerce seat's pools
 * hold four more cards, The Admiralty of Trade is drawn at a different
 * rarity, and a seat holding The Foreign Factor or The Admiralty of Trade is
 * paid and gated differently. The branch migrates nothing, for the reason
 * given under v119.
 *
 * v173 (branch `decks`; Commerce batch T4, `docs/plans/commerce-themes-
 * triage.md`): **the trade commissions.** No field joins the state. The rules
 * that change:
 *
 *   · two new commission figures: your towns that the goal's town scope
 *     admits (`citiesAdmitted`, with the scope on the goal as `admits`), and
 *     the other empires your trade routes reach (`tradePartnerEmpires`);
 *   · a new commission reward, `postsInPartnerCapitals`, writes your trading
 *     post in the capital of each empire your routes reach, dated a full
 *     route term back so it is established at once. It goes through a third
 *     writer of `City.posts`, `writeEstablishedPost` (`trade.ts`), which pays
 *     the moment a post is established once for each post it writes;
 *   · Commission: The Great Fair is a new Commerce card (four towns that a
 *     domestic route arrives at; two more trade routes for the rest of the
 *     game). The World's Fair takes its new goal (routes to four other
 *     empires) and reward (the posts), and loses its timed bonus.
 *
 * **A v172 save is refused and does not replay.** A Commerce seat's pools
 * hold one more card, and a seat holding The World's Fair is paid
 * differently. The branch migrates nothing, for the reason given under v119.
 *
 * v174 (branch `decks`; Commerce batch T5, `docs/plans/commerce-themes-
 * triage.md`): **goods and deals.** No field joins the state. The rules that
 * change:
 *
 *   · two new counts read the deal register: the luxury copies an empire
 *     lends in its live deals (`copiesLent`), and the empires it holds a live
 *     deal with (`dealPartners`);
 *   · a new amplifier target, `lentLuxuryCopies`, keeps a share of each lent
 *     copy for its lender. The luxury counts and Corner the Market's figure
 *     add the share of the lent copies, rounded down, and a kind held only
 *     through lent copies pays at the share. The deal gate does not change;
 *   · a new behaviour rule, `postsLendLuxuries`: each foreign town holding
 *     the empire's paying post lends it one luxury, after the routes'
 *     loans, at the Silk Road's share;
 *   · an amplifier row may carry `yieldsOnly`, which narrows the
 *     `luxuryDuplicates` share to a luxury's flat yields;
 *   · the `tilePurchase` moment carries the price and the hex, a windfall
 *     rider may ask a tile test of the hex (`on`), and a scaled grant may be
 *     rounded down (`whole`);
 *   · Export Guilds and The Treaty Ports leave `deferred`; The Commenda, The
 *     Capitulations and The Casa da Índia are new Commerce cards; Land
 *     Speculation pays culture for a hex with a resource on it, in place of
 *     its gold and its unhappy capital.
 *
 * **A v173 save is refused and does not replay.** A Commerce seat's pools
 * hold five more cards, and a seat holding Land Speculation is paid
 * differently. The branch migrates nothing, for the reason given under v119.
 *
 * v175 (branch `decks`; Commerce batch T6, `docs/plans/commerce-themes-
 * triage.md`): **the purse and the hoard.** No field joins the state; an
 * existing field, `Unit.timed`, gains a new writer. The rules that change:
 *
 *   · a new action rule, `buysOnCredit`, with a `credit` figure on the row:
 *     purchases with gold (buildings, units, caravans, hexes and great-person
 *     drafts) may take the treasury down to minus the credit, and the
 *     creditors take no unit until the treasury falls below the same floor.
 *     The gold gates ask one helper, `spendableGold`, and so does the Trade
 *     screen. Gold poured into a wonder or the Opus and a gold reroll keep
 *     their own checks;
 *   · a new tally occasion, `treasuryHeld`, raised once a turn for every real
 *     empire after the yields bank, with the treasury as its fact. A `tally`
 *     row may carry `minTreasury`, the least treasury a turn must end with to
 *     be counted;
 *   · a route rider may carry `family`, which narrows its `guildsmen` count
 *     to one trade;
 *   · a unit stamp may carry `timed`: effects hung on the unit at its birth
 *     for a number of turns, written to `Unit.timed` by `createUnit`. A hung
 *     upkeep waiver is a give-back line in the upkeep fold, and no other
 *     rebate or surcharge reaches the waived unit;
 *   · Letters of Credit, The Strongbox and The Merchant Guilds are new
 *     Commerce cards, and the shared Mercenary Contracts leaves `deferred`
 *     with its new text (a military unit you buy costs no upkeep for twenty
 *     turns).
 *
 * **A v174 save is refused and does not replay.** A Commerce seat's pools
 * hold three more cards, and a Commerce or Dominion seat may be dealt
 * Mercenary Contracts. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v176 (branch `decks`; Devotion batch DV1, `docs/plans/devotion-themes-
 * triage.md`): **the Devotion sheet of record.** No field joins the state.
 * The rules that change:
 *
 *   · the deck is sorted: every Devotion row that `docs/decks/devotion.md`
 *     lists carries a type, so it fits only a chair of that type or a
 *     Wildcard chair. Two shared rows gain a type too (Sacred Commissions and
 *     Sacred Patronage);
 *   · four rows are retired: Pastoral Shrines, The Consolation and The Alms
 *     Roads (all live), and Consecrated Ground (deferred);
 *   · seven rows move to the shared file, with their ids, texts and tiers:
 *     The Holy Spring and The Ambarvalia (shared with Expansionist; The
 *     Ambarvalia comes from the Expansionist file), The Priest-Astronomers
 *     and The Monastic University (shared with Scientific), and The Painted
 *     Chapels, The Festival Calendar and The Penitents' Roll (shared with
 *     Magisterial);
 *   · five cards change in place. Lay Offerings pays on pastures too. The
 *     Settled Faith pays +15% science and culture in devout towns, and loses
 *     its happiness and its rite. The Mission pays 300 culture and The
 *     Conversion of Kings 500. The Great Commission leaves an institution
 *     (+3 faith and +3 culture in devout towns) in place of its faith and its
 *     thirty turns;
 *   · six cards change tier: The Second Prophet, The Living Hymnal, The
 *     Mission and Sacred Commissions move to Tier II, and The Conversion of
 *     Kings and The Pious Masons to Tier III;
 *   · the deferred The Interdict takes its new text, and stays out of every
 *     pool.
 *
 * **A v175 save is refused and does not replay.** A Devotion seat's pools
 * and chairs hold different cards, and an Expansionist, Scientific or
 * Magisterial seat may now be dealt the moved cards. The branch migrates
 * nothing, for the reason given under v119.
 *
 * v177 (branch `decks`; Magisterial batch MG1, `docs/plans/magisterial-
 * themes-triage.md`): **the Magisterial sheet of record.** MG1 ran beside
 * Devotion batch DV1 (v176), and the two merged. No field joins the state.
 * The rules that change:
 *
 *   · the deck is sorted: every Magisterial row that `docs/decks/magisterial.md`
 *     lists carries a type, so it fits only a chair of that type or a
 *     Wildcard chair. Two shared rows gain a type too: Sacred Commissions
 *     (Economic) and Sacred Patronage (Civic);
 *   · 64 rows are retired: 50 live and 12 deferred Magisterial rows (the cards
 *     the old sheet cut on 2026-10-06, and The Performers' Treasury), and the
 *     shared The Imperial Examinations (live) and Triumphal Arches (deferred);
 *   · four cards change in place. Civic Granaries pays +1 food and +1
 *     production for a Monument. The Honoured Dead moves to Tier II and pays
 *     +2 science and +4 production for each great person spent while it is
 *     seated, at most fifteen times. The Living Canon pays +4% food and
 *     production for each family, at most five, in every town. The Masters'
 *     Domain pays +3 food and +3 production on a great-person work and loses
 *     its gold percentage;
 *   · the deferred The Golden Age, The Magister's Court and The Last
 *     Commission take their new text and tier, and stay out of every pool.
 *
 * **A save of v176 or earlier is refused and does not replay.** A
 * Magisterial seat's pools and chairs hold different cards, and so do the
 * pools of a Dominion seat. The branch migrates nothing, for the reason given
 * under v119.
 *
 * v178 (branch `decks`; Devotion batch DV2, `docs/plans/devotion-themes-
 * triage.md`): **the new data-only Devotion cards, the word "devout" and the
 * shared Scientific rows.** No field joins the state. The rules that change:
 *
 *   · seven Devotion cards are new and dealt: The Deaconries, The Lives of
 *     the Saints and The Martyrology (Tier II), The Consecration Feast, The
 *     Pilgrim Towns and The Holy Summons (Tier III), and The Work of God
 *     (Tier IV);
 *   · four shared cards are dealt: The Shrine Guards (new, with Dominion),
 *     The Blessed Forges and The Schoolmen's Charter (new, with Scientific),
 *     and The Monastery Libraries, which leaves `deferred` with its new text;
 *   · a new charter technology, Scholasticism (`scholasticism`), which only
 *     a seat holding The Schoolmen's Charter may research. Knowing it opens
 *     the Cathedral and the Apostle before Theology, so both rows carry
 *     `unlockedByCard`. A unit that only a purchase brings (the Apostle) may
 *     be bought before its technology when a card has opened it early;
 *   · the describers print a town that follows a religion its owner is paid
 *     by as "devout". Only the printed words change.
 *
 * **A v177 save is refused and does not replay.** A Devotion, Dominion or
 * Scientific seat's pools hold more cards, and the technology list is longer.
 * The branch migrates nothing, for the reason given under v119.
 *
 * v179 (branch `decks`; Magisterial batch MG2, `docs/plans/magisterial-
 * themes-triage.md`): **the data-only Magisterial cards of Tiers 0 and I.**
 * No field joins the state. The rules that change:
 *
 *   · six Tier 0 cards are new and dealt: The Prytaneion, The Polemarch, The
 *     Court Painter, The Cornerstone, The Repertory and The Second Reading;
 *   · eight Tier I cards are new and dealt: The Nomarchs, The Workshop at
 *     Olympia, The Overseers of Works, The Siting Masters, The Keepers of
 *     Wonders, The Ceremonial Guard, The Unveiling and The Encyclopedia;
 *   · The Court Painter is the first row to ride the moment a card is
 *     drafted since batch R1 changed The Art Dealers;
 *   · two describer sentences change their words only. The reroll rule
 *     says "the first reroll of each hand", which Ibn Battuta's Rihla prints
 *     too, and a grant that goes to the capital names the capital before
 *     the age.
 *
 * **A v178 save is refused and does not replay.** A Magisterial seat's pools
 * hold more cards. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v180 (branch `decks`; Devotion batch DV3, `docs/plans/devotion-themes-
 * triage.md`): **the engine's shapes.** One field joins the state:
 * `Player.faithSpent`, the faith an empire has spent this game, raised by
 * the new `spendFaith` wherever faith leaves the bank. The rules that change:
 *
 *   · four Devotion cards are new and dealt: The Gifts of the Faithful (Tier
 *     0), The Sacred Precincts (Tier I), The Book of Life (Tier II) and The
 *     Offering Chests (Tier III). The shared The Rising Nave (with
 *     Magisterial, Tier III) is new and dealt too;
 *   · The Creed counts the gods an empire holds before it founds a religion:
 *     the `beliefsHeld` count is the empire's own gods, and the follower and
 *     enhancer beliefs of the religions it is paid by;
 *   · two counts are new: `faithSpent`, and `frontRowTenths` (how far a
 *     town's current build has come, in tenths);
 *   · four fields are new: `buildingCategory` on a rule (faith buys only one
 *     category of building), `currency` on a purchase rider (the rider
 *     reaches only one bank), `category` on a counted city stat, and
 *     `building` on the town scope `queueHolds`.
 *
 * **A v179 save is refused and does not replay.** A Devotion or Magisterial
 * seat's pools hold more cards, and The Creed pays a different figure. The
 * branch migrates nothing, for the reason given under v119.
 *
 * v181 (branch `decks`; Magisterial batch MG3, `docs/plans/magisterial-
 * themes-triage.md`): **the data-only Magisterial cards of Tiers II to IV.**
 * No field joins the state. The rules that change:
 *
 *   · six Tier II cards are new and dealt: The Prefects, The Symposium,
 *     Letters Patent, The Quarter of Masters, The Gazetteers and The Seven
 *     Sights. The Quarter of Masters has a new id,
 *     `magisterialTheQuarterOfMasters`, because the retired Expansionist row
 *     of that name keeps `theQuarterOfMasters` (the triage's reading 45);
 *   · three Tier III cards are new and dealt: The Boule, The Roll of Masters
 *     and The Garden Courts;
 *   · two Tier IV cards are new and dealt: The Privy Council and The Bulwark
 *     of Marvels;
 *   · The Golden Age (Tier II) and The Magister's Court (Tier IV) leave
 *     `deferred` and are dealt;
 *   · one field is new: `within: 'empire'` on a counted city stat, so a
 *     town's defence can count every wonder the empire holds, not only the
 *     wonders in that town (The Bulwark of Marvels). A row without it counts
 *     in the town, as every row before it did.
 *
 * **A v180 save is refused and does not replay.** A Magisterial seat's pools
 * hold more cards. The branch migrates nothing, for the reason given under
 * v119.
 *
 * v182 (branch `decks`; Devotion batch DV4, `docs/plans/devotion-themes-
 * triage.md`): **rites are seasons.** No field joins the state. The rules
 * that change:
 *
 *   · a rite started is a season (the triage's reading 9). The `riteStarted`
 *     tally and the `rite` occasion are raised for a rite with no `atOnce`
 *     alone, so the Votive Offering and the Restoring of the Host raise
 *     neither. A prophet's rite over the realm raises both once in each town
 *     it reaches, in `state.cities` order. The Founding Vows counts these
 *     seasons only;
 *   · the `rite` occasion carries the town it started in and that town's
 *     citizens (`townId`, `population`);
 *   · one effect kind is new: `productionToCulture`, the second line of step
 *     14 of a town's yields (`explainProductionMoved`). While a town keeps a
 *     rite that carries it, all of the town's production for the turn becomes
 *     culture, and the basket gains none of it;
 *   · one rite is new: the Rite of the Sabbath (`riteOfTheSabbath`), which
 *     carries that kind;
 *   · three Devotion cards are new and dealt: The Rogations (Tier 0), the
 *     charter The Sabbath Laws (Tier II), which opens the Rite of the
 *     Sabbath, and The Psalter (Tier III).
 *
 * **A v181 save is refused and does not replay.** A Devotion seat's pools
 * hold more cards, and The Founding Vows counts different rites. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v183 (branch `decks`; Magisterial batch MG4, `docs/plans/magisterial-
 * themes-triage.md`): **the collection and the wonder commissions.** No
 * field joins the state. The rules that change:
 *
 *   · two counts are new: `ordersHeld`, every Order in the collection, seated
 *     or not (the triage's reading 7), and `decksHeld`, the different decks
 *     among those Orders, where a card two decks share counts for both and
 *     the cards of no deck count as one more (reading 8). A `pays` row may
 *     carry `seated` to make `decksHeld` count the seated cards alone;
 *   · one commission figure is new: `ordersHeld`, read through the same walk
 *     as the count;
 *   · two tally occasions are new: `wonderCompleted`, written in
 *     `claimWonderFor` for the town's owner when it completes a world wonder
 *     (readings 3 and 4), and `wonderProduction`, written in `collectYields`
 *     with the production a town puts into a front-row world wonder or the
 *     Magnum Opus (reading 35);
 *   · five Magisterial cards are new and dealt: Commission: The Eighth Wonder
 *     (Tier 0), Commission: The Roll of the Senate (Tier I), Commission: The
 *     Wonder of the Age (Tier III), The Universal Library and The Polymath's
 *     Study (Tier IV);
 *   · the shared Travelling Players pays +2 culture on each foreign route
 *     from a town with a Monument for each different deck among the seated
 *     cards, where it paid +2 once (reading 46).
 *
 * **A v182 save is refused and does not replay.** A Magisterial seat's pools
 * hold more cards, and Travelling Players pays a different amount. The branch
 * migrates nothing, for the reason given under v119.
 *
 * v184 (branch `decks`; Devotion batch DV5, `docs/plans/devotion-themes-
 * triage.md`): **the faith's reach.** No field joins the state. The rules
 * that change:
 *
 *   · the `found` occasion carries the citizens the new town is founded
 *     with (`population`), and a windfall grant's `pressure` may be scaled
 *     by the moment's measure (`fromOccasion`), as a yield or renown grant
 *     may;
 *   · `foundCityAt` hands `payWindfallGrants` a presser, so a lump paid on
 *     the founding presses each religion the founder is paid by through
 *     `pressLump`, which now has three callers (the triage's reading 21);
 *   · one behaviour rule is new: `followersShareSight`. Under it every town
 *     of another empire that follows a religion this empire is paid by is
 *     a sight source for it, at the base city sight (reading 22);
 *   · one goal field is new: `every` on a `citiesAdmitted` goal, which
 *     counts the admitted towns only while every town the empire holds is
 *     admitted (reading 23);
 *   · three Devotion cards are new and dealt, all at Tier II: The Parishes,
 *     Commission: The State Church and The Confessors.
 *
 * **A v183 save is refused and does not replay.** A Devotion seat's pools
 * hold more cards. The branch migrates nothing, for the reason given under
 * v119.
 */
export const SCHEMA_VERSION = 184;

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
   * The seat's **second** ink — the device and the trim, where `color` is the
   * field (batch H7, `docs/flags.md` (oooo)).
   *
   * `charge`'s sibling in every respect, and deliberately so: a CSS string the
   * simulation never interprets, **config** rather than state, written only when
   * it is named. A seat under a figure takes the figure's pair
   * (`LeaderColors`, copied on at the table by `seatLeaders`); a plain seat
   * carries the palette's ink here and **no key at all** there, and every
   * surface falls back through the one door that decides it (`seatInks` in
   * `src/art/seatInks.ts`).
   *
   * **No schema bump**, and the argument is `charge`'s exactly: `normalizeConfig`
   * writes the key only when it is there, so a roster from before the pair
   * existed normalises byte-identically, and nothing in `src/sim/` reads the
   * field, so no outcome can turn on it.
   */
  secondary?: string;
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
  /**
   * The **figure** in this chair — `'pachacuti'`, `'mithridates'`, … — or absent
   * for a seat under nobody.
   *
   * `charge`'s and `persona`'s sibling in shape and its opposite in one respect
   * that has to be said out loud: this one **is read by the generator**. A
   * leader carries a start bias (`data/leaders.json`, `leaderData.ts`), and the
   * three stages of it decide where the seat stands, what the scatter puts near
   * it and what the fairness pass furnishes it with — see `docs/flags.md`
   * (cccc). So a roster's figures are an input to the *map*, exactly as the
   * seed and the override sheet are.
   *
   * That is replay-safe for the same reason those two are, and only because of
   * it: the world is generated from the config, a save is `{config, log}`, and
   * the roster is in the config. **No schema bump**, and the argument is exact —
   * `normalizeConfig` writes the key only when it is there, a config that never
   * heard of leaders normalises byte-identically to one from before they
   * existed, and a leaderless roster generates the map it always generated (see
   * `chooseStartPositionsFor` and `placeResources`, both of which take the
   * untouched path when nobody is seated).
   *
   * Refused by `validateConfig` when it names a figure the sheet does not
   * carry, rather than ignored: a leader that quietly did nothing would be a
   * player who chose Modu and got somebody else's steppe.
   */
  leader?: LeaderId;
  /**
   * **The decks this seat draws from**, or absent to take the figure's own
   * (`leaderDecks`: the row's two, or all six for the rainbow and for a seat
   * under nobody). The decks rework's one config override (D1a: *"config may
   * override per seat; default from the leader"*), so a harness or a test may
   * seat a plain chair under any pair without naming a figure.
   *
   * Read by `newGame` alone, into `Player.decks`; the map never asks. Refused
   * by `validateConfig` when it names a deck the six do not include, or names
   * one twice, or names none at all — a seat with no deck would draft from the
   * commons alone for a whole game. Written by `normalizeConfig` only when it
   * is named, `leader`'s rule, so a config that never heard of decks
   * normalises byte-identically.
   */
  decks?: DeckId[];
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
   * The seat's second ink, copied from its spec. Absent means *the board's own
   * ink* — see `PlayerSpec.secondary`, and `seatInks`, which is the one place
   * that fallback is decided.
   *
   * Uninterpreted here for `color`'s reason, and it must stay that way.
   */
  secondary?: string;
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
   * rate because research is bought, not rented.
   *
   * Since schema 111 it is the **current technology's bucket** and not a pool
   * that follows the aim: what is in here belongs to `researching`, and the
   * moment the aim moves it is parked in `techProgress` under the technology it
   * was spent on (`aimResearchAt`, the one seam). An empire that has aimed at
   * nothing banks here too — beakers with no name on them yet — and those join
   * whatever is chosen next, which is what they always did.
   *
   * See the model note in `tech.ts`.
   */
  sciencePool: number;
  /**
   * **Beakers committed to a technology the empire is not aimed at** — the rest
   * of schema 111's answer to *"swapping to a different tech shouldn't allow
   * you to keep your technology progress on the new tech"* (`docs/flags.md`
   * (www)).
   *
   * Progress is kept with the thing it was spent on rather than lost: a seat
   * that puts Bronzeworking down at forty beakers to answer a war finds forty
   * beakers still standing there when it comes back. `sciencePool` is the
   * current aim's bucket and this is every other bucket, so between them they
   * are "progress per technology" and no beaker is in two places at once.
   *
   * Presence is the state and the key is **deleted** rather than zeroed, which
   * is `researchQueue`'s convention and is here for its reasons: an empire that
   * never switched serialises exactly as it did before the field existed, and a
   * completed technology's bucket is swept the moment it lands rather than
   * lingering as a bank nobody can ever spend. Written by `aimResearchAt`,
   * `settleResearch` and `bankTowardTech` (Dominion batch D5, Copying the
   * Enemy) and nowhere else; read through `bankedTowardTech`.
   */
  techProgress?: Partial<Record<TechId, number>>;
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
   * **Every coin this empire has spent buying something** — the almoner's
   * ledger, and `CountKind`'s `goldSpent` (Cosimo de' Medici, batch GP2).
   *
   * `tilesPurchased`' and `campsCleared`' third, and on the player for their
   * reason exactly: it can never be derived from the board. A treasury says what
   * is *in* it; nothing anywhere says what has gone out of it, and coin that has
   * been spent leaves no wheat field and no scorched camp behind to count.
   *
   * **A player's own act, for a thing.** Written at the five seams where gold
   * leaves the treasury because somebody chose to buy something — `purchaseItemAt`
   * and `contributeAt` (`purchase.ts`), `purchaseTileAt` (`cities.ts`),
   * `applyBuyRoute` (`commands.ts`) and the gold arm of `chargeBank`
   * (`greatPeople.ts`) — all of them through `spendGold`, which is the one
   * subtraction that raises it. Two `gold -=` are deliberately **not** among
   * them: an army's retooling (`upgradeUnits`, `tech.ts`) is upkeep and nobody
   * pressed a button for it, and a lump across the diplomacy table
   * (`payLump`, `diplomacy.ts`) is a transfer between treasuries rather than a
   * purchase — the coin is still in the world. Maintenance and arrears never
   * touch the treasury field at all; they are lines of `explainEmpireGold`.
   *
   * Not `TallyOccasion`'s `goldSpent`, which writes the same moment down for a
   * different holder: a tally belongs to a **card in a chair** and grows only
   * while it sits there, so a legacy — which sits in no chair — could never read
   * one. Two records of one moment, each answering the question its own holder
   * can ask, and the two seams that keep both do it side by side.
   *
   * Nothing lowers it. A refund is not a thing, and an empire that sold its
   * habit back would be an empire the card stopped paying.
   */
  goldSpent: number;
  /**
   * **Every point of faith this empire has spent** (Devotion batch DV3, The
   * Book of Life; `CountKind`'s `faithSpent`). The twin of `goldSpent` for the
   * other bank, and on the player for the same reason: faith that has been
   * spent leaves nothing on the board to count.
   *
   * Raised only by `spendFaith`, which is the one subtraction from
   * `faithPool`. The triage's reading 13 counts every place faith leaves the
   * bank, and there are seven: the gods the ladder buys (`openFaithLadder`),
   * a reroll (`settleReroll`), a town's rite and a prophet's rite
   * (`performRiteAt`, `empireRiteAt`), a great-person draft bought with faith
   * (`chargeBank`), and a purchase or a contribution to a build
   * (`purchaseItemAt`, `contributeAt`). The record takes what actually left
   * the bank, so a rite or a reroll that the bank could not fully cover
   * counts only what was paid.
   *
   * Present from turn one, at nought, as `goldSpent` is. Nothing lowers it.
   */
  faithSpent: number;
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
   * **How many great people of each family this empire has gained** (Dominion
   * batch D5): The Mural Crown's count of great generals (`CountKind`'s
   * `greatPeopleGained`).
   *
   * `greatPeopleRecruited` split by family. It is written in one place,
   * `settleGreatPersonChoice` (`greatPeople.ts`), beside that counter, and
   * only ever raised. A family appears the first time one of it is gained, and
   * the field is absent until the first great person.
   */
  greatPeopleByFamily?: Partial<Record<Family, number>>;
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
  /**
   * **All the renown this empire has ever earned**, spent or not
   * (`docs/wager.md` §3b, The Renowned).
   *
   * `renownPool` is a *purse* — it goes down when a name is called — so it can
   * never answer "how much has this realm been worth this age". This is the
   * lifetime total beside it, raised in the one place renown is granted
   * (`settleRenownWindfall`, `renown.ts`) and never lowered, which is what makes
   * a wager's flow over it one subtraction against a stamp rather than a counter
   * anybody has to reset.
   */
  renownEarned: number;
  /**
   * Rivals' pieces this empire has killed, and its own that have fallen.
   *
   * Two lifetime counts, written at the two seams in `applyCombat` where a piece
   * leaves the board, and never anywhere else: a capture is not a kill (the wild
   * that converts a defender takes no entry), and the wild's own losses are not
   * a rival's — The Field of Glory asks for the *exchange* against other
   * empires, which is what makes it a card about choosing your ground rather
   * than about farming camps.
   */
  unitsKilled: number;
  unitsLost: number;
  /**
   * **How many ranks this empire's units have ever earned** (Dominion batch
   * D1): The Veterans' Roll's count (`CountKind`'s `ranksEarned`).
   *
   * One for each rank, however it was earned: in a fight, at a drill, at a
   * founding (The Armed Colony) or by a unit gained already holding one. A unit
   * that goes from no rank to Elite counts two. Written in one place,
   * `settleRanksEarned` (`cities.ts`), and only ever raised.
   *
   * Stored rather than derived because a rank leaves the board with the unit
   * that held it. Absent until the first rank, so an empire whose units have
   * earned none serialises the way it did before the field existed.
   */
  ranksEarned?: number;
  /**
   * **How many hexes this empire's units have ever pillaged** (Dominion batch
   * D3): The Sagas' count (`CountKind`'s `hexesPillaged`).
   *
   * One for each hex torn up, so a raid that also burns the works beside it
   * (The Horde) counts every hex it burnt. Written in one place, `payPillage`
   * (`improvements.ts`), which only `pillageAt` calls; only for an empire (the
   * wild keeps no record), and only ever raised. Stored because a burnt farm
   * leaves nothing on the board to count, and absent until the first pillage.
   */
  hexesPillaged?: number;
  /**
   * **How many citizens this empire has ever spent on levies** (Expansionist
   * batch E1): The Labour Rolls' count (`CountKind`'s `citizensLevied`).
   *
   * One for each levy, whatever it bought. Written in one place, `recordLevy`
   * (`levies.ts`), which only `levyAt` calls, and only ever raised. Stored
   * because a spent citizen leaves nothing on the board to count, and absent
   * until the first levy.
   */
  citizensLevied?: number;
  /**
   * **Production kept for this empire's Magnum Opus** (Dominion batch D6,
   * Spolia: "if you have not begun one, the production is kept until you
   * do"). A grant sent to the Opus (`WindfallGrantSpec.toOpus`) lands here
   * when no town of this empire is raising it, and `releaseOpusBank`
   * (`cities.ts`) moves it into the town raising the Opus at the start of the
   * production phase. Absent when nothing is kept.
   */
  opusBank?: number;
  /**
   * **The attacks this empire's units made this turn**, one entry per attack,
   * each the entity id of the piece or town attacked (Dominion batch D8,
   * Weight of Numbers: "+3 strength for each attack your units have already
   * made on the same target this turn"). Units and towns take their ids from
   * one counter, so an id names one thing.
   *
   * Written only by `recordStrike` (`combat.ts`), after each attack, and only
   * for an empire whose law counts these attacks (`CombatScaleCount`'s
   * `attacksOnTarget`). `turn` is the turn the entries belong to: a list from
   * an earlier turn counts nothing, and the next attack starts it again, so
   * nothing counts down. Absent until the first such attack.
   */
  strikesThisTurn?: { turn: number; targets: number[] };
  /**
   * **How many units this empire's units have killed in the game, barbarians
   * included** (Dominion batch D4): The Captured Arms' count (`CountKind`'s
   * `enemiesKilled`, the triage's reading 7).
   *
   * `unitsKilled` leaves out the wild, for The Field of Glory's reason. This
   * record counts every kill, so a Tier 0 card pays from the first camp's
   * raiders. It is written in one place, `tallyFall` (`combat.ts`), and only
   * for an empire: the wild keeps no such record. It is only ever raised, and
   * it is absent until the first kill.
   */
  enemiesKilled?: number;
  /**
   * **The losses this empire has suffered to other empires in war**, oldest
   * first (batch WC2, `docs/flags.md` (rrrrrr) part 2). War weariness is read
   * off this list (`src/sim/weariness.ts`).
   *
   * One record per unit another empire destroyed or captured, and one per town
   * another empire took by force. Each record carries the turn it happened on
   * and who did it. The list is only appended to, and only by `recordWarLoss`;
   * readers count the records whose turn is inside the weariness window, so
   * nothing here counts down. `pruneWarLosses` deletes records that have left
   * the window, which changes no reading.
   *
   * Stored rather than derived because a loss leaves nothing on the board: a
   * dead unit is gone, and a captured town looks the same as any other town of
   * its new owner. `unitsLost` above is not enough either, because it counts
   * losses to the barbarians, does not say which empire caused them, and never
   * forgets.
   *
   * Absent until the first loss, and deleted again when the broom empties it,
   * so an empire that has lost nothing to another empire serialises the way it
   * did before the field existed.
   */
  warLosses?: WarLoss[];
  /**
   * **What this seat staked**, and in which age (`docs/wager.md` §2).
   *
   * An index into `WagerDeal.dealt`, never an id, because the three cards are
   * the world's and a seat picks a *chair* at the table. Absent means this seat
   * has not answered the deal on the table — which is what the End Turn blocker
   * reads and what the `wagers` phase's default fills in for a seat that cannot.
   *
   * The pick is on the state and the **secrecy is a UI gate**, exactly as
   * `localPlayerId` is: a replay must carry every seat's stake, and a sheet
   * simply declines to print a rival's.
   */
  wager?: PlayerWager;
  /**
   * **The figure this seat plays**, or absent for a seat that named none.
   *
   * The runtime copy of `PlayerSpec.leader`, written once in `newGame` and never
   * again: a leader is chosen at the table and does not change hands. It is on
   * the `Player` as well as on the spec because the *map* reads the spec (the
   * three stages run before there is a state at all) and the *rules* read the
   * seat — `liveEffects` asks it once per law, and a walk over `state.players`
   * should not have to go back to the config to find out who is sitting there.
   *
   * Presence-is-state, exactly as `charge` and `persona` are: a seat with no
   * figure has no key, so a leaderless game serialises byte for byte as a game
   * from before leaders existed.
   */
  leader?: LeaderId;
  /**
   * **The decks this seat drafts from** (the decks rework, D1a; schema 119) —
   * the figure's two, all six for the rainbow and for a seat under nobody, or
   * whatever `PlayerSpec.decks` named. Written once in `newGame` and never
   * again: a seat's decks are fixed for the game (*"no chosen secondary
   * attributes"*, the design doc's structure paragraph), and mid-game pool
   * expansion is held out of D1 by the user.
   *
   * Always present, never optional, and on the wild too (empty): every reader
   * indexes a seat without asking which kind it is. The seat pool is
   * `deckPoolOf` (`statecraft/draft.ts`), which is this list against every
   * row's `OrderDef.decks`.
   */
  decks: DeckId[];
  /**
   * **The technologies a charter has opened for this seat** (schema 119) —
   * the research gate's list (`researchError`, `tech.ts`): a node a charter
   * names is researchable by a seat whose list names it and by nobody else.
   *
   * A **list of ids** rather than a flag per charter, for `legacies`' reason:
   * it is the register of what has been granted, so a second charter naming a
   * technology needs no second field, and iteration order that is part of the
   * state is iteration order a replay reproduces. Grows in exactly one place
   * (`applyCharter`, on the pick) and nothing ever removes an entry — a charter
   * is a grant, and a grant taken back would be a research plan pulled out
   * from under the seat. Always present, never optional.
   */
  charteredTechs: TechId[];
  /**
   * **The buildings a charter has opened for this seat** — `charteredTechs`'
   * sibling, read by `cardUnlocksBuilding` (`statecraft/evaluator.ts`), which
   * is the one place the existing `unlockedByCard` seam asks whether the
   * empire's cards open a row. A chartered row is buildable and purchasable
   * on the terms every card-opened row is, and costs what it costs.
   */
  charteredBuildings: BuildingId[];
  /**
   * **The rites a charter has made learnable** — the third sibling, read by
   * `hasAbility` (`tech.ts`) through each rite's own ability id, so a chartered
   * rite is known on exactly the terms a technology's rite is known.
   */
  charteredRites: RiteId[];
  /**
   * The lifetime totals a **flow** wager subtracts against, one per accumulator
   * (`WAGER_ACCUMULATORS`, `wagerData.ts`).
   *
   * Raised once a turn in the `wagers` phase by whatever that turn's reading
   * was, so each entry only ever moves one way and the deal can simply write
   * down where a seat stood. Nothing here ever resets: "this age" is
   * `now − opening`, the `TimedEffect` discipline one system over.
   *
   * Iterated through `WAGER_ACCUMULATORS`, never through its own keys (hard
   * rule 2).
   */
  wagerTotals: Record<string, number>;
  /**
   * Wagers this seat staked and did not keep — **the mark the malice deck reads**
   * (`docs/wager.md` §4, batch G3).
   *
   * The judgement is complete without the deck: at the age's close a seat whose
   * staked card is still unclaimed takes an entry here, append-only and
   * age-stamped. G3 turns each entry into a card drawn from `data/malices.json`
   * and seated in a chair; until it lands, the penalty is recorded and nothing
   * is paid, which is the honest half of a batch boundary.
   */
  pendingMalices: PendingMalice[];
  /**
   * The malices seated in this realm's chairs, each until the age it names —
   * **in seating order**, which is the order they were dealt (batch G3).
   *
   * At most `MALICE_RULES.stack` of them (§4: two); a third failure replaces the
   * oldest rather than adding, which is why this is a list and the order is part
   * of the state. It is written in exactly two places — the judgement's seating
   * and an adoption's re-seating — and read as `liveEffects`' eleventh source.
   */
  malices: HeldMalice[];
  /**
   * **The turn of the last census this seat has looked at** (`docs/wager.md`
   * §10, batch C1). Absent means none, which is what a fresh empire has read.
   *
   * The census sheet is an End Turn blocker that is *dismissed* rather than
   * chosen, so something has to remember that this seat has seen it — and the
   * two obvious places are both wrong. A view-layer flag would be forgotten on
   * a reload and put the sheet back up over a census a decade old; a boolean on
   * the register would be one flag for a world of seats. So it is an **absolute
   * turn on the seat**, written by the `dismissCensus` command, in the register
   * `SlottedOrder.sealedUntil` and every other timed fact in this game keep: the
   * blocker is the comparison `censusSeen < the last census's turn`, and nothing
   * anywhere clears it.
   *
   * It is a *command* rather than an interface's memory for the reason
   * `Unit.sleeping` is: a replay must reach the same board, a bot answers the
   * same blocker through the same door, and a save that came back with the sheet
   * still up would be a save that had forgotten a player had read it.
   */
  censusSeen?: number;
}

/** One seat's stake on the table. See `Player.wager`. */
export interface PlayerWager {
  /** The age the deal belongs to — a stake never carries over. */
  age: number;
  /** Which of the three dealt cards, 0-2. */
  index: number;
}

/** A wager staked and missed, waiting for G3's deck. See `Player.pendingMalices`. */
export interface PendingMalice {
  /** The age whose judgement wrote it. */
  age: number;
  /** The card that was staked and not kept — `WagerId`, kept as a string here. */
  wager: string;
}

/**
 * A malice seated in a chair (batch G3, `docs/wager.md` §4).
 *
 * Written by the judgement (`seatPendingMalices`, `wagers.ts`) and re-written by
 * an adoption (`reseatMalices`, `statecraft/draft.ts`), and by nothing else.
 */
export interface HeldMalice {
  /** The row in `data/malices.json`. */
  id: string;
  /**
   * **The age it leaves at the judgement of.** Absolute, never a countdown —
   * `TimedEffect`'s discipline and `SlottedOrder.sealedUntil`'s, one system over.
   *
   * §4's term is *"until the next age's wager is judged"*, so this is the age
   * after the one that seated it: a seat that keeps that age's bar sheds every
   * malice this far along, and a seat that misses again re-stamps its survivors
   * to the age after *that*. Nothing ticks; the judgement compares.
   *
   * The last wagering age is the one that never comes round: a malice taken at
   * Æra IV's judgement names an age the world never judges, so it stands for the
   * rest of the game — which is what it should be, since there is no next wager
   * to work it off against.
   */
  untilAge: number;
  /**
   * **Which chair it occupies**, an index into `PlayerStatecraft.slots` — or
   * **absent**, which is the ninth chair nobody has.
   *
   * §4: a realm with no chair of the malice's flavour takes it in a wildcard, and
   * a realm with no chair at all *still takes it* — the malice is never refused.
   * So absence is a real state and it means exactly one thing: the punishment is
   * paid in full and no Order was displaced, because there was nothing to
   * displace. The slots array is **not** grown for it; a government's spread is a
   * fact about the government, and a longer array would be a chair the player
   * could one day put an Order in.
   *
   * The chair a malice holds is stored rather than derived because it is a
   * *placement*: the same malice re-seated after an adoption may land somewhere
   * else, and a screen that recomputed it per repaint would disagree with the
   * reducer's refusal on the turn a spread changed.
   */
  chair?: number;
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

/*
 * `BeadCard` — one card on the table, face up or face down — stood here and is
 * **gone** (batch Q1, schema 108). It was Entry VI's drafting model, and the
 * model went with the deeds it dealt: the wager is what an age asks now, and a
 * wager is not a card somebody turns over.
 */

/**
 * **An age's close, decided** (batch G1, `docs/wager.md` §1).
 *
 * `age` is the age that is closing — the age the world is in until `turn`
 * arrives — and `turn` is the absolute turn it closes on. Both halves are
 * load-bearing: the turn alone would not say what it is the end of, and the age
 * alone would be a countdown somebody had to tick.
 *
 * The whole subsystem is this pair plus two comparisons (`worldClock.ts`),
 * which is `TimedEffect`'s lesson taken a second time: an absolute turn is
 * *compared*, never maintained.
 */
export interface AgeClose {
  age: number;
  turn: number;
}

/**
 * **One age's table** — the three cards the world was dealt, what each seat
 * stood at when they were dealt, and who has since kept one (`docs/wager.md`
 * §2/§3b, batch G2).
 *
 * The row is written once, at the deal, and only ever *appended to* after that.
 * That is what makes the whole system replay: the draw is one call on
 * `state.rng` at a known moment, the openings are a snapshot taken in
 * `realPlayers` order, and every claim is pushed in sweep order with the turn it
 * happened on.
 */
export interface WagerDeal {
  /** The age these cards belong to — Æra II, III or IV. */
  age: number;
  /** The three cards, in the order they were drawn. `WagerId`s, kept as strings. */
  dealt: string[];
  /**
   * The absolute turn they were dealt on — the turn the age opened.
   *
   * It is the deal's own clock and it is read three ways: a flow's window opens
   * here, "captured this age" counts from here, and the seat that has not
   * answered by the end of the *following* turn is dealt its first card by the
   * phase's default.
   */
  dealtOn: number;
  /**
   * Where every real seat stood on each of the three cards at the deal.
   *
   * A **flow** wager is `now − opening`, so a bar staked in Æra III does not
   * quietly credit an empire for what it banked in Æra II. Standing wagers
   * ignore it entirely — the board now is the board now. In `realPlayers` order.
   */
  opening: WagerOpening[];
  /**
   * Every seat that has cleared one of the three, appended the turn it first
   * did (§3b, claim-on-met): the beads are minted then, not at the close, so a
   * bar met and then lost to a war still paid.
   *
   * A pair `(playerId, index)` appears at most once. Any number of seats may
   * clear the same card — a wager is a bar, not a race — which is why nothing
   * here names a first claimant (§11: no "claimed by" line).
   */
  claimed: WagerClaim[];
  /**
   * The absolute turn the age's judgement was taken, or absent while it is still
   * running. Presence-is-state, and the one thing that stops a judgement being
   * taken twice on an age the Opus and the backstop both close.
   */
  judgedOn?: number;
}

/** One seat's three figures at the deal. See `WagerDeal.opening`. */
export interface WagerOpening {
  playerId: number;
  /** One per dealt card, in `WagerDeal.dealt` order. */
  at: number[];
}

/** One seat clearing one of the three. See `WagerDeal.claimed`. */
export interface WagerClaim {
  playerId: number;
  /** Which of the three, 0-2. */
  index: number;
  /** The absolute turn the bar was first met. */
  turn: number;
}

/** One seat's line in a census. See `CensusRecord.rows`. */
export interface CensusRow {
  playerId: number;
  /** What this empire read on the census's figure, in that figure's own units. */
  figure: number;
}

/**
 * **One census** — the world measured on one figure, and everybody's place in
 * it (`docs/wager.md` §10/§11, batch C1).
 *
 * Written once, on the turn it is taken, and never touched again: it is history
 * in `Player.triumphs`' sense, which is what lets the Abacus print the last one
 * without a second store and what lets a save carry every census a game ever
 * took at a few dozen bytes apiece.
 */
export interface CensusRecord {
  /** The absolute turn it was taken on. The blocker's own comparison. */
  turn: number;
  /**
   * Which figure was measured — a `CensusStat`, kept as a string.
   *
   * `WagerDeal.dealt`'s bargain exactly: the union lives in `census.ts` and this
   * module may not import it (the runtime cycle), so the state carries the word
   * and `isCensusStat` narrows it back at every reader. A row whose stat has
   * been cut from the list since is a census the sheet skips rather than throws
   * over.
   */
  stat: string;
  /**
   * Every real seat, **ranked** — highest figure first, ties by seat order.
   *
   * The ranking is stored rather than re-derived because a census is a
   * measurement *of a moment*: re-sorting it later against a board that has
   * moved would be a different census wearing this one's turn number.
   */
  rows: CensusRow[];
  /**
   * The seat at the head of the ranking, or `null` when the census named
   * nobody.
   *
   * A tie for first **is** a leader — the lower seat id, which is the tie-break
   * every sweep in this game uses. What is not a leader is a head row reading
   * **nought**: leading the world at nothing is not a deed, so a census taken
   * before anybody has any of the thing it measured pays nobody.
   */
  leaderId: number | null;
  /**
   * The great person who took it, by name — **flavour, and unlabelled**.
   *
   * A name drawn from the roster's live rows off `state.rng`, so a seed is a
   * calendar down to who signed the page. It carries no rule at all: the person
   * is not recruited, not spent and not on anybody's roster, and the mock's own
   * mark of 2026-09-09 says the masthead prints the name with no "flavour" tag
   * beside it.
   */
  taker: string;
}

/**
 * **The census register** — when the next one falls, and every one already
 * taken (`docs/wager.md` §10/§11, batch C1).
 *
 * `nextTurn` is an **absolute turn**, not a countdown: it is drawn at `newGame`
 * and again at every census (`state.turn + a gap in [min, max]`), and the phase
 * asks `state.turn >= nextTurn`. The `TimedEffect` discipline — nothing ticks,
 * so no phase can be skipped, run twice or run in the wrong order and change
 * when the world is measured.
 *
 * `taken` is append-only, `GameState.wagers`' discipline one system over: the
 * last row *is* what the Abacus prints, so there is no second store and no
 * "current census" field to fall out of step with the list.
 */
export interface CensusRegister {
  nextTurn: number;
  taken: CensusRecord[];
}

/**
 * The Bead Race's whole world state (design ledger Entry VI) — **one field**.
 *
 *   · `claimed` — the world's register. **The** place contention is settled, so
 *     "the first seat by log and sweep order" is a property of the order things
 *     were applied in rather than of a check somebody could forget.
 *
 * It held four until batch Q1, and the other three were the deal: `decks` (each
 * age's cards in a seeded order, drawn once in `newGame`), `hands` (what was on
 * the table) and `streaks` (how many turns running each seat had held each
 * streak deed's count). The feats, endeavours and quests they served are retired
 * — the wager is what an age asks now — so the three are deleted rather than
 * left empty: a field nothing writes is a question somebody will one day try to
 * answer. What is left is the register, which every bead still writes: a grant
 * is claimed once per empire and a wager's four rows are claimed every time they
 * are kept.
 *
 * There was a fifth until batch G1: `worldAge`, a **stored** clock raised to the
 * highest age any real seat had reached. That was the first-seat rule, and it
 * lived here because the Bead Race was the only system that asked. It is gone —
 * the world's age is derived from the mean (`worldClock.ts`) off one absolute
 * stamp on the state itself (`GameState.ageClose`), because a clock several
 * systems read is not one system's field, and a *stored* age is a second answer
 * to a question the technology lists already answer.
 *
 * A plain array, never a `Map` or a `Set`: it is iterated for an outcome, and an
 * outcome that depends on iteration order must depend on an order the state
 * itself carries.
 */
export interface BeadTable {
  claimed: BeadClaim[];
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
  /**
   * **This hand has already had its free redraw** — the Rihla's stamp (batch
   * L6a, `CardActionRule` `rerollOffers`). Presence is the state and it dies
   * with the offer, which is what makes the waiver one per *draft* rather than
   * one per game; a seat without the rule never writes it.
   */
  rerolled?: true;
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
   * **The turn this unit made the first of two attacks** — The Varangian
   * Guard's Elites, which may attack twice a turn (Dominion batch D2,
   * `BehaviorRuleId`'s `secondAttack`).
   *
   * The first attack leaves `hasAttacked` unset and writes the turn here; an
   * attack made while this equals `state.turn` is the second, and ends the turn
   * as any attack does. It is an absolute turn compared against `state.turn`,
   * never a countdown, so nothing resets it and a stale value from an earlier
   * turn simply means the next attack is a first again.
   *
   * Written in one place, `applyCombat`, and only for a piece the rule is true
   * of, so it is absent in every game without the card. Not in the piece
   * fingerprint (`signUnits`): nothing about it is drawn.
   */
  firstAttackTurn?: number;
  /**
   * **Which levy raised this piece**, or the key is **absent** on a piece no
   * levy raised (Expansionist batch E1). Two cards read it: The Trained Bands'
   * Veteran start (`CardUnitStampEffect.levied`, asked at the birth) and The
   * General Levy's free upkeep inside your borders
   * (`CardUpkeepRebateEffect.levied`, asked every turn the payroll is drawn).
   * Written only by `createUnit`, when the levy names it through
   * `RealiseOptions.levied`, and never changed after. Not in the piece
   * fingerprint (`signUnits`): nothing about it is drawn.
   */
  levied?: LevyUse;
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
   * **This piece holds no strategic copy** (Scientific batch S9, The Model
   * Army; the triage's reading 42), or the key is absent.
   *
   * Written in one place, `upgradeUnits` (`tech.ts`), when research upgrades
   * the piece past a resource gate its owner's law lifts
   * (`upgradeIgnoresResource`). The copies walk (`resolveCommitments`,
   * `cities.ts`) skips it, as it skips a free unit, so the piece takes no
   * copy now and none when the resource arrives. It is kept for the life of
   * the piece, through later upgrades and a change of owner. Presence is the
   * state, `freeUpkeep`'s convention.
   */
  unsupplied?: true;
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
  /**
   * **The experience this unit has earned in combat** (batch WC3,
   * `docs/flags.md` (rrrrrr) part 3), or the key is absent until it earns any.
   *
   * A unit's rank is read from this number every time it is needed
   * (`rankOf`, `src/sim/ranks.ts`) and is never stored, the way a barbarian's
   * role is derived each turn. Each rank adds one flat strength line on the
   * combat ledger and does nothing else.
   *
   * Written only by `awardExperience` (`ranks.ts`), which `applyCombat` calls
   * once for each side of a fight that lives through it. Absent until the first
   * award, so a unit that has never fought serialises exactly as it did before
   * the field existed.
   *
   * It stays with the piece: an automatic upgrade changes the unit's type in
   * place (`applyUpgrade`, `tech.ts`), and a change of owner (`captureUnit`)
   * changes only the owner, so a barbarian that joins under Blood Brothers keeps
   * whatever it had. The renderer hashes the rank, not this number, into the
   * piece fingerprint (`signUnits`), because only a change of rank changes what
   * is drawn.
   */
  experience?: number;
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
   * **The turn this route opened**, and the whole of "how long has this road
   * been running" (batch D2d, the age stamp).
   *
   * `expiresTurn`'s companion and the same kind of number — an **absolute** turn,
   * read as `state.turn - startedTurn`, never decremented and never swept. That
   * one says when the road stops paying and this says when it started, so
   * between them a caravan carries its whole term without anything ticking.
   *
   * **A renewal is not a new route.** Auto-resend rewrites `expiresTurn` on this
   * very object (`marchTraders`, the one place it happens), so a road a player
   * keeps up across ten renewals has one start date. Everything that really ends
   * a route — a cancellation, a plunder, a partner lost to war or to a border, a
   * term allowed to run out at home — destroys `Unit.trade` itself, and the next
   * caravan sent down the same road is a new route with a new date. So the four
   * continuity resets the design doc names (`docs/six-decks-first-cut.md`,
   * "Maturity is a relationship") fall out of the shape rather than being
   * enforced anywhere.
   *
   * **Two things the doc asks for that this does not do**, stated rather than
   * hidden: a manual re-hire within two turns does not inherit the old road's
   * progress (the doc's grace window), and a blockade does not pause the count
   * (there is no blockade rule in the game yet). Both are refinements on a
   * relationship tracker; the number here is the caravan's own unbroken term,
   * which is what a card that pays "a road kept up" prints.
   *
   * **Optional**, and that is `sea`'s convention on this very shape rather than
   * `autoResend`'s: there is exactly one place a route comes into existence
   * (`startRouteAt`) and it always writes this, so every route on a board has a
   * date — what the key being optional buys is that a route *assembled by hand*
   * (a test fixture, a scenario) is still a legal route. Absent is read as
   * "cannot be shown to have run long enough", never as zero, which is the
   * silence every other absent stamp in the vocabulary keeps.
   */
  startedTurn?: number;
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
  | { kind: "unit"; id: UnitTypeId }
  | { kind: "building"; id: BuildingId }
  | { kind: "project"; id: ProjectId };

/**
 * The three kinds of row a queue holds, for the gates that ask one question of
 * all of them (`buildError`, `isUnlocked`, `gatingTech` in `tech.ts`).
 *
 * Deliberately *not* the same type as `ProductionCategory` (`buildingData.ts`),
 * which is what a production bonus may name and stops at unit/building: a
 * barracks putting ten percent behind Tithes would be a barracks minting money,
 * and a project's rate is printed on its row precisely so nothing modifies it.
 */
export type QueueKind = QueueItem["kind"];

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
 *   hammerBasket  production toward the front of the queue (`advanceProduction`);
 *                 since schema 111 the front row's own bucket, with every other
 *                 row's parked beside it in `itemProgress`
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
export type UnitPurchaseBucket = "militaryGold" | "civilianGold" | "faith";

/**
 * One empire's commercial post in one town (batch D2e) — the per-empire half of
 * a trading post, which `City.tradingPost` could never be because both ends of
 * a route write the same flag.
 *
 * **A date, not a flag**, and that is the whole of the record. An empire's post
 * ripens after a full route term of unbroken trading presence here
 * (`rules.trade.routeTurns`, the "normal twenty-turn term" the design calls
 * for), so what has to be stored is when the presence started; whether it has
 * ripened yet is a subtraction anybody can do. `TimedEffect.expiresTurn`'s
 * discipline exactly — an absolute turn, compared and never counted down — and
 * the reason a post needs no sweep and no phase of its own.
 *
 * `since` moves in one direction only, and only while the post is still unripe:
 * the two writers in `trade.ts` add a record when an empire's first caravan
 * reaches the town and drop an unripe one when that empire's last route to the
 * town ends. Once a post is established the record is never touched again —
 * which is what makes "going to war does not remove these posts" true without a
 * clause anywhere saying so.
 */
export interface CommercialPost {
  /** Whose post it is. A player id, never an index into anything. */
  by: number;
  /**
   * The absolute turn this empire's unbroken trading presence in the town
   * began — the turn its first still-running route here opened.
   *
   * A post written established by a reward (`writeEstablishedPost`, Commerce
   * batch T4) is dated a full route term before the turn it was written, so
   * it is established from that turn on. The date can be below zero.
   */
  since: number;
}

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
   * **The turn each of those buildings joined this town**, or the key is
   * **absent** on a town that has raised nothing (batch D2d, the age stamp).
   *
   * `Tile.improvedOn` one scale up and the same discipline: an **absolute** turn
   * compared against `state.turn`, never a countdown — `TimedEffect.expiresTurn`'s
   * rule, `SlottedOrder.sealedUntil`'s and `purchasedUnitTurns`' below. Nothing
   * decrements it and no phase sweeps it; the whole reading is
   * `state.turn - buildingTurns[id] >= turns`, which is what lets a card say "a
   * Library that has stood twenty turns" without anything anywhere ticking.
   *
   * Keyed by `BuildingId` beside `buildings` rather than folded into it, because
   * that list is *order* and this is *date*: a list of pairs would have broken
   * every reader of a town's shelf, and a parallel array would have been a second
   * thing to keep in step. Nothing iterates this object for an outcome — every
   * sweep walks `buildings` (completion order) and looks a turn up by id, which
   * is the determinism rule read for an object, exactly as `followers` reads it.
   *
   * **"Placed" is the turn the stones topped out in *this* town**, whichever way
   * they got there: a building completed, a building bought at the till and a
   * relic laid by an apostle are all "the town now has the thing", and
   * `addBuilding` is the one seam all three go through. A **captured** town keeps
   * its stamps untouched, exactly as it keeps the buildings themselves — pay
   * follows the stones, and a conqueror who takes a town with a century-old
   * library has taken a century-old library. A town founded with a card's free
   * Monument is stamped with its founding turn, which is the turn that Monument
   * went up.
   *
   * There is no entry for a building that is not in `buildings`, and nothing ever
   * removes one: a building is never demolished in this game, and a town that is
   * razed takes its whole record with it.
   */
  buildingTurns?: Partial<Record<BuildingId, number>>;
  /**
   * **Which bank paid for each of those buildings**, for the ones somebody
   * bought — or the key is absent on a town that has bought none (batch C8).
   *
   * `buildingTurns`' companion, written in the same line of `addBuilding` and
   * for the same reason that field exists: a fact about how a building arrived
   * that cannot be worked out afterwards. A turn after the stones are up, a
   * bought library and a built one are the same library — so the till has to say
   * so at the moment it rings, or nothing can ever say so again.
   *
   * **Absence means nobody bought it.** A row completed in the queue, a card's
   * grant, a founding law's free Monument and an apostle's relic all leave no
   * entry, which is the honest record and is also the shape every town saved
   * before this field already has.
   *
   * Keyed by `BuildingId` beside the shelf, exactly as the dates are, and for
   * the same reason: the list is order, this is provenance, and nothing iterates
   * this object for an outcome. Nothing removes an entry, because nothing
   * demolishes a building; a captured town keeps its record along with its
   * stones, so a bought library goes on paying its captor.
   *
   * The one reader is `buildingBank` below.
   */
  buildingBanks?: Partial<Record<BuildingId, 'gold' | 'faith'>>;
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
   * The absolute turn this town last changed hands by force, or absent for a
   * town nobody has taken (`docs/wager.md` §3b, The Taken Town).
   *
   * `captured` is sticky and says *whether ever*; this says *when last*, which
   * is the only reading that can answer "taken this age and still held" without
   * a per-age counter to reset. Written where the flag is (`captureCity`), an
   * absolute stamp compared and never ticked, and kept on a town retaken by its
   * founder for `captured`'s own reason — the fact happened.
   */
  capturedOn?: number;
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
   * The town's **unrest**, or the key is **absent** for every town that is not
   * in it (batch WC1, `docs/flags.md` (rrrrrr) part 1).
   *
   * A town taken by force enters unrest whether it is kept as a puppet or
   * annexed, and so does a town retaken by the empire that founded it.
   * `captureCity` writes a fresh record on every capture, so a town taken again
   * while still in unrest starts over for its new owner. Annexing a puppet
   * leaves the record alone, and a town handed over at a treaty table is not
   * taken by force, so the handover neither starts nor ends one.
   *
   * While the record stands the town makes none of the yields
   * `rules.war.unrest.halts` names (the unrest gate, `docs/yields.md` step 13)
   * and its borders do not grow. The `unrest` phase (`runUnrest`,
   * `src/sim/unrest.ts`) fills `progress` each turn and deletes the record when
   * it reaches `target`.
   *
   * Presence is the state, `puppet`'s rule: a game in which nobody has taken a
   * town serialises exactly as one from before the field existed.
   */
  unrest?: CityUnrest;
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
   *
   * **Read by the bead alone since 2026-09-15** (`capitalCaptured`); razing
   * reads `originalCapital` below. The user's ruling (`docs/flags.md` (ggggg)):
   * a capital *re-seated* after the first fell is a capital `capitalCityOf`
   * names and this flag records, but pulling it down is not the sacrilege the
   * rule is about — and refusing it meant that a warlord taking an empire's
   * towns in order could never raze any of them.
   */
  wasCapital?: true;
  /**
   * True on the first town an empire ever founded — its **original seat of
   * government** — written once at founding (`createCity`) and never cleared,
   * whoever holds it since.
   *
   * Stored rather than derived, for `wasCapital`'s reason turned around: once
   * the palace changes hands nothing on the board says which of an empire's
   * founded towns was the first, because `capitalCityOf` reads the *current*
   * seat and the original may be three owners away by then. Razing reads it
   * (a founding capital is never pulled down, by anyone, ever); nothing else
   * does. Presence-is-the-state.
   */
  originalCapital?: true;
  /**
   * **Whose original capital this town is** (Dominion batch D6): the empire
   * that founded it as its first town. Written beside `originalCapital` in
   * `createCity` and never changed, so it is present exactly where that flag
   * is. Two commissions read it: Commission: Hold the Capitals counts only
   * other empires' original capitals, and Commission: The Captured Marvel
   * counts a captured town only if it was another empire's original capital.
   */
  originalCapitalOf?: number;
  /** Production queue, front first. Replaced wholesale by `setCityProduction`. */
  queue: QueueItem[];
  /**
   * Production banked toward the front of the queue.
   *
   * Since schema 111 it is the **front row's bucket** and not a basket that
   * follows whatever is put in front of it: re-heading a queue parks what is in
   * here under the row it was spent on (`reaimProduction`, the one seam) and
   * loads whatever that row had banked. A town with an empty queue banks here
   * too, and those unaimed hammers pay for the next thing queued exactly as
   * they always did.
   */
  hammerBasket: number;
  /**
   * **Hammers committed to a queue row that is not at the front** — schema
   * 111's other half (`docs/flags.md` (www)), keyed by the row's own
   * `queueItemKey` ("building:granary", "unit:archer", "project:tithes").
   *
   * `hammerBasket` is the front row's bucket and this is every other bucket, so
   * between them they are "progress per queue item". A town three turns into a
   * granary that is told to raise spearmen instead keeps the granary's three
   * turns; a **project**, which never completes and so never spends its bucket
   * down, simply accumulates in its own — which is what makes a conversion put
   * aside for an emergency still a conversion half-done when the emergency ends.
   *
   * Presence is the state and a key is **deleted** rather than zeroed, for
   * `techProgress`' reasons exactly. Overflow is deliberately *not* in here: what
   * is left in the basket after a thing completes was never spent toward that
   * thing, so it follows the queue to whatever comes up next.
   */
  itemProgress?: Record<string, number>;
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
   * While a card moves the town's food surplus into production (The
   * Breadbasket, Expansionist batch E6), the cap does not run: the surplus goes
   * into production instead, and the basket still gains nothing
   * (`assignCitizens`).
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
   * Which empires keep a commercial post in this town, or the key is **absent**
   * on a town no caravan has traded with (batch D2e).
   *
   * `tradingPost` beside it answers a different question and keeps answering it:
   * that flag is about the *place* — has any route ever touched this town — and
   * it buys route range for whoever sends the next caravan. This list is about
   * *whose*, which is the thing five Commerce cards ask and the flag cannot say.
   * Both stay, because "a town on the trade network" and "my house stands here"
   * are two facts and a card wants the second.
   *
   * One record per empire, appended in the order the presences began, and read
   * by index nowhere — so the order is stable under replay and never an outcome.
   * `trade.ts` holds the three writers (`openPost`, `closePost` and, since
   * Commerce batch T4, `writeEstablishedPost`), and there is no fourth.
   */
  posts?: CommercialPost[];
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
  /**
   * When this town last spent a citizen on a levy, or the key is **absent** on a
   * town that never has (batch L, `levies.ts`).
   *
   * Absolute turns compared against `state.turn`, never countdowns. `turn` is
   * the last levy of any kind, which is what the shared waiting period reads.
   * `after` holds, per card, the turn that card last hung its effects on this
   * town (Seasonal Levies' "at most once every twenty turns"). Written only by
   * `levyAt`. A captured town keeps it, like everything else that happened to
   * the place.
   */
  levy?: CityLevyRecord;
  /**
   * **The most citizens this town has ever had** (Expansionist batch E2), for
   * The Grain Census and The Freedom of the City.
   *
   * Written when the town is founded (`foundCityAt`, the founding size) and
   * raised only by `settleSizeRecord` (`cities.ts`), which growth and every
   * population grant call. It never falls: a famine or a levy takes a citizen
   * and leaves the record where it was, so a town that regrows that citizen
   * has not grown past its record. A captured town keeps it. Absent on a town
   * made without `foundCityAt` (a test's town), and then `settleSizeRecord`
   * reads the population before the gain as the record.
   */
  largestSize?: number;
  /**
   * **The empires whose capital this town has been joined to by road**, in
   * the order it happened (Expansionist batch E2, The Opening of the Roads).
   *
   * Written only by the `roadJoinings` phase (`roadJoinings.ts`). The first
   * time the town's owner reaches it from its capital by road, the owner's id
   * is added and the `joinedToCapital` occasion pays. The id is added whether
   * or not the owner holds a card that pays, so a card seated later pays only
   * for towns joined after it. It is a list rather than one id, so a town that
   * changes hands can pay its new owner once, and a town that comes back to an
   * owner it already paid pays nothing again. Absent until the first joining.
   */
  joinedBy?: number[];
  /**
   * **The commissions that marked this town**, each with the empire that held
   * the town when its goal was met (Expansionist batch E5, The Heartland).
   *
   * Written only by `markGoalTown` (`commissions.ts`), when a reward's
   * `markTown` is paid. The `markedBy` town scope admits the town while the
   * empire named holds it, so a town that changes hands loses the mark's
   * effects for its new owner (the triage's reading 40). Absent until the
   * first mark.
   */
  markedBy?: { card: OrderId; owner: number }[];
}

/** See `City.levy`. */
export interface CityLevyRecord {
  turn: number;
  after?: Partial<Record<CardId, number>>;
  /**
   * **Citizens due home** from earlier levies, for The Mit'a (Expansionist
   * batch E1). Each entry is the absolute turn the citizen returns on and the empire
   * that levied it, oldest first. Written by `levyAt`; read and emptied by the
   * `levyReturns` phase, which gives a citizen back when its turn comes. An
   * entry whose empire no longer holds the town is dropped, so a captured town
   * gives its new owner nothing. Absent when nobody is due.
   */
  returns?: { turn: number; ownerId: number }[];
}

/**
 * One town's unrest: how much pacification it needs, how much it has, and how
 * many turns it has spent with no soldier of its owner inside. See `City.unrest`.
 *
 * Two of the three are counts rather than turns, and neither is a countdown.
 * `progress` is a basket, filled like a food basket and compared against
 * `target`. `unguarded` counts the turns that qualified, so the rebel cadence
 * is "every third such turn" however the unguarded turns are spread out; a turn
 * with a garrison in the town adds nothing to it and takes nothing from it.
 */
export interface CityUnrest {
  /**
   * Pacification needed to end the unrest: `rules.war.unrest.targetPerCitizen`
   * times the town's population at the moment it was taken. Stored rather than
   * derived because the population moves afterwards and the target must not.
   */
  target: number;
  /** Pacification banked so far. Unrest ends the turn this reaches `target`. */
  progress: number;
  /**
   * Turns this unrest has ended with no military unit of the town's owner
   * standing in it. A rebel rises on each turn that takes this to a multiple of
   * `rules.war.unrest.rebelEveryTurns`.
   */
  unguarded: number;
}

/** What a war loss was: a unit destroyed or captured, or a town taken by force. */
export type WarLossKind = 'unit' | 'town';

/**
 * One loss an empire suffered to another empire. See `Player.warLosses`.
 *
 * The record says what was lost and not what it costs: how many points of
 * weariness a unit or a town is worth is read from `rules.war.weariness` when
 * the list is counted, so the figures stay in the data.
 */
export interface WarLoss {
  /** `state.turn` when the loss happened. Compared against the window. */
  turn: number;
  /** The empire that destroyed, captured or took it. Never the barbarians. */
  by: number;
  kind: WarLossKind;
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
export function foundedReligion(
  state: GameState,
  playerId: number,
): Religion | undefined {
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
  for (const count of Object.values(city.followers ?? {}))
    followed += count ?? 0;
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
export function shrinkFollowers(
  city: City,
  order: readonly ReligionId[],
): void {
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
 * One thing done **for the first time**. See `GameState.firsts` and `markFirst`.
 *
 * `ContestedTriumph`'s shape one register over and for its reason exactly: what
 * was first, who was first, and when. This is history, and history does not
 * change — nothing edits a row here and nothing ever deletes one.
 */
export interface FirstRecord {
  /** Which ledger. See `FirstKind`. */
  kind: FirstKind;
  /**
   * What was first, in that ledger's own key — a town's id, a building's id, a
   * town's id and a shelf. A **string**, because the ledgers key on different
   * things and a union of five key shapes would be five readers of one list.
   * `firstKey` is the one place a key is spelt, so nothing anywhere else builds
   * one by hand.
   */
  key: string;
  /**
   * The empire that got there first. On a **world** ledger (`techWorld`) this is
   * the only empire the record will ever name; on the rest it is the owner of
   * the record, and a second empire writes a row of its own.
   */
  playerId: number;
  /** `state.turn` when it was written. A stamp, never a countdown. */
  turn: number;
}

/**
 * **The Closed Book's record** (Scientific batch S9): the empire that
 * completed the Opus's technology first while holding the card, the turn it
 * did, and the absolute turn the door opens again. See `GameState.closedBook`.
 */
export interface ClosedBookRecord {
  playerId: number;
  /** `state.turn` when the technology was completed. */
  turn: number;
  /** The first turn on which other empires may begin the Opus again. */
  until: number;
}

/**
 * The key one first-of-a-kind record is filed under. **The one place a key is
 * spelt**, so the seam that writes a record and the count that reads one cannot
 * disagree about what "the same thing" means.
 *
 * The separator is a character no id carries, which is what keeps a two-part key
 * unambiguous: a town's id and a shelf are `"3|culture"`, and nothing can spell
 * that pair two ways.
 */
export function firstKey(...parts: (string | number)[]): string {
  return parts.join('|');
}

/**
 * The **last part** of a first-of-a-kind key — the building a `buildingInCity`
 * record is about, and nothing else today.
 *
 * `firstKey`'s inverse and here beside it for that function's reason exactly:
 * the separator is spelt once, so a reader that needs the row back out of a key
 * does not spell it a second time. A one-part key answers itself.
 */
export function firstKeyTail(key: string): string {
  const cut = key.lastIndexOf('|');
  return cut < 0 ? key : key.slice(cut + 1);
}

/**
 * **Writes down that this happened first, and answers whether it did.** The one
 * writer of `GameState.firsts`.
 *
 * Every first is a **contention**, and this is where the contention is settled:
 * the row is appended iff no row already matches, so "first" is a property of
 * *the order the seams ran in* rather than of a check somebody could forget —
 * `GameState.contested`' own argument, one register over. That order is the
 * codebase's standing one and it is worth naming: commands resolve in **log
 * order** within a turn, and the end-of-turn phases sweep **`realPlayers` order,
 * then each player's own arrays**, so two empires finishing one technology on
 * one turn are separated by the seat order the research phase already walks.
 * Nothing here breaks a tie by chance and nothing reads a Map.
 *
 * A **world** ledger (`WORLD_FIRST_KINDS`) matches on the kind and the key
 * alone, so the second empire to finish Bronze Working writes nothing and is
 * told so. Every other ledger matches on the empire too: a town's first
 * Monument is that empire's record, and a conqueror who takes the town has not
 * raised anything.
 *
 * Answers **true only for the empire that wrote the row**, which is exactly what
 * a rider asks (`CardWindfallRiderEffect.first`). A repeat answers false and
 * leaves the ledger byte-identical, which is what makes calling it from a seam
 * safe however many times that seam runs.
 */
export function markFirst(
  state: GameState,
  playerId: number,
  kind: FirstKind,
  key: string,
): boolean {
  const world = WORLD_FIRST_KINDS.includes(kind);
  for (const record of state.firsts) {
    if (record.kind !== kind || record.key !== key) continue;
    if (world || record.playerId === playerId) return false;
  }
  state.firsts.push({ kind, key, playerId, turn: state.turn });
  return true;
}

/**
 * How many rows of one ledger this empire has written, optionally narrowed by a
 * predicate on the key.
 *
 * The reading `CountKind`'s `firstBuildingsInCity` and `firstConversions` take.
 * The narrowing is a **predicate the caller supplies** rather than a shape of
 * key spelt here, because what a key means is a question about the ledger and
 * only its own readers know the answer: the buildings ledger keys on a town and
 * a row, and "how many of them are culture buildings" is a question for whoever
 * can ask `buildingDef`, which this module deliberately cannot.
 *
 * An array walk in the list's own order, which is the order the records were
 * written — a count is order-blind, but the shape of the loop is what the next
 * reader copies (CLAUDE.md's iteration rule).
 */
export function countFirsts(
  state: GameState,
  playerId: number,
  kind: FirstKind,
  keyMatches?: (key: string) => boolean,
): number {
  let total = 0;
  for (const record of state.firsts) {
    if (record.kind !== kind || record.playerId !== playerId) continue;
    if (keyMatches !== undefined && !keyMatches(record.key)) continue;
    total += 1;
  }
  return total;
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
   *
   * **There is a second clock, and it is deliberately not here** (batch M2,
   * `slate.ts`, "The two clocks"). This counter moves on *every* accepted
   * command, which is right for a town's own list — one hull moved into a
   * harbour mouth changes what a port makes — and far too blunt for the empire's
   * happiness walk, which no step can reach. The coarser *economy* clock beside
   * it moves only where a write could change those, and it lives in a `WeakMap`
   * rather than on this object precisely because this object is stringified into
   * every save hash: it is a cache key no rule reads, and a field would make it
   * a schema.
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
   * **What was done first** — one append-only row per ledger and key, in the
   * order the world wrote them (batch D2c, `FirstKind`).
   *
   * `contested`' twin one system over: that register settles which empire
   * reached an era first and this settles which reached a shelf, a roof, a
   * congregation or a technology first. It is on the **world** rather than on
   * the player for the one reading that has to be the world's — `techWorld`,
   * where being first means being before *everybody* — and keeping the empires'
   * own ledgers beside it is what stops there being two lists with one rule.
   *
   * Written in exactly one place (`markFirst`) and never edited, never pruned,
   * never ticked: a record is a fact with a turn on it, which is the discipline
   * every stamp in this game keeps. An array in write order for `camps`' stated
   * reason — every outcome that depends on an order depends on one the state
   * itself carries.
   */
  firsts: FirstRecord[];
  /**
   * **The Closed Book's record** (Scientific batch S9; the triage's reading
   * 50), or the key is absent, which it is in almost every game.
   *
   * Written once, in `settleResearch` (`tech.ts`), when an empire completes the
   * technology that opens the Magnum Opus before any other empire while its
   * law holds the `closedBook` rule. `until` is an absolute turn, the
   * discipline every timed effect keeps: `buildError` refuses the Opus to every
   * other empire that does not know that technology while `state.turn` is
   * below it. Nothing ticks it and nothing clears it; it simply stops
   * refusing. A world first is marked once, so the record is written at most
   * once a game.
   */
  closedBook?: ClosedBookRecord;
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
   * **The world's clock, and the only thing about it the state carries**
   * (batch G1, `docs/wager.md` §1 and §8).
   *
   * One absolute stamp — the age that is closing and the turn it closes on —
   * overwritten each time a close is decided. Both of the numbers a surface
   * asks for are folds of it and neither is stored: `worldAge` is the world's
   * *progress* (the mean of every living empire's highest technology, floored)
   * and `currentWorldAge` is the age the world is *in*. See `worldClock.ts`,
   * which is the whole of the reading.
   *
   * Absent means **no age has closed yet**, which is presence-is-state in the
   * `researchPlan` sense rather than a flag: a world in its first age has no
   * countdown to have started it (§1), and a save written before this batch
   * loads as exactly that.
   *
   * It replaced `BeadTable.worldAge`, a *stored* clock raised by `Math.max`
   * over the seats — the first-seat rule, and a second answer to a question the
   * technology lists already answer.
   */
  ageClose?: AgeClose;
  /**
   * **The wagers the world has been dealt**, one entry per age, append-only
   * (`docs/wager.md` §2, §8; batch G2).
   *
   * `Player.triumphs`' discipline at the scale of the board: nothing is ever
   * rewritten and nothing is ever removed, so the history of every age's table
   * is readable after the fact and a replay reaches the same list by the same
   * route. Absent — an empty array, or the field missing from a save written
   * before this batch — is the honest reading of a world that has not closed its
   * first age yet, which is exactly when the first deal happens.
   *
   * Every seat's stake lives on the seat (`Player.wager`) and every claim on the
   * deal (`WagerDeal.claimed`); the secrecy of a stake is a *screen's* rule and
   * not a rule of the state, for the reason `localPlayerId` is.
   */
  wagers: WagerDeal[];
  /**
   * **The census** — when the world is next measured, and every measurement it
   * has taken (`docs/wager.md` §10/§11, batch C1). See `CensusRegister`.
   *
   * One field rather than two on purpose: the next turn and the history are the
   * same subject with the same lifecycle, written in the same breath by the same
   * phase — the census is taken, the record is appended, the next turn is drawn
   * — and a screen that wants the last one wants the register anyway.
   */
  census: CensusRegister;
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
      // The second ink, on exactly the same terms and for the same reason: a
      // plain seat writes no key, so a roster from before the pair existed
      // normalises byte-identically (`PlayerSpec.secondary`).
      if (spec.secondary !== undefined) player.secondary = spec.secondary;
      // The persona, on exactly the same terms: written only when it is named,
      // so a roster from before personas existed normalises byte-identically.
      if (spec.persona !== undefined) player.persona = spec.persona;
      // And the figure, on the same terms again — which is what keeps a
      // leaderless roster's map the map it always was. See `PlayerSpec.leader`.
      if (spec.leader !== undefined) player.leader = spec.leader;
      // And the decks, on the same terms: a copy rather than an alias, so a
      // caller that keeps editing its own list cannot rewrite a game's seat.
      if (spec.decks !== undefined) player.decks = [...spec.decks];
      return player;
    }),
  };
  // The override sheet is copied through JSON for the same reason the player
  // specs are copied at all — the config is the save file and a caller that
  // keeps editing the object it handed in must not be able to rewrite a game's
  // map. The round trip also drops any `undefined` a partial was spread from,
  // so an empty sheet normalises to *no* sheet and the game is byte-identical
  // to one that never had the field.
  if (
    config.mapgenOverrides &&
    Object.keys(config.mapgenOverrides).length > 0
  ) {
    const copied = JSON.parse(
      JSON.stringify(config.mapgenOverrides),
    ) as MapgenOverrides;
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
  // The same rule for a seat's figure, and for the same reason one step in: a
  // leader biases the map (`PlayerSpec.leader`), so an id the sheet does not
  // carry is a config that would have generated a world nobody asked for.
  for (const spec of config.players) {
    if (spec.leader !== undefined && !isLeaderId(spec.leader)) {
      throw new Error(`Unknown leader "${spec.leader}"`);
    }
    // The decks, refused on the same terms (`PlayerSpec.decks`): a name off
    // the six, a deck named twice, or no deck at all is a seat that would draft
    // a game nobody asked for.
    if (spec.decks !== undefined) {
      if (!Array.isArray(spec.decks) || spec.decks.length === 0) {
        throw new Error(`Seat "${spec.name}" names no deck at all`);
      }
      for (const deck of spec.decks) {
        if (!isDeckId(deck)) throw new Error(`Unknown deck "${String(deck)}"`);
      }
      if (new Set(spec.decks).size !== spec.decks.length) {
        throw new Error(`Seat "${spec.name}" names a deck twice`);
      }
    }
  }
}

/**
 * A fresh Bead Race: an empty register, and nothing else.
 *
 * **It rolled nothing since batch Q1, and that is the whole change.** It used to
 * be the one place a deck was ordered — two ages' endeavours and quests shuffled
 * together with four reckonings drawn from the pool of eight, off the config's
 * own generator, so that a seed *was* a deal and every seat looked at the same
 * table. The deeds are retired and there is no deal, so the function takes no
 * generator: the rolls it spent are the reason a v106 log does not replay
 * (`SCHEMA_VERSION`).
 *
 * No clock here since batch G1 either. The world begins in its first age because
 * nothing has closed one yet (`GameState.ageClose` absent), which is a fact about
 * the calendar rather than about anything this function builds.
 */
function newBeadTable(): BeadTable {
  return { claimed: [] };
}

/**
 * **How many turns until the next census** — one roll, uniform over
 * `[rules.census.min, rules.census.max]` inclusive (`docs/wager.md` §11).
 *
 * It lives here rather than in `census.ts` because `newGame` draws the first
 * one and `state.ts` may not import the phase that draws the rest — the runtime
 * cycle every helper in this file is placed against. `census.ts` reads it back
 * from here, so there is exactly one expression in the game for "how long until
 * the world is measured again" and a seed is a calendar on both sides of it.
 *
 * `nextInt`'s upper bound is exclusive and this rule's is not, which is the
 * `+ 1`: the user's ruling says *thirteen to seventeen*, and seventeen is a gap
 * the world can actually draw.
 */
export function drawCensusInterval(rng: Rng): number {
  const min = Math.max(1, Math.floor(RULES.census.min));
  const max = Math.max(min, Math.floor(RULES.census.max));
  return nextInt(rng, min, max + 1);
}

/**
 * The world's opening census register: nothing measured yet, and the first
 * measurement already on the calendar.
 *
 * Drawn **after** the two decks are shuffled (see the call site), so a game's
 * opening hands are exactly the hands they were before this batch and only the
 * draws downstream of the first census move.
 */
function newCensusRegister(rng: Rng, startingTurn: number): CensusRegister {
  return { nextTurn: startingTurn + drawCensusInterval(rng), taken: [] };
}

/**
 * Builds the initial state. Deterministic in `config` alone: the same config
 * always produces a byte-identical state.
 */
export function newGame(config: GameConfig): GameState {
  const normalized = normalizeConfig(config);
  validateConfig(normalized);

  // The roster is a **fourth input to the map**: a seat's figure biases where it
  // stands and what grows there (`PlayerSpec.leader`, the three stages). A
  // roster with no figures in it generates the map it always generated.
  const map = generateMap(
    normalized.seed,
    normalized.sizeName,
    normalized.mapgenOverrides,
    normalized.players,
  );
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
      // The second ink, on exactly the same terms: presence is the state, so a
      // seat that named none has no key and a game with no figures in its
      // roster serialises exactly as it did before the pair existed.
      ...(spec.secondary === undefined ? {} : { secondary: spec.secondary }),
      ...(spec.persona === undefined ? {} : { persona: spec.persona }),
      // The figure, on exactly the same terms and for the same reason: a seat
      // that named none has no key, so a leaderless game is byte-identical to a
      // game from before leaders existed (pinned, `test/sim/leaders.test.ts`).
      ...(spec.leader === undefined ? {} : { leader: spec.leader }),
      // **The seat's decks, fixed for the game** (D1a): the config's own list
      // if it named one, else the figure's — and all six for a seat under
      // nobody (`leaderDecks` states why). Copied, never aliased.
      decks: spec.decks === undefined ? leaderDecks(spec.leader) : [...spec.decks],
      // Nothing chartered yet: the three lists grow on a charter's pick and
      // nowhere else (`applyCharter`). Fresh every time, for `techsResearched`'s
      // reason.
      charteredTechs: [],
      charteredBuildings: [],
      charteredRites: [],
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
      goldSpent: 0,
      faithSpent: 0,
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
      renownEarned: 0,
      unitsKilled: 0,
      unitsLost: 0,
      // Fresh every time rather than a shared literal, for `techsResearched`'s
      // reason: a realm's own running totals must not be written into every
      // seat's books at once.
      wagerTotals: {},
      pendingMalices: [],
      malices: [],
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
    visibility: normalized.players.map(() =>
      newVisibilityGrid(map.tiles.length),
    ),
    citySightings: normalized.players.map(() => []),
    camps: [],
    // Nothing has been built yet, which is what an empty claim register means.
    wonders: [],
    // Nobody has been recruited and nothing has been claimed, which is what two
    // empty registers mean.
    recruited: [],
    contested: [],
    // Nothing has been done yet, so nothing has been done first.
    firsts: [],
    // Nobody has founded anything, which is what an empty register means.
    religions: [],
    // Nobody is at war and nobody owes anybody peace. Two empty registers, and
    // a world that never fights serialises with both of them empty forever.
    wars: [],
    truces: [],
    deals: [],
    dealProposals: [],
    // The world's register, empty. There is no deal to seed since batch Q1 —
    // the deeds are retired and a bead comes from a wager kept or from a thing
    // that hands one over (see `beads.ts`).
    beads: newBeadTable(),
    // Append-only, and empty until the first age closes: a world in its first
    // age has been dealt nothing (`docs/wager.md` §2 — no wager in Æra I).
    wagers: [],
    // **The first census is on the calendar before the first piece is placed**
    // (batch C1), and it is drawn *here* — after the decks above — so the
    // opening hands are unmoved and only what follows the first census shifts.
    census: newCensusRegister(rng, RULES.game.startingTurn),
    winnerId: null,
  };
  placeStartingUnits(state, normalized.players);
  // **The council is fitted to the law once the law exists.** Each seat's
  // Statecraft was built to the chiefdom's bare spread by `newPlayerStatecraft`,
  // which holds no state and cannot read a figure's abilities — and a figure
  // whose ability opens a chair (Ibn Battuta's `slotRider`) is in the law from
  // this moment, not from the first adoption. So this is the one seam that
  // grants a `slotRider` under a standing reign (`refitSlots`' register), and it
  // runs before the wild is seated because the wild's chiefdom is nobody's to
  // widen.
  for (const player of state.players) refitSlots(state, player);
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
function placeStartingUnits(state: GameState, seats: readonly PlayerSpec[]): void {
  // The seats' own sites, scored each by its own figure's bias — and exactly the
  // sites `placeResources` guaranteed food, luxuries and strategics at, because
  // both ask the same pure function the same question (`chooseStartPositionsFor`,
  // `startPositions.ts`). A leaderless roster takes the unbiased chooser
  // untouched, which is what keeps every start of every seed where it was.
  const starts = chooseStartPositionsFor(state.map, seats);
  for (const placement of planStartingUnits(
    state.map,
    starts,
    RULES.startingUnits,
  )) {
    const player = state.players[placement.ownerIndex];
    if (!player) continue;
    createUnit(
      state,
      player.id,
      placement.unitType,
      placement.col,
      placement.row,
    );
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
    name: "Barbarians",
    // The simulation never interprets a colour (see `PlayerSpec`); the diorama
    // maps this one onto `palette.wildRed` in `data/view3d.json`, and every
    // panel that prints a seat's ink — a camp's banner, the info card, the
    // spectator's feed — reads the same string. The wild used to be raven, with
    // its red spent on a rim, and the rim was close enough to the crimson seat
    // to be read as another empire's (user, 2026-09-08). The red is the *base*
    // now and the rim is nobody's; changing the value here is a config change
    // and moves no outcome, because nothing in `src/sim/` ever reads it.
    color: "#7a1f2b",
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
    goldSpent: 0,
    faithSpent: 0,
    eliminated: false,
    barbarian: true,
    // **No decks and nothing chartered, ever**: the wild drafts nothing
    // (`runStatecraft` skips it), so its pool is empty by construction. Present
    // so that every reader may index a seat without asking which kind it is.
    decks: [],
    charteredTechs: [],
    charteredBuildings: [],
    charteredRites: [],
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
    renownEarned: 0,
    unitsKilled: 0,
    unitsLost: 0,
    // Present so every reader may index a seat without asking which kind it is,
    // and filled by nothing: the `wagers` phase skips the wild the way the
    // `beads` phase does. The wild is dealt no card and stakes nothing.
    wagerTotals: {},
    pendingMalices: [],
    malices: [],
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
  /**
   * **Which bank paid for this piece**, where one did — Mercenaries' hired
   * sword (`CardUnitStampEffect.bought`).
   *
   * `gift`'s neighbour and the same argument for a parameter: it cannot be
   * derived from anything this routine can see (the roster row, the town and the
   * hex are identical whether a warrior was mustered or bought), and the module
   * that *does* know may not read the cards back — `statecraft/evaluator.ts` is
   * the only switch on a `CardEffect.kind`. So the fact travels down from
   * `purchaseItemAt` through `RealiseOptions.bought` and is handed to
   * `cardUnitStamp` here. Absent is a birth nobody paid a till for, which is
   * every completion, every grant and every escort out of a ruin.
   */
  bought?: 'gold' | 'faith',
  /**
   * **Which levy raised this piece**, where one did (Expansionist batch E1).
   * `bought`'s neighbour and the same argument for a parameter: only the levy
   * knows it. Handed to `cardUnitStamp`, so a stamp narrowed to levied pieces
   * reaches this one, and written as `Unit.levied`. Absent is every birth no
   * levy made.
   */
  levied?: LevyUse,
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
  const stamp = cardUnitStamp(state, ownerId, { col, row }, type, bought, levied);
  // **What the law hangs on the piece for a while** (Commerce batch T6,
  // Mercenary Contracts' twenty turns without upkeep). Read here, beside the
  // stamp and narrowed the same way, because this is the one place a piece
  // comes into existence and the bank that paid is known only here. Each entry
  // carries an absolute expiry; see `cardBirthTimedEffects`.
  const hung = cardBirthTimedEffects(state, ownerId, { col, row }, type, bought, levied);
  // The caller's own mark, folded into the law's before anything is read off it:
  // one field, one writer, and a piece that is a veteran twice over carries the
  // sum. Voice by voice, because a mark on a levy and a mark on the whole army
  // are two reasons for the same point.
  if (gift !== undefined) {
    if (gift.hp !== undefined) stamp.hp = (stamp.hp ?? 0) + gift.hp;
    if (gift.strength !== undefined)
      stamp.strength = (stamp.strength ?? 0) + gift.strength;
    if (gift.movement !== undefined)
      stamp.movement = (stamp.movement ?? 0) + gift.movement;
  }
  const stamped = Object.keys(stamp).length > 0;
  const unit: Unit = {
    id: allocateEntityId(state),
    ownerId,
    type,
    col,
    row,
    // The empire's own share rides in beside the stamp (batch R2): a swordsman
    // raised while its empire controls iron is born at the higher figure, not
    // ten points wounded. `unitMaxHp` refuses it for a civilian, so a settler is
    // still born at the roster's number.
    hp: unitMaxHp({ type, ...(stamped ? { stamp } : {}) }, unitHealthBonus(state, ownerId)),
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
  // The levy that raised it, written last and only when there was one, for the
  // same reason (Expansionist batch E1). See `Unit.levied`.
  if (levied !== undefined) unit.levied = levied;
  // The timed effects the law hung on it at birth, written only when there are
  // some, for the same reason (Commerce batch T6). See `Unit.timed`.
  if (hung.length > 0) unit.timed = hung;
  state.units.push(unit);
  // **A piece standing in a town is a line of the empire's contentment** (batch
  // M3, `slate.ts`): The Long Watch pays "+1 happiness for each unit standing in
  // one of your cities" — `pays` at `where: 'empire'`, `count: 'garrison'` — so
  // where a piece *is* reaches `explainHappiness` through the card evaluator.
  // That is the correction batch M3's shadow run found in M2's table, and it is
  // why every seam that creates, removes, takes or moves a piece announces.
  bumpEconomy(state);
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
  // `createUnit`'s announcement, the other way round — see it for the garrison
  // The Long Watch counts (batch M3, `slate.ts`).
  bumpEconomy(state);
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
/**
 * **The one subtraction that spends a player's gold on something** — the coin
 * out of the treasury and the almoner's ledger raised, together.
 *
 * A seam rather than five copies of two lines, for the reason `captureUnit`
 * below is one: the pair is a *rule* ("what leaves the purse is written down"),
 * and five places each remembering to write it down is five places one of them
 * can forget. It is here in `state.ts` because the five callers live in four
 * modules that do not import one another, and because the fields are this file's.
 *
 * `bumpEconomy` rides with it: the banks are a line of the meters (batch M3), so
 * every seam that moves the treasury already announced it and now announces it
 * in one place.
 *
 * **Only a purchase**, and the register of what that means is on
 * `Player.goldSpent` — the two `gold -=` that stay outside this function are
 * named there, with the reason each is not spending. A caller with a figure it
 * does not want written down subtracts for itself and says why.
 */
export function spendGold(
  state: GameState,
  player: Player,
  amount: number,
): void {
  player.gold -= amount;
  // The ledger takes what actually left. A refund is not a thing and a negative
  // price is not a purchase, so nothing here can lower the record.
  if (amount > 0) player.goldSpent += amount;
  bumpEconomy(state);
}

/**
 * **The one subtraction that spends a player's faith** (Devotion batch DV3):
 * the faith out of the bank and `Player.faithSpent` raised, together. It is
 * `spendGold`'s twin, and it is one function for the same reason: seven places
 * spend faith, and seven copies of the record would be seven chances to forget
 * it. The list of the seven is on `Player.faithSpent`.
 *
 * `clampAtZero` keeps the bank from going below zero, which is what the rites,
 * the rerolls and the ladder have always done. The record then counts only
 * what the bank held, because that is what actually left it. The other callers
 * check the price against the bank before they spend, so they subtract the
 * price as it is.
 *
 * `bumpEconomy` rides with it, as it does with `spendGold`: the banks are a
 * line of the meters (batch M3).
 */
export function spendFaith(
  state: GameState,
  player: Player,
  amount: number,
  clampAtZero = false,
): void {
  const before = player.faithPool;
  const paid = clampAtZero ? Math.min(amount, Math.max(0, before)) : amount;
  player.faithPool = clampAtZero ? Math.max(0, before - amount) : before - amount;
  // A refund and a negative price are not spending, so nothing here can lower
  // the record.
  if (paid > 0) player.faithSpent += paid;
  bumpEconomy(state);
}

export function captureUnit(
  state: GameState,
  unit: Unit,
  ownerId: number,
): void {
  const before = unit.ownerId;
  unit.ownerId = ownerId;
  // A garrison that changed sides is two empires' contentment — `createUnit`'s
  // announcement, made once for the pair (batch M3, `slate.ts`).
  bumpEconomy(state);
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
  // **The first town an empire founds is its original seat**, and the fact is
  // written here because this is the one moment it can be known: the seat is
  // "the first city in founding order" only until that city is taken, and the
  // raze rule needs the answer long after (`City.originalCapital`).
  if (!state.cities.some((other) => other.ownerId === ownerId)) {
    city.originalCapital = true;
    city.originalCapitalOf = ownerId;
  }
  state.cities.push(city);
  // **A town on the board is a line in three walks** (batch M3, `slate.ts`):
  // the authority it costs, the citizens it charges to happiness, and the ground
  // `controlledHoldings` reads through `tileOwnerField`, which is a map of city
  // ids. Announced here, at the one place a city comes into existence.
  bumpEconomy(state);
  return city;
}

/** A town with nobody in the trades yet. The one place the zeros are written. */
export function newCitySpecialists(): Record<SpecialistFamily, number> {
  const counts = {} as Record<SpecialistFamily, number>;
  for (const family of SPECIALIST_FAMILIES) counts[family] = 0;
  return counts;
}

/**
 * **The town now has this building, and remembers the turn it did** — the one
 * writer of `City.buildings` and of `City.buildingTurns` beside it (batch D2d).
 *
 * `raiseImprovement`'s bargain one scale up (`map.ts`): a shelf and a date that
 * must never be written apart, said once here rather than as two lines at each
 * of the three seams that put stones in a town — a completed or bought row
 * (`realiseItem`), a founding law's free Monument (`foundCityAt`) and an
 * apostle's relic (`placeRelicAt`). Any fourth way a building ever joins a town
 * comes through here, and that is the whole rule.
 *
 * **Idempotent by the shelf**: a town that already holds the row is left exactly
 * as it was, stamp included, which is the reading the founding rider already
 * took and the only honest one — a Monument that has stood fifty turns does not
 * become new because a second law would have granted it.
 *
 * Answers whether anything was written, for a caller that wants to know.
 */
export function addBuilding(
  state: GameState,
  city: City,
  building: BuildingId,
  /**
   * **Which bank paid**, where a till rang (batch C8). Absent is every other way
   * stones arrive — a completion, a card's grant, a founding Monument, a relic —
   * and writes no entry at all.
   *
   * A parameter for `RealiseOptions.bought`'s stated reason: nothing this
   * function can see distinguishes a bought building from a built one, so the
   * only place the fact exists is the caller that took the money.
   */
  bought?: 'gold' | 'faith',
): boolean {
  if (city.buildings.includes(building)) return false;
  city.buildings.push(building);
  // Presence is the state and the record is built on demand, `itemProgress`'
  // convention: a town that has raised nothing serialises exactly as one from
  // before the field existed.
  (city.buildingTurns ??= {})[building] = state.turn;
  // The same convention for the bank, one step stricter: a town that has bought
  // nothing carries no object either, so the common case adds nothing to a save.
  if (bought !== undefined) (city.buildingBanks ??= {})[building] = bought;
  return true;
}

/**
 * **Which bank paid for this building in this town**, or `undefined` where
 * nobody bought it — the one reading of `City.buildingBanks` (batch C8).
 *
 * `buildingAge`'s twin, and `undefined` means the same kind of thing it means
 * there: not "this was free", but "this town cannot show that anyone bought it".
 * A building the town does not hold answers `undefined` too, so a caller never
 * has to check the shelf first.
 */
export function buildingBank(
  city: City,
  building: BuildingId,
): 'gold' | 'faith' | undefined {
  if (!city.buildings.includes(building)) return undefined;
  return city.buildingBanks?.[building];
}

/**
 * **How many turns this building has stood in this town**, or `undefined` where
 * the town does not hold it or holds it with no stamp.
 *
 * `improvementAge`'s twin (`map.ts`) and the one reading of `City.buildingTurns`:
 * a subtraction against `state.turn`, so nothing ticks. `undefined` rather than
 * zero for a stamp-less row, so every caller reads "cannot be shown to be old
 * enough" rather than "new".
 */
export function buildingAge(
  state: GameState,
  city: City,
  building: BuildingId,
): number | undefined {
  if (!city.buildings.includes(building)) return undefined;
  const raised = city.buildingTurns?.[building];
  if (raised === undefined) return undefined;
  return state.turn - raised;
}

/**
 * The claim on a wonder, or `undefined` while it is still unbuilt.
 *
 * **The** question, asked by everything that has an opinion about wonders: the
 * build gate, the purchase gate, the panel's greyed row and the sculpt. A linear
 * scan of a list that holds at most one row per wonder in the game — see
 * `GameState.wonders` for why an array is the right shape here.
 */
export function wonderClaim(
  state: GameState,
  building: BuildingId,
): WonderClaim | undefined {
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
  // The register is history and the *effects* follow the stones, so this line
  // changes no meter by itself — but `liveEffects` guards its wonder sweep on
  // `state.wonders.length`, so the first claim in a game opens a source that was
  // closed a moment ago. Announced for that clause (batch M3, `slate.ts`).
  bumpEconomy(state);
  return claim;
}

// --- the revision -----------------------------------------------------------

/**
 * **The world moved** — the one writer of `GameState.revision`, and the broad
 * announcement of the two (batch M2).
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
 *
 * **It moves the economy clock too**, and that is why it is the one to reach
 * for. Batch M2 put a coarser second counter beside the revision (`slate.ts`,
 * "The two clocks") so that a scout's step stops throwing away the empire's
 * happiness walk; this function is the announcement that says *the world moved*
 * and nothing about how much of it, which is exactly what a bench poking the
 * state by hand means by it. Saying the narrower thing is `bumpPiecesOnly`, and
 * it has exactly one caller.
 */
export function bumpRevision(state: GameState): void {
  state.revision += 1;
  bumpEconomy(state);
}

// --- sunk progress (schema 111) ---------------------------------------------

/**
 * The key a queue row banks its hammers under — `"building:granary"`,
 * `"unit:archer"`, `"project:tithes"`.
 *
 * A row is a `kind` and an `id` and nothing else, so the two spelled out with a
 * colon between them is the whole identity of the thing being built. It lives
 * here, beside `QueueItem` itself, because every module that re-heads a queue
 * needs it and `state.ts` is the leaf all of them already import — a helper in
 * `cities.ts` would be an import edge from `combat.ts` to buy two words.
 *
 * `kind` is a closed union and an `id` is an identifier, so the pair cannot
 * collide across kinds and the key is stable across saves.
 */
export function queueItemKey(item: QueueItem): string {
  return `${item.kind}:${item.id}`;
}

/**
 * Beakers this empire has banked toward `techId` — the current aim's own
 * bucket, or the one parked under its name.
 *
 * **The** reading of "how far along is that technology", and the one place
 * `techProgress`' absence turns into nought, so a state from before the field
 * reads as an empire that has never switched rather than as a crash.
 */
export function bankedTowardTech(player: Player, techId: TechId): number {
  if (player.researching === techId) return player.sciencePool;
  return player.techProgress?.[techId] ?? 0;
}

/**
 * Hammers this town has banked toward `item` — the front row's own basket, or
 * the one parked under its key.
 *
 * `bankedTowardTech`'s twin, and it takes the **item** rather than a queue
 * index for the reason the estimates take one: the panel asks this of a row it
 * is drawing, and a row's progress is a fact about the row and not about where
 * it happens to be standing this turn. A row at the front is the basket by
 * definition, which is why the front is asked first.
 */
export function bankedTowardItem(city: City, item: QueueItem): number {
  const front = city.queue[0];
  if (front && front.kind === item.kind && front.id === item.id) return city.hammerBasket;
  return city.itemProgress?.[queueItemKey(item)] ?? 0;
}

/**
 * The key the town's basket is aimed at right now, or `null` for an empty
 * queue — read *before* a queue is touched and handed to `reaimProduction`
 * after.
 */
export function frontKey(city: City): string | null {
  const front = city.queue[0];
  return front ? queueItemKey(front) : null;
}

/**
 * Forgets what was banked toward a row that has left this town's queue for
 * good and cannot come back — a building already standing, a wonder the world
 * has given to somebody else.
 *
 * A bucket under a row nothing can ever re-queue is hammers no town can ever
 * spend, and the two seams that produce one (`planProduction`'s `drop`,
 * `refundBeatenWonders`) each say out loud why the row is gone. Everything else
 * that leaves a queue may be queued again, and its bucket waits for it.
 */
export function forgetItemProgress(city: City, item: QueueItem): void {
  parkHammers(city, queueItemKey(item), 0);
}

/** Parks `amount` under `key`, deleting the key rather than banking nothing. */
function parkHammers(city: City, key: string, amount: number): void {
  if (amount > 0) {
    if (!city.itemProgress) city.itemProgress = {};
    city.itemProgress[key] = amount;
    return;
  }
  if (city.itemProgress) {
    delete city.itemProgress[key];
    if (Object.keys(city.itemProgress).length === 0) delete city.itemProgress;
  }
}

/** Takes what is banked under `key` out of the parking, or nought. */
function unparkHammers(city: City, key: string | null): number {
  if (key === null || !city.itemProgress) return 0;
  const banked = city.itemProgress[key] ?? 0;
  delete city.itemProgress[key];
  if (Object.keys(city.itemProgress).length === 0) delete city.itemProgress;
  return banked;
}

/**
 * **The one seam a city's hammers change hands at** (schema 111).
 *
 * Called *after* a queue has moved, with the key that was at the front
 * *before* it moved, and it reconciles the basket with the row now standing
 * there. Two rules, and each is the user's ruling read at one of the two
 * moments a queue can change:
 *
 *   · a **switch** (`kept: true`) — the old row is still owed hammers, so what
 *     is in the basket is *its* progress and is parked under its name. The new
 *     front starts at whatever it had banked, which is nought the first time
 *     and everything it had the second.
 *   · a **completion** (`kept: false`) — a thing finished, was bought, or was
 *     dropped as unbuildable, so nothing is owed it. What is in the basket is
 *     overflow, it was never spent toward that row, and it follows the *queue*
 *     to whatever came up — which is exactly what overflow has always done.
 *
 * A front that did not move is a no-op, which is what makes it safe to call
 * from every seam rather than only from the ones that might have moved it: The
 * Standing Levy's jump splices a unit out of the middle and leaves the head
 * alone, and this says so by saying nothing.
 *
 * `before` is `null` for a queue that was empty, and then the basket's unaimed
 * hammers carry into the new front on top of whatever it had — a town that
 * banked while it had nothing to build has not spent those hammers on anything
 * yet, so there is nothing to keep them with.
 */
export function reaimProduction(city: City, before: string | null, kept: boolean): void {
  const front = city.queue[0];
  const after = front ? queueItemKey(front) : null;
  if (before === after) return;
  if (before !== null && kept) {
    parkHammers(city, before, city.hammerBasket);
    city.hammerBasket = 0;
  }
  city.hammerBasket += unparkHammers(city, after);
}

/**
 * **The one seam an empire's beakers change hands at** (schema 111) — points
 * `sciencePool` at `next`, parking what it holds under the technology it was
 * aimed at.
 *
 * `reaimProduction`'s twin one bucket over, and it takes the same two readings
 * of the same ruling: an aim that *moves* leaves its beakers behind under the
 * old node's name, and an empire aiming from nothing (a fresh game, and the
 * instant after a completion, when what is in the pool is overflow) carries
 * what it holds into the new node on top of whatever that node had banked.
 *
 * The two writers of `researching` — `writeResearchPlan` and
 * `promoteResearchQueue`, both in `tech.ts` — go through here, which is the
 * whole of the invariant: there is no other way to move the aim, so there is no
 * way to strand a bucket or to spend one twice.
 *
 * It announces nothing, and takes no state so that it cannot: the empire's total
 * beakers do not move here — one bucket is emptied into another — and every
 * caller announces anyway (`applyCommand`'s own clock for the two commands,
 * `settleResearch` for the promotion). See its row in `slateRegister.test.ts`.
 */
export function aimResearchAt(player: Player, next: TechId | null): void {
  const before = player.researching;
  if (before === next) return;
  if (before !== null) {
    if (player.sciencePool > 0) {
      if (!player.techProgress) player.techProgress = {};
      player.techProgress[before] = player.sciencePool;
    }
    player.sciencePool = 0;
  }
  player.researching = next;
  if (next !== null && player.techProgress) {
    player.sciencePool += player.techProgress[next] ?? 0;
    delete player.techProgress[next];
    if (Object.keys(player.techProgress).length === 0) delete player.techProgress;
  }
}

/**
 * **Banks beakers toward one technology** (Dominion batch D5, Copying the
 * Enemy): into the pool when it is the current aim, and into that
 * technology's own bucket (`techProgress`) otherwise, so the beakers wait for
 * the empire to aim at it. A technology already learnt banks nothing. The
 * caller settles research, as every windfall that pays science does.
 */
export function bankTowardTech(
  state: GameState,
  player: Player,
  techId: TechId,
  amount: number,
): void {
  if (amount <= 0 || player.techsResearched.includes(techId)) return;
  if (player.researching === techId) {
    player.sciencePool += amount;
  } else {
    if (!player.techProgress) player.techProgress = {};
    player.techProgress[techId] = (player.techProgress[techId] ?? 0) + amount;
  }
  // The banks are a line of the meters (`collectYields`, batch M3).
  bumpEconomy(state);
}

/**
 * Forgets what was banked toward `techId` — called the instant it is learnt.
 *
 * A bucket under a technology the empire already holds is beakers nobody can
 * ever spend, and it would come back as a windfall the day a Great Library
 * grant handed the node over while a bucket sat under it. Swept rather than
 * refunded: the beakers were spent on the thing, and the thing arrived.
 */
export function clearTechProgress(player: Player, techId: TechId): void {
  if (!player.techProgress) return;
  delete player.techProgress[techId];
  if (Object.keys(player.techProgress).length === 0) delete player.techProgress;
}

/**
 * **Only the pieces moved** — the revision, and not the economy clock beside it.
 *
 * `applyCommand`'s narrow door and nowhere else's (batch M2). A seat sends
 * dozens of commands a turn that move a piece and nothing else — a step, a
 * fortification, a unit put to sleep — and under one counter every one of them
 * threw away the empire's holdings and meters, which no step can reach. Which
 * commands may come through here is a **register** rather than a judgement made
 * at the call site: `COMMAND_CLOCKS` in `commands.ts`, one row per
 * `Command['type']`, with the arrival's own outcome deciding the one kind whose
 * answer is not a property of its kind.
 *
 * Deliberately not exported to the benches: a hand that pokes the state knows it
 * moved the world and cannot know it moved nothing else, so it calls
 * `bumpRevision` and is merely slower than it had to be. Wrong in that direction
 * is a miss; wrong in the other is a stale answer.
 */
export function bumpPiecesOnly(state: GameState): void {
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
export function capitalCityOf(
  state: GameState,
  playerId: number,
): City | undefined {
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
      if (age !== undefined && ageOf !== undefined && ageOf(id) !== age)
        continue;
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
