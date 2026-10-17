/**
 * **The register of announced writes** — batch M3 (`docs/flags.md` item (ggg),
 * the M3 paragraph; `src/sim/slate.ts`, "the bump moves to the mutation").
 *
 * Batches M1 and M2 kept the slate honest by **suspending** it: `applyCommand`
 * and each end-of-turn phase opened a write window, and inside one every tenant
 * computed fresh. Measured, that window was where the time went — 57,000 asks a
 * 150-turn game, 8% of the clock, and 99.8% of them answering with the value the
 * ask before them had computed. M3 closes the window and replaces it with one
 * rule: **a write announces itself at the write**.
 *
 * A rule like that is worth exactly what a test of it is worth, and this is that
 * test. It reads `src/sim` for every mutation of a field a slate tenant folds
 * and requires the function it sits in to be one of two things: a function that
 * announces (`bumpEconomy` / `bumpRevision` in its own body), or a row of
 * `EXCUSED` with the reason written down. **A new unannounced write fails core
 * the day it is written.**
 *
 * ---
 *
 * **How the field list was derived, and why it is this list.**
 *
 * The slate has five tenants. Three of them — `readCity`, `readEmpire`,
 * `readEmpirePercents` — live in `readings.ts`, and **no module in `src/sim`
 * imports `readings.ts`**: it cannot, because that is the runtime cycle
 * `test/mapgen/moduleCycles.test.ts` gates. So those three can only ever be
 * asked at rest, from `src/ui` and `src/ai`, where the command's and the phase's
 * own `bumpRevision` has answered for them since batch E2 and still does. The
 * claim is pinned below rather than asserted in prose.
 *
 * That leaves the two tenants the simulation asks *of itself*, mid-write:
 *
 *   · **`meterEffects`** (`meters.ts`) — the fold of `explainHappiness` and
 *     `explainAuthority`. Between them they read: the empire's luxuries
 *     (`controlledHoldings`, below), its law (`liveEffects` — the government,
 *     Doctrines, slotted Orders, pantheon beliefs, the wonders and one-of-a-kind
 *     rows its towns hold, legacies, what the realm is carrying that runs out,
 *     the caps its beads pay, its technologies, and the religions whose holy
 *     city it holds), the city-local half of that law (`cityLocalEffects` — a
 *     town's rites and its followers' beliefs), every owned town's `buildings`,
 *     `population`, `puppet`, `captured`, `name` and centre hex, the ages it
 *     has advanced (`techsResearched`), and since batch WC2 the war losses it
 *     and every other empire have suffered (`Player.warLosses`, the war
 *     weariness lines).
 *   · **the pieces**, and this is the correction batch M3 made to M2's table.
 *     M2 put `meterEffects` on a clock a march could not move, on the claim that
 *     `meters.ts` never opens `state.units`. It does not — but the *card
 *     evaluator* it folds does: The Long Watch pays "+1 happiness for each unit
 *     standing in one of your cities" (`pays` at `where: 'empire'`, `count:
 *     'garrison'`), so a piece created, killed, taken or **moved** changes an
 *     empire's contentment. The shadow run found it on turn 117 of a bot game
 *     (a bought spearman, the count 8 → 9); every seam that writes a unit's
 *     existence, owner or position announces, and `docs/bot-priorities.md` has
 *     the finding.
 *   · **the banks and the camps**, the shadow run's second finding. The card
 *     evaluator's `count` vocabulary reads `Player.gold` and `Player.faithPool`
 *     (`bankedGold`, `bankedFaith` — Pilgrim Roads pays "+1 happiness for each
 *     50 banked faith"), the camps an empire can see (`visibleCamps`) and the
 *     hexes its citizens work (`workedHills`). So a treasury banked, a camp
 *     raised or burnt and a sight refreshed are all writes of this kind. Found
 *     on turn 110 of a bot game, inside `collectYields`' own banking loop.
 *   · **`controlledHoldings`** (`cities.ts`) — the ground: `state.tileOwner`
 *     against `state.cities`' owners, each owned tile's `improvement` (through
 *     `openedResource`, whose other clauses are a reveal technology and a town
 *     standing on the seam), and what a bargain lent away or lent in
 *     (`state.deals`).
 *
 * Every field named there is a row of `WRITES` below. Three of them are worth
 * saying out loud because they are not obvious:
 *
 *   · **`state.turn`** — a deal, a rite and a seal all expire by *comparison*
 *     against it (CLAUDE.md: "timed effects are comparisons, never countdowns"),
 *     so the clock ticking changes what an empire holds with nothing else on the
 *     board different;
 *   · **`City.workedTiles`** — an empire-wide card clause may count worked
 *     hexes, so a reassignment is a write of this kind. It is also the one
 *     write in the game made every turn on every town with the same answer, so
 *     `assignCitizens` announces **only when the citizens actually moved**;
 *   · **`Religion.name` and a town's name** — they are printed *in* the lines
 *     `explainHappiness` returns, and hard rule 5 says the list is the reading.
 *     A rename moves no number and still changes the answer.
 *
 * **The lesson both corrections teach**: the field list is not "what
 * `meters.ts` reads", it is what the whole fold reaches — and the fold goes
 * through the card evaluator, whose `count` vocabulary can read almost anything
 * on the board. So **a new `count` kind is a new row of this register**, and the
 * shape of the check is the one that catches it: the sweep is broad, the
 * exclusions are named, and the shadow run (`test/slateShadow.ts`) is what
 * proves the list complete on the boards the suite actually plays.
 *
 * **An announcement goes after the write it announces.** One line early is an
 * answer taken again one line too early — `advanceAlongPath` writes the piece's
 * hex and then calls `arriveOnTile`, which asks the meters.
 *
 * Excluded, with the reason: **test files** (a bench that pokes the state by
 * hand is a writer and calls `bumpRevision`, which is the contract stated on
 * `GameState.revision` since batch E2 and unchanged by this batch) and
 * **`src/sim/mapgen`** together with `newGame`'s own board-building, which run
 * before any tenant exists and before any board has a slate.
 *
 * Core tier: a source-reading register test is always core (CLAUDE.md).
 */

import { describe, expect, it } from 'vitest';

/**
 * The sources, read as text — `verbs.test.ts`' idiom and for its reason: a name
 * is a fact about the file, and a test that imported the module would be asking
 * the runtime about a question the source answers. A **glob** rather than a
 * list, so a file added under `src/sim` tomorrow is governed the day it exists;
 * `mapgen/` is excluded in the filter below, with the reason in the docblock.
 */
const SOURCES = {
  ...import.meta.glob('../../src/sim/*.ts', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../../src/sim/yields/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
  ...import.meta.glob('../../src/sim/statecraft/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
} as Record<string, string>;

/** `path → source`, `mapgen/` and the tests excluded, in a stable order. */
function simFiles(): { path: string; file: string; text: string }[] {
  return Object.entries(SOURCES)
    .filter(([path]) => !path.includes('/mapgen/') && !path.endsWith('.test.ts'))
    .map(([path, text]) => ({
      path: path.replace('../../', ''),
      file: path.slice(path.lastIndexOf('/') + 1),
      text,
    }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
}

/**
 * The writes, one row a field a tenant folds. The pattern is deliberately
 * *broad* — `.population +=` matches a report entry's field as well as a town's
 * — because a register that narrowed its patterns to what it already knew about
 * would stop catching the thing it is for. What the breadth costs is a handful
 * of rows in `EXCUSED`, each naming the object it actually writes.
 */
const WRITES: { field: string; pattern: RegExp }[] = [
  { field: 'tileOwner', pattern: /state\.tileOwner\[[^\]]*\]\s*=[^=]/ },
  { field: 'improvement', pattern: /\.improvement\s*=[^=]|delete\s+\w+(\.\w+)*\.improvement/ },
  { field: 'cities', pattern: /state\.cities\.(push|splice)\(|state\.cities\s*=[^=]/ },
  { field: 'ownerId', pattern: /\.ownerId\s*=[^=]/ },
  { field: 'population', pattern: /\.population\s*(=[^=]|\+=|-=)/ },
  { field: 'puppet', pattern: /\.puppet\s*=[^=]|delete\s+\w+(\.\w+)*\.puppet/ },
  { field: 'captured', pattern: /\.captured\s*=[^=]|delete\s+\w+(\.\w+)*\.captured/ },
  { field: 'buildings', pattern: /\.buildings\.(push|splice)\(|\.buildings\s*=[^=]/ },
  { field: 'techs', pattern: /\.techsResearched\.(push|splice)\(|\.techsResearched\s*=[^=]/ },
  { field: 'slots', pattern: /\.slots\[[^\]]*\]\s*=[^=]|\.slots\s*=[^=]|\.slots\.(push|splice)\(/ },
  { field: 'government', pattern: /\.government\s*=[^=]/ },
  { field: 'doctrines', pattern: /\.doctrines\.(push|splice)\(|\.doctrines\s*=[^=]/ },
  {
    field: 'beliefs',
    pattern:
      /\.beliefs\.(push|splice)\(|\.beliefs\s*=[^=]|\.pantheon\s*=[^=]|\.follower\.(push|splice)\(|\.enhancer\.(push|splice)\(/,
  },
  { field: 'religions', pattern: /state\.religions\.(push|splice)\(|\breligion\.name\s*=[^=]/ },
  { field: 'legacies', pattern: /\.legacies\.(push|splice)\(|\.revoked\s*=[^=]/ },
  { field: 'timed', pattern: /\.timed\s*=[^=]|\.timed\.(push|splice)\(|delete\s+\w+(\.\w+)*\.timed/ },
  { field: 'beads', pattern: /\.beads\.(push|splice)\(/ },
  { field: 'wonders', pattern: /state\.wonders\.(push|splice)\(/ },
  { field: 'deals', pattern: /state\.deals\.(push|splice)\(|state\.deals\s*=[^=]/ },
  { field: 'turn', pattern: /state\.turn\s*(=[^=]|\+=|\+\+)/ },
  { field: 'workedTiles', pattern: /\.workedTiles\s*=[^=]|\.workedTiles\.(push|splice)\(/ },
  { field: 'banks', pattern: /\.(gold|faithPool|sciencePool|culturePool)\s*(=[^=]|\+=|-=)/ },
  { field: 'sight', pattern: /state\.visibility\s*=[^=]|grid\[[^\]]*\]\s*=[^=]/ },
  { field: 'camps', pattern: /state\.camps\.(push|splice)\(|state\.camps\s*=[^=]/ },
  { field: 'units', pattern: /state\.units\.(push|splice)\(|state\.units\s*=[^=]/ },
  { field: 'position', pattern: /\.(col|row)\s*=\s*(?!\{)[^=]/ },
  {
    field: 'followers',
    pattern:
      /\.followers\s*=[^=]|delete\s+\w+(\.\w+)*\.followers|\bfollowers\[[^\]]*\]\s*=[^=]|delete\s+followers\[/,
  },
  // Batch WC2: the war losses the happiness meter's weariness lines count.
  {
    field: 'warLosses',
    pattern: /\.warLosses\s*=[^=]|\.warLosses\.(push|splice)\(|delete\s+\w+(\.\w+)*\.warLosses/,
  },
  // Dominion batch D1: the ranks an empire's units have earned, which the
  // `ranksEarned` count reads. A new count kind is a new row of this register.
  { field: 'ranksEarned', pattern: /\.ranksEarned\s*(=[^=]|\+=)/ },
  // Dominion batch D2: a unit's experience, which The Fabricae's town scope
  // (`garrisonRank`) reads. A scope can reach the meters, so a write announces.
  { field: 'experience', pattern: /\.experience\s*=[^=]/ },
  // Dominion batch D3: the hexes an empire has pillaged, which The Sagas'
  // `hexesPillaged` count reads.
  { field: 'hexesPillaged', pattern: /\.hexesPillaged\s*(=[^=]|\+=)/ },
  // Dominion batch D4: three lifetime records that counts read. The Captured
  // Arms reads `enemiesKilled`, The Hall of the Slain `unitsLost` and
  // Spear-won Land `citiesCaptured`.
  { field: 'enemiesKilled', pattern: /\.enemiesKilled\s*(=[^=]|\+=)/ },
  { field: 'unitsLost', pattern: /\.unitsLost\s*(=[^=]|\+=)/ },
  { field: 'citiesCaptured', pattern: /\.citiesCaptured\s*(=[^=]|\+=)/ },
  // Expansionist batch E1: the citizens an empire has spent on levies, which
  // The Labour Rolls' `citizensLevied` count reads.
  { field: 'citizensLevied', pattern: /\.citizensLevied\s*(=[^=]|\+=)/ },
  // Dominion batch D5: the great people an empire has gained, in all and by
  // family, which the `greatPeopleGained` count reads (The Mural Crown).
  {
    field: 'greatPeople',
    pattern: /\.greatPeopleRecruited\s*(=[^=]|\+=)|\.greatPeopleByFamily\s*=[^=]/,
  },
  // Expansionist batch E2: the towns an empire has founded, which The Book of
  // Settlements' `citiesFounded` count reads. `foundCityAt` is its one writer.
  { field: 'citiesFounded', pattern: /\.citiesFounded\s*(=[^=]|\+=)/ },
  // Dominion batch D7: a unit's fortification, which the `fortifiedUnits`
  // count (The Fortress Empire) and the `fortifiedUnit` hex test (The Farming
  // Garrisons, The Castra) read.
  {
    field: 'fortifiedTurns',
    pattern: /\.fortifiedTurns\s*=[^=]|delete\s+\w+(\.\w+)*\.fortifiedTurns/,
  },
  // Dominion batch D7: the empires a seat has met, which The Defiant Kingdom's
  // condition (`rivalHoldsMoreTowns`) reads. `recordMeetings` writes it through
  // a local name, `met`.
  { field: 'metSeats', pattern: /\.metSeats\.(push|splice)\(|\bmet\.push\(/ },
  // Expansionist batch E5: the commissions that marked a town, which the
  // `markedBy` town scope reads (The Heartland). `markGoalTown` is its one writer.
  { field: 'markedBy', pattern: /\.markedBy\s*=[^=]|\.markedBy\.(push|splice)\(/ },
];

/** How a function says "the world moved under the empire walks". */
const ANNOUNCEMENTS = ['bumpEconomy(', 'bumpRevision('];

/**
 * **The announcing functions** — every one of them holds a write above and an
 * announcement in its own body, and the second claim below pins both halves.
 *
 * Keyed `file#function`, which is what a failure names, so a new seam reads its
 * own fix off the message.
 */
const ANNOUNCING = new Set([
  'beads.ts#awardBead',
  'trade.ts#settleTraderPlunder',
  'tech.ts#upgradeUnits',
  'religion.ts#empireRiteAt',
  'religion.ts#payRiteBuildings',
  'religion.ts#performRiteAt',
  'religion.ts#settleReroll',
  'religion.ts#openFaithLadder',
  'purchase.ts#contributeAt',
  'purchase.ts#purchaseItemAt',
  'improvements.ts#prospectAt',
  'greatPeople.ts#greatPersonActAt',
  'greatPeople.ts#chargeBank',
  'empire.ts#collectYields',
  'draft.ts#settleDraft',
  // G3: a malice turning an Order out of its chair — the chairs the third
  // source reads and the eleventh source itself both moved.
  'draft.ts#seatMalice',
  // L3a: a chair opened or closed by the law itself (The King's Friends). An
  // Order's lines come and go with the chair it sits in, which is the third
  // source of the walk, so the write announces on the line it happens.
  'draft.ts#refitSlots',
  // Batch C: a met commission leaves its chair, which is the third source of
  // the walk, so the phase announces on the line it empties the chair.
  'commissions.ts#runCommissions',
  'discoveries.ts#payDiscovery',
  'diplomacy.ts#payLump',
  'cities.ts#refundBeatenWonders',
  // L2a: `payCompletionGrants` is a two-line wrapper now — the arms that mint,
  // teach and raise moved whole into `payGrants`, which a leader's boon calls
  // too. The name on the register follows the body.
  'cities.ts#payGrants',
  'cities.ts#payProject',
  'camps.ts#removeCampAt',
  'visibility.ts#recomputeVisibility',
  'camps.ts#settleCampBounty',
  'beads.ts#payWindfall',
  'barbarians.ts#foundCamps',
  'cities.ts#assignCitizens',
  'cities.ts#claimTile',
  'cities.ts#foundCityAt',
  // Expansionist batch E4: a town founded on an outpost takes the outpost's
  // land from the town that held it, and The Encroaching Fields moves a hex
  // between two empires' towns. Both write the owner array and announce.
  'cities.ts#takeOutpostLand',
  'frontiers.ts#runEncroachment',
  // The take (`docs/flags.md` (aaaaaaa)): a pin moves a hex from one town of
  // the empire to another. It writes the owner array and announces.
  'cities.ts#takeTile',
  // Expansionist batch E5: a commission marks the town that met its goal.
  'commissions.ts#markGoalTown',
  // Batch L: famine and a levy both take a citizen through `loseCitizen`.
  'cities.ts#loseCitizen',
  // Batch L: Seasonal Levies hangs timed effects on the town that levied.
  'levies.ts#hangAftermaths',
  'cities.ts#realiseItem',
  'cities.ts#settleGrowth',
  'cities.ts#settlePopulationWindfall',
  'combat.ts#handOverCity',
  'commands.ts#applyEndTurn',
  'deals.ts#cancelDealsBetween',
  'deals.ts#openDeal',
  'deals.ts#pruneDeals',
  'diplomacy.ts#annexCityAt',
  'diplomacy.ts#razeCityAt',
  'draft.ts#adoptGovernmentAt',
  'draft.ts#slotOrderAt',
  'evaluator.ts#payWindfallGrants',
  'greatPeople.ts#claimAround',
  'greatPeople.ts#greatPersonWorkAt',
  'greatPeople.ts#revokeLegacies',
  'greatPeople.ts#spendGreatPerson',
  'greatPeople.ts#stampTimed',
  'improvements.ts#buildImprovementAt',
  'improvements.ts#pillageAt',
  'improvements.ts#removeImprovementAt',
  'religion.ts#clearCityRite',
  'religion.ts#foundReligion',
  'religion.ts#placeRelicAt',
  'religion.ts#plantHolySiteAt',
  'religion.ts#renameReligionAt',
  'religion.ts#settleBeliefChoice',
  'religion.ts#stampRite',
  'religion.ts#sweep',
  'combat.ts#applyCombat',
  'commands.ts#applyStartRoute',
  'diplomacy.ts#expelFrom',
  'movement.ts#advanceAlongPath',
  'state.ts#captureUnit',
  // **The one subtraction that spends a player's gold** (batch GP2): the coin
  // out of the treasury, the almoner's ledger raised, and the banks announced,
  // in one place. `purchaseTileAt` (`cities.ts`) and `applyBuyRoute`
  // (`commands.ts`) were on this list until they were routed through it and now
  // hold no bank write of their own — a seam that moves a bank through the one
  // subtraction is announced by the subtraction, which is the whole point of
  // having one.
  'state.ts#spendGold',
  // Batch WC2: the one writer of `Player.warLosses`, which the happiness
  // meter's war weariness lines count.
  'weariness.ts#recordWarLoss',
  // Dominion batch D1: the one writer of `Player.ranksEarned`, which the
  // `ranksEarned` count reads.
  'cities.ts#settleRanksEarned',
  // Dominion batch D2: the one writer of `Unit.experience`, which a town scope
  // reads since The Fabricae (`garrisonRank`).
  'ranks.ts#writeExperience',
  // Dominion batch D3: what one pillaged hex pays, split out of `pillageAt` so
  // The Horde's extra hexes are paid the same way. It banks the salvage and is
  // the one writer of `Player.hexesPillaged`, which The Sagas' count reads.
  'improvements.ts#payPillage',
  // Dominion batch D4: the two writers of the records the new counts read.
  // `tallyFall` writes `unitsLost` and `enemiesKilled`; `captureCity` writes
  // `citiesCaptured`.
  'combat.ts#tallyFall',
  'combat.ts#captureCity',
  // Expansionist batch E1: the levy verb banks The Terraces of Moray's science,
  // and `recordLevy` is the one writer of `Player.citizensLevied`, which The
  // Labour Rolls' count reads.
  'levies.ts#levyAt',
  'levies.ts#recordLevy',
  // Dominion batch D5: the one writer of the great-people records the
  // `greatPeopleGained` count reads, and the one routine that banks science
  // toward a technology that is not the one under research (Copying the
  // Enemy).
  'greatPeople.ts#settleGreatPersonChoice',
  'state.ts#bankTowardTech',
  'state.ts#claimWonder',
  'state.ts#createCity',
  'state.ts#createUnit',
  'state.ts#removeUnit',
  'tech.ts#settleResearch',
  // Dominion batch D7: the three writers of `Unit.fortifiedTurns` that hold the
  // state: a unit told to fortify, the wild's warden digging in, and every
  // fortified unit digging a turn deeper.
  'commands.ts#applyFortify',
  'barbarians.ts#digIn',
  'combat.ts#advanceFortify',
]);

/**
 * **The excused, each with the reason it is excused.** Three kinds, and no
 * fourth: a write to something that is not the board, a write to a field no
 * economy-clock tenant folds, and a helper that is deliberately free of the
 * state whose callers announce instead (named, so the pair can be checked).
 */
const EXCUSED = new Map<string, string>([
  // `beads.ts#runBeads` stood here and is gone with the phase (batch Q1): it
  // dealt a card of a deed deck and swept every standing deed, and the deeds are
  // retired. Its excuse is inherited by the two below, which is why they still
  // quote it.
  [
    'beads.ts#runWorldClock',
    'writes the turn report, not the board — the old `beads` phase’s excuse one phase up: the close’s own awards land through `awardBead`, and the clock’s state (`GameState.ageClose`) is an absolute stamp no tenant folds a yield from',
  ],
  [
    'wagers.ts#runWagers',
    'writes the turn report, not the board — the old `beads` phase’s excuse one phase up: a kept wager’s beads land through `awardBead`, which announces, and everything else this phase writes (`Player.wagerTotals`, `Player.wager`, `WagerDeal.claimed`) is a running total or an absolute stamp no tenant folds a yield from',
  ],
  [
    'state.ts#aimResearchAt',
    'moves beakers between `Player.sciencePool` and the bucket `Player.techProgress` parks them in (batch S2, schema 111) — the empire’s total does not change, and every caller announces anyway: the reducer’s own clock for the two research commands, and `settleResearch` for the promotion',
  ],
  [
    'turn.ts#runEndOfTurn',
    'writes the turn report, not the board — the bead diff, already announced by `awardBead`',
  ],
  [
    'evaluator.ts#windfallPayout',
    'builds a payout descriptor; `payWindfallGrants` is what hangs it on the realm',
  ],
  [
    'commissions.ts#payCommission',
    'builds a payout descriptor for a commission’s reward; `payWindfallGrants` is what hangs it on the realm, and it announces',
  ],
  [
    'evaluator.ts#cardFoundingRider',
    'builds a rider descriptor; `foundCityAt` is what puts the citizens and the stones in the town',
  ],
  [
    'cities.ts#writeAssignment',
    'assignCitizens’ own half — its only callers are that function and `capFoodSurplus` beneath it, and it announces once, after comparing',
  ],
  [
    'cities.ts#capFoodSurplus',
    'called only by `assignCitizens`, before its comparison — see that function',
  ],
  [
    'movement.ts#hangLandfall',
    'writes `Unit.timed` — a piece’s own card effects, which only the combat ledger reads. What the meters *do* fold about a piece is that it exists, whose it is and where it stands (`count: \'garrison\'`), and those three seams announce',
  ],
  [
    'improvements.ts#hangOnRaider',
    'writes `Unit.timed` (Dominion batch D8, The Scourge of God) — a piece’s own card effects, which only the combat ledger reads, as `hangLandfall` above',
  ],
  [
    'resourceEffects.ts#foldResourceYields',
    'sums a line’s gold into a local total — an arithmetic accumulator, not a bank',
  ],
  [
    'routeYields.ts#foldRouteYield',
    'sums a route line into a local total — an accumulator, not a bank',
  ],
  [
    'hex.ts#explainTileYield',
    'merges one hex’s gold into the line it is building — an accumulator, not a bank',
  ],
  [
    'town.ts#explainBuildingPreview',
    'writes a preview line’s gold — a quote for a panel, and no board state at all',
  ],
  [
    'visibility.ts#resetVisibility',
    'blanks every grid and then calls `recomputeAllVisibility`, which announces once a seat — a new world rather than a write inside one',
  ],
  [
    'pathfind.ts#pathTurnMarks',
    'writes a path *cell*, not a piece — the order a unit is under, which no tenant folds',
  ],
  // --- D2d's three mechanism helpers -----------------------------------------
  //
  // Each is a *pair of fields written together* lifted out of the seams that
  // used to write them one line apart (`Tile.improvement` with its age,
  // `City.buildings` with its), so the write moved and the announcement did not.
  // Every caller of all three announces on the line it used to — which is the
  // same excuse `writeAssignment` and `convertCitizen` carry, and the reason
  // these are rows here rather than a `bumpEconomy` inside a leaf that has no
  // `GameState` to bump.
  [
    'map.ts#raiseImprovement',
    'writes `Tile.improvement` and its age stamp together — this module holds no `GameState` to announce with, and its three callers do it on the very line they always did: `buildImprovementAt`, `greatPersonWorkAt` and `plantHolySiteAt`',
  ],
  [
    'map.ts#razeImprovement',
    '`raiseImprovement` the other way round, and the same excuse: `removeImprovementAt` and `pillageAt` announce where they always did',
  ],
  [
    'state.ts#addBuilding',
    'writes `City.buildings` and its turn stamp together — the one seam stones join a town by, and all three of its callers announce on the line they always did: `realiseItem`, `foundCityAt` and `placeRelicAt`',
  ],
  [
    'state.ts#convertCitizen',
    'deliberately free of the state (it is shared with the tide, whose towns are plain `City`); its callers announce — `pressLump` and `spreadReligion` (`religion.ts`), on the converts',
  ],
  [
    'state.ts#unconvertCitizen',
    'free of the state, as above; `purgeAt` announces on the citizens it unmakes',
  ],
  [
    'cities.ts#growCities',
    'writes the famine report entry’s `population`, not a town’s; the town gets smaller in `loseCitizen`, which announces (batch L)',
  ],
  [
    'state.ts#shrinkFollowers',
    'free of the state, as above; `loseCitizen` announces on the famine or the levy that called it',
  ],
  [
    'draft.ts#unslotOrderAt',
    'a fact about a player and takes no state; `applyUnslotOrder` (`commands.ts`) announces beside it',
  ],
  [
    'draft.ts#settleDoctrineChoice',
    'takes no state, as above; `applyChooseDoctrine` (`commands.ts`) announces beside it',
  ],
  [
    'draft.ts#reseatCouncil',
    'takes no state and writes the council it is handed (batch C2): `adoptGovernmentAt` announces after it on the live seat, and `cardImpact.ts` hands it a ghost seat that no tenant reads',
  ],
  [
    'weariness.ts#pruneWarLosses',
    'the broom: it deletes only war losses that are already outside the weariness window on this turn and every later one, and the weariness reading skips those, so no answer changes',
  ],
  // Dominion batch D7.
  [
    'state.ts#breakFortify',
    'takes no state; each of its three callers announces in its own body: `advanceAlongPath` on the step, `captureUnit` on the change of owner, and `applyCombat` on the fight',
  ],
  [
    'visibility.ts#recordMeetings',
    'called only by `recomputeVisibility`, which announces on the line after it returns',
  ],
]);

/** One write the sweep found. */
interface Site {
  file: string;
  fn: string;
  line: number;
  field: string;
  text: string;
}

const FUNCTION_START =
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/;

/** The sweep: every write, with the top-level function it sits in. */
function writeSites(): Site[] {
  const found: Site[] = [];
  for (const { file, text } of simFiles()) {
    const lines = text.split('\n');
    for (const [index, raw] of lines.entries()) {
      const code = raw.split('//')[0]!;
      if (code.trim().startsWith('*')) continue;
      const field = WRITES.find((row) => row.pattern.test(code))?.field;
      if (field === undefined) continue;
      let fn = '(top level)';
      for (let back = index; back >= 0; back--) {
        const match = FUNCTION_START.exec(lines[back]!);
        if (match) {
          fn = match[1] ?? match[2] ?? fn;
          break;
        }
      }
      found.push({ file, fn, line: index + 1, field, text: raw.trim() });
    }
  }
  return found;
}

/** The body of one top-level function: its own line to the next one's. */
function bodyOf(file: string, fn: string): string | null {
  const source = simFiles().find((row) => row.file === file);
  if (source === undefined) return null;
  const lines = source.text.split('\n');
  let start = -1;
  for (const [index, line] of lines.entries()) {
    const match = FUNCTION_START.exec(line);
    if (!match) continue;
    if ((match[1] ?? match[2]) === fn) {
      start = index;
      continue;
    }
    if (start >= 0) return lines.slice(start, index).join('\n');
  }
  return start >= 0 ? lines.slice(start).join('\n') : null;
}

describe('the register of announced writes', () => {
  it('finds the writes it is a register of', () => {
    // Not vacuous: the sweep has to be reading the tree it thinks it is.
    const sites = writeSites();
    expect(sites.length).toBeGreaterThan(50);
    expect(new Set(sites.map((site) => site.field)).size).toBe(WRITES.length);
  });

  it('has every write inside a function that announces, or excused by name', () => {
    const orphans = writeSites()
      .filter((site) => {
        const key = `${site.file}#${site.fn}`;
        return !ANNOUNCING.has(key) && !EXCUSED.has(key);
      })
      .map((site) => `${site.file}:${site.line} (${site.fn}, ${site.field}) — ${site.text}`);
    // The failure message *is* the fix: either the function announces
    // (`bumpEconomy(state)` on the line the write happens — see `slate.ts`), or
    // it joins `EXCUSED` with the reason no tenant folds what it wrote.
    expect(orphans).toEqual([]);
  });

  it('holds every announcing function to actually announcing', () => {
    // The other direction: a list that named a function which had stopped
    // announcing would pass the claim above and be worth nothing.
    const silent: string[] = [];
    for (const key of ANNOUNCING) {
      const [file, fn] = key.split('#') as [string, string];
      const body = bodyOf(file, fn);
      if (body === null) {
        silent.push(`${key} — no such function any more`);
        continue;
      }
      if (!ANNOUNCEMENTS.some((call) => body.includes(call))) silent.push(`${key} — no bump`);
    }
    expect(silent).toEqual([]);
  });

  it('keeps every excused row pointing at a write that still exists', () => {
    const sites = writeSites();
    const stale = [...EXCUSED.keys()].filter(
      (key) => !sites.some((site) => `${site.file}#${site.fn}` === key),
    );
    expect(stale).toEqual([]);
  });

  it('gives every excused row a reason', () => {
    for (const [key, why] of EXCUSED) {
      expect(why.length, key).toBeGreaterThan(20);
    }
  });

  it('holds the three readings out of reach of the reducer', () => {
    // The argument the field list rests on: `readCity`, `readEmpire` and
    // `readEmpirePercents` cannot be asked from inside a write. Nearly nothing
    // in `src/sim` may even import the file they live in — that is the runtime
    // cycle `test/mapgen/moduleCycles.test.ts` gates — and the **one** module
    // that does, `cardImpact.ts`, sits above the reducer rather than in it: it
    // is a reading for a card face, and nothing in `src/sim` imports it back. So
    // the three readings are asked at rest, from `src/ui` and `src/ai`, where
    // the command's and the phase's own bump is the whole of their subscription.
    const importers = simFiles()
      .filter((row) => row.file !== 'readings.ts')
      .filter((row) => /from '\.{1,2}\/(\.\.\/)?readings'/.test(row.text))
      .map((row) => row.file);
    // Three since batch G2, and the other two keep the argument rather than
    // bending it. `ledgerFold.ts` is the Ledger's class fold lifted out of the
    // screen (`docs/wager.md` §8): it is a *reading* above the pipeline that
    // nothing in `src/sim` imports back except the one phase below it, and it
    // writes nothing at all. `wagers.ts` asks it once a turn from the `wagers`
    // phase — the one place in the simulation a `read…` is asked from inside a
    // phase — and does so **at rest**: the reading is taken before the phase's
    // own writes, and what the phase writes (a running total, a stake, a claim)
    // is folded by no tenant, which is exactly the excuse its row in `EXCUSED`
    // gives. A yield read here can never be stale, because nothing here moves a
    // yield.
    expect(importers).toEqual(['cardImpact.ts', 'ledgerFold.ts', 'wagers.ts']);

    // And it is a leaf of the simulation: no module in `src/sim` reaches it, so
    // no handler and no phase can ask a `read…` verb through it.
    const reached = simFiles()
      .filter((row) => row.file !== 'cardImpact.ts')
      .filter((row) => /from '\.{1,2}\/(\.\.\/)?cardImpact'/.test(row.text))
      .map((row) => row.file);
    expect(reached).toEqual([]);
  });

  it('keeps the slate free of a write window', () => {
    // M3's own claim, read off the source: the tenants are asked inside a phase
    // and outside one alike, so nothing in `slateMemo` may skip the slate.
    const slate = simFiles().find((row) => row.file === 'slate.ts')!.text;
    expect(slate).toContain('export function setSlateShadow');
    expect(slate).toContain('export function setSlatePhase');
  });
});
